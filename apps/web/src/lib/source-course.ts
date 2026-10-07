import { catalogueFor, type CatalogueEntry } from "@/catalogue";
import { t } from "@/i18n";
import type { Book, Definition, WikiSummary } from "@/knowledge";
import { matchSkills } from "@/planner/skillmatch";
import { answerText, check } from "@/practice/answer";
import { REVIEWED } from "@/practice/reviewed";
import { getSkill, makeItem } from "@/practice/skills";
import type { ItemBody, MathPart } from "@/practice/types";
import { linkOf, resourcesFor } from "@/resources";
import { titleFromGoal } from "./courses";
import { guessSubject } from "./generate";
import { newId } from "./store";
import type { Course, CourseLength, Grade, Lesson, Locale, QuizQuestion, Scene, Subject } from "./types";

// Source-built courses: a course for any topic, made without AI from things we can name and link.
// An overview quoted from Wikipedia, key words with dictionary definitions, the closest lesson a person
// wrote for our catalogue, questions from the skill map (checked by code), and books and sites to find
// out more. Same inputs, same course. Sourced text is shown as written and credited, never as ours.

/** Where the knowledge comes from. Injected so the builder runs in tests without a network. */
export type Fetchers = {
  /** The best Wikipedia article for a topic, or null when there is none. */
  wiki: (topic: string, lang: Locale) => Promise<WikiSummary | null>;
  /** Words that mean something like the topic (Datamuse). */
  related: (word: string) => Promise<string[]>;
  /** Dictionary definitions (Wiktionary through Datamuse); empty when the word has none. */
  define: (word: string) => Promise<Definition[]>;
  /** Books a family can borrow (Open Library). */
  books: (q: string) => Promise<Book[]>;
};

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
  | { part: "article"; title?: string; failed?: Failure }
  | { part: "terms"; count: number; failed?: Failure; englishOnly?: boolean }
  | { part: "lesson"; title?: string; course?: string }
  | { part: "practice"; skill?: string; questions: number }
  | { part: "books"; count: number; failed?: Failure };

/** The `source` of each citation the builder writes; the course page groups links by it. */
export const SOURCE = { wikipedia: "Wikipedia", wiktionary: "Wiktionary", openLibrary: "Open Library" } as const;

export type BuildOptions = {
  profileId?: string;
  id?: string;
  subject?: Subject;
  length?: CourseLength;
  /** Words that must never leave the device (the learner's name), removed from every query. */
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

/** The topic a learner asked about, without their name and without "I want to learn about". */
export function topicOf(goal: string, avoid: string[] = []) {
  let topic = titleFromGoal(goal);
  for (const name of avoid.map((n) => n.trim()).filter((n) => n.length > 1)) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    topic = topic.replace(new RegExp(`(^|[^\\p{L}])${escaped}('s)?(?=$|[^\\p{L}])`, "giu"), "$1");
  }
  return topic.replace(/\s+/g, " ").replace(/^[\s,.:;-]+|[\s,.:;-]+$/g, "").slice(0, 100);
}

// ── The overview ───────────────────────────────────────────────────────────────────────────────

/** Wikipedia's opening as written, ending on a whole sentence, in short paragraphs to read (or hear) one at a time. */
export function paragraphs(extract: string): string[] {
  let text = extract.trim();
  if (!/[.!?"”)]$/.test(text)) {
    const end = Math.max(text.lastIndexOf(". "), text.lastIndexOf("? "), text.lastIndexOf("! "));
    text = end > 120 ? text.slice(0, end + 1) : `${text}…`;
  }
  const sentences = text.split(/(?<=[.!?])\s+(?=[\p{Lu}¿¡"“(])/u);
  const out: string[] = [];
  for (let i = 0; i < sentences.length; i += 2) out.push(sentences.slice(i, i + 2).join(" "));
  return out;
}

// ── Key words ──────────────────────────────────────────────────────────────────────────────────

export type Term = { word: string; partOfSpeech: string; text: string };

const NOT_A_MEANING = /^(plural of|simple past|past participle|present participle|third-person singular|alternative (form|spelling|letter-case form) of|obsolete|archaic|misspelling of|abbreviation of|initialism of|synonym of)/i;
const MAX_DEF = 200;

function meaning(defs: Definition[]): Definition | null {
  const d = defs.find((x) => (x.partOfSpeech === "noun" || x.partOfSpeech === "verb") && x.text && !NOT_A_MEANING.test(x.text));
  if (!d) return null;
  if (d.text.length <= MAX_DEF) return d;
  const cut = d.text.slice(0, MAX_DEF);
  return { ...d, text: `${cut.slice(0, cut.lastIndexOf(" "))}…` };
}

/**
 * Up to four key words with definitions: the topic itself, then words that mean something like it and
 * also appear in the article, then the article's other long words. Only nouns and verbs with a real
 * meaning count. English only: the dictionary is English.
 */
async function findTerms(topic: string, extract: string | null, f: Fetchers): Promise<{ terms: Term[]; failed?: Failure }> {
  const inText = new Set(extract ? words(extract) : []);
  let related: string[] = [];
  let failed: Failure | undefined;
  try {
    related = await f.related(topic.toLowerCase());
  } catch (e) {
    failed = failure(e);
    if (failed === "offline") return { terms: [], failed };
  }
  const single = related.map((w) => w.toLowerCase().trim()).filter((w) => /^[a-z]{3,}$/.test(w));
  const head = topic.toLowerCase().split(" ").length <= 2 ? [topic.toLowerCase()] : [];
  const fromText = extract ? (norm(extract).match(/[a-z]{6,}/g) ?? []).filter((w) => !STOP.has(w)) : [];
  const candidates: string[] = [];
  const seen = new Set<string>();
  const add = (w: string) => {
    const s = stem(w);
    if (seen.has(s) || candidates.length >= 7) return;
    seen.add(s);
    candidates.push(w);
  };
  head.forEach(add);
  single.filter((w) => !extract || inText.has(stem(w))).forEach(add);
  if (extract) fromText.forEach(add);
  else single.forEach(add);

  const answers = await Promise.all(candidates.map((w) => f.define(w).then((d) => ({ d }), (e: unknown) => ({ e }))));
  if (candidates.length && answers.every((a) => "e" in a)) return { terms: [], failed: failure((answers[0] as { e: unknown }).e) };
  const terms: Term[] = [];
  for (const a of answers) {
    if (!("d" in a) || terms.length >= 4) continue;
    const m = meaning(a.d);
    if (m && !terms.some((x) => stem(x.word) === stem(m.word))) terms.push({ word: m.word, partOfSpeech: m.partOfSpeech, text: m.text });
  }
  return { terms, failed: terms.length ? undefined : failed };
}

// ── The closest ready-made lesson ──────────────────────────────────────────────────────────────

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

const gradeN = (g: Grade) => (g === "K" ? 0 : g === "adult" ? 10 : Number(g));

/**
 * The catalogue lesson (in the course's language) that shares the most words with the request and the
 * article. Words from the request and the article title weigh most; a match in the lesson title counts
 * double. Too weak a match returns null rather than a lesson about something else.
 */
export function closestLesson(query: { goal: string; title?: string; extract?: string; terms?: string[] }, subject: Subject, grade: Grade, locale: Locale) {
  const weight = new Map<string, number>();
  const put = (text: string | undefined, w: number) => words(text ?? "").forEach((s) => weight.set(s, Math.max(weight.get(s) ?? 0, w)));
  put(query.extract, 1);
  put(query.terms?.join(" "), 2);
  put(query.title, 3);
  put(query.goal, 3);
  let best: { entry: CatalogueEntry; lesson: Lesson; score: number } | null = null;
  // Same language, and no more than three grades away: a lesson pitched far off the learner's grade doesn't help.
  for (const entry of catalogueFor(grade, locale).filter((e) => e.locale === locale && Math.abs(gradeN(e.grade) - gradeN(grade)) <= 3)) {
    for (const lesson of entry.lessons) {
      const title = new Set(words(lesson.title));
      const body = new Set(words(lessonText(lesson)));
      let score = 0;
      let matched = 0;
      let strong = false;
      for (const [s, w] of weight) {
        if (title.has(s)) {
          score += w * 2;
          matched++;
          if (w >= 3) strong = true;
        } else if (body.has(s)) {
          score += w;
          matched++;
        }
      }
      if (score < 4 || (matched < 2 && !strong)) continue;
      const total = score + (entry.subject === subject ? 1 : 0) - Math.abs(gradeN(entry.grade) - gradeN(grade)) * 0.25;
      if (!best || total > best.score) best = { entry, lesson, score: total };
    }
  }
  return best && { entry: best.entry, lesson: best.lesson };
}

// ── Practice from the skill map ────────────────────────────────────────────────────────────────

/** Skills on the map that fit the request (best first). */
export const practiceSkillsFor = (goal: string, articleTitle: string | undefined, subject: Subject) => matchSkills(`${goal} ${articleTitle ?? ""}`, subject, 3);

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

// ── The builder ────────────────────────────────────────────────────────────────────────────────

const rotate = <T,>(list: T[], k: number) => [...list.slice(k % list.length), ...list.slice(0, k % list.length)];
const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;

/** "Which word means …?" questions from the definitions. A definition that names its own word is not asked. */
function termQuestions(terms: Term[], locale: Locale): QuizQuestion[] {
  if (terms.length < 2) return [];
  const out: QuizQuestion[] = [];
  terms.forEach((term, i) => {
    if (out.length >= 3 || words(term.text).includes(stem(term.word))) return;
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

/**
 * Builds a course for `goal` from real sources, without AI. Nothing found is never filled with
 * something invented: a part that has no source is left out, and `onStep` says what each part found.
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
  const topic = topicOf(goal, opts.avoid);

  // 1. The overview: Wikipedia's article, quoted and credited.
  let article: WikiSummary | null = null;
  let articleFailed: Failure | undefined;
  const searchable = topic.length >= 2;
  try {
    article = searchable ? await fetchers.wiki(topic, locale) : null;
  } catch (e) {
    articleFailed = failure(e);
  }
  if (article && (!article.extract?.trim() || !article.title?.trim())) article = null;
  if (article && !isWebLink(article.url)) article = { ...article, url: `https://${locale}.wikipedia.org/wiki/${encodeURIComponent(article.title.replace(/ /g, "_"))}` };
  report({ part: "article", title: article?.title, failed: articleFailed });
  const extract = article ? paragraphs(article.extract) : [];

  // 2. Key words (the dictionary is English) and books, side by side. Offline, nothing more is asked.
  const offline = articleFailed === "offline";
  const ask = searchable && !offline;
  const noTerms = { terms: [] as Term[], failed: offline ? ("offline" as const) : undefined };
  const noBooks = { books: [] as Book[], failed: offline ? ("offline" as const) : undefined };
  const [termsFound, booksFound] = await Promise.all([
    ask && locale === "en" ? findTerms(article?.title.replace(/\s*\(.*\)$/, "") ?? topic, article ? extract.join(" ") : null, fetchers) : noTerms,
    ask
      ? fetchers.books(article?.title ?? topic).then(
          (b) => ({ books: b.filter((x) => x.title && isWebLink(x.url)).slice(0, 3), failed: undefined }),
          (e: unknown) => ({ books: [] as Book[], failed: failure(e) }),
        )
      : noBooks,
  ]);
  const terms = termsFound.terms;
  report({ part: "terms", count: terms.length, failed: termsFound.failed, englishOnly: locale !== "en" || undefined });

  // 3. The closest lesson a person wrote, and 4. questions from the skill map: both local, always there.
  const match = closestLesson({ goal: topic, title: article?.title, extract: extract.join(" "), terms: terms.map((x) => x.word) }, subject, grade, locale);
  report({ part: "lesson", title: match?.lesson.title, course: match?.entry.title });
  const skills = practiceSkillsFor(topic, article?.title, subject);
  const skillId = skills.find((id) => skillQuestions(id, locale, 2).length >= 2) ?? skills[0];
  const questions = skillId ? skillQuestions(skillId, locale) : [];
  const skill = skillId ? getSkill(skillId) : undefined;
  report({ part: "practice", skill: skill?.title[locale], questions: questions.length });

  // 5. Find out more: books to borrow and checked sites for the subject and grade.
  const books = booksFound.books;
  report({ part: "books", count: books.length, failed: booksFound.failed });
  const resources = relevantResources({ skillId, topic: `${topic} ${article?.title ?? ""}`, subject, grade, locale });

  const tr = (key: Parameters<typeof t>[1], vars?: Record<string, string | number>) => t(locale, key, vars);
  const lesson = (title: string, summary: string, scenes: Scene[], minutes: number): Lesson => ({ id: newId(), title, summary, minutes, scenes });

  const overview =
    article &&
    lesson(
      tr("crs.src.overview", { title: article.title }),
      tr("crs.src.overviewSummary", { title: article.title }),
      [
        {
          id: "s1",
          kind: "slide",
          title: tr("crs.src.wikiSlide"),
          blocks: [...extract.map((text) => ({ type: "text" as const, text })), { type: "text", text: tr("crs.src.wikiCredit", { title: article.title }) }],
        },
      ],
      Math.max(2, Math.ceil(wordCount(extract.join(" ")) / 80)),
    );

  const quiz = termQuestions(terms, locale);
  const wordsLesson =
    terms.length > 0 &&
    lesson(
      tr("crs.src.words"),
      tr("crs.src.wordsSummary", { n: terms.length }),
      [
        { id: "s1", kind: "slide", title: tr("crs.src.wordsSlide"), blocks: [{ type: "points", items: terms.map((x) => `${x.word} (${x.partOfSpeech}): ${x.text}`) }, { type: "text", text: tr("crs.src.wordsCredit") }] },
        ...(quiz.length ? [{ id: "s2", kind: "quiz" as const, title: tr("crs.src.wordsQuiz"), questions: quiz }] : []),
      ],
      2 + quiz.length,
    );

  const borrowed = match && { ...structuredClone(match.lesson), id: newId(), summary: `${match.lesson.summary} ${tr("crs.src.fromCourse", { course: match.entry.title })}`.trim() };

  const practice =
    skill &&
    questions.length > 0 &&
    lesson(
      tr("crs.src.practice", { skill: skill.title[locale] }),
      tr("crs.src.practiceSummary"),
      [{ id: "s1", kind: "quiz", title: tr((opts.reviewed ?? reviewedByDefault)(skill.id) ? "crs.src.practiceQuiz" : "crs.src.practiceQuizDraft"), questions }],
      1 + questions.length,
    );

  const moreScenes: Scene[] = [];
  if (books.length) moreScenes.push({ id: "s1", kind: "slide", title: tr("crs.src.booksSlide"), blocks: [{ type: "points", items: books.map(bookLine) }, { type: "text", text: tr("crs.src.booksCredit") }] });
  if (resources.length)
    moreScenes.push({ id: "s2", kind: "slide", title: tr("crs.src.sitesSlide"), blocks: [{ type: "points", items: resources.map((r) => `${r.title} (${r.source})`) }, { type: "text", text: tr("crs.src.sitesCredit") }] });
  const more =
    (books.length > 0 || resources.length > 0 || article) &&
    lesson(
      tr("crs.src.more"),
      tr("crs.src.moreSummary"),
      [
        ...moreScenes,
        {
          id: "s3",
          kind: "project",
          title: tr("crs.src.projectTitle"),
          brief: tr("crs.src.projectBrief"),
          steps: [tr("crs.src.projectStep1"), article ? tr("crs.src.projectStep2Wiki", { title: article.title }) : tr("crs.src.projectStep2"), tr("crs.src.projectStep3")],
        },
      ],
      5,
    );

  // "One lesson" asks for a single sitting: our own parts as scenes of one lesson. The borrowed
  // catalogue lesson is a whole lesson of its own, so it is left for a longer course.
  const own = [overview, wordsLesson, practice, more].filter((l): l is Lesson => Boolean(l));
  const lessons =
    length === "lesson"
      ? own.length
        ? [lesson(topic, tr("crs.src.oneSummary"), own.flatMap((l, i) => l.scenes.map((sc) => ({ ...sc, id: `${i + 1}-${sc.id}` }))), own.reduce((n, l) => n + l.minutes, 0))]
        : []
      : [overview, wordsLesson, borrowed, practice, more].filter((l): l is Lesson => Boolean(l));

  const citations: NonNullable<Course["citations"]> = [];
  if (article) citations.push({ title: article.title, url: article.url, source: SOURCE.wikipedia });
  for (const x of terms) citations.push({ title: x.word, url: wiktionary(x.word), source: SOURCE.wiktionary });
  for (const b of books) citations.push({ title: bookLine(b), url: b.url, source: SOURCE.openLibrary });
  for (const r of resources) citations.push({ title: r.title, url: linkOf(r, locale), source: r.source });

  const now = opts.now ?? Date.now();
  return {
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
  };
}

// ── The browser's fetchers ─────────────────────────────────────────────────────────────────────

async function know<T>(kind: string, q: string, lang?: Locale): Promise<T> {
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

/** Everything goes through our own /api/know, so only the topic leaves the device. */
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
