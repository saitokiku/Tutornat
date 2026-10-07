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

export interface SpeechOut {
  readonly kind: "browser" | "elevenlabs";
  readonly state: OutState;
  /** Speaks, replacing anything already being spoken. Resolves when it finishes or is cancelled. */
  speak(source: SpeakSource): Promise<void>;
  pause(): void;
  resume(): void;
  cancel(): void;
  /** Call from a tap or key press: lets later audio start on browsers that need a gesture, and readies the voice. Never throws. */
  warm(): void;
  /** Stops speaking and lets go of what the voice holds (an audio context). Call when the screen goes away. */
  dispose(): void;
  /**
   * The word being spoken, as an index into the words of everything passed to this speak() call
   * (`text.split(/\s+/).filter(Boolean)` of the text, or of the stream's sentences joined in order).
   */
  onBoundary(fn: (wordIndex: number) => void): Unsubscribe;
  onStart(fn: () => void): Unsubscribe;
  onEnd(fn: (e: { cancelled: boolean }) => void): Unsubscribe;
  /** Reading aloud failed and nothing took over (always code "speak"; the message says why). A vendor failure the browser voice covers is not an error. */
  onError(fn: (e: VoiceError) => void): Unsubscribe;
}

export type ListenOptions = {
  /**
   * "manual" (default): push-to-talk; the turn ends at stop(). "auto": hands-free; turns end by
   * themselves (silence, punctuation, pauses) and listening goes on — use it for the window around
   * one reply (so the learner can answer or barge in), not for an open microphone.
   */
  turns?: "auto" | "manual";
  /** Words the recognizer should expect (lesson vocabulary). Never names: any word matching a learner's name is dropped. Vendor only. */
  keyterms?: string[];
};

export interface SpeechIn {
  readonly kind: "browser" | "deepgram";
  readonly listening: boolean;
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
  /** The learner finished speaking; the whole turn. */
  onEndOfTurn(fn: (text: string) => void): Unsubscribe;
  /** Voice activity began (before any words are recognized, when the recognizer can tell). */
  onSpeechStart(fn: () => void): Unsubscribe;
  onError(fn: (e: VoiceError) => void): Unsubscribe;
}

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
