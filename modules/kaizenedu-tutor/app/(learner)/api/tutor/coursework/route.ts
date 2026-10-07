/**
 * /api/tutor/coursework (wire ListCourseworkResponse, CreateCourseworkRequest,
 * UpdateCourseworkRequest, DeleteCourseworkRequest; spec R3). What the learner
 * is working on: typed-in problems, and the rows the photo extractor wrote.
 *
 * Every row is scoped by account and learner from the principal, so an id from
 * another account is 404 rather than 403 (invariant a; nothing leaks, not even
 * the existence of the row).
 */
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { dbNotConfiguredResponse, requirePrincipal } from '@/lib/tutor/auth/principal';
import { isPreviewMode, previewCoursework, previewReadOnlyResponse } from '@/lib/tutor/preview';
import {
  createCoursework,
  deleteCoursework,
  listCoursework,
  TEXT_MAX,
  updateCoursework,
} from '@/lib/tutor/coursework';
import { DbNotConfiguredError, getTutorDb } from '@/lib/tutor/db';
import { reportError } from '@/lib/tutor/errors';
import type {
  CourseworkItemResponse,
  CreateCourseworkRequest,
  ListCourseworkResponse,
} from '@/lib/tutor/wire';

const log = createLogger('tutor-coursework');
const ROUTE = '/api/tutor/coursework';
const ID = /^[A-Za-z0-9_-]{1,64}$/;

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const parsed: unknown = await request.json();
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function skillIds(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

export async function GET(request: Request) {
  const auth = await requirePrincipal(request, { learner: true });
  if (!auth.ok) return auth.response;
  if (isPreviewMode()) return apiSuccess({ items: previewCoursework });
  const { accountId, learnerId } = auth.principal;
  try {
    const db = await getTutorDb();
    const items = await listCoursework(db, { accountId, learnerId: learnerId! });
    const payload: ListCourseworkResponse = { items };
    return apiSuccess({ ...payload });
  } catch (error) {
    if (error instanceof DbNotConfiguredError) return dbNotConfiguredResponse();
    await reportError(error, {
      accountId,
      learnerId,
      route: ROUTE,
      code: 'coursework_list_failed',
    });
    return apiError('INTERNAL_ERROR', 500, 'Could not load your problems.');
  }
}

export async function POST(request: Request) {
  const auth = await requirePrincipal(request, { learner: true });
  if (!auth.ok) return auth.response;
  if (isPreviewMode()) return previewReadOnlyResponse('save coursework');
  const { accountId, learnerId } = auth.principal;

  const body = await readJson(request);
  if (!body) return apiError('INVALID_REQUEST', 400, 'The request body must be JSON.');
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) return apiError('MISSING_REQUIRED_FIELD', 400, 'text is required.');
  if (text.length > TEXT_MAX) {
    return apiError('INVALID_REQUEST', 400, `text must be ${TEXT_MAX} characters or fewer.`);
  }
  const input: CreateCourseworkRequest = {
    title: typeof body.title === 'string' ? body.title : '',
    text,
    skillIds: skillIds(body.skillIds),
  };

  try {
    const db = await getTutorDb();
    const item = await createCoursework(
      db,
      { accountId, learnerId: learnerId! },
      {
        title: input.title,
        text: input.text,
        source: 'text',
        status: 'ready',
        skillIds: input.skillIds,
      },
    );
    log.info(`coursework ${item.id} created learner=${learnerId} source=text`);
    const payload: CourseworkItemResponse = { item };
    return apiSuccess({ ...payload }, 201);
  } catch (error) {
    if (error instanceof DbNotConfiguredError) return dbNotConfiguredResponse();
    await reportError(error, {
      accountId,
      learnerId,
      route: ROUTE,
      code: 'coursework_create_failed',
    });
    return apiError('INTERNAL_ERROR', 500, 'Could not save that problem. Try again.');
  }
}

export async function PATCH(request: Request) {
  const auth = await requirePrincipal(request, { learner: true });
  if (!auth.ok) return auth.response;
  if (isPreviewMode()) return previewReadOnlyResponse('change coursework');
  const { accountId, learnerId } = auth.principal;

  const body = await readJson(request);
  if (!body) return apiError('INVALID_REQUEST', 400, 'The request body must be JSON.');
  const id = typeof body.id === 'string' && ID.test(body.id) ? body.id : null;
  if (!id) return apiError('MISSING_REQUIRED_FIELD', 400, 'id is required.');
  if (body.text !== undefined && typeof body.text !== 'string') {
    return apiError('INVALID_REQUEST', 400, 'text must be a string.');
  }
  if (typeof body.text === 'string' && body.text.length > TEXT_MAX) {
    return apiError('INVALID_REQUEST', 400, `text must be ${TEXT_MAX} characters or fewer.`);
  }
  if (body.title !== undefined && typeof body.title !== 'string') {
    return apiError('INVALID_REQUEST', 400, 'title must be a string.');
  }

  try {
    const db = await getTutorDb();
    const item = await updateCoursework(
      db,
      { accountId, learnerId: learnerId! },
      {
        id,
        ...(typeof body.title === 'string' ? { title: body.title } : {}),
        ...(typeof body.text === 'string' ? { text: body.text } : {}),
      },
    );
    if (!item) return apiError('NOT_FOUND', 404, 'No such problem.');
    const payload: CourseworkItemResponse = { item };
    return apiSuccess({ ...payload });
  } catch (error) {
    if (error instanceof DbNotConfiguredError) return dbNotConfiguredResponse();
    await reportError(error, {
      accountId,
      learnerId,
      route: ROUTE,
      code: 'coursework_update_failed',
    });
    return apiError('INTERNAL_ERROR', 500, 'Could not save that change. Try again.');
  }
}

export async function DELETE(request: Request) {
  const auth = await requirePrincipal(request, { learner: true });
  if (!auth.ok) return auth.response;
  if (isPreviewMode()) return previewReadOnlyResponse('delete coursework');
  const { accountId, learnerId } = auth.principal;

  const body = await readJson(request);
  const id = body && typeof body.id === 'string' && ID.test(body.id) ? body.id : null;
  if (!id) return apiError('MISSING_REQUIRED_FIELD', 400, 'id is required.');

  try {
    const db = await getTutorDb();
    const removed = await deleteCoursework(db, { accountId, learnerId: learnerId! }, id);
    if (!removed) return apiError('NOT_FOUND', 404, 'No such problem.');
    log.info(`coursework ${id} deleted learner=${learnerId}`);
    return apiSuccess({ id });
  } catch (error) {
    if (error instanceof DbNotConfiguredError) return dbNotConfiguredResponse();
    await reportError(error, {
      accountId,
      learnerId,
      route: ROUTE,
      code: 'coursework_delete_failed',
    });
    return apiError('INTERNAL_ERROR', 500, 'Could not delete that problem. Try again.');
  }
}
