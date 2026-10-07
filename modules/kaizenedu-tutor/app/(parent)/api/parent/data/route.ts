/**
 * /api/parent/data: the parental data rights (spec §11.2 item 4, R16, D11).
 * GET ?learnerId= exports every row the product holds for the learner; POST
 * files a deletion request for one learner (`learnerId`) or the whole
 * account (`learnerId: null`): profiles freeze at once, the account's other
 * sign-ins are destroyed, and the job completes the deletion after the window.
 */
import { apiSuccess } from '@/lib/server/api-response';
import {
  accountsErrorResponse,
  dataDeleteSchema,
  exportLearnerData,
  missingQueryParam,
  parseJsonBody,
  queryParam,
  requestAccountDeletion,
  requestLearnerDeletion,
} from '@/lib/tutor/accounts';
import { requirePrincipal } from '@/lib/tutor/auth/principal';
import { isPreviewMode, previewReadOnlyResponse } from '@/lib/tutor/preview';
import { getTutorDb } from '@/lib/tutor/db';
import type { DataDeleteResponse, DataExportResponse } from '@/lib/tutor/wire';

export async function GET(request: Request) {
  const auth = await requirePrincipal(request, { role: ['parent', 'adult'] });
  if (!auth.ok) return auth.response;
  const learnerId = queryParam(request, 'learnerId');
  if (!learnerId) return missingQueryParam('learnerId');
  const db = await getTutorDb();
  try {
    const payload: DataExportResponse = await exportLearnerData(
      db,
      auth.principal.accountId,
      learnerId,
    );
    return apiSuccess({ ...payload });
  } catch (error) {
    const refused = accountsErrorResponse(error);
    if (refused) return refused;
    throw error;
  }
}

export async function POST(request: Request) {
  const auth = await requirePrincipal(request, { role: ['parent', 'adult'] });
  if (!auth.ok) return auth.response;
  if (isPreviewMode()) return previewReadOnlyResponse('delete your data');
  const body = await parseJsonBody(request, dataDeleteSchema);
  if (!body.ok) return body.response;
  const db = await getTutorDb();
  const { accountId, authSessionId } = auth.principal;
  try {
    const filed = body.data.learnerId
      ? await requestLearnerDeletion(db, accountId, body.data.learnerId)
      : await requestAccountDeletion(db, accountId, authSessionId);
    const payload: DataDeleteResponse = {
      deletionRequestId: filed.id,
      completesBy: filed.completesBy,
    };
    return apiSuccess({ ...payload });
  } catch (error) {
    const refused = accountsErrorResponse(error);
    if (refused) return refused;
    throw error;
  }
}
