/**
 * /api/tutor/planner (wire ListPlannerResponse, CreatePlannerItemRequest,
 * UpdatePlannerItemRequest, DeletePlannerItemRequest → PlannerItemResponse).
 * The learner's planner (D35): GET lists, POST adds, PATCH updates, DELETE
 * removes. Scoped to the principal's account and learner on every call
 * (invariant a); a row from another account answers 404.
 */
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { dbNotConfiguredResponse, requirePrincipal } from '@/lib/tutor/auth/principal';
import { DbNotConfiguredError, getTutorDb } from '@/lib/tutor/db';
import { reportError } from '@/lib/tutor/errors';
import {
  createPlannerItem,
  deletePlannerItem,
  listPlannerItems,
  PlannerError,
  updatePlannerItem,
} from '@/lib/tutor/planner';
import { isPreviewMode, previewReadOnlyResponse } from '@/lib/tutor/preview';
import type { ListPlannerResponse, PlannerItemResponse } from '@/lib/tutor/wire';

const ROUTE = '/api/tutor/planner';
const ID = /^[A-Za-z0-9_-]{1,64}$/;

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function refused(error: unknown): Response | null {
  if (error instanceof DbNotConfiguredError) return dbNotConfiguredResponse();
  if (error instanceof PlannerError) {
    return error.code === 'NOT_FOUND'
      ? apiError('NOT_FOUND', 404, error.message)
      : apiError('INVALID_REQUEST', 400, error.message);
  }
  return null;
}

export async function GET(request: Request) {
  const auth = await requirePrincipal(request, { learner: true });
  if (!auth.ok) return auth.response;
  if (isPreviewMode()) return apiSuccess({ items: [] });
  const { accountId, learnerId } = auth.principal;
  try {
    const db = await getTutorDb();
    const payload: ListPlannerResponse = {
      items: await listPlannerItems(db, { accountId, learnerId: learnerId! }),
    };
    return apiSuccess({ ...payload });
  } catch (error) {
    const response = refused(error);
    if (response) return response;
    await reportError(error, { accountId, learnerId, route: ROUTE, code: 'planner_list_failed' });
    return apiError('INTERNAL_ERROR', 500, 'Could not load the planner.');
  }
}

export async function POST(request: Request) {
  const auth = await requirePrincipal(request, { learner: true });
  if (!auth.ok) return auth.response;
  if (isPreviewMode()) return previewReadOnlyResponse('add to the planner');
  const { accountId, learnerId } = auth.principal;
  const body = await readJson(request);
  if (!body) return apiError('INVALID_REQUEST', 400, 'The request body must be JSON.');
  try {
    const db = await getTutorDb();
    const item = await createPlannerItem(
      db,
      { accountId, learnerId: learnerId! },
      { title: body.title, subject: body.subject, dueOn: body.dueOn, notes: body.notes },
    );
    const payload: PlannerItemResponse = { item };
    return apiSuccess({ ...payload }, 201);
  } catch (error) {
    const response = refused(error);
    if (response) return response;
    await reportError(error, { accountId, learnerId, route: ROUTE, code: 'planner_create_failed' });
    return apiError('INTERNAL_ERROR', 500, 'Could not add that.');
  }
}

export async function PATCH(request: Request) {
  const auth = await requirePrincipal(request, { learner: true });
  if (!auth.ok) return auth.response;
  if (isPreviewMode()) return previewReadOnlyResponse('change the planner');
  const { accountId, learnerId } = auth.principal;
  const body = await readJson(request);
  if (!body) return apiError('INVALID_REQUEST', 400, 'The request body must be JSON.');
  const id = typeof body.id === 'string' && ID.test(body.id) ? body.id : null;
  if (!id) return apiError('MISSING_REQUIRED_FIELD', 400, 'id is required.');
  try {
    const db = await getTutorDb();
    const item = await updatePlannerItem(db, { accountId, learnerId: learnerId! }, id, body);
    const payload: PlannerItemResponse = { item };
    return apiSuccess({ ...payload });
  } catch (error) {
    const response = refused(error);
    if (response) return response;
    await reportError(error, { accountId, learnerId, route: ROUTE, code: 'planner_update_failed' });
    return apiError('INTERNAL_ERROR', 500, 'Could not change that.');
  }
}

export async function DELETE(request: Request) {
  const auth = await requirePrincipal(request, { learner: true });
  if (!auth.ok) return auth.response;
  if (isPreviewMode()) return previewReadOnlyResponse('change the planner');
  const { accountId, learnerId } = auth.principal;
  const body = await readJson(request);
  const id = body && typeof body.id === 'string' && ID.test(body.id) ? body.id : null;
  if (!id) return apiError('MISSING_REQUIRED_FIELD', 400, 'id is required.');
  try {
    const db = await getTutorDb();
    const deleted = await deletePlannerItem(db, { accountId, learnerId: learnerId! }, id);
    if (!deleted) return apiError('NOT_FOUND', 404, 'No such planner item.');
    return apiSuccess({ deleted: true });
  } catch (error) {
    const response = refused(error);
    if (response) return response;
    await reportError(error, { accountId, learnerId, route: ROUTE, code: 'planner_delete_failed' });
    return apiError('INTERNAL_ERROR', 500, 'Could not remove that.');
  }
}
