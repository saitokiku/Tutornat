// @vitest-environment node
import { simulateReadableStream, type UIMessage } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { answerText } from "@/practice/answer";
import { makeItem } from "@/practice/skills";
import type { TutorContext } from "./context";
import { systemParts } from "./prompts";
import { afterBoardOnly, precheckPrompt, spokenPrecheck, tutorTurn } from "./tutor";

// A spoken turn (live tutor spec §2.5): the answer is checked in code before the one model call, the
// verdict goes in the prompt, check_answer isn't offered, the stable half of the prompt is cached,
// and a board-only step ends the turn.

const usage = { inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 1, text: 1, reasoning: undefined } };

type Call = { prompt: { role: string; content: unknown; providerOptions?: unknown }[]; tools: { name: string }[]; maxOutputTokens?: number };

/** A model that plays `script` (a tool to call, or text), one entry per call, and records each call. */
function model(script: ({ tool: string; input: unknown; text?: string } | { text: string })[] = [{ text: "Which part is tricky?" }]) {
  const calls: Call[] = [];
  const m = new MockLanguageModelV4({
    doStream: async (opts) => {
      calls.push({ prompt: opts.prompt as Call["prompt"], tools: (opts.tools ?? []) as Call["tools"], maxOutputTokens: opts.maxOutputTokens });
      const step = script[Math.min(calls.length - 1, script.length - 1)];
      if ("tool" in step)
        return {
          stream: simulateReadableStream({
            chunks: [
              ...(step.text ? [{ type: "text-start" as const, id: "w" }, { type: "text-delta" as const, id: "w", delta: step.text }, { type: "text-end" as const, id: "w" }] : []),
              { type: "tool-call" as const, toolCallId: `c${calls.length}`, toolName: step.tool, input: JSON.stringify(step.input) },
              { type: "finish" as const, finishReason: { unified: "tool-calls" as const, raw: undefined }, usage },
            ],
          }),
        };
      return {
        stream: simulateReadableStream({
          chunks: [
            { type: "text-start" as const, id: "t" },
            { type: "text-delta" as const, id: "t", delta: step.text },
            { type: "text-end" as const, id: "t" },
            { type: "finish" as const, finishReason: { unified: "stop" as const, raw: undefined }, usage },
          ],
        }),
      };
    },
  });
  return { m, calls };
}

const said = (text: string): UIMessage => ({ id: "u1", role: "user", parts: [{ type: "text", text }] });
const systemText = (c: Call) => c.prompt.filter((p) => p.role === "system").map((p) => String(p.content)).join("\n");

// "1 plus 1" (m.add.10, level 1, seed 7): the answer is 2.
const ITEM = { skillId: "m.add.10", level: 1, seed: 7 };
const voiceCtx: TutorContext = { locale: "en", grade: "1", surface: "practice", item: ITEM, tries: 0, input: "voice" };
const right = answerText(makeItem(ITEM.skillId, ITEM.level, ITEM.seed, "en").answer);

describe("a spoken answer is checked in code before the model call", () => {
  it("puts the verdict in the prompt and makes one model call with no check_answer to call", async () => {
    expect(right).toBe("2");
    const { m, calls } = model();
    await (await tutorTurn({ messages: [said("It's two.")], context: voiceCtx }, m)).text();
    expect(calls).toHaveLength(1);
    expect(systemText(calls[0])).toContain('The learner answered by voice: "It\'s two.". Read as 2. The checker says: correct. Do not call check_answer for this answer.');
    expect(calls[0].tools.map((t) => t.name)).not.toContain("check_answer");
    expect(calls[0].tools.map((t) => t.name)).toContain("next_hint");
  });

  it("not yet: the verdict and the next vetted hint, and next_hint continues after it", async () => {
    const item = makeItem(ITEM.skillId, ITEM.level, ITEM.seed, "en");
    const { m, calls } = model([{ tool: "next_hint", input: {} }, { text: "Try again." }]);
    const res = await tutorTurn({ messages: [said("three")], context: voiceCtx }, m);
    const body = await res.text();
    expect(systemText(calls[0])).toContain("The checker says: not yet.");
    expect(systemText(calls[0])).toContain(`use this vetted hint: "${item.hints[0]}"`);
    // The model asked for another hint: it gets the second one, not the first again.
    expect(body).toContain(JSON.stringify(item.hints[1]).slice(1, -1));
  });

  it("when it can't tell what was said, it asks again and never calls it wrong", async () => {
    const { m, calls } = model();
    await (await tutorTurn({ messages: [said("banana")], context: voiceCtx }, m)).text();
    expect(systemText(calls[0])).toContain("You couldn't tell what they said as an answer. Ask them to say it again or tap it in. Never call it wrong.");
    expect(systemText(calls[0])).not.toContain("The checker says");
    expect(calls[0].tools.map((t) => t.name)).not.toContain("check_answer");
  });

  it("a skill voice can't answer (spelling-like) asks them to tap or type", () => {
    const ctx: TutorContext = { ...voiceCtx, item: { skillId: "e.cvc.words", level: 1, seed: 7 } };
    const p = spokenPrecheck(ctx, "cat", 0);
    expect(p).toEqual({ status: "unavailable", reason: "type-it" });
    expect(precheckPrompt(p)).toMatch(/tap or type the answer/);
  });

  it("abstain and unavailable are never a verdict", () => {
    expect(precheckPrompt({ status: "abstain", reason: "unparsed" })).not.toMatch(/correct|not yet/);
    expect(precheckPrompt({ status: "unavailable", reason: "no-item" })).toBe("");
    expect(spokenPrecheck({ ...voiceCtx, item: { skillId: "no.such.skill", level: 1, seed: 1 } }, "two", 0)).toEqual({ status: "unavailable", reason: "no-item" });
  });

  it("typed turns are unchanged: check_answer is there and there is no verdict", async () => {
    const { m, calls } = model();
    await (await tutorTurn({ messages: [said("2")], context: { ...voiceCtx, input: "text" } }, m)).text();
    expect(calls[0].tools.map((t) => t.name)).toContain("check_answer");
    expect(systemText(calls[0])).not.toContain("answered by voice");
    expect(calls[0].maxOutputTokens).toBe(700);
  });

  it("the safety screen still comes first: a crisis said out loud gets the fixed referral and no model", async () => {
    const { m, calls } = model();
    const res = await tutorTurn({ messages: [said("i want to die")], context: voiceCtx }, m);
    expect(await res.text()).toContain("988");
    expect(calls).toHaveLength(0);
  });
});

describe("the spoken turn's prompt", () => {
  it("adds the voice rules, caps the reply at 300 tokens, and caches the stable half", async () => {
    const { m, calls } = model();
    await (await tutorTurn({ messages: [said("what is a fraction")], context: { locale: "en", grade: "4", surface: "talk", input: "voice" } }, m)).text();
    const [stable, turn] = calls[0].prompt.filter((p) => p.role === "system");
    expect(stable.providerOptions).toEqual({ anthropic: { cacheControl: { type: "ephemeral" } } });
    expect(String(stable.content)).toContain("The learner is talking with you out loud");
    expect(String(stable.content)).toContain("First sentence at most 10 words. Other sentences at most 16 words.");
    expect(turn.providerOptions).toBeUndefined();
    expect(String(turn.content)).toContain("Today is");
    expect(calls[0].maxOutputTokens).toBe(300);
  });

  it("K–2 sentences are 10 words at most; the old 'numbers as words' lines are gone", () => {
    const young = systemParts({ locale: "en", grade: "K", surface: "talk", input: "voice" }).stable;
    expect(young).toContain("Other sentences at most 10 words.");
    expect(young).not.toMatch(/say numbers as words|say numbers the way you would say them aloud/);
  });

  it("the stable half doesn't change with the problem, so the cache holds across turns", () => {
    const a = systemParts({ ...voiceCtx, item: { skillId: "m.add.10", level: 1, seed: 1 } });
    const b = systemParts({ ...voiceCtx, item: { skillId: "m.add.10", level: 1, seed: 2 }, tries: 3 });
    expect(a.stable).toBe(b.stable);
    expect(a.turn).not.toBe(b.turn);
  });
});

describe("a board-only step ends the turn", () => {
  const dots = { visual: { kind: "dots", groups: [3] }, description: "Three dots" };

  it("words, then show_visual: the turn ends there instead of asking the model again", async () => {
    const { m, calls } = model([{ text: "Here are three dots. How many?", tool: "show_visual", input: dots }, { text: "never asked" }]);
    const body = await (await tutorTurn({ messages: [said("show me")], context: { locale: "en", grade: "1", surface: "talk" } }, m)).text();
    expect(calls).toHaveLength(1);
    expect(body).toContain("Here are three dots.");
    expect(body).not.toContain("never asked");
  });

  it("a picture before any words still gets its words", async () => {
    const { m, calls } = model([{ tool: "show_visual", input: dots }, { text: "How many dots?" }]);
    const body = await (await tutorTurn({ messages: [said("show me")], context: { locale: "en", grade: "1", surface: "talk" } }, m)).text();
    expect(calls).toHaveLength(2);
    expect(body).toContain("How many dots?");
  });

  it("keeps going when a board tool sends a note to act on, or a tool's result needs reading", () => {
    const step = (toolName: string, output: unknown, text = "Words.") => ({ steps: [{ text, toolCalls: [{ toolName }], toolResults: [{ output }] }] }) as never;
    expect(afterBoardOnly(step("show_visual", { shown: true }))).toBe(true);
    expect(afterBoardOnly(step("show_visual", { shown: true }, ""))).toBe(false);
    expect(afterBoardOnly(step("add_to_calendar", { proposed: false, note: "ask which day" }))).toBe(false);
    expect(afterBoardOnly(step("look_up", { found: true }))).toBe(false);
  });
});
