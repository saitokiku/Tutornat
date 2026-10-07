import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sentenceFeed } from "./chunk";
import { converse, type ConverseOptions } from "./converse";
import { fakeIn, fakeOut } from "./fakes";

function setup(over: Partial<ConverseOptions> = {}) {
  const input = fakeIn();
  const output = fakeOut({ auto: false });
  const onTurn = vi.fn();
  const onBargeIn = vi.fn();
  const onBackchannel = vi.fn();
  const onEcho = vi.fn();
  const onMicOff = vi.fn();
  const onMetric = vi.fn();
  const talk = converse({ input, output, onTurn, onBargeIn, onBackchannel, onEcho, onMicOff, onMetric, ...over });
  return { input, output, onTurn, onBargeIn, onBackchannel, onEcho, onMicOff, onMetric, talk };
}

/** The voice reads word by word: a boundary for each written word, `ms` apart, starting now. */
async function readWords(s: ReturnType<typeof setup>, from: number, to: number, ms = 300) {
  for (let i = from; i <= to; i++) {
    s.output.boundary(i);
    await vi.advanceTimersByTimeAsync(ms);
  }
}

const tick = () => vi.advanceTimersByTimeAsync(0);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
});
afterEach(() => vi.useRealTimers());

describe("talking with the tutor", () => {
  it("a child's mhm does not stop the tutor or become a turn", async () => {
    const s = setup();
    void s.talk.say("So we split the bar into four parts. Each part is one fourth.");
    await tick();
    expect(s.output.state).toBe("speaking");
    s.input.speechStart();
    s.input.partial("mhm");
    await vi.advanceTimersByTimeAsync(1500);
    s.input.endOfTurn("Mhm.");
    expect(s.output.state).toBe("speaking");
    expect(s.onBargeIn).not.toHaveBeenCalled();
    expect(s.onTurn).not.toHaveBeenCalled();
    expect(s.onBackchannel).toHaveBeenCalledWith("Mhm.");
  });

  it("works for Spanish acknowledgements too", async () => {
    const s = setup();
    void s.talk.say("Partimos la barra en cuatro partes.");
    await tick();
    for (const t of ["ajá", "sí", "ok"]) {
      s.input.speechStart();
      s.input.partial(t);
      await vi.advanceTimersByTimeAsync(800);
      s.input.endOfTurn(t);
    }
    expect(s.output.state).toBe("speaking");
    expect(s.onTurn).not.toHaveBeenCalled();
  });

  it("real speech over 300 ms stops the tutor at once and becomes the next turn", async () => {
    const s = setup();
    void s.talk.say("So we split the bar into four parts.");
    await tick();
    s.input.speechStart();
    await vi.advanceTimersByTimeAsync(100);
    s.input.partial("wait");
    expect(s.output.state).toBe("speaking"); // 100 ms: not yet
    await vi.advanceTimersByTimeAsync(200);
    expect(s.output.state).toBe("idle"); // 300 ms: cancelled without waiting for more words
    expect(s.onBargeIn).toHaveBeenCalledOnce();
    s.input.endOfTurn("Wait, why four?");
    expect(s.onTurn).toHaveBeenCalledWith("Wait, why four?");
  });

  it("ok followed by a question is an interruption", async () => {
    const s = setup();
    void s.talk.say("Each part is one fourth.");
    await tick();
    s.input.speechStart();
    s.input.partial("ok");
    await vi.advanceTimersByTimeAsync(400);
    expect(s.output.state).toBe("speaking");
    s.input.partial("ok but why");
    expect(s.output.state).toBe("idle");
  });

  it("ignores the tutor's own voice from the speakers", async () => {
    const s = setup();
    void s.talk.say("Each part is one fourth of the bar.");
    await tick();
    s.input.speechStart();
    await vi.advanceTimersByTimeAsync(400);
    s.input.partial("one fourth of the bar");
    expect(s.output.state).toBe("speaking");
    s.input.endOfTurn("One fourth of the bar.");
    expect(s.onTurn).not.toHaveBeenCalled();
    expect(s.onEcho).toHaveBeenCalledWith("One fourth of the bar.");
  });

  it("the tutor's own voice is still echo when the turn ends after the reply has", async () => {
    const s = setup();
    void s.talk.say("Each part is one fourth of the bar.");
    await tick();
    s.input.speechStart();
    await vi.advanceTimersByTimeAsync(300);
    s.input.partial("each part is");
    await vi.advanceTimersByTimeAsync(1500);
    s.input.partial("each part is one fourth of the bar");
    expect(s.output.state).toBe("speaking");
    s.output.finish(); // the voice ends without a pause, so the echo's turn ends 700 ms later
    await vi.advanceTimersByTimeAsync(700);
    s.input.endOfTurn("Each part is one fourth of the bar.");
    expect(s.onTurn).not.toHaveBeenCalled();
    expect(s.onEcho).toHaveBeenCalledOnce();
  });

  it("recognizes the echo of math said in words", async () => {
    const s = setup();
    void s.talk.say("Shade 3/4 of the bar. Then 5 × 2 = 10.");
    await tick();
    s.input.speechStart();
    await vi.advanceTimersByTimeAsync(1500);
    s.output.boundary(5); // the voice reaches the second sentence
    await vi.advanceTimersByTimeAsync(400);
    // The microphone hears "3 fourths" and "times … equals", not what is written.
    s.input.partial("shade three fourths of the bar then five times two");
    expect(s.output.state).toBe("speaking");
    expect(s.onBargeIn).not.toHaveBeenCalled();
    s.output.finish();
    await vi.advanceTimersByTimeAsync(700);
    s.input.endOfTurn("Shade three fourths of the bar. Then five times two equals ten.");
    expect(s.onTurn).not.toHaveBeenCalled();
    // A recognizer that writes digits and slashes is matched too.
    void s.talk.say("Shade 3/4 of the bar.");
    await tick();
    s.input.speechStart();
    s.output.finish();
    s.input.endOfTurn("Shade 3/4 of the bar.");
    expect(s.onTurn).not.toHaveBeenCalled();
    expect(s.onEcho).toHaveBeenCalledTimes(2);
  });

  it("an answer that uses the question's words is the learner's, not echo", async () => {
    const s = setup();
    void s.talk.say("Which is bigger, three fourths or two thirds?");
    await tick();
    await readWords(s, 1, 3); // "is" "bigger," "three" — the voice is at "three" (900 ms)
    s.input.speechStart(); // the learner read ahead on the screen
    await readWords(s, 4, 4);
    s.input.partial("two thirds is bigger");
    expect(s.output.state).toBe("idle");
    expect(s.onBargeIn).toHaveBeenCalledOnce();
    s.input.endOfTurn("Two thirds is bigger.");
    expect(s.onTurn).toHaveBeenCalledWith("Two thirds is bigger.");
    expect(s.onEcho).not.toHaveBeenCalled();
  });

  it("an answer given as the question ends is delivered", async () => {
    const s = setup();
    void s.talk.say("Which is bigger, three fourths or two thirds?");
    await tick();
    await readWords(s, 1, 7);
    s.input.speechStart();
    s.output.finish();
    await vi.advanceTimersByTimeAsync(1500);
    s.input.endOfTurn("Two thirds is bigger.");
    expect(s.onTurn).toHaveBeenCalledWith("Two thirds is bigger.");
  });

  it("speech while the tutor is paused is never taken for echo", async () => {
    const s = setup();
    void s.talk.say("Each part is one fourth of the bar.");
    await tick();
    s.output.pause();
    s.input.speechStart();
    await vi.advanceTimersByTimeAsync(400);
    s.input.endOfTurn("One fourth of the bar?");
    expect(s.onEcho).not.toHaveBeenCalled();
    expect(s.onTurn).toHaveBeenCalledWith("One fourth of the bar?");
  });

  it("when the tutor is quiet, every finished turn is an answer, even ok", async () => {
    const s = setup();
    s.input.endOfTurn("ok");
    expect(s.onTurn).toHaveBeenCalledWith("ok");
    expect(s.onBackchannel).not.toHaveBeenCalled();
  });

  it("an answer while the reply is still on its way cancels it", async () => {
    const s = setup();
    s.output.state = "waiting";
    const cancel = vi.spyOn(s.output, "cancel");
    s.input.endOfTurn("Never mind, I got it.");
    expect(cancel).toHaveBeenCalled();
    expect(s.onBargeIn).toHaveBeenCalledOnce(); // so the screen stops the reply too
    expect(s.onTurn).toHaveBeenCalledWith("Never mind, I got it.");
  });

  it("a mhm while the reply is on its way leaves it alone", async () => {
    const s = setup();
    s.output.state = "waiting";
    const cancel = vi.spyOn(s.output, "cancel");
    for (const t of ["mhm", "ok", "ajá"]) {
      s.input.speechStart();
      s.input.partial(t);
      s.input.endOfTurn(t);
    }
    expect(cancel).not.toHaveBeenCalled();
    expect(s.onTurn).not.toHaveBeenCalled();
    expect(s.onBackchannel).toHaveBeenCalledTimes(3);
    expect(s.output.state).toBe("waiting");
  });

  it("yes during the tutor's question is the answer, given when the tutor finishes", async () => {
    const s = setup();
    void s.talk.say("Good. Do you want to try another one?");
    await tick();
    s.output.boundary(1); // "Do …"
    s.input.speechStart();
    s.input.partial("yes");
    await vi.advanceTimersByTimeAsync(800);
    s.input.endOfTurn("Yes.");
    expect(s.output.state).toBe("speaking"); // not an interruption
    expect(s.onTurn).not.toHaveBeenCalled();
    s.output.finish();
    expect(s.onTurn).toHaveBeenCalledWith("Yes.");
    // During a statement it is only listening.
    void s.talk.say("Each part is one fourth.");
    await tick();
    s.input.endOfTurn("ok");
    s.output.finish();
    expect(s.onTurn).toHaveBeenCalledTimes(1);
    expect(s.onBackchannel).toHaveBeenCalledWith("ok");
  });

  it("a mhm that started over the tutor's last words is still not a turn", async () => {
    const s = setup();
    void s.talk.say("So each part is one fourth.");
    await tick();
    s.input.speechStart();
    s.input.partial("mhm");
    s.output.finish();
    await vi.advanceTimersByTimeAsync(700);
    s.input.endOfTurn("Mhm.");
    expect(s.onTurn).not.toHaveBeenCalled();
    expect(s.onBackchannel).toHaveBeenCalledWith("Mhm.");
  });

  it("the voice is still recognized as echo when a noise started the turn before the voice began", async () => {
    const s = setup();
    const feed = sentenceFeed();
    void s.talk.say(feed.sentences);
    s.input.speechStart(); // a chair scrapes while the reply is on its way
    await vi.advanceTimersByTimeAsync(200);
    feed.write("Each part is one fourth of the bar. ");
    feed.end();
    await tick();
    expect(s.output.state).toBe("speaking");
    await vi.advanceTimersByTimeAsync(500);
    s.input.partial("each part is one fourth");
    await vi.advanceTimersByTimeAsync(400);
    expect(s.output.state).toBe("speaking");
    expect(s.onBargeIn).not.toHaveBeenCalled();
  });

  it("a noise long before doesn't count toward the 300 ms", async () => {
    const s = setup();
    void s.talk.say("So we split the bar into four parts. Then we shade one.");
    await tick();
    s.input.speechStart(); // a cough: no words follow
    await vi.advanceTimersByTimeAsync(5000);
    s.input.partial("wait");
    expect(s.output.state).toBe("speaking");
    await vi.advanceTimersByTimeAsync(299);
    expect(s.output.state).toBe("speaking");
    await vi.advanceTimersByTimeAsync(1);
    expect(s.output.state).toBe("idle");
  });

  it("reports how long first audio and barge-in took", async () => {
    const s = setup();
    void s.talk.say("So we split the bar into four parts.");
    await tick();
    expect(s.onMetric).toHaveBeenCalledWith({ name: "first-audio", ms: 0, vendor: "browser" });
    s.input.speechStart();
    s.input.partial("wait");
    await vi.advanceTimersByTimeAsync(300);
    expect(s.onMetric).toHaveBeenLastCalledWith({ name: "barge-in", ms: 300, vendor: "browser" });
  });

  it("turns the microphone off after 30 s with nobody talking, but not while the tutor talks", async () => {
    const s = setup();
    const stop = vi.spyOn(s.input, "stop");
    s.talk.listening();
    void s.talk.say("A long explanation.");
    await tick();
    await vi.advanceTimersByTimeAsync(45_000);
    expect(stop).not.toHaveBeenCalled();
    s.output.finish();
    await vi.advanceTimersByTimeAsync(29_000);
    s.input.partial("um");
    await vi.advanceTimersByTimeAsync(29_000);
    expect(stop).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(stop).toHaveBeenCalledOnce();
    expect(s.onMicOff).toHaveBeenCalledWith("idle");
  });

  it("turns the microphone off when the page goes out of sight", async () => {
    const s = setup();
    const abort = vi.spyOn(s.input, "abort");
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(abort).toHaveBeenCalledOnce();
    expect(s.onMicOff).toHaveBeenCalledWith("hidden");
    s.talk.dispose();
    s.input.listening = true;
    document.dispatchEvent(new Event("visibilitychange"));
    expect(abort).toHaveBeenCalledOnce();
    hidden.mockRestore();
  });

  it("dispose stops listening to the microphone", async () => {
    const s = setup();
    s.talk.dispose();
    s.input.endOfTurn("hello");
    expect(s.onTurn).not.toHaveBeenCalled();
  });

  it("works with no output (typing-only screens) and no input", async () => {
    const onTurn = vi.fn();
    const input = fakeIn();
    const talk = converse({ input, output: null, onTurn });
    await talk.say("Hello.");
    input.endOfTurn("hi");
    expect(onTurn).toHaveBeenCalledWith("hi");
    expect(() => converse({ input: null, output: fakeOut(), onTurn }).dispose()).not.toThrow();
  });
});
