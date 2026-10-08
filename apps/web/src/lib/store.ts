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
// ponytail: whole-document writes; fine for a family-sized store (store.test.ts holds the ceilings).

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
/** Evidence journal keys the last load replayed: removed by the next document save that succeeds. */
let leftover: string[] = [];
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
    leftover = replayJournal(loaded);
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

// Another tab changed the document (or logged evidence it could not save in it yet): drop the cached
// copy so the next read sees it. A journal entry being cleared changes nothing here.
if (typeof window !== "undefined")
  window.addEventListener("storage", (e) => {
    if (e.key !== STORE_KEY && e.key !== null && !(e.key.startsWith(EVIDENCE_PREFIX) && e.newValue !== null)) return;
    state = null;
    listeners.forEach((fn) => fn());
  });

/** What a write logs ahead of the document: evidence rows, under one journal key. */
type Journal = { key: string; rows: () => EvidenceRow[]; proof?: boolean };

/**
 * Applies `change` to what is saved now and saves the document. `change` returning false means there
 * was nothing to do: no save, no notice. With a journal, the new evidence rows are written to their
 * own key first; once the document holding them is saved the key is removed, together with every
 * leftover key this load replayed (the document now holds those rows, or dropped them on purpose).
 * If the document can't be saved the key stays, and the next load replays it.
 */
function write(change: (draft: StoreState) => void | false, remote: boolean, journal?: Journal): StoreState {
  // Start from what is saved now, not this tab's cached copy, so two open tabs never undo each other.
  if (typeof window !== "undefined" && health !== "memory") state = load();
  const prev = read();
  const draft = structuredClone(prev);
  if (change(draft) === false) return prev;
  const removed = new Set(prev.profiles.filter((p) => !draft.profiles.some((n) => n.id === p.id)).map((p) => p.id));
  if (removed.size) for (const list of EVIDENCE_LISTS) {
    (draft[list] as EvidenceRecord[]) = (draft[list] as EvidenceRecord[]).filter((r) => !removed.has(r.profileId));
  }
  let logged = false;
  if (journal) {
    try {
      localStorage.setItem(journal.key, JSON.stringify({ rows: journal.rows() }));
      logged = true;
    } catch (e) {
      // A proof (a check answer) is never taken on a device that can't keep it.
      if (journal.proof) throw new EvidenceError("storage", { cause: e });
    }
  }
  state = draft;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(draft));
    for (const key of leftover) localStorage.removeItem(key);
    if (logged) localStorage.removeItem(journal!.key);
    leftover = [];
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
  leftover = [];
  state = emptyState();
  listeners.forEach((fn) => fn());
}

/** Test hook: forget the cached document so the next read reloads from storage. */
export function resetMemory() {
  state = null;
  health = "ok";
  leftover = [];
}

/** Reads the saved document again (another tab changed what a screen holds). Kept in memory when storage is off. */
export function reload() {
  if (health === "memory") return;
  state = null;
  listeners.forEach((fn) => fn());
}

export function useStore<T>(select: (s: StoreState) => T): T {
  const s = useSyncExternalStore(subscribe, read, () => SERVER_SNAPSHOT);
  return select(s);
}

export const newId = () => crypto.randomUUID();

// ---- learning evidence ------------------------------------------------------------------------------
// Help shown, first misses and final answers are admitted through appendEvidence: written ahead to a
// journal key of their own, then into the document, then the key is removed (see write). So evidence
// a document save couldn't keep (storage full) is still on this device, and the next load replays it.
// The document stays the only lasting copy and the export boundary; a journal key is a pending entry.

const EVIDENCE_PREFIX = "kaizenedu.evidence.v1.";
type EvidenceLists = { attemptContexts: AttemptIdentity; helpExposures: HelpExposure; responseEvents: ResponseEvent; attempts: Attempt; activity: ActivityEvent };
export type EvidenceList = keyof EvidenceLists;
export type EvidenceRow = { [L in EvidenceList]: { list: L; record: EvidenceLists[L] } }[EvidenceList];
type EvidenceRecord = EvidenceLists[EvidenceList];
const EVIDENCE_LISTS: EvidenceList[] = ["attemptContexts", "helpExposures", "responseEvents", "attempts", "activity"];

function journalKeys() {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(EVIDENCE_PREFIX)) keys.push(key);
  }
  return keys;
}

/** Puts journalled rows the document doesn't have into it (rows never change, so the document's copy wins). */
function replayJournal(s: StoreState): string[] {
  const keys = journalKeys();
  if (!keys.length) return keys;
  const learners = new Set(s.profiles.map((p) => p.id));
  const held = new Map<EvidenceList, Set<string>>();
  for (const key of keys) {
    try {
      const saved = JSON.parse(localStorage.getItem(key) ?? "null") as { rows?: EvidenceRow[] } | null;
      for (const { list, record } of saved?.rows ?? []) {
        if (!EVIDENCE_LISTS.includes(list) || !record || !learners.has(record.profileId)) continue;
        let ids = held.get(list);
        if (!ids) held.set(list, (ids = new Set((s[list] as EvidenceRecord[]).map((r) => r.id))));
        if (ids.has(record.id)) continue;
        ids.add(record.id);
        (s[list] as EvidenceRecord[]).push(record);
      }
    } catch { /* A malformed journal entry never resets the family's document. */ }
  }
  return keys;
}

/** Why evidence was not taken: this device can't keep a proof, or the screen's copy is out of date. */
export class EvidenceError extends Error {
  constructor(readonly reason: "storage" | "stale", options?: ErrorOptions) {
    super(reason === "storage" ? "Could not save learning evidence" : "Learning evidence is out of date", options);
    this.name = "EvidenceError";
  }
}

/** Whether `s` already holds this row; an id held for another learner or question is out of date. */
function holds(s: StoreState, { list, record }: EvidenceRow) {
  const have = (s[list] as EvidenceRecord[]).find((r) => r.id === record.id);
  if (!have) return false;
  const attempt = (r: EvidenceRecord) => ("attemptId" in r ? r.attemptId : undefined);
  if (have.profileId !== record.profileId || attempt(have) !== attempt(record)) throw new EvidenceError("stale");
  return true;
}

/**
 * Admits evidence rows in one write. Ids are deterministic and rows never change, so rows already held
 * are left as they are and admitting them again writes nothing. `also` changes the document in the same
 * write (a set's start time). When storage can't keep them the rows stay in memory for this page, under
 * the store's "not saving" status, except a proof (a check answer): that throws EvidenceError("storage")
 * and is not taken. A row for a learner not signed in here throws EvidenceError("stale").
 */
export function appendEvidence(rows: EvidenceRow[], opts: { proof?: boolean; also?: (draft: StoreState) => void } = {}) {
  const fresh = rows.filter((r) => !holds(read(), r));
  if (!fresh.length) return;
  let added: EvidenceRow[] = [];
  write(
    (draft) => {
      for (const r of fresh) if (!draft.profiles.some((p) => p.id === r.record.profileId && p.accountId === draft.session.accountId)) throw new EvidenceError("stale");
      added = fresh.filter((r) => !holds(draft, r));
      if (!added.length) return false;
      for (const { list, record } of added) (draft[list] as EvidenceRecord[]).push(record);
      opts.also?.(draft);
    },
    false,
    { key: `${EVIDENCE_PREFIX}${fresh[0].list}:${encodeURIComponent(fresh[0].record.id)}`, rows: () => added, proof: opts.proof },
  );
}
