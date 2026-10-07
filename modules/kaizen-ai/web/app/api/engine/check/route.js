// GET  /api/engine/check            → what's due, and how long it'll take
// GET  /api/engine/check?kcId=       → issue a check (items, no answer keys)
// POST /api/engine/check             → submit answers; graded server-side
//
// A check is the only thing that produces CONFIRMED mastery, so every property
// here is defensive. Contrast /api/practice, which this supersedes as an
// assessment path: it returns the answer key to the browser, the client compares
// it, short answers are self-marked, and the client PATCHes its own score.
//
// Here: items come from the bank server-side, the answer key never leaves the
// server, the item list is read from the attempt row rather than the request
// body, and no hints exist — which is what makes the evidence unassisted.

import { getCaller, serviceClient } from '@/lib/server/context';
import { rateLimitResponse } from '@/lib/server/ratelimit';
import { issueCheck, gradeCheck, dueChecks } from '@/lib/engine/check';
import { isMissingSchema } from '@/lib/engine/ledger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  // Same empty shape as the unconfigured branch — ChecksDueCard reads only
  // `due`, and demo mode has no checks to offer.
  if (caller.demo) return Response.json({ due: [] });
  const svc = serviceClient();
  if (!svc) return Response.json({ due: [] });

  const limited = await rateLimitResponse(caller, req, { limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const kcId = new URL(req.url).searchParams.get('kcId');
  const now = Date.now();

  try {
    if (!kcId) {
      const due = await dueChecks(svc, caller.user.id, { now });
      const ids = due.map((d) => d.kc_id);
      const { data: kcs } = ids.length
        ? await svc.from('kc').select('id,title').in('id', ids)
        : { data: [] };
      const titleOf = Object.fromEntries((kcs || []).map((k) => [k.id, k.title]));
      // Prefer the learner's own name for it — canonical vocabulary is an
      // implementation detail they never asked for.
      const { data: local } = ids.length
        ? await svc.from('learner_kc').select('kc_id,local_title').eq('user_id', caller.user.id).in('kc_id', ids)
        : { data: [] };
      const localOf = Object.fromEntries((local || []).map((l) => [l.kc_id, l.local_title]));

      return Response.json({
        due: due.map((d) => ({
          kcId: d.kc_id,
          title: localOf[d.kc_id] || titleOf[d.kc_id] || 'Concept',
          working: d.working,
          confirmed: d.confirmed,
        })),
        estimatedMinutes: Math.min(8, Math.max(2, due.length * 2)),
      });
    }

    const result = await issueCheck(svc, caller.user.id, kcId, { now });
    if (result?.notYet) {
      return Response.json({
        notYet: true,
        availableAt: result.availableAt,
        // Explaining the delay is part of the teaching: a check right after the
        // lesson would measure recency, not learning.
        message: 'This one comes back later — a check right after the lesson measures memory, not understanding.',
      }, { status: 425 });
    }
    if (result?.noBank) {
      return Response.json({ noBank: true, message: 'No verified questions for this concept yet.' }, { status: 503 });
    }
    return Response.json(result);
  } catch (err) {
    if (isMissingSchema(err)) return Response.json({ notProvisioned: true, due: [] });
    console.error('[engine/check GET]', err?.message);
    return Response.json({ error: 'Could not load your check.' }, { status: 500 });
  }
}

export async function POST(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (caller.demo) return Response.json({ error: 'Checks need a real account.' }, { status: 501 });
  const svc = serviceClient();
  if (!svc) return Response.json({ error: 'Not configured.' }, { status: 501 });

  const limited = await rateLimitResponse(caller, req, { limit: 40, windowMs: 60_000 });
  if (limited) return limited;

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }

  const attemptId = String(body?.attemptId || '');
  if (!attemptId) return Response.json({ error: 'attemptId required.' }, { status: 400 });
  const responses = body?.responses && typeof body.responses === 'object' ? body.responses : {};

  try {
    // Ownership, expiry, replay protection and grading all live in gradeCheck,
    // against the item list recorded when the check was issued.
    const r = await gradeCheck(svc, caller.user.id, attemptId, responses, { now: Date.now() });
    if (r.error) {
      const messages = {
        not_found: 'That check has expired or was never issued.',
        already_submitted: 'You already submitted this one.',
        expired: 'That check timed out — start a fresh one.',
        no_items: 'That check’s questions were retired while you worked — start a fresh one.',
      };
      return Response.json({ error: messages[r.error] || 'Could not grade that.' }, { status: r.status || 400 });
    }
    return Response.json(r);
  } catch (err) {
    if (isMissingSchema(err)) {
      return Response.json({ error: 'Checks aren’t switched on yet on this deployment.' }, { status: 503 });
    }
    console.error('[engine/check POST]', err?.message);
    return Response.json({ error: 'Could not grade your check.' }, { status: 500 });
  }
}
