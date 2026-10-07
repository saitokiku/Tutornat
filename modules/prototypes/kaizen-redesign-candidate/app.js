/* app.js — Kaizen interior shell for the redesign candidate. One store (demo-service), one command path (run()), five
 * destinations rendered from live records; all family text is inserted with textContent (no innerHTML, no eval).
 * Shell chrome (rail, mobile tab bar, demo context) is built ONCE and patched in place, so a service event never recreates a
 * control under a pressed pointer; only <main> re-renders. Drafts live in UI state per learner / per learner+task, and every
 * command completion is bound to its origin (see run()). Learn/Activity/Plan pages come from sibling modules through
 * viewContext(); the pre-redesign implementations remain only as a temporary fallback while those land.
 */
(function () {
  'use strict';
  const D = window.Domain, C = window.Copy, svc = window.DemoService.createDemoService({});
  const ROUTES = ['today', 'schoolwork', 'plan', 'workspace', 'record'];
  const ui = {
    role: 'parent', learnerId: 'lrn-35-bea', locale: 'en', route: 'today',
    selected: {}, drafts: {}, filter: { status: 'active', subject: '' }, newForm: {}, editing: {},
    formErrors: {}, status: null, undo: null, dialog: null, pendingKeys: new Set(), lastFailed: null, recordTask: {}, focusNext: null, scenarioOpen: false, resetGen: {},
    booting: false, intakeOpen: {},
  };
  const t = (k, p) => C.t(ui.locale, k, p);
  const tn = (k, n, p) => C.tn(ui.locale, k, n, p);
  const learner = () => D.LEARNERS.find((l) => l.id === ui.learnerId);
  const isParent = () => ui.role === 'parent';
  const emptyTask = () => ({ title: '', subject: '', due: '', instructions: '' });
  const emptyProp = () => ({ taskId: '', due: '', reason: '' });
  // Per-learner draft state. Task-bound drafts are keyed by task id inside `work` / `obs` / `edit`.
  const draft = (learnerId) => { const id = learnerId || ui.learnerId; return (ui.drafts[id] = ui.drafts[id] || { task: emptyTask(), edit: {}, work: {}, obs: {}, prop: emptyProp(), note: '', intake: null, intakeNone: false }); };
  const workDraft = (d, taskId) => (d.work[taskId] = d.work[taskId] || { step: '', answer: '', tally: Array(10).fill(false), lastCheck: null });
  const obsDraft = (d, taskId) => (d.obs[taskId] = d.obs[taskId] || { text: '' });
  const errorsOf = (learnerId) => (ui.formErrors[learnerId || ui.learnerId] = ui.formErrors[learnerId || ui.learnerId] || {});
  const sameFields = (a, b) => !!a && !!b && Object.keys(b).every((k) => (a[k] || '') === (b[k] || ''));
  const selectedId = () => { const id = ui.selected[ui.learnerId]; const task = id && svc.query.task(id); return task && task.learnerId === ui.learnerId ? id : null; };
  const select = (taskId, learnerId) => { ui.selected[learnerId || ui.learnerId] = taskId; };
  const editingId = () => { const id = ui.editing[ui.learnerId]; const task = id && svc.query.task(id); return task && task.status !== 'archived' ? id : null; };

  // ---------- generated sample content: localized by key/version, never applied to family-edited text ----------
  // sampleOf = instructional CAPABILITY (story/help/checker): only an attached, non-detached sample. Never widened to detached tasks.
  const sampleOf = (task) => (task && task.sample && D.SAMPLES[task.sample]) ? C.sampleText(ui.locale, task.sample, D.SAMPLES[task.sample]) : null;
  // Display PROVENANCE (rendering only, one rule in copy.taskText): a field whose stored provenance names a known sample key at the
  // current version is shown in the chosen locale, even after the capability detached; anything else (family text, unknown/mismatched
  // version) is verbatim.
  const titleOf = (task) => C.taskText(ui.locale, task, 'title', D.SAMPLES);
  const instructionsOf = (task) => C.taskText(ui.locale, task, 'instructions', D.SAMPLES);
  // Edit drafts snapshot their baseline (what was shown when the form opened, plus the task version) so only fields the family
  // actually changed are ever submitted — a locale switch mid-edit changes nothing about which fields are dirty.
  const editDraftFor = (task) => { const shown = { title: titleOf(task), subject: task.subject, due: task.due, instructions: instructionsOf(task) }; return { ...shown, baseline: { ...shown }, baseVersion: task.version }; };
  const taskTitle = (taskId, fallback) => { const task = taskId && svc.query.task(taskId); return task ? titleOf(task) : (fallback || ''); };
  // Immutable scripted assistance keeps its stored English text; the renderer shows the same entry (same key, version, index) in the chosen locale.
  function assistText(a) {
    if (a && a.kind === 'scripted' && a.sampleKey && D.SAMPLES[a.sampleKey] && (a.sampleVersion || 1) === D.SAMPLES[a.sampleKey].version) {
      const sm = C.sampleText(ui.locale, a.sampleKey, D.SAMPLES[a.sampleKey]);
      if (a.type === 'voice_demo') return sm.voice;
      const list = a.type === 'scaffold' ? sm.scaffold : sm.hints;
      if (typeof a.index === 'number' && list[a.index]) return list[a.index];
    }
    return a ? a.text : '';
  }

  // ---------- DOM helpers (textContent only) ----------
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v == null || v === false) return;
      if (k === 'class') el.className = v; else if (k === 'text') el.textContent = v;
      else if (k === 'style') el.style.cssText = v; // CSSOM, not a markup style attribute (CSP style-src stays 'self')
      else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v === true) el.setAttribute(k, ''); else el.setAttribute(k, String(v));
    });
    children.flat(Infinity).forEach((c) => { if (c == null || c === false) return; el.append(c instanceof Node ? c : document.createTextNode(String(c))); });
    return el;
  }
  const fk = (act, arg) => act + (arg != null ? ':' + arg : '');
  function btn(label, act, arg, onClick, opts) {
    const o = opts || {};
    const key = o.requestKey; const busy = key && ui.pendingKeys.has(key);
    return h('button', { type: 'button', class: 'btn' + (o.cls ? ' ' + o.cls : '') + (busy ? ' busy' : ''), 'data-act': act, 'data-arg': arg, 'data-fk': fk(act, arg), 'aria-disabled': busy ? 'true' : null, 'aria-label': o.ariaLabel,
      onclick: (e) => { if (busy) { e.preventDefault(); return; } onClick(e); } }, label);
  }
  // Task-specific links select that exact record; a Record link also sets the explicit Record filter (overriding any older one).
  const link = (label, route, taskId, cls) => h('a', { class: 'btn ' + (cls || ''), href: '#/' + route, 'data-act': 'go-' + route, 'data-arg': taskId, 'data-fk': fk('go-' + route, taskId), onclick: taskId ? () => { select(taskId); if (route === 'record') ui.recordTask[ui.learnerId] = taskId; } : null }, label);
  const tag = (text, cls) => h('span', { class: 'tag ' + (cls || '') }, text);
  const notice = (text, cls, attrs) => h('p', { class: 'notice ' + (cls || ''), ...(attrs || {}) }, text);
  const panel = (title, cls, ...children) => h('section', { class: 'panel ' + (cls || ''), 'aria-label': title }, title ? h('h2', null, title) : null, ...children);
  const fmtDate = (iso) => C.fmtDate(ui.locale, iso);
  const fmtTime = (iso) => C.fmtTime(ui.locale, iso);
  const subjectMark = (code) => h('span', { class: 'subject-mark', 'aria-hidden': 'true' }, C.subject(ui.locale, code).slice(0, 1));
  const stateTag = (state) => tag(t('state_' + state), state === 'stuck' ? 'warn' : state === 'complete_self_reported' ? 'ok' : state === 'in_progress' ? 'brand' : '');
  const originTag = (task) => task.sampleDetached && !task.sample ? tag(t('task_origin_sample_edited'), 'warn') : tag(t('task_origin_' + task.origin), task.sample ? 'ok' : '');
  const errText = (code) => code === 'too_long' ? t('err_too_long', { n: '' }).replace(' (limit )', '') : t('err_' + code);
  const errFor = (code, limit) => code === 'too_long' ? t('err_too_long', { n: limit }) : t('err_' + code);
  const countsLine = (sess) => [tn('help_req', D.countRequestedHelp(sess)), tn('scr', D.countScriptedHelp(sess)), tn('steps_n', sess.steps.length)].join(' · ');

  // Field with form-level error wiring. value draft updates do NOT re-render (keeps caret).
  function field(id, label, control, opts) {
    const o = opts || {}; const err = o.error;
    return h('div', { class: 'field' + (err ? ' invalid' : ''), id: id + '-field' },
      h('label', { for: id }, label), control, o.hint ? h('span', { class: 'hint', id: id + '-hint' }, o.hint) : null,
      err ? h('span', { class: 'err', id: id + '-err' }, err) : null);
  }
  function input(id, value, onInput, attrs) {
    const el = h('input', { id, type: 'text', 'data-fk': id, ...(attrs || {}), oninput: (e) => onInput(e.target.value) }); el.value = value || ''; return el;
  }
  function textarea(id, value, onInput, attrs) { const el = h('textarea', { id, 'data-fk': id, ...(attrs || {}), oninput: (e) => onInput(e.target.value) }); el.value = value || ''; return el; }
  function selectEl(id, value, options, onChange, attrs) {
    const el = h('select', { id, 'data-fk': id, ...(attrs || {}), onchange: (e) => onChange(e.target.value) }, options.map(([v, label]) => h('option', { value: v }, label)));
    el.value = value || ''; return el;
  }
  function formSummary(formId, errors, labels) {
    const keys = Object.keys(errors || {});
    if (!keys.length) return null;
    return h('div', { class: 'form-summary', role: 'alert', id: formId + '-summary' }, tn('form_errors', keys.length), ' ',
      keys.map((k, i) => [i ? ', ' : '', h('a', { href: '#' + formId + '-' + k, 'data-fk': formId + '-err-' + k, onclick: (e) => { e.preventDefault(); const el = document.getElementById(formId + '-' + k); if (el) el.focus(); } }, labels[k] || k)]));
  }

  // ---------- one command path (initial attempt and retry share it) ----------
  function mapError(err) { const key = 'e_' + err.code; return C.DICT[ui.locale][key] || C.DICT.en[key] ? t(key) : t('e_generic'); }
  const cssEscape = (s) => (window.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/"/g, '\\"'));
  function focusKeyOf(el) {
    if (!el || el === document.body || el === document.documentElement || !el.getAttribute) return null;
    const key = el.getAttribute('data-fk'); if (key) return key;
    if (el.id) return el.id;
    if (el.tagName === 'SUMMARY') return 'summary:' + (el.closest('aside') ? el.closest('aside').className : '');
    if (el.tagName === 'A') return 'a:' + (el.getAttribute('href') || '') + ':' + el.textContent;
    return null;
  }
  function findByKey(key) {
    if (!key) return null;
    const byFk = document.querySelector('[data-fk="' + cssEscape(key) + '"]'); if (byFk) return byFk;
    const byId = document.getElementById(key); if (byId) return byId;
    if (key.startsWith('summary:')) return document.querySelector('aside.scenario summary');
    if (key.startsWith('a:')) { const i = key.indexOf(':', 2); const href = key.slice(2, i); const text = key.slice(i + 1); return [...document.querySelectorAll('a')].find((a) => a.getAttribute('href') === href && a.textContent === text) || null; }
    return null;
  }
  // Where a command started: learner/route/role and the control that was focused. Late results use this, never current UI state.
  const resetGenOf = (id) => ui.resetGen[id] || 0;
  const context = () => ({ learnerId: ui.learnerId, route: ui.route, role: ui.role, activeFk: focusKeyOf(document.activeElement), resetGen: resetGenOf(ui.learnerId), selected: ui.selected[ui.learnerId] || null });
  // A late create/intake result may auto-select its task only while the user has not moved to a newer task/context for that
  // learner: the owner's selection is unchanged since dispatch, the role is unchanged, and the owner is not being viewed in a
  // task-bound view (Workspace/Record) where replacing the selection would replace the view. The record is created regardless.
  const maySelect = (origin, owner) => (ui.selected[owner] || null) === origin.selected && ui.role === origin.role && !(ui.learnerId === owner && (ui.route === 'workspace' || ui.route === 'record'));
  const inContext = (origin) => ui.learnerId === origin.learnerId && ui.route === origin.route && ui.role === origin.role;
  // Success focus only moves when the user has not moved since: focus is still on the originating control, or that control
  // disappeared (e.g. a Start button) and focus fell back to the heading/body rather than to something the user chose.
  function focusStillOrigin(origin) {
    const cur = focusKeyOf(document.activeElement);
    if (cur === origin.activeFk) return true;
    const originEl = findByKey(origin.activeFk);
    return !originEl && (!cur || cur === 'view-h' || cur === 'main');
  }
  async function run(command, o) {
    const opts = o || {};
    const key = command.requestKey;
    if (key) { if (ui.pendingKeys.has(key)) { setStatus(t('e_duplicate'), 'err'); return null; } ui.pendingKeys.add(key); }
    const origin = opts.origin || context();
    const errors = errorsOf(origin.learnerId);
    if (opts.form) errors[opts.form] = null;
    setStatus(t('pending_op'), 'pending');
    render();
    const r = opts.retryOf ? await svc.retry(opts.retryOf) : await svc.dispatch(command);
    if (key) ui.pendingKeys.delete(key);
    // Obsolete completion: the learner was reset after dispatch. It may not change status, errors, drafts or focus, nor offer Retry.
    if (resetGenOf(origin.learnerId) !== origin.resetGen) { render(); return r; }
    const here = inContext(origin); const stay = here && focusStillOrigin(origin);
    if (r.ok) {
      ui.lastFailed = null;
      if (opts.onOk) opts.onOk(r.data, { here, origin });
      const next = typeof opts.focusNext === 'function' ? opts.focusNext(r.data) : opts.focusNext;
      if (next && stay) ui.focusNext = next;
      setStatus(opts.success || '', 'ok');
    } else {
      if (r.error.code === 'validation' && opts.form) { errors[opts.form] = r.error.errors; if (stay) ui.focusNext = opts.form + '-' + Object.keys(r.error.errors)[0]; }
      if (r.error.code === 'cancelled') setStatus(t('cancelled'), 'ok');
      else {
        const retryable = !!(r.error.retryable && r.operationId);
        // Retry keeps the original command, callbacks, form context and operation-specific feedback.
        ui.lastFailed = retryable ? { operationId: r.operationId, command, opts: { ...opts, origin } } : null;
        setStatus((opts.errorMap && opts.errorMap[r.error.code]) || mapError(r.error), 'err', retryable ? { label: t('retry'), act: 'retry', fn: () => retryLast() } : null);
      }
      if (opts.onErr) opts.onErr(r.error);
    }
    render();
    return r;
  }
  async function retryLast() {
    if (!ui.lastFailed) return null;
    const { operationId, command, opts } = ui.lastFailed; ui.lastFailed = null;
    return run(command, { ...opts, retryOf: operationId, origin: { ...opts.origin, activeFk: focusKeyOf(document.activeElement) } });
  }
  // Success notices auto-dismiss (they are not evidence); errors, retry and undo stay until closed or replaced.
  let statusTimer = null;
  function setStatus(text, kind, action) {
    ui.status = text ? { text, kind, action } : null;
    if (statusTimer) { clearTimeout(statusTimer); statusTimer = null; }
    if (ui.status && kind === 'ok' && !action && !ui.undo) statusTimer = setTimeout(() => { if (ui.status && ui.status.text === text && !ui.undo) { ui.status = null; render(); } }, 6000);
  }
  function renderStatus() {
    const el = document.getElementById('status'); el.textContent = ''; el.className = 'status' + (ui.status && ui.status.kind === 'err' ? ' err' : '');
    const alert = document.getElementById('alert'); alert.textContent = ui.status && ui.status.kind === 'err' ? ui.status.text : '';
    if (!ui.status) return;
    el.append(h('span', null, ui.status.text));
    if (ui.status.action) el.append(btn(ui.status.action.label, ui.status.action.act, null, ui.status.action.fn));
    if (ui.undo) el.append(btn(t('undo'), 'undo-archive', ui.undo.taskId, () => { const id = ui.undo.taskId; ui.undo = null; run({ type: 'restoreTask', taskId: id, requestKey: 'restore:' + id }, { success: t('restored'), focusNext: fk('task-select', id) }); }));
    el.append(btn(t('close'), 'status-close', null, () => { ui.status = null; ui.undo = null; render(); }, { ariaLabel: t('close') }));
  }

  // ---------- dialog ----------
  function openDialog(kind, data, returnFk) { ui.dialog = { kind, data, returnFk }; render(); }
  function closeDialog() { const d = ui.dialog; ui.dialog = null; if (d) ui.focusNext = d.returnFk; render(); }
  function renderDialog() {
    const dlg = document.getElementById('dialog'); dlg.textContent = '';
    if (!ui.dialog) { if (dlg.open) dlg.close(); return; }
    const d = ui.dialog;
    if (d.kind === 'archive') {
      const task = svc.query.task(d.data.taskId);
      dlg.append(h('h2', { id: 'dialog-h' }, t('archive_confirm_h')), h('p', null, t('archive_confirm_p', { title: task ? titleOf(task) : '' })),
        h('div', { class: 'row' }, btn(t('cancel'), 'dialog-cancel', null, closeDialog), btn(t('archive'), 'dialog-confirm', null, () => {
          const id = d.data.taskId; const owner = task ? task.learnerId : ui.learnerId; ui.dialog = null; ui.focusNext = 'view-h';
          run({ type: 'archiveTask', taskId: id, requestKey: 'archive:' + id }, { success: t('archived'), onOk: () => { ui.undo = { taskId: id }; if (ui.editing[owner] === id) ui.editing[owner] = null; } });
        }, { cls: 'danger' })));
    } else if (d.kind === 'reset') {
      const l = learner();
      dlg.append(h('h2', { id: 'dialog-h' }, t('reset_confirm_h', { name: l.name })), h('p', null, t('reset_confirm_p')),
        h('div', { class: 'row' }, btn(t('cancel'), 'dialog-cancel', null, closeDialog), btn(t('confirm'), 'dialog-confirm', null, async () => {
          const id = ui.learnerId; ui.dialog = null; ui.focusNext = 'view-h';
          // New reset identity for this learner: in-flight completions from before it become obsolete, and a stale Retry for it is dropped.
          ui.resetGen[id] = resetGenOf(id) + 1; if (ui.lastFailed && ui.lastFailed.opts.origin.learnerId === id) ui.lastFailed = null;
          await svc.resetLearner(id); delete ui.drafts[id]; delete ui.selected[id]; delete ui.recordTask[id]; delete ui.newForm[id]; delete ui.editing[id]; delete ui.formErrors[id]; ui.undo = null;
          setStatus(t('reset_done', { name: l.name }), 'ok'); render();
        }, { cls: 'danger' })));
    }
    if (!dlg.open) dlg.showModal();
    dlg.oncancel = (e) => { e.preventDefault(); closeDialog(); };
    const first = dlg.querySelector('button'); if (first) first.focus();
  }

  // ---------- shell copy (new strings live in shell-copy.js; shared copy.js is read-only) ----------
  const SC = window.ShellCopy || { en: {}, es: {} };
  const tx = (k, p) => { let s = (SC[ui.locale] && SC[ui.locale][k]) || SC.en[k] || k; Object.entries(p || {}).forEach(([n, v]) => { s = s.split('{' + n + '}').join(String(v)); }); return s; };
  const txn = (k, n, p) => tx(n === 1 ? k + '_one' : k + '_other', { n, ...(p || {}) });
  const fmtLong = (iso) => { try { return new Intl.DateTimeFormat(t('date_fmt'), { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(iso + 'T00:00:00Z')); } catch (e) { return iso; } };
  const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const weekOf = (iso) => { const d = new Date(iso + 'T00:00:00Z'); const mon = addDays(iso, -((d.getUTCDay() + 6) % 7)); return Array.from({ length: 7 }, (_, i) => addDays(mon, i)); };
  const dueText = (task, today) => (task.status === 'open' && task.due < today) ? tx('was_due', { date: fmtDate(task.due) }) : tx('due_on', { date: fmtDate(task.due) });
  const stateText = (state) => t('state_' + state);

  // Inline line icons for the rail / tab bar (SVG DOM, no images, no network).
  const NS = 'http://www.w3.org/2000/svg';
  const ICONS = {
    today: [['circle', { cx: 12, cy: 12, r: 4 }], ['path', { d: 'M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4' }]],
    schoolwork: [['path', { d: 'M4 6h16M4 12h16M4 18h10' }]],
    plan: [['rect', { x: 3, y: 5, width: 18, height: 16, rx: 2 }], ['path', { d: 'M3 10h18M8 3v4M16 3v4' }]],
    workspace: [['path', { d: 'M4 20l4-1L19 8l-3-3L5 16l-1 4z' }], ['path', { d: 'M14 7l3 3' }]],
    record: [['path', { d: 'M3 12h4l3-7 4 14 3-7h4' }]],
  };
  function icon(name) {
    const s = document.createElementNS(NS, 'svg');
    Object.entries({ viewBox: '0 0 24 24', width: 18, height: 18, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false', class: 'ico' }).forEach(([k, v]) => s.setAttribute(k, String(v)));
    (ICONS[name] || []).forEach(([tag, attrs]) => { const e = document.createElementNS(NS, tag); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, String(v))); s.append(e); });
    return s;
  }

  // ---------- persistent shell: built once, patched by syncShell() ----------
  const shell = { built: false };
  function navAnchor(route, kind) {
    return h('a', { href: '#/' + route, 'data-act': 'nav', 'data-arg': route, 'data-fk': fk(kind, route) }, icon(route), h('span', { class: 'label' }, tx('nav_' + route)));
  }
  function ensureShell() {
    if (shell.built) return;
    shell.navLinks = {}; shell.tabLinks = {}; shell.roleBtns = {}; shell.localeBtns = {};
    shell.brandCap = h('span', { class: 'brand-cap' }, tx('brand_caption'));
    const brand = h('a', { class: 'brand', href: '#/today', 'data-fk': 'brand' }, h('span', { class: 'brand-mark', 'aria-hidden': 'true' }), h('span', { class: 'brand-name' }, 'Kaizen'), shell.brandCap);
    shell.railNav = h('nav', { class: 'rail-nav', 'aria-label': tx('nav_label') }, h('ul', null, ROUTES.map((r) => h('li', null, (shell.navLinks[r] = navAnchor(r, 'nav'))))));
    ['parent', 'student'].forEach((r) => { shell.roleBtns[r] = h('button', { type: 'button', 'aria-pressed': 'false', 'data-act': 'role', 'data-arg': r, 'data-fk': fk('role', r), onclick: () => { if (ui.role !== r) { ui.role = r; render(); } } }, t('role_' + r)); });
    C.LOCALES.forEach((lc) => { shell.localeBtns[lc] = h('button', { type: 'button', 'aria-pressed': 'false', lang: lc, 'data-act': 'locale', 'data-arg': lc, 'data-fk': fk('locale', lc), onclick: () => { if (ui.locale !== lc) { ui.locale = lc; render(); } } }, lc.toUpperCase()); });
    shell.learnerSel = selectEl('learner-select', ui.learnerId, [], (v) => { ui.learnerId = v; render(); });
    shell.roleLabel = h('span', { class: 'ctx-label', id: 'role-label' }, tx('viewing_as'));
    shell.learnerLabel = h('label', { for: 'learner-select', class: 'ctx-label' }, tx('child'));
    shell.localeLabel = h('span', { class: 'ctx-label', id: 'locale-label' }, tx('language'));
    shell.roleGroup = h('div', { class: 'ctx-row', role: 'group', 'aria-labelledby': 'role-label' }, shell.roleLabel, h('div', { class: 'seg' }, shell.roleBtns.parent, shell.roleBtns.student));
    shell.localeGroup = h('div', { class: 'ctx-row', role: 'group', 'aria-labelledby': 'locale-label' }, shell.localeLabel, h('div', { class: 'seg' }, C.LOCALES.map((lc) => shell.localeBtns[lc])));
    shell.note = h('p', { class: 'demo-note', role: 'note' }, tx('demo_note'));
    shell.context = h('div', { class: 'rail-context' }, shell.roleGroup, h('div', { class: 'ctx-row learner' }, shell.learnerLabel, shell.learnerSel));
    shell.localeGroup.classList.add('rail-locale'); shell.note.classList.add('rail-note');
    shell.rail = h('aside', { class: 'rail', 'aria-label': tx('rail_label') }, brand, shell.localeGroup, shell.railNav, shell.context, shell.note);
    shell.page = h('div', { class: 'page' });
    shell.main = h('main', { id: 'main', tabindex: '-1' }, shell.page);
    shell.tabbar = h('nav', { class: 'tabbar', 'aria-label': tx('nav_label') }, h('ul', null, ROUTES.map((r) => h('li', null, (shell.tabLinks[r] = navAnchor(r, 'tab'))))));
    shell.frame = h('div', { class: 'app-frame' }, shell.rail, shell.main, shell.tabbar);
    document.getElementById('app').append(shell.frame);
    shell.built = true;
  }
  function syncShell() {
    ensureShell(); const l = learner();
    document.body.dataset.role = ui.role; document.body.dataset.band = l.band; document.body.dataset.locale = ui.locale; document.documentElement.lang = ui.locale;
    document.title = 'Kaizen — ' + tx('nav_' + ui.route); document.getElementById('skip').textContent = t('skip');
    shell.brandCap.textContent = tx('brand_caption'); shell.rail.setAttribute('aria-label', tx('rail_label'));
    shell.railNav.setAttribute('aria-label', tx('nav_label')); shell.tabbar.setAttribute('aria-label', tx('nav_label'));
    ROUTES.forEach((r) => [shell.navLinks[r], shell.tabLinks[r]].forEach((a) => { a.querySelector('.label').textContent = tx('nav_' + r); if (ui.route === r) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }));
    ['parent', 'student'].forEach((r) => { shell.roleBtns[r].setAttribute('aria-pressed', ui.role === r ? 'true' : 'false'); shell.roleBtns[r].textContent = t('role_' + r); });
    C.LOCALES.forEach((lc) => shell.localeBtns[lc].setAttribute('aria-pressed', ui.locale === lc ? 'true' : 'false'));
    shell.roleLabel.textContent = tx('viewing_as'); shell.learnerLabel.textContent = tx('child'); shell.localeLabel.textContent = tx('language'); shell.note.textContent = tx('demo_note');
    const sel = shell.learnerSel;
    if (sel.dataset.locale !== ui.locale) { sel.textContent = ''; D.LEARNERS.forEach((x) => sel.append(h('option', { value: x.id }, tx('learner_opt', { name: x.name, grade: x.grade })))); sel.dataset.locale = ui.locale; }
    if (sel.value !== ui.learnerId) sel.value = ui.learnerId;
  }
  // Developer scenario tools: a collapsed disclosure at the foot of the page, never part of the product chrome.
  function scenarioTools() {
    const pend = svc.pending(); const l = learner();
    return h('footer', { class: 'page-foot' }, h('details', { class: 'scenario', open: ui.scenarioOpen ? '' : null, ontoggle: (e) => { ui.scenarioOpen = e.target.open; } },
      h('summary', { 'data-fk': 'scenario-toggle' }, tx('scenario_h')), h('p', { class: 'muted' }, t('scen_p')),
      h('fieldset', null, h('legend', { class: 'sr-only' }, t('scen_h')), svc.SCENARIOS.map((s) => h('label', null, h('input', { type: 'radio', name: 'scenario', value: s, 'data-act': 'scenario', 'data-arg': s, 'data-fk': fk('scenario', s), checked: svc.scenario() === s ? '' : null, onchange: () => { svc.setScenario(s); render(); } }), t('scen_' + s)))),
      h('div', { class: 'row' }, h('span', { class: 'muted' }, t('pending_h') + ':'), pend.length ? pend.map((p) => h('span', { class: 'row' }, h('code', null, p.command.type + (p.command.learnerId ? ' · ' + p.command.learnerId : '')), btn(t('cancel'), 'cancel-op', p.id, () => { svc.cancel(p.id); }))) : h('span', { class: 'muted' }, t('pending_none'))),
      h('div', { class: 'row', style: 'margin-top:.5rem' }, btn(t('reset_learner') + ' (' + l.name + ')', 'reset-learner', null, () => openDialog('reset', {}, 'reset-learner'), { cls: 'danger' }))));
  }

  // ---------- module contract: sibling pages receive exactly these helpers ----------
  function viewContext() {
    return { D, C, svc, ui, t, tn, learner, isParent, draft, workDraft, obsDraft, errorsOf, selectedId, select, sampleOf, titleOf, instructionsOf,
      assistText, taskTitle, h, fk, btn, link, tag, notice, panel, fmtDate, fmtTime, subjectMark, stateTag, originTag, errText, errFor,
      countsLine, field, input, textarea, selectEl, formSummary, run, render, openDialog, setStatus, sameFields, emptyProp };
  }
  const asNodes = (r) => (Array.isArray(r) ? r.flat(Infinity) : [r]);
  function delegate(moduleName, method, fallback) {
    const M = window[moduleName];
    if (M && typeof M[method] === 'function') return asNodes(M[method](viewContext()));
    return [h('p', { class: 'muted fallback-note' }, tx('fallback_note')), ...fallback()];
  }

  // ---------- shared page pieces ----------
  const pageHead = (eyebrow, title, sub, actions) => h('header', { class: 'page-head' }, h('div', { class: 'page-title' }, eyebrow ? h('p', { class: 'eyebrow' }, eyebrow) : null, h('h1', { id: 'view-h', tabindex: '-1' }, title), sub ? h('p', { class: 'sub' }, sub) : null), actions ? h('div', { class: 'head-actions' }, actions) : null);
  // Parent entry point for new schoolwork: opens the form on arrival (focus lands on the title field).
  const addSchoolworkLink = (cls) => h('a', { class: 'btn ' + (cls || ''), href: '#/schoolwork', 'data-act': 'go-schoolwork-new', 'data-fk': 'go-schoolwork-new', onclick: () => { ui.newForm[ui.learnerId] = true; ui.editing[ui.learnerId] = null; ui.focusNext = 'new-title'; if (ui.route === 'schoolwork') render(); } }, tx('add_schoolwork'));
  const loadSampleBtn = () => btn(tx('load_sample'), 'load-sample', null, () => run({ type: 'loadSample', learnerId: ui.learnerId, requestKey: 'sample:' + ui.learnerId }, { success: t('sample_loaded'), focusNext: 'view-h' }), { requestKey: 'sample:' + ui.learnerId });
  const hasSample = () => svc.query.listTasks(ui.learnerId, { status: 'all' }).some((x) => x.sample && x.status !== 'archived');
  function taskRow(task, today, opts) {
    const o = opts || {}; const sess = svc.query.session(task.id); const overdue = task.status === 'open' && task.due < today;
    const inner = [subjectMark(task.subject), h('div', { class: 'row-text' }, h('div', { class: 'title' }, titleOf(task)), h('div', { class: 'sub' }, C.subject(ui.locale, task.subject), ' · ', task.status === 'archived' ? t('f_archived') : stateText(sess.state))), h('span', { class: 'when' + (overdue ? ' overdue' : '') }, dueText(task, today))];
    if (o.select) return h('li', { 'aria-current': o.current ? 'true' : null, 'data-task': task.id }, h('button', { type: 'button', class: 'row-main', 'data-act': 'task-select', 'data-arg': task.id, 'data-fk': fk('task-select', task.id), 'aria-pressed': o.current ? 'true' : 'false', onclick: o.select }, ...inner));
    const route = o.route || 'schoolwork';
    return h('li', { 'data-task': task.id }, h('a', { class: 'row-main', href: '#/' + route, 'data-act': 'go-' + route, 'data-arg': task.id, 'data-fk': fk('go-' + route, task.id), onclick: () => { select(task.id); if (route === 'record') ui.recordTask[ui.learnerId] = task.id; } }, ...inner));
  }
  function weekStrip(open, today) {
    const days = weekOf(today);
    return h('section', { class: 'week-wrap', 'aria-label': tx('this_week') }, h('ol', { class: 'week' }, days.map((d) => { const due = open.filter((x) => x.due === d).length; const past = d < today;
      return h('li', { class: (d === today ? 'today' : '') + (past ? ' past' : ''), 'aria-current': d === today ? 'date' : null },
        h('span', { class: 'dow' }, new Intl.DateTimeFormat(t('date_fmt'), { weekday: 'short', timeZone: 'UTC' }).format(new Date(d + 'T00:00:00Z'))),
        h('span', { class: 'num' }, String(Number(d.slice(8)))),
        h('span', { class: 'count' + (due ? ' due' : '') }, due ? txn('due_count', due) : '')); })));
  }
  function leadCard(eyebrow, title, body, actions, cls) {
    return h('section', { class: 'lead-card ' + (cls || ''), 'aria-labelledby': 'lead-h' }, eyebrow ? h('p', { class: 'eyebrow' }, eyebrow) : null, h('h2', { id: 'lead-h' }, title), body, actions && actions.length ? h('div', { class: 'actions' }, actions) : null);
  }

  // ---------- views ----------
  function todayParent() {
    const l = learner(); const today = svc.query.today(); const td = svc.query.todayForParent(ui.learnerId);
    const open = svc.query.listTasks(ui.learnerId, { status: 'open' }).slice().sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : 0));
    const attention = [];
    td.helpFlags.forEach((f) => attention.push({ kind: f.kind, taskId: f.taskId }));
    td.pendingDecisions.forEach((d) => attention.push({ kind: d.kind, taskId: d.taskId, id: d.id }));
    if (td.planConflicts.length) attention.push({ kind: 'plan_stale' });
    const sub = [t('grade_' + l.band), txn('open_tasks', open.length), attention.length ? txn('waiting', attention.length) : tx('nothing_waiting')].join(' · ');
    const head = pageHead(fmtLong(today), l.name, sub, addSchoolworkLink('primary'));
    const meta = (task) => h('p', { class: 'meta' }, C.subject(ui.locale, task.subject), ' · ', dueText(task, today), ' · ', stateText(svc.query.session(task.id).state));
    const describe = (a) => {
      const task = a.taskId && svc.query.task(a.taskId); const title = task ? titleOf(task) : '';
      if (a.kind === 'stuck') return { eyebrow: tx('needs_you'), title: tx('lead_stuck', { name: l.name, title }), task, actions: [link(tx('see_work'), 'workspace', task.id, 'primary'), link(tx('leave_note'), 'record', task.id)] };
      if (a.kind === 'help_unavailable') return { eyebrow: tx('needs_you'), title: tx('lead_help_unavailable', { name: l.name, title }), task, actions: [link(tx('see_work'), 'workspace', task.id, 'primary'), link(tx('leave_note'), 'record', task.id)] };
      if (a.kind === 'proposal') { const p = svc.query.proposals(ui.learnerId).find((x) => x.id === a.id); return { eyebrow: tx('needs_you'), title: tx('lead_proposal', { name: l.name, title: task ? title : (p ? p.taskId : '') }), task, quote: p ? p.reason : null, actions: [link(tx('review_plan'), 'plan', null, 'primary')] }; }
      if (a.kind === 'draft_plan') return { eyebrow: tx('needs_you'), title: tx('lead_draft'), actions: [link(tx('review_plan'), 'plan', null, 'primary')] };
      if (a.kind === 'plan_stale') return { eyebrow: tx('needs_you'), title: tx('lead_stale'), actions: [link(tx('review_plan'), 'plan', null, 'primary')] };
      return null;
    };
    let lead;
    if (attention.length) {
      const a = describe(attention[0]); const sess = a.task && svc.query.session(a.task.id); const lastStep = sess && sess.steps.length ? sess.steps[sess.steps.length - 1] : null;
      lead = leadCard(a.eyebrow, a.title, [a.task ? meta(a.task) : null, lastStep ? h('blockquote', { class: 'quote' }, h('span', { class: 'muted' }, tx('last_step') + ' · ' + fmtTime(lastStep.at)), h('span', { class: 'quote-text' }, lastStep.text)) : null, a.quote ? h('blockquote', { class: 'quote' }, h('span', { class: 'muted' }, t('prop_reason')), h('span', { class: 'quote-text' }, a.quote)) : null], a.actions);
    } else if (open.length) {
      const task = open[0]; const overdue = task.due < today;
      lead = leadCard(overdue ? tx('past_due') : tx('next_up'), titleOf(task), [meta(task), instructionsOf(task) ? h('p', { class: 'body' }, instructionsOf(task)) : null], [link(tx('open'), 'schoolwork', task.id, 'primary'), link(tx('see_work'), 'workspace', task.id)]);
    } else {
      lead = leadCard(null, tx('empty_h', { name: l.name }), h('p', { class: 'body muted' }, tx('empty_p')), [addSchoolworkLink('primary'), hasSample() ? null : loadSampleBtn()], 'empty');
    }
    const also = attention.length > 1 ? h('section', { class: 'also', 'aria-label': tx('also') }, h('h2', { class: 'k-label' }, tx('also')), h('ul', { class: 'also-list' }, attention.slice(1).map((x) => { const a = describe(x); return h('li', null, h('span', null, a.title), ' ', a.actions[0]); }))) : null;
    const list = open.length ? h('section', { class: 'assignments', 'aria-labelledby': 'asg-h' }, h('h2', { class: 'k-label', id: 'asg-h' }, tx('assignments')), h('ol', { class: 'rows' }, open.map((task) => taskRow(task, today)))) : null;
    return [head, weekStrip(open, today), lead, also, list];
  }
  function todayStudent() {
    const l = learner(); const today = svc.query.today(); const td = svc.query.todayForStudent(ui.learnerId); const nt = td.nextTask;
    const open = svc.query.listTasks(ui.learnerId, { status: 'open' }).slice().sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : 0));
    const others = open.filter((x) => !nt || x.id !== nt.id);
    if (l.band === 'k2') {
      const head = pageHead(null, tx('hi', { name: l.name }), null, null);
      const card = nt ? leadCard(tx('your_next'), titleOf(nt), [h('p', { class: 'meta' }, C.subject(ui.locale, nt.subject), ' · ', dueText(nt, today)), notice(t('k2_adult'), 'info')], [link(t('k2_next'), 'workspace', nt.id, 'primary big')], 'k2')
        : leadCard(null, tx('all_done_k2'), h('p', { class: 'body muted' }, t('k2_adult_note')), [], 'empty');
      const then = others.length ? h('section', { class: 'assignments', 'aria-labelledby': 'then-h' }, h('h2', { class: 'k-label', id: 'then-h' }, tx('then')), h('ol', { class: 'rows' }, others.map((task) => taskRow(task, today, { route: 'workspace' })))) : null;
      return [head, card, then];
    }
    const sess = nt && svc.query.session(nt.id); const sample = nt ? sampleOf(nt) : null;
    const head = pageHead(fmtLong(today), tx('hi', { name: l.name }), tn('student_remaining', td.remaining), null);
    const card = nt ? leadCard(tx('your_next'), titleOf(nt), [h('p', { class: 'meta' }, C.subject(ui.locale, nt.subject), ' · ', dueText(nt, today), ' · ', stateText(sess.state)), instructionsOf(nt) ? h('p', { class: 'body' }, instructionsOf(nt)) : null, h('p', { class: 'muted support' }, sample ? tx('support_sample') : tx('support_custom'))],
      [link(sess.state === 'not_started' ? t('student_start') : t('student_continue'), 'workspace', nt.id, 'primary big')])
      : leadCard(null, tx('all_done'), null, [], 'empty');
    const then = others.length ? h('section', { class: 'assignments', 'aria-labelledby': 'then-h' }, h('h2', { class: 'k-label', id: 'then-h' }, tx('then')), h('ol', { class: 'rows' }, others.map((task) => taskRow(task, today, { route: 'workspace' })))) : null;
    const propose = l.band === '68' && open.length ? h('p', { class: 'aside-link' }, link(tx('propose_date'), 'plan', null, 'quiet')) : null;
    return [head, card, then, propose];
  }

  const VIEWS = {
    today() { return isParent() ? todayParent() : todayStudent(); },
    schoolwork() {
      const l = learner(); const d = draft(); const today = svc.query.today();
      const all = svc.query.listTasks(ui.learnerId, { status: ui.filter.status, subject: ui.filter.subject || undefined });
      const anyAtAll = svc.query.listTasks(ui.learnerId, { status: 'all' }).length > 0;
      const sel = selectedId(); const editing = editingId(); const newOpen = !!ui.newForm[ui.learnerId];
      const openNew = () => { ui.newForm[ui.learnerId] = true; ui.editing[ui.learnerId] = null; ui.focusNext = 'new-title'; render(); };
      const head = pageHead(null, tx('nav_schoolwork'), l.name + ' · ' + txn('shown', all.length), isParent() ? btn(tx('add_schoolwork'), 'task-new', null, openNew, { cls: 'primary' }) : null);
      if (!anyAtAll && !newOpen) {
        return [head, leadCard(null, tx('empty_h', { name: l.name }), h('p', { class: 'body muted' }, isParent() ? tx('empty_p') : tx('all_done')), isParent() ? [btn(tx('add_schoolwork'), 'task-new', null, openNew, { cls: 'primary' }), loadSampleBtn()] : [], 'empty'), isParent() ? intakeDetails(d) : null, scenarioTools()];
      }
      const filters = h('div', { class: 'filters', role: 'group', 'aria-label': t('filter_status') },
        h('span', { class: 'filter' }, h('label', { for: 'f-status', class: 'ctx-label' }, tx('show')), selectEl('f-status', ui.filter.status, [['active', t('f_active')], ['open', t('f_open')], ['done', t('f_done')], ['archived', t('f_archived')], ['all', t('f_all')]], (v) => { ui.filter.status = v; render(); })),
        h('span', { class: 'filter' }, h('label', { for: 'f-subject', class: 'ctx-label' }, tx('subject')), selectEl('f-subject', ui.filter.subject, [['', t('f_any_subject')]].concat(D.SUBJECTS.map((s) => [s, C.subject(ui.locale, s)])), (v) => { ui.filter.subject = v; render(); })));
      const narrow = () => window.matchMedia && window.matchMedia('(max-width: 1023px)').matches;
      const rows = all.map((task) => taskRow(task, today, { select: () => { select(task.id); ui.editing[ui.learnerId] = null; if (narrow()) ui.focusNext = 'detail-h'; render(); }, current: sel === task.id }));
      const listCol = h('div', { class: 'sw-list' }, isParent() ? null : h('p', { class: 'muted' }, tx('sw_student_p')), filters, rows.length ? h('ul', { class: 'rows' }, rows) : h('p', { class: 'muted empty-filter' }, t('sw_empty_h')),
        isParent() && !hasSample() ? h('div', { class: 'row', style: 'margin-top:.75rem' }, loadSampleBtn()) : null);
      const side = [];
      if (isParent() && newOpen) side.push(taskForm('new', d.task, null));
      if (isParent() && editing) side.push(taskForm('edit', d.edit[editing] || (d.edit[editing] = editDraftFor(svc.query.task(editing))), editing));
      if (!editing) side.push(detailPanel(sel, today));
      return [head, h('div', { class: 'sw-layout' }, listCol, h('div', { class: 'sw-side' }, side)), isParent() ? intakeDetails(d) : null, scenarioTools()];
    },
    workspace() { return delegate('KaizenLearning', 'workspace', LEGACY.workspace); },
    plan() { return delegate('KaizenPlan', 'plan', LEGACY.plan); },
    record() { return delegate('KaizenLearning', 'record', LEGACY.record); },
  };

  // ---------- pre-redesign page implementations: temporary fallback while sibling modules land ----------
  const LEGACY = {
    workspace() {
      const l = learner(); const d = draft(); const sel = selectedId(); const task = sel && svc.query.task(sel);
      const head = h('div', { class: 'view-head' }, h('h1', { id: 'view-h', tabindex: '-1' }, t('ws_h')), h('span', { class: 'meta' }, l.name));
      if (!task) {
        const open = svc.query.listTasks(ui.learnerId, { status: 'open' });
        return [head, panel(t('ws_pick'), '', h('p', { class: 'muted' }, t('ws_none')), open.length ? h('ul', { class: 'records', style: 'margin-top:.75rem' }, open.map((x) => h('li', null, h('div', { class: 'row' }, subjectMark(x.subject), h('div', null, h('div', { class: 'title' }, titleOf(x)), h('div', { class: 'sub' }, t('due', { date: fmtDate(x.due) })))), h('div', { class: 'actions' }, btn(t('open_task'), 'ws-pick', x.id, () => { select(x.id); ui.focusNext = 'view-h'; render(); }, { cls: 'primary' }))))) : link(t('nav_schoolwork'), 'schoolwork', null))];
      }
      const sess = svc.query.session(task.id); const sample = sampleOf(task); const started = sess.state !== 'not_started'; const done = sess.state === 'complete_self_reported'; const archived = task.status === 'archived';
      const w = workDraft(d, task.id); const owner = task.learnerId;
      const rk = (type) => type + ':' + task.id;
      const contextPanel = panel(null, 'quiet', h('div', { class: 'row between' }, h('div', { class: 'row' }, subjectMark(task.subject), h('div', null, h('h2', null, titleOf(task)), h('div', { class: 'muted' }, C.subject(ui.locale, task.subject), ' · ', t('due', { date: fmtDate(task.due) }), ' · ', h('code', null, task.id)))), archived ? tag(t('f_archived'), 'danger') : stateTag(sess.state)),
        instructionsOf(task) ? h('p', { style: 'margin-top:.5rem' }, instructionsOf(task)) : null,
        h('div', { class: 'row', style: 'margin-top:.5rem' }, originTag(task), sample ? null : h('span', { class: 'muted' }, t('task_custom_note'))));
      // The actual short story the reading prompts refer to (generated sample text in the chosen locale; K–2 reads it with an adult).
      const story = sample && sample.story ? panel(t('ws_story_h'), 'quiet', l.band === 'k2' ? notice(t('ws_story_k2'), 'info', { style: 'margin-bottom:.5rem' }) : null, h('div', { class: 'story' }, sample.story.map((p) => h('p', null, p)))) : null;
      const stepsList = h('ul', { class: 'steps', 'aria-label': t('ws_steps_h') }, sess.steps.map((s) => h('li', null, h('span', { class: 'muted' }, fmtTime(s.at) + ' · '), s.text)));
      const assistList = h('ul', { class: 'assist', 'aria-label': t('ws_assist_h') }, sess.assistance.map((a) => h('li', { class: a.kind === 'requested' && !a.available ? 'unavail' : '' }, h('div', { class: 'row' }, tag(a.kind === 'requested' ? t('ws_help_requested') : t('ws_help_scripted'), a.kind === 'scripted' ? 'brand' : ''), h('span', { class: 'muted' }, C.helpType(ui.locale, a.type))),
        a.kind === 'requested' ? (a.available ? null : h('p', { style: 'margin-top:.25rem' }, t('ws_help_unavailable'))) : h('p', { style: 'margin-top:.25rem' }, assistText(a), a.sampleKey && a.sampleKey !== task.sample ? [' ', h('span', { class: 'muted' }, '(' + t('sample_prior_version', { v: a.sampleVersion || 1 }) + ')')] : null))));
      const helpBtn = (type, label) => btn(label, 'help', type, () => run({ type: 'requestHelp', taskId: task.id, helpType: type, requestKey: rk('help-' + type) }, { focusNext: fk('help', type) }), { requestKey: rk('help-' + type) });
      const controls = [];
      if (archived) {
        controls.push(notice(t('ws_archived'), 'warn', { role: 'status' }), h('div', { class: 'row' }, isParent() ? btn(t('restore'), 'task-restore', task.id, () => run({ type: 'restoreTask', taskId: task.id, requestKey: 'restore:' + task.id }, { success: t('restored'), focusNext: 'view-h' })) : null, link(t('nav_record'), 'record', task.id)));
      } else if (isParent()) {
        controls.push(notice(t('ws_shared_record_h') + ': ' + countsLine(sess), 'info'), h('div', { class: 'row' }, link(t('obs_h'), 'record', task.id, 'primary'), link(t('nav_record'), 'record', task.id)));
      } else if (!started) {
        controls.push(l.band === 'k2' ? h('div', { class: 'kbig' }, h('p', { class: 'lead' }, t('ws_k2_prompt')), btn(t('ws_k2_start'), 'ws-start', null, () => run({ type: 'startTask', taskId: task.id, requestKey: rk('start') }, { focusNext: 'ws-step' }), { cls: 'primary big', requestKey: rk('start') }))
          : btn(t('ws_start'), 'ws-start', null, () => run({ type: 'startTask', taskId: task.id, requestKey: rk('start') }, { focusNext: 'ws-step' }), { cls: 'primary big', requestKey: rk('start') }));
      } else {
        const stepForm = h('form', { onsubmit: (e) => { e.preventDefault(); const text = w.step; run({ type: 'addStep', taskId: task.id, text, requestKey: rk('step') }, { form: 'ws', onOk: () => { if (w.step === text) w.step = ''; }, focusNext: 'ws-step' }); } },
          h('h3', null, t('ws_step_h')), field('ws-step', t('ws_step_label'), textarea('ws-step', w.step, (v) => { w.step = v; }, { maxlength: D.LIMITS.step, 'aria-describedby': 'ws-step-hint', rows: l.band === 'k2' ? 2 : 3 }), { hint: t('f_limit', { n: D.LIMITS.step }), error: errorsOf(owner).ws && errorsOf(owner).ws.text ? errFor(errorsOf(owner).ws.text, D.LIMITS.step) : null }),
          h('div', { class: 'row' }, h('button', { type: 'submit', class: 'btn primary', 'data-act': 'ws-step-add', 'data-fk': 'ws-step-add' }, t('ws_step_add'))));
        const tally = h('div', null, h('h3', null, t('ws_tally_h')), h('p', { class: 'muted' }, t('ws_tally_p')), h('div', { class: 'tally', role: 'group', 'aria-label': t('ws_tally_h'), style: 'margin:.5rem 0' }, w.tally.map((on, i) => h('button', { type: 'button', 'aria-pressed': on ? 'true' : 'false', 'aria-label': t('tile', { n: i + 1 }), 'data-act': 'tile', 'data-arg': i, 'data-fk': fk('tile', i), onclick: (e) => { w.tally[i] = !w.tally[i]; e.currentTarget.setAttribute('aria-pressed', w.tally[i] ? 'true' : 'false'); e.currentTarget.textContent = w.tally[i] ? '●' : '○'; } }, on ? '●' : '○'))),
          btn(t('ws_tally_save'), 'tally-save', null, () => { const marks = w.tally.slice(); run({ type: 'addStep', taskId: task.id, text: tn('ws_tally_text', marks.filter(Boolean).length), requestKey: rk('step') }, { onOk: () => { if (marks.every((m, i) => m === w.tally[i])) w.tally = Array(10).fill(false); }, focusNext: 'tally-save' }); }));
        const help = h('div', null, h('h3', null, t('ws_help_h')), h('div', { class: 'row', style: 'margin:.5rem 0' }, helpBtn('hint', t('support_hint')), helpBtn('scaffold', t('support_scaffold')), helpBtn('voice_demo', t('support_voice'))), h('p', { class: 'muted' }, sample ? t('ws_voice_note') : t('ws_help_unavailable')));
        const check = sample && sample.answerKind === 'whole_number' ? h('form', { onsubmit: (e) => { e.preventDefault(); run({ type: 'checkAnswer', taskId: task.id, answer: w.answer, requestKey: rk('check') }, { focusNext: 'ws-answer', onOk: (data) => { w.lastCheck = data.check; } }); } }, h('h3', null, t('ws_check_h')),
          field('ws-answer', t('ws_check_label'), input('ws-answer', w.answer, (v) => { w.answer = v; }, { inputmode: 'numeric', maxlength: D.LIMITS.answer, autocomplete: 'off' })), h('div', { class: 'row' }, h('button', { type: 'submit', class: 'btn', 'data-act': 'ws-check', 'data-fk': 'ws-check' }, t('ws_check'))),
          sess.checks.length ? notice(t('ws_check_' + { match: 'match', no_match: 'no_match', not_a_number: 'nan' }[sess.checks[sess.checks.length - 1].verdict]) + ' (' + t('src_check_scripted') + ')', sess.checks[sess.checks.length - 1].verdict === 'match' ? 'ok' : 'warn', { style: 'margin-top:.5rem' }) : null)
          : notice(t('ws_check_unsupported'), '');
        // "I'm stuck" saves a local flag for the next parent visit and keeps focus on the work field — never on Mark done.
        const stateBtns = h('div', { class: 'row' + (l.band === 'k2' ? ' kbig' : ''), style: 'margin-top:.75rem' },
          !done && sess.state !== 'stuck' ? btn(l.band === 'k2' ? t('ws_k2_stuck') : t('ws_stuck'), 'ws-stuck', null, () => run({ type: 'flagStuck', taskId: task.id, requestKey: rk('stuck') }, { success: t('stuck_saved'), focusNext: 'ws-step' }), { cls: l.band === 'k2' ? 'big' : '', requestKey: rk('stuck') }) : null,
          !done ? btn(l.band === 'k2' ? t('ws_k2_done') : t('ws_complete'), 'ws-complete', null, () => run({ type: 'markComplete', taskId: task.id, requestKey: rk('complete') }, { focusNext: 'view-h' }), { cls: 'primary' + (l.band === 'k2' ? ' big' : ''), requestKey: rk('complete') }) : null);
        controls.push(sess.state === 'stuck' ? notice(t('stuck_saved'), 'warn', { role: 'status' }) : null, stepForm, l.band === 'k2' ? null : tally, help, l.band === 'k2' ? null : check, stateBtns, h('p', { class: 'muted' }, t('ws_complete_note')));
      }
      return [head, contextPanel, story, h('div', { class: 'work-area', style: 'margin-top:1rem' },
        panel(t('ws_state'), '', h('div', { class: 'stack' }, controls)),
        h('div', { class: 'stack' }, panel(t('ws_steps_h'), '', sess.steps.length ? stepsList : h('p', { class: 'muted' }, t('ws_steps_empty'))), panel(t('ws_assist_h'), '', sess.assistance.length ? assistList : h('p', { class: 'muted' }, t('ws_assist_empty')))))];
    },

    plan() {
      const l = learner(); const d = draft(); const plans = svc.query.plans(ui.learnerId); const sched = svc.query.schedule(ui.learnerId);
      const head = h('div', { class: 'view-head' }, h('h1', { id: 'view-h', tabindex: '-1' }, t('plan_h')), h('span', { class: 'meta' }, l.name));
      const schedPanel = panel(t('sched_h'), '', sched.length ? h('ul', { class: 'sched' }, sched.map((g) => h('li', null, h('span', { class: 'date' + (g.overdue ? ' overdue' : '') }, fmtDate(g.date), g.overdue ? ' · ' + t('sched_overdue') : ''), h('div', null, g.tasks.map((x) => h('div', null, h('a', { href: '#/schoolwork', 'data-act': 'go-schoolwork', 'data-arg': x.id, 'data-fk': fk('sched', x.id), onclick: () => select(x.id) }, titleOf(x)))))))) : h('p', { class: 'muted' }, t('sched_empty')));
      const conflictsOf = (plan) => svc.query.planConflicts(plan).map((c) => h('li', { class: 'notice warn' }, c.reason === 'archived' ? t('conflict_archived', { title: taskTitle(c.taskId, c.title) }) : t('conflict_due', { title: taskTitle(c.taskId, c.title), from: fmtDate(c.from), to: fmtDate(c.to) })));
      const itemsOf = (plan) => h('ul', { class: 'plan-items' }, plan.items.map((i) => h('li', null, h('span', { class: 'date' }, fmtDate(i.day)), h('span', null, taskTitle(i.taskId, i.title), ' ', h('span', { class: 'muted' }, '· ' + t('due', { date: fmtDate(i.due) }))))));
      const cur = plans.current; const curConf = cur ? conflictsOf(cur) : [];
      const currentPanel = panel(t('current_h'), '', cur ? h('div', { class: 'stack' }, h('p', { class: 'muted' }, t('current_prov', { time: fmtTime(cur.decidedAt) }), ' · ', h('code', null, cur.id)), curConf.length ? [notice(t('current_stale'), 'warn'), h('ul', { class: 'stack' }, curConf)] : null, itemsOf(cur)) : h('p', { class: 'muted' }, t('current_empty')));
      const dr = plans.draft; const drConf = dr && dr.status === 'draft' ? conflictsOf(dr) : [];
      const draftBody = [];
      if (dr && dr.status === 'draft') { draftBody.push(h('p', { class: 'muted' }, t('draft_prov'), ' · ', h('code', null, dr.id)), drConf.length ? [notice(t('draft_stale'), 'warn'), h('ul', { class: 'stack' }, drConf)] : null, itemsOf(dr)); }
      else if (dr && dr.status === 'declined') draftBody.push(notice(t('draft_declined'), ''));
      else draftBody.push(h('p', { class: 'muted' }, t('draft_none')));
      // Decisions carry the reviewed draft id; a replacement draft arriving first is rejected by the domain ('replaced').
      if (isParent()) draftBody.push(h('div', { class: 'row', style: 'margin-top:.75rem' },
        dr && dr.status === 'draft' && !drConf.length ? btn(t('draft_accept'), 'draft-accept', null, () => run({ type: 'acceptDraft', learnerId: ui.learnerId, planId: dr.id, requestKey: 'accept:' + ui.learnerId }, { success: t('plan_accepted'), focusNext: 'draft-request' }), { cls: 'primary', requestKey: 'accept:' + ui.learnerId }) : null,
        dr && dr.status === 'draft' ? btn(t('draft_decline'), 'draft-decline', null, () => run({ type: 'declineDraft', learnerId: ui.learnerId, planId: dr.id, requestKey: 'decline:' + ui.learnerId }, { success: t('plan_declined'), focusNext: 'draft-request' }), { requestKey: 'decline:' + ui.learnerId }) : null,
        btn(dr ? t('draft_redraft') : t('draft_request'), 'draft-request', null, () => run({ type: 'draftPlan', learnerId: ui.learnerId, requestKey: 'draft:' + ui.learnerId }, { success: t('plan_drafted'), focusNext: 'draft-accept' }), { cls: dr && dr.status === 'draft' && !drConf.length ? '' : 'primary', requestKey: 'draft:' + ui.learnerId })));
      const draftPanel = panel(t('draft_h'), '', h('div', { class: 'stack' }, draftBody));
      const props = svc.query.proposals(ui.learnerId);
      const propItems = props.map((p) => { const ps = svc.query.proposalState(p.id) || { status: p.status }; const stale = ps.status === 'stale'; const unavailable = ps.status === 'unavailable';
        const statusTag = stale ? tag(t('prop_status_stale'), 'danger') : unavailable ? tag(t('prop_status_unavailable'), 'danger') : tag(t('prop_status_' + p.status), p.status === 'accepted' ? 'ok' : p.status === 'declined' ? 'danger' : 'warn');
        return h('li', null, h('div', null, h('div', { class: 'title' }, t('prop_line', { title: taskTitle(p.taskId, p.taskId), from: fmtDate(p.fromDue), to: fmtDate(p.toDue) })), h('div', { class: 'sub' }, t('prop_reason') + ': ', h('span', { style: 'white-space:pre-wrap' }, p.reason)), h('div', { class: 'sub' }, statusTag),
          stale ? notice(t('prop_stale_note', { from: fmtDate(p.fromDue), due: fmtDate(ps.currentDue) }), 'warn', { style: 'margin-top:.375rem' }) : null, unavailable ? notice(t('prop_unavailable_note'), '', { style: 'margin-top:.375rem' }) : null),
        isParent() && p.status === 'pending' ? h('div', { class: 'actions' }, !stale && !unavailable ? btn(t('prop_accept'), 'prop-accept', p.id, () => run({ type: 'decideProposal', proposalId: p.id, decision: 'accept', requestKey: 'prop:' + p.id }, { success: t('prop_decided', { status: t('prop_status_accepted') }), focusNext: 'view-h', errorMap: { stale: t('e_prop_stale'), conflict: t('e_prop_archived') } }), { cls: 'primary', requestKey: 'prop:' + p.id }) : null, btn(t('prop_decline'), 'prop-decline', p.id, () => run({ type: 'decideProposal', proposalId: p.id, decision: 'decline', requestKey: 'prop:' + p.id }, { success: t('prop_decided', { status: t('prop_status_declined') }), focusNext: 'view-h' }), { requestKey: 'prop:' + p.id })) : null); });
      const propForm = !isParent() && l.band === '68' ? h('form', { style: 'margin-top:.75rem', onsubmit: (e) => { e.preventDefault(); const sent = { ...d.prop }; run({ type: 'proposeChange', learnerId: ui.learnerId, input: { taskId: sent.taskId, due: sent.due, reason: sent.reason }, requestKey: 'propose:' + ui.learnerId }, { form: 'prop', success: t('prop_sent'), onOk: () => { if (sameFields(d.prop, sent)) d.prop = emptyProp(); }, focusNext: 'view-h' }); } },
        h('h3', null, t('prop_form_h')), formSummary('prop', errorsOf().prop, { taskId: t('prop_task'), due: t('prop_due'), reason: t('prop_reason_label') }),
        field('prop-taskId', t('prop_task'), selectEl('prop-taskId', d.prop.taskId, [['', '—']].concat(svc.query.listTasks(ui.learnerId, { status: 'open' }).map((x) => [x.id, titleOf(x) + ' · ' + fmtDate(x.due)])), (v) => { d.prop.taskId = v; }), { error: errorsOf().prop && errorsOf().prop.taskId ? errText(errorsOf().prop.taskId) : null }),
        field('prop-due', t('prop_due'), input('prop-due', d.prop.due, (v) => { d.prop.due = v; }, { placeholder: 'YYYY-MM-DD', inputmode: 'numeric', maxlength: 10, autocomplete: 'off' }), { hint: 'YYYY-MM-DD', error: errorsOf().prop && errorsOf().prop.due ? errText(errorsOf().prop.due) : null }),
        field('prop-reason', t('prop_reason_label'), textarea('prop-reason', d.prop.reason, (v) => { d.prop.reason = v; }, { maxlength: D.LIMITS.reason, rows: 2 }), { hint: t('f_limit', { n: D.LIMITS.reason }), error: errorsOf().prop && errorsOf().prop.reason ? errFor(errorsOf().prop.reason, D.LIMITS.reason) : null }),
        h('div', { class: 'row' }, h('button', { type: 'submit', class: 'btn primary', 'data-act': 'prop-send', 'data-fk': 'prop-send' }, t('prop_send'))), h('p', { class: 'muted', style: 'margin-top:.5rem' }, t('prop_visibility'))) : null;
      const propsPanel = panel(t('props_h'), '', propItems.length ? h('ul', { class: 'records' }, propItems) : h('p', { class: 'muted' }, t('props_empty')), propForm);
      const hist = plans.history.slice().reverse();
      const histPanel = panel(t('history_h'), 'quiet', hist.length ? h('ul', { class: 'records' }, hist.map((p) => h('li', null, h('div', null, h('div', { class: 'title' }, tag(t('h_' + p.status), p.status === 'accepted' ? 'ok' : p.status === 'declined' ? 'danger' : ''), ' ', h('code', null, p.id)), h('div', { class: 'sub' }, fmtTime(p.decidedAt || p.createdAt), ' · ', tn('items', p.items.length)))))) : h('p', { class: 'muted' }, t('history_empty')));
      return [head, h('div', { class: 'grid grid-2' }, h('div', { class: 'stack' }, currentPanel, draftPanel), h('div', { class: 'stack' }, schedPanel, propsPanel, histPanel))];
    },

    record() {
      const l = learner(); const d = draft(); const tasks = svc.query.listTasks(ui.learnerId, { status: 'all' });
      // Record filter: undefined = never chosen (follow the selected task), 'all' = explicit All, otherwise an explicit task id.
      let rf = ui.recordTask[ui.learnerId]; if (rf && rf !== 'all' && !svc.query.task(rf)) rf = undefined;
      const rt = rf === undefined ? selectedId() : rf === 'all' ? null : rf;
      const events = rt ? svc.query.record(rt) : svc.query.learnerRecord(ui.learnerId);
      const head = h('div', { class: 'view-head' }, h('h1', { id: 'view-h', tabindex: '-1' }, t('rec_h')), h('span', { class: 'meta' }, l.name));
      const picker = h('div', { class: 'row' }, h('label', { for: 'rec-task' }, t('rec_task')), selectEl('rec-task', rt || '', [['', t('rec_all', { name: l.name })]].concat(tasks.map((x) => [x.id, titleOf(x)])), (v) => { ui.recordTask[ui.learnerId] = v || 'all'; if (v) select(v); render(); }));
      const describe = (e) => {
        const dt = e.detail || {};
        switch (e.source) {
          case 'task_change': return e.type === 'edited' ? t('ev_edited', { fields: (dt.changed || []).map((f) => f + ': ' + JSON.stringify(dt.from[f]) + ' → ' + JSON.stringify(dt.to[f])).join('; ') }) : t('ev_' + e.type);
          case 'student_activity': return t('ev_' + e.type);
          case 'student_work': return dt.text;
          case 'help_requested': return t('ev_help', { type: C.helpType(ui.locale, e.type), avail: dt.available ? t('avail_yes') : t('avail_no') });
          case 'help_scripted': return assistText({ kind: 'scripted', type: e.type, text: dt.text, sampleKey: dt.sampleKey, sampleVersion: dt.sampleVersion, index: dt.index });
          case 'check_scripted': return t('ev_check', { raw: dt.raw, verdict: e.type });
          case 'parent_observation': return dt.text;
          case 'plan': return t('ev_' + e.type);
          case 'proposal': return e.type === 'proposed' ? t('ev_proposed', { from: fmtDate(dt.fromDue), to: fmtDate(dt.toDue) }) + (dt.reason ? ' — ' + dt.reason : '') : t('ev_prop_' + e.type);
          default: return e.type;
        }
      };
      const cls = (s) => s === 'student_work' ? 'work' : s.startsWith('help') || s === 'check_scripted' ? 'help' : s === 'parent_observation' ? 'obs' : '';
      const timeline = events.length ? h('ol', { class: 'timeline', 'aria-label': t('rec_h') }, events.map((e) => { const task = e.taskId && svc.query.task(e.taskId); return h('li', null, h('div', null, h('div', { class: 'src ' + cls(e.source) }, t('src_' + e.source)), h('div', { class: 'when' }, fmtTime(e.at))), h('div', { class: 'what' }, !rt && task ? [h('strong', null, titleOf(task)), ' · '] : null, describe(e))); })) : h('p', { class: 'muted' }, t('rec_empty'));
      const side = [];
      if (isParent()) {
        const task = rt && svc.query.task(rt);
        if (task) {
          const o = obsDraft(d, task.id); const owner = task.learnerId;
          side.push(panel(t('obs_h'), '', h('form', { onsubmit: (e) => { e.preventDefault(); const text = o.text; run({ type: 'addObservation', taskId: task.id, text, requestKey: 'obs:' + task.id }, { form: 'obs', success: t('obs_added'), onOk: () => { if (o.text === text) o.text = ''; }, focusNext: 'obs-text' }); } },
            h('p', { class: 'muted' }, titleOf(task)), formSummary('obs', errorsOf(owner).obs, { text: t('obs_label') }),
            field('obs-text', t('obs_label'), textarea('obs-text', o.text, (v) => { o.text = v; }, { maxlength: D.LIMITS.observation, rows: 3, 'aria-describedby': 'obs-text-hint' }), { hint: t('f_limit', { n: D.LIMITS.observation }) + ' · ' + t('obs_visible'), error: errorsOf(owner).obs && errorsOf(owner).obs.text ? errFor(errorsOf(owner).obs.text, D.LIMITS.observation) : null }),
            h('div', { class: 'row' }, h('button', { type: 'submit', class: 'btn primary', 'data-act': 'obs-add', 'data-fk': 'obs-add' }, t('obs_add'))))));
        } else side.push(panel(t('obs_h'), '', h('p', { class: 'muted' }, t('select_task'))));
      } else side.push(panel(t('rec_student_h'), 'quiet', h('p', { class: l.band === 'k2' ? 'lead' : '' }, l.band === 'k2' ? t('rec_k2_p') : l.band === '35' ? t('rec_student_p_35') : t('rec_student_p'))));
      side.push(notice(t('rec_mastery'), 'info'), notice(t('rec_cadence'), ''));
      if (rt) { const s = svc.query.session(rt); side.push(h('p', { class: 'muted' }, countsLine(s))); }
      return [head, h('div', { class: 'grid grid-2' }, panel(null, '', picker, h('div', { style: 'margin-top:.75rem' }, timeline)), h('div', { class: 'stack' }, side))];
    },
  };

  // ---------- schoolwork sub-panels ----------
  function taskForm(mode, values, taskId) {
    const formId = mode; const owner = ui.learnerId; const ownerDraft = draft(owner); const errors = errorsOf(owner)[formId] || {};
    // Untouched fields of an open edit draft follow the current record and locale (value and baseline move together, so they stay
    // clean and are never submitted); a field the family typed into keeps its text across locale/role/route changes.
    if (mode === 'edit' && values.baseline) { const task = svc.query.task(taskId); if (task) { const now = { title: titleOf(task), subject: task.subject, due: task.due, instructions: instructionsOf(task) }; Object.keys(now).forEach((k) => { if (values[k] === values.baseline[k] && now[k] !== values.baseline[k]) { values[k] = now[k]; values.baseline[k] = now[k]; } }); } }
    const labels = { title: t('f_title'), subject: t('f_subject'), due: t('f_due'), instructions: t('f_instructions') };
    const submit = (e) => {
      e.preventDefault();
      const payload = { title: values.title, subject: values.subject, due: values.due, instructions: values.instructions };
      if (mode === 'new') {
        // Completion is bound to the originating learner and to this submitted revision: it closes/clears the form only if the
        // text is still that revision, selects the task for the owner only, and never touches another learner's open form.
        run({ type: 'createTask', learnerId: owner, input: payload, requestKey: 'create:' + owner }, { form: 'new', success: t('created'), onOk: (data, ctx) => {
          if (sameFields(ownerDraft.task, payload)) { ownerDraft.task = emptyTask(); ui.newForm[owner] = false; }
          if (maySelect(ctx.origin, owner)) select(data.task.id, owner); }, focusNext: (data) => (ui.selected[owner] === data.task.id ? fk('task-select', data.task.id) : null) });
      } else {
        // Compare against the baseline captured when the form opened (never the current locale's rendering): untouched generated
        // fields are not family edits, and a stale untouched field is never submitted over an unrelated newer change.
        const task = svc.query.task(taskId); const base = values.baseline || (task ? { title: titleOf(task), subject: task.subject, due: task.due, instructions: instructionsOf(task) } : {});
        const changes = {}; Object.keys(payload).forEach((k) => { if (payload[k] !== base[k]) changes[k] = payload[k]; });
        run({ type: 'editTask', learnerId: owner, taskId, changes, requestKey: 'edit:' + taskId }, { form: 'edit', success: t('edited'), onOk: () => {
          if (ui.editing[owner] === taskId && sameFields(ownerDraft.edit[taskId], payload)) { ui.editing[owner] = null; delete ownerDraft.edit[taskId]; } }, focusNext: fk('task-select', taskId) });
      }
    };
    return h('section', { class: 'panel', 'aria-labelledby': formId + '-h' }, h('h2', { id: formId + '-h' }, mode === 'new' ? t('form_new_h') : t('form_edit_h')),
      h('form', { id: formId + '-form', novalidate: '', onsubmit: submit }, formSummary(formId, errors, labels),
        field(formId + '-title', labels.title, input(formId + '-title', values.title, (v) => { values.title = v; }, { maxlength: D.LIMITS.title, autocomplete: 'off', 'aria-invalid': errors.title ? 'true' : null, 'aria-describedby': errors.title ? formId + '-title-err' : null }), { hint: t('f_limit', { n: D.LIMITS.title }), error: errors.title ? errFor(errors.title, D.LIMITS.title) : null }),
        field(formId + '-subject', labels.subject, selectEl(formId + '-subject', values.subject, [['', '—']].concat(D.SUBJECTS.map((s) => [s, C.subject(ui.locale, s)])), (v) => { values.subject = v; }, { 'aria-invalid': errors.subject ? 'true' : null }), { error: errors.subject ? errText(errors.subject) : null }),
        field(formId + '-due', labels.due, input(formId + '-due', values.due, (v) => { values.due = v; }, { placeholder: 'YYYY-MM-DD', inputmode: 'numeric', maxlength: 10, autocomplete: 'off', 'aria-invalid': errors.due ? 'true' : null, 'aria-describedby': formId + '-due-hint' }), { hint: 'YYYY-MM-DD', error: errors.due ? errText(errors.due) : null }),
        field(formId + '-instructions', labels.instructions, textarea(formId + '-instructions', values.instructions, (v) => { values.instructions = v; }, { maxlength: D.LIMITS.instructions, rows: 3 }), { hint: t('f_limit', { n: D.LIMITS.instructions }), error: errors.instructions ? errFor(errors.instructions, D.LIMITS.instructions) : null }),
        h('div', { class: 'row' }, h('button', { type: 'submit', class: 'btn primary' + (ui.pendingKeys.has(mode === 'new' ? 'create:' + owner : 'edit:' + taskId) ? ' busy' : ''), 'data-act': formId + '-submit', 'data-fk': formId + '-submit' }, mode === 'new' ? t('create') : t('save')),
          btn(t('cancel'), formId + '-cancel', null, () => { if (mode === 'new') ui.newForm[owner] = false; else ui.editing[owner] = null; errorsOf(owner)[formId] = null; ui.focusNext = mode === 'new' ? 'task-new' : fk('task-edit', taskId); render(); }))));
  }

  function detailPanel(sel, today) {
    const task = sel && svc.query.task(sel);
    if (!task) return h('section', { class: 'panel detail quiet', 'aria-label': t('detail_h') }, h('p', { class: 'muted' }, t('select_task')));
    const sess = svc.query.session(task.id); const archived = task.status === 'archived';
    const actions = [
      archived ? null : link(tx('open_in_learn'), 'workspace', task.id, 'primary'), link(tx('activity'), 'record', task.id),
      isParent() && !archived ? btn(t('edit'), 'task-edit', task.id, () => { select(task.id); ui.editing[ui.learnerId] = task.id; draft().edit[task.id] = draft().edit[task.id] || editDraftFor(task); ui.focusNext = 'edit-title'; render(); }) : null,
      isParent() && !archived ? btn(t('archive'), 'task-archive', task.id, () => openDialog('archive', { taskId: task.id }, fk('task-archive', task.id)), { cls: 'quiet' }) : null,
      isParent() && archived ? btn(t('restore'), 'task-restore', task.id, () => run({ type: 'restoreTask', taskId: task.id, requestKey: 'restore:' + task.id }, { success: t('restored'), focusNext: fk('task-select', task.id) })) : null];
    return h('section', { class: 'panel detail', 'aria-labelledby': 'detail-h' },
      h('p', { class: 'eyebrow' }, C.subject(ui.locale, task.subject), ' · ', dueText(task, today)),
      h('h2', { id: 'detail-h', tabindex: '-1', 'data-fk': 'detail-h' }, titleOf(task)),
      instructionsOf(task) ? h('p', { class: 'body', style: 'white-space:pre-wrap' }, instructionsOf(task)) : h('p', { class: 'muted' }, tx('no_instructions')),
      h('p', { class: 'tags' }, archived ? tag(t('f_archived'), 'danger') : stateTag(sess.state), originTag(task)),
      h('div', { class: 'actions' }, actions),
      h('details', { class: 'fine' }, h('summary', { 'data-fk': 'detail-fine' }, tx('details')),
        h('dl', null, h('dt', null, tx('id_label')), h('dd', null, h('code', null, task.id)), h('dt', null, t('version', { v: '' }).trim()), h('dd', null, String(task.version)), h('dt', null, tx('state_label')), h('dd', null, t('updated', { time: fmtTime(task.updatedAt) }))),
        task.sample ? null : h('p', { class: 'muted' }, t('task_custom_note'))));
  }
  const SAMPLE_NOTE = 'Title: Weather journal (sample)\nSubject: science\nDue: 2026-10-08\nInstructions: Record the sky and temperature for three days and write one sentence each day.';
  function readNote(text) {
    const out = {}; const map = { title: 'title', subject: 'subject', due: 'due', instructions: 'instructions' };
    String(text || '').split(/\r?\n/).forEach((line) => { const m = /^\s*(Title|Subject|Due|Instructions)\s*:\s*(.+)$/i.exec(line); if (m) out[map[m[1].toLowerCase()]] = m[2].trim(); });
    return Object.keys(out).length ? out : null;
  }

  // Teacher-note intake: an optional, collapsed disclosure under the list (opens itself while a note or review is in progress).
  function intakeDetails(d) {
    if (!isParent()) return null;
    const review = d.intake; const owner = ui.learnerId; const errors = errorsOf(owner);
    const open = !!ui.intakeOpen[owner] || !!review || !!(d.note && d.note.trim());
    return h('details', { class: 'intake', open: open ? '' : null, ontoggle: (e) => { ui.intakeOpen[owner] = e.target.open; } }, h('summary', { 'data-fk': 'intake-toggle' }, tx('intake_summary')),
      h('div', { class: 'intake-body' }, h('p', { class: 'muted' }, t('intake_p')),
        field('intake-note', t('f_note'), textarea('intake-note', d.note, (v) => { d.note = v; }, { maxlength: D.LIMITS.note, rows: 4 })),
        h('div', { class: 'row' }, btn(t('intake_load'), 'intake-load', null, () => { d.note = SAMPLE_NOTE; ui.intakeOpen[owner] = true; ui.focusNext = 'intake-read'; render(); }), btn(t('intake_read'), 'intake-read', null, () => { const r = readNote(d.note); d.intake = r ? { title: r.title || '', subject: (r.subject || '').toLowerCase(), due: r.due || '', instructions: r.instructions || '' } : null; d.intakeNone = !r; ui.intakeOpen[owner] = true; ui.focusNext = r ? 'intake-title' : 'intake-read'; render(); }, { cls: 'primary' })),
        d.intakeNone && !review ? notice(t('intake_none'), 'warn', { role: 'status' }) : null,
        review ? h('form', { style: 'margin-top:.75rem', novalidate: '', onsubmit: (e) => { e.preventDefault(); const payload = { ...review }; run({ type: 'createTask', learnerId: owner, input: payload, origin: 'intake', requestKey: 'create:' + owner }, { form: 'intake', success: t('created'), onOk: (data, ctx) => { if (d.intake === review && sameFields(review, payload)) d.intake = null; if (maySelect(ctx.origin, owner)) select(data.task.id, owner); }, focusNext: (data) => (ui.selected[owner] === data.task.id ? fk('task-select', data.task.id) : null) }); } },
          h('h3', null, t('intake_review_h')), h('p', { class: 'muted' }, t('intake_source')), formSummary('intake', errors.intake, { title: t('f_title'), subject: t('f_subject'), due: t('f_due'), instructions: t('f_instructions') }),
          field('intake-title', t('f_title'), input('intake-title', review.title, (v) => { review.title = v; }, { maxlength: D.LIMITS.title }), { error: errors.intake && errors.intake.title ? errFor(errors.intake.title, D.LIMITS.title) : null }),
          field('intake-subject', t('f_subject'), selectEl('intake-subject', D.SUBJECTS.includes(review.subject) ? review.subject : '', [['', '—']].concat(D.SUBJECTS.map((s) => [s, C.subject(ui.locale, s)])), (v) => { review.subject = v; }), { error: errors.intake && errors.intake.subject ? errText(errors.intake.subject) : null }),
          field('intake-due', t('f_due'), input('intake-due', review.due, (v) => { review.due = v; }, { placeholder: 'YYYY-MM-DD', maxlength: 10 }), { hint: 'YYYY-MM-DD', error: errors.intake && errors.intake.due ? errText(errors.intake.due) : null }),
          field('intake-instructions', t('f_instructions'), textarea('intake-instructions', review.instructions, (v) => { review.instructions = v; }, { maxlength: D.LIMITS.instructions, rows: 2 }), { error: errors.intake && errors.intake.instructions ? errFor(errors.intake.instructions, D.LIMITS.instructions) : null }),
          h('div', { class: 'row' }, h('button', { type: 'submit', class: 'btn primary', 'data-act': 'intake-confirm', 'data-fk': 'intake-confirm' }, t('intake_confirm')), btn(t('intake_discard'), 'intake-discard', null, () => { d.intake = null; ui.focusNext = 'intake-read'; render(); }))) : null));
  }

  // ---------- render with focus continuity (shell patched in place, main replaced) ----------
  function measureChrome() {
    const tb = shell.tabbar; const th = tb && getComputedStyle(tb).display !== 'none' ? tb.offsetHeight : 0;
    document.documentElement.style.setProperty('--tab-h', th + 'px');
    const statusEl = document.getElementById('status'); document.documentElement.style.setProperty('--status-h', (ui.status ? statusEl.offsetHeight : 0) + 'px');
  }
  let rendering = false;
  function render() {
    if (rendering) return; rendering = true;
    try {
      const active = document.activeElement; const prevKey = focusKeyOf(active);
      const caret = active && typeof active.selectionStart === 'number' ? [active.selectionStart, active.selectionEnd, active.selectionDirection] : null;
      syncShell();
      const page = shell.page; page.textContent = '';
      if (ui.booting) page.append(h('p', { class: 'muted booting', role: 'status' }, tx('booting')));
      else { const out = VIEWS[ui.route](); page.append(...out.flat(Infinity).filter(Boolean)); if (ui.route !== 'schoolwork') page.append(scenarioTools()); }
      renderStatus(); renderDialog(); measureChrome();
      if (ui.dialog) return;
      let target = null;
      if (ui.focusNext) { target = findByKey(ui.focusNext); ui.focusNext = null; }
      // A stable focused element (heading, main, summary, link, field) keeps focus across unrelated renders; the heading is the
      // fallback only when the previously focused control no longer exists.
      if (!target && prevKey) target = findByKey(prevKey);
      if (!target && prevKey && prevKey !== 'skip') target = document.getElementById('view-h');
      if (target && target !== document.activeElement) target.focus({ preventScroll: false });
      if (target && caret && focusKeyOf(target) === prevKey && typeof target.setSelectionRange === 'function') { try { target.setSelectionRange(caret[0], caret[1], caret[2] || 'none'); } catch (e) { /* non-text input */ } }
    } finally { rendering = false; }
  }
  function applyHash(initial) {
    const r = (location.hash || '').replace(/^#\/?/, '').split('?')[0];
    const route = ROUTES.includes(r) ? r : 'today';
    // On a user-driven route change focus moves to the view heading unless the navigating control asked for a specific field;
    // on initial load nothing is auto-focused so the skip link stays first in Tab order.
    if (route !== ui.route) { ui.route = route; if (!initial && !ui.focusNext) ui.focusNext = 'view-h'; }
    if (!ROUTES.includes(r) && location.hash !== '#/today') history.replaceState(null, '', '#/today');
    render();
  }
  window.addEventListener('hashchange', () => applyHash(false));
  window.addEventListener('resize', measureChrome);
  // Skip link: move focus to main without touching the route hash (a hash change would re-render and drop focus).
  document.getElementById('skip').addEventListener('click', (e) => { e.preventDefault(); const m = document.getElementById('main'); if (m) { m.focus(); m.scrollIntoView({ block: 'start' }); } });
  // Measured reachability: when keyboard focus lands under the fixed tab bar or status bar, scroll it into the clear band.
  document.addEventListener('focusin', (e) => {
    const el = e.target; if (!el || !el.getBoundingClientRect || el.closest('.tabbar') || el.closest('.status') || el.closest('dialog') || el.closest('.rail')) return;
    const status = document.getElementById('status'); const statusTop = ui.status && status ? status.getBoundingClientRect().top : window.innerHeight;
    const tb = shell.tabbar; const tabTop = tb && getComputedStyle(tb).display !== 'none' ? tb.getBoundingClientRect().top : window.innerHeight;
    const limit = Math.min(statusTop, tabTop); const r = el.getBoundingClientRect(); const pad = 8;
    if (r.bottom > limit - pad) window.scrollBy({ top: Math.min(r.bottom - limit + pad, Math.max(0, r.top - pad)), behavior: 'instant' });
  });
  svc.subscribe(() => render());
  // Read-only inspection hook for tests (never a dispatcher).
  window.__demo = Object.freeze({ query: svc.query, ui: () => JSON.parse(JSON.stringify({ role: ui.role, learnerId: ui.learnerId, locale: ui.locale, route: ui.route, selected: ui.selected, pending: [...ui.pendingKeys], newForm: ui.newForm, editing: ui.editing, recordTask: ui.recordTask, retryOffered: !!ui.lastFailed, resetGen: ui.resetGen, booting: ui.booting })), copyMissing: C.missingKeys });

  // ---------- bootstrap: honest sample records through the service, once; a reset is never re-seeded ----------
  async function seed() {
    const say = (cmd) => svc.dispatch(cmd); // direct service commands (no toasts); results are real service results, nothing is faked
    for (const l of D.LEARNERS) await say({ type: 'loadSample', learnerId: l.id, requestKey: 'seed:' + l.id });
    const byKey = (learnerId, key) => svc.query.listTasks(learnerId, { status: 'open' }).find((x) => x.sample === key);
    const math = byKey('lrn-35-bea', 'math-arrays'); const read = byKey('lrn-35-bea', 'reading-retell');
    if (math) {
      await say({ type: 'startTask', taskId: math.id });
      await say({ type: 'addStep', taskId: math.id, text: 'I drew 10 rows of 15 and got 150. I don’t know what to do with the other 5 rows.' });
      await say({ type: 'requestHelp', taskId: math.id, helpType: 'hint' });
      await say({ type: 'flagStuck', taskId: math.id });
    }
    if (read) await say({ type: 'addObservation', taskId: read.id, text: 'We read the kite story together on Tuesday. Bea retold the middle part on her own.' });
    const calRead = byKey('lrn-68-cal', 'reading-retell');
    if (calRead) await say({ type: 'proposeChange', learnerId: 'lrn-68-cal', input: { taskId: calRead.id, due: addDays(calRead.due, 2), reason: 'Soccer tournament Thursday — can I turn this in on Saturday?' } });
  }
  ui.booting = true; applyHash(true);
  seed().catch(() => null).then(() => { ui.booting = false; render(); });
})();
