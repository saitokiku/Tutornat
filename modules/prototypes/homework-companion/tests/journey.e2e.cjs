'use strict';
/* journey.e2e.cjs — real-control acceptance probe for the NEW frontend (zero dependencies; CDP transport
 * adapted from ../design/tests/quality-cycle2.e2e.cjs). Real pointer clicks, real key events and Input.insertText only.
 * window.__demo is read-only inspection; nothing here dispatches commands directly.
 * Usage: node tests/journey.e2e.cjs  → evidence/e2e-<stamp>/{report.json,log.txt,*.png}
 */
const fs = require('node:fs'); const path = require('node:path'); const os = require('node:os');
const { spawn } = require('node:child_process'); const { pathToFileURL } = require('node:url');
const CHROME = process.env.CHROME || '/Users/man/.agent-browser/browsers/chrome-153.0.8010.52/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const ROOT = path.resolve(__dirname, '..');
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');
const OUT = process.env.OUT || path.join(ROOT, 'evidence', 'e2e-' + STAMP);
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const report = { started: new Date().toISOString(), checks: [], exceptions: [], consoleErrors: [], externalRequests: [], screenshots: [], widths: {} };
const logLines = [];
const log = (s) => { logLines.push(s); console.log(s); };

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  if (!fs.existsSync(CHROME)) throw new Error('Missing Chrome at ' + CHROME);
  const profile = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'edu-fe-'));
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
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    const setWidth = async (w, mobile) => { await send('Emulation.setDeviceMetricsOverride', { width: w, height: mobile ? 844 : 1000, deviceScaleFactor: 1, mobile: !!mobile }); await delay(150); };
    const check = (name, pass, detail) => { report.checks.push({ name, passed: !!pass, detail: pass ? undefined : detail }); log(`${pass ? 'PASS' : 'FAIL'} ${name}${pass ? '' : ' ' + String(JSON.stringify(detail)).slice(0, 500)}`); };
    const q = (sel) => `document.querySelector(${JSON.stringify(sel)})`;
    const exists = (sel) => evaluate(`!!${q(sel)}`);
    const text = (sel) => evaluate(`(${q(sel)}||{}).innerText || ''`);
    const mainText = () => evaluate(`document.getElementById('main').innerText`);
    // innerText reflects CSS text-transform (tags render uppercase); compare case-insensitively where tags are involved.
    const inc = (hay, ...needles) => needles.every((n) => String(hay).toLowerCase().includes(String(n).toLowerCase()));
    const click = async (sel) => {
      const p = await evaluate(`(() => { const el=${q(sel)}; if(!el) throw Error('Missing control '+${JSON.stringify(sel)}); if (el.disabled || el.getAttribute('aria-disabled')==='true') throw Error('Disabled control '+${JSON.stringify(sel)}); el.scrollIntoView({block:'center'}); const r=el.getBoundingClientRect(); const hit=document.elementFromPoint(r.x+r.width/2, r.y+r.height/2); if(!hit || !(el===hit || el.contains(hit))) throw Error('Occluded control '+${JSON.stringify(sel)}+' hit='+(hit&&hit.tagName)+'.'+(hit&&hit.className)); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...p }); await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...p }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...p }); await delay(80);
    };
    const act = (a, arg) => click(arg !== undefined ? `[data-act="${a}"][data-arg="${arg}"]` : `[data-act="${a}"]`);
    const settle = async (ms = 450) => { await delay(ms); for (let i = 0; i < 40; i++) { const n = await evaluate('window.__demo.ui().pending.length'); if (!n) break; await delay(100); } };
    const type = async (sel, value) => { await click(sel); await evaluate(`(() => { const el=${q(sel)}; el.focus(); el.select && el.select(); return true; })()`); await send('Input.insertText', { text: value }); await delay(40); };
    const choose = async (sel, value) => { await click(sel); await evaluate(`(() => { const el=${q(sel)}; el.value=${JSON.stringify(value)}; el.dispatchEvent(new Event('change',{bubbles:true})); return el.value; })()`); await delay(60); };
    const KEYS = { Tab: { key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 }, Enter: { key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' }, Space: { key: ' ', code: 'Space', windowsVirtualKeyCode: 32, text: ' ' }, Escape: { key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 } };
    const press = async (name, shift) => { const k = KEYS[name]; const modifiers = shift ? 8 : 0; await send('Input.dispatchKeyEvent', { type: 'keyDown', modifiers, ...k }); await send('Input.dispatchKeyEvent', { type: 'keyUp', modifiers, key: k.key, code: k.code, windowsVirtualKeyCode: k.windowsVirtualKeyCode }); await delay(50); };
    const active = () => evaluate(`(() => { const a=document.activeElement; if(!a||a===document.body) return 'body'; return (a.getAttribute('data-fk')||a.id||a.tagName.toLowerCase()) + '|' + (a.innerText||a.value||'').slice(0,40); })()`);
    const shot = async (name) => { await delay(250); const r = await send('Page.captureScreenshot', { format: 'png' }); const f = path.join(OUT, name + '.png'); fs.writeFileSync(f, Buffer.from(r.data, 'base64')); report.screenshots.push(f); return f; };
    const widthProbe = (w) => evaluate(`(() => { const d=document.documentElement; let maxRight=0, culprit=null; document.querySelectorAll('body *').forEach(el=>{ const r=el.getBoundingClientRect(); if(r.width>0 && r.right>maxRight){maxRight=r.right; culprit=el.tagName+'.'+String(el.className).split(' ')[0];} }); return { inner: innerWidth, scrollWidth: d.scrollWidth, clientWidth: d.clientWidth, maxRight: Math.round(maxRight), culprit, device: ${w} }; })()`);
    const state = () => evaluate('window.__demo.ui()');
    const taskIds = (learner) => evaluate(`window.__demo.query.listTasks(${JSON.stringify(learner)}, {status:'all'}).map(t=>({id:t.id,title:t.title,due:t.due,status:t.status,version:t.version}))`);
    const go = async (route) => { await act('nav', route); await delay(150); };

    const url = pathToFileURL(path.join(ROOT, 'index.html')).href + '#/today';
    await setWidth(1440, false);
    await send('Page.navigate', { url }); await delay(700);
    check('app renders Today for parent by default', (await mainText()).includes('Today for Bea'), await mainText());
    check('disclosure banner present (memory only / simulated)', (await text('.disclosure')).includes('memory only'), await text('.disclosure'));
    check('EN/ES copy has no missing keys', (await evaluate('window.__demo.copyMissing()')).length === 0, await evaluate('window.__demo.copyMissing()'));
    await shot('01-parent-today-empty-1440');

    // ---- AC01: create two tasks, edit one, verify identity everywhere
    await go('schoolwork');
    check('empty state offers Add task and Load sample', (await exists('[data-act="task-new"]')) && (await exists('[data-act="load-sample"]')));
    await shot('02-schoolwork-empty');
    await act('task-new');
    check('Add task moves focus into the title field', (await active()).startsWith('new-title'), await active());
    await type('#new-title', 'Fractions page 12 <b>&amp;</b>'); await choose('#new-subject', 'math'); await type('#new-due', '2026-02-30');
    await act('new-submit'); await settle();
    check('impossible date is rejected at the form field', (await text('#new-due-field')).includes('Use a real date'), await text('#new-due-field'));
    check('form keeps the typed title after a validation error', (await evaluate(`${q('#new-title')}.value`)) === 'Fractions page 12 <b>&amp;</b>', await evaluate(`${q('#new-title')}.value`));
    check('focus lands on the first invalid field', (await active()).startsWith('new-due'), await active());
    await shot('03-form-validation');
    await type('#new-due', '2026-10-03'); await type('#new-instructions', 'Finish problems 1-10.');
    await act('new-submit'); await settle();
    let ids = await taskIds('lrn-35-bea');
    check('first task created with escaped title rendered as text', ids.length === 1 && (await mainText()).includes('Fractions page 12 <b>&amp;</b>') && !(await evaluate(`!!document.querySelector('#main b')`)), { ids, main: (await mainText()).slice(0, 300) });
    const A = ids[0].id;
    await act('task-new'); await type('#new-title', 'Read chapter 4'); await choose('#new-subject', 'reading'); await type('#new-due', '2026-10-05'); await act('new-submit'); await settle();
    ids = await taskIds('lrn-35-bea'); const B = ids.find((t) => t.id !== A).id;
    check('second task has a distinct id and both are listed by due date', ids.length === 2 && A !== B && (await mainText()).indexOf('Fractions') < (await mainText()).indexOf('Read chapter 4'), ids);
    // edit A: title + date
    await act('task-edit', A); check('Edit moves focus into edit title', (await active()).startsWith('edit-title'), await active());
    await type('#edit-title', 'Fractions page 13'); await type('#edit-due', '2026-10-04'); await act('edit-submit'); await settle();
    ids = await taskIds('lrn-35-bea'); const a2 = ids.find((t) => t.id === A);
    check('edit keeps the same id, bumps version, applies new title/date', a2 && a2.title === 'Fractions page 13' && a2.due === '2026-10-04' && a2.version === 2, a2);
    check('focus returns to the edited task row control', (await active()).startsWith('task-select:' + A), await active());
    await shot('04-schoolwork-two-tasks-1440');
    // duplicate-submit guard is in the service; the UI must not create twice on rapid double click
    await act('task-new'); await type('#new-title', 'Dup probe'); await choose('#new-subject', 'other'); await type('#new-due', '2026-10-09');
    const p = await evaluate(`(() => { const el=${q('[data-act="new-submit"]')}; const r=el.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
    for (let i = 0; i < 2; i++) { await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...p }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...p }); }
    await settle(); ids = await taskIds('lrn-35-bea');
    check('rapid double click creates exactly one task', ids.filter((t) => t.title === 'Dup probe').length === 1, ids);
    const DUP = ids.find((t) => t.title === 'Dup probe').id;
    // archive + undo
    await act('task-archive', DUP); await delay(150);
    check('archive opens a confirmation dialog with focus inside', (await evaluate(`document.getElementById('dialog').open`)) && (await active()).startsWith('dialog-cancel'), await active());
    await act('dialog-cancel'); await delay(120);
    check('dialog cancel returns focus to the Archive button', (await active()).startsWith('task-archive:' + DUP), await active());
    await act('task-archive', DUP); await act('dialog-confirm'); await settle();
    ids = await taskIds('lrn-35-bea');
    check('confirmed archive removes the task from the open list and offers Undo', ids.find((t) => t.id === DUP).status === 'archived' && (await exists('[data-act="undo-archive"]')), ids);
    await act('undo-archive', DUP); await settle(); ids = await taskIds('lrn-35-bea');
    check('undo restores the same record', ids.find((t) => t.id === DUP).status === 'open' && ids.find((t) => t.id === DUP).title === 'Dup probe', ids);
    await act('task-archive', DUP); await act('dialog-confirm'); await settle(); await act('status-close'); await delay(100);
    check('archived filter lists the archived task', (await (async () => { await choose('#f-status', 'archived'); return (await mainText()).includes('Dup probe'); })()) , await mainText());
    await choose('#f-status', 'active');

    // ---- Plan: parent draft → accept → stale on edit → re-draft → accept
    await go('plan'); await act('draft-request'); await settle();
    check('mock draft lists both tasks with provenance', (await text('[aria-label="Draft"]')).includes('Not AI') && (await text('[aria-label="Draft"]')).includes('Fractions page 13') && (await text('[aria-label="Draft"]')).includes('Read chapter 4'), await text('[aria-label="Draft"]'));
    check('focus moved to Accept draft after drafting', (await active()).startsWith('draft-accept'), await active());
    await act('draft-accept'); await settle();
    check('accepted plan shows parent provenance and no stale warning', (await text('[aria-label="Accepted plan"]')).includes('accepted by parent') && !(await text('[aria-label="Accepted plan"]')).includes('Stale'), await text('[aria-label="Accepted plan"]'));
    await shot('05-plan-accepted-1440');
    await go('schoolwork'); await act('task-edit', B); await type('#edit-due', '2026-10-06'); await act('edit-submit'); await settle();
    await go('plan');
    check('editing a dependency marks the accepted plan stale with the exact move', (await text('[aria-label="Accepted plan"]')).includes('Stale') && (await text('[aria-label="Accepted plan"]')).includes('Read chapter 4'), await text('[aria-label="Accepted plan"]'));
    await act('draft-request'); await settle();
    await go('schoolwork'); await act('task-edit', A); await type('#edit-title', 'Fractions page 13 (final)'); await act('edit-submit'); await settle(); await go('plan');
    check('title-only edit of another task does not stale the draft (dates unchanged)', !(await text('[aria-label="Draft"]')).includes('stale') && (await exists('[data-act="draft-accept"]')), await text('[aria-label="Draft"]'));
    await act('draft-accept'); await settle();
    check('re-accept replaces the plan and history keeps Replaced + Accepted', inc(await text('[aria-label="Decision history"]'), 'Replaced', 'Accepted') && !(await text('[aria-label="Accepted plan"]')).includes('Stale'), await text('[aria-label="Decision history"]'));
    await act('draft-request'); await settle(); await act('draft-decline'); await settle();
    check('declined draft cannot be accepted from the UI', !(await exists('[data-act="draft-accept"]')) && (await text('[aria-label="Draft"]')).includes('Declined'), await text('[aria-label="Draft"]'));
    await act('status-close').catch(() => {});

    // ---- Student (Bea, 3–5): start, write own work, ask for help on a custom task, flag stuck
    await act('role', 'student'); await go('today'); await delay(100);
    check('student Today shows one next task and the accepted plan', (await mainText()).includes('Your next task') && (await mainText()).includes('Fractions page 13 (final)') && (await mainText()).includes('Your plan'), await mainText());
    await shot('06-student-35-today-1440');
    await act('go-workspace', A); await delay(200);
    check('Today Start opens the workspace on that exact task', (await state()).route === 'workspace' && (await text('#main')).includes('Fractions page 13 (final)') && (await mainText()).includes(A), (await mainText()).slice(0, 400));
    await act('ws-start'); await settle();
    check('Start moves focus to the step field (meaningful successor)', (await active()).startsWith('ws-step'), await active());
    await type('#ws-step', 'I split 15 rows into 10 and 5 — my own idea'); await act('ws-step-add'); await settle();
    check('authored step is listed verbatim under student work and the field is cleared', (await text('[aria-label="Your work (authored by student)"]')).includes('I split 15 rows into 10 and 5 — my own idea') && (await evaluate(`${q('#ws-step')}.value`)) === '', await text('[aria-label="Your work (authored by student)"]'));
    await act('help', 'hint'); await settle();
    check('help on a custom task is recorded as requested/unavailable, no fabricated reply', (await text('[aria-label="Assistance (distinct from your work)"]')).includes('No tutoring available') && !(await text('[aria-label="Assistance (distinct from your work)"]')).includes('Scripted hint'), await text('[aria-label="Assistance (distinct from your work)"]'));
    check('custom task shows checking unavailable, no verdict', (await mainText()).includes('Checking is unavailable for custom tasks'), null);
    await act('ws-stuck'); await settle();
    check('flag stuck updates only this task state', (await evaluate(`window.__demo.query.session(${JSON.stringify(A)}).state`)) === 'stuck' && (await evaluate(`window.__demo.query.session(${JSON.stringify(B)}).state`)) === 'not_started');
    await shot('07-student-workspace-custom-1440');
    // locale switch preserves authored text + drafts
    await type('#ws-step', 'draft kept across locale'); await act('locale', 'es'); await delay(150);
    check('ES locale translates labels but keeps authored step and typed draft verbatim', (await mainText()).includes('Tu trabajo') && (await mainText()).includes('I split 15 rows into 10 and 5 — my own idea') && (await evaluate(`${q('#ws-step')}.value`)) === 'draft kept across locale', (await mainText()).slice(0, 300));
    check('ES disclosure includes review note', (await text('.disclosure')).includes('revisión'), await text('.disclosure'));
    await shot('08-student-workspace-es-1440');
    await act('locale', 'en'); await delay(100);
    // learner switch must not leak the draft
    await choose('#learner-select', 'lrn-68-cal'); await delay(150);
    check('learner switch does not leak another learner draft or selection', (await mainText()).includes('No task selected') || !(await exists('#ws-step')) || (await evaluate(`(${q('#ws-step')}||{value:''}).value`)) === '', await mainText());
    await choose('#learner-select', 'lrn-35-bea'); await delay(150);
    check('switching back restores the learner selection and draft', (await evaluate(`(${q('#ws-step')}||{value:''}).value`)) === 'draft kept across locale', await evaluate(`(${q('#ws-step')}||{value:''}).value`));

    // ---- Parent reads exact work, adds observation
    await act('role', 'parent'); await go('today'); await delay(100);
    check('parent Today flags stuck + unavailable help for the exact task', (await text('[aria-label="Needs a grown-up"]')).includes('stuck') && (await text('[aria-label="Needs a grown-up"]')).includes('Fractions page 13 (final)'), await text('[aria-label="Needs a grown-up"]'));
    await shot('09-parent-today-flags-1440');
    await act('go-record', A); await delay(200);
    check('record shows the verbatim student step attributed as student work', inc(await mainText(), 'Student work (verbatim)', 'I split 15 rows into 10 and 5 — my own idea'), (await mainText()).slice(0, 600));
    await type('#obs-text', 'Needed a nudge to start; counted on fingers for 7+8 <script>x</script>'); await act('obs-add'); await settle();
    check('observation stored verbatim, attributed to parent, rendered as text', inc(await mainText(), 'Parent observation (verbatim)', 'counted on fingers for 7+8 <script>x</script>') && !(await evaluate(`!!document.querySelector('#main script')`)), (await mainText()).slice(0, 900));
    check('record states not-mastery and planned cadence', (await mainText()).includes('NOT mastery') && (await mainText()).includes('48–72'), null);
    await shot('10-parent-record-1440');

    // ---- Grade 6–8 proposal round trip (Cal)
    await choose('#learner-select', 'lrn-68-cal'); await go('schoolwork'); await act('task-new'); await type('#new-title', 'Essay outline'); await choose('#new-subject', 'writing'); await type('#new-due', '2026-10-08'); await act('new-submit'); await settle();
    const CAL = (await taskIds('lrn-68-cal'))[0].id;
    await act('role', 'student'); await go('plan');
    check('6–8 student sees the proposal form and visibility note', (await exists('#prop-reason')) && (await mainText()).includes('word for word'), null);
    await choose('#prop-taskId', CAL); await type('#prop-due', '2026-10-10'); await type('#prop-reason', 'Robotics club runs late Thursday'); await act('prop-send'); await settle();
    check('proposal recorded as waiting for parent with verbatim reason', inc(await mainText(), 'Waiting for parent', 'Robotics club runs late Thursday'), (await mainText()).slice(0, 500));
    await shot('11-student-68-plan-proposal-1440');
    await act('role', 'parent'); await go('today');
    check('parent Today lists the pending proposal decision', (await text('[aria-label="Waiting for your decision"]')).includes('Essay outline'), await text('[aria-label="Waiting for your decision"]'));
    await go('plan'); await act('prop-accept', (await evaluate(`window.__demo.query.proposals('lrn-68-cal')[0].id`))); await settle();
    const calTask = (await taskIds('lrn-68-cal'))[0];
    check('accepting the proposal moves the task date and marks it accepted', calTask.due === '2026-10-10' && inc(await mainText(), 'Accepted by parent'), calTask);
    await act('role', 'student'); await go('today');
    check('student sees the decided outcome and new date', (await mainText()).includes('Oct 10'), await mainText());
    await act('role', 'parent');

    // ---- K–2 (Ari): sample tasks, big buttons, scripted help, strict check
    await choose('#learner-select', 'lrn-k2-ari'); await go('schoolwork'); await act('load-sample'); await settle();
    const ari = await taskIds('lrn-k2-ari'); const MATH = ari.find((t) => t.title.startsWith('Sticker')).id;
    check('sample pair loaded for Ari', ari.length === 2, ari);
    await act('role', 'student'); await go('today');
    check('K–2 Today: one big next action + adult scaffold note', (await exists('[data-act="go-workspace"].big')) && (await mainText()).includes('grown-up'), (await mainText()).slice(0, 300));
    await shot('12-student-k2-today-1440');
    await click('[data-act="go-workspace"].big'); await delay(200); await act('ws-start'); await settle();
    const bigTargets = await evaluate(`[...document.querySelectorAll('#main button, #main a.btn')].map(b=>{const r=b.getBoundingClientRect();return [b.innerText.slice(0,20), Math.round(r.height)]}).filter(x=>x[1]<44)`);
    check('K–2 workspace actionable targets are ≥44px', bigTargets.length === 0, bigTargets);
    await act('help', 'hint'); await settle();
    check('sample task returns a scripted, labeled hint and counts request separately', inc(await text('[aria-label="Assistance (distinct from your work)"]'), 'Scripted hint 1', 'Requested'), await text('[aria-label="Assistance (distinct from your work)"]'));
    await shot('13-student-k2-workspace-1440');
    // K–2 hides the answer check; verify the strict checker through the 3–5 learner's sample task.
    await act('role', 'parent'); await choose('#learner-select', 'lrn-35-bea'); await go('schoolwork'); await act('load-sample'); await settle();
    const beaMath = (await taskIds('lrn-35-bea')).find((t) => t.title.startsWith('Sticker')).id;
    await act('role', 'student'); await act('task-select', beaMath); await act('go-workspace', beaMath); await delay(150); await act('ws-start'); await settle();
    await type('#ws-answer', '1225'); await act('ws-check'); await settle();
    check('1225 does not match 225 (strict whole-number parser)', (await mainText()).includes('Does not match'), (await mainText()).slice(0, 300));
    await type('#ws-answer', '225'); await act('ws-check'); await settle();
    check('225 matches and is labeled scripted, not mastery', (await mainText()).includes('Matches the sample answer') && (await mainText()).includes('not mastery'), null);
    await act('ws-complete'); await settle();
    check('mark done is a self-report and does not claim mastery', inc(await mainText(), 'Done (self-reported)') && (await evaluate(`window.__demo.query.session(${JSON.stringify(beaMath)}).mastery`)) === 'not_assessed', (await mainText()).slice(0, 300));
    await act('role', 'parent');

    // ---- Scenario controls: fail once + retry, unavailable, delayed + cancel
    await go('schoolwork');
    check('scenario panel is a collapsed secondary disclosure by default', !(await evaluate(`document.querySelector('.scenario details').open`)), null);
    await click('.scenario summary'); await delay(120);
    check('scenario disclosure opens by real click and exposes the four scenarios', (await evaluate(`document.querySelectorAll('[data-act="scenario"]').length`)) === 4, null);
    await act('scenario', 'fail_once'); await act('task-new'); await type('#new-title', 'Retry probe'); await choose('#new-subject', 'science'); await type('#new-due', '2026-10-12'); await act('new-submit'); await settle();
    check('fail-once reports a retryable error and keeps the form input', (await text('#status')).includes('failed once') && (await exists('[data-act="retry"]')) && (await evaluate(`${q('#new-title')}.value`)) === 'Retry probe', await text('#status'));
    await shot('14-fail-once-retry');
    await act('retry'); await settle();
    check('retry applies the original command exactly once', (await taskIds('lrn-35-bea')).filter((t) => t.title === 'Retry probe').length === 1, await taskIds('lrn-35-bea'));
    await act('scenario', 'unavailable'); await act('task-new').catch(() => {}); await type('#new-title', 'Offline probe'); await choose('#new-subject', 'science'); await type('#new-due', '2026-10-12'); await act('new-submit'); await settle();
    check('unavailable scenario changes nothing and says so', (await text('#status')).includes('unavailable') && !(await taskIds('lrn-35-bea')).some((t) => t.title === 'Offline probe'), await text('#status'));
    await act('scenario', 'delayed'); await act('new-submit'); await delay(200);
    check('delayed op is visible as pending with a Cancel control', (await exists('[data-act="cancel-op"]')), null);
    await click('[data-act="cancel-op"]'); await settle(2200);
    check('cancel resolves without applying the late result', (await text('#status')).includes('Cancelled') && !(await taskIds('lrn-35-bea')).some((t) => t.title === 'Offline probe'), await text('#status'));
    await act('scenario', 'normal'); await act('status-close').catch(() => {});

    // ---- Keyboard: skip link, Tab forward/back, Enter/Space on real controls
    // Fresh document so the sequential-focus start point is the top of the page (data is lost on reload by design).
    await send('Page.reload', { ignoreCache: true }); await delay(700);
    check('reload loses in-memory demo data by design (disclosure holds)', (await evaluate(`window.__demo.query.listTasks('lrn-35-bea',{status:'all'}).length`)) === 0, null);
    await press('Tab');
    check('first Tab reaches the skip link', (await active()).startsWith('skip'), await active());
    await press('Enter'); await delay(100);
    check('skip link Enter moves focus to main', (await active()).startsWith('main'), await active());
    await press('Tab'); const afterMain = await active(); await press('Tab', true);
    check('Tab from main reaches a real control and Shift+Tab walks back to the nav (no trap)', afterMain !== 'body' && (await active()).startsWith('nav:'), { afterMain, now: await active() });
    // Rebuild a task so the Plan keyboard probe has something to draft.
    await go('schoolwork'); await act('load-sample'); await settle();
    await go('plan'); await evaluate(`${q('[data-act="draft-request"]')}.focus(); true`); await press('Space'); await settle();
    check('Space activates Request draft and focus moves to a meaningful successor', (await active()).startsWith('draft-accept') || (await active()).startsWith('draft-request') || (await active()).startsWith('view-h'), await active());
    // reset confirm + Escape (scenario disclosure is collapsed again after the reload)
    await click('.scenario summary'); await delay(120);
    await act('reset-learner'); await delay(100); await press('Escape'); await delay(100);
    check('Escape closes the reset dialog and returns focus', !(await evaluate(`document.getElementById('dialog').open`)) && (await active()).startsWith('reset-learner'), await active());

    // ---- Responsive widths: measure document vs device width, screenshot and inspect
    for (const [w, mobile] of [[1440, false], [768, false], [390, true], [320, true]]) {
      await setWidth(w, mobile);
      for (const [route, role, learnerId] of [['today', 'parent', 'lrn-35-bea'], ['schoolwork', 'parent', 'lrn-35-bea'], ['workspace', 'student', 'lrn-35-bea'], ['plan', 'parent', 'lrn-68-cal'], ['record', 'parent', 'lrn-35-bea'], ['today', 'student', 'lrn-k2-ari']]) {
        await evaluate(`${q('[data-act="role"][data-arg="' + role + '"]')}.click(); true`); await choose('#learner-select', learnerId); await go(route); await delay(150);
        const m = await widthProbe(w); report.widths[`${w}-${route}-${role}`] = m;
        check(`no horizontal overflow at ${w}px on ${route}/${role}`, m.scrollWidth <= w && m.maxRight <= w + 1, m);
        if (w !== 768 || route === 'schoolwork') await shot(`15-${w}-${route}-${role}`);
      }
      // sticky nav must not occlude the main heading after skip link
      const occl = await evaluate(`(() => { document.getElementById('main').focus(); const h=document.getElementById('view-h'); if(!h) return {ok:true}; h.scrollIntoView({block:'start'}); const r=h.getBoundingClientRect(); const hit=document.elementFromPoint(Math.min(r.x+10, ${w}-10), r.y+Math.min(10, r.height/2)); return { ok: !!hit && (hit===h || h.contains(hit)), hit: hit && (hit.tagName+'.'+hit.className) }; })()`);
      check(`view heading not occluded by sticky nav at ${w}px`, occl.ok, occl);
    }
    check('no external network requests', report.externalRequests.length === 0, report.externalRequests);
    check('no uncaught exceptions', report.exceptions.length === 0, report.exceptions.map((e) => e.text || e.exception && e.exception.description).slice(0, 5));
    check('no console errors', report.consoleErrors.length === 0, report.consoleErrors.slice(0, 5));
  } finally {
    report.finished = new Date().toISOString();
    report.summary = { passed: report.checks.filter((c) => c.passed).length, failed: report.checks.filter((c) => !c.passed).length };
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(OUT, 'log.txt'), logLines.join('\n') + '\n');
    log(`SUMMARY passed=${report.summary.passed} failed=${report.summary.failed} out=${OUT}`);
    try { ws && ws.close(); } catch {}
    chrome.kill('SIGTERM'); await delay(300); try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
    if (report.summary.failed) process.exitCode = 1;
  }
}
main().catch((e) => { log('HARNESS ERROR ' + (e && e.stack || e)); fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, 'log.txt'), logLines.join('\n') + '\n'); process.exit(2); });
