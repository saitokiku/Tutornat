/**
 * A teen starts sign-up; a parent finishes it (reference §3, D30).
 *
 * The teen gives a first name, a birth year, a login name, a password and a
 * parent's email — and no email of their own: the product collects none from
 * anyone under 18. What they typed waits in `auth_tokens` with the password
 * already hashed, behind a seven-day, single-use link sent to the parent.
 * When the parent opens it, either the account that already has that address
 * takes the profile, or a new parent-owned account is created around it. The
 * teen then signs in with the login name they chose.
 *
 * The parent's completion is the parental permission the providers' terms
 * ask for, so it is recorded as a consent row with method
 * `parent_invitation` and the request id as evidence.
 *
 * A link that dies before the profile exists dies cleanly: the profile and
 * the consent row are written inside the same transaction that consumes the
 * token, so a login name taken in the meantime leaves the link usable with a
 * different name rather than spent.
 */
import { randomBytes } from 'node:crypto';

import { ageBandForBirthYear, isStaffEmail, type AgeBand } from '@/kaizen.config';
import { hashPassword } from '@/lib/tutor/auth/password';
import { createAuthSession, hashToken, newId } from '@/lib/tutor/auth/session';
import { getSubscription } from '@/lib/tutor/billing';
import { LEGAL_VERSIONS } from '@/lib/tutor/client/legal';
import { PRODUCT_ROUTES, type Learner, type Principal } from '@/lib/tutor/contracts';
import type { Queryable, TutorDb } from '@/lib/tutor/db';
import {
  emailConfigStatus,
  PARENT_INVITATION_TTL_DAYS,
  parentInvitationEmail,
  sendEmail,
  tokenLink,
  type SendOptions,
} from '@/lib/tutor/email';
import type {
  AcceptParentInviteRequest,
  ParentInviteResponse,
  TeenInviteRequest,
  TeenInviteResponse,
} from '@/lib/tutor/wire';

import { createAccount, findAccountByEmail, getAccount, normalizeEmail } from './accounts';
import { UNDER_18_SIGNUP_MESSAGE, type AuthOutcome } from './auth-flows';
import { recordConsent } from './consents';
import { AccountsError } from './errors';
import { onAccountEvent } from './events';
import { createLearner, isLoginNameTaken, validLoginName } from './learners';
import { recordSignInFailure, signInThrottle } from './throttle';

export const PARENT_INVITATION_PURPOSE = 'parent_invitation';
export const PARENT_INVITATION_TTL_MS = PARENT_INVITATION_TTL_DAYS * 24 * 60 * 60_000;

export const TEEN_INVITE_SENT_MESSAGE =
  'We emailed your parent a link to finish setting up the account. Once they have, sign in here with your login name.';
export const TEEN_INVITE_NOT_CONFIGURED_MESSAGE =
  'This copy of the product cannot send email yet, so your parent cannot be invited. Whoever runs it needs to set RESEND_API_KEY and EMAIL_FROM.';
export const TEEN_INVITE_FAILED_MESSAGE =
  'The email could not be sent just now. Try again in a few minutes.';
export const ADULT_INVITE_MESSAGE =
  'With that birth year you can create your own account: choose "learning for myself" instead.';
export const INVITE_LINK_INVALID_MESSAGE =
  'This link has expired or was already used. Ask your teen to start again from the sign-up page.';
export const INVITE_WRONG_ACCOUNT_MESSAGE =
  'This invitation was sent to a different email address. Sign out, then open the link again.';
export const INVITE_SIGN_IN_TO_ATTACH_MESSAGE =
  'An account with this email already exists. Sign in, then open the link again to add the profile.';
export const INVITE_NEEDS_ACCOUNT_MESSAGE = 'Your name and a password create the account.';

/** What the token row keeps for the parent's half. The password is already a hash. */
interface InvitationPayload {
  displayName: string;
  birthYear: number;
  loginName: string;
  loginHash: string;
  band: AgeBand;
}

function parsePayload(value: unknown): InvitationPayload | null {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  if (!raw) return null;
  const { displayName, birthYear, loginName, loginHash, band } = raw;
  if (
    typeof displayName !== 'string' ||
    typeof birthYear !== 'number' ||
    typeof loginName !== 'string' ||
    typeof loginHash !== 'string' ||
    band !== '13-17'
  ) {
    return null;
  }
  return { displayName, birthYear, loginName, loginHash, band };
}

export interface TeenInviteContext {
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
      `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
      { 'retry-after': String(decision.retryAfterSeconds) },
    );
  }
  recordSignInFailure(key, now.getTime());
}

/** A login name is taken when a profile has it or an open invitation is holding it. */
async function loginNameHeld(db: Queryable, loginName: string): Promise<boolean> {
  if (await isLoginNameTaken(db, loginName)) return true;
  const { rows } = await db.query<{ id: string }>(
    `SELECT id FROM auth_tokens
     WHERE purpose = $1 AND used_at IS NULL AND expires_at > now() AND payload->>'loginName' = $2`,
    [PARENT_INVITATION_PURPOSE, loginName],
  );
  return rows.length > 0;
}

export async function requestTeenInvite(
  db: Queryable,
  input: TeenInviteRequest,
  context: TeenInviteContext,
  now = new Date(),
): Promise<TeenInviteResponse> {
  const band = ageBandForBirthYear(input.birthYear, now);
  if (band === 'adult') throw new AccountsError('FORBIDDEN', 403, ADULT_INVITE_MESSAGE);
  // Under 13 gets the same neutral sentence the sign-up route gives: it
  // echoes no age and points at a parent (spec §11.2 item 1).
  if (band !== '13-17') throw new AccountsError('FORBIDDEN', 403, UNDER_18_SIGNUP_MESSAGE);

  const parentEmail = normalizeEmail(input.parentEmail);
  if (context.callerKey) requestThrottle(`invite-ip:${context.callerKey}`, now);
  requestThrottle(`invite:${parentEmail}`, now);

  const loginName = validLoginName(input.loginName);
  if (await loginNameHeld(db, loginName)) {
    throw new AccountsError('LOGIN_NAME_TAKEN', 409, 'That login name is taken. Try another.');
  }

  if (!emailConfigStatus(context.send?.env ?? process.env).configured) {
    return { delivery: 'not_configured', message: TEEN_INVITE_NOT_CONFIGURED_MESSAGE, loginName };
  }

  const payload: InvitationPayload = {
    displayName: input.displayName.trim(),
    birthYear: input.birthYear,
    loginName,
    loginHash: await hashPassword(input.password),
    band,
  };
  const token = randomBytes(32).toString('base64url');
  const id = newId('tok');
  await db.query(
    `INSERT INTO auth_tokens (id, account_id, email, purpose, token_hash, payload, expires_at)
     VALUES ($1, NULL, $2, $3, $4, $5::jsonb, $6)`,
    [
      id,
      parentEmail,
      PARENT_INVITATION_PURPOSE,
      hashToken(token),
      JSON.stringify(payload),
      new Date(now.getTime() + PARENT_INVITATION_TTL_MS),
    ],
  );

  const existingAccount = Boolean(await findAccountByEmail(db, parentEmail));
  const inviteUrl = tokenLink(context.baseUrl, PRODUCT_ROUTES.parentInvite, token);
  const outcome = await sendEmail(
    {
      ...parentInvitationEmail({
        teenName: payload.displayName,
        loginName,
        inviteUrl,
        existingAccount,
      }),
      to: parentEmail,
      kind: 'essential',
    },
    context.send,
  );
  if (outcome.sent) return { delivery: 'sent', message: TEEN_INVITE_SENT_MESSAGE, loginName };

  // A link nobody received must not hold the login name or stay live.
  await db.query(`UPDATE auth_tokens SET used_at = now() WHERE id = $1`, [id]);
  if (outcome.reason === 'not_configured') {
    return { delivery: 'not_configured', message: TEEN_INVITE_NOT_CONFIGURED_MESSAGE, loginName };
  }
  return { delivery: 'failed', message: TEEN_INVITE_FAILED_MESSAGE, loginName };
}

interface InviteRow extends Record<string, unknown> {
  id: string;
  email: string;
  payload: unknown;
  expires_at: string | Date;
}

async function liveInvite(
  db: Queryable,
  token: string,
  lock = false,
): Promise<{ row: InviteRow; payload: InvitationPayload }> {
  const { rows } = await db.query<InviteRow>(
    `SELECT id, email, payload, expires_at FROM auth_tokens
     WHERE token_hash = $1 AND purpose = $2 AND used_at IS NULL AND expires_at > now()${lock ? ' FOR UPDATE' : ''}`,
    [hashToken(token), PARENT_INVITATION_PURPOSE],
  );
  const row = rows[0];
  const payload = row ? parsePayload(row.payload) : null;
  if (!row || !payload) throw new AccountsError('INVALID_TOKEN', 400, INVITE_LINK_INVALID_MESSAGE);
  return { row, payload };
}

export async function readParentInvite(
  db: Queryable,
  token: string,
): Promise<ParentInviteResponse> {
  const { row, payload } = await liveInvite(db, token);
  return {
    teen: { displayName: payload.displayName, loginName: payload.loginName, band: payload.band },
    parentEmail: row.email,
    existingAccount: Boolean(await findAccountByEmail(db, row.email)),
    expiresAt: new Date(row.expires_at).toISOString(),
  };
}

export interface AcceptInviteContext {
  /** The caller's session when they are signed in; null for a new parent. */
  principal: Principal | null;
  under13Open: boolean;
  /** The request id, stored as the consent row's evidence. */
  evidenceRef: string;
  now?: Date;
}

export interface AcceptedInvite {
  accountId: string;
  teen: Learner;
  /** Set when the parent account was created here; the route sets its cookie. */
  session: AuthOutcome | null;
}

export async function acceptParentInvite(
  db: TutorDb,
  input: AcceptParentInviteRequest,
  context: AcceptInviteContext,
): Promise<AcceptedInvite> {
  const accepted = await db.withTransaction(async (tx) => {
    const { row, payload } = await liveInvite(tx, input.token, true);

    let accountId: string;
    let staff: boolean;
    let session: AuthOutcome | null = null;
    if (context.principal) {
      const account = await getAccount(tx, context.principal.accountId);
      if (!account || normalizeEmail(account.email) !== row.email) {
        throw new AccountsError('FORBIDDEN', 403, INVITE_WRONG_ACCOUNT_MESSAGE);
      }
      accountId = account.id;
      staff = context.principal.staff;
    } else {
      if (await findAccountByEmail(tx, row.email)) {
        throw new AccountsError('CONFLICT', 409, INVITE_SIGN_IN_TO_ATTACH_MESSAGE);
      }
      if (!input.displayName || !input.password) {
        throw new AccountsError('MISSING_REQUIRED_FIELD', 400, INVITE_NEEDS_ACCOUNT_MESSAGE);
      }
      const account = await createAccount(tx, {
        email: row.email,
        password: input.password,
        displayName: input.displayName,
      });
      await getSubscription(tx, account.id);
      accountId = account.id;
      staff = isStaffEmail(account.email);
      const created = await createAuthSession(tx, { accountId, learnerId: null, role: 'parent' });
      session = {
        principal: {
          accountId,
          learnerId: null,
          role: 'parent',
          band: null,
          authSessionId: created.sessionId,
          staff,
          guest: false,
        },
        token: created.token,
        expiresAt: created.expiresAt,
      };
    }

    const teen = await createLearner(
      tx,
      accountId,
      {
        displayName: payload.displayName,
        birthYear: payload.birthYear,
        loginName: input.loginName ?? payload.loginName,
        loginHash: payload.loginHash,
      },
      { under13Open: context.under13Open, now: context.now, staff },
    );
    await recordConsent(
      tx,
      accountId,
      {
        learnerId: teen.id,
        camera: false,
        noticeVersion: LEGAL_VERSIONS.notice,
        policyVersion: LEGAL_VERSIONS.privacy,
        method: 'parent_invitation',
      },
      {
        evidenceRef: context.evidenceRef,
        under13Open: context.under13Open,
        cameraSensingEnabled: false,
      },
    );
    await tx.query(`UPDATE auth_tokens SET used_at = now(), account_id = $2 WHERE id = $1`, [
      row.id,
      accountId,
    ]);
    return { accountId, teen, session };
  });

  if (accepted.session) onAccountEvent('signup', { accountId: accepted.accountId });
  onAccountEvent('profile_created', { accountId: accepted.accountId, learnerId: accepted.teen.id });
  onAccountEvent('consent_recorded', {
    accountId: accepted.accountId,
    learnerId: accepted.teen.id,
  });
  return accepted;
}
