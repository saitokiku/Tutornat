"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Key } from "@/i18n/en";
import { familyNames } from "@/lib/ai/context";
import { currentLearner } from "@/lib/profiles";
import { scrubNames, setSpotBand, setSpotScrub } from "@/lib/spotlight";
import { useStore } from "@/lib/store";
import type { Grade, Locale } from "@/lib/types";
import { appSpeechOut, type AppSpeechOut } from "./app-out";
import { bandOf } from "./bands";
import { mayBeUnder13, voice as buildVoice, voiceDisclosure, type Voice, type VoiceSetup } from "./select";
import type { Band, SpeakOptions, SpeakSource, SpeechIn } from "./types";

// The app's voice (live tutor spec §2.7): one SpeechOut, one SpeechIn and one AudioContext per learner
// and language, built once by VoiceRoot (mounted in app/layout.tsx next to SpotlightLayer) and read
// by every screen through useAppVoice(). The first tap or key press anywhere unlocks audio, and that
// survives client-side navigation. Screens never build a voice of their own.

export type VoiceLearner = {
  /** On this device only; it keys the remembered browser voice. Never sent. */
  id: string;
  locale: Locale;
  grade: Grade;
  /** A grown-up allowed the microphone (settings.voiceInput). */
  consent: boolean;
  /** The learner's and the family's names: kept out of everything that leaves the device. Never sent. */
  names: string[];
  /** The other learners' nicknames, so "Leo, stop" is known as talk to a sibling. Never sent. */
  siblings: string[];
};

export type AppVoice = {
  /** The learner's voice is built. */
  ready: boolean;
  learner: VoiceLearner | null;
  band: Band;
  /** The app's one SpeechOut: present from the first render; speak() queues until the voice is built. */
  out: AppSpeechOut;
  in: SpeechIn | null;
  /** "A": may read by itself and hold a conversation; "B": reads only on a tap; null: text only. */
  tier: Voice["tier"];
  /** Replies and narration may be read aloud without a tap. */
  autoRead: boolean;
  /** Conversation mode may be offered. */
  conversation: boolean;
  /** No natural voice on this device: Settings shows the grown-up how to get one ("voice.tip.enhanced"). */
  tip: boolean;
  /** Where voice goes, for the disclosure under the voice controls. */
  disclosure: Key[];
  /** Audio waits for a tap: show "Tap to hear" (voice.tapToHear). */
  locked: boolean;
  /** The vendor voice failed; replies use this device's voice for now (voice.deviceVoice). */
  deviceVoice: boolean;
  /** Call from a tap or key press. Never throws. */
  warm(): void;
};

const fallbackOut = appSpeechOut();
const NOBODY: AppVoice = {
  ready: false,
  learner: null,
  band: "69",
  out: fallbackOut,
  in: null,
  tier: null,
  autoRead: false,
  conversation: false,
  tip: false,
  disclosure: [],
  locked: false,
  deviceVoice: false,
  warm: () => fallbackOut.warm(),
};

const VoiceContext = createContext<AppVoice | null>(null);

export type VoiceProviderProps = {
  learner: VoiceLearner | null;
  children: ReactNode;
  /** Tests: build the voice another way. */
  build?: (setup: VoiceSetup) => Promise<Voice>;
};

// For code that speaks outside React (components/stage/hear.tsx speakText): the mounted app voice.
let mounted: { out: AppSpeechOut; band: Band; tier: () => Voice["tier"] } | null = null;

/**
 * Speaks through the app voice from anywhere (a Hear button's click handler). False when there is no
 * voice to read with (no VoiceRoot, or only robots on this device): then nothing speaks — never a
 * second voice. `onEnd` runs when this run ends, finished or replaced.
 */
export function appSay(source: SpeakSource, opts: Omit<SpeakOptions, "band"> & { onEnd?: () => void } = {}): boolean {
  const m = mounted;
  if (!m || m.tier() == null) return false;
  const { onEnd, ...rest } = opts;
  m.out.warm();
  const run = m.out.speak(source, { kind: "hear", ...rest, band: m.band });
  if (onEnd) void run.then(onEnd);
  return true;
}

/** Stops whatever the app voice is reading (a Hear button pressed again, a sheet closing). */
export const appSilence = () => mounted?.out.cancel();

/** The app voice for one learner. VoiceRoot feeds it from the store; tests give it a learner. */
export function VoiceProvider({ learner, children, build = buildVoice }: VoiceProviderProps) {
  const out = useMemo(() => appSpeechOut(), []);
  const [v, setV] = useState<Voice | null>(null);
  const [locked, setLocked] = useState(false);
  const [deviceVoice, setDeviceVoice] = useState(false);
  const names = (learner?.names ?? []).join("\u0000");
  const band = learner ? bandOf(learner.grade) : "69";
  const key = learner ? `${learner.id}|${learner.locale}|${band}|${learner.consent}|${mayBeUnder13(learner.grade)}|${names}` : "";

  useEffect(() => {
    if (!learner) return;
    let alive = true;
    let made: Voice | null = null;
    void build({ locale: learner.locale, consent: learner.consent, under13: mayBeUnder13(learner.grade), band, names: learner.names, learner: learner.id }).then((voice) => {
      if (!alive) {
        voice.out?.dispose();
        voice.in?.abort();
        return;
      }
      made = voice;
      out.attach({ out: voice.out, deviceOut: voice.deviceOut });
      setV(voice);
    });
    return () => {
      alive = false;
      out.attach(null);
      made?.out?.dispose();
      if (made?.deviceOut !== made?.out) made?.deviceOut?.dispose();
      made?.in?.abort();
      (made?.in as { dispose?: () => void } | null)?.dispose?.();
      setV(null);
    };
    // The voice is rebuilt only when who it is for changes (key), not on every render of the learner object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, build, out]);

  useEffect(() => {
    const subs = [out.onLocked(setLocked), out.onDeviceVoice(setDeviceVoice)];
    return () => subs.forEach((u) => u());
  }, [out]);

  useEffect(() => {
    const me = { out, band, tier: () => v?.tier ?? null };
    mounted = me;
    return () => {
      if (mounted === me) mounted = null;
    };
  }, [out, band, v]);

  // The first tap or key press anywhere unlocks audio for the whole visit.
  useEffect(() => {
    const warm = () => out.warm();
    window.addEventListener("pointerdown", warm, { capture: true });
    window.addEventListener("keydown", warm, { capture: true });
    return () => {
      window.removeEventListener("pointerdown", warm, { capture: true });
      window.removeEventListener("keydown", warm, { capture: true });
    };
  }, [out]);

  const value = useMemo<AppVoice>(
    () => ({
      ready: !!v,
      learner,
      band,
      out,
      in: v?.in ?? null,
      tier: v?.tier ?? null,
      autoRead: v?.autoRead ?? false,
      conversation: v?.conversation ?? false,
      tip: v?.tip ?? false,
      disclosure: v ? voiceDisclosure(v) : [],
      locked,
      deviceVoice,
      warm: () => out.warm(),
    }),
    [v, learner, band, out, locked, deviceVoice],
  );
  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}

/** The current learner, from the store: who the app voice is for. */
function useVoiceLearner(): VoiceLearner | null {
  const me = useStore(currentLearner);
  const profiles = useStore((s) => s.profiles);
  const accounts = useStore((s) => s.accounts);
  return useMemo(() => {
    if (!me) return null;
    const family = familyNames({ profiles, accounts }, me);
    const siblings = profiles.filter((p) => p.accountId === me.accountId && p.id !== me.id).map((p) => p.nickname);
    return { id: me.id, locale: me.locale, grade: me.grade, consent: me.settings?.voiceInput === true, names: [me.nickname, ...family], siblings };
  }, [me, profiles, accounts]);
}

/**
 * Mount once, in app/layout.tsx next to SpotlightLayer. Builds the current learner's voice, and
 * tells the spotlight the learner's band and which names to keep out of what it sends.
 */
export function VoiceRoot({ children }: { children: ReactNode }) {
  const learner = useVoiceLearner();
  const names = learner?.names.join("\u0000") ?? "";
  const band = learner ? bandOf(learner.grade) : null;
  useEffect(() => {
    setSpotBand(band);
    setSpotScrub(names ? scrubNames(names.split("\u0000")) : null);
  }, [band, names]);
  return <VoiceProvider learner={learner}>{children}</VoiceProvider>;
}

/** The app's voice. Outside VoiceRoot (a test, a grown-up screen) it is a voice that never speaks. */
export function useAppVoice(): AppVoice {
  return useContext(VoiceContext) ?? NOBODY;
}

/** Inside VoiceRoot? (useVoiceSession uses the app voice there instead of building its own.) */
export const useHasAppVoice = () => useContext(VoiceContext) !== null;

export type Speaker = {
  /** Reads `source` through the app voice; anything else being read stops (a 120 ms fade). */
  speak(source: SpeakSource, opts?: Omit<SpeakOptions, "band">): void;
  stop(): void;
  /** This speaker's own run is playing (or waiting to). */
  speaking: boolean;
  /** The written word being read in this speaker's run, for the highlight; null otherwise. */
  word: number | null;
  /** There is a voice to read with. */
  canSpeak: boolean;
  /** It may read by itself (a natural voice); otherwise only when the learner taps. */
  autoRead: boolean;
};

/**
 * A Hear button, lesson narration or read-aloud: speaks through the app voice and follows only its
 * own run, so the tutor's events never move its highlight and the other way round.
 */
export function useSpeak(kind: NonNullable<SpeakOptions["kind"]> = "hear"): Speaker {
  const app = useAppVoice();
  const run = useRef<number | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [word, setWord] = useState<number | null>(null);
  useEffect(() => {
    const subs = [
      app.out.onBoundary((w, r) => r === run.current && setWord(w)),
      app.out.onEnd((_, r) => {
        if (r !== run.current) return;
        run.current = null;
        setSpeaking(false);
        setWord(null);
      }),
    ];
    return () => subs.forEach((u) => u());
  }, [app.out]);
  useEffect(
    () => () => {
      if (run.current != null) app.out.cancel();
    },
    [app.out],
  );
  const speak = useCallback(
    (source: SpeakSource, opts?: Omit<SpeakOptions, "band">) => {
      app.out.warm();
      const r = app.out.speak(source, { ...opts, kind, band: app.band });
      run.current = r.id;
      setSpeaking(true);
    },
    [app.out, app.band, kind],
  );
  const stop = useCallback(() => {
    if (run.current != null) app.out.cancel();
  }, [app.out]);
  return { speak, stop, speaking, word, canSpeak: app.tier != null, autoRead: app.autoRead };
}
