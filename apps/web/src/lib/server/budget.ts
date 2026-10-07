import "server-only";
import { createHash } from "node:crypto";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import en from "@/i18n/en";
import es from "@/i18n/es";
import { aiMode, type Meter, type TokenUsage } from "@/lib/ai/config";
import { screen } from "@/lib/ai/safety";
import type { Locale } from "@/lib/types";
import { clientAddress } from "./rate";

// Spend caps for every route that calls a model, checked on the server before the model runs.
//
//   per learner, per day      KAIZEN_AI_DAILY_TURNS         (default 50)    KAIZEN_AI_DAILY_USD         (default 1.00)
//   per account, per month    KAIZEN_AI_MONTHLY_TURNS       (default 3000)  KAIZEN_AI_MONTHLY_USD       (default 30.00)
//   per address, per day      KAIZEN_AI_ADDRESS_DAILY_TURNS (default 300)   KAIZEN_AI_ADDRESS_DAILY_USD (default 6.00)
//
// A turn is one request that reached a model (a tutor reply may make several calls; it is one turn).
// Cost is estimated from the provider's own token counts at list price; a call that starts under a
// cap may end a little over it. A cap of 0 turns that AI off. Who is spending comes from opaque
// hashes the browser sends (x-kaizen-learner, x-kaizen-account; see lib/ai/client.ts aiHeaders),
// never a name; without them the caller's address (hashed) stands in for both. Those ids are
// self-asserted until accounts land, so the address ceiling stops one address from adding up past
// it with made-up ids (generous, so a household or a library sharing an address is not cut off), and
// the provider's own monthly limit on the key stays the hard ceiling.
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

/** Who is spending: the opaque ids the browser sends, else the hashed address for both; and the hashed address. */
export function spender(req: Request): { learner: string; account: string; address: string } {
  const opaque = (name: string) => {
    const v = req.headers.get(name)?.trim().toLowerCase();
    return v && OPAQUE.test(v) ? v : null;
  };
  const address = `ip-${createHash("sha256").update(clientAddress(req)).digest("hex").slice(0, 32)}`;
  const account = opaque("x-kaizen-account") ?? address;
  return { learner: opaque("x-kaizen-learner") ?? account, account, address };
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
const spending = new Map<string, Spend>();
const ZERO: Spend = { turns: 0, usd: 0, tokens: 0 };

/** The address ceiling runs on the server's own day, so a browser's date can't stretch it. */
function keysOf(req: Request, now: number) {
  const who = spender(req);
  return { day: `day:${who.learner}:${dayOf(req, now)}`, month: `month:${who.account}:${monthOf(now)}`, address: `addr:${who.address}:${utcDay(now)}` };
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

/** What this learner spent today, their account this month, and their address today. */
export function spentBy(req: Request, now = Date.now()): { day: Spend; month: Spend; address: Spend } {
  const k = keysOf(req, now);
  return { day: spending.get(k.day) ?? ZERO, month: spending.get(k.month) ?? ZERO, address: spending.get(k.address) ?? ZERO };
}

/**
 * The cap this request is over, if any. The month is checked first: it lasts longer and says so.
 * The address ceiling lifts with the day, so it reads as the day's cap.
 */
export function overCap(req: Request, now = Date.now()): Scope | null {
  const c = caps();
  const s = spentBy(req, now);
  if (s.month.turns >= c.monthTurns || s.month.usd >= c.monthUsd) return "month";
  if (s.day.turns >= c.dayTurns || s.day.usd >= c.dayUsd) return "day";
  if (s.address.turns >= c.addressTurns || s.address.usd >= c.addressUsd) return "day";
  return null;
}

/** Counts a request's model calls: one turn when the first call starts, every call's tokens when it ends. */
export function meter(req: Request, now = Date.now()): Meter {
  const k = keysOf(req, now);
  const keys = [k.day, k.month, k.address];
  let started = false;
  return {
    start() {
      if (started) return;
      started = true;
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

type Body = { locale?: unknown; context?: { locale?: unknown }; messages?: { role?: unknown; parts?: { type?: unknown; text?: unknown }[] }[] } | null;

const localeOf = (body: Body): Locale => {
  const l = body?.context?.locale ?? body?.locale;
  return l === "es" ? "es" : "en";
};

function learnerSaid(body: Body) {
  const last = Array.isArray(body?.messages) ? body.messages.at(-1) : undefined;
  if (last?.role !== "user" || !Array.isArray(last.parts)) return "";
  return last.parts.map((p) => (p?.type === "text" && typeof p.text === "string" ? p.text : "")).join(" ");
}

/** The tutor says it in its own voice, streamed like a model reply; metadata.budget tells the browser why. */
function tutorReply(text: string, scope: Scope) {
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      writer.write({ type: "start", messageMetadata: { budget: scope } });
      writer.write({ type: "text-start", id: "budget" });
      writer.write({ type: "text-delta", id: "budget", delta: text });
      writer.write({ type: "text-end", id: "budget" });
      writer.write({ type: "finish" });
    },
  });
  return createUIMessageStreamResponse({ stream, headers: { "cache-control": "no-store" } });
}

/**
 * Null when the request may go on to a model. Otherwise the reply for a learner or family over a cap:
 * the tutor answers in its own voice; other jobs get 429 { error: "budget", scope, message }.
 * The safety screen still wins: a crisis message from a learner over the cap passes through to the
 * fixed referral, which needs no model. `locale` is read from the body when the caller doesn't know it.
 */
export async function spendGate(req: Request, job: Job, locale?: Locale, now = Date.now()): Promise<Response | null> {
  if (aiMode() === "demo") return null;
  const scope = overCap(req, now);
  if (!scope) return null;
  const body: Body = job === "talk" || !locale ? await req.clone().json().catch(() => null) : null;
  const lang = locale ?? localeOf(body);
  if (job === "talk" && screen(learnerSaid(body), lang).kind !== "ok") return null;
  const message = capMessage(job, scope, lang, now);
  if (job === "talk") return tutorReply(message, scope);
  return Response.json({ error: "budget", scope, message }, { status: 429, headers: { "cache-control": "no-store" } });
}
