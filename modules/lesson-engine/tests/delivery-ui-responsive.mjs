// delivery-ui-responsive.mjs — rendering evidence for the repaired lifecycle.
// NEW FILE. Captures 320/390/1440 in EN and ES across the real screens and
// records every console message, page error, horizontal overflow and the
// computed size of each interactive control.
//
// Synthetic fixtures only. No provider call, no microphone, no camera, no sound.
//
//   UI_APP_ROOT       app directory to serve (default ../)
//   UI_EVIDENCE_DIR   where screenshots + render.json land

import { chromium } from '/Users/man/education-product-discovery/devtools/browser/node_modules/playwright/index.mjs';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = resolve(process.env.UI_APP_ROOT || join(HERE, '..'));
const OUT = resolve(process.env.UI_EVIDENCE_DIR || join(APP_ROOT, 'evidence', 'delivery-ui-responsive-local'));
const CHROME = '/Users/man/.agent-browser/browsers/chrome-153.0.8010.52/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const lesson = (age, locale, goal) => ({
  version: 2, id: 'syn-1',
  title: locale === 'es' ? 'El ciclo del agua' : 'The water cycle',
  goal, subject: locale === 'es' ? 'ciencias de la tierra' : 'earth science', age, locale,
  intro: locale === 'es' ? 'Un recorrido corto por el ciclo, etapa por etapa.' : 'A short walk through the cycle, stage by stage.',
  steps: [
    { id: 's1', kind: 'numeric',
      prompt: locale === 'es' ? '\u00bfCu\u00e1ntas etapas se muestran en el diagrama?' : 'How many stages are shown in the diagram?',
      explanation: locale === 'es' ? 'Cuente las etapas con etiqueta.' : 'Count the labelled stages.',
      hint: locale === 'es' ? 'Cuente las filas numeradas.' : 'Count the numbered rows.', answer: '4',
      visual: { kind: 'sequence', caption: locale === 'es' ? 'Cuatro etapas del ciclo del agua' : 'Four stages of the water cycle',
        stages: [
          { label: locale === 'es' ? 'Evaporaci\u00f3n' : 'Evaporation', detail: locale === 'es' ? 'El sol calienta el agua y sube como vapor.' : 'The sun heats water and it rises as vapour.' },
          { label: locale === 'es' ? 'Condensaci\u00f3n' : 'Condensation', detail: locale === 'es' ? 'El vapor se enfr\u00eda y forma gotas de nube.' : 'Vapour cools high up and forms cloud droplets.' },
          { label: locale === 'es' ? 'Precipitaci\u00f3n' : 'Precipitation', detail: locale === 'es' ? 'Las gotas se juntan, pesan y caen como lluvia.' : 'Droplets join, grow heavy and fall as rain.' },
          { label: locale === 'es' ? 'Recolecci\u00f3n' : 'Collection', detail: locale === 'es' ? 'El agua se re\u00fane en r\u00edos, lagos y el suelo.' : 'Water gathers in rivers, lakes and the ground.' },
        ] } },
    { id: 's2', kind: 'choice',
      prompt: locale === 'es' ? '\u00bfQu\u00e9 etapa forma las nubes?' : 'Which stage forms the clouds?',
      explanation: locale === 'es' ? 'El vapor que se enfr\u00eda se condensa.' : 'Cooling vapour condenses into droplets.',
      hint: locale === 'es' ? 'Piense en el enfriamiento.' : 'Think about cooling.',
      choices: locale === 'es' ? ['Evaporaci\u00f3n', 'Condensaci\u00f3n', 'Recolecci\u00f3n'] : ['Evaporation', 'Condensation', 'Collection'],
      answer: locale === 'es' ? 'Condensaci\u00f3n' : 'Condensation',
      visual: { kind: 'tokens', count: 4, caption: locale === 'es' ? 'Cuatro fichas, una por etapa' : 'Four counters, one per stage' } },
    { id: 's3', kind: 'numeric',
      prompt: locale === 'es' ? 'Si dos de las cuatro etapas ocurren en el cielo, \u00bfcu\u00e1ntas no?' : 'If two of the four stages happen in the sky, how many do not?',
      explanation: locale === 'es' ? 'Cuatro menos dos.' : 'Four minus two.',
      hint: locale === 'es' ? 'Reste.' : 'Subtract.', answer: '2',
      visual: { kind: 'fraction', parts: 4, filled: 2, caption: locale === 'es' ? 'Dos de cuatro partes' : 'Two of four parts' } },
  ],
  path: {
    reinforce: { goal: locale === 'es' ? 'Practicar los nombres de las etapas' : 'Practise naming the stages',
      reason: locale === 'es' ? 'Nombrar viene antes de explicar.' : 'Naming comes before explaining.' },
    advance: { goal: locale === 'es' ? 'Explicar por qu\u00e9 llueve' : 'Explain why rain falls',
      reason: locale === 'es' ? 'La idea siguiente se apoya en el ciclo.' : 'The next idea builds on the cycle.' },
  },
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

const VIEWPORTS = [[320, 760], [390, 844], [1440, 1000]];
const rows = [];

async function main() {
  await mkdir(OUT, { recursive: true });
  const { srv, base } = await staticServer();
  let browser;
  try {
    browser = await chromium.launch({ executablePath: CHROME });
    for (const locale of ['en', 'es']) {
      for (const [w, h] of VIEWPORTS) {
        const ctx = await browser.newContext({ viewport: { width: w, height: h } });
        const page = await ctx.newPage();
        const console_ = [];
        page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console_.push(`${m.type()}: ${m.text()}`); });
        page.on('pageerror', (e) => console_.push(`pageerror: ${e.message}`));
        page.route('**/api/lesson', (route) => {
          const b = JSON.parse(route.request().postData() || '{}');
          route.fulfill({ status: 200, contentType: 'application/json',
            body: JSON.stringify({ lesson: lesson(b.age, b.locale, b.goal), callsLeft: 7 }) });
        });

        const probe = () => page.evaluate(() => {
          const root = document.getElementById('app');
          const de = document.documentElement;
          const small = [];
          for (const c of root.querySelectorAll('button, input, select, textarea, summary, a[href]')) {
            const r = c.getBoundingClientRect();
            if (r.width === 0 && r.height === 0) continue;          // not displayed
            if (r.height < 44 || r.width < 44) small.push(`${c.tagName.toLowerCase()}#${c.id || c.className}: ${Math.round(r.width)}x${Math.round(r.height)}`);
          }
          const wide = [];
          for (const n of root.querySelectorAll('*')) {
            if (n.getBoundingClientRect().right > de.clientWidth + 1) wide.push(n.tagName.toLowerCase() + '.' + (n.className || ''));
          }
          const strayNull = [];
          (function walk(n) {
            for (const c of n.childNodes) {
              if (c.nodeType === 3) { if (c.textContent.trim() === 'null') strayNull.push(c.parentNode.className || 'root'); }
              else if (c.nodeType === 1) walk(c);
            }
          })(root);
          return {
            state: root.dataset.state,
            docOverflowPx: de.scrollWidth - de.clientWidth,
            controlsUnder44: small,
            overflowingNodes: wide.slice(0, 6),
            strayNull,
            lang: root.getAttribute('lang'),
          };
        });

        const stage = async (name) => {
          const p = await probe();
          await page.screenshot({ path: join(OUT, `${locale}-${w}-${name}.png`), fullPage: true });
          rows.push({ locale, viewport: `${w}x${h}`, screen: name, ...p, console: [...console_] });
          console.log(`${locale} ${String(w).padStart(4)} ${name.padEnd(10)} state=${p.state} overflow=${p.docOverflowPx}px under44=${p.controlsUnder44.length} null=${p.strayNull.length} console=${console_.length}`);
        };

        await page.goto(base);
        await page.waitForSelector('#ack');
        await stage('gate');
        await page.click('#ack');
        await page.waitForSelector('#profile-name');
        await stage('profile');
        await page.fill('#profile-name', locale === 'es' ? 'Ada' : 'Ada');
        await page.fill('#profile-age', '9');
        await page.click('#profile-save');
        await page.waitForSelector('#goal');
        if (locale === 'es') { await page.selectOption('#locale', 'es'); await page.waitForTimeout(80); }
        await stage('setup');
        await page.fill('#goal', locale === 'es' ? 'c\u00f3mo funciona el ciclo del agua' : 'how the water cycle works');
        await page.click('#generate');
        await page.waitForSelector('#work');
        await stage('work');
        await page.fill('#typed', '4');
        await page.click('#check');
        await page.waitForTimeout(300);
        await stage('checked');
        await page.click('#clear');
        await page.waitForSelector('#cf-yes');
        await stage('confirm');
        await page.click('#cf-no');
        await page.waitForTimeout(150);
        await ctx.close();
      }
    }
  } finally {
    if (browser) await browser.close();
    srv.close();
  }
  const consoleIssues = rows.filter((r) => r.console.length);
  const overflow = rows.filter((r) => r.docOverflowPx > 0);
  const under44 = rows.filter((r) => r.controlsUnder44.length);
  const nulls = rows.filter((r) => r.strayNull.length);
  await writeFile(join(OUT, 'render.json'), JSON.stringify({
    suite: 'delivery-ui-responsive', appRoot: APP_ROOT, at: new Date().toISOString(),
    provenance: 'synthetic-fixture',
    note: 'Synthetic fixtures only. No provider call, microphone, camera or sound.',
    viewports: VIEWPORTS.map(([w, h]) => `${w}x${h}`), locales: ['en', 'es'],
    summary: { captures: rows.length, withConsoleIssues: consoleIssues.length,
      withHorizontalOverflow: overflow.length, withControlsUnder44: under44.length,
      withLiteralNull: nulls.length },
    rows,
  }, null, 2));
  console.log(`\n${rows.length} captures — console issues ${consoleIssues.length}, overflow ${overflow.length}, under-44 ${under44.length}, literal-null ${nulls.length}`);
  console.log(OUT);
  process.exitCode = (consoleIssues.length || overflow.length || nulls.length) ? 1 : 0;
}

main().catch((e) => { console.error(e); process.exitCode = 2; });
