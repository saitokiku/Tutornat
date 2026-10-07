import type { Goal } from "@/lib/types";
import type { ConsentReceipt } from "./policy";

// The sync protocol, shared by the browser (lib/sync.ts) and the server (server/db/sync.ts). Pure:
// no server-only imports, so both sides agree on list names and record identity.

/** Store lists that follow the family to the server. `resets`, `session` and `prefs` stay on the device. */
export const SYNC_LISTS = [
  "profiles",
  "courses",
  "activity",
  "notes",
  "attempts",
  "sets",
  "events",
  "classes",
  "feedback",
  "results",
  "planDone",
  "reading",
  "threads",
  "acts",
  "reviews",
] as const;
export type SyncList = (typeof SYNC_LISTS)[number];

/**
 * Lists where a record vanishing from a device is not a delete: attempts are append-only, and acts and
 * threads are trimmed to a cap on each device while the server keeps everything. They leave the server
 * only when their learner is removed.
 */
export const KEEP_ON_SERVER: readonly SyncList[] = ["attempts", "acts", "threads"];

/** Lists not tied to one learner (scoped to the account). */
export const ACCOUNT_LISTS: readonly SyncList[] = ["profiles", "reviews"];

/**
 * Fields that never leave the device. A class's calendar feed link carries a private token from the
 * school's system (Canvas, Classroom): it stays on the device that added it, as the import screen says.
 */
export const DEVICE_ONLY: Partial<Record<SyncList, readonly string[]>> = { classes: ["feedUrl"] };

type Keyed = { id?: unknown; profileId?: unknown; date?: unknown; key?: unknown };

/** A record's identity inside its list. Plan lines have no id: the learner, day and line key are it. */
export function idOf(list: SyncList, record: Keyed): string {
  if (list === "planDone") return `${String(record.profileId)}|${String(record.date)}|${String(record.key)}`;
  return String(record.id);
}

/** One local change: the record as it is now (or a delete), stamped with when it changed on the device. */
export type PushRecord = { id: string; at: number; data?: unknown; deleted?: true };

export type AccountFields = { displayName: string; goals?: Goal[] | null };

/** The account as the server shows it to its own browser. Never includes the password hash. */
export type PublicAccount = { id: string; email: string; displayName: string; goals: Goal[] | null; createdAt: number };

export type SyncRequest = {
  v: 1;
  /** The cursor from the last answer (0 on a device's first sync). */
  since: number;
  /** The device clock when it sent this, so the server can correct a clock that runs fast or slow. */
  now: number;
  /**
   * Who is using this device now: a learner's id, "parent" for the grown-up, or null at the picker.
   * The server keeps it on the session, so AI and voice routes check that learner's consent.
   */
  learner?: string | null;
  account?: AccountFields & { at: number };
  push: Partial<Record<SyncList, PushRecord[]>>;
};

export type RemoteRecord = { id: string; data?: unknown; deleted?: true };

export type SyncResponse = {
  cursor: number;
  /** True when more changes wait; ask again with the new cursor. */
  more: boolean;
  account?: AccountFields;
  /**
   * What changed on the server since `since`, including what this request just wrote. A pushed record
   * the server kept its own newer copy of comes back here as well, so the device takes that copy.
   */
  changes: Partial<Record<SyncList, RemoteRecord[]>>;
  /** How many pushed records were refused (unknown learner, malformed, too big). */
  rejected: number;
  /** The ids of refused records, by list. They stay on the device and are not saved to the account. */
  refused: Partial<Record<SyncList, string[]>>;
  /** Answers sent as right that the server's own check found wrong. Stored as wrong. */
  flagged: number;
  /** Every consent receipt on the account, when any changed. */
  consent?: ConsentReceipt[];
};

/**
 * Limits both sides respect. Sizes are UTF-8 bytes; requests and answers stay well under the 4.5 MB
 * a serverless function accepts or returns.
 */
export const SYNC_LIMITS = {
  /** Records per push request; the device sends the rest in the next request. */
  pushRecords: 500,
  /** Bytes of records per push request; the same. */
  pushBytes: 2_500_000,
  /** Rows per answer; `more` says when there are others. */
  pullRows: 2000,
  /** Bytes of records per answer; the same. */
  pullBytes: 3_000_000,
  /** Largest single record (a course with many lessons is the biggest). */
  recordBytes: 512_000,
  /** Largest request body. */
  bodyBytes: 4_000_000,
} as const;

/** UTF-8 length of a string, without encoding it. */
export function utf8Bytes(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x80) n += 1;
    else if (c < 0x800) n += 2;
    else if (c >= 0xd800 && c <= 0xdbff && (s.charCodeAt(i + 1) & 0xfc00) === 0xdc00) {
      n += 4;
      i++;
    } else n += 3;
  }
  return n;
}

/** The record as it may leave the device: without its device-only fields. */
export function forServer(list: SyncList, data: unknown): unknown {
  const drop = DEVICE_ONLY[list];
  if (!drop || typeof data !== "object" || data === null) return data;
  const out = { ...(data as Record<string, unknown>) };
  for (const k of drop) delete out[k];
  return out;
}
