/*
 * Academic Companion — K–8 concept explorer (design prototype).
 *
 * Boundary: synthetic examples only. No network, no microphone, no speech
 * services, no storage. The "voice" demonstration is a scripted, deterministic
 * sequence of text turns. State lives in memory and resets with the Reset button.
 * The role switch is a demo control, not access control.
 *
 * Structure: localized copy (STR, TASKS, NOTES, PLAN_COPY, VOICE) → UI state (ui) +
 * model state (state, from model.js) → render() rebuilds #explorer and #main →
 * delegated events call act()/submit() → render() again.
 *
 * Evidence rule: anything a person typed is stored verbatim and rendered verbatim.
 * Anything generated (scripted turns, hints, checker replies, plan items) is stored
 * as a stable key + parameters and rendered in the currently selected locale, so a
 * language switch never erases or rewrites a person's contribution.
 */
(function () {
  'use strict';

  const M = window.AcademicCompanionModel;
  const app = document.getElementById('app');
  const main = document.getElementById('main');
  const live = document.getElementById('live');

  // ---------------------------------------------------------------- copy ----

  const STR = {
    en: {
      skip: 'Skip to the scenario',
      brand: 'Academic Companion',
      brandTag: 'K–8 concept explorer · design prototype',
      boundary: '<strong>Design prototype.</strong> Synthetic examples. Not connected to any AI service, school account, microphone, or real student. Nothing you type is stored.',
      explorer: 'Explorer controls',
      concept: 'Concept',
      conceptA: 'A · Today-first',
      conceptB: 'B · Workspace-first',
      conceptC: 'C · Shared plan-first',
      conceptAnote: 'Concept A is the proposed default — a design suggestion, not an owner decision.',
      role: 'Viewing as',
      student: 'Student',
      parent: 'Parent',
      band: 'Grade band',
      K2: 'K–2',
      b35: 'Grades 3–5',
      b68: 'Grades 6–8',
      bandNote: 'Grade bands are provisional experience bands inside K–8. High school and preschool are not supported.',
      lang: 'Language',
      en: 'English',
      es: 'Español',
      reset: 'Reset example',
      resetDone: 'Example reset. All sample progress cleared.',
      conceptSet: (c) => `Concept ${c} shown. Scenario kept.`,
      roleSet: (r) => `Now viewing as ${r}. Demo switch only — not access control.`,
      bandSet: (b) => `Grade band ${b}. A different synthetic example loaded.`,
      langSet: 'Language: English. Your own entries are kept word for word; generated text is shown in English.',
      sample: 'Sample',
      parentEntered: 'Parent-entered sample',
      scripted: 'Scripted demo',
      ai: 'AI companion',
      today: 'Today',
      oneThing: 'One thing to do',
      due: 'Due',
      dueSource: { parent_corrected: 'deadline corrected by parent', parent_confirmed: 'deadline confirmed by parent', student_proposal_approved: 'deadline moved by an approved student proposal' },
      sampleSaid: (d) => `Sample note said ${d}; the shared deadline shown here is the current one.`,
      planStale: (f, t) => `This plan is out of date: the deadline moved from ${f} to ${t}. It needs a new draft, which a parent accepts.`,
      draftStale: 'Out of date — the deadline moved',
      pSuperseded: 'superseded by a later parent correction',
      proposeNone: 'Nothing left to move: all your tasks are marked done.',
      proposeInvalid: 'That proposal can’t be sent. Pick a task that isn’t done and a valid date.',
      proposeOpened: 'Proposal form opened. Pick a task, a new date and why; your parent decides.',
      proposeClosed: 'Proposal form closed. Nothing was sent.',
      proposalStale: 'That proposal was already decided.',
      actionUnavailable: 'That action isn’t available right now.',
      turnsDrawer: (n) => `All turns in this session (${n})`,
      boardFor: (t) => `Shared board · ${t}`,
      subject: { math: 'Math', literacy: 'Reading & writing', science: 'Science', history: 'History' },
      status: { not_started: 'Not started', in_progress: 'In progress', complete: 'Marked done (self-report)' },
      start: 'Start',
      cueReady: 'Ready', cueWorking: 'Working', cueDone: 'Done',
      hint: 'Ask for a hint',
      done: 'Mark done',
      askAdult: 'Ask a grown-up',
      adultAsked: 'A grown-up has been asked. Your parent will see this flag.',
      helpFlag: 'Asked for a grown-up',
      nextStep: 'Next step',
      nextTask: (title) => `Next: ${title}`,
      allDone: 'That’s everything for today. A quick check is planned later — nothing is “mastered” yet.',
      doneNote: 'Marked done by the student. This is a self-report inside an assisted session; an independent check comes later.',
      hintCount: (n) => (n === 1 ? '1 hint used' : `${n} hints used`),
      board: 'Shared board',
      boardNote: 'Both of you see this board. Hints the companion adds are highlighted.',
      write: 'Write on the board',
      writeHelp: 'Type a step or an answer. The companion only checks a final answer; it never writes your answer for you.',
      add: 'Add',
      companion: 'Companion',
      caption0: 'Press “Play next turn” to step through a scripted exchange as text — no sound is played — or type below.',
      play: 'Play next turn',
      replay: 'Replay from the start',
      endOfScript: 'End of the scripted demo. Replay or keep typing.',
      scriptUnavailable: 'Scripted demo unavailable: this subject is organized-only in this example (no instruction or assessment). You can still type below.',
      voiceLabel: 'Voice is a scripted text demonstration. No microphone, sound, or speech service is used.',
      micTry: 'Try the microphone (simulated)',
      micDenied: 'Microphone blocked (simulated). You can keep going by typing, or allow it.',
      micAllow: 'Allow (simulated)',
      micKeepTyping: 'Keep typing',
      micRecovered: 'Microphone allowed (simulated). In this prototype, speech is still scripted text.',
      micIdle: 'Microphone: not requested.',
      typed: 'Type to the companion',
      typedHelp: 'Try “hint”, or type your answer.',
      send: 'Send',
      replyHint: (h) => `Here’s a hint, not the answer: ${h}`,
      replyNoMoreHints: 'I’m out of hints for this one. Try a step on the board and I’ll check your final answer.',
      replyMatch: 'That matches. This was assisted practice — mark it done when you’re ready; a short independent check comes later, so nothing is counted as mastered yet.',
      replyNoMatch: 'Not yet. Let’s look at the last step together — ask for a hint if you want one.',
      replyAmbiguous: 'I see more than one number. Which one is your final answer? Write just that one.',
      replyUnparsed: 'I’ve kept that step on the board. I can only check a final answer written as a number (or “x = …”), so I’m not marking this right or wrong. Keep going.',
      replyLiteracy: 'Thanks. I’ve kept it on the board. I don’t grade writing; in this demo, your parent can see this board and these turns.',
      replyOrganized: 'This task is organized only in this example: I keep its deadline and status, but I don’t teach or check it. Your parent sees the same list.',
      replyDefault: 'I can give a hint, check a final answer, or explain the task. What would help?',
      you: 'You',
      plan: 'Plan',
      weekPlan: 'This week',
      planShared: 'Shared plan — you and your parent see the same thing',
      planSharedParent: 'Shared plan — your child sees exactly this',
      planEmpty: 'No accepted plan yet. The companion can draft one; a parent accepts it.',
      planDraftPending: 'A draft plan is waiting for a parent’s decision.',
      planDeclined: 'The last draft was declined by your parent.',
      planAccepted: 'Plan accepted by your parent',
      planAcceptedParent: 'Accepted plan (accepted by you)',
      propose: 'Propose a change',
      proposeHelp: 'Your parent decides. They see your note word for word.',
      newDate: 'New date',
      why: 'Why',
      proposeSend: 'Send to parent',
      proposed: 'Proposal sent. Nothing changes until your parent decides.',
      proposal: 'Proposal',
      pstatus: { pending_parent: 'Waiting for parent', approved_by_parent: 'Approved by parent', declined_by_parent: 'Declined by parent' },
      approve: 'Approve',
      decline: 'Decline',
      seeK2: 'Your grown-up can see what you did today, what you type or write on the board, and if you asked for help.',
      see35: 'Your parent can see your plan, each task’s status, how many hints you asked for, this board (what you write on it) and everything you type to the companion — including the sample turns. The turn list shows exactly what they see.',
      see68: 'Your parent can see your plan, task status, hint counts, the board (including what you write on it) and every turn here — the sample turns and what you type to the companion. Your proposals go to your parent to decide. The turn list shows exactly what they see.',
      seeTitle: 'What your parent sees',
      scaffoldLabel: 'Grown-up scaffold — a way to count, not the answer',
      tenframeLabel: (a, b) => (a + b > 10
        ? `${a} + ${b}: ${a} first, then ${b} more. The first ten frame is full; ${a + b - 10} more in the second frame.`
        : `${a} + ${b}: ${a} first, then ${b} more, in one ten frame.`),
      ledger: 'Learning ledger',
      ledgerNote: 'What was reported or assisted versus independently checked. Nothing here is a mastery score.',
      lsubject: 'Subject',
      lwork: 'Work',
      levidence: 'Evidence',
      lhints: 'Hints',
      lcheck: 'Independent check',
      lstatus: { not_checked: 'Not independently checked', needs_independent_check: 'Needs independent check' },
      levid: { none: 'None yet', assisted_work: 'Self-report inside an assisted session' },
      lplanned: 'Planned: 48–72 h, then around day 7',
      lnone: '—',
      lorganized: 'Organized only — no instruction or assessment in this example',
      flags: 'Help-needed flags',
      noFlags: 'No flags right now.',
      hintFlag: (n, s) => `${n} hint${n === 1 ? '' : 's'} asked for in ${s}`,
      overview: 'Progress and status',
      workStatus: 'Work status',
      observe: 'Add what you noticed',
      observeHelp: 'Your observation is evidence with your name on it. It is not treated as verified mastery.',
      observeLabel: 'Observation',
      observePh: 'e.g. Explained the regrouping step at dinner without looking.',
      observeSave: 'Save observation',
      observeSaved: 'Observation saved as parent-reported, unverified.',
      observeEmpty: 'No observations yet.',
      obsPill: 'Parent-reported · not verified',
      feedback: 'Teacher feedback',
      feedbackHelp: 'Sample-only intake: this prototype loads one synthetic teacher note. It does not read a school account, accept pasted notes, or take any real student information.',
      loadSample: 'Load sample teacher note',
      extracted: 'Extracted task — needs your review',
      extractedHelp: 'The companion read the note and proposed a task and deadline. Check it; correct the date if the teacher changed it. The date you confirm becomes the shared deadline your child sees.',
      dueDate: 'Deadline',
      confirm: 'Confirm as shown',
      saveFix: 'Save correction',
      confirmed: 'Confirmed by parent',
      corrected: (f, t) => `Deadline corrected by parent: ${f} → ${t}`,
      extractSaved: 'Extracted task confirmed. The shared deadline now matches.',
      draft: 'Draft plan',
      draftHelp: 'The companion drafts academic admin: a short plan from the confirmed task and its deadline. It does not do the student’s thinking or contact anyone.',
      draftAsk: 'Ask for a draft plan',
      draftNeedsExtract: 'Confirm the extracted task first.',
      draftPending: 'Draft — waiting for your decision',
      draftAccept: 'Accept plan',
      draftDecline: 'Decline',
      declineNote: 'Note for the companion (optional)',
      declinePh: 'e.g. Too much for a school night.',
      draftAccepted: 'Accepted by parent — now the current plan',
      draftDeclined: 'Declined by parent',
      draftAgain: 'Ask for another draft',
      draftAcceptedLive: 'Draft accepted. It is now the shared plan.',
      draftDeclinedLive: 'Draft declined. The current plan is unchanged.',
      draftAskedLive: 'Draft plan ready for your review.',
      replayTitle: 'Child’s work and turns',
      replayHelp: 'The board and the turns exactly as the student saw them, including scripted sample turns.',
      turnsEmpty: 'No turns yet in this session.',
      proposals: 'Student proposals',
      noProposals: 'No proposals.',
      companionDrawer: 'Companion and board',
      taskDrawer: 'Task details',
      foot: 'Spanish copy is draft product copy for review by a native speaker; it is not certified educational localization. Grade bands, voice behaviour and the learning ledger are design proposals, not validated claims.',
      wd: (iso) => fmtDate(iso, 'en-US')
    },
    es: {
      skip: 'Ir al escenario',
      brand: 'Compañero Académico',
      brandTag: 'Explorador de conceptos K–8 · prototipo de diseño',
      boundary: '<strong>Prototipo de diseño.</strong> Ejemplos sintéticos. No está conectado a ningún servicio de IA, cuenta escolar, micrófono ni estudiante real. Nada de lo que escribas se guarda.',
      explorer: 'Controles del explorador',
      concept: 'Concepto',
      conceptA: 'A · Primero el día',
      conceptB: 'B · Primero el espacio de trabajo',
      conceptC: 'C · Primero el plan compartido',
      conceptAnote: 'El concepto A es la opción propuesta: una sugerencia de diseño, no una decisión del propietario.',
      role: 'Ver como',
      student: 'Estudiante',
      parent: 'Madre/padre',
      band: 'Grados',
      K2: 'K–2',
      b35: 'Grados 3–5',
      b68: 'Grados 6–8',
      bandNote: 'Los grupos de grados son provisionales dentro de K–8. No se admite preescolar ni preparatoria.',
      lang: 'Idioma',
      en: 'English',
      es: 'Español',
      reset: 'Reiniciar ejemplo',
      resetDone: 'Ejemplo reiniciado. Se borró todo el progreso de muestra.',
      conceptSet: (c) => `Se muestra el concepto ${c}. El escenario se conserva.`,
      roleSet: (r) => `Ahora ves como ${r}. Es un cambio de demostración, no un control de acceso.`,
      bandSet: (b) => `Grados ${b}. Se cargó otro ejemplo sintético.`,
      langSet: 'Idioma: español. Lo que escribiste se conserva palabra por palabra; el texto generado se muestra en español.',
      sample: 'Muestra',
      parentEntered: 'Muestra ingresada por la familia',
      scripted: 'Demo guionizada',
      ai: 'Compañero de IA',
      today: 'Hoy',
      oneThing: 'Una sola cosa por hacer',
      due: 'Entrega',
      dueSource: { parent_corrected: 'fecha corregida por la familia', parent_confirmed: 'fecha confirmada por la familia', student_proposal_approved: 'fecha cambiada por una propuesta del estudiante aprobada' },
      sampleSaid: (d) => `La nota de muestra decía ${d}; la fecha compartida que se muestra aquí es la actual.`,
      planStale: (f, t) => `Este plan quedó desactualizado: la fecha cambió de ${f} a ${t}. Hace falta un nuevo borrador, que la familia acepta.`,
      draftStale: 'Desactualizado: la fecha cambió',
      pSuperseded: 'reemplazada por una corrección posterior de la familia',
      proposeNone: 'No hay nada que mover: todas tus tareas ya están hechas.',
      proposeInvalid: 'No se puede enviar esa propuesta. Elige una tarea que no esté hecha y una fecha válida.',
      proposeOpened: 'Formulario de propuesta abierto. Elige una tarea, una fecha nueva y el motivo; tu familia decide.',
      proposeClosed: 'Formulario de propuesta cerrado. No se envió nada.',
      proposalStale: 'Esa propuesta ya fue decidida.',
      actionUnavailable: 'Esa acción no está disponible ahora.',
      turnsDrawer: (n) => `Todos los turnos de esta sesión (${n})`,
      boardFor: (t) => `Pizarra compartida · ${t}`,
      subject: { math: 'Matemáticas', literacy: 'Lectura y escritura', science: 'Ciencias', history: 'Historia' },
      status: { not_started: 'Sin empezar', in_progress: 'En progreso', complete: 'Marcado como hecho (autoinforme)' },
      start: 'Empezar',
      cueReady: 'Listo', cueWorking: 'Trabajando', cueDone: 'Hecho',
      hint: 'Pedir una pista',
      done: 'Marcar como hecho',
      askAdult: 'Pedir ayuda a un adulto',
      adultAsked: 'Se avisó a un adulto. Tu familia verá este aviso.',
      helpFlag: 'Pidió ayuda a un adulto',
      nextStep: 'Siguiente paso',
      nextTask: (title) => `Siguiente: ${title}`,
      allDone: 'Eso es todo por hoy. Más adelante hay una comprobación breve; todavía nada cuenta como “dominado”.',
      doneNote: 'Marcado como hecho por el estudiante. Es un autoinforme dentro de una sesión con ayuda; la comprobación independiente viene después.',
      hintCount: (n) => (n === 1 ? '1 pista usada' : `${n} pistas usadas`),
      board: 'Pizarra compartida',
      boardNote: 'Los dos ven esta pizarra. Las pistas que agrega el compañero están resaltadas.',
      write: 'Escribir en la pizarra',
      writeHelp: 'Escribe un paso o una respuesta. El compañero solo revisa la respuesta final; nunca escribe tu respuesta por ti.',
      add: 'Agregar',
      companion: 'Compañero',
      caption0: 'Pulsa “Reproducir siguiente turno” para seguir un intercambio guionizado como texto (sin sonido), o escribe abajo.',
      play: 'Reproducir siguiente turno',
      replay: 'Repetir desde el inicio',
      endOfScript: 'Fin de la demo guionizada. Repite o sigue escribiendo.',
      scriptUnavailable: 'Demo guionizada no disponible: esta materia es solo de organización en este ejemplo, sin instrucción ni evaluación. Puedes seguir escribiendo abajo.',
      voiceLabel: 'La voz es una demostración guionizada en texto. No se usa micrófono, sonido ni servicio de voz.',
      micTry: 'Probar el micrófono (simulado)',
      micDenied: 'Micrófono bloqueado (simulado). Puedes seguir escribiendo o permitirlo.',
      micAllow: 'Permitir (simulado)',
      micKeepTyping: 'Seguir escribiendo',
      micRecovered: 'Micrófono permitido (simulado). En este prototipo la voz sigue siendo texto guionizado.',
      micIdle: 'Micrófono: no solicitado.',
      typed: 'Escríbele al compañero',
      typedHelp: 'Prueba “pista” o escribe tu respuesta.',
      send: 'Enviar',
      replyHint: (h) => `Una pista, no la respuesta: ${h}`,
      replyNoMoreHints: 'No tengo más pistas para esta. Prueba un paso en la pizarra y reviso tu respuesta final.',
      replyMatch: 'Coincide. Fue práctica con ayuda: márcalo como hecho cuando quieras; luego habrá una comprobación independiente breve, así que todavía nada cuenta como dominado.',
      replyNoMatch: 'Todavía no. Veamos juntos el último paso; pide una pista si quieres.',
      replyAmbiguous: 'Veo más de un número. ¿Cuál es tu respuesta final? Escribe solo esa.',
      replyUnparsed: 'Dejé ese paso en la pizarra. Solo puedo revisar una respuesta final escrita como número (o “x = …”), así que no lo marco como bien ni mal. Sigue.',
      replyLiteracy: 'Gracias. Lo dejé en la pizarra. No califico la escritura; en esta demo, tu familia puede ver esta pizarra y estos turnos.',
      replyOrganized: 'Esta tarea es solo de organización en este ejemplo: guardo su fecha y estado, pero no la enseño ni la reviso. Tu familia ve la misma lista.',
      replyDefault: 'Puedo darte una pista, revisar una respuesta final o explicar la tarea. ¿Qué te ayudaría?',
      you: 'Tú',
      plan: 'Plan',
      weekPlan: 'Esta semana',
      planShared: 'Plan compartido: tú y tu familia ven lo mismo',
      planSharedParent: 'Plan compartido: tu hijo/a ve exactamente esto',
      planEmpty: 'Aún no hay un plan aceptado. El compañero puede redactar uno; la familia lo acepta.',
      planDraftPending: 'Hay un borrador de plan esperando la decisión de la familia.',
      planDeclined: 'Tu familia rechazó el último borrador.',
      planAccepted: 'Plan aceptado por tu familia',
      planAcceptedParent: 'Plan aceptado (por ti)',
      propose: 'Proponer un cambio',
      proposeHelp: 'Tu familia decide. Verá tu nota palabra por palabra.',
      newDate: 'Nueva fecha',
      why: 'Motivo',
      proposeSend: 'Enviar a la familia',
      proposed: 'Propuesta enviada. Nada cambia hasta que tu familia decida.',
      proposal: 'Propuesta',
      pstatus: { pending_parent: 'Esperando a la familia', approved_by_parent: 'Aprobada por la familia', declined_by_parent: 'Rechazada por la familia' },
      approve: 'Aprobar',
      decline: 'Rechazar',
      seeK2: 'Tu adulto puede ver lo que hiciste hoy, lo que escribes o pones en la pizarra, y si pediste ayuda.',
      see35: 'Tu familia puede ver tu plan, el estado de cada tarea, cuántas pistas pediste, esta pizarra (lo que escribes en ella) y todo lo que le escribes al compañero, incluidos los turnos de muestra. La lista de turnos muestra exactamente lo que ellos ven.',
      see68: 'Tu familia puede ver tu plan, el estado de las tareas, las pistas, la pizarra (incluido lo que escribes en ella) y todos los turnos: los de muestra y lo que le escribes al compañero. Tus propuestas van a tu familia para que decida. La lista de turnos muestra exactamente lo que ellos ven.',
      seeTitle: 'Lo que ve tu familia',
      scaffoldLabel: 'Apoyo del adulto: una forma de contar, no la respuesta',
      tenframeLabel: (a, b) => (a + b > 10
        ? `${a} + ${b}: primero ${a}, luego ${b} más. El primer marco de diez está lleno; ${a + b - 10} más en el segundo marco.`
        : `${a} + ${b}: primero ${a}, luego ${b} más, en un solo marco de diez.`),
      ledger: 'Registro de aprendizaje',
      ledgerNote: 'Lo que fue informado o asistido frente a lo comprobado de forma independiente. Nada aquí es una puntuación de dominio.',
      lsubject: 'Materia',
      lwork: 'Trabajo',
      levidence: 'Evidencia',
      lhints: 'Pistas',
      lcheck: 'Comprobación independiente',
      lstatus: { not_checked: 'Sin comprobación independiente', needs_independent_check: 'Necesita comprobación independiente' },
      levid: { none: 'Todavía ninguna', assisted_work: 'Autoinforme dentro de una sesión con ayuda' },
      lplanned: 'Planificada: 48–72 h y cerca del día 7',
      lnone: '—',
      lorganized: 'Solo organización: sin instrucción ni evaluación en este ejemplo',
      flags: 'Avisos de ayuda',
      noFlags: 'No hay avisos por ahora.',
      hintFlag: (n, s) => `${n} pista${n === 1 ? '' : 's'} pedida${n === 1 ? '' : 's'} en ${s}`,
      overview: 'Progreso y estado',
      workStatus: 'Estado del trabajo',
      observe: 'Agrega lo que notaste',
      observeHelp: 'Tu observación es evidencia con tu nombre. No se trata como dominio verificado.',
      observeLabel: 'Observación',
      observePh: 'p. ej. Explicó el paso de reagrupar en la cena sin mirar.',
      observeSave: 'Guardar observación',
      observeSaved: 'Observación guardada como informada por la familia, sin verificar.',
      observeEmpty: 'Aún no hay observaciones.',
      obsPill: 'Informado por la familia · sin verificar',
      feedback: 'Comentarios del maestro',
      feedbackHelp: 'Entrada solo de muestra: este prototipo carga una nota de maestro sintética. No lee una cuenta escolar, no acepta notas pegadas ni recibe datos reales de estudiantes.',
      loadSample: 'Cargar nota de maestro de muestra',
      extracted: 'Tarea extraída: necesita tu revisión',
      extractedHelp: 'El compañero leyó la nota y propuso una tarea y una fecha. Revísala; corrige la fecha si el maestro la cambió. La fecha que confirmes será la fecha compartida que ve tu hijo/a.',
      dueDate: 'Fecha de entrega',
      confirm: 'Confirmar tal cual',
      saveFix: 'Guardar corrección',
      confirmed: 'Confirmada por la familia',
      corrected: (f, t) => `Fecha corregida por la familia: ${f} → ${t}`,
      extractSaved: 'Tarea extraída confirmada. La fecha compartida ya coincide.',
      draft: 'Borrador de plan',
      draftHelp: 'El compañero redacta la administración académica: un plan breve a partir de la tarea confirmada y su fecha. No hace el razonamiento del estudiante ni contacta a nadie.',
      draftAsk: 'Pedir un borrador de plan',
      draftNeedsExtract: 'Primero confirma la tarea extraída.',
      draftPending: 'Borrador: esperando tu decisión',
      draftAccept: 'Aceptar plan',
      draftDecline: 'Rechazar',
      declineNote: 'Nota para el compañero (opcional)',
      declinePh: 'p. ej. Es demasiado para una noche de escuela.',
      draftAccepted: 'Aceptado por la familia: ahora es el plan actual',
      draftDeclined: 'Rechazado por la familia',
      draftAgain: 'Pedir otro borrador',
      draftAcceptedLive: 'Borrador aceptado. Ahora es el plan compartido.',
      draftDeclinedLive: 'Borrador rechazado. El plan actual no cambia.',
      draftAskedLive: 'Borrador de plan listo para tu revisión.',
      replayTitle: 'Trabajo y turnos del estudiante',
      replayHelp: 'La pizarra y los turnos tal como los vio el estudiante, incluidos los turnos de muestra guionizados.',
      turnsEmpty: 'Todavía no hay turnos en esta sesión.',
      proposals: 'Propuestas del estudiante',
      noProposals: 'No hay propuestas.',
      companionDrawer: 'Compañero y pizarra',
      taskDrawer: 'Detalles de la tarea',
      foot: 'El texto en español es un borrador para revisión por un hablante nativo; no es una localización educativa certificada. Los grupos de grados, el comportamiento de voz y el registro de aprendizaje son propuestas de diseño, no afirmaciones validadas.',
      wd: (iso) => fmtDate(iso, 'es')
    }
  };

  // Task copy per locale. Numbers were checked by calculation (evidence/math-check.log).
  // `check` describes the only final-answer forms the companion can verify (model.checkFinalAnswer).
  const TASKS = {
    en: {
      'k2-math-add': { title: 'Add 7 + 5', short: 'Add 7 + 5', kind: 'tenframe', problem: '7 + 5 = ?', a: 7, b: 5, check: { answer: 12, expr: '7 + 5' }, hints: ['Fill the ten frame: 7 first, then 5 more. How many make 10?', 'The first frame is full — that’s ten. Count the extra boxes in the second frame, then count on from ten.'], scaffold: 'With a grown-up: point to each box and count on from seven together.' },
      'k2-read-sounds': { title: 'Say the sounds in “ship”', short: 'Sounds in “ship”', kind: 'sounds', word: 'ship', boxes: ['sh', 'i', 'p'], hints: ['Tap each box and say one sound: /sh/ … /i/ … /p/.', 'Now say them fast together.'], scaffold: 'A grown-up says the word slowly first.' },
      '35-math-regroup': { title: 'Subtract 403 − 178', short: '403 − 178', kind: 'math', problem: '403 − 178 = ?', check: { answer: 225, expr: '403 − 178' }, hints: ['You can’t take 8 from 3. Regroup: borrow a ten, so 3 becomes 13. There are no tens, so take from the hundreds first: 4 hundreds → 3 hundreds, 0 tens → 9 tens.', 'Now: 13 − 8 = 5, 9 − 7 = 2, 3 − 1 = 2.'], explain: 'Regrouping means trading one place for ten of the next place down.' },
      '35-read-summary': { title: 'Write a 3-sentence summary of chapter 4', short: 'Chapter 4 summary', kind: 'reading', passage: 'Sample passage (synthetic): Rosa found the lost map under the porch. She wanted to keep it secret, but her brother had already seen her. By morning, the whole street knew.', scaffold: ['Who?', 'What changed?', 'Why does it matter?'], hints: ['Start with who and what changed.', 'The last sentence says why it matters — don’t rush it.'], explain: 'A summary keeps the main events and drops the details.' },
      '35-science-habitat': { title: 'Habitat poster: list 3 animals', short: 'Habitat poster', kind: 'organized' },
      '68-math-equation': { title: 'Solve 3x + 7 = 25', short: '3x + 7 = 25', kind: 'math', problem: '3x + 7 = 25', check: { answer: 6, variable: 'x' }, hints: ['Undo the +7 first, on both sides: 3x = 18.', 'Now divide both sides by 3.'], explain: 'Undo operations in reverse order: subtraction before division here.' },
      '68-essay-claim': { title: 'Draft a claim for the essay on school start times', short: 'Essay claim', kind: 'writing', scaffold: ['Claim (take a side)', 'because…', 'Evidence I could use'], hints: ['A claim takes a side someone could disagree with.', 'Add one “because” — the reason is the part you’ll have to back up.'], explain: 'The claim is one sentence; evidence comes next week.' },
      '68-history-timeline': { title: 'Timeline: 5 events of the Revolution', short: 'History timeline', kind: 'organized' }
    },
    es: {
      'k2-math-add': { title: 'Suma 7 + 5', short: 'Suma 7 + 5', kind: 'tenframe', problem: '7 + 5 = ?', a: 7, b: 5, check: { answer: 12, expr: '7 + 5' }, hints: ['Llena el marco de diez: primero 7, luego 5 más. ¿Cuántos hacen 10?', 'El primer marco está lleno: son diez. Cuenta las casillas extra del segundo marco y sigue contando desde diez.'], scaffold: 'Con un adulto: señalen cada casilla y cuenten juntos a partir de siete.' },
      'k2-read-sounds': { title: 'Di los sonidos de “sol”', short: 'Sonidos de “sol”', kind: 'sounds', word: 'sol', boxes: ['s', 'o', 'l'], hints: ['Toca cada casilla y di un sonido: /s/ … /o/ … /l/.', 'Ahora dilos rápido, juntos.'], scaffold: 'Un adulto dice la palabra despacio primero.' },
      '35-math-regroup': { title: 'Resta 403 − 178', short: '403 − 178', kind: 'math', problem: '403 − 178 = ?', check: { answer: 225, expr: '403 − 178' }, hints: ['No puedes quitar 8 de 3. Reagrupa: pide una decena y el 3 se vuelve 13. No hay decenas, así que toma primero de las centenas: 4 centenas → 3 centenas, 0 decenas → 9 decenas.', 'Ahora: 13 − 8 = 5, 9 − 7 = 2, 3 − 1 = 2.'], explain: 'Reagrupar es cambiar una unidad de un lugar por diez del lugar siguiente.' },
      '35-read-summary': { title: 'Escribe un resumen de 3 oraciones del capítulo 4', short: 'Resumen del capítulo 4', kind: 'reading', passage: 'Pasaje de muestra (sintético): Rosa encontró el mapa perdido debajo del porche. Quería guardar el secreto, pero su hermano ya la había visto. Por la mañana, toda la calle lo sabía.', scaffold: ['¿Quién?', '¿Qué cambió?', '¿Por qué importa?'], hints: ['Empieza con quién y qué cambió.', 'La última oración dice por qué importa; no la apures.'], explain: 'Un resumen conserva los hechos principales y deja fuera los detalles.' },
      '35-science-habitat': { title: 'Cartel del hábitat: nombra 3 animales', short: 'Cartel del hábitat', kind: 'organized' },
      '68-math-equation': { title: 'Resuelve 3x + 7 = 25', short: '3x + 7 = 25', kind: 'math', problem: '3x + 7 = 25', check: { answer: 6, variable: 'x' }, hints: ['Deshaz primero el +7, en los dos lados: 3x = 18.', 'Ahora divide los dos lados entre 3.'], explain: 'Deshaz las operaciones en orden inverso: aquí, la resta antes que la división.' },
      '68-essay-claim': { title: 'Redacta la tesis del ensayo sobre la hora de entrada a la escuela', short: 'Tesis del ensayo', kind: 'writing', scaffold: ['Tesis (toma una postura)', 'porque…', 'Evidencia que podría usar'], hints: ['Una tesis toma una postura con la que alguien podría no estar de acuerdo.', 'Agrega un “porque”: la razón es lo que tendrás que respaldar.'], explain: 'La tesis es una sola oración; la evidencia viene la próxima semana.' },
      '68-history-timeline': { title: 'Línea de tiempo: 5 hechos de la Revolución', short: 'Línea de tiempo', kind: 'organized' }
    }
  };

  // Sample teacher notes, labelled parent-entered. Never fetched.
  const NOTES = {
    en: {
      K2: 'Mia is counting confidently. Please practice the sounds in short words at home this week. Reading check Friday.',
      35: 'Reminder: the chapter 4 summary is due Friday, Oct 2. Several students are rushing the ending — slow down on the last sentence.',
      68: 'Essay claim drafts are due Friday. We will workshop them in class on Monday.'
    },
    es: {
      K2: 'Mia cuenta con confianza. Practiquen en casa los sonidos de palabras cortas esta semana. Revisión de lectura el viernes.',
      35: 'Recordatorio: el resumen del capítulo 4 se entrega el viernes 2 de octubre. Varios estudiantes apuran el final; despacio con la última oración.',
      68: 'Los borradores de la tesis del ensayo se entregan el viernes. Los trabajaremos en clase el lunes.'
    }
  };

  // Plan item copy, keyed by task and item key. The model stores keys + dates
  // (model.derivePlanItems); the text is rendered here in the selected locale, from
  // the confirmed deadline — never from a hardcoded weekday.
  const PLAN_COPY = {
    en: {
      'k2-read-sounds': {
        tonight: () => 'Tonight: say the sounds in 3 short words with a grown-up (5 min)',
        midway: (p, wd) => `${wd(p.date)}: read one page together`,
        due: (p, wd) => `${wd(p.due)}: reading check at school (confirmed deadline)`
      },
      '35-read-summary': {
        tonight: () => 'Tonight: reread the chapter 4 ending (10 min)',
        midway: (p, wd) => `${wd(p.date)}: write the 3-sentence summary with the who / what changed / why scaffold`,
        due: (p, wd) => `${wd(p.due)}: a parent reads the summary, then turn it in (confirmed deadline)`
      },
      '68-essay-claim': {
        tonight: () => 'Tonight: draft the claim (15 min)',
        midway: (p, wd) => `${wd(p.date)}: find two pieces of evidence`,
        due: (p, wd) => `${wd(p.due)}: turn in the claim draft (confirmed deadline); the class workshop follows`
      }
    },
    es: {
      'k2-read-sounds': {
        tonight: () => 'Esta noche: decir los sonidos de 3 palabras cortas con un adulto (5 min)',
        midway: (p, wd) => `${wd(p.date)}: leer una página juntos`,
        due: (p, wd) => `${wd(p.due)}: revisión de lectura en la escuela (fecha confirmada)`
      },
      '35-read-summary': {
        tonight: () => 'Esta noche: releer el final del capítulo 4 (10 min)',
        midway: (p, wd) => `${wd(p.date)}: escribir el resumen de 3 oraciones con la guía quién / qué cambió / por qué`,
        due: (p, wd) => `${wd(p.due)}: un adulto lee el resumen y luego se entrega (fecha confirmada)`
      },
      '68-essay-claim': {
        tonight: () => 'Esta noche: redactar la tesis (15 min)',
        midway: (p, wd) => `${wd(p.date)}: buscar dos evidencias`,
        due: (p, wd) => `${wd(p.due)}: entregar el borrador de la tesis (fecha confirmada); después viene el taller en clase`
      }
    }
  };

  // Scripted voice turns, keyed by task so the demo follows the selected task.
  // `hint` adds a highlighted board step and records AI assistance; `step` adds a
  // scripted student step. Deterministic text; nothing is recognised or synthesised.
  // Organized-only tasks have no script: the demo is disabled with a notice.
  const VOICE = {
    en: {
      'k2-math-add': [
        { who: 'companion', text: 'Hi Mia. One thing today: 7 plus 5. Want to use the ten frames?' },
        { who: 'student', text: 'Yes.' },
        { who: 'companion', text: 'Fill 7 first. Then 5 more. How many make ten?', hint: 0 },
        { who: 'student', text: 'Ten… and two more. Twelve!', step: '7 + 5 = 12' },
        { who: 'companion', text: 'You said twelve. Press the big “done” button when you want, or ask a grown-up to check with you.' }
      ],
      'k2-read-sounds': [
        { who: 'companion', text: 'Hi Mia. Let’s say the sounds in “ship”. Ready?' },
        { who: 'student', text: 'Ready.' },
        { who: 'companion', text: 'Tap each box and say one sound: /sh/ … /i/ … /p/.', hint: 0 },
        { who: 'student', text: '/sh/ … /i/ … /p/.', step: 'sh · i · p' },
        { who: 'companion', text: 'You said all three sounds. Now say them fast together, and ask a grown-up to listen with you.' }
      ],
      '35-math-regroup': [
        { who: 'companion', text: 'Hi Sam. Today’s one thing is 403 minus 178. Want to start on the board?' },
        { who: 'student', text: 'Yeah. I don’t know how to take 8 from 3.' },
        { who: 'companion', text: 'Good question. You can regroup: borrow a ten, so 3 becomes 13.', hint: 0 },
        { who: 'student', text: 'Thirteen minus eight is five.', step: '13 − 8 = 5' },
        { who: 'companion', text: 'Right. Keep going with the tens — I’ll stay quiet unless you ask.' }
      ],
      '35-read-summary': [
        { who: 'companion', text: 'Hi Sam. Today’s one thing is the chapter 4 summary: three sentences. Want to start with who and what changed?' },
        { who: 'student', text: 'Rosa found the map. Is that the “who”?' },
        { who: 'companion', text: 'Yes. Start with who and what changed; keep the main event and drop the small details.', hint: 0 },
        { who: 'student', text: 'Rosa found the lost map under the porch, but her brother saw her.', step: 'Rosa found the lost map under the porch, but her brother saw her.' },
        { who: 'companion', text: 'Good start. Your last sentence should say why it matters — don’t rush it. I don’t grade writing; your parent can see this board.' }
      ],
      '68-math-equation': [
        { who: 'companion', text: 'Hey Jordan. 3x plus 7 equals 25 is first. Essay claim after, if you want.' },
        { who: 'student', text: 'Do I divide first?' },
        { who: 'companion', text: 'Undo in reverse order: the plus 7 goes first, on both sides.', hint: 0 },
        { who: 'student', text: 'So 3x equals 18… x is 6.', step: '3x = 18 → x = 6' },
        { who: 'companion', text: 'That matches. Mark it done when you’re ready — a short check is planned later, so nothing counts as mastered yet.' }
      ],
      '68-essay-claim': [
        { who: 'companion', text: 'Hey Jordan. Essay claim today: one sentence that takes a side on school start times.' },
        { who: 'student', text: 'Can I just say start times matter?' },
        { who: 'companion', text: 'Someone has to be able to disagree with it. Take a side.', hint: 0 },
        { who: 'student', text: 'School should start later because teens need more sleep.', step: 'School should start later because teens need more sleep.' },
        { who: 'companion', text: 'That’s a claim with a “because”. Evidence comes next week. I don’t grade writing; your parent can see this draft here.' }
      ]
    },
    es: {
      'k2-math-add': [
        { who: 'companion', text: 'Hola, Mia. Hoy una sola cosa: 7 más 5. ¿Usamos los marcos de diez?' },
        { who: 'student', text: 'Sí.' },
        { who: 'companion', text: 'Llena 7 primero. Luego 5 más. ¿Cuántos hacen diez?', hint: 0 },
        { who: 'student', text: 'Diez… y dos más. ¡Doce!', step: '7 + 5 = 12' },
        { who: 'companion', text: 'Dijiste doce. Pulsa el botón grande de “hecho” cuando quieras, o pide a un adulto que lo revise contigo.' }
      ],
      'k2-read-sounds': [
        { who: 'companion', text: 'Hola, Mia. Vamos a decir los sonidos de “sol”. ¿Lista?' },
        { who: 'student', text: 'Lista.' },
        { who: 'companion', text: 'Toca cada casilla y di un sonido: /s/ … /o/ … /l/.', hint: 0 },
        { who: 'student', text: '/s/ … /o/ … /l/.', step: 's · o · l' },
        { who: 'companion', text: 'Dijiste los tres sonidos. Ahora dilos rápido, juntos, y pide a un adulto que te escuche.' }
      ],
      '35-math-regroup': [
        { who: 'companion', text: 'Hola, Sam. Lo de hoy es 403 menos 178. ¿Empezamos en la pizarra?' },
        { who: 'student', text: 'Sí. No sé cómo quitar 8 de 3.' },
        { who: 'companion', text: 'Buena pregunta. Puedes reagrupar: pide una decena y el 3 se vuelve 13.', hint: 0 },
        { who: 'student', text: 'Trece menos ocho es cinco.', step: '13 − 8 = 5' },
        { who: 'companion', text: 'Bien. Sigue con las decenas; me quedo callado a menos que me preguntes.' }
      ],
      '35-read-summary': [
        { who: 'companion', text: 'Hola, Sam. Lo de hoy es el resumen del capítulo 4: tres oraciones. ¿Empezamos con quién y qué cambió?' },
        { who: 'student', text: 'Rosa encontró el mapa. ¿Eso es el “quién”?' },
        { who: 'companion', text: 'Sí. Empieza con quién y qué cambió; conserva el hecho principal y deja fuera los detalles pequeños.', hint: 0 },
        { who: 'student', text: 'Rosa encontró el mapa perdido debajo del porche, pero su hermano la vio.', step: 'Rosa encontró el mapa perdido debajo del porche, pero su hermano la vio.' },
        { who: 'companion', text: 'Buen comienzo. La última oración debe decir por qué importa; no la apures. No califico la escritura; tu familia puede ver esta pizarra.' }
      ],
      '68-math-equation': [
        { who: 'companion', text: 'Hola, Jordan. Primero 3x más 7 igual a 25. Después la tesis del ensayo, si quieres.' },
        { who: 'student', text: '¿Divido primero?' },
        { who: 'companion', text: 'Deshaz en orden inverso: primero el más 7, en los dos lados.', hint: 0 },
        { who: 'student', text: 'Entonces 3x es 18… x es 6.', step: '3x = 18 → x = 6' },
        { who: 'companion', text: 'Coincide. Márcalo como hecho cuando quieras; luego hay una comprobación breve, así que todavía nada cuenta como dominado.' }
      ],
      '68-essay-claim': [
        { who: 'companion', text: 'Hola, Jordan. Hoy la tesis del ensayo: una oración que tome una postura sobre la hora de entrada a la escuela.' },
        { who: 'student', text: '¿Puedo decir solo que la hora de entrada importa?' },
        { who: 'companion', text: 'Alguien tiene que poder no estar de acuerdo. Toma una postura.', hint: 0 },
        { who: 'student', text: 'La escuela debería empezar más tarde porque los adolescentes necesitan dormir más.', step: 'La escuela debería empezar más tarde porque los adolescentes necesitan dormir más.' },
        { who: 'companion', text: 'Eso es una tesis con un “porque”. La evidencia viene la próxima semana. No califico la escritura; tu familia puede ver este borrador aquí.' }
      ]
    }
  };

  // ----------------------------------------------------------------- state --

  // sessions[taskId] = { turn, turns }. A turn is either { who:'student', text } (verbatim,
  // person-authored), { who, scripted:true, taskId, index } or { who:'companion', gen:{kind,…} }.
  // board[taskId] = steps: { from:'student', text } | { from:'hint', hintIndex } (a hint the child
  // asked for) | { from:'hint'|'student', scriptIndex, provenance:'scripted_demo' } (a scripted
  // demo step, recorded once per script step, so replays never duplicate it).
  const ui = {
    concept: 'A',
    role: 'student',
    mic: 'idle',
    sessions: {},
    board: {},
    fields: {},
    sampleLoaded: false,
    helpFlags: {},
    proposeOpen: false,
    proposeError: '',
    turnsOpen: false,
    companionOpen: true,
    focusNext: null,
    lastError: null
  };
  let state = M.loadExample({ locale: 'en', band: '35' });

  function freshUi() {
    Object.assign(ui, { sessions: {}, board: {}, fields: {}, sampleLoaded: false, helpFlags: {}, proposeOpen: false, proposeError: '', turnsOpen: false, companionOpen: true, mic: 'idle' });
  }

  // Typed hint requests: a small, deterministic list of exact short phrases (EN/ES, either
  // locale, punctuation and case ignored). Anything else is ordinary prose and stays the
  // student's own turn. This is a command matcher, not language understanding.
  const HINT_REQUESTS = [
    'hint', 'a hint', 'hint please', 'give me a hint', 'can i have a hint', 'i need a hint', 'help', 'help me', 'i need help', 'can you help', 'can you help me',
    'pista', 'una pista', 'pista por favor', 'dame una pista', 'me das una pista', 'necesito una pista', 'ayuda', 'ayúdame', 'ayudame', 'necesito ayuda', 'me ayudas'
  ];
  function isHintRequest(text) {
    const n = String(text).toLowerCase().replace(/[¿?¡!.,;:]/g, ' ').replace(/\s+/g, ' ').trim();
    return HINT_REQUESTS.includes(n);
  }

  // -------------------------------------------------------------- helpers --

  function e(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function fmtDate(iso, locale) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(y, m - 1, d));
  }
  function S() { return STR[state.settings.locale]; }
  function task(id) { return TASKS[state.settings.locale][id]; }
  function focusTask() { return state.tasks.find((t) => t.id === state.focusTaskId); }
  function script(id) { return VOICE[state.settings.locale][id] || null; }
  function session(id = state.focusTaskId) {
    if (!ui.sessions[id]) ui.sessions[id] = { turn: 0, turns: [] };
    return ui.sessions[id];
  }
  function steps(id) { return ui.board[id] || []; }
  function pushStep(id, step) { ui.board[id] = [...steps(id), step]; }
  // Only hints the child asked for count; scripted demo assistance has its own kind.
  function hintsUsed() { return M.hintsRequested(state); }
  function announce(text) { live.textContent = ''; setTimeout(() => { live.textContent = text; }, 30); }
  function bandLabel(b) { return b === 'K2' ? S().K2 : b === '35' ? S().b35 : S().b68; }
  function dueLabel(t) {
    const s = S();
    const src = t.dueSource && s.dueSource[t.dueSource] ? ` (${s.dueSource[t.dueSource]})` : '';
    return `${s.due}: ${s.wd(t.due)}${src}`;
  }

  // Render stored evidence in the current locale. Person-authored text is returned verbatim.
  function stepText(id, x) {
    if (x.text !== undefined) return x.text;
    if (x.hintIndex !== undefined) return (task(id).hints || [])[x.hintIndex] || '';
    if (x.scriptIndex !== undefined) { const sc = script(id); return sc && sc[x.scriptIndex] ? sc[x.scriptIndex].step || '' : ''; }
    return '';
  }
  function genText(g, id) {
    const s = S();
    const c = task(id);
    switch (g.kind) {
      case 'hint': return s.replyHint((c.hints || [])[g.n] || '');
      case 'noMoreHints': return s.replyNoMoreHints;
      case 'match': return s.replyMatch;
      case 'mismatch': return s.replyNoMatch;
      case 'ambiguous': return s.replyAmbiguous;
      case 'unparsed': return s.replyUnparsed;
      case 'literacy': return s.replyLiteracy;
      case 'organized': return s.replyOrganized;
      default: return s.replyDefault;
    }
  }
  function turnText(t, id) {
    if (t.text !== undefined) return t.text;
    if (t.scripted) { const sc = script(t.taskId || id); return sc && sc[t.index] ? sc[t.index].text : ''; }
    if (t.gen) return genText(t.gen, t.taskId || id);
    return '';
  }
  function turnsView(id = state.focusTaskId) {
    return session(id).turns.map((t) => ({ who: t.who, text: turnText(t, id), scripted: !!t.scripted, authored: t.text !== undefined }));
  }
  function planItemText(item) {
    if (typeof item === 'string') return item;
    const s = S();
    const copy = (PLAN_COPY[state.settings.locale][item.taskId] || {})[item.key];
    if (copy) return copy(item, s.wd);
    return `${s.wd(item.date || item.due)}: ${task(item.taskId).short}`;
  }

  function btn(act, label, opts = {}) {
    const cls = ['btn', opts.cls || ''].join(' ').trim();
    const arg = opts.arg !== undefined ? ` data-arg="${e(opts.arg)}"` : '';
    const dis = opts.disabled ? ' disabled' : '';
    const glyph = opts.glyph ? `<span class="glyph" aria-hidden="true">${opts.glyph}</span>` : '';
    return `<button type="button" class="${cls}" data-act="${act}"${arg}${dis}>${glyph}${e(label)}</button>`;
  }
  function seg(name, legend, options, current, act) {
    const buttons = options.map(([val, label]) =>
      `<button type="button" data-act="${act}" data-arg="${val}" aria-pressed="${current === val}">${e(label)}</button>`).join('');
    return `<fieldset><legend>${e(legend)}</legend><div class="seg" role="group" aria-label="${e(legend)}">${buttons}</div></fieldset>`;
  }

  // -------------------------------------------------------------- render --

  function render() {
    const s = S();
    const focusKey = (() => {
      const a = document.activeElement;
      if (!a || a === document.body || !app.contains(a)) return null;
      const panel = a.closest('section[aria-labelledby]');
      const key = { panel: panel ? panel.getAttribute('aria-labelledby') : null };
      if (a.dataset && a.dataset.act) return { ...key, act: a.dataset.act, arg: a.dataset.arg };
      if (a.id) return { ...key, id: a.id };
      return key.panel ? key : null;
    })();

    document.documentElement.lang = state.settings.locale;
    document.title = `${s.brand} · ${s.brandTag}`;
    app.dataset.concept = ui.concept;
    app.dataset.role = ui.role;
    app.dataset.band = state.settings.band;
    app.dataset.lang = state.settings.locale;

    document.querySelector('.skip').textContent = s.skip;
    document.getElementById('boundary').innerHTML = s.boundary;
    document.getElementById('brand-name').textContent = s.brand;
    document.getElementById('brand-tag').textContent = s.brandTag;
    document.getElementById('explorer-title').textContent = s.explorer;
    document.getElementById('explorer').innerHTML = [
      `<h2 id="explorer-title" class="sr-only">${e(s.explorer)}</h2>`,
      seg('concept', s.concept, [['A', s.conceptA], ['B', s.conceptB], ['C', s.conceptC]], ui.concept, 'concept'),
      seg('role', s.role, [['student', s.student], ['parent', s.parent]], ui.role, 'role'),
      seg('band', s.band, [['K2', s.K2], ['35', s.b35], ['68', s.b68]], state.settings.band, 'band'),
      seg('lang', s.lang, [['en', s.en], ['es', s.es]], state.settings.locale, 'lang'),
      btn('reset', s.reset, { cls: 'reset quiet' })
    ].join('');
    document.getElementById('foot').innerHTML = `<p>${e(s.foot)}</p><p>${e(s.bandNote)} ${e(s.conceptAnote)}</p>`;

    main.innerHTML = ui.role === 'student' ? renderStudent() : renderParent();

    focusAfterRender(focusKey);
    syncBannerHeight();
  }

  // After a state change the stage is rebuilt. Focus goes, in order, to: the successor the
  // action named (ui.focusNext, first candidate that exists and is enabled), the same control
  // if it still exists, else the heading of the panel the activated control lived in. The
  // initial render touches nothing (focusKey is null and no successor is set).
  function focusAfterRender(focusKey) {
    const candidates = [].concat(ui.focusNext || []).map((sel) => ({ sel, successor: true }));
    ui.focusNext = null;
    if (focusKey) {
      if (focusKey.id) candidates.push({ sel: `#${CSS.escape(focusKey.id)}` });
      else if (focusKey.act) candidates.push({ sel: `[data-act="${focusKey.act}"]${focusKey.arg !== undefined ? `[data-arg="${focusKey.arg}"]` : ':not([data-arg])'}` });
      if (focusKey.panel) candidates.push({ sel: `#${CSS.escape(focusKey.panel)}`, successor: true });
    }
    for (const c of candidates) {
      const el = app.querySelector(c.sel);
      if (!el || el.disabled) continue;
      if (el.tabIndex < 0 && !el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
      el.focus({ preventScroll: !c.successor });
      if (document.activeElement === el) return;
    }
  }

  // The sticky prototype boundary must never cover a focused control or a scroll target. Its
  // real height (it wraps differently per width, locale and K–2 sizing) becomes the document's
  // scroll padding through a custom property, written to a constructed stylesheet (CSSOM): no
  // inline style attribute or <style> element is ever generated, so the strict CSP stays intact.
  const boundaryEl = document.getElementById('boundary');
  const bannerSheet = (() => {
    try { const sheet = new CSSStyleSheet(); sheet.replaceSync(':root{--banner-h:4rem}'); document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet]; return sheet; } catch { return null; }
  })();
  function syncBannerHeight() {
    if (bannerSheet) bannerSheet.replaceSync(`:root{--banner-h:${Math.ceil(boundaryEl.getBoundingClientRect().height)}px}`);
  }

  // ---- shared blocks ----

  function turnsList(id, whoStudent) {
    const s = S();
    // The list scrolls when long: tabindex="0" keeps every turn reachable by keyboard.
    return `<ol class="turns" tabindex="0" aria-label="${e(s.companion)}">${turnsView(id).map((t) => `<li class="turn" data-who="${t.who}"><span class="who">${e(t.who === 'companion' ? s.ai : whoStudent)}${t.scripted ? ` · ${e(s.scripted)}` : ''}</span><span>${e(t.text)}</span></li>`).join('')}</ol>`;
  }

  function blockCompanion(compact) {
    const s = S();
    const id = state.focusTaskId;
    const sc = script(id);
    const ses = session(id);
    const view = turnsView(id);
    const last = view[view.length - 1];
    const caption = last
      ? `<p class="caption" data-who="${last.who}">${e(last.text)}</p>`
      : `<p class="caption" data-who="none">${e(s.caption0)}</p>`;
    // Compact compositions (B, C) keep the complete history in a labelled drawer so the child
    // can review exactly what the parent's replay shows; its open state survives rerenders.
    const turns = !view.length ? '' : compact
      ? `<details class="turns-drawer"${ui.turnsOpen ? ' open' : ''}><summary>${e(s.turnsDrawer(view.length))}</summary>${turnsList(id, s.you)}</details>`
      : turnsList(id, s.you);
    const unavailable = sc ? '' : `<p class="notice" role="status">${e(s.scriptUnavailable)}</p>`;
    const micText = ui.mic === 'denied' ? s.micDenied : ui.mic === 'recovered' ? s.micRecovered : s.micIdle;
    const micActions = ui.mic === 'denied'
      ? btn('mic-allow', s.micAllow, { cls: 'primary' }) + btn('mic-type', s.micKeepTyping)
      : ui.mic === 'idle' ? btn('mic-try', s.micTry) : '';
    return `
      <section class="panel b-companion fade" aria-labelledby="h-companion">
        <header><h2 id="h-companion">${e(s.companion)}</h2><span class="pill ai">${e(s.ai)}</span></header>
        <div class="body companion">
          ${caption}
          ${unavailable}
          <div class="row">
            ${btn('play', s.play, { cls: 'primary', disabled: !sc || ses.turn >= sc.length })}
            ${btn('replay', s.replay, { cls: 'quiet', disabled: ses.turn === 0 })}
          </div>
          <p class="small">${e(s.voiceLabel)}</p>
          ${turns}
          <div class="mic" data-mic="${ui.mic}" role="group" aria-label="${e(s.micTry)}">
            <p class="small" id="mic-status">${e(micText)}</p>
            <div class="row">${micActions}</div>
          </div>
          <form class="typed" data-form="typed">
            <div class="field">
              <label for="typed-input">${e(s.typed)}</label>
              <input id="typed-input" name="typed" type="text" autocomplete="off" value="${e(ui.fields.typed || '')}" aria-describedby="typed-help">
              <span class="help small" id="typed-help">${e(s.typedHelp)}</span>
            </div>
            <div class="row"><button type="submit" class="btn" id="typed-submit">${e(s.send)}</button></div>
          </form>
        </div>
      </section>`;
  }

  function tenFrames(a, b) {
    const s = S();
    const total = a + b;
    const frames = Math.max(1, Math.ceil(total / 10));
    const html = Array.from({ length: frames }, (_, f) =>
      `<div class="tenframe" aria-hidden="true">${Array.from({ length: 10 }, (_, i) => {
        const n = f * 10 + i;
        return `<span data-fill="${n < a ? 'a' : n < total ? 'b' : ''}"></span>`;
      }).join('')}</div>`).join('');
    return `<div class="tenframes" role="img" aria-label="${e(s.tenframeLabel(a, b))}">${html}</div>`;
  }

  function boardInner(t, id) {
    const s = S();
    const k = t.kind;
    let head = '';
    if (k === 'tenframe') {
      head = `<p class="problem">${e(t.problem)}</p>${tenFrames(t.a, t.b)}`;
    } else if (k === 'sounds') {
      head = `<p class="problem" lang="${state.settings.locale}">${e(t.word)}</p><div class="soundboxes">${t.boxes.map((b) => `<span>${e(b)}</span>`).join('')}</div>`;
    } else if (k === 'math') {
      head = `<p class="problem">${e(t.problem)}</p>`;
    } else if (k === 'reading') {
      head = `<p class="passage">${e(t.passage)}</p><p class="small scaffold">${t.scaffold.map((x) => `<mark>${e(x)}</mark>`).join(' ')}</p>`;
    } else if (k === 'writing') {
      head = `<p class="small">${t.scaffold.map((x) => `<mark>${e(x)}</mark>`).join(' ')}</p>`;
    } else {
      head = `<p class="small">${e(s.lorganized)}</p>`;
    }
    const st = steps(id).map((x) => `<div class="step" data-from="${x.from}"${x.provenance ? ` data-provenance="${e(x.provenance)}"` : ''}>${e(stepText(id, x))}${x.provenance === 'scripted_demo' ? ` <span class="pill sample">${e(s.scripted)}</span>` : ''}</div>`).join('');
    return `${head}<div class="steps">${st}</div>`;
  }
  // The student's board is a named region with a stable id so focus can move to it.
  function boardRegion(c, id) {
    const s = S();
    return `<div class="board" id="board" role="region" aria-label="${e(s.board)}">${boardInner(c, id)}</div>`;
  }

  function boardForm() {
    const s = S();
    return `<form class="typed" data-form="board"><div class="field"><label for="board-input">${e(s.write)}</label><input id="board-input" name="board" type="text" autocomplete="off" value="${e(ui.fields.board || '')}" aria-describedby="board-help"><span class="help small" id="board-help">${e(s.writeHelp)}</span></div><div class="row"><button type="submit" class="btn" id="board-submit">${e(s.add)}</button></div></form>`;
  }

  function taskActions(t) {
    const s = S();
    const st = state.work.status;
    const k2 = state.settings.band === 'K2';
    const organized = t.kind === 'organized';
    const noHints = !t.hints || hintsUsed() >= t.hints.length;
    const parts = [];
    if (st === 'not_started') parts.push(btn('start', s.start, { cls: 'primary big', glyph: k2 ? '▶' : '' }));
    if (st === 'in_progress') {
      if (!organized) parts.push(btn('hint', s.hint, { glyph: k2 ? '?' : '', disabled: noHints }));
      parts.push(btn('done', s.done, { cls: 'primary big', glyph: k2 ? '✓' : '' }));
    }
    if (k2 && st !== 'complete') parts.push(btn('ask-adult', s.askAdult, { glyph: '☺', disabled: !!ui.helpFlags[t.id] }));
    return `<div class="task-actions">${parts.join('')}</div>`;
  }

  function taskCard(t, opts = {}) {
    const s = S();
    const c = task(t.id);
    const st = state.work.status;
    const k2 = state.settings.band === 'K2';
    const next = M.nextTask(state);
    const cues = k2 ? `<div class="cues" aria-hidden="true">
        <span class="cue" data-on="${st === 'not_started'}"><span class="glyph">▶</span>${e(s.cueReady)}</span>
        <span class="cue" data-on="${st === 'in_progress'}"><span class="glyph">✎</span>${e(s.cueWorking)}</span>
        <span class="cue" data-on="${st === 'complete'}"><span class="glyph">✓</span>${e(s.cueDone)}</span>
      </div>` : '';
    const scaffold = k2 && c.scaffold ? `<p class="notice info"><strong>${e(s.scaffoldLabel)}:</strong> ${e(c.scaffold)}</p>` : '';
    const explain = !k2 && c.explain ? `<p class="small">${e(c.explain)}</p>` : '';
    const flag = ui.helpFlags[t.id] ? `<p class="notice warn" role="status" id="adult-flag" tabindex="-1">${e(s.adultAsked)}</p>` : '';
    const doneBlock = st === 'complete' ? `
        <p class="notice ok">${e(s.doneNote)}</p>
        <div class="stack">
          <h3 class="small strong">${e(s.nextStep)}</h3>
          ${next ? btn('select', s.nextTask(task(next.id).title), { arg: next.id, cls: 'primary' }) : `<p class="small" id="all-done" tabindex="-1">${e(s.allDone)}</p>`}
        </div>` : '';
    return `
      <div class="task">
        <div class="row"><span class="subject">${e(s.subject[t.subject])}</span><span class="status" data-s="${st}">${e(s.status[st])}</span>${hintsUsed() ? `<span class="pill">${e(s.hintCount(hintsUsed()))}</span>` : ''}</div>
        <h2 class="${opts.big ? 'h-display' : 'lead'}" id="h-task">${e(c.title)}</h2>
        <p class="small due">${e(dueLabel(t))}</p>
        ${cues}${scaffold}${explain}${flag}
        ${taskActions(c)}
        ${doneBlock}
      </div>`;
  }

  function planList(opts = {}) {
    const s = S();
    const k2 = state.settings.band === 'K2';
    let tasks = state.tasks;
    if (k2 && !opts.all) {
      // K–2: one short task at a time. The next one appears only once the current is done.
      const f = focusTask();
      tasks = f.status === 'complete' ? [f, M.nextTask(state)].filter(Boolean) : [f];
    }
    const items = tasks.map((t) => {
      const c = task(t.id);
      const active = t.id === state.focusTaskId;
      const a = (t.assistance || []).filter((x) => x.kind === 'hint').length;
      return `<li data-active="${active}">
        <span class="when">${e(s.wd(t.due))}</span>
        <span class="what"><strong>${e(c.short)}</strong><span class="small">${e(s.subject[t.subject])} · ${e(s.status[t.status])}${a ? ` · ${e(s.hintCount(a))}` : ''}${t.dueSource ? ` · ${e(s.dueSource[t.dueSource])}` : ''}</span></span>
        ${ui.role === 'student' && !active && t.status !== 'complete' ? btn('select', s.start, { arg: t.id, cls: 'quiet' }) : '<span></span>'}
      </li>`;
    }).join('');
    const cp = state.currentPlan;
    // A plan whose deadline moved is never shown as the current confirmed plan: both roles see
    // the same out-of-date warning with the old and new dates; the parent's Draft panel keeps the
    // historical items and offers another draft.
    const cur = cp && cp.stale
      ? `<p class="notice warn" role="status">${e(s.planStale(s.wd(cp.staleFrom), s.wd(cp.staleTo)))}</p>`
      : cp
        ? `<div class="day"><h3>${e(ui.role === 'parent' ? s.planAcceptedParent : s.planAccepted)}</h3><ol class="plan">${cp.items.map((i) => `<li><span class="when">·</span><span class="what">${e(planItemText(i))}</span><span></span></li>`).join('')}</ol></div>`
      : state.draftPlan && state.draftPlan.status === 'pending_parent_review'
        ? `<p class="notice warn">${e(s.planDraftPending)}</p>`
        : state.draftPlan && state.draftPlan.status === 'declined_by_parent'
          ? `<p class="notice">${e(s.planDeclined)}</p>`
          : `<p class="empty">${e(s.planEmpty)}</p>`;
    return `<ol class="plan ${k2 ? 'big' : ''}">${items}</ol>${cur}`;
  }

  function blockPlan(title) {
    const s = S();
    const b = state.settings.band;
    const negotiation = b === '68' && ui.role === 'student' ? proposeForm() : '';
    const proposals = (state.proposals || []).length ? proposalList(false) : '';
    return `
      <section class="panel b-plan fade" aria-labelledby="h-plan">
        <header><h2 id="h-plan">${e(title || s.plan)}</h2><span class="meta">${e(ui.role === 'parent' ? s.planSharedParent : s.planShared)}</span></header>
        <div class="body">${planList()}${proposals}${negotiation}</div>
      </section>`;
  }

  function proposeForm() {
    const s = S();
    const movable = state.tasks.filter((t) => t.status !== 'complete');
    const err = ui.proposeError ? `<p class="notice warn" role="alert" id="propose-error">${e(ui.proposeError)}</p>` : '';
    // Terminal state: nothing can be moved, so no submittable form is offered.
    if (!movable.length) return `${err}<p class="empty" data-empty="proposals">${e(s.proposeNone)}</p>`;
    if (!ui.proposeOpen) return `${err}<div class="row">${btn('propose-open', s.propose)}</div>`;
    return `${err}
      <form class="form" data-form="propose" aria-label="${e(s.propose)}">
        <p class="small">${e(s.proposeHelp)}</p>
        <div class="field">
          <label for="prop-task">${e(s.plan)}</label>
          <select id="prop-task" name="propTask" class="select">${movable.map((t) => `<option value="${e(t.id)}" ${ui.fields.propTask === t.id ? 'selected' : ''}>${e(task(t.id).short)} · ${e(s.wd(t.due))}</option>`).join('')}</select>
        </div>
        <div class="field"><label for="prop-date">${e(s.newDate)}</label><input id="prop-date" name="propDate" type="date" required value="${e(ui.fields.propDate || '2026-10-09')}"></div>
        <div class="field"><label for="prop-note">${e(s.why)}</label><input id="prop-note" name="propNote" type="text" value="${e(ui.fields.propNote || '')}"></div>
        <div class="row"><button type="submit" class="btn primary" id="propose-submit">${e(s.proposeSend)}</button>${btn('propose-close', s.decline, { cls: 'quiet' })}</div>
      </form>`;
  }

  function proposalList(decidable) {
    const s = S();
    const items = (state.proposals || []).map((p, i) => {
      const t = state.tasks.find((x) => x.id === p.taskId);
      // An approval stays historical: when a later parent correction moved the date again, say so.
      const superseded = p.status === 'approved_by_parent' && t && t.due !== p.due ? ` · ${e(s.pSuperseded)}` : '';
      return `
      <li class="turn" data-who="student">
        <span class="who">${e(s.proposal)} · ${e(s.student)} · ${e(s.pstatus[p.status])}${superseded}</span>
        <span>${e(task(p.taskId).short)}: ${e(s.wd(p.from))} → ${e(s.wd(p.due))}${p.note ? ` — “${e(p.note)}”` : ''}</span>
        ${decidable && p.status === 'pending_parent' ? `<span class="row">${btn('proposal-approve', s.approve, { arg: i, cls: 'primary' })}${btn('proposal-decline', s.decline, { arg: i })}</span>` : ''}
      </li>`; }).join('');
    return `<div class="stack"><h3 class="small strong" id="h-proposals" tabindex="-1">${e(s.proposals)}</h3><ul class="turns" tabindex="0" aria-labelledby="h-proposals">${items}</ul></div>`;
  }

  function blockSee() {
    const s = S();
    const b = state.settings.band;
    const text = b === 'K2' ? s.seeK2 : b === '35' ? s.see35 : s.see68;
    return `<section class="panel b-see fade pad" aria-labelledby="h-see"><h2 id="h-see" class="small strong ink">${e(s.seeTitle)}</h2><p class="small">${e(text)}</p></section>`;
  }

  function ledgerTable() {
    const s = S();
    const rows = ['math', 'literacy'].map((sub) => {
      const l = state.ledger[sub];
      const planned = l.plannedChecks && l.plannedChecks.length ? s.lplanned : s.lnone;
      const t = state.tasks.find((x) => x.subject === sub);
      const liveHints = state.tasks.filter((x) => x.subject === sub).reduce((n, x) => n + (x.assistance || []).filter((a) => a.kind === 'hint').length, 0);
      return `<tr><td class="k">${e(s.subject[sub])}</td><td>${e(t ? s.status[t.status] : s.lnone)}</td><td>${e(s.levid[l.evidence])}</td><td>${Math.max(liveHints, l.hintsUsed || 0)}</td><td>${e(s.lstatus[l.status])}<br><span class="small">${e(planned)}</span></td></tr>`;
    });
    const others = state.tasks.filter((t) => t.subject !== 'math' && t.subject !== 'literacy').map((t) =>
      `<tr><td class="k">${e(s.subject[t.subject])}</td><td>${e(s.status[t.status])}</td><td colspan="3"><span class="small">${e(s.lorganized)}</span></td></tr>`);
    return `<table class="ledger"><thead><tr><th scope="col">${e(s.lsubject)}</th><th scope="col">${e(s.lwork)}</th><th scope="col">${e(s.levidence)}</th><th scope="col">${e(s.lhints)}</th><th scope="col">${e(s.lcheck)}</th></tr></thead><tbody>${rows.join('')}${others.join('')}</tbody></table>`;
  }

  function blockLedger() {
    const s = S();
    return `<section class="panel b-ledger fade" aria-labelledby="h-ledger"><header><h2 id="h-ledger">${e(s.ledger)}</h2></header><div class="body"><p class="small">${e(s.ledgerNote)}</p>${ledgerTable()}</div></section>`;
  }

  // ---- student ----

  function renderStudent() {
    const s = S();
    const t = focusTask();
    const c = task(t.id);
    const k2 = state.settings.band === 'K2';
    const form = c.kind !== 'organized' ? boardForm() : '';
    if (ui.concept === 'A') {
      return `<div class="layout" data-c="A" data-r="student">
        <section class="panel b-focus fade" aria-labelledby="h-task">
          <header><h2 class="small strong">${e(s.today)} · ${e(k2 ? s.oneThing : s.oneThing)}</h2><span class="pill sample">${e(s.sample)}</span></header>
          <div class="body">${taskCard(t, { big: true })}${boardRegion(c, t.id)}
            ${form}
          </div>
        </section>
        ${blockCompanion(false)}
        <div class="b-rail stack gap">
          <section class="panel fade" aria-labelledby="h-plan"><header><h2 id="h-plan">${e(s.weekPlan)}</h2><span class="meta">${e(ui.role === 'parent' ? s.planSharedParent : s.planShared)}</span></header><div class="body">${planList()}${(state.proposals || []).length ? proposalList(false) : ''}${state.settings.band === '68' ? proposeForm() : ''}</div></section>
          ${blockSee()}
        </div>
      </div>`;
    }
    if (ui.concept === 'B') {
      return `<div class="layout" data-c="B" data-r="student">
        ${blockCompanion(true)}
        <section class="panel b-board fade" aria-labelledby="h-task">
          <header><h2 class="small strong">${e(s.board)}</h2><span class="pill sample">${e(s.sample)}</span></header>
          <div class="body">
            ${taskCard(t, { big: false })}
            ${boardRegion(c, t.id)}
            ${form}
          </div>
        </section>
        <div class="b-rail stack gap">
          <section class="panel fade" aria-labelledby="h-plan"><header><h2 id="h-plan">${e(s.weekPlan)}</h2></header><div class="body">${planList()}${(state.proposals || []).length ? proposalList(false) : ''}${state.settings.band === '68' ? proposeForm() : ''}</div></section>
          ${blockSee()}
        </div>
      </div>`;
    }
    return `<div class="layout" data-c="C" data-r="student">
      ${blockPlan(s.weekPlan)}
      <div class="b-side">
        <section class="panel fade" aria-labelledby="h-task"><header><h2 class="small strong">${e(s.today)}</h2><span class="pill sample">${e(s.sample)}</span></header><div class="body">${taskCard(t, { big: false })}</div></section>
        <details class="panel drawer fade"${ui.companionOpen ? ' open' : ''}><summary>${e(s.companionDrawer)}</summary><div class="body">
          ${boardRegion(c, t.id)}
          ${form}
        </div>${blockCompanion(true)}</details>
        ${blockSee()}
      </div>
    </div>`;
  }

  // ---- parent ----

  // Help-needed flags: hint counts per task plus explicit "ask a grown-up" flags.
  function flagList() {
    const s = S();
    const flags = [];
    state.tasks.forEach((t) => {
      const n = (t.assistance || []).filter((a) => a.kind === 'hint').length;
      if (n) flags.push(s.hintFlag(n, s.subject[t.subject]));
      if (ui.helpFlags[t.id]) flags.push(`${s.helpFlag} · ${task(t.id).short}`);
    });
    return `<div class="stack"><h3 class="small strong">${e(s.flags)}</h3>${flags.length ? `<ul class="stack">${flags.map((f) => `<li class="notice warn">${e(f)}</li>`).join('')}</ul>` : `<p class="small">${e(s.noFlags)}</p>`}</div>`;
  }

  function blockToday() {
    const s = S();
    return `
      <section class="panel b-today fade" aria-labelledby="h-today">
        <header><h2 id="h-today">${e(s.overview)}</h2><span class="pill sample">${e(s.sample)}</span></header>
        <div class="body">
          ${flagList()}
          <div class="stack"><h3 class="small strong">${e(s.workStatus)}</h3>${planList({ all: true })}</div>
          <div class="stack"><h3 class="small strong">${e(s.ledger)}</h3><p class="small">${e(s.ledgerNote)}</p>${ledgerTable()}</div>
          ${(state.proposals || []).length ? proposalList(true) : ''}
        </div>
      </section>`;
  }

  function blockObserve() {
    const s = S();
    const list = state.observations.length
      ? `<ul class="obs">${state.observations.map((o) => `<li><span class="t">${e(o.text)}</span><span class="pill parent">${e(s.obsPill)}</span></li>`).join('')}</ul>`
      : `<p class="empty">${e(s.observeEmpty)}</p>`;
    return `
      <section class="panel b-observe fade" aria-labelledby="h-observe">
        <header><h2 id="h-observe">${e(s.observe)}</h2></header>
        <div class="body">
          <form class="form" data-form="observe">
            <p class="small">${e(s.observeHelp)}</p>
            <div class="field"><label for="obs-input">${e(s.observeLabel)}</label><textarea id="obs-input" name="obs" required placeholder="${e(s.observePh)}">${e(ui.fields.obs || '')}</textarea></div>
            <div class="row"><button type="submit" class="btn primary" id="obs-submit">${e(s.observeSave)}</button></div>
          </form>
          ${list}
        </div>
      </section>`;
  }

  function blockExtract() {
    const s = S();
    const ex = state.extracted;
    const t = task(ex.taskId);
    const confirmed = ex.status === 'confirmed_by_parent';
    const corrections = ex.corrections.map((c) => `<p class="small">${e(s.corrected(s.wd(c.from), s.wd(c.to)))}</p>`).join('');
    // `ex.due` is always the current shared deadline; the sample note's own date stays visible as
    // a source whenever it differs (an approved proposal or a correction moved the date).
    const sampleLine = ex.sampleDue && ex.sampleDue !== ex.due ? `<p class="small">${e(s.sampleSaid(s.wd(ex.sampleDue)))}</p>` : '';
    const srcLine = ex.dueSource && s.dueSource[ex.dueSource] ? ` <span class="small">(${e(s.dueSource[ex.dueSource])})</span>` : '';
    const body = !ui.sampleLoaded
      ? `<p class="small">${e(s.feedbackHelp)}</p><div class="row">${btn('load-sample', s.loadSample, { cls: 'primary' })}</div>`
      : `
        <div class="row"><span class="pill sample">${e(s.parentEntered)}</span></div>
        <blockquote class="notice quote">${e(NOTES[state.settings.locale][state.settings.band])}</blockquote>
        <div class="extract" data-status="${confirmed ? 'confirmed' : 'review'}">
          <div class="row"><strong>${e(confirmed ? s.confirmed : s.extracted)}</strong>${confirmed ? `<span class="pill ok">${e(s.confirmed)}</span>` : `<span class="pill warn">${e(s.extracted)}</span>`}</div>
          <p>${e(t.title)} · <span class="small">${e(s.subject[state.tasks.find((x) => x.id === ex.taskId).subject])}</span></p>
          ${confirmed ? `<p class="small">${e(s.dueDate)}: ${e(s.wd(ex.due))}${srcLine}</p>${sampleLine}${corrections}` : `
          <form class="form" data-form="extract">
            <p class="small">${e(s.extractedHelp)}</p>
            ${sampleLine}
            <div class="field"><label for="due-input">${e(s.dueDate)}</label><input id="due-input" name="due" type="date" required value="${e(ui.fields.due || ex.due)}"></div>
            <div class="row"><button type="submit" class="btn primary" id="extract-submit">${e(s.saveFix)}</button>${btn('confirm-extract', s.confirm)}</div>
          </form>`}
        </div>`;
    return `
      <section class="panel b-extract fade" aria-labelledby="h-extract">
        <header><h2 id="h-extract">${e(s.feedback)}</h2></header>
        <div class="body">${body}</div>
      </section>`;
  }

  function blockDraft() {
    const s = S();
    const d = state.draftPlan;
    const canAsk = state.extracted.status === 'confirmed_by_parent';
    let body;
    if (!d) {
      body = `<p class="small">${e(s.draftHelp)}</p>${canAsk ? '' : `<p class="notice">${e(s.draftNeedsExtract)}</p>`}<div class="row">${btn('draft-ask', s.draftAsk, { cls: 'primary', disabled: !canAsk })}</div>`;
    } else {
      const items = `<ol class="plan">${d.items.map((i) => `<li><span class="when">·</span><span class="what">${e(planItemText(i))}</span><span></span></li>`).join('')}</ol>`;
      const staleNote = d.stale ? `<p class="notice warn" role="status">${e(s.planStale(s.wd(d.staleFrom), s.wd(d.staleTo)))}</p>` : '';
      if (d.status === 'pending_parent_review' && d.stale) {
        // A stale draft cannot be accepted as-is: ask for a new one (from the current date) or decline it.
        body = `<div class="row" id="draft-result" tabindex="-1"><span class="pill warn">${e(s.draftStale)}</span><strong>${e(s.draftPending)}</strong></div>${staleNote}${items}
          <form class="form" data-form="decline">
            <div class="field"><label for="decline-note">${e(s.declineNote)}</label><input id="decline-note" name="declineNote" type="text" placeholder="${e(s.declinePh)}" value="${e(ui.fields.declineNote || '')}"></div>
            <div class="row">${btn('draft-ask', s.draftAgain, { cls: 'primary' })}<button type="submit" class="btn danger" id="decline-submit">${e(s.draftDecline)}</button></div>
          </form>`;
      } else if (d.status === 'pending_parent_review') {
        body = `<div class="row"><span class="pill ai">${e(s.ai)}</span><strong>${e(s.draftPending)}</strong></div>${items}
          <form class="form" data-form="decline">
            <div class="field"><label for="decline-note">${e(s.declineNote)}</label><input id="decline-note" name="declineNote" type="text" placeholder="${e(s.declinePh)}" value="${e(ui.fields.declineNote || '')}"></div>
            <div class="row">${btn('draft-accept', s.draftAccept, { cls: 'primary' })}<button type="submit" class="btn danger" id="decline-submit">${e(s.draftDecline)}</button></div>
          </form>`;
      } else if (d.status === 'accepted_by_parent' && state.currentPlan && state.currentPlan.stale) {
        // Accepted earlier, then the deadline moved: historical items stay visible, clearly out of date, with a re-draft path.
        const cp = state.currentPlan;
        body = `<div class="row" id="draft-result" tabindex="-1"><span class="pill warn">${e(s.draftStale)}</span></div><p class="notice warn" role="status">${e(s.planStale(s.wd(cp.staleFrom), s.wd(cp.staleTo)))}</p>${items}<div class="row">${btn('draft-ask', s.draftAgain, { cls: 'primary' })}</div>`;
      } else if (d.status === 'accepted_by_parent') {
        body = `<div class="row" id="draft-result" tabindex="-1"><span class="pill ok">${e(s.draftAccepted)}</span></div>${items}`;
      } else {
        body = `<div class="row" id="draft-result" tabindex="-1"><span class="pill warn">${e(s.draftDeclined)}</span>${d.parentNote ? `<span class="small">“${e(d.parentNote)}”</span>` : ''}</div>${items}<div class="row">${btn('draft-ask', s.draftAgain)}</div>`;
      }
    }
    return `<section class="panel b-draft fade" aria-labelledby="h-draft"><header><h2 id="h-draft">${e(s.draft)}</h2></header><div class="body">${body}</div></section>`;
  }

  // The child's work: every task with board steps, turns or progress (at least the focus task),
  // each with its own board and turns. Shared by all three parent compositions.
  function blockReplay(opts = {}) {
    const s = S();
    const worked = state.tasks.filter((t) => t.id === state.focusTaskId || steps(t.id).length || session(t.id).turns.length || t.status !== 'not_started');
    const blocks = worked.map((t) => {
      const c = task(t.id);
      const hints = (t.assistance || []).filter((a) => a.kind === 'hint').length;
      const view = turnsView(t.id);
      return `<div class="replay-task">
        <p class="small"><strong class="ink">${e(c.title)}</strong> · ${e(s.status[t.status])}${hints ? ` · ${e(s.hintCount(hints))}` : ''}</p>
        <div class="board" role="region" aria-label="${e(s.boardFor(c.title))}">${boardInner(c, t.id)}</div>
        ${view.length ? turnsList(t.id, s.student) : `<p class="empty">${e(s.turnsEmpty)}</p>`}
      </div>`;
    }).join('');
    return `
      <section class="panel b-replay fade" aria-labelledby="h-replay">
        <header><h2 id="h-replay">${e(s.replayTitle)}</h2><span class="meta">${e(s.replayHelp)}</span></header>
        <div class="body">
          ${opts.flags ? flagList() : ''}
          ${blocks}
          ${opts.proposals && (state.proposals || []).length ? proposalList(true) : ''}
        </div>
      </section>`;
  }

  function renderParent() {
    const s = S();
    if (ui.concept === 'A') {
      // A — overview first: flags, status and ledger on top; the child's work and the forms below.
      return `<div class="layout" data-c="A" data-r="parent">${blockToday()}${blockReplay()}${blockObserve()}${blockExtract()}${blockDraft()}</div>`;
    }
    if (ui.concept === 'B') {
      // B — workspace first: the child's boards and turns dominate, with flags and proposal decisions inside; forms and ledger beside.
      return `<div class="layout" data-c="B" data-r="parent">${blockReplay({ flags: true, proposals: true })}<div class="b-forms">${blockObserve()}${blockExtract()}${blockDraft()}${blockLedger()}</div></div>`;
    }
    // C — shared plan first: the plan with flags and proposal decisions leads; the child's work sits beside the forms.
    return `<div class="layout" data-c="C" data-r="parent">
      <div class="b-plan stack gap">
        <section class="panel fade" aria-labelledby="h-plan"><header><h2 id="h-plan">${e(s.weekPlan)}</h2><span class="meta">${e(ui.role === 'parent' ? s.planSharedParent : s.planShared)}</span></header><div class="body">${flagList()}${planList({ all: true })}${(state.proposals || []).length ? proposalList(true) : ''}</div></section>
        ${blockDraft()}
      </div>
      <div class="b-side">${blockExtract()}${blockReplay()}${blockObserve()}${blockLedger()}</div>
    </div>`;
  }

  // ------------------------------------------------------------- actions --

  // A hint the child asked for (explicit control or a supported typed request). Returns a
  // generated-reply descriptor (rendered in the current locale at render time). The text is
  // the first hint not already shown on the board (a scripted demo may have shown one), so a
  // real request never just repeats the demo; the allowance counts real requests only.
  function giveHint() {
    const c = task(state.focusTaskId);
    if (c.kind === 'organized') return { kind: 'organized' };
    const n = hintsUsed();
    if (!c.hints || n >= c.hints.length) return { kind: 'noMoreHints' };
    const shown = new Set(steps(state.focusTaskId).filter((x) => x.hintIndex !== undefined).map((x) => x.hintIndex));
    let idx = c.hints.findIndex((_, i) => !shown.has(i));
    if (idx < 0) idx = Math.min(n, c.hints.length - 1);
    state = M.requestHint(state, c.hints[idx]);
    pushStep(state.focusTaskId, { from: 'hint', hintIndex: idx });
    if (hintsUsed() >= c.hints.length) ui.focusNext = ['#board', '#h-task'];
    return { kind: 'hint', n: idx };
  }

  // A scripted demo step is recorded once per script position, whatever the number of
  // replays: assistance as `scripted_hint` (never a requested hint), board steps tagged
  // with their demo provenance. Replaying is presentation, not new evidence.
  function playScriptedStep(id, turn, index) {
    const c = task(id);
    const onBoard = steps(id).some((x) => x.provenance === 'scripted_demo' && x.scriptIndex === index);
    if (turn.hint !== undefined) {
      state = M.recordScriptedHint(state, { text: (c.hints || [])[turn.hint] || turn.text, scriptIndex: index });
      if (!onBoard) pushStep(id, { from: 'hint', hintIndex: turn.hint, scriptIndex: index, provenance: 'scripted_demo' });
    }
    if (turn.step && !onBoard) pushStep(id, { from: 'student', scriptIndex: index, provenance: 'scripted_demo' });
  }

  function checkStep(text) {
    const c = task(state.focusTaskId);
    pushStep(state.focusTaskId, { from: 'student', text });
    if (c.kind === 'organized') return { kind: 'organized' };
    if (c.check) return { kind: M.checkFinalAnswer(text, c.check).result };
    return { kind: 'literacy' };
  }

  function companionReply(gen) {
    const id = state.focusTaskId;
    session(id).turns.push({ who: 'companion', gen, taskId: id });
    announce(genText(gen, id));
  }

  function act(name, arg) {
    const s = S();
    try { switch (name) {
      case 'concept': ui.concept = arg; announce(s.conceptSet(arg)); break;
      case 'role': ui.role = arg; announce(s.roleSet(arg === 'student' ? s.student : s.parent)); break;
      case 'band': {
        state = M.loadExample({ locale: state.settings.locale, band: arg });
        freshUi();
        announce(s.bandSet(bandLabel(arg)));
        break;
      }
      case 'lang': {
        // Only the locale changes. Person-authored text stays verbatim; generated turns,
        // steps and plan items are re-rendered from their keys in the new language.
        state = { ...state, settings: M.createSettings({ locale: arg, band: state.settings.band }) };
        announce(STR[arg].langSet);
        break;
      }
      case 'reset': {
        state = M.resetExample(state);
        freshUi();
        announce(s.resetDone);
        break;
      }
      case 'start': state = M.startWork(state); ui.focusNext = ['[data-act="hint"]', '[data-act="done"]']; announce(s.status.in_progress); break;
      case 'hint': {
        if (state.work.status === 'not_started') state = M.startWork(state);
        companionReply(giveHint());
        break;
      }
      case 'done': state = M.completeWork(state); ui.focusNext = ['[data-act="select"]', '#all-done']; announce(s.doneNote); break;
      case 'select': state = M.selectTask(state, arg); ui.focusNext = ['#h-task']; announce(task(arg).title); break;
      case 'ask-adult': ui.helpFlags[state.focusTaskId] = true; ui.focusNext = ['#adult-flag']; announce(s.adultAsked); break;
      case 'play': {
        const id = state.focusTaskId;
        const sc = script(id);
        const ses = session(id);
        const turn = sc && sc[ses.turn];
        if (!turn) { announce(sc ? s.endOfScript : s.scriptUnavailable); break; }
        if (state.work.status === 'not_started') state = M.startWork(state);
        playScriptedStep(id, turn, ses.turn);
        ses.turns.push({ who: turn.who, scripted: true, taskId: id, index: ses.turn });
        ses.turn += 1;
        if (ses.turn >= sc.length) ui.focusNext = ['[data-act="replay"]'];
        announce(`${turn.who === 'companion' ? s.ai : s.student}: ${turn.text}`);
        break;
      }
      case 'replay': {
        // Rewinds the scripted demo only. The child's own turns and every board entry stay.
        const ses = session(); ses.turn = 0; ses.turns = ses.turns.filter((t) => !t.scripted);
        ui.focusNext = ['[data-act="play"]']; announce(s.caption0); break;
      }
      case 'mic-try': ui.mic = 'denied'; ui.focusNext = ['[data-act="mic-allow"]']; announce(s.micDenied); break;
      case 'mic-allow': ui.mic = 'recovered'; ui.focusNext = ['#mic-status']; announce(s.micRecovered); break;
      case 'mic-type': ui.mic = 'typing'; ui.focusNext = ['#typed-input']; announce(s.typed); break;
      case 'load-sample': ui.sampleLoaded = true; ui.focusNext = ['#due-input']; announce(s.extracted); break;
      case 'confirm-extract': state = M.correctExtractedTask(state, {}); ui.focusNext = ['[data-act="draft-ask"]', '#h-draft']; announce(s.extractSaved); break;
      case 'draft-ask': {
        state = M.createDraftPlan(state, M.derivePlanItems(state));
        ui.focusNext = ['[data-act="draft-accept"]', '#draft-result', '#h-draft'];
        announce(s.draftAskedLive);
        break;
      }
      case 'draft-accept': state = M.acceptDraftPlan(state); ui.focusNext = ['#draft-result']; announce(s.draftAcceptedLive); break;
      case 'propose-open': ui.proposeOpen = true; ui.proposeError = ''; ui.focusNext = ['#prop-task']; announce(s.proposeOpened); break;
      case 'propose-close': ui.proposeOpen = false; ui.proposeError = ''; ui.focusNext = ['[data-act="propose-open"]', '#h-proposals', '#h-plan']; announce(s.proposeClosed); break;
      case 'proposal-approve':
      case 'proposal-decline': {
        const p = (state.proposals || [])[Number(arg)];
        ui.focusNext = ['#h-proposals'];
        if (!p || p.status !== 'pending_parent') { announce(s.proposalStale); break; } // stale control: refuse, never re-decide
        const decision = name === 'proposal-approve' ? 'approved' : 'declined';
        state = M.decideProposal(state, Number(arg), decision);
        announce(s.pstatus[decision === 'approved' ? 'approved_by_parent' : 'declined_by_parent']);
        break;
      }
      default: return;
    } } catch (err) { recover(err); }
    render();
  }

  // Last-resort guard: an action that throws must never leave an uncaught exception and a
  // silent screen. The error stays visible (console) and the person hears that the action is
  // unavailable; state is unchanged because model functions return new state or throw.
  function recover(err) {
    ui.lastError = String((err && err.message) || err);
    console.error(err);
    announce(S().actionUnavailable);
  }

  function submit(name, form) {
    const s = S();
    const data = new FormData(form);
    try { switch (name) {
      case 'typed': {
        const text = String(data.get('typed') || '').trim();
        if (!text) return;
        const id = state.focusTaskId;
        const c = task(id);
        session(id).turns.push({ who: 'student', text });
        if (state.work.status === 'not_started') state = M.startWork(state);
        let gen;
        if (isHintRequest(text)) gen = giveHint();
        else if (c.check && /\d/.test(text)) gen = checkStep(text);
        else if (c.kind === 'organized') gen = { kind: 'organized' };
        else gen = { kind: 'default' };
        ui.fields.typed = '';
        companionReply(gen);
        break;
      }
      case 'board': {
        const text = String(data.get('board') || '').trim();
        if (!text) return;
        if (state.work.status === 'not_started') state = M.startWork(state);
        ui.fields.board = '';
        companionReply(checkStep(text));
        break;
      }
      case 'observe': {
        const text = String(data.get('obs') || '').trim();
        if (!text) return;
        state = M.addParentObservation(state, text);
        ui.fields.obs = '';
        announce(s.observeSaved);
        break;
      }
      case 'extract': {
        const due = String(data.get('due') || state.extracted.due);
        state = M.correctExtractedTask(state, { due });
        ui.fields.due = '';
        ui.focusNext = ['[data-act="draft-ask"]', '#h-draft'];
        announce(s.extractSaved);
        break;
      }
      case 'decline': {
        state = M.declineDraftPlan(state, String(data.get('declineNote') || '').trim());
        ui.fields.declineNote = '';
        ui.focusNext = ['#draft-result'];
        announce(s.draftDeclinedLive);
        break;
      }
      case 'propose': {
        // Guard before the model: a stale form (task completed meanwhile, empty selector,
        // unparseable date) is refused with a message, never an exception.
        const taskId = String(data.get('propTask') || '');
        const due = String(data.get('propDate') || '');
        const target = state.tasks.find((t) => t.id === taskId);
        if (!target || target.status === 'complete' || !/^\d{4}-\d{2}-\d{2}$/.test(due)) { ui.proposeError = s.proposeInvalid; ui.focusNext = ['#propose-error']; announce(s.proposeInvalid); break; }
        state = M.proposePlanChange(state, { taskId, due, note: String(data.get('propNote') || '').trim() });
        ui.proposeOpen = false; ui.proposeError = ''; ui.fields.propNote = '';
        ui.focusNext = ['#h-proposals'];
        announce(s.proposed);
        break;
      }
      default: return;
    } } catch (err) { recover(err); }
    render();
  }

  app.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-act]');
    if (!b || b.disabled) return;
    act(b.dataset.act, b.dataset.arg);
  });
  app.addEventListener('submit', (ev) => {
    const f = ev.target.closest('form[data-form]');
    if (!f) return;
    ev.preventDefault();
    submit(f.dataset.form, f);
  });
  app.addEventListener('input', (ev) => {
    const el = ev.target;
    if (el && el.name) ui.fields[el.name] = el.value;
  });
  // Drawers keep the state the person left them in across rerenders (toggle does not bubble; capture it).
  app.addEventListener('toggle', (ev) => {
    const d = ev.target;
    if (!(d instanceof HTMLDetailsElement)) return;
    if (d.classList.contains('turns-drawer')) ui.turnsOpen = d.open;
    else if (d.classList.contains('drawer')) ui.companionOpen = d.open;
  }, true);
  // Focus must stay visible under the sticky boundary: the browser's own focus scrolling honours
  // scroll-padding/scroll-margin (styles.css), and this covers the "already in view" case where it
  // does not scroll at all.
  document.addEventListener('focusin', (ev) => {
    const el = ev.target;
    if (!(el instanceof Element) || el.classList.contains('skip')) return;
    setTimeout(() => {
      if (document.activeElement !== el) return;
      const r = el.getBoundingClientRect(); const b = boundaryEl.getBoundingClientRect();
      if (r.height && r.top < b.bottom && r.bottom > b.top) window.scrollBy({ top: r.top - b.bottom - 8, left: 0, behavior: 'auto' });
    }, 0);
  });
  window.addEventListener('resize', syncBannerHeight);

  // Exposed for local verification only: read state/ui, plus the same act/submit entry points
  // the real controls call (they are mutators). `ui.turns` is the rendered conversation for the
  // focused task, in the current locale.
  window.__companionDebug = {
    get state() { return state; },
    get ui() { return { ...ui, turn: session().turn, turns: turnsView() }; },
    act,
    submit
  };

  render();
})();
