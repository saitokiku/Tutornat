import { localDate } from "@/planner/dates";
import { clearAll, read, STORE_KEY, update, type StoreState } from "./store";
import type { Account, Profile } from "./types";

// A family's own data: everything KaizenEDU keeps for one account, as one JSON file, and deleting it.
// Rows belong to a family by `profileId` (one of its learners), `accountId`, or `by` (reviews it made),
// so a list added to the store later is exported and deleted without touching this file.
// When accounts move to the server these become API calls (export, delete with vendor purge); screens
// keep calling the same functions.

export const EXPORT_FORMAT = "kaizenedu.family-export";

export type FamilyExport = {
  format: typeof EXPORT_FORMAT;
  version: 1;
  exportedAt: string;
  /** A sentence for whoever opens the file. */
  note?: string;
  /** The account without its password hash and salt: those are credentials, not the family's record. */
  account: Omit<Account, "salt" | "passwordHash">;
  learners: Profile[];
  prefs: StoreState["prefs"];
  /** Every other list, filtered to this family: courses, attempts, sets, events, threads, acts, reviews… */
  data: Record<string, unknown[]>;
};

/** Lists that never leave the device in an export: reset tokens are credentials. */
const NEVER_EXPORTED = new Set(["accounts", "profiles", "resets"]);

type Row = Record<string, unknown>;
const lists = (s: StoreState) => (Object.entries(s) as [string, unknown][]).filter((e): e is [string, unknown[]] => Array.isArray(e[1]));

function owner(accountId: string, profileIds: Set<string>) {
  return (row: unknown) => {
    if (!row || typeof row !== "object") return false;
    const r = row as Row;
    if (typeof r.profileId === "string") return profileIds.has(r.profileId);
    if (typeof r.accountId === "string") return r.accountId === accountId;
    if (typeof r.by === "string") return r.by === accountId;
    return false;
  };
}

const familyIds = (s: StoreState, accountId: string) => new Set(s.profiles.filter((p) => p.accountId === accountId).map((p) => p.id));

/** Everything this family has on this device, ready for JSON.stringify. Null if the account isn't here. */
export function exportFamily(s: StoreState, accountId: string, opts: { at?: number; note?: string } = {}): FamilyExport | null {
  const account = s.accounts.find((a) => a.id === accountId);
  if (!account) return null;
  const ids = familyIds(s, accountId);
  const mine = owner(accountId, ids);
  const safe: Partial<Account> = { ...account };
  delete safe.salt;
  delete safe.passwordHash;
  const data: Record<string, unknown[]> = {};
  for (const [key, rows] of lists(s)) if (!NEVER_EXPORTED.has(key)) data[key] = rows.filter(mine);
  return {
    format: EXPORT_FORMAT,
    version: 1,
    exportedAt: new Date(opts.at ?? Date.now()).toISOString(),
    ...(opts.note ? { note: opts.note } : {}),
    account: safe as FamilyExport["account"],
    learners: s.profiles.filter((p) => p.accountId === accountId),
    prefs: s.prefs,
    data,
  };
}

export const exportFileName = (at: number) => `kaizenedu-family-${localDate(at)}.json`;

/** What a delete would remove, counted from the record (shown before a grown-up confirms). */
export function dataCounts(s: StoreState, who: { accountId: string } | { profileId: string }) {
  const ids = "profileId" in who ? new Set([who.profileId]) : familyIds(s, who.accountId);
  const n = (rows: { profileId: string }[]) => rows.filter((r) => ids.has(r.profileId)).length;
  return {
    learners: ids.size,
    courses: n(s.courses),
    answers: n(s.attempts),
    conversations: n(s.threads),
    schoolItems: n(s.events),
    notes: n(s.notes),
    books: n(s.reading),
  };
}

/** Deletes one learner of the signed-in family and every row that belongs to them on this device. */
export function deleteLearnerData(profileId: string) {
  update((s) => {
    if (!s.profiles.some((p) => p.id === profileId && p.accountId === s.session.accountId)) return;
    const d = s as unknown as Record<string, unknown>;
    for (const [key, rows] of lists(s)) d[key] = rows.filter((r) => !(r && typeof r === "object" && (r as Row).profileId === profileId));
    s.profiles = s.profiles.filter((p) => p.id !== profileId);
    if (s.session.profileId === profileId) s.session.profileId = null;
  });
}

/**
 * Deletes a family: its account, learners and every row that belongs to them. When it was the only
 * account here, everything KaizenEDU stored in this browser goes too (saved files, other keys), and
 * the result is "device". The caller reloads the page afterwards.
 */
export async function deleteFamily(accountId: string): Promise<"family" | "device" | "missing"> {
  const s = read();
  if (!s.accounts.some((a) => a.id === accountId)) return "missing";
  if (s.accounts.every((a) => a.id === accountId)) {
    await wipeBrowserStorage();
    clearAll();
    return "device";
  }
  update((draft) => {
    const mine = owner(accountId, familyIds(draft, accountId));
    const d = draft as unknown as Record<string, unknown>;
    for (const [key, rows] of lists(draft)) d[key] = rows.filter((r) => !mine(r));
    draft.accounts = draft.accounts.filter((a) => a.id !== accountId);
    draft.session = { accountId: null, profileId: null };
  });
  return "family";
}

/**
 * Removes what else KaizenEDU keeps in this browser besides the main document: other `kaizenedu*`
 * keys, the file store (IndexedDB) and any cached responses. Every step is best effort; a browser
 * that blocks storage has nothing stored to remove.
 */
export async function wipeBrowserStorage() {
  for (const store of [globalThis.localStorage, globalThis.sessionStorage]) {
    try {
      for (const key of Object.keys(store)) if (key.startsWith("kaizenedu") && key !== STORE_KEY) store.removeItem(key);
    } catch {}
  }
  try {
    const dbs = (await globalThis.indexedDB?.databases?.()) ?? [];
    await Promise.all(
      dbs.map(
        (db) =>
          new Promise<void>((done) => {
            if (!db.name) return done();
            const req = indexedDB.deleteDatabase(db.name);
            req.onsuccess = req.onerror = req.onblocked = () => done();
          }),
      ),
    );
  } catch {}
  try {
    if (globalThis.caches) await Promise.all((await caches.keys()).map((k) => caches.delete(k)));
  } catch {}
}

/** Hands the browser a file to save. */
export function downloadFile(name: string, text: string, type = "application/json") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** A full page load to the landing page, so nothing from a deleted family stays in memory on a shared device. */
export function reloadHome() {
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- deliberate full reload
  window.location.assign("/");
}
