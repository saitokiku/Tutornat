import { FILLERS, isFillerOnly, words } from "./backchannel";

// End of turn: when has the learner finished speaking? Three signals, combined:
//  - silence since the last word (timed here),
//  - how the words end: a full stop or question mark ends sooner; "um", "and", "because", a comma or
//    "..." means they're still going, so we wait much longer,
//  - the recognizer's own pause events (Deepgram's speech_final and UtteranceEnd).
// Children plan what to say more slowly and hold the floor with "um", so young learners get longer
// windows. The step function is pure; turnTracker() adds the timers.

export type TurnOptions = {
  /** Silence after words that sound finished ("It's 12."). */
  silenceMs: number;
  /** Silence after words with no ending ("it's 12"). */
  openSilenceMs: number;
  /** Silence after a filler or a joining word ("it's, um", "and then"); also the longest any turn waits. */
  holdSilenceMs: number;
};

export const TURN_DEFAULT: TurnOptions = { silenceMs: 700, openSilenceMs: 1400, holdSilenceMs: 3000 };
/** K–5: more time to think out loud before the tutor answers. */
export const TURN_YOUNG: TurnOptions = { silenceMs: 1100, openSilenceMs: 2000, holdSilenceMs: 4500 };
/** Push-to-talk: the turn ends only when the learner says so (stop()). */
export const TURN_MANUAL: TurnOptions = { silenceMs: Infinity, openSilenceMs: Infinity, holdSilenceMs: Infinity };

export type TurnEvent =
  | { type: "speech-start"; at: number }
  | { type: "partial"; text: string; at: number }
  | { type: "final"; text: string; at: number; speechFinal?: boolean }
  | { type: "utterance-end"; at: number }
  | { type: "speech-end"; at: number }
  | { type: "tick"; at: number };

export type TurnState = {
  finals: string[];
  /** Words recognized but not final yet. */
  interim: string;
  /** Last time we had evidence of speech (ms). */
  lastAt: number | null;
  /** The recognizer thinks speech is still going on. */
  open: boolean;
  /** The recognizer reported a long gap after the last word. */
  utteranceEnd: boolean;
};

export const emptyTurn = (): TurnState => ({ finals: [], interim: "", lastAt: null, open: false, utteranceEnd: false });

export const turnText = (s: TurnState) => [...s.finals, s.interim].join(" ").replace(/\s+/g, " ").trim();

// Words that leave a thought unfinished when nothing follows them ("you add the top and", "es tres
// más"). Matched on the word as written, accents kept: "si" (if) and "que" (that) join, "sí" (yes)
// and "qué" (what) answer. Ending punctuation is read first ("I think so.", "It is.", "Quiero más.").
const JOINERS = new Set(
  [
    "and", "but", "or", "because", "cause", "then", "like", "the", "a", "an", "to", "of", "with", "if", "is", "plus", "minus", "times", "over", "than",
    "y", "o", "pero", "porque", "entonces", "como", "el", "la", "los", "las", "un", "una", "de", "que", "con", "si", "más", "menos", "por", "entre", "es",
  ],
);
// Recognizers put a full stop after a pause even mid-thought ("You add the top and."). After these
// words a full stop still means "still going"; a question or exclamation mark doesn't.
const STILL_GOING = new Set(["and", "but", "or", "because", "cause", "the", "an", "y", "o", "pero", "porque", "el", "los", "las", "con"]);

/** The last word as written: lowercase, accents kept. */
const lastWord = (t: string) => /[\p{L}\p{N}]+(?=[^\p{L}\p{N}]*$)/u.exec(t.toLowerCase().normalize("NFC"))?.[0] ?? "";

export type TurnShape = "empty" | "filler" | "hold" | "done" | "open";

/** How the words so far end. */
export function shapeOf(text: string): TurnShape {
  const t = text.trim();
  const w = words(t);
  if (!w.length) return "empty";
  if (isFillerOnly(t)) return "filler";
  if (FILLERS.has(w[w.length - 1]) || /(\.\.\.|…|[,;:—–-])["'”’)]*$/.test(t)) return "hold";
  const last = lastWord(t);
  if (/[?!]["'”’)]*$/.test(t)) return "done";
  if (/\.["'”’)]*$/.test(t)) return STILL_GOING.has(last) ? "hold" : "done";
  return JOINERS.has(last) ? "hold" : "open";
}

/** How much silence ends a turn in this state. */
export function silenceNeeded(s: TurnState, o: TurnOptions): number {
  const shape = shapeOf(turnText(s));
  if (shape === "empty") return Infinity;
  if (shape === "filler" || shape === "hold") return o.holdSilenceMs;
  if (s.open) return o.holdSilenceMs; // speech still going by the recognizer's account; this is the safety net
  const need = shape === "done" ? o.silenceMs : o.openSilenceMs;
  return s.interim ? Math.max(need, o.openSilenceMs) : need;
}

export function stepTurn(s: TurnState, e: TurnEvent, o: TurnOptions): { state: TurnState; end?: string } {
  switch (e.type) {
    case "speech-start":
      s = { ...s, open: true, utteranceEnd: false, lastAt: e.at };
      break;
    case "partial": {
      const text = e.text.trim();
      if (text) s = { ...s, interim: text, lastAt: e.at, open: true, utteranceEnd: false };
      break;
    }
    case "final": {
      const text = e.text.trim();
      s = { ...s, finals: text ? [...s.finals, text] : s.finals, interim: "", lastAt: text ? e.at : s.lastAt, open: e.speechFinal ? false : s.open };
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
  const shape = shapeOf(text);
  if (shape === "empty" || s.lastAt == null) return { state: s };
  const silent = e.at - s.lastAt;
  if (shape === "filler") return silent >= o.holdSilenceMs ? { state: emptyTurn() } : { state: s };
  // The recognizer saw a long gap after words that sound finished: no need to wait more.
  if (s.utteranceEnd && shape === "done" && isFinite(o.silenceMs)) return { state: emptyTurn(), end: text };
  return silent >= silenceNeeded(s, o) ? { state: emptyTurn(), end: text } : { state: s };
}

/** When to look again (ms), or null when nothing is pending. */
export function nextCheckAt(s: TurnState, o: TurnOptions): number | null {
  if (s.lastAt == null) return null;
  const shape = shapeOf(turnText(s));
  if (shape === "empty") return null;
  const need = shape === "filler" ? o.holdSilenceMs : silenceNeeded(s, o);
  return isFinite(need) ? s.lastAt + need : null;
}

/** turnText of a state as the final turn: filler-only talk is not a turn. */
export const finishTurn = (s: TurnState) => (shapeOf(turnText(s)) === "filler" ? "" : turnText(s));

/** Runs stepTurn on live events and wakes itself up when the silence would be long enough. */
export function turnTracker({ options, onEnd, now = () => Date.now() }: { options: TurnOptions; onEnd: (text: string) => void; now?: () => number }) {
  let s = emptyTurn();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const clear = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  const feed = (e: TurnEvent) => {
    const r = stepTurn(s, e, options);
    s = r.state;
    clear();
    if (r.end) {
      onEnd(r.end);
      return;
    }
    const at = nextCheckAt(s, options);
    if (at != null) timer = setTimeout(() => feed({ type: "tick", at: now() }), Math.max(0, at - now()) + 1);
  };
  return {
    feed,
    text: () => turnText(s),
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
