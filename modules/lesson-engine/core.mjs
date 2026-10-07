// Shared lesson contract: validation at the AI/client trust boundary, local grading,
// and next-step selection. Used identically by server.mjs and the browser (app.mjs),
// so a lesson the server accepted is a lesson the UI can render.
//
// Honesty rules baked in, not bolted on:
//   - Answer keys here are AI-GENERATED, not reviewed curriculum.
//   - Writing is NEVER auto-graded.
//   - Local numeric/choice grading is canonical; the model cannot override it.
//   - Unparseable input is `ungraded`, never a default partial score.
//   - Completion, elapsed time and assisted success are NEVER mastery.
import { compileExpr } from './vendor/math-expr.mjs';

// v1 (already-saved lessons) was whitelisted school subjects + grade band. v2 is any
// safe topic the goal names, keyed on a self-reported age. Both shapes validate; v1 is
// never migrated or given an invented age.
const V1_SUBJECTS = ['math', 'english'];
const V1_GRADES = ['K', '1', '2', '3', '4', '5', '6', '7', '8'];
const LOCALES = ['en', 'es'];
const KINDS = ['choice', 'numeric', 'writing'];

export class LessonError extends Error {
  constructor(message) { super(`lesson: ${message}`); this.name = 'LessonError'; }
}
const fail = (m) => { throw new LessonError(m); };

// A plain own-property read: `{"__proto__": {...}}` from JSON.parse lands as an own
// key, and inherited junk (toString, constructor) must never satisfy a field.
const own = (o, k) => (o !== null && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k)
  ? o[k] : undefined);
const isPlain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// No HTML, no JS-ish punctuation, no URLs: these strings are rendered as text and must
// stay inert even if the model is prompt-injected into emitting markup.
const UNSAFE = /[<>]|&#|javascript:|data:|https?:\/\/|\bwww\./i;
function str(value, field, { min = 1, max = 400 } = {}) {
  if (typeof value !== 'string') fail(`${field} must be a string`);
  const t = value.trim();
  if (t.length < min) fail(`${field} must be at least ${min} characters`);
  if (t.length > max) fail(`${field} must be at most ${max} characters`);
  if (UNSAFE.test(t)) fail(`${field} must not contain markup, scripts or links`);
  return t;
}
const enumOf = (value, allowed, field) =>
  (allowed.includes(value) ? value : fail(`${field} must be one of ${allowed.join(', ')}`));
function num(value, field) {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(`${field} must be a finite number`);
  return value;
}
function int(value, field, lo, hi) {
  if (!Number.isInteger(value)) fail(`${field} must be an integer`);
  if (value < lo || value > hi) fail(`${field} must be between ${lo} and ${hi}`);
  return value;
}

// ------------------------------------------------------------------ numeric answers
// Reuses the vendored no-eval compiler, so "3/4", "0.75" and "6/8" compare equal while
// "process.exit(1)" or "__proto__" simply fail to compile. null = not a number.
export function parseNumeric(text) {
  if (typeof text !== 'string') return null;
  const t = text.trim();
  if (!t || t.length > 40 || !/^[0-9+\-*/.() ]+$/.test(t)) return null;
  const f = compileExpr(t);
  if (!f) return null;
  const v = f(0);
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

// ------------------------------------------------------------------ visuals
const VISUALS = {
  fraction(v) {
    const parts = int(own(v, 'parts'), 'visual.parts', 2, 12);
    return { kind: 'fraction', parts, filled: int(own(v, 'filled'), 'visual.filled', 0, parts),
      caption: str(own(v, 'caption'), 'visual.caption', { max: 200 }) };
  },
  numberline(v) {
    const min = num(own(v, 'min'), 'visual.min');
    const max = num(own(v, 'max'), 'visual.max');
    if (!(max > min)) fail('visual.max must be greater than visual.min');
    const value = num(own(v, 'value'), 'visual.value');
    if (value < min || value > max) fail('visual.value must lie on the number line');
    return { kind: 'numberline', min, max, value,
      caption: str(own(v, 'caption'), 'visual.caption', { max: 200 }) };
  },
  passage(v) {
    return { kind: 'passage', text: str(own(v, 'text'), 'visual.text', { max: 1200 }),
      caption: str(own(v, 'caption'), 'visual.caption', { max: 200 }) };
  },
  tokens(v) {
    return { kind: 'tokens', count: int(own(v, 'count'), 'visual.count', 1, 30),
      caption: str(own(v, 'caption'), 'visual.caption', { max: 200 }) };
  },
  // Labeled process/timeline diagram: the animated teaching representation is built
  // from these stages with local CSS/SVG. Text only — no markup, assets or URLs.
  sequence(v) {
    const raw = own(v, 'stages');
    if (!Array.isArray(raw) || raw.length < 2 || raw.length > 6) fail('visual.stages must be 2 to 6 stages');
    return { kind: 'sequence', caption: str(own(v, 'caption'), 'visual.caption', { max: 200 }),
      stages: raw.map((s, i) => {
        if (!isPlain(s)) fail(`visual.stages[${i}] must be an object`);
        return { label: str(own(s, 'label'), `visual.stages[${i}].label`, { max: 60 }),
          detail: str(own(s, 'detail'), `visual.stages[${i}].detail`, { max: 240 }) };
      }) };
  },
};

function validateVisual(raw) {
  if (!isPlain(raw)) fail('step.visual must be an object');
  const build = Object.prototype.hasOwnProperty.call(VISUALS, String(own(raw, 'kind')))
    ? VISUALS[own(raw, 'kind')] : fail(`visual.kind must be one of ${Object.keys(VISUALS).join(', ')}`);
  return build(raw);
}

// ------------------------------------------------------------------ steps
function validateStep(raw, i) {
  if (!isPlain(raw)) fail(`steps[${i}] must be an object`);
  const kind = enumOf(own(raw, 'kind'), KINDS, `steps[${i}].kind`);
  const step = {
    id: str(own(raw, 'id'), `steps[${i}].id`, { max: 60 }),
    prompt: str(own(raw, 'prompt'), `steps[${i}].prompt`, { max: 400 }),
    explanation: str(own(raw, 'explanation'), `steps[${i}].explanation`, { max: 600 }),
    hint: str(own(raw, 'hint'), `steps[${i}].hint`, { max: 300 }),
    kind,
    visual: validateVisual(own(raw, 'visual')),
  };
  const answer = own(raw, 'answer');
  if (kind === 'writing') {
    // Writing has no deterministic key; one present means the model misunderstood the
    // contract, and a bogus key would invite auto-grading prose.
    if (answer !== undefined) fail(`steps[${i}] of kind writing must not carry an answer`);
  } else if (kind === 'choice') {
    const raws = own(raw, 'choices');
    if (!Array.isArray(raws) || raws.length < 2 || raws.length > 5) {
      fail(`steps[${i}].choices must be 2 to 5 options`);
    }
    step.choices = raws.map((c, j) => str(c, `steps[${i}].choices[${j}]`, { max: 160 }));
    if (new Set(step.choices).size !== step.choices.length) fail(`steps[${i}].choices must be distinct`);
    step.answer = str(answer, `steps[${i}].answer`, { max: 160 });
    if (!step.choices.includes(step.answer)) fail(`steps[${i}].answer must be one of its choices`);
  } else {
    step.answer = str(answer, `steps[${i}].answer`, { max: 40 });
    if (parseNumeric(step.answer) === null) fail(`steps[${i}].answer must be a finite number or fraction`);
  }
  return step;
}

function validateBranch(raw, field) {
  if (!isPlain(raw)) fail(`${field} must be an object`);
  return { goal: str(own(raw, 'goal'), `${field}.goal`, { max: 300 }),
    reason: str(own(raw, 'reason'), `${field}.reason`, { max: 300 }) };
}

/**
 * The learner-visible text of a visual, in full. Used to ground AI feedback in what the
 * learner actually saw instead of a paraphrase, so it lives beside the schema it reads.
 */
export function describeVisual(visual) {
  if (!isPlain(visual)) return '';
  const cap = typeof visual.caption === 'string' ? visual.caption : '';
  switch (visual.kind) {
    case 'fraction': return `fraction bar, ${visual.filled} of ${visual.parts} parts shaded — "${cap}"`;
    case 'numberline': return `number line from ${visual.min} to ${visual.max}, marked at ${visual.value} — "${cap}"`;
    case 'tokens': return `${visual.count} counters — "${cap}"`;
    case 'passage': return `reading passage — "${cap}"\n${visual.text}`;
    case 'sequence': return [`sequence diagram — "${cap}"`,
      ...(visual.stages || []).map((s, i) => `  ${i + 1}. ${s.label}: ${s.detail}`)].join('\n');
    default: return cap;
  }
}

/**
 * Validated Lesson (fresh object, contract fields only) or throw LessonError.
 * version 2 = age + free-text subject. version 1 = saved records: graded, whitelisted
 * subject, and NO age is ever invented for them.
 */
export function validateLesson(value) {
  if (!isPlain(value)) fail('must be an object');
  const version = own(value, 'version');
  if (version !== 1 && version !== 2) fail('version must be 1 or 2');
  const rawSteps = own(value, 'steps');
  if (!Array.isArray(rawSteps) || rawSteps.length !== 3) fail('steps must be exactly three');
  const steps = rawSteps.map(validateStep);
  if (new Set(steps.map((s) => s.id)).size !== 3) fail('step ids must be unique');
  // The third step is a FRESH check, so it cannot restate guided practice.
  const prompts = steps.map((s) => s.prompt.toLowerCase());
  if (new Set(prompts).size !== 3) fail('step prompts must be distinct');
  const path = own(value, 'path');
  if (!isPlain(path)) fail('path must be an object');
  const lesson = {
    version,
    id: str(own(value, 'id'), 'id', { max: 60 }),
    title: str(own(value, 'title'), 'title', { max: 120 }),
    goal: str(own(value, 'goal'), 'goal', { max: 300 }),
    locale: enumOf(own(value, 'locale'), LOCALES, 'locale'),
    intro: str(own(value, 'intro'), 'intro', { max: 600 }),
    steps,
    path: { reinforce: validateBranch(own(path, 'reinforce'), 'path.reinforce'),
      advance: validateBranch(own(path, 'advance'), 'path.advance') },
  };
  if (version === 1) {
    lesson.subject = enumOf(own(value, 'subject'), V1_SUBJECTS, 'subject');
    lesson.grade = enumOf(own(value, 'grade'), V1_GRADES, 'grade');
  } else {
    lesson.subject = str(own(value, 'subject'), 'subject', { max: 80 });
    // Self-reported personalisation only: not eligibility, consent or assessed ability.
    lesson.age = int(own(value, 'age'), 'age', 1, 120);
  }
  return lesson;
}

// ------------------------------------------------------------------ grading
/**
 * Canonical local verdict. `ungraded` means "this prototype cannot judge it", never
 * partial credit; the AI may explain but may not change this.
 */
export function gradeAnswer(step, answer) {
  if (!isPlain(step)) return { verdict: 'ungraded', reason: 'No step to grade against.' };
  const submitted = typeof answer === 'string' ? answer.trim() : '';
  if (step.kind === 'writing') {
    return { verdict: 'ungraded', reason: 'Writing is not auto-graded in this prototype.' };
  }
  if (!submitted) return { verdict: 'ungraded', reason: 'No answer was submitted.' };
  if (step.kind === 'choice') {
    const choices = Array.isArray(step.choices) ? step.choices : [];
    const hit = choices.find((c) => c.trim() === submitted);
    if (hit === undefined) return { verdict: 'ungraded', reason: 'Answer did not match any listed choice.' };
    return hit === step.answer
      ? { verdict: 'correct', reason: 'Matches the generated answer key.' }
      : { verdict: 'incorrect', reason: 'A different choice is keyed as correct.' };
  }
  const got = parseNumeric(submitted);
  const want = parseNumeric(step.answer);
  if (got === null) return { verdict: 'ungraded', reason: 'Answer is not a number this check can read.' };
  if (want === null) return { verdict: 'ungraded', reason: 'Generated answer key is not a readable number.' };
  // Tolerance covers 1/3 vs 0.333…; it is a display tolerance, not partial credit.
  return Math.abs(got - want) <= 1e-9 * Math.max(1, Math.abs(want))
    ? { verdict: 'correct', reason: 'Equals the generated answer key.' }
    : { verdict: 'incorrect', reason: 'Does not equal the generated answer key.' };
}

// ------------------------------------------------------------------ next step
/**
 * Conservative suggestion ONLY. Advances exclusively on an unassisted correct verdict on
 * the third (fresh-check) step of THIS lesson. Absence of requested hints does not prove
 * the learner had no outside help, so `advance` is a suggestion, never a mastery claim.
 */
export function chooseNext(lesson, evidence) {
  const fresh = lesson?.steps?.[2];
  const reinforce = { ...lesson.path.reinforce, kind: 'reinforce' };
  if (!fresh || fresh.kind === 'writing') return reinforce; // writing is never a pass signal
  const rows = (Array.isArray(evidence) ? evidence : [])
    .filter((e) => isPlain(e) && own(e, 'lessonId') === lesson.id && own(e, 'stepId') === fresh.id);
  if (!rows.length) return reinforce;
  // Latest by timestamp, falling back to submission order for equal/absent stamps.
  const latest = rows.reduce((a, b) =>
    (String(own(b, 'at') || '') >= String(own(a, 'at') || '') ? b : a));
  // S14: advancing needs POSITIVE proof — a local check that explicitly recorded no
  // assistance. An `ai-feedback` record, a missing source or a missing `assisted` flag
  // proves nothing, so each one reinforces instead.
  const passed = own(latest, 'source') === 'local-check'
    && own(latest, 'assisted') === false
    && own(latest, 'verdict') === 'correct';
  return passed ? { ...lesson.path.advance, kind: 'advance' } : reinforce;
}
