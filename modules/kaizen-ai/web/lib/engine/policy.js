// The pedagogical policy — what should this learner do next?
// PURE. State in, decision out. No I/O, so it is fully unit-testable and the
// same function serves the API, the UI, and the tutor brief.
//
// Order of precedence, and every rung is load-bearing:
//   1. safety            — preempts everything
//   2. due checks        — retrieval outranks new material (spacing, and it is
//                          the only thing that produces confirmed mastery)
//   3. prerequisites     — never teach a KC whose prereqs are unconfirmed
//   4. the activity ladder by working mastery
//
// This subsumes Kaizen's "Teach me / Socratic" toggle. Today that is a manual
// switch which defaults to the mode that most inflates the mastery signal
// (a worked example followed by a check question, then graded as if unassisted).
// Here the rung is an engine decision the learner may override.

import { activityFor, CONFIRM_THRESHOLD, BAND_ACQUISITION, BAND_REVIEW } from '@/lib/engine/types.js';
import { DEFAULT_POLICY } from '@/lib/engine/config.js';

// How many reachable KCs the growth tip shows. Three to five is a choice a
// learner or a parent can actually make; the whole reachable set is a lattice
// dump, and a lattice dump is not a next step.
export const GROWTH_TIP_LIMIT = 5;

/**
 * @param {Object} state
 * @param {Array}  [state.kcs]         [{ kcId, title, working, confirmed, nextCheckAt, prereqs[], confusables[], humanRecommended }]
 * @param {number} [state.now]
 * @param {boolean} [state.safetyFlag]
 * @param {number} [state.sessionMinutes]
 * @param {number} [state.maxSessionMinutes]  soft cap; defaults from policy config
 * @param {string|null} [state.focusKcId]  learner explicitly chose this
 */
export function nextAction(state = {}) {
  const {
    kcs = [], now = Date.now(), safetyFlag = false,
    sessionMinutes = 0, maxSessionMinutes = DEFAULT_POLICY.session.softCapMinutes, focusKcId = null,
  } = state;

  if (safetyFlag) return { action: 'safety_protocol', reason: 'safety' };

  if (sessionMinutes >= maxSessionMinutes) {
    // Not an engagement lever inverted — spacing says stop, and an infinite
    // session is on the will-not-do list.
    return { action: 'end_session', reason: 'session_cap' };
  }

  // 2. Due checks first. This is the only path to confirmed mastery, so it
  //    outranks new instruction even when the learner would rather push ahead.
  const due = kcs
    .filter((k) => k.nextCheckAt && new Date(k.nextCheckAt).getTime() <= now)
    .filter((k) => (k.working ?? 0) >= 0.3)   // nothing to check if never taught
    .sort((a, b) => new Date(a.nextCheckAt).getTime() - new Date(b.nextCheckAt).getTime());

  if (due.length) {
    return {
      action: 'check',
      kcIds: due.slice(0, 3).map((k) => k.kcId),
      reason: 'checks_due',
      estimatedMinutes: Math.min(6, 2 * Math.min(3, due.length)),
    };
  }

  // 3 + 4. Pick a KC whose prerequisites are confirmed. The reachable set is
  // computed by reachableSet() and nowhere else: the growth tip a parent is
  // shown and the KC this loop actually teaches are the same claim, and two
  // copies of the rule is how they would quietly stop agreeing.
  // `limit: null` asks for the whole set, because an explicit focus may name
  // any reachable KC, not only one of the handful we would put on a screen.
  const reachable = reachableSet(kcs, { limit: null });

  if (!reachable.length) {
    const anyUnconfirmed = kcs.some((k) => (k.confirmed ?? 0) < CONFIRM_THRESHOLD);
    return anyUnconfirmed
      ? { action: 'blocked_on_prereqs', reason: 'prereqs_unconfirmed' }
      : { action: 'all_confirmed', reason: 'nothing_due' };
  }

  // Learner autonomy: an explicit choice wins, provided it is actually
  // reachable. Otherwise take the head of the set — it is already ordered
  // shallowest-first, so [0] is the engine's own pick.
  const chosen = (focusKcId && reachable.find((k) => k.kcId === focusKcId))
    || reachable[0];

  const working = chosen.working ?? 0;
  const activity = activityFor(working);

  return {
    action: 'study',
    kcId: chosen.kcId,
    activity,
    // Hints are gated behind a genuine attempt at every rung that has them.
    // Help-abuse is well documented (Baker et al.) and unearned hints are the
    // mechanism by which assisted performance masquerades as competence.
    hintsAfterAttemptOnly: true,
    interleaveConfusables: working >= 0.7,
    band: working >= CONFIRM_THRESHOLD ? BAND_REVIEW : BAND_ACQUISITION,
    humanRecommended: Boolean(chosen.humanRecommended),
    reason: 'ladder',
  };
}

/**
 * THE GROWTH TIP — the reachable set.
 *
 * Every KC the learner could start today: not already confirmed, and every
 * prerequisite it does have already confirmed. This is the pedagogical claim
 * the whole product rests on ("growth happens at the tip", STRATEGY §4.2), and
 * until it was exported it existed only as a filter buried inside nextAction —
 * so nothing could show a parent or a director what their child can learn next
 * without re-deriving the rule and getting it subtly wrong.
 *
 * PURE, and deliberately so: the same function answers the API, the tutor brief
 * and the policy loop from the same shaped state.
 *
 * Ordered shallowest-first, then weakest: prefer KCs that unlock the most
 * downstream work. Teaching the deepest leaf first is how a learner ends up
 * with a scattered map and no foundation.
 *
 * @param {Array} [kcs]   the learner's shaped KCs — the same shape nextAction takes
 * @param {{limit?: number|null}} [opts]  limit: how many to return; null for the whole set
 */
export function reachableSet(kcs = [], { limit = GROWTH_TIP_LIMIT } = {}) {
  const list = Array.isArray(kcs) ? kcs : [];
  const byId = new Map(list.map((k) => [k.kcId, k]));

  const eligible = list.filter((k) => {
    if ((k.confirmed ?? 0) >= CONFIRM_THRESHOLD) return false;
    const prereqs = Array.isArray(k.prereqs) ? k.prereqs : [];
    // A prerequisite the learner does not hold at all cannot block them: the
    // lattice is far bigger than any one learner's slice of it, and treating an
    // absent node as unconfirmed would wall off every entry point.
    return prereqs.every((p) => (byId.get(p)?.confirmed ?? 0) >= CONFIRM_THRESHOLD || !byId.has(p));
  });

  const ordered = eligible
    .map((k) => ({ k, d: depthOf(k, byId), w: k.working ?? 0 }))
    .sort((a, b) => a.d - b.d || a.w - b.w)
    .map((e) => e.k);

  return limit == null ? ordered : ordered.slice(0, Math.max(0, limit));
}

// How deep in the prerequisite chain a KC sits. `seen` is threaded through the
// whole descent, not reset per branch, so a cycle in the lattice terminates
// instead of hanging the request.
function depthOf(k, byId, seen = new Set()) {
  if (seen.has(k.kcId)) return 0;
  seen.add(k.kcId);
  const prereqs = (Array.isArray(k.prereqs) ? k.prereqs : []).map((p) => byId.get(p)).filter(Boolean);
  return prereqs.length ? 1 + Math.max(...prereqs.map((p) => depthOf(p, byId, seen))) : 0;
}

/**
 * Gaming detection. Baker et al. found a detectable minority systematically
 * exploit hints and answer-cycling, and that gaming correlates with
 * substantially lower learning.
 *
 * The response is deliberately NOT a lockout — it is a switch to worked examples
 * and shorter items. Locking a struggling student out of help is how you lose
 * them; changing what help looks like is how you teach them.
 */
export function detectGaming(recentEvents = []) {
  const evts = Array.isArray(recentEvents) ? recentEvents.slice(-12) : [];
  if (evts.length < 5) return { gaming: false };

  const fastHints = evts.filter((e) => e.type === 'hint' && (e.latencyMs ?? Infinity) < 2500).length;
  const answers = evts.filter((e) => e.type === 'answer');
  const rapidWrong = answers.filter((e) => !e.correct && (e.latencyMs ?? Infinity) < 2000).length;
  const bottomOut = evts.filter((e) => e.type === 'hint' && e.level === 'bottom').length;

  const gaming = fastHints >= 3 || rapidWrong >= 4 || bottomOut >= 3;
  return {
    gaming,
    signals: { fastHints, rapidWrong, bottomOut },
    response: gaming ? 'switch_to_worked_example' : null,
  };
}
