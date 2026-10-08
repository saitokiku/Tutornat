import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import type { Grade } from "@/lib/types";
import { confirmPassword, readSession, sha256, type Session } from "./db/auth";
import { getDb, serverMode, type Db } from "./db/client";
import { toReceipt } from "./db/sync";
import { listReceipts } from "./db/consent";
import { crossSite, json, readCookie, SESSION_COOKIE } from "./db/http";
import { CONSENT_NOTICE_VERSION, receiptCounts } from "./db/policy";
import { adultSelfAuthorities, capabilityGrants, consentReceipts, profiles, sessions } from "./db/schema";

export type LearningCapability = "tutor" | "generation" | "recognition" | "speech" | "sync" | "check";
export type LearningPrincipal = {
  accountId: string;
  sessionId: string;
  learnerId: string | null;
  /** Storage access from a cookie grants no learning processor access. */
  authority: "adult-self" | "authorized-guardian" | "account-session";
  capability: LearningCapability;
  consentReceiptId?: string;
  consentNoticeVersion?: string;
  authorityId?: string;
  allowedProcessors: string[];
  expiresAt: number;
};
type Env = Record<string, string | undefined>;
const AI_PROCESSORS = ["anthropic", "vercel-gateway"];
const VOICE_PROCESSORS = ["elevenlabs", "deepgram"];
const SELF_TTL_MS = 2 * 60 * 60_000;
const bound = new WeakMap<Request, LearningPrincipal>();

export class LearningAuthorizationError extends Error {
  constructor(public status: number, public reason: string) { super(reason); this.name = "LearningAuthorizationError"; }
  response() { return json({ error: "authority", reason: this.reason }, { status: this.status }); }
}
const refuse = (status: number, reason: string): never => { throw new LearningAuthorizationError(status, reason); };
const opaque = (kind: "account" | "learner", id: string) => sha256(`kaizenedu:${kind}:${id}`).slice(0, 32);

/** Identity comes from the cookie and owned server rows; headers identify work but grant nothing. */
export async function authorizeLearningRequest(req: Request, capability: LearningCapability, env: Env = process.env, now = Date.now()): Promise<LearningPrincipal> {
  if (!serverMode()) return refuse(503, "unavailable");
  if (req.method !== "GET" && crossSite(req)) return refuse(403, "cross_site");
  const db = await getDb();
  const session = await readSession(db, readCookie(req, SESSION_COOKIE), now);
  if (!session) return refuse(401, "signed_out");
  const claimedAccount = req.headers.get("x-kaizen-account");
  if (claimedAccount && claimedAccount !== session.accountId && claimedAccount !== opaque("account", session.accountId)) return refuse(403, "account");
  const base = { accountId: session.accountId, sessionId: session.id, capability, expiresAt: session.expiresAt.getTime() };
  if (capability === "sync") {
    const principal: LearningPrincipal = { ...base, learnerId: null, authority: "account-session", allowedProcessors: ["database"] };
    bound.set(req, principal); return principal;
  }
  const family = await db.select({ id: profiles.id, data: profiles.data }).from(profiles).where(and(eq(profiles.accountId, session.accountId), eq(profiles.deleted, false)));
  const named = req.headers.get("x-kaizen-learner")?.trim();
  const learner = named ? family.find((p) => p.id === named || opaque("learner", p.id) === named) : family.find((p) => p.id === session.learnerId);
  if (!learner) return refuse(403, "learner");
  if (session.learnerId && session.learnerId !== "parent" && learner.id !== session.learnerId) return refuse(403, "selection");
  if (capability === "check") {
    const principal: LearningPrincipal = { ...base, learnerId: learner.id, authority: "account-session", allowedProcessors: ["database"] };
    bound.set(req, principal); return principal;
  }
  const scope = capability === "recognition" || capability === "speech" ? "voice" : "ai";
  const processors = scope === "voice" ? VOICE_PROCESSORS : AI_PROCESSORS;
  const [self] = await db.select().from(adultSelfAuthorities).where(and(eq(adultSelfAuthorities.accountId, session.accountId), eq(adultSelfAuthorities.sessionId, session.id), eq(adultSelfAuthorities.profileId, learner.id), eq(adultSelfAuthorities.noticeVersion, CONSENT_NOTICE_VERSION), gt(adultSelfAuthorities.expiresAt, new Date(now)), isNull(adultSelfAuthorities.revokedAt)));
  if (self && processors.every((p) => self.processors.includes(p))) {
    const principal: LearningPrincipal = { ...base, learnerId: learner.id, authority: "adult-self", authorityId: self.id, consentNoticeVersion: self.noticeVersion, allowedProcessors: processors, expiresAt: Math.min(base.expiresAt, self.expiresAt.getTime()) };
    bound.set(req, principal); return principal;
  }
  const grade = (learner.data as { grade?: Grade }).grade;
  if (!grade) return refuse(403, "learner");
  const receipt = (await listReceipts(db, session.accountId)).find((r) => r.profileId === learner.id && r.noticeVersion === CONSENT_NOTICE_VERSION && r.passwordConfirmed === true && receiptCounts(r, grade, scope, env.NODE_ENV === "production"));
  if (!receipt) return refuse(403, "consent");
  const principal: LearningPrincipal = { ...base, learnerId: learner.id, authority: "authorized-guardian", consentReceiptId: receipt.id, consentNoticeVersion: receipt.noticeVersion, allowedProcessors: processors };
  bound.set(req, principal); return principal;
}

/** Only server authorization can bind this request for metering and capability leases. */
export function principalOf(req: Request) { return bound.get(req); }

export async function learningGate(req: Request, capability: LearningCapability): Promise<Response | null> {
  try { await authorizeLearningRequest(req, capability); return null; }
  catch (error) { if (error instanceof LearningAuthorizationError) return error.response(); throw error; }
}

/** A profile's grade or a picker selection is never proof that the holder is learning themselves. */
export async function confirmAdultSelf(db: Db, session: Session, input: { profileId: string; password: string; self: boolean; adult: boolean; noticeVersion: string }, ctx: { ip: string; now?: number }) {
  if (!input.self || !input.adult || input.noticeVersion !== CONSENT_NOTICE_VERSION) return { ok: false as const, error: "declaration" };
  const confirmation = await confirmPassword(db, session.accountId, input.password, ctx);
  if (!confirmation.ok) return confirmation;
  const now = ctx.now ?? Date.now();
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${session.accountId}, 0))`);
    const [live] = await tx.select().from(sessions).where(and(eq(sessions.id, session.id), eq(sessions.accountId, session.accountId), gt(sessions.expiresAt, new Date(now))));
    const [learner] = await tx.select({ id: profiles.id, data: profiles.data }).from(profiles).where(and(eq(profiles.id, input.profileId), eq(profiles.accountId, session.accountId), eq(profiles.deleted, false)));
    if (!live || !learner || (learner.data as { grade?: string }).grade !== "adult") return { ok: false as const, error: "learner" };
    await tx.update(capabilityGrants).set({ revokedAt: new Date(now) }).where(and(eq(capabilityGrants.sessionId, session.id), isNull(capabilityGrants.revokedAt)));
    await tx.update(adultSelfAuthorities).set({ revokedAt: new Date(now) }).where(and(eq(adultSelfAuthorities.accountId, session.accountId), eq(adultSelfAuthorities.sessionId, session.id), isNull(adultSelfAuthorities.revokedAt)));
    const id = randomUUID();
    await tx.insert(adultSelfAuthorities).values({ id, accountId: session.accountId, sessionId: session.id, profileId: learner.id, noticeVersion: input.noticeVersion, processors: [...AI_PROCESSORS, ...VOICE_PROCESSORS], confirmedAt: new Date(now), expiresAt: new Date(Math.min(live.expiresAt.getTime(), now + SELF_TTL_MS)) });
    await tx.update(sessions).set({ learnerId: learner.id }).where(eq(sessions.id, session.id));
    return { ok: true as const, authorityId: id };
  });
}

/** Rechecked under the account lock immediately before each remote call and output release. */
export async function assertPrincipalLive(db: Db, principal: LearningPrincipal, now = Date.now()): Promise<void> {
  const [session] = await db.select().from(sessions).where(and(eq(sessions.id, principal.sessionId), eq(sessions.accountId, principal.accountId), gt(sessions.expiresAt, new Date(now))));
  if (!session || now >= principal.expiresAt) return refuse(401, "expired");
  if (principal.learnerId) {
    const [learner] = await db.select().from(profiles).where(and(eq(profiles.accountId, principal.accountId), eq(profiles.id, principal.learnerId), eq(profiles.deleted, false)));
    if (!learner || (session.learnerId && session.learnerId !== "parent" && session.learnerId !== principal.learnerId)) return refuse(403, "selection");
    if (principal.authority === "adult-self") {
      const [self] = await db.select().from(adultSelfAuthorities).where(and(eq(adultSelfAuthorities.id, principal.authorityId!), eq(adultSelfAuthorities.accountId, principal.accountId), eq(adultSelfAuthorities.sessionId, session.id), eq(adultSelfAuthorities.profileId, principal.learnerId), eq(adultSelfAuthorities.noticeVersion, CONSENT_NOTICE_VERSION), isNull(adultSelfAuthorities.revokedAt), gt(adultSelfAuthorities.expiresAt, new Date(now))));
      if (!self || !principal.allowedProcessors.every((p) => self.processors.includes(p))) return refuse(403, "self");
    } else if (principal.authority === "authorized-guardian") {
      const [receipt] = await db.select().from(consentReceipts).where(and(eq(consentReceipts.id, principal.consentReceiptId!), eq(consentReceipts.accountId, principal.accountId), eq(consentReceipts.profileId, principal.learnerId)));
      const grade = (learner.data as { grade?: Grade }).grade;
      const scope = principal.capability === "recognition" || principal.capability === "speech" ? "voice" : "ai";
      if (!grade || !receipt || receipt.noticeVersion !== CONSENT_NOTICE_VERSION || !receipt.passwordConfirmed || !receiptCounts(toReceipt(receipt), grade, scope, process.env.NODE_ENV === "production")) return refuse(403, "consent");
    } else if (principal.capability !== "check" && principal.capability !== "sync") return refuse(403, "capability");
  } else if (principal.capability !== "sync") return refuse(403, "learner");
}
