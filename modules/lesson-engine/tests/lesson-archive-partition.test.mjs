// Cache PARTITIONING, privacy and failure behaviour.
//
// Partitioning is the dangerous half of a cache: a key that is too coarse serves one
// learner's lesson to a different learner. Every field the request parser accepts that
// changes the lesson gets its own test here, and each asserts a MISS (a second model
// call), not merely a different key.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, statSync, writeFileSync, readdirSync, readFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request } from 'node:http';
import { createServer } from '../server.mjs';
import { openLessonStore, lessonKey } from '../lesson-store.mjs';

const scratch = () => mkdtempSync(join(tmpdir(), 'lesson-part-'));

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

// The fake AI echoes the request's own metadata back, so a mis-partitioned hit shows up
// as a metadata mismatch rather than passing silently. It is written to a scratch FILE
// rather than inlined with node -e: aiCmd is split on '|', which mangles any script
// containing regexes or quotes, and a mangled fake fails as a bridge error that looks
// like a cache bug.
function echoAI(dir, counterPath) {
  const file = join(dir, 'fake-ai.mjs');
  writeFileSync(file, `
import { appendFileSync } from 'node:fs';
const LESSON = ${JSON.stringify(lessonFor())};
let b = '';
process.stdin.on('data', (c) => { b += c; }).on('end', () => {
  appendFileSync(${JSON.stringify(counterPath)}, 'x');
  const prompt = JSON.parse(b).prompt;
  const L = JSON.parse(JSON.stringify(LESSON));
  const age = /self-reported their age as (\\d+)/.exec(prompt);
  if (age) { L.age = Number(age[1]); } else {
    delete L.age;
    L.version = 1;
    const sg = /subject must be exactly "([^"]+)"/.exec(prompt);
    const gr = /grade must be exactly "([^"]+)"/.exec(prompt);
    L.subject = sg ? sg[1] : 'math';
    L.grade = gr ? gr[1] : '3';
  }
  const loc = /strings in (\\w+)\\./.exec(prompt);
  if (loc && loc[1] === 'Spanish') L.locale = 'es';
  const goal = /written by the learner[^:]*: (".*?")\\n/.exec(prompt);
  if (goal) L.goal = JSON.parse(goal[1]);
  process.stdout.write(JSON.stringify({ ok: true, text: JSON.stringify(L),
    provenance: { provider: 'anthropic', model: 'claude-opus-5', model_wire: 'w1',
      model_wire_proved: true, live: true } }));
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
  try { await fn(call, port); } finally { server.close(); await new Promise((r) => server.once('close', r)); }
}

/** Warm the cache with REQ, then assert `variant` is a MISS (a real second call). */
async function assertMiss(variant, label) {
  const dir = scratch();
  const counter = join(dir, 'calls');
  const store = openLessonStore({ dir: join(dir, 'lib') });
  try {
    await withServer({ aiCmd: echoAI(dir, counter), lessonStore: store }, async (call) => {
      const warm = await call('/api/lesson', { method: 'POST', body: REQ });
      assert.equal(warm.status, 200, `warm -> ${warm.text()}`);
      assert.equal(callCount(counter), 1);
      const res = await call('/api/lesson', { method: 'POST', body: variant });
      assert.equal(res.status, 200, `${label} -> ${res.text()}`);
      assert.equal(callCount(counter), 2, `${label} must MISS the cache, not reuse another request's lesson`);
      assert.equal(res.json().library.cached, false);
    });
  } finally { store.close(); rmSync(dir, { recursive: true, force: true }); }
}

// ------------------------------------------------------------------ partitioning
test('a different age is a different learner and misses', () => assertMiss({ ...REQ, age: 10 }, 'age 10'));
test('adjacent ages are not folded into a band', () => assertMiss({ ...REQ, age: 11 }, 'age 11'));
test('a different locale misses', () => assertMiss({ ...REQ, locale: 'es' }, 'locale es'));
test('a different goal misses', () => assertMiss({ ...REQ, goal: 'understand thirds' }, 'other goal'));
test('adding previous adaptive context misses', () => assertMiss(
  { ...REQ, previous: { goal: 'halves intro', reason: 'got it wrong' } }, 'with previous'));

test('a different previous reason misses', async () => {
  const dir = scratch();
  const counter = join(dir, 'calls');
  const store = openLessonStore({ dir: join(dir, 'lib') });
  const base = { ...REQ, previous: { goal: 'halves intro', reason: 'got it wrong' } };
  try {
    await withServer({ aiCmd: echoAI(dir, counter), lessonStore: store }, async (call) => {
      await call('/api/lesson', { method: 'POST', body: base });
      assert.equal(callCount(counter), 1);
      const res = await call('/api/lesson', { method: 'POST',
        body: { ...base, previous: { goal: 'halves intro', reason: 'was too easy' } } });
      assert.equal(res.status, 200, res.text());
      assert.equal(callCount(counter), 2, 'reinforce and advance must not share one cached lesson');
    });
  } finally { store.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('the v1 subject/grade dialect never shares a cache entry with a v2 age request', async () => {
  const dir = scratch();
  const counter = join(dir, 'calls');
  const store = openLessonStore({ dir: join(dir, 'lib') });
  const v1 = { goal: 'understand halves', subject: 'math', grade: '3', locale: 'en', adultTest: true };
  try {
    await withServer({ aiCmd: echoAI(dir, counter), lessonStore: store }, async (call) => {
      const a = await call('/api/lesson', { method: 'POST', body: v1 });
      assert.equal(a.status, 200, a.text());
      assert.equal(a.json().lesson.version, 1);
      assert.equal(a.json().lesson.age, undefined, 'a v1 lesson carries no invented age');
      const b = await call('/api/lesson', { method: 'POST', body: REQ });
      assert.equal(b.status, 200, b.text());
      assert.equal(callCount(counter), 2, 'v1 and v2 are different dialects, not one cache entry');
      assert.equal(b.json().lesson.version, 2);
      // And each dialect still reuses its OWN entry.
      await call('/api/lesson', { method: 'POST', body: v1 });
      assert.equal(callCount(counter), 2, 'the v1 entry is reusable on its own key');
    });
  } finally { store.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('a different v1 grade misses even with the same subject and goal', async () => {
  const dir = scratch();
  const counter = join(dir, 'calls');
  const store = openLessonStore({ dir: join(dir, 'lib') });
  const g3 = { goal: 'understand halves', subject: 'math', grade: '3', locale: 'en', adultTest: true };
  try {
    await withServer({ aiCmd: echoAI(dir, counter), lessonStore: store }, async (call) => {
      await call('/api/lesson', { method: 'POST', body: g3 });
      const res = await call('/api/lesson', { method: 'POST', body: { ...g3, grade: '4' } });
      assert.equal(res.status, 200, res.text());
      assert.equal(callCount(counter), 2, 'grade is load-bearing');
    });
  } finally { store.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('a changed model or provider misses: a cached lesson is never relabelled as another model', async () => {
  const dir = scratch();
  const counter = join(dir, 'calls');
  const store = openLessonStore({ dir: join(dir, 'lib') });
  try {
    // Same store, two servers whose configured model differs.
    await withServer({ aiCmd: echoAI(dir, counter), lessonStore: store }, async (call) => {
      await call('/api/lesson', { method: 'POST', body: REQ });
      assert.equal(callCount(counter), 1);
    });
    await withServer({ aiCmd: echoAI(dir, counter), lessonStore: store,
      backend: { kind: 'native', apiKey: '', model: 'claude-other-9' } }, async (call) => {
      const res = await call('/api/lesson', { method: 'POST', body: REQ });
      // It MISSES. It may then fail for provider reasons, but it must not serve the
      // other model's lesson as if this model produced it.
      assert.notEqual(res.status, 200, 'a different model must not be served from the old entry');
      assert.equal(res.json().error === 'LessonMismatch', false);
    });
    const keys = readdirSync(join(dir, 'lib')).filter((f) => f.endsWith('.json'));
    assert.equal(keys.length, 1, 'the failed different-model call archived nothing');
  } finally { store.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('a changed teaching prompt or contract version invalidates: recipe is part of the key', () => {
  // The recipe hash is derived from the prompt/contract text, so two different guidance
  // documents cannot collide on one key.
  const a = lessonKey({ recipe: 'r1', goal: 'g', age: 9 });
  const b = lessonKey({ recipe: 'r2', goal: 'g', age: 9 });
  assert.notEqual(a, b);
  // Field ORDER must not change the key, or the same request typed differently
  // regenerates.
  assert.equal(lessonKey({ goal: 'g', age: 9 }), lessonKey({ age: 9, goal: 'g' }));
});

// ------------------------------------------------------------------ privacy
test('no learner nickname, answer, session id or feedback is stored', async () => {
  const dir = scratch();
  const counter = join(dir, 'calls');
  const store = openLessonStore({ dir: join(dir, 'lib') });
  try {
    await withServer({ aiCmd: echoAI(dir, counter), lessonStore: store }, async (call) => {
      // Unexpected fields are stripped at the request boundary, so even a body that
      // carries them cannot put them in the archive.
      const res = await call('/api/lesson', { method: 'POST', body: {
        ...REQ, nickname: 'Rosie', learnerName: 'Rosie Smith', answer: '1/2',
        answers: ['1/2', 'wrong'], sessionId: 'sess-abc123', feedback: 'she struggled',
      } });
      assert.equal(res.status, 200, res.text());
    });
    const files = readdirSync(join(dir, 'lib')).filter((f) => f.endsWith('.json'));
    assert.equal(files.length, 1);
    const raw = readFileSync(join(dir, 'lib', files[0]), 'utf8');
    for (const secret of ['Rosie', 'Rosie Smith', 'sess-abc123', 'she struggled', 'wrong']) {
      assert.equal(raw.includes(secret), false, `archived record must not contain ${secret}`);
    }
    const rec = JSON.parse(raw);
    for (const k of ['nickname', 'learnerName', 'answer', 'answers', 'sessionId', 'feedback']) {
      assert.equal(Object.hasOwn(rec.request, k), false, `request.${k} must not be archived`);
    }
    assert.deepEqual(Object.keys(rec.request).sort(), ['age', 'goal', 'locale', 'version']);
  } finally { store.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('feedback is never archived', async () => {
  const dir = scratch();
  const counter = join(dir, 'calls');
  const store = openLessonStore({ dir: join(dir, 'lib') });
  try {
    await withServer({ aiCmd: echoAI(dir, counter), lessonStore: store }, async (call) => {
      const made = await call('/api/lesson', { method: 'POST', body: REQ });
      const { lesson } = made.json();
      const before = store.count();
      await call('/api/feedback', { method: 'POST', body: { adultTest: true, lesson,
        stepId: lesson.steps[0].id, answer: '1/2', mode: 'answer', priorHints: 0 } });
      assert.equal(store.count(), before, 'a feedback call archives nothing');
    });
  } finally { store.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('the library is not reachable over HTTP through the static routes', async () => {
  const dir = scratch();
  const counter = join(dir, 'calls');
  const store = openLessonStore({ dir: join(dir, 'lib') });
  try {
    await withServer({ aiCmd: echoAI(dir, counter), lessonStore: store }, async (call) => {
      const saved = (await call('/api/lesson', { method: 'POST', body: REQ })).json();
      const id = saved.library.id;
      for (const p of ['/.local-data/lesson-library', '/.local-data/lesson-library/',
        `/.local-data/lesson-library/${id}.json`, '/lesson-library', `/${id}.json`,
        '/../.local-data/lesson-library', '/%2e%2e/.local-data']) {
        const res = await call(p);
        assert.equal(res.status === 200, false, `${p} must not be served (got ${res.status})`);
      }
    });
  } finally { store.close(); rmSync(dir, { recursive: true, force: true }); }
});

// ------------------------------------------------------------------ failure behaviour
test('an unwritable library is a typed 503 and never a 200 claiming a save', async () => {
  const dir = scratch();
  const counter = join(dir, 'calls');
  const locked = join(dir, 'locked');
  try {
    const store = openLessonStore({ dir: locked });
    chmodSync(locked, 0o500);                       // readable, NOT writable
    await withServer({ aiCmd: echoAI(dir, counter), lessonStore: store }, async (call) => {
      const res = await call('/api/lesson', { method: 'POST', body: REQ });
      assert.equal(res.status, 503, res.text());
      assert.equal(res.json().error, 'LibraryUnwritable');
      assert.match(res.json().message, /lesson library could not be written/);
    });
    store.close();
  } finally { try { chmodSync(locked, 0o700); } catch {} rmSync(dir, { recursive: true, force: true }); }
});

test('a build with no configured library refuses instead of generating an unsaveable lesson', async () => {
  const dir = scratch();
  const counter = join(dir, 'calls');
  try {
    await withServer({ aiCmd: echoAI(dir, counter), libraryDir: '' }, async (call) => {
      const res = await call('/api/lesson', { method: 'POST', body: REQ });
      assert.equal(res.status, 503, res.text());
      assert.equal(res.json().error, 'LibraryUnconfigured');
      assert.equal(callCount(counter), 0, 'it must refuse BEFORE spending a model call');
    });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a corrupted record is quarantined and regenerated, never served', async () => {
  const dir = scratch();
  const counter = join(dir, 'calls');
  const store = openLessonStore({ dir: join(dir, 'lib') });
  try {
    await withServer({ aiCmd: echoAI(dir, counter), lessonStore: store }, async (call) => {
      await call('/api/lesson', { method: 'POST', body: REQ });
      assert.equal(callCount(counter), 1);
      const [file] = readdirSync(join(dir, 'lib')).filter((f) => f.endsWith('.json'));
      writeFileSync(join(dir, 'lib', file), '{ this is not json', { mode: 0o600 });

      const res = await call('/api/lesson', { method: 'POST', body: REQ });
      assert.equal(res.status, 200, res.text());
      assert.equal(callCount(counter), 2, 'a corrupt record must be regenerated, not served');
      assert.equal(res.json().library.cached, false);
      assert.equal(res.json().lesson.title, 'Halves');
      assert.ok(readdirSync(join(dir, 'lib', 'quarantine')).length >= 1, 'the bad record is kept for inspection');
    });
  } finally { store.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('a record whose lesson no longer validates is not served', async () => {
  const dir = scratch();
  const counter = join(dir, 'calls');
  const store = openLessonStore({ dir: join(dir, 'lib') });
  try {
    await withServer({ aiCmd: echoAI(dir, counter), lessonStore: store }, async (call) => {
      await call('/api/lesson', { method: 'POST', body: REQ });
      const [file] = readdirSync(join(dir, 'lib')).filter((f) => f.endsWith('.json'));
      const rec = JSON.parse(readFileSync(join(dir, 'lib', file), 'utf8'));
      rec.lesson.steps = [];                        // structurally invalid now
      writeFileSync(join(dir, 'lib', file), JSON.stringify(rec), { mode: 0o600 });

      const res = await call('/api/lesson', { method: 'POST', body: REQ });
      assert.equal(res.status, 200, res.text());
      assert.equal(res.json().lesson.steps.length, 3);
      assert.equal(callCount(counter), 2, 'an invalid stored lesson is regenerated');
    });
  } finally { store.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('a record holding another learner metadata is not served on this key', async () => {
  const dir = scratch();
  const counter = join(dir, 'calls');
  const store = openLessonStore({ dir: join(dir, 'lib') });
  try {
    await withServer({ aiCmd: echoAI(dir, counter), lessonStore: store }, async (call) => {
      await call('/api/lesson', { method: 'POST', body: REQ });
      const [file] = readdirSync(join(dir, 'lib')).filter((f) => f.endsWith('.json'));
      const rec = JSON.parse(readFileSync(join(dir, 'lib', file), 'utf8'));
      rec.lesson.age = 37;                          // not the age this key is for
      writeFileSync(join(dir, 'lib', file), JSON.stringify(rec), { mode: 0o600 });

      const res = await call('/api/lesson', { method: 'POST', body: REQ });
      assert.equal(res.status, 200, res.text());
      assert.equal(res.json().lesson.age, 9, 'the learner gets a lesson for THEIR age');
      assert.equal(callCount(counter), 2);
    });
  } finally { store.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('a refused goal is not archived and does not become a cached refusal', async () => {
  const dir = scratch();
  const refuser = 'node|-e|'
    + `let b='';process.stdin.on('data',c=>b+=c).on('end',()=>{process.stdout.write(JSON.stringify({`
    + `ok:true,text:JSON.stringify({refusal:'I cannot teach that safely.'}),`
    + `provenance:{provider:'anthropic',model:'claude-opus-5',live:true}}))})`;
  const store = openLessonStore({ dir: join(dir, 'lib') });
  try {
    await withServer({ aiCmd: refuser, lessonStore: store }, async (call) => {
      const res = await call('/api/lesson', { method: 'POST', body: REQ });
      assert.equal(res.status, 422, res.text());
      assert.equal(store.count(), 0, 'a refusal is not a lesson and is not archived');
      assert.equal(res.json().library, undefined);
    });
  } finally { store.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('an invalid model reply is not archived', async () => {
  const dir = scratch();
  const junk = 'node|-e|'
    + `let b='';process.stdin.on('data',c=>b+=c).on('end',()=>{process.stdout.write(JSON.stringify({`
    + `ok:true,text:'{"version":2,"title":"nope"}',`
    + `provenance:{provider:'anthropic',model:'claude-opus-5',live:true}}))})`;
  const store = openLessonStore({ dir: join(dir, 'lib') });
  try {
    await withServer({ aiCmd: junk, lessonStore: store }, async (call) => {
      const res = await call('/api/lesson', { method: 'POST', body: REQ });
      assert.equal(res.status, 502, res.text());
      assert.equal(store.count(), 0, 'a failed generation leaves nothing in the library');
    });
  } finally { store.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('concurrent identical requests leave exactly one archived version', async () => {
  const dir = scratch();
  const counter = join(dir, 'calls');
  const store = openLessonStore({ dir: join(dir, 'lib') });
  try {
    await withServer({ aiCmd: echoAI(dir, counter), lessonStore: store }, async (call) => {
      // The existing single-flight slot makes one of these 429; whichever shape it
      // takes, the archive must not end up with two versions of the same key.
      const all = await Promise.all([1, 2, 3].map(() => call('/api/lesson', { method: 'POST', body: REQ })));
      assert.ok(all.some((r) => r.status === 200), 'at least one request succeeds');
      assert.equal(store.count(), 1, 'no partial or duplicate record');
      const [file] = readdirSync(join(dir, 'lib')).filter((f) => f.endsWith('.json'));
      JSON.parse(readFileSync(join(dir, 'lib', file), 'utf8'));   // throws if torn
      assert.equal(readdirSync(join(dir, 'lib')).filter((f) => f.startsWith('.tmp-')).length, 0,
        'no temp file is left behind');
    });
  } finally { store.close(); rmSync(dir, { recursive: true, force: true }); }
});
