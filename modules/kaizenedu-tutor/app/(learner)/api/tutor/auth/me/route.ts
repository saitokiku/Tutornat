/** GET /api/tutor/auth/me (wire MeResponse): the session state, 401 without a session. */
import { apiSuccess } from '@/lib/server/api-response';
import { buildSessionState } from '@/lib/tutor/accounts';
import { requirePrincipal, unauthorized } from '@/lib/tutor/auth/principal';
import { getTutorDb } from '@/lib/tutor/db';
import { isPreviewMode, previewLearner, previewLearners } from '@/lib/tutor/preview';
import type { MeResponse } from '@/lib/tutor/wire';

export async function GET(request: Request) {
  const auth = await requirePrincipal(request);
  if (!auth.ok) return auth.response;
  if (isPreviewMode()) {
    return apiSuccess({
      account: {
        id: auth.principal.accountId,
        email: 'sample@preview.invalid',
        displayName: 'Sample parent',
      },
      principal: {
        learnerId: auth.principal.learnerId,
        role: auth.principal.role,
        band: auth.principal.band,
      },
      learners: previewLearners,
      learner: previewLearner,
    });
  }
  const db = await getTutorDb();
  const state = await buildSessionState(db, auth.principal);
  if (!state) return unauthorized();
  const payload: MeResponse = state;
  return apiSuccess({ ...payload });
}
