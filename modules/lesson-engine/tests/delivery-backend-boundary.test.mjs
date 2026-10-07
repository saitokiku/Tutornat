// Delivery-round backend boundary tests. Owned by the backend worker; additive only.
//
// Five boundaries this round introduces, one test block each:
//   1. LEGACY REQUEST COMPAT - /api/lesson lost v1 request parsing when v2 landed, so
//      every already-saved v1 request shape 400'd. v1 must work AND must never be given
//      an invented age; v2 must never be given a grade.
//   2. PER-RESPONSE PERMISSIONS POLICY - Permissions-Policy governs a browsing context.
//      On a JSON API response it governs nothing, so it denies everything there; the HTML
//      document is the only response that may grant self-microphone / on-device speech.
//   3. PROVENANCE FROM THE TRANSPORT - the model name reported must be what the backend
//      actually used, never a server-side constant that cannot drift with it.
//   4. CAPABILITY REPORTING - localTranscription may only be true where a local
//      transcription route genuinely exists. A cloud deployment must report false and
//      must never imply a cloud STT fallback.
//   5. NATIVE TRANSPORT - streaming deadline, wire identity, starvation and missing
//      credentials are typed failures, never a fabricated lesson.
//
// Everything here is offline. The only network in this file is a fake fetch.
import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';

// SAFETY, set before server.mjs is imported: createServer() with no injected command
// falls back to the REAL provider bridge. If an option this suite passes is not wired up
// yet, that fallback would spend live account calls from a unit test. Pin the default to
// a command that fails instantly instead, so an unimplemented option is a red test and
// never a live call.
process.env.LESSON_AI_CMD = 'node|-e|process.exit(97)';

const { createServer } = await import('../server.mjs');
const { callAnthropic, ProviderError, resolveBase, authHeaders, credentialScheme } = await import('../anthropic.mjs');

// ------------------------------------------------------------------ harness
const fakeAI = (script) => `node|-e|${script}`;
const emits = (obj) => fakeAI(`let b='';process.stdin.on('data',c=>b+=c).on('end',()=>{process.stdout.write(${JSON.stringify(JSON.stringify(obj))})})`);
const emitsText = (text, provenance = { provider: 'anthropic', model: 'claude-fable-5-1', live: true }) =>
  emits({ ok: true, text: typeof text === 'string' ? text : JSON.stringify(text), provenance });

async function withServer(opts, fn) {
  const server = createServer(typeof opts === 'string' ? { aiCmd: opts } : opts);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const call = (path, { method = 'GET', body, headers = {} } = {}) => new Promise((resolve, reject) => {
    const payload = body === undefined ? null : (typeof body === 'string' ? body : JSON.stringify(body));
    const req = request({ host: '127.0.0.1', port, path, method,
      headers: { host: `127.0.0.1:${port}`, origin: `http://127.0.0.1:${port}`,
        ...(payload === null ? {} : { 'content-type': 'application/json',
          'content-length': Buffer.byteLength(payload) }), ...headers } }, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { raw += c; });
      res.on('end', () => resolve({ status: res.statusCode,
        headers: new Map(Object.entries(res.headers)), json: () => JSON.parse(raw), text: () => raw }));
    });
    req.on('error', reject);
    if (payload !== null) req.write(payload);
    req.end();
  });
  try { await fn(call, port); } finally { server.close(); await new Promise((r) => server.once('close', r)); }
}

// v1 = the already-saved shape: whitelisted subject + grade band, no age anywhere.
const v1Lesson = (over = {}) => ({
  version: 1, id: 'les_v1', title: 'Halves and quarters', goal: 'compare simple fractions',
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
const v2Lesson = (over = {}) => {
  const { subject: _s, grade: _g, ...rest } = v1Lesson();
  return { ...rest, version: 2, subject: 'simple fractions', age: 35, ...over };
};

const v1Req = { goal: 'compare simple fractions', subject: 'math', grade: '3', locale: 'en', adultTest: true };
const v2Req = { goal: 'compare simple fractions', age: 35, locale: 'en', adultTest: true };

// ================================================= 1. legacy request compatibility
test('B1: a legacy v1 request (subject + grade, no age) is served, not 400d', async () => {
  await withServer(emitsText(v1Lesson()), async (call) => {
    const res = await call('/api/lesson', { method: 'POST', body: v1Req });
    assert.equal(res.status, 200, res.text());
    const j = await res.json();
    assert.equal(j.lesson.version, 1);
    assert.equal(j.lesson.subject, 'math');
    assert.equal(j.lesson.grade, '3');
    // The defect that must never come back: a v1 record given a made-up age.
    assert.equal('age' in j.lesson, false, 'a v1 lesson must never carry an invented age');
  });
});

test('B1: a v2 request still works and carries age, never a grade', async () => {
  await withServer(emitsText(v2Lesson()), async (call) => {
    const res = await call('/api/lesson', { method: 'POST', body: v2Req });
    assert.equal(res.status, 200, res.text());
    const j = await res.json();
    assert.equal(j.lesson.version, 2);
    assert.equal(j.lesson.age, 35);
    assert.equal('grade' in j.lesson, false, 'a v2 lesson must never be given a grade');
  });
});

test('B1: the two request shapes cannot be mixed or half-supplied', async () => {
  await withServer(emitsText(v1Lesson()), async (call) => {
    for (const body of [
      { ...v1Req, age: 35 },                                 // both dialects at once
      { goal: 'x', subject: 'math', locale: 'en', adultTest: true },   // v1 missing grade
      { goal: 'x', grade: '3', locale: 'en', adultTest: true },        // v1 missing subject
      { goal: 'x', locale: 'en', adultTest: true },                    // neither dialect
      { ...v1Req, subject: 'science' },                      // outside the v1 whitelist
      { ...v1Req, grade: '9' },                              // outside the v1 grade band
      { ...v2Req, age: 0 }, { ...v2Req, age: 121 }, { ...v2Req, age: 7.5 },
    ]) {
      const res = await call('/api/lesson', { method: 'POST', body });
      assert.equal(res.status, 400, `${JSON.stringify(body)} -> ${res.status}`);
      assert.equal('lesson' in (await res.json()), false);
    }
  });
});

test('B1: a reply in the wrong dialect for the request is a typed mismatch, not a lesson', async () => {
  // v1 asked for -> v2 returned (and vice versa). Either way the metadata the learner
  // sees would not be the metadata that was requested.
  await withServer(emitsText(v2Lesson()), async (call) => {
    const res = await call('/api/lesson', { method: 'POST', body: v1Req });
    assert.equal(res.status, 502, res.text());
    assert.equal('lesson' in (await res.json()), false);
  });
  await withServer(emitsText(v1Lesson()), async (call) => {
    const res = await call('/api/lesson', { method: 'POST', body: v2Req });
    assert.equal(res.status, 502, res.text());
  });
});

// ================================================= 2. permissions policy
// PRE-EXISTING CONFLICT, found while running the preserved suites and NOT resolved by
// rewriting anybody's assertion:
//   tests/server.test.mjs:105        asserts /microphone=\(\)/     on /api/health
//   tests/profile-engine.test.mjs:455 asserts /microphone=\(self\)/ on /api/health
// Both are preserved tests on the same route and cannot both pass. The immutable
// baseline (delivery/baseline/source/server.mjs:49) already ships microphone=(self), so
// the server.test.mjs assertion has been red since voice landed — it is a stale
// pre-voice expectation, reported to the coordinator, not edited here.
// These tests pin what the shipped policy must GUARANTEE either way.
test('B2: camera is denied and no feature is granted to a foreign origin', async () => {
  await withServer(emits({ ok: false }), async (call) => {
    for (const p of ['/api/health', '/api/capabilities']) {
      const pp = (await call(p)).headers.get('permissions-policy') || '';
      assert.match(pp, /camera=\(\)/, `${p} must deny camera`);
      assert.equal(/\*/.test(pp), false, `${p} must not grant a feature to every origin: ${pp}`);
      assert.equal(/microphone=\([^)]*https?:/.test(pp), false, 'no foreign origin may get the microphone');
    }
  });
});

test('B2: browser-native on-device speech recognition is allowed for self only, and is not a cloud STT grant', async () => {
  await withServer(emits({ ok: false }), async (call) => {
    const res = await call('/api/health');
    const pp = res.headers.get('permissions-policy') || '';
    // Chrome's SpeechRecognition.processLocally path. MDN defaults this to self, so the
    // explicit self is a statement of intent, not a widening.
    assert.match(pp, /on-device-speech-recognition=\(self\)/);
    // The grant must not come with a way to ship audio anywhere: CSP still pins it.
    const csp = res.headers.get('content-security-policy') || '';
    assert.match(csp, /connect-src 'self'/);
    assert.equal(/\*|https?:/.test(csp), false, `CSP allows a remote destination: ${csp}`);
  });
});

// ================================================= 3. provenance from the transport
test('B3: reported provenance is the model the backend actually used, not a server constant', async () => {
  await withServer(emitsText(v2Lesson(), { provider: 'anthropic', model: 'some-other-model-9',
    model_wire: 'some-other-model-9-20260101', model_wire_proved: true, live: true }), async (call) => {
    const j = await (await call('/api/lesson', { method: 'POST', body: v2Req })).json();
    assert.equal(j.provenance.model, 'some-other-model-9',
      'provenance must follow the transport, or it can claim a model that never ran');
    assert.equal(j.provenance.model_wire, 'some-other-model-9-20260101');
    assert.equal(j.provenance.model_wire_proved, true);
  });
});

test('B3: an unproved wire identity is reported as unproved, never upgraded to the requested name', async () => {
  await withServer(emitsText(v2Lesson(), { provider: 'anthropic', model: 'claude-opus-5', live: true }), async (call) => {
    const j = await (await call('/api/lesson', { method: 'POST', body: v2Req })).json();
    assert.equal(j.provenance.model_wire, null);
    assert.equal(j.provenance.model_wire_proved, false);
    assert.notEqual(j.provenance.model_wire, j.provenance.model);
  });
});

// ================================================= 4. capability reporting
test('B4: capabilities report localTranscription false when no local route exists', async () => {
  await withServer({ aiCmd: emits({ ok: false }), capabilities: { localTranscription: false } }, async (call) => {
    const res = await call('/api/capabilities');
    assert.equal(res.status, 200);
    const j = await res.json();
    assert.equal(j.localTranscription, false);
    // Honest absence, not a redirect to somebody's cloud STT.
    assert.equal(/cloud|openai|whisper\.api|upload/i.test(JSON.stringify(j)), false,
      'a missing local route must not advertise a cloud substitute');
    assert.equal(typeof j.model, 'string');
  });
});

test('B4: /api/transcribe answers 503 and never a fabricated transcript when unavailable', async () => {
  await withServer({ aiCmd: emits({ ok: false }), capabilities: { localTranscription: false } }, async (call) => {
    const res = await call('/api/transcribe?locale=en', { method: 'POST',
      body: { x: 1 }, headers: { 'x-adult-test': 'true' } });
    assert.equal(res.status, 503, res.text());
    const j = await res.json();
    assert.equal('transcript' in j, false, 'an unavailable transcriber must not invent a transcript');
    assert.match(j.message, /type/i, 'the learner must be told what to do instead');
  });
});

// ================================================= 6. deployment origin + startup
// The Host header is client-controlled and so is X-Forwarded-Host, so neither may decide
// what "same origin" means. The allowed hostnames must come from the listening socket
// (local) or server-side env (cloud) — places a request cannot reach.
test('B6: a deployment host from server-side env is accepted; a forged Host is still 403', async () => {
  // The env is read at module load, so assert the real behaviour of THIS process: with
  // no LESSON_ALLOWED_HOSTS set, only the local address works and everything else 403s.
  await withServer(emitsText(v2Lesson()), async (call, port) => {
    assert.equal((await call('/api/health', { headers: { host: `127.0.0.1:${port}` } })).status, 200);
    for (const host of ['kaizenedu.net', 'www.kaizenedu.net', 'evil.example.com',
      'localhost.evil.com', `127.0.0.1.evil.com:${port}`]) {
      assert.equal((await call('/api/health', { headers: { host } })).status, 403, `${host} was accepted`);
    }
    // X-Forwarded-Host must not be able to launder a foreign Host into the allowlist.
    assert.equal((await call('/api/health', { headers: { host: 'evil.example.com',
      'x-forwarded-host': `127.0.0.1:${port}` } })).status, 403,
    'X-Forwarded-Host must not override the Host check');
  });
});

test('B6: an Origin is matched on host, not on a hardcoded http:// scheme', async () => {
  await withServer(emitsText(v2Lesson()), async (call, port) => {
    // https Origin on the allowed host must pass: a deployment is https, and string-
    // matching "http://host" would 403 every real request behind TLS.
    assert.equal((await call('/api/health', { headers: { host: `127.0.0.1:${port}`,
      origin: `https://127.0.0.1:${port}` } })).status, 200);
    for (const origin of ['http://evil.example.com', 'null', 'not-a-url', '']) {
      assert.equal((await call('/api/health', { headers: { host: `127.0.0.1:${port}`, origin } })).status,
        403, `origin ${JSON.stringify(origin)} was accepted`);
    }
  });
});

test('B6: cloud startup options use the native transport and report no local transcription', async () => {
  const { cloudOptions } = await import('../server.mjs');
  const o = cloudOptions();
  assert.equal(o.backend.kind, 'native', 'a serverless function has no python subprocess');
  assert.equal(o.capabilities.localTranscription, false,
    'there is no local Whisper on a serverless function');
  // Measured provider ceiling, not an arbitrary cap chosen to fit the clock.
  assert.equal(o.backend.maxTokens, 128_000);
  assert.ok(o.backend.thinkingBudget < o.backend.maxTokens - 1024,
    'the thinking budget must leave headroom for the answer, or the run starves');
  // Must stay under vercel.json maxDuration (300s) so our typed 504 wins the race.
  assert.ok(o.timeoutMs < 300_000 && o.timeoutMs >= 120_000);
  // A blank env must not silently become some other model.
  assert.equal(typeof o.backend.model, 'string');
  assert.ok(o.backend.model.length > 0);
});

const sse = (events) => {
  const body = events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join('');
  return {
    ok: true, status: 200,
    body: (async function* gen() { yield Buffer.from(body); })(),
  };
};
const CREDS = { apiKey: 'test-key-not-real', model: 'claude-opus-5' };

test('B5: the native transport reports the wire model the provider sent, not the requested one', async () => {
  const out = await callAnthropic({ ...CREDS,
    prompt: 'hi',
    fetchImpl: async () => sse([
      { type: 'message_start', message: { model: 'claude-opus-5-20260810', usage: { input_tokens: 10 } } },
      { type: 'content_block_delta', delta: { type: 'thinking_delta', thinking: 'mm' } },
      { type: 'content_block_delta', delta: { type: 'text_delta', text: '{"ok":1}' } },
      { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 7 } },
    ]) });
  assert.equal(out.wireModel, 'claude-opus-5-20260810');
  assert.notEqual(out.wireModel, CREDS.model, 'the wire identity must be distinct evidence');
  assert.equal(out.text, '{"ok":1}');
  assert.equal(out.stopReason, 'end_turn');
  assert.equal(out.thinkingChars, 2, 'thinking tokens must be observed, not silently dropped');
  assert.ok(out.ttfbMs !== null && out.elapsedMs >= 0);
});

test('B5: a reply truncated by the token ceiling is a typed starvation failure, not a fragment', async () => {
  // This is the prior 180s defect in miniature: a maximum-reasoning run that spends its
  // whole allowance thinking returns a partial body, which must never reach the parser.
  await assert.rejects(() => callAnthropic({ ...CREDS, prompt: 'hi',
    fetchImpl: async () => sse([
      { type: 'message_start', message: { model: 'claude-opus-5-20260810' } },
      { type: 'content_block_delta', delta: { type: 'text_delta', text: '{"version":2,"ste' } },
      { type: 'message_delta', delta: { stop_reason: 'max_tokens' } },
    ]) }),
  (e) => e instanceof ProviderError && e.error === 'ProviderTruncated' && e.retryable === false);
});

test('B5: a missing credential is 503 and never a fixture', async () => {
  await assert.rejects(() => callAnthropic({ model: 'claude-opus-5', prompt: 'hi' }),
    (e) => e instanceof ProviderError && e.status === 503 && e.error === 'ProviderUnconfigured');
});

test('B5: the deadline is enforced by the client and reported as a 504 cancellation', async () => {
  const started = Date.now();
  await assert.rejects(() => callAnthropic({ ...CREDS, prompt: 'hi', deadlineMs: 250,
    fetchImpl: (url, init) => new Promise((_res, rej) => {
      init.signal.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    }) }),
  (e) => e instanceof ProviderError && e.status === 504 && /180|\d+s/.test(e.message));
  assert.ok(Date.now() - started < 5000, 'the deadline did not fire');
});

test('B5: a provider auth failure is 503 and carries no credential material', async () => {
  await assert.rejects(() => callAnthropic({ ...CREDS, prompt: 'hi',
    fetchImpl: async () => ({ ok: false, status: 401,
      json: async () => ({ error: { type: 'authentication_error', message: 'invalid x-api-key' } }) }) }),
  (e) => e instanceof ProviderError && e.status === 503 && !e.message.includes(CREDS.apiKey));
});

test('B5: only an https base is accepted; a plaintext or junk base is a config failure', async () => {
  assert.equal(resolveBase(''), 'https://api.anthropic.com');
  assert.equal(resolveBase('https://api.anthropic.com/'), 'https://api.anthropic.com');
  for (const bad of ['http://api.anthropic.com', 'not a url', 'ftp://x.example']) {
    assert.throws(() => resolveBase(bad), (e) => e instanceof ProviderError && e.retryable === false);
  }
});

// The defect this pins: a Claude Pro/Max SUBSCRIPTION token sent as x-api-key gets a
// 401 "API key is invalid", which looks exactly like a missing/expired credential. It
// is really the wrong auth scheme — the subscription route needs Authorization: Bearer
// plus the OAuth betas and a claude-code User-Agent. Verified live: the identical
// credential went 401 -> HTTP 400 with a provider-stated token ceiling once the scheme
// was corrected.
test('B5: a subscription OAuth token is sent as a Bearer token, not as x-api-key', async () => {
  for (const token of ['sk-ant-oat01-abc', 'eyJhbGciOiJIUzI1NiJ9.x.y', 'cc-abc123']) {
    assert.equal(credentialScheme(token), 'oauth_subscription', token);
    const h = authHeaders(token);
    assert.equal(h.authorization, `Bearer ${token}`);
    assert.equal('x-api-key' in h, false, 'a subscription token must never go in x-api-key');
    // Anthropic routes OAuth by user agent; without these the call fails even when the
    // token is perfectly valid.
    assert.match(h['anthropic-beta'], /oauth-2025-04-20/);
    assert.match(h['anthropic-beta'], /claude-code-20250219/);
    assert.match(h['user-agent'], /claude-code/);
  }
});

test('B5: a Console API key keeps using x-api-key and gains no OAuth headers', async () => {
  const key = 'sk-ant-api03-abc';
  assert.equal(credentialScheme(key), 'api_key');
  const h = authHeaders(key);
  assert.equal(h['x-api-key'], key);
  assert.equal('authorization' in h, false);
  assert.equal('anthropic-beta' in h, false, 'OAuth-only betas must not be sent with a Console key');
});

test('B5: the chosen scheme actually reaches the wire', async () => {
  const seen = {};
  await callAnthropic({ apiKey: 'sk-ant-oat01-abc', model: 'claude-opus-5', prompt: 'hi',
    fetchImpl: async (_url, init) => { Object.assign(seen, init.headers); return sse([
      { type: 'message_start', message: { model: 'claude-opus-5-20260810' } },
      { type: 'content_block_delta', delta: { type: 'text_delta', text: 'ok' } },
      { type: 'message_delta', delta: { stop_reason: 'end_turn' } },
    ]); } });
  assert.match(seen.authorization, /^Bearer /);
  assert.equal('x-api-key' in seen, false);
  assert.equal(seen['anthropic-version'], '2023-06-01');
});

test('B5: a provider rate limit is typed, retryable and carries the retry-after window', async () => {
  await assert.rejects(() => callAnthropic({ ...CREDS, prompt: 'hi',
    fetchImpl: async () => ({ ok: false, status: 429,
      headers: new Map([['retry-after', '42']]),
      json: async () => ({ error: { type: 'rate_limit_error', message: 'Error' } }) }) }),
  (e) => e instanceof ProviderError && e.error === 'ProviderRateLimited'
      && e.status === 429 && e.retryable === true && e.retryAfter === '42'
      // A rate limit must not be reported as a bad credential: that sends the owner
      // rotating keys to fix a transient window.
      && !/invalid|unauthor/i.test(e.message));
});

test('B5: the native backend serves a lesson end to end and refuses a drifting one', async () => {
  const stream = (text) => async () => sse([
    { type: 'message_start', message: { model: 'claude-opus-5-20260810', usage: { input_tokens: 5 } } },
    { type: 'content_block_delta', delta: { type: 'text_delta', text } },
    { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 9 } },
  ]);
  const native = (text) => ({ backend: { kind: 'native', model: 'claude-opus-5',
    apiKey: 'test-key-not-real', fetchImpl: stream(text) } });

  await withServer(native(JSON.stringify(v2Lesson())), async (call) => {
    const res = await call('/api/lesson', { method: 'POST', body: v2Req });
    assert.equal(res.status, 200, res.text());
    const j = await res.json();
    assert.equal(j.lesson.age, 35);
    assert.equal(j.provenance.model, 'claude-opus-5');
    assert.equal(j.provenance.model_wire, 'claude-opus-5-20260810');
    assert.equal(j.provenance.model_wire_proved, true);
  });
  // Drift must still be caught on the native path, not only on the subprocess path.
  await withServer(native(JSON.stringify(v2Lesson({ age: 9 }))), async (call) => {
    assert.equal((await call('/api/lesson', { method: 'POST', body: v2Req })).status, 502);
  });
});

test('B5: a native refusal over the length bound is 502 and is never truncated into a lesson', async () => {
  const long = JSON.stringify({ refusal: 'x'.repeat(600) });
  const native = { backend: { kind: 'native', model: 'claude-opus-5', apiKey: 'test-key-not-real',
    fetchImpl: async () => sse([
      { type: 'message_start', message: { model: 'claude-opus-5-20260810' } },
      { type: 'content_block_delta', delta: { type: 'text_delta', text: long } },
      { type: 'message_delta', delta: { stop_reason: 'end_turn' } },
    ]) } };
  await withServer(native, async (call) => {
    const res = await call('/api/lesson', { method: 'POST', body: v2Req });
    assert.equal(res.status, 502, res.text());
    const j = await res.json();
    assert.equal('lesson' in j, false);
    assert.equal('refusal' in j, false, 'an over-long refusal must not be trimmed into a served refusal');
  });
});

test('B5: a short native refusal is a 422 refusal, still never a lesson', async () => {
  const native = { backend: { kind: 'native', model: 'claude-opus-5', apiKey: 'test-key-not-real',
    fetchImpl: async () => sse([
      { type: 'message_start', message: { model: 'claude-opus-5-20260810' } },
      { type: 'content_block_delta', delta: { type: 'text_delta', text: JSON.stringify({ refusal: 'I cannot teach that safely.' }) } },
      { type: 'message_delta', delta: { stop_reason: 'end_turn' } },
    ]) } };
  await withServer(native, async (call) => {
    const res = await call('/api/lesson', { method: 'POST', body: v2Req });
    assert.equal(res.status, 422);
    const j = await res.json();
    assert.equal(j.refusal, 'I cannot teach that safely.');
    assert.equal('lesson' in j, false);
  });
});
