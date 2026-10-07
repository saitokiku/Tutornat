'use strict';
// parent-pages.test.cjs — final repair cycle 2, parent pages (F2-04 explicit per-field display provenance; F2-03 domain-side
// guarantees for due-only edits). New file; protected test files are untouched. Fresh stores, fixed clock, no DOM.
// Run: node --test frontend/tests/parent-pages.test.cjs   (from the owned copy; APP_ROOT is this file's parent)
const test = require('node:test'); const assert = require('node:assert/strict');
const path = require('node:path');
const ROOT = process.env.APP_ROOT || path.resolve(__dirname, '..');
const D = require(path.join(ROOT, 'domain.js')); const C = require(path.join(ROOT, 'copy.js'));
const B = 'lrn-35-bea', AT = '2026-10-01T14:00:00.000Z', opt = { at: AT, today: '2026-10-01' };
const EN = D.SAMPLES['math-arrays'], ES = C.SAMPLE_ES['math-arrays'];
const sampleStore = () => { let s = D.createStore(); s = D.loadSample(s, B, opt).store; const task = D.listTasks(s, B).find((t) => t.sample === 'math-arrays'); return { s, task }; };
const lastEdit = (s) => s.events.filter((e) => e.source === 'task_change' && e.type === 'edited').pop();
const gen = (key, version) => ({ key, version });
// Authored = NO provenance entry for the field (explicit absence); a fully family-edited sample task ends with generated === null.
const both = () => ({ title: gen('math-arrays', 1), instructions: gen('math-arrays', 1) });

test('F2-04 sample tasks carry explicit per-field generated provenance; parent-authored tasks carry authored provenance', () => {
  const { s, task } = sampleStore();
  assert.deepEqual(task.generated, both());
  const own = D.createTask(s, B, { title: 'My own title', subject: 'math', due: '2026-10-06', instructions: 'Own words.' }, opt).task;
  assert.equal(own.generated, undefined, 'authored fields carry no generated provenance');
  // Conservative fallback: a record without explicit provenance is shown verbatim even when its bytes equal the canonical sample.
  assert.equal(C.taskText('es', { title: EN.title, instructions: EN.instructions, sample: 'math-arrays' }, 'title', D.SAMPLES), EN.title);
});

test('F2-04 copy.taskText renders generated fields in the chosen locale and authored fields verbatim', () => {
  const { task } = sampleStore();
  assert.equal(C.taskText('es', task, 'title', D.SAMPLES), ES.title);
  assert.equal(C.taskText('es', task, 'instructions', D.SAMPLES), ES.instructions);
  assert.equal(C.taskText('en', task, 'title', D.SAMPLES), EN.title);
  const own = D.createTask(D.createStore(), B, { title: EN.title, subject: 'math', due: '2026-10-06', instructions: ES.instructions }, opt).task;
  // authored-string coincidence: equal bytes to a canonical EN/ES sample string stay authored and are shown verbatim in both locales
  assert.equal(C.taskText('es', own, 'title', D.SAMPLES), EN.title);
  assert.equal(C.taskText('en', own, 'instructions', D.SAMPLES), ES.instructions);
});

test('F2-04 unknown or mismatched sample versions fall back to the stored bytes', () => {
  const base = { title: 'Old title v0', instructions: 'Old instructions v0', sample: 'math-arrays' };
  assert.equal(C.taskText('es', { ...base, generated: { title: gen('math-arrays', 99), instructions: gen('math-arrays', 99) } }, 'title', D.SAMPLES), 'Old title v0');
  assert.equal(C.taskText('es', { ...base, generated: { title: gen('no-such-sample', 1) } }, 'title', D.SAMPLES), 'Old title v0');
  assert.equal(C.taskText('es', base, 'instructions', D.SAMPLES), 'Old instructions v0');
  assert.equal(C.taskText('es', { ...base, generated: { title: gen('math-arrays', 1) } }, 'title', D.SAMPLES), ES.title);
});

test('F2-04 instructions-only edit detaches help/checker capability but keeps the untouched generated title localizable', () => {
  const { s, task } = sampleStore();
  const r = D.editTask(s, task.id, { instructions: 'Family instructions.' }, opt); const u = r.task;
  assert.equal(u.sample, null); assert.deepEqual(u.sampleDetached.changed, ['instructions']);
  assert.deepEqual(u.generated, { title: gen('math-arrays', 1) });
  assert.equal(u.title, EN.title, 'stored title bytes untouched');
  assert.equal(C.taskText('es', u, 'title', D.SAMPLES), ES.title, 'generated title still localized after detach');
  assert.equal(C.taskText('es', u, 'instructions', D.SAMPLES), 'Family instructions.');
  assert.deepEqual(lastEdit(r.store).detail.changed, ['instructions']);
  assert.deepEqual(lastEdit(r.store).detail.from, { instructions: EN.instructions });
  // R07 contract unchanged: a detached task has no scripted checker (verdict 'unsupported', no scripted source), and keeps none later.
  const chk = D.checkAnswer(D.startTask(r.store, task.id, opt).store, task.id, '225', opt).check;
  assert.equal(chk.verdict, 'unsupported'); assert.equal(chk.source, null);
  assert.ok(!D.requestHelp(D.startTask(r.store, task.id, opt).store, task.id, 'hint', opt).assistance.some((x) => x.kind === 'scripted'), 'detached task gets no scripted help');
});

test('F2-04 title-only edit keeps generated instructions localizable; later edits keep explicit identity', () => {
  const { s, task } = sampleStore();
  let r = D.editTask(s, task.id, { title: 'Family title' }, opt);
  assert.deepEqual(r.task.generated, { instructions: gen('math-arrays', 1) });
  assert.equal(C.taskText('es', r.task, 'instructions', D.SAMPLES), ES.instructions);
  assert.equal(C.taskText('es', r.task, 'title', D.SAMPLES), 'Family title');
  // second edit after detach: due-only keeps provenance and never re-attaches the sample
  r = D.editTask(r.store, task.id, { due: '2026-10-09' }, opt);
  assert.equal(r.task.sample, null); assert.deepEqual(r.task.generated, { instructions: gen('math-arrays', 1) });
  assert.deepEqual(lastEdit(r.store).detail.changed, ['due']);
  // typing the canonical string back does not flip the field to generated
  r = D.editTask(r.store, task.id, { title: EN.title }, opt);
  assert.equal(r.task.generated.title, undefined); assert.equal(C.taskText('es', r.task, 'title', D.SAMPLES), EN.title);
  r = D.editTask(r.store, task.id, { instructions: 'Family instructions too' }, opt);
  assert.equal(r.task.generated, null, 'no generated field left'); assert.equal(r.task.sample, null);
  r = D.editTask(r.store, task.id, { title: 'Yet another' }, opt); assert.equal(r.task.generated, null);
  // a deliberate ES-rendering value typed as the title stays authored (shown verbatim in EN)
  r = D.editTask(r.store, task.id, { title: ES.title }, opt);
  assert.equal(r.task.generated, null, 'authored ES-looking title never becomes generated'); assert.equal(C.taskText('en', r.task, 'title', D.SAMPLES), ES.title);
});

test('F2-03 due-only edit keeps canonical text, sample capability, provenance and logs only due', () => {
  const { s, task } = sampleStore();
  const r = D.editTask(s, task.id, { due: '2026-10-09' }, opt);
  assert.equal(r.task.sample, 'math-arrays'); assert.equal(r.task.title, EN.title); assert.equal(r.task.instructions, EN.instructions);
  assert.deepEqual(r.task.generated, both());
  const ev = lastEdit(r.store); assert.deepEqual(ev.detail.changed, ['due']); assert.deepEqual(ev.detail.from, { due: task.due }); assert.deepEqual(ev.detail.to, { due: '2026-10-09' });
  assert.equal(ev.detail.sampleDetached, undefined);
});

test('F2-04 typing the exact canonical EN string into a generated field of an EXISTING sample is an authored edit', () => {
  const { s, task } = sampleStore();
  const r = D.editTask(s, task.id, { title: EN.title }, opt); const u = r.task; const ev = lastEdit(r.store);
  assert.deepEqual(ev.detail.changed, ['title'], 'authored intent is recorded even though the bytes coincide');
  assert.equal(ev.detail.sampleDetached, 'math-arrays'); assert.deepEqual(ev.detail.authored, ['title']);
  assert.equal(u.sample, null); assert.deepEqual(u.generated, { instructions: gen('math-arrays', 1) });
  assert.equal(C.taskText('es', u, 'title', D.SAMPLES), EN.title, 'authored EN bytes shown verbatim in ES');
  assert.equal(C.taskText('es', u, 'instructions', D.SAMPLES), ES.instructions, 'untouched generated instructions still localized');
  // a NON-generated field submitted with its current value is still no change (existing behavior)
  assert.deepEqual(lastEdit(D.editTask(s, task.id, { subject: 'math' }, opt).store).detail.changed, []);
});
