/**
 * Local grading (reference §5: the answer types the local grader lacked,
 * ported from Kaizen-AI's verifier). Deterministic, no model, and every
 * refusal is a refusal, never a silent half credit.
 */
import { describe, expect, it } from 'vitest';

import { gradeLocally, parseNumeric } from '@/lib/tutor/checks/grading';
import { compileExpr } from '@/lib/tutor/checks/math-expr';
import {
  expressionsEquivalent,
  isExpression,
  normalizeImplicitMultiplication,
} from '@/lib/tutor/checks/symbolic';
import { validateItems } from '@/lib/tutor/graph/items';
import type { AnswerKey } from '@/lib/tutor/session/state';

const typed = (type: AnswerKey['type'], answer: AnswerKey['answer']): AnswerKey => ({
  type,
  options: null,
  answer,
});

describe('the expression grammar', () => {
  it('compiles the whitelisted grammar and nothing else', () => {
    expect(compileExpr('3*x + 12')!(2)).toBe(18);
    expect(compileExpr('-x^2')!(3)).toBe(-9);
    expect(compileExpr('sqrt(x)')!(-1)).toBeNaN();
    expect(compileExpr('x**2')).toBeNull();
    // The raw grammar has no implicit multiplication: "2x" is two values and
    // no operator, which evaluates to nothing. The normalizer below fixes it.
    expect(compileExpr('2x')!(3)).toBeNaN();
    expect(compileExpr('constructor')).toBeNull();
    expect(compileExpr('x.y')).toBeNull();
    expect(compileExpr('')).toBeNull();
  });

  it('reads what learners actually write', () => {
    expect(normalizeImplicitMultiplication('3x + 2(x+1)')).toBe('3*x+2*(x+1)');
    expect(normalizeImplicitMultiplication('sin(x)')).toBe('sin(x)');
    expect(normalizeImplicitMultiplication('(x+1)(x-1)')).toBe('(x+1)*(x-1)');
    expect(isExpression('3(x+4)')).toBe(true);
    expect(isExpression('idk')).toBe(false);
  });

  it('treats two expressions as equivalent when they agree everywhere they are defined', () => {
    expect(expressionsEquivalent('3(x+4)', '3*x + 12')).toBe(true);
    expect(expressionsEquivalent('(x+1)(x-1)', 'x^2-1')).toBe(true);
    expect(expressionsEquivalent('1/x', '1/x')).toBe(true);
    expect(expressionsEquivalent('3x+4', '3x+12')).toBe(false);
    expect(expressionsEquivalent('1/x', 'x')).toBe(false);
  });
});

describe('gradeLocally', () => {
  it('reads a fraction as the number it names', () => {
    expect(parseNumeric('5/6')).toBeCloseTo(5 / 6, 6);
    expect(parseNumeric('1 1/2')).toBe(1.5);
  });

  it('accepts a numerically equal fraction and refuses a rounded decimal', () => {
    const key = typed('numeric', { value: '5/6', tolerance: 0.0005 });
    expect(gradeLocally(key, '10/12')).toMatchObject({ graded: true, correct: true });
    expect(gradeLocally(key, '0.833')).toMatchObject({ graded: true, correct: true });
    expect(gradeLocally(key, '0.83')).toMatchObject({ graded: true, correct: false });
  });

  it('tags a named wrong value with its misconception', () => {
    const key = typed('numeric', {
      value: '5/6',
      tolerance: 0.0005,
      wrong: [{ value: '2/5', misconception: 'add_across' }],
    });
    expect(gradeLocally(key, '2/5')).toMatchObject({
      graded: true,
      correct: false,
      misconception: 'add_across',
    });
    expect(gradeLocally(key, '1/6')).toMatchObject({
      graded: true,
      correct: false,
      misconception: null,
    });
  });

  it('refuses another form of the same number when the key is exact', () => {
    const key = typed('short', { value: '3/4', exact: true });
    expect(gradeLocally(key, ' 3/4 ')).toMatchObject({ graded: true, correct: true });
    expect(gradeLocally(key, '6/8')).toMatchObject({ graded: true, correct: false });
    expect(gradeLocally(key, '0.75')).toMatchObject({ graded: true, correct: false });
    const loose = typed('short', { value: '3/4' });
    expect(gradeLocally(loose, '6/8')).toMatchObject({ graded: true, correct: true });
  });

  it('grades a short answer by its required keywords when the key names them', () => {
    const key = typed('short', {
      value: 'make the denominators the same, then add the numerators',
      keywords: ['same', 'denominator'],
    });
    expect(gradeLocally(key, 'You make the denominators the same first.')).toMatchObject({
      graded: true,
      correct: true,
    });
    expect(gradeLocally(key, 'same denominator')).toMatchObject({ graded: true, correct: true });
    expect(gradeLocally(key, 'add the tops')).toMatchObject({ graded: true, correct: false });
    expect(gradeLocally(key, 'the denominators')).toMatchObject({ graded: true, correct: false });
  });

  it('names a wrong short answer too', () => {
    const key = typed('short', {
      value: '5/8',
      exact: true,
      wrong: [{ value: '3/5', misconception: 'whole_number_bias' }],
    });
    expect(gradeLocally(key, '3/5')).toMatchObject({
      graded: true,
      correct: false,
      misconception: 'whole_number_bias',
    });
  });

  it('grades a symbolic answer by equivalence, tags a named wrong form, and refuses non-expressions', () => {
    const key = typed('symbolic', {
      value: '3*x + 12',
      accept: ['3x+12'],
      wrong: [{ value: '3x+4', misconception: 'computation' }],
    });
    expect(gradeLocally(key, '3(x+4)')).toMatchObject({ graded: true, correct: true });
    expect(gradeLocally(key, '12+3x')).toMatchObject({ graded: true, correct: true });
    expect(gradeLocally(key, '3x+4')).toMatchObject({
      graded: true,
      correct: false,
      misconception: 'computation',
    });
    expect(gradeLocally(key, '3x+5')).toMatchObject({
      graded: true,
      correct: false,
      misconception: null,
    });
    expect(gradeLocally(key, 'idk')).toEqual({ graded: false, reason: 'invalid_answer' });
  });
});

describe('the item validator', () => {
  const base = {
    skill: 'F8',
    representation: 'symbolic',
    band: 'both',
    source: 'test',
    rationale: 'because',
    reviewed_by: 't',
    reviewed_at: '2026-01-01',
  };

  it('accepts a fraction string as a numeric value, named wrong values, keywords and symbolic keys', () => {
    const { valid, problems } = validateItems([
      {
        ...base,
        id: 'ok-1',
        type: 'numeric',
        stem: 'What is 1/2 + 1/3?',
        answer: {
          value: '5/6',
          tolerance: 0.0005,
          wrong: [{ value: '2/5', misconception: 'add_across' }],
        },
      },
      {
        ...base,
        id: 'ok-2',
        type: 'short',
        stem: 'How do you add unlike fractions?',
        answer: { value: 'same denominator', keywords: ['same', 'denominator'] },
      },
      {
        ...base,
        id: 'ok-3',
        type: 'symbolic',
        stem: 'Expand 3(x + 4).',
        answer: { value: '3*x + 12', accept: ['3x+12'] },
      },
    ]);
    expect(problems).toEqual([]);
    expect(valid.map((item) => item.id)).toEqual(['ok-1', 'ok-2', 'ok-3']);
  });

  it('refuses a numeric value that is not a number, an unknown wrong-value tag, and a symbolic key that does not compile', () => {
    const { problems } = validateItems([
      {
        ...base,
        id: 'bad-1',
        type: 'numeric',
        stem: 'What is 1/2 + 1/3?',
        answer: { value: 'five sixths', tolerance: 0 },
      },
      {
        ...base,
        id: 'bad-2',
        type: 'numeric',
        stem: 'What is 1/2 + 1/3?',
        answer: { value: 1, tolerance: 0, wrong: [{ value: 2, misconception: 'made_up' }] },
      },
      {
        ...base,
        id: 'bad-3',
        type: 'symbolic',
        stem: 'Expand 3(x + 4).',
        answer: { value: 'x**2' },
      },
    ]);
    expect(problems).toHaveLength(3);
    expect(problems[0]).toMatch(/bad-1/);
    expect(problems[1]).toMatch(/bad-2/);
    expect(problems[2]).toMatch(/bad-3/);
  });
});
