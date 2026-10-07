/* learning-views.js — Learn (route `workspace`) and Activity (route `record`) page modules for the Kaizen interior.
 * Published as window.KaizenLearning = { workspace(ctx), record(ctx) }; each returns one DOM Node built with the shell's own
 * helpers (ctx.h / btn / link / field / run …). No DOM work at load, no private store: every command goes through ctx.run and
 * every read through ctx.svc.query. Drafts stay in ctx.draft()/workDraft()/obsDraft() (per learner, per task), so role,
 * locale, route and learner switches never lose or leak typed text. Family-authored text is inserted verbatim (textContent).
 * Surface: Operate / focused work. One selected task, one place to write, help and history in the side column.
 */
(function () {
  'use strict';
  const DICT = {
    en: {
      learn: 'Learn', activity: 'Activity', for_name: 'for {name}',
      pick_h: 'Pick something to work on', pick_p: 'Open tasks for {name}', pick_none: 'Nothing to work on yet.',
      pick_parent: 'Add a task in Schoolwork', pick_student: 'A grown-up can add a task in Schoolwork.', open_schoolwork: 'Open Schoolwork', open: 'Open',
      reading_view: 'You are reading {name}’s work. To respond, write a note — it stays tied to this task.',
      start_p: 'Once you start, every step you save and any help you ask for is kept here for your grown-up to see.',
      start: 'Start working', write_h: 'Your work', write_label: 'What did you do or think?', write_label_k2: 'What did you do?', save_step: 'Save step',
      write_hint: 'Saved exactly as typed · up to {n} characters',
      steps_h: 'What {name} wrote', steps_empty: 'Nothing saved yet. Your first step goes here.', steps_empty_parent: '{name} hasn’t saved a step yet.',
      count_h: 'Count it', count_p: 'Tap one tile for each one you count, then save the count as a step.', count_save: 'Save count',
      check_h: 'Check a whole-number answer', check_h_k2: 'Check your number', check_label: 'Your answer — digits only', check_label_k2: 'Your number', check: 'Check',
      check_match: 'Matches the sample answer. One match is not mastery — keep showing your steps.',
      check_no_match: 'Doesn’t match the sample answer. Try another step or ask for a hint.',
      check_nan: '“{raw}” isn’t a whole number, so it wasn’t checked. Type just the digits.',
      check_src: 'Compared with the sample answer key, not graded by a person.',
      stuck: 'I’m stuck', stuck_k2: 'I need help', done: 'Mark done', done_k2: 'I did it',
      done_note: 'Done means you say so. A grown-up still looks it over — it isn’t a grade.',
      done_state: 'Marked done — that means you say so. A grown-up still looks it over.', done_state_k2: 'You did it! That means you say so. A grown-up will look.',
      stuck_state: 'Help flag saved for a grown-up. You can keep writing steps.',
      help_h: 'Help', help_sample_p: 'Replies are scripted sample text — no microphone, no audio, no AI.',
      help_custom_p: 'No scripted help exists for this task. Asking saves a flag for a grown-up; nothing is made up.',
      ask_adult: 'Ask a grown-up', asked: '{name} asked for a {type}', asked_unavail: '{name} asked for help · waiting for a grown-up',
      scripted: 'Scripted sample reply', help_none: 'No help asked for yet.', prior_version: 'from sample version {v}, before the edit',
      about_h: 'About this task', about_custom: 'Custom task: writing and history work; scripted help and answer checking are unavailable, so nothing is invented.',
      archived_p: 'This task is archived. Everything here stays readable; nothing new can be added until a parent restores it.',
      archived_student: 'This task is archived. You can still read what you did.',
      note_cta: 'Write a note about this', open_activity: 'Open activity', shared: 'Shared record',
      // Activity
      show: 'Show', all_tasks: 'All tasks for {name}', archived_mark: 'archived',
      who_task: 'Task', who_plan: 'Plan', who_proposal: 'Proposal', who_wrote: '{name} wrote', who_note: 'Parent note', who_check: 'Scripted check',
      ev_check: 'answer “{raw}” — {verdict}', v_match: 'matches the sample answer', v_no_match: 'doesn’t match the sample answer', v_not_a_number: 'not a whole number, not checked',
      empty_h: 'Nothing recorded for {name} yet.', empty_p: 'Steps, help requests and your notes will show up here as they happen.',
      empty_task: 'Nothing recorded for this task yet.',
      note_h: 'Note for {name}', note_about: 'About: {title}', note_label: 'What did you notice?', note_hint: '{name} can read this in Activity · stored exactly as typed · up to {n} characters',
      note_save: 'Save note', note_pick: 'Pick one task above to write a note about it.', note_archived: 'This task is archived — notes are still allowed; work can’t be added until it is restored.',
      visible_h: 'What your parent can see',
      how_h: 'How this record works', how_memory: 'Demo memory only: a reload clears it. Nothing is sent to school.',
    },
    es: {
      learn: 'Aprender', activity: 'Actividad', for_name: 'de {name}',
      pick_h: 'Elige algo para trabajar', pick_p: 'Tareas abiertas de {name}', pick_none: 'Todavía no hay nada que hacer.',
      pick_parent: 'Agrega una tarea en Tareas', pick_student: 'Un adulto puede agregar una tarea en Tareas.', open_schoolwork: 'Abrir Tareas', open: 'Abrir',
      reading_view: 'Estás leyendo el trabajo de {name}. Para responder, escribe una nota; queda ligada a esta tarea.',
      start_p: 'Cuando empieces, cada paso que guardes y la ayuda que pidas se guardan aquí para que tu adulto los vea.',
      start: 'Empezar', write_h: 'Tu trabajo', write_label: '¿Qué hiciste o pensaste?', write_label_k2: '¿Qué hiciste?', save_step: 'Guardar paso',
      write_hint: 'Se guarda tal como lo escribes · hasta {n} caracteres',
      steps_h: 'Lo que escribió {name}', steps_empty: 'Aún no hay nada guardado. Tu primer paso va aquí.', steps_empty_parent: '{name} todavía no ha guardado ningún paso.',
      count_h: 'Cuéntalo', count_p: 'Toca una ficha por cada uno que cuentes y luego guarda el conteo como paso.', count_save: 'Guardar conteo',
      check_h: 'Comprobar una respuesta (número entero)', check_h_k2: 'Comprueba tu número', check_label: 'Tu respuesta — solo dígitos', check_label_k2: 'Tu número', check: 'Comprobar',
      check_match: 'Coincide con la respuesta de muestra. Una coincidencia no es dominio: sigue mostrando tus pasos.',
      check_no_match: 'No coincide con la respuesta de muestra. Prueba otro paso o pide una pista.',
      check_nan: '“{raw}” no es un número entero, así que no se comprobó. Escribe solo los dígitos.',
      check_src: 'Comparado con la clave de la muestra, no calificado por una persona.',
      stuck: 'Estoy atascado', stuck_k2: 'Necesito ayuda', done: 'Marcar como hecho', done_k2: '¡Lo hice!',
      done_note: 'Hecho significa que tú lo dices. Un adulto lo revisa: no es una calificación.',
      done_state: 'Marcado como hecho: eso significa que tú lo dices. Un adulto lo revisa.', done_state_k2: '¡Lo hiciste! Eso significa que tú lo dices. Un adulto lo verá.',
      stuck_state: 'Aviso de ayuda guardado para un adulto. Puedes seguir escribiendo pasos.',
      help_h: 'Ayuda', help_sample_p: 'Las respuestas son texto de muestra guionado: sin micrófono, sin audio, sin IA.',
      help_custom_p: 'No existe ayuda guionada para esta tarea. Pedirla guarda un aviso para un adulto; no se inventa nada.',
      ask_adult: 'Pedir ayuda a un adulto', asked: '{name} pidió {type}', asked_unavail: '{name} pidió ayuda · esperando a un adulto',
      scripted: 'Respuesta de muestra guionada', help_none: 'Todavía no se ha pedido ayuda.', prior_version: 'de la versión {v} de la muestra, antes de la edición',
      about_h: 'Sobre esta tarea', about_custom: 'Tarea personalizada: escribir e historial funcionan; la ayuda guionada y la comprobación no están disponibles, así que no se inventa nada.',
      archived_p: 'Esta tarea está archivada. Todo sigue legible; no se puede agregar nada hasta que un padre la restaure.',
      archived_student: 'Esta tarea está archivada. Aún puedes leer lo que hiciste.',
      note_cta: 'Escribir una nota sobre esto', open_activity: 'Abrir actividad', shared: 'Registro compartido',
      show: 'Mostrar', all_tasks: 'Todas las tareas de {name}', archived_mark: 'archivada',
      who_task: 'Tarea', who_plan: 'Plan', who_proposal: 'Propuesta', who_wrote: '{name} escribió', who_note: 'Nota del padre', who_check: 'Comprobación guionada',
      ev_check: 'respuesta “{raw}” — {verdict}', v_match: 'coincide con la respuesta de muestra', v_no_match: 'no coincide con la respuesta de muestra', v_not_a_number: 'no es un número entero, no se comprobó',
      empty_h: 'Todavía no hay nada registrado de {name}.', empty_p: 'Los pasos, las peticiones de ayuda y tus notas aparecerán aquí.',
      empty_task: 'Todavía no hay nada registrado de esta tarea.',
      note_h: 'Nota para {name}', note_about: 'Sobre: {title}', note_label: '¿Qué notaste?', note_hint: '{name} puede leerla en Actividad · se guarda tal como la escribes · hasta {n} caracteres',
      note_save: 'Guardar nota', note_pick: 'Elige una tarea arriba para escribir una nota.', note_archived: 'Esta tarea está archivada: las notas siguen permitidas; no se puede agregar trabajo hasta restaurarla.',
      visible_h: 'Lo que tu padre o madre puede ver',
      how_h: 'Cómo funciona este registro', how_memory: 'Solo memoria de demostración: recargar la borra. Nada se envía a la escuela.',
    },
  };
  const txFor = (ctx) => (key, params) => { let s = (DICT[ctx.ui.locale] || DICT.en)[key]; if (s === undefined) s = DICT.en[key] !== undefined ? DICT.en[key] : key; if (params) Object.keys(params).forEach((k) => { s = s.split('{' + k + '}').join(String(params[k])); }); return s; };
  const metaLine = (ctx, task, sess) => { const { h, C, ui, t, fmtDate, svc, stateTag } = ctx; const late = task.due < svc.query.today() && task.status === 'open';
    return h('p', { class: 'kz-meta' }, C.subject(ui.locale, task.subject), ' · ', h('span', { class: late ? 'kz-late' : null }, late ? t('overdue', { date: fmtDate(task.due) }) : t('due', { date: fmtDate(task.due) })), ' · ', task.status === 'archived' ? ctx.tag(t('f_archived'), 'danger') : stateTag(sess.state)); };
  const head = (ctx, eyebrow, title, meta) => ctx.h('header', { class: 'kz-head' }, ctx.h('p', { class: 'kz-eyebrow' }, eyebrow), ctx.h('h1', { id: 'view-h', tabindex: '-1' }, title), meta || null);

  // ---------- Learn ----------
  function workspace(ctx) {
    const { D, C, svc, ui, t, tn, learner, isParent, draft, workDraft, errorsOf, selectedId, select, sampleOf, titleOf, instructionsOf, assistText, h, fk, btn, link, tag, notice, fmtDate, fmtTime, subjectMark, originTag, errFor, countsLine, field, input, textarea, run, render } = ctx;
    const tx = txFor(ctx); const l = learner(); const d = draft(); const sel = selectedId(); const task = sel && svc.query.task(sel);
    const root = (cls, ...kids) => h('section', { class: 'kaizen-workspace ' + (cls || ''), 'data-band': l.band, 'data-role': ui.role }, ...kids);
    if (!task) {
      const open = svc.query.listTasks(ui.learnerId, { status: 'open' });
      return root('kz-empty', head(ctx, tx('learn') + ' · ' + l.name, tx('pick_h')),
        open.length ? [h('p', { class: 'kz-meta' }, tx('pick_p', { name: l.name })), h('ul', { class: 'kz-pick' }, open.map((x) => { const s = svc.query.session(x.id); return h('li', null, h('div', { class: 'kz-pick-main' }, subjectMark(x.subject), h('div', null, h('div', { class: 'kz-pick-title' }, titleOf(x)), h('div', { class: 'kz-meta' }, C.subject(ui.locale, x.subject), ' · ', t('due', { date: fmtDate(x.due) }), ' · ', ctx.stateTag(s.state)))), btn(tx('open'), 'ws-pick', x.id, () => { select(x.id); ui.focusNext = 'view-h'; render(); }, { cls: 'primary' })); }))]
          : h('div', { class: 'kz-none' }, h('p', { class: 'kz-lead' }, tx('pick_none')), h('p', { class: 'muted' }, isParent() ? tx('pick_parent') : tx('pick_student')), link(tx('open_schoolwork'), 'schoolwork', null, isParent() ? 'primary' : '')));
    }
    const sess = svc.query.session(task.id); const sample = sampleOf(task); const started = sess.state !== 'not_started'; const done = sess.state === 'complete_self_reported'; const archived = task.status === 'archived';
    const k2 = l.band === 'k2'; const w = workDraft(d, task.id); const owner = task.learnerId; const rk = (type) => type + ':' + task.id; const big = k2 ? ' big' : '';
    const instructions = instructionsOf(task);
    const header = h('div', { class: 'kz-task' }, head(ctx, tx('learn') + ' · ' + l.name, titleOf(task), metaLine(ctx, task, sess)), instructions ? h('p', { class: 'kz-instructions' }, instructions) : null);
    const story = sample && sample.story ? h('section', { class: 'kz-story', 'aria-label': t('ws_story_h') }, h('h2', null, t('ws_story_h')), k2 ? h('p', { class: 'kz-lead' }, t('ws_story_k2')) : null, sample.story.map((p) => h('p', null, p))) : null;
    const stepItems = sess.steps.map((s) => h('li', null, h('span', { class: 'kz-when' }, fmtTime(s.at)), h('span', { class: 'kz-verbatim' }, s.text)));
    const stepsBlock = h('section', { class: 'kz-steps', 'aria-label': tx('steps_h', { name: l.name }) }, h('h2', null, tx('steps_h', { name: l.name })),
      stepItems.length ? h('ol', { class: 'kz-step-list' }, stepItems) : h('p', { class: 'muted' }, isParent() ? tx('steps_empty_parent', { name: l.name }) : tx('steps_empty')));
    // Help column: who asked (requested) and the scripted reply are separate entries; a custom task gets one honest ask-a-grown-up action.
    const assistItems = sess.assistance.map((a) => a.kind === 'requested'
      ? h('li', { class: 'assist-requested' + (a.available ? '' : ' unavail') }, h('span', { class: 'kz-when' }, fmtTime(a.at)), h('span', null, a.available ? tx('asked', { name: l.name, type: C.helpType(ui.locale, a.type) }) : tx('asked_unavail', { name: l.name })))
      : h('li', { class: 'assist-scripted' }, h('span', { class: 'kz-when' }, fmtTime(a.at), ' · ', tx('scripted')), h('p', null, assistText(a), a.sampleKey && a.sampleKey !== task.sample ? [' ', h('span', { class: 'muted' }, '(' + tx('prior_version', { v: a.sampleVersion || 1 }) + ')')] : null)));
    const helpBtn = (type, label, cls) => btn(label, 'help', type, () => run({ type: 'requestHelp', taskId: task.id, helpType: type, requestKey: rk('help-' + type) }, { focusNext: fk('help', type) }), { requestKey: rk('help-' + type), cls: cls || '' });
    const canAsk = started && !archived && !isParent();
    const helpBlock = h('section', { class: 'kz-help', 'aria-label': tx('help_h') }, h('h2', null, tx('help_h')),
      canAsk ? (sample ? h('div', { class: 'kz-help-row' }, helpBtn('hint', t('support_hint'), big.trim()), helpBtn('scaffold', t('support_scaffold'), big.trim()), helpBtn('voice_demo', t('support_voice'), big.trim())) : h('div', { class: 'kz-help-row' }, helpBtn('hint', tx('ask_adult'), 'primary' + big))) : null,
      h('p', { class: 'kz-fine' }, sample ? tx('help_sample_p') : tx('help_custom_p')),
      assistItems.length ? h('ul', { class: 'kz-assist' }, assistItems) : h('p', { class: 'muted' }, tx('help_none')));
    const about = h('details', { class: 'kz-about' }, h('summary', null, tx('about_h')), h('div', { class: 'kz-about-body' }, h('p', null, originTag(task)), sample ? null : h('p', { class: 'muted' }, tx('about_custom')),
      h('p', { class: 'muted' }, h('code', null, task.id), ' · ', t('version', { v: task.version }), ' · ', t('updated', { time: fmtTime(task.updatedAt) }))));
    const focus = [];
    if (archived) {
      focus.push(notice(isParent() ? tx('archived_p') : tx('archived_student'), 'warn', { role: 'status' }), h('div', { class: 'kz-actions' }, isParent() ? btn(t('restore'), 'task-restore', task.id, () => run({ type: 'restoreTask', taskId: task.id, requestKey: 'restore:' + task.id }, { success: t('restored'), focusNext: 'view-h' }), { cls: 'primary' }) : null, link(tx('open_activity'), 'record', task.id)));
    } else if (isParent()) {
      focus.push(h('p', { class: 'kz-lead' }, tx('reading_view', { name: l.name })), h('p', { class: 'kz-meta' }, tx('shared'), ': ', countsLine(sess)),
        h('div', { class: 'kz-actions' }, link(tx('note_cta'), 'record', task.id, 'primary'), link(tx('open_activity'), 'record', task.id)));
    } else if (!started) {
      focus.push(h('div', { class: 'kz-start' }, h('p', { class: 'kz-lead' }, k2 ? t('ws_k2_prompt') : tx('start_p')), btn(k2 ? t('ws_k2_start') : tx('start'), 'ws-start', null, () => run({ type: 'startTask', taskId: task.id, requestKey: rk('start') }, { focusNext: 'ws-step' }), { cls: 'primary big', requestKey: rk('start') })));
    } else {
      const err = errorsOf(owner).ws && errorsOf(owner).ws.text ? errFor(errorsOf(owner).ws.text, D.LIMITS.step) : null;
      focus.push(sess.state === 'stuck' ? notice(tx('stuck_state'), 'warn', { role: 'status' }) : done ? notice(k2 ? tx('done_state_k2') : tx('done_state'), 'ok', { role: 'status' }) : null);
      // Counting tiles belong to K–2 math only (small sets a child can count); on other tasks they would be clutter.
      const countBlock = k2 && task.subject === 'math' && !done ? h('div', { class: 'kz-count' }, h('h3', null, tx('count_h')), h('p', { class: 'kz-fine' }, tx('count_p')),
        h('div', { class: 'kz-tiles', role: 'group', 'aria-label': tx('count_h') }, w.tally.map((on, i) => h('button', { type: 'button', class: 'kz-tile', 'aria-pressed': on ? 'true' : 'false', 'aria-label': t('tile', { n: i + 1 }), 'data-act': 'tile', 'data-arg': i, 'data-fk': fk('tile', i), onclick: (e) => { w.tally[i] = !w.tally[i]; e.currentTarget.setAttribute('aria-pressed', w.tally[i] ? 'true' : 'false'); e.currentTarget.textContent = w.tally[i] ? '●' : '○'; } }, on ? '●' : '○'))),
        btn(tx('count_save'), 'tally-save', null, () => { const marks = w.tally.slice(); run({ type: 'addStep', taskId: task.id, text: tn('ws_tally_text', marks.filter(Boolean).length), requestKey: rk('step') }, { onOk: () => { if (marks.every((m, i) => m === w.tally[i])) w.tally = Array(10).fill(false); }, focusNext: 'tally-save' }); }, { cls: big.trim() })) : null;
      focus.push(countBlock,
        h('form', { class: 'kz-write', onsubmit: (e) => { e.preventDefault(); const text = w.step; run({ type: 'addStep', taskId: task.id, text, requestKey: rk('step') }, { form: 'ws', onOk: () => { if (w.step === text) w.step = ''; }, focusNext: 'ws-step' }); } },
          field('ws-step', k2 ? tx('write_label_k2') : tx('write_label'), textarea('ws-step', w.step, (v) => { w.step = v; }, { maxlength: D.LIMITS.step, 'aria-describedby': 'ws-step-hint', rows: k2 ? 2 : 4 }), { hint: tx('write_hint', { n: D.LIMITS.step }), error: err }),
          h('div', { class: 'kz-actions' }, h('button', { type: 'submit', class: 'btn primary' + big, 'data-act': 'ws-step-add', 'data-fk': 'ws-step-add' }, tx('save_step')))));
      if (sample && sample.answerKind === 'whole_number' && !done) {
        const last = sess.checks.length ? sess.checks[sess.checks.length - 1] : null;
        focus.push(h('form', { class: 'kz-check', onsubmit: (e) => { e.preventDefault(); run({ type: 'checkAnswer', taskId: task.id, answer: w.answer, requestKey: rk('check') }, { focusNext: 'ws-answer', onOk: (data) => { w.lastCheck = data.check; } }); } }, h('h3', null, k2 ? tx('check_h_k2') : tx('check_h')),
          h('div', { class: 'kz-check-row' }, field('ws-answer', k2 ? tx('check_label_k2') : tx('check_label'), input('ws-answer', w.answer, (v) => { w.answer = v; }, { inputmode: 'numeric', maxlength: D.LIMITS.answer, autocomplete: 'off' })), h('button', { type: 'submit', class: 'btn' + big, 'data-act': 'ws-check', 'data-fk': 'ws-check' }, tx('check'))),
          last ? notice(last.verdict === 'match' ? tx('check_match') : last.verdict === 'no_match' ? tx('check_no_match') : tx('check_nan', { raw: last.raw }), last.verdict === 'match' ? 'ok' : 'warn', { role: 'status' }) : null,
          h('p', { class: 'kz-fine' }, tx('check_src'))));
      }
      focus.push(h('div', { class: 'kz-state' }, h('div', { class: 'kz-actions' },
        !done && sess.state !== 'stuck' ? btn(k2 ? tx('stuck_k2') : tx('stuck'), 'ws-stuck', null, () => run({ type: 'flagStuck', taskId: task.id, requestKey: rk('stuck') }, { success: t('stuck_saved'), focusNext: 'ws-step' }), { cls: big.trim(), requestKey: rk('stuck') }) : null,
        !done ? btn(k2 ? tx('done_k2') : tx('done'), 'ws-complete', null, () => run({ type: 'markComplete', taskId: task.id, requestKey: rk('complete') }, { focusNext: 'view-h' }), { cls: big.trim(), requestKey: rk('complete') }) : null),
        done ? null : h('p', { class: 'kz-fine' }, tx('done_note'))));
    }
    const focusBlock = h('section', { class: 'kz-focus', 'aria-label': tx('write_h') }, focus);
    return root('', header, h('div', { class: 'kz-grid' }, h('div', { class: 'kz-main' }, story, focusBlock, stepsBlock), h('aside', { class: 'kz-side' }, helpBlock, about)));
  }

  // ---------- Activity ----------
  function record(ctx) {
    const { D, C, svc, ui, t, learner, isParent, draft, obsDraft, errorsOf, selectedId, select, titleOf, assistText, h, link, notice, fmtDate, fmtTime, errFor, countsLine, field, textarea, selectEl, formSummary, run, render } = ctx;
    const tx = txFor(ctx); const l = learner(); const d = draft(); const tasks = svc.query.listTasks(ui.learnerId, { status: 'all' });
    let rf = ui.recordTask[ui.learnerId]; if (rf && rf !== 'all' && !svc.query.task(rf)) rf = undefined;
    const rt = rf === undefined ? selectedId() : rf === 'all' ? null : rf;
    const task = rt && svc.query.task(rt); const events = rt ? svc.query.record(rt) : svc.query.learnerRecord(ui.learnerId);
    const root = (cls, ...kids) => h('section', { class: 'kaizen-record ' + (cls || ''), 'data-band': l.band, 'data-role': ui.role }, ...kids);
    const picker = h('div', { class: 'kz-filter' }, h('label', { for: 'rec-task' }, tx('show')), selectEl('rec-task', rt || '', [['', tx('all_tasks', { name: l.name })]].concat(tasks.map((x) => [x.id, titleOf(x) + (x.status === 'archived' ? ' · ' + tx('archived_mark') : '')])), (v) => { ui.recordTask[ui.learnerId] = v || 'all'; if (v) select(v); render(); }));
    const verdict = (v) => tx('v_' + v);
    const line = (e) => { const dt = e.detail || {};
      switch (e.source) {
        case 'task_change': return [tx('who_task'), e.type === 'edited' ? t('ev_edited', { fields: (dt.changed || []).map((f) => f + ': ' + JSON.stringify(dt.from[f]) + ' → ' + JSON.stringify(dt.to[f])).join('; ') }) : t('ev_' + e.type), ''];
        case 'student_activity': return [l.name, t('ev_' + e.type), 'act'];
        case 'student_work': return [tx('who_wrote', { name: l.name }), dt.text, 'work'];
        case 'help_requested': return [l.name, dt.available ? tx('asked', { name: l.name, type: C.helpType(ui.locale, e.type) }).replace(l.name + ' ', '') : tx('asked_unavail', { name: l.name }).replace(l.name + ' ', ''), 'help'];
        case 'help_scripted': return [tx('scripted'), assistText({ kind: 'scripted', type: e.type, text: dt.text, sampleKey: dt.sampleKey, sampleVersion: dt.sampleVersion, index: dt.index }), 'help'];
        case 'check_scripted': return [tx('who_check'), tx('ev_check', { raw: dt.raw, verdict: verdict(e.type) }), 'help'];
        case 'parent_observation': return [tx('who_note'), dt.text, 'obs'];
        case 'plan': return [tx('who_plan'), t('ev_' + e.type), ''];
        case 'proposal': return [tx('who_proposal'), e.type === 'proposed' ? t('ev_proposed', { from: fmtDate(dt.fromDue), to: fmtDate(dt.toDue) }) + (dt.reason ? ' — ' + dt.reason : '') : t('ev_prop_' + e.type), ''];
        default: return [e.source, e.type, ''];
      } };
    const items = []; let day = null;
    events.forEach((e) => { const dd = String(e.at).slice(0, 10); if (dd !== day) { day = dd; items.push(h('li', { class: 'kz-day' }, fmtDate(dd))); }
      const [who, what, cls] = line(e); const et = e.taskId && svc.query.task(e.taskId); const verbatim = cls === 'work' || cls === 'obs';
      items.push(h('li', { class: 'kz-event ' + cls }, h('div', { class: 'kz-event-head' }, h('span', { class: 'kz-who' }, who), h('span', { class: 'kz-when' }, fmtTime(e.at)), !rt && et ? h('span', { class: 'kz-on' }, titleOf(et)) : null),
        verbatim ? h('p', { class: 'kz-verbatim' }, what) : h('p', { class: 'kz-what' }, what))); });
    const timeline = items.length ? h('ol', { class: 'kz-timeline', 'aria-label': tx('activity') }, items)
      : rt ? h('p', { class: 'muted' }, tx('empty_task')) : h('div', { class: 'kz-none' }, h('p', { class: 'kz-lead' }, tx('empty_h', { name: l.name })), h('p', { class: 'muted' }, tx('empty_p')), link(tx('open_schoolwork'), 'schoolwork', null, isParent() ? 'primary' : ''));
    const side = [];
    if (isParent()) {
      if (task) {
        const o = obsDraft(d, task.id); const owner = task.learnerId; const errs = errorsOf(owner).obs;
        side.push(h('section', { class: 'kz-note', 'aria-label': tx('note_h', { name: l.name }) }, h('h2', null, tx('note_h', { name: l.name })), h('p', { class: 'kz-meta' }, tx('note_about', { title: titleOf(task) })),
          task.status === 'archived' ? h('p', { class: 'kz-fine' }, tx('note_archived')) : null,
          h('form', { onsubmit: (e) => { e.preventDefault(); const text = o.text; run({ type: 'addObservation', taskId: task.id, text, requestKey: 'obs:' + task.id }, { form: 'obs', success: t('obs_added'), onOk: () => { if (o.text === text) o.text = ''; }, focusNext: 'obs-text' }); } },
            formSummary('obs', errs, { text: tx('note_label') }),
            field('obs-text', tx('note_label'), textarea('obs-text', o.text, (v) => { o.text = v; }, { maxlength: D.LIMITS.observation, rows: 4, 'aria-describedby': 'obs-text-hint' }), { hint: tx('note_hint', { name: l.name, n: D.LIMITS.observation }), error: errs && errs.text ? errFor(errs.text, D.LIMITS.observation) : null }),
            h('div', { class: 'kz-actions' }, h('button', { type: 'submit', class: 'btn primary', 'data-act': 'obs-add', 'data-fk': 'obs-add' }, tx('note_save'))))));
      } else side.push(h('section', { class: 'kz-note', 'aria-label': tx('note_h', { name: l.name }) }, h('h2', null, tx('note_h', { name: l.name })), h('p', { class: 'muted' }, tx('note_pick'))));
    } else side.push(h('section', { class: 'kz-visible', 'aria-label': tx('visible_h') }, h('h2', null, tx('visible_h')), h('p', { class: l.band === 'k2' ? 'kz-lead' : '' }, l.band === 'k2' ? t('rec_k2_p') : l.band === '35' ? t('rec_student_p_35') : t('rec_student_p'))));
    side.push(h('details', { class: 'kz-about' }, h('summary', null, tx('how_h')), h('div', { class: 'kz-about-body' }, h('p', null, t('rec_mastery')), h('p', { class: 'muted' }, t('rec_cadence')), h('p', { class: 'muted' }, tx('how_memory')), rt ? h('p', { class: 'muted' }, countsLine(svc.query.session(rt))) : null)));
    return root('', head(ctx, tx('activity') + ' · ' + l.name, task ? titleOf(task) : tx('activity'), task ? metaLine(ctx, task, svc.query.session(task.id)) : h('p', { class: 'kz-meta' }, tx('all_tasks', { name: l.name }))),
      h('div', { class: 'kz-grid' }, h('div', { class: 'kz-main' }, picker, timeline), h('aside', { class: 'kz-side' }, side)));
  }

  window.KaizenLearning = Object.freeze({ workspace, record });
})();
