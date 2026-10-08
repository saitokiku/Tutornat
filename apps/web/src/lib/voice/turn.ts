import { FILLERS, isFillerOnly, isHolding, words } from "./backchannel";
import { ANSWER_END_MS, HOLDING_MS, TURN_WINDOWS } from "./bands";
import type { Band } from "./types";

// End of turn: when has the learner finished speaking? (live tutor spec §2.4) Signals, combined:
//  - silence since the last word ended (word end timestamps when the recognizer gives them, not when
//    its message arrived),
//  - how the words end: "um", "and", "it's", a comma or "..." means they're still going; a question
//    mark ends sooner. Recognizers put a full stop on every pause, so for K–5 a final "." is read as
//    no punctuation at all ("It's." is a child about to say the answer),
//  - "wait", "let me think", "a ver" hold the floor for 8 s and are never a turn on their own,
//  - an answer: with a practice item waiting, words that read as a complete answer ("Twelve.") end
//    the turn after a short silence (700 / 600 / 500 ms),
//  - the recognizer's UtteranceEnd ends a finished-sounding turn at once, for grades 6–9 only.
// The step function is pure; turnTracker() adds the timers.

export type TurnOptions = {
  /** Silence after words that sound finished ("It's 12?"). */
  silenceMs: number;
  /** Silence after words with no ending ("it's 12"). */
  openSilenceMs: number;
  /** Silence after a filler or a joining word ("it's, um", "and then"). */
  holdSilenceMs: number;
  /** The recognizer's UtteranceEnd may end a finished-sounding turn at once. */
  utteranceEnd?: boolean;
  /** Read a final "." as no punctuation (recognizers add one at every pause). */
  ignoreFullStop?: boolean;
  /** True when the words so far are a complete answer to the waiting problem. */
  answer?: (text: string) => boolean;
  /** Silence after a complete answer. */
  answerMs?: number;
  /** Silence after a holding phrase ("wait", "a ver"). */
  holdingMs?: number;
};

/** The windows for a band (spec §2.4). */
export function turnOptions(band: Band, answer?: (text: string) => boolean): TurnOptions {
  const w = TURN_WINDOWS[band];
  return { silenceMs: w.done, openSilenceMs: w.open, holdSilenceMs: w.hold, utteranceEnd: w.utteranceEnd, ignoreFullStop: w.ignoreFullStop, answer, answerMs: ANSWER_END_MS[band], holdingMs: HOLDING_MS };
}

export const TURN_DEFAULT: TurnOptions = turnOptions("69");
/** K–2: the longest windows. */
export const TURN_YOUNG: TurnOptions = turnOptions("k2");
/** Push-to-talk: the turn ends only when the learner says so (stop()). */
export const TURN_MANUAL: TurnOptions = { silenceMs: Infinity, openSilenceMs: Infinity, holdSilenceMs: Infinity };

export type TurnEvent =
  | { type: "speech-start"; at: number }
  /** `wordEnd`: when the last word ended (ms), if the recognizer says. */
  | { type: "partial"; text: string; at: number; wordEnd?: number }
  | { type: "final"; text: string; at: number; speechFinal?: boolean; wordEnd?: number }
  | { type: "utterance-end"; at: number }
  | { type: "speech-end"; at: number }
  | { type: "tick"; at: number };

export type TurnState = {
  finals: string[];
  /** Words recognized but not final yet. */
  interim: string;
  /** When the last word ended (ms). */
  lastAt: number | null;
  /** The recognizer thinks speech is still going on. */
  open: boolean;
  /** The recognizer reported a long gap after the last word. */
  utteranceEnd: boolean;
};

export const emptyTurn = (): TurnState => ({ finals: [], interim: "", lastAt: null, open: false, utteranceEnd: false });

export const turnText = (s: TurnState) => [...s.finals, s.interim].join(" ").replace(/\s+/g, " ").trim();

// Words that leave a thought unfinished when nothing follows them ("you add the top and", "es tres
// más", "I think it's"). Matched on the word as written, accents kept: "si" (if) and "que" (that)
// join, "sí" (yes) and "qué" (what) answer.
const JOINERS = new Set([
  "and", "but", "or", "because", "cause", "then", "like", "the", "a", "an", "to", "of", "with", "if", "is", "plus", "minus", "times", "over", "than",
  "it's", "its", "it’s", "think", "maybe", "um",
  "y", "o", "pero", "porque", "entonces", "como", "el", "la", "los", "las", "un", "una", "de", "que", "con", "si", "más", "menos", "por", "entre", "es", "son", "creo",
]);
// After these words a full stop still means "still going" (the recognizer's pause mark); a question
// or exclamation mark doesn't.
const STILL_GOING = new Set(["and", "but", "or", "because", "cause", "the", "an", "to", "of", "it's", "its", "it’s", "think", "y", "o", "pero", "porque", "el", "los", "las", "con", "de", "es", "son", "creo", "que"]);

/** The last word as written: lowercase, accents kept, apostrophes kept ("it's"). */
const lastWord = (t: string) => /[\p{L}\p{N}'’]+(?=[^\p{L}\p{N}'’]*$)/u.exec(t.toLowerCase().normalize("NFC"))?.[0].replace(/^['’]+|['’]+$/g, "") ?? "";

// "The answer is.", "I think it is.", "The total was.": the number comes next, whatever the full stop
// says. Only the bare yes/no forms ("It is.", "Yes it is.") are finished.
const ANSWERISH = new Set(["answer", "think", "guess", "mean", "total", "sum", "number", "result", "difference", "product"]);
const PRONOUN = new Set(["it", "that", "this", "they"]);
const YES_NO = new Set(["yes", "no", "yeah", "yep", "yup", "nope"]);
function unfinishedIs(t: string): boolean {
  const w = words(t);
  if (w.length < 2 || !/^(is|are|was|were)$/.test(w[w.length - 1])) return false;
  const before = w[w.length - 2];
  return ANSWERISH.has(before) || (PRONOUN.has(before) && w.length > 2 && !YES_NO.has(w[0]));
}

export type TurnShape = "empty" | "filler" | "holding" | "hold" | "done" | "open";

/** How the words so far end. `ignoreFullStop`: a final "." counts as no punctuation. */
export function shapeOf(text: string, { ignoreFullStop = false } = {}): TurnShape {
  let t = text.trim();
  const w = words(t);
  if (!w.length) return "empty";
  if (isFillerOnly(t)) return "filler";
  if (isHolding(t, true)) return "holding";
  if (FILLERS.has(w[w.length - 1]) || /(\.\.\.|…|[,;:—–-])["'”’)]*$/.test(t)) return "hold";
  if (ignoreFullStop) t = t.replace(/(?<!\.)\.(["'”’)]*)$/, "$1");
  const last = lastWord(t);
  if (/[?!]["'”’)]*$/.test(t)) return "done";
  if (/\.["'”’)]*$/.test(t)) return STILL_GOING.has(last) || unfinishedIs(t) ? "hold" : "done";
  return JOINERS.has(last) ? "hold" : "open";
}

/** How much silence ends a turn in this state. */
export function silenceNeeded(s: TurnState, o: TurnOptions): number {
  const text = turnText(s);
  const shape = shapeOf(text, o);
  if (shape === "empty") return Infinity;
  if (shape === "holding") return o.holdingMs ?? HOLDING_MS;
  if (shape === "filler" || shape === "hold") return o.holdSilenceMs;
  if (o.answer && isFinite(o.openSilenceMs) && o.answer(text)) return Math.min(o.answerMs ?? o.silenceMs, o.silenceMs);
  if (s.open) return o.holdSilenceMs; // speech still going by the recognizer's account; this is the safety net
  const need = shape === "done" ? o.silenceMs : o.openSilenceMs;
  return s.interim ? Math.max(need, o.openSilenceMs) : need;
}

/** Filler and holding phrases alone are never a turn. */
const notATurn = (shape: TurnShape) => shape === "filler" || shape === "holding";

export function stepTurn(s: TurnState, e: TurnEvent, o: TurnOptions): { state: TurnState; end?: string } {
  switch (e.type) {
    case "speech-start":
      s = { ...s, open: true, utteranceEnd: false, lastAt: s.lastAt == null ? e.at : Math.max(s.lastAt, e.at) };
      break;
    case "partial": {
      const text = e.text.trim();
      if (text) s = { ...s, interim: text, lastAt: e.wordEnd ?? e.at, open: true, utteranceEnd: false };
      break;
    }
    case "final": {
      const text = e.text.trim();
      s = { ...s, finals: text ? [...s.finals, text] : s.finals, interim: "", lastAt: text ? (e.wordEnd ?? e.at) : s.lastAt, open: e.speechFinal ? false : s.open };
      break;
    }
    case "speech-end":
      s = { ...s, open: false };
      break;
    case "utterance-end":
      s = { ...s, open: false, utteranceEnd: true };
      break;
    case "tick":
      break;
  }
  const text = turnText(s);
  const shape = shapeOf(text, o);
  if (shape === "empty" || s.lastAt == null) return { state: s };
  const silent = e.at - s.lastAt;
  if (notATurn(shape)) return silent >= silenceNeeded(s, o) ? { state: emptyTurn() } : { state: s };
  // The recognizer saw a long gap after words that sound finished (grades 6–9): no need to wait more.
  if (o.utteranceEnd && s.utteranceEnd && shape === "done" && isFinite(o.silenceMs)) return { state: emptyTurn(), end: text };
  return silent >= silenceNeeded(s, o) ? { state: emptyTurn(), end: text } : { state: s };
}

/** When to look again (ms), or null when nothing is pending. */
export function nextCheckAt(s: TurnState, o: TurnOptions): number | null {
  if (s.lastAt == null) return null;
  const need = silenceNeeded(s, o);
  return isFinite(need) ? s.lastAt + need : null;
}

/** turnText of a state as the final turn: fillers and holding phrases alone are not a turn. */
export const finishTurn = (s: TurnState) => (notATurn(shapeOf(turnText(s))) ? "" : turnText(s));

/** Runs stepTurn on live events and wakes itself up when the silence would be long enough. */
export function turnTracker({ options, onEnd, now = () => Date.now() }: { options: TurnOptions; onEnd: (text: string) => void; now?: () => number }) {
  let s = emptyTurn();
  let opts = options;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const clear = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  const feed = (e: TurnEvent) => {
    const r = stepTurn(s, e, opts);
    s = r.state;
    clear();
    if (r.end) {
      onEnd(r.end);
      return;
    }
    const at = nextCheckAt(s, opts);
    if (at != null) timer = setTimeout(() => feed({ type: "tick", at: now() }), Math.max(0, at - now()) + 1);
  };
  return {
    feed,
    text: () => turnText(s),
    /** When the last word ended, or null. */
    lastAt: () => s.lastAt,
    /** Changes the windows (the problem waiting for an answer changed). */
    setOptions(o: TurnOptions) {
      opts = o;
    },
    /** Ends the turn now and returns its text ("" if nothing real was said). */
    flush(): string {
      clear();
      const text = finishTurn(s);
      s = emptyTurn();
      return text;
    },
    reset() {
      clear();
      s = emptyTurn();
    },
  };
}

export type TurnTracker = ReturnType<typeof turnTracker>;
