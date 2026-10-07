/**
 * POST /api/tutor/wrap (wire WrapRequest → WrapResponse; spec §5.2 WRAP, §5.5,
 * §5.9). Ends the session: writes its summary, regenerates the learner profile,
 * settles the remaining minutes, and files the `session` evidence row. Wrapping
 * a session that is already wrapped answers the stored summary.
 */
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { dbNotConfiguredResponse, requirePrincipal } from '@/lib/tutor/auth/principal';
import { isPreviewMode, previewReadOnlyResponse } from '@/lib/tutor/preview';
import { DbNotConfiguredError, getTutorDb } from '@/lib/tutor/db';
import { reportError } from '@/lib/tutor/errors';
import { enforceRateLimits } from '@/lib/tutor/guards';
import type { WrapResponse } from '@/lib/tutor/wire';
import { wrapSession } from '@/lib/tutor/wrap';

const log = createLogger('tutor-wrap-route');
const ROUTE = '/api/tutor/wrap';
const ID = /^[A-Za-z0-9_-]{1,64}$/;

/** The model and the voice providers can take a while; vercel.json's pattern covers only upstream's api directory. */
export const maxDuration = 300;

export async function POST(request: Request) {
  const auth = await requirePrincipal(request, { learner: true });
  if (!auth.ok) return auth.response;
  if (isPreviewMode()) return previewReadOnlyResponse('finish a session');
  const { principal } = auth;

  let sessionId: string | null = null;
  try {
    const parsed: unknown = await request.json();
    const raw = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
    sessionId = typeof raw.sessionId === 'string' && ID.test(raw.sessionId) ? raw.sessionId : null;
  } catch {
    return apiError('INVALID_REQUEST', 400, 'The request body must be JSON.');
  }
  if (!sessionId) return apiError('MISSING_REQUIRED_FIELD', 400, 'sessionId is required.');

  try {
    const db = await getTutorDb();
    const limited = await enforceRateLimits(db, principal, 'turn');
    if (limited) return limited;
    const outcome = await wrapSession(db, principal, sessionId);
    if (!outcome.ok) return apiError('NOT_FOUND', 404, outcome.message);
    const payload: WrapResponse = outcome.response;
    log.info(
      `session ${sessionId} wrapped minutes=${payload.session.minutes} checks=${payload.summary.checksCorrect}/${payload.summary.checks}`,
    );
    return apiSuccess({ ...payload });
  } catch (error) {
    if (error instanceof DbNotConfiguredError) return dbNotConfiguredResponse();
    await reportError(error, {
      accountId: principal.accountId,
      learnerId: principal.learnerId,
      sessionId,
      route: ROUTE,
      code: 'wrap_failed',
    });
    return apiError('INTERNAL_ERROR', 500, 'Could not finish that session. Try again.');
  }
}
