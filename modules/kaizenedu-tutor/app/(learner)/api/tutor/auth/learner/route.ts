/**
 * POST /api/tutor/auth/learner (wire SelectLearnerRequest →
 * SelectLearnerResponse): the account holder selects the active profile for
 * this session. The profile must belong to the account (404 otherwise, never
 * revealing other accounts' ids) and must be usable: a locked child profile
 * cannot be selected until the under-13 gate opens (R5), a frozen one not at
 * all. A teen's own sign-in cannot switch profiles.
 */
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getLearner, parseJsonBody, selectLearnerSchema } from '@/lib/tutor/accounts';
import { requirePrincipal } from '@/lib/tutor/auth/principal';
import { isPreviewMode, previewReadOnlyResponse } from '@/lib/tutor/preview';
import { setSessionLearner } from '@/lib/tutor/auth/session';
import { getTutorDb } from '@/lib/tutor/db';
import type { SelectLearnerResponse } from '@/lib/tutor/wire';

export async function POST(request: Request) {
  const auth = await requirePrincipal(request, { role: ['parent', 'adult'] });
  if (!auth.ok) return auth.response;
  if (isPreviewMode()) return previewReadOnlyResponse('switch learner');
  const body = await parseJsonBody(request, selectLearnerSchema);
  if (!body.ok) return body.response;
  const db = await getTutorDb();
  const learner = await getLearner(db, auth.principal.accountId, body.data.learnerId);
  if (!learner) return apiError('NOT_FOUND', 404, 'Learner not found');
  if (learner.status === 'locked') {
    return apiError(
      'LEARNER_LOCKED',
      409,
      'This profile is locked until under-13 access opens. It will be ready soon.',
    );
  }
  if (learner.status === 'frozen') {
    return apiError('LEARNER_FROZEN', 409, 'This profile is paused and cannot be selected.');
  }
  await setSessionLearner(db, auth.principal.authSessionId, learner.id, auth.principal.role);
  const payload: SelectLearnerResponse = {
    learner,
    principal: { learnerId: learner.id, role: auth.principal.role, band: learner.band },
  };
  return apiSuccess({ ...payload });
}
