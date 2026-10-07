"use client";

import { useSyncExternalStore } from "react";
import type { Attempt, AttemptIdentity, HelpExposure, PracticeSet, ResponseEvent, SkillReview, TeachingAct } from "@/learning/types";
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
  attemptContexts: AttemptIdentity[];
  helpExposures: HelpExposure[];
  responseEvents: ResponseEvent[];
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
  attemptContexts: [],
  helpExposures: [],
  responseEvents: [],
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
    const loaded = { ...emptyState(), ...parsed };
    loaded.attempts = loaded.attempts.map((a) => ({ ...a, provenance: a.provenance ?? "legacy-local" }));
    mergeEvidenceJournal(loaded);
    return loaded;
  } catch {
    health = "reset";
    return emptyState();
  }
}

const LISTS = [
  "accounts", "profiles", "courses", "activity", "notes", "resets",
  "attempts", "attemptContexts", "helpExposures", "responseEvents", "sets", "events", "classes", "feedback", "results", "planDone", "reading", "threads", "acts", "reviews",
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
    if (e.key !== STORE_KEY && e.key !== null && !e.key.startsWith(EVIDENCE_PREFIX)) return;
    state = null;
    listeners.forEach((fn) => fn());
  });

function write(change: (draft: StoreState) => void, remote: boolean): StoreState {
  // Start from what is saved now, not this tab's cached copy, so two open tabs never undo each other.
  if (typeof window !== "undefined" && health !== "memory") state = load();
  const prev = read();
  const draft = structuredClone(prev);
  change(draft);
  const removed = new Set(prev.profiles.filter((p) => !draft.profiles.some((n) => n.id === p.id)).map((p) => p.id));
  if (removed.size) for (const list of EVIDENCE_LISTS) {
    (draft[list] as EvidenceLists[EvidenceList][]) = (draft[list] as EvidenceLists[EvidenceList][]).filter((r) => !removed.has(r.profileId));
  }
  draft.attempts = draft.attempts.map((a) => ({ ...a, provenance: a.provenance ?? "legacy-local" }));
  state = draft;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(draft));
    if (remote) reconcileRemoteJournal(prev, draft);
    removeDeletedEvidence(prev, draft);
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
    for (const key of journalKeys()) localStorage.removeItem(key);
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

// Evidence uses immutable per-record keys as a write-ahead journal. A whole-document save from a
// stale tab cannot overwrite them. Lists in the main document remain the export/domain boundary.
const EVIDENCE_PREFIX = "kaizenedu.evidence.v1.";
type EvidenceLists = { attemptContexts: AttemptIdentity; helpExposures: HelpExposure; responseEvents: ResponseEvent; attempts: Attempt; activity: ActivityEvent };
type EvidenceList = keyof EvidenceLists;
const EVIDENCE_LISTS: EvidenceList[] = ["attemptContexts", "helpExposures", "responseEvents", "attempts", "activity"];
const journalKey = (list: EvidenceList, id: string) => `${EVIDENCE_PREFIX}${list}:${encodeURIComponent(id)}`;
function journalKeys() {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(EVIDENCE_PREFIX)) keys.push(key);
  }
  return keys;
}

function mergeEvidenceJournal(s: StoreState) {
  const profiles = new Set(s.profiles.map((p) => p.id));
  for (const key of journalKeys()) {
    try {
      const saved = JSON.parse(localStorage.getItem(key) ?? "null") as { list: EvidenceList; record: EvidenceLists[EvidenceList]; canonical?: boolean };
      if (!saved || !EVIDENCE_LISTS.includes(saved.list) || !saved.record || !profiles.has(saved.record.profileId)) continue;
      const rows = s[saved.list] as EvidenceLists[EvidenceList][];
      const i = rows.findIndex((r) => r.id === saved.record.id);
      if (i < 0) rows.push(saved.record);
      // A saved main row beats a provisional journal copy, including a server correction whose
      // journal update failed. Successfully reconciled canonical journals also beat stale tab saves.
      else if (saved.canonical) rows[i] = saved.record;
    } catch { /* A malformed journal entry never resets the family's main document. */ }
  }
}

function removeDeletedEvidence(prev: StoreState, next: StoreState) {
  const removed = new Set(prev.profiles.filter((p) => !next.profiles.some((n) => n.id === p.id)).map((p) => p.id));
  if (!removed.size) return;
  for (const key of journalKeys()) {
    try {
      const saved = JSON.parse(localStorage.getItem(key) ?? "null");
      if (removed.has(saved?.record?.profileId)) localStorage.removeItem(key);
    } catch {}
  }
}

/** Server corrections/deletions replace provisional rows in the recovery journal as well. */
function reconcileRemoteJournal(prev: StoreState, next: StoreState) {
  for (const list of EVIDENCE_LISTS) for (const before of prev[list]) {
    const key = journalKey(list, before.id);
    if (!localStorage.getItem(key)) continue;
    const after = next[list].find((r) => r.id === before.id);
    if (!after) localStorage.removeItem(key);
    else if (JSON.stringify(before) !== JSON.stringify(after)) localStorage.setItem(key, JSON.stringify({ list, record: after, canonical: true }));
  }
}

/** A successful return means the evidence is durable; callers may then release help/feedback. */
export function appendEvidence<L extends EvidenceList>(list: L, record: EvidenceLists[L]): EvidenceLists[L] {
  // Always reload before admission: a cached tab cannot write for a deleted learner.
  const fresh = load();
  if (!state || JSON.stringify(state) !== JSON.stringify(fresh)) state = fresh;
  const s = read();
  if (!s.profiles.some((p) => p.id === record.profileId && p.accountId === s.session.accountId)) throw new Error("Unknown learner");
  const existing = s[list].find((r) => r.id === record.id) as EvidenceLists[L] | undefined;
  if (existing) {
    if (existing.profileId !== record.profileId || ("attemptId" in existing && "attemptId" in record && existing.attemptId !== record.attemptId)) throw new Error("Evidence ID belongs to another attempt");
    return existing;
  }
  try {
    localStorage.setItem(journalKey(list, record.id), JSON.stringify({ list, record }));
  } catch {
    throw new Error("Could not save learning evidence");
  }
  const saved = update((draft) => {
    const rows = draft[list] as EvidenceLists[L][];
    if (!rows.some((r) => r.id === record.id)) rows.push(record);
  });
  // load() overlays the journal before update's diff; compare with the pre-journal snapshot too.
  captureLocal(s, saved);
  return record;
}
