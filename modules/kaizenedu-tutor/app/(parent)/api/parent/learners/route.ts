/**
 * /api/parent/learners: the account holder's learner profiles (spec R5, D4,
 * D5). GET lists them with the under-13 gate state; POST creates one from a
 * birth year (teens get their own login, children start locked while the gate
 * is shut); PATCH renames or resets a teen's login; DELETE files a deletion
 * request and freezes the profile at once. Every query is account-scoped.
 */
import { apiSuccess } from '@/lib/server/api-response';
import {
  accountsErrorResponse,
  createLearner,
  createLearnerSchema,
  deleteLearnerSchema,
  listLearners,
  onAccountEvent,
  parseJsonBody,
  requestLearnerDeletion,
  updateLearner,
  updateLearnerSchema,
} from '@/lib/tutor/accounts';
import { requirePrincipal } from '@/lib/tutor/auth/principal';
import { isPreviewMode, previewReadOnlyResponse, previewLearners } from '@/lib/tutor/preview';
import { getTutorDb } from '@/lib/tutor/db';
import { getAppSetting } from '@/lib/tutor/settings';
import type {
  CreateLearnerResponse,
  DeleteLearnerResponse,
  ListLearnersResponse,
  UpdateLearnerResponse,
} from '@/lib/tutor/wire';

export async function GET(request: Request) {
  const auth = await requirePrincipal(request, { role: ['parent', 'adult'] });
  if (!auth.ok) return auth.response;
  if (isPreviewMode()) {
    return apiSuccess({ learners: previewLearners, under13Open: false });
  }
  const db = await getTutorDb();
  const payload: ListLearnersResponse = {
    learners: await listLearners(db, auth.principal.accountId),
    under13Open: await getAppSetting(db, 'under13_gate'),
  };
  return apiSuccess({ ...payload });
}

export async function POST(request: Request) {
  const auth = await requirePrincipal(request, { role: ['parent', 'adult'] });
  if (!auth.ok) return auth.response;
  if (isPreviewMode()) return previewReadOnlyResponse('add a learner');
  const body = await parseJsonBody(request, createLearnerSchema);
  if (!body.ok) return body.response;
  const db = await getTutorDb();
  try {
    const learner = await createLearner(db, auth.principal.accountId, body.data, {
      under13Open: await getAppSetting(db, 'under13_gate'),
      staff: auth.principal.staff,
    });
    onAccountEvent('profile_created', {
      accountId: auth.principal.accountId,
      learnerId: learner.id,
    });
    const payload: CreateLearnerResponse = { learner, locked: learner.status === 'locked' };
    return apiSuccess({ ...payload }, 201);
  } catch (error) {
    const refused = accountsErrorResponse(error);
    if (refused) return refused;
    throw error;
  }
}

export async function PATCH(request: Request) {
  const auth = await requirePrincipal(request, { role: ['parent', 'adult'] });
  if (!auth.ok) return auth.response;
  if (isPreviewMode()) return previewReadOnlyResponse('change a learner');
  const body = await parseJsonBody(request, updateLearnerSchema);
  if (!body.ok) return body.response;
  const db = await getTutorDb();
  try {
    const { learnerId, ...patch } = body.data;
    const learner = await updateLearner(db, auth.principal.accountId, learnerId, patch);
    const payload: UpdateLearnerResponse = { learner };
    return apiSuccess({ ...payload });
  } catch (error) {
    const refused = accountsErrorResponse(error);
    if (refused) return refused;
    throw error;
  }
}

export async function DELETE(request: Request) {
  const auth = await requirePrincipal(request, { role: ['parent', 'adult'] });
  if (!auth.ok) return auth.response;
  if (isPreviewMode()) return previewReadOnlyResponse('delete a learner');
  const body = await parseJsonBody(request, deleteLearnerSchema);
  if (!body.ok) return body.response;
  const db = await getTutorDb();
  try {
    const filed = await requestLearnerDeletion(db, auth.principal.accountId, body.data.learnerId);
    const payload: DeleteLearnerResponse = {
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
