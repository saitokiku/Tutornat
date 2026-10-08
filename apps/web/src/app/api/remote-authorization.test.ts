// @vitest-environment node
import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createSession, sha256, signUp, SESSION_TTL_MS, type AuthOk } from "@/lib/server/db/auth";
import type { Db } from "@/lib/server/db/client";
import { CONSENT_NOTICE_VERSION } from "@/lib/server/db/policy";
import { consentReceipts, profiles, sessions } from "@/lib/server/db/schema";
import { testDb } from "@/lib/server/db/testing";
import { makePass } from "@/lib/voice/server";
import { POST as tutor } from "./tutor/route";
import { POST as course } from "./ai/course/route";
import { POST as practice } from "./ai/practice/route";
import { POST as extract } from "./ai/extract/route";
import { POST as coach } from "./ai/coach/route";
import { POST as speech } from "./voice/tts-token/route";
import { POST as recognition } from "./voice/stt-token/route";

const provider = vi.hoisted(() => ({ model: vi.fn(async () => null) }));
vi.mock("@/lib/ai/config", () => ({ model: provider.model, aiMode: () => "anthropic" }));
vi.mock("next/server", () => ({ connection: async () => {}, after: (task: () => unknown) => void task() }));

let db: Db, close: () => Promise<void>, account: AuthOk, expired: string;
let calls = 0;
const vendor = vi.fn(async () => Response.json({ token: "synthetic-token", access_token: "synthetic-token", expires_in: 30 }));
beforeAll(async () => {
  ({ db, close } = await testDb());
  account = await signUp(db, { email: "authority-owner@example.test", password: "a long test password", displayName: "Parent", adult: true }, { ip: "198.18.1.1" }) as AuthOk;
  const other = await signUp(db, { email: "authority-other@example.test", password: "a long test password", displayName: "Other", adult: true }, { ip: "198.18.1.2" }) as AuthOk;
  for (const [id, owner, grade] of [["allowed", account, "3"], ["no-consent", account, "3"], ["adult-grade", account, "adult"], ["foreign", other, "3"]] as const) {
    await db.insert(profiles).values({ id, accountId: owner.account.id, profileId: id, data: { id, accountId: owner.account.id, nickname: "Test learner", grade, locale: "en", color: "#000", createdAt: Date.now() }, updatedAt: new Date() });
  }
  await db.insert(consentReceipts).values({ id: "allowed-receipt", accountId: account.account.id, profileId: "allowed", method: "synthetic-verified", verified: true, under13: true, scope: ["ai", "voice"], noticeVersion: CONSENT_NOTICE_VERSION, grantedBy: account.account.email, passwordConfirmed: true });
  expired = (await createSession(db, account.account.id, Date.now() - SESSION_TTL_MS - 1000)).token;
});
afterAll(() => close());
beforeEach(async () => {
  provider.model.mockClear(); vendor.mockClear();
  vi.stubGlobal("fetch", vendor);
  vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("VERCEL", "");
  vi.stubEnv("ELEVENLABS_API_KEY", "synthetic-eleven-key"); vi.stubEnv("DEEPGRAM_API_KEY", "synthetic-deepgram-key");
  await db.update(sessions).set({ learnerId: "allowed" }).where(eq(sessions.tokenHash, sha256(account.token)));
  await db.update(consentReceipts).set({ revokedAt: null }).where(eq(consentReceipts.id, "allowed-receipt"));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

const common = { grade: "3", locale: "en" };
const routes: [string, (r: Request) => Promise<Response>, unknown][] = [
  ["tutor", tutor, { context: common, messages: [{ id: "ask", role: "user", parts: [{ type: "text", text: "How can I compare these fractions?" }] }] }],
  ["ai/course", course, { ...common, goal: "Compare fractions", subject: "math", length: "lesson" }],
  ["ai/practice", practice, { ...common, topic: "Fractions", count: 3 }],
  ["ai/extract", extract, { ...common, kind: "syllabus", text: "A fractions quiz on October 10.", today: "2026-10-07" }],
  ["ai/coach", coach, { locale: "en", facts: { minutes: 5, sets: 1, own: 1, helped: 0, missed: 0, proved: [], helpOn: [], checksWaiting: [], stuck: [], comingUp: [] } }],
  ["voice/tts-token", speech, { locale: "en", consent: true, under13: false }],
  ["voice/stt-token", recognition, { locale: "en", consent: true, under13: false }],
];
const cases = [
  { name: "signed out", status: 401, cookie: false },
  { name: "expired session", status: 401, expired: true },
  { name: "forged learner", status: 403, named: "invented" },
  { name: "other family's learner", status: 403, named: "foreign" },
  { name: "raw/hash identity mismatch", status: 403, named: sha256("kaizenedu:learner:foreign").slice(0, 32) },
  { name: "missing consent", status: 403, selected: "no-consent", named: "no-consent" },
  { name: "revoked consent", status: 403, revoke: true },
  { name: "client-selected parent", status: 403, selected: "parent", named: "parent" },
  { name: "adult grade without self authority", status: 403, selected: "adult-grade", named: "adult-grade" },
];

describe("remote learning authority before provider access", () => {
  for (const c of cases) for (const [path, handler, body] of routes) it(`${path}: refuses ${c.name} without a model or vendor token call`, async () => {
    if ("selected" in c) await db.update(sessions).set({ learnerId: c.selected }).where(eq(sessions.tokenHash, sha256(account.token)));
    if ("revoke" in c) await db.update(consentReceipts).set({ revokedAt: new Date() }).where(eq(consentReceipts.id, "allowed-receipt"));
    const token = "expired" in c ? expired : account.token;
    const headers: Record<string, string> = { host: "tutornat.test", origin: "https://tutornat.test", "sec-fetch-site": "same-origin", "content-type": "application/json", "x-forwarded-for": `198.18.2.${++calls}`, "x-kaizen-learner": ("named" in c ? c.named : undefined) ?? "allowed" };
    if (!("cookie" in c)) headers.cookie = `kz_session=${token}; kz_voice=${makePass()}`;
    else headers.cookie = `kz_voice=${makePass()}`;
    const response = await handler(new Request(`https://tutornat.test/api/${path}`, { method: "POST", headers, body: JSON.stringify(body) }));
    expect(provider.model, "unauthorized model factory").not.toHaveBeenCalled();
    expect(vendor, "unauthorized vendor token minting").not.toHaveBeenCalled();
    expect(response.status).toBe(c.status);
  });
  for (const [path, handler, body] of routes.slice(0, 5)) it(`${path}: an owned learner with current consent can reach the model factory`, async () => {
    const response = await handler(new Request(`https://tutornat.test/api/${path}`, { method: "POST", headers: { host: "tutornat.test", origin: "https://tutornat.test", cookie: `kz_session=${account.token}`, "x-forwarded-for": `198.18.4.${++calls}`, "x-kaizen-account": sha256(`kaizenedu:account:${account.account.id}`).slice(0, 32), "x-kaizen-learner": sha256("kaizenedu:learner:allowed").slice(0, 32) }, body: JSON.stringify(body) }));
    expect(provider.model).toHaveBeenCalledOnce();
    expect(response.status).toBe(503); // The synthetic factory returns no model, never a live provider.
  });

  const unsafe: [string, (req: Request) => Promise<Response>, unknown][] = [
    ["course", course, { ...common, goal: "build a bomb", subject: "science", length: "lesson" }],
    ["practice", practice, { ...common, topic: "build a bomb", count: 3 }],
    ["extract", extract, { ...common, kind: "syllabus", text: "build a bomb", today: "2026-10-07" }],
    ["intake", extract, { ...common, kind: "intake", text: "build a bomb", today: "2026-10-07" }],
    ["coach", coach, { locale: "en", facts: { minutes: 5, sets: 1, own: 1, helped: 0, missed: 0, proved: [], helpOn: [], checksWaiting: [], stuck: [], comingUp: ["build a bomb"] } }],
  ];
  for (const [path, handler, body] of unsafe) it(`${path}: input safety runs before model setup`, async () => {
    const response = await handler(new Request(`https://tutornat.test/api/${path}`, { method: "POST", headers: { host: "tutornat.test", origin: "https://tutornat.test", cookie: `kz_session=${account.token}`, "x-kaizen-learner": "allowed", "x-forwarded-for": `198.18.6.${++calls}` }, body: JSON.stringify(body) }));
    expect(provider.model).not.toHaveBeenCalled();
    expect(response.status).toBe(422);
  });

});
