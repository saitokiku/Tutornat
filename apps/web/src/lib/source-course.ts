import { catalogueFor, type CatalogueEntry } from "@/catalogue";
import { t, type Key } from "@/i18n";
import type { Book, Definition, WikiSummary } from "@/knowledge";
import { topicsIn } from "@/knowledge/topics";
import { matchSkills } from "@/planner/skillmatch";
import { answerText, check } from "@/practice/answer";
import { REVIEWED } from "@/practice/reviewed";
import { getSkill, makeItem } from "@/practice/skills";
import type { ItemBody, MathPart } from "@/practice/types";
import { linkOf, resourcesFor } from "@/resources";
import { screen } from "./ai/safety";
import { titleFromGoal } from "./courses";
import { guessSubject } from "./generate";
import { newId, type StoreState } from "./store";
import type { Course, CourseLength, Grade, Lesson, Locale, QuizQuestion, Scene, Subject } from "./types";

// Source-built courses: a course for any topic, made without AI from things we can name and link.
// An overview quoted from Wikipedia, key words with dictionary definitions, the closest lesson a person
// wrote for our catalogue, questions from the skill map (checked by code), and children's books and
// sites to find out more. Same inputs, same course. Sourced text is shown as written and credited,
// never as ours, and anything that fails the safety screen is left out.

/** Where the knowledge comes from. Injected so the builder runs in tests without a network. */
export type Fetchers = {
  /**
   * The best Wikipedia article for a topic, or null when there is none. "simple" is Simple English
   * Wikipedia, asked first for K–2; a source that doesn't have it answers from English Wikipedia.
   */
  wiki: (topic: string, lang: Wiki) => Promise<WikiSummary | null>;
  /** Words that mean something like the topic (Datamuse). */
  related: (word: string) => Promise<string[]>;
  /** Dictionary definitions (Wiktionary through Datamuse); empty when the word has none. */
  define: (word: string) => Promise<Definition[]>;
  /** Books a family can borrow (Open Library); the query may use Open Library's field filters. */
  books: (q: string) => Promise<Book[]>;
};

/** Which Wikipedia to read: the course's language, or Simple English (short words, short sentences) for K–2. */
export type Wiki = Locale | "simple";

/** A source could not be asked: the device is offline, or the source did not answer. */
export type Failure = "offline" | "unavailable";
export class SourceError extends Error {
  constructor(public code: Failure) {
    super(code);
  }
}
const failure = (e: unknown): Failure => (e instanceof SourceError ? e.code : "unavailable");

/** What the builder found, part by part, so the screen can say it plainly (and say what it didn't find). */
export type SourceStep =
  /** `withheld`: an article was found but its text failed the safety screen, so it is not used. */
  | { part: "article"; title?: string; failed?: Failure; withheld?: boolean }
  | { part: "terms"; count: number; failed?: Failure; englishOnly?: boolean }
  /** `leftOut`: a lesson matched, but a one-lesson course has no room for a whole second lesson. */
  | { part: "lesson"; titles: string[]; leftOut?: boolean }
  /** `grade`: the closest skill is too far from the learner's grade for questions (it is still on the course page). */
  | { part: "practice"; skills: string[]; questions: number; grade?: Grade }
  | { part: "books"; count: number; failed?: Failure };

/** The `source` of each citation the builder writes; the course page groups links by it. */
export const SOURCE = { wikipedia: "Wikipedia", wiktionary: "Wiktionary", openLibrary: "Open Library" } as const;

export type BuildOptions = {
  profileId?: string;
  id?: string;
  subject?: Subject;
  length?: CourseLength;
  /** Words that must never leave the device (every name on the account), removed from every query. */
  avoid?: string[];
  signal?: AbortSignal;
  onStep?: (step: SourceStep) => void;
  /** Whether a skill's questions were reviewed by a teacher (lib/review.ts isReviewed); draft ones are labelled. */
  reviewed?: (skillId: string) => boolean;
  now?: number;
};

/** Without the store: computed skills and the committed review list count as reviewed. */
const reviewedByDefault = (skillId: string) => {
  const skill = getSkill(skillId);
  return !!skill && (skill.content === "computed" || REVIEWED.includes(skillId));
};

const gradeN = (g: Grade) => (g === "K" ? 0 : g === "adult" ? 10 : Number(g));
const isYoung = (g: Grade) => gradeN(g) <= 2;
/** A K–2 sitting is ten minutes (plan 2.10): a one-lesson course for them stops there. */
const YOUNG_SITTING = 10;

// ── Words ──────────────────────────────────────────────────────────────────────────────────────

const STOP = new Set(
  [
    "about above after again also although among another around because been before being below between both called cannot could does doing down during each either else even ever every from further have having here however into itself just known least less like made make many more most much must near never next only other others over part same should since some such than that their them then there these they thing things this those though through thus under until upon used uses using very want what when where whether which while whose will with within without would your yours often usually commonly include includes including different several various number large small great high form forms first second",
    "para pero como esta este estos estas esos esas porque cuando donde desde hasta sobre entre tiene tienen puede pueden tambien muy mas menos otro otros otra otras todo todos toda todas cada solo sino segun hacia durante mediante aunque ellos ellas nosotros quiero aprender",
  ]
    .join(" ")
    .split(" "),
);

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A rough stem so "melted", "melting" and "melts" meet, and "volcanoes" meets "volcano". */
export function stem(word: string) {
  let w = norm(word);
  if (w.length > 5 && w.endsWith("ing")) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith("ed")) w = w.slice(0, -2);
  else if (w.length > 4 && w.endsWith("es")) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) w = w.slice(0, -1);
  if (w.length > 4 && w.endsWith("e")) w = w.slice(0, -1);
  return w;
}

/** Content words of a text as stems, in order of first appearance. */
export function words(text: string): string[] {
  const out: string[] = [];
  for (const w of norm(text).match(/[a-zñ]{4,}/g) ?? []) {
    if (STOP.has(w)) continue;
    const s = stem(w);
    if (!out.includes(s)) out.push(s);
  }
  return out;
}

/** Every word of a text as stems, short ones too. */
const tokens = (text: string) => new Set((norm(text).match(/[a-zñ]+/g) ?? []).map(stem));

/** Words about school logistics: a line made of them ("Science test on Friday") says when, not what. */
const LOGISTICS = new Set(
  "test tests quiz exam homework class grade chapter unit page worksheet study review tomorrow today tonight week friday monday tuesday wednesday thursday saturday sunday prueba examen tarea clase grado capitulo unidad pagina repasar estudiar manana semana viernes lunes martes miercoles jueves sabado domingo"
    .split(" ")
    .map(stem),
);

const LEAD_IN =
  /^(i (want|would like|need) to (learn|know|understand)( more)?( about)?|teach me( about)?|tell me about|learn about|help me (with|understand)|how (do|does|to)|what (is|are)|quiero (aprender|saber)( m[aá]s)?( sobre| de)?|ens[eé][ñn]ame( sobre)?|qu[eé] (es|son)|c[oó]mo)\s+/i;

/** Removes each name (and its possessive) as a whole word; longer names first, so "Ana María" goes before "Ana". */
function withoutNames(text: string, avoid: string[]) {
  const names = [...new Set(avoid.map((n) => n.trim()).filter((n) => n.length > 1))].sort((a, b) => b.length - a.length);
  for (const name of names) text = text.replace(new RegExp(`(^|[^\\p{L}])${escapeRe(name)}(['’]s)?(?=$|[^\\p{L}])`, "giu"), "$1");
  return text;
}

/**
 * The topic a learner asked about: names taken out first, then "I want to learn about" and the like.
 * A request over several lines uses the line that says the most (not the one that says when the test is).
 */
export function topicOf(goal: string, avoid: string[] = []) {
  const lines = withoutNames(goal, avoid)
    .split(/\n+/)
    .map((l) =>
      l
        .replace(/\s+/g, " ")
        .trim()
        .replace(LEAD_IN, "")
        .replace(/^[\s,.:;!?¿¡-]+|[\s,.:;!?¿¡-]+$/g, ""),
    )
    .filter(Boolean);
  const say = (l: string) => words(l).filter((w) => !LOGISTICS.has(w)).length;
  let topic = lines.reduce<string>((best, l) => (say(l) > say(best) ? l : best), lines[0] ?? "");
  if (topic.length > 100) topic = topic.slice(0, Math.max(topic.lastIndexOf(" ", 100), 40)).replace(/[\s,.:;-]+$/, "");
  return topic ? topic[0].toUpperCase() + topic.slice(1) : "";
}

/** Every name on the account (each learner's nickname, the grown-up's name and its parts), so none of them leaves the device. */
export function namesOnAccount(s: Pick<StoreState, "profiles" | "accounts">, accountId: string): string[] {
  const names = [...s.profiles.filter((p) => p.accountId === accountId).map((p) => p.nickname), s.accounts.find((a) => a.id === accountId)?.displayName ?? ""];
  return [...new Set(names.flatMap((n) => [n, ...n.split(/\s+/)]).map((n) => n.trim()).filter((n) => n.length > 1))];
}

// ── The overview ───────────────────────────────────────────────────────────────────────────────

function sentences(extract: string): string[] {
  let text = extract.trim();
  if (!/[.!?"”)]$/.test(text)) {
    const end = Math.max(text.lastIndexOf(". "), text.lastIndexOf("? "), text.lastIndexOf("! "));
    text = end > 120 ? text.slice(0, end + 1) : `${text}…`;
  }
  return text.split(/(?<=[.!?])\s+(?=[\p{Lu}¿¡"“(])/u);
}

/** Wikipedia's opening as written, ending on a whole sentence, in short paragraphs to read (or hear) one at a time. */
export function paragraphs(extract: string): string[] {
  const all = sentences(extract);
  const out: string[] = [];
  for (let i = 0; i < all.length; i += 2) out.push(all.slice(i, i + 2).join(" "));
  return out;
}

/** The article's first sentence only: for K–2, whose sitting is short and whose listening comes first. */
export const firstSentence = (extract: string) => sentences(extract)[0] ?? "";

// ── Key words ──────────────────────────────────────────────────────────────────────────────────

export type Term = { word: string; partOfSpeech: string; text: string };

const NOT_A_MEANING = /^(plural of|simple past|past participle|present participle|third-person singular|alternative (form|spelling|letter-case form) of|obsolete|archaic|misspelling of|abbreviation of|initialism of|synonym of)/i;
/** "A native of Africa": a word for people from a place, not a key word. */
const DEMONYM = /^(a|an|the|one)\s+(native|inhabitant|resident|citizen|person|people|member)s?\s+(of|from)\b/i;
/** Real words that a dictionary has and a child's word list does not. */
const NOT_FOR_A_WORD_LIST = new Set(["ass", "jackass", "bitch", "cock", "pussy", "booby", "tit", "dick", "hooker", "screw", "bastard", "crap", "damn", "hell", "piss", "sex"]);
/** A definition longer than this is left out rather than cut off. */
const MAX_DEF = 200;

/**
 * The sense of a word to show: a noun or verb with a real meaning, short enough to read whole, fit for
 * children, and sharing the most words with the article (at least one, when there is an article).
 * `need`: words the sense must contain (the article's disambiguator, so "Mercury (planet)" never gets
 * the metal).
 */
function meaning(defs: Definition[], context: Set<string>, need: string[], fine: (s: string) => boolean): Definition | null {
  let best: { d: Definition; overlap: number } | null = null;
  for (const d of defs) {
    const text = d.text?.trim();
    if ((d.partOfSpeech !== "noun" && d.partOfSpeech !== "verb") || !text || text.length > MAX_DEF) continue;
    if (NOT_A_MEANING.test(text) || DEMONYM.test(text) || !fine(text) || NOT_FOR_A_WORD_LIST.has(d.word.toLowerCase())) continue;
    const said = words(text);
    if (need.length && !need.some((n) => said.includes(n))) continue;
    const overlap = said.filter((w) => context.has(w)).length;
    // Next to an article, a sense that shares nothing with it is another meaning ("volcano": a firework).
    if (context.size && !overlap) continue;
    if (!best || overlap > best.overlap) best = { d: { ...d, text }, overlap };
  }
  return best?.d ?? null;
}

/** True when the article writes the word only with a capital letter mid-sentence: a name (Africa, Jurassic), not a key word. */
function nameInText(word: string, extract: string) {
  const s = stem(word);
  let named = false;
  for (const m of extract.matchAll(/\p{L}+/gu)) {
    if (stem(m[0]) !== s) continue;
    if (m[0][0] === m[0][0].toLowerCase()) return false;
    const before = extract.slice(0, m.index).trimEnd();
    if (before && !/[.!?:]$/.test(before)) named = true;
  }
  return named;
}

type Defined = { m: Definition | null } | { e: unknown };

/**
 * Key words with definitions: the topic itself, then words Datamuse relates to it that the article also
 * uses (never a name, never a word that isn't for children). With no article there is nothing to check
 * related words against, so only the topic word is looked up. The dictionary is English.
 */
async function findTerms(head: string, extract: string | null, need: string[], f: Fetchers, max: number, fine: (s: string) => boolean): Promise<{ terms: Term[]; failed?: Failure }> {
  const context = new Set(extract ? words(extract) : []);
  const inText = extract ? tokens(extract) : new Set<string>();
  const lower = head.toLowerCase().trim();
  let related: string[] = [];
  let failed: Failure | undefined;
  if (extract) {
    try {
      related = await f.related(lower);
    } catch (e) {
      failed = failure(e);
      if (failed === "offline") return { terms: [], failed };
    }
  }
  // Without an article the topic is as typed ("volcanoes"): try it, then without its plural ending.
  const heads = lower.split(" ").length <= 2 ? [...new Set([lower, ...(extract ? [] : [lower.replace(/es$/, ""), lower.replace(/s$/, "")])])].filter((w) => w.length >= 3) : [];
  // A related word that is part of the topic ("tectonics" for "plate tectonics") would only repeat it.
  const seen = new Set([...heads, ...lower.split(" ")].map(stem));
  const others: string[] = [];
  for (const w of related.map((x) => x.toLowerCase().trim())) {
    if (others.length >= 6 || !/^[a-z]{3,}$/.test(w) || NOT_FOR_A_WORD_LIST.has(w) || seen.has(stem(w)) || !inText.has(stem(w)) || nameInText(w, extract!)) continue;
    seen.add(stem(w));
    others.push(w);
  }
  // async, so a fetcher that throws instead of rejecting (a bug, not a source that's down) fails the
  // whole build cleanly rather than leaving a stray rejection behind.
  const ask = async (w: string, needed: string[] = []): Promise<Defined> => f.define(w).then((d) => ({ m: meaning(d, context, needed, fine) }), (e: unknown) => ({ e }));
  const askHead = async (): Promise<Defined[]> => {
    const out: Defined[] = [];
    for (const w of heads) {
      const a = await ask(w, need);
      out.push(a);
      if ("m" in a && a.m) break;
    }
    return out;
  };
  const [headAnswers, ...rest] = await Promise.all([askHead(), ...others.map((w) => ask(w))]);
  const answers = [...headAnswers, ...rest];
  if (answers.length && answers.every((a) => "e" in a)) return { terms: [], failed: failure((answers[0] as { e: unknown }).e) };
  const terms: Term[] = [];
  for (const a of answers) {
    if (!("m" in a) || !a.m || terms.length >= max || terms.some((x) => stem(x.word) === stem(a.m!.word))) continue;
    terms.push({ word: a.m.word, partOfSpeech: a.m.partOfSpeech, text: a.m.text });
  }
  return { terms, failed: terms.length ? undefined : failed };
}

// ── The closest ready-made lessons ─────────────────────────────────────────────────────────────

function lessonText(l: Lesson): string {
  const parts: string[] = [l.summary];
  for (const s of l.scenes) {
    parts.push(s.title);
    if (s.kind === "slide") for (const b of s.blocks) parts.push(b.type === "text" ? b.text : b.type === "points" ? b.items.join(" ") : b.alt);
    if (s.kind === "quiz") for (const q of s.questions) parts.push(q.prompt, q.explain);
    if (s.kind === "interactive") parts.push(s.prompt);
    if (s.kind === "project") parts.push(s.brief, ...s.steps);
  }
  return parts.join(" ");
}

/** A catalogue lesson to borrow; `topic` when people bridged it (knowledge/topics), which has a line saying why it fits. */
export type RelatedLesson = { entry: CatalogueEntry; lesson: Lesson; topic?: string };

/**
 * Ready-made lessons (in the course's language, within three grades) that teach what was asked.
 * First the ones people bridged to the topic ("volcanoes" → melting and freezing), then the ones that
 * share words with the request, the article and its key words. A word match needs at least one of the
 * request's own words (or a key word) in the lesson's title or summary: words that only the article
 * uses are too weak alone, so "sharks" never borrows a lesson because both mention a head and fish.
 */
export function relatedLessons(query: { goal: string; title?: string; extract?: string; terms?: string[] }, subject: Subject, grade: Grade, locale: Locale, max = 1): RelatedLesson[] {
  const pool = catalogueFor(grade, locale).filter((e) => e.locale === locale && Math.abs(gradeN(e.grade) - gradeN(grade)) <= 3);
  const out: RelatedLesson[] = [];
  const add = (r: RelatedLesson) => {
    if (out.length < max && !out.some((x) => x.entry.id === r.entry.id && x.lesson.id === r.lesson.id)) out.push(r);
  };
  for (const topic of topicsIn(`${query.goal} ${query.title ?? ""}`))
    for (const ref of topic.lessons ?? []) {
      const [entryId, lessonId] = ref.split("/");
      const entry = pool.find((e) => e.id === entryId);
      const lesson = entry?.lessons.find((l) => l.id === lessonId);
      if (entry && lesson) add({ entry, lesson, topic: topic.id });
    }

  const weight = new Map<string, number>();
  const put = (text: string | undefined, w: number) => words(text ?? "").forEach((s) => weight.set(s, Math.max(weight.get(s) ?? 0, w)));
  put(query.extract, 1);
  put(query.terms?.join(" "), 2);
  put(query.title, 3);
  put(query.goal, 3);
  const scored: { entry: CatalogueEntry; lesson: Lesson; score: number }[] = [];
  for (const entry of pool) {
    for (const lesson of entry.lessons) {
      const title = new Set(words(lesson.title));
      const head = new Set(words(`${lesson.title} ${lesson.summary}`));
      const body = new Set(words(lessonText(lesson)));
      let score = 0;
      let matched = 0;
      let strong = false;
      let anchored = false;
      for (const [s, w] of weight) {
        if (title.has(s)) {
          score += w * 2;
          matched++;
          if (w >= 3) strong = true;
        } else if (body.has(s)) {
          score += w;
          matched++;
        }
        if (w >= 2 && head.has(s)) anchored = true;
      }
      if (!anchored || score < 4 || (matched < 2 && !strong)) continue;
      scored.push({ entry, lesson, score: score + (entry.subject === subject ? 1 : 0) - Math.abs(gradeN(entry.grade) - gradeN(grade)) * 0.25 });
    }
  }
  for (const r of scored.sort((a, b) => b.score - a.score)) add({ entry: r.entry, lesson: r.lesson });
  return out;
}

/** The single closest ready-made lesson, or null rather than a lesson about something else. */
export const closestLesson = (query: Parameters<typeof relatedLessons>[0], subject: Subject, grade: Grade, locale: Locale) => relatedLessons(query, subject, grade, locale, 1)[0] ?? null;

// ── Practice from the skill map ────────────────────────────────────────────────────────────────

/** A skill on the map that fits the request; `fits` when it is within two grades of the learner. */
export type PracticeMatch = { skillId: string; fits: boolean };

/**
 * Skills on the map that fit the request: the skill-map words (planner/skillmatch) and the topics people
 * bridged (knowledge/topics). The ones that fit the learner's grade come first, nearest first, a skill
 * at or below their grade before one above it. A skill far from their grade is kept, marked, so the
 * course page can still offer it without putting its questions in the lesson.
 */
export function practiceSkillsFor(topic: string, articleTitle: string | undefined, subject: Subject, grade: Grade, max = 3): PracticeMatch[] {
  const text = `${topic} ${articleTitle ?? ""}`;
  const bridged = topicsIn(text).filter((x) => subject === "other" || x.subject === subject);
  const ids = [...new Set([...matchSkills(text, subject, 3), ...bridged.flatMap((x) => x.skills)])].filter((id) => getSkill(id));
  const g = gradeN(grade);
  return ids
    .map((skillId, i) => {
      const d = gradeN(getSkill(skillId)!.grade) - g;
      return { skillId, fits: Math.abs(d) <= 2, cost: Math.abs(d) * 2 + (d > 0 ? 1 : 0), i };
    })
    .sort((a, b) => Number(b.fits) - Number(a.fits) || a.cost - b.cost || a.i - b.i)
    .slice(0, max)
    .map(({ skillId, fits }) => ({ skillId, fits }));
}

const SUP: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻", "−": "⁻" };

/** A practice prompt as one line of text: 3/4 for a stacked fraction, x² for a power, ___ for the blank. */
export function plainPrompt(parts: MathPart[]): string {
  return parts
    .map((p) => {
      if (typeof p === "string") return p;
      if ("frac" in p) return `${p.frac[0]}/${p.frac[1]}`;
      if ("sup" in p) return [...p.sup[1]].every((c) => SUP[c]) ? `${p.sup[0]}${[...p.sup[1]].map((c) => SUP[c]).join("")}` : `${p.sup[0]}^${p.sup[1]}`;
      return "___";
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * A skill-map item as a lesson quiz question, checked by index. Choice items keep their choices; typed
 * answers become choices only from their authored likely-wrong values, and only after the checker
 * agrees the right one is right and every wrong one is wrong. Items that need a picture are left out.
 */
export function questionFrom(item: ItemBody, seed: number): Omit<QuizQuestion, "id"> | null {
  if (item.visual || item.picture) return null;
  const prompt = plainPrompt(item.prompt);
  const hint = item.hints[0]?.trim();
  const explain = item.steps.join(" ").trim();
  if (!prompt || !hint || !explain) return null;
  if (item.answer.kind === "choice") {
    const choices = (item.choices ?? []).map((c) => c.label.trim());
    if (choices.length < 2 || choices.some((c) => !c) || item.choices!.some((c) => c.picture) || new Set(choices).size !== choices.length) return null;
    if (item.answer.index < 0 || item.answer.index >= choices.length) return null;
    return { prompt, choices, answer: item.answer.index, hint, explain };
  }
  if (item.answer.kind !== "number" && item.answer.kind !== "fraction" && item.answer.kind !== "text") return null;
  const right = answerText(item.answer);
  if (!check(item.answer, right).correct) return null;
  const wrong = [...new Set((item.wrong ?? []).map((w) => w.value.trim()))].filter((v) => v && v !== right && !check(item.answer, v).correct).slice(0, 3);
  if (wrong.length < 2) return null;
  const all = [right, ...wrong];
  const k = seed % all.length;
  const choices = [...all.slice(k), ...all.slice(0, k)];
  return { prompt, choices, answer: choices.indexOf(right), hint, explain };
}

/** Up to `n` different level-1 questions from a skill, the same ones every time. */
export function skillQuestions(skillId: string, locale: Locale, n = 3): QuizQuestion[] {
  if (!getSkill(skillId)) return [];
  const out: QuizQuestion[] = [];
  for (let seed = 1; seed <= 60 && out.length < n; seed++) {
    const q = questionFrom(makeItem(skillId, 1, seed, locale), seed);
    if (q && !out.some((x) => x.prompt === q.prompt)) out.push({ id: `q${out.length + 1}`, ...q });
  }
  return out;
}

/**
 * Checked sites that fit the skill or name the topic. resourcesFor ranks every site for the subject and
 * grade; a source-built course lists only the ones that are actually about what was asked.
 */
export function relevantResources(q: { skillId?: string; topic: string; subject: Subject; grade: Grade; locale: Locale }, max = 3) {
  const topic = new Set(words(q.topic));
  const fitsSkill = (f: string) => !!q.skillId && (f === q.skillId || (f.endsWith(".") && q.skillId.startsWith(f)));
  const namesTopic = (text: string) => words(text).some((w) => topic.has(w));
  return resourcesFor(q)
    .filter((r) => r.fits.some((f) => fitsSkill(f) || (!f.includes(".") && !f.startsWith("grade:") && namesTopic(f))) || namesTopic(r.title))
    .slice(0, max);
}

// ── Books ──────────────────────────────────────────────────────────────────────────────────────

/** Open Library's query syntax uses these; a title with them is searched as plain words. */
const QUERY_SYNTAX = /[:()"[\]{}^~*?\\/+!&|-]/g;

/**
 * The Open Library search for books for children about a topic: only juvenile literature (without it,
 * "volcano" finds adult novels first), and only books in Spanish for a Spanish course.
 */
export function bookQuery(title: string, locale: Locale) {
  const plain = title.replace(QUERY_SYNTAX, " ").replace(/\s+/g, " ").trim().slice(0, 60).trim();
  return `${plain} subject_key:juvenile_literature${locale === "es" ? " language:spa" : ""}`;
}

// ── The builder ────────────────────────────────────────────────────────────────────────────────

/** Which part of a source-built course a lesson (or, in a one-lesson course, a scene) is. Kept in its id. */
export type Part = "overview" | "words" | "lesson" | "practice" | "more";
const PART_ID = /^(?:src-)?(overview|words|lesson|practice|more)-/;

const rotate = <T,>(list: T[], k: number) => [...list.slice(k % list.length), ...list.slice(0, k % list.length)];
const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;

/** Whether a definition says a word (any form of it); multi-word terms need every word. */
const mentions = (text: string, word: string) => {
  const said = tokens(text);
  return word.split(" ").every((w) => said.has(stem(w)));
};

/**
 * "Which word means …?" questions from the definitions. A definition that says its own word or another
 * choice gives the answer away (or muddles it), so it is not asked.
 */
function termQuestions(terms: Term[], locale: Locale): QuizQuestion[] {
  if (terms.length < 2) return [];
  const out: QuizQuestion[] = [];
  terms.forEach((term, i) => {
    if (out.length >= 3 || terms.some((x) => mentions(term.text, x.word))) return;
    const choices = rotate(
      terms.map((x) => x.word),
      i + 1,
    );
    out.push({
      id: `q${out.length + 1}`,
      prompt: t(locale, "crs.src.whichWord", { meaning: term.text }),
      choices,
      answer: choices.indexOf(term.word),
      hint: t(locale, "crs.src.whichWordHint"),
      explain: t(locale, "crs.src.whichWordExplain", { word: term.word, meaning: term.text }),
    });
  });
  return out;
}

/** Only plain web links are kept: a source that sends anything else (javascript:, data:) is not linked. */
export const isWebLink = (url: string) => /^https?:\/\/[^\s]+$/i.test(url);
const wiktionary = (word: string) => `https://en.wiktionary.org/wiki/${encodeURIComponent(word.replace(/ /g, "_"))}`;
const bookLine = (b: Book) => [b.title, b.author].filter(Boolean).join(", ") + (b.year ? ` (${b.year})` : "");
/** A link as people read it: no scheme, no percent codes. */
const readableUrl = (url: string) => {
  let u = url.replace(/^https?:\/\//, "");
  try {
    u = decodeURI(u);
  } catch {
    // keep it encoded
  }
  return u;
};

/**
 * Builds a course for `goal` from real sources, without AI. Nothing found is never filled with
 * something invented: a part that has no source is left out, and `onStep` says what each part found.
 * A request that fails the safety screen asks no source anything and builds nothing.
 */
export async function buildSourceCourse(goal: string, grade: Grade, locale: Locale, fetchers: Fetchers, opts: BuildOptions = {}): Promise<Course> {
  const stop = () => {
    if (opts.signal?.aborted) throw new DOMException("aborted", "AbortError");
  };
  const report = (s: SourceStep) => {
    stop();
    opts.onStep?.(s);
  };
  stop();
  const subject = opts.subject ?? guessSubject(goal);
  const length = opts.length ?? "short";
  const young = isYoung(grade);
  const now = opts.now ?? Date.now();
  const course = (lessons: Lesson[], citations: NonNullable<Course["citations"]>): Course => ({
    id: opts.id ?? newId(),
    profileId: opts.profileId ?? "",
    title: titleFromGoal(goal),
    goal,
    subject,
    grade,
    locale,
    origin: "generated",
    status: "outlining",
    length,
    sources: [],
    lessons,
    template: false,
    citations,
    createdAt: now,
    updatedAt: now,
  });
  /** Third-party text goes through the same safety screen as what the learner typed. */
  const fine = (text: string) => screen(text, locale).kind === "ok";
  if (!fine(goal)) return course([], []);
  const topic = topicOf(goal, opts.avoid);

  // 1. The overview: Wikipedia's article, quoted and credited. K–2 in English read Simple English
  // Wikipedia when it has the topic (short words, short sentences), English Wikipedia otherwise.
  let article: WikiSummary | null = null;
  let articleFailed: Failure | undefined;
  const searchable = topic.length >= 2;
  const usable = (a: WikiSummary | null) => (a?.extract?.trim() && a.title?.trim() ? a : null);
  try {
    if (searchable && young && locale === "en") {
      article = usable(
        await fetchers.wiki(topic, "simple").catch((e: unknown) => {
          if (failure(e) === "offline") throw e;
          return null;
        }),
      );
    }
    if (searchable && !article) article = usable(await fetchers.wiki(topic, locale));
  } catch (e) {
    articleFailed = failure(e);
  }
  const withheld = !!article && !fine(`${article.title} ${article.extract}`);
  report({ part: "article", title: article?.title, failed: articleFailed, withheld: withheld || undefined });
  if (withheld) article = null;
  if (article && !isWebLink(article.url)) article = { ...article, url: `https://${article.lang || locale}.wikipedia.org/wiki/${encodeURIComponent(article.title.replace(/ /g, "_"))}` };
  const extract = article ? (young ? [firstSentence(article.extract)] : paragraphs(article.extract)) : [];

  // 2. Key words (the dictionary is English) and books, side by side. Offline, nothing more is asked.
  const offline = articleFailed === "offline";
  const ask = searchable && !offline;
  const plainTitle = article?.title.replace(/\s*\(.*\)$/, "");
  const need = article ? words(article.title.match(/\((.*)\)$/)?.[1] ?? "") : [];
  const noTerms = { terms: [] as Term[], failed: offline ? ("offline" as const) : undefined };
  const noBooks = { books: [] as Book[], failed: offline ? ("offline" as const) : undefined };
  const [termsFound, booksFound] = await Promise.all([
    ask && locale === "en" ? findTerms(plainTitle ?? topic, article ? article.extract : null, need, fetchers, young ? 3 : 4, fine) : noTerms,
    ask
      ? fetchers.books(bookQuery(plainTitle ?? topic, locale)).then(
          (list) => {
            const books: Book[] = [];
            for (const b of list) if (b.title?.trim() && isWebLink(b.url) && fine(b.title) && !books.some((x) => x.title === b.title) && books.length < 3) books.push(b);
            return { books, failed: undefined };
          },
          (e: unknown) => ({ books: [] as Book[], failed: failure(e) }),
        )
      : noBooks,
  ]);
  const terms = termsFound.terms;
  report({ part: "terms", count: terms.length, failed: termsFound.failed, englishOnly: locale !== "en" || undefined });

  // 3. The closest lessons a person wrote, and 4. questions from the skill map: both on the device.
  const full = length === "full";
  const matches = relatedLessons({ goal: topic, title: article?.title, extract: extract.join(" "), terms: terms.map((x) => x.word) }, subject, grade, locale, full ? 2 : 1);
  const skills = practiceSkillsFor(topic, article?.title, subject, grade);
  const fitting = skills.filter((m) => m.fits).map((m) => m.skillId);
  // Questions only from skills that fit the grade; a skill with two or more questions before one with one.
  const quizzes = fitting
    .map((id) => ({ id, questions: skillQuestions(id, locale) }))
    .filter((x) => x.questions.length > 0)
    .sort((a, b) => Number(b.questions.length >= 2) - Number(a.questions.length >= 2))
    .slice(0, full ? 2 : 1);
  const books = booksFound.books;
  const resources = relevantResources({ skillId: quizzes[0]?.id ?? fitting[0], topic: `${topic} ${article?.title ?? ""}`, subject, grade, locale });

  const tr = (key: Key, vars?: Record<string, string | number>) => t(locale, key, vars);
  const lesson = (part: Part, title: string, summary: string, scenes: Scene[], minutes: number): Lesson => ({ id: `src-${part}-${newId()}`, title, summary, minutes, scenes });

  const overview =
    article &&
    lesson(
      "overview",
      tr("crs.src.overview", { title: article.title }),
      tr(young ? "crs.src.overviewSummaryShort" : "crs.src.overviewSummary", { title: article.title }),
      [
        {
          id: "s1",
          kind: "slide",
          title: tr("crs.src.wikiSlide"),
          blocks: [...extract.map((text) => ({ type: "text" as const, text })), { type: "text", text: tr("crs.src.wikiCredit", { title: article.title, url: readableUrl(article.url) }) }],
        },
      ],
      Math.max(2, Math.ceil(wordCount(extract.join(" ")) / 80)),
    );

  // K–2 get the word list to hear, without a reading quiz.
  const quiz = young ? [] : termQuestions(terms, locale);
  const wordsLesson =
    terms.length > 0 &&
    lesson(
      "words",
      tr("crs.src.words"),
      tr("crs.src.wordsSummary", { n: terms.length }),
      [
        { id: "s1", kind: "slide", title: tr("crs.src.wordsSlide"), blocks: [{ type: "points", items: terms.map((x) => `${x.word} (${x.partOfSpeech}): ${x.text}`) }, { type: "text", text: tr("crs.src.wordsCredit") }] },
        ...(quiz.length ? [{ id: "s2", kind: "quiz" as const, title: tr("crs.src.wordsQuiz"), questions: quiz }] : []),
      ],
      2 + quiz.length,
    );

  const borrowed = matches.map((m) => {
    const why = m.topic ? tr(`crs.why.${m.topic}` as Key) : null;
    const copy = structuredClone(m.lesson);
    return {
      ...copy,
      id: `src-lesson-${newId()}`,
      summary: `${why ?? m.lesson.summary} ${tr("crs.src.fromCourse", { course: m.entry.title })}`.trim(),
      scenes: why ? [{ id: "src-why", kind: "slide" as const, title: tr("crs.src.whyTitle"), blocks: [{ type: "text" as const, text: why }] }, ...copy.scenes] : copy.scenes,
    } satisfies Lesson;
  });

  const practices = quizzes.map(({ id, questions }) =>
    lesson(
      "practice",
      tr("crs.src.practice", { skill: getSkill(id)!.title[locale] }),
      tr("crs.src.practiceSummary"),
      [{ id: "s1", kind: "quiz", title: tr((opts.reviewed ?? reviewedByDefault)(id) ? "crs.src.practiceQuiz" : "crs.src.practiceQuizDraft"), questions }],
      1 + questions.length,
    ),
  );

  const moreScenes: Scene[] = [];
  if (books.length) moreScenes.push({ id: "s1", kind: "slide", title: tr("crs.src.booksSlide"), blocks: [{ type: "points", items: books.map(bookLine) }, { type: "text", text: tr("crs.src.booksCredit") }] });
  if (resources.length)
    moreScenes.push({ id: "s2", kind: "slide", title: tr("crs.src.sitesSlide"), blocks: [{ type: "points", items: resources.map((r) => `${r.title} (${r.source})`) }, { type: "text", text: tr("crs.src.sitesCredit") }] });
  const linked = books.length > 0 || resources.length > 0;
  const more =
    (linked || article) &&
    lesson(
      "more",
      tr("crs.src.more"),
      tr(books.length && resources.length ? "crs.src.moreSummary" : books.length ? "crs.src.moreSummaryBooks" : resources.length ? "crs.src.moreSummarySites" : "crs.src.moreSummaryWiki"),
      [
        ...moreScenes,
        {
          id: "s3",
          kind: "project",
          title: tr("crs.src.projectTitle"),
          brief: tr("crs.src.projectBrief"),
          steps: [
            tr(linked ? "crs.src.projectStep1" : "crs.src.projectStep1Wiki"),
            article ? tr(books.length ? "crs.src.projectStep2Wiki" : "crs.src.projectStep2WikiOnly", { title: article.title }) : tr("crs.src.projectStep2"),
            tr("crs.src.projectStep3"),
          ],
        },
      ],
      5,
    );

  // "One lesson" asks for a single sitting: our own parts as scenes of one lesson (K–2: as many as fit
  // ten minutes). A borrowed lesson is a whole lesson of its own, so it waits for a longer course, unless
  // it is the only thing found.
  const own = [overview, wordsLesson, ...practices, more].filter((l): l is Lesson => Boolean(l));
  let lessons: Lesson[];
  let leftOut = false;
  if (length !== "lesson") lessons = [overview, wordsLesson, borrowed[0], practices[0], borrowed[1], practices[1], more].filter((l): l is Lesson => Boolean(l));
  else if (!own.length) lessons = borrowed.slice(0, 1);
  else {
    leftOut = borrowed.length > 0;
    const kept = [...own];
    while (young && kept.length > 1 && kept.reduce((n, l) => n + l.minutes, 0) > YOUNG_SITTING) kept.pop();
    const dropped = own.filter((l) => !kept.includes(l));
    const list = (ls: Lesson[]) => new Intl.ListFormat(locale, { type: "conjunction" }).format(ls.map((l) => l.title));
    const summary = [tr("crs.src.oneSummary", { parts: list(kept) }), dropped.length ? tr("crs.src.leftOut", { parts: list(dropped) }) : ""].filter(Boolean).join(" ");
    const scenes = kept.flatMap((l) => l.scenes.map((sc) => ({ ...sc, id: `${l.id.split("-")[1]}-${sc.id}` })));
    lessons = [{ id: `src-one-${newId()}`, title: topic || titleFromGoal(goal), summary, minutes: kept.reduce((n, l) => n + l.minutes, 0), scenes }];
  }

  report({ part: "lesson", titles: matches.map((m) => m.lesson.title), leftOut: leftOut || undefined });
  const titleOf = (id: string) => getSkill(id)!.title[locale];
  const closest = skills[0] && getSkill(skills[0].skillId);
  report(
    quizzes.length
      ? { part: "practice", skills: quizzes.map((q) => titleOf(q.id)), questions: quizzes.reduce((n, q) => n + q.questions.length, 0) }
      : fitting.length
        ? { part: "practice", skills: [titleOf(fitting[0])], questions: 0 }
        : closest
          ? { part: "practice", skills: [closest.title[locale]], questions: 0, grade: closest.grade }
          : { part: "practice", skills: [], questions: 0 },
  );
  report({ part: "books", count: books.length, failed: booksFound.failed });

  const citations: NonNullable<Course["citations"]> = [];
  if (article) citations.push({ title: article.title, url: article.url, source: SOURCE.wikipedia });
  for (const x of terms) citations.push({ title: x.word, url: wiktionary(x.word), source: SOURCE.wiktionary });
  for (const b of books) citations.push({ title: bookLine(b), url: b.url, source: SOURCE.openLibrary });
  for (const r of resources) citations.push({ title: r.title, url: linkOf(r, locale), source: r.source });

  return course(lessons, keepCitations(citations, lessons));
}

// ── After the family edits the outline ─────────────────────────────────────────────────────────

/** The parts a source-built course still has (from the lesson ids, and scene ids in a one-lesson course). */
export function partsIn(lessons: Lesson[]): Set<Part> {
  const out = new Set<Part>();
  for (const l of lessons) {
    const p = PART_ID.exec(l.id)?.[1] as Part | undefined;
    if (p) out.add(p);
    if (l.id.startsWith("src-one-"))
      for (const sc of l.scenes) {
        const q = PART_ID.exec(sc.id)?.[1] as Part | undefined;
        if (q) out.add(q);
      }
  }
  return out;
}

/**
 * The citations a lesson still uses: Wikipedia while the overview (or the find-out-more lesson that
 * points to it) is there, the dictionary while the word list is, books and sites while find-out-more is.
 */
export function keepCitations(citations: NonNullable<Course["citations"]>, lessons: Lesson[]): NonNullable<Course["citations"]> {
  const parts = partsIn(lessons);
  return citations.filter((c) =>
    c.source === SOURCE.wikipedia ? parts.has("overview") || parts.has("more") : c.source === SOURCE.wiktionary ? parts.has("words") : parts.has("more"),
  );
}

/** What a source-built course was made from, for the one line that says so. In the order the course uses them. */
export type Used = "wikipedia" | "dictionary" | "catalogue" | "skillMap" | "openLibrary" | "sites";
export function sourcesUsed(lessons: Lesson[], citations: NonNullable<Course["citations"]>): Used[] {
  const parts = partsIn(lessons);
  const g = citationGroups(keepCitations(citations, lessons));
  const out: Used[] = [];
  if (g.article) out.push("wikipedia");
  if (g.words.length) out.push("dictionary");
  if (parts.has("lesson")) out.push("catalogue");
  if (parts.has("practice")) out.push("skillMap");
  if (g.books.length) out.push("openLibrary");
  if (g.sites.length) out.push("sites");
  return out;
}

// ── The browser's fetchers ─────────────────────────────────────────────────────────────────────

async function know<T>(kind: string, q: string, lang?: Wiki): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) throw new SourceError("offline");
  const params = new URLSearchParams({ q });
  if (lang) params.set("lang", lang);
  let res: Response;
  try {
    res = await fetch(`/api/know/${kind}?${params}`);
  } catch {
    throw new SourceError("offline");
  }
  if (!res.ok) throw new SourceError("unavailable");
  return (await res.json()) as T;
}

/**
 * Everything goes through our own /api/know, so only the topic leaves the device. `lang=simple` asks
 * for Simple English Wikipedia; until the route knows it, the route answers from English Wikipedia.
 */
export const knowFetchers: Fetchers = {
  wiki: async (topic, lang) => (await know<{ summary: WikiSummary | null }>("wiki", topic, lang)).summary ?? null,
  related: async (word) => (await know<{ related?: string[] }>("related", word)).related ?? [],
  define: async (word) => (await know<{ definitions?: Definition[] }>("define", word)).definitions ?? [],
  books: async (q) => (await know<{ books?: Book[] }>("books", q)).books ?? [],
};

/** The links a source-built course carries, grouped the way the course page lists them. */
export function citationGroups(citations: NonNullable<Course["citations"]>) {
  const known = Object.values(SOURCE) as string[];
  return {
    article: citations.find((c) => c.source === SOURCE.wikipedia),
    words: citations.filter((c) => c.source === SOURCE.wiktionary),
    books: citations.filter((c) => c.source === SOURCE.openLibrary),
    sites: citations.filter((c) => !known.includes(c.source)),
  };
}
