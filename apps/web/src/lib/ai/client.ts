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

/**
 * Takes the learner's nickname out of text bound for a model, so a child who types their own name
 * doesn't send it. Matches the name as written ("Ada"), and in any case after "my name is", "I'm",
 * "me llamo", "soy"; a lowercase common word that happens to be a name ("will") is left alone.
 */
export function scrubName(text: string, nickname: string): string {
  const name = nickname.trim();
  if (name.length < 2) return text;
  const edge = (s: string) => `(?<![\\p{L}\\p{N}])${s}(?![\\p{L}\\p{N}])`;
  return text
    .replace(new RegExp(`(my name is|my name's|i am|i'm|im|call me|me llamo|mi nombre es|soy)(\\s+)${edge(escape(name))}`, "giu"), "$1$2[name]")
    .replace(new RegExp(edge(escape(name)), "gu"), "[name]");
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
