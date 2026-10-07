/* Worker-owned spec-repair regressions. Real DOM controls (pointer events, form submit
 * buttons) over CDP against an isolated headless local Chrome: --remote-debugging-port=0,
 * throwaway profile under TMPDIR, removed on exit. No packages, no network. Run:
 *   node tests/repair.e2e.cjs
 * Writes evidence/parent-spec/repair-report.json and repair-*.png screenshots.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'evidence', 'parent-spec');
const CHROME = process.env.CHROME || path.join(os.homedir(), '.agent-browser/browsers/chrome-153.0.8010.52/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const report = { checks: [], exceptions: [], externalRequests: [], screenshots: [], started: new Date().toISOString() };
const MATCH = /That matches\.|Coincide\./, NOMATCH = /Not yet\.|Todavía no\./, AMBIG = /more than one number|más de un número/, UNPARSED = /I can only check|Solo puedo revisar/;

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  if (!fs.existsSync(CHROME)) throw new Error('Missing local Chrome; set CHROME explicitly');
  const profile = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'edu-repair-spec-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' });
  const exited = new Promise((resolve) => chrome.once('exit', resolve));
  let ws;
  try {
    let port;
    for (let i = 0; i < 60; i++) {
      if (chrome.exitCode !== null) throw new Error('Owned Chrome exited before readiness');
      try { port = Number(fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]); } catch {}
      if (port) break;
      await delay(100);
    }
    if (!port) throw new Error('No owned Chrome DevToolsActivePort after 6 seconds');
    const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    const target = targets.find((t) => t.type === 'page');
    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    let seq = 0; const pending = new Map();
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) { const { resolve, reject, timer } = pending.get(m.id); clearTimeout(timer); pending.delete(m.id); if (m.error) reject(new Error(JSON.stringify(m.error))); else resolve(m.result); }
      if (m.method === 'Runtime.exceptionThrown') report.exceptions.push(m.params.exceptionDetails);
      if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') report.exceptions.push(m.params.entry);
      if (m.method === 'Network.requestWillBeSent' && /^https?:/.test(m.params.request.url)) report.externalRequests.push(m.params.request.url);
    };
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++seq; const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 10000);
      pending.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async (expression) => {
      const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
      return r.result.value;
    };
    const click = async (selector) => {
      const p = await evaluate(`(() => { const el=document.querySelector(${JSON.stringify(selector)}); if(!el || el.disabled) throw Error('Missing/disabled control: '+${JSON.stringify(selector)}); el.scrollIntoView({block:'center'}); const r=el.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...p });
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...p });
      await delay(220);
    };
    const fill = async (selector, text) => evaluate(`(() => { const el=document.querySelector(${JSON.stringify(selector)}); if(!el) throw Error('Missing input '+${JSON.stringify(selector)}); el.value=${JSON.stringify(text)}; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    const submit = async (name) => click(`form[data-form="${name}"] button[type="submit"]`);
    const choose = (act, arg) => click(`[data-act="${act}"][data-arg="${arg}"]`);
    const action = (act) => click(`[data-act="${act}"]`);
    const check = (name, pass, detail) => { report.checks.push({ name, passed: !!pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`); };
    const shot = async (name) => {
      await delay(300);
      const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      const file = path.join(OUT, name + '.png'); fs.writeFileSync(file, Buffer.from(r.data, 'base64')); report.screenshots.push(file);
    };
    const reset = async (band = '35', concept = 'A', locale = 'en') => {
      await choose('lang', locale); await choose('band', band); await choose('concept', concept); await choose('role', 'student'); await action('reset');
    };
    const lastReply = () => evaluate('window.__companionDebug.ui.turns.at(-1).text');
    const board = async (text) => { await fill('#board-input', text); await submit('board'); return lastReply(); };
    const typed = async (text) => { await fill('#typed-input', text); await submit('typed'); return lastReply(); };
    const mainText = () => evaluate("document.getElementById('main').innerText");

    await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable'); await send('Network.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await send('Page.navigate', { url: pathToFileURL(path.join(ROOT, 'index.html')).href });
    for (let i = 0; i < 60; i++) { if (await evaluate('!!window.__companionDebug')) break; await delay(100); }

    // 1. Final-answer forms through the real board/typed controls, both locales.
    await reset('35', 'A', 'en');
    check('negative number is not the answer', NOMATCH.test(await board('-225')));
    check('two candidate answers are reported as ambiguous, not matched', AMBIG.test(await board('225 or 235')));
    let r = await board('13 − 8 = 5');
    check('intermediate step is labelled uncheckable, not wrong', UNPARSED.test(r) && !NOMATCH.test(r) && !MATCH.test(r), r);
    check('negated text is not a match', !MATCH.test(await board('not 225')));
    check('full equation form matches', MATCH.test(await board('403 − 178 = 225')));
    check('a different left side is not accepted as the final answer', !MATCH.test(await board('400 − 178 = 225')));
    await reset('68', 'A', 'es');
    check('ES 6–8: x = 6 matches', MATCH.test(await board('x = 6')));
    check('ES 6–8: x = 7 is wrong', NOMATCH.test(await board('x = 7')));
    check('ES 6–8: 6 = x matches', MATCH.test(await board('6 = x')));
    check('ES 6–8: y = 6 is not checkable', UNPARSED.test(await board('y = 6')));
    r = await typed('6, 7');
    check('ES typed path: ambiguous reply is in Spanish', /más de un número/.test(r), r);
    await reset('K2', 'A', 'es');
    check('ES K–2: 7 + 5 = 12 matches', MATCH.test(await board('7 + 5 = 12')));
    check('ES K–2: 112 is wrong', /Todavía no\./.test(await board('112')));

    // 2. K–2 visual accounts for every unit; scaffolding is attributed and does not hand over the answer.
    await reset('K2', 'A', 'en');
    const vis = await evaluate(`(() => { const f=document.querySelector('.board [role="img"]'); return { a: document.querySelectorAll('.board [data-fill="a"]').length, b: document.querySelectorAll('.board [data-fill="b"]').length, frames: document.querySelectorAll('.board .tenframe').length, label: f ? f.getAttribute('aria-label') : '', scaffold: (document.querySelector('.notice.info')||{}).textContent || '' }; })()`);
    check('K–2 ten frames show 7 + 5 across two frames', vis.a === 7 && vis.b === 5 && vis.frames === 2, vis);
    check('K–2 visual has an accurate accessible description', /\b7\b/.test(vis.label) && /\b5\b/.test(vis.label) && /2 more/.test(vis.label), vis.label);
    check('K–2 grown-up scaffold is attributed and does not give the answer', /grown-up/i.test(vis.scaffold) && !/twelve|\b12\b/.test(vis.scaffold), vis.scaffold);
    await action('start'); await action('hint'); await action('hint');
    const hintSteps = await evaluate(`[...document.querySelectorAll('.board .step[data-from="hint"]')].map(e=>e.textContent)`);
    check('K–2 hints stay hints (no answer reveal)', hintSteps.length === 2 && hintSteps.every((h) => !/twelve|\b12\b/.test(h)), hintSteps);
    await shot('repair-k2-visual-desktop');

    // 3. Literacy script follows the selected task; full play; locale switch keeps evidence.
    await reset('35', 'B', 'en'); await click('[data-act="select"][data-arg="35-read-summary"]');
    let plays = 0;
    while (plays < 8 && await evaluate(`(() => { const p=document.querySelector('[data-act="play"]'); return !!p && !p.disabled; })()`)) { await action('play'); plays++; }
    let turns = await evaluate('JSON.parse(JSON.stringify(window.__companionDebug.ui.turns))');
    check('literacy script plays to the end (several labelled turns)', plays >= 4 && turns.length === plays && turns.every((t) => t.scripted), { plays, n: turns.length });
    check('literacy script never mentions the math task', turns.every((t) => !/403|178|minus|regroup/i.test(t.text)), turns.map((t) => t.text));
    const litBoard = await evaluate(`[...document.querySelectorAll('.board .step')].map(e=>e.textContent)`);
    check('literacy script writes literacy steps on the literacy board', litBoard.length > 0 && litBoard.every((x) => !/403|13 − 8/.test(x)), litBoard);
    await typed('MY_OWN_UNIQUE_NOTE');
    await choose('lang', 'es');
    turns = await evaluate('JSON.parse(JSON.stringify(window.__companionDebug.ui.turns))');
    check('locale switch keeps the student’s own note verbatim', turns.some((t) => t.who === 'student' && t.text === 'MY_OWN_UNIQUE_NOTE'), turns.map((t) => t.text));
    const scripted = turns.filter((t) => t.scripted).map((t) => t.text);
    check('locale switch re-renders scripted turns in Spanish', scripted.length === plays && scripted.every((t) => !/^Hi |^Good start|^Two sentences/.test(t)) && /Hola/.test(scripted[0]), scripted);
    await choose('role', 'parent');
    const replay = await mainText();
    check('parent replay shows the literacy board and the student’s own note', /MY_OWN_UNIQUE_NOTE/.test(replay) && /Rosa/.test(replay), replay.slice(0, 300));
    await choose('role', 'student'); await click('[data-act="select"][data-arg="35-math-regroup"]');
    const mathBoard = await evaluate(`document.querySelectorAll('.board .step').length`);
    check('switching back to math shows an uncontaminated math board', mathBoard === 0, mathBoard);

    // 4. Organized-only task: no instructional demo, organization workflow intact.
    await reset('35', 'A', 'en'); await click('[data-act="select"][data-arg="35-science-habitat"]');
    const org = await evaluate(`(() => ({ play: (document.querySelector('[data-act="play"]')||{}).disabled, notice: (document.querySelector('.b-companion .notice')||{}).textContent || '', typed: !!document.querySelector('#typed-input'), start: !!document.querySelector('[data-act="start"]') }))()`);
    check('organized-only task disables the scripted demo with a clear notice and keeps the typed path', org.play === true && /organized-only/i.test(org.notice) && org.typed && org.start, org);
    r = await typed('hint');
    check('organized-only task answers typed help without claiming instruction', /organized only/i.test(r), r);

    // 5. Corrected deadline → derived plan → both roles, both locales; decline leaves the plan unchanged.
    await reset('35', 'A', 'en'); await choose('role', 'parent'); await action('load-sample'); await fill('#due-input', '2026-10-09'); await submit('extract'); await action('draft-ask');
    const plan = await evaluate(`[...document.querySelectorAll('.b-draft .what')].map(e=>e.textContent)`);
    check('draft plan is derived from the corrected deadline (work Thu Oct 8, due Fri Oct 9)', plan.length === 3 && /Thu, Oct 8/.test(plan[1]) && /Fri, Oct 9/.test(plan[2]) && !/Thursday|Oct 1\b|Oct 2\b/.test(plan.join(' ')), plan);
    await action('draft-accept'); await choose('role', 'student');
    const stu = await evaluate(`(() => ({ due: window.__companionDebug.state.tasks.find(t=>t.id==='35-read-summary').due, text: document.getElementById('main').innerText }))()`);
    check('student sees the corrected shared deadline and the accepted plan', stu.due === '2026-10-09' && /Fri, Oct 9/.test(stu.text) && /Thu, Oct 8/.test(stu.text), stu.due);
    await choose('lang', 'es');
    const esText = await mainText();
    check('accepted plan renders in Spanish with the same derived dates', /jue/.test(esText) && /9 oct/.test(esText) && !/Tonight|Thu,/.test(esText), esText.slice(0, 400));
    await reset('35', 'C', 'en'); await choose('role', 'parent'); await action('load-sample'); await action('confirm-extract'); await action('draft-ask'); await fill('#decline-note', 'Not this week'); await submit('decline');
    const dec = await evaluate(`(() => { const s=window.__companionDebug.state; const t=s.tasks.find(t=>t.id==='35-read-summary'); return { cur: s.currentPlan, st: s.draftPlan.status, due: t.due, src: t.dueSource }; })()`);
    check('confirm-as-shown keeps the date with parent provenance; decline leaves no current plan', dec.cur === null && dec.st === 'declined_by_parent' && dec.due === '2026-10-02' && dec.src === 'parent_confirmed', dec);

    // 6. Parent parity: each concept exposes forms, child board with hint, hint flag, one ledger.
    for (const concept of ['A', 'B', 'C']) {
      await reset('35', concept, 'en'); await action('start'); await action('hint'); await choose('role', 'parent');
      const p = await evaluate(`(() => ({ observe: !!document.querySelector('form[data-form="observe"]'), sample: !!document.querySelector('[data-act="load-sample"]'), draft: !!document.querySelector('.b-draft'), board: !!document.querySelector('.board'), flag: /hint asked for in Math/.test(document.getElementById('main').innerText), hintOnBoard: !!document.querySelector('.board .step[data-from="hint"]'), ledgers: document.quermySelectorAll ? 0 : document.querySelectorAll('.ledger').length }))()`);
      check(`${concept} parent: observe, sample intake, draft, child board with hint, hint flag, one ledger`, p.observe && p.sample && p.draft && p.board && p.flag && p.hintOnBoard && p.ledgers === 1, p);
    }

    // 7. Honest copy.
    await reset('35', 'A', 'en');
    const cap0 = await evaluate(`document.querySelector('.companion .caption').textContent`);
    check('voice caption does not promise sound', !/hear/i.test(cap0) && /no sound/i.test(cap0), cap0);
    await click('[data-act="select"][data-arg="35-read-summary"]');
    r = await board('Rosa found the map.');
    check('literacy reply describes parent-visible demo behaviour only', !/teacher/i.test(r) && /parent/i.test(r), r);
    await choose('role', 'parent');
    const fh = await evaluate(`document.querySelector('.b-extract').innerText`);
    check('teacher-feedback intake is sample-only and says so', !/Paste or type|type a teacher note/i.test(fh) && /sample-only/i.test(fh) && /does not read a school account/i.test(fh), fh);
    await choose('lang', 'es');
    const fhEs = await evaluate(`document.querySelector('.b-extract').innerText`);
    check('ES teacher-feedback intake is sample-only', !/Pega o escribe/i.test(fhEs) && /muestra/i.test(fhEs), fhEs);
    await choose('role', 'student');
    r = await board('Rosa encontró el mapa.');
    check('ES literacy reply names the parent, not a teacher', !/maestro/i.test(r) && /familia/i.test(r), r);

    // 8. Phone: 44px targets and hit-testing after scroll, across concepts/bands/languages.
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    for (const [band, concept, lang] of [['35', 'A', 'en'], ['35', 'B', 'es'], ['35', 'C', 'en'], ['K2', 'B', 'en'], ['68', 'A', 'es']]) {
      await reset(band, concept, lang);
      const small = await evaluate(`[...document.querySelectorAll('button')].filter(e=>!e.disabled).map(e=>{const r=e.getBoundingClientRect();return {text:e.textContent.trim(),w:r.width,h:r.height};}).filter(r=>r.w>0 && (r.w<44||r.h<44))`);
      check(`${band}/${concept}/${lang} phone: every button is at least 44px in both dimensions`, small.length === 0, small);
      const reach = await evaluate(`(() => { const out={}; for (const sel of ['[data-act="start"]','#board-input','[data-act="play"]']) { const b=document.querySelector(sel); if(!b){out[sel]='missing';continue;} b.scrollIntoView({block:'center'}); const r=b.getBoundingClientRect(); const top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2); out[sel]=!!top && (b===top||b.contains(top)); } return out; })()`);
      check(`${band}/${concept}/${lang} phone: Start, board input and Play are hit-testable after scrolling`, Object.values(reach).every((v) => v === true), reach);
      if (band === '35' && concept === 'B') { await evaluate(`document.querySelector('[data-act="start"]').scrollIntoView({block:'center'})`); await shot('repair-workspace-mobile-scrolled-to-task'); }
      if (band === 'K2') { await evaluate(`document.querySelector('.board').scrollIntoView({block:'center'})`); await shot('repair-k2-mobile'); }
    }
    check('no runtime or CSP errors during repair flows', report.exceptions.length === 0, report.exceptions);
    check('no HTTP(S) requests from the prototype', report.externalRequests.length === 0, report.externalRequests);
  } finally {
    if (ws) ws.close();
    chrome.kill('SIGTERM');
    await Promise.race([exited, delay(2000)]);
    if (chrome.exitCode === null && chrome.signalCode === null) { chrome.kill('SIGKILL'); await exited; }
    fs.rmSync(profile, { recursive: true, force: true });
    report.finished = new Date().toISOString();
    report.summary = { passed: report.checks.filter((x) => x.passed).length, failed: report.checks.filter((x) => !x.passed).length, total: report.checks.length };
    fs.writeFileSync(path.join(OUT, 'repair-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report.summary));
    if (report.summary.failed) process.exitCode = 1;
  }
}
main().catch((err) => { console.error(err); process.exitCode = 2; });
