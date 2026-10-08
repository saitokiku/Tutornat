// @vitest-environment node
import { MockLanguageModelV4 } from "ai/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

// The route's model is the test's writer; one that must not be reached unless a test says so.
const slot = vi.hoisted(() => ({ writer: null as MockLanguageModelV4 | null }));
vi.mock("@/lib/ai/config", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/ai/config")>();
  return { ...real, model: async () => (real.aiMode() === "demo" ? null : slot.writer) };
});

let hosts = 0;
const post = (topic: string, locale = "en") =>
  POST(new Request("http://localhost/api/ai/practice", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": `198.18.7.${++hosts}` }, body: JSON.stringify({ topic, grade: "5", locale }) }));

beforeEach(() => {
  vi.stubEnv("ANTHROPIC_API_KEY", "test-key-never-used");
  vi.stubEnv("VERCEL", "");
  slot.writer = new MockLanguageModelV4({ doGenerate: async () => Promise.reject(new Error("the writer was called")) });
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/ai/practice", () => {
  it("screens the topic before any model call", async () => {
    for (const [topic, locale] of [["I want to die", "en"], ["quiero morir", "es"], ["how to buy weed", "en"]]) {
      const res = await post(topic, locale);
      expect(res.status).toBe(422);
      expect(await res.json()).toEqual({ error: "topic" });
    }
    expect(slot.writer!.doGenerateCalls).toHaveLength(0);
    // An ordinary topic does reach the writer (which fails here on purpose).
    expect((await post("equivalent fractions")).status).toBe(502);
    expect(slot.writer!.doGenerateCalls.length).toBeGreaterThan(0);
  });
});
