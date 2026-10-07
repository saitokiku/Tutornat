/**
 * GET /api/parent/report?learnerId= (wire ReportResponse): the §5.9 parent
 * report for one of the account's learners; 404 for any other learner id.
 */
import { apiSuccess } from '@/lib/server/api-response';
import {
  accountsErrorResponse,
  missingQueryParam,
  queryParam,
  requireLearner,
} from '@/lib/tutor/accounts';
import { requirePrincipal } from '@/lib/tutor/auth/principal';
import { isPreviewMode, previewReport } from '@/lib/tutor/preview';
import { getTutorDb } from '@/lib/tutor/db';
import { buildParentReport, GENERATED_LABEL } from '@/lib/tutor/report';
import type { ReportResponse } from '@/lib/tutor/wire';

export async function GET(request: Request) {
  const auth = await requirePrincipal(request, { role: ['parent', 'adult'] });
  if (!auth.ok) return auth.response;
  if (isPreviewMode()) {
    return apiSuccess({ report: previewReport, generatedLabel: GENERATED_LABEL });
  }
  const learnerId = queryParam(request, 'learnerId');
  if (!learnerId) return missingQueryParam('learnerId');
  const db = await getTutorDb();
  try {
    await requireLearner(db, auth.principal.accountId, learnerId);
    const payload: ReportResponse = {
      report: await buildParentReport(db, auth.principal.accountId, learnerId),
      generatedLabel: GENERATED_LABEL,
    };
    return apiSuccess({ ...payload });
  } catch (error) {
    const refused = accountsErrorResponse(error);
    if (refused) return refused;
    throw error;
  }
}
