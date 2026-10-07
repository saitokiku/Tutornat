/**
 * Symbolic answers: is what the learner typed the same expression as the
 * key? Ported from Kaizen-AI's `web/lib/engine/verify/symbolic.js`.
 *
 * Learners write `3x`, `2(x+1)` and `(x+1)(x-1)`. The expression grammar has
 * no implicit multiplication, so without the first pass every one of those
 * correct answers would be marked wrong — the worst possible failure, since
 * the learner did it right and the record would show an unassisted miss.
 *
 * Two expressions in x are treated as equivalent when they agree at many
 * sample points. That is not a proof of identity, but it catches every
 * realistic answer and costs microseconds. The points avoid integers to dodge
 * common removable singularities, and both sides must be defined at the same
 * points, so `1/x` still matches `1/x` despite the pole at zero.
 */
import { compileExpr, FUNCTION_NAMES } from './math-expr';

export function normalizeImplicitMultiplication(src: string): string {
  let s = String(src ?? '').replace(/\s+/g, '');
  if (!s) return s;
  // digit → letter or '(' : 3x, 3(
  s = s.replace(/(\d)([a-zA-Z(])/g, '$1*$2');
  // ')' → digit, letter or '(' : )x, )3, )(
  s = s.replace(/\)([a-zA-Z0-9(])/g, ')*$1');
  // identifier → '(' , unless the identifier is a function call
  s = s.replace(/([a-zA-Z][a-zA-Z0-9_]*)\(/g, (whole, name: string) =>
    FUNCTION_NAMES.includes(name) ? whole : `${name}*(`,
  );
  // adjacent single letters: xy → x*y (function names and constants are left alone)
  s = s.replace(/\b([a-zA-Z])([a-zA-Z])\b/g, (whole, a: string, b: string) => {
    const joined = a + b;
    return FUNCTION_NAMES.includes(joined) || joined === 'pi' ? whole : `${a}*${b}`;
  });
  return s;
}

function numbersEqual(a: number, b: number, relTol: number, absTol: number): boolean {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  const diff = Math.abs(a - b);
  if (diff <= absTol) return true;
  return diff <= relTol * Math.max(Math.abs(a), Math.abs(b));
}

/** True when the text is an expression the grammar accepts (after implicit multiplication). */
export function isExpression(src: string): boolean {
  return compileExpr(normalizeImplicitMultiplication(src)) !== null;
}

export function expressionsEquivalent(
  a: string,
  b: string,
  options: { samples?: number; relTol?: number } = {},
): boolean {
  const samples = options.samples ?? 21;
  const relTol = options.relTol ?? 1e-6;
  const fa = compileExpr(normalizeImplicitMultiplication(a));
  const fb = compileExpr(normalizeImplicitMultiplication(b));
  if (!fa || !fb) return false;

  let defined = 0;
  let agree = 0;
  for (let i = 0; i < samples; i += 1) {
    const x = -3.17 + (i * 6.34) / (samples - 1); // an irrational-looking stride
    const va = fa(x);
    const vb = fb(x);
    const aOk = Number.isFinite(va);
    const bOk = Number.isFinite(vb);
    if (aOk !== bOk) return false; // the domains differ
    if (!aOk) continue;
    defined += 1;
    if (numbersEqual(va, vb, relTol, 1e-7)) agree += 1;
  }
  if (defined < 5) return false;
  return agree === defined;
}
