import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { assertPrincipalLive, LearningAuthorizationError, type LearningPrincipal } from "./authorize";
import type { Session } from "./db/auth";
import type { Db } from "./db/client";
import { capabilityGrants } from "./db/schema";

type ProviderLease = { processor: "deepgram" | "elevenlabs"; credentialTtlSeconds: number; connectionMaxSeconds: null };
export async function issueCapability(db: Db, p: LearningPrincipal, provider: ProviderLease, now = Date.now()) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${p.accountId}, 0))`);
    await assertPrincipalLive(tx, p, now);
    if (!p.learnerId || !p.allowedProcessors.includes(provider.processor) || (p.capability !== "recognition" && p.capability !== "speech")) throw new LearningAuthorizationError(403, "processor");
    const id = randomUUID(), expiresAt = Math.min(p.expiresAt, now + 15 * 60_000);
    await tx.insert(capabilityGrants).values({ id, accountId: p.accountId, sessionId: p.sessionId, profileId: p.learnerId, principal: p, receiptId: p.consentReceiptId, authorityId: p.authorityId, processor: provider.processor, credentialTtlSeconds: provider.credentialTtlSeconds, expiresAt: new Date(expiresAt) });
    return { id, expiresAt, ...provider, providerRevocation: "unsupported" as const };
  });
}

/** The identifier alone grants nothing: only the issuing browser's account cookie can inspect it. */
export async function readCapability(db: Db, session: Session, id: string, now = Date.now()) {
  const [grant] = await db.select().from(capabilityGrants).where(and(eq(capabilityGrants.id, id), eq(capabilityGrants.accountId, session.accountId), eq(capabilityGrants.sessionId, session.id)));
  if (!grant || grant.revokedAt || grant.expiresAt.getTime() <= now) return { active: false };
  try { await assertPrincipalLive(db, grant.principal, now); }
  catch (e) { if (e instanceof LearningAuthorizationError) return { active: false }; throw e; }
  return { active: true, expiresAt: grant.expiresAt.getTime(), credentialTtlSeconds: grant.credentialTtlSeconds, connectionMaxSeconds: null, providerRevocation: "unsupported" };
}
