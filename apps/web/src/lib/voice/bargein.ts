import type { Locale } from "@/lib/types";
import { isBackchannel, words } from "./backchannel";
import { speakable } from "./speakable";
import type { HeardWord } from "./types";

// Barge-in (live tutor spec §2.4): a learner who starts talking over the tutor gets the floor, and the
// tutor's own voice coming back through the microphone (echo) never does.
//
//  1. Onset: the recognizer's start of speech, or the mic level at −30 dBFS (0.5 on levelOf's scale)
//     for 120 ms while the tutor plays (0.33 when it doesn't). The tutor is ducked to 30% at once.
//  2. Cancel: the first word that is neither a backchannel nor echo, or 700 ms of continuous voice:
//     fade to silence over 120 ms and stop.
//  3. Restore: nothing of the kind within 800 ms of the onset: back to full volume over 250 ms.
// Echo is judged by time, not by words alone: a heard word is echo only if the tutor's voice played
// the same word (both folded through the number speller, so "3/4" and "three fourths" match) within
// ±400 ms of when the microphone heard it. "The bottom number." said a second after the tutor asked
// "top or bottom?" is an answer, however many words it shares with the question.

export const DUCK_GAIN = 0.3;
export const DUCK_MS = 80;
export const CANCEL_FADE_MS = 120;
export const RESTORE_MS = 250;
export const RESTORE_AFTER_MS = 800;
export const VOICED_CANCEL_MS = 700;
export const ONSET_MS = 120;
export const LEVEL_PLAYING = 0.5;
export const LEVEL_QUIET = 0.33;
/** A heard word within this of the same word played is echo. */
export const ECHO_WINDOW_MS = 400;
/** Echo is screened for this long after the last scheduled sample ends. */
export const ECHO_SCREEN_MS = 1500;
/** Speech that starts this close to the end of a tutor question (or after it) answers it. */
export const QUESTION_TAIL_MS = 1500;
/** Two echo set-asides in one session switch it to half duplex. */
export const HALF_DUPLEX_AFTER = 2;
/** @deprecated the first version's barge-in wait; the timeline above replaces it. */
export const BARGE_IN_MS = 300;

/** Words in the form a voice says them, for comparing what was heard with what was played. */
export function foldWords(text: string, locale: Locale = "en"): string[] {
  return words(speakable(text, locale).text);
}

/** @deprecated echo words of the first version (digits for number words); see foldWords. */
export const echoWords = (text: string) => foldWords(text);

/** A word the tutor's voice played, folded, and when it was heard (performance.now() ms). */
export type PlayedWord = { word: string; at: number };

/** For each heard word: was the same word played within ±400 ms of it? */
export function echoMarks(heard: HeardWord[], played: PlayedWord[], locale: Locale = "en", windowMs = ECHO_WINDOW_MS): boolean[] {
  return heard.map((h) => {
    // One written word may be several spoken ones ("3/4": "three fourths"); each later one may start a little later.
    const forms = foldWords(h.word, locale);
    return forms.length > 0 && forms.every((f, k) => played.some((p) => p.word === f && Math.abs(p.at - h.start) <= windowMs + k * 300));
  });
}

/** Is what was heard the tutor's own voice? Two or more words, 80% of them echo by time: "echo". One echoed word: "maybe". */
export function echoByTime(heard: HeardWord[], played: PlayedWord[], locale: Locale = "en"): "echo" | "maybe" | "no" {
  const marks = echoMarks(heard, played, locale);
  if (!marks.length) return "no";
  const share = marks.filter(Boolean).length / marks.length;
  if (marks.length >= 2) return share >= 0.8 ? "echo" : "no";
  return marks[0] ? "maybe" : "no";
}

/** Share of the heard words that follow, in order, words the tutor played (0..1). For recognizers without word times. */
export function echoScore(heard: string[], tutorWords: string[]): number {
  if (!heard.length || !tutorWords.length) return 0;
  let prev = new Array<number>(tutorWords.length + 1).fill(0);
  for (const h of heard) {
    const cur = [0];
    for (let j = 1; j <= tutorWords.length; j++) cur[j] = h === tutorWords[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    prev = cur;
  }
  return prev[tutorWords.length] / heard.length;
}

/** Echo by word order only (no times): two or more words that follow the tutor's played words. */
export function echoVerdict(heard: string, tutor: string | string[], locale: Locale = "en"): "echo" | "maybe" | "no" {
  const h = foldWords(heard, locale);
  const score = echoScore(h, typeof tutor === "string" ? foldWords(tutor, locale) : tutor);
  if (h.length >= 2) return score >= 0.8 ? "echo" : "no";
  return score === 1 ? "maybe" : "no";
}

// ---- the duck / cancel / restore timeline (pure)

export type BargePhase = "idle" | "ducked" | "cancelled";

export type BargeState = {
  phase: BargePhase;
  /** When the learner's speech began (ms). */
  onsetAt: number | null;
  /** Loud frames began (ms), while they last. */
  loudSince: number | null;
};

export type BargeEvent =
  /** One microphone frame's own level (0..1), while the tutor is `playing`. */
  | { type: "frame"; level: number; at: number; playing: boolean }
  /** The recognizer heard speech begin (Flux StartOfTurn, Nova SpeechStarted). */
  | { type: "start"; at: number; playing: boolean }
  /** A recognized word: "real" interrupts; backchannels and echo don't. */
  | { type: "word"; kind: "real" | "backchannel" | "echo"; at: number }
  | { type: "tick"; at: number }
  /** The tutor's voice ended (or a new reply began): start over. */
  | { type: "reset" };

export type BargeAction = { type: "duck"; gain: number; ms: number; onsetAt: number } | { type: "cancel"; fadeMs: number; onsetAt: number } | { type: "restore"; ms: number };

export const bargeStart = (): BargeState => ({ phase: "idle", onsetAt: null, loudSince: null });

export function bargeStep(s: BargeState, e: BargeEvent): { state: BargeState; actions: BargeAction[] } {
  const duck = (onsetAt: number): { state: BargeState; actions: BargeAction[] } => ({ state: { ...s, phase: "ducked", onsetAt }, actions: [{ type: "duck", gain: DUCK_GAIN, ms: DUCK_MS, onsetAt }] });
  const cancel = (): { state: BargeState; actions: BargeAction[] } => ({ state: { ...s, phase: "cancelled", loudSince: null }, actions: [{ type: "cancel", fadeMs: CANCEL_FADE_MS, onsetAt: s.onsetAt ?? 0 }] });
  switch (e.type) {
    case "reset":
      return { state: bargeStart(), actions: [] };
    case "start":
      if (!e.playing || s.phase !== "idle") return { state: s, actions: [] };
      return duck(e.at);
    case "frame": {
      if (s.phase === "cancelled") return { state: s, actions: [] };
      const loud = e.level >= (e.playing ? LEVEL_PLAYING : LEVEL_QUIET);
      if (!loud) return { state: { ...s, loudSince: null }, actions: [] };
      const since = s.loudSince ?? e.at;
      const next = { ...s, loudSince: since };
      if (s.phase === "idle" && e.playing && e.at - since >= ONSET_MS) return { ...duck(since), state: { ...next, phase: "ducked", onsetAt: since } };
      if (s.phase === "ducked" && e.at - since >= VOICED_CANCEL_MS) return { state: { ...next, phase: "cancelled", loudSince: null }, actions: [{ type: "cancel", fadeMs: CANCEL_FADE_MS, onsetAt: s.onsetAt ?? since }] };
      return { state: next, actions: [] };
    }
    case "word":
      if (e.kind !== "real" || s.phase === "cancelled") return { state: s, actions: [] };
      if (s.phase === "idle") return { state: { ...s, phase: "cancelled", onsetAt: s.onsetAt ?? e.at }, actions: [{ type: "cancel", fadeMs: CANCEL_FADE_MS, onsetAt: s.onsetAt ?? e.at }] };
      return cancel();
    case "tick":
      if (s.phase === "ducked" && s.onsetAt != null && e.at - s.onsetAt >= RESTORE_AFTER_MS) return { state: bargeStart(), actions: [{ type: "restore", ms: RESTORE_MS }] };
      return { state: s, actions: [] };
  }
}

/** What a heard word is, for the timeline: a backchannel, the tutor's echo, or a real word. */
export function wordKind(word: HeardWord, played: PlayedWord[], soFar: string, locale: Locale = "en"): "real" | "backchannel" | "echo" {
  if (echoMarks([word], played, locale)[0]) return "echo";
  if (isBackchannel(`${soFar} ${word.word}`) || isBackchannel(word.word)) return "backchannel";
  return "real";
}
