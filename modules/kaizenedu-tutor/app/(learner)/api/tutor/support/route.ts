/**
 * POST /api/tutor/support (wire SupportRequest → SupportResponse, 201): the
 * support inbox. Works signed out, because the funnel's first stranger has no
 * account yet, and attaches the account when a session cookie is present;
 * 429 past the throttle; 503 without a database. The body's email is a reply
 * address, not an identity: nothing is looked up by it.
 */
import { isTutorMode } from '@/kaizen.config';
import { apiSuccess } from '@/lib/server/api-response';
import { accountsErrorResponse, openDb, parseJsonBody } from '@/lib/tutor/accounts';
import { notFoundResponse, resolvePrincipal } from '@/lib/tutor/auth/principal';
import { submitSupportRequest, supportRequestSchema } from '@/lib/tutor/support';
import type { SupportResponse } from '@/lib/tutor/wire';

/** The caller's network address as the platform reports it; null when it does not. */
function callerKey(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip')?.trim() || null;
}

export async function POST(request: Request) {
  if (!isTutorMode()) return notFoundResponse();
  const body = await parseJsonBody(request, supportRequestSchema);
  if (!body.ok) return body.response;
  const opened = await openDb('send a message');
  if (!opened.ok) return opened.response;
  try {
    const principal = await resolvePrincipal(request.headers, opened.db);
    const payload: SupportResponse = await submitSupportRequest(opened.db, body.data, {
      principal,
      callerKey: callerKey(request),
      userAgent: request.headers.get('user-agent'),
    });
    return apiSuccess({ ...payload }, 201);
  } catch (error) {
    const refused = accountsErrorResponse(error);
    if (refused) return refused;
    throw error;
  }
}
