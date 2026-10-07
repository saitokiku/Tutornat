"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { ConsentReceipt } from "./server/db/policy";
import {
  ACCOUNT_LISTS,
  DEVICE_ONLY,
  forServer,
  idOf,
  KEEP_ON_SERVER,
  SYNC_LIMITS,
  SYNC_LISTS,
  utf8Bytes,
  type PublicAccount,
  type PushRecord,
  type RemoteRecord,
  type SyncList,
  type SyncRequest,
  type SyncResponse,
} from "./server/db/wire";
import { applyRemote, read, storeHealth, update, type StoreState } from "./store";
import type { Account } from "./types";

// Server mode in the browser. The store stays the working copy every screen reads; this keeps it in
// step with the family's record on the server:
//   - every local write is compared with the one before it, and what changed goes into an outbox
//     (localStorage, so nothing is lost offline or when the tab closes);
//   - a sync round pushes the outbox and pulls what other devices wrote since this one's cursor;
//   - rounds run after changes settle, on reconnect, when the tab is shown or hidden, and every minute.
// It only runs while this browser is signed in to the server (the kz_acct cookie, set with the
// session). Without a server — no DATABASE_URL — none of it starts and the app is browser-only.
//
// The outbox and cursor are kept only when the store itself could be kept: if this device runs out
// of storage, both live in memory for the rest of the page (changes still go to the account while
// online) and the saved pair stays as it was, so a reload pulls again from where it really was.

export type ServerStatus = { mode: "server" | "local"; resetEmail: boolean; production: boolean };
const LOCAL: ServerStatus = { mode: "local", resetEmail: false, production: true };
const MODE_KEY = "kaizenedu.mode";
const META_KEY = "kaizenedu.sync.v1";
/** Set when this device was signed out with something left behind; the sign-in page explains it. */
const NOTE_KEY = "kaizenedu.signedout";
/** Set when a sign-out couldn't reach the server; it is sent again once the device is back. */
const SIGNOUT_KEY = "kaizenedu.signout";
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
  if (typeof window === "undefined") return Promise.resolve(LOCAL);
  if (process.env.NODE_ENV === "test") {
    if (!statusValue) {
      statusValue = LOCAL;
      notify();
    }
    return Promise.resolve(LOCAL);
  }
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

/** The status if already known (no request). */
export const knownStatus = () => testStatus ?? statusValue;

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
  /** Records the account refused (or too big to send), by list: id → the change time. Kept on this device. */
  refused?: Partial<Record<SyncList, Record<string, number>>>;
  consent: ConsentReceipt[];
  /** Learners the server has (pushed and accepted, or pulled). */
  known: string[];
  lastSyncAt?: number;
};
type Meta = { v: 1; accounts: Record<string, AccountMeta> };

let metaCache: Meta | null = null;
/** True once this page can't keep the sync state in storage (the device is full): it lives in memory. */
let metaInMemory = false;

function loadMeta(): Meta {
  if (metaInMemory && metaCache) return metaCache;
  try {
    const m = JSON.parse(localStorage.getItem(META_KEY) ?? "null") as Meta | null;
    if (m && m.v === 1 && typeof m.accounts === "object") return (metaCache = m);
  } catch {}
  return (metaCache = { v: 1, accounts: {} });
}

function saveMeta(m: Meta) {
  metaCache = m;
  // Kept only alongside the store: a cursor saved without the records it covers would skip them.
  if (storeHealth() === "memory") metaInMemory = true;
  if (!metaInMemory) {
    try {
      localStorage.setItem(META_KEY, JSON.stringify(m));
    } catch {
      metaInMemory = true;
    }
  }
  version++;
  notify();
}

const metaFor = (m: Meta, id: string): AccountMeta => (m.accounts[id] ??= { cursor: 0, outbox: {}, consent: [], known: [] });

const pendingCount = (m: AccountMeta) =>
  Object.entries(m.outbox).reduce((n, [k, v]) => n + (k === "account" ? (v ? 1 : 0) : Object.keys(v as object).length), 0);
const refusedCount = (m: AccountMeta) => Object.values(m.refused ?? {}).reduce((n, v) => n + Object.keys(v ?? {}).length, 0);

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

function setLocal(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {}
}
function getLocal(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
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
    for (const r of a) if (owns(list, r)) before.set(idOf(list, r), JSON.stringify(forServer(list, r)));
    for (const r of b) {
      if (!owns(list, r)) continue;
      const id = idOf(list, r);
      const old = before.get(id);
      // A change only to a device-only field (a class's feed link) has nothing to send.
      if (old === undefined || old !== JSON.stringify(forServer(list, r))) changes.push([list, id, false]);
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
  // Someone else picked up the device: the server hears at once, for the consent gate on AI and voice.
  if (prev.session.profileId !== next.session.profileId) schedule(0);
}

// ---- a sync round ------------------------------------------------------------------------------------

type Sent = Map<string, number>;
const sentKey = (list: SyncList | "account", id = "") => `${list}\u0000${id}`;

/**
 * Answers go last, after the sets they belong to: the server checks each answer against its set, and
 * a check set still waiting for the next request would make a real check answer look forged.
 */
const PUSH_ORDER: readonly SyncList[] = [...SYNC_LISTS.filter((l) => l !== "attempts"), "attempts"];

/**
 * The next request's worth of the outbox: learners first, so their records find them on the server;
 * at most `pushRecords` records and `pushBytes` of them. A record bigger than the account takes is
 * not sent at all (`tooBig`): it is set aside and counted as not saved.
 */
export function buildPush(state: StoreState, m: AccountMeta, accountId: string): { body: SyncRequest; sent: Sent; rest: boolean; tooBig: [SyncList, string, number][] } {
  const push: SyncRequest["push"] = {};
  const sent: Sent = new Map();
  const tooBig: [SyncList, string, number][] = [];
  let records = 0;
  let bytes = 0;
  let rest = false;
  const known = new Set(m.known);
  const fits = (size: number) => records === 0 || (records < SYNC_LIMITS.pushRecords && bytes + size <= SYNC_LIMITS.pushBytes);
  const add = (list: SyncList, r: PushRecord, size: number) => {
    (push[list] ??= []).push(r);
    sent.set(sentKey(list, r.id), r.at);
    records++;
    bytes += size;
  };

  // A learner the server hasn't got (made before this browser synced) goes along with its records.
  const needs = new Set<string>();
  for (const list of SYNC_LISTS) {
    if (list === "profiles" || ACCOUNT_LISTS.includes(list)) continue;
    const entries = m.outbox[list];
    if (!entries) continue;
    for (const r of state[list] as unknown as Rec[]) if (entries[idOf(list, r)] && !known.has(r.profileId as string)) needs.add(r.profileId as string);
  }
  for (const p of state.profiles)
    if (needs.has(p.id) && p.accountId === accountId && !m.outbox.profiles?.[p.id]) {
      const r = { id: p.id, at: p.createdAt, data: p };
      add("profiles", r, utf8Bytes(JSON.stringify(r)));
    }

  outer: for (const list of PUSH_ORDER) {
    const entries = m.outbox[list];
    if (!entries) continue;
    const byId = new Map((state[list] as unknown as Rec[]).map((r) => [idOf(list, r), r]));
    for (const [id, p] of Object.entries(entries)) {
      let r: PushRecord;
      if (p.del) r = { id, at: p.at, deleted: true };
      else if (byId.has(id)) r = { id, at: p.at, data: forServer(list, byId.get(id)) };
      else {
        sent.set(sentKey(list, id), p.at); // gone without a delete (a device trim): nothing to send
        continue;
      }
      const size = utf8Bytes(JSON.stringify(r));
      if (id.length > SYNC_LIMITS.idLength || (!p.del && size > SYNC_LIMITS.recordBytes)) {
        tooBig.push([list, id, p.at]);
        continue;
      }
      if (!fits(size)) {
        rest = true;
        break outer;
      }
      add(list, r, size);
    }
  }
  let account: SyncRequest["account"];
  const a = state.accounts.find((x) => x.id === accountId);
  if (m.outbox.account && a) {
    account = { displayName: a.displayName, goals: a.goals ?? null, at: m.outbox.account.at };
    sent.set(sentKey("account"), m.outbox.account.at);
  }
  const learner = state.session.accountId === accountId ? (state.session.profileId ?? null) : null;
  return { body: { v: 1, since: m.cursor, now: Date.now(), learner, account, push }, sent, rest, tooBig };
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
/** The same caps the device keeps for its own writes (lib/acts.ts, lib/tutor.ts); the server keeps everything. */
const DEVICE_CAP: Partial<Record<SyncList, number>> = { acts: 5000, threads: 200 };

/** Puts the server's records into the store. Ids still waiting in the outbox with a newer change are left alone. */
export function mergeRemote(s: StoreState, answer: Pick<SyncResponse, "changes" | "account">, accountId: string, skip: (list: SyncList | "account", id: string) => boolean) {
  const purged = new Set<string>();
  for (const list of SYNC_LISTS) {
    const recs = answer.changes[list];
    if (!recs?.length) continue;
    const arr = s[list] as unknown as Rec[];
    const index = new Map(arr.map((r, i) => [idOf(list, r), i]));
    const removed = new Set<string>();
    const keep = DEVICE_ONLY[list] ?? [];
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
      if (i !== undefined) {
        // What only this device holds (a class's feed link) stays on it.
        const own = Object.fromEntries(keep.filter((k) => arr[i][k] !== undefined).map((k) => [k, arr[i][k]]));
        arr[i] = { ...(r.data as Rec), ...own };
      } else {
        arr.push(r.data as Rec);
        index.set(r.id, arr.length - 1);
        added = true;
      }
    }
    let out = removed.size ? arr.filter((r) => !removed.has(idOf(list, r))) : arr;
    const field = TIME_FIELD[list];
    if (added && field) out = [...out].sort((x, y) => Number(x[field] ?? 0) - Number(y[field] ?? 0));
    const cap = DEVICE_CAP[list];
    if (cap && out.length > cap) out = out.slice(out.length - cap);
    (s[list] as unknown as Rec[]) = out;
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
let phase: SyncState["phase"] = "idle";
let inflight: AbortController | null = null;

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

/** Records the account won't take, or too big to send: out of the outbox, into the refused bucket. */
function setAside(accountId: string, list: [SyncList, string, number][]) {
  const meta = loadMeta();
  const m = metaFor(meta, accountId);
  for (const [l, id, at] of list) {
    if (m.outbox[l]?.[id]?.at === at) delete m.outbox[l]![id];
    (((m.refused ??= {})[l] ??= {}) as Record<string, number>)[id] = at;
  }
  saveMeta(meta);
}

async function rounds(accountId: string) {
  // Whoever signs out (or is signed out) while a round is in flight: nothing from it may land.
  const gone = () => activeAccount() !== accountId;
  for (let round = 0; round < 50; round++) {
    if (gone()) return;
    const { body, sent, rest, tooBig } = buildPush(read(), metaFor(loadMeta(), accountId), accountId);
    if (tooBig.length) setAside(accountId, tooBig);
    // "Saving" only while something is going up; pulling alone changes nothing on screen.
    if (sent.size) setPhase("syncing");
    const ctl = new AbortController();
    inflight = ctl;
    let res: Response;
    let answer: SyncResponse;
    try {
      res = await fetch("/api/sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: ctl.signal });
      if (gone()) return;
      if (res.status === 401) return signedOutElsewhere(accountId);
      // This deployment no longer has a server: stop syncing and keep working from this browser.
      if (res.status === 404) return stopSyncing();
      if (!res.ok) return failed("error");
      try {
        answer = (await res.json()) as SyncResponse;
      } catch {
        return gone() ? undefined : failed("error");
      }
    } catch {
      // Couldn't reach the server at all: for the family that is "offline", whatever the cause.
      return gone() ? undefined : failed("offline");
    } finally {
      if (inflight === ctl) inflight = null;
    }
    if (gone()) return;
    settle(accountId, answer, sent);
    failures = 0;
    if (!answer.more && !rest) break;
  }
  if (!gone()) setPhase("idle");
}

function failed(p: "offline" | "error") {
  setPhase(p);
  failures++;
  // Offline waits for the browser's "online" event as well; either way, try again later.
  schedule(Math.min(300_000, 5000 * 2 ** Math.min(failures, 6)));
}

/** Applies one answer: the server's records into the store, the cursor forward, sent entries out of the outbox. */
export function settle(accountId: string, answer: SyncResponse, sent: Sent) {
  if (activeAccount() !== accountId) return;
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
  const refused = new Set<string>();
  for (const list of SYNC_LISTS) for (const id of answer.refused?.[list] ?? []) refused.add(sentKey(list, id));
  for (const [key, at] of sent) {
    const [list, id] = key.split("\u0000") as [SyncList | "account", string];
    if (list === "account") {
      if (m.outbox.account?.at === at) delete m.outbox.account;
      continue;
    }
    if (m.outbox[list]?.[id]?.at === at) delete m.outbox[list]![id];
    // Refused: kept on this device and counted as not saved. Taken: no longer refused.
    if (refused.has(key)) ((m.refused ??= {})[list] ??= {})[id] = at;
    else if (m.refused?.[list]?.[id] !== undefined) delete m.refused[list]![id];
  }
  for (const list of SYNC_LISTS) {
    if (m.outbox[list] && !Object.keys(m.outbox[list]!).length) delete m.outbox[list];
    if (m.refused?.[list] && !Object.keys(m.refused[list]!).length) delete m.refused[list];
  }
  const known = new Set(m.known);
  for (const [key] of sent) if (key.startsWith("profiles\u0000") && !refused.has(key)) known.add(key.slice("profiles\u0000".length));
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
  // The outbox stays: signing in again sends it. The sign-in page says what happened.
  setLocal(NOTE_KEY, JSON.stringify({ reason: "elsewhere" } satisfies SignOutNote));
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
  setLocal(NOTE_KEY, null);
  setLocal(SIGNOUT_KEY, null);
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

/** What a sign-out left behind, for the sign-in page to say. */
export type SignOutNote = { reason: "elsewhere" } | { reason: "kept"; kept: number; ended: boolean } | { reason: "offline"; ended: false };

async function endServerSession(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/sign-out", { method: "POST", signal: AbortSignal.timeout(5000) });
    // 404: the deployment is browser-only now, so there is no session to end.
    return res.ok || res.status === 404;
  } catch {
    return false;
  }
}

/**
 * Signing out of a server account: send what's waiting, end the session, then take the family's
 * copy off this device (the server has it). Anything the server hasn't got (unsent, or refused)
 * keeps the copy here, so nothing is lost; it goes up the next time this account signs in here.
 * A sign-out that couldn't reach the server is sent again when the device is back online.
 * Returns what the sign-in page should say, or null when everything is done.
 */
export async function signedOut(): Promise<SignOutNote | null> {
  const accountId = activeAccount();
  if (!accountId) return null;
  await withTimeout(syncNow(), 3000);
  // A round still in flight is dropped here, and nothing it brings back may land after this.
  active = null;
  inflight?.abort();
  clearHint();
  setPhase("idle");
  const ended = await endServerSession();
  if (!ended) setLocal(SIGNOUT_KEY, "1");
  const meta = loadMeta();
  const m = metaFor(meta, accountId);
  const kept = pendingCount(m) + refusedCount(m);
  if (kept === 0) {
    delete meta.accounts[accountId];
    saveMeta(meta);
    forgetAccount(accountId);
  }
  const note: SignOutNote | null = kept ? { reason: "kept", kept, ended } : ended ? null : { reason: "offline", ended: false };
  setLocal(NOTE_KEY, note ? JSON.stringify(note) : null);
  return note;
}

/** A sign-out that didn't reach the server: tried again on the next load and when back online. */
async function retrySignOut() {
  if (getLocal(SIGNOUT_KEY) !== "1" || hintAccount()) return;
  if (await endServerSession()) setLocal(SIGNOUT_KEY, null);
}

/** What the last sign-out on this device left behind, until someone signs in. */
export function signOutNote(): SignOutNote | null {
  try {
    const n = JSON.parse(getLocal(NOTE_KEY) ?? "null") as SignOutNote | null;
    return n && typeof n === "object" && "reason" in n ? n : null;
  } catch {
    return null;
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
  inflight?.abort();
  clearHint();
  setLocal(META_KEY, null);
  metaCache = null;
  // The page is leaving; if this request doesn't make it, the next load sends it again.
  setLocal(SIGNOUT_KEY, "1");
  void fetch("/api/auth/sign-out", { method: "POST", keepalive: true })
    .then((r) => r.ok && setLocal(SIGNOUT_KEY, null))
    .catch(() => {});
  version++;
  notify();
}

// ---- starting up -----------------------------------------------------------------------------------

/** Called when the first screen subscribes to the store. Starts syncing if this browser is signed in to the server. */
export function ensureStarted() {
  if (started || typeof window === "undefined" || process.env.NODE_ENV === "test") return;
  started = true;
  window.addEventListener("online", () => void (retrySignOut(), syncNow()));
  document.addEventListener("visibilitychange", () => void syncNow());
  setInterval(() => {
    if (document.visibilityState === "visible") void syncNow();
  }, 60_000);
  void resume();
}

/** Once per page load: picks up the server session this browser holds, if any. Exported for tests. */
export async function resume() {
  const hint = hintAccount();
  const s = read();
  if (!hint) {
    void retrySignOut();
    // The server session lapsed (30 days unused) while the copy here still says signed in. Without a
    // session nothing would be saved to the account, so the grown-up signs in again; anything this
    // device hadn't sent stays in its outbox and goes up then.
    const a = s.accounts.find((x) => x.id === s.session.accountId);
    if (a && !a.passwordHash) {
      setLocal(NOTE_KEY, JSON.stringify({ reason: "elsewhere" } satisfies SignOutNote));
      applyRemote((d) => void (d.session = { accountId: null, profileId: null }));
    }
    return;
  }
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

export type SyncState = {
  phase: "idle" | "syncing" | "offline" | "error";
  /** Changes on this device the account doesn't have yet. */
  pending: number;
  /** Changes the account refused or couldn't take (too big). They stay on this device. */
  refused: number;
  /** This device couldn't keep KaizenEDU's data (out of space): changes live in memory and go to the account while online. */
  storage: boolean;
  /** This device hasn't finished its first sync with the account yet (and isn't offline or failing). */
  firstSync: boolean;
  lastSyncAt?: number;
};
let snap: { v: number; a: string | null; h: string; s: SyncState | null } = { v: -1, a: null, h: "", s: null };

function syncState(): SyncState | null {
  const a = activeAccount();
  const health = storeHealth();
  if (snap.v === version && snap.a === a && snap.h === health) return snap.s;
  const m = a ? loadMeta().accounts[a] : undefined;
  const s: SyncState | null = a
    ? {
        phase,
        pending: m ? pendingCount(m) : 0,
        refused: m ? refusedCount(m) : 0,
        storage: metaInMemory || health === "memory",
        firstSync: !m?.lastSyncAt && phase !== "offline" && phase !== "error",
        lastSyncAt: m?.lastSyncAt,
      }
    : null;
  snap = { v: version, a, h: health, s };
  return s;
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
  inflight = null;
  metaCache = null;
  metaInMemory = false;
  if (timer) clearTimeout(timer);
  timer = null;
  version++;
}
