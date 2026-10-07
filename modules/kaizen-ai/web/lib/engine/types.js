// Engine vocabulary. Every constant here has a counterpart in a CHECK constraint
// in supabase/migrations/0012_kc_library.sql or 0013_evidence_ledger.sql — if you
// change one, change both. test/engine.test.mjs asserts they stay in step.
//
// Pure data + pure predicates only. No I/O. Safe on client or server.

import { DEFAULT_POLICY } from '@/lib/engine/config.js';

// ── Evidence kinds ───────────────────────────────────────────────────────────
export const EVIDENCE_KINDS = [
  'check', 'practice', 'chat_signal', 'tutor_observation', 'assignment_score', 'placement',
];

// How correctness was established, ordered weakest → strongest.
export const VERIFIERS = ['self', 'model', 'structural', 'symbolic', 'human_tutor'];

export const KC_TYPES = ['fact', 'skill', 'principle'];
export const TIERS = ['v1', 'v2', 'v3'];
export const TUTOR_RATINGS = ['got_it', 'shaky', 'not_yet'];

// ── The mastery law ──────────────────────────────────────────────────────────
// Only these evidence classes can move CONFIRMED mastery. Everything else moves
// WORKING mastery, which is shown to the learner but never leaves the product.
//
// The rule exists because the current system grades a transcript the tutor wrote:
// assisted performance and unassisted competence are different quantities, and
// conflating them makes the number rise fastest for the learners helped most
// (Bastani et al. 2024: +48% assisted, -17% unassisted).
export const CONFIRMING_KINDS = ['check', 'tutor_observation'];
export const CONFIRMING_VERIFIERS = ['symbolic', 'structural', 'human_tutor'];

// These are DERIVED from config.js, never duplicated. Spec §5.3 requires every
// threshold to be an A/B-able policy parameter; two copies of a number is how
// an experiment silently fails to apply.
//
// A check may not be offered until minDelayMs after the last instruction on the
// KC. Mastery is a claim about tomorrow, not about the hot streak — the spec
// sets this at 48h, because a check the next morning still rides yesterday's
// session.
export const MIN_DELAY_MS = DEFAULT_POLICY.mastery.minDelayMs;

// k-of-n over recent confirming evidence, across at least this many surface
// contexts. Two contexts is the cheapest available guard against item-specific
// pattern matching.
export const CONFIRM_WINDOW = DEFAULT_POLICY.mastery.window;
export const CONFIRM_REQUIRED = DEFAULT_POLICY.mastery.required;
export const CONFIRM_MIN_CONTEXTS = DEFAULT_POLICY.mastery.minContexts;
export const CONFIRM_THRESHOLD = DEFAULT_POLICY.mastery.threshold;
export const PASS_OUTCOME = DEFAULT_POLICY.mastery.passOutcome;

// Evidence weights by verifier. A self-marked short answer is real information
// about learning but weak information about competence; a trained human watching
// someone work unaided is the strongest signal in the system.
export const VERIFIER_WEIGHT = {
  symbolic: 1.0,
  structural: 1.0,
  human_tutor: 1.0,
  model: 0.4,   // v3 open response — never sufficient alone, see canConfirm()
  self: 0.2,
};

// Assisted evidence still teaches us something about working mastery, but it is
// discounted, and it can never confirm.
export const ASSISTED_DISCOUNT = 0.5;

// ── Difficulty targeting ─────────────────────────────────────────────────────
// Acquisition runs at 70-85% success; review runs easier because review is
// consolidation, not challenge. The upper bound nods at the "85% rule" (Wilson
// et al. 2019) while treating it as a heuristic ceiling, not a law about children.
export const BAND_ACQUISITION = DEFAULT_POLICY.bands.acquisition;
export const BAND_REVIEW = DEFAULT_POLICY.bands.review;
export const BAND_FIRST_SESSION = DEFAULT_POLICY.bands.firstSession;

// ── Activity ladder ──────────────────────────────────────────────────────────
// Worked example → completion → independent → check. The empirically supported
// fading path (Renkl & Atkinson), and the reason Kaizen's "Teach me / Socratic"
// toggle becomes an engine decision rather than a manual switch that currently
// defaults to the mode which most inflates the mastery signal.
export const ACTIVITIES = ['worked_example', 'completion', 'independent', 'check'];

export const LADDER = [
  { max: DEFAULT_POLICY.ladder.workedExampleBelow, activity: 'worked_example', hintsAfterAttempt: false },
  { max: DEFAULT_POLICY.ladder.completionBelow, activity: 'completion', hintsAfterAttempt: true },
  { max: CONFIRM_THRESHOLD, activity: 'independent', hintsAfterAttempt: true },
  { max: Infinity, activity: 'check', hintsAfterAttempt: false },
];

// Policy-aware: an experiment arm shifting the ladder must actually shift it.
export function activityFor(workingMastery, policy = DEFAULT_POLICY) {
  const m = Number.isFinite(workingMastery) ? workingMastery : 0;
  if (m < policy.ladder.workedExampleBelow) return 'worked_example';
  if (m < policy.ladder.completionBelow) return 'completion';
  if (m < policy.mastery.threshold) return 'independent';
  return 'check';
}

// ── Predicates ───────────────────────────────────────────────────────────────

// Can this single piece of evidence contribute to CONFIRMED mastery?
// All four conditions are load-bearing; dropping any one reintroduces the defect
// this engine exists to fix.
export function isConfirming(e) {
  if (!e) return false;
  if (!CONFIRMING_KINDS.includes(e.kind)) return false;
  if (e.assisted) return false;
  if (!CONFIRMING_VERIFIERS.includes(e.verified_by)) return false;
  return true;
}

// Weight for an evidence row: verifier quality, discounted if help was available.
export function weightOf(e) {
  if (!e) return 0;
  const base = VERIFIER_WEIGHT[e.verified_by] ?? 0.2;
  return e.assisted ? base * ASSISTED_DISCOUNT : base;
}

export function normalizeTopic(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[‘’“”]/g, "'")
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function slugify(s) {
  return normalizeTopic(s).replace(/ /g, '-').slice(0, 80) || 'kc';
}
