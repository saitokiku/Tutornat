import { isBackchannel, words } from "./backchannel";

// Barge-in: a learner who starts really talking over the tutor gets the floor. "Really talking" means
// at least 300 ms since their speech began and at least one word that is not a backchannel. The
// tutor's own voice coming back through the microphone (echo) never counts.

export const BARGE_IN_MS = 300;

/** Share of the heard words that the tutor just said (0..1). */
export function echoScore(heard: string[], tutorWords: string[]): number {
  if (!heard.length || !tutorWords.length) return 0;
  const said = new Set(tutorWords);
  return heard.filter((w) => said.has(w)).length / heard.length;
}

/**
 * Is what we heard most likely the tutor's own voice? Two or more words mostly from the tutor's recent
 * speech is echo; one word the tutor just said is not decided yet (wait for a second word).
 */
export function echoVerdict(heard: string, tutorRecent: string): "echo" | "maybe" | "no" {
  const h = words(heard);
  const score = echoScore(h, words(tutorRecent).slice(-40));
  if (h.length >= 2) return score >= 0.8 ? "echo" : "no";
  return score === 1 ? "maybe" : "no";
}

export type BargeInput = {
  /** The tutor's voice is playing (or paused mid-reply). */
  speaking: boolean;
  /** Everything heard in the learner's current turn. */
  heard: string;
  /** When the learner's speech began (ms), null if not yet. */
  onsetAt: number | null;
  now: number;
  /** What the tutor said most recently, to rule out echo. */
  tutorRecent?: string;
  minMs?: number;
};

export function shouldBargeIn({ speaking, heard, onsetAt, now, tutorRecent, minMs = BARGE_IN_MS }: BargeInput): boolean {
  if (!speaking || onsetAt == null || now - onsetAt < minMs) return false;
  if (!words(heard).length || isBackchannel(heard)) return false;
  if (tutorRecent && echoVerdict(heard, tutorRecent) !== "no") return false;
  return true;
}
