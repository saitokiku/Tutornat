// HTTP boundary tests for server.mjs. The AI subprocess is replaced by an INJECTED
// fake (env LESSON_AI_CMD) so these stay deterministic and offline; live provider
// behaviour is proven separately in evidence/, not here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer, PORT } from '../server.mjs';

const fixtureLesson = (over = {}) => ({
  version: 1, id: 'les_t', title: 'Halves and quarters', goal: 'compare simple fractions',
  subject: 'math', grade: '3', locale: 'en', intro: 'We shade parts of a bar.',
  steps: [
    { id: 'a', prompt: 'How much of the bar is shaded?', explanation: 'Three of four parts.',
      hint: 'Count the shaded parts.', kind: 'numeric', answer: '3/4',
      visual: { kind: 'fraction', parts: 4, filled: 3, caption: 'Three of four shaded.' } },
    { id: 'b', prompt: 'Shade one more part. How much now?', explanation: 'All four parts.',
      hint: 'Four of four is one whole.', kind: 'numeric', answer: '1',
      visual: { kind: 'fraction', parts: 4, filled: 4, caption: 'All four shaded.' } },
    { id: 'c', prompt: 'Which is larger, one half or one third?', explanation: 'Halves are bigger.',
      hint: 'Fewer parts means bigger parts.', kind: 'choice', choices: ['1/2', '1/3'], answer: '1/2',
      visual: { kind: 'numberline', min: 0, max: 1, value: 0.5, caption: 'Zero to one.' } },
  ],
  path: { reinforce: { goal: 'shade halves and thirds', reason: 'Rebuild part-whole sense.' },
    advance: { goal: 'add fractions with like denominators', reason: 'Parts look secure.' } },
  ...over,
});

const okReq = { goal: 'compare simple fractions', subject: 'math', grade: '3', locale: 'en', adultTest: true };

// Fake AI: `node -e <script>` reading stdin, so the real subprocess contract (argv mode,
// stdin JSON, one stdout JSON object, exit code, timeout) is exercised end to end.
function fakeAI(script) { return `node|-e|${script}`; }
const emits = (obj) => fakeAI(`let b='';process.stdin.on('data',c=>b+=c).on('end',()=>{process.stdout.write(${JSON.stringify(JSON.stringify(obj))})})`);
const emitsLesson = (lesson) => emits({ ok: true, text: JSON.stringify(lesson),
  provenance: { provider: 'anthropic', model: 'claude-fable-5-1', model_wire: 'claude-fable-5-1-20260101', model_wire_proved: true, live: true } });

async function withServer(aiCmd, fn) {
  const server = createServer({ aiCmd });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  // Raw node:http, not fetch(): fetch forbids setting Host, and spoofed Host is exactly
  // what these tests must exercise.
  const call = (path, { method = 'GET', body, headers = {} } = {}) => new Promise((resolve, reject) => {
    const payload = body === undefined ? null : (typeof body === 'string' ? body : JSON.stringify(body));
    const req = request({ host: '127.0.0.1', port, path, method,
      headers: { host: `127.0.0.1:${port}`, origin: `http://127.0.0.1:${port}`,
        ...(payload === null ? {} : { 'content-type': 'application/json',
          'content-length': Buffer.byteLength(payload) }), ...headers } }, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { raw += c; });
      res.on('end', () => resolve({ status: res.statusCode, headers: new Map(Object.entries(res.headers)),
        json: () => JSON.parse(raw), text: () => raw }));
    });
    req.on('error', reject);
    if (payload !== null) req.write(payload);
    req.end();
  });
  try { await fn(call, port); } finally { server.close(); await new Promise((r) => server.once('close', r)); }
}

// ------------------------------------------------------------------ health
test('default port matches the agreed launch target', () => assert.equal(PORT, 51202));

test('GET /api/health reports mode and model without proving the provider', async () => {
  await withServer(emits({ ok: false }), async (call) => {
    const res = await call('/api/health');
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true, mode: 'owner-test', model: 'claude-fable-5-1' });
  });
});

// ------------------------------------------------------------------ static safety
test('static routes serve only the five allowlisted files', async () => {
  await withServer(emits({ ok: false }), async (call) => {
    for (const p of ['/', '/index.html', '/app.mjs', '/styles.css', '/core.mjs', '/vendor/math-expr.mjs']) {
      const res = await call(p);
      assert.ok([200, 404].includes(res.status), `${p} -> ${res.status}`);
      if (res.status === 200) assert.ok((res.headers.get('content-type') || '').match(/html|javascript|css/));
    }
  });
});

test('static routes never serve python, evidence, secrets or traversal paths', async () => {
  await withServer(emits({ ok: false }), async (call) => {
    for (const p of ['/ai_bridge.py', '/PLAN.md', '/evidence/jev.json', '/tests/core.test.mjs',
      '/../../.hermes/config.yaml', '/%2e%2e%2fcore.mjs', '/..%5ccore.mjs', '/vendor/',
      '/core.mjs/../ai_bridge.py', '/.env', '/node_modules/x', '//etc/passwd']) {
      const res = await call(p);
      assert.equal(res.status === 200, false, `${p} leaked (${res.status})`);
    }
  });
});

test('responses carry a same-origin CSP and disable camera and microphone', async () => {
  await withServer(emits({ ok: false }), async (call) => {
    const h = (await call('/api/health')).headers;
    const csp = h.get('content-security-policy') || '';
    assert.match(csp, /default-src 'self'/);
    assert.equal(/\*|https?:/.test(csp), false, `CSP allows remote assets: ${csp}`);
    assert.match(h.get('permissions-policy') || '', /camera=\(\)/);
    assert.match(h.get('permissions-policy') || '', /microphone=\(\)/);
    assert.equal(h.get('access-control-allow-origin'), undefined);
    assert.equal(h.get('x-content-type-options'), 'nosniff');
  });
});

test('requests with a foreign Host or Origin are refused', async () => {
  await withServer(emitsLesson(fixtureLesson()), async (call) => {
    for (const headers of [{ host: 'evil.example.com' }, { host: 'localhost.evil.com:51202' },
      { origin: 'http://evil.example.com' }, { origin: 'null' }]) {
      const res = await call('/api/lesson', { method: 'POST', body: okReq, headers });
      assert.equal(res.status, 403, `${JSON.stringify(headers)} -> ${res.status}`);
    }
  });
});

test('unknown API paths and wrong methods are typed errors, not lessons', async () => {
  await withServer(emitsLesson(fixtureLesson()), async (call) => {
    assert.equal((await call('/api/nope')).status, 404);
    assert.equal((await call('/api/lesson')).status, 405);
    assert.equal((await call('/api/health', { method: 'POST', body: {} })).status, 405);
  });
});

// ------------------------------------------------------------------ request validation
test('POST /api/lesson rejects bad content type, oversized and malformed bodies', async () => {
  await withServer(emitsLesson(fixtureLesson()), async (call) => {
    assert.equal((await call('/api/lesson', { method: 'POST', body: JSON.stringify(okReq),
      headers: { 'content-type': 'text/plain' } })).status, 415);
    assert.equal((await call('/api/lesson', { method: 'POST', body: '{not json' })).status, 400);
    assert.equal((await call('/api/lesson', { method: 'POST',
      body: JSON.stringify({ ...okReq, goal: 'x'.repeat(40000) }) })).status, 413);
  });
});

test('POST /api/lesson requires adultTest and a valid goal, subject, grade and locale', async () => {
  await withServer(emitsLesson(fixtureLesson()), async (call) => {
    for (const body of [
      { ...okReq, adultTest: undefined }, { ...okReq, adultTest: 'yes' }, { ...okReq, adultTest: false },
      { ...okReq, goal: '' }, { ...okReq, goal: 'x'.repeat(301) }, { ...okReq, goal: 42 },
      { ...okReq, subject: 'science' }, { ...okReq, grade: '9' }, { ...okReq, grade: 3 },
      { ...okReq, locale: 'fr' }, { ...okReq, previous: { goal: 'x' } },
    ]) {
      const res = await call('/api/lesson', { method: 'POST', body });
      assert.equal(res.status, 400, `${JSON.stringify(body)} -> ${res.status}`);
      const j = await res.json();
      assert.ok(j.error && j.message, 'error must be typed');
      assert.equal('lesson' in j, false, 'a rejected request must not get a lesson');
    }
  });
});

// ------------------------------------------------------------------ AI output handling
test('POST /api/lesson returns a validated lesson with live provenance', async () => {
  await withServer(emitsLesson(fixtureLesson()), async (call) => {
    const res = await call('/api/lesson', { method: 'POST', body: okReq });
    assert.equal(res.status, 200);
    const j = await res.json();
    assert.equal(j.lesson.steps.length, 3);
    assert.equal(j.provenance.live, true);
    assert.equal(j.provenance.model, 'claude-fable-5-1');
    assert.ok(j.provenance.provider);
  });
});

test('POST /api/lesson refuses a lesson whose subject, grade or locale drifts from the request', async () => {
  for (const drift of [{ subject: 'english' }, { grade: '5' }, { locale: 'es' }]) {
    await withServer(emitsLesson(fixtureLesson(drift)), async (call) => {
      const res = await call('/api/lesson', { method: 'POST', body: okReq });
      assert.equal(res.status, 502, `${JSON.stringify(drift)} -> ${res.status}`);
      assert.equal('lesson' in (await res.json()), false);
    });
  }
});

test('malformed, refused or empty AI output is a typed error and never a fabricated lesson', async () => {
  const cases = [
    ['prose instead of JSON', emits({ ok: true, text: 'I cannot help with that.', provenance: { live: true } })],
    ['an invalid lesson shape', emits({ ok: true, text: JSON.stringify({ version: 1, steps: [] }), provenance: { live: true } })],
    ['duplicate prompts', emits({ ok: true, text: JSON.stringify((() => { const l = fixtureLesson(); l.steps[2].prompt = l.steps[0].prompt; return l; })()), provenance: { live: true } })],
    ['a bridge failure', emits({ ok: false, error: 'ProviderFailure', detail: 'overloaded' })],
    ['empty stdout', fakeAI('process.stdout.write("")')],
    ['non-JSON stdout', fakeAI('process.stdout.write("<html>502</html>")')],
    ['a nonzero exit', fakeAI('process.exit(3)')],
    ['a crash', fakeAI('throw new Error("boom")')],
  ];
  for (const [label, cmd] of cases) {
    await withServer(cmd, async (call) => {
      const res = await call('/api/lesson', { method: 'POST', body: okReq });
      assert.ok(res.status >= 500, `${label} -> ${res.status}`);
      const j = await res.json();
      assert.ok(j.error, `${label} must be typed`);
      assert.equal('lesson' in j, false, `${label} fabricated a lesson`);
    });
  }
});

test('a hanging subprocess is killed by the server timeout, not left in flight', async () => {
  await withServer(fakeAI('setTimeout(()=>{},60000)'), async (call) => {
    const started = Date.now();
    const res = await call('/api/lesson', { method: 'POST', body: okReq, headers: { 'x-lesson-timeout-ms': '700' } });
    assert.equal(res.status, 504);
    assert.ok(Date.now() - started < 10000, 'timeout did not fire');
    assert.match((await res.json()).error, /Timeout/i);
  });
});

test('a cancelled generation kills the whole process group, leaving no live call running', async () => {
  // The real bridge is wrapper -> python. Simulate it: parent spawns a grandchild that
  // writes a marker file if it survives past the cancellation.
  const marker = join(tmpdir(), `lesson-orphan-${process.pid}-${Date.now()}.txt`);
  const grandchild = `require('child_process').spawn(process.execPath,['-e',`
    + `'setTimeout(()=>require("fs").writeFileSync(${JSON.stringify(marker)},"survived"),1200)'],`
    + `{stdio:'ignore'});setTimeout(()=>{},60000)`;
  await withServer(fakeAI(grandchild), async (call) => {
    const res = await call('/api/lesson', { method: 'POST', body: okReq, headers: { 'x-lesson-timeout-ms': '400' } });
    assert.equal(res.status, 504);
    const j = await res.json();
    assert.match(j.message, /cancelled/i);
    assert.match(j.message, /\d+s/, 'the failure must name its bound');
    assert.equal(j.retryable, true);
    await new Promise((r) => setTimeout(r, 2200));
    assert.equal(existsSync(marker), false, 'an orphaned grandchild survived cancellation');
  });
});

test('a second generation is refused while one is in flight', async () => {
  await withServer(fakeAI('setTimeout(()=>{},60000)'), async (call) => {
    const first = call('/api/lesson', { method: 'POST', body: okReq, headers: { 'x-lesson-timeout-ms': '1500' } });
    await new Promise((r) => setTimeout(r, 250));
    const second = await call('/api/lesson', { method: 'POST', body: okReq });
    assert.equal(second.status, 429);
    assert.equal((await first).status, 504);
  });
});

test('the live-call budget is finite and reports exhaustion instead of silently serving', async () => {
  await withServer(emits({ ok: false, error: 'ProviderFailure', detail: 'x' }), async (call) => {
    let exhausted = false;
    for (let i = 0; i < 14; i += 1) {
      const res = await call('/api/lesson', { method: 'POST', body: okReq });
      if (res.status === 429 && /budget/i.test((await res.json()).error)) { exhausted = true; break; }
    }
    assert.ok(exhausted, 'live-call budget never ran out in 14 attempts');
  });
});

// ------------------------------------------------------------------ feedback
const feedbackCmd = (text, verdict) => emits({ ok: true,
  text: JSON.stringify({ text, verdict, alternateExplanation: 'Try shading the bar instead of counting.' }),
  provenance: { provider: 'anthropic', model: 'claude-fable-5-1', live: true } });

test('POST /api/feedback grades locally and the model cannot overturn the verdict', async () => {
  const lesson = fixtureLesson();
  await withServer(feedbackCmd('Looks right to me!', 'correct'), async (call) => {
    const res = await call('/api/feedback', { method: 'POST', body: { adultTest: true, lesson,
      stepId: 'a', answer: '1/4', mode: 'answer', priorHints: 0 } });
    assert.equal(res.status, 200);
    const j = await res.json();
    assert.equal(j.feedback.verdict, 'incorrect');       // local check is canonical
    assert.equal(j.feedback.nextAction, 'retry');
    assert.ok(j.feedback.alternateExplanation.length > 0);
    assert.notEqual(j.feedback.alternateExplanation, lesson.steps[0].explanation);
  });
});

test('POST /api/feedback marks a correct answer continue', async () => {
  await withServer(feedbackCmd('Yes — four of four is one whole.', 'correct'), async (call) => {
    const res = await call('/api/feedback', { method: 'POST', body: { adultTest: true,
      lesson: fixtureLesson(), stepId: 'b', answer: '1', mode: 'answer', priorHints: 0 } });
    assert.equal((await res.json()).feedback.verdict, 'correct');
  });
});

test('POST /api/feedback keeps writing ungraded whatever the model claims', async () => {
  const lesson = fixtureLesson();
  lesson.steps[2] = { id: 'c', prompt: 'Write one sentence about the fox.', explanation: 'Look for a verb.',
    hint: 'Start with "The fox".', kind: 'writing',
    visual: { kind: 'passage', text: 'The fox slept.', caption: 'Read first.' } };
  await withServer(feedbackCmd('Great sentence, correct!', 'correct'), async (call) => {
    const res = await call('/api/feedback', { method: 'POST', body: { adultTest: true, lesson,
      stepId: 'c', answer: 'The fox slept by the wall.', mode: 'answer', priorHints: 0 } });
    const j = await res.json();
    assert.equal(j.feedback.verdict, 'ungraded');
    assert.ok(j.feedback.text.length > 0);
  });
});

test('POST /api/feedback validates its own inputs and rejects a forged lesson', async () => {
  const lesson = fixtureLesson();
  await withServer(feedbackCmd('ok', 'correct'), async (call) => {
    for (const body of [
      { adultTest: false, lesson, stepId: 'a', answer: '1', mode: 'answer', priorHints: 0 },
      { adultTest: true, lesson, stepId: 'zz', answer: '1', mode: 'answer', priorHints: 0 },
      { adultTest: true, lesson, stepId: 'a', answer: 'x'.repeat(1501), mode: 'answer', priorHints: 0 },
      { adultTest: true, lesson, stepId: 'a', answer: '1', mode: 'solve', priorHints: 0 },
      { adultTest: true, lesson, stepId: 'a', answer: '1', mode: 'answer', priorHints: 9 },
      { adultTest: true, lesson, stepId: 'a', answer: '1', mode: 'answer', priorHints: -1 },
      { adultTest: true, lesson: { ...lesson, version: 2 }, stepId: 'a', answer: '1', mode: 'answer', priorHints: 0 },
      { adultTest: true, stepId: 'a', answer: '1', mode: 'answer', priorHints: 0 },
    ]) {
      const res = await call('/api/feedback', { method: 'POST', body });
      assert.equal(res.status, 400, `${JSON.stringify(body).slice(0, 80)} -> ${res.status}`);
      assert.equal('feedback' in (await res.json()), false);
    }
  });
});

test('a feedback bridge failure is typed and never a default half-credit verdict', async () => {
  await withServer(emits({ ok: false, error: 'ProviderFailure', detail: 'x' }), async (call) => {
    const res = await call('/api/feedback', { method: 'POST', body: { adultTest: true,
      lesson: fixtureLesson(), stepId: 'a', answer: '3/4', mode: 'answer', priorHints: 0 } });
    assert.ok(res.status >= 500);
    const j = await res.json();
    assert.ok(j.error);
    assert.equal('feedback' in j, false);
    assert.equal(JSON.stringify(j).includes('0.5'), false);
  });
});
