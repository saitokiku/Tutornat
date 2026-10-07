'use strict';
// Domain regressions for the connected frontend. Pure functions only: no DOM, no timers.
// Slice 1: custom tasks, task-isolated sessions, assistance history, strict answer parsing, observations.
const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../domain.js');

const AT = '2026-10-01T14:00:00.000Z';
const L = 'lrn-35-bea'; // fictional grade-4 demo learner
const TODAY = '2026-10-01';

function seed() {
  let store = D.createStore();
  let r = D.createTask(store, L, { title: 'Fractions page 12', subject: 'math', due: '2026-10-03', instructions: 'Finish problems 1-10.' }, { at: AT });
  store = r.store; const a = r.task;
  r = D.createTask(store, L, { title: 'Read chapter 4', subject: 'reading', due: '2026-10-05', instructions: 'Read and retell.' }, { at: AT });
  return { store: r.store, a, b: r.task };
}
function sampleMath() {
  let store = D.createStore();
  store = D.loadSample(store, L, { at: AT, today: TODAY }).store;
  const math = D.listTasks(store, L).find((t) => t.sample === 'math-arrays');
  assert.ok(math, 'sample math task exists');
  return { store, math };
}

test('createTask stores trimmed values with a stable id, learner scope and open status without mutating the old store', () => {
  const store = D.createStore();
  const { store: s2, task } = D.createTask(store, L, { title: '  Fractions page 12 ', subject: 'math', due: '2026-10-03', instructions: ' Finish 1-10 ' }, { at: AT });
  assert.match(task.id, /^task-/);
  assert.equal(task.title, 'Fractions page 12');
  assert.equal(task.instructions, 'Finish 1-10');
  assert.equal(task.learnerId, L);
  assert.equal(task.status, 'open');
  assert.equal(task.origin, 'parent');
  assert.equal(task.version, 1);
  assert.equal(s2.tasks[task.id], task);
  assert.equal(Object.keys(store.tasks).length, 0);
});

test('two tasks get distinct ids; the learner list is ordered by due date and scoped to the learner', () => {
  const { store, a, b } = seed();
  assert.notEqual(a.id, b.id);
  assert.deepEqual(D.listTasks(store, L).map((t) => t.id), [a.id, b.id]);
  assert.deepEqual(D.listTasks(store, 'lrn-k2-ari'), []);
});

test('validateTaskInput reports field errors for empty title, unknown subject, impossible date and over-limit text', () => {
  const v = D.validateTaskInput({ title: '   ', subject: 'nope', due: '2026-02-30', instructions: 'x'.repeat(D.LIMITS.instructions + 1) });
  assert.equal(v.ok, false);
  assert.deepEqual(Object.keys(v.errors).sort(), ['due', 'instructions', 'subject', 'title']);
  assert.equal(v.errors.title, 'required');
  assert.equal(v.errors.due, 'invalid_date');
  assert.equal(v.errors.instructions, 'too_long');
  assert.equal(D.validateTaskInput({ title: 'x'.repeat(D.LIMITS.title + 1), subject: 'math', due: '2026-10-03', instructions: '' }).errors.title, 'too_long');
  assert.equal(D.validateTaskInput({ title: 'Ok', subject: 'math', due: '2026-10-03', instructions: '' }).ok, true);
});

test('createTask throws a DomainError carrying field errors and leaves the store unchanged', () => {
  const store = D.createStore();
  assert.throws(() => D.createTask(store, L, { title: '', subject: 'math', due: '2026-10-03', instructions: '' }, { at: AT }),
    (e) => e.name === 'DomainError' && e.code === 'validation' && e.errors.title === 'required');
  assert.throws(() => D.createTask(store, 'lrn-nobody', { title: 'x', subject: 'math', due: '2026-10-03', instructions: '' }, { at: AT }), (e) => e.code === 'not_found');
  assert.equal(Object.keys(store.tasks).length, 0);
});

test('editTask keeps id/createdAt/origin, bumps version, applies new values and leaves the old snapshot intact', () => {
  const { store, a } = seed();
  const { store: s2, task } = D.editTask(store, a.id, { title: 'Fractions page 13', due: '2026-10-04' }, { at: '2026-10-01T15:00:00.000Z' });
  assert.equal(task.id, a.id);
  assert.equal(task.createdAt, a.createdAt);
  assert.equal(task.origin, a.origin);
  assert.equal(task.title, 'Fractions page 13');
  assert.equal(task.due, '2026-10-04');
  assert.equal(task.subject, 'math');
  assert.equal(task.version, a.version + 1);
  assert.equal(store.tasks[a.id].title, 'Fractions page 12');
  assert.equal(s2.tasks[a.id].title, 'Fractions page 13');
});

test('editTask validates like create and rejects unknown ids', () => {
  const { store, a } = seed();
  assert.throws(() => D.editTask(store, a.id, { title: '' }, { at: AT }), (e) => e.code === 'validation' && e.errors.title === 'required');
  assert.throws(() => D.editTask(store, 'task-missing', { title: 'x' }, { at: AT }), (e) => e.code === 'not_found');
});

test('archiveTask removes a task from the open list and restoreTask returns the same record', () => {
  const { store, a, b } = seed();
  const s2 = D.archiveTask(store, a.id, { at: AT }).store;
  assert.equal(s2.tasks[a.id].status, 'archived');
  assert.deepEqual(D.listTasks(s2, L).map((t) => t.id), [b.id]);
  assert.deepEqual(D.listTasks(s2, L, { status: 'archived' }).map((t) => t.id), [a.id]);
  const s3 = D.restoreTask(s2, a.id, { at: AT }).store;
  assert.equal(s3.tasks[a.id].status, 'open');
  assert.equal(s3.tasks[a.id].id, a.id);
  assert.equal(s3.tasks[a.id].title, a.title);
  assert.deepEqual(D.listTasks(s3, L).map((t) => t.id), [a.id, b.id]);
});

test('sessions are isolated per task: steps on one task never appear on another', () => {
  const { store, a, b } = seed();
  let s = D.startTask(store, a.id, { at: AT }).store;
  s = D.addStep(s, a.id, '  I drew 15 rows ', { at: AT }).store;
  assert.equal(D.getSession(s, a.id).state, 'in_progress');
  assert.deepEqual(D.getSession(s, a.id).steps.map((x) => x.text), ['I drew 15 rows']);
  assert.equal(D.getSession(s, a.id).steps[0].author, 'student');
  assert.equal(D.getSession(s, b.id).state, 'not_started');
  assert.deepEqual(D.getSession(s, b.id).steps, []);
});

test('addStep rejects empty and over-limit text', () => {
  const { store, a } = seed();
  const s = D.startTask(store, a.id, { at: AT }).store;
  assert.throws(() => D.addStep(s, a.id, '   ', { at: AT }), (e) => e.code === 'validation' && e.errors.text === 'required');
  assert.throws(() => D.addStep(s, a.id, 'x'.repeat(D.LIMITS.step + 1), { at: AT }), (e) => e.code === 'validation' && e.errors.text === 'too_long');
});

test('requestHelp on a custom task records the request as unavailable and never fabricates an answer', () => {
  const { store, a } = seed();
  let s = D.startTask(store, a.id, { at: AT }).store;
  s = D.requestHelp(s, a.id, 'hint', { at: AT }).store;
  const sess = D.getSession(s, a.id);
  assert.equal(sess.assistance.length, 1);
  assert.equal(sess.assistance[0].kind, 'requested');
  assert.equal(sess.assistance[0].available, false);
  assert.equal(sess.assistance[0].text, null);
  assert.equal(D.countRequestedHelp(sess), 1);
  assert.equal(D.countScriptedHelp(sess), 0);
});

test('requestHelp on a reviewed sample task adds a distinct scripted entry and counts requested help separately', () => {
  const { store, math } = sampleMath();
  let s = D.startTask(store, math.id, { at: AT }).store;
  s = D.requestHelp(s, math.id, 'hint', { at: AT }).store;
  const sess = D.getSession(s, math.id);
  assert.equal(D.countRequestedHelp(sess), 1);
  assert.equal(D.countScriptedHelp(sess), 1);
  const scripted = sess.assistance.find((x) => x.kind === 'scripted');
  assert.equal(scripted.source, 'scripted_sample');
  assert.ok(scripted.text.length > 0);
});

test('scripted replay is idempotent: replaying the same step does not duplicate assistance', () => {
  const { store, math } = sampleMath();
  let s = D.startTask(store, math.id, { at: AT }).store;
  s = D.requestHelp(s, math.id, 'hint', { at: AT }).store;
  const once = D.getSession(s, math.id).assistance.length;
  s = D.replayScripted(s, math.id, { at: AT }).store;
  s = D.replayScripted(s, math.id, { at: AT }).store;
  assert.equal(D.getSession(s, math.id).assistance.length, once);
});

test('assistance history is append-only, frozen, and earlier snapshots are never mutated', () => {
  const { store, math } = sampleMath();
  const s1 = D.startTask(store, math.id, { at: AT }).store;
  const s2 = D.requestHelp(s1, math.id, 'hint', { at: AT }).store;
  assert.equal(D.getSession(s1, math.id).assistance.length, 0);
  assert.ok(Object.isFrozen(D.getSession(s2, math.id).assistance));
  const s3 = D.requestHelp(s2, math.id, 'scaffold', { at: AT }).store;
  assert.equal(D.getSession(s2, math.id).assistance.length, 2);
  assert.equal(D.getSession(s3, math.id).assistance.length, 4);
  assert.deepEqual(D.getSession(s3, math.id).assistance.slice(0, 2), D.getSession(s2, math.id).assistance);
});

test('parseWholeNumber is strict: 1225 is not 225, blanks, words, signs and decimals are not whole numbers', () => {
  assert.equal(D.parseWholeNumber(' 225 '), 225);
  assert.equal(D.parseWholeNumber('1225'), 1225);
  assert.equal(D.parseWholeNumber('225 stickers'), null);
  assert.equal(D.parseWholeNumber(''), null);
  assert.equal(D.parseWholeNumber('2 25'), null);
  assert.equal(D.parseWholeNumber('-225'), null);
  assert.equal(D.parseWholeNumber('225.0'), null);
  assert.equal(D.parseWholeNumber(null), null);
});

test('checkAnswer on the sample math task matches only the exact whole number and is labeled scripted', () => {
  const { store, math } = sampleMath();
  const s = D.startTask(store, math.id, { at: AT }).store;
  let r = D.checkAnswer(s, math.id, '1225', { at: AT });
  assert.equal(r.check.verdict, 'no_match');
  r = D.checkAnswer(r.store, math.id, '225', { at: AT });
  assert.equal(r.check.verdict, 'match');
  assert.equal(r.check.source, 'scripted_sample');
  assert.equal(D.getSession(r.store, math.id).checks.length, 2);
  assert.equal(D.getSession(r.store, math.id).mastery, 'not_assessed');
});

test('checkAnswer on a custom task is unsupported and records no verdict', () => {
  const { store, a } = seed();
  const s = D.startTask(store, a.id, { at: AT }).store;
  const r = D.checkAnswer(s, a.id, '225', { at: AT });
  assert.equal(r.check.verdict, 'unsupported');
  assert.equal(D.getSession(r.store, a.id).checks.length, 0);
});

test('flagStuck and markComplete touch only that task; complete is a self-report, never mastery', () => {
  const { store, a, b } = seed();
  let s = D.startTask(store, a.id, { at: AT }).store;
  s = D.startTask(s, b.id, { at: AT }).store;
  s = D.flagStuck(s, a.id, { at: AT }).store;
  assert.equal(D.getSession(s, a.id).state, 'stuck');
  assert.equal(D.getSession(s, b.id).state, 'in_progress');
  s = D.markComplete(s, a.id, { at: AT }).store;
  assert.equal(D.getSession(s, a.id).state, 'complete_self_reported');
  assert.equal(s.tasks[a.id].status, 'done');
  assert.equal(s.tasks[b.id].status, 'open');
  assert.equal(D.getSession(s, a.id).mastery, 'not_assessed');
});

test('addObservation stores parent text verbatim, tied to task and learner, and validates emptiness', () => {
  const { store, a } = seed();
  const text = 'She counted on her fingers for 7+8 — <b>stored as typed</b>';
  const { store: s2, observation } = D.addObservation(store, a.id, text, { at: AT });
  assert.equal(observation.text, text);
  assert.equal(observation.taskId, a.id);
  assert.equal(observation.learnerId, L);
  assert.equal(observation.author, 'parent');
  assert.deepEqual(D.listObservations(s2, a.id).map((o) => o.id), [observation.id]);
  assert.throws(() => D.addObservation(s2, a.id, '   ', { at: AT }), (e) => e.code === 'validation');
});

test('record timeline attributes every entry to its source in order', () => {
  const { store, math } = sampleMath();
  let s = D.startTask(store, math.id, { at: AT }).store;
  s = D.addStep(s, math.id, 'I made 15 rows', { at: AT }).store;
  s = D.requestHelp(s, math.id, 'hint', { at: AT }).store;
  s = D.addObservation(s, math.id, 'Needed a nudge to start', { at: AT }).store;
  const sources = D.recordForTask(s, math.id).map((e) => e.source);
  assert.deepEqual(sources, ['task_change', 'student_activity', 'student_work', 'help_requested', 'help_scripted', 'parent_observation']);
});
