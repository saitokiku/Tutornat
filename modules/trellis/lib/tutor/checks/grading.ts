/**
 * Local grading (spec R4, tutor-09): choice items by option identity,
 * numeric items with tolerance and fraction/percent parsing, short answers by
 * normalized match against the accept list, then by required keywords, and
 * symbolic answers by expression equivalence (reference §5, ported from
 * Kaizen-AI's verifier). A key may name the values a known mistake produces,
 * so a typed miss is tagged as precisely as a wrong multiple-choice pick.
 * Anything else is handed to the grade stage. No partial credit by default;
 * never a silent 50 %.
 */
import type { AnswerSpec } from '@/lib/tutor/contracts';
import type { AnswerKey } from '@/lib/tutor/session/state';

import { expressionsEquivalent, isExpression } from './symbolic';

export type LocalGrade =
  | {
      graded: true;
      correct: boolean;
      score: number;
      misconception: string | null;
      rationale: string;
    }
  | { graded: false; reason: 'needs_model' | 'invalid_answer' };

const UNICODE_FRACTIONS: Record<string, number> = {
  '½': 0.5,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '¼': 0.25,
  '¾': 0.75,
  '⅕': 0.2,
  '⅖': 0.4,
  '⅗': 0.6,
  '⅘': 0.8,
  '⅙': 1 / 6,
  '⅚': 5 / 6,
  '⅛': 0.125,
  '⅜': 0.375,
  '⅝': 0.625,
  '⅞': 0.875,
};

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[$]/g, '')
    .replace(/⁄/g, '/')
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '$1/$2')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[.!?]+$/g, '')
    .trim();
}

/** Parses "3/4", "1 1/2", "0.75", ".75", "75%", "-2", "1,000", "½"; null when it is not a number. */
export function parseNumeric(input: string | number): number | null {
  if (typeof input === 'number') return Number.isFinite(input) ? input : null;
  let text = normalizeText(input).replace(/,/g, '');
  if (!text) return null;
  const unicode = UNICODE_FRACTIONS[text];
  if (unicode !== undefined) return unicode;
  let percent = false;
  if (text.endsWith('%')) {
    percent = true;
    text = text.slice(0, -1).trim();
  }
  const mixed = text.match(/^(-?)(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) {
    const sign = mixed[1] === '-' ? -1 : 1;
    const whole = Number(mixed[2]);
    const den = Number(mixed[4]);
    if (den === 0) return null;
    return sign * (whole + Number(mixed[3]) / den) * (percent ? 0.01 : 1);
  }
  const fraction = text.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/);
  if (fraction) {
    const den = Number(fraction[2]);
    if (den === 0) return null;
    return (Number(fraction[1]) / den) * (percent ? 0.01 : 1);
  }
  if (/^-?(\d+\.?\d*|\.\d+)$/.test(text)) return Number(text) * (percent ? 0.01 : 1);
  return null;
}

function optionByAnswer(
  options: NonNullable<AnswerKey['options']>,
  answer: string,
): NonNullable<AnswerKey['options']>[number] | undefined {
  const wanted = normalizeText(answer);
  return (
    options.find((option) => option.id === answer) ??
    options.find((option) => option.id.toLowerCase() === wanted) ??
    options.find((option) => normalizeText(option.text) === wanted)
  );
}

/** Words that never decide right from wrong. */
const STOP_WORDS = new Set(['a', 'an', 'the', 'is', 'are', 'was', 'were', 'of', 'to', 'and']);

/** "denominators" and "denominator" are the same content word; nothing cleverer than that. */
function stem(word: string): string {
  return word.length > 3 ? word.replace(/(es|s)$/, '') : word;
}

function contentWords(text: string): Set<string> {
  return new Set(
    normalizeText(text)
      .replace(/[^a-z0-9/ ]+/g, ' ')
      .split(/\s+/)
      .filter((word) => word && !STOP_WORDS.has(word))
      .map(stem),
  );
}

/**
 * The misconception behind a wrong typed answer, when the key names it: a
 * numeric match within the tolerance, or the same text once normalized.
 */
function namedWrong(spec: AnswerSpec, given: string, tolerance: number): string | null {
  const givenNumber = parseNumeric(given);
  const givenText = normalizeText(given);
  for (const wrong of spec.wrong ?? []) {
    const wrongNumber = parseNumeric(wrong.value);
    if (
      wrongNumber !== null &&
      givenNumber !== null &&
      Math.abs(givenNumber - wrongNumber) <= tolerance + 1e-9
    ) {
      return wrong.misconception;
    }
    if (normalizeText(String(wrong.value)) === givenText) return wrong.misconception;
  }
  return null;
}

function toList(answer: string | string[] | number): string[] {
  if (Array.isArray(answer)) return answer.map(String);
  if (typeof answer === 'number') return [String(answer)];
  return answer
    .split(/[,;]\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function gradeLocally(key: AnswerKey, answer: string | string[] | number): LocalGrade {
  switch (key.type) {
    case 'single': {
      if (!key.options) return { graded: false, reason: 'invalid_answer' };
      const chosen = Array.isArray(answer) ? answer[0] : answer;
      if (chosen === undefined) return { graded: false, reason: 'invalid_answer' };
      const option = optionByAnswer(key.options, String(chosen));
      if (!option) return { graded: false, reason: 'invalid_answer' };
      return {
        graded: true,
        correct: option.correct,
        score: option.correct ? 1 : 0,
        misconception: option.correct ? null : option.misconception,
        rationale: option.correct ? 'That is the right choice.' : 'That option is not correct.',
      };
    }
    case 'multiple': {
      if (!key.options) return { graded: false, reason: 'invalid_answer' };
      const chosen = toList(answer).map((value) => optionByAnswer(key.options!, value));
      if (chosen.length === 0 || chosen.some((option) => option === undefined))
        return { graded: false, reason: 'invalid_answer' };
      const chosenIds = new Set(chosen.map((option) => option!.id));
      const correctIds = new Set(
        key.options.filter((option) => option.correct).map((option) => option.id),
      );
      const exact =
        chosenIds.size === correctIds.size && [...chosenIds].every((id) => correctIds.has(id));
      const firstWrong = chosen.find((option) => option && !option.correct);
      return {
        graded: true,
        correct: exact,
        score: exact ? 1 : 0,
        misconception: exact ? null : (firstWrong?.misconception ?? null),
        rationale: exact
          ? 'Every correct option, and only those.'
          : 'The set of choices is not right.',
      };
    }
    case 'numeric': {
      const expected = key.answer ? parseNumeric(key.answer.value) : null;
      if (expected === null) return { graded: false, reason: 'invalid_answer' };
      const given = parseNumeric(Array.isArray(answer) ? (answer[0] ?? '') : answer);
      if (given === null) return { graded: false, reason: 'invalid_answer' };
      const tolerance = key.answer?.tolerance ?? 0;
      const correct = Math.abs(given - expected) <= tolerance + 1e-9;
      const givenText = Array.isArray(answer) ? String(answer[0] ?? '') : String(answer);
      return {
        graded: true,
        correct,
        score: correct ? 1 : 0,
        misconception: correct ? null : namedWrong(key.answer!, givenText, tolerance),
        rationale: correct ? 'That matches.' : 'That number is not the expected value.',
      };
    }
    case 'short': {
      if (!key.answer) return { graded: false, reason: 'invalid_answer' };
      const given = Array.isArray(answer) ? answer.join(' ') : String(answer);
      const normalized = normalizeText(given);
      if (!normalized) return { graded: false, reason: 'invalid_answer' };
      const accepted = [String(key.answer.value), ...(key.answer.accept ?? [])].map(normalizeText);
      if (accepted.includes(normalized)) {
        return {
          graded: true,
          correct: true,
          score: 1,
          misconception: null,
          rationale: 'That matches.',
        };
      }
      const tolerance = key.answer.tolerance ?? 0.005;
      const wrong = namedWrong(key.answer, given, tolerance);
      if (wrong) {
        return {
          graded: true,
          correct: false,
          score: 0,
          misconception: wrong,
          rationale: 'That is not the expected answer.',
        };
      }
      const keywords = (key.answer.keywords ?? []).map(normalizeText).filter(Boolean);
      if (keywords.length > 0) {
        // Every required content word, each of its parts present. Strict on
        // purpose: a fuzzy match here would quietly become self-marking.
        const words = contentWords(given);
        const correct = keywords.every((keyword) =>
          keyword.split(' ').every((part) => words.has(stem(part))),
        );
        return {
          graded: true,
          correct,
          score: correct ? 1 : 0,
          misconception: null,
          rationale: correct
            ? 'That names what matters.'
            : 'That does not mention what the answer needs to.',
        };
      }
      if (key.answer.exact) {
        // The form is the point ("write 6/8 in simplest form"): a numerically
        // equal answer in another form is wrong, not a match.
        return {
          graded: true,
          correct: false,
          score: 0,
          misconception: null,
          rationale: 'That is not written in the expected form.',
        };
      }
      const expectedNumber = parseNumeric(String(key.answer.value));
      const givenNumber = parseNumeric(given);
      if (expectedNumber !== null && givenNumber !== null) {
        const correct = Math.abs(expectedNumber - givenNumber) <= tolerance;
        return {
          graded: true,
          correct,
          score: correct ? 1 : 0,
          misconception: null,
          rationale: correct ? 'That names the same number.' : 'That is a different number.',
        };
      }
      return { graded: false, reason: 'needs_model' };
    }
    case 'symbolic': {
      if (!key.answer) return { graded: false, reason: 'invalid_answer' };
      const given = (Array.isArray(answer) ? answer.join(' ') : String(answer)).trim();
      if (!given || !isExpression(given)) return { graded: false, reason: 'invalid_answer' };
      const forms = [String(key.answer.value), ...(key.answer.accept ?? [])];
      if (forms.some((form) => expressionsEquivalent(given, form))) {
        return {
          graded: true,
          correct: true,
          score: 1,
          misconception: null,
          rationale: 'That is the same expression.',
        };
      }
      const wrong = (key.answer.wrong ?? []).find((candidate) =>
        expressionsEquivalent(given, String(candidate.value)),
      );
      return {
        graded: true,
        correct: false,
        score: 0,
        misconception: wrong?.misconception ?? null,
        rationale: 'That expression is not equivalent to the answer.',
      };
    }
  }
}
