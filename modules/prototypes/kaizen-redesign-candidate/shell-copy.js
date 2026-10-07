/* shell-copy.js — strings the redesigned shell adds (nav labels, Today/Schoolwork composition). Shared copy.js is read-only;
 * generated strings switch with the locale, family-authored text never passes through here. */
(function (root) {
  'use strict';
  const en = {
    nav_today: 'Today', nav_schoolwork: 'Schoolwork', nav_plan: 'Plan', nav_workspace: 'Learn', nav_record: 'Activity',
    brand_caption: 'Homework companion', learner_opt: '{name} · Grade {grade}', rail_label: 'Sidebar', nav_label: 'Sections', viewing_as: 'Viewing as', child: 'Child', language: 'Language',
    demo_note: 'Demo with made-up data, kept in memory only. Refreshing the page clears it; help replies are scripted.',
    booting: 'Setting up the demo…', scenario_h: 'Scenario tools',
    open_tasks_one: '{n} open assignment', open_tasks_other: '{n} open assignments',
    waiting_one: '{n} thing needs you', waiting_other: '{n} things need you', nothing_waiting: 'nothing waiting on you',
    this_week: 'This week', needs_you: 'Needs you', next_up: 'Next up', past_due: 'Past due', due_count_one: '{n} due', due_count_other: '{n} due',
    lead_stuck: '{name} is stuck on “{title}”', lead_help_unavailable: '{name} asked for help on “{title}” — this task has no scripted help',
    lead_proposal: '{name} proposed a new date for “{title}”', lead_draft: 'A plan draft is waiting for your review', lead_stale: 'The accepted plan no longer matches the due dates',
    last_step: 'Last thing written', see_work: 'See the work', leave_note: 'Leave a note', review_plan: 'Review in Plan', open: 'Open', open_in_learn: 'Open in Learn', activity: 'Activity',
    also: 'Also waiting', assignments: 'Assignments', was_due: 'was due {date}', due_on: 'due {date}',
    empty_h: 'Nothing on {name}’s list yet', empty_p: 'Add schoolwork as it comes home, or load two sample tasks to see how the week fills in.',
    add_schoolwork: 'Add schoolwork', load_sample: 'Load sample tasks',
    hi: 'Hi, {name}', your_next: 'Your next task', then: 'Then', all_done: 'Nothing left on your list.', all_done_k2: 'Nothing to do right now.',
    support_sample: 'Hints and a step-by-step walkthrough are in Learn if you get stuck.', support_custom: 'This task has no scripted help — ask a grown-up if you get stuck.',
    propose_date: 'Propose a different date', no_instructions: 'No instructions were added.', details: 'Details', id_label: 'ID', origin_label: 'Origin', state_label: 'Status',
    intake_summary: 'Add from a teacher’s note (sample)', show: 'Show', subject: 'Subject', shown_one: '{n} shown', shown_other: '{n} shown',
    sw_student_p: 'Your assignments. Open one to work on it in Learn.',
    fallback_note: 'Interim view — the redesigned page for this section is still being built.',
  };
  const es = {
    nav_today: 'Hoy', nav_schoolwork: 'Tareas', nav_plan: 'Plan', nav_workspace: 'Aprender', nav_record: 'Actividad',
    brand_caption: 'Compañero de tareas', learner_opt: '{name} · {grade}.º grado', rail_label: 'Barra lateral', nav_label: 'Secciones', viewing_as: 'Ver como', child: 'Hijo/a', language: 'Idioma',
    demo_note: 'Demostración con datos ficticios, solo en memoria. Al recargar la página se borra todo; las ayudas son respuestas guionizadas.',
    booting: 'Preparando la demostración…', scenario_h: 'Herramientas de escenario',
    open_tasks_one: '{n} tarea abierta', open_tasks_other: '{n} tareas abiertas',
    waiting_one: '{n} asunto te espera', waiting_other: '{n} asuntos te esperan', nothing_waiting: 'nada pendiente de ti',
    this_week: 'Esta semana', needs_you: 'Te necesita', next_up: 'Lo siguiente', past_due: 'Atrasada', due_count_one: '{n} entrega', due_count_other: '{n} entregas',
    lead_stuck: '{name} está atascado/a en “{title}”', lead_help_unavailable: '{name} pidió ayuda en “{title}”; esta tarea no tiene ayuda guionizada',
    lead_proposal: '{name} propuso una nueva fecha para “{title}”', lead_draft: 'Un borrador del plan espera tu revisión', lead_stale: 'El plan aceptado ya no coincide con las fechas de entrega',
    last_step: 'Lo último que escribió', see_work: 'Ver el trabajo', leave_note: 'Dejar una nota', review_plan: 'Revisar en Plan', open: 'Abrir', open_in_learn: 'Abrir en Aprender', activity: 'Actividad',
    also: 'También pendiente', assignments: 'Tareas', was_due: 'venció el {date}', due_on: 'entrega {date}',
    empty_h: 'Aún no hay nada en la lista de {name}', empty_p: 'Agrega tareas conforme lleguen, o carga dos tareas de muestra para ver cómo se llena la semana.',
    add_schoolwork: 'Agregar tarea', load_sample: 'Cargar tareas de muestra',
    hi: 'Hola, {name}', your_next: 'Tu siguiente tarea', then: 'Después', all_done: 'No queda nada en tu lista.', all_done_k2: 'No hay nada que hacer ahora.',
    support_sample: 'En Aprender hay pistas y una guía paso a paso si te atascas.', support_custom: 'Esta tarea no tiene ayuda guionizada: pide ayuda a un adulto si te atascas.',
    propose_date: 'Proponer otra fecha', no_instructions: 'No se agregaron instrucciones.', details: 'Detalles', id_label: 'ID', origin_label: 'Origen', state_label: 'Estado',
    intake_summary: 'Agregar desde una nota del maestro (muestra)', show: 'Mostrar', subject: 'Materia', shown_one: '{n} en la lista', shown_other: '{n} en la lista',
    sw_student_p: 'Tus tareas. Abre una para trabajar en Aprender.',
    fallback_note: 'Vista provisional: la página rediseñada de esta sección aún está en construcción.',
  };
  root.ShellCopy = Object.freeze({ en: Object.freeze(en), es: Object.freeze(es) });
})(typeof self !== 'undefined' ? self : this);
