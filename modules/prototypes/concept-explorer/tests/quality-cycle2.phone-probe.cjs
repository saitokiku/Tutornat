// Quality repair cycle 2 — SHORT isolated PHONE-STALL reproduction (diagnostic only; no app change).
// Plumbing copied from evidence/coordinator-quality-cycle1/cross-task-probe.cjs; changes: one fresh Chrome
// per variant, 3 s CDP timeout, Debugger.pause watchdog on a stalled evaluate (captures the running JS
// stack if the renderer is executing app code), elementFromPoint hit-test before every real click, no
// debug dispatch. Output: evidence/quality-fix-cycle2/phone/.
'use strict';
const fs = require('node:fs'); const path = require('node:path'); const os = require('node:os');
const { spawn } = require('node:child_process'); const { pathToFileURL } = require('node:url');
const ROOT = path.resolve(__dirname, '..');
const OUT = process.env.QC2_OUT || path.join(ROOT, 'evidence', 'quality-fix-cycle2', 'phone');
const CHROME = process.env.CHROME || path.join(os.homedir(), '.agent-browser/browsers/chrome-153.0.8010.52/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const VARIANTS = [
  { name: 'V1-profiler+enterOnTurns', profiler: true, enterOnTurns: true, focusTurns: true },
  { name: 'V2-noProfiler+enterOnTurns', profiler: false, enterOnTurns: true, focusTurns: true },
  { name: 'V3-profiler+focusTurnsNoEnter', profiler: true, enterOnTurns: false, focusTurns: true },
  { name: 'V4-profiler+noTurnsFocus', profiler: true, enterOnTurns: false, focusTurns: false },
  // H3: the original stalled after a desktop→phone emulation switch mid-session and long Tab sweeps with an evaluate per Tab.
  { name: 'V5-desktopFirst+midSessionPhoneSwitch+longSweeps+profiler', profiler: true, enterOnTurns: true, focusTurns: true, desktopFirst: true, longSweeps: true }
];
const ONLY = process.env.QC2_VARIANT;
async function runVariant(v) {
  const log = { variant: v.name, ops: [], exceptions: [], dialogs: [], externalRequests: [], stall: null, pausedStack: null };
  const profile = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'edu-qc2-phone-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--window-size=390,844', 'about:blank'], { stdio: 'ignore' });
  const exited = new Promise((resolve) => chrome.once('exit', resolve));
  let ws;
  try {
    let port; for (let i = 0; i < 60 && !port; i++) { try { port = Number(fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]); } catch {} if (!port) await delay(100); }
    const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    let seq = 0; const pending = new Map(); let paused = null;
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) { const { resolve, reject, timer } = pending.get(m.id); clearTimeout(timer); pending.delete(m.id); if (m.error) reject(new Error(JSON.stringify(m.error))); else resolve(m.result); }
      if (m.method === 'Runtime.exceptionThrown') log.exceptions.push(m.params.exceptionDetails);
      if (m.method === 'Page.javascriptDialogOpening') log.dialogs.push(m.params);
      if (m.method === 'Network.requestWillBeSent' && /^https?:/.test(m.params.request.url)) log.externalRequests.push(m.params.request.url);
      if (m.method === 'Debugger.paused') paused = m.params.callFrames.map((f) => `${f.functionName || '(anon)'} @${(f.url || '').split('/').pop()}:${f.location.lineNumber + 1}`);
    };
    const send = (method, params = {}, ms = 3000) => new Promise((resolve, reject) => {
      const id = ++seq; const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout ${ms}ms: ${method}`)); }, ms);
      pending.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params }));
    });
    const t0 = Date.now();
    const op = async (label, fn) => {
      const t = Date.now();
      try { const r = await fn(); log.ops.push({ label, ok: true, ms: Date.now() - t, at: t - t0, result: r }); console.log(`  ok   ${label} ${Date.now() - t}ms ${JSON.stringify(r) || ''}`.slice(0, 220)); return r; }
      catch (err) {
        log.ops.push({ label, ok: false, ms: Date.now() - t, at: t - t0, error: String(err.message) }); console.log(`  FAIL ${label}: ${err.message}`);
        if (/CDP timeout/.test(err.message) && !log.stall) {
          log.stall = { label, error: err.message };
          // Watchdog: is the renderer executing app JS (H1) or is the command pipeline itself stalled (H2)?
          try { await send('Debugger.pause', {}, 3000); await delay(500); log.pausedStack = paused || 'Debugger.pause acknowledged but no Debugger.paused event (no JS running)'; try { await send('Debugger.resume', {}, 2000); } catch {} }
          catch (e2) { log.pausedStack = 'Debugger.pause also timed out: ' + e2.message; }
          console.log('  WATCHDOG ' + JSON.stringify(log.pausedStack).slice(0, 600));
          throw err;
        }
        throw err;
      }
    };
    const evaluate = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
    const DESCRIBE = `(() => { const a = document.activeElement; if (!a || a === document.body) return 'body'; const act = a.dataset && a.dataset.act; return (act ? '[data-act="' + act + '"]' + (a.dataset.arg !== undefined ? '[data-arg="' + a.dataset.arg + '"]' : '') : a.id ? '#' + a.id : a.tagName.toLowerCase() + (a.className ? '.' + String(a.className).trim().split(/\\s+/).join('.') : '')) + ' y=' + Math.round(a.getBoundingClientRect().y) + ' scrollY=' + Math.round(window.scrollY); })()`;
    const active = () => evaluate(DESCRIBE);
    const click = async (selector) => {
      const p = await evaluate(`(() => { const el=document.querySelector(${JSON.stringify(selector)}); if(!el || el.disabled) throw Error('Missing/disabled control: '+${JSON.stringify(selector)}); el.scrollIntoView({block:'center'}); const r=el.getBoundingClientRect(); const x=r.x+r.width/2, y=r.y+r.height/2; const h=document.elementFromPoint(x,y); return {x,y,hit:h?(h.tagName.toLowerCase()+(h.dataset&&h.dataset.act?'[data-act='+h.dataset.act+' '+h.dataset.arg+']':'')+(h.id?'#'+h.id:'')):null, hitIsTarget:h===el||(h&&el.contains(h)), scrollY:Math.round(window.scrollY)}; })()`);
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x, y: p.y });
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, x: p.x, y: p.y });
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, x: p.x, y: p.y });
      await delay(120);
      return p;
    };
    const KEYS = { Tab: { key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 }, Enter: { key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' } };
    const press = async (name) => { const k = KEYS[name]; await send('Input.dispatchKeyEvent', { type: 'keyDown', ...k }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k.key, code: k.code, windowsVirtualKeyCode: k.windowsVirtualKeyCode }); await delay(60); };
    await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable'); await send('Debugger.enable');
    await send('Emulation.setFocusEmulationEnabled', { enabled: true });
    if (v.desktopFirst) await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    else await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await send('Page.navigate', { url: pathToFileURL(path.join(ROOT, 'index.html')).href });
    for (let i = 0; i < 60; i++) { if (await evaluate('!!window.__companionDebug')) break; await delay(100); }
    const OBSCURED = `(() => { const a=document.activeElement; if(!a||a===document.body) return {el:'body'}; const r=a.getBoundingClientRect(); const b=document.getElementById('boundary').getBoundingClientRect(); const hidden=Math.max(0, Math.min(r.bottom,b.bottom)-Math.max(r.top,b.top)); const hit=document.elementFromPoint(r.x+r.width/2, r.y+r.height/2); return { el:a.tagName.toLowerCase()+(a.dataset&&a.dataset.act?'[data-act='+a.dataset.act+']':'')+(a.id?'#'+a.id:''), hiddenFraction:r.height?hidden/r.height:0, hitBanner:!!(hit&&document.getElementById('boundary').contains(hit)), scrollY:Math.round(window.scrollY) }; })()`;
    const shiftTab = async () => { await send('Input.dispatchKeyEvent', { type: 'keyDown', modifiers: 8, ...KEYS.Tab }); await send('Input.dispatchKeyEvent', { type: 'keyUp', modifiers: 8, key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 }); await delay(60); };
    if (v.desktopFirst) {
      await op('desktop: reset student 35/A en twice (real clicks)', async () => { for (let k = 0; k < 2; k++) { await click('[data-act="lang"][data-arg="en"]'); await click('[data-act="band"][data-arg="35"]'); await click('[data-act="concept"][data-arg="A"]'); await click('[data-act="role"][data-arg="student"]'); await click('[data-act="reset"]'); } return active(); });
      await op('desktop: 14x Shift+Tab sweep from the read-summary select control (evaluate per step)', async () => { await evaluate(`(() => { const el=document.querySelector('[data-act="select"][data-arg="35-read-summary"]'); el.scrollIntoView({block:'center'}); el.focus({preventScroll:true}); })()`); const rows = []; for (let i = 0; i < 14; i++) { await shiftTab(); const o = await evaluate(OBSCURED); if (o.el === 'body') break; rows.push(o.el); } return rows.length; });
      await op('switch emulation to phone 390x844 mobile mid-session', () => send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }));
      await delay(300);
    }
    if (v.profiler) { await send('Profiler.enable'); await send('Profiler.start'); }
    try {
      if (v.longSweeps) {
        await op('phone: reset + 12x Shift+Tab sweep from typed submit (evaluate per step)', async () => { await click('[data-act="lang"][data-arg="en"]'); await click('[data-act="band"][data-arg="35"]'); await click('[data-act="concept"][data-arg="A"]'); await click('[data-act="role"][data-arg="student"]'); await click('[data-act="reset"]'); await evaluate(`(() => { const el=document.querySelector('form[data-form="typed"] button[type="submit"]'); el.scrollIntoView({block:'center'}); el.focus({preventScroll:true}); })()`); const rows = []; for (let i = 0; i < 12; i++) { await shiftTab(); const o = await evaluate(OBSCURED); if (o.el === 'body') break; rows.push(o.el); } return rows.length; });
      }
      await op('reset student 35/A en (real clicks)', async () => { await click('[data-act="lang"][data-arg="en"]'); await click('[data-act="band"][data-arg="35"]'); await click('[data-act="concept"][data-arg="A"]'); await click('[data-act="role"][data-arg="student"]'); await click('[data-act="reset"]'); return active(); });
      await op('5x play + typed turn (overflowing history)', async () => { for (let i = 0; i < 5; i++) await click('[data-act="play"]'); await click('#typed-input'); await send('Input.insertText', { text: 'one more' }); await press('Enter'); await delay(200); return evaluate(`(() => { const t=document.querySelector('.turns'); return { overflow: t.scrollHeight > t.clientHeight, sh: t.scrollHeight, ch: t.clientHeight }; })()`); });
      if (v.longSweeps) {
        await op('phone: Tab x25 looking for .turns (as original), then forward 40x Tab sweep with obscured evaluate per step', async () => { await evaluate('document.activeElement && document.activeElement.blur()'); let found = false; for (let i = 0; i < 25; i++) { await press('Tab'); if (await evaluate(`document.activeElement===document.querySelector('.turns')`)) { found = true; break; } if ((await active()) === 'body') break; } await evaluate('document.activeElement && document.activeElement.blur(); window.scrollTo(0,0)'); const fwd = []; for (let i = 0; i < 40; i++) { await press('Tab'); const o = await evaluate(OBSCURED); if (o.el === 'body') break; fwd.push(o.el + ':' + o.hiddenFraction.toFixed(2)); } return { found, fwd: fwd.length, last: fwd.slice(-3) }; });
        await op('blur + scrollTo(0,0) + ONE Tab (original skip-link step) + Enter', async () => { await evaluate('document.activeElement && document.activeElement.blur(); window.scrollTo(0,0)'); await press('Tab'); const before = await active(); await press('Enter'); await delay(200); return { before, after: await active() }; });
      }
      await op('blur + scrollTo(0,0)', () => evaluate('document.activeElement && document.activeElement.blur(); window.scrollTo(0,0); ' + DESCRIBE));
      if (v.focusTurns && !v.longSweeps) {
        await op('Tab until ol.turns is focused (real Tab, max 30)', async () => { for (let i = 0; i < 30; i++) { await press('Tab'); const a = await active(); if (a.startsWith('ol.turns')) return { tabs: i + 1, a }; } return { tabs: 30, a: await active() }; });
        if (v.enterOnTurns) await op('Enter on ol.turns (expected: no application action)', async () => { const before = await active(); await press('Enter'); await delay(200); return { before, after: await active(), dialogs: log.dialogs.length }; });
      }
      await op('real click lang/en (hit test logged)', () => click('[data-act="lang"][data-arg="en"]'));
      await op('active after lang/en', active);
      await op('real click band/35', () => click('[data-act="band"][data-arg="35"]'));
      await op('real click concept/A', () => click('[data-act="concept"][data-arg="A"]'));
      await op('real click role/parent', () => click('[data-act="role"][data-arg="parent"]'));
      await op('real click reset', () => click('[data-act="reset"]'));
      await op('active + role after full reset to parent', () => evaluate(`({ a: ${DESCRIBE}, role: document.getElementById('app').dataset.role, band: document.getElementById('app').dataset.band })`));
      if (v.profiler) await op('Profiler.stop', async () => { const r = await send('Profiler.stop', {}, 5000); return { nodes: r.profile.nodes.length, ms: Math.round((r.profile.endTime - r.profile.startTime) / 1000) }; });
      try { const shot = await send('Page.captureScreenshot', { format: 'png' }, 5000); fs.writeFileSync(path.join(OUT, v.name + '-final.png'), Buffer.from(shot.data, 'base64')); } catch (e) { log.ops.push({ label: 'screenshot', ok: false, error: e.message }); }
    } catch (err) { log.aborted = String(err.message); }
  } finally {
    if (ws) ws.close(); chrome.kill('SIGTERM'); await Promise.race([exited, delay(2000)]);
    if (chrome.exitCode === null && chrome.signalCode === null) { chrome.kill('SIGKILL'); await exited; }
    fs.rmSync(profile, { recursive: true, force: true });
  }
  log.summary = { ops: log.ops.length, failed: log.ops.filter((o) => !o.ok).length, stalled: !!log.stall, exceptions: log.exceptions.length, dialogs: log.dialogs.length, externalRequests: log.externalRequests.length };
  return log;
}
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const all = [];
  for (const v of VARIANTS.filter((x) => !ONLY || x.name.startsWith(ONLY))) { console.log('== ' + v.name); const l = await runVariant(v); all.push(l); console.log('   summary ' + JSON.stringify(l.summary)); }
  fs.writeFileSync(path.join(OUT, ONLY ? `phone-stall-probe-${ONLY}.json` : 'phone-stall-probe.json'), JSON.stringify({ started: new Date().toISOString(), variants: all }, null, 2));
  console.log(JSON.stringify(all.map((l) => ({ variant: l.variant, ...l.summary, stall: l.stall, pausedStack: l.pausedStack }))));
})().catch((err) => { console.error(err); process.exitCode = 2; });
