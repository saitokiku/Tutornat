/**
 * The independent content gate (criterion 4). Approval metadata says a
 * reviewer signed the key; it cannot make the key mathematically true. Before
 * a numeric key grades an assessment response, the stem is evaluated HERE,
 * without reading the key, and the two must agree. One rule, fail closed:
 *
 *   - the evaluator produced a value and it agrees with the key → grade;
 *   - it produced a value that disagrees                        → `disagrees` (key_unverified);
 *   - it produced no value                                      → `unverifiable` (key_unverifiable:<why>).
 *
 * `unverifiable` NEVER falls through to the stored key (round 5). Round 9
 * (reviewer r8, ADR-0067): the grammar is ONE operation between TWO fractions
 * and nothing else — after NFKC (refused when it creates a digit), whitespace
 * collapse, at most one whole-stem LaTeX delimiter pair (`$…$` or `\(…\)`),
 * one lead phrase from a closed list, exactly one trailer from the closed list
 * (`.`, `?` or `= ?` — never two, so `= ?.` and `= ??` abstain as
 * `not_canonical_stem`; issue #15) and one outer parenthesis pair, the stem must be exactly `ATOM OP ATOM`, where ATOM
 * is an unsigned integer or an unsigned `p/q` (no spaces inside, no sign, no
 * decimal, no mixed number) and OP is one of `+ - × * ÷`; `/` is a fraction bar
 * only, never an operator. A third atom, a second operator, a chain, inner
 * parentheses, a unary minus, a decimal, a mixed number, `!`, `^`, `²`, `\frac`,
 * a letter — anything else — is `not_canonical_stem`. There is no expression
 * evaluator: no precedence, no associativity, no chains exist to get wrong.
 *
 * The key is parsed as an exact rational (integer, `p/q`, finite decimal) or
 * is `key_not_exact_rational`. Agreement is BigInt equality of two normalised
 * rationals: no `Number()`, no tolerance, no epsilon anywhere in the comparison.
 * Any exception anywhere is `evaluator_error:<name>`.
 */
import type { AnswerKey } from '@/lib/tutor/session/state';

export type UnverifiableReason = 'not_canonical_stem' | 'key_not_numeric' | 'key_not_exact_rational' | 'stem_missing' | `evaluator_error:${string}`;

export type ContentVerdict =
  | { status: 'agrees'; expected: string; path: string }
  | { status: 'disagrees'; expected: string; keyed: string; path: string }
  | { status: 'unverifiable'; reason: UnverifiableReason; path: string };

export type Rational = { n: bigint; d: bigint };

/** What the evaluator did: the value (or null) and the normalisation steps that fired, in order. */
export type Evaluation = { value: Rational | null; path: string; why?: UnverifiableReason };

/** An evaluator failure with a stable, recordable name. */
class EvaluatorError extends Error {
  constructor(name: string) { super(name); this.name = name; }
}

function gcd(a: bigint, b: bigint): bigint {
  a = a < 0n ? -a : a; b = b < 0n ? -b : b;
  while (b) [a, b] = [b, a % b];
  return a;
}
function norm(r: Rational): Rational {
  if (r.d === 0n) throw new EvaluatorError('division_by_zero');
  const g = gcd(r.n, r.d) || 1n;
  const sign = r.d < 0n ? -1n : 1n;
  return { n: (sign * r.n) / g, d: (sign * r.d) / g };
}
/** A stem atom: an unsigned integer or an unsigned `p/q`. Nothing else reaches here (the grammar admits nothing else). */
function atom(text: string): Rational {
  const frac = text.match(/^(\d+)\/(\d+)$/);
  if (frac) return norm({ n: BigInt(frac[1] ?? '0'), d: BigInt(frac[2] ?? '1') });
  const int = text.match(/^\d+$/);
  if (int) return { n: BigInt(text), d: 1n };
  throw new EvaluatorError('operand_not_rational');
}
/** The one operation. `×`/`*` multiply, `÷` divides; `/` never arrives here — it is a fraction bar inside an atom. */
function apply(a: Rational, op: string, b: Rational): Rational {
  switch (op) {
    case '+': return norm({ n: a.n * b.d + b.n * a.d, d: a.d * b.d });
    case '-': return norm({ n: a.n * b.d - b.n * a.d, d: a.d * b.d });
    case '*': case '×': return norm({ n: a.n * b.n, d: a.d * b.d });
    case '÷': return norm({ n: a.n * b.d, d: a.d * b.n });
    default: throw new EvaluatorError('unknown_operator');
  }
}
export function showRational(r: Rational): string { return r.d === 1n ? `${r.n}` : `${r.n}/${r.d}`; }

/**
 * Parses an answer key as an exact rational: an integer, `p/q` with integer p and positive integer q, or a finite
 * decimal converted exactly (`0.25` → 1/4). Anything else (repeating decimals, exponents, percentages, words, a
 * zero denominator) is null. Never uses `Number()`.
 */
export function parseExactRational(key: unknown): Rational | null {
  const text = typeof key === 'string' ? key.trim() : typeof key === 'number' && Number.isFinite(key) ? String(key) : null;
  if (text === null) return null;
  const frac = text.match(/^(-?\d+)\/(\d+)$/);
  if (frac) { const d = BigInt(frac[2] ?? '0'); return d === 0n ? null : norm({ n: BigInt(frac[1] ?? '0'), d }); }
  const dec = text.match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (dec) { const places = dec[3] ?? ''; return norm({ n: (dec[1] === '-' ? -1n : 1n) * BigInt((dec[2] ?? '0') + places), d: 10n ** BigInt(places.length) }); }
  return null;
}

// The grammar: `ATOM OP ATOM`. ATOM is an unsigned integer or unsigned `p/q`; OP is one of `+ - × * ÷` with optional
// single spaces around it. `/` is a fraction bar inside an atom, never an operator. Nothing else matches.
const ATOM = String.raw`(\d+(?:\/\d+)?)`;
const BINARY = new RegExp(String.raw`^${ATOM} ?([+\-×*÷]) ?${ATOM}$`);
// The closed list of leading phrases. Stripped once, only at the very start.
const LEAD = /^(?:please )?(?:compute|calculate|evaluate|simplify|work out|find the value of|what is the value of|what is) ?:? ?/i;
// One terminal: exactly one of `= ?`, `.` or `?`, at the very end. The closed list is the contract (ADR-0067, issue #15):
// a second trailer after `= ?` (`= ?.`, `= ??`) is not on it and leaves the stem non-canonical, so it abstains as
// `not_canonical_stem`. `!` is not a terminal (it is a factorial).
const TRAIL = / ?(?:= ?\?|[.?])$/;
// Whole-stem LaTeX delimiters only: `$…$` or `\(…\)` around the entire stem.
const DELIMITED = /^(?:\$([^$]*)\$|\\\(([\s\S]*)\\\))$/;
const ASCII_DIGITS = /[0-9]/g;

/** Strips presentation only. Records each step that changed the text; `lossy` names the step that would have changed meaning. */
function normalise(stem: string): { text: string; steps: string[]; lossy: string | null } {
  const steps: string[] = [];
  const step = (name: string, next: string, prev: string): string => { if (next !== prev) steps.push(name); return next; };
  let t = stem;
  // NFKC is accepted only when it creates no ASCII digit that was not already one (superscripts, vulgar fractions, circled digits are refused).
  const nfkc = t.normalize('NFKC');
  if ((nfkc.match(ASCII_DIGITS) ?? []).length !== (t.match(ASCII_DIGITS) ?? []).length) return { text: t, steps: [...steps, 'nfkc-lossy'], lossy: 'nfkc' };
  t = step('nfkc', nfkc, t);
  t = step('whitespace', t.replace(/\s+/g, ' ').trim(), t);
  const delimited = DELIMITED.exec(t);
  if (delimited) t = step('latex-delimiters', (delimited[1] ?? delimited[2] ?? '').trim(), t);
  t = step('lead-phrase', t.replace(LEAD, ''), t);
  t = step('trail', t.replace(TRAIL, ''), t);
  const inner = t.match(/^\( ?([^()]*?) ?\)$/);
  if (inner) t = step('unwrap-parens', inner[1] ?? '', t);
  return { text: t, steps, lossy: null };
}

/** Evaluates a stem exactly. `value` is null when the stem is not `ATOM OP ATOM` or the operation failed; `path` says which steps fired. */
export function evaluateStem(stem: string): Evaluation {
  if (typeof stem !== 'string' || !stem.trim()) return { value: null, path: 'empty', why: 'stem_missing' };
  let steps: string[] = [];
  try {
    const n = normalise(stem);
    steps = n.steps;
    if (n.lossy) return { value: null, path: ['none', ...steps].join(','), why: 'not_canonical_stem' };
    const binary = BINARY.exec(n.text);
    if (!binary) return { value: null, path: ['none', ...steps].join(','), why: 'not_canonical_stem' };
    const value = apply(atom(binary[1] ?? ''), binary[2] ?? '', atom(binary[3] ?? ''));
    return { value, path: ['binary', ...steps].join(',') };
  } catch (e) {
    const name = (e instanceof Error && e.name ? e.name : 'unknown').replace(/[^A-Za-z0-9_]/g, '_');
    return { value: null, path: ['error', ...steps].join(','), why: `evaluator_error:${name}` };
  }
}

/** Back-compatible shape: the value alone (null when the stem could not be evaluated). */
export function evaluateArithmeticStem(stem: string): Rational | null { return evaluateStem(stem).value; }

/** Does the key agree with an independent evaluation of the stem? Reads the stem and the key; never the response. Never throws. */
export function verifyNumericKey(stem: string, key: AnswerKey): ContentVerdict {
  try {
    const keyed = key.type === 'numeric' && key.answer && 'value' in key.answer ? key.answer.value : null;
    if (keyed === null || keyed === undefined) return { status: 'unverifiable', reason: 'key_not_numeric', path: 'key' };
    const keyValue = parseExactRational(keyed);
    if (keyValue === null) return { status: 'unverifiable', reason: 'key_not_exact_rational', path: 'key' };
    const evaluated = evaluateStem(stem);
    if (!evaluated.value) return { status: 'unverifiable', reason: evaluated.why ?? 'not_canonical_stem', path: evaluated.path };
    const expected = evaluated.value;
    // Equality of two normalised exact rationals. The item's tolerance is the grader's business, not the gate's.
    const agrees = expected.n === keyValue.n && expected.d === keyValue.d;
    return agrees
      ? { status: 'agrees', expected: showRational(expected), path: evaluated.path }
      : { status: 'disagrees', expected: showRational(expected), keyed: String(keyed), path: evaluated.path };
  } catch (e) {
    const name = (e instanceof Error && e.name ? e.name : 'unknown').replace(/[^A-Za-z0-9_]/g, '_');
    return { status: 'unverifiable', reason: `evaluator_error:${name}`, path: 'error' };
  }
}
