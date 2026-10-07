/**
 * EN/ES strings for the Kaizen surface.
 *
 * Local rather than added to `lib/i18n/locales/*.json`: those files are the
 * upstream app's and are not this lane's to edit. Two languages, one flat
 * table, no loader — if this surface ever needs a third language it should move
 * into the real i18n bundle instead of growing here.
 */
import type { KaizenLang } from './profile';

export const UI = {
  'en-US': {
    courses: 'My courses',
    newCourse: 'Learn something new',
    learner: 'Me',
    start: 'Start',
    continue: 'Continue',
    loading: 'Loading your courses',
    emptyTitle: 'No courses yet',
    emptyBody: 'Pick something you want to learn and this is where it will be saved.',
    errorTitle: 'Could not load your courses',
    retry: 'Try again',
    pickTopic: 'What do you want to learn?',
    orType: 'Or say it in your own words',
    typePlaceholder: 'Anything you want to learn about…',
    howOld: 'How old are you?',
    yearsOld: 'years old',
    typeAge: 'Or type an age',
    nickname: 'What should we call you?',
    nicknameHint: 'Stays on this device only. Never sent anywhere.',
    nicknameOptional: 'Optional',
    language: 'Language',
    make: 'Make my lesson',
    makeBusy: 'Getting it ready…',
    cancelBusy: 'Stop and change my mind',
    needAge: 'Choose an age first so the lesson fits you.',
    needTopic: 'Choose a picture or type what you want to learn.',
    savedCourses: 'Saved courses',
    lastOpened: 'Last opened',
    noProgressTitle: 'Nothing is being scored',
    noProgressBody:
      'This app does not measure what you have learned. It only remembers the courses you made and when you opened them.',
    scenes: 'parts',
    bands: {
      'young-child': 'Little kid',
      child: 'Kid',
      preteen: 'Older kid',
      teen: 'Teenager',
      adult: 'Grown-up',
      'older-adult': 'Older grown-up',
    },
  },
  'es-MX': {
    courses: 'Mis cursos',
    newCourse: 'Aprender algo nuevo',
    learner: 'Yo',
    start: 'Empezar',
    continue: 'Continuar',
    loading: 'Cargando tus cursos',
    emptyTitle: 'Todavía no hay cursos',
    emptyBody: 'Elige algo que quieras aprender y aquí se va a guardar.',
    errorTitle: 'No se pudieron cargar tus cursos',
    retry: 'Intentar de nuevo',
    pickTopic: '¿Qué quieres aprender?',
    orType: 'O dilo con tus propias palabras',
    typePlaceholder: 'Lo que quieras aprender…',
    howOld: '¿Cuántos años tienes?',
    yearsOld: 'años',
    typeAge: 'O escribe tu edad',
    nickname: '¿Cómo te llamamos?',
    nicknameHint: 'Se queda solo en este aparato. Nunca se envía a ningún lado.',
    nicknameOptional: 'Opcional',
    language: 'Idioma',
    make: 'Crear mi lección',
    makeBusy: 'Preparándola…',
    cancelBusy: 'Parar y cambiar de idea',
    needAge: 'Primero elige una edad para que la lección te quede bien.',
    needTopic: 'Elige un dibujo o escribe qué quieres aprender.',
    savedCourses: 'Cursos guardados',
    lastOpened: 'Abierto por última vez',
    noProgressTitle: 'Nada se está calificando',
    noProgressBody:
      'Esta aplicación no mide lo que has aprendido. Solo recuerda los cursos que hiciste y cuándo los abriste.',
    scenes: 'partes',
    bands: {
      'young-child': 'Niño pequeño',
      child: 'Niño',
      preteen: 'Niño grande',
      teen: 'Adolescente',
      adult: 'Adulto',
      'older-adult': 'Adulto mayor',
    },
  },
} as const;

export type UIStrings = (typeof UI)['en-US'];

export function strings(lang: KaizenLang): UIStrings {
  return UI[lang] as UIStrings;
}
