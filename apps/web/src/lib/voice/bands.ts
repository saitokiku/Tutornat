import type { Grade } from "@/lib/types";
import type { Band } from "./types";

// Every number the voice layer tunes by age, in one place (live tutor spec §2.2–2.4). Three bands
// everywhere: K–2, grades 3–5, grades 6–9 (adults are treated as 6–9). Slower speech sounds babyish to
// a ten-year-old, so pace comes from pauses between sentences, never from stretched words.

export const BANDS: readonly Band[] = ["k2", "35", "69"];

export function bandOf(grade: Grade | string): Band {
  if (grade === "K" || grade === "1" || grade === "2") return "k2";
  if (grade === "3" || grade === "4" || grade === "5") return "35";
  return "69";
}

/** Silence the player adds after a sentence, and before a question (K–2 only). ms. */
export const SENTENCE_PAUSE: Record<Band, { after: number; beforeQuestion: number }> = {
  k2: { after: 400, beforeQuestion: 300 },
  "35": { after: 250, beforeQuestion: 0 },
  "69": { after: 120, beforeQuestion: 0 },
};

/** Vendor voice speed: 1.0 everywhere except K–2 on Flash. Never below 0.9. */
export const voiceSpeed = (band: Band, model: string) => (band === "k2" && /flash/.test(model) ? 0.94 : 1.0);

/** Deepgram Flux end-of-turn settings (spec §2.2). eager null = off. */
export const FLUX: Record<Band, { eotThreshold: number; eotTimeoutMs: number; eagerThreshold: number | null }> = {
  k2: { eotThreshold: 0.8, eotTimeoutMs: 4000, eagerThreshold: null },
  "35": { eotThreshold: 0.75, eotTimeoutMs: 3000, eagerThreshold: 0.55 },
  "69": { eotThreshold: 0.7, eotTimeoutMs: 2000, eagerThreshold: 0.55 },
};

/** Deepgram Nova-3 (the fallback) endpointing. */
export const NOVA: Record<Band, { endpointing: number; utteranceEndMs: number }> = {
  k2: { endpointing: 500, utteranceEndMs: 1500 },
  "35": { endpointing: 500, utteranceEndMs: 1500 },
  "69": { endpointing: 300, utteranceEndMs: 1000 },
};

/**
 * Our own end-of-turn windows (spec §2.4), silence measured from the last word's end: done (the
 * words sound finished), open (no ending), hold (a filler or joining word). `utteranceEnd`: the
 * recognizer's UtteranceEnd may end a finished-sounding turn at once (6–9 only). `ignoreFullStop`:
 * recognizers put a full stop on every pause, so K–5 reads a final "." as no punctuation.
 */
export const TURN_WINDOWS: Record<Band, { done: number; open: number; hold: number; utteranceEnd: boolean; ignoreFullStop: boolean }> = {
  k2: { done: 1600, open: 2200, hold: 5000, utteranceEnd: false, ignoreFullStop: true },
  "35": { done: 1100, open: 1800, hold: 4000, utteranceEnd: false, ignoreFullStop: true },
  "69": { done: 700, open: 1400, hold: 3000, utteranceEnd: true, ignoreFullStop: false },
};

/** A complete spoken answer to the waiting problem ends the turn after this much silence. */
export const ANSWER_END_MS: Record<Band, number> = { k2: 700, "35": 600, "69": 500 };

/** "Wait", "let me think", "a ver": the floor is held this long. */
export const HOLDING_MS = 8000;

/** Conversation mode: the reopened microphone closes after this long with no learner speech. */
export const REOPEN_IDLE_MS: Record<Band, number> = { k2: 15_000, "35": 12_000, "69": 12_000 };
