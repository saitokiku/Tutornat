import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { Grade } from "@/lib/types";
import { confirmPassword, readSession, type AuthFail } from "./auth";
import { getDb, serverMode, type Db } from "./client";
import { json, readCookie, SESSION_COOKIE } from "./http";
import { CONSENT_NOTICE_VERSION, consentAllows, DEV_METHOD, gradeAge, PARENT_LEARNER, PARENT_METHOD, type ConsentReceipt, type ConsentScope } from "./policy";
import { consentReceipts, profiles } from "./schema";
import { receiptsOf, toReceipt } from "./sync";

// Parent-first consent on the server: grown-ups record consent for a learner before the AI tutor or
// voice can be used, and every consent leaves a receipt they can read and revoke.
//
// How a grown-up is verified is pluggable. COPPA-listed methods (a card charge, a signed form, a
// check against ID, a video call) need a vendor and counsel; each becomes a ConsentMethod with
// `verified: true` once both are in place, and its browser half registers with registerConsentFlow
// (lib/auth.ts). Until then there are two built-in methods, neither of which verifies anyone, so in
// production an under-13 learner's AI and voice stay off.
//
// Giving or revoking consent takes the account password, whatever the method: the device may be in
// a child's hands, and the receipt names the account holder.

type Env = Record<string, string | undefined>;

export interface ConsentMethod {
  id: string;
  /** Meets COPPA's verifiable parental consent. Only a vendor-backed method approved by counsel. */
  verified: boolean;
  /** May be used for a learner under 13. */
  forUnder13: boolean;
  available(env: Env): boolean;
  /**
   * Runs the method's check. `proof` is what the browser brought back from the vendor's own flow
   * (a payment intent or session id, say), for the method to confirm with the vendor server to server.
   * `evidence` is the vendor's reference to keep on the receipt (never a card number or a document).
   */
  verify(ctx: { accountId: string; profileId: string; proof: string | null; env: Env }): Promise<{ ok: true; evidence?: string } | { ok: false }>;
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

export type GrantInput = { profileId: string; scope: ConsentScope[]; method: string; under13: boolean; noticeVersion: string; password: string; proof?: string | null };
export type GrantError = "learner" | "method" | "notice" | "declined" | "password";
export type ConsentFail = { ok: false; error: GrantError } | (AuthFail & { error: "rate" });
type Ctx = { env?: Env; ip: string; now?: number };

const lock = (db: Db, accountId: string) => db.execute(sql`select pg_advisory_xact_lock(hashtextextended(${accountId}, 0))`);

async function learner(db: Db, accountId: string, profileId: string): Promise<{ grade: Grade } | null> {
  const [p] = await db.select({ data: profiles.data }).from(profiles).where(and(eq(profiles.accountId, accountId), eq(profiles.id, profileId), eq(profiles.deleted, false)));
  const grade = (p?.data as { grade?: Grade } | undefined)?.grade;
  return grade ? { grade } : null;
}

/** The account password, checked like a sign-in. A wrong one is "password"; too many, "rate". */
async function holder(db: Db, accountId: string, password: string, ctx: Ctx): Promise<{ ok: true; email: string } | ConsentFail> {
  const r = await confirmPassword(db, accountId, password, ctx);
  if (r.ok) return r;
  return r.error === "rate" ? (r as AuthFail & { error: "rate" }) : { ok: false, error: "password" };
}

export async function grantConsent(db: Db, accountId: string, input: GrantInput, ctx: Ctx): Promise<{ ok: true; receipt: ConsentReceipt } | ConsentFail> {
  const env = ctx.env ?? process.env;
  const p = await learner(db, accountId, input.profileId);
  if (!p) return { ok: false, error: "learner" };
  const age = gradeAge(p.grade);
  // K–7 count as under 13 whatever the form says; for 8 and 9 the grown-up says.
  const under13 = age === "under13" ? true : age === "adult" ? false : input.under13;
  const method = methodsFor(env).find((m) => m.id === input.method);
  if (!method || (under13 && !method.forUnder13)) return { ok: false, error: "method" };
  if (input.noticeVersion !== CONSENT_NOTICE_VERSION) return { ok: false, error: "notice" };
  const who = await holder(db, accountId, input.password, ctx);
  if (!who.ok) return who;
  const result = await method.verify({ accountId, profileId: input.profileId, proof: input.proof ?? null, env });
  if (!result.ok) return { ok: false, error: "declined" };
  return db.transaction(async (tx) => {
    await lock(tx, accountId);
    // Still there after the method's check (a removed learner gets no new consent).
    if (!(await learner(tx, accountId, input.profileId))) return { ok: false as const, error: "learner" as const };
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
        grantedBy: who.email,
        passwordConfirmed: true,
      })
      .returning();
    return { ok: true as const, receipt: toReceipt(row) };
  });
}

/** Revoking keeps the receipt (with when it ended) and switches what it covered off at once. */
export async function revokeConsent(db: Db, accountId: string, input: { id: string; password: string }, ctx: Ctx): Promise<{ ok: true } | ConsentFail | { ok: false; error: "not_found" }> {
  const who = await holder(db, accountId, input.password, ctx);
  if (!who.ok) return who;
  return db.transaction(async (tx) => {
    await lock(tx, accountId);
    const rows = await tx
      .update(consentReceipts)
      .set({ revokedAt: sql`now()`, updatedAt: sql`now()`, seq: sql`nextval('sync_seq')` })
      .where(and(eq(consentReceipts.accountId, accountId), eq(consentReceipts.id, input.id), isNull(consentReceipts.revokedAt)))
      .returning({ id: consentReceipts.id });
    return rows.length ? { ok: true as const } : { ok: false as const, error: "not_found" as const };
  });
}

export const listReceipts = (db: Db, accountId: string) => receiptsOf(db, accountId);

/** Sent by the browser with AI and voice requests: the learner they are for (an id, never a name). */
export const LEARNER_HEADER = "x-kaizen-learner";

/**
 * For every learner-facing AI and voice route: refuses the request unless consent allows `scope` for
 * whoever is using the app. Browser-only deployments (no DATABASE_URL) are unchanged: it allows.
 *
 *   const refused = await consentGate(req, "ai");
 *   if (refused) return refused;
 *
 * It fails closed. The learner is the one this browser's session last reported (sync keeps it current)
 * and, when the request names one, that one too; both must be allowed. The grown-up ("parent") is
 * allowed. When nobody is identified (the picker, or a session that hasn't reported yet), the request
 * is refused while any child on the account lacks consent. No session at all is refused.
 */
export async function consentGate(req: Request, scope: ConsentScope, env: Env = process.env): Promise<Response | null> {
  if (!serverMode()) return null;
  const db = await getDb();
  const session = await readSession(db, readCookie(req, SESSION_COOKIE));
  if (!session) return json({ error: "consent", scope, reason: "signed_out" }, { status: 401 });
  const named = req.headers.get(LEARNER_HEADER)?.trim().slice(0, 100) || null;
  const who = [...new Set([session.learnerId, named].filter((x): x is string => Boolean(x)))];

  const family = new Map<string, Grade>();
  for (const p of await db.select({ id: profiles.id, data: profiles.data }).from(profiles).where(and(eq(profiles.accountId, session.accountId), eq(profiles.deleted, false)))) {
    const grade = (p.data as { grade?: Grade }).grade;
    if (grade) family.set(p.id, grade);
  }
  const receipts = await receiptsOf(db, session.accountId);
  const production = env.NODE_ENV === "production";
  const allowed = (id: string) => {
    const grade = family.get(id);
    return grade !== undefined && consentAllows({ grade, receipts: receipts.filter((r) => r.profileId === id), scope, production });
  };
  const refused = (reason: string) => json({ error: "consent", scope, reason }, { status: 403 });

  const learners = who.filter((x) => x !== PARENT_LEARNER);
  for (const id of learners) if (!allowed(id)) return refused(family.has(id) ? "consent" : "learner");
  if (who.length === 0 && [...family.keys()].some((id) => !allowed(id))) return refused("unknown_learner");
  return null;
}
