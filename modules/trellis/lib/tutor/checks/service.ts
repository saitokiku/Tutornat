/**
 * POST /api/tutor/check (spec R4, tutor-09, tutor-10, data-30, D17): grades
 * the pending check, writes the `check_result` evidence with its `assisted`
 * flag, updates the student model, advances the diagnostic, and returns the
 * result. Nothing is emitted over SSE; the next turn's context carries it.
 */
import type { AssessmentDb } from '@/lib/tutor/assessment/contracts';
import type { AgeBand } from '@/lib/tutor/config';
import type { Principal } from '@/lib/tutor/contracts';
import type { Queryable } from '@/lib/tutor/db';
import { practiceExposure } from '@/lib/tutor/exposure/eligibility';
import { hintSinceLastCheck, practiceEvidenceClass, writeEvidence } from '@/lib/tutor/model/evidence';
import { openMisconceptions, recordCheckOutcome } from '@/lib/tutor/model/service';
import { resetCoach } from '@/lib/tutor/session/coach';
import { loadSession, saveSessionState } from '@/lib/tutor/session/service';
import type { PendingCheckState, SessionState } from '@/lib/tutor/session/state';
import { afterCheckGraded, recordDiagnosticAnswer } from '@/lib/tutor/session/state-machine';
import type { CheckAnswerRequest, CheckAnswerResponse } from '@/lib/tutor/wire';

import { gradeLocally } from './grading';

/**
 * Adapter seam (E1 criterion 0): KaizenEdu's `llm-grade.ts` calls a live model
 * through `turn/llm-call`, `cost/sources` and `prompts/loader`, all excluded
 * here. The shape is the source's `ShortAnswerGrader`; the default abstains
 * (`null` = ungraded), which is the source's own behaviour on an unparseable
 * model reply. Tests inject a deterministic grader when they need one.
 */
export interface ModelGrade {
  correct: boolean;
  score: number;
  rationale: string;
  misconception: string | null;
  arithmeticCheck: string;
  cents: number;
}
export type ShortAnswerGrader = (
  db: Queryable,
  scope: { accountId: string; learnerId: string; sessionId: string; turnId: string | null },
  pending: PendingCheckState,
  answer: string,
  band?: AgeBand | null,
) => Promise<ModelGrade | null>;
const abstainingGrader: ShortAnswerGrader = async () => null;

export type CheckErrorCode = 'NOT_FOUND' | 'NO_PENDING_CHECK' | 'SESSION_ENDED' | 'INVALID_ANSWER';

export type AnswerCheckOutcome =
  | { ok: true; response: CheckAnswerResponse }
  | { ok: false; code: CheckErrorCode; message: string };

export interface AnswerCheckDeps {
  now?: Date;
  grader?: ShortAnswerGrader;
}

export const UNGRADED_RATIONALE =
  'This answer could not be graded automatically; the tutor will follow up in the conversation.';

/**
 * E3 #13 (ADR-0066: callers take no locks). The whole answer runs in one
 * transaction; the pending-check authority and the (household, learner, skill)
 * lock are the seam's. When this connection can see the seam, the route
 * registers the check it is answering with `e2.queue_practice_check` (an
 * idempotent, immutable record keyed by session and check id) and consumes it
 * with `e2.practice_check`, whose skill lock is taken inside the function.
 * Two callers answering the same pending check serialize inside the seam; the
 * second gets `{ok:false, code:'NO_PENDING_CHECK'}` and writes nothing, so one
 * check yields exactly one result row. The E2-A application-side advisory
 * lock that stood in for this is gone.
 *
 * A connection that cannot see the seam (E1's retained `e1_fixture` role, the
 * SQLite closure fixture) keeps E1's compatibility path with `seam: 'absent'`
 * recorded on the evidence row; that path has no product caller.
 */
export async function answerCheck(
  db: AssessmentDb,
  principal: Principal,
  body: CheckAnswerRequest,
  deps: AnswerCheckDeps = {},
): Promise<AnswerCheckOutcome> {
  const now = deps.now ?? new Date();
  return db.transaction((tx) => answerInTransaction(tx, principal, body, deps, now));
}

/** E1 has no skill versions; the seam keys the practice queue on session and check id, the version only joins its conflict check. */
const LEGACY_SKILL_VERSION = '1';

/**
 * Register and consume the check on the seam. Returns false when the seam says
 * the check is not pending (already consumed by a concurrent or earlier answer).
 * The operation id is the check id: one check, one answer, stable across retries.
 */
async function queuePracticeCheck(
  db: Queryable,
  learnerId: string,
  sessionId: string,
  pending: PendingCheckState,
): Promise<void> {
  await db.query('SELECT e2.queue_practice_check($1,$2,$3,$4,$5) AS value', [
    learnerId, pending.skillId, LEGACY_SKILL_VERSION, pending.checkId, sessionId,
  ]);
}

async function consumePracticeCheck(
  db: Queryable,
  learnerId: string,
  sessionId: string,
  pending: PendingCheckState,
  result: { correct: boolean; score: number; assisted: boolean; ungraded: boolean },
): Promise<boolean> {
  const { rows } = await db.query<{ value: string | { ok?: boolean; code?: string } }>(
    'SELECT e2.practice_check($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb) AS value',
    [
      learnerId, pending.skillId, LEGACY_SKILL_VERSION, pending.checkId, sessionId,
      JSON.stringify({ checkId: pending.checkId, itemId: pending.itemId, correct: result.correct, score: result.score, assisted: result.assisted, ungraded: result.ungraded }),
      JSON.stringify({ source: 'legacy-practice-route', route: 'POST /api/tutor/check' }),
    ],
  );
  const raw = rows[0]?.value;
  const value = typeof raw === 'string' ? (JSON.parse(raw) as { ok?: boolean; code?: string }) : raw;
  return value?.ok === true;
}

async function answerInTransaction(
  db: Queryable,
  principal: Principal,
  body: CheckAnswerRequest,
  deps: AnswerCheckDeps,
  now: Date,
): Promise<AnswerCheckOutcome> {
  // The read every decision below is made on; the seam call further down is what makes it safe.
  const record = await loadSession(db, principal, body.sessionId);
  if (!record || !principal.learnerId)
    return { ok: false, code: 'NOT_FOUND', message: 'Session not found.' };
  if (record.session.phase === 'ended')
    return { ok: false, code: 'SESSION_ENDED', message: 'This session has ended.' };
  const pending = record.state.pendingCheck;
  if (!pending || pending.checkId !== body.checkId)
    return {
      ok: false,
      code: 'NO_PENDING_CHECK',
      message: 'No check with that id is waiting for an answer.',
    };

  const scope = {
    accountId: principal.accountId,
    learnerId: principal.learnerId,
    sessionId: record.session.id,
    turnId: pending.issuedTurnId,
  };
  const local = gradeLocally(pending.key, body.answer);
  let graded: {
    correct: boolean;
    score: number;
    misconception: string | null;
    rationale: string;
  } | null = null;
  let cents = 0;
  if (local.graded) {
    graded = local;
  } else if (local.reason === 'invalid_answer') {
    return { ok: false, code: 'INVALID_ANSWER', message: 'That answer does not fit this check.' };
  } else {
    const grader = deps.grader ?? abstainingGrader;
    const answerText = Array.isArray(body.answer) ? body.answer.join(' ') : String(body.answer);
    const model = await grader(db, scope, pending, answerText, record.band);
    if (model) {
      graded = model;
      cents = model.cents;
    }
  }

  // E2 part B: the practice `assisted` flag now reads the cross-session
  // exposure ledger as well as E1's in-session hint rows. Help on this skill
  // in any session inside the versioned eligibility delay (48 h, server time)
  // makes this check assisted; a check on the skill does not reset that, and
  // help on any other skill leaves it untouched. Legacy hint rows keep their
  // in-session meaning so E1's evidence keeps reading the same way.
  // A connection that cannot see the seam (the retained E1 fixture role) reads
  // "no exposure" and the evidence records `seam: 'absent'`.
  let exposure = await practiceExposure(
    db,
    { accountId: principal.accountId, learnerId: principal.learnerId },
    pending.skillId,
  );
  // E3 #24 round 2: the assistance decision is made under the seam's skill
  // lock, not from a read taken before it. Registering the check first takes
  // that lock inside `e2.queue_practice_check`; the exposure read after it
  // sees any same-skill help that committed between the first read and the
  // lock (READ COMMITTED re-reads; the serializable wrapper conflicts instead).
  if (exposure.seam === 'visible') {
    await queuePracticeCheck(db, principal.learnerId, record.session.id, pending);
    exposure = await practiceExposure(
      db,
      { accountId: principal.accountId, learnerId: principal.learnerId },
      pending.skillId,
    );
  }
  const assisted =
    record.state.coach.answerShown ||
    !exposure.eligible ||
    (await hintSinceLastCheck(db, record.session.id, pending.skillId));
  const latencyMs = Math.max(
    0,
    Math.round(body.latencyMs ?? now.getTime() - new Date(pending.issuedAt).getTime()),
  );
  const result = {
    checkId: pending.checkId,
    skillId: pending.skillId,
    correct: graded?.correct ?? false,
    score: graded?.score ?? 0,
    misconception: graded && !graded.correct ? graded.misconception : null,
    rationale: graded?.rationale ?? UNGRADED_RATIONALE,
    assisted,
    latencyMs,
  };

  // E3 #13: the seam decides whether this check is still pending, under its own
  // skill lock. A refusal here means another answer already consumed it: nothing
  // below runs and the transaction commits nothing.
  if (exposure.seam === 'visible') {
    const consumed = await consumePracticeCheck(db, principal.learnerId, record.session.id, pending, {
      correct: result.correct, score: result.score, assisted, ungraded: graded === null,
    });
    if (!consumed)
      return {
        ok: false,
        code: 'NO_PENDING_CHECK',
        message: 'No check with that id is waiting for an answer.',
      };
  }

  // E1: a check graded here is practice, whatever authored it. A bank item id,
  // a generated key, a long streak or a clean session never make this row
  // qualifying evidence; only the (absent) assessment service could.
  await writeEvidence(db, {
    accountId: principal.accountId,
    learnerId: principal.learnerId,
    sessionId: record.session.id,
    type: 'check_result',
    assisted,
    evidenceClass: practiceEvidenceClass(assisted),
    payload: {
      checkId: pending.checkId,
      itemId: pending.itemId,
      itemAuthority: pending.itemId === null ? 'tutor-authored' : 'bank-id-unverified',
      skillId: pending.skillId,
      type: pending.type,
      correct: result.correct,
      score: result.score,
      misconception: result.misconception,
      latencyMs,
      diagnostic: pending.diagnostic,
      ungraded: graded === null,
      representation: pending.representation,
      exposure: {
        ruleVersion: exposure.ruleVersion,
        lastExposureAt: exposure.lastExposureAt,
        lastExposureSeq: exposure.lastExposureSeq,
        withinDelay: !exposure.eligible,
        seam: exposure.seam,
      },
    },
  });

  let mastery: CheckAnswerResponse['mastery'] = null;
  if (graded) {
    const outcome = await recordCheckOutcome(db, {
      accountId: principal.accountId,
      learnerId: principal.learnerId,
      sessionId: record.session.id,
      skillId: pending.skillId,
      correct: result.correct,
      assisted,
      hitTag: result.misconception,
      relevantTags: pending.relevantTags,
      now,
    });
    mastery = outcome.mastery;
  }

  const state: SessionState = {
    ...record.state,
    pendingCheck: null,
    lastCheckResult: { ...result, stem: pending.stem },
    checks: {
      count: record.state.checks.count + 1,
      correct: record.state.checks.correct + (result.correct ? 1 : 0),
    },
    coach: resetCoach(),
    usedItemIds: pending.itemId
      ? [...record.state.usedItemIds, pending.itemId]
      : record.state.usedItemIds,
    skillsTouched: record.state.skillsTouched.includes(pending.skillId)
      ? record.state.skillsTouched
      : [...record.state.skillsTouched, pending.skillId],
  };

  let skillId: string | null = null;
  if (pending.diagnostic && state.diagnostic && !state.diagnostic.done && graded) {
    const answerText = Array.isArray(body.answer) ? body.answer.join(', ') : String(body.answer);
    state.diagnostic = recordDiagnosticAnswer(state.diagnostic, {
      itemId: pending.itemId,
      skillId: pending.skillId,
      correct: result.correct,
      tag: result.misconception,
      representation: pending.representation,
      answer: answerText.slice(0, 80),
      stem: pending.stem,
    });
    if (state.diagnostic.done) {
      const placement = await placeLearner(db, scope, state, record.band);
      cents += placement.cents;
      state.diagnostic.placedSkillId = placement.skillId;
      skillId = placement.skillId;
      if (placement.misconceptions.length > 0) {
        await openMisconceptions(
          db,
          principal.accountId,
          principal.learnerId,
          record.session.id,
          placement.misconceptions,
          now,
        );
      }
      await writeEvidence(db, {
        accountId: principal.accountId,
        learnerId: principal.learnerId,
        sessionId: record.session.id,
        type: 'diagnostic',
        assisted: false,
        payload: {
          items: state.diagnostic.asked.map((item) => ({
            itemId: item.itemId,
            skillId: item.skillId,
            correct: item.correct,
            tag: item.tag,
          })),
          placementSkillId: placement.skillId,
          misconceptions: placement.misconceptions,
          source: placement.source,
        },
      });
      if (!state.skillsTouched.includes(placement.skillId))
        state.skillsTouched.push(placement.skillId);
    }
  }

  const phase = afterCheckGraded(state, now);
  await saveSessionState(db, record.session.id, phase, state, { skillId, costCentsDelta: cents });
  return { ok: true, response: { result, mastery } };
}

interface Placement {
  skillId: string;
  misconceptions: string[];
  note: string;
  source: 'model' | 'deterministic';
  cents: number;
}

/**
 * Adapter seam (E1 criterion 0): the source's diagnose stage asks a live model
 * to refine the deterministic placement and keeps the deterministic one on a
 * bad reply. With no model in this repository the deterministic branch is the
 * whole function; the signature is kept so the call site is unchanged.
 */
async function placeLearner(
  _db: Queryable,
  _scope: { accountId: string; learnerId: string; sessionId: string; turnId: string | null },
  state: SessionState,
  _band: AgeBand,
): Promise<Placement> {
  const fallback = state.diagnostic?.placedSkillId ?? 'F1';
  return { skillId: fallback, misconceptions: [], note: '', source: 'deterministic', cents: 0 };
}
