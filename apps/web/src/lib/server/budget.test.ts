// @vitest-environment node
import { readUIMessageStream, simulateReadableStream, streamText, type UIMessage, type UIMessageChunk } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { aiMode, metered, type TokenUsage } from "@/lib/ai/config";
import { tutorTurn } from "@/lib/ai/tutor";
import { capMessage, caps, costUsd, meter, overCap, overSpend, spendGate, spender, spentBy } from "./budget";
import { addressKey, clientAddress } from "./rate";

// Every test uses its own learner, account and address: the spend store is per process, as in production.
let n = 0;
const id = () => (++n).toString(16).padStart(32, "0").replace(/^0/, "a");
let hosts = 0;
const ip = () => `198.18.${Math.floor(++hosts / 250)}.${hosts % 250}`;
const NOW = Date.UTC(2026, 9, 7, 15); // 7 October 2026, 15:00 UTC

type Who = { learner?: string; account?: string; day?: string; ip?: string };
/** A learner with their own ids and address. */
const person = (more: Who = {}): Who => ({ learner: id(), account: id(), ip: ip(), ...more });

function request(who: Who, body?: unknown) {
  const headers = new Headers({ "content-type": "application/json", "x-forwarded-for": who.ip ?? "203.0.113.9" });
  if (who.learner) headers.set("x-kaizen-learner", who.learner);
  if (who.account) headers.set("x-kaizen-account", who.account);
  if (who.day) headers.set("x-kaizen-day", who.day);
  return new Request("http://localhost/api/tutor", { method: "POST", headers, body: body === undefined ? undefined : JSON.stringify(body) });
}

const usage = (input: number, output: number): TokenUsage => ({ input, output, cacheRead: 0, cacheWrite: 0 });
const user = (text: string): UIMessage => ({ id: "u", role: "user", parts: [{ type: "text", text }] });
const tutorBody = (text: string, locale: "en" | "es" = "en", context: Record<string, unknown> = {}) => ({ messages: [user(text)], context: { locale, grade: "3", surface: "talk", ...context } });

/** Spends `turns` turns for this caller, as the routes do: one meter per request. */
function spend(who: Who, turns: number, u = usage(0, 0)) {
  for (let i = 0; i < turns; i++) {
    const m = meter(request(who), NOW);
    m.start();
    m.usage("claude-sonnet-5-5", u);
  }
}

/** What the browser makes of a streamed tutor reply. */
async function shown(res: Response): Promise<UIMessage> {
  const chunks: UIMessageChunk[] = (await res.text())
    .split("\n")
    .filter((l) => l.startsWith("data: ") && l !== "data: [DONE]")
    .map((l) => JSON.parse(l.slice(6)) as UIMessageChunk);
  let message: UIMessage | undefined;
  for await (const m of readUIMessageStream({ stream: simulateReadableStream({ chunks }) })) message = m;
  return message!;
}

beforeEach(() => {
  vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("AI_GATEWAY_API_KEY", "");
  vi.stubEnv("KAIZEN_AI", "");
});
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
      expect(await spendGate(request(person(), tutorBody("hi")), "talk", undefined, NOW)).toBeNull();
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

describe("who is spending", () => {
  it("uses the opaque ids the browser sends, and no learner or account without them", () => {
    const learner = id();
    const account = id();
    const known = spender(request({ learner, account }));
    expect(known).toMatchObject({ learner, account });
    expect(known.address).toMatch(/^ip-[a-f0-9]{32}$/);
    const anon = spender(request({ learner: "Ada", account: "not-a-hash" }));
    expect(anon).toMatchObject({ learner: null, account: null });
    expect(anon.address).toMatch(/^ip-[a-f0-9]{32}$/);
    expect(JSON.stringify(anon)).not.toContain("203.0.113.9");
    // A grown-up's request without a learner counts against the account's own day.
    expect(spender(request({ account })).learner).toBe(account);
  });

  it("counts an IPv6 caller by its /64, which one household holds whole", () => {
    expect(addressKey("2001:db8:a:b:1:2:3:4")).toBe("2001:db8:a:b::/64");
    expect(addressKey("2001:DB8:A:B::9")).toBe("2001:db8:a:b::/64");
    expect(addressKey("[2001:db8:0a:000b:ffff::1]:443")).toBe("2001:db8:a:b::/64");
    expect(addressKey("fe80::1%en0")).toBe("fe80:0:0:0::/64");
    expect(addressKey("::ffff:203.0.113.9")).toBe("203.0.113.9");
    expect(addressKey("203.0.113.9:51234")).toBe("203.0.113.9");
    expect(addressKey("203.0.113.9")).toBe("203.0.113.9");
    expect(addressKey("not an address")).toBe("not an address");
    const a = spender(request({ ip: "2001:db8:1:2:aaaa::1" })).address;
    expect(spender(request({ ip: "2001:db8:1:2:bbbb:cccc:dddd:eeee" })).address).toBe(a);
    expect(spender(request({ ip: "2001:db8:1:3::1" })).address).not.toBe(a);
    expect(clientAddress(new Request("http://localhost"))).toBe("local");
  });
});

describe("forced caps", () => {
  it("stops a learner at the daily turn cap, and only that learner", () => {
    vi.stubEnv("KAIZEN_AI_DAILY_TURNS", "3");
    const account = id();
    const ada = person({ account });
    const leo = person({ account });
    spend(ada, 2);
    expect(overCap(request(ada), NOW)).toBeNull();
    spend(ada, 1);
    expect(overCap(request(ada), NOW)).toBe("day");
    expect(overCap(request(leo), NOW)).toBeNull();
    // The next day it lifts.
    expect(overCap(request(ada), NOW + 86_400_000)).toBeNull();
    expect(spentBy(request(ada), NOW).day.turns).toBe(3);
  });

  it("holds a request without ids to its address's ceiling alone, never to one learner's cap", async () => {
    vi.stubEnv("KAIZEN_AI_DAILY_TURNS", "1");
    vi.stubEnv("KAIZEN_AI_MONTHLY_TURNS", "1");
    vi.stubEnv("KAIZEN_AI_ADDRESS_DAILY_TURNS", "60");
    // A classroom behind one address, whose browsers send no ids.
    const room = { ip: ip() };
    spend(room, 1);
    expect(overCap(request(room), NOW)).toBeNull();
    expect(await spendGate(request(room, tutorBody("what is a fraction?")), "talk", undefined, NOW)).toBeNull();
    spend(room, 58);
    expect(spentBy(request(room), NOW)).toMatchObject({ day: { turns: 0 }, month: { turns: 0 }, address: { turns: 59 } });
    // The request that just passed the gate holds the sixtieth turn until its model call counts.
    expect(overCap(request(room), NOW)).toBe("day");
  });

  it("lets sixty anonymous turns from one address through under the default caps", () => {
    const room = { ip: ip() };
    spend(room, 60);
    expect(overCap(request(room), NOW)).toBeNull();
  });

  it("stops at the daily cost cap from estimated tokens", () => {
    vi.stubEnv("KAIZEN_AI_DAILY_USD", "0.05");
    const who = person();
    spend(who, 1, usage(10_000, 2_000)); // 0.02 + 0.02 = $0.04
    expect(overCap(request(who), NOW)).toBeNull();
    expect(overSpend(request(who), NOW)).toBeNull();
    spend(who, 1, usage(10_000, 2_000));
    expect(overCap(request(who), NOW)).toBe("day");
    expect(overSpend(request(who), NOW)).toBe("day");
    expect(spentBy(request(who), NOW).day.tokens).toBe(24_000);
  });

  it("stops the whole family at the monthly cap, and says the month before the day", () => {
    vi.stubEnv("KAIZEN_AI_MONTHLY_TURNS", "4");
    vi.stubEnv("KAIZEN_AI_DAILY_TURNS", "2");
    const account = id();
    spend(person({ account }), 2);
    spend(person({ account }), 2);
    expect(overCap(request(person({ account })), NOW)).toBe("month");
    // Next month it lifts.
    expect(overCap(request(person({ account })), Date.UTC(2026, 10, 1, 1))).toBeNull();
  });

  it("uses the learner's own date when it is within a day of the server's", () => {
    vi.stubEnv("KAIZEN_AI_DAILY_TURNS", "1");
    const who = person();
    spend({ ...who, day: "2026-10-06" }, 1); // late evening on the US west coast
    expect(overCap(request({ ...who, day: "2026-10-06" }), NOW)).toBe("day");
    expect(overCap(request({ ...who, day: "2026-10-07" }), NOW)).toBeNull();
    // A date far from the server's is ignored, so it can't be used to reset the day.
    spend({ ...who, day: "2031-01-01" }, 1);
    expect(overCap(request({ ...who, day: "2031-02-02" }), NOW)).toBe("day");
  });

  it("holds one address to its ceiling however many made-up ids it sends, on the server's own day", async () => {
    vi.stubEnv("KAIZEN_AI_ADDRESS_DAILY_TURNS", "5");
    const at = ip();
    // Five requests, each with fresh ids and a different claimed date, all from one address.
    for (const day of ["2026-10-06", "2026-10-07", "2026-10-08", "2026-10-07", "2026-10-06"]) spend(person({ day, ip: at }), 1);
    const fresh = person({ ip: at });
    expect(spentBy(request(fresh), NOW)).toMatchObject({ day: { turns: 0 }, month: { turns: 0 }, address: { turns: 5 } });
    expect(overCap(request(fresh), NOW)).toBe("day");
    const res = await spendGate(request(fresh, tutorBody("what is a fraction?")), "talk", undefined, NOW);
    expect(await res!.text()).toContain(capMessage("talk", "day", "en"));
    // Another address is not held back, and the next day the ceiling lifts.
    expect(overCap(request({ ...fresh, ip: ip() }), NOW)).toBeNull();
    expect(overCap(request(fresh), NOW + 86_400_000)).toBeNull();
  });

  it("stops one address at its daily cost ceiling too", () => {
    vi.stubEnv("KAIZEN_AI_ADDRESS_DAILY_USD", "0.10");
    const at = ip();
    spend(person({ ip: at }), 3, usage(10_000, 2_000)); // 3 × $0.04
    expect(overCap(request(person({ ip: at })), NOW)).toBe("day");
  });

  it("forgets past periods once the store grows, and never today's or a later one", () => {
    const OLD = NOW - 40 * 86_400_000; // late August
    const today = person();
    spend(today, 1);
    const old = person();
    for (let i = 0; i < 12_000; i++) meter(request({ ...old, learner: id(), account: id() }), OLD).start();
    meter(request(old), OLD).start();
    // A prune that ran while August requests were still writing kept October.
    expect(spentBy(request(today), NOW).day.turns).toBe(1);
    expect(spentBy(request(old), OLD).day.turns).toBe(1);
    // Enough new writes today to prune again: August goes, October stays.
    for (let i = 0; i < 12_000; i++) meter(request({ ...today, learner: id(), account: id() }), NOW).start();
    expect(spentBy(request(old), OLD)).toMatchObject({ day: { turns: 0 }, month: { turns: 0 }, address: { turns: 0 } });
    expect(spentBy(request(today), NOW).day.turns).toBe(1);
    expect(spentBy(request(today), NOW).address.turns).toBe(12_001);
  });

  it("counts one turn per request however many model calls it makes", () => {
    const who = person();
    const m = meter(request(who), NOW);
    m.start();
    m.start();
    m.usage("claude-sonnet-5-5", usage(1000, 100));
    m.usage("claude-sonnet-5-5", usage(1000, 100));
    expect(spentBy(request(who), NOW).day).toMatchObject({ turns: 1, tokens: 2200 });
  });
});

describe("requests sent at the same moment", () => {
  it("each hold a turn from the gate, so they can't all slip under the cap together", async () => {
    vi.stubEnv("KAIZEN_AI_DAILY_TURNS", "2");
    const who = person();
    const sent = [0, 1, 2].map(() => request(who, { topic: "volcanoes", locale: "en" }));
    const gates = [];
    for (const r of sent) gates.push(await spendGate(r, "practice", "en", NOW));
    expect(gates.map((g) => g?.status ?? "through")).toEqual(["through", "through", 429]);
    // The first model call turns its hold into a turn: still two in all.
    meter(sent[0], NOW).start();
    expect(spentBy(request(who), NOW).day.turns).toBe(1);
    expect(overCap(request(who), NOW)).toBe("day");
    // A hold whose request never reached a model lets go after two minutes.
    expect(overCap(request(who), NOW + 121_000)).toBeNull();
  });

  it("never hold or refuse a message the safety screen answers without a model", async () => {
    vi.stubEnv("KAIZEN_AI_DAILY_TURNS", "1");
    const who = person();
    for (let i = 0; i < 3; i++) expect(await spendGate(request(who, tutorBody("i want to die")), "talk", undefined, NOW)).toBeNull();
    expect(overCap(request(who), NOW)).toBeNull();
  });
});

describe("the reply over a cap", () => {
  it("is the tutor speaking, in the learner's language, saying it is back tomorrow and practice still works", async () => {
    vi.stubEnv("KAIZEN_AI_DAILY_TURNS", "1");
    const who = person();
    spend(who, 1);
    const res = await spendGate(request(who, tutorBody("how do I add fractions?", "es")), "talk", undefined, NOW);
    expect(res?.status).toBe(200);
    expect(res!.headers.get("x-kaizen-budget")).toBe("day");
    const message = await shown(res!);
    expect(message.metadata).toEqual({ budget: "day" });
    expect(message.parts.filter((p) => p.type === "text").map((p) => (p as { text: string }).text)).toEqual([capMessage("talk", "day", "es")]);
    expect(capMessage("talk", "day", "es")).toContain("Mañana vuelve");
    expect(capMessage("talk", "day", "en")).toBe("That's all the tutor time for today. The tutor is back tomorrow, and practice still works.");
    // Nothing to practice was named, so no card.
    expect(message.parts.some((p) => p.type.startsWith("tool-"))).toBe(false);
  });

  it("puts the practice card for the skill on screen on the board, one tap away", async () => {
    vi.stubEnv("KAIZEN_AI_DAILY_TURNS", "1");
    const who = person();
    spend(who, 1);
    const onScreen = await shown((await spendGate(request(who, tutorBody("hint please", "en", { surface: "practice", item: { skillId: "m.frac.addlike", level: 1, seed: 3 } })), "talk", undefined, NOW))!);
    expect(onScreen.parts.find((p) => p.type === "tool-start_practice")).toMatchObject({ state: "output-available", input: { skillId: "m.frac.addlike", reason: "" }, output: { offered: true } });
    // Without a problem on screen, the skill they worked on last; a made-up id offers nothing.
    const recent = await shown((await spendGate(request(who, tutorBody("hi", "en", { working: ["m.mult.facts"] })), "talk", undefined, NOW))!);
    expect(recent.parts.find((p) => p.type === "tool-start_practice")).toMatchObject({ input: { skillId: "m.mult.facts" } });
    const madeUp = await shown((await spendGate(request(who, tutorBody("hi", "en", { working: ["not.a.skill"] })), "talk", undefined, NOW))!);
    expect(madeUp.parts.some((p) => p.type.startsWith("tool-"))).toBe(false);
  });

  it("names the day the month's cap lifts, and is a 429 for questions, school papers and the weekly note", async () => {
    vi.stubEnv("KAIZEN_AI_MONTHLY_TURNS", "1");
    const who = person();
    spend(who, 1);
    for (const job of ["practice", "extract", "coach"] as const) {
      const res = await spendGate(request(who, { topic: "volcanoes", locale: "en" }), job, "en", NOW);
      expect(res?.status).toBe(429);
      expect(res!.headers.get("x-kaizen-budget")).toBe("month");
      expect(await res!.json()).toEqual({ error: "budget", scope: "month", message: capMessage(job, "month", "en", NOW) });
    }
    expect(capMessage("course", "month", "en", NOW)).toContain("November 1");
    expect(capMessage("course", "month", "es", NOW)).toContain("1 de noviembre");
  });

  it("is one error event in the course stream, which the course screen already reads", async () => {
    vi.stubEnv("KAIZEN_AI_DAILY_TURNS", "1");
    const who = person();
    spend(who, 1);
    const res = (await spendGate(request(who), "course", "es", NOW))!;
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/x-ndjson");
    expect(res.headers.get("x-kaizen-budget")).toBe("day");
    expect(JSON.parse(await res.text())).toEqual({ type: "error", error: "budget", scope: "day", message: capMessage("course", "day", "es", NOW) });
  });

  it("reads the language from the body when the route doesn't know it", async () => {
    vi.stubEnv("KAIZEN_AI_DAILY_TURNS", "1");
    const who = person();
    spend(who, 1);
    const res = (await spendGate(request(who, { kind: "syllabus", locale: "es" }), "extract", undefined, NOW))!;
    expect(((await res.json()) as { message: string }).message).toBe(capMessage("extract", "day", "es", NOW));
  });

  it("still lets a crisis message reach the fixed referral, which needs no model", async () => {
    vi.stubEnv("KAIZEN_AI_DAILY_TURNS", "1");
    const who = person();
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
    vi.stubEnv("KAIZEN_AI_DAILY_TURNS", "1");
    const who = person();
    spend(who, 3);
    expect(await spendGate(request(who, tutorBody("hi")), "talk", undefined, NOW)).toBeNull();
  });

  it("lets a learner under the caps through", async () => {
    expect(await spendGate(request(person(), tutorBody("hi")), "talk", undefined, NOW)).toBeNull();
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
