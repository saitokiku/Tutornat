import { isBackchannel, words } from "./backchannel";

// Barge-in: a learner who starts really talking over the tutor gets the floor. "Really talking" means
// at least 300 ms since their speech began and at least one word that is not a backchannel. The
// tutor's own voice coming back through the microphone (echo) never counts.
//
// Echo repeats the tutor's words in the order they were played, so it is matched in order (a longest
// common subsequence), not as a bag of words: "two thirds is bigger" said over "Which is bigger, three
// fourths or two thirds?" is an answer, not an echo. Recognizers write numbers either way ("five",
// "5"), so number words are compared as digits.

export const BARGE_IN_MS = 300;

const NUMBER_WORDS: Record<string, string> = Object.fromEntries(
  [
    "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty",
    "cero uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce quince dieciseis diecisiete dieciocho diecinueve veinte",
  ].flatMap((list) => list.split(" ").map((w, i) => [w, String(i)])),
);
Object.assign(NUMBER_WORDS, { un: "1", una: "1", thirty: "30", forty: "40", fifty: "50", hundred: "100", treinta: "30", cuarenta: "40", cincuenta: "50", cien: "100" });

/** Words for echo matching: normalized like words(), number words as digits. */
export const echoWords = (text: string) => words(text).map((w) => NUMBER_WORDS[w] ?? w);

/** Share of the heard words that follow, in order, words the tutor played (0..1). */
export function echoScore(heard: string[], tutorWords: string[]): number {
  if (!heard.length || !tutorWords.length) return 0;
  let prev = new Array<number>(tutorWords.length + 1).fill(0);
  for (const h of heard) {
    const cur = [0];
    for (let j = 1; j <= tutorWords.length; j++) cur[j] = h === tutorWords[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    prev = cur;
  }
  return prev[tutorWords.length] / heard.length;
}

/**
 * Is what we heard most likely the tutor's own voice? Two or more words that follow the tutor's played
 * words is echo; one word the tutor just said is not decided yet (wait for a second word).
 * `tutor` is the text, or words already passed through echoWords().
 */
export function echoVerdict(heard: string, tutor: string | string[]): "echo" | "maybe" | "no" {
  const h = echoWords(heard);
  const score = echoScore(h, typeof tutor === "string" ? echoWords(tutor) : tutor);
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
  /** The words the tutor played around the time the learner spoke, to rule out echo. */
  tutorRecent?: string | string[];
  minMs?: number;
};

export function shouldBargeIn({ speaking, heard, onsetAt, now, tutorRecent, minMs = BARGE_IN_MS }: BargeInput): boolean {
  if (!speaking || onsetAt == null || now - onsetAt < minMs) return false;
  if (!words(heard).length || isBackchannel(heard)) return false;
  if (tutorRecent && tutorRecent.length && echoVerdict(heard, tutorRecent) !== "no") return false;
  return true;
}
