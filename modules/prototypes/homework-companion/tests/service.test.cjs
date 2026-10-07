'use strict';
// Slice 3: the stateful demo service. Commands are async, return {ok,data}|{ok:false,error}, and are
// guarded against races: duplicate submits, late results after reset/archive/edit, cancellation, retry.
const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../domain.js');
const { createDemoService } = require('../demo-service.js');

const BEA = 'lrn-35-bea'; const CAL = 'lrn-68-cal';
const TASK = { title: 'Fractions page 12', subject: 'math', due: '2026-10-03', instructions: '' };
const TASK2 = { title: 'Read chapter 4', subject: 'reading', due: '2026-10-05', instructions: '' };
const fixedClock = () => '2026-10-01T14:00:00.000Z';

function make(opts) {
  // Virtual clock: timers fire in due-time order, so a 1800ms "delayed" op lands after a later 120ms one.
  const timers = []; let now = 0; let n = 0;
  const schedule = (fn, ms) => { timers.push({ fn, ms, due: now + ms, n: n++ }); };
  const svc = createDemoService({ clock: fixedClock, today: '2026-10-01', schedule, ...opts });
  const flush = async () => {
    while (timers.length) {
      timers.sort((a, b) => a.due - b.due || a.n - b.n);
      const t = timers.shift(); now = t.due; t.fn(); await Promise.resolve();
    }
    await Promise.resolve();
  };
  return { svc, timers, flush };
}

test('normal scenario: createTask resolves with an ok result and the task appears in a read query', async () => {
  const { svc, flush } = make();
  const p = svc.dispatch({ type: 'createTask', learnerId: BEA, input: TASK });
  await flush();
  const r = await p;
  assert.equal(r.ok, true);
  assert.equal(r.data.task.title, 'Fractions page 12');
  assert.deepEqual(svc.query.listTasks(BEA).map((t) => t.id), [r.data.task.id]);
});

test('validation errors come back as structured error results, not exceptions, with field errors', async () => {
  const { svc, flush } = make();
  const p = svc.dispatch({ type: 'createTask', learnerId: BEA, input: { ...TASK, title: '' } });
  await flush();
  const r = await p;
  assert.equal(r.ok, false);
  assert.equal(r.error.code, 'validation');
  assert.equal(r.error.errors.title, 'required');
  assert.equal(r.error.retryable, false);
});

test('duplicate submit with the same request key is suppressed while the first is pending', async () => {
  const { svc, flush } = make();
  const p1 = svc.dispatch({ type: 'createTask', learnerId: BEA, input: TASK, requestKey: 'form-1' });
  const p2 = svc.dispatch({ type: 'createTask', learnerId: BEA, input: TASK, requestKey: 'form-1' });
  await flush();
  const [r1, r2] = await Promise.all([p1, p2]);
  assert.equal(r1.ok, true);
  assert.equal(r2.ok, false);
  assert.equal(r2.error.code, 'duplicate');
  assert.equal(svc.query.listTasks(BEA).length, 1);
});

test('delayed scenario keeps the operation pending until the timer fires and reports pending state', async () => {
  const { svc, timers, flush } = make();
  svc.setScenario('delayed');
  let settled = false;
  const p = svc.dispatch({ type: 'createTask', learnerId: BEA, input: TASK }).then((r) => { settled = true; return r; });
  assert.equal(svc.pending().length, 1);
  assert.equal(settled, false);
  assert.ok(timers[0].ms >= 1000, 'delayed scenario waits noticeably');
  await flush();
  const r = await p;
  assert.equal(r.ok, true);
  assert.equal(svc.pending().length, 0);
});

test('fail-once scenario fails the first command with a retryable error, applies nothing, then succeeds on retry', async () => {
  const { svc, flush } = make();
  svc.setScenario('fail_once');
  let p = svc.dispatch({ type: 'createTask', learnerId: BEA, input: TASK });
  await flush();
  let r = await p;
  assert.equal(r.ok, false);
  assert.equal(r.error.code, 'service_failed');
  assert.equal(r.error.retryable, true);
  assert.equal(svc.query.listTasks(BEA).length, 0);
  p = svc.retry(r.operationId);
  await flush();
  r = await p;
  assert.equal(r.ok, true);
  assert.equal(svc.query.listTasks(BEA).length, 1);
});

test('unavailable scenario rejects every command with a non-retryable offline error and changes nothing', async () => {
  const { svc, flush } = make();
  svc.setScenario('unavailable');
  const p = svc.dispatch({ type: 'createTask', learnerId: BEA, input: TASK });
  await flush();
  const r = await p;
  assert.equal(r.ok, false);
  assert.equal(r.error.code, 'unavailable');
  assert.equal(svc.query.listTasks(BEA).length, 0);
});

test('cancel resolves the pending command as cancelled and its late timer applies nothing', async () => {
  const { svc, flush } = make();
  svc.setScenario('delayed');
  const p = svc.dispatch({ type: 'createTask', learnerId: BEA, input: TASK });
  const id = svc.pending()[0].id;
  svc.cancel(id);
  const r = await p;
  assert.equal(r.ok, false);
  assert.equal(r.error.code, 'cancelled');
  await flush();
  assert.equal(svc.query.listTasks(BEA).length, 0);
});

test('a late draft result cannot apply after the learner was reset, and reset does not touch another learner', async () => {
  const { svc, flush } = make();
  let p = svc.dispatch({ type: 'createTask', learnerId: BEA, input: TASK }); await flush(); await p;
  p = svc.dispatch({ type: 'createTask', learnerId: CAL, input: TASK2 }); await flush(); await p;
  svc.setScenario('delayed');
  const draft = svc.dispatch({ type: 'draftPlan', learnerId: BEA });
  p = svc.resetLearner(BEA);
  await flush();
  const r = await draft;
  assert.equal(r.ok, false);
  assert.equal(r.error.code, 'superseded');
  assert.equal(svc.query.plans(BEA).draft, null);
  assert.deepEqual(svc.query.listTasks(BEA), []);
  assert.equal(svc.query.listTasks(CAL).length, 1);
});

test('a pending draft is dropped when one of its dependency tasks is edited or archived before it lands', async () => {
  const { svc, flush } = make();
  let p = svc.dispatch({ type: 'createTask', learnerId: BEA, input: TASK }); await flush(); const a = (await p).data.task;
  p = svc.dispatch({ type: 'createTask', learnerId: BEA, input: TASK2 }); await flush(); const b = (await p).data.task;
  svc.setScenario('delayed');
  const draft = svc.dispatch({ type: 'draftPlan', learnerId: BEA });
  svc.setScenario('normal');
  p = svc.dispatch({ type: 'editTask', learnerId: BEA, taskId: b.id, changes: { due: '2026-10-06' } });
  await flush();
  assert.equal((await p).ok, true);
  const r = await draft;
  assert.equal(r.ok, false);
  assert.equal(r.error.code, 'superseded');
  assert.equal(svc.query.plans(BEA).draft, null);
  assert.equal(svc.query.listTasks(BEA).find((t) => t.id === a.id).due, '2026-10-03');
});

test('a late edit result cannot overwrite a newer edit of the same task (version guard)', async () => {
  const { svc, flush } = make();
  let p = svc.dispatch({ type: 'createTask', learnerId: BEA, input: TASK }); await flush(); const a = (await p).data.task;
  svc.setScenario('delayed');
  const slow = svc.dispatch({ type: 'editTask', learnerId: BEA, taskId: a.id, changes: { title: 'Slow title' } });
  svc.setScenario('normal');
  p = svc.dispatch({ type: 'editTask', learnerId: BEA, taskId: a.id, changes: { title: 'Fast title' } });
  await flush();
  assert.equal((await p).ok, true);
  const r = await slow;
  assert.equal(r.ok, false);
  assert.equal(r.error.code, 'superseded');
  assert.equal(svc.query.listTasks(BEA)[0].title, 'Fast title');
});

test('acceptDraft failure keeps the previously accepted plan and reports the stale conflict', async () => {
  const { svc, flush } = make();
  let p = svc.dispatch({ type: 'createTask', learnerId: BEA, input: TASK }); await flush(); const a = (await p).data.task;
  p = svc.dispatch({ type: 'draftPlan', learnerId: BEA }); await flush(); await p;
  p = svc.dispatch({ type: 'acceptDraft', learnerId: BEA }); await flush(); assert.equal((await p).ok, true);
  const first = svc.query.plans(BEA).current;
  p = svc.dispatch({ type: 'draftPlan', learnerId: BEA }); await flush(); await p;
  p = svc.dispatch({ type: 'editTask', learnerId: BEA, taskId: a.id, changes: { due: '2026-10-04' } }); await flush(); await p;
  p = svc.dispatch({ type: 'acceptDraft', learnerId: BEA }); await flush();
  const r = await p;
  assert.equal(r.ok, false);
  assert.equal(r.error.code, 'stale');
  assert.equal(r.error.errors.conflicts.length, 1);
  assert.equal(svc.query.plans(BEA).current.id, first.id);
});

test('subscribers are notified once per applied change with the operation descriptor', async () => {
  const { svc, flush } = make();
  const seen = [];
  svc.subscribe((ev) => seen.push(ev.type));
  const p = svc.dispatch({ type: 'createTask', learnerId: BEA, input: TASK }); await flush(); await p;
  assert.deepEqual(seen.filter((x) => x === 'applied').length, 1);
});
