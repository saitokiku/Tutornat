/**
 * POST /api/tutor/auth/teen-sign-in (wire TeenSignInRequest →
 * TeenSignInResponse). A 13–17 profile signs in with its own login name under
 * the parent's account: role `learner`, its profile preselected, and it sees
 * no other learner (spec R5, docs/STRATEGY-INTEGRATION.md).
 */
import { isTutorMode } from '@/kaizen.config';
import { apiSuccess } from '@/lib/server/api-response';
import {
  accountsErrorResponse,
  buildSessionState,
  openDb,
  parseJsonBody,
  teenSignIn,
  teenSignInSchema,
  withSetCookie,
} from '@/lib/tutor/accounts';
import { notFoundResponse, unauthorized } from '@/lib/tutor/auth/principal';
import { sessionCookieHeader } from '@/lib/tutor/auth/session';
import type { TeenSignInResponse } from '@/lib/tutor/wire';

export async function POST(request: Request) {
  if (!isTutorMode()) return notFoundResponse();
  const body = await parseJsonBody(request, teenSignInSchema);
  if (!body.ok) return body.response;
  const opened = await openDb('sign you in');
  if (!opened.ok) return opened.response;
  try {
    const outcome = await teenSignIn(opened.db, body.data);
    const state = await buildSessionState(opened.db, outcome.principal);
    if (!state) return unauthorized();
    const payload: TeenSignInResponse = state;
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
