// Elo rating for difficulty targeting. Pure functions; no I/O.
//
// WHY ELO AND NOT IRT
// Classical IRT calibration wants hundreds of responses per item before the
// parameters mean anything — a cold-start problem a new item bank cannot pay.
// Elo self-calibrates online from the first response, costs nothing to compute,
// and has real deployment history in adaptive practice (Klinkenberg et al. 2011,
// Math Garden; Pelanek 2016). Formal IRT is worth it only where measurement
// quality is itself the deliverable — i.e. an independent outcome instrument,
// not the practice loop.

import { BAND_ACQUISITION, BAND_REVIEW } from '@/lib/engine/types.js';

export const ELO_START = 1200;
export const ELO_SCALE = 400;

// K decays with experience: early ratings move fast, settled ratings resist
// noise. Items settle slower than learners because an item's difficulty is a
// fixed property worth estimating precisely.
export function kFactor(exposures, { start = 40, floor = 12, decay = 25 } = {}) {
  const n = Math.max(0, Number(exposures) || 0);
  return Math.max(floor, start * (decay / (decay + n)));
}

// Probability that a learner of rating `learner` answers an item of rating
// `item` correctly.
export function expectedScore(learner, item) {
  return 1 / (1 + Math.pow(10, (Number(item) - Number(learner)) / ELO_SCALE));
}

// One update. Returns both new ratings — learner and item move in opposite
// directions, which is what makes the bank self-calibrating.
export function update({ learnerElo, itemElo, outcome, learnerExposures = 0, itemExposures = 0 }) {
  const L = Number.isFinite(Number(learnerElo)) ? Number(learnerElo) : ELO_START;
  const I = Number.isFinite(Number(itemElo)) ? Number(itemElo) : ELO_START;
  const s = Math.max(0, Math.min(1, Number(outcome) || 0));
  const e = expectedScore(L, I);
  const kL = kFactor(learnerExposures);
  const kI = kFactor(itemExposures, { start: 24, floor: 6, decay: 40 });
  return {
    learnerElo: round(L + kL * (s - e)),
    itemElo: round(I - kI * (s - e)),
    expected: round(e),
  };
}

// The rating range whose expected success rate falls inside the target band.
// Acquisition targets 70-85%; review runs easier because review is retrieval
// consolidation, not challenge. Note the inversion: a HIGHER success target
// means an EASIER item, so hi/lo swap when converting probability to rating.
export function targetEloRange(learnerElo, mode = 'acquisition') {
  const band = mode === 'review' ? BAND_REVIEW : BAND_ACQUISITION;
  const L = Number.isFinite(Number(learnerElo)) ? Number(learnerElo) : ELO_START;
  const eloForP = (p) => L - ELO_SCALE * Math.log10(p / (1 - p));
  return { min: round(eloForP(band.hi)), max: round(eloForP(band.lo)) };
}

// Pick the item whose difficulty best fits the target band, preferring items the
// learner has seen least (exposure control — a check the learner can pass from
// memory of the item rather than knowledge of the KC is not a check).
export function selectItem(items, learnerElo, { mode = 'acquisition', seenIds = [], jitter = 0 } = {}) {
  const pool = (Array.isArray(items) ? items : []).filter(Boolean);
  if (!pool.length) return null;
  const seen = new Set(seenIds);
  const { min, max } = targetEloRange(learnerElo, mode);
  const mid = (min + max) / 2;

  const scored = pool.map((it) => {
    const elo = Number(it.difficulty_elo ?? ELO_START);
    const inBand = elo >= min && elo <= max ? 0 : Math.min(Math.abs(elo - min), Math.abs(elo - max));
    // Seen items are heavily penalised but not excluded — a small bank must
    // still be able to serve a check.
    const seenPenalty = seen.has(it.id) ? 800 : 0;
    const exposurePenalty = Math.min(200, (Number(it.exposures) || 0) * 4);
    return { it, cost: inBand + seenPenalty + exposurePenalty + Math.abs(elo - mid) * 0.1 + (jitter ? hash(it.id) % jitter : 0) };
  });

  scored.sort((a, b) => a.cost - b.cost);
  return scored[0].it;
}

// Deterministic per-id jitter so item choice varies across learners without a
// clock or RNG — the estimator layer must stay replayable.
function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < String(s).length; i++) {
    h ^= String(s).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function round(n) {
  return Math.round(n * 100) / 100;
}
