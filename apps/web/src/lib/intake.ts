import { addDays, fromLocalDate, isDay, localDate, weekStart } from "@/planner/dates";
import { readSchoolText } from "@/planner/intake";
import { matchSkills } from "@/planner/skillmatch";
import type { SchoolClass, SchoolEvent } from "@/planner/types";
import { getSkill, SKILLS } from "@/practice/skills";
import { dataUrl, deleteBlob, putBlob } from "./blobs";
import { guessSubject } from "./generate";
import { addEvent, checkEvent, type EventInput } from "./school";
import type { Grade, Locale, Subject } from "./types";

// The magic box's first question: what is this? Rules first, the same way every time; the AI reader
// (when connected) only refines a guess, and the family always sees and can change the guess before
// anything is made. Deterministic and conservative like planner/intake.ts: a date is used only when
// the words give one, never invented.

/** The most the box takes: room for a pasted teacher email or assignment sheet. */
export const TEXT_MAX = 4000;

export const INTAKE_KINDS = ["homework", "test", "quiz", "project", "practice", "learn"] as const;
export type IntakeKind = (typeof INTAKE_KINDS)[number];
export type SchoolKind = Extract<IntakeKind, "homework" | "test" | "quiz" | "project">;
export const isSchoolKind = (k: IntakeKind): k is SchoolKind => k === "homework" || k === "test" || k === "quiz" || k === "project";

/** Which rule decided the kind, and the words that triggered it (shown to the family as the reason). */
export type IntakeReason = { rule: "test" | "quiz" | "project" | "homework" | "date" | "practice" | "learn" | "default" | "ai"; cue?: string };

export type IntakeGuess = {
  kind: IntakeKind;
  title: string;
  /** YYYY-MM-DD, only when the words name a day. Kept for every kind so a change to "homework" keeps it. */
  date?: string;
  subject?: Subject;
  skillIds: string[];
  classId?: string;
  reason: IntakeReason;
};

export type IntakeContext = { today: string; classes?: Pick<SchoolClass, "id" | "name" | "subject">[] };

// --- words ----------------------------------------------------------------------------------------

// Word edges that understand accents (JS \b treats "á" as a non-letter).
const B = "(?<![\\p{L}\\p{N}])";
const E = "(?![\\p{L}\\p{N}])";
const words = (body: string) => new RegExp(`${B}(?:${body})${E}`, "iu");
const NOT_ME = `(?!\\s+me${E})`; // "quiz me", "test me" ask for practice, not a school test

const CUES: [Exclude<IntakeReason["rule"], "date" | "default" | "ai">, RegExp][] = [
  ["test", words(`(?:tests?|exams?|ex[aá]men(?:es)?|midterms?|evaluaci[oó]n)${NOT_ME}`)],
  ["quiz", words(`(?:quiz(?:zes)?|pruebas?)${NOT_ME}`)],
  ["project", words("projects?|proyectos?|science fair|feria de ciencias|dioramas?")],
  [
    "homework",
    words(
      "homework|hw|worksheets?|assignments?|due|reading log|(?:pages?|pgs?|pp?|p[aá]g(?:ina)?s?)\\.?\\s*\\d+|problems?\\s+\\d+|tareas?|deberes|hoja de|hojas de (?:trabajo|ejercicios|tarea|actividades)|fichas?|(?<!m[aá]s\\s)ejercicios|entregar|para (?:el|la) (?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|\\d{1,2})|para (?:ma[ñn]ana|hoy)",
    ),
  ],
  [
    "practice",
    words(
      "practi[cs]e|practi[cs]ing|drills?|drill me|more of|more practice|extra practice|more problems|quiz me|test me|practicar|pr[aá]ctica|practico|repasar|ejercitar|m[aá]s ejercicios|m[aá]s pr[aá]ctica|m[aá]s problemas|^\\s*m[aá]s",
    ),
  ],
  [
    "learn",
    words(
      "learn|learning|teach me|explain|why|how|what(?:'s| is| are| was| were| does| do)|who (?:is|was)|tell me about|aprender|ens[eé][ñn]ame|expl[ií]came|por qu[eé]|c[oó]mo|qu[eé] (?:es|son|significa)|qui[eé]n (?:es|fue)",
    ),
  ],
];

function cue(text: string, rule: (typeof CUES)[number][0]) {
  const m = CUES.find(([r]) => r === rule)![1].exec(text);
  return m ? { index: m.index, cue: m[0].trim() } : null;
}

// --- dates ----------------------------------------------------------------------------------------

const WEEKDAYS: string[] = [
  "sunday|domingo",
  "monday|mon|lunes",
  "tuesday|tues|tue|martes",
  "wednesday|weds|wed|mi[eé]rcoles",
  "thursday|thurs|thur|thu|jueves",
  "friday|fri|viernes",
  "saturday|s[aá]bado",
]; // index = Date#getDay(). "sun" and "sat" are left out: "the sun" is not Sunday.
const WD_RES = WEEKDAYS.map((w) => new RegExp(`^(?:${w})$`, "iu"));
const WD = WEEKDAYS.join("|");

const WEEKDAY = new RegExp(
  `${B}(?:(this coming|this|next|coming|el pr[oó]ximo|pr[oó]ximo|este|esta)\\s+)?(${WD})\\.?(?:'s|’s)?(?:\\s+(next week|this week|que viene|pr[oó]ximo|de la pr[oó]xima semana|de la semana que viene|de esta semana))?${E}`,
  "iu",
);

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

const MONTH =
  "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)";
const ABSOLUTE = [
  new RegExp(`${B}\\d{4}-\\d{1,2}-\\d{1,2}${E}`, "giu"),
  new RegExp(`${B}${MONTH}\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+\\d{4})?${E}`, "giu"),
  new RegExp(`${B}\\d{1,2}\\s+(?:de\\s+)?${MONTH}(?:\\s+(?:de\\s+)?\\d{4})?${E}`, "giu"),
  new RegExp(`${B}\\d{1,2}\\/\\d{1,2}(?:\\/(?:\\d{4}|\\d{2}))?${E}`, "giu"),
];
// "3/4" is a fraction until something says it's a day: a year, or "due", "on", "test"… right before it.
const NUMERIC_CUE = new RegExp(`${B}(?:due|on|by|for|before|until|test|quiz|exam|ex[aá]men|prueba|el|para|del|hasta|antes de)\\s*[:,]?\\s*$`, "iu");

export type FoundDate = { date: string; start: number; end: number; text: string };

function coming(today: string, weekday: number, min: number) {
  const now = fromLocalDate(today).getDay();
  return addDays(today, min + ((weekday - now - min + 14) % 7));
}

/** The first day the words name, resolved against `today`. Absolute dates win over relative words. */
export function readDate(text: string, today: string): FoundDate | null {
  // Absolute: spans found here, the day itself read by planner/intake.ts (US order, next occurrence).
  const absolute: FoundDate[] = [];
  for (const re of ABSOLUTE) {
    re.lastIndex = 0;
    for (let m = re.exec(text); m; m = re.exec(text)) {
      const numeric = m[0].includes("/");
      if (numeric && !/\/\d{2,4}$/.test(m[0]) && !NUMERIC_CUE.test(text.slice(Math.max(0, m.index - 24), m.index))) continue;
      const date = readSchoolText(`x ${m[0]}`, today).found[0]?.date;
      if (date) absolute.push({ date, start: m.index, end: m.index + m[0].length, text: m[0] });
    }
  }
  absolute.sort((a, b) => a.start - b.start || b.end - a.end);
  if (absolute[0]) {
    // "Friday, Oct 16" / "viernes 16 de octubre": the weekday goes with the date.
    const a = absolute[0];
    const before = new RegExp(`${B}(?:${WD})\\.?,?\\s+(?:the\\s+)?$`, "iu").exec(text.slice(0, a.start));
    return before ? { ...a, start: before.index, text: text.slice(before.index, a.end) } : a;
  }

  const relative: FoundDate[] = [];
  for (const [re, days] of RELATIVE) {
    const m = re.exec(text);
    const n = m && days(m);
    if (m && n !== null) relative.push({ date: addDays(today, n), start: m.index, end: m.index + m[0].length, text: m[0] });
  }
  const w = WEEKDAY.exec(text);
  if (w) {
    const day = WD_RES.findIndex((re) => re.test(w[2]));
    const pre = (w[1] ?? "").toLowerCase();
    const post = (w[3] ?? "").toLowerCase();
    let date: string;
    if (pre === "next" || /next week|pr[oó]xima semana|semana que viene/.test(post)) date = addDays(weekStart(today), 7 + ((day + 6) % 7));
    else if (pre === "this" || pre === "este" || pre === "esta" || /this week|esta semana/.test(post)) date = coming(today, day, 0);
    else date = coming(today, day, 1);
    relative.push({ date, start: w.index, end: w.index + w[0].length, text: w[0] });
  }
  relative.sort((a, b) => a.start - b.start);
  return relative[0] ?? null;
}

// --- titles ---------------------------------------------------------------------------------------

const CONNECTOR = "(?:is\\s+)?due|is|are|on(?:\\s+the)?|by|for|before|until|this|next|at|el|la|este|esta|para(?:\\s+el|\\s+la)?|antes\\s+del?|hasta(?:\\s+el)?|del?|en";
const LEAD_INS = [
  /^(?:please|pls|ok(?:ay)?|so|hey|hi|hola|oye|bueno)[,!]?\s+/iu,
  /^(?:(?:can|could) you\s+)?help(?:\s+me)?(?:\s+(?:with|on))?\s+/iu,
  /^(?:i|we)(?:'ve got|\s+(?:need help with|need to do|have to do|need to|have to|have|had|got|need))\s+/iu,
  /^(?:there(?:'s| is| are))\s+/iu,
  /^(?:(?:yo\s+)?tengo|tenemos|tiene|hay|necesito ayuda con|ayuda con)\s+(?:que hacer\s+)?/iu,
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

function tidy(s: string) {
  let out = s.replace(/\s+/g, " ").trim();
  for (let i = 0; i < 6; i++) {
    const before = out;
    out = out
      .replace(/^[\s,;:.\-–—|/]+/u, "")
      .replace(/[\s,;:\-–—|/(]+$/u, "")
      .replace(new RegExp(`${B}(?:${CONNECTOR})\\.?$`, "iu"), "")
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

function titleFor(rest: string, kind: IntakeKind) {
  const raw = rest.replace(/\s+/g, " ").replace(/^[\s,;:.\-–—|/]+|[\s,;:\-–—|/(]+$/gu, "");
  // A question to learn from stays the question: "Why is the sky blue?" is already a good name.
  if (kind === "learn" && (/\?$/.test(raw) || (cue(raw, "learn")?.index === 0 && !LEARN_LEAD.test(raw)))) return capital(raw).slice(0, 160);
  let s = tidy(raw);
  for (let i = 0; i < 4; i++) {
    const before = s;
    for (const re of LEAD_INS) s = s.replace(re, "");
    if (kind === "practice") s = s.replace(PRACTICE_LEAD, "");
    if (kind === "learn") s = s.replace(LEARN_LEAD, "");
    s = s.replace(ARTICLES, "");
    if (s === before) break;
  }
  return capital(tidy(s.replace(/[?!.]+$/u, ""))).slice(0, 160);
}

// --- classes, subjects, skills --------------------------------------------------------------------

const fold = (s: string) =>
  ` ${s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()} `;

function classFor(text: string, classes: IntakeContext["classes"] = [], subject?: Subject) {
  const t = fold(text);
  const named = classes.filter((c) => fold(c.name).trim().length >= 2 && t.includes(fold(c.name))).sort((a, b) => b.name.length - a.name.length)[0];
  if (named) return named;
  const same = subject && subject !== "other" ? classes.filter((c) => c.subject === subject) : [];
  return same.length === 1 ? same[0] : undefined;
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

/**
 * What the words in the box are, in the order of plan §2.2: a test, quiz, project or homework word (or a
 * date with no practice/learn words) makes a school item; then practice words; then learn — which is
 * also the answer when nothing else fits. Test and quiz outrank project, and project outranks the
 * generic homework words, so "science project due Friday" is a project.
 */
export function classifyIntake(text: string, ctx: IntakeContext): IntakeGuess {
  // A pasted page: the line with a day carries the item, a line with a school word names it, and the
  // whole page says what kind it is and what it covers.
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const named = lines.find((l) => SCHOOL_CUES.some((r) => cue(l, r)));
  const line = (lines.length > 1 && lines.find((l) => readDate(l, ctx.today))) || named || lines[0] || "";
  const scope = lines.length > 1 ? text : line;
  const found = readDate(line, ctx.today);
  const rest = withoutDate(line, found);

  // Test or quiz, whichever the words say first.
  const exam = (["test", "quiz"] as const)
    .flatMap((k) => {
      const c = cue(scope, k);
      return c ? [{ kind: k, ...c }] : [];
    })
    .sort((a, b) => a.index - b.index)[0];
  const project = cue(scope, "project");
  const homework = cue(scope, "homework");
  const practice = cue(scope, "practice");
  const learn = cue(scope, "learn");

  let kind: IntakeKind;
  let reason: IntakeReason;
  if (exam) [kind, reason] = [exam.kind, { rule: exam.kind, cue: exam.cue }];
  else if (project) [kind, reason] = ["project", { rule: "project", cue: project.cue }];
  else if (homework) [kind, reason] = ["homework", { rule: "homework", cue: homework.cue }];
  else if (found && !practice && !learn) [kind, reason] = ["homework", { rule: "date", cue: found.text.trim() }];
  else if (practice) [kind, reason] = ["practice", { rule: "practice", cue: practice.cue }];
  else if (learn) [kind, reason] = ["learn", { rule: "learn", cue: learn.cue }];
  else [kind, reason] = ["learn", { rule: "default" }];

  // A question keeps its date words ("Why is Friday the 13th unlucky?"); everything else loses them.
  let title = titleFor(kind === "learn" ? line : rest, kind);
  if (!title && named && named !== line) title = titleFor(withoutDate(named, readDate(named, ctx.today)), kind);
  const about = lines.length > 1 ? `${rest} ${text.replace(line, " ")}` : rest;
  const inClass = classFor(about, ctx.classes);
  const skillIds = skillsFor(about, title, inClass?.subject);
  const guessed = guessSubject(title);
  const subject = inClass?.subject ?? getSkill(skillIds[0] ?? "")?.subject ?? (guessed === "other" ? undefined : guessed);
  const cls = inClass ?? classFor(about, ctx.classes, subject);
  return { kind, title, date: found?.date, subject, skillIds, classId: cls?.id, reason };
}

const SCHOOL_CUES = ["test", "quiz", "project", "homework"] as const;

// --- AI reading (when connected) ------------------------------------------------------------------

export type AiRead = { kind: IntakeKind; title: string; date?: string; subject?: Subject; topic?: string; skillIds: string[]; notes: string[] };

/** The AI reader's answer folded into the rules' guess. A day the words name beats the model's. */
export function mergeGuess(rules: IntakeGuess, ai: AiRead, ctx: IntakeContext): IntakeGuess {
  const skillIds = [...new Set([...ai.skillIds, ...rules.skillIds])].filter((id) => getSkill(id)).slice(0, 3);
  const subject = ai.subject && ai.subject !== "other" ? ai.subject : (rules.subject ?? getSkill(skillIds[0] ?? "")?.subject);
  return {
    kind: ai.kind,
    title: ai.title || rules.title,
    date: rules.date ?? ai.date,
    subject,
    skillIds,
    classId: rules.classId ?? classFor(`${ai.title} ${ai.topic ?? ""}`, ctx.classes, subject)?.id,
    reason: { rule: "ai" },
  };
}

/** Checks what came back from /api/ai/extract; anything malformed is dropped rather than trusted. */
export function parseAiRead(out: unknown, restore: (s: string) => string = (s) => s): AiRead | null {
  if (typeof out !== "object" || out === null) return null;
  const o = out as Record<string, unknown>;
  if (!INTAKE_KINDS.includes(o.kind as IntakeKind) || typeof o.title !== "string") return null;
  const str = (v: unknown, max: number) => (typeof v === "string" ? restore(v).replace(/\s+/g, " ").trim().slice(0, max) : "");
  const subject = ["math", "science", "english", "other"].includes(o.subject as string) ? (o.subject as Subject) : undefined;
  return {
    kind: o.kind as IntakeKind,
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

// Letters that may arrive with or without their accent.
const LOOSE: Record<string, string> = { a: "aáàâäã", e: "eéèêë", i: "iíìîï", o: "oóòôöõ", u: "uúùûü", n: "nñ", c: "cç", y: "yý" };

/**
 * Learner names never go to a model. Each one in the text becomes "[name1]", "[name2]"…, and
 * `restore` puts them back into what the model returns, on this device only.
 */
export function redactNames(text: string, names: string[]) {
  const list = [...new Set(names.map((n) => n.trim()).filter((n) => n.length >= 2))].sort((a, b) => b.length - a.length);
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
  const { text, restore } = redactNames(input.text.slice(0, 4000), input.names);
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
  /** What was typed or pasted. Kept with the item only when it says more than the title does. */
  text?: string;
  file?: { blob: Blob; name: string };
  source: SchoolEvent["source"];
};

/** A pasted page or a long note is kept; a one-line request already lives in the title and date. */
export const keepsText = (text: string) => /\n/.test(text.trim()) || text.trim().length > 160;

/** Saves a school item from the box, with its photo or PDF in the file store. */
export async function saveSchoolItem(profileId: string, d: SchoolDraft): Promise<SchoolEvent | "err.title" | "err.date" | "err.file"> {
  const input: EventInput = { title: d.title, kind: d.kind, date: d.date, classId: d.classId || undefined, skillIds: d.skillIds.filter((id) => getSkill(id)).slice(0, 6) };
  const problem = checkEvent(input);
  if (problem) return problem;
  const blobId = d.file ? await putBlob(d.file.blob, d.file.name) : null;
  if (d.file && !blobId) return "err.file";
  const text = d.text && keepsText(d.text) ? d.text.trim() : undefined;
  const attachment = text || blobId ? { text, blobId: blobId ?? undefined, name: d.file?.name, mediaType: d.file?.blob.type || undefined } : undefined;
  const made = addEvent(profileId, { ...input, attachment }, d.source);
  if (!made && blobId) await deleteBlob(blobId);
  return made ?? "err.title";
}

/** Where "learn" goes: the course builder, with the goal filled in. */
export const builderHref = (goal: string) => `/courses/new?goal=${encodeURIComponent(goal.trim().slice(0, 2000))}`;

/** Where "practice" goes when no skill fits and no AI can write questions: the practice search. */
export const practiceSearchHref = (topic: string, subject?: Subject) => {
  const q = new URLSearchParams({ q: topic.trim().slice(0, 120) });
  if (subject && subject !== "other") q.set("subject", subject);
  return `/practice?${q}`;
};
