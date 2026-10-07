/**
 * The per-session state persisted in `sessions.state` (JSONB) next to
 * `sessions.phase`. Everything the turn engine, the check route, and WRAP need
 * between requests lives here; nothing here is audio, media, or a name.
 */
import { BANDS, type AgeBand } from '@/kaizen.config';
import type {
  AnswerSpec,
  CheckResult,
  CheckType,
  SessionTopic,
  WhiteboardAction,
} from '@/lib/tutor/contracts';

import type { SittingState } from './sitting';

/** `topic` (D35): the learner's own subject and words, off the fractions graph. */
export type SessionTarget = 'coursework' | 'skill' | 'delayed_check' | 'diagnose' | 'topic';

export interface AnswerKey {
  type: CheckType;
  options: Array<{
    id: string;
    text: string;
    correct: boolean;
    misconception: string | null;
  }> | null;
  answer: AnswerSpec | null;
}

export interface PendingCheckState {
  checkId: string;
  skillId: string;
  type: CheckType;
  stem: string;
  /** What the client sees; the key stays server-side. */
  options: Array<{ id: string; text: string }> | null;
  key: AnswerKey;
  itemId: string | null;
  issuedAt: string;
  issuedTurnId: string | null;
  diagnostic: boolean;
  /** Tags the item is relevant to (skill tags plus its distractor tags). */
  relevantTags: string[];
  representation: string | null;
}

export interface DiagnosticItemRecord {
  itemId: string | null;
  skillId: string;
  correct: boolean;
  tag: string | null;
  representation: string | null;
  answer: string;
  stem: string;
}

export interface DiagnosticState {
  max: number;
  /** Binary-search bounds over skill ordinals. */
  low: number;
  high: number;
  /** The first probe when the learner asked for a specific skill; null means the graph midpoint. */
  firstOrdinal: number | null;
  asked: DiagnosticItemRecord[];
  placedSkillId: string | null;
  done: boolean;
}

export interface CoachState {
  attempts: number;
  showMeUnlocked: boolean;
  answerShown: boolean;
  askedForAnswer: boolean;
}

export interface TimerState {
  startedAt: string;
  deadlineAt: string;
  extended: boolean;
  softContinueOffered: boolean;
}

export interface SessionState {
  version: 1;
  band: AgeBand;
  target: SessionTarget;
  board: WhiteboardAction[];
  pendingCheck: PendingCheckState | null;
  lastCheckResult: (CheckResult & { stem: string | null }) | null;
  checks: { count: number; correct: number };
  hints: number;
  coach: CoachState;
  diagnostic: DiagnosticState | null;
  timer: TimerState;
  lastCheckAt: string;
  turnsSinceCheck: number;
  lastMeteredAt: string;
  learnerTurns: number;
  reteachUsed: string[];
  delayedCheck: { skillId: string; dueAt: string } | null;
  usedItemIds: string[];
  skillsTouched: string[];
  crisis: boolean;
  droppedActions: number;
  /** The sitting this session continues (known minors only; reference §5, SB 243); null for an adult. */
  sitting: SittingState | null;
  /** What a topic session is about (D35); null for every other target. */
  topic: SessionTopic | null;
}

export const SOFT_CONTINUE_MINUTES = 5;
export const DIAGNOSTIC_MAX_ITEMS = 4;

export function initialState(input: {
  band: AgeBand;
  target: SessionTarget;
  startedAt: Date;
  skillId: string | null;
  diagnostic: DiagnosticState | null;
  delayedCheck: { skillId: string; dueAt: string } | null;
  sitting?: SittingState | null;
  topic?: SessionTopic | null;
}): SessionState {
  const startedAt = input.startedAt.toISOString();
  const deadlineAt = new Date(
    input.startedAt.getTime() + BANDS[input.band].sessionMinutes * 60_000,
  ).toISOString();
  return {
    version: 1,
    band: input.band,
    target: input.target,
    board: [],
    pendingCheck: null,
    lastCheckResult: null,
    checks: { count: 0, correct: 0 },
    hints: 0,
    coach: { attempts: 0, showMeUnlocked: false, answerShown: false, askedForAnswer: false },
    diagnostic: input.diagnostic,
    timer: { startedAt, deadlineAt, extended: false, softContinueOffered: false },
    lastCheckAt: startedAt,
    turnsSinceCheck: 0,
    lastMeteredAt: startedAt,
    learnerTurns: 0,
    reteachUsed: [],
    delayedCheck: input.delayedCheck,
    usedItemIds: [],
    skillsTouched: input.skillId ? [input.skillId] : [],
    crisis: false,
    droppedActions: 0,
    sitting: input.sitting ?? null,
    topic: input.topic ?? null,
  };
}

function normalizeTopic(raw: unknown): SessionTopic | null {
  if (!raw || typeof raw !== 'object') return null;
  const { subject, text } = raw as Partial<SessionTopic>;
  if (typeof subject !== 'string' || typeof text !== 'string') return null;
  // An open session (D36) carries the subject and no words yet: the tutor
  // asks, and a `[[topic]]` tag fills the words in.
  return { subject, text: text.trim().slice(0, 300) };
}

function normalizeSitting(raw: unknown): SittingState | null {
  if (!raw || typeof raw !== 'object') return null;
  const { startedAt, remindersGiven } = raw as Partial<SittingState>;
  if (typeof startedAt !== 'string' || Number.isNaN(Date.parse(startedAt))) return null;
  return {
    startedAt,
    remindersGiven:
      typeof remindersGiven === 'number' && Number.isFinite(remindersGiven)
        ? Math.max(0, Math.floor(remindersGiven))
        : 0,
  };
}

/** Repairs a state read from the database (older rows or a hand-edited row never crash a session). */
export function normalizeState(raw: unknown, band: AgeBand, startedAt: Date): SessionState {
  const base = initialState({
    band,
    target: 'skill',
    startedAt,
    skillId: null,
    diagnostic: null,
    delayedCheck: null,
  });
  if (!raw || typeof raw !== 'object') return base;
  const partial = raw as Partial<SessionState>;
  return {
    ...base,
    ...partial,
    band,
    board: Array.isArray(partial.board) ? partial.board : [],
    checks: partial.checks ?? base.checks,
    coach: { ...base.coach, ...(partial.coach ?? {}) },
    timer: { ...base.timer, ...(partial.timer ?? {}) },
    reteachUsed: Array.isArray(partial.reteachUsed) ? partial.reteachUsed : [],
    usedItemIds: Array.isArray(partial.usedItemIds) ? partial.usedItemIds : [],
    skillsTouched: Array.isArray(partial.skillsTouched) ? partial.skillsTouched : [],
    sitting: normalizeSitting(partial.sitting),
    topic: normalizeTopic(partial.topic),
  };
}
