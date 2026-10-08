import "server-only";
import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { and, eq, gt, isNull, lt, sql } from "drizzle-orm";
import type { Locale } from "@/lib/types";
import type { Db } from "./client";
import { resetMail, type Sender } from "./email";
import { NAME_MAX, normEmail, PASSWORD_MAX, validate, type FieldErrors } from "./fields";
import { accounts, adultSelfAuthorities, authThrottle, capabilityGrants, passwordResets, profiles, sessions } from "./schema";
import type { PublicAccount } from "./wire";

// Accounts on the server: scrypt passwords, cookie sessions, a sign-in throttle shared by every
// instance, and one-use reset links. Ported from modules/kaizenedu-tutor (lib/tutor/auth,
// accounts/throttle, accounts/password-reset), rewritten for this schema.

// ---- passwords --------------------------------------------------------------------------------

const COST = 16_384; // N; r = 8 → 16 MB per hash, well inside Node's default scrypt memory cap
const KEY_LENGTH = 64;

function derive(password: string, salt: Buffer, cost: number, length: number): Promise<Buffer> {
  return new Promise((resolve, reject) => scrypt(password, salt, length, { N: cost }, (e, key) => (e ? reject(e) : resolve(key))));
}

/** `scrypt$<N>$<salt>$<hash>`, base64url. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, COST, KEY_LENGTH);
  return `scrypt$${COST}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, cost, salt, hash] = stored.split("$");
  const n = Number(cost);
  if (scheme !== "scrypt" || !salt || !hash || !Number.isInteger(n) || n < 1024 || n > 1_048_576) return false;
  const expected = Buffer.from(hash, "base64url");
  const key = await derive(password, Buffer.from(salt, "base64url"), n, expected.length);
  return key.length === expected.length && timingSafeEqual(key, expected);
}

// An unknown email still costs one hash, so response time doesn't say which addresses have accounts.
let dummy: Promise<string> | null = null;
const dummyHash = () => (dummy ??= hashPassword(randomBytes(12).toString("hex")));

// ---- tokens and sessions ------------------------------------------------------------------------

export const SESSION_TTL_MS = 30 * 24 * 3600_000;
export const RESET_TTL_MS = 60 * 60_000;

export const newToken = () => randomBytes(32).toString("base64url");
export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** `learnerId`: who the browser last said is using it (a learner's id, "parent", or null). */
export type Session = { id: string; accountId: string; expiresAt: Date; learnerId: string | null };

/** Old rows are worthless; clear them now and then rather than on every request. */
const sometimes = () => Math.random() < 0.02;

export async function createSession(db: Db, accountId: string, now = Date.now()) {
  const token = newToken();
  const expiresAt = new Date(now + SESSION_TTL_MS);
  await db.insert(sessions).values({ id: randomUUID(), accountId, tokenHash: sha256(token), expiresAt, createdAt: new Date(now) });
  if (sometimes()) await pruneSessions(db, now);
  return { token, expiresAt };
}

export const pruneSessions = (db: Db, now = Date.now()) => db.delete(sessions).where(lt(sessions.expiresAt, new Date(now)));

export async function readSession(db: Db, token: string | null, now = Date.now()): Promise<Session | null> {
  if (!token || token.length > 100) return null;
  const [row] = await db
    .select({ id: sessions.id, accountId: sessions.accountId, expiresAt: sessions.expiresAt, learnerId: sessions.learnerId })
    .from(sessions)
    .where(and(eq(sessions.tokenHash, sha256(token)), gt(sessions.expiresAt, new Date(now))));
  return row ?? null;
}

/** Records who is using this browser now (sync reports it), for the consent gate on AI and voice. */
export async function setSessionLearner(db: Db, session: Session, learner: string | null): Promise<boolean> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${session.accountId}, 0))`);
    const [live] = await tx.select().from(sessions).where(and(eq(sessions.id, session.id), eq(sessions.accountId, session.accountId), gt(sessions.expiresAt, new Date())));
    if (!live) return false;
    if (learner && learner !== "parent") {
      const [owned] = await tx.select({ id: profiles.id }).from(profiles).where(and(eq(profiles.accountId, session.accountId), eq(profiles.id, learner), eq(profiles.deleted, false)));
      if (!owned) return false;
    }
    if (live.learnerId !== learner) {
      await tx.update(capabilityGrants).set({ revokedAt: new Date() }).where(and(eq(capabilityGrants.sessionId, session.id), isNull(capabilityGrants.revokedAt)));
      await tx.update(adultSelfAuthorities).set({ revokedAt: new Date() }).where(and(eq(adultSelfAuthorities.sessionId, session.id), isNull(adultSelfAuthorities.revokedAt)));
      await tx.update(sessions).set({ learnerId: learner }).where(eq(sessions.id, session.id));
    }
    return true;
  });
}

/** Sliding expiry: a session used in its second half gets a fresh 30 days. Returns the new expiry, or null. */
export async function renewSession(db: Db, s: Session, now = Date.now()): Promise<Date | null> {
  if (s.expiresAt.getTime() - now > SESSION_TTL_MS / 2) return null;
  const expiresAt = new Date(now + SESSION_TTL_MS);
  await db.update(sessions).set({ expiresAt }).where(eq(sessions.id, s.id));
  return expiresAt;
}

export async function endSession(db: Db, token: string | null) {
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, sha256(token)));
}

// ---- throttle -------------------------------------------------------------------------------------

type Limit = { max: number; windowMs: number };
export const LIMITS = {
  /** Wrong passwords per address. */
  signInEmail: { max: 10, windowMs: 15 * 60_000 },
  /** Wrong passwords per network address (a school or a shared Wi-Fi shares one). */
  signInIp: { max: 100, windowMs: 15 * 60_000 },
  signUpIp: { max: 20, windowMs: 60 * 60_000 },
  /** Reset requests: a reset form is also a way to fill a stranger's inbox. */
  resetEmail: { max: 5, windowMs: 60 * 60_000 },
  resetIp: { max: 30, windowMs: 60 * 60_000 },
} satisfies Record<string, Limit>;

const throttleKey = (kind: string, value: string) => sha256(`${kind}:${value}`);

/** Seconds until `key` may try again; 0 when it may now. */
export async function waitFor(db: Db, key: string, limit: Limit, now = Date.now()): Promise<number> {
  const [row] = await db.select().from(authThrottle).where(eq(authThrottle.key, key));
  if (!row) return 0;
  const ends = row.windowStart.getTime() + limit.windowMs;
  if (ends <= now || row.count < limit.max) return 0;
  return Math.max(1, Math.ceil((ends - now) / 1000));
}

export async function countHit(db: Db, key: string, limit: Limit, now = Date.now()) {
  const start = new Date(now);
  const expired = sql`${authThrottle.windowStart} <= ${new Date(now - limit.windowMs)}`;
  await db
    .insert(authThrottle)
    .values({ key, count: 1, windowStart: start })
    .onConflictDoUpdate({
      target: authThrottle.key,
      set: {
        count: sql`case when ${expired} then 1 else ${authThrottle.count} + 1 end`,
        windowStart: sql`case when ${expired} then ${start} else ${authThrottle.windowStart} end`,
      },
    });
  if (sometimes()) await db.delete(authThrottle).where(lt(authThrottle.windowStart, new Date(now - 24 * 3600_000)));
}

const forgive = (db: Db, key: string) => db.delete(authThrottle).where(eq(authThrottle.key, key));

// ---- account flows ----------------------------------------------------------------------------------

export type AuthError = "fields" | "adult" | "bad-login" | "rate" | "invalid-link";
export type AuthOk = { ok: true; account: PublicAccount; token: string; expiresAt: Date };
export type AuthFail = { ok: false; status: number; error: AuthError; fields?: FieldErrors; retryAfter?: number };
type Ctx = { ip: string; now?: number };

const publicAccount = (a: typeof accounts.$inferSelect): PublicAccount => ({
  id: a.id,
  email: a.email,
  displayName: a.displayName,
  goals: a.goals ?? null,
  createdAt: a.createdAt.getTime(),
});

const rate = (retryAfter: number): AuthFail => ({ ok: false, status: 429, error: "rate", retryAfter });

export async function accountById(db: Db, id: string): Promise<PublicAccount | null> {
  const [a] = await db.select().from(accounts).where(eq(accounts.id, id));
  return a ? publicAccount(a) : null;
}

/** The grown-up creates the account (parent-first): `adult` is their statement that they are 18 or older. */
export async function signUp(
  db: Db,
  input: { email: string; password: string; displayName: string; adult?: boolean },
  ctx: Ctx,
): Promise<AuthOk | AuthFail> {
  const now = ctx.now ?? Date.now();
  const fields = validate(input);
  if (Object.keys(fields).length) return { ok: false, status: 400, error: "fields", fields };
  if (input.adult !== true) return { ok: false, status: 400, error: "adult" };
  const ipKey = throttleKey("signup-ip", ctx.ip);
  const wait = await waitFor(db, ipKey, LIMITS.signUpIp, now);
  if (wait) return rate(wait);
  await countHit(db, ipKey, LIMITS.signUpIp, now);
  const email = normEmail(input.email);
  const passwordHash = await hashPassword(input.password);
  const [row] = await db
    .insert(accounts)
    .values({ id: randomUUID(), email, displayName: input.displayName.trim().slice(0, NAME_MAX), passwordHash, createdAt: new Date(now), updatedAt: new Date(now) })
    .onConflictDoNothing({ target: accounts.email })
    .returning();
  if (!row) return { ok: false, status: 409, error: "fields", fields: { email: "err.emailTaken" } };
  return { ok: true, account: publicAccount(row), ...(await createSession(db, row.id, now)) };
}

/** Every sign-in issues a new session token; the one the browser brought (if any) is ended. */
export async function signIn(db: Db, input: { email: string; password: string }, ctx: Ctx & { previous?: string | null }): Promise<AuthOk | AuthFail> {
  const now = ctx.now ?? Date.now();
  const email = normEmail(input.email);
  const emailKey = throttleKey("signin", email);
  const ipKey = throttleKey("signin-ip", ctx.ip);
  const wait = Math.max(await waitFor(db, emailKey, LIMITS.signInEmail, now), await waitFor(db, ipKey, LIMITS.signInIp, now));
  if (wait) return rate(wait);
  const [row] = await db.select().from(accounts).where(eq(accounts.email, email));
  let ok = false;
  if (row) ok = await verifyPassword(input.password, row.passwordHash);
  else await verifyPassword(input.password, await dummyHash());
  if (!row || !ok) {
    await countHit(db, emailKey, LIMITS.signInEmail, now);
    await countHit(db, ipKey, LIMITS.signInIp, now);
    return { ok: false, status: 401, error: "bad-login" };
  }
  await forgive(db, emailKey);
  await endSession(db, ctx.previous ?? null);
  return { ok: true, account: publicAccount(row), ...(await createSession(db, row.id, now)) };
}

/**
 * The signed-in account holder proves it is them again, before something only they may do (consent
 * for a child). Wrong passwords count against the same limit as sign-in, so this is no way around it.
 */
export async function confirmPassword(db: Db, accountId: string, password: string, ctx: Ctx): Promise<{ ok: true; email: string } | AuthFail> {
  const now = ctx.now ?? Date.now();
  const [row] = await db.select({ email: accounts.email, passwordHash: accounts.passwordHash }).from(accounts).where(eq(accounts.id, accountId));
  if (!row) return { ok: false, status: 401, error: "bad-login" };
  const emailKey = throttleKey("signin", row.email);
  const ipKey = throttleKey("signin-ip", ctx.ip);
  const wait = Math.max(await waitFor(db, emailKey, LIMITS.signInEmail, now), await waitFor(db, ipKey, LIMITS.signInIp, now));
  if (wait) return rate(wait);
  if (password.length <= PASSWORD_MAX && (await verifyPassword(password, row.passwordHash))) return { ok: true, email: row.email };
  await countHit(db, emailKey, LIMITS.signInEmail, now);
  await countHit(db, ipKey, LIMITS.signInIp, now);
  return { ok: false, status: 403, error: "bad-login" };
}

export type ResetAnswer = { delivery: "sent" | "not-configured"; devLink?: string };

/**
 * Answers the same whoever asks, at the same speed, so the form can't list who has an account: with
 * email set up it is always "sent", and a known address's link is made and mailed after the answer
 * (`later`). A failed send is logged on the server, never told to the asker. Without email,
 * development shows the link on the page and production says reset email isn't available.
 */
export async function requestReset(
  db: Db,
  input: { email: string; locale: Locale },
  ctx: Ctx & { origin: string | null; send: Sender; emailConfigured: boolean; production: boolean; later: (task: () => Promise<void>) => void },
): Promise<ResetAnswer | AuthFail> {
  const now = ctx.now ?? Date.now();
  const email = normEmail(input.email);
  const keys = [
    [throttleKey("reset", email), LIMITS.resetEmail],
    [throttleKey("reset-ip", ctx.ip), LIMITS.resetIp],
  ] as const;
  for (const [key, limit] of keys) {
    const wait = await waitFor(db, key, limit, now);
    if (wait) return rate(wait);
  }
  for (const [key, limit] of keys) await countHit(db, key, limit, now);

  const showLink = !ctx.emailConfigured && !ctx.production;
  // Email set up but no address to put in the link: a setup problem, the same for every asker.
  const origin = ctx.origin;
  if (!showLink && (!ctx.emailConfigured || !origin)) {
    if (ctx.emailConfigured) console.error("[auth] reset email is set up but APP_URL is not; no link can be sent");
    return { delivery: "not-configured" };
  }
  const [row] = await db.select({ id: accounts.id, email: accounts.email }).from(accounts).where(eq(accounts.email, email));

  const issue = async () => {
    const token = newToken();
    const id = randomUUID();
    await db.update(passwordResets).set({ usedAt: new Date(now) }).where(and(eq(passwordResets.accountId, row!.id), isNull(passwordResets.usedAt)));
    await db.insert(passwordResets).values({ id, accountId: row!.id, tokenHash: sha256(token), createdAt: new Date(now), expiresAt: new Date(now + RESET_TTL_MS) });
    if (sometimes()) await db.delete(passwordResets).where(lt(passwordResets.expiresAt, new Date(now)));
    return { id, path: `/reset-password?token=${token}` };
  };

  if (showLink) return row ? { delivery: "not-configured", devLink: (await issue()).path } : { delivery: "not-configured" };
  if (row)
    ctx.later(async () => {
      const { id, path } = await issue();
      const delivery = await ctx.send(resetMail(row.email, origin + path, input.locale));
      if (delivery === "sent") return;
      // A link nobody received must not stay live.
      await db.update(passwordResets).set({ usedAt: new Date(now) }).where(eq(passwordResets.id, id));
      console.error(`[auth] a reset email was not sent (${delivery})`);
    });
  return { delivery: "sent" };
}

export async function resetValid(db: Db, token: string, now = Date.now()) {
  if (!token || token.length > 100) return false;
  const [row] = await db
    .select({ id: passwordResets.id })
    .from(passwordResets)
    .where(and(eq(passwordResets.tokenHash, sha256(token)), isNull(passwordResets.usedAt), gt(passwordResets.expiresAt, new Date(now))));
  return Boolean(row);
}

/** Uses the link (once), sets the password, signs out every device, and signs this one in. */
export async function confirmReset(db: Db, input: { token: string; password: string }, ctx: { now?: number } = {}): Promise<AuthOk | AuthFail> {
  const now = ctx.now ?? Date.now();
  const fields = validate({ password: input.password });
  if (fields.password) return { ok: false, status: 400, error: "fields", fields };
  if (!input.token || input.token.length > 100) return { ok: false, status: 400, error: "invalid-link" };
  const passwordHash = await hashPassword(input.password);
  return db.transaction(async (tx) => {
    // Read and use in one statement, so two clicks can't both succeed.
    const [used] = await tx
      .update(passwordResets)
      .set({ usedAt: new Date(now) })
      .where(and(eq(passwordResets.tokenHash, sha256(input.token)), isNull(passwordResets.usedAt), gt(passwordResets.expiresAt, new Date(now))))
      .returning({ accountId: passwordResets.accountId });
    if (!used) return { ok: false, status: 400, error: "invalid-link" } as AuthFail;
    const [row] = await tx.update(accounts).set({ passwordHash }).where(eq(accounts.id, used.accountId)).returning();
    await tx.delete(sessions).where(eq(sessions.accountId, used.accountId));
    await forgive(tx, throttleKey("signin", row.email));
    return { ok: true, account: publicAccount(row), ...(await createSession(tx, row.id, now)) } as AuthOk;
  });
}
