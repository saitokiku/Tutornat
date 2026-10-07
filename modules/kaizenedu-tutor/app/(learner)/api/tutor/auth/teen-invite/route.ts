/**
 * POST /api/tutor/auth/teen-invite (wire TeenInviteRequest →
 * TeenInviteResponse, 200). A 13-to-17-year-old starts sign-up; the parent's
 * address gets the link that finishes it (reference §3, D30). 403 with the
 * neutral sentence for any other band, 409 for a held login name, 429 past
 * the throttle. Runs before any session exists, so it applies the TUTOR_MODE
 * and database gates itself instead of through requirePrincipal.
 */
import { isTutorMode } from '@/kaizen.config';
import { apiSuccess } from '@/lib/server/api-response';
import {
  accountsErrorResponse,
  openDb,
  parseJsonBody,
  requestTeenInvite,
  teenInviteSchema,
} from '@/lib/tutor/accounts';
import { resolveAppUrl } from '@/lib/tutor/app-url';
import { notFoundResponse } from '@/lib/tutor/auth/principal';
import type { TeenInviteResponse } from '@/lib/tutor/wire';

/** The caller's network address as the platform reports it; null when it does not. */
function callerKey(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip')?.trim() || null;
}

export async function POST(request: Request) {
  if (!isTutorMode()) return notFoundResponse();
  const body = await parseJsonBody(request, teenInviteSchema);
  if (!body.ok) return body.response;
  const opened = await openDb('start signing up');
  if (!opened.ok) return opened.response;
  try {
    const payload: TeenInviteResponse = await requestTeenInvite(opened.db, body.data, {
      baseUrl: resolveAppUrl(request),
      callerKey: callerKey(request),
    });
    return apiSuccess({ ...payload });
  } catch (error) {
    const refused = accountsErrorResponse(error);
    if (refused) return refused;
    throw error;
  }
}
