// @vitest-environment node
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { authorizeLearningRequest, confirmAdultSelf, LearningAuthorizationError } from "./authorize";
import { readSession, sha256, signUp, type AuthOk } from "./db/auth";
import type { Db } from "./db/client";
import { CONSENT_NOTICE_VERSION } from "./db/policy";
import { adultSelfAuthorities, consentReceipts, profiles, sessions } from "./db/schema";
import { testDb } from "./db/testing";

let db: Db, close: () => Promise<void>, owner: AuthOk;
const PASSWORD = "long synthetic password";
const env = { NODE_ENV: "production" };
beforeAll(async () => {
  ({ db, close } = await testDb());
  owner = await signUp(db, { email: "principal@example.test", password: PASSWORD, displayName: "Owner", adult: true }, { ip: "198.18.3.1" }) as AuthOk;
  for (const [id, grade] of [["child", "3"], ["self", "adult"]] as const) await db.insert(profiles).values({ id, profileId: id, accountId: owner.account.id, data: { id, accountId: owner.account.id, nickname: "Test", grade, locale: "en", color: "#000", createdAt: Date.now() }, updatedAt: new Date() });
  await db.insert(consentReceipts).values({ id: "child-consent", accountId: owner.account.id, profileId: "child", method: "synthetic-verified", verified: true, under13: true, scope: ["ai", "voice"], noticeVersion: CONSENT_NOTICE_VERSION, grantedBy: owner.account.email, passwordConfirmed: true });
});
afterAll(() => close());
beforeEach(async () => {
  await db.delete(adultSelfAuthorities);
  await db.update(consentReceipts).set({ noticeVersion: CONSENT_NOTICE_VERSION, revokedAt: null, passwordConfirmed: true }).where(eq(consentReceipts.id, "child-consent"));
});
const request = (learner: string, extra: Record<string, string> = {}) => new Request("https://tutornat.test/api/tutor", { method: "POST", headers: { host: "tutornat.test", origin: "https://tutornat.test", cookie: `kz_session=${owner.token}`, "x-kaizen-learner": learner, ...extra } });
const select = (learnerId: string | null) => db.update(sessions).set({ learnerId }).where(eq(sessions.tokenHash, sha256(owner.token)));

describe("server learning principal", () => {
  it("resolves owned raw and opaque learner references to the same server identity", async () => {
    await select("child");
    const raw = await authorizeLearningRequest(request("child"), "tutor", env);
    const opaque = await authorizeLearningRequest(request(sha256("kaizenedu:learner:child").slice(0, 32), { "x-kaizen-account": sha256(`kaizenedu:account:${owner.account.id}`).slice(0, 32) }), "tutor", env);
    expect(raw).toMatchObject({ accountId: owner.account.id, learnerId: "child", authority: "authorized-guardian", consentReceiptId: "child-consent", consentNoticeVersion: CONSENT_NOTICE_VERSION });
    expect(opaque).toEqual(raw);
    expect(raw.allowedProcessors).toContain("anthropic");
  });

  it("a forged account reference cannot authorize or charge another family", async () => {
    await select("child");
    await expect(authorizeLearningRequest(request("child", { "x-kaizen-account": "f".repeat(32) }), "tutor", env)).rejects.toBeInstanceOf(LearningAuthorizationError);
  });

  it("a receipt for an older notice cannot authorize the current processor policy", async () => {
    await select("child");
    await db.update(consentReceipts).set({ noticeVersion: "old-notice" }).where(eq(consentReceipts.id, "child-consent"));
    await expect(authorizeLearningRequest(request("child"), "tutor", env)).rejects.toBeInstanceOf(LearningAuthorizationError);
    await db.update(consentReceipts).set({ noticeVersion: CONSENT_NOTICE_VERSION }).where(eq(consentReceipts.id, "child-consent"));
  });

  it("adult self ownership requires a server-recorded password confirmation", async () => {
    await select("self");
    await expect(authorizeLearningRequest(request("self"), "tutor", env)).rejects.toBeInstanceOf(LearningAuthorizationError);
    const session = (await readSession(db, owner.token))!;
    expect(await confirmAdultSelf(db, session, { profileId: "self", password: "wrong", self: true, adult: true, noticeVersion: CONSENT_NOTICE_VERSION }, { ip: "198.18.3.1" })).toMatchObject({ ok: false });
    await expect(authorizeLearningRequest(request("self"), "tutor", env)).rejects.toBeInstanceOf(LearningAuthorizationError);
    expect(await confirmAdultSelf(db, session, { profileId: "self", password: PASSWORD, self: true, adult: true, noticeVersion: CONSENT_NOTICE_VERSION }, { ip: "198.18.3.1" })).toMatchObject({ ok: true });
    expect(await authorizeLearningRequest(request("self"), "tutor", env)).toMatchObject({ accountId: owner.account.id, learnerId: "self", authority: "adult-self" });
  });
  it("rejects declaring a child's profile as adult self", async () => {
    await select("child");
    const session = (await readSession(db, owner.token))!;
    expect(await confirmAdultSelf(db, session, { profileId: "child", password: PASSWORD, self: true, adult: true, noticeVersion: CONSENT_NOTICE_VERSION }, { ip: "198.18.3.1" })).toMatchObject({ ok: false });
    expect(await db.select().from(adultSelfAuthorities)).toEqual([]);
  });

  it("self authority expires even while the account cookie remains valid", async () => {
    await select("self");
    const session = (await readSession(db, owner.token))!;
    const now = Date.now();
    await confirmAdultSelf(db, session, { profileId: "self", password: PASSWORD, self: true, adult: true, noticeVersion: CONSENT_NOTICE_VERSION }, { ip: "198.18.3.1", now });
    await expect(authorizeLearningRequest(request("self"), "tutor", env, now + 2 * 60 * 60_000)).rejects.toMatchObject({ status: 403 });
  });

  it("handing the browser to another learner invalidates adult self authority", async () => {
    await select("self");
    const session = (await readSession(db, owner.token))!;
    await confirmAdultSelf(db, session, { profileId: "self", password: PASSWORD, self: true, adult: true, noticeVersion: CONSENT_NOTICE_VERSION }, { ip: "198.18.3.1" });
    const { setSessionLearner } = await import("./db/auth");
    await setSessionLearner(db, session, "child");
    await setSessionLearner(db, { ...session, learnerId: "child" }, "self");
    await expect(authorizeLearningRequest(request("self"), "tutor", env)).rejects.toMatchObject({ status: 403 });
  });

  it("never selects another family's profile through sync selection", async () => {
    const { setSessionLearner } = await import("./db/auth");
    await select("child");
    const session = (await readSession(db, owner.token))!;
    expect(await setSessionLearner(db, session, "foreign-profile")).toBe(false);
    expect((await readSession(db, owner.token))?.learnerId).toBe("child");
  });

});
