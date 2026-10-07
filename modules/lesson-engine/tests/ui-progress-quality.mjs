/* ui-progress-quality.mjs — regression for the two Activity-log defects, in real Chrome.
 *   node lesson/tests/ui-progress-quality.mjs
 *   QUALITY_APP_ROOT=/path/to/lesson QUALITY_EVIDENCE_DIR=/tmp/x node lesson/tests/ui-progress-quality.mjs
 *
 * SYNTHETIC API. Serves one lesson/ directory over a throwaway static server and
 * stubs window.fetch with a delayed fixture. No provider, no network, no sensors.
 *
 * Covers exactly two defects:
 *   D1  a confirmed Clear left the finished operation's label + frozen seconds on screen
 *   D2  the per-second elapsed span sat inside role=status aria-live=polite
 */
import { chromium } from '../../devtools/browser/node_modules/playwright/index.mjs';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, extname } from 'node:path';
import assert from 'node:assert/strict';

const here = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(process.env.QUALITY_APP_ROOT || resolve(here, '..'));
const shotDir = process.env.QUALITY_EVIDENCE_DIR
  || resolve(appDir, 'evidence', 'progress-repair-' + new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z');
const CHROME = '/Users/man/.agent-browser/browsers/chrome-153.0.8010.52/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const TYPES = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const ALLOW = new Set(['/', '/index.html', '/app.mjs', '/styles.css', '/core.mjs', '/vendor/math-expr.mjs']);
const DEADLINE = setTimeout(() => { console.error('ui-progress-quality: 90s deadline'); process.exit(3); }, 90_000);
DEADLINE.unref?.();

let failed = 0;
const say = (...a) => console.log(a.join(' '));
const check = async (name, fn) => {
  try { await fn(); say('  PASS ' + name); }
  catch (err) { failed++; say('  FAIL ' + name + ' :: ' + err.message); }
};

const mathLesson = {
  version: 1, id: 'L-quality-1', title: 'Thirds and eighths', goal: 'Compare unit fractions',
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
};

const FIXTURE_SCRIPT = `
  window.__mode = { lessonDelayMs: 0 };
  const MATH = ${JSON.stringify(mathLesson)};
  const wait = (ms, signal) => new Promise((res, rej) => {
    const t = setTimeout(res, ms);
    signal?.addEventListener('abort', () => { clearTimeout(t); rej(Object.assign(new Error('aborted'), { name: 'AbortError' })); });
  });
  window.fetch = async (url, opts = {}) => {
    const body = JSON.parse(opts.body || '{}');
    if (opts.signal?.aborted) throw Object.assign(new Error('aborted'), { name: 'AbortError' });
    if (String(url).endsWith('/api/lesson')) {
      if (window.__mode.lessonDelayMs) await wait(window.__mode.lessonDelayMs, opts.signal);
      const lesson = { ...MATH, goal: body.goal, subject: body.subject, grade: body.grade, locale: body.locale };
      return new Response(JSON.stringify({ lesson, provenance: { provider: 'fixture-not-anthropic', model: 'fixture', live: true }, callsLeft: 9 }),
        { status: 200, headers: { 'content-type': 'application/json' } });
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
say('[quality] SYNTHETIC fixture API — not a live provider call. serving ' + appDir + ' at ' + base);
say('[quality] evidence -> ' + shotDir);

const browser = await chromium.launch({ executablePath: CHROME });
const shot = async (page, name) => { await page.screenshot({ path: resolve(shotDir, name + '.png'), fullPage: true }); };

async function freshPage(mode = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 980 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => { errors.push(String(e)); say('  [pageerror] ' + String(e).slice(0, 300)); });
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.addInitScript(FIXTURE_SCRIPT);
  await page.goto(base + '/index.html', { waitUntil: 'load' });
  await page.click('#ack');
  await page.evaluate(m => Object.assign(window.__mode, m), mode);
  page.__errors = errors;
  return { ctx, page };
}
const logText = (page) => page.evaluate(() => document.querySelector('#activity')?.innerText || '');
const elapsed = (page) => page.evaluate(() => document.querySelector('#act-elapsed')?.textContent ?? null);
const nowText = (page) => page.evaluate(() => document.querySelector('#act-now')?.textContent || '');
const confirmClear = async (page) => { await page.click('#clear'); await page.click('#cf-yes'); };
const secs = (s) => Number((String(s).match(/(\d+)/) || [0, 0])[1]);

try {
// ===================================== D2: ticking seconds out of the live region
say('\n1. in flight: seconds advance on screen but are not announced; operation stays accessible');
{
  const { ctx, page } = await freshPage({ lessonDelayMs: 6000 });
  await page.fill('#goal', 'Compare unit fractions');
  await page.click('#generate');
  await page.waitForSelector('#act-elapsed', { timeout: 3000 });

  await check('visible elapsed still advances across two ticks', async () => {
    const first = await elapsed(page);
    assert.match(String(first), /\d+\s*s/i, 'no elapsed reading: ' + first);
    await page.waitForTimeout(2300);
    const later = await elapsed(page);
    assert.ok(secs(later) >= secs(first) + 2, `elapsed did not advance two ticks: ${first} -> ${later}`);
  });
  await check('the elapsed span is hidden from assistive tech (D2)', async () => {
    assert.equal(await page.getAttribute('#act-elapsed', 'aria-hidden'), 'true',
      'ticking seconds are still inside the aria-live region');
  });
  await check('the operation label is still a polite live status', async () => {
    assert.equal(await page.getAttribute('#act-now', 'role'), 'status');
    assert.equal(await page.getAttribute('#act-now', 'aria-live'), 'polite');
    assert.match(await nowText(page), /Requesting lesson/i);
  });
  await check('no per-second text in the accessibility tree for the status', async () => {
    const snap = await page.locator('#act-now').ariaSnapshot();
    assert.doesNotMatch(snap, /\d+\s*s\b/i, 'seconds exposed to assistive tech: ' + snap.replace(/\n/g, ' '));
  });
  await check('the tick keeps focus and typed text', async () => {
    await page.focus('#goal');
    await page.keyboard.type('XY');
    await page.waitForTimeout(1600);
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'goal');
    assert.equal(await page.inputValue('#goal'), 'Compare unit fractionsXY');
  });
  await shot(page, '01-inflight-live-region');
  await check('no page errors', () => assert.deepEqual(page.__errors, []));
  await ctx.close();
}

// ======================================== D1: Clear drops the finished operation
say('\n2. confirmed Clear after a finished request leaves no stale operation');
{
  const { ctx, page } = await freshPage();
  await page.fill('#goal', 'Compare unit fractions');
  await page.click('#generate');
  await page.waitForSelector('#work', { timeout: 8000 });
  assert.match(String(await elapsed(page)), /\d+\s*s/i, 'precondition: a frozen reading should exist');

  await confirmClear(page);
  await check('status reads idle, not the cleared operation (D1)', async () => {
    const txt = await nowText(page);
    assert.match(txt, /Nothing running/i, 'stale operation label after Clear: ' + txt);
    assert.doesNotMatch(txt, /Requesting/i);
  });
  await check('no leftover frozen seconds after Clear (D1)', async () => {
    assert.equal(await elapsed(page), null, 'frozen elapsed survived Clear');
  });
  await check('the log is reset to the single reset entry', async () => {
    const txt = await logText(page);
    assert.match(txt, /Log reset/i);
    assert.doesNotMatch(txt, /Ready|Response received/i, 'pre-Clear history survived');
  });
  await shot(page, '02-after-clear-idle');
  await check('no page errors', () => assert.deepEqual(page.__errors, []));
  await ctx.close();
}

// ============================= D1 sibling: Clear mid flight, late reply stays out
say('\n3. Clear during a request: idle at once, the late reply writes nothing');
{
  const { ctx, page } = await freshPage({ lessonDelayMs: 2500 });
  await page.fill('#goal', 'Compare unit fractions');
  await page.click('#generate');
  await page.waitForSelector('#act-elapsed', { timeout: 3000 });
  await confirmClear(page);

  await check('status is idle with no seconds the moment Clear is confirmed', async () => {
    assert.match(await nowText(page), /Nothing running/i);
    assert.equal(await elapsed(page), null);
  });
  await check('the late reply does not restore the lesson or the log', async () => {
    await page.waitForTimeout(3200);
    assert.equal(await page.evaluate(() => !!document.querySelector('#work')), false, 'late reply built the lesson');
    const txt = await logText(page);
    assert.doesNotMatch(txt, /Ready|Response received/i, 'late reply wrote to the log: ' + txt.replace(/\n/g, ' | '));
    assert.equal(await elapsed(page), null, 'late reply revived the elapsed reading');
  });
  await shot(page, '03-clear-inflight-late-reply');
  await check('no page errors', () => assert.deepEqual(page.__errors, []));
  await ctx.close();
}
} finally {
  await browser.close();
  server.close();
}

say(`\n[quality] ${failed ? 'FAILED ' + failed + ' check(s)' : 'all checks passed'}`);
process.exit(failed ? 1 : 0);
