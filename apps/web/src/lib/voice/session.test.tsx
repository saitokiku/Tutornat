import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useVoiceSession, type SessionOptions } from "./session";

// Browser voice doubles: the deployment has no vendor, so the session runs on speechSynthesis and
// SpeechRecognition, which the test drives.

class Utt {
  lang = "";
  voice = null;
  rate = 1;
  volume = 1;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onboundary: ((e: { name: string; charIndex: number }) => void) | null = null;
  constructor(public text: string) {}
}

const synth = {
  queue: [] as Utt[],
  speak: vi.fn((u: Utt) => void synth.queue.push(u)),
  cancel: vi.fn(() => {
    synth.queue = [];
  }),
  pause: vi.fn(),
  resume: vi.fn(),
  getVoices: () => [],
};

class Rec {
  static all: Rec[] = [];
  lang = "";
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  onstart: (() => void) | null = null;
  onresult: ((e: unknown) => void) | null = null;
  onspeechstart: (() => void) | null = null;
  onspeechend: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  start = vi.fn(() => queueMicrotask(() => this.onstart?.()));
  stop = vi.fn(() => queueMicrotask(() => this.onend?.()));
  abort = vi.fn();
  results: { isFinal: boolean; 0: { transcript: string }; length: number }[] = [];
  constructor() {
    Rec.all.push(this);
  }
  hear(transcript: string, isFinal: boolean) {
    const last = this.results[this.results.length - 1];
    const r = { isFinal, 0: { transcript }, length: 1 };
    if (last && !last.isFinal) this.results[this.results.length - 1] = r;
    else this.results.push(r);
    this.onresult?.({ resultIndex: 0, results: this.results });
  }
}

const flush = () => act(() => vi.advanceTimersByTimeAsync(5));

function mount(over: Partial<SessionOptions> = {}) {
  const onTurn = vi.fn();
  const onBargeIn = vi.fn();
  const hook = renderHook((p: SessionOptions) => useVoiceSession(p), {
    initialProps: { locale: "en", consent: true, under13: true, names: ["Ada"], onTurn, onBargeIn, ...over },
  });
  return { ...hook, onTurn, onBargeIn };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  synth.queue = [];
  Rec.all = [];
  vi.clearAllMocks();
  vi.stubGlobal("speechSynthesis", synth);
  vi.stubGlobal("SpeechSynthesisUtterance", Utt);
  vi.stubGlobal("webkitSpeechRecognition", Rec);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ tts: false, stt: false }) })),
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useVoiceSession", () => {
  it("chooses the browser voice and says where voice goes", async () => {
    const { result } = mount();
    expect(result.current.ready).toBe(false);
    await flush();
    expect(result.current).toMatchObject({ ready: true, canSpeak: true, canListen: true, allowed: true, vendor: { out: "browser", in: "browser" } });
    expect(result.current.disclosure).toEqual(["voice.source.browser"]);
  });

  it("without a grown-up's consent an under-13 learner gets read-aloud only", async () => {
    const { result } = mount({ consent: false });
    await flush();
    expect(result.current).toMatchObject({ canSpeak: true, canListen: false, allowed: false });
    expect(result.current.disclosure).toEqual(["voice.source.readOnly"]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reads aloud with speaking state and the current word", async () => {
    const { result } = mount();
    await flush();
    await act(async () => {
      void result.current.say("Count the dots.");
      await vi.advanceTimersByTimeAsync(5);
    });
    expect(synth.queue.map((u) => u.text)).toEqual(["Count the dots."]);
    act(() => synth.queue[0].onstart!());
    expect(result.current.speaking).toBe(true);
    act(() => synth.queue[0].onboundary!({ name: "word", charIndex: 6 }));
    expect(result.current.word).toBe(1);
    act(() => synth.queue[0].onend!());
    expect(result.current.speaking).toBe(false);
    expect(result.current.word).toBeNull();
  });

  it("listens, shows what it hears, and hands over the finished turn", async () => {
    const { result, onTurn } = mount();
    await flush();
    await act(() => result.current.listen());
    expect(result.current.listening).toBe(true);
    const rec = Rec.all[0];
    act(() => rec.hear("twelve", false));
    expect(result.current.heard).toBe("twelve");
    act(() => rec.hear("twelve.", true));
    await act(() => vi.advanceTimersByTimeAsync(800));
    expect(onTurn).toHaveBeenCalledWith("twelve.");
    expect(result.current.heard).toBe("");
  });

  it("push-to-talk: done() turns what was said into the turn", async () => {
    const { result, onTurn } = mount();
    await flush();
    await act(() => result.current.listen({ turns: "manual" }));
    act(() => Rec.all[0].hear("seven", true));
    await act(async () => {
      result.current.done();
      await vi.advanceTimersByTimeAsync(5);
    });
    expect(onTurn).toHaveBeenCalledWith("seven");
    expect(result.current.listening).toBe(false);
  });

  it("talking over the tutor stops it; mhm doesn't", async () => {
    const { result, onBargeIn } = mount();
    await flush();
    await act(() => result.current.listen());
    await act(async () => {
      void result.current.say("So we split the bar into four equal parts.");
      await vi.advanceTimersByTimeAsync(5);
    });
    act(() => synth.queue[0].onstart!());
    const rec = Rec.all[0];
    act(() => rec.onspeechstart!());
    act(() => rec.hear("mhm", false));
    await act(() => vi.advanceTimersByTimeAsync(500));
    expect(synth.cancel).not.toHaveBeenCalled();
    act(() => rec.hear("mhm wait why four", false));
    expect(synth.cancel).toHaveBeenCalled();
    expect(onBargeIn).toHaveBeenCalledOnce();
    expect(result.current.speaking).toBe(false);
  });

  it("reports a refused microphone", async () => {
    const { result } = mount();
    await flush();
    await act(async () => {
      const p = result.current.listen();
      await Promise.resolve();
      Rec.all[0].start.mockImplementation(() => {});
      Rec.all[0].onerror!({ error: "not-allowed" });
      await p;
    });
    expect(result.current.error).toBe("denied");
    expect(result.current.listening).toBe(false);
  });

  it("stops speaking and listening when the screen goes away", async () => {
    const { result, unmount } = mount();
    await flush();
    await act(() => result.current.listen());
    await act(async () => {
      void result.current.say("One. Two.");
      await vi.advanceTimersByTimeAsync(5);
    });
    act(() => synth.queue[0].onstart!());
    unmount();
    expect(synth.cancel).toHaveBeenCalled();
    expect(Rec.all[0].abort).toHaveBeenCalled();
  });
});
