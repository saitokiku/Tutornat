/* ui-logic.mjs — UI pure-logic tests. node --test lesson/tests/ui-logic.mjs
 *
 * SYNTHETIC: when lesson/core.mjs is not yet on disk this file redirects
 * app.mjs's `./core.mjs` import to a minimal stub so UI logic can be driven in
 * isolation. A stub run proves NOTHING about the engine or about a live
 * provider call; the banner below says which core was used.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const realCore = resolve(here, '..', 'core.mjs');
const stubCore = resolve(here, 'ui-fixtures', 'core-stub.mjs');
const usingStub = !existsSync(realCore);
if (usingStub) {
  registerHooks({
    resolve(spec, ctx, next) {
      if (spec === './core.mjs') return { url: pathToFileURL(stubCore).href, shortCircuit: true };
      return next(spec, ctx);
    },
  });
}
console.log(usingStub
  ? '[ui-logic] SYNTHETIC core stub (lesson/core.mjs absent) — not engine core, not a live provider'
  : '[ui-logic] real lesson/core.mjs');

const app = await import('../app.mjs');

const frac = { kind: 'fraction', parts: 8, filled: 3, caption: 'Eight equal parts.' };
const line = { kind: 'numberline', min: 0, max: 10, value: 4, caption: 'Zero to ten.' };
const toks = { kind: 'tokens', count: 6, caption: 'Six counters.' };
const pass = { kind: 'passage', text: 'Rosa found a key. She opened the box! What was inside?', caption: 'Read it twice.' };

const step = (over = {}) => ({
  id: 's1', prompt: 'p', explanation: 'e', hint: 'h',
  kind: 'numeric', answer: '3/8', visual: frac, ...over,
});

// A contract-valid lesson: exactly three steps, distinct prompts, unique ids.
const lessonFixture = (over = {}) => ({
  version: 1, id: 'L1', title: 'Eighths', goal: 'g', subject: 'math',
  grade: '3', locale: 'en', intro: 'i',
  steps: [
    { id: 's1', prompt: 'Shade three eighths.', explanation: 'e1', hint: 'h1', kind: 'numeric', answer: '3/8', visual: frac },
    { id: 's2', prompt: 'Count the counters.', explanation: 'e2', hint: 'h2', kind: 'numeric', answer: '6', visual: toks },
    { id: 's3', prompt: 'Where is four on this line?', explanation: 'e3', hint: 'h3', kind: 'numeric', answer: '4', visual: line },
  ],
  path: { reinforce: { goal: 'a', reason: 'r' }, advance: { goal: 'b', reason: 'r' } },
  ...over,
});

test('visual state starts from the authored visual, not zero', () => {
  assert.deepEqual(app.initialVisualState(frac), { filled: 3 });
  assert.deepEqual(app.initialVisualState(line), { value: 4 });
  assert.deepEqual(app.initialVisualState(toks), { counted: [] });
  assert.deepEqual(app.initialVisualState(pass), { selected: null });
});

test('fraction parts toggle and stay inside 0..parts', () => {
  let s = app.initialVisualState(frac);
  s = app.nextVisualState(frac, s, { type: 'toggleFraction', index: 0 });
  assert.equal(s.filled, 1, 'clicking part 1 shades up to part 1');
  s = app.nextVisualState(frac, s, { type: 'toggleFraction', index: 7 });
  assert.equal(s.filled, 8);
  s = app.nextVisualState(frac, s, { type: 'toggleFraction', index: 7 });
  assert.equal(s.filled, 7, 'clicking the last shaded part gives one back');
  for (let i = 0; i < 20; i++) s = app.nextVisualState(frac, s, { type: 'toggleFraction', index: 0 });
  assert.ok(s.filled >= 0 && s.filled <= frac.parts);
});

test('number line clamps to authored bounds and ignores junk', () => {
  let s = app.initialVisualState(line);
  assert.equal(app.nextVisualState(line, s, { type: 'setRange', value: 99 }).value, 10);
  assert.equal(app.nextVisualState(line, s, { type: 'setRange', value: -5 }).value, 0);
  assert.equal(app.nextVisualState(line, s, { type: 'setRange', value: 'x' }).value, 4);
});

test('tokens count by toggle, never duplicating an index', () => {
  let s = app.initialVisualState(toks);
  s = app.nextVisualState(toks, s, { type: 'toggleToken', index: 2 });
  s = app.nextVisualState(toks, s, { type: 'toggleToken', index: 2 });
  assert.deepEqual(s.counted, [], 'second tap un-counts');
  s = app.nextVisualState(toks, s, { type: 'toggleToken', index: 0 });
  s = app.nextVisualState(toks, s, { type: 'toggleToken', index: 4 });
  assert.deepEqual(s.counted, [0, 4]);
  assert.deepEqual(app.nextVisualState(toks, s, { type: 'toggleToken', index: 99 }).counted, [0, 4]);
});

test('passage splits into sentences and selects one', () => {
  assert.deepEqual(app.splitSentences(pass.text),
    ['Rosa found a key.', 'She opened the box!', 'What was inside?']);
  assert.deepEqual(app.splitSentences('No terminator here'), ['No terminator here']);
  assert.deepEqual(app.splitSentences(''), []);
  const s = app.nextVisualState(pass, app.initialVisualState(pass), { type: 'selectSentence', index: 1 });
  assert.equal(s.selected, 1);
  assert.equal(app.nextVisualState(pass, s, { type: 'selectSentence', index: 1 }).selected, null);
});

test('caption reports the learner-made state, in the lesson locale', () => {
  const c = app.visualCaption(frac, { filled: 5 }, 'en');
  assert.match(c, /5/); assert.match(c, /8/);
  assert.notEqual(app.visualCaption(frac, { filled: 5 }, 'es'), c, 'Spanish caption differs');
  assert.match(app.visualCaption(toks, { counted: [1, 2] }, 'en'), /2/);
  assert.match(app.visualCaption(line, { value: 7 }, 'en'), /7/);
  assert.match(app.visualCaption(pass, { selected: 1 }, 'en'), /2/, 'sentence shown 1-based');
});

test('manipulating the visual fills a numeric answer, never a choice or writing one', () => {
  assert.equal(app.derivedAnswer(step(), { filled: 5 }), '5/8');
  assert.equal(app.derivedAnswer(step({ visual: toks }), { counted: [0, 1, 2] }), '3');
  assert.equal(app.derivedAnswer(step({ visual: line }), { value: 7 }), '7');
  assert.equal(app.derivedAnswer(step({ visual: pass }), { selected: 1 }), null);
  assert.equal(app.derivedAnswer(step({ kind: 'choice', choices: ['a', 'b'] }), { filled: 5 }), null);
  assert.equal(app.derivedAnswer(step({ kind: 'writing' }), { filled: 5 }), null);
});

test('evidence records assistance and source; it never invents mastery', () => {
  const e = app.makeEvidence({
    lessonId: 'L1', stepId: 's3', answer: 'x'.repeat(4000),
    verdict: 'incorrect', assisted: true, source: 'ai-feedback',
  });
  assert.equal(e.lessonId, 'L1');
  assert.equal(e.assisted, true);
  assert.equal(e.source, 'ai-feedback');
  assert.ok(e.answer.length <= 1500, 'answer bounded');
  assert.ok(!Number.isNaN(Date.parse(e.at)), 'immutable ISO timestamp');
  assert.deepEqual(Object.keys(e).sort(),
    ['answer', 'assisted', 'at', 'lessonId', 'source', 'stepId', 'verdict']);
  assert.throws(() => app.makeEvidence({ lessonId: 'L', stepId: 's', answer: '', verdict: 'mastered', assisted: false, source: 'local-check' }));
  assert.throws(() => app.makeEvidence({ lessonId: 'L', stepId: 's', answer: '', verdict: 'correct', assisted: false, source: 'vibes' }));
});

test('storage record round-trips and rejects junk instead of trusting it', () => {
  const lesson = lessonFixture();
  const rec = app.makeRecord({ lesson, stepIndex: 1, answers: { s1: 'y' }, assisted: { s1: true }, evidence: [], next: null });
  assert.equal(rec.v, 1);
  const back = app.readRecord(JSON.stringify(rec));
  assert.equal(back.stepIndex, 1);
  assert.equal(back.answers.s1, 'y');
  assert.equal(app.readRecord('{not json'), null);
  assert.equal(app.readRecord(JSON.stringify({ v: 99, lesson })), null, 'other version is not ours');
  assert.equal(app.readRecord(JSON.stringify({ v: 1 })), null, 'no lesson, nothing to resume');
  assert.equal(app.readRecord('null'), null);
  // A lesson that fails the shared contract is not resumable work.
  assert.equal(app.readRecord(JSON.stringify({ v: 1, lesson: { ...lesson, steps: [] } })), null);
});

test('record is bounded so one lesson cannot fill the origin', () => {
  const lesson = lessonFixture();
  const many = Array.from({ length: 500 }, (_, i) => app.makeEvidence({
    lessonId: 'L', stepId: 's' + i, answer: 'a'.repeat(1500), verdict: 'correct', assisted: false, source: 'local-check',
  }));
  const rec = app.makeRecord({ lesson, stepIndex: 0, answers: {}, assisted: {}, evidence: many, next: null });
  assert.ok(rec.evidence.length <= 60, 'evidence capped, newest kept');
  assert.equal(rec.evidence.at(-1).stepId, 's499');
  assert.ok(JSON.stringify(rec).length < 150000);
});

test('storage failure keeps work in memory and says so', () => {
  const ok = new Map();
  const okStore = { getItem: k => (ok.has(k) ? ok.get(k) : null), setItem: (k, v) => ok.set(k, v), removeItem: k => ok.delete(k) };
  const rec = app.makeRecord({ lesson: lessonFixture(), stepIndex: 0, answers: {}, assisted: {}, evidence: [], next: null });
  assert.deepEqual(app.saveRecord(okStore, rec), { ok: true, mode: 'saved', reason: '' });
  assert.equal(app.loadRecord(okStore).record.lesson.id, 'L1');

  const quota = { getItem: () => null, setItem: () => { const e = new Error('full'); e.name = 'QuotaExceededError'; throw e; }, removeItem: () => {} };
  const q = app.saveRecord(quota, rec);
  assert.equal(q.ok, false); assert.equal(q.mode, 'memory'); assert.equal(q.reason, 'quota');

  const dead = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => {} };
  assert.equal(app.saveRecord(dead, rec).reason, 'unavailable');
  assert.equal(app.loadRecord(dead).record, null);
  assert.equal(app.loadRecord(dead).reason, 'unavailable');

  const corrupt = { getItem: () => '{{{', setItem: () => {}, removeItem: () => {} };
  assert.equal(app.loadRecord(corrupt).record, null);
  assert.equal(app.loadRecord(corrupt).reason, 'corrupt');
  assert.equal(app.loadRecord(null).reason, 'unavailable');
});

test('generation guard drops answers that belong to a replaced lesson', () => {
  const g = app.freshGuard();
  const first = g.token;
  assert.equal(g.accepts(first), true);
  g.bump();
  assert.equal(g.accepts(first), false, 'late response after reset is dead');
  assert.equal(g.accepts(g.token), true);
});

test('both locales carry every string — no empty translation claim', () => {
  const en = Object.keys(app.STRINGS.en).sort();
  const es = Object.keys(app.STRINGS.es).sort();
  assert.deepEqual(es, en);
  for (const k of en) {
    assert.ok(String(app.STRINGS.es[k]).trim().length > 0, `es.${k} empty`);
    assert.notEqual(app.STRINGS.es[k], app.STRINGS.en[k], `es.${k} is untranslated English`);
  }
  assert.equal(app.t('es', 'generate'), app.STRINGS.es.generate);
  assert.equal(app.t('de', 'generate'), app.STRINGS.en.generate, 'unknown locale falls back, does not crash');
  assert.match(app.t('en', 'visualFraction', { filled: 2, parts: 5 }), /2.*5/);
});

test('shipped UI source has no HTML injection sink and no remote asset', () => {
  const files = ['app.mjs', 'index.html', 'styles.css'];
  const banned = [
    'innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write',
    'eval(', 'new Function', 'http://', 'https://', 'fetch(`http', 'srcdoc',
    '@import', 'createObjectURL(new Blob([`<',
  ];
  for (const f of files) {
    const src = readFileSync(resolve(here, '..', f), 'utf8');
    for (const b of banned) assert.ok(!src.includes(b), `${f} contains banned ${b}`);
    assert.ok(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(src), `${f} contains emoji`);
    assert.ok(!/getUserMedia|MediaDevices|navigator\.media/.test(src), `${f} touches camera/mic`);
  }
});
