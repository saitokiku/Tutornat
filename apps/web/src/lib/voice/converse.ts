import type { Locale } from "@/lib/types";
import { isBackchannel, words } from "./backchannel";
import { BARGE_IN_MS, echoVerdict, echoWords, shouldBargeIn } from "./bargein";
import { sentencesFrom } from "./chunk";
import { speakable } from "./speakable";
import { countWords, type SpeakSource, type SpeechIn, type SpeechOut, type Unsubscribe } from "./types";

// Talking with the tutor, both ways at once. While the tutor speaks the microphone stays open:
//  - "mhm", "ok", "ajá", "sí" are let through: no interruption, no new turn, the tutor goes on. Said
//    while the tutor asks a question ("Do you want another one?"), it is the answer, given when the
//    tutor finishes;
//  - real speech for 300 ms or more stops the tutor at once (barge-in) and becomes the next turn;
//  - the tutor's own voice picked up by the microphone is not taken as the learner. Echo is judged
//    against the words that were actually playing when the learner's speech began (from the output's
//    word boundaries), in their spoken form ("3/4" is heard as "3 fourths"), including speech that
//    ends after the reply does. What is set aside as echo goes to onEcho, so a screen can offer it.
// When the tutor is quiet, every finished turn (even "ok") goes to onTurn. Nobody talking for a while,
// or the page going out of sight, turns the microphone off.

export type VoiceMetric = {
  /** first-audio: from say() to the first sound. barge-in: from the learner's first sound to the tutor stopping. */
  name: "first-audio" | "barge-in";
  ms: number;
  vendor: SpeechOut["kind"];
};

export type MicOffReason = "idle" | "hidden";

export type ConverseOptions = {
  input: SpeechIn | null;
  output: SpeechOut | null;
  /** The reply's language, so echo is compared with what the voice said ("3 fourths", "3 cuartos"). */
  locale?: Locale;
  /** The names the output leaves out, so echo is compared with what was really said. */
  names?: string[];
  /** The learner said something to answer. */
  onTurn: (text: string) => void;
  /** The learner interrupted; the tutor's speech was cancelled. Stop the reply too. */
  onBargeIn?: () => void;
  /** An acknowledgement while the tutor was speaking (kept out of the conversation). */
  onBackchannel?: (text: string) => void;
  /** Heard while the tutor spoke and matching its words, so not sent. A screen may offer to send it. */
  onEcho?: (text: string) => void;
  /** The microphone was turned off: nobody spoke for idleMs, or the page went out of sight. */
  onMicOff?: (why: MicOffReason) => void;
  /** Timings for the voice quality bars (first audio < 1.5 s; barge-in in about 300 ms). */
  onMetric?: (m: VoiceMetric) => void;
  minBargeMs?: number;
  /** Silence (no learner speech, no tutor speech) after which listening stops. 30 s by default. */
  idleMs?: number;
  now?: () => number;
};

/** Learner speech that starts this soon after the tutor stops may still be the tail of its echo. */
export const ECHO_TAIL_MS = 1000;
/** Recognizers report speech a little late: echo is matched against what played this long before. */
export const ECHO_LAG_MS = 1500;
/** A speech start with no words after this long was noise; the next words start a new onset. */
export const STALE_ONSET_MS = 1200;

type Reply = {
  startedAt: number;
  /** Echo words of everything this reply has handed to the voice, with the written word each came from. */
  spoken: { index: number; word: string }[];
  /** Written word ranges of the sentences, and whether each asks a question. */
  sentences: { from: number; to: number; question: boolean }[];
  /** When each word boundary fired. */
  marks: { at: number; index: number }[];
  /** Boundaries arrive per word (not only per sentence). */
  perWord: boolean;
  endedAt: number | null;
  cancelled: boolean;
};

export function converse({
  input,
  output,
  locale = "en",
  names = [],
  onTurn,
  onBargeIn,
  onBackchannel,
  onEcho,
  onMicOff,
  onMetric,
  minBargeMs = BARGE_IN_MS,
  idleMs = 30_000,
  now = () => Date.now(),
}: ConverseOptions) {
  let onsetAt: number | null = null;
  /** The tutor's voice was playing when the learner's speech began. */
  let onsetPlaying = false;
  /** …or had stopped only just before (its echo may still be coming in). */
  let onsetNearVoice = false;
  let heard = "";
  let reply: Reply | null = null;
  /** A "yes" given during the tutor's question, delivered when the tutor finishes. */
  let held: string | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  const subs: Unsubscribe[] = [];

  const state = () => output?.state ?? "idle";
  const playing = () => state() === "speaking";
  const midReply = () => state() === "speaking" || state() === "paused";

  const sentenceAt = (index: number) => reply?.sentences.find((s) => index >= s.from && index < s.to) ?? null;
  /** The written word playing at time t (-1 before the first). */
  const indexAt = (t: number) => {
    let k = -1;
    for (const m of reply?.marks ?? []) {
      if (m.at > t) break;
      k = m.index;
    }
    return k;
  };

  /** Echo words of what the voice played from `from` to `to` (ms). */
  function playedBetween(from: number, to: number): string[] {
    const r = reply;
    if (!r || !r.marks.length) return [];
    const at = indexAt(to);
    if (at < 0) return [];
    let lo = Math.max(indexAt(from), r.marks[0].index);
    // Per-word marks: up to this word and the next. Voices that only mark sentences: the whole sentence.
    let hi = r.perWord ? at + 1 : (sentenceAt(at)?.to ?? at + 1) - 1;
    if (!r.perWord) lo = sentenceAt(lo)?.from ?? lo;
    if (r.endedAt != null && !r.cancelled && to >= r.endedAt) hi = Infinity; // it all played
    return r.spoken.filter((w) => w.index >= lo && w.index <= hi).map((w) => w.word);
  }

  /** The tutor's voice was playing at t, or had finished playing only just before. */
  const nearVoice = (t: number) => playing() || (reply?.endedAt != null && !reply.cancelled && t - reply.endedAt <= ECHO_TAIL_MS);

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

  function bargeIn(at: number | null) {
    held = null;
    output?.cancel();
    if (at != null && output) onMetric?.({ name: "barge-in", ms: now() - at, vendor: output.kind });
    onBargeIn?.();
  }

  function check() {
    clearTimeout(timer);
    if (!output || !midReply() || onsetAt == null || !heard) return;
    // While the voice plays, what we hear may be the voice itself (even if the learner's sound began before it did).
    const recent = state() === "speaking" ? playedBetween(onsetAt - ECHO_LAG_MS, now()) : [];
    if (shouldBargeIn({ speaking: true, heard, onsetAt, now: now(), tutorRecent: recent, minMs: minBargeMs })) return bargeIn(onsetAt);
    // Real words but not long enough yet: look again when they would be.
    const left = onsetAt + minBargeMs - now();
    if (left > 0) timer = setTimeout(check, left);
  }

  /** The learner's speech began now (unless it already began; a start that brought no words was noise). */
  function onset() {
    const t = now();
    if (onsetAt != null && (heard || t - onsetAt < STALE_ONSET_MS)) return;
    onsetAt = t;
    onsetPlaying = playing();
    onsetNearVoice = nearVoice(t);
  }

  if (input) {
    subs.push(
      input.onSpeechStart(() => {
        pokeIdle();
        onset();
      }),
      input.onPartial((text) => {
        pokeIdle();
        if (!words(text).length) return;
        if (!heard) onset();
        heard = text;
        check();
      }),
      input.onEndOfTurn((text) => {
        pokeIdle();
        const t = now();
        // No speech start or partial came first (some recognizers): the turn began about now.
        const at = onsetAt ?? t;
        const wasPlaying = onsetAt != null ? onsetPlaying : playing();
        const wasNearVoice = onsetAt != null ? onsetNearVoice : nearVoice(t);
        clearTimeout(timer);
        onsetAt = null;
        onsetPlaying = onsetNearVoice = false;
        heard = "";
        const s = state();
        if ((wasNearVoice || nearVoice(t)) && s !== "paused" && echoVerdict(text, playedBetween(at - ECHO_LAG_MS, t)) === "echo") return onEcho?.(text);
        if ((s !== "idle" || wasPlaying) && isBackchannel(text)) {
          // "Yes" while the tutor asks something answers it (once the tutor finishes); otherwise it's listening.
          const asked = s !== "waiting" && !!sentenceAt(indexAt(t))?.question;
          if (asked && midReply()) held = text;
          else if (asked) onTurn(text);
          else onBackchannel?.(text);
          return;
        }
        held = null;
        if (s !== "idle") bargeIn(null);
        onTurn(text);
      }),
    );
  }

  if (output) {
    subs.push(
      output.onStart(() => {
        pokeIdle();
        if (reply) onMetric?.({ name: "first-audio", ms: now() - reply.startedAt, vendor: output.kind });
      }),
      output.onBoundary((index) => {
        pokeIdle();
        const r = reply;
        if (!r) return;
        const last = r.marks[r.marks.length - 1];
        if (last && sentenceAt(last.index) === sentenceAt(index) && last.index !== index) r.perWord = true;
        r.marks.push({ at: now(), index });
      }),
      output.onEnd(({ cancelled }) => {
        pokeIdle();
        if (reply) {
          reply.endedAt = now();
          reply.cancelled = cancelled;
        }
        const h = held;
        held = null;
        if (!h) return;
        if (cancelled) onBackchannel?.(h);
        else onTurn(h);
      }),
    );
  }

  const onVisibility = () => {
    if (typeof document === "undefined" || !document.hidden || !input?.listening) return;
    clearTimeout(timer);
    onsetAt = null;
    heard = "";
    input.abort();
    onMicOff?.("hidden");
  };
  if (input && typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibility);
    subs.push(() => document.removeEventListener("visibilitychange", onVisibility));
  }

  return {
    /** Speak through the output, remembering what is said so its echo isn't taken for the learner. */
    say(source: SpeakSource): Promise<void> {
      if (!output) return Promise.resolve();
      held = null;
      const r: Reply = { startedAt: now(), spoken: [], sentences: [], marks: [], perWord: false, endedAt: null, cancelled: false };
      reply = r;
      let base = 0;
      const tap = async function* () {
        for await (const s of sentencesFrom(source)) {
          const sp = speakable(s, locale, names);
          const said = sp.text.split(/\s+/).filter(Boolean);
          // Spoken then written form of each word ("3 fourths", "3 4"): a recognizer may write either.
          s.split(/\s+/)
            .filter(Boolean)
            .forEach((w, k) => {
              const spokenForm = echoWords(said.filter((_, j) => sp.words[j] === k).join(" "));
              const writtenForm = echoWords(w).filter((x) => !spokenForm.includes(x));
              for (const word of [...spokenForm, ...writtenForm]) r.spoken.push({ index: base + k, word });
            });
          r.sentences.push({ from: base, to: base + countWords(s), question: /[?¿]/.test(s) });
          base += countWords(s);
          yield s;
        }
      };
      return output.speak(tap());
    },
    /** Call when the microphone is turned on, so the idle timer starts. */
    listening() {
      pokeIdle();
    },
    dispose() {
      clearTimeout(timer);
      clearTimeout(idleTimer);
      subs.forEach((u) => u());
      subs.length = 0;
    },
  };
}
