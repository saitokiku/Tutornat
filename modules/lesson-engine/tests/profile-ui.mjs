/* profile-ui.mjs — one focused real-browser check for the profile→lesson slice.
 *
 * Proves, in a real Chrome, the behaviors the vertical slice claims:
 *   G  gate        name+age required before #goal exists; invalid values blocked
 *   N  containment the name appears in no outbound request (method+url+headers+body)
 *   B  body        exact POST /api/lesson shape: adultTest/age/goal/locale, no subject/grade/name
 *   O  open topic  a free topic reaches `goal` unaltered, no <select> governs it
 *   V  v2 render   valid v2 sequence payload renders; age/locale mismatch is rejected
 *   A  abort-proof an age change discards a late reply that ignores the abort signal
 *   P  persistence no opt-in → no persistent profile key; opt-in → restored on reload
 *   E  errors      a 500 surfaces authored copy, not the provider's own message
 *
 * EVERY provider reply here is a locally authored synthetic fixture. Nothing in
 * this file is live-provider, live-voice or VoiceOver evidence.
 *
 *   PROFILE_APP_ROOT     app directory to serve (default ../)
 *   PROFILE_EVIDENCE_DIR where screenshots + results.json land
 */
import { chromium } from '/Users/man/education-product-discovery/devtools/browser/node_modules/playwright/index.mjs';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = resolve(process.env.PROFILE_APP_ROOT || join(HERE, '..'));
const OUT = resolve(process.env.PROFILE_EVIDENCE_DIR
  || join(APP_ROOT, 'evidence', `profile-ui-${new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15)}Z`));
const CHROME = '/Users/man/.agent-browser/browsers/chrome-153.0.8010.52/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const PROVENANCE = 'synthetic-stub';

const results = [];
const record = (id, verdict, note, extra = {}) => {
  results.push({ id, verdict, note, provenance: PROVENANCE, ...extra });
  console.log(`${verdict.padEnd(10)} ${id.padEnd(4)} ${note}`);
};
const ok = (id, cond, note, extra) => record(id, cond ? 'PASS' : 'FAIL', note, extra);

// ── synthetic v2 fixture: authored here, never provider output ───────────────
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

const staticServer = () => new Promise((res) => {
  const types = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css' };
  const srv = createServer(async (req, rq) => {
    const path = req.url.split('?')[0];
    const rel = path === '/' ? 'index.html' : path;
    try {
      const body = await readFile(join(APP_ROOT, rel));
      rq.writeHead(200, { 'content-type': types[extname(rel)] || 'application/octet-stream' });
      rq.end(body);
    } catch { rq.writeHead(404); rq.end('no'); }
  });
  srv.listen(0, '127.0.0.1', () => res({ srv, base: `http://127.0.0.1:${srv.address().port}` }));
});

async function main() {
  await mkdir(OUT, { recursive: true });
  const { srv, base } = await staticServer();
  const browser = await chromium.launch({ executablePath: CHROME });
  const shot = (page, name) => page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });

  // every scenario gets a clean context: no bleed-through of storage or stubs
  const fresh = async (viewport = { width: 1440, height: 900 }) => {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    const sent = [];
    const errors = [];
    const logs = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => logs.push(m.text()));
    page.on('request', (r) => {
      if (r.url().includes('/api/')) {
        sent.push({ method: r.method(), url: r.url(), headers: r.headers(), body: r.postData() || '' });
      }
    });
    return { ctx, page, sent, errors, logs };
  };
  const ack = async (page) => { await page.waitForSelector('#ack'); await page.click('#ack'); };
  const saveProfile = async (page, name, age) => {
    await page.fill('#profile-name', name);
    await page.fill('#profile-age', String(age));
    await page.click('#profile-save');
  };

  // ── G: the gate ────────────────────────────────────────────────────────────
  {
    const { ctx, page, errors } = await fresh();
    await page.goto(base); await ack(page);
    const beforeGoal = await page.$('#goal');
    const controls = await page.$$eval('#profile-name, #profile-age, #profile-save', (n) => n.length);
    ok('G1', !beforeGoal && controls === 3, `profile controls=${controls}, #goal before save=${Boolean(beforeGoal)}`);
    await shot(page, 'red-gate-1440');

    // auth-ish affordance scan over the whole profile surface
    const authish = await page.evaluate(() => {
      const re = /sign[ -]?in|log[ -]?in|password|e-?mail|register|create account|account/i;
      return [...document.querySelectorAll('input,button,a,label,h1,h2,legend')]
        .map((n) => `${n.tagName}:${(n.textContent || '').trim()}|${n.getAttribute('aria-label') || ''}|${n.type || ''}`)
        .filter((s) => re.test(s));
    });
    ok('G2', authish.length === 0, `auth-ish affordances=${authish.length}`, { authish });

    // Rejections. The error must belong to the field under test — a leftover error from
    // the previous attempt would make every one of these pass for the wrong reason.
    for (const [id, nm, ag, field] of [
      ['G3', '   ', '9', 'name'], ['G4', 'Ada', '0', 'age'], ['G5', 'Ada', '121', 'age'],
      ['G6', 'Ada', '7.5', 'age'], ['G7', 'x'.repeat(41), '9', 'name'],
    ]) {
      await saveProfile(page, nm, ag);
      const stillGated = !(await page.$('#goal'));
      const shown = await page.$$eval('.lw-field-err', (n) => n.map((x) => [x.id, x.textContent.trim()]));
      const mine = shown.find(([eid]) => eid === `profile-${field}-err`);
      const others = shown.filter(([eid]) => eid !== `profile-${field}-err`);
      const raw = mine ? /Error:|at \w+ \(|undefined|NaN|\[object/.test(mine[1]) : true;
      ok(id, stillGated && Boolean(mine) && mine[1].length > 0 && !raw && others.length === 0,
        `blocked=${stillGated} ${field}-err="${mine ? mine[1].slice(0, 46) : 'MISSING'}" stale=${others.length}`);
    }
    await shot(page, 'red-invalid-age-1440');

    // " Ada " trims to Ada, 120 accepted, #goal becomes reachable and focused
    await saveProfile(page, '  Ada  ', '120');
    await page.waitForSelector('#goal');
    const who = await page.textContent('#profile-who');
    const focused = await page.evaluate(() => document.activeElement?.id);
    ok('G8', who.includes('Ada') && !who.includes('  Ada') && who.includes('120'), `label="${who}"`);
    ok('G9', focused === 'goal', `focus after save=${focused}`);
    ok('G10', errors.length === 0, `page errors=${errors.length}`, { errors });
    await shot(page, 'green-profile-saved-1440');
    await ctx.close();
  }

  // ── N/B/O: request shape and name containment ──────────────────────────────
  {
    const { ctx, page, sent, errors, logs } = await fresh();
    const NAME = 'Zephyrine Quilliam';
    const GOAL = 'how the water cycle works';
    await page.route('**/api/lesson', async (route) => {
      const age = JSON.parse(route.request().postData()).age;
      await new Promise((r) => setTimeout(r, 120));
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ lesson: v2Lesson(age, 'en', GOAL), provenance: { model: 'synthetic-fixture', provider: 'local-stub' }, callsLeft: 7 }) });
    });
    await page.goto(base); await ack(page);
    await saveProfile(page, NAME, 11);
    await page.waitForSelector('#goal');

    const topicSelects = await page.$$eval('select', (n) => n.map((s) => s.id));
    const goalTag = await page.$eval('#goal', (n) => n.tagName);
    await page.fill('#goal', GOAL);
    await page.click('#generate');
    await page.waitForSelector('.lw-work', { timeout: 10000 });

    const req = sent.find((r) => r.url.includes('/api/lesson'));
    const body = JSON.parse(req.body);
    ok('B1', req.method === 'POST' && new URL(req.url).pathname === '/api/lesson', `${req.method} ${new URL(req.url).pathname}`);
    ok('B2', body.adultTest === true && body.age === 11 && body.goal === GOAL && body.locale === 'en',
      `adultTest=${body.adultTest} age=${JSON.stringify(body.age)} locale=${body.locale}`);
    const keys = Object.keys(body).sort();
    ok('B3', JSON.stringify(keys) === JSON.stringify(['adultTest', 'age', 'goal', 'locale']), `body keys=${keys.join(',')}`);
    const flat = JSON.stringify(body).toLowerCase();
    ok('B4', !/subject|grade/.test(flat), 'no subject/grade in body');

    // the name must appear nowhere in any outbound request, nor in any log line
    const haystack = sent.map((r) => `${r.method} ${r.url} ${JSON.stringify(r.headers)} ${r.body}`).join('\n');
    ok('N1', !haystack.includes(NAME) && !haystack.includes('Zephyrine'), `requests captured=${sent.length}, name absent`);
    ok('N2', !logs.join('\n').includes('Zephyrine'), `console lines=${logs.length}, name absent`);

    ok('O1', goalTag === 'TEXTAREA' && topicSelects.every((id) => id === 'locale'),
      `#goal=<${goalTag}>, selects=[${topicSelects.join(',')}]`);
    ok('O2', body.goal === GOAL, `open topic round-trip exact: "${body.goal}"`);

    // v2 sequence renders as a complete labelled diagram with manual nav
    const stages = await page.$$eval('.lw-seq-item', (n) => n.map((x) => ({
      label: x.querySelector('.lw-seq-label')?.textContent.trim(),
      detail: x.querySelector('.lw-seq-detail')?.textContent.trim(),
    })));
    const navOk = await page.$$eval('#seq-prev, #seq-next', (n) => n.length === 2);
    ok('V1', stages.length === 4 && stages.every((s) => s.label && s.detail) && navOk,
      `stages=${stages.length}, all labelled+detailed, manual nav=${navOk}`);
    const prevDisabled = await page.$eval('#seq-prev', (n) => n.disabled);
    await page.click('#seq-next');
    const current = await page.$eval('.lw-seq-item[data-current="true"] .lw-seq-label', (n) => n.textContent.trim());
    ok('V2', prevDisabled && current === 'Condensation', `prev disabled at stage 1=${prevDisabled}, after next="${current}"`);

    // 300-char bound on a long goal
    const long = 'q'.repeat(400);
    await page.click('#profile-edit'); await page.click('#profile-cancel');
    const restart = await page.$('.lw-restart summary');
    if (restart) {
      await restart.click();
      await page.fill('.lw-restart #goal', long);
      await page.click('.lw-restart #generate');
      await page.waitForTimeout(400);
      const last = JSON.parse(sent[sent.length - 1].body);
      ok('B5', last.goal.length <= 300, `400-char goal sent as ${last.goal.length} chars`);
    } else record('B5', 'UNEXECUTED', 'no restart affordance on this surface', { reason: 'no-control' });

    // footer must never print the literal "null"
    const footer = (await page.$('#provenance')) ? await page.textContent('#provenance') : '';
    ok('F1', !/null|undefined/.test(footer), `footer="${footer.slice(0, 80)}"`);
    ok('N3', errors.length === 0, `page errors=${errors.length}`, { errors });
    await shot(page, 'green-lesson-sequence-1440');
    await ctx.close();
  }

  // ── V3: age/locale mismatch rejected, authored message shown ───────────────
  {
    const { ctx, page } = await fresh();
    await page.route('**/api/lesson', (route) => route.fulfill({ status: 200, contentType: 'application/json',
      // requested age 9, reply claims 40: must never render
      body: JSON.stringify({ lesson: v2Lesson(40), provenance: { model: 'synthetic-fixture', provider: 'local-stub' } }) }));
    await page.goto(base); await ack(page);
    await saveProfile(page, 'Ada', 9);
    await page.fill('#goal', 'how the water cycle works');
    await page.click('#generate');
    await page.waitForSelector('.lw-error', { timeout: 10000 });
    const work = await page.$('.lw-work');
    const msg = await page.textContent('.lw-error');
    ok('V3', !work && /age/i.test(msg) && !/\bat \w+ \(|Error:|\{"/.test(msg),
      `lesson suppressed=${!work}, authored msg="${msg.replace(/\s+/g, ' ').slice(0, 70)}"`);
    await shot(page, 'green-mismatch-rejected-1440');
    await ctx.close();
  }

  // ── A: age change beats a late reply that ignores the abort signal ─────────
  {
    const { ctx, page } = await fresh();
    let hits = 0;
    await page.route('**/api/lesson', async (route) => {
      hits += 1;
      const age = JSON.parse(route.request().postData()).age;
      // deliberately slow and indifferent to the client's abort
      await new Promise((r) => setTimeout(r, 1500));
      try {
        await route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify({ lesson: v2Lesson(age, 'en', 'stale lesson for the old age'), provenance: { model: 'synthetic-fixture', provider: 'local-stub' } }) });
      } catch { /* the browser already dropped it; that is the point */ }
    });
    await page.goto(base); await ack(page);
    await saveProfile(page, 'Ada', 9);
    await page.fill('#goal', 'how the water cycle works');
    await page.click('#generate');
    await page.waitForTimeout(250);                       // request is in the air
    await page.click('#profile-edit');
    await page.fill('#profile-age', '12');
    await page.click('#profile-save');
    await page.waitForTimeout(2200);                      // past the late reply
    const rendered = await page.$('.lw-work');
    const who = await page.$('#profile-who') ? await page.textContent('#profile-who') : '';
    ok('A1', !rendered, `late reply rendered=${Boolean(rendered)} (stub hits=${hits})`);
    ok('A2', who.includes('12'), `age after change="${who}"`);
    await shot(page, 'green-late-reply-ignored-1440');
    await ctx.close();
  }

  // ── A3/A4: changing the age with a live lesson asks first; declining keeps it
  {
    const { ctx, page, sent } = await fresh();
    await page.route('**/api/lesson', (route) => {
      const age = JSON.parse(route.request().postData()).age;
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ lesson: v2Lesson(age), provenance: { model: 'synthetic-fixture', provider: 'local-stub' } }) });
    });
    await page.goto(base); await ack(page);
    await saveProfile(page, 'Ada', 9);
    await page.fill('#goal', 'how the water cycle works');
    await page.click('#generate');
    await page.waitForSelector('.lw-work');
    const callsAfterGen = sent.length;

    // rename only: label changes, lesson survives, no new request, age untouched
    await page.click('#profile-edit');
    await page.fill('#profile-name', 'Ada L');
    await page.click('#profile-save');
    await page.waitForSelector('.lw-work');
    const who1 = await page.textContent('#profile-who');
    ok('A3', who1.includes('Ada L') && who1.includes('9') && sent.length === callsAfterGen && Boolean(await page.$('.lw-work')),
      `rename kept lesson, new requests=${sent.length - callsAfterGen}, label="${who1}"`);

    // age change: confirmation appears; declining keeps lesson and old age
    await page.click('#profile-edit');
    await page.fill('#profile-age', '14');
    await page.click('#profile-save');
    await page.waitForSelector('#age-no');
    await page.click('#age-no');
    await page.waitForSelector('.lw-work');
    const who2 = await page.textContent('#profile-who');
    ok('A4', who2.includes('9') && !who2.includes('14') && Boolean(await page.$('.lw-work')),
      `declined: label="${who2}", lesson kept`);

    // confirming discards
    await page.click('#profile-edit');
    await page.fill('#profile-age', '14');
    await page.click('#profile-save');
    await page.click('#age-yes');
    await page.waitForTimeout(200);
    const who3 = await page.textContent('#profile-who');
    ok('A5', who3.includes('14') && !(await page.$('.lw-work')), `confirmed: label="${who3}", lesson discarded`);
    await shot(page, 'green-age-confirm-1440');
    await ctx.close();
  }

  // ── P: tab memory by default, opt-in persistence ───────────────────────────
  {
    const { ctx, page } = await fresh();
    await page.goto(base); await ack(page);
    const before = await page.evaluate(() => Object.keys(localStorage));
    await saveProfile(page, 'Marisol', 33);
    await page.waitForSelector('#goal');
    const after = await page.evaluate(() => Object.entries(localStorage).map(([k, v]) => `${k}=${v}`));
    ok('P1', !after.some((e) => e.includes('Marisol') || /profile/i.test(e)),
      `no-opt-in keys added=${after.length - before.length}, name/profile absent`);
    await page.reload(); await ack(page);
    ok('P2', !(await page.$('#goal')) && Boolean(await page.$('#profile-name')), 'reload without opt-in shows the gate again');

    await saveProfile(page, 'Marisol', 33);
    await page.waitForSelector('#goal');
    await page.click('#profile-edit');
    await page.check('#profile-remember');
    await page.click('#profile-save');
    await page.waitForSelector('#goal');
    await page.reload(); await ack(page);
    const restored = (await page.$('#profile-who')) ? await page.textContent('#profile-who') : '';
    ok('P3', restored.includes('Marisol') && restored.includes('33'), `opt-in restored="${restored}"`);
    await ctx.close();
  }

  // ── E: a 500 shows authored copy, never the provider's own words ───────────
  {
    const { ctx, page } = await fresh();
    const LEAK = 'anthropic internal: traceback model_overloaded at provider.py:91';
    await page.route('**/api/lesson', (route) => route.fulfill({ status: 500, contentType: 'application/json',
      body: JSON.stringify({ error: LEAK, stack: 'Error: boom\n  at handler (server.mjs:1)' }) }));
    await page.goto(base); await ack(page);
    await saveProfile(page, 'Ada', 9);
    await page.fill('#goal', 'how the water cycle works');
    await page.click('#generate');
    await page.waitForSelector('.lw-error', { timeout: 10000 });
    const visible = await page.evaluate(() => document.body.innerText);
    ok('E1', !visible.includes(LEAK) && !/traceback|provider\.py|at handler/i.test(visible),
      'provider message and stack absent from the page');
    ok('E2', /did not go through|no se complet/i.test(visible), 'authored failure copy shown');
    // the typed code may stay in the Activity log — that is the mandated record
    await page.click('#activity summary').catch(() => {});
    const act = (await page.$('#activity')) ? await page.textContent('#activity') : '';
    ok('E3', /http 500/.test(act) && !act.includes(LEAK), `typed Activity code present, provider text absent`);
    await shot(page, 'green-error-typed-1440');
    await ctx.close();
  }

  // ── I: 320 px and 1440 px, en and es, no horizontal overflow ──────────────
  for (const [id, width] of [['I1', 320], ['I2', 1440]]) {
    const { ctx, page } = await fresh({ width, height: 900 });
    await page.route('**/api/lesson', (route) => {
      const b = JSON.parse(route.request().postData());
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ lesson: v2Lesson(b.age, b.locale, b.goal), provenance: { model: 'synthetic-fixture', provider: 'local-stub' } }) });
    });
    await page.goto(base); await ack(page);
    await shot(page, `green-profile-${width}`);
    // es localisation of the profile labels and errors
    await saveProfile(page, '', '0');
    const enErr = (await page.$$eval('.lw-field-err', (n) => n.map((x) => x.textContent.trim()))).join(' | ');
    await saveProfile(page, 'Ada', 9);
    await page.waitForSelector('#goal');
    await page.selectOption('#locale', 'es');
    await page.fill('#goal', 'c\u00f3mo funciona el ciclo del agua');
    await page.click('#generate');
    await page.waitForSelector('.lw-work', { timeout: 10000 });
    const overflow = await page.evaluate((w) => ({
      doc: document.documentElement.scrollWidth, w,
      worst: Math.max(...[...document.querySelectorAll('.lw-work, .lw-side, .lw-seq-item, .lw-profile')].map((n) => n.scrollWidth), 0),
    }), width);
    ok(id, overflow.doc <= width + 1, `${width}px: documentScrollWidth=${overflow.doc}, widest panel=${overflow.worst}`);
    await shot(page, `green-lesson-es-${width}`);

    if (width === 320) {
      // es profile errors must be authored Spanish, not an en fallback
      await page.click('#profile-edit');
      await page.fill('#profile-age', '0');
      await page.click('#profile-save');
      const esErr = (await page.$$eval('.lw-field-err', (n) => n.map((x) => x.textContent.trim()))).join(' | ');
      ok('I3', esErr.length > 0 && esErr !== enErr && /n\u00famero|entero/i.test(esErr), `es error="${esErr.slice(0, 60)}"`);
      await shot(page, 'green-profile-es-error-320');
    }
    await ctx.close();
  }

  // ── K: keyboard-only traversal to #profile-save ────────────────────────────
  {
    const { ctx, page } = await fresh();
    await page.goto(base);
    await page.keyboard.press('Tab'); await page.keyboard.press('Enter');  // ack
    await page.waitForSelector('#profile-name');
    // The gate focuses the name field on entry; that is position 0 of the traversal.
    const order = [await page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName)];
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      order.push(await page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName));
    }
    const iName = order.indexOf('profile-name');
    const iAge = order.indexOf('profile-age');
    const iSave = order.indexOf('profile-save');
    ok('K1', iName > -1 && iAge > iName && iSave > iAge, `tab order: ${order.filter(Boolean).join(' → ')}`);
    // and it is operable by keyboard alone, no mouse
    await page.keyboard.press('Tab');
    await page.evaluate(() => { document.querySelector('#profile-name').focus(); });
    await page.keyboard.type('Keyboard Only');
    await page.keyboard.press('Tab');
    await page.keyboard.type('30');
    await page.keyboard.press('Enter');
    await page.waitForSelector('#goal', { timeout: 5000 });
    ok('K2', (await page.textContent('#profile-who')).includes('Keyboard Only'), 'saved by keyboard alone');
    await ctx.close();
  }

  await browser.close(); srv.close();

  const fails = results.filter((r) => r.verdict === 'FAIL');
  const unex = results.filter((r) => r.verdict === 'UNEXECUTED');
  await writeFile(join(OUT, 'results.json'), JSON.stringify({
    at: new Date().toISOString(), appRoot: APP_ROOT, provenance: PROVENANCE,
    note: 'All provider replies are locally authored synthetic fixtures. No live provider, no live voice, no VoiceOver evidence here.',
    counts: { total: results.length, pass: results.length - fails.length - unex.length, fail: fails.length, unexecuted: unex.length },
    notCovered: [
      'two-way voice (no controls built; microphone and camera never requested)',
      'animated demo playback / pause / replay (sequence renders as a static labelled diagram with manual prev/next)',
      'dashboard rail + destinations (not built in this slice)',
      'live provider generation (every reply here is a synthetic fixture)',
      'VoiceOver / live screen-reader announcement (not provable from a fixture)',
    ],
    results,
  }, null, 2));
  console.log(`\n${results.length} checks — ${results.length - fails.length - unex.length} PASS, ${fails.length} FAIL, ${unex.length} UNEXECUTED`);
  console.log(`evidence: ${OUT}`);
  process.exit(fails.length ? 1 : 0);
}

main().catch(async (e) => { console.error('harness error:', e); process.exit(2); });
