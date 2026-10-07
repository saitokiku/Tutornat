import "server-only";
import type { z } from "zod";
import { readSession, renewSession, type Session } from "./auth";
import { getDb, serverMode, type Db } from "./client";

// Request and response plumbing shared by the auth, sync and consent routes.

/** httpOnly: the session token never reaches page scripts. */
export const SESSION_COOKIE = "kz_session";
/** Readable by the page: "this browser is signed in to account <id> on the server". An id, not a secret. */
export const HINT_COOKIE = "kz_acct";

export function readCookie(req: Request, name: string): string | null {
  for (const part of (req.headers.get("cookie") ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) {
      try {
        return decodeURIComponent(part.slice(i + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}

const secureFor = (req: Request) => process.env.NODE_ENV === "production" || new URL(req.url).protocol === "https:";

export function sessionCookies(req: Request, token: string, accountId: string, expiresAt: Date): string[] {
  const tail = `; Path=/; SameSite=Lax; Expires=${expiresAt.toUTCString()}${secureFor(req) ? "; Secure" : ""}`;
  return [`${SESSION_COOKIE}=${token}; HttpOnly${tail}`, `${HINT_COOKIE}=${encodeURIComponent(accountId)}${tail}`];
}

export function clearedCookies(req: Request): string[] {
  const tail = `=; Path=/; SameSite=Lax; Max-Age=0${secureFor(req) ? "; Secure" : ""}`;
  return [`${SESSION_COOKIE}${tail}; HttpOnly`, `${HINT_COOKIE}${tail}`];
}

/** The caller's network address, for throttling only (Vercel puts the client first). */
export const clientIp = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";

/**
 * Refuses writes that another site's page started. SameSite=Lax already keeps the cookie off
 * cross-site POSTs; this is the second lock.
 */
export function crossSite(req: Request): boolean {
  if (req.headers.get("sec-fetch-site") === "cross-site") return true;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

export function json(body: unknown, init: { status?: number; cookies?: string[]; headers?: Record<string, string> } = {}): Response {
  const headers = new Headers({ "cache-control": "no-store", ...init.headers });
  for (const c of init.cookies ?? []) headers.append("set-cookie", c);
  return Response.json(body, { status: init.status ?? 200, headers });
}

/** Every server-mode route answers this when DATABASE_URL is not set: the app is browser-only here. */
export const localOnly = () => json({ error: "local" }, { status: 404 });

/** Reads a JSON body no larger than `maxBytes` that fits `schema`; otherwise the error response. */
export async function readJson<T>(req: Request, schema: z.ZodType<T>, maxBytes = 64_000): Promise<T | Response> {
  if (Number(req.headers.get("content-length") ?? 0) > maxBytes) return json({ error: "too_large" }, { status: 413 });
  const text = await req.text().catch(() => "");
  if (text.length > maxBytes) return json({ error: "too_large" }, { status: 413 });
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  return parsed.success ? parsed.data : json({ error: "bad_request" }, { status: 400 });
}

/** The answer to a failed auth flow: status, a machine-readable error, field messages, and Retry-After when throttled. */
export const authFailure = (f: { status: number; error: string; fields?: object; retryAfter?: number }) =>
  json({ error: f.error, fields: f.fields, retryAfter: f.retryAfter }, { status: f.status, headers: f.retryAfter ? { "retry-after": String(f.retryAfter) } : {} });

export type AccountCtx = { db: Db; session: Session; accountId: string };

/**
 * The gate for signed-in routes: server mode, same-site for writes, a live session. A session used in
 * its second half is renewed and the cookies re-sent with the answer.
 */
export async function withAccount(req: Request, run: (ctx: AccountCtx) => Promise<Response>): Promise<Response> {
  if (!serverMode()) return localOnly();
  if (req.method !== "GET" && crossSite(req)) return json({ error: "cross_site" }, { status: 403 });
  const db = await getDb();
  const token = readCookie(req, SESSION_COOKIE);
  const session = await readSession(db, token);
  if (!session || !token) return json({ error: "signed_out" }, { status: 401, cookies: token ? clearedCookies(req) : [] });
  const res = await run({ db, session, accountId: session.accountId });
  const renewed = await renewSession(db, session);
  if (!renewed) return res;
  const headers = new Headers(res.headers);
  for (const c of sessionCookies(req, token, session.accountId, renewed)) headers.append("set-cookie", c);
  return new Response(res.body, { status: res.status, headers });
}

/**
 * Where links in email point. Never the request's Host header (anyone can send any Host): the
 * configured APP_URL, else the address Vercel gives this deployment, else (development only) the
 * request's own origin.
 */
export function appOrigin(req: Request, env: Record<string, string | undefined> = process.env): string | null {
  try {
    if (env.APP_URL) return new URL(env.APP_URL).origin;
  } catch {}
  if (env.VERCEL_ENV === "production" && env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (env.VERCEL_URL) return `https://${env.VERCEL_URL}`;
  if (env.NODE_ENV !== "production") return new URL(req.url).origin;
  return null;
}
