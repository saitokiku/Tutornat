import type { Locale } from "@/lib/types";
import { SENTENCE_PAUSE } from "./bands";
import { sentencesFrom } from "./chunk";
import { assertSpoken } from "./numbers";
import { speakable, wordAt } from "./speakable";
import { TURN_MANUAL, turnOptions, turnTracker, type TurnTracker } from "./turn";
import {
  countWords,
  emitter,
  finishedRun,
  metaOf,
  VoiceError,
  type Band,
  type HeardWord,
  type ListenOptions,
  type OutState,
  type OutTiming,
  type SpeakSource,
  type SpeechIn,
  type SpeechOut,
  type SpeechRun,
  type TurnMeta,
  type VoiceErrorCode,
} from "./types";
import { chooseVoice, loadVoices, type VoicePick } from "./voices";

// What every modern browser already has: speechSynthesis to read aloud and (Chrome, Edge, Safari)
// SpeechRecognition to listen. No key, no vendor. Which browser voice may speak is decided by
// ./voices (tiers): this file is the only place in the app that touches speechSynthesis.

export const speechLang = (l: Locale) => (l === "es" ? "es-US" : "en-US");

type Synth = Pick<SpeechSynthesis, "speak" | "cancel" | "pause" | "resume" | "getVoices"> & Partial<Pick<SpeechSynthesis, "addEventListener" | "removeEventListener">>;

const defaultSynth = (): Synth | undefined => (typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : undefined);

/**
 * The learner's browser voice, once the browser has listed its voices (up to a second): the best
 * tier available in their language, online voices only when allowed. Null when only robots are on
 * offer, or there is no speechSynthesis: then read-aloud is text only.
 */
export async function browserVoice({ locale, online, learner, synth }: { locale: Locale; online: boolean; learner?: string; synth?: Synth }): Promise<VoicePick<SpeechSynthesisVoice> | null> {
  const s = synth ?? defaultSynth();
  if (!s) return null;
  return chooseVoice(await loadVoices(s), locale, { online, learner });
}

export type BrowserOutOptions = {
  locale: Locale;
  /** The voice to use (browserVoice()); without one nothing is spoken (returns null). */
  pick: VoicePick<SpeechSynthesisVoice> | null;
  band?: Band;
  /** Learner names: left out whenever the voice runs online (not on this device). */
  names?: string[];
  synth?: Synth;
  Utterance?: typeof SpeechSynthesisUtterance;
  now?: () => number;
};

export function browserSpeechOut({ locale, pick, band: ownBand = "69", names = [], synth, Utterance, now = () => performance.now() }: BrowserOutOptions): SpeechOut | null {
  const s = synth ?? defaultSynth();
  const U = Utterance ?? (typeof SpeechSynthesisUtterance !== "undefined" ? SpeechSynthesisUtterance : undefined);
  if (!s || !U || !pick) return null;
  const synthesis = s;
  const Utt = U;
  const voice = pick.voice;
  // An online voice sends the text to the company that runs it: names stay here.
  const leaveOut = pick.online ? names : [];

  const ev = {
    boundary: emitter<[number, number]>(),
    scheduled: emitter<[number, number, number]>(),
    start: emitter<[number]>(),
    end: emitter<[{ cancelled: boolean }, number]>(),
    error: emitter<[VoiceError, number]>(),
    locked: emitter<[boolean]>(),
    timing: emitter<[OutTiming]>(),
  };
  let state: OutState = "idle";
  let ids = 0;
  let current: { id: number; finish: (cancelled: boolean) => void } | null = null;
  let heard = -1;
  // Chrome drops events for utterances it has garbage-collected; keep them referenced while queued.
  let live: SpeechSynthesisUtterance[] = [];

  const out: SpeechOut = {
    kind: "browser",
    tier: pick.tier,
    get state() {
      return state;
    },
    locked: false,
    speak(source: SpeakSource, opts = {}): SpeechRun {
      out.cancel();
      const id = ++ids;
      if (opts.signal?.aborted) return finishedRun(id);
      const band = opts.band ?? ownBand;
      state = "waiting";
      heard = -1;
      let resolve!: () => void;
      const done = new Promise<void>((ok) => (resolve = ok));
      let finished = false;
      let started = false;
      const queue: { text: string; offset: number; words: number[]; question: boolean; last: number }[] = [];
      let streamDone = false;
      let speaking = false;
      let gap: ReturnType<typeof setTimeout> | undefined;
      let firstSentenceAt: number | null = null;
      const me = {
        id,
        finish(cancelled: boolean) {
          if (finished) return;
          finished = true;
          clearTimeout(gap);
          opts.signal?.removeEventListener("abort", onAbort);
          if (current === me) current = null;
          live = [];
          state = "idle";
          ev.end.emit({ cancelled }, id);
          resolve();
        },
      };
      const onAbort = () => {
        if (current === me) out.cancel();
      };
      opts.signal?.addEventListener("abort", onAbort, { once: true });
      current = me;

      // One sentence at a time, with the band's pause between them (pace from pauses, not slow words).
      const next = () => {
        if (finished || speaking) return;
        const item = queue.shift();
        if (!item) {
          if (streamDone) me.finish(false);
          return;
        }
        speaking = true;
        const u = new Utt(item.text);
        u.lang = speechLang(locale);
        u.voice = voice;
        u.rate = 1;
        u.onstart = () => {
          if (finished) return;
          if (!started) {
            started = true;
            if (state === "waiting") state = "speaking";
            ev.start.emit(id);
            ev.timing.emit({ run: id, vendor: "browser", firstSentenceAt, firstChunkAt: null, firstAudibleAt: now(), underruns: 0, retried: false });
          }
          ev.boundary.emit(item.offset + (item.words[0] ?? 0), id); // sentence-level highlight even for voices without word events
        };
        u.onboundary = (e) => {
          if (finished || (e.name && e.name !== "word")) return;
          const k = Math.min(wordAt(item.text, e.charIndex), item.words.length - 1);
          if (k > 0) {
            heard = Math.max(heard, item.offset + item.words[k - 1]);
            ev.boundary.emit(item.offset + item.words[k], id);
          }
        };
        const after = () => {
          speaking = false;
          heard = Math.max(heard, item.last);
          if (!queue.length) return next();
          const p = SENTENCE_PAUSE[band];
          gap = setTimeout(next, p.after + (queue[0].question ? p.beforeQuestion : 0));
        };
        u.onend = () => {
          if (!finished) after();
        };
        u.onerror = (e) => {
          if (finished) return;
          if (e.error !== "interrupted" && e.error !== "canceled") ev.error.emit(new VoiceError("speak", e.error), id);
          after();
        };
        live.push(u);
        assertSpoken(item.text, "the browser voice");
        firstSentenceAt ??= now();
        synthesis.speak(u);
      };

      void (async () => {
        let base = 0;
        try {
          for await (const sentence of sentencesFrom(source)) {
            if (finished) return;
            const sp = speakable(sentence, locale, leaveOut);
            const offset = base;
            base += countWords(sentence);
            if (!sp.text) continue;
            queue.push({ text: sp.text, offset, words: sp.words, question: /[?¿]/.test(sentence), last: base - 1 });
            next();
          }
        } catch {
          // The caller's stream failed: speak what arrived.
        }
        streamDone = true;
        if (!speaking && !queue.length) me.finish(false);
      })();
      return Object.assign(done, { id });
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
      try {
        const u = new Utt("");
        u.volume = 0;
        synthesis.speak(u);
      } catch {}
    },
    dispose() {
      out.cancel();
    },
    heardUpTo: () => heard,
    // A browser voice plays outside the page's audio graph: it can't be ducked, only stopped.
    duck() {},
    unduck() {},
    onBoundary: ev.boundary.on,
    onWordScheduled: ev.scheduled.on,
    onStart: ev.start.on,
    onEnd: ev.end.on,
    onError: ev.error.on,
    onLocked: ev.locked.on,
    onTiming: ev.timing.on,
  };
  return out;
}

// ---- Listening

type RecResult = { isFinal: boolean; 0: { transcript: string; confidence?: number }; length: number };
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
  band?: Band;
  Recognition?: RecognitionCtor;
  now?: () => number;
};

/**
 * The browser's recognizer: the last resort (live tutor spec §2.2). Half duplex — the microphone is
 * closed while the tutor speaks — and no restart loop of its own beyond the browser ending a quiet
 * stream (Android beeps on every start).
 */
export function browserSpeechIn({ locale, band: ownBand = "69", Recognition, now = () => performance.now() }: BrowserInOptions): SpeechIn | null {
  const R = Recognition ?? recognitionCtor();
  if (!R) return null;
  const Rec = R;
  const ev = {
    partial: emitter<[string]>(),
    final: emitter<[string]>(),
    words: emitter<[HeardWord[]]>(),
    turn: emitter<[string, TurnMeta]>(),
    eager: emitter<[string, TurnMeta]>(),
    resumed: emitter<[]>(),
    speech: emitter<[]>(),
    slow: emitter<[boolean]>(),
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
  let heard: HeardWord[] = [];
  let pendingStart: { resolve: () => void; reject: (e: VoiceError) => void } | null = null;

  const endTurn = (text: string) => {
    const meta = metaOf(heard);
    heard = [];
    ev.turn.emit(text, meta);
  };

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
    if (text) endTurn(text);
    heard = [];
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
      const at = now();
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const text = res[0]?.transcript?.trim() ?? "";
        if (res.isFinal) {
          if (i < sessionFinals) continue;
          sessionFinals = i + 1;
          // No word times from the browser: each final's words are stamped when they arrived.
          const confidence = typeof res[0]?.confidence === "number" && res[0].confidence > 0 ? res[0].confidence : null;
          const ws = text.split(/\s+/).filter(Boolean).map((word) => ({ word, start: at, end: at, confidence }));
          heard.push(...ws);
          if (ws.length) ev.words.emit(ws);
          tracker.feed({ type: "final", text, at, speechFinal: true });
          if (text) ev.final.emit(text);
        } else interim += (interim ? " " : "") + text;
      }
      if (interim) tracker?.feed({ type: "partial", text: interim, at });
      const so = tracker?.text();
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
    duplex: false,
    get listening() {
      return listening;
    },
    start(opts: ListenOptions = {}) {
      if (listening) return Promise.resolve();
      listening = true;
      stopping = false;
      discard = false;
      quickEnds = 0;
      heard = [];
      tracker = turnTracker({
        options: opts.turns === "auto" ? turnOptions(opts.band ?? ownBand, opts.answer) : TURN_MANUAL,
        onEnd: (text) => endTurn(text),
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
    level: () => null, // the browser's recognizer has the microphone; we can't measure it
    onPartial: ev.partial.on,
    onFinal: ev.final.on,
    onWords: ev.words.on,
    onEndOfTurn: ev.turn.on,
    onEagerEnd: ev.eager.on,
    onTurnResumed: ev.resumed.on,
    onSpeechStart: ev.speech.on,
    onSlow: ev.slow.on,
    onError: ev.error.on,
  };
}
