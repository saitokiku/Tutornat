"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { ConsentReceipt } from "./server/db/policy";
import { ACCOUNT_LISTS, idOf, KEEP_ON_SERVER, SYNC_LIMITS, SYNC_LISTS, type PublicAccount, type PushRecord, type RemoteRecord, type SyncList, type SyncRequest, type SyncResponse } from "./server/db/wire";
import { applyRemote, read, update, type StoreState } from "./store";
import type { Account } from "./types";

// Server mode in the browser. The store stays the working copy every screen reads; this keeps it in
// step with the family's record on the server:
//   - every local write is compared with the one before it, and what changed goes into an outbox
//     (localStorage, so nothing is lost offline or when the tab closes);
//   - a sync round pushes the outbox and pulls what other devices wrote since this one's cursor;
//   - rounds run after changes settle, on reconnect, when the tab is shown or hidden, and every minute.
// It only runs while this browser is signed in to the server (the kz_acct cookie, set with the
// session). Without a server — no DATABASE_URL — none of it starts and the app is browser-only.

export type ServerStatus = { mode: "server" | "local"; resetEmail: boolean; production: boolean };
const LOCAL: ServerStatus = { mode: "local", resetEmail: false, production: true };
const MODE_KEY = "kaizenedu.mode";
const META_KEY = "kaizenedu.sync.v1";
const HINT = "kz_acct";

// ---- which kind of deployment this is ----------------------------------------------------------

let statusPromise: Promise<ServerStatus> | null = null;
let statusValue: ServerStatus | null = null;
let testStatus: ServerStatus | null = null;

function remembered(): "server" | "local" | null {
  try {
    const v = localStorage.getItem(MODE_KEY);
    return v === "server" || v === "local" ? v : null;
  } catch {
    return null;
  }
}

/** Asked once per page load. Unit tests run browser-only unless they say otherwise. */
export function serverStatus(): Promise<ServerStatus> {
  if (testStatus) return Promise.resolve(testStatus);
  if (process.env.NODE_ENV === "test" || typeof window === "undefined") return Promise.resolve(LOCAL);
  statusPromise ??= fetch("/api/auth/status", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((j: Partial<ServerStatus>) => {
      const s: ServerStatus = { mode: j.mode === "server" ? "server" : "local", resetEmail: Boolean(j.resetEmail), production: j.production !== false };
      try {
        localStorage.setItem(MODE_KEY, s.mode);
      } catch {}
      return s;
    })
    .catch(() => {
      statusPromise = null; // ask again next time
      // Offline: a browser that has seen this deployment keep families on the server keeps saying so.
      return { ...LOCAL, mode: remembered() ?? "local" };
    })
    .then((s) => {
      statusValue = s;
      notify();
      return s;
    });
  return statusPromise;
}

export function setServerStatusForTests(s: ServerStatus | null) {
  testStatus = s;
  statusValue = s;
}

/** null until known. */
export function useServerStatus(): ServerStatus | null {
  useEffect(() => void serverStatus(), []);
  return useSyncExternalStore(subscribeSync, () => testStatus ?? statusValue, () => null);
}

// ---- the outbox and cursor, per account ----------------------------------------------------------

type Pending = { at: number; del?: 1 };
type Outbox = Partial<Record<SyncList, Record<string, Pending>>> & { account?: Pending };
type AccountMeta = {
  cursor: number;
  outbox: Outbox;
  consent: ConsentReceipt[];
  /** Learners the server has (pushed and accepted, or pulled). */
  known: string[];
  lastSyncAt?: number;
};
type Meta = { v: 1; accounts: Record<string, AccountMeta> };

function loadMeta(): Meta {
  try {
    const m = JSON.parse(localStorage.getItem(META_KEY) ?? "null") as Meta | null;
    if (m && m.v === 1 && typeof m.accounts === "object") return m;
  } catch {}
  return { v: 1, accounts: {} };
}

function saveMeta(m: Meta) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(m));
  } catch {}
  version++;
  notify();
}

const metaFor = (m: Meta, id: string): AccountMeta => (m.accounts[id] ??= { cursor: 0, outbox: {}, consent: [], known: [] });

const pendingCount = (o: Outbox) => Object.entries(o).reduce((n, [k, v]) => n + (k === "account" ? (v ? 1 : 0) : Object.keys(v as object).length), 0);

// ---- who is signed in to the server ---------------------------------------------------------------

/** undefined: not looked at yet. */
let active: string | null | undefined;

function hintAccount(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)kz_acct=([^;]+)/);
  try {
    return m ? decodeURIComponent(m[1]) : null;
  } catch {
    return null;
  }
}

function clearHint() {
  if (typeof document !== "undefined") document.cookie = `${HINT}=; Path=/; Max-Age=0; SameSite=Lax`;
}

/** The server account this browser syncs, or null (browser-only, or signed out). */
export function activeAccount(): string | null {
  if (active === undefined) active = hintAccount();
  return active;
}

// ---- noticing local changes -----------------------------------------------------------------------

type Rec = Record<string, unknown>;
export type Change = [list: SyncList, id: string, deleted: boolean];

/**
 * What one local write changed for `accountId`: new, edited and removed records, and whether the
 * account's name or goals changed. Attempts never change once written, so only new ids count; lists
 * kept on the server never report a removal (devices trim them).
 */
export function diff(prev: StoreState, next: StoreState, accountId: string): { changes: Change[]; account: boolean } {
  const mine = (s: StoreState) => s.profiles.filter((p) => p.accountId === accountId).map((p) => p.id);
  const owned = new Set([...mine(prev), ...mine(next)]);
  const owns = (list: SyncList, r: Rec) =>
    list === "profiles" ? r.accountId === accountId : ACCOUNT_LISTS.includes(list) || owned.has(r.profileId as string);
  const changes: Change[] = [];
  for (const list of SYNC_LISTS) {
    const a = prev[list] as unknown as Rec[];
    const b = next[list] as unknown as Rec[];
    if (a === b) continue;
    if (list === "attempts") {
      if (a.length === b.length && a.every((x, i) => x.id === b[i]?.id)) continue;
      const had = new Set(a.map((r) => r.id));
      for (const r of b) if (!had.has(r.id) && owns(list, r)) changes.push([list, idOf(list, r), false]);
      continue;
    }
    if (a.length === b.length && JSON.stringify(a) === JSON.stringify(b)) continue;
    const before = new Map<string, string>();
    for (const r of a) if (owns(list, r)) before.set(idOf(list, r), JSON.stringify(r));
    for (const r of b) {
      if (!owns(list, r)) continue;
      const id = idOf(list, r);
      const old = before.get(id);
      if (old === undefined || old !== JSON.stringify(r)) changes.push([list, id, false]);
      before.delete(id);
    }
    if (!KEEP_ON_SERVER.includes(list)) for (const id of before.keys()) changes.push([list, id, true]);
  }
  const pa = prev.accounts.find((x) => x.id === accountId);
  const na = next.accounts.find((x) => x.id === accountId);
  const account = Boolean(pa && na && (pa.displayName !== na.displayName || JSON.stringify(pa.goals ?? null) !== JSON.stringify(na.goals ?? null)));
  return { changes, account };
}

function enqueue(accountId: string, changes: Change[], account: boolean, at = Date.now()) {
  if (!changes.length && !account) return;
  const meta = loadMeta();
  const m = metaFor(meta, accountId);
  for (const [list, id, deleted] of changes) (m.outbox[list] ??= {})[id] = deleted ? { at, del: 1 } : { at };
  if (account) m.outbox.account = { at };
  saveMeta(meta);
  schedule();
}

/** Called by the store after every local write (store.ts). */
export function captureLocal(prev: StoreState, next: StoreState) {
  const accountId = activeAccount();
  if (!accountId) return;
  const { changes, account } = diff(prev, next, accountId);
  enqueue(accountId, changes, account);
}

// ---- a sync round ------------------------------------------------------------------------------------

type Sent = Map<string, number>;
const sentKey = (list: SyncList | "account", id = "") => `${list}\u0000${id}`;

/** The next request's worth of the outbox: learners first, so their records find them on the server. */
export function buildPush(state: StoreState, m: AccountMeta, accountId: string): { body: SyncRequest; sent: Sent; rest: boolean } {
  const push: SyncRequest["push"] = {};
  const sent: Sent = new Map();
  let count = 0;
  let rest = false;
  const known = new Set(m.known);
  const add = (list: SyncList, r: PushRecord) => ((push[list] ??= []).push(r), sent.set(sentKey(list, r.id), r.at), count++);

  // A learner the server hasn't got (made before this browser synced) goes along with its records.
  const needs = new Set<string>();
  for (const list of SYNC_LISTS) {
    if (list === "profiles" || ACCOUNT_LISTS.includes(list)) continue;
    const entries = m.outbox[list];
    if (!entries) continue;
    for (const r of state[list] as unknown as Rec[]) if (entries[idOf(list, r)] && !known.has(r.profileId as string)) needs.add(r.profileId as string);
  }
  for (const p of state.profiles)
    if (needs.has(p.id) && p.accountId === accountId && !m.outbox.profiles?.[p.id]) add("profiles", { id: p.id, at: p.createdAt, data: p });

  outer: for (const list of SYNC_LISTS) {
    const entries = m.outbox[list];
    if (!entries) continue;
    const byId = new Map((state[list] as unknown as Rec[]).map((r) => [idOf(list, r), r]));
    for (const [id, p] of Object.entries(entries)) {
      if (count >= SYNC_LIMITS.pushRecords) {
        rest = true;
        break outer;
      }
      if (p.del) add(list, { id, at: p.at, deleted: true });
      else if (byId.has(id)) add(list, { id, at: p.at, data: byId.get(id) });
      else sent.set(sentKey(list, id), p.at); // gone without a delete (a device trim): nothing to send
    }
  }
  let account: SyncRequest["account"];
  const a = state.accounts.find((x) => x.id === accountId);
  if (m.outbox.account && a) {
    account = { displayName: a.displayName, goals: a.goals ?? null, at: m.outbox.account.at };
    sent.set(sentKey("account"), m.outbox.account.at);
  }
  return { body: { v: 1, since: m.cursor, now: Date.now(), account, push }, sent, rest };
}

/** Lists kept in time order on the device (the mastery engine reads attempts in order). */
const TIME_FIELD: Partial<Record<SyncList, string>> = {
  profiles: "createdAt",
  courses: "createdAt",
  activity: "at",
  notes: "at",
  attempts: "at",
  sets: "createdAt",
  events: "createdAt",
  classes: "createdAt",
  feedback: "at",
  planDone: "at",
  threads: "startedAt",
  acts: "at",
  reviews: "at",
};
const MAX_ACTS = 5000; // the same cap lib/acts.ts keeps per device

/** Puts the server's records into the store. Ids still waiting in the outbox with a newer change are left alone. */
export function mergeRemote(s: StoreState, answer: Pick<SyncResponse, "changes" | "conflicts" | "account">, accountId: string, skip: (list: SyncList | "account", id: string) => boolean) {
  const purged = new Set<string>();
  for (const part of [answer.changes, answer.conflicts]) {
    for (const list of SYNC_LISTS) {
      const recs = part[list];
      if (!recs?.length) continue;
      const arr = s[list] as unknown as Rec[];
      const index = new Map(arr.map((r, i) => [idOf(list, r), i]));
      const removed = new Set<string>();
      let added = false;
      for (const r of recs as RemoteRecord[]) {
        if (skip(list, r.id)) continue;
        const i = index.get(r.id);
        if (r.deleted) {
          if (i !== undefined) removed.add(r.id);
          if (list === "profiles") purged.add(r.id);
          continue;
        }
        if (!r.data || typeof r.data !== "object") continue;
        if (i !== undefined) arr[i] = r.data as Rec;
        else {
          arr.push(r.data as Rec);
          index.set(r.id, arr.length - 1);
          added = true;
        }
      }
      let out = removed.size ? arr.filter((r) => !removed.has(idOf(list, r))) : arr;
      const field = TIME_FIELD[list];
      if (added && field) out = [...out].sort((x, y) => Number(x[field] ?? 0) - Number(y[field] ?? 0));
      if (list === "acts" && out.length > MAX_ACTS) out = out.slice(out.length - MAX_ACTS);
      (s[list] as unknown as Rec[]) = out;
    }
  }
  if (purged.size) {
    // A learner removed on another device: their record goes here too.
    for (const list of SYNC_LISTS)
      if (list !== "profiles" && !ACCOUNT_LISTS.includes(list)) (s[list] as unknown as Rec[]) = (s[list] as unknown as Rec[]).filter((r) => !purged.has(r.profileId as string));
    if (s.session.profileId && purged.has(s.session.profileId)) s.session.profileId = null;
  }
  if (answer.account && !skip("account", "")) {
    const a = s.accounts.find((x) => x.id === accountId);
    if (a) Object.assign(a, { displayName: answer.account.displayName, goals: answer.account.goals ?? undefined });
  }
}

let running: Promise<void> | null = null;
let again = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let failures = 0;
let started = false;
let version = 0;
let phase: "idle" | "syncing" | "offline" | "error" = "idle";

function schedule(delay = 1500) {
  if (!started || typeof window === "undefined") return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void syncNow();
  }, delay);
}

function setPhase(p: typeof phase) {
  if (p === phase) return;
  phase = p;
  version++;
  notify();
}

function withLock(fn: () => Promise<void>): Promise<void> {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  // One tab syncs at a time; the others see its writes through the storage event.
  return locks ? locks.request("kaizenedu-sync", () => fn()).then(() => undefined) : fn();
}

/** Runs sync rounds until the outbox is empty and the server has nothing more. Safe to call any time. */
export function syncNow(): Promise<void> {
  const accountId = activeAccount();
  if (!accountId) return Promise.resolve();
  if (running) {
    again = true;
    return running;
  }
  running = withLock(() => rounds(accountId)).finally(() => {
    running = null;
    if (again) {
      again = false;
      schedule(0);
    }
  });
  return running;
}

async function rounds(accountId: string) {
  for (let round = 0; round < 50; round++) {
    if (activeAccount() !== accountId) return;
    const { body, sent, rest } = buildPush(read(), metaFor(loadMeta(), accountId), accountId);
    setPhase("syncing");
    let res: Response;
    try {
      res = await fetch("/api/sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    } catch {
      // Couldn't reach the server at all: for the family that is "offline", whatever the cause.
      return failed("offline");
    }
    if (res.status === 401) return signedOutElsewhere(accountId);
    // This deployment no longer has a server: stop syncing and keep working from this browser.
    if (res.status === 404) return stopSyncing();
    if (!res.ok) return failed("error");
    let answer: SyncResponse;
    try {
      answer = (await res.json()) as SyncResponse;
    } catch {
      return failed("error");
    }
    settle(accountId, answer, sent);
    failures = 0;
    if (!answer.more && !rest) break;
  }
  setPhase("idle");
}

function failed(p: "offline" | "error") {
  setPhase(p);
  failures++;
  // Offline waits for the browser's "online" event as well; either way, try again later.
  schedule(Math.min(300_000, 5000 * 2 ** Math.min(failures, 6)));
}

/** Applies one answer: the server's records into the store, the cursor forward, sent entries out of the outbox. */
export function settle(accountId: string, answer: SyncResponse, sent: Sent) {
  const before = metaFor(loadMeta(), accountId);
  const newer = (list: SyncList | "account", id: string) => {
    const p = list === "account" ? before.outbox.account : before.outbox[list]?.[id];
    if (!p) return false;
    const s = sent.get(sentKey(list, id));
    return s === undefined || p.at > s;
  };
  applyRemote((s) => mergeRemote(s, answer, accountId, newer));

  const meta = loadMeta();
  const m = metaFor(meta, accountId);
  for (const [key, at] of sent) {
    const [list, id] = key.split("\u0000") as [SyncList | "account", string];
    if (list === "account") {
      if (m.outbox.account?.at === at) delete m.outbox.account;
    } else if (m.outbox[list]?.[id]?.at === at) delete m.outbox[list]![id];
  }
  for (const list of SYNC_LISTS) if (m.outbox[list] && !Object.keys(m.outbox[list]!).length) delete m.outbox[list];
  const known = new Set(m.known);
  for (const [key] of sent) if (key.startsWith("profiles\u0000")) known.add(key.slice("profiles\u0000".length));
  for (const r of answer.changes.profiles ?? []) {
    if (r.deleted) known.delete(r.id);
    else known.add(r.id);
  }
  m.known = [...known];
  m.cursor = answer.cursor;
  if (answer.consent) m.consent = answer.consent;
  m.lastSyncAt = Date.now();
  saveMeta(meta);
}

function stopSyncing() {
  active = null;
  clearHint();
  setPhase("idle");
}

/** The server no longer knows this browser's session (signed out elsewhere, or a password reset). */
function signedOutElsewhere(accountId: string) {
  active = null;
  clearHint();
  // The outbox stays: signing in again sends it.
  applyRemote((s) => {
    if (s.session.accountId === accountId) s.session = { accountId: null, profileId: null };
  });
  setPhase("idle");
}

// ---- signing in and out ---------------------------------------------------------------------------

const serverAccount = (a: PublicAccount): Account => ({
  id: a.id,
  email: a.email,
  displayName: a.displayName,
  // Server accounts keep no password material in the browser.
  salt: "",
  passwordHash: "",
  createdAt: a.createdAt,
  ...(a.goals ? { goals: a.goals } : {}),
});

/**
 * The server accepted this browser: the account goes into the store and becomes the session, and
 * the first sync pulls the family. `adopt` brings a browser-only account's learners (same email,
 * from before this deployment had a server) into the server account, with everything they did.
 */
export async function signedIn(account: PublicAccount, opts: { adopt?: string | null; unlocked: boolean }) {
  active = account.id;
  applyRemote((s) => {
    const i = s.accounts.findIndex((x) => x.id === account.id);
    if (i >= 0) s.accounts[i] = { ...s.accounts[i], ...serverAccount(account) };
    else s.accounts.push(serverAccount(account));
    s.session = { accountId: account.id, profileId: null, unlocked: opts.unlocked };
  });
  const from = opts.adopt;
  if (from && from !== account.id) {
    let moved: string[] = [];
    update((s) => {
      const old = s.accounts.find((x) => x.id === from);
      const mine = s.accounts.find((x) => x.id === account.id);
      if (old?.goals && mine && !mine.goals) mine.goals = old.goals;
      moved = s.profiles.filter((p) => p.accountId === from).map((p) => p.id);
      for (const p of s.profiles) if (p.accountId === from) p.accountId = account.id;
      s.accounts = s.accounts.filter((x) => x.id !== from);
    });
    const ids = new Set(moved);
    const changes: Change[] = [];
    const s = read();
    for (const list of SYNC_LISTS)
      if (list !== "profiles" && !ACCOUNT_LISTS.includes(list))
        for (const r of s[list] as unknown as Rec[]) if (ids.has(r.profileId as string)) changes.push([list, idOf(list, r), false]);
    enqueue(account.id, changes, false);
  }
  await withTimeout(syncNow(), 8000);
}

const withTimeout = (p: Promise<void>, ms: number) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    void p.finally(() => (clearTimeout(t), resolve()));
  });

/**
 * Signing out of a server account: send what's waiting, end the session, then take the family's
 * copy off this device (the server has it). If something could not be sent, the copy stays so
 * nothing is lost, and goes up the next time this account signs in here.
 */
export async function signedOut() {
  const accountId = activeAccount();
  if (!accountId) return;
  await withTimeout(syncNow(), 3000);
  await fetch("/api/auth/sign-out", { method: "POST" }).catch(() => {});
  active = null;
  clearHint();
  const meta = loadMeta();
  if (pendingCount(metaFor(meta, accountId).outbox) === 0) {
    delete meta.accounts[accountId];
    saveMeta(meta);
    forgetAccount(accountId);
  }
}

function forgetAccount(accountId: string) {
  applyRemote((s) => {
    const ids = new Set(s.profiles.filter((p) => p.accountId === accountId).map((p) => p.id));
    s.profiles = s.profiles.filter((p) => !ids.has(p.id));
    for (const list of SYNC_LISTS)
      if (list !== "profiles" && !ACCOUNT_LISTS.includes(list)) (s[list] as unknown as Rec[]) = (s[list] as unknown as Rec[]).filter((r) => !ids.has(r.profileId as string));
    s.accounts = s.accounts.filter((a) => a.id !== accountId);
  });
}

/** "Delete everything on this device" (store.clearAll): also end the server session here. */
export function forgetDevice() {
  if (!activeAccount()) return;
  active = null;
  clearHint();
  try {
    localStorage.removeItem(META_KEY);
  } catch {}
  void fetch("/api/auth/sign-out", { method: "POST", keepalive: true }).catch(() => {});
  version++;
  notify();
}

// ---- starting up -----------------------------------------------------------------------------------

/** Called when the first screen subscribes to the store. Starts syncing if this browser is signed in to the server. */
export function ensureStarted() {
  if (started || typeof window === "undefined" || process.env.NODE_ENV === "test") return;
  started = true;
  window.addEventListener("online", () => void syncNow());
  document.addEventListener("visibilitychange", () => void syncNow());
  setInterval(() => {
    if (document.visibilityState === "visible") void syncNow();
  }, 60_000);
  void boot();
}

async function boot() {
  const hint = hintAccount();
  if (!hint) return;
  const s = read();
  if (s.session.accountId === hint && s.accounts.some((a) => a.id === hint)) {
    active = hint;
    void serverStatus();
    return syncNow();
  }
  // Someone else is signed in on this device in browser-only mode: leave them be.
  if (s.session.accountId) return;
  // Signed in on the server, but this browser's copy was cleared (Safari drops site storage after a
  // week unused): pick the family back up from the server.
  const res = await fetch("/api/auth/me", { cache: "no-store" }).catch(() => null);
  if (res?.status === 401 || res?.status === 404) return clearHint();
  if (!res?.ok) return;
  const { account } = (await res.json()) as { account: PublicAccount };
  if (account.id === hint) await signedIn(account, { unlocked: false });
}

// ---- what screens read -------------------------------------------------------------------------------

const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((fn) => fn());
}
export function subscribeSync(fn: () => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

export type SyncState = { phase: "idle" | "syncing" | "offline" | "error"; pending: number; lastSyncAt?: number };
let snap: { v: number; a: string | null; s: SyncState | null } = { v: -1, a: null, s: null };

function syncState(): SyncState | null {
  const a = activeAccount();
  if (snap.v === version && snap.a === a) return snap.s;
  const m = a ? loadMeta().accounts[a] : undefined;
  snap = { v: version, a, s: a ? { phase, pending: m ? pendingCount(m.outbox) : 0, lastSyncAt: m?.lastSyncAt } : null };
  return snap.s;
}

/** null when this browser isn't syncing with a server (browser-only mode, or signed out). */
export const useSyncState = () => useSyncExternalStore(subscribeSync, syncState, () => null);

/** Consent receipts the server last sent for this browser's account. */
export function receipts(): ConsentReceipt[] {
  const a = activeAccount();
  return a ? (loadMeta().accounts[a]?.consent ?? []) : [];
}

export function storeReceipts(list: ConsentReceipt[]) {
  const a = activeAccount();
  if (!a) return;
  const meta = loadMeta();
  metaFor(meta, a).consent = list;
  saveMeta(meta);
}

let receiptSnap: { v: number; list: ConsentReceipt[] } = { v: -1, list: [] };
/** Re-renders when receipts change. */
export const useReceipts = () =>
  useSyncExternalStore(
    subscribeSync,
    () => (receiptSnap.v === version ? receiptSnap.list : (receiptSnap = { v: version, list: receipts() }).list),
    () => receiptSnap.list,
  );

/** Test hook: forget who is signed in and every timer, as on a fresh page load. */
export function resetSyncForTests() {
  active = undefined;
  running = null;
  again = false;
  failures = 0;
  phase = "idle";
  if (timer) clearTimeout(timer);
  timer = null;
  version++;
}
