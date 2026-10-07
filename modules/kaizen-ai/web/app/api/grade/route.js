// POST /api/grade — score demonstrated understanding 0-5 (SuperMemo scale).
// Uses the FAST model tier (cheap grading). Metered as `grade`.

import { meteredCall } from '@/lib/server/aiCall';
import { GRADING_SYSTEM_PROMPT } from '@/lib/prompts';
import { getCaller, getSettings, checkEntitlement, recordUsage, serviceClient } from '@/lib/server/context';
import { appendEvidence, recomputeEstimates } from '@/lib/engine/ledger';
import { lookupKcId } from '@/lib/server/kcMap';
import { pickModel } from '@/lib/server/models';
import { rateLimitResponse } from '@/lib/server/ratelimit';

export const runtime = 'nodejs';
export const maxDuration = 30;


export async function POST(req) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ quality: 0, rationale: 'Grading not configured: ANTHROPIC_API_KEY missing.' }, { status: 501 });
  }
  const caller = await getCaller(req);
  if (!caller) return Response.json({ quality: 0, rationale: 'Sign in first.' }, { status: 401 });

  const limited = await rateLimitResponse(caller, req);
  if (limited) return limited;

  // Daily plan cap BEFORE spending money upstream. This route recorded usage
  // but never checked entitlement — the same defect already fixed for STT
  // (audit SEC-006), overlooked here. The burst limiter alone is not a spend
  // control, and it degrades to per-instance counting without Upstash.
  const ent = await checkEntitlement(caller, 'grade');
  if (!ent.ok) return Response.json({ quality: 0, rationale: ent.reason }, { status: 429 });

  let body;
  try { body = await req.json(); } catch { return Response.json({ quality: 0, rationale: 'Bad request.' }, { status: 400 }); }
  const { concept, transcript } = body || {};
  if (typeof transcript !== 'string' || transcript.length > 60000) {
    return Response.json({ quality: 0, rationale: 'Invalid transcript.' }, { status: 400 });
  }

  const settings = await getSettings();
  const model = pickModel('fast', settings, caller.profile?.plan);

  try {
    const metered = await meteredCall({
      caller, model, system: GRADING_SYSTEM_PROMPT, messages: [{
        role: 'user',
        content: `Concept being assessed: "${concept || 'unspecified'}"\n\nConversation transcript:\n${transcript || '(empty)'}\n\nReturn your evaluation as JSON.`,
      }],
      maxTokens: 400, feature: 'grade', tier: 'fast',
    });
    if (!metered) return Response.json({ error: 'AI budget reached for this month.' }, { status: 429 });
    const text = metered.text;
    let parsed;
    try {
      const match = text.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(match ? match[0] : text);
    } catch { parsed = { quality: 0, rationale: 'Could not parse grading output.' }; }

    let q = Number(parsed.quality);
    if (!Number.isFinite(q)) q = 0;
    q = Math.max(0, Math.min(5, Math.round(q)));

    // meteredCall already recorded the REAL cost (reported tokens, cache
    // reads, document blocks). Reuse it rather than re-estimating.
    const cost = metered.cost;
    recordUsage(caller, 'grade', 1, cost.usd, { model, concept: (concept || '').slice(0, 80), quality: q }).catch(() => {});

    // ── This score is a SIGNAL, not a grade ──────────────────────────────────
    // It is produced by a model reading a transcript that the same model wrote,
    // in a session where help was freely available. That makes it evidence about
    // engagement and working understanding — NOT about unassisted competence.
    //
    // So it lands in the ledger as kind='chat_signal', assisted=true,
    // verified_by='model', which by construction can only move WORKING mastery.
    // CONFIRMED mastery requires an unassisted, verified, delayed check
    // (see lib/engine/types.js). This route no longer has mastery authority.
    let kcId = null;
    if (!caller.demo) {
      const svc = serviceClient();
      if (svc) {
        // Keep the legacy audit trail during the transition.
        svc.from('mastery_events').insert({
          user_id: caller.user.id, concept_name: (concept || 'unspecified').slice(0, 200), quality: q,
        }).then(() => {}, () => {});

        try {
          kcId = await lookupKcId(svc, { userId: caller.user.id, topic: concept, subject: body?.subject });
          if (kcId) {
            // Assistance dose: how much of this conversation was the tutor
            // doing the work. Turn count is a crude proxy, but it is the first
            // time the quantity has been recorded at all, and the dose SLOPE is
            // what surfaces dependency.
            const tutorTurns = (transcript.match(/^Tutor:/gm) || []).length;
            await appendEvidence(svc, caller.user.id, [{
              kcId,
              kind: 'chat_signal',
              outcome: q / 5,
              assisted: true,
              assistanceDose: tutorTurns,
              verifiedBy: 'model',
              contextTag: 'chat',
              sourceRef: `chat:${(concept || '').slice(0, 60)}`,
            }]);
            await recomputeEstimates(svc, caller.user.id, { kcIds: [kcId] });
          }
        } catch (e) {
          console.error('[grade] ledger write failed', e?.message);
        }
      }
    }

    return Response.json({
      quality: q,
      rationale: String(parsed.rationale || ''),
      // Told plainly, because the distinction is worth teaching: this raises
      // working mastery; confirming it needs a check with no help, later.
      tier: 'working',
      confirms: false,
      kcId,
    });
  } catch (err) {
    console.error('[grade] failed', err?.message);
    return Response.json({ quality: 0, rationale: 'Grading didn’t go through — this session isn’t scored.' }, { status: 200 });
  }
}
