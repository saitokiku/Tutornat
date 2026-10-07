"use client";

import { useEffect, useState } from "react";
import { read } from "@/lib/store";
import { localDate } from "@/planner/dates";

// Which tutor this deployment runs, asked once per page load (per learner), and what the browser
// tells the AI routes about who is asking — never who the learner is.
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
 * Where the browser can't hash (not a secure context) only the date goes; the server then counts by address.
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

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Names that are also everyday words. Written in lowercase they are left alone ("will it work?",
// "the may pole", "ray of light"); capitalized, or after "my name is", they still come out.
const COMMON = new Set(
  "will may grace hope joy rose ray mark bill pat sky river summer june april august faith dawn sunny star rob jack max cash chance hunter page penny ruby ivy lily violet daisy angel sage reed sol luz paz rosa mar flor cielo blanca clara dulce feliz pilar".split(" "),
);

/**
 * Takes a nickname out of text bound for a model, so a child who types their own name doesn't send
 * it. Matches the name in any case ("Ada", "ada"), except a name that is also an everyday word, which
 * matches only as written ("Will", not "will"), or after "my name is", "I'm", "me llamo", "soy".
 */
export function scrubName(text: string, nickname: string): string {
  const name = nickname.trim();
  if (name.length < 2) return text;
  const edge = (s: string) => `(?<![\\p{L}\\p{N}])${s}(?![\\p{L}\\p{N}])`;
  const anyCase = !COMMON.has(name.toLowerCase());
  return text
    .replace(new RegExp(`(my name is|my name's|i am|i'm|im|call me|me llamo|mi nombre es|soy)(\\s+)${edge(escape(name))}`, "giu"), "$1$2[name]")
    .replace(new RegExp(edge(escape(name)), anyCase ? "giu" : "gu"), "[name]");
}

// Fields of an AI request that hold ids, enums, dates or files, never words a person wrote.
const STRUCTURAL = new Set(["id", "messageId", "trigger", "type", "role", "state", "toolCallId", "toolName", "skillId", "skillIds", "working", "kind", "locale", "grade", "surface", "subject", "length", "date", "today", "file", "mediaType", "url"]);

/**
 * Takes every name in `names` (each whole, then each word of three letters or more) out of every
 * string in a JSON value: what a child typed, a homework title, a lesson scene, a goal, interests.
 * Ids, enums, dates and attached files (data: URLs) are left exactly as they are.
 */
export function scrubNames<T>(value: T, names: readonly string[]): T {
  const all = [...new Set(names.flatMap((n) => [n.trim(), ...n.trim().split(/\s+/).filter((w) => w.length >= 3)]).filter((n) => n.length >= 2))].sort((a, b) => b.length - a.length);
  if (!all.length) return value;
  const walk = (v: unknown, key?: string): unknown => {
    if (typeof v === "string") return (key && STRUCTURAL.has(key)) || v.startsWith("data:") ? v : all.reduce(scrubName, v);
    if (Array.isArray(v)) return v.map((x) => walk(x, key));
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x, k)]));
    return v;
  };
  return walk(value) as T;
}

/** Every name kept on this device: each learner's nickname and the grown-ups' display names. */
function familyNames(): string[] {
  const s = read();
  return [...s.profiles.map((p) => p.nickname), ...s.accounts.map((a) => a.displayName)];
}

/**
 * `fetch` for every AI route: adds aiHeaders and takes every family name out of a JSON body
 * (scrubNames), so "My name is Ada" or a homework called "Ada's project" reaches the model as
 * "[name]". Pass it as the chat transport's `fetch`, or call it in place of `fetch`.
 */
export async function aiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  for (const [k, v] of Object.entries(await aiHeaders())) headers.set(k, v);
  let body = init.body;
  if (typeof body === "string") {
    const names = familyNames();
    try {
      body = JSON.stringify(scrubNames(JSON.parse(body) as unknown, names));
    } catch {
      body = scrubNames(body, names);
    }
  }
  return fetch(input, { ...init, headers, body });
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

type Status = { mode: AiMode; budget: AiBudget };
const pending = new Map<string, Promise<Status>>();

function status(): Promise<Status> {
  const { accountId, profileId } = read().session;
  const key = `${accountId}:${profileId}`;
  let p = pending.get(key);
  if (!p) {
    p = aiHeaders()
      .then((headers) => fetch("/api/ai/status", { headers }))
      .then((r) => (r.ok ? r.json() : {}))
      .then((j: { mode?: AiMode; budget?: AiBudget }) => ({ mode: j.mode ?? "demo", budget: j.budget ?? null }))
      .catch(() => ({ mode: "demo" as const, budget: null }));
    pending.set(key, p);
  }
  return p;
}

export const aiStatus = (): Promise<AiMode> => status().then((s) => s.mode);

/** Whether the current learner has reached a spend cap (the demo tutor still works when they have). */
export const aiBudget = (): Promise<AiBudget> => status().then((s) => s.budget);

/** null while unknown. */
export function useAiMode(): AiMode | null {
  const [mode, setMode] = useState<AiMode | null>(null);
  useEffect(() => {
    let live = true;
    aiStatus().then((m) => live && setMode(m));
    return () => {
      live = false;
    };
  }, []);
  return mode;
}

/**
 * The spend cap the current learner has reached ("day" or "month"), else null; null while unknown.
 * Resolves with useAiMode (one request), so a screen can choose the demo tutor before it draws.
 */
export function useAiBudget(): AiBudget {
  const [budget, setBudget] = useState<AiBudget>(null);
  useEffect(() => {
    let live = true;
    aiBudget().then((b) => live && setBudget(b));
    return () => {
      live = false;
    };
  }, []);
  return budget;
}
