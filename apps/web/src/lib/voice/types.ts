// The voice layer's two contracts. Screens hold a SpeechOut (read aloud) and a SpeechIn (listen) and
// never care whether the browser or a vendor is behind them; voice() in ./select picks.

export type Unsubscribe = () => void;

/**
 * What to read aloud: a whole text (split into sentences here), or sentences as they complete — use
 * sentenceFeed() or sentencesOf() from ./chunk to turn a streaming reply into sentences. Each item of
 * a stream is spoken as one sentence.
 */
export type SpeakSource = string | Iterable<string> | AsyncIterable<string>;

/** idle → waiting (asked to speak, no audio yet) → speaking ⇄ paused → idle. */
export type OutState = "idle" | "waiting" | "speaking" | "paused";

export type VoiceErrorCode =
  | "unsupported" // this browser can't do it
  | "denied" // the microphone permission was refused
  | "no-device" // no microphone
  | "busy" // another app holds the microphone
  | "network" // the connection to the speech service dropped
  | "consent" // a grown-up hasn't allowed voice for this learner
  | "unavailable" // the speech service refused or isn't configured
  | "speak"; // the reply couldn't be read aloud

export class VoiceError extends Error {
  constructor(
    public code: VoiceErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "VoiceError";
  }
}

export const asVoiceError = (e: unknown, fallback: VoiceErrorCode = "unavailable") => (e instanceof VoiceError ? e : new VoiceError(fallback, e instanceof Error ? e.message : undefined));

/** The three age bands every voice rule uses: K–2, grades 3–5, grades 6–9 (adults speak like 6–9). */
export type Band = "k2" | "35" | "69";

/** What a speak() call is: a tutor reply, lesson narration, or a Hear tap. Each cancels the others. */
export type SpeakKind = "reply" | "narration" | "hear";

export type SpeakOptions = {
  /** Aborting stops this run (bind it to the chat's stop, unmount, and item or scene change). */
  signal?: AbortSignal;
  kind?: SpeakKind;
  /** Sets the pause after each sentence (K–2 longest). The voice's own band when left out. */
  band?: Band;
};

/** One speak() call: resolves when it finishes or is cancelled. Events carry its id, so callers ignore other runs. */
export type SpeechRun = Promise<void> & { id: number };

/** A run that ended before it started (a disposed voice, an aborted signal). */
export function finishedRun(id: number): SpeechRun {
  return Object.assign(Promise.resolve(), { id });
}

export interface SpeechOut {
  readonly kind: "browser" | "elevenlabs";
  /**
   * How natural this voice is (live tutor spec §4): "A" may read by itself and hold a conversation
   * (vendor voices and natural browser voices); "B" reads only when the learner taps Hear.
   */
  readonly tier: "A" | "B";
  readonly state: OutState;
  /** Audio is waiting for a tap before it may play (show "Tap to hear"; the run starts on the tap). */
  readonly locked: boolean;
  /** Speaks, replacing anything already being spoken (that one fades out over 120 ms). */
  speak(source: SpeakSource, opts?: SpeakOptions): SpeechRun;
  pause(): void;
  resume(): void;
  cancel(opts?: { fadeMs?: number }): void;
  /** Call from a tap or key press: lets later audio start on browsers that need a gesture, and readies the voice. Never throws. */
  warm(): void;
  /** Stops speaking and lets go of what the voice holds (an audio context). Call when the screen goes away. */
  dispose(): void;
  /**
   * The word being spoken, as an index into the words of everything passed to this speak() call
   * (`text.split(/\s+/).filter(Boolean)` of the text, or of the stream's sentences joined in order).
   */
  onBoundary(fn: (wordIndex: number, run: number) => void): Unsubscribe;
  /**
   * As soon as a word's audio is scheduled: its index and when it becomes audible (performance.now()
   * ms, the device's output latency included). Vendor and clip voices only; browser voices never fire it.
   */
  onWordScheduled(fn: (wordIndex: number, audibleAt: number, run: number) => void): Unsubscribe;
  /** The last word fully heard so far in the current or last run; -1 before the first. */
  heardUpTo(): number;
  /** Lowers the volume (barge-in: 0.3 over 80 ms) without stopping. Browser voices can't, and ignore it. */
  duck(gain: number, ms: number): void;
  unduck(ms: number): void;
  onStart(fn: (run: number) => void): Unsubscribe;
  onEnd(fn: (e: { cancelled: boolean }, run: number) => void): Unsubscribe;
  /** Reading aloud failed (always code "speak"; the message says why). The words stay on screen. */
  onError(fn: (e: VoiceError, run: number) => void): Unsubscribe;
  /** `locked` changed: audio waits for a tap (show "Tap to hear"), or the tap came. */
  onLocked(fn: (locked: boolean) => void): Unsubscribe;
  /** When a run's first sentence went out, its first audio came back and was first heard (for the latency log). */
  onTiming(fn: (t: OutTiming) => void): Unsubscribe;
}

/**
 * A run's timings, performance.now() ms. `firstChunkAt − firstSentenceAt` is the vendor's own time to
 * first audio: it is reported on its own and is never turn latency, which runs from the learner's last
 * word to `firstAudibleAt` (the sound actually reaching the speaker).
 */
export type OutTiming = { run: number; vendor: SpeechOut["kind"]; firstSentenceAt: number | null; firstChunkAt: number | null; firstAudibleAt: number | null; underruns: number; retried: boolean };

/** A recognized word, with when it was said (performance.now() ms) and how sure the recognizer is (0..1). */
export type HeardWord = { word: string; start: number; end: number; confidence: number | null };

/** What comes with a finished turn. */
export type TurnMeta = {
  /** Mean word confidence (0..1), or null when the recognizer gives none. */
  confidence: number | null;
  words: HeardWord[];
  /** When the last word ended (performance.now() ms), or null. Latency is timed from here. */
  lastWordEnd: number | null;
};

export type ListenOptions = {
  /**
   * "manual" (default): push-to-talk; the turn ends at stop(). "auto": turns end by themselves
   * (silence, how the words end, the recognizer's end-of-turn) — tap mode ends there, conversation
   * mode keeps listening for the next turn.
   */
  turns?: "auto" | "manual";
  /** Words the recognizer should expect (lesson vocabulary, at most 20). Never names: any word matching a learner's name is dropped. Vendor only. */
  keyterms?: string[];
  /** The learner's band: how long a pause may be before the turn ends. The input's own band when left out. */
  band?: Band;
  /**
   * A practice item is waiting for an answer: true when the words so far are a complete answer
   * (practice/spoken.ts reads it as "sure"). The turn then ends after a short silence (spec §2.4).
   */
  answer?: (text: string) => boolean;
};

export interface SpeechIn {
  readonly kind: "browser" | "deepgram";
  readonly listening: boolean;
  /** Full duplex: the microphone may stay open while the tutor speaks (vendor recognizers; the browser's is half duplex). */
  readonly duplex: boolean;
  /** Opens the microphone. Rejects with a VoiceError (denied, no-device, …) when it can't. */
  start(opts?: ListenOptions): Promise<void>;
  /** Stops listening; whatever was said so far becomes the turn (onEndOfTurn). */
  stop(): void;
  /** Stops listening and throws away what was heard. */
  abort(): void;
  /** Input level 0..1 for a meter (0 when not listening); null when this recognizer can't measure it — hide the meter then. */
  level(): number | null;
  /** Everything heard in the current turn so far, as it is recognized. */
  onPartial(fn: (text: string) => void): Unsubscribe;
  /** One finished piece of the current turn. */
  onFinal(fn: (text: string) => void): Unsubscribe;
  /** Words with their times, as they are recognized (for echo matching by time). */
  onWords(fn: (words: HeardWord[]) => void): Unsubscribe;
  /** The learner finished speaking; the whole turn. */
  onEndOfTurn(fn: (text: string, meta: TurnMeta) => void): Unsubscribe;
  /** The recognizer thinks the turn is probably over (Flux EagerEndOfTurn): a reply may start early. */
  onEagerEnd(fn: (text: string, meta: TurnMeta) => void): Unsubscribe;
  /** After an eager end, the learner went on talking (Flux TurnResumed): drop the early reply. */
  onTurnResumed(fn: () => void): Unsubscribe;
  /** Voice activity began (before any words are recognized, when the recognizer can tell). */
  onSpeechStart(fn: () => void): Unsubscribe;
  /** The upload is falling behind (more than 32 KB waiting): show "The connection is slow." */
  onSlow(fn: (slow: boolean) => void): Unsubscribe;
  /** A voice surface opened: fetch what listening needs ahead (a vendor token, refreshed) until the returned stop is called. */
  prepare?(): () => void;
  /** Which vendor model the last stream used ("flux" | "nova"), for the latency log. */
  readonly model?: "flux" | "nova" | null;
  onError(fn: (e: VoiceError) => void): Unsubscribe;
}

/** Mean of the words' confidences, or null when none has one. */
export function meanConfidence(words: HeardWord[]): number | null {
  const c = words.map((w) => w.confidence).filter((x): x is number => typeof x === "number");
  return c.length ? c.reduce((a, b) => a + b, 0) / c.length : null;
}

/** Turn metadata from the words heard. */
export const metaOf = (words: HeardWord[]): TurnMeta => ({ confidence: meanConfidence(words), words, lastWordEnd: words.length ? words[words.length - 1].end : null });

/** A tiny listener set. A listener that throws doesn't break the adapter; the error is re-thrown asynchronously. */
export function emitter<A extends unknown[]>() {
  const fns = new Set<(...a: A) => void>();
  return {
    on(fn: (...a: A) => void): Unsubscribe {
      fns.add(fn);
      return () => void fns.delete(fn);
    },
    emit(...a: A) {
      for (const fn of [...fns]) {
        try {
          fn(...a);
        } catch (e) {
          queueMicrotask(() => {
            throw e;
          });
        }
      }
    },
  };
}

/** Number of words in a text, the way word indexes count them. */
export const countWords = (s: string) => s.split(/\s+/).filter(Boolean).length;
