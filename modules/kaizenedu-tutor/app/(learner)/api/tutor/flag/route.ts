/**
 * POST /api/tutor/flag (FlagRequest → FlagResponse, 201): the report button
 * (spec R10; safety-26). Writes a `flags` row for the caller's account; a
 * sessionId must belong to that account or the answer is 404. An `unsafe`
 * report pages a person (docs/SAFETY-RUNBOOK.md) with ids only. Logs carry
 * ids only, never the note.
 */
import { randomBytes } from 'node:crypto';

import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { resolveAppUrl } from '@/lib/tutor/app-url';
import { dbNotConfiguredResponse, requirePrincipal } from '@/lib/tutor/auth/principal';
import { DbNotConfiguredError, getTutorDb } from '@/lib/tutor/db';
import { isPreviewMode, previewReadOnlyResponse } from '@/lib/tutor/preview';
import { reportError } from '@/lib/tutor/errors';
import { enforceRateLimit } from '@/lib/tutor/guards/rate-limit';
import { pageSafetyEvent } from '@/lib/tutor/safety';
import type { FlagRequest, FlagResponse } from '@/lib/tutor/wire';

const log = createLogger('tutor-flag');
const ROUTE = '/api/tutor/flag';
const KINDS: ReadonlyArray<FlagRequest['kind']> = ['unsafe', 'wrong', 'other'];
const NOTE_MAX = 500;
const ID = /^[A-Za-z0-9_-]{1,64}$/;

function isKind(value: unknown): value is FlagRequest['kind'] {
  return typeof value === 'string' && (KINDS as readonly string[]).includes(value);
}

export async function POST(request: Request) {
  const auth = await requirePrincipal(request);
  if (!auth.ok) return auth.response;
  if (isPreviewMode()) return previewReadOnlyResponse('send a report');
  const limited = enforceRateLimit(auth.principal, 'flag');
  if (limited) return limited;

  let body: Partial<FlagRequest>;
  try {
    body = (await request.json()) as Partial<FlagRequest>;
  } catch {
    return apiError('INVALID_REQUEST', 400, 'The request body must be JSON.');
  }
  if (!isKind(body.kind)) {
    return apiError('INVALID_REQUEST', 400, "kind must be 'unsafe', 'wrong', or 'other'.");
  }
  const kind = body.kind;
  let note: string | null = null;
  if (body.note !== undefined && body.note !== null) {
    if (typeof body.note !== 'string') {
      return apiError('INVALID_REQUEST', 400, 'note must be text.');
    }
    note = body.note.trim();
    if (note.length > NOTE_MAX) {
      return apiError('INVALID_REQUEST', 400, `note must be ${NOTE_MAX} characters or fewer.`);
    }
    if (!note) note = null;
  }
  const sessionId = body.sessionId;
  if (sessionId !== undefined && (typeof sessionId !== 'string' || !ID.test(sessionId))) {
    return apiError('INVALID_REQUEST', 400, 'sessionId must be a session id.');
  }

  const { accountId, learnerId } = auth.principal;
  try {
    const db = await getTutorDb();
    let sessionLearnerId: string | null = null;
    if (sessionId) {
      const { rows } = await db.query<{ learner_id: string }>(
        `SELECT learner_id FROM sessions WHERE id = $1 AND account_id = $2`,
        [sessionId, accountId],
      );
      if (!rows[0]) return apiError('NOT_FOUND', 404, 'No such session.');
      sessionLearnerId = rows[0].learner_id;
    }
    const flagId = `flg_${randomBytes(9).toString('base64url')}`;
    await db.query(
      `INSERT INTO flags (id, account_id, learner_id, session_id, kind, note)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [flagId, accountId, learnerId ?? sessionLearnerId, sessionId ?? null, kind, note],
    );
    log.info(`flag ${flagId} kind=${kind} account=${accountId} session=${sessionId ?? 'none'}`);
    if (kind === 'unsafe') {
      await pageSafetyEvent(
        db,
        {
          flagId,
          accountId,
          learnerId: learnerId ?? sessionLearnerId,
          sessionId: sessionId ?? null,
          category: 'report',
          severity: 'high',
          source: 'report',
          at: new Date(),
        },
        { baseUrl: resolveAppUrl(request) },
      );
    }
    const payload: FlagResponse = { flagId };
    return apiSuccess({ ...payload }, 201);
  } catch (error) {
    if (error instanceof DbNotConfiguredError) return dbNotConfiguredResponse();
    await reportError(error, {
      accountId,
      learnerId,
      sessionId,
      route: ROUTE,
      code: 'flag_failed',
    });
    return apiError('INTERNAL_ERROR', 500, 'Could not save the report. Try again.');
  }
}
