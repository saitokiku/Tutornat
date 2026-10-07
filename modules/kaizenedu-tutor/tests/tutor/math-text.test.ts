/**
 * Coursework arrives as Markdown with `$…$` maths, because that is what the
 * extraction prompt asks for. Printed raw it reads as source code to a child,
 * which is what it did.
 */
import { describe, expect, it } from 'vitest';

import { splitMath } from '@/components/tutor/ui/math-text';

describe('splitting problem text into prose and maths', () => {
  it('pulls an inline formula out of a sentence', () => {
    expect(splitMath('Write a fraction equal to $\\frac{2}{3}$ please.')).toEqual([
      { kind: 'text', value: 'Write a fraction equal to ', display: false },
      { kind: 'math', value: '\\frac{2}{3}', display: false },
      { kind: 'text', value: ' please.', display: false },
    ]);
  });

  it('handles several formulas in one line', () => {
    const segments = splitMath(
      'Work out $\\frac{2}{3} + \\frac{1}{6}$ and compare with $\\frac{5}{6}$.',
    );
    expect(segments.filter((s) => s.kind === 'math').map((s) => s.value)).toEqual([
      '\\frac{2}{3} + \\frac{1}{6}',
      '\\frac{5}{6}',
    ]);
  });

  it('marks display maths so it renders centred', () => {
    const segments = splitMath('Show that $$a^2 + b^2 = c^2$$ holds.');
    expect(segments[1]).toEqual({ kind: 'math', value: 'a^2 + b^2 = c^2', display: true });
  });

  it('leaves text with no maths completely alone', () => {
    const plain = 'Explain why adding across is wrong.';
    expect(splitMath(plain)).toEqual([{ kind: 'text', value: plain, display: false }]);
  });

  it('does not treat an escaped dollar sign as maths', () => {
    const segments = splitMath('It costs \\$5 in total.');
    expect(segments.every((s) => s.kind === 'text')).toBe(true);
  });

  it('leaves an unclosed dollar as ordinary text rather than swallowing the line', () => {
    const segments = splitMath('The cost is $5 and the rest is prose.');
    expect(segments.every((s) => s.kind === 'text')).toBe(true);
  });
});
