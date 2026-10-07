// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { setDbForTests, type Db } from "@/lib/server/db/client";
import { testDb } from "@/lib/server/db/testing";
import { GET as me } from "./me/route";
import { POST as resetCheck } from "./reset/check/route";
import { POST as resetConfirm } from "./reset/confirm/route";
import { POST as reset } from "./reset/route";
import { POST as signIn } from "./sign-in/route";
import { POST as signOut } from "./sign-out/route";
import { POST as signUp } from "./sign-up/route";
import { GET as status } from "./status/route";

// Outside Next there is no request scope for `connection()`; the handlers themselves are what's tested.
vi.mock("next/server", () => ({ connection: async () => {}, after: (task: () => unknown) => void task() }));

let db: Db;
let close: () => Promise<void>;
beforeAll(async () => ({ db, close } = await testDb()));
afterAll(() => close());

const ORIGIN = "https://kaizenedu.test";
function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(ORIGIN + path, {
    method: "POST",
    headers: { "content-type": "application/json", host: "kaizenedu.test", origin: ORIGIN, ...headers },
    body: JSON.stringify(body),
  });
}
const cookiesOf = (res: Response) => res.headers.getSetCookie();
const jar = (res: Response) =>
  cookiesOf(res)
    .map((c) => c.split(";")[0])
    .join("; ");

describe("auth routes", () => {
  it("report server mode", async () => {
    expect(await (await status()).json()).toMatchObject({ mode: "server" });
  });

  it("sign up sets an httpOnly, Secure, SameSite=Lax session cookie and a readable account hint", async () => {
    const res = await signUp(post("/api/auth/sign-up", { email: "route@example.test", password: "demo-pass-2026", displayName: "Maria", adult: true }));
    expect(res.status).toBe(200);
    const { account } = await res.json();
    const [session, hint] = cookiesOf(res);
    expect(session).toMatch(/^kz_session=[\w-]{40,}; HttpOnly; Path=\/; SameSite=Lax; Expires=.+; Secure$/);
    expect(hint).toBe(`kz_acct=${account.id}; Path=/; SameSite=Lax; Expires=${session.match(/Expires=([^;]+)/)![1]}; Secure`);
    expect(hint).not.toMatch(/HttpOnly/);

    const who = await me(new Request(ORIGIN + "/api/auth/me", { headers: { cookie: jar(res) } }));
    expect((await who.json()).account).toMatchObject({ email: "route@example.test", displayName: "Maria" });
  });

  it("rotates the session on sign-in and ends it on sign-out", async () => {
    const first = await signIn(post("/api/auth/sign-in", { email: "route@example.test", password: "demo-pass-2026" }));
    const second = await signIn(post("/api/auth/sign-in", { email: "route@example.test", password: "demo-pass-2026" }, { cookie: jar(first) }));
    expect(jar(second)).not.toBe(jar(first));
    expect((await me(new Request(ORIGIN + "/api/auth/me", { headers: { cookie: jar(first) } }))).status).toBe(401);
    const out = await signOut(post("/api/auth/sign-out", {}, { cookie: jar(second) }));
    expect(cookiesOf(out).every((c) => c.includes("Max-Age=0"))).toBe(true);
    expect((await me(new Request(ORIGIN + "/api/auth/me", { headers: { cookie: jar(second) } }))).status).toBe(401);
  });

  it("refuses writes started by another site and malformed bodies", async () => {
    expect((await signIn(post("/api/auth/sign-in", { email: "route@example.test", password: "demo-pass-2026" }, { origin: "https://evil.example" }))).status).toBe(403);
    expect((await signIn(post("/api/auth/sign-in", { email: "a" }))).status).toBe(400);
    expect((await signIn(post("/api/auth/sign-in", { email: "route@example.test", password: "nope-nope" }))).status).toBe(401);
  });

  it("walk a reset from request to new password (development shows the link)", async () => {
    const asked = await (await reset(post("/api/auth/reset", { email: "route@example.test", locale: "en" }))).json();
    expect(asked.devLink).toMatch(/^\/reset-password\?token=/);
    const token = new URL(asked.devLink, ORIGIN).searchParams.get("token");
    expect(await (await resetCheck(post("/api/auth/reset/check", { token }))).json()).toEqual({ valid: true });
    const done = await resetConfirm(post("/api/auth/reset/confirm", { token, password: "brand-new-pass" }));
    expect(done.status).toBe(200);
    expect(cookiesOf(done)[0]).toMatch(/^kz_session=/);
    expect(await (await resetCheck(post("/api/auth/reset/check", { token }))).json()).toEqual({ valid: false });
  });

  it("answer 'local' when there is no database, so the browser-only app is untouched", async () => {
    setDbForTests(null);
    try {
      expect(await (await status()).json()).toMatchObject({ mode: "local" });
      expect((await signUp(post("/api/auth/sign-up", {}))).status).toBe(404);
    } finally {
      setDbForTests(db);
    }
  });
});
