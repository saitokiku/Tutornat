// @vitest-environment node
import { simulateReadableStream, streamText, type UIMessage } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { metered, type TokenUsage } from "@/lib/ai/config";
import { tutorTurn } from "@/lib/ai/tutor";
import { capMessage, caps, costUsd, meter, overCap, spendGate, spender, spentBy } from "./budget";

// Every test uses its own learner and account ids: the spend store is per process, as in production.
let n = 0;
const id = () => (++n).toString(16).padStart(32, "0").replace(/^0/, "a");
const NOW = Date.UTC(2026, 9, 7, 15); // 7 October 2026, 15:00 UTC

function request(who: { learner?: string; account?: string; day?: string; ip?: string }, body?: unknown) {
  const headers = new Headers({ "content-type": "application/json", "x-forwarded-for": who.ip ?? "203.0.113.9" });
  if (who.learner) headers.set("x-kaizen-learner", who.learner);
  if (who.account) headers.set("x-kaizen-account", who.account);
  if (who.day) headers.set("x-kaizen-day", who.day);
  return new Request("http://localhost/api/tutor", { method: "POST", headers, body: body === undefined ? undefined : JSON.stringify(body) });
}

const usage = (input: number, output: number): TokenUsage => ({ input, output, cacheRead: 0, cacheWrite: 0 });
const user = (text: string): UIMessage => ({ id: "u", role: "user", parts: [{ type: "text", text }] });
const tutorBody = (text: string, locale: "en" | "es" = "en") => ({ messages: [user(text)], context: { locale, grade: "3", surface: "talk" } });

/** Spends `turns` turns for this caller, as the routes do: one meter per request. */
function spend(who: Parameters<typeof request>[0], turns: number, u = usage(0, 0)) {
  for (let i = 0; i < turns; i++) {
    const m = meter(request(who), NOW);
    m.start();
    m.usage("claude-sonnet-5-5", u);
  }
}

beforeEach(() => {
  vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("AI_GATEWAY_API_KEY", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("caps", () => {
  it("have sane defaults and read the environment, ignoring nonsense", () => {
    expect(caps()).toEqual({ dayTurns: 50, dayUsd: 1, monthTurns: 3000, monthUsd: 30 });
    vi.stubEnv("KAIZEN_AI_DAILY_TURNS", "12");
    vi.stubEnv("KAIZEN_AI_MONTHLY_USD", "7.5");
    vi.stubEnv("KAIZEN_AI_DAILY_USD", "lots");
    vi.stubEnv("KAIZEN_AI_MONTHLY_TURNS", "-3");
    expect(caps()).toEqual({ dayTurns: 12, dayUsd: 1, monthTurns: 3000, monthUsd: 7.5 });
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

describe("who is spending", () => {
  it("uses the opaque ids the browser sends, and a hash of the address otherwise", () => {
    const learner = id();
    const account = id();
    expect(spender(request({ learner, account }))).toEqual({ learner, account });
    const anon = spender(request({ learner: "Ada", account: "not-a-hash" }));
    expect(anon.learner).toBe(anon.account);
    expect(anon.account).toMatch(/^ip-[a-f0-9]{32}$/);
    expect(JSON.stringify(anon)).not.toContain("203.0.113.9");
    // A grown-up's request without a learner counts against the account's own day.
    expect(spender(request({ account })).learner).toBe(account);
  });
});

describe("forced caps", () => {
  it("stops a learner at the daily turn cap, and only that learner", () => {
    vi.stubEnv("KAIZEN_AI_DAILY_TURNS", "3");
    const account = id();
    const ada = { learner: id(), account };
    const leo = { learner: id(), account };
    spend(ada, 2);
    expect(overCap(request(ada), NOW)).toBeNull();
    spend(ada, 1);
    expect(overCap(request(ada), NOW)).toBe("day");
    expect(overCap(request(leo), NOW)).toBeNull();
    // The next day it lifts.
    expect(overCap(request(ada), NOW + 86_400_000)).toBeNull();
    expect(spentBy(request(ada), NOW).day.turns).toBe(3);
  });

  it("stops at the daily cost cap from estimated tokens", () => {
    vi.stubEnv("KAIZEN_AI_DAILY_USD", "0.05");
    const who = { learner: id(), account: id() };
    spend(who, 1, usage(10_000, 2_000)); // 0.02 + 0.02 = $0.04
    expect(overCap(request(who), NOW)).toBeNull();
    spend(who, 1, usage(10_000, 2_000));
    expect(overCap(request(who), NOW)).toBe("day");
    expect(spentBy(request(who), NOW).day.tokens).toBe(24_000);
  });

  it("stops the whole family at the monthly cap, and says the month before the day", () => {
    vi.stubEnv("KAIZEN_AI_MONTHLY_TURNS", "4");
    vi.stubEnv("KAIZEN_AI_DAILY_TURNS", "2");
    const account = id();
    spend({ learner: id(), account }, 2);
    spend({ learner: id(), account }, 2);
    expect(overCap(request({ learner: id(), account }), NOW)).toBe("month");
    // Next month it lifts.
    expect(overCap(request({ learner: id(), account }), Date.UTC(2026, 10, 1, 1))).toBeNull();
  });

  it("uses the learner's own date when it is within a day of the server's", () => {
    vi.stubEnv("KAIZEN_AI_DAILY_TURNS", "1");
    const who = { learner: id(), account: id() };
    spend({ ...who, day: "2026-10-06" }, 1); // late evening on the US west coast
    expect(overCap(request({ ...who, day: "2026-10-06" }), NOW)).toBe("day");
    expect(overCap(request({ ...who, day: "2026-10-07" }), NOW)).toBeNull();
    // A date far from the server's is ignored, so it can't be used to reset the day.
    spend({ ...who, day: "2031-01-01" }, 1);
    expect(overCap(request({ ...who, day: "2031-02-02" }), NOW)).toBe("day");
  });

  it("counts one turn per request however many model calls it makes", () => {
    const who = { learner: id(), account: id() };
    const m = meter(request(who), NOW);
    m.start();
    m.start();
    m.usage("claude-sonnet-5-5", usage(1000, 100));
    m.usage("claude-sonnet-5-5", usage(1000, 100));
    expect(spentBy(request(who), NOW).day).toMatchObject({ turns: 1, tokens: 2200 });
  });
});

describe("the reply over a cap", () => {
  it("is the tutor speaking, in the learner's language, saying it is back tomorrow and practice still works", async () => {
    vi.stubEnv("KAIZEN_AI_DAILY_TURNS", "1");
    const who = { learner: id(), account: id() };
    spend(who, 1);
    const res = await spendGate(request(who, tutorBody("how do I add fractions?", "es")), "talk", undefined, NOW);
    expect(res?.status).toBe(200);
    const text = await res!.text();
    expect(text).toContain("Mañana vuelve");
    expect(text).toContain('"budget":"day"');
    expect(text).not.toContain('"flag"');
    expect(capMessage("talk", "day", "en")).toBe("That's all the tutor time for today. The tutor is back tomorrow, and practice still works.");
  });

  it("names the day the month's cap lifts, and is a 429 for the other jobs", async () => {
    vi.stubEnv("KAIZEN_AI_MONTHLY_TURNS", "1");
    const who = { learner: id(), account: id() };
    spend(who, 1);
    const res = await spendGate(request(who, { topic: "volcanoes", locale: "en" }), "practice", "en", NOW);
    expect(res?.status).toBe(429);
    expect(await res!.json()).toEqual({ error: "budget", scope: "month", message: capMessage("practice", "month", "en", NOW) });
    expect(capMessage("course", "month", "en", NOW)).toContain("November 1");
    expect(capMessage("course", "month", "es", NOW)).toContain("1 de noviembre");
  });

  it("still lets a crisis message reach the fixed referral, which needs no model", async () => {
    vi.stubEnv("KAIZEN_AI_DAILY_TURNS", "1");
    const who = { learner: id(), account: id() };
    spend(who, 1);
    const req = request(who, tutorBody("i want to die"));
    expect(await spendGate(req, "talk", undefined, NOW)).toBeNull();
    let called = false;
    const model = new MockLanguageModelV4({
      doStream: async () => {
        called = true;
        throw new Error("no model call");
      },
    });
    const res = await tutorTurn((await req.json()) as never, model);
    expect(await res.text()).toContain("988");
    expect(called).toBe(false);
  });

  it("never applies without a provider: the demo tutor and template lessons have no caps", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("KAIZEN_AI_DAILY_TURNS", "0");
    expect(await spendGate(request({ learner: id(), account: id() }, tutorBody("hi")), "talk", undefined, NOW)).toBeNull();
  });

  it("lets a learner under the caps through", async () => {
    expect(await spendGate(request({ learner: id(), account: id() }, tutorBody("hi")), "talk", undefined, NOW)).toBeNull();
  });
});

describe("metered models", () => {
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
