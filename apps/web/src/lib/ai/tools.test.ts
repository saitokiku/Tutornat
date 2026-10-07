// @vitest-environment node
import type { LanguageModelV4StreamPart } from "@ai-sdk/provider";
import { readUIMessageStream, simulateReadableStream, type UIMessage, type UIMessageChunk } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cardsOf, repliesIn, skillsIn } from "@/components/tutor/cards";
import { sameNumbers, sameProblem } from "@/components/tutor/similar";
import { clearKnowCache } from "@/knowledge/fetch";
import type { TutorContext } from "./context";
import { makeItem } from "@/practice/skills";
import { sayFrac } from "@/practice/text";
import { systemPrompt } from "./prompts";
import { hintsGiven, knowledgeTools, tutorTools } from "./tools";
import { tutorTurn } from "./tutor";

// Each knowledge tool, called by a mock model, runs against stubbed sources and ends up as a board card
// with its source link. Nothing about the learner goes out with the query.

const ctx: TutorContext = { locale: "en", grade: "8", surface: "talk" };
const usage = { inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 1, text: 1, reasoning: undefined } };
const user = (text: string): UIMessage => ({ id: "u1", role: "user", parts: [{ type: "text", text }] });

/** A model that calls one tool, then says one line about it. Records every prompt it was given. */
function toolModel(toolName: string, input: object) {
  const prompts: unknown[] = [];
  const model = new MockLanguageModelV4({
    doStream: async (opts) => {
      prompts.push(opts.prompt);
      const chunks: LanguageModelV4StreamPart[] =
        prompts.length === 1
          ? [{ type: "tool-call" as const, toolCallId: "c1", toolName, input: JSON.stringify(input) }, { type: "finish" as const, finishReason: { unified: "tool-calls" as const, raw: undefined }, usage }]
          : [
              { type: "text-start" as const, id: "t" },
              { type: "text-delta" as const, id: "t", delta: "The card on your board has the link." },
              { type: "text-end" as const, id: "t" },
              { type: "finish" as const, finishReason: { unified: "stop" as const, raw: undefined }, usage },
            ];
      return { stream: simulateReadableStream({ chunks }) };
    },
  });
  return { model, prompts };
}

/** The assistant message the browser would build from the streamed response. */
async function reply(res: Response): Promise<UIMessage> {
  const chunks = (await res.text())
    .split("\n")
    .filter((l) => l.startsWith("data: ") && l !== "data: [DONE]")
    .map((l) => JSON.parse(l.slice(6)) as UIMessageChunk);
  const stream = new ReadableStream<UIMessageChunk>({
    start(c) {
      chunks.forEach((x) => c.enqueue(x));
      c.close();
    },
  });
  let last: UIMessage | undefined;
  for await (const m of readUIMessageStream({ stream })) last = m;
  return last!;
}

const answers = new Map<RegExp, unknown>();
function stubFetch() {
  const calls: string[] = [];
  vi.stubGlobal("fetch", async (url: string) => {
    calls.push(url);
    for (const [re, body] of answers) if (re.test(url)) return new Response(JSON.stringify(body), { status: 200 });
    return new Response("nope", { status: 404 });
  });
  return calls;
}
beforeEach(() => {
  // The learner's today and the server's agree (only Date is faked; streams keep real timers).
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 7, 12));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  answers.clear();
  clearKnowCache();
});

const TODAY = "2026-10-07"; // a Wednesday

async function run(toolName: string, input: object, c: TutorContext = ctx, said = "what is a logical fallacy") {
  const { model, prompts } = toolModel(toolName, input);
  const m = await reply(await tutorTurn({ messages: [user(said)], context: c, today: TODAY }, model));
  return { m, cards: cardsOf(m, c.locale, TODAY), prompts };
}

describe("knowledge tools, through the tutor turn, onto the board", () => {
  it("look_up: a Wikipedia extract in the learner's language, cited", async () => {
    answers.set(/es\.wikipedia\.org\/w\/api\.php.*list=search/, { query: { search: [{ title: "Falacia", snippet: "" }] } });
    answers.set(/es\.wikipedia\.org\/api\/rest_v1\/page\/summary\/Falacia/, { type: "standard", title: "Falacia", extract: "Una falacia es un argumento que parece válido, pero no lo es.", content_urls: { desktop: { page: "https://es.wikipedia.org/wiki/Falacia" } } });
    const calls = stubFetch();
    const { cards, prompts } = await run("look_up", { topic: "falacia" }, { ...ctx, locale: "es" });
    expect(cards).toEqual([{ type: "fact", title: "Falacia", extract: "Una falacia es un argumento que parece válido, pero no lo es.", url: "https://es.wikipedia.org/wiki/Falacia", lang: "es" }]);
    expect(JSON.stringify(prompts[1])).toContain("parece válido"); // the model teaches from the fetched text
    expect(calls.every((u) => !/grade|talk|locale/.test(u.replace(/srqiprofile=\w+/, "")))).toBe(true); // only the query goes out
  });

  it("define_word: dictionary senses with the Wiktionary link", async () => {
    answers.set(/api\.datamuse\.com\/words\?sp=denominator&md=d/, [{ word: "denominator", defs: ["n\tThe number below the line in a fraction."] }]);
    stubFetch();
    const { cards } = await run("define_word", { word: "denominator" });
    expect(cards).toEqual([{ type: "definition", word: "denominator", senses: [{ partOfSpeech: "noun", text: "The number below the line in a fraction." }], url: "https://en.wiktionary.org/wiki/denominator" }]);
  });

  it("define_word: a word the dictionary only thinks is spelled like it is not an answer", async () => {
    answers.set(/api\.datamuse\.com\/words\?sp=denominater&md=d/, [{ word: "denominator", defs: ["n\tThe number below the line in a fraction."] }]);
    stubFetch();
    const { cards, prompts } = await run("define_word", { word: "denominater" });
    expect(cards).toEqual([]);
    expect(JSON.stringify(prompts[1])).toMatch(/Nothing found/);
  });

  it("find_book: books from Open Library, audiobooks from LibriVox", async () => {
    answers.set(/openlibrary\.org\/search\.json/, { docs: [{ key: "/works/OL483391W", title: "Charlotte's Web", author_name: ["E. B. White"], first_publish_year: 1952 }] });
    answers.set(/librivox\.org/, { books: [{ id: "1", title: "The Secret Garden", url_librivox: "https://librivox.org/the-secret-garden", authors: [{ first_name: "Frances Hodgson", last_name: "Burnett" }] }] });
    stubFetch();
    const read = await run("find_book", { query: "spiders" });
    expect(read.cards).toEqual([{ type: "books", topic: "spiders", list: [{ title: "Charlotte's Web", author: "E. B. White", year: 1952, url: "https://openlibrary.org/works/OL483391W", source: "Open Library", kind: "borrow" }] }]);
    const listen = await run("find_book", { query: "The Secret Garden", audio: true });
    expect(listen.cards[0]).toMatchObject({ type: "books", list: [{ title: "The Secret Garden", source: "LibriVox", kind: "audio" }] });
  });

  it("read_poem: the full public-domain text with its link", async () => {
    answers.set(/poetrydb\.org\/author\/Emily%20Dickinson/, [{ title: "Hope is the thing with feathers", author: "Emily Dickinson", lines: ["Hope is the thing with feathers", "That perches in the soul"] }]);
    stubFetch();
    const { cards } = await run("read_poem", { author: "Emily Dickinson" });
    expect(cards).toEqual([{ type: "poem", title: "Hope is the thing with feathers", author: "Emily Dickinson", lines: ["Hope is the thing with feathers", "That perches in the soul"], url: "https://poetrydb.org/title/Hope%20is%20the%20thing%20with%20feathers" }]);
  });

  it("standard_text: the standard's wording, for a code or the current problem's skill, with the official link", async () => {
    answers.set(/jurisdictions\//, { data: { standardSets: [{ id: "set4", title: "Grade 4", subject: "Mathematics", educationLevels: ["04"] }] } });
    answers.set(/standard_sets\/set4/, { data: { standards: { a: { statementNotation: "CCSS.Math.Content.4.NF.A.1", description: "Explain why a fraction a/b is equivalent to a fraction (n × a)/(n × b)." } } } });
    stubFetch();
    const byCode = await run("standard_text", { code: "4.NF.A.1" });
    expect(byCode.cards).toEqual([{ type: "standard", code: "4.NF.A.1", text: "Explain why a fraction a/b is equivalent to a fraction (n × a)/(n × b).", subject: "Mathematics", url: "https://www.thecorestandards.org/Math/Content/4/NF/A/1/" }]);
    const bySkill = await run("standard_text", {}, { ...ctx, grade: "4", surface: "practice", item: { skillId: "m.frac.equiv", level: 1, seed: 3 } });
    expect(bySkill.cards[0]).toMatchObject({ type: "standard", code: "4.NF.A.1" });
  });

  it("a source that fails becomes no card, and the model is told not to invent", async () => {
    stubFetch(); // everything 404s
    const { cards, prompts, m } = await run("look_up", { topic: "logical fallacy" });
    expect(cards).toEqual([]);
    expect(JSON.stringify(prompts[1])).toMatch(/do not make up/);
    expect(m.parts.some((p) => p.type === "text" && p.text.includes("card on your board"))).toBe(true);
  });

  it("a source's answer the safety screen turns away is not shown, and the model is told why", async () => {
    answers.set(/en\.wikipedia\.org\/w\/api\.php.*list=search/, { query: { search: [{ title: "Red-light district", snippet: "" }] } });
    answers.set(/en\.wikipedia\.org\/api\/rest_v1\/page\/summary\/Red-light/, { type: "standard", title: "Red-light district", extract: "A red-light district is an area with many brothels.", content_urls: { desktop: { page: "https://en.wikipedia.org/wiki/Red-light_district" } } });
    stubFetch();
    const { cards, prompts } = await run("look_up", { topic: "red light district" });
    expect(cards).toEqual([]);
    expect(JSON.stringify(prompts[1])).toMatch(/Nothing suitable to show/);
    expect(JSON.stringify(prompts[1])).not.toContain("brothels");
  });

  it("practice tools mark the skill the conversation turned to", async () => {
    stubFetch();
    const found = await run("find_skill", { query: "logical fallacy" });
    expect(skillsIn(found.m)[0]).toBe("e.fallacies");
    const offered = await run("start_practice", { skillId: "e.fallacies", reason: "Spot the flaw in an argument" });
    expect(offered.cards).toEqual([{ type: "practice", skillId: "e.fallacies", reason: "Spot the flaw in an argument" }]);
    expect(skillsIn(offered.m)).toEqual(["e.fallacies"]);
  });
});

describe("the hint ladder across turns", () => {
  it("each turn's next_hint continues where the conversation left off", async () => {
    const practice: TutorContext = { locale: "en", grade: "4", surface: "practice", item: { skillId: "m.frac.addlike", level: 1, seed: 7 }, tries: 1 };
    const item = makeItem("m.frac.addlike", 1, 7, "en");
    const first = await run("next_hint", {}, practice);
    const firstHint = first.m.parts.find((p) => p.type === "tool-next_hint") as { output?: { hint?: string } };
    expect(firstHint.output?.hint).toBe(item.hints[0]);

    // The browser sends the whole conversation back, tool results included.
    const { model, prompts } = toolModel("next_hint", {});
    const again = await reply(await tutorTurn({ messages: [user("hint please"), first.m, { id: "u2", role: "user", parts: [{ type: "text", text: "another hint" }] }], context: practice }, model));
    const second = again.parts.find((p) => p.type === "tool-next_hint") as { output?: { hint?: string } };
    expect(second.output?.hint).toBe(item.hints[1]);
    expect(hintsGiven([first.m, again])).toBe(2);
    expect(JSON.stringify(prompts[0])).not.toContain(JSON.stringify(item.answer)); // no key in what the model sees
  });

  it("starts past the hints the learner already opened in practice, and ignores a bad count", async () => {
    const practice: TutorContext = { locale: "en", grade: "4", surface: "practice", item: { skillId: "m.frac.addlike", level: 1, seed: 7 }, tries: 1 };
    const item = makeItem("m.frac.addlike", 1, 7, "en");
    const hintOf = async (hintsSeen: unknown) => {
      const { model } = toolModel("next_hint", {});
      const m = await reply(await tutorTurn({ messages: [user("hint please")], context: practice, hintsSeen }, model));
      return (m.parts.find((p) => p.type === "tool-next_hint") as { output?: { hint?: string } }).output?.hint;
    };
    expect(await hintOf(2)).toBe(item.hints[2]);
    expect(await hintOf("lots")).toBe(item.hints[0]);
    expect(await hintOf(-4)).toBe(item.hints[0]);
  });
});

describe("similar_problem", () => {
  it("never works out a problem the learner typed, whichever turn they typed it in", async () => {
    // "2 + 3" in Talk: m.add.5 draws those numbers about one time in ten without the guard.
    let checked = 0;
    for (let i = 0; i < 60; i++) {
      const { model } = toolModel("similar_problem", { skillId: "m.add.5" });
      const earlier: UIMessage = { id: "a0", role: "assistant", parts: [{ type: "text", text: "What did you get?" }] };
      const m = await reply(await tutorTurn({ messages: [user("2 + 3"), earlier, { id: "u2", role: "user", parts: [{ type: "text", text: "show me one like it" }] }], context: { ...ctx, grade: "K" }, today: TODAY }, model));
      const worked = cardsOf(m, "en", TODAY).find((c) => c.type === "worked");
      expect(worked, `run ${i}`).toBeDefined();
      if (worked?.type === "worked") {
        checked++;
        expect(sameNumbers(worked.item, "2 + 3"), `run ${i}: ${worked.item.say}`).toBe(false);
      }
    }
    expect(checked).toBe(60);
  });

  it("never works out the learner's own problem (small skills repeat about one draw in four)", async () => {
    const practice: TutorContext = { locale: "en", grade: "K", surface: "practice", item: { skillId: "m.count.10", level: 1, seed: 1 }, tries: 0 };
    const mine = makeItem("m.count.10", 1, 1, "en");
    const tools = tutorTools(practice);
    for (let i = 0; i < 60; i++) {
      const out = (await tools.similar_problem.execute!({}, { toolCallId: `s${i}`, messages: [] } as never)) as { skillId: string; level: number; seed: number };
      expect(sameProblem(makeItem(out.skillId, out.level, out.seed, "en"), mine)).toBe(false);
    }
  });
});

describe("knowledge tools directly", () => {
  const tools = knowledgeTools(ctx);
  const exec = <T,>(t: { execute?: (input: never, opts: never) => T }, input: unknown) => t.execute!(input as never, { toolCallId: "x", messages: [] } as never);

  it("refuse inputs that aren't a query and codes that aren't standards", async () => {
    const calls = stubFetch();
    expect(await exec(tools.look_up, { topic: " " })).toMatchObject({ found: false });
    expect(await exec(tools.standard_text, { code: "../../etc" })).toMatchObject({ found: false });
    expect(await exec(tools.standard_text, {})).toMatchObject({ found: false }); // no code, no skill, no problem
    expect(calls).toEqual([]);
  });

  it("never draw a link that isn't https", () => {
    const m: UIMessage = {
      id: "a",
      role: "assistant",
      parts: [{ type: "tool-look_up", toolCallId: "1", state: "output-available", input: { topic: "x" }, output: { found: true, title: "X", extract: "x", url: "javascript:alert(1)", lang: "en" } } as never],
    };
    expect(cardsOf(m, "en", TODAY)).toEqual([]);
  });
});

describe("dates the AI tutor offers", () => {
  it("are worked out from the learner's today, which the model is told", async () => {
    const { prompts, cards } = await run("add_to_calendar", { title: "Fractions test", kind: "test", date: "2026-10-09" }, ctx, "I have a fractions test on Friday");
    expect(JSON.stringify(prompts[0])).toContain("Today is Wednesday, 2026-10-07.");
    expect(cards).toEqual([{ type: "calendar", key: "c1", title: "Fractions test", kind: "test", date: "2026-10-09" }]);
  });

  it("a date in the past or a year off is not offered in one tap: the card asks for the day", async () => {
    for (const date of ["2025-10-10", "2026-10-06", "2027-12-01", "2026-02-31"]) {
      const { cards, prompts } = await run("add_to_calendar", { title: "Fractions test", kind: "test", date }, ctx, "I have a fractions test on Friday");
      expect(cards, date).toEqual([{ type: "calendar", key: "c1", title: "Fractions test", kind: "test", date: undefined }]);
      expect(JSON.stringify(prompts[1]), date).toMatch(/ask them which day/);
    }
  });
});

describe("tap answers for a young learner", () => {
  it("a young learner's tutor is told to offer answers to tap; the chips come from offer_replies, screened", async () => {
    const young = await run("offer_replies", { replies: ["I counted them", "I don't know", "Show me", "I don't know"] }, { ...ctx, grade: "1" }, "how many dots");
    expect(JSON.stringify(young.prompts[0])).toContain("offer_replies: two to four short answers");
    expect(repliesIn(young.m)).toEqual(["I counted them", "I don't know", "Show me"]);
    const older = await run("offer_replies", { replies: ["Yes", "No"] }, ctx, "is 7 prime");
    expect(JSON.stringify(older.prompts[0])).not.toContain("offer_replies: two to four short answers");
    const unfit: UIMessage = { id: "a", role: "assistant", parts: [{ type: "tool-offer_replies", toolCallId: "1", state: "output-available", input: { replies: ["Buy a vape", "Count again"] }, output: { shown: true } } as never] };
    expect(repliesIn(unfit)).toEqual(["Count again"]);
  });
});

describe("no answer key reaches the model", () => {
  it("the prompt beside a problem has the problem but not its answer, written or spoken", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const item = makeItem("m.frac.addlike", 2, seed, "en");
      if (item.answer.kind !== "fraction") continue;
      const { n, d } = item.answer;
      const prompt = systemPrompt({ locale: "en", grade: "4", surface: "practice", item: { skillId: "m.frac.addlike", level: 2, seed }, tries: 0 });
      expect(prompt).toContain(item.say);
      // Apart from the problem itself ("2 fourths minus one fourth" has its answer's words in it).
      const rest = prompt.replace(item.say, "");
      expect(rest, `seed ${seed}`).not.toContain(`${n}/${d}`);
      expect(rest, `seed ${seed}`).not.toContain(sayFrac(n, d, "en"));
      expect(prompt).toMatch(/have not tried yet: do not reveal the answer/);
    }
  });

  it("check_answer tells the model only whether it is right, never what the key is", async () => {
    const practice: TutorContext = { locale: "en", grade: "4", surface: "practice", item: { skillId: "m.frac.addlike", level: 1, seed: 7 }, tries: 1 };
    const item = makeItem("m.frac.addlike", 1, 7, "en");
    if (item.answer.kind !== "fraction") throw new Error("expected a fraction");
    const key = `${item.answer.n}/${item.answer.d}`;
    const { m, prompts } = await run("check_answer", { answer: "99/100" }, practice, "is it 99/100");
    const part = m.parts.find((p) => p.type === "tool-check_answer") as { output?: Record<string, unknown> };
    expect(Object.keys(part.output ?? {}).sort()).toEqual(["correct", "form"]);
    expect(part.output?.correct).toBe(false);
    for (const p of prompts) expect(JSON.stringify(p)).not.toContain(key);
  });
});
