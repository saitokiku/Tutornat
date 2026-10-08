// @vitest-environment node
import { generateText, readUIMessageStream, simulateReadableStream, streamText, type UIMessage, type UIMessageChunk } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { aiMode, metered, type TokenUsage } from "@/lib/ai/config";
import { budgetReply, capMessage, caps, costUsd, spendGate, spender } from "./budget";
import { addressKey } from "./rate";
const NOW = Date.UTC(2026, 9, 7, 15);
const usage = (input: number, output: number): TokenUsage => ({ input, output, cacheRead: 0, cacheWrite: 0 });
const request = () => new Request("http://localhost/api/tutor", { method: "POST", headers: { "x-forwarded-for": "203.0.113.9", "x-kaizen-account": "a".repeat(32), "x-kaizen-learner": "b".repeat(32) } });
async function shown(res: Response): Promise<UIMessage> {
  const chunks: UIMessageChunk[] = (await res.text()).split("\n").filter((l) => l.startsWith("data: ") && l !== "data: [DONE]").map((l) => JSON.parse(l.slice(6)) as UIMessageChunk);
  let message: UIMessage | undefined;
  for await (const m of readUIMessageStream({ stream: simulateReadableStream({ chunks }) })) message = m;
  return message!;
}
beforeEach(() => { vi.stubEnv("ANTHROPIC_API_KEY", "test-key"); vi.stubEnv("VERCEL", ""); vi.stubEnv("AI_GATEWAY_API_KEY", ""); vi.stubEnv("KAIZEN_AI", ""); });
afterEach(() => vi.unstubAllEnvs());
describe("caps", () => {
  it("have sane defaults and read the environment, ignoring nonsense", () => {
    expect(caps()).toEqual({ dayTurns: 50, dayUsd: 1, monthTurns: 3000, monthUsd: 30, addressTurns: 300, addressUsd: 6 });
    vi.stubEnv("KAIZEN_AI_DAILY_TURNS", "12");
    vi.stubEnv("KAIZEN_AI_MONTHLY_USD", "7.5");
    vi.stubEnv("KAIZEN_AI_DAILY_USD", "lots");
    vi.stubEnv("KAIZEN_AI_MONTHLY_TURNS", "-3");
    vi.stubEnv("KAIZEN_AI_ADDRESS_DAILY_TURNS", " 40 ");
    vi.stubEnv("KAIZEN_AI_ADDRESS_DAILY_USD", "");
    expect(caps()).toEqual({ dayTurns: 12, dayUsd: 1, monthTurns: 3000, monthUsd: 7.5, addressTurns: 40, addressUsd: 6 });
  });

  it("of 0 turn the AI off for the whole site, so every screen uses what works without it", async () => {
    expect(aiMode()).toBe("anthropic");
    for (const name of ["KAIZEN_AI_DAILY_TURNS", "KAIZEN_AI_MONTHLY_USD", "KAIZEN_AI_ADDRESS_DAILY_TURNS"]) {
      vi.stubEnv(name, "0");
      expect(aiMode(), name).toBe("demo");
      // Nothing is refused with "back tomorrow": there is no AI to come back.
      expect(await spendGate(request(), "talk", undefined, NOW)).toBeNull();
      vi.stubEnv(name, "");
    }
    vi.stubEnv("KAIZEN_AI_DAILY_USD", "0.00");
    expect(aiMode()).toBe("demo");
    vi.stubEnv("KAIZEN_AI_DAILY_USD", "");
    vi.stubEnv("KAIZEN_AI", "off");
    expect(aiMode()).toBe("demo");
  });
});

describe("cost estimate", () => {
  it("prices tokens at list price, the same for gateway ids, and high for unknown models", () => {
    expect(costUsd("claude-sonnet-5-5", usage(1_000_000, 100_000))).toBeCloseTo(2 + 1);
    expect(costUsd("anthropic/claude-sonnet-5.5", usage(1_000_000, 100_000))).toBeCloseTo(3);
    expect(costUsd("claude-opus-5-5", { input: 0, output: 0, cacheRead: 1_000_000, cacheWrite: 1_000_000 })).toBeCloseTo(0.2 + 5);
    expect(costUsd("claude-haiku-4-5", usage(1_000_000, 0))).toBeCloseTo(1);
    expect(costUsd("some-new-model", usage(1_000_000, 0))).toBeGreaterThanOrEqual(costUsd("claude-opus-5-5", usage(1_000_000, 0)));
  });
});


describe("server budget identity", () => {
  it("self-asserted headers cannot become a metering identity", () => {
    expect(spender(request())).toMatchObject({ learner: null, account: null });
    expect(spender(request()).address).toMatch(/^ip-[a-f0-9]{32}$/);
    expect(JSON.stringify(spender(request()))).not.toContain("203.0.113.9");
  });
  it("anonymous remote requests cannot reserve an allowance", async () => {
    await expect(spendGate(request(), "practice", "en", NOW)).rejects.toThrow();
  });
  it("groups IPv6 addresses by household network", () => {
    expect(addressKey("2001:db8:a:b:1:2:3:4")).toBe("2001:db8:a:b::/64");
    expect(addressKey("2001:DB8:A:B::9")).toBe("2001:db8:a:b::/64");
    expect(addressKey("[2001:db8:0a:000b:ffff::1]:443")).toBe("2001:db8:a:b::/64");
    expect(addressKey("::ffff:203.0.113.9")).toBe("203.0.113.9");
  });
});

describe("the reply over a cap", () => {
  it("uses the learner's language and leaves practice available", async () => {
    const res = budgetReply("talk", "day", "es", null, NOW);
    expect(res.headers.get("x-kaizen-budget")).toBe("day");
    const message = await shown(res);
    expect(message.metadata).toEqual({ budget: "day" });
    expect(message.parts.filter((p) => p.type === "text").map((p) => (p as { text: string }).text)).toEqual([capMessage("talk", "day", "es", NOW)]);
    expect(message.parts.some((p) => p.type.startsWith("tool-"))).toBe(false);
  });
  it("offers a vetted practice card only for a real skill", async () => {
    const message = await shown(budgetReply("talk", "day", "en", { context: { item: { skillId: "m.frac.addlike" } } }, NOW));
    expect(message.parts.find((p) => p.type === "tool-start_practice")).toMatchObject({ input: { skillId: "m.frac.addlike", reason: "" }, output: { offered: true } });
    const invented = await shown(budgetReply("talk", "day", "en", { context: { working: ["invented.skill"] } }, NOW));
    expect(invented.parts.some((p) => p.type.startsWith("tool-"))).toBe(false);
  });
  for (const job of ["practice", "extract", "coach"] as const) it(`gives ${job} a localized 429 with the month's reset date`, async () => {
    const res = budgetReply(job, "month", "es", null, NOW);
    expect(res.status).toBe(429); expect(res.headers.get("x-kaizen-budget")).toBe("month");
    expect(await res.json()).toEqual({ error: "budget", scope: "month", message: capMessage(job, "month", "es", NOW) });
    expect(capMessage(job, "month", "es", NOW)).toContain("1 de noviembre");
  });
  it("gives a course one error event in its existing stream format", async () => {
    const res = budgetReply("course", "day", "es", null, NOW);
    expect(res.headers.get("content-type")).toContain("application/x-ndjson");
    expect(JSON.parse(await res.text())).toEqual({ type: "error", error: "budget", scope: "day", message: capMessage("course", "day", "es", NOW) });
  });
  it("demo mode never needs a budget database", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    expect(await spendGate(request(), "talk")).toBeNull();
  });
});
describe("metered models", () => {
  it("awaits admission before a provider can run", async () => {
    const called = vi.fn(async () => { throw new Error("provider was reached"); });
    const model = metered(new MockLanguageModelV4({ doGenerate: called }), { start: async () => { throw new Error("revoked"); }, usage() {} });
    await expect(generateText({ model, prompt: "hi", maxRetries: 0 })).rejects.toThrow("revoked");
    expect(called).not.toHaveBeenCalled();
  });
  const finish = (input: number, output: number) => ({
    type: "finish" as const,
    finishReason: { unified: "stop" as const, raw: undefined },
    usage: { inputTokens: { total: input, noCache: input - 100, cacheRead: 100, cacheWrite: 0 }, outputTokens: { total: output, text: output, reasoning: undefined } },
  });

  it("reports the provider's token counts for a finished reply", async () => {
    const seen: TokenUsage[] = [];
    let starts = 0;
    const inner = new MockLanguageModelV4({
      modelId: "claude-sonnet-5-5",
      doStream: async () => ({ stream: simulateReadableStream({ chunks: [{ type: "text-start", id: "t" }, { type: "text-delta", id: "t", delta: "What did you try?" }, { type: "text-end", id: "t" }, finish(1200, 40)] }) }),
    });
    const model = metered(inner, { start: () => starts++, usage: (_, u) => seen.push(u) });
    const result = streamText({ model, prompt: "hi" });
    expect(await result.text).toBe("What did you try?");
    expect(starts).toBe(1);
    expect(seen).toEqual([{ input: 1100, output: 40, cacheRead: 100, cacheWrite: 0 }]);
  });

  it("estimates the tokens of a reply stopped before it finished", async () => {
    const seen: TokenUsage[] = [];
    const inner = new MockLanguageModelV4({
      doStream: async () => ({
        stream: new ReadableStream({
          start(c) {
            c.enqueue({ type: "text-start", id: "t" });
            c.enqueue({ type: "text-delta", id: "t", delta: "x".repeat(400) });
          },
        }),
      }),
    });
    const model = metered(inner, { start() {}, usage: (_, u) => seen.push(u) });
    const { stream } = await model.doStream({ prompt: [{ role: "user", content: [{ type: "text", text: "y".repeat(800) }] }] });
    const reader = stream.getReader();
    await reader.read();
    await reader.read();
    await reader.cancel();
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ output: 100, estimated: true });
    expect(seen[0].input).toBeGreaterThanOrEqual(200);
  });
});
