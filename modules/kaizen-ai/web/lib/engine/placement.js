// Placement — find where the learner actually is. Spec §4.1 F-1.
//
// THE RULE THAT MATTERS: placement is by DEMONSTRATED LEVEL, with zero
// reference to age or grade anywhere in the sequencing logic. Grade exists only
// as a reporting overlay, and the UI never labels material by grade to a
// teenager ("3rd-grade material" is banned copy).
//
// This is the single strongest finding in global education — Teaching at the
// Right Level — and it is nearly free for software to honour. A learner three
// years behind is the DEFAULT path here, not an exception to handle.
//
// Adaptive by Elo, which converges in 10-15 items with no calibration data,
// unlike IRT which wants hundreds of responses per item before its parameters
// mean anything.
//
// Pure functions + a thin server driver. The selection logic is testable
// without a database.

import { expectedScore, update as eloUpdate, ELO_START } from '@/lib/engine/elo.js';
import { DEFAULT_POLICY } from '@/lib/engine/config.js';

export const PLACEMENT_MIN_ITEMS = 10;
export const PLACEMENT_MAX_ITEMS = 15;
// Stop early once the estimate stops moving — no reason to make a struggling
// learner sit through five more items to confirm what we already know.
export const PLACEMENT_CONVERGENCE = 25;   // Elo points of movement

/**
 * Pick the next placement item. PURE.
 *
 * Targets ~50% expected success during placement — maximum information per
 * item. That is deliberately harder than the 70-85% acquisition band: placement
 * is measurement, not instruction, and it is over in two minutes.
 */
export function nextPlacementItem(pool, { learnerElo = ELO_START, servedIds = [] } = {}) {
  const seen = new Set(servedIds);
  const available = (Array.isArray(pool) ? pool : []).filter((i) => i && !seen.has(i.id));
  if (!available.length) return null;

  // Closest to a coin-flip for this learner = most informative.
  let best = null;
  let bestCost = Infinity;
  for (const item of available) {
    const p = expectedScore(learnerElo, Number(item.difficulty_elo) || ELO_START);
    const cost = Math.abs(p - 0.5);
    if (cost < bestCost) { bestCost = cost; best = item; }
  }
  return best;
}

/**
 * Fold one placement response into the estimate. PURE.
 */
export function applyPlacementResponse(state, { itemElo, correct }) {
  const prev = Number(state?.learnerElo) || ELO_START;
  const n = Number(state?.count) || 0;
  const { learnerElo } = eloUpdate({
    learnerElo: prev,
    itemElo: Number(itemElo) || ELO_START,
    outcome: correct ? 1 : 0,
    learnerExposures: n,
  });
  return {
    learnerElo,
    count: n + 1,
    lastDelta: Math.abs(learnerElo - prev),
  };
}

/** Has placement seen enough? PURE. */
export function placementComplete(state) {
  const n = Number(state?.count) || 0;
  if (n >= PLACEMENT_MAX_ITEMS) return true;
  if (n < PLACEMENT_MIN_ITEMS) return false;
  return Number(state?.lastDelta ?? Infinity) < PLACEMENT_CONVERGENCE;
}

/**
 * Turn a placement Elo into a starting frontier over the KC graph. PURE.
 *
 * Deliberately starts the learner BELOW their measured frontier so the first
 * instructional session runs at ~85-90% success. Competence experience before
 * challenge — a first session that feels hard is how you lose someone who is
 * already behind and already expects to fail at this.
 */
export function frontierFor(kcs, learnerElo, policy = DEFAULT_POLICY) {
  const list = (Array.isArray(kcs) ? kcs : []).filter(Boolean);
  if (!list.length) return null;

  // Rank by graph depth, then difficulty — teach foundations first.
  const sorted = [...list].sort((a, b) =>
    (a.depth ?? 0) - (b.depth ?? 0) || (a.difficulty_elo ?? ELO_START) - (b.difficulty_elo ?? ELO_START));

  const target = policy.bands.firstSession.lo;   // ~0.85 expected success
  // The hardest KC the learner is still expected to succeed at ~85% of the time.
  let frontier = sorted[0];
  for (const kc of sorted) {
    const p = expectedScore(learnerElo, Number(kc.difficulty_elo) || ELO_START);
    if (p >= target) frontier = kc;
    else break;
  }
  return frontier;
}

/**
 * Seed estimates from a completed placement. Returns evidence rows — placement
 * is real evidence, but it is ASSISTED-equivalent: a 12-item adaptive run is a
 * starting guess, not a demonstration, so it can never confirm mastery.
 */
export function placementEvidence(userId, responses, { now = Date.now() } = {}) {
  return (Array.isArray(responses) ? responses : [])
    .filter((r) => r && r.kcId)
    .map((r) => ({
      kcId: r.kcId,
      kind: 'placement',
      outcome: r.correct ? 1 : 0,
      // Not a confirming class. Placement tells us where to START, and nothing
      // about what the learner can do unaided a week from now.
      assisted: true,
      assistanceDose: 0,
      verifiedBy: r.verifier || 'structural',
      itemId: r.itemId || null,
      contextTag: 'placement',
      sourceRef: `placement:${r.runId || 'run'}`,
      at: new Date(now).toISOString(),
    }));
}
