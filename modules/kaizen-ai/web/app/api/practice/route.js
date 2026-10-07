// POST  /api/practice { concept, courseId?, mastery } → generate a 5-question
//        set (Claude, difficulty-aware) and store it. Returns { id, questions }.
// PATCH  /api/practice { id, results, quality } → record the attempt + log a
//        mastery_event (source 'practice') that feeds spaced repetition.

import { meteredCall } from '@/lib/server/aiCall';
import { getCaller, getSettings, serviceClient, checkEntitlement, auditLog } from '@/lib/server/context';
import { pickModel } from '@/lib/server/models';
import { rateLimitResponse } from '@/lib/server/ratelimit';
import { PRACTICE_SYSTEM } from '@/lib/prompts';
import { appendEvidence, recomputeEstimates } from '@/lib/engine/ledger';
import { lookupKcId } from '@/lib/server/kcMap';

export const runtime = 'nodejs';
export const maxDuration = 60;


function cleanQuestions(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const q of raw.slice(0, 8)) {
    const type = q?.type === 'mc' ? 'mc' : 'short';
    const text = String(q?.q || '').trim();
    if (!text) continue;
    const explain = String(q?.explain || '').slice(0, 400);
    if (type === 'mc') {
      const choices = (Array.isArray(q.choices) ? q.choices : []).map((c) => String(c).slice(0, 200)).filter(Boolean).slice(0, 4);
      if (choices.length !== 4) continue;
      const answer = Math.max(0, Math.min(3, Math.round(Number(q.answer)) || 0));
      out.push({ type, q: text.slice(0, 400), choices, answer, explain });
    } else {
      out.push({ type, q: text.slice(0, 400), answer: String(q?.answer || '').slice(0, 300), explain });
    }
  }
  return out.slice(0, 5);
}

export async function POST(req) {
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: 'Not configured: ANTHROPIC_API_KEY missing.' }, { status: 501 });
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  const limited = await rateLimitResponse(caller, req);
  if (limited) return limited;

  const ent = await checkEntitlement(caller, 'tutor_message');
  if (!ent.ok) return Response.json({ error: ent.reason }, { status: 429 });

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }
  const concept = String(body?.concept || '').trim().slice(0, 120);
  if (!concept) return Response.json({ error: 'Pick a concept to practice.' }, { status: 400 });
  const mastery = Math.max(0, Math.min(100, Math.round(Number(body?.mastery)) || 0));
  const courseId = body?.courseId ? String(body.courseId).slice(0, 80) : null;

  const settings = await getSettings();
  const model = pickModel('tutor', settings, caller.profile?.plan);
  try {
    const metered = await meteredCall({
      caller, model, system: PRACTICE_SYSTEM, messages: [{ role: 'user', content: `Concept: ${concept}\nCurrent mastery: ${mastery}/100\nGenerate the practice set.` }],
      maxTokens: 1600, feature: 'report', tier: 'fast',
    });
    if (!metered) return Response.json({ error: 'AI budget reached for this month.' }, { status: 429 });
    const out = metered.text;
    const match = out.match(/\{[\s\S]*\}/);
    const questions = cleanQuestions(JSON.parse(match ? match[0] : out).questions);
    if (questions.length < 3) throw new Error('too few questions');

    let id = null;
    if (!caller.demo) {
      const svc = serviceClient();
      if (svc) {
        const { data } = await svc.from('practice_sets').insert({
          user_id: caller.user.id, course_id: courseId, concepts: [concept], questions,
        }).select('id').maybeSingle();
        id = data?.id || null;
      }
    }
    return Response.json({ id, questions });
  } catch {
    return Response.json({ error: "I couldn't build a set for that — try a more specific concept." }, { status: 422 });
  }
}

export async function PATCH(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (caller.demo) return Response.json({ ok: true, demo: true });
  const svc = serviceClient();
  if (!svc) return Response.json({ ok: true });

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }
  const id = String(body?.id || '');
  if (!id) return Response.json({ error: 'id required.' }, { status: 400 });
  const results = body?.results && typeof body.results === 'object' ? body.results : {};
  const quality = Number.isFinite(Number(body?.quality)) ? Math.max(0, Math.min(5, Math.round(Number(body.quality)))) : null;

  const { data: set } = await svc.from('practice_sets').select('id,user_id,concepts').eq('id', id).maybeSingle();
  if (!set || set.user_id !== caller.user.id) return Response.json({ error: 'Not your practice set.' }, { status: 403 });

  await svc.from('practice_sets').update({ results }).eq('id', id);
  const concept = Array.isArray(set.concepts) ? set.concepts[0] : null;
  if (concept && quality != null) {
    await svc.from('mastery_events').insert({ user_id: caller.user.id, concept_name: concept, quality, source: 'practice' });
  }

  // ── This score is CLIENT-ASSERTED, and the ledger records that ─────────────
  // The practice flow ships answer keys to the browser, compares multiple choice
  // client-side, and lets the learner self-mark short answers with "I got it" /
  // "I missed it". That is genuinely useful as retrieval practice — attempting
  // recall is most of the benefit — but it is not evidence of competence, and
  // the old code fed it straight into the same spaced-repetition state as
  // everything else.
  //
  // So it enters the ledger as verified_by='self', which carries the lowest
  // weight in the system and can never satisfy the confirming gate. Real
  // assessment lives at /api/engine/check, where the key never leaves the server.
  if (concept && quality != null) {
    try {
      const kcId = await lookupKcId(svc, { userId: caller.user.id, topic: concept });
      if (kcId) {
        await appendEvidence(svc, caller.user.id, [{
          kcId,
          kind: 'practice',
          outcome: quality / 5,
          assisted: true,
          assistanceDose: 0,
          verifiedBy: 'self',
          contextTag: 'practice',
          sourceRef: `practice:${id}`,
        }]);
        await recomputeEstimates(svc, caller.user.id, { kcIds: [kcId] });
      }
    } catch (e) {
      console.error('[practice] ledger write failed', e?.message);
    }
  }

  auditLog(caller.user.id, 'practice.completed', id, { quality }).catch(() => {});
  return Response.json({ ok: true, tier: 'working', confirms: false });
}
