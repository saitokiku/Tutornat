// @vitest-environment node
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { signUp, SESSION_TTL_MS, type AuthOk } from "@/lib/server/db/auth";
import type { Db } from "@/lib/server/db/client";
import { sessions } from "@/lib/server/db/schema";
import { testDb } from "@/lib/server/db/testing";
import { POST } from "./route";

let db: Db;
let close: () => Promise<void>;
beforeAll(async () => ({ db, close } = await testDb()));
afterAll(() => close());

const call = (body: unknown, cookie?: string, headers: Record<string, string> = {}) =>
  POST(new Request("https://kaizenedu.test/api/sync", { method: "POST", headers: { host: "kaizenedu.test", "content-type": "application/json", ...(cookie ? { cookie } : {}), ...headers }, body: JSON.stringify(body) }));

describe("/api/sync", () => {
  it("needs a signed-in account and a same-site request", async () => {
    expect((await call({ v: 1, since: 0, now: Date.now(), push: {} })).status).toBe(401);
    const r = (await signUp(db, { email: "route-sync@example.test", password: "long enough", displayName: "M", adult: true }, { ip: "1.1.1.1" })) as AuthOk;
    const cookie = `kz_session=${r.token}`;
    expect((await call({ v: 1, since: 0, now: Date.now(), push: {} }, cookie, { origin: "https://evil.example" })).status).toBe(403);
    expect((await call({ v: 2 }, cookie)).status).toBe(400);
    const ok = await call({ v: 1, since: 0, now: Date.now(), push: {} }, cookie);
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ more: false, rejected: 0, flagged: 0, account: { displayName: "M" } });
    expect(ok.headers.get("cache-control")).toBe("no-store");
  });

  it("renews a session used in its second half", async () => {
    const r = (await signUp(db, { email: "route-renew@example.test", password: "long enough", displayName: "M", adult: true }, { ip: "1.1.1.2" })) as AuthOk;
    await db.update(sessions).set({ expiresAt: new Date(Date.now() + SESSION_TTL_MS / 4) }).where(eq(sessions.accountId, r.account.id));
    const res = await call({ v: 1, since: 0, now: Date.now(), push: {} }, `kz_session=${r.token}`);
    expect(res.headers.getSetCookie()[0]).toMatch(/^kz_session=.+; HttpOnly/);
  });
});
