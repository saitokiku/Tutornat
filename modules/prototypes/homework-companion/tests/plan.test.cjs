'use strict';
// Slice 2: plans, drafts, proposals, staleness and Today derivations. Pure domain, injected clock.
const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../domain.js');

const AT = '2026-10-01T14:00:00.000Z';
const TODAY = '2026-10-01';
const BEA = 'lrn-35-bea'; const CAL = 'lrn-68-cal';

function seed(learner = BEA) {
  let store = D.createStore();
  let r = D.createTask(store, learner, { title: 'Fractions page 12', subject: 'math', due: '2026-10-03', instructions: '' }, { at: AT });
  store = r.store; const a = r.task;
  r = D.createTask(store, learner, { title: 'Read chapter 4', subject: 'reading', due: '2026-10-05', instructions: '' }, { at: AT });
  return { store: r.store, a, b: r.task };
}

test('schedule is derived from open tasks only, grouped by due date', () => {
  const { store, a, b } = seed();
  const s2 = D.archiveTask(store, b.id, { at: AT }).store;
  const sched = D.schedule(s2, BEA, { today: TODAY });
  assert.deepEqual(sched.map((g) => [g.date, g.tasks.map((t) => t.id)]), [['2026-10-03', [a.id]]]);
});

test('draftPlan is a deterministic mock: one work day per open task on or before its due date, carrying task due provenance', () => {
  const { store, a, b } = seed();
  const { store: s2, plan } = D.draftPlan(store, BEA, { at: AT, today: TODAY });
  assert.equal(plan.status, 'draft');
  assert.equal(plan.provenance, 'mock_draft');
  assert.deepEqual(plan.items.map((i) => i.taskId), [a.id, b.id]);
  assert.deepEqual(plan.items.map((i) => i.due), ['2026-10-03', '2026-10-05']);
  plan.items.forEach((i) => assert.ok(i.day >= TODAY && i.day <= i.due, `${i.day} within [${TODAY}, ${i.due}]`));
  assert.deepEqual(D.draftPlan(store, BEA, { at: AT, today: TODAY }).plan.items, plan.items);
  assert.equal(D.getPlans(s2, BEA).draft.id, plan.id);
  assert.equal(D.getPlans(s2, BEA).current, null);
  assert.throws(() => D.draftPlan(D.createStore(), BEA, { at: AT, today: TODAY }), (e) => e.code === 'no_tasks');
});

test('acceptDraft is an explicit boundary: declined drafts cannot be accepted even by calling the domain directly', () => {
  const { store } = seed();
  let s = D.draftPlan(store, BEA, { at: AT, today: TODAY }).store;
  s = D.declineDraft(s, BEA, { at: AT }).store;
  assert.equal(D.getPlans(s, BEA).draft.status, 'declined');
  assert.throws(() => D.acceptDraft(s, BEA, { at: AT }), (e) => e.code === 'declined');
  assert.equal(D.getPlans(s, BEA).current, null);
});

test('acceptDraft refuses when ANY dependency date changed after drafting, and the prior accepted plan survives', () => {
  const { store, a, b } = seed();
  let s = D.draftPlan(store, BEA, { at: AT, today: TODAY }).store;
  s = D.acceptDraft(s, BEA, { at: AT }).store;
  const first = D.getPlans(s, BEA).current;
  assert.equal(first.status, 'accepted');
  assert.equal(D.planConflicts(s, first).length, 0);
  s = D.draftPlan(s, BEA, { at: AT, today: TODAY }).store;
  s = D.editTask(s, b.id, { due: '2026-10-06' }, { at: AT }).store; // unrelated to a, but a dependency of the draft
  assert.throws(() => D.acceptDraft(s, BEA, { at: AT }), (e) => e.code === 'stale');
  assert.equal(D.getPlans(s, BEA).current.id, first.id, 'prior accepted plan retained');
  const conflicts = D.planConflicts(s, D.getPlans(s, BEA).draft);
  assert.deepEqual(conflicts.map((c) => [c.taskId, c.reason, c.from, c.to]), [[b.id, 'due_changed', '2026-10-05', '2026-10-06']]);
  assert.equal(D.planConflicts(s, D.getPlans(s, BEA).current).length, 1, 'accepted plan is stale too');
});

test('staleness is per dependency: editing task B does not clear task A conflict; archiving is a conflict as well', () => {
  const { store, a, b } = seed();
  let s = D.draftPlan(store, BEA, { at: AT, today: TODAY }).store;
  s = D.acceptDraft(s, BEA, { at: AT }).store;
  s = D.editTask(s, a.id, { due: '2026-10-04' }, { at: AT }).store;
  s = D.editTask(s, b.id, { title: 'Read chapter 4 and 5' }, { at: AT }).store;
  let c = D.planConflicts(s, D.getPlans(s, BEA).current);
  assert.deepEqual(c.map((x) => x.taskId), [a.id]);
  s = D.archiveTask(s, b.id, { at: AT }).store;
  c = D.planConflicts(s, D.getPlans(s, BEA).current);
  assert.deepEqual(c.map((x) => [x.taskId, x.reason]), [[a.id, 'due_changed'], [b.id, 'archived']]);
  s = D.editTask(s, a.id, { due: '2026-10-03' }, { at: AT }).store;
  c = D.planConflicts(s, D.getPlans(s, BEA).current);
  assert.deepEqual(c.map((x) => x.taskId), [b.id], 'moving A back clears only A');
});

test('re-draft after staleness and accept replaces the current plan; history keeps every decision', () => {
  const { store, a } = seed();
  let s = D.draftPlan(store, BEA, { at: AT, today: TODAY }).store;
  s = D.acceptDraft(s, BEA, { at: AT }).store;
  const first = D.getPlans(s, BEA).current;
  s = D.editTask(s, a.id, { due: '2026-10-04' }, { at: AT }).store;
  s = D.draftPlan(s, BEA, { at: AT, today: TODAY }).store;
  s = D.acceptDraft(s, BEA, { at: '2026-10-01T15:00:00.000Z' }).store;
  const second = D.getPlans(s, BEA).current;
  assert.notEqual(second.id, first.id);
  assert.equal(D.planConflicts(s, second).length, 0);
  assert.deepEqual(D.getPlans(s, BEA).history.map((h) => h.status), ['accepted', 'superseded', 'accepted']);
});

test('only grade 6–8 learners can propose; proposals validate task, date and reason, and keep the reason verbatim', () => {
  const bea = seed(BEA);
  assert.throws(() => D.proposeChange(bea.store, BEA, { taskId: bea.a.id, due: '2026-10-04', reason: 'Game night' }, { at: AT }), (e) => e.code === 'not_allowed');
  const cal = seed(CAL);
  assert.throws(() => D.proposeChange(cal.store, CAL, { taskId: cal.a.id, due: '2026-13-04', reason: 'x' }, { at: AT }), (e) => e.code === 'validation' && e.errors.due === 'invalid_date');
  assert.throws(() => D.proposeChange(cal.store, CAL, { taskId: cal.a.id, due: '2026-10-04', reason: '  ' }, { at: AT }), (e) => e.code === 'validation' && e.errors.reason === 'required');
  const { store, proposal } = D.proposeChange(cal.store, CAL, { taskId: cal.a.id, due: '2026-10-04', reason: ' Robotics club runs late <i>Thursday</i> ' }, { at: AT });
  assert.equal(proposal.status, 'pending');
  assert.equal(proposal.fromDue, '2026-10-03');
  assert.equal(proposal.toDue, '2026-10-04');
  assert.equal(proposal.reason, 'Robotics club runs late <i>Thursday</i>');
  assert.equal(proposal.author, 'student');
  assert.deepEqual(D.listProposals(store, CAL).map((p) => p.id), [proposal.id]);
});

test('parent decision applies an accepted proposal to the task date, never re-decides, and declining leaves the task alone', () => {
  const cal = seed(CAL);
  let r = D.proposeChange(cal.store, CAL, { taskId: cal.a.id, due: '2026-10-04', reason: 'Club' }, { at: AT });
  let s = D.decideProposal(r.store, r.proposal.id, 'accept', { at: AT }).store;
  assert.equal(s.tasks[cal.a.id].due, '2026-10-04');
  assert.equal(D.listProposals(s, CAL)[0].status, 'accepted');
  assert.throws(() => D.decideProposal(s, r.proposal.id, 'decline', { at: AT }), (e) => e.code === 'already_decided');
  r = D.proposeChange(s, CAL, { taskId: cal.b.id, due: '2026-10-07', reason: 'Trip' }, { at: AT });
  s = D.decideProposal(r.store, r.proposal.id, 'decline', { at: AT }).store;
  assert.equal(s.tasks[cal.b.id].due, '2026-10-05');
  assert.equal(D.listProposals(s, CAL).find((p) => p.id === r.proposal.id).status, 'declined');
});

test('accepting a proposal for an archived task is a conflict and changes nothing', () => {
  const cal = seed(CAL);
  const r = D.proposeChange(cal.store, CAL, { taskId: cal.a.id, due: '2026-10-04', reason: 'Club' }, { at: AT });
  const s = D.archiveTask(r.store, cal.a.id, { at: AT }).store;
  assert.throws(() => D.decideProposal(s, r.proposal.id, 'accept', { at: AT }), (e) => e.code === 'conflict');
  assert.equal(D.listProposals(s, CAL)[0].status, 'pending');
});

test('todayForParent derives help flags, pending decisions and next actions from real records', () => {
  const cal = seed(CAL);
  let s = D.startTask(cal.store, cal.a.id, { at: AT }).store;
  s = D.requestHelp(s, cal.a.id, 'hint', { at: AT }).store; // custom task → unavailable help = parent flag
  s = D.flagStuck(s, cal.a.id, { at: AT }).store;
  s = D.proposeChange(s, CAL, { taskId: cal.b.id, due: '2026-10-07', reason: 'Trip' }, { at: AT }).store;
  s = D.draftPlan(s, CAL, { at: AT, today: TODAY }).store;
  const t = D.todayForParent(s, CAL, { today: TODAY });
  assert.deepEqual(t.helpFlags.map((f) => [f.taskId, f.kind]), [[cal.a.id, 'stuck'], [cal.a.id, 'help_unavailable']]);
  assert.deepEqual(t.pendingDecisions.map((d) => d.kind), ['draft_plan', 'proposal']);
  assert.deepEqual(t.nextActions.map((n) => n.taskId), [cal.a.id, cal.b.id]);
  assert.equal(t.planConflicts.length, 0);
});

test('todayForStudent gives exactly one next task plus current plan items; done tasks are skipped', () => {
  const { store, a, b } = seed();
  let s = D.draftPlan(store, BEA, { at: AT, today: TODAY }).store;
  s = D.acceptDraft(s, BEA, { at: AT }).store;
  let t = D.todayForStudent(s, BEA, { today: TODAY });
  assert.equal(t.nextTask.id, a.id);
  assert.equal(t.plan.items.length, 2);
  s = D.startTask(s, a.id, { at: AT }).store;
  s = D.markComplete(s, a.id, { at: AT }).store;
  t = D.todayForStudent(s, BEA, { today: TODAY });
  assert.equal(t.nextTask.id, b.id);
  s = D.startTask(s, b.id, { at: AT }).store;
  s = D.markComplete(s, b.id, { at: AT }).store;
  assert.equal(D.todayForStudent(s, BEA, { today: TODAY }).nextTask, null);
});

test('resetLearner removes only that learner records and leaves the other learner intact', () => {
  const bea = seed(BEA);
  let s = bea.store;
  const cal = D.createTask(s, CAL, { title: 'Essay outline', subject: 'writing', due: '2026-10-08', instructions: '' }, { at: AT });
  s = cal.store;
  s = D.draftPlan(s, BEA, { at: AT, today: TODAY }).store;
  s = D.addObservation(s, bea.a.id, 'note', { at: AT }).store;
  s = D.resetLearner(s, BEA, { at: AT }).store;
  assert.deepEqual(D.listTasks(s, BEA, { status: 'all' }), []);
  assert.equal(D.getPlans(s, BEA).draft, null);
  assert.deepEqual(D.listObservations(s, bea.a.id), []);
  assert.equal(D.recordForLearner(s, BEA).length, 0);
  assert.deepEqual(D.listTasks(s, CAL).map((t) => t.id), [cal.task.id]);
});
