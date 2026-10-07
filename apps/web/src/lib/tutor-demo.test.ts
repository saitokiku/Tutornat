// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { Book, Definition, Poem, WikiSummary } from "@/knowledge";
import { sameProblem } from "@/components/tutor/similar";
import { makeItem } from "@/practice/skills";
import type { BoardCard } from "./tutor";
import { aboutIn, askOf, dateIn, demoAnswer, demoOpening, demoPhoto, lessonFor, problemSkill, skillTitled, topicOf, type DemoContext, type DemoFetchers, type DemoState } from "./tutor-demo";

const FALLACY: WikiSummary = {
  title: "Fallacy",
  extract: "A fallacy is the use of invalid or otherwise faulty reasoning in the construction of an argument.",
  url: "https://en.wikipedia.org/wiki/Fallacy",
  lang: "en",
  license: "CC BY-SA 4.0",
};

function fakes(over: Partial<DemoFetchers> = {}) {
  const f = {
    wiki: vi.fn(async (topic: string): Promise<WikiSummary | null> => (/fallac|falacia/.test(topic) ? FALLACY : null)),
    define: vi.fn(async (word: string): Promise<Definition[]> => (word === "denominator" ? [{ word: "denominator", partOfSpeech: "noun", text: "The number below the line in a fraction." }] : [])),
    books: vi.fn(async (): Promise<Book[]> => [{ title: "Dinosaurs Before Dark", author: "Mary Pope Osborne", year: 1992, url: "https://openlibrary.org/works/OL1W", source: "Open Library", kind: "borrow" }]),
    poems: vi.fn(async (): Promise<Poem[]> => [{ title: "Hope is the thing with feathers", author: "Emily Dickinson", lines: ["Hope is the thing with feathers", "That perches in the soul"], url: "https://poetrydb.org/title/Hope" }]),
    shortPoems: vi.fn(async (): Promise<Poem[]> => []),
    ...over,
  };
  return f;
}

const ctx = (over: Partial<DemoContext> = {}): DemoContext => ({ locale: "en", grade: "8", today: "2026-10-07", seed: () => 4242, ...over });
const fresh = (): DemoState => ({ hintsGiven: 0, tries: 0, shown: [] });
const types = (cards: BoardCard[]) => cards.map((c) => c.type);

describe("reading the learner's ask", () => {
  it("finds the topic inside a question", () => {
    expect(topicOf("What is a logical fallacy?")).toBe("logical fallacy");
    expect(topicOf("what's photosynthesis")).toBe("photosynthesis");
    expect(topicOf("Tell me about volcanoes")).toBe("volcanoes");
    expect(topicOf("how does the water cycle work?")).toBe("water cycle");
    expect(topicOf("¿Qué es la fotosíntesis?")).toBe("fotosíntesis");
    expect(topicOf("Háblame de los volcanes")).toBe("volcanes");
    expect(topicOf("dinosaurs")).toBe("dinosaurs");
    expect(topicOf("how do you find the slope of a line")).toBe("find the slope of a line");
  });

  it("knows a skill by its own name, in either language", () => {
    expect(skillTitled("Spot the fallacy")).toBe("e.fallacies");
    expect(skillTitled("detectar falacias")).toBe("e.fallacies");
    expect(skillTitled("Contar hasta 10.")).toBe("m.count.10");
    expect(skillTitled("spot a fallacy")).toBeNull();
    expect(askOf("Count up to 10", false)).toEqual({ kind: "skill", skillId: "m.count.10" });
    expect(askOf("Count up to 10", true).kind).not.toBe("skill"); // beside a problem, words are about it
  });

  it("tells definitions, books, poems, dates, problems and topics apart", () => {
    expect(askOf("What does denominator mean?", false)).toEqual({ kind: "define", word: "denominator" });
    expect(askOf("¿Qué significa denominador?", false)).toEqual({ kind: "define", word: "denominador" });
    expect(askOf("Find me a book about dinosaurs", false)).toEqual({ kind: "book", topic: "dinosaurs" });
    expect(askOf("Búscame un libro sobre los volcanes", false)).toEqual({ kind: "book", topic: "volcanes" });
    expect(askOf("read me a poem by Emily Dickinson", false)).toEqual({ kind: "poem", author: "emily dickinson" });
    expect(askOf("I have a fractions test on Friday", false)).toEqual({ kind: "calendar" });
    expect(askOf("tengo examen de fracciones el viernes", false)).toEqual({ kind: "calendar" });
    expect(askOf("what is a test tube", false)).toEqual({ kind: "topic", topic: "test tube" });
    expect(askOf("3/4 + 1/6", false)).toEqual({ kind: "problem", skillId: "m.frac.addunlike" });
    expect(askOf("is it 7/12", false)).toMatchObject({ kind: "check" });
    expect(askOf("hello", false)).toEqual({ kind: "greet" });
    expect(askOf("what is a logical fallacy", false)).toEqual({ kind: "topic", topic: "logical fallacy" });
  });

  it("with a problem on screen, the quick asks mean help with it", () => {
    expect(askOf("Give me a hint", true).kind).toBe("hint");
    expect(askOf("Show a similar one", true).kind).toBe("similar");
    expect(askOf("Explain it a different way", true).kind).toBe("different");
    expect(askOf("Explain the first step", true).kind).toBe("step");
    expect(askOf("just tell me the answer", true).kind).toBe("answer");
  });

  it("knows a typed problem's skill from its shape, without solving it", () => {
    const cases: [string, string | null][] = [
      ["3/4 + 1/6", "m.frac.addunlike"],
      ["2/7 + 3/7", "m.frac.addlike"],
      ["2/3 x 3/5", "m.frac.mult"],
      ["what is 7 x 8", "m.mult.facts"],
      ["5 × 10", "m.mult.easy"],
      ["234 * 12", "m.mult.multi"],
      ["56 / 7", "m.div.facts"],
      ["845 ÷ 5", "m.div.long"],
      ["3 + 4", "m.add.10"],
      ["9 + 8", "m.add.20"],
      ["47 + 38", "m.add.2digit"],
      ["52 - 17", "m.sub.2digit"],
      ["-3 + 8", "m.int.addsub"],
      ["2.5 + 1.75", "m.dec.addsub"],
      ["2x + 3 = 11", "m.eq.twostep"],
      ["x + 5 = 12", "m.eq.onestep"],
      ["solve 3x - 4 = 2x + 6", "m.eq.multistep"],
      ["20% of 80", "m.percent"],
      ["(2 + 3) × 4", "m.order.ops"],
      ["what is 3/4", "m.frac.unit"],
      ["the bus leaves at 3:15", null],
      ["what is a fallacy", null],
    ];
    for (const [text, skill] of cases) expect(problemSkill(text), text).toBe(skill);
  });

  it("reads the day and the topic of a school date", () => {
    // 2026-10-07 is a Wednesday.
    expect(dateIn("test on Friday", "2026-10-07")).toBe("2026-10-09");
    expect(dateIn("quiz tomorrow", "2026-10-07")).toBe("2026-10-08");
    expect(dateIn("examen el lunes", "2026-10-07")).toBe("2026-10-12");
    expect(dateIn("project due 10/21", "2026-10-07")).toBe("2026-10-21");
    expect(dateIn("test on Wednesday", "2026-10-07")).toBe("2026-10-14");
    expect(dateIn("por la mañana", "2026-10-07")).toBeNull();
    expect(aboutIn("I have a fractions test on Friday")).toBe("fractions");
    expect(aboutIn("tengo examen de ciclo del agua el viernes")).toBe("ciclo del agua");
  });
});

describe("our own lessons as knowledge", () => {
  it("finds the lesson that covers a topic, with its key points", () => {
    const card = lessonFor("logical fallacy", "8", "en");
    expect(card).toMatchObject({ catalogueId: "english-rhetoric", lessonId: "misused-appeals" });
    expect(card!.points.length).toBeGreaterThan(0);
    expect(card!.points.join(" ")).toMatch(/False authority/);
  });

  it("does not pick a lesson on a generic word alone", () => {
    expect(lessonFor("prime number", "4", "en")).toBeNull();
    expect(lessonFor("photosynthesis", "4", "en")).toBeNull();
  });
});

describe("the demo tutor on a topic", () => {
  it("“what is a logical fallacy”: a cited extract, our lesson, the fallacies practice and sources", async () => {
    const f = fakes();
    const r = await demoAnswer("what is a logical fallacy", ctx(), fresh(), f);
    expect(f.wiki).toHaveBeenCalledWith("logical fallacy", "en");
    expect(r.text).toBe("Here is what Wikipedia says about Fallacy. Want to try a few? Every problem has hints.");
    expect(types(r.cards)).toEqual(["fact", "lesson", "practice", "resources"]);
    expect(r.cards[0]).toMatchObject({ type: "fact", url: "https://en.wikipedia.org/wiki/Fallacy" });
    expect(r.cards[2]).toEqual({ type: "practice", skillId: "e.fallacies" });
    expect(r.state.skillId).toBe("e.fallacies");
    expect(r.text).not.toMatch(/demo tutor/); // said once, in the opening
  });

  it("adds the dictionary sense of a two-word term, but never of a word only spelled like it", async () => {
    const f = fakes({
      define: vi.fn(async (word: string): Promise<Definition[]> =>
        word === "logical fallacy" ? [{ word: "logical fallacy", partOfSpeech: "noun", text: "An error in reasoning that makes an argument invalid." }] : [{ word: "denominator", partOfSpeech: "noun", text: "The number below the line." }],
      ),
    });
    const r = await demoAnswer("what is a logical fallacy", ctx(), fresh(), f);
    expect(types(r.cards)).toEqual(["fact", "definition", "lesson", "practice", "resources"]);
    expect(r.cards[1]).toMatchObject({ word: "logical fallacy", url: "https://en.wiktionary.org/wiki/logical_fallacy" });
    const typo = await demoAnswer("what does denominater mean", ctx(), fresh(), f);
    expect(typo.cards.some((c) => c.type === "definition")).toBe(false);
  });

  it("works in Spanish with the Spanish Wikipedia and no English dictionary", async () => {
    const f = fakes();
    const r = await demoAnswer("¿Qué es una falacia?", ctx({ locale: "es" }), fresh(), f);
    expect(f.wiki).toHaveBeenCalledWith("falacia", "es");
    expect(f.define).not.toHaveBeenCalled();
    expect(r.cards.find((c) => c.type === "practice")).toEqual({ type: "practice", skillId: "e.fallacies" });
    expect(r.text).toMatch(/^Esto dice Wikipedia sobre Fallacy\./);
  });

  it("adds the dictionary for a one-word topic and leads with practice for young learners", async () => {
    const f = fakes({ wiki: async () => null });
    const r = await demoAnswer("denominator", ctx({ grade: "1" }), fresh(), f);
    expect(f.define).toHaveBeenCalledWith("denominator");
    expect(r.cards.some((c) => c.type === "definition")).toBe(true);
    const k = await demoAnswer("what is a logical fallacy", ctx({ grade: "K" }), fresh(), fakes());
    expect(k.cards[0].type).toBe("practice");
  });

  it("says plainly when nothing was found, and survives a failing source", async () => {
    const r = await demoAnswer("zxqv", ctx(), fresh(), fakes({ wiki: async () => Promise.reject(new Error("offline")) }));
    expect(r.cards.filter((c) => c.type !== "resources")).toEqual([]);
    expect(r.text).toContain("I couldn't find zxqv");
  });

  it("then explains it a different way without repeating, and shows an example of the skill", async () => {
    const f = fakes();
    const first = await demoAnswer("what is a logical fallacy", ctx(), fresh(), f);
    const again = await demoAnswer("Explain it a different way", ctx(), first.state, f);
    expect(again.cards.map((c) => c.type)).toEqual(["worked"]); // the lesson was already shown
    const example = await demoAnswer("Show me an example", ctx(), first.state, f);
    expect(example.cards[0]).toMatchObject({ type: "worked", item: { skillId: "e.fallacies" } });
  });

  it("defines a word with its source, or falls back to Wikipedia", async () => {
    const r = await demoAnswer("What does denominator mean?", ctx(), fresh(), fakes());
    expect(r.cards[0]).toMatchObject({ type: "definition", word: "denominator", url: "https://en.wiktionary.org/wiki/denominator" });
    const w = await demoAnswer("what does fallacy mean", ctx(), fresh(), fakes({ define: async () => [] }));
    expect(w.cards[0]).toMatchObject({ type: "fact", title: "Fallacy" });
  });

  it("finds books and poems with their links", async () => {
    const b = await demoAnswer("find me a book about dinosaurs", ctx(), fresh(), fakes());
    expect(b.cards[0]).toMatchObject({ type: "books", topic: "dinosaurs", list: [{ title: "Dinosaurs Before Dark", url: "https://openlibrary.org/works/OL1W" }] });
    const p = await demoAnswer("read me a poem by Emily Dickinson", ctx(), fresh(), fakes());
    expect(p.cards[0]).toMatchObject({ type: "poem", author: "Emily Dickinson", url: "https://poetrydb.org/title/Hope" });
  });

  it("offers a school date for the calendar, with practice for it", async () => {
    const r = await demoAnswer("I have a fractions test on Friday", ctx({ grade: "4" }), fresh(), fakes());
    expect(r.cards[0]).toMatchObject({ type: "calendar", kind: "test", date: "2026-10-09", title: "Fractions test" });
    expect(r.cards[1]).toMatchObject({ type: "practice" });
    const noDate = await demoAnswer("I have a spelling quiz coming up", ctx(), fresh(), fakes());
    expect(noDate.cards[0]).toMatchObject({ type: "calendar", kind: "quiz", date: undefined });
    const es = await demoAnswer("tengo examen de fracciones el viernes", ctx({ locale: "es", grade: "4" }), fresh(), fakes());
    expect(es.cards[0]).toMatchObject({ title: "Examen de fracciones", date: "2026-10-09" });
  });

  it("a typed problem gets one like it worked out, never its own answer", async () => {
    const r = await demoAnswer("3/4 + 1/6", ctx({ grade: "5" }), fresh(), fakes());
    expect(r.text).toContain("Add and subtract fractions with unlike denominators");
    expect(r.cards[0]).toMatchObject({ type: "worked", item: { skillId: "m.frac.addunlike", seed: 4242 } });
    expect(JSON.stringify(r)).not.toContain("11/12");
    const check = await demoAnswer("is it 11/12", ctx(), r.state, fakes());
    expect(check.text).toContain("can't check");
    // Asked for a hint next, it points at the first step of the worked one, to do the same on theirs.
    const hint = await demoAnswer("Give me a hint", ctx({ grade: "5" }), r.state, fakes());
    expect(hint.text).toBe("Look at step 1 of the worked example on the board. Do that same step on yours.");
  });

  it("a skill chip goes straight to the skill: our lesson, one worked out, the practice — no Wikipedia", async () => {
    const f = fakes();
    const r = await demoAnswer("Spot the fallacy", ctx(), fresh(), f);
    expect(f.wiki).not.toHaveBeenCalled();
    expect(r.text).toBe("Spot the fallacy: here is one worked out step by step, and a short practice set with hints.");
    expect(types(r.cards).slice(0, 3)).toEqual(["lesson", "worked", "practice"]);
    expect(r.cards[2]).toEqual({ type: "practice", skillId: "e.fallacies" });
    expect(r.state).toMatchObject({ skillId: "e.fallacies" });

    // A kindergartner: practice first, said in a few short words.
    const k = await demoAnswer("Count up to 10", ctx({ grade: "K" }), fresh(), f);
    expect(k.cards[0]).toEqual({ type: "practice", skillId: "m.count.10" });
    expect(k.cards.some((c) => c.type === "worked")).toBe(true);
    expect(k.text).toBe("Let's do Count up to 10. Here is one done for you. Tap Start to try some.");
    const es = await demoAnswer("Contar hasta 10", ctx({ grade: "K", locale: "es" }), fresh(), f);
    expect(es.text).toMatch(/^Vamos con Contar hasta 10\./);
    expect(f.wiki).not.toHaveBeenCalled();
  });
});

describe("the demo tutor beside a problem", () => {
  const item = makeItem("m.frac.addlike", 1, 7, "en");
  const c = ctx({ item, grade: "4" });

  it("opens with the demo line once and the first vetted hint", () => {
    const o = demoOpening(c);
    expect(o.text.split("\n")[0]).toBe("I'm the demo tutor: I answer from real sources and checked practice, without AI.");
    expect(o.text).toContain(item.hints[0]);
    expect(o.state).toMatchObject({ hintsGiven: 1, skillId: "m.frac.addlike" });
    expect(demoOpening(ctx({ grade: "K" })).text.split("\n")[0]).toBe("I'm the demo tutor.");
  });

  it("walks the hint ladder, then stops", async () => {
    let s = demoOpening(c).state;
    for (let i = 1; i < item.hints.length; i++) {
      const r = await demoAnswer("Give me a hint", c, s, fakes());
      expect(r.text).toBe(item.hints[i]);
      s = r.state;
    }
    expect((await demoAnswer("hint please", c, s, fakes())).text).toMatch(/last hint/);
  });

  it("won't give the answer before a try; explains differently with a picture, a worked one, then the first step", async () => {
    const s = demoOpening(c).state;
    expect((await demoAnswer("just tell me the answer", c, s, fakes())).text).toMatch(/one try first/);
    const withVisual = makeItem("m.frac.unit", 1, 3, "en");
    const cv = ctx({ item: withVisual, grade: "3" });
    let state = demoOpening(cv).state;
    const kinds: string[] = [];
    for (let i = 0; i < 3; i++) {
      const r = await demoAnswer("Explain it a different way", cv, state, fakes());
      kinds.push(r.cards[0]?.type ?? (r.text === withVisual.steps[0] ? "step" : "text"));
      state = r.state;
    }
    expect(kinds).toEqual(withVisual.visual ? ["visual", "worked", "step"] : ["worked", "step", "text"]);
  });

  it("a similar one is never the learner's own problem, even when the seed would draw it", async () => {
    const mine = makeItem("m.count.10", 1, 1, "en");
    const collide = Array.from({ length: 200 }, (_, i) => i + 2).find((s) => sameProblem(makeItem("m.count.10", 1, s, "en"), mine))!;
    expect(collide).toBeDefined();
    const k = ctx({ item: mine, grade: "K", seed: () => collide });
    const r = await demoAnswer("Show a similar one", k, demoOpening(k).state, fakes());
    expect(r.cards[0].type).toBe("worked");
    expect(sameProblem((r.cards[0] as { item: typeof mine }).item, mine)).toBe(false);
  });

  it("never gives a one-step solution as “the first step” before a try", async () => {
    const one = Array.from({ length: 50 }, (_, i) => makeItem("m.add.5", 1, i + 1, "en")).find((x) => x.steps.length === 1)!;
    const k = ctx({ item: one, grade: "K" });
    const opened = demoOpening(k).state; // the opening gave hint 1
    const r = await demoAnswer("Explain the first step", k, opened, fakes());
    expect(r.text).not.toBe(one.steps[0]);
    expect(r.text).toBe(one.hints[1]);
    const after = await demoAnswer("Explain the first step", k, { ...opened, tries: 1 }, fakes());
    expect(after.text).toBe(one.steps[0]);
  });

  it("a photo in demo mode says it needs the AI tutor and asks for the problem typed", () => {
    expect(demoPhoto(c, fresh()).text).toBe("Reading a photo needs the AI tutor, which isn't connected here. Type the problem instead and I'll help with it.");
    expect(demoPhoto(ctx({ locale: "es" }), fresh()).text).toContain("Escribe el problema");
  });
});
