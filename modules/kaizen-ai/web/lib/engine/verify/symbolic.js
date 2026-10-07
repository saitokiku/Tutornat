// Server-side answer checking. Pure functions; no I/O, no model calls.
//
// WHY THIS EXISTS
// The only machine-checkable path in Kaizen today has three independent trust
// holes: /api/practice returns the answer key to the browser, PracticeModal
// compares it client-side, short answers are self-marked ("I got it" / "I missed
// it") with the student's actual text discarded, and the client then PATCHes its
// own `quality` which the server accepts with a range clamp.
//
// Everything here runs on the server against an answer_spec the client never
// receives. Verifier strength is reported per result, because a normalized
// string match is not the same evidence as symbolic equivalence.
//
// Reuses web/lib/mathExpr.js — the existing no-eval expression compiler, already
// unit-tested against injection — rather than adding a CAS dependency.

import { compileExpr } from '@/lib/mathExpr.js';

// ── Normalization ────────────────────────────────────────────────────────────

export function normalizeText(s) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip combining diacritics
    .replace(/[‘’`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^a-z0-9'"+\-*/^().,= ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Articles and filler that should never decide a right/wrong.
const STOP = new Set(['a', 'an', 'the', 'is', 'are', 'was', 'were', 'of', 'to', 'and']);

function contentWords(s) {
  return normalizeText(s).split(' ').filter((w) => w && !STOP.has(w));
}

// ── Numeric ──────────────────────────────────────────────────────────────────

// Parse a student-typed number: handles commas, unicode minus, percentages,
// fractions ("3/4"), and mixed numbers ("1 1/2").
export function parseNumber(raw) {
  const s = String(raw ?? '')
    .replace(/[−–—]/g, '-')
    .replace(/,/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return null;

  let mult = 1;
  let body = s;
  if (/%$/.test(body)) { mult = 0.01; body = body.slice(0, -1).trim(); }

  // mixed number: "1 1/2"
  const mixed = body.match(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) {
    const whole = Number(mixed[1]);
    const num = Number(mixed[2]);
    const den = Number(mixed[3]);
    if (den === 0) return null;
    const sign = whole < 0 ? -1 : 1;
    return (Math.abs(whole) + num / den) * sign * mult;
  }

  // simple fraction
  const frac = body.match(/^(-?\d*\.?\d+)\s*\/\s*(-?\d*\.?\d+)$/);
  if (frac) {
    const den = Number(frac[2]);
    if (den === 0) return null;
    return (Number(frac[1]) / den) * mult;
  }

  const n = Number(body);
  return Number.isFinite(n) ? n * mult : null;
}

// Tolerance is relative by default so "1,000,000 ± 0.01" doesn't demand absurd
// precision, with an absolute floor so answers near zero still work.
export function numbersEqual(a, b, { relTol = 1e-4, absTol = 1e-9 } = {}) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  const diff = Math.abs(a - b);
  if (diff <= absTol) return true;
  const scale = Math.max(Math.abs(a), Math.abs(b));
  return diff <= relTol * scale;
}

// ── Symbolic ─────────────────────────────────────────────────────────────────

// Known single-argument functions in the mathExpr grammar. Needed so that
// `sin(x)` is not mangled into `sin*(x)` by the implicit-multiplication pass.
const FUNC_NAMES = [
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh',
  'sqrt', 'cbrt', 'abs', 'exp', 'ln', 'log', 'log10', 'log2',
  'floor', 'ceil', 'round', 'sign',
];

// Students write `3x`, `2(x+1)` and `(x+1)(x-1)`. The expression compiler is a
// strict grammar with no implicit multiplication, so without this every one of
// those correct answers is marked wrong — the worst possible failure, because
// the learner did it right and the ledger records unassisted failure.
export function normalizeImplicitMultiplication(src) {
  let s = String(src ?? '').replace(/\s+/g, '');
  if (!s) return s;

  // digit → letter or '(' :  3x, 3(
  s = s.replace(/(\d)([a-zA-Z(])/g, '$1*$2');
  // ')' → digit, letter or '(' :  )x, )3, )(
  s = s.replace(/\)([a-zA-Z0-9(])/g, ')*$1');
  // identifier → '(' , but ONLY when the identifier is not a function call.
  s = s.replace(/([a-zA-Z][a-zA-Z0-9_]*)\(/g, (m, name) =>
    FUNC_NAMES.includes(name) ? m : `${name}*(`);
  // adjacent bare variables: xy -> x*y (single-letter runs only, so function
  // names and multi-letter constants like `pi`/`tau` are left alone).
  s = s.replace(/\b([a-zA-Z])([a-zA-Z])\b/g, (m, a, b) => {
    const joined = a + b;
    return FUNC_NAMES.includes(joined) || ['pi', 'e0'].includes(joined) ? m : `${a}*${b}`;
  });
  return s;
}

// Two expressions in x are equivalent if they agree at many sample points.
// Not a proof of identity, but it catches every realistic student answer and
// costs microseconds. Points avoid integers to dodge common removable
// singularities, and a candidate must agree on a clear majority of DEFINED
// points to pass — so `1/x` vs `1/x` still matches despite the pole at 0.
export function expressionsEquivalent(a, b, { samples = 21, relTol = 1e-6 } = {}) {
  const fa = compileExpr(normalizeImplicitMultiplication(a));
  const fb = compileExpr(normalizeImplicitMultiplication(b));
  if (!fa || !fb) return false;

  let defined = 0;
  let agree = 0;
  for (let i = 0; i < samples; i++) {
    const x = -3.17 + (i * 6.34) / (samples - 1);   // irrational-ish stride
    const va = fa(x);
    const vb = fb(x);
    const aOk = Number.isFinite(va);
    const bOk = Number.isFinite(vb);
    if (aOk !== bOk) return false;                   // domains differ
    if (!aOk) continue;
    defined++;
    if (numbersEqual(va, vb, { relTol, absTol: 1e-7 })) agree++;
  }
  if (defined < 5) return false;
  return agree === defined;
}

// ── The dispatcher ───────────────────────────────────────────────────────────

/**
 * check(item, response) -> { correct, outcome, verifier, matchedMisconception, detail }
 *
 * `item.answer_spec` never leaves the server. `outcome` is continuous in [0,1]
 * so partially-correct multistep and cloze answers contribute proportionally
 * rather than being forced binary.
 *
 * `verifier` is one of the values in types.VERIFIERS and determines how much the
 * resulting evidence is allowed to count — see types.weightOf / isConfirming.
 */
export function check(item, response) {
  const spec = item?.answer_spec || {};
  const kind = item?.kind;

  switch (kind) {
    case 'mc': {
      const picked = Number(response?.choice);
      const correctIdx = Number(spec.index);
      const correct = Number.isInteger(picked) && picked === correctIdx;
      // A wrong choice is diagnostic, not just wrong: distractors are authored
      // from the misconception library so the feedback can name the actual error.
      const dm = Array.isArray(item.distractor_misconceptions) ? item.distractor_misconceptions : [];
      return {
        correct,
        outcome: correct ? 1 : 0,
        verifier: 'structural',
        matchedMisconception: correct ? null : (dm[picked] ?? null),
        detail: { picked, correctIdx },
      };
    }

    case 'order': {
      const given = Array.isArray(response?.order) ? response.order.map(Number) : null;
      const want = Array.isArray(spec.order) ? spec.order.map(Number) : null;
      if (!given || !want || given.length !== want.length) {
        return fail('structural', { reason: 'shape' });
      }
      // Partial credit by adjacent-pair agreement — getting 4 of 5 transitions
      // right is meaningfully different from a scramble.
      let pairs = 0, hit = 0;
      for (let i = 0; i < want.length - 1; i++) {
        pairs++;
        const gi = given.indexOf(want[i]);
        const gj = given.indexOf(want[i + 1]);
        if (gi !== -1 && gj !== -1 && gi < gj) hit++;
      }
      const outcome = pairs ? hit / pairs : 0;
      return {
        correct: outcome === 1,
        outcome: round(outcome),
        verifier: 'structural',
        matchedMisconception: null,
        detail: { pairs, hit },
      };
    }

    case 'numeric': {
      const got = parseNumber(response?.text);
      if (got == null) return fail('symbolic', { reason: 'unparseable' });
      const want = parseNumber(spec.value);
      const tol = { relTol: spec.relTol ?? 1e-4, absTol: spec.absTol ?? 1e-9 };
      if (want != null && numbersEqual(got, want, tol)) {
        return ok('symbolic', { got, want });
      }
      // Named wrong values let a numeric item diagnose as precisely as an MC.
      for (const m of spec.misconceptionValues || []) {
        const mv = parseNumber(m.value);
        if (mv != null && numbersEqual(got, mv, tol)) {
          return { correct: false, outcome: 0, verifier: 'symbolic', matchedMisconception: m.misconceptionId ?? null, detail: { got, matched: m.value } };
        }
      }
      return fail('symbolic', { got, want });
    }

    case 'symbolic': {
      const text = String(response?.text ?? '').trim();
      if (!text) return fail('symbolic', { reason: 'empty' });
      const forms = [spec.expr, ...(spec.acceptedForms || [])].filter(Boolean);
      for (const f of forms) {
        if (expressionsEquivalent(text, f)) return ok('symbolic', { matched: f });
      }
      for (const m of spec.misconceptionExprs || []) {
        if (m.expr && expressionsEquivalent(text, m.expr)) {
          return { correct: false, outcome: 0, verifier: 'symbolic', matchedMisconception: m.misconceptionId ?? null, detail: { matched: m.expr } };
        }
      }
      return fail('symbolic', { text });
    }

    case 'cloze': {
      const given = Array.isArray(response?.blanks) ? response.blanks : [];
      const want = Array.isArray(spec.blanks) ? spec.blanks : [];
      if (!want.length) return fail('structural', { reason: 'no spec' });
      let hit = 0;
      for (let i = 0; i < want.length; i++) {
        const accepted = Array.isArray(want[i]) ? want[i] : [want[i]];
        const g = normalizeText(given[i]);
        if (g && accepted.some((a) => normalizeText(a) === g)) hit++;
      }
      const outcome = hit / want.length;
      return {
        correct: outcome === 1,
        outcome: round(outcome),
        verifier: 'structural',
        matchedMisconception: null,
        detail: { hit, total: want.length },
      };
    }

    case 'short': {
      const text = String(response?.text ?? '').trim();
      if (!text) return fail('structural', { reason: 'empty' });
      const accepted = [spec.value, ...(spec.acceptedForms || [])].filter((v) => v != null);
      const g = normalizeText(text);
      if (accepted.some((a) => normalizeText(a) === g)) return ok('structural', { exact: true });

      // Keyword form: an answer must contain every required content word.
      // Deliberately strict — a fuzzy match here would quietly become the
      // self-marking hole this module replaces.
      if (Array.isArray(spec.requiredKeywords) && spec.requiredKeywords.length) {
        const words = new Set(contentWords(text));
        const need = spec.requiredKeywords.map((k) => normalizeText(k)).filter(Boolean);
        const hit = need.filter((k) => k.split(' ').every((part) => words.has(part))).length;
        if (hit === need.length) return ok('structural', { keywords: hit });
        return { correct: false, outcome: round(hit / need.length), verifier: 'structural', matchedMisconception: null, detail: { hit, need: need.length } };
      }
      return fail('structural', { text });
    }

    default:
      // Unknown kinds fail closed. An item the server cannot check must never
      // silently become a pass.
      return fail('structural', { reason: `unsupported kind: ${kind}` });
  }
}

function ok(verifier, detail) {
  return { correct: true, outcome: 1, verifier, matchedMisconception: null, detail };
}
function fail(verifier, detail) {
  return { correct: false, outcome: 0, verifier, matchedMisconception: null, detail };
}
function round(n) {
  return Math.round(n * 1000) / 1000;
}

// Strip everything the client must never see. Belt-and-braces alongside the
// column-level REVOKE in migration 0012 — defence in depth on the exact defect
// that made the old practice endpoint untrustworthy.
export function publicItem(item) {
  if (!item) return null;
  return {
    id: item.id,
    kind: item.kind,
    body: item.body,
    choices: Array.isArray(item.choices) ? item.choices : [],
    contextTag: item.context_tag || null,
  };
}
