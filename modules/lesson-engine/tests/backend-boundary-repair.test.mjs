// Second bounded backend correction round. TWO defects, nothing else.
//
//   1. lessonPrompt told the model to write EVERY learner-facing string in Spanish for
//      an `es` locale. The selected teaching guidance (TEACHING_PROMPTS.md "Language and
//      tone", which lessonPrompt itself sends) says the opposite for English practice:
//      keep the practised passage, task and expected answer in English and put the
//      scaffolding in Spanish. feedbackPrompt already states that exception correctly;
//      the lesson prompt contradicted it in the same model call.
//
//   2. voice.mjs cancelled a running transcription only while the upload was still
//      incomplete (`if (!req.complete)`). Node fires `close` with complete===true once
//      the body has fully arrived, and fires no `aborted` at all, so a learner who
//      closed the tab DURING DECODING left the whisper process group running to the
//      30s timeout. Verified Node semantics (v26): after a complete upload a client
//      socket destroy emits req 'close' (complete=true) + socket 'close', never 'aborted'.
//
// Everything here is offline: an injected fake AI command and an injected fake STT
// command. No provider call, no model load, no microphone, no real audio device.
// The REAL-MODEL coverage lives in tests/voice.test.mjs and is not duplicated.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer as createHttpServer, request } from 'node:http';
import { readFileSync, rmSync, existsSync, readdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// PRIVATE temp dir for this file, set BEFORE voice.mjs is imported. voice.mjs calls
// os.tmpdir() per request and os.tmpdir() re-reads TMPDIR, so every temp audio file
// this suite creates lands here. Without it, counting voice-stt-* in the shared /tmp
// races the voice.test.mjs process that node --test runs in parallel.
const OWN_TMP = mkdtempSync(join(tmpdir(), 'bbr-tmp-'));
process.env.TMPDIR = OWN_TMP;

const { createServer } = await import('../server.mjs');
const { transcribeRequest } = await import('../voice.mjs');

const TMP = OWN_TMP;
const uniq = (tag) => join(TMP, `bbr-${tag}-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

// ================================================================ part 1: lesson prompt
// Same fixture shape as the v2 engine suite: a real lesson the server will accept, so
// the prompt is captured from a request that actually completes the v2 parse + validate
// path rather than from a half-request that errors out before the prompt is built.
const step = (over = {}) => ({
  id: 's1', prompt: 'How many stages does the water cycle show?',
  explanation: 'Count the labelled stages.', hint: 'Start at evaporation.',
  kind: 'numeric', answer: '4',
  visual: { kind: 'tokens', count: 4, caption: 'Four stage cards.' },
  ...over,
});
const v2 = (over = {}) => ({
  version: 2, id: 'les_v2', title: 'The water cycle', goal: 'name the stages of the water cycle',
  subject: 'earth science', age: 35, locale: 'en', intro: 'Water moves in a loop.',
  steps: [
    step({ id: 'a', prompt: 'How many stages are shown?' }),
    step({ id: 'b', prompt: 'Which stage comes after condensation?', kind: 'choice',
      choices: ['precipitation', 'evaporation'], answer: 'precipitation' }),
    step({ id: 'c', prompt: 'Fresh check: where does collection happen?', kind: 'choice',
      choices: ['in oceans and lakes', 'in clouds'], answer: 'in oceans and lakes' }),
  ],
  path: { reinforce: { goal: 'sort the four stage cards', reason: 'Rebuild the order.' },
    advance: { goal: 'explain why warm air holds more vapour', reason: 'Order looks secure.' } },
  ...over,
});

const PROMPT_LOG = uniq('prompt');
// Fake AI: records the prompt it was handed, then emits one valid JSON object.
const emitsLesson = (lesson) => 'node|-e|'
  + `let b='';process.stdin.on('data',c=>b+=c).on('end',()=>{`
  + `require('fs').writeFileSync(${JSON.stringify(PROMPT_LOG)},JSON.parse(b).prompt);`
  + `process.stdout.write(${JSON.stringify(JSON.stringify({ ok: true,
    text: JSON.stringify(lesson),
    provenance: { provider: 'anthropic', model: 'claude-fable-5-1', live: true } }))})})`;

async function withServer(aiCmd, fn) {
  const server = createServer({ aiCmd });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const call = (path, body) => new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = request({ host: '127.0.0.1', port, path, method: 'POST',
      headers: { host: `127.0.0.1:${port}`, origin: `http://127.0.0.1:${port}`,
        'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) } }, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { raw += c; });
      res.on('end', () => resolve({ status: res.statusCode, json: () => JSON.parse(raw), text: () => raw }));
    });
    req.on('error', reject);
    req.end(payload);
  });
  try { await fn(call); } finally {
    await new Promise((r) => server.close(r));
    rmSync(PROMPT_LOG, { force: true });
  }
}

const ask = (over = {}) => ({ adultTest: true, age: 35, goal: 'practise reading an English paragraph', locale: 'es', ...over });
const sentPrompt = () => readFileSync(PROMPT_LOG, 'utf8');

test('the Spanish lesson prompt no longer orders EVERY string into Spanish', async () => {
  await withServer(emitsLesson(v2({ locale: 'es' })), async (call) => {
    const r = await call('/api/lesson', ask());
    assert.equal(r.status, 200, r.text());
    const p = sentPrompt();
    // The blanket order is the contradiction: it overrides the guidance in the very
    // same prompt, which is how an English-practice lesson came back fully translated.
    assert.equal(/every learner-facing string in Spanish/i.test(p), false,
      'the blanket "every learner-facing string in Spanish" order is still in the prompt');
  });
});

test('the Spanish lesson prompt carries the same English-practice exception feedback already states', async () => {
  await withServer(emitsLesson(v2({ locale: 'es' })), async (call) => {
    assert.equal((await call('/api/lesson', ask())).status, 200);
    const p = sentPrompt();
    // Verbatim reuse of the established feedbackPrompt wording — not new pedagogy.
    assert.ok(p.includes('If the practice content itself is English-language practice, keep that English'
      + ' content in English and write the scaffolding and directions in Spanish.'),
    'the es lesson prompt must carry the established English-practice exception');
    // ...and must still put the scaffolding in Spanish, or the fix just dropped the locale.
    assert.match(p, /Spanish/, 'the es prompt must still direct Spanish');
  });
});

test('the exception is conditional: a Spanish maths or science lesson is not pushed into English', async () => {
  await withServer(emitsLesson(v2({ locale: 'es' })), async (call) => {
    assert.equal((await call('/api/lesson', ask({ goal: 'sumar fracciones con el mismo denominador' }))).status, 200);
    const p = sentPrompt();
    // The English carve-out must be guarded by "If the practice content itself is
    // English-language practice". An unconditional "keep the content in English" would
    // translate a fractions lesson into the wrong language in the other direction.
    assert.ok(p.includes('If the practice content itself is English-language practice'),
      'the English carve-out must stay conditional');
    assert.equal(/write (the |every )?(learner-facing )?(strings?|content) in English/i.test(p), false,
      'an es lesson must not be given any unconditional English directive');
  });
});

test('an English lesson prompt stays plain and carries no Spanish exception', async () => {
  await withServer(emitsLesson(v2()), async (call) => {
    assert.equal((await call('/api/lesson', ask({ locale: 'en' }))).status, 200);
    const p = sentPrompt();
    assert.match(p, /in English/, 'the en prompt must still name the language');
    assert.equal(p.includes('write the scaffolding and directions in Spanish'), false,
      'the Spanish-scaffolding exception must not be sent for an en lesson');
  });
});

// ================================================================ part 2: voice disconnect
// A miniature of the engine route, deliberately separate from the voice suite's harness
// so this file proves the defect on its own.
async function withRoute(options, fn) {
  const server = createHttpServer(async (req, res) => {
    try {
      const out = await transcribeRequest(req, options);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(out));
    } catch (err) {
      res.writeHead(Number.isInteger(err?.status) ? err.status : 500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: err?.error ?? 'ServerError' }));
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  try { await fn(server.address().port); } finally {
    server.close(); await new Promise((r) => server.once('close', r));
  }
}

// Hand-built PCM WAV: no fixture on disk, no device, no real voice.
function wav(seconds, rate = 8000) {
  const n = Math.round(seconds * rate);
  const b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8);
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  return b;
}
const strays = () => readdirSync(TMP).filter((f) => f.startsWith('voice-stt-')).length;
const until = async (pred, ms) => {
  const stop = Date.now() + ms;
  while (Date.now() < stop) { if (pred()) return true; await new Promise((r) => setTimeout(r, 15)); }
  return false;
};

test.after(() => rmSync(OWN_TMP, { recursive: true, force: true }));

// Bridge that announces it has started decoding, then holds — with a grandchild, so a
// group kill is distinguishable from killing only the direct child (the real launcher
// is run_runtime.py -> python, same shape).
const decoder = (ready, alive) => ['node', '-e',
  `const fs=require('fs');`
  + `require('child_process').spawn(process.execPath,['-e','setTimeout(()=>require(\\'fs\\').writeFileSync('`
  + `+${JSON.stringify(JSON.stringify(alive))}+',\\'x\\'),1200)'],{stdio:'ignore'});`
  + `fs.writeFileSync(${JSON.stringify(ready)},'x');setTimeout(()=>{},60000)`,
  '--'];

test('a client that disconnects DURING decoding stops the bridge promptly, not at the 30s timeout', async () => {
  const ready = uniq('ready'); const alive = uniq('alive');
  const before = strays();
  const body = wav(1);
  let killedAt = null;
  try {
    // timeoutMs stays long: a pass here must come from the disconnect, never the timeout.
    await withRoute({ command: decoder(ready, alive), timeoutMs: 30_000 }, async (port) => {
      const started = Date.now();
      await new Promise((resolve) => {
        const req = request({ host: '127.0.0.1', port, path: '/api/transcribe?locale=en', method: 'POST',
          headers: { host: `127.0.0.1:${port}`, 'content-type': 'audio/wav',
            'x-adult-test': 'true', 'content-length': body.length } }, () => {});
        req.on('error', () => {});
        // FULL upload, properly ended: req.complete becomes true server-side.
        req.end(body);
        (async () => {
          const up = await until(() => existsSync(ready), 8000);
          assert.ok(up, 'the fake bridge never signalled that decoding started');
          req.destroy();            // learner closes the tab mid-decode
          resolve();
        })();
      });
      // Promptly = long before the 30s hard timeout could have done it for us.
      const gone = await until(() => strays() === before, 3000);
      killedAt = Date.now() - started;
      assert.ok(gone, `temp audio still on disk ${killedAt}ms after the disconnect`);
    });
    // The grandchild writes at 1200ms: still there means the group outlived the client.
    await new Promise((r) => setTimeout(r, 1600));
    assert.equal(existsSync(alive), false, 'the decoder process group survived the client disconnect');
    assert.ok(killedAt < 3000, `cleanup took ${killedAt}ms, not prompt`);
    assert.equal(strays(), before, 'temp audio leaked after the disconnect');
  } finally {
    rmSync(ready, { force: true }); rmSync(alive, { force: true });
  }
});

test('the in-flight slot is released by a disconnect, so the next learner is not stuck on 429', async () => {
  const ready = uniq('ready2'); const alive = uniq('alive2');
  const body = wav(1);
  const before = strays();
  try {
    await withRoute({ command: decoder(ready, alive), timeoutMs: 30_000 }, async (port) => {
      await new Promise((resolve) => {
        const req = request({ host: '127.0.0.1', port, path: '/api/transcribe?locale=en', method: 'POST',
          headers: { host: `127.0.0.1:${port}`, 'content-type': 'audio/wav',
            'x-adult-test': 'true', 'content-length': body.length } }, () => {});
        req.on('error', () => {});
        req.end(body);
        (async () => { await until(() => existsSync(ready), 8000); req.destroy(); resolve(); })();
      });
      await until(() => strays() === before, 3000);
    });
    // A fresh, well-behaved request must now succeed rather than meet a stuck Busy slot.
    await withRoute({ command: ['node', '-e',
      'process.stdout.write(JSON.stringify({ok:true,transcript:"after",language:"en"}))', '--'] }, async (port) => {
      const res = await new Promise((resolve, reject) => {
        const req = request({ host: '127.0.0.1', port, path: '/api/transcribe?locale=en', method: 'POST',
          headers: { host: `127.0.0.1:${port}`, 'content-type': 'audio/wav',
            'x-adult-test': 'true', 'content-length': body.length } }, (r) => {
          let raw = ''; r.setEncoding('utf8');
          r.on('data', (c) => { raw += c; });
          r.on('end', () => resolve({ status: r.statusCode, json: () => JSON.parse(raw) }));
        });
        req.on('error', reject);
        req.end(body);
      });
      assert.equal(res.status, 200);
      assert.equal(res.json().transcript, 'after');
    });
  } finally { rmSync(ready, { force: true }); rmSync(alive, { force: true }); }
});

// TRUE-POSITIVE CONTROL. Without this the disconnect fix could simply cancel everything.
test('CONTROL: a full upload on a keep-alive connection still transcribes normally', async () => {
  const body = wav(1);
  const slow = ['node', '-e',
    'setTimeout(()=>process.stdout.write(JSON.stringify({ok:true,transcript:"kept alive",language:"en"})),400)', '--'];
  await withRoute({ command: slow, timeoutMs: 30_000 }, async (port) => {
    const agent = new (await import('node:http')).Agent({ keepAlive: true, maxSockets: 1 });
    const once = () => new Promise((resolve, reject) => {
      const req = request({ host: '127.0.0.1', port, path: '/api/transcribe?locale=en', method: 'POST', agent,
        headers: { host: `127.0.0.1:${port}`, 'content-type': 'audio/wav',
          'x-adult-test': 'true', 'content-length': body.length } }, (r) => {
        let raw = ''; r.setEncoding('utf8');
        r.on('data', (c) => { raw += c; });
        r.on('end', () => resolve({ status: r.statusCode, json: () => JSON.parse(raw) }));
      });
      req.on('error', reject);
      req.end(body);
    });
    // Twice on the SAME kept-alive socket: a listener left on the socket from call one
    // must not cancel call two.
    const a = await once();
    assert.equal(a.status, 200, 'first keep-alive transcription failed');
    assert.equal(a.json().transcript, 'kept alive');
    const b = await once();
    assert.equal(b.status, 200, 'second transcription on the reused socket was cancelled');
    assert.equal(b.json().transcript, 'kept alive');
    agent.destroy();
  });
});
