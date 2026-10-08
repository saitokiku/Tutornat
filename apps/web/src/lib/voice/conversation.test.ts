import { describe, expect, it } from "vitest";
import { addressesSomeoneElse } from "./addressee";
import { CONVERSATION_LIMIT_MS, convStart, convStep, heardPrefix, LONGER_MS, STILL_MS, wakeAt, type ConvEvent, type ConvOptions, type ConvState, type Effect } from "./conversation";

/** Runs events in order; returns the final state and every effect, with the phase after each event. */
function run(events: ConvEvent[], o: ConvOptions | ConvState = { band: "35", conversationAllowed: true }) {
  let s = "phase" in o ? o : convStart(o);
  const effects: Effect[] = [];
  const phases: string[] = [];
  for (const e of events) {
    const r = convStep(s, e);
    s = r.state;
    effects.push(...r.effects);
    phases.push(s.phase);
  }
  return { s, effects, phases, types: effects.map((x) => x.type) };
}

const turn = (text: string, at: number, extra: Partial<{ confidence: number | null; addressee: boolean; reading: string }> = {}): ConvEvent => ({ type: "turn", text, at, confidence: 0.9, ...extra });

describe("the live loop", () => {
  it("tap mode: tap → listening → hearing → thinking → speaking → idle, with the mic closed after the turn", () => {
    const r = run([{ type: "mic", at: 0 }, { type: "speech-start", at: 100 }, { type: "partial", text: "it's", at: 300 }, turn("It's twelve.", 900), { type: "first-audio", at: 2400 }, { type: "reply-end", at: 5000, question: true, cancelled: false }]);
    expect(r.phases).toEqual(["listening", "hearing", "hearing", "thinking", "speaking", "idle"]);
    expect(r.effects).toEqual([{ type: "open-mic" }, { type: "close-mic" }, { type: "send", text: "It's twelve.", speculative: false }]);
  });

  it("a second tap ends the turn; a tap with nothing heard just closes the mic", () => {
    expect(run([{ type: "mic", at: 0 }, { type: "partial", text: "seven", at: 100 }, { type: "mic", at: 500 }]).types).toEqual(["open-mic", "close-mic"]);
    expect(run([{ type: "mic", at: 0 }, { type: "mic", at: 500 }]).s.phase).toBe("idle");
  });

  it("is tap mode by default for 3–9 and conversation mode for K–2 when it is allowed", () => {
    expect(convStart({ band: "35", conversationAllowed: true }).mode).toBe("tap");
    expect(convStart({ band: "69", conversationAllowed: true }).mode).toBe("tap");
    expect(convStart({ band: "k2", conversationAllowed: true }).mode).toBe("conversation");
    expect(convStart({ band: "k2", conversationAllowed: false }).mode).toBe("tap");
    expect(convStart({ band: "35", conversationAllowed: false, mode: "conversation" }).mode).toBe("tap");
    expect(run([{ type: "mode", mode: "conversation", at: 0 }], { band: "69", conversationAllowed: false }).s.mode).toBe("tap");
  });

  it("conversation mode reopens the mic after a question, and only after a question", () => {
    const o = { band: "k2" as const, conversationAllowed: true };
    const q = run([{ type: "mic", at: 0 }, turn("Twelve.", 1000), { type: "first-audio", at: 3000 }, { type: "reply-end", at: 6000, question: true, cancelled: false }], o);
    expect(q.s.phase).toBe("listening");
    expect(q.types.at(-1)).toBe("open-mic");
    expect(q.s.reopenedAt).toBe(6000);
    const statement = run([{ type: "mic", at: 0 }, turn("Twelve.", 1000), { type: "first-audio", at: 3000 }, { type: "reply-end", at: 6000, question: false, cancelled: false }], o);
    expect(statement.s.phase).toBe("idle");
    expect(statement.types.at(-1)).toBe("close-mic");
  });

  it("the reopened mic closes after 12 s of no learner speech (K–2: 15 s); two empty reopenings drop to tap mode", () => {
    for (const [band, ms] of [["35", 12_000], ["k2", 15_000]] as const) {
      const reopened = run([{ type: "mic", at: 0 }, turn("Twelve.", 1000), { type: "first-audio", at: 2000 }, { type: "reply-end", at: 5000, question: true, cancelled: false }], { band, conversationAllowed: true, mode: "conversation" }).s;
      expect(wakeAt(reopened)).toBe(5000 + ms);
      expect(run([{ type: "tick", at: 5000 + ms - 1 }], reopened).s.phase).toBe("listening");
      const closed = run([{ type: "tick", at: 5000 + ms }], reopened);
      expect(closed.s).toMatchObject({ phase: "micOff", micOff: "idle", mode: "conversation", emptyReopens: 1 });
      expect(closed.types).toEqual(["abort-mic"]);
      // The learner taps to talk, then the next reopening is empty too: back to tap mode.
      const again = run([{ type: "mic", at: 30_000 }, turn("Seven.", 31_000), { type: "first-audio", at: 32_000 }, { type: "reply-end", at: 35_000, question: true, cancelled: false }, { type: "tick", at: 35_000 + ms }], closed.s);
      expect(again.s).toMatchObject({ phase: "micOff", mode: "tap", emptyReopens: 0 });
      expect(again.effects.at(-1)).toEqual({ type: "mode", mode: "tap" });
    }
  });

  it("speaking in a reopened window resets the empty count; a tapped turn doesn't", () => {
    const o = { band: "35" as const, conversationAllowed: true, mode: "conversation" as const };
    const r = run([{ type: "mic", at: 0 }, turn("a", 1000), { type: "first-audio", at: 2000 }, { type: "reply-end", at: 3000, question: true, cancelled: false }, { type: "tick", at: 15_000 }], o);
    expect(r.s.emptyReopens).toBe(1);
    const tapped = run([{ type: "mic", at: 20_000 }, turn("b", 21_000), { type: "first-audio", at: 22_000 }, { type: "reply-end", at: 23_000, question: true, cancelled: false }], r.s);
    expect(tapped.s.emptyReopens).toBe(1);
    const spoke = run([{ type: "speech-start", at: 24_000 }, turn("c", 25_000)], tapped.s);
    expect(spoke.s.emptyReopens).toBe(0);
  });

  it("stops conversation mode at 20 minutes, whatever is happening", () => {
    const o = { band: "k2" as const, conversationAllowed: true };
    const r = run([{ type: "mic", at: 0 }, { type: "partial", text: "and then", at: 100 }, { type: "tick", at: CONVERSATION_LIMIT_MS }], o);
    expect(r.s).toMatchObject({ phase: "micOff", micOff: "limit", mode: "tap" });
    expect(r.types).toEqual(["open-mic", "abort-mic", "stop-voice", "stop-reply", "mode"]);
  });

  it("a hidden page or a route change stops everything", () => {
    const speaking = run([{ type: "mic", at: 0 }, turn("Twelve.", 1000), { type: "first-audio", at: 2000 }]).s;
    expect(run([{ type: "hidden", at: 3000 }], speaking)).toMatchObject({ s: { phase: "micOff", micOff: "hidden" }, types: ["abort-mic", "stop-voice", "stop-reply"] });
    expect(run([{ type: "route", at: 3000 }], speaking).s.phase).toBe("idle");
  });

  it("offline: tap and type at once", () => {
    const r = run([{ type: "mic", at: 0 }, { type: "offline", at: 100 }], { band: "k2", conversationAllowed: true });
    expect(r.s).toMatchObject({ phase: "idle", mode: "tap", notice: "offline" });
    expect(r.types).toContain("mode");
  });

  it("a slow connection pauses conversation mode", () => {
    const r = run([{ type: "slow", on: true, at: 0 }], { band: "k2", conversationAllowed: true });
    expect(r.s).toMatchObject({ mode: "tap", notice: "slow" });
    expect(run([{ type: "slow", on: false, at: 10 }], r.s).s.notice).toBeNull();
  });
});

describe("thinking", () => {
  const thinking = () => run([{ type: "mic", at: 0 }, turn("Ten.", 1000)]).s;

  it("says 'Still working on it' at 3 s and 'Taking longer than usual' with Try again at 10 s; no spoken filler", () => {
    const s = thinking();
    expect(wakeAt(s)).toBe(1000 + STILL_MS);
    const still = run([{ type: "tick", at: 1000 + STILL_MS }], s);
    expect(still.s.notice).toBe("still");
    expect(wakeAt(still.s)).toBe(1000 + LONGER_MS);
    const longer = run([{ type: "tick", at: 1000 + LONGER_MS }], still.s);
    expect(longer.s.notice).toBe("longer");
    expect(run([{ type: "retry", at: 12_000 }], longer.s).effects).toEqual([{ type: "retry", text: "Ten." }]);
    expect(still.effects).toEqual([]);
  });

  it("merges a self-correction: speech again within 1.5 s, before any audio, at most once", () => {
    const r = run([{ type: "speech-start", at: 1800 }, { type: "partial", text: "no, twelve", at: 2000 }, turn("no, twelve.", 2600)], thinking());
    expect(r.types).toEqual(["abort-request", "open-mic", "close-mic", "send"]);
    expect(r.effects.at(-1)).toEqual({ type: "send", text: "Ten. no, twelve.", speculative: false });
    // A second correction is a new turn, not another merge.
    const twice = run([{ type: "speech-start", at: 3000 }], r.s);
    expect(twice.types).toEqual([]);
    // Too late (after 1.5 s), or once audio started: not a merge.
    expect(run([{ type: "speech-start", at: 2600 }], thinking()).types).toEqual([]);
  });

  it("Flux eager end: a speculative request, taken back when the learner goes on, kept when the turn ends the same", () => {
    const hearing = run([{ type: "mic", at: 0 }, { type: "partial", text: "twelve", at: 500 }]).s;
    const eager = run([{ type: "eager", text: "twelve", confidence: 0.9, at: 900 }], hearing);
    expect(eager.s.phase).toBe("thinking");
    expect(eager.effects).toEqual([{ type: "send", text: "twelve", speculative: true }]);
    const resumed = run([{ type: "resumed", at: 1000 }], eager.s);
    expect(resumed).toMatchObject({ s: { phase: "hearing" }, types: ["abort-request"] });
    const same = run([turn("twelve", 1300)], eager.s);
    expect(same.types).toEqual(["close-mic", "commit"]);
    const longer = run([turn("twelve hundred", 1300)], eager.s);
    expect(longer.types).toEqual(["close-mic", "abort-request", "send"]);
    // K–2 never starts early.
    expect(run([{ type: "eager", text: "twelve", confidence: 0.9, at: 900 }], { ...hearing, band: "k2" }).types).toEqual([]);
  });

  it("a stream error says 'Lost the connection' and Try again resends the saved turn", () => {
    const r = run([{ type: "stream-error", at: 3000 }, { type: "retry", at: 4000 }], thinking());
    expect(r.phases).toEqual(["error", "thinking"]);
    expect(r.effects).toEqual([{ type: "retry", text: "Ten." }]);
  });
});

describe("speaking and barge-in", () => {
  const speaking = (o: ConvOptions = { band: "35", conversationAllowed: true }) => run([{ type: "mic", at: 0 }, turn("Ten.", 1000), { type: "first-audio", at: 2000 }], o).s;

  it("ducked, then cancelled: the learner has the floor; the reply's stream stops but what was heard stays", () => {
    const r = run([{ type: "duck", on: true, at: 2500 }], speaking());
    expect(r.s.ducked).toBe(true);
    const cut = run([{ type: "barge", at: 2700 }], r.s);
    expect(cut.s).toMatchObject({ phase: "hearing", ducked: false });
    expect(cut.types).toEqual(["stop-reply"]);
    expect(run([{ type: "duck", on: false, at: 3300 }], r.s).s.ducked).toBe(false);
  });

  it("tapping the mic while the tutor talks interrupts it and opens the mic", () => {
    const r = run([{ type: "mic", at: 2500 }], speaking());
    expect(r.s.phase).toBe("listening");
    expect(r.types).toEqual(["stop-voice", "stop-reply", "open-mic"]);
  });

  it("Stop stops the voice only; in conversation mode the mic stays open", () => {
    expect(run([{ type: "stop-voice", at: 2500 }], speaking())).toMatchObject({ s: { phase: "idle" }, types: ["stop-voice", "stop-reply"] });
    expect(run([{ type: "stop-voice", at: 2500 }], speaking({ band: "k2", conversationAllowed: true })).s.phase).toBe("listening");
  });

  it("half duplex closes the mic while the tutor speaks", () => {
    const s = run([{ type: "half-duplex", at: 0 }, { type: "mic", at: 0 }, turn("Ten.", 1000), { type: "first-audio", at: 2000 }], { band: "k2", conversationAllowed: true }).s;
    expect(s.halfDuplex).toBe(true);
    const out = run([{ type: "mic", at: 0 }, turn("Ten.", 1000)], { ...convStart({ band: "k2", conversationAllowed: true }), halfDuplex: true });
    expect(out.types).toContain("close-mic");
  });

  it("a voice failure leaves the words on screen and says the voice is off", () => {
    expect(run([{ type: "error-out", at: 2500 }], speaking()).s).toMatchObject({ phase: "idle", notice: "voiceOff" });
  });
});

describe("turns that wait for the learner", () => {
  it("below 0.6 confidence: 'Did you say …?' with Send and Say it again; an answer shows its reading", () => {
    const r = run([{ type: "mic", at: 0 }, turn("Fish.", 900, { confidence: 0.4, reading: undefined })]);
    expect(r.s).toMatchObject({ phase: "confirm", confirm: { text: "Fish.", kind: "unsure" } });
    expect(r.types).not.toContain("send");
    expect(run([{ type: "confirm-send", at: 2000 }], r.s).effects.at(-1)).toEqual({ type: "send", text: "Fish.", speculative: false });
    expect(run([{ type: "confirm-again", at: 2000 }], r.s)).toMatchObject({ s: { phase: "listening" }, types: ["open-mic"] });
    expect(run([{ type: "mic", at: 0 }, turn("seven", 900, { confidence: 0.5, reading: "7" })]).s.confirm).toMatchObject({ reading: "7" });
  });

  it("'Mom, can I have a snack?' waits behind 'Send to the tutor?'", () => {
    const r = run([{ type: "mic", at: 0 }, turn("Mom, can I have a snack?", 900, { addressee: true })]);
    expect(r.s).toMatchObject({ phase: "confirm", confirm: { kind: "addressee" } });
  });

  it("knows who is being called: grown-ups and the siblings on this device", () => {
    for (const t of ["Mom, can I have a snack?", "mommy look", "Mamá ven", "papi", "Abuela!"]) expect(addressesSomeoneElse(t), t).toBe(true);
    expect(addressesSomeoneElse("Leo, stop it", ["Leo"])).toBe(true);
    expect(addressesSomeoneElse("léo stop", ["Léo"])).toBe(true);
    for (const t of ["It's twelve", "more please", "Leo"]) expect(addressesSomeoneElse(t, t === "Leo" ? [] : ["Leo"]), t).toBe(false);
  });
});

describe("what the learner heard", () => {
  it("cuts the tutor's message to the heard words and marks it interrupted", () => {
    expect(heardPrefix("Look at the top number. Now the bottom one.", 4)).toBe("Look at the top number. [interrupted]");
    expect(heardPrefix("Look at the top number.", 4)).toBe("Look at the top number.");
    expect(heardPrefix("Look at it.", -1)).toBe("[interrupted]");
  });
});
