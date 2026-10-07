/* Coordinator-owned spec regressions. Real DOM controls, isolated local Chrome.
 * No packages, no external network or live product services. Run:
 *   node tests/spec.e2e.cjs
 * Reports failures without stopping at the first one. Application changes must
 * fix these behaviors, not weaken/remove checks to obtain a green report.
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
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const report = { checks: [], exceptions: [], externalRequests: [], screenshots: [], started: new Date().toISOString() };

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  if (!fs.existsSync(CHROME)) throw new Error('Missing local Chrome; set CHROME explicitly');
  const profile = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'edu-parent-spec-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' });
  const exited = new Promise(resolve => chrome.once('exit', resolve));
  let ws;
  try {
    let port;
    for (let i=0; i<60; i++) {
      if (chrome.exitCode !== null) throw new Error('Owned Chrome exited before readiness');
      try { port = Number(fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]); } catch {}
      if (port) break;
      await delay(100);
    }
    if (!port) throw new Error('No owned Chrome DevToolsActivePort after 6 seconds');
    const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    const target = targets.find(t => t.type === 'page');
    if (!target) throw new Error('No owned page target');
    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.onopen=resolve; ws.onerror=reject; });
    let seq=0; const pending=new Map();
    ws.onmessage = ev => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) {
        const { resolve, reject, timer } = pending.get(m.id); clearTimeout(timer); pending.delete(m.id);
        if (m.error) reject(new Error(JSON.stringify(m.error))); else resolve(m.result);
      }
      if (m.method === 'Runtime.exceptionThrown') report.exceptions.push(m.params.exceptionDetails);
      if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') report.exceptions.push(m.params.entry);
      if (m.method === 'Network.requestWillBeSent' && /^https?:/.test(m.params.request.url)) report.externalRequests.push(m.params.request.url);
    };
    const send = (method, params={}) => new Promise((resolve,reject) => {
      const id=++seq; const timer=setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); },10000);
      pending.set(id,{resolve,reject,timer}); ws.send(JSON.stringify({id,method,params}));
    });
    const evaluate = async expression => {
      const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
      if(r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
      return r.result.value;
    };
    const click = async selector => {
      const p=await evaluate(`(() => { const el=document.querySelector(${JSON.stringify(selector)}); if(!el || el.disabled) throw Error('Missing/disabled control: '+${JSON.stringify(selector)}); el.scrollIntoView({block:'center'}); const r=el.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
      await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...p});
      await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...p});
      await delay(260);
    };
    const fill = async (selector,text) => evaluate(`(() => { const el=document.querySelector(${JSON.stringify(selector)}); if(!el) throw Error('Missing input'); el.value=${JSON.stringify(text)}; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    const submit = async (name) => click(`form[data-form="${name}"] button[type="submit"]`);
    const choose = (act,arg) => click(`[data-act="${act}"][data-arg="${arg}"]`);
    const action = act => click(`[data-act="${act}"]`);
    const check = (name,pass,detail) => { report.checks.push({name,passed:!!pass,detail}); console.log(`${pass?'PASS':'FAIL'} ${name}`); };
    const shot = async name => {
      await delay(300);
      const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
      const file=path.join(OUT,name+'.png'); fs.writeFileSync(file,Buffer.from(r.data,'base64')); report.screenshots.push(file);
    };
    const reset = async (band='35',concept='A',locale='en') => {
      await choose('lang',locale); await choose('band',band); await choose('concept',concept); await choose('role','student'); await action('reset');
    };
    await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable'); await send('Network.enable');
    await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    await send('Page.navigate',{url:pathToFileURL(path.join(ROOT,'index.html')).href});
    for(let i=0;i<60;i++) { if(await evaluate('!!window.__companionDebug')) break; await delay(100); }

    // 1. The arithmetic checker must not accept suffix matches or negations.
    for(const [band,wrong,right] of [['K2','112','12'],['35','1225','225'],['68','16','6']]) {
      await reset(band);
      await fill('#board-input',wrong); await submit('board');
      let reply=await evaluate('window.__companionDebug.ui.turns.at(-1).text');
      check(`reject wrong numeric suffix ${band}`,!/That matches\.|Coincide\./.test(reply),{wrong,reply});
      await fill('#board-input',right); await submit('board');
      reply=await evaluate('window.__companionDebug.ui.turns.at(-1).text');
      check(`accept exact answer ${band}`,/That matches\.|Coincide\./.test(reply),{right,reply});
    }

    // 2. A K–2 visual must account for all seven first + five added units.
    await reset('K2');
    const units=await evaluate(`({a:document.querySelectorAll('.board [data-fill="a"]').length,b:document.querySelectorAll('.board [data-fill="b"]').length})`);
    check('K2 visual represents seven plus five, including overflow beyond ten',units.a===7 && units.b===5,units);
    await shot('k2-visual-desktop');

    // 3. Parent correction must reach the actual shared/student task.
    await reset(); await choose('role','parent'); await action('load-sample');
    await fill('#due-input','2026-10-09'); await submit('extract');
    let st=await evaluate('JSON.parse(JSON.stringify(window.__companionDebug.state))');
    check('parent-corrected deadline propagates to shared task',st.tasks.find(t=>t.id===st.extracted.taskId).due===st.extracted.due,{extracted:st.extracted.due,task:st.tasks.find(t=>t.id===st.extracted.taskId).due});
    await action('draft-ask'); await action('draft-accept');
    await choose('lang','es');
    const planText=await evaluate(`[...document.querySelectorAll('.b-draft .what')].map(e=>e.textContent).join(' | ')`);
    check('accepted generated plan renders in selected Spanish locale',!/(Tonight|Thursday|Before the deadline)/.test(planText)&&planText.length>20,planText);
    await choose('role','student');
    const shared=await evaluate('JSON.parse(JSON.stringify(window.__companionDebug.state))');
    check('student sees the corrected shared deadline',shared.tasks.find(t=>t.id===shared.extracted.taskId).due==='2026-10-09',shared.tasks);

    // 4. Switching UI language must not erase the student's actual contribution.
    await reset(); await fill('#typed-input','MY_OWN_UNIQUE_NOTE'); await submit('typed'); await choose('lang','es');
    const userTurn=await evaluate(`window.__companionDebug.ui.turns.some(t=>t.who==='student' && t.text==='MY_OWN_UNIQUE_NOTE')`);
    check('language switch preserves user-authored conversation evidence',userTurn,userTurn);

    // 5. A math-only script must never be injected into a literacy task.
    await reset(); await click('[data-act="select"][data-arg="35-read-summary"]');
    const play=await evaluate(`(() => { const p=document.querySelector('[data-act="play"]'); return !!p && !p.disabled; })()`);
    if(play) await action('play');
    const litTurn=await evaluate('window.__companionDebug.ui.turns.at(-1)?.text || ""');
    check('voice demo follows selected literacy task instead of unrelated math',!/(403|178|minus)/i.test(litTurn),litTurn||'No inappropriate script enabled');

    // 6. Every parent concept must expose the core parent workflow.
    for(const concept of ['A','B','C']) {
      await reset('K2',concept); await fill('#board-input','VISIBLE_STUDENT_WORK'); await submit('board'); await action('ask-adult'); await choose('role','parent');
      const visible=await evaluate(`({text:document.getElementById('main').innerText,board:!!document.querySelector('.board')})`);
      check(`${concept} parent sees the child help-needed flag`,/Asked for a grown-up/.test(visible.text),visible.text);
      check(`${concept} parent sees the work it promises to share`,visible.board && visible.text.includes('VISIBLE_STUDENT_WORK'),visible.text);
      await reset('68',concept); await action('propose-open');
      await fill('#prop-task','68-history-timeline'); await fill('#prop-date','2026-10-09'); await fill('#prop-note','A real reason in the synthetic demo'); await submit('propose'); await choose('role','parent');
      const approval=await evaluate('!!document.querySelector("[data-act=proposal-approve]")');
      check(`${concept} parent can decide a student proposal`,approval,approval);
      if(approval) { await action('proposal-approve'); const due=await evaluate(`window.__companionDebug.state.tasks.find(t=>t.id==='68-history-timeline').due`); check(`${concept} approval reaches shared plan`,due==='2026-10-09',due); }
    }

    // 7. Phone controls meet the agreed 44px baseline; board remains reachable.
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
    await reset('35','B');
    const hitTargets=await evaluate(`[...document.querySelectorAll('button')].filter(e=>!e.disabled).map(e=>{const r=e.getBoundingClientRect();return {text:e.textContent,w:r.width,h:r.height};}).filter(r=>r.w>0 && (r.w<44||r.h<44))`);
    check('phone buttons meet 44px minimum in both dimensions',hitTargets.length===0,hitTargets);
    const reachable=await evaluate(`(() => { const b=document.querySelector('[data-act="start"]'); b.scrollIntoView({block:'center'}); const r=b.getBoundingClientRect(); const top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2); return {reachable:!!top && b.contains(top),button:r.toJSON(),cover:top?.outerHTML.slice(0,240)}; })()`);
    check('workspace-first phone task action is not covered by sticky companion',reachable.reachable,reachable);
    await shot('workspace-mobile-scrolled-to-task');
    check('no runtime or CSP errors during independent flows',report.exceptions.length===0,report.exceptions);
    check('no HTTP(S) requests from the prototype',report.externalRequests.length===0,report.externalRequests);
  } finally {
    if(ws) ws.close();
    chrome.kill('SIGTERM');
    await Promise.race([exited,delay(2000)]);
    if(chrome.exitCode===null && chrome.signalCode===null) {chrome.kill('SIGKILL');await exited;}
    fs.rmSync(profile,{recursive:true,force:true});
    report.finished=new Date().toISOString();
    report.summary={passed:report.checks.filter(x=>x.passed).length,failed:report.checks.filter(x=>!x.passed).length,total:report.checks.length};
    fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2));
    console.log(JSON.stringify(report.summary));
    if(report.summary.failed) process.exitCode=1;
  }
}
main().catch(err=>{console.error(err);process.exitCode=2;});
