/**
 * Short answers that local matching cannot settle go to the grade stage
 * (spec §8.4: stronger model with arithmetic self-check). Strict schema; a
 * reply that does not parse is `null` (ungraded), never partial credit.
 */
import type { AgeBand } from '@/kaizen.config';
import { TUTOR_LLM_SOURCES } from '@/lib/tutor/cost/sources';
import type { Queryable } from '@/lib/tutor/db';
import { isMisconceptionTag, skillById } from '@/lib/tutor/graph/graph';
import { loadPromptFile } from '@/lib/tutor/prompts/loader';
import type { PendingCheckState } from '@/lib/tutor/session/state';
import { extractJsonObject, tutorCallLLM, type TutorLlmScope } from '@/lib/tutor/turn/llm-call';

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
  scope: TutorLlmScope,
  pending: PendingCheckState,
  answer: string,
  /** The learner's band, for a per-band model override; null when unknown. */
  band?: AgeBand | null,
) => Promise<ModelGrade | null>;

export function parseModelGrade(text: string): Omit<ModelGrade, 'cents'> | null {
  const json = extractJsonObject(text);
  if (!json) return null;
  if (typeof json.correct !== 'boolean') return null;
  const score =
    typeof json.score === 'number' && Number.isFinite(json.score)
      ? Math.max(0, Math.min(1, json.score))
      : json.correct
        ? 1
        : 0;
  const rationale = typeof json.rationale === 'string' ? json.rationale.trim() : '';
  if (!rationale) return null;
  const misconception = isMisconceptionTag(json.misconception) ? json.misconception : null;
  const arithmeticCheck = typeof json.arithmeticCheck === 'string' ? json.arithmeticCheck : '';
  return { correct: json.correct, score, rationale, misconception, arithmeticCheck };
}

export const gradeShortAnswerWithModel: ShortAnswerGrader = async (
  db,
  scope,
  pending,
  answer,
  band = null,
) => {
  const skill = skillById(pending.skillId);
  const accept = pending.key.answer?.accept ?? [];
  const prompt = [
    `Skill: ${pending.skillId} ${skill?.name ?? ''}`,
    `Misconception tags for this skill: ${(skill?.tags ?? []).join(', ') || 'none'}`,
    `Item stem: ${pending.stem}`,
    `Reference answer: ${String(pending.key.answer?.value ?? '')}`,
    `Accepted equivalents: ${accept.length > 0 ? accept.join(' | ') : 'none listed'}`,
    `Learner answer: ${answer}`,
  ].join('\n');
  const result = await tutorCallLLM({
    db,
    scope,
    source: pending.diagnostic ? TUTOR_LLM_SOURCES.diagnose : TUTOR_LLM_SOURCES.grade,
    band,
    system: loadPromptFile('grade'),
    prompt,
    maxOutputTokens: 300,
  });
  const parsed = parseModelGrade(result.text);
  return parsed ? { ...parsed, cents: result.cents } : null;
};
