// Calibration — does our mastery number mean anything? Spec §5.5, §10.
//
// THE FAILURE THIS EXISTS TO CATCH is the one that killed most of the ITS
// literature's credibility: internal mastery meters climb beautifully while
// performance on independent, externally-authored items stays flat. The system
// is grading its own homework and everyone believes it, including the people who
// built it.
//
// Two independent instruments:
//
//   ANCHOR GAP        our confirmed mastery vs. performance on released
//                     TIMSS/NAEP-class items we did not write. Watched WEEKLY,
//                     not at a posttest, because by the posttest you have
//                     already shipped a quarter of nonsense.
//
//   PREDICTION GAP    the learner's own predict-then-check accuracy. Not a
//                     product metric — a learning outcome in its own right.
//                     Novices are systematically overconfident, and retrieval is
//                     what corrects it.
//
// PURE functions. No I/O.

import { DEFAULT_POLICY } from '@/lib/engine/config.js';

/**
 * Anchor gap: |our claim − independent reality|, signed so direction is legible.
 *
 * POSITIVE gap = we claim more than the anchors support. That is the dangerous
 * direction and the one that gets a product sold on numbers that aren't real.
 * Negative gap is fine, even good: we are underclaiming.
 */
export function anchorGap(results, policy = DEFAULT_POLICY) {
  const rows = (Array.isArray(results) ? results : []).filter((r) => r && typeof r.correct === 'boolean');
  if (rows.length < policy.calibration.minAnchorsForSignal) {
    return { available: false, n: rows.length, needed: policy.calibration.minAnchorsForSignal };
  }

  const anchorScore = rows.filter((r) => r.correct).length / rows.length;
  const claimed = rows.reduce((a, r) => a + (Number(r.confirmed_at_time ?? r.confirmedAtTime) || 0), 0) / rows.length;
  const gap = claimed - anchorScore;

  return {
    available: true,
    n: rows.length,
    anchorScore: round(anchorScore),
    claimedMastery: round(claimed),
    gap: round(gap),
    // Only an OVERCLAIM trips the alarm.
    overclaiming: gap > policy.calibration.gapAlarm,
    alarm: gap > policy.calibration.gapAlarm,
    verdict: gap > policy.calibration.gapAlarm
      ? 'Our mastery numbers are running ahead of independent evidence.'
      : gap < -policy.calibration.gapAlarm
        ? 'We are underclaiming — learners do better on independent items than we credit.'
        : 'Mastery claims track independent evidence.',
  };
}

/**
 * Prediction gap: how well does the learner know what they know?
 * Mean |predicted − actual| over predict-then-check probes.
 */
export function predictionGap(events) {
  const rows = (Array.isArray(events) ? events : [])
    .filter((e) => e && typeof e.predicted_correct === 'boolean' && e.outcome != null);
  if (!rows.length) return { available: false, n: 0 };

  let err = 0;
  let over = 0;
  for (const e of rows) {
    const predicted = e.predicted_correct ? 1 : 0;
    const actual = Math.max(0, Math.min(1, Number(e.outcome)));
    err += Math.abs(predicted - actual);
    if (predicted > actual) over += 1;
  }

  const gap = err / rows.length;
  return {
    available: true,
    n: rows.length,
    gap: round(gap),
    overconfidenceRate: round(over / rows.length),
    // Task-level, never person-level. "You are overconfident" is a character
    // judgement; "these were harder than they looked" is information.
    message: gap <= 0.25
      ? 'Your sense of what you know is accurate — that is a real skill.'
      : over / rows.length > 0.5
        ? 'These were harder than they looked. Noticing that gap is how it closes.'
        : 'You know more than you expected here.',
  };
}

/**
 * Per-KC calibration, for the operator dashboard. Ranked worst-overclaim first,
 * because that is the list you act on.
 */
export function calibrationByKc(results, policy = DEFAULT_POLICY) {
  const byKc = new Map();
  for (const r of Array.isArray(results) ? results : []) {
    if (!r?.kc_id) continue;
    if (!byKc.has(r.kc_id)) byKc.set(r.kc_id, []);
    byKc.get(r.kc_id).push(r);
  }
  return [...byKc.entries()]
    .map(([kcId, rows]) => ({ kcId, ...anchorGap(rows, policy) }))
    .filter((x) => x.available)
    .sort((a, b) => b.gap - a.gap);
}

/**
 * Should an anchor item be slipped into this session?
 *
 * Anchors are the measuring stick, so they must stay rare (they cost learner
 * time and teach nothing directly) and must never enter the normal selection
 * pool or be tuned by Elo. Only offered once a KC is actually claimed as
 * confirmed — measuring a claim we haven't made yet tells us nothing.
 */
export function shouldServeAnchor({ confirmed = 0, anchorsSeenForKc = 0, itemsSinceAnchor = 0 }, policy = DEFAULT_POLICY) {
  if (confirmed < policy.mastery.threshold) return false;
  if (anchorsSeenForKc >= 3) return false;      // enough signal per KC
  return itemsSinceAnchor >= 8;
}

function round(n) {
  return Math.round(n * 1e4) / 1e4;
}
