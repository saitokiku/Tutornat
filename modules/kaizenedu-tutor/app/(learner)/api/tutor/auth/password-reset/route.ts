/**
 * POST /api/tutor/auth/password-reset (wire ResetPasswordRequest →
 * ResetPasswordResponse, 200). Consumes the link's token, replaces the
 * password, closes every other session of the account, and sets a fresh
 * session cookie; 400 INVALID_TOKEN when the link is expired, used, or
 * unknown. Runs before any session exists, so it applies the TUTOR_MODE and
 * database gates itself instead of through requirePrincipal.
 */
import { isTutorMode } from '@/kaizen.config';
import { apiSuccess } from '@/lib/server/api-response';
import {
  accountsErrorResponse,
  buildSessionState,
  openDb,
  parseJsonBody,
  resetPassword,
  resetPasswordSchema,
  withSetCookie,
} from '@/lib/tutor/accounts';
import { notFoundResponse, unauthorized } from '@/lib/tutor/auth/principal';
import { sessionCookieHeader } from '@/lib/tutor/auth/session';
import type { ResetPasswordResponse } from '@/lib/tutor/wire';

export async function POST(request: Request) {
  if (!isTutorMode()) return notFoundResponse();
  const body = await parseJsonBody(request, resetPasswordSchema);
  if (!body.ok) return body.response;
  const opened = await openDb('reset a password');
  if (!opened.ok) return opened.response;
  try {
    const outcome = await resetPassword(opened.db, body.data);
    const state = await buildSessionState(opened.db, outcome.principal);
    if (!state) return unauthorized();
    const payload: ResetPasswordResponse = state;
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
