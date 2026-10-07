/**
 * POST /api/tutor/attention (spec §5.10 B–C; D16, R29).
 *
 * The server sees a coarse state and per-session aggregates, never media. A
 * batch of `{state, ts, source}` samples is folded into counts on arrival and
 * the samples themselves are dropped: `attention_stats` holds one row per
 * session with counts and a percentage, and `recovery_events` holds one row
 * per ladder step. There is no table for a sample and no code path that
 * writes one.
 *
 * `AttentionSample.source` is `camera | visibility | idle | response`. At this
 * gate the screen only produces the last three; a `camera` sample would still
 * be nothing but a state word, because the frames, landmarks, and blendshapes
 * never leave the browser (see `lib/tutor/presence/README.md`).
 */
import { randomBytes } from 'node:crypto';

import { ATTENTION, type AttentionState } from '@/kaizen.config';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { dbNotConfiguredResponse, requirePrincipal } from '@/lib/tutor/auth/principal';
import { isPreviewMode, previewReadOnlyResponse } from '@/lib/tutor/preview';
import type { AttentionSample } from '@/lib/tutor/contracts';
import { DbNotConfiguredError, getTutorDb, type Queryable } from '@/lib/tutor/db';
import { reportError } from '@/lib/tutor/errors';
import { enforceRateLimit } from '@/lib/tutor/guards/rate-limit';
import type { AttentionRequest } from '@/lib/tutor/wire';

const log = createLogger('tutor-attention');
const ROUTE = '/api/tutor/attention';

const ID = /^[A-Za-z0-9_-]{1,64}$/;
export const SAMPLES_MAX = 240;
const SOURCES: ReadonlyArray<AttentionSample['source']> = [
  'camera',
  'visibility',
  'idle',
  'response',
];
const OUTCOME_MAX = 64;

function isState(value: unknown): value is AttentionState {
  return typeof value === 'string' && (ATTENTION.states as readonly string[]).includes(value);
}

function isSource(value: unknown): value is AttentionSample['source'] {
  return typeof value === 'string' && (SOURCES as readonly string[]).includes(value);
}

interface StatsRow extends Record<string, unknown> {
  camera_enabled: boolean;
  attending_pct: number | string;
  drift_count: number | string;
  away_count: number | string;
  recoveries: number | string;
}

interface Folded {
  attending: number;
  drifting: number;
  away: number;
  noFace: number;
  total: number;
}

/** Counts, kept as counts. The samples themselves go out of scope right here. */
function foldSamples(samples: readonly AttentionSample[]): Folded {
  const folded: Folded = { attending: 0, drifting: 0, away: 0, noFace: 0, total: samples.length };
  for (const sample of samples) {
    if (sample.state === 'attending') folded.attending += 1;
    else if (sample.state === 'drifting') folded.drifting += 1;
    else if (sample.state === 'away') folded.away += 1;
    else folded.noFace += 1;
  }
  return folded;
}

function clampPct(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(100, Math.max(0, Math.round(value * 10) / 10));
}

function clampCount(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return fallback;
  return Math.min(1_000_000, Math.round(value));
}

export async function POST(request: Request) {
  const auth = await requirePrincipal(request, { learner: true });
  if (!auth.ok) return auth.response;
  if (isPreviewMode()) return previewReadOnlyResponse('record attention');
  const { accountId, learnerId } = auth.principal;
  const limited = enforceRateLimit(auth.principal, 'error-report');
  if (limited) return limited;

  let body: Partial<AttentionRequest>;
  try {
    body = (await request.json()) as Partial<AttentionRequest>;
  } catch {
    return apiError('INVALID_REQUEST', 400, 'The request body must be JSON.');
  }
  const sessionId = body.sessionId;
  if (typeof sessionId !== 'string' || !ID.test(sessionId)) {
    return apiError('INVALID_REQUEST', 400, 'sessionId must be a session id.');
  }

  const rawSamples = Array.isArray(body.samples) ? body.samples : [];
  if (rawSamples.length > SAMPLES_MAX) {
    return apiError('INVALID_REQUEST', 400, `Send at most ${SAMPLES_MAX} samples at a time.`);
  }
  const samples: AttentionSample[] = [];
  for (const raw of rawSamples) {
    if (!raw || typeof raw !== 'object') continue;
    const candidate = raw as Partial<AttentionSample>;
    if (!isState(candidate.state) || !isSource(candidate.source)) continue;
    if (typeof candidate.ts !== 'number' || !Number.isFinite(candidate.ts)) continue;
    samples.push({ state: candidate.state, ts: candidate.ts, source: candidate.source });
  }

  const stats = body.stats;
  const recovery = body.recovery;
  if (recovery) {
    if (!isState(recovery.triggerState)) {
      return apiError('INVALID_REQUEST', 400, 'recovery.triggerState must be an attention state.');
    }
    if (
      typeof recovery.ladderStep !== 'number' ||
      !Number.isInteger(recovery.ladderStep) ||
      recovery.ladderStep < 1 ||
      recovery.ladderStep > 6
    ) {
      return apiError('INVALID_REQUEST', 400, 'recovery.ladderStep must be 1 to 6.');
    }
    if (
      recovery.outcome !== null &&
      recovery.outcome !== undefined &&
      (typeof recovery.outcome !== 'string' || recovery.outcome.length > OUTCOME_MAX)
    ) {
      return apiError(
        'INVALID_REQUEST',
        400,
        `recovery.outcome must be ${OUTCOME_MAX} characters or fewer.`,
      );
    }
  }

  try {
    const db: Queryable = await getTutorDb();
    const owned = await db.query<{ id: string }>(
      `SELECT id FROM sessions WHERE id = $1 AND account_id = $2 AND learner_id = $3`,
      [sessionId, accountId, learnerId],
    );
    if (!owned.rows[0]) return apiError('NOT_FOUND', 404, 'No such session.');

    const folded = foldSamples(samples);
    const existing = await db.query<StatsRow>(
      `SELECT camera_enabled, attending_pct, drift_count, away_count, recoveries
         FROM attention_stats WHERE session_id = $1`,
      [sessionId],
    );
    const prior = existing.rows[0];
    // Drift and away are additive; `recoveries` counts ladder steps, so it
    // advances with the event rather than with a sample.
    const driftCount = Number(prior?.drift_count ?? 0) + folded.drifting;
    const awayCount = Number(prior?.away_count ?? 0) + folded.away;
    const recoveries = Number(prior?.recoveries ?? 0) + (recovery ? 1 : 0);
    // `attention_stats` holds one percentage and no sample total, so the
    // session-wide figure comes from the client's running aggregate
    // (`aggregateSamples` in lib/tutor/presence), which the screen sends with
    // every batch. Without it: the first batch's own percentage, then the
    // stored one — never a running mean over unequal batches, which would
    // drift.
    const batchPct =
      folded.total === 0 ? 0 : Math.round((folded.attending / folded.total) * 1000) / 10;
    const priorPct = prior ? clampPct(Number(prior.attending_pct), 0) : null;
    const attendingPct = clampPct(stats?.attendingPct, priorPct ?? batchPct);
    const cameraEnabled = stats?.cameraEnabled ?? prior?.camera_enabled ?? false;

    await db.query(
      `INSERT INTO attention_stats
         (session_id, account_id, camera_enabled, attending_pct, drift_count, away_count, recoveries)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (session_id) DO UPDATE SET
         camera_enabled = EXCLUDED.camera_enabled,
         attending_pct = EXCLUDED.attending_pct,
         drift_count = EXCLUDED.drift_count,
         away_count = EXCLUDED.away_count,
         recoveries = EXCLUDED.recoveries`,
      [
        sessionId,
        accountId,
        Boolean(cameraEnabled),
        attendingPct,
        clampCount(stats?.driftCount, driftCount),
        clampCount(stats?.awayCount, awayCount),
        clampCount(stats?.recoveries, recoveries),
      ],
    );

    if (recovery) {
      await db.query(
        `INSERT INTO recovery_events (id, account_id, session_id, trigger_state, ladder_step, outcome)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          `rec_${randomBytes(9).toString('base64url')}`,
          accountId,
          sessionId,
          recovery.triggerState,
          recovery.ladderStep,
          recovery.outcome ?? null,
        ],
      );
      log.info(
        `recovery session=${sessionId} step=${recovery.ladderStep} trigger=${recovery.triggerState}`,
      );
    }
    return apiSuccess({});
  } catch (error) {
    if (error instanceof DbNotConfiguredError) return dbNotConfiguredResponse();
    await reportError(error, {
      accountId,
      learnerId,
      sessionId,
      route: ROUTE,
      code: 'attention_failed',
    });
    return apiError('INTERNAL_ERROR', 500, 'Could not record attention for this session.');
  }
}
