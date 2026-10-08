// @vitest-environment node
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createBudgetLedger } from "./budget-ledger";
import { authorizeLearningRequest, type LearningPrincipal } from "./authorize";
import { sha256, signUp, type AuthOk } from "./db/auth";
import type { Db } from "./db/client";
import { CONSENT_NOTICE_VERSION } from "./db/policy";
import { consentReceipts, profiles, sessions } from "./db/schema";
import { testDb } from "./db/testing";

let db: Db, close: () => Promise<void>, owner: AuthOk, principal: LearningPrincipal;
const limits = { dayTurns: 1, dayUsd: 1, monthTurns: 5, monthUsd: 5, addressTurns: 10, addressUsd: 10 };
const now = Date.now();
beforeAll(async () => {
  ({ db, close } = await testDb());
  owner = await signUp(db, { email: "budget-ledger@example.test", password: "synthetic long password", displayName: "Holder", adult: true }, { ip: "198.18.5.1" }) as AuthOk;
  await db.insert(profiles).values({ id: "learner", accountId: owner.account.id, profileId: "learner", data: { id: "learner", grade: "3" }, updatedAt: new Date() });
  await db.update(sessions).set({ learnerId: "learner" }).where(eq(sessions.tokenHash, sha256(owner.token)));
  await db.insert(consentReceipts).values({ id: "receipt", accountId: owner.account.id, profileId: "learner", method: "synthetic-verified", verified: true, under13: true, scope: ["ai", "voice"], noticeVersion: CONSENT_NOTICE_VERSION, grantedBy: owner.account.email, passwordConfirmed: true });
  principal = await authorizeLearningRequest(new Request("https://tutornat.test/api/tutor", { headers: { cookie: `kz_session=${owner.token}`, "x-kaizen-learner": "learner" } }), "tutor", { NODE_ENV: "production" }, now);
});
afterAll(() => close());
beforeEach(async () => {
  const { budgetHolds, budgetPeriods } = await import("./db/schema");
  await db.delete(budgetHolds); await db.delete(budgetPeriods);
  await db.update(consentReceipts).set({ revokedAt: null }).where(eq(consentReceipts.id, "receipt"));
});

describe("shared server budget reservations", () => {
  it("two separate service instances competing for the last turn admit exactly one", async () => {
    const a = createBudgetLedger(db, limits), b = createBudgetLedger(db, limits);
    const results = await Promise.all([a.reserve(principal, "address-a", now), b.reserve(principal, "address-b", now)]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.find((r) => !r.ok)).toMatchObject({ ok: false, scope: "day" });
  });
  it("commits a turn once and all call costs under the server account", async () => {
    const a = createBudgetLedger(db, limits), b = createBudgetLedger(db, limits);
    const hold = await a.reserve(principal, "address-a", now);
    if (!hold.ok) throw new Error("expected reservation");
    await a.start(hold.id, principal, now); await b.start(hold.id, principal, now);
    await a.usage(hold.id, 0.1, 30); await b.usage(hold.id, 0.2, 70);
    const spent = await b.spent(principal, "address-a", now);
    expect(spent).toMatchObject({ day: { turns: 1, tokens: 100 }, month: { turns: 1, tokens: 100 } });
    expect(spent.day.usd).toBeCloseTo(0.3); expect(spent.month.usd).toBeCloseTo(0.3);
  });
  it("expired reservations cannot start a provider after another request took the allowance", async () => {
    const a = createBudgetLedger(db, limits);
    const first = await a.reserve(principal, "address-a", now);
    if (!first.ok) throw new Error("expected reservation");
    expect(await a.reserve(principal, "address-b", now + 120_001)).toMatchObject({ ok: true });
    await expect(a.start(first.id, principal, now + 120_001)).rejects.toThrow();
  });
  it("revoking consent between reservation and provider start rejects the provider admission", async () => {
    const a = createBudgetLedger(db, limits);
    const hold = await a.reserve(principal, "address-a", now);
    if (!hold.ok) throw new Error("expected reservation");
    await db.update(consentReceipts).set({ revokedAt: new Date() }).where(eq(consentReceipts.id, "receipt"));
    await expect(a.start(hold.id, principal, now)).rejects.toThrow();
  });
  it("cost stops a long job independently from its one counted turn", async () => {
    const a = createBudgetLedger(db, limits);
    const hold = await a.reserve(principal, "address-a", now);
    if (!hold.ok) throw new Error("expected reservation");
    await a.start(hold.id, principal, now); await a.usage(hold.id, 1, 100);
    expect(await a.overSpend(principal, "address-a", now)).toBe("day");
  });
  it("consent revocation invalidates an already-issued app voice capability", async () => {
    const { issueCapability, readCapability } = await import("./capabilities");
    const { revokeConsent } = await import("./db/consent");
    const session = (await import("./db/auth")).readSession;
    const voicePrincipal = { ...principal, capability: "recognition" as const, allowedProcessors: ["deepgram", "elevenlabs"] };
    const lease = await issueCapability(db, voicePrincipal, { processor: "deepgram", credentialTtlSeconds: 30, connectionMaxSeconds: null }, now);
    expect(await readCapability(db, (await session(db, owner.token))!, lease.id, now)).toMatchObject({ active: true });
    expect(await revokeConsent(db, owner.account.id, { id: "receipt", password: "synthetic long password" }, { ip: "198.18.5.1" })).toMatchObject({ ok: true });
    expect(await readCapability(db, (await session(db, owner.token))!, lease.id, now)).toMatchObject({ active: false });
    expect(lease).toMatchObject({ credentialTtlSeconds: 30, providerRevocation: "unsupported", connectionMaxSeconds: null });
  });

  it("revoking consent aborts an active server provider operation before output release", async () => {
    const { withLiveAuthority } = await import("./authority-work");
    const { revokeConsent } = await import("./db/consent");
    const request = new Request("https://tutornat.test/api/tutor", { headers: { cookie: `kz_session=${owner.token}`, "x-kaizen-learner": "learner" } });
    await authorizeLearningRequest(request, "tutor");
    let started!: () => void;
    const ready = new Promise<void>((resolve) => { started = resolve; });
    let providerAborted = false, released = false;
    const output = withLiveAuthority(request, async ({ signal }) => {
      started();
      return new Promise<Response>((_resolve, reject) => signal.addEventListener("abort", () => { providerAborted = true; reject(signal.reason); }, { once: true }));
    }).then(() => { released = true; }, () => {});
    await ready;
    await revokeConsent(db, owner.account.id, { id: "receipt", password: "synthetic long password" }, { ip: "198.18.5.1" });
    await output;
    expect(providerAborted).toBe(true); expect(released).toBe(false);
  });

});
