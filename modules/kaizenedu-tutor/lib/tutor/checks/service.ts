/**
 * POST /api/tutor/check (spec R4, tutor-09, tutor-10, data-30, D17): grades
 * the pending check, writes the `check_result` evidence with its `assisted`
 * flag, updates the student model, advances the diagnostic, and returns the
 * result. Nothing is emitted over SSE; the next turn's context carries it.
 */
import type { Principal } from '@/lib/tutor/contracts';
import { TUTOR_LLM_SOURCES } from '@/lib/tutor/cost/sources';
import type { Queryable } from '@/lib/tutor/db';
import { isMisconceptionTag, isSkillId, skillById } from '@/lib/tutor/graph/graph';
import { hintSinceLastCheck, writeEvidence } from '@/lib/tutor/model/evidence';
import { openMisconceptions, recordCheckOutcome } from '@/lib/tutor/model/service';
import { loadPromptFile } from '@/lib/tutor/prompts/loader';
import { resetCoach } from '@/lib/tutor/session/coach';
import { loadSession, saveSessionState } from '@/lib/tutor/session/service';
import type { SessionState } from '@/lib/tutor/session/state';
import { afterCheckGraded, recordDiagnosticAnswer } from '@/lib/tutor/session/state-machine';
import { extractJsonObject, tutorCallLLM, type TutorLlmCallInput } from '@/lib/tutor/turn/llm-call';
import type { CheckAnswerRequest, CheckAnswerResponse } from '@/lib/tutor/wire';

import { gradeLocally } from './grading';
import { gradeShortAnswerWithModel, type ShortAnswerGrader } from './llm-grade';

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

export async function answerCheck(
  db: Queryable,
  principal: Principal,
  body: CheckAnswerRequest,
  deps: AnswerCheckDeps = {},
): Promise<AnswerCheckOutcome> {
  const now = deps.now ?? new Date();
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
    const grader = deps.grader ?? gradeShortAnswerWithModel;
    const answerText = Array.isArray(body.answer) ? body.answer.join(' ') : String(body.answer);
    const model = await grader(db, scope, pending, answerText, record.band);
    if (model) {
      graded = model;
      cents = model.cents;
    }
  }

  const assisted =
    record.state.coach.answerShown ||
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

  await writeEvidence(db, {
    accountId: principal.accountId,
    learnerId: principal.learnerId,
    sessionId: record.session.id,
    type: 'check_result',
    assisted,
    payload: {
      checkId: pending.checkId,
      itemId: pending.itemId,
      skillId: pending.skillId,
      type: pending.type,
      correct: result.correct,
      score: result.score,
      misconception: result.misconception,
      latencyMs,
      diagnostic: pending.diagnostic,
      ungraded: graded === null,
      representation: pending.representation,
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

/** The diagnose stage refines the deterministic placement; a bad reply keeps the deterministic one. */
async function placeLearner(
  db: Queryable,
  scope: { accountId: string; learnerId: string; sessionId: string; turnId: string | null },
  state: SessionState,
  band: TutorLlmCallInput['band'],
): Promise<Placement> {
  const fallback = state.diagnostic?.placedSkillId ?? 'F1';
  const asked = state.diagnostic?.asked ?? [];
  const lines = asked.map(
    (item, index) =>
      `${index + 1}. skill ${item.skillId} ${skillById(item.skillId)?.name ?? ''}; stem: ${item.stem}; learner answer: ${item.answer}; ${item.correct ? 'correct' : 'incorrect'}${item.tag ? `; distractor tag ${item.tag}` : ''}`,
  );
  try {
    const result = await tutorCallLLM({
      db,
      scope,
      source: TUTOR_LLM_SOURCES.diagnose,
      band,
      system: loadPromptFile('diagnose'),
      prompt: `Deterministic placement so far: ${fallback}.\nDiagnostic results:\n${lines.join('\n')}`,
      maxOutputTokens: 300,
    });
    const json = extractJsonObject(result.text);
    const skillId = isSkillId(json?.placementSkillId) ? json.placementSkillId : fallback;
    const misconceptions = Array.isArray(json?.misconceptions)
      ? json.misconceptions.filter(isMisconceptionTag).filter((tag) => tag !== 'computation')
      : [];
    const note = typeof json?.note === 'string' ? json.note : '';
    return {
      skillId,
      misconceptions,
      note,
      source: json ? 'model' : 'deterministic',
      cents: result.cents,
    };
  } catch {
    return { skillId: fallback, misconceptions: [], note: '', source: 'deterministic', cents: 0 };
  }
}
