/**
 * Every model call made by the tutor passes one of these as the `source`
 * argument of `callLLM` / `streamLLM` (`@/lib/ai/llm`). The usage ledger keys
 * on it, so cost per turn and per stage is attributable (spec §8.4, R8, R9).
 * `tests/invariants/cost-ceiling.test.ts` checks that files under `lib/tutor`
 * that call the model import this module.
 */
export const TUTOR_LLM_SOURCES = {
  liveTurn: 'tutor-live-turn',
  diagnose: 'tutor-diagnose',
  grade: 'tutor-grade',
  summary: 'tutor-summary',
  modelUpdate: 'tutor-model-update',
  problemExtract: 'tutor-problem-extract',
} as const;

export type TutorLlmSource = (typeof TUTOR_LLM_SOURCES)[keyof typeof TUTOR_LLM_SOURCES];

export function isTutorLlmSource(value: string): value is TutorLlmSource {
  return (Object.values(TUTOR_LLM_SOURCES) as string[]).includes(value);
}
