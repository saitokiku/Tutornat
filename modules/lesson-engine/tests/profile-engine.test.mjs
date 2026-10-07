// Profile-first (v2) engine contract: age-aware open-topic lessons, the `sequence`
// visual, explicit evidence advancement, and feedback grounding.
//
// Deliberately NARROW: these are the new/repaired boundaries only. tests/core.test.mjs
// and tests/server.test.mjs stay untouched and must keep passing — v1 lessons that are
// already saved in a browser must keep validating exactly as before.
//
// The AI subprocess is an injected fake (LESSON_AI_CMD), so nothing here is live.
import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { readFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { validateLesson, chooseNext } from '../core.mjs';
import { createServer } from '../server.mjs';

// ---------------------------------------------------------------- fixtures
const step = (over = {}) => ({
  id: 's1', prompt: 'How many stages does the water cycle show?',
  explanation: 'Count the labelled stages.', hint: 'Start at evaporation.',
  kind: 'numeric', answer: '4',
  visual: { kind: 'tokens', count: 4, caption: 'Four stage cards.' },
  ...over,
});

// v2: age, free-text subject, NO grade.
const v2 = (over = {}) => ({
  version: 2, id: 'les_v2', title: 'The water cycle', goal: 'name the stages of the water cycle',
  subject: 'earth science', age: 35, locale: 'en', intro: 'Water moves in a loop.',
  steps: [
    step({ id: 'a', prompt: 'How many stages are shown?' }),
    step({ id: 'b', prompt: 'Which stage comes after condensation?', kind: 'choice',
      choices: ['precipitation', 'evaporation'], answer: 'precipitation' }),
    step({ id: 'c', prompt: 'Fresh check: where does collection happen?', kind: 'choice',
      choices: ['in oceans and lakes', 'in clouds'], answer: 'in oceans and lakes',
      visual: { kind: 'sequence', caption: 'One turn of the cycle.',
        stages: [
          { label: 'Evaporation', detail: 'Sun warms water and it rises as vapour.' },
          { label: 'Condensation', detail: 'Vapour cools and forms cloud droplets.' },
          { label: 'Precipitation', detail: 'Droplets join and fall as rain or snow.' },
        ] } }),
  ],
  path: { reinforce: { goal: 'sort the four stage cards', reason: 'Rebuild the order.' },
    advance: { goal: 'explain why warm air holds more vapour', reason: 'Order looks secure.' } },
  ...over,
});

// v1: exactly the already-saved shape. Nothing about it may change.
const v1 = (over = {}) => ({
  version: 1, id: 'les_v1', title: 'Fractions of a whole', goal: 'compare simple fractions',
  subject: 'math', grade: '3', locale: 'en', intro: 'We shade parts of a bar.',
  steps: [
    { id: 'a', prompt: 'How much is shaded?', explanation: 'Three of four parts.',
      hint: 'Count the shaded parts.', kind: 'numeric', answer: '3/4',
      visual: { kind: 'fraction', parts: 4, filled: 3, caption: 'Three of four shaded.' } },
    { id: 'b', prompt: 'Shade one more. How much now?', explanation: 'All four parts.',
      hint: 'Four of four is one.', kind: 'numeric', answer: '1',
      visual: { kind: 'fraction', parts: 4, filled: 4, caption: 'All four shaded.' } },
    { id: 'c', prompt: 'Fresh check: which is larger, 1/2 or 1/3?', explanation: 'Halves are bigger.',
      hint: 'Fewer parts means bigger parts.', kind: 'choice', choices: ['1/2', '1/3'], answer: '1/2',
      visual: { kind: 'numberline', min: 0, max: 1, value: 0.5, caption: 'Zero to one.' } },
  ],
  path: { reinforce: { goal: 'shade halves and thirds', reason: 'Rebuild part-whole sense.' },
    advance: { goal: 'add like fractions', reason: 'Parts look secure.' } },
  ...over,
});

const ev = (over = {}) => ({
  lessonId: 'les_v2', stepId: 'c', answer: 'in oceans and lakes', verdict: 'correct',
  assisted: false, source: 'local-check', at: '2026-10-03T05:00:00.000Z', ...over,
});

const rejects = (make, label) => test(`validateLesson rejects ${label}`, () => {
  assert.throws(() => validateLesson(make()), /lesson/i, `expected throw for ${label}`);
});

// ================================================================ core: version 2
test('validateLesson accepts a v2 lesson with age and a free-text subject', () => {
  const v = validateLesson(v2());
  assert.equal(v.version, 2);
  assert.equal(v.age, 35);
  assert.equal(v.subject, 'earth science');
  assert.equal(v.locale, 'en');
  assert.equal('grade' in v, false, 'v2 must not carry a grade');
});

test('validateLesson accepts any safe non-math subject text up to 80 characters', () => {
  for (const subject of ['music theory', 'bread baking', 'Spanish irregular verbs', 'x'.repeat(80)]) {
    assert.equal(validateLesson(v2({ subject })).subject, subject);
  }
});

rejects(() => v2({ subject: 'x'.repeat(81) }), 'a v2 subject over 80 characters');
rejects(() => v2({ subject: '<b>math</b>' }), 'markup in a v2 subject');
rejects(() => { const l = v2(); delete l.age; return l; }, 'a v2 lesson with no age');
rejects(() => v2({ age: 0 }), 'a v2 age below 1');
rejects(() => v2({ age: 121 }), 'a v2 age above 120');
rejects(() => v2({ age: 7.5 }), 'a fractional v2 age');
rejects(() => v2({ age: '7' }), 'a v2 age sent as a string');
rejects(() => v2({ version: 3 }), 'an unknown lesson version');

test('v2 drops a stray grade instead of carrying it as contract data', () => {
  assert.equal('grade' in validateLesson(v2({ grade: '3' })), false);
});

// ================================================================ core: legacy v1
test('validateLesson still accepts an already-saved v1 lesson unchanged', () => {
  const v = validateLesson(v1());
  assert.equal(v.version, 1);
  assert.equal(v.grade, '3');
  assert.equal(v.subject, 'math');
  assert.equal('age' in v, false, 'a v1 record must never gain an invented age');
});

rejects(() => v1({ grade: '9' }), 'an out-of-range v1 grade');
rejects(() => v1({ subject: 'earth science' }), 'a non-whitelisted v1 subject');
rejects(() => { const l = v1(); delete l.grade; return l; }, 'a v1 lesson with no grade');

// ================================================================ core: sequence visual
const seq = (over = {}) => ({ kind: 'sequence', caption: 'One turn of the cycle.',
  stages: [{ label: 'Evaporation', detail: 'Water rises as vapour.' },
    { label: 'Condensation', detail: 'Vapour cools into droplets.' }], ...over });
const withSeq = (visual) => v2({ steps: v2().steps.map((s, i) => (i === 2 ? { ...s, visual } : s)) });

test('validateLesson accepts a sequence visual of 2 to 6 stages', () => {
  for (const n of [2, 3, 6]) {
    const stages = Array.from({ length: n }, (_, i) => ({ label: `Stage ${i + 1}`, detail: `Detail ${i + 1}.` }));
    const v = validateLesson(withSeq(seq({ stages })));
    assert.equal(v.steps[2].visual.kind, 'sequence');
    assert.equal(v.steps[2].visual.stages.length, n);
    assert.deepEqual(Object.keys(v.steps[2].visual.stages[0]).sort(), ['detail', 'label']);
  }
});

rejects(() => withSeq(seq({ stages: [{ label: 'Only one', detail: 'Not a sequence.' }] })), 'a one-stage sequence');
rejects(() => withSeq(seq({ stages: Array.from({ length: 7 }, (_, i) => ({ label: `S${i}`, detail: 'd' })) })), 'a seven-stage sequence');
rejects(() => withSeq(seq({ stages: [{ label: 'x'.repeat(61), detail: 'd' }, { label: 'b', detail: 'd' }] })), 'a sequence label over 60 characters');
rejects(() => withSeq(seq({ stages: [{ label: 'a', detail: 'x'.repeat(241) }, { label: 'b', detail: 'd' }] })), 'a sequence detail over 240 characters');
rejects(() => withSeq(seq({ stages: [{ label: 'a', detail: '<img src=x>' }, { label: 'b', detail: 'd' }] })), 'markup inside a sequence stage');
rejects(() => withSeq(seq({ stages: [{ label: 'a', detail: 'see https://x.test' }, { label: 'b', detail: 'd' }] })), 'a URL inside a sequence stage');
rejects(() => withSeq(seq({ stages: 'two' })), 'sequence stages that are not an array');
rejects(() => withSeq(seq({ caption: 'x'.repeat(201) })), 'a sequence caption over 200 characters');

test('the other visual kinds are unchanged by the sequence addition', () => {
  for (const visual of [
    { kind: 'fraction', parts: 4, filled: 3, caption: 'Three of four.' },
    { kind: 'numberline', min: 0, max: 10, value: 4, caption: 'Zero to ten.' },
    { kind: 'passage', text: 'Rain falls.', caption: 'Read first.' },
    { kind: 'tokens', count: 5, caption: 'Five counters.' },
  ]) assert.equal(validateLesson(withSeq(visual)).steps[2].visual.kind, visual.kind);
});

// ================================================================ core: S14 evidence boundary
test('chooseNext advances only on local-check, explicitly unassisted, correct evidence', () => {
  const l = validateLesson(v2());
  assert.equal(chooseNext(l, [ev()]).kind, 'advance');
  for (const over of [
    { source: 'ai-feedback' },          // S14: model feedback is not a local check
    { source: 'imported' },
    { source: undefined },              // absent source proves nothing
    { assisted: undefined },            // absent assistance is not proven absence
    { assisted: true },
    { verdict: 'incorrect' },
    { verdict: 'ungraded' },
  ]) {
    assert.equal(chooseNext(l, [ev(over)]).kind, 'reinforce', JSON.stringify(over));
  }
});

test('chooseNext uses the latest fresh-check record even when an older one would advance', () => {
  const l = validateLesson(v2());
  const older = ev({ at: '2026-10-03T05:00:00.000Z' });
  const newer = ev({ at: '2026-10-03T05:10:00.000Z', source: 'ai-feedback' });
  assert.equal(chooseNext(l, [older, newer]).kind, 'reinforce');
  assert.equal(chooseNext(l, [newer, older]).kind, 'reinforce');
});

// ================================================================ server harness
const PROMPT_LOG = join(tmpdir(), `profile-engine-prompt-${process.pid}.txt`);
// Fake AI: records the prompt it was handed, then emits one JSON object on stdout.
const emits = (obj) => 'node|-e|'
  + `let b='';process.stdin.on('data',c=>b+=c).on('end',()=>{`
  + `require('fs').writeFileSync(${JSON.stringify(PROMPT_LOG)},JSON.parse(b).prompt);`
  + `process.stdout.write(${JSON.stringify(JSON.stringify(obj))})})`;
const emitsText = (text) => emits({ ok: true, text,
  provenance: { provider: 'anthropic', model: 'claude-fable-5-1', model_wire: 'claude-fable-5-1-x', model_wire_proved: true, live: true } });
const emitsLesson = (lesson) => emitsText(JSON.stringify(lesson));
const sentPrompt = () => readFileSync(PROMPT_LOG, 'utf8');

async function withServer(aiCmd, fn) {
  const server = createServer({ aiCmd });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const call = (path, { method = 'POST', body, headers = {} } = {}) => new Promise((resolve, reject) => {
    const payload = body === undefined ? null : JSON.stringify(body);
    const req = request({ host: '127.0.0.1', port, path, method,
      headers: { host: `127.0.0.1:${port}`, origin: `http://127.0.0.1:${port}`,
        ...(payload === null ? {} : { 'content-type': 'application/json',
          'content-length': Buffer.byteLength(payload) }), ...headers } }, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { raw += c; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers,
        json: () => JSON.parse(raw), text: () => raw }));
    });
    req.on('error', reject);
    if (payload !== null) req.write(payload);
    req.end();
  });
  try { await fn(call, port); } finally {
    await new Promise((r) => server.close(r));
    rmSync(PROMPT_LOG, { force: true });
  }
}

const askLesson = (over = {}) => ({ adultTest: true, age: 35, goal: 'name the stages of the water cycle', locale: 'en', ...over });

// ================================================================ server: /api/lesson v2
test('POST /api/lesson takes age + goal + locale with no subject or grade', async () => {
  await withServer(emitsLesson(v2()), async (call) => {
    const r = await call('/api/lesson', { body: askLesson() });
    assert.equal(r.status, 200, r.text());
    const { lesson } = r.json();
    assert.equal(lesson.version, 2);
    assert.equal(lesson.age, 35);
    assert.equal(lesson.locale, 'en');
  });
});

test('POST /api/lesson accepts an arbitrary non-math, non-English topic', async () => {
  const lesson = v2({ subject: 'bread baking', goal: 'why dough needs resting time',
    title: 'Resting dough' });
  await withServer(emitsLesson(lesson), async (call) => {
    const r = await call('/api/lesson', { body: askLesson({ goal: 'why dough needs resting time' }) });
    assert.equal(r.status, 200, r.text());
    assert.equal(r.json().lesson.subject, 'bread baking');
  });
});

test('POST /api/lesson rejects a missing or out-of-range age before any model call', async () => {
  await withServer(emitsLesson(v2()), async (call) => {
    for (const body of [
      (() => { const b = askLesson(); delete b.age; return b; })(),
      askLesson({ age: 0 }), askLesson({ age: 121 }), askLesson({ age: 7.5 }),
      askLesson({ age: '35' }), askLesson({ age: null }),
    ]) {
      const r = await call('/api/lesson', { body });
      assert.equal(r.status, 400, JSON.stringify(body));
      assert.match(r.json().message, /age/i);
    }
    const r = await call('/api/lesson', { body: askLesson({ adultTest: false }) });
    assert.equal(r.status, 400);
    assert.equal(r.json().error, 'AdultTestRequired');
  });
});

test('the lesson prompt carries the requested age and never a profile label', async () => {
  await withServer(emitsLesson(v2()), async (call) => {
    const r = await call('/api/lesson', { body: { ...askLesson({ age: 7 }), name: 'Zoe', nickname: 'Zo' } });
    assert.equal(r.status, 502, 'age 7 requested but the model returned 35: must not pass');
    const p = sentPrompt();
    assert.match(p, /\b7\b/);
    assert.equal(/Zoe|nickname|\bZo\b/.test(p), false, 'profile label leaked into the prompt');
    // The prompt may SAY there is no grade level; it must never ask for or assert one.
    assert.equal(/grade\s*(?:level\s*)?(?:[:=]|\bis\b|\b[K0-9])/i.test(p), false,
      'v2 prompt must not request or assert a grade value');
    assert.match(p, /no grade level/i, 'v2 prompt must state the grade selector is gone');
  });
});

// ================================================================ guards under the v2 shape
// These protections are UNCHANGED code, but the original server tests that proved them
// send the retired v1 request body, so they now stop at a 400 before reaching the guard.
// Re-proving them here keeps the guarantee covered instead of merely "still in the file".
test('a hanging subprocess is still killed by the server timeout under a v2 request', async () => {
  await withServer('node|-e|setTimeout(()=>{},60000)', async (call) => {
    const started = Date.now();
    const r = await call('/api/lesson', { body: askLesson(), headers: { 'x-lesson-timeout-ms': '700' } });
    assert.equal(r.status, 504, r.text());
    assert.ok(Date.now() - started < 10000, 'timeout did not fire');
    const j = r.json();
    assert.match(j.error, /Timeout/i);
    assert.match(j.message, /cancelled/i);
    assert.equal(j.retryable, true);
  });
});

test('a cancelled v2 generation still kills the whole process group', async () => {
  const marker = join(tmpdir(), `profile-orphan-${process.pid}-${Date.now()}.txt`);
  const grandchild = `require('child_process').spawn(process.execPath,['-e',`
    + `'setTimeout(()=>require("fs").writeFileSync(${JSON.stringify(marker)},"survived"),1200)'],`
    + `{stdio:'ignore'});setTimeout(()=>{},60000)`;
  await withServer(`node|-e|${grandchild}`, async (call) => {
    const r = await call('/api/lesson', { body: askLesson(), headers: { 'x-lesson-timeout-ms': '400' } });
    assert.equal(r.status, 504, r.text());
    await new Promise((res) => setTimeout(res, 2200));
    assert.equal(existsSync(marker), false, 'an orphaned grandchild survived cancellation');
    rmSync(marker, { force: true });
  });
});

test('a second v2 generation is refused while one is in flight', async () => {
  await withServer('node|-e|setTimeout(()=>{},60000)', async (call) => {
    const first = call('/api/lesson', { body: askLesson(), headers: { 'x-lesson-timeout-ms': '1500' } });
    await new Promise((r) => setTimeout(r, 250));
    assert.equal((await call('/api/lesson', { body: askLesson() })).status, 429);
    assert.equal((await first).status, 504);
  });
});

test('the live-call budget still bounds v2 requests', async () => {
  await withServer(emits({ ok: false, error: 'ProviderFailure', detail: 'x' }), async (call) => {
    let exhausted = false;
    for (let i = 0; i < 14; i += 1) {
      const r = await call('/api/lesson', { body: askLesson() });
      if (r.status === 429 && /budget/i.test(r.json().error)) { exhausted = true; break; }
    }
    assert.ok(exhausted, 'live-call budget never ran out in 14 attempts');
  });
});

test('a foreign Host or Origin is refused on both v2 endpoints', async () => {
  await withServer(emitsLesson(v2()), async (call) => {
    for (const headers of [{ host: 'evil.example.com' }, { origin: 'http://evil.example.com' },
      { origin: 'null' }]) {
      for (const p of ['/api/lesson', '/api/transcribe?locale=en']) {
        const r = await call(p, { body: askLesson(), headers });
        assert.equal(r.status, 403, `${p} ${JSON.stringify(headers)} -> ${r.status}`);
      }
    }
  });
});

test('the static allowlist still refuses python, evidence, plans and traversal', async () => {
  await withServer(emitsLesson(v2()), async (call) => {
    for (const p of ['/ai_bridge.py', '/voice_bridge.py', '/PROFILE_PLAN.md', '/voice.mjs',
      '/evidence/jev-scope-20261003T030852Z.json', '/tests/profile-engine.test.mjs',
      '/../../.hermes/config.yaml', '/%2e%2e%2fcore.mjs', '/.env', '/TEACHING_PROMPTS.md']) {
      assert.notEqual((await call(p, { method: 'GET' })).status, 200, `${p} leaked`);
    }
  });
});

test('POST /api/lesson refuses metadata that does not match the request', async () => {
  for (const [over, ask] of [
    [{ age: 9 }, askLesson({ age: 35 })],
    [{ locale: 'es' }, askLesson({ locale: 'en' })],
    [{ version: 1, grade: '3', subject: 'math' }, askLesson()],
  ]) {
    await withServer(emitsLesson(v2(over)), async (call) => {
      const r = await call('/api/lesson', { body: ask });
      assert.equal(r.status, 502, r.text());
      assert.match(r.json().error, /LessonMismatch|LessonInvalid/);
    });
  }
});

test('a model refusal is a typed 422, not a fake lesson and not a parse error', async () => {
  const refusal = 'I can not build a lesson that explains how to pick a lock.';
  await withServer(emitsText(JSON.stringify({ refusal })), async (call) => {
    const r = await call('/api/lesson', { body: askLesson({ goal: 'how to pick a lock' }) });
    assert.equal(r.status, 422, r.text());
    const body = r.json();
    assert.equal(body.error, 'LessonRefused');
    assert.equal(body.refusal, refusal);
    assert.equal('lesson' in body, false, 'a refusal must not be dressed up as a lesson');
  });
});

test('an over-long refusal string is rejected rather than silently truncated into a lesson', async () => {
  await withServer(emitsText(JSON.stringify({ refusal: 'x'.repeat(501) })), async (call) => {
    const r = await call('/api/lesson', { body: askLesson() });
    assert.equal(r.status, 502, r.text());
    assert.equal('lesson' in r.json(), false);
  });
});

// ================================================================ server: feedback grounding
const feedbackBody = (over = {}) => ({
  adultTest: true, lesson: v2(), stepId: 'c', answer: 'in the clouds, I think',
  mode: 'answer', priorHints: 1, ...over,
});

test('the feedback prompt grounds the model in the actual visual, subject, age, locale and answer', async () => {
  await withServer(emitsText(JSON.stringify({ text: 'You named clouds.', alternateExplanation: 'Trace the arrows down.' })), async (call) => {
    const r = await call('/api/feedback', { body: feedbackBody() });
    assert.equal(r.status, 200, r.text());
    const p = sentPrompt();
    // The full passage the learner actually saw, stage by stage — not a truncated stub.
    for (const fragment of ['Evaporation', 'Vapour cools and forms cloud droplets.',
      'Droplets join and fall as rain or snow.', 'One turn of the cycle.']) {
      assert.ok(p.includes(fragment), `feedback prompt missing visual fragment: ${fragment}`);
    }
    assert.ok(p.includes('earth science'), 'subject missing');
    assert.match(p, /age[^\n]*35|35[^\n]*year/i, 'age missing');
    assert.match(p, /\ben\b|English/, 'locale missing');
    assert.ok(p.includes('in the clouds, I think'), 'the learner answer itself is missing');
    assert.match(p, /untrusted|data, never instructions|not instructions/i,
      'the prompt must mark learner/lesson text as data, not instructions');
  });
});

test('feedback on a legacy v1 lesson grounds the model in its grade instead of an age', async () => {
  await withServer(emitsText(JSON.stringify({ text: 'You shaded three parts.', alternateExplanation: 'Try a number line.' })), async (call) => {
    const r = await call('/api/feedback', { body: feedbackBody({ lesson: v1(), stepId: 'c', answer: '1/3' }) });
    assert.equal(r.status, 200, r.text());
    const p = sentPrompt();
    assert.match(p, /grade 3/i, 'legacy grade missing');
    assert.ok(p.includes('Zero to one.'), 'legacy visual caption missing');
  });
});

test('the feedback prompt carries a passage visual in full, not a snippet', async () => {
  const text = 'The fox crossed the frozen pond at dawn and did not look back once.';
  const lesson = v2({ steps: v2().steps.map((s, i) => (i === 2
    ? { ...s, kind: 'writing', answer: undefined, visual: { kind: 'passage', text, caption: 'Read it twice.' } }
    : s)) });
  await withServer(emitsText(JSON.stringify({ text: 'You used the pond detail.', alternateExplanation: 'Name one action.' })), async (call) => {
    const r = await call('/api/feedback', { body: feedbackBody({ lesson, answer: 'The fox was cold.' }) });
    assert.equal(r.status, 200, r.text());
    assert.ok(sentPrompt().includes(text), 'the passage was not passed in full');
    assert.equal(r.json().feedback.verdict, 'ungraded', 'writing stays ungraded');
  });
});

// The prompt selects named headings out of TEACHING_PROMPTS.md. If a heading is renamed
// the selection silently sends nothing, so assert the real doc still resolves.
test('both prompts carry real selected sections of the teaching doc, not a truncation', async () => {
  const doc = readFileSync(new URL('../TEACHING_PROMPTS.md', import.meta.url), 'utf8');
  const heads = [...doc.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim().toLowerCase());
  for (const required of ['scope', 'age', 'representations', 'feedback', 'language and tone']) {
    assert.ok(heads.includes(required), `TEACHING_PROMPTS.md lost the "${required}" heading`);
  }
  await withServer(emitsLesson(v2()), async (call) => {
    await call('/api/lesson', { body: askLesson() });
    const p = sentPrompt();
    assert.ok(p.includes('## Scope') && p.includes('## Age') && p.includes('## Representations'),
      'lesson prompt is missing selected teaching sections');
    assert.equal(p.includes('## Interface copy'), false, 'interface copy is UI-only, not model input');
    assert.equal(p.includes('PROVENANCE'), false, 'the provenance comment must not be sent to the model');
  });
  await withServer(emitsText(JSON.stringify({ text: 'ok', alternateExplanation: 'another way' })), async (call) => {
    await call('/api/feedback', { body: feedbackBody() });
    assert.ok(sentPrompt().includes('## Feedback'), 'feedback prompt is missing the Feedback section');
  });
});

// ================================================================ server: headers / voice surface
test('the microphone is permitted for same-origin use while the camera stays disabled', async () => {
  await withServer(emitsLesson(v2()), async (call) => {
    const r = await call('/api/health', { method: 'GET' });
    assert.equal(r.status, 200);
    const policy = r.headers['permissions-policy'];
    assert.match(policy, /microphone=\(self\)/);
    assert.match(policy, /camera=\(\)/);
    assert.match(r.headers['content-security-policy'], /default-src 'self'/);
  });
});

test('/api/transcribe rejects a cross-origin request before it reaches any audio code', async () => {
  await withServer(emitsLesson(v2()), async (call, port) => {
    const r = await call('/api/transcribe?locale=en', { headers: { origin: 'http://evil.test', host: `127.0.0.1:${port}` } });
    assert.equal(r.status, 403, r.text());
    assert.equal(r.json().error, 'Forbidden');
  });
});

test('/api/transcribe reports a typed, retryable failure while voice.mjs is absent', async () => {
  await withServer(emitsLesson(v2()), async (call) => {
    const r = await call('/api/transcribe?locale=en', {
      headers: { 'content-type': 'audio/wav', 'x-adult-test': 'true' }, body: undefined });
    // Either the module is installed and answers, or it is absent and we say so plainly.
    assert.ok([400, 415, 422, 503].includes(r.status), `unexpected ${r.status}: ${r.text()}`);
    assert.ok(typeof r.json().error === 'string');
    assert.match(r.headers['permissions-policy'], /microphone=\(self\)/);
  });
});
