import { afterEach, describe, expect, it, vi } from "vitest";
import { emptyTurn, nextCheckAt, shapeOf, stepTurn, TURN_DEFAULT, TURN_MANUAL, TURN_YOUNG, turnTracker, type TurnEvent, type TurnOptions, type TurnState } from "./turn";

/** Runs events in order; returns the turns that ended and when. */
function run(events: TurnEvent[], o: TurnOptions = TURN_DEFAULT) {
  let s: TurnState = emptyTurn();
  const ends: { at: number; text: string }[] = [];
  for (const e of events) {
    const r = stepTurn(s, e, o);
    s = r.state;
    if (r.end) ends.push({ at: e.at, text: r.end });
  }
  return { ends, state: s };
}

/** Ticks every 100 ms from `from` to `to`. */
const ticks = (from: number, to: number): TurnEvent[] => Array.from({ length: Math.floor((to - from) / 100) + 1 }, (_, i) => ({ type: "tick", at: from + i * 100 }));

describe("how a turn ends", () => {
  it("reads the shape of the words", () => {
    expect(shapeOf("")).toBe("empty");
    expect(shapeOf("um")).toBe("filler");
    expect(shapeOf("Uh, hmm.")).toBe("filler");
    expect(shapeOf("It's 12.")).toBe("done");
    expect(shapeOf("Is it 12?")).toBe("done");
    expect(shapeOf("it's 12")).toBe("open");
    expect(shapeOf("I think it's, um")).toBe("hold");
    expect(shapeOf("I think it's um.")).toBe("hold");
    expect(shapeOf("you add the top and")).toBe("hold");
    expect(shapeOf("so first,")).toBe("hold");
    expect(shapeOf("then...")).toBe("hold");
    expect(shapeOf("es tres y")).toBe("hold");
    expect(shapeOf("Me too.")).toBe("done");
  });

  it("ends soon after words that sound finished", () => {
    const { ends } = run([{ type: "partial", text: "it's", at: 0 }, { type: "final", text: "It's 12.", at: 400, speechFinal: true }, ...ticks(500, 1500)]);
    expect(ends).toEqual([{ at: 1100, text: "It's 12." }]);
  });

  it("waits longer when there's no ending punctuation", () => {
    const { ends } = run([{ type: "final", text: "it's 12", at: 0, speechFinal: true }, ...ticks(100, 2000)]);
    expect(ends).toEqual([{ at: 1400, text: "it's 12" }]);
  });

  it("holds the floor after um, and, or a comma — the learner is still thinking", () => {
    const { ends } = run([{ type: "final", text: "I think it's, um", at: 0, speechFinal: true }, ...ticks(100, 3500)]);
    expect(ends).toEqual([{ at: 3000, text: "I think it's, um" }]);
  });

  it("keeps going when the learner picks up again after a pause", () => {
    const { ends } = run([
      { type: "final", text: "you add the top and", at: 0, speechFinal: true },
      ...ticks(100, 2000),
      { type: "speech-start", at: 2100 },
      { type: "partial", text: "the bottom", at: 2300 },
      { type: "final", text: "the bottom stays.", at: 2600, speechFinal: true },
      ...ticks(2700, 4000),
    ]);
    expect(ends).toEqual([{ at: 3300, text: "you add the top and the bottom stays." }]);
  });

  it("ends right away on the recognizer's utterance end after finished words", () => {
    const { ends } = run([{ type: "final", text: "Twelve.", at: 0, speechFinal: false }, { type: "utterance-end", at: 300 }]);
    expect(ends).toEqual([{ at: 300, text: "Twelve." }]);
  });

  it("does not end while the recognizer says speech goes on, except as a safety net", () => {
    const { ends } = run([{ type: "speech-start", at: 0 }, { type: "final", text: "It's 12.", at: 200, speechFinal: false }, ...ticks(300, 3300)]);
    expect(ends).toEqual([{ at: 3200, text: "It's 12." }]);
  });

  it("never makes a turn out of filler alone", () => {
    const { ends, state } = run([{ type: "final", text: "um", at: 0, speechFinal: true }, ...ticks(100, 5000)]);
    expect(ends).toEqual([]);
    expect(state.finals).toEqual([]);
  });

  it("gives young learners more time", () => {
    const { ends } = run([{ type: "final", text: "It's 12.", at: 0, speechFinal: true }, ...ticks(100, 3000)], TURN_YOUNG);
    expect(ends).toEqual([{ at: 1100, text: "It's 12." }]);
  });

  it("never ends by itself in push-to-talk", () => {
    const { ends } = run([{ type: "final", text: "It's 12.", at: 0, speechFinal: true }, { type: "utterance-end", at: 1000 }, ...ticks(1100, 20000)], TURN_MANUAL);
    expect(ends).toEqual([]);
  });

  it("says when to look again", () => {
    expect(nextCheckAt(emptyTurn(), TURN_DEFAULT)).toBeNull();
    const s = stepTurn(emptyTurn(), { type: "final", text: "It's 12.", at: 1000, speechFinal: true }, TURN_DEFAULT).state;
    expect(nextCheckAt(s, TURN_DEFAULT)).toBe(1700);
    expect(nextCheckAt(s, TURN_MANUAL)).toBeNull();
  });
});

describe("turn tracker", () => {
  afterEach(() => vi.useRealTimers());

  it("ends a turn by itself when the silence is long enough", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const onEnd = vi.fn();
    const t = turnTracker({ options: TURN_DEFAULT, onEnd });
    t.feed({ type: "final", text: "It's 12.", at: Date.now(), speechFinal: true });
    vi.advanceTimersByTime(600);
    expect(onEnd).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(onEnd).toHaveBeenCalledWith("It's 12.");
  });

  it("flush returns the turn now and drops filler-only talk", () => {
    const t = turnTracker({ options: TURN_MANUAL, onEnd: vi.fn() });
    t.feed({ type: "final", text: "um", at: 0 });
    expect(t.flush()).toBe("");
    t.feed({ type: "final", text: "three", at: 0 });
    t.feed({ type: "partial", text: "fourths", at: 10 });
    expect(t.text()).toBe("three fourths");
    expect(t.flush()).toBe("three fourths");
    expect(t.text()).toBe("");
  });
});
