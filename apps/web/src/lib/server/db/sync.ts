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
import { ACCOUNT_LISTS, forServer, idOf, KEEP_ON_SERVER, SYNC_LIMITS, SYNC_LISTS, utf8Bytes, type PushRecord, type RemoteRecord, type SyncList, type SyncResponse } from "./wire";

// One sync round for one account: apply what the device changed, then answer what changed on the
// server since the device's cursor. Append-only lists merge by id; everything else is last write
// wins by `updated_at` (the device's change time, corrected for its clock). The whole round runs
// in one transaction under the account's advisory lock, so rounds from two devices never interleave
// and a cursor never skips a write that commits later.
//
// Records are checked one at a time: a record the server can't take (malformed, too big, for a
// learner it doesn't have, or one Postgres refuses) is refused on its own and reported by id, and
// never costs the rest of the batch.

const Push = z.object({ id: z.string().min(1).max(SYNC_LIMITS.idLength), at: z.number().finite(), data: z.unknown().optional(), deleted: z.literal(true).optional() });
const AccountPush = z.object({ displayName: z.string(), goals: z.array(z.string()).max(10).nullable().optional(), at: z.number().finite() });

export const SyncBody = z.object({
  v: z.literal(1),
  since: z.number().int().min(0),
  now: z.number().finite(),
  learner: z.string().max(100).nullable().optional(),
  account: z.unknown().optional(),
  push: z.record(z.string(), z.array(z.unknown()).max(SYNC_LIMITS.pushRecords)).default({}),
});
export type SyncBody = z.input<typeof SyncBody>;

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
type Row = Table["$inferInsert"];
type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

// ---- text Postgres can store ----------------------------------------------------------------------

class TooDeep extends Error {}

/**
 * Postgres refuses NUL anywhere in text, and a lone half of a surrogate pair inside jsonb. Both reach
 * the device easily (text cut to a length mid-emoji), so they are cleaned rather than refused: the
 * half pair becomes U+FFFD and NUL is dropped.
 */
export function cleanText(s: string): string {
  const whole = s.isWellFormed() ? s : s.toWellFormed();
  return whole.includes("\u0000") ? whole.replaceAll("\u0000", "") : whole;
}

/** A record's JSON with every string (keys too) cleaned. Nesting deeper than any screen writes is refused. */
export function cleanJson(v: unknown, depth = 0): unknown {
  if (typeof v === "string") return cleanText(v);
  if (v === null || typeof v !== "object") return v;
  if (depth > 40) throw new TooDeep();
  if (Array.isArray(v)) return v.map((x) => cleanJson(x, depth + 1));
  // fromEntries defines own properties, so a "__proto__" key stays a plain key.
  return Object.fromEntries(Object.entries(v).map(([k, x]) => [cleanText(k), cleanJson(x, depth + 1)]));
}

function cleaned(data: unknown): unknown {
  try {
    return cleanJson(data);
  } catch {
    return undefined;
  }
}

// ---- one round ----------------------------------------------------------------------------------------

type Out = { rejected: number; flagged: number; refused: SyncResponse["refused"] };

function refuse(out: Out, list: SyncList, id: string | null) {
  out.rejected++;
  if (id) (out.refused[list] ??= []).push(id);
}

/** Keeps the newest change per id, so one statement never touches a row twice. */
function latest(list: PushRecord[]) {
  const by = new Map<string, PushRecord>();
  for (const r of list) if (!by.has(r.id) || by.get(r.id)!.at <= r.at) by.set(r.id, r);
  return [...by.values()];
}

/** The pushed lists, each record checked for shape; unknown lists and malformed records are refused. */
function readPush(push: Record<string, unknown[]>, out: Out): Partial<Record<SyncList, PushRecord[]>> {
  const lists: Partial<Record<SyncList, PushRecord[]>> = {};
  for (const [name, raw] of Object.entries(push)) {
    const known = (SYNC_LISTS as readonly string[]).includes(name);
    for (const r of raw) {
      const p = Push.safeParse(r);
      // An id goes into SQL as text, so it must be text Postgres can hold (no NUL, no half pair).
      if (known && p.success && p.data.id === cleanText(p.data.id)) (lists[name as SyncList] ??= []).push(p.data as PushRecord);
      // The id goes back whole (the device matches it to its outbox), unless it is absurd.
      else refuse(out, name as SyncList, isObj(r) && typeof r.id === "string" && r.id.length <= 1000 ? r.id : null);
    }
  }
  for (const list of Object.keys(lists) as SyncList[]) lists[list] = latest(lists[list]!);
  return lists;
}

export async function syncAccount(db: Db, accountId: string, req: SyncBody, now = Date.now()): Promise<SyncResponse> {
  const body = SyncBody.parse(req);
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${accountId}, 0))`);
    // The device's clock may run fast or slow; its change times are moved onto the server's clock.
    const skew = now - body.now;
    const stamp = (at: number) => new Date(Math.min(now, Math.max(0, Math.round(at + skew))));
    const out: Out = { rejected: 0, flagged: 0, refused: {} };
    const push = readPush(body.push, out);

    if (body.account !== undefined) {
      const a = AccountPush.safeParse(body.account);
      if (a.success) await applyAccount(tx, accountId, a.data, stamp(a.data.at));
      else out.rejected++;
    }

    // Learners first: every other record must belong to one of this account's learners.
    await applyRecords(tx, accountId, "profiles", push.profiles ?? [], stamp, null, out);
    const known = new Map<string, Locale>();
    for (const p of await tx.select({ id: profiles.id, data: profiles.data }).from(profiles).where(and(eq(profiles.accountId, accountId), eq(profiles.deleted, false))))
      known.set(p.id, (p.data as { locale?: Locale }).locale === "es" ? "es" : "en");

    for (const list of SYNC_LISTS)
      if (list !== "profiles" && list !== "attempts") await applyRecords(tx, accountId, list, push[list] ?? [], stamp, known, out);
    await applyAttempts(tx, accountId, push.attempts ?? [], known, out);

    return { ...(await pull(tx, accountId, body.since)), rejected: out.rejected, refused: out.refused, flagged: out.flagged };
  });
}

async function applyAccount(tx: Tx, accountId: string, a: z.infer<typeof AccountPush>, at: Date) {
  const displayName = cleanText(a.displayName).trim().slice(0, NAME_MAX);
  if (!displayName) return;
  const goals = a.goals === undefined ? undefined : a.goals === null ? null : (a.goals.filter((g): g is Goal => GOALS.includes(g as Goal)) as Goal[]);
  await tx
    .update(accounts)
    .set({ displayName, ...(goals !== undefined ? { goals } : {}), updatedAt: at, seq: sql`nextval('sync_seq')` })
    .where(and(eq(accounts.id, accountId), lt(accounts.updatedAt, at)));
}

/** Validates a pushed record for its list. Returns the row's profile id (null for account lists) and clean data, or undefined to refuse it. */
function check(list: SyncList, r: PushRecord, accountId: string, known: Map<string, Locale> | null): { profileId: string | null; data: Obj } | undefined {
  const data = cleaned(forServer(list, r.data));
  if (!isObj(data) || utf8Bytes(JSON.stringify(data)) > SYNC_LIMITS.recordBytes || idOf(list, data) !== r.id) return undefined;
  if (list === "profiles") {
    if (!ProfileData.safeParse(data).success) return undefined;
    return { profileId: null, data: { ...data, accountId } };
  }
  if (ACCOUNT_LISTS.includes(list)) return { profileId: null, data };
  const profileId = data.profileId;
  if (typeof profileId !== "string" || !known?.has(profileId)) return undefined;
  return { profileId, data };
}

async function upsert(tx: Tx, list: SyncList, table: Table, rows: Row[]) {
  return await tx
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
      // A removed learner stays removed: an older device's edit can't bring a child's record back.
      setWhere: list === "profiles" ? sql`excluded.updated_at > ${table.updatedAt} and not ${table.deleted}` : sql`excluded.updated_at > ${table.updatedAt}`,
    })
    .returning({ id: table.id, deleted: table.deleted });
}

async function applyRecords(tx: Tx, accountId: string, list: SyncList, pushed: PushRecord[], stamp: (at: number) => Date, known: Map<string, Locale> | null, out: Out) {
  if (!pushed.length) return;
  const table = RECORD_TABLES[list as keyof typeof RECORD_TABLES] as unknown as Table;
  const rows: Row[] = [];
  const deletes = pushed.filter((r) => r.deleted);
  // A delete only matters for a row the server has; lists kept on the server ignore device trims.
  const existing =
    deletes.length && !KEEP_ON_SERVER.includes(list)
      ? new Set((await tx.select({ id: table.id }).from(table).where(and(eq(table.accountId, accountId), inArray(table.id, deletes.map((d) => d.id))))).map((r) => r.id))
      : new Set<string>();
  for (const r of pushed) {
    if (r.deleted) {
      if (existing.has(r.id)) rows.push({ accountId, id: r.id, profileId: null, data: {}, updatedAt: stamp(r.at), deleted: true });
      continue;
    }
    const ok = check(list, r, accountId, known);
    if (!ok) {
      refuse(out, list, r.id);
      continue;
    }
    rows.push({ accountId, id: r.id, profileId: ok.profileId, data: ok.data, updatedAt: stamp(r.at), deleted: false });
  }
  if (!rows.length) return;

  let applied: { id: string; deleted: boolean }[];
  const failed = new Set<string>();
  try {
    applied = await tx.transaction((sp) => upsert(sp, list, table, rows));
  } catch {
    // Postgres refused the batch: find the row it won't take, and keep the rest.
    applied = [];
    for (const row of rows) {
      try {
        applied.push(...(await tx.transaction((sp) => upsert(sp, list, table, [row]))));
      } catch (e) {
        console.error(`[sync] a ${list} record was refused (${(e as { code?: string }).code ?? "error"})`);
        failed.add(row.id);
        refuse(out, list, row.id);
      }
    }
  }

  // Rows the server kept its own copy of. Unless it is the very version the device sent (a resend),
  // a fresh seq puts the server's copy after the device's cursor, so it comes back in this answer.
  const done = new Set(applied.map((a) => a.id));
  const lost = rows.filter((r) => !done.has(r.id) && !failed.has(r.id));
  if (lost.length) {
    const sent = new Map(lost.map((r) => [r.id, r]));
    const stored = await tx
      .select({ id: table.id, updatedAt: table.updatedAt, deleted: table.deleted })
      .from(table)
      .where(and(eq(table.accountId, accountId), inArray(table.id, [...sent.keys()])));
    const differ = stored.filter((s) => s.updatedAt.getTime() !== sent.get(s.id)!.updatedAt!.getTime() || s.deleted !== sent.get(s.id)!.deleted).map((s) => s.id);
    if (differ.length) await tx.update(table).set({ seq: sql`nextval('sync_seq')` }).where(and(eq(table.accountId, accountId), inArray(table.id, differ)));
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
    const a = AttemptData.safeParse(cleaned(r.data));
    if (!a.success || a.data.id !== r.id || !known.has(a.data.profileId)) {
      refuse(out, "attempts", r.id);
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
      // A helped check answer stays helped: it is not on the learner's own (lib/practice.ts recordAnswer).
      assisted: a.assisted,
      seconds: Math.round(a.seconds),
      response: a.response ?? null,
      why: verdict.correct ? null : (a.why ?? null),
      verdict: verdict.verdict,
      flagged: verdict.verdict === "forged",
    };
  });
  await tx.insert(attempts).values(rows).onConflictDoNothing();
}

// ---- what the device gets back ------------------------------------------------------------------------

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
    passwordConfirmed: r.passwordConfirmed,
  };
}

export async function receiptsOf(tx: Tx | Db, accountId: string) {
  return (await tx.select().from(consentReceipts).where(eq(consentReceipts.accountId, accountId)).orderBy(asc(consentReceipts.grantedAt))).map(toReceipt);
}

type Item = { seq: number; list: SyncList; id: string; bytes: number };

/** The JSON envelope around each record in an answer, roughly: `{"id":"…","data":…},`. */
const ENVELOPE = 24;
/** An answer's row as it goes out (an attempt's columns as JSON) is about this big besides its text. */
const ATTEMPT_BYTES = 260;

/**
 * Everything after `since`, oldest write first, one page at a time: at most `pullRows` rows and
 * `pullBytes` of data, measured before the data is read. On a device's first sync the learners come
 * along in full whatever their place in the order, so a new phone shows the family at once.
 */
async function pull(tx: Tx, accountId: string, since: number): Promise<Pick<SyncResponse, "cursor" | "more" | "changes" | "account" | "consent">> {
  const limit = SYNC_LIMITS.pullRows;
  const items: Item[] = [];
  for (const [list, t] of Object.entries(RECORD_TABLES) as [SyncList, Table][]) {
    const rows = await tx
      .select({ seq: t.seq, id: t.id, bytes: sql<number>`case when ${t.deleted} then 0 else octet_length(${t.data}::text) end` })
      .from(t)
      .where(and(eq(t.accountId, accountId), gt(t.seq, since)))
      .orderBy(asc(t.seq))
      .limit(limit + 1);
    for (const r of rows) items.push({ seq: r.seq, list, id: r.id, bytes: Number(r.bytes) + utf8Bytes(r.id) + ENVELOPE });
  }
  const attemptRows = await tx
    .select({ seq: attempts.seq, id: attempts.id, bytes: sql<number>`octet_length(coalesce(${attempts.response}, '') || coalesce(${attempts.why}, '') || ${attempts.skillId})` })
    .from(attempts)
    .where(and(eq(attempts.accountId, accountId), gt(attempts.seq, since)))
    .orderBy(asc(attempts.seq))
    .limit(limit + 1);
  for (const a of attemptRows) items.push({ seq: a.seq, list: "attempts", id: a.id, bytes: Number(a.bytes) + 2 * utf8Bytes(a.id) + ATTEMPT_BYTES });

  items.sort((a, b) => a.seq - b.seq);
  let bytes = 0;
  let take = 0;
  while (take < items.length && take < limit && (take === 0 || bytes + items[take].bytes <= SYNC_LIMITS.pullBytes)) bytes += items[take++].bytes;
  const page = items.slice(0, take);
  const more = take < items.length;

  // Now the data, for the page only.
  const wanted = new Map<SyncList, string[]>();
  for (const it of page) wanted.set(it.list, [...(wanted.get(it.list) ?? []), it.id]);
  const found = new Map<string, RemoteRecord>();
  const key = (list: SyncList, id: string) => `${list}\u0000${id}`;
  for (const [list, ids] of wanted) {
    if (list === "attempts") {
      for (const a of await tx.select().from(attempts).where(and(eq(attempts.accountId, accountId), inArray(attempts.id, ids)))) found.set(key(list, a.id), attemptRecord(a));
      continue;
    }
    const t = RECORD_TABLES[list as keyof typeof RECORD_TABLES] as unknown as Table;
    for (const r of await tx.select({ id: t.id, data: t.data, deleted: t.deleted }).from(t).where(and(eq(t.accountId, accountId), inArray(t.id, ids)))) found.set(key(list, r.id), remote(r));
  }
  const changes: SyncResponse["changes"] = {};
  for (const it of page) {
    const r = found.get(key(it.list, it.id));
    if (r) (changes[it.list] ??= []).push(r);
  }
  if (since === 0) {
    const have = new Set((changes.profiles ?? []).map((r) => r.id));
    const all = await tx.select({ id: profiles.id, data: profiles.data, deleted: profiles.deleted }).from(profiles).where(and(eq(profiles.accountId, accountId), eq(profiles.deleted, false))).orderBy(asc(profiles.seq)).limit(200);
    const early = all.filter((p) => !have.has(p.id)).map(remote);
    if (early.length) changes.profiles = [...early, ...(changes.profiles ?? [])];
  }

  // The account and consent receipts are small: they come whenever they changed after `since`.
  const [acct] = await tx.select().from(accounts).where(and(eq(accounts.id, accountId), gt(accounts.seq, since)));
  const [consent] = await tx
    .select({ seq: sql<number>`max(${consentReceipts.seq})` })
    .from(consentReceipts)
    .where(and(eq(consentReceipts.accountId, accountId), gt(consentReceipts.seq, since)));
  const consentSeq = consent?.seq === null || consent?.seq === undefined ? null : Number(consent.seq);

  const last = page.length ? page[page.length - 1].seq : since;
  const cursor = more ? last : Math.max(last, acct?.seq ?? since, consentSeq ?? since);
  const res: Awaited<ReturnType<typeof pull>> = { cursor, more, changes };
  if (acct) res.account = { displayName: acct.displayName, goals: acct.goals ?? null };
  if (consentSeq !== null) res.consent = await receiptsOf(tx, accountId);
  return res;
}
