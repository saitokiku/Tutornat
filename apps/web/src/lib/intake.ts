import { addDays, fromLocalDate, isDay, localDate, weekStart } from "@/planner/dates";
import { classify } from "@/planner/ics";
import { readSchoolText } from "@/planner/intake";
import { matchSkills } from "@/planner/skillmatch";
import type { SchoolClass, SchoolEvent } from "@/planner/types";
import { getSkill, SKILLS } from "@/practice/skills";
import { dataUrl, deleteBlob, putBlob } from "./blobs";
import { addEvent, checkEvent, type EventInput } from "./school";
import type { Grade, Locale, Subject } from "./types";

// The magic box's first question: what is this? Rules first, the same way every time, in the order of
// plan §2.2; the AI reader (when connected) only refines a guess, and the family always sees and can
// change the guess before anything is made. Deterministic and conservative like planner/intake.ts: a
// date is used only when the words give one, never invented, and a doubtful one is left out.

/** The most the box takes: room for a pasted teacher email or assignment sheet. */
export const TEXT_MAX = 4000;

/** What the guess row offers. */
export const INTAKE_KINDS = ["homework", "test", "quiz", "project", "practice", "learn"] as const;
/** Calendar kinds the box recognises (a day off, a field trip) and offers only when the words point to one. */
export const CALENDAR_KINDS = ["no-school", "event"] as const;
export type IntakeKind = (typeof INTAKE_KINDS)[number] | (typeof CALENDAR_KINDS)[number];
export type SchoolKind = Exclude<IntakeKind, "practice" | "learn">;
export const isSchoolKind = (k: IntakeKind): k is SchoolKind => k !== "practice" && k !== "learn";

/** Which rule decided the kind, and the words that triggered it (shown to the family as the reason). */
export type IntakeReason = { rule: "test" | "quiz" | "project" | "homework" | "no-school" | "event" | "date" | "practice" | "learn" | "default" | "ai"; cue?: string };

export type IntakeGuess = {
  kind: IntakeKind;
  title: string;
  /** YYYY-MM-DD, only when the words name a day. Kept for every kind so a change to "homework" keeps it. */
  date?: string;
  subject?: Subject;
  skillIds: string[];
  classId?: string;
  /** The class was named in the words (rather than picked as the only class in the skills' subject). */
  classNamed?: boolean;
  reason: IntakeReason;
};

export type IntakeContext = { today: string; locale?: Locale; classes?: Pick<SchoolClass, "id" | "name" | "subject">[] };

// --- words ----------------------------------------------------------------------------------------

// Word edges that understand accents (JS \b treats "á" as a non-letter).
const B = "(?<![\\p{L}\\p{N}])";
const E = "(?![\\p{L}\\p{N}])";
const words = (body: string) => new RegExp(`${B}(?:${body})${E}`, "iu");
const NOT_ME = `(?!\\s+me${E})`; // "quiz me", "test me" ask for practice, not a school test

const WEEKDAYS: string[] = [
  "sunday|domingo",
  "monday|mon|lunes|lun",
  "tuesday|tues|tue|martes",
  "wednesday|weds|wed|mi[eé]rcoles|mi[eé]",
  "thursday|thurs|thur|thu|jueves|jue",
  "friday|fri|viernes|vie",
  "saturday|s[aá]bado",
]; // index = Date#getDay(). "sun", "sat" and "mar" are left out: "the sun" is not Sunday, "mar" is March.
const WD_RES = WEEKDAYS.map((w) => new RegExp(`^(?:${w})$`, "iu"));
const WD = WEEKDAYS.join("|");
const MONTH =
  "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)";
/** A day named after "for", "by", "para el"…: the English and Spanish way of saying something is due. */
const DAY_REF = `(?:(?:this|next|the|coming)\\s+)?(?:${WD})|tomorrow|tmrw|tonight|today|${MONTH}\\.?\\s+\\d{1,2}|\\d{1,2}\\/\\d{1,2}|(?:the\\s+)?\\d{1,2}(?:st|nd|rd|th)`;

type CueName = "test" | "quiz" | "project" | "homework" | "noSchool" | "event" | "forDay" | "practice" | "learn";

const CUES: Record<CueName, RegExp> = {
  test: words(`(?:tests?|exams?|ex[aá]men(?:es)?|midterms?|evaluaci[oó]n)${NOT_ME}`),
  quiz: words(`(?:quiz(?:zes)?|pruebas?)${NOT_ME}`),
  project: words("projects?|proyectos?|science fair|feria de ciencias|dioramas?"),
  homework: words(
    "homework|hw|worksheets?|assignments?|due|reading log|(?:pages?|pgs?|pp?|p[aá]g(?:ina)?s?)\\.?\\s*\\d+|problems?\\s+\\d+|tareas?|deberes|hoja de|hojas de (?:trabajo|ejercicios|tarea|actividades)|fichas?|(?<!m[aá]s\\s)ejercicios|entregar",
  ),
  noSchool: words(
    "no school|no classes|no hay clases|no hay escuela|sin clases|school(?:'s| is)? closed|holiday|feriado|d[ií]a festivo|vacation|vacaciones|(?:spring|winter|fall|thanksgiving|christmas|holiday|mid-?winter) break|teacher (?:work|planning|in-service) day|in-service day|staff development day|day off|d[ií]a libre",
  ),
  event: words(
    "field trip|picture day|photo day|picture retakes|school pictures|assembly|concert|recital|parent[- ]teacher(?: conferences?)?|conferences?|open house|back to school night|curriculum night|book fair|spirit (?:day|week)|pajama day|school play|talent show|graduation|early (?:release|dismissal)|excursi[oó]n|paseo|salida (?:escolar|educativa|temprano)|d[ií]a de (?:fotos|campo|pijamas)|fotos escolares|reuni[oó]n de padres|junta de padres|asamblea|concierto|festival|obra de teatro|graduaci[oó]n|feria del libro",
  ),
  forDay: words(
    `(?:for|by|before)\\s+(?:${DAY_REF})|para\\s+(?:(?:el|la)\\s+)?(?:${WD})|para\\s+el\\s+(?:d[ií]a\\s+)?\\d{1,2}|para\\s+(?:ma[ñn]ana|hoy)|antes del?\\s+(?:${WD})|hasta el\\s+(?:${WD})`,
  ),
  practice: words(
    "practi[cs]e|practi[cs]ing|drills?|drill me|more of|more practice|extra practice|more problems|quiz me|test me|practicar|pr[aá]ctica|practico|repasar|ejercitar|m[aá]s ejercicios|m[aá]s pr[aá]ctica|m[aá]s problemas|^\\s*m[aá]s",
  ),
  learn: words(
    "learn|learning|teach me|explain|why|how|what(?:'s| is| are| was| were| does| do)|who (?:is|was)|tell me about|aprender|ens[eé][ñn]ame|expl[ií]came|por qu[eé]|c[oó]mo|qu[eé] (?:es|son|significa)|qui[eé]n (?:es|fue)",
  ),
};
const RANKS: CueName[][] = [["test", "quiz"], ["project"], ["homework", "forDay"], ["noSchool", "event"]];
const SCHOOL_CUES = RANKS.flat();

function cue(text: string, name: CueName) {
  const m = CUES[name].exec(text);
  return m ? { index: m.index, cue: m[0].trim() } : null;
}
const schooly = (text: string) => SCHOOL_CUES.some((c) => cue(text, c));

// --- dates ----------------------------------------------------------------------------------------

const WEEKDAY = new RegExp(
  `${B}(?:(this coming|this|next|coming|el pr[oó]ximo|pr[oó]ximo|este|esta)\\s+)?(${WD})\\.?(?:'s|’s)?(?:\\s+(next week|this week|que viene|pr[oó]ximo|de la pr[oó]xima semana|de la semana que viene|de esta semana))?${E}`,
  "iu",
);
const weekdayIndex = (word: string) => WD_RES.findIndex((re) => re.test(word));

// "in two days", "en tres días": number words up to ten, and "a"/"un" for one.
const NUMBER_WORDS: Record<string, number> = Object.fromEntries([
  ...["one two three four five six seven eight nine ten", "uno dos tres cuatro cinco seis siete ocho nueve diez"].flatMap((list) => list.split(" ").map((w, i) => [w, i + 1])),
  ...["a", "an", "un", "una"].map((w) => [w, 1]),
]);
const N = `\\d{1,3}|${Object.keys(NUMBER_WORDS).join("|")}`;

const RELATIVE: [RegExp, (m: RegExpExecArray) => number | null][] = [
  [new RegExp(`${B}(?:(?:the\\s+)?day after tomorrow|pasado\\s+ma[ñn]ana)${E}`, "iu"), () => 2],
  [new RegExp(`${B}(?:today|tonight|this (?:morning|afternoon|evening)|hoy|esta (?:noche|tarde|ma[ñn]ana))${E}`, "iu"), () => 0],
  // "mañana" is also "morning": not after "la", "las", "esta" or "pasado".
  [new RegExp(`${B}(?:tomorrow|tmrw|tmw|(?<!(?:la|las|esta|pasado)\\s+)ma[ñn]ana)${E}`, "iu"), () => 1],
  [
    new RegExp(`${B}(?:in|en|dentro de)\\s+(${N})\\s+(days?|d[ií]as?|weeks?|semanas?)${E}`, "iu"),
    (m) => {
      const n = /^\d+$/.test(m[1]) ? Number(m[1]) : NUMBER_WORDS[m[1].toLowerCase()];
      const days = n * (/^(?:weeks?|semanas?)$/i.test(m[2]) ? 7 : 1);
      return days > 0 && days <= 365 ? days : null;
    },
  ],
];

const NUMERIC = new RegExp(`${B}(\\d{1,2})\\/(\\d{1,2})(?:\\/(\\d{4}|\\d{2}))?${E}`, "giu");
const ABSOLUTE = [
  new RegExp(`${B}\\d{4}-\\d{1,2}-\\d{1,2}${E}`, "giu"),
  new RegExp(`${B}${MONTH}\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+\\d{4})?${E}`, "giu"),
  new RegExp(`${B}\\d{1,2}(?:st|nd|rd|th)?\\s+(?:of\\s+|de\\s+)?${MONTH}(?:\\s+(?:de\\s+)?\\d{4})?${E}`, "giu"),
  NUMERIC,
];
// "3/4" and "6/12" are fractions until something says they're a day: a year, a weekday, or a word like
// "due", "on", "test", "el" right before them — and never when sums or other fractions sit beside them
// ("3/4 and 1/2", "1/2 of the class", "5/10 + 2/10").
const NUMERIC_CUE = new RegExp(
  `${B}(?:due|on|by|for|before|until|(?:tests?|quiz|exams?|ex[aá]men|prueba)(?:\\s+(?:final|parcial|corta|de\\s+\\p{L}+))?|el|para|del|hasta|antes de)\\s*[:,]?\\s*$`,
  "iu",
);
const FRACTION_AFTER = /^\s*(?:[-+×÷*=<>]|x(?!\p{L})|(?:of|de)\s+(?!\d{4}(?!\p{N}))|(?:,|and|y|or|o)\s*\d+\s*\/\s*\d)/iu;
const FRACTION_BEFORE = /(?:[-+×÷*=<>]|(?<!\p{L})x|\d\s*\/\s*\d+\s*(?:,|and|y|or|o)?)\s*$/iu;
const inSums = (text: string, start: number, end: number) => FRACTION_AFTER.test(text.slice(end)) || FRACTION_BEFORE.test(text.slice(Math.max(0, start - 24), start));
// A day of the month with no month: "el viernes 16", "Friday the 16th", "el día 12", "on the 12th".
const NOT_MORE = `(?!\\s*(?:[\\/:.,-]\\s*\\d|%|(?:of\\s+|de\\s+)?${MONTH}${E}))`;
const WD_DAY = new RegExp(`${B}(${WD})\\.?,?\\s+(?:the\\s+)?(\\d{1,2})(?:st|nd|rd|th)?${E}${NOT_MORE}`, "giu");
const EL_DAY = new RegExp(`${B}el\\s+(d[ií]a\\s+)?(\\d{1,2})${E}${NOT_MORE}`, "giu");
const THE_NTH = new RegExp(`${B}(?:(on|due|by|for|before|until)\\s+)?the\\s+(\\d{1,2})(st|nd|rd|th)?${E}${NOT_MORE}`, "giu");
const DAY_CUE = new RegExp(`${B}(?:due|on|by|for|test|quiz|exam|ex[aá]men(?:es)?|prueba|tarea|entrega|para|hasta|antes|es|son|ser[aá])\\s*[:,]?\\s*$`, "iu");

export type FoundDate = { date: string; start: number; end: number; text: string };

function coming(today: string, weekday: number, min: number) {
  const now = fromLocalDate(today).getDay();
  return addDays(today, min + ((weekday - now - min + 14) % 7));
}

/** The next time the month reaches day `n` (today counts), skipping months too short for it. */
function nextDayOfMonth(today: string, n: number): string | null {
  const [y, m, d] = today.split("-").map(Number);
  if (n < 1 || n > 31) return null;
  for (let k = n >= d ? 0 : 1; k < 4; k++) {
    const at = new Date(y, m - 1 + k, n, 12);
    if (at.getDate() === n) return localDate(at);
  }
  return null;
}

const dayOf = (date: string) => fromLocalDate(date).getDay();
/** The weekday written right before position `at` ("Friday, Oct 16", "viernes 16/10"), if any. */
function weekdayBefore(text: string, at: number) {
  const m = new RegExp(`${B}(${WD})\\.?,?\\s+(?:the\\s+)?$`, "iu").exec(text.slice(0, at));
  return m ? { index: m.index, day: weekdayIndex(m[1]) } : null;
}

const conflict = Symbol("conflict");

/** Absolute dates; `conflict` when a weekday beside one says it's a different day. */
function absoluteDates(text: string, today: string, locale: Locale, fractions: boolean): FoundDate[] | typeof conflict {
  const out: FoundDate[] = [];
  for (const re of ABSOLUTE) {
    re.lastIndex = 0;
    for (let m = re.exec(text); m; m = re.exec(text)) {
      const wd = weekdayBefore(text, m.index);
      let options: (string | undefined)[];
      if (re === NUMERIC) {
        const [, a, b, y] = m;
        if (!y && (fractions || inSums(text, m.index, m.index + m[0].length) || (!wd && !NUMERIC_CUE.test(text.slice(Math.max(0, m.index - 32), m.index))))) continue;
        const read = (mo: string, d: string) => readSchoolText(`x ${mo}/${d}${y ? `/${y}` : ""}`, today).found[0]?.date;
        // Month first in English, day first in Spanish; the other order only when the first can't be a day.
        options = locale === "es" ? [read(b, a), read(a, b)] : [read(a, b), read(b, a)];
      } else {
        // "12th of October" is read as "October 12".
        const day = /^(\d{1,2})(?:st|nd|rd|th)?\s+of\s+(.+)$/iu.exec(m[0]);
        options = [readSchoolText(`x ${day ? `${day[2]} ${day[1]}` : m[0]}`, today).found[0]?.date];
      }
      const dates = options.filter((d): d is string => !!d);
      if (!dates.length) continue;
      const date = wd ? dates.find((d) => dayOf(d) === wd.day) : dates[0];
      if (!date) return conflict;
      const start = wd ? wd.index : m.index;
      out.push({ date, start, end: m.index + m[0].length, text: text.slice(start, m.index + m[0].length) });
    }
  }
  return out;
}

function monthDays(text: string, today: string): FoundDate[] {
  const out: FoundDate[] = [];
  for (const re of [WD_DAY, EL_DAY, THE_NTH]) {
    re.lastIndex = 0;
    for (let m = re.exec(text); m; m = re.exec(text)) {
      let date: string | null;
      if (re === WD_DAY) {
        // "viernes 13": the next 13th that is a Friday, within two months; otherwise the weekday alone decides.
        const [weekday, n] = [weekdayIndex(m[1]), Number(m[2])];
        date = nextDayOfMonth(today, n);
        for (let k = 0; date && dayOf(date) !== weekday && k < 2; k++) date = nextDayOfMonth(addDays(date, 1), n);
        if (date && dayOf(date) !== weekday) date = null;
      } else if (re === EL_DAY) {
        // "el 5" could be problem 5: a bare "el N" counts only after a word like "para", "examen", "es".
        if (!m[1] && !DAY_CUE.test(text.slice(Math.max(0, m.index - 24), m.index))) continue;
        date = nextDayOfMonth(today, Number(m[2]));
      } else {
        if (!m[1] && !m[3]) continue; // "the 12 problems" isn't a day
        date = nextDayOfMonth(today, Number(m[2]));
      }
      if (date) out.push({ date, start: m.index, end: m.index + m[0].length, text: m[0] });
    }
  }
  return out;
}

/**
 * The first day the words name, resolved against `today`: a full date first, then a day of the month,
 * then relative words. Numbers like 10/12 are month/day in English and day/month in Spanish. When a
 * weekday beside a date disagrees with it ("Friday 10/15" when the 15th is a Thursday), there is no
 * date: the family picks one rather than getting a wrong one. With `fractions`, numbers like 3/4 are
 * read as numbers unless a year comes with them (for a request like "test me on 3/4").
 */
export function readDate(text: string, today: string, locale: Locale = "en", fractions = false): FoundDate | null {
  const byStart = (a: FoundDate, b: FoundDate) => a.start - b.start || b.end - a.end;
  const absolute = absoluteDates(text, today, locale, fractions);
  if (absolute === conflict) return null;
  if (absolute.length) return absolute.sort(byStart)[0];
  const days = monthDays(text, today);
  if (days.length) return days.sort(byStart)[0];

  const relative: FoundDate[] = [];
  for (const [re, offset] of RELATIVE) {
    const m = re.exec(text);
    const n = m && offset(m);
    if (m && n !== null) relative.push({ date: addDays(today, n), start: m.index, end: m.index + m[0].length, text: m[0] });
  }
  const w = WEEKDAY.exec(text);
  if (w) {
    const day = weekdayIndex(w[2]);
    const pre = (w[1] ?? "").toLowerCase();
    const post = (w[3] ?? "").toLowerCase();
    let date: string;
    if (pre === "next" || /next week|pr[oó]xima semana|semana que viene/.test(post)) date = addDays(weekStart(today), 7 + ((day + 6) % 7));
    else if (pre === "this" || pre === "este" || pre === "esta" || /this week|esta semana/.test(post)) date = coming(today, day, 0);
    else date = coming(today, day, 1);
    relative.push({ date, start: w.index, end: w.index + w[0].length, text: w[0] });
  }
  return relative.sort(byStart)[0] ?? null;
}

// --- titles ---------------------------------------------------------------------------------------

const CONNECTOR =
  "(?:is\\s+)?due|is|are|will be|was|on(?:\\s+the)?|by|for|before|until|this|next|at|el|la|este|esta|es|son|ser[aá]|para(?:\\s+el|\\s+la)?|antes\\s+del?|hasta(?:\\s+el)?|del?|en";
const LEAD_INS = [
  /^(?:hi|hello|hey|dear|hola|querid[oa]s|estimad[oa]s)\s+(?:families|family|parents|guardians|all|everyone|class|familias|padres|todos)\s*[,!:.]?\s+/iu,
  /^(?:reminder|recordatorio|note|nota|fyi|update|aviso|heads up)\s*[:,!-]\s*/iu,
  /^[\p{Lu}][\p{L}'’-]*\s+(?:here|aqu[ií])\s*[:,.!-]\s*/u, // "Maria here: …"
  /^(?:next week|this week|la pr[oó]xima semana|la semana que viene|esta semana)\s*,?\s+/iu,
  /^(?:(?:mr|mrs|ms|mx|dr|miss|prof|sr|sra|srta|maestr[oa]|profe(?:sor|sora)?|teacher|coach)\.?\s+[\p{L}'’-]+\s+|the teacher\s+|(?:la|el) (?:maestr[oa]|profe(?:sor|sora)?)\s+)(?:says|said|told us|wrote|dice|dijo|escribi[oó])\s+(?:that\s+|que\s+)?/iu,
  /^(?:please|pls|ok(?:ay)?|so|hey|hi|hola|oye|bueno)[,!]?\s+/iu,
  /^(?:(?:can|could) you\s+)?help(?:\s+me)?(?:\s+(?:with|on))?\s+/iu,
  /^(?:my|mi)\s+(?:son|daughter|kid|child|boy|girl|hij[oa]|ni[ñn][oa]|nen[ae])\s+(?:has|had|got|needs to do|has to do|tiene que hacer|tiene)\s+/iu,
  /^(?:i|we|you|they)(?:'ve got|'ll have|\s+(?:will have|are having|need help with|need to do|have to do|need to|have to|have|had|got|need))\s+/iu,
  /^(?:there(?:'s| is| are))\s+/iu,
  /^(?:it(?:'s| is)|this is|that's|es|son)\s+(?:for\s+|para\s+)?/iu,
  /^(?:(?:yo\s+)?tengo|tenemos|tiene|tienen|tendremos|tendr[aá]n?|vamos a tener|habr[aá]|hay|necesito ayuda con|ayuda con)\s+(?:que hacer\s+|que\s+)?/iu,
];
const ARTICLES = /^(?:a|an|my|our|the|some|this|un|una|unos|unas|mi|mis|el|la|los|las|nuestra|nuestro)\s+/iu;
const PRACTICE_LEAD = new RegExp(
  `^(?:(?:i|we)(?:'d like|\\s+would like|\\s+want|\\s+wanna|\\s+need)\\s+(?:to\\s+)?|let me\\s+|can i\\s+|(?:yo\\s+)?(?:quiero|necesito|me gustar[ií]a)\\s+)?(?:practi[cs]e|drill(?: me on)?|do (?:some|more)(?: practice (?:on|with))?|more practice(?: (?:on|with))?|extra practice(?: (?:on|with))?|more problems(?: (?:on|with))?|more of|more|quiz me on|test me on|work on|practicar|repasar|ejercitar|m[aá]s (?:pr[aá]ctica|ejercicios|problemas)(?: de| con)?|m[aá]s)${E}\\s*`,
  "iu",
);
const LEARN_LEAD = new RegExp(
  `^(?:(?:i|we)(?:'d like|\\s+would like|\\s+want|\\s+wanna)\\s+(?:to\\s+)?|(?:can|could) you\\s+|(?:yo\\s+)?(?:quiero|me gustar[ií]a)\\s+)?(?:learn about|learn|teach me about|teach me|tell me about|explain|aprender sobre|aprender de|aprender|ens[eé][ñn]ame sobre|ens[eé][ñn]ame|expl[ií]came)${E}\\s*`,
  "iu",
);
/** A request to the app itself ("teach me", "practice", "quiz me"): a day in it is when, not a due date. */
const ASKS_APP = new RegExp(`^(?:(?:can|could) you\\s+)?(?:teach me|tell me|explain to me|help me (?:learn|understand)|ens[eé][ñn]ame|expl[ií]came|cu[eé]ntame|ay[uú]dame a (?:entender|aprender))${E}`, "iu");

function tidy(s: string) {
  let out = s.replace(/\s+/g, " ").replace(/\s+([,;:.!?])/g, "$1").trim();
  for (let i = 0; i < 6; i++) {
    const before = out;
    out = out
      .replace(/^[\s,;:.\-–—|/]+/u, "")
      .replace(/[\s,;:\-–—|/(]+$/u, "")
      .replace(new RegExp(`${B}(?:${CONNECTOR})\\.?$`, "iu"), "")
      .replace(new RegExp(`${B}(?:please|pls|thanks|thank you|por favor|gracias)$`, "iu"), "")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (out === before) break;
  }
  return out;
}

const capital = (s: string) => (s ? s[0].toLocaleUpperCase() + s.slice(1) : s);

/** The words with the date phrase (and the "due", "on", "el" that lead into it) taken out. */
function withoutDate(text: string, found: FoundDate | null) {
  if (!found) return text;
  const head = text.slice(0, found.start).replace(new RegExp(`(?:${B}(?:${CONNECTOR})\\s+)+$`, "iu"), "");
  return `${head} ${text.slice(found.end)}`;
}

/** "Why is the sky blue?", "how do volcanoes work": a question, already a good name as it stands. */
const isQuestion = (s: string) => /\?\s*$/.test(s) || (cue(s, "learn")?.index === 0 && !LEARN_LEAD.test(s));

function titleFor(rest: string, kind: IntakeKind) {
  const raw = rest.replace(/\s+/g, " ").replace(/\s+([,;:.!?])/g, "$1").replace(/^[\s,;:.\-–—|/]+|[\s,;:\-–—|/(]+$/gu, "");
  if (kind === "learn" && isQuestion(raw)) return capital(raw).slice(0, 160);
  let s = tidy(raw);
  for (let i = 0; i < 5; i++) {
    const before = s;
    for (const re of LEAD_INS) s = s.replace(re, "");
    if (kind === "practice") s = s.replace(PRACTICE_LEAD, "");
    if (kind === "learn") s = s.replace(LEARN_LEAD, "");
    s = tidy(s.replace(ARTICLES, ""));
    if (s === before) break;
  }
  return capital(tidy(s.replace(/[?!.]+$/u, ""))).slice(0, 160);
}

/** Lines, then sentences ("Hi families! The quiz is Friday."), without splitting "Mrs. Lee" or "p. 45". */
function segments(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    let start = 0;
    for (const m of line.matchAll(/[.!?]+\s+(?=[\p{Lu}¿¡])/gu)) {
      const piece = line.slice(start, m.index + m[0].trimEnd().length);
      if (/(?:^|\s)(?:mr|mrs|ms|mx|dr|sr|sra|srta|prof|st|no|vs)\.$/iu.test(piece)) continue;
      out.push(piece.trim());
      start = m.index + m[0].length;
    }
    out.push(line.slice(start).trim());
  }
  return out.filter(Boolean);
}

// --- classes, subjects, skills --------------------------------------------------------------------

const fold = (s: string) =>
  ` ${s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()} `;

const classNamed = (text: string, classes: IntakeContext["classes"] = []) => {
  const t = fold(text);
  return classes.filter((c) => fold(c.name).trim().length >= 2 && t.includes(fold(c.name))).sort((a, b) => b.name.length - a.name.length)[0];
};
const onlyClassIn = (classes: IntakeContext["classes"] = [], subject?: Subject) => {
  const same = subject && subject !== "other" ? classes.filter((c) => c.subject === subject) : [];
  return same.length === 1 ? same[0] : undefined;
};

// Subjects from whole words, never from parts of words ("Tarea" isn't "area", "history" isn't "story").
// A subject's own name ("math test", "tarea de ciencias") outranks the skills the words match; a topic
// word ("fractions", "essay") only fills in when nothing else says.
const SUBJECT_NAMES: [Exclude<Subject, "other">, RegExp][] = [
  ["math", words("math|maths|mathematics|matem[aá]ticas?|mate|algebra|[aá]lgebra|pre-?algebra|geometry|geometr[ií]a|arithmetic|aritm[eé]tica|calculus")],
  ["science", words("science|ciencias?|biology|biolog[ií]a|chemistry|qu[ií]mica|physics|f[ií]sica|earth science|life science|physical science")],
  ["english", words("english|ingl[eé]s|ela|language arts|reading|lectura|spelling|ortograf[ií]a|writing|escritura|grammar|gram[aá]tica|literature|literatura")],
];
const SUBJECT_TOPICS: [Exclude<Subject, "other">, RegExp][] = [
  [
    "math",
    words(
      "fractions?|fracciones|decimals?|decimales|multiplication|multiplicaci[oó]n|division|divisi[oó]n|addition|subtraction|sumas?|restas?|equations?|ecuaciones|percents?|percentages?|porcentajes?|ratios?|integers?|times tables",
    ),
  ],
  ["science", words("lab|laboratorio|experiment|experimento|plants?|plantas?|animals?|animales|cells?|c[eé]lulas?|planets?|planetas?")],
  ["english", words("essay|ensayo|book report|vocabulary|vocabulario|poetry|poes[ií]a|poems?|poemas?|paragraph|p[aá]rrafo|story|cuento")],
];
// The form of the work outranks its topic: "a paragraph about plants" is writing, whatever it is about.
const TASK_FORMS: [Exclude<Subject, "other">, RegExp][] = [
  ["english", words("essay|ensayo|book report|informe de lectura|paragraph|p[aá]rrafo|poem|poema|journal entry|summary|resumen|persuasive letter|carta")],
];
function subjectIn(text: string, list: typeof SUBJECT_NAMES): Subject | undefined {
  return list
    .map(([s, re]) => [s, re.exec(text)?.index ?? Infinity] as const)
    .filter(([, i]) => i < Infinity)
    .sort((a, b) => a[1] - b[1])[0]?.[0];
}

/** Skills for the words: the school-word table first, then a skill whose title the words contain. */
function skillsFor(text: string, topic: string, subject?: Subject): string[] {
  const found = matchSkills(text, subject);
  if (found.length) return found;
  // Fallback for a skill named outright ("practice tell time"): two or more words of a title, or the whole title.
  const q = fold(topic);
  if (q.trim().split(" ").length < 2) return [];
  return SKILLS.filter((k) => (!subject || subject === "other" || k.subject === subject) && [k.title.en, k.title.es].some((title) => fold(title).includes(q) || q.includes(fold(title))))
    .slice(0, 3)
    .map((k) => k.id);
}

// --- the classifier -------------------------------------------------------------------------------

const SCHOOLWORK = new Set<SchoolKind>(["test", "quiz", "project", "homework"]);

/**
 * What the words in the box are, in the order of plan §2.2. A test or quiz word, then a project word,
 * then a homework word makes that school item; a day off or a school event is filed as one; then a date
 * on its own makes a school item (the planner's kind words decide which, homework by default) unless the
 * words open as a request to the app ("practice fractions tomorrow", "Why…?"); then practice words; then
 * learn, which is also the answer when nothing else fits.
 */
export function classifyIntake(text: string, ctx: IntakeContext): IntakeGuess {
  const locale = ctx.locale ?? "en";
  // A pasted page: the sentence with a day and a school word carries the item; failing that, the first
  // one with a day; a sentence with a school word names it; the rest says what it covers.
  const parts = segments(text);
  const opener = parts[0] ?? "";
  // In a request to the app ("test me on 3/4", "practice 6/12", "what is 3/4 of 12?") numbers are numbers.
  const request = /\?\s*$/.test(opener) || ASKS_APP.test(opener) || PRACTICE_LEAD.test(opener);
  const dated = (s: string) => readDate(s, ctx.today, locale, request);
  // Weightier school work wins: a test over homework, homework over a day off or a field trip.
  const ranked = (pick: (l: string) => unknown) => RANKS.map((names) => parts.find((l) => names.some((n) => cue(l, n)) && pick(l))).find(Boolean);
  const named = ranked(() => true);
  const line = ranked(dated) ?? (parts.length > 1 ? parts.find(dated) : undefined) ?? named ?? opener;
  const found = dated(line);
  const rest = withoutDate(line, found);
  const scope = parts.length < 2 || schooly(line) ? line : text;
  const at = (name: CueName) => cue(scope, name);
  const question = /\?\s*$/.test(line) || /\?\s*$/.test(opener);
  const asksApp = question || ASKS_APP.test(opener) || PRACTICE_LEAD.test(opener);
  const asks = asksApp || LEARN_LEAD.test(opener) || cue(opener, "learn")?.index === 0 || cue(opener, "practice")?.index === 0;

  // Test or quiz, whichever the words say first.
  const exam = (["test", "quiz"] as const)
    .flatMap((k) => {
      const c = at(k);
      return c ? [{ kind: k, ...c }] : [];
    })
    .sort((a, b) => a.index - b.index)[0];
  const project = at("project");
  const homework = at("homework");
  const noSchool = at("noSchool");
  const event = at("event");
  const forDay = at("forDay");
  const practice = at("practice");
  const learn = at("learn");

  let kind: IntakeKind;
  let reason: IntakeReason;
  if (exam) [kind, reason] = [exam.kind, { rule: exam.kind, cue: exam.cue }];
  else if (project) [kind, reason] = ["project", { rule: "project", cue: project.cue }];
  else if (homework) [kind, reason] = ["homework", { rule: "homework", cue: homework.cue }];
  else if (noSchool) [kind, reason] = ["no-school", { rule: "no-school", cue: noSchool.cue }];
  else if (event) [kind, reason] = ["event", { rule: "event", cue: event.cue }];
  else if (forDay && !asksApp) [kind, reason] = ["homework", { rule: "homework", cue: forDay.cue }];
  else if (found && !asks) {
    // The planner's calendar words ("lab report", "essay", "final") pick the kind; homework otherwise.
    const planned = classify(line) as SchoolKind;
    [kind, reason] = [SCHOOLWORK.has(planned) ? planned : "homework", { rule: "date", cue: found.text.trim() }];
  } else if (practice) [kind, reason] = ["practice", { rule: "practice", cue: practice.cue }];
  else if (learn) [kind, reason] = ["learn", { rule: "learn", cue: learn.cue }];
  else [kind, reason] = ["learn", { rule: "default" }];

  // A question keeps its date words ("Why is Friday the 13th unlucky?"); everything else loses them.
  let title = titleFor(kind === "learn" && isQuestion(line) ? line : rest, kind);
  if (!title && named && named !== line) title = titleFor(withoutDate(named, dated(named)), kind);
  if (!title) title = parts.map((p) => titleFor(withoutDate(p, dated(p)), kind)).find(Boolean) ?? "";
  const about = parts.length > 1 ? `${rest} ${parts.filter((p) => p !== line).join(" ")}` : rest;

  // A class named in the words decides the subject (the item's own sentence first, then the rest of a
  // pasted page); then the subject's own name; then the skills; then topic words. When exactly one of
  // the learner's classes is in that subject, it is picked; the family sees it and can change it.
  const inClass = classNamed(rest, ctx.classes) ?? classNamed(about, ctx.classes);
  const said = inClass?.subject ?? subjectIn(rest, SUBJECT_NAMES) ?? subjectIn(about, SUBJECT_NAMES) ?? subjectIn(rest, TASK_FORMS);
  const skillIds = skillsFor(about, title, said);
  const subject = said ?? getSkill(skillIds[0] ?? "")?.subject ?? subjectIn(about, SUBJECT_TOPICS);
  const cls = inClass ?? onlyClassIn(ctx.classes, subject);
  return { kind, title, date: found?.date, subject, skillIds, classId: cls?.id, classNamed: !!inClass || undefined, reason };
}

// --- AI reading (when connected) ------------------------------------------------------------------

export type AiRead = { kind: (typeof INTAKE_KINDS)[number]; title: string; date?: string; subject?: Subject; topic?: string; skillIds: string[]; notes: string[] };

/** The AI reader's answer folded into the rules' guess. A day the words name beats the model's. */
export function mergeGuess(rules: IntakeGuess, ai: AiRead, ctx: IntakeContext): IntakeGuess {
  const skillIds = [...new Set([...ai.skillIds, ...rules.skillIds])].filter((id) => getSkill(id)).slice(0, 3);
  const subject = ai.subject && ai.subject !== "other" ? ai.subject : (rules.subject ?? getSkill(skillIds[0] ?? "")?.subject);
  // A class the family named stays, and so does the rules' pick when the model reads the same subject;
  // otherwise the model's reading picks one.
  const named = rules.classNamed ? undefined : classNamed(`${ai.title} ${ai.topic ?? ""}`, ctx.classes);
  const keep = rules.classNamed || (!named && (!ai.subject || ai.subject === "other" || ai.subject === rules.subject));
  const classId = keep ? rules.classId : (named?.id ?? onlyClassIn(ctx.classes, subject)?.id);
  return {
    kind: ai.kind,
    title: ai.title || rules.title,
    date: rules.date ?? ai.date,
    subject,
    skillIds,
    classId,
    classNamed: rules.classNamed || !!named || undefined,
    reason: { rule: "ai" },
  };
}

/** Checks what came back from /api/ai/extract; anything malformed is dropped rather than trusted. */
export function parseAiRead(out: unknown, restore: (s: string) => string = (s) => s): AiRead | null {
  if (typeof out !== "object" || out === null) return null;
  const o = out as Record<string, unknown>;
  if (!INTAKE_KINDS.includes(o.kind as AiRead["kind"]) || typeof o.title !== "string") return null;
  const str = (v: unknown, max: number) => (typeof v === "string" ? restore(v).replace(/\s+/g, " ").trim().slice(0, max) : "");
  const subject = ["math", "science", "english", "other"].includes(o.subject as string) ? (o.subject as Subject) : undefined;
  return {
    kind: o.kind as AiRead["kind"],
    title: str(o.title, 160),
    date: typeof o.date === "string" && isDay(o.date) && localDate(fromLocalDate(o.date)) === o.date ? o.date : undefined,
    subject,
    topic: str(o.topic, 120) || undefined,
    skillIds: Array.isArray(o.skillIds) ? o.skillIds.filter((id): id is string => typeof id === "string" && !!getSkill(id)).slice(0, 3) : [],
    notes: Array.isArray(o.notes)
      ? o.notes
          .map((n) => str(n, 200))
          .filter(Boolean)
          .slice(0, 8)
      : [],
  };
}

/** The saved item came from the AI reader only when its kind, name and day are all the reader's. */
export function readByAi(ai: AiRead | null, saved: { kind: IntakeKind; title: string; date: string }) {
  const same = (a: string, b: string) => a.replace(/\s+/g, " ").trim() === b.replace(/\s+/g, " ").trim();
  return !!ai && ai.kind === saved.kind && !!ai.title && same(ai.title, saved.title) && ai.date === saved.date;
}

// Letters that may arrive with or without their accent.
const LOOSE: Record<string, string> = { a: "aáàâäã", e: "eéèêë", i: "iíìîï", o: "oóòôöõ", u: "uúùûü", n: "nñ", c: "cç", y: "yý" };

/**
 * Learner names never go to a model, nor the grown-up's own name. Each one in the text becomes
 * "[name1]", "[name2]"…, and `restore` puts them back into what the model returns, on this device only.
 * A full name is also taken out word by word ("Maria Lopez" → "Maria", "Lopez").
 */
export function redactNames(text: string, names: string[]) {
  const parts = names.flatMap((n) => [n, ...n.split(/\s+/)]);
  const list = [...new Set(parts.map((n) => n.trim()).filter((n) => n.length >= 2))].sort((a, b) => b.length - a.length);
  const pairs: [string, string][] = [];
  let out = text;
  list.forEach((name) => {
    const pattern = [...name.normalize("NFD").replace(/\p{Diacritic}/gu, "")]
      .map((ch) => {
        const loose = LOOSE[ch.toLowerCase()];
        return loose ? `[${loose}${loose.toUpperCase()}]` : ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      })
      .join("");
    const token = `[name${pairs.length + 1}]`;
    const next = out.replace(new RegExp(`${B}${pattern}${E}`, "giu"), token);
    if (next !== out) {
      out = next;
      pairs.push([token, name]);
    }
  });
  return { text: out, restore: (s: string) => pairs.reduce((acc, [token, name]) => acc.split(token).join(name), s) };
}

/** Photos above this are not sent to the AI reader (hosting caps a request near 4.5 MB). */
export const AI_FILE_MAX_BYTES = 3 * 1024 * 1024;

/** Asks the AI reader what the words or file are. null when AI isn't connected or the read failed. */
export async function readWithAi(input: { text: string; file?: Blob; today: string; locale: Locale; grade: Grade; names: string[] }): Promise<AiRead | null> {
  const { text, restore } = redactNames(input.text.slice(0, TEXT_MAX), input.names);
  let file: string | undefined;
  if (input.file) {
    if (input.file.size > AI_FILE_MAX_BYTES) return null;
    file = await dataUrl(input.file).catch(() => undefined);
    if (!file) return null;
  }
  const res = await fetch("/api/ai/extract", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind: "intake", text: text.trim() || undefined, file, today: input.today, locale: input.locale, grade: input.grade }),
  }).catch(() => null);
  if (!res?.ok) return null;
  return parseAiRead(await res.json().catch(() => null), restore);
}

// --- making things --------------------------------------------------------------------------------

export type SchoolDraft = {
  kind: SchoolKind;
  title: string;
  date: string;
  classId?: string;
  skillIds: string[];
  /** What was typed or pasted. Kept with the item only when the title doesn't already say it. */
  text?: string;
  /** The title the rules read from those words; when the saved title differs, the words are kept. */
  wordsTitle?: string;
  file?: { blob: Blob; name: string };
  source: SchoolEvent["source"];
};

const same = (a: string, b: string) => a.replace(/\s+/g, " ").trim().toLocaleLowerCase() === b.replace(/\s+/g, " ").trim().toLocaleLowerCase();

/**
 * A pasted page or a long note is kept, and so are the words whenever the family renamed the item
 * ("p. 45-46 #1-19 odd" saved as "Math homework"). A one-line request already lives in its title and date.
 */
export const keepsText = (text: string, title?: string, wordsTitle?: string) => {
  const t = text.trim();
  if (!t) return false;
  if (/\n/.test(t) || t.length > 160) return true;
  return title !== undefined && wordsTitle !== undefined && !same(title, wordsTitle);
};

/** Saves a school item from the box, with its photo or PDF in the file store. */
export async function saveSchoolItem(profileId: string, d: SchoolDraft): Promise<SchoolEvent | "err.title" | "err.date" | "err.file"> {
  const input: EventInput = { title: d.title, kind: d.kind, date: d.date, classId: d.classId || undefined, skillIds: d.skillIds.filter((id) => getSkill(id)).slice(0, 6) };
  const problem = checkEvent(input);
  if (problem) return problem;
  const blobId = d.file ? await putBlob(d.file.blob, d.file.name) : null;
  if (d.file && !blobId) return "err.file";
  const text = d.text && keepsText(d.text, d.title, d.wordsTitle) ? d.text.trim() : undefined;
  const attachment = text || blobId ? { text, blobId: blobId ?? undefined, name: d.file?.name, mediaType: d.file?.blob.type || undefined } : undefined;
  const made = addEvent(profileId, { ...input, attachment }, d.source);
  if (!made && blobId) await deleteBlob(blobId);
  return made ?? "err.title";
}

/** Where "learn" goes: the course builder, with the goal filled in. */
export const builderHref = (goal: string) => `/courses/new?goal=${encodeURIComponent(goal.trim().slice(0, 2000))}`;

/** Where "practice" goes when no skill fits and no AI can write questions: the practice list. */
export const practiceSearchHref = (topic: string, subject?: Subject) => {
  const q = new URLSearchParams({ q: topic.trim().slice(0, 120) });
  if (subject && subject !== "other") q.set("subject", subject);
  return `/practice?${q}`;
};
