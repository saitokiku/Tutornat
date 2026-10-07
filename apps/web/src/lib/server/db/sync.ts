import "server-only";
import { and, asc, eq, gt, inArray, isNull, lt, sql } from "drizzle-orm";
import { z } from "zod";
import type { PracticeSet } from "@/learning/types";
import { GOALS, GRADES, type Goal, type Locale } from "@/lib/types";
import { getSkill } from "@/practice/skills";
import type { Db } from "./client";
import { NAME_MAX } from "./fields";
import type { ConsentReceipt } from "./policy";
import { recheck } from "./recheck";
import { accounts, attempts, consentReceipts, courses, profiles, RECORD_TABLES, sets } from "./schema";
import { ACCOUNT_LISTS, idOf, KEEP_ON_SERVER, SYNC_LIMITS, SYNC_LISTS, type PushRecord, type RemoteRecord, type SyncList, type SyncResponse } from "./wire";

// One sync round for one account: apply what the device changed, then answer what changed on the
// server since the device's cursor. Append-only lists merge by id; everything else is last write
// wins by `updated_at` (the device's change time, corrected for its clock). The whole round runs
// in one transaction under the account's advisory lock, so rounds from two devices never interleave
// and a cursor never skips a write that commits later.

const Push = z.object({ id: z.string().min(1).max(300), at: z.number().finite(), data: z.unknown().optional(), deleted: z.literal(true).optional() });

export const SyncBody = z.object({
  v: z.literal(1),
  since: z.number().int().min(0),
  now: z.number().finite(),
  account: z.object({ displayName: z.string().max(400), goals: z.array(z.string()).max(10).nullable().optional(), at: z.number().finite() }).optional(),
  push: z.partialRecord(z.enum(SYNC_LISTS), z.array(Push).max(SYNC_LIMITS.pushRecords)).default({}),
});
export type SyncBody = z.infer<typeof SyncBody>;

const AttemptData = z.object({
  id: z.string().min(1).max(100),
  profileId: z.string().min(1).max(100),
  at: z.number().finite(),
  skillId: z.string().min(1).max(120),
  level: z.number().int().min(1).max(100),
  seed: z.number().int().min(0).max(2 ** 32),
  setId: z.string().max(100).optional(),
  mode: z.enum(["practice", "review", "check", "placement", "prep", "tutor"]),
  correct: z.boolean(),
  assisted: z.boolean(),
  seconds: z.number().finite().min(0).max(86_400),
  response: z.string().max(200).optional(),
  why: z.string().max(80).optional(),
});

const ProfileData = z.looseObject({
  id: z.string().min(1).max(100),
  nickname: z.string().trim().min(1).max(40),
  grade: z.string().refine((g) => (GRADES as string[]).includes(g)),
  locale: z.enum(["en", "es"]),
});

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Table = typeof courses;
type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const tooBig = (v: unknown) => JSON.stringify(v).length > SYNC_LIMITS.recordBytes;
const PULL_BYTES = 4_000_000;

/** Keeps the newest change per id, so one statement never touches a row twice. */
function latest(list: PushRecord[]) {
  const by = new Map<string, PushRecord>();
  for (const r of list) if (!by.has(r.id) || by.get(r.id)!.at <= r.at) by.set(r.id, r);
  return [...by.values()];
}

export async function syncAccount(db: Db, accountId: string, req: SyncBody, now = Date.now()): Promise<SyncResponse> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${accountId}, 0))`);
    // The device's clock may run fast or slow; its change times are moved onto the server's clock.
    const skew = now - req.now;
    const stamp = (at: number) => new Date(Math.min(now, Math.max(0, Math.round(at + skew))));
    const out: Out = { rejected: 0, flagged: 0, conflicts: {} };

    if (req.account) await applyAccount(tx, accountId, req.account, stamp(req.account.at));

    // Learners first: every other record must belong to one of this account's learners.
    await applyRecords(tx, accountId, "profiles", latest(req.push.profiles ?? []), stamp, null, out);
    const known = new Map<string, Locale>();
    for (const p of await tx.select({ id: profiles.id, data: profiles.data }).from(profiles).where(and(eq(profiles.accountId, accountId), eq(profiles.deleted, false))))
      known.set(p.id, (p.data as { locale?: Locale }).locale === "es" ? "es" : "en");

    for (const list of SYNC_LISTS)
      if (list !== "profiles" && list !== "attempts") await applyRecords(tx, accountId, list, latest(req.push[list] ?? []), stamp, known, out);
    await applyAttempts(tx, accountId, latest(req.push.attempts ?? []), known, out);

    return { ...(await pull(tx, accountId, req.since)), conflicts: out.conflicts, rejected: out.rejected, flagged: out.flagged };
  });
}

async function applyAccount(tx: Tx, accountId: string, a: NonNullable<SyncBody["account"]>, at: Date) {
  const displayName = a.displayName.trim().slice(0, NAME_MAX);
  if (!displayName) return;
  const goals = a.goals === undefined ? undefined : a.goals === null ? null : (a.goals.filter((g): g is Goal => GOALS.includes(g as Goal)) as Goal[]);
  await tx
    .update(accounts)
    .set({ displayName, ...(goals !== undefined ? { goals } : {}), updatedAt: at, seq: sql`nextval('sync_seq')` })
    .where(and(eq(accounts.id, accountId), lt(accounts.updatedAt, at)));
}

type Out = { rejected: number; flagged: number; conflicts: SyncResponse["conflicts"] };

/** Validates a pushed record for its list. Returns the row's profile id (null for account lists), or undefined to refuse it. */
function check(list: SyncList, r: PushRecord, accountId: string, known: Map<string, Locale> | null): { profileId: string | null; data: Obj } | undefined {
  if (!isObj(r.data) || tooBig(r.data) || idOf(list, r.data) !== r.id) return undefined;
  if (list === "profiles") {
    if (!ProfileData.safeParse(r.data).success) return undefined;
    return { profileId: null, data: { ...r.data, accountId } };
  }
  if (ACCOUNT_LISTS.includes(list)) return { profileId: null, data: r.data };
  const profileId = r.data.profileId;
  if (typeof profileId !== "string" || !known?.has(profileId)) return undefined;
  return { profileId, data: r.data };
}

async function applyRecords(tx: Tx, accountId: string, list: SyncList, pushed: PushRecord[], stamp: (at: number) => Date, known: Map<string, Locale> | null, out: Out) {
  if (!pushed.length) return;
  const table = RECORD_TABLES[list as keyof typeof RECORD_TABLES] as unknown as Table;
  const rows: Table["$inferInsert"][] = [];
  const deletes = pushed.filter((r) => r.deleted);
  // A delete only matters for a row the server has; lists kept on the server ignore device trims.
  const existing = deletes.length && !KEEP_ON_SERVER.includes(list)
    ? new Set((await tx.select({ id: table.id }).from(table).where(and(eq(table.accountId, accountId), inArray(table.id, deletes.map((d) => d.id))))).map((r) => r.id))
    : new Set<string>();
  for (const r of pushed) {
    if (r.deleted) {
      if (existing.has(r.id)) rows.push({ accountId, id: r.id, profileId: null, data: {}, updatedAt: stamp(r.at), deleted: true });
      continue;
    }
    const ok = check(list, r, accountId, known);
    if (!ok) {
      out.rejected++;
      continue;
    }
    rows.push({ accountId, id: r.id, profileId: ok.profileId, data: ok.data, updatedAt: stamp(r.at), deleted: false });
  }
  if (!rows.length) return;
  const applied = await tx
    .insert(table)
    .values(rows)
    .onConflictDoUpdate({
      target: [table.accountId, table.id],
      set: {
        data: sql`excluded.data`,
        profileId: sql`coalesce(excluded.profile_id, ${table.profileId})`,
        updatedAt: sql`excluded.updated_at`,
        deleted: sql`excluded.deleted`,
        seq: sql`nextval('sync_seq')`,
      },
      setWhere: sql`excluded.updated_at > ${table.updatedAt}`,
    })
    .returning({ id: table.id, deleted: table.deleted });
  const done = new Set(applied.map((a) => a.id));
  const lost = rows.filter((r) => !done.has(r.id)).map((r) => r.id);
  if (lost.length) {
    // The server's copy is newer: the device takes it.
    const current = await tx.select().from(table).where(and(eq(table.accountId, accountId), inArray(table.id, lost)));
    out.conflicts[list] = current.map(remote);
  }
  if (list === "profiles") for (const a of applied) if (a.deleted) await purgeLearner(tx, accountId, a.id);
}

/** A learner was removed: everything of theirs leaves the server; their consents are revoked and kept as receipts. */
async function purgeLearner(tx: Tx, accountId: string, profileId: string) {
  for (const [list, t] of Object.entries(RECORD_TABLES)) {
    if (list === "profiles") continue;
    const table = t as unknown as Table;
    await tx.delete(table).where(and(eq(table.accountId, accountId), eq(table.profileId, profileId)));
  }
  await tx.delete(attempts).where(and(eq(attempts.accountId, accountId), eq(attempts.profileId, profileId)));
  await tx
    .update(consentReceipts)
    .set({ revokedAt: sql`now()`, updatedAt: sql`now()`, seq: sql`nextval('sync_seq')` })
    .where(and(eq(consentReceipts.accountId, accountId), eq(consentReceipts.profileId, profileId), isNull(consentReceipts.revokedAt)));
}

async function applyAttempts(tx: Tx, accountId: string, pushed: PushRecord[], known: Map<string, Locale>, out: Out) {
  const valid: z.infer<typeof AttemptData>[] = [];
  for (const r of pushed) {
    if (r.deleted) continue; // append-only: a device trimming its copy deletes nothing here
    const a = AttemptData.safeParse(r.data);
    if (!a.success || a.data.id !== r.id || !known.has(a.data.profileId)) {
      out.rejected++;
      continue;
    }
    valid.push(a.data);
  }
  if (!valid.length) return;
  const seen = new Set(
    (await tx.select({ id: attempts.id }).from(attempts).where(and(eq(attempts.accountId, accountId), inArray(attempts.id, valid.map((a) => a.id))))).map((r) => r.id),
  );
  const fresh = valid.filter((a) => !seen.has(a.id));
  if (!fresh.length) return;
  const setIds = [...new Set(fresh.map((a) => a.setId).filter((x): x is string => Boolean(x)))];
  const setById = new Map<string, PracticeSet>();
  if (setIds.length)
    for (const s of await tx.select({ id: sets.id, data: sets.data }).from(sets).where(and(eq(sets.accountId, accountId), inArray(sets.id, setIds), eq(sets.deleted, false))))
      setById.set(s.id, s.data as PracticeSet);

  const rows = fresh.map((a) => {
    const locale = known.get(a.profileId)!;
    const set = a.setId ? (setById.get(a.setId) ?? null) : null;
    const verdict = recheck(a, { locales: [locale, locale === "en" ? "es" : "en"], set: set && Array.isArray(set.slots) ? set : null });
    if (verdict.verdict === "forged") out.flagged++;
    const skill = getSkill(a.skillId);
    return {
      accountId,
      id: a.id,
      profileId: a.profileId,
      at: new Date(a.at),
      skillId: a.skillId,
      level: skill ? Math.min(Math.max(1, a.level), skill.levels) : a.level,
      seed: a.seed,
      setId: a.setId ?? null,
      mode: a.mode,
      correct: verdict.correct,
      claimedCorrect: a.correct,
      // Nothing in a check can be helped (lib/practice.ts records it the same way).
      assisted: a.mode === "check" ? false : a.assisted,
      seconds: Math.round(a.seconds),
      response: a.response ?? null,
      why: verdict.correct ? null : (a.why ?? null),
      verdict: verdict.verdict,
      flagged: verdict.verdict === "forged",
    };
  });
  await tx.insert(attempts).values(rows).onConflictDoNothing();
}

function remote(row: { id: string; data: unknown; deleted: boolean }): RemoteRecord {
  return row.deleted ? { id: row.id, deleted: true } : { id: row.id, data: row.data };
}

function attemptRecord(a: typeof attempts.$inferSelect): RemoteRecord {
  return {
    id: a.id,
    data: {
      id: a.id,
      profileId: a.profileId,
      at: a.at.getTime(),
      skillId: a.skillId,
      level: a.level,
      seed: a.seed,
      ...(a.setId ? { setId: a.setId } : {}),
      mode: a.mode,
      correct: a.correct,
      assisted: a.assisted,
      seconds: a.seconds,
      ...(a.response !== null ? { response: a.response } : {}),
      ...(a.why !== null ? { why: a.why } : {}),
    },
  };
}

export function toReceipt(r: typeof consentReceipts.$inferSelect): ConsentReceipt {
  return {
    id: r.id,
    profileId: r.profileId,
    method: r.method,
    verified: r.verified,
    scope: r.scope,
    noticeVersion: r.noticeVersion,
    under13: r.under13,
    grantedAt: r.grantedAt.getTime(),
    ...(r.revokedAt ? { revokedAt: r.revokedAt.getTime() } : {}),
    grantedBy: r.grantedBy,
  };
}

export async function receiptsOf(tx: Tx | Db, accountId: string) {
  return (await tx.select().from(consentReceipts).where(eq(consentReceipts.accountId, accountId)).orderBy(asc(consentReceipts.grantedAt))).map(toReceipt);
}

type Item = { seq: number; list: SyncList | "account" | "consent"; record?: RemoteRecord; size: number };

/** Everything after `since`, oldest write first, at most one page. */
async function pull(tx: Tx, accountId: string, since: number): Promise<Pick<SyncResponse, "cursor" | "more" | "changes" | "account" | "consent">> {
  const limit = SYNC_LIMITS.pullRows;
  const items: Item[] = [];
  for (const [list, t] of Object.entries(RECORD_TABLES) as [SyncList, Table][]) {
    const rows = await tx.select().from(t).where(and(eq(t.accountId, accountId), gt(t.seq, since))).orderBy(asc(t.seq)).limit(limit + 1);
    for (const r of rows) items.push({ seq: r.seq, list, record: remote(r), size: r.deleted ? 60 : JSON.stringify(r.data).length });
  }
  for (const a of await tx.select().from(attempts).where(and(eq(attempts.accountId, accountId), gt(attempts.seq, since))).orderBy(asc(attempts.seq)).limit(limit + 1))
    items.push({ seq: a.seq, list: "attempts", record: attemptRecord(a), size: 300 });
  for (const c of await tx.select({ seq: consentReceipts.seq }).from(consentReceipts).where(and(eq(consentReceipts.accountId, accountId), gt(consentReceipts.seq, since))).limit(limit + 1))
    items.push({ seq: c.seq, list: "consent", size: 300 });
  const [acct] = await tx.select().from(accounts).where(and(eq(accounts.id, accountId), gt(accounts.seq, since)));
  if (acct) items.push({ seq: acct.seq, list: "account", size: 200 });

  items.sort((a, b) => a.seq - b.seq);
  let bytes = 0;
  let take = 0;
  while (take < items.length && take < limit && (take === 0 || bytes + items[take].size <= PULL_BYTES)) bytes += items[take++].size;
  const page = items.slice(0, take);
  const more = take < items.length;
  const changes: SyncResponse["changes"] = {};
  let consent = false;
  for (const it of page) {
    if (it.list === "consent") consent = true;
    else if (it.list !== "account") (changes[it.list] ??= []).push(it.record!);
  }
  const res: Awaited<ReturnType<typeof pull>> = { cursor: page.length ? page[page.length - 1].seq : since, more, changes };
  if (acct && page.some((i) => i.list === "account")) res.account = { displayName: acct.displayName, goals: acct.goals ?? null };
  if (consent) res.consent = await receiptsOf(tx, accountId);
  return res;
}
