// Server-side answer checking.
//
// This module replaces a path where the answer key shipped to the browser,
// correctness was compared client-side, short answers were self-marked, and the
// client PATCHed its own score. So the tests care as much about what must NOT
// pass as about what must.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  check, publicItem, parseNumber, numbersEqual, normalizeText, expressionsEquivalent,
  normalizeImplicitMultiplication,
} from '@/lib/engine/verify/symbolic.js';

// ── The answer key must never reach the client ───────────────────────────────

test('publicItem strips the answer key and every diagnostic field', () => {
  const item = {
    id: 'i1', kind: 'mc', body: 'What is 2+2?', choices: ['3', '4'],
    answer_spec: { index: 1 },
    distractor_misconceptions: ['m-off-by-one', null],
    context_tag: 'arithmetic', difficulty_elo: 1300, exposures: 12,
  };
  const pub = publicItem(item);
  const serialized = JSON.stringify(pub);

  assert.equal(pub.answer_spec, undefined);
  assert.equal(pub.distractor_misconceptions, undefined);
  assert.ok(!serialized.includes('"index"'), 'no answer index may survive serialization');
  assert.ok(!serialized.includes('m-off-by-one'), 'distractor mapping is diagnostic, not public');
  assert.deepEqual(pub.choices, ['3', '4']);
  assert.equal(publicItem(null), null);
});

// ── Multiple choice ──────────────────────────────────────────────────────────

test('mc: index comparison, and a wrong choice names the misconception', () => {
  const item = {
    kind: 'mc', answer_spec: { index: 2 },
    distractor_misconceptions: ['added-denominators', null, null, 'whole-number-bias'],
  };
  assert.equal(check(item, { choice: 2 }).correct, true);

  const wrong = check(item, { choice: 0 });
  assert.equal(wrong.correct, false);
  assert.equal(wrong.matchedMisconception, 'added-denominators',
    'a wrong answer should diagnose, not just fail');
  assert.equal(check(item, { choice: 3 }).matchedMisconception, 'whole-number-bias');
  assert.equal(check(item, {}).correct, false, 'no answer is not a pass');
  assert.equal(check(item, { choice: 'banana' }).correct, false);
});

// ── Numeric ──────────────────────────────────────────────────────────────────

test('parseNumber handles what students actually type', () => {
  assert.equal(parseNumber('42'), 42);
  assert.equal(parseNumber('  -3.5 '), -3.5);
  assert.equal(parseNumber('1,234'), 1234);
  assert.equal(parseNumber('3/4'), 0.75);
  assert.equal(parseNumber('1 1/2'), 1.5);
  assert.equal(parseNumber('-2 1/4'), -2.25);
  assert.equal(parseNumber('50%'), 0.5);
  assert.equal(parseNumber('−7'), -7, 'unicode minus');
  assert.equal(parseNumber('1/0'), null, 'division by zero is not a number');
  assert.equal(parseNumber('abc'), null);
  assert.equal(parseNumber(''), null);
  assert.equal(parseNumber(null), null);
});

test('numeric tolerance is relative, with an absolute floor near zero', () => {
  assert.ok(numbersEqual(1000000, 1000000.01));
  assert.ok(!numbersEqual(1, 1.5));
  assert.ok(numbersEqual(0, 0));
  assert.ok(!numbersEqual(NaN, NaN), 'NaN is never equal to anything');
  assert.ok(!numbersEqual(Infinity, Infinity));
});

test('numeric: equivalent forms pass, and named wrong values diagnose', () => {
  const item = {
    kind: 'numeric',
    answer_spec: {
      value: 0.75,
      misconceptionValues: [{ value: 0.25, misconceptionId: 'inverted-fraction' }],
    },
  };
  assert.equal(check(item, { text: '0.75' }).correct, true);
  assert.equal(check(item, { text: '3/4' }).correct, true, 'a fraction is the same number');
  assert.equal(check(item, { text: '75%' }).correct, true);

  const diag = check(item, { text: '1/4' });
  assert.equal(diag.correct, false);
  assert.equal(diag.matchedMisconception, 'inverted-fraction');

  assert.equal(check(item, { text: 'no idea' }).correct, false);
  assert.equal(check(item, {}).correct, false);
});

// ── Symbolic ─────────────────────────────────────────────────────────────────

test('symbolic equivalence accepts rearrangements, rejects different functions', () => {
  assert.ok(expressionsEquivalent('2*x + 2', '2*(x+1)'));
  assert.ok(expressionsEquivalent('x^2 - 1', '(x-1)*(x+1)'));
  assert.ok(!expressionsEquivalent('x^2', 'x^3'));
  assert.ok(!expressionsEquivalent('x+1', 'x-1'));
  assert.ok(!expressionsEquivalent('nonsense((', 'x'), 'unparseable is not equivalent');
});

test('symbolic: accepted forms and misconception expressions', () => {
  const item = {
    kind: 'symbolic',
    answer_spec: {
      expr: '2*x + 6',
      acceptedForms: ['2*(x+3)'],
      misconceptionExprs: [{ expr: '2*x + 3', misconceptionId: 'forgot-to-distribute' }],
    },
  };
  assert.equal(check(item, { text: '2*x+6' }).correct, true);
  assert.equal(check(item, { text: '2*(x+3)' }).correct, true);
  assert.equal(check(item, { text: '6 + 2*x' }).correct, true, 'commutativity');

  const diag = check(item, { text: '2*x+3' });
  assert.equal(diag.correct, false);
  assert.equal(diag.matchedMisconception, 'forgot-to-distribute');
  assert.equal(check(item, { text: '' }).correct, false);
});

test('students write implicit multiplication, and it must be accepted', () => {
  // The expression grammar has no implicit multiplication. Without normalization
  // every one of these correct answers is marked wrong — the worst failure mode
  // available, because the learner did it right and the ledger would record an
  // unassisted FAILURE on a concept they actually know.
  assert.ok(expressionsEquivalent('3x+12', '3*x + 12'));
  assert.ok(expressionsEquivalent('2(x+3)', '2*x+6'));
  assert.ok(expressionsEquivalent('(x+1)(x-1)', 'x^2-1'));
  assert.ok(expressionsEquivalent('10x - 5', '5(2x-1)'));

  const item = { kind: 'symbolic', answer_spec: { expr: '3*x + 12' } };
  assert.equal(check(item, { text: '3x+12' }).correct, true);
  assert.equal(check(item, { text: '  3 x + 12 ' }).correct, true);
  assert.equal(check(item, { text: '12+3x' }).correct, true);

  // Still wrong when it's wrong.
  assert.equal(check(item, { text: '3x+11' }).correct, false);
});

test('implicit multiplication must not mangle function calls', () => {
  // `sin(x)` becoming `sin*(x)` would silently break every trig item.
  assert.equal(normalizeImplicitMultiplication('sin(x)'), 'sin(x)');
  assert.equal(normalizeImplicitMultiplication('sqrt(x)+cos(x)'), 'sqrt(x)+cos(x)');
  assert.equal(normalizeImplicitMultiplication('2sin(x)'), '2*sin(x)');
  assert.ok(expressionsEquivalent('2sin(x)', '2*sin(x)'));
  assert.ok(expressionsEquivalent('sqrt(x^2)', 'abs(x)'));
});

test('symbolic checking cannot be used to execute code', () => {
  // compileExpr is the existing no-eval compiler; this guards the seam where
  // student text meets it.
  const item = { kind: 'symbolic', answer_spec: { expr: 'x' } };
  for (const attack of ['constructor', 'x.constructor', 'process.exit(1)', '__proto__', 'x;alert(1)']) {
    assert.equal(check(item, { text: attack }).correct, false, `must reject: ${attack}`);
  }
});

// ── Short answer — where self-marking used to live ───────────────────────────

test('short answer is checked, never self-marked', () => {
  const item = {
    kind: 'short',
    answer_spec: { value: 'mitochondria', acceptedForms: ['the mitochondria'] },
  };
  assert.equal(check(item, { text: 'Mitochondria' }).correct, true, 'case-insensitive');
  assert.equal(check(item, { text: '  the mitochondria ' }).correct, true);
  assert.equal(check(item, { text: 'nucleus' }).correct, false);
  assert.equal(check(item, { text: '' }).correct, false);
  // The learner's own claim is not an input to correctness at all.
  assert.equal(check(item, { text: 'nucleus', selfMarked: true }).correct, false);
});

test('short answer keyword mode gives partial credit but demands all keywords to pass', () => {
  const item = {
    kind: 'short',
    answer_spec: { value: '__keywords__', requiredKeywords: ['glucose', 'oxygen'] },
  };
  assert.equal(check(item, { text: 'it makes glucose and oxygen' }).correct, true);
  const partial = check(item, { text: 'it makes glucose' });
  assert.equal(partial.correct, false);
  assert.ok(partial.outcome > 0 && partial.outcome < 1, 'partial knowledge scores partially');
  assert.equal(check(item, { text: 'i do not know' }).outcome, 0);
});

// ── Ordering and cloze ───────────────────────────────────────────────────────

test('order: partial credit by preserved transitions', () => {
  const item = { kind: 'order', answer_spec: { order: [1, 2, 3, 4] } };
  assert.equal(check(item, { order: [1, 2, 3, 4] }).correct, true);
  assert.equal(check(item, { order: [4, 3, 2, 1] }).outcome, 0, 'fully reversed earns nothing');

  const partial = check(item, { order: [1, 2, 4, 3] });
  assert.ok(partial.outcome > 0 && partial.outcome < 1);
  assert.equal(check(item, { order: [1, 2] }).correct, false, 'wrong length fails closed');
  assert.equal(check(item, {}).correct, false);
});

test('cloze: per-blank scoring with accepted alternatives', () => {
  const item = { kind: 'cloze', answer_spec: { blanks: [['light'], ['glucose', 'sugar']] } };
  assert.equal(check(item, { blanks: ['light', 'sugar'] }).correct, true);
  assert.equal(check(item, { blanks: ['light', 'water'] }).outcome, 0.5);
  assert.equal(check(item, { blanks: [] }).outcome, 0);
});

// ── Fail-closed ──────────────────────────────────────────────────────────────

test('an item the server cannot check is never a pass', () => {
  assert.equal(check({ kind: 'essay', answer_spec: {} }, { text: 'anything' }).correct, false);
  assert.equal(check({}, {}).correct, false);
  assert.equal(check(null, null).correct, false);
});

test('every result declares how correctness was established', () => {
  const cases = [
    [{ kind: 'mc', answer_spec: { index: 0 } }, { choice: 0 }, 'structural'],
    [{ kind: 'numeric', answer_spec: { value: 1 } }, { text: '1' }, 'symbolic'],
    [{ kind: 'symbolic', answer_spec: { expr: 'x' } }, { text: 'x' }, 'symbolic'],
    [{ kind: 'short', answer_spec: { value: 'a' } }, { text: 'a' }, 'structural'],
  ];
  for (const [item, res, expected] of cases) {
    // The verifier label decides how much the resulting evidence counts, so it
    // has to be present and correct on every path.
    assert.equal(check(item, res).verifier, expected, `${item.kind} -> ${expected}`);
  }
});

test('normalizeText folds the noise but keeps the content', () => {
  assert.equal(normalizeText('  Photosynthesis!  '), 'photosynthesis');
  assert.equal(normalizeText('café'), 'cafe');
  assert.equal(normalizeText('“quoted”'), '"quoted"');
  assert.equal(normalizeText(null), '');
});
