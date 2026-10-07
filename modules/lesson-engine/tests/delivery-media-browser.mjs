/* delivery-media-browser.mjs — real Chrome, real DOM, real clicks, SYNTHETIC devices.
 *   node lesson/tests/delivery-media-browser.mjs
 *
 * HONESTY LABEL, read this before quoting any result from here:
 *   - The microphone is Chrome's `--use-fake-device-for-media-stream` synthetic tone.
 *     A green run here is FAKE-DEVICE success. It is NOT evidence that a real
 *     microphone works, and it is NOT evidence that the owner's mic was ever opened.
 *   - speechSynthesis is replaced by a plain JS object in the page. Nothing is
 *     spoken, no audio device is opened, Chrome runs with --mute-audio. A green
 *     "Listen" result is FAKE-SPEECH success, not a real-speaker test.
 *   - /api/transcribe is a stubbed window.fetch with handwritten responses. No
 *     provider call, no local Whisper subprocess, no real transcript. Every
 *     "transcript" string below was typed by hand in this file.
 *   - The camera is never requested anywhere in the product or in this harness.
 */
import { chromium } from '../../devtools/browser/node_modules/playwright/index.mjs';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(here, '..');
const repoDir = resolve(appDir, '..');
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
const shotDir = resolve(repoDir, 'delivery', 'evidence', `media-${stamp}`);
const CHROME = '/Users/man/.agent-browser/browsers/chrome-153.0.8010.52/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const TYPES = { '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const ALLOW = new Set(['/voice-client.mjs', '/scenes.mjs', '/media.css', '/styles.css']);

// Slice selector so the voice lifecycle and the scenes can be evidenced independently.
const SLICE = (process.argv[2] || 'all').toLowerCase();
const wants = (name) => SLICE === 'all' || SLICE === name;

const log = [];
const say = (...a) => { const s = a.join(' '); log.push(s); console.log(s); };
let passed = 0; let failed = 0;
const check = async (name, fn) => {
  try { await fn(); passed++; say('  PASS ' + name); }
  catch (err) { failed++; say('  FAIL ' + name + ' :: ' + (err && err.message)); }
};
const eq = (got, want, what) => {
  if (got !== want) throw new Error(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};
const ok = (cond, what) => { if (!cond) throw new Error(what); };

// --------------------------------------------------------------- fixtures
// Hand-written. Shapes mirror lesson/core.mjs VISUALS exactly.
const V = {
  fraction: { kind: 'fraction', parts: 8, filled: 3, caption: 'A bar cut into eight equal parts.' },
  numberline: { kind: 'numberline', min: -5, max: 5, value: 2, caption: 'A line from minus five to five.' },
  tokens: { kind: 'tokens', count: 7, caption: 'Seven counters to count.' },
  passage: { kind: 'passage', text: 'Ana packed her bag. She left before sunrise. The road was quiet.', caption: 'A short story about leaving early.' },
  sequence: {
    kind: 'sequence', caption: 'How rain gets back to the clouds.',
    stages: [
      { label: 'Heat', detail: 'The sun warms the water in the lake.' },
      { label: 'Rise', detail: 'Warm water turns to vapour and rises.' },
      { label: 'Cool', detail: 'High up it cools and forms droplets.' },
    ],
  },
};

const PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/media.css"></head>
<body><div id="app" class="lw-app"><main id="host"></main></div></body></html>`;

// --------------------------------------------------------------- harness server
async function serve() {
  const server = createServer(async (req, res) => {
    const path = new URL(req.url, 'http://127.0.0.1').pathname;
    if (path === '/' || path === '/index.html') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(PAGE); return;
    }
    if (!ALLOW.has(path)) { res.writeHead(404); res.end('no'); return; }
    try {
      const body = await readFile(resolve(appDir, path.slice(1)));
      res.writeHead(200, { 'content-type': TYPES[path.slice(path.lastIndexOf('.'))] });
      res.end(body);
    } catch { res.writeHead(404); res.end('no'); }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}

// Installed in the page BEFORE any module import. Keeps the owner's real devices out:
// speechSynthesis never reaches the platform, and every counter is observable.
const INSTRUMENT = () => {
  const w = window;
  w.__t = {
    gum: 0, gumArgs: [], speak: 0, spoken: [], cancel: 0, posts: [], stopped: 0,
    events: [], errors: [], transcripts: [], turns: [],
    fetchMode: 'ok', voices: [], voicesChangedListeners: 0,
  };
  // --- SYNTHETIC speech engine. Nothing is ever spoken aloud.
  class FakeUtterance {
    constructor(text) { this.text = text; this.lang = ''; this.voice = null; this.onend = null; this.onerror = null; }
  }
  w.SpeechSynthesisUtterance = FakeUtterance;
  // window.speechSynthesis is a readonly accessor: `w.speechSynthesis = x` silently
  // does nothing and the REAL engine stays wired up. defineProperty is required.
  const fakeSynth = {
    speaking: false,
    getVoices: () => w.__t.voices,
    speak(u) {
      w.__t.speak++; w.__t.spoken.push({ text: u.text, lang: u.lang, voice: u.voice && u.voice.name });
      this.speaking = true;
      w.__t.endSpeech = () => { this.speaking = false; if (u.onend) u.onend(); };
    },
    cancel() { w.__t.cancel++; this.speaking = false; },
    addEventListener(type) { if (type === 'voiceschanged') w.__t.voicesChangedListeners++; },
    removeEventListener(type) { if (type === 'voiceschanged') w.__t.voicesChangedListeners--; },
  };
  Object.defineProperty(w, 'speechSynthesis', { value: fakeSynth, configurable: true });
  // real addEventListener plumbing with a counter
  const cbs = new Set();
  fakeSynth.addEventListener = (type, cb) => { if (type === 'voiceschanged') { cbs.add(cb); w.__t.voicesChangedListeners = cbs.size; } };
  fakeSynth.removeEventListener = (type, cb) => { if (type === 'voiceschanged') { cbs.delete(cb); w.__t.voicesChangedListeners = cbs.size; } };
  w.__t.fireVoicesChanged = () => { for (const cb of cbs) cb(); };

  // --- SYNTHETIC on-device SpeechRecognition. Chrome 153 really exposes
  // processLocally + static available()/install(); this fake lets the harness drive
  // every branch without downloading a language pack or opening a microphone.
  w.__t.srAvail = 'downloadable'; w.__t.srInstall = true;
  w.__t.sr = { constructed: 0, started: [], stopped: 0, aborted: 0, availableCalls: [], installCalls: [] };
  class FakeRecognition {
    constructor() { w.__t.sr.constructed++; this.lang = ''; this.continuous = false; this.interimResults = false; w.__t.sr.last = this; }
    start() { w.__t.sr.started.push({ lang: this.lang, processLocally: this.processLocally }); }
    stop() { w.__t.sr.stopped++; }
    abort() { w.__t.sr.aborted++; }
    emitResult(text) {
      const ev = { results: [[{ transcript: text, confidence: 0.9 }]], resultIndex: 0 };
      ev.results[0].isFinal = true; ev.results.length = 1;
      if (this.onresult) this.onresult(ev);
      if (this.onend) this.onend();
    }
    emitError(code) { if (this.onerror) this.onerror({ error: code }); if (this.onend) this.onend(); }
  }
  FakeRecognition.available = async (opts) => { w.__t.sr.availableCalls.push(opts); return w.__t.srAvail; };
  FakeRecognition.install = async (opts) => {
    w.__t.sr.installCalls.push(opts);
    if (w.__t.srInstall === 'throw') throw new Error('pack download failed');
    if (w.__t.srInstall) { w.__t.srAvail = 'available'; return true; }
    return false;
  };
  w.FakeRecognition = FakeRecognition;
  w.__t.useSR = (on) => {
    if (on) { w.SpeechRecognition = FakeRecognition; }
    else { delete w.SpeechRecognition; delete w.webkitSpeechRecognition; }
  };
  w.__t.useSR(true);
  delete w.webkitSpeechRecognition;

  // --- getUserMedia counter wrapping the SYNTHETIC Chrome fake device.
  const realGum = navigator.mediaDevices && navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  w.__t.realGum = realGum;
  if (navigator.mediaDevices) {
    navigator.mediaDevices.getUserMedia = async (c) => {
      w.__t.gum++; w.__t.gumArgs.push(JSON.parse(JSON.stringify(c)));
      if (w.__t.gumMode === 'denied') { const e = new Error('denied'); e.name = 'NotAllowedError'; throw e; }
      if (w.__t.gumMode === 'missing') { const e = new Error('no device'); e.name = 'NotFoundError'; throw e; }
      const s = await realGum(c);
      for (const tr of s.getTracks()) {
        const realStop = tr.stop.bind(tr);
        tr.stop = () => { w.__t.stopped++; realStop(); };
      }
      return s;
    };
  }
  // --- stubbed transcribe endpoint. Handwritten bodies, no provider, no Whisper.
  w.fetch = async (url, init = {}) => {
    const body = init.body;
    w.__t.posts.push({
      url: String(url), method: init.method,
      headers: Object.assign({}, init.headers),
      type: body && body.type, size: body && body.size,
    });
    if (w.__t.fetchMode === 'network') throw new TypeError('Failed to fetch');
    if (w.__t.fetchMode === 'server') {
      return new Response(JSON.stringify({ error: 'Unavailable', message: 'RAW-SERVER-DETAIL /Users/man/secret/path model=whisper-small' }),
        { status: 503, headers: { 'content-type': 'application/json' } });
    }
    if (w.__t.fetchMode === 'nospeech') {
      return new Response(JSON.stringify({ error: 'NoSpeech', message: 'RAW-NOSPEECH-DETAIL' }),
        { status: 409, headers: { 'content-type': 'application/json' } });
    }
    return new Response(JSON.stringify({ transcript: 'three eighths of the bar', language: 'en', local: true }),
      { status: 200, headers: { 'content-type': 'application/json' } });
  };
  w.__t.mount = async (mod, opts) => {
    const host = document.getElementById('host');
    host.textContent = '';
    const m = await import(mod);
    const make = m.createVoiceControls || m.createTeachingScene;
    const o = Object.assign({
      onEvent: (e) => w.__t.events.push(e),
      onError: (e) => w.__t.errors.push(e),
      onTranscript: (t) => w.__t.transcripts.push(t),
      onTurn: (t, d) => w.__t.turns.push([t, d]),
    }, opts);
    // getText cannot cross the evaluate boundary as a function; the caller passes
    // the string it should return.
    if (typeof o.getTextValue === 'string') o.getText = () => o.getTextValue;
    const handle = make(o);
    host.append(handle.element);
    w.__t.handle = handle;
    return true;
  };
};

const run = async () => {
  await mkdir(shotDir, { recursive: true });
  const { server, base } = await serve();
  const browser = await chromium.launch({
    executablePath: CHROME, headless: true,
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--mute-audio'],
  });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['microphone'] });
  await ctx.addInitScript(INSTRUMENT);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => say('  PAGEERROR ' + e.message));
  const go = async () => { await page.goto(base + '/', { waitUntil: 'load' }); };
  await go();

  const T = (fn, ...a) => page.evaluate(fn, ...a);
  const state = () => T(() => JSON.parse(JSON.stringify({
    gum: window.__t.gum, gumArgs: window.__t.gumArgs, speak: window.__t.speak,
    spoken: window.__t.spoken, cancel: window.__t.cancel, posts: window.__t.posts,
    stopped: window.__t.stopped, events: window.__t.events, errors: window.__t.errors,
    transcripts: window.__t.transcripts, turns: window.__t.turns,
    listeners: window.__t.voicesChangedListeners, sr: window.__t.sr,
  })));
  const html = () => T(() => document.getElementById('host').innerHTML);
  const text = () => T(() => document.getElementById('host').textContent);
  const shot = async (name) => {
    const p = resolve(shotDir, name + '.png');
    await page.screenshot({ path: p, fullPage: true });
    return p;
  };
  const localVoices = [{ name: 'Local EN', lang: 'en-US', localService: true },
    { name: 'Local ES', lang: 'es-ES', localService: true },
    { name: 'Cloud EN', lang: 'en-US', localService: false }];

  // =============================================================== VOICE
  if (wants('voice')) {
  say('\nvoice-client.mjs  [SYNTHETIC devices: fake mic tone, fake speech object, stubbed fetch]');

  await check('import has no device side effects', async () => {
    await go();
    await T(async () => { await import('/voice-client.mjs'); });
    const s = await state();
    eq(s.gum, 0, 'getUserMedia calls on import');
    eq(s.speak, 0, 'speak calls on import');
  });

  await check('renders record/stop/cancel and listen controls in EN', async () => {
    await go();
    await T((v) => { window.__t.voices = v; }, localVoices);
    await T((o) => window.__t.mount('/voice-client.mjs', o), { locale: 'en', capabilities: { localTranscription: true } });
    const h = await html();
    for (const id of ['lw-voice-record', 'lw-voice-stop', 'lw-voice-cancel', 'lw-voice-listen']) {
      ok(h.includes(id), `missing control ${id}`);
    }
    const t = await text();
    ok(/Record/i.test(t) && /Listen/i.test(t), 'EN labels missing: ' + t.slice(0, 200));
  });

  await check('renders Spanish labels when locale is es', async () => {
    await go();
    await T((v) => { window.__t.voices = v; }, localVoices);
    await T((o) => window.__t.mount('/voice-client.mjs', o), { locale: 'es', capabilities: { localTranscription: true } });
    const t = await text();
    ok(/Grabar/i.test(t), 'expected Spanish Record label, got: ' + t.slice(0, 200));
    ok(/Escuchar/i.test(t), 'expected Spanish Listen label');
  });

  await check('no local route and no on-device API => record disabled, explicit notice', async () => {
    await go();
    await T(() => window.__t.useSR(false));
    await T((o) => window.__t.mount('/voice-client.mjs', o), { locale: 'en' });
    eq(await T(() => document.querySelector('#lw-voice-record').disabled), true, 'record should be disabled');
    const t = await text();
    ok(/not available|unavailable|off on this/i.test(t), 'no unsupported notice: ' + t.slice(0, 300));
    ok(/[Tt]ype/.test(t), 'typed alternative not offered');
  });

  await check('localTranscription false never implies a cloud fallback', async () => {
    await go();
    await T(() => window.__t.useSR(false));
    await T((o) => window.__t.mount('/voice-client.mjs', o), { locale: 'en', capabilities: { localTranscription: false } });
    eq(await T(() => document.querySelector('#lw-voice-record').disabled), true, 'record should be disabled');
    const t = await text();
    ok(!/cloud|online|internet/i.test(t), 'notice must not offer a cloud route: ' + t);
  });

  await check('no getUserMedia until Record is clicked', async () => {
    await go();
    await T((o) => window.__t.mount('/voice-client.mjs', o), { locale: 'en', capabilities: { localTranscription: true } });
    eq((await state()).gum, 0, 'getUserMedia called before any click');
    await page.click('#lw-voice-record');
    await page.waitForFunction(() => window.__t.gum === 1);
    const s = await state();
    eq(s.gum, 1, 'getUserMedia call count');
    eq(s.gumArgs[0].video, false, 'camera must be explicitly off');
    ok(s.gumArgs[0].audio, 'audio must be requested');
  });

  await check('recording exposes a bounded 30s cap', async () => {
    const cap = await T(() => document.querySelector('[data-cap-ms]')?.getAttribute('data-cap-ms'));
    eq(cap, '30000', 'recording cap');
  });

  await check('stop posts same-origin transcribe with adult-test header and blob mime', async () => {
    await page.waitForTimeout(400);   // the learner speaking for a moment
    await page.click('#lw-voice-stop');
    await page.waitForFunction(() => window.__t.posts.length === 1, null, { timeout: 15000 });
    const s = await state();
    const p = s.posts[0];
    eq(p.method, 'POST', 'method');
    ok(p.url.startsWith('/api/transcribe?locale=en'), 'url: ' + p.url);
    eq(p.headers['x-adult-test'], 'true', 'adult-test header');
    ok(/^audio\//.test(p.headers['content-type'] || ''), 'content-type must be the blob mime: ' + p.headers['content-type']);
    eq(p.headers['content-type'], p.type, 'content-type must equal blob.type exactly');
    ok(p.size > 0, 'empty recording body');
  });

  await check('transcript becomes an editable draft and is never auto-submitted', async () => {
    await page.waitForFunction(() => window.__t.transcripts.length === 1, null, { timeout: 15000 });
    const s = await state();
    eq(s.transcripts[0], 'three eighths of the bar', 'transcript handed to onTranscript');
    const draft = await T(() => {
      const d = document.querySelector('#lw-voice-draft');
      return d ? { tag: d.tagName, value: d.value, readOnly: d.readOnly, disabled: d.disabled } : null;
    });
    ok(draft, 'no draft field rendered');
    eq(draft.value, 'three eighths of the bar', 'draft value');
    eq(draft.readOnly, false, 'draft must be editable');
    eq(draft.disabled, false, 'draft must be editable');
    ok(!await T(() => !!document.querySelector('#host form')), 'draft must not sit in a submitting form');
    ok(!s.events.some((e) => /submit/i.test(e)), 'no submit event may be emitted');
  });

  await check('events and errors are typed strings carrying no learner text or audio', async () => {
    const s = await state();
    ok(s.events.length > 0, 'no events emitted');
    for (const e of s.events) {
      eq(typeof e, 'string', 'event type');
      ok(/^[a-z][a-z-]{2,39}$/.test(e), 'event not a typed slug: ' + e);
      ok(!e.includes('three eighths'), 'event leaked transcript: ' + e);
      ok(!/blob:|data:/.test(e), 'event leaked audio handle: ' + e);
    }
  });

  await check('audio is not retained in the client after a finished turn', async () => {
    const leaks = await T(() => {
      const h = document.getElementById('host');
      return { audioEls: h.querySelectorAll('audio,video').length, blobUrls: h.innerHTML.includes('blob:') };
    });
    eq(leaks.audioEls, 0, 'audio/video element retained');
    eq(leaks.blobUrls, false, 'blob: URL retained in DOM');
  });

  await check('permission denial keeps typed answering with an authored EN notice', async () => {
    await go();
    await T(() => { window.__t.gumMode = 'denied'; });
    await T((o) => window.__t.mount('/voice-client.mjs', o), { locale: 'en', capabilities: { localTranscription: true } });
    await page.click('#lw-voice-record');
    await page.waitForFunction(() => window.__t.errors.length === 1, null, { timeout: 10000 });
    const s = await state();
    eq(s.errors[0], 'mic-denied', 'typed error code');
    const t = await text();
    ok(/microphone/i.test(t) && /[Tt]ype/.test(t), 'missing authored denial notice: ' + t.slice(0, 300));
    ok(!/NotAllowedError/.test(t), 'raw DOMException name leaked to the learner');
    eq(s.posts.length, 0, 'nothing may be uploaded after a denial');
  });
  await shot('voice-denied-en-1440');

  await check('permission denial notice is authored Spanish under locale es', async () => {
    await go();
    await T(() => { window.__t.gumMode = 'denied'; });
    await T((o) => window.__t.mount('/voice-client.mjs', o), { locale: 'es', capabilities: { localTranscription: true } });
    await page.click('#lw-voice-record');
    await page.waitForFunction(() => window.__t.errors.length === 1, null, { timeout: 10000 });
    const t = await text();
    ok(/micr[oó]fono/i.test(t), 'missing Spanish denial notice: ' + t.slice(0, 300));
    ok(!/microphone/i.test(t), 'English leaked into the Spanish notice');
  });

  await check('missing media device is a typed state, not a crash', async () => {
    await go();
    await T(() => { window.__t.gumMode = 'missing'; });
    await T((o) => window.__t.mount('/voice-client.mjs', o), { locale: 'en', capabilities: { localTranscription: true } });
    await page.click('#lw-voice-record');
    await page.waitForFunction(() => window.__t.errors.length === 1, null, { timeout: 10000 });
    eq((await state()).errors[0], 'mic-missing', 'typed error code');
  });

  await check('network failure reports a typed code and no raw error text', async () => {
    await go();
    await T(() => { window.__t.fetchMode = 'network'; });
    await T((o) => window.__t.mount('/voice-client.mjs', o), { locale: 'en', capabilities: { localTranscription: true } });
    await page.click('#lw-voice-record');
    await page.waitForFunction(() => window.__t.gum === 1);
    await page.click('#lw-voice-stop');
    await page.waitForFunction(() => window.__t.errors.length === 1, null, { timeout: 15000 });
    eq((await state()).errors[0], 'network', 'typed error code');
    const t = await text();
    ok(!/Failed to fetch|TypeError/.test(t), 'raw fetch error leaked: ' + t.slice(0, 300));
    ok(/[Tt]ype/.test(t), 'typed alternative not offered after a network failure');
  });

  await check('server failure shows an authored notice, never the response body', async () => {
    await go();
    await T(() => { window.__t.fetchMode = 'server'; });
    await T((o) => window.__t.mount('/voice-client.mjs', o), { locale: 'en', capabilities: { localTranscription: true } });
    await page.click('#lw-voice-record');
    await page.waitForFunction(() => window.__t.gum === 1);
    await page.click('#lw-voice-stop');
    await page.waitForFunction(() => window.__t.errors.length === 1, null, { timeout: 15000 });
    eq((await state()).errors[0], 'server', 'typed error code');
    const t = await text();
    ok(!/RAW-SERVER-DETAIL|whisper-small|\/Users\//.test(t), 'raw server detail leaked: ' + t.slice(0, 400));
  });

  await check('cancel stops every track and uploads nothing', async () => {
    await go();
    await T((o) => window.__t.mount('/voice-client.mjs', o), { locale: 'en', capabilities: { localTranscription: true } });
    await page.click('#lw-voice-record');
    await page.waitForFunction(() => window.__t.gum === 1);
    await page.click('#lw-voice-cancel');
    await page.waitForFunction(() => window.__t.stopped > 0, null, { timeout: 10000 });
    await page.waitForTimeout(250);
    const s = await state();
    eq(s.posts.length, 0, 'cancel must not upload');
    ok(s.events.includes('record-cancel'), 'no record-cancel event: ' + s.events.join(','));
  });

  await check('destroy mid-recording stops tracks, uploads nothing and drops late callbacks', async () => {
    await go();
    await T((o) => window.__t.mount('/voice-client.mjs', o), { locale: 'en', capabilities: { localTranscription: true } });
    await page.click('#lw-voice-record');
    await page.waitForFunction(() => window.__t.gum === 1);
    const before = (await state()).events.length;
    await T(() => window.__t.handle.destroy());
    await page.waitForTimeout(500);
    const s = await state();
    ok(s.stopped > 0, 'tracks were not stopped on destroy');
    eq(s.posts.length, 0, 'destroy must not upload');
    eq(s.transcripts.length, 0, 'late transcript callback fired after destroy');
    ok(s.events.length >= before, 'event bookkeeping broke');
    eq(await T(() => window.__t.handle.element.isConnected), false, 'element should be detached on destroy');
  });

  await check('Listen speaks only on an explicit click and prefers a local voice', async () => {
    await go();
    await T((v) => { window.__t.voices = v; }, localVoices);
    await T((o) => window.__t.mount('/voice-client.mjs', o), {
      locale: 'en', capabilities: { localTranscription: true }, getTextValue: 'Shade three of the eight parts.',
    });
    eq((await state()).speak, 0, 'autoplay: speech started without a click');
    await page.click('#lw-voice-listen');
    await page.waitForFunction(() => window.__t.speak === 1, null, { timeout: 10000 });
    const s = await state();
    eq(s.spoken[0].text, 'Shade three of the eight parts.', 'spoke the wrong text');
    eq(s.spoken[0].voice, 'Local EN', 'must prefer localService===true voice');
  });

  await check('Stop cancels playback and clears the speaking state', async () => {
    await page.click('#lw-voice-listen-stop');
    await page.waitForFunction(() => window.__t.cancel >= 1, null, { timeout: 10000 });
    eq(await T(() => document.querySelector('#lw-voice-listen').getAttribute('data-speaking')), 'false', 'speaking state not cleared');
  });

  await check('remote-only voices leave playback unsupported with the text retained', async () => {
    await go();
    await T(() => { window.__t.voices = [{ name: 'Cloud EN', lang: 'en-US', localService: false }]; });
    await T((o) => window.__t.mount('/voice-client.mjs', o), {
      locale: 'en', capabilities: { localTranscription: true }, getTextValue: 'Shade three of the eight parts.',
    });
    await page.waitForTimeout(1600);
    eq(await T(() => document.querySelector('#lw-voice-listen').disabled), true, 'listen should be disabled');
    const s = await state();
    eq(s.speak, 0, 'must not speak through a remote voice');
    ok(s.events.includes('listen-unsupported'), 'no listen-unsupported event: ' + s.events.join(','));
    ok(/read it|on screen|text/i.test(await text()), 'must keep pointing at the on-screen text');
  });

  await check('late voiceschanged is handled once and the listener is released', async () => {
    await go();
    await T(() => { window.__t.voices = []; });
    await T((o) => window.__t.mount('/voice-client.mjs', o), {
      locale: 'en', capabilities: { localTranscription: true }, getTextValue: 'Hello.',
    });
    eq((await state()).listeners, 1, 'should hold exactly one voiceschanged listener while waiting');
    await T((v) => { window.__t.voices = v; window.__t.fireVoicesChanged(); }, localVoices);
    await page.waitForFunction(() => !document.querySelector('#lw-voice-listen').disabled, null, { timeout: 10000 });
    eq((await state()).listeners, 0, 'voiceschanged listener leaked');
  });

  await check('destroy cancels any in-flight speech', async () => {
    await page.click('#lw-voice-listen');
    await page.waitForFunction(() => window.__t.speak === 1);
    const before = (await state()).cancel;
    await T(() => window.__t.handle.destroy());
    ok((await state()).cancel > before, 'speech was not cancelled on destroy');
  });

  // ---------------------------------------------------- native on-device path
  // Chrome 153 exposes SpeechRecognition.processLocally + static available()/install().
  // Used ONLY when the local Whisper backend is absent. Default recognition is
  // CLOUD, so processLocally must be proven true before any start().
  say('\n  native on-device SpeechRecognition  [SYNTHETIC recognition object]');
  const onDevice = (opts = {}) => T((o) => window.__t.mount('/voice-client.mjs', o),
    Object.assign({ locale: 'en', capabilities: { localTranscription: false } }, opts));

  await check('on-device probe asks for processLocally and installs nothing on mount', async () => {
    await go();
    await onDevice();
    await page.waitForFunction(() => window.__t.sr.availableCalls.length === 1, null, { timeout: 10000 });
    const s = await state();
    eq(s.sr.availableCalls[0].processLocally, true, 'available() must ask for the on-device mode');
    eq(JSON.stringify(s.sr.availableCalls[0].langs), '["en-US"]', 'langs');
    eq(s.sr.installCalls.length, 0, 'mount must not download a language pack');
    eq(s.sr.constructed, 0, 'mount must not construct a recognizer');
    eq(s.sr.started.length, 0, 'mount must not start recognition');
  });

  await check('downloadable gates Record behind an explicit download control', async () => {
    eq(await T(() => document.querySelector('#lw-voice-record').disabled), true, 'record must stay disabled until the pack exists');
    ok(await T(() => !!document.querySelector('#lw-voice-install')), 'no download control rendered');
    const t = await text();
    ok(/download/i.test(t), 'download step not explained: ' + t.slice(0, 300));
    ok(/this computer|on this device|stays on/i.test(t), 'on-device promise not stated: ' + t.slice(0, 300));
  });

  await check('download installs the pack on-device and then enables Record', async () => {
    await page.click('#lw-voice-install');
    await page.waitForFunction(() => !document.querySelector('#lw-voice-record').disabled, null, { timeout: 10000 });
    const s = await state();
    eq(s.sr.installCalls.length, 1, 'install call count');
    eq(s.sr.installCalls[0].processLocally, true, 'install must request the on-device pack');
    ok(s.events.includes('pack-installed'), 'no pack-installed event: ' + s.events.join(','));
    eq(await T(() => !!document.querySelector('#lw-voice-install')), false, 'download control should be gone once installed');
  });

  await check('Record starts recognition with processLocally true and no upload', async () => {
    await page.click('#lw-voice-record');
    await page.waitForFunction(() => window.__t.sr.started.length === 1, null, { timeout: 10000 });
    const s = await state();
    eq(s.sr.started[0].processLocally, true, 'recognition started WITHOUT the on-device flag');
    eq(s.sr.started[0].lang, 'en-US', 'recognition language');
    eq(s.posts.length, 0, 'on-device recognition must upload nothing');
    eq(s.gum, 0, 'recognition owns the mic; no separate getUserMedia');
  });

  await check('on-device result becomes an editable draft, never a submission', async () => {
    await T(() => window.__t.sr.last.emitResult('two thirds of the bar'));
    await page.waitForFunction(() => window.__t.transcripts.length === 1, null, { timeout: 10000 });
    const s = await state();
    eq(s.transcripts[0], 'two thirds of the bar', 'transcript');
    eq(s.posts.length, 0, 'still nothing uploaded');
    eq(await T(() => document.querySelector('#lw-voice-draft').value), 'two thirds of the bar', 'draft value');
    eq(await T(() => document.querySelector('#lw-voice-draft').readOnly), false, 'draft must be editable');
  });

  await check('install failure fails closed with a typed code and no cloud attempt', async () => {
    await go();
    await T(() => { window.__t.srInstall = false; });
    await onDevice();
    await page.waitForFunction(() => !!document.querySelector('#lw-voice-install'), null, { timeout: 10000 });
    await page.click('#lw-voice-install');
    await page.waitForFunction(() => window.__t.errors.length === 1, null, { timeout: 10000 });
    const s = await state();
    eq(s.errors[0], 'pack-failed', 'typed error code');
    eq(await T(() => document.querySelector('#lw-voice-record').disabled), true, 'record must stay disabled after a failed download');
    eq(s.sr.started.length, 0, 'must never start cloud recognition after a failed install');
    const t = await text();
    ok(!/cloud|online|internet/i.test(t), 'failure copy must not offer a cloud route: ' + t);
    ok(/[Tt]ype/.test(t), 'typed alternative not offered');
  });

  await check('install throwing is the same fail-closed state', async () => {
    await go();
    await T(() => { window.__t.srInstall = 'throw'; });
    await onDevice();
    await page.waitForFunction(() => !!document.querySelector('#lw-voice-install'), null, { timeout: 10000 });
    await page.click('#lw-voice-install');
    await page.waitForFunction(() => window.__t.errors.length === 1, null, { timeout: 10000 });
    eq((await state()).errors[0], 'pack-failed', 'typed error code');
    eq(await T(() => document.querySelector('#lw-voice-record').disabled), true, 'record must stay disabled');
  });

  await check('available=unavailable is off, with no download offered', async () => {
    await go();
    await T(() => { window.__t.srAvail = 'unavailable'; window.__t.srInstall = true; });
    await onDevice();
    await page.waitForFunction(() => window.__t.sr.availableCalls.length === 1, null, { timeout: 10000 });
    await page.waitForTimeout(150);
    eq(await T(() => !!document.querySelector('#lw-voice-install')), false, 'must not offer a download that cannot work');
    eq(await T(() => document.querySelector('#lw-voice-record').disabled), true, 'record must stay disabled');
    const t = await text();
    ok(!/cloud|online|internet/i.test(t), 'must not offer a cloud route: ' + t);
  });

  await check('available=available enables Record with no download step', async () => {
    await go();
    await T(() => { window.__t.srAvail = 'available'; });
    await onDevice();
    await page.waitForFunction(() => !document.querySelector('#lw-voice-record').disabled, null, { timeout: 10000 });
    eq(await T(() => !!document.querySelector('#lw-voice-install')), false, 'no download needed when the pack is present');
  });

  await check('a recognizer that drops processLocally is refused, never run as cloud', async () => {
    await go();
    await T(() => {
      window.__t.srAvail = 'available';
      // A browser that reports the static surface but silently ignores the instance
      // flag would transcribe in the CLOUD. Simulate exactly that.
      class Sneaky extends window.FakeRecognition {
        set processLocally(_v) { /* swallowed */ }
        get processLocally() { return false; }
      }
      Sneaky.available = window.FakeRecognition.available;
      Sneaky.install = window.FakeRecognition.install;
      window.SpeechRecognition = Sneaky;
    });
    await onDevice();
    await page.waitForFunction(() => !document.querySelector('#lw-voice-record').disabled, null, { timeout: 10000 });
    await page.click('#lw-voice-record');
    await page.waitForFunction(() => window.__t.errors.length === 1, null, { timeout: 10000 });
    const s = await state();
    eq(s.errors[0], 'ondevice-refused', 'typed error code');
    eq(s.sr.started.length, 0, 'CLOUD RECOGNITION WAS STARTED — this must never happen');
    await T(() => { window.SpeechRecognition = window.FakeRecognition; });
  });

  await check('recognition denial and stop/cancel are typed and clean', async () => {
    await go();
    await T(() => { window.__t.srAvail = 'available'; });
    await onDevice();
    await page.waitForFunction(() => !document.querySelector('#lw-voice-record').disabled, null, { timeout: 10000 });
    await page.click('#lw-voice-record');
    await page.waitForFunction(() => window.__t.sr.started.length === 1);
    await T(() => window.__t.sr.last.emitError('not-allowed'));
    await page.waitForFunction(() => window.__t.errors.length === 1, null, { timeout: 10000 });
    eq((await state()).errors[0], 'mic-denied', 'denial must map to the same typed code as the upload route');

    await page.click('#lw-voice-record');
    await page.waitForFunction(() => window.__t.sr.started.length === 2);
    await page.click('#lw-voice-cancel');
    await page.waitForFunction(() => window.__t.sr.aborted >= 1, null, { timeout: 10000 });
    await T(() => window.__t.sr.last.emitResult('late words after cancel'));
    await page.waitForTimeout(200);
    const s = await state();
    eq(s.transcripts.length, 0, 'a cancelled turn delivered a transcript');
    ok(s.events.includes('record-cancel'), 'no record-cancel event');
  });

  await check('destroy aborts recognition and drops the late result', async () => {
    await go();
    await T(() => { window.__t.srAvail = 'available'; });
    await onDevice();
    await page.waitForFunction(() => !document.querySelector('#lw-voice-record').disabled, null, { timeout: 10000 });
    await page.click('#lw-voice-record');
    await page.waitForFunction(() => window.__t.sr.started.length === 1);
    await T(() => window.__t.handle.destroy());
    await page.waitForFunction(() => window.__t.sr.aborted >= 1, null, { timeout: 10000 });
    await T(() => window.__t.sr.last.emitResult('late words after destroy'));
    await page.waitForTimeout(200);
    eq((await state()).transcripts.length, 0, 'late transcript delivered after destroy');
  });

  await check('Spanish on-device path uses es-ES and Spanish copy', async () => {
    await go();
    await T(() => { window.__t.srAvail = 'downloadable'; window.__t.srInstall = true; });
    await onDevice({ locale: 'es' });
    await page.waitForFunction(() => window.__t.sr.availableCalls.length === 1, null, { timeout: 10000 });
    eq(JSON.stringify((await state()).sr.availableCalls[0].langs), '["es-ES"]', 'langs');
    const t = await text();
    ok(/[Dd]escargar/.test(t), 'Spanish download copy missing: ' + t.slice(0, 300));
    ok(!/download/i.test(t), 'English leaked into the Spanish on-device copy');
  });

  // Evidence shots for the voice surface
  await go();
  await T(() => { window.__t.srAvail = 'downloadable'; window.__t.srInstall = true; });
  await T((o) => window.__t.mount('/voice-client.mjs', o), { locale: 'en', capabilities: { localTranscription: false } });
  await page.waitForTimeout(300);
  await shot('voice-ondevice-download-en-1440');
  await go();
  await T((v) => { window.__t.voices = v; }, localVoices);
  await T((o) => window.__t.mount('/voice-client.mjs', o), {
    locale: 'en', capabilities: { localTranscription: true }, getTextValue: 'Shade three of the eight parts.',
  });
  await shot('voice-ready-en-1440');
  await page.setViewportSize({ width: 320, height: 720 });
  await shot('voice-ready-en-320');
  await page.setViewportSize({ width: 1440, height: 900 });
  await go();
  await T(() => window.__t.useSR(false));
  await T((o) => window.__t.mount('/voice-client.mjs', o), { locale: 'es', capabilities: {} });
  await shot('voice-unsupported-es-1440');
  }

  // =============================================================== SCENES
  if (wants('scenes')) {
  say('\nscenes.mjs  [real DOM, no devices touched at all]');

  const mountScene = (opts) => T((o) => window.__t.mount('/scenes.mjs', o), opts);

  await check('import has no side effects', async () => {
    await go();
    await T(async () => { await import('/scenes.mjs'); });
    const s = await state();
    eq(s.gum, 0, 'getUserMedia on import'); eq(s.speak, 0, 'speak on import');
    eq(await T(() => document.getElementById('host').children.length), 0, 'import mutated the DOM');
  });

  for (const kind of Object.keys(V)) {
    await check(`${kind}: renders from the actual visual data with Play/Pause/Replay`, async () => {
      await go();
      await mountScene({ visual: V[kind], locale: 'en', age: 9 });
      const t = await text();
      ok(t.includes(V[kind].caption), `authored caption missing for ${kind}`);
      if (kind === 'passage') ok(t.includes('She left before sunrise'), 'passage text altered');
      if (kind === 'sequence') for (const s of V.sequence.stages) ok(t.includes(s.detail), 'stage detail missing: ' + s.label);
      if (kind === 'tokens') eq(await T(() => document.querySelectorAll('.lw-scene-token').length), 7, 'token count');
      if (kind === 'fraction') eq(await T(() => document.querySelectorAll('.lw-scene-part').length), 8, 'part count');
      for (const id of ['lw-scene-play', 'lw-scene-replay']) {
        ok(await T((i) => !!document.getElementById(i), id), `${kind} missing ${id}`);
      }
    });
  }

  await check('play then pause is explicit and stops the reveal advancing', async () => {
    await go();
    await mountScene({ visual: V.sequence, locale: 'en', age: 9 });
    eq(await T(() => document.querySelector('.lw-scene').getAttribute('data-playing')), 'false', 'must not autoplay');
    await page.click('#lw-scene-play');
    eq(await T(() => document.querySelector('.lw-scene').getAttribute('data-playing')), 'true', 'play did not start');
    await page.click('#lw-scene-play');
    eq(await T(() => document.querySelector('.lw-scene').getAttribute('data-playing')), 'false', 'pause did not stop it');
    const frozen = await T(() => document.querySelector('.lw-scene').getAttribute('data-revealed'));
    await page.waitForTimeout(1200);
    eq(await T(() => document.querySelector('.lw-scene').getAttribute('data-revealed')), frozen, 'reveal advanced while paused');
  });

  await check('playing and replaying never count as a learner turn', async () => {
    await page.click('#lw-scene-replay');
    await page.waitForTimeout(200);
    eq((await state()).turns.length, 0, 'onTurn fired for a machine-driven reveal');
  });

  await check('a real interaction reports a typed turn with no correctness claim', async () => {
    await go();
    await mountScene({ visual: V.fraction, locale: 'en', age: 9 });
    // The fixture starts at filled:3. Shading "up to" part 5 means filled becomes 5;
    // tapping the last shaded part again un-shades it. Both are learner turns.
    await page.click('.lw-scene-part[data-i="4"]');
    await page.click('.lw-scene-part[data-i="4"]');
    const s = await state();
    eq(s.turns.length, 2, 'onTurn did not fire for both clicks');
    eq(s.turns[0][0], 'fraction-fill', 'typed turn name');
    eq(s.turns[0][1].filled, 5, 'shade-up-to state');
    eq(s.turns[1][1].filled, 4, 'tapping the top part again should un-shade it');
    ok(!/correct|right|wrong|master|score|well done/i.test(JSON.stringify(s.turns)), 'turn carries a verdict');
  });

  await check('keyboard drives the fraction and the number line', async () => {
    await T(() => document.querySelector('.lw-scene-part[data-i="0"]').focus());
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Space');
    ok((await state()).turns.length >= 2, 'keyboard produced no turn');
    await go();
    await mountScene({ visual: V.numberline, locale: 'en', age: 9 });
    await T(() => document.querySelector('#lw-scene-range').focus());
    await page.keyboard.press('ArrowRight');
    const s = await state();
    ok(s.turns.length >= 1, 'arrow key produced no turn on the number line');
    eq(s.turns[0][0], 'numberline-move', 'typed turn name');
  });

  await check('number line stays finite on signed, fractional and wide ranges', async () => {
    for (const v of [{ min: -5, max: 5, value: 0 }, { min: 0, max: 1, value: 0.5 }, { min: -1e6, max: 1e6, value: 0 }]) {
      await go();
      await mountScene({ visual: { kind: 'numberline', ...v, caption: 'edge' }, locale: 'en', age: 9 });
      const t = await text();
      ok(!/NaN|Infinity|undefined/.test(t), `NaN/Infinity rendered for ${JSON.stringify(v)}: ${t.slice(0, 200)}`);
      const r = await T(() => {
        const el = document.querySelector('#lw-scene-range');
        return { v: Number(el.value), min: Number(el.min), max: Number(el.max), step: Number(el.step) };
      });
      ok(Number.isFinite(r.v) && Number.isFinite(r.step) && r.step > 0, 'non-finite slider config: ' + JSON.stringify(r));
    }
  });

  await check('check mode exposes no answer key and starts from a neutral state', async () => {
    await go();
    await mountScene({ visual: V.fraction, locale: 'en', age: 9, checkMode: true });
    eq(await T(() => document.querySelectorAll('.lw-scene-part[aria-pressed="true"]').length), 0, 'check mode pre-filled the answer');
    await go();
    await mountScene({ visual: V.numberline, locale: 'en', age: 9, checkMode: true });
    eq(await T(() => Number(document.querySelector('#lw-scene-range').value)), -5, 'check mode seeded the keyed value');
    const h = await html();
    ok(!/answer|respuesta/i.test(h), 'check mode mentions an answer: ' + h.slice(0, 300));
  });

  await check('check mode still offers the learner turn and the caption', async () => {
    const t = await text();
    ok(t.includes(V.numberline.caption), 'caption dropped in check mode');
    await page.click('#lw-scene-range');
    ok(await T(() => !document.querySelector('#lw-scene-range').disabled), 'learner locked out of the check');
  });

  await check('scene content is fully readable with no motion at all', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await go();
    await mountScene({ visual: V.sequence, locale: 'en', age: 9 });
    const t = await text();
    for (const s of V.sequence.stages) ok(t.includes(s.detail), 'stage hidden under reduced motion: ' + s.label);
    const hidden = await T(() => [...document.querySelectorAll('.lw-scene *')]
      .filter((e) => { const c = getComputedStyle(e); return c.opacity === '0' || c.visibility === 'hidden'; }).length);
    eq(hidden, 0, 'elements invisible under reduced motion');
    const anim = await T(() => [...document.querySelectorAll('.lw-scene, .lw-scene *')]
      .filter((e) => getComputedStyle(e).animationName !== 'none').length);
    eq(anim, 0, 'animation still running under prefers-reduced-motion');
  });
  await shot('scene-sequence-reducedmotion-1440');

  await check('reduced motion reveals immediately instead of refusing to play', async () => {
    await page.click('#lw-scene-play');
    await page.waitForTimeout(150);
    eq(await T(() => document.querySelector('.lw-scene').getAttribute('data-revealed')),
      String(V.sequence.stages.length), 'reduced motion should land on the final stage at once');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  });

  await check('destroy stops the reveal timer and detaches the scene', async () => {
    await go();
    await mountScene({ visual: V.sequence, locale: 'en', age: 9 });
    await page.click('#lw-scene-play');
    const el = await T(() => { window.__t.kept = window.__t.handle.element; window.__t.handle.destroy(); return window.__t.kept.getAttribute('data-revealed'); });
    await page.waitForTimeout(1500);
    eq(await T(() => window.__t.kept.getAttribute('data-revealed')), el, 'timer kept firing after destroy');
    eq(await T(() => window.__t.kept.isConnected), false, 'scene still attached after destroy');
  });

  await check('Spanish controls, with the authored passage left untranslated', async () => {
    await go();
    await mountScene({ visual: V.passage, locale: 'es', age: 9 });
    const t = await text();
    ok(/Reproducir|Repetir/i.test(t), 'Spanish scene controls missing: ' + t.slice(0, 200));
    ok(t.includes('She left before sunrise'), 'authored passage was translated or rewritten');
  });

  await check('instructions scale with age without claiming anything was validated', async () => {
    await go();
    await mountScene({ visual: V.tokens, locale: 'en', age: 5 });
    const young = await T(() => document.querySelector('.lw-scene-how').textContent);
    await go();
    await mountScene({ visual: V.tokens, locale: 'en', age: 15 });
    const older = await T(() => document.querySelector('.lw-scene-how').textContent);
    ok(young !== older, 'instruction text identical across age bands');
    ok(!/grade level|age[- ]appropriate|ready for|assessed|proven/i.test(young + older), 'instruction claims validation');
  });

  await check('scene emits typed events only, carrying no learner text', async () => {
    const s = await state();
    for (const e of s.events) {
      eq(typeof e, 'string', 'event type');
      ok(/^[a-z][a-z-]{2,39}$/.test(e), 'event not a typed slug: ' + e);
    }
  });

  // Evidence shots across the five kinds, both locales, both widths
  for (const [w, h] of [[1440, 900], [320, 720]]) {
    await page.setViewportSize({ width: w, height: h });
    for (const loc of ['en', 'es']) {
      for (const kind of Object.keys(V)) {
        await go();
        await mountScene({ visual: V[kind], locale: loc, age: 9 });
        await page.click('#lw-scene-play').catch(() => {});
        await page.waitForTimeout(250);
        await shot(`scene-${kind}-${loc}-${w}`);
      }
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await go();
  await mountScene({ visual: V.fraction, locale: 'en', age: 9, checkMode: true });
  await shot('scene-fraction-checkmode-1440');
  }

  // --------------------------------------------------------------- report
  say(`\nslice=${SLICE}: ${passed} passed, ${failed} failed`);
  say(`screenshots: ${shotDir}`);
  say('LABEL: fake-device mic, fake speech object, stubbed /api/transcribe. '
    + 'No real microphone, speaker or camera was activated by this run.');
  await writeFile(resolve(shotDir, 'run.log'), log.join('\n') + '\n');
  await browser.close();
  server.close();
  process.exit(failed ? 1 : 0);
};

run().catch((e) => { console.error(e); process.exit(2); });
