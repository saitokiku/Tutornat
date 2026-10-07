/**
 * Wire contracts: the JSON bodies of every product API route. Server routes
 * validate their request against these shapes and answer exactly these
 * responses; client code types its fetches with them. Route paths live in
 * `contracts.ts` (AUTH_API, TUTOR_API, PARENT_API).
 *
 * Every success is `{ success: true, ...payload }` (lib/server/api-response
 * `apiSuccess`); every failure is `{ success: false, errorCode, error }`
 * (`apiError`, or the helpers in lib/tutor/auth/principal). The turn route is
 * the one exception: it streams `text/event-stream` frames, each
 * `data: <TurnEvent JSON>\n\n`.
 */
import type { AgeBand, AttentionState } from '@/kaizen.config';

import type { GuestLevelId } from '@/kaizen.config';

import type {
  Account,
  AttentionSample,
  CheckResult,
  CourseworkItem,
  Entitlement,
  InputMode,
  Learner,
  MisconceptionState,
  ParentReport,
  PlannerItem,
  PlannerStatus,
  Principal,
  SessionSummary,
  SessionTopic,
  SkillMastery,
  SkillNode,
  SubjectId,
  SubscriptionStatus,
  TurnRecord,
  TutorSession,
  WhiteboardAction,
} from './contracts';

export interface ApiFailure {
  success: false;
  errorCode: string;
  error: string;
}
export type ApiResult<T> = ({ success: true } & T) | ApiFailure;

/** `guest` is true for the anonymous account guest mode creates (D35); the email is then a placeholder nobody can mail. */
export type AccountSummary = Pick<Account, 'id' | 'email' | 'displayName'> & { guest: boolean };
export type PrincipalSummary = Pick<Principal, 'learnerId' | 'role' | 'band'>;

// ---------------------------------------------------------------------------
// AUTH_API
// ---------------------------------------------------------------------------

/** POST sign-up. `birthYear` is required when `kind` is `adult` (neutral age screen, R10). */
export interface SignUpRequest {
  email: string;
  password: string;
  displayName: string;
  kind: 'parent' | 'adult';
  birthYear?: number;
}
export interface SessionStateResponse {
  account: AccountSummary;
  principal: PrincipalSummary;
  learners: Learner[];
  /** The selected learner, null when none is selected. */
  learner: Learner | null;
}
export type SignUpResponse = SessionStateResponse;
export interface SignInRequest {
  email: string;
  password: string;
}
export type SignInResponse = SessionStateResponse;
/** GET me. */
export type MeResponse = SessionStateResponse;
/** POST learner: select the active learner profile for this auth session. */
export interface SelectLearnerRequest {
  learnerId: string;
}
export interface SelectLearnerResponse {
  learner: Learner;
  principal: PrincipalSummary;
}
/** POST teen-sign-in: a teen profile signs in with its own login name. */
export interface TeenSignInRequest {
  loginName: string;
  password: string;
}
export type TeenSignInResponse = SessionStateResponse;
/** POST password-reset/request: an address, and nothing about whether it is known. */
export interface RequestPasswordResetRequest {
  email: string;
}
export interface RequestPasswordResetResponse {
  /**
   * `sent` whether or not the address has an account, so the form cannot be
   * used to list who is registered; `not_configured` when this deploy has no
   * email sender at all; `failed` when the sender refused just now.
   */
  delivery: 'sent' | 'not_configured' | 'failed';
  /** The sentence to show, written for the person at the form. */
  message: string;
}
/** POST password-reset: the link's token and the new password; signs the account in. */
export interface ResetPasswordRequest {
  token: string;
  password: string;
}
export type ResetPasswordResponse = SessionStateResponse;
/**
 * POST teen-invite: a 13-to-17-year-old starts sign-up (reference §3, D30).
 * No email is collected from the teen; the parent's address receives the
 * invitation and the account is created when the parent finishes.
 */
export interface TeenInviteRequest {
  displayName: string;
  birthYear: number;
  loginName: string;
  password: string;
  parentEmail: string;
}
export interface TeenInviteResponse {
  /** `sent`, `not_configured` (this deploy cannot send email), or `failed`. */
  delivery: 'sent' | 'not_configured' | 'failed';
  message: string;
  /** The login name as stored, for the teen to keep. */
  loginName: string;
}
/** GET parent-invite?t=: what the link is for, without consuming it. */
export interface ParentInviteResponse {
  teen: { displayName: string; loginName: string; band: AgeBand };
  parentEmail: string;
  /** An account with the parent's email already exists: sign in to attach the profile. */
  existingAccount: boolean;
  expiresAt: string;
}
/**
 * POST parent-invite/accept. Anonymous: `displayName` and `password` create
 * the parent account around the profile. Signed in as the invited address:
 * neither is needed and the profile attaches to that account. `loginName`
 * replaces the teen's choice only when it was taken in the meantime.
 */
export interface AcceptParentInviteRequest {
  token: string;
  displayName?: string;
  password?: string;
  loginName?: string;
}
export interface AcceptParentInviteResponse extends SessionStateResponse {
  teen: Learner;
}

// ---------------------------------------------------------------------------
// PARENT_API
// ---------------------------------------------------------------------------

export interface ListLearnersResponse {
  learners: Learner[];
  /** `under13_gate` from app_settings; false means child profiles are created locked. */
  under13Open: boolean;
}
/** POST learners. `loginName` and `password` are required for teen profiles. */
export interface CreateLearnerRequest {
  displayName: string;
  birthYear: number;
  loginName?: string;
  password?: string;
}
export interface CreateLearnerResponse {
  learner: Learner;
  /** True when the profile was created locked (under 13 with the gate shut). */
  locked: boolean;
}
/** PATCH learners. */
export interface UpdateLearnerRequest {
  learnerId: string;
  displayName?: string;
  loginName?: string;
  password?: string;
}
export interface UpdateLearnerResponse {
  learner: Learner;
}
/** DELETE learners: files a deletion request and freezes the profile. */
export interface DeleteLearnerRequest {
  learnerId: string;
}
export interface DeleteLearnerResponse {
  deletionRequestId: string;
  completesBy: string;
}

/** GET report?learnerId= */
export interface ReportResponse {
  report: ParentReport;
  /** Strategy law 2: every generated sentence carries this label. */
  generatedLabel: string;
}

/** GET transcripts?learnerId=&sessionId= (sessionId optional). */
export interface TranscriptsResponse {
  sessions: TutorSession[];
  /** Turns of `sessionId`, null when no session was requested. */
  turns: TurnRecord[] | null;
}

/** GET billing. */
export interface BillingStatusResponse {
  /** `billing_enabled` from app_settings AND Stripe keys present. */
  billingEnabled: boolean;
  /** Stripe keys present at all (D19 "not configured" state when false). */
  configured: boolean;
  entitlement: Entitlement;
  plan: {
    priceCentsMonthly: number;
    learnerProfiles: number;
    pooledMinutesMonthly: number;
    trialMinutes: number;
  };
  subscription: {
    status: SubscriptionStatus;
    currentPeriodEnd: string | null;
  };
}
/** POST billing. */
export interface BillingActionRequest {
  action: 'checkout' | 'portal';
}
export interface BillingActionResponse {
  url: string;
}

export interface ConsentRecord {
  id: string;
  learnerId: string;
  method: string;
  noticeVersion: string;
  policyVersion: string;
  camera: boolean;
  grantedAt: string;
  revokedAt: string | null;
}
/** GET consent?learnerId= (learnerId optional: all learners of the account). */
export interface ListConsentsResponse {
  consents: ConsentRecord[];
}
/** POST consent. */
export interface CreateConsentRequest {
  learnerId: string;
  camera: boolean;
  noticeVersion: string;
  policyVersion: string;
  /** `parent_invitation` is written by the server when a parent finishes a teen's sign-up; the parent route accepts the other two. */
  method: 'checkbox' | 'checkbox_card' | 'parent_invitation';
}
export interface CreateConsentResponse {
  consent: ConsentRecord;
  learner: Learner;
}
/** DELETE consent: revoke, which freezes the profile (R16). */
export interface RevokeConsentRequest {
  learnerId: string;
}
export interface RevokeConsentResponse {
  learner: Learner;
}

export interface ParentSettings {
  cameraSensing: boolean;
  /** Recovery-ladder steps the parent switched off (spec §5.10 C). */
  recoveryStepsDisabled: number[];
  weeklyEmail: boolean;
}
/** GET settings. */
export interface SettingsResponse {
  settings: ParentSettings;
  gates: {
    under13Open: boolean;
    cameraSensingEnabled: boolean;
    billingEnabled: boolean;
  };
}
/** PATCH settings. */
export type UpdateSettingsRequest = Partial<ParentSettings>;
export type UpdateSettingsResponse = SettingsResponse;

/** GET data?learnerId= : the export (R16 review/export). */
export interface DataExportResponse {
  learner: Learner;
  sessions: TutorSession[];
  turns: TurnRecord[];
  mastery: SkillMastery[];
  misconceptions: MisconceptionState[];
  evidence: Array<Record<string, unknown>>;
  consents: ConsentRecord[];
  exportedAt: string;
}
/** POST data: deletion. `learnerId: null` deletes the whole account. */
export interface DataDeleteRequest {
  learnerId: string | null;
}
export interface DataDeleteResponse {
  deletionRequestId: string;
  completesBy: string;
}

// ---------------------------------------------------------------------------
// TUTOR_API
// ---------------------------------------------------------------------------

/** POST session. The learner comes from the principal, never from the body. */
export interface CreateSessionRequest {
  mode: InputMode;
  courseworkId?: string | null;
  skillId?: string | null;
  /**
   * A topic session (D35): the learner's own subject and words. Wins over
   * `skillId`; ignored when `courseworkId` is set. No diagnostic runs, checks
   * are tutor-authored against the subject's synthetic skill.
   */
  topic?: SessionTopic | null;
  /**
   * An open session (D36): no subject and no words yet. The tutor asks what
   * the learner is working on and sets the topic with a `[[topic]]` tag.
   * Ignored when `topic` or `courseworkId` is set.
   */
  open?: boolean;
}
export interface CreateSessionResponse {
  session: TutorSession;
  entitlement: Entitlement;
  band: AgeBand;
  /** Band default from kaizen.config BANDS, in minutes. */
  sessionMinutes: number;
  /**
   * Silence the microphone waits through before deciding the learner has
   * stopped. Sent per session because it is band-dependent and operator
   * tunable (`thinking_pause_ms`), so the client must not hardcode it.
   */
  thinkingPauseMs: number;
}
/** GET session?id= */
export interface GetSessionResponse {
  session: TutorSession;
  turns: TurnRecord[];
  /** Whiteboard actions applied so far, for replay after a reload. */
  board: WhiteboardAction[];
}
/** PATCH session. `heartbeat` carries the minutes elapsed for metering. */
export interface UpdateSessionRequest {
  sessionId: string;
  action: 'end' | 'thumbs' | 'heartbeat';
  thumbs?: 'up' | 'down';
  minutes?: number;
}
export interface UpdateSessionResponse {
  session: TutorSession;
  entitlement: Entitlement;
}

/** POST check: the learner's answer to a CheckPrompt. */
export interface CheckAnswerRequest {
  sessionId: string;
  checkId: string;
  answer: string | string[] | number;
  latencyMs?: number;
}
export interface CheckAnswerResponse {
  result: CheckResult;
  mastery: SkillMastery | null;
}

/** POST wrap. */
export interface WrapRequest {
  sessionId: string;
}
export interface WrapResponse {
  summary: SessionSummary;
  session: TutorSession;
}

/**
 * POST problem-extract: multipart form with `file` (jpg, png, heic, pdf) and an
 * optional `title`. Creates a coursework row whose `text` is the extraction
 * shown for confirmation; `status: 'failed'` keeps the row so the learner can
 * retry or type the problem instead (R3).
 */
export interface ProblemExtractResponse {
  coursework: CourseworkItem;
}
/** GET coursework. */
export interface ListCourseworkResponse {
  items: CourseworkItem[];
}
/** POST coursework: typed problem. */
export interface CreateCourseworkRequest {
  title: string;
  text: string;
  skillIds?: string[];
}
export interface CourseworkItemResponse {
  item: CourseworkItem;
}
/** PATCH coursework: confirm or correct the extraction. */
export interface UpdateCourseworkRequest {
  id: string;
  title?: string;
  text?: string;
}
/** DELETE coursework. */
export interface DeleteCourseworkRequest {
  id: string;
}

/** GET progress. */
export interface ProgressResponse {
  skills: SkillNode[];
  mastery: SkillMastery[];
  misconceptions: MisconceptionState[];
  nextSkill: SkillNode | null;
  /** Delayed unassisted checks now due (strategy D17). */
  dueChecks: Array<{ skillId: string; dueAt: string }>;
  sessions: number;
  minutes: number;
}

/**
 * POST tts: answers the audio bytes, not JSON. Headers: `content-type`
 * (`audio/mpeg` or `audio/wav`) and `x-tutor-audio-ms` when known.
 */
export interface TtsRequest {
  text: string;
  sessionId: string;
  turnId?: string;
}
/** POST asr: multipart form with `audio` and `sessionId`; answers AsrResponse from contracts. */
export interface AsrFormFields {
  sessionId: string;
}

/** POST attention: state samples, aggregates, and recovery-ladder events; never media. */
export interface AttentionRequest {
  sessionId: string;
  samples?: AttentionSample[];
  stats?: {
    cameraEnabled: boolean;
    attendingPct: number;
    driftCount: number;
    awayCount: number;
    recoveries: number;
  };
  recovery?: {
    triggerState: AttentionState;
    ladderStep: number;
    outcome: string | null;
  };
}

/** POST flag: the report button (R10). */
export interface FlagRequest {
  sessionId?: string;
  kind: 'unsafe' | 'wrong' | 'other';
  note?: string;
}
export interface FlagResponse {
  flagId: string;
}

/** POST support: one message to a person; works signed out, attached to the account when signed in. */
export interface SupportRequest {
  email: string;
  message: string;
  /** The page the visitor came from, when it was one of ours. */
  page?: string;
}
export interface SupportResponse {
  /** True only when the message reached a person's inbox; false is saved-but-not-delivered, said plainly. */
  delivered: boolean;
  reference: string;
  /** The sentence to show, written for the person at the form. */
  message: string;
}

// ---------------------------------------------------------------------------
// Guest mode and the planner (D35)
// ---------------------------------------------------------------------------

/**
 * POST guest. Creates (or, when the cookie already resolves to a guest,
 * reuses) the anonymous account and learner for `level`, sets the session
 * cookie, and when `topic` is given starts a topic session in the same call
 * so the landing page is one click from a tutor. Nothing here identifies a
 * person: no name, no email, no birth year, no password.
 */
export interface GuestStartRequest {
  level: GuestLevelId;
  mode?: InputMode;
  topic?: SessionTopic | null;
  /** Start an open session in the same call (D36): the tutor asks what to work on. */
  open?: boolean;
}
export interface GuestStartResponse {
  learner: Learner;
  principal: PrincipalSummary;
  /** Present when `topic` was given and the session was created. */
  session: CreateSessionResponse | null;
}
/** POST guest/forget: every row behind this cookie is deleted now and the cookie is cleared. */
export interface GuestForgetResponse {
  deleted: boolean;
}

/** GET planner. Open items first by due date, then done items, newest first. */
export interface ListPlannerResponse {
  items: PlannerItem[];
}
export interface CreatePlannerItemRequest {
  title: string;
  subject: SubjectId;
  dueOn?: string | null;
  notes?: string;
}
export interface UpdatePlannerItemRequest {
  id: string;
  title?: string;
  subject?: SubjectId;
  dueOn?: string | null;
  notes?: string;
  status?: PlannerStatus;
}
export interface DeletePlannerItemRequest {
  id: string;
}
export interface PlannerItemResponse {
  item: PlannerItem;
}
