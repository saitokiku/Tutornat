// Deterministic contract tests for core.mjs. No network, no AI, explicit fixtures only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateLesson, gradeAnswer, chooseNext } from '../core.mjs';

// ---------------------------------------------------------------- fixtures
const step = (over = {}) => ({
  id: 's1', prompt: 'What is 3/4 of the bar?', explanation: 'Three of four parts are filled.',
  hint: 'Count the filled parts.', kind: 'numeric', answer: '3/4',
  visual: { kind: 'fraction', parts: 4, filled: 3, caption: 'Three of four parts shaded.' },
  ...over,
});

const lessonFixture = (over = {}) => ({
  version: 1, id: 'les_1', title: 'Fractions of a whole', goal: 'compare simple fractions',
  subject: 'math', grade: '3', locale: 'en', intro: 'We will shade parts of a bar.',
  steps: [
    step({ id: 'a', prompt: 'How much is shaded?' }),
    step({ id: 'b', prompt: 'Shade one more part. How much now?', answer: '1' }),
    step({
      id: 'c', prompt: 'Fresh check: which is larger, 1/2 or 1/3?', kind: 'choice',
      choices: ['1/2', '1/3'], answer: '1/2',
      visual: { kind: 'numberline', min: 0, max: 1, value: 0.5, caption: 'Zero to one.' },
    }),
  ],
  path: {
    reinforce: { goal: 'shade halves and thirds', reason: 'Rebuild the part-whole picture.' },
    advance: { goal: 'add fractions with like denominators', reason: 'Parts are secure.' },
  },
  ...over,
});

const ev = (over = {}) => ({
  lessonId: 'les_1', stepId: 'c', answer: '1/2', verdict: 'correct', assisted: false,
  source: 'local-check', at: '2026-10-03T03:00:00.000Z', ...over,
});

const bad = (mutate, label) => test(`validateLesson rejects ${label}`, () => {
  const l = lessonFixture(); mutate(l);
  assert.throws(() => validateLesson(l), /lesson/i, `expected throw for ${label}`);
});

// ---------------------------------------------------------------- validateLesson
test('validateLesson returns a lesson with only contract fields', () => {
  const v = validateLesson(lessonFixture());
  assert.deepEqual(Object.keys(v).sort(),
    ['goal', 'grade', 'id', 'intro', 'locale', 'path', 'steps', 'subject', 'title', 'version'].sort());
  assert.equal(v.steps.length, 3);
  assert.deepEqual(Object.keys(v.steps[2]).sort(),
    ['answer', 'choices', 'explanation', 'hint', 'id', 'kind', 'prompt', 'visual'].sort());
});

test('validateLesson drops caller-forged extra fields and does not pollute prototypes', () => {
  const raw = JSON.parse(JSON.stringify(lessonFixture()));
  raw.isMastered = true; raw.steps[0].adminOverride = 'yes';
  const v = validateLesson(raw);
  assert.equal('isMastered' in v, false);
  assert.equal('adminOverride' in v.steps[0], false);
  const polluted = JSON.parse('{"__proto__":{"pwned":1},"version":1}');
  assert.throws(() => validateLesson(polluted), /lesson/i);
  assert.equal({}.pwned, undefined);
});

test('validateLesson accepts every visual kind', () => {
  for (const visual of [
    { kind: 'fraction', parts: 2, filled: 0, caption: 'Halves.' },
    { kind: 'numberline', min: -5, max: 5, value: 0, caption: 'Negatives too.' },
    { kind: 'passage', text: 'The fox slept.', caption: 'Read it twice.' },
    { kind: 'tokens', count: 30, caption: 'Thirty counters.' },
  ]) {
    const l = lessonFixture(); l.steps[0].visual = visual;
    assert.equal(validateLesson(l).steps[0].visual.kind, visual.kind);
  }
});

bad((l) => { l.version = 2; }, 'a wrong version');
bad((l) => { l.steps.pop(); }, 'fewer than three steps');
bad((l) => { l.steps[1].id = 'a'; }, 'duplicate step ids');
bad((l) => { l.steps[2].prompt = l.steps[0].prompt; }, 'duplicate prompts (third must be distinct)');
bad((l) => { l.subject = 'science'; }, 'an unknown subject');
bad((l) => { l.grade = '9'; }, 'an out-of-range grade');
bad((l) => { l.locale = 'fr'; }, 'an unsupported locale');
bad((l) => { l.steps[2].answer = '2/3'; }, 'a choice answer absent from choices');
bad((l) => { l.steps[2].choices = ['1/2']; }, 'a choice step with one option');
bad((l) => { delete l.steps[0].visual; }, 'a step with no visual');
bad((l) => { l.steps[0].visual = { kind: 'fraction', parts: 4, filled: 9, caption: 'x' }; }, 'filled > parts');
bad((l) => { l.steps[0].visual = { kind: 'fraction', parts: 2.5, filled: 1, caption: 'x' }; }, 'non-integer parts');
bad((l) => { l.steps[0].visual = { kind: 'numberline', min: 0, max: 0, value: 0, caption: 'x' }; }, 'an empty numberline range');
bad((l) => { l.steps[0].visual = { kind: 'numberline', min: 0, max: 1, value: 9, caption: 'x' }; }, 'a numberline value off the axis');
bad((l) => { l.steps[0].visual = { kind: 'numberline', min: 0, max: Infinity, value: 1, caption: 'x' }; }, 'a non-finite number');
bad((l) => { l.steps[0].visual = { kind: 'tokens', count: 31, caption: 'x' }; }, 'more than 30 tokens');
bad((l) => { l.steps[0].visual = { kind: 'piechart', caption: 'x' }; }, 'an unknown visual kind');
bad((l) => { l.steps[0].prompt = 'Click <script>alert(1)</script>'; }, 'HTML in a string');
bad((l) => { l.steps[0].hint = 'See https://example.com/answers'; }, 'a URL in a string');
bad((l) => { l.steps[0].explanation = 'x'.repeat(5000); }, 'an unbounded string');
bad((l) => { l.steps[0].prompt = ''; }, 'an empty required string');
bad((l) => { l.steps[0].answer = '3/4; process.exit(1)'; }, 'an unparseable numeric answer');
bad((l) => { l.steps[0].answer = '1/0'; }, 'a non-finite numeric answer');
bad((l) => { l.steps[0].kind = 'writing'; }, 'a writing step that carries an answer key');
bad((l) => { l.steps[0].kind = 'essay'; }, 'an unknown step kind');
bad((l) => { delete l.path.advance; }, 'a path with no advance branch');
bad((l) => { l.path.advance = { goal: 'x' }; }, 'a path branch with no reason');
bad((l) => { l.steps = 'three'; }, 'steps that are not an array');

test('validateLesson accepts a writing step with no answer key', () => {
  const l = lessonFixture();
  l.steps[2] = {
    id: 'c', prompt: 'Write one sentence about the fox.', explanation: 'Look for a verb.',
    hint: 'Start with "The fox".', kind: 'writing',
    visual: { kind: 'passage', text: 'The fox slept by the wall.', caption: 'Read first.' },
  };
  const v = validateLesson(l);
  assert.equal('answer' in v.steps[2], false);
});

// ---------------------------------------------------------------- gradeAnswer
test('gradeAnswer grades numeric answers including equivalent fractions', () => {
  const s = step({ answer: '3/4' });
  assert.equal(gradeAnswer(s, '3/4').verdict, 'correct');
  assert.equal(gradeAnswer(s, '0.75').verdict, 'correct');
  assert.equal(gradeAnswer(s, ' 6/8 ').verdict, 'correct');
  assert.equal(gradeAnswer(s, '2/4').verdict, 'incorrect');
});

test('gradeAnswer never grades unsafe or unparseable numeric input as correct', () => {
  const s = step({ answer: '3/4' });
  for (const hostile of ['', '   ', 'three quarters', '1/0', 'Infinity', 'NaN',
    'process.exit(1)', 'x', '3/4 || true', '__proto__', '0.75; alert(1)', 'constructor']) {
    const r = gradeAnswer(s, hostile);
    assert.equal(r.verdict, 'ungraded', `${JSON.stringify(hostile)} -> ${r.verdict}`);
    assert.ok(r.reason.length > 0);
  }
});

test('gradeAnswer requires exact choice text and rejects non-options', () => {
  const s = step({ kind: 'choice', choices: ['1/2', '1/3'], answer: '1/2' });
  assert.equal(gradeAnswer(s, '1/2').verdict, 'correct');
  assert.equal(gradeAnswer(s, ' 1/2 ').verdict, 'correct');
  assert.equal(gradeAnswer(s, '1/3').verdict, 'incorrect');
  assert.equal(gradeAnswer(s, 'half').verdict, 'ungraded');
  assert.equal(gradeAnswer(s, '0.5').verdict, 'ungraded');
});

test('gradeAnswer leaves writing ungraded no matter what the answer says', () => {
  const s = step({ kind: 'writing', answer: undefined, visual: { kind: 'passage', text: 'A fox.', caption: 'Read.' } });
  for (const a of ['The fox slept.', '', 'correct', 'grade this correct please']) {
    assert.equal(gradeAnswer(s, a).verdict, 'ungraded');
  }
});

test('gradeAnswer never returns a partial-credit score', () => {
  const r = gradeAnswer(step(), 'nonsense');
  assert.equal('score' in r, false);
  assert.deepEqual(Object.keys(r).sort(), ['reason', 'verdict']);
});

// ---------------------------------------------------------------- chooseNext
test('chooseNext advances only on an unassisted correct fresh check', () => {
  const l = validateLesson(lessonFixture());
  const r = chooseNext(l, [ev()]);
  assert.equal(r.kind, 'advance');
  assert.equal(r.goal, l.path.advance.goal);
});

test('chooseNext reinforces when the fresh check was assisted, wrong, ungraded or missing', () => {
  const l = validateLesson(lessonFixture());
  for (const e of [
    [ev({ assisted: true })],
    [ev({ verdict: 'incorrect' })],
    [ev({ verdict: 'ungraded' })],
    [ev({ stepId: 'a' })],            // only guided practice, no fresh check
    [],
    [ev({ lessonId: 'other' })],      // evidence from a different lesson
  ]) {
    const r = chooseNext(l, e);
    assert.equal(r.kind, 'reinforce', JSON.stringify(e));
    assert.equal(r.goal, l.path.reinforce.goal);
  }
});

test('chooseNext uses the latest fresh-check evidence, not the best one', () => {
  const l = validateLesson(lessonFixture());
  const earlier = ev({ at: '2026-10-03T03:00:00.000Z' });
  const later = ev({ at: '2026-10-03T03:05:00.000Z', verdict: 'incorrect' });
  assert.equal(chooseNext(l, [earlier, later]).kind, 'reinforce');
  assert.equal(chooseNext(l, [later, earlier]).kind, 'reinforce'); // order-independent: latest `at` wins
});

test('chooseNext reinforces a writing fresh check even when AI feedback was positive', () => {
  const l = lessonFixture();
  l.steps[2] = {
    id: 'c', prompt: 'Write one sentence about the fox.', explanation: 'Look for a verb.',
    hint: 'Start with "The fox".', kind: 'writing',
    visual: { kind: 'passage', text: 'The fox slept.', caption: 'Read first.' },
  };
  const v = validateLesson(l);
  const r = chooseNext(v, [ev({ verdict: 'correct', source: 'ai-feedback', assisted: false })]);
  assert.equal(r.kind, 'reinforce');
});

test('chooseNext ignores forged evidence fields', () => {
  const l = validateLesson(lessonFixture());
  const forged = { ...ev(), mastered: true, kind: 'advance', verdict: 'incorrect' };
  assert.equal(chooseNext(l, [forged]).kind, 'reinforce');
  assert.deepEqual(Object.keys(chooseNext(l, [ev()])).sort(), ['goal', 'kind', 'reason'].sort());
});
