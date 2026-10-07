import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { converse } from "./converse";
import { fakeIn, fakeOut } from "./fakes";

function setup() {
  const input = fakeIn();
  const output = fakeOut({ auto: false });
  const onTurn = vi.fn();
  const onBargeIn = vi.fn();
  const onBackchannel = vi.fn();
  const talk = converse({ input, output, onTurn, onBargeIn, onBackchannel });
  return { input, output, onTurn, onBargeIn, onBackchannel, talk };
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
    expect(s.onTurn).toHaveBeenCalledWith("Never mind, I got it.");
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
