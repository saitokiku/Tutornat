import { describe, expect, it, vi } from "vitest";
import type { Book, Definition, WikiSummary } from "@/knowledge";
import { check } from "@/practice/answer";
import { makeItem } from "@/practice/skills";
import type { ItemBody } from "@/practice/types";
import { courseOrigin } from "./courses";
import {
  buildSourceCourse,
  citationGroups,
  closestLesson,
  paragraphs,
  plainPrompt,
  questionFrom,
  skillQuestions,
  SourceError,
  stem,
  topicOf,
  type Fetchers,
  type SourceStep,
} from "./source-course";
import type { Course, QuizScene, SlideScene } from "./types";

// Fixtures written for the test (not copied from Wikipedia): an article, a dictionary and a library.
const VOLCANO: WikiSummary = {
  title: "Volcano",
  extract:
    "A volcano is an opening in the crust of a planet, such as Earth, where hot melted rock, ash and gases escape from below the surface. Melted rock below the ground is called magma. When magma reaches the surface it is called lava. As lava cools it freezes into solid rock. Volcanoes can build mountains over many eruptions.",
  url: "https://en.wikipedia.org/wiki/Volcano",
  lang: "en",
  license: "CC BY-SA 4.0",
};
const DICTIONARY: Record<string, Definition[]> = {
  volcano: [{ word: "volcano", partOfSpeech: "noun", text: "A vent in the surface of a planet through which magma and gases come out." }],
  lava: [{ word: "lava", partOfSpeech: "noun", text: "Molten rock that has come out onto the surface." }],
  magma: [{ word: "magma", partOfSpeech: "noun", text: "Molten rock found below the surface of the Earth." }],
  eruption: [
    { word: "eruption", partOfSpeech: "", text: "plural of nothing" },
    { word: "eruption", partOfSpeech: "noun", text: "The act of throwing out lava, ash and gases." },
  ],
  melted: [{ word: "melted", partOfSpeech: "verb", text: "simple past of melt" }],
};
const BOOKS: Book[] = [
  { title: "Volcanoes", author: "Seymour Simon", year: 1988, url: "https://openlibrary.org/works/OL1W", source: "Open Library", kind: "borrow" },
  { title: "Hill of Fire", author: "Thomas P. Lewis", url: "https://openlibrary.org/works/OL2W", source: "Open Library", kind: "borrow" },
];

function fake(over: Partial<Fetchers> = {}) {
  const calls: string[] = [];
  const f: Fetchers = {
    wiki: async (topic) => (calls.push(`wiki:${topic}`), /volcan/i.test(topic) ? VOLCANO : null),
    related: async (w) => (calls.push(`related:${w}`), ["volcanic", "eruption", "lava", "magma", "crater", "vent"]),
    define: async (w) => (calls.push(`define:${w}`), DICTIONARY[w] ?? []),
    books: async (q) => (calls.push(`books:${q}`), BOOKS),
    ...over,
  };
  return { f, calls };
}

/** Builds and keeps what each part reported, as the course builder screen does. */
async function build(goal: string, f: Fetchers, opts: Parameters<typeof buildSourceCourse>[4] = {}, grade: Course["grade"] = "4", locale: Course["locale"] = "en") {
  const steps: SourceStep[] = [];
  const course = await buildSourceCourse(goal, grade, locale, f, { subject: "science", ...opts, onStep: (s) => (steps.push(s), opts.onStep?.(s)) });
  return { course, steps };
}

const titles = (c: Course) => c.lessons.map((l) => l.title);
const scrub = (c: Course) => ({ ...c, id: "", createdAt: 0, updatedAt: 0, lessons: c.lessons.map((l) => ({ ...l, id: "" })) });

describe("buildSourceCourse: article found", () => {
  it("builds an overview, key words, a ready-made lesson, practice and find-out-more, all credited", async () => {
    const { f } = fake();
    const { course, steps } = await build("I want to learn about volcanoes", f, { profileId: "p1" });
    expect(course).toMatchObject({ title: "Volcanoes", subject: "science", grade: "4", locale: "en", profileId: "p1", origin: "generated", template: false, status: "outlining" });
    expect(course.ai).toBeUndefined();
    expect(courseOrigin(course)).toBe("sources");

    const [overview, words, borrowed, practice, more] = course.lessons;
    expect(course.lessons).toHaveLength(5);

    // The overview quotes the article as written, in paragraphs, then credits it.
    expect(overview.title).toBe("Start here: Volcano");
    const slide = overview.scenes[0] as SlideScene;
    const text = slide.blocks.map((b) => (b.type === "text" ? b.text : "")).join(" ");
    expect(text).toContain("A volcano is an opening in the crust of a planet");
    expect(text).toContain("As lava cools it freezes into solid rock.");
    expect(slide.blocks.at(-1)).toEqual({ type: "text", text: "From Wikipedia's article “Volcano”, shared under CC BY-SA 4.0. The link is on the course page." });

    // Key words: real meanings only (no "plural of", no "simple past"), then a check built from them.
    expect(words.title).toBe("Words to know");
    const list = (words.scenes[0] as SlideScene).blocks[0];
    expect(list).toEqual({
      type: "points",
      items: [
        "volcano (noun): A vent in the surface of a planet through which magma and gases come out.",
        "eruption (noun): The act of throwing out lava, ash and gases.",
        "lava (noun): Molten rock that has come out onto the surface.",
        "magma (noun): Molten rock found below the surface of the Earth.",
      ],
    });
    const quiz = words.scenes[1] as QuizScene;
    expect(quiz.kind).toBe("quiz");
    for (const q of quiz.questions) {
      const word = q.choices[q.answer];
      expect(q.prompt).toContain(list.type === "points" ? list.items.find((i) => i.startsWith(`${word} `))!.split(": ")[1] : "");
      expect(new Set(q.choices).size).toBe(q.choices.length);
    }

    // The closest catalogue lesson, unchanged except for where it is from.
    expect(["Solids, liquids and gases", "Melting and freezing"]).toContain(borrowed.title);
    expect(borrowed.summary).toContain("From the ready-made course “Solid, liquid, gas”, written by people.");
    expect(borrowed.scenes.length).toBeGreaterThan(2);

    // Practice from the skill map, checked by index.
    expect(practice.title).toBe("Practice: Plate boundaries");
    const pq = practice.scenes[0] as QuizScene;
    // Plate boundaries is a hand-written bank no teacher has approved yet: the quiz says so.
    expect(pq.title).toBe("Draft questions from the skill map");
    expect(pq.questions.length).toBeGreaterThanOrEqual(2);
    for (const q of pq.questions) expect(q.answer).toBeGreaterThanOrEqual(0);

    expect(more.title).toBe("Find out more");
    expect((more.scenes[0] as SlideScene).blocks[0]).toEqual({ type: "points", items: ["Volcanoes, Seymour Simon (1988)", "Hill of Fire, Thomas P. Lewis"] });
    expect(more.scenes.at(-1)!.kind).toBe("project");

    const g = citationGroups(course.citations!);
    expect(g.article).toEqual({ title: "Volcano", url: "https://en.wikipedia.org/wiki/Volcano", source: "Wikipedia" });
    expect(g.words.map((c) => c.url)).toEqual([
      "https://en.wiktionary.org/wiki/volcano",
      "https://en.wiktionary.org/wiki/eruption",
      "https://en.wiktionary.org/wiki/lava",
      "https://en.wiktionary.org/wiki/magma",
    ]);
    expect(g.books.map((c) => c.url)).toEqual(["https://openlibrary.org/works/OL1W", "https://openlibrary.org/works/OL2W"]);
    for (const c of course.citations!) expect(c.url).toMatch(/^https:\/\//);

    expect(steps.map((s) => s.part)).toEqual(["article", "terms", "lesson", "practice", "books"]);
    expect(steps[0]).toEqual({ part: "article", title: "Volcano", failed: undefined });
    expect(steps[1]).toMatchObject({ part: "terms", count: 4 });
  });

  it("questions from an approved skill are not called drafts", async () => {
    const { course } = await build("volcanoes", fake().f, { reviewed: () => true });
    expect((course.lessons[3].scenes[0] as QuizScene).title).toBe("Questions from the skill map");
  });

  it("is deterministic: the same request builds the same course", async () => {
    const a = await build("volcanoes", fake().f);
    const b = await build("volcanoes", fake().f);
    expect(scrub(a.course)).toEqual(scrub(b.course));
  });

  it("reports each part as it is found", async () => {
    const seen: SourceStep[] = [];
    await build("volcanoes", fake().f, { onStep: (s) => seen.push(s) });
    expect(seen.map((s) => s.part)).toEqual(["article", "terms", "lesson", "practice", "books"]);
  });

  it("never sends the learner's name: it is taken out of every query", async () => {
    const { f, calls } = fake();
    await build("Ada wants to learn volcanoes", f, { avoid: ["Ada"] });
    expect(calls.join(" ")).not.toMatch(/ada/i);
    expect(topicOf("teach me about volcanoes for Ada's class", ["Ada"])).toBe("Volcanoes for class");
    // A request that is only the name asks nobody anything.
    const quiet = fake();
    await build("Ada", quiet.f, { avoid: ["Ada"] });
    expect(quiet.calls).toEqual([]);
  });

  it("one lesson puts our own parts into a single sitting", async () => {
    const { course } = await build("volcanoes", fake().f, { length: "lesson" });
    expect(course.lessons).toHaveLength(1);
    const kinds = course.lessons[0].scenes.map((s) => s.kind);
    expect(kinds[0]).toBe("slide");
    expect(kinds).toContain("quiz");
    expect(new Set(course.lessons[0].scenes.map((s) => s.id)).size).toBe(kinds.length);
  });
});

describe("buildSourceCourse: no article", () => {
  it("leaves the overview out and says so, and still builds from the rest", async () => {
    const { f } = fake({ wiki: async () => null });
    const { course, steps } = await build("volcanoes", f);
    expect(steps[0]).toEqual({ part: "article", title: undefined, failed: undefined });
    expect(titles(course)).not.toContain("Start here: Volcano");
    expect(titles(course)[0]).toBe("Words to know");
    expect(citationGroups(course.citations!).article).toBeUndefined();
    // No article: the Wikipedia step of the project is not offered.
    const project = course.lessons.at(-1)!.scenes.at(-1)!;
    expect(project.kind === "project" && project.steps.join(" ")).not.toContain("Wikipedia");
  });

  it("an unknown topic with nothing anywhere builds no lessons rather than invented ones", async () => {
    const { f } = fake({ wiki: async () => null, related: async () => [], define: async () => [], books: async () => [] });
    const { course, steps } = await build("zzqx blorp", f, { subject: "other" });
    expect(steps.find((s) => s.part === "practice")).toMatchObject({ skill: undefined, questions: 0 });
    expect(steps.find((s) => s.part === "lesson")).toMatchObject({ title: undefined });
    // Only the find-out-more lesson could come from the checked site list; nothing pretends to be about "zzqx".
    for (const l of course.lessons) expect(l.title).not.toMatch(/zzqx/i);
  });
});

describe("buildSourceCourse: no terms", () => {
  it("skips the word list when the dictionary has nothing", async () => {
    const { f } = fake({ related: async () => [], define: async () => [] });
    const { course, steps } = await build("volcanoes", f);
    expect(steps[1]).toMatchObject({ part: "terms", count: 0, failed: undefined });
    expect(titles(course)).not.toContain("Words to know");
    expect(titles(course)[0]).toBe("Start here: Volcano");
    expect(citationGroups(course.citations!).words).toEqual([]);
  });

  it("asks no dictionary for a Spanish course, and says why", async () => {
    const { f, calls } = fake({ wiki: async () => ({ ...VOLCANO, title: "Volcán", lang: "es", url: "https://es.wikipedia.org/wiki/Volc%C3%A1n" }) });
    const { course, steps } = await build("volcanes", f, {}, "4", "es");
    expect(calls.some((c) => c.startsWith("define:") || c.startsWith("related:"))).toBe(false);
    expect(steps[1]).toMatchObject({ part: "terms", count: 0, englishOnly: true });
    expect(course.lessons[0].title).toBe("Empieza aquí: Volcán");
  });
});

describe("buildSourceCourse: offline", () => {
  it("reports offline, asks nothing else online, and keeps what is on the device", async () => {
    const offline = vi.fn(async () => {
      throw new SourceError("offline");
    });
    const { course, steps } = await build("volcanoes", { wiki: offline, related: offline, define: offline, books: offline });
    expect(offline).toHaveBeenCalledTimes(1);
    expect(steps[0]).toMatchObject({ part: "article", failed: "offline" });
    expect(steps[1]).toMatchObject({ part: "terms", failed: "offline" });
    expect(steps[4]).toMatchObject({ part: "books", failed: "offline" });
    expect(titles(course).some((t) => t.startsWith("Practice: "))).toBe(true);
    expect(citationGroups(course.citations!).article).toBeUndefined();
  });

  it("a source that fails is named; the others still count", async () => {
    const { f } = fake({ books: async () => Promise.reject(new SourceError("unavailable")) });
    const { steps } = await build("volcanoes", f);
    expect(steps[4]).toEqual({ part: "books", count: 0, failed: "unavailable" });
    expect(steps[0]).toMatchObject({ title: "Volcano" });
  });
});

describe("links", () => {
  it("keeps only plain web links from a source", async () => {
    const { f } = fake({
      wiki: async () => ({ ...VOLCANO, url: "javascript:alert(1)" }),
      books: async () => [...BOOKS, { title: "Bad", url: "data:text/html,x", source: "Open Library", kind: "borrow" }],
    });
    const { course } = await build("volcanoes", f);
    for (const c of course.citations!) expect(c.url).toMatch(/^https:\/\//);
    expect(citationGroups(course.citations!).article?.url).toBe("https://en.wikipedia.org/wiki/Volcano");
    expect(citationGroups(course.citations!).books.map((b) => b.title)).not.toContain("Bad");
  });

  it("an article with no text counts as no article", async () => {
    const { steps } = await build("volcanoes", fake({ wiki: async () => ({ ...VOLCANO, extract: " " }) }).f);
    expect(steps[0]).toMatchObject({ title: undefined });
  });
});

describe("pieces", () => {
  it("stems so different forms of a word meet", () => {
    expect(["melted", "melting", "melts"].map(stem)).toEqual(["melt", "melt", "melt"]);
    expect(["freezes", "freezing", "freeze"].map(stem)).toEqual(["freez", "freez", "freez"]);
    expect(stem("volcanoes")).toBe(stem("volcano"));
    expect(stem("glass")).toBe("glass");
  });

  it("splits an extract into short paragraphs and never ends mid-sentence", () => {
    expect(paragraphs("One. Two. Three.")).toEqual(["One. Two.", "Three."]);
    const cut = `${"A long sentence about rocks and the ground under them. ".repeat(4)}And then it stops mid`;
    expect(paragraphs(cut).join(" ").endsWith("under them.")).toBe(true);
    expect(paragraphs("Short and cut")).toEqual(["Short and cut…"]);
  });

  it("finds the closest ready-made lesson only when it is close", () => {
    expect(closestLesson({ goal: "fractions on a number line" }, "math", "3", "en")?.lesson.title).toBe("Fractions on a number line");
    expect(closestLesson({ goal: "knitting socks" }, "other", "4", "en")).toBeNull();
    expect(closestLesson({ goal: "phases of the moon" }, "science", "5", "en")?.entry.id).toBe("science-moon");
  });

  it("turns practice prompts into one line of text", () => {
    expect(plainPrompt(["What is ", { frac: [3, 4] }, " of 8? ", { blank: true }])).toBe("What is 3/4 of 8? ___");
    expect(plainPrompt([{ sup: ["x", "2"] }, " + ", { sup: ["y", "n"] }])).toBe("x² + y^n");
  });

  const base: ItemBody = { prompt: ["7 − 3 = ", { blank: true }], say: "", input: "keypad", answer: { kind: "number", value: 4 }, hints: ["Count back."], steps: ["7 − 3 = 4."], seconds: 10 };

  it("typed answers become choices only from authored wrong values the checker rejects", () => {
    expect(questionFrom(base, 1)).toBeNull(); // no wrong values to offer
    const q = questionFrom({ ...base, wrong: [{ value: "10", why: "added" }, { value: "3", why: "off-by-one" }, { value: "4", why: "not-wrong" }] }, 1)!;
    expect(q.choices.sort()).toEqual(["10", "3", "4"]);
    expect(q.choices[q.answer]).toBe("4");
    expect(questionFrom({ ...base, visual: { kind: "dots", groups: [7] }, wrong: [{ value: "10", why: "a" }, { value: "3", why: "b" }] }, 1)).toBeNull();
  });

  it("skill-map questions are the generator's own, and the key is the generator's key", () => {
    const qs = skillQuestions("s.plate.tectonics", "en");
    expect(qs.length).toBe(3);
    expect(new Set(qs.map((q) => q.prompt)).size).toBe(3);
    // Independent route: regenerate each item by seed and check the chosen index with the answer checker.
    for (const q of qs) {
      let found = false;
      for (let seed = 1; seed <= 60 && !found; seed++) {
        const item = makeItem("s.plate.tectonics", 1, seed, "en");
        if (plainPrompt(item.prompt) !== q.prompt) continue;
        found = true;
        expect(check(item.answer, q.answer).correct).toBe(true);
        expect(q.choices).toEqual(item.choices!.map((c) => c.label));
      }
      expect(found).toBe(true);
    }
    expect(skillQuestions("no.such.skill", "en")).toEqual([]);
  });
});
