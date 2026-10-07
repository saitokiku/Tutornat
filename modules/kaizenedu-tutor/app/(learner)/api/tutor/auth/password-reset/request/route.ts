/**
 * POST /api/tutor/auth/password-reset/request (wire RequestPasswordResetRequest
 * → RequestPasswordResetResponse, 200). Always 200 with the same sentence for
 * a known and an unknown address; 429 past the throttle; 503 without a
 * database. Runs before any session exists, so it applies the TUTOR_MODE and
 * database gates itself instead of through requirePrincipal.
 */
import { isTutorMode } from '@/kaizen.config';
import { apiSuccess } from '@/lib/server/api-response';
import {
  accountsErrorResponse,
  openDb,
  parseJsonBody,
  requestPasswordReset,
  requestPasswordResetSchema,
} from '@/lib/tutor/accounts';
import { resolveAppUrl } from '@/lib/tutor/app-url';
import { notFoundResponse } from '@/lib/tutor/auth/principal';
import type { RequestPasswordResetResponse } from '@/lib/tutor/wire';

/** The caller's network address as the platform reports it; null when it does not. */
function callerKey(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip')?.trim() || null;
}

export async function POST(request: Request) {
  if (!isTutorMode()) return notFoundResponse();
  const body = await parseJsonBody(request, requestPasswordResetSchema);
  if (!body.ok) return body.response;
  const opened = await openDb('reset a password');
  if (!opened.ok) return opened.response;
  try {
    const payload: RequestPasswordResetResponse = await requestPasswordReset(opened.db, body.data, {
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
