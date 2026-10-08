import { describe, expect, it } from "vitest";
import { isBackchannel } from "./backchannel";
import { bargeStart, bargeStep, echoByTime, echoMarks, foldWords, type BargeEvent, type BargeState } from "./bargein";
import type { HeardWord } from "./types";

const heard = (word: string, start: number): HeardWord => ({ word, start, end: start + 250, confidence: 0.9 });

function run(events: BargeEvent[], s: BargeState = bargeStart()) {
  const actions: { at: number; type: string; gain?: number; ms?: number; fadeMs?: number }[] = [];
  for (const e of events) {
    const r = bargeStep(s, e);
    s = r.state;
    const at = "at" in e ? e.at : -1;
    for (const a of r.actions) actions.push({ at, ...a });
  }
  return { actions, state: s };
}

const frames = (from: number, to: number, level: number, playing = true): BargeEvent[] => Array.from({ length: Math.floor((to - from) / 40) + 1 }, (_, i) => ({ type: "frame", level, at: from + i * 40, playing }));

describe("echo by time", () => {
  const played = [
    { word: "is", at: 1000 },
    { word: "it", at: 1200 },
    { word: "three", at: 1400 },
    { word: "fourths", at: 1650 },
  ];

  it("Flux words, timed only by their window, are judged by the window and their order, not by evenly spread times", () => {
    const tutor = [
      { word: "which", at: 1000 },
      { word: "part", at: 1250 },
      { word: "is", at: 1500 },
      { word: "tricky", at: 1700 },
    ];
    const win = (word: string): HeardWord => ({ word, start: 1000, end: 2600, confidence: 0.9, coarse: true });
    expect(echoByTime(["which", "part", "is", "tricky"].map(win), tutor)).toBe("echo");
    // The same words in another order are the learner talking.
    expect(echoByTime(["tricky", "is", "which", "part"].map(win), tutor)).toBe("no");
    // And words the tutor didn't play in that window are not echo.
    expect(echoByTime(["which", "part", "is", "tricky"].map((x) => ({ ...win(x), start: 4000, end: 5000 })), tutor)).toBe("no");
  });

  it("a word heard within ±400 ms of the same word played is echo; the same word 700 ms later is not", () => {
    expect(echoMarks([heard("three", 1700)], played)).toEqual([true]);
    expect(echoMarks([heard("three", 2100)], played)).toEqual([false]);
    expect(echoMarks([heard("two", 1400)], played)).toEqual([false]);
  });

  it("folds numbers the way the voice said them: '3/4' heard is 'three fourths' played", () => {
    expect(foldWords("3/4")).toEqual(["three", "fourths"]);
    expect(echoMarks([heard("3/4", 1500)], played)).toEqual([true]);
    expect(foldWords("tres cuartos", "es")).toEqual(["tres", "cuartos"]);
  });

  it("an answer that repeats the tutor's words a second after it asked is not echo", () => {
    const q = [
      { word: "is", at: 0 },
      { word: "it", at: 200 },
      { word: "the", at: 400 },
      { word: "top", at: 600 },
      { word: "number", at: 800 },
      { word: "or", at: 1100 },
      { word: "the", at: 1300 },
      { word: "bottom", at: 1500 },
      { word: "number", at: 1700 },
    ];
    // Heard while it played (the speakers coming back): echo.
    expect(echoByTime([heard("the", 1350), heard("bottom", 1550), heard("number", 1750)], q)).toBe("echo");
    // Said a second after the question ended: an answer.
    expect(echoByTime([heard("The", 2900), heard("bottom", 3100), heard("number.", 3300)], q)).toBe("no");
  });
});

describe("the barge-in timeline", () => {
  it("ducks within 150 ms of the onset, when the level has held for 120 ms", () => {
    const { actions } = run(frames(0, 200, 0.6));
    expect(actions[0]).toMatchObject({ type: "duck", gain: 0.3, ms: 80 });
    expect(actions[0].at).toBeLessThanOrEqual(150);
  });

  it("ducks at once on the recognizer's start of speech", () => {
    const { actions } = run([{ type: "start", at: 100, playing: true }]);
    expect(actions).toEqual([{ at: 100, type: "duck", gain: 0.3, ms: 80, onsetAt: 100 }]);
  });

  it("is quieter when the tutor isn't playing: 0.33 is enough there", () => {
    expect(run(frames(0, 200, 0.4, true)).actions).toEqual([]);
    expect(bargeStep(bargeStart(), { type: "frame", level: 0.4, at: 0, playing: false }).state.loudSince).toBe(0);
  });

  it("cancels with a 120 ms fade on the first real word", () => {
    const { actions, state } = run([{ type: "start", at: 0, playing: true }, { type: "word", kind: "backchannel", at: 300 }, { type: "word", kind: "echo", at: 350 }, { type: "word", kind: "real", at: 400 }]);
    expect(actions.map((a) => a.type)).toEqual(["duck", "cancel"]);
    expect(actions[1]).toMatchObject({ fadeMs: 120, at: 400 });
    expect(state.phase).toBe("cancelled");
  });

  it("cancels after 700 ms of continuous voice, even with no word yet", () => {
    const { actions } = run(frames(0, 900, 0.7));
    expect(actions.map((a) => a.type)).toEqual(["duck", "cancel"]);
    expect(actions[1].at).toBeGreaterThanOrEqual(700);
    expect(actions[1].at).toBeLessThan(800);
  });

  it("restores over 250 ms when nothing follows within 800 ms", () => {
    const { actions, state } = run([{ type: "start", at: 0, playing: true }, { type: "tick", at: 700 }, { type: "tick", at: 810 }]);
    expect(actions.map((a) => a.type)).toEqual(["duck", "restore"]);
    expect(actions[1]).toMatchObject({ ms: 250, at: 810 });
    expect(state.phase).toBe("idle");
  });

  it("a cough doesn't duck: 80 ms of sound is not an onset", () => {
    expect(run([...frames(0, 80, 0.9), ...frames(120, 400, 0.1)]).actions).toEqual([]);
  });
});

describe("backchannels", () => {
  it("'uh huh', 'a ha', 'mm hmm' and 'mhm hm' are backchannels, not interruptions", () => {
    for (const t of ["uh huh", "a ha", "mm hmm", "mhm hm", "Uh-huh.", "ajá"]) expect(isBackchannel(t), t).toBe(true);
    for (const t of ["no", "wait", "the bottom number"]) expect(isBackchannel(t), t).toBe(false);
  });
});
