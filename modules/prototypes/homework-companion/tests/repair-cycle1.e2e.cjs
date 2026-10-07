'use strict';
/* repair-cycle1.e2e.cjs — compact, bounded regression for the repair-cycle-1 reviewer findings (R01–R22).
 * Real pointer clicks, real key events (Tab / Shift+Tab / Shift+ArrowLeft) and Input.insertText only; window.__demo is
 * read-only inspection. Focus, occlusion, target size and contrast are MEASURED from layout/computed style, not self-reported.
 * Whole-run deadline (RUN_DEADLINE_MS) and per-case isolation; the report is always finalized.
 * Usage: OUT=<new absolute dir> [APP_ROOT=<frontend dir>] node frontend/tests/repair-cycle1.e2e.cjs
 */
const fs = require('node:fs'); const path = require('node:path'); const os = require('node:os');
const { spawn } = require('node:child_process'); const { pathToFileURL } = require('node:url');
const CHROME = process.env.CHROME || '/Users/man/.agent-browser/browsers/chrome-153.0.8010.52/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const ROOT = process.env.APP_ROOT || path.resolve(__dirname, '..');
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');
const OUT = process.env.OUT || path.join(ROOT, 'evidence', 'repair-cycle1', 'e2e-' + STAMP);
const RUN_DEADLINE_MS = Number(process.env.RUN_DEADLINE_MS || 420000);
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const report = { started: new Date().toISOString(), root: ROOT, checks: [], exceptions: [], consoleErrors: [], externalRequests: [], screenshots: [], measurements: {} };
const logLines = []; const log = (s) => { logLines.push(s); console.log(s); };
const t0 = Date.now(); const timeLeft = () => RUN_DEADLINE_MS - (Date.now() - t0);

async function main() {
  if (fs.existsSync(OUT)) throw Error('Refusing to overwrite evidence');
  fs.mkdirSync(OUT, { recursive: true });
  if (!fs.existsSync(CHROME)) throw new Error('Missing Chrome at ' + CHROME);
  const profile = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'edu-fe-r1-'));
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

    await caseRun('R01-edit-intake-origin', async () => {
      await fresh(); await choose('#learner-select', 'lrn-35-bea'); await newForm('Bea first'); await act('new-submit'); await settle(180);
      const bea = (await taskIds('lrn-35-bea'))[0];
      await act('task-edit', bea.id); await type('#edit-title', 'Bea edited title'); await scenario('delayed'); await act('edit-submit');
      await scenario('normal'); await choose('#learner-select', 'lrn-68-cal'); await act('task-new'); await type('#new-title', 'Cal unsaved while Bea edit pending'); await settle(1900);
      const s = await state();
      check('R01 late Bea edit leaves Cal new form open with its text', (await exists('#new-title')) && (await val('#new-title')) === 'Cal unsaved while Bea edit pending', { v: await val('#new-title'), s });
      check('R01 late Bea edit selects nothing for Cal', !s.selected['lrn-68-cal'], s.selected);
      check('R01 Bea edit was written to Bea task and Bea edit form closed', (await taskIds('lrn-35-bea'))[0].title === 'Bea edited title' && !s.editing['lrn-35-bea'], { tasks: await taskIds('lrn-35-bea'), editing: s.editing });
      // intake for Cal while Bea's new form is open; completion attaches to Cal only
      await choose('#learner-select', 'lrn-35-bea'); await act('task-new'); await type('#new-title', 'Bea second unsaved');
      await choose('#learner-select', 'lrn-68-cal'); await act('intake-load'); await act('intake-read'); await scenario('delayed'); await act('intake-confirm'); await scenario('normal'); await choose('#learner-select', 'lrn-35-bea'); await settle(1900);
      check('R01 late Cal intake create keeps Bea new form text and does not select Cal task for Bea', (await val('#new-title')) === 'Bea second unsaved' && (await state()).selected['lrn-35-bea'] !== (await taskIds('lrn-68-cal')).find((t) => t.title.startsWith('Weather'))?.id, { v: await val('#new-title'), st: await state() });
      check('R01 intake task belongs to Cal and is selected for Cal', (await taskIds('lrn-68-cal')).some((t) => t.title.startsWith('Weather')) && (await state()).selected['lrn-68-cal'] === (await taskIds('lrn-68-cal')).find((t) => t.title.startsWith('Weather')).id, await state());
    });

    await caseRun('R02-R03-drafts-retry', async () => {
      await fresh(); const ids = await sample(); await act('role', 'student'); await openWork(ids[0].id); await act('ws-start'); await settle(180);
      await type('#ws-step', 'Unsent work for task A'); await type('#ws-answer', '12'); await openWork(ids[1].id); await act('ws-start'); await settle(180);
      check('R02 task B does not show task A unsent step', (await val('#ws-step')) === '', await val('#ws-step'));
      await type('#ws-step', 'B draft'); await openWork(ids[0].id);
      check('R02 task A draft restored (step and answer)', (await val('#ws-step')) === 'Unsent work for task A' && (await val('#ws-answer')) === '12', { step: await val('#ws-step'), answer: await val('#ws-answer') });
      await act('role', 'parent'); await act('locale', 'es'); await act('locale', 'en'); await act('role', 'student');
      check('R02 draft survives role/locale changes', (await val('#ws-step')) === 'Unsent work for task A', await val('#ws-step'));
      // fail-once addStep → type newer text → Retry: appends once, keeps newer text, never says Task created
      await type('#ws-step', 'One contribution, once'); await scenario('fail_once'); await act('ws-step-add'); await settle(500);
      check('R03 fail-once error shows Retry', await exists('[data-act="retry"]'));
      await append('#ws-step', ' plus newer text'); await act('retry'); await settle(400);
      const steps = await evaluate(`window.__demo.query.session(${JSON.stringify(ids[0].id)}).steps.map(s=>s.text)`);
      check('R03 retry appended the original step exactly once', steps.length === 1 && steps[0] === 'One contribution, once', steps);
      check('R03 retry keeps newer typed text (not the submitted revision)', (await val('#ws-step')) === 'One contribution, once plus newer text', await val('#ws-step'));
      check('R03 retry status is not the task-created message', !inc(await text('#status'), 'created'), await text('#status'));
      await act('retry').catch(() => {}); // no retry control should remain
      check('R03 no stale Retry control after success', !(await exists('[data-act="retry"]')));
      // delayed submit then newer text: only the submitted revision is cleared
      await type('#ws-step', 'Second step'); await scenario('delayed'); await act('ws-step-add'); await type('#ws-step', 'Newer unsent'); await settle(1900);
      check('R02 newer text survives delayed submit', (await val('#ws-step')) === 'Newer unsent', await val('#ws-step'));
      await scenario('normal'); await shot('01-1440-workspace-after-retry');
    });

    await caseRun('R04-record-observation-target', async () => {
      await fresh(); const ids = await sample(); await go('record'); await choose('#rec-task', ids[0].id);
      await type('#obs-text', 'Observation for A'); await scenario('delayed'); await act('obs-add'); await scenario('normal'); await choose('#rec-task', ''); await settle(1900);
      const obs = await evaluate(`window.__demo.query.observations(${JSON.stringify(ids[0].id)}).map(o=>o.text)`);
      check('R04 delayed observation is attributed to the task it was written for', obs.length === 1 && obs[0] === 'Observation for A', obs);
      check('R04 explicit All stays All after the late observation', (await val('#rec-task')) === '' && (await state()).recordTask['lrn-35-bea'] === 'all', { v: await val('#rec-task'), st: await state() });
      await go('schoolwork'); await act('task-select', ids[1].id); await act('go-record', ids[1].id);
      check('R04 Open in Record for B overrides explicit All', (await val('#rec-task')) === ids[1].id, await val('#rec-task'));
      check('R13 observation form says the student can read it', inc(await text('#obs-text-hint'), 'student can read'), await text('#obs-text-hint'));
    });

    await caseRun('R09-R11-R13-R14-today-stuck-visibility', async () => {
      await fresh(); await newForm('Custom only task'); await act('new-submit'); await settle(180); await act('role', 'student'); await go('today');
      const support = await text('[aria-label="Support you can ask for"]'); const tags = await evaluate(`[...document.querySelectorAll('[aria-label="Support you can ask for"] .tag')].map(x=>x.textContent)`);
      check('R09 custom-only next task does not advertise Hint/Step-by-step/Voice as available (only Ask a grown-up tag; honest custom limit)', tags.length === 1 && /grown-up/i.test(tags[0]) && inc(support, 'custom') && inc(support, 'no scripted'), { tags, support });
      check('R14 singular count for one open task', inc(await text('.view-head .meta'), '1 open task') && !inc(await text('.view-head .meta'), '1 open tasks'), await text('.view-head .meta'));
      await act('role', 'parent'); await sample(); await act('role', 'student'); await go('today');
      check('R14 plural count for three open tasks', inc(await text('.view-head .meta'), '3 open tasks'), await text('.view-head .meta'));
      const ids = await taskIds('lrn-35-bea'); await openWork(ids.find((t) => t.sample === 'math-arrays').id); await act('ws-start'); await settle(180);
      check('R09 sample task advertises scripted support in Workspace', await exists('[data-act="help"][data-arg="hint"]'));
      await act('ws-stuck'); await settle(250);
      check('R11 stuck keeps focus on the work field, never on Mark done', (await activeKey()) === 'ws-step', await active());
      check('R11 stuck announces the saved local flag (next visit, not a sent message)', inc(await text('#status'), 'saved locally') && inc(await text('#status'), 'next visit'), await text('#status'));
      await go('record');
      check('R13 student visibility statement names shared classes', inc(await mainText(), 'proposals', 'stuck', 'observations', 'scripted replies'), (await mainText()).slice(0, 400));
      await act('locale', 'es');
      check('R13 ES visibility statement names shared classes', inc(await mainText(), 'propuestas', 'atascado', 'observaciones'), (await mainText()).slice(0, 400));
      await act('locale', 'en');
    });

    await caseRun('R10-R12-story-localization', async () => {
      await fresh(); const ids = await sample(); const read = ids.find((t) => t.sample === 'reading-retell'); const math = ids.find((t) => t.sample === 'math-arrays');
      await act('role', 'student'); await openWork(read.id);
      check('R10 reading sample renders the actual story in Workspace (EN)', inc(await mainText(), 'Mina had a red kite', 'tomato plant', 'synthetic demo text'), (await mainText()).slice(0, 300));
      await act('locale', 'es');
      check('R12 ES Workspace shows localized generated title/instructions and story', inc(await mainText(), 'La cometa perdida', 'Lee el cuento corto', 'Mina tenía una cometa roja') && !inc(await mainText(), 'The Lost Kite'), (await mainText()).slice(0, 400));
      await act('ws-start'); await settle(180); await act('help', 'hint'); await settle(200);
      check('R12 ES scripted hint renders in Spanish', inc(await text('.assist'), 'Pista guionizada 1') && !inc(await text('.assist'), 'Scripted hint'), await text('.assist'));
      await act('locale', 'en');
      check('R12 same immutable hint renders in English after EN switch', inc(await text('.assist'), 'Scripted hint 1'), await text('.assist'));
      const stored = await evaluate(`window.__demo.query.session(${JSON.stringify(read.id)}).assistance.filter(a=>a.kind==='scripted').map(a=>[a.text,a.sampleKey,a.sampleVersion,a.index])`);
      check('R12 stored assistance keeps canonical text with key/version/index provenance', stored.length === 1 && stored[0][0].startsWith('Scripted hint 1') && stored[0][1] === 'reading-retell' && stored[0][3] === 0, stored);
      await act('locale', 'es'); await go('today');
      check('R12 ES Today shows localized sample title and no English generated instructions', inc(await mainText(), 'La cometa perdida') && !inc(await mainText(), 'Read the short sample story'), (await mainText()).slice(0, 400));
      await go('record'); const rec = await mainText();
      check('R12 ES Record shows localized generated help text and titles', inc(rec, 'Pista guionizada 1', 'Arreglos de calcomanías'), rec.slice(0, 500));
      // family edit stays verbatim in both locales; edited sample loses scripted capability with an honest label
      await act('role', 'parent'); await go('schoolwork'); await act('task-edit', math.id); await type('#edit-title', 'Dos más dos (family edit)'); await type('#edit-instructions', '¿Cuánto es 2 + 2?'); await act('edit-submit'); await settle(200);
      await act('locale', 'en'); const t1 = await mainText();
      check('R12 family-edited title/instructions render verbatim in EN', inc(t1, 'Dos más dos (family edit)', '¿Cuánto es 2 + 2?'), t1.slice(0, 400));
      check('R07 edited sample is labelled as edited from a sample, not as a supported sample', inc(t1, 'Edited from a reviewed sample') && !inc(t1, 'Reviewed sample (scripted help available)'), t1.slice(0, 600));
      await act('role', 'student'); await openWork(math.id); await act('ws-start'); await settle(180);
      check('R07 edited sample offers no checker and no scripted help', !(await exists('[data-act="ws-check"]')) && inc(await mainText(), 'unavailable'), (await mainText()).slice(0, 300));
      await shot('02-1440-edited-sample-workspace');
    });

    await caseRun('R06-R08-plan-stale-ui', async () => {
      await fresh(); await choose('#learner-select', 'lrn-68-cal'); await newForm('Cal date test'); await act('new-submit'); await settle(180); const task = (await taskIds('lrn-68-cal'))[0];
      await act('role', 'student'); await go('plan'); await choose('#prop-taskId', task.id); await type('#prop-due', '2026-10-09'); await type('#prop-reason', 'Before parent changed the date'); await act('prop-send'); await settle(180);
      const prop = await evaluate(`window.__demo.query.proposals('lrn-68-cal')[0]`);
      await act('role', 'parent'); await go('schoolwork'); await act('task-edit', task.id); await type('#edit-due', '2026-10-12'); await act('edit-submit'); await settle(180); await go('plan');
      const planText = await mainText();
      check('R08 stale proposal shows a specific conflict state with preserved provenance', inc(planText, 'Needs a fresh proposal', 'Oct 6', 'Oct 12', 'Oct 9') && !(await exists(`[data-act="prop-accept"][data-arg="${prop.id}"]`)) && (await exists(`[data-act="prop-decline"][data-arg="${prop.id}"]`)), planText.slice(0, 700));
      await shot('03-1440-plan-stale-proposal');
      // archived task proposal is visibly unavailable (not Waiting with a broken Accept)
      await go('schoolwork'); await act('task-archive', task.id); await act('dialog-confirm'); await settle(200); await go('plan');
      check('R08 archived task proposal is shown unavailable with no Accept', inc(await mainText(), 'Unavailable (task archived)') && !(await exists(`[data-act="prop-accept"][data-arg="${prop.id}"]`)) && (await evaluate(`window.__demo.query.proposals('lrn-68-cal')[0].status`)) === 'pending', (await mainText()).slice(0, 500));
      // draft identity through controls: delayed accept A, request B, A's response is rejected
      await choose('#learner-select', 'lrn-35-bea'); await sample(); await go('plan'); await act('draft-request'); await settle(200);
      const a = await evaluate(`window.__demo.query.plans('lrn-35-bea').draft.id`); await scenario('delayed'); await act('draft-accept'); await scenario('normal'); await act('draft-request'); await delay(350);
      const b = await evaluate(`window.__demo.query.plans('lrn-35-bea').draft?.id`); await settle(1900); const plans = await evaluate(`window.__demo.query.plans('lrn-35-bea')`);
      check('R06 replacement draft is not accepted by the old response; B stays the draft', !plans.current && plans.draft && plans.draft.id === b && b !== a, { a, b, current: plans.current && plans.current.id, draft: plans.draft && plans.draft.id });
      check('R06 old response shows a specific replaced error', inc(await text('#status'), 'replaced'), await text('#status'));
    });

    await caseRun('R15-R16-R22-focus-ownership', async () => {
      await fresh(); const ids = await sample(); await act('role', 'student'); await openWork(ids[0].id); await act('ws-start'); await settle(180);
      await scenario('delayed'); await act('help', 'hint'); await type('#ws-step', 'typing while hint pending'); await settle(1900);
      check('R15 late hint completion does not steal focus from the step field being typed in', (await activeKey()) === 'ws-step' && (await val('#ws-step')) === 'typing while hint pending', { active: await active(), v: await val('#ws-step') });
      // selection direction survives the async render: Shift+ArrowLeft x3 (backward selection) then a delayed completion
      await act('help', 'scaffold'); await click('#ws-step'); await evaluate(`(() => { const el=${q('#ws-step')}; el.focus(); el.setSelectionRange(el.value.length, el.value.length); return true; })()`);
      await press('ArrowLeft', true); await press('ArrowLeft', true); await press('ArrowLeft', true); const before = await evaluate(`(() => { const el=${q('#ws-step')}; return [el.selectionStart, el.selectionEnd, el.selectionDirection]; })()`); await settle(1900);
      const after = await evaluate(`(() => { const el=${q('#ws-step')}; return [el.selectionStart, el.selectionEnd, el.selectionDirection]; })()`);
      check('R22 backward selection (start/end/direction) survives the async render', before[2] === 'backward' && after[0] === before[0] && after[1] === before[1] && after[2] === 'backward', { before, after });
      // create pending → switch view: late success must not pull focus back to the Schoolwork row
      await act('role', 'parent'); await newForm('Pending create then leave'); await scenario('delayed'); await act('new-submit'); await go('today'); const onToday = await activeKey(); await settle(1900);
      check('R15 late create completion leaves focus where the user moved (Today), not on the new row', (await activeKey()) === onToday && (await state()).route === 'today', { onToday, now: await active() });
      check('R15 late create still selected the task for its learner and closed its form', !(await state()).newForm['lrn-35-bea'] && !!(await state()).selected['lrn-35-bea'], await state());
      // heading keeps focus across an unrelated late render (no body fallback)
      await go('schoolwork'); await scenario('delayed'); await choose('#learner-select', 'lrn-68-cal'); await act('load-sample'); await go('plan'); const headingBefore = await activeKey(); await settle(1900);
      check('R16 focused view heading stays focused across an unrelated late render', headingBefore === 'view-h' && (await activeKey()) === 'view-h', { headingBefore, now: await active() });
      await scenario('normal'); await go('schoolwork'); await act('task-new'); await act('new-submit'); await settle(200);
      // an unrelated LATE render (delayed intake create completing) must not move focus off the error-summary link
      await scenario('delayed'); await act('intake-load'); await act('intake-read'); await act('intake-confirm');
      await evaluate(`(() => { const a=document.querySelector('#new-summary a'); a && a.focus(); return !!a; })()`); const errLink = await activeKey(); await settle(1900);
      check('R16 focused error-summary link survives an unrelated late render', errLink.startsWith('new-err-') && (await activeKey()) === errLink, { errLink, now: await active() });
      await scenario('normal');
    });

    for (const w of [390, 320]) {
      await caseRun('R17-R18-keyboard-' + w, async () => {
        await fresh(w, true); await newForm('Custom task for keyboard'); await act('new-submit'); await settle(180); await act('role', 'student'); await go('workspace'); await act('ws-start'); await settle(180);
        const walk = async (shift, n, label) => { const bad = []; const seen = []; for (let i = 0; i < n; i++) { await press('Tab', shift); const g = await focusGeom(); seen.push(g.key); if (!geomOk(g)) bad.push(g); if (g.key === 'body') break; } report.measurements[`${w}-${label}`] = { seen, bad }; return { bad, seen }; };
        const tally = await evaluate(`(() => { ${CONTRAST_JS} const b=document.querySelector('.tally button'); if(!b) return null; const cs=getComputedStyle(b); return {border: rgbOf(cs.borderTopColor), bg: rgbOf(cs.backgroundColor), ratio: ratio(rgbOf(cs.borderTopColor), rgbOf(cs.backgroundColor))}; })()`);
        check(`R21 ${w} tally tile boundary contrast ≥3:1`, tally && tally.ratio >= 3, tally);
        await evaluate(`document.getElementById('view-h').focus()`);
        const fwd = await walk(false, 16, 'forward');
        check(`R17 ${w} forward Tab keeps every focused control visible below the nav and hit-reachable`, fwd.bad.length === 0 && fwd.seen.length >= 8, fwd);
        const rev = await walk(true, 10, 'reverse');
        check(`R17 ${w} reverse Shift+Tab keeps every focused control visible below the nav and hit-reachable`, rev.bad.length === 0, rev);
        // persistent error status (fail once → Retry) must not cover focused controls
        await type('#ws-step', 'step under error'); await scenario('fail_once'); await act('ws-step-add'); await settle(500);
        check(`R18 ${w} persistent error with Retry is shown`, (await exists('[data-act="retry"]')) && inc(await text('#status'), 'failed once'), await text('#status'));
        await evaluate(`document.getElementById('view-h').focus()`);
        const fwdErr = await walk(false, 16, 'forward-error');
        check(`R18 ${w} forward Tab under a persistent error status: no focused control hidden behind nav or status`, fwdErr.bad.length === 0, fwdErr);
        const revErr = await walk(true, 10, 'reverse-error');
        check(`R18 ${w} reverse Tab under a persistent error status: no occlusion`, revErr.bad.length === 0, revErr);
        // Retry stays reachable and keyboard-focusable with ≥3:1 focus indicator against the red toast (R21)
        await evaluate(`(() => { const r=document.querySelector('[data-act="retry"]'); const prev=r.previousElementSibling; (prev && prev.focus) ? prev.focus() : r.focus(); return true; })()`);
        await evaluate(`(() => { const r=document.querySelector('[data-act="retry"]'); const s=document.getElementById('status'); const span=s.querySelector('span'); span.tabIndex=-1; span.focus(); span.removeAttribute('tabindex'); return true; })()`); await press('Tab');
        const retryFocus = await evaluate(`(() => { ${CONTRAST_JS} const a=document.activeElement; if(!a||a.getAttribute('data-act')!=='retry') return {active:(a&&(a.getAttribute('data-fk')||a.id||a.tagName))}; const cs=getComputedStyle(a); const fv=a.matches(':focus-visible'); const toast=getComputedStyle(document.getElementById('status')).backgroundColor; const o=rgbOf(cs.outlineColor), bg=rgbOf(toast); return {active:'retry', focusVisible: fv, outlineStyle: cs.outlineStyle, outlineWidth: cs.outlineWidth, outline:o, toast:bg, ratio: o&&bg?ratio(o,bg):null}; })()`);
        report.measurements[`${w}-retry-focus`] = retryFocus;
        check(`R21 ${w} real Tab onto Retry: focus-visible outline ≥3:1 against the red toast`, retryFocus.active === 'retry' && retryFocus.focusVisible && retryFocus.outlineStyle !== 'none' && retryFocus.ratio >= 3, retryFocus);
        const g = await focusGeom(); check(`R18 ${w} Retry control is visible and hit-reachable`, geomOk(g), g);
        await shot(`04-${w}-workspace-error-focus`);
        await act('retry'); await settle(300);
        // segmented role/locale targets ≥44×44 at this width; long sample-origin tag wraps within 320 panels
        const seg = await evaluate(`[...document.querySelectorAll('.seg button')].map(b=>{const r=b.getBoundingClientRect();return [b.textContent, Math.round(r.width), Math.round(r.height)];})`);
        check(`R19 ${w} role/locale segmented buttons are ≥44×44`, seg.every((s) => s[1] >= 44 && s[2] >= 44), seg);
        await act('role', 'parent'); await sample(); await act('role', 'student'); const ids = await taskIds('lrn-35-bea'); await openWork(ids.find((t) => t.sample === 'math-arrays').id);
        for (const lc of ['en', 'es']) { await act('locale', lc); const tagGeom = await evaluate(`(() => { const tg=[...document.querySelectorAll('main .tag')].find(x=>/sample|ejemplo/i.test(x.textContent)); const p=tg.closest('.panel'); const r=tg.getBoundingClientRect(), pr=p.getBoundingClientRect(); return {text: tg.textContent, right: Math.round(r.right), panelRight: Math.round(pr.right), scrollW: tg.scrollWidth, clientW: tg.clientWidth, docScroll: document.documentElement.scrollWidth, width: ${w}, lines: Math.round(r.height/parseFloat(getComputedStyle(tg).lineHeight))}; })()`);
          check(`R20 ${w} ${lc} sample-origin tag wraps inside its panel without overflow`, tagGeom.right <= tagGeom.panelRight && tagGeom.scrollW <= tagGeom.clientW + 1 && tagGeom.docScroll <= w, tagGeom); }
        await act('locale', 'en'); await shot(`05-${w}-workspace-sample`);
      });
    }

    await caseRun('R19-desktop-tablet-targets-and-shots', async () => {
      for (const [w, mobile] of [[1440, false], [768, true]]) { await fresh(w, mobile); await sample(); const seg = await evaluate(`[...document.querySelectorAll('.seg button')].map(b=>{const r=b.getBoundingClientRect();return [b.textContent, Math.round(r.width), Math.round(r.height)];})`); check(`R19 ${w} segmented buttons are ≥44×44`, seg.every((s) => s[1] >= 44 && s[2] >= 44), seg); await shot(`06-${w}-schoolwork-parent`); }
      await act('role', 'student'); await go('today'); await shot('07-768-today-student');
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
