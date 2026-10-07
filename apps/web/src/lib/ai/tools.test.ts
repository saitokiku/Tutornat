// @vitest-environment node
import type { LanguageModelV4StreamPart } from "@ai-sdk/provider";
import { readUIMessageStream, simulateReadableStream, type UIMessage, type UIMessageChunk } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cardsOf, skillsIn } from "@/components/tutor/cards";
import { clearKnowCache } from "@/knowledge/fetch";
import type { TutorContext } from "./context";
import { knowledgeTools } from "./tools";
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
afterEach(() => {
  vi.unstubAllGlobals();
  answers.clear();
  clearKnowCache();
});

async function run(toolName: string, input: object, c: TutorContext = ctx) {
  const { model, prompts } = toolModel(toolName, input);
  const m = await reply(await tutorTurn({ messages: [user("what is a logical fallacy")], context: c }, model));
  return { m, cards: cardsOf(m, c.locale), prompts };
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

  it("practice tools mark the skill the conversation turned to", async () => {
    stubFetch();
    const found = await run("find_skill", { query: "logical fallacy" });
    expect(skillsIn(found.m)[0]).toBe("e.fallacies");
    const offered = await run("start_practice", { skillId: "e.fallacies", reason: "Spot the flaw in an argument" });
    expect(offered.cards).toEqual([{ type: "practice", skillId: "e.fallacies", reason: "Spot the flaw in an argument" }]);
    expect(skillsIn(offered.m)).toEqual(["e.fallacies"]);
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
    expect(cardsOf(m, "en")).toEqual([]);
  });
});
