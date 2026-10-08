"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { onRemoteCancel } from "@/lib/remote-lifecycle";
import type { Key } from "@/i18n/en";
import { converse, type MicOffReason, type VoiceMetric } from "./converse";
import { voice, voiceDisclosure, type Voice, type VoiceSetup } from "./select";
import type { ListenOptions, SpeakSource, SpeechIn, VoiceErrorCode } from "./types";

// One hook for a screen that talks: builds the learner's voice (vendor or browser), keeps the
// microphone and the speaker in step (backchannels pass, barge-in stops the tutor, echo is set
// aside) and exposes plain state for the UI. Nothing starts by itself: speaking and listening begin
// only from the caller, and listening is push-to-talk unless the caller asks for turns: "auto".

export type VoiceSession = {
  /** voice() has finished choosing. */
  ready: boolean;
  canSpeak: boolean;
  canListen: boolean;
  /** The microphone is allowed for this learner. */
  allowed: boolean;
  /** Who is speaking and listening right now (listening moves to the browser if the vendor can't be reached). */
  vendor: Voice["vendor"];
  /** i18n keys of the lines saying where voice goes. Show them near the voice controls. */
  disclosure: Key[];
  speaking: boolean;
  paused: boolean;
  listening: boolean;
  /** What the learner has said so far in this turn. */
  heard: string;
  /** Index of the word being read (for highlighting), or null. */
  word: number | null;
  /** Why listening failed: show t(voiceErrorKey(inError)). */
  inError: VoiceErrorCode | null;
  /** Reading aloud failed and nothing took over: show t(voiceErrorKey("speak")); the reply is still on screen. */
  outError: "speak" | null;
  /** The microphone turned itself off (nobody spoke for 30 s, or the page went out of sight): show t(micOffKey(micOff)). */
  micOff: MicOffReason | null;
  /** Heard while the tutor spoke but set aside as its own voice. Offer it: "Did you say …?" + sendSetAside(). */
  setAside: string | null;
  sendSetAside(): void;
  say(source: SpeakSource): Promise<void>;
  pause(): void;
  resume(): void;
  /** Stop reading aloud. */
  silence(): void;
  /** Microphone on (push-to-talk unless opts.turns is "auto"). Errors land in inError. */
  listen(opts?: ListenOptions): Promise<void>;
  /** Microphone off; what was said becomes the turn. */
  done(): void;
  /** Microphone off; forget what was said. */
  discard(): void;
  /** Call inside the tap that leads to speech (send, read aloud, mic). Never throws. */
  warm(): void;
  /** Input level 0..1, or null when the recognizer can't measure it (hide the meter). */
  level(): number | null;
};

export type SessionOptions = Omit<VoiceSetup, "fetch"> & {
  /** The learner finished a turn. */
  onTurn: (text: string) => void;
  /** The learner talked over the tutor, or answered while the reply was on its way (its speech already stopped): stop the reply too. */
  onBargeIn?: () => void;
  /** Voice timings, for the quality bars (first audio < 1.5 s; barge-in ≈ 300 ms). */
  onMetric?: (m: VoiceMetric) => void;
};

export function useVoiceSession({ locale, consent, under13, young, names, onTurn, onBargeIn, onMetric }: SessionOptions): VoiceSession {
  const [v, setV] = useState<Voice | null>(null);
  const [inKind, setInKind] = useState<SpeechIn["kind"] | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [word, setWord] = useState<number | null>(null);
  const [inError, setInError] = useState<VoiceErrorCode | null>(null);
  const [outError, setOutError] = useState<"speak" | null>(null);
  const [micOff, setMicOff] = useState<MicOffReason | null>(null);
  const [setAside, setSetAside] = useState<string | null>(null);
  const talk = useRef<ReturnType<typeof converse> | null>(null);
  const handlers = useRef({ onTurn, onBargeIn, onMetric });
  useEffect(() => {
    handlers.current = { onTurn, onBargeIn, onMetric };
  });
  const nameKey = (names ?? []).join("\u0000");

  useEffect(() => {
    let alive = true;
    let cleanup = () => {};
    const nameList = nameKey ? nameKey.split("\u0000") : [];
    void voice({ locale, consent, under13, young, names: nameList }).then((made) => {
      if (!alive) {
        made.out?.dispose();
        made.in?.abort();
        return;
      }
      const subs = [
        made.out?.onStart(() => setSpeaking(true)),
        made.out?.onEnd(() => (setSpeaking(false), setPaused(false), setWord(null))),
        made.out?.onBoundary((i) => setWord(i)),
        made.out?.onError(() => setOutError("speak")),
        made.in?.onPartial((t) => setHeard(t)),
        made.in?.onEndOfTurn(() => setHeard("")),
        made.in?.onError((e) => {
          setInError(e.code);
          setListening(made.in?.listening ?? false);
          setInKind(made.in?.kind ?? null);
        }),
      ];
      const c = converse({
        input: made.in,
        output: made.out,
        locale,
        names: nameList,
        onTurn: (t) => {
          setSetAside(null);
          setListening(made.in?.listening ?? false);
          handlers.current.onTurn(t);
        },
        onBargeIn: () => handlers.current.onBargeIn?.(),
        onEcho: (t) => setSetAside(t),
        onMicOff: (why) => {
          setListening(false);
          setHeard("");
          setMicOff(why);
        },
        onMetric: (m) => handlers.current.onMetric?.(m),
      });
      talk.current = c;
      setV(made);
      const stopRemote = onRemoteCancel(() => {
        c.dispose(); made.out?.cancel(); made.in?.abort();
        setSpeaking(false); setListening(false); setHeard(""); setWord(null);
        handlers.current.onBargeIn?.();
      });
      cleanup = () => {
        stopRemote();
        c.dispose();
        subs.forEach((u) => u?.());
        made.out?.dispose();
        made.in?.abort();
        talk.current = null;
      };
    });
    return () => {
      alive = false;
      cleanup();
      setV(null);
      setInKind(null);
      setSpeaking(false);
      setListening(false);
    };
  }, [locale, consent, under13, young, nameKey]);

  const say = useCallback((source: SpeakSource) => {
    setOutError(null);
    return talk.current?.say(source) ?? Promise.resolve();
  }, []);

  const listen = useCallback(
    async (opts?: ListenOptions) => {
      if (!v?.in) return;
      setInError(null);
      setMicOff(null);
      setHeard("");
      setListening(true);
      talk.current?.listening();
      try {
        await v.in.start(opts);
      } catch {
        // the error listener has already said why
      }
      setListening(v.in.listening);
      setInKind(v.in.kind);
    },
    [v],
  );

  const vendor: Voice["vendor"] = { out: v?.out?.kind ?? null, in: v?.in ? (inKind ?? v.in.kind) : null };
  return {
    ready: !!v,
    canSpeak: !!v?.out,
    canListen: !!v?.in,
    allowed: v?.allowed ?? false,
    vendor,
    disclosure: v ? voiceDisclosure({ vendor, allowed: v.allowed }) : [],
    speaking,
    paused,
    listening,
    heard,
    word,
    inError,
    outError,
    micOff,
    setAside,
    sendSetAside: () => {
      if (!setAside) return;
      setSetAside(null);
      handlers.current.onTurn(setAside);
    },
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
    warm: () => {
      try {
        v?.out?.warm();
      } catch {}
    },
    level: () => (v?.in ? v.in.level() : null),
  };
}
