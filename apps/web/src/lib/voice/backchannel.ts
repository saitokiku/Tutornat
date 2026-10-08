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
    "uh huh", "a ha", "ah ha", "mm hmm", "mhm hm", "mm hm", "uh hum",
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

// Holding phrases (spec §2.4): the learner asks for time. They hold the floor for 8 s and are never
// sent on their own; "um" or "este" alone already count as fillers.
const HOLDING = ["wait", "wait a second", "wait a minute", "hold on", "let me think", "let me see", "one second", "espera", "esperate", "a ver", "dejame pensar", "dejame ver", "un momento", "un segundo"].map(
  (p) => words(p),
);

/** The words are, or end with, a holding phrase ("hold on", "let me think", "a ver"). `atEnd` false: the whole text must be one (with fillers). */
export function isHolding(text: string, atEnd = false): boolean {
  const w = words(text);
  while (w.length && FILLERS.has(w[0])) w.shift();
  while (w.length && FILLERS.has(w[w.length - 1])) w.pop();
  if (!w.length) return false;
  return HOLDING.some((p) => {
    if (w.length < p.length) return false;
    const tail = w.slice(w.length - p.length);
    if (!tail.every((x, i) => x === p[i])) return false;
    return atEnd || w.length === p.length;
  });
}

/** Only floor-holding sounds ("um", "uh, hmm"). */
export const isFillerOnly = (text: string) => {
  const w = words(text);
  return w.length > 0 && w.every((x) => FILLERS.has(x));
};
