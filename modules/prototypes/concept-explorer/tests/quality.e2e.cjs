/* Quality repair cycle 1 — browser regressions for QC-01/04/05/06 and QUX-1..4 through real
 * controls (pointer + real key events) over CDP against an owned headless local Chrome:
 * --remote-debugging-port=0, throwaway profile under TMPDIR, removed on exit. No packages,
 * no network. Run:  node tests/quality.e2e.cjs
 * Writes evidence/quality-fix/quality-e2e.json and evidence/quality-fix/*.png.
 * Interpret the JSON (summary.failed), not only the exit code. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'evidence', 'quality-fix');
const CHROME = process.env.CHROME || path.join(os.homedir(), '.agent-browser/browsers/chrome-153.0.8010.52/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const report = { checks: [], exceptions: [], externalRequests: [], screenshots: [], keyboard: [], obscured: [], contrast: [], started: new Date().toISOString() };

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  if (!fs.existsSync(CHROME)) throw new Error('Missing local Chrome; set CHROME explicitly');
  const profile = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'edu-quality-fix-'));
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
      await delay(120);
    };
    const fill = async (selector, text) => evaluate(`(() => { const el=document.querySelector(${JSON.stringify(selector)}); if(!el) throw Error('Missing input '+${JSON.stringify(selector)}); el.value=${JSON.stringify(text)}; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    const submit = async (name) => click(`form[data-form="${name}"] button[type="submit"]`);
    const choose = (act, arg) => click(`[data-act="${act}"][data-arg="${arg}"]`);
    const action = (act) => click(`[data-act="${act}"]`);
    const check = (name, pass, detail) => { report.checks.push({ name, passed: !!pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${pass ? '' : ' ' + String(JSON.stringify(detail)).slice(0, 400)}`); };
    const shot = async (name) => {
      await delay(300);
      const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      const file = path.join(OUT, name + '.png'); fs.writeFileSync(file, Buffer.from(r.data, 'base64')); report.screenshots.push(path.relative(ROOT, file));
    };
    const reset = async (band = '35', concept = 'A', locale = 'en', role = 'student') => {
      await choose('lang', locale); await choose('band', band); await choose('concept', concept); await choose('role', 'student'); await action('reset'); if (role !== 'student') await choose('role', role);
    };
    const KEYS = { Tab: { key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 }, Enter: { key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' }, Space: { key: ' ', code: 'Space', windowsVirtualKeyCode: 32, text: ' ' } };
    const press = async (name, shift = false) => {
      const k = KEYS[name]; const modifiers = shift ? 8 : 0;
      await send('Input.dispatchKeyEvent', { type: 'keyDown', modifiers, ...k });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', modifiers, key: k.key, code: k.code, windowsVirtualKeyCode: k.windowsVirtualKeyCode });
      await delay(80);
    };
    const DESCRIBE = `(() => { const a = document.activeElement; if (!a || a === document.body) return 'body'; const act = a.dataset && a.dataset.act; return act ? '[data-act="' + act + '"]' + (a.dataset.arg !== undefined ? '[data-arg="' + a.dataset.arg + '"]' : '') : a.id ? '#' + a.id : a.tagName.toLowerCase() + (a.className ? '.' + String(a.className).trim().split(/\\s+/).join('.') : ''); })()`;
    const active = () => evaluate(DESCRIBE);
    const focusSel = (sel) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el || el.disabled) throw Error('cannot focus ' + ${JSON.stringify(sel)}); el.focus(); return ${DESCRIBE}; })()`);
    const activate = async (sel, keyName, expected, label) => {
      await focusSel(sel);
      await press(keyName);
      const got = await active();
      const ok = got !== 'body' && expected.some((x) => got === x);
      report.keyboard.push({ label, control: sel, key: keyName, expected, got, ok });
      check(`QUX-1 ${label}: ${keyName} on ${sel} moves focus to ${expected.join(' | ')}`, ok, got);
    };
    const insert = async (sel, text) => { await focusSel(sel); await send('Input.insertText', { text }); };
    const typed = async (text) => { await fill('#typed-input', text); await submit('typed'); return evaluate('window.__companionDebug.ui.turns.at(-1).text'); };
    const mainText = () => evaluate("document.getElementById('main').innerText");
    const state = () => evaluate('JSON.parse(JSON.stringify(window.__companionDebug.state))');
    const live = () => evaluate('new Promise(r => setTimeout(() => r(document.getElementById("live").textContent), 80))');

    await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable'); await send('Network.enable');
    await send('Emulation.setFocusEmulationEnabled', { enabled: true });
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await send('Page.navigate', { url: pathToFileURL(path.join(ROOT, 'index.html')).href });
    for (let i = 0; i < 60; i++) { if (await evaluate('!!window.__companionDebug')) break; await delay(100); }
    check('QUX-1 initial render does not steal focus', (await active()) === 'body', await active());
    check('page has one quiet h1 for AT structure', (await evaluate('document.querySelectorAll("h1").length')) === 1);

    // ---- QC-01 / QC-06: replay is presentation; scripted and requested assistance are attributed separately ----
    for (const [band, lang, taskId, subject] of [['35', 'en', '35-math-regroup', 'math'], ['35', 'es', '35-read-summary', 'literacy'], ['K2', 'es', 'k2-math-add', 'math'], ['K2', 'en', 'k2-read-sounds', 'literacy']]) {
      await reset(band, 'A', lang);
      if (!(await evaluate(`window.__companionDebug.state.focusTaskId === ${JSON.stringify(taskId)}`))) {
        if (band === 'K2') { await action('start'); await action('done'); }
        await click(`[data-act="select"][data-arg="${taskId}"]`);
      }
      const playAll = async () => { for (let i = 0; i < 8 && await evaluate(`(() => { const p=document.querySelector('[data-act="play"]'); return !!p && !p.disabled; })()`); i++) await action('play'); };
      await playAll();
      await typed('AUTHORED_NOTE_QC_ONE');
      await action('hint');
      await action('replay'); await playAll(); await action('replay'); await playAll();
      const r = await evaluate(`(() => { const d = window.__companionDebug; const t = d.state.tasks.find(t => t.id === d.state.focusTaskId); const a = t.assistance || [];
        const steps = [...document.querySelectorAll('.board .step')].map(s => ({ from: s.dataset.from, prov: s.dataset.provenance || '', text: s.textContent.trim() }));
        return { real: a.filter(x => x.kind === 'hint').length, scripted: a.filter(x => x.kind === 'scripted_hint' && x.provenance === 'scripted_demo').length, total: a.length,
          steps, scriptedTurns: d.ui.turns.filter(t => t.scripted).length, authored: d.ui.turns.filter(t => t.text === 'AUTHORED_NOTE_QC_ONE').length,
          hintDisabled: document.querySelector('[data-act="hint"]').disabled, pill: (document.querySelector('.task .pill:not(.sample)') || {}).textContent || '' }; })()`);
      check(`QC-01 ${band}/${lang}/${subject}: three replays leave 1 requested hint + 1 scripted demo hint`, r.real === 1 && r.scripted === 1 && r.total === 2, r);
      check(`QC-01 ${band}/${lang}/${subject}: board holds each scripted step once plus the real hint`, r.steps.length === 3 && r.steps.filter((x) => x.prov === 'scripted_demo').length === 2 && r.steps.filter((x) => x.from === 'hint' && !x.prov).length === 1, r.steps);
      check(`QC-01 ${band}/${lang}/${subject}: authored note survives replay; sample turns appear once`, r.authored === 1 && r.scriptedTurns === 5, r);
      check(`QC-01 ${band}/${lang}/${subject}: hint allowance and pill count real requests only`, !r.hintDisabled && /^1 /.test(r.pill), r);
      await action('done');
      await choose('role', 'parent');
      const p = await evaluate(`(() => { const d = window.__companionDebug; const text = document.getElementById('main').innerText; const l = d.state.ledger[${JSON.stringify(subject)}];
        const row = [...document.querySelectorAll('.ledger tbody tr')].find(tr => tr.querySelector('td.k') && tr.querySelector('td.k').textContent.trim() === ${JSON.stringify(subject === 'math' ? (lang === 'en' ? 'Math' : 'Matemáticas') : (lang === 'en' ? 'Reading & writing' : 'Lectura y escritura'))});
        return { flags: [...document.querySelectorAll('.notice.warn')].map(n => n.textContent), ledgerHints: l.hintsUsed, cell: row ? row.children[3].textContent.trim() : null, sampleLabel: /Scripted demo|Demo guionizada/.test(text) }; })()`);
      check(`QC-01 ${band}/${lang}/${subject}: parent flag and ledger say 1 hint, demo provenance stays visible`, p.flags.length === 1 && /^1 /.test(p.flags[0]) && p.ledgerHints === 1 && p.cell === '1' && p.sampleLabel, p);
      if (band === '35' && lang === 'en') { await choose('role', 'student'); await shot('qc01-desktop-A-student-35-en-after-three-replays'); }
    }
    await reset('35', 'A', 'en'); await click('[data-act="select"][data-arg="35-science-habitat"]'); await action('start'); await action('done'); await choose('role', 'parent');
    const org = await evaluate(`(() => { const s = window.__companionDebug.state; return { keys: Object.keys(s.ledger), status: s.tasks.find(t => t.id === '35-science-habitat').status, rowText: [...document.querySelectorAll('.ledger tbody tr')].at(-1).innerText }; })()`);
    check('QC-06 organized-only completion creates no ledger evidence or check schedule', org.keys.join(',') === 'math,literacy' && org.status === 'complete' && /Organized only/.test(org.rowText) && !/48/.test(org.rowText), org);

    // ---- QC-02 / QC-03: one coherent shared date transition ----
    await reset('68', 'A', 'en', 'parent'); await action('load-sample'); await action('confirm-extract'); await action('draft-ask'); await action('draft-accept');
    await choose('role', 'student'); await action('propose-open');
    await fill('#prop-task', '68-essay-claim'); await fill('#prop-date', '2026-10-09'); await fill('#prop-note', 'Need more time'); await submit('propose');
    await choose('role', 'parent'); await action('proposal-approve');
    let st = await state();
    let text = await mainText();
    const essay = st.tasks.find((t) => t.id === '68-essay-claim');
    check('QC-02 approval moves task, provenance and confirmed extract together', essay.due === '2026-10-09' && essay.dueSource === 'student_proposal_approved' && st.extracted.due === '2026-10-09' && st.extracted.sampleDue === '2026-10-02', { essay, extracted: st.extracted });
    check('QC-02 parent sees the approved date with its source and the original note date as a source', /Oct 9/.test(text) && /approved student proposal|student proposal/i.test(text) && /Sample note said[^\n]*Oct 2/.test(text) && !/Deadline: Fri, Oct 2/.test(text), text.match(/.*Oct 2.*/g));
    check('QC-02 the accepted plan is marked out of date with a re-draft path, not shown as current', st.currentPlan.stale === true && /out of date|needs a new draft/i.test(text) && (await evaluate('!!document.querySelector(".b-draft [data-act=\\"draft-ask\\"]")')), { stale: st.currentPlan.stale });
    await shot('qc02-desktop-A-parent-68-en-stale-plan');
    await choose('role', 'student'); text = await mainText();
    check('QC-02 student sees the same date and the same out-of-date warning', /Oct 9/.test(text) && /out of date/i.test(text) && !/Fri, Oct 2: turn in/.test(text), text.slice(0, 200));
    await choose('role', 'parent'); await click('.b-draft [data-act="draft-ask"]'); await action('draft-accept'); st = await state(); text = await mainText();
    check('QC-02 re-draft from the new date and explicit re-accept clears the stale flag', !st.currentPlan.stale && st.currentPlan.items[2].due === '2026-10-09' && /Thu, Oct 8/.test(text) && /Fri, Oct 9: turn in/.test(text) && !/out of date/i.test(text), { items: st.currentPlan.items });
    await choose('lang', 'es'); text = await mainText();
    check('QC-02 Spanish copy carries the proposal provenance', /propuesta/i.test(text) && /9 oct/.test(text), text.slice(0, 200));
    // Pending draft + decline
    await reset('68', 'A', 'en', 'parent'); await action('load-sample'); await action('confirm-extract'); await action('draft-ask');
    await choose('role', 'student'); await action('propose-open'); await fill('#prop-task', '68-essay-claim'); await fill('#prop-date', '2026-10-09'); await submit('propose');
    await choose('role', 'parent'); await action('proposal-decline'); st = await state();
    check('QC-02 decline leaves the pending draft, task and extract intact', st.draftPlan.status === 'pending_parent_review' && !st.draftPlan.stale && st.tasks.find((t) => t.id === '68-essay-claim').due === '2026-10-02' && st.extracted.due === '2026-10-02', st.draftPlan);
    // QC-03: proposal approved before the note is loaded, then Confirm as shown, then a later correction.
    await reset('68', 'A', 'en'); await action('propose-open'); await fill('#prop-task', '68-essay-claim'); await fill('#prop-date', '2026-10-09'); await submit('propose');
    await choose('role', 'parent'); await action('proposal-approve'); await action('load-sample');
    const prefill = await evaluate('document.getElementById("due-input").value');
    text = await mainText();
    check('QC-03 intake shows the current shared deadline with the sample date distinguishable', prefill === '2026-10-09' && /Sample note said[^\n]*Oct 2/.test(text), { prefill });
    await action('confirm-extract'); st = await state();
    check('QC-03 Confirm as shown keeps the approved date and its provenance', st.tasks.find((t) => t.id === '68-essay-claim').due === '2026-10-09' && st.tasks.find((t) => t.id === '68-essay-claim').dueSource === 'student_proposal_approved' && st.extracted.status === 'confirmed_by_parent' && st.extracted.corrections.length === 0 && st.proposals[0].status === 'approved_by_parent', st.extracted);
    await reset('68', 'A', 'en'); await action('propose-open'); await fill('#prop-task', '68-essay-claim'); await fill('#prop-date', '2026-10-09'); await submit('propose');
    await choose('role', 'parent'); await action('proposal-approve'); await action('load-sample'); await fill('#due-input', '2026-10-12'); await submit('extract'); st = await state(); text = await mainText();
    const corrected = st.tasks.find((t) => t.id === '68-essay-claim');
    check('QC-03 a later correction records the actual shared before/after values and marks the approval historical', corrected.due === '2026-10-12' && corrected.dueSource === 'parent_corrected' && JSON.stringify(st.extracted.corrections) === JSON.stringify([{ field: 'due', from: '2026-10-09', to: '2026-10-12', by: 'parent' }]) && st.proposals[0].status === 'approved_by_parent' && /superseded|no longer current/i.test(text) && /Oct 9 → Mon, Oct 12/.test(text), { corrected, corrections: st.extracted.corrections });

    // ---- QC-04: terminal state offers no submittable empty selector; invalid submits never throw ----
    await reset('68', 'C', 'en');
    for (let i = 0; i < 3; i++) { await action('start'); await action('done'); if (i < 2) await action('select'); }
    let q = await evaluate(`(() => ({ open: !!document.querySelector('[data-act="propose-open"]'), form: !!document.querySelector('form[data-form="propose"]'), empty: (document.querySelector('.b-plan [data-empty="proposals"]') || {}).textContent || '' }))()`);
    check('QC-04 all tasks complete: no proposal control, a clear English empty state', !q.open && !q.form && /nothing (left )?to move|all (your )?tasks are (marked )?done/i.test(q.empty), q);
    await choose('lang', 'es');
    q = await evaluate(`(() => ({ open: !!document.querySelector('[data-act="propose-open"]'), empty: (document.querySelector('.b-plan [data-empty="proposals"]') || {}).textContent || '' }))()`);
    check('QC-04 all tasks complete: Spanish empty state', !q.open && /nada que mover|ya están hechas/i.test(q.empty), q);
    const stale = await evaluate(`(() => { const d = window.__companionDebug; const f = document.createElement('form'); f.innerHTML = '<select name="propTask"></select><input name="propDate" value="2026-10-09"><input name="propNote" value="x">'; const before = d.state.proposals.length; let threw = null; try { d.submit('propose', f); } catch (e) { threw = String(e); } return { threw, proposals: d.state.proposals.length - before, note: (document.querySelector('.b-plan .notice.warn[role="alert"], .b-plan .notice.warn[role="status"]') || {}).textContent || '' }; })()`);
    check('QC-04 a stale/empty proposal submit is rejected without an exception and without a proposal', stale.threw === null && stale.proposals === 0 && stale.note.length > 0, stale);
    await reset('68', 'C', 'en'); await action('propose-open');
    await fill('#prop-task', '68-history-timeline'); await fill('#prop-date', '2026-10-09'); await fill('#prop-note', 'Game on Thursday'); await submit('propose');
    await choose('role', 'parent'); await action('proposal-approve'); st = await state();
    const redecide = await evaluate(`(() => { const d = window.__companionDebug; let threw = null; try { d.act('proposal-decline', '0'); } catch (e) { threw = String(e); } return { threw, status: d.state.proposals[0].status, due: d.state.tasks.find(t => t.id === '68-history-timeline').due }; })()`);
    check('QC-04 the normal 6–8 proposal path still works and re-deciding a decided proposal is refused without a throw', st.proposals[0].status === 'approved_by_parent' && st.tasks.find((t) => t.id === '68-history-timeline').due === '2026-10-09' && redecide.threw === null && redecide.status === 'approved_by_parent' && redecide.due === '2026-10-09', redecide);

    // ---- QC-05 / QC-10: intentional hint requests only; whitespace is never joined ----
    await reset('35', 'A', 'en'); await click('[data-act="select"][data-arg="35-read-summary"]'); await action('start');
    let reply = await typed('Rosa found the map, which would help her brother');
    let n = await evaluate('window.__companionDebug.state.work.assistance.length');
    check('QC-05 English prose containing "help" stays prose and is not a hint', n === 0 && !/Here’s a hint/.test(reply), { n, reply });
    reply = await typed('La pista de atletismo está cerrada y necesito la ayuda de Rosa');
    n = await evaluate('window.__companionDebug.state.work.assistance.length');
    check('QC-05 Spanish prose containing "pista"/"ayuda" stays prose', n === 0 && !/Here’s a hint/.test(reply), { n, reply });
    reply = await typed('hint');
    check('QC-05 the short request "hint" still gives a hint', /Here’s a hint/.test(reply) && (await evaluate('window.__companionDebug.state.work.assistance.length')) === 1, reply);
    reply = await typed('¿Me das una pista?');
    check('QC-05 the Spanish request "¿Me das una pista?" gives a hint', /Here’s a hint/.test(reply) && (await evaluate('window.__companionDebug.state.work.assistance.length')) === 2, reply);
    const authored = await evaluate('window.__companionDebug.ui.turns.filter(t => !t.scripted && t.who === "student").map(t => t.text)');
    check('QC-05 every typed message is kept verbatim as the student’s own turn', authored.join('|') === 'Rosa found the map, which would help her brother|La pista de atletismo está cerrada y necesito la ayuda de Rosa|hint|¿Me das una pista?', authored);
    await choose('role', 'parent'); text = await mainText();
    check('QC-05 the parent flag counts the two actual requests only', /2 hints asked for in Reading/.test(text) && !/3 hints|4 hints/.test(text));
    await reset('35', 'A', 'en'); await action('start'); await fill('#board-input', '22 5'); await submit('board');
    reply = await evaluate('window.__companionDebug.ui.turns.at(-1).text');
    check('QC-10 "22 5" on the board is uncheckable, not a match for 225', /I can only check/.test(reply) && !/That matches/.test(reply), reply);

    // ---- QUX-1: keyboard continuity through real key events ----
    await reset('35', 'A', 'en');
    await activate('[data-act="start"]', 'Enter', ['[data-act="hint"]'], 'Start → work controls');
    await activate('[data-act="hint"]', 'Space', ['[data-act="hint"]'], 'first hint keeps its control');
    await activate('[data-act="hint"]', 'Enter', ['#board', 'div.board', '#board-input'], 'final hint → board');
    await insert('#board-input', '225'); await press('Enter');
    check('QUX-1 Enter in the board field keeps focus in the board form', ['#board-input', '#board-submit'].includes(await active()), await active());
    await insert('#board-input', '13'); await activate('#board-submit', 'Space', ['#board-submit'], 'board Add keeps the submit control');
    await activate('[data-act="done"]', 'Enter', ['[data-act="select"][data-arg="35-read-summary"]'], 'Done → next-step control');
    await activate('[data-act="select"][data-arg="35-read-summary"]', 'Enter', ['#h-task'], 'Next → selected task heading');
    await activate('[data-act="mic-try"]', 'Enter', ['[data-act="mic-allow"]'], 'mic request → recovery control');
    await activate('[data-act="mic-allow"]', 'Enter', ['#mic-status'], 'mic allowed → status');
    await insert('#typed-input', 'hello'); await activate('#typed-submit', 'Enter', ['#typed-submit'], 'typed Send keeps the submit control');
    await activate('[data-act="play"]', 'Space', ['[data-act="play"]'], 'Play keeps its control');
    await choose('band', 'K2');
    await activate('[data-act="ask-adult"]', 'Enter', ['#adult-flag'], 'ask a grown-up → flag notice');
    await reset('68', 'C', 'en');
    await activate('[data-act="propose-open"]', 'Enter', ['#prop-task'], 'proposal open → form');
    check('QUX-1 proposal open is announced', (await live()).length > 0, await live());
    await activate('[data-act="propose-close"]', 'Enter', ['[data-act="propose-open"]'], 'proposal close → opener');
    check('QUX-1 proposal close is announced', (await live()).length > 0, await live());
    await action('propose-open'); await fill('#prop-task', '68-history-timeline'); await fill('#prop-date', '2026-10-09');
    await activate('#propose-submit', 'Enter', ['#h-proposals'], 'send proposal → proposal result');
    await choose('role', 'parent'); await choose('concept', 'A');
    await activate('[data-act="proposal-approve"][data-arg="0"]', 'Enter', ['#h-proposals'], 'approve → proposal result');
    await activate('[data-act="load-sample"]', 'Enter', ['#due-input'], 'intake → review form');
    await activate('#extract-submit', 'Enter', ['[data-act="draft-ask"]'], 'save correction → draft decision');
    await activate('[data-act="draft-ask"]', 'Enter', ['[data-act="draft-accept"]'], 'draft creation → decision');
    await insert('#decline-note', 'Too much'); await press('Enter');
    check('QUX-1 decline (Enter in note) → draft result', (await active()) === '#draft-result', await active());
    await activate('[data-act="draft-ask"]', 'Enter', ['[data-act="draft-accept"]'], 'draft again → decision');
    await activate('[data-act="draft-accept"]', 'Enter', ['#draft-result'], 'accept → plan/draft result');
    await insert('#obs-input', 'Explained regrouping.'); await activate('#obs-submit', 'Enter', ['#obs-submit'], 'observation save keeps the submit control');
    const trap = await evaluate(`(() => [...document.querySelectorAll('.turns')].map(t => ({ tab: t.tabIndex, named: !!(t.getAttribute('aria-label') || (t.getAttribute('aria-labelledby') && document.getElementById(t.getAttribute('aria-labelledby')))) })))()`);
    check('QUX-1 overflowing turn histories are explicitly keyboard reachable and named', trap.length > 0 && trap.every((t) => t.tab === 0 && t.named), trap);
    const names = await evaluate(`(() => [...document.querySelectorAll('.board')].map(b => ({ role: b.getAttribute('role'), name: b.getAttribute('aria-label') || (b.getAttribute('aria-labelledby') && document.getElementById(b.getAttribute('aria-labelledby')) || {}).textContent || '' })))()`);
    check('QUX-1 every board is a named region', names.length > 0 && names.every((b) => b.role === 'region' && b.name.length > 0), names);
    await choose('role', 'student'); await choose('band', '35'); await choose('lang', 'es'); await shot('qux1-desktop-A-student-35-es-after-keyboard-journey');

    // ---- QUX-2: focused controls and scroll targets are never under the banner ----
    for (const [w, h, lang, band, mobile] of [[1440, 1000, 'en', '35', false], [390, 844, 'en', '35', true], [390, 844, 'es', '35', true], [390, 844, 'en', 'K2', true]]) {
      await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
      await reset(band, 'A', lang); await evaluate('window.scrollTo(0, 0)');
      const banner = await evaluate(`(() => { const b = document.getElementById('boundary').getBoundingClientRect(); const sp = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop); return { h: b.height, sp }; })()`);
      check(`QUX-2 ${w}/${lang}/${band}: scroll padding tracks the actual banner height (${Math.round(banner.h)}px)`, banner.sp >= banner.h && banner.sp < banner.h + 40, banner);
      const sweep = async (shift, start, count) => {
        if (start === 'body') await evaluate('document.body.focus(); window.scrollTo(0,0)'); else await focusSel(start);
        const bad = [];
        for (let i = 0; i < count; i++) {
          await press('Tab', shift);
          const f = await evaluate(`(() => { const a = document.activeElement; if (!a || a === document.body) return null; const r = a.getBoundingClientRect(); const b = document.getElementById('boundary').getBoundingClientRect(); const hidden = r.height ? Math.max(0, Math.min(r.bottom, b.bottom) - Math.max(r.top, b.top)) / r.height : 0; return { el: ${DESCRIBE}, top: r.top, bottom: r.bottom, hidden, inView: r.bottom > 0 && r.top < innerHeight }; })()`);
          if (f && f.inView && f.hidden > 0.02 && f.el !== 'a.skip') bad.push(f);
        }
        return bad;
      };
      const back = await sweep(true, '#typed-submit', 28);
      const fwd = await sweep(false, 'body', 18);
      report.obscured.push({ w, lang, band, back, fwd });
      check(`QUX-2 ${w}/${lang}/${band}: Shift+Tab sweep never leaves the focused control under the banner`, back.length === 0, back);
      check(`QUX-2 ${w}/${lang}/${band}: Tab sweep never leaves the focused control under the banner`, fwd.length === 0, fwd);
      await evaluate('window.scrollTo(0, 400); document.querySelector("a.skip").focus()');
      const skip = await evaluate(`(() => { const a = document.activeElement; const r = a.getBoundingClientRect(); const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return { el: ${DESCRIBE}, h: r.height, w: r.width, painted: top === a }; })()`);
      await press('Enter');
      const landed = await evaluate(`(() => { const a = document.activeElement; const m = document.getElementById('main').getBoundingClientRect(); const b = document.getElementById('boundary').getBoundingClientRect(); const first = document.querySelector('main section header, main .task'); const fr = first ? first.getBoundingClientRect() : null; return { el: ${DESCRIBE}, mainTop: m.top, bannerBottom: b.bottom, firstTop: fr && fr.top }; })()`);
      check(`QUX-2 ${w}/${lang}/${band}: skip link is a 44px target painted above the banner and lands #main below it`, skip.el === 'a.skip' && skip.h >= 44 && skip.painted && landed.el === '#main' && landed.firstTop >= landed.bannerBottom - 1, { skip, landed });
      const anchor = await evaluate(`(() => { const s = document.querySelector('[data-act="start"]'); s.scrollIntoView({ block: 'start' }); const r = s.getBoundingClientRect(); const b = document.getElementById('boundary').getBoundingClientRect(); const top = document.elementFromPoint(r.x + r.width / 2, r.y + 4); return { top: r.top, bannerBottom: b.bottom, hit: !!top && (top === s || s.contains(top)) }; })()`);
      check(`QUX-2 ${w}/${lang}/${band}: start-aligned scroll to Start lands below the banner`, anchor.top >= anchor.bannerBottom - 1 && anchor.hit, anchor);
      if (mobile && lang === 'en' && band === '35') { await focusSel('[data-act="play"]'); await shot('qux2-phone-390-student-35-en-play-focused-visible'); }
    }
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

    // ---- QUX-3: disclosure / history parity in B and C ----
    for (const concept of ['B', 'C']) for (const lang of ['en', 'es']) {
      await reset('35', concept, lang);
      for (let i = 0; i < 3; i++) await action('play');
      await typed('MY_PRIVATE_NOTE');
      const stu = await evaluate(`(() => { const d = document.querySelector('details.turns-drawer'); const turns = [...document.querySelectorAll('#main .turns .turn')].map(t => t.textContent.trim()); return { drawer: !!d, open: d ? d.open : null, turns, see: (document.querySelector('.b-see') || {}).innerText || '' }; })()`);
      check(`QUX-3 ${concept}/${lang}: student has a closed-by-default drawer with the complete turn history`, stu.drawer && stu.open === false && stu.turns.length === 5 && stu.turns.some((t) => /MY_PRIVATE_NOTE/.test(t)) && stu.turns.filter((t) => /Scripted demo|Demo guionizada/.test(t)).length === 3, stu);
      check(`QUX-3 ${concept}/${lang}: disclosure says typed messages and board entries are parent-visible`, lang === 'en' ? /type|typed/i.test(stu.see) && /board/i.test(stu.see) : /escrib/i.test(stu.see) && /pizarra/i.test(stu.see), stu.see);
      await click('details.turns-drawer > summary');
      const opened = await evaluate(`(() => { const d = document.querySelector('details.turns-drawer'); const l = d.querySelector('.turns'); return { open: d.open, visible: !!(l && l.getClientRects().length) }; })()`);
      await action('hint');
      const after = await evaluate(`(() => ({ open: document.querySelector('details.turns-drawer').open, turns: document.querySelectorAll('#main .turns .turn').length }))()`);
      check(`QUX-3 ${concept}/${lang}: the drawer opens on demand and stays open across a rerender`, opened.open && opened.visible && after.open && after.turns === 6, { opened, after });
      if (concept === 'B' && lang === 'en') await shot('qux3-desktop-B-student-35-en-turns-drawer-open');
      await choose('role', 'parent');
      const par = await evaluate(`(() => { const block = [...document.querySelectorAll('.replay-task')].find(b => b.querySelector('.turns')); return [...block.querySelectorAll('.turns .turn')].map(t => t.textContent.trim()); })()`);
      const stuNow = await (async () => { await choose('role', 'student'); return evaluate(`[...document.querySelectorAll('#main .turns .turn')].map(t => t.textContent.trim())`); })();
      check(`QUX-3 ${concept}/${lang}: parent and student see the same turns, verbatim and labelled`, par.length === 6 && par.map((t) => t.replace(/^(Student|Estudiante)/, 'You')).join('|') === stuNow.map((t) => t.replace(/^(You|Tú)/, 'You')).join('|'), { par, stuNow });
    }
    await reset('35', 'C', 'en'); await click('details.drawer:not(.turns-drawer) > summary');
    await action('start');
    const cdrawer = await evaluate('document.querySelector("details.drawer:not(.turns-drawer)").open');
    check('QUX-3 (QC-07) concept C companion drawer keeps its closed state after Start', cdrawer === false, cdrawer);
    await reset('35', 'A', 'es'); await click('[data-act="select"][data-arg="35-science-habitat"]');
    const esOrg = await evaluate(`(() => document.querySelector('.b-companion .notice').textContent)()`);
    reply = await typed('hola');
    check('QUX-3 Spanish organized-only copy has no untranslated jargon', !/organized/i.test(esOrg) && !/organized/i.test(reply), { esOrg, reply });
    await choose('band', 'K2'); const seeK2 = await evaluate(`document.querySelector('.b-see').innerText`); await choose('lang', 'en'); const seeK2en = await evaluate(`document.querySelector('.b-see').innerText`);
    check('QUX-3 K–2 disclosure mentions typed messages in both languages, in short wording', /escrib/i.test(seeK2) && /type|typed|write/i.test(seeK2en) && seeK2en.split(/\s+/).length < 40, { seeK2, seeK2en });

    // ---- QUX-4: measured non-text contrast of essential boundaries ----
    const lum = (rgb) => { const [r, g, b] = rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const ratio = (a, b) => { const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x); return (l1 + 0.05) / (l2 + 0.05); };
    // Computed colours are resolved to sRGB bytes through a canvas (oklch tokens serialize as oklch).
    const TO_RGB = `const toRgb = (c) => { const cv = document.createElement('canvas'); cv.width = cv.height = 1; const x = cv.getContext('2d'); x.clearRect(0, 0, 1, 1); x.fillStyle = c; x.fillRect(0, 0, 1, 1); return [...x.getImageData(0, 0, 1, 1).data]; };`;
    const measure = async (sel) => evaluate(`(() => { ${TO_RGB} const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return null;
      const border = toRgb(getComputedStyle(el).borderTopColor); let p = el.parentElement, bg = null; while (p) { const c = toRgb(getComputedStyle(p).backgroundColor); if (c[3] === 255) { bg = c; break; } p = p.parentElement; } return { sel: ${JSON.stringify(sel)}, border, bg, width: getComputedStyle(el).borderTopWidth }; })()`);
    const essentials = [];
    await reset('35', 'A', 'en'); essentials.push(await measure('#board-input'), await measure('#typed-input'));
    await choose('role', 'parent'); await action('load-sample'); essentials.push(await measure('#obs-input'), await measure('#due-input'));
    await reset('68', 'C', 'en'); await action('propose-open'); essentials.push(await measure('#prop-task'), await measure('#prop-note'));
    await reset('K2', 'A', 'en'); essentials.push(await measure('.tenframe span[data-fill=""]'));
    await action('start'); await action('done'); await action('select'); essentials.push(await measure('.soundboxes span'));
    const decorative = await measure('.panel');
    const rows = essentials.map((m) => ({ ...m, ratio: m && m.border && m.bg ? +ratio(m.border.slice(0, 3), m.bg.slice(0, 3)).toFixed(2) : null }));
    report.contrast = { essentials: rows, decorativePanel: { ...decorative, ratio: decorative && +ratio(decorative.border.slice(0, 3), decorative.bg.slice(0, 3)).toFixed(2) } };
    check('QUX-4 enabled input boundaries and K–2 counting geometry measure ≥ 3:1 against their backgrounds', rows.length === 8 && rows.every((r) => r.ratio !== null && r.ratio >= 3), rows);
    const textc = await evaluate(`(() => { ${TO_RGB} const el = document.querySelector('.small'); let p = el, bg = null; while (p) { const c = toRgb(getComputedStyle(p).backgroundColor); if (c[3] === 255) { bg = c; break; } p = p.parentElement; } return { fg: toRgb(getComputedStyle(el).color), bg, ring: getComputedStyle(document.documentElement).getPropertyValue('--ring').trim() }; })()`);
    check('QUX-4 small text contrast stays ≥ 4.5:1 and the focus ring token is unchanged', ratio(textc.fg.slice(0, 3), textc.bg.slice(0, 3)) >= 4.5 && textc.ring === 'oklch(0.52 0.09 195)', textc);
    await shot('qux4-desktop-K2-A-student-en-board');
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await reset('K2', 'A', 'en'); await evaluate('document.querySelector(".board").scrollIntoView({ block: "start" })'); await shot('qux4-phone-K2-A-student-en-board');

    check('no runtime, CSP or console errors during quality flows', report.exceptions.length === 0, report.exceptions);
    check('no HTTP(S) requests from the prototype', report.externalRequests.length === 0, report.externalRequests);
  } finally {
    if (ws) ws.close();
    chrome.kill('SIGTERM');
    await Promise.race([exited, delay(2000)]);
    if (chrome.exitCode === null && chrome.signalCode === null) { chrome.kill('SIGKILL'); await exited; }
    fs.rmSync(profile, { recursive: true, force: true });
    report.finished = new Date().toISOString();
    report.summary = { passed: report.checks.filter((x) => x.passed).length, failed: report.checks.filter((x) => !x.passed).length, total: report.checks.length };
    fs.writeFileSync(path.join(OUT, 'quality-e2e.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report.summary));
    if (report.summary.failed) process.exitCode = 1;
  }
}
main().catch((err) => { console.error(err); process.exitCode = 2; });
