"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/types";

/**
 * Read aloud with the browser's own speech synthesis. Only ever starts from a button press, always
 * has a visible stop, and stops when the scene changes or the page goes away.
 */
export function useSpeech(locale: Locale, resetKey: string) {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (!supported) return;
    return () => {
      speechSynthesis.cancel();
      setSpeaking(false);
    };
  }, [supported, resetKey]);

  const speak = (text: string) => {
    if (!supported) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = locale === "es" ? "es-US" : "en-US";
    u.voice = speechSynthesis.getVoices().find((v) => v.lang.startsWith(locale)) ?? null;
    u.rate = 0.95;
    u.onend = u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    speechSynthesis.speak(u);
  };
  const stop = () => {
    if (supported) speechSynthesis.cancel();
    setSpeaking(false);
  };
  return { supported, speaking, speak, stop };
}
