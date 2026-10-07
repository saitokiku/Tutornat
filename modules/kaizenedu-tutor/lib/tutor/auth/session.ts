/**
 * Cookie sessions for accounts and learner profiles. The cookie carries a
 * random token; the database stores its SHA-256. Thirty-day expiry, sliding
 * on selection changes. The cookie is HttpOnly, SameSite=Lax, Secure in prod.
 */
import { createHash, randomBytes } from 'node:crypto';

import type { Role } from '@/lib/tutor/contracts';
import type { Queryable } from '@/lib/tutor/db';

export const SESSION_COOKIE = 'nt_session';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function newId(prefix: string): string {
  return `${prefix}_${randomBytes(12).toString('base64url')}`;
}

export interface SessionRow extends Record<string, unknown> {
  id: string;
  account_id: string;
  learner_id: string | null;
  role: Role;
  expires_at: string | Date;
  /**
   * The account's email, joined in so staff membership can be decided without
   * a second round trip on the request path. Never sent to a client.
   */
  email: string;
  /** Whether the account is a guest (D35), read from the account row in the same join. */
  guest: boolean;
}

export async function createAuthSession(
  db: Queryable,
  input: { accountId: string; learnerId: string | null; role: Role },
): Promise<{ token: string; sessionId: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('base64url');
  const sessionId = newId('as');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.query(
    `INSERT INTO account_sessions (id, account_id, learner_id, role, token_hash, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [sessionId, input.accountId, input.learnerId, input.role, hashToken(token), expiresAt],
  );
  return { token, sessionId, expiresAt };
}

export async function readAuthSession(db: Queryable, token: string): Promise<SessionRow | null> {
  const { rows } = await db.query<SessionRow>(
    `SELECT s.id, s.account_id, s.learner_id, s.role, s.expires_at, a.email, a.guest
     FROM account_sessions s JOIN accounts a ON a.id = s.account_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [hashToken(token)],
  );
  return rows[0] ?? null;
}

export async function setSessionLearner(
  db: Queryable,
  sessionId: string,
  learnerId: string | null,
  role: Role,
): Promise<void> {
  await db.query(`UPDATE account_sessions SET learner_id = $2, role = $3 WHERE id = $1`, [
    sessionId,
    learnerId,
    role,
  ]);
}

export async function destroyAuthSession(db: Queryable, token: string): Promise<void> {
  await db.query(`DELETE FROM account_sessions WHERE token_hash = $1`, [hashToken(token)]);
}

export function sessionCookieHeader(token: string, expiresAt: Date): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Expires=${expiresAt.toUTCString()}${secure}`;
}

export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function readCookie(headers: Headers, name: string): string | null {
  const raw = headers.get('cookie');
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}
