/**
 * POST /api/tutor/auth/sign-out: destroys the session row and clears the
 * cookie. A request whose cookie no longer resolves still gets the cookie
 * cleared alongside the 401, so a stale browser recovers on its own.
 */
import { apiSuccess } from '@/lib/server/api-response';
import { withSetCookie } from '@/lib/tutor/accounts';
import { requirePrincipal } from '@/lib/tutor/auth/principal';
import {
  clearSessionCookieHeader,
  destroyAuthSession,
  readCookie,
  SESSION_COOKIE,
} from '@/lib/tutor/auth/session';
import { getTutorDb } from '@/lib/tutor/db';

export async function POST(request: Request) {
  const auth = await requirePrincipal(request);
  if (!auth.ok) {
    return auth.response.status === 401
      ? withSetCookie(auth.response, clearSessionCookieHeader())
      : auth.response;
  }
  const token = readCookie(request.headers, SESSION_COOKIE);
  if (token) await destroyAuthSession(await getTutorDb(), token);
  return withSetCookie(apiSuccess({}), clearSessionCookieHeader());
}
