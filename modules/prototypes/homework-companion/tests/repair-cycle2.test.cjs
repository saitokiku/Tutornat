'use strict';
// Repair cycle 2 — F2-01 service retry identity/lifecycle (R03/AC04), F2-04 domain provenance, F2-05..07 copy.
// Deterministic manual scheduler (no real timers). Original cycle-0/1 test files are untouched.
const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../domain.js');
const C = require('../copy.js');
const { createDemoService } = require('../demo-service.js');
const BEA = 'lrn-35-bea', CAL = 'lrn-68-cal';
const TASK = { title: 'Fractions sheet', subject: 'math', due: '2026-10-05', instructions: 'Do 1-10' };
function mk() { const q = []; let n = 0; const svc = createDemoService({ clock: () => `2026-10-01T12:00:${String(n++ % 60).padStart(2, '0')}.000Z`, today: '2026-10-01', schedule: (fn) => { q.push(fn); } }); svc.flush = () => { while (q.length) q.shift()(); }; return svc; }
const go = async (svc, cmd) => { const p = svc.dispatch(cmd); svc.flush(); return p; };
const mkTask = async (svc, learner, title) => (await go(svc, { type: 'createTask', learnerId: learner, input: { ...TASK, title: title || TASK.title } })).data.task;
const steps = (svc, id) => svc.query.session(id).steps.map((s) => s.text);

test('F2-01 retry of a failed createTask after a learner reset is superseded and resurrects nothing', async () => {
  const svc = mk(); svc.setScenario('fail_once');
  const f = await go(svc, { type: 'createTask', learnerId: BEA, input: TASK, requestKey: 'create:bea' });
  assert.equal(f.error.code, 'service_failed');
  await svc.resetLearner(BEA);
  const p = svc.retry(f.operationId); svc.flush(); const r = await p;
  assert.equal(r.ok, false); assert.equal(r.error.code, 'superseded'); assert.equal(r.error.retryable, false);
  assert.deepEqual(svc.query.listTasks(BEA, { status: 'all' }), []);
});

test('F2-01 retry of a failed addStep after the task was edited keeps the ORIGINAL dependency snapshot and is superseded', async () => {
  const svc = mk(); const t = await mkTask(svc, BEA); await go(svc, { type: 'startTask', taskId: t.id }); svc.setScenario('fail_once');
  const f = await go(svc, { type: 'addStep', taskId: t.id, text: 'first', requestKey: 'k1' });
  assert.equal(f.error.code, 'service_failed');
  assert.equal((await go(svc, { type: 'editTask', taskId: t.id, changes: { title: 'Renamed' } })).ok, true);
  const p = svc.retry(f.operationId); svc.flush(); const r = await p;
  assert.equal(r.ok, false); assert.equal(r.error.code, 'superseded');
  assert.deepEqual(steps(svc, t.id), []);
});

test('F2-01 retry of an already-applied operation is refused without mutation', async () => {
  const svc = mk(); const t = await mkTask(svc, BEA); await go(svc, { type: 'startTask', taskId: t.id });
  const ok = await go(svc, { type: 'addStep', taskId: t.id, text: 'once', requestKey: 'k1' });
  assert.equal(ok.ok, true);
  const p = svc.retry(ok.operationId); svc.flush(); const r = await p;
  assert.equal(r.ok, false); assert.equal(r.error.code, 'not_retryable'); assert.equal(r.error.retryable, false);
  assert.deepEqual(steps(svc, t.id), ['once']);
  assert.ok(C.DICT.en.e_not_retryable && C.DICT.es.e_not_retryable, 'new error code needs EN/ES copy');
});

test('F2-01 concurrent duplicate retries of one failed createTask create exactly one task', async () => {
  const svc = mk(); svc.setScenario('fail_once');
  const f = await go(svc, { type: 'createTask', learnerId: BEA, input: TASK, requestKey: 'create:bea' });
  const p1 = svc.retry(f.operationId); const p2 = svc.retry(f.operationId); svc.flush();
  const [r1, r2] = await Promise.all([p1, p2]);
  assert.equal(r1.ok, true); assert.equal(r2.ok, false); assert.equal(r2.error.code, 'duplicate');
  assert.equal(svc.query.listTasks(BEA).length, 1);
});

test('F2-01 retrying the original failed id after a descendant retry succeeded applies nothing (create and addStep)', async () => {
  const svc = mk(); svc.setScenario('fail_once');
  const f = await go(svc, { type: 'createTask', learnerId: BEA, input: TASK, requestKey: 'create:bea' });
  let p = svc.retry(f.operationId); svc.flush(); const r1 = await p; assert.equal(r1.ok, true);
  p = svc.retry(f.operationId); svc.flush(); const r2 = await p;
  assert.equal(r2.ok, false); assert.equal(r2.error.code, 'not_retryable');
  p = svc.retry(r1.operationId); svc.flush(); const r3 = await p;
  assert.equal(r3.ok, false); assert.equal(r3.error.code, 'not_retryable');
  assert.equal(svc.query.listTasks(BEA).length, 1);
  const t = svc.query.listTasks(BEA)[0]; await go(svc, { type: 'startTask', taskId: t.id }); svc.setScenario('fail_once');
  const fs = await go(svc, { type: 'addStep', taskId: t.id, text: 'step', requestKey: 'k1' }); assert.equal(fs.error.code, 'service_failed');
  p = svc.retry(fs.operationId); svc.flush(); assert.equal((await p).ok, true);
  p = svc.retry(fs.operationId); svc.flush(); const r4 = await p; assert.equal(r4.error.code, 'not_retryable');
  assert.deepEqual(steps(svc, t.id), ['step']);
  // an intentionally separate later dispatch with identical text is still allowed
  assert.equal((await go(svc, { type: 'addStep', taskId: t.id, text: 'step', requestKey: 'k1' })).ok, true);
  assert.deepEqual(steps(svc, t.id), ['step', 'step']);
});

test('F2-01 protected contracts: cancel→retry applies once; fail-once→retry succeeds', async () => {
  const svc = mk(); const t = await mkTask(svc, BEA); await go(svc, { type: 'startTask', taskId: t.id }); svc.setScenario('delayed');
  const p = svc.dispatch({ type: 'addStep', taskId: t.id, text: 'cancel me', requestKey: 'k1' }); svc.cancel(svc.pending()[0].id); svc.flush(); const r = await p;
  assert.equal(r.error.code, 'cancelled');
  const q = svc.retry(r.operationId); svc.flush(); const rr = await q; assert.equal(rr.ok, true);
  assert.deepEqual(steps(svc, t.id), ['cancel me']);
  const q2 = svc.retry(r.operationId); svc.flush(); assert.equal((await q2).error.code, 'not_retryable');
  assert.deepEqual(steps(svc, t.id), ['cancel me']);
});

test('F2-01 a fail-once attempt whose learner was reset while pending reports superseded (not retryable), never a live retry', async () => {
  const svc = mk(); svc.setScenario('fail_once');
  const p = svc.dispatch({ type: 'createTask', learnerId: BEA, input: TASK, requestKey: 'create:bea' });
  await svc.resetLearner(BEA); svc.flush(); const r = await p;
  assert.equal(r.ok, false); assert.equal(r.error.code, 'superseded'); assert.equal(r.error.retryable, false);
  const q = svc.retry(r.operationId); svc.flush(); const rr = await q; assert.equal(rr.ok, false); assert.notEqual(rr.error.code, undefined);
  assert.deepEqual(svc.query.listTasks(BEA, { status: 'all' }), []);
  // other learners are unaffected
  assert.equal((await go(svc, { type: 'createTask', learnerId: CAL, input: TASK })).ok, true);
});

test('F2-04 generated per-field provenance survives an instructions-only edit (capability detaches, title stays generated) and never marks authored text', () => {
  let s = D.createStore();
  s = D.loadSample(s, BEA, { at: '2026-10-01T12:00:00.000Z', today: '2026-10-01' }).store;
  const m = Object.values(s.tasks).find((t) => t.sample === 'math-arrays');
  assert.deepEqual(m.generated, { title: { key: 'math-arrays', version: 1 }, instructions: { key: 'math-arrays', version: 1 } });
  const r = D.editTask(s, m.id, { instructions: 'Family wrote these' }, { at: '2026-10-01T12:01:00.000Z' });
  assert.equal(r.task.sample, null); assert.equal(r.task.sampleDetached.key, 'math-arrays');
  assert.deepEqual(r.task.generated, { title: { key: 'math-arrays', version: 1 } });
  assert.equal(r.task.title, D.SAMPLES['math-arrays'].title);
  const r2 = D.editTask(r.store, m.id, { title: 'Family title' }, { at: '2026-10-01T12:02:00.000Z' });
  assert.equal(r2.task.generated, null);
  // a family task deliberately equal to a canonical sample string carries no generated provenance
  const c = D.createTask(s, BEA, { title: D.SAMPLES['math-arrays'].title, subject: 'math', due: '2026-10-05', instructions: C.SAMPLE_ES['math-arrays'].instructions }, { at: '2026-10-01T12:03:00.000Z' });
  assert.equal(c.task.generated, undefined);
  // due-only edit keeps capability and both generated fields
  const d = D.editTask(s, m.id, { due: '2026-10-09' }, { at: '2026-10-01T12:04:00.000Z' });
  assert.equal(d.task.sample, 'math-arrays'); assert.deepEqual(Object.keys(d.task.generated), ['title', 'instructions']);
  assert.deepEqual(s.events.concat().length + 1, d.store.events.length);
});

test('F2-05 student Record disclosure is band-aware: 3–5 omits date proposals, 6–8 includes them, K–2 wording kept', () => {
  for (const lc of ['en', 'es']) {
    const p35 = C.t(lc, 'rec_student_p_35'), p68 = C.t(lc, 'rec_student_p'), k2 = C.t(lc, 'rec_k2_p');
    const propWord = lc === 'en' ? /proposal/i : /propuesta/i;
    assert.ok(!propWord.test(p35), lc + ' 3-5 must not promise proposals: ' + p35);
    assert.ok(propWord.test(p68), lc + ' 6-8 keeps proposals');
    assert.ok(/(step|paso)/i.test(p35) && /(help|ayuda)/i.test(p35) && /(check|verific)/i.test(p35) && /(stuck|atascad)/i.test(p35) && /(done|hecha)/i.test(p35) && /(observation|observacion)/i.test(p35), p35);
    assert.ok(/(grown-up|adulto)/i.test(k2));
  }
});

test('F2-06 parent Workspace shared-record label is parent-facing in EN/ES and distinct from the student disclosure heading', () => {
  assert.equal(C.t('en', 'ws_shared_record_h'), 'Shared record for this task');
  assert.equal(C.t('es', 'ws_shared_record_h'), 'Registro compartido de esta tarea');
  assert.notEqual(C.t('en', 'ws_shared_record_h'), C.t('en', 'rec_student_h'));
});

test('F2-07 tally save text is singular/plural aware in EN/ES', () => {
  assert.deepEqual([0, 1, 2].map((n) => C.tn('en', 'ws_tally_text', n)), ['Tally: 0 marks', 'Tally: 1 mark', 'Tally: 2 marks']);
  assert.deepEqual([0, 1, 2].map((n) => C.tn('es', 'ws_tally_text', n)), ['Conteo: 0 marcas', 'Conteo: 1 marca', 'Conteo: 2 marcas']);
  assert.deepEqual(C.missingKeys(), []);
});
