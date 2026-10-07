/**
 * The assessment service: issue → submit → finalize, exposure and practice,
 * as a caller of the E2 seam (ADR-0066, `db/README.md` "Exact SQL API").
 *
 * Shape of every write: one `SELECT e2.<fn>(...) AS value` inside one
 * serializable transaction (C's `transaction` helper retries 40001/40P01, so
 * the callback may run again and must contain nothing but that call). The
 * role is the connection's: `issue`/`finalize` need `assessment`, `submit`
 * accepts `learner` or `assessment`, `exposure`/`practice` accept `tutor` or
 * `assessment`; a wrong role is refused by PostgreSQL with 42501 and surfaces
 * here as `FORBIDDEN`. Conflicts are P0001 → `CONFLICT`; a missing attempt or
 * item is P0002 → `NOT_FOUND`.
 *
 * Scoring happens OUTSIDE the transaction, against the frozen item version's
 * answer key (readable by the assessment role, never presented to a client).
 * The function stores the FIRST result; a retry with a different score for
 * the same attempt/response gets that first result back unchanged.
 */
import { gradeLocally } from '@/lib/tutor/checks/grading';
import { verifyNumericKey } from './content-check';
import type { CheckPrompt } from '@/lib/tutor/contracts';
import type { Queryable } from '@/lib/tutor/db';
import { parseJsonb } from '@/lib/tutor/model/rows';
import type { AnswerKey } from '@/lib/tutor/session/state';

import {
  ASSESSMENT_RULE,
  AssessmentError,
  fromSqlError,
  type AssessmentDb,
  type AssessmentResult,
  type AttemptRow,
  type EvidenceEvent,
  type ExposureEvent,
  type ExposureRequest,
  type FinalizeRequest,
  type IssueRequest,
  type ItemRow,
  type PracticeRequest,
  type Score,
  type SubmitRequest,
} from './contracts';

async function call<T>(db: AssessmentDb, sql: string, params: unknown[], attemptId: string | null = null): Promise<T> {
  try {
    return await db.transaction(async (tx) => {
      const { rows } = await tx.query<{ value: T }>(sql, params);
      const row = rows[0];
      if (!row) throw new AssessmentError('SQL', 'the function returned no row', null, attemptId);
      return row.value;
    });
  } catch (error) {
    throw fromSqlError(error, attemptId);
  }
}

function validResponse(value: unknown): value is string | string[] | number {
  if (typeof value === 'string' || typeof value === 'number') return true;
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

/** The response is stored as jsonb; the wire form is the JSON value itself, unchanged. */
function jsonParam(value: unknown): string {
  return JSON.stringify(value);
}

// ---------------------------------------------------------------------------
// Issue
// ---------------------------------------------------------------------------

/**
 * Issues one attempt on an approved, nonrevoked item version. The function
 * freezes item/key/rubric/skill versions, scorer, rule, session, the issue
 * time and the exposure sequence, and returns the stored row for a retried
 * operation id (a different item or session under the same id is P0001).
 */
export async function issueAttempt(db: AssessmentDb, request: IssueRequest): Promise<AttemptRow> {
  return call<AttemptRow>(
    db,
    'SELECT e2.issue_attempt($1,$2,$3,$4,$5,$6,$7,$8) AS value',
    [
      request.learnerId, request.itemId, request.itemVersion, request.operationId, request.sessionId,
      ASSESSMENT_RULE.scorerId, ASSESSMENT_RULE.scorerVersion, ASSESSMENT_RULE.ruleVersion,
    ],
  );
}

/** The client view of an item: `e2.item_presentations` carries no answer key by construction. */
export async function presentItem(db: Queryable, attempt: AttemptRow): Promise<CheckPrompt> {
  const { rows } = await db.query<{ content: ItemRow['content']; skill_id: string }>(
    'SELECT content, skill_id FROM e2.item_presentations WHERE id = $1 AND version = $2',
    [attempt.item_id, attempt.item_version],
  );
  const row = rows[0];
  if (!row) throw new AssessmentError('NOT_FOUND', `item ${attempt.item_id}@${attempt.item_version} is not presentable`, null, attempt.id);
  const content = parseJsonb<Exclude<ItemRow['content'], string>>(row.content, { type: 'numeric', stem: '' });
  return {
    checkId: attempt.id,
    skillId: row.skill_id,
    type: content.type,
    stem: content.stem,
    ...(content.options ? { options: content.options.map(({ id, text }) => ({ id, text })) } : {}),
    itemId: attempt.item_id,
  };
}

// ---------------------------------------------------------------------------
// Submit
// ---------------------------------------------------------------------------

/**
 * Fixes the response. A repeat with the same response returns the current row
 * (possibly already finalized); a different response is P0001 → `CONFLICT`.
 * `request.client` is telemetry: the seam has no slot for it and nothing here
 * reads it — `submitted_at` is the server's clock.
 */
export async function submitAttempt(db: AssessmentDb, request: SubmitRequest): Promise<AttemptRow> {
  if (!validResponse(request.response)) {
    throw new AssessmentError('INVALID_RESPONSE', 'a response is a string, a list of strings or a number', null, request.attemptId);
  }
  return call<AttemptRow>(
    db,
    'SELECT e2.submit_attempt($1,$2::uuid,$3::jsonb) AS value',
    [request.learnerId, request.attemptId, jsonParam(request.response)],
    request.attemptId,
  );
}

// ---------------------------------------------------------------------------
// Score (outside any transaction) and finalize
// ---------------------------------------------------------------------------

/** Reads the attempt row as the caller's role sees it (RLS: own household only). */
export async function readAttempt(db: Queryable, learnerId: string, attemptId: string): Promise<AttemptRow | null> {
  const { rows } = await db.query<AttemptRow>(
    'SELECT * FROM e2.attempts WHERE learner_id = $1 AND id = $2::uuid',
    [learnerId, attemptId],
  );
  return rows[0] ?? null;
}

/** The frozen item version with its answer key; only the assessment role has SELECT on `e2.items`. */
export async function readItemForScoring(db: Queryable, attempt: AttemptRow): Promise<ItemRow | null> {
  const { rows } = await db.query<ItemRow>(
    'SELECT * FROM e2.items WHERE id = $1 AND version = $2',
    [attempt.item_id, attempt.item_version],
  );
  return rows[0] ?? null;
}

/**
 * The deterministic local grader against the frozen key. Anything it cannot
 * grade is a score without `correct`, which the function records as
 * `not_correct_or_ungraded`; the service abstains visibly, it never guesses.
 *
 * Criterion 4: before the key grades anything, `verifyNumericKey` evaluates
 * the stem independently. A computable stem whose approved key disagrees is
 * a wrong key — the score abstains with `key_unverified` and the disagreement,
 * whatever the response says (a response equal to the wrong key earns
 * nothing). A stem it cannot evaluate abstains too, with `key_unverifiable:<why>`
 * — the key alone never grades. Approval metadata never stands in for that check.
 */
export function scoreResponse(item: ItemRow | null, response: unknown): Score {
  const base = { scorerId: ASSESSMENT_RULE.scorerId, scorerVersion: ASSESSMENT_RULE.scorerVersion };
  if (!item || !validResponse(response)) return { ...base, graded: false, reason: 'no_item_or_invalid_response' };
  const key = parseJsonb<AnswerKey>(item.answer_key, { type: 'numeric', options: null, answer: null });
  const content = parseJsonb<Exclude<ItemRow['content'], string>>(item.content, { type: key.type, stem: '' });
  // Round 7: nothing thrown by the evaluator escapes; an exception is a recorded abstention.
  let verdict: ReturnType<typeof verifyNumericKey>;
  try { verdict = verifyNumericKey(content.stem, key); }
  catch (e) { verdict = { status: 'unverifiable', reason: `evaluator_error:${e instanceof Error && e.name ? e.name.replace(/[^A-Za-z0-9_]/g, '_') : 'unknown'}`, path: 'error' }; }
  if (verdict.status === 'disagrees') {
    return { ...base, graded: false, reason: `key_unverified:expected=${verdict.expected}:keyed=${verdict.keyed}` };
  }
  // Round 6: unverifiable never falls through to the stored key. No independent value → no grade.
  if (verdict.status !== 'agrees') {
    return { ...base, graded: false, reason: `key_unverifiable:${verdict.reason}` };
  }
  const grade = gradeLocally(key, response);
  if (!grade.graded) return { ...base, graded: false, reason: grade.reason };
  return { ...base, graded: true, correct: grade.correct, score: grade.score };
}

/**
 * Finalizes once. The score is computed here, before the transaction, from
 * the frozen item version; the function then revalidates the response,
 * approval/revocation, the assistance latch and exposure sequence, the delay
 * rule and familiarity, appends exactly one evidence row, stores the result
 * on the attempt and upserts the projection — atomically. A retry returns the
 * stored first result even if this call's score differs.
 */
export async function finalizeAttempt(
  db: AssessmentDb,
  request: FinalizeRequest,
  deps: { score?: (item: ItemRow | null, response: unknown) => Score } = {},
): Promise<AssessmentResult> {
  if (!validResponse(request.response)) {
    throw new AssessmentError('INVALID_RESPONSE', 'a response is a string, a list of strings or a number', null, request.attemptId);
  }
  const attempt = await readAttempt(db, request.learnerId, request.attemptId);
  if (!attempt) throw new AssessmentError('NOT_FOUND', `no attempt ${request.attemptId} for this learner`, 'P0002', request.attemptId);
  // No short-circuit on a stored result: the function is the one that decides a retry (same response →
  // the first result, even when this call's score differs) from a conflict (different response → P0001).
  const item = await readItemForScoring(db, attempt);
  const score = (deps.score ?? scoreResponse)(item, request.response);
  return call<AssessmentResult>(
    db,
    'SELECT e2.finalize_attempt($1,$2::uuid,$3::jsonb,$4::jsonb) AS value',
    [request.learnerId, request.attemptId, jsonParam(request.response), jsonParam(score)],
    request.attemptId,
  );
}

// ---------------------------------------------------------------------------
// Exposure and practice (tutor or assessment)
// ---------------------------------------------------------------------------

/**
 * Records delivered help on one or more skills. Inside the function the skill
 * locks are taken first, every in-flight attempt on those skills is latched,
 * and the guard's exposure sequence advances — so an attempt issued before
 * this call can never finalize as unassisted, and one issued after it sees
 * the delay rule.
 */
export async function recordExposure(db: AssessmentDb, request: ExposureRequest): Promise<ExposureEvent> {
  return call<ExposureEvent>(
    db,
    'SELECT e2.record_exposure($1,$2::text[],$3,$4,$5,$6::jsonb,$7::jsonb,$8) AS value',
    [
      request.learnerId, request.skillIds, request.skillVersion, request.operationId, request.sessionId,
      jsonParam(request.payload), jsonParam(request.provenance), ASSESSMENT_RULE.ruleVersion,
    ],
  );
}

/**
 * Appends corrections practice. The function forces `class='corrections-practice'`
 * and `qualifying=false` whatever the payload claims. It records no assistance:
 * a caller that delivered help also calls `recordExposure`.
 */
export async function appendPractice(db: AssessmentDb, request: PracticeRequest): Promise<EvidenceEvent> {
  return call<EvidenceEvent>(
    db,
    'SELECT e2.append_practice($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8) AS value',
    [
      request.learnerId, request.skillId, request.skillVersion, request.operationId, request.sessionId,
      jsonParam(request.payload), jsonParam(request.provenance), ASSESSMENT_RULE.ruleVersion,
    ],
  );
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function readResult(db: Queryable, learnerId: string, attemptId: string): Promise<AssessmentResult | null> {
  const attempt = await readAttempt(db, learnerId, attemptId);
  return attempt?.final_result ?? null;
}

/** Evidence rows for one attempt through C's `evidence_view` (caller's RLS). */
export async function readAttemptEvidence(db: Queryable, attemptId: string): Promise<EvidenceEvent[]> {
  const { rows } = await db.query<EvidenceEvent>(
    'SELECT * FROM e2.evidence_view WHERE attempt_id = $1::uuid ORDER BY causal_seq, id',
    [attemptId],
  );
  return rows;
}
