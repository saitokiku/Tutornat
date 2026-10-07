"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/types";

// Voice for the tutor with what the browser already has: speech synthesis to read replies (sentence by
// sentence, as they stream) and speech recognition to talk (push to talk). Recognition is offered only
// when a grown-up allowed it; the browser may send audio to Apple or Google, and Settings says so.

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

const SpeechRec = () =>
  typeof window === "undefined" ? undefined : ((window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: new () => Recognition }).webkitSpeechRecognition);

const lang = (l: Locale) => (l === "es" ? "es-US" : "en-US");

/** Reads text aloud as it streams: each finished sentence is queued once. */
export function useSpeakStream(locale: Locale, enabled: boolean) {
  const spoken = useRef(new Map<string, number>());
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const feed = useCallback(
    (id: string, text: string, done: boolean) => {
      if (!enabled || !supported) return;
      const from = spoken.current.get(id) ?? 0;
      const rest = text.slice(from);
      // Speak up to the last sentence end; the rest waits for more text (or the end of the reply).
      const m = done ? rest.length : Math.max(rest.lastIndexOf(". "), rest.lastIndexOf("? "), rest.lastIndexOf("! ")) + 1;
      if (m <= 0) return;
      const chunk = rest.slice(0, m).trim();
      spoken.current.set(id, from + m);
      if (!chunk) return;
      const u = new SpeechSynthesisUtterance(chunk);
      u.lang = lang(locale);
      u.voice = speechSynthesis.getVoices().find((v) => v.lang.startsWith(locale)) ?? null;
      u.rate = 0.95;
      speechSynthesis.speak(u);
    },
    [enabled, supported, locale],
  );
  const stop = useCallback(() => supported && speechSynthesis.cancel(), [supported]);
  useEffect(() => () => {
    if (supported) speechSynthesis.cancel();
  }, [supported]);
  return { feed, stop, supported };
}

export function useListen(locale: Locale, onFinal: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [partial, setPartial] = useState("");
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  const finalRef = useRef(onFinal);
  useEffect(() => {
    finalRef.current = onFinal;
  });
  const supported = !!SpeechRec();

  const start = useCallback(() => {
    const R = SpeechRec();
    if (!R) return;
    if (typeof window !== "undefined" && "speechSynthesis" in window) speechSynthesis.cancel(); // barge in: stop talking, start listening
    const r = new R();
    r.lang = lang(locale);
    r.interimResults = true;
    r.continuous = false;
    let text = "";
    r.onresult = (e) => {
      text = Array.from(e.results).map((x) => x[0].transcript).join(" ");
      setPartial(text);
    };
    r.onerror = (e) => setError(e.error);
    r.onend = () => {
      setListening(false);
      setPartial("");
      if (text.trim()) finalRef.current(text.trim());
    };
    rec.current = r;
    setError(null);
    setListening(true);
    r.start();
  }, [locale]);
  const stop = useCallback(() => rec.current?.stop(), []);
  useEffect(() => () => rec.current?.abort(), []);
  return { supported, listening, partial, error, start, stop };
}
