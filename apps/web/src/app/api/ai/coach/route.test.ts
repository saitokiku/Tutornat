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
  it("screens every word the writer would read before any model call", async () => {
    // A calendar title is the family's own words.
    const res = await post({ comingUp: ["I want to die"] });
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: "topic" });
    expect(slot.writer!.doGenerateCalls).toHaveLength(0);
    expect(await (await post({})).json()).toEqual({ note: "A calm week." });
  });

  it("never turns a note away for a skill's own name", () => {
    const stopped = SKILLS.flatMap((s) => [s.title.en, s.title.es]).filter((title) => screen(title, "en").kind !== "ok");
    expect(stopped).toEqual([]);
  });
});
