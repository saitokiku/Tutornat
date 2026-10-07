/* plan-view.js — Kaizen Plan page: one week of real schoolwork (deadlines) with the accepted work plan laid over it,
 * plus the decisions that belong to a plan (suggested draft, student date proposals). Published as window.KaizenPlan.plan(ctx).
 * Contract (TEAM_BRIEF): no side effects on load, no private store/dispatcher — every command goes through ctx.run; records,
 * selection and drafts come from the shell context so Today/Schoolwork/Learn/Activity see the same data.
 * Deadlines (task.due) are never rewritten here: a plan item is a WORK day laid next to the due date, and only the domain's
 * explicit accept commands (draft / proposal) change anything. Nothing on this page reschedules by drag.
 * Page-local state: the week being looked at and the history disclosure, per learner. */
(function () {
  'use strict';
  // Generated strings only (family-authored titles and reasons are rendered verbatim through ctx).
  const S = {
    en: {
      intro: 'Due dates from Schoolwork, with the shared work plan laid next to them.',
      prev_week: 'Previous week', this_week: 'This week', next_week: 'Next week', today: 'Today',
      kind_due: 'Due', kind_work: 'Work', kind_draft: 'Suggested',
      legend_due: 'Due — the real deadline', legend_work: 'Work — a day set aside by the accepted plan', legend_draft: 'Suggested — from a draft that is not accepted',
      week_empty: 'Nothing due {from} – {to}.', week_empty_hint: 'Earlier and later tasks are listed below so nothing is lost.',
      earlier_h: 'Before {date}', later_h: 'After {date}', past_due: 'past due', n_tasks: '{n} tasks', one_task: '1 task',
      select_hint: 'Choose a task in the week to see its details and links.',
      selected_h: 'Selected task', work_day_line: 'Work day in the accepted plan: {date}', draft_day_line: 'Suggested work day in the draft: {date}',
      open_schoolwork: 'Open in Schoolwork', edit_hint: 'Due dates change only in Schoolwork (Edit) or by accepting a proposal below.',
      propose_this: 'Propose a new date for this task',
      shared_h: 'Your plan', shared_35: 'Your parent sets the dates. If a date is a problem, tell them — they can change it in Schoolwork.',
      shared_k2: 'Look at this week together. Your grown-up picks the days.',
      shared_68: 'You can ask for a different date below; your parent decides.',
      decide_h: 'Decisions', no_plan: 'No shared plan yet.', rule_line: 'A suggested plan sets one work day per task, the day before it is due. It comes from a fixed demo rule — not AI — and changes nothing until you accept it.',
      request: 'Request a suggested plan', draft_h: 'Suggested plan to review', draft_from: 'Suggested {time} by the demo rule (one work day per task, before its due date). Not AI. Due dates stay as they are until accepted.',
      draft_stale: 'This suggestion is out of date: a task it depends on changed. It cannot be accepted — decline it or request a new one.',
      draft_declined: 'You declined the last suggestion ({id}). A declined suggestion cannot be accepted; request a new one when you want.',
      current_h: 'Accepted plan', current_from: '{id} · accepted {time}', current_stale: 'Out of date: a task this plan depends on changed. The plan stays until you accept a new suggestion.',
      work_days: 'Work days', work_item: 'Work {day} · {title} · due {due}',
      props_h: 'Date changes proposed by {name}', props_student_h: 'Your date proposals', history_h: 'Past decisions', decided: 'decided {time}',
      h_plan_accepted: 'Accepted plan', h_plan_declined: 'Declined suggestion', h_plan_superseded: 'Replaced plan', h_prop_accepted: 'Accepted date change', h_prop_declined: 'Declined date change',
    },
    es: {
      intro: 'Fechas de entrega de Tareas, con el plan de trabajo compartido al lado.',
      prev_week: 'Semana anterior', this_week: 'Esta semana', next_week: 'Semana siguiente', today: 'Hoy',
      kind_due: 'Entrega', kind_work: 'Trabajo', kind_draft: 'Sugerido',
      legend_due: 'Entrega — la fecha límite real', legend_work: 'Trabajo — un día reservado por el plan aceptado', legend_draft: 'Sugerido — de un borrador no aceptado',
      week_empty: 'Nada por entregar {from} – {to}.', week_empty_hint: 'Las tareas anteriores y posteriores se listan abajo para que nada se pierda.',
      earlier_h: 'Antes del {date}', later_h: 'Después del {date}', past_due: 'atrasada', n_tasks: '{n} tareas', one_task: '1 tarea',
      select_hint: 'Elige una tarea de la semana para ver sus detalles y enlaces.',
      selected_h: 'Tarea seleccionada', work_day_line: 'Día de trabajo en el plan aceptado: {date}', draft_day_line: 'Día de trabajo sugerido en el borrador: {date}',
      open_schoolwork: 'Abrir en Tareas', edit_hint: 'Las fechas de entrega solo cambian en Tareas (Editar) o al aceptar una propuesta abajo.',
      propose_this: 'Proponer otra fecha para esta tarea',
      shared_h: 'Tu plan', shared_35: 'Tu madre/padre fija las fechas. Si una fecha es un problema, díselo: puede cambiarla en Tareas.',
      shared_k2: 'Miren esta semana juntos. Tu adulto elige los días.',
      shared_68: 'Puedes pedir otra fecha abajo; tu madre/padre decide.',
      decide_h: 'Decisiones', no_plan: 'Aún no hay un plan compartido.', rule_line: 'Un plan sugerido reserva un día de trabajo por tarea, el día anterior a su entrega. Sale de una regla fija de la demo —no es IA— y no cambia nada hasta que lo aceptes.',
      request: 'Pedir un plan sugerido', draft_h: 'Plan sugerido para revisar', draft_from: 'Sugerido {time} por la regla de la demo (un día de trabajo por tarea, antes de su entrega). No es IA. Las fechas de entrega no cambian hasta aceptarlo.',
      draft_stale: 'Esta sugerencia quedó desactualizada: una tarea de la que depende cambió. No se puede aceptar: recházala o pide una nueva.',
      draft_declined: 'Rechazaste la última sugerencia ({id}). Una sugerencia rechazada no se puede aceptar; pide una nueva cuando quieras.',
      current_h: 'Plan aceptado', current_from: '{id} · aceptado {time}', current_stale: 'Desactualizado: una tarea de la que depende este plan cambió. El plan se mantiene hasta que aceptes una nueva sugerencia.',
      work_days: 'Días de trabajo', work_item: 'Trabajo {day} · {title} · entrega {due}',
      props_h: 'Cambios de fecha propuestos por {name}', props_student_h: 'Tus propuestas de fecha', history_h: 'Decisiones anteriores', decided: 'decidido {time}',
      h_plan_accepted: 'Plan aceptado', h_plan_declined: 'Sugerencia rechazada', h_plan_superseded: 'Plan reemplazado', h_prop_accepted: 'Cambio de fecha aceptado', h_prop_declined: 'Cambio de fecha rechazado',
    },
  };
  const WD = { en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], es: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'] };
  const fill = (s, p) => String(s).replace(/\{(\w+)\}/g, (m, k) => (p && p[k] != null ? p[k] : m));
  const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const dow = (iso) => new Date(iso + 'T00:00:00Z').getUTCDay();
  const weekStartOf = (iso) => addDays(iso, -dow(iso)); // weeks start on Sunday, as on the Kaizen calendar
  const view = {}; // per learner: { weekStart: iso | null (follow today), histOpen: boolean }

  function plan(ctx) {
    const { h, svc, ui, t, tn, learner, isParent, draft, selectedId, select, titleOf, taskTitle, btn, link, tag, notice, panel, fmtDate, fmtTime, subjectMark, stateTag, render, run, C, D, field, input, textarea, selectEl, formSummary, errorsOf, errText, errFor, sameFields, emptyProp } = ctx;
    const tx = (k, p) => fill((S[ui.locale] && S[ui.locale][k]) || S.en[k] || k, p);
    const l = learner(); const lid = ui.learnerId; const d = draft();
    const st = (view[lid] = view[lid] || { weekStart: null, histOpen: false });
    const today = svc.query.today(); const thisWeek = weekStartOf(today);
    const ws = st.weekStart || thisWeek; const we = addDays(ws, 6);
    const open = svc.query.listTasks(lid, { status: 'open' });
    const plans = svc.query.plans(lid); const cur = plans.current; const dr = plans.draft; const drPending = !!(dr && dr.status === 'draft');
    const sel = selectedId();
    const isOpen = (id) => open.some((x) => x.id === id);
    const countLabel = (n) => (n === 1 ? tx('one_task') : tx('n_tasks', { n }));

    // ---- a task as a chip: selecting it is the only thing a chip does (no drag, no reschedule) ----
    const chip = (task, kind, extra) => {
      const b = btn(h('span', { class: 'kp-chip-body' }, h('span', { class: 'kp-kind' }, tx('kind_' + kind)), h('span', { class: 'kp-title' }, titleOf(task)), extra || null),
        'kp-' + kind, task.id, () => { select(task.id); render(); }, { cls: 'kp-item ' + kind + (sel === task.id ? ' selected' : '') });
      b.setAttribute('aria-pressed', sel === task.id ? 'true' : 'false');
      return b;
    };

    // ---- week grid: deadlines are DUE chips; the accepted plan's work days are WORK chips; a pending draft's are SUGGESTED ----
    const days = []; let weekHasItems = false;
    for (let i = 0; i < 7; i++) {
      const iso = addDays(ws, i); const items = [];
      open.filter((x) => x.due === iso).forEach((x) => items.push(chip(x, 'due')));
      if (cur) cur.items.filter((it) => it.day === iso && isOpen(it.taskId)).forEach((it) => items.push(chip(svc.query.task(it.taskId), 'work', h('span', { class: 'kp-sub' }, t('due', { date: fmtDate(it.due) })))));
      if (drPending) dr.items.filter((it) => it.day === iso && isOpen(it.taskId)).forEach((it) => items.push(chip(svc.query.task(it.taskId), 'draft', h('span', { class: 'kp-sub' }, t('due', { date: fmtDate(it.due) })))));
      if (items.length) weekHasItems = true;
      const isToday = iso === today;
      days.push(h('div', { class: 'kp-day' + (isToday ? ' today' : '') + (items.length ? '' : ' empty') + (iso < today ? ' past' : ''), 'aria-current': isToday ? 'date' : null, role: 'group', 'aria-label': fmtDate(iso) },
        h('div', { class: 'kp-dayhead' }, h('span', { class: 'kp-wd' }, (WD[ui.locale] || WD.en)[dow(iso)]), h('span', { class: 'kp-dn' }, String(Number(iso.slice(8, 10)))), isToday ? h('span', { class: 'kp-todaytag' }, tx('today')) : null),
        h('div', { class: 'kp-items' }, items)));
    }
    const weekNav = h('div', { class: 'kp-weeknav' },
      btn(tx('prev_week'), 'kp-prev', null, () => { st.weekStart = addDays(ws, -7); render(); }),
      h('span', { class: 'kp-range', 'aria-live': 'polite' }, fmtDate(ws) + ' – ' + fmtDate(we)),
      btn(tx('next_week'), 'kp-next', null, () => { st.weekStart = addDays(ws, 7); render(); }),
      ws !== thisWeek ? btn(tx('this_week'), 'kp-this', null, () => { st.weekStart = null; render(); }) : null);
    // Legend repeats the chip's own kind word (the thing that actually differs between chips), never a swatch that reads as a checkbox.
    const legend = weekHasItems ? h('p', { class: 'kp-legend muted' }, [['due', true], ['work', !!cur], ['draft', drPending]].filter((k) => k[1]).map((k) => h('span', { class: 'kp-legend-item' }, h('span', { class: 'kp-kind ' + k[0], 'aria-hidden': 'true' }, tx('kind_' + k[0])), tx('legend_' + k[0])))) : null;
    const weekBlock = weekHasItems ? h('div', { class: 'kp-week', role: 'list', 'data-week-start': ws }, days) : h('div', { class: 'kp-week kp-week-empty', 'data-week-start': ws }, h('p', null, tx('week_empty', { from: fmtDate(ws), to: fmtDate(we) })), h('p', { class: 'muted' }, tx('week_empty_hint')));

    // ---- what the week cannot show: tasks before the range (past due marked) and after it ----
    const byDue = (a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : 0);
    const earlier = open.filter((x) => x.due < ws).sort(byDue); const later = open.filter((x) => x.due > we).sort(byDue);
    const outside = (cls, title, list) => list.length ? h('section', { class: 'kp-outside ' + cls, 'aria-label': title },
      h('h3', null, title, ' ', h('span', { class: 'muted' }, countLabel(list.length))),
      h('ul', null, list.map((x) => h('li', null, h('span', { class: 'kp-mono' + (x.due < today ? ' overdue' : '') }, fmtDate(x.due)), x.due < today ? tag(tx('past_due'), 'warn') : null, chip(x, 'due'))))) : null;

    // ---- selected task: details and the real links; the due date is edited in Schoolwork, never here ----
    const task = sel && svc.query.task(sel);
    let selected;
    if (task) {
      const sess = svc.query.session(task.id); const curItem = cur ? cur.items.find((it) => it.taskId === task.id) : null; const drItem = drPending ? dr.items.find((it) => it.taskId === task.id) : null;
      selected = panel(tx('selected_h'), 'kp-selected', h('div', { class: 'stack' },
        h('div', { class: 'row' }, subjectMark(task.subject), h('div', null, h('h3', null, titleOf(task)), h('div', { class: 'muted' }, C.subject(ui.locale, task.subject), ' · ', t(task.due < today ? 'past_due' : 'due', { date: fmtDate(task.due) })))),
        h('div', { class: 'row' }, stateTag(sess.state), task.status === 'archived' ? tag(t('f_archived'), 'danger') : null),
        curItem ? h('p', { class: 'muted' }, tx('work_day_line', { date: fmtDate(curItem.day) })) : null,
        drItem ? h('p', { class: 'muted' }, tx('draft_day_line', { date: fmtDate(drItem.day) })) : null,
        h('div', { class: 'row' }, link(t('open_in_workspace'), 'workspace', task.id, 'primary'), link(tx('open_schoolwork'), 'schoolwork', task.id), link(t('open_in_record'), 'record', task.id)),
        isParent() ? h('p', { class: 'muted' }, tx('edit_hint')) : null,
        !isParent() && l.band === '68' && task.status === 'open' ? btn(tx('propose_this'), 'kp-propose', task.id, () => { d.prop.taskId = task.id; ui.focusNext = 'prop-due'; render(); }) : null));
    } else selected = h('p', { class: 'muted kp-select-hint' }, tx('select_hint'));

    // ---- student view of the shared plan: honest about who decides, by age band ----
    const studentNote = isParent() ? null : panel(tx('shared_h'), 'quiet kp-shared', h('p', { class: l.band === 'k2' ? 'lead' : '' }, tx(l.band === 'k2' ? 'shared_k2' : l.band === '35' ? 'shared_35' : 'shared_68')), l.band === 'k2' ? notice(t('k2_adult_note'), '') : null);

    // ---- decisions: contextual. A pending suggestion gets a panel; otherwise one line and one button. Decisions carry the exact
    // reviewed plan id (the domain rejects a replaced draft with 'replaced'); a stale draft has no Accept button at all. ----
    const conflictLines = (p) => svc.query.planConflicts(p).map((c) => h('li', null, c.reason === 'archived' ? t('conflict_archived', { title: taskTitle(c.taskId, c.title) }) : t('conflict_due', { title: taskTitle(c.taskId, c.title), from: fmtDate(c.from), to: fmtDate(c.to) })));
    const itemLines = (p) => h('ul', { class: 'kp-worklist' }, p.items.filter((it) => isOpen(it.taskId)).map((it) => h('li', null, h('span', { class: 'kp-mono' }, fmtDate(it.day)), h('span', null, taskTitle(it.taskId, it.title), ' ', h('span', { class: 'muted' }, '· ' + t('due', { date: fmtDate(it.due) }))))));
    // Label: "new draft" whenever a draft or an accepted plan already exists (the request replaces/supersedes); first-time otherwise.
    const requestBtn = (primary) => btn(dr || cur ? t('draft_redraft') : tx('request'), 'draft-request', null, () => run({ type: 'draftPlan', learnerId: lid, requestKey: 'draft:' + lid }, { success: t('plan_drafted'), focusNext: 'draft-accept' }), { cls: primary ? 'primary' : '', requestKey: 'draft:' + lid });
    const decisions = [];
    if (isParent()) {
      if (drPending) {
        const drConf = conflictLines(dr);
        decisions.push(panel(tx('draft_h'), 'kp-draft', h('div', { class: 'stack' },
          h('p', { class: 'muted' }, h('code', null, dr.id), ' · ', tx('draft_from', { time: fmtTime(dr.createdAt) })),
          drConf.length ? [notice(tx('draft_stale'), 'warn', { role: 'status' }), h('ul', { class: 'kp-conflicts' }, drConf)] : null,
          itemLines(dr),
          h('div', { class: 'row' },
            !drConf.length ? btn(t('draft_accept'), 'draft-accept', null, () => run({ type: 'acceptDraft', learnerId: lid, planId: dr.id, requestKey: 'accept:' + lid }, { success: t('plan_accepted'), focusNext: 'view-h' }), { cls: 'primary', requestKey: 'accept:' + lid }) : null,
            btn(t('draft_decline'), 'draft-decline', null, () => run({ type: 'declineDraft', learnerId: lid, planId: dr.id, requestKey: 'decline:' + lid }, { success: t('plan_declined'), focusNext: 'draft-request' }), { requestKey: 'decline:' + lid }),
            requestBtn(!!drConf.length)))));
      } else {
        decisions.push(h('div', { class: 'kp-decide-row' },
          dr && dr.status === 'declined' ? notice(tx('draft_declined', { id: dr.id }), '') : !cur ? h('p', null, tx('no_plan')) : null,
          h('div', { class: 'row' }, requestBtn(!cur)), h('p', { class: 'muted' }, tx('rule_line'))));
      }
    }
    if (cur) {
      const curConf = conflictLines(cur);
      decisions.push(h('section', { class: 'panel quiet kp-current', 'aria-label': tx('current_h') }, h('h2', null, tx('current_h')),
        h('p', { class: 'muted' }, h('code', null, cur.id), ' · ', t('current_prov', { time: fmtTime(cur.decidedAt) })),
        curConf.length ? [notice(tx('current_stale'), 'warn'), h('ul', { class: 'kp-conflicts' }, curConf)] : null,
        h('details', { class: 'kp-workdays' }, h('summary', null, tx('work_days'), ' (', String(cur.items.filter((it) => isOpen(it.taskId)).length), ')'), itemLines(cur))));
    }

    // ---- student date proposals (grades 6–8 author them; parents decide the exact proposal; everyone sees the same records) ----
    const props = svc.query.proposals(lid);
    const canPropose = !isParent() && l.band === '68';
    let propsBlock = null;
    if (props.length || canPropose) {
      const ordered = props.slice().sort((a, b) => (a.status === 'pending') === (b.status === 'pending') ? (a.id < b.id ? 1 : -1) : a.status === 'pending' ? -1 : 1);
      const items = ordered.map((p) => { const ps = svc.query.proposalState(p.id) || { status: p.status }; const stale = ps.status === 'stale'; const unavailable = ps.status === 'unavailable';
        const statusTag = stale ? tag(t('prop_status_stale'), 'danger') : unavailable ? tag(t('prop_status_unavailable'), 'danger') : tag(t('prop_status_' + p.status), p.status === 'accepted' ? 'ok' : p.status === 'declined' ? 'danger' : 'warn');
        return h('li', { class: 'kp-prop' + (p.status === 'pending' ? ' pending' : '') },
          h('div', { class: 'kp-prop-line' }, h('strong', null, taskTitle(p.taskId, p.taskId)), h('span', { class: 'kp-mono' }, fmtDate(p.fromDue) + ' → ' + fmtDate(p.toDue)), statusTag),
          h('p', { class: 'kp-reason' }, h('span', { class: 'muted' }, t('prop_reason') + ': '), h('span', { style: 'white-space:pre-wrap' }, p.reason)),
          stale ? notice(t('prop_stale_note', { from: fmtDate(p.fromDue), due: fmtDate(ps.currentDue) }), 'warn') : null, unavailable ? notice(t('prop_unavailable_note'), '') : null,
          isParent() && p.status === 'pending' ? h('div', { class: 'row' },
            !stale && !unavailable ? btn(t('prop_accept'), 'prop-accept', p.id, () => run({ type: 'decideProposal', proposalId: p.id, decision: 'accept', requestKey: 'prop:' + p.id }, { success: t('prop_decided', { status: t('prop_status_accepted') }), focusNext: 'view-h', errorMap: { stale: t('e_prop_stale'), conflict: t('e_prop_archived') } }), { cls: 'primary', requestKey: 'prop:' + p.id }) : null,
            btn(t('prop_decline'), 'prop-decline', p.id, () => run({ type: 'decideProposal', proposalId: p.id, decision: 'decline', requestKey: 'prop:' + p.id }, { success: t('prop_decided', { status: t('prop_status_declined') }), focusNext: 'view-h' }), { requestKey: 'prop:' + p.id })) : null); });
      const pe = errorsOf().prop || null;
      const form = canPropose ? h('form', { class: 'kp-prop-form', novalidate: '', onsubmit: (e) => { e.preventDefault(); const sent = { ...d.prop }; run({ type: 'proposeChange', learnerId: lid, input: { taskId: sent.taskId, due: sent.due, reason: sent.reason }, requestKey: 'propose:' + lid }, { form: 'prop', success: t('prop_sent'), onOk: () => { if (sameFields(d.prop, sent)) d.prop = emptyProp(); }, focusNext: 'view-h' }); } },
        h('h3', null, t('prop_form_h')), formSummary('prop', pe, { taskId: t('prop_task'), due: t('prop_due'), reason: t('prop_reason_label') }),
        field('prop-taskId', t('prop_task'), selectEl('prop-taskId', d.prop.taskId, [['', '—']].concat(open.map((x) => [x.id, titleOf(x) + ' · ' + fmtDate(x.due)])), (v) => { d.prop.taskId = v; }), { error: pe && pe.taskId ? errText(pe.taskId) : null }),
        field('prop-due', t('prop_due'), input('prop-due', d.prop.due, (v) => { d.prop.due = v; }, { placeholder: 'YYYY-MM-DD', inputmode: 'numeric', maxlength: 10, autocomplete: 'off' }), { hint: 'YYYY-MM-DD', error: pe && pe.due ? errText(pe.due) : null }),
        field('prop-reason', t('prop_reason_label'), textarea('prop-reason', d.prop.reason, (v) => { d.prop.reason = v; }, { maxlength: D.LIMITS.reason, rows: 2 }), { hint: t('f_limit', { n: D.LIMITS.reason }), error: pe && pe.reason ? errFor(pe.reason, D.LIMITS.reason) : null }),
        h('div', { class: 'row' }, h('button', { type: 'submit', class: 'btn primary', 'data-act': 'prop-send', 'data-fk': 'prop-send' }, t('prop_send'))), h('p', { class: 'muted' }, t('prop_visibility'))) : null;
      propsBlock = panel(isParent() ? tx('props_h', { name: l.name }) : tx('props_student_h'), 'kp-props', items.length ? h('ul', { class: 'kp-props-list' }, items) : h('p', { class: 'muted' }, t('props_empty')), form);
    }

    // ---- past decisions: a disclosure, so history never competes with this week. One row per plan id (the domain keeps the
    // accepted entry and later the superseded one for the same plan; the later status wins) plus every decided proposal. ----
    const byPlan = new Map();
    plans.history.forEach((p) => byPlan.set(p.id, p));
    if (cur && !byPlan.has(cur.id)) byPlan.set(cur.id, cur);
    const histRows = [...byPlan.values()].map((p) => ({ at: p.supersededAt || p.decidedAt || p.createdAt, label: tx('h_plan_' + p.status), id: p.id, cls: p.status === 'accepted' ? 'ok' : p.status === 'declined' ? 'danger' : '', extra: tn('items', p.items.length) }));
    props.filter((p) => p.status !== 'pending').forEach((p) => histRows.push({ at: p.decidedAt, label: tx('h_prop_' + p.status), id: p.id, cls: p.status === 'accepted' ? 'ok' : 'danger', extra: taskTitle(p.taskId, p.taskId) + ' · ' + fmtDate(p.fromDue) + ' → ' + fmtDate(p.toDue) }));
    histRows.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
    const history = h('details', { class: 'kp-history', open: st.histOpen ? '' : null, ontoggle: (e) => { st.histOpen = e.target.open; } },
      h('summary', null, tx('history_h'), ' (', String(histRows.length), ')'),
      histRows.length ? h('ul', null, histRows.map((r) => h('li', null, tag(r.label, r.cls), ' ', h('code', null, r.id), h('span', { class: 'muted' }, ' · ', r.extra, ' · ', tx('decided', { time: fmtTime(r.at) }))))) : h('p', { class: 'muted' }, t('history_empty')));

    const head = h('div', { class: 'view-head' }, h('h1', { id: 'view-h', tabindex: '-1' }, t('plan_h')), h('span', { class: 'meta' }, l.name));
    const side = h('div', { class: 'kp-side stack' }, decisions, studentNote, selected, propsBlock, history);
    return h('section', { class: 'kaizen-plan' }, head, h('p', { class: 'muted kp-intro' }, tx('intro')),
      h('div', { class: 'kp-body' },
        h('div', { class: 'kp-main' }, weekNav, weekBlock, legend, outside('kp-earlier', tx('earlier_h', { date: fmtDate(ws) }), earlier), outside('kp-later', tx('later_h', { date: fmtDate(we) }), later)),
        side));
  }

  window.KaizenPlan = Object.freeze({ plan });
})();
