import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sentenceEnds, useSpeakStream } from "./useVoice";

// Replies are read aloud one sentence at a time (K-2 hears short pieces and can cut in), as they stream.

const said: { text: string; lang: string }[] = [];

beforeEach(() => {
  said.length = 0;
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      lang = "";
      voice: unknown = null;
      rate = 1;
      constructor(public text: string) {}
    },
  );
  vi.stubGlobal("speechSynthesis", { speak: (u: { text: string; lang: string }) => said.push({ text: u.text, lang: u.lang }), cancel: vi.fn(), getVoices: () => [] });
});
afterEach(() => {
  cleanup(); // unmount (which cancels speech) while the fake speechSynthesis is still there
  vi.unstubAllGlobals();
});

describe("sentenceEnds", () => {
  it("finds sentence ends before spaces and line breaks, with closing quotes", () => {
    const text = "I'm the demo tutor.\nWhat do you want to learn? Tap “one.” Then";
    expect(sentenceEnds(text).map((i) => text.slice(0, i).trim().slice(-6))).toEqual(["tutor.", "learn?", "“one.”"]);
    expect(sentenceEnds("3.5 is a decimal")).toEqual([]);
  });
});

describe("useSpeakStream", () => {
  it("speaks a finished reply sentence by sentence, in the learner's language", () => {
    const { result } = renderHook(() => useSpeakStream("es", true));
    result.current.feed("a", "Soy el tutor de demostración.\n¿Sobre qué quieres aprender? Toca uno.", true);
    expect(said).toEqual([
      { text: "Soy el tutor de demostración.", lang: "es-US" },
      { text: "¿Sobre qué quieres aprender?", lang: "es-US" },
      { text: "Toca uno.", lang: "es-US" },
    ]);
  });

  it("while streaming, speaks each sentence once it ends and never twice", () => {
    const { result } = renderHook(() => useSpeakStream("en", true));
    result.current.feed("a", "Look at the", false);
    expect(said).toEqual([]);
    result.current.feed("a", "Look at the top row. Count", false);
    result.current.feed("a", "Look at the top row. Count the dots. Then", false);
    result.current.feed("a", "Look at the top row. Count the dots. Then say the number", true);
    result.current.feed("a", "Look at the top row. Count the dots. Then say the number", true);
    expect(said.map((s) => s.text)).toEqual(["Look at the top row.", "Count the dots.", "Then say the number"]);
  });

  it("stays quiet when reading aloud is off", () => {
    const { result } = renderHook(() => useSpeakStream("en", false));
    result.current.feed("a", "One. Two.", true);
    expect(said).toEqual([]);
  });
});
