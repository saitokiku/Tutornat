"use client";

import { createContext, useContext, useState } from "react";
import { IconSpeaker } from "@/components/icons";
import { useT } from "@/i18n";
import type { Locale } from "@/lib/types";
import { claimVoice, langFor, voiceFor } from "./useSpeech";

/**
 * Stage-wide reading support: `hear` shows tap-to-hear buttons, `young` uses larger type (K–2), and
 * `big` makes every control a 56px target (the lesson stage sets it for K–2; other screens keep 44px).
 */
export const HearContext = createContext<{ hear: boolean; young: boolean; locale: Locale; big?: boolean }>({ hear: false, young: false, locale: "en" });
export const useHear = () => useContext(HearContext);

/** K–2 primary actions are 56px tall; everyone else gets the standard 44px button. */
export const bigButton = (young: boolean) => (young ? "min-h-14 px-7 text-body" : "");

/** Pieces joined into sentences to read aloud: "Seed" and "Not here yet" → "Seed. Not here yet." */
export const sentences = (...parts: string[]) =>
  parts
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => (/[.!?…:]$/.test(p) ? p : `${p}.`))
    .join(" ");

const noop = () => {};

export function speakText(text: string, locale: Locale, onEnd?: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  claimVoice(onEnd ?? noop);
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = langFor(locale);
  u.voice = voiceFor(locale);
  u.rate = 0.9;
  u.onend = u.onerror = () => onEnd?.();
  speechSynthesis.speak(u);
  return true;
}

/** A speaker button that reads one piece of text. Renders nothing when tap-to-hear is off. */
export function Hear({ text, className = "" }: { text: string; className?: string }) {
  const t = useT();
  const { hear, locale, big } = useHear();
  const [on, setOn] = useState(false);
  if (!hear || !text) return null;
  return (
    <button
      type="button"
      aria-label={`${t("stage.readAloud")}: ${text.slice(0, 60)}`}
      aria-pressed={on}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (speakText(text, locale, () => setOn(false))) setOn(true);
      }}
      className={`inline-grid shrink-0 place-items-center rounded-full border transition-colors ${big ? "size-14" : "size-11"} ${
        on ? "border-accent bg-accent/10 text-accent" : "border-border bg-panel text-muted hover:border-ink/30 hover:text-ink"
      } ${className}`}
    >
      <IconSpeaker size={big ? 22 : 18} />
    </button>
  );
}
