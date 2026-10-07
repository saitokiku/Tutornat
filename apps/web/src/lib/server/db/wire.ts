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
  account?: AccountFields & { at: number };
  push: Partial<Record<SyncList, PushRecord[]>>;
};

export type RemoteRecord = { id: string; data?: unknown; deleted?: true };

export type SyncResponse = {
  cursor: number;
  /** True when more changes wait; ask again with the new cursor. */
  more: boolean;
  account?: AccountFields;
  /** What changed on the server since `since`, including what this request just wrote. */
  changes: Partial<Record<SyncList, RemoteRecord[]>>;
  /** Pushed records the server kept its own (newer) version of. The device takes these. */
  conflicts: Partial<Record<SyncList, RemoteRecord[]>>;
  /** Pushed records refused (unknown learner, malformed). They are not retried. */
  rejected: number;
  /** Answers sent as right that the server's own check found wrong. Stored as wrong. */
  flagged: number;
  /** Every consent receipt on the account, when any changed. */
  consent?: ConsentReceipt[];
};

/** Limits both sides respect. */
export const SYNC_LIMITS = {
  /** Records per push request; the device sends the rest in the next request. */
  pushRecords: 500,
  /** Rows per answer; `more` says when there are others. */
  pullRows: 2000,
  /** Largest single record (a course with many lessons is the biggest). */
  recordBytes: 512_000,
  /** Largest request body. */
  bodyBytes: 6_000_000,
} as const;
