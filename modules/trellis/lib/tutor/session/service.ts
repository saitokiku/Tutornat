/**
 * Session rows: the read/write subset of KaizenEdu `lib/tutor/session/service.ts`
 * (pinned commit 20a971b4…) that the check service needs. `rowToSession`,
 * `loadSession`, `saveSessionState`, `rowToTurn` and `listTurns` are verbatim.
 * `createSession`, `updateSession`, `meterMinutes`, `currentSitting` and
 * `thinkingPauseFor` are excluded: they depend on billing entitlement, app
 * settings, graph seeding and the delayed-check session target, none of which
 * is part of E1. The harness inserts session rows directly.
 */
import { type AgeBand } from '@/lib/tutor/config';
import type {
  InputMode,
  Principal,
  SessionPhase,
  SessionSummary,
  TurnRecord,
  TutorSession,
} from '@/lib/tutor/contracts';
import type { Queryable } from '@/lib/tutor/db';
import { parseJsonb, toIso, toIsoRequired, toNumber } from '@/lib/tutor/model/rows';

import { normalizeState, type SessionState } from './state';

export interface SessionRow extends Record<string, unknown> {
  id: string;
  account_id: string;
  learner_id: string;
  started_at: string | Date;
  ended_at: string | Date | null;
  minutes: number | string;
  mode: InputMode;
  cost_cents: number | string;
  thumbs: 'up' | 'down' | null;
  phase: SessionPhase;
  skill_id: string | null;
  coursework_id: string | null;
  summary: SessionSummary | string | null;
  state: unknown;
}

export interface SessionRecord {
  session: TutorSession;
  state: SessionState;
  band: AgeBand;
}

export function rowToSession(row: SessionRow): TutorSession {
  return {
    id: row.id,
    learnerId: row.learner_id,
    accountId: row.account_id,
    startedAt: toIsoRequired(row.started_at),
    endedAt: toIso(row.ended_at),
    minutes: toNumber(row.minutes),
    mode: row.mode,
    costCents: toNumber(row.cost_cents),
    thumbs: row.thumbs,
    phase: row.phase,
    skillId: row.skill_id,
    courseworkId: row.coursework_id,
    summary: parseJsonb<SessionSummary | null>(row.summary, null),
  };
}

/** Scoped read: a session id from another account or learner is null (404 at the route). */
export async function loadSession(
  db: Queryable,
  principal: Pick<Principal, 'accountId' | 'learnerId' | 'band'>,
  sessionId: string,
): Promise<SessionRecord | null> {
  if (!principal.learnerId) return null;
  const { rows } = await db.query<SessionRow & { age_band: AgeBand }>(
    `SELECT s.*, l.age_band FROM sessions s JOIN learners l ON l.id = s.learner_id
     WHERE s.id = $1 AND s.account_id = $2 AND s.learner_id = $3`,
    [sessionId, principal.accountId, principal.learnerId],
  );
  const row = rows[0];
  if (!row) return null;
  const session = rowToSession(row);
  const band = principal.band ?? row.age_band;
  const state = normalizeState(row.state, band, new Date(session.startedAt));
  return { session, state, band };
}

export async function saveSessionState(
  db: Queryable,
  sessionId: string,
  phase: SessionPhase,
  state: SessionState,
  extra: { skillId?: string | null; costCentsDelta?: number; endedAt?: Date | null } = {},
): Promise<void> {
  await db.query(
    `UPDATE sessions SET phase = $2, state = $3::jsonb,
       skill_id = CASE WHEN $4::text IS NULL THEN skill_id ELSE $4 END,
       cost_cents = cost_cents + $5,
       ended_at = CASE WHEN $6::timestamptz IS NULL THEN ended_at ELSE $6::timestamptz END
     WHERE id = $1`,
    [
      sessionId,
      phase,
      JSON.stringify(state),
      extra.skillId ?? null,
      Math.max(0, Math.round(extra.costCentsDelta ?? 0)),
      extra.endedAt ? extra.endedAt.toISOString() : null,
    ],
  );
}

interface TurnRow extends Record<string, unknown> {
  id: string;
  session_id: string;
  role: 'learner' | 'tutor';
  text: string;
  audio_ms: number | string | null;
  latency_ms: number | string | null;
  model: string | null;
  cost_cents: number | string;
  ts: string | Date;
}

export function rowToTurn(row: TurnRow): TurnRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    role: row.role,
    text: row.text,
    audioMs: row.audio_ms === null ? null : toNumber(row.audio_ms),
    latencyMs: row.latency_ms === null ? null : toNumber(row.latency_ms),
    model: row.model,
    costCents: toNumber(row.cost_cents),
    ts: toIsoRequired(row.ts),
  };
}

export async function listTurns(
  db: Queryable,
  sessionId: string,
  limit?: number,
): Promise<TurnRecord[]> {
  if (limit !== undefined) {
    const { rows } = await db.query<TurnRow>(
      `SELECT * FROM (SELECT * FROM turns WHERE session_id = $1 ORDER BY ts DESC, id DESC LIMIT $2) t ORDER BY ts ASC, id ASC`,
      [sessionId, limit],
    );
    return rows.map(rowToTurn);
  }
  const { rows } = await db.query<TurnRow>(
    `SELECT * FROM turns WHERE session_id = $1 ORDER BY ts ASC, id ASC`,
    [sessionId],
  );
  return rows.map(rowToTurn);
}
