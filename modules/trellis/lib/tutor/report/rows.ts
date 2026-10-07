/**
 * Row-to-contract mappers for the tables the parent report, the transcript
 * reader, and the data export read: sessions, turns, skill_mastery,
 * misconceptions (spec §8.5). Pure; the writers of these tables live in the
 * session and student-model modules.
 */
import { toIso, toIsoOrNull } from '@/lib/tutor/accounts/rows';
import type {
  Certification,
  InputMode,
  MasteryStatus,
  MisconceptionState,
  SessionPhase,
  SessionSummary,
  SkillMastery,
  TurnRecord,
  TutorSession,
} from '@/lib/tutor/contracts';
import { containStatus } from '@/lib/tutor/model/student-model';

export interface SessionRow extends Record<string, unknown> {
  id: string;
  account_id: string;
  learner_id: string;
  started_at: string | Date;
  ended_at: string | Date | null;
  minutes: number | string;
  mode: string;
  cost_cents: number | string;
  thumbs: string | null;
  phase: string;
  skill_id: string | null;
  coursework_id: string | null;
  summary: unknown;
}

export const SESSION_COLUMNS =
  'id, account_id, learner_id, started_at, ended_at, minutes, mode, cost_cents, thumbs, phase, skill_id, coursework_id, summary';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

/** Tolerates a JSON string (text column) as well as parsed jsonb; anything malformed reads as null. */
export function parseSessionSummary(value: unknown): SessionSummary | null {
  let raw = value;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!isRecord(raw)) return null;
  return {
    recap: typeof raw.recap === 'string' ? raw.recap : '',
    practice: stringList(raw.practice),
    tutorNote: typeof raw.tutorNote === 'string' ? raw.tutorNote : '',
    skillsTouched: stringList(raw.skillsTouched),
    checks: Number(raw.checks ?? 0),
    checksCorrect: Number(raw.checksCorrect ?? 0),
  };
}

function thumbs(value: string | null): 'up' | 'down' | null {
  return value === 'up' || value === 'down' ? value : null;
}

export function toTutorSession(row: SessionRow): TutorSession {
  return {
    id: row.id,
    learnerId: row.learner_id,
    accountId: row.account_id,
    startedAt: toIso(row.started_at),
    endedAt: toIsoOrNull(row.ended_at),
    minutes: Number(row.minutes),
    mode: row.mode === 'voice' ? 'voice' : ('text' satisfies InputMode),
    costCents: Number(row.cost_cents),
    thumbs: thumbs(row.thumbs),
    phase: row.phase as SessionPhase,
    skillId: row.skill_id,
    courseworkId: row.coursework_id,
    summary: parseSessionSummary(row.summary),
  };
}

export interface TurnRow extends Record<string, unknown> {
  id: string;
  session_id: string;
  role: string;
  text: string;
  audio_ms: number | string | null;
  latency_ms: number | string | null;
  model: string | null;
  cost_cents: number | string;
  ts: string | Date;
}

export const TURN_COLUMNS =
  'id, session_id, role, text, audio_ms, latency_ms, model, cost_cents, ts';

export function toTurnRecord(row: TurnRow): TurnRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    role: row.role === 'tutor' ? 'tutor' : 'learner',
    text: row.text,
    audioMs: row.audio_ms == null ? null : Number(row.audio_ms),
    latencyMs: row.latency_ms == null ? null : Number(row.latency_ms),
    model: row.model,
    costCents: Number(row.cost_cents),
    ts: toIso(row.ts),
  };
}

export interface MasteryRow extends Record<string, unknown> {
  learner_id: string;
  skill_id: string;
  estimate: number | string;
  n_items: number | string;
  n_sessions: number | string;
  status: string;
  updated_at: string | Date;
  last_seen_at: string | Date | null;
  next_check_at: string | Date | null;
}

export const MASTERY_COLUMNS =
  'learner_id, skill_id, estimate, n_items, n_sessions, status, updated_at, last_seen_at, next_check_at';

export const MASTERY_STATUSES: readonly MasteryStatus[] = [
  'not_started',
  'in_progress',
  'mastered',
  'confirmed',
];

/** Stored text → displayed status. E1: a legacy `confirmed` reads as `mastered` (see `certificationOf`). */
export function masteryStatus(value: string): MasteryStatus {
  const stored = (MASTERY_STATUSES as readonly string[]).includes(value)
    ? (value as MasteryStatus)
    : 'not_started';
  return containStatus(stored).status;
}

/** What stands behind a stored status text; `legacy_unverified` for the inherited `confirmed`. */
export function certificationOf(value: string): Certification {
  const stored = (MASTERY_STATUSES as readonly string[]).includes(value)
    ? (value as MasteryStatus)
    : 'not_started';
  return containStatus(stored).certification;
}

export function toSkillMastery(row: MasteryRow): SkillMastery {
  return {
    learnerId: row.learner_id,
    skillId: row.skill_id,
    estimate: Number(row.estimate),
    nItems: Number(row.n_items),
    nSessions: Number(row.n_sessions),
    status: masteryStatus(row.status),
    certification: certificationOf(row.status),
    updatedAt: toIso(row.updated_at),
    lastSeenAt: toIsoOrNull(row.last_seen_at),
    nextCheckAt: toIsoOrNull(row.next_check_at),
  };
}

export interface MisconceptionRow extends Record<string, unknown> {
  learner_id: string;
  tag: string;
  status: string;
  first_seen_at: string | Date;
  resolved_at: string | Date | null;
  clean_streak: number | string;
}

export const MISCONCEPTION_COLUMNS =
  'learner_id, tag, status, first_seen_at, resolved_at, clean_streak';

export function toMisconceptionState(row: MisconceptionRow): MisconceptionState {
  return {
    learnerId: row.learner_id,
    tag: row.tag,
    status: row.status === 'resolved' ? 'resolved' : 'open',
    firstSeenAt: toIso(row.first_seen_at),
    resolvedAt: toIsoOrNull(row.resolved_at),
    cleanStreak: Number(row.clean_streak),
  };
}
