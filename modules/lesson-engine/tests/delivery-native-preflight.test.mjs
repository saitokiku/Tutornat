// Native-deployment trust-boundary + request-buffering preflight.
//
// Every test here pins a defect that was READ in the source, not imagined: each one is a
// way the native (serverless) path could hand a learner a lesson it cannot prove, or
// send a Claude Pro/Max credential somewhere it was never configured to go.
//
// No live provider call is made anywhere in this file. Every transport test drives a
// captured fetch, so "which URL, with which headers, how many times" is an assertion
// rather than a hope.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { request as httpRequest } from 'node:http';

const { callAnthropic, ProviderError, resolveBase } = await import('../anthropic.mjs');
const { readBody, cloudOptions, createServer } = await import('../server.mjs');

// Start a server on loopback and talk to it with chosen headers. The deployment host is
// read from env per request, so one process can exercise both local and deployed shapes
// without re-importing the module (a re-import would trip its deploy-time auto-listen).
async function withHeaders(envPatch, backend, body) {
  // Raw node:http, not fetch: undici treats `host` as a forbidden header and silently
  // substitutes the real one, so a fetch-based harness can never forge the Host a
  // same-origin check is supposed to reject.
  const prior = Object.fromEntries(Object.keys(envPatch).map((k) => [k, process.env[k]]));
  for (const [k, v] of Object.entries(envPatch)) {
    if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
  const server = createServer(backend || {});
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const call = (headers, { path = '/api/health', method = 'GET', payload = null } = {}) =>
    new Promise((resolve, reject) => {
      const req = httpRequest({ host: '127.0.0.1', port, path, method, headers }, (res) => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (c) => { raw += c; });
        res.on('end', () => resolve({ status: res.statusCode, json: () => JSON.parse(raw), raw }));
      });
      req.on('error', reject);
      req.end(payload);
    });
  try {
    await body(call, port);
  } finally {
    await new Promise((r) => server.close(r));
    for (const [k, v] of Object.entries(prior)) {
      if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
  }
}

const CREDS = { apiKey: 'sk-ant-api-test-not-a-real-key', model: 'claude-opus-5' };
const sse = (events) => ({
  ok: true, status: 200,
  body: (async function* gen() { yield Buffer.from(events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join('')); })(),
});
const okStream = (text = 'ok', model = 'claude-opus-5-20260810', stop = 'end_turn') => sse([
  { type: 'message_start', message: { model } },
  { type: 'content_block_delta', delta: { type: 'text_delta', text } },
  ...(stop ? [{ type: 'message_delta', delta: { stop_reason: stop } }] : []),
]);

// ---------------------------------------------------------------- (1) endpoint identity
// The credential is the whole stake. resolveBase previously accepted ANY https URL and
// ANY path, so a single mistyped or hostile env var would POST a subscription token to
// another origin — and the transport would report that as a normal lesson.
test('P1: the canonical endpoint is the only URL the credential is ever sent to', async () => {
  const calls = [];
  await callAnthropic({ ...CREDS, prompt: 'hi',
    fetchImpl: async (url, init) => { calls.push({ url, init }); return okStream('{"ok":1}'); } });
  assert.equal(calls.length, 1, 'exactly one attempt, no retry and no fallback host');
  assert.equal(calls[0].url, 'https://api.anthropic.com/v1/messages',
    'the default base must resolve to exactly one /v1/messages');
});

test('P1: an explicit /v1 base still yields exactly one /v1/messages, never a doubled path', async () => {
  // The accepted documented spelling. Appending /v1/messages to a base that already ends
  // in /v1 produced https://api.anthropic.com/v1/v1/messages: a 404 reported as a
  // provider failure, which sends the owner debugging the model instead of the config.
  assert.equal(resolveBase('https://api.anthropic.com/v1'), 'https://api.anthropic.com');
  assert.equal(resolveBase('https://api.anthropic.com/v1/'), 'https://api.anthropic.com');
  const calls = [];
  await callAnthropic({ ...CREDS, baseUrl: 'https://api.anthropic.com/v1', prompt: 'hi',
    fetchImpl: async (url) => { calls.push(url); return okStream('{"ok":1}'); } });
  assert.equal(calls[0], 'https://api.anthropic.com/v1/messages');
});

test('P1: a non-canonical base is a typed config failure and dispatches NOTHING', async () => {
  const hostile = [
    'https://evil.example.com',                       // another vendor entirely
    'https://api.anthropic.com.evil.example.com',     // suffix-confusion hostname
    'https://apianthropic.com',
    'https://user:pw@api.anthropic.com',              // userinfo smuggling
    'https://api.anthropic.com:8443',                 // unsupported port
    'https://api.anthropic.com/v1/messages?x=1',      // query
    'https://api.anthropic.com/v1#f',                 // fragment
    'https://api.anthropic.com/v2',                   // not a Messages endpoint
    'https://api.anthropic.com/proxy/v1',
    'http://api.anthropic.com',                       // plaintext downgrade
    'not a url', 'ftp://x.example',
  ];
  for (const base of hostile) {
    assert.throws(() => resolveBase(base),
      (e) => e instanceof ProviderError && e.error === 'ProviderMisconfigured' && e.retryable === false,
      `base ${base} was accepted`);
    // The real guarantee: the credential never leaves the process on a bad base.
    let dispatched = 0;
    await assert.rejects(() => callAnthropic({ ...CREDS, baseUrl: base, prompt: 'hi',
      fetchImpl: async () => { dispatched += 1; return okStream(); } }),
    (e) => e instanceof ProviderError && e.retryable === false, `base ${base} reached the network`);
    assert.equal(dispatched, 0, `base ${base} dispatched a request carrying the credential`);
  }
});

test('P1: a provider redirect is refused, never followed with the credential attached', async () => {
  // fetch follows redirects by default and re-sends the Authorization header; a 302 from
  // the endpoint would hand a subscription token to whatever Location named.
  let init;
  await assert.rejects(() => callAnthropic({ ...CREDS, prompt: 'hi',
    fetchImpl: async (_u, i) => { init = i; return { ok: false, status: 302,
      headers: new Map([['location', 'https://evil.example.com/v1/messages']]) }; } }),
  (e) => e instanceof ProviderError && e.retryable === false
      && !/evil\.example\.com/.test(e.message));
  assert.equal(init.redirect, 'manual', 'the transport must not let fetch follow redirects');
});

// ---------------------------------------------------------------- (2) wire provenance
test('P2: a completed reply with no wire identity is refused, not served as a lesson', async () => {
  // The requested name is NOT evidence. A stream that never identified itself used to
  // come back as a successful lesson with model_wire_proved:false — and the lesson was
  // still served, which is the provenance claim the contract forbids.
  await assert.rejects(() => callAnthropic({ ...CREDS, prompt: 'hi',
    fetchImpl: async () => sse([
      { type: 'content_block_delta', delta: { type: 'text_delta', text: '{"version":2}' } },
      { type: 'message_delta', delta: { stop_reason: 'end_turn' } },
    ]) }),
  (e) => e instanceof ProviderError && e.error === 'ProviderIdentityUnproved' && e.retryable === false);
});

test('P2: a reply from a DIFFERENT model is refused and never renamed to the requested one', async () => {
  await assert.rejects(() => callAnthropic({ ...CREDS, prompt: 'hi',
    fetchImpl: async () => okStream('{"ok":1}', 'claude-fable-5-1') }),
  (e) => e instanceof ProviderError && e.error === 'ProviderIdentityMismatch'
      && e.retryable === false
      // The provider-supplied name must not be echoed into the learner-facing message.
      && !/fable/i.test(e.message));
  // A dated build of the REQUESTED model is the same model and must still pass.
  const out = await callAnthropic({ ...CREDS, prompt: 'hi', fetchImpl: async () => okStream('{"ok":1}') });
  assert.equal(out.wireModel, 'claude-opus-5-20260810');
});

test('P2: a stream that stops without a stop_reason is incomplete, not a short lesson', async () => {
  await assert.rejects(() => callAnthropic({ ...CREDS, prompt: 'hi',
    fetchImpl: async () => okStream('{"version":2,"ste', 'claude-opus-5-20260810', null) }),
  (e) => e instanceof ProviderError && e.error === 'ProviderStreamIncomplete');
});

test('P2: cloudOptions pins the requested tutor and rejects a conflicting model config', () => {
  const prior = process.env.ANTHROPIC_MODELS;
  try {
    delete process.env.ANTHROPIC_MODELS;
    assert.equal(cloudOptions().backend.model, 'claude-opus-5', 'blank env must mean the requested tutor');
    process.env.ANTHROPIC_MODELS = 'claude-opus-5';
    assert.equal(cloudOptions().backend.model, 'claude-opus-5');
    // The defect: the first entry of an unrelated list silently became the tutor.
    for (const bad of ['claude-fable-5-1', 'claude-fable-5-1,claude-opus-5', 'claude-opus-5,claude-fable-5-1']) {
      process.env.ANTHROPIC_MODELS = bad;
      assert.throws(() => cloudOptions(),
        (e) => e instanceof ProviderError && e.retryable === false && !/fable/i.test(e.message),
        `ANTHROPIC_MODELS=${bad} was accepted`);
    }
  } finally {
    if (prior === undefined) delete process.env.ANTHROPIC_MODELS; else process.env.ANTHROPIC_MODELS = prior;
  }
});

// ---------------------------------------------------------------- (3) deployment origin
test('P3: the generated deployment hostname is trusted from env, never from a header', async () => {
  // The preview hostname does not exist until deploy, so a hand-maintained
  // LESSON_ALLOWED_HOSTS cannot contain it: every preview would 403 its own frontend.
  // VERCEL_URL is set by the platform in its own runtime env, which a client cannot
  // forge — unlike Host and X-Forwarded-Host, which are exactly what an attacker sends.
  await withHeaders({ VERCEL: '1', VERCEL_URL: 'lesson-abc123-owner.vercel.app' },
    { backend: { kind: 'native', model: 'claude-opus-5', apiKey: 'sk-ant-api-test',
      fetchImpl: async () => okStream('{"ok":1}') } },
    async (get, port) => {
      assert.equal((await get({ host: 'lesson-abc123-owner.vercel.app' })).status, 200,
        'the platform-supplied deployment hostname must be allowed');
      // An https Origin on that deployment host is the real frontend.
      assert.equal((await get({ host: 'lesson-abc123-owner.vercel.app',
        origin: 'https://lesson-abc123-owner.vercel.app' })).status, 200);
      // A stripped-TLS page is NOT the same origin as an https deployment.
      assert.equal((await get({ host: 'lesson-abc123-owner.vercel.app',
        origin: 'http://lesson-abc123-owner.vercel.app' })).status, 403,
      'an http Origin must not pass as same-origin for an https deployment');
      // Headers remain untrusted: a forged Host, with or without X-Forwarded-Host.
      assert.equal((await get({ host: 'evil.example.com' })).status, 403);
      assert.equal((await get({ host: 'evil.example.com',
        'x-forwarded-host': 'lesson-abc123-owner.vercel.app' })).status, 403,
      'X-Forwarded-Host must never be an authority for same-origin');
      // Loopback keeps working under http, so local tests are unaffected.
      assert.equal((await get({ host: `127.0.0.1:${port}`, origin: `http://127.0.0.1:${port}` })).status, 200);
    });
});

test('P3: without the platform marker, an env hostname alone is not a deployment grant', async () => {
  // VERCEL unset means this is not a real deployment, so VERCEL_URL is just a string in
  // the environment and must confer nothing.
  await withHeaders({ VERCEL: undefined, VERCEL_URL: 'lesson-abc123-owner.vercel.app' }, null,
    async (get) => {
      assert.equal((await get({ host: 'lesson-abc123-owner.vercel.app' })).status, 403);
    });
});

test('P3: a junk VERCEL_URL grants no origin at all', async () => {
  // Not a syntactically canonical hostname: scheme, path, port and userinfo forms must
  // all be refused rather than pasted into the allow-set.
  for (const junk of ['https://lesson.vercel.app/x', 'lesson.vercel.app:8443',
    'user@lesson.vercel.app', 'lesson.vercel.app/x', '*', '']) {
    await withHeaders({ VERCEL: '1', VERCEL_URL: junk }, null, async (get, port) => {
      assert.equal((await get({ host: 'lesson.vercel.app' })).status, 403, `junk ${junk} granted an origin`);
      assert.equal((await get({ host: `127.0.0.1:${port}` })).status, 200, 'local testing must still work');
    });
  }
});

test('P3: an explicitly allowed host keeps working and is held to https', async () => {
  await withHeaders({ VERCEL: undefined, VERCEL_URL: undefined,
    LESSON_ALLOWED_HOSTS: 'lesson.example.com' }, null, async (get) => {
    assert.equal((await get({ host: 'lesson.example.com' })).status, 200);
    assert.equal((await get({ host: 'lesson.example.com', origin: 'https://lesson.example.com' })).status, 200);
    assert.equal((await get({ host: 'lesson.example.com', origin: 'http://lesson.example.com' })).status, 403);
  });
});

// ---------------------------------------------------------------- (4) honest stop text
test('P4: a local deadline says WE stopped waiting, not that the provider was cancelled', async () => {
  await assert.rejects(() => callAnthropic({ ...CREDS, prompt: 'hi', deadlineMs: 120,
    fetchImpl: (_u, init) => new Promise((_r, rej) => {
      init.signal.addEventListener('abort', () => rej(Object.assign(new Error('x'), { name: 'AbortError' })));
    }) }),
  (e) => e instanceof ProviderError && e.status === 504
      // "the request was cancelled" claims a provider-side stop we cannot perform: the
      // HTTP request is abandoned locally while the generation may well run to completion
      // and be billed. The learner-facing text must not promise otherwise.
      // The cancellation must be scoped to US ("waiting here"), and the message must
      // say the provider may still be finishing. "the request was cancelled" with no
      // such qualifier claims a provider-side stop we never performed.
      && /waiting here was cancelled/i.test(e.message)
      && /provider may still be finishing/i.test(e.message)
      && !/\bthe request was cancelled\b/i.test(e.message));
});

test('P4: a provider error type never leaks arbitrary text into the learner-facing message', async () => {
  const junk = 'rate_limit_error<script>alert(1)</script> contact admin@evil.example.com';
  await assert.rejects(() => callAnthropic({ ...CREDS, prompt: 'hi',
    fetchImpl: async () => ({ ok: false, status: 400,
      headers: new Map([['retry-after', 'soon-ish; see https://evil.example.com']]),
      json: async () => ({ error: { type: junk, message: 'x' } }) }) }),
  (e) => e instanceof ProviderError
      && e.status === 502                              // the typed status is preserved
      && !/script|evil\.example\.com|admin@/.test(e.message)
      && e.providerStatus === 400);
});

// ---------------------------------------------------------------- (5) request buffering
test('P5: once the body bound is breached, no later chunk is ever buffered again', async () => {
  // The defect: the size guard returned from the data handler but left the handler
  // ATTACHED, so every subsequent chunk re-entered it and was pushed onto the same array
  // after the 413 had already been rejected. An oversized upload kept allocating inside
  // a request that was, as far as the client was concerned, already refused.
  const req = new EventEmitter();
  req.headers = { 'content-type': 'application/json' };
  let resumed = 0;
  req.resume = () => { resumed += 1; };
  const p = readBody(req);
  req.emit('data', Buffer.alloc(33 * 1024, 0x61));
  await assert.rejects(() => p, (e) => e.status === 413 && e.error === 'PayloadTooLarge');
  assert.equal(req.listenerCount('data'), 0,
    'the data handler must be detached, so a drained chunk cannot be buffered');
  assert.ok(resumed >= 1, 'the body must still be drained so the client gets its typed 413');
  // Later traffic on an already-refused body must be inert: no throw, no second settle.
  req.emit('data', Buffer.alloc(512 * 1024));
  req.emit('end');
  assert.equal(req.listenerCount('end'), 0, 'end must not re-settle an already-refused body');
  assert.equal(req.listenerCount('error'), 0, 'error must not re-settle an already-refused body');
});

test('P5: a body just under the bound is still accepted after the fix', async () => {
  const req = new EventEmitter();
  req.headers = { 'content-type': 'application/json' };
  req.resume = () => {};
  const p = readBody(req);
  const payload = Buffer.from(JSON.stringify({ a: 'x'.repeat(30 * 1024) }));
  req.emit('data', payload);
  req.emit('end');
  assert.equal((await p).a.length, 30 * 1024);
});
// ------------------------------------------------- (6) retryable survives translation
test('P6: a missing server credential is a 503 that does NOT invite a retry', async () => {
  // Observed on a real preview: 503 ProviderUnconfigured came back retryable:true.
  // The transport sets retryable:false, nativeTransport dropped it translating to
  // ApiError, and the responder recomputed it as status !== 400 — so the client was
  // told to retry a missing deployment credential it can never fix by retrying.
  await withHeaders({}, { backend: { kind: 'native', model: 'claude-opus-5', apiKey: '' } },
    async (call, port) => {
      const res = await call({ host: `127.0.0.1:${port}`, 'content-type': 'application/json' },
        { path: '/api/lesson', method: 'POST',
          payload: JSON.stringify({ version: 2, age: 35, locale: 'en', goal: 'learn fractions', adultTest: true }) });
      assert.equal(res.status, 503);
      const j = res.json();
      assert.equal(j.error, 'ProviderUnconfigured');
      assert.equal(j.retryable, false, 'a missing credential must not be advertised as retryable');
    });
});

test('P6: a transient provider failure is still advertised as retryable', async () => {
  // The guard must not flip every error to non-retryable: a real rate limit IS worth
  // repeating, and the transport is the thing that knows which is which.
  await withHeaders({}, { backend: { kind: 'native', model: 'claude-opus-5', apiKey: 'sk-ant-api-test',
    fetchImpl: async () => ({ ok: false, status: 429, headers: new Map([['retry-after', '30']]),
      json: async () => ({ error: { type: 'rate_limit_error' } }) }) } },
  async (call, port) => {
    const res = await call({ host: `127.0.0.1:${port}`, 'content-type': 'application/json' },
      { path: '/api/lesson', method: 'POST',
        payload: JSON.stringify({ version: 2, age: 35, locale: 'en', goal: 'learn fractions', adultTest: true }) });
    assert.equal(res.status, 429);
    assert.equal(res.json().retryable, true);
  });
});

// ---------------------------------------------------------------- (5) request buffering
