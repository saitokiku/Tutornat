"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/types";

/** One piece of narration: `key` ties it to the text on screen so the word being read can be marked. */
export type Segment = { key: string; text: string };
/**
 * Where the voice is: the segment, and the word's characters in it (start −1 until the browser says).
 * `turn` is set while a "say it with me" learner is saying that line back.
 */
export type SpeechPos = { seg: number; key: string; start: number; end: number; turn?: boolean };
export type SpeechStatus = "idle" | "playing" | "paused" | "turn";

// Only one thing reads aloud at a time. Whoever starts speaking tells the previous speaker to let go,
// so a tap-to-hear button never leaves the narration thinking it is still playing.
let release: (() => void) | null = null;
export function claimVoice(onRelease: () => void) {
  const prev = release;
  release = onRelease;
  if (prev && prev !== onRelease) prev();
}

export const voiceFor = (locale: Locale) => (typeof speechSynthesis === "undefined" ? null : (speechSynthesis.getVoices().find((v) => v.lang.startsWith(locale)) ?? null));
export const langFor = (locale: Locale) => (locale === "es" ? "es-US" : "en-US");

/** How long a learner gets to say a line back in "say it with me": time to speak it, plus a breath. */
export const turnMs = (text: string) => Math.min(9000, Math.max(2500, 1500 + text.split(/\s+/).filter(Boolean).length * 550));

/** Errors that only mean someone else took the voice (a tap-to-hear button, another tab): not a failure. */
const handedOver = (e?: { error?: string }) => e?.error === "interrupted" || e?.error === "canceled";

/** The word around character `i`, for browsers that report where a word starts but not how long it is. */
function wordEnd(text: string, i: number) {
  const m = /\S+/.exec(text.slice(i));
  return m ? i + m.index + m[0].length : text.length;
}

/**
 * Read aloud with the browser's own speech synthesis. Only ever starts from a button press, always
 * has a visible stop, and stops when the scene changes or the page goes away.
 *
 * `speak(text)` reads one text. `narrate(segments)` reads a scene piece by piece and reports the word
 * being read (speechSynthesis boundary events) so the screen can mark it; `repeat` pauses after each
 * piece for the learner to say it back, saying `cue` first ("Your turn.") so a child who can't read
 * hears that it is their turn. Pause cancels the voice and resume starts again from the word it
 * stopped on: that works the same in every browser, unlike speechSynthesis.pause(). `failed` is set
 * when the browser could not speak, so the screen can say so; the next start clears it.
 */
export function useSpeech(locale: Locale, resetKey: string) {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [pos, setPos] = useState<SpeechPos | null>(null);
  const [failed, setFailed] = useState(false);
  const segs = useRef<Segment[]>([]);
  const repeat = useRef(false);
  const cue = useRef("");
  const at = useRef<SpeechPos | null>(null);
  const token = useRef(0); // bumps on every start/stop so events from an old utterance are ignored
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const rate = useRef(0.95);

  const move = (p: SpeechPos | null) => {
    at.current = p;
    setPos(p);
  };
  const quiet = useCallback(() => {
    token.current++;
    clearTimeout(timer.current);
  }, []);
  const toIdle = useCallback(() => {
    quiet();
    setStatus("idle");
    at.current = null;
    setPos(null);
  }, [quiet]);

  const utter = (text: string, mine: number) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = langFor(locale);
    u.voice = voiceFor(locale);
    u.rate = rate.current;
    // Our own pause/stop bumps the token first, so an error here means someone else took the voice
    // or the browser gave up. Either way narration ends; a real failure is also said on screen.
    u.onerror = (e) => {
      if (mine !== token.current) return;
      toIdle();
      if (!handedOver(e)) setFailed(true);
    };
    return u;
  };

  const play = (seg: number, from: number) => {
    const list = segs.current;
    if (seg >= list.length) return toIdle();
    const text = list[seg].text.slice(from);
    if (!text.trim()) return play(seg + 1, 0);
    const mine = ++token.current;
    const u = utter(text, mine);
    u.onboundary = (e) => {
      if (mine !== token.current || (e.name && e.name !== "word")) return;
      const start = from + e.charIndex;
      move({ seg, key: list[seg].key, start, end: e.charLength ? start + e.charLength : wordEnd(list[seg].text, start) });
    };
    u.onend = () => {
      if (mine !== token.current) return;
      if (repeat.current) turn(seg);
      else play(seg + 1, 0);
    };
    claimVoice(toIdle);
    speechSynthesis.cancel();
    move({ seg, key: list[seg].key, start: -1, end: -1 });
    setStatus("playing");
    speechSynthesis.speak(u);
  };

  // The learner's turn: the line just read stays underlined with a turn mark, the cue is said, then a
  // quiet gap long enough to say the line back before the next one.
  const turn = (seg: number) => {
    const list = segs.current;
    setStatus("turn");
    move({ seg, key: list[seg].key, start: -1, end: -1, turn: true });
    const wait = () => {
      timer.current = setTimeout(() => play(seg + 1, 0), turnMs(list[seg].text));
    };
    if (!cue.current) return wait();
    const mine = ++token.current;
    const c = utter(cue.current, mine);
    c.onend = () => {
      if (mine === token.current) wait();
    };
    speechSynthesis.speak(c);
  };

  const narrate = (list: Segment[], opts: { repeat?: boolean; rate?: number; cue?: string } = {}) => {
    if (!supported || !list.length) return;
    quiet();
    setFailed(false);
    segs.current = list;
    repeat.current = !!opts.repeat;
    cue.current = opts.repeat ? (opts.cue ?? "") : "";
    rate.current = opts.rate ?? (opts.repeat ? 0.85 : 0.95);
    play(0, 0);
  };
  const speak = (text: string) => narrate([{ key: "all", text }]);

  const pause = () => {
    if (!supported || (status !== "playing" && status !== "turn")) return;
    const p = at.current;
    quiet();
    speechSynthesis.cancel();
    // Paused on a "your turn" gap: resume picks up with the next line, so that line is the one marked.
    if (status === "turn" && p) {
      const n = p.seg + 1;
      move({ seg: n, key: segs.current[n]?.key ?? "", start: -1, end: -1 });
    }
    setStatus("paused");
  };
  const resume = () => {
    if (!supported || status !== "paused") return;
    const p = at.current;
    if (!p) return play(0, 0);
    // Start again at the word it stopped on, or the start of the piece if no word was reported.
    const from = p.start > 0 ? p.start : 0;
    play(p.seg, from);
  };
  const stop = () => {
    if (supported) speechSynthesis.cancel();
    toIdle();
  };

  useEffect(() => {
    if (!supported) return;
    return () => {
      speechSynthesis.cancel();
      toIdle();
      setFailed(false);
    };
  }, [supported, resetKey, toIdle]);

  return { supported, speaking: status !== "idle", status, paused: status === "paused", failed, pos, speak, narrate, pause, resume, stop };
}
