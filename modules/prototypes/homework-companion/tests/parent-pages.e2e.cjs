'use strict';
/* parent-pages.e2e.cjs — focused browser acceptance for FINAL repair cycle 2, parent pages (F2-03 locale-safe task editing,
 * F2-04 explicit per-field display provenance). Adapted from the repair-cycle-1 harness: real pointer clicks and Input.insertText
 * only; window.__demo is READ-ONLY inspection (no debug dispatch). Whole-run deadline 90 s; the report is always finalized.
 * Usage: [OUT=<new dir>] [APP_ROOT=<frontend dir>] node frontend/tests/parent-pages.e2e.cjs */
const fs = require('node:fs'); const path = require('node:path'); const os = require('node:os');
const { spawn } = require('node:child_process'); const { pathToFileURL } = require('node:url');
const CHROME = process.env.CHROME || '/Users/man/.agent-browser/browsers/chrome-153.0.8010.52/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const ROOT = process.env.APP_ROOT || path.resolve(__dirname, '..');
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');
const OUT = process.env.OUT || path.join(ROOT, '..', 'evidence', 'parent-pages', 'e2e-' + STAMP);
const RUN_DEADLINE_MS = Number(process.env.RUN_DEADLINE_MS || 90000);
const D = require(path.join(ROOT, 'domain.js')); const C = require(path.join(ROOT, 'copy.js'));
const EN = D.SAMPLES, ES = C.SAMPLE_ES; const HELP_ACT = "help";
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const report = { started: new Date().toISOString(), root: ROOT, checks: [], exceptions: [], consoleErrors: [], externalRequests: [], screenshots: [] };
const logLines = []; const log = (s) => { logLines.push(s); console.log(s); };
const t0 = Date.now(); const timeLeft = () => RUN_DEADLINE_MS - (Date.now() - t0);
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

async function main() {
  if (fs.existsSync(OUT)) throw Error('Refusing to overwrite evidence ' + OUT);
  fs.mkdirSync(OUT, { recursive: true });
  if (!fs.existsSync(CHROME)) throw new Error('Missing Chrome at ' + CHROME);
  const profile = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'edu-fe-pp-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' });
  let ws;
  try {
    let port; for (let i = 0; i < 80 && !port; i++) { try { port = Number(fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]); } catch {} if (!port) await delay(100); }
    if (!port) throw new Error('No DevToolsActivePort');
    const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    let seq = 0; const pending = new Map();
    ws.onmessage = (ev) => { const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) { const p = pending.get(m.id); clearTimeout(p.timer); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); }
      if (m.method === 'Runtime.exceptionThrown') report.exceptions.push(m.params.exceptionDetails);
      if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') report.consoleErrors.push(m.params.args.map((a) => a.value || a.description).join(' '));
      if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') report.consoleErrors.push(m.params.entry.text);
      if (m.method === 'Network.requestWillBeSent' && /^(https?|wss?):/.test(m.params.request.url)) report.externalRequests.push(m.params.request.url); };
    const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout ' + method)); }, 15000); pending.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params })); });
    const evaluate = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
    await send('Runtime.enable'); await send('Log.enable'); await send('Network.enable'); await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    const check = (name, pass, detail) => { report.checks.push({ name, passed: !!pass, detail: pass ? undefined : detail }); log(`${pass ? 'PASS' : 'FAIL'} ${name}${pass ? '' : ' ' + String(JSON.stringify(detail)).slice(0, 700)}`); };
    const q = (sel) => `document.querySelector(${JSON.stringify(sel)})`;
    const exists = (sel) => evaluate(`!!${q(sel)}`);
    const mainText = () => evaluate(`document.getElementById('main').innerText`);
    const inc = (hay, ...needles) => needles.every((n) => String(hay).includes(String(n)));
    const click = async (sel) => {
      const p = await evaluate(`(() => { const el=${q(sel)}; if(!el) throw Error('Missing control '+${JSON.stringify(sel)}); if (el.disabled || el.getAttribute('aria-disabled')==='true') throw Error('Disabled control '+${JSON.stringify(sel)}); el.scrollIntoView({block:'center'}); const r=el.getBoundingClientRect(); const hit=document.elementFromPoint(r.x+r.width/2, r.y+r.height/2); if(!hit || !(el===hit || el.contains(hit))) throw Error('Occluded control '+${JSON.stringify(sel)}+' hit='+(hit&&hit.tagName)+'.'+(hit&&hit.className)); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...p }); await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...p }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...p }); await delay(70);
    };
    const act = (a, arg) => click(arg !== undefined ? `[data-act="${a}"][data-arg="${arg}"]` : `[data-act="${a}"]`);
    const settle = async (ms = 250) => { await delay(ms); for (let i = 0; i < 40; i++) { const n = await evaluate('window.__demo.ui().pending.length'); if (!n) break; await delay(100); } };
    const type = async (sel, value) => { await click(sel); await evaluate(`(() => { const el=${q(sel)}; el.focus(); el.select && el.select(); return true; })()`); await send('Input.insertText', { text: value }); await delay(40); };
    const choose = async (sel, value) => { await click(sel); await evaluate(`(() => { const el=${q(sel)}; el.value=${JSON.stringify(value)}; el.dispatchEvent(new Event('change',{bubbles:true})); return el.value; })()`); await delay(60); };
    const shot = async (name) => { await delay(120); const r = await send('Page.captureScreenshot', { format: 'png' }); const f = path.join(OUT, name + '.png'); fs.writeFileSync(f, Buffer.from(r.data, 'base64')); report.screenshots.push(f); return f; };
    const state = () => evaluate('window.__demo.ui()');
    const val = (sel) => evaluate(`(${q(sel)}||{}).value`);
    const options = (sel) => evaluate(`[...document.querySelectorAll(${JSON.stringify(sel + ' option')})].map(o=>o.textContent)`);
    const task = (id) => evaluate(`JSON.parse(JSON.stringify(window.__demo.query.task(${JSON.stringify(id)})))`);
    const lastEdit = (id) => evaluate(`JSON.parse(JSON.stringify(window.__demo.query.store().events.filter(e=>e.taskId===${JSON.stringify(id)}&&e.source==='task_change'&&e.type==='edited').pop()||null))`);
    const session = (id) => evaluate(`JSON.parse(JSON.stringify(window.__demo.query.session(${JSON.stringify(id)})))`);
    const go = async (route) => { await act('nav', route); await delay(120); };
    const url = pathToFileURL(path.join(ROOT, 'index.html')).href + '#/today';
    const fresh = async () => { await send('Page.navigate', { url: 'about:blank' }); await delay(60); await send('Page.navigate', { url }); await delay(350); };
    const caseRun = async (name, fn) => { if (timeLeft() < 8000) { check(name + ' SKIPPED (run deadline)', false, { timeLeft: timeLeft() }); return; } try { await fn(); } catch (e) { check(name + ' HARNESS', false, e.stack); try { await shot(name + '-harness'); } catch {} } };
    const loadSample = async (learner = 'lrn-35-bea') => { await go('schoolwork'); await act('load-sample'); await settle(); const ts = await evaluate(`window.__demo.query.listTasks(${JSON.stringify(learner)},{status:'all'}).map(t=>({id:t.id,sample:t.sample}))`); return { math: ts.find((t) => t.sample === 'math-arrays').id, reading: ts.find((t) => t.sample === 'reading-retell').id }; };
    // Where titles/instructions are rendered: Schoolwork list + detail, Workspace context, Plan schedule + proposal picker, Record picker, Today.
    const renderings = async (id, titleExp, instrExp, label) => {
      await go('schoolwork'); await act('task-select', id); const sw = await mainText();
      check(`${label} Schoolwork list+detail show title`, inc(sw, titleExp), { sw: sw.slice(0, 500) });
      if (instrExp != null) check(`${label} Schoolwork detail shows instructions`, inc(sw, instrExp), { sw: sw.slice(0, 800) });
      await go('workspace'); const wsT = await mainText(); check(`${label} Workspace context shows title`, inc(wsT, titleExp), { wsT: wsT.slice(0, 500) });
      if (instrExp != null) check(`${label} Workspace context shows instructions`, inc(wsT, instrExp), { wsT: wsT.slice(0, 800) });
      await go('plan'); const pl = await mainText(); check(`${label} Plan schedule shows title`, inc(pl, titleExp), { pl: pl.slice(0, 600) });
      if (await exists('#prop-taskId')) check(`${label} Plan proposal picker shows title`, (await options('#prop-taskId')).some((o) => o.includes(titleExp)), await options('#prop-taskId'));
      await go('record'); check(`${label} Record picker shows title`, (await options('#rec-task')).some((o) => o.includes(titleExp)), await options('#rec-task'));
      await go('today'); const td = await mainText(); check(`${label} Today shows title`, inc(td, titleExp), { td: td.slice(0, 600) });
    };

    let ids;
    await caseRun('F2-03-es-to-en-due-only', async () => {
      await fresh(); await choose('#learner-select', 'lrn-35-bea'); await act('locale', 'es'); ids = await loadSample();
      const before = await task(ids.math);
      await act('task-edit', ids.math);
      check('F2-03 edit form opened in ES shows the ES rendering', (await val('#edit-title')) === ES['math-arrays'].title && (await val('#edit-instructions')) === ES['math-arrays'].instructions, { t: await val('#edit-title') });
      await act('locale', 'en');
      check('F2-03 untouched generated fields follow the locale in the open edit form (EN after ES)', (await val('#edit-title')) === EN['math-arrays'].title && (await val('#edit-instructions')) === EN['math-arrays'].instructions, { t: await val('#edit-title'), i: await val('#edit-instructions') });
      await type('#edit-due', '2026-10-09'); await shot('f2-03-before-save'); await act('edit-submit'); await settle();
      const after = await task(ids.math); const ev = await lastEdit(ids.math);
      check('F2-03 stored bytes keep canonical EN title/instructions and the sample capability', after.title === EN['math-arrays'].title && after.instructions === EN['math-arrays'].instructions && after.sample === 'math-arrays' && !after.sampleDetached && after.due === '2026-10-09' && after.version === before.version + 1, after);
      check('F2-03 per-field provenance intact after due-only save', eq(after.generated, { title: { key: 'math-arrays', version: 1 }, instructions: { key: 'math-arrays', version: 1 } }), after.generated);
      check('F2-03 edited event logs only due (changed/from/to)', ev && eq(ev.detail.changed, ['due']) && eq(ev.detail.from, { due: before.due }) && eq(ev.detail.to, { due: '2026-10-09' }) && ev.detail.sampleDetached === undefined, ev);
      check('F2-03 edit form closed after save', !(await state()).editing['lrn-35-bea'], await state());
      await act('locale', 'es'); await renderings(ids.math, ES['math-arrays'].title, ES['math-arrays'].instructions, 'F2-03 ES');
      // Original R07 contract: capability still attached — student gets the scripted hint, stored as immutable English text, shown in ES.
      await act('role', 'student'); await go('schoolwork'); await act('task-select', ids.math); await go('workspace');
      if (await exists('[data-act="ws-start"]')) { await act('ws-start'); await settle(); }
      if (HELP_ACT) { await act(HELP_ACT, 'hint'); await settle(); const sess = await session(ids.math); const scripted = sess.assistance.find((x) => x.kind === 'scripted');
        check('R07 due-only edited sample still answers a hint request (stored EN, rendered ES)', scripted && scripted.text === EN['math-arrays'].hints[0] && inc(await mainText(), ES['math-arrays'].hints[0]), { scripted, main: (await mainText()).slice(0, 600) }); }
      await act('role', 'parent'); await act('locale', 'en');
    });

    await caseRun('F2-03-en-to-es-due-only', async () => {
      const before = await task(ids.reading);
      await go('schoolwork'); await act('task-edit', ids.reading); await act('locale', 'es');
      check('F2-03 EN-opened form follows ES for untouched fields', (await val('#edit-title')) === ES['reading-retell'].title, { t: await val('#edit-title') });
      await type('#edit-due', '2026-10-11'); await act('edit-submit'); await settle();
      const after = await task(ids.reading); const ev = await lastEdit(ids.reading);
      check('F2-03 EN→ES due-only keeps canonical text, sample, provenance', after.title === EN['reading-retell'].title && after.instructions === EN['reading-retell'].instructions && after.sample === 'reading-retell' && eq(after.generated, { title: { key: 'reading-retell', version: 1 }, instructions: { key: 'reading-retell', version: 1 } }), after);
      check('F2-03 EN→ES edited event logs only due', ev && eq(ev.detail.changed, ['due']) && eq(ev.detail.from, { due: before.due }), ev);
      await act('locale', 'en');
    });

    await caseRun('F2-03-typed-draft-survives-locale-role-route', async () => {
      await go('schoolwork'); await act('task-edit', ids.math); await type('#edit-title', 'Family title typed');
      await act('locale', 'es'); await act('role', 'student'); await act('role', 'parent'); await go('today'); await go('schoolwork');
      check('F2-03 typed title survives locale+role+route changes; untouched instructions follow locale', (await val('#edit-title')) === 'Family title typed' && (await val('#edit-instructions')) === ES['math-arrays'].instructions, { t: await val('#edit-title'), i: await val('#edit-instructions') });
      await act('edit-submit'); await settle(); const after = await task(ids.math); const ev = await lastEdit(ids.math);
      check('F2-04 title-only edit submits only title; logs from canonical EN title', ev && eq(ev.detail.changed, ['title']) && eq(ev.detail.from, { title: EN['math-arrays'].title }) && eq(ev.detail.to, { title: 'Family title typed' }) && ev.detail.sampleDetached === 'math-arrays', ev);
      check('F2-04 title-only detaches capability, keeps generated instructions provenance + canonical bytes', after.sample === null && after.sampleDetached && eq(after.generated, { instructions: { key: 'math-arrays', version: 1 } }) && after.instructions === EN['math-arrays'].instructions, after);
      await renderings(ids.math, 'Family title typed', ES['math-arrays'].instructions, 'F2-04 title-only ES');
      await go('schoolwork'); await act('task-select', ids.math); check('F2-04 detached task shows the edited-from-sample origin', inc((await mainText()).toLowerCase(), C.t('es', 'task_origin_sample_edited').toLowerCase()), (await mainText()).slice(0, 700));
      // R07: prior scripted assistance is immutable and still rendered; no NEW scripted help after detach.
      await act('role', 'student'); await go('workspace'); const sess0 = await session(ids.math); const main0 = await mainText();
      check('R07 prior scripted hint still shown after detach', sess0.assistance.some((x) => x.kind === 'scripted') && inc(main0, ES['math-arrays'].hints[0]), { main0: main0.slice(0, 600) });
      check('R07 detached task reports help unavailable (no story/help/checker)', inc(main0, C.t('es', 'ws_help_unavailable')) && !(await exists('#ws-answer')), { main0: main0.slice(0, 600) });
      if (HELP_ACT) { await act(HELP_ACT, 'hint'); await settle(); const sess1 = await session(ids.math);
        check('R07 new request after detach gets no scripted reply', sess1.assistance.filter((x) => x.kind === 'scripted').length === sess0.assistance.filter((x) => x.kind === 'scripted').length && sess1.assistance.length === sess0.assistance.length + 1, sess1.assistance); }
      await act('role', 'parent'); await act('locale', 'en');
    });

    await caseRun('F2-04-instructions-only-keeps-generated-title', async () => {
      await act('locale', 'es'); await go('schoolwork'); await act('task-edit', ids.reading); await type('#edit-instructions', 'Instrucciones de la familia.'); await act('edit-submit'); await settle();
      const after = await task(ids.reading); const ev = await lastEdit(ids.reading);
      check('F2-04 instructions-only: stored title bytes canonical EN, instructions authored, title provenance kept', after.title === EN['reading-retell'].title && after.instructions === 'Instrucciones de la familia.' && after.sample === null && eq(after.generated, { title: { key: 'reading-retell', version: 1 } }), after);
      check('F2-04 instructions-only event logs only instructions', ev && eq(ev.detail.changed, ['instructions']) && eq(ev.detail.from, { instructions: EN['reading-retell'].instructions }) && ev.detail.sampleDetached === 'reading-retell', ev);
      await renderings(ids.reading, ES['reading-retell'].title, 'Instrucciones de la familia.', 'F2-04 instr-only ES');
      await act('locale', 'en'); await go('schoolwork'); await act('task-select', ids.reading); const en = await mainText();
      check('F2-04 instr-only EN: generated title in EN, authored instructions verbatim', inc(en, EN['reading-retell'].title, 'Instrucciones de la familia.'), en.slice(0, 700));
      await act('role', 'student'); await go('workspace'); const wsS = await mainText();
      check('F2-04 detached reading task shows no sample story', !inc(wsS, 'Mina') && inc(wsS, EN['reading-retell'].title), wsS.slice(0, 700));
      await act('role', 'parent');
    });

    await caseRun('F2-04-second-edit-after-detach-and-authored-coincidence', async () => {
      await act('locale', 'es'); await go('schoolwork'); await act('task-edit', ids.reading); await act('locale', 'en');
      check('F2-04 edit form after detach still shows generated title per locale', (await val('#edit-title')) === EN['reading-retell'].title && (await val('#edit-instructions')) === 'Instrucciones de la familia.', { t: await val('#edit-title') });
      await type('#edit-due', '2026-10-12'); await act('edit-submit'); await settle(); let after = await task(ids.reading); let ev = await lastEdit(ids.reading);
      check('F2-04 due-only after detach: logs only due, never re-attaches, title provenance kept', eq(ev.detail.changed, ['due']) && after.sample === null && eq(after.generated, { title: { key: 'reading-retell', version: 1 } }) && after.title === EN['reading-retell'].title, { ev, after });
      // Authored coincidence: deliberately typing the canonical ES title stays authored and is shown verbatim in EN.
      await act('task-edit', ids.reading); await type('#edit-title', ES['reading-retell'].title); await act('edit-submit'); await settle(); after = await task(ids.reading); ev = await lastEdit(ids.reading);
      check('F2-04 authored value equal to canonical ES string stays authored (no provenance)', after.title === ES['reading-retell'].title && after.generated === null && eq(ev.detail.changed, ['title']), { after, ev });
      await go('schoolwork'); await act('task-select', ids.reading); check('F2-04 EN view shows the authored ES-looking title verbatim', inc(await mainText(), ES['reading-retell'].title) && !inc(await mainText(), EN['reading-retell'].title), (await mainText()).slice(0, 600));
      await act('task-edit', ids.math); await type('#edit-title', EN['math-arrays'].title); await act('edit-submit'); await settle(); after = await task(ids.math);
      check('F2-04 typing the canonical EN title back stays authored; generated instructions remain', after.generated && after.generated.title === undefined && eq(after.generated.instructions, { key: 'math-arrays', version: 1 }) && after.sample === null, after);
      await act('locale', 'es'); await go('schoolwork'); await act('task-select', ids.math); const es = await mainText();
      check('F2-04 ES view shows authored EN title verbatim with generated ES instructions', inc(es, EN['math-arrays'].title, ES['math-arrays'].instructions) && !inc(es, ES['math-arrays'].title), es.slice(0, 700));
      await shot('f2-04-final-es');
    });
    await caseRun('F2-04-existing-sample-opened-in-ES-typed-canonical-EN-title', async () => {
      await act('role', 'parent'); await act('locale', 'es'); await choose('#learner-select', 'lrn-68-cal'); const cal = await loadSample('lrn-68-cal');
      await act('task-edit', cal.math); check('F2-04 Cal form opened in ES shows ES title', (await val('#edit-title')) === ES['math-arrays'].title, { t: await val('#edit-title') });
      await type('#edit-title', EN['math-arrays'].title); await act('edit-submit'); await settle();
      const after = await task(cal.math); const ev = await lastEdit(cal.math);
      check('F2-04 deliberate canonical-EN title on an existing generated sample is an authored edit (event + provenance)', ev && eq(ev.detail.changed, ['title']) && eq(ev.detail.authored, ['title']) && ev.detail.sampleDetached === 'math-arrays' && after.sample === null && after.title === EN['math-arrays'].title && eq(after.generated, { instructions: { key: 'math-arrays', version: 1 } }), { after, ev });
      await go('schoolwork'); await act('task-select', cal.math); const esMain = await mainText();
      check('F2-04 back in ES the authored EN title is shown verbatim, instructions still ES', inc(esMain, EN['math-arrays'].title, ES['math-arrays'].instructions) && !inc(esMain, ES['math-arrays'].title), esMain.slice(0, 700));
      await act('locale', 'en'); await act('locale', 'es'); check('F2-04 locale round-trip keeps authored EN title', inc(await mainText(), EN['math-arrays'].title) && !inc(await mainText(), ES['math-arrays'].title), (await mainText()).slice(0, 400));
    });
    check('no external network requests', report.externalRequests.length === 0, report.externalRequests);
    check('no page exceptions / console errors', report.exceptions.length === 0 && report.consoleErrors.length === 0, { ex: report.exceptions, ce: report.consoleErrors });
  } finally {
    try { ws && ws.close(); } catch {}
    chrome.kill('SIGKILL'); try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
    report.finished = new Date().toISOString(); report.elapsedMs = Date.now() - t0; report.deadlineMs = RUN_DEADLINE_MS;
    report.summary = { passed: report.checks.filter((c) => c.passed).length, failed: report.checks.filter((c) => !c.passed).length };
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2)); fs.writeFileSync(path.join(OUT, 'run.log'), logLines.join('\n') + '\n');
    log(`SUMMARY passed=${report.summary.passed} failed=${report.summary.failed} elapsedMs=${report.elapsedMs} out=${OUT}`);
  }
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
