import { sql } from "drizzle-orm";
import { bigint, boolean, index, integer, jsonb, pgSequence, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type { Goal } from "@/lib/types";
import type { ConsentScope } from "./policy";

// The family record on the server. The browser store stays the working copy; these tables are the
// truth it syncs with. Every row belongs to one account and every query filters by it.
//
// Synced lists keep the device's record as JSON (`data`) next to the columns the server needs to
// scope, merge and order them: the record shapes belong to the screens and grow with them, and the
// server must never drop a field it doesn't know yet. Attempts are the exception: they are the
// evidence ledger, so they are stored as columns and re-checked on arrival.
//
// Every write to a synced table draws `seq` from one sequence while holding the account's advisory
// lock (sync.ts), so "everything after cursor N" is always complete for a device that last saw N.

export const syncSeq = pgSequence("sync_seq");

const seq = () =>
  bigint("seq", { mode: "number" })
    .notNull()
    .default(sql`nextval('sync_seq')`);
const at = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    /** Lower-cased and trimmed. */
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    /** `scrypt$N$salt$hash` (auth.ts). */
    passwordHash: text("password_hash").notNull(),
    goals: jsonb("goals").$type<Goal[] | null>(),
    createdAt: at("created_at").notNull().defaultNow(),
    /** When the name or goals last changed (last write wins between devices). */
    updatedAt: at("updated_at").notNull().defaultNow(),
    seq: seq(),
  },
  (t) => [uniqueIndex("accounts_email_key").on(t.email)],
);

/** Signed-in browsers. The cookie holds a random token; only its SHA-256 is stored. */
export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    createdAt: at("created_at").notNull().defaultNow(),
    expiresAt: at("expires_at").notNull(),
  },
  (t) => [uniqueIndex("sessions_token_key").on(t.tokenHash), index("sessions_account_idx").on(t.accountId)],
);

/** Password reset links: one live link per account, used once, kept as a hash. */
export const passwordResets = pgTable(
  "password_resets",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    createdAt: at("created_at").notNull().defaultNow(),
    expiresAt: at("expires_at").notNull(),
    usedAt: at("used_at"),
  },
  (t) => [uniqueIndex("password_resets_token_key").on(t.tokenHash), index("password_resets_account_idx").on(t.accountId)],
);

/** Failed sign-ins and reset requests per key, shared by every server instance. Keys are hashed. */
export const authThrottle = pgTable("auth_throttle", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  windowStart: at("window_start").notNull(),
});

/** One synced store list. `profileId` is null only for account-wide lists (reviews, and profiles themselves). */
function recordTable<T>(name: string) {
  return pgTable(
    name,
    {
      accountId: text("account_id")
        .notNull()
        .references(() => accounts.id, { onDelete: "cascade" }),
      id: text("id").notNull(),
      profileId: text("profile_id"),
      data: jsonb("data").$type<T>().notNull(),
      /** When the record last changed on a device, corrected for that device's clock. */
      updatedAt: at("updated_at").notNull(),
      /** A tombstone: the record was removed; `data` is emptied. */
      deleted: boolean("deleted").notNull().default(false),
      seq: seq(),
    },
    (t) => [
      primaryKey({ columns: [t.accountId, t.id] }),
      index(`${name}_seq_idx`).on(t.accountId, t.seq),
      index(`${name}_profile_idx`).on(t.accountId, t.profileId),
    ],
  );
}

export const profiles = recordTable("profiles");
export const courses = recordTable("courses");
export const activity = recordTable("activity");
export const notes = recordTable("notes");
export const sets = recordTable("sets");
export const events = recordTable("events");
export const classes = recordTable("classes");
export const feedback = recordTable("feedback");
export const results = recordTable("results");
export const planDone = recordTable("plan_done");
export const reading = recordTable("reading");
export const threads = recordTable("threads");
export const acts = recordTable("acts");
export const reviews = recordTable("reviews");

/** What the server's own check made of an answer. */
export type Verdict = "verified" | "forged" | "unchecked" | "wrong";

/** The evidence ledger. Append-only: a row is written once and never updated. */
export const attempts = pgTable(
  "attempts",
  {
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    id: text("id").notNull(),
    profileId: text("profile_id").notNull(),
    at: at("at").notNull(),
    skillId: text("skill_id").notNull(),
    level: integer("level").notNull(),
    seed: bigint("seed", { mode: "number" }).notNull(),
    setId: text("set_id"),
    mode: text("mode").notNull(),
    /** The server's verdict. A forged "right" is stored as wrong. */
    correct: boolean("correct").notNull(),
    /** What the device said. */
    claimedCorrect: boolean("claimed_correct").notNull(),
    assisted: boolean("assisted").notNull(),
    seconds: integer("seconds").notNull(),
    response: text("response"),
    why: text("why"),
    verdict: text("verdict").$type<Verdict>().notNull(),
    /** A claimed right answer the server's check did not accept. */
    flagged: boolean("flagged").notNull().default(false),
    receivedAt: at("received_at").notNull().defaultNow(),
    seq: seq(),
  },
  (t) => [
    primaryKey({ columns: [t.accountId, t.id] }),
    index("attempts_seq_idx").on(t.accountId, t.seq),
    index("attempts_profile_skill_idx").on(t.accountId, t.profileId, t.skillId),
  ],
);

/** A grown-up's consent for a learner to use the AI tutor or voice, and the receipt they can read. */
export const consentReceipts = pgTable(
  "consent_receipts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    profileId: text("profile_id").notNull(),
    method: text("method").notNull(),
    verified: boolean("verified").notNull(),
    scope: jsonb("scope").$type<ConsentScope[]>().notNull(),
    noticeVersion: text("notice_version").notNull(),
    under13: boolean("under13").notNull(),
    /** A vendor's reference for a verified method. Never a card number or document image. */
    evidence: text("evidence"),
    grantedBy: text("granted_by").notNull(),
    grantedAt: at("granted_at").notNull().defaultNow(),
    revokedAt: at("revoked_at"),
    updatedAt: at("updated_at").notNull().defaultNow(),
    seq: seq(),
  },
  (t) => [index("consent_receipts_profile_idx").on(t.accountId, t.profileId), index("consent_receipts_seq_idx").on(t.accountId, t.seq)],
);

/** Synced list name → table. Attempts have their own shape and handling. */
export const RECORD_TABLES = {
  profiles,
  courses,
  activity,
  notes,
  sets,
  events,
  classes,
  feedback,
  results,
  planDone,
  reading,
  threads,
  acts,
  reviews,
} as const;

export type RecordTable = (typeof RECORD_TABLES)[keyof typeof RECORD_TABLES];
