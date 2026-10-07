/**
 * Password reset — the funnel hole `docs/MVP-REFERENCE.md` §2 names first:
 * an account with a forgotten password was simply lost.
 *
 * The request half answers the same sentence whether or not the address has
 * an account, so the form cannot be used to list who is registered. When it
 * has one, a token is minted — 32 random bytes, sent once inside a link and
 * kept only as its SHA-256 — and the reset mail goes out through the wrapper.
 * Earlier unused tokens for the account are voided, so only the latest link
 * works. The throttle is the sign-in one, keyed per address and per caller:
 * a reset form is also a way to fill a stranger's inbox.
 *
 * The reset half consumes the token in the same statement that reads it, so
 * two clicks cannot both succeed; replaces the password; closes every session
 * of the account, so whoever held the old password is signed out everywhere;
 * and signs the caller in fresh.
 *
 * Nothing here logs an address or a token. One asymmetry remains and is
 * accepted: a known address does more work (a row, a send) than an unknown
 * one, so the response takes longer. Closing that would mean sending mail to
 * nobody.
 */
import { randomBytes } from 'node:crypto';

import { isStaffEmail } from '@/kaizen.config';
import { hashPassword } from '@/lib/tutor/auth/password';
import { createAuthSession, hashToken, newId } from '@/lib/tutor/auth/session';
import { PRODUCT_ROUTES, type Principal } from '@/lib/tutor/contracts';
import type { Queryable, TutorDb } from '@/lib/tutor/db';
import {
  emailConfigStatus,
  PASSWORD_RESET_TTL_MINUTES,
  passwordResetEmail,
  passwordResetUrl,
  sendEmail,
  type SendOptions,
} from '@/lib/tutor/email';
import type {
  RequestPasswordResetRequest,
  RequestPasswordResetResponse,
  ResetPasswordRequest,
} from '@/lib/tutor/wire';

import { findAccountByEmail, normalizeEmail } from './accounts';
import { deriveSignInRole, type AuthOutcome } from './auth-flows';
import { AccountsError } from './errors';
import { onAccountEvent } from './events';
import { listLearners } from './learners';
import { clearSignInFailures, recordSignInFailure, signInThrottle } from './throttle';

export const PASSWORD_RESET_PURPOSE = 'password_reset';
export const PASSWORD_RESET_TTL_MS = PASSWORD_RESET_TTL_MINUTES * 60_000;

/** The one answer the request route gives, whoever asked. */
export const RESET_REQUESTED_MESSAGE =
  'If that address has an account, the email is on its way. The link in it works for one hour.';
export const RESET_NOT_CONFIGURED_MESSAGE =
  'This copy of the product cannot send email yet, so no reset link can go out. Whoever runs it needs to set RESEND_API_KEY and EMAIL_FROM.';
export const RESET_SEND_FAILED_MESSAGE =
  'The email could not be sent just now. Try again in a few minutes.';
export const RESET_LINK_INVALID_MESSAGE =
  'This link has expired or was already used. Request a new one.';

export interface RequestPasswordResetContext {
  /** The origin the link points at: APP_URL, or the request's own origin. */
  baseUrl: string;
  /** The caller's network address for the per-caller throttle; null when unknown. */
  callerKey?: string | null;
  /** Transport overrides for tests. */
  send?: SendOptions;
}

/** Counts every request against the key, allowed or not, and refuses past the window. */
function requestThrottle(key: string, now: Date): void {
  const decision = signInThrottle(key, now.getTime());
  if (!decision.allowed) {
    const minutes = Math.max(1, Math.ceil(decision.retryAfterSeconds / 60));
    throw new AccountsError(
      'RATE_LIMITED',
      429,
      `Too many reset requests. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
      { 'retry-after': String(decision.retryAfterSeconds) },
    );
  }
  recordSignInFailure(key, now.getTime());
}

export async function requestPasswordReset(
  db: Queryable,
  input: RequestPasswordResetRequest,
  context: RequestPasswordResetContext,
  now = new Date(),
): Promise<RequestPasswordResetResponse> {
  const email = normalizeEmail(input.email);
  requestThrottle(`reset:${email}`, now);
  if (context.callerKey) requestThrottle(`reset-ip:${context.callerKey}`, now);

  // Decided before the address is looked up, so the answer is the same for a
  // known and an unknown address on a deploy that cannot send at all.
  if (!emailConfigStatus(context.send?.env ?? process.env).configured) {
    return { delivery: 'not_configured', message: RESET_NOT_CONFIGURED_MESSAGE };
  }

  const account = await findAccountByEmail(db, email);
  if (!account) return { delivery: 'sent', message: RESET_REQUESTED_MESSAGE };

  const token = randomBytes(32).toString('base64url');
  const id = newId('tok');
  await db.query(
    `UPDATE auth_tokens SET used_at = now()
     WHERE account_id = $1 AND purpose = $2 AND used_at IS NULL`,
    [account.id, PASSWORD_RESET_PURPOSE],
  );
  await db.query(
    `INSERT INTO auth_tokens (id, account_id, email, purpose, token_hash, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      id,
      account.id,
      account.email,
      PASSWORD_RESET_PURPOSE,
      hashToken(token),
      new Date(now.getTime() + PASSWORD_RESET_TTL_MS),
    ],
  );

  const resetUrl = passwordResetUrl(context.baseUrl, PRODUCT_ROUTES.resetPassword, token);
  const outcome = await sendEmail(
    { ...passwordResetEmail({ resetUrl }), to: account.email, kind: 'essential' },
    context.send,
  );
  if (outcome.sent) return { delivery: 'sent', message: RESET_REQUESTED_MESSAGE };

  // A link nobody received must not stay live.
  await db.query(`UPDATE auth_tokens SET used_at = now() WHERE id = $1`, [id]);
  if (outcome.reason === 'not_configured') {
    return { delivery: 'not_configured', message: RESET_NOT_CONFIGURED_MESSAGE };
  }
  return { delivery: 'failed', message: RESET_SEND_FAILED_MESSAGE };
}

interface ConsumedTokenRow extends Record<string, unknown> {
  account_id: string | null;
  email: string;
}

export async function resetPassword(
  db: TutorDb,
  input: ResetPasswordRequest,
): Promise<AuthOutcome> {
  const outcome = await db.withTransaction(async (tx) => {
    // Read and consume in one statement: a second click finds `used_at` set.
    const { rows } = await tx.query<ConsumedTokenRow>(
      `UPDATE auth_tokens SET used_at = now()
       WHERE token_hash = $1 AND purpose = $2 AND used_at IS NULL AND expires_at > now()
       RETURNING account_id, email`,
      [hashToken(input.token), PASSWORD_RESET_PURPOSE],
    );
    const row = rows[0];
    if (!row?.account_id) {
      throw new AccountsError('INVALID_TOKEN', 400, RESET_LINK_INVALID_MESSAGE);
    }
    const accountId = row.account_id;
    await tx.query(`UPDATE accounts SET password_hash = $2 WHERE id = $1`, [
      accountId,
      await hashPassword(input.password),
    ]);
    await tx.query(`DELETE FROM account_sessions WHERE account_id = $1`, [accountId]);
    clearSignInFailures(`email:${normalizeEmail(row.email)}`);
    const { role, learner } = deriveSignInRole(await listLearners(tx, accountId));
    const session = await createAuthSession(tx, {
      accountId,
      learnerId: learner?.id ?? null,
      role,
    });
    const principal: Principal = {
      accountId,
      learnerId: learner?.id ?? null,
      role,
      band: learner?.band ?? null,
      authSessionId: session.sessionId,
      staff: isStaffEmail(row.email),
      guest: false,
    };
    return { principal, token: session.token, expiresAt: session.expiresAt };
  });
  onAccountEvent('password_reset', { accountId: outcome.principal.accountId });
  return outcome;
}
