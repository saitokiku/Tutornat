// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanQuery, clearKnowCache, stripTags } from "./fetch";
import { define, rhymes } from "./words";
import { wikiSummary } from "./wiki";
import { searchBooks } from "./books";

const answers = new Map<RegExp, unknown>();
function mockFetch() {
  const calls: string[] = [];
  vi.stubGlobal("fetch", async (url: string) => {
    calls.push(url);
    for (const [re, body] of answers) if (re.test(url)) return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
    return new Response("nope", { status: 404 });
  });
  return calls;
}
afterEach(() => {
  vi.unstubAllGlobals();
  answers.clear();
  clearKnowCache();
});

describe("knowledge layer", () => {
  it("cleans queries and strips highlight tags", () => {
    expect(cleanQuery("  water   cycle ")).toBe("water cycle");
    expect(cleanQuery("a")).toBeNull();
    expect(cleanQuery(42)).toBeNull();
    expect(stripTags('a <span class="x">b</span> &amp; c')).toBe("a b & c");
  });

  it("wiki: searches, skips disambiguation pages, caches", async () => {
    answers.set(/list=search/, { query: { search: [{ title: "Mercury", snippet: "" }, { title: "Mercury (planet)", snippet: "" }] } });
    answers.set(/summary\/Mercury$/, { type: "disambiguation", title: "Mercury", extract: "" });
    answers.set(/summary\/Mercury_\(planet\)/, { type: "standard", title: "Mercury (planet)", extract: "Mercury is the first planet from the Sun.", content_urls: { desktop: { page: "https://en.wikipedia.org/wiki/Mercury_(planet)" } } });
    const calls = mockFetch();
    const s = await wikiSummary("mercury planet", "en");
    expect(s).toMatchObject({ title: "Mercury (planet)", license: "CC BY-SA 4.0" });
    expect(s!.extract).toContain("first planet");
    const n = calls.length;
    await wikiSummary("mercury planet", "en");
    expect(calls.length).toBe(n); // served from cache
  });

  it("define and rhymes parse Datamuse rows", async () => {
    answers.set(/md=d/, [{ word: "evaporate", defs: ["v\t(ergative) To transition from a liquid state into a gaseous state.", "v\tTo disappear."] }]);
    answers.set(/rel_rhy/, [{ word: "flat", numSyllables: 1 }, { word: "caveat", numSyllables: 3 }, { word: "la-la", numSyllables: 2 }]);
    mockFetch();
    const defs = await define("Evaporate");
    expect(defs[0]).toEqual({ word: "evaporate", partOfSpeech: "verb", text: "To transition from a liquid state into a gaseous state." });
    expect((await rhymes("cat")).map((r) => r.word)).toEqual(["flat", "caveat"]);
  });

  it("books come with a cover and a place to borrow", async () => {
    answers.set(/openlibrary/, { docs: [{ key: "/works/OL483391W", title: "Charlotte's Web", author_name: ["E. B. White"], first_publish_year: 1952, cover_i: 8461797 }] });
    mockFetch();
    const [b] = await searchBooks("charlotte's web");
    expect(b).toMatchObject({ title: "Charlotte's Web", author: "E. B. White", year: 1952, url: "https://openlibrary.org/works/OL483391W", source: "Open Library" });
    expect(b.cover).toContain("8461797");
  });
});
