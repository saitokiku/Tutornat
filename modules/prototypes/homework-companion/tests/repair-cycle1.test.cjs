'use strict';
// Repair cycle 1 regressions (new file; original test assertions are untouched). Fresh stores, fixed clock, injected timers.
const test = require('node:test'); const assert = require('node:assert/strict');
const D = require('../domain.js'); const C = require('../copy.js'); const { createDemoService } = require('../demo-service.js');
const B = 'lrn-35-bea', CAL = 'lrn-68-cal', AT = '2026-10-01T14:00:00.000Z', opt = { at: AT, today: '2026-10-01' };
const input = (title = 'Task A', due = '2026-10-06') => ({ title, due, subject: 'math', instructions: 'Write your own work.' });
function svc() { let timers = [], now = 0, seq = 0; const service = createDemoService({ clock: () => AT, today: opt.today, schedule: (fn, ms) => timers.push({ fn, time: now + ms, seq: ++seq }) });
  const flush = async () => { while (timers.length) { timers.sort((a, b) => a.time - b.time || a.seq - b.seq); const t = timers.shift(); now = t.time; t.fn(); await Promise.resolve(); } };
  const next = async () => { timers.sort((a, b) => a.time - b.time || a.seq - b.seq); const t = timers.shift(); now = t.time; t.fn(); await Promise.resolve(); };
  const issue = async (c) => { const p = service.dispatch(c); await flush(); return p; }; return { service, flush, next, issue }; }

test('R05 archived task rejects every mutating work command and keeps prior sessions/events; restore keeps history', () => {
  let s = D.createStore(); s = D.loadSample(s, B, opt).store; const task = D.listTasks(s, B)[0];
  s = D.startTask(s, task.id, opt).store; s = D.addStep(s, task.id, 'kept step', opt).store; s = D.requestHelp(s, task.id, 'hint', opt).store;
  s = D.archiveTask(s, task.id, opt).store; const before = { session: D.getSession(s, task.id), events: s.events.length };
  for (const [name, fn] of [['addStep', () => D.addStep(s, task.id, 'x', opt)], ['requestHelp', () => D.requestHelp(s, task.id, 'hint', opt)], ['checkAnswer', () => D.checkAnswer(s, task.id, '225', opt)], ['flagStuck', () => D.flagStuck(s, task.id, opt)], ['markComplete', () => D.markComplete(s, task.id, opt)], ['startTask', () => D.startTask(s, task.id, opt)], ['editTask', () => D.editTask(s, task.id, { title: 'x' }, opt)]]) {
    assert.throws(fn, (e) => e.code === 'conflict', name + ' must reject an archived task');
  }
  assert.equal(s.tasks[task.id].status, 'archived'); assert.deepEqual(D.getSession(s, task.id), before.session); assert.equal(s.events.length, before.events);
  s = D.restoreTask(s, task.id, opt).store; assert.equal(s.tasks[task.id].status, 'open'); assert.equal(D.getSession(s, task.id).steps[0].text, 'kept step'); assert.equal(D.countScriptedHelp(D.getSession(s, task.id)), 1);
  s = D.addStep(s, task.id, 'after restore', opt).store; assert.equal(D.getSession(s, task.id).steps.length, 2);
});

test('R06 decision binds the reviewed draft: a replacement draft is never accepted/declined by an old response', async () => {
  let s = D.createStore(); s = D.createTask(s, B, input(), opt).store; const a = D.draftPlan(s, B, opt); s = a.store; const b = D.draftPlan(s, B, opt); s = b.store;
  assert.throws(() => D.acceptDraft(s, B, { ...opt, expectedPlanId: a.plan.id }), (e) => e.code === 'replaced' && e.errors.reviewed === a.plan.id && e.errors.current === b.plan.id);
  assert.throws(() => D.declineDraft(s, B, { ...opt, expectedPlanId: a.plan.id }), (e) => e.code === 'replaced');
  assert.equal(D.getPlans(s, B).current, null); assert.equal(D.getPlans(s, B).draft.id, b.plan.id);
  // synchronous direct calls without an expected id still decide the current draft (original public behaviour)
  assert.equal(D.acceptDraft(s, B, opt).plan.id, b.plan.id);
  // service: a delayed accept dispatched for A (legacy call without planId) loses to a replacement B; previous accepted plan and history survive
  const { service, issue, next, flush } = svc(); await issue({ type: 'createTask', learnerId: B, input: input() });
  const first = await issue({ type: 'draftPlan', learnerId: B }); await issue({ type: 'acceptDraft', learnerId: B });
  const second = await issue({ type: 'draftPlan', learnerId: B }); service.setScenario('delayed');
  const accept = service.dispatch({ type: 'acceptDraft', learnerId: B }); service.setScenario('normal');
  const p3 = service.dispatch({ type: 'draftPlan', learnerId: B }); await next(); const third = await p3; await flush(); const res = await accept;
  assert.equal(res.ok, false); assert.equal(res.error.code, 'replaced'); assert.equal(res.command.planId, second.data.plan.id);
  const plans = service.query.plans(B); assert.equal(plans.current.id, first.data.plan.id); assert.equal(plans.draft.id, third.data.plan.id); assert.equal(plans.history.length, 1);
});

test('R07 content edits detach the obsolete sample key/help; due-only edits keep it; prior records stay immutable and identifiable', () => {
  let s = D.createStore(); s = D.loadSample(s, B, opt).store; const math = D.listTasks(s, B)[0];
  s = D.startTask(s, math.id, opt).store; s = D.requestHelp(s, math.id, 'hint', opt).store; s = D.checkAnswer(s, math.id, '225', opt).store;
  const prior = D.getSession(s, math.id);
  assert.equal(prior.assistance[1].sampleKey, 'math-arrays'); assert.equal(prior.assistance[1].sampleVersion, 1); assert.equal(prior.assistance[1].index, 0); assert.equal(prior.checks[0].sampleKey, 'math-arrays');
  const dueOnly = D.editTask(s, math.id, { due: '2026-10-09' }, opt); assert.equal(dueOnly.task.sample, 'math-arrays'); assert.equal(D.checkAnswer(dueOnly.store, math.id, '225', opt).check.verdict, 'match');
  s = D.editTask(s, math.id, { title: 'Two plus two', instructions: 'What is 2 + 2?' }, opt).store; const edited = s.tasks[math.id];
  assert.equal(edited.sample, null); assert.deepEqual(edited.sampleDetached.key, 'math-arrays'); assert.deepEqual([...edited.sampleDetached.changed], ['title', 'instructions']); assert.equal(edited.origin, 'sample');
  assert.equal(D.checkAnswer(s, math.id, '225', opt).check.verdict, 'unsupported'); assert.equal(D.checkAnswer(s, math.id, '4', opt).check.verdict, 'unsupported');
  s = D.requestHelp(s, math.id, 'hint', opt).store; const after = D.getSession(s, math.id);
  assert.deepEqual(after.assistance.slice(0, 2), prior.assistance); assert.deepEqual(after.checks, prior.checks);
  assert.equal(after.assistance[2].available, false); assert.equal(after.assistance.length, 3);
  const ev = s.events.find((e) => e.source === 'task_change' && e.type === 'edited' && e.detail.sampleDetached); assert.equal(ev.detail.sampleDetached, 'math-arrays');
  assert.doesNotThrow(() => D.editTask(s, math.id, { subject: 'reading' }, opt), 'subject edit on a detached task is still a normal edit');
});

test('R08 proposal whose task due moved is stale at the domain boundary; archived proposal is unavailable, not declined; restore does not apply it', () => {
  let s = D.createStore(); s = D.createTask(s, CAL, input('Cal task'), opt).store; const task = D.listTasks(s, CAL)[0];
  const p = D.proposeChange(s, CAL, { taskId: task.id, due: '2026-10-09', reason: 'Original date request' }, opt); s = p.store;
  assert.equal(D.proposalState(s, p.proposal.id).status, 'pending');
  const moved = D.editTask(s, task.id, { due: '2026-10-12' }, opt).store;
  assert.throws(() => D.decideProposal(moved, p.proposal.id, 'accept', opt), (e) => e.code === 'stale' && e.errors.fromDue === '2026-10-06' && e.errors.currentDue === '2026-10-12');
  assert.equal(moved.tasks[task.id].due, '2026-10-12'); assert.equal(moved.proposals[p.proposal.id].status, 'pending'); assert.deepEqual(D.proposalState(moved, p.proposal.id), { status: 'stale', stale: true, unavailable: false, currentDue: '2026-10-12' });
  const declined = D.decideProposal(moved, p.proposal.id, 'decline', opt); assert.equal(declined.proposal.status, 'declined'); assert.equal(declined.proposal.fromDue, '2026-10-06');
  const archived = D.archiveTask(s, task.id, opt).store; assert.equal(D.proposalState(archived, p.proposal.id).status, 'unavailable'); assert.equal(archived.proposals[p.proposal.id].status, 'pending');
  assert.throws(() => D.decideProposal(archived, p.proposal.id, 'accept', opt), (e) => e.code === 'conflict');
  const restored = D.restoreTask(archived, task.id, opt).store; assert.equal(restored.tasks[task.id].due, '2026-10-06'); assert.equal(D.proposalState(restored, p.proposal.id).status, 'pending');
});

test('R08 service: delayed accept loses to a parent due edit (superseded) and the newer date is kept', async () => {
  const { service, issue, flush } = svc(); await issue({ type: 'createTask', learnerId: CAL, input: input('Cal task') }); const task = service.query.listTasks(CAL)[0];
  const prop = await issue({ type: 'proposeChange', learnerId: CAL, input: { taskId: task.id, due: '2026-10-09', reason: 'r' } });
  service.setScenario('delayed'); const accept = service.dispatch({ type: 'decideProposal', proposalId: prop.data.proposal.id, decision: 'accept' }); service.setScenario('normal');
  await issue({ type: 'editTask', taskId: task.id, changes: { due: '2026-10-12' } }); await flush(); const res = await accept;
  assert.equal(res.ok, false); assert.equal(res.error.code, 'superseded'); assert.equal(service.query.task(task.id).due, '2026-10-12'); assert.equal(service.query.proposalState(prop.data.proposal.id).status, 'stale');
});

test('R12/R14 copy: ES renderings exist for every generated sample field at the same version; counts are plural-aware; no missing keys', () => {
  assert.deepEqual(C.missingKeys(), []);
  for (const key of Object.keys(D.SAMPLES)) { const sm = D.SAMPLES[key]; const es = C.sampleText('es', key, sm); assert.notEqual(es.title, sm.title, key + ' title'); assert.notEqual(es.instructions, sm.instructions); assert.equal(es.hints.length, sm.hints.length); assert.equal(es.scaffold.length, sm.scaffold.length); assert.notEqual(es.voice, sm.voice); assert.equal(es.version, sm.version); assert.equal(C.sampleText('en', key, sm), sm); }
  assert.ok(Array.isArray(D.SAMPLES['reading-retell'].story) && D.SAMPLES['reading-retell'].story.length === 3); assert.equal(C.sampleText('es', 'reading-retell', D.SAMPLES['reading-retell']).story.length, 3);
  assert.equal(C.sampleText('es', 'math-arrays', { ...D.SAMPLES['math-arrays'], version: 2 }).title, D.SAMPLES['math-arrays'].title);
  assert.deepEqual([0, 1, 2].map((n) => C.tn('en', 'student_remaining', n)), ['0 open tasks', '1 open task', '2 open tasks']);
  assert.deepEqual([0, 1, 2].map((n) => C.tn('es', 'help_req', n)), ['0 pedidos de ayuda', '1 pedido de ayuda', '2 pedidos de ayuda']);
  assert.deepEqual([1, 2].map((n) => C.tn('en', 'form_errors', n)), ['Please fix 1 field:', 'Please fix 2 fields:']);
});
