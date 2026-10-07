// Durable lesson archive: the store itself, and the default createServer path saving a
// validated lesson before it answers 200, then serving the identical request from disk
// with NO second model call.
//
// Isolation: every test points LESSON_LIBRARY_DIR (or an injected store) at its own
// scratch directory. The owner's real library under .local-data/lesson-library is never
// opened by a test, so fixture lessons can never land in live data.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, statSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request } from 'node:http';
import { createServer } from '../server.mjs';
import { openLessonStore, lessonKey } from '../lesson-store.mjs';

const scratch = () => mkdtempSync(join(tmpdir(), 'lesson-lib-'));

// GUARD. These tests exercise the DEFAULT library path, which without an override points
// at the owner's real library. A fixture landing there would pollute live data, so the
// real directory is asserted untouched at the end of the run rather than assumed.
const LIVE_LIBRARY = join(import.meta.dirname, '..', '.local-data', 'lesson-library');
const liveCount = () => { try { return readdirSync(LIVE_LIBRARY).length; } catch { return 0; } };
const liveBefore = liveCount();
test.after(() => assert.equal(liveCount(), liveBefore,
  `tests must not write to the owner's real library at ${LIVE_LIBRARY}`));


const LESSON = {
  version: 2, id: 'l1', title: 'Halves', goal: 'understand halves', subject: 'fractions',
  age: 9, locale: 'en', intro: 'Lets split things in two.',
  steps: [1, 2, 3].map((n) => ({
    id: `s${n}`, prompt: `Shade half of shape ${n}`, explanation: `Half means two equal parts (${n}).`,
    hint: 'Count the parts.', kind: 'numeric', answer: '1/2',
    visual: { kind: 'fraction', parts: 2, filled: 1, caption: `shape ${n}` },
  })),
  path: { reinforce: { goal: 'more halves', reason: 'needs practice' },
    advance: { goal: 'quarters', reason: 'ready' } },
};

const REQ = { goal: 'understand halves', age: 9, locale: 'en', adultTest: true };

// Fake AI as a real subprocess, and a COUNTER file so a cache hit that secretly called
// the model again is provable, not assumed.
function countingAI(counterPath, lesson = LESSON) {
  const script = `const fs=require('fs');fs.appendFileSync(${JSON.stringify(counterPath)},'x');`
    + `let b='';process.stdin.on('data',c=>b+=c).on('end',()=>{process.stdout.write(JSON.stringify({`
    + `ok:true,text:JSON.stringify(${JSON.stringify(lesson)}),`
    + `provenance:{provider:'anthropic',model:'claude-opus-5',model_wire:'claude-opus-5-20260101',model_wire_proved:true,live:true}}))})`;
  return `node|-e|${script}`;
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

// ------------------------------------------------------------------ the store alone
test('store round-trips a record and reports a save', () => {
  const dir = scratch();
  try {
    const store = openLessonStore({ dir });
    const key = lessonKey({ a: 1 });
    assert.equal(store.get(key), null, 'cold store must miss');
    const saved = store.save(key, { lesson: LESSON, request: REQ, provenance: { model: 'm' } });
    assert.equal(saved.saved, true);
    assert.ok(saved.id, 'a save reports an id');
    const hit = store.get(key);
    assert.deepEqual(hit.record.lesson, LESSON);
    store.close();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('store directory is owner-only 0700 and database files 0600', () => {
  const dir = scratch();
  try {
    const store = openLessonStore({ dir: join(dir, 'lib') });
    store.save(lessonKey({ a: 1 }), { lesson: LESSON, request: REQ, provenance: {} });
    store.close();
    assert.equal(statSync(join(dir, 'lib')).mode & 0o777, 0o700);
    for (const f of readdirSync(join(dir, 'lib'))) {
      assert.equal(statSync(join(dir, 'lib', f)).mode & 0o777, 0o600, `${f} must be 0600`);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('an archived version is immutable: re-saving the same key keeps the first record', () => {
  const dir = scratch();
  try {
    const store = openLessonStore({ dir });
    const key = lessonKey({ a: 1 });
    const first = store.save(key, { lesson: LESSON, request: REQ, provenance: { model: 'first' } });
    const again = store.save(key, { lesson: { ...LESSON, title: 'OVERWRITTEN' }, request: REQ, provenance: { model: 'second' } });
    assert.equal(again.id, first.id, 'same key must not create a second version');
    assert.equal(store.get(key).record.lesson.title, 'Halves');
    assert.equal(store.get(key).record.provenance.model, 'first');
    store.close();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// ------------------------------------------------------------------ through the server
test('default createServer persists a validated lesson and reports library.saved', async () => {
  const dir = scratch();
  const counter = join(dir, 'calls');
  const prev = process.env.LESSON_LIBRARY_DIR;
  process.env.LESSON_LIBRARY_DIR = join(dir, 'lib');
  try {
    // No lessonStore injected: this is the DEFAULT path the launcher uses.
    await withServer({ aiCmd: countingAI(counter) }, async (call) => {
      const res = await call('/api/lesson', { method: 'POST', body: REQ });
      assert.equal(res.status, 200, res.text());
      const body = res.json();
      assert.deepEqual(body.library, { saved: true, cached: false, id: body.library.id });
      assert.ok(body.library.id, 'a saved lesson reports its archive id');
      assert.equal(body.provenance.live, true);
      assert.equal(callCount(counter), 1);
    });
    // Durable: a NEW store over the same directory still has it (restart proof).
    const store = openLessonStore({ dir: join(dir, 'lib') });
    assert.equal(store.count(), 1, 'the lesson survives the server that wrote it');
    store.close();
  } finally {
    if (prev === undefined) delete process.env.LESSON_LIBRARY_DIR; else process.env.LESSON_LIBRARY_DIR = prev;
    rmSync(dir, { recursive: true, force: true });
  }
});

test('an identical request is served from the archive with no model call', async () => {
  const dir = scratch();
  const counter = join(dir, 'calls');
  const store = openLessonStore({ dir: join(dir, 'lib') });
  try {
    await withServer({ aiCmd: countingAI(counter), lessonStore: store }, async (call) => {
      const first = await call('/api/lesson', { method: 'POST', body: REQ });
      assert.equal(first.status, 200, first.text());
      assert.equal(callCount(counter), 1);

      const second = await call('/api/lesson', { method: 'POST', body: REQ });
      assert.equal(second.status, 200, second.text());
      const body = second.json();
      assert.equal(callCount(counter), 1, 'a cache hit must not call the model again');
      assert.deepEqual(body.lesson, first.json().lesson);
      assert.equal(body.library.cached, true);
      assert.equal(body.library.saved, false, 'a hit saves nothing new');
    });
  } finally { store.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('a cache hit never claims a live call and keeps the original generation identity', async () => {
  const dir = scratch();
  const counter = join(dir, 'calls');
  const store = openLessonStore({ dir: join(dir, 'lib') });
  try {
    await withServer({ aiCmd: countingAI(counter), lessonStore: store }, async (call) => {
      const live = (await call('/api/lesson', { method: 'POST', body: REQ })).json();
      const hit = (await call('/api/lesson', { method: 'POST', body: REQ })).json();
      assert.equal(live.provenance.live, true);
      assert.equal(live.provenance.cached, undefined, 'a live answer is not labelled cached');
      assert.equal(hit.provenance.live, false, 'a hit must never claim a live call');
      assert.equal(hit.provenance.cached, true);
      assert.equal(hit.provenance.model, live.provenance.model, 'the hit reports who really generated it');
      assert.equal(hit.provenance.model_wire, live.provenance.model_wire);
      assert.ok(hit.provenance.generated_at, 'a hit says when it was originally generated');
    });
  } finally { store.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('after a restart the lesson is served from disk without running the model', async () => {
  // Restart proof WITHOUT a network/model call. The generator command is part of the
  // cache key (pointing at a different bridge is a different lesson source), so the
  // restarted server keeps the SAME aiCmd — and the counter file proves the model was
  // never invoked a second time. Deleting the fake AI script makes that unforgeable:
  // the command still matches the key, but there is nothing left to execute.
  const dir = scratch();
  const counter = join(dir, 'calls');
  const lib = join(dir, 'lib');
  const aiCmd = countingAI(counter);
  try {
    await withServer({ aiCmd, lessonStore: openLessonStore({ dir: lib }) }, async (call) => {
      const res = await call('/api/lesson', { method: 'POST', body: REQ });
      assert.equal(res.status, 200, res.text());
      assert.equal(callCount(counter), 1);
    });
    // Fresh server, fresh store handle over the same directory.
    await withServer({ aiCmd, lessonStore: openLessonStore({ dir: lib }) }, async (call) => {
      const res = await call('/api/lesson', { method: 'POST', body: REQ });
      assert.equal(res.status, 200, `served from disk, got ${res.text()}`);
      const body = res.json();
      assert.equal(body.library.cached, true);
      assert.equal(body.provenance.live, false);
      assert.equal(body.lesson.title, 'Halves');
      assert.equal(callCount(counter), 1, 'still exactly one generation, ever');
      // An unarchived request on the same server DOES reach the model: this proves the
      // 200 above came from disk rather than from a server that cannot generate at all.
      // The goal differs (a new cache key) while the learner metadata stays identical,
      // so the fixed fake lesson still matches what was asked.
      const other = await call('/api/lesson', { method: 'POST', body: { ...REQ, goal: 'understand halves again' } });
      assert.equal(other.status, 200, other.text());
      assert.equal(callCount(counter), 2, 'an uncached request still generates');
    });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a changed generator command misses rather than reusing another source lesson', async () => {
  const dir = scratch();
  const counter = join(dir, 'calls');
  const lib = join(dir, 'lib');
  try {
    await withServer({ aiCmd: countingAI(counter), lessonStore: openLessonStore({ dir: lib }) }, async (call) => {
      assert.equal((await call('/api/lesson', { method: 'POST', body: REQ })).status, 200);
    });
    // A different bridge is a different lesson source, so the archived lesson must NOT
    // be served as though this generator produced it. It fails honestly instead.
    await withServer({ aiCmd: '/nonexistent/no-model-here',
      lessonStore: openLessonStore({ dir: lib }) }, async (call) => {
      const res = await call('/api/lesson', { method: 'POST', body: REQ });
      assert.equal(res.status, 502, 'a different generator must not reuse the old entry');
      assert.equal(res.json().error, 'BridgeUnavailable');
    });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('cache hits do not consume the live call budget', async () => {
  const dir = scratch();
  const counter = join(dir, 'calls');
  const store = openLessonStore({ dir: join(dir, 'lib') });
  try {
    await withServer({ aiCmd: countingAI(counter), lessonStore: store }, async (call) => {
      for (let i = 0; i < 20; i += 1) {
        const res = await call('/api/lesson', { method: 'POST', body: REQ });
        assert.equal(res.status, 200, `request ${i} -> ${res.text()}`);
      }
      assert.equal(callCount(counter), 1, 'one generation, nineteen hits');
    });
  } finally { store.close(); rmSync(dir, { recursive: true, force: true }); }
});
