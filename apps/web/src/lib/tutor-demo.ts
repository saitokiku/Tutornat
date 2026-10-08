import { CATALOGUE, catalogueFor } from "@/catalogue";
import { t } from "@/i18n";
import type { Book, Definition, Poem, WikiSummary } from "@/knowledge";
import { addDays, fromLocalDate } from "@/planner/dates";
import { readSchoolText } from "@/planner/intake";
import { joinCompounds, matchSkills, sameWord, tokens } from "@/planner/skillmatch";
import type { EventKind } from "@/planner/types";
import { getSkill, SKILLS } from "@/practice/skills";
import type { Item } from "@/practice/types";
import { linkOf, resourcesFor } from "@/resources";
import { suitable } from "./ai/safety";
import type { BoardCard } from "./tutor";
import { similarItem } from "@/components/tutor/similar";
import { wiktionaryUrl } from "@/components/tutor/sources";
import type { Grade, Locale, Scene } from "./types";

// The demo tutor: what the tutor can do with no AI connected. It answers from real, named sources and
// vetted material only — Wikipedia extracts with their links, dictionary senses, the key points of our
// own lessons, the practice that fits, a problem's hint ladder and worked steps, and a fresh problem of
// the same kind worked out. It never solves the learner's own problem, never shows a worked step before
// a try, and says once that it is the demo.

export type DemoFetchers = {
  wiki: (topic: string, lang: Locale) => Promise<WikiSummary | null>;
  define: (word: string) => Promise<Definition[]>;
  books: (q: string) => Promise<Book[]>;
  poems: (author: string) => Promise<Poem[]>;
  shortPoems: () => Promise<Poem[]>;
};

export type DemoContext = {
  locale: Locale;
  grade: Grade;
  /** Today as YYYY-MM-DD, for dates the learner mentions. */
  today: string;
  /** The problem on screen, when the tutor sits beside one. */
  item?: Item;
  /** Hints the learner already opened on that problem, so the tutor's ladder continues past them. */
  hintsSeen?: number;
  homework?: { title: string; notes?: string };
  /** The lesson on the stage, when the tutor sits beside one. */
  lesson?: { title: string };
  /** The topics a young learner can tap at the start, so the spoken opening names them. */
  choices?: string[];
  /** The family's names (familyNames): a search that mentions one never leaves the device. */
  names?: string[];
  /** Fresh seeds for worked examples (random in the browser, fixed in tests). */
  seed: () => number;
};

export type DemoState = {
  hintsGiven: number;
  tries: number;
  /** The skill the conversation is about, once it has turned to one. */
  skillId?: string;
  /** The topic last asked about, for "explain it a different way". */
  topic?: string;
  /** What has been shown already ("similar", "step", "lesson", "definition"), so nothing repeats. */
  shown: string[];
  /** Problems the learner typed in this conversation: no worked example may have their numbers. */
  typed?: string[];
};

/** `help`: the opening's vetted hint for a young learner, shown as its own line once it is saved as help. */
export type DemoTurn = { text: string; cards: BoardCard[]; state: DemoState; help?: string };

export const young = (grade: Grade) => grade === "K" || grade === "1" || grade === "2";

/* ------------------------------------------------------------------ reading the ask */

export type Ask =
  | { kind: "greet" | "thanks" | "hint" | "similar" | "different" | "answer" | "step" | "check" | "other" }
  | { kind: "define"; word: string }
  /** "What does … mean?" sent with the gap still empty. */
  | { kind: "which" }
  | { kind: "book"; topic: string }
  | { kind: "poem"; author?: string }
  | { kind: "calendar" }
  | { kind: "problem"; skillId: string }
  /** A skill named by its own title, as the skill chips send it. */
  | { kind: "skill"; skillId: string }
  /** `topic` is set only when there is something to look up (see lookupTopic). */
  | { kind: "topic"; topic?: string };

const clip = (s: string) => s.replace(/^[\s"'“”‘’¿¡]+|[\s"'“”‘’?!.,;:¿¡]+$/g, "").trim();
const ARTICLE = /^(?:an?|the|el|la|los|las|un|una|unos|unas|lo)\s+/i;

// How a question about something starts, in English and Spanish.
const FRAMES = [
  /^(?:what|who|where)\s+(?:is|are|was|were)\s+(.+)$/,
  /^(?:what'?s|whats|who'?s)\s+(.+)$/,
  /^(?:tell me|teach me|explain|show me|i want to learn|i want to know|learn)\s+(?:about\s+|how\s+)?(.+)$/,
  /^(?:how|why)\s+(?:do|does|did|is|are|can|do you)\s+(.+)$/,
  /^(?:qu[eé]|qui[eé]n(?:es)?|cu[aá]l(?:es)?)\s+(?:es|son|fue|era|eran)\s+(.+)$/,
  /^(?:h[aá]blame|cu[eé]ntame|expl[ií]came|ens[eé][ñn]ame|quiero aprender|quiero saber)\s+(?:de|sobre|acerca de)?\s*(.+)$/,
  /^(?:c[oó]mo|por qu[eé])\s+(?:se\s+|funciona\s+|funcionan\s+)?(.+)$/,
];
const sentence = (text: string) => clip(text.toLowerCase().replace(/\s+/g, " "));

/** The thing asked about: "what is a logical fallacy?" → "logical fallacy"; "¿qué es la fotosíntesis?" → "fotosíntesis". */
export function topicOf(text: string): string {
  let s = sentence(text);
  for (const re of FRAMES) {
    const m = re.exec(s);
    if (m) {
      s = m[1];
      break;
    }
  }
  s = s
    .replace(/^(?:i|you|we)\s+/, "")
    .replace(ARTICLE, "")
    .replace(/\s+(?:work|works|happen|happens|mean|means|form|forms|funciona|funcionan)$/, "");
  return clip(s).slice(0, 80);
}

/** Words about the learner or the people around them: a topic with these is personal, not a lookup. */
const PERSONAL = /\b(?:i|im|ive|me|my|mine|myself|you|your|yours|we|our|mi|mis|tu|tus|yo|nosotros|nuestr[ao]s?)\b/;

/**
 * What to look up for a sentence, or null when it isn't a topic: only a question about something ("what
 * is a fallacy", "¿qué es la fotosíntesis?") or a few words naming it ("the water cycle") is looked up.
 * Chatter ("I like my dog"), requests for help and anything about the learner never leave the device as
 * a search.
 */
export function lookupTopic(text: string): string | null {
  const s = sentence(text);
  const topic = topicOf(text);
  const words = tokens(topic);
  if (!words.length || topic.length < 2 || PERSONAL.test(plain(topic).replace(/'/g, ""))) return null;
  if (!FRAMES.some((re) => re.test(s)) && (s.split(" ").length > 4 || words.length > 3)) return null;
  return topic;
}

/** True when a source's answer is about what was asked: its title shares a word with the topic. */
const isAbout = (title: string, topic: string) => {
  const asked = new Set(tokens(topic));
  return tokens(title).some((w) => asked.has(w));
};

const KIND_WORDS: [RegExp, EventKind][] = [
  [/\b(tests?|exams?|ex[aá]men(?:es)?|final)\b/i, "test"],
  [/\b(quiz(?:zes)?|pruebas?)\b/i, "quiz"],
  [/\b(homework|worksheet|tareas?)\b/i, "homework"],
  [/\b(projects?|proyectos?)\b/i, "project"],
];

const WEEKDAYS = [
  ["sunday", "domingo"],
  ["monday", "lunes"],
  ["tuesday", "martes"],
  ["wednesday", "miercoles"],
  ["thursday", "jueves"],
  ["friday", "viernes"],
  ["saturday", "sabado"],
];
const plain = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

// Skill titles in both languages, for a learner who taps (or types) a skill's own name.
let titles: Map<string, string> | null = null;
/** The skill whose title is exactly this text, in either language, ignoring case, accents and end marks. */
export function skillTitled(text: string): string | null {
  titles ??= new Map(SKILLS.flatMap((s) => [[plain(clip(s.title.en)), s.id] as const, [plain(clip(s.title.es)), s.id] as const]));
  return titles.get(plain(clip(text))) ?? null;
}

/** A day the learner named: an explicit date, "tomorrow"/"mañana", "today"/"hoy" or a weekday (the next one). */
export function dateIn(text: string, today: string): string | null {
  const found = readSchoolText(text, today).found[0];
  if (found) return found.date;
  const s = plain(text);
  if (/\btoday\b|\bhoy\b/.test(s)) return today;
  if (/\btomorrow\b/.test(s) || (/\bmanana\b/.test(s) && !/\b(la|por la|esta) manana\b/.test(s))) return addDays(today, 1);
  const dow = fromLocalDate(today).getDay();
  for (const [i, names] of WEEKDAYS.entries()) {
    if (names.some((n) => new RegExp(`\\b${n}s?\\b`).test(s))) return addDays(today, ((i - dow + 7) % 7) || 7);
  }
  return null;
}

/** The kind of school item named in a sentence, if any. */
export const kindIn = (text: string): EventKind | null => KIND_WORDS.find(([re]) => re.test(text))?.[1] ?? null;

/** The topic of a calendar ask: "I have a fractions test on Friday" → "fractions". */
export function aboutIn(text: string): string {
  const SMALL = /^(?:i|i've|ive|got|have|has|we|we've|there|is|there's|a|an|the|my|our|on|for|this|next|coming|due|about|of|in|tengo|tenemos|hay|un|una|el|la|mi|mis|de|del|para|este|esta|pr[oó]ximo|sobre|en)$/i;
  let s = text.toLowerCase();
  for (const [re] of KIND_WORDS) s = s.replace(new RegExp(re.source, "gi"), " ");
  s = s
    .replace(/\b(today|tomorrow|hoy|ma[ñn]ana)\b/g, " ")
    .replace(/\b(sun|mon|tues?|wed(nes)?|thu(rs)?|fri|sat(ur)?)(day)?s?\b/g, " ")
    .replace(/\b(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bados?|domingos?)\b/g, " ")
    .replace(/\b\d{1,4}([/-]\d{1,2}){1,2}\b/g, " ");
  const words = s.split(/[\s,.!?¿¡:;]+/).filter(Boolean);
  while (words.length && SMALL.test(words[0])) words.shift();
  while (words.length && SMALL.test(words.at(-1)!)) words.pop();
  return words.join(" ").slice(0, 60);
}

/**
 * The skill a typed problem belongs to, from its shape: "3/4 + 1/6" → unlike denominators, "7 × 8" →
 * multiplication facts, "2x + 3 = 11" → two-step equations. Never works out the answer.
 */
export function problemSkill(text: string): string | null {
  // One spelling per operator: "7 x 8" and "7*8" are ×; "12 / 3" (spaced) is ÷, "3/4" stays a fraction.
  const s = text
    .toLowerCase()
    .replace(/[−–]/g, "-")
    .replace(/(\d)\s*[x*·]\s*(?=\d)/g, "$1×")
    .replace(/(\d)\s+\/\s+(?=\d)/g, "$1÷");
  const pick = (id: string) => (getSkill(id) ? id : null);
  // Equations with one letter for the unknown.
  const VAR = /(^|[^a-z])[a-z]([^a-z]|$)/;
  const bare = (x: string) => x.replace(/\b(what|whats|is|solve|for|find|if|the|a|an|and|i|got|then|resuelve|halla|encuentra|es|y|el|la)\b/g, " ");
  if (s.includes("=") && VAR.test(bare(s))) {
    const sides = s.split("=").map(bare);
    if (sides.filter((x) => VAR.test(x)).length > 1) return pick("m.eq.multistep");
    const side = sides.find((x) => VAR.test(x)) ?? "";
    const coefficient = /\d\s*[a-z](?![a-z])|(^|[^a-z])[a-z]\s*\/\s*\d/.test(side);
    const constant = /(^|[^a-z])[a-z]\s*[+-]\s*\d|\d\s*[+-]\s*\d*\s*[a-z](?![a-z])/.test(side);
    return pick(coefficient && constant ? "m.eq.twostep" : "m.eq.onestep");
  }
  if (/\d+(?:\.\d+)?\s*%\s*(?:of|de)\s*\d/.test(s)) return pick("m.percent");
  const fracs = /(\d+)\/(\d+)\s*([+\-×÷])\s*(\d+)\/(\d+)/.exec(s);
  if (fracs) {
    const op = fracs[3];
    if (op === "+" || op === "-") return pick(fracs[2] === fracs[5] ? "m.frac.addlike" : "m.frac.addunlike");
    return pick(op === "×" ? "m.frac.mult" : "m.frac.div");
  }
  if (/(simplify|simplifica|reduce)\s+\d+\/\d+/.test(s)) return pick("m.frac.equiv");
  if (/\d+\/\d+\s+(of|de)\s+\d/.test(s)) return pick("m.frac.mult");
  if (/\b(square root|ra[ií]z cuadrada)\b|√/.test(s)) return pick("m.sqrt");
  if (/\d\s*\^\s*\d|\d\s+(squared|cubed|al cuadrado|al cubo)\b/.test(s)) return pick("m.exp.whole");
  const math = s.replace(/[^0-9+\-×÷/.() ]/g, " ").replace(/\s+/g, " ").trim();
  const binary = [...math.matchAll(/[\d)]\s*[+\-×÷](?=\s*[\d(-])/g)].length;
  if (!binary) return /\b\d+\/\d+\b/.test(math) ? pick("m.frac.unit") : null;
  if (/\d\/\d/.test(math)) return pick(/[×÷]/.test(math) ? "m.frac.mult" : "m.frac.addunlike");
  if (/(^|[+\-×÷(]\s*|\s)-\d/.test(math)) return pick(/[×÷]/.test(math) ? "m.int.multdiv" : "m.int.addsub");
  if (binary > 1) return pick("m.order.ops");
  const m = /(\d+(?:\.\d+)?)\s*([+\-×÷])\s*(\d+(?:\.\d+)?)/.exec(math);
  if (!m) return null;
  const [a, op, b] = [Number(m[1]), m[2], Number(m[3])];
  if (m[1].includes(".") || m[3].includes(".")) return pick(op === "×" || op === "÷" ? "m.dec.mult" : "m.dec.addsub");
  if (op === "+") return pick(a + b <= 5 ? "m.add.5" : a + b <= 10 ? "m.add.10" : a + b <= 20 ? "m.add.20" : a < 100 && b < 100 ? "m.add.2digit" : "m.addsub.1000");
  if (op === "-") return pick(a <= 5 ? "m.sub.5" : a <= 10 ? "m.sub.10" : a <= 20 ? "m.sub.20" : a < 100 ? "m.sub.2digit" : "m.addsub.1000");
  if (op === "×") return pick(a <= 10 && b <= 10 ? ([0, 1, 2, 5, 10].includes(Math.min(a, b)) ? "m.mult.easy" : "m.mult.facts") : "m.mult.multi");
  return pick(b <= 10 && a <= 100 ? "m.div.facts" : "m.div.long");
}

/** A day named in words or digits: today, tomorrow, a weekday, or a date like 10/21. */
const DATE_WORD = /\b(today|tomorrow|tonight|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|hoy|ma[ñn]ana|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|\d{1,2}\/\d{1,2}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}|\d{1,2} de [a-z]+)\b/i;

/** Asking for help, or for the answer, in so many words (accents already removed). */
const HELP =
  /^(?:help(?: me)?(?: please)?|please help(?: me)?|ayuda(?:me)?|necesito ayuda|i need help|i'?m stuck|im stuck|estoy atorad[oa]|what do i do|what should i do|what now|que hago|i don'?t know|idk|no se)$/;
const ANSWER = /\b(?:tell me|give me|just|what'?s|what is|dime|dame|cual es)\b.*\b(?:the answers?|la respuesta|las respuestas)\b/;

/** What the learner is asking for. With a problem on screen, the words mean help with that problem. */
export function askOf(text: string, hasProblem: boolean): Ask {
  const s = text.toLowerCase().trim();
  const p = plain(s);
  if (/^(hi|hello|hey|hola|buenas|buenos dias|good (morning|afternoon|evening))\b[\s!.,]*$/.test(p)) return { kind: "greet" };
  if (/^(thanks|thank you|thx|gracias|muchas gracias)\b/.test(p)) return { kind: "thanks" };
  if (/^(?:what does|que significa|que quiere decir)(?:\s+mean)?$/.test(clip(p).replace(/\s+/g, " "))) return { kind: "which" };
  const titled = hasProblem ? null : skillTitled(text);
  if (titled) return { kind: "skill", skillId: titled };
  const define =
    /what does\s+["“']?(.+?)["”']?\s+mean\b/.exec(s) ??
    /(?:meaning of|definition of|define)\s+["“']?(.+?)["”']?[?.!]*$/.exec(s) ??
    /(?:qu[eé] significa|qu[eé] quiere decir|significado de|definici[oó]n de|define)\s+(?:la palabra\s+)?["“']?(.+?)["”']?[?.!]*$/.exec(s);
  if (define && clip(define[1]).length > 1) return { kind: "define", word: clip(define[1]).replace(ARTICLE, "").slice(0, 40) };
  const book = /\b(?:books?|novels?|stor(?:y|ies)|libros?|cuentos?)\s+(?:about|on|for|sobre|de|acerca de)\s+(.+)$/.exec(s);
  if (book && clip(book[1]).length > 1) return { kind: "book", topic: clip(book[1]).replace(ARTICLE, "").slice(0, 60) };
  if (/\b(poem|poems|poetry|poema|poemas|poes[ií]a)\b/.test(s)) {
    const by = /\b(?:by|de)\s+([a-záéíóúñ.' -]{3,40})$/i.exec(clip(s));
    return { kind: "poem", author: by ? clip(by[1]) : undefined };
  }
  if (kindIn(s) && (DATE_WORD.test(s) || /\b(i have|i've got|we have|coming up|tengo|tenemos|hay)\b/.test(s))) return { kind: "calendar" };
  if (hasProblem) {
    if (/hint|pista|help|ayuda|stuck|no s[eé]|don.?t know|no entiendo nada/.test(s)) return { kind: "hint" };
    if (/similar|example|another one|like this|parecid|ejemplo|otro/.test(s)) return { kind: "similar" };
    if (/different way|another way|other way|again|de otra (manera|forma)|otra vez|don.?t (get|understand)|no entiendo/.test(s)) return { kind: "different" };
    if (/answer|tell me|just|respuesta|dime/.test(s)) return { kind: "answer" };
    if (/first step|start|why|how come|explain|primer paso|empiezo|por qu[eé]|expl[ií]ca/.test(s)) return { kind: "step" };
    return { kind: "other" };
  }
  if (/\b(hint|pista)\b/.test(s) || HELP.test(clip(p).replace(/\s+/g, " ")) || ANSWER.test(p)) return { kind: "hint" };
  if (/\b(similar|example|ejemplo|parecido|another one|otro)\b/.test(s)) return { kind: "similar" };
  if (/different way|another way|other way|explain (it )?again|de otra (manera|forma)|otra vez|don.?t (get|understand)|no entiendo/.test(s)) return { kind: "different" };
  if (/where do i start|how do i start|first step|por d[oó]nde empiezo|primer paso/.test(s)) return { kind: "step" };
  if (/^(is it|i got|my answer is|the answer is|es|me dio|mi respuesta es)\s+-?\d/.test(s)) return { kind: "check" };
  const skillId = problemSkill(s);
  if (skillId) return { kind: "problem", skillId };
  return { kind: "topic", topic: lookupTopic(text) ?? undefined };
}

/* ------------------------------------------------------------------ knowledge */

/** The key points of the ready-made lesson that best covers a topic, or null when none does. */
type LessonCard = Extract<BoardCard, { type: "lesson" }>;
const slideText = (sc: Extract<Scene, { kind: "slide" }>) => `${sc.title} ${sc.blocks.map((b) => (b.type === "text" ? b.text : b.type === "points" ? b.items.join(" ") : "")).join(" ")}`;

// In how many courses each word appears (a translation counts as the same course): a word across many
// courses ("number") can't pick one on its own; a word one course is built on ("fallacy") can.
let spread: Map<string, number> | null = null;
function coursesWith(word: string) {
  if (!spread) {
    const byTopic = new Map<string, Set<string>>();
    for (const entry of CATALOGUE) {
      const topic = entry.id.replace(/-es$/, "");
      const all = byTopic.get(topic) ?? new Set<string>();
      for (const lesson of entry.lessons)
        for (const w of joinCompounds(tokens(`${entry.title} ${lesson.title} ${lesson.summary} ${lesson.scenes.flatMap((sc) => (sc.kind === "slide" ? [slideText(sc)] : [])).join(" ")}`))) all.add(w);
      byTopic.set(topic, all);
    }
    spread = new Map();
    for (const all of byTopic.values()) for (const w of all) spread.set(w, (spread.get(w) ?? 0) + 1);
  }
  return spread.get(word) ?? 0;
}

export function lessonFor(topic: string, grade: Grade, locale: Locale): LessonCard | null {
  // "cell phone" is not about cells: an everyday compound is one word, on both sides, as in matchSkills.
  const words = [...new Set(joinCompounds(tokens(topic)).filter((w) => w.length >= 4))];
  if (!words.length) return null;
  const matched = (text: string) => {
    const have = new Set(joinCompounds(tokens(text)));
    return words.filter((w) => have.has(w));
  };
  let best: { card: LessonCard; score: number } | null = null;
  for (const entry of catalogueFor(grade, locale)) {
    for (const lesson of entry.lessons) {
      const head = matched(`${entry.title} ${lesson.title} ${lesson.summary}`);
      const slides = lesson.scenes.flatMap((sc) => (sc.kind === "slide" ? [sc] : []));
      if (!slides.length) continue;
      const scored = slides.map((sc) => ({ sc, hit: matched(slideText(sc)) }));
      const top = scored.reduce((a, b) => (b.hit.length > a.hit.length ? b : a));
      const covered = new Set([...head, ...top.hit]);
      // Every word found, or most of them including one that is specific to a few courses.
      const enough = covered.size === words.length || (covered.size * 2 >= words.length && [...covered].some((w) => coursesWith(w) <= 3));
      const score = head.length * 2 + top.hit.length;
      if (!enough || (best && score <= best.score)) continue;
      const scene = top.hit.length ? top.sc : slides[0];
      const points = scene.blocks.find((b) => b.type === "points");
      const texts = scene.blocks.flatMap((b) => (b.type === "text" ? [b.text] : []));
      best = {
        score,
        card: {
          type: "lesson",
          catalogueId: entry.id,
          courseTitle: entry.title,
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          lead: points ? texts[0]?.slice(0, 240) : undefined,
          points: (points?.type === "points" ? points.items : texts).slice(0, 4),
          // A course only written in the other language says so, and is read in that language's voice.
          lang: entry.locale,
        },
      };
    }
  }
  return best?.card ?? null;
}

const safe = async <T>(p: () => Promise<T>, fallback: T): Promise<T> => {
  try {
    return await p();
  } catch {
    return fallback;
  }
};

/**
 * Dictionary senses for exactly this word or phrase (a dictionary may answer with one spelled like it),
 * leaving out any sense the safety screen would turn away.
 */
const sensesOf = async (fetchers: DemoFetchers, word: string) => (await safe(() => fetchers.define(word), [])).filter((d) => sameWord(d.word, word) && suitable(d.text));

/** Wikipedia's summary of a topic, only when it is about that topic and fit to show a child. */
const wikiOn = async (fetchers: DemoFetchers, topic: string, lang: Locale) => {
  const w = await safe(() => fetchers.wiki(topic, lang), null);
  return w && isAbout(w.title, topic) && suitable(`${w.title} ${w.extract}`) ? w : null;
};

const factCard = (w: WikiSummary): BoardCard => ({ type: "fact", title: w.title, extract: w.extract, url: w.url, lang: w.lang });
const definitionCard = (word: string, defs: Definition[]): BoardCard => ({
  type: "definition",
  word: defs[0]?.word ?? word,
  senses: defs.slice(0, 3).map((d) => ({ partOfSpeech: d.partOfSpeech, text: d.text })),
  url: wiktionaryUrl(defs[0]?.word ?? word),
});
const practiceCard = (skillId: string): BoardCard => ({ type: "practice", skillId });
/** One like it, worked out: never the problem on screen, nor one with the numbers of a problem they typed. */
const workedCard = (skillId: string, ctx: DemoContext, state: DemoState, level = 1): BoardCard[] => {
  const item = similarItem(skillId, level, ctx.locale, ctx.seed(), { item: ctx.item, typed: state.typed });
  return item ? [{ type: "worked", item }] : [];
};
const sourcesCard = (ctx: DemoContext, topic: string, skillId?: string): BoardCard[] => {
  const list = resourcesFor({ skillId, topic, grade: skillId ? undefined : ctx.grade, locale: ctx.locale }).slice(0, 3);
  return list.length ? [{ type: "resources", list: list.map((r) => ({ title: r.title, source: r.source, url: linkOf(r, ctx.locale) })) }] : [];
};

/* ------------------------------------------------------------------ turns */

export function demoOpening(ctx: DemoContext): DemoTurn {
  const l = ctx.locale;
  const intro = t(l, young(ctx.grade) ? "tut.demo.introYoung" : "tut.demo.intro");
  const state: DemoState = { hintsGiven: 0, tries: 0, shown: [] };
  if (ctx.item) {
    // The hint ladder continues from the hints already open on the pad.
    const seen = Math.min(Math.max(0, ctx.hintsSeen ?? 0), ctx.item.hints.length);
    const beside = { ...state, hintsGiven: seen, skillId: ctx.item.skillId };
    // K–2: the next vetted hint, on its own line, so it is saved as help before it shows (live-tutor spec §2.5).
    if (young(ctx.grade) && seen < ctx.item.hints.length) return { text: intro, cards: [], state: { ...beside, hintsGiven: seen + 1 }, help: ctx.item.hints[seen] };
    // Grades 3–9: a question first. Opening the tutor is still help on the problem (TutorDrawer).
    return { text: `${intro}\n${t(l, "tutor.open.problem")}`, cards: [], state: beside };
  }
  if (ctx.homework) return { text: `${intro}\n${t(l, "tutor.open.homework", { title: ctx.homework.title })}`, cards: [], state };
  if (ctx.lesson) return { text: `${intro}\n${t(l, "tutor.open.lesson")}`, cards: [], state: { ...state, topic: ctx.lesson.title } };
  return { text: `${intro}\n${openTalk(ctx.locale, ctx.grade, ctx.choices)}`, cards: [], state };
}

/**
 * How an open conversation starts. A young learner who may not read hears the choices named, in the
 * order the chips show them: "What do you want to learn about? Count to 10, Letter sounds, or a poem?"
 */
export function openTalk(locale: Locale, grade: Grade, choices: string[] = []): string {
  if (!young(grade)) return t(locale, "tutor.open.talk");
  if (!choices.length) return t(locale, "tut.open.young");
  // A chip that is itself a question ("Which is more?") is named without its marks inside the sentence.
  const named = choices.map((c) => c.replace(/^[¿¡]+|[?!.¿¡]+$/g, "").trim());
  const list = new Intl.ListFormat(locale === "es" ? "es-US" : "en-US", { type: "disjunction" }).format([...named, t(locale, "tut.open.poemChoice")]);
  return t(locale, "tut.open.youngChoices", { choices: list });
}

/** A photo in demo mode: nothing is read or sent anywhere; the learner is asked to type the problem (a young one, to ask a grown-up to). */
export const demoPhoto = (ctx: DemoContext, state: DemoState): DemoTurn => ({ text: t(ctx.locale, young(ctx.grade) ? "tut.photo.demoYoung" : "tut.photo.demo"), cards: [], state });

/**
 * The sources, guarded: a query about the learner ("my dog") or naming someone in the family is never
 * sent (plan 3.1: no learner identifiers forwarded); it is answered as found nothing.
 */
function guarded(fetchers: DemoFetchers, names: string[] = []): DemoFetchers {
  const family = new Set(names.flatMap(tokens));
  const ok = (q: string) => !PERSONAL.test(plain(q).replace(/'/g, "")) && !tokens(q).some((w) => family.has(w));
  return {
    wiki: (q, lang) => (ok(q) ? fetchers.wiki(q, lang) : Promise.resolve(null)),
    define: (q) => (ok(q) ? fetchers.define(q) : Promise.resolve([])),
    books: (q) => (ok(q) ? fetchers.books(q) : Promise.resolve([])),
    poems: (q) => (ok(q) ? fetchers.poems(q) : Promise.resolve([])),
    shortPoems: fetchers.shortPoems,
  };
}

/** One demo reply. Knowledge comes through `sources` (the /api/know routes in the browser, fakes in tests). */
export async function demoAnswer(text: string, ctx: DemoContext, state: DemoState, sources: DemoFetchers): Promise<DemoTurn> {
  const fetchers = guarded(sources, ctx.names);
  const l = ctx.locale;
  const say = (key: Parameters<typeof t>[1], vars?: Record<string, string | number>) => t(l, key, vars);
  const item = ctx.item;
  const ask = askOf(text, !!item);
  const shown = (key: string) => state.shown.includes(key);
  const next = (patch: Partial<DemoState>, add: string[] = []): DemoState => ({ ...state, ...patch, shown: [...state.shown, ...add] });

  switch (ask.kind) {
    case "greet":
      return { text: say("tut.demo.greet"), cards: [], state };
    case "thanks":
      return { text: say("tut.demo.thanks"), cards: [], state };
    case "which":
      return { text: say("tut.demo.whichWord"), cards: [], state };
    case "define": {
      const defs = l === "en" ? await sensesOf(fetchers, ask.word) : [];
      if (defs.length) return { text: say("tut.demo.define", { word: ask.word }), cards: [definitionCard(ask.word, defs)], state: next({}, ["definition"]) };
      const wiki = await wikiOn(fetchers, ask.word, l);
      if (wiki) return { text: say("tut.demo.defineWiki", { word: ask.word }), cards: [factCard(wiki)], state };
      return { text: say("tut.demo.noDefinition", { word: ask.word }), cards: [], state };
    }
    case "book": {
      const books = (await safe(() => fetchers.books(ask.topic), [])).filter((b) => suitable(b.title));
      if (!books.length) return { text: say("tut.demo.noBooks", { topic: ask.topic }), cards: [], state };
      return {
        text: say("tut.demo.books", { topic: ask.topic }),
        cards: [{ type: "books", topic: ask.topic, list: books.slice(0, 4).map((b) => ({ title: b.title, author: b.author, year: b.year, url: b.url, source: b.source, kind: b.kind })) }],
        state,
      };
    }
    case "poem": {
      const fit = (p: Poem) => suitable(`${p.title} ${p.lines.join(" ")}`);
      const poems = ask.author ? (await safe(() => fetchers.poems(ask.author!), [])).filter(fit) : [];
      const poem = poems[0] ?? (await safe(() => fetchers.shortPoems(), [])).find(fit);
      if (!poem) return { text: say("tut.demo.noPoem"), cards: [], state };
      return {
        text: say(l === "es" ? "tut.demo.poemEnglish" : "tut.demo.poem", { title: poem.title, author: poem.author }),
        cards: [{ type: "poem", title: poem.title, author: poem.author, lines: poem.lines.slice(0, 40), url: poem.url }],
        state,
      };
    }
    case "calendar": {
      const kind = kindIn(text) ?? "test";
      const about = aboutIn(text);
      const skills = matchSkills(about || text, undefined, 2, ctx.grade);
      const date = dateIn(text, ctx.today) ?? undefined;
      const kindWord = say(`event.${kind}`);
      const title = about ? say("tut.cal.title", { kind: l === "en" ? kindWord.toLowerCase() : kindWord, about }) : kindWord;
      const card: BoardCard = { type: "calendar", key: `${kind}:${about}:${date ?? ""}`, title: title.charAt(0).toUpperCase() + title.slice(1), kind, date, skillIds: skills };
      return {
        text: say(date ? "tut.demo.calendar" : "tut.demo.calendarNoDate"),
        cards: [card, ...skills.slice(0, 1).map(practiceCard)],
        state: skills[0] ? next({ skillId: skills[0], topic: about }) : state,
      };
    }
    case "check":
      return { text: say("tut.demo.cantCheck"), cards: state.skillId ? [practiceCard(state.skillId)] : [], state };
    case "problem": {
      // Their own problem is remembered for the whole conversation: no later example may have its numbers.
      const skill = getSkill(ask.skillId)!;
      const mine = { ...state, typed: [...(state.typed ?? []), text.slice(0, 200)].slice(-5) };
      return {
        text: say("tut.demo.problem", { skill: skill.title[l] }),
        cards: [...workedCard(ask.skillId, ctx, mine), practiceCard(ask.skillId)],
        state: { ...mine, skillId: ask.skillId, topic: skill.title[l], shown: [...state.shown, "similar"] },
      };
    }
    case "skill": {
      // A skill on the map, by name: our lesson's key points, one worked out, and the practice. Its title
      // is ours, not a topic, so it is not looked up on Wikipedia.
      const skill = getSkill(ask.skillId)!;
      const lesson = lessonFor(skill.title[l], ctx.grade, l);
      const shown: BoardCard[] = [...(lesson ? [lesson] : []), ...workedCard(ask.skillId, ctx, state)];
      const cards = young(ctx.grade) ? [practiceCard(ask.skillId), ...shown] : [...shown, practiceCard(ask.skillId)];
      return {
        text: say(young(ctx.grade) ? "tut.demo.skillYoung" : "tut.demo.skill", { skill: skill.title[l] }),
        cards: [...cards, ...sourcesCard(ctx, skill.title[l], ask.skillId)],
        state: next({ skillId: ask.skillId, topic: skill.title[l] }, ["similar", ...(lesson ? ["lesson"] : [])]),
      };
    }
  }

  // With a problem on screen: its own vetted hints and steps, and problems like it worked out.
  if (item) {
    // The problem's worked steps wait for a real try: on many problems step 1 already is the answer
    // ("5/6 + 4/6 = 9/6", "8 × 4 = 32"). Before a try the next rung is the next vetted hint, then a
    // nudge to try; after one, the first worked step, then the problem's own "Show me how".
    const firstStep = (): DemoTurn => {
      if (state.tries < 1) {
        if (state.hintsGiven < item.hints.length) return { text: item.hints[state.hintsGiven], cards: [], state: next({ hintsGiven: state.hintsGiven + 1 }) };
        return { text: say("tutor.demo.tryFirst"), cards: [], state };
      }
      if (!shown("step")) return { text: item.steps[0], cards: [], state: next({}, ["step"]) };
      return { text: say("tutor.demo.showHow"), cards: [], state };
    };
    switch (ask.kind) {
      case "hint": {
        if (state.hintsGiven >= item.hints.length) return { text: say("tutor.demo.noMoreHints"), cards: [], state };
        return { text: item.hints[state.hintsGiven], cards: [], state: next({ hintsGiven: state.hintsGiven + 1 }) };
      }
      case "similar": {
        const worked = workedCard(item.skillId, ctx, state, item.level);
        if (!worked.length) return { text: say("tut.demo.noSimilar"), cards: [], state };
        return { text: say("tutor.demo.similar"), cards: worked, state: next({}, ["similar"]) };
      }
      case "answer":
        return { text: state.tries < 1 ? say("tutor.demo.tryFirst") : say("tutor.demo.showHow"), cards: [], state };
      case "step":
        return firstStep();
      case "different": {
        // The problem's own picture is already on screen beside it, so a different way starts with one
        // like it worked out, then the next rung of help.
        const worked = shown("similar") ? [] : workedCard(item.skillId, ctx, state, item.level);
        if (worked.length) return { text: say("tutor.demo.similar"), cards: worked, state: next({}, ["similar"]) };
        return firstStep();
      }
      default:
        return { text: say("tut.demo.problemOther"), cards: [], state };
    }
  }

  // An open conversation that has turned to a skill or topic.
  switch (ask.kind) {
    case "similar":
      if (state.skillId) {
        const worked = workedCard(state.skillId, ctx, state);
        if (worked.length) return { text: say("tutor.demo.similar"), cards: worked, state: next({}, ["similar"]) };
        return { text: say("tut.demo.noSimilar"), cards: [practiceCard(state.skillId)], state };
      }
      return { text: say("tut.demo.hintTalk"), cards: [], state };
    case "hint":
      // After a worked example, the next nudge is its first step, done the same way on their own problem.
      if (state.skillId && shown("similar")) return { text: say("tut.demo.hintWorked"), cards: [], state };
      return { text: say("tut.demo.hintTalk"), cards: state.skillId ? [practiceCard(state.skillId)] : [], state };
    case "step": {
      const skills = ctx.homework ? matchSkills(`${ctx.homework.title} ${ctx.homework.notes ?? ""}`, undefined, 1, ctx.grade) : [];
      const skillId = state.skillId ?? skills[0];
      return {
        text: say("tut.demo.homeworkStart"),
        cards: skillId ? [...workedCard(skillId, ctx, state), practiceCard(skillId)] : [],
        state: skillId ? next({ skillId }, ["similar"]) : state,
      };
    }
    case "different": {
      const topic = state.topic ?? ctx.homework?.title ?? ctx.lesson?.title ?? "";
      const lesson = topic ? lessonFor(topic, ctx.grade, l) : null;
      if (lesson && !shown("lesson")) return { text: say("tut.demo.lesson", { lesson: lesson.lessonTitle }), cards: [lesson], state: next({}, ["lesson"]) };
      if (topic && l === "en" && !shown("definition") && topic.split(" ").length <= 2) {
        const defs = await sensesOf(fetchers, topic);
        if (defs.length) return { text: say("tut.demo.define", { word: topic }), cards: [definitionCard(topic, defs)], state: next({}, ["definition"]) };
      }
      const worked = state.skillId && !shown("similar") ? workedCard(state.skillId, ctx, state) : [];
      if (worked.length) return { text: say("tutor.demo.similar"), cards: worked, state: next({}, ["similar"]) };
      return { text: say("tut.demo.noMore"), cards: state.skillId ? [practiceCard(state.skillId)] : [], state };
    }
  }

  // A topic: the cited extract, the definition, our lesson's key points, practice that fits, sources.
  // Only a real topic is looked up (lookupTopic); any other sentence still finds the practice that fits,
  // but nothing of it leaves the device.
  const topic = ask.kind === "topic" ? ask.topic : undefined;
  // "How does it work?": the closing verb belongs to the question, not to "Titles of works".
  const asked = sentence(text).replace(/^((?:how|why)\b.*?)\s+(?:work|works|happen|happens)$/, "$1");
  const skills = matchSkills(ctx.homework ? `${asked} ${ctx.homework.title}` : asked, undefined, 2, ctx.grade);
  const skillTitle = skills[0] ? getSkill(skills[0])!.title[l] : undefined;
  // A word or a two-word term ("photosynthesis", "logical fallacy") also gets its dictionary sense.
  const term = !!topic && topic.split(" ").length <= 2;
  const [wiki, defs] = await Promise.all([
    topic ? wikiOn(fetchers, topic, l) : Promise.resolve(null),
    topic && l === "en" && term ? sensesOf(fetchers, topic) : Promise.resolve([] as Definition[]),
  ]);
  const lesson = topic || skillTitle ? lessonFor(topic ?? skillTitle!, ctx.grade, l) : null;
  const knowledge: BoardCard[] = [...(wiki ? [factCard(wiki)] : []), ...(topic && defs.length ? [definitionCard(topic, defs)] : []), ...(lesson ? [lesson] : [])];
  const practice = skills.map(practiceCard);
  const cards = young(ctx.grade) ? [...practice, ...knowledge] : [...knowledge, ...practice];
  cards.push(...sourcesCard(ctx, topic ?? skillTitle ?? "", skills[0]));
  const lead = wiki
    ? say("tut.demo.topic", { title: wiki.title })
    : topic && (knowledge.length || practice.length)
      ? say("tut.demo.topicNoWiki", { topic })
      : topic
        ? say("tut.demo.nothing", { topic })
        : skillTitle
          ? say("tut.demo.soundsLike", { skill: skillTitle })
          : say("tut.demo.unsure");
  return {
    text: practice.length ? `${lead} ${say("tut.demo.tryPractice")}` : lead,
    cards: topic || skills.length ? cards : [],
    state: next({ skillId: skills[0] ?? state.skillId, topic: topic ?? skillTitle ?? state.topic }, [...(lesson ? ["lesson"] : []), ...(defs.length ? ["definition"] : [])]),
  };
}
