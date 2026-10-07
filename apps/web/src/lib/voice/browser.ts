import type { Locale } from "@/lib/types";
import { sentencesFrom } from "./chunk";
import { speakable, wordAt } from "./speakable";
import { TURN_DEFAULT, TURN_MANUAL, TURN_YOUNG, turnTracker, type TurnTracker } from "./turn";
import { countWords, emitter, VoiceError, type ListenOptions, type OutState, type SpeakSource, type SpeechIn, type SpeechOut, type VoiceErrorCode } from "./types";

// What every modern browser already has: speechSynthesis to read aloud and (Chrome, Edge, Safari)
// SpeechRecognition to listen. No key, no vendor; the fallback whenever a vendor isn't set up.

export const speechLang = (l: Locale) => (l === "es" ? "es-US" : "en-US");

/** A voice for the language, preferring one that runs on the device (its text stays here). */
export function pickVoice(voices: SpeechSynthesisVoice[], locale: Locale): SpeechSynthesisVoice | null {
  const lang = speechLang(locale).toLowerCase();
  const fits = voices.filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith(locale));
  const rank = (v: SpeechSynthesisVoice) => (v.localService ? 0 : 2) + (v.lang.toLowerCase().replace("_", "-") === lang ? 0 : 1);
  return fits.sort((a, b) => rank(a) - rank(b))[0] ?? null;
}

type Synth = Pick<SpeechSynthesis, "speak" | "cancel" | "pause" | "resume" | "getVoices">;

export type BrowserOutOptions = {
  locale: Locale;
  /** 0.95 by default: a touch slower than the browser's default, easier for children to follow. */
  rate?: number;
  synth?: Synth;
  Utterance?: typeof SpeechSynthesisUtterance;
};

export function browserSpeechOut({ locale, rate = 0.95, synth, Utterance }: BrowserOutOptions): SpeechOut | null {
  const s = synth ?? (typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : undefined);
  const U = Utterance ?? (typeof SpeechSynthesisUtterance !== "undefined" ? SpeechSynthesisUtterance : undefined);
  if (!s || !U) return null;
  const synthesis = s;
  const Utt = U;

  const ev = { boundary: emitter<[number]>(), start: emitter<[]>(), end: emitter<[{ cancelled: boolean }]>(), error: emitter<[VoiceError]>() };
  let state: OutState = "idle";
  let current: { finish: (cancelled: boolean) => void } | null = null;
  // Chrome drops events for utterances it has garbage-collected; keep them referenced while queued.
  let live: SpeechSynthesisUtterance[] = [];

  const out: SpeechOut = {
    kind: "browser",
    get state() {
      return state;
    },
    speak(source: SpeakSource) {
      out.cancel();
      state = "waiting";
      return new Promise<void>((resolve) => {
        let done = false;
        let pending = 0;
        let streamDone = false;
        let started = false;
        let base = 0;
        const me = {
          finish(cancelled: boolean) {
            if (done) return;
            done = true;
            if (current === me) current = null;
            live = [];
            state = "idle";
            ev.end.emit({ cancelled });
            resolve();
          },
        };
        current = me;
        const maybeDone = () => {
          if (streamDone && pending === 0) me.finish(false);
        };
        const voice = pickVoice(synthesis.getVoices(), locale);
        void (async () => {
          try {
            for await (const sentence of sentencesFrom(source)) {
              if (done) return;
              const sp = speakable(sentence, locale);
              const offset = base;
              base += countWords(sentence);
              if (!sp.text) continue;
              const u = new Utt(sp.text);
              u.lang = speechLang(locale);
              u.voice = voice;
              u.rate = rate;
              u.onstart = () => {
                if (done) return;
                if (!started) {
                  started = true;
                  if (state === "waiting") state = "speaking";
                  ev.start.emit();
                }
                ev.boundary.emit(offset + (sp.words[0] ?? 0)); // sentence-level highlight even for voices without word events
              };
              u.onboundary = (e) => {
                if (done || (e.name && e.name !== "word")) return;
                const k = Math.min(wordAt(sp.text, e.charIndex), sp.words.length - 1);
                if (k > 0) ev.boundary.emit(offset + sp.words[k]);
              };
              u.onend = () => {
                if (done) return;
                pending--;
                maybeDone();
              };
              u.onerror = (e) => {
                if (done) return;
                pending--;
                if (e.error !== "interrupted" && e.error !== "canceled") ev.error.emit(new VoiceError("speak", e.error));
                maybeDone();
              };
              pending++;
              live.push(u);
              synthesis.speak(u);
            }
          } catch {
            // The caller's stream failed: speak what arrived.
          }
          streamDone = true;
          maybeDone();
        })();
      });
    },
    pause() {
      if (state !== "speaking" && state !== "waiting") return;
      synthesis.pause();
      state = "paused";
    },
    resume() {
      if (state !== "paused") return;
      synthesis.resume();
      state = "speaking";
    },
    cancel() {
      const c = current;
      if (!c) return;
      current = null;
      const wasPaused = state === "paused";
      c.finish(true); // first, so the "interrupted" events cancel() fires are ignored
      synthesis.cancel();
      if (wasPaused) synthesis.resume(); // Chrome stays paused across a cancel otherwise
    },
    warm() {
      // iOS lets speech start later only if something was spoken inside a tap.
      if (state !== "idle") return;
      const u = new Utt("");
      u.volume = 0;
      synthesis.speak(u);
    },
    onBoundary: ev.boundary.on,
    onStart: ev.start.on,
    onEnd: ev.end.on,
    onError: ev.error.on,
  };
  return out;
}

// ---- Listening

type RecResult = { isFinal: boolean; 0: { transcript: string }; length: number };
type RecEvent = { resultIndex: number; results: ArrayLike<RecResult> };
export type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((e: RecEvent) => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};
export type RecognitionCtor = new () => Recognition;

export function recognitionCtor(): RecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

const REC_ERRORS: Record<string, VoiceErrorCode> = {
  "not-allowed": "denied",
  "service-not-allowed": "denied",
  "audio-capture": "no-device",
  network: "network",
  "language-not-supported": "unsupported",
  "bad-grammar": "unavailable",
};

export type BrowserInOptions = {
  locale: Locale;
  /** K–5 learner: longer pauses before a turn ends. */
  young?: boolean;
  Recognition?: RecognitionCtor;
  now?: () => number;
};

export function browserSpeechIn({ locale, young = false, Recognition, now = () => Date.now() }: BrowserInOptions): SpeechIn | null {
  const R = Recognition ?? recognitionCtor();
  if (!R) return null;
  const Rec = R;
  const ev = {
    partial: emitter<[string]>(),
    final: emitter<[string]>(),
    turn: emitter<[string]>(),
    speech: emitter<[]>(),
    error: emitter<[VoiceError]>(),
  };
  let listening = false;
  let rec: Recognition | null = null;
  let tracker: TurnTracker | null = null;
  let stopping = false;
  let discard = false;
  let sessionFinals = 0;
  let quickEnds = 0;
  let startedAt = 0;
  let pendingStart: { resolve: () => void; reject: (e: VoiceError) => void } | null = null;

  const fail = (code: VoiceErrorCode, detail?: string) => {
    const err = new VoiceError(code, detail);
    listening = false;
    stopping = true;
    tracker?.reset();
    try {
      rec?.abort();
    } catch {}
    rec = null;
    if (pendingStart) {
      pendingStart.reject(err);
      pendingStart = null;
    }
    ev.error.emit(err);
  };

  const finishStop = () => {
    const text = discard ? "" : (tracker?.flush() ?? "");
    tracker?.reset();
    listening = false;
    rec = null;
    if (text) ev.turn.emit(text);
  };

  function open() {
    const r = new Rec();
    r.lang = speechLang(locale);
    r.interimResults = true;
    r.continuous = true;
    r.maxAlternatives = 1;
    sessionFinals = 0;
    startedAt = now();
    r.onstart = () => {
      pendingStart?.resolve();
      pendingStart = null;
    };
    r.onspeechstart = () => {
      tracker?.feed({ type: "speech-start", at: now() });
      ev.speech.emit();
    };
    r.onspeechend = () => tracker?.feed({ type: "speech-end", at: now() });
    r.onresult = (e) => {
      if (!tracker) return;
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const text = res[0]?.transcript?.trim() ?? "";
        if (res.isFinal) {
          if (i < sessionFinals) continue;
          sessionFinals = i + 1;
          tracker.feed({ type: "final", text, at: now(), speechFinal: true });
          if (text) ev.final.emit(text);
        } else interim += (interim ? " " : "") + text;
      }
      if (interim) tracker.feed({ type: "partial", text: interim, at: now() });
      const so = tracker.text();
      if (so) ev.partial.emit(so);
    };
    r.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return; // onend follows; we start again
      fail(REC_ERRORS[e.error] ?? "unavailable", e.error);
    };
    r.onend = () => {
      if (rec !== r) return;
      if (stopping || !listening) return finishStop();
      // Browsers end recognition after a stretch of silence even in continuous mode: start again.
      quickEnds = now() - startedAt < 1000 ? quickEnds + 1 : 0;
      if (quickEnds > 3) return fail("unavailable", "recognition keeps ending");
      try {
        open();
      } catch {
        fail("unavailable");
      }
    };
    rec = r;
    r.start();
  }

  return {
    kind: "browser",
    get listening() {
      return listening;
    },
    start(opts: ListenOptions = {}) {
      if (listening) return Promise.resolve();
      listening = true;
      stopping = false;
      discard = false;
      quickEnds = 0;
      tracker = turnTracker({
        options: opts.turns === "manual" ? TURN_MANUAL : young ? TURN_YOUNG : TURN_DEFAULT,
        onEnd: (text) => ev.turn.emit(text),
        now,
      });
      return new Promise<void>((resolve, reject) => {
        pendingStart = { resolve, reject };
        // Some browsers never fire onstart; don't hold the caller up.
        setTimeout(() => {
          pendingStart?.resolve();
          pendingStart = null;
        }, 3000);
        try {
          open();
        } catch (e) {
          fail("unavailable", (e as Error)?.message);
        }
      });
    },
    stop() {
      if (!listening || stopping) return;
      stopping = true;
      if (!rec) return finishStop();
      try {
        rec.stop(); // final results arrive, then onend → the turn
      } catch {
        finishStop();
      }
    },
    abort() {
      if (!listening) return;
      stopping = true;
      discard = true;
      const r = rec;
      tracker?.reset();
      finishStop();
      try {
        r?.abort();
      } catch {}
    },
    level: () => 0,
    onPartial: ev.partial.on,
    onFinal: ev.final.on,
    onEndOfTurn: ev.turn.on,
    onSpeechStart: ev.speech.on,
    onError: ev.error.on,
  };
}
