// @vitest-environment node
import { MockLanguageModelV4 } from "ai/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@/lib/ai/safety";
import { SKILLS } from "@/practice/skills";
import { POST } from "./route";

// The route's model is the test's writer; one that must not be reached unless a test says so.
const slot = vi.hoisted(() => ({ writer: null as MockLanguageModelV4 | null }));
vi.mock("@/lib/ai/config", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/ai/config")>();
  return { ...real, model: async () => (real.aiMode() === "demo" ? null : slot.writer) };
});

let hosts = 0;
const facts = { minutes: 40, sets: 3, own: 8, helped: 2, missed: 1, proved: [], helpOn: ["Equivalent fractions"], checksWaiting: [], stuck: [], comingUp: ["Math test on Friday"] };
const post = (f: Partial<typeof facts>) =>
  POST(new Request("http://localhost/api/ai/coach", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": `198.18.8.${++hosts}` }, body: JSON.stringify({ locale: "en", facts: { ...facts, ...f } }) }));

beforeEach(() => {
  vi.stubEnv("ANTHROPIC_API_KEY", "test-key-never-used");
  vi.stubEnv("VERCEL", "");
  slot.writer = new MockLanguageModelV4({ doGenerate: async () => ({ content: [{ type: "text", text: "A calm week." }], finishReason: { unified: "stop", raw: undefined }, usage: { inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 1, text: 1, reasoning: undefined } }, warnings: [] }) });
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/ai/coach", () => {
  it("screens every word the writer would read, and writes the note without the ones it stops", async () => {
    // Calendar titles are the family's own words, or a school's: real ones the screen stops.
    const school = ["Red Ribbon Week: drug-free pledge", "Health quiz: alcohol and tobacco", "Vaping prevention assembly", "History project: the atomic bomb", "Science: Bath bomb lab", "Sex ed permission slip due"];
    for (const title of school) expect(screen(title, "en").kind).not.toBe("ok");
    const res = await post({ comingUp: ["Math test on Friday", ...school.slice(0, 4), "I want to die"], helpOn: ["Equivalent fractions", "how to buy weed"] });
    expect(await res.json()).toEqual({ note: "A calm week." });
    const prompts = JSON.stringify(slot.writer!.doGenerateCalls.map((c) => c.prompt));
    expect(prompts).toContain("Math test on Friday");
    expect(prompts).toContain("Equivalent fractions");
    for (const stopped of [...school.slice(0, 4), "I want to die", "weed"]) expect(prompts).not.toContain(stopped);
    expect(slot.writer!.doGenerateCalls).toHaveLength(1);
  });

  it("never turns a note away for a skill's own name", () => {
    const stopped = SKILLS.flatMap((s) => [s.title.en, s.title.es]).filter((title) => screen(title, "en").kind !== "ok");
    expect(stopped).toEqual([]);
  });
});
