/**
 * POST /api/tutor/check (wire CheckAnswerRequest → CheckAnswerResponse; spec
 * R4, §5.7, §5.8). The learner answers the card; the server grades against the
 * key it kept in the session state, writes the `check_result` evidence with its
 * `assisted` flag (strategy law 1), updates the student model, and advances the
 * diagnostic. Nothing is streamed: the tutor sees the result in its next turn.
 */
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess, type ApiErrorCode } from '@/lib/server/api-response';
import { dbNotConfiguredResponse, requirePrincipal } from '@/lib/tutor/auth/principal';
import { isPreviewMode, previewReadOnlyResponse } from '@/lib/tutor/preview';
import { answerCheck, type CheckErrorCode } from '@/lib/tutor/checks';
import { DbNotConfiguredError, getTutorDb } from '@/lib/tutor/db';
import { reportError } from '@/lib/tutor/errors';
import type { CheckAnswerRequest, CheckAnswerResponse } from '@/lib/tutor/wire';

const log = createLogger('tutor-check');
const ROUTE = '/api/tutor/check';
const ID = /^[A-Za-z0-9_-]{1,64}$/;
const ANSWER_MAX = 500;

const STATUS: Readonly<Record<CheckErrorCode, { code: ApiErrorCode; status: number }>> = {
  NOT_FOUND: { code: 'NOT_FOUND', status: 404 },
  NO_PENDING_CHECK: { code: 'CONFLICT', status: 409 },
  SESSION_ENDED: { code: 'SESSION_ENDED', status: 409 },
  INVALID_ANSWER: { code: 'INVALID_REQUEST', status: 400 },
};

function answerOf(value: unknown): CheckAnswerRequest['answer'] | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') return value.slice(0, ANSWER_MAX);
  if (Array.isArray(value)) {
    const options = value.filter((item): item is string => typeof item === 'string');
    return options.length === value.length && options.length > 0 ? options.slice(0, 12) : null;
  }
  return null;
}

/** The model and the voice providers can take a while; vercel.json's pattern covers only upstream's api directory. */
export const maxDuration = 300;

export async function POST(request: Request) {
  const auth = await requirePrincipal(request, { learner: true });
  if (!auth.ok) return auth.response;
  if (isPreviewMode()) return previewReadOnlyResponse('grade an answer');
  const { principal } = auth;

  let raw: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('shape');
    raw = parsed as Record<string, unknown>;
  } catch {
    return apiError('INVALID_REQUEST', 400, 'The request body must be JSON.');
  }
  const sessionId =
    typeof raw.sessionId === 'string' && ID.test(raw.sessionId) ? raw.sessionId : null;
  const checkId = typeof raw.checkId === 'string' && ID.test(raw.checkId) ? raw.checkId : null;
  if (!sessionId || !checkId) {
    return apiError('MISSING_REQUIRED_FIELD', 400, 'sessionId and checkId are required.');
  }
  const answer = answerOf(raw.answer);
  if (answer === null) {
    return apiError('INVALID_REQUEST', 400, 'answer must be text, a number, or a list of options.');
  }
  const latencyMs =
    typeof raw.latencyMs === 'number' && Number.isFinite(raw.latencyMs) && raw.latencyMs >= 0
      ? Math.round(raw.latencyMs)
      : undefined;
  const body: CheckAnswerRequest = {
    sessionId,
    checkId,
    answer,
    ...(latencyMs === undefined ? {} : { latencyMs }),
  };

  try {
    const db = await getTutorDb();
    const outcome = await answerCheck(db, principal, body);
    if (!outcome.ok) {
      const mapped = STATUS[outcome.code];
      return apiError(mapped.code, mapped.status, outcome.message);
    }
    const payload: CheckAnswerResponse = outcome.response;
    log.info(
      `check ${checkId} session=${sessionId} skill=${payload.result.skillId} correct=${payload.result.correct} assisted=${payload.result.assisted}`,
    );
    return apiSuccess({ ...payload });
  } catch (error) {
    if (error instanceof DbNotConfiguredError) return dbNotConfiguredResponse();
    await reportError(error, {
      accountId: principal.accountId,
      learnerId: principal.learnerId,
      sessionId,
      route: ROUTE,
      code: 'check_failed',
    });
    return apiError('INTERNAL_ERROR', 500, 'Could not grade that answer. Try again.');
  }
}
