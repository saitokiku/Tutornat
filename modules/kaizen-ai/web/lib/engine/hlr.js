// Half-life regression — when should this come back?
// After Settles & Meeder (2016), simplified. Pure functions; no I/O.
//
// The model: recall probability decays exponentially with a per-(learner, KC)
// half-life estimated from practice history.
//
//     p(recall after Δ) = 2 ^ (-Δ / h)
//
// Successes lengthen h; failures shorten it sharply. Schedule the review at the
// moment p crosses a target — i.e. at the edge of forgetting, which is where
// spacing does its work.
//
// WHY THIS RATHER THAN FIXED INTERVALS
// Cepeda et al. (2008) found the optimal gap scales with the retention interval
// rather than following any universal 1/3/7-day ladder, and expanding schedules
// have surprisingly weak support over uniform ones (Karpicke & Roediger 2007).
// What matters is reviewing near the edge of forgetting — which is a quantity to
// estimate, not a constant to hardcode. SM-2's ease factor is a 1987
// approximation of exactly this.
//
// CAVEAT worth carrying: HLR's published validation is vocabulary recall. Whether
// it calibrates on procedural or conceptual KCs is an open question — measure it
// on real data before trusting the intervals, and fall back to a simple expanding
// ladder if it overfits.

import { isConfirming } from '@/lib/engine/types.js';

export const HLR_PARAMS = {
  baseHours: 20,       // half-life with no history
  successGain: 1.9,    // multiplicative per weighted success
  failurePenalty: 0.45,// multiplicative per weighted failure
  minHours: 4,
  maxHours: 24 * 365,
  targetRecall: 0.85,  // schedule review when predicted recall drops to here
};

// Estimated half-life in hours.
// Successes multiply, failures divide — the classic multiplicative form, which
// makes intervals grow geometrically for material that is sticking and collapse
// for material that is not.
export function halfLifeHours(evidence, { params = HLR_PARAMS } = {}) {
  const rows = (Array.isArray(evidence) ? evidence : []).filter((e) => e && e.outcome != null);
  if (!rows.length) return params.baseHours;

  let s = 0, f = 0;
  for (const e of rows) {
    const o = Math.max(0, Math.min(1, Number(e.outcome)));
    // Unassisted evidence tells us far more about durable retention than
    // evidence collected with help available.
    const w = e.assisted ? 0.4 : 1;
    s += w * o;
    f += w * (1 - o);
  }

  const h = params.baseHours
    * Math.pow(params.successGain, s)
    * Math.pow(params.failurePenalty, f);

  return clamp(h, params.minHours, params.maxHours);
}

// Predicted recall probability `deltaHours` after the last review.
export function predictedRecall(deltaHours, h) {
  const d = Math.max(0, Number(deltaHours) || 0);
  const half = Math.max(1e-6, Number(h) || 1);
  return Math.pow(2, -d / half);
}

/**
 * When should this KC be reviewed next?
 * Returns an epoch ms timestamp, or null when there is nothing to schedule.
 *
 * PURE: `now` is injected, never read from the clock, so replay is deterministic.
 */
export function nextReviewAt(evidence, { now = 0, params = HLR_PARAMS } = {}) {
  const rows = (Array.isArray(evidence) ? evidence : []).filter((e) => e && e.outcome != null);
  if (!rows.length) return null;
  const t = now || Date.now();

  const last = rows.reduce((acc, e) => Math.max(acc, new Date(e.at).getTime() || 0), 0);
  if (!last) return null;

  const h = halfLifeHours(rows, { params });
  // Solve 2^(-Δ/h) = targetRecall  →  Δ = -h · log2(target)
  const deltaHours = -h * Math.log2(params.targetRecall);
  const at = last + deltaHours * 3600000;

  // Never schedule in the past — a backlog should surface as "due now", not as
  // an ever-receding timestamp.
  return Math.max(at, t);
}

/**
 * When may the next CONFIRMING check be offered?
 *
 * Two constraints, and both matter:
 *  1. >= 24h since the last instruction on this KC. A check taken minutes after
 *     the tutor explained it measures short-term performance, which is exactly
 *     the quantity the current system already over-reports.
 *  2. Not before the half-life schedule says retrieval is informative.
 */
export function nextCheckAt(evidence, { now = 0, lastInstructionAt = null, minDelayMs = 86400000, params = HLR_PARAMS } = {}) {
  const t = now || Date.now();
  const instructionFloor = lastInstructionAt
    ? new Date(lastInstructionAt).getTime() + minDelayMs
    : t;

  const confirming = (Array.isArray(evidence) ? evidence : []).filter(isConfirming);
  if (!confirming.length) return Math.max(instructionFloor, t);

  const review = nextReviewAt(confirming, { now: t, params });
  return Math.max(instructionFloor, review || t, t);
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}
