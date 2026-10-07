/**
 * POST /api/tutor/guest (wire GuestStartRequest → GuestStartResponse, 201).
 *
 * The front door of guest mode (D35): creates the anonymous account and
 * learner for the chosen grade level, sets the session cookie, and when a
 * topic is given starts the session in the same call so the landing page is
 * one click from a tutor. A visitor whose cookie already resolves to a guest
 * keeps that guest (their sessions, planner and progress) and is moved to
 * the new level instead of being given a second identity.
 *
 * Nothing in the body identifies a person and nothing is trusted for the
 * band: the level maps to a band on the server (strategy law 3). Creation is
 * held to a per-address token bucket so a script cannot fill the table.
 */
import { GUEST_LEVELS, isGuestLevelId, isTutorMode } from '@/kaizen.config';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess, type ApiErrorCode } from '@/lib/server/api-response';
import { openDb, principalSummary, withSetCookie } from '@/lib/tutor/accounts';
import { notFoundResponse, resolvePrincipal } from '@/lib/tutor/auth/principal';
import { sessionCookieHeader } from '@/lib/tutor/auth/session';
import type { InputMode, Principal } from '@/lib/tutor/contracts';
import { reportError } from '@/lib/tutor/errors';
import { createGuest, relevelGuest } from '@/lib/tutor/guest';
import { defaultLimiter } from '@/lib/tutor/guards';
import { getLearner } from '@/lib/tutor/accounts/learners';
import { isPreviewMode, previewReadOnlyResponse } from '@/lib/tutor/preview';
import { createSession, SessionGateError } from '@/lib/tutor/session';
import { parseSessionTopic } from '@/lib/tutor/session/topic';
import { warmTurnPathInBackground } from '@/lib/tutor/turn/warm';
import type { CreateSessionResponse, GuestStartResponse } from '@/lib/tutor/wire';

const log = createLogger('tutor-guest');
const ROUTE = '/api/tutor/guest';
/** New guest identities one address may mint per minute. */
export const GUEST_STARTS_PER_MINUTE = 12;

const GATE_CODES: Readonly<Record<SessionGateError['code'], ApiErrorCode>> = {
  PROFILE_LOCKED: 'LEARNER_LOCKED',
  AI_PAUSED: 'GATE_CLOSED',
  CAP_REACHED: 'CAP_REACHED',
};

function addressOf(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  return first || request.headers.get('x-real-ip') || 'unknown';
}

export async function POST(request: Request) {
  if (!isTutorMode()) return notFoundResponse();
  if (isPreviewMode()) return previewReadOnlyResponse('start as a guest');

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, 'The request body must be JSON.');
  }
  const body = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  if (!isGuestLevelId(body.level)) {
    return apiError(
      'INVALID_REQUEST',
      400,
      `level must be one of ${GUEST_LEVELS.map((level) => level.id).join(', ')}.`,
    );
  }
  const level = body.level;
  const mode: InputMode = body.mode === 'text' ? 'text' : 'voice';
  const parsed = parseSessionTopic(body.topic);
  if (!parsed.ok) return apiError('INVALID_REQUEST', 400, parsed.message);

  const opened = await openDb('start as a guest');
  if (!opened.ok) return opened.response;
  const db = opened.db;

  let cookieHeader: string | null = null;
  let principal: Principal;
  try {
    const existing = await resolvePrincipal(request.headers, db);
    if (existing?.guest && existing.learnerId) {
      principal = existing;
      const learner = await relevelGuest(db, existing, level);
      if (learner) principal = { ...existing, band: learner.band };
    } else {
      const decision = defaultLimiter().take(
        `guest:${addressOf(request)}`,
        GUEST_STARTS_PER_MINUTE,
      );
      if (!decision.allowed) {
        const response = apiError(
          'RATE_LIMITED',
          429,
          'Too many starts from this address. Wait a minute and try again.',
        );
        response.headers.set('retry-after', String(decision.retryAfterSeconds));
        return response;
      }
      const created = await createGuest(db, level);
      principal = created.principal;
      cookieHeader = sessionCookieHeader(created.token, created.expiresAt);
      log.info(`guest ${principal.accountId} created level=${level}`);
    }
  } catch (error) {
    await reportError(error, { route: ROUTE, code: 'guest_create_failed' });
    return apiError('INTERNAL_ERROR', 500, 'Could not start. Try again.');
  }

  const learner = await getLearner(db, principal.accountId, principal.learnerId!);
  if (!learner) return apiError('INTERNAL_ERROR', 500, 'Could not start. Try again.');

  // An open session (D36) starts with no subject: the tutor asks.
  const open = body.open === true;
  let session: CreateSessionResponse | null = null;
  if (parsed.topic || open) {
    try {
      session = await createSession(db, principal, { mode, topic: parsed.topic, open });
      warmTurnPathInBackground(session.band);
      log.info(
        `guest ${principal.accountId} session ${session.session.id} subject=${parsed.topic?.subject ?? 'open'}`,
      );
    } catch (error) {
      if (error instanceof SessionGateError) {
        const response = apiError(GATE_CODES[error.code], error.status, error.message);
        return cookieHeader ? withSetCookie(response, cookieHeader) : response;
      }
      await reportError(error, {
        accountId: principal.accountId,
        learnerId: principal.learnerId,
        route: ROUTE,
        code: 'guest_session_failed',
      });
      const response = apiError('INTERNAL_ERROR', 500, 'Could not start a session. Try again.');
      return cookieHeader ? withSetCookie(response, cookieHeader) : response;
    }
  }

  const payload: GuestStartResponse = {
    learner,
    principal: principalSummary(principal),
    session,
  };
  const response = apiSuccess({ ...payload }, 201);
  return cookieHeader ? withSetCookie(response, cookieHeader) : response;
}
