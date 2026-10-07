// The Scheduler seam.
//
// Everything upstream of this file — routes, policy, UI — depends ONLY on the
// contract below. The default implementation (PFA + Elo + HLR) lives behind it.
// Replacing the learning algorithm means writing a new object with these four
// methods and changing one line in `activeScheduler()`.
//
// CONTRACT — the four rules that make a replacement safe:
//
//   1. `estimate` MUST be a pure function of its arguments. No clock reads, no
//      DB, no module state. This is what lets the whole learner population be
//      replayed from the evidence ledger when the algorithm changes, instead of
//      migrated. `now` is always injected.
//   2. All tunable parameters live in one exported config object.
//   3. Every scheduler declares a `version` string. It is written onto every
//      kc_estimate row; a version mismatch is what triggers replay.
//   4. Nothing outside web/lib/engine/ may import pfa/elo/hlr directly. Import
//      the scheduler.
//
// The ledger is the source of truth. Estimates are a cache.

import { estimate as pfaEstimate, doseSlope, PFA_PARAMS } from '@/lib/engine/pfa.js';
import { update as eloUpdate, selectItem, targetEloRange, ELO_START } from '@/lib/engine/elo.js';
import { nextReviewAt, nextCheckAt, halfLifeHours, HLR_PARAMS } from '@/lib/engine/hlr.js';
import { MIN_DELAY_MS } from '@/lib/engine/types.js';

export const DEFAULT_CONFIG = {
  pfa: PFA_PARAMS,
  hlr: HLR_PARAMS,
  minDelayMs: MIN_DELAY_MS,
};

/**
 * @typedef {Object} Scheduler
 * @property {string} version
 * @property {(evidence: Object[], opts: Object) => Object} estimate
 * @property {(evidence: Object[], opts: Object) => Object} schedule
 * @property {(learnerElo: number, mode: string) => Object} difficultyBand
 * @property {(items: Object[], learnerElo: number, opts: Object) => Object|null} pickItem
 * @property {(args: Object) => Object} rate
 * @property {Object} [config]  resolved policy — §6 requires params be inspectable
 */

/** @type {Scheduler} */
export const defaultScheduler = {
  version: 'default-1',
  config: DEFAULT_CONFIG,

  // PURE. (evidence[], {now}) -> { working, confirmed, confidence, gateMet, ... }
  estimate(evidence, { now = 0, config = DEFAULT_CONFIG } = {}) {
    const est = pfaEstimate(evidence, { now, params: config.pfa });
    return { ...est, doseSlope: doseSlope(evidence) };
  },

  // PURE. When does this KC come back, and when may it be confirmed?
  schedule(evidence, { now = 0, lastInstructionAt = null, config = DEFAULT_CONFIG } = {}) {
    return {
      nextReviewAt: nextReviewAt(evidence, { now, params: config.hlr }),
      nextCheckAt: nextCheckAt(evidence, {
        now, lastInstructionAt, minDelayMs: config.minDelayMs, params: config.hlr,
      }),
      halfLifeHours: halfLifeHours(evidence, { params: config.hlr }),
    };
  },

  difficultyBand(learnerElo, mode = 'acquisition') {
    return targetEloRange(learnerElo, mode);
  },

  pickItem(items, learnerElo, opts = {}) {
    return selectItem(items, learnerElo, opts);
  },

  rate(args) {
    return eloUpdate(args);
  },
};

// Swap point. When the new engine philosophy lands, implement the contract above
// and return it here; bump `version` so existing kc_estimate rows are recomputed
// from the ledger rather than trusted.
export function activeScheduler() {
  return defaultScheduler;
}

export { ELO_START };
