import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import en from "@/i18n/en";
import es from "@/i18n/es";
import { aiMode, type Meter, type TokenUsage } from "@/lib/ai/config";
import { screen } from "@/lib/ai/safety";
import type { Locale } from "@/lib/types";
import { getSkill } from "@/practice/skills";
import { LearningAuthorizationError, principalOf } from "./authorize";
import { createBudgetLedger } from "./budget-ledger";
import { getDb } from "./db/client";
import { clientAddress } from "./rate";

// Provider budgets live in Postgres under cookie-derived server IDs. UTC periods cannot be reset by
// a browser date. A reservation lasts two minutes; admission counts a turn before the provider call,
// including a failed call, while token costs settle from provider usage (estimated on early stop).
// No database means demo only. Failed or unauthorized requests cannot reserve remote work.

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

/** Metering identity is resolved by the account cookie; header hashes are references only. */
export function spender(req: Request) {
  const p = principalOf(req);
  return { learner: p?.learnerId ?? p?.accountId ?? null, account: p?.accountId ?? null, address: `ip-${createHash("sha256").update(clientAddress(req)).digest("hex").slice(0, 32)}` };
}
const principal = (req: Request) => {
  const p = principalOf(req);
  if (!p || !p.learnerId || (p.authority !== "adult-self" && p.authority !== "authorized-guardian")) throw new LearningAuthorizationError(403, "capability");
  return p;
};
async function ledger() { return createBudgetLedger(await getDb(), caps()); }
const reservations = new WeakMap<Request, string>();

export async function spentBy(req: Request, now = Date.now()) {
  return (await ledger()).spent(principal(req), spender(req).address, now);
}
export async function overCap(req: Request, now = Date.now()) {
  return (await ledger()).overCap(principal(req), spender(req).address, now);
}
export async function overSpend(req: Request, now = Date.now()) {
  return (await ledger()).overSpend(principal(req), spender(req).address, now);
}

/** Every model call rechecks live authority before network access, even later calls in a course. */
export function meter(req: Request, now?: number): Meter {
  return {
    async start() {
      const p = principal(req);
      const id = reservations.get(req);
      if (!id || req.signal.aborted) throw new LearningAuthorizationError(403, "reservation");
      await (await ledger()).start(id, p, now ?? Date.now());
    },
    async usage(modelId, u) {
      const id = reservations.get(req);
      if (!id) throw new LearningAuthorizationError(403, "reservation");
      await (await ledger()).usage(id, costUsd(modelId, u), u.input + u.output + u.cacheRead + u.cacheWrite);
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
  const reservation = await (await ledger()).reserve(principal(req), spender(req).address, now);
  if (reservation.ok) { reservations.set(req, reservation.id); return null; }
  return budgetReply(job, reservation.scope, lang, body, now);
}

/** Same response shapes for budget refusals, independently testable without calling a provider. */
export function budgetReply(job: Job, scope: Scope, lang: Locale, body: Body = null, now = Date.now()): Response {
  const message = capMessage(job, scope, lang, now);
  if (job === "talk") return tutorReply(message, scope, practiceSkill(body));
  if (job === "course")
    return new Response(`${JSON.stringify({ type: "error", error: "budget", scope, message })}\n`, { headers: { "content-type": "application/x-ndjson; charset=utf-8", ...capHeaders(scope) } });
  return Response.json({ error: "budget", scope, message }, { status: 429, headers: capHeaders(scope) });
}
