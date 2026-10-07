/*
 * Local UI exercise for the concept explorer. Launches the locally installed
 * "Chrome for Testing" headless, bound to loopback only, and drives the page
 * over the DevTools protocol with Node's built-in WebSocket/fetch. No packages.
 *
 * Usage: node tests/ui.e2e.cjs            (writes evidence/ui-e2e.json + screenshots)
 * Env:   CHROME=/path/to/chrome to override the binary.
 */
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const URL_ = 'file://' + path.join(ROOT, 'index.html');
const OUT = path.join(ROOT, 'evidence');
const SHOTS = path.join(OUT, 'screenshots');
const CHROME = process.env.CHROME ||
  path.join(os.homedir(), '.agent-browser/browsers/chrome-153.0.8010.52/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
const PORT = 9333;

const report = { started: new Date().toISOString(), chrome: CHROME, url: URL_, configurations: [], flows: [], screenshots: [], consoleErrors: [], failures: [] };
const check = (ok, name, detail) => { (ok ? report.flows : report.failures).push({ name, detail }); if (!ok) console.error('FAIL', name, detail || ''); };

async function main() {
  if (!fs.existsSync(CHROME)) throw new Error('Chrome for Testing not found at ' + CHROME);
  fs.mkdirSync(SHOTS, { recursive: true });
  const profile = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'edu-e2e-'));
  const chrome = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${PORT}`, '--remote-debugging-address=127.0.0.1',
    `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu',
    '--window-size=1440,900', '--allow-file-access-from-files', '--use-fake-device-for-media-stream', 'about:blank'
  ], { stdio: 'ignore' });
  try {
    let version;
    for (let i = 0; i < 50 && !version; i++) {
      try { version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); } catch { await new Promise((r) => setTimeout(r, 200)); }
    }
    if (!version) throw new Error('Chrome did not expose DevTools on loopback');
    const targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
    const page = targets.find((t) => t.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    let id = 0; const pending = new Map(); const events = [];
    ws.onmessage = (m) => {
      const msg = JSON.parse(m.data);
      if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
      else if (msg.method) events.push(msg);
    };
    const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
    const evaluate = async (expression) => {
      const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (r.result.exceptionDetails) throw new Error('page exception: ' + JSON.stringify(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text));
      return r.result.result.value;
    };
    const shot = async (name) => {
      const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      const file = path.join(SHOTS, name + '.png');
      fs.writeFileSync(file, Buffer.from(r.result.data, 'base64'));
      report.screenshots.push(path.relative(ROOT, file));
    };
    const desktop = () => send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    const mobile = () => send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

    await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
    await desktop();
    await send('Page.navigate', { url: URL_ });
    for (let i = 0; i < 50; i++) { if (events.some((e) => e.method === 'Page.loadEventFired')) break; await new Promise((r) => setTimeout(r, 100)); }
    const boot = await evaluate('({ model: typeof window.AcademicCompanionModel, dbg: typeof window.__companionDebug, title: document.title, boundary: document.getElementById("boundary").textContent.length })');
    check(boot.model === 'object' && boot.dbg === 'object', 'boots with model and app loaded', boot);
    check(boot.boundary > 40, 'prototype boundary banner is rendered', boot.boundary);

    // ---- every configuration: 3 concepts × 2 roles × 3 bands × 2 languages ----
    const CONCEPTS = ['A', 'B', 'C'], ROLES = ['student', 'parent'], BANDS = ['K2', '35', '68'], LANGS = ['en', 'es'];
    for (const lang of LANGS) for (const band of BANDS) for (const role of ROLES) for (const concept of CONCEPTS) {
      const r = await evaluate(`(() => {
        const d = window.__companionDebug;
        d.act('lang', ${JSON.stringify(lang)}); d.act('band', ${JSON.stringify(band)}); d.act('role', ${JSON.stringify(role)}); d.act('concept', ${JSON.stringify(concept)});
        const app = document.getElementById('app');
        const buttons = [...document.querySelectorAll('button')];
        const unnamed = buttons.filter((b) => !(b.textContent.trim() || b.getAttribute('aria-label'))).length;
        const inputs = [...document.querySelectorAll('input, textarea, select')];
        const unlabeled = inputs.filter((i) => !i.labels || i.labels.length === 0).length;
        const small = buttons.filter((b) => { const r = b.getBoundingClientRect(); return r.height > 0 && r.height < 40; }).length;
        const text = document.getElementById('main').innerText;
        const banned = /(preschool|high school|preescolar|preparatoria|secundaria)/i.test(text) && !/not supported|No se admite/i.test(document.body.innerText);
        return { lang: document.documentElement.lang, concept: app.dataset.concept, role: app.dataset.role, band: app.dataset.band,
          panels: document.querySelectorAll('main section').length, buttons: buttons.length, unnamed, unlabeled, small,
          overflow: document.documentElement.scrollWidth > window.innerWidth, mentionsUnsupportedGrades: banned,
          firstHeading: (document.querySelector('main h2') || {}).textContent };
      })()`);
      report.configurations.push(r);
    }
    const bad = report.configurations.filter((c) => c.unnamed || c.unlabeled || c.overflow || c.panels < 2 || c.mentionsUnsupportedGrades);
    check(report.configurations.length === 36, 'rendered 36 configurations', report.configurations.length);
    check(bad.length === 0, 'all configurations: named buttons, labelled inputs, ≥2 panels, no horizontal overflow, no unsupported grades', bad);
    const smallTargets = report.configurations.filter((c) => c.small).length;
    check(smallTargets === 0, 'no desktop button under 40px tall in any configuration', smallTargets);

    // ---- student task/hint flow (grades 3–5, English, concept A) ----
    let s = await evaluate(`(() => { const d = window.__companionDebug; d.act('lang','en'); d.act('band','35'); d.act('role','student'); d.act('concept','A');
      d.act('start'); d.act('hint'); const st1 = JSON.parse(JSON.stringify(d.state));
      document.getElementById('board-input').value = '225'; document.querySelector('form[data-form="board"]').requestSubmit();
      const reply = d.ui.turns[d.ui.turns.length - 1].text;
      d.act('done'); const st = d.state;
      return { status: st.work.status, hints: st.ledger.math.hintsUsed, ledger: st.ledger.math.status, evidence: st.ledger.math.evidence,
        planned: st.ledger.math.plannedChecks.map(c => c.window), literacyUntouched: st.ledger.literacy.hintsUsed === 0 && st.ledger.literacy.status === 'not_checked',
        reply, hintOnBoard: !!document.querySelector('.board .step[data-from="hint"]'), nextBtn: !!document.querySelector('[data-act="select"]'),
        inProgressRecorded: st1.work.status === 'in_progress' }; })()`);
    check(s.status === 'complete' && s.hints === 1 && s.ledger === 'needs_independent_check' && s.evidence === 'assisted_work', 'student start → hint → done records assisted self-report, not mastery', s);
    check(s.planned.join(',') === '48-72h,day7' && s.literacyUntouched && s.hintOnBoard && s.nextBtn && /matches/i.test(s.reply), 'planned checks, board hint highlight, next-step button, typed answer check', s);
    await shot('desktop-A-student-35-en-after-task');

    // ---- scripted voice demo + mic denial/recovery + typed path ----
    s = await evaluate(`(() => { const d = window.__companionDebug; d.act('reset'); d.act('concept','B');
      for (let i = 0; i < 6; i++) d.act('play');
      const turns = d.ui.turns.length, scripted = d.ui.turns.every(t => t.scripted), hints = d.state.ledger.math.hintsUsed, work = d.state.work.status;
      const playDisabled = document.querySelector('[data-act="play"]').disabled;
      d.act('mic-try'); const denied = document.querySelector('.mic').dataset.mic; const deniedText = document.getElementById('mic-status').textContent;
      d.act('mic-allow'); const recovered = document.querySelector('.mic').dataset.mic;
      document.getElementById('typed-input').value = 'hint'; document.querySelector('form[data-form="typed"]').requestSubmit();
      const typedReply = d.ui.turns[d.ui.turns.length - 1].text;
      return { turns, scripted, hintsFromScript: hints, work, playDisabled, denied, deniedText, recovered, typedReply, hintsAfterTyped: d.state.work.assistance.length }; })()`);
    check(s.turns === 5 && s.scripted && s.playDisabled && s.work === 'in_progress', 'scripted voice demo plays 5 labelled turns then stops', s);
    check(s.denied === 'denied' && s.recovered === 'recovered' && /simulated/i.test(s.deniedText), 'simulated microphone denial and recovery states', s);
    check(/hint/i.test(s.typedReply) && s.hintsAfterTyped === 2, 'typed "hint" path records a second AI hint', s);
    await shot('desktop-B-student-35-en-voice-demo');

    // ---- parent flow: observation, sample note, correction, draft ask/decline/ask/accept ----
    s = await evaluate(`(() => { const d = window.__companionDebug; d.act('role','parent'); d.act('concept','A');
      const flagsBefore = document.querySelectorAll('.notice.warn').length;
      document.getElementById('obs-input').value = 'Explained regrouping at dinner.'; document.querySelector('form[data-form="observe"]').requestSubmit();
      const obs = d.state.observations[0];
      const draftDisabledBefore = document.querySelector('[data-act="draft-ask"]').disabled;
      d.act('load-sample'); const noteShown = !!document.querySelector('blockquote');
      document.getElementById('due-input').value = '2026-10-09'; document.querySelector('form[data-form="extract"]').requestSubmit();
      const ex = d.state.extracted;
      d.act('draft-ask'); const pending = d.state.draftPlan.status, currentNull = d.state.currentPlan === null;
      document.getElementById('decline-note').value = 'Too much for a school night'; document.querySelector('form[data-form="decline"]').requestSubmit();
      const declined = d.state.draftPlan.status, stillNull = d.state.currentPlan === null, note = d.state.draftPlan.parentNote;
      d.act('draft-ask'); d.act('draft-accept');
      return { flagsBefore, obs, draftDisabledBefore, noteShown, ex: { status: ex.status, due: ex.due, corrections: ex.corrections }, pending, currentNull, declined, stillNull, note,
        accepted: d.state.draftPlan.status, current: d.state.currentPlan && d.state.currentPlan.items.length, ledgerRows: document.querySelectorAll('.ledger tbody tr').length }; })()`);
    check(s.obs && s.obs.source === 'parent' && s.obs.verification === 'observation_unverified', 'parent observation saved with provenance', s.obs);
    check(s.flagsBefore >= 1, 'parent sees help-needed flag from student hints', s.flagsBefore);
    check(s.draftDisabledBefore && s.noteShown && s.ex.status === 'confirmed_by_parent' && s.ex.due === '2026-10-09' && s.ex.corrections.length === 1, 'sample note loaded; extracted deadline corrected by parent with provenance', s.ex);
    check(s.pending === 'pending_parent_review' && s.currentNull && s.declined === 'declined_by_parent' && s.stillNull && s.note.length > 0, 'draft plan needs decision; decline keeps current plan null', s);
    check(s.accepted === 'accepted_by_parent' && s.current === 3 && s.ledgerRows === 3, 'second draft accepted becomes current plan; ledger shows 3 rows', s);
    await shot('desktop-A-parent-35-en-after-review');

    // ---- grades 6–8 negotiation; K–2 one-task + ask-adult; Spanish rendering ----
    s = await evaluate(`(() => { const d = window.__companionDebug; d.act('band','68'); d.act('role','student'); d.act('concept','C');
      d.act('propose-open'); const f = document.querySelector('form[data-form="propose"]');
      f.querySelector('[name=propTask]').value = '68-history-timeline'; f.querySelector('[name=propDate]').value = '2026-10-09'; f.querySelector('[name=propNote]').value = 'Game on Thursday'; f.requestSubmit();
      const pend = d.state.proposals[0].status, dueBefore = d.state.tasks.find(t => t.id === '68-history-timeline').due;
      d.act('role','parent'); const approveBtn = !!document.querySelector('[data-act="proposal-approve"]'); d.act('proposal-approve', '0');
      const dueAfter = d.state.tasks.find(t => t.id === '68-history-timeline').due;
      d.act('lang','es'); d.act('band','K2'); d.act('role','student'); d.act('concept','A');
      const k2Items = document.querySelectorAll('.plan > li').length; const esHeading = document.querySelector('#h-task').textContent;
      d.act('ask-adult'); const flagged = !!document.querySelector('.notice.warn');
      d.act('role','parent'); const parentSeesFlag = document.body.innerText.includes('Pidió ayuda a un adulto');
      const esLabels = [...document.querySelectorAll('#explorer legend')].map(l => l.textContent);
      return { pend, dueBefore, approveBtn, dueAfter, k2Items, esHeading, flagged, parentSeesFlag, esLabels }; })()`);
    check(s.pend === 'pending_parent' && s.dueBefore === '2026-10-08' && s.approveBtn && s.dueAfter === '2026-10-09', 'grade 6–8 student proposal changes nothing until parent approves', s);
    check(s.k2Items === 1 && /7 \+ 5/.test(s.esHeading) && s.flagged && s.parentSeesFlag, 'K–2 shows one task, Spanish copy, ask-a-grown-up flag reaches parent', s);
    check(s.esLabels.join('|') === 'Concepto|Ver como|Grados|Idioma', 'explorer controls localized in Spanish', s.esLabels);
    await evaluate(`(() => { const d = window.__companionDebug; d.act('role','student'); })()`);
    await shot('desktop-A-student-K2-es');
    await evaluate(`(() => { const d = window.__companionDebug; d.act('role','parent'); d.act('concept','C'); })()`);
    await shot('desktop-C-parent-K2-es');

    // ---- reset ----
    s = await evaluate(`(() => { const d = window.__companionDebug; d.act('reset'); const st = d.state; return { obs: st.observations.length, draft: st.draftPlan, cur: st.currentPlan, work: st.work.status, turns: d.ui.turns.length, lang: st.settings.locale, band: st.settings.band }; })()`);
    check(s.obs === 0 && s.draft === null && s.cur === null && s.work === 'not_started' && s.turns === 0 && s.lang === 'es' && s.band === 'K2', 'reset restores the example and keeps settings', s);

    // ---- keyboard focus: Tab lands on a control with a visible outline ----
    await evaluate(`(() => { const d = window.__companionDebug; d.act('lang','en'); d.act('band','35'); d.act('role','student'); d.act('concept','A'); document.body.focus(); })()`);
    const focusSeq = [];
    for (let i = 0; i < 4; i++) {
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
      focusSeq.push(await evaluate(`(() => { const a = document.activeElement; const cs = getComputedStyle(a); return { tag: a.tagName, text: (a.textContent || '').trim().slice(0, 30), fv: a.matches(':focus-visible'), outline: cs.outlineStyle + ' ' + cs.outlineWidth }; })()`));
    }
    check(focusSeq.every((f) => f.fv && f.outline.startsWith('solid')), 'keyboard Tab moves focus with a visible solid outline', focusSeq);
    // Enter on a focused segment button activates it.
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    const live = await evaluate('new Promise(r => setTimeout(() => r(document.getElementById("live").textContent), 120))');
    check(live.length > 0, 'status announcement region updates after keyboard activation', live);

    // ---- mobile: 390px, every concept/role, no horizontal overflow ----
    await mobile();
    const mob = [];
    for (const role of ROLES) for (const concept of CONCEPTS) {
      mob.push(await evaluate(`(() => { const d = window.__companionDebug; d.act('role', ${JSON.stringify(role)}); d.act('concept', ${JSON.stringify(concept)});
        const small = [...document.querySelectorAll('button')].filter(b => { const r = b.getBoundingClientRect(); return r.height > 0 && (r.height < 40 || r.width < 40); }).length;
        return { role: ${JSON.stringify(role)}, concept: ${JSON.stringify(concept)}, overflow: document.documentElement.scrollWidth > window.innerWidth, innerWidth: window.innerWidth, scrollWidth: document.documentElement.scrollWidth, small }; })()`));
    }
    report.mobile = mob;
    check(mob.every((m) => !m.overflow), 'mobile 390px: no horizontal overflow in any concept/role', mob);
    check(mob.every((m) => m.small === 0), 'mobile 390px: no button under 40px in any dimension', mob.filter((m) => m.small));
    await evaluate(`(() => { const d = window.__companionDebug; d.act('role','student'); d.act('concept','A'); window.scrollTo(0,0); })()`);
    await shot('mobile-A-student-35-en');
    await evaluate(`(() => { const d = window.__companionDebug; d.act('role','parent'); d.act('concept','A'); window.scrollTo(0,0); })()`);
    await shot('mobile-A-parent-35-en');
    await evaluate(`(() => { const d = window.__companionDebug; d.act('role','student'); d.act('concept','B'); window.scrollTo(0,0); })()`);
    await shot('mobile-B-student-35-en');

    // ---- console / exceptions / network ----
    report.consoleErrors = events.filter((e) => e.method === 'Runtime.exceptionThrown' || (e.method === 'Log.entryAdded' && ['error', 'warning'].includes(e.params.entry.level)))
      .map((e) => e.method === 'Runtime.exceptionThrown' ? e.params.exceptionDetails.text : e.params.entry.text);
    check(report.consoleErrors.length === 0, 'no console errors, exceptions, or CSP violations', report.consoleErrors);
    ws.close();
  } finally {
    chrome.kill('SIGKILL');
    await new Promise((r) => { chrome.once('exit', r); setTimeout(r, 3000); });
    for (let i = 0; i < 5; i++) {
      try { fs.rmSync(profile, { recursive: true, force: true }); break; } catch { await new Promise((r) => setTimeout(r, 300)); }
    }
  }
  report.finished = new Date().toISOString();
  report.summary = { configurations: report.configurations.length, mobileConfigurations: (report.mobile || []).length, checksPassed: report.flows.length, checksFailed: report.failures.length, screenshots: report.screenshots.length };
  fs.writeFileSync(path.join(OUT, 'ui-e2e.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.summary));
  for (const f of report.flows) console.log('ok -', f.name);
  process.exitCode = report.failures.length ? 1 : 0;
}

main().catch((err) => { console.error(err); process.exitCode = 2; });
