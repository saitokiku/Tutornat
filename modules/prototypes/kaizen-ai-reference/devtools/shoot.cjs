// Screenshots the local reference with the existing Playwright + Chrome for Testing.
const path = require('path');
const { chromium } = require('/Users/man/education-product-discovery/devtools/browser/node_modules/playwright');
const EXE = '/Users/man/.agent-browser/browsers/chrome-153.0.8010.52/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const INDEX = path.resolve(__dirname, '../index.html');
const OUT = '/Users/man/education-product-discovery/redesign/evidence/reference';
const SHOTS = [
  ['desktop-1440x1000', { width: 1440, height: 1000 }, 1, false],
  ['phone-390x844',     { width: 390,  height: 844 },  2, true],
];
(async () => {
  const browser = await chromium.launch({ executablePath: EXE, headless: true });
  const report = [];
  for (const [name, viewport, deviceScaleFactor, isMobile] of SHOTS) {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor, isMobile, hasTouch: isMobile });
    const page = await ctx.newPage();
    const errs = [];
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errs.push(m.type() + ': ' + m.text()); });
    page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
    await page.goto('file://' + INDEX);
    await page.waitForTimeout(900);
    const info = await page.evaluate(() => {
      const aside = document.querySelector('aside');
      const q = (s) => document.querySelector(s);
      return {
        title: document.title,
        fonts: 'no @font-face declared and no network: rendered with the snapshot fallback stacks (system-ui / ui-monospace), NOT Schibsted Grotesk / Instrument Sans / IBM Plex Mono',
        h1: q('h1') && q('h1').textContent,
        h2: q('h2') && q('h2').textContent,
        asideDisplay: aside && getComputedStyle(aside).display,
        asideWidth: aside && aside.getBoundingClientRect().width,
        bodyBg: getComputedStyle(document.body).backgroundColor,
        bodyFont: getComputedStyle(document.body).fontFamily.slice(0, 80),
        navLabels: [...document.querySelectorAll('nav button')].map((b) => b.textContent.trim()),
        primaryBtn: (() => { const b = [...document.querySelectorAll('button')].find((x) => /Start with the tutor/.test(x.textContent)); return b && { bg: getComputedStyle(b).backgroundColor, radius: getComputedStyle(b).borderRadius }; })(),
        rows: document.querySelectorAll('[aria-label="Mark complete"]').length,
      };
    });
    await page.screenshot({ path: path.join(OUT, name + '.png') });
    await page.screenshot({ path: path.join(OUT, name + '-fullpage.png'), fullPage: true });
    report.push({ name, viewport, deviceScaleFactor, info, errors: errs });
    await ctx.close();
  }
  await browser.close();
  require('fs').writeFileSync(path.join(OUT, 'capture-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 1));
})().catch((e) => { console.error(e); process.exit(1); });
