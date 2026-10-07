/**
 * The assessment service (E2 part A; SPEC §3.1) on the E2 seam (ADR-0066).
 *
 * Every write is a call to one of C's SQL functions in schema `e2`
 * (`issue_attempt`, `submit_attempt`, `finalize_attempt`, `record_exposure`,
 * `append_practice`), under the capability role the contract names for it.
 * This module owns no DDL, no roles and no locks: the functions lock
 * (skill-first advisory locks, then guard rows, then the attempt row) and the
 * caller runs one SQL operation per serializable transaction with the
 * 40001/40P01 retry that C's `transaction` helper provides.
 *
 * Eligibility is derived inside `finalize_attempt` and only there. A caller
 * never submits a trusted `qualifying: true`; the score it supplies is a JSON
 * object whose `correct` must be boolean `true` to qualify, computed OUTSIDE
 * the transaction so the callback can repeat.
 */
import type { Queryable } from '@/lib/tutor/db';
import type { AnswerKey } from '@/lib/tutor/session/state';

/** Provisional rule parameters live in `e2.rule_versions`; the id and the trusted scorer are fixed here. */
export const ASSESSMENT_RULE = {
  ruleVersion: 'e2-draft-1',
  /** The only scorer this rule version trusts: the deterministic local grader. Model graders abstain. */
  scorerId: 'local-grader',
  scorerVersion: 'kaizenedu-20a971b-grading',
} as const;

export type AttemptState = 'issued' | 'submitted' | 'finalized' | 'expired' | 'cancelled';

/** `e2.attempts` as the functions return it (`to_jsonb(row)`). */
export interface AttemptRow extends Record<string, unknown> {
  household_id: string;
  id: string;
  operation_id: string;
  issue_order: number;
  learner_id: string;
  item_id: string;
  item_version: string;
  key_version: string;
  rubric_id: string;
  rubric_version: string;
  skill_id: string;
  skill_version: string;
  family_id: string;
  context_tag: string;
  scorer_id: string;
  scorer_version: string;
  rule_version: string;
  session_id: string;
  state: AttemptState;
  issued_at: string;
  issued_seq: number;
  exposure_seq: number;
  response: unknown | null;
  submitted_at: string | null;
  finalized_at: string | null;
  assistance_latched: boolean;
  final_result: AssessmentResult | null;
}

/** Reasons `finalize_attempt` records; every one is visible on the result and the evidence payload. */
export type NonqualifyingReason =
  | 'assistance_observed'
  | 'delay_under_48h'
  | 'content_not_approved'
  | 'familiar_item'
  | 'not_correct_or_ungraded';

/** Full E13 protocol qualification is separate from an individual independent success. */
export type QualificationState = 'pending' | 'eligible' | 'qualified';
export interface QualificationFacts {
  state: QualificationState;
  reasons: string[];
  anchorEvidenceId: string | null;
  /** Server submission receipt of the first success recognized by finalization. */
  anchorAt: string | null;
  /** Household timezone frozen at the first success for this skill/rule cohort. */
  timezone: string | null;
  localDays: string[];
  contextCount: number;
  retentionSatisfied: boolean;
  windowStartDay: number;
  windowEndDay: number;
  ruleVersion: string;
}

/** What `e2.finalize_attempt` returns and stores as `attempts.final_result`. */
export interface AssessmentResult {
  attemptId: string;
  evidenceId: string;
  qualifying: boolean;
  reasons: NonqualifyingReason[];
  certification: 'none';
  ruleVersion: string;
  /** Absent on immutable results finalized before the E13 migration. */
  qualificationState?: QualificationState;
  qualificationReasons?: string[];
  qualification?: QualificationFacts;
}

/** `e2.exposure_events` as `record_exposure` returns it. */
export interface ExposureEvent extends Record<string, unknown> {
  household_id: string;
  id: string;
  learner_id: string;
  operation_id: string;
  session_id: string;
  skill_ids: string[];
  skill_version: string;
  causal_sequences: Record<string, number>;
  class: 'assisted-help';
  received_at: string;
  payload: unknown;
  provenance: unknown;
  rule_version: string;
}

/** `e2.evidence_events` as `append_practice` returns it, and as `evidence_view` renders it. */
export interface EvidenceEvent extends Record<string, unknown> {
  household_id: string;
  id: string;
  learner_id: string;
  operation_id: string;
  attempt_id: string | null;
  session_id: string;
  skill_id: string;
  skill_version: string;
  causal_seq: number;
  class: 'assisted-help' | 'corrections-practice' | 'unassisted-attempt' | 'delayed-retention';
  qualifying: boolean;
  received_at: string;
  payload: unknown;
  provenance: unknown;
  rule_version: string;
}

/** The score object the scorer hands to `finalize_attempt`. Only `correct === true` qualifies. */
export interface Score {
  correct?: boolean;
  score?: number;
  graded: boolean;
  reason?: string;
  scorerId: string;
  scorerVersion: string;
}

/** The item as the assessment role may read it (answer_key included) — never sent to a client. */
export interface ItemRow extends Record<string, unknown> {
  household_id: string;
  id: string;
  version: string;
  key_version: string;
  rubric_id: string;
  rubric_version: string;
  skill_id: string;
  skill_version: string;
  family_id: string;
  context_tag: string;
  approval: 'draft' | 'approved' | 'rejected';
  content: { type: AnswerKey['type']; stem: string; options?: Array<{ id: string; text: string }> } | string;
  answer_key: AnswerKey | string;
  provenance: unknown;
}

export type AssessmentErrorCode =
  | 'CONFLICT' // SQLSTATE P0001: conflicting operation/response, or invalid state / unapproved content
  | 'NOT_FOUND' // SQLSTATE P0002: missing item or attempt (or another household's)
  | 'FORBIDDEN' // SQLSTATE 42501: the role may not execute this function
  | 'INVALID_RESPONSE' // SQLSTATE 22023 from the function, or the service's own shape check
  | 'SQL'; // anything else, with the SQLSTATE attached

export class AssessmentError extends Error {
  constructor(
    readonly code: AssessmentErrorCode,
    message: string,
    readonly sqlstate: string | null = null,
    readonly attemptId: string | null = null,
  ) {
    super(message);
    this.name = 'AssessmentError';
  }
}

const SQLSTATE_TO_CODE: Record<string, AssessmentErrorCode> = {
  P0001: 'CONFLICT',
  P0002: 'NOT_FOUND',
  '42501': 'FORBIDDEN',
  '22023': 'INVALID_RESPONSE',
};

/** Maps a `pg` error (its `code` is the SQLSTATE) onto the documented contract; anything else passes through as `SQL`. */
export function fromSqlError(error: unknown, attemptId: string | null = null): AssessmentError {
  if (error instanceof AssessmentError) return error;
  const e = error as { code?: string; message?: string };
  const sqlstate = typeof e?.code === 'string' ? e.code : null;
  return new AssessmentError(
    (sqlstate && SQLSTATE_TO_CODE[sqlstate]) || 'SQL',
    e?.message ?? String(error),
    sqlstate,
    attemptId,
  );
}

/**
 * The database surface the service needs: E1's `Queryable` (a `pg` Client
 * satisfies it) plus one transaction. `transaction` must be C's
 * `tests/engine/pg/harness.cjs` `transaction(client, fn)` or an equivalent:
 * serializable, one connection for every statement of the callback, a retry
 * on 40001/40P01 (so the callback may run again), a rollback when it throws.
 */
export interface AssessmentDb extends Queryable {
  transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T>;
}

export interface IssueRequest {
  learnerId: string;
  itemId: string;
  itemVersion: string;
  /** Stable per request; the same id retried returns the stored attempt. Persist it before calling. */
  operationId: string;
  sessionId: string;
}

export interface SubmitRequest {
  learnerId: string;
  attemptId: string;
  response: string | string[] | number;
  /** Telemetry only. It is not persisted by the seam and never used for eligibility or timing. */
  client?: { submittedAt?: string; latencyMs?: number };
}

export interface FinalizeRequest {
  learnerId: string;
  attemptId: string;
  /** The response this finalization is for; the function refuses a different one (P0001). */
  response: string | string[] | number;
}

export interface ExposureRequest {
  learnerId: string;
  skillIds: string[];
  skillVersion: string;
  operationId: string;
  sessionId: string;
  payload: unknown;
  provenance: unknown;
}

export interface PracticeRequest {
  learnerId: string;
  skillId: string;
  skillVersion: string;
  operationId: string;
  sessionId: string;
  payload: unknown;
  provenance: unknown;
}
