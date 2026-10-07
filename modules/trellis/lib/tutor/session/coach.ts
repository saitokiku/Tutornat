/**
 * Coach-mode heuristics (spec §5.4, tutor-14): the attempt counter is kept in
 * session state so the eval can assert it, not only the prompt. Pure.
 */
import type { CoachState } from './state';

const ANSWER_REQUEST = [
  /\b(just|please|can you|could you|pls)?\s*(show|tell|give)\s+me\s+(the\s+)?(answer|solution|how|it)\b/i,
  /\bwhat('?s|\s+is)\s+the\s+answer\b/i,
  /\bjust\s+(do|solve|answer)\s+it\b/i,
  /\b(i\s+)?give\s+up\b/i,
  /\bjust\s+show\s+me\b/i,
  /\bsolve\s+(it|this|that)\s+for\s+me\b/i,
];

const ATTEMPT_SIGNALS = [
  /\d/,
  /\b(i\s+(think|got|tried|did|multiplied|added|divided|subtracted|put|wrote|guess|would|started))\b/i,
  /\b(numerator|denominator|half|third|quarter|fourth|fifth|sixth|eighth|tenth|equals?|is\s+it|maybe)\b/i,
  /[=+\-×÷*/]/,
];

export function looksLikeAnswerRequest(text: string): boolean {
  return ANSWER_REQUEST.some((pattern) => pattern.test(text));
}

export function looksLikeAttempt(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (/^(i\s+)?(don'?t|dont|do\s+not)\s+(know|get\s+it|understand)/i.test(trimmed)) return false;
  return ATTEMPT_SIGNALS.some((pattern) => pattern.test(trimmed));
}

export function looksLikeConfusion(text: string): boolean {
  return /\b(i\s+)?(don'?t|dont|do\s+not)\s+(get|understand)\b|\bconfus(ed|ing)\b|\bwhat\s+do\s+you\s+mean\b|\bhuh\b/i.test(
    text,
  );
}

/** One learner message updates the counters. */
export function applyLearnerMessage(coach: CoachState, text: string): CoachState {
  const askedForAnswer = looksLikeAnswerRequest(text);
  const attempts = coach.attempts + (looksLikeAttempt(text) && !askedForAnswer ? 1 : 0);
  return {
    attempts,
    askedForAnswer,
    showMeUnlocked: coach.showMeUnlocked || (askedForAnswer && attempts >= 1),
    answerShown: coach.answerShown,
  };
}

export function resetCoach(): CoachState {
  return { attempts: 0, showMeUnlocked: false, answerShown: false, askedForAnswer: false };
}
