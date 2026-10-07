/* core-stub.mjs — SYNTHETIC. Not the engine. Not a provider.
 * Minimal stand-in for lesson/core.mjs so the UI can be driven in isolation
 * before/independently of the engine. Any green run against this stub proves
 * UI wiring only. The real core.mjs replaces it automatically (see ui-logic.mjs).
 */
export function validateLesson(value) {
  if (!value || typeof value !== 'object') throw new Error('stub: not a lesson');
  if (value.version !== 1 || !Array.isArray(value.steps)) throw new Error('stub: bad schema');
  return value;
}

export function gradeAnswer(step, answer) {
  const given = String(answer ?? '').trim();
  if (!given) return { verdict: 'ungraded', reason: 'stub: empty' };
  if (step.kind === 'writing') return { verdict: 'ungraded', reason: 'stub: writing' };
  if (step.kind === 'choice') {
    return given === step.answer
      ? { verdict: 'correct', reason: 'stub: exact option' }
      : { verdict: 'incorrect', reason: 'stub: other option' };
  }
  const num = (s) => {
    const m = /^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/.exec(s);
    if (m) return Number(m[1]) / Number(m[2]);
    return /^-?\d+(?:\.\d+)?$/.test(s) ? Number(s) : NaN;
  };
  const a = num(given); const b = num(String(step.answer ?? ''));
  if (!Number.isFinite(a) || !Number.isFinite(b)) return { verdict: 'ungraded', reason: 'stub: unparsed' };
  return Math.abs(a - b) < 1e-9
    ? { verdict: 'correct', reason: 'stub: equal' }
    : { verdict: 'incorrect', reason: 'stub: unequal' };
}

export function chooseNext(lesson, evidence) {
  const checkId = lesson.steps.at(-1)?.id;
  const clean = evidence.some(e => e.stepId === checkId && e.verdict === 'correct' && !e.assisted);
  return clean
    ? { ...lesson.path.advance, kind: 'advance' }
    : { ...lesson.path.reinforce, kind: 'reinforce' };
}
