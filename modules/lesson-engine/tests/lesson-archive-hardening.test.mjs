// Shared-boundary hardening for the lesson archive. Six guards, each seeded with an
// OTHERWISE-VALID record so a failure can only mean the specific guard is missing:
//
//   1. the cache key covers the COMPLETE rendered prompt and the generator's
//      implementation, not just the file path it was invoked by
//   2. a stored record whose provenance disagrees with this build's provider/model, or
//      claims a proved wire identity it does not carry, is not served
//   3. a byte-level edit to an archived record is detected and quarantined, not served
//   4. two genuinely different generations under one key are BOTH retained
//   5. a configured LESSON_LIBRARY_DIR cannot make Vercel's ephemeral disk look durable
//   6. the live provider-call count is readable over HTTP and does not move on a hit
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request } from 'node:http';
import { createServer, lessonFingerprint, libraryDirFromEnv } from '../server.mjs';
import { openLessonStore, lessonKey, STORE_VERSION } from '../lesson-store.mjs';

const scratch = () => mkdtempSync(join(tmpdir(), 'lesson-hard-'));

const lessonFor = (over = {}) => ({
  version: 2, id: 'l1', title: 'Halves', goal: 'understand halves', subject: 'fractions',
  age: 9, locale: 'en', intro: 'Lets split things in two.',
  steps: [1, 2, 3].map((n) => ({
    id: `s${n}`, prompt: `Shade half of shape ${n}`, explanation: `Half means two equal parts (${n}).`,
    hint: 'Count the parts.', kind: 'numeric', answer: '1/2',
    visual: { kind: 'fraction', parts: 2, filled: 1, caption: `shape ${n}` },
  })),
  path: { reinforce: { goal: 'more halves', reason: 'needs practice' },
    advance: { goal: 'quarters', reason: 'ready' } },
  ...over,
});

const REQ = { goal: 'understand halves', age: 9, locale: 'en', adultTest: true };
const PROV = { provider: 'anthropic', model: 'claude-opus-5', live: true,
  model_wire: 'claude-opus-5-20260101', model_wire_proved: true };

/**
 * A fake generator written to a FILE (aiCmd is split on '|', so an inline script with
 * quotes or regexes gets mangled). `tag` changes the file's CONTENT without changing its
 * path, which is exactly the drift guard 1 is about.
 */
function fakeAI(dir, counterPath, { tag = 'a', lesson = lessonFor(), provenance = PROV } = {}) {
  const file = join(dir, 'fake-ai.mjs');
  writeFileSync(file, `
// implementation tag: ${tag}
import { appendFileSync } from 'node:fs';
const L = ${JSON.stringify(lesson)};
let b = '';
process.stdin.on('data', (c) => { b += c; }).on('end', () => {
  appendFileSync(${JSON.stringify(counterPath)}, 'x');
  process.stdout.write(JSON.stringify({ ok: true, text: JSON.stringify(L),
    provenance: ${JSON.stringify(provenance)} }));
});
`, { mode: 0o700 });
  return { cmd: `node|${file}`, file };
}
const callCount = (p) => { try { return statSync(p).size; } catch { return 0; } };

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

// ---------------------------------------------------------------- 1. prompt coverage
const CTX = { model: 'claude-opus-5', provider: 'subprocess', generator: 'python3 ai_bridge.py',
  promptDoc: '## scope\nteach safely', prompt: 'RENDERED PROMPT TEXT', system: 'SYS',
  implementation: 'impl-hash-a' };
const V2 = { version: 2, age: 9, goal: 'understand halves', locale: 'en' };
const keyOf = (ctx) => lessonKey(lessonFingerprint(V2, ctx));

test('the COMPLETE rendered prompt is part of the cache key', () => {
  // Same request, same model, same command, same guidance doc — but the prompt the model
  // actually receives was reworded. A key that only covers the static contract strings
  // would serve a lesson built by the OLD wording forever.
  assert.notEqual(keyOf(CTX), keyOf({ ...CTX, prompt: 'RENDERED PROMPT TEXT, reworded' }),
    'the rendered lessonPrompt is NOT in the cache key');
});

test('the system prompt is part of the cache key', () => {
  assert.notEqual(keyOf(CTX), keyOf({ ...CTX, system: 'SYS, with a new safety rule' }),
    'SYSTEM is NOT in the cache key');
});

test('the generator implementation is part of the cache key, not just its path', () => {
  assert.notEqual(keyOf(CTX), keyOf({ ...CTX, implementation: 'impl-hash-b' }),
    'the bridge implementation/reasoning identity is NOT in the cache key');
});

test('prompt material is hashed, never stored verbatim in the key', () => {
  const fp = lessonFingerprint(V2, { ...CTX, prompt: 'a very private rendered prompt' });
  const flat = JSON.stringify(fp);
  assert.equal(flat.includes('a very private rendered prompt'), false,
    'the key must carry a hash, not the prompt text');
  assert.match(fp.recipe, /^[0-9a-f]{16}$/);
});

test('a changed generator implementation MISSES the cache at the HTTP boundary', async () => {
  // The strongest form of guard 1: the command, the model and the request are byte-identical
  // across both calls. Only the generator's own source changed.
  const dir = scratch();
  const counter = join(dir, 'calls');
  const lib = join(dir, 'lib');
  try {
    const first = fakeAI(dir, counter, { tag: 'a' });
    await withServer({ aiCmd: first.cmd, libraryDir: lib }, async (call) => {
      const warm = await call('/api/lesson', { method: 'POST', body: REQ });
      assert.equal(warm.status, 200, `warm -> ${warm.text()}`);
      assert.equal(callCount(counter), 1);
      const hit = await call('/api/lesson', { method: 'POST', body: REQ });
      assert.equal(hit.json().library.cached, true, 'an unchanged build must still hit');
      assert.equal(callCount(counter), 1);
    });
    // Same path, same cmd string: only the file's CONTENT differs.
    fakeAI(dir, counter, { tag: 'b' });
    await withServer({ aiCmd: first.cmd, libraryDir: lib }, async (call) => {
      const res = await call('/api/lesson', { method: 'POST', body: REQ });
      assert.equal(res.status, 200, `after impl change -> ${res.text()}`);
      assert.equal(callCount(counter), 2,
        'a rewritten generator must MISS the cache, not serve the old implementation output');
      assert.equal(res.json().library.cached, false);
    });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// ---------------------------------------------------------------- 2. saved provenance
/** Archive one otherwise-valid record by hand, with `provenance` swapped in. */
async function serveWith(provenance) {
  const dir = scratch();
  const counter = join(dir, 'calls');
  try {
    const { cmd } = fakeAI(dir, counter);
    const store = openLessonStore({ dir: join(dir, 'lib') });
    let out;
    await withServer({ aiCmd: cmd, lessonStore: store }, async (call) => {
      const warm = await call('/api/lesson', { method: 'POST', body: REQ });
      assert.equal(warm.status, 200, `warm -> ${warm.text()}`);
      assert.equal(callCount(counter), 1);
      // Rewrite the single archived record's provenance, leaving the lesson untouched.
      const name = readdirSync(store.dir).find((f) => /^[0-9a-f]{64}\.json$/.test(f));
      assert.ok(name, 'the warm call must have archived exactly one record');
      const rec = JSON.parse(readFileSync(join(store.dir, name), 'utf8'));
      writeFileSync(join(store.dir, name), JSON.stringify({ ...rec, provenance }), { mode: 0o600 });
      const res = await call('/api/lesson', { method: 'POST', body: REQ });
      out = { status: res.status, body: res.json(), calls: callCount(counter) };
    });
    return out;
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

test('a saved record naming a DIFFERENT model is not served', async () => {
  const r = await serveWith({ ...PROV, model: 'fable-tiny-1' });
  assert.equal(r.body.library.cached, false, 'a foreign model must not be served under this key');
  assert.equal(r.calls, 2, 'it must regenerate instead');
});

test('a saved record naming a DIFFERENT provider is not served', async () => {
  const r = await serveWith({ ...PROV, provider: 'some-other-cloud' });
  assert.equal(r.body.library.cached, false);
  assert.equal(r.calls, 2);
});

test('a record claiming a proved wire identity it does not carry is not served', async () => {
  const r = await serveWith({ ...PROV, model_wire_proved: true, model_wire: '' });
  assert.equal(r.body.library.cached, false, 'proved-but-empty wire identity must not be served');
  assert.equal(r.calls, 2);
});

test('an honestly UNPROVED record is still archived, just not promoted', async () => {
  // Unproved is not the same as wrong. The record stays on disk for the owner; it simply
  // does not get served as though its wire identity had been established.
  const r = await serveWith({ provider: 'anthropic', model: 'claude-opus-5', live: true,
    model_wire: null, model_wire_proved: false });
  assert.equal(r.body.provenance.model_wire_proved, true,
    'what IS served must carry its own proved identity, never the unproved record\'s');
});

// ---------------------------------------------------------------- 3. content integrity
test('a tampered lesson body is quarantined, not served', async () => {
  const dir = scratch();
  try {
    const store = openLessonStore({ dir: join(dir, 'lib') });
    const key = lessonKey({ probe: 'integrity' });
    store.save(key, { lesson: lessonFor(), request: REQ, provenance: PROV });
    assert.ok(store.get(key), 'the seeded record must be valid before tampering');

    const path = join(store.dir, `${key}.json`);
    const rec = JSON.parse(readFileSync(path, 'utf8'));
    // Valid SHAPE, same key, same version, same age — only a step's answer was edited.
    rec.lesson.steps[0].answer = '9/9';
    writeFileSync(path, JSON.stringify(rec), { mode: 0o600 });

    assert.equal(store.get(key), null, 'a tampered record must not be returned');
    assert.equal(readdirSync(join(store.dir, 'quarantine')).length, 1,
      'the tampered record must be kept aside for inspection, not deleted');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a tampered request or provenance is caught by the same digest', async () => {
  const dir = scratch();
  try {
    const store = openLessonStore({ dir: join(dir, 'lib') });
    for (const mutate of [(r) => { r.request = { ...r.request, age: 11 }; },
      (r) => { r.provenance = { ...r.provenance, model: 'fable-tiny-1' }; }]) {
      const key = lessonKey({ probe: `integrity-${Math.random()}` });
      store.save(key, { lesson: lessonFor(), request: REQ, provenance: PROV });
      const path = join(store.dir, `${key}.json`);
      const rec = JSON.parse(readFileSync(path, 'utf8'));
      mutate(rec);
      writeFileSync(path, JSON.stringify(rec), { mode: 0o600 });
      assert.equal(store.get(key), null, 'the digest must cover the ENTIRE record');
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a key that is not a 64-hex digest is rejected, never used as a path', () => {
  const dir = scratch();
  try {
    const store = openLessonStore({ dir: join(dir, 'lib') });
    const invalid = (label) => (e) => {
      assert.equal(e.code, 'LessonKeyInvalid', `${label}: wrong code ${e.code}`);
      // The rejected value must not be echoed back: it is attacker-controlled input.
      assert.equal(e.message.includes('escape'), false, `${label} echoed the bad key`);
      return true;
    };
    for (const bad of ['../escape', 'x'.repeat(64), 'ab', '', `${'a'.repeat(64)}/x`,
      'A'.repeat(64), null, undefined, 42]) {
      assert.throws(() => store.get(bad), invalid(`get ${String(bad)}`));
      assert.throws(() => store.save(bad, { lesson: lessonFor(), request: REQ, provenance: PROV }),
        invalid(`save ${String(bad)}`));
      assert.throws(() => store.versions(bad), invalid(`versions ${String(bad)}`));
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// ---------------------------------------------------------------- 4. retain every version
test('two genuinely different generations under one key are BOTH retained', () => {
  const dir = scratch();
  try {
    const store = openLessonStore({ dir: join(dir, 'lib') });
    const key = lessonKey({ probe: 'race' });
    const a = lessonFor({ title: 'Halves A' });
    const b = lessonFor({ title: 'Halves B' });

    const first = store.save(key, { lesson: a, request: REQ, provenance: PROV });
    assert.equal(first.saved, true);
    // A concurrent worker finished the SAME request and really did produce a lesson.
    const second = store.save(key, { lesson: b, request: REQ, provenance: PROV });
    assert.equal(second.saved, false, 'the first record stays authoritative');
    assert.equal(second.id, first.id, 'lookups keep resolving to the first record');

    // Lookup semantics are unchanged: first writer wins, immutably.
    assert.equal(store.get(key).record.lesson.title, 'Halves A');
    assert.equal(store.count(), 1, 'count() still counts archived lessons, not versions');

    const versions = store.versions(key);
    assert.equal(versions.length, 2, 'the second real generation was DROPPED');
    const titles = versions.map((v) => v.lesson.title).sort();
    assert.deepEqual(titles, ['Halves A', 'Halves B']);
    // Every retained version must be a complete, readable lesson, not a stub.
    for (const v of versions) {
      assert.equal(v.key, key);
      assert.equal(v.v, STORE_VERSION);
      assert.equal(v.lesson.steps.length, 3);
      assert.equal(typeof v.lesson.intro, 'string');
      assert.ok(v.provenance.model);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('re-archiving IDENTICAL data adds no second version', () => {
  const dir = scratch();
  try {
    const store = openLessonStore({ dir: join(dir, 'lib') });
    const key = lessonKey({ probe: 'idempotent' });
    const payload = { lesson: lessonFor(), request: REQ, provenance: PROV };
    store.save(key, payload);
    const again = store.save(key, payload);
    assert.equal(again.saved, false);
    assert.equal(store.versions(key).length, 1, 'an identical re-run must not duplicate');
    assert.equal(store.count(), 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// ---------------------------------------------------------------- 5. ephemeral Vercel
test('LESSON_LIBRARY_DIR cannot give a Vercel build a durable library', () => {
  const prev = { V: process.env.VERCEL, D: process.env.LESSON_LIBRARY_DIR };
  const dir = scratch();
  try {
    process.env.VERCEL = '1';
    process.env.LESSON_LIBRARY_DIR = dir;
    assert.equal(libraryDirFromEnv(), '',
      'an env path on Vercel points at an ephemeral disk and must not count as a library');
  } finally {
    if (prev.V === undefined) delete process.env.VERCEL; else process.env.VERCEL = prev.V;
    if (prev.D === undefined) delete process.env.LESSON_LIBRARY_DIR; else process.env.LESSON_LIBRARY_DIR = prev.D;
    rmSync(dir, { recursive: true, force: true });
  }
});

test('on Vercel, a lesson is refused BEFORE any model call unless a real store is injected', async () => {
  const prev = process.env.VERCEL;
  const dir = scratch();
  const counter = join(dir, 'calls');
  try {
    process.env.VERCEL = '1';
    const { cmd } = fakeAI(dir, counter);
    // An explicit libraryDir must not launder ephemeral disk into durability either.
    await withServer({ aiCmd: cmd, libraryDir: join(dir, 'lib') }, async (call) => {
      const res = await call('/api/lesson', { method: 'POST', body: REQ });
      assert.equal(res.status, 503, `expected refusal -> ${res.text()}`);
      assert.equal(res.json().error, 'LibraryUnconfigured');
      assert.equal(callCount(counter), 0, 'it must refuse BEFORE spending a model call');
    });
    // The documented escape hatch: a real injected store adapter still works.
    const store = openLessonStore({ dir: join(dir, 'real') });
    await withServer({ aiCmd: cmd, lessonStore: store }, async (call) => {
      const res = await call('/api/lesson', { method: 'POST', body: REQ });
      assert.equal(res.status, 200, `injected store -> ${res.text()}`);
    });
  } finally {
    if (prev === undefined) delete process.env.VERCEL; else process.env.VERCEL = prev;
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------- 6. live call counter
test('/api/capabilities exposes a live call count that does not move on a cache hit', async () => {
  const dir = scratch();
  const counter = join(dir, 'calls');
  try {
    const { cmd } = fakeAI(dir, counter);
    const store = openLessonStore({ dir: join(dir, 'lib') });
    await withServer({ aiCmd: cmd, lessonStore: store }, async (call) => {
      const before = (await call('/api/capabilities')).json();
      assert.equal(before.liveCalls, 0, 'liveCalls must be reported over HTTP');

      await call('/api/lesson', { method: 'POST', body: REQ });
      assert.equal((await call('/api/capabilities')).json().liveCalls, 1);
      assert.equal(callCount(counter), 1, 'the counter must track REAL transport invocations');

      const hit = await call('/api/lesson', { method: 'POST', body: REQ });
      assert.equal(hit.json().library.cached, true);
      assert.equal((await call('/api/capabilities')).json().liveCalls, 1,
        'a cache hit spends no provider call, so the counter must not move');
      assert.equal(callCount(counter), 1);
    });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the capabilities payload carries no secret or payload material', async () => {
  const dir = scratch();
  try {
    const { cmd } = fakeAI(dir, join(dir, 'calls'));
    await withServer({ aiCmd: cmd, lessonStore: openLessonStore({ dir: join(dir, 'lib') }),
      backend: { kind: 'native', apiKey: 'sk-ant-secret-value', model: 'claude-opus-5' } },
    async (call) => {
      const raw = (await call('/api/capabilities')).text();
      assert.equal(raw.includes('sk-ant-secret-value'), false);
      assert.match(raw, /"liveCalls":0/);
      assert.equal(raw.includes('understand halves'), false);
    });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('storage faults report a fixed message with no filesystem path', async () => {
  const dir = scratch();
  try {
    // A path whose parent is a FILE: mkdir cannot succeed, so the store must fail closed
    // with a message that does not leak where it tried to write.
    const blocker = join(dir, 'blocker');
    writeFileSync(blocker, 'not a directory');
    assert.throws(() => openLessonStore({ dir: join(blocker, 'lib') }), (e) => {
      assert.equal(e.name, 'LessonStoreError');
      assert.equal(e.message.includes(dir), false, `error leaked a path: ${e.message}`);
      assert.equal(e.message.includes('blocker'), false, `error leaked a path: ${e.message}`);
      return true;
    });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a library configuration or write failure is reported as non-retryable', async () => {
  const dir = scratch();
  try {
    const blocker = join(dir, 'blocker');
    writeFileSync(blocker, 'not a directory');
    const { cmd } = fakeAI(dir, join(dir, 'calls'));
    await withServer({ aiCmd: cmd, libraryDir: join(blocker, 'lib') }, async (call) => {
      const res = await call('/api/lesson', { method: 'POST', body: REQ });
      assert.equal(res.status, 503);
      assert.equal(res.json().retryable, false,
        'retrying a misconfigured library cannot help, so it must not invite a retry');
    });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
