// @vitest-environment node
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readSession, setSessionLearner, signUp, type AuthOk } from "./auth";
import { setDbForTests, type Db } from "./client";
import { CONSENT_METHODS, consentGate, grantConsent, methodsFor, revokeConsent, type ConsentMethod } from "./consent";
import { consentAllows, CONSENT_NOTICE_VERSION, gradeAge, receiptCounts, type ConsentReceipt } from "./policy";
import { consentReceipts } from "./schema";
import { syncAccount } from "./sync";
import { testDb } from "./testing";

let db: Db;
let close: () => Promise<void>;
beforeAll(async () => ({ db, close } = await testDb()));
afterAll(() => close());

const DEV = { NODE_ENV: "development" };
const PROD = { NODE_ENV: "production" };
const req = (token?: string, learner?: string) =>
  new Request("https://kaizenedu.test/api/tutor", { method: "POST", headers: { ...(token ? { cookie: `kz_session=${token}` } : {}), ...(learner ? { "x-kaizen-learner": learner } : {}) } });

let n = 0;
async function familyWith(grades: string[]) {
  const r = (await signUp(db, { email: `consent${++n}@example.test`, password: "long enough", displayName: "Maria", adult: true }, { ip: `10.2.0.${n}` })) as AuthOk;
  const push = grades.map((grade, i) => ({ id: `${r.account.id}-p${i}`, at: Date.now(), data: { id: `${r.account.id}-p${i}`, nickname: `Kid ${i}`, grade, locale: "en" } }));
  await syncAccount(db, r.account.id, { v: 1, since: 0, now: Date.now(), push: { profiles: push } });
  return { accountId: r.account.id, token: r.token, ids: push.map((p) => p.id) };
}
const PASSWORD = "long enough";
const grant = (
  accountId: string,
  profileId: string,
  method: string,
  env: Record<string, string> = DEV,
  extra: Partial<{ under13: boolean; noticeVersion: string; scope: ("ai" | "voice")[]; proof: string; password: string }> = {},
) => grantConsent(db, accountId, { profileId, scope: ["ai", "voice"], method, under13: true, noticeVersion: CONSENT_NOTICE_VERSION, password: PASSWORD, ...extra }, { env, ip: `10.2.1.${n}` });
const revoke = (accountId: string, id: string, password = PASSWORD) => revokeConsent(db, accountId, { id, password }, { ip: `10.2.2.${n}` });
/** The browser reports who is using it (sync does this); the gate reads it from the session. */
async function using(token: string, learner: string | null) {
  const s = (await readSession(db, token))!;
  await setSessionLearner(db, s, learner);
}

describe("consent policy", () => {
  const receipt = (over: Partial<ConsentReceipt>): ConsentReceipt => ({
    id: "r", profileId: "p", method: "dev-not-verified", verified: false, scope: ["ai", "voice"], noticeVersion: "v", under13: true, grantedAt: 1, grantedBy: "x", ...over,
  });

  it("treats K–7 as under 13, asks for 8 and 9, and leaves adults alone", () => {
    expect(["K", "3", "7"].map((g) => gradeAge(g as "K"))).toEqual(["under13", "under13", "under13"]);
    expect(gradeAge("8")).toBe("ask");
    expect(consentAllows({ grade: "adult", receipts: [], scope: "ai", production: true })).toBe(true);
    expect(consentAllows({ grade: "9", receipts: [], scope: "ai", production: false })).toBe(false);
  });

  it("in production, a child under 13 needs a verified method", () => {
    const dev = receipt({});
    expect(receiptCounts(dev, "2", "ai", false)).toBe(true);
    expect(receiptCounts(dev, "2", "ai", true)).toBe(false);
    expect(receiptCounts(receipt({ method: "card-charge", verified: true }), "2", "ai", true)).toBe(true);
    // A grown-up's own confirmation counts for a 13-year-old, never for a younger child.
    expect(receiptCounts(receipt({ method: "parent-confirmed", under13: false }), "8", "voice", true)).toBe(true);
    expect(receiptCounts(receipt({ method: "parent-confirmed", under13: false }), "6", "voice", true)).toBe(false);
  });

  it("counts only open consents for the asked scope", () => {
    expect(receiptCounts(receipt({ revokedAt: 5 }), "2", "ai", false)).toBe(false);
    expect(receiptCounts(receipt({ scope: ["ai"] }), "2", "voice", false)).toBe(false);
  });
});

describe("recording consent", () => {
  it("offers the development method only outside production", () => {
    expect(methodsFor(DEV).map((m) => m.id)).toEqual(["dev-not-verified", "parent-confirmed"]);
    expect(methodsFor(PROD).map((m) => m.id)).toEqual(["parent-confirmed"]);
    expect(methodsFor(PROD).every((m) => !m.verified)).toBe(true);
  });

  it("stores method, time, notice version and scope, and names who gave it", async () => {
    const { accountId, ids } = await familyWith(["2"]);
    const r = await grant(accountId, ids[0], "dev-not-verified", DEV, { scope: ["ai"] });
    expect(r).toMatchObject({
      ok: true,
      receipt: {
        profileId: ids[0],
        method: "dev-not-verified",
        verified: false,
        scope: ["ai"],
        noticeVersion: CONSENT_NOTICE_VERSION,
        under13: true,
        grantedBy: `consent${n}@example.test`,
        passwordConfirmed: true,
      },
    });
    expect((r as { receipt: ConsentReceipt }).receipt.grantedAt).toBeGreaterThan(Date.now() - 60_000);
  });

  it("takes the account password to give or revoke, so a child holding the device can't", async () => {
    const { accountId, ids } = await familyWith(["8"]);
    expect(await grant(accountId, ids[0], "parent-confirmed", PROD, { under13: false, password: "a guess" })).toEqual({ ok: false, error: "password" });
    expect(await db.select().from(consentReceipts).where(eq(consentReceipts.accountId, accountId))).toEqual([]);
    const r = (await grant(accountId, ids[0], "parent-confirmed", PROD, { under13: false })) as { receipt: ConsentReceipt };
    expect(await revoke(accountId, r.receipt.id, "a guess")).toEqual({ ok: false, error: "password" });
    expect(await revoke(accountId, r.receipt.id)).toEqual({ ok: true });
    expect(await revoke(accountId, r.receipt.id)).toEqual({ ok: false, error: "not_found" });
  });

  it("refuses what doesn't fit: a younger child by confirmation, the dev method in production, an old notice, another family's learner", async () => {
    const { accountId, ids } = await familyWith(["4", "8"]);
    const other = await familyWith(["3"]);
    expect(await grant(accountId, ids[0], "parent-confirmed", DEV, { under13: false })).toEqual({ ok: false, error: "method" });
    expect(await grant(accountId, ids[0], "dev-not-verified", PROD)).toEqual({ ok: false, error: "method" });
    expect(await grant(accountId, ids[0], "dev-not-verified", DEV, { noticeVersion: "1999" })).toEqual({ ok: false, error: "notice" });
    expect(await grant(accountId, other.ids[0], "dev-not-verified", DEV)).toEqual({ ok: false, error: "learner" });
    // An eighth grader the grown-up says is 13 can be confirmed by them, in production too.
    expect(await grant(accountId, ids[1], "parent-confirmed", PROD, { under13: false })).toMatchObject({ ok: true, receipt: { under13: false } });
  });
});

describe("a verified method plugs in", () => {
  // The shape a vendor method takes (a card charge, a signed form…): its own flow runs in the
  // browser, and the server confirms what the browser brought back before anything is recorded.
  const vendor: ConsentMethod = {
    id: "test-vendor",
    verified: true,
    forUnder13: true,
    available: (env) => env.TEST_VENDOR_KEY === "configured",
    verify: async ({ proof }) => (proof === "vendor-ref-ok" ? { ok: true, evidence: "vendor-ref-ok" } : { ok: false }),
  };
  const env = { ...PROD, TEST_VENDOR_KEY: "configured" };

  it("records the vendor's reference and switches an under-13 learner on in production", async () => {
    CONSENT_METHODS.push(vendor);
    try {
      expect(methodsFor(PROD).map((m) => m.id)).not.toContain("test-vendor");
      const { accountId, ids } = await familyWith(["2"]);
      expect(await grant(accountId, ids[0], "test-vendor", env, { proof: "forged" })).toEqual({ ok: false, error: "declined" });
      const r = await grant(accountId, ids[0], "test-vendor", env, { proof: "vendor-ref-ok" });
      expect(r).toMatchObject({ ok: true, receipt: { method: "test-vendor", verified: true, under13: true } });
      const receipt = (r as { receipt: ConsentReceipt }).receipt;
      expect(consentAllows({ grade: "2", receipts: [receipt], scope: "voice", production: true })).toBe(true);
      const [row] = await db.select().from(consentReceipts).where(eq(consentReceipts.id, receipt.id));
      expect(row.evidence).toBe("vendor-ref-ok");
    } finally {
      CONSENT_METHODS.splice(CONSENT_METHODS.indexOf(vendor), 1);
    }
  });
});

describe("the gate on AI and voice routes", () => {
  it("refuses a child without consent, whether the session or the request names them, and stops again on revoke", async () => {
    const { accountId, token, ids } = await familyWith(["1"]);
    await using(token, ids[0]);
    const refused = await consentGate(req(token), "ai");
    expect(refused?.status).toBe(403);
    expect(await refused?.json()).toEqual({ error: "consent", scope: "ai", reason: "consent" });
    // The grown-up is using the device, but the request is for the child: still refused.
    await using(token, "parent");
    expect((await consentGate(req(token, ids[0]), "ai"))?.status).toBe(403);

    const r = (await grant(accountId, ids[0], "dev-not-verified", DEV, { scope: ["ai"] })) as { receipt: ConsentReceipt };
    // Tests run outside production, where the development method counts.
    await using(token, ids[0]);
    expect(await consentGate(req(token), "ai")).toBeNull();
    expect(await consentGate(req(token, ids[0]), "ai")).toBeNull();
    expect((await consentGate(req(token), "voice"))?.status).toBe(403);
    // In production the development method never counts.
    expect((await consentGate(req(token), "ai", PROD))?.status).toBe(403);
    expect(await revoke(accountId, r.receipt.id)).toEqual({ ok: true });
    expect((await consentGate(req(token), "ai"))?.status).toBe(403);
  });

  it("fails closed when nobody is identified and a child lacks consent", async () => {
    const { accountId, token, ids } = await familyWith(["3", "adult"]);
    // A session that hasn't reported who is using it, or the picker.
    expect(await (await consentGate(req(token), "ai"))?.json()).toEqual({ error: "consent", scope: "ai", reason: "unknown_learner" });
    await using(token, null);
    expect((await consentGate(req(token), "ai"))?.status).toBe(403);
    // The grown-up's own use is theirs to decide.
    await using(token, "parent");
    expect(await consentGate(req(token), "ai")).toBeNull();
    // Once every child is covered, nobody needs naming.
    await using(token, null);
    await grant(accountId, ids[0], "dev-not-verified", DEV, { scope: ["ai"] });
    expect(await consentGate(req(token), "ai")).toBeNull();
  });

  it("lets a family of grown-ups through, and refuses without a session", async () => {
    const { token } = await familyWith(["adult"]);
    expect(await consentGate(req(token), "voice")).toBeNull();
    expect((await consentGate(req(), "ai"))?.status).toBe(401);
  });

  it("refuses a learner id from another account", async () => {
    const mine = await familyWith(["3"]);
    const theirs = await familyWith(["3"]);
    await using(mine.token, "parent");
    expect(await (await consentGate(req(mine.token, theirs.ids[0]), "ai"))?.json()).toMatchObject({ reason: "learner" });
  });

  it("stays out of the way in the browser-only version", async () => {
    setDbForTests(null);
    try {
      expect(await consentGate(req(), "ai")).toBeNull();
    } finally {
      setDbForTests(db);
    }
  });
});
