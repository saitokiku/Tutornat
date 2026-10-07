// @vitest-environment node
import { MockLanguageModelV4 } from "ai/test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { writeCourse, type CourseRequest } from "@/lib/ai/build";
import type { LessonOut } from "@/lib/ai/schemas";
import { meter } from "@/lib/server/budget";
import { POST } from "./route";

const usage = { inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 1, text: 1, reasoning: undefined } };
const reply = (obj: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(obj) }], finishReason: { unified: "stop" as const, raw: undefined }, usage, warnings: [] });
const lesson: LessonOut = {
  title: "The water cycle",
  summary: "Water moves between the sky and the ground.",
  minutes: 8,
  scenes: [
    { kind: "slide", title: "See it", blocks: [{ type: "visual", visual: { kind: "particles", state: "gas" }, alt: "Water vapor particles spread far apart" }] },
    { kind: "interactive", title: "Try it", prompt: "Warm the water until it turns to gas.", widget: { kind: "states-of-matter", startC: 20, target: "gas" } },
    { kind: "quiz", title: "Check it", questions: [{ prompt: "What makes puddles dry up?", choices: ["The Sun's heat", "The wind's color"], answer: 0, hint: "Think about what warms the ground.", explain: "Heat turns the water into vapor." }] },
  ],
};

const post = (body: CourseRequest, learner = "b".repeat(32)) =>
  POST(new Request("http://localhost/api/ai/course", { method: "POST", headers: { "content-type": "application/json", "x-kaizen-learner": learner, "x-kaizen-account": "c".repeat(32) }, body: JSON.stringify(body) }));

afterEach(() => vi.unstubAllEnvs());

describe("POST /api/ai/course", () => {
  it("serves a course another family already got straight from the cache: no model call, nothing spent", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key-never-used");
    vi.stubEnv("VERCEL", "");
    const req: CourseRequest = { goal: "the water cycle", grade: "2", subject: "science", length: "lesson", locale: "en" };
    const queue: unknown[] = [{ title: "Water on the move", lessons: [{ title: "The water cycle", summary: "s", objective: "o", minutes: 8 }] }, lesson];
    const writer = new MockLanguageModelV4({ doGenerate: async () => reply(queue.shift()) });
    for await (const e of writeCourse(req, writer)) void e;

    const before = performance.now();
    const res = await post({ ...req, goal: "What is the water cycle?" });
    const events = (await res.text()).trim().split("\n").map((l) => JSON.parse(l) as { type: string; lesson?: { title: string } });
    expect(res.headers.get("content-type")).toContain("application/x-ndjson");
    expect(events.map((e) => e.type)).toEqual(["step", "outline", "step", "lesson", "done"]);
    expect(events[3].lesson?.title).toBe("The water cycle");
    expect(performance.now() - before).toBeLessThan(250);
    // The real provider was configured but never reached: a call would have failed with the fake key.
    expect(writer.doGenerateCalls).toHaveLength(2);
  });

  it("tells a family over its cap so, in their language, when nothing is cached", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key-never-used");
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("KAIZEN_AI_DAILY_TURNS", "1");
    const learner = "d".repeat(32);
    const m = meter(new Request("http://localhost", { headers: { "x-kaizen-learner": learner, "x-kaizen-account": "c".repeat(32) } }));
    m.start();
    const res = await post({ goal: "volcanes", grade: "5", subject: "science", length: "short", locale: "es" }, learner);
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ error: "budget", scope: "day", message: expect.stringContaining("El escritor de lecciones terminó por hoy") });
  });

  it("is not there without a provider: the browser builds a template instead", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("AI_GATEWAY_API_KEY", "");
    vi.stubEnv("VERCEL", "");
    const res = await post({ goal: "the water cycle", grade: "2", subject: "science", length: "lesson", locale: "en" });
    expect(res.status).toBe(503);
  });
});
