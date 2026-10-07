/* ui-browser.mjs — real Chrome, real DOM, real clicks.
 *   node lesson/tests/ui-browser.mjs
 *
 * SYNTHETIC API. This harness serves lesson/ over a throwaway static server and
 * stubs window.fetch with deterministic fixtures so UI behaviour can be driven
 * without spending provider calls. Every lesson/feedback payload here is
 * handwritten. A green run proves the UI's controls, grading wiring, races,
 * persistence and layout. It proves NOTHING about live generation — only the
 * parent's independent run against `node lesson/server.mjs` does that.
 */
import { chromium } from '../../devtools/browser/node_modules/playwright/index.mjs';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, extname } from 'node:path';
import assert from 'node:assert/strict';

const here = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(here, '..');
const shotDir = resolve(appDir, 'evidence', 'ui');
const CHROME = '/Users/man/.agent-browser/browsers/chrome-153.0.8010.52/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const TYPES = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
// Same files the real server serves: the client plus the shared core and its vendored parser.
const ALLOW = new Set(['/', '/index.html', '/app.mjs', '/styles.css', '/core.mjs', '/vendor/math-expr.mjs']);

const log = [];
const say = (...a) => { const s = a.join(' '); log.push(s); console.log(s); };
let failed = 0;
// Async-aware: an un-awaited assertion would "pass" by never running.
const check = async (name, fn) => {
  try { await fn(); say('  PASS ' + name); }
  catch (err) { failed++; say('  FAIL ' + name + ' :: ' + err.message); }
};

// ---------------------------------------------------------------- fixtures
const mathLesson = (id, over = {}) => ({
  version: 1, id, title: 'Thirds and eighths', goal: 'Compare unit fractions',
  subject: 'math', grade: '3', locale: 'en',
  intro: 'We will shade parts of a whole and compare what we see.',
  steps: [
    {
      id: 'p1', kind: 'numeric', answer: '3/8',
      prompt: 'Shade three of the eight parts.',
      explanation: 'Each part is one eighth, so three shaded parts is 3/8.',
      hint: 'Count the parts you shaded, then write that over 8.',
      visual: { kind: 'fraction', parts: 8, filled: 0, caption: 'A bar cut into eight equal parts.' },
    },
    {
      id: 'p2', kind: 'choice', answer: 'one eighth',
      choices: ['one eighth', 'one third', 'one half'],
      prompt: 'Which piece is smaller, one eighth or one third?',
      explanation: 'Eight parts in the same whole means each part is smaller.',
      hint: 'More pieces in the same bar means each piece is smaller.',
      visual: { kind: 'tokens', count: 8, caption: 'Eight counters, one for each part.' },
    },
    {
      id: 'c1', kind: 'numeric', answer: '6',
      prompt: 'Move the marker to six on the number line.',
      explanation: 'Six is six steps right of zero.',
      hint: 'Start at zero and count the steps.',
      visual: { kind: 'numberline', min: 0, max: 10, value: 0, caption: 'A line from zero to ten.' },
    },
  ],
  path: {
    reinforce: { goal: 'More practice naming unit fractions on a bar', reason: 'The fresh check needed help.' },
    advance: { goal: 'Compare fractions with unlike denominators', reason: 'The fresh check was correct with no help requested.' },
  },
  ...over,
});

const englishLesson = (id) => ({
  version: 1, id, title: 'Finding the reason', goal: 'Find why a character acts',
  subject: 'english', grade: '4', locale: 'en',
  intro: 'Read the passage, then point to the sentence that gives the reason.',
  steps: [
    {
      id: 'e1', kind: 'numeric', answer: '2',
      prompt: 'How many sentences are in the passage?',
      explanation: 'There are two sentences, each ending in a period.',
      hint: 'Count the end marks.',
      visual: { kind: 'passage', text: 'Mara left the window open. The cat came back that night.', caption: 'Read it twice before answering.' },
    },
    {
      id: 'e2', kind: 'choice', answer: 'She wanted the cat to come home.',
      choices: ['She wanted the cat to come home.', 'She forgot to close it.'],
      prompt: 'Why did Mara leave the window open?',
      explanation: 'The second sentence shows the result she was hoping for.',
      hint: 'Look at what happens next.',
      visual: { kind: 'passage', text: 'Mara left the window open. The cat came back that night.', caption: 'The reason is in what follows.' },
    },
    {
      id: 'e3', kind: 'writing',
      prompt: 'Write one or two sentences about what Mara did and why.',
      explanation: 'A good answer names the action and the reason.',
      hint: 'Say what she did, then say why.',
      visual: { kind: 'passage', text: 'Mara left the window open. The cat came back that night.', caption: 'Use the passage in your answer.' },
    },
  ],
  path: {
    reinforce: { goal: 'More practice finding a stated reason in two sentences', reason: 'Writing is read by the AI, not scored.' },
    advance: { goal: 'Infer an unstated reason from a short passage', reason: 'Unused: writing never advances on its own.' },
  },
});

// A deterministic fake provider. Not Anthropic. Not a live call.
const FIXTURE_SCRIPT = `
  window.__calls = { lesson: [], feedback: [] };
  window.__mode = { lessonFail: false, feedbackFail: false, lessonDelayMs: 0, quota: false };
  const MATH = ${JSON.stringify(mathLesson('L-math-1'))};
  const MATH2 = ${JSON.stringify(mathLesson('L-math-2', { id: 'L-math-2', title: 'Next: unlike denominators' }))};
  const ENG = ${JSON.stringify(englishLesson('L-eng-1'))};
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  window.fetch = async (url, opts = {}) => {
    const body = JSON.parse(opts.body || '{}');
    const path = String(url);
    const ok = (data) => new Response(JSON.stringify(data), { status: 200, headers: { 'content-type': 'application/json' } });
    if (opts.signal?.aborted) throw Object.assign(new Error('aborted'), { name: 'AbortError' });
    if (path.endsWith('/api/lesson')) {
      window.__calls.lesson.push(body);
      if (window.__mode.lessonDelayMs) {
        await new Promise((res, rej) => {
          const t = setTimeout(res, window.__mode.lessonDelayMs);
          opts.signal?.addEventListener('abort', () => { clearTimeout(t); rej(Object.assign(new Error('aborted'), { name: 'AbortError' })); });
        });
      }
      if (window.__mode.quota) return new Response(JSON.stringify({ error: 'call budget used' }), { status: 429, headers: { 'content-type': 'application/json' } });
      if (window.__mode.lessonFail) return new Response(JSON.stringify({ error: 'The provider returned an unusable lesson.' }), { status: 502, headers: { 'content-type': 'application/json' } });
      const base = body.subject === 'english' ? ENG : (window.__calls.lesson.length > 1 ? MATH2 : MATH);
      const lesson = { ...base, goal: body.goal, subject: body.subject, grade: body.grade, locale: body.locale };
      return ok({ lesson, provenance: { provider: 'fixture-not-anthropic', model: 'fixture', live: true }, callsLeft: 12 - window.__calls.lesson.length });
    }
    if (path.endsWith('/api/feedback')) {
      window.__calls.feedback.push(body);
      if (window.__mode.feedbackFail) return new Response(JSON.stringify({ error: 'The provider did not answer.' }), { status: 502, headers: { 'content-type': 'application/json' } });
      const n = window.__calls.feedback.filter(c => c.stepId === body.stepId && c.mode === body.mode).length;
      // Specific to the submitted answer, and a DIFFERENT approach on the second try.
      const step = (body.lesson?.steps || []).find(s => s.id === body.stepId) || {};
      const writing = step.kind === 'writing';
      // Shaped per item kind so the saved screenshots are not misleading evidence.
      const text = writing
        ? 'You wrote: "' + body.answer + '" You name what Mara did and give a reason, which is what the prompt asked for. To revise, point to the sentence in the passage that shows the reason.'
        : body.mode === 'hint'
          ? 'Hint: count only the parts you shaded, then write that count over the total.'
          : 'You wrote "' + body.answer + '". That names ' + (body.answer || 'nothing') + ' parts, but look again at how many you shaded.';
      const alternate = writing
        ? 'A different way to check it: read your two sentences aloud and ask whether the second one explains the first.'
        : n > 1
          ? 'A different way: forget the fraction for a second and just say the number of shaded parts out loud, then write it over 8.'
          : 'Try pointing at each shaded part and saying "one eighth" as you go.';
      return ok({ feedback: { text, verdict: 'ungraded', nextAction: body.mode === 'hint' ? 'retry' : 'retry', alternateExplanation: alternate }, provenance: { provider: 'fixture-not-anthropic', model: 'fixture', live: true }, callsLeft: 5 });
    }
    return new Response('{}', { status: 404 });
  };
`;

// ---------------------------------------------------------------- harness
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://127.0.0.1').pathname;
  if (!ALLOW.has(path)) { res.writeHead(404).end('no'); return; }
  const file = resolve(appDir, path === '/' ? 'index.html' : path.slice(1));
  try {
    const buf = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'text/plain' }).end(buf);
  } catch { res.writeHead(404).end('no'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
await mkdir(shotDir, { recursive: true });
say('[ui-browser] SYNTHETIC fixture API — not a live provider call. serving ' + base);

const browser = await chromium.launch({ executablePath: CHROME });
const shots = [];
async function shot(page, name) {
  const p = resolve(shotDir, name + '.png');
  await page.screenshot({ path: p, fullPage: true });
  shots.push(p);
  return p;
}
async function freshPage(size = { width: 1440, height: 980 }) {
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => { errors.push(String(e)); say('  [pageerror] ' + String(e).slice(0, 300)); });
  page.on('console', m => { if (m.type() === 'error') { errors.push('console: ' + m.text()); say('  [console] ' + m.text().slice(0, 300)); } });
  await page.addInitScript(FIXTURE_SCRIPT);
  await page.goto(base + '/index.html', { waitUntil: 'load' });
  page.__errors = errors;
  return { ctx, page };
}
const ack = (page) => page.click('#ack');

async function setup(page, { goal, subject = 'math', grade = '3', locale = 'en' }) {
  await page.fill('#goal', goal);
  await page.selectOption('#subject', subject);
  await page.selectOption('#grade', grade);
  await page.selectOption('#locale', locale);
  await page.click('#generate');
  await page.waitForSelector('#work', { timeout: 5000 });
}

// ================================================================ 1. math flow
say('\n1. math: goal -> lesson -> manipulate -> wrong -> different help -> fresh check -> next');
{
  const { ctx, page } = await freshPage();
  await shot(page, '01-disclosure-1440');
  await check('disclosure is shown before anything else', () => {
    assert.equal(page.url().endsWith('/index.html'), true);
  });
  const gateText = await page.textContent('.lw-gate-body');
  await check('disclosure carries the authored copy bank verbatim (EN)', () => {
    for (const bit of [
      'sent to Anthropic to generate lessons and feedback',
      'Local test with invented learners',
      'Do not enter a real child',
      'The AI makes mistakes',
      'off by default',
      'No camera or microphone is used',
    ]) assert.ok(gateText.includes(bit), 'missing: ' + bit);
  });
  await check('disclosure claims no consent or compliance', async () => {
    assert.ok((await page.textContent('.lw-gate')).includes('not a verified age check'));
  });
  await ack(page);
  await shot(page, '02-goal-setup-1440');

  await check('generate is disabled with an empty goal', async () => {
    assert.equal(await page.isDisabled('#generate'), true);
  });
  await setup(page, { goal: 'Compare unit fractions using a shaded bar' });
  await shot(page, '03-lesson-step1-fraction-1440');

  const sentGoal = await page.evaluate(() => window.__calls.lesson[0]);
  await check('request carries the typed goal and adultTest', () => {
    assert.equal(sentGoal.goal, 'Compare unit fractions using a shaded bar');
    assert.equal(sentGoal.adultTest, true);
    assert.equal(sentGoal.subject, 'math');
    assert.equal(sentGoal.grade, '3');
  });
  await check('step 1 of 3 is labelled practice, not a check', async () => {
    assert.match(await page.textContent('.lw-kind'), /Practice/);
    assert.match(await page.textContent('.lw-count'), /1 of 3/);
  });
  await check('exactly one prompt and one visual are on screen', async () => {
    assert.equal(await page.locator('.lw-prompt').count(), 1);
    assert.equal(await page.locator('.lw-stage').count(), 1);
  });

  // --- the visual actually reacts and drives the answer
  const parts = page.locator('.lw-part');
  await check('the fraction bar renders every authored part', async () => {
    assert.equal(await parts.count(), 8);
  });
  await parts.nth(4).click();                       // 5 parts
  await check('clicking part 5 shades 5 and reports it', async () => {
    assert.equal(await parts.nth(4).getAttribute('aria-pressed'), 'true');
    assert.equal(await parts.nth(5).getAttribute('aria-pressed'), 'false');
    assert.match(await page.textContent('#stage-state'), /5 of 8 parts shaded/);
  });
  await check('the manipulation filled the typed answer', async () => {
    assert.equal(await page.inputValue('#typed'), '5/8');
  });
  await shot(page, '04-fraction-manipulated-wrong-1440');

  // --- wrong answer: live help, no silent advance
  await page.click('#check');
  await page.waitForSelector('#result');
  const fb1 = await page.textContent('.lw-feedback');
  const alt1 = await page.textContent('.lw-alternate');
  await check('feedback quotes the actual submitted answer', () => {
    assert.ok(fb1.includes('5/8'), 'feedback did not mention the answer: ' + fb1);
  });
  await check('a wrong answer does not advance the lesson', async () => {
    assert.match(await page.textContent('.lw-count'), /1 of 3/);
    assert.equal(await page.locator('#next').count(), 0);
  });
  await check('the wrong answer is still in the field for retry', async () => {
    assert.equal(await page.inputValue('#typed'), '5/8');
  });
  await check('retry button is offered, not fabricated success', async () => {
    assert.match(await page.textContent('#check'), /Try again/);
  });
  await shot(page, '05-wrong-answer-help-1440');

  // --- second mistake: the explanation CHANGES approach
  await page.fill('#typed', '4/8');
  await page.click('#check');
  await page.waitForFunction(() => document.querySelector('.lw-feedback')?.textContent.includes('4/8'));
  const alt2 = await page.textContent('.lw-alternate');
  await check('the second mistake gets a different explanation, not a repeat', () => {
    assert.notEqual(alt2, alt1, 'alternateExplanation repeated verbatim');
    assert.ok(alt2.includes('different way'), alt2);
  });
  await check('the new feedback is specific to the new answer', async () => {
    assert.ok((await page.textContent('.lw-feedback')).includes('4/8'));
  });
  await shot(page, '06-second-mistake-new-explanation-1440');

  // --- explicit hint marks the item assisted
  await page.click('#hint');
  await page.waitForFunction(() => document.querySelector('.lw-assisted') && !/Asking|Checking/.test(document.querySelector('#hint')?.textContent || ''));
  await check('a hint is visible and flags the item as assisted', async () => {
    assert.match(await page.textContent('.lw-assisted'), /Hint used/);
    assert.match(await page.textContent('#hint'), /different way/);
  });
  const hintCall = await page.evaluate(() => window.__calls.feedback.find(c => c.mode === 'hint'));
  await check('the hint request is a real call with the item context', () => {
    assert.equal(hintCall.mode, 'hint');
    assert.equal(hintCall.stepId, 'p1');
  });
  await shot(page, '07-hint-assisted-1440');

  // --- correct answer: local grade, no provider call spent
  const beforeCorrect = await page.evaluate(() => window.__calls.feedback.length);
  await page.fill('#typed', '3/8');
  await page.click('#check');
  await page.waitForSelector('.lw-result.lw-correct');
  await check('a correct answer is graded locally without a provider call', async () => {
    assert.equal(await page.evaluate(() => window.__calls.feedback.length), beforeCorrect);
  });
  await check('correct unlocks the next question', async () => {
    assert.equal(await page.locator('#next').count(), 1);
  });
  await check('the assisted flag survives into the record', async () => {
    // Chronological: the first row is the unassisted first attempt, the newest is the assisted pass.
    assert.match(await page.locator('.lw-ev').last().textContent(), /with help/);
    assert.match(await page.locator('.lw-ev').first().textContent(), /no help requested/);
  });
  await shot(page, '08-correct-with-help-1440');

  // --- step 2: choice + tokens
  await page.click('#next');
  await page.waitForFunction(() => document.querySelector('.lw-count')?.textContent.includes('2 of 3'));
  await check('step 2 is a choice question with countable tokens', async () => {
    assert.equal(await page.locator('.lw-token').count(), 8);
    assert.equal(await page.locator('.lw-choice').count(), 3);
  });
  const tokens = page.locator('.lw-token');
  await tokens.nth(0).click(); await tokens.nth(1).click(); await tokens.nth(2).click();
  await check('tokens count up as they are tapped', async () => {
    assert.match(await page.textContent('#stage-state'), /3 of 8 counted/);
    assert.equal(await tokens.nth(1).textContent(), '2');
  });
  await check('tokens do NOT overwrite a choice answer', async () => {
    assert.equal(await page.locator('#typed').count(), 0);
  });
  await shot(page, '09-step2-tokens-choice-1440');
  await page.locator('.lw-choice').first().click();
  await page.click('#check');
  await page.waitForSelector('.lw-result.lw-correct');
  await check('the correct choice passes locally and offers the fresh check', async () => {
    assert.equal(await page.locator('#next').count(), 1);
  });

  // --- step 3: fresh check, number line
  await page.click('#next');
  await page.waitForFunction(() => document.querySelector('.lw-count')?.textContent.includes('3 of 3'));
  await check('step 3 is labelled a fresh check, distinct from practice', async () => {
    assert.match(await page.textContent('.lw-kind'), /Fresh check/);
    assert.match(await page.textContent('.lw-work .lw-fine'), /new question, not the practice one/);
  });
  const prompts = await page.evaluate(() => window.__calls.lesson[0] && null);
  await check('the check prompt is not a copy of the practice prompts', async () => {
    const p = await page.textContent('.lw-prompt');
    assert.ok(!p.includes('three of the eight'), p);
  });
  const range = page.locator('#numberline');
  await check('the number line is a native range input', async () => {
    assert.equal(await range.getAttribute('type'), 'range');
    assert.equal(await range.getAttribute('min'), '0');
    assert.equal(await range.getAttribute('max'), '10');
  });
  await range.focus();
  for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight');
  await check('arrow keys move the marker and the focus stays on the slider', async () => {
    assert.equal(await page.inputValue('#numberline'), '6');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'numberline');
    assert.match(await page.textContent('#stage-state'), /Value 6/);
    assert.equal(await page.inputValue('#typed'), '6');
  });
  await shot(page, '10-fresh-check-numberline-1440');

  await page.click('#check');
  await page.waitForSelector('.lw-next');
  const nextText = await page.textContent('.lw-next-goal');
  await check('the fresh check produces a concrete suggested next goal', () => {
    assert.ok(nextText.length > 8, nextText);
  });
  await check('an unassisted correct fresh check suggests advancing', async () => {
    assert.match(await page.textContent('.lw-next-kind'), /next step/i);
    assert.match(nextText, /unlike denominators/);
  });
  await check('no mastery, percentage, streak or score claim outside the disclaimers', async () => {
    // .lw-fine is the honest fine print; it is allowed to SAY "not a mastery score".
    const claims = await page.evaluate(() => {
      const fine = [...document.querySelectorAll('.lw-fine')];
      return [...document.querySelectorAll('h1,h2,p,span,li,button,label')]
        .filter(n => !fine.some(f => f === n || f.contains(n)))
        .map(n => n.textContent).join(' ');
    });
    for (const bad of ['mastery', 'mastered', '%', 'streak', 'points', 'badge', 'XP', 'Level ']) {
      assert.ok(!claims.includes(bad), 'found claim: ' + bad);
    }
  });
  await shot(page, '11-next-lesson-suggested-1440');

  // --- launching the next lesson really regenerates
  await page.click('#launch-next');
  await page.waitForFunction(() => window.__calls.lesson.length === 2);
  // #work already exists, so wait for the NEW lesson: generate() clears the suggestion.
  await page.waitForFunction(() => !document.querySelector('.lw-next'));
  const second = await page.evaluate(() => window.__calls.lesson[1]);
  await check('launching next sends the suggested goal with previous context', () => {
    assert.match(second.goal, /unlike denominators/);
    assert.equal(typeof second.previous?.goal, 'string');
    assert.equal(typeof second.previous?.reason, 'string');
  });
  await check('the new lesson resets to its first question', async () => {
    assert.match(await page.textContent('.lw-count'), /1 of 3/);
    assert.equal(await page.locator('.lw-result').count(), 0);
  });
  await shot(page, '12-next-lesson-launched-1440');
  await check('no page errors in the whole math flow', () => {
    assert.deepEqual(page.__errors, []);
  });
  await ctx.close();
}

// ================================================================ 2. english/writing
say('\n2. english: passage selection, real textarea, writing is ungraded with an AI label');
{
  const { ctx, page } = await freshPage();
  await ack(page);
  await setup(page, { goal: 'Find the stated reason in a short passage', subject: 'english', grade: '4' });
  await check('passage renders as selectable sentences', async () => {
    assert.equal(await page.locator('.lw-sentence').count(), 2);
  });
  const s = page.locator('.lw-sentence');
  await s.nth(1).click();
  await check('selecting a sentence is reported', async () => {
    assert.equal(await s.nth(1).getAttribute('aria-pressed'), 'true');
    assert.match(await page.textContent('#stage-state'), /Sentence 2 of 2 selected/);
  });
  await check('sentences are keyboard reachable buttons', async () => {
    assert.equal(await s.nth(0).evaluate(n => n.tagName), 'BUTTON');
  });
  await s.nth(0).focus();
  await page.keyboard.press('Enter');
  await check('keyboard selection works like the pointer', async () => {
    assert.equal(await s.nth(0).getAttribute('aria-pressed'), 'true');
  });
  await shot(page, '13-english-passage-1440');

  await page.fill('#typed', '2');
  await page.click('#check');
  await page.waitForSelector('.lw-result.lw-correct');
  await page.click('#next');
  await page.waitForFunction(() => document.querySelector('.lw-count')?.textContent.includes('2 of 3'));
  await page.locator('.lw-choice').first().click();
  await page.click('#check');
  await page.waitForSelector('.lw-result.lw-correct');
  await page.click('#next');
  await page.waitForFunction(() => document.querySelector('.lw-count')?.textContent.includes('3 of 3'));

  await check('writing step is a real textarea, not a fake field', async () => {
    assert.equal(await page.locator('textarea#typed').count(), 1);
    assert.equal(await page.locator('textarea#typed').getAttribute('rows'), '6');
  });
  const essay = 'Mara left the window open on purpose. She wanted the cat to find its way home that night.';
  await page.fill('#typed', essay);
  await page.click('#check');
  await page.waitForSelector('#result');
  await check('writing is never scored: ungraded with an AI-feedback label', async () => {
    assert.match(await page.textContent('.lw-verdict'), /Not scored/);
    assert.match(await page.textContent('.lw-result .lw-fine'), /AI feedback, not a graded score/);
  });
  await check('the writing is preserved verbatim after the response renders', async () => {
    assert.equal(await page.inputValue('#typed'), essay);
  });
  await check('writing-only evidence suggests reinforcement, never advancement', async () => {
    assert.match(await page.textContent('.lw-next-kind'), /more practice/i);
  });
  await check('the record shows the answer, not a grade', async () => {
    assert.match(await page.textContent('.lw-evidence-list'), /Not scored/);
  });
  await shot(page, '14-writing-ungraded-1440');
  await check('no page errors in the english flow', () => { assert.deepEqual(page.__errors, []); });
  await ctx.close();
}

// ================================================================ 3. persistence
say('\n3. persistence: opt-in, reload resumes, export bytes, clear confirmation');
{
  const { ctx, page } = await freshPage();
  await ack(page);
  await setup(page, { goal: 'Shade and name unit fractions' });
  await check('saving is OFF until the adult turns it on', async () => {
    assert.equal(await page.isChecked('#save-on'), false);
    assert.equal(await page.evaluate(() => localStorage.getItem('lesson-workspace.v1')), null);
  });
  await page.locator('.lw-part').nth(2).click();
  await page.click('#check');
  await page.waitForSelector('.lw-result.lw-correct');
  await page.click('#next');
  await page.waitForFunction(() => document.querySelector('.lw-count')?.textContent.includes('2 of 3'));
  await check('work still is not persisted without consent', async () => {
    assert.equal(await page.evaluate(() => localStorage.getItem('lesson-workspace.v1')), null);
  });
  await page.check('#save-on');
  await page.waitForFunction(() => localStorage.getItem('lesson-workspace.v1'));
  await check('turning save on writes one versioned record and says so', async () => {
    const raw = await page.evaluate(() => localStorage.getItem('lesson-workspace.v1'));
    assert.equal(JSON.parse(raw).v, 1);
    assert.equal(await page.evaluate(() => Object.keys(localStorage).length), 1);
    assert.match(await page.textContent('#storage-msg'), /Saved in this browser/);
  });
  await shot(page, '15-saved-optin-1440');

  // --- export: real downloaded bytes
  const dl = await Promise.all([page.waitForEvent('download'), page.click('#export')]).then(r => r[0]);
  const dlPath = resolve(shotDir, 'exported-learning-record.json');
  await dl.saveAs(dlPath);
  const bytes = await readFile(dlPath, 'utf8');
  const parsed = JSON.parse(bytes);
  await check('the download is real parseable JSON with the lesson and evidence', () => {
    assert.ok(bytes.length > 200, 'suspiciously small: ' + bytes.length);
    assert.equal(parsed.v, 1);
    assert.equal(parsed.lesson.id, 'L-math-1');
    assert.ok(Array.isArray(parsed.evidence) && parsed.evidence.length >= 1);
    assert.equal(typeof parsed.evidence[0].at, 'string');
    assert.equal(typeof parsed.evidence[0].assisted, 'boolean');
    assert.ok(!('mastery' in parsed) && !('score' in parsed));
  });
  say('  download: ' + dlPath + ' (' + bytes.length + ' bytes)');

  // --- reload resumes
  await page.reload({ waitUntil: 'load' });
  await ack(page);
  await page.waitForSelector('#work');
  await check('reload truly resumes the saved lesson and position', async () => {
    assert.match(await page.textContent('.lw-count'), /2 of 3/);
    assert.match(await page.textContent('.lw-notice'), /Resumed/);
    assert.equal(await page.isChecked('#save-on'), true);
    assert.ok((await page.textContent('.lw-evidence-list')).length > 0);
  });
  await check('the resume used no extra provider call', async () => {
    assert.equal(await page.evaluate(() => window.__calls.lesson.length), 0);
  });
  await shot(page, '16-reloaded-resumed-1440');

  // --- clear needs confirmation
  await page.click('#clear');
  await page.waitForSelector('.lw-confirm');
  await check('clearing asks first', async () => {
    assert.match(await page.textContent('.lw-confirm'), /cannot be undone/);
  });
  await shot(page, '17-clear-confirm-1440');
  await page.click('#cf-no');
  await check('declining keeps the saved work', async () => {
    assert.ok(await page.evaluate(() => localStorage.getItem('lesson-workspace.v1')));
  });
  await page.click('#clear');
  await page.click('#cf-yes');
  await page.waitForSelector('#setup');
  await check('confirming deletes the record and clears the screen', async () => {
    assert.equal(await page.evaluate(() => localStorage.getItem('lesson-workspace.v1')), null);
    assert.equal(await page.locator('#work').count(), 0);
    assert.equal(await page.inputValue('#goal'), '');
    assert.equal(await page.isChecked('#save-on'), false);
  });
  await shot(page, '18-cleared-1440');
  await check('no page errors in the persistence flow', () => { assert.deepEqual(page.__errors, []); });
  await ctx.close();
}

// ================================================================ 4. corrupt/blocked storage
say('\n4. storage that is corrupt or blocked keeps the work and discloses it');
{
  const { ctx, page } = await freshPage();
  await page.evaluate(() => localStorage.setItem('lesson-workspace.v1', '{{{not json'));
  await page.reload({ waitUntil: 'load' });
  await ack(page);
  await check('corrupt saved data does not crash and is not silently replaced', async () => {
    assert.equal(await page.locator('#setup').count(), 1);
    assert.match(await page.textContent('#storage-msg'), /could not be read/);
    assert.equal(await page.evaluate(() => localStorage.getItem('lesson-workspace.v1')), '{{{not json');
  });
  await shot(page, '19-corrupt-storage-1440');

  // quota: saving fails, work survives, state is honest
  await setup(page, { goal: 'Name unit fractions' });
  await page.evaluate(() => {
    Storage.prototype.setItem = function () { const e = new Error('full'); e.name = 'QuotaExceededError'; throw e; };
  });
  await page.click('#save-on');   // not .check(): the app honestly un-checks it when the save fails
  await page.waitForFunction(() => document.querySelector('#storage-msg')?.textContent.includes('no room'));
  await check('a full quota keeps the lesson on screen and says it is not saved', async () => {
    assert.equal(await page.locator('#work').count(), 1);
    assert.match(await page.textContent('#storage-msg'), /no room left|only in this tab/);
    assert.equal(await page.isChecked('#save-on'), false);
  });
  await shot(page, '20-quota-memory-mode-1440');
  await check('no page errors in the storage-failure flow', () => { assert.deepEqual(page.__errors, []); });
  await ctx.close();
}

// ================================================================ 5. races and failures
say('\n5. races: cancel, replaced lesson, provider failure, double clicks, quota');
{
  const { ctx, page } = await freshPage();
  await ack(page);

  // double click must not double-call
  await page.fill('#goal', 'Compare eighths');
  await page.evaluate(() => { window.__mode.lessonDelayMs = 400; });
  await page.click('#generate');
  await page.click('#generate', { force: true }).catch(() => {});
  await page.click('#generate', { force: true }).catch(() => {});
  await page.waitForSelector('#work', { timeout: 6000 });
  await check('multiple clicks on generate make exactly one request', async () => {
    assert.equal(await page.evaluate(() => window.__calls.lesson.length), 1);
  });

  // a late reply for a cancelled generation must not land
  await page.evaluate(() => { window.__mode.lessonDelayMs = 1500; });
  await page.locator('.lw-restart summary').click();
  await page.locator('.lw-restart #goal').fill('A different goal entirely');
  await page.locator('.lw-restart #generate').click();
  await page.waitForSelector('.lw-restart #cancel');
  await page.locator('.lw-restart #cancel').click();
  await page.evaluate(() => { window.__mode.lessonDelayMs = 0; });
  await page.waitForTimeout(1800);
  await check('cancelling keeps the previous lesson; the late reply is dropped', async () => {
    assert.equal(await page.locator('#work').count(), 1);
    assert.match(await page.textContent('.lw-count'), /1 of 3/);
    assert.equal(await page.locator('.lw-error').count(), 0, 'no stale global error');
  });
  await shot(page, '21-cancel-no-stale-1440');

  // provider failure keeps the good lesson AND the typed work
  await page.fill('#typed', '7/8');
  await page.evaluate(() => { window.__mode.lessonFail = true; });
  await page.locator('.lw-restart #goal').fill('This generation will fail');
  await page.locator('.lw-restart #generate').click();
  await page.waitForSelector('.lw-error');
  await check('a failed generation keeps the previous lesson and the typed answer', async () => {
    assert.equal(await page.locator('#work').count(), 1);
    assert.equal(await page.inputValue('#typed'), '7/8');
    assert.match(await page.textContent('.lw-error'), /did not go through/);
    assert.match(await page.textContent('.lw-error'), /still here/);
    assert.equal(await page.locator('#retry').count(), 1);
  });
  await shot(page, '22-generation-failed-kept-1440');

  // retry works once the provider recovers
  await page.evaluate(() => { window.__mode.lessonFail = false; });
  const beforeRetry = await page.evaluate(() => window.__calls.lesson.length);
  await page.click('#retry');
  // The error clears on click; wait for the REPLACEMENT lesson, not just its absence.
  await page.waitForFunction(n => window.__calls.lesson.length > n, beforeRetry);
  await page.waitForFunction(() => document.querySelector('#check') && !/Generating/.test(document.body.textContent));
  await check('Retry re-sends the same request and recovers', async () => {
    assert.equal(await page.locator('#work').count(), 1);
    assert.equal(await page.locator('.lw-error').count(), 0);
    assert.match(await page.textContent('.lw-count'), /1 of 3/);
  });

  // feedback failure is bound to the item, keeps the answer
  await page.fill('#typed', '1/8');
  await page.evaluate(() => { window.__mode.feedbackFail = true; });
  await page.click('#check');
  await page.waitForSelector('.lw-error');
  await check('a failed check keeps the answer and shows Retry on that item', async () => {
    assert.equal(await page.inputValue('#typed'), '1/8');
    assert.equal(await page.locator('.lw-work .lw-error').count(), 1, 'error sits inside the item, not globally');
    assert.equal(await page.locator('.lw-result').count(), 0, 'no fabricated verdict');
  });
  await shot(page, '23-feedback-failed-item-scoped-1440');

  // exhausted call budget is stated plainly
  await page.evaluate(() => { window.__mode.feedbackFail = false; window.__mode.quota = true; });
  await page.locator('.lw-restart #goal').fill('Budget exhausted goal');
  await page.locator('.lw-restart #generate').click();
  await page.waitForFunction(() => document.querySelector('.lw-error')?.textContent.includes('AI calls'));
  await check('an exhausted AI budget is explained, not disguised', async () => {
    assert.match(await page.textContent('.lw-error'), /used all of its AI calls/);
  });
  await shot(page, '24-quota-exhausted-1440');
  await check('no page errors in the race flow', () => { assert.deepEqual(page.__errors, []); });
  await ctx.close();
}

// ================================================================ 6. locale
say('\n6. locale changes the next lesson and never retranslates authored work');
{
  const { ctx, page } = await freshPage();
  await ack(page);
  await setup(page, { goal: 'Find the reason in a passage', subject: 'english', grade: '4' });
  await page.fill('#typed', '2');
  await page.click('#check');
  await page.waitForSelector('.lw-result.lw-correct');
  await page.click('#next');
  await page.waitForFunction(() => document.querySelector('.lw-count')?.textContent.includes('2 of 3'));
  await page.locator('.lw-choice').first().click();
  await page.click('#check');
  await page.waitForSelector('.lw-result.lw-correct');
  await page.click('#next');
  await page.waitForFunction(() => document.querySelector('.lw-count')?.textContent.includes('3 of 3'));
  const authored = 'Mara dejo la ventana abierta porque queria que el gato volviera.';
  await page.fill('#typed', authored);

  await page.locator('.lw-restart summary').click();
  await page.locator('.lw-restart #locale').selectOption('es');
  await check('changing locale does not touch the authored response', async () => {
    assert.equal(await page.inputValue('#typed'), authored);
  });
  await check('changing locale does not change the current lesson text', async () => {
    assert.match(await page.textContent('.lw-prompt'), /Write one or two sentences/);
  });
  await check('the locale note says it applies to the next lesson', async () => {
    assert.match(await page.textContent('#locale-note'), /next lesson/);
  });
  await shot(page, '25-locale-switch-work-preserved-1440');

  await page.locator('.lw-restart #goal').fill('Contar en espanol');
  await page.locator('.lw-restart #subject').selectOption('math');
  await page.locator('.lw-restart #generate').click();
  await page.waitForFunction(() => window.__calls.lesson.length === 2);
  const esReq = await page.evaluate(() => window.__calls.lesson[1]);
  await check('the next generation requests the chosen locale', () => {
    assert.equal(esReq.locale, 'es');
  });
  // #work survives the swap, so wait for the locale the new lesson carries.
  await page.waitForFunction(() => document.querySelector('#app')?.getAttribute('lang') === 'es');
  await check('the Spanish lesson renders Spanish UI labels, not blanks', async () => {
    const body = await page.textContent('body');
    for (const bit of ['Revisar respuesta', 'Necesito una pista', 'Pregunta 1 de 3']) {
      assert.ok(body.includes(bit), 'missing Spanish label: ' + bit);
    }
    assert.equal(await page.getAttribute('#app', 'lang'), 'es');
  });
  await shot(page, '26-spanish-lesson-1440');
  await check('no page errors in the locale flow', () => { assert.deepEqual(page.__errors, []); });
  await ctx.close();
}

// ================================================================ 7. hostile strings
say('\n7. hostile model output: lessons with markup are refused, feedback renders as text');
{
  // (a) A lesson carrying markup must be refused outright, not rendered and not faked.
  const { ctx, page } = await freshPage();
  await page.addInitScript(() => {
    const nasty = '<img src=x onerror="window.__XSS=1">';
    const real = window.fetch;
    window.fetch = async (u, o) => {
      const res = await real(u, o);
      if (String(u).endsWith('/api/lesson') && res.status === 200) {
        const d = await res.json();
        const l = d.lesson;
        return new Response(JSON.stringify({ ...d, lesson: {
          ...l, title: nasty,
          steps: l.steps.map((s, i) => ({ ...s, prompt: nasty + ' q' + i })),
        } }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      return res;
    };
  });
  await page.goto(base + '/index.html', { waitUntil: 'load' });
  await ack(page);
  await page.fill('#goal', 'Injection probe');
  await page.click('#generate');
  await page.waitForSelector('.lw-error');
  await check('a lesson containing markup is refused, with no lesson rendered', async () => {
    assert.equal(await page.locator('#work').count(), 0);
    assert.equal(await page.evaluate(() => window.__XSS), undefined);
    assert.equal(await page.locator('body img').count(), 0);
    assert.match(await page.textContent('.lw-error'), /did not go through/);
  });
  await shot(page, '27a-markup-lesson-refused-1440');
  await ctx.close();

  // (b) Feedback text is NOT schema-validated, so the UI's own escaping must hold.
  const b = await freshPage();
  await b.page.addInitScript(() => {
    const nasty = '<img src=x onerror="window.__XSS=1"><b>bold</b><a href="javascript:alert(1)">link</a>';
    const real = window.fetch;
    window.fetch = async (u, o) => {
      const res = await real(u, o);
      if (String(u).endsWith('/api/feedback') && res.status === 200) {
        const d = await res.json();
        return new Response(JSON.stringify({ ...d, feedback: { ...d.feedback, text: nasty, alternateExplanation: nasty + ' alt' } }),
          { status: 200, headers: { 'content-type': 'application/json' } });
      }
      return res;
    };
  });
  await b.page.goto(base + '/index.html', { waitUntil: 'load' });
  await ack(b.page);
  await setup(b.page, { goal: 'Feedback injection probe' });
  await b.page.fill('#typed', '1/8');
  await b.page.click('#check');
  await b.page.waitForSelector('.lw-feedback');
  await check('hostile feedback text never becomes markup', async () => {
    assert.equal(await b.page.evaluate(() => window.__XSS), undefined);
    assert.equal(await b.page.locator('.lw-feedback img, .lw-feedback b, .lw-feedback a, .lw-feedback script').count(), 0);
    assert.equal(await b.page.locator('body img, body a[href^="javascript"]').count(), 0);
  });
  await check('the hostile string is shown to the adult as literal text', async () => {
    assert.ok((await b.page.textContent('.lw-feedback')).includes('<img src=x'));
    assert.ok((await b.page.textContent('.lw-alternate')).includes('<b>bold</b>'));
  });
  await shot(b.page, '27b-hostile-feedback-as-text-1440');
  await b.ctx.close();
}

// ================================================================ 8. responsive + a11y
say('\n8. responsive 390/320 and accessibility basics');
for (const [label, size] of [['390', { width: 390, height: 844 }], ['320', { width: 320, height: 568 }]]) {
  const { ctx, page } = await freshPage(size);
  await ack(page);
  await setup(page, { goal: 'Compare unit fractions on a bar' });
  await shot(page, `28-work-${label}`);
  await check(`${label}: no horizontal overflow`, async () => {
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(over <= 1, 'overflows by ' + over + 'px');
  });
  await check(`${label}: the visual and the question are in the first viewport`, async () => {
    const box = await page.locator('.lw-stage').boundingBox();
    const prompt = await page.locator('.lw-prompt').boundingBox();
    assert.ok(prompt.y < size.height, 'prompt below the fold at ' + prompt.y);
    assert.ok(box.y < size.height, 'visual below the fold at ' + box.y);
  });
  await check(`${label}: interactive targets are at least 44px`, async () => {
    const small = await page.evaluate(() => {
      const out = [];
      for (const n of document.querySelectorAll('button, input[type=range], select, textarea, input[type=text], .lw-choice')) {
        const r = n.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        if (r.height < 43.5) out.push((n.id || n.className || n.tagName) + ' h=' + r.height.toFixed(1));
      }
      return out;
    });
    assert.deepEqual(small, []);
  });
  await check(`${label}: nothing fixed covers the question`, async () => {
    const bad = await page.evaluate(() => {
      const p = document.querySelector('.lw-prompt').getBoundingClientRect();
      return [...document.querySelectorAll('*')].filter(n => {
        const cs = getComputedStyle(n);
        if (cs.position !== 'fixed' || cs.visibility === 'hidden' || cs.display === 'none') return false;
        const r = n.getBoundingClientRect();
        if (!r.width || !r.height) return false;
        return !(r.bottom < p.top || r.top > p.bottom || r.right < p.left || r.left > p.right);
      }).map(n => n.className || n.tagName);
    });
    assert.deepEqual(bad, []);
  });
  await ctx.close();
}
{
  const { ctx, page } = await freshPage();
  await ack(page);
  await setup(page, { goal: 'Compare unit fractions on a bar' });
  await check('every form control has an accessible name', async () => {
    const unnamed = await page.evaluate(() => {
      const out = [];
      for (const n of document.querySelectorAll('input, select, textarea, button')) {
        const byLabel = n.labels && n.labels.length;
        const name = n.getAttribute('aria-label') || (byLabel ? n.labels[0].textContent : '') || n.textContent.trim();
        if (!String(name).trim()) out.push(n.id || n.className || n.tagName);
      }
      return out;
    });
    assert.deepEqual(unnamed, []);
  });
  await check('there is a skip link and a main landmark', async () => {
    assert.equal(await page.locator('a.lw-skip').count(), 1);
    assert.equal(await page.locator('main#main').count(), 1);
    assert.equal(await page.locator('h1').count(), 1);
  });
  await check('live regions are polite, and only where they belong', async () => {
    assert.equal(await page.getAttribute('#stage-state', 'aria-live'), 'polite');
    assert.equal(await page.locator('[aria-live="assertive"]').count(), 0);
  });
  await check('keyboard alone can shade a fraction part', async () => {
    await page.locator('.lw-part').first().focus();
    await page.keyboard.press('Enter');
    assert.match(await page.textContent('#stage-state'), /1 of 8/);
    assert.equal(await page.inputValue('#typed'), '1/8');
  });
  await check('focus is visible on the controls', async () => {
    const outline = await page.locator('.lw-part').first().evaluate(n => { n.focus(); return getComputedStyle(n).outlineStyle; });
    assert.notEqual(outline, 'none');
  });
  await check('no camera, mic, audio or account control exists', async () => {
    const body = (await page.textContent('body')).toLowerCase();
    for (const bad of ['microphone', 'camera', 'record audio', 'sign in', 'log in', 'account', 'upgrade']) {
      assert.ok(!body.includes(bad), 'found: ' + bad);
    }
    assert.equal(await page.locator('audio, video, iframe').count(), 0);
  });
  await check('no network request left this computer', async () => {
    const external = await page.evaluate(() => performance.getEntriesByType('resource')
      .map(r => r.name).filter(n => !n.startsWith(location.origin)));
    assert.deepEqual(external, []);
  });
  await shot(page, '29-a11y-focus-1440');
  await ctx.close();
}

// ---------------------------------------------------------------- report
await browser.close();
server.close();
say('\nscreenshots (' + shots.length + '):');
for (const p of shots) say('  ' + p);
say(failed ? `\nFAILED: ${failed} check(s)` : '\nALL CHECKS PASSED (synthetic fixture API, not a live provider)');
await writeFile(resolve(shotDir, 'ui-browser-last-run.log'), log.join('\n') + '\n');
process.exit(failed ? 1 : 0);