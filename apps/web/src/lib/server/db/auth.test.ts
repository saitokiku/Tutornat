// @vitest-environment node
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  confirmPassword,
  confirmReset,
  hashPassword,
  LIMITS,
  pruneSessions,
  readSession,
  renewSession,
  requestReset,
  resetValid,
  SESSION_TTL_MS,
  signIn,
  signUp,
  verifyPassword,
  type AuthOk,
} from "./auth";
import type { Db } from "./client";
import type { Mail } from "./email";
import { appOrigin } from "./http";
import { accounts, sessions } from "./schema";
import { testDb } from "./testing";

let db: Db;
let close: () => Promise<void>;
beforeAll(async () => ({ db, close } = await testDb()));
afterAll(() => close());

let n = 0;
const email = () => `parent${++n}@example.test`;
const ctx = () => ({ ip: `10.0.0.${n}` });
async function account(address = email(), password = "correct horse") {
  const r = await signUp(db, { email: address, password, displayName: "Maria", adult: true }, ctx());
  expect(r.ok).toBe(true);
  return r as AuthOk;
}

describe("passwords", () => {
  it("hashes with scrypt and a salt, and verifies only the right password", async () => {
    const a = await hashPassword("demo-pass-2026");
    const b = await hashPassword("demo-pass-2026");
    expect(a).toMatch(/^scrypt\$16384\$[\w-]+\$[\w-]+$/);
    expect(a).not.toBe(b);
    expect(await verifyPassword("demo-pass-2026", a)).toBe(true);
    expect(await verifyPassword("demo-pass-2027", a)).toBe(false);
    expect(await verifyPassword("x", "sha256$nope")).toBe(false);
    expect(await verifyPassword("x", "scrypt$99999999$a$b")).toBe(false);
  });
});

describe("sign up", () => {
  it("creates the grown-up's account and a session", async () => {
    const address = email();
    const r = await account(` ${address.toUpperCase()} `);
    expect(r.account.email).toBe(address);
    expect(r.account.displayName).toBe("Maria");
    const s = await readSession(db, r.token);
    expect(s?.accountId).toBe(r.account.id);
    // Only the hash of the token is stored.
    const [row] = await db.select().from(sessions).where(eq(sessions.accountId, r.account.id));
    expect(row.tokenHash).not.toContain(r.token);
    const [a] = await db.select().from(accounts).where(eq(accounts.id, r.account.id));
    expect(a.passwordHash).toMatch(/^scrypt\$/);
  });

  it("refuses a taken email, bad fields, and a sign-up without the grown-up's statement", async () => {
    const address = email();
    await account(address);
    expect(await signUp(db, { email: address.toUpperCase(), password: "longenough", displayName: "B", adult: true }, ctx())).toMatchObject({
      ok: false,
      fields: { email: "err.emailTaken" },
    });
    expect(await signUp(db, { email: "nope", password: "short", displayName: " ", adult: true }, ctx())).toMatchObject({
      ok: false,
      status: 400,
      fields: { email: "err.email", password: "err.password", displayName: "err.name" },
    });
    expect(await signUp(db, { email: email(), password: "x".repeat(201), displayName: "M", adult: true }, ctx())).toMatchObject({ fields: { password: "acct.err.passwordLong" } });
    expect(await signUp(db, { email: email(), password: "longenough", displayName: "M" }, ctx())).toMatchObject({ ok: false, error: "adult" });
  });
});

describe("sign in", () => {
  it("issues a new session and ends the one the browser brought", async () => {
    const address = email();
    const first = await account(address);
    const r = (await signIn(db, { email: address, password: "correct horse" }, { ...ctx(), previous: first.token })) as AuthOk;
    expect(r.ok).toBe(true);
    expect(r.token).not.toBe(first.token);
    expect(await readSession(db, first.token)).toBeNull();
    expect((await readSession(db, r.token))?.accountId).toBe(first.account.id);
  });

  it("says nothing about which part was wrong", async () => {
    const address = email();
    await account(address);
    expect(await signIn(db, { email: address, password: "wrong horse" }, ctx())).toEqual({ ok: false, status: 401, error: "bad-login" });
    expect(await signIn(db, { email: email(), password: "correct horse" }, ctx())).toEqual({ ok: false, status: 401, error: "bad-login" });
  });

  it("slows down guessing: ten wrong tries lock the address for fifteen minutes", async () => {
    const address = email();
    await account(address);
    const t0 = Date.now();
    for (let i = 0; i < LIMITS.signInEmail.max; i++) await signIn(db, { email: address, password: `guess ${i}` }, { ip: `192.168.1.${i}`, now: t0 + i });
    const locked = await signIn(db, { email: address, password: "correct horse" }, { ip: "192.168.2.1", now: t0 + 1000 });
    expect(locked).toMatchObject({ ok: false, status: 429, error: "rate" });
    expect((locked as { retryAfter: number }).retryAfter).toBeGreaterThan(800);
    const later = await signIn(db, { email: address, password: "correct horse" }, { ip: "192.168.2.1", now: t0 + LIMITS.signInEmail.windowMs + 1 });
    expect(later.ok).toBe(true);
  });
});

describe("sessions", () => {
  it("expire after thirty days and slide when used in their second half", async () => {
    const { token } = await account();
    const now = Date.now();
    const s = (await readSession(db, token, now))!;
    expect(await renewSession(db, s, now + 1000)).toBeNull();
    const renewed = await renewSession(db, s, now + SESSION_TTL_MS * 0.75);
    expect(renewed!.getTime()).toBeGreaterThan(s.expiresAt.getTime());
    expect(await readSession(db, token, renewed!.getTime() + 1)).toBeNull();
  });
});

describe("password reset", () => {
  /** Stands in for next/server's `after`: tasks run when the test flushes them, after the answer. */
  function later() {
    const tasks: (() => Promise<void>)[] = [];
    return { later: (task: () => Promise<void>) => void tasks.push(task), flush: () => Promise.all(tasks.splice(0).map((t) => t())), pending: () => tasks.length };
  }
  const base = { origin: "https://kaizenedu.net", production: true, emailConfigured: true };

  it("emails a one-hour link to a known address, after answering exactly as for an unknown one", async () => {
    const address = email();
    await account(address);
    const sent: Mail[] = [];
    const send = vi.fn(async (m: Mail) => (sent.push(m), "sent" as const));
    const known = later();
    expect(await requestReset(db, { email: address, locale: "es" }, { ...ctx(), ...base, send, later: known.later })).toEqual({ delivery: "sent" });
    // Nothing was sent before the answer.
    expect(send).not.toHaveBeenCalled();
    const unknown = later();
    expect(await requestReset(db, { email: email(), locale: "en" }, { ...ctx(), ...base, send, later: unknown.later })).toEqual({ delivery: "sent" });
    expect(unknown.pending()).toBe(0);
    await known.flush();
    expect(send).toHaveBeenCalledOnce();
    expect(sent[0].to).toBe(address);
    expect(sent[0].subject).toMatch(/contraseña/i);
    const link = sent[0].text.match(/https:\/\/kaizenedu\.net\/reset-password\?token=([\w-]+)/);
    expect(link).not.toBeNull();
    expect(await resetValid(db, link![1])).toBe(true);
    expect(await resetValid(db, link![1], Date.now() + 61 * 60_000)).toBe(false);
  });

  it("answers 'sent' even when the email fails, logs it, and voids that link", async () => {
    const address = email();
    await account(address);
    const links: string[] = [];
    const failing = async (m: Mail) => (links.push(m.text.match(/token=([\w-]+)/)![1]), "failed" as const);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const d = later();
    expect(await requestReset(db, { email: address, locale: "en" }, { ...ctx(), ...base, send: failing, later: d.later })).toEqual({ delivery: "sent" });
    await d.flush();
    expect(await resetValid(db, links[0])).toBe(false);
    expect(error).toHaveBeenCalledWith("[auth] a reset email was not sent (failed)");
    error.mockRestore();
  });

  it("without a link address configured, says reset email isn't available to every asker alike", async () => {
    const address = email();
    await account(address);
    const send = vi.fn();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const d = later();
    expect(await requestReset(db, { email: address, locale: "en" }, { ...ctx(), ...base, origin: null, send, later: d.later })).toEqual({ delivery: "not-configured" });
    expect(await requestReset(db, { email: email(), locale: "en" }, { ...ctx(), ...base, origin: null, send, later: d.later })).toEqual({ delivery: "not-configured" });
    expect(d.pending()).toBe(0);
    error.mockRestore();
  });

  it("shows the link on the page only in development without email", async () => {
    const address = email();
    await account(address);
    const send = vi.fn();
    const d = later();
    const dev = await requestReset(db, { email: address, locale: "en" }, { ...ctx(), ...base, emailConfigured: false, production: false, send, later: d.later });
    expect(dev).toMatchObject({ delivery: "not-configured", devLink: expect.stringMatching(/^\/reset-password\?token=/) });
    const prod = await requestReset(db, { email: address, locale: "en" }, { ...ctx(), ...base, emailConfigured: false, send, later: d.later });
    expect(prod).toEqual({ delivery: "not-configured" });
    expect(send).not.toHaveBeenCalled();
  });

  it("keeps only the newest link alive", async () => {
    const address = email();
    await account(address);
    const links: string[] = [];
    const send = async (m: Mail) => (links.push(m.text.match(/token=([\w-]+)/)![1]), "sent" as const);
    const d = later();
    await requestReset(db, { email: address, locale: "en" }, { ...ctx(), ...base, send, later: d.later });
    await d.flush();
    await requestReset(db, { email: address, locale: "en" }, { ...ctx(), ...base, send, later: d.later });
    await d.flush();
    expect(await resetValid(db, links[0])).toBe(false);
    expect(await resetValid(db, links[1])).toBe(true);
  });

  it("limits requests per address", async () => {
    const address = email();
    const send = async () => "sent" as const;
    const d = later();
    for (let i = 0; i < LIMITS.resetEmail.max; i++) await requestReset(db, { email: address, locale: "en" }, { ip: `172.16.0.${i}`, ...base, send, later: d.later });
    expect(await requestReset(db, { email: address, locale: "en" }, { ip: "172.16.1.1", ...base, send, later: d.later })).toMatchObject({ status: 429 });
  });

  it("uses the link once, changes the password and signs every device out", async () => {
    const address = email();
    const { token: oldSession } = await account(address);
    let link = "";
    const d = later();
    await requestReset(db, { email: address, locale: "en" }, { ...ctx(), ...base, send: async (m) => ((link = m.text.match(/token=([\w-]+)/)![1]), "sent"), later: d.later });
    await d.flush();
    expect(await confirmReset(db, { token: link, password: "short" })).toMatchObject({ ok: false, fields: { password: "err.password" } });
    const r = (await confirmReset(db, { token: link, password: "a new long password" })) as AuthOk;
    expect(r.ok).toBe(true);
    expect(await readSession(db, oldSession)).toBeNull();
    expect(await readSession(db, r.token)).not.toBeNull();
    expect(await confirmReset(db, { token: link, password: "another long one" })).toMatchObject({ ok: false, error: "invalid-link" });
    expect((await signIn(db, { email: address, password: "correct horse" }, ctx())).ok).toBe(false);
    expect((await signIn(db, { email: address, password: "a new long password" }, ctx())).ok).toBe(true);
  });
});

describe("the account password again", () => {
  it("confirms the holder, and counts wrong tries against the sign-in limit", async () => {
    const address = email();
    const { account: a } = await account(address);
    expect(await confirmPassword(db, a.id, "correct horse", { ip: "10.9.0.1" })).toEqual({ ok: true, email: address });
    for (let i = 0; i < LIMITS.signInEmail.max; i++) expect(await confirmPassword(db, a.id, "wrong", { ip: `10.9.1.${i}` })).toMatchObject({ ok: false, error: "bad-login" });
    // The same limit as signing in: no way around it by guessing here.
    expect(await confirmPassword(db, a.id, "correct horse", { ip: "10.9.2.1" })).toMatchObject({ ok: false, error: "rate" });
    expect(await signIn(db, { email: address, password: "correct horse" }, { ip: "10.9.2.2" })).toMatchObject({ ok: false, error: "rate" });
  });
});

describe("old rows", () => {
  it("expired sessions are cleared", async () => {
    const { token } = await account();
    const later = Date.now() + SESSION_TTL_MS + 1000;
    await pruneSessions(db, later);
    expect(await readSession(db, token)).toBeNull();
  });
});

describe("links in email", () => {
  const req = new Request("http://evil.example/api/auth/reset", { headers: { host: "evil.example" } });
  it("never come from the request's Host in production", () => {
    expect(appOrigin(req, { NODE_ENV: "production" })).toBeNull();
    expect(appOrigin(req, { NODE_ENV: "production", APP_URL: "https://kaizenedu.net/x" })).toBe("https://kaizenedu.net");
    expect(appOrigin(req, { NODE_ENV: "production", VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "kaizenedu.net" })).toBe("https://kaizenedu.net");
    expect(appOrigin(req, { NODE_ENV: "production", VERCEL_ENV: "preview", VERCEL_URL: "kaizenedu-abc.vercel.app" })).toBe("https://kaizenedu-abc.vercel.app");
    expect(appOrigin(req, { NODE_ENV: "development" })).toBe("http://evil.example");
  });
});
