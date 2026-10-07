/**
 * Session rows (spec §5.2, R7, R9; tutor-07, billing-24). Creation is gated
 * (locked or frozen profile, AI kill switch, zero remaining minutes), the
 * target is chosen server-side, and every read is scoped by account and
 * learner from the principal (invariant a).
 */
import { BANDS, type AgeBand } from '@/kaizen.config';
import { newId } from '@/lib/tutor/auth/session';
import { addUsedMinutes, getEntitlement } from '@/lib/tutor/billing/entitlement';
import type {
  Entitlement,
  InputMode,
  Principal,
  SessionPhase,
  SessionSummary,
  TurnRecord,
  TutorSession,
  SessionTopic,
} from '@/lib/tutor/contracts';
import type { Queryable } from '@/lib/tutor/db';
import { dueDelayedChecks, isBrandNew, selectNextSkill } from '@/lib/tutor/graph/next-skill';
import { isGraphSkillId, isSkillId, skillById } from '@/lib/tutor/graph/graph';
import { subjectSkillId } from '@/lib/tutor/graph/subjects';
import { ensureGraphSeeded } from '@/lib/tutor/graph/seed';
import { getNumberSetting } from '@/lib/tutor/settings';
import { listMasteryRows, toSkillMastery } from '@/lib/tutor/model/service';
import { parseJsonb, toIso, toIsoRequired, toNumber } from '@/lib/tutor/model/rows';
import { getAppSetting } from '@/lib/tutor/settings';
import type { CreateSessionRequest, CreateSessionResponse } from '@/lib/tutor/wire';

import { sittingClock, sittingStateFrom, type SittingState } from './sitting';
import { newDiagnostic } from './state-machine';
import {
  initialState,
  normalizeState,
  type DiagnosticState,
  type SessionState,
  type SessionTarget,
} from './state';

export type SessionGateCode = 'PROFILE_LOCKED' | 'AI_PAUSED' | 'CAP_REACHED';

export class SessionGateError extends Error {
  constructor(
    readonly code: SessionGateCode,
    readonly status: number,
    message: string,
    readonly entitlement: Entitlement | null = null,
  ) {
    super(message);
    this.name = 'SessionGateError';
  }
}

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
  /** The grade level a guest chose (D35), as stored on the learner row; null for account learners. */
  level: string | null;
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

interface LearnerRow extends Record<string, unknown> {
  id: string;
  status: string;
  age_band: AgeBand;
}

async function requireActiveLearner(db: Queryable, principal: Principal): Promise<LearnerRow> {
  const { rows } = await db.query<LearnerRow>(
    `SELECT id, status, age_band FROM learners WHERE id = $1 AND account_id = $2`,
    [principal.learnerId, principal.accountId],
  );
  const learner = rows[0];
  if (!learner) throw new SessionGateError('PROFILE_LOCKED', 403, 'This profile is not available.');
  if (learner.status !== 'active') {
    throw new SessionGateError(
      'PROFILE_LOCKED',
      403,
      learner.status === 'locked'
        ? 'This profile is locked until a parent completes consent.'
        : 'This profile is frozen.',
    );
  }
  return learner;
}

interface CourseworkRow extends Record<string, unknown> {
  id: string;
  skill_ids: string[] | string | null;
  status: string;
}

export async function createSession(
  db: Queryable,
  principal: Principal,
  body: CreateSessionRequest,
  now: Date = new Date(),
): Promise<CreateSessionResponse> {
  if (!principal.learnerId)
    throw new SessionGateError('PROFILE_LOCKED', 403, 'Choose a learner first.');
  const learner = await requireActiveLearner(db, principal);
  // Strategy law 3: the band is the learner row's band, never the request's.
  const band: AgeBand = principal.band ?? learner.age_band;
  if (await getAppSetting(db, 'ai_kill_switch')) {
    throw new SessionGateError('AI_PAUSED', 503, 'The tutor is paused right now. Try again later.');
  }
  const entitlement = await getEntitlement(db, principal.accountId);
  if (entitlement.remainingMinutes <= 0) {
    throw new SessionGateError(
      'CAP_REACHED',
      403,
      'No tutoring minutes are left on this plan.',
      entitlement,
    );
  }
  await ensureGraphSeeded(db);

  const mastery = await listMasteryRows(db, principal.accountId, principal.learnerId);
  let target: SessionTarget = 'skill';
  let skillId: string | null = null;
  let courseworkId: string | null = null;
  let delayedCheck: { skillId: string; dueAt: string } | null = null;
  let diagnostic: DiagnosticState | null = null;
  // An open session (D36) is a topic session whose words are not known yet:
  // the catch-all subject until the tutor's `[[topic]]` tag names one.
  const topic: SessionTopic | null =
    body.topic ?? (body.open && !body.courseworkId ? { subject: 'other', text: '' } : null);

  if (body.courseworkId) {
    const { rows } = await db.query<CourseworkRow>(
      `SELECT id, skill_ids, status FROM coursework WHERE id = $1 AND account_id = $2 AND learner_id = $3`,
      [body.courseworkId, principal.accountId, principal.learnerId],
    );
    const coursework = rows[0];
    if (!coursework) throw new SessionGateError('PROFILE_LOCKED', 404, 'Coursework not found.');
    target = 'coursework';
    courseworkId = coursework.id;
    const ids = parseJsonb<string[]>(coursework.skill_ids, []).filter(isSkillId);
    // Coursework off the fractions graph still needs a skill key so checks
    // are offered and recorded (D35): the subject the learner named, else
    // the catch-all subject.
    skillId = ids[0] ?? subjectSkillId(topic?.subject ?? 'other');
  } else if (topic) {
    // A topic session (D35): the learner's own subject and words. No
    // diagnostic and no next-skill selection; checks are tutor-authored
    // against the subject's synthetic skill.
    target = 'topic';
    skillId = subjectSkillId(topic.subject);
  } else {
    const requested = body.skillId && isGraphSkillId(body.skillId) ? body.skillId : null;
    const due = dueDelayedChecks(mastery.map(toSkillMastery), now);
    if (isBrandNew(mastery)) {
      target = 'diagnose';
      diagnostic = newDiagnostic(requested ? skillById(requested)?.ordinal : undefined);
      skillId = requested ?? 'F1';
    } else if (requested) {
      target = 'skill';
      skillId = requested;
    } else if (due.length > 0) {
      target = 'delayed_check';
      delayedCheck = due[0]!;
      skillId = due[0]!.skillId;
    } else {
      target = 'skill';
      skillId = selectNextSkill(mastery.map(toSkillMastery))?.id ?? null;
    }
  }

  const id = newId('ses');
  const sitting = band === 'adult' ? null : await currentSitting(db, principal, now);
  const state = initialState({
    band,
    target,
    startedAt: now,
    skillId,
    diagnostic,
    delayedCheck,
    sitting,
    topic: target === 'topic' ? topic : null,
  });
  await db.query(
    `INSERT INTO sessions (id, account_id, learner_id, started_at, mode, phase, skill_id, coursework_id, state)
     VALUES ($1, $2, $3, $4, $5, 'greet', $6, $7, $8::jsonb)`,
    [
      id,
      principal.accountId,
      principal.learnerId,
      now.toISOString(),
      body.mode === 'voice' ? 'voice' : 'text',
      skillId,
      courseworkId,
      JSON.stringify(state),
    ],
  );
  const record = await loadSession(db, principal, id);
  if (!record) throw new Error('session vanished after insert');
  return {
    session: record.session,
    entitlement,
    band,
    sessionMinutes: BANDS[band].sessionMinutes,
    thinkingPauseMs: await thinkingPauseFor(db, band),
  };
}

/**
 * How long the microphone waits through silence before calling the turn over.
 * The band sets the default — younger learners pause inside sentences — and a
 * single `thinking_pause_ms` row overrides every band at runtime, so the number
 * can be tuned against real sessions without a deploy. Bounded either way: too
 * short cuts a thinking child off, too long feels broken.
 */
/** How far back the sitting clock looks; a sitting cannot be older than a day without a gap. */
const SITTING_LOOKBACK_MS = 24 * 60 * 60_000;
const SITTING_MAX_TURNS = 600;

/**
 * The sitting a new session for a known minor continues (reference §5, SB
 * 243): reconstructed from the learner's turn times across sessions in the
 * last day, so three sessions in an evening add up the way one long one
 * would. The engine gives the break reminder when a turn crosses a
 * three-hour boundary the sitting has not announced yet.
 */
async function currentSitting(
  db: Queryable,
  principal: Principal,
  now: Date,
): Promise<SittingState> {
  const { rows } = await db.query<{ ts: string | Date }>(
    `SELECT t.ts FROM turns t
     JOIN sessions s ON s.id = t.session_id
     WHERE s.account_id = $1 AND s.learner_id = $2 AND t.ts > $3
     ORDER BY t.ts DESC LIMIT $4`,
    [
      principal.accountId,
      principal.learnerId,
      new Date(now.getTime() - SITTING_LOOKBACK_MS).toISOString(),
      SITTING_MAX_TURNS,
    ],
  );
  const times = rows.map((row) => new Date(row.ts).getTime());
  return sittingStateFrom(sittingClock(times, { now: now.getTime() }));
}

export async function thinkingPauseFor(db: Queryable, band: AgeBand): Promise<number> {
  return getNumberSetting(db, 'thinking_pause_ms', BANDS[band].thinkingPauseMs, {
    min: 300,
    max: 4_000,
  });
}

/** Scoped read: a session id from another account or learner is null (404 at the route). */
export async function loadSession(
  db: Queryable,
  principal: Pick<Principal, 'accountId' | 'learnerId' | 'band'>,
  sessionId: string,
): Promise<SessionRecord | null> {
  if (!principal.learnerId) return null;
  const { rows } = await db.query<SessionRow & { age_band: AgeBand; level: string | null }>(
    `SELECT s.*, l.age_band, l.level FROM sessions s JOIN learners l ON l.id = s.learner_id
     WHERE s.id = $1 AND s.account_id = $2 AND s.learner_id = $3`,
    [sessionId, principal.accountId, principal.learnerId],
  );
  const row = rows[0];
  if (!row) return null;
  const session = rowToSession(row);
  const band = principal.band ?? row.age_band;
  const state = normalizeState(row.state, band, new Date(session.startedAt));
  return { session, state, band, level: row.level ?? null };
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

/** Whole minutes since the last metering point; settles them against the entitlement (billing-24). */
export async function meterMinutes(
  db: Queryable,
  record: SessionRecord,
  now: Date,
  options: { settleRemainder?: boolean } = {},
): Promise<{ entitlement: Entitlement; minutes: number; state: SessionState }> {
  const last = new Date(record.state.lastMeteredAt).getTime();
  const elapsedMs = Math.max(0, now.getTime() - last);
  const whole = options.settleRemainder
    ? Math.round(elapsedMs / 60_000)
    : Math.floor(elapsedMs / 60_000);
  const state: SessionState = {
    ...record.state,
    lastMeteredAt: options.settleRemainder
      ? now.toISOString()
      : new Date(last + whole * 60_000).toISOString(),
  };
  const entitlement =
    whole > 0
      ? await addUsedMinutes(db, record.session.accountId, whole)
      : await getEntitlement(db, record.session.accountId);
  if (whole > 0) {
    await db.query(`UPDATE sessions SET minutes = minutes + $2 WHERE id = $1`, [
      record.session.id,
      whole,
    ]);
  }
  return { entitlement, minutes: whole, state };
}

export async function updateSession(
  db: Queryable,
  principal: Principal,
  input: { sessionId: string; action: 'end' | 'thumbs' | 'heartbeat'; thumbs?: 'up' | 'down' },
  now: Date = new Date(),
): Promise<{ session: TutorSession; entitlement: Entitlement } | null> {
  const record = await loadSession(db, principal, input.sessionId);
  if (!record) return null;
  if (input.action === 'thumbs') {
    if (input.thumbs !== 'up' && input.thumbs !== 'down')
      throw new RangeError('thumbs must be up or down');
    await db.query(`UPDATE sessions SET thumbs = $2 WHERE id = $1`, [
      record.session.id,
      input.thumbs,
    ]);
    const entitlement = await getEntitlement(db, principal.accountId);
    const reloaded = await loadSession(db, principal, input.sessionId);
    return { session: reloaded!.session, entitlement };
  }
  if (record.session.phase === 'ended') {
    const entitlement = await getEntitlement(db, principal.accountId);
    return { session: record.session, entitlement };
  }
  if (input.action === 'heartbeat') {
    const metered = await meterMinutes(db, record, now);
    await saveSessionState(db, record.session.id, record.session.phase, metered.state);
    const reloaded = await loadSession(db, principal, input.sessionId);
    return { session: reloaded!.session, entitlement: metered.entitlement };
  }
  const metered = await meterMinutes(db, record, now, { settleRemainder: true });
  await saveSessionState(db, record.session.id, 'ended', metered.state, { endedAt: now });
  const reloaded = await loadSession(db, principal, input.sessionId);
  return { session: reloaded!.session, entitlement: metered.entitlement };
}
