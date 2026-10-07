/**
 * The support inbox (reference §5; ported from Kaizen-AI's
 * `app/api/support/route.js`): a way for anyone, signed in or not, to reach a
 * person. Not a tutor handoff and not a chat: one message, stored, and mailed
 * to SUPPORT_EMAIL, with `delivered: false` said plainly when that mail could
 * not go out rather than a "sent" that reached nobody. Throttled per address
 * and per caller through the sign-in throttle (ten per fifteen minutes).
 */
import { z } from 'zod';

import { createLogger } from '@/lib/logger';
import { normalizeEmail } from '@/lib/tutor/accounts/accounts';
import { AccountsError } from '@/lib/tutor/accounts/errors';
import { recordSignInFailure, signInThrottle } from '@/lib/tutor/accounts/throttle';
import type { Principal } from '@/lib/tutor/contracts';
import { newId } from '@/lib/tutor/auth/session';
import type { Queryable } from '@/lib/tutor/db';
import {
  emailConfigStatus,
  recipientDomain,
  sendEmail,
  supportRequestEmail,
  type EnvLike,
  type SendOptions,
} from '@/lib/tutor/email';
import type { SupportRequest, SupportResponse } from '@/lib/tutor/wire';

import { SUPPORT_MESSAGE_MAX, SUPPORT_MESSAGE_MIN } from './limits';

const log = createLogger('tutor-support');

export const SUPPORT_EMAIL_ENV = 'SUPPORT_EMAIL';
export { SUPPORT_MESSAGE_MAX, SUPPORT_MESSAGE_MIN } from './limits';
export const SUPPORT_PAGE_MAX = 200;
export const SUPPORT_USER_AGENT_MAX = 200;

export const SUPPORT_DELIVERED_MESSAGE = 'Sent. A person reads these and replies by email.';
export const SUPPORT_SAVED_MESSAGE =
  'Saved, but this copy of the product cannot send email yet, so nobody has been told. Keep the reference in case you need it.';
export const SUPPORT_SEND_FAILED_MESSAGE =
  'Saved, but the message could not be emailed just now. Keep the reference; a person can find it by that.';

export const supportRequestSchema = z.object({
  email: z
    .string()
    .max(254)
    .transform((value) => value.trim().toLowerCase())
    .pipe(z.email('Enter a valid email address.')),
  message: z
    .string()
    .max(SUPPORT_MESSAGE_MAX * 2)
    .transform((value) => value.trim())
    .pipe(
      z
        .string()
        .min(SUPPORT_MESSAGE_MIN, `Say a little more: at least ${SUPPORT_MESSAGE_MIN} characters.`)
        .max(SUPPORT_MESSAGE_MAX, `Keep it under ${SUPPORT_MESSAGE_MAX} characters.`),
    ),
  page: z.string().trim().max(SUPPORT_PAGE_MAX).optional(),
});

export interface SupportInboxStatus {
  /** True when a message reaches a person: SUPPORT_EMAIL set and email configured. */
  configured: boolean;
  missing: string[];
}

export function supportInboxStatus(env: EnvLike = process.env): SupportInboxStatus {
  const email = emailConfigStatus(env);
  const missing = [...email.missing];
  if (!env[SUPPORT_EMAIL_ENV]?.trim()) missing.push(SUPPORT_EMAIL_ENV);
  return { configured: missing.length === 0, missing };
}

export interface SupportContext {
  /** The signed-in caller, when there is one; the message is attached to the account. */
  principal: Principal | null;
  /** The caller's network address for the per-caller throttle; null when unknown. */
  callerKey?: string | null;
  userAgent?: string | null;
  /** Transport overrides for tests. */
  send?: SendOptions;
}

/** Counts every request against the key, allowed or not, and refuses past the window. */
function throttle(key: string, now: Date): void {
  const decision = signInThrottle(key, now.getTime());
  if (!decision.allowed) {
    const minutes = Math.max(1, Math.ceil(decision.retryAfterSeconds / 60));
    throw new AccountsError(
      'RATE_LIMITED',
      429,
      `Too many messages. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
      { 'retry-after': String(decision.retryAfterSeconds) },
    );
  }
  recordSignInFailure(key, now.getTime());
}

export async function submitSupportRequest(
  db: Queryable,
  input: SupportRequest,
  context: SupportContext,
  now = new Date(),
): Promise<SupportResponse> {
  const email = normalizeEmail(input.email);
  throttle(`support:${email}`, now);
  if (context.callerKey) throttle(`support-ip:${context.callerKey}`, now);

  const reference = newId('sup');
  const accountId = context.principal?.accountId ?? null;
  const learnerId = context.principal?.learnerId ?? null;
  const page = input.page?.trim().slice(0, SUPPORT_PAGE_MAX) || null;
  const userAgent = context.userAgent?.trim().slice(0, SUPPORT_USER_AGENT_MAX) || null;
  const message = input.message.trim();
  await db.query(
    `INSERT INTO support_requests (id, account_id, learner_id, email, message, page, user_agent, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [reference, accountId, learnerId, email, message, page, userAgent, now],
  );

  const env = context.send?.env ?? process.env;
  const status = supportInboxStatus(env);
  if (!status.configured) {
    log.warn(
      `saved ${reference} undelivered (${status.missing.join(', ')} unset) from=${recipientDomain(email)}`,
    );
    return { delivered: false, reference, message: SUPPORT_SAVED_MESSAGE };
  }
  const outcome = await sendEmail(
    {
      ...supportRequestEmail({
        reference,
        fromEmail: email,
        message,
        page,
        accountId,
        learnerId,
        userAgent,
        at: now,
      }),
      to: env[SUPPORT_EMAIL_ENV]!.trim(),
      replyTo: email,
      kind: 'essential',
    },
    context.send,
  );
  if (outcome.sent) {
    await db.query(`UPDATE support_requests SET delivered_at = $2 WHERE id = $1`, [reference, now]);
    log.info(`delivered ${reference} account=${accountId ?? 'none'}`);
    return { delivered: true, reference, message: SUPPORT_DELIVERED_MESSAGE };
  }
  log.error(`send failed ${reference} reason=${outcome.reason}`);
  return { delivered: false, reference, message: SUPPORT_SEND_FAILED_MESSAGE };
}
