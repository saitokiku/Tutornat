'use strict';
/* repair-cycle2.e2e.cjs — bounded browser regression for repair cycle 2 (F2-01…F2-07). Harness helpers are byte-copied from repair-cycle1.e2e.cjs.
 * Real pointer clicks, real key events (Tab / Shift+Tab / Shift+ArrowLeft) and Input.insertText only; window.__demo is
 * read-only inspection. Focus, occlusion, target size and contrast are MEASURED from layout/computed style, not self-reported.
 * Whole-run deadline (RUN_DEADLINE_MS) and per-case isolation; the report is always finalized.
 * Usage: OUT=<new absolute dir> [APP_ROOT=<frontend dir>] node frontend/tests/repair-cycle2.e2e.cjs
 */
const fs = require('node:fs'); const path = require('node:path'); const os = require('node:os');
const { spawn } = require('node:child_process'); const { pathToFileURL } = require('node:url');
const CHROME = process.env.CHROME || '/Users/man/.agent-browser/browsers/chrome-153.0.8010.52/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const ROOT = process.env.APP_ROOT || path.resolve(__dirname, '..');
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');
const OUT = process.env.OUT || path.join(ROOT, 'evidence', 'repair-cycle2', 'e2e-' + STAMP);
const RUN_DEADLINE_MS = Number(process.env.RUN_DEADLINE_MS || 420000);
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const report = { started: new Date().toISOString(), root: ROOT, checks: [], exceptions: [], consoleErrors: [], externalRequests: [], screenshots: [], measurements: {} };
const logLines = []; const log = (s) => { logLines.push(s); console.log(s); };
const t0 = Date.now(); const timeLeft = () => RUN_DEADLINE_MS - (Date.now() - t0);

async function main() {
  if (fs.existsSync(OUT)) throw Error('Refusing to overwrite evidence');
  fs.mkdirSync(OUT, { recursive: true });
  if (!fs.existsSync(CHROME)) throw new Error('Missing Chrome at ' + CHROME);
  const profile = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'edu-fe-r2-'));
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
    const check = (name, pass, detail) => { report.checks.push({ name, passed: !!pass, detail: pass ? undefined : detail }); log(`${pass ? 'PASS' : 'FAIL'} ${name}${pass ? '' : ' ' + String(JSON.stringify(detail)).slice(0, 600)}`); };
    const q = (sel) => `document.querySelector(${JSON.stringify(sel)})`;
    const exists = (sel) => evaluate(`!!${q(sel)}`);
    const text = (sel) => evaluate(`(${q(sel)}||{}).innerText || ''`);
    const mainText = () => evaluate(`document.getElementById('main').innerText`);
    const inc = (hay, ...needles) => needles.every((n) => String(hay).toLowerCase().includes(String(n).toLowerCase()));
    const click = async (sel) => {
      const p = await evaluate(`(() => { const el=${q(sel)}; if(!el) throw Error('Missing control '+${JSON.stringify(sel)}); if (el.disabled || el.getAttribute('aria-disabled')==='true') throw Error('Disabled control '+${JSON.stringify(sel)}); el.scrollIntoView({block:'center'}); const r=el.getBoundingClientRect(); const hit=document.elementFromPoint(r.x+r.width/2, r.y+r.height/2); if(!hit || !(el===hit || el.contains(hit))) throw Error('Occluded control '+${JSON.stringify(sel)}+' hit='+(hit&&hit.tagName)+'.'+(hit&&hit.className)); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...p }); await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...p }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...p }); await delay(80);
    };
    const act = (a, arg) => click(arg !== undefined ? `[data-act="${a}"][data-arg="${arg}"]` : `[data-act="${a}"]`);
    const settle = async (ms = 450) => { await delay(ms); for (let i = 0; i < 40; i++) { const n = await evaluate('window.__demo.ui().pending.length'); if (!n) break; await delay(100); } };
    const type = async (sel, value) => { await click(sel); await evaluate(`(() => { const el=${q(sel)}; el.focus(); el.select && el.select(); return true; })()`); await send('Input.insertText', { text: value }); await delay(40); };
    const append = async (sel, value) => { await click(sel); await evaluate(`(() => { const el=${q(sel)}; el.focus(); if (typeof el.setSelectionRange==='function') el.setSelectionRange(el.value.length, el.value.length); return true; })()`); await send('Input.insertText', { text: value }); await delay(40); };
    const choose = async (sel, value) => { await click(sel); await evaluate(`(() => { const el=${q(sel)}; el.value=${JSON.stringify(value)}; el.dispatchEvent(new Event('change',{bubbles:true})); return el.value; })()`); await delay(60); };
    const KEYS = { Tab: { key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 }, ArrowLeft: { key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 }, Escape: { key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 } };
    const press = async (name, shift) => { const k = KEYS[name]; const modifiers = shift ? 8 : 0; await send('Input.dispatchKeyEvent', { type: 'keyDown', modifiers, ...k }); await send('Input.dispatchKeyEvent', { type: 'keyUp', modifiers, key: k.key, code: k.code, windowsVirtualKeyCode: k.windowsVirtualKeyCode }); await delay(60); };
    const active = () => evaluate(`(() => { const a=document.activeElement; if(!a||a===document.body) return 'body'; return (a.getAttribute('data-fk')||a.id||a.tagName.toLowerCase()) + '|' + (a.innerText||a.value||'').slice(0,40); })()`);
    const activeKey = async () => (await active()).split('|')[0];
    const shot = async (name) => { await delay(200); const r = await send('Page.captureScreenshot', { format: 'png' }); const f = path.join(OUT, name + '.png'); fs.writeFileSync(f, Buffer.from(r.data, 'base64')); report.screenshots.push(f); return f; };
    const state = () => evaluate('window.__demo.ui()');
    const taskIds = (learner) => evaluate(`window.__demo.query.listTasks(${JSON.stringify(learner)}, {status:'all'}).map(t=>({id:t.id,title:t.title,due:t.due,status:t.status,version:t.version,sample:t.sample}))`);
    const go = async (route) => { await act('nav', route); await delay(150); };
    const url = pathToFileURL(path.join(ROOT, 'index.html')).href + '#/today';
    const fresh = async (w = 1440, mobile = false) => { await setWidth(w, mobile); await send('Page.navigate', { url: 'about:blank' }); await delay(60); await send('Page.navigate', { url }); await delay(350); };
    const val = (sel) => evaluate(`(${q(sel)}||{}).value`);
    const scenario = async (name) => { if (!await evaluate(`document.querySelector('.scenario details').open`)) await click('.scenario summary'); await act('scenario', name); };
    const sample = async (learner = 'lrn-35-bea') => { await go('schoolwork'); await act('load-sample'); await settle(180); return taskIds(learner); };
    const openWork = async (id) => { await go('schoolwork'); await act('task-select', id); await go('workspace'); };
    const newForm = async (title) => { await go('schoolwork'); await act('task-new'); await type('#new-title', title); await choose('#new-subject', 'math'); await type('#new-due', '2026-10-06'); };
    const caseRun = async (name, fn) => { if (timeLeft() < 15000) { check(name + ' SKIPPED (run deadline)', false, { timeLeft: timeLeft() }); return; } try { await fn(); } catch (e) { check(name + ' HARNESS', false, e.stack); try { await shot(name + '-harness'); } catch {} } };
    // Measured focus geometry: element rect vs sticky nav bottom and fixed status top, plus a center hit test.
    const focusGeom = () => evaluate(`(() => { const a=document.activeElement; if(!a||a===document.body) return {key:'body'}; const r=a.getBoundingClientRect(); const nav=document.querySelector('.nav'); const nb=nav?nav.getBoundingClientRect().bottom:0; const st=document.getElementById('status'); const stTop=st&&st.textContent?st.getBoundingClientRect().top:innerHeight; const hit=document.elementFromPoint(r.x+r.width/2, r.y+r.height/2); const inNav=!!a.closest('.nav'), inStatus=!!a.closest('.status'); return {key:a.getAttribute('data-fk')||a.id||a.tagName.toLowerCase(), top:Math.round(r.top), bottom:Math.round(r.bottom), left:Math.round(r.left), right:Math.round(r.right), navBottom:Math.round(nb), statusTop:Math.round(stTop), innerHeight, hitOk: !!hit && (hit===a || a.contains(hit)), inNav, inStatus, visible: r.width>0 && r.height>0}; })()`);
    const geomOk = (g) => g.key !== 'body' && g.visible && (g.inNav || g.inStatus || (g.top >= g.navBottom - 1 && g.bottom <= g.statusTop + 1 && g.top >= -1 && g.bottom <= g.innerHeight + 1 && g.hitOk));
    // Canvas-resolved colors (handles oklch) and WCAG contrast.
    const CONTRAST_JS = `const rgbOf=(c)=>{const cv=document.createElement('canvas'); cv.width=1; cv.height=1; const x=cv.getContext('2d',{willReadFrequently:true}); x.clearRect(0,0,1,1); x.fillStyle=c; x.fillRect(0,0,1,1); const d=x.getImageData(0,0,1,1).data; return d[3]===0?null:[d[0],d[1],d[2]];}; const lum=(c)=>{const f=(v)=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2]);}; const ratio=(a,b)=>{const la=lum(a),lb=lum(b);return (Math.max(la,lb)+0.05)/(Math.min(la,lb)+0.05);};`;


    const BEA = 'lrn-35-bea', CAL = 'lrn-68-cal';
    const learner = async (id) => { await choose('#learner-select', id); await delay(120); };
    const events = (taskId) => evaluate(`window.__demo.query.record(${JSON.stringify(taskId)}).map(e=>({type:e.type,source:e.source,detail:e.detail}))`);
    const taskFull = (id) => evaluate(`(() => { const t=window.__demo.query.task(${JSON.stringify(id)}); return t ? {id:t.id,title:t.title,instructions:t.instructions,due:t.due,sample:t.sample,sampleDetached:t.sampleDetached||null,generated:t.generated||null,version:t.version} : null; })()`);
    const stepsOf = (id) => evaluate(`window.__demo.query.session(${JSON.stringify(id)}).steps.map(s=>s.text)`);
    const resetNow = async () => { await act('reset-learner'); await act('dialog-confirm'); await delay(120); };
    const retryShown = () => exists('[data-act="retry"]');
    const EN_MATH = 'Sticker arrays: 15 rows of 15', ES_MATH = 'Arreglos de calcomanías: 15 filas de 15', EN_READ = 'Retell: “The Lost Kite” (sample story)', ES_READ = 'Recuento: «La cometa perdida» (cuento de ejemplo)';

    // ---------------- F2-01 retry identity / reset lifecycle ----------------
    await caseRun('F2-01a reset BEFORE the failed create returns (coordinator C1 sequence)', async () => {
      await fresh(); await newForm('Must not return after reset'); await scenario('fail_once'); await act('new-submit');
      await resetNow(); await settle(500);
      const st = await state(); const tasks = await taskIds(BEA);
      check('F2-01a no task after reset', tasks.length === 0, tasks);
      check('F2-01a obsolete failure offers no Retry', !(await retryShown()) && !st.retryOffered, { st, status: await text('#status') });
      check('F2-01a status still the reset confirmation, not an error', inc(await text('#status'), 'reset') && !inc(await text('#status'), 'failed'), await text('#status'));
      check('F2-01a new-task form stays closed and empty after the obsolete completion', !st.newForm[BEA], st.newForm);
      await shot('F2-01a-1440-reset-before-failure');
    });
    await caseRun('F2-01b failure BEFORE reset: Retry is removed by reset and the task cannot be resurrected', async () => {
      await fresh(); await newForm('Resurrection candidate'); await scenario('fail_once'); await act('new-submit'); await settle(600);
      check('F2-01b failure first offers Retry', await retryShown(), await text('#status'));
      await resetNow(); await settle(200);
      check('F2-01b reset removes the stale Retry', !(await retryShown()) && !(await state()).retryOffered, await text('#status'));
      check('F2-01b no task resurrected', (await taskIds(BEA)).length === 0, await taskIds(BEA));
    });
    await caseRun('F2-01c cross-learner isolation: resetting Cal does not break Bea’s pending/failed create or its retry', async () => {
      await fresh(); await newForm('Bea survives Cal reset'); await scenario('fail_once'); await act('new-submit');
      await learner(CAL); await resetNow(); await settle(600);
      const st = await state();
      check('F2-01c Bea’s failed operation is retained (not dropped by Cal’s reset) and Bea’s form/draft survive', st.retryOffered && st.newForm[BEA] && Object.keys(st.resetGen).join() === CAL, { status: await text('#status'), st });
      // The status bar is single-line: Cal’s reset notice may have replaced the visible Retry button. Either path must yield exactly one Bea task.
      if (await retryShown()) await act('retry'); else { await learner(BEA); check('F2-01c Bea draft text intact after Cal reset', (await val('#new-title')) === 'Bea survives Cal reset', await val('#new-title')); await act('new-submit'); }
      await settle(600);
      const tasks = await taskIds(BEA);
      check('F2-01c retry creates Bea’s task exactly once', tasks.length === 1 && tasks[0].title === 'Bea survives Cal reset', tasks);
      check('F2-01c Cal has no tasks', (await taskIds(CAL)).length === 0, await taskIds(CAL));
    });
    await caseRun('F2-01d retry keeps the original failed step while newer text is being typed', async () => {
      await fresh(); const ids = await sample(); await act('role', 'student'); await openWork(ids[0].id); await act('ws-start'); await settle(200);
      await scenario('fail_once'); await type('#ws-step', 'first attempt'); await act('ws-step-add'); await settle(600);
      check('F2-01d failed step offers Retry and keeps the text', (await retryShown()) && (await val('#ws-step')) === 'first attempt', { v: await val('#ws-step'), s: await text('#status') });
      await append('#ws-step', ' plus newer typing'); await act('retry'); await settle(600);
      check('F2-01d retried step is the ORIGINAL command text, applied once', JSON.stringify(await stepsOf(ids[0].id)) === JSON.stringify(['first attempt']), await stepsOf(ids[0].id));
      check('F2-01d newer typed draft is preserved (not cleared by the retry)', (await val('#ws-step')) === 'first attempt plus newer typing', await val('#ws-step'));
      check('F2-01d no second Retry offered after success', !(await retryShown()), await text('#status'));
    });

    // ---------------- F2-02 newer same-learner context survives a late create ----------------
    await caseRun('F2-02a coordinator C2: delayed create A while student works on B', async () => {
      await fresh(); await newForm('Existing task B'); await act('new-submit'); await settle(200);
      const b = (await taskIds(BEA))[0];
      await act('role', 'student'); await openWork(b.id); await act('ws-start'); await settle(200); await act('role', 'parent');
      await newForm('Pending new task A'); await scenario('delayed'); await act('new-submit');
      await act('role', 'student'); await go('workspace'); await type('#ws-step', 'Unsent thought for task B');
      await settle(1900);
      const after = await state(); const tasks = await taskIds(BEA);
      check('F2-02a B stays selected after A completes', after.selected[BEA] === b.id, { b: b.id, after: after.selected });
      check('F2-02a B work draft text and route survive', (await val('#ws-step')) === 'Unsent thought for task B' && after.route === 'workspace', { v: await val('#ws-step'), route: after.route });
      check('F2-02a A exists for Bea', tasks.length === 2 && tasks.some((t) => t.title === 'Pending new task A'), tasks);
      await shot('F2-02a-1440-late-create-keeps-B');
    });
    await caseRun('F2-02b intake confirm with delay while parent moved to Workspace of B', async () => {
      await fresh(); await newForm('Existing task B'); await act('new-submit'); await settle(200); const b = (await taskIds(BEA))[0];
      await act('task-select', b.id); await act('intake-load'); await act('intake-read'); await scenario('delayed'); await act('intake-confirm');
      await go('workspace'); const mid = await mainText(); await settle(1900);
      const after = await state(); const tasks = await taskIds(BEA);
      check('F2-02b Workspace still shows B after the intake task lands', after.selected[BEA] === b.id && after.route === 'workspace' && inc(await mainText(), 'Existing task B'), { sel: after.selected, route: after.route });
      check('F2-02b intake task was created for Bea', tasks.some((t) => t.title.startsWith('Weather')), tasks);
      check('F2-02b intake review form was cleared (submitted revision)', !inc(await (async () => { await go('schoolwork'); return mainText(); })(), 'Confirm'), null);
    });
    await caseRun('F2-02c same role: user selects task C while create A is pending', async () => {
      await fresh(); await newForm('Task B'); await act('new-submit'); await settle(200); await newForm('Task C'); await act('new-submit'); await settle(200);
      const c = (await taskIds(BEA)).find((t) => t.title === 'Task C'); const b = (await taskIds(BEA)).find((t) => t.title === 'Task B');
      await act('task-select', b.id); await newForm('Task A pending'); await scenario('delayed'); await act('new-submit'); await act('task-select', c.id);
      await settle(1900); const st = await state();
      check('F2-02c C remains selected, A not force-selected', st.selected[BEA] === c.id, st.selected);
      check('F2-02c A created and form closed', (await taskIds(BEA)).some((t) => t.title === 'Task A pending') && !st.newForm[BEA], { tasks: await taskIds(BEA), nf: st.newForm });
      check('F2-02c focus not pulled to A row', !(await activeKey()).startsWith('task-select:' + ((await taskIds(BEA)).find((t) => t.title === 'Task A pending') || {}).id), await active());
    });
    await caseRun('F2-02d unchanged context: create still selects its new task with focus on its row', async () => {
      await fresh(); await newForm('Plain create'); await act('new-submit'); await settle(400);
      const t = (await taskIds(BEA))[0]; const st = await state();
      check('F2-02d new task selected', !!t && st.selected[BEA] === t.id, st.selected);
      check('F2-02d focus moved to the new row control', (await activeKey()) === 'task-select:' + t.id, await active());
    });

    // ---------------- F2-03 edit provenance vs locale ----------------
    const dueOnly = async (taskId, dueValue) => { await act('task-edit', taskId); await type('#edit-due', dueValue); await act('edit-submit'); await settle(300); };
    await caseRun('F2-03a open sample edit in ES, switch EN, due-only save (reviewer S3) — no false title/instructions edit, sample kept', async () => {
      await fresh(); const ids = await sample(); const rd = ids.find((t) => t.sample === 'reading-retell');
      await act('locale', 'es'); await act('task-edit', rd.id); await act('locale', 'en');
      check('F2-03a edit form keeps the opened (ES) rendering as its own draft across locale switch', (await val('#edit-title')) === ES_READ, await val('#edit-title'));
      await type('#edit-due', '2026-10-20'); await act('edit-submit'); await settle(300);
      const after = await taskFull(rd.id); const evs = (await events(rd.id)).filter((e) => e.type === 'edited');
      check('F2-03a stored title/instructions bytes canonical EN, sample attached', after.title === EN_READ && after.sample === 'reading-retell' && !after.sampleDetached && after.due === '2026-10-20', after);
      check('F2-03a only the due edit recorded', evs.length === 1 && JSON.stringify(evs[0].detail.changed) === JSON.stringify(['due']), evs);
      check('F2-03a generated provenance intact for both fields', !!after.generated && !!after.generated.title && !!after.generated.instructions, after.generated);
      await act('locale', 'es'); check('F2-03a ES Schoolwork still shows Spanish generated title', inc(await mainText(), ES_READ), (await mainText()).slice(0, 400));
    });
    await caseRun('F2-03b EN→ES variant with the math sample, then Workspace help/checker still attached', async () => {
      await fresh(); const ids = await sample(); const m = ids.find((t) => t.sample === 'math-arrays');
      await act('task-edit', m.id); await act('locale', 'es'); await type('#edit-due', '2026-10-21'); await act('edit-submit'); await settle(300);
      const after = await taskFull(m.id); const evs = (await events(m.id)).filter((e) => e.type === 'edited');
      check('F2-03b due-only in ES keeps canonical bytes and sample', after.title === EN_MATH && after.sample === 'math-arrays' && evs.length === 1 && JSON.stringify(evs[0].detail.changed) === JSON.stringify(['due']), { after, evs });
      await act('role', 'student'); await openWork(m.id);
      check('F2-03b Workspace (ES) shows Spanish generated title and attached sample (no edited-sample warning)', inc(await mainText(), ES_MATH) && !inc(await mainText(), 'Editada a partir'), (await mainText()).slice(0, 500));
      await act('locale', 'en');
    });
    await caseRun('F2-03c a genuinely typed field survives locale switches and is saved verbatim; untouched instructions stay generated', async () => {
      await fresh(); const ids = await sample(); const m = ids.find((t) => t.sample === 'math-arrays');
      await act('locale', 'es'); await act('task-edit', m.id); await type('#edit-title', 'Mi título propio'); await act('locale', 'en'); await act('role', 'student'); await act('role', 'parent'); await go('today'); await go('schoolwork');
      check('F2-03c dirty title preserved through locale/role/route changes', (await val('#edit-title')) === 'Mi título propio', await val('#edit-title'));
      await act('edit-submit'); await settle(300); const after = await taskFull(m.id); const evs = (await events(m.id)).filter((e) => e.type === 'edited');
      check('F2-03c title verbatim, instructions bytes canonical, sample detached, instructions provenance kept', after.title === 'Mi título propio' && after.instructions === 'Draw or describe 15 rows with 15 stickers in each row. How many stickers in all?' && after.sample === null && !!after.sampleDetached && after.generated && !after.generated.title && !!after.generated.instructions, after);
      check('F2-03c event lists only title', evs.length === 1 && JSON.stringify(evs[0].detail.changed) === JSON.stringify(['title']), evs);
      await act('locale', 'es'); const es = await mainText();
      check('F2-03c ES shows typed title verbatim and Spanish generated instructions', inc(es, 'Mi título propio') && inc(es, 'Dibuja o describe 15 filas') && !inc(es, 'Draw or describe'), es.slice(0, 600));
      await act('locale', 'en');
    });

    // ---------------- F2-04 instructions-only edit: title stays generated, capability detached ----------------
    await caseRun('F2-04a instructions-only family edit (reviewer S2): ES renders generated title, verbatim family instructions, no old help', async () => {
      await fresh(); const ids = await sample(); const m = ids.find((t) => t.sample === 'math-arrays');
      await act('task-edit', m.id); await type('#edit-instructions', 'Family: do only the first 5 rows'); await act('edit-submit'); await settle(300);
      const after = await taskFull(m.id);
      check('F2-04a bytes: title canonical EN, instructions family, detached, generated.title kept', after.title === EN_MATH && after.instructions === 'Family: do only the first 5 rows' && after.sample === null && after.sampleDetached && after.sampleDetached.key === 'math-arrays' && after.generated && !!after.generated.title && !after.generated.instructions, after);
      await act('locale', 'es'); const list = await mainText();
      check('F2-04a ES Schoolwork list/detail show Spanish title + verbatim family instructions, not English title', inc(list, ES_MATH, 'Family: do only the first 5 rows') && !inc(list, EN_MATH), list.slice(0, 700));
      await go('today'); check('F2-04a ES parent Today shows Spanish title', inc(await mainText(), ES_MATH), (await mainText()).slice(0, 400));
      await go('plan'); check('F2-04a ES Plan schedule shows Spanish title', inc(await mainText(), ES_MATH), (await mainText()).slice(0, 400));
      await go('record'); check('F2-04a ES Record picker/timeline show Spanish title', inc(await mainText(), ES_MATH), (await mainText()).slice(0, 400));
      await act('role', 'student'); await openWork(m.id); const ws = await mainText();
      check('F2-04a ES Workspace: Spanish title, edited-sample warning, no story/checker/hint capability', inc(ws, ES_MATH, 'Editada a partir') && !inc(ws, 'Sticker arrays'), ws.slice(0, 700));
      await act('ws-start'); await settle(200); await act('help', 'hint'); await settle(300);
      const asst = await evaluate(`window.__demo.query.session(${JSON.stringify(m.id)}).assistance.map(a=>({kind:a.kind,available:a.available}))`);
      check('F2-04a help after detach is recorded as requested/unavailable (capability not restored by display provenance)', asst.length === 1 && asst[0].kind === 'requested' && asst[0].available === false, asst);
      await shot('F2-04a-1440-es-workspace-detached-generated-title');
      await act('locale', 'en'); await act('role', 'parent'); await go('schoolwork');
      await act('task-edit', m.id); await type('#edit-title', 'Second edit title'); await act('edit-submit'); await settle(300);
      const after2 = await taskFull(m.id); await act('locale', 'es');
      check('F2-04a second edit: title now verbatim in ES, provenance gone', after2.title === 'Second edit title' && after2.generated === null && inc(await mainText(), 'Second edit title') && !inc(await mainText(), ES_MATH), { after2, main: (await mainText()).slice(0, 300) });
      await act('locale', 'en');
    });
    await caseRun('F2-04b authored text equal to a canonical sample string is NOT treated as generated', async () => {
      await fresh(); await newForm(EN_MATH); await act('new-submit'); await settle(300); const t = (await taskIds(BEA))[0];
      check('F2-04b no provenance on an authored task', (await taskFull(t.id)).generated === null, await taskFull(t.id));
      await act('locale', 'es'); check('F2-04b ES keeps the authored English title verbatim', inc(await mainText(), EN_MATH) && !inc(await mainText(), ES_MATH), (await mainText()).slice(0, 400)); await act('locale', 'en');
    });

    // ---------------- F2-05 / F2-06 / F2-07 copy ----------------
    // Disclosure panel only (the page also carries the unrelated 'product proposal' cadence notice).
    const disclosure = () => evaluate(`(() => { const s=[...document.querySelectorAll('section.panel')].find(x=>/What your parent can see|Lo que puede ver tu madre/.test(x.getAttribute('aria-label')||'')); return s ? s.innerText : ''; })()`);
    await caseRun('F2-05 band-aware student Record disclosure', async () => {
      await fresh(); await sample(); await act('role', 'student'); await go('record');
      const bea = await disclosure(); check('F2-05 EN grades 3–5 omits proposals, keeps steps/help/checks/stuck/done/observations', !!bea && !inc(bea, 'proposal') && inc(bea, 'every step', 'help', 'answer checks', 'stuck', 'done', 'observations'), bea);
      await learner(CAL); const cal = await disclosure(); check('F2-05 EN grades 6–8 includes proposals', inc(cal, 'date proposals'), cal);
      await act('locale', 'es'); const calEs = await disclosure(); check('F2-05 ES 6–8 includes propuestas', inc(calEs, 'propuestas de fecha'), calEs);
      await learner(BEA); const beaEs = await disclosure(); check('F2-05 ES 3–5 omits propuestas', !!beaEs && !inc(beaEs, 'propuesta') && inc(beaEs, 'cada paso'), beaEs);
      await setWidth(390, true); await shot('F2-05-390-es-student-record-35'); await setWidth(1440, false); await act('locale', 'en');
    });
    await caseRun('F2-06 parent Workspace uses a parent-facing shared-record label', async () => {
      await fresh(); const ids = await sample(); await go('schoolwork'); await act('task-select', ids[0].id); await go('workspace');
      const en = await mainText(); check('F2-06 EN parent label', inc(en, 'Shared record for this task') && !inc(en, 'What your parent can see'), en.slice(0, 600));
      await act('locale', 'es'); const es = await mainText(); check('F2-06 ES parent label', inc(es, 'Registro compartido de esta tarea') && !inc(es, 'Lo que puede ver tu madre/padre'), es.slice(0, 600));
      await setWidth(320, true); await shot('F2-06-320-es-parent-workspace-shared-record'); await setWidth(1440, false);
      await act('role', 'student'); await go('record'); check('F2-06 ES student disclosure heading unchanged', inc(await mainText(), 'Lo que puede ver tu madre/padre'), (await mainText()).slice(0, 400)); await act('locale', 'en');
    });
    await caseRun('ADAPTER R14 Schoolwork count label with learner prefix (adjudicated regex artifact, behavior unchanged)', async () => {
      await fresh(); await sample(); const meta = await evaluate(`document.querySelector('.view-head .meta').innerText`);
      check('ADAPTER EN plural with prefix', meta === 'Bea · 2 tasks shown', meta);
      await act('locale', 'es'); const metaEs = await evaluate(`document.querySelector('.view-head .meta').innerText`);
      check('ADAPTER ES plural with prefix', /^Bea · 2 /.test(metaEs) && !/\b1 /.test(metaEs), metaEs); await act('locale', 'en');
      await act('task-archive', (await taskIds(BEA))[0].id); await act('dialog-confirm'); await settle(300);
      check('ADAPTER EN singular with prefix', (await evaluate(`document.querySelector('.view-head .meta').innerText`)) === 'Bea · 1 task shown', await evaluate(`document.querySelector('.view-head .meta').innerText`));
    });
    await caseRun('F2-07 tally save text singular/plural EN/ES', async () => {
      await fresh(); const ids = await sample(); await act('role', 'student'); await openWork(ids[0].id); await act('ws-start'); await settle(200);
      await act('tally-save'); await settle(300); await act('tile', 0); await act('tally-save'); await settle(300); await act('tile', 0); await act('tile', 1); await act('tally-save'); await settle(300);
      await act('locale', 'es'); await act('tile', 3); await act('tally-save'); await settle(300); await act('tile', 3); await act('tile', 4); await act('tally-save'); await settle(300);
      const st = await stepsOf(ids[0].id);
      check('F2-07 saved tally texts', JSON.stringify(st) === JSON.stringify(['Tally: 0 marks', 'Tally: 1 mark', 'Tally: 2 marks', 'Conteo: 1 marca', 'Conteo: 2 marcas']), st);
      await setWidth(768, false); await shot('F2-07-768-es-student-workspace-tally'); await setWidth(1440, false); await act('locale', 'en');
    });
    check('no external requests', report.externalRequests.length === 0, report.externalRequests);
    check('no uncaught exceptions', report.exceptions.length === 0, report.exceptions);
    check('no console errors', report.consoleErrors.length === 0, report.consoleErrors);
  } finally {
    report.finished = new Date().toISOString(); report.durationMs = Date.now() - t0;
    report.summary = { passed: report.checks.filter((c) => c.passed).length, failed: report.checks.filter((c) => !c.passed).length, screenshots: report.screenshots.length };
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(OUT, 'log.txt'), logLines.join('\n') + '\n');
    log(`SUMMARY passed=${report.summary.passed} failed=${report.summary.failed} screenshots=${report.summary.screenshots} durationMs=${report.durationMs} out=${OUT}`);
    try { ws && ws.close(); } catch {}
    chrome.kill('SIGTERM'); await delay(300); try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
    if (report.summary.failed) process.exitCode = 1;
  }
}
main().catch((e) => { log('HARNESS ERROR ' + (e && e.stack || e)); fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, 'log.txt'), logLines.join('\n') + '\n'); process.exit(2); });
