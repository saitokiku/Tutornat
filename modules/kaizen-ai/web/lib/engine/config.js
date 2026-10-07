// Every pedagogical threshold, in one versioned object.
//
// Spec §5.3: "All thresholds (0.30/0.70/0.95, success bands, hint costs, review
// aggressiveness) are policy parameters in config, A/B-able at the parameter
// level." That is the difference between an engine you can tune from evidence
// and one you can only argue about.
//
// Two rules that make this safe:
//   1. Nothing in the engine may hardcode a number that appears here.
//   2. `version` is stamped onto every kc_estimate row. Change a parameter,
//      bump the version, and the ledger replays — learner state is never
//      migrated, it is recomputed. See scheduler.js.
//
// Experiment assignment is by learner (§10), so two learners can run different
// configs simultaneously; the version on their estimate rows says which.

export const POLICY_VERSION = 'policy-1';

export const DEFAULT_POLICY = {
  version: POLICY_VERSION,

  // ── The mastery law (§4.1 F-5) ─────────────────────────────────────────────
  mastery: {
    // k-of-n recent CONFIRMING passes across >= minContexts surface contexts.
    window: 5,
    required: 4,
    minContexts: 2,
    threshold: 0.95,
    // An answer at or above this counts as a pass within the k-of-n gate.
    passOutcome: 0.8,
    // Spec §4.1 F-5: "one retention check >= 48h later". Raised from 24h —
    // a check the next morning still rides yesterday's session.
    minDelayMs: 48 * 60 * 60 * 1000,
    // Confirming evidence must carry at least this much recency-weighted mass,
    // so year-old passes cannot keep certifying a dormant concept.
    freshnessFactor: 0.5,
  },

  // ── The activity ladder (§5.3) ─────────────────────────────────────────────
  ladder: {
    workedExampleBelow: 0.30,
    completionBelow: 0.70,
    // independent runs from completionBelow up to mastery.threshold
    interleaveConfusablesFrom: 0.70,
    // §4.1 F-2: "~30% interleaved confusables in the independent phase"
    interleaveRate: 0.30,
  },

  // ── Difficulty targeting (§5.3) ────────────────────────────────────────────
  // Acquisition 70-85%; review is consolidation not challenge, so it runs
  // easier. Spec says review >= 90%.
  bands: {
    acquisition: { lo: 0.70, hi: 0.85 },
    review: { lo: 0.90, hi: 0.97 },
    // First session after placement starts below the frontier so the learner
    // succeeds — competence experience before challenge (§4.1 F-1).
    firstSession: { lo: 0.85, hi: 0.92 },
  },

  // ── Hints and the answer-withholding ladder (§4.1 F-3) ────────────────────
  hints: {
    // An attempt is always required before any hint is available.
    attemptRequired: true,
    // After this many failed attempts (or explicit give-up) the full worked
    // solution is shown. Withholding forever is not the goal; retrieval on the
    // next isomorph is.
    attemptsBeforeSolution: 3,
    // Each hint consumed reduces the mastery credit of that item.
    creditPerHint: 0.35,
    // Bottom-out (full solution) zeroes credit for the item entirely.
    bottomOutCredit: 0,
    // The isomorph is re-shown this soon within-session, then again next session.
    isomorphWithinSessionMs: 5 * 60 * 1000,
  },

  // ── Independent-work blocks (§4.1 F-4) ────────────────────────────────────
  // A rising share of each session runs with hints unavailable. This is the
  // operational form of "the system makes itself progressively unnecessary".
  independent: {
    baseShare: 0.20,
    // share = baseShare + slope * confirmedFraction, capped
    slope: 0.50,
    maxShare: 0.70,
  },

  // ── Session shape (§4.1 F-2, §11.4 no infinite sessions) ──────────────────
  session: {
    softCapMinutes: 25,
    hardCapMinutes: 45,
    // Consecutive unassisted failures before stepping down to a prerequisite.
    stepDownAfterFailures: 3,
    // Overdue reviews are sampled by overdue-ness x KC importance, capped so a
    // backlog never becomes a wall of review.
    maxReviewsPerSession: 8,
  },

  // ── Checks ────────────────────────────────────────────────────────────────
  check: {
    itemsPerKc: 3,
    minItemsToIssue: 2,
    attemptTtlMs: 60 * 60 * 1000,
    // Delay after a human tutoring session before the confirming check.
    postSessionDelayMs: 48 * 60 * 60 * 1000,
    // Items seen this recently are heavily penalised in selection.
    exposureLookback: 30,
  },

  // ── Gaming detection (§4.1 F-9) ───────────────────────────────────────────
  gaming: {
    fastHintMs: 2500,
    fastHintCount: 3,
    rapidWrongMs: 2000,
    rapidWrongCount: 4,
    bottomOutCount: 3,
    minEventsToJudge: 5,
  },

  // ── Dependency alarm (§4.2 F-22, §10) ─────────────────────────────────────
  dependency: {
    // Assistance-dose slope must be negative. Flat or rising on a KC with real
    // working mastery = the learner is leaning on the system, not outgrowing it.
    slopeAlarmAbove: 0,
    minWorkingToAlarm: 0.30,
    maxConfirmedToAlarm: 0.50,
    minPointsForSlope: 4,
  },

  // ── Calibration (§10, aligned-test-mirage detector) ───────────────────────
  calibration: {
    // Internal confirmed mastery vs. performance on independent anchor items.
    // Beyond this gap the engine is grading its own homework and we want to
    // know weekly, not at the posttest.
    gapAlarm: 0.15,
    minAnchorsForSignal: 5,
  },
};

// Deep-freeze so a caller cannot mutate shared policy at runtime and silently
// change what mastery means for everyone.
function deepFreeze(o) {
  for (const v of Object.values(o)) if (v && typeof v === 'object') deepFreeze(v);
  return Object.freeze(o);
}
deepFreeze(DEFAULT_POLICY);

/**
 * Resolve the policy for a learner. Overrides come from experiment assignment
 * (§10: policy-parameter-level A/B with learner-level assignment).
 *
 * PURE — no I/O. The caller supplies the overrides.
 */
export function resolvePolicy(overrides = null) {
  if (!overrides || typeof overrides !== 'object') return DEFAULT_POLICY;
  const merged = structuredCloneish(DEFAULT_POLICY);
  for (const [group, params] of Object.entries(overrides)) {
    if (!merged[group] || typeof params !== 'object') continue;
    for (const [k, v] of Object.entries(params)) {
      if (k in merged[group]) merged[group][k] = v;
    }
  }
  // An experiment arm is a distinct policy version, so its estimates are
  // recomputed rather than compared against control's cached numbers.
  merged.version = `${POLICY_VERSION}+${hashOverrides(overrides)}`;
  return deepFreeze(merged);
}

function structuredCloneish(o) {
  return JSON.parse(JSON.stringify(o));
}

function hashOverrides(o) {
  const s = JSON.stringify(o);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}

/**
 * The share of a session that should run with hints unavailable, rising with
 * demonstrated independence (§4.1 F-4).
 */
export function independentShare(confirmedFraction, policy = DEFAULT_POLICY) {
  const f = Math.max(0, Math.min(1, Number(confirmedFraction) || 0));
  const { baseShare, slope, maxShare } = policy.independent;
  return Math.min(maxShare, baseShare + slope * f);
}

/**
 * Mastery credit for an item given how much help was consumed (§4.1 F-3).
 * Hints cost credit; a bottom-out solution earns none.
 */
export function creditForItem({ hintsUsed = 0, bottomedOut = false }, policy = DEFAULT_POLICY) {
  if (bottomedOut) return policy.hints.bottomOutCredit;
  const credit = 1 - policy.hints.creditPerHint * Math.max(0, hintsUsed);
  return Math.max(0, Math.min(1, credit));
}
