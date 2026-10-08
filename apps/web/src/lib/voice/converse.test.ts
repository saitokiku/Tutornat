import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { converse, type ConverseMetric } from "./converse";
import { fakeIn, fakeOut } from "./fakes";
import type { HeardWord } from "./types";

// The two-way loop on a fake clock: the fake voice schedules its words when the test says, the
// fake recognizer hears words with times. Times are performance.now() ms (Date.now() under fake timers).

function setup() {
  const output = fakeOut({ auto: false, kind: "elevenlabs" });
  const input = fakeIn({ kind: "deepgram" });
  const seen = { turns: [] as string[], held: [] as boolean[], barges: 0, backchannels: [] as string[], echoes: [] as string[], micOff: [] as string[], half: 0, ducks: [] as boolean[], metrics: [] as ConverseMetric[] };
  const talk = converse({
    input,
    output,
    onTurn: (t, m) => (seen.turns.push(t), seen.held.push(m.held)),
    onBargeIn: () => seen.barges++,
    onBackchannel: (t) => seen.backchannels.push(t),
    onEcho: (t) => seen.echoes.push(t),
    onMicOff: (w) => seen.micOff.push(w),
    onHalfDuplex: () => seen.half++,
    onDuck: (d) => seen.ducks.push(d),
    onMetric: (m) => seen.metrics.push(m),
    now: () => Date.now(),
  });
  return { output, input, seen, talk };
}

/** The tutor says `text`; its words are scheduled `gap` ms apart from now. Returns when each was heard. */
async function tutorSays(s: ReturnType<typeof setup>, text: string, gap = 250) {
  void s.talk.say(text);
  await vi.advanceTimersByTimeAsync(1);
  const t0 = Date.now();
  const n = text.split(/\s+/).filter(Boolean).length;
  for (let i = 0; i < n; i++) s.output.schedule(i, t0 + i * gap);
  return Array.from({ length: n }, (_, i) => t0 + i * gap);
}

const w = (word: string, start: number): HeardWord => ({ word, start, end: start + 200, confidence: 0.9 });
const meta = (words: HeardWord[]) => ({ words, confidence: 0.9, lastWordEnd: words.at(-1)?.end ?? null });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(10_000);
});
afterEach(() => vi.useRealTimers());

describe("talking over the tutor", () => {
  it("ducks the moment the learner starts, stops it on a real word, and the words become the turn", async () => {
    const s = setup();
    await tutorSays(s, "Look at the top number. Now the bottom one.");
    s.input.speechStart();
    expect(s.output.gains.at(-1)).toEqual({ gain: 0.3, ms: 80 });
    expect(s.seen.ducks).toEqual([true]);
    await vi.advanceTimersByTimeAsync(300);
    s.input.words([w("wait", Date.now())]);
    expect(s.output.state).toBe("idle");
    expect(s.output.gains.at(-1)).toEqual({ gain: 0, ms: 120 });
    expect(s.seen.barges).toBe(1);
    const m = s.seen.metrics.find((x) => x.name === "barge-in");
    expect(m).toMatchObject({ duckMs: 0 });
    expect(m && m.name === "barge-in" && m.stopMs).toBeLessThanOrEqual(800);
    s.input.endOfTurn("wait, is it seven?", meta([w("wait", Date.now() - 100)]));
    expect(s.seen.turns).toEqual(["wait, is it seven?"]);
  });

  it("'mhm' doesn't stop the tutor, and it comes back to full volume after 800 ms", async () => {
    const s = setup();
    await tutorSays(s, "Look at the top number. Now look at the bottom number. They tell different things.");
    s.input.speechStart();
    s.input.words([w("mhm", Date.now())]);
    await vi.advanceTimersByTimeAsync(850);
    expect(s.output.state).toBe("speaking");
    expect(s.output.gains.at(-1)).toEqual({ gain: 1, ms: 250 });
    s.input.endOfTurn("mhm", meta([w("mhm", Date.now() - 800)]));
    expect(s.seen.backchannels).toEqual(["mhm"]);
    expect(s.seen.turns).toEqual([]);
  });

  it("the tutor's own voice heard back is set aside by time; the same words said later are a turn", async () => {
    const s = setup();
    const at = await tutorSays(s, "Shade 3/4 of it.");
    // The speakers come back through the microphone 150 ms after each word.
    s.input.endOfTurn("Shade three fourths of it.", meta([w("Shade", at[0] + 150), w("three", at[1] + 150), w("fourths", at[1] + 400), w("of", at[2] + 150), w("it", at[3] + 150)]));
    expect(s.seen.echoes).toEqual(["Shade three fourths of it."]);
    expect(s.seen.turns).toEqual([]);
    s.output.finish();
    await vi.advanceTimersByTimeAsync(3000);
    const later = Date.now();
    s.input.endOfTurn("three fourths", meta([w("three", later), w("fourths", later + 250)]));
    expect(s.seen.turns).toEqual(["three fourths"]);
  });

  it("'The bottom number.' answering 'top or bottom?' is a turn, held until the tutor finishes", async () => {
    const s = setup();
    const at = await tutorSays(s, "Is it the top number or the bottom number?");
    // The learner starts just after the question's last word, in the tutor's own words.
    const start = at[8] + 400;
    vi.setSystemTime(start + 700);
    s.input.endOfTurn("The bottom number.", meta([w("The", start), w("bottom", start + 200), w("number.", start + 450)]));
    expect(s.seen.echoes).toEqual([]);
    expect(s.seen.turns).toEqual([]);
    s.output.finish();
    expect(s.seen.turns).toEqual(["The bottom number."]);
    expect(s.seen.held).toEqual([true]);
  });

  it("'yes' in the last 1.5 s of a question answers it, once the tutor finishes", async () => {
    const s = setup();
    const at = await tutorSays(s, "Do you want another one?");
    s.input.endOfTurn("yes", meta([w("yes", at[3])]));
    expect(s.seen.backchannels).toEqual([]);
    s.output.finish();
    expect(s.seen.turns).toEqual(["yes"]);
  });

  it("'yes' while the tutor is still explaining is listening, not a turn", async () => {
    const s = setup();
    const at = await tutorSays(s, "The bottom number tells how many equal parts the whole has. The top number tells how many we count.");
    s.input.endOfTurn("yes", meta([w("yes", at[2])]));
    expect(s.seen.backchannels).toEqual(["yes"]);
    expect(s.output.state).toBe("speaking");
  });

  it("per-block levels: one loud click doesn't duck; 120 ms of voice does, timed from when it was captured", async () => {
    const output = fakeOut({ auto: false, kind: "elevenlabs" });
    const input = fakeIn({ kind: "deepgram", levels: true });
    const metrics: ConverseMetric[] = [];
    const talk = converse({ input, output, onTurn: () => {}, onMetric: (m) => metrics.push(m), now: () => Date.now() });
    void talk.say("Look at the top number. Now look at the bottom number. They tell different things.");
    await vi.advanceTimersByTimeAsync(1);
    // A cough: one 20 ms block. (A smoothed meter would stay above 0.5 for ~80 ms more.)
    const t0 = Date.now();
    input.block(0.9, t0);
    for (let k = 1; k < 8; k++) input.block(0.1, t0 + k * 20);
    await vi.advanceTimersByTimeAsync(200);
    expect(output.gains).toEqual([]);
    // A voice: loud blocks from t1 on; the duck comes on the block that makes 120 ms.
    const t1 = Date.now();
    for (let k = 0; k <= 6; k++) input.block(0.7, t1 + k * 20);
    expect(output.gains.at(-1)).toEqual({ gain: 0.3, ms: 80 });
    input.words([w("wait", t1 + 200)]);
    const m = metrics.find((x) => x.name === "barge-in");
    expect(m).toMatchObject({ onsetAt: t1 });
    talk.dispose();
  });

  it("Flux's words carry only their window: echo is judged by order inside it, not by spread-out times", async () => {
    const s = setup();
    const at = await tutorSays(s, "Which part is tricky?");
    // The window Flux reports runs a second and a half past the tutor's words.
    const coarse = (word: string): HeardWord => ({ word, start: at[0], end: at[0] + 1600, confidence: 0.9, coarse: true });
    s.input.endOfTurn("which part is tricky", meta(["which", "part", "is", "tricky"].map(coarse)));
    expect(s.seen.echoes).toEqual(["which part is tricky"]);
    expect(s.seen.turns).toEqual([]);
  });

  it("listening falling back to the browser's recognizer makes the session half duplex", async () => {
    const s = setup();
    s.input.switchTo({ kind: "browser", duplex: false });
    expect(s.talk.halfDuplex).toBe(true);
  });

  it("two echo set-asides switch the session to half duplex", async () => {
    const s = setup();
    for (let k = 0; k < 2; k++) {
      const at = await tutorSays(s, "Count the dots.");
      s.input.endOfTurn("count the dots", meta([w("count", at[0] + 100), w("the", at[1] + 100), w("dots", at[2] + 100)]));
    }
    expect(s.seen.echoes).toHaveLength(2);
    expect(s.seen.half).toBe(1);
    expect(s.talk.halfDuplex).toBe(true);
  });
});

describe("the microphone turns itself off", () => {
  it("after the idle time with nobody speaking", async () => {
    const s = setup();
    s.talk.listening();
    await vi.advanceTimersByTimeAsync(30_001);
    expect(s.input.listening).toBe(false);
    expect(s.seen.micOff).toEqual(["idle"]);
  });

  it("when the page is hidden", async () => {
    const s = setup();
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(s.input.listening).toBe(false);
    expect(s.seen.micOff).toEqual(["hidden"]);
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    s.talk.dispose();
  });
});

describe("what the tutor said", () => {
  it("passes the heard prefix through, for truncating the reply after a barge-in", async () => {
    const s = setup();
    await tutorSays(s, "One two three.");
    s.output.heard = 1;
    expect(s.talk.heardUpTo()).toBe(1);
    expect(s.talk.sentenceAt(0)).toEqual({ from: 0, to: 3, question: false });
  });
});
