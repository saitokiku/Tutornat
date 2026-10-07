/**
 * GET /api/parent/transcripts?learnerId=&sessionId= (wire TranscriptsResponse):
 * the learner's sessions, newest first (at most 50), and the turns of the
 * requested session. The account holder can read any transcript of their own
 * learners (spec §5.6, R11); anything outside the account is 404.
 */
import { apiSuccess } from '@/lib/server/api-response';
import {
  accountsErrorResponse,
  missingQueryParam,
  notFound,
  queryParam,
  requireLearner,
} from '@/lib/tutor/accounts';
import { requirePrincipal } from '@/lib/tutor/auth/principal';
import { isPreviewMode, previewSessions, previewTurns } from '@/lib/tutor/preview';
import { getTutorDb } from '@/lib/tutor/db';
import { getLearnerSession, listLearnerSessions, listSessionTurns } from '@/lib/tutor/report';
import type { TranscriptsResponse } from '@/lib/tutor/wire';

export async function GET(request: Request) {
  const auth = await requirePrincipal(request, { role: ['parent', 'adult'] });
  if (!auth.ok) return auth.response;
  if (isPreviewMode()) {
    const wanted = queryParam(request, 'sessionId');
    return apiSuccess({
      sessions: previewSessions,
      turns: wanted ? previewTurns.filter((turn) => turn.sessionId === wanted) : null,
    });
  }
  const learnerId = queryParam(request, 'learnerId');
  if (!learnerId) return missingQueryParam('learnerId');
  const sessionId = queryParam(request, 'sessionId');
  const db = await getTutorDb();
  const { accountId } = auth.principal;
  try {
    await requireLearner(db, accountId, learnerId);
    const sessions = await listLearnerSessions(db, accountId, learnerId);
    let turns: TranscriptsResponse['turns'] = null;
    if (sessionId) {
      const session = await getLearnerSession(db, accountId, learnerId, sessionId);
      if (!session) throw notFound('Session not found');
      turns = await listSessionTurns(db, accountId, session.id);
    }
    const payload: TranscriptsResponse = { sessions, turns };
    return apiSuccess({ ...payload });
  } catch (error) {
    const refused = accountsErrorResponse(error);
    if (refused) return refused;
    throw error;
  }
}
