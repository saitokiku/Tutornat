/**
 * Engine contracts, the subset of KaizenEdu `lib/tutor/contracts.ts` (pinned
 * commit 20a971b4…) that the imported check/model/report closure uses. Voice,
 * presence, billing, analytics, routes and the SSE turn events are excluded.
 * Whiteboard actions are opaque here: the board is not part of E1.
 */
import type { AgeBand } from '@/lib/tutor/config';

export type Role = 'parent' | 'adult' | 'learner';

export interface Principal {
  accountId: string;
  learnerId: string | null;
  role: Role;
  band: AgeBand | null;
}

export type SessionPhase = 'greet' | 'intake' | 'diagnose' | 'work' | 'check' | 'wrap' | 'ended';
export type InputMode = 'voice' | 'text';

export interface TutorSession {
  id: string;
  learnerId: string;
  accountId: string;
  startedAt: string;
  endedAt: string | null;
  minutes: number;
  mode: InputMode;
  costCents: number;
  thumbs: 'up' | 'down' | null;
  phase: SessionPhase;
  skillId: string | null;
  courseworkId: string | null;
  summary: SessionSummary | null;
}

export interface SessionSummary {
  recap: string;
  practice: string[];
  tutorNote: string;
  skillsTouched: string[];
  checks: number;
  checksCorrect: number;
}

export interface TurnRecord {
  id: string;
  sessionId: string;
  role: 'learner' | 'tutor';
  text: string;
  audioMs: number | null;
  latencyMs: number | null;
  model: string | null;
  costCents: number;
  ts: string;
}

/** Opaque in this repository: the whiteboard is outside the E1 closure. */
export type WhiteboardAction = { type: `wb_${string}`; [key: string]: unknown };

export type CheckType = 'single' | 'multiple' | 'numeric' | 'short' | 'symbolic';

export interface AnswerSpec {
  value: number | string;
  tolerance?: number;
  units?: string;
  accept?: string[];
  wrong?: Array<{ value: number | string; misconception: string }>;
  keywords?: string[];
  exact?: boolean;
}

export interface CheckPrompt {
  checkId: string;
  skillId: string;
  type: CheckType;
  stem: string;
  options?: Array<{ id: string; text: string }>;
  /** Bank item id when the check comes from the reviewed bank; null when tutor-authored. */
  itemId: string | null;
}

export interface CheckResult {
  checkId: string;
  skillId: string;
  correct: boolean;
  score: number;
  misconception: string | null;
  rationale: string;
  /** True when the learner received a hint, a worked example, or the answer before this check. */
  assisted: boolean;
  latencyMs: number;
}

/**
 * Inherited status vocabulary. `mastered` is the practice estimate (EMA ≥ 0.8,
 * ≥ 4 items, ≥ 2 sessions) and may include assisted work. `confirmed` is the
 * inherited engine's 24-hour tier. Under E1 containment (SPEC v0.3 §3.1,
 * ADR-0042) nothing in this repository produces `confirmed`; a persisted
 * legacy `confirmed` row is read as `mastered` with `certification:
 * 'legacy_unverified'` (see model/student-model.ts `containStatus`).
 */
export type MasteryStatus = 'not_started' | 'in_progress' | 'mastered' | 'confirmed';

/**
 * What stands behind a displayed status. `none`: a practice estimate.
 * `legacy_unverified`: the persisted row says `confirmed` under the inherited
 * 24-hour rule, which SPEC §3.1 does not accept as qualifying evidence.
 * `independent`: qualifying evidence from the restricted assessment service —
 * no writer in this repository can produce it (E1 grants no certification).
 */
export type Certification = 'none' | 'legacy_unverified' | 'independent';

/** SPEC §3.1: the four evidence classes; only the last two are qualifying. */
export type EvidenceClass =
  | 'assisted-help'
  | 'corrections-practice'
  | 'unassisted-attempt'
  | 'delayed-retention';

export interface SkillMastery {
  learnerId: string;
  skillId: string;
  estimate: number;
  nItems: number;
  nSessions: number;
  status: MasteryStatus;
  certification: Certification;
  updatedAt: string;
  lastSeenAt: string | null;
  nextCheckAt: string | null;
}

export interface MisconceptionState {
  learnerId: string;
  tag: string;
  status: 'open' | 'resolved';
  firstSeenAt: string;
  resolvedAt: string | null;
  cleanStreak: number;
}

export type EvidenceType =
  | 'check_result'
  | 'hint'
  | 'turn'
  | 'diagnostic'
  | 'mastery_change'
  | 'observation'
  | 'session';

export interface SkillNode {
  id: string;
  name: string;
  prereqs: string[];
  tags: string[];
  slice: string;
}

export interface CheckItem {
  id: string;
  skillId: string;
  type: CheckType;
  stem: string;
  options: Array<{ text: string; correct: boolean; misconception?: string }> | null;
  answer: AnswerSpec | null;
  representation: 'bar' | 'number_line' | 'set' | 'symbolic' | 'word';
  band: '9-12' | '13-17' | 'both';
  source: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
}

export interface ParentReportSkill {
  skillId: string;
  name: string;
  startingEstimate: number | null;
  currentEstimate: number;
  status: MasteryStatus;
  certification: Certification;
}

export interface ParentReport {
  learnerId: string;
  weekStart: string;
  sessions: number;
  minutes: number;
  skills: ParentReportSkill[];
  misconceptionsOpen: string[];
  misconceptionsResolved: string[];
  nextSkill: { id: string; name: string } | null;
  sessionNotes: Array<{
    sessionId: string;
    date: string;
    note: string;
    thumbs: 'up' | 'down' | null;
  }>;
  attention: { attendingPct: number; recoveries: number } | null;
}
