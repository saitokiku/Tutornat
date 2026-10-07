// Backchannels: the small sounds a listener makes to say "I'm with you" ("mhm", "ok", "ajá", "sí").
// While the tutor is talking they are not an interruption and not a turn: the tutor keeps going.
// When the tutor is quiet and waiting, the same "ok" is an answer — callers decide by context.

/** Lowercase words without accents, punctuation, hyphens or long letter runs ("Mm-hmmm!" → ["mmhmm"]). */
export function words(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[-'’]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/(\p{L})\1{2,}/gu, "$1$1")
    .split(/\s+/)
    .filter(Boolean);
}

const BACKCHANNEL = new Set(
  [
    // English
    "mhm", "mhmm", "mmhm", "mmhmm", "mm", "hm", "hmm", "uhhuh", "uhuh", "ok", "okay", "okey", "k", "kay", "yeah", "yea", "yep", "yup", "yes",
    "right", "sure", "cool", "alright", "got it", "i see", "oh", "ohh", "ah", "ahh", "aha", "oh ok", "oh okay", "i know", "all right",
    // Spanish
    "aja", "si", "vale", "claro", "ya", "bueno", "entiendo", "de acuerdo", "sale", "orale", "andale", "ah ya", "ok si", "aha si",
  ].map((w) => words(w).join(" ")),
);

/** Sounds that hold the floor ("um", "este") — never a turn on their own. */
export const FILLERS = new Set(["um", "umm", "uh", "uhh", "er", "erm", "hmm", "hm", "mm", "eh", "ehh", "em", "emm", "este", "ehm"]);

/**
 * True when everything said is acknowledgement: "mhm", "ok ok", "oh okay", "sí, sí", "ajá".
 * Anything with a real word in it ("ok but why", "no", "wait") is not.
 */
export function isBackchannel(text: string): boolean {
  const w = words(text);
  if (!w.length || w.length > 4) return false;
  if (BACKCHANNEL.has(w.join(" "))) return true;
  // Each word (or each pair, for "got it" / "de acuerdo") is a backchannel.
  for (let i = 0; i < w.length; ) {
    if (i + 1 < w.length && BACKCHANNEL.has(`${w[i]} ${w[i + 1]}`)) i += 2;
    else if (BACKCHANNEL.has(w[i]) || FILLERS.has(w[i])) i += 1;
    else return false;
  }
  return true;
}

/** Only floor-holding sounds ("um", "uh, hmm"). */
export const isFillerOnly = (text: string) => {
  const w = words(text);
  return w.length > 0 && w.every((x) => FILLERS.has(x));
};
