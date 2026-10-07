"use client";

import { createContext, useContext, useState } from "react";
import { IconSpeaker } from "@/components/icons";
import { useT } from "@/i18n";
import type { Locale } from "@/lib/types";

/** Stage-wide reading support: `hear` shows tap-to-hear buttons, `young` uses larger type (K–2). */
export const HearContext = createContext<{ hear: boolean; young: boolean; locale: Locale }>({ hear: false, young: false, locale: "en" });
export const useHear = () => useContext(HearContext);

export function speakText(text: string, locale: Locale, onEnd?: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = locale === "es" ? "es-US" : "en-US";
  u.voice = speechSynthesis.getVoices().find((v) => v.lang.startsWith(locale)) ?? null;
  u.rate = 0.9;
  u.onend = u.onerror = () => onEnd?.();
  speechSynthesis.speak(u);
  return true;
}

/** A speaker button that reads one piece of text. Renders nothing when tap-to-hear is off. */
export function Hear({ text, className = "" }: { text: string; className?: string }) {
  const t = useT();
  const { hear, locale } = useHear();
  const [on, setOn] = useState(false);
  if (!hear) return null;
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
      className={`inline-grid size-10 shrink-0 place-items-center rounded-full border transition-colors ${
        on ? "border-accent bg-accent/10 text-accent" : "border-border bg-panel text-muted hover:border-ink/30 hover:text-ink"
      } ${className}`}
    >
      <IconSpeaker size={18} />
    </button>
  );
}
