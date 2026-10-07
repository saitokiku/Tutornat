import { describe, expect, it, vi } from "vitest";
import type { Book, Definition, WikiSummary } from "@/knowledge";
import { check } from "@/practice/answer";
import { makeItem } from "@/practice/skills";
import type { ItemBody } from "@/practice/types";
import { courseOrigin } from "./courses";
import {
  bookQuery,
  buildSourceCourse,
  citationGroups,
  closestLesson,
  keepCitations,
  namesOnAccount,
  paragraphs,
  partsIn,
  plainPrompt,
  practiceSkillsFor,
  questionFrom,
  relatedLessons,
  skillQuestions,
  SourceError,
  sourcesUsed,
  stem,
  topicOf,
  type Fetchers,
  type SourceStep,
} from "./source-course";
import type { Course, Lesson, QuizScene, SlideScene } from "./types";

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
const step = <P extends SourceStep["part"]>(steps: SourceStep[], part: P) => steps.find((s) => s.part === part) as Extract<SourceStep, { part: P }>;
const offlineFetchers = () => {
  const offline = vi.fn(async () => {
    throw new SourceError("offline");
  });
  return { offline, f: { wiki: offline, related: offline, define: offline, books: offline } as Fetchers };
};

describe("buildSourceCourse: article found", () => {
  it("builds an overview, key words, a ready-made lesson, practice and find-out-more, all credited", async () => {
    const { f, calls } = fake();
    const { course, steps } = await build("I want to learn about volcanoes", f, { profileId: "p1" });
    expect(course).toMatchObject({ title: "Volcanoes", subject: "science", grade: "4", locale: "en", profileId: "p1", origin: "generated", template: false, status: "outlining" });
    expect(course.ai).toBeUndefined();
    expect(courseOrigin(course)).toBe("sources");

    const [overview, words, borrowed, practice, more] = course.lessons;
    expect(course.lessons).toHaveLength(5);

    // The overview quotes the article as written, in paragraphs, then credits it with its link.
    expect(overview.title).toBe("Start here: Volcano");
    const slide = overview.scenes[0] as SlideScene;
    const text = slide.blocks.map((b) => (b.type === "text" ? b.text : "")).join(" ");
    expect(text).toContain("A volcano is an opening in the crust of a planet");
    expect(text).toContain("As lava cools it freezes into solid rock.");
    expect(slide.blocks.at(-1)).toEqual({
      type: "text",
      text: "From Wikipedia's article “Volcano” (en.wikipedia.org/wiki/Volcano), shared under CC BY-SA 4.0. The link is on the course page.",
    });

    // Key words: the topic, then related words the article uses; real meanings only (no "plural of").
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
    expect(calls).not.toContain("define:crater"); // related, but not in the article
    // A definition that says another choice ("magma", "lava") would give it away: only lava and magma are asked.
    const quiz = words.scenes[1] as QuizScene;
    expect(quiz.questions.map((q) => q.choices[q.answer])).toEqual(["lava", "magma"]);
    for (const q of quiz.questions) expect(new Set(q.choices).size).toBe(q.choices.length);

    // The lesson people bridged to volcanoes, with the line that says why it is here.
    expect(borrowed.title).toBe("Melting and freezing");
    expect(borrowed.summary).toMatch(/^Lava is rock that got so hot it melted\..*From the ready-made course “Solid, liquid, gas”, written by people\.$/);
    expect(borrowed.scenes[0]).toMatchObject({ kind: "slide", title: "Why this lesson is here" });
    expect(borrowed.scenes.length).toBeGreaterThan(3);

    // Practice from the skill map at the learner's grade (Rocks, grade 4), not Plate boundaries (grade 7).
    expect(practice.title).toBe("Practice: Rocks, fossils and erosion");
    const pq = practice.scenes[0] as QuizScene;
    expect(pq.title).toBe("Draft questions from the skill map");
    expect(pq.questions.length).toBeGreaterThanOrEqual(2);

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
    expect(steps[0]).toEqual({ part: "article", title: "Volcano", failed: undefined, withheld: undefined });
    expect(step(steps, "terms")).toMatchObject({ count: 4 });
    expect(step(steps, "lesson")).toEqual({ part: "lesson", titles: ["Melting and freezing"], leftOut: undefined });
    expect(step(steps, "practice")).toEqual({ part: "practice", skills: ["Rocks, fossils and erosion"], questions: pq.questions.length });
  });

  it("asks Open Library for children's books only, and in Spanish for a Spanish course", async () => {
    const en = fake();
    await build("volcanoes", en.f);
    expect(en.calls).toContain("books:Volcano subject_key:juvenile_literature");
    const es = fake({ wiki: async () => ({ ...VOLCANO, title: "Volcán", lang: "es" }) });
    await build("volcanes", es.f, {}, "4", "es");
    expect(es.calls).toContain("books:Volcán subject_key:juvenile_literature language:spa");
    expect(bookQuery("Star Wars: A (New) Hope", "en")).toBe("Star Wars A New Hope subject_key:juvenile_literature");
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

  it("never sends a name on the account: each is taken out of every query", async () => {
    const { f, calls } = fake();
    await build("Ada wants to learn volcanoes", f, { avoid: ["Ada"] });
    expect(calls.join(" ")).not.toMatch(/ada/i);
    // A sibling, the grown-up and a curly possessive are names too.
    expect(topicOf("teach Ada and Ben about volcanoes for Maria’s class", ["Ada", "Ben", "Maria Lopez", "Maria", "Lopez"])).toBe("Teach and about volcanoes for class");
    expect(topicOf("teach me about volcanoes for Ada's class", ["Ada"])).toBe("Volcanoes for class");
    // Names come out before the topic is cut to length, so no piece of one is left behind.
    const long = `${"volcanoes and earthquakes and mountains ".repeat(2)}for Alexandria`;
    expect(topicOf(long, ["Alexandria"])).not.toMatch(/alex/i);
    // A request that is only the name asks nobody anything.
    const quiet = fake();
    await build("Ada", quiet.f, { avoid: ["Ada"] });
    expect(quiet.calls).toEqual([]);
  });

  it("names on the account: every learner, the grown-up and the parts of their name", () => {
    const s = {
      profiles: [
        { id: "a", accountId: "acc", nickname: "Ada" },
        { id: "b", accountId: "acc", nickname: "Ana María" },
        { id: "c", accountId: "other", nickname: "Zed" },
      ],
      accounts: [{ id: "acc", displayName: "Maria Lopez" }],
    } as unknown as Parameters<typeof namesOnAccount>[0];
    expect(namesOnAccount(s, "acc").sort()).toEqual(["Ada", "Ana", "Ana María", "Lopez", "Maria", "Maria Lopez", "María"].sort());
  });

  it("a request over several lines is about the line that says the most, not when the test is", () => {
    expect(topicOf("Science test on Friday\nvolcanoes, earthquakes, plate tectonics")).toBe("Volcanoes, earthquakes, plate tectonics");
    expect(topicOf("Quiz tomorrow!\n\nhow do magnets work?")).toBe("Magnets work");
  });
});

describe("buildSourceCourse: the learner's grade", () => {
  it("K–2: the article's first sentence, words to hear without a reading quiz, and no questions from far above their grade", async () => {
    const { course, steps } = await build("volcanoes", fake().f, {}, "K");
    const overview = course.lessons[0].scenes[0] as SlideScene;
    expect(overview.blocks.map((b) => (b.type === "text" ? b.text : ""))).toEqual([
      "A volcano is an opening in the crust of a planet, such as Earth, where hot melted rock, ash and gases escape from below the surface.",
      "From Wikipedia's article “Volcano” (en.wikipedia.org/wiki/Volcano), shared under CC BY-SA 4.0. The link is on the course page.",
    ]);
    expect(course.lessons[0].summary).toBe("The first sentence of Wikipedia's article “Volcano”, as written.");
    const words = course.lessons.find((l) => l.title === "Words to know")!;
    expect(words.scenes.map((s) => s.kind)).toEqual(["slide"]);
    expect((words.scenes[0] as SlideScene).blocks[0].type === "points" && (words.scenes[0] as SlideScene).blocks[0]).toMatchObject({ items: expect.any(Array) });
    expect(((words.scenes[0] as SlideScene).blocks[0] as { items: string[] }).items).toHaveLength(3);
    // Rocks is grade 4 and Plate boundaries grade 7: neither is a kindergartner's quiz. The closest is named.
    expect(titles(course).some((t) => t.startsWith("Practice: "))).toBe(false);
    expect(step(steps, "practice")).toEqual({ part: "practice", skills: ["Rocks, fossils and erosion"], questions: 0, grade: "4" });
    // Melting and freezing (grade 2) is near enough to borrow.
    expect(titles(course)).toContain("Melting and freezing");
  });

  it("practice: nearest grade first, a skill far from the learner kept but marked", () => {
    expect(practiceSkillsFor("Volcanoes", "Volcano", "science", "4")).toEqual([
      { skillId: "s.rocks", fits: true },
      { skillId: "s.plate.tectonics", fits: false },
    ]);
    expect(practiceSkillsFor("Volcanoes", "Volcano", "science", "7")[0]).toEqual({ skillId: "s.plate.tectonics", fits: true });
    expect(practiceSkillsFor("Volcanoes", "Volcano", "science", "K").every((m) => !m.fits)).toBe(true);
    // A math course doesn't borrow science skills from the topic table.
    expect(practiceSkillsFor("speed", undefined, "math", "6").map((m) => m.skillId)).not.toContain("s.speed");
  });

  it("a seventh grader gets Plate boundaries questions", async () => {
    const { course } = await build("volcanoes", fake().f, {}, "7");
    expect(titles(course)).toContain("Practice: Plate boundaries");
  });
});

describe("buildSourceCourse: lengths", () => {
  it("one lesson: our own parts in one sitting, the borrowed lesson left out and said", async () => {
    const { course, steps } = await build("volcanoes", fake().f, { length: "lesson" });
    expect(course.lessons).toHaveLength(1);
    const [only] = course.lessons;
    expect(only.title).toBe("Volcanoes");
    expect(only.summary).toBe("One sitting built from real sources: Start here: Volcano, Words to know, Practice: Rocks, fossils and erosion, and Find out more.");
    const kinds = only.scenes.map((s) => s.kind);
    expect(kinds[0]).toBe("slide");
    expect(kinds).toContain("quiz");
    expect(new Set(only.scenes.map((s) => s.id)).size).toBe(kinds.length);
    expect(only.scenes.some((s) => s.title === "Why this lesson is here")).toBe(false);
    expect(step(steps, "lesson")).toEqual({ part: "lesson", titles: ["Melting and freezing"], leftOut: true });
    expect([...partsIn(course.lessons)].sort()).toEqual(["more", "overview", "practice", "words"]);
  });

  it("one lesson for K–2 stops at ten minutes and says what was left out", async () => {
    const { course } = await build("volcanoes", fake().f, { length: "lesson" }, "2");
    const [only] = course.lessons;
    expect(only.minutes).toBeLessThanOrEqual(10);
    expect(only.summary).toMatch(/Left out to keep it to one short sitting: Find out more\.$/);
    // Books were left out with the lesson that lists them, so they are not cited.
    expect(citationGroups(course.citations!).books).toEqual([]);
  });

  it("one lesson with only a ready-made lesson to offer is that lesson, not nothing", async () => {
    const { f } = offlineFetchers();
    const { course } = await build("volcanoes", f, { length: "lesson" }, "K");
    expect(titles(course)).toEqual(["Melting and freezing"]);
  });

  it("a full course takes a second ready-made lesson when there is one", async () => {
    const { course, steps } = await build("melting ice", fake({ wiki: async () => null }).f, { length: "full" }, "2");
    expect(step(steps, "lesson").titles).toEqual(["Melting and freezing", "Solids, liquids and gases"]);
    expect(titles(course)).toEqual(expect.arrayContaining(["Melting and freezing", "Solids, liquids and gases"]));
  });
});

describe("buildSourceCourse: no article", () => {
  it("leaves the overview out and says so, and still builds from the rest", async () => {
    const { f, calls } = fake({ wiki: async () => null });
    const { course, steps } = await build("volcanoes", f);
    expect(steps[0]).toEqual({ part: "article", title: undefined, failed: undefined, withheld: undefined });
    expect(titles(course)).not.toContain("Start here: Volcano");
    // Without an article only the topic word is looked up (as typed, then without its plural).
    expect(calls.filter((c) => c.startsWith("define:"))).toEqual(["define:volcanoes", "define:volcano"]);
    expect(calls.some((c) => c.startsWith("related:"))).toBe(false);
    expect(titles(course)[0]).toBe("Words to know");
    expect(citationGroups(course.citations!).article).toBeUndefined();
    // No article: the project points to the books, not to Wikipedia.
    const project = course.lessons.at(-1)!.scenes.at(-1)!;
    expect(project.kind === "project" && project.steps.join(" ")).not.toContain("Wikipedia");
  });

  it("an unknown topic with nothing anywhere builds nothing rather than something invented", async () => {
    const { f } = fake({ wiki: async () => null, related: async () => [], define: async () => [], books: async () => [] });
    const { course, steps } = await build("zzqx blorp", f, { subject: "other" });
    expect(step(steps, "practice")).toEqual({ part: "practice", skills: [], questions: 0 });
    expect(step(steps, "lesson")).toEqual({ part: "lesson", titles: [], leftOut: undefined });
    expect(course.lessons).toEqual([]);
    expect(course.citations).toEqual([]);
  });

  it("an article with only a link to give still points the project at it", async () => {
    const { course } = await build("knitting socks", fake({ wiki: async () => ({ ...VOLCANO, title: "Knitting", extract: "Knitting is a way of making cloth from yarn with needles.", url: "https://en.wikipedia.org/wiki/Knitting" }), related: async () => [], define: async () => [], books: async () => [] }).f, { subject: "other" });
    const more = course.lessons.at(-1)!;
    expect(more.summary).toBe("Where to read more, and something to find out at home.");
    const project = more.scenes.at(-1)!;
    expect(project.kind === "project" && project.steps).toEqual([
      "Open this course's page together. The link to Wikipedia's article is there.",
      "Read more of Wikipedia's article “Knitting” together.",
      "Tell someone one new thing you learned, or draw it.",
    ]);
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
    expect((course.lessons[0].scenes[0] as SlideScene).blocks.at(-1)).toMatchObject({ text: expect.stringContaining("(es.wikipedia.org/wiki/Volcán)") });
  });

  it("leaves out names, words for people from a place, words not for children, and definitions too long to show whole", async () => {
    const donkey: WikiSummary = {
      ...VOLCANO,
      title: "Donkey",
      extract: "The donkey or ass is a farm animal related to the horse. Donkeys came from African wild asses. A donkey can carry heavy loads for a long way.",
      url: "https://en.wikipedia.org/wiki/Donkey",
    };
    const dictionary: Record<string, Definition[]> = {
      donkey: [{ word: "donkey", partOfSpeech: "noun", text: "A domestic animal similar to a horse, often used to carry loads." }],
      ass: [{ word: "ass", partOfSpeech: "noun", text: "A donkey, a farm animal." }],
      african: [{ word: "african", partOfSpeech: "noun", text: "A native of Africa." }],
      horse: [{ word: "horse", partOfSpeech: "noun", text: `A large animal ${"with a long mane and a tail that ".repeat(8)}people ride.` }],
      load: [{ word: "load", partOfSpeech: "noun", text: "Something a donkey or another animal carries." }],
    };
    const { f, calls } = fake({ wiki: async () => donkey, related: async () => ["ass", "african", "horse", "load", "mule"], define: async (w) => dictionary[w] ?? [] });
    const { course } = await build("donkeys", f, {}, "1");
    expect(calls).not.toContain("define:ass");
    expect(calls).not.toContain("define:african"); // a name in the article: "African"
    const items = ((course.lessons[1].scenes[0] as SlideScene).blocks[0] as { items: string[] }).items;
    expect(items).toEqual(["donkey (noun): A domestic animal similar to a horse, often used to carry loads.", "load (noun): Something a donkey or another animal carries."]);
  });

  it("a disambiguated article gets the topic word's sense that matches it, or no head word", async () => {
    const mercury: WikiSummary = { ...VOLCANO, title: "Mercury (planet)", extract: "Mercury is the planet closest to the Sun. It is small and rocky, and a year there lasts 88 days.", url: "https://en.wikipedia.org/wiki/Mercury_(planet)" };
    const metal: Definition = { word: "mercury", partOfSpeech: "noun", text: "A silver metal that is liquid at room temperature, used in old thermometers." };
    const planet: Definition = { word: "mercury", partOfSpeech: "noun", text: "The planet closest to the Sun." };
    const withPlanet = await build("mercury", fake({ wiki: async () => mercury, related: async () => [], define: async () => [metal, planet] }).f, {}, "5");
    expect(((withPlanet.course.lessons[1].scenes[0] as SlideScene).blocks[0] as { items: string[] }).items).toEqual(["mercury (noun): The planet closest to the Sun."]);
    const onlyMetal = await build("mercury", fake({ wiki: async () => mercury, related: async () => [], define: async () => [metal] }).f, {}, "5");
    expect(step(onlyMetal.steps, "terms").count).toBe(0);
  });
});

describe("buildSourceCourse: offline", () => {
  it("reports offline, asks nothing else online, and keeps what is on the device", async () => {
    const { offline, f } = offlineFetchers();
    const { course, steps } = await build("volcanoes", f);
    expect(offline).toHaveBeenCalledTimes(1);
    expect(steps[0]).toMatchObject({ part: "article", failed: "offline" });
    expect(steps[1]).toMatchObject({ part: "terms", failed: "offline" });
    expect(steps[4]).toMatchObject({ part: "books", failed: "offline" });
    expect(titles(course)).toEqual(expect.arrayContaining(["Melting and freezing", "Practice: Rocks, fossils and erosion"]));
    expect(citationGroups(course.citations!).article).toBeUndefined();
  });

  it("a source that fails is named; the others still count", async () => {
    const { f } = fake({ books: async () => Promise.reject(new SourceError("unavailable")) });
    const { steps } = await build("volcanoes", f);
    expect(steps[4]).toEqual({ part: "books", count: 0, failed: "unavailable" });
    expect(steps[0]).toMatchObject({ title: "Volcano" });
  });
});

describe("buildSourceCourse: the safety screen", () => {
  it("an off-limits or crisis request asks no source anything and builds nothing", async () => {
    for (const goal of ["drugs", "I want to kill myself", "my uncle hits me"]) {
      const { f, calls } = fake();
      const { course, steps } = await build(goal, f, {}, "3");
      expect(calls).toEqual([]);
      expect(steps).toEqual([]);
      expect(course.lessons).toEqual([]);
    }
  });

  it("third-party text that fails the screen is left out: an article, a definition, a book", async () => {
    const { f } = fake({
      wiki: async () => ({ ...VOLCANO, extract: `${VOLCANO.extract} Some people sell drugs near it.` }),
      books: async () => [...BOOKS, { title: "Drugs and volcanoes", url: "https://openlibrary.org/works/OL3W", source: "Open Library", kind: "borrow" }],
    });
    const { course, steps } = await build("volcanoes", f);
    expect(steps[0]).toMatchObject({ part: "article", title: "Volcano", withheld: true });
    expect(titles(course)).not.toContain("Start here: Volcano");
    expect(citationGroups(course.citations!).article).toBeUndefined();
    expect(citationGroups(course.citations!).books.map((b) => b.title)).not.toContain("Drugs and volcanoes");
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

describe("after the family edits the outline", () => {
  it("citations follow the lessons that are left, and so does the line that says what was used", async () => {
    const { course } = await build("volcanoes", fake().f);
    const all = course.citations!;
    expect(sourcesUsed(course.lessons, all)).toEqual(["wikipedia", "dictionary", "catalogue", "skillMap", "openLibrary", "sites"].filter((u) => u !== "sites" || citationGroups(all).sites.length));
    const without = (...parts: string[]) => course.lessons.filter((l: Lesson) => !parts.some((p) => l.id.startsWith(`src-${p}-`)));
    // No word list: no dictionary links.
    expect(citationGroups(keepCitations(all, without("words"))).words).toEqual([]);
    // No overview but find-out-more still points to the article: Wikipedia stays.
    expect(citationGroups(keepCitations(all, without("overview"))).article).toBeDefined();
    // Neither: Wikipedia goes, and with it the label's claim.
    const bare = keepCitations(all, without("overview", "more"));
    expect(citationGroups(bare).article).toBeUndefined();
    expect(citationGroups(bare).books).toEqual([]);
    expect(sourcesUsed(without("overview", "more", "words"), all)).toEqual(["catalogue", "skillMap"]);
    // A lesson the family added has no part: it cites nothing.
    expect(keepCitations(all, [{ id: "x", title: "My own", summary: "", minutes: 5, scenes: [] }])).toEqual([]);
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

  it("finds the closest ready-made lesson only when it is really about the request", () => {
    expect(closestLesson({ goal: "fractions on a number line" }, "math", "3", "en")?.lesson.title).toBe("Fractions on a number line");
    expect(closestLesson({ goal: "knitting socks" }, "other", "4", "en")).toBeNull();
    expect(closestLesson({ goal: "phases of the moon" }, "science", "5", "en")?.entry.id).toBe("science-moon");
    expect(closestLesson({ goal: "the main idea of a paragraph" }, "english", "4", "en")?.entry.id).toBe("english-main-idea");
    // Written for the test with the words that once matched a reading lesson: a head, fish, "appeared".
    const shark = {
      goal: "Sharks",
      title: "Shark",
      extract: "Sharks are fish with a skeleton made of cartilage and five to seven gill slits on the sides of the head. Sharks first appeared in the oceans long ago. The heading of each section of this article names a kind of shark.",
      terms: ["shark", "fish"],
    };
    expect(closestLesson(shark, "science", "1", "en")).toBeNull();
    // A bridged topic finds the lesson that teaches the idea underneath, in the learner's language only.
    expect(closestLesson({ goal: "volcanoes" }, "science", "4", "en")).toMatchObject({ lesson: { id: "melt-freeze" }, topic: "volcano" });
    expect(closestLesson({ goal: "volcanes" }, "science", "4", "es")).toBeNull();
    // Too far from the learner's grade: Solid, liquid, gas is grade 2.
    expect(closestLesson({ goal: "volcanoes" }, "science", "6", "en")).toBeNull();
    expect(relatedLessons({ goal: "melting ice" }, "science", "2", "en", 2).map((r) => r.lesson.id)).toEqual(["melt-freeze", "three-states"]);
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
    for (const skillId of ["s.plate.tectonics", "s.rocks"]) {
      const qs = skillQuestions(skillId, "en");
      expect(qs.length).toBe(3);
      expect(new Set(qs.map((q) => q.prompt)).size).toBe(3);
      // Independent route: regenerate each item by seed and check the chosen index with the answer checker.
      for (const q of qs) {
        let found = false;
        for (let seed = 1; seed <= 60 && !found; seed++) {
          const item = makeItem(skillId, 1, seed, "en");
          if (plainPrompt(item.prompt) !== q.prompt) continue;
          found = true;
          expect(check(item.answer, q.answer).correct).toBe(true);
          expect(q.choices).toEqual(item.choices!.map((c) => c.label));
        }
        expect(found).toBe(true);
      }
    }
    expect(skillQuestions("no.such.skill", "en")).toEqual([]);
  });
});
