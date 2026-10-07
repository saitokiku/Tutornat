// POST /api/tutoring/observe — the tutor's structured read on what happened.
// GET  /api/tutoring/observe?sessionId= — the agenda + current ratings.
//
// THIS IS THE MISSING EDGE.
//
// Today a tutor's only pedagogical input is a free-text box. It becomes
// recap_md, whose only reader in the entire codebase is the tutor's own
// confirmation card, plus an email. mastery_events has no 'tutor' source.
// Forty-five minutes of a trained human watching a student work unaided —
// the highest-signal assessment event in the product — produces zero bits of
// learning state.
//
// Here each per-KC rating becomes evidence with verified_by='human_tutor' and
// assisted=false, which makes it a CONFIRMING class: a human watching someone
// work unaided is the strongest signal the system can get, stronger than any
// transcript grader, because they can tell understanding from pattern-matching.
//
// Free-text notes are kept — they still write the human-readable recap. They are
// simply no longer the only channel.
//
// Design constraint that decides whether this works at all: three taps for a
// three-KC session. A tutor who finds this slow will not do it, and an unused
// channel is the same as no channel.

import { getCaller, serviceClient, auditLog } from '@/lib/server/context';
import { rateLimitResponse } from '@/lib/server/ratelimit';
import { appendEvidence, recomputeEstimates, isMissingSchema } from '@/lib/engine/ledger';
import { TUTOR_RATINGS } from '@/lib/engine/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// A rating maps to an outcome on the same 0..1 scale as a machine-checked item,
// so tutor evidence and check evidence are directly comparable in the ledger.
// 'shaky' sits below the 0.8 threshold that counts as a pass in the k-of-n gate:
// a hedged human read should not confirm mastery on its own.
const RATING_OUTCOME = { got_it: 1, shaky: 0.5, not_yet: 0 };

// Post-session checks are scheduled far enough out that they measure retention
// rather than the tail of the session, and near enough that the student still
// remembers sitting down with someone.
const POST_SESSION_CHECK_DELAY_MS = 36 * 60 * 60 * 1000;

async function tutorSessionOr(caller, svc, sessionId) {
  const { data: session } = await svc.from('tutoring_sessions').select('*').eq('id', sessionId).maybeSingle();
  if (!session) return { error: 'No such session.', status: 404 };
  const { data: tutor } = await svc.from('tutors').select('id,display_name').eq('user_id', caller.user.id).maybeSingle();
  if (!tutor || tutor.id !== session.tutor_id) return { error: 'Not your session.', status: 403 };
  return { session, tutor };
}

export async function GET(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (caller.demo) return Response.json({ error: 'Needs a real account.' }, { status: 501 });
  const svc = serviceClient();
  if (!svc) return Response.json({ error: 'Not configured.' }, { status: 501 });

  const sessionId = new URL(req.url).searchParams.get('sessionId');
  if (!sessionId) return Response.json({ error: 'sessionId required.' }, { status: 400 });

  const got = await tutorSessionOr(caller, svc, sessionId);
  if (got.error) return Response.json({ error: got.error }, { status: got.status });

  const { data: rows, error: rowsErr } = await svc.from('tutoring_session_kc')
    .select('kc_id,role,tutor_rating,misconception_id,tutor_note,observed_at')
    .eq('tutoring_session_id', sessionId);

  // Migrations 0012/0013 not applied yet — say so plainly rather than showing a
  // tutor a broken panel mid-session.
  if (rowsErr) {
    if (isMissingSchema(rowsErr)) return Response.json({ notProvisioned: true, sessionId, agenda: [], misconceptions: [], ratings: TUTOR_RATINGS });
    return Response.json({ error: 'Could not load this session.' }, { status: 500 });
  }

  const kcIds = [...new Set((rows || []).map((r) => r.kc_id))];
  const [{ data: kcs }, { data: estimates }, { data: misconceptions }] = await Promise.all([
    kcIds.length ? svc.from('kc').select('id,title,type').in('id', kcIds) : Promise.resolve({ data: [] }),
    kcIds.length
      ? svc.from('kc_estimate').select('kc_id,working,confirmed,dose_slope,human_recommended')
          .eq('user_id', got.session.student_id).in('kc_id', kcIds)
      : Promise.resolve({ data: [] }),
    kcIds.length ? svc.from('kc_misconception').select('id,kc_id,label').in('kc_id', kcIds) : Promise.resolve({ data: [] }),
  ]);

  const titleOf = Object.fromEntries((kcs || []).map((k) => [k.id, k.title]));
  const estOf = Object.fromEntries((estimates || []).map((e) => [e.kc_id, e]));

  return Response.json({
    sessionId,
    agenda: (rows || []).map((r) => ({
      kcId: r.kc_id,
      title: titleOf[r.kc_id] || 'Concept',
      role: r.role,
      rating: r.tutor_rating,
      misconceptionId: r.misconception_id,
      note: r.tutor_note,
      observed: Boolean(r.observed_at),
      // The tutor sees the split, not a prose summary of it.
      working: estOf[r.kc_id]?.working ?? null,
      confirmed: estOf[r.kc_id]?.confirmed ?? null,
      doseSlope: estOf[r.kc_id]?.dose_slope ?? null,
      flagged: Boolean(estOf[r.kc_id]?.human_recommended),
    })),
    misconceptions: (misconceptions || []).map((m) => ({ id: m.id, kcId: m.kc_id, label: m.label })),
    ratings: TUTOR_RATINGS,
  });
}

export async function POST(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (caller.demo) return Response.json({ error: 'Needs a real account.' }, { status: 501 });
  const svc = serviceClient();
  if (!svc) return Response.json({ error: 'Not configured.' }, { status: 501 });
  const limited = await rateLimitResponse(caller, req, { limit: 60, windowMs: 3600_000 });
  if (limited) return limited;

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }

  const sessionId = String(body?.sessionId || '');
  if (!sessionId) return Response.json({ error: 'sessionId required.' }, { status: 400 });

  const got = await tutorSessionOr(caller, svc, sessionId);
  if (got.error) return Response.json({ error: got.error }, { status: got.status });
  const { session, tutor } = got;

  const observations = Array.isArray(body?.observations) ? body.observations.slice(0, 20) : [];
  if (!observations.length) return Response.json({ error: 'Rate at least one concept.' }, { status: 400 });

  const studentId = session.student_id;
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  // Only KCs the student is actually working on may be rated. A tutor cannot
  // write evidence about arbitrary knowledge components.
  const requestedKcIds = [...new Set(observations.map((o) => String(o?.kcId || '')).filter(Boolean))];
  const { data: owned } = await svc.from('learner_kc')
    .select('kc_id').eq('user_id', studentId).in('kc_id', requestedKcIds);
  const ownedIds = new Set((owned || []).map((r) => r.kc_id));

  const evidenceRows = [];
  const sessionKcRows = [];
  const effectRows = [];
  const skipped = [];

  // Confirmed mastery BEFORE the session, so the post-session check can measure
  // what the human actually moved.
  const { data: before } = await svc.from('kc_estimate')
    .select('kc_id,confirmed').eq('user_id', studentId).in('kc_id', [...ownedIds]);
  const confirmedBefore = Object.fromEntries((before || []).map((e) => [e.kc_id, Number(e.confirmed) || 0]));

  for (const o of observations) {
    const kcId = String(o?.kcId || '');
    if (!ownedIds.has(kcId)) { skipped.push(kcId); continue; }
    const rating = String(o?.rating || '');
    if (!TUTOR_RATINGS.includes(rating)) { skipped.push(kcId); continue; }

    const misconceptionId = o?.misconceptionId ? String(o.misconceptionId) : null;
    const note = o?.note ? String(o.note).slice(0, 1000) : null;

    evidenceRows.push({
      kcId,
      kind: 'tutor_observation',
      outcome: RATING_OUTCOME[rating],
      // A tutor watching a student work unaided IS unassisted evidence. This is
      // the line that makes the human session part of the measurement system
      // rather than a side channel.
      assisted: false,
      assistanceDose: 0,
      verifiedBy: 'human_tutor',
      misconceptionId,
      contextTag: 'tutor_session',
      sourceRef: `tutoring_session:${sessionId}`,
      at: nowIso,
      meta: { tutorId: tutor.id, rating },
    });

    sessionKcRows.push({
      tutoring_session_id: sessionId,
      kc_id: kcId,
      role: 'covered',
      tutor_rating: rating,
      misconception_id: misconceptionId,
      tutor_note: note,
      observed_at: nowIso,
    });

    effectRows.push({
      tutoring_session_id: sessionId,
      tutor_id: tutor.id,
      user_id: studentId,
      kc_id: kcId,
      confirmed_before: confirmedBefore[kcId] ?? 0,
    });
  }

  if (!evidenceRows.length) {
    return Response.json({ error: 'None of those concepts belong to this student.', skipped }, { status: 400 });
  }

  await appendEvidence(svc, studentId, evidenceRows);

  const { error: skErr } = await svc.from('tutoring_session_kc')
    .upsert(sessionKcRows, { onConflict: 'tutoring_session_id,kc_id,role' });
  if (skErr) {
    console.error('[observe] session-KC link failed', skErr.message);
    return Response.json({ error: 'Could not link the concepts to this session — try again.' }, { status: 500 });
  }

  // Record the pre-session baseline so effectiveness is measurable later.
  await svc.from('session_effect')
    .upsert(effectRows, { onConflict: 'tutoring_session_id,kc_id' })
    .then(() => {}, () => {});

  const kcIds = evidenceRows.map((e) => e.kcId);
  await recomputeEstimates(svc, studentId, { kcIds, now });

  // THE RETURN PATH. Schedule a delayed unassisted check on exactly what the
  // tutor covered. That check is what turns "the session went well" into
  // "confirmed mastery moved" — and aggregated across sessions it is per-tutor
  // effectiveness on real learning, which is a signal neither an AI-only nor a
  // marketplace-only product can compute.
  // Written to check_floor_at as well as next_check_at (0030): the floor is
  // what survives. next_check_at alone was recomputed from the ledger on the
  // next evidence append, so an evening of practice erased the delay this
  // return path exists to impose.
  const checkAt = new Date(now + POST_SESSION_CHECK_DELAY_MS).toISOString();
  for (const kcId of kcIds) {
    await svc.from('kc_estimate')
      .update({ next_check_at: checkAt, check_floor_at: checkAt })
      .eq('user_id', studentId).eq('kc_id', kcId)
      .then(() => {}, () => {});
  }

  // A named blocker is a labelled example. Counting it is what lets the
  // misconception library grow from real teaching rather than authoring guesses,
  // improving the AI's diagnosis for every other student on that KC.
  for (const row of sessionKcRows) {
    if (!row.misconception_id) continue;
    await svc.rpc('increment_misconception_observed', { misconception_id: row.misconception_id })
      .then(() => {}, () => {});
  }

  await auditLog(caller.user.id, 'tutoring.observed', sessionId, { kcs: kcIds.length, skipped: skipped.length });

  return Response.json({
    ok: true,
    recorded: kcIds.length,
    skipped,
    nextCheckAt: checkAt,
  });
}
