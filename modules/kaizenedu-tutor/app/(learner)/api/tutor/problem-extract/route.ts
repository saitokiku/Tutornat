/**
 * POST /api/tutor/problem-extract (multipart `file` plus optional `title` →
 * wire ProblemExtractResponse, 201; spec R3).
 *
 * A photo or PDF of homework goes straight from the request to the vision
 * stage and becomes a coursework row the learner confirms. The bytes are never
 * written to disk or storage; an iPhone HEIC is transcoded to JPEG in memory.
 * A failed reading still answers 201 with a `failed` row, because the product
 * behaviour is "retry or type it instead", not an error page.
 */
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { dbNotConfiguredResponse, requirePrincipal } from '@/lib/tutor/auth/principal';
import { isPreviewMode, previewReadOnlyResponse } from '@/lib/tutor/preview';
import { DbNotConfiguredError, getTutorDb } from '@/lib/tutor/db';
import { reportError } from '@/lib/tutor/errors';
import { acceptUpload, extractProblem, MAX_UPLOAD_BYTES } from '@/lib/tutor/extract';
import { enforceRateLimits } from '@/lib/tutor/guards';
import type { ProblemExtractResponse } from '@/lib/tutor/wire';

const log = createLogger('tutor-extract-route');
const ROUTE = '/api/tutor/problem-extract';

export const dynamic = 'force-dynamic';
/** The model and the voice providers can take a while; vercel.json's pattern covers only upstream's api directory. */
export const maxDuration = 300;

export async function POST(request: Request) {
  const auth = await requirePrincipal(request, { learner: true });
  if (!auth.ok) return auth.response;
  if (isPreviewMode()) return previewReadOnlyResponse('save an upload');
  const { accountId, learnerId } = auth.principal;

  const declared = Number.parseInt(request.headers.get('content-length') ?? '', 10);
  if (Number.isFinite(declared) && declared > MAX_UPLOAD_BYTES * 1.1) {
    return apiError('INVALID_REQUEST', 413, 'That file is larger than 8 MB.');
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return apiError('INVALID_REQUEST', 400, 'Send the photo as a multipart form.');
  }
  const entry = form.get('file');
  const file = entry instanceof File ? entry : null;
  const bytes = file ? new Uint8Array(await file.arrayBuffer()) : null;
  const accepted = acceptUpload(file, bytes);
  if (!accepted.ok) {
    const status = accepted.rejection.code === 'TOO_LARGE' ? 413 : 400;
    return apiError('INVALID_REQUEST', status, accepted.rejection.message);
  }
  const title = form.get('title');

  try {
    const db = await getTutorDb();
    const limited = await enforceRateLimits(db, auth.principal, 'problem-extract');
    if (limited) return limited;
    const item = await extractProblem({
      db,
      scope: { accountId, learnerId: learnerId! },
      band: auth.principal.band,
      upload: accepted.upload,
      ...(typeof title === 'string' ? { title } : {}),
    });
    log.info(
      `coursework ${item.id} extracted learner=${learnerId} status=${item.status} bytes=${accepted.upload.bytes.byteLength}`,
    );
    const payload: ProblemExtractResponse = { coursework: item };
    return apiSuccess({ ...payload }, 201);
  } catch (error) {
    if (error instanceof DbNotConfiguredError) return dbNotConfiguredResponse();
    await reportError(error, { accountId, learnerId, route: ROUTE, code: 'extract_failed' });
    return apiError('INTERNAL_ERROR', 500, 'Could not read that page. Try again, or type it in.');
  }
}
