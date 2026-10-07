// Integration CORRECTION tests for the metadata/feedback addition. Each test below is a
// REPRODUCTION of a bug found by source inspection of the working tutor, written to fail
// against the pre-correction code and pass after the minimum fix.
//
// Additive by construction: no existing test, record or evidence file is touched. The
// only process-external resources are throwaway directories under TMPDIR and fake AI
// subprocesses that print a fixed JSON object. NOTHING here calls a provider — every
// failure mode below is simulated locally and is OFFLINE evidence, not model proof.
import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, readdirSync, mkdirSync } from 'node:fs';
import { request } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createServer } from '../server.mjs';
import { openLessonStore, lessonKey, LessonStoreError } from '../lesson-store.mjs';

const scratch = () => mkdtempSync(join(tmpdir(), 'lesson-correction-'));
const HEX64 = /^[0-9a-f]{64}$/;
const token = () => createHash('sha256').update(String(Math.random())).digest('hex').slice(0, 32);

const REQ = { version: 2, goal: 'understand halves', age: 7, locale: 'en', adultTest: true };
const PROV = { provider: 'anthropic', model: 'claude-opus-5', model_wire: 'claude-opus-5',
  model_wire_proved: true, live: true };

const lessonFor = (over = {}) => ({
  version: 2, id: 'l1', title: 'Halves', goal: 'understand halves', subject: 'math',
  age: 7, locale: 'en', intro: 'Halves are two equal parts.',
  steps: [1, 2, 3].map((n) => ({
    id: `s${n}`, prompt: `Step ${n}?`, explanation: 'Two equal parts.', hint: 'Count them.',
    kind: 'numeric', answer: '2', visual: { kind: 'fraction', parts: 2, filled: 1, caption: 'half' },
  })),
  path: { reinforce: { goal: 'more halves', reason: 'practice' },
    advance: { goal: 'quarters', reason: 'next' } },
  ...over,
});

/**
 * A fake AI subprocess. `provenance` is injected verbatim so a test can reproduce what a
 * real bridge reports, and `fail` makes it emit the bridge's own failure shape.
 */
function fakeAI(dir, { provenance = PROV, fail = null, title = 'Halves' } = {}) {
  const file = join(dir, `ai-${Math.random().toString(36).slice(2)}.mjs`);
  const body = fail
    ? `process.stdout.write(${JSON.stringify(JSON.stringify(fail))});`
    : `let raw=''; process.stdin.on('data',(c)=>{raw+=c;});
process.stdin.on('end',()=>{
  const goal=/"goal"\\s*:\\s*("(?:[^"\\\\]|\\\\.)*")/.exec(raw);
  const L=${JSON.stringify(JSON.stringify(lessonFor()))};
  const lesson=JSON.parse(L);
  lesson.title=${JSON.stringify(title)};
  if(goal) lesson.goal=JSON.parse(goal[1]);
  process.stdout.write(JSON.stringify({ok:true,text:JSON.stringify(lesson),
    provenance:${JSON.stringify(provenance)}}));
});`;
  writeFileSync(file, body, { mode: 0o700 });
  return `node|${file}`;
}

async function withServer(opts, fn) {
  const server = createServer(opts);
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
      res.on('end', () => resolve({ status: res.statusCode, json: () => JSON.parse(raw), text: () => raw }));
    });
    req.on('error', reject);
    if (payload !== null) req.write(payload);
    req.end();
  });
  try { await fn(call, port); } finally { server.close(); await new Promise((r) => server.once('close', r)); }
}

// ================================================================ 1. save() identity
// BUG: save() archived a genuinely NEW version under an already-taken lookup key, then
// returned the OLD record's digest as `recordId`. Every caller — the HTTP response, the
// rating route, the library read-back — therefore attached metadata and thumbs to the
// WRONG lesson version while the one just generated was unreachable.
test('save returns the recordId of the version it actually archived, not the old one', () => {
  const dir = scratch();
  try {
    const store = openLessonStore({ dir: join(dir, 'lib') });
    const key = lessonKey({ probe: 'distinct-versions' });
    const a = lessonFor({ title: 'Halves A' });
    const b = lessonFor({ title: 'Halves B' });

    const first = store.save(key, { lesson: a, request: REQ, provenance: PROV });
    const second = store.save(key, { lesson: b, request: REQ, provenance: PROV });

    assert.match(first.recordId, HEX64);
    assert.match(second.recordId, HEX64);
    assert.notEqual(second.recordId, first.recordId,
      'a second DISTINCT generation must not report the first version as its record');

    // Each returned id must resolve to the lesson that call actually saved.
    assert.equal(store.recordById(first.recordId).lesson.title, 'Halves A');
    assert.equal(store.recordById(second.recordId).lesson.title, 'Halves B',
      'the newly archived version is unreachable by the id its own save returned');

    // Lookup slot semantics are UNCHANGED: first writer still wins immutably.
    assert.equal(store.get(key).record.lesson.title, 'Halves A');
    assert.equal(second.id, first.id, 'the short lookup id still names the lookup record');
    assert.equal(store.versions(key).length, 2, 'both real generations stay archived');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('an identical re-save stays idempotent and reports the same recordId', () => {
  const dir = scratch();
  try {
    const store = openLessonStore({ dir: join(dir, 'lib') });
    const key = lessonKey({ probe: 'idempotent-id' });
    const payload = { lesson: lessonFor(), request: REQ, provenance: PROV };
    const first = store.save(key, payload);
    const again = store.save(key, payload);
    assert.equal(again.recordId, first.recordId, 'identical content is one version, one id');
    assert.equal(again.saved, false, 'nothing new was archived');
    assert.equal(store.versions(key).length, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('metadata and votes follow the version they belong to, not the lookup slot', () => {
  const dir = scratch();
  try {
    const store = openLessonStore({ dir: join(dir, 'lib') });
    const key = lessonKey({ probe: 'per-version-feedback' });
    const mk = (title, ms) => store.save(key, { lesson: lessonFor({ title }), request: REQ,
      provenance: PROV, metadata: { schemaVersion: 1, createdAt: new Date().toISOString(),
        timing: { generationMs: ms },
        device: { browser: 'chrome', os: 'macos', type: 'desktop', source: 'client-reported' } } });
    const a = mk('Halves A', 11);
    const b = mk('Halves B', 22);

    // The metadata reachable by each id is that version's own metadata.
    assert.equal(store.recordById(a.recordId).metadata.timing.generationMs, 11);
    assert.equal(store.recordById(b.recordId).metadata.timing.generationMs, 22);

    // A vote on the new version must not land on the old one.
    store.vote(b.recordId, { voterToken: token(), vote: 'up' });
    assert.equal(store.feedbackOf(b.recordId).thumbsUp, 1);
    assert.equal(store.feedbackOf(a.recordId).thumbsUp, 0,
      'the vote was recorded against the wrong lesson version');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// ================================================================ 2. feedback honesty
// BUG: feedbackOf() and vote() caught EVERY read/parse error and substituted a zero
// tally. A corrupt or unreadable feedback file was reported as "nobody voted", and the
// next vote then OVERWROTE the bytes, destroying the real votes and the evidence.
const corruptCases = [
  ['unparseable', 'not json at all'],
  ['wrong store version', JSON.stringify({ v: 999, votes: {} })],
  ['votes not an object', JSON.stringify({ v: 1, votes: [] })],
  ['invalid vote value', JSON.stringify({ v: 1, votes: { ['a'.repeat(64)]: 'sideways' } })],
  ['invalid voter key', JSON.stringify({ v: 1, votes: { 'not-a-hash': 'up' } })],
];

for (const [label, bytes] of corruptCases) {
  test(`corrupt feedback (${label}) is a typed fault, never a fabricated zero count`, () => {
    const dir = scratch();
    try {
      const lib = join(dir, 'lib');
      const store = openLessonStore({ dir: lib });
      const key = lessonKey({ probe: `corrupt-${label}` });
      const { recordId } = store.save(key, { lesson: lessonFor(), request: REQ, provenance: PROV });
      const fb = join(lib, `${recordId}.fb`);
      writeFileSync(fb, bytes, { mode: 0o600 });

      assert.throws(() => store.feedbackOf(recordId),
        (e) => e instanceof LessonStoreError && e.code === 'LibraryFeedbackInvalid',
        'a corrupt feedback file must not be reported as zero votes');

      // And a vote must REFUSE rather than overwrite the evidence.
      assert.throws(() => store.vote(recordId, { voterToken: token(), vote: 'up' }),
        (e) => e instanceof LessonStoreError && e.code === 'LibraryFeedbackInvalid');
      assert.equal(readFileSync(fb, 'utf8'), bytes,
        'the corrupt feedback bytes were overwritten instead of preserved for inspection');
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
}

test('an unreadable feedback file is Unavailable, and a missing one is genuinely zero', () => {
  const dir = scratch();
  try {
    const lib = join(dir, 'lib');
    const store = openLessonStore({ dir: lib });
    const key = lessonKey({ probe: 'enoent-vs-eisdir' });
    const { recordId } = store.save(key, { lesson: lessonFor(), request: REQ, provenance: PROV });

    // No feedback file at all is the ONLY honest zero.
    assert.deepEqual(store.feedbackOf(recordId),
      { thumbsUp: 0, thumbsDown: 0, total: 0, reportedHelpful: 0,
        semantics: 'self-reported-helpfulness' });

    // A directory where the feedback file belongs reads as EISDIR: unreadable, not empty.
    mkdirSync(join(lib, `${recordId}.fb`));
    assert.throws(() => store.feedbackOf(recordId),
      (e) => e instanceof LessonStoreError && e.code === 'LibraryFeedbackUnavailable');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a real vote still round-trips and survives reopening the store', () => {
  const dir = scratch();
  try {
    const lib = join(dir, 'lib');
    const store = openLessonStore({ dir: lib });
    const key = lessonKey({ probe: 'durable-votes' });
    const { recordId } = store.save(key, { lesson: lessonFor(), request: REQ, provenance: PROV });
    const t = token();
    assert.equal(store.vote(recordId, { voterToken: t, vote: 'up' }).thumbsUp, 1);
    assert.equal(store.vote(recordId, { voterToken: t, vote: 'up' }).thumbsUp, 1, 'idempotent');
    assert.equal(store.vote(recordId, { voterToken: t, vote: 'down' }).thumbsDown, 1);
    assert.equal(store.vote(recordId, { voterToken: t, vote: 'down' }).thumbsUp, 0, 'the vote moved');
    assert.equal(store.vote(recordId, { voterToken: t, vote: null }).total, 0, 'null removes');
    const reopened = openLessonStore({ dir: lib });
    reopened.vote(recordId, { voterToken: t, vote: 'up' });
    assert.equal(openLessonStore({ dir: lib }).feedbackOf(recordId).thumbsUp, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// ================================================================ 3. forged record file
// BUG: hasRecord() matched on FILENAME only, so a file named <key>.<64hex>.rec whose
// contents are garbage counted as a known version. The rating route used it as its
// pre-write existence check, so a feedback file could be created for a lesson the
// library does not actually hold.
test('a record is known only when its CONTENT validates, not because a file is named right', async () => {
  const dir = scratch();
  try {
    const lib = join(dir, 'lib');
    const store = openLessonStore({ dir: lib });
    const key = lessonKey({ probe: 'forged' });
    store.save(key, { lesson: lessonFor(), request: REQ, provenance: PROV });
    const forged = 'f'.repeat(64);
    writeFileSync(join(lib, `${key}.${forged}.rec`), 'garbage, not a record', { mode: 0o600 });

    assert.equal(store.hasRecord(forged), false, 'a filename is not evidence of a version');
    assert.equal(store.feedbackOf(forged), null);

    await withServer({ aiCmd: fakeAI(dir), lessonStore: store }, async (call) => {
      const res = await call('/api/lesson-rating', { method: 'POST',
        body: { adultTest: true, recordId: forged, vote: 'up', voterToken: token() } });
      assert.equal(res.status, 404, res.text());
      assert.equal(readdirSync(lib).filter((f) => f.startsWith(forged) && f.endsWith('.fb')).length, 0,
        'a write happened for a lesson version the library does not hold');
    });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// ================================================================ 4. durability
// BUG: the directory-fsync tolerance list included EBADF, EACCES, EPERM and EISDIR.
// Those are I/O and permission failures, not proof that the platform cannot fsync a
// directory, so a real durability failure was swallowed and the route still answered 200.
for (const code of ['EBADF', 'EACCES', 'EPERM']) {
  test(`a directory fsync failing with ${code} is a durability failure, not "unsupported"`, () => {
    const dir = scratch();
    try {
      const store = openLessonStore({ dir: join(dir, 'lib'),
        fsync: (_fd, { directory } = {}) => {
          if (!directory) return;
          const e = new Error('denied'); e.code = code; throw e;
        } });
      assert.throws(() => store.save(lessonKey({ probe: code }),
        { lesson: lessonFor(), request: REQ, provenance: PROV }),
      (e) => e instanceof LessonStoreError && e.code === 'LibraryNotDurable',
      `${code} was tolerated as an unsupported-platform signal`);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
}

test('the genuine unsupported-directory-fsync signal is still tolerated', () => {
  const dir = scratch();
  try {
    const store = openLessonStore({ dir: join(dir, 'lib'),
      fsync: (_fd, { directory } = {}) => {
        if (!directory) return;
        const e = new Error('nope'); e.code = 'ENOTSUP'; throw e;
      } });
    const key = lessonKey({ probe: 'enotsup' });
    assert.equal(store.save(key, { lesson: lessonFor(), request: REQ, provenance: PROV }).saved, true);
    assert.ok(store.get(key));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// ================================================================ 5. createdAt origin
// The record's `generated_at` is deliberately OUTSIDE the digest (so an identical re-run
// does not create a duplicate version), which means it is not a tamper-evident claim.
// `metadata.createdAt` is inside the digest and is therefore the authoritative origin
// time the UI shows.
test('metadata.createdAt is digest-covered, so an edited creation time cannot be served', () => {
  const dir = scratch();
  try {
    const lib = join(dir, 'lib');
    const store = openLessonStore({ dir: lib });
    const key = lessonKey({ probe: 'createdAt' });
    store.save(key, { lesson: lessonFor(), request: REQ, provenance: PROV,
      metadata: { schemaVersion: 1, createdAt: '2026-10-03T21:07:47.102Z',
        timing: { generationMs: 5 },
        device: { browser: 'chrome', os: 'macos', type: 'desktop', source: 'client-reported' } } });
    const file = join(lib, `${key}.json`);
    const rec = JSON.parse(readFileSync(file, 'utf8'));
    rec.metadata.createdAt = '2001-01-01T00:00:00.000Z';
    writeFileSync(file, JSON.stringify(rec), { mode: 0o600 });
    assert.equal(store.get(key), null, 'a rewritten creation time must quarantine, not serve');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// ================================================================ 6. provenance fields
// BUG: the server's allowlist used names the bridge does not emit, so every fact the
// bridge actually reported under `observed_*` — usage, stop reason, provider attempts,
// requested reasoning effort — was dropped on the way into the archive.
const BRIDGE_PROV = { provider: 'anthropic', model: 'claude-opus-5',
  model_wire: 'claude-opus-5', model_wire_proved: true, live: true,
  endpoint_host: 'api.anthropic.com', provider_configured: 'anthropic',
  model_configured: 'claude-opus-5', api_mode_configured: 'anthropic_messages',
  reasoning_effort_requested: 'max',
  observed_request_model: 'claude-opus-5', observed_request_max_tokens: 128000,
  observed_request_reasoning: { thinking_type: 'adaptive', effort: 'max', budget_tokens: null },
  observed_provider_attempts: 1, observed_stop_reason: 'end_turn',
  observed_usage: { input_tokens: 1200, output_tokens: 3400 },
  observed_endpoint_path: 'messages' };

test('metadata keeps the observed_* request facts the bridge really reported', async () => {
  const dir = scratch();
  try {
    const store = openLessonStore({ dir: join(dir, 'lib') });
    await withServer({ aiCmd: fakeAI(dir, { provenance: BRIDGE_PROV }), lessonStore: store },
      async (call) => {
        const res = await call('/api/lesson', { method: 'POST', body: REQ });
        assert.equal(res.status, 200, res.text());
        const m = res.json().library.metadata.model;
        assert.equal(m.stopReason, 'end_turn', 'the observed stop reason was dropped');
        assert.deepEqual(m.usage, { input_tokens: 1200, output_tokens: 3400 },
          'the observed usage was dropped');
        assert.equal(m.providerAttempts, 1, 'the observed dispatch count was dropped');
        assert.equal(m.reasoningRequested, 'max', 'the requested reasoning effort was dropped');
        assert.deepEqual(m.reasoningObserved,
          { thinking_type: 'adaptive', effort: 'max', budget_tokens: null },
          'reasoningObserved must be the prepared request params the bridge saw');
        assert.equal(m.apiMode, 'anthropic_messages');
        // `endpoint_path` is a literal the bridge writes, not an observed route.
        assert.ok(!JSON.stringify(res.json().library.metadata).includes('endpointPath'),
          'an unobservable endpoint path must not be archived as observed');
      });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('an unproved wire identity reports null, never a configured name dressed as a report', async () => {
  const dir = scratch();
  try {
    const store = openLessonStore({ dir: join(dir, 'lib') });
    const unproved = { ...BRIDGE_PROV, model_wire: null, model_wire_proved: false };
    await withServer({ aiCmd: fakeAI(dir, { provenance: unproved }), lessonStore: store },
      async (call) => {
        const res = await call('/api/lesson', { method: 'POST', body: REQ });
        assert.equal(res.status, 200, res.text());
        const m = res.json().library.metadata.model;
        assert.equal(m.reported, null,
          'an unobserved provider identity must be null, not derived from configuration');
        assert.equal(m.reportedBasis, 'unproved');
        // The independently-known facts survive.
        assert.equal(m.requested, 'claude-opus-5');
        assert.equal(m.configured, 'claude-opus-5');
        assert.equal(m.observedRequestModel, 'claude-opus-5');
      });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a configured endpoint nobody observed stays null instead of being invented', async () => {
  const dir = scratch();
  try {
    const store = openLessonStore({ dir: join(dir, 'lib') });
    const noHost = { ...BRIDGE_PROV };
    delete noHost.endpoint_host;
    await withServer({ aiCmd: fakeAI(dir, { provenance: noHost }), lessonStore: store },
      async (call) => {
        const res = await call('/api/lesson', { method: 'POST', body: REQ });
        assert.equal(res.status, 200, res.text());
        assert.equal(res.json().library.metadata.model.endpointHost, null);
      });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// ================================================================ 7. bridge failures
// BUG: every bridge failure was flattened to 502 ProviderFailure with the parsed
// `error` string interpolated into the message. A real 429 looked like a generic
// provider failure, and an arbitrary upstream string was echoed to the client.
//
// OFFLINE: the subprocess below prints a fixed JSON object. No provider is called.
test('a rate limit from the bridge surfaces as 429 ProviderRateLimited', async () => {
  const dir = scratch();
  try {
    const store = openLessonStore({ dir: join(dir, 'lib') });
    const fail = { ok: false, error: 'ProviderHTTPError', status: 429 };
    await withServer({ aiCmd: fakeAI(dir, { fail }), lessonStore: store }, async (call) => {
      const res = await call('/api/lesson', { method: 'POST', body: REQ });
      assert.equal(res.status, 429, res.text());
      const body = res.json();
      assert.equal(body.error, 'ProviderRateLimited');
      assert.equal(body.retryable, true);
      // It must not claim to know WHY the provider refused.
      assert.ok(!/credit|balance|quota|billing|spend/i.test(body.message), body.message);
    });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('an arbitrary bridge error string is never echoed to the client', async () => {
  const dir = scratch();
  try {
    const store = openLessonStore({ dir: join(dir, 'lib') });
    const leak = 'sk-ant-LEAKED at /Users/man/secret.json';
    await withServer({ aiCmd: fakeAI(dir, { fail: { ok: false, error: leak, status: 403 } }),
      lessonStore: store }, async (call) => {
      const res = await call('/api/lesson', { method: 'POST', body: REQ });
      assert.equal(res.status, 502, res.text());
      assert.equal(res.json().error, 'ProviderFailure');
      assert.ok(!res.text().includes('sk-ant'), 'the upstream string was echoed');
      assert.ok(!res.text().includes('secret.json'), 'the upstream string was echoed');
    });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('an out-of-range or non-numeric bridge status never becomes the HTTP status', async () => {
  const dir = scratch();
  try {
    for (const status of [9999, -1, 0, 'teapot', true, null]) {
      const d2 = scratch();
      const store = openLessonStore({ dir: join(d2, 'lib') });
      const fail = { ok: false, error: 'ProviderHTTPError', status };
      // eslint-disable-next-line no-await-in-loop
      await withServer({ aiCmd: fakeAI(d2, { fail }), lessonStore: store }, async (call) => {
        const res = await call('/api/lesson', { method: 'POST', body: REQ });
        assert.ok(res.status >= 500 && res.status <= 599, `status ${status} -> ${res.status}`);
      });
      rmSync(d2, { recursive: true, force: true });
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('known typed bridge refusals keep their identity instead of collapsing to one code', async () => {
  const cases = [['ProviderIdentityUnproved', 502], ['ProviderIdentityMismatch', 502],
    ['NonCanonicalEndpoint', 502], ['NonCanonicalProvider', 502],
    ['RequestedModelMismatch', 502], ['ProviderRetryNotAllowed', 502]];
  for (const [code, want] of cases) {
    const dir = scratch();
    try {
      const store = openLessonStore({ dir: join(dir, 'lib') });
      // eslint-disable-next-line no-await-in-loop
      await withServer({ aiCmd: fakeAI(dir, { fail: { ok: false, error: code, status: null } }),
        lessonStore: store }, async (call) => {
        const res = await call('/api/lesson', { method: 'POST', body: REQ });
        assert.equal(res.status, want, res.text());
        assert.equal(res.json().error, code, `${code} lost its identity`);
      });
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }
});

test('a bridge that exits without stdout is a bounded typed error', async () => {
  const dir = scratch();
  try {
    const store = openLessonStore({ dir: join(dir, 'lib') });
    const file = join(dir, 'silent.mjs');
    writeFileSync(file, 'process.exit(3);', { mode: 0o700 });
    await withServer({ aiCmd: `node|${file}`, lessonStore: store }, async (call) => {
      const res = await call('/api/lesson', { method: 'POST', body: REQ });
      assert.equal(res.status, 502, res.text());
      assert.equal(res.json().error, 'BridgeOutputInvalid');
    });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// ================================================================ 8. SYSTEM parity
// The parent suspected the bridge sent a different system prompt than the server
// records. It does NOT: both strings are byte-identical today. This test is the guard
// that keeps them that way, because the archive claims metadata.instructions.system is
// the text that was actually applied.
test('the bridge system prompt is byte-identical to the one the server archives', async () => {
  const py = readFileSync(new URL('../ai_bridge.py', import.meta.url), 'utf8');
  const block = /\nSYSTEM = \(\n(.*?)\n\)\n/s.exec(py);
  assert.ok(block, 'ai_bridge.py no longer defines SYSTEM as a parenthesised literal');
  // Concatenate the adjacent string literals exactly as python does.
  const pySystem = [...block[1].matchAll(/"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'/g)]
    .map((m) => (m[1] ?? m[2]).replace(/\\"/g, '"').replace(/\\'/g, "'"))
    .join('');

  const dir = scratch();
  try {
    const store = openLessonStore({ dir: join(dir, 'lib') });
    await withServer({ aiCmd: fakeAI(dir), lessonStore: store }, async (call) => {
      const res = await call('/api/lesson', { method: 'POST', body: REQ });
      assert.equal(res.status, 200, res.text());
      const archived = res.json().library.metadata.instructions;
      assert.equal(archived.system, pySystem,
        'the archived system prompt is not the text the bridge applies');
      assert.equal(archived.hashes.system,
        createHash('sha256').update(pySystem).digest('hex'),
        'the archived system hash does not cover the applied system prompt');
    });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// ================================================================ 9. native impl hash
// BUG: the native transport's implementation identity was `native\0<endpoint>\0<model>`,
// a value that cannot change when the generator's REASONING or source does. Two builds
// with different thinking budgets therefore shared one cache entry.
test('the native implementation identity changes with reasoning config and source', async () => {
  // Same SSE shape the existing native preflight test uses: an async generator of
  // `data:` frames, which is what callAnthropic() consumes.
  const stream = (text) => ({ ok: true, status: 200,
    body: (async function* gen() {
      yield Buffer.from([
        { type: 'message_start', message: { model: 'claude-opus-5' } },
        { type: 'content_block_delta', delta: { type: 'text_delta', text } },
        { type: 'message_delta', delta: { stop_reason: 'end_turn' } },
      ].map((e) => `data: ${JSON.stringify(e)}\n\n`).join(''));
    })() });

  const dir = scratch();
  try {
    const store = openLessonStore({ dir: join(dir, 'lib') });
    let calls = 0;
    const backend = (thinkingBudget) => ({ kind: 'native', apiKey: 'sk-test', baseUrl: '',
      model: 'claude-opus-5', maxTokens: 128000, thinkingBudget, endpointHost: 'api.anthropic.com',
      fetchImpl: async () => { calls += 1; return stream(JSON.stringify(lessonFor())); } });

    await withServer({ backend: backend(120000), lessonStore: store }, async (call) => {
      const res = await call('/api/lesson', { method: 'POST', body: REQ });
      assert.equal(res.status, 200, res.text());
    });
    assert.equal(calls, 1);
    // Same endpoint, same model, DIFFERENT reasoning budget: not the same generator.
    await withServer({ backend: backend(8000), lessonStore: store }, async (call) => {
      const res = await call('/api/lesson', { method: 'POST', body: REQ });
      assert.equal(res.status, 200, res.text());
    });
    assert.equal(calls, 2,
      'a changed reasoning budget reused a lesson produced by a different configuration');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a corrupt feedback file is a TYPED route failure, not a generic 500', async () => {
  const dir = scratch();
  try {
    const lib = join(dir, 'lib');
    const store = openLessonStore({ dir: lib });
    await withServer({ aiCmd: fakeAI(dir), lessonStore: store }, async (call) => {
      const first = await call('/api/lesson', { method: 'POST', body: REQ });
      assert.equal(first.status, 200, first.text());
      const { recordId } = first.json().library;
      writeFileSync(join(lib, `${recordId}.fb`), '{broken', { mode: 0o600 });

      // Every route that reports counts must name the fault instead of guessing zero.
      for (const probe of [
        () => call('/api/lesson', { method: 'POST', body: REQ }),
        () => call(`/api/lesson-library/${recordId}`),
        () => call('/api/lesson-rating', { method: 'POST',
          body: { adultTest: true, recordId, vote: 'up', voterToken: token() } }),
      ]) {
        // eslint-disable-next-line no-await-in-loop
        const res = await probe();
        assert.equal(res.status, 503, res.text());
        assert.equal(res.json().error, 'LibraryFeedbackInvalid');
        assert.equal(res.json().retryable, false);
      }
      assert.equal(readFileSync(join(lib, `${recordId}.fb`), 'utf8'), '{broken',
        'the corrupt bytes must survive for inspection');
    });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
