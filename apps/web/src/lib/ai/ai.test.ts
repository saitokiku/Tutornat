// @vitest-environment node
import { simulateReadableStream, type UIMessage } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { TutorContext } from "./context";
import { band, systemPrompt } from "./prompts";
import { screen } from "./safety";
import { tutorTools } from "./tools";
import { tutorTurn } from "./tutor";

const ctx: TutorContext = { locale: "en", grade: "1", surface: "practice", item: { skillId: "m.add.10", level: 1, seed: 7 }, tries: 1, lastAnswer: "9" };

const user = (text: string): UIMessage => ({ id: "u1", role: "user", parts: [{ type: "text", text }] });

function mockModel(text: string) {
  return new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: "text-start", id: "t" },
          { type: "text-delta", id: "t", delta: text },
          { type: "text-end", id: "t" },
          { type: "finish", finishReason: { unified: "stop", raw: undefined }, logprobs: undefined, usage: { inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 1, text: 1, reasoning: undefined } } },
        ],
      }),
    }),
  });
}

describe("safety screen", () => {
  it("answers crises and abuse with fixed referrals in the learner's language", () => {
    expect(screen("i want to die", "en")).toMatchObject({ kind: "crisis" });
    expect(screen("I want to kill myself", "en").kind).toBe("crisis");
    expect((screen("me quiero morir", "es") as { reply: string }).reply).toContain("988");
    expect(screen("my dad hits me", "en").kind).toBe("abuse");
    expect(screen("show me porn", "en").kind).toBe("offLimits");
    expect(screen("how do I add 3/4 and 1/6?", "en").kind).toBe("ok");
    expect(screen("this test is killing me", "en").kind).toBe("ok");
  });
});

describe("tutor prompt", () => {
  it("describes the problem without its answer key, and fits the band and language", () => {
    const p = systemPrompt(ctx);
    expect(p).toContain("kindergarten to grade 2");
    expect(p).toContain("Reply in English");
    expect(p).toContain("check_answer");
    expect(p).not.toMatch(/the answer is/i);
    expect(systemPrompt({ ...ctx, locale: "es" })).toContain("Spanish");
    expect(band("7")).toBe("upper");
  });

  it("never carries a name: the context has no field for one", () => {
    expect(TutorContext.safeParse({ ...ctx, name: "Ada" }).data).not.toHaveProperty("name");
  });
});

describe("tutor tools", () => {
  const tools = tutorTools(ctx);
  const run = <T,>(t: { execute?: (input: never, opts: never) => T }, input: unknown) => t.execute!(input as never, { toolCallId: "x", messages: [] } as never);

  it("checks answers with the deterministic checker", async () => {
    const item = (await import("@/practice/skills")).makeItem("m.add.10", 1, 7, "en");
    const right = String((item.answer as { value: number }).value);
    expect(await run(tools.check_answer, { answer: right })).toMatchObject({ correct: true });
    expect(await run(tools.check_answer, { answer: "999" })).toMatchObject({ correct: false });
  });

  it("gives vetted hints in order and a fresh worked problem", async () => {
    const first = (await run(tools.next_hint, {})) as { hint: string };
    const second = (await run(tools.next_hint, {})) as { hint: string };
    expect(first.hint).not.toBe(second.hint);
    const similar = (await run(tools.similar_problem, {})) as { seed: number; steps: string[] };
    expect(similar.seed).not.toBe(7);
    expect(similar.steps.length).toBeGreaterThan(0);
  });

  it("finds skills from school words", async () => {
    const out = (await run(tools.find_skill, { query: "telling time" })) as { skills: { skillId: string }[] };
    expect(out.skills.map((s) => s.skillId)).toContain("m.time.clock");
  });
});

describe("tutor turn", () => {
  it("streams the model's reply", async () => {
    const res = await tutorTurn({ messages: [user("is it 9?")], context: ctx }, mockModel("Let's check that together."));
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("Let's check that together.");
  });

  it("answers a crisis without calling the model", async () => {
    let called = false;
    const model = new MockLanguageModelV4({
      doStream: async () => {
        called = true;
        throw new Error("should not be called");
      },
    });
    const res = await tutorTurn({ messages: [user("i want to die")], context: ctx }, model);
    expect(await res.text()).toContain("988");
    expect(called).toBe(false);
  });

  it("rejects a bad context", async () => {
    const res = await tutorTurn({ messages: [user("hi")], context: { locale: "fr" } }, mockModel("x"));
    expect(res.status).toBe(400);
  });
});
