// Boundary tests for voice.mjs. Everything except the three marked REAL-MODEL tests
// uses an INJECTED fake bridge command (options.command), so they stay deterministic
// and fully offline. No provider is ever called; no audio is played.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import { existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { transcribeRequest } from '../voice.mjs';

const TMP = tmpdir();
const LAUNCHER = '/Users/man/hermes-router-integration/scripts/run_runtime.py';
const SCRATCH_AIFF = '/Users/man/.hermes/cache/scratch/voice-spike-ro/phrase.aiff';
// The real local model is only reachable through the managed runtime launcher.
const REAL = existsSync(LAUNCHER) && existsSync(SCRATCH_AIFF);

// ---------------------------------------------------------------- synthetic audio
// Hand-built PCM WAV: no ffmpeg, no fixtures on disk, exact sample counts so the
// duration gate is tested against a length we chose rather than one we measured.
function wav(seconds, sample = () => 0, rate = 8000) {
  const n = Math.round(seconds * rate);
  const b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8);
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i += 1) b.writeInt16LE(sample(i, rate), 44 + i * 2);
  return b;
}
const silence1s = () => wav(1);
const tooLong = () => wav(25);               // 25s > the 20s cap
const garbage = () => Buffer.from('not audio at all, just bytes'.repeat(4));

// ---------------------------------------------------------------- fake bridge
// `node -e <script>` so the real subprocess contract (argv flags, one stdout JSON
// object, exit code, process group, timeout) is exercised end to end.
// The trailing `--` matters: without it node claims --audio=/--locale= as its OWN
// options and exits 9, so the fake would never see the flags under test.
const fake = (script) => ['node', '-e', script, '--'];
const emits = (obj) => fake(`process.stdout.write(${JSON.stringify(JSON.stringify(obj))})`);
// Echoes back the flags it was handed, proving the locale/path plumbing.
const echoFlags = fake(`const f=n=>(process.argv.find(a=>a.startsWith('--'+n+'='))||'').split('=')[1]||'';`
  + `process.stdout.write(JSON.stringify({ok:true,transcript:'echo '+f('audio').split('/').pop(),language:f('locale'),audio_s:1}))`);

// ---------------------------------------------------------------- harness
// A miniature of the route the engine worker will add, so disconnects and stream
// errors travel through a real socket instead of a hand-made object.
async function withRoute(options, fn) {
  let lastError = null;
  const server = createServer(async (req, res) => {
    try {
      const out = await transcribeRequest(req, options);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(out));
    } catch (err) {
      lastError = err;
      const status = Number.isInteger(err?.status) ? err.status : 500;
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: err?.error ?? 'ServerError', message: err?.message ?? '' }));
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const call = (path, { method = 'POST', body, headers = {}, abortAfterMs } = {}) => new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, path, method,
      headers: { host: `127.0.0.1:${port}`, 'content-type': 'audio/wav', 'x-adult-test': 'true',
        ...(body === undefined ? {} : { 'content-length': Buffer.byteLength(body) }), ...headers } },
    (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { raw += c; });
      res.on('end', () => resolve({ status: res.statusCode, json: () => JSON.parse(raw || 'null'), text: () => raw }));
    });
    req.on('error', (e) => (abortAfterMs ? resolve({ status: 0, aborted: true, json: () => null, text: () => '' }) : reject(e)));
    if (body !== undefined) req.write(body);
    if (abortAfterMs) setTimeout(() => req.destroy(), abortAfterMs); else req.end();
  });
  try { await fn(call, () => lastError); } finally {
    server.close(); await new Promise((r) => server.once('close', r));
  }
}

const strays = () => readdirSync(TMP).filter((f) => f.startsWith('voice-stt-'));

// ---------------------------------------------------------------- request gate
test('rejects every method except POST', async () => {
  await withRoute({ command: echoFlags }, async (call) => {
    for (const method of ['GET', 'PUT', 'DELETE', 'PATCH']) {
      const res = await call('/api/transcribe?locale=en', { method, body: silence1s() });
      assert.equal(res.status, 405, `${method} -> ${res.status}`);
      assert.equal((await res.json()).error, 'MethodNotAllowed');
    }
  });
});

test('requires the x-adult-test acknowledgement header', async () => {
  await withRoute({ command: echoFlags }, async (call) => {
    for (const headers of [{ 'x-adult-test': '' }, { 'x-adult-test': 'yes' }, { 'x-adult-test': 'TRUE' }]) {
      const res = await call('/api/transcribe?locale=en', { body: silence1s(), headers });
      assert.equal(res.status, 400, `${JSON.stringify(headers)} -> ${res.status}`);
      assert.equal((await res.json()).error, 'AdultTestRequired');
    }
  });
});

test('requires locale to be exactly en or es', async () => {
  await withRoute({ command: echoFlags }, async (call) => {
    for (const q of ['', '?locale=', '?locale=fr', '?locale=en-US', '?locale=en,es', '?locale=EN']) {
      const res = await call(`/api/transcribe${q}`, { body: silence1s() });
      assert.equal(res.status, 400, `${q} -> ${res.status}`);
      assert.equal((await res.json()).error, 'BadRequest');
    }
  });
});

test('accepts the raw audio mime types a browser actually records', async () => {
  await withRoute({ command: echoFlags }, async (call) => {
    for (const ct of ['audio/webm', 'audio/webm;codecs=opus', 'audio/ogg', 'audio/ogg; codecs=opus',
      'audio/mp4', 'audio/wav', 'audio/x-wav', 'audio/aiff', 'audio/x-aiff']) {
      const res = await call('/api/transcribe?locale=en', { body: silence1s(), headers: { 'content-type': ct } });
      assert.equal(res.status, 200, `${ct} -> ${res.status} ${res.text()}`);
    }
  });
});

test('rejects json and other non-audio content types', async () => {
  await withRoute({ command: echoFlags }, async (call) => {
    for (const ct of ['application/json', 'text/plain', 'multipart/form-data', 'audio/midi', '']) {
      const res = await call('/api/transcribe?locale=en', { body: silence1s(), headers: { 'content-type': ct } });
      assert.equal(res.status, 415, `${ct} -> ${res.status}`);
      assert.equal((await res.json()).error, 'UnsupportedMediaType');
    }
  });
});

test('rejects an empty body and a body over 1 MiB', async () => {
  await withRoute({ command: echoFlags }, async (call) => {
    const empty = await call('/api/transcribe?locale=en', { body: Buffer.alloc(0) });
    assert.equal(empty.status, 400);
    const big = await call('/api/transcribe?locale=en', { body: Buffer.alloc(1024 * 1024 + 1) });
    assert.equal(big.status, 413);
    assert.equal((await big.json()).error, 'PayloadTooLarge');
  });
});

// ---------------------------------------------------------------- dispatch contract
test('passes the request locale through to the bridge instead of the pinned config language', async () => {
  await withRoute({ command: echoFlags }, async (call) => {
    const es = await (await call('/api/transcribe?locale=es', { body: silence1s() })).json();
    assert.equal(es.language, 'es');
    assert.equal(es.local, true);
    const en = await (await call('/api/transcribe?locale=en', { body: silence1s() })).json();
    assert.equal(en.language, 'en');
  });
});

test('returns only transcript, language and local — never a path or provenance', async () => {
  await withRoute({ command: emits({ ok: true, transcript: 'hello', language: 'en', audio_s: 1 }) }, async (call) => {
    const j = await (await call('/api/transcribe?locale=en', { body: silence1s() })).json();
    assert.deepEqual(Object.keys(j).sort(), ['language', 'local', 'transcript']);
    assert.equal(j.transcript, 'hello');
  });
});

test('one in-flight transcription only: the second is a typed 429, not a queue', async () => {
  const slow = fake('setTimeout(()=>process.stdout.write(JSON.stringify({ok:true,transcript:"a",language:"en"})),700)');
  await withRoute({ command: slow }, async (call) => {
    const [a, b] = await Promise.all([
      call('/api/transcribe?locale=en', { body: silence1s() }),
      new Promise((r) => setTimeout(() => r(call('/api/transcribe?locale=en', { body: silence1s() })), 120)),
    ]);
    const codes = [a.status, b.status].sort();
    assert.deepEqual(codes, [200, 429], `got ${codes}`);
    const busy = a.status === 429 ? a : b;
    assert.equal((await busy.json()).error, 'Busy');
  });
});

test('an options.locale from the caller is honoured and still validated', async () => {
  // server.mjs parses ?locale= itself and passes { locale }. A caller's parse is not a
  // trust boundary, so a bad one must still be refused here.
  await withRoute({ command: echoFlags, locale: 'es' }, async (call) => {
    const j = await (await call('/api/transcribe?locale=en', { body: silence1s() })).json();
    assert.equal(j.language, 'es', 'options.locale must win over the query');
  });
  await withRoute({ command: echoFlags, locale: 'fr' }, async (call) => {
    const res = await call('/api/transcribe?locale=en', { body: silence1s() });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, 'BadRequest');
  });
});

// ---------------------------------------------------------------- typed failures
test('bridge failure classes map to typed statuses with no library text', async () => {
  const cases = [
    ['NoSpeech', 409], ['Unsupported', 415], ['TooLong', 413], ['Unavailable', 503],
  ];
  for (const [error, status] of cases) {
    await withRoute({ command: emits({ ok: false, error, detail: 'x' }) }, async (call) => {
      const res = await call('/api/transcribe?locale=en', { body: silence1s() });
      assert.equal(res.status, status, `${error} -> ${res.status}`);
      assert.equal((await res.json()).error, error);
    });
  }
});

test('a raw library or path-bearing detail never reaches the response', async () => {
  const leaky = emits({ ok: false, error: 'Unavailable',
    detail: 'faster_whisper: libcudnn_ops_infer.so.8 missing under /Users/man/.hermes/installs/abc, HF token hf_xyz' });
  await withRoute({ command: leaky }, async (call) => {
    const body = (await call('/api/transcribe?locale=en', { body: silence1s() })).text();
    for (const secret of ['libcudnn', '/Users/man', 'hf_xyz', 'faster_whisper']) {
      assert.equal(body.includes(secret), false, `leaked ${secret}: ${body}`);
    }
  });
});

test('garbage on stdout and a missing bridge binary are both typed, never a crash', async () => {
  await withRoute({ command: fake('process.stdout.write("<html>nope</html>")') }, async (call) => {
    const res = await call('/api/transcribe?locale=en', { body: silence1s() });
    assert.equal(res.status, 503);
    assert.equal((await res.json()).error, 'Unavailable');
  });
  await withRoute({ command: ['/nonexistent/stt-binary'] }, async (call) => {
    const res = await call('/api/transcribe?locale=en', { body: silence1s() });
    assert.equal(res.status, 503);
    assert.equal((await res.json()).error, 'Unavailable');
  });
});

test('an oversized bridge stdout is cut off instead of buffered', async () => {
  await withRoute({ command: fake('process.stdout.write("x".repeat(64*1024))') }, async (call) => {
    const res = await call('/api/transcribe?locale=en', { body: silence1s() });
    assert.equal(res.status, 503);
  });
});

test('the hard timeout kills the whole process group, grandchild included', async () => {
  const sentinel = join(TMP, `voice-stt-sentinel-${process.pid}-${Date.now()}`);
  // Grandchild mirrors the real launcher shape: run_runtime.py calls
  // subprocess.run(...) with NO start_new_session, so its python grandchild stays in
  // the group we created. Signalling only the direct child would leave it alive,
  // still holding the model. (Spawned NOT detached here for the same reason — a
  // detached grandchild would make its own group and is out of scope by design.)
  const script = `require('child_process').spawn(process.execPath,['-e',`
    + `'setTimeout(()=>require("fs").writeFileSync(${JSON.stringify(sentinel)},"alive"),900)'],`
    + `{stdio:'ignore'});setTimeout(()=>{},60000)`;
  await withRoute({ command: fake(script), timeoutMs: 300 }, async (call) => {
    const res = await call('/api/transcribe?locale=en', { body: silence1s() });
    assert.equal(res.status, 504);
    assert.equal((await res.json()).error, 'Timeout');
  });
  await new Promise((r) => setTimeout(r, 1400));
  assert.equal(existsSync(sentinel), false, 'grandchild survived the timeout kill');
});

// ---------------------------------------------------------------- temp file hygiene
test('the temp audio file is removed on success, failure, timeout and abort', async () => {
  const before = strays().length;
  await withRoute({ command: echoFlags }, async (call) => {
    await call('/api/transcribe?locale=en', { body: silence1s() });
  });
  assert.equal(strays().length, before, 'leak after success');

  await withRoute({ command: emits({ ok: false, error: 'NoSpeech', detail: 'x' }) }, async (call) => {
    await call('/api/transcribe?locale=en', { body: silence1s() });
  });
  assert.equal(strays().length, before, 'leak after failure');

  await withRoute({ command: fake('setTimeout(()=>{},60000)'), timeoutMs: 250 }, async (call) => {
    await call('/api/transcribe?locale=en', { body: silence1s() });
  });
  await new Promise((r) => setTimeout(r, 400));
  assert.equal(strays().length, before, 'leak after timeout');

  await withRoute({ command: echoFlags }, async (call) => {
    // Client vanishes mid-upload: the handler must not keep a file or a child.
    await call('/api/transcribe?locale=en', { body: Buffer.alloc(400 * 1024), abortAfterMs: 5 });
  });
  await new Promise((r) => setTimeout(r, 400));
  assert.equal(strays().length, before, 'leak after client abort');
});

test('the temp audio file is owner-only while it exists', async () => {
  // The bridge is the only reader; 0600 means another local account cannot read a
  // child's voice out of /tmp while the transcription runs.
  const probe = fake('const f=(process.argv.find(a=>a.startsWith("--audio="))||"").split("=")[1];'
    + 'const m=require("fs").statSync(f).mode & 0o777;'
    + 'process.stdout.write(JSON.stringify({ok:true,transcript:"mode "+m.toString(8),language:"en"}))');
  await withRoute({ command: probe }, async (call) => {
    const j = await (await call('/api/transcribe?locale=en', { body: silence1s() })).json();
    assert.equal(j.transcript, 'mode 600');
  });
});

// ---------------------------------------------------------------- REAL MODEL
// These three run the actual cached faster-whisper path through the managed runtime.
// Offline (HF_HUB_OFFLINE=1), no provider, no download, no playback.
test('REAL-MODEL: synthetic speech transcribes locally', { skip: !REAL }, async () => {
  const audio = (await import('node:fs/promises')).then;
  const body = (await import('node:fs')).readFileSync(SCRATCH_AIFF);
  await withRoute({ timeoutMs: 30_000 }, async (call) => {
    const res = await call('/api/transcribe?locale=en', { body, headers: { 'content-type': 'audio/aiff' } });
    assert.equal(res.status, 200, res.text());
    const j = await res.json();
    assert.equal(j.local, true);
    assert.equal(j.language, 'en');
    assert.match(j.transcript.toLowerCase(), /vapor/);
  });
  void audio;
});

test('REAL-MODEL: silence is NoSpeech, not an empty success', { skip: !REAL }, async () => {
  await withRoute({ timeoutMs: 30_000 }, async (call) => {
    const res = await call('/api/transcribe?locale=en', { body: silence1s() });
    assert.equal(res.status, 409, res.text());
    assert.equal((await res.json()).error, 'NoSpeech');
  });
});

test('REAL-MODEL: malformed audio and over-long audio are rejected before the model loads',
  { skip: !REAL }, async () => {
    await withRoute({ timeoutMs: 30_000 }, async (call) => {
      const bad = await call('/api/transcribe?locale=en', { body: garbage(), headers: { 'content-type': 'audio/webm' } });
      assert.equal(bad.status, 415, bad.text());
      assert.equal((await bad.json()).error, 'Unsupported');

      const long = await call('/api/transcribe?locale=en', { body: tooLong() });
      assert.equal(long.status, 413, long.text());
      assert.equal((await long.json()).error, 'TooLong');
    });
  });
