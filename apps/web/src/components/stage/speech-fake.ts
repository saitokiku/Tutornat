import { act } from "@testing-library/react";
import { vi } from "vitest";

// A stand-in for the browser's speechSynthesis, for tests. It records what was spoken and lets a test
// say when the voice reaches a word or finishes; cancel() reports "interrupted" the way Chrome does.

export class FakeUtterance {
  lang = "";
  voice: unknown = null;
  rate = 1;
  onboundary: ((e: { name?: string; charIndex: number; charLength?: number }) => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  constructor(public text: string) {}
}

export function installSpeech() {
  const spoken: FakeUtterance[] = [];
  let current: FakeUtterance | null = null;
  const synth = {
    speak: vi.fn((u: FakeUtterance) => {
      spoken.push(u);
      current = u;
    }),
    cancel: vi.fn(() => {
      const u = current;
      current = null;
      u?.onerror?.({ error: "interrupted" });
    }),
    getVoices: () => [],
  };
  Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true, writable: true });
  Object.defineProperty(globalThis, "SpeechSynthesisUtterance", { value: FakeUtterance, configurable: true, writable: true });
  const last = () => spoken[spoken.length - 1];
  return {
    synth,
    spoken,
    last,
    /** The voice reaches the word starting at `charIndex` of the current utterance. */
    word: (charIndex: number, charLength?: number) => act(() => last().onboundary?.({ name: "word", charIndex, charLength })),
    /** The current utterance finishes. */
    end: () =>
      act(() => {
        const u = last();
        current = null;
        u.onend?.();
      }),
    uninstall: () => {
      delete (window as unknown as Record<string, unknown>).speechSynthesis;
      delete (globalThis as unknown as Record<string, unknown>).SpeechSynthesisUtterance;
    },
  };
}
