// Quality repair cycle 2 — real-input browser regression for QC-11 / QC-02.
// CDP plumbing (Chrome spawn, port 0, fresh profile, send/evaluate/click/shot) copied from
// evidence/coordinator-quality-cycle1/cross-task-probe.cjs. Changes: output dir is
// evidence/quality-fix-cycle2/browser; NO debug dispatch — no `fill()` (value+synthetic events)
// and no __companionDebug.act/submit; every state change goes through real pointer events
// (Input.dispatchMouseEvent) or real keyboard events (Input.dispatchKeyEvent / Input.insertText
// on the focused control). __companionDebug.state and the DOM are only READ for assertions.
// Harness corrections after run 1/2 (evidence/quality-fix-cycle2/09-*,10-*): Tab through the native
// date control's segments; ES dates render as 'vie, 2 oct'; the student plan panel is
// section[aria-labelledby=h-plan] (only the parent column carries .b-plan). No app change.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const ROOT = path.resolve(__dirname, '..');
const OUT = process.env.QC2_OUT || path.join(ROOT, 'evidence', 'quality-fix-cycle2', 'browser');
const CHROME = process.env.CHROME || path.join(os.homedir(), '.agent-browser/browsers/chrome-153.0.8010.52/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const report = { checks: [], errors: [], exceptions: [], externalRequests: [], screenshots: [], keyboard: [], assisted: [], started: new Date().toISOString() };

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  if (!fs.existsSync(CHROME)) throw new Error('Missing local Chrome; set CHROME explicitly');
  const profile = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'edu-qc2-'));
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
    // Real pointer: move, press, release at the control's centre (scrollIntoView only positions it).
    const click = async (selector) => {
      const p = await evaluate(`(() => { const el=document.querySelector(${JSON.stringify(selector)}); if(!el || el.disabled) throw Error('Missing/disabled control: '+${JSON.stringify(selector)}); el.scrollIntoView({block:'center'}); const r=el.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...p });
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...p });
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...p });
      await delay(120);
    };
    const choose = (act, arg) => click(`[data-act="${act}"][data-arg="${arg}"]`);
    const action = (act) => click(`[data-act="${act}"]`);
    const check = (name, pass, detail) => { report.checks.push({ name, passed: !!pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${pass ? '' : ' ' + String(JSON.stringify(detail)).slice(0, 400)}`); };
    const shot = async (name) => {
      await delay(350);
      const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      const file = path.join(OUT, name + '.png'); fs.writeFileSync(file, Buffer.from(r.data, 'base64')); report.screenshots.push(file);
    };
    const KEYS = {
      Tab: { key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 }, Enter: { key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' },
      ArrowDown: { key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40 }, ArrowUp: { key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 }
    };
    const press = async (name, shift = false) => {
      const k = KEYS[name]; const modifiers = shift ? 8 : 0;
      await send('Input.dispatchKeyEvent', { type: 'keyDown', modifiers, ...k });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', modifiers, key: k.key, code: k.code, windowsVirtualKeyCode: k.windowsVirtualKeyCode });
      await delay(60);
    };
    const typeChars = async (text) => {
      for (const ch of text) {
        const code = /\d/.test(ch) ? `Digit${ch}` : `Key${ch.toUpperCase()}`;
        await send('Input.dispatchKeyEvent', { type: 'keyDown', key: ch, code, text: ch, unmodifiedText: ch, windowsVirtualKeyCode: ch.toUpperCase().charCodeAt(0) });
        await send('Input.dispatchKeyEvent', { type: 'keyUp', key: ch, code, windowsVirtualKeyCode: ch.toUpperCase().charCodeAt(0) });
        await delay(25);
      }
    };
    const DESCRIBE = `(() => { const a = document.activeElement; if (!a || a === document.body) return 'body'; const act = a.dataset && a.dataset.act; return act ? '[data-act="' + act + '"]' + (a.dataset.arg !== undefined ? '[data-arg="' + a.dataset.arg + '"]' : '') : a.id ? '#' + a.id : a.tagName.toLowerCase() + (a.className ? '.' + String(a.className).trim().split(/\\s+/).join('.') : ''); })()`;
    const active = () => evaluate(DESCRIBE);
    const state = () => evaluate('JSON.parse(JSON.stringify(window.__companionDebug.state))');
    const val = (sel) => evaluate(`document.querySelector(${JSON.stringify(sel)}).value`);
    // Real-keyboard Tab sweep from the top of the document: returns the ordered list of focused controls.
    const tabSweep = async (max = 160) => {
      await evaluate('document.activeElement && document.activeElement.blur(); window.scrollTo(0,0)');
      const seen = [];
      for (let i = 0; i < max; i++) {
        await press('Tab');
        const a = await active();
        if (a === 'body' || (seen.length > 3 && a === seen[0] && seen.indexOf(a) === 0 && i > 3)) break;
        seen.push(a);
      }
      return seen;
    };
    const tabTo = async (target, max = 160) => {
      for (let i = 0; i < max; i++) { await press('Tab'); if ((await active()) === target) return true; }
      return false;
    };
    // Choose a <select> option with real keys only: type-ahead letters, then arrow keys; never a value write.
    const selectOption = async (sel, value) => {
      const info = await evaluate(`(() => { const s=document.querySelector(${JSON.stringify(sel)}); return { idx:[...s.options].findIndex(o=>o.value===${JSON.stringify(value)}), cur:s.selectedIndex, labels:[...s.options].map(o=>o.textContent) }; })()`);
      if (info.idx < 0) throw new Error('No option ' + value);
      await typeChars(info.labels[info.idx].slice(0, 3).toLowerCase());
      await delay(150);
      if ((await val(sel)) === value) return 'typeahead';
      const cur = await evaluate(`document.querySelector(${JSON.stringify(sel)}).selectedIndex`);
      for (let i = cur; i < info.idx; i++) await press('ArrowDown');
      for (let i = cur; i > info.idx; i--) await press('ArrowUp');
      await delay(150);
      if ((await val(sel)) === value) return 'arrows';
      return null;
    };
    const proposeAndApprove = async (taskId, due, note, label) => {
      await choose('role', 'student');
      await action('propose-open');                       // app moves focus to #prop-task
      check(`${label}: opening the proposal form focuses the task selector`, (await active()) === '#prop-task', await active());
      const how = await selectOption('#prop-task', taskId);
      check(`${label}: task ${taskId} chosen with real keys (${how})`, how !== null, await val('#prop-task'));
      await press('Tab'); check(`${label}: Tab reaches the date field`, (await active()) === '#prop-date', await active());
      await typeChars(due.slice(5, 7) + due.slice(8, 10) + due.slice(0, 4)); // en-US segments MM DD YYYY
      await delay(100);
      check(`${label}: date ${due} typed with real keys`, (await val('#prop-date')) === due, await val('#prop-date'));
      // The native date control owns several internal segments; Tab steps through them before leaving it.
      let tabsOut = 0; while (tabsOut < 4 && (await active()) === '#prop-date') { await press('Tab'); tabsOut++; }
      check(`${label}: Tab (${tabsOut}x, through the date segments) reaches the note field`, (await active()) === '#prop-note', await active());
      if (note) await send('Input.insertText', { text: note });
      await press('Enter');                               // implicit form submission from the note field
      await delay(150);
      const s = await state();
      const p = s.proposals[s.proposals.length - 1];
      check(`${label}: Enter submits the proposal (pending_parent, verbatim note)`, p && p.taskId === taskId && p.due === due && p.status === 'pending_parent' && p.note === (note || ''), p);
      await choose('role', 'parent');
      await action('proposal-approve');
      const s2 = await state();
      check(`${label}: parent click approves it and the shared deadline moves`, s2.tasks.find((t) => t.id === taskId).due === due && s2.proposals[s.proposals.length - 1].status === 'approved_by_parent', s2.tasks);
      return s2;
    };
    const draftView = () => evaluate(`(() => { const panel=document.querySelector('.b-draft'); return { text:panel.innerText, accept:!!panel.querySelector('[data-act="draft-accept"]'), redraft:!!panel.querySelector('[data-act="draft-ask"]'), notices:[...panel.querySelectorAll('.notice.warn')].map(n=>n.textContent) }; })()`);
    const planNotice = () => evaluate(`(() => { const p=document.querySelector('section[aria-labelledby="h-plan"]'); return { notices:[...p.querySelectorAll('.notice')].map(n=>n.textContent), text:p.innerText }; })()`);
    const STALE = { en: /out of date/i, es: /desactualizad/i };
    const DATES = { en: { from: /Oct(ober)?\s*2\b/, to: /Oct(ober)?\s*9\b/ }, es: { from: /\b2\s+oct/i, to: /\b9\s+oct/i } };

    await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable'); await send('Network.enable');
    await send('Emulation.setFocusEmulationEnabled', { enabled: true });
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await send('Page.navigate', { url: pathToFileURL(path.join(ROOT, 'index.html')).href });
    for (let i = 0; i < 60; i++) { if (await evaluate('!!window.__companionDebug')) break; await delay(100); }

    const configs = [{ concept: 'A', locale: 'en', modes: ['accepted', 'pending'] }, { concept: 'C', locale: 'es', modes: ['accepted', 'pending'] }, { concept: 'B', locale: 'en', modes: ['accepted'] }];
    for (const cfg of configs) for (const mode of cfg.modes) {
      const L = `${cfg.concept}/${cfg.locale}/${mode}`;
      try {
        await choose('lang', cfg.locale); await choose('band', '68'); await choose('concept', cfg.concept); await choose('role', 'student'); await action('reset'); await choose('role', 'parent');
        await action('load-sample'); await action('confirm-extract'); await action('draft-ask');
        if (mode === 'accepted') await action('draft-accept');
        const note = cfg.locale === 'es' ? 'Necesito más tiempo — la tesis aún no está lista' : 'Need more time: claim is not ready yet';
        let s = await proposeAndApprove('68-essay-claim', '2026-10-09', note, L);
        let plan = mode === 'accepted' ? s.currentPlan : s.draftPlan;
        check(`${L}: essay deadline approval marks its old plan stale 2026-10-02→2026-10-09`, plan.stale === true && plan.staleFrom === '2026-10-02' && plan.staleTo === '2026-10-09', plan);
        s = await proposeAndApprove('68-history-timeline', '2026-10-12', '', L);
        plan = mode === 'accepted' ? s.currentPlan : s.draftPlan;
        check(`${L}: QC-11 unrelated history approval keeps the essay plan stale with original dates`, plan.stale === true && plan.staleFrom === '2026-10-02' && plan.staleTo === '2026-10-09' && s.tasks.find((t) => t.id === '68-history-timeline').due === '2026-10-12', plan);
        check(`${L}: historical plan items keep their 2026-10-02 dates until replacement`, plan.items.every((i) => i.due === '2026-10-02') && plan.items[2].date === '2026-10-02', plan.items);
        let dv = await draftView();
        check(`${L}: parent Draft panel warns (stale, both dates) with re-draft and NO Accept`, STALE[cfg.locale].test(dv.text) && DATES[cfg.locale].from.test(dv.text) && DATES[cfg.locale].to.test(dv.text) && dv.redraft && !dv.accept, dv);
        const sweep = await tabSweep();
        report.keyboard.push({ label: L, sweep });
        check(`${L}: real Tab sweep never reaches an Accept control and does reach re-draft`, !sweep.includes('[data-act="draft-accept"]') && sweep.includes('[data-act="draft-ask"]'), sweep);
        await evaluate(`document.querySelector('.b-draft').scrollIntoView({block:'center'})`);
        await shot(`${cfg.concept}-${cfg.locale}-${mode}-parent-stale-after-unrelated-move`);
        await choose('role', 'student');
        const pn = await planNotice();
        if (mode === 'accepted') check(`${L}: student plan view shows the same stale warning with both dates`, pn.notices.some((n) => STALE[cfg.locale].test(n) && DATES[cfg.locale].from.test(n) && DATES[cfg.locale].to.test(n)), pn);
        else check(`${L}: student plan view shows no accepted plan (draft still pending), never a current plan`, !/Oct(ober)?\s*2\b|\b2\s+oct/i.test(pn.notices.join(' ')) && !pn.text.includes('2026') && pn.notices.length >= 1, pn);
        check(`${L}: authored proposal note is verbatim in the student view and in state`, (await evaluate(`document.getElementById('main').innerText`)).includes(note) && s.proposals[0].note === note, s.proposals[0]);
        await shot(`${cfg.concept}-${cfg.locale}-${mode}-student-after-unrelated-move`);
        // Locale switch (real click) keeps the authored note verbatim; provenance text follows the locale.
        const other = cfg.locale === 'en' ? 'es' : 'en';
        await choose('lang', other);
        const txt = await evaluate(`document.getElementById('main').innerText`);
        const prov = other === 'es' ? /propuesta del estudiante/i : /approved student proposal/i;
        check(`${L}: after switching to ${other} the note stays verbatim and provenance is localized`, txt.includes(note) && prov.test(txt), txt.slice(0, 300));
        await choose('lang', cfg.locale);
        // Re-draft and re-accept with REAL keyboard only (Tab to the control, Enter).
        await choose('role', 'parent');
        await evaluate('document.activeElement && document.activeElement.blur(); window.scrollTo(0,0)');
        check(`${L}: Tab reaches the re-draft control`, await tabTo('[data-act="draft-ask"]'), await active());
        await press('Enter'); await delay(150);
        s = await state();
        check(`${L}: Enter on re-draft builds a fresh draft from 2026-10-09 (not stale)`, s.draftPlan.status === 'pending_parent_review' && !s.draftPlan.stale && s.draftPlan.items[2].date === '2026-10-09' && s.draftPlan.items[1].date === '2026-10-08', s.draftPlan);
        if (mode === 'accepted') check(`${L}: the old accepted plan is still stale/historical until the new draft is accepted`, s.currentPlan.stale === true && s.currentPlan.items[2].due === '2026-10-02', s.currentPlan);
        check(`${L}: focus moved to the new Accept control`, (await active()) === '[data-act="draft-accept"]', await active());
        await press('Enter'); await delay(150);
        s = await state();
        check(`${L}: Enter on Accept installs the new plan (current, not stale) and replaces the old one`, s.currentPlan && !s.currentPlan.stale && s.currentPlan.acceptedBy === 'parent' && s.currentPlan.items[2].due === '2026-10-09' && s.draftPlan.status === 'accepted_by_parent', s.currentPlan);
        dv = await draftView();
        check(`${L}: Draft panel shows accepted without a stale warning`, !STALE[cfg.locale].test(dv.text) && !dv.accept, dv);
        await shot(`${cfg.concept}-${cfg.locale}-${mode}-parent-after-redraft-reaccept`);
      } catch (err) { report.errors.push({ label: L, error: String(err && err.stack || err) }); console.log('ERROR ' + L + ' ' + err); }
    }
    check('no page exceptions / console errors during the run', report.exceptions.length === 0, report.exceptions);
    check('no HTTP(S) requests during the run', report.externalRequests.length === 0, report.externalRequests);
    check('no harness errors during the run', report.errors.length === 0, report.errors);
  } finally {
    if (ws) ws.close();
    chrome.kill('SIGTERM');
    await Promise.race([exited, delay(2000)]);
    if (chrome.exitCode === null && chrome.signalCode === null) { chrome.kill('SIGKILL'); await exited; }
    fs.rmSync(profile, { recursive: true, force: true });
    report.finished = new Date().toISOString();
    report.summary = { passed: report.checks.filter((x) => x.passed).length, failed: report.checks.filter((x) => !x.passed).length, total: report.checks.length, errors: report.errors.length, exceptions: report.exceptions.length, externalRequests: report.externalRequests.length, screenshots: report.screenshots.length };
    fs.writeFileSync(path.join(OUT, 'quality-cycle2-browser.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report.summary));
    if (report.summary.failed || report.errors.length) process.exitCode = 1;
  }
}
main().catch((err) => { console.error(err); process.exitCode = 2; });
