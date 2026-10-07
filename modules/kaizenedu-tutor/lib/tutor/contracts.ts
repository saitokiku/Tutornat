/**
 * Shared contracts for the Natural Tutor product. Every product module (server
 * routes, the session UI, the voice client, billing, analytics) imports its
 * types from here so parallel work integrates without renegotiation.
 *
 * Spec references: §5.2 loop, §5.7 student model, §8.5 data model, R14 events.
 * Strategy references (docs/STRATEGY-INTEGRATION.md): working versus confirmed
 * mastery, append-only evidence, assisted-versus-unassisted labelling.
 */
import type { AgeBand, AttentionState } from '@/kaizen.config';
import type { Action } from '@/lib/types/action';

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

/** Who is acting. `parent` and `adult` are account holders; `learner` is a profile sign-in. */
export type Role = 'parent' | 'adult' | 'learner';

export interface Account {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  /** A guest account (D35): anonymous, cookie-only, placeholder email. */
  guest: boolean;
}

export type LearnerKind = 'self' | 'child' | 'teen';
export type LearnerStatus = 'active' | 'locked' | 'frozen';

export interface Learner {
  id: string;
  accountId: string;
  displayName: string;
  birthYear: number;
  band: AgeBand;
  status: LearnerStatus;
  kind: LearnerKind;
  /** Teen profiles sign in with their own name under the account; null otherwise. */
  loginName: string | null;
  createdAt: string;
}

/**
 * Server-derived identity for one request. `accountId` is the hard isolation
 * boundary (invariant a); `learnerId` is the active profile, null when a
 * parent is in the parent app without one selected.
 */
export interface Principal {
  accountId: string;
  learnerId: string | null;
  role: Role;
  band: AgeBand | null;
  /** The account_sessions row id, for sign-out and audit. */
  authSessionId: string;
  /**
   * Whether this account is on the operator's staff allowlist
   * (`TUTOR_STAFF_EMAILS`). Raises the plan and the guards; never removes
   * them. Resolved server-side from the session's account row, so a client
   * cannot assert it.
   */
  staff: boolean;
  /**
   * Whether this is a guest account (D35): created by `POST /api/tutor/guest`
   * behind a cookie with no email, name or password. Resolved from the
   * account row, never from the request. A guest is always a `learner`.
   */
  guest: boolean;
}

// ---------------------------------------------------------------------------
// Coursework (what the learner is working on) and sessions
// ---------------------------------------------------------------------------

export type CourseworkSource = 'upload' | 'text' | 'skill';
export type CourseworkStatus = 'ready' | 'extracting' | 'failed';

export interface CourseworkItem {
  id: string;
  learnerId: string;
  title: string;
  source: CourseworkSource;
  status: CourseworkStatus;
  /** Extracted or typed text, Markdown with `$…$` math. */
  text: string | null;
  skillIds: string[];
  createdAt: string;
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
  /** Written at WRAP (spec §5.2). */
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

// ---------------------------------------------------------------------------
// The turn API (SSE)
// ---------------------------------------------------------------------------

export type WhiteboardAction = Extract<Action, { type: `wb_${string}` }>;

export interface TurnRequest {
  sessionId: string;
  text: string;
  inputMode: InputMode;
  /** Client-minted id so a retried request is idempotent. */
  clientTurnId: string;
}

/**
 * `symbolic` is an expression in x graded by equivalence at sample points
 * (`lib/tutor/checks/symbolic.ts`); the learner types it like a short answer.
 */
export type CheckType = 'single' | 'multiple' | 'numeric' | 'short' | 'symbolic';

/**
 * The answer key of a typed item. `value` is the expected number, text or
 * expression; `accept` lists other forms that count; `wrong` names the
 * answers a known mistake produces, so a miss can be tagged as precisely as a
 * wrong multiple-choice pick; `keywords` (short answers) are the content words
 * a free-text answer must contain; `exact` (short answers) refuses a value
 * that is numerically equal but written in another form — "6/8" for "write
 * 6/8 in simplest form".
 */
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
  /** 0–1. */
  score: number;
  misconception: string | null;
  rationale: string;
  /** True when the learner received a hint, a worked example, or the answer before this check (strategy law 1). */
  assisted: boolean;
  latencyMs: number;
}

export type ReactionKind = 'smile' | 'not_quite' | 'neutral';

/** One SSE frame from POST /api/tutor/turn, `data: <json>\n\n`. */
export type TurnEvent =
  | { type: 'phase'; phase: SessionPhase; remainingMs: number }
  | { type: 'text_delta'; text: string }
  | { type: 'sentence'; index: number; text: string }
  | { type: 'action'; action: WhiteboardAction }
  | { type: 'check'; check: CheckPrompt }
  | { type: 'check_result'; result: CheckResult }
  | { type: 'reaction'; kind: ReactionKind }
  | { type: 'usage'; turnId: string; cents: number; sessionCents: number }
  | { type: 'done'; turnId: string; phase: SessionPhase }
  | { type: 'error'; code: string; message: string };

// ---------------------------------------------------------------------------
// Student model, evidence, misconceptions (spec §5.7 + strategy law 1)
// ---------------------------------------------------------------------------

/**
 * `mastered` is the spec's v0 estimate (EMA ≥ 0.8, ≥ 4 items, ≥ 2 sessions) and
 * may include assisted work. `confirmed` is granted only by an unassisted,
 * delayed check (≥ 24 h after `mastered`) and is the only status a parent
 * report calls mastery without the word "estimate".
 */
export type MasteryStatus = 'not_started' | 'in_progress' | 'mastered' | 'confirmed';

export interface SkillMastery {
  learnerId: string;
  skillId: string;
  estimate: number;
  nItems: number;
  nSessions: number;
  status: MasteryStatus;
  updatedAt: string;
  lastSeenAt: string | null;
  /** When the delayed unaided check becomes due; null until `mastered`. */
  nextCheckAt: string | null;
}

export interface MisconceptionState {
  learnerId: string;
  tag: string;
  status: 'open' | 'resolved';
  firstSeenAt: string;
  resolvedAt: string | null;
  /** Consecutive relevant items without the tag; resolves at 3 (spec §5.7). */
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

/** Append-only. The database forbids UPDATE and DELETE on this table. */
export interface EvidenceEvent {
  id: string;
  learnerId: string;
  sessionId: string | null;
  type: EvidenceType;
  assisted: boolean;
  payload: Record<string, unknown>;
  ts: string;
}

export interface LearnerProfile {
  subjects: string[];
  recurringMisconceptions: string[];
  pace: 'slow' | 'steady' | 'fast';
  explanationStylesThatWorked: string[];
  notes: string;
  updatedAt: string;
}

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

// ---------------------------------------------------------------------------
// Parent report (spec §5.9)
// ---------------------------------------------------------------------------

export interface ParentReportSkill {
  skillId: string;
  name: string;
  startingEstimate: number | null;
  currentEstimate: number;
  status: MasteryStatus;
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

// ---------------------------------------------------------------------------
// Voice and presence
// ---------------------------------------------------------------------------

export interface AsrResponse {
  text: string;
  seconds: number;
}

export type AvatarState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'at-whiteboard'
  | 'reacting';

export interface AvatarInputs {
  state: AvatarState;
  /** 0–1 mouth openness from playback amplitude or viseme weight. */
  mouth: number;
  gaze: { x: number; y: number };
  expression: 'neutral' | 'smile' | 'not-quite' | 'curious';
}

export interface AttentionSample {
  state: AttentionState;
  ts: number;
  source: 'camera' | 'visibility' | 'idle' | 'response';
}

// ---------------------------------------------------------------------------
// Analytics (spec R14), billing, settings
// ---------------------------------------------------------------------------

export const ANALYTICS_EVENTS = [
  'signup',
  'profile_created',
  'consent_recorded',
  'session_start',
  'session_end',
  'turn',
  'check_result',
  'mastery_change',
  'report_viewed',
  'thumbs',
  'upgrade',
  'cap_hit',
  'error',
] as const;
export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled';

export interface Entitlement {
  status: SubscriptionStatus;
  pooledMinutes: number;
  usedMinutes: number;
  trialMinutesUsed: number;
  /** Minutes still available this period. */
  remainingMinutes: number;
  warnAt80: boolean;
  /**
   * True for a guest account (D35): the pool is `GUEST.dailyMinutes` per UTC
   * day and `usedMinutes` counts today only. Absent or false for accounts.
   */
  guest?: boolean;
}

// ---------------------------------------------------------------------------
// Subjects and the planner (D35)
// ---------------------------------------------------------------------------

/**
 * The subjects a topic session can be about. Each has a synthetic skill id
 * (`S-<subject>`, `lib/tutor/graph/subjects.ts`) so checks, mastery rows and
 * WRAP keep working when a session is not on the fractions graph.
 */
export type SubjectId =
  | 'math'
  | 'reading'
  | 'writing'
  | 'science'
  | 'social-studies'
  | 'language'
  | 'test-prep'
  | 'computing'
  | 'other';

/** What a topic session is about: the subject and the learner's own words. */
export interface SessionTopic {
  subject: SubjectId;
  /** The learner's words, 1 to 300 characters. */
  text: string;
}

export type PlannerStatus = 'todo' | 'done';

/**
 * One thing on the learner's plate: an assignment, a test, a reading, with
 * an optional due date. Account- and learner-scoped like every other row.
 */
export interface PlannerItem {
  id: string;
  learnerId: string;
  title: string;
  subject: SubjectId;
  /** ISO date (YYYY-MM-DD) or null. */
  dueOn: string | null;
  status: PlannerStatus;
  /** Free text, up to 500 characters. */
  notes: string;
  createdAt: string;
  completedAt: string | null;
}

/** Fail-closed gates read from `app_settings`; an absent row means shut. */
export type AppSettingKey =
  | 'under13_gate'
  | 'camera_sensing_enabled'
  | 'billing_enabled'
  | 'ai_kill_switch'
  | 'beta_invites_open'
  /** Numeric. Overrides the band's thinkingPauseMs at runtime; see settings.ts. */
  | 'thinking_pause_ms';

// ---------------------------------------------------------------------------
// Route paths (single source of truth; route groups do not appear in URLs)
// ---------------------------------------------------------------------------

export const AUTH_API = {
  signUp: '/api/tutor/auth/sign-up',
  signIn: '/api/tutor/auth/sign-in',
  signOut: '/api/tutor/auth/sign-out',
  me: '/api/tutor/auth/me',
  selectLearner: '/api/tutor/auth/learner',
  teenSignIn: '/api/tutor/auth/teen-sign-in',
  /** POST an email; answers the same whether or not it has an account. */
  passwordResetRequest: '/api/tutor/auth/password-reset/request',
  /** POST the link's token and a new password; signs the account in. */
  passwordReset: '/api/tutor/auth/password-reset',
  /** POST a teen's sign-up; the parent gets the link that finishes it. */
  teenInvite: '/api/tutor/auth/teen-invite',
  /** GET ?t= reads the invitation without consuming it. */
  parentInvite: '/api/tutor/auth/parent-invite',
  /** POST the token (and, for a new parent, a name and password); attaches the teen. */
  parentInviteAccept: '/api/tutor/auth/parent-invite/accept',
} as const;

export const TUTOR_API = {
  session: '/api/tutor/session',
  turn: '/api/tutor/turn',
  tts: '/api/tutor/tts',
  asr: '/api/tutor/asr',
  check: '/api/tutor/check',
  wrap: '/api/tutor/wrap',
  problemExtract: '/api/tutor/problem-extract',
  coursework: '/api/tutor/coursework',
  progress: '/api/tutor/progress',
  attention: '/api/tutor/attention',
  flag: '/api/tutor/flag',
  /** POST one message to a person; works signed out. */
  support: '/api/tutor/support',
  /** GET ?t= from the link in a weekly report (turns it off, then shows the page); POST for one-click. */
  unsubscribe: '/api/tutor/email/unsubscribe',
  /** POST: start as a guest (D35). Creates the anonymous account and learner, sets the cookie, may start a session. */
  guest: '/api/tutor/guest',
  /** POST: delete everything this guest's cookie points at and clear the cookie. */
  guestForget: '/api/tutor/guest/forget',
  /** GET list, POST add, PATCH update, DELETE remove: the planner (D35). */
  planner: '/api/tutor/planner',
} as const;

/** Routes the platform's scheduler calls with `Authorization: Bearer $CRON_SECRET`; never a browser. */
export const CRON_API = {
  weeklyEmail: '/api/tutor/cron/weekly-email',
} as const;

export const PARENT_API = {
  learners: '/api/parent/learners',
  report: '/api/parent/report',
  transcripts: '/api/parent/transcripts',
  billing: '/api/parent/billing',
  consent: '/api/parent/consent',
  settings: '/api/parent/settings',
  data: '/api/parent/data',
} as const;

export const PRODUCT_ROUTES = {
  landing: '/welcome',
  signIn: '/sign-in',
  signUp: '/sign-up',
  forgotPassword: '/forgot-password',
  /** Reached only from the emailed link, which carries the token as `?t=`. */
  resetPassword: '/reset-password',
  /** The parent's half of a teen-started sign-up; also reached only from the emailed link. */
  parentInvite: '/parent-invite',
  learn: '/learn',
  session: (id: string) => `/session/${id}`,
  parent: '/parent',
  legalTerms: '/legal/terms',
  legalPrivacy: '/legal/privacy',
  legalAi: '/legal/ai',
  /** Attribution for the open source this is built on. Reached from the FAQ, not the nav. */
  legalCredits: '/legal/credits',
  /** The support inbox: one message to a person. In the footer of every public page. */
  support: '/support',
  /** Where the weekly report's opt-out link lands; `?state=off|invalid`. */
  unsubscribed: '/unsubscribed',
} as const;
