// Quality repair cycle 2 — pure-model regressions for QC-11 / QC-02 (cross-task stale-plan
// invalidation and the model-level stale-acceptance guard). Each test was run red before its
// fix and green after; logs live in evidence/quality-fix-cycle2/. Test names start with the ID.
const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('../model.js');

const taskOf = (state, id) => state.tasks.find((t) => t.id === id);
const clone = (v) => JSON.parse(JSON.stringify(v));

// Band 6–8: the extracted essay (due 2026-10-02) confirmed and drafted; history is an unrelated task (due 2026-10-08).
function pendingEssayDraft() {
  let state = model.loadExample({ locale: 'en', band: '68' });
  state = model.correctExtractedTask(state, {});
  return model.createDraftPlan(state, model.derivePlanItems(state));
}
function acceptedEssayPlan() {
  return model.acceptDraftPlan(pendingEssayDraft());
}
function approve(state, taskId, due) {
  const next = model.proposePlanChange(state, { taskId, due });
  return model.decideProposal(next, next.proposals.length - 1, 'approved');
}

// ---------------------------------------------------------------- QC-11 (cross-task invalidation)

test('QC-11: approving an unrelated task after the essay moved keeps the ACCEPTED essay plan stale with its original dates', () => {
  let state = acceptedEssayPlan();
  const originalItems = clone(state.currentPlan.items);
  state = approve(state, '68-essay-claim', '2026-10-09');
  assert.equal(state.currentPlan.stale, true, 'precondition: essay move marks the accepted plan stale');
  const after = approve(state, '68-history-timeline', '2026-10-12');
  assert.equal(taskOf(after, '68-history-timeline').due, '2026-10-12');
  assert.equal(after.currentPlan.stale, true, 'the essay plan still disagrees with the essay deadline');
  assert.equal(after.currentPlan.staleReason, 'due_changed');
  assert.equal(after.currentPlan.staleFrom, '2026-10-02', 'original plan date is preserved');
  assert.equal(after.currentPlan.staleTo, '2026-10-09', 'staleTo names the still-mismatched essay deadline, not the history date');
  assert.deepEqual(after.currentPlan.items, originalItems, 'historical items are kept until an explicit re-draft/re-accept');
  assert.equal(after.draftPlan.status, 'accepted_by_parent');
  assert.equal(after.draftPlan.stale, true, 'the accepted draft record stays stale too');
});

test('QC-11: approving an unrelated task after the essay moved keeps the PENDING essay draft stale (Accept must stay unavailable)', () => {
  let state = pendingEssayDraft();
  state = approve(state, '68-essay-claim', '2026-10-09');
  assert.equal(state.draftPlan.stale, true, 'precondition: essay move marks the pending draft stale');
  const after = approve(state, '68-history-timeline', '2026-10-12');
  assert.equal(after.draftPlan.status, 'pending_parent_review');
  assert.equal(after.draftPlan.stale, true, 'the pending draft still disagrees with the essay deadline');
  assert.equal(after.draftPlan.staleFrom, '2026-10-02');
  assert.equal(after.draftPlan.staleTo, '2026-10-09');
  assert.equal(after.currentPlan, null, 'nothing was accepted');
});

// ---------------------------------------------------------------- QC-02 (model-level acceptance boundary)

test('QC-02: acceptDraftPlan rejects a stale pending draft without installing a plan, mutating input or discarding the prior accepted plan', () => {
  // Prior accepted plan (essay due 2026-10-02), then a fresh draft, then the essay moves: both are stale.
  let state = acceptedEssayPlan();
  const priorCurrent = clone(state.currentPlan);
  state = model.createDraftPlan(state, model.derivePlanItems(state));
  state = approve(state, '68-essay-claim', '2026-10-09');
  assert.equal(state.draftPlan.stale, true, 'precondition: draft is stale');
  const before = clone(state);
  assert.throws(() => model.acceptDraftPlan(state), /stale/i);
  assert.deepEqual(state, before, 'rejection does not mutate the input state');
  assert.deepEqual(state.currentPlan, { ...priorCurrent, stale: true, staleReason: 'due_changed', staleFrom: '2026-10-02', staleTo: '2026-10-09' }, 'prior accepted plan is kept (stale, historical), not replaced');
});

test('QC-02: acceptDraftPlan rejects a draft whose item dates conflict with the current shared deadline even when no stale flag was set', () => {
  // Legacy/unflagged shape: a pending draft built for 2026-10-02 while the task already says 2026-10-09.
  let state = pendingEssayDraft();
  state = approve(state, '68-essay-claim', '2026-10-09');
  const { stale, staleReason, staleFrom, staleTo, ...unflagged } = state.draftPlan;
  const probe = { ...state, draftPlan: unflagged };
  const before = clone(probe);
  assert.throws(() => model.acceptDraftPlan(probe), /stale|deadline/i);
  assert.deepEqual(probe, before);
  assert.equal(probe.currentPlan, null, 'no plan was installed');
});

test('QC-02: acceptDraftPlan still accepts a current (non-conflicting) draft and a legacy item shape without taskId', () => {
  const ok = model.acceptDraftPlan(pendingEssayDraft());
  assert.equal(ok.currentPlan.acceptedBy, 'parent');
  assert.equal(ok.draftPlan.status, 'accepted_by_parent');
  const legacy = model.createDraftPlan(model.loadExample({ band: '35' }), ['tonight', 'midway', 'due']);
  assert.deepEqual(model.acceptDraftPlan(legacy).currentPlan.items, ['tonight', 'midway', 'due']);
});

// ---------------------------------------------------------------- invariants around the two fixes

test('QC-11: repeated moves of the same task keep the original plan date as staleFrom and track the latest deadline as staleTo', () => {
  let state = acceptedEssayPlan();
  state = approve(state, '68-essay-claim', '2026-10-09');
  state = approve(state, '68-essay-claim', '2026-10-11');
  assert.equal(state.currentPlan.stale, true);
  assert.equal(state.currentPlan.staleFrom, '2026-10-02');
  assert.equal(state.currentPlan.staleTo, '2026-10-11');
});

test('QC-11: moving the essay back to the plan date clears staleness even after an unrelated task moved in between', () => {
  let state = acceptedEssayPlan();
  state = approve(state, '68-essay-claim', '2026-10-09');
  state = approve(state, '68-history-timeline', '2026-10-12');
  const restored = approve(state, '68-essay-claim', '2026-10-02');
  assert.equal(restored.currentPlan.stale, undefined);
  assert.equal(restored.currentPlan.staleFrom, undefined);
  assert.equal(restored.currentPlan.staleTo, undefined);
  assert.equal(restored.draftPlan.stale, undefined);
  assert.equal(taskOf(restored, '68-history-timeline').due, '2026-10-12', 'the unrelated move is untouched');
});

test('QC-11: declining or no-op confirming an unrelated task never changes the essay plan state', () => {
  let state = acceptedEssayPlan();
  state = approve(state, '68-essay-claim', '2026-10-09');
  const snapshot = clone(state.currentPlan);
  const proposed = model.proposePlanChange(state, { taskId: '68-history-timeline', due: '2026-10-12' });
  const declined = model.decideProposal(proposed, proposed.proposals.length - 1, 'declined');
  assert.deepEqual(declined.currentPlan, snapshot);
  const noop = model.applyDueChange(state, '68-history-timeline', '2026-10-08', 'parent_confirmed');
  assert.deepEqual(noop.currentPlan, snapshot);
  const fresh = acceptedEssayPlan();
  const unrelatedOnly = approve(fresh, '68-history-timeline', '2026-10-12');
  assert.equal(unrelatedOnly.currentPlan.stale, undefined, 'a plan that never depended on the moved task is not stale');
});

test('QC-11: a plan with two dependencies stays stale while only one of them is restored', () => {
  let state = acceptedEssayPlan();
  const mathItem = { key: 'due', taskId: '68-math-equation', due: '2026-10-01', date: '2026-10-01', source: 'ai_draft' };
  state = { ...state, currentPlan: { ...state.currentPlan, items: [...state.currentPlan.items, mathItem] } };
  state = approve(state, '68-essay-claim', '2026-10-09');
  state = approve(state, '68-math-equation', '2026-10-05');
  assert.equal(state.currentPlan.stale, true);
  const essayBack = approve(state, '68-essay-claim', '2026-10-02');
  assert.equal(essayBack.currentPlan.stale, true, 'math still mismatches');
  assert.equal(essayBack.currentPlan.staleFrom, '2026-10-01', 'staleFrom names the plan date of the still-mismatched dependency');
  assert.equal(essayBack.currentPlan.staleTo, '2026-10-05');
  const allBack = approve(essayBack, '68-math-equation', '2026-10-01');
  assert.equal(allBack.currentPlan.stale, undefined, 'cleared only once every dependency matches');
});

test('QC-11: a current plan and a newer draft with different dependency dates are judged independently', () => {
  let state = acceptedEssayPlan();                       // current plan says 2026-10-02
  state = approve(state, '68-essay-claim', '2026-10-09'); // current stale
  state = model.createDraftPlan(state, model.derivePlanItems(state)); // new draft says 2026-10-09
  assert.equal(state.draftPlan.stale, undefined);
  assert.equal(state.currentPlan.stale, true);
  const moved = approve(state, '68-history-timeline', '2026-10-12');
  assert.equal(moved.draftPlan.stale, undefined, 'the fresh draft is still current');
  assert.equal(moved.currentPlan.stale, true, 'the old plan is still stale');
  assert.equal(moved.currentPlan.staleFrom, '2026-10-02');
  assert.equal(moved.currentPlan.staleTo, '2026-10-09');
  const reaccepted = model.acceptDraftPlan(moved);
  assert.equal(reaccepted.currentPlan.stale, undefined);
  assert.equal(reaccepted.currentPlan.items[2].due, '2026-10-09');
});

test('QC-11: a declined draft stays declined and unflagged through related and unrelated moves', () => {
  let state = model.declineDraftPlan(pendingEssayDraft(), 'Not this week');
  state = approve(state, '68-essay-claim', '2026-10-09');
  state = approve(state, '68-history-timeline', '2026-10-12');
  assert.equal(state.draftPlan.status, 'declined_by_parent');
  assert.equal(state.draftPlan.parentNote, 'Not this week');
  assert.equal(state.draftPlan.stale, undefined);
  assert.throws(() => model.acceptDraftPlan(state), /stale/i, 'a declined draft built for the old date is also date-conflicting');
});
