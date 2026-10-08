// @vitest-environment node
import { MockLanguageModelV4 } from "ai/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { writeCourse, type CourseRequest } from "@/lib/ai/build";
import { screen } from "@/lib/ai/safety";
import type { LessonOut } from "@/lib/ai/schemas";
import { capMessage, meter } from "@/lib/server/budget";
import { POST } from "./route";

// The route's model is the test's writer, metered exactly as config.ts meters a real one.
const slot = vi.hoisted(() => ({ writer: null as MockLanguageModelV4 | null }));
vi.mock("@/lib/ai/config", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/ai/config")>();
  return { ...real, model: async (_role: string, m?: Parameters<typeof real.metered>[1]) => (real.aiMode() === "demo" || !slot.writer ? null : m ? real.metered(slot.writer, m) : slot.writer) };
});

const usage = (input = 1) => ({ inputTokens: { total: input, noCache: input, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 1, text: 1, reasoning: undefined } });
const reply = (obj: unknown, input?: number) => ({ content: [{ type: "text" as const, text: JSON.stringify(obj) }], finishReason: { unified: "stop" as const, raw: undefined }, usage: usage(input), warnings: [] });
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
const outline = (title: string, count: number) => ({ title, lessons: Array.from({ length: count }, (_, i) => ({ title: `Lesson ${i + 1}`, summary: "s", objective: "o", minutes: 8 })) });

/** A writer that must not be reached. */
const unreachable = () => new MockLanguageModelV4({ doGenerate: async () => Promise.reject(new Error("the writer was called")) });

// Each request from its own address: the course rate limit is six a minute per address.
let hosts = 0;
const ip = () => `198.18.9.${++hosts}`;
const post = (body: CourseRequest, learner = "b".repeat(32)) =>
  POST(new Request("http://localhost/api/ai/course", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip(), "x-kaizen-learner": learner, "x-kaizen-account": "c".repeat(32) }, body: JSON.stringify(body) }));
const events = async (res: Response) => (await res.text()).trim().split("\n").map((l) => JSON.parse(l) as { type: string; error?: string; message?: string; lesson?: { title: string }; title?: string });

/** Spends this learner's day, as a model call would. */
const spendDay = (learner: string) => meter(new Request("http://localhost", { headers: { "x-kaizen-learner": learner, "x-kaizen-account": "c".repeat(32) } })).start();

beforeEach(() => {
  vi.stubEnv("ANTHROPIC_API_KEY", "test-key-never-used");
  vi.stubEnv("VERCEL", "");
  slot.writer = unreachable();
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/ai/course", () => {
  it("serves a course another family already got straight from the cache: no model call, nothing spent", async () => {
    const req: CourseRequest = { goal: "the water cycle", grade: "2", subject: "science", length: "lesson", locale: "en" };
    const queue: unknown[] = [{ title: "Water on the move", lessons: [{ title: "The water cycle", summary: "s", objective: "o", minutes: 8 }] }, lesson];
    const writer = new MockLanguageModelV4({ doGenerate: async () => reply(queue.shift()) });
    for await (const e of writeCourse(req, writer)) void e;

    const before = performance.now();
    const res = await post({ ...req, goal: "What is the water cycle?" });
    const got = await events(res);
    expect(res.headers.get("content-type")).toContain("application/x-ndjson");
    expect(got.map((e) => e.type)).toEqual(["step", "outline", "step", "lesson", "done"]);
    expect(got[3].lesson?.title).toBe("The water cycle");
    expect(performance.now() - before).toBeLessThan(250);
    expect(writer.doGenerateCalls).toHaveLength(2);
    expect(slot.writer!.doGenerateCalls).toHaveLength(0);
  });

  it("tells a family over its cap so, in their language, as one event in the stream the course screen reads", async () => {
    vi.stubEnv("KAIZEN_AI_DAILY_TURNS", "1");
    const learner = "d".repeat(32);
    spendDay(learner);
    const res = await post({ goal: "volcanes", grade: "5", subject: "science", length: "short", locale: "es" }, learner);
    expect(res.status).toBe(200);
    expect(res.headers.get("x-kaizen-budget")).toBe("day");
    expect(await events(res)).toEqual([{ type: "error", error: "budget", scope: "day", message: capMessage("course", "day", "es") }]);
    expect(capMessage("course", "day", "es")).toContain("El escritor de lecciones terminó por hoy");
  });

  it("never serves the shared course to a family who attached their own files", async () => {
    const req: CourseRequest = { goal: "help me study for my test", grade: "9", subject: "other", length: "lesson", locale: "en" };
    const queue: unknown[] = [outline("Study skills", 1), lesson];
    for await (const e of writeCourse(req, new MockLanguageModelV4({ doGenerate: async () => reply(queue.shift()) }))) void e;
    expect((await events(await post(req))).map((e) => e.type)).toEqual(["step", "outline", "step", "lesson", "done"]);
    // Over the cap, a cache hit still comes through, but the same goal with a file does not hit it.
    vi.stubEnv("KAIZEN_AI_DAILY_TURNS", "1");
    const learner = "e".repeat(32);
    spendDay(learner);
    expect((await events(await post(req, learner)))[1].title).toBe("Study skills");
    const withFile = await events(await post({ ...req, sources: [{ name: "Unit 4 Photosynthesis study guide.pdf", kind: "pdf" }] }, learner));
    expect(withFile).toEqual([expect.objectContaining({ type: "error", error: "budget" })]);
  });

  it("gives the writer attached file names only from a browser that took the family's names out of them", async () => {
    const req: CourseRequest = { goal: "plants", grade: "5", subject: "science", length: "lesson", locale: "en", sources: [{ name: "Ada's photosynthesis notes.pdf", kind: "pdf" }] };
    const prompts = async (headers: Record<string, string>) => {
      const queue: unknown[] = [outline("Plants", 1), lesson];
      slot.writer = new MockLanguageModelV4({ doGenerate: async () => reply(queue.shift()) });
      await (await POST(new Request("http://localhost/api/ai/course", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip(), ...headers }, body: JSON.stringify(req) }))).text();
      return JSON.stringify(slot.writer.doGenerateCalls.map((c) => c.prompt));
    };
    // aiFetch sends the ids, and has already scrubbed the body ("[name]'s photosynthesis notes.pdf" in real use).
    expect(await prompts({ "x-kaizen-learner": "a1".repeat(16) })).toContain("photosynthesis notes.pdf");
    const plain = await prompts({});
    expect(plain).not.toContain("Ada");
    expect(plain).toContain("They attached: a pdf file");
  });

  it("stops a course between lessons once the day's cost cap is reached, and says why", async () => {
    vi.stubEnv("KAIZEN_AI_DAILY_USD", "0.05");
    const queue: unknown[] = [outline("Rocks", 3), lesson, lesson, lesson];
    // Each call costs about $0.10 at the price of an unlisted model: over the cap after the outline.
    slot.writer = new MockLanguageModelV4({ doGenerate: async () => reply(queue.shift(), 10_000) });
    const got = await events(await post({ goal: "rocks and minerals", grade: "4", subject: "science", length: "short", locale: "en" }, "f".repeat(32)));
    expect(got.map((e) => e.type)).toEqual(["step", "outline", "step", "error"]);
    expect(got.at(-1)).toMatchObject({ error: "budget", message: capMessage("course", "day", "en") });
    expect(slot.writer.doGenerateCalls).toHaveLength(1);
  });

  it("screens the goal before any model call: the tutor's fixed reply, no writer, even over the cap", async () => {
    const asked = [
      ["I want to die", "en"],
      ["mi papá me pega", "es"],
      ["how to make a bomb", "en"],
    ] as const;
    for (const [goal, locale] of asked) {
      const s = screen(goal, locale);
      if (s.kind === "ok") throw new Error(`the screen let "${goal}" through`);
      expect(await events(await post({ goal, grade: "5", subject: "science", length: "short", locale }))).toEqual([{ type: "error", error: "safety", flag: s.kind, message: s.reply }]);
    }
    // A family over its cap still gets the referral, not the cap's message.
    vi.stubEnv("KAIZEN_AI_DAILY_TURNS", "1");
    const learner = "9".repeat(32);
    spendDay(learner);
    expect(await events(await post({ goal: "I want to die", grade: "5", subject: "science", length: "short", locale: "en" }, learner))).toEqual([expect.objectContaining({ error: "safety", flag: "crisis" })]);
    expect(slot.writer!.doGenerateCalls).toHaveLength(0);
  });

  it("screens every word the writer reads, not only the goal: interests and attached files' names", async () => {
    const req: CourseRequest = { goal: "fractions", grade: "4", subject: "math", length: "lesson", locale: "en" };
    const asked: [Partial<CourseRequest>, string][] = [
      [{ interests: ["soccer", "how to make a bomb"] }, "how to make a bomb"],
      [{ interests: ["I want to die"] }, "I want to die"],
      // The learner header makes the route pass file names to the writer.
      [{ sources: [{ name: "how to buy weed.pdf", kind: "pdf" }] }, "how to buy weed.pdf"],
    ];
    for (const [more, words] of asked) {
      const s = screen(words, "en");
      if (s.kind === "ok") throw new Error(`the screen let "${words}" through`);
      expect(await events(await post({ ...req, ...more }))).toEqual([{ type: "error", error: "safety", flag: s.kind, message: s.reply }]);
    }
    expect(slot.writer!.doGenerateCalls).toHaveLength(0);
  });

  it("takes a grade or a file kind only from the app's own list: neither is free text the writer reads", async () => {
    const req = { goal: "fractions", grade: "4", subject: "math", length: "lesson", locale: "en" };
    for (const body of [{ ...req, grade: "bomb" }, { ...req, sources: [{ name: "notes.pdf", kind: "weed" }] }]) {
      const res = await POST(new Request("http://localhost/api/ai/course", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip() }, body: JSON.stringify(body) }));
      expect(res.status).toBe(400);
    }
    expect(slot.writer!.doGenerateCalls).toHaveLength(0);
  });

  it("is not there without a provider: the browser builds a template instead", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("AI_GATEWAY_API_KEY", "");
    const res = await post({ goal: "the water cycle", grade: "2", subject: "science", length: "lesson", locale: "en" });
    expect(res.status).toBe(503);
  });
});
