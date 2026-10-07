/* ui-progress.mjs — the visible activity log, in real Chrome.
 *   node lesson/tests/ui-progress.mjs
 *   PROGRESS_EVIDENCE_DIR=/tmp/x node lesson/tests/ui-progress.mjs
 *
 * SYNTHETIC API. Serves lesson/ over a throwaway static server and stubs
 * window.fetch with handwritten fixtures whose delays and failures are set by
 * the test. No provider is contacted; a green run proves what the UI shows
 * while waiting, nothing about live generation.
 */
import { chromium } from '../../devtools/browser/node_modules/playwright/index.mjs';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, extname } from 'node:path';
import assert from 'node:assert/strict';

const here = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(here, '..');
const shotDir = process.env.PROGRESS_EVIDENCE_DIR
  || resolve(appDir, 'evidence', 'progress-' + new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z');
const CHROME = '/Users/man/.agent-browser/browsers/chrome-153.0.8010.52/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const TYPES = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const ALLOW = new Set(['/', '/index.html', '/app.mjs', '/styles.css', '/core.mjs', '/vendor/math-expr.mjs']);
const DEADLINE = setTimeout(() => { console.error('ui-progress: 90s deadline'); process.exit(3); }, 90_000);
DEADLINE.unref?.();

// Strings that must never reach the activity log or any saved/exported bytes.
const SECRET_GOAL = 'ZZSENTINELGOALZZ';
const SECRET_ANSWER = 'ZZSENTINELANSWERZZ';

let failed = 0;
const say = (...a) => console.log(a.join(' '));
const check = async (name, fn) => {
  try { await fn(); say('  PASS ' + name); }
  catch (err) { failed++; say('  FAIL ' + name + ' :: ' + err.message); }
};

const mathLesson = (id) => ({
  version: 1, id, title: 'Thirds and eighths', goal: 'Compare unit fractions',
  subject: 'math', grade: '3', locale: 'en',
  intro: 'We will shade parts of a whole and compare what we see.',
  steps: [
    { id: 'p1', kind: 'numeric', answer: '3/8', prompt: 'Shade three of the eight parts.',
      explanation: 'Three shaded parts is 3/8.', hint: 'Count the shaded parts over 8.',
      visual: { kind: 'fraction', parts: 8, filled: 0, caption: 'A bar cut into eight equal parts.' } },
    { id: 'p2', kind: 'choice', answer: 'one eighth', choices: ['one eighth', 'one third'],
      prompt: 'Which piece is smaller?', explanation: 'More parts means smaller parts.',
      hint: 'More pieces in the same bar means each is smaller.',
      visual: { kind: 'tokens', count: 8, caption: 'Eight counters.' } },
    { id: 'c1', kind: 'numeric', answer: '6', prompt: 'Move the marker to six.',
      explanation: 'Six is six steps right of zero.', hint: 'Count the steps from zero.',
      visual: { kind: 'numberline', min: 0, max: 10, value: 0, caption: 'A line from zero to ten.' } },
  ],
  path: {
    reinforce: { goal: 'More practice naming unit fractions', reason: 'The fresh check needed help.' },
    advance: { goal: 'Compare unlike denominators', reason: 'The fresh check was correct unaided.' },
  },
});

const FIXTURE_SCRIPT = `
  window.__calls = { lesson: [], feedback: [] };
  window.__mode = { lessonDelayMs: 0, feedbackDelayMs: 0, lessonFail: false, feedbackFail: false, lessonStatus: 502 };
  const MATH = ${JSON.stringify(mathLesson('L-prog-1'))};
  const wait = (ms, signal) => new Promise((res, rej) => {
    const t = setTimeout(res, ms);
    signal?.addEventListener('abort', () => { clearTimeout(t); rej(Object.assign(new Error('aborted'), { name: 'AbortError' })); });
  });
  window.fetch = async (url, opts = {}) => {
    const body = JSON.parse(opts.body || '{}');
    const path = String(url);
    const ok = (d) => new Response(JSON.stringify(d), { status: 200, headers: { 'content-type': 'application/json' } });
    if (opts.signal?.aborted) throw Object.assign(new Error('aborted'), { name: 'AbortError' });
    if (path.endsWith('/api/lesson')) {
      window.__calls.lesson.push(body);
      if (window.__mode.lessonDelayMs) await wait(window.__mode.lessonDelayMs, opts.signal);
      if (window.__mode.lessonFail) return new Response(JSON.stringify({ error: 'The provider returned an unusable lesson.' }), { status: window.__mode.lessonStatus, headers: { 'content-type': 'application/json' } });
      const lesson = { ...MATH, goal: body.goal, subject: body.subject, grade: body.grade, locale: body.locale };
      return ok({ lesson, provenance: { provider: 'fixture-not-anthropic', model: 'fixture', live: true }, callsLeft: 9 });
    }
    if (path.endsWith('/api/feedback')) {
      window.__calls.feedback.push(body);
      if (window.__mode.feedbackDelayMs) await wait(window.__mode.feedbackDelayMs, opts.signal);
      if (window.__mode.feedbackFail) return new Response(JSON.stringify({ error: 'The provider did not answer.' }), { status: 502, headers: { 'content-type': 'application/json' } });
      return ok({ feedback: { text: 'Look again at how many parts you shaded.', verdict: 'ungraded', alternateExplanation: 'Point at each shaded part and say "one eighth".' }, provenance: { provider: 'fixture-not-anthropic', model: 'fixture', live: true }, callsLeft: 4 });
    }
    return new Response('{}', { status: 404 });
  };
`;

const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://127.0.0.1').pathname;
  if (!ALLOW.has(path)) { res.writeHead(404).end('no'); return; }
  try {
    const file = resolve(appDir, path === '/' ? 'index.html' : path.slice(1));
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'text/plain' }).end(await readFile(file));
  } catch { res.writeHead(404).end('no'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
await mkdir(shotDir, { recursive: true });
say('[ui-progress] SYNTHETIC fixture API — not a live provider call. serving ' + base);
say('[ui-progress] evidence -> ' + shotDir);

const browser = await chromium.launch({ executablePath: CHROME });
const shots = [];
const shot = async (page, name) => {
  const p = resolve(shotDir, name + '.png');
  await page.screenshot({ path: p, fullPage: true });
  shots.push(p);
};
async function freshPage(size = { width: 1440, height: 980 }) {
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => { errors.push(String(e)); say('  [pageerror] ' + String(e).slice(0, 300)); });
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.addInitScript(FIXTURE_SCRIPT);
  await page.goto(base + '/index.html', { waitUntil: 'load' });
  page.__errors = errors;
  await page.click('#ack');
  return { ctx, page };
}
// Full log text including the collapsed <details> history.
const logText = (page) => page.evaluate(() => document.querySelector('#activity')?.innerText || '');
const setMode = (page, m) => page.evaluate(m => Object.assign(window.__mode, m), m);

try {
// ============================================================ 1. slow lesson
say('\n1. slow lesson: panel visible, truthful phases, running elapsed, typing survives');
{
  const { ctx, page } = await freshPage();
  await setMode(page, { lessonDelayMs: 4500 });
  await page.fill('#goal', SECRET_GOAL);
  await page.click('#generate');

  await check('activity panel appears while the request is in flight', async () => {
    await page.waitForSelector('#activity', { state: 'visible', timeout: 3000 });
  });
  await check('panel is open by default during a request', async () => {
    assert.equal(await page.evaluate(() => document.querySelector('#activity')?.open), true);
  });
  await check('names the operation and says it is waiting on the local server', async () => {
    const txt = await logText(page);
    assert.match(txt, /Requesting lesson/i);
    assert.match(txt, /Waiting for the local server/i);
  });
  await check('elapsed seconds are shown and advance', async () => {
    const read = () => page.evaluate(() => document.querySelector('#act-elapsed')?.textContent || '');
    const first = await read();
    assert.match(first, /\d+\s*s/i, 'no elapsed reading: ' + first);
    await page.waitForTimeout(2200);
    const later = await read();
    const n = s => Number((s.match(/(\d+)/) || [0, 0])[1]);
    assert.ok(n(later) > n(first), `elapsed did not advance: ${first} -> ${later}`);
  });
  await check('no invented percentage or completion promise', async () => {
    const txt = await logText(page);
    assert.doesNotMatch(txt, /%/, 'percentage in log');
    assert.doesNotMatch(txt, /almost|any second|shortly|soon/i);
  });
  await shot(page, '01-lesson-inflight-1440');

  await check('the elapsed tick does not steal focus or typed text', async () => {
    await page.focus('#goal');
    await page.keyboard.type('XY');
    await page.waitForTimeout(1600);
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'goal');
    assert.equal(await page.inputValue('#goal'), SECRET_GOAL + 'XY');
  });
  await check('a terminal ready event is logged once when the lesson lands', async () => {
    await page.waitForSelector('#work', { timeout: 8000 });
    const txt = await logText(page);
    assert.match(txt, /Response received/i);
    assert.match(txt, /Ready/i);
    assert.equal((txt.match(/Ready/gi) || []).length, 1, 'Ready logged more than once');
  });
  await check('the local check step is named, not claimed as provider work', async () => {
    assert.match(await logText(page), /Checking the lesson on this computer/i);
  });
  await check('elapsed timer stops once the lesson is ready', async () => {
    const a = await page.evaluate(() => document.querySelector('#act-elapsed')?.textContent || '');
    await page.waitForTimeout(1800);
    const b = await page.evaluate(() => document.querySelector('#act-elapsed')?.textContent || '');
    assert.equal(a, b, `timer kept running after ready: ${a} -> ${b}`);
  });
  await check('the log never contains the typed goal', async () => {
    assert.ok(!(await logText(page)).includes(SECRET_GOAL));
  });
  await shot(page, '02-lesson-ready-1440');
  await check('no page errors', () => assert.deepEqual(page.__errors, []));
  await ctx.close();
}

// ======================================================== 2. feedback + hint
say('\n2. slow hint and slow feedback are logged with their own operation names');
{
  const { ctx, page } = await freshPage();
  await page.fill('#goal', 'Compare unit fractions');
  await page.click('#generate');
  await page.waitForSelector('#work', { timeout: 8000 });

  await setMode(page, { feedbackDelayMs: 2500 });
  await page.click('#hint');
  await check('hint request is logged as a hint, with elapsed', async () => {
    await page.waitForSelector('#act-elapsed', { timeout: 3000 });
    const txt = await logText(page);
    assert.match(txt, /Requesting a hint/i);
    assert.match(txt, /Waiting for the local server/i);
  });
  await shot(page, '03-hint-inflight-1440');
  await page.waitForSelector('#result', { timeout: 8000 });
  await check('hint terminal event logged', async () => {
    assert.match(await logText(page), /Hint received|Response received/i);
  });

  await page.fill('#typed', SECRET_ANSWER);
  await page.click('#check');
  await check('answer feedback is logged as feedback', async () => {
    const txt = await logText(page);
    assert.match(txt, /Requesting feedback/i);
  });
  await page.waitForTimeout(3200);
  await check('the log never contains the typed answer', async () => {
    assert.ok(!(await logText(page)).includes(SECRET_ANSWER));
  });
  await check('no page errors', () => assert.deepEqual(page.__errors, []));
  await ctx.close();
}

// ============================================================ 3. failure path
say('\n3. failure: typed code and HTTP status, no raw provider text; retry logs a new attempt');
{
  const { ctx, page } = await freshPage();
  await setMode(page, { lessonFail: true, lessonStatus: 502 });
  await page.fill('#goal', SECRET_GOAL);
  await page.click('#generate');
  await page.waitForSelector('#retry', { timeout: 8000 });

  await check('failure is logged with a typed code and the HTTP status', async () => {
    const txt = await logText(page);
    assert.match(txt, /failed/i);
    assert.match(txt, /http.?502/i, 'no http status in log: ' + txt.slice(0, 300));
  });
  await check('failure is logged once and carries no raw provider message', async () => {
    const txt = await logText(page);
    assert.equal((txt.match(/failed/gi) || []).length, 1);
    assert.ok(!txt.includes('The provider returned an unusable lesson.'), 'raw server message leaked');
    assert.ok(!txt.includes(SECRET_GOAL));
  });
  await check('elapsed timer is stopped after failure', async () => {
    const a = await page.evaluate(() => document.querySelector('#act-elapsed')?.textContent || '');
    await page.waitForTimeout(1700);
    assert.equal(await page.evaluate(() => document.querySelector('#act-elapsed')?.textContent || ''), a);
  });
  await shot(page, '04-lesson-failed-1440');

  await setMode(page, { lessonFail: false });
  await page.click('#retry');
  await page.waitForSelector('#work', { timeout: 8000 });
  await check('retry logs a fresh attempt and then ready', async () => {
    const txt = await logText(page);
    assert.ok((txt.match(/Requesting lesson/gi) || []).length >= 2, 'retry not logged as a new request');
    assert.match(txt, /Ready/i);
  });
  await check('no page errors', () => assert.deepEqual(page.__errors, []));
  await ctx.close();
}

// ======================================================= 4. cancel, late reply
say('\n4. cancel: honest wording, timer stops, a late reply cannot contaminate the log');
{
  const { ctx, page } = await freshPage();
  await setMode(page, { lessonDelayMs: 3000 });
  await page.fill('#goal', 'Compare unit fractions');
  await page.click('#generate');
  await page.waitForSelector('#cancel', { timeout: 3000 });
  await page.click('#cancel');

  await check('cancel is logged as stopping the wait, not cancelling the model', async () => {
    const txt = await logText(page);
    assert.match(txt, /Stopped waiting/i);
    assert.doesNotMatch(txt, /cancelled the request to|request cancelled on the server|billing/i);
  });
  await check('cancel states the server may still finish', async () => {
    assert.match(await logText(page), /server may still finish|no charge is cancelled|nothing is cancelled/i);
  });
  await shot(page, '05-cancelled-1440');
  await check('cancel stops the elapsed timer', async () => {
    const a = await page.evaluate(() => document.querySelector('#act-elapsed')?.textContent || '');
    await page.waitForTimeout(1700);
    assert.equal(await page.evaluate(() => document.querySelector('#act-elapsed')?.textContent || ''), a);
  });
  await check('the late reply adds no ready/received entry after cancel', async () => {
    await page.waitForTimeout(3500);
    const txt = await logText(page);
    assert.doesNotMatch(txt, /Ready/i, 'stale reply wrote a terminal state: ' + txt.slice(0, 300));
    assert.equal(await page.evaluate(() => document.querySelector('#work') ? 1 : 0), 0);
  });
  await check('no page errors', () => assert.deepEqual(page.__errors, []));
  await ctx.close();
}

// =================================================== 5. reset + private bytes
say('\n5. clearing saved work resets the log; nothing private is written to storage');
{
  const { ctx, page } = await freshPage();
  await page.check('#save-on').catch(() => {});
  await page.fill('#goal', SECRET_GOAL);
  await page.click('#generate');
  await page.waitForSelector('#work', { timeout: 8000 });
  await page.fill('#typed', SECRET_ANSWER);
  await check('activity history is bounded, not unbounded', async () => {
    const n = await page.evaluate(() => document.querySelectorAll('#activity li').length);
    assert.ok(n > 0 && n <= 40, 'history entries: ' + n);
  });
  await check('persisted bytes carry no activity log', async () => {
    const raw = await page.evaluate(() => JSON.stringify(window.localStorage));
    assert.ok(!raw.includes('Waiting for the local server'), 'activity log persisted');
    assert.ok(!raw.includes('Requesting lesson'), 'activity log persisted');
  });
  await page.click('#clear');
  await page.click('#cf-yes');
  await check('log is reset after clearing saved work', async () => {
    const txt = await logText(page);
    assert.ok(!txt.includes('Ready') || /reset|deleted/i.test(txt), 'stale entries survived the reset: ' + txt.slice(0, 200));
    assert.ok(!txt.includes(SECRET_GOAL) && !txt.includes(SECRET_ANSWER));
  });
  await shot(page, '06-after-reset-1440');
  await check('no page errors', () => assert.deepEqual(page.__errors, []));
  await ctx.close();
}

// ================================================== 6. Spanish + narrow widths
say('\n6. Spanish copy is authored, and the panel fits 1440 / 390 / 320');
{
  const { ctx, page } = await freshPage({ width: 390, height: 844 });
  await page.selectOption('#locale', 'es');
  await page.fill('#goal', 'Comparar fracciones');
  await page.click('#generate');
  await page.waitForSelector('#work', { timeout: 8000 });
  // The locale select applies to the NEXT lesson (incumbent rule), so the log
  // speaks Spanish once a Spanish lesson is on screen — not before, which would
  // leave one Spanish panel on an otherwise English page.
  await setMode(page, { feedbackDelayMs: 4000 });
  await page.click('#hint');
  await page.waitForSelector('#act-elapsed', { timeout: 3000 });
  await check('Spanish log is translated, not English fallback', async () => {
    const txt = await logText(page);
    assert.match(txt, /Actividad/);
    // Newest first, and only the entries written after the switch: earlier lines
    // are kept as written, matching the incumbent locale rule.
    const fresh = txt.slice(0, txt.indexOf('Lista') + 1 || 200);
    assert.ok(/Solicitando una pista/.test(fresh), 'untranslated ES log: ' + fresh.slice(0, 200));
    assert.ok(/Esperando al servidor local/.test(fresh), 'untranslated ES wait line: ' + fresh.slice(0, 200));
    assert.doesNotMatch(fresh, /Waiting for the local server/i);
  });
  await check('on a phone the live panel is inside the first screenful', async () => {
    const box = await page.evaluate(() => {
      const r = document.querySelector('#activity').getBoundingClientRect();
      return { top: r.top, h: window.innerHeight };
    });
    assert.ok(box.top < box.h, `activity panel below the fold on 390px: top=${box.top}`);
  });
  await shot(page, '07-es-inflight-390');
  await check('no horizontal overflow at 390', async () => {
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true);
  });
  await ctx.close();

  const narrow = await browser.newContext({ viewport: { width: 320, height: 720 } });
  const p2 = await narrow.newPage();
  await p2.addInitScript(FIXTURE_SCRIPT);
  await p2.goto(base + '/index.html', { waitUntil: 'load' });
  await p2.click('#ack');
  await p2.evaluate(() => { window.__mode.lessonDelayMs = 3500; });
  await p2.fill('#goal', 'Compare unit fractions');
  await p2.click('#generate');
  await p2.waitForSelector('#activity', { state: 'visible', timeout: 3000 });
  await shot(p2, '08-inflight-320');
  await check('no horizontal overflow at 320', async () => {
    assert.equal(await p2.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true);
  });
  await narrow.close();
}
} finally {
  await browser.close().catch(() => {});
  server.close();
  clearTimeout(DEADLINE);
}

say('\nscreenshots: ' + shots.length + ' -> ' + shotDir);
say(failed ? `\nFAILED ${failed} check(s)` : '\nALL CHECKS PASSED');
process.exit(failed ? 1 : 0);
