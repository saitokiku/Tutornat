// The hint ladder, mastery credit, and isomorph scheduling. Spec §4.1 F-3, F-4.
//
// The ladder does NOT withhold the answer indefinitely — withholding is not the
// goal, retrieval on the next isomorph is:
//
//   attempt required
//     -> hint 1 (orient)
//     -> hint 2 (teach the step)
//     -> after N failed attempts or explicit give-up:
//        FULL WORKED SOLUTION, no scolding
//        item marked unlearned; an isomorph scheduled within-session AND next
//        session; mastery credit accrues only from the later UNASSISTED isomorph
//
// That last line is the whole design. Failure -> feedback -> spaced retrieval is
// the learning event; the failure itself is not a verdict on the learner, and
// the credit simply moves to the attempt where they do it alone.
//
// Why credit tracking matters: without it the engine has to ASSUME assistance
// rather than measure it, and "assistance fades to zero" becomes a slogan
// instead of a number you can put on a dashboard.
//
// PURE functions. No I/O.

import { DEFAULT_POLICY, creditForItem, independentShare } from '@/lib/engine/config.js';

export const HINT_LEVELS = ['orient', 'teach_step', 'solution'];

/**
 * What is the learner allowed to do right now on this item?
 * PURE — (attempt state, policy) -> affordances.
 */
export function hintState(attempt = {}, policy = DEFAULT_POLICY, { independentBlock = false } = {}) {
  const attempts = Number(attempt.attempts) || 0;
  const hintsUsed = Number(attempt.hints_used ?? attempt.hintsUsed) || 0;
  const bottomedOut = Boolean(attempt.bottomed_out ?? attempt.bottomedOut);
  const solved = Boolean(attempt.solved);

  // F-4: during an independent block hints do not exist at all. This is what
  // makes the resulting evidence unassisted, so it is a hard gate, not a nudge.
  if (independentBlock) {
    return {
      hintsAvailable: false,
      nextHint: null,
      canRequestSolution: false,
      reason: 'independent_block',
      credit: solved ? 1 : 0,
    };
  }

  // An attempt is always required first. Help-abuse is well documented and
  // unearned hints are the mechanism by which assisted performance is mistaken
  // for competence.
  if (policy.hints.attemptRequired && attempts === 0) {
    return {
      hintsAvailable: false,
      nextHint: null,
      canRequestSolution: false,
      reason: 'attempt_required',
      credit: 1,
    };
  }

  if (bottomedOut || solved) {
    return {
      hintsAvailable: false,
      nextHint: null,
      canRequestSolution: false,
      reason: solved ? 'solved' : 'solution_shown',
      credit: creditForItem({ hintsUsed, bottomedOut }, policy),
    };
  }

  const outOfAttempts = attempts >= policy.hints.attemptsBeforeSolution;
  const nextIdx = Math.min(hintsUsed, HINT_LEVELS.length - 1);

  return {
    hintsAvailable: true,
    // Once attempts are exhausted the next thing offered IS the solution —
    // no scolding, no gate, no "are you sure?".
    nextHint: outOfAttempts ? 'solution' : HINT_LEVELS[nextIdx],
    canRequestSolution: true,
    reason: outOfAttempts ? 'attempts_exhausted' : 'available',
    credit: creditForItem({ hintsUsed, bottomedOut }, policy),
  };
}

/**
 * Apply one event to an attempt. PURE — returns the next attempt state.
 * `event` is { type: 'attempt'|'hint'|'solution'|'give_up', correct?, latencyMs? }
 */
export function applyAttemptEvent(attempt = {}, event = {}, policy = DEFAULT_POLICY, { now = Date.now() } = {}) {
  const next = {
    attempts: Number(attempt.attempts) || 0,
    hintsUsed: Number(attempt.hints_used ?? attempt.hintsUsed) || 0,
    bottomedOut: Boolean(attempt.bottomed_out ?? attempt.bottomedOut),
    gaveUp: Boolean(attempt.gave_up ?? attempt.gaveUp),
    solved: Boolean(attempt.solved),
    isomorphDueAt: attempt.isomorph_due_at ?? attempt.isomorphDueAt ?? null,
  };

  switch (event.type) {
    case 'attempt':
      next.attempts += 1;
      if (event.correct) next.solved = true;
      break;
    case 'hint':
      next.hintsUsed += 1;
      break;
    case 'solution':
    case 'give_up':
      next.bottomedOut = true;
      next.gaveUp = event.type === 'give_up';
      break;
    default:
      break;
  }

  next.credit = creditForItem(
    { hintsUsed: next.hintsUsed, bottomedOut: next.bottomedOut },
    policy
  );

  // Any assisted resolution schedules an isomorph. That later, unassisted
  // attempt is where mastery credit actually comes from.
  const neededHelp = next.bottomedOut || next.hintsUsed > 0;
  if ((next.solved || next.bottomedOut) && neededHelp && !next.isomorphDueAt) {
    next.isomorphDueAt = new Date(now + policy.hints.isomorphWithinSessionMs).toISOString();
  }

  return next;
}

/**
 * Evidence for a resolved attempt. PURE.
 *
 * The key line: an item resolved WITH help is `assisted: true` and therefore can
 * never confirm mastery, however correct the final answer was. An item solved
 * with no hints during an independent block is unassisted and can.
 */
export function attemptEvidence(attempt, { kcId, itemId, contextTag, independentBlock = false, sourceRef, now = Date.now() }) {
  const hintsUsed = Number(attempt.hintsUsed ?? attempt.hints_used) || 0;
  const bottomedOut = Boolean(attempt.bottomedOut ?? attempt.bottom_out ?? attempt.bottomed_out);
  const solved = Boolean(attempt.solved);
  const usedHelp = hintsUsed > 0 || bottomedOut;

  return {
    kcId,
    // Practice during a session — checks are a separate, stricter path.
    kind: 'practice',
    outcome: solved ? Number(attempt.credit ?? 1) : 0,
    assisted: usedHelp || !independentBlock,
    assistanceDose: hintsUsed + (bottomedOut ? 2 : 0),
    verifiedBy: 'structural',
    itemId: itemId || null,
    contextTag: contextTag || null,
    sourceRef: sourceRef || null,
    at: new Date(now).toISOString(),
  };
}

/**
 * Should this item run as an independent (hint-free) block? PURE.
 *
 * The share rises with demonstrated independence, so the system visibly recedes
 * as the learner grows. Deterministic in `itemIndex` rather than random, so a
 * session's shape is reproducible and testable.
 */
export function isIndependentBlock(itemIndex, confirmedFraction, policy = DEFAULT_POLICY) {
  const share = independentShare(confirmedFraction, policy);
  if (share <= 0) return false;
  // Spread independent items evenly through the session instead of clumping
  // them at the end, where fatigue would confound the signal.
  const period = Math.max(1, Math.round(1 / share));
  return itemIndex > 0 && itemIndex % period === 0;
}

export { independentShare };
