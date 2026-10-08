import type { Locale } from "@/lib/types";
import { isBackchannel } from "./backchannel";
import {
  bargeStart,
  bargeStep,
  ECHO_SCREEN_MS,
  echoByTime,
  echoVerdict,
  foldWords,
  HALF_DUPLEX_AFTER,
  QUESTION_TAIL_MS,
  wordKind,
  type BargeAction,
  type BargeEvent,
  type PlayedWord,
} from "./bargein";
import { sentencesFrom } from "./chunk";
import { speakable } from "./speakable";
import { countWords, type HeardWord, type SpeakOptions, type SpeakSource, type SpeechIn, type SpeechOut, type SpeechRun, type TurnMeta, type Unsubscribe } from "./types";

// Talking with the tutor, both ways at once (live tutor spec §2.4). While the tutor speaks the
// microphone stays open (vendor recognizers; the browser's is half duplex and closed meanwhile):
//  - the learner starting to talk ducks the tutor to 30% at once; a real word (not "mhm", not the
//    tutor's own echo) or 700 ms of voice stops it with a fade; nothing within 800 ms brings it back;
//  - speech that starts in the last 1.5 s of a tutor question, or after it, answers that question,
//    even "yes" or the tutor's own words ("the bottom number"): it is held and delivered when the
//    tutor's audio ends;
//  - the tutor's voice coming back through the microphone is matched by time: the same word played
//    within ±400 ms of when it was heard (screened until 1.5 s after the last sample). What is set
//    aside as echo goes to onEcho ("Did you say …?"); two of those in a session switch it to half
//    duplex (the microphone is gated while the tutor speaks; Stop interrupts).
// When the tutor is quiet, every finished turn goes to onTurn. Nobody talking for a while, or the
// page going out of sight, turns the microphone off.

export type ConverseMetric =
  /** say() → the first audio was scheduled. */
  | { name: "first-audio"; ms: number; vendor: SpeechOut["kind"] }
  /** The learner's first sound → the tutor ducked, → the tutor stopped. */
  | { name: "barge-in"; duckMs: number | null; stopMs: number; vendor: SpeechOut["kind"] };
/** @deprecated the first version's name. */
export type VoiceMetric = ConverseMetric;

export type MicOffReason = "idle" | "hidden";

export type HeardTurn = TurnMeta & {
  /** Said over the end of the tutor's question, delivered when the tutor finished. */
  held: boolean;
};

export type ConverseOptions = {
  input: SpeechIn | null;
  output: SpeechOut | null;
  /** The reply's language, so echo is compared with what the voice said. */
  locale?: Locale;
  /** The names the output leaves out, so echo is compared with what was really said. */
  names?: string[];
  /** The learner said something to answer. */
  onTurn: (text: string, meta: HeardTurn) => void;
  /** The learner interrupted; the tutor's speech was cancelled. Stop the reply too. */
  onBargeIn?: () => void;
  /** The tutor was ducked (true) or brought back (false). */
  onDuck?: (ducked: boolean) => void;
  /** An acknowledgement while the tutor was speaking (kept out of the conversation). */
  onBackchannel?: (text: string) => void;
  /** Heard while the tutor spoke and matching its words in time, so not sent. A screen may offer to send it. */
  onEcho?: (text: string) => void;
  /** Two echo set-asides: from now on the microphone is gated while the tutor speaks. */
  onHalfDuplex?: () => void;
  /** The microphone was turned off: nobody spoke for idleMs, or the page went out of sight. */
  onMicOff?: (why: MicOffReason) => void;
  onMetric?: (m: ConverseMetric) => void;
  /** Silence (no learner speech, no tutor speech) after which listening stops. 30 s by default. */
  idleMs?: number;
  /** How often the microphone level is read while the tutor speaks (for the onset). */
  frameMs?: number;
  /** performance.now() */
  now?: () => number;
};

/** @deprecated kept for callers of the first version; echo is screened for ECHO_SCREEN_MS after the voice. */
export const ECHO_TAIL_MS = ECHO_SCREEN_MS;
/** @deprecated */
export const ECHO_LAG_MS = 1500;

type Reply = {
  run: number;
  startedAt: number;
  /** Spoken forms of each written word, folded ("3/4" → ["three", "fourths"]). */
  forms: Map<number, string[]>;
  /** How many of a written word's spoken words were scheduled so far. */
  seen: Map<number, number>;
  played: PlayedWord[];
  /** Written word ranges of the sentences, and whether each asks a question. */
  sentences: { from: number; to: number; question: boolean }[];
  /** When each written word was (or will be) heard. */
  wordAt: Map<number, number>;
  endedAt: number | null;
  cancelled: boolean;
  firstAudio: boolean;
};

export function converse({
  input,
  output,
  locale = "en",
  names = [],
  onTurn,
  onBargeIn,
  onDuck,
  onBackchannel,
  onEcho,
  onHalfDuplex,
  onMicOff,
  onMetric,
  idleMs = 30_000,
  frameMs = 40,
  now = () => performance.now(),
}: ConverseOptions) {
  let reply: Reply | null = null;
  let barge = bargeStart();
  let duckedAt: number | null = null;
  let heardSoFar = "";
  let onset: number | null = null;
  let held: { text: string; meta: HeardTurn } | null = null;
  let setAsides = 0;
  let halfDuplex = !!input && !input.duplex;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  let frameTimer: ReturnType<typeof setInterval> | undefined;
  const subs: Unsubscribe[] = [];

  const state = () => output?.state ?? "idle";
  const playing = () => state() === "speaking";
  const midReply = () => state() === "speaking" || state() === "paused" || state() === "waiting";

  /** The tutor's voice was heard at t, or stopped less than 1.5 s before (its echo may still come in). */
  const nearVoice = (t: number) => playing() || (reply?.endedAt != null && !reply.cancelled && t - reply.endedAt <= ECHO_SCREEN_MS);

  const sentenceOf = (r: Reply, index: number) => r.sentences.find((s) => index >= s.from && index < s.to) ?? null;

  /** When a sentence is heard, as far as is known: its first word, and its end (the next sentence's start, or its last word plus a little). */
  function sentenceSpan(r: Reply, k: number): { start: number; end: number } | null {
    const s = r.sentences[k];
    const start = r.wordAt.get(s.from);
    if (start == null) return null;
    const next = r.sentences[k + 1] ? r.wordAt.get(r.sentences[k + 1].from) : undefined;
    let last = start;
    for (let i = s.from; i < s.to; i++) last = Math.max(last, r.wordAt.get(i) ?? last);
    return { start, end: next ?? (k === r.sentences.length - 1 && r.endedAt != null ? r.endedAt : last + 350) };
  }

  /** Did speech starting at t answer a question: in its last 1.5 s, or after it (before the next sentence)? */
  function overQuestion(t: number): boolean {
    const r = reply;
    if (!r) return false;
    for (let k = r.sentences.length - 1; k >= 0; k--) {
      if (!r.sentences[k].question) continue;
      const span = sentenceSpan(r, k);
      if (!span) continue;
      const nextStart = r.sentences[k + 1] ? r.wordAt.get(r.sentences[k + 1].from) : undefined;
      if (t >= span.end - QUESTION_TAIL_MS && (nextStart == null || t < nextStart)) return true;
    }
    return false;
  }

  const pokeIdle = () => {
    clearTimeout(idleTimer);
    if (!input || !isFinite(idleMs)) return;
    idleTimer = setTimeout(() => {
      if (!input.listening) return;
      if (state() !== "idle") return pokeIdle(); // the tutor is talking: not idle
      input.stop();
      onMicOff?.("idle");
    }, idleMs);
  };

  function act(actions: BargeAction[]) {
    for (const a of actions) {
      if (a.type === "duck") {
        output?.duck(a.gain, a.ms);
        duckedAt = now();
        onDuck?.(true);
      } else if (a.type === "restore") {
        output?.unduck(a.ms);
        duckedAt = null;
        onDuck?.(false);
      } else {
        held = null;
        const duckMs = duckedAt != null ? Math.round(duckedAt - a.onsetAt) : null;
        const stopMs = Math.round(now() + a.fadeMs - a.onsetAt);
        // The caller hears of the barge-in first (while what was heard is still known), then the voice stops.
        onBargeIn?.();
        output?.cancel({ fadeMs: a.fadeMs }); // ends the run, which resets the duck
        if (output) onMetric?.({ name: "barge-in", duckMs, stopMs, vendor: output.kind });
        duckedAt = null;
        onDuck?.(false);
      }
    }
  }

  const feed = (e: BargeEvent) => {
    const r = bargeStep(barge, e);
    barge = r.state;
    act(r.actions);
  };

  /** While the tutor speaks and the microphone is open, read its level for the onset. */
  function frames(on: boolean) {
    clearInterval(frameTimer);
    frameTimer = undefined;
    if (!on || !input || halfDuplex) return;
    frameTimer = setInterval(() => {
      const level = input.listening ? input.level() : null;
      const t = now();
      if (level != null) feed({ type: "frame", level, at: t, playing: playing() });
      feed({ type: "tick", at: t });
    }, frameMs);
  }

  const played = () => reply?.played ?? [];

  function endOfTurn(text: string, meta: TurnMeta) {
    pokeIdle();
    const t = now();
    const at = meta.words[0]?.start ?? onset ?? t;
    onset = null;
    heardSoFar = "";
    const s = state();
    const wasNear = nearVoice(at) || nearVoice(t);
    // The tutor's own voice: by time when the recognizer gives word times, else by word order.
    const echo = wasNear ? (meta.words.length && meta.words.some((w) => w.end > w.start) ? echoByTime(meta.words, played(), locale) : echoVerdict(text, played().map((p) => p.word), locale)) : "no";
    if (echo === "echo" && s !== "paused") {
      setAsides++;
      onEcho?.(text);
      if (setAsides >= HALF_DUPLEX_AFTER && !halfDuplex) {
        halfDuplex = true;
        frames(false);
        onHalfDuplex?.();
      }
      return;
    }
    const answered = overQuestion(at);
    if (answered && midReply()) {
      // Said over the end of the tutor's question: it answers it once the tutor finishes.
      held = { text, meta: { ...meta, held: true } };
      feed({ type: "reset" });
      if (duckedAt != null) act([{ type: "restore", ms: 250 }]);
      return;
    }
    if (midReply() && isBackchannel(text)) {
      onBackchannel?.(text);
      return;
    }
    held = null;
    if (midReply()) act([{ type: "cancel", fadeMs: 120, onsetAt: at }]);
    onTurn(text, { ...meta, held: false });
  }

  if (input) {
    subs.push(
      input.onSpeechStart(() => {
        pokeIdle();
        onset ??= now();
        if (!halfDuplex) feed({ type: "start", at: now(), playing: playing() });
      }),
      input.onPartial((text) => {
        pokeIdle();
        onset ??= now();
        heardSoFar = text;
      }),
      input.onWords((ws: HeardWord[]) => {
        if (halfDuplex || !midReply()) return;
        for (const w of ws) {
          const kind = overQuestion(w.start) ? "backchannel" : wordKind(w, played(), heardSoFar, locale);
          feed({ type: "word", kind, at: now() });
        }
      }),
      input.onEndOfTurn((text, meta) => endOfTurn(text, meta)),
    );
  }

  if (output) {
    subs.push(
      output.onStart((run) => {
        pokeIdle();
        const r = reply;
        if (r && r.run === run && !r.firstAudio) {
          r.firstAudio = true;
          onMetric?.({ name: "first-audio", ms: Math.round(now() - r.startedAt), vendor: output.kind });
        }
        frames(true);
      }),
      output.onWordScheduled((index, at, run) => {
        const r = reply;
        if (!r || r.run !== run) return;
        const k = r.seen.get(index) ?? 0;
        r.seen.set(index, k + 1);
        if (k === 0) r.wordAt.set(index, at);
        const form = r.forms.get(index)?.[k];
        if (form) r.played.push({ word: form, at });
      }),
      output.onBoundary((index, run) => {
        pokeIdle();
        const r = reply;
        // Browser voices have no look-ahead: the boundary is the best time there is.
        if (!r || r.run !== run || r.wordAt.has(index)) return;
        const at = now();
        r.wordAt.set(index, at);
        for (const form of r.forms.get(index) ?? []) r.played.push({ word: form, at });
      }),
      output.onEnd(({ cancelled }, run) => {
        pokeIdle();
        frames(false);
        feed({ type: "reset" });
        duckedAt = null;
        const r = reply;
        if (r && r.run === run) {
          r.endedAt = now();
          r.cancelled = cancelled;
        }
        const h = held;
        held = null;
        if (h) onTurn(h.text, h.meta);
      }),
    );
  }

  const onVisibility = () => {
    if (typeof document === "undefined" || !document.hidden || !input?.listening) return;
    onset = null;
    heardSoFar = "";
    input.abort();
    onMicOff?.("hidden");
  };
  if (input && typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibility);
    subs.push(() => document.removeEventListener("visibilitychange", onVisibility));
  }

  return {
    /** Speak through the output, remembering what is said so its echo isn't taken for the learner. */
    say(source: SpeakSource, opts?: SpeakOptions): SpeechRun {
      held = null;
      feed({ type: "reset" });
      const r: Reply = { run: -1, startedAt: now(), forms: new Map(), seen: new Map(), played: [], sentences: [], wordAt: new Map(), endedAt: null, cancelled: false, firstAudio: false };
      let base = 0;
      const tap = async function* () {
        for await (const s of sentencesFrom(source)) {
          const sp = speakable(s, locale, names);
          const said = sp.text.split(/\s+/).filter(Boolean);
          s.split(/\s+/)
            .filter(Boolean)
            .forEach((_, k) => r.forms.set(base + k, foldWords(said.filter((__, j) => sp.words[j] === k).join(" "), locale)));
          r.sentences.push({ from: base, to: base + countWords(s), question: /[?¿]/.test(s) });
          base += countWords(s);
          yield s;
        }
      };
      if (!output) return Object.assign(Promise.resolve(), { id: -1 });
      const run = output.speak(tap(), opts);
      r.run = run.id;
      reply = r;
      return run;
    },
    /** Call when the microphone is turned on, so the idle timer starts. */
    listening() {
      pokeIdle();
    },
    /** The microphone is gated while the tutor speaks (half-duplex recognizer, or echo kept coming back). */
    get halfDuplex() {
      return halfDuplex;
    },
    /** The last written word the learner heard of the current or last reply. */
    heardUpTo: () => output?.heardUpTo() ?? -1,
    /** The sentence the tutor is in, and whether it asks something (for the held-answer rule and the UI). */
    sentenceAt: (index: number) => (reply ? sentenceOf(reply, index) : null),
    dispose() {
      clearTimeout(idleTimer);
      frames(false);
      subs.forEach((u) => u());
      subs.length = 0;
    },
  };
}

export type Converse = ReturnType<typeof converse>;
