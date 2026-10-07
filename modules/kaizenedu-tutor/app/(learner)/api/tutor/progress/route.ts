/**
 * GET /api/tutor/progress (wire ProgressResponse; spec §5.7, R12, D17). The
 * learner's own view of the graph: every skill, their estimates, the open and
 * resolved misconceptions, what comes next, the delayed unassisted checks that
 * are due now, and the session and minute totals.
 *
 * Read-only and scoped to the principal's account and learner (invariant a).
 */
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { dbNotConfiguredResponse, requirePrincipal } from '@/lib/tutor/auth/principal';
import { isPreviewMode, previewProgress } from '@/lib/tutor/preview';
import { DbNotConfiguredError, getTutorDb } from '@/lib/tutor/db';
import { reportError } from '@/lib/tutor/errors';
import { ensureGraphSeeded } from '@/lib/tutor/graph/seed';
import { buildProgress } from '@/lib/tutor/progress';
import type { ProgressResponse } from '@/lib/tutor/wire';

const ROUTE = '/api/tutor/progress';

export async function GET(request: Request) {
  const auth = await requirePrincipal(request, { learner: true });
  if (!auth.ok) return auth.response;
  if (isPreviewMode()) return apiSuccess({ ...previewProgress });
  const { accountId, learnerId } = auth.principal;

  try {
    const db = await getTutorDb();
    await ensureGraphSeeded(db);
    const payload: ProgressResponse = await buildProgress(db, {
      accountId,
      learnerId: learnerId!,
    });
    return apiSuccess({ ...payload });
  } catch (error) {
    if (error instanceof DbNotConfiguredError) return dbNotConfiguredResponse();
    await reportError(error, { accountId, learnerId, route: ROUTE, code: 'progress_failed' });
    return apiError('INTERNAL_ERROR', 500, 'Could not load your progress.');
  }
}
