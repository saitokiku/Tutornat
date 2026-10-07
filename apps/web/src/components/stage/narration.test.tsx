import { act, cleanup, render, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { QuizQuestion, SlideScene } from "@/lib/types";
import { sentences, speakText } from "./hear";
import { NarrationContext, orderBlocks, quizSpeech, repeatSegments, slideSegments, Spoken } from "./narration";
import { installSpeech } from "./speech-fake";
import { turnMs, useSpeech } from "./useSpeech";

const slide: SlideScene = {
  id: "s1",
  kind: "slide",
  title: "Half is lit",
  blocks: [
    { type: "text", text: "Sunlight lights half the Moon." },
    { type: "visual", visual: { kind: "moon", phase: 0.25 }, alt: "A first quarter moon." },
    { type: "points", items: ["Waxing grows.", "Waning shrinks."] },
  ],
};

describe("narration segments", () => {
  it("reads a slide piece by piece in screen order; K–2 hears the picture first", () => {
    expect(slideSegments(slide, false).map((s) => s.key)).toEqual(["title", "b0", "v1", "b2.0", "b2.1"]);
    expect(slideSegments(slide, true).map((s) => s.key)).toEqual(["title", "v1", "b0", "b2.0", "b2.1"]);
    expect(repeatSegments(slide, true).map((s) => s.text)).toEqual(["Half is lit", "Sunlight lights half the Moon.", "Waxing grows.", "Waning shrinks."]);
  });

  it("K–2 moves only the first picture up; a later one stays by its words", () => {
    const blocks = [...slide.blocks, { type: "visual" as const, visual: { kind: "moon" as const, phase: 0.5 }, alt: "Full." }];
    expect(orderBlocks(blocks, true).map((x) => x.i)).toEqual([1, 0, 2, 3]);
    expect(orderBlocks(blocks, false).map((x) => x.i)).toEqual([0, 1, 2, 3]);
    expect(orderBlocks([{ type: "text", text: "Only words." }], true).map((x) => x.i)).toEqual([0]);
  });

  it("places a quiz question's prompt and choices inside one spoken piece", () => {
    const q: QuizQuestion = { id: "q", prompt: "Which?", choices: ["Red", "Blue"], answer: 0, hint: "", explain: "" };
    const s = quizSpeech(q);
    expect(s.text).toBe("Which? 1. Red. 2. Blue.");
    expect(s.text.slice(s.choices[1], s.choices[1] + 4)).toBe("Blue");
  });

  it("joins pieces into sentences to read aloud", () => {
    expect(sentences("Seed", "Not here yet")).toBe("Seed. Not here yet.");
    expect(sentences("Ana waters the seed.", "Sorted right")).toBe("Ana waters the seed. Sorted right.");
    expect(sentences("Is it?", "", "Yes")).toBe("Is it? Yes.");
  });

  it("gives a learner time to say a line back, more for longer lines", () => {
    expect(turnMs("Hi")).toBe(2500);
    expect(turnMs("one two three four five six seven eight")).toBeGreaterThan(turnMs("one two three"));
    expect(turnMs("word ".repeat(40))).toBe(9000);
  });
});

describe("Spoken", () => {
  const at = (key: string, start: number, end = start + 1) => ({ seg: 0, key, start, end });

  it("marks the word the voice is on, and only in its own piece", () => {
    const { container, rerender } = render(
      <NarrationContext.Provider value={at("b0", 9)}>
        <Spoken k="b0" text="Sunlight lights half the Moon." />
        <Spoken k="b1" text="Other text." />
      </NarrationContext.Provider>,
    );
    expect(container.querySelector("[data-spoken=word]")?.textContent).toBe("lights");
    expect(container.textContent).toBe("Sunlight lights half the Moon.Other text.");
    // A boundary that lands on the space before a word marks that word.
    rerender(
      <NarrationContext.Provider value={at("b0", 15)}>
        <Spoken k="b0" text="Sunlight lights half the Moon." />
      </NarrationContext.Provider>,
    );
    expect(container.querySelector("[data-spoken=word]")?.textContent).toBe("half");
  });

  it("with reduced motion the mark is a still underline", () => {
    const { container } = render(
      <NarrationContext.Provider value={at("b0", 0)}>
        <Spoken k="b0" text="Look here" />
      </NarrationContext.Provider>,
    );
    const cls = container.querySelector("[data-spoken=word]")!.className;
    expect(cls).toContain("motion-reduce:underline");
    expect(cls).toContain("motion-reduce:bg-transparent");
    expect(cls).not.toMatch(/motion-reduce:transition|animate-/);
  });

  it("on a say-it-with-me turn the line stays underlined with a speaking mark", () => {
    const { container } = render(
      <NarrationContext.Provider value={{ seg: 0, key: "b0", start: -1, end: -1, turn: true }}>
        <Spoken k="b0" text="Look here" />
      </NarrationContext.Provider>,
    );
    expect(container.querySelector("[data-spoken=segment]")?.textContent).toBe("Look here");
    expect(container.querySelector("[data-spoken=turn]")).toHaveAttribute("aria-hidden", "true");
  });

  it("underlines the whole piece until the browser reports words", () => {
    const { container } = render(
      <NarrationContext.Provider value={at("b0", -1)}>
        <Spoken k="b0" text="Look here" />
      </NarrationContext.Provider>,
    );
    expect(container.querySelector("[data-spoken=segment]")?.textContent).toBe("Look here");
  });

  it("finds its own words inside a longer piece by offset", () => {
    // "Which? 1. Red. 2. Light blue."
    const choices = (start: number) =>
      render(
        <NarrationContext.Provider value={at("quiz", start)}>
          <Spoken k="quiz" text="Which?" offset={0} />
          <Spoken k="quiz" text="Red" offset={10} />
          <Spoken k="quiz" text="Light blue" offset={18} />
        </NarrationContext.Provider>,
      ).container;
    expect([...choices(24).querySelectorAll("[data-spoken=word]")].map((e) => e.textContent)).toEqual(["blue"]);
    expect([...choices(10).querySelectorAll("[data-spoken=word]")].map((e) => e.textContent)).toEqual(["Red"]);
    expect(choices(15).querySelectorAll("[data-spoken=word]")).toHaveLength(0); // the "2." between choices
  });
});

describe("useSpeech", () => {
  let fake: ReturnType<typeof installSpeech>;
  beforeEach(() => {
    fake = installSpeech();
  });
  afterEach(() => {
    cleanup(); // unmount while the fake voice still exists
    fake.uninstall();
    vi.useRealTimers();
  });
  const segs = [
    { key: "title", text: "Half is lit" },
    { key: "b0", text: "Sunlight lights half the Moon." },
  ];

  it("keeps the old API: speak a text, stop it", () => {
    const { result } = renderHook(() => useSpeech("en", "a"));
    expect(result.current.supported).toBe(true);
    act(() => result.current.speak("Hello there"));
    expect(fake.last().text).toBe("Hello there");
    expect(fake.last().lang).toBe("en-US");
    expect(result.current.speaking).toBe(true);
    act(() => result.current.stop());
    expect(result.current.speaking).toBe(false);
  });

  it("narrates piece by piece and reports the word being read", () => {
    const { result } = renderHook(() => useSpeech("es", "a"));
    act(() => result.current.narrate(segs));
    expect(fake.last().text).toBe("Half is lit");
    expect(fake.last().lang).toBe("es-US");
    fake.word(5, 2);
    expect(result.current.pos).toEqual({ seg: 0, key: "title", start: 5, end: 7 });
    fake.end();
    expect(fake.last().text).toBe("Sunlight lights half the Moon.");
    fake.word(9); // no length reported: the word runs to the next space
    expect(result.current.pos).toEqual({ seg: 1, key: "b0", start: 9, end: 15 });
    fake.end();
    expect(result.current.status).toBe("idle");
    expect(result.current.pos).toBeNull();
  });

  it("pause stops the voice and resume starts again at the word it stopped on", () => {
    const { result } = renderHook(() => useSpeech("en", "a"));
    act(() => result.current.narrate(segs));
    fake.end();
    fake.word(16, 4); // "half"
    act(() => result.current.pause());
    expect(result.current.status).toBe("paused");
    expect(result.current.pos?.start).toBe(16);
    expect(fake.synth.cancel).toHaveBeenCalled();
    act(() => result.current.resume());
    expect(fake.last().text).toBe("half the Moon.");
    // Boundaries after resuming still point into the whole piece.
    fake.word(5, 3);
    expect(result.current.pos).toMatchObject({ key: "b0", start: 21, end: 24 });
  });

  it("says it with me: waits for the learner after each line, then goes on", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useSpeech("en", "a"));
    act(() => result.current.narrate(segs, { repeat: true }));
    expect(fake.last().rate).toBeLessThan(0.95);
    fake.end();
    expect(result.current.status).toBe("turn");
    expect(fake.spoken).toHaveLength(1);
    act(() => void vi.advanceTimersByTime(turnMs("Half is lit")));
    expect(result.current.status).toBe("playing");
    expect(fake.last().text).toBe("Sunlight lights half the Moon.");
    // Pausing during a turn resumes with the next line.
    fake.end();
    act(() => result.current.pause());
    act(() => void vi.advanceTimersByTime(20_000));
    expect(result.current.status).toBe("paused");
    act(() => result.current.resume());
    expect(result.current.status).toBe("idle"); // that was the last line
  });

  it("says the cue before each turn, and a pause in a turn marks the line that comes next", () => {
    vi.useFakeTimers();
    const three = [...segs, { key: "b1", text: "Waxing grows." }];
    const { result } = renderHook(() => useSpeech("en", "a"));
    act(() => result.current.narrate(three, { repeat: true, cue: "Your turn." }));
    fake.end(); // the first line
    expect(fake.last().text).toBe("Your turn.");
    expect(result.current.status).toBe("turn");
    expect(result.current.pos).toMatchObject({ key: "title", start: -1, turn: true });
    // The gap starts once the cue is said.
    act(() => void vi.advanceTimersByTime(20_000));
    expect(fake.last().text).toBe("Your turn.");
    fake.end(); // the cue
    act(() => void vi.advanceTimersByTime(turnMs("Half is lit")));
    expect(fake.last().text).toBe("Sunlight lights half the Moon.");
    fake.end();
    fake.end(); // its cue
    act(() => result.current.pause());
    expect(result.current.pos).toMatchObject({ seg: 2, key: "b1", start: -1 });
    expect(result.current.pos?.turn).toBeUndefined();
    act(() => result.current.resume());
    expect(fake.last().text).toBe("Waxing grows.");
  });

  it("stops when another voice takes over, or the scene changes", () => {
    const { result, rerender } = renderHook(({ k }) => useSpeech("en", k), { initialProps: { k: "a" } });
    act(() => result.current.narrate(segs));
    act(() => void speakText("Tap to hear", "en"));
    expect(result.current.status).toBe("idle");
    act(() => result.current.narrate(segs));
    rerender({ k: "b" });
    expect(result.current.status).toBe("idle");
  });

  it("an error from the browser ends narration and says so; the next start clears it", () => {
    const { result } = renderHook(() => useSpeech("en", "a"));
    act(() => result.current.narrate(segs));
    act(() => fake.last().onerror?.({ error: "synthesis-failed" }));
    expect(result.current.status).toBe("idle");
    expect(result.current.failed).toBe(true);
    act(() => result.current.narrate(segs));
    expect(result.current.failed).toBe(false);
    // Another voice taking over is not a failure.
    act(() => fake.last().onerror?.({ error: "interrupted" }));
    expect(result.current.status).toBe("idle");
    expect(result.current.failed).toBe(false);
  });

  it("without speechSynthesis, nothing is offered", () => {
    fake.uninstall();
    const { result } = renderHook(() => useSpeech("en", "a"));
    expect(result.current.supported).toBe(false);
    act(() => result.current.narrate(segs));
    expect(result.current.status).toBe("idle");
  });
});
