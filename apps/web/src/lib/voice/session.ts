"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Key } from "@/i18n/en";
import { converse } from "./converse";
import { voice, voiceDisclosure, type Voice, type VoiceSetup } from "./select";
import type { ListenOptions, SpeakSource, VoiceErrorCode } from "./types";

// One hook for a screen that talks: builds the learner's voice (vendor or browser), keeps the
// microphone and the speaker in step (backchannels pass, barge-in stops the tutor) and exposes plain
// state for the UI. Nothing starts by itself: speaking and listening begin only from the caller.

export type VoiceSession = {
  /** voice() has finished choosing. */
  ready: boolean;
  canSpeak: boolean;
  canListen: boolean;
  /** Voice beyond reading aloud is allowed for this learner. */
  allowed: boolean;
  vendor: Voice["vendor"];
  /** i18n keys of the lines saying where voice goes. */
  disclosure: Key[];
  speaking: boolean;
  paused: boolean;
  listening: boolean;
  /** What the learner has said so far in this turn. */
  heard: string;
  /** Index of the word being read (for highlighting), or null. */
  word: number | null;
  error: VoiceErrorCode | null;
  say(source: SpeakSource): Promise<void>;
  pause(): void;
  resume(): void;
  /** Stop reading aloud. */
  silence(): void;
  /** Microphone on. Errors land in `error`. */
  listen(opts?: ListenOptions): Promise<void>;
  /** Microphone off; what was said becomes the turn. */
  done(): void;
  /** Microphone off; forget what was said. */
  discard(): void;
  /** Call inside the tap that leads to speech (send, read aloud, mic). */
  warm(): void;
  level(): number;
};

export type SessionOptions = Omit<VoiceSetup, "fetch"> & {
  /** The learner finished a turn. */
  onTurn: (text: string) => void;
  /** The learner talked over the tutor (its speech already stopped): stop the reply too. */
  onBargeIn?: () => void;
};

export function useVoiceSession({ locale, consent, under13, young, names, onTurn, onBargeIn }: SessionOptions): VoiceSession {
  const [v, setV] = useState<Voice | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [word, setWord] = useState<number | null>(null);
  const [error, setError] = useState<VoiceErrorCode | null>(null);
  const talk = useRef<ReturnType<typeof converse> | null>(null);
  const handlers = useRef({ onTurn, onBargeIn });
  useEffect(() => {
    handlers.current = { onTurn, onBargeIn };
  });
  const nameKey = (names ?? []).join("\u0000");

  useEffect(() => {
    let alive = true;
    let cleanup = () => {};
    void voice({ locale, consent, under13, young, names: nameKey ? nameKey.split("\u0000") : [] }).then((made) => {
      if (!alive) {
        made.out?.cancel();
        made.in?.abort();
        return;
      }
      const subs = [
        made.out?.onStart(() => setSpeaking(true)),
        made.out?.onEnd(() => (setSpeaking(false), setPaused(false), setWord(null))),
        made.out?.onBoundary((i) => setWord(i)),
        made.out?.onError((e) => setError(e.code)),
        made.in?.onPartial((t) => setHeard(t)),
        made.in?.onEndOfTurn(() => setHeard("")),
        made.in?.onError((e) => (setError(e.code), setListening(made.in?.listening ?? false))),
      ];
      const c = converse({
        input: made.in,
        output: made.out,
        onTurn: (t) => {
          setListening(made.in?.listening ?? false);
          handlers.current.onTurn(t);
        },
        onBargeIn: () => handlers.current.onBargeIn?.(),
      });
      talk.current = c;
      setV(made);
      cleanup = () => {
        c.dispose();
        subs.forEach((u) => u?.());
        made.out?.cancel();
        made.in?.abort();
        talk.current = null;
      };
    });
    return () => {
      alive = false;
      cleanup();
      setV(null);
      setSpeaking(false);
      setListening(false);
    };
  }, [locale, consent, under13, young, nameKey]);

  const say = useCallback((source: SpeakSource) => {
    setError(null);
    return talk.current?.say(source) ?? Promise.resolve();
  }, []);

  const listen = useCallback(
    async (opts?: ListenOptions) => {
      if (!v?.in) return;
      setError(null);
      setHeard("");
      setListening(true);
      try {
        await v.in.start(opts);
      } catch {
        // the error listener has already said why
      }
      setListening(v.in.listening);
    },
    [v],
  );

  return {
    ready: !!v,
    canSpeak: !!v?.out,
    canListen: !!v?.in,
    allowed: v?.allowed ?? false,
    vendor: v?.vendor ?? { out: null, in: null },
    disclosure: v ? voiceDisclosure(v) : [],
    speaking,
    paused,
    listening,
    heard,
    word,
    error,
    say,
    pause: () => {
      v?.out?.pause();
      setPaused(v?.out?.state === "paused");
    },
    resume: () => {
      v?.out?.resume();
      setPaused(false);
    },
    silence: () => v?.out?.cancel(),
    listen,
    done: () => {
      v?.in?.stop();
      setListening(false);
    },
    discard: () => {
      v?.in?.abort();
      setListening(false);
      setHeard("");
    },
    warm: () => v?.out?.warm(),
    level: () => v?.in?.level() ?? 0,
  };
}
