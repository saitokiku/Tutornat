// The mastery law, the estimators, and the policy.
//
// The single most important assertion in this file is "assisted evidence can
// never confirm mastery" — that is the defect the whole engine exists to fix,
// and every other guarantee depends on it holding.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isConfirming, weightOf, activityFor, normalizeTopic, slugify,
  CONFIRMING_KINDS, CONFIRMING_VERIFIERS, VERIFIER_WEIGHT,
  CONFIRM_REQUIRED, CONFIRM_MIN_CONTEXTS,
} from '@/lib/engine/types.js';
import { estimate, doseSlope, sigmoid } from '@/lib/engine/pfa.js';
import { expectedScore, update as eloUpdate, targetEloRange, selectItem, kFactor } from '@/lib/engine/elo.js';
import { halfLifeHours, predictedRecall, nextReviewAt, nextCheckAt } from '@/lib/engine/hlr.js';
import { activeScheduler } from '@/lib/engine/scheduler.js';
import { nextAction, detectGaming } from '@/lib/engine/policy.js';

const T0 = Date.parse('2026-07-01T12:00:00Z');
const HOUR = 3600000;
const DAY = 24 * HOUR;

// Unassisted, symbolically-verified check — the confirming class.
const good = (o, at, ctx = 'a') => ({
  kind: 'check', outcome: o, assisted: false, verified_by: 'symbolic',
  at: new Date(at).toISOString(), context_tag: ctx, weight: 1,
});
// Assisted chat signal — the class the old system mistook for mastery.
const chat = (o, at) => ({
  kind: 'chat_signal', outcome: o, assisted: true, verified_by: 'model',
  at: new Date(at).toISOString(), assistance_dose: 1, weight: 0.4,
});

// ── The mastery law ──────────────────────────────────────────────────────────

test('assisted evidence can NEVER confirm mastery, however much of it there is', () => {
  // 40 perfect assisted sessions. This is exactly the shape the current product
  // produces, and exactly what must not certify anyone.
  const evidence = Array.from({ length: 40 }, (_, i) => chat(1, T0 + i * HOUR));
  const r = estimate(evidence, { now: T0 + 41 * HOUR });

  assert.ok(r.working > 0.9, 'working mastery should be high — they did engage');
  assert.equal(r.confirmed, 0, 'confirmed must be exactly zero');
  assert.equal(r.gateMet, false);
});

test('isConfirming requires all four conditions simultaneously', () => {
  const base = { kind: 'check', assisted: false, verified_by: 'symbolic' };
  assert.equal(isConfirming(base), true);
  assert.equal(isConfirming({ ...base, assisted: true }), false, 'help available disqualifies');
  assert.equal(isConfirming({ ...base, kind: 'practice' }), false, 'practice is not a check');
  assert.equal(isConfirming({ ...base, kind: 'chat_signal' }), false);
  assert.equal(isConfirming({ ...base, verified_by: 'self' }), false, 'self-marking disqualifies');
  assert.equal(isConfirming({ ...base, verified_by: 'model' }), false, 'v3 model judgement alone disqualifies');
  assert.equal(isConfirming(null), false);
});

test('a human tutor observing unaided work IS confirming evidence', () => {
  // The design claim: a trained human watching a student work is the strongest
  // signal available, not a note to be emailed.
  assert.equal(isConfirming({ kind: 'tutor_observation', assisted: false, verified_by: 'human_tutor' }), true);
  assert.ok(CONFIRMING_KINDS.includes('tutor_observation'));
  assert.ok(CONFIRMING_VERIFIERS.includes('human_tutor'));
});

test('self-marked answers are weighted lowest and never confirm', () => {
  assert.ok(VERIFIER_WEIGHT.self < VERIFIER_WEIGHT.model);
  assert.ok(VERIFIER_WEIGHT.model < VERIFIER_WEIGHT.symbolic);
  assert.equal(VERIFIER_WEIGHT.symbolic, VERIFIER_WEIGHT.human_tutor);
  assert.equal(isConfirming({ kind: 'check', assisted: false, verified_by: 'self' }), false);
});

test('weightOf discounts assisted evidence', () => {
  const un = weightOf({ verified_by: 'symbolic', assisted: false });
  const as = weightOf({ verified_by: 'symbolic', assisted: true });
  assert.ok(as < un);
  assert.equal(weightOf(null), 0);
});

test('the k-of-n gate needs enough recent passes across >=2 contexts', () => {
  const now = T0 + 10 * DAY;

  // All passes but only ONE surface context — pattern matching, not mastery.
  const oneContext = Array.from({ length: 6 }, (_, i) => good(1, T0 + i * DAY, 'same'));
  const r1 = estimate(oneContext, { now });
  assert.equal(r1.gateMet, false, 'single context must not satisfy the gate');
  assert.ok(r1.confirmed <= 0.94);

  // Same volume across two contexts — this is what mastery looks like.
  const twoContexts = [
    good(1, T0 + 0 * DAY, 'a'), good(1, T0 + 1 * DAY, 'b'),
    good(1, T0 + 2 * DAY, 'a'), good(1, T0 + 3 * DAY, 'b'),
    good(1, T0 + 4 * DAY, 'a'),
  ];
  const r2 = estimate(twoContexts, { now });
  assert.equal(r2.gateMet, true);
  assert.ok(r2.confirmed > 0.94, `expected confirmed >0.94, got ${r2.confirmed}`);
  assert.ok(r2.contextsSeen.length >= CONFIRM_MIN_CONTEXTS);
});

test('failures pull confirmed mastery down harder than successes push it up', () => {
  const now = T0 + 10 * DAY;
  const passes = [good(1, T0, 'a'), good(1, T0 + DAY, 'b'), good(1, T0 + 2 * DAY, 'a'), good(1, T0 + 3 * DAY, 'b')];
  const withFail = [...passes, good(0, T0 + 4 * DAY, 'a')];
  assert.ok(estimate(withFail, { now }).confirmed < estimate(passes, { now }).confirmed);
});

test('estimate is PURE — same inputs, same output, and never reads the clock', () => {
  const ev = [good(1, T0, 'a'), chat(0.5, T0 + HOUR), good(0, T0 + DAY, 'b')];
  const a = estimate(ev, { now: T0 + 5 * DAY });
  const b = estimate(ev, { now: T0 + 5 * DAY });
  assert.deepEqual(a, b);
  // A different injected `now` must change the answer (recency decay is real),
  // proving the function uses the argument rather than Date.now().
  const c = estimate(ev, { now: T0 + 400 * DAY });
  assert.notDeepEqual(a, c);
});

test('no evidence yields zero confirmed and near-zero confidence', () => {
  const r = estimate([], { now: T0 });
  assert.equal(r.confirmed, 0);
  assert.equal(r.confidence, 0);
  assert.ok(r.working < 0.3, 'the prior should not imply competence');
});

test('recency decay: old success confirms less than recent success', () => {
  const recent = [good(1, T0 + 9 * DAY, 'a'), good(1, T0 + 9.5 * DAY, 'b'), good(1, T0 + 9.8 * DAY, 'a'), good(1, T0 + 9.9 * DAY, 'b')];
  const old = [good(1, T0 - 300 * DAY, 'a'), good(1, T0 - 299 * DAY, 'b'), good(1, T0 - 298 * DAY, 'a'), good(1, T0 - 297 * DAY, 'b')];
  const now = T0 + 10 * DAY;
  assert.ok(estimate(recent, { now }).confirmed > estimate(old, { now }).confirmed);
});

// ── Dependency alarm ─────────────────────────────────────────────────────────

test('doseSlope detects a learner who is not becoming independent', () => {
  const rising = [1, 2, 3, 4, 5].map((d, i) => ({ ...chat(1, T0 + i * DAY), assistance_dose: d }));
  const falling = [5, 4, 3, 2, 1].map((d, i) => ({ ...chat(1, T0 + i * DAY), assistance_dose: d }));
  assert.ok(doseSlope(rising) > 0, 'rising help demand is the dependency alarm');
  assert.ok(doseSlope(falling) < 0, 'healthy learners need less help over time');
  assert.equal(doseSlope([]), null, 'too little data must say so, not guess');
});

// ── Estimator internals ──────────────────────────────────────────────────────

test('sigmoid is stable and monotonic at extremes', () => {
  assert.ok(Number.isFinite(sigmoid(-1000)) && sigmoid(-1000) >= 0);
  assert.ok(Number.isFinite(sigmoid(1000)) && sigmoid(1000) <= 1);
  assert.ok(sigmoid(-1) < sigmoid(0) && sigmoid(0) < sigmoid(1));
  assert.ok(Math.abs(sigmoid(0) - 0.5) < 1e-12);
});

test('Elo: expected score, symmetric update, decaying K', () => {
  assert.ok(Math.abs(expectedScore(1200, 1200) - 0.5) < 1e-9);
  assert.ok(expectedScore(1600, 1200) > 0.9);

  const win = eloUpdate({ learnerElo: 1200, itemElo: 1200, outcome: 1 });
  assert.ok(win.learnerElo > 1200, 'a win raises the learner');
  assert.ok(win.itemElo < 1200, 'and lowers the item');

  const loss = eloUpdate({ learnerElo: 1200, itemElo: 1200, outcome: 0 });
  assert.ok(loss.learnerElo < 1200 && loss.itemElo > 1200);

  assert.ok(kFactor(0) > kFactor(100), 'K must decay with experience');
});

test('difficulty band: review is easier than acquisition', () => {
  const acq = targetEloRange(1200, 'acquisition');
  const rev = targetEloRange(1200, 'review');
  // Easier means lower item rating.
  assert.ok(rev.max < acq.max, 'review items should be easier than acquisition items');
  assert.ok(acq.min < acq.max);
});

test('selectItem avoids items the learner just saw', () => {
  const items = [
    { id: 'seen', difficulty_elo: 1200, exposures: 0 },
    { id: 'fresh', difficulty_elo: 1200, exposures: 0 },
  ];
  assert.equal(selectItem(items, 1200, { seenIds: ['seen'] }).id, 'fresh');
  assert.equal(selectItem([], 1200), null);
});

test('half-life grows with success and collapses with failure', () => {
  const wins = [good(1, T0), good(1, T0 + DAY), good(1, T0 + 2 * DAY)];
  const losses = [good(0, T0), good(0, T0 + DAY), good(0, T0 + 2 * DAY)];
  assert.ok(halfLifeHours(wins) > halfLifeHours([]));
  assert.ok(halfLifeHours(losses) < halfLifeHours([]));
  assert.ok(Math.abs(predictedRecall(0, 100) - 1) < 1e-9);
  assert.ok(Math.abs(predictedRecall(100, 100) - 0.5) < 1e-9);
});

test('a check is never offered within 24h of instruction', () => {
  const lastInstruction = new Date(T0).toISOString();
  const at = nextCheckAt([], { now: T0 + HOUR, lastInstructionAt: lastInstruction, minDelayMs: DAY });
  assert.ok(at >= T0 + DAY, 'the delay rule is what separates competence from recency');
});

test('review is never scheduled in the past', () => {
  const at = nextReviewAt([good(1, T0)], { now: T0 + 900 * DAY });
  assert.ok(at >= T0 + 900 * DAY, 'a backlog is due now, not receding');
});

// ── Scheduler contract ───────────────────────────────────────────────────────

test('the scheduler exposes the full contract and a version', () => {
  const s = activeScheduler();
  for (const m of ['estimate', 'schedule', 'difficultyBand', 'pickItem', 'rate']) {
    assert.equal(typeof s[m], 'function', `scheduler must implement ${m}()`);
  }
  assert.equal(typeof s.version, 'string');
  assert.ok(s.version.length, 'version stamps kc_estimate rows and triggers replay');
});

// ── Activity ladder ──────────────────────────────────────────────────────────

test('the ladder fades support as mastery rises', () => {
  assert.equal(activityFor(0), 'worked_example');
  assert.equal(activityFor(0.5), 'completion');
  assert.equal(activityFor(0.8), 'independent');
  assert.equal(activityFor(0.99), 'check');
});

// ── Policy ───────────────────────────────────────────────────────────────────

const kc = (over = {}) => ({ kcId: 'k1', working: 0.5, confirmed: 0, prereqs: [], ...over });

test('due checks outrank new material', () => {
  const r = nextAction({
    now: T0,
    kcs: [
      kc({ kcId: 'due', working: 0.8, nextCheckAt: new Date(T0 - HOUR).toISOString() }),
      kc({ kcId: 'new', working: 0 }),
    ],
  });
  assert.equal(r.action, 'check');
  assert.deepEqual(r.kcIds, ['due']);
});

test('a KC with unconfirmed prerequisites is not taught', () => {
  const r = nextAction({
    now: T0,
    kcs: [
      kc({ kcId: 'advanced', prereqs: ['basic'], working: 0 }),
      kc({ kcId: 'basic', confirmed: 0.2, working: 0.4 }),
    ],
  });
  assert.equal(r.action, 'study');
  assert.equal(r.kcId, 'basic', 'must teach the prerequisite first');
});

test('safety preempts everything', () => {
  const r = nextAction({ safetyFlag: true, kcs: [kc({ nextCheckAt: new Date(T0 - DAY).toISOString(), working: 0.9 })], now: T0 });
  assert.equal(r.action, 'safety_protocol');
});

test('the session ends rather than running forever', () => {
  const r = nextAction({ kcs: [kc()], now: T0, sessionMinutes: 60, maxSessionMinutes: 45 });
  assert.equal(r.action, 'end_session');
});

test('learner autonomy: an explicit eligible choice wins', () => {
  const r = nextAction({ now: T0, focusKcId: 'b', kcs: [kc({ kcId: 'a', working: 0.1 }), kc({ kcId: 'b', working: 0.6 })] });
  assert.equal(r.kcId, 'b');
});

test('hints always require a genuine attempt first', () => {
  const r = nextAction({ now: T0, kcs: [kc({ working: 0.5 })] });
  assert.equal(r.hintsAfterAttemptOnly, true);
});

test('gaming is detected and answered with a switch, never a lockout', () => {
  const spam = Array.from({ length: 6 }, () => ({ type: 'hint', latencyMs: 400, level: 'bottom' }));
  const g = detectGaming(spam);
  assert.equal(g.gaming, true);
  assert.equal(g.response, 'switch_to_worked_example');
  assert.notEqual(g.response, 'lockout');
  assert.equal(detectGaming([{ type: 'answer', correct: true, latencyMs: 9000 }]).gaming, false);
});

// ── Vocabulary ───────────────────────────────────────────────────────────────

test('topic normalization collapses the variants that currently fork records', () => {
  // "Mitosis" vs "mitosis" is the exact case that orphans a concept today:
  // intake dedupes case-insensitively, StudyView joins case-sensitively.
  assert.equal(normalizeTopic('Mitosis'), normalizeTopic('  mitosis '));
  assert.equal(normalizeTopic('Cell   Cycle!'), 'cell cycle');
  assert.equal(slugify('Chain Rule (calculus)'), 'chain-rule-calculus');
  assert.equal(normalizeTopic(null), '');
});
