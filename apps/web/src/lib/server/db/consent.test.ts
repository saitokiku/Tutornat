// @vitest-environment node
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { signUp, type AuthOk } from "./auth";
import type { Db } from "./client";
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
const grant = (accountId: string, profileId: string, method: string, env = DEV, extra: Partial<{ under13: boolean; noticeVersion: string; scope: ("ai" | "voice")[]; proof: string }> = {}) =>
  grantConsent(db, accountId, { profileId, scope: ["ai", "voice"], method, under13: true, noticeVersion: CONSENT_NOTICE_VERSION, ...extra }, { env });

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
      receipt: { profileId: ids[0], method: "dev-not-verified", verified: false, scope: ["ai"], noticeVersion: CONSENT_NOTICE_VERSION, under13: true, grantedBy: `consent${n}@example.test` },
    });
    expect((r as { receipt: ConsentReceipt }).receipt.grantedAt).toBeGreaterThan(Date.now() - 60_000);
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
  it("lets nothing through for a child without consent, and stops again on revoke", async () => {
    const { accountId, token, ids } = await familyWith(["1"]);
    expect(await consentGate(req(token), null, "ai")).toBeNull(); // the grown-up's own use
    const refused = await consentGate(req(token), ids[0], "ai");
    expect(refused?.status).toBe(403);
    expect(await refused?.json()).toEqual({ error: "consent", scope: "ai" });
    expect((await consentGate(req(), ids[0], "ai"))?.status).toBe(401);

    const r = (await grant(accountId, ids[0], "dev-not-verified", DEV, { scope: ["ai"] })) as { receipt: ConsentReceipt };
    // Tests run outside production, where the development method counts.
    expect(await consentGate(req(token), ids[0], "ai")).toBeNull();
    expect((await consentGate(req(token), ids[0], "voice"))?.status).toBe(403);
    expect(await revokeConsent(db, accountId, r.receipt.id)).toBe(true);
    expect((await consentGate(req(token), ids[0], "ai"))?.status).toBe(403);
    expect(await revokeConsent(db, accountId, r.receipt.id)).toBe(false);
  });

  it("refuses a learner id from another account", async () => {
    const mine = await familyWith(["3"]);
    const theirs = await familyWith(["3"]);
    expect((await consentGate(req(mine.token), theirs.ids[0], "ai"))?.status).toBe(403);
  });
});
