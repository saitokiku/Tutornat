const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('../model.js');

test('locale validation accepts English and Spanish', () => {
  assert.equal(typeof model.validateLocale, 'function', 'BEHAVIOR MISSING: validateLocale');
  assert.equal(model.validateLocale('en'), 'en');
  assert.equal(model.validateLocale('es'), 'es');
});

test('band validation accepts K–2, grades 3–5, and grades 6–8', () => {
  assert.equal(typeof model.validateBand, 'function', 'BEHAVIOR MISSING: validateBand');
  assert.equal(model.validateBand('K2'), 'K2');
  assert.equal(model.validateBand('35'), '35');
  assert.equal(model.validateBand('68'), '68');
});

test('invalid locale and band selections are rejected', () => {
  assert.equal(typeof model.createSettings, 'function', 'BEHAVIOR MISSING: createSettings validation');
  assert.throws(() => model.createSettings({ locale: 'fr', band: '35' }), /Unsupported locale/);
  assert.throws(() => model.createSettings({ locale: 'en', band: '912' }), /Unsupported band/);
});

test('marking work complete never records independent mastery', () => {
  assert.equal(typeof model.createInitialState, 'function', 'BEHAVIOR MISSING: createInitialState');
  assert.equal(typeof model.completeWork, 'function', 'BEHAVIOR MISSING: completeWork');
  const next = model.completeWork(model.createInitialState());
  assert.equal(next.work.status, 'complete');
  assert.equal(next.ledger.math.status, 'needs_independent_check');
  assert.equal(next.ledger.math.evidence, 'assisted_work');
});

test('parent observations retain attribution and are not verified mastery', () => {
  assert.equal(typeof model.addParentObservation, 'function', 'BEHAVIOR MISSING: parent observation provenance');
  const next = model.addParentObservation(model.createInitialState(), 'Explained the strategy at dinner.');
  assert.deepEqual(next.observations[0], {
    text: 'Explained the strategy at dinner.',
    source: 'parent',
    verification: 'observation_unverified'
  });
  assert.equal(next.ledger.math.status, 'not_checked');
});

test('AI draft plan becomes current only after explicit acceptance', () => {
  assert.equal(typeof model.createDraftPlan, 'function', 'BEHAVIOR MISSING: createDraftPlan');
  assert.equal(typeof model.acceptDraftPlan, 'function', 'BEHAVIOR MISSING: acceptDraftPlan');
  const drafted = model.createDraftPlan(model.createInitialState(), ['Read feedback', 'Try one problem']);
  assert.equal(drafted.currentPlan, null);
  assert.equal(drafted.draftPlan.status, 'pending_parent_review');
  const accepted = model.acceptDraftPlan(drafted);
  assert.deepEqual(accepted.currentPlan.items, ['Read feedback', 'Try one problem']);
  assert.equal(accepted.draftPlan.status, 'accepted_by_parent');
});

test('declining an AI draft plan leaves the current plan untouched', () => {
  assert.equal(typeof model.declineDraftPlan, 'function', 'BEHAVIOR MISSING: declineDraftPlan');
  const drafted = model.createDraftPlan(model.createInitialState(), ['Read feedback', 'Try one problem']);
  const declined = model.declineDraftPlan(drafted, 'Too much for a school night');
  assert.equal(declined.currentPlan, null);
  assert.equal(declined.draftPlan.status, 'declined_by_parent');
  assert.equal(declined.draftPlan.parentNote, 'Too much for a school night');
});

test('a companion hint is recorded as AI assistance and survives completion', () => {
  assert.equal(typeof model.requestHint, 'function', 'BEHAVIOR MISSING: requestHint');
  const started = model.startWork(model.createInitialState());
  assert.equal(started.work.status, 'in_progress');
  const hinted = model.requestHint(started, 'Try regrouping the tens first.');
  assert.deepEqual(hinted.work.assistance, [
    { kind: 'hint', text: 'Try regrouping the tens first.', source: 'companion', provenance: 'ai_hint' }
  ]);
  const done = model.completeWork(hinted);
  assert.equal(done.ledger.math.hintsUsed, 1);
  assert.equal(done.ledger.math.status, 'needs_independent_check');
  assert.deepEqual(done.ledger.math.plannedChecks.map((c) => c.status), ['planned', 'planned']);
});

test('a parent correction of an extracted task is recorded with provenance', () => {
  assert.equal(typeof model.loadExample, 'function', 'BEHAVIOR MISSING: loadExample');
  assert.equal(typeof model.correctExtractedTask, 'function', 'BEHAVIOR MISSING: correctExtractedTask');
  const state = model.loadExample({ locale: 'en', band: '35' });
  assert.equal(state.extracted.source, 'parent_entered_sample');
  assert.equal(state.extracted.status, 'needs_parent_review');
  const fixed = model.correctExtractedTask(state, { due: '2026-10-09' });
  assert.equal(fixed.extracted.due, '2026-10-09');
  assert.equal(fixed.extracted.status, 'confirmed_by_parent');
  assert.deepEqual(fixed.extracted.corrections, [{ field: 'due', from: '2026-10-02', to: '2026-10-09', by: 'parent' }]);
});

test('reset restores the synthetic example for the same settings', () => {
  assert.equal(typeof model.resetExample, 'function', 'BEHAVIOR MISSING: resetExample');
  let state = model.loadExample({ locale: 'es', band: 'K2' });
  state = model.completeWork(model.requestHint(model.startWork(state), 'pista'));
  state = model.addParentObservation(state, 'Contó con los dedos.');
  state = model.acceptDraftPlan(model.createDraftPlan(state, ['uno']));
  const reset = model.resetExample(state);
  assert.deepEqual(reset, model.loadExample({ locale: 'es', band: 'K2' }));
  assert.equal(reset.observations.length, 0);
  assert.equal(reset.ledger.math.status, 'not_checked');
});

test('selecting the literacy task keeps math and literacy evidence separate', () => {
  assert.equal(typeof model.selectTask, 'function', 'BEHAVIOR MISSING: selectTask');
  let state = model.loadExample({ locale: 'en', band: '35' });
  state = model.completeWork(model.startWork(state));
  assert.equal(state.tasks.find((t) => t.id === '35-math-regroup').status, 'complete');
  assert.equal(state.ledger.math.status, 'needs_independent_check');
  state = model.selectTask(state, '35-read-summary');
  assert.equal(state.focusTaskId, '35-read-summary');
  assert.equal(state.work.status, 'not_started');
  state = model.completeWork(model.requestHint(model.startWork(state), 'Start with who and what changed.'));
  assert.equal(state.ledger.literacy.status, 'needs_independent_check');
  assert.equal(state.ledger.literacy.hintsUsed, 1);
  assert.equal(state.ledger.math.hintsUsed, 0, 'math evidence must not change when literacy work completes');
  assert.equal(model.nextTask(state), null === state ? null : state.tasks.find((t) => t.id === '35-science-habitat'));
});

test('a student plan proposal is visible to the parent and changes nothing until approved', () => {
  assert.equal(typeof model.proposePlanChange, 'function', 'BEHAVIOR MISSING: proposePlanChange');
  assert.equal(typeof model.decideProposal, 'function', 'BEHAVIOR MISSING: decideProposal');
  let state = model.loadExample({ locale: 'en', band: '68' });
  state = model.proposePlanChange(state, { taskId: '68-history-timeline', due: '2026-10-09', note: 'Game on Thursday' });
  assert.equal(state.proposals.length, 1);
  assert.equal(state.proposals[0].status, 'pending_parent');
  assert.equal(state.proposals[0].visibleTo, 'parent');
  assert.equal(state.tasks.find((t) => t.id === '68-history-timeline').due, '2026-10-08');
  const approved = model.decideProposal(state, 0, 'approved');
  assert.equal(approved.tasks.find((t) => t.id === '68-history-timeline').due, '2026-10-09');
  assert.equal(approved.proposals[0].status, 'approved_by_parent');
  const declined = model.decideProposal(state, 0, 'declined');
  assert.equal(declined.tasks.find((t) => t.id === '68-history-timeline').due, '2026-10-08');
  assert.equal(declined.proposals[0].status, 'declined_by_parent');
});
