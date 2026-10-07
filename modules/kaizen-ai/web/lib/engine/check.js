// Check assembly and grading. SERVER ONLY.
//
// A "check" is the only thing that produces confirmed mastery, so every property
// of it is defensive:
//
//   - items are chosen server-side and recorded in check_attempt BEFORE the
//     learner sees them, so grading never trusts a client-supplied item list
//   - answer_spec never leaves the server (publicItem strips it; migration 0012
//     also revokes the column)
//   - no hints are available during a check — that is what makes it unassisted
//   - it may not be offered until >=24h after the last instruction on the KC
//   - items the learner has recently seen are heavily penalised, because a check
//     passed from memory of the item is not a check
//
// Contrast with what this replaces: /api/practice ships the answer key to the
// browser, PracticeModal compares client-side, short answers are self-marked,
// and the client PATCHes its own score.

import { activeScheduler } from '@/lib/engine/scheduler.js';
import { check as verify, publicItem } from '@/lib/engine/verify/symbolic.js';
import { appendEvidence, recomputeEstimates } from '@/lib/engine/ledger.js';
import { CONFIRM_WINDOW } from '@/lib/engine/types.js';

const ITEMS_PER_KC = 3;
const ATTEMPT_TTL_MS = 60 * 60 * 1000;

// PostgREST reports a unique-index collision as SQLSTATE 23505; older stacks
// only carry it in the message.
const isUniqueViolation = (e) => e?.code === '23505' || /duplicate key/i.test(e?.message || '');

/**
 * The learner's outstanding (issued, unsubmitted) attempt on this KC — read
 * WITHOUT an expiry filter, deliberately.
 *
 * 0030's one-live-attempt index is predicated on `submitted_at is null` alone,
 * because a partial index cannot call now(). Filtering expired rows out in SQL
 * (which this did until the 2026-08-18 audit) meant the insert below collided
 * with a row this code had decided did not exist — and since nothing anywhere
 * cleared stale rows, one abandoned check locked the learner out of that
 * concept permanently. Whatever occupies the index has to be seen here, and
 * then either resumed or retired.
 */
async function outstandingAttempt(svc, userId, kcId) {
  const { data } = await svc.from('check_attempt')
    .select('id,item_ids,expires_at')
    .eq('user_id', userId).eq('kc_id', kcId)
    .is('submitted_at', null)
    .order('issued_at', { ascending: false })
    .limit(1).maybeSingle();
  return data || null;
}

/**
 * Re-serve an attempt's recorded items, or null when they no longer exist
 * (retired mid-flight). Re-serving the recorded item_ids can't leak anything
 * the first issue didn't already show.
 */
async function resumeAttempt(svc, attempt, kcId) {
  const liveIds = Array.isArray(attempt.item_ids) ? attempt.item_ids : [];
  const { data: liveItems } = await svc.from('kc_item')
    .select('id,kind,body,choices,context_tag')
    .in('id', liveIds);
  const byId = new Map((liveItems || []).map((i) => [i.id, i]));
  const ordered = liveIds.map((id) => byId.get(id)).filter(Boolean);
  if (!ordered.length) return null;
  return { attemptId: attempt.id, kcId, items: ordered.map(publicItem), resumed: true };
}

/**
 * Retire abandoned attempts on this KC (migration 0031). The function stamps
 * `submitted_at = expires_at` and leaves `score` null — which is how an
 * abandoned attempt is told apart from a graded one — so the row drops out of
 * the unique index without any history being deleted. The expiry predicate
 * lives in the database next to the index it has to agree with, so the two
 * cannot drift apart again.
 */
async function expireStaleAttempts(svc, userId, kcId) {
  const { error } = await svc.rpc('expire_stale_check_attempts', { p_user: userId, p_kc: kcId });
  if (error) throw new Error(`stale attempt sweep failed: ${error.message}`);
}

/**
 * Issue a check for one KC. Returns { attemptId, items } with items stripped of
 * their answer keys, or null when the KC is not eligible yet.
 */
export async function issueCheck(svc, userId, kcId, { now = Date.now(), reason = 'scheduled' } = {}) {
  const scheduler = activeScheduler();

  const { data: est } = await svc.from('kc_estimate')
    .select('learner_elo,next_check_at,last_instruction_at')
    .eq('user_id', userId).eq('kc_id', kcId).maybeSingle();

  // The delay rule. A check taken minutes after the tutor explained it measures
  // short-term performance — precisely the quantity the old system over-reported.
  if (est?.next_check_at && new Date(est.next_check_at).getTime() > now) {
    return { notYet: true, availableAt: est.next_check_at };
  }

  // ONE LIVE ATTEMPT PER KC (0030). The delay gate above is read at issue time
  // and only moved by GRADING, and nothing used to record that an attempt was
  // outstanding — so a learner could burst-issue N attempts while the gate was
  // open, then submit them one at a time and bank a month of spaced checks in a
  // single sitting. Confirmation needs 4 passes of the last 5, so that was a
  // complete forgery of the "delayed, repeated" half of the mastery law.
  //
  // Resuming rather than refusing is deliberate: a learner who reloads
  // mid-check gets their own check back instead of an error.
  //
  // "Live" means issued, unsubmitted AND unexpired — the index only enforces
  // the first two. An outstanding attempt past its TTL is not resumable, so it
  // is retired further down rather than served.
  const outstanding = await outstandingAttempt(svc, userId, kcId);
  const live = outstanding && new Date(outstanding.expires_at).getTime() > now ? outstanding : null;
  if (live) {
    const resumed = await resumeAttempt(svc, live, kcId);
    if (resumed) return resumed;
    // The attempt's items vanished (retired mid-flight) — let it lapse rather
    // than serving an empty check.
    return { notYet: true, availableAt: live.expires_at };
  }

  const { data: bank, error } = await svc.from('kc_item')
    .select('id,kind,tier,body,choices,answer_spec,distractor_misconceptions,context_tag,difficulty_elo,exposures')
    .eq('kc_id', kcId).eq('status', 'verified').limit(60);
  if (error) throw new Error(`item bank read failed: ${error.message}`);
  if (!bank || bank.length < 2) return { noBank: true };

  // Items seen in this learner's recent evidence — exposure control.
  const { data: seen } = await svc.from('evidence')
    .select('item_id').eq('user_id', userId).eq('kc_id', kcId)
    .not('item_id', 'is', null)
    .order('at', { ascending: false }).limit(30);
  const seenIds = (seen || []).map((r) => r.item_id);

  const learnerElo = Number(est?.learner_elo) || 1200;
  const picked = [];
  const usedContexts = new Set();

  for (let i = 0; i < ITEMS_PER_KC; i++) {
    const pool = bank.filter((it) => !picked.some((p) => p.id === it.id));
    if (!pool.length) break;
    // Prefer an unused surface context — the >=2-contexts rule in the mastery
    // gate is only meaningful if the check actually varies context.
    const fresh = pool.filter((it) => !usedContexts.has(it.context_tag || 'default'));
    const item = scheduler.pickItem(fresh.length ? fresh : pool, learnerElo, {
      mode: 'review',
      seenIds: [...seenIds, ...picked.map((p) => p.id)],
      jitter: 40,
    });
    if (!item) break;
    picked.push(item);
    usedContexts.add(item.context_tag || 'default');
  }

  if (picked.length < 2) return { noBank: true };

  const row = {
    user_id: userId,
    kc_id: kcId,
    item_ids: picked.map((p) => p.id),
    issued_at: new Date(now).toISOString(),
    expires_at: new Date(now + ATTEMPT_TTL_MS).toISOString(),
    reason,
  };
  const mint = () => svc.from('check_attempt').insert(row).select('id').maybeSingle();

  // Anything still outstanding at this point is expired by definition — the
  // live branch above returned. Retire it so the insert cannot collide with a
  // row we have already ruled unresumable. Only reached when there IS something
  // to retire, so the ordinary path pays for no extra round trip.
  if (outstanding) await expireStaleAttempts(svc, userId, kcId);

  let { data: attempt, error: aErr } = await mint();
  if (aErr && isUniqueViolation(aErr)) {
    // Something took the index between the read and the write: an attempt that
    // lapsed in the gap, or a concurrent issue for the same KC. Retiring is
    // idempotent and only touches rows already past their TTL, so retry once —
    // and if the collision survives that, the winner is genuinely live and the
    // learner should get THEIR attempt back rather than a 500.
    await expireStaleAttempts(svc, userId, kcId);
    ({ data: attempt, error: aErr } = await mint());
    if (aErr && isUniqueViolation(aErr)) {
      const other = await outstandingAttempt(svc, userId, kcId);
      const resumed = other && await resumeAttempt(svc, other, kcId);
      if (resumed) return resumed;
    }
  }
  if (aErr || !attempt) throw new Error(`check issue failed: ${aErr?.message || 'attempt not recorded'}`);

  return {
    attemptId: attempt.id,
    kcId,
    items: picked.map(publicItem),   // answer keys stripped here
  };
}

/**
 * Grade a submitted check. Everything is verified server-side against the item
 * list recorded at issue time.
 *
 * `responses` is { [itemId]: { choice? , text?, order?, blanks?, predictedCorrect?, latencyMs? } }
 */
export async function gradeCheck(svc, userId, attemptId, responses, { now = Date.now() } = {}) {
  const { data: attempt } = await svc.from('check_attempt')
    .select('id,user_id,kc_id,item_ids,submitted_at,expires_at')
    .eq('id', attemptId).maybeSingle();

  if (!attempt || attempt.user_id !== userId) return { error: 'not_found', status: 404 };
  if (attempt.submitted_at) return { error: 'already_submitted', status: 409 };
  if (new Date(attempt.expires_at).getTime() < now) return { error: 'expired', status: 410 };

  // The item list comes from the attempt row, never from the request body.
  const ids = Array.isArray(attempt.item_ids) ? attempt.item_ids : [];
  const { data: items, error } = await svc.from('kc_item')
    .select('id,kind,tier,body,choices,answer_spec,distractor_misconceptions,context_tag,difficulty_elo,exposures')
    .in('id', ids);
  if (error) throw new Error(`item read failed: ${error.message}`);

  const byId = new Map((items || []).map((i) => [i.id, i]));
  const results = [];
  const evidenceRows = [];

  for (const itemId of ids) {
    const item = byId.get(itemId);
    if (!item) continue;
    const response = responses?.[itemId] || {};
    const r = verify(item, response);

    results.push({
      itemId,
      correct: r.correct,
      outcome: r.outcome,
      matchedMisconception: r.matchedMisconception,
    });

    evidenceRows.push({
      kcId: attempt.kc_id,
      kind: 'check',
      outcome: r.outcome,
      assisted: false,              // by construction — no hints exist in a check
      assistanceDose: 0,
      verifiedBy: r.verifier,
      itemId,
      misconceptionId: r.matchedMisconception,
      contextTag: item.context_tag || null,
      latencyMs: response.latencyMs,
      predictedCorrect: typeof response.predictedCorrect === 'boolean' ? response.predictedCorrect : null,
      sourceRef: `check:${attemptId}`,
      at: new Date(now).toISOString(),
    });
  }

  if (!results.length) return { error: 'no_items', status: 500 };

  const score = results.reduce((a, r) => a + r.outcome, 0) / results.length;

  await appendEvidence(svc, userId, evidenceRows);
  await svc.from('check_attempt')
    .update({ submitted_at: new Date(now).toISOString(), score })
    .eq('id', attemptId);

  // Exposure counters drive item rotation on the next check.
  for (const id of ids) {
    await svc.rpc('increment_item_exposure', { item_id: id }).then(() => {}, () => {});
  }

  const [estimate] = await recomputeEstimates(svc, userId, { kcIds: [attempt.kc_id], now });

  // Calibration: how well did the learner predict their own performance? The
  // predict-then-check probe costs nothing and turns every item into calibration
  // training — novices are systematically overconfident, and retrieval is what
  // corrects it.
  // evidenceRows[i] and results[i] were built by the same loop, so pairing by
  // index is sound — but only BEFORE filtering. The old code filtered first and
  // then indexed `results` with the filtered position, which paired a partial
  // prediction set against the wrong items' outcomes.
  const predicted = evidenceRows
    .map((e, i) => ({ predictedCorrect: e.predictedCorrect, outcome: results[i].outcome }))
    .filter((pair) => pair.predictedCorrect != null);
  const calibrationGap = predicted.length
    ? predicted.reduce((a, pair) => a + Math.abs((pair.predictedCorrect ? 1 : 0) - pair.outcome), 0) / predicted.length
    : null;

  return {
    ok: true,
    score,
    results,
    estimate: estimate
      ? { working: estimate.working, confirmed: estimate.confirmed, confidence: estimate.confidence }
      : null,
    calibrationGap,
  };
}

/** KCs whose check is due now, most overdue first. */
export async function dueChecks(svc, userId, { now = Date.now(), limit = 10 } = {}) {
  const { data, error } = await svc.from('kc_estimate')
    .select('kc_id,next_check_at,working,confirmed')
    .eq('user_id', userId)
    .not('next_check_at', 'is', null)
    .lte('next_check_at', new Date(now).toISOString())
    .gte('working', 0.3)
    .order('next_check_at', { ascending: true })
    .limit(limit);
  if (error) throw new Error(`due checks read failed: ${error.message}`);
  return data || [];
}

export { CONFIRM_WINDOW };
