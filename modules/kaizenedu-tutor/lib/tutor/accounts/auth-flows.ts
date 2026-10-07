/**
 * Sign-up, sign-in, and teen sign-in (spec R5, R10, D4, D18). Each returns
 * the principal plus the cookie token; the route sets the cookie. Under-18
 * self-signup is refused with a neutral message that echoes no age (§11.2
 * item 1: neutral age screen, no nudging) and writes nothing.
 */
import { ageBandForBirthYear, isStaffEmail } from '@/kaizen.config';
import { createAuthSession } from '@/lib/tutor/auth/session';
import { getSubscription } from '@/lib/tutor/billing';
import type { Learner, Principal, Role } from '@/lib/tutor/contracts';
import type { Queryable, TutorDb } from '@/lib/tutor/db';
import type { SignInRequest, SignUpRequest, TeenSignInRequest } from '@/lib/tutor/wire';

import { createAccount, normalizeEmail, verifyAccountCredentials } from './accounts';
import { AccountsError } from './errors';
import { onAccountEvent } from './events';
import { createLearner, listLearners, normalizeLoginName, verifyTeenCredentials } from './learners';
import { clearSignInFailures, recordSignInFailure, signInThrottle } from './throttle';

export interface AuthOutcome {
  principal: Principal;
  token: string;
  expiresAt: Date;
}

export const UNDER_18_SIGNUP_MESSAGE =
  'Accounts are created by an adult. A parent or guardian can sign up and add you as a learner with your own sign-in.';

export async function signUp(
  db: TutorDb,
  input: SignUpRequest,
  now = new Date(),
): Promise<AuthOutcome> {
  if (input.kind === 'adult') {
    if (input.birthYear === undefined) {
      throw new AccountsError('MISSING_REQUIRED_FIELD', 400, 'Birth year is required.');
    }
    if (ageBandForBirthYear(input.birthYear, now) !== 'adult') {
      throw new AccountsError('FORBIDDEN', 403, UNDER_18_SIGNUP_MESSAGE);
    }
  }
  const outcome = await db.withTransaction(async (tx) => {
    const account = await createAccount(tx, input);
    await getSubscription(tx, account.id);
    let learner: Learner | null = null;
    if (input.kind === 'adult') {
      learner = await createLearner(
        tx,
        account.id,
        { displayName: input.displayName, birthYear: input.birthYear! },
        { under13Open: false, now },
      );
    }
    const role: Role = input.kind === 'adult' ? 'adult' : 'parent';
    const session = await createAuthSession(tx, {
      accountId: account.id,
      learnerId: learner?.id ?? null,
      role,
    });
    const principal: Principal = {
      accountId: account.id,
      learnerId: learner?.id ?? null,
      role,
      band: learner?.band ?? null,
      authSessionId: session.sessionId,
      staff: isStaffEmail(account.email),
      guest: false,
    };
    return { principal, token: session.token, expiresAt: session.expiresAt };
  });
  onAccountEvent('signup', { accountId: outcome.principal.accountId });
  if (outcome.principal.learnerId) {
    onAccountEvent('profile_created', {
      accountId: outcome.principal.accountId,
      learnerId: outcome.principal.learnerId,
    });
  }
  return outcome;
}

/**
 * The account holder's role comes from the profiles: an account whose profiles
 * are all adults (`self`) is an adult learner's own account and signs in with
 * that profile selected; any account with a child or teen profile is a parent
 * account and starts with no learner selected. (A `kind` column on `accounts`
 * would make this explicit; the schema is frozen for this slice.)
 */
export function deriveSignInRole(learners: Learner[]): { role: Role; learner: Learner | null } {
  const selves = learners.filter((learner) => learner.kind === 'self');
  const minors = learners.some((learner) => learner.kind !== 'self');
  if (selves.length > 0 && !minors) {
    return {
      role: 'adult',
      learner: selves.find((learner) => learner.status === 'active') ?? null,
    };
  }
  return { role: 'parent', learner: null };
}

function throttled(key: string, now: Date): void {
  const decision = signInThrottle(key, now.getTime());
  if (decision.allowed) return;
  const minutes = Math.max(1, Math.ceil(decision.retryAfterSeconds / 60));
  throw new AccountsError(
    'RATE_LIMITED',
    429,
    `Too many sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
    { 'retry-after': String(decision.retryAfterSeconds) },
  );
}

export async function signIn(
  db: Queryable,
  input: SignInRequest,
  now = new Date(),
): Promise<AuthOutcome> {
  const key = `email:${normalizeEmail(input.email)}`;
  throttled(key, now);
  const account = await verifyAccountCredentials(db, input.email, input.password);
  if (!account) {
    recordSignInFailure(key, now.getTime());
    throw new AccountsError('INVALID_CREDENTIALS', 401, 'Email or password is incorrect.');
  }
  clearSignInFailures(key);
  const { role, learner } = deriveSignInRole(await listLearners(db, account.id));
  const session = await createAuthSession(db, {
    accountId: account.id,
    learnerId: learner?.id ?? null,
    role,
  });
  return {
    principal: {
      accountId: account.id,
      learnerId: learner?.id ?? null,
      role,
      band: learner?.band ?? null,
      authSessionId: session.sessionId,
      staff: isStaffEmail(account.email),
      guest: false,
    },
    token: session.token,
    expiresAt: session.expiresAt,
  };
}

/** The account's email, for the staff allowlist check on a teen sign-in. */
async function accountEmail(db: Queryable, accountId: string): Promise<string | null> {
  const { rows } = await db.query<{ email: string }>(`SELECT email FROM accounts WHERE id = $1`, [
    accountId,
  ]);
  return rows[0]?.email ?? null;
}

export async function teenSignIn(
  db: Queryable,
  input: TeenSignInRequest,
  now = new Date(),
): Promise<AuthOutcome> {
  const loginName = normalizeLoginName(input.loginName);
  const key = `teen:${loginName}`;
  throttled(key, now);
  const row = await verifyTeenCredentials(db, loginName, input.password);
  if (!row) {
    recordSignInFailure(key, now.getTime());
    throw new AccountsError('INVALID_CREDENTIALS', 401, 'Login name or password is incorrect.');
  }
  clearSignInFailures(key);
  if (row.status !== 'active') {
    throw new AccountsError(
      'LEARNER_FROZEN',
      403,
      'This profile is paused. Ask your parent to check the account settings.',
    );
  }
  const session = await createAuthSession(db, {
    accountId: row.account_id,
    learnerId: row.id,
    role: 'learner',
  });
  return {
    principal: {
      accountId: row.account_id,
      learnerId: row.id,
      role: 'learner',
      band: row.age_band,
      authSessionId: session.sessionId,
      // Staff is an account property, and a teen profile signs in under its
      // parent account: the address that decides it is the account's, not one
      // the teen row carries.
      staff: isStaffEmail(await accountEmail(db, row.account_id)),
      guest: false,
    },
    token: session.token,
    expiresAt: session.expiresAt,
  };
}
