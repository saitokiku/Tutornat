/* copy.js — generated EN/ES labels for navigation, forms, errors, loading, empty states, ARIA and status.
 * User-authored titles, steps, observations and proposal reasons are never translated or altered.
 * Spanish is DRAFT educational copy and requires review by a native-speaking educator before any real use.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.Copy = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const EN = {
    app_title: 'Homework Companion — frontend demo',
    disclosure: 'Frontend demo · synthetic data · memory only (reload loses everything) · AI tutoring and school connections are simulated',
    skip: 'Skip to main content',
    role: 'View as', role_parent: 'Parent', role_student: 'Student', learner: 'Demo learner', locale: 'Language',
    demo_controls: 'Demo controls — switching role or learner is not a login',
    grade_k2: 'Grade 1 · K–2 band', grade_35: 'Grade 4 · 3–5 band', grade_68: 'Grade 7 · 6–8 band',
    nav_today: 'Today', nav_schoolwork: 'Schoolwork', nav_workspace: 'Workspace', nav_plan: 'Plan', nav_record: 'Record',
    nav_label: 'Destinations',
    // today
    today_parent_h: 'Today for {name}', today_student_h: 'Hi {name}', today_k2_h: 'Hi {name}!',
    help_flags: 'Needs a grown-up', help_flags_empty: 'No help flags right now.',
    flag_stuck: 'Flagged stuck on “{title}”', flag_help_unavailable: 'Asked for help on “{title}” — no scripted help exists for this custom task',
    open_task: 'Open', open_in_workspace: 'Open workspace', open_in_record: 'Open record',
    decisions: 'Waiting for your decision', decisions_empty: 'Nothing is waiting for a decision.',
    decision_draft: 'A mock plan draft is ready to review', decision_proposal: 'Date change proposed for “{title}”', review_in_plan: 'Review in Plan',
    next_actions: 'Open schoolwork', next_actions_empty: 'No open schoolwork. Add a task in Schoolwork.',
    due: 'Due {date}', overdue: 'Past due · {date}', state_not_started: 'Not started', state_in_progress: 'In progress', state_stuck: 'Stuck', state_complete_self_reported: 'Done (self-reported)',
    student_next: 'Your next task', student_next_empty: 'Nothing to do right now. Nice.', student_start: 'Start', student_continue: 'Keep going',
    k2_next: 'Do this one', k2_adult: 'A grown-up should sit with you for this.', k2_adult_note: 'K–2 note for adults: this screen is designed to be used together. The demo has no audio, so it does not claim a non-reader can use it alone.',
    student_plan_h: 'Your plan', student_plan_empty: 'No accepted plan yet. Your parent can make one in Plan.', plan_item: '{day} — {title}',
    student_support_h: 'Support you can ask for', support_hint: 'Hint', support_scaffold: 'Step-by-step', support_voice: 'Voice demo', support_adult: 'Ask a grown-up',
    student_remaining: '{n} open tasks',
    // schoolwork
    sw_h: 'Schoolwork', sw_list_label: 'Task list', filter_status: 'Show', filter_subject: 'Subject', f_active: 'Open and done', f_open: 'Open', f_done: 'Done', f_archived: 'Archived', f_all: 'All', f_any_subject: 'Any subject',
    sw_empty_h: 'No schoolwork yet', sw_empty_p: 'Add a fictional task or load the reviewed sample pair.', add_task: 'Add task', load_sample: 'Load sample tasks', sample_loaded: 'Sample tasks loaded (synthetic, reviewed scripts).',
    sw_count: '{n} tasks shown', select_task: 'Select a task to see details.', selected: 'Selected',
    form_new_h: 'New task (fictional)', form_edit_h: 'Edit task', f_title: 'Title', f_subject: 'Subject', f_due: 'Due date', f_instructions: 'Short instructions (optional)',
    f_limit: 'Up to {n} characters', save: 'Save', create: 'Create task', cancel: 'Cancel', edit: 'Edit', archive: 'Archive', restore: 'Restore', undo: 'Undo',
    err_required: 'Required', err_too_long: 'Too long (limit {n})', err_invalid_date: 'Use a real date (YYYY-MM-DD)', err_invalid_subject: 'Pick a subject', err_same_date: 'Pick a different date',
    form_errors: 'Please fix {n} field(s):', created: 'Task created locally (demo memory).', edited: 'Task updated locally.', archived: 'Task archived.', restored: 'Task restored.',
    archive_confirm_h: 'Archive this task?', archive_confirm_p: '“{title}” leaves the open list. You can undo right after, or restore it from the Archived filter.',
    task_origin_parent: 'Added by parent', task_origin_sample: 'Reviewed sample (scripted help available)', task_origin_intake: 'From sample teacher note (reviewed by parent)',
    task_custom_note: 'Custom task: organization and work history work; scripted tutoring and answer checking are unavailable for it.',
    intake_h: 'Teacher-note intake (sample only)', intake_p: 'Paste a note in the sample format or load the sample. A rule-based reader looks for “Title:”, “Subject:”, “Due:” and “Instructions:” lines. Nothing here is AI and arbitrary text is not interpreted.',
    intake_load: 'Use sample note', intake_read: 'Read fields', intake_none: 'No fields recognized. Nothing was parsed; type the task yourself.', intake_review_h: 'Review extracted task', intake_source: 'Source: synthetic sample note · rule-based extraction',
    intake_confirm: 'Confirm as task', intake_discard: 'Discard', f_note: 'Note text',
    detail_h: 'Task detail', version: 'Version {v}', id: 'ID {id}', updated: 'Updated {time}',
    // workspace
    ws_h: 'Workspace', ws_none: 'No task selected. Pick one in Schoolwork or Today.', ws_pick: 'Choose a task',
    ws_state: 'Work state', ws_start: 'Start working', ws_step_h: 'Add your own step or note', ws_step_label: 'What did you do or think?', ws_step_add: 'Add step',
    ws_steps_h: 'Your work (authored by student)', ws_steps_empty: 'No steps yet.', ws_help_h: 'Help', ws_help_requested: 'Requested', ws_help_scripted: 'Scripted sample reply', ws_help_unavailable: 'No tutoring available for this custom task — organization and history still work. No AI reply was generated.',
    ws_assist_h: 'Assistance (distinct from your work)', ws_assist_empty: 'No help requested yet.',
    ws_check_h: 'Check a whole-number answer (scripted sample)', ws_check_label: 'Your answer', ws_check: 'Check', ws_check_match: 'Matches the sample answer. Matching once is not mastery.', ws_check_no_match: 'Does not match. Try another step or ask for a hint.', ws_check_nan: 'Type only a whole number (digits).', ws_check_unsupported: 'Checking is unavailable for custom tasks; no judgment was made.',
    ws_stuck: 'I’m stuck', ws_complete: 'Mark done (self-report)', ws_complete_note: 'Done here means the student says so. It is not graded or verified.',
    ws_voice_note: 'Voice is a scripted text demonstration only — no microphone or audio is used.',
    ws_tally_h: 'Visual tally (shared board)', ws_tally_p: 'Tap tiles to count, then save the count as a step.', ws_tally_save: 'Save tally as step', ws_tally_text_one: 'Tally: {n} mark', ws_tally_text_other: 'Tally: {n} marks', tile: 'Tile {n}',
    ws_k2_start: 'I started', ws_k2_stuck: 'I need help', ws_k2_done: 'I did it', ws_k2_prompt: 'Tap one big button. A grown-up can help you read.',
    start_first: 'Start the task first.',
    // plan
    plan_h: 'Shared plan', sched_h: 'Schedule from current due dates', sched_empty: 'No open tasks to schedule.', sched_date: '{date}', sched_overdue: 'past due',
    current_h: 'Accepted plan', current_empty: 'No accepted plan.', current_prov: 'Mock draft accepted by parent · {time}', current_stale: 'Stale: a task this plan depends on changed. Ask for a new draft.',
    conflict_due: '“{title}” moved from {from} to {to}', conflict_archived: '“{title}” was archived',
    draft_h: 'Draft', draft_request: 'Request mock draft', draft_redraft: 'Request a new draft', draft_accept: 'Accept draft', draft_decline: 'Decline draft', draft_prov: 'Mock draft (deterministic rule: one work day per task, before its due date). Not AI.',
    draft_declined: 'Declined draft — cannot be accepted. Request a new one.', draft_stale: 'Draft is stale: its dates no longer match the tasks.', draft_none: 'No draft. A parent can request one.', draft_item: 'Work {day} · due {due} · {title}',
    plan_accepted: 'Plan accepted (local demo, not sent anywhere).', plan_declined: 'Draft declined.', plan_drafted: 'Mock draft ready for review.',
    props_h: 'Proposed changes', props_empty: 'No proposals.', prop_line: '“{title}”: {from} → {to}', prop_reason: 'Reason', prop_status_pending: 'Waiting for parent', prop_status_accepted: 'Accepted by parent', prop_status_declined: 'Declined by parent',
    prop_form_h: 'Propose a new date', prop_task: 'Task', prop_due: 'New date', prop_reason_label: 'Why?', prop_send: 'Send proposal', prop_sent: 'Proposal recorded. Your parent will see it.', prop_accept: 'Accept', prop_decline: 'Decline', prop_decided: 'Proposal {status}.',
    prop_visibility: 'Your parent sees every proposal and your reason, word for word.',
    history_h: 'Decision history', history_empty: 'No decisions yet.', h_accepted: 'Accepted', h_declined: 'Declined', h_superseded: 'Replaced',
    // record
    rec_h: 'Record', rec_task: 'Task', rec_all: 'All tasks for {name}', rec_empty: 'Nothing recorded yet.',
    src_task_change: 'Task change', src_student_activity: 'Student activity', src_student_work: 'Student work (verbatim)', src_help_requested: 'Help requested', src_help_scripted: 'Scripted sample help', src_check_scripted: 'Scripted answer check', src_parent_observation: 'Parent observation (verbatim)', src_plan: 'Plan', src_proposal: 'Proposal',
    ev_created: 'created', ev_edited: 'edited: {fields}', ev_archived: 'archived', ev_restored: 'restored', ev_done: 'marked done', ev_started: 'started', ev_stuck: 'flagged stuck', ev_complete_self_reported: 'self-reported done',
    ev_help: 'asked for {type} ({avail})', avail_yes: 'scripted reply available', avail_no: 'unavailable for custom task', ev_check: 'answer “{raw}”: {verdict}',
    ev_drafted: 'mock draft created', ev_accepted: 'accepted', ev_declined: 'declined', ev_proposed: 'proposed {from} → {to}', ev_prop_accepted: 'proposal accepted', ev_prop_declined: 'proposal declined',
    obs_h: 'Add an observation', obs_label: 'What did you notice? (stored exactly as typed, tied to this task)', obs_add: 'Add observation', obs_added: 'Observation recorded locally.',
    rec_mastery: 'Completion, observations and matched sample answers are NOT mastery. Independent checks: planned, not available in this demo.',
    rec_cadence: 'Planned follow-up cadence: 48–72 hours and around day 7. This is a product proposal, not a measured learning result.',
    rec_student_h: 'What your parent can see', rec_student_p: 'Your parent can see this task, every step you write, the help you ask for and the scripted replies, your answer checks, when you flag stuck or mark done, your date proposals and their decisions, and the observations they write here. Nothing is sent to school.',
    rec_student_p_35: 'Your parent can see this task, every step you write, the help you ask for and the scripted replies, your answer checks, when you flag stuck or mark done, and the observations they write here. Nothing is sent to school.',
    ws_shared_record_h: 'Shared record for this task',
    rec_k2_p: 'Your grown-up can see what you did here, when you asked for help, and what they wrote about it.',
    counts: '{req} help requests · {scr} scripted replies · {steps} steps',
    // scenario panel
    scen_h: 'Demo service scenario (secondary control)', scen_p: 'Simulates the local fake service. No network is used.', scen_normal: 'Normal', scen_delayed: 'Delayed (loading)', scen_fail_once: 'Fail once, then retry', scen_unavailable: 'Unavailable (offline)',
    pending_h: 'Pending operations', pending_none: 'None', retry: 'Retry', reset_learner: 'Reset this learner’s demo data', reset_confirm_h: 'Reset all demo data for {name}?', reset_confirm_p: 'Tasks, work, plans and observations for this learner are discarded. Other learners are untouched. This cannot be undone.', reset_done: 'Demo data reset for {name}.',
    confirm: 'Confirm', close: 'Close',
    // status / errors
    loading: 'Working…', pending_op: 'Waiting for the demo service…', cancelled: 'Cancelled.', e_duplicate: 'Already submitting — wait for it to finish.', e_service_failed: 'The demo service failed once (scenario). Your input is kept; retry is safe.', e_unavailable: 'Demo service unavailable (offline scenario). Nothing was changed.', e_superseded: 'Dropped: the data changed while this was pending.', e_stale: 'Draft is stale — the previous plan is kept.', e_declined: 'Declined drafts cannot be accepted.', e_conflict: 'Not allowed in the current state.', e_not_found: 'Record not found.', e_no_tasks: 'Add an open task before drafting a plan.', e_not_allowed: 'Not available for this learner.', e_validation: 'Check the highlighted fields.', e_already_decided: 'Already decided.', e_generic: 'Something went wrong locally.', e_not_retryable: 'Already applied or not retryable — nothing was changed.',
    // repair cycle 1: truthful capability, archive, visibility, stale decisions, plural-aware counts
    task_origin_sample_edited: 'Edited from a reviewed sample — the old scripted help and answer key no longer apply', sample_prior_version: 'from sample version {v}, before the edit',
    ws_archived: 'This task is archived. Its history stays visible, but nothing can be added until a parent restores it.', ws_story_h: 'Sample story (synthetic demo text, not a validated curriculum)', ws_story_k2: 'Read it together: a grown-up reads it aloud, then you tell it back.',
    support_custom_only: 'This task is custom: no scripted hint, step-by-step or voice demo exists for it. You can still ask — the request is saved for a grown-up — and your steps and history work as usual.', support_sample_note: 'Scripted sample support exists for this task:', support_none: 'No open task right now.',
    stuck_saved: 'Saved locally: your help flag will show for a grown-up on their next visit. Nothing was sent anywhere.',
    obs_visible: 'The student can read this observation in their Record.',
    prop_status_stale: 'Needs a fresh proposal', prop_status_unavailable: 'Unavailable (task archived)',
    prop_stale_note: 'Requested when the task was due {from}. The due date changed to {due} after this request, so this proposal cannot be applied. Decline it or ask for a fresh proposal.', prop_unavailable_note: 'The task was archived after this request. Restoring the task does not apply it; it stays waiting for a fresh review.',
    e_replaced: 'The draft you reviewed was replaced by a newer draft. Review the current draft before deciding.', e_prop_stale: 'Not applied: the due date changed after this proposal. The newer date is kept; ask for a fresh proposal.', e_prop_archived: 'Not applied: the task is archived.',
    student_remaining_one: '1 open task', student_remaining_other: '{n} open tasks', sw_count_one: '1 task shown', sw_count_other: '{n} tasks shown',
    help_req_one: '1 help request', help_req_other: '{n} help requests', scr_one: '1 scripted reply', scr_other: '{n} scripted replies', steps_n_one: '1 step', steps_n_other: '{n} steps',
    form_errors_one: 'Please fix 1 field:', form_errors_other: 'Please fix {n} fields:', items_one: '1 item', items_other: '{n} items',
    sr_status: 'Status', sr_dialog: 'Dialog', es_review: '',
    date_fmt: 'en-US',
  };
  const ES = {
    app_title: 'Compañero de tareas — demo de interfaz',
    disclosure: 'Demo de interfaz · datos sintéticos · solo en memoria (recargar borra todo) · tutoría de IA y conexión escolar simuladas',
    skip: 'Saltar al contenido principal',
    role: 'Ver como', role_parent: 'Madre/Padre', role_student: 'Estudiante', learner: 'Estudiante de demo', locale: 'Idioma',
    demo_controls: 'Controles de demo — cambiar rol o estudiante no es iniciar sesión',
    grade_k2: '1.º grado · banda K–2', grade_35: '4.º grado · banda 3–5', grade_68: '7.º grado · banda 6–8',
    nav_today: 'Hoy', nav_schoolwork: 'Tareas', nav_workspace: 'Espacio', nav_plan: 'Plan', nav_record: 'Registro', nav_label: 'Destinos',
    today_parent_h: 'Hoy para {name}', today_student_h: 'Hola, {name}', today_k2_h: '¡Hola, {name}!',
    help_flags: 'Necesita un adulto', help_flags_empty: 'No hay avisos de ayuda ahora.',
    flag_stuck: 'Marcó “{title}” como atascado', flag_help_unavailable: 'Pidió ayuda en “{title}” — no hay ayuda guionizada para esta tarea personalizada',
    open_task: 'Abrir', open_in_workspace: 'Abrir espacio', open_in_record: 'Abrir registro',
    decisions: 'Esperan tu decisión', decisions_empty: 'Nada espera una decisión.',
    decision_draft: 'Hay un borrador de plan simulado para revisar', decision_proposal: 'Cambio de fecha propuesto para “{title}”', review_in_plan: 'Revisar en Plan',
    next_actions: 'Tareas abiertas', next_actions_empty: 'No hay tareas abiertas. Agrega una en Tareas.',
    due: 'Entrega {date}', overdue: 'Atrasada · {date}', state_not_started: 'Sin empezar', state_in_progress: 'En curso', state_stuck: 'Atascado', state_complete_self_reported: 'Hecha (autoinforme)',
    student_next: 'Tu próxima tarea', student_next_empty: 'Nada por hacer ahora. Bien.', student_start: 'Empezar', student_continue: 'Seguir',
    k2_next: 'Haz esta', k2_adult: 'Un adulto debe acompañarte en esto.', k2_adult_note: 'Nota K–2 para adultos: esta pantalla está pensada para usarse juntos. La demo no tiene audio, así que no afirma que un no lector pueda usarla solo.',
    student_plan_h: 'Tu plan', student_plan_empty: 'Aún no hay plan aceptado. Tu madre/padre puede crear uno en Plan.', plan_item: '{day} — {title}',
    student_support_h: 'Apoyo que puedes pedir', support_hint: 'Pista', support_scaffold: 'Paso a paso', support_voice: 'Demo de voz', support_adult: 'Pedir a un adulto',
    student_remaining: '{n} tareas abiertas',
    sw_h: 'Tareas', sw_list_label: 'Lista de tareas', filter_status: 'Mostrar', filter_subject: 'Materia', f_active: 'Abiertas y hechas', f_open: 'Abiertas', f_done: 'Hechas', f_archived: 'Archivadas', f_all: 'Todas', f_any_subject: 'Cualquier materia',
    sw_empty_h: 'Aún no hay tareas', sw_empty_p: 'Agrega una tarea ficticia o carga el par de ejemplos revisados.', add_task: 'Agregar tarea', load_sample: 'Cargar tareas de ejemplo', sample_loaded: 'Ejemplos cargados (sintéticos, guiones revisados).',
    sw_count: '{n} tareas mostradas', select_task: 'Selecciona una tarea para ver detalles.', selected: 'Seleccionada',
    form_new_h: 'Nueva tarea (ficticia)', form_edit_h: 'Editar tarea', f_title: 'Título', f_subject: 'Materia', f_due: 'Fecha de entrega', f_instructions: 'Instrucciones breves (opcional)',
    f_limit: 'Hasta {n} caracteres', save: 'Guardar', create: 'Crear tarea', cancel: 'Cancelar', edit: 'Editar', archive: 'Archivar', restore: 'Restaurar', undo: 'Deshacer',
    err_required: 'Obligatorio', err_too_long: 'Demasiado largo (límite {n})', err_invalid_date: 'Usa una fecha real (AAAA-MM-DD)', err_invalid_subject: 'Elige una materia', err_same_date: 'Elige otra fecha',
    form_errors: 'Corrige {n} campo(s):', created: 'Tarea creada localmente (memoria de demo).', edited: 'Tarea actualizada localmente.', archived: 'Tarea archivada.', restored: 'Tarea restaurada.',
    archive_confirm_h: '¿Archivar esta tarea?', archive_confirm_p: '“{title}” sale de la lista abierta. Puedes deshacer justo después o restaurarla desde el filtro Archivadas.',
    task_origin_parent: 'Agregada por madre/padre', task_origin_sample: 'Ejemplo revisado (ayuda guionizada disponible)', task_origin_intake: 'De nota docente de ejemplo (revisada por madre/padre)',
    task_custom_note: 'Tarea personalizada: la organización y el historial funcionan; la tutoría guionizada y la verificación de respuestas no están disponibles.',
    intake_h: 'Lectura de nota docente (solo ejemplo)', intake_p: 'Pega una nota en el formato de ejemplo o carga el ejemplo. Un lector basado en reglas busca líneas “Title:”, “Subject:”, “Due:” e “Instructions:”. Nada aquí es IA y el texto arbitrario no se interpreta.',
    intake_load: 'Usar nota de ejemplo', intake_read: 'Leer campos', intake_none: 'No se reconocieron campos. No se analizó nada; escribe la tarea tú mismo.', intake_review_h: 'Revisar tarea extraída', intake_source: 'Fuente: nota sintética de ejemplo · extracción por reglas',
    intake_confirm: 'Confirmar como tarea', intake_discard: 'Descartar', f_note: 'Texto de la nota',
    detail_h: 'Detalle de la tarea', version: 'Versión {v}', id: 'ID {id}', updated: 'Actualizada {time}',
    ws_h: 'Espacio de trabajo', ws_none: 'Ninguna tarea seleccionada. Elige una en Tareas u Hoy.', ws_pick: 'Elegir una tarea',
    ws_state: 'Estado del trabajo', ws_start: 'Empezar a trabajar', ws_step_h: 'Agrega tu propio paso o nota', ws_step_label: '¿Qué hiciste o pensaste?', ws_step_add: 'Agregar paso',
    ws_steps_h: 'Tu trabajo (escrito por el estudiante)', ws_steps_empty: 'Aún no hay pasos.', ws_help_h: 'Ayuda', ws_help_requested: 'Solicitada', ws_help_scripted: 'Respuesta guionizada de ejemplo', ws_help_unavailable: 'No hay tutoría para esta tarea personalizada — la organización y el historial siguen funcionando. No se generó ninguna respuesta de IA.',
    ws_assist_h: 'Asistencia (separada de tu trabajo)', ws_assist_empty: 'Aún no pediste ayuda.',
    ws_check_h: 'Verificar una respuesta de número entero (ejemplo guionizado)', ws_check_label: 'Tu respuesta', ws_check: 'Verificar', ws_check_match: 'Coincide con la respuesta del ejemplo. Coincidir una vez no es dominio.', ws_check_no_match: 'No coincide. Prueba otro paso o pide una pista.', ws_check_nan: 'Escribe solo un número entero (dígitos).', ws_check_unsupported: 'La verificación no está disponible para tareas personalizadas; no se emitió juicio.',
    ws_stuck: 'Estoy atascado', ws_complete: 'Marcar hecha (autoinforme)', ws_complete_note: 'Hecha significa que el estudiante lo dice. No está calificada ni verificada.',
    ws_voice_note: 'La voz es solo una demostración de texto guionizado — no se usa micrófono ni audio.',
    ws_tally_h: 'Conteo visual (tablero compartido)', ws_tally_p: 'Toca fichas para contar y guarda el conteo como paso.', ws_tally_save: 'Guardar conteo como paso', ws_tally_text_one: 'Conteo: {n} marca', ws_tally_text_other: 'Conteo: {n} marcas', tile: 'Ficha {n}',
    ws_k2_start: 'Empecé', ws_k2_stuck: 'Necesito ayuda', ws_k2_done: 'Lo hice', ws_k2_prompt: 'Toca un botón grande. Un adulto puede ayudarte a leer.',
    start_first: 'Primero empieza la tarea.',
    plan_h: 'Plan compartido', sched_h: 'Calendario según fechas de entrega', sched_empty: 'No hay tareas abiertas para programar.', sched_date: '{date}', sched_overdue: 'atrasada',
    current_h: 'Plan aceptado', current_empty: 'No hay plan aceptado.', current_prov: 'Borrador simulado aceptado por madre/padre · {time}', current_stale: 'Obsoleto: cambió una tarea de la que depende este plan. Pide un nuevo borrador.',
    conflict_due: '“{title}” pasó de {from} a {to}', conflict_archived: '“{title}” fue archivada',
    draft_h: 'Borrador', draft_request: 'Pedir borrador simulado', draft_redraft: 'Pedir un nuevo borrador', draft_accept: 'Aceptar borrador', draft_decline: 'Rechazar borrador', draft_prov: 'Borrador simulado (regla determinista: un día de trabajo por tarea, antes de su entrega). No es IA.',
    draft_declined: 'Borrador rechazado — no puede aceptarse. Pide uno nuevo.', draft_stale: 'El borrador está obsoleto: sus fechas ya no coinciden con las tareas.', draft_none: 'Sin borrador. Una madre/padre puede pedir uno.', draft_item: 'Trabajar {day} · entrega {due} · {title}',
    plan_accepted: 'Plan aceptado (demo local, no se envía a ningún lado).', plan_declined: 'Borrador rechazado.', plan_drafted: 'Borrador simulado listo para revisar.',
    props_h: 'Cambios propuestos', props_empty: 'No hay propuestas.', prop_line: '“{title}”: {from} → {to}', prop_reason: 'Motivo', prop_status_pending: 'Espera a madre/padre', prop_status_accepted: 'Aceptada por madre/padre', prop_status_declined: 'Rechazada por madre/padre',
    prop_form_h: 'Proponer una nueva fecha', prop_task: 'Tarea', prop_due: 'Nueva fecha', prop_reason_label: '¿Por qué?', prop_send: 'Enviar propuesta', prop_sent: 'Propuesta registrada. Tu madre/padre la verá.', prop_accept: 'Aceptar', prop_decline: 'Rechazar', prop_decided: 'Propuesta {status}.',
    prop_visibility: 'Tu madre/padre ve cada propuesta y tu motivo, palabra por palabra.',
    history_h: 'Historial de decisiones', history_empty: 'Aún no hay decisiones.', h_accepted: 'Aceptado', h_declined: 'Rechazado', h_superseded: 'Reemplazado',
    rec_h: 'Registro', rec_task: 'Tarea', rec_all: 'Todas las tareas de {name}', rec_empty: 'Aún no hay registros.',
    src_task_change: 'Cambio de tarea', src_student_activity: 'Actividad del estudiante', src_student_work: 'Trabajo del estudiante (textual)', src_help_requested: 'Ayuda solicitada', src_help_scripted: 'Ayuda guionizada de ejemplo', src_check_scripted: 'Verificación guionizada', src_parent_observation: 'Observación de madre/padre (textual)', src_plan: 'Plan', src_proposal: 'Propuesta',
    ev_created: 'creada', ev_edited: 'editada: {fields}', ev_archived: 'archivada', ev_restored: 'restaurada', ev_done: 'marcada hecha', ev_started: 'empezó', ev_stuck: 'marcó atascado', ev_complete_self_reported: 'autoinformó hecha',
    ev_help: 'pidió {type} ({avail})', avail_yes: 'respuesta guionizada disponible', avail_no: 'no disponible para tarea personalizada', ev_check: 'respuesta “{raw}”: {verdict}',
    ev_drafted: 'borrador simulado creado', ev_accepted: 'aceptado', ev_declined: 'rechazado', ev_proposed: 'propuso {from} → {to}', ev_prop_accepted: 'propuesta aceptada', ev_prop_declined: 'propuesta rechazada',
    obs_h: 'Agregar una observación', obs_label: '¿Qué notaste? (se guarda tal cual, ligada a esta tarea)', obs_add: 'Agregar observación', obs_added: 'Observación registrada localmente.',
    rec_mastery: 'Terminar, observar o coincidir con la respuesta de ejemplo NO es dominio. Verificaciones independientes: planificadas, no disponibles en esta demo.',
    rec_cadence: 'Cadencia de seguimiento planificada: 48–72 horas y alrededor del día 7. Es una propuesta de producto, no un resultado de aprendizaje medido.',
    rec_student_h: 'Lo que puede ver tu madre/padre', rec_student_p: 'Tu madre/padre puede ver esta tarea, cada paso que escribes, la ayuda que pides y las respuestas guionizadas, tus verificaciones de respuesta, cuándo marcas atascado o hecha, tus propuestas de fecha y sus decisiones, y las observaciones que escribe aquí. Nada se envía a la escuela.',
    rec_student_p_35: 'Tu madre/padre puede ver esta tarea, cada paso que escribes, la ayuda que pides y las respuestas guionizadas, tus verificaciones de respuesta, cuándo marcas atascado o hecha, y las observaciones que escribe aquí. Nada se envía a la escuela.',
    ws_shared_record_h: 'Registro compartido de esta tarea',
    rec_k2_p: 'Tu adulto puede ver lo que hiciste aquí, cuándo pediste ayuda y lo que escribió sobre eso.',
    counts: '{req} pedidos de ayuda · {scr} respuestas guionizadas · {steps} pasos',
    scen_h: 'Escenario del servicio de demo (control secundario)', scen_p: 'Simula el servicio local falso. No se usa la red.', scen_normal: 'Normal', scen_delayed: 'Con retraso (cargando)', scen_fail_once: 'Falla una vez, luego reintenta', scen_unavailable: 'No disponible (sin conexión)',
    pending_h: 'Operaciones pendientes', pending_none: 'Ninguna', retry: 'Reintentar', reset_learner: 'Restablecer los datos de demo de este estudiante', reset_confirm_h: '¿Restablecer todos los datos de demo de {name}?', reset_confirm_p: 'Se descartan tareas, trabajo, planes y observaciones de este estudiante. Los demás no cambian. No se puede deshacer.', reset_done: 'Datos de demo restablecidos para {name}.',
    confirm: 'Confirmar', close: 'Cerrar',
    loading: 'Trabajando…', pending_op: 'Esperando al servicio de demo…', cancelled: 'Cancelado.', e_duplicate: 'Ya se está enviando — espera a que termine.', e_service_failed: 'El servicio de demo falló una vez (escenario). Tu texto se conserva; reintentar es seguro.', e_unavailable: 'Servicio de demo no disponible (escenario sin conexión). No se cambió nada.', e_superseded: 'Descartado: los datos cambiaron mientras estaba pendiente.', e_stale: 'El borrador está obsoleto — se conserva el plan anterior.', e_declined: 'Los borradores rechazados no pueden aceptarse.', e_conflict: 'No permitido en el estado actual.', e_not_found: 'Registro no encontrado.', e_no_tasks: 'Agrega una tarea abierta antes de pedir un plan.', e_not_allowed: 'No disponible para este estudiante.', e_validation: 'Revisa los campos marcados.', e_already_decided: 'Ya se decidió.', e_generic: 'Algo falló localmente.', e_not_retryable: 'Ya se aplicó o no se puede reintentar — no se cambió nada.',
    task_origin_sample_edited: 'Editada a partir de un ejemplo revisado — la ayuda guionizada y la clave de respuesta anteriores ya no aplican', sample_prior_version: 'del ejemplo versión {v}, antes de la edición',
    ws_archived: 'Esta tarea está archivada. Su historial sigue visible, pero no se puede agregar nada hasta que una madre/padre la restaure.', ws_story_h: 'Cuento de ejemplo (texto sintético de demo, no es un currículo validado)', ws_story_k2: 'Léanlo juntos: un adulto lo lee en voz alta y luego tú lo cuentas.',
    support_custom_only: 'Esta tarea es personalizada: no existe pista, paso a paso ni demo de voz guionizados para ella. Aun así puedes pedir ayuda — el pedido se guarda para un adulto — y tus pasos e historial funcionan como siempre.', support_sample_note: 'Hay apoyo guionizado de ejemplo para esta tarea:', support_none: 'No hay tarea abierta ahora.',
    stuck_saved: 'Guardado localmente: tu aviso de ayuda se mostrará a un adulto en su próxima visita. No se envió nada a ningún lado.',
    obs_visible: 'El estudiante puede leer esta observación en su Registro.',
    prop_status_stale: 'Necesita una propuesta nueva', prop_status_unavailable: 'No disponible (tarea archivada)',
    prop_stale_note: 'Se pidió cuando la entrega era {from}. La fecha cambió a {due} después del pedido, así que esta propuesta no puede aplicarse. Recházala o pide una propuesta nueva.', prop_unavailable_note: 'La tarea fue archivada después de este pedido. Restaurarla no lo aplica; queda a la espera de una revisión nueva.',
    e_replaced: 'El borrador que revisaste fue reemplazado por uno más nuevo. Revisa el borrador actual antes de decidir.', e_prop_stale: 'No se aplicó: la fecha de entrega cambió después de esta propuesta. Se conserva la fecha más nueva; pide una propuesta nueva.', e_prop_archived: 'No se aplicó: la tarea está archivada.',
    student_remaining_one: '1 tarea abierta', student_remaining_other: '{n} tareas abiertas', sw_count_one: '1 tarea mostrada', sw_count_other: '{n} tareas mostradas',
    help_req_one: '1 pedido de ayuda', help_req_other: '{n} pedidos de ayuda', scr_one: '1 respuesta guionizada', scr_other: '{n} respuestas guionizadas', steps_n_one: '1 paso', steps_n_other: '{n} pasos',
    form_errors_one: 'Corrige 1 campo:', form_errors_other: 'Corrige {n} campos:', items_one: '1 elemento', items_other: '{n} elementos',
    sr_status: 'Estado', sr_dialog: 'Diálogo', es_review: 'Español: borrador generado — requiere revisión de un educador nativo.',
    date_fmt: 'es-MX',
  };
  const SUBJECTS = { en: { math: 'Math', reading: 'Reading', writing: 'Writing', science: 'Science', social: 'Social studies', other: 'Other' }, es: { math: 'Matemáticas', reading: 'Lectura', writing: 'Escritura', science: 'Ciencias', social: 'Estudios sociales', other: 'Otra' } };
  const HELP = { en: { hint: 'hint', scaffold: 'step-by-step', voice_demo: 'voice demo' }, es: { hint: 'pista', scaffold: 'paso a paso', voice_demo: 'demo de voz' } };
  const DICT = { en: EN, es: ES };
  // Spanish renderings of the GENERATED sample content in domain.SAMPLES (same key, same version, same meaning).
  // Rendered only while a task/entry still carries its sample key; family-edited text is shown verbatim instead.
  const SAMPLE_ES = Object.freeze({
    'math-arrays': Object.freeze({
      version: 1, title: 'Arreglos de calcomanías: 15 filas de 15', instructions: 'Dibuja o describe 15 filas con 15 calcomanías en cada fila. ¿Cuántas calcomanías hay en total?',
      hints: Object.freeze(['Pista guionizada 1: Intenta separar las 15 filas en 10 filas y 5 filas.', 'Pista guionizada 2: 10 filas de 15 son 150. ¿Cuántas hay en las otras 5 filas?', 'Pista guionizada 3: Suma las dos partes.']),
      scaffold: Object.freeze(['Andamio guionizado: Paso 1 — escribe lo que sabes (filas, calcomanías por fila).', 'Andamio guionizado: Paso 2 — separa un número en partes fáciles.', 'Andamio guionizado: Paso 3 — suma las partes y escribe el total con su etiqueta.']),
      voice: 'Demo de voz guionizada (solo texto): «Miremos juntos la primera fila. ¿Cuántas calcomanías ves?»', story: null,
    }),
    'reading-retell': Object.freeze({
      version: 1, title: 'Recuento: «La cometa perdida» (cuento de ejemplo)', instructions: 'Lee el cuento corto de ejemplo y cuenta el principio, el medio y el final con tus propias palabras.',
      hints: Object.freeze(['Pista guionizada 1: ¿De quién trata el cuento? Empieza con un nombre.', 'Pista guionizada 2: ¿Qué problema ocurre en el medio?', 'Pista guionizada 3: ¿Cómo se resuelve el problema al final?']),
      scaffold: Object.freeze(['Andamio guionizado: Primero… (principio)', 'Andamio guionizado: Luego… (medio)', 'Andamio guionizado: Al final… (final)']),
      voice: 'Demo de voz guionizada (solo texto): «Lee la primera oración en voz alta y luego dime de quién trata el cuento.»',
      story: Object.freeze([
        'Mina tenía una cometa roja con una larga cola amarilla. El sábado la llevó a la colina detrás de su escuela, y voló más alto que el árbol más alto.',
        'Entonces el viento cambió. El hilo se escapó de las manos de Mina, y la cometa se fue volando sobre los tejados. Ella corrió tras la cometa, pero ya no estaba.',
        'Mina estaba triste, pero no se rindió. Le preguntó a su vecino, el señor Ortiz, que había visto algo rojo caer en su jardín. Juntos encontraron la cometa enredada en una planta de tomate, con cola y todo. Mina hizo un nudo nuevo, y el siguiente día de viento la cometa volvió a volar.',
      ]),
    }),
  });
  // sampleText(locale, key, sample): the generated sample content in the chosen locale (falls back to the canonical English record).
  const sampleText = (locale, key, sample) => { const es = locale === 'es' && SAMPLE_ES[key] && sample && SAMPLE_ES[key].version === sample.version ? SAMPLE_ES[key] : null; return es ? Object.freeze({ ...sample, ...es }) : sample; };
  // taskText(locale, task, field, SAMPLES): display PROVENANCE only (never capability). A field whose explicit stored provenance
  // (task.generated[field] = { key, version }) names a known sample at the current version is shown in the chosen locale, even after
  // the sample capability detached. Anything else — family text, no provenance, unknown key or mismatched version — is the stored
  // bytes verbatim. Provenance is never inferred from string equality with a canonical EN/ES sample string.
  const taskText = (locale, task, field, samples) => { const g = task && task.generated && task.generated[field]; const sm = g && samples && samples[g.key]; return sm && (g.version || 1) === sm.version ? sampleText(locale, g.key, sm)[field] : (task ? task[field] : ''); };
  // tn(locale, key, n): singular/plural-aware count label from `<key>_one` / `<key>_other` (0 and 2+ use the plural form in both languages).
  const tn = (locale, key, n, params) => t(locale, key + (Number(n) === 1 ? '_one' : '_other'), { n, ...(params || {}) });

  function t(locale, key, params) {
    let s = (DICT[locale] || EN)[key];
    if (s === undefined) s = EN[key] !== undefined ? EN[key] : key;
    if (params) Object.keys(params).forEach((k) => { s = s.split('{' + k + '}').join(String(params[k])); });
    return s;
  }
  const subject = (locale, code) => (SUBJECTS[locale] || SUBJECTS.en)[code] || code;
  const helpType = (locale, code) => (HELP[locale] || HELP.en)[code] || code;
  function fmtDate(locale, iso) {
    if (!iso) return '';
    try { return new Intl.DateTimeFormat(t(locale, 'date_fmt'), { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(iso + 'T00:00:00Z')); } catch (e) { return iso; }
  }
  function fmtTime(locale, isoTime) {
    if (!isoTime) return '';
    try { return new Intl.DateTimeFormat(t(locale, 'date_fmt'), { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(isoTime)); } catch (e) { return isoTime; }
  }
  const missingKeys = () => Object.keys(EN).filter((k) => !(k in ES)).concat(Object.keys(ES).filter((k) => !(k in EN)).map((k) => 'ES-only:' + k));
  return { t, tn, subject, helpType, fmtDate, fmtTime, sampleText, taskText, SAMPLE_ES, DICT, LOCALES: ['en', 'es'], missingKeys };
});
