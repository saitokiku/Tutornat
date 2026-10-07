/* app.mjs — the lesson workspace.
 *
 * One screen: set a goal, get a generated lesson, work the visual, answer,
 * get response-specific help when wrong, take a fresh check, launch the next
 * lesson. Pure logic is exported at the top and unit-tested; DOM wiring is
 * below and exercised in a real browser.
 *
 * Rendering rule, no exceptions: every model-authored string reaches the page
 * through textContent. There is no HTML sink in this file.
 */
import { validateLesson, gradeAnswer, chooseNext } from './core.mjs';

// ── copy ────────────────────────────────────────────────────────────────────
// Both locales are authored in full. A missing key is a test failure, not a
// silent fallback at runtime, so Spanish is never an empty translation claim.
export const STRINGS = {
  en: {
    appTitle: 'Lesson workspace',
    profileTitle: 'Who is learning?',
    profileNameLabel: 'Name or nickname',
    profileNameHint: 'A label for this browser only. 1 to 40 characters. It is never sent with a lesson.',
    profileAgeLabel: 'Age',
    profileAgeHint: 'A whole number from 1 to 120. Age shapes vocabulary and difficulty. It is not a verified age or a consent check.',
    profileSave: 'Start learning',
    profileUpdate: 'Save changes',
    profileEdit: 'Edit profile',
    profileCancelEdit: 'Cancel',
    profileNameError: 'Enter a name of 1 to 40 characters.',
    profileAgeError: 'Enter a whole number from 1 to 120.',
    profileWho: '{name}, age {age}',
    profileNoAccount: 'No account, no sign-in, no e-mail. One profile, on this computer.',
    profileRemember: 'Remember this profile on this browser (off by default)',
    profileRememberHint: 'Off: the profile lives in this tab only and is gone when you close it.',
    ageConfirmTitle: 'Change the age and discard this lesson?',
    ageConfirmBody: 'The lesson on screen was written for age {old}. Changing to {age} discards it and the answers in it.',
    ageConfirmYes: 'Change age and discard',
    ageConfirmNo: 'Keep this lesson',
    setupTitle: 'What should this lesson teach?',
    goalLabel: 'Learning goal',
    goalHint: 'One skill, in your words. Up to 300 characters.',
    goalPlaceholder: 'Compare fractions with unlike denominators',
    localeLabel: 'Lesson language',
    localeNote: 'Applies to the next lesson you generate. Work already on screen is kept as written.',
    generate: 'Generate lesson',
    generating: 'Generating the lesson\u2026',
    cancel: 'Cancel',
    stepOf: 'Question {n} of {total}',
    practice: 'Practice',
    freshCheck: 'Fresh check',
    freshCheckNote: 'A new question, not the practice one. Help is available, and it is recorded.',
    answerLabel: 'Your answer',
    answerPlaceholder: 'Type your answer',
    writingLabel: 'Write your response',
    writingPlaceholder: 'Write as much as you need.',
    writingNote: 'Writing gets AI feedback, not a score.',
    check: 'Check answer',
    checking: 'Checking\u2026',
    getHint: 'I need a hint',
    gettingHint: 'Asking for a hint\u2026',
    explainAgain: 'Explain this a different way',
    retry: 'Retry',
    tryAgain: 'Try again',
    nextQuestion: 'Next question',
    seeNext: 'See the next lesson',
    correct: 'Correct',
    incorrect: 'Not right yet',
    ungraded: 'Not scored',
    hintShown: 'Hint used on this question.',
    aiFeedbackTag: 'AI feedback, not a graded score.',
    visualFraction: '{filled} of {parts} parts shaded',
    visualTokens: '{counted} of {count} counted',
    visualNumberline: 'Value {value}, between {min} and {max}',
    visualPassage: 'Sentence {n} of {total} selected',
    visualPassageNone: 'No sentence selected',
    fractionPartLabel: 'Part {n} of {parts}',
    tokenLabel: 'Counter {n}',
    sentenceLabel: 'Sentence {n}',
    tokensInstruction: 'Tap each counter to count it. Arrow keys and Space work too.',
    fractionInstruction: 'Tap a part to shade up to it. Arrow keys and Space work too.',
    numberlineInstruction: 'Drag the slider or use the arrow keys.',
    passageInstruction: 'Choose the sentence that answers the question.',
    sequenceInstruction: 'The whole diagram is shown. Step through it yourself \u2014 nothing plays on its own.',
    visualSequence: 'Stage {n} of {total}: {label}',
    seqPrev: 'Previous stage',
    seqNext: 'Next stage',
    seqStage: 'Stage {n}',
    doneTitle: 'Lesson finished',
    nextTitle: 'Suggested next lesson',
    nextReinforce: 'Suggested: more practice',
    nextAdvance: 'Suggested: next step',
    launchNext: 'Start this lesson',
    newGoal: 'Set a different goal',
    saveLabel: 'Save progress on this browser only (off by default)',
    saveHint: 'The saved copy stays on this computer. Saving sends nothing; generating a lesson does.',
    savedState: 'Saved in this browser.',
    memoryState: 'Not saved. This work is only in this tab.',
    storageQuota: 'This browser has no room left to save. Work is kept in this tab only.',
    storageUnavailable: 'This browser blocked local saving. Work is kept in this tab only.',
    storageCorrupt: 'The previous saved lesson could not be read, so it was left alone.',
    resumed: 'Resumed your saved lesson.',
    savedOtherAge: 'A saved lesson for a different age is still stored here. It is not opened under this age.',
    clearBlocked: 'This browser blocked the delete. Saved data is still stored here, so nothing was removed from this screen.',
    rememberBlocked: 'This browser blocked saving the profile, so remembering stayed off.',
    forgetBlocked: 'This browser blocked removing the saved profile, so it is still remembered here.',
    exportLabel: 'Download learning record',
    clearLabel: 'Clear saved work',
    clearConfirmTitle: 'Clear saved work?',
    clearConfirmBody: 'This deletes the saved lesson, answers, evidence and the remembered profile in this browser. It cannot be undone.',
    clearConfirm: 'Delete it',
    clearCancel: 'Keep it',
    cleared: 'Saved work deleted.',
    evidenceTitle: 'What happened',
    evidenceEmpty: 'Answers and help appear here as you work.',
    evidenceAssisted: 'with help',
    evidenceAlone: 'no help requested',
    evidenceNote: 'A log of answers and help. Not a mastery score, and it cannot show work done away from this screen.',
    errorTitle: 'The request did not go through',
    errorKept: 'Your answer and progress are still here.',
    errorQuota: 'This test session has used all of its AI calls. Restart the server to run more.',
    errorGeneric: 'The provider did not return a usable lesson.',
    errorNetwork: 'The local server did not respond.',
    errorMismatch: 'The lesson that came back was not written for the age and language that were asked for, so it was not shown.',
    disclosureTitle: 'Before you start',
    // Authored copy bank (TEACHING_PROMPTS.md section 5), used verbatim.
    disclose1: 'Your learning goal, the age you enter, and anything you type into a lesson are sent to Anthropic to generate lessons and feedback.',
    disclose2: 'Your name or nickname is a local label. It stays on this computer and is never sent.',
    disclose3: 'The AI makes mistakes. Check its math and reading feedback.',
    disclose4: 'Saving progress on this browser is off by default.',
    disclose5: 'No camera or microphone is used.',
    disclose6: 'Generated lessons are kept in a private test library on the server so the same goal can be reused instead of paying for a new AI call. What you type into the goal is part of that saved lesson; your profile name is not sent and is not in it.',
    disclosureNote: 'This is not a verified age check, parental consent, or compliance review.',
    disclosureAck: 'I understand \u2014 continue',
    skipToWork: 'Skip to the lesson',
    sourceNote: 'Lesson text generated by {model} via {provider}.',
    // The configured name is what was ASKED for. Without a proved wire model the
    // UI must not credit that model as the author.
    sourceUnproved: 'Lesson text generated via {provider}. The requested model was {model}; which model actually answered was not confirmed.',
    sourceCached: 'Reused from the saved lesson library, first generated on {at}. No new AI call was made for it.',
    callsLeft: '{n} AI calls left in this server session.',
    // Activity log. Observed lifecycle only: no percentages, no promises, no
    // provider internals, and never the learner's own words.
    actTitle: 'Activity',
    actIdle: 'Nothing running.',
    actRequestLesson: 'Requesting lesson',
    actRequestFeedback: 'Requesting feedback',
    actRequestHint: 'Requesting a hint',
    actWaiting: 'Waiting for the local server and the AI response',
    actReceived: 'Response received',
    actValidating: 'Checking the lesson on this computer',
    actReady: 'Ready',
    actFailed: 'Request failed ({code})',
    actStopped: 'Stopped waiting. The server may still finish this request; nothing is cancelled at the provider.',
    actReset: 'Log reset.',
    actBound: 'The server allows a reply up to 180 seconds. This is not a promise it will arrive.',
    actElapsed: '{n}s',
    actSaved: 'Saved to lesson library.',
    actSaveFailed: 'Not saved to the lesson library; the server did not confirm a save.',
    actCached: 'Loaded from saved lesson library (no new AI call).',
    // Thumbs feedback. Deliberately worded as an opinion count: a thumbs-up is
    // one person saying a lesson felt useful, and nothing more than that.
    rateTitle: 'Was this lesson helpful?',
    rateUp: '\u{1F44D} Helpful',
    rateDown: '\u{1F44E} Not helpful',
    rateCounts: 'Reported helpful {up} \u00b7 not helpful {down}',
    rateSemantics: 'A self-reported count of who found this lesson useful. It is not evidence that anything was understood or retained.',
    rateBusy: 'Saving your feedback\u2026',
    rateFailed: 'Your feedback was not saved, so nothing was counted.',
    rateRetry: 'Send it again',
    rateStorage: 'This browser blocked saving, so your vote is remembered in this tab only.',
    rateUnavailable: 'This lesson has no library record on the server, so there is nothing to attach feedback to.',
    // Lesson details. Facts the server recorded about one generated version.
    mdTitle: 'Lesson details',
    mdModelRequested: 'Model requested',
    mdModelConfigured: 'Model this app is set to use',
    mdModelRequestSent: 'Model named on the request sent',
    mdModelReported: 'Model that answered',
    mdCreated: 'First created',
    mdGenerationTime: 'Generation time (seconds)',
    mdDevice: 'Device reported',
    mdDeviceNote: 'The device is what the browser reported about itself, not checked hardware.',
    mdInstructionsNote: 'The exact teaching instructions this application sent for this lesson.',
    mdSystem: 'System instruction',
    mdTeaching: 'Teaching guidance',
    mdLessonPrompt: 'Lesson request',
    mdContract: 'Output contract',
  },
  es: {
    appTitle: 'Espacio de la lecci\u00f3n',
    profileTitle: '\u00bfQui\u00e9n va a aprender?',
    profileNameLabel: 'Nombre o apodo',
    profileNameHint: 'Una etiqueta solo para este navegador. De 1 a 40 caracteres. Nunca se env\u00eda con una lecci\u00f3n.',
    profileAgeLabel: 'Edad',
    profileAgeHint: 'Un n\u00famero entero del 1 al 120. La edad ajusta el vocabulario y la dificultad. No es una edad verificada ni un consentimiento.',
    profileSave: 'Empezar a aprender',
    profileUpdate: 'Guardar cambios',
    profileEdit: 'Editar el perfil',
    profileCancelEdit: 'Cancelar',
    profileNameError: 'Escriba un nombre de 1 a 40 caracteres.',
    profileAgeError: 'Escriba un n\u00famero entero del 1 al 120.',
    profileWho: '{name}, {age} a\u00f1os',
    profileNoAccount: 'Sin cuenta, sin inicio de sesi\u00f3n y sin correo. Un solo perfil, en esta computadora.',
    profileRemember: 'Recordar este perfil en este navegador (desactivado por defecto)',
    profileRememberHint: 'Desactivado: el perfil solo existe en esta pesta\u00f1a y se pierde al cerrarla.',
    ageConfirmTitle: '\u00bfCambiar la edad y descartar esta lecci\u00f3n?',
    ageConfirmBody: 'La lecci\u00f3n en pantalla se escribi\u00f3 para {old} a\u00f1os. Cambiar a {age} la descarta junto con sus respuestas.',
    ageConfirmYes: 'Cambiar la edad y descartar',
    ageConfirmNo: 'Conservar esta lecci\u00f3n',
    setupTitle: '\u00bfQu\u00e9 debe ense\u00f1ar esta lecci\u00f3n?',
    goalLabel: 'Objetivo de aprendizaje',
    goalHint: 'Una destreza, en sus palabras. Hasta 300 caracteres.',
    goalPlaceholder: 'Comparar fracciones con denominadores distintos',
    localeLabel: 'Idioma de la lecci\u00f3n',
    localeNote: 'Se aplica a la pr\u00f3xima lecci\u00f3n que genere. El trabajo ya escrito se conserva igual.',
    generate: 'Generar lecci\u00f3n',
    generating: 'Generando la lecci\u00f3n\u2026',
    cancel: 'Cancelar',
    stepOf: 'Pregunta {n} de {total}',
    practice: 'Pr\u00e1ctica',
    freshCheck: 'Comprobaci\u00f3n nueva',
    freshCheckNote: 'Una pregunta nueva, no la de pr\u00e1ctica. Puede pedir ayuda y queda registrada.',
    answerLabel: 'Su respuesta',
    answerPlaceholder: 'Escriba su respuesta',
    writingLabel: 'Escriba su respuesta',
    writingPlaceholder: 'Escriba todo lo que necesite.',
    writingNote: 'La escritura recibe comentarios de la IA, no una calificaci\u00f3n.',
    check: 'Revisar respuesta',
    checking: 'Revisando\u2026',
    getHint: 'Necesito una pista',
    gettingHint: 'Pidiendo una pista\u2026',
    explainAgain: 'Expl\u00edcame esto de otra manera',
    retry: 'Reintentar',
    tryAgain: 'Int\u00e9ntelo otra vez',
    nextQuestion: 'Siguiente pregunta',
    seeNext: 'Ver la pr\u00f3xima lecci\u00f3n',
    correct: 'Correcto',
    incorrect: 'Todav\u00eda no',
    ungraded: 'Sin calificar',
    hintShown: 'Us\u00f3 una pista en esta pregunta.',
    aiFeedbackTag: 'Comentario de la IA, no una calificaci\u00f3n.',
    visualFraction: '{filled} de {parts} partes sombreadas',
    visualTokens: '{counted} de {count} contados',
    visualNumberline: 'Valor {value}, entre {min} y {max}',
    visualPassage: 'Oraci\u00f3n {n} de {total} seleccionada',
    visualPassageNone: 'Ninguna oraci\u00f3n seleccionada',
    fractionPartLabel: 'Parte {n} de {parts}',
    tokenLabel: 'Ficha {n}',
    sentenceLabel: 'Oraci\u00f3n {n}',
    tokensInstruction: 'Toque cada ficha para contarla. Tambi\u00e9n funcionan las flechas y la barra espaciadora.',
    fractionInstruction: 'Toque una parte para sombrear hasta ah\u00ed. Tambi\u00e9n funcionan las flechas y la barra espaciadora.',
    numberlineInstruction: 'Arrastre el control o use las flechas.',
    passageInstruction: 'Elija la oraci\u00f3n que responde a la pregunta.',
    sequenceInstruction: 'El diagrama completo est\u00e1 a la vista. Av\u00e1ncelo usted mismo: nada se reproduce solo.',
    visualSequence: 'Etapa {n} de {total}: {label}',
    seqPrev: 'Etapa anterior',
    seqNext: 'Etapa siguiente',
    seqStage: 'Etapa {n}',
    doneTitle: 'Lecci\u00f3n terminada',
    nextTitle: 'Pr\u00f3xima lecci\u00f3n sugerida',
    nextReinforce: 'Sugerencia: m\u00e1s pr\u00e1ctica',
    nextAdvance: 'Sugerencia: siguiente paso',
    launchNext: 'Comenzar esta lecci\u00f3n',
    newGoal: 'Poner otro objetivo',
    saveLabel: 'Guardar el progreso solo en este navegador (desactivado por defecto)',
    saveHint: 'La copia guardada se queda en esta computadora. Guardar no env\u00eda nada; generar una lecci\u00f3n s\u00ed.',
    savedState: 'Guardado en este navegador.',
    memoryState: 'Sin guardar. Este trabajo solo existe en esta pesta\u00f1a.',
    storageQuota: 'Este navegador ya no tiene espacio para guardar. El trabajo queda solo en esta pesta\u00f1a.',
    storageUnavailable: 'Este navegador bloque\u00f3 el guardado local. El trabajo queda solo en esta pesta\u00f1a.',
    storageCorrupt: 'No se pudo leer la lecci\u00f3n guardada anterior, as\u00ed que se dej\u00f3 intacta.',
    resumed: 'Se reanud\u00f3 su lecci\u00f3n guardada.',
    savedOtherAge: 'Aqu\u00ed sigue guardada una lecci\u00f3n de otra edad. No se abre con esta edad.',
    clearBlocked: 'Este navegador bloque\u00f3 el borrado. Los datos guardados siguen aqu\u00ed, as\u00ed que no se quit\u00f3 nada de esta pantalla.',
    rememberBlocked: 'Este navegador bloque\u00f3 guardar el perfil, as\u00ed que no se recuerda.',
    forgetBlocked: 'Este navegador bloque\u00f3 quitar el perfil guardado, as\u00ed que sigue recordado aqu\u00ed.',
    exportLabel: 'Descargar el registro',
    clearLabel: 'Borrar lo guardado',
    clearConfirmTitle: '\u00bfBorrar lo guardado?',
    clearConfirmBody: 'Esto elimina la lecci\u00f3n, las respuestas, la evidencia y el perfil recordado en este navegador. No se puede deshacer.',
    clearConfirm: 'S\u00ed, borrar',
    clearCancel: 'Conservar',
    cleared: 'Se borr\u00f3 el trabajo guardado.',
    evidenceTitle: 'Lo que pas\u00f3',
    evidenceEmpty: 'Las respuestas y la ayuda aparecen aqu\u00ed mientras trabaja.',
    evidenceAssisted: 'con ayuda',
    evidenceAlone: 'sin pedir ayuda',
    evidenceNote: 'Un registro de respuestas y ayuda. No es una medida de dominio y no puede mostrar el trabajo hecho fuera de esta pantalla.',
    errorTitle: 'La solicitud no se complet\u00f3',
    errorKept: 'Su respuesta y su avance siguen aqu\u00ed.',
    errorQuota: 'Esta sesi\u00f3n de prueba agot\u00f3 sus llamadas a la IA. Reinicie el servidor para hacer m\u00e1s.',
    errorGeneric: 'El proveedor no devolvi\u00f3 una lecci\u00f3n utilizable.',
    errorNetwork: 'El servidor local no respondi\u00f3.',
    errorMismatch: 'La lecci\u00f3n que lleg\u00f3 no se escribi\u00f3 para la edad ni el idioma solicitados, as\u00ed que no se mostr\u00f3.',
    disclosureTitle: 'Antes de empezar',
    // Banco de texto autorizado (TEACHING_PROMPTS.md secci\u00f3n 5), usado tal cual.
    disclose1: 'Tu objetivo de aprendizaje, la edad que escribes y todo lo que escribes en una lecci\u00f3n se env\u00edan a Anthropic para generar lecciones y comentarios.',
    disclose2: 'Tu nombre o apodo es una etiqueta local. Se queda en esta computadora y nunca se env\u00eda.',
    disclose3: 'La IA se equivoca. Revisa sus comentarios de matem\u00e1ticas y lectura.',
    disclose4: 'Guardar el progreso en este navegador est\u00e1 desactivado por defecto.',
    disclose5: 'No se usa c\u00e1mara ni micr\u00f3fono.',
    disclose6: 'Las lecciones generadas se guardan en una biblioteca de prueba privada en el servidor para reutilizar el mismo objetivo en vez de pagar otra llamada a la IA. Lo que escribe en el objetivo forma parte de esa lecci\u00f3n guardada; su nombre de perfil no se env\u00eda y no est\u00e1 ah\u00ed.',
    disclosureNote: 'Esto no es una verificaci\u00f3n de edad, un consentimiento parental ni una revisi\u00f3n de cumplimiento.',
    disclosureAck: 'Entiendo \u2014 continuar',
    skipToWork: 'Ir a la lecci\u00f3n',
    sourceNote: 'Texto de la lecci\u00f3n generado por {model} mediante {provider}.',
    sourceUnproved: 'Texto de la lecci\u00f3n generado mediante {provider}. El modelo solicitado fue {model}; no se confirm\u00f3 qu\u00e9 modelo respondi\u00f3 en realidad.',
    sourceCached: 'Reutilizada de la biblioteca de lecciones guardadas, generada por primera vez el {at}. No se hizo ninguna llamada nueva a la IA.',
    callsLeft: 'Quedan {n} llamadas a la IA en esta sesi\u00f3n del servidor.',
    actTitle: 'Actividad',
    actIdle: 'Nada en curso.',
    actRequestLesson: 'Solicitando la lecci\u00f3n',
    actRequestFeedback: 'Solicitando comentarios',
    actRequestHint: 'Solicitando una pista',
    actWaiting: 'Esperando al servidor local y a la respuesta de la IA',
    actReceived: 'Respuesta recibida',
    actValidating: 'Revisando la lecci\u00f3n en esta computadora',
    actReady: 'Lista',
    actFailed: 'La solicitud fall\u00f3 ({code})',
    actStopped: 'Se dej\u00f3 de esperar. El servidor puede terminar la solicitud; no se cancela nada en el proveedor.',
    actReset: 'Registro reiniciado.',
    actBound: 'El servidor permite una respuesta de hasta 180 segundos. Esto no promete que llegue.',
    actElapsed: '{n} s',
    actSaved: 'Guardada en la biblioteca de lecciones.',
    actSaveFailed: 'No se guard\u00f3 en la biblioteca de lecciones; el servidor no confirm\u00f3 el guardado.',
    actCached: 'Cargada de la biblioteca de lecciones guardadas (sin nueva llamada a la IA).',
    rateTitle: '\u00bfLe sirvi\u00f3 esta lecci\u00f3n?',
    rateUp: '\u{1F44D} S\u00ed, me sirvi\u00f3',
    rateDown: '\u{1F44E} No me sirvi\u00f3',
    rateCounts: 'Dijeron que sirvi\u00f3: {up} \u00b7 que no sirvi\u00f3: {down}',
    rateSemantics: 'Es un conteo de opiniones propias sobre si la lecci\u00f3n sirvi\u00f3. No prueba que algo se haya entendido ni recordado.',
    rateBusy: 'Guardando su opini\u00f3n\u2026',
    rateFailed: 'No se guard\u00f3 su opini\u00f3n, as\u00ed que no se cont\u00f3 nada.',
    rateRetry: 'Enviarlo otra vez',
    rateStorage: 'Este navegador bloque\u00f3 el guardado, as\u00ed que su voto solo se recuerda en esta pesta\u00f1a.',
    rateUnavailable: 'Esta lecci\u00f3n no tiene registro en la biblioteca del servidor, as\u00ed que no hay d\u00f3nde guardar una opini\u00f3n.',
    mdTitle: 'Detalles de la lecci\u00f3n',
    mdModelRequested: 'Modelo solicitado',
    mdModelConfigured: 'Modelo que esta aplicaci\u00f3n tiene configurado',
    mdModelRequestSent: 'Modelo indicado en la solicitud enviada',
    mdModelReported: 'Modelo que respondi\u00f3',
    mdCreated: 'Creada por primera vez',
    mdGenerationTime: 'Tiempo de generaci\u00f3n (segundos)',
    mdDevice: 'Dispositivo indicado',
    mdDeviceNote: 'El dispositivo es lo que el navegador indic\u00f3 sobre s\u00ed mismo, no hardware revisado.',
    mdInstructionsNote: 'Las instrucciones de ense\u00f1anza exactas que esta aplicaci\u00f3n envi\u00f3 para esta lecci\u00f3n.',
    mdSystem: 'Instrucci\u00f3n del sistema',
    mdTeaching: 'Gu\u00eda de ense\u00f1anza',
    mdLessonPrompt: 'Solicitud de la lecci\u00f3n',
    mdContract: 'Contrato de salida',
  },
};

export function t(locale, key, vars) {
  const table = STRINGS[locale] || STRINGS.en;
  let s = table[key] ?? STRINGS.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split('{' + k + '}').join(String(v));
  return s;
}

// ── visual state ────────────────────────────────────────────────────────────
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

export function initialVisualState(visual) {
  switch (visual.kind) {
    case 'fraction': return { filled: clamp(visual.filled, 0, visual.parts) };
    case 'numberline': return { value: clamp(visual.value, visual.min, visual.max) };
    case 'tokens': return { counted: [] };
    case 'passage': return { selected: null };
    case 'sequence': return { stage: 0 };
    default: return {};
  }
}

export function nextVisualState(visual, state, action) {
  switch (action.type) {
    case 'toggleFraction': {
      if (visual.kind !== 'fraction') return state;
      const i = Number(action.index);
      if (!Number.isInteger(i) || i < 0 || i >= visual.parts) return state;
      // Clicking part N shades exactly N parts. Clicking the last shaded part gives
      // one back, which is the only way down to zero — one rule, nothing to discover.
      const target = i + 1 === state.filled ? i : i + 1;
      return { filled: clamp(target, 0, visual.parts) };
    }
    case 'setRange': {
      if (visual.kind !== 'numberline') return state;
      const v = Number(action.value);
      if (!Number.isFinite(v)) return state;
      return { value: clamp(v, visual.min, visual.max) };
    }
    case 'toggleToken': {
      if (visual.kind !== 'tokens') return state;
      const i = Number(action.index);
      if (!Number.isInteger(i) || i < 0 || i >= visual.count) return state;
      const has = state.counted.includes(i);
      return { counted: has ? state.counted.filter(x => x !== i) : [...state.counted, i].sort((a, b) => a - b) };
    }
    case 'setStage': {
      if (visual.kind !== 'sequence') return state;
      const i = Number(action.index);
      if (!Number.isInteger(i)) return state;
      return { stage: clamp(i, 0, visual.stages.length - 1) };
    }
    case 'selectSentence': {
      if (visual.kind !== 'passage') return state;
      const i = Number(action.index);
      const total = splitSentences(visual.text).length;
      if (!Number.isInteger(i) || i < 0 || i >= total) return state;
      return { selected: state.selected === i ? null : i };
    }
    default: return state;
  }
}

export function splitSentences(text) {
  const s = String(text ?? '').trim();
  if (!s) return [];
  return s.match(/[^.!?]+[.!?]*/g)?.map(x => x.trim()).filter(Boolean) ?? [s];
}

export function visualCaption(visual, state, locale) {
  switch (visual.kind) {
    case 'fraction': return t(locale, 'visualFraction', { filled: state.filled, parts: visual.parts });
    case 'tokens': return t(locale, 'visualTokens', { counted: state.counted.length, count: visual.count });
    case 'numberline': return t(locale, 'visualNumberline', { value: state.value, min: visual.min, max: visual.max });
    case 'sequence': return t(locale, 'visualSequence', {
      n: state.stage + 1, total: visual.stages.length,
      label: visual.stages[state.stage]?.label ?? '',
    });
    case 'passage': return state.selected === null
      ? t(locale, 'visualPassageNone')
      : t(locale, 'visualPassage', { n: state.selected + 1, total: splitSentences(visual.text).length });
    default: return '';
  }
}

/** What the learner's manipulation says, as an answer string — numeric steps only. */
export function derivedAnswer(step, state) {
  if (step.kind !== 'numeric') return null;
  switch (step.visual.kind) {
    case 'fraction': return `${state.filled}/${step.visual.parts}`;
    case 'tokens': return String(state.counted.length);
    case 'numberline': return String(state.value);
    default: return null;
  }
}

// ── evidence ────────────────────────────────────────────────────────────────
const VERDICTS = new Set(['correct', 'incorrect', 'ungraded']);
const SOURCES = new Set(['local-check', 'ai-feedback']);

/** Which activity line a /api/lesson reply has EARNED. Never a claim the server
 *  did not make: `saved` must be literally true, and a cache hit is a cache hit
 *  even if the library block disagrees with itself. No library block -> silence. */
export function libraryActKey(out) {
  const lib = out?.library;
  if (!lib || typeof lib !== 'object') return null;
  if (lib.cached === true || out?.provenance?.cached === true) return 'actCached';
  return lib.saved === true ? 'actSaved' : 'actSaveFailed';
}

/** Footer sentences for a provenance object, as {key, vars} for `t()`. A cached
 *  lesson is never labelled fresh, and an unproved wire model is never credited
 *  as the author. Date only: the stored ISO stamp is not shown to the second. */
export function provenanceLines(prov) {
  const lines = [];
  if (prov?.model && prov?.provider) {
    lines.push({ key: prov.model_wire_proved === false ? 'sourceUnproved' : 'sourceNote',
      vars: { model: prov.model, provider: prov.provider } });
  }
  if (prov?.cached === true) {
    lines.push({ key: 'sourceCached', vars: { at: String(prov.generated_at || '').slice(0, 10) || '?' } });
  }
  return lines;
}

// ── lesson metadata + thumbs feedback ───────────────────────────────────────
// All pure, all exported, all tested. Everything here reads a server payload;
// nothing here measures, infers or scores learning.

const DEVICE_UNKNOWN = { browser: 'unknown', os: 'unknown', type: 'unknown' };

/**
 * Coarsen a user-agent into the three documented enums and nothing else.
 *
 * This reads `navigator.userAgent` only — a string the browser already sends on
 * every request. No new API is touched, so no permission is involved and there
 * is nothing here to fingerprint with: the whole output space is 7x8x4 buckets.
 * Unreadable or unrecognised input is `unknown`, never a guess.
 */
export function coarseDevice(nav) {
  let ua;
  // A hostile or locked-down navigator may throw on property access.
  try { ua = String(nav?.userAgent ?? ''); } catch { return { ...DEVICE_UNKNOWN }; }
  if (!ua) return { ...DEVICE_UNKNOWN };

  // Order matters: every Chromium browser also says "Safari", and Edge says both.
  const browser = /\bEdg[A-Z]?\//.test(ua) ? 'edge'
    : /\bFirefox\/|\bFxiOS\//.test(ua) ? 'firefox'
    : /\bChrome\/|\bCriOS\//.test(ua) ? 'chrome'
    : /\bSafari\//.test(ua) ? 'safari'
    : /Mozilla|Gecko|WebKit/.test(ua) ? 'other' : 'other';

  const os = /\bAndroid\b/.test(ua) ? 'android'
    : /\b(iPhone|iPad|iPod)\b/.test(ua) ? 'ios'
    : /\b(Macintosh|Mac OS X)\b/.test(ua) ? 'macos'
    : /\bWindows\b/.test(ua) ? 'windows'
    : /\b(Linux|X11|CrOS)\b/.test(ua) ? 'linux' : 'other';

  // Form factor from the UA's own words only. An Android tablet is the one real
  // case worth handling: Chrome drops "Mobile" from the token on tablets.
  const type = /\biPad\b/.test(ua) ? 'tablet'
    : /\bTablet\b/.test(ua) ? 'tablet'
    : /\bMobile\b/.test(ua) ? 'mobile'
    : os === 'android' ? 'tablet'
    : /Mozilla/.test(ua) ? 'desktop' : 'unknown';

  return { browser, os, type };
}

/** The feedback identity: a full 64-hex version id, never the short request key. */
export function libraryRecordId(out) {
  const id = out?.library?.recordId;
  return typeof id === 'string' && /^[0-9a-f]{64}$/.test(id) ? id : null;
}

/** What a click on `want` means given the vote already standing. */
export function nextVote(current, want) {
  return current === want ? null : want;
}

/** Server counts, or null. A missing/garbage block shows nothing rather than zeroes. */
export function normalizeFeedback(fb) {
  if (!fb || typeof fb !== 'object') return null;
  const int = (v) => (Number.isInteger(v) && v >= 0 ? v : null);
  const thumbsUp = int(fb.thumbsUp);
  const thumbsDown = int(fb.thumbsDown);
  if (thumbsUp === null || thumbsDown === null) return null;
  // `total` is recomputed: a server disagreeing with itself does not get to
  // publish an arithmetic claim through this UI.
  return { thumbsUp, thumbsDown, total: thumbsUp + thumbsDown, reportedHelpful: thumbsUp };
}

/** 128-bit lowercase hex, from the platform CSPRNG. Not derived from anything. */
export function makeVoterToken() {
  const b = new Uint8Array(16);
  globalThis.crypto.getRandomValues(b);
  return [...b].map((n) => n.toString(16).padStart(2, '0')).join('');
}

/** One slot per lesson version. Never a per-profile or per-device key. */
export function voterTokenKey(recordId) {
  return `lesson-workspace.vote.v1.${String(recordId).slice(0, 16)}`;
}

/** Fact rows for the details panel: {labelKey, value}, values already strings.
 *  A fact the server did not record is omitted, never filled in from a sibling
 *  field — the requested model must not be able to pose as the one that replied. */
export function metadataRows(md) {
  if (!md || typeof md !== 'object') return [];
  const rows = [];
  const str = (v) => (typeof v === 'string' && v.trim() ? v : null);
  const push = (labelKey, value) => { if (value != null) rows.push({ labelKey, value: String(value) }); };
  push('mdModelRequested', str(md.model?.requested));
  // Separate rows, never one back-filled from another. `configured` is what THIS
  // build selects, `requested` what the generation asked for, `requestSent` the name
  // on the outbound body, `reported` what the provider answered with. The old
  // `requested || configured` let a build default render as the asked-for identity
  // whenever `requested` was null — which `server.mjs` reaches on a real path.
  push('mdModelConfigured', str(md.model?.configured));
  push('mdModelRequestSent', str(md.model?.observedRequestModel));
  push('mdModelReported', str(md.model?.reported));
  push('mdCreated', str(md.createdAt)?.slice(0, 10));       // date only, as the footer already does
  const ms = md.timing?.generationMs;
  push('mdGenerationTime', Number.isFinite(ms) && ms >= 0 ? (ms / 1000).toFixed(1) : null);
  const d = md.device;
  if (d && [d.browser, d.os, d.type].every((v) => typeof v === 'string' && v)) {
    push('mdDevice', `${d.browser} / ${d.os} / ${d.type}`);
  }
  return rows;
}

/** The application's own teaching inputs, verbatim, as {labelKey, text}. */
export function instructionBlocks(md) {
  const ins = md?.instructions;
  if (!ins || typeof ins !== 'object') return [];
  return [
    ['mdSystem', ins.system], ['mdTeaching', ins.teachingGuidance],
    ['mdLessonPrompt', ins.lessonPrompt], ['mdContract', ins.contract],
  ].filter(([, v]) => typeof v === 'string' && v.trim())
    .map(([labelKey, text]) => ({ labelKey, text }));
}

export function makeEvidence({ lessonId, stepId, answer, verdict, assisted, source }) {
  if (!VERDICTS.has(verdict)) throw new Error('bad verdict: ' + verdict);
  if (!SOURCES.has(source)) throw new Error('bad source: ' + source);
  return {
    lessonId: String(lessonId),
    stepId: String(stepId),
    answer: String(answer ?? '').slice(0, 1500),
    verdict,
    assisted: Boolean(assisted),
    source,
    at: new Date().toISOString(),
  };
}

// ── profile ─────────────────────────────────────────────────────────────────
// One local profile. The name is a display label that never leaves this browser;
// the age is the only profile field a lesson request may carry. No account, no
// sign-in, no e-mail: there is nothing here to authenticate.
export const PROFILE_KEY = 'lesson-workspace.profile.v1';

/** Trim-then-bound. Returns typed errors, never a coerced "best effort" value. */
export function normalizeProfile(raw) {
  const name = String(raw?.name ?? '').trim();
  const rawAge = String(raw?.age ?? '').trim();
  const errors = {};
  if (name.length < 1 || name.length > 40) errors.name = 'profileNameError';
  // Deliberately strict: "7.5", "7e1", " 7 " with junk, "" are all rejected rather
  // than rounded into a silently different age than the learner typed.
  if (!/^\d{1,3}$/.test(rawAge)) errors.age = 'profileAgeError';
  const age = Number(rawAge);
  if (!errors.age && !(Number.isInteger(age) && age >= 1 && age <= 120)) errors.age = 'profileAgeError';
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, errors: {}, profile: { name, age } };
}

/** Own envelope, own key. Never reads or rewrites the lesson record. */
export function readProfile(text) {
  let raw;
  try { raw = JSON.parse(text); } catch { return null; }
  if (!raw || typeof raw !== 'object' || raw.v !== 1) return null;
  const res = normalizeProfile({ name: raw.name, age: raw.age });
  return res.ok ? res.profile : null;
}

export function saveProfile(store, profile) {
  if (!store) return false;
  try { store.setItem(PROFILE_KEY, JSON.stringify({ v: 1, ...profile })); return true; } catch { return false; }
}

export function loadProfile(store) {
  if (!store) return null;
  try { const text = store.getItem(PROFILE_KEY); return text == null ? null : readProfile(text); } catch { return null; }
}

export function clearProfile(store) {
  try { store?.removeItem(PROFILE_KEY); return true; } catch { return false; }
}

// ── persistence ─────────────────────────────────────────────────────────────
export const STORE_KEY = 'lesson-workspace.v1';
const EVIDENCE_CAP = 60;

/** `library` is a MINIMAL reference and strictly optional: only the recordId is
 *  ever written here, never the metadata or the counts (those live on the server
 *  and are re-read by id). No recordId means the key is absent entirely, so a
 *  record written by the previous version is byte-identical to one written now. */
export function makeRecord({ lesson, stepIndex, answers, assisted, evidence, next, library }) {
  const recordId = typeof library?.recordId === 'string' && /^[0-9a-f]{64}$/.test(library.recordId)
    ? library.recordId : null;
  const rec = {
    v: 1,
    lesson,
    stepIndex: Number(stepIndex) || 0,
    answers: { ...answers },
    assisted: { ...assisted },
    evidence: (evidence || []).slice(-EVIDENCE_CAP),
    next: next || null,
    at: new Date().toISOString(),
  };
  // Appended last and only when real, so key order is unchanged for old records.
  if (recordId) rec.library = { recordId };
  return rec;
}

export function readRecord(text) {
  let raw;
  try { raw = JSON.parse(text); } catch { return null; }
  if (!raw || typeof raw !== 'object' || raw.v !== 1) return null;
  try { validateLesson(raw.lesson); } catch { return null; }
  const rec = {
    v: 1,
    lesson: raw.lesson,
    stepIndex: Number(raw.stepIndex) || 0,
    answers: raw.answers && typeof raw.answers === 'object' ? raw.answers : {},
    assisted: raw.assisted && typeof raw.assisted === 'object' ? raw.assisted : {},
    evidence: Array.isArray(raw.evidence) ? raw.evidence.slice(-EVIDENCE_CAP) : [],
    next: raw.next && typeof raw.next === 'object' ? raw.next : null,
  };
  // An unvalidatable id in a hand-edited file is dropped, not carried forward.
  const recordId = raw.library?.recordId;
  if (typeof recordId === 'string' && /^[0-9a-f]{64}$/.test(recordId)) rec.library = { recordId };
  return rec;
}

export function saveRecord(store, record) {
  try {
    store.setItem(STORE_KEY, JSON.stringify(record));
    return { ok: true, mode: 'saved', reason: '' };
  } catch (err) {
    const quota = err && (err.name === 'QuotaExceededError' || err.code === 22 || /quota/i.test(err.message || ''));
    return { ok: false, mode: 'memory', reason: quota ? 'quota' : 'unavailable' };
  }
}

export function loadRecord(store) {
  if (!store) return { record: null, reason: 'unavailable' };
  let text;
  try { text = store.getItem(STORE_KEY); } catch { return { record: null, reason: 'unavailable' }; }
  if (text == null) return { record: null, reason: 'empty' };
  const rec = readRecord(text);
  // A record we cannot read is left on disk untouched; we never overwrite it blind.
  return rec ? { record: rec, reason: 'ok' } : { record: null, reason: 'corrupt' };
}

export function clearRecord(store) {
  try { store.removeItem(STORE_KEY); return true; } catch { return false; }
}

/**
 * The one rule that decides whether saved work may be shown under the active
 * profile. A v2 record states the age it was written for, so another age must
 * never open it. A legacy v1 record carries a grade and NO age: it is
 * age-agnostic and is never given an invented one.
 */
export function lessonFitsProfile(lesson, profile) {
  if (!lesson) return false;
  if (typeof lesson.age !== 'number') return true;
  return Boolean(profile) && profile.age === lesson.age;
}

/** Monotonic token: anything issued before a bump belongs to a replaced lesson. */
export function freshGuard() {
  let n = 1;
  return {
    get token() { return n; },
    bump() { n += 1; return n; },
    accepts(tok) { return tok === n; },
  };
}

// ── DOM ─────────────────────────────────────────────────────────────────────
// Everything past this point only runs in a browser.
const el = (tag, attrs = {}, kids = []) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === 'text') node.textContent = String(v);
    else if (k === 'class') node.className = v;
    else node.setAttribute(k, v === true ? '' : String(v));
  }
  for (const kid of [].concat(kids)) if (kid) node.append(kid);
  return node;
};

/**
 * Native append() stringifies null into a literal "null" text node. Every view
 * function here may legitimately return null for "nothing to show", so appending
 * to an existing node goes through this instead of append() directly.
 */
const put = (node, ...kids) => { for (const k of kids) if (k) node.append(k); return node; };

function safeStore() {
  try { const s = globalThis.localStorage; s.getItem(STORE_KEY); return s; } catch { return null; }
}

export function createApp(root, deps = {}) {
  const api = deps.api || defaultApi();
  const store = 'store' in deps ? deps.store : safeStore();

  const S = {
    locale: 'en',
    // One local profile. `name` is a display label and is never put in a request.
    profile: null,            // {name, age} once saved
    profileDraft: { name: '', age: '' },
    profileErrors: {},
    profileEditing: false,
    profileRemember: false,   // opt-in, off by default: tab memory otherwise
    ageConfirm: null,         // {name, age} pending an explicit discard decision
    setup: { goal: '', locale: 'en' },
    lesson: null,
    provenance: null,
    stepIndex: 0,
    visual: {},
    answers: {},        // stepId -> typed/derived answer, verbatim
    assisted: {},       // stepId -> true once help was requested
    results: {},        // stepId -> {verdict, text, tag, alternate}
    evidence: [],
    next: null,
    busy: null,         // 'lesson' | 'feedback' | 'hint'
    error: null,        // {where, message, retry}
    saveOn: false,
    storageMsg: '',
    profileStorageMsg: '',   // truth about the remembered-profile key only
    notice: '',
    acked: false,
    callsLeft: null,
    activity: [],       // tab memory only: never persisted, never exported
    // One generated lesson version's server-side facts, as the server reported
    // them. `rateVote` is this browser's own standing vote; `rateFeedback` is
    // only ever the server's confirmed counts, never a local prediction.
    recordId: null,
    metadata: null,
    rateVote: null,          // 'up' | 'down' | null
    rateFeedback: null,      // {thumbsUp, thumbsDown, total, reportedHelpful} | null
    rateBusy: false,
    rateError: false,
    rateStorageMsg: '',
    rateUnavailable: false,  // a lesson with no library record to attach to
  };
  let restartOpen = false;
  const guard = freshGuard();
  let inflight = null;
  // A saved record read from disk but NOT yet shown: it is only adopted once the
  // active profile is known, so work for another age cannot surface under it.
  let pending = null;
  // In-tab fallback for voter tokens when this browser blocks local storage.
  // Tab-scoped by construction: it dies with the page, and the UI says so.
  const memTokens = new Map();

  const tr = (k, v) => t(S.locale, k, v);

  // ---- state helpers
  const step = () => S.lesson?.steps[S.stepIndex] || null;
  const isCheck = () => S.lesson ? S.stepIndex === S.lesson.steps.length - 1 : false;

  function persist() {
    if (!S.saveOn || !store || !S.lesson) return;
    const res = saveRecord(store, makeRecord({
      lesson: S.lesson, stepIndex: S.stepIndex, answers: S.answers,
      assisted: S.assisted, evidence: S.evidence, next: S.next,
      // The existing remember control governs this too: nothing is written
      // unless the learner already opted into saving work, and even then it is
      // only the id needed to find the lesson's details again.
      library: S.recordId ? { recordId: S.recordId } : null,
    }));
    S.storageMsg = res.ok ? tr('savedState')
      : res.reason === 'quota' ? tr('storageQuota') : tr('storageUnavailable');
    if (!res.ok) S.saveOn = false;
  }

  function abortInflight() {
    if (inflight) { inflight.abort(); inflight = null; }
    S.busy = null;
  }

  /** Any new lesson / reset / cancel invalidates every response already in the air. */
  function invalidate() {
    abortInflight();
    // Honest: dropping the client's wait is all this does.
    if (actOp) endOp(actOp.id, 'actStopped');
    guard.bump();
  }

  // ---- activity log
  // Observed lifecycle, in this tab, bounded. No percentages, no estimate, no
  // provider internals, and no learner text: entries are fixed authored copy.
  const ACT_MAX = 40;
  let actOpen = false;
  let actOp = null;      // live operation {id, kind, t0}
  let actShown = null;   // {kind, secs} last reading, frozen when the op ends
  let actTimer = null;
  let actSeq = 0;

  const logAct = (text) => {
    S.activity = [...S.activity, { at: new Date().toTimeString().slice(0, 8), text }].slice(-ACT_MAX);
  };
  const stopActTimer = () => { if (actTimer) { clearInterval(actTimer); actTimer = null; } };

  /** One timer for the whole app; it patches a single text node, never re-renders. */
  function paintElapsed() {
    if (!actOp) return;
    actShown = { kind: actOp.kind, secs: Math.floor((Date.now() - actOp.t0) / 1000) };
    const node = root.querySelector('#act-elapsed');
    if (node) node.textContent = tr('actElapsed', { n: actShown.secs });
  }

  function startOp(kind) {
    stopActTimer();
    actOp = { id: ++actSeq, kind, t0: Date.now() };
    actShown = { kind, secs: 0 };
    actOpen = true;
    logAct(tr(kind === 'lesson' ? 'actRequestLesson' : kind === 'hint' ? 'actRequestHint' : 'actRequestFeedback'));
    logAct(tr('actWaiting'));
    actTimer = setInterval(paintElapsed, 1000);
    return actOp.id;
  }

  /** Mid-flight note; a reply from a replaced operation is dropped. */
  const noteOp = (id, key) => { if (actOp && actOp.id === id) logAct(tr(key)); };

  /** Terminal entry, logged once per operation. Stale callbacks cannot overwrite. */
  function endOp(id, key, vars) {
    if (!actOp || actOp.id !== id) return false;
    paintElapsed();
    stopActTimer();
    actOp = null;
    logAct(tr(key, vars));
    return true;
  }

  /** Privacy-safe, typed. Never the provider's or server's own message text. */
  function errCode(err) {
    if (err?.mismatch) return 'metadata-mismatch';
    if (err?.quota) return 'quota, http 429';
    const m = /^http (\d{3})$/.exec(String(err?.message || ''));
    if (m) return 'http ' + m[1];
    return String(err?.message) === 'network' ? 'no-server-response' : 'invalid-response';
  }

  // ---- actions
  async function generate(previous) {
    const goal = previous ? previous.goal : S.setup.goal.trim();
    if (!goal || !S.profile) return;
    invalidate();
    const tok = guard.token;
    // Exactly the contract fields. No subject, no grade, and never the profile
    // label: the only profile value a provider sees is the age.
    const req = {
      adultTest: true,
      age: S.profile.age,
      goal: goal.slice(0, 300),
      locale: S.setup.locale,
      // Three coarse enums from the user-agent the browser already sends. The
      // server records it as client-reported; it is not part of the cache key.
      device: coarseDevice(globalThis.navigator),
      ...(previous ? { previous } : {}),
    };
    const keep = { lesson: S.lesson, prov: S.provenance };
    S.busy = 'lesson'; S.error = null; S.notice = '';
    const opId = startOp('lesson'); render();
    inflight = new AbortController();
    try {
      const out = await api.lesson(req, inflight.signal);
      if (!guard.accepts(tok)) return;            // replaced; drop it
      noteOp(opId, 'actReceived');
      noteOp(opId, 'actValidating');              // local, on this computer
      const lesson = validateLesson(out.lesson);
      // Shape alone is not enough: a lesson written for a different age or language
      // than this request asked for is rejected, never shown.
      if (lesson.version !== 2 || lesson.age !== req.age || lesson.locale !== req.locale) {
        const e = new Error('metadata-mismatch'); e.mismatch = true; throw e;
      }
      S.lesson = lesson;
      S.provenance = out.provenance || null;
      S.locale = lesson.locale;
      S.stepIndex = 0;
      S.visual = initialVisualState(lesson.steps[0].visual);
      S.answers = {}; S.assisted = {}; S.results = {};
      S.evidence = []; S.next = null; S.error = null;
      adoptLibrary(out.library);
      if (typeof out.callsLeft === 'number') S.callsLeft = out.callsLeft;
      // What the server said about its own library, before Ready. Only what it said.
      const libKey = libraryActKey(out);
      if (libKey) noteOp(opId, libKey);
      endOp(opId, 'actReady');
      persist();
    } catch (err) {
      if (err?.name === 'AbortError' || !guard.accepts(tok)) return;
      // Keep the previous good lesson and whatever was typed into it.
      S.lesson = keep.lesson; S.provenance = keep.prov;
      S.error = { where: 'lesson', message: errorText(err), retry: () => generate(previous) };
      endOp(opId, 'actFailed', { code: errCode(err) });
    } finally {
      if (guard.accepts(tok)) { S.busy = null; inflight = null; render(); }
    }
  }

  function setAnswer(value) {
    const st = step(); if (!st) return;
    S.answers[st.id] = String(value).slice(0, 1500);
  }

  async function askFeedback(mode) {
    const st = step(); if (!st || S.busy) return;
    const tok = guard.token;
    const lessonId = S.lesson.id;
    const answer = S.answers[st.id] ?? '';
    if (mode === 'hint') S.assisted[st.id] = true;
    S.busy = mode === 'hint' ? 'hint' : 'feedback';
    S.error = null;
    const opId = startOp(mode === 'hint' ? 'hint' : 'feedback'); render();
    inflight = new AbortController();
    try {
      const out = await api.feedback({
        adultTest: true, lesson: S.lesson, stepId: st.id,
        answer: String(answer).slice(0, 1500), mode,
        priorHints: Math.min(5, countHints(st.id)),
      }, inflight.signal);
      // Guard first, then identity: a late reply must not land on a new lesson.
      if (!guard.accepts(tok) || S.lesson?.id !== lessonId) return;
      noteOp(opId, 'actReceived');
      const fb = out.feedback || {};
      const local = st.kind === 'writing' ? null : gradeAnswer(st, answer);
      // Local correctness is canonical; the model never overrides it.
      const verdict = st.kind === 'writing' ? 'ungraded' : (local?.verdict ?? 'ungraded');
      S.results[st.id] = {
        verdict,
        text: String(fb.text ?? ''),
        alternate: String(fb.alternateExplanation ?? ''),
        tag: st.kind === 'writing' ? tr('aiFeedbackTag') : '',
        mode,
      };
      if (mode === 'answer') {
        S.evidence = [...S.evidence, makeEvidence({
          lessonId, stepId: st.id, answer, verdict,
          assisted: Boolean(S.assisted[st.id]), source: 'ai-feedback',
        })];
        if (isCheck()) S.next = chooseNext(S.lesson, S.evidence);
      }
      if (typeof out.callsLeft === 'number') S.callsLeft = out.callsLeft;
      endOp(opId, 'actReady');
      persist();
    } catch (err) {
      if (err?.name === 'AbortError' || !guard.accepts(tok) || S.lesson?.id !== lessonId) return;
      S.error = { where: st.id, message: errorText(err), retry: () => askFeedback(mode) };
      endOp(opId, 'actFailed', { code: errCode(err) });
    } finally {
      if (guard.accepts(tok) && S.lesson?.id === lessonId) { S.busy = null; inflight = null; render(); }
    }
  }

  function countHints(stepId) {
    return S.evidence.filter(e => e.stepId === stepId && e.assisted).length;
  }

  // ---- lesson details + thumbs feedback
  // The server owns the counts. This client reads them, sends explicit votes and
  // renders what came back. It never increments, estimates or predicts a count.

  /** Reset the per-version feedback slice, then take whatever the reply earned. */
  function adoptLibrary(library) {
    S.recordId = null; S.metadata = null; S.rateFeedback = null;
    S.rateVote = null; S.rateBusy = false; S.rateError = false;
    S.rateStorageMsg = ''; S.rateUnavailable = false;
    const recordId = libraryRecordId({ library });
    if (!recordId) {
      // An older lesson with no library record: say so if asked, never fake a
      // zero-vote tally that would read as "nobody found this helpful".
      S.rateUnavailable = Boolean(library);
      return;
    }
    S.recordId = recordId;
    S.metadata = library.metadata && typeof library.metadata === 'object' ? library.metadata : null;
    S.rateFeedback = normalizeFeedback(library.feedback);
    // The direction is NOT inferred from the token. A token proves this browser voted
    // once on this version; only the server can say which way. `null` here means
    // "unknown", and an unknown vote renders as neither thumb pressed.
    S.rateVote = callerVote(library);
    // A token with no direction in this reply: ask the server for the caller's own
    // standing vote. Without this the counts restore and the thumb does not, so a
    // returning learner sees a tally they contributed to with nothing pressed.
    if (!S.rateVote && readVote(recordId)) void loadCallerVote(recordId);
  }

  /** The caller's own vote in a reply, or null. Only the two real directions count. */
  function callerVote(src) {
    return src?.callerVote === 'up' || src?.callerVote === 'down' ? src.callerVote : null;
  }

  /**
   * Ask the library which way THIS browser's token voted on this version.
   *
   * Separate from loadLibraryDetails because the two have different failure
   * meanings: a missing record makes the details unavailable, while an unavailable
   * direction is simply unknown and must leave the lesson, its metadata and its
   * counts exactly as they are.
   */
  async function loadCallerVote(recordId) {
    const token = readVote(recordId);
    if (!token || !api.lessonLibrary) return;
    const tok = guard.token;
    const lessonId = S.lesson?.id;
    let vote = null;
    try {
      vote = callerVote(await api.lessonLibrary(recordId, token));
    } catch {
      return;                 // unknown stays unknown: no thumb, no invented direction
    }
    // Same staleness rule as every other late reply.
    if (!vote || !guard.accepts(tok) || S.lesson?.id !== lessonId || S.recordId !== recordId) return;
    S.rateVote = vote;
    render();
  }

  /** The stored token for a version, or null. Reading never creates one. */
  function readVote(recordId) {
    if (!store) return memTokens.get(recordId) || null;
    try { return store.getItem(voterTokenKey(recordId)) || memTokens.get(recordId) || null; }
    catch { return memTokens.get(recordId) || null; }
  }

  /**
   * The token for this version, created on first explicit vote only. A browser
   * that blocks storage still votes — the token lives in this tab and the notice
   * says so, rather than silently pretending the vote will be remembered.
   */
  function ensureVoterToken(recordId) {
    const existing = readVote(recordId);
    if (existing) return existing;
    const token = makeVoterToken();
    memTokens.set(recordId, token);
    try { store?.setItem(voterTokenKey(recordId), token); }
    catch { S.rateStorageMsg = tr('rateStorage'); }
    if (!store) S.rateStorageMsg = tr('rateStorage');
    return token;
  }

  /**
   * Send one explicit vote. Clicking the standing vote again removes it.
   *
   * Nothing moves on screen until the server confirms: no optimistic pressed
   * state and no optimistic count, because a failed post that left a "1" behind
   * would be the UI inventing feedback that does not exist anywhere.
   */
  async function vote(want) {
    const recordId = S.recordId;
    if (!recordId || S.rateBusy) return;
    const tok = guard.token;
    const lessonId = S.lesson?.id;
    const target = nextVote(S.rateVote, want);
    const voterToken = ensureVoterToken(recordId);
    S.rateBusy = true; S.rateError = false;
    render();
    try {
      const out = await api.lessonRating({ adultTest: true, recordId, vote: target, voterToken });
      // Same guard as every other late reply: a replaced lesson or a changed
      // profile means this answer belongs to a screen that no longer exists.
      if (!guard.accepts(tok) || S.lesson?.id !== lessonId || S.recordId !== recordId) return;
      if (out?.ok !== true) throw new Error('invalid-response');
      S.rateVote = out.vote === 'up' || out.vote === 'down' ? out.vote : null;
      const fb = normalizeFeedback(out.feedback);
      if (fb) S.rateFeedback = fb;          // absent counts leave the last confirmed ones alone
      S.rateError = false;
    } catch (err) {
      if (err?.name === 'AbortError' || !guard.accepts(tok) || S.lesson?.id !== lessonId) return;
      // The vote did not land, so the vote did not happen: state stays as it was.
      S.rateError = true;
      S.lastVoteWant = want;
    } finally {
      if (guard.accepts(tok) && S.lesson?.id === lessonId && S.recordId === recordId) {
        S.rateBusy = false; render();
      }
    }
  }

  /** Re-read a restored lesson's details by the recordId that was saved locally. */
  async function loadLibraryDetails(recordId) {
    if (!recordId || !api.lessonLibrary) return;
    const tok = guard.token;
    const lessonId = S.lesson?.id;
    try {
      // The token, when this browser has one, so the same round-trip returns the
      // caller's own standing vote. A browser that never voted sends nothing.
      const out = await api.lessonLibrary(recordId, readVote(recordId) || undefined);
      if (!guard.accepts(tok) || S.lesson?.id !== lessonId || S.recordId !== recordId) return;
      S.metadata = out?.metadata && typeof out.metadata === 'object' ? out.metadata : null;
      S.rateFeedback = normalizeFeedback(out?.feedback);
      // Absent means unknown, so a reply without a direction clears nothing it did
      // not establish — but it never invents one either.
      const mine = callerVote(out);
      if (mine) S.rateVote = mine;
    } catch {
      // A 404 (or any failure) means the details are unavailable. Nothing is
      // invented: no metadata panel and no tally drawn as zeroes.
      if (!guard.accepts(tok) || S.lesson?.id !== lessonId) return;
      S.metadata = null; S.rateFeedback = null;
      S.recordId = null; S.rateUnavailable = true;
    }
    if (guard.accepts(tok) && S.lesson?.id === lessonId) render();
  }

  /** Local grade first. Correct answers cost nothing; errors and writing go live. */
  async function submit() {
    const st = step(); if (!st || S.busy) return;
    const answer = S.answers[st.id] ?? '';
    if (st.kind === 'writing') { await askFeedback('answer'); return; }
    if (!String(answer).trim()) return;
    const local = gradeAnswer(st, answer);
    if (local.verdict === 'correct') {
      S.results[st.id] = { verdict: 'correct', text: st.explanation, alternate: '', tag: '', mode: 'local' };
      S.evidence = [...S.evidence, makeEvidence({
        lessonId: S.lesson.id, stepId: st.id, answer, verdict: 'correct',
        assisted: Boolean(S.assisted[st.id]), source: 'local-check',
      })];
      if (isCheck()) S.next = chooseNext(S.lesson, S.evidence);
      persist(); render();
      return;
    }
    // Incorrect or unparseable: ask for a real, response-specific explanation.
    await askFeedback('answer');
  }

  function advance() {
    if (!S.lesson || S.stepIndex >= S.lesson.steps.length - 1) return;
    S.stepIndex += 1;
    S.visual = initialVisualState(step().visual);
    S.error = null;
    persist(); render();
  }

  function visualAction(action) {
    const st = step(); if (!st) return;
    S.visual = nextVisualState(st.visual, S.visual, action);
    const derived = derivedAnswer(st, S.visual);
    if (derived !== null) S.answers[st.id] = derived;
    render();
  }

  function exportRecord() {
    const payload = JSON.stringify(makeRecord({
      lesson: S.lesson, stepIndex: S.stepIndex, answers: S.answers,
      assisted: S.assisted, evidence: S.evidence, next: S.next,
    }), null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    const a = el('a', { href: url, download: `learning-record-${S.lesson?.id || 'none'}.json` });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function clearSaved() {
    invalidate();                     // a late reply cannot restore what was deleted
    // A refused delete leaves the data on disk. Saying "deleted" and emptying the
    // screen would make the UI disagree with the disk, so a failure keeps both.
    const removed = store ? (clearRecord(store) && clearProfile(store)) : true;
    if (!removed) {
      S.storageMsg = tr('clearBlocked');
      S.notice = '';
      render();
      return;
    }
    S.profile = null; S.profileRemember = false; S.profileEditing = false;
    S.profileDraft = { name: '', age: '' }; S.profileErrors = {}; S.ageConfirm = null;
    S.lesson = null; S.provenance = null; S.stepIndex = 0; S.visual = {};
    S.answers = {}; S.assisted = {}; S.results = {}; S.evidence = [];
    S.next = null; S.error = null; S.saveOn = false;
    S.setup = { ...S.setup, goal: '' };
    // The local reference to the server's library record goes with the rest of
    // the local state. The server's own copy is NOT deleted by this control, and
    // the confirm copy does not claim it is.
    adoptLibrary(null);
    for (const id of memTokens.keys()) { try { store?.removeItem(voterTokenKey(id)); } catch { /* left as-is */ } }
    memTokens.clear();
    S.storageMsg = ''; S.profileStorageMsg = ''; S.notice = tr('cleared');
    pending = null;
    S.activity = []; actShown = null; logAct(tr('actReset'));   // the cleared op leaves no frozen reading
    render();
  }

  /** Read the saved record. Nothing is shown here: adoption needs a profile. */
  function readSaved() {
    const { record, reason } = loadRecord(store);
    pending = record || null;
    if (reason === 'corrupt') {
      S.storageMsg = tr('storageCorrupt');
    } else if (reason === 'unavailable') {
      S.storageMsg = tr('storageUnavailable');
    }
  }

  /**
   * Adopt the saved record into the view, if the active profile may open it.
   * Called from every path that establishes or changes the active profile, so the
   * resume rule lives here once instead of in each caller.
   */
  function adoptSaved() {
    const record = pending;
    if (!record || S.lesson) return;
    if (!lessonFitsProfile(record.lesson, S.profile)) {
      // Left on disk untouched: a wrong age is a reason not to open it, not to delete it.
      S.storageMsg = tr('savedOtherAge');
      return;
    }
    pending = null;
    S.lesson = record.lesson; S.stepIndex = record.stepIndex;
    S.answers = record.answers; S.assisted = record.assisted;
    S.evidence = record.evidence; S.next = record.next;
    S.locale = record.lesson.locale;
    // A v1 record carries a grade and no age; nothing here back-fills one.
    S.setup = { goal: record.lesson.goal, locale: record.lesson.locale };
    S.visual = initialVisualState(record.lesson.steps[S.stepIndex]?.visual || record.lesson.steps[0].visual);
    S.saveOn = true; S.storageMsg = tr('savedState'); S.notice = tr('resumed');
    // A saved record may carry the id of its server library record. The details
    // and the counts are re-read from the server; neither was stored here.
    const recordId = record.library?.recordId || null;
    if (recordId) { S.recordId = recordId; void loadLibraryDetails(recordId); }
  }

  /** Whitelist of typed outcomes, each with authored EN/ES copy. A provider or
   *  server message is never trusted into learner-facing text; the technical code
   *  stays in the Activity log, which is typed too. */
  const ERROR_COPY = { quota: 'errorQuota', network: 'errorNetwork', mismatch: 'errorMismatch', generic: 'errorGeneric' };
  function errorKind(err) {
    if (err?.quota) return 'quota';
    if (err?.mismatch) return 'mismatch';
    if (String(err?.message) === 'network') return 'network';
    return 'generic';
  }
  function errorText(err) { return tr(ERROR_COPY[errorKind(err)]); }

  // ---- views
  function viewDisclosure() {
    const lines = el('ul', { class: 'lw-gate-body' });
    for (const k of ['disclose1', 'disclose2', 'disclose3', 'disclose4', 'disclose5', 'disclose6']) {
      lines.append(el('li', { text: tr(k) }));
    }
    return el('section', { class: 'lw-gate', 'aria-labelledby': 'gate-h' }, [
      el('h1', { id: 'gate-h', text: tr('disclosureTitle') }),
      lines,
      el('p', { class: 'lw-fine', text: tr('disclosureNote') }),
      el('button', { class: 'lw-btn lw-primary', type: 'button', id: 'ack', text: tr('disclosureAck') }),
    ]);
  }

  /** Apply a validated profile. An age change is the only thing that can cost work. */
  function commitProfile(next, { discardLesson }) {
    const renamedOnly = S.profile && S.profile.age === next.age;
    const ageChanged = !S.profile || S.profile.age !== next.age;
    S.profile = next;
    S.profileDraft = { name: next.name, age: String(next.age) };
    S.profileErrors = {};
    S.profileEditing = false;
    S.ageConfirm = null;
    if (!renamedOnly) {
      // Any pending reply belongs to the old age; a late arrival must not render.
      invalidate();
      if (discardLesson) {
        // Only work actually in view is discarded. A record read from disk but not
        // yet adopted is not the learner's current work: whether it may open is the
        // age gate's decision below, so it stays on disk and in `pending`.
        if (S.lesson) {
          // Durable: an in-memory clear alone lets the old lesson come back on reload.
          // A refused delete is reported rather than silently forgotten.
          S.storageMsg = store && !clearRecord(store) ? tr('clearBlocked') : '';
          pending = null;
          S.lesson = null; S.provenance = null; S.stepIndex = 0; S.visual = {};
          S.answers = {}; S.assisted = {}; S.results = {}; S.evidence = [];
          S.next = null; S.error = null; S.saveOn = false;
        }
      }
    }
    // Adoption first, then the profile write: a refused write is the newer and more
    // urgent storage fact, so its message must not be overwritten by "Saved".
    // Entering or re-entering a compatible profile is what opens saved work.
    if (ageChanged || !S.lesson) adoptSaved();
    if (S.profileRemember && !saveProfile(store, next)) {
      // Nothing was stored, so nothing is remembered: the switch must agree.
      S.profileRemember = false;
      S.storageMsg = tr('rememberBlocked');
    }
    render();
    // Renaming returns you where you were; a fresh or re-aged profile wants the goal.
    const target = renamedOnly ? '#profile-edit' : (S.lesson ? '#typed' : '#goal');
    root.querySelector(target)?.focus();
  }

  function submitProfile() {
    const res = normalizeProfile(S.profileDraft);
    if (!res.ok) { S.profileErrors = res.errors; render(); return; }
    // An active lesson was written for the old age: discarding it is the learner's call.
    if (S.profile && S.profile.age !== res.profile.age && S.lesson) {
      S.ageConfirm = res.profile; render();
      root.querySelector('#age-yes')?.focus();
      return;
    }
    commitProfile(res.profile, { discardLesson: true });
  }

  function viewProfile() {
    const editing = Boolean(S.profile);
    const err = S.profileErrors;

    const name = el('input', {
      type: 'text', id: 'profile-name', class: 'lw-input', maxlength: 60,
      autocomplete: 'off',
      'aria-describedby': 'profile-name-hint' + (err.name ? ' profile-name-err' : ''),
      'aria-invalid': err.name ? 'true' : false,
    });
    name.value = S.profileDraft.name;
    name.addEventListener('input', () => { S.profileDraft.name = name.value; });

    // Native number input: the platform keypad and stepper, no custom widget.
    const age = el('input', {
      type: 'number', id: 'profile-age', class: 'lw-input lw-age', min: 1, max: 120, step: 1,
      inputmode: 'numeric', autocomplete: 'off',
      'aria-describedby': 'profile-age-hint' + (err.age ? ' profile-age-err' : ''),
      'aria-invalid': err.age ? 'true' : false,
    });
    age.value = S.profileDraft.age;
    age.addEventListener('input', () => { S.profileDraft.age = age.value; });

    const remember = el('input', { type: 'checkbox', id: 'profile-remember', class: 'lw-check' });
    remember.checked = S.profileRemember;      // off by default
    remember.addEventListener('change', () => {
      // The switch reflects what is actually on disk. A refused write or delete
      // puts it back and says so, rather than showing a state that is not real.
      const want = remember.checked;
      S.profileStorageMsg = '';
      if (want) {
        if (!S.profile) S.profileRemember = true;            // saved on submit
        else if (saveProfile(store, S.profile)) S.profileRemember = true;
        else { S.profileRemember = false; S.profileStorageMsg = tr('rememberBlocked'); }
      } else if (clearProfile(store)) {
        S.profileRemember = false;
      } else {
        S.profileRemember = true; S.profileStorageMsg = tr('forgetBlocked');
      }
      render();
    });

    // novalidate on purpose: min/max/step stay as keypad + assistive-tech hints, but
    // native constraint validation must not swallow the submit event — if it does, the
    // browser shows an unlocalized bubble and this form's own EN/ES errors never run.
    const form = el('form', { class: 'lw-profile', id: 'profile', novalidate: true, 'aria-labelledby': 'profile-h' }, [
      el('h2', { id: 'profile-h', text: tr('profileTitle') }),
      el('div', { class: 'lw-field' }, [
        el('label', { for: 'profile-name', text: tr('profileNameLabel') }), name,
        el('p', { id: 'profile-name-hint', class: 'lw-fine', text: tr('profileNameHint') }),
        err.name ? el('p', { id: 'profile-name-err', class: 'lw-field-err', role: 'alert', text: tr(err.name) }) : null,
      ]),
      el('div', { class: 'lw-field' }, [
        el('label', { for: 'profile-age', text: tr('profileAgeLabel') }), age,
        el('p', { id: 'profile-age-hint', class: 'lw-fine', text: tr('profileAgeHint') }),
        err.age ? el('p', { id: 'profile-age-err', class: 'lw-field-err', role: 'alert', text: tr(err.age) }) : null,
      ]),
      el('div', { class: 'lw-save' }, [
        el('label', { class: 'lw-check-row', for: 'profile-remember' }, [remember, el('span', { text: tr('profileRemember') })]),
        el('p', { class: 'lw-fine', text: tr('profileRememberHint') }),
        S.profileStorageMsg
          ? el('p', { class: 'lw-fine lw-storage', id: 'profile-storage-msg', role: 'alert', text: S.profileStorageMsg })
          : null,
      ]),
      el('div', { class: 'lw-actions' }, [
        el('button', { type: 'submit', class: 'lw-btn lw-primary', id: 'profile-save', text: editing ? tr('profileUpdate') : tr('profileSave') }),
        editing ? el('button', { type: 'button', class: 'lw-btn', id: 'profile-cancel', text: tr('profileCancelEdit') }) : null,
      ]),
      el('p', { class: 'lw-fine', text: tr('profileNoAccount') }),
    ]);
    form.addEventListener('submit', (e) => { e.preventDefault(); submitProfile(); });
    form.querySelector('#profile-cancel')?.addEventListener('click', () => {
      S.profileEditing = false; S.profileErrors = {};
      S.profileDraft = { name: S.profile.name, age: String(S.profile.age) };
      render(); root.querySelector('#profile-edit')?.focus();
    });
    return form;
  }

  /** The identity line: a local label plus the way back into the form. */
  function viewProfileBar() {
    const row = el('div', { class: 'lw-who' }, [
      el('p', { class: 'lw-who-name', id: 'profile-who', text: tr('profileWho', { name: S.profile.name, age: S.profile.age }) }),
      el('button', { type: 'button', class: 'lw-btn lw-quiet', id: 'profile-edit', text: tr('profileEdit') }),
    ]);
    row.querySelector('#profile-edit').addEventListener('click', () => {
      S.profileEditing = true; S.profileErrors = {};
      S.profileDraft = { name: S.profile.name, age: String(S.profile.age) };
      render(); root.querySelector('#profile-name')?.focus();
    });
    return row;
  }

  function viewAgeConfirm() {
    const box = el('div', { class: 'lw-confirm', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'age-h' }, [
      el('h2', { id: 'age-h', text: tr('ageConfirmTitle') }),
      el('p', { text: tr('ageConfirmBody', { old: S.profile.age, age: S.ageConfirm.age }) }),
      el('div', { class: 'lw-actions' }, [
        el('button', { type: 'button', class: 'lw-btn lw-danger', id: 'age-yes', text: tr('ageConfirmYes') }),
        el('button', { type: 'button', class: 'lw-btn', id: 'age-no', text: tr('ageConfirmNo') }),
      ]),
    ]);
    box.querySelector('#age-yes').addEventListener('click', () => commitProfile(S.ageConfirm, { discardLesson: true }));
    // Declining keeps the lesson, the old age, and the work inside it.
    box.querySelector('#age-no').addEventListener('click', () => {
      S.ageConfirm = null; S.profileEditing = false; S.profileErrors = {};
      S.profileDraft = { name: S.profile.name, age: String(S.profile.age) };
      render(); root.querySelector('#profile-edit')?.focus();
    });
    return el('div', { class: 'lw-scrim' }, [box]);
  }

  function viewSetup() {
    const goal = el('textarea', {
      id: 'goal', maxlength: 300, rows: 2, class: 'lw-input',
      placeholder: tr('goalPlaceholder'), 'aria-describedby': 'goal-hint',
    });
    goal.value = S.setup.goal;
    goal.addEventListener('input', () => { S.setup.goal = goal.value; syncGenerate(); });

    const locale = el('select', { id: 'locale', class: 'lw-input', 'aria-describedby': 'locale-note' });
    for (const [v, label] of [['en', 'English'], ['es', 'Espa\u00f1ol']]) {
      const o = el('option', { value: v, text: label });
      if (S.setup.locale === v) o.selected = true;
      locale.append(o);
    }
    // Locale changes the NEXT generated lesson. Nothing on screen is retranslated.
    locale.addEventListener('change', () => { S.setup.locale = locale.value; render(); });

    const go = el('button', {
      class: 'lw-btn lw-primary', type: 'submit', id: 'generate',
      text: S.busy === 'lesson' ? tr('generating') : tr('generate'),
      disabled: S.busy === 'lesson' || !S.setup.goal.trim(),
    });
    function syncGenerate() {
      go.disabled = S.busy === 'lesson' || !S.setup.goal.trim();
    }

    const form = el('form', { class: 'lw-setup', id: 'setup', 'aria-labelledby': 'setup-h' }, [
      el('h2', { id: 'setup-h', text: tr('setupTitle') }),
      el('div', { class: 'lw-field lw-goal' }, [
        el('label', { for: 'goal', text: tr('goalLabel') }), goal,
        el('p', { id: 'goal-hint', class: 'lw-fine', text: tr('goalHint') }),
      ]),
      el('div', { class: 'lw-row' }, [
        el('div', { class: 'lw-field' }, [el('label', { for: 'locale', text: tr('localeLabel') }), locale]),
      ]),
      el('p', { id: 'locale-note', class: 'lw-fine', text: tr('localeNote') }),
      el('div', { class: 'lw-actions' }, [
        go,
        S.busy === 'lesson'
          ? el('button', { class: 'lw-btn', type: 'button', id: 'cancel', text: tr('cancel') })
          : null,
      ]),
    ]);
    form.addEventListener('submit', (e) => { e.preventDefault(); if (!go.disabled) generate(null); });
    const cancelBtn = form.querySelector('#cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', () => { invalidate(); render(); });
    return form;
  }

  function viewVisual(st) {
    const v = st.visual;
    const stage = el('div', { class: 'lw-stage', 'data-kind': v.kind });
    const liveCaption = el('p', {
      class: 'lw-stage-state', id: 'stage-state',
      'aria-live': 'polite', text: visualCaption(v, S.visual, S.locale),
    });

    if (v.kind === 'fraction') {
      stage.append(el('p', { class: 'lw-stage-how', text: tr('fractionInstruction') }));
      const bar = el('div', { class: 'lw-fraction', role: 'group', 'aria-label': v.caption });
      for (let i = 0; i < v.parts; i++) {
        const on = i < S.visual.filled;
        const part = el('button', {
          type: 'button', class: 'lw-part', 'data-i': i, 'aria-pressed': on ? 'true' : 'false',
          'aria-label': tr('fractionPartLabel', { n: i + 1, parts: v.parts }),
        });
        part.addEventListener('click', () => visualAction({ type: 'toggleFraction', index: i }));
        bar.append(part);
      }
      stage.append(bar);
    } else if (v.kind === 'numberline') {
      stage.append(el('p', { class: 'lw-stage-how', text: tr('numberlineInstruction') }));
      const stepSize = (v.max - v.min) <= 20 ? 1 : (v.max - v.min) / 20;
      const range = el('input', {
        type: 'range', class: 'lw-range', id: 'numberline',
        min: v.min, max: v.max, step: stepSize, 'aria-label': v.caption,
        'aria-describedby': 'stage-state',
      });
      range.value = String(S.visual.value);
      // Dragging must not rebuild and steal focus; patch the DOM in place.
      range.addEventListener('input', () => {
        S.visual = nextVisualState(v, S.visual, { type: 'setRange', value: range.value });
        const derived = derivedAnswer(st, S.visual);
        if (derived !== null) {
          S.answers[st.id] = derived;
          const live = root.querySelector('#typed');
          if (live && live.value !== derived) live.value = derived;
        }
        liveCaption.textContent = visualCaption(v, S.visual, S.locale);
        const ticksNow = root.querySelector('.lw-ticks');
        if (ticksNow) ticksNow.setAttribute('data-value', String(S.visual.value));
      });
      const ticks = el('div', { class: 'lw-ticks', 'aria-hidden': 'true', 'data-value': String(S.visual.value) });
      const span = Math.max(1, v.max - v.min);
      const marks = Math.min(11, span + 1);
      for (let i = 0; i < marks; i++) {
        ticks.append(el('span', { class: 'lw-tick', text: String(Math.round((v.min + (span * i) / (marks - 1)) * 100) / 100) }));
      }
      stage.append(range, ticks);
    } else if (v.kind === 'tokens') {
      stage.append(el('p', { class: 'lw-stage-how', text: tr('tokensInstruction') }));
      const grid = el('div', { class: 'lw-tokens', role: 'group', 'aria-label': v.caption });
      for (let i = 0; i < v.count; i++) {
        const on = S.visual.counted.includes(i);
        const b = el('button', {
          type: 'button', class: 'lw-token', 'aria-pressed': on ? 'true' : 'false',
          'aria-label': tr('tokenLabel', { n: i + 1 }),
          text: on ? String(S.visual.counted.indexOf(i) + 1) : '',
        });
        b.addEventListener('click', () => visualAction({ type: 'toggleToken', index: i }));
        grid.append(b);
      }
      stage.append(grid);
    } else if (v.kind === 'sequence') {
      stage.append(el('p', { class: 'lw-stage-how', text: tr('sequenceInstruction') }));
      const list = el('ol', { class: 'lw-seq', role: 'list', 'aria-label': v.caption });
      v.stages.forEach((s, i) => {
        list.append(el('li', {
          class: 'lw-seq-item', 'data-current': i === S.visual.stage ? 'true' : 'false',
        }, [
          el('p', { class: 'lw-seq-n', 'aria-hidden': 'true', text: String(i + 1) }),
          el('div', { class: 'lw-seq-body' }, [
            el('p', { class: 'lw-seq-label', text: s.label }),
            el('p', { class: 'lw-seq-detail', text: s.detail }),
          ]),
        ]));
      });
      const nav = el('div', { class: 'lw-actions lw-seq-nav' }, [
        el('button', { type: 'button', class: 'lw-btn', id: 'seq-prev', text: tr('seqPrev'), disabled: S.visual.stage <= 0 }),
        el('button', { type: 'button', class: 'lw-btn', id: 'seq-next', text: tr('seqNext'), disabled: S.visual.stage >= v.stages.length - 1 }),
      ]);
      nav.querySelector('#seq-prev').addEventListener('click', () => visualAction({ type: 'setStage', index: S.visual.stage - 1 }));
      nav.querySelector('#seq-next').addEventListener('click', () => visualAction({ type: 'setStage', index: S.visual.stage + 1 }));
      stage.append(list, nav);
    } else if (v.kind === 'passage') {
      stage.append(el('p', { class: 'lw-stage-how', text: tr('passageInstruction') }));
      const wrap = el('div', { class: 'lw-passage', role: 'group', 'aria-label': v.caption });
      splitSentences(v.text).forEach((sentence, i) => {
        const b = el('button', {
          type: 'button', class: 'lw-sentence', text: sentence,
          'aria-pressed': S.visual.selected === i ? 'true' : 'false',
          'aria-label': `${tr('sentenceLabel', { n: i + 1 })}: ${sentence}`,
        });
        b.addEventListener('click', () => visualAction({ type: 'selectSentence', index: i }));
        wrap.append(b);
      });
      stage.append(wrap);
    }

    stage.append(liveCaption, el('p', { class: 'lw-fine lw-stage-cap', text: v.caption }));
    return stage;
  }

  function viewAnswer(st) {
    const field = el('div', { class: 'lw-answer' });
    const result = S.results[st.id];
    const locked = result?.verdict === 'correct';

    if (st.kind === 'choice') {
      const group = el('fieldset', { class: 'lw-choices' }, [
        el('legend', { text: tr('answerLabel') }),
      ]);
      (st.choices || []).forEach((choice, i) => {
        const id = `c${i}`;
        const input = el('input', {
          type: 'radio', name: 'choice', id, value: choice,
          disabled: locked, class: 'lw-radio',
        });
        if (S.answers[st.id] === choice) input.checked = true;
        input.addEventListener('change', () => { setAnswer(choice); });
        group.append(el('label', { class: 'lw-choice', for: id }, [input, el('span', { text: choice })]));
      });
      field.append(group);
    } else if (st.kind === 'writing') {
      const ta = el('textarea', {
        id: 'typed', class: 'lw-input lw-write', rows: 6, maxlength: 1500,
        placeholder: tr('writingPlaceholder'), 'aria-describedby': 'write-note',
      });
      ta.value = S.answers[st.id] ?? '';
      ta.addEventListener('input', () => setAnswer(ta.value));
      field.append(el('div', { class: 'lw-field' }, [
        el('label', { for: 'typed', text: tr('writingLabel') }), ta,
        el('p', { id: 'write-note', class: 'lw-fine', text: tr('writingNote') }),
      ]));
    } else {
      const input = el('input', {
        type: 'text', id: 'typed', class: 'lw-input lw-numeric',
        inputmode: 'text', autocomplete: 'off', maxlength: 40,
        placeholder: tr('answerPlaceholder'), disabled: locked,
      });
      input.value = S.answers[st.id] ?? '';
      input.addEventListener('input', () => setAnswer(input.value));
      field.append(el('div', { class: 'lw-field' }, [
        el('label', { for: 'typed', text: tr('answerLabel') }), input,
      ]));
    }
    return field;
  }

  function viewResult(st) {
    const r = S.results[st.id];
    if (!r) return null;
    const label = r.verdict === 'correct' ? tr('correct') : r.verdict === 'incorrect' ? tr('incorrect') : tr('ungraded');
    const box = el('div', {
      class: `lw-result lw-${r.verdict}`, id: 'result', role: 'status', 'aria-live': 'polite',
    }, [
      el('p', { class: 'lw-verdict', text: label }),
      r.text ? el('p', { class: 'lw-feedback', text: r.text }) : null,
      r.alternate && r.alternate !== r.text
        ? el('p', { class: 'lw-alternate', text: r.alternate })
        : null,
      r.tag ? el('p', { class: 'lw-fine', text: r.tag }) : null,
      S.assisted[st.id] ? el('p', { class: 'lw-fine lw-assisted', text: tr('hintShown') }) : null,
    ]);
    return box;
  }

  function viewWork() {
    const st = step();
    const total = S.lesson.steps.length;
    const check = isCheck();
    const r = S.results[st.id];
    const done = r && (r.verdict === 'correct' || (r.mode === 'answer' && (st.kind === 'writing' || r.verdict !== 'incorrect')));
    const busy = S.busy;

    const actions = el('div', { class: 'lw-actions' });
    if (!done) {
      actions.append(el('button', {
        type: 'button', class: 'lw-btn lw-primary', id: 'check',
        text: busy === 'feedback' ? tr('checking') : (r?.verdict === 'incorrect' ? tr('tryAgain') : tr('check')),
        disabled: Boolean(busy),
      }));
      actions.append(el('button', {
        type: 'button', class: 'lw-btn', id: 'hint',
        text: busy === 'hint' ? tr('gettingHint') : (S.assisted[st.id] ? tr('explainAgain') : tr('getHint')),
        disabled: Boolean(busy),
      }));
    } else if (!check) {
      actions.append(el('button', { type: 'button', class: 'lw-btn lw-primary', id: 'next', text: tr('nextQuestion') }));
    }

    const sec = el('section', { class: 'lw-work', id: 'work', 'aria-labelledby': 'prompt-h' }, [
      el('div', { class: 'lw-work-head' }, [
        el('p', { class: 'lw-step-meta' }, [
          el('span', { class: 'lw-kind', 'data-check': check ? 'true' : 'false', text: check ? tr('freshCheck') : tr('practice') }),
          el('span', { class: 'lw-count', text: tr('stepOf', { n: S.stepIndex + 1, total }) }),
        ]),
        el('h2', { id: 'prompt-h', class: 'lw-prompt', text: st.prompt }),
        check ? el('p', { class: 'lw-fine', text: tr('freshCheckNote') }) : null,
      ]),
      viewVisual(st),
      viewAnswer(st),
      actions,
      viewResult(st),
      S.error && S.error.where === st.id ? viewError() : null,
    ]);

    const checkBtn = sec.querySelector('#check');
    if (checkBtn) checkBtn.addEventListener('click', submit);
    const hintBtn = sec.querySelector('#hint');
    if (hintBtn) hintBtn.addEventListener('click', () => askFeedback('hint'));
    const nextBtn = sec.querySelector('#next');
    if (nextBtn) nextBtn.addEventListener('click', advance);
    return sec;
  }

  function viewError() {
    const e = S.error;
    const box = el('div', { class: 'lw-error', role: 'alert' }, [
      el('p', { class: 'lw-verdict', text: tr('errorTitle') }),
      el('p', { text: e.message }),
      el('p', { class: 'lw-fine', text: tr('errorKept') }),
      el('button', { type: 'button', class: 'lw-btn', id: 'retry', text: tr('retry') }),
    ]);
    box.querySelector('#retry').addEventListener('click', () => { const r = e.retry; S.error = null; render(); r(); });
    return box;
  }

  function viewNext() {
    if (!S.next) return null;
    const kindLabel = S.next.kind === 'advance' ? tr('nextAdvance') : tr('nextReinforce');
    const sec = el('section', { class: 'lw-next', 'aria-labelledby': 'next-h' }, [
      el('h2', { id: 'next-h', text: tr('nextTitle') }),
      el('p', { class: 'lw-next-kind', text: kindLabel }),
      el('p', { class: 'lw-next-goal', text: S.next.goal }),
      el('p', { class: 'lw-fine', text: S.next.reason }),
      el('div', { class: 'lw-actions' }, [
        el('button', { type: 'button', class: 'lw-btn lw-primary', id: 'launch-next', text: tr('launchNext'), disabled: S.busy === 'lesson' }),
        el('button', { type: 'button', class: 'lw-btn', id: 'new-goal', text: tr('newGoal') }),
      ]),
    ]);
    sec.querySelector('#launch-next').addEventListener('click', () => {
      S.setup = { ...S.setup, goal: S.next.goal };
      generate({ goal: S.next.goal, reason: S.next.reason });
    });
    sec.querySelector('#new-goal').addEventListener('click', () => {
      invalidate();
      S.lesson = null; S.next = null; S.results = {}; S.error = null;
      S.setup = { ...S.setup, goal: '' };
      render();
    });
    return sec;
  }

  function viewEvidence() {
    const list = el('ul', { class: 'lw-evidence-list' });
    for (const e of S.evidence) {
      const label = e.verdict === 'correct' ? tr('correct') : e.verdict === 'incorrect' ? tr('incorrect') : tr('ungraded');
      list.append(el('li', { class: `lw-ev lw-${e.verdict}` }, [
        el('p', { class: 'lw-ev-head' }, [
          el('span', { class: 'lw-ev-verdict', text: label }),
          el('span', { class: 'lw-ev-help', text: e.assisted ? tr('evidenceAssisted') : tr('evidenceAlone') }),
        ]),
        el('p', { class: 'lw-ev-answer', text: e.answer || '\u2014' }),
      ]));
    }
    const saveBox = el('input', { type: 'checkbox', id: 'save-on', class: 'lw-check' });
    saveBox.checked = S.saveOn;                       // unchecked by default
    saveBox.addEventListener('change', () => {
      S.saveOn = saveBox.checked;
      if (S.saveOn) persist();
      else { if (store) clearRecord(store); S.storageMsg = tr('memoryState'); }
      render();
    });

    const sec = el('aside', { class: 'lw-side', 'aria-labelledby': 'ev-h' }, [
      el('h2', { id: 'ev-h', text: tr('evidenceTitle') }),
      S.evidence.length ? list : el('p', { class: 'lw-fine', text: tr('evidenceEmpty') }),
      el('p', { class: 'lw-fine', text: tr('evidenceNote') }),
      el('div', { class: 'lw-save' }, [
        el('label', { class: 'lw-check-row', for: 'save-on' }, [saveBox, el('span', { text: tr('saveLabel') })]),
        el('p', { class: 'lw-fine', text: tr('saveHint') }),
        S.storageMsg ? el('p', { class: 'lw-fine lw-storage', id: 'storage-msg', text: S.storageMsg }) : null,
      ]),
      el('div', { class: 'lw-actions' }, [
        el('button', { type: 'button', class: 'lw-btn', id: 'export', text: tr('exportLabel'), disabled: !S.lesson }),
        el('button', { type: 'button', class: 'lw-btn lw-danger', id: 'clear', text: tr('clearLabel') }),
      ]),
    ]);
    sec.querySelector('#export').addEventListener('click', exportRecord);
    sec.querySelector('#clear').addEventListener('click', () => { S.confirmClear = true; render(); });
    return sec;
  }

  function viewConfirm() {
    const box = el('div', { class: 'lw-confirm', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'cf-h' }, [
      el('h2', { id: 'cf-h', text: tr('clearConfirmTitle') }),
      el('p', { text: tr('clearConfirmBody') }),
      el('div', { class: 'lw-actions' }, [
        el('button', { type: 'button', class: 'lw-btn lw-danger', id: 'cf-yes', text: tr('clearConfirm') }),
        el('button', { type: 'button', class: 'lw-btn', id: 'cf-no', text: tr('clearCancel') }),
      ]),
    ]);
    box.querySelector('#cf-yes').addEventListener('click', () => { S.confirmClear = false; clearSaved(); });
    box.querySelector('#cf-no').addEventListener('click', () => { S.confirmClear = false; render(); });
    return el('div', { class: 'lw-scrim' }, [box]);
  }

  function buildRestart() {
    const d = el('details', { class: 'lw-restart' }, [
      el('summary', { text: tr('newGoal') }), viewSetup(),
    ]);
    d.open = restartOpen;
    return d;
  }

  /** Native <details>: open while a request runs, collapsible history, no extra controls. */
  function viewActivity() {
    if (!S.activity.length && !actOp) return null;
    const live = el('p', { class: 'lw-act-now', id: 'act-now', role: 'status', 'aria-live': 'polite' }, [
      el('span', {
        class: 'lw-act-op',
        text: actShown
          ? tr(actShown.kind === 'lesson' ? 'actRequestLesson' : actShown.kind === 'hint' ? 'actRequestHint' : 'actRequestFeedback')
          : tr('actIdle'),
      }),
      // Seen, not announced: a per-second rewrite inside the live region would
      // interrupt a screen reader every tick. The operation label above is announced.
      actShown
        ? el('span', { class: 'lw-act-time', id: 'act-elapsed', 'aria-hidden': 'true', text: tr('actElapsed', { n: actShown.secs }) })
        : null,
    ]);
    const list = el('ul', { class: 'lw-act-list' });
    // Newest first: the reason you opened the panel is the top line.
    for (const e of [...S.activity].reverse()) {
      list.append(el('li', {}, [
        el('span', { class: 'lw-act-at', text: e.at }),
        el('span', { text: e.text }),
      ]));
    }
    const d = el('details', { class: 'lw-activity', id: 'activity', 'data-busy': actOp ? 'true' : 'false' }, [
      el('summary', {}, [el('span', { text: tr('actTitle') })]),
      live,
      list,
      actOp ? el('p', { class: 'lw-fine', text: tr('actBound') }) : null,
    ]);
    d.open = actOpen;
    return d;
  }

  /**
   * The thumbs pair. A real <button> pair with aria-pressed, not a radio group:
   * either can be off, and pressing the live one removes the vote.
   *
   * Every number shown here came back from the server. Nothing is incremented
   * locally, so a failed post shows an error and the old count, never a new one.
   */
  function viewRating() {
    if (!S.lesson) return null;
    if (!S.recordId) {
      return S.rateUnavailable
        ? el('p', { class: 'lw-fine', id: 'rate-unavailable', text: tr('rateUnavailable') })
        : null;
    }
    const button = (id, key, mine) => {
      const b = el('button', {
        type: 'button', class: 'lw-btn lw-rate' + (mine ? ' lw-rate-on' : ''), id,
        'aria-pressed': mine ? 'true' : 'false',
        text: tr(key),
        disabled: S.rateBusy,
      });
      b.addEventListener('click', () => vote(id === 'rate-up' ? 'up' : 'down'));
      return b;
    };
    const fb = S.rateFeedback;
    const sec = el('section', { class: 'lw-rate-box', 'aria-labelledby': 'rate-h' }, [
      el('h2', { id: 'rate-h', class: 'lw-rate-h', text: tr('rateTitle') }),
      el('div', { class: 'lw-rate-row' }, [
        button('rate-up', 'rateUp', S.rateVote === 'up'),
        button('rate-down', 'rateDown', S.rateVote === 'down'),
      ]),
      // Only drawn when the server actually reported a tally: a lesson with no
      // counts yet stays silent instead of showing a 0 that reads as a verdict.
      fb ? el('p', { class: 'lw-fine', id: 'rate-counts', role: 'status',
        text: tr('rateCounts', { up: fb.thumbsUp, down: fb.thumbsDown }) }) : null,
      el('p', { class: 'lw-fine', text: tr('rateSemantics') }),
      S.rateBusy ? el('p', { class: 'lw-fine', id: 'rate-busy', role: 'status', text: tr('rateBusy') }) : null,
      S.rateStorageMsg ? el('p', { class: 'lw-fine', id: 'rate-storage', text: S.rateStorageMsg }) : null,
    ]);
    if (S.rateError) {
      // Authored copy only: the server's status line is not learner-facing.
      const retry = el('button', { type: 'button', class: 'lw-btn', id: 'rate-retry', text: tr('rateRetry') });
      retry.addEventListener('click', () => vote(S.lastVoteWant || 'up'));
      put(sec,
        el('p', { class: 'lw-fine lw-rate-err', id: 'rate-error', role: 'alert', text: tr('rateFailed') }),
        retry);
    }
    return sec;
  }

  /**
   * Native <details> for the recorded facts about this lesson version. Rows are
   * label/value text nodes; the instructions go in a <pre> as textContent, so no
   * markup in a stored string is ever parsed — it shows up as the characters it is.
   */
  function viewDetails() {
    const rows = metadataRows(S.metadata);
    const blocks = instructionBlocks(S.metadata);
    if (!rows.length && !blocks.length) return null;
    const list = el('dl', { class: 'lw-md-list' });
    for (const { labelKey, value } of rows) {
      list.append(el('dt', { text: tr(labelKey) }), el('dd', { text: value }));
    }
    return el('details', { class: 'lw-details', id: 'lesson-details' }, [
      el('summary', {}, [el('span', { text: tr('mdTitle') })]),
      rows.length ? list : null,
      rows.some((r) => r.labelKey === 'mdDevice')
        ? el('p', { class: 'lw-fine', text: tr('mdDeviceNote') }) : null,
      blocks.length ? el('p', { class: 'lw-fine', text: tr('mdInstructionsNote') }) : null,
      ...blocks.map(({ labelKey, text }) => el('div', { class: 'lw-md-ins' }, [
        el('h3', { class: 'lw-md-ins-h', text: tr(labelKey) }),
        el('pre', { class: 'lw-md-pre', text }),       // textContent: never parsed
      ])),
    ]);
  }

  function viewFoot() {
    const bits = provenanceLines(S.provenance).map(({ key, vars }) => tr(key, vars));
    if (typeof S.callsLeft === 'number') bits.push(tr('callsLeft', { n: S.callsLeft }));
    const text = bits.filter(Boolean).join(' ').trim();
    if (!text) return null;
    return el('p', { class: 'lw-foot lw-fine', id: 'provenance', text });
  }

  // ---- render
  function render() {
    const active = document.activeElement;
    const focusId = active && root.contains(active) ? active.id : null;
    const selStart = active && 'selectionStart' in active ? active.selectionStart : null;
    // Read the live element before it is replaced: `toggle` fires asynchronously, so a
    // mirrored flag would lag and collapse the panel the user is working in.
    restartOpen = root.querySelector('.lw-restart')?.open ?? restartOpen;
    actOpen = root.querySelector('#activity')?.open ?? actOpen;
    if (actOp) actOpen = true;      // a running request is never hidden

    root.replaceChildren();
    root.setAttribute('lang', S.locale);
    const needsProfile = !S.profile || S.profileEditing;
    root.dataset.state = !S.acked ? 'gate' : needsProfile ? 'profile' : S.lesson ? 'work' : 'setup';

    if (!S.acked) {
      put(root, viewDisclosure());
      root.querySelector('#ack').addEventListener('click', () => {
        S.acked = true; render(); root.querySelector('#profile-name')?.focus();
      });
      return;
    }

    // The profile gates the lesson surface: no goal field until a name and age are valid.
    if (needsProfile) {
      put(root,
        el('header', { class: 'lw-head' }, [el('h1', { class: 'lw-title', text: tr('appTitle') })]),
        viewProfile(),
      );
      put(root, S.ageConfirm ? viewAgeConfirm() : null);
      return;
    }

    const head = el('header', { class: 'lw-head' }, [
      el('a', { class: 'lw-skip', href: '#work', text: tr('skipToWork') }),
      el('h1', { class: 'lw-title', text: S.lesson ? S.lesson.title : tr('appTitle') }),
      viewProfileBar(),
      S.lesson ? el('p', { class: 'lw-intro', text: S.lesson.intro }) : null,
      S.notice ? el('p', { class: 'lw-notice', role: 'status', text: S.notice }) : null,
    ]);

    const main = el('main', { class: 'lw-main', id: 'main' }, [
      viewActivity(),               // next to the work, above the fold on a phone
      S.lesson ? viewWork() : viewSetup(),
      S.lesson && S.error && S.error.where === 'lesson' ? viewError() : null,
      !S.lesson && S.error && S.error.where === 'lesson' ? viewError() : null,
      viewNext(),
      // After the work and the suggested next step: feedback is about the lesson
      // just done, and the details are reference material, not part of the task.
      S.lesson ? viewRating() : null,
      S.lesson ? viewDetails() : null,
      S.lesson && !S.next ? buildRestart() : null,   // the next-lesson card already offers this
    ]);

    put(root, head, el('div', { class: 'lw-cols' }, [main, viewEvidence()]), viewFoot());
    put(root, S.confirmClear ? viewConfirm() : null);

    if (focusId) {
      const again = root.querySelector('#' + focusId);
      if (again) {
        again.focus();
        if (selStart != null && 'setSelectionRange' in again) {
          try { again.setSelectionRange(selStart, selStart); } catch { /* not a text input */ }
        }
      }
    }
  }

  // A remembered profile is an explicit opt-in from a previous visit; absent that
  // key, the gate is shown again and nothing persistent holds the name or age.
  const remembered = loadProfile(store);
  if (remembered) { S.profile = remembered; S.profileRemember = true; S.profileDraft = { name: remembered.name, age: String(remembered.age) }; }
  readSaved();
  // Only a remembered profile can open saved work at boot. Without one, the gate
  // is shown and adoption waits for the profile the learner enters.
  if (S.profile) adoptSaved();
  render();
  return { state: S, render, generate, submit, askFeedback, advance, clearSaved, exportRecord, visualAction, invalidate, submitProfile, adoptSaved, vote };
}

function defaultApi() {
  const post = async (path, body, signal) => {
    let res;
    try {
      res = await fetch(path, {
        method: 'POST', signal,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (err) {
      if (err?.name === 'AbortError') throw err;
      const e = new Error('network'); e.userMessage = 'The local server did not respond.'; throw e;
    }
    let data = null;
    try { data = await res.json(); } catch { /* keep null */ }
    if (!res.ok) {
      const e = new Error('http ' + res.status);
      e.quota = res.status === 429;
      e.userMessage = typeof data?.error === 'string' ? data.error : null;
      throw e;
    }
    return data || {};
  };
  return {
    lesson: (body, signal) => post('/api/lesson', body, signal),
    feedback: (body, signal) => post('/api/feedback', body, signal),
    lessonRating: (body, signal) => post('/api/lesson-rating', body, signal),
    // Same-origin GET; the default credentials mode is deliberately not touched.
    // `voterToken` is optional and sent ONLY when this browser already holds one for
    // this version, so the server can report which way this caller voted. It is a
    // per-version random token, not a profile or account id.
    lessonLibrary: async (recordId, voterToken) => {
      const q = typeof voterToken === 'string' && /^[0-9a-f]{32}$/.test(voterToken)
        ? '?voterToken=' + voterToken : '';
      const res = await fetch('/api/lesson-library/' + encodeURIComponent(recordId) + q);
      if (!res.ok) { const e = new Error('http ' + res.status); e.notFound = res.status === 404; throw e; }
      return res.json();
    },
  };
}

if (typeof document !== 'undefined' && document.getElementById('app')) {
  createApp(document.getElementById('app'));
}