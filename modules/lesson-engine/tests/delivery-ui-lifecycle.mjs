// delivery-ui-lifecycle.mjs — real-browser checks for the profile/lesson lifecycle
// defects reproduced in evidence/profile-spec-coordinator-20261003T145221Z.
//
// NEW FILE. It adds cases; it does not replace or weaken any existing harness.
// Every assertion drives the real user path: click the disclosure, type into the
// profile inputs, submit the real form, toggle the real checkboxes.
//
//   D1  a saved lesson survives re-entering the SAME age with remember OFF
//   D2  a confirmed age-change discard is DURABLE, and incompatible saved work
//       can never surface under another age
//   D3  a refused deletion reports the failure and never claims deletion
//   D4  a refused profile write rolls the switch back and says so
//   F1  the footer never renders the literal string "null"
//   R1  a nickname-only edit preserves the lesson and the typed work
//   R2  declining an age change preserves the lesson and the typed work
//   R3  a legacy v1 saved lesson (grade, NO age) restores; no age is invented
//
// EVERY provider reply is a locally authored synthetic fixture. No provider call,
// no network egress, no microphone, no camera, no sound. Storage failure is an
// INIT-SCRIPT ENVIRONMENT OVERRIDE of localStorage (a hostile/full browser),
// never a mutation of application state.
//
//   UI_APP_ROOT       app directory to serve (default ../)
//   UI_EVIDENCE_DIR   where screenshots + results.json land

import { chromium } from '/Users/man/education-product-discovery/devtools/browser/node_modules/playwright/index.mjs';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = resolve(process.env.UI_APP_ROOT || join(HERE, '..'));
const OUT = resolve(process.env.UI_EVIDENCE_DIR || join(APP_ROOT, 'evidence', 'delivery-ui-lifecycle-local'));
const CHROME = '/Users/man/.agent-browser/browsers/chrome-153.0.8010.52/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const PROVENANCE = 'synthetic-fixture';

const REC_KEY = 'lesson-workspace.v1';
const PROF_KEY = 'lesson-workspace.profile.v1';

const results = [];
const rec = (id, clause, verdict, observed, extra = {}) => {
  results.push({ id, clause, verdict, observed, provenance: PROVENANCE, ...extra });
  console.log(`[${verdict}] ${id} (${clause}) — ${observed}`);
};
const ok = (id, clause, cond, pass, fail, extra) =>
  rec(id, clause, cond ? 'PASS' : 'FAIL', cond ? pass : fail, extra);

// ── synthetic fixtures (authored here; NOT provider output) ──────────────────
const v2Lesson = (age, locale = 'en', goal = 'how the water cycle works') => ({
  version: 2, id: 'syn-1', title: 'The water cycle', goal, subject: 'earth science',
  age, locale, intro: 'A short walk through the cycle, stage by stage.',
  steps: [
    { id: 's1', kind: 'numeric', prompt: 'How many stages are shown in the diagram?',
      explanation: 'Count the labelled stages.', hint: 'Count the numbered rows.', answer: '4',
      visual: { kind: 'sequence', caption: 'Four stages of the water cycle',
        stages: [
          { label: 'Evaporation', detail: 'The sun heats water and it rises as vapour.' },
          { label: 'Condensation', detail: 'Vapour cools high up and forms cloud droplets.' },
          { label: 'Precipitation', detail: 'Droplets join, grow heavy and fall as rain.' },
          { label: 'Collection', detail: 'Water gathers in rivers, lakes and the ground.' },
        ] } },
    { id: 's2', kind: 'choice', prompt: 'Which stage forms the clouds?',
      explanation: 'Cooling vapour condenses into droplets.', hint: 'Think about cooling.',
      choices: ['Evaporation', 'Condensation', 'Collection'], answer: 'Condensation',
      visual: { kind: 'tokens', count: 4, caption: 'Four counters, one per stage' } },
    { id: 's3', kind: 'numeric', prompt: 'If two of the four stages happen in the sky, how many do not?',
      explanation: 'Four minus two.', hint: 'Subtract.', answer: '2',
      visual: { kind: 'fraction', parts: 4, filled: 2, caption: 'Two of four parts' } },
  ],
  path: { reinforce: { goal: 'Practise naming the stages', reason: 'Naming comes before explaining.' },
    advance: { goal: 'Explain why rain falls', reason: 'The next idea builds on the cycle.' } },
});

// Legacy v1: whitelisted subject + grade band, and NO age field at all.
const v1Lesson = () => ({
  version: 1, id: 'legacy-1', title: 'Halves and quarters', goal: 'compare halves and quarters',
  subject: 'math', grade: '3', locale: 'en', intro: 'An older saved lesson from before ages were asked.',
  steps: [
    { id: 'l1', kind: 'numeric', prompt: 'How many quarters shade half of the bar?',
      explanation: 'Two quarters make one half.', hint: 'Count the shaded parts.', answer: '2',
      visual: { kind: 'fraction', parts: 4, filled: 2, caption: 'Two of four parts shaded' } },
    { id: 'l2', kind: 'choice', prompt: 'Which share is larger?',
      explanation: 'One half covers more of the bar than one quarter.', hint: 'Compare the shaded widths.',
      choices: ['One half', 'One quarter'], answer: 'One half',
      visual: { kind: 'tokens', count: 4, caption: 'Four counters' } },
    { id: 'l3', kind: 'numeric', prompt: 'Three quarters is how many quarters more than one half?',
      explanation: 'Three quarters minus two quarters.', hint: 'Work in quarters.', answer: '1',
      visual: { kind: 'numberline', min: 0, max: 1, value: 0.75, caption: 'Three quarters on the line' } },
  ],
  path: { reinforce: { goal: 'Practise naming halves', reason: 'Naming comes before comparing.' },
    advance: { goal: 'Compare thirds and quarters', reason: 'The next idea builds on sharing.' } },
});

const recordEnvelope = (lesson, extra = {}) => JSON.stringify({
  v: 1, lesson, stepIndex: 0, answers: {}, assisted: {}, evidence: [], next: null,
  at: new Date().toISOString(), ...extra,
});

const staticServer = () => new Promise((res) => {
  const types = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css' };
  const srv = createServer(async (rq, rs) => {
    const p = rq.url.split('?')[0];
    const rel = p === '/' ? 'index.html' : p.replace(/^\/+/, '');
    try {
      const body = await readFile(join(APP_ROOT, rel));
      rs.writeHead(200, { 'content-type': types[extname(rel)] || 'application/octet-stream' });
      rs.end(body);
    } catch { rs.writeHead(404); rs.end('no'); }
  });
  srv.listen(0, '127.0.0.1', () => res({ srv, base: `http://127.0.0.1:${srv.address().port}` }));
});

async function main() {
  await mkdir(OUT, { recursive: true });
  const { srv, base } = await staticServer();
  let browser;
  try {
    browser = await chromium.launch({ executablePath: CHROME });

    // ---- real-user-path primitives ------------------------------------------
    const ack = async (page) => {
      await page.waitForSelector('#ack', { timeout: 8000 });
      await page.click('#ack');
      await page.waitForTimeout(120);
    };
    const fillProfile = async (page, name, age, { remember = false } = {}) => {
      await page.waitForSelector('#profile-name', { timeout: 8000 });
      await page.fill('#profile-name', name);
      await page.fill('#profile-age', String(age));
      if (remember) await page.check('#profile-remember');
      await page.click('#profile-save');
      await page.waitForTimeout(200);
    };
    const stubLesson = (page, bodies = []) => {
      page.route('**/api/lesson', (route) => {
        const b = JSON.parse(route.request().postData() || '{}');
        bodies.push(b);
        route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify({ lesson: v2Lesson(b.age, b.locale, b.goal), callsLeft: 7 }) });
      });
      return bodies;
    };
    const generate = async (page, goal) => {
      await page.waitForSelector('#goal', { timeout: 8000 });
      await page.fill('#goal', goal);
      await page.click('#generate');
      await page.waitForSelector('#work', { timeout: 10000 });
    };
    const snapshot = (page) => page.evaluate(({ REC_KEY, PROF_KEY }) => {
      const root = document.getElementById('app');
      const read = (k) => { try { return localStorage.getItem(k); } catch { return 'throw'; } };
      const recText = read(REC_KEY);
      let recInfo = recText;
      if (recText && recText !== 'throw') {
        try {
          const o = JSON.parse(recText);
          recInfo = { id: o.lesson?.id, age: o.lesson?.age ?? null, version: o.lesson?.version,
            grade: o.lesson?.grade ?? null };
        } catch { recInfo = 'unparseable'; }
      }
      // Literal "null" leaking from a view function into native append().
      // Counted at every depth: a `\bnull\b` scan of textContent misses it, because
      // concatenation with the previous node's text ("...worknull") breaks the \b.
      const strayNull = [];
      (function walk(n) {
        for (const c of n.childNodes) {
          if (c.nodeType === 3) { if (c.textContent.trim() === 'null') strayNull.push(c.parentNode.className || c.parentNode.id || 'root'); }
          else if (c.nodeType === 1) walk(c);
        }
      })(root);
      return {
        state: root.dataset.state,
        title: root.querySelector('.lw-title')?.textContent ?? null,
        prompt: root.querySelector('.lw-prompt')?.textContent ?? null,
        hasWork: !!root.querySelector('#work'),
        hasGoalField: !!root.querySelector('#goal'),
        hasProfileForm: !!root.querySelector('#profile'),
        notice: root.querySelector('.lw-notice')?.textContent ?? null,
        storageMsg: root.querySelector('#storage-msg')?.textContent ?? null,
        profileStorageMsg: root.querySelector('#profile-storage-msg')?.textContent ?? null,
        rememberChecked: root.querySelector('#profile-remember')?.checked ?? null,
        typedAnswer: root.querySelector('#typed')?.value ?? null,
        provenanceFooter: root.querySelector('#provenance')?.textContent ?? null,
        bodyText: root.textContent,
        strayNullNodes: strayNull.length,
        strayNullWhere: strayNull,
        recordOnDisk: recInfo,
        profileOnDisk: read(PROF_KEY),
      };
    }, { REC_KEY, PROF_KEY });

    // Writes/removes throw; reads keep working. A full or hostile browser.
    const breakWrites = (page) => page.addInitScript(() => {
      const proto = Object.getPrototypeOf(localStorage);
      proto.setItem = function () { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; };
      proto.removeItem = function () { throw new Error('blocked'); };
    });
    const seed = (page, pairs) => page.addInitScript((kv) => {
      for (const [k, v] of kv) localStorage.setItem(k, v);
    }, pairs);

    const shot = (page, name) => page.screenshot({ path: join(OUT, name), fullPage: true });

    // =====================================================================
    // D1 — saved lesson survives same-age profile re-entry, remember OFF.
    // =====================================================================
    {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      const page = await ctx.newPage();
      stubLesson(page);
      await page.goto(base);
      await ack(page);
      await fillProfile(page, 'Ada', 9);                  // remember OFF (default)
      await generate(page, 'how the water cycle works');
      await page.check('#save-on');
      await page.waitForTimeout(150);
      const before = await snapshot(page);
      ok('D1a', 'setup', before.recordOnDisk?.age === 9 && before.profileOnDisk === null,
        'precondition: age-9 v2 record saved, no profile key (remember OFF)',
        `precondition NOT met: record=${JSON.stringify(before.recordOnDisk)} profile=${before.profileOnDisk}`);

      await page.reload();
      await ack(page);
      await fillProfile(page, 'Ada', 9);                  // SAME name, SAME age
      const after = await snapshot(page);
      await shot(page, 'd1-same-age-reentry.png');

      ok('D1b', 'S5.1', after.state === 'work' && after.title === 'The water cycle' && after.hasWork,
        're-entering the same age reopens the saved lesson',
        `saved lesson did not reopen: state=${after.state} title=${JSON.stringify(after.title)}`,
        { recordStillOnDisk: after.recordOnDisk });
      ok('D1c', 'S5.1', after.recordOnDisk?.age === 9,
        'the saved record is still on disk after re-entry',
        `record changed/lost: ${JSON.stringify(after.recordOnDisk)}`);
      // The resumed notice must only appear when a lesson actually came back.
      const claimsResumed = /Resumed/i.test(after.notice || '');
      ok('D1d', 'S5.1/honesty', claimsResumed === after.hasWork,
        `resume notice matches what is on screen (notice=${JSON.stringify(after.notice)}, work=${after.hasWork})`,
        `notice and screen disagree: notice=${JSON.stringify(after.notice)} work=${after.hasWork}`);
      await ctx.close();
    }

    // =====================================================================
    // D2 — confirmed age-change discard is durable, and incompatible saved
    // work never appears under another age.
    // =====================================================================
    {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      const page = await ctx.newPage();
      stubLesson(page);
      await page.goto(base);
      await ack(page);
      await fillProfile(page, 'Ada', 9, { remember: true });
      await generate(page, 'how the water cycle works');
      await page.check('#save-on');
      await page.waitForTimeout(150);
      const armed = await snapshot(page);
      ok('D2a', 'setup', armed.recordOnDisk?.age === 9 && armed.profileOnDisk !== null,
        'precondition: age-9 record + remembered profile both stored',
        `precondition NOT met: record=${JSON.stringify(armed.recordOnDisk)} profile=${armed.profileOnDisk}`);

      await page.click('#profile-edit');
      await page.fill('#profile-age', '11');
      await page.click('#profile-save');
      await page.waitForSelector('#age-yes', { timeout: 8000 });
      await shot(page, 'd2-age-confirm.png');
      await page.click('#age-yes');                       // explicit discard
      await page.waitForTimeout(250);
      const discarded = await snapshot(page);
      ok('D2b', 'S5.4', discarded.recordOnDisk == null,
        'the confirmed discard removed the saved record from disk',
        `saved record survived a confirmed discard: ${JSON.stringify(discarded.recordOnDisk)}`);

      await page.reload();
      await ack(page);
      await page.waitForTimeout(250);
      const reloaded = await snapshot(page);
      await shot(page, 'd2-after-reload.png');
      ok('D2c', 'S5.4', !reloaded.hasWork && reloaded.title !== 'The water cycle',
        'the discarded age-9 lesson does not return under the age-11 profile',
        `discarded lesson returned: state=${reloaded.state} title=${JSON.stringify(reloaded.title)}`);
      await ctx.close();
    }

    // D2d — belt: an age-9 record planted beside a remembered age-11 profile
    // must never render, whatever route produced the mismatch.
    {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      const page = await ctx.newPage();
      await seed(page, [
        [REC_KEY, recordEnvelope(v2Lesson(9))],
        [PROF_KEY, JSON.stringify({ v: 1, name: 'Ada', age: 11 })],
      ]);
      await page.goto(base);
      await ack(page);
      await page.waitForTimeout(250);
      const s = await snapshot(page);
      await shot(page, 'd2d-mismatched-record.png');
      ok('D2d', 'S5.4', !s.hasWork && s.title !== 'The water cycle',
        'an age-mismatched saved lesson is not rendered under the active profile',
        `age-9 lesson rendered under an age-11 profile: state=${s.state} title=${JSON.stringify(s.title)}`);
      ok('D2e', 'honesty', !/Resumed/i.test(s.notice || ''),
        `no false resume claim (notice=${JSON.stringify(s.notice)})`,
        `claims a resume that did not happen: ${JSON.stringify(s.notice)}`);
      await ctx.close();
    }

    // =====================================================================
    // D3 — a refused deletion never claims deletion.
    // =====================================================================
    {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      const page = await ctx.newPage();
      stubLesson(page);
      await seed(page, [
        [REC_KEY, recordEnvelope(v2Lesson(9))],
        [PROF_KEY, JSON.stringify({ v: 1, name: 'Ada', age: 9 })],
      ]);
      await breakWrites(page);                            // removeItem throws
      await page.goto(base);
      await ack(page);
      await page.waitForTimeout(250);
      const armed = await snapshot(page);
      ok('D3a', 'setup', armed.hasWork && armed.recordOnDisk?.age === 9,
        'precondition: saved lesson restored and on disk, deletion will be refused',
        `precondition NOT met: work=${armed.hasWork} record=${JSON.stringify(armed.recordOnDisk)}`);

      await page.click('#clear');
      await page.waitForSelector('#cf-yes', { timeout: 8000 });
      await page.click('#cf-yes');
      await page.waitForTimeout(250);
      const after = await snapshot(page);
      await shot(page, 'd3-refused-delete.png');

      const claimsDeleted = /deleted|borr/i.test(after.notice || '');
      ok('D3b', 'S3.4/honesty', !claimsDeleted,
        `no deletion claim after a refused delete (notice=${JSON.stringify(after.notice)})`,
        `claims deletion although removeItem threw: ${JSON.stringify(after.notice)}`);
      const saysFailed = /blocked|not deleted|no se pudo|bloque/i.test(
        `${after.storageMsg || ''} ${after.notice || ''} ${after.profileStorageMsg || ''}`);
      ok('D3c', 'S3.4', saysFailed,
        'the refused deletion is reported in visible copy',
        `failure not reported: storageMsg=${JSON.stringify(after.storageMsg)} notice=${JSON.stringify(after.notice)}`);
      ok('D3d', 'S3.4', after.recordOnDisk?.age === 9 && after.profileOnDisk !== null,
        'the data is still on disk, matching what the UI says',
        `disk state unexpected: record=${JSON.stringify(after.recordOnDisk)} profile=${after.profileOnDisk}`);
      ok('D3e', 'S3.4', after.hasWork,
        'the lesson is still on screen, so the screen matches the disk',
        'the screen was emptied although nothing was deleted');
      await ctx.close();
    }

    // =====================================================================
    // D4 — a refused profile write rolls back and reports failure.
    // =====================================================================
    {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      const page = await ctx.newPage();
      await breakWrites(page);                            // setItem throws
      await page.goto(base);
      await ack(page);
      await fillProfile(page, 'Ada', 9, { remember: true });
      await page.waitForTimeout(200);
      const after = await snapshot(page);
      await shot(page, 'd4-refused-profile-write.png');

      ok('D4a', 'S3.3', after.profileOnDisk == null || after.profileOnDisk === 'throw',
        'nothing was stored, as the browser refused the write',
        `a profile key exists despite the refused write: ${after.profileOnDisk}`);
      const reported = /blocked|stayed off|no se pudo|bloque/i.test(
        `${after.storageMsg || ''} ${after.notice || ''} ${after.profileStorageMsg || ''}`);
      ok('D4b', 'S3.3', reported,
        'the refused profile write is reported in visible copy',
        `failure not reported: storageMsg=${JSON.stringify(after.storageMsg)} notice=${JSON.stringify(after.notice)}`);

      // Reopen the form: the switch must not still claim the profile is remembered.
      await page.click('#profile-edit');
      await page.waitForSelector('#profile-remember', { timeout: 8000 });
      const form = await snapshot(page);
      await shot(page, 'd4-switch-rolled-back.png');
      ok('D4c', 'S3.3', form.rememberChecked === false,
        'the remember switch rolled back to off after the refused write',
        `the switch still reads ON although no profile is stored (checked=${form.rememberChecked})`);
      await ctx.close();
    }

    // =====================================================================
    // F1 — the footer never renders the literal string "null".
    // =====================================================================
    {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      const page = await ctx.newPage();
      // No provenance and no callsLeft: viewFoot() has nothing to render.
      page.route('**/api/lesson', (route) => {
        const b = JSON.parse(route.request().postData() || '{}');
        route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify({ lesson: v2Lesson(b.age, b.locale, b.goal) }) });
      });
      await page.goto(base);
      await ack(page);
      await fillProfile(page, 'Ada', 9);
      await generate(page, 'how the water cycle works');
      await page.waitForTimeout(150);
      const s = await snapshot(page);
      await shot(page, 'f1-empty-provenance-footer.png');
      ok('F1a', 'display', s.strayNullNodes === 0,
        'no literal "null" text node is appended to the app root',
        `${s.strayNullNodes} literal "null" text node(s) rendered, in: ${JSON.stringify(s.strayNullWhere)}`,
        { strayNullWhere: s.strayNullWhere });
      // Substring, not \b: the stray node concatenates with its sibling's text.
      ok('F1b', 'display', !/null/.test(s.bodyText),
        'the rendered text contains no literal "null" anywhere',
        `the rendered text still contains a literal "null": ${JSON.stringify(s.bodyText.slice(-80))}`);
      ok('F1c', 'display', s.provenanceFooter === null,
        'with no provenance the footer is simply absent',
        `an empty footer rendered anyway: ${JSON.stringify(s.provenanceFooter)}`);
      await ctx.close();
    }

    // =====================================================================
    // R1 / R2 — edits that must NOT cost work.
    // =====================================================================
    {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      const page = await ctx.newPage();
      stubLesson(page);
      await page.goto(base);
      await ack(page);
      await fillProfile(page, 'Ada', 9);
      await generate(page, 'how the water cycle works');
      await page.fill('#typed', '4');
      await page.waitForTimeout(100);

      await page.click('#profile-edit');
      await page.fill('#profile-name', 'Bea');            // nickname only, same age
      await page.click('#profile-save');
      await page.waitForTimeout(250);
      const renamed = await snapshot(page);
      await shot(page, 'r1-nickname-only-edit.png');
      ok('R1a', 'S4.3', renamed.hasWork && renamed.title === 'The water cycle',
        'a nickname-only edit keeps the lesson open',
        `the lesson was lost on a nickname-only edit: state=${renamed.state}`);
      ok('R1b', 'S4.3', renamed.typedAnswer === '4',
        'a nickname-only edit keeps the typed answer',
        `typed answer lost on rename: ${JSON.stringify(renamed.typedAnswer)}`);

      await page.click('#profile-edit');
      await page.fill('#profile-age', '11');
      await page.click('#profile-save');
      await page.waitForSelector('#age-no', { timeout: 8000 });
      await page.click('#age-no');                        // decline the change
      await page.waitForTimeout(250);
      const declined = await snapshot(page);
      await shot(page, 'r2-age-change-declined.png');
      ok('R2a', 'S4.4', declined.hasWork && declined.title === 'The water cycle',
        'declining an age change keeps the lesson open',
        `the lesson was lost after declining an age change: state=${declined.state}`);
      ok('R2b', 'S4.4', declined.typedAnswer === '4',
        'declining an age change keeps the typed answer',
        `typed answer lost after declining: ${JSON.stringify(declined.typedAnswer)}`);
      await ctx.close();
    }

    // =====================================================================
    // R3 — legacy v1 restoration. A v1 record carries a grade and no age, so
    // no age makes it incompatible, and none is invented for it.
    // =====================================================================
    {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      const page = await ctx.newPage();
      await seed(page, [[REC_KEY, recordEnvelope(v1Lesson())]]);
      await page.goto(base);
      await ack(page);
      await fillProfile(page, 'Ada', 9);                  // remember OFF
      const s = await snapshot(page);
      await shot(page, 'r3-legacy-v1-restored.png');
      ok('R3a', 'S5.1', s.hasWork && s.title === 'Halves and quarters',
        'a legacy v1 saved lesson restores under a freshly entered profile',
        `legacy v1 lesson did not restore: state=${s.state} title=${JSON.stringify(s.title)}`);
      ok('R3b', 'S5.1', s.recordOnDisk?.version === 1 && s.recordOnDisk?.age === null
        && s.recordOnDisk?.grade === '3',
        'the v1 record keeps its grade and is given no age',
        `v1 record was altered: ${JSON.stringify(s.recordOnDisk)}`);
      await ctx.close();
    }
  } finally {
    if (browser) await browser.close();
    srv.close();
  }

  const pass = results.filter((r) => r.verdict === 'PASS').length;
  const fail = results.filter((r) => r.verdict === 'FAIL').length;
  await writeFile(join(OUT, 'results.json'), JSON.stringify({
    suite: 'delivery-ui-lifecycle',
    appRoot: APP_ROOT,
    at: new Date().toISOString(),
    provenance: PROVENANCE,
    note: 'Synthetic fixtures and a simulated hostile localStorage only. No provider call, microphone, camera or sound.',
    total: results.length, pass, fail, results,
  }, null, 2));
  console.log(`\n${pass} PASS / ${fail} FAIL of ${results.length} — ${OUT}`);
  // Exit code reflects the findings: a FAIL row fails the run.
  process.exitCode = fail ? 1 : 0;
}

main().catch((err) => { console.error(err); process.exitCode = 2; });
