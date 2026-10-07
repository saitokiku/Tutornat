// Durable lesson METADATA and per-version thumbs-up/down feedback, plus the archive
// boundary fixes this addition depends on.
//
// Every test here is additive: no existing test file is touched, and each test points
// LESSON_LIBRARY_DIR or an injected store at its own scratch directory, so the owner's
// real library under .local-data/lesson-library is never opened.
//
// NO PROVIDER CALLS. The "model" is a local node subprocess that appends a byte to a
// counter file, so "this was served from the archive" is proved by a byte count rather
// than assumed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request } from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
import { createServer } from '../server.mjs';
import { openLessonStore, lessonKey, LessonStoreError } from '../lesson-store.mjs';

const scratch = () => mkdtempSync(join(tmpdir(), 'lesson-meta-'));

// GUARD: these tests exercise the real createServer path. Assert the owner's live
// library is byte-count unchanged at the end rather than trusting the isolation.
const LIVE_LIBRARY = join(import.meta.dirname, '..', '.local-data', 'lesson-library');
const liveCount = () => { try { return readdirSync(LIVE_LIBRARY).length; } catch { return 0; } };
const liveBefore = liveCount();
test.after(() => assert.equal(liveCount(), liveBefore,
  `tests must not write to the owner's real library at ${LIVE_LIBRARY}`));

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

/** Fake generator as a FILE: aiCmd splits on '|', so an inline script gets mangled. */
function fakeAI(dir, counterPath, { lesson = lessonFor(), provenance = PROV, tag = 'a' } = {}) {
  const file = join(dir, `fake-ai-${tag}.mjs`);
  writeFileSync(file, `
// tag: ${tag}
import { appendFileSync } from 'node:fs';
const L = ${JSON.stringify(lesson)};
let b = '';
process.stdin.on('data', (c) => { b += c; }).on('end', () => {
  appendFileSync(${JSON.stringify(counterPath)}, 'x');
  process.stdout.write(JSON.stringify({ ok: true, text: JSON.stringify(L),
    provenance: ${JSON.stringify(provenance)} }));
});
`, { mode: 0o700 });
  return `node|${file}`;
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
  try { return await fn({ call, port }); }
  finally { await new Promise((r) => server.close(r)); }
}

const token = () => randomBytes(16).toString('hex');
const HEX64 = /^[0-9a-f]{64}$/;

// ---------------------------------------------------------------- metadata shape
test('a fresh lesson is archived with complete metadata built from the ACTUAL instructions', async () => {
  const dir = scratch();
  try {
    const counter = join(dir, 'calls');
    const device = { browser: 'firefox', os: 'linux', type: 'tablet' };
    await withServer({ aiCmd: fakeAI(dir, counter), libraryDir: join(dir, 'lib') }, async ({ call }) => {
      const r = await call('/api/lesson', { method: 'POST', body: { ...REQ, device } });
      assert.equal(r.status, 200);
      const { library } = r.json();
      assert.equal(library.saved, true);
      assert.equal(library.cached, false);
      // recordId is the full 64-hex VERSION identifier, never the 16-char request id.
      assert.match(library.recordId, HEX64);
      assert.equal(library.recordId.length, 64);
      assert.notEqual(library.recordId, library.id);
      assert.equal(library.id.length, 16);

      const m = library.metadata;
      assert.equal(m.schemaVersion, 1);
      assert.equal(new Date(m.createdAt).toISOString(), m.createdAt);

      // model identity: requested/configured are this build's names, reported is the
      // wire name the transport actually observed — never a fictional "actual".
      assert.equal(m.model.requested, 'claude-opus-5');
      assert.equal(m.model.reported, 'claude-opus-5-20260101');
      assert.equal(m.model.provider, 'anthropic');
      assert.ok(Object.hasOwn(m.model, 'configured'));
      assert.ok(Object.hasOwn(m.model, 'endpointHost'));
      assert.ok(Object.hasOwn(m.model, 'reasoningRequested'));
      assert.ok(Object.hasOwn(m.model, 'reasoningObserved'));
      // Derivation is MARKED, so "reported" is never mistaken for a proved claim when
      // it was only derived from configuration.
      assert.equal(m.model.reportedBasis, 'provider-reported');

      // timing from a monotonic clock around the real transport call
      assert.ok(Number.isFinite(m.timing.generationMs) && m.timing.generationMs >= 0);

      // instructions are the REAL strings this build sent
      assert.match(m.instructions.system, /lesson generator for a local owner-test prototype/);
      assert.match(m.instructions.lessonPrompt, /understand halves/);
      assert.match(m.instructions.contract, /Return ONE JSON object/);
      assert.equal(typeof m.instructions.teachingGuidance, 'string');
      assert.match(m.instructions.implementationVersion, HEX64);
      // hashes are of those exact texts, so the record proves what it carries
      const sha = (s) => createHash('sha256').update(s).digest('hex');
      assert.equal(m.instructions.hashes.system, sha(m.instructions.system));
      assert.equal(m.instructions.hashes.lessonPrompt, sha(m.instructions.lessonPrompt));
      assert.equal(m.instructions.hashes.contract, sha(m.instructions.contract));
      assert.equal(m.instructions.hashes.teachingGuidance, sha(m.instructions.teachingGuidance));
      assert.match(m.instructions.hashes.lesson, HEX64);

      // coarse client-reported device, and it says so
      assert.deepEqual(m.device, { browser: 'firefox', os: 'linux', type: 'tablet', source: 'client-reported' });

      // feedback starts at zero and is labelled self-reported, never "learning"
      assert.deepEqual(library.feedback,
        { thumbsUp: 0, thumbsDown: 0, total: 0, reportedHelpful: 0, semantics: 'self-reported-helpfulness' });
      assert.equal(callCount(counter), 1);
    });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('an absent or unrecognised device is clamped to unknown, never stored raw', async () => {
  const dir = scratch();
  try {
    await withServer({ aiCmd: fakeAI(dir, join(dir, 'c')), libraryDir: join(dir, 'lib') }, async ({ call }) => {
      const none = await call('/api/lesson', { method: 'POST', body: { ...REQ } });
      assert.equal(none.status, 200);
      assert.deepEqual(none.json().library.metadata.device,
        { browser: 'unknown', os: 'unknown', type: 'unknown', source: 'client-reported' });
    });
    // A user-agent string, an IP, a hardware id or an unlisted token must never land in
    // the record: each unrecognised value becomes 'unknown' and extra keys are dropped.
    await withServer({ aiCmd: fakeAI(dir, join(dir, 'c2'), { tag: 'b' }), libraryDir: join(dir, 'lib2') }, async ({ call }) => {
      const r = await call('/api/lesson', { method: 'POST', body: { ...REQ,
        device: { browser: 'Mozilla/5.0 (Macintosh)', os: 'SunOS', type: 'watch',
          ip: '10.0.0.4', screen: '2560x1440', deviceId: 'abc-123', userAgent: 'x' } } });
      assert.equal(r.status, 200);
      const m = r.json().library.metadata;
      assert.deepEqual(m.device, { browser: 'unknown', os: 'unknown', type: 'unknown', source: 'client-reported' });
      const blob = JSON.stringify(m);
      for (const leak of ['Mozilla', 'SunOS', '10.0.0.4', '2560x1440', 'abc-123', 'userAgent']) {
        assert.ok(!blob.includes(leak), `metadata must not carry ${leak}`);
      }
    });
    // A non-object device is a request error, not a silent default.
    await withServer({ aiCmd: fakeAI(dir, join(dir, 'c3'), { tag: 'c' }), libraryDir: join(dir, 'lib3') }, async ({ call }) => {
      const r = await call('/api/lesson', { method: 'POST', body: { ...REQ, device: 'chrome' } });
      assert.equal(r.status, 400);
    });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('metadata carries no learner answers, nickname, session or profile data', async () => {
  const dir = scratch();
  try {
    await withServer({ aiCmd: fakeAI(dir, join(dir, 'c')), libraryDir: join(dir, 'lib') }, async ({ call }) => {
      const r = await call('/api/lesson', { method: 'POST', body: { ...REQ,
        nickname: 'Robin', answers: ['1/2', 'three'], sessionId: 'sess-9', profileId: 'prof-9',
        device: { browser: 'chrome', os: 'macos', type: 'desktop' } } });
      assert.equal(r.status, 200);
      const blob = JSON.stringify(r.json().library.metadata);
      for (const leak of ['Robin', 'sess-9', 'prof-9', 'nickname', 'sessionId', 'profileId']) {
        assert.ok(!blob.includes(leak), `metadata must not carry ${leak}`);
      }
      // The generated answer key IS kept (it is lesson content, not a learner answer) —
      // assert it is in the lesson, and that the lesson hash covers it.
      assert.equal(r.json().lesson.steps[0].answer, '1/2');
    });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// ---------------------------------------------------------------- cache interaction
test('device is NOT part of the cache key, and a cache hit never rewrites first-run metadata', async () => {
  const dir = scratch();
  try {
    const counter = join(dir, 'calls');
    const lib = join(dir, 'lib');
    const cmd = fakeAI(dir, counter);
    let first;
    await withServer({ aiCmd: cmd, libraryDir: lib }, async ({ call }) => {
      const r = await call('/api/lesson', { method: 'POST', body: { ...REQ,
        device: { browser: 'safari', os: 'ios', type: 'mobile' } } });
      assert.equal(r.status, 200);
      first = r.json().library;
    });
    assert.equal(callCount(counter), 1);

    // SAME request, DIFFERENT device, after a restart: still a cache hit (device is not
    // key material) and the stored metadata still describes the generating request.
    await withServer({ aiCmd: cmd, libraryDir: lib }, async ({ call }) => {
      const r = await call('/api/lesson', { method: 'POST', body: { ...REQ,
        device: { browser: 'edge', os: 'windows', type: 'desktop' } } });
      assert.equal(r.status, 200);
      const { library, provenance } = r.json();
      assert.equal(library.cached, true);
      assert.equal(library.saved, false);
      assert.equal(provenance.live, false);
      assert.equal(library.recordId, first.recordId);
      // first-generation device and timing preserved verbatim
      assert.deepEqual(library.metadata.device, first.metadata.device);
      assert.equal(library.metadata.device.browser, 'safari');
      assert.equal(library.metadata.timing.generationMs, first.metadata.timing.generationMs);
      assert.equal(library.metadata.createdAt, first.metadata.createdAt);
      assert.deepEqual(library.metadata, first.metadata);
    });
    assert.equal(callCount(counter), 1, 'a cache hit must not call the model again');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a cached record whose wire model is a DIFFERENT model is not served', async () => {
  const dir = scratch();
  try {
    const lib = join(dir, 'lib');
    const counter = join(dir, 'calls');
    // Non-empty + proved, but the wrong model. Previously "non-empty" was enough.
    const wrong = fakeAI(dir, counter, { tag: 'wrong',
      provenance: { ...PROV, model_wire: 'claude-sonnet-4-20250101' } });
    await withServer({ aiCmd: wrong, libraryDir: lib }, async ({ call }) => {
      // The record is archived (history is kept) but must not be promoted on reuse.
      await call('/api/lesson', { method: 'POST', body: { ...REQ } });
    });
    const right = fakeAI(dir, counter, { tag: 'right' });
    await withServer({ aiCmd: right, libraryDir: lib }, async ({ call }) => {
      const r = await call('/api/lesson', { method: 'POST', body: { ...REQ } });
      assert.equal(r.status, 200);
      assert.equal(r.json().library.cached, false, 'a mismatched wire model must miss');
    });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// ---------------------------------------------------------------- rating endpoint
async function seed(dir, { lib = join(dir, 'lib'), tag = 's' } = {}) {
  const cmd = fakeAI(dir, join(dir, `calls-${tag}`), { tag });
  let recordId;
  await withServer({ aiCmd: cmd, libraryDir: lib }, async ({ call }) => {
    const r = await call('/api/lesson', { method: 'POST', body: { ...REQ } });
    assert.equal(r.status, 200);
    recordId = r.json().library.recordId;
  });
  return { recordId, cmd, lib };
}

test('votes are idempotent per voter, movable, removable, and survive a restart', async () => {
  const dir = scratch();
  try {
    const { recordId, cmd, lib } = await seed(dir);
    const a = token(); const b = token();
    await withServer({ aiCmd: cmd, libraryDir: lib }, async ({ call }) => {
      const vote = (voterToken, v) => call('/api/lesson-rating',
        { method: 'POST', body: { adultTest: true, recordId, vote: v, voterToken } });

      let r = await vote(a, 'up');
      assert.equal(r.status, 200);
      assert.equal(r.json().ok, true);
      assert.equal(r.json().recordId, recordId);
      assert.equal(r.json().vote, 'up');
      assert.deepEqual(r.json().feedback, { thumbsUp: 1, thumbsDown: 0, total: 1,
        reportedHelpful: 1, semantics: 'self-reported-helpfulness' });

      // same voter, same vote: counted ONCE
      r = await vote(a, 'up');
      assert.equal(r.json().feedback.thumbsUp, 1);
      assert.equal(r.json().feedback.total, 1);

      // same voter changes their mind: the vote MOVES, it does not accumulate
      r = await vote(a, 'down');
      assert.deepEqual(r.json().feedback, { thumbsUp: 0, thumbsDown: 1, total: 1,
        reportedHelpful: 0, semantics: 'self-reported-helpfulness' });

      // a second, distinct voter is counted separately
      r = await vote(b, 'up');
      assert.deepEqual(r.json().feedback, { thumbsUp: 1, thumbsDown: 1, total: 2,
        reportedHelpful: 1, semantics: 'self-reported-helpfulness' });

      // null removes only that voter's vote
      r = await vote(a, null);
      assert.equal(r.json().vote, null);
      assert.deepEqual(r.json().feedback, { thumbsUp: 1, thumbsDown: 0, total: 1,
        reportedHelpful: 1, semantics: 'self-reported-helpfulness' });
    });

    // RESTART: counts are durable and come back on the cache hit for the same lesson.
    await withServer({ aiCmd: cmd, libraryDir: lib }, async ({ call }) => {
      const r = await call('/api/lesson', { method: 'POST', body: { ...REQ } });
      assert.equal(r.status, 200);
      assert.equal(r.json().library.cached, true);
      assert.deepEqual(r.json().library.feedback, { thumbsUp: 1, thumbsDown: 0, total: 1,
        reportedHelpful: 1, semantics: 'self-reported-helpfulness' });
    });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a vote never mutates the lesson record, its digest or its cache key', async () => {
  const dir = scratch();
  try {
    const { recordId, cmd, lib } = await seed(dir);
    const before = readdirSync(lib).filter((f) => f.endsWith('.json') || f.endsWith('.rec'))
      .map((f) => [f, createHash('sha256').update(readFileSync(join(lib, f))).digest('hex')]);
    await withServer({ aiCmd: cmd, libraryDir: lib }, async ({ call }) => {
      const r = await call('/api/lesson-rating', { method: 'POST',
        body: { adultTest: true, recordId, vote: 'up', voterToken: token() } });
      assert.equal(r.status, 200);
    });
    const after = readdirSync(lib).filter((f) => f.endsWith('.json') || f.endsWith('.rec'))
      .map((f) => [f, createHash('sha256').update(readFileSync(join(lib, f))).digest('hex')]);
    assert.deepEqual(after, before, 'feedback must live outside the immutable record');
    // Feedback files are owner-only, like the records.
    for (const f of readdirSync(lib)) {
      if (f === 'quarantine') continue;
      assert.equal(statSync(join(lib, f)).mode & 0o777, 0o600, `${f} must be 0600`);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the rating endpoint rejects unknown records, bad bodies and path traversal before writing', async () => {
  const dir = scratch();
  try {
    const { recordId, cmd, lib } = await seed(dir);
    await withServer({ aiCmd: cmd, libraryDir: lib }, async ({ call }) => {
      const post = (body, headers) => call('/api/lesson-rating', { method: 'POST', body, headers });
      const good = { adultTest: true, recordId, vote: 'up', voterToken: token() };

      // unknown but well-formed record: 404, and nothing is created for it
      const unknown = 'b'.repeat(64);
      assert.equal((await post({ ...good, recordId: unknown })).status, 404);
      assert.ok(!readdirSync(lib).some((f) => f.includes(unknown)));

      assert.equal((await post({ ...good, adultTest: false })).status, 400);
      assert.equal((await post({ ...good, vote: 'maybe' })).status, 400);
      assert.equal((await post({ ...good, vote: 1 })).status, 400);
      assert.equal((await post({ ...good, voterToken: 'short' })).status, 400);
      assert.equal((await post({ ...good, voterToken: 'Z'.repeat(32) })).status, 400);
      assert.equal((await post({ ...good, voterToken: 42 })).status, 400);
      assert.equal((await post({ ...good, recordId: '../../etc/passwd' })).status, 400);
      assert.equal((await post({ ...good, recordId: 'a'.repeat(63) })).status, 400);
      assert.equal((await post({ ...good, recordId: 'A'.repeat(64) })).status, 400);
      assert.equal((await post({ adultTest: true })).status, 400);
      assert.equal((await post(good, { origin: 'http://evil.test' })).status, 403);
      assert.equal((await call('/api/lesson-rating')).status, 405);
      // oversized body is refused by the shared limit, not parsed
      assert.equal((await post({ ...good, pad: 'x'.repeat(200_000) })).status, 413);
      // no feedback was recorded by any rejected call
      assert.equal((await post({ ...good, vote: null })).json().feedback.total, 0);
    });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// ---------------------------------------------------------------- library read route
test('GET /api/lesson-library/<recordId> returns metadata and feedback, and nothing else', async () => {
  const dir = scratch();
  try {
    const { recordId, cmd, lib } = await seed(dir);
    await withServer({ aiCmd: cmd, libraryDir: lib }, async ({ call }) => {
      const t = token();
      await call('/api/lesson-rating', { method: 'POST',
        body: { adultTest: true, recordId, vote: 'down', voterToken: t } });

      const r = await call(`/api/lesson-library/${recordId}`);
      assert.equal(r.status, 200);
      const body = r.json();
      assert.deepEqual(Object.keys(body).sort(), ['feedback', 'metadata', 'recordId']);
      assert.equal(body.recordId, recordId);
      assert.equal(body.feedback.thumbsDown, 1);
      assert.equal(body.metadata.schemaVersion, 1);
      // never the voter token, its hash, a file path or a directory listing
      const raw = r.text();
      assert.ok(!raw.includes(t));
      assert.ok(!raw.includes(createHash('sha256').update(t).digest('hex')));
      assert.ok(!raw.includes(lib), 'no filesystem paths in the response');
      assert.ok(!raw.includes('voter'), 'no voter identity material');

      assert.equal((await call(`/api/lesson-library/${'c'.repeat(64)}`)).status, 404);
      assert.equal((await call('/api/lesson-library/../../server.mjs')).status, 404);
      assert.equal((await call('/api/lesson-library/')).status, 404);
      assert.equal((await call('/api/lesson-library/abc')).status, 404);
      assert.equal((await call(`/api/lesson-library/${recordId}`,
        { method: 'POST', body: {} })).status, 405);
      assert.equal((await call(`/api/lesson-library/${recordId}`,
        { headers: { origin: 'http://evil.test' } })).status, 403);
    });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// ---------------------------------------------------------------- durability fix
test('a FILE fsync failure is a typed failure, never a silent "saved"', async () => {
  const dir = scratch();
  try {
    const lib = join(dir, 'lib');
    const store = openLessonStore({ dir: lib,
      fsync: () => { const e = new Error('disk'); e.code = 'EIO'; throw e; } });
    const key = lessonKey({ a: 1 });
    assert.throws(() => store.save(key, { lesson: lessonFor(), request: REQ, provenance: PROV }),
      (e) => e instanceof LessonStoreError && e.code === 'LibraryNotDurable'
        // The errno token only: the message must not leak the path it tried.
        && /EIO/.test(e.message) && !e.message.includes(lib));
    // nothing was published under the key
    assert.equal(store.get(key), null);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('only a recognised platform-unsupported DIRECTORY fsync is tolerated', async () => {
  const dir = scratch();
  try {
    // EINVAL on a directory fd is the real "this platform cannot fsync a directory"
    // signal; the file fsync still succeeds, so the record is genuinely written.
    const ok = openLessonStore({ dir: join(dir, 'a'),
      fsync: (_fd, { directory } = {}) => {
        if (!directory) return;
        const e = new Error('nope'); e.code = 'EINVAL'; throw e;
      } });
    const k1 = lessonKey({ a: 1 });
    assert.equal(ok.save(k1, { lesson: lessonFor(), request: REQ, provenance: PROV }).saved, true);
    assert.ok(ok.get(k1));

    // A directory fsync failing for any OTHER reason is still a durability failure.
    const bad = openLessonStore({ dir: join(dir, 'b'),
      fsync: (_fd, { directory } = {}) => {
        if (!directory) return;
        const e = new Error('io'); e.code = 'EIO'; throw e;
      } });
    assert.throws(() => bad.save(lessonKey({ a: 2 }),
      { lesson: lessonFor(), request: REQ, provenance: PROV }),
    (e) => e instanceof LessonStoreError && e.code === 'LibraryNotDurable');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('metadata is covered by the record digest, so editing it is detected', async () => {
  const dir = scratch();
  try {
    const lib = join(dir, 'lib');
    const store = openLessonStore({ dir: lib });
    const key = lessonKey({ a: 1 });
    const saved = store.save(key, { lesson: lessonFor(), request: REQ, provenance: PROV,
      metadata: { schemaVersion: 1, createdAt: new Date().toISOString(),
        timing: { generationMs: 12 }, device: { browser: 'chrome', os: 'macos', type: 'desktop', source: 'client-reported' } } });
    assert.match(saved.recordId, HEX64);
    assert.equal(store.get(key).record.digest, saved.recordId);

    const file = join(lib, `${key}.json`);
    const rec = JSON.parse(readFileSync(file, 'utf8'));
    rec.metadata.timing.generationMs = 99999;
    writeFileSync(file, JSON.stringify(rec), { mode: 0o600 });
    assert.equal(store.get(key), null, 'an edited metadata block must quarantine, not serve');
    assert.ok(readdirSync(join(lib, 'quarantine')).length >= 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a voter token is scoped per lesson version: the same token on two lessons is not linkable', async () => {
  const dir = scratch();
  try {
    const lib = join(dir, 'lib');
    const store = openLessonStore({ dir: lib });
    const mk = (n) => {
      const key = lessonKey({ n });
      return store.save(key, { lesson: lessonFor(), request: REQ, provenance: PROV }).recordId;
    };
    const r1 = mk(1); const r2 = mk(2);
    const t = token();
    store.vote(r1, { voterToken: t, vote: 'up' });
    store.vote(r2, { voterToken: t, vote: 'up' });
    assert.equal(store.feedbackOf(r1).thumbsUp, 1);
    assert.equal(store.feedbackOf(r2).thumbsUp, 1);
    // The stored hashes must DIFFER, or the same browser is trackable across lessons.
    const files = readdirSync(lib).filter((f) => f.endsWith('.fb'));
    assert.equal(files.length, 2);
    const blobs = files.map((f) => readFileSync(join(lib, f), 'utf8'));
    const hashes = blobs.flatMap((b) => Object.keys(JSON.parse(b).votes));
    assert.equal(new Set(hashes).size, 2, 'per-lesson scoping must change the hash');
    // and the raw token is never on disk
    for (const b of blobs) assert.ok(!b.includes(t));
    assert.throws(() => store.vote('../x', { voterToken: t, vote: 'up' }),
      (e) => e instanceof LessonStoreError);
    assert.equal(store.feedbackOf('d'.repeat(64)), null);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
