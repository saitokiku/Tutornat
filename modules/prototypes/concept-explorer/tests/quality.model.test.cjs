// Quality repair cycle 1 — pure-model regressions, one block per reconciled finding.
// Each test was run red before the fix (evidence/quality-fix/01-model-red.log) and green
// after (evidence/quality-fix/02-model-green.log). Test names start with the finding ID.
const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('../model.js');

const K2 = { answer: 12, expr: '7 + 5' };
const G35 = { answer: 225, expr: '403 − 178' };
const G68 = { answer: 6, variable: 'x' };
const taskOf = (state, id) => state.tasks.find((t) => t.id === id);

// ---------------------------------------------------------------- QC-01 / QC-06

test('QC-01: scripted demo assistance is recorded separately from requested hints and is idempotent per script step', () => {
  assert.equal(typeof model.recordScriptedHint, 'function', 'BEHAVIOR MISSING: recordScriptedHint');
  assert.equal(typeof model.hintsRequested, 'function', 'BEHAVIOR MISSING: hintsRequested');
  let state = model.startWork(model.loadExample({ locale: 'en', band: '35' }));
  const scripted = { text: 'Good question. You can regroup.', scriptIndex: 2 };
  state = model.recordScriptedHint(state, scripted);
  state = model.recordScriptedHint(state, scripted); // Replay → Play again
  state = model.recordScriptedHint(state, scripted); // and again
  assert.equal(state.work.assistance.length, 1, 'replaying the same script step must not add assistance events');
  assert.deepEqual(state.work.assistance[0], { kind: 'scripted_hint', text: scripted.text, source: 'companion', provenance: 'scripted_demo', scriptIndex: 2 });
  assert.equal(model.hintsRequested(state), 0, 'a scripted demo hint is not a requested hint');
  state = model.requestHint(state, 'Try regrouping the tens first.');
  assert.equal(state.work.assistance.length, 2, 'one scripted event + one real request');
  assert.equal(model.hintsRequested(state), 1);
  assert.deepEqual(state.work.assistance[1], { kind: 'hint', text: 'Try regrouping the tens first.', source: 'companion', provenance: 'ai_hint' });
  const done = model.completeWork(state);
  assert.equal(done.ledger.math.hintsUsed, 1, 'the ledger counts actual requests, not total assistance events');
  assert.equal(taskOf(done, '35-math-regroup').assistance.length, 2, 'the task keeps both events with their provenance');
});

test('QC-06: completing an organized-only task records no instructional evidence or independent-check schedule', () => {
  let state = model.loadExample({ locale: 'en', band: '35' });
  state = model.selectTask(state, '35-science-habitat');
  state = model.completeWork(model.startWork(state));
  assert.equal(taskOf(state, '35-science-habitat').status, 'complete');
  assert.deepEqual(Object.keys(state.ledger), ['math', 'literacy'], 'organized-only subjects never enter the learning ledger');
  assert.equal(state.ledger.science, undefined);
  assert.equal(state.ledger.math.status, 'not_checked');
  assert.equal(state.ledger.literacy.status, 'not_checked');
});

// ---------------------------------------------------------------- QC-02

function acceptedPlan68() {
  let state = model.loadExample({ locale: 'en', band: '68' });
  state = model.correctExtractedTask(state, {});
  state = model.createDraftPlan(state, model.derivePlanItems(state));
  return model.acceptDraftPlan(state);
}

test('QC-02: an approved student proposal moves the shared date, its provenance and the confirmed extract together', () => {
  let state = acceptedPlan68();
  state = model.proposePlanChange(state, { taskId: '68-essay-claim', due: '2026-10-09', note: 'Need more time' });
  const approved = model.decideProposal(state, 0, 'approved');
  const task = taskOf(approved, '68-essay-claim');
  assert.equal(task.due, '2026-10-09');
  assert.equal(task.dueSource, 'student_proposal_approved');
  assert.deepEqual(task.dueHistory, [{ from: '2026-10-02', to: '2026-10-09', source: 'student_proposal_approved' }]);
  assert.equal(approved.extracted.due, '2026-10-09', 'the extract shows the current shared deadline');
  assert.equal(approved.extracted.dueSource, 'student_proposal_approved');
  assert.equal(approved.extracted.sampleDue, '2026-10-02', 'the original note date stays as a source, not rewritten');
  assert.equal(approved.proposals[0].status, 'approved_by_parent');
});

test('QC-02: an accepted plan whose date changed is marked stale with the old/new dates, not silently presented as current', () => {
  let state = acceptedPlan68();
  state = model.proposePlanChange(state, { taskId: '68-essay-claim', due: '2026-10-09' });
  const approved = model.decideProposal(state, 0, 'approved');
  assert.equal(approved.currentPlan.stale, true);
  assert.equal(approved.currentPlan.staleReason, 'due_changed');
  assert.equal(approved.currentPlan.staleFrom, '2026-10-02');
  assert.equal(approved.currentPlan.staleTo, '2026-10-09');
  assert.deepEqual(approved.currentPlan.items, state.currentPlan.items, 'historical items are kept, not rewritten');
  // Explicit re-draft path: a new draft derives from the new date and is not stale; accepting it replaces the stale plan.
  const redraft = model.createDraftPlan(approved, model.derivePlanItems(approved));
  assert.equal(redraft.draftPlan.stale, undefined);
  assert.equal(redraft.draftPlan.items[2].date, '2026-10-09');
  assert.equal(redraft.draftPlan.items[1].date, '2026-10-08');
  const reaccepted = model.acceptDraftPlan(redraft);
  assert.equal(reaccepted.currentPlan.stale, undefined);
  assert.equal(reaccepted.currentPlan.items[2].due, '2026-10-09');
});

test('QC-02: a pending draft whose date changed is marked stale; a declined proposal leaves plan, extract and task intact', () => {
  let state = model.loadExample({ locale: 'en', band: '68' });
  state = model.correctExtractedTask(state, {});
  state = model.createDraftPlan(state, model.derivePlanItems(state));
  state = model.proposePlanChange(state, { taskId: '68-essay-claim', due: '2026-10-09' });
  const approved = model.decideProposal(state, 0, 'approved');
  assert.equal(approved.draftPlan.status, 'pending_parent_review');
  assert.equal(approved.draftPlan.stale, true);
  const declined = model.decideProposal(state, 0, 'declined');
  assert.equal(taskOf(declined, '68-essay-claim').due, '2026-10-02');
  assert.equal(taskOf(declined, '68-essay-claim').dueSource, 'parent_confirmed');
  assert.equal(declined.extracted.due, '2026-10-02');
  assert.equal(declined.draftPlan.stale, undefined);
  assert.equal(declined.proposals[0].status, 'declined_by_parent');
});

// ---------------------------------------------------------------- QC-03

test('QC-03: confirming the extract after an approved proposal keeps the current shared deadline and its provenance', () => {
  let state = model.loadExample({ locale: 'en', band: '68' });
  state = model.proposePlanChange(state, { taskId: '68-essay-claim', due: '2026-10-09', note: 'Need more time' });
  state = model.decideProposal(state, 0, 'approved'); // before the note is even reviewed
  assert.equal(state.extracted.due, '2026-10-09');
  assert.equal(state.extracted.sampleDue, '2026-10-02');
  const confirmed = model.correctExtractedTask(state, {});
  const task = taskOf(confirmed, '68-essay-claim');
  assert.equal(task.due, '2026-10-09', 'Confirm as shown must not restore the sample date');
  assert.equal(task.dueSource, 'student_proposal_approved', 'confirming does not erase who moved the date');
  assert.equal(confirmed.extracted.status, 'confirmed_by_parent');
  assert.deepEqual(confirmed.extracted.corrections, []);
  assert.equal(confirmed.proposals[0].status, 'approved_by_parent');
});

test('QC-03: a later explicit correction records the actual shared before/after values; the approval stays historical', () => {
  let state = model.loadExample({ locale: 'en', band: '68' });
  state = model.proposePlanChange(state, { taskId: '68-essay-claim', due: '2026-10-09' });
  state = model.decideProposal(state, 0, 'approved');
  const fixed = model.correctExtractedTask(state, { due: '2026-10-12' });
  const task = taskOf(fixed, '68-essay-claim');
  assert.equal(task.due, '2026-10-12');
  assert.equal(task.dueSource, 'parent_corrected');
  assert.deepEqual(fixed.extracted.corrections, [{ field: 'due', from: '2026-10-09', to: '2026-10-12', by: 'parent' }]);
  assert.deepEqual(task.dueHistory, [
    { from: '2026-10-02', to: '2026-10-09', source: 'student_proposal_approved' },
    { from: '2026-10-09', to: '2026-10-12', source: 'parent_corrected' }
  ]);
  assert.equal(fixed.extracted.sampleDue, '2026-10-02');
  assert.equal(fixed.proposals[0].status, 'approved_by_parent', 'history is not rewritten');
  assert.equal(fixed.proposals[0].due, '2026-10-09', 'the proposal keeps the date it asked for; the UI marks it superseded');
});

// ---------------------------------------------------------------- QC-04

test('QC-04: proposals and decisions are validated instead of corrupting provenance', () => {
  let state = model.loadExample({ locale: 'en', band: '68' });
  assert.throws(() => model.proposePlanChange(state, { taskId: 'null', due: '2026-10-09' }), /Unknown task/);
  assert.throws(() => model.proposePlanChange(state, { taskId: '68-essay-claim', due: 'tomorrow' }), /Invalid proposed date/);
  assert.throws(() => model.proposePlanChange(state, { taskId: '68-essay-claim', due: '2026-02-30' }), /Invalid proposed date/);
  const complete = model.completeWork(model.startWork(state));
  assert.throws(() => model.proposePlanChange(complete, { taskId: '68-math-equation', due: '2026-10-09' }), /complete/);
  state = model.proposePlanChange(state, { taskId: '68-essay-claim', due: '2026-10-09' });
  assert.throws(() => model.decideProposal(state, 0, 'maybe'), /Unsupported decision/);
  assert.throws(() => model.decideProposal(state, 7, 'approved'), /Unknown proposal/);
  const approved = model.decideProposal(state, 0, 'approved');
  assert.throws(() => model.decideProposal(approved, 0, 'declined'), /already decided/);
  assert.equal(taskOf(approved, '68-essay-claim').due, '2026-10-09', 'state after the rejected re-decision is untouched');
});

// ---------------------------------------------------------------- QC-10

test('QC-10: whitespace between digits is never joined into a different number', () => {
  assert.equal(model.checkFinalAnswer('1 2', K2).result, 'unparsed');
  assert.equal(model.checkFinalAnswer('22 5', G35).result, 'unparsed');
  assert.equal(model.checkFinalAnswer('0225', G35).result, 'match', 'leading zeros are not mathematically wrong');
  // Supported forms are unchanged.
  assert.equal(model.checkFinalAnswer('7 + 5 = 12', K2).result, 'match');
  assert.equal(model.checkFinalAnswer(' 225 ', G35).result, 'match');
  assert.equal(model.checkFinalAnswer('403 - 178 = 225', G35).result, 'match');
  assert.equal(model.checkFinalAnswer('x = 6', G68).result, 'match');
  assert.equal(model.checkFinalAnswer('225 or 235', G35).result, 'ambiguous');
  assert.equal(model.checkFinalAnswer('6, 7', G68).result, 'ambiguous');
  assert.equal(model.checkFinalAnswer('13 − 8 = 5', G35).result, 'unparsed');
});
