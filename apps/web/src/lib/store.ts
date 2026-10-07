"use client";

import { useSyncExternalStore } from "react";
import type { Attempt, PracticeSet, SkillReview, TeachingAct } from "@/learning/types";
import type { Feedback, PlanDone, ReadingEntry, SchoolClass, SchoolEvent, SchoolResult, TutorThread } from "@/planner/types";
import { captureLocal, ensureStarted, forgetDevice } from "./sync";
import type { Account, ActivityEvent, Course, Locale, ParentNote, Profile } from "./types";

// One versioned document in localStorage, and the working copy every screen reads. lib/* functions
// are the only writers. Browser-only (no server): this is the whole record. With a server
// (lib/sync.ts): every local write is handed to sync, which queues what changed and keeps the copy
// in step with the family's record on the server; the server's changes come back in through
// applyRemote, which is not queued again.
// ponytail: whole-document writes; fine for a family-sized store.

export const STORE_KEY = "kaizenedu.v1";

export type StoreState = {
  version: 1;
  accounts: Account[];
  profiles: Profile[];
  courses: Course[];
  activity: ActivityEvent[];
  notes: ParentNote[];
  resets: { token: string; accountId: string; expires: number }[];
  attempts: Attempt[];
  sets: PracticeSet[];
  events: SchoolEvent[];
  classes: SchoolClass[];
  feedback: Feedback[];
  results: SchoolResult[];
  planDone: PlanDone[];
  reading: ReadingEntry[];
  threads: TutorThread[];
  acts: TeachingAct[];
  reviews: SkillReview[];
  /** unlocked: a grown-up proved themselves (signed in, or passed the gate) since a child last took over. */
  session: { accountId: string | null; profileId: string | "parent" | null; unlocked?: boolean };
  prefs: { locale: Locale };
};

export type StoreHealth = "ok" | "reset" | "memory";

export const emptyState = (): StoreState => ({
  version: 1,
  accounts: [],
  profiles: [],
  courses: [],
  activity: [],
  notes: [],
  resets: [],
  attempts: [],
  sets: [],
  events: [],
  classes: [],
  feedback: [],
  results: [],
  planDone: [],
  reading: [],
  threads: [],
  acts: [],
  reviews: [],
  session: { accountId: null, profileId: null },
  prefs: { locale: "en" },
});

const SERVER_SNAPSHOT = emptyState();
let state: StoreState | null = null;
let health: StoreHealth = "ok";
const listeners = new Set<() => void>();

function load(): StoreState {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORE_KEY);
  } catch {
    health = "memory";
    return emptyState();
  }
  if (!raw) return emptyState();
  try {
    const parsed = JSON.parse(raw) as StoreState;
    if (!validShape(parsed)) throw new Error("shape");
    return { ...emptyState(), ...parsed };
  } catch {
    health = "reset";
    return emptyState();
  }
}

const LISTS = [
  "accounts", "profiles", "courses", "activity", "notes", "resets",
  "attempts", "sets", "events", "classes", "feedback", "results", "planDone", "reading", "threads", "acts", "reviews",
] as const;
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Everything a screen reads must be the right kind of value, or the whole document is reset. */
function validShape(p: unknown): p is StoreState {
  if (!isObj(p) || p.version !== 1) return false;
  if (!LISTS.every((k) => p[k] === undefined || Array.isArray(p[k]))) return false;
  if (!Array.isArray(p.accounts)) return false;
  if (p.session !== undefined && !isObj(p.session)) return false;
  if (p.prefs !== undefined && (!isObj(p.prefs) || (p.prefs.locale !== "en" && p.prefs.locale !== "es"))) return false;
  return true;
}

export function read(): StoreState {
  if (typeof window === "undefined") return SERVER_SNAPSHOT;
  return (state ??= load());
}

// Another tab changed the document: drop the cached copy so the next read sees it.
if (typeof window !== "undefined")
  window.addEventListener("storage", (e) => {
    if (e.key !== STORE_KEY && e.key !== null) return;
    state = null;
    listeners.forEach((fn) => fn());
  });

function write(change: (draft: StoreState) => void, remote: boolean): StoreState {
  // Start from what is saved now, not this tab's cached copy, so two open tabs never undo each other.
  if (typeof window !== "undefined" && health !== "memory") state = load();
  const prev = read();
  const draft = structuredClone(prev);
  change(draft);
  state = draft;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(draft));
  } catch {
    health = "memory";
  }
  // Per-record merges with other devices happen in sync; this only says what this write changed.
  if (!remote) captureLocal(prev, draft);
  listeners.forEach((fn) => fn());
  return draft;
}

export function update(change: (draft: StoreState) => void): StoreState {
  return write(change, false);
}

/** Writes what came from the server (lib/sync.ts). Not queued to go back up. */
export function applyRemote(change: (draft: StoreState) => void): StoreState {
  return write(change, true);
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  ensureStarted();
  return () => listeners.delete(fn);
}

export const storeHealth = () => health;

/** Deletes everything KaizenEDU saved in this browser (and, with a server, signs this browser out). */
export function clearAll() {
  forgetDevice();
  try {
    localStorage.removeItem(STORE_KEY);
  } catch {}
  state = emptyState();
  listeners.forEach((fn) => fn());
}

/** Test hook: forget the cached document so the next read reloads from storage. */
export function resetMemory() {
  state = null;
  health = "ok";
}

export function useStore<T>(select: (s: StoreState) => T): T {
  const s = useSyncExternalStore(subscribe, read, () => SERVER_SNAPSHOT);
  return select(s);
}

export const newId = () => crypto.randomUUID();
