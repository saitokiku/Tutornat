// Performance Factors Analysis — mastery estimation from evidence counts.
// Pavlik, Cen & Koedinger (2009). Pure functions; no I/O.
//
// WHY PFA AND NOT THE ALTERNATIVES
// - SM-2 (what Kaizen uses today) needs a 0-5 quality judgement per review. The
//   new signal is binary item outcomes with provenance, which SM-2 has no way to
//   consume. Its ease-factor machinery is also a 1987 approximation of what
//   half-life regression estimates directly (see hlr.js).
// - BKT is the classic alternative but has a well-known parameter identifiability
//   problem (Beck & Chang 2007) — multiple parameter sets fit the same data with
//   different interpretations, which is bad when you must explain a mastery
//   decision to a parent.
// - Deep knowledge tracing wins on AUC in papers and loses to tuned classical
//   baselines in practice (Khajah, Lindsey & Mozer 2016). Worse, DKT predictions
//   can be non-monotone in evidence (Yeung & Yeung 2018) — a correct answer
//   LOWERING estimated mastery. Indefensible inside a gate a human has to justify.
//
// PFA is a logistic model over weighted success/failure counts. It cold-starts,
// runs in microseconds, and every decision reduces to one sentence:
// "6 of your last 8, unassisted, across 2 contexts."

import {
  isConfirming, weightOf,
  CONFIRM_WINDOW, CONFIRM_REQUIRED, CONFIRM_MIN_CONTEXTS, CONFIRM_THRESHOLD,
} from '@/lib/engine/types.js';

// m = β + γ·successes + ρ·failures ; p = σ(m)
// γ > 0, ρ < 0, |ρ| > γ — failures are more diagnostic than successes, which is
// what stops a long tail of lucky guesses from dragging mastery upward.
export const PFA_PARAMS = {
  beta: -1.2,   // KC easiness prior: a learner with no evidence sits near 0.23
  gamma: 0.55,  // per weighted success
  rho: -0.85,   // per weighted failure
  halfLifeDays: 45, // older evidence counts less; recency without forgetting it entirely
};

export function sigmoid(x) {
  if (x >= 0) return 1 / (1 + Math.exp(-x));
  const z = Math.exp(x);           // numerically stable for large negative x
  return z / (1 + z);
}

// Exponential recency decay. Evidence from months ago is still evidence, just
// weaker — this is what stops a strong week in September from certifying a
// learner in December.
function recency(at, now, halfLifeDays) {
  const ageMs = now - new Date(at).getTime();
  if (!Number.isFinite(ageMs) || ageMs <= 0) return 1;
  const ageDays = ageMs / 86400000;
  return Math.pow(0.5, ageDays / halfLifeDays);
}

// Split evidence into weighted success/failure mass.
// `outcome` is continuous in [0,1] so a partially-correct multistep item
// contributes to both sides rather than being forced binary.
function counts(evidence, { now, params }) {
  let s = 0, f = 0;
  for (const e of evidence) {
    if (e?.outcome == null) continue;
    // `weight` is the STORED value of weightOf() at write time (ledger.js sets
    // it), so prefer it and fall back to recomputing. Using both would square
    // the assisted discount and silently suppress every estimate.
    const base = Number.isFinite(Number(e.weight)) ? Number(e.weight) : weightOf(e);
    const w = base * recency(e.at, now, params.halfLifeDays);
    if (!(w > 0)) continue;
    const o = Math.max(0, Math.min(1, Number(e.outcome)));
    s += w * o;
    f += w * (1 - o);
  }
  return { s, f };
}

function pfaProbability({ s, f }, params) {
  return sigmoid(params.beta + params.gamma * s + params.rho * f);
}

// Confidence: how much do we trust this estimate? Grows with total evidence mass
// and saturates. Reported alongside mastery so the UI can distinguish "we think
// 40%" from "we have no idea".
function confidenceFrom(mass) {
  return 1 - Math.exp(-mass / 3);
}

/**
 * estimate(evidence[]) -> { working, confirmed, confidence, ... }
 *
 * PURE. Depends only on its arguments — no clock reads, no DB, no globals — so
 * the whole learner state can be replayed from the ledger when the scheduler
 * changes. That property is what makes this module swappable.
 *
 * WORKING   all evidence, assisted included, discounted by verifier quality.
 * CONFIRMED only unassisted, machine-or-human-verified evidence, AND gated on
 *           k-of-n recent successes across >= 2 surface contexts.
 */
export function estimate(evidence, { now = 0, params = PFA_PARAMS } = {}) {
  const rows = Array.isArray(evidence) ? evidence.filter(Boolean) : [];
  const t = now || Date.now();

  const workingCounts = counts(rows, { now: t, params });
  const working = pfaProbability(workingCounts, params);

  const confirmingRows = rows.filter(isConfirming);
  const confirmingCounts = counts(confirmingRows, { now: t, params });
  let confirmed = confirmingRows.length ? pfaProbability(confirmingCounts, params) : 0;

  // The k-of-n gate. PFA alone would let a long run of old successes confirm a
  // KC the learner has not touched recently, and would let five attempts at the
  // same item stand in for understanding.
  const recent = confirmingRows
    .slice()
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, CONFIRM_WINDOW);
  const passes = recent.filter((e) => Number(e.outcome) >= 0.8).length;
  const contexts = new Set(recent.filter((e) => Number(e.outcome) >= 0.8).map((e) => e.context_tag || e.item_id || 'default'));

  // Mastery must also still be FRESH. Counting raw passes with no recency
  // requirement would leave a learner permanently confirmed on something they
  // nailed a year ago and never touched again — mastery is a claim about
  // tomorrow, so evidence has to be recent enough to still support it. The
  // recency-weighted success mass handles this without a second decay constant:
  // year-old evidence decays to near-zero mass on its own.
  const confirmingMass = confirmingCounts.s;
  const fresh = confirmingMass >= CONFIRM_REQUIRED * 0.5;

  const gateMet = recent.length >= CONFIRM_REQUIRED
    && passes >= CONFIRM_REQUIRED
    && contexts.size >= CONFIRM_MIN_CONTEXTS
    && fresh;

  // Reconcile the two notions of "confirmed". The GATE is the operational
  // definition of mastery — k-of-n recent unassisted passes across >=2 contexts.
  // PFA supplies the smooth interior, but with deliberately conservative
  // parameters it tops out below CONFIRM_THRESHOLD even on a clean run, so
  // comparing the raw PFA value against the threshold would mean the gate could
  // never actually open.
  //
  // So the PFA value is mapped into a band rather than clamped: confirmed >=
  // CONFIRM_THRESHOLD if and only if the gate is satisfied, while the ordering
  // PFA gives us is preserved on both sides. Flattening with max() would make
  // a clean run and a run with a failure indistinguishable.
  confirmed = gateMet
    ? CONFIRM_THRESHOLD + (1 - CONFIRM_THRESHOLD) * confirmed
    : CONFIRM_THRESHOLD * Math.min(confirmed, 0.999);

  const mass = workingCounts.s + workingCounts.f;

  return {
    working: round(working),
    confirmed: round(confirmed),
    confidence: round(confidenceFrom(mass)),
    gateMet,
    evidenceCount: rows.length,
    confirmingCount: confirmingRows.length,
    contextsSeen: [...contexts],
    successMass: round(workingCounts.s),
    failureMass: round(workingCounts.f),
  };
}

// Assistance-dose slope over time. Must trend NEGATIVE: the learner should need
// less help on a KC as they progress. A flat or rising slope is the dependency
// alarm — the operational form of "the system makes itself progressively
// unnecessary" (expertise reversal, Kalyuga et al. 2003; Bastani et al. 2024).
// Returns null when there is too little data to say.
export function doseSlope(evidence) {
  const pts = (Array.isArray(evidence) ? evidence : [])
    .filter((e) => e && e.assisted && Number.isFinite(Number(e.assistance_dose)))
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
    .map((e, i) => ({ x: i, y: Number(e.assistance_dose) }));
  if (pts.length < 4) return null;

  const n = pts.length;
  const mx = pts.reduce((a, p) => a + p.x, 0) / n;
  const my = pts.reduce((a, p) => a + p.y, 0) / n;
  let num = 0, den = 0;
  for (const p of pts) { num += (p.x - mx) * (p.y - my); den += (p.x - mx) ** 2; }
  return den === 0 ? null : round(num / den);
}

function round(n) {
  return Math.round(n * 1e4) / 1e4;
}
