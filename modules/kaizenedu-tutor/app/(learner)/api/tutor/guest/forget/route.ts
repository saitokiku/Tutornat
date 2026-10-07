/**
 * POST /api/tutor/guest/forget (wire GuestForgetResponse). "Start over":
 * deletes every row behind the caller's guest account now and clears the
 * cookie. A signed-in account (not a guest) is refused with 403; its deletion
 * right runs through the parent data page and its 30-day window.
 */
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { withSetCookie } from '@/lib/tutor/accounts';
import { dbNotConfiguredResponse, requirePrincipal } from '@/lib/tutor/auth/principal';
import { clearSessionCookieHeader } from '@/lib/tutor/auth/session';
import { DbNotConfiguredError, getTutorDb } from '@/lib/tutor/db';
import { reportError } from '@/lib/tutor/errors';
import { forgetGuest } from '@/lib/tutor/guest';
import { isPreviewMode, previewReadOnlyResponse } from '@/lib/tutor/preview';
import type { GuestForgetResponse } from '@/lib/tutor/wire';

const ROUTE = '/api/tutor/guest/forget';

export async function POST(request: Request) {
  const auth = await requirePrincipal(request);
  if (!auth.ok) return auth.response;
  if (isPreviewMode()) return previewReadOnlyResponse('start over');
  const { principal } = auth;
  if (!principal.guest) {
    return apiError('FORBIDDEN', 403, 'Only a guest can start over here.');
  }
  try {
    const db = await getTutorDb();
    const deleted = await forgetGuest(db, principal.accountId);
    const payload: GuestForgetResponse = { deleted };
    return withSetCookie(apiSuccess({ ...payload }), clearSessionCookieHeader());
  } catch (error) {
    if (error instanceof DbNotConfiguredError) return dbNotConfiguredResponse();
    await reportError(error, {
      accountId: principal.accountId,
      route: ROUTE,
      code: 'guest_forget_failed',
    });
    return apiError('INTERNAL_ERROR', 500, 'Could not start over. Try again.');
  }
}
