/**
 * POST /api/tutor/auth/sign-in (wire SignInRequest → SignInResponse). The
 * account holder's sign-in; verification runs the same scrypt work for an
 * unknown email, and ten failures per email per fifteen minutes answer 429.
 */
import { isTutorMode } from '@/kaizen.config';
import { apiSuccess } from '@/lib/server/api-response';
import {
  accountsErrorResponse,
  buildSessionState,
  openDb,
  parseJsonBody,
  signIn,
  signInSchema,
  withSetCookie,
} from '@/lib/tutor/accounts';
import { notFoundResponse, unauthorized } from '@/lib/tutor/auth/principal';
import { sessionCookieHeader } from '@/lib/tutor/auth/session';
import type { SignInResponse } from '@/lib/tutor/wire';

export async function POST(request: Request) {
  if (!isTutorMode()) return notFoundResponse();
  const body = await parseJsonBody(request, signInSchema);
  if (!body.ok) return body.response;
  const opened = await openDb('sign you in');
  if (!opened.ok) return opened.response;
  try {
    const outcome = await signIn(opened.db, body.data);
    const state = await buildSessionState(opened.db, outcome.principal);
    if (!state) return unauthorized();
    const payload: SignInResponse = state;
    return withSetCookie(
      apiSuccess({ ...payload }),
      sessionCookieHeader(outcome.token, outcome.expiresAt),
    );
  } catch (error) {
    const refused = accountsErrorResponse(error);
    if (refused) return refused;
    throw error;
  }
}
