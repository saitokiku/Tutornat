import { describe, expect, it } from "vitest";
import { readyMadeMatch } from "@/lib/source-course";
import type { Grade, Locale, Scene } from "@/lib/types";
import { getSkill } from "@/practice/skills";
import { matchEntry } from ".";
import factOpinion, { practice as factOpinionPractice } from "./english-fact-opinion";
import figurative, { practice as figurativePractice } from "./english-figurative";
import figurativeEs from "./english-figurative-es";
import partsOfSpeech, { practice as partsOfSpeechPractice } from "./english-parts-of-speech";
import partsOfSpeechEs from "./english-parts-of-speech-es";
import rhymesSyllables, { practice as rhymesSyllablesPractice } from "./english-rhymes-syllables";
import rhymesSyllablesEs from "./english-rhymes-syllables-es";
import shortWords, { practice as shortWordsPractice } from "./english-short-words";
import type { CatalogueEntry } from "./types";

// The English K–5 ready-made courses and their Spanish twins.
const COURSES = [shortWords, rhymesSyllables, rhymesSyllablesEs, partsOfSpeech, partsOfSpeechEs, figurative, figurativeEs, factOpinion];
const IDS = new Set(COURSES.map((c) => c.id));
const YOUNG = COURSES.filter((c) => ["K", "1", "2"].includes(c.grade));

function sceneStrings(s: Scene): string[] {
  switch (s.kind) {
    case "slide":
      return s.blocks.flatMap((b) => (b.type === "text" ? [b.text] : b.type === "points" ? b.items : [b.alt]));
    case "quiz":
      return s.questions.flatMap((q) => [q.prompt, ...q.choices, q.hint, q.explain]);
    case "interactive":
      return [s.prompt, ...(s.widget.kind === "sorter" ? [...s.widget.categories, ...s.widget.items.map((i) => i.text)] : [])];
    case "project":
      return [s.brief, ...s.steps];
  }
}

/** Every string a learner sees, and on K–2 courses can hear read aloud. */
const strings = (c: CatalogueEntry) => [c.title, c.summary, ...c.lessons.flatMap((l) => [l.title, l.summary, ...l.scenes.flatMap((s) => [s.title, ...sceneStrings(s)])])];

describe("English K–5 ready-made courses", () => {
  it("spread quiz keys over the choices, so tapping the first one is no strategy", () => {
    for (const c of COURSES) {
      const keys = c.lessons.flatMap((l) => l.scenes.flatMap((s) => (s.kind === "quiz" ? s.questions.map((q) => q.answer) : [])));
      const at = (i: number) => keys.filter((k) => k === i).length;
      expect(at(0) / keys.length, `${c.id}: first choice`).toBeLessThanOrEqual(0.4);
      for (let i = 0; i < 4; i++) expect(at(i), `${c.id}: choice ${i + 1}`).toBeLessThanOrEqual(keys.length / 2);
    }
  });

  it("vary the key order from lesson to lesson, so no order can be learned", () => {
    // QuizView keeps the authored order, so "second, third, first" in every lesson would teach itself.
    for (const c of COURSES) {
      const orders = c.lessons.flatMap((l) => l.scenes.flatMap((s) => (s.kind === "quiz" && s.questions.length >= 3 ? [s.questions.slice(0, 3).map((q) => q.answer).join(",")] : [])));
      expect(new Set(orders).size, `${c.id}: ${orders.join(" | ")}`).toBe(orders.length);
    }
  });

  it("keep K–2 sentences to ten words", () => {
    for (const c of YOUNG)
      for (const text of strings(c))
        for (const sentence of text.split(/(?<=[.?!])\s+/)) {
          const words = sentence.split(/\s+/).filter((w) => /[\p{L}\d]/u.test(w));
          expect(words.length, `${c.id}: “${sentence}”`).toBeLessThanOrEqual(10);
        }
  });

  it("never ask the read-aloud voice for a lone letter or word part in K–2 English", () => {
    // The voice says letter names: "c, a, t" comes out "see, ay, tee", and "op" comes out "O.P.".
    // A sound is named by a keyword instead ("the first sound in sock"), or heard in a whole word.
    const lone = /(?<![\p{L}'’-])(?!(?:a|A|I)(?![\p{L}'’-]))\p{L}(?![\p{L}'’-])/u;
    const part = /(?<![\p{L}'’-])(?:op|ig|ug|ap|ag|ot|og|ip|ub|ud|ab|ib|ob|un|et|eg)(?![\p{L}'’-])/iu;
    for (const c of YOUNG.filter((x) => x.locale === "en"))
      for (const text of strings(c)) {
        expect(lone.test(text), `${c.id}: “${text}”`).toBe(false);
        expect(part.test(text), `${c.id}: “${text}”`).toBe(false);
      }
  });

  it("say clasifica for a sort in Spanish (ordena means unscramble)", () => {
    for (const c of COURSES.filter((x) => x.locale === "es"))
      for (const l of c.lessons)
        for (const s of l.scenes) if (s.kind === "interactive" && s.widget.kind === "sorter") expect(`${s.title} ${s.prompt}`, `${c.id}/${l.id}/${s.id}`).not.toMatch(/\bordena/i);
  });

  it("link practice to real skills and to lessons of the course", () => {
    const maps: [CatalogueEntry, Record<string, string[]>][] = [
      [shortWords, shortWordsPractice],
      [rhymesSyllables, rhymesSyllablesPractice],
      [partsOfSpeech, partsOfSpeechPractice],
      [figurative, figurativePractice],
      [factOpinion, factOpinionPractice],
    ];
    for (const [c, map] of maps) {
      const lessons = c.lessons.map((l) => l.id);
      for (const [lesson, skills] of Object.entries(map)) {
        expect(lessons, `${c.id}: ${lesson}`).toContain(lesson);
        for (const id of skills) expect(getSkill(id), `${c.id}/${lesson}: ${id}`).toBeDefined();
      }
    }
    // The Spanish twins re-export the English map, so their lessons must be the same lessons.
    for (const [es, en] of [
      [rhymesSyllablesEs, rhymesSyllables],
      [partsOfSpeechEs, partsOfSpeech],
      [figurativeEs, figurative],
    ])
      expect(es.lessons.map((l) => l.id)).toEqual(en.lessons.map((l) => l.id));
  });

  it("are not offered for a request that only shares a word every reading course uses", () => {
    // At 1464378 each of these was answered with a K–1 course ("A ready-made course already covers this").
    // The course builder asks readyMadeMatch; matchEntry is the older word match, checked the same way.
    const generic: [string, Grade, Locale][] = [
      ["reading comprehension", "4", "en"],
      ["vocabulary words", "3", "en"],
      ["sight words", "K", "en"],
      ["spelling words", "1", "en"],
      ["help with reading", "2", "en"],
      ["ortografía y palabras", "2", "es"],
      ["leer palabras", "1", "es"],
    ];
    for (const [goal, grade, locale] of generic) {
      expect(IDS.has(readyMadeMatch(goal, "english", grade, locale)?.id ?? ""), goal).toBe(false);
      expect(IDS.has(matchEntry(goal, grade, locale)?.id ?? ""), goal).toBe(false);
    }
    // What each course is about still finds it in the course builder.
    const asked: [string, Grade, Locale, string][] = [
      ["phonics", "1", "en", "english-short-words"],
      ["help my kid read short words", "1", "en", "english-short-words"],
      ["rhyming words", "K", "en", "english-rhymes-syllables"],
      ["rimas y sílabas", "K", "es", "english-rhymes-syllables-es"],
      ["nouns and verbs", "2", "en", "english-parts-of-speech"],
      ["sustantivos y verbos", "2", "es", "english-parts-of-speech-es"],
      ["similes and metaphors", "4", "en", "english-figurative"],
      ["fact and opinion", "5", "en", "english-fact-opinion"],
    ];
    for (const [goal, grade, locale, id] of asked) expect(readyMadeMatch(goal, "english", grade, locale)?.id, goal).toBe(id);
  });
});
