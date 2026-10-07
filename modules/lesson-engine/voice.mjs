// Local-only speech-to-text for one short learner turn. Node stdlib only.
//
// What this is NOT: it is not a dictation service and not a voice assistant. One
// utterance in, one transcript out, nothing kept. There is no audio storage, no
// transcript log, no cache and no cloud provider — the audio is decoded by a
// cached local Whisper model in a short-lived subprocess and the temp file is
// deleted on every exit path.
//
// The engine worker mounts this as:  POST /api/transcribe?locale=en|es
// after its own same-origin gate and standard response headers. This module owns
// the method/locale/acknowledgement/mime/size gates and the subprocess contract.
import { spawn } from 'node:child_process';
import { writeFile, unlink, chmod } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DIR = dirname(fileURLToPath(import.meta.url));

const MAX_BODY_BYTES = 1024 * 1024;   // ~20s of browser opus with headroom
const MAX_STDOUT_BYTES = 16 * 1024;   // the bridge emits one small JSON object
const DEFAULT_TIMEOUT_MS = 30_000;    // HARD: enforced by killing the group
const LOCALES = new Set(['en', 'es']);

// `python3 run_runtime.py voice_bridge.py` = Hermes' own managed runtime, so the
// bridge imports the installed faster-whisper rather than a worktree copy.
const DEFAULT_CMD = ['python3', '/Users/man/hermes-router-integration/scripts/run_runtime.py',
  join(DIR, 'voice_bridge.py')];

// Browsers hand us whatever MediaRecorder picked; av demuxes all of these directly,
// so there is no conversion step. Anything else is refused rather than sniffed.
const MIME_EXT = new Map([
  ['audio/webm', 'webm'], ['audio/ogg', 'ogg'], ['audio/opus', 'ogg'],
  ['audio/mp4', 'm4a'], ['audio/mpeg', 'mp3'], ['audio/wav', 'wav'],
  ['audio/x-wav', 'wav'], ['audio/wave', 'wav'], ['audio/aiff', 'aiff'], ['audio/x-aiff', 'aiff'],
]);

// Fixed, child-readable text per failure class. The bridge's own detail is DISCARDED:
// a library message can carry filesystem paths, model names or token fragments, and
// none of that belongs in a browser response.
const FAILURES = new Map([
  ['NoSpeech', [409, 'I did not hear anything. Try again and speak a little louder.']],
  ['Unsupported', [415, 'That recording could not be read. Try recording it again.']],
  ['TooLong', [413, 'That was too long. Keep it under 20 seconds.']],
  ['Unavailable', [503, 'Voice input is not working on this machine right now. Type your answer instead.']],
]);

class VoiceError extends Error {
  constructor(status, error, message) { super(message); this.status = status; this.error = error; }
}
const fail = (cls) => {
  const [status, message] = FAILURES.get(cls) ?? FAILURES.get('Unavailable');
  return new VoiceError(status, cls, message);
};

// ponytail: one module-level in-flight slot, not a queue. faster-whisper decode is
// blocking and CPU-bound and this is a single-learner local prototype; a second
// speaker gets a typed 429 and retries. Add a queue only if it ever serves two people.
let inFlight = false;

function readAudio(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY_BYTES) {
        // Drain, never destroy: destroying the socket would deny the client its
        // typed 413 and look like a crash.
        chunks.length = 0; req.resume();
        reject(new VoiceError(413, 'PayloadTooLarge', 'That recording is too large. Keep it under 20 seconds.'));
      } else chunks.push(c);
    });
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      if (body.length === 0) { reject(new VoiceError(400, 'BadRequest', 'No audio was sent.')); return; }
      resolve(body);
    });
    // A learner who closes the tab mid-upload must not leave a file or a child
    // behind — we have not written anything to disk yet at this point.
    req.on('aborted', () => reject(new VoiceError(400, 'BadRequest', 'The recording upload stopped early.')));
    req.on('error', () => reject(new VoiceError(400, 'BadRequest', 'The recording upload failed.')));
  });
}

function runBridge(cmd, path, locale, timeoutMs, req) {
  return new Promise((resolve, reject) => {
    const [bin, ...args] = cmd;
    // detached: own process group. The bridge runs as run_runtime.py -> python
    // grandchild, so signalling only the direct child would orphan the grandchild
    // and leave a model decoding audio we already stopped waiting for.
    const child = spawn(bin, [...args, `--audio=${path}`, `--locale=${locale}`],
      { cwd: DIR, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
    let out = ''; let over = false; let settled = false;
    const stop = (signal) => {
      try { process.kill(-child.pid, signal); }        // whole group
      catch { try { child.kill(signal); } catch { /* already gone */ } }
    };

    // Learner navigated away: stop burning CPU on a transcript nobody will read.
    // NOT req 'close': that fires as soon as the body has fully arrived, before decoding
    // even starts, so it cannot tell "gone" from "uploaded" — which is why guarding it on
    // !req.complete silently disabled cancellation for every disconnect AFTER the upload.
    // The socket closing is the signal the client is really gone, during upload or decode.
    const socket = req?.socket;
    const onGone = () => { if (!settled) { stop('SIGKILL'); done(reject, fail('Unavailable')); } };
    // Listeners come off on every exit path: a keep-alive socket outlives this request and
    // must not collect one dead handler per transcription.
    const done = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      req?.off('aborted', onGone);
      socket?.off('close', onGone);
      fn(value);
    };

    const timer = setTimeout(() => {
      if (settled) return;
      stop('SIGTERM');
      setTimeout(() => stop('SIGKILL'), 1000).unref();
      done(reject, new VoiceError(504, 'Timeout',
        'That took too long and was stopped. Try a shorter recording, or type your answer.'));
    }, timeoutMs);

    req?.once('aborted', onGone);
    socket?.once('close', onGone);
    // Already gone before we even spawned (client vanished during the disk write): a
    // 'close' that has already fired will never fire again, so check the state too.
    if (socket?.destroyed) onGone();

    child.stdout.on('data', (c) => {
      out += c;
      if (out.length > MAX_STDOUT_BYTES) { over = true; stop('SIGKILL'); }
    });
    child.stderr.resume();      // drained, never logged: no audio or transcript in logs
    child.on('error', () => done(reject, fail('Unavailable')));
    child.on('close', () => {
      if (over) { done(reject, fail('Unavailable')); return; }
      let parsed;
      try { parsed = JSON.parse(out); } catch { done(reject, fail('Unavailable')); return; }
      if (parsed?.ok === true && typeof parsed.transcript === 'string' && parsed.transcript.trim()) {
        done(resolve, parsed);
      } else {
        done(reject, fail(FAILURES.has(parsed?.error) ? parsed.error : 'Unavailable'));
      }
    });
  });
}

/**
 * Transcribe one raw-audio POST locally.
 * @returns {Promise<{transcript: string, language: 'en'|'es', local: true}>}
 * Rejects with an Error carrying .status, .error and a child-safe .message.
 */
export async function transcribeRequest(req, options = {}) {
  const { command = process.env.LESSON_STT_CMD, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  const cmd = Array.isArray(command) ? command : (command ? String(command).split('|') : DEFAULT_CMD);

  if (req.method !== 'POST') throw new VoiceError(405, 'MethodNotAllowed', 'Use POST.');
  // Owner acknowledgement that an adult is running this prototype on their own
  // machine. NOT verified age and NOT parental consent.
  if (req.headers['x-adult-test'] !== 'true') {
    throw new VoiceError(400, 'AdultTestRequired',
      'x-adult-test must be true: this prototype is for an adult owner testing it on their own machine.');
  }
  // The caller may pass an already-parsed locale (server.mjs does); otherwise read the
  // query itself. Validated here either way — a caller's parse is not a trust boundary.
  const locale = options.locale ?? new URL(req.url, 'http://127.0.0.1').searchParams.get('locale');
  if (!LOCALES.has(locale)) throw new VoiceError(400, 'BadRequest', 'locale must be en or es.');
  const mime = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  const ext = MIME_EXT.get(mime);
  if (!ext) throw new VoiceError(415, 'UnsupportedMediaType', 'Send raw audio: webm, ogg, mp4, wav or aiff.');

  if (inFlight) {
    req.resume();   // drain so the client still gets its 429 instead of a reset
    throw new VoiceError(429, 'Busy', 'One recording is already being transcribed. Wait for it to finish.');
  }
  inFlight = true;
  let path = null;
  try {
    const audio = await readAudio(req);
    path = join(tmpdir(), `voice-stt-${randomUUID()}.${ext}`);
    // 0600 before any content exists, then an explicit chmod so umask cannot widen
    // it: while this file lives, a child's voice is readable by its owner only.
    await writeFile(path, audio, { mode: 0o600, flag: 'wx' });
    await chmod(path, 0o600);
    const reply = await runBridge(cmd, path, locale, timeoutMs, req);
    // Only these three fields: no path, no model name, no provider, no timings.
    return { transcript: reply.transcript.trim(), language: locale, local: true };
  } finally {
    // Success, typed failure, timeout, abort and crash all land here.
    if (path) await unlink(path).catch(() => {});
    inFlight = false;
  }
}
