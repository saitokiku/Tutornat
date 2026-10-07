import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { Grade } from "@/lib/types";
import { readSession } from "./auth";
import { getDb, serverMode, type Db } from "./client";
import { json, readCookie, SESSION_COOKIE } from "./http";
import { CONSENT_NOTICE_VERSION, consentAllows, DEV_METHOD, gradeAge, PARENT_METHOD, type ConsentReceipt, type ConsentScope } from "./policy";
import { accounts, consentReceipts, profiles } from "./schema";
import { receiptsOf, toReceipt } from "./sync";

// Parent-first consent on the server: grown-ups record consent for a learner before the AI tutor or
// voice can be used, and every consent leaves a receipt they can read and revoke.
//
// How a grown-up is verified is pluggable. COPPA-listed methods (a card charge, a signed form, a
// check against ID, a video call) need a vendor and counsel; each becomes a ConsentMethod with
// `verified: true` once both are in place. Until then there are two built-in methods, neither of
// which verifies anyone, so in production an under-13 learner's AI and voice stay off.

type Env = Record<string, string | undefined>;

export interface ConsentMethod {
  id: string;
  /** Meets COPPA's verifiable parental consent. Only a vendor-backed method approved by counsel. */
  verified: boolean;
  /** May be used for a learner under 13. */
  forUnder13: boolean;
  available(env: Env): boolean;
  /** Runs the method's check. `evidence` is the vendor's reference (never a card number or a document). */
  verify(ctx: { accountId: string; profileId: string; req: Request }): Promise<{ ok: true; evidence?: string } | { ok: false }>;
}

/** For building and testing the flow. Never offered in production. Recorded as "not verified". */
const devNotVerified: ConsentMethod = {
  id: DEV_METHOD,
  verified: false,
  forUnder13: true,
  available: (env) => env.NODE_ENV !== "production",
  verify: async () => ({ ok: true }),
};

/** The signed-in account holder confirms. Enough for a learner 13 or older; never for a younger child. */
const parentConfirmed: ConsentMethod = {
  id: PARENT_METHOD,
  verified: false,
  forUnder13: false,
  available: () => true,
  verify: async () => ({ ok: true }),
};

/** Every way consent can be given. A verified vendor method is added here. */
export const CONSENT_METHODS: ConsentMethod[] = [devNotVerified, parentConfirmed];

export const methodsFor = (env: Env = process.env) => CONSENT_METHODS.filter((m) => m.available(env));

export type GrantInput = { profileId: string; scope: ConsentScope[]; method: string; under13: boolean; noticeVersion: string };
export type GrantError = "learner" | "method" | "notice" | "declined";

const lock = (db: Db, accountId: string) => db.execute(sql`select pg_advisory_xact_lock(hashtextextended(${accountId}, 0))`);

async function learner(db: Db, accountId: string, profileId: string): Promise<{ grade: Grade } | null> {
  const [p] = await db.select({ data: profiles.data }).from(profiles).where(and(eq(profiles.accountId, accountId), eq(profiles.id, profileId), eq(profiles.deleted, false)));
  const grade = (p?.data as { grade?: Grade } | undefined)?.grade;
  return grade ? { grade } : null;
}

export async function grantConsent(
  db: Db,
  accountId: string,
  input: GrantInput,
  ctx: { req: Request; env?: Env },
): Promise<{ ok: true; receipt: ConsentReceipt } | { ok: false; error: GrantError }> {
  const env = ctx.env ?? process.env;
  const p = await learner(db, accountId, input.profileId);
  if (!p) return { ok: false, error: "learner" };
  const age = gradeAge(p.grade);
  // K–7 count as under 13 whatever the form says; for 8 and 9 the grown-up says.
  const under13 = age === "under13" ? true : age === "adult" ? false : input.under13;
  const method = methodsFor(env).find((m) => m.id === input.method);
  if (!method || (under13 && !method.forUnder13)) return { ok: false, error: "method" };
  if (input.noticeVersion !== CONSENT_NOTICE_VERSION) return { ok: false, error: "notice" };
  const result = await method.verify({ accountId, profileId: input.profileId, req: ctx.req });
  if (!result.ok) return { ok: false, error: "declined" };
  return db.transaction(async (tx) => {
    await lock(tx, accountId);
    // Still there after the method's check (a removed learner gets no new consent).
    if (!(await learner(tx, accountId, input.profileId))) return { ok: false as const, error: "learner" as const };
    const [a] = await tx.select({ email: accounts.email }).from(accounts).where(eq(accounts.id, accountId));
    const [row] = await tx
      .insert(consentReceipts)
      .values({
        id: randomUUID(),
        accountId,
        profileId: input.profileId,
        method: method.id,
        verified: method.verified,
        scope: [...new Set(input.scope)],
        noticeVersion: input.noticeVersion,
        under13,
        evidence: result.evidence ?? null,
        grantedBy: a.email,
      })
      .returning();
    return { ok: true as const, receipt: toReceipt(row) };
  });
}

/** Revoking keeps the receipt (with when it ended) and switches the AI tutor and voice off at once. */
export async function revokeConsent(db: Db, accountId: string, id: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    await lock(tx, accountId);
    const rows = await tx
      .update(consentReceipts)
      .set({ revokedAt: sql`now()`, updatedAt: sql`now()`, seq: sql`nextval('sync_seq')` })
      .where(and(eq(consentReceipts.accountId, accountId), eq(consentReceipts.id, id), isNull(consentReceipts.revokedAt)))
      .returning({ id: consentReceipts.id });
    return rows.length > 0;
  });
}

export const listReceipts = (db: Db, accountId: string) => receiptsOf(db, accountId);

/**
 * For AI and voice routes: refuses a request made for a learner whose consent doesn't allow `scope`.
 * Browser-only deployments (no DATABASE_URL) are unchanged: it always allows. A request with no
 * learner (a grown-up's own use) is allowed; a learner id needs a signed-in account that owns it.
 *
 *   const refused = await consentGate(req, req.headers.get("x-kaizen-learner"), "ai");
 *   if (refused) return refused;
 */
export async function consentGate(req: Request, profileId: string | null | undefined, scope: ConsentScope): Promise<Response | null> {
  if (!serverMode() || !profileId) return null;
  const db = await getDb();
  const session = await readSession(db, readCookie(req, SESSION_COOKIE));
  if (!session) return json({ error: "signed_out" }, { status: 401 });
  const p = await learner(db, session.accountId, profileId);
  if (!p) return json({ error: "learner" }, { status: 403 });
  const list = (await receiptsOf(db, session.accountId)).filter((r) => r.profileId === profileId);
  const allowed = consentAllows({ grade: p.grade, receipts: list, scope, production: process.env.NODE_ENV === "production" });
  return allowed ? null : json({ error: "consent", scope }, { status: 403 });
}
