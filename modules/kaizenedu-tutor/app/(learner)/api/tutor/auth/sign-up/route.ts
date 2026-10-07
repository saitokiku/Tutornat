/**
 * POST /api/tutor/auth/sign-up (wire SignUpRequest → SignUpResponse, 201).
 * A parent account, or an adult learner's own account with its `self`
 * profile selected. Runs before any session exists, so it applies the
 * TUTOR_MODE and database gates itself instead of through requirePrincipal.
 */
import { isTutorMode } from '@/kaizen.config';
import { apiSuccess } from '@/lib/server/api-response';
import {
  accountsErrorResponse,
  buildSessionState,
  openDb,
  parseJsonBody,
  signUp,
  signUpSchema,
  withSetCookie,
} from '@/lib/tutor/accounts';
import { notFoundResponse, unauthorized } from '@/lib/tutor/auth/principal';
import { sessionCookieHeader } from '@/lib/tutor/auth/session';
import type { SignUpResponse } from '@/lib/tutor/wire';

export async function POST(request: Request) {
  if (!isTutorMode()) return notFoundResponse();
  const body = await parseJsonBody(request, signUpSchema);
  if (!body.ok) return body.response;
  const opened = await openDb('create an account');
  if (!opened.ok) return opened.response;
  try {
    const outcome = await signUp(opened.db, body.data);
    const state = await buildSessionState(opened.db, outcome.principal);
    if (!state) return unauthorized();
    const payload: SignUpResponse = state;
    return withSetCookie(
      apiSuccess({ ...payload }, 201),
      sessionCookieHeader(outcome.token, outcome.expiresAt),
    );
  } catch (error) {
    const refused = accountsErrorResponse(error);
    if (refused) return refused;
    throw error;
  }
}
