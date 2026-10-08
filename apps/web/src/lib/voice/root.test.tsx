import { act, render, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appSpeechOut } from "./app-out";
import { fakeIn, fakeOut } from "./fakes";
import { useAppVoice, useSpeak, VoiceProvider, type VoiceLearner } from "./root";
import type { Voice, VoiceSetup } from "./select";
import { useTutorVoice, type TutorVoiceOptions } from "./tutor-voice";
import { VoiceError } from "./types";

// The app voice: one SpeechOut for every speaker, queued until it is built, one run at a time, and a
// voice that never changes inside a reply. Then the talking tutor's loop on fake voices.

const LEARNER: VoiceLearner = { id: "L1", locale: "en", grade: "4", consent: true, names: ["Ada"], siblings: ["Leo"] };

function voices({ kind = "elevenlabs" as const, conversation = true, device = false } = {}) {
  const out = fakeOut({ auto: false, kind });
  const deviceOut = device ? fakeOut({ auto: false, kind: "browser" }) : null;
  const input = fakeIn({ kind: "deepgram" });
  input.listening = false;
  const v: Voice = { out, in: input, vendor: { out: out.kind, in: input.kind }, allowed: true, tier: "A", autoRead: true, conversation, deviceOut, tip: false };
  const build = vi.fn(async (setup: VoiceSetup) => (void setup, v));
  return { out, deviceOut, input, v, build };
}

const flush = () => act(() => vi.advanceTimersByTimeAsync(5));

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 204 })));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("the app's one SpeechOut", () => {
  it("queues a speak() made before the voice is built, and starts it then", async () => {
    const app = appSpeechOut({ unlock: () => {} });
    const ends: number[] = [];
    app.onEnd((_, run) => ends.push(run));
    const run = app.speak("Hello there.");
    expect(app.state).toBe("waiting");
    const { out, v } = voices();
    app.attach({ out: v.out, deviceOut: null });
    await vi.advanceTimersByTimeAsync(1);
    expect(out.said).toEqual([["Hello there."]]);
    out.finish();
    await run;
    expect(ends).toEqual([run.id]);
  });

  it("warm() unlocks audio in the tap even before the voice is built", () => {
    const unlock = vi.fn();
    appSpeechOut({ unlock }).warm();
    expect(unlock).toHaveBeenCalledOnce();
  });

  it("a new speak replaces the last one; each run's events carry its own id", async () => {
    const app = appSpeechOut({ unlock: () => {} });
    const { out, v } = voices();
    app.attach({ out: v.out, deviceOut: null });
    const words: [number, number][] = [];
    app.onBoundary((w, run) => words.push([w, run]));
    const a = app.speak("One two.");
    await vi.advanceTimersByTimeAsync(1);
    const b = app.speak("Three four.");
    await vi.advanceTimersByTimeAsync(1);
    out.boundary(1);
    expect(words.at(-1)).toEqual([1, b.id]);
    expect(b.id).not.toBe(a.id);
    expect(out.gains.at(-1)).toEqual({ gain: 0, ms: 120 }); // the first faded out
  });

  it("after the vendor voice fails, the next reply (never the failing one) uses the device's natural voice", async () => {
    const app = appSpeechOut({ unlock: () => {} });
    const { out, deviceOut, v } = voices({ device: true });
    app.attach({ out: v.out, deviceOut: v.deviceOut });
    void app.speak("First reply.");
    await vi.advanceTimersByTimeAsync(1);
    out.fail(new VoiceError("speak", "socket"));
    expect(app.usingDeviceVoice).toBe(true);
    expect(deviceOut!.said).toEqual([]); // the failing reply isn't handed over mid-way
    void app.speak("Second reply.");
    await vi.advanceTimersByTimeAsync(1);
    expect(deviceOut!.said).toEqual([["Second reply."]]);
  });
});

describe("VoiceProvider", () => {
  function wrapper(build: (s: VoiceSetup) => Promise<Voice>, learner: VoiceLearner | null = LEARNER) {
    return function Wrapper({ children }: { children: ReactNode }) {
      return (
        <VoiceProvider learner={learner} build={build}>
          {children}
        </VoiceProvider>
      );
    };
  }

  it("builds the learner's voice once, with the band, consent and names, never sending them anywhere", async () => {
    const { build } = voices();
    const { result, rerender } = renderHook(() => useAppVoice(), { wrapper: wrapper(build) });
    expect(result.current.ready).toBe(false);
    await flush();
    expect(result.current.ready).toBe(true);
    expect(result.current.band).toBe("35");
    expect(build).toHaveBeenCalledOnce();
    expect(build.mock.calls[0][0]).toMatchObject({ locale: "en", consent: true, under13: true, band: "35", names: ["Ada"], learner: "L1" });
    rerender();
    expect(build).toHaveBeenCalledOnce();
  });

  it("the first tap anywhere unlocks audio", async () => {
    const { build } = voices();
    const unlock = vi.fn();
    const { result } = renderHook(() => useAppVoice(), { wrapper: wrapper(build) });
    await flush();
    const warm = vi.spyOn(result.current.out, "warm").mockImplementation(unlock);
    render(<button type="button">tap</button>).getByText("tap").dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(warm).toHaveBeenCalled();
  });

  it("useVoiceSession inside the root uses the app voice instead of building another", async () => {
    const { build, out } = voices();
    const { useVoiceSession } = await import("./session");
    const { result } = renderHook(() => useVoiceSession({ locale: "en", consent: true, under13: true, band: "35", names: ["Ada"], onTurn: () => {} }), { wrapper: wrapper(build) });
    await flush();
    expect(result.current.ready).toBe(true);
    expect(build).toHaveBeenCalledOnce();
    act(() => void result.current.say("Count the dots."));
    await flush();
    expect(out.said).toEqual([["Count the dots."]]);
  });

  it("appSay speaks through the app voice from outside React, and is false with no voice (never a second one)", async () => {
    const { appSay } = await import("./root");
    expect(appSay("Count the dots.")).toBe(false);
    const { build, out } = voices();
    const { unmount } = renderHook(() => useAppVoice(), { wrapper: wrapper(build) });
    await flush();
    const ended = vi.fn();
    expect(appSay("Count the dots.", { onEnd: ended })).toBe(true);
    await flush();
    expect(out.said.at(-1)).toEqual(["Count the dots."]);
    act(() => out.finish());
    await flush();
    expect(ended).toHaveBeenCalledOnce();
    unmount();
    expect(appSay("Again.")).toBe(false);
  });

  it("two speakers follow only their own runs", async () => {
    const { build, out } = voices();
    const { result } = renderHook(() => ({ hear: useSpeak("hear"), story: useSpeak("narration") }), { wrapper: wrapper(build) });
    await flush();
    act(() => result.current.story.speak("Once upon a time."));
    await flush();
    act(() => out.boundary(2));
    expect(result.current.story.word).toBe(2);
    act(() => result.current.hear.speak("Count the dots."));
    await flush();
    expect(result.current.story.speaking).toBe(false); // the new one replaced it
    act(() => out.boundary(1));
    expect(result.current.hear.word).toBe(1);
    expect(result.current.story.word).toBeNull();
  });
});

describe("the talking tutor", () => {
  function tutor(over: Partial<TutorVoiceOptions> = {}, learner: VoiceLearner = LEARNER, opts?: Parameters<typeof voices>[0]) {
    const vs = voices(opts);
    const onSend = vi.fn();
    const onStopReply = vi.fn();
    const onAbortRequest = vi.fn();
    const hook = renderHook(() => useTutorVoice({ onSend, onStopReply, onAbortRequest, ...over }), {
      wrapper: ({ children }) => (
        <VoiceProvider learner={learner} build={vs.build}>
          {children}
        </VoiceProvider>
      ),
    });
    return { ...vs, ...hook, onSend, onStopReply, onAbortRequest };
  }

  it("tap → listening → the turn is sent, marked as voice, and the mic closes (tap mode)", async () => {
    const t = tutor();
    await flush();
    expect(t.result.current.state).toMatchObject({ phase: "idle", mode: "tap" });
    act(() => t.result.current.mic());
    expect(t.result.current.state.phase).toBe("listening");
    expect(t.input.lastOptions).toMatchObject({ turns: "auto", band: "35" });
    act(() => t.input.speechStart());
    expect(t.result.current.state.phase).toBe("hearing");
    act(() => t.input.endOfTurn("It's twelve.", { confidence: 0.92, lastWordEnd: performance.now() - 400 }));
    expect(t.onSend).toHaveBeenCalledWith("It's twelve.", expect.objectContaining({ via: "voice", confidence: 0.92, speculative: false, retry: false }));
    // The reply's voice opens with the request, so its socket is ready before the first token.
    expect(t.out.said).toHaveLength(1);
    expect(t.result.current.state.phase).toBe("thinking");
    expect(t.input.listening).toBe(false);
  });

  it("the reply streams into the voice; the first sound moves to speaking and posts the turn's numbers", async () => {
    const t = tutor();
    await flush();
    act(() => t.result.current.mic());
    act(() => t.input.endOfTurn("twelve", { confidence: 0.9, lastWordEnd: performance.now() - 300 }));
    let feed!: ReturnType<typeof t.result.current.reply>;
    act(() => {
      t.result.current.markAck();
      t.result.current.markFirstToken();
      feed = t.onSend.mock.calls[0][1].reply;
      feed.write("Look at the top number. Now");
    });
    await flush();
    expect(t.out.said[0]).toEqual(["Look at the top number."]);
    expect(t.result.current.state.phase).toBe("speaking");
    act(() => t.out.timing({ firstSentenceAt: performance.now(), firstChunkAt: performance.now(), firstAudibleAt: performance.now() + 80, underruns: 0, retried: false }));
    const post = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.find((c) => c[0] === "/api/voice/metric");
    expect(post).toBeTruthy();
    const body = JSON.parse(String(post![1].body));
    expect(body).toMatchObject({ band: "35", locale: "en", in: "deepgram", out: "elevenlabs", mode: "tap" });
    expect(body.segments.total).toBeGreaterThan(0);
    expect(JSON.stringify(body)).not.toMatch(/twelve|top number|Ada/);
  });

  it("conversation mode (K–2) reopens the mic after a question", async () => {
    const t = tutor({}, { ...LEARNER, grade: "1" });
    await flush();
    expect(t.result.current.state.mode).toBe("conversation");
    act(() => t.result.current.mic());
    act(() => t.input.endOfTurn("seven", { confidence: 0.9 }));
    let feed!: ReturnType<typeof t.result.current.reply>;
    act(() => {
      feed = t.onSend.mock.calls[0][1].reply;
      feed.write("Seven dots. Can you count them again?");
      feed.end();
    });
    await flush();
    act(() => t.out.finish());
    expect(t.result.current.state.phase).toBe("listening");
    expect(t.input.listening).toBe(true);
  });

  it("talking over the tutor stops the reply and reports what was heard", async () => {
    const t = tutor();
    await flush();
    act(() => t.result.current.mic());
    act(() => t.input.endOfTurn("twelve", { confidence: 0.9 }));
    act(() => {
      t.onSend.mock.calls[0][1].reply.write("Look at the top number. Now look at the bottom number. Which");
    });
    await flush();
    t.out.heard = 3;
    act(() => t.input.endOfTurn("wait, why?", { confidence: 0.9 }));
    expect(t.onStopReply).toHaveBeenCalledWith(3);
    expect(t.onSend).toHaveBeenLastCalledWith("wait, why?", expect.objectContaining({ via: "voice" }));
  });

  it("'Mom, …' waits behind 'Send to the tutor?'; a mumble behind 'Did you say …?'", async () => {
    const t = tutor();
    await flush();
    act(() => t.result.current.mic());
    act(() => t.input.endOfTurn("Mom, can I have a snack?", { confidence: 0.95 }));
    expect(t.result.current.state).toMatchObject({ phase: "confirm", confirm: { kind: "addressee" } });
    expect(t.onSend).not.toHaveBeenCalled();
    act(() => t.result.current.confirmAgain());
    act(() => t.input.endOfTurn("Leo stop it", { confidence: 0.95 }));
    expect(t.result.current.state.confirm?.kind).toBe("addressee");
    act(() => t.result.current.confirmAgain());
    act(() => t.input.endOfTurn("fish", { confidence: 0.3 }));
    expect(t.result.current.state.confirm).toMatchObject({ kind: "unsure", text: "fish" });
    act(() => t.result.current.confirmSend());
    expect(t.onSend).toHaveBeenCalledWith("fish", expect.objectContaining({ via: "voice" }));
  });

  it("leaving the screen closes the mic and stops its reply", async () => {
    const t = tutor();
    await flush();
    act(() => t.result.current.mic());
    act(() => {
      t.result.current.reply().write("One. Two");
    });
    await flush();
    t.unmount();
    expect(t.input.listening).toBe(false);
    expect(t.out.state).toBe("idle");
  });
});
