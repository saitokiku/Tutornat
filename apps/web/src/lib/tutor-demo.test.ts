// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { Book, Definition, Poem, WikiSummary } from "@/knowledge";
import { sameNumbers, sameProblem } from "@/components/tutor/similar";
import { makeItem, SKILLS } from "@/practice/skills";
import type { Item } from "@/practice/types";
import type { BoardCard } from "./tutor";
import {
  aboutIn,
  askOf,
  dateIn,
  demoAnswer,
  demoOpening,
  demoPhoto,
  lessonFor,
  lookupTopic,
  openTalk,
  problemSkill,
  skillTitled,
  topicOf,
  type DemoContext,
  type DemoFetchers,
  type DemoState,
} from "./tutor-demo";

const FALLACY: WikiSummary = {
  title: "Fallacy",
  extract: "A fallacy is the use of invalid or otherwise faulty reasoning in the construction of an argument.",
  url: "https://en.wikipedia.org/wiki/Fallacy",
  lang: "en",
  license: "CC BY-SA 4.0",
};

const FALACIA: WikiSummary = { title: "Falacia", extract: "Una falacia es un argumento que parece válido, pero no lo es.", url: "https://es.wikipedia.org/wiki/Falacia", lang: "es", license: "CC BY-SA 4.0" };

function fakes(over: Partial<DemoFetchers> = {}) {
  const f = {
    wiki: vi.fn(async (topic: string, lang: string): Promise<WikiSummary | null> => (/fallac|falacia/.test(topic) ? (lang === "es" ? FALACIA : FALLACY) : null)),
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

/** The answer to a problem, as it would be written in a reply. */
function answersOf(item: Item): string[] {
  const a = item.answer;
  if (a.kind === "number") return [String(a.value)];
  if (a.kind === "fraction") return [`${a.n}/${a.d}`];
  if (a.kind === "choice") return [item.choices?.[a.index]?.label ?? ""];
  if (a.kind === "text") return a.accept;
  if (a.kind === "expr") return [a.expr];
  return [];
}
/** True when `text` shows `answer`: a number on its own, or a written answer as whole words. */
function shows(text: string, answer: string): boolean {
  const esc = answer.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
  if (/^-?\d+(\.\d+)?(\/\d+)?$/.test(answer)) return new RegExp(`(^|[^\\d/.])${esc}($|[^\\d/])`).test(text);
  return answer.trim().length >= 5 && new RegExp(`\\b${esc}\\b`, "i").test(text);
}

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
    expect(skillTitled("¿Cuál es más?")).toBe("m.compare.10"); // a title that is a question, tapped as a chip
    expect(skillTitled("Which is more?")).toBe("m.compare.10");
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

  it("looks up only a question about something or a few words naming it, never chatter or anything personal", () => {
    expect(lookupTopic("what is a logical fallacy")).toBe("logical fallacy");
    expect(lookupTopic("¿Qué es la fotosíntesis?")).toBe("fotosíntesis");
    expect(lookupTopic("the American Civil War")).toBe("american civil war");
    expect(lookupTopic("dinosaurs")).toBe("dinosaurs");
    expect(lookupTopic("how do I add fractions")).toBe("add fractions");
    expect(lookupTopic("I like my dog")).toBeNull();
    expect(lookupTopic("my teacher Mrs. Lopez gave us a lot of homework today")).toBeNull();
    expect(lookupTopic("what is my name")).toBeNull();
    expect(lookupTopic("who is your favorite")).toBeNull();
    expect(lookupTopic("¿cuál es tu nombre?")).toBeNull();
    expect(askOf("I like my dog", false)).toEqual({ kind: "topic" });
  });

  it("asking for help or for the answer, and an empty “What does … mean?”, are not topics", () => {
    for (const text of ["help", "Help me please", "what do i do", "just tell me the answer", "what's the answer?", "ayúdame", "¿qué hago?", "dime la respuesta", "idk"]) expect(askOf(text, false), text).toEqual({ kind: "hint" });
    expect(askOf("What does  mean?", false)).toEqual({ kind: "which" });
    expect(askOf("¿Qué significa ?", false)).toEqual({ kind: "which" });
    expect(askOf("the answer is 12", false).kind).toBe("check");
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
    expect(r.text).toMatch(/^Esto dice Wikipedia sobre Falacia\./);
    expect(r.cards[0]).toMatchObject({ type: "fact", lang: "es", url: "https://es.wikipedia.org/wiki/Falacia" });
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

  it("a sentence that isn't a topic is never searched; help and an empty gap get a way forward", async () => {
    const f = fakes();
    const chatter = await demoAnswer("I like my dog", ctx(), fresh(), f);
    expect(chatter.text).toBe("I'm not sure what to look up. Ask about a topic, like “what is a volcano?”, type the problem you're stuck on, or ask me to find a book.");
    expect(chatter.cards).toEqual([]);
    const help = await demoAnswer("help", ctx(), fresh(), f);
    expect(help.text).toMatch(/^Type the problem you're on/);
    const answer = await demoAnswer("just tell me the answer", ctx(), fresh(), f);
    expect(answer.text).toMatch(/^Type the problem you're on/);
    const gap = await demoAnswer("What does  mean?", ctx(), fresh(), f);
    expect(gap.text).toBe("Which word? Type it in the box, like: What does denominator mean?");
    expect(f.wiki).not.toHaveBeenCalled();
    expect(f.define).not.toHaveBeenCalled();
    // A sentence about schoolwork still finds the practice that fits, without a search.
    const homework = await demoAnswer("my long division homework is so hard", ctx({ grade: "5" }), fresh(), f);
    expect(homework.cards.find((c) => c.type === "practice")).toEqual({ type: "practice", skillId: "m.div.long" });
    expect(homework.text).toMatch(/^That sounds like /);
    expect(f.wiki).not.toHaveBeenCalled();
  });

  it("shows Wikipedia's answer only when it is about the topic and fit for a child", async () => {
    const offTopic = await demoAnswer("what is a sloth", ctx(), fresh(), fakes({ wiki: async () => ({ ...FALLACY, title: "Georgia Ku", extract: "Georgia Ku is a singer." }) }));
    expect(offTopic.cards.some((c) => c.type === "fact")).toBe(false);
    expect(offTopic.text).not.toMatch(/Wikipedia says/);
    const unfit = await demoAnswer("what is a red light district", ctx(), fresh(), fakes({ wiki: async () => ({ ...FALLACY, title: "Red-light district", extract: "A red-light district is an area with many brothels." }) }));
    expect(unfit.cards.some((c) => c.type === "fact")).toBe(false);
    const fit = await demoAnswer("what are dinosaurs", ctx(), fresh(), fakes({ wiki: async () => ({ ...FALLACY, title: "Dinosaur", extract: "Dinosaurs are a diverse group of reptiles." }) }));
    expect(fit.cards[0]).toMatchObject({ type: "fact", title: "Dinosaur" });
  });

  it("an example on the learner's own typed problem never has their numbers, however often they ask", async () => {
    const typed = "2 + 3";
    let hits = 0;
    for (let seed = 1; seed <= 120; seed++) {
      const k = ctx({ grade: "K", seed: () => seed });
      const first = await demoAnswer(typed, k, fresh(), fakes());
      const again = await demoAnswer("Show me an example", { ...k, seed: () => seed * 31 + 7 }, first.state, fakes());
      const deeper = await demoAnswer("Explain it a different way", { ...k, seed: () => seed * 17 + 3 }, { ...again.state, shown: [] }, fakes());
      for (const r of [first, again, deeper])
        for (const card of r.cards)
          if (card.type === "worked") {
            hits++;
            expect(sameNumbers(card.item, typed), `seed ${seed}: ${card.item.say}`).toBe(false);
          }
    }
    expect(hits).toBeGreaterThan(200);
  });

  it("a lesson only written in the other language says which language it is in", () => {
    const card = lessonFor("ethos", "8", "es");
    expect(card).toMatchObject({ type: "lesson", lang: "en" });
    expect(lessonFor("logical fallacy", "8", "en")).toMatchObject({ lang: "en" });
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
    expect(o.text.split("\n")[0]).toBe("I'm the demo tutor: I answer from real sources and our practice, without AI.");
    expect(o.text).toContain(item.hints[0]);
    expect(o.state).toMatchObject({ hintsGiven: 1, skillId: "m.frac.addlike" });
    expect(demoOpening(ctx({ grade: "K" })).text.split("\n")[0]).toBe("I'm the demo tutor.");
  });

  it("continues the ladder past hints already opened on the problem", () => {
    expect(demoOpening({ ...c, hintsSeen: 2 }).text).toContain(item.hints[2]);
    expect(demoOpening({ ...c, hintsSeen: 2 }).state.hintsGiven).toBe(3);
    const all = demoOpening({ ...c, hintsSeen: item.hints.length });
    expect(all.text.split("\n")[1]).toBe("What have you tried so far?");
    expect(all.state.hintsGiven).toBe(item.hints.length);
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

  it("won't give the answer before a try; explains differently with a worked one, then the next hints", async () => {
    const s = demoOpening(c).state;
    expect((await demoAnswer("just tell me the answer", c, s, fakes())).text).toMatch(/one try first/);
    // The problem's own picture is already on screen beside it: never sent again as "a different way".
    const withVisual = makeItem("m.frac.unit", 1, 3, "en");
    expect(withVisual.visual).toBeDefined();
    const cv = ctx({ item: withVisual, grade: "3" });
    let state = demoOpening(cv).state; // the opening gave hint 1
    const said: string[] = [];
    for (let i = 0; i < 4; i++) {
      const r = await demoAnswer("Explain it a different way", cv, state, fakes());
      said.push(r.cards[0]?.type ?? r.text);
      state = r.state;
    }
    const TRY = "Give it one try first, even a guess. Then I'll show you how.";
    expect(said).toEqual(["worked", ...withVisual.hints.slice(1), TRY, TRY, TRY].slice(0, 4));
    expect(said).not.toContain("visual");

    // After a real try, the first worked step, then the problem's own "Show me how".
    const tried = { ...state, tries: 1 };
    const step = await demoAnswer("Explain it a different way", cv, tried, fakes());
    expect(step.text).toBe(withVisual.steps[0]);
    expect((await demoAnswer("Explain it a different way", cv, step.state, fakes())).text).toMatch(/Show me how/);
  });

  it("before a try, “why”, “how do I start” and a second “different way” never show a worked step (5/6 + 4/6 = 9/6)", async () => {
    // m.frac.addlike level 2 addition: step 1 is the whole sum.
    const sum = Array.from({ length: 80 }, (_, i) => makeItem("m.frac.addlike", 2, i + 1, "en")).find((x) => x.steps.length > 1 && x.prompt.some((p) => p === " + "))!;
    expect(sum).toBeDefined();
    const cs = ctx({ item: sum, grade: "4" });
    let state = demoOpening(cs).state;
    for (const ask of ["Explain it a different way", "Explain it a different way", "why?", "how do I start", "Explain the first step", "explain"]) {
      const r = await demoAnswer(ask, cs, state, fakes());
      expect(r.text, ask).not.toContain(sum.steps[0]);
      expect(sum.steps.some((s) => r.text.includes(s)), ask).toBe(false);
      state = r.state;
    }
  });

  it("before a try, no reply beside any problem on the map shows a worked step or the answer", async () => {
    const asks = ["Explain the first step", "why", "how do I start", "Explain it a different way", "Explain it a different way", "Explain it a different way", "just tell me the answer", "Give me a hint", "Give me a hint", "Give me a hint"];
    for (const skill of SKILLS) {
      for (let level = 1; level <= skill.levels; level++) {
        for (const seed of [1, 2, 3]) {
          const mine = makeItem(skill.id, level, seed, "en");
          const cs = ctx({ item: mine, grade: skill.grade, seed: () => seed + 100 });
          let state = demoOpening(cs).state;
          for (const ask of asks) {
            const r = await demoAnswer(ask, cs, state, fakes());
            const where = `${skill.id} L${level} seed ${seed}: ${ask}`;
            for (const card of r.cards) if (card.type === "worked") expect(sameProblem(card.item, mine), where).toBe(false);
            state = r.state;
            // The problem's own vetted hint ladder is the one thing it may say (its top rung can be a
            // partial step, like "8 + 2 = 10" for 8 + 3); everything else is checked.
            if (mine.hints.includes(r.text)) continue;
            expect(mine.steps.some((s) => r.text.includes(s)), `${where} → ${r.text}`).toBe(false);
            for (const a of answersOf(mine)) expect(shows(r.text, a), `${where} → ${r.text}`).toBe(false);
          }
        }
      }
    }
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
    // A pre-reader isn't asked to type.
    expect(demoPhoto(ctx({ grade: "K" }), fresh()).text).toBe("I can't read photos here. Ask a grown-up to type the problem for you.");
  });
});

describe("opening an open conversation", () => {
  it("names a young learner's choices out loud, in the order the chips show them", () => {
    expect(openTalk("en", "K", ["Count to 10", "Letter sounds"])).toBe("What do you want to learn about? Count to 10, Letter sounds, or a poem? Tap one.");
    expect(openTalk("es", "1", ["Contar hasta 10", "Sonidos de las letras"])).toBe("¿Sobre qué quieres aprender? ¿Contar hasta 10, Sonidos de las letras o un poema? Toca uno.");
    expect(openTalk("en", "K")).toBe("What do you want to learn about? Tap one.");
    expect(openTalk("en", "6", ["Ratios"])).toBe("What would you like to learn or work on?");
    expect(demoOpening(ctx({ grade: "K", choices: ["Count to 10"] })).text).toBe("I'm the demo tutor.\nWhat do you want to learn about? Count to 10 or a poem? Tap one.");
  });
});
