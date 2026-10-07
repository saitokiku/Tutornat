'use strict';
/* student-pages.e2e.cjs — repair cycle 2 student-page slice (F2-05 / F2-06 / F2-07) in a real headless Chrome over CDP.
 * Real pointer clicks on the real role / learner / locale controls; window.__demo is read-only inspection (no debug
 * command dispatch). Bounded by RUN_DEADLINE_MS (default 90 s); the report is always flushed.
 * Usage: OUT=<new absolute dir> APP_ROOT=<frontend dir> node tests/student-pages.e2e.cjs   (harness adapted from repair-cycle1.e2e.cjs) */
const fs = require('node:fs'); const path = require('node:path'); const os = require('node:os');
const { spawn } = require('node:child_process'); const { pathToFileURL } = require('node:url');
const CHROME = process.env.CHROME || '/Users/man/.agent-browser/browsers/chrome-153.0.8010.52/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const ROOT = process.env.APP_ROOT || path.resolve(__dirname, '..');
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');
const OUT = process.env.OUT || path.join(ROOT, '..', 'evidence', 'student-pages-e2e-' + STAMP);
const RUN_DEADLINE_MS = Number(process.env.RUN_DEADLINE_MS || 90000);
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const report = { started: new Date().toISOString(), root: ROOT, checks: [], exceptions: [], consoleErrors: [], externalRequests: [], screenshots: [], stored: {} };
const logLines = []; const log = (s) => { logLines.push(s); console.log(s); };
const t0 = Date.now(); const timeLeft = () => RUN_DEADLINE_MS - (Date.now() - t0);
const check = (name, pass, detail) => { report.checks.push({ name, passed: !!pass, detail: pass ? undefined : detail }); log(`${pass ? 'PASS' : 'FAIL'} ${name}${pass ? '' : ' ' + String(JSON.stringify(detail)).slice(0, 600)}`); };

async function main() {
  if (fs.existsSync(OUT)) throw Error('Refusing to overwrite evidence ' + OUT);
  fs.mkdirSync(OUT, { recursive: true });
  if (!fs.existsSync(CHROME)) throw new Error('Missing Chrome at ' + CHROME);
  const profile = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'edu-fe-sp-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' });
  const killer = setTimeout(() => { log('DEADLINE: killing Chrome'); try { chrome.kill('SIGKILL'); } catch {} }, RUN_DEADLINE_MS + 5000);
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
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    const q = (sel) => `document.querySelector(${JSON.stringify(sel)})`;
    const click = async (sel) => {
      const p = await evaluate(`(() => { const el=${q(sel)}; if(!el) throw Error('Missing control '+${JSON.stringify(sel)}); if (el.disabled || el.getAttribute('aria-disabled')==='true') throw Error('Disabled control '+${JSON.stringify(sel)}); el.scrollIntoView({block:'center'}); const r=el.getBoundingClientRect(); const hit=document.elementFromPoint(r.x+r.width/2, r.y+r.height/2); if(!hit || !(el===hit || el.contains(hit))) throw Error('Occluded control '+${JSON.stringify(sel)}+' hit='+(hit&&hit.tagName)+'.'+(hit&&hit.className)); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...p }); await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...p }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...p }); await delay(80);
    };
    const act = (a, arg) => click(arg !== undefined ? `[data-act="${a}"][data-arg="${arg}"]` : `[data-act="${a}"]`);
    const settle = async (ms = 300) => { await delay(ms); for (let i = 0; i < 40; i++) { const n = await evaluate('window.__demo.ui().pending.length'); if (!n) break; await delay(100); } };
    const choose = async (sel, value) => { await click(sel); await evaluate(`(() => { const el=${q(sel)}; el.value=${JSON.stringify(value)}; el.dispatchEvent(new Event('change',{bubbles:true})); return el.value; })()`); await delay(60); };
    const shot = async (name) => { await delay(120); const r = await send('Page.captureScreenshot', { format: 'png' }); const f = path.join(OUT, name + '.png'); fs.writeFileSync(f, Buffer.from(r.data, 'base64')); report.screenshots.push(f); return f; };
    const go = async (route) => { await act('nav', route); await delay(120); };
    const role = async (r) => { await act('role', r); await delay(100); };
    const locale = async (lc) => { await act('locale', lc); await delay(100); };
    const learner = (id) => choose('#learner-select', id);
    const url = pathToFileURL(path.join(ROOT, 'index.html')).href + '#/today';
    const fresh = async () => { await send('Page.navigate', { url: 'about:blank' }); await delay(60); await send('Page.navigate', { url }); await delay(350); };
    const panels = () => evaluate(`[...document.querySelectorAll('#main section.panel')].map(p => ({ h: (p.querySelector('h2')||{}).textContent || '', p: (p.querySelector('p')||{}).textContent || '' }))`);
    const disclosure = async (h) => (await panels()).find((p) => p.h === h) || null;
    const infoNotice = () => evaluate(`(document.querySelector('#main .notice.info')||{}).innerText || ''`);
    const steps = (id) => evaluate(`window.__demo.query.session(${JSON.stringify(id)}).steps.map(s => s.text)`);
    const timelineWork = () => evaluate(`[...document.querySelectorAll('#main .timeline li')].filter(li => li.querySelector('.src.work')).map(li => li.querySelector('.what').textContent)`);
    const caseRun = async (name, fn) => { if (timeLeft() < 8000) { check(name + ' SKIPPED (run deadline)', false, { timeLeft: timeLeft() }); return; } try { await fn(); } catch (e) { check(name + ' HARNESS', false, e.stack); try { await shot(name + '-harness'); } catch {} } };
    const NO_PROP = /propos|propuesta|decision|decisión/i;

    await caseRun('F2-05-record-disclosure-by-band', async () => {
      await fresh(); await role('student');
      const EN = { k2: 'Your grown-up can see what you did here, when you asked for help, and what they wrote about it.', h: 'What your parent can see' };
      const ES = { k2: 'Tu adulto puede ver lo que hiciste aquí, cuándo pediste ayuda y lo que escribió sobre eso.', h: 'Lo que puede ver tu madre/padre' };
      for (const [lc, L, must35, must68] of [['en', EN, ['every step you write', 'scripted replies', 'answer checks', 'flag stuck or mark done', 'observations', 'Nothing is sent to school'], 'your date proposals and their decisions'], ['es', ES, ['cada paso que escribes', 'respuestas guionizadas', 'verificaciones de respuesta', 'atascado o hecha', 'observaciones', 'Nada se envía a la escuela'], 'tus propuestas de fecha y sus decisiones']]) {
        await locale(lc);
        await learner('lrn-k2-ari'); await go('record'); let d = await disclosure(L.h);
        check(`F2-05 ${lc} K–2 (Ari) disclosure keeps age-appropriate wording verbatim`, d && d.p === L.k2, d);
        await learner('lrn-35-bea'); await go('record'); d = await disclosure(L.h);
        check(`F2-05 ${lc} 3–5 (Bea) disclosure has no proposal/decision promise`, d && !NO_PROP.test(d.p), d);
        check(`F2-05 ${lc} 3–5 (Bea) disclosure still names every actual sharing item`, d && must35.every((w) => d.p.includes(w)), { d, missing: d ? must35.filter((w) => !d.p.includes(w)) : must35 });
        await shot(`F2-05-${lc}-bea-record`);
        await learner('lrn-68-cal'); await go('record'); d = await disclosure(L.h);
        check(`F2-05 ${lc} 6–8 (Cal) disclosure includes proposals and decisions`, d && d.p.includes(must68), d);
      }
      const eligible = await evaluate(`(() => { try { window.__demo.query.proposals('lrn-35-bea'); } catch (e) { return 'err'; } return document.body.dataset.band; })()`);
      check('F2-05 real learner control drives data-band (6–8 selected last)', eligible === '68', eligible);
    });

    await caseRun('F2-06-workspace-shared-record-heading', async () => {
      await fresh(); await learner('lrn-35-bea'); await go('schoolwork'); await act('load-sample'); await settle(180);
      const ids = await evaluate(`window.__demo.query.listTasks('lrn-35-bea', {status:'open'}).map(t => t.id)`); const id = ids[0];
      await act('task-select', id); await go('workspace');
      let n = await infoNotice(); check('F2-06 EN parent Workspace uses parent-facing shared-record heading', n.startsWith('Shared record for this task: ') && /help requests? · .*scripted repl.* · .*steps?$/.test(n), n);
      check('F2-06 EN parent Workspace does not use student-facing heading', !n.includes('What your parent can see'), n);
      await shot('F2-06-en-parent-workspace');
      await locale('es'); n = await infoNotice(); check('F2-06 ES parent Workspace uses parent-facing shared-record heading', n.startsWith('Registro compartido de esta tarea: '), n);
      await locale('en'); await role('student'); await go('workspace');
      check('F2-06 student Workspace shows work controls, not the parent shared-record notice', (await infoNotice()) === '' && await evaluate(`!!document.querySelector('[data-act="ws-start"],[data-act="ws-step-add"]')`), await infoNotice());
      await go('record'); const d = await disclosure('What your parent can see');
      check('F2-06 student Record keeps the student-facing heading and discloses actual sharing', d && d.p.includes('observations they write here'), d);
    });

    await caseRun('F2-07-tally-save-text', async () => {
      await fresh(); await learner('lrn-35-bea'); await go('schoolwork'); await act('load-sample'); await settle(180);
      const id = (await evaluate(`window.__demo.query.listTasks('lrn-35-bea', {status:'open'}).map(t => t.id)`))[0];
      await act('task-select', id); await role('student'); await go('workspace'); await act('ws-start'); await settle(150);
      const saveWith = async (n) => { for (let i = 0; i < n; i++) await act('tile', i); await act('tally-save'); await settle(200); };
      await saveWith(0); await saveWith(1); await saveWith(2);
      let s = await steps(id); check('F2-07 EN saved 0/1/2 tallies read exactly', JSON.stringify(s) === JSON.stringify(['Tally: 0 marks', 'Tally: 1 mark', 'Tally: 2 marks']), s);
      await locale('es'); await saveWith(0); await saveWith(1); await saveWith(2);
      s = await steps(id); const expected = ['Tally: 0 marks', 'Tally: 1 mark', 'Tally: 2 marks', 'Conteo: 0 marcas', 'Conteo: 1 marca', 'Conteo: 2 marcas'];
      check('F2-07 ES saved 0/1/2 tallies read exactly, earlier EN steps unchanged', JSON.stringify(s) === JSON.stringify(expected), s);
      report.stored.steps = s;
      await go('record'); let tl = await timelineWork(); check('F2-07 ES student Record timeline shows each stored tally verbatim', expected.every((x) => tl.includes(x)), tl);
      await shot('F2-07-es-student-record');
      await role('parent'); await locale('en'); await go('record'); tl = await timelineWork();
      check('F2-07 parent/EN switch leaves historical EN and ES tally text unchanged', expected.every((x) => tl.includes(x)) && JSON.stringify(await steps(id)) === JSON.stringify(expected), { tl, steps: await steps(id) });
      const evs = await evaluate(`window.__demo.query.record(${JSON.stringify(id)}).filter(e => e.source === 'student_work').map(e => e.detail.text)`);
      check('F2-07 student_work events carry the exact saved texts', JSON.stringify(evs) === JSON.stringify(expected), evs);
      await shot('F2-07-en-parent-record');
    });
    check('no page exceptions', report.exceptions.length === 0, report.exceptions.map((e) => e.text || e.exception && e.exception.description).slice(0, 5));
    check('no external network requests', report.externalRequests.length === 0, report.externalRequests.slice(0, 5));
  } finally {
    clearTimeout(killer); try { ws && ws.close(); } catch {} try { chrome.kill('SIGKILL'); } catch {}
    report.finished = new Date().toISOString(); report.elapsedMs = Date.now() - t0;
    report.summary = { passed: report.checks.filter((c) => c.passed).length, failed: report.checks.filter((c) => !c.passed).length };
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2)); fs.writeFileSync(path.join(OUT, 'log.txt'), logLines.join('\n') + '\n');
    log(`SUMMARY passed=${report.summary.passed} failed=${report.summary.failed} elapsedMs=${report.elapsedMs} out=${OUT}`);
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
  }
}
main().catch((e) => { console.error('HARNESS FAILURE', e); process.exitCode = 1; });
