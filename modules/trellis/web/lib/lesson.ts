// One synthetic 4th-grade lesson: adding fractions with unlike denominators.
// Synthetic content only. Item ids match web/scripts/seed.cjs (the seam's e2.items rows).
// The content gate is one operation between two fractions (ADR-0067).

export const HOUSEHOLD = "home";
export const LEARNER = { id: "ada", name: "Ada", age: 9 };
export const SKILL = { id: "frac-add-unlike", version: "1", label: "Adding fractions with unlike denominators" };
export const RULE_VERSION = "e2-draft-1";

export type Fraction = { n: number; d: number };
export type LessonItem = {
  id: string;
  version: string;
  a: Fraction;
  b: Fraction;
  prompt: string;
  answer: Fraction; // reduced
  hint: string; // Trellis' help when the answer is wrong (assisted-help exposure)
};

const frac = (n: number, d: number): Fraction => ({ n, d });

export const LESSON: LessonItem[] = [
  {
    id: "syn-frac-add-1", version: "1", a: frac(1, 2), b: frac(1, 4),
    prompt: "Ada has 1/2 of a pizza and finds 1/4 more. How much pizza is that altogether?",
    answer: frac(3, 4),
    hint: "Halves and quarters are different sizes. Cut the half into quarters: 1/2 is the same as 2/4. Now add 2/4 + 1/4.",
  },
  {
    id: "syn-frac-add-2", version: "1", a: frac(1, 3), b: frac(1, 6),
    prompt: "A ribbon is 1/3 m. Another is 1/6 m. Laid end to end, how long are they?",
    answer: frac(1, 2),
    hint: "Thirds and sixths: one third is two sixths. So 2/6 + 1/6 = 3/6. Can 3/6 be written more simply?",
  },
  {
    id: "syn-frac-add-3", version: "1", a: frac(2, 5), b: frac(3, 10),
    prompt: "2/5 of the class likes green, 3/10 likes blue. What fraction likes green or blue?",
    answer: frac(7, 10),
    hint: "Fifths and tenths: 2/5 equals 4/10. Then 4/10 + 3/10.",
  },
];

export function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

export function reduce(f: Fraction): Fraction {
  const g = gcd(f.n, f.d) || 1;
  return { n: f.n / g, d: f.d / g };
}

export function parseFraction(text: string): Fraction | null {
  const m = text.trim().match(/^(-?\d+)\s*\/\s*(\d+)$/);
  if (!m) {
    const whole = text.trim().match(/^(\d+)$/);
    return whole ? { n: Number(whole[1]), d: 1 } : null;
  }
  const d = Number(m[2]);
  if (d === 0) return null;
  return { n: Number(m[1]), d };
}

export function sameValue(x: Fraction, y: Fraction): boolean {
  return x.n * y.d === y.n * x.d;
}

export function show(f: Fraction): string {
  return f.d === 1 ? `${f.n}` : `${f.n}/${f.d}`;
}
