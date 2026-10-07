"use client";

import { useEffect, useState } from "react";
import { screen } from "@/lib/ai/safety";
import { read } from "@/lib/store";
import { localDate } from "@/planner/dates";

// Which tutor this deployment runs and whether the learner has reached a spend cap (asked of the
// server, kept a few minutes), and what the browser tells the AI routes about who is asking — never
// who the learner is.
export type AiMode = "anthropic" | "gateway" | "demo";
/** A spend cap the current learner has reached: for today, for this month, or none. */
export type AiBudget = "day" | "month" | null;

async function opaque(kind: "account" | "learner", id: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`kaizenedu:${kind}:${id}`));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

/**
 * Headers for every AI request: one-way hashes of the account and learner ids (never a name), so the
 * server can hold each learner to a daily cap and each family to a monthly one, and the learner's own
 * date, so "back tomorrow" means their tomorrow. `profileId` defaults to the learner signed in now.
 * Where the browser can't hash (not a secure context) only the date goes; the server then holds the
 * request to its address's ceiling alone.
 */
export async function aiHeaders(profileId?: string): Promise<Record<string, string>> {
  const { accountId, profileId: active } = read().session;
  const learner = profileId ?? (active && active !== "parent" ? active : null);
  const headers: Record<string, string> = { "x-kaizen-day": localDate(new Date()) };
  try {
    if (accountId) headers["x-kaizen-account"] = await opaque("account", accountId);
    if (learner) headers["x-kaizen-learner"] = await opaque("learner", learner);
  } catch {
    // crypto.subtle is missing outside https/localhost; the ids are simply not sent.
  }
  return headers;
}

/* ------------------------------------------------------------------ names out of what is sent */

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Names that are also everyday English or Spanish words. Written in lowercase they are left alone
// ("no leo bien", "vamos al parque", "will it work?", "la luna", "3 miles"); capitalized, or after
// "my name is", they come out. Two-letter names (Al, Jo, Ed) are always treated this way.
const EVERYDAY = new Set(
  `leo dan mia art don max ivy ray jay sue pat bob rob tom kit dot bud ace lee ken eve may joy jan sky ash oak fox rex mac jet pip fay
  sol mar paz rey ola rio cal ida ira una luz les ron sal
  will mark bill jack nick frank grant chase chance cash drew dean gene earl duke king prince major bishop deacon porter mason miles hunter
  scout ranger wade lance chip chuck rich buck buddy rocky spike rusty dusty sandy misty sunny stormy storm river brook dale glen cliff lane
  stone clay flint rain raven robin wren lark dove fawn bear wolf colt birch aspen cedar maple fern basil willow rowan hazel olive holly
  heather ivory pearl jade amber crystal ginger honey candy cherry coral ocean harbor haven marina rose ruby lily iris daisy violet poppy
  lilac pansy laurel myrtle blossom sage reed hope faith grace dawn june april august summer autumn winter penny jean carol sterling noble
  royal jewel justice honor valor liberty harmony melody destiny serenity unity trinity mercy patience prudence charity felicity bliss
  precious story journey lyric echo phoenix nova luna aurora atlas mercury venus
  rosa flor cielo blanca clara dulce feliz pilar estrella paloma esperanza caridad gracia dolores mercedes consuelo socorro amparo rocio
  rocío alegria alegría milagros angeles ángeles reyes cruz nieves perla victoria celeste violeta margarita jazmin jazmín azucena lirio linda
  bella bonita preciosa santos angel ángel salvador trinidad concepcion concepción rosario domingo abril julio modesto clemente justo
  benigno amado moreno rubio bravo franco serena soledad lucero reina princesa oliva`.split(/\s+/),
);

// What children call their grown-ups: never taken out. A parent whose display name is "Mom" must not
// turn "my mom hits me" into "my [name] hits me".
const FAMILY = new Set(
  `mom mommy mum mummy mama mamá mami dad daddy papa papá papi abuela abuelo abue grandma grandpa granny nana tía tia tío tio aunt auntie uncle
  mr mrs ms miss sr sra srta señor señora`.split(/\s+/),
);
// Surname particles and little words: never split out of a full name ("Ana Dos Santos" must not turn
// "¿es dos?" into "¿es [name]?", nor "Juan Del Valle" "el área del triángulo").
const PARTICLES = new Set("de del la las los le el dos das da do di du van von der den ten ter y e and the of".split(" "));

// A name stands alone: not inside a longer word, and not the start of a contraction ("don't" is not
// "Don"), though a possessive still counts ("Ada's" is "[name]'s").
const START = "(?<![\\p{L}\\p{N}])";
const END = "(?![\\p{L}\\p{N}])(?!['’](?!s(?![\\p{L}\\p{N}]))\\p{L})";
const SAID = "my name is|my name['’]s|i am|i['’]m|im|call me|me llamo|mi nombre es|me dicen|soy";

/** "Mom", "Dad", "Mom and Dad", "la abuela": words for family, not names. */
function familyWords(name: string) {
  const words = name.toLowerCase().split(/\s+/);
  return words.length === 1 ? FAMILY.has(words[0]) : words.every((w) => FAMILY.has(w) || PARTICLES.has(w));
}

/**
 * Takes a nickname out of text bound for a model, so a child who types their own name doesn't send
 * it. A name of three letters or more that is not an everyday word matches in any case ("Ada", "ada");
 * a two-letter name or an everyday word only capitalized ("Will", not "will"; "Leo", not "no leo
 * bien") or after "my name is", "I'm", "me llamo", "soy". Family words are never taken out.
 */
export function scrubName(text: string, nickname: string): string {
  const name = nickname.trim();
  if (name.length < 2 || familyWords(name)) return text;
  const word = escape(name);
  const out = text.replace(new RegExp(`${START}(${SAID})(\\s+)${START}${word}${END}`, "giu"), "$1$2[name]");
  if ([...name].length >= 3 && !EVERYDAY.has(name.toLowerCase())) return out.replace(new RegExp(`${START}${word}${END}`, "giu"), "[name]");
  const capitalized = escape(name.charAt(0).toUpperCase() + name.slice(1));
  return out.replace(new RegExp(`${START}${capitalized}${END}`, "gu"), "[name]");
}

/**
 * The names to take out: each whole, then each capitalized word of a longer one ("Ana Dos Santos":
 * "Ana", "Santos", never "Dos"; "Ludwig van Beethoven": never "van"). Longest first.
 */
export function namesToScrub(names: readonly string[]): string[] {
  const out = new Set<string>();
  for (const n of names) {
    const whole = n.trim().replace(/\s+/g, " ");
    if (whole.length < 2 || familyWords(whole)) continue;
    out.add(whole);
    const words = whole.split(" ");
    if (words.length > 1) for (const w of words) if (w.length >= 2 && /^\p{Lu}/u.test(w) && !PARTICLES.has(w.toLowerCase()) && !FAMILY.has(w.toLowerCase())) out.add(w);
  }
  return [...out].sort((a, b) => b.length - a.length);
}

// Fields of an AI request that hold ids, enums, dates or files, never words a person wrote.
const STRUCTURAL = new Set(["id", "messageId", "trigger", "type", "role", "state", "toolCallId", "toolName", "skillId", "skillIds", "working", "kind", "locale", "grade", "surface", "subject", "length", "date", "today", "file", "mediaType", "url"]);

/**
 * Takes every name in `names` (see namesToScrub) out of every string in a JSON value: what a child
 * typed, a homework title, a lesson scene, a goal, interests, a file's name. Ids, enums, dates and
 * attached files (data: URLs) are left exactly as they are.
 */
export function scrubNames<T>(value: T, names: readonly string[]): T {
  const list = namesToScrub(names);
  if (!list.length) return value;
  const walk = (v: unknown, key?: string): unknown => {
    if (typeof v === "string") return (key && STRUCTURAL.has(key)) || v.startsWith("data:") ? v : list.reduce(scrubName, v);
    if (Array.isArray(v)) return v.map((x) => walk(x, key));
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x, k)]));
    return v;
  };
  return walk(value) as T;
}

type Said = { role?: unknown; parts?: { type?: unknown; text?: unknown }[] };

/** The learner's last message as typed, when the body is a conversation that ends with one. */
function lastSaid(body: unknown): string | null {
  const messages = (body as { messages?: unknown } | null)?.messages;
  const last = Array.isArray(messages) ? (messages.at(-1) as Said | undefined) : undefined;
  if (last?.role !== "user" || !Array.isArray(last.parts)) return null;
  return last.parts.map((p) => (p?.type === "text" && typeof p.text === "string" ? p.text : "")).join(" ");
}

const caught = (text: string) => screen(text, "en").kind !== "ok";

/**
 * A request body as it leaves the browser: every family name out of every string, except what the
 * server's safety screen reads and catches (the learner's last message to the tutor, a practice
 * topic). That goes exactly as typed, because taking a name out could hide the words the screen looks
 * for ("I don't want to live" from a child called Don), and the server answers it without any model:
 * the fixed referral and a note for the family, or no questions on that topic.
 */
export function scrubBody(body: string, names: readonly string[]): string {
  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch {
    return caught(body) ? body : scrubNames(body, names);
  }
  const out = scrubNames(value, names);
  const said = lastSaid(value);
  if (said !== null && caught(said)) (out as { messages: unknown[] }).messages.splice(-1, 1, (value as { messages: unknown[] }).messages.at(-1));
  const topic = (value as { topic?: unknown } | null)?.topic;
  if (typeof topic === "string" && caught(topic)) (out as { topic: string }).topic = topic;
  return JSON.stringify(out);
}

/** Every name kept on this device: each learner's nickname and the grown-ups' display names. */
function familyNames(): string[] {
  const s = read();
  return [...s.profiles.map((p) => p.nickname), ...s.accounts.map((a) => a.displayName)];
}

/** aiFetch with what it reads from this device passed in: the family's names and the id headers. */
export async function sendAi(input: RequestInfo | URL, init: RequestInit, names: readonly string[], ids: Record<string, string>, send: typeof fetch = fetch): Promise<Response> {
  const headers = new Headers(init.headers);
  for (const [k, v] of Object.entries(ids)) headers.set(k, v);
  const body = typeof init.body === "string" ? scrubBody(init.body, names) : init.body;
  return send(input, { ...init, headers, body });
}

/**
 * `fetch` for every AI route: adds aiHeaders and takes every family name out of a JSON body
 * (scrubBody), so "My name is Ada" or a homework called "Ada's project" reaches the model as
 * "[name]". Pass it as the chat transport's `fetch`, or call it in place of `fetch`. A reply that
 * says a spend cap was reached (x-kaizen-budget) refreshes useAiBudget.
 */
export async function aiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const res = await sendAi(input, init, familyNames(), await aiHeaders());
  if (res.headers.get("x-kaizen-budget")) forgetStatus();
  return res;
}

/**
 * The message an AI route sends when a spend cap is reached (429 { error: "budget", message }), in
 * the language asked for, ready to show in place of a generic failure; null for any other response.
 */
export async function capNotice(res: Response | null | undefined): Promise<string | null> {
  if (res?.status !== 429) return null;
  const j = (await res
    .clone()
    .json()
    .catch(() => null)) as { error?: unknown; message?: unknown } | null;
  return j?.error === "budget" && typeof j.message === "string" ? j.message : null;
}

/* ------------------------------------------------------------------ mode and budget */

type Status = { mode: AiMode; budget: AiBudget };

// One answer per learner, kept five minutes and never past the learner's midnight, so a cap reached
// or lifted shows up without a reload; a capped reply drops it at once (aiFetch).
const STATUS_MS = 5 * 60_000;
let cached: { key: string; day: string; at: number; status: Promise<Status> } | null = null;
const listeners = new Set<() => void>();

function status(): Promise<Status> {
  const { accountId, profileId } = read().session;
  const key = `${accountId}:${profileId}`;
  const now = Date.now();
  const day = localDate(new Date(now));
  if (!cached || cached.key !== key || cached.day !== day || now - cached.at > STATUS_MS) {
    const asked = aiHeaders()
      .then((headers) => fetch("/api/ai/status", { headers }))
      .then((r) => (r.ok ? r.json() : {}))
      .then((j: { mode?: AiMode; budget?: AiBudget }) => ({ mode: j.mode ?? "demo", budget: j.budget ?? null }))
      .catch(() => ({ mode: "demo" as const, budget: null }));
    cached = { key, day, at: now, status: asked };
  }
  return cached.status;
}

/** Asks again on the next read and tells every screen showing the mode or the budget. */
export function forgetStatus() {
  cached = null;
  listeners.forEach((fn) => fn());
}

export const aiStatus = (): Promise<AiMode> => status().then((s) => s.mode);

/** Whether the current learner has reached a spend cap (the demo tutor still works when they have). */
export const aiBudget = (): Promise<AiBudget> => status().then((s) => s.budget);

const modeOf = (s: Status) => s.mode;
const budgetOf = (s: Status) => s.budget;

/** Reads the status, again when a capped reply arrives and when the page comes back into view (past the five minutes or midnight). */
function useStatus<T>(pick: (s: Status) => T): T | null {
  const [value, setValue] = useState<T | null>(null);
  useEffect(() => {
    let live = true;
    const ask = () => void status().then((s) => live && setValue(pick(s)));
    const shown = () => document.visibilityState === "visible" && ask();
    ask();
    listeners.add(ask);
    document.addEventListener("visibilitychange", shown);
    return () => {
      live = false;
      listeners.delete(ask);
      document.removeEventListener("visibilitychange", shown);
    };
  }, [pick]);
  return value;
}

/** null while unknown. */
export const useAiMode = (): AiMode | null => useStatus(modeOf);

/**
 * The spend cap the current learner has reached ("day" or "month"), else null; null while unknown.
 * Comes with useAiMode (one request), so a screen can choose the demo tutor before it draws, and
 * changes when a capped reply arrives.
 */
export const useAiBudget = (): AiBudget => useStatus(budgetOf);
