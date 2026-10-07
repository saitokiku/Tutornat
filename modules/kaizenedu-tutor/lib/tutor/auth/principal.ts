/**
 * Server-derived identity for every product route (invariant a; spec R6).
 * Never trusts a client-supplied id: the account and learner come from the
 * session row that the cookie's token hash resolves to, and the learner is
 * re-checked to belong to that account.
 */
import { NextResponse } from 'next/server';

import type { AgeBand } from '@/kaizen.config';
import { isStaffEmail, isTutorMode } from '@/kaizen.config';
import type { Principal } from '@/lib/tutor/contracts';
import { DbNotConfiguredError, getTutorDb, isDbConfigured, type Queryable } from '@/lib/tutor/db';
import { PREVIEW_ACCOUNT_ID, PREVIEW_LEARNER_ID } from '@/lib/tutor/preview/fixture';

// KAIZEN: applies the build-time non-secret defaults (TUTOR_MODE,
// TUTOR_STAFF_EMAILS) before any product route resolves an identity. Every
// product route goes through this module, so importing it here is what makes
// the staff allowlist reliable on a host that was configured with nothing.
import '@/lib/server/runtime-config.generated';

import { readAuthSession, readCookie, SESSION_COOKIE } from './session';

interface LearnerRow extends Record<string, unknown> {
  id: string;
  account_id: string;
  age_band: AgeBand;
  status: string;
}

export async function resolvePrincipal(
  headers: Headers,
  db?: Queryable,
): Promise<Principal | null> {
  const token = readCookie(headers, SESSION_COOKIE);
  if (!token) return null;
  const queryable = db ?? (await getTutorDb());
  const session = await readAuthSession(queryable, token);
  if (!session) return null;
  let band: AgeBand | null = null;
  let learnerId: string | null = null;
  if (session.learner_id) {
    const { rows } = await queryable.query<LearnerRow>(
      `SELECT id, account_id, age_band, status FROM learners WHERE id = $1 AND account_id = $2`,
      [session.learner_id, session.account_id],
    );
    const learner = rows[0];
    if (learner && learner.status !== 'frozen') {
      learnerId = learner.id;
      band = learner.age_band;
    }
  }
  return {
    accountId: session.account_id,
    learnerId,
    role: session.role,
    band,
    authSessionId: session.id,
    // Decided from the account row the session already resolved to, against a
    // server-side allowlist. Nothing the request carries can set it.
    staff: isStaffEmail(session.email),
    // A guest is never staff: the placeholder address is not on any allowlist.
    guest: Boolean(session.guest),
  };
}

export type PrincipalResult =
  | { ok: true; principal: Principal }
  | { ok: false; response: NextResponse };

export function unauthorized(message = 'Sign in required'): NextResponse {
  return NextResponse.json(
    { success: false, errorCode: 'UNAUTHENTICATED', error: message },
    { status: 401 },
  );
}

function forbidden(): NextResponse {
  return NextResponse.json(
    { success: false, errorCode: 'FORBIDDEN', error: 'Not allowed for this role' },
    { status: 403 },
  );
}

/**
 * The stand-in identity for preview mode. The sample account holds one child
 * profile, so a parent-scoped route sees the parent and a learner-scoped one
 * sees that child.
 */
function previewPrincipalFor(roles: Principal['role'][] | undefined): Principal {
  const wantsLearner = roles?.length === 1 && roles[0] === 'learner';
  return {
    accountId: PREVIEW_ACCOUNT_ID,
    learnerId: PREVIEW_LEARNER_ID,
    role: wantsLearner ? 'learner' : 'parent',
    band: '9-12',
    authSessionId: 'sess_preview',
    // The sample identity is never staff: preview mode refuses every write
    // anyway, and a fake account with raised ceilings would be a strange thing
    // to hand a visitor.
    staff: false,
    guest: false,
  };
}

export function notFoundResponse(): NextResponse {
  return NextResponse.json(
    { success: false, errorCode: 'NOT_FOUND', error: 'Not found' },
    { status: 404 },
  );
}

/**
 * The one refusal every route gives when there is no database. In preview
 * mode it says so in the reader's terms — a visitor clicking sign up is not
 * helped by being told to set an environment variable — while still naming
 * the variable for whoever is running the deployment.
 */
export function dbNotConfiguredResponse(action = 'do that'): NextResponse {
  const preview = isTutorMode() && !isDbConfigured();
  return NextResponse.json(
    {
      success: false,
      errorCode: preview ? 'PREVIEW_READ_ONLY' : 'DB_NOT_CONFIGURED',
      error: preview
        ? `This is a preview with sample data, so it cannot ${action}. Set DATABASE_URL to run for real.`
        : 'The product database is not configured yet. Set DATABASE_URL.',
    },
    { status: 503 },
  );
}

/**
 * Use at the top of every product route. Answers 404 when TUTOR_MODE is off,
 * 503 when the database is not configured, 401 when there is no valid session,
 * and 403 when a learner is required but none is selected.
 */
export async function requirePrincipal(
  request: Request,
  options: { learner?: boolean; role?: Principal['role'][] } = {},
): Promise<PrincipalResult> {
  if (!isTutorMode()) return { ok: false, response: notFoundResponse() };
  // Preview mode: with no database there is no account to sign in to, and no
  // real learner's data to protect, so the sample principal stands in and the
  // screens render their fixtures. This can never widen access to real rows:
  // the mode is derived from DATABASE_URL being absent, so the moment a
  // database exists this branch is dead and every caller must authenticate.
  if (!isDbConfigured()) {
    const principal = previewPrincipalFor(options.role);
    if (options.role && !options.role.includes(principal.role)) {
      return { ok: false, response: forbidden() };
    }
    return { ok: true, principal };
  }
  try {
    const principal = await resolvePrincipal(request.headers);
    if (!principal) return { ok: false, response: unauthorized() };
    if (options.role && !options.role.includes(principal.role)) {
      return { ok: false, response: forbidden() };
    }
    if (options.learner && !principal.learnerId) {
      return {
        ok: false,
        response: NextResponse.json(
          { success: false, errorCode: 'NO_LEARNER', error: 'Choose a learner first' },
          { status: 403 },
        ),
      };
    }
    return { ok: true, principal };
  } catch (error) {
    if (error instanceof DbNotConfiguredError)
      return { ok: false, response: dbNotConfiguredResponse() };
    throw error;
  }
}
