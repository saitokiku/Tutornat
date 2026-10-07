/**
 * /api/tutor/session (wire CreateSession*, GetSessionResponse, UpdateSession*).
 *
 * POST creates one. It refuses with a typed error when the profile is locked
 * or frozen (`LEARNER_LOCKED`), when the `ai_kill_switch` gate is on
 * (`GATE_CLOSED`), or when the plan has no minutes left (`CAP_REACHED`, with
 * the entitlement in the body so the client can show the upgrade state).
 * GET replays one session with its turns and the board. PATCH ends it, records
 * thumbs, or meters a heartbeat, and always answers the fresh entitlement.
 *
 * The learner, the account, and the band come from the principal (spec R6,
 * invariant a; strategy law 3), never from the body.
 */
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess, type ApiErrorCode } from '@/lib/server/api-response';
import { dbNotConfiguredResponse, requirePrincipal } from '@/lib/tutor/auth/principal';
import {
  isPreviewMode,
  previewReadOnlyResponse,
  previewSessions,
  previewTurns,
} from '@/lib/tutor/preview';
import type { InputMode } from '@/lib/tutor/contracts';
import { DbNotConfiguredError, getTutorDb } from '@/lib/tutor/db';
import { reportError } from '@/lib/tutor/errors';
import {
  createSession,
  listTurns,
  loadSession,
  SessionGateError,
  updateSession,
} from '@/lib/tutor/session';
import { parseSessionTopic } from '@/lib/tutor/session/topic';
import { warmTurnPathInBackground } from '@/lib/tutor/turn/warm';
import type {
  CreateSessionRequest,
  CreateSessionResponse,
  GetSessionResponse,
  UpdateSessionRequest,
  UpdateSessionResponse,
} from '@/lib/tutor/wire';

const log = createLogger('tutor-session');
const ROUTE = '/api/tutor/session';
const ID = /^[A-Za-z0-9_-]{1,64}$/;

/** The gate codes the service throws, mapped to what the client branches on. */
const GATE_CODES: Readonly<Record<SessionGateError['code'], ApiErrorCode>> = {
  PROFILE_LOCKED: 'LEARNER_LOCKED',
  AI_PAUSED: 'GATE_CLOSED',
  CAP_REACHED: 'CAP_REACHED',
};

function id(value: unknown): string | null {
  return typeof value === 'string' && ID.test(value) ? value : null;
}

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

export async function POST(request: Request) {
  const auth = await requirePrincipal(request, { learner: true });
  if (!auth.ok) return auth.response;
  if (isPreviewMode()) return previewReadOnlyResponse('start a session');
  const { principal } = auth;

  const body = await readJson(request);
  if (!body) return apiError('INVALID_REQUEST', 400, 'The request body must be JSON.');
  const mode: InputMode = body.mode === 'text' ? 'text' : 'voice';
  const courseworkId = body.courseworkId == null ? null : id(body.courseworkId);
  if (body.courseworkId != null && !courseworkId) {
    return apiError('INVALID_REQUEST', 400, 'courseworkId must be a coursework id.');
  }
  const skillId = typeof body.skillId === 'string' ? body.skillId : null;
  const parsedTopic = parseSessionTopic(body.topic);
  if (!parsedTopic.ok) return apiError('INVALID_REQUEST', 400, parsedTopic.message);
  const input: CreateSessionRequest = { mode, courseworkId, skillId, topic: parsedTopic.topic };

  try {
    const db = await getTutorDb();
    const created: CreateSessionResponse = await createSession(db, principal, input);
    // The first turn of a session is the one the learner judges, and it is the
    // one that pays for the cold provider client, the prompt files, and the
    // TLS handshake. Start that work now, while they are still reading the
    // screen (spec §5.3). Fire-and-forget: it never blocks or fails the
    // response, and it makes no priced call.
    warmTurnPathInBackground(created.band);
    log.info(
      `session ${created.session.id} start account=${principal.accountId} learner=${principal.learnerId} mode=${mode}`,
    );
    return apiSuccess({ ...created }, 201);
  } catch (error) {
    if (error instanceof DbNotConfiguredError) return dbNotConfiguredResponse();
    if (error instanceof SessionGateError) {
      const code = error.status === 404 ? 'NOT_FOUND' : GATE_CODES[error.code];
      return gateRefusal(code, error);
    }
    await reportError(error, {
      accountId: principal.accountId,
      learnerId: principal.learnerId,
      route: ROUTE,
      code: 'session_create_failed',
    });
    return apiError('INTERNAL_ERROR', 500, 'Could not start a session. Try again.');
  }
}

/**
 * A gate refusal. When the plan is out of minutes the entitlement rides along
 * beside the standard failure shape, so the client can show the upgrade state
 * without a second request.
 */
function gateRefusal(code: ApiErrorCode, error: SessionGateError) {
  if (!error.entitlement) return apiError(code, error.status, error.message);
  return Response.json(
    { success: false, errorCode: code, error: error.message, entitlement: error.entitlement },
    { status: error.status },
  );
}

export async function GET(request: Request) {
  const auth = await requirePrincipal(request, { learner: true });
  if (!auth.ok) return auth.response;
  if (isPreviewMode()) {
    const session = previewSessions[0]!;
    return apiSuccess({
      session,
      turns: previewTurns.filter((turn) => turn.sessionId === session.id),
      board: [],
    });
  }
  const { principal } = auth;

  const sessionId = id(new URL(request.url).searchParams.get('id'));
  if (!sessionId) return apiError('MISSING_REQUIRED_FIELD', 400, 'id is required.');

  try {
    const db = await getTutorDb();
    const record = await loadSession(db, principal, sessionId);
    if (!record) return apiError('NOT_FOUND', 404, 'No such session.');
    const turns = await listTurns(db, sessionId);
    const payload: GetSessionResponse = {
      session: record.session,
      turns,
      board: record.state.board,
    };
    return apiSuccess({ ...payload });
  } catch (error) {
    if (error instanceof DbNotConfiguredError) return dbNotConfiguredResponse();
    await reportError(error, {
      accountId: principal.accountId,
      learnerId: principal.learnerId,
      sessionId,
      route: ROUTE,
      code: 'session_read_failed',
    });
    return apiError('INTERNAL_ERROR', 500, 'Could not load that session.');
  }
}

export async function PATCH(request: Request) {
  const auth = await requirePrincipal(request, { learner: true });
  if (!auth.ok) return auth.response;
  if (isPreviewMode()) return previewReadOnlyResponse('update a session');
  const { principal } = auth;

  const body = await readJson(request);
  if (!body) return apiError('INVALID_REQUEST', 400, 'The request body must be JSON.');
  const sessionId = id(body.sessionId);
  if (!sessionId) return apiError('MISSING_REQUIRED_FIELD', 400, 'sessionId is required.');
  const action = body.action;
  if (action !== 'end' && action !== 'thumbs' && action !== 'heartbeat') {
    return apiError('INVALID_REQUEST', 400, "action must be 'end', 'thumbs', or 'heartbeat'.");
  }
  if (action === 'thumbs' && body.thumbs !== 'up' && body.thumbs !== 'down') {
    return apiError('INVALID_REQUEST', 400, "thumbs must be 'up' or 'down'.");
  }
  const input: UpdateSessionRequest = {
    sessionId,
    action,
    ...(action === 'thumbs' ? { thumbs: body.thumbs as 'up' | 'down' } : {}),
  };

  try {
    const db = await getTutorDb();
    // `heartbeat` and `end` meter whole minutes through addUsedMinutes
    // (lib/tutor/billing) inside updateSession, and both answer the
    // entitlement that came back from the charge (spec R7, billing-24).
    const result = await updateSession(db, principal, input);
    if (!result) return apiError('NOT_FOUND', 404, 'No such session.');
    const payload: UpdateSessionResponse = result;
    if (action === 'end') {
      log.info(`session ${sessionId} end minutes=${result.session.minutes}`);
    }
    return apiSuccess({ ...payload });
  } catch (error) {
    if (error instanceof DbNotConfiguredError) return dbNotConfiguredResponse();
    if (error instanceof RangeError) return apiError('INVALID_REQUEST', 400, error.message);
    await reportError(error, {
      accountId: principal.accountId,
      learnerId: principal.learnerId,
      sessionId,
      route: ROUTE,
      code: 'session_update_failed',
    });
    return apiError('INTERNAL_ERROR', 500, 'Could not update that session.');
  }
}
