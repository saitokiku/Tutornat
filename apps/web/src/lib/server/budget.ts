import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import en from "@/i18n/en";
import es from "@/i18n/es";
import { aiMode, type Meter, type TokenUsage } from "@/lib/ai/config";
import { screen } from "@/lib/ai/safety";
import type { Locale } from "@/lib/types";
import { getSkill } from "@/practice/skills";
import { clientAddress } from "./rate";

// Spend caps for every route that calls a model, checked on the server before the model runs.
//
//   per learner, per day      KAIZEN_AI_DAILY_TURNS         (default 50)    KAIZEN_AI_DAILY_USD         (default 1.00)
//   per account, per month    KAIZEN_AI_MONTHLY_TURNS       (default 3000)  KAIZEN_AI_MONTHLY_USD       (default 30.00)
//   per address, per day      KAIZEN_AI_ADDRESS_DAILY_TURNS (default 300)   KAIZEN_AI_ADDRESS_DAILY_USD (default 6.00)
//
// A turn is one request that reached a model (a tutor reply may make several calls; it is one turn).
// A request holds its turn from the moment it passes the gate until its first model call is counted
// (at most two minutes), so requests sent at the same moment can't all slip under a cap. Cost is
// estimated from the provider's own token counts at list price: a reply that starts under a cost cap
// may end a little over it, and a course stops between lessons once one is reached.
//
// Who is spending comes from opaque hashes the browser sends (x-kaizen-learner, x-kaizen-account; see
// lib/ai/client.ts aiFetch), never a name. The learner and account caps apply only to those ids. A
// request without them is held to its address's ceiling alone, so a classroom, a library or a phone
// carrier's shared address is not cut off at one learner's allowance. The ids are self-asserted until
// accounts land, so the address ceiling also stops one address from adding up past it with made-up
// ids; it runs on the server's own day so a claimed date can't stretch it (for US families it lifts
// in the evening, sooner than the "tomorrow" its message promises). The provider's own monthly limit
// on the key stays the hard ceiling. A cap of 0 turns the AI off for the site (lib/ai/config.ts).
// The demo tutor and everything without a model never touch this.
//
// ponytail: in-memory per server instance, like rate.ts. Moves to the database (one spend row per
// key and period) when the backend lands, which also makes the caps hold across instances.

export type Job = "talk" | "course" | "practice" | "extract" | "coach";
export type Scope = "day" | "month";

const setting = (name: string, fallback: number) => {
  const raw = process.env[name]?.trim();
  const v = raw ? Number(raw) : NaN;
  return Number.isFinite(v) && v >= 0 ? v : fallback;
};

/** The caps in force, from the environment (read per check, so tests and new deploys see changes). */
export function caps() {
  return {
    dayTurns: setting("KAIZEN_AI_DAILY_TURNS", 50),
    dayUsd: setting("KAIZEN_AI_DAILY_USD", 1),
    monthTurns: setting("KAIZEN_AI_MONTHLY_TURNS", 3000),
    monthUsd: setting("KAIZEN_AI_MONTHLY_USD", 30),
    addressTurns: setting("KAIZEN_AI_ADDRESS_DAILY_TURNS", 300),
    addressUsd: setting("KAIZEN_AI_ADDRESS_DAILY_USD", 6),
  };
}

// List prices in US dollars per million tokens (Anthropic, September 2026): input, output, cache
// read, cache write (5-minute, 1.25 x input). A model not listed is priced at the top tier, so an
// estimate never runs low.
const PRICES: Record<string, [number, number, number, number]> = {
  "claude-opus-5-5": [4, 20, 0.2, 5],
  "claude-sonnet-5-5": [2, 10, 0.2, 2.5],
  "claude-haiku-4-5": [1, 5, 0.1, 1.25],
};
const TOP: [number, number, number, number] = [10, 50, 1, 12.5];

/** Estimated cost of one call. Gateway ids ("anthropic/claude-sonnet-5.5") price as the direct ids. */
export function costUsd(modelId: string, u: TokenUsage): number {
  const [i, o, r, w] = PRICES[modelId.replace(/^anthropic\//, "").replace(/\./g, "-")] ?? TOP;
  return (u.input * i + u.output * o + u.cacheRead * r + u.cacheWrite * w) / 1e6;
}

const OPAQUE = /^[a-f0-9]{32,64}$/;

/**
 * Who is spending: the opaque learner and account ids the browser sends (a grown-up's request without
 * a learner spends on the account's own day), null where none came; and the hashed address.
 */
export function spender(req: Request): { learner: string | null; account: string | null; address: string } {
  const opaque = (name: string) => {
    const v = req.headers.get(name)?.trim().toLowerCase();
    return v && OPAQUE.test(v) ? v : null;
  };
  const account = opaque("x-kaizen-account");
  return {
    learner: opaque("x-kaizen-learner") ?? account,
    account,
    address: `ip-${createHash("sha256").update(clientAddress(req)).digest("hex").slice(0, 32)}`,
  };
}

const utcDay = (now: number) => new Date(now).toISOString().slice(0, 10);

/** The learner's own date when the browser sends one within a day of the server's, so "tomorrow" means their tomorrow. */
function dayOf(req: Request, now: number) {
  const local = req.headers.get("x-kaizen-day");
  if (local && /^\d{4}-\d{2}-\d{2}$/.test(local) && Math.abs(Date.parse(local) - Date.parse(utcDay(now))) <= 86_400_000) return local;
  return utcDay(now);
}

const monthOf = (now: number) => new Date(now).toISOString().slice(0, 7);

type Spend = { turns: number; usd: number; tokens: number };
type Keys = { day: string | null; month: string | null; address: string };
const spending = new Map<string, Spend>();
const ZERO: Spend = { turns: 0, usd: 0, tokens: 0 };

/** The periods a request counts toward: its learner's day and account's month (only with real ids), its address's day. */
function keysOf(req: Request, now: number): Keys {
  const who = spender(req);
  return {
    day: who.learner && `day:${who.learner}:${dayOf(req, now)}`,
    month: who.account && `month:${who.account}:${monthOf(now)}`,
    address: `addr:${who.address}:${utcDay(now)}`,
  };
}
const all = (k: Keys) => [k.day, k.month, k.address].filter((x): x is string => !!x);

// Requests that passed the gate and have not made their first model call yet.
const HOLD_MS = 120_000;
const holds = new Map<string, number[]>();
const held = new WeakMap<Request, { keys: string[]; at: number }>();

function holding(key: string | null, now: number) {
  if (!key) return 0;
  const live = (holds.get(key) ?? []).filter((t) => now - t < HOLD_MS);
  if (live.length) holds.set(key, live);
  else holds.delete(key);
  return live.length;
}

function hold(req: Request, now: number) {
  const keys = all(keysOf(req, now));
  for (const k of keys) holds.set(k, [...(holds.get(k) ?? []), now]);
  held.set(req, { keys, at: now });
  if (holds.size > pruneAt) for (const k of holds.keys()) holding(k, now);
}

function release(req: Request) {
  const h = held.get(req);
  if (!h) return;
  held.delete(req);
  for (const k of h.keys) {
    const list = holds.get(k) ?? [];
    const i = list.indexOf(h.at);
    if (i >= 0) list.splice(i, 1);
    if (!list.length) holds.delete(k);
  }
}

let pruneAt = 20_000;

/**
 * Drops days before yesterday and months before this one. Only older periods go: a request that
 * started before midnight and ends after it must not wipe the new day's spending.
 */
function prune(now: number) {
  const month = monthOf(now);
  const yesterday = utcDay(now - 86_400_000);
  for (const k of spending.keys()) {
    const period = k.slice(k.lastIndexOf(":") + 1);
    if (k.startsWith("month:") ? period < month : period < yesterday) spending.delete(k);
  }
  pruneAt = Math.max(20_000, spending.size * 2);
}

function add(key: string, d: Partial<Spend>, now: number) {
  const s = spending.get(key) ?? ZERO;
  spending.set(key, { turns: s.turns + (d.turns ?? 0), usd: s.usd + (d.usd ?? 0), tokens: s.tokens + (d.tokens ?? 0) });
  if (spending.size > pruneAt) prune(now);
}

const spentOn = (key: string | null) => (key && spending.get(key)) || ZERO;

/** What this learner spent today, their account this month, and their address today (zero where no id came). */
export function spentBy(req: Request, now = Date.now()): { day: Spend; month: Spend; address: Spend } {
  const k = keysOf(req, now);
  return { day: spentOn(k.day), month: spentOn(k.month), address: spentOn(k.address) };
}

/**
 * The cap this request is over, if any, counting requests still waiting for their first model call.
 * The month is checked first: it lasts longer and says so. The address ceiling lifts with the day,
 * so it reads as the day's cap.
 */
export function overCap(req: Request, now = Date.now()): Scope | null {
  const c = caps();
  const k = keysOf(req, now);
  const over = (key: string | null, turns: number, usd: number) => !!key && (spentOn(key).turns + holding(key, now) >= turns || spentOn(key).usd >= usd);
  if (over(k.month, c.monthTurns, c.monthUsd)) return "month";
  if (over(k.day, c.dayTurns, c.dayUsd)) return "day";
  if (over(k.address, c.addressTurns, c.addressUsd)) return "day";
  return null;
}

/** The cost cap reached since a long job (a course) began, if any: it stops between steps on it. */
export function overSpend(req: Request, now = Date.now()): Scope | null {
  const c = caps();
  const k = keysOf(req, now);
  if (spentOn(k.month).usd >= c.monthUsd) return "month";
  if (spentOn(k.day).usd >= c.dayUsd || spentOn(k.address).usd >= c.addressUsd) return "day";
  return null;
}

/** Counts a request's model calls: one turn when the first call starts (ending its hold), every call's tokens when it ends. */
export function meter(req: Request, now = Date.now()): Meter {
  const keys = all(keysOf(req, now));
  let started = false;
  return {
    start() {
      if (started) return;
      started = true;
      release(req);
      for (const key of keys) add(key, { turns: 1 }, now);
    },
    usage(modelId, u) {
      const d = { usd: costUsd(modelId, u), tokens: u.input + u.output + u.cacheRead + u.cacheWrite };
      for (const key of keys) add(key, d, now);
    },
  };
}

const TEXT = { en, es };
const JOB_KEY = { talk: "tutor", course: "course", practice: "practice", extract: "extract", coach: "coach" } as const;

function nextMonth(now: number) {
  const d = new Date(now);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
}

/** The kind, specific line a learner or grown-up sees when a cap is reached, in their language. */
export function capMessage(job: Job, scope: Scope, locale: Locale, now = Date.now()): string {
  const date = new Intl.DateTimeFormat(locale === "es" ? "es-US" : "en-US", { month: "long", day: "numeric", timeZone: "UTC" }).format(nextMonth(now));
  return TEXT[locale][`ai.budget.${JOB_KEY[job]}.${scope}`].replace("{date}", date);
}

type Body = {
  locale?: unknown;
  context?: { locale?: unknown; item?: { skillId?: unknown }; working?: unknown };
  messages?: { role?: unknown; parts?: { type?: unknown; text?: unknown }[] }[];
} | null;

const localeOf = (body: Body): Locale => {
  const l = body?.context?.locale ?? body?.locale;
  return l === "es" ? "es" : "en";
};

function learnerSaid(body: Body) {
  const last = Array.isArray(body?.messages) ? body.messages.at(-1) : undefined;
  if (last?.role !== "user" || !Array.isArray(last.parts)) return "";
  return last.parts.map((p) => (p?.type === "text" && typeof p.text === "string" ? p.text : "")).join(" ");
}

/** The skill on screen, else the one the learner worked on last: what "practice still works" can open. */
function practiceSkill(body: Body): string | null {
  const ctx = body?.context;
  const id = ctx?.item?.skillId ?? (Array.isArray(ctx?.working) ? ctx.working[0] : undefined);
  return typeof id === "string" && getSkill(id) ? id : null;
}

const capHeaders = (scope: Scope) => ({ "cache-control": "no-store", "x-kaizen-budget": scope });

/**
 * The tutor says it in its own voice, streamed like a model reply; metadata.budget tells the browser
 * why. With a skill to hand, the reply also puts the practice card on the board (TutorChat draws
 * start_practice), so practice is one tap away for a child who doesn't read the line.
 */
function tutorReply(text: string, scope: Scope, skillId: string | null) {
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      writer.write({ type: "start", messageMetadata: { budget: scope } });
      writer.write({ type: "text-start", id: "budget" });
      writer.write({ type: "text-delta", id: "budget", delta: text });
      writer.write({ type: "text-end", id: "budget" });
      if (skillId) {
        const toolCallId = `budget-${randomUUID()}`;
        writer.write({ type: "tool-input-available", toolCallId, toolName: "start_practice", input: { skillId, reason: "" } });
        writer.write({ type: "tool-output-available", toolCallId, output: { offered: true } });
      }
      writer.write({ type: "finish" });
    },
  });
  return createUIMessageStreamResponse({ stream, headers: capHeaders(scope) });
}

/**
 * Null when the request may go on to a model; it then holds its turn until its first call counts.
 * Otherwise the reply for a learner or family over a cap: the tutor answers in its own voice, the
 * course writer streams one error event with the message (its reader already shows stream errors),
 * other jobs get 429 { error: "budget", scope, message }. Every capped reply carries x-kaizen-budget.
 * The safety screen wins: a crisis, abuse or off-limits message passes through, uncounted, to the
 * fixed reply, which needs no model. `locale` is read from the body when the caller doesn't know it.
 */
export async function spendGate(req: Request, job: Job, locale?: Locale, now = Date.now()): Promise<Response | null> {
  if (aiMode() === "demo") return null;
  const body: Body = job === "talk" || !locale ? await req.clone().json().catch(() => null) : null;
  const lang = locale ?? localeOf(body);
  if (job === "talk" && screen(learnerSaid(body), lang).kind !== "ok") return null;
  const scope = overCap(req, now);
  if (!scope) return (hold(req, now), null);
  const message = capMessage(job, scope, lang, now);
  if (job === "talk") return tutorReply(message, scope, practiceSkill(body));
  if (job === "course")
    return new Response(`${JSON.stringify({ type: "error", error: "budget", scope, message })}\n`, { headers: { "content-type": "application/x-ndjson; charset=utf-8", ...capHeaders(scope) } });
  return Response.json({ error: "budget", scope, message }, { status: 429, headers: capHeaders(scope) });
}
