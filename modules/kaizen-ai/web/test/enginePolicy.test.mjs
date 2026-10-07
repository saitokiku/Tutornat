// Policy config, placement, the hint ladder, and the cost governor.
// Spec §4.1 F-1/F-3/F-4, §5.3, §6.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_POLICY, resolvePolicy, independentShare, creditForItem, POLICY_VERSION,
} from '@/lib/engine/config.js';
import {
  nextPlacementItem, applyPlacementResponse, placementComplete, frontierFor, placementEvidence,
  PLACEMENT_MIN_ITEMS, PLACEMENT_MAX_ITEMS,
} from '@/lib/engine/placement.js';
import {
  hintState, applyAttemptEvent, attemptEvidence, isIndependentBlock,
} from '@/lib/engine/hints.js';
import { canSpend, costOf, deterministicRate, BUDGET } from '@/lib/engine/budget.js';
import { isConfirming, MIN_DELAY_MS, CONFIRM_THRESHOLD, activityFor } from '@/lib/engine/types.js';
import fs from 'node:fs';
import {
  anchorGap, predictionGap, calibrationByKc, shouldServeAnchor,
} from '@/lib/engine/calibration.js';

// ── §5.3 every threshold is a parameter ──────────────────────────────────────

test('policy config is frozen — shared policy cannot be mutated at runtime', () => {
  // Two learners share this object. A mutation would silently redefine what
  // mastery means for everyone.
  assert.throws(() => { DEFAULT_POLICY.mastery.threshold = 0.5; }, TypeError);
  assert.throws(() => { DEFAULT_POLICY.bands.acquisition.lo = 0; }, TypeError);
  assert.equal(DEFAULT_POLICY.mastery.threshold, 0.95);
});

test('types.js derives from config rather than duplicating it', () => {
  // Two copies of a number is how an A/B arm silently fails to apply.
  assert.equal(MIN_DELAY_MS, DEFAULT_POLICY.mastery.minDelayMs);
  assert.equal(CONFIRM_THRESHOLD, DEFAULT_POLICY.mastery.threshold);
});

test('spec §4.1 F-5: the retention check is 48h, not 24h', () => {
  // A check the next morning still rides yesterday's session.
  assert.equal(MIN_DELAY_MS, 48 * 60 * 60 * 1000);
});

test('an experiment arm gets its own policy version so estimates recompute', () => {
  const arm = resolvePolicy({ ladder: { completionBelow: 0.6 } });
  assert.equal(arm.ladder.completionBelow, 0.6);
  assert.notEqual(arm.version, POLICY_VERSION, 'an arm must be distinguishable from control');
  assert.equal(DEFAULT_POLICY.ladder.completionBelow, 0.70, 'control is untouched');
  // Unknown keys are ignored rather than silently creating phantom parameters.
  const junk = resolvePolicy({ nonsense: { x: 1 }, mastery: { notAParam: 9 } });
  assert.equal(junk.mastery.notAParam, undefined);
});

test('the ladder honours an experiment arm', () => {
  const arm = resolvePolicy({ ladder: { workedExampleBelow: 0.5 } });
  assert.equal(activityFor(0.4), 'completion', 'control');
  assert.equal(activityFor(0.4, arm), 'worked_example', 'arm shifts the rung');
});

// ── §4.1 F-1 placement ───────────────────────────────────────────────────────

const item = (id, elo) => ({ id, difficulty_elo: elo });

test('placement picks the most informative item, near a coin flip', () => {
  const pool = [item('easy', 800), item('mid', 1200), item('hard', 1900)];
  assert.equal(nextPlacementItem(pool, { learnerElo: 1200 }).id, 'mid');
  assert.equal(nextPlacementItem(pool, { learnerElo: 1900 }).id, 'hard');
  // Never repeats an item within a run.
  assert.equal(nextPlacementItem(pool, { learnerElo: 1200, servedIds: ['mid'] }).id !== 'mid', true);
  assert.equal(nextPlacementItem([], { learnerElo: 1200 }), null);
});

test('placement converges and is bounded', () => {
  let state = { learnerElo: 1200, count: 0 };
  assert.equal(placementComplete(state), false);

  // A learner answering consistently should finish inside the max.
  for (let i = 0; i < PLACEMENT_MAX_ITEMS; i++) {
    state = applyPlacementResponse(state, { itemElo: 1200, correct: i % 2 === 0 });
  }
  assert.equal(placementComplete(state), true, 'must terminate by the item cap');
  assert.ok(state.count >= PLACEMENT_MIN_ITEMS);
});

test('placement never confirms mastery — it says where to start, nothing more', () => {
  const rows = placementEvidence('u1', [
    { kcId: 'k1', correct: true, itemId: 'i1', runId: 'r1' },
    { kcId: 'k2', correct: false, itemId: 'i2', runId: 'r1' },
  ]);
  assert.equal(rows.length, 2);
  for (const r of rows) {
    assert.equal(r.kind, 'placement');
    assert.equal(r.assisted, true, 'a 12-item adaptive run is a guess, not a demonstration');
    assert.equal(isConfirming({ kind: r.kind, assisted: r.assisted, verified_by: r.verifiedBy }), false);
  }
});

test('the frontier starts BELOW the measured level, by design', () => {
  // Competence experience before challenge: a first session that feels hard is
  // how you lose a learner who is already behind and already expects to fail.
  const kcs = [
    { id: 'a', depth: 0, difficulty_elo: 900 },
    { id: 'b', depth: 1, difficulty_elo: 1100 },
    { id: 'c', depth: 2, difficulty_elo: 1500 },
  ];
  const f = frontierFor(kcs, 1500);
  assert.ok(['a', 'b'].includes(f.id), `expected an easier KC than the learner's level, got ${f.id}`);
  assert.equal(frontierFor([], 1200), null);
});

test('placement is by level, never by age or grade', () => {
  // Guard against the single most common way edtech fails the behind learner.
  const src = ['placement.js', 'policy.js', 'config.js'];
  // The modules must not branch on age/grade at all.
  for (const m of src) {
    const txt = fs.readFileSync(new URL(`../lib/engine/${m}`, import.meta.url), 'utf8');
    const code = txt.split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n');
    assert.ok(!/\bgradeLevel\b|\bage\s*[<>=]/.test(code), `${m} must not sequence on age or grade`);
  }
});

// ── §4.1 F-3 the hint ladder ─────────────────────────────────────────────────

test('a hint is never available before a real attempt', () => {
  const s = hintState({ attempts: 0, hints_used: 0 });
  assert.equal(s.hintsAvailable, false);
  assert.equal(s.reason, 'attempt_required');
  assert.equal(hintState({ attempts: 1 }).hintsAvailable, true);
});

test('hints cost mastery credit; a bottom-out solution earns none', () => {
  assert.equal(creditForItem({ hintsUsed: 0 }), 1);
  assert.ok(creditForItem({ hintsUsed: 1 }) < 1);
  assert.ok(creditForItem({ hintsUsed: 2 }) < creditForItem({ hintsUsed: 1 }));
  assert.equal(creditForItem({ bottomedOut: true }), 0);
  assert.ok(creditForItem({ hintsUsed: 99 }) >= 0, 'credit floors at zero, never negative');
});

test('the answer is NOT withheld forever — attempts exhausted offers the solution', () => {
  const after3 = hintState({ attempts: 3, hints_used: 2 });
  assert.equal(after3.nextHint, 'solution');
  assert.equal(after3.reason, 'attempts_exhausted');
});

test('needing help schedules an isomorph — that is where credit comes from', () => {
  const now = Date.parse('2026-07-25T12:00:00Z');
  let a = applyAttemptEvent({}, { type: 'attempt', correct: false }, DEFAULT_POLICY, { now });
  a = applyAttemptEvent(a, { type: 'hint' }, DEFAULT_POLICY, { now });
  a = applyAttemptEvent(a, { type: 'attempt', correct: true }, DEFAULT_POLICY, { now });

  assert.equal(a.solved, true);
  assert.ok(a.credit < 1, 'solved with help earns partial credit');
  assert.ok(a.isomorphDueAt, 'an assisted resolution must schedule the unassisted retry');

  // Solved cleanly on the first try: full credit, no isomorph needed.
  const clean = applyAttemptEvent({}, { type: 'attempt', correct: true }, DEFAULT_POLICY, { now });
  assert.equal(clean.credit, 1);
  assert.equal(clean.isomorphDueAt, null);
});

test('giving up is recorded without penalty framing, and still schedules retrieval', () => {
  const now = Date.now();
  let a = applyAttemptEvent({}, { type: 'attempt', correct: false }, DEFAULT_POLICY, { now });
  a = applyAttemptEvent(a, { type: 'give_up' }, DEFAULT_POLICY, { now });
  assert.equal(a.bottomedOut, true);
  assert.equal(a.gaveUp, true);
  assert.equal(a.credit, 0);
  assert.ok(a.isomorphDueAt, 'failure -> feedback -> spaced retrieval IS the learning event');
});

// ── §4.1 F-4 independent blocks ──────────────────────────────────────────────

test('an independent block has no hints at all — that is what makes it unassisted', () => {
  const s = hintState({ attempts: 2, hints_used: 0 }, DEFAULT_POLICY, { independentBlock: true });
  assert.equal(s.hintsAvailable, false);
  assert.equal(s.canRequestSolution, false);
  assert.equal(s.reason, 'independent_block');
});

test('the independent share rises with demonstrated independence, and is capped', () => {
  const none = independentShare(0);
  const some = independentShare(0.5);
  const most = independentShare(1);
  assert.ok(none < some && some < most, 'the system must visibly recede as they grow');
  assert.ok(most <= DEFAULT_POLICY.independent.maxShare);
  assert.ok(none >= DEFAULT_POLICY.independent.baseShare);
});

test('independent items are spread through the session, not clumped at the end', () => {
  // Clumping at the end would confound independence with fatigue.
  const flags = Array.from({ length: 12 }, (_, i) => isIndependentBlock(i, 0.5));
  const idx = flags.map((f, i) => (f ? i : -1)).filter((i) => i >= 0);
  assert.ok(idx.length >= 2, 'expected several independent items');
  assert.ok(idx[0] < 6, 'the first independent item should come early, not at the end');
});

test('evidence from an assisted item can never confirm, even when answered correctly', () => {
  const withHelp = attemptEvidence(
    { solved: true, hintsUsed: 1, credit: 0.65 },
    { kcId: 'k1', itemId: 'i1', independentBlock: false }
  );
  assert.equal(withHelp.assisted, true);
  assert.equal(isConfirming({ kind: withHelp.kind, assisted: withHelp.assisted, verified_by: withHelp.verifiedBy }), false);

  const alone = attemptEvidence(
    { solved: true, hintsUsed: 0, credit: 1 },
    { kcId: 'k1', itemId: 'i2', independentBlock: true }
  );
  assert.equal(alone.assisted, false, 'hint-free during an independent block is genuinely unassisted');
});

// ── §6 the cost governor ─────────────────────────────────────────────────────

test('spending is CHECKED, not merely recorded', () => {
  const ok = canSpend({ plan: 'student', spendUsd: 1, frontierCalls: 0 });
  assert.equal(ok.ok, true);

  const over = canSpend({ plan: 'student', spendUsd: 999, frontierCalls: 0 });
  assert.equal(over.ok, false);
  assert.equal(over.reason, 'monthly_budget');
  assert.ok(over.message.length > 0, 'the learner needs an honest explanation');
  // The message must promise what remains true: the deterministic engine works.
  assert.match(over.message, /check|practice/i);
});

test('C1: frontier calls are capped separately and downgrade rather than fail', () => {
  const capped = canSpend({ plan: 'free', spendUsd: 0, frontierCalls: 999, tier: 'deep' });
  assert.equal(capped.ok, false);
  assert.equal(capped.reason, 'frontier_calls');
  assert.equal(capped.downgradeTo, 'tutor', 'silently use the cheaper model, do not break the lesson');
  // The same call on a cheap tier is fine.
  assert.equal(canSpend({ plan: 'free', spendUsd: 0, frontierCalls: 999, tier: 'tutor' }).ok, true);
});

test('paid plans get more budget than free, and internal is effectively unlimited', () => {
  assert.ok(BUDGET.monthlyUsd.student > BUDGET.monthlyUsd.free);
  assert.ok(BUDGET.monthlyUsd.internal > 100);
});

test('cost uses REPORTED tokens when available — the old estimator missed PDFs', () => {
  const rates = { in: 3, out: 15 };
  const measured = costOf({
    usage: { input_tokens: 1000, output_tokens: 500, cache_read_input_tokens: 9000 },
    rates,
  });
  assert.equal(measured.measured, true);
  assert.equal(measured.cached, true);
  // Cache reads are ~10% of input price, so 9k cached + 1k fresh must cost far
  // less than 10k fresh would.
  const allFresh = costOf({ usage: { input_tokens: 10000, output_tokens: 500 }, rates });
  assert.ok(measured.usd < allFresh.usd, 'caching must actually reduce recorded cost');

  const estimated = costOf({ rates, inputText: 'x'.repeat(4000), outputText: 'y'.repeat(400) });
  assert.equal(estimated.measured, false, 'estimates are flagged as estimates');
  assert.ok(estimated.usd > 0);
});

test('C2: the deterministic rate is measurable against its target', () => {
  const good = deterministicRate({ totalExchanges: 100, llmCalls: 3 });
  assert.equal(good.ok, true);
  const bad = deterministicRate({ totalExchanges: 100, llmCalls: 40 });
  assert.equal(bad.ok, false);
  assert.equal(deterministicRate({ totalExchanges: 0 }), null, 'no data is not a passing grade');
});

// ── §5.5 / §10 calibration — the aligned-test-mirage detector ────────────────

test('anchor gap catches the failure that killed the ITS literature', () => {
  // Mastery meters at 95%, independent items at 30%. This is the shape of a
  // product sold on numbers that are not real, and it must trip an alarm.
  const mirage = Array.from({ length: 10 }, (_, i) => ({
    correct: i < 3, confirmed_at_time: 0.95, kc_id: 'k1',
  }));
  const g = anchorGap(mirage);
  assert.equal(g.available, true);
  assert.equal(g.overclaiming, true);
  assert.ok(g.gap > 0.5, `expected a large overclaim, got ${g.gap}`);
  assert.match(g.verdict, /ahead of independent evidence/i);
});

test('an honest engine does NOT trip the alarm', () => {
  const honest = Array.from({ length: 10 }, (_, i) => ({
    correct: i < 9, confirmed_at_time: 0.95, kc_id: 'k1',
  }));
  const g = anchorGap(honest);
  assert.equal(g.overclaiming, false);
  assert.equal(g.alarm, false);
});

test('underclaiming is reported but never alarms', () => {
  const under = Array.from({ length: 10 }, () => ({ correct: true, confirmed_at_time: 0.4, kc_id: 'k1' }));
  const g = anchorGap(under);
  assert.equal(g.alarm, false, 'doing better than we credit is not a defect');
  assert.match(g.verdict, /underclaim/i);
});

test('too little anchor data reports "not available", never a passing grade', () => {
  const thin = [{ correct: true, confirmed_at_time: 0.95, kc_id: 'k1' }];
  const g = anchorGap(thin);
  assert.equal(g.available, false);
  assert.equal(g.alarm, undefined, 'absence of evidence must not read as evidence of calibration');
});

test('prediction gap measures calibration and stays task-level in its copy', () => {
  const overconfident = Array.from({ length: 8 }, () => ({ predicted_correct: true, outcome: 0 }));
  const p = predictionGap(overconfident);
  assert.equal(p.available, true);
  assert.equal(p.gap, 1);
  assert.equal(p.overconfidenceRate, 1);
  // Never a character judgement.
  assert.ok(!/you are overconfident|you're overconfident/i.test(p.message));
  assert.match(p.message, /harder than they looked/i);

  const wellCalibrated = [
    { predicted_correct: true, outcome: 1 },
    { predicted_correct: false, outcome: 0 },
    { predicted_correct: true, outcome: 1 },
  ];
  assert.ok(predictionGap(wellCalibrated).gap < 0.25);
  assert.equal(predictionGap([]).available, false);
});

test('anchors are rare, and only measure a claim we have actually made', () => {
  // Measuring a KC we have not yet confirmed tells us nothing.
  assert.equal(shouldServeAnchor({ confirmed: 0.5, itemsSinceAnchor: 99 }), false);
  // Confirmed and spaced out: serve one.
  assert.equal(shouldServeAnchor({ confirmed: 0.96, anchorsSeenForKc: 0, itemsSinceAnchor: 10 }), true);
  // Not back-to-back, and not endlessly per KC.
  assert.equal(shouldServeAnchor({ confirmed: 0.96, anchorsSeenForKc: 0, itemsSinceAnchor: 1 }), false);
  assert.equal(shouldServeAnchor({ confirmed: 0.96, anchorsSeenForKc: 5, itemsSinceAnchor: 99 }), false);
});

test('per-KC calibration ranks the worst overclaim first — the list you act on', () => {
  const rows = [
    ...Array.from({ length: 6 }, () => ({ kc_id: 'fine', correct: true, confirmed_at_time: 0.9 })),
    ...Array.from({ length: 6 }, () => ({ kc_id: 'mirage', correct: false, confirmed_at_time: 0.95 })),
  ];
  const ranked = calibrationByKc(rows);
  assert.equal(ranked[0].kcId, 'mirage');
  assert.equal(ranked[0].overclaiming, true);
});
