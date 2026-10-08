import { afterEach, describe, expect, it, vi } from "vitest";
import en from "@/i18n/en";
import { fakeIn } from "./fakes";
import {
  createResampler,
  judgeLevels,
  levelOf,
  levelOutOfTen,
  listenSelfTest,
  listenTestKey,
  micCapture,
  micError,
  micOffKey,
  micSelfTest,
  rms,
  selfTestKey,
  smoothLevel,
  toInt16,
  voiceErrorKey,
  type MicCapture,
} from "./mic";
import { VoiceError, type VoiceErrorCode } from "./types";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("audio math", () => {
  it("measures loudness", () => {
    expect(rms(new Float32Array([0, 0, 0]))).toBe(0);
    expect(rms(new Float32Array([0.5, -0.5]))).toBeCloseTo(0.5);
    expect(levelOf(0)).toBe(0);
    expect(levelOf(1)).toBe(1);
    expect(levelOf(0.001)).toBe(0); // −60 dBFS
    expect(levelOf(0.0316)).toBeCloseTo(0.5, 2); // −30 dBFS
    expect(levelOutOfTen(0.54)).toBe(5);
    expect(smoothLevel(0.2, 0.8)).toBe(0.8);
    expect(smoothLevel(0.8, 0)).toBeCloseTo(0.64);
  });

  it("converts to 16-bit and clips", () => {
    expect(Array.from(toInt16(new Float32Array([0, 1, -1, 2, -2, 0.5])))).toEqual([0, 32767, -32768, 32767, -32768, 16383]);
  });

  it("downsamples 48 kHz to 16 kHz across frame boundaries without losing time", () => {
    const r = createResampler(48000, 16000);
    let total = 0;
    for (let i = 0; i < 10; i++) total += r(new Float32Array(2048).fill(0.25)).length;
    expect(Math.abs(total - (10 * 2048) / 3)).toBeLessThanOrEqual(1);
    const out = r(new Float32Array(300).fill(0.25));
    expect(out.every((v) => Math.abs(v - 0.25) < 1e-6)).toBe(true);
  });

  it("downsamples 44.1 kHz too", () => {
    const r = createResampler(44100, 16000);
    let total = 0;
    for (let i = 0; i < 20; i++) total += r(new Float32Array(2048)).length;
    expect(Math.abs(total - (20 * 2048 * 16000) / 44100)).toBeLessThanOrEqual(1);
  });
});

describe("microphone errors", () => {
  it.each([
    ["NotAllowedError", "denied"],
    ["SecurityError", "denied"],
    ["NotFoundError", "no-device"],
    ["OverconstrainedError", "no-device"],
    ["NotReadableError", "busy"],
    ["TypeError", "unsupported"],
    ["Weird", "unavailable"],
  ])("%s → %s", (name, code) => {
    expect(micError({ name }).code).toBe(code);
  });

  it("has a message for every error and self-test result", () => {
    const codes: VoiceErrorCode[] = ["unsupported", "denied", "no-device", "busy", "network", "consent", "unavailable", "speak"];
    for (const c of codes) expect(en[voiceErrorKey(c)], c).toBeTruthy();
    for (const s of ["ok", "quiet", "silent", "denied"] as const) expect(en[selfTestKey(s)], s).toBeTruthy();
    expect(en[listenTestKey({ status: "words", text: "hi" })]).toContain("{text}");
    expect(en[listenTestKey({ status: "nothing" })]).toBeTruthy();
    expect(listenTestKey({ status: "network" })).toBe("voice.fail.network");
    // No "Typing always works." boilerplate on any of them.
    for (const c of codes) expect(en[voiceErrorKey(c)], c).not.toMatch(/Typing always works/);
    expect(en[micOffKey("idle")]).toBeTruthy();
    expect(en[micOffKey("hidden")]).toBeTruthy();
  });
});

describe("listening self-test", () => {
  it("shows the words the recognizer heard", async () => {
    vi.useFakeTimers();
    const input = fakeIn();
    const start = vi.spyOn(input, "start");
    input.stop = () => {
      input.listening = false;
      queueMicrotask(() => input.endOfTurn("I had eggs"));
    };
    const p = listenSelfTest(input, { durationMs: 5000 });
    await vi.advanceTimersByTimeAsync(1000);
    input.partial("I had");
    await vi.advanceTimersByTimeAsync(4000);
    expect(await p).toEqual({ status: "words", text: "I had eggs" });
    expect(start).toHaveBeenCalledWith({ turns: "manual" });
  });

  it("says when no words came through, and reports a refused microphone", async () => {
    vi.useFakeTimers();
    const quiet = fakeIn();
    const p = listenSelfTest(quiet, { durationMs: 1000 });
    await vi.advanceTimersByTimeAsync(3100);
    expect(await p).toEqual({ status: "nothing" });
    const refused = fakeIn();
    refused.start = async () => {
      throw new VoiceError("denied");
    };
    expect(await listenSelfTest(refused)).toEqual({ status: "denied" });
  });
});

describe("mic self-test", () => {
  it("judges what it heard", () => {
    expect(judgeLevels([0.1, 0.6, 0.7, 0.65, 0.7, 0.6, 0.62, 0.1], 43).status).toBe("ok");
    expect(judgeLevels([0.05, 0.3, 0.35, 0.1], 43).status).toBe("quiet");
    expect(judgeLevels([0, 0.02, 0.05], 43).status).toBe("silent");
    expect(judgeLevels([], 43)).toEqual({ status: "silent", peak: 0, speechMs: 0 });
    // One loud click is not a voice.
    expect(judgeLevels([0, 0.9, 0, 0], 43).status).toBe("quiet");
  });

  it("listens for the given time, then stops the microphone", async () => {
    vi.useFakeTimers();
    const stop = vi.fn();
    const onLevel = vi.fn();
    const capture: MicCapture = async ({ onFrame }) => {
      const timer = setInterval(() => onFrame(new Int16Array(683), 0.7, 0.7), 43);
      return {
        level: () => 0.7,
        startedAt: () => null,
        stop: () => {
          clearInterval(timer);
          stop();
        },
      };
    };
    const result = micSelfTest({ durationMs: 3000, capture, onLevel });
    await vi.advanceTimersByTimeAsync(3000);
    const r = await result;
    expect(r.status).toBe("ok");
    expect(r.speechMs).toBeGreaterThan(2500);
    expect(stop).toHaveBeenCalledOnce();
    expect(onLevel).toHaveBeenCalledWith(0.7);
  });

  it("a cough is not a voice, even though the meter lingers after it", async () => {
    vi.useFakeTimers();
    // What micCapture does with each frame: the meter rises at once and falls gently.
    const frames = [0, 0, 0.9, 0.9, 0.9, 0.9, ...Array(60).fill(0)]; // ≈170 ms of loud sound
    const meter: number[] = [];
    const capture: MicCapture = async ({ onFrame }) => {
      let level = 0;
      let i = 0;
      const timer = setInterval(() => {
        const frameLevel = frames[i++] ?? 0;
        level = smoothLevel(level, frameLevel);
        meter.push(level);
        onFrame(new Int16Array(683), level, frameLevel);
      }, 43);
      return { level: () => level, startedAt: () => null, stop: () => clearInterval(timer) };
    };
    const result = micSelfTest({ durationMs: 3000, capture });
    await vi.advanceTimersByTimeAsync(3000);
    const r = await result;
    expect(meter.filter((l) => l >= 0.5).length * 43).toBeGreaterThanOrEqual(250); // the meter alone would have passed it
    expect(r.status).toBe("quiet");
    expect(r.speechMs).toBeLessThan(250);
  });

  it("reports a refused microphone instead of throwing", async () => {
    const capture: MicCapture = async () => {
      throw new VoiceError("denied");
    };
    expect((await micSelfTest({ capture })).status).toBe("denied");
  });

  it("stops early when aborted", async () => {
    const ac = new AbortController();
    const capture: MicCapture = async () => ({ level: () => 0, startedAt: () => null, stop: vi.fn() });
    const p = micSelfTest({ durationMs: 60_000, capture, signal: ac.signal });
    ac.abort();
    expect((await p).status).toBe("silent");
  });
});

describe("micCapture", () => {
  function fakeAudio() {
    const port: { onmessage: ((e: MessageEvent<Float32Array>) => void) | null } = { onmessage: null };
    const track = { stop: vi.fn() };
    const stream = { getTracks: () => [track] } as unknown as MediaStream;
    const getUserMedia = vi.fn(async () => stream);
    const ctx = {
      state: "running",
      sampleRate: 48000,
      destination: {},
      resume: vi.fn(async () => {}),
      close: vi.fn(async () => {}),
      audioWorklet: { addModule: vi.fn(async () => {}) },
      createMediaStreamSource: vi.fn(() => ({ connect: vi.fn(), disconnect: vi.fn() })),
    };
    class Node {
      port = port;
      connect = vi.fn();
      disconnect = vi.fn();
    }
    const nodes: { options?: { processorOptions?: { size?: number } } }[] = [];
    class TapNode extends Node {
      constructor(_ctx: unknown, _name: string, public options?: { processorOptions?: { size?: number } }) {
        super();
        nodes.push(this);
      }
    }
    vi.stubGlobal("AudioWorkletNode", TapNode);
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: vi.fn(() => "blob:tap"), revokeObjectURL: vi.fn() }));
    return { port, track, getUserMedia, ctx, nodes, audioContext: () => ctx as unknown as AudioContext };
  }

  it("asks for echo-cancelled mono audio and streams 80 ms frames of 16 kHz audio with a level, on the shared context", async () => {
    const a = fakeAudio();
    const frames: Int16Array[] = [];
    let clock = 5000;
    const cap = await micCapture({ onFrame: (f) => frames.push(f), mediaDevices: { getUserMedia: a.getUserMedia }, audioContext: a.audioContext, now: () => clock });
    expect(a.getUserMedia).toHaveBeenCalledWith({ audio: expect.objectContaining({ echoCancellation: true, noiseSuppression: true, channelCount: 1 }) });
    // 80 ms at 48 kHz in, 1280 samples at 16 kHz out.
    expect(a.nodes[0].options?.processorOptions?.size).toBe(3840);
    expect(cap.startedAt()).toBeNull();
    a.port.onmessage?.({ data: new Float32Array(3840).fill(0.1) } as MessageEvent<Float32Array>);
    expect(cap.startedAt()).toBe(5000 - 80);
    clock += 80;
    a.port.onmessage?.({ data: new Float32Array(3840).fill(0.1) } as MessageEvent<Float32Array>);
    expect(cap.startedAt()).toBe(5000 - 80);
    expect(frames).toHaveLength(2);
    expect(Math.abs(frames[0].length - 1280)).toBeLessThanOrEqual(1);
    expect(cap.level()).toBeGreaterThan(0.6);
    cap.stop();
    expect(a.track.stop).toHaveBeenCalled();
    // The context is the app's: the microphone never closes it.
    expect(a.ctx.close).not.toHaveBeenCalled();
    expect(cap.level()).toBe(0);
    // A second capture on the same context doesn't register the tap again.
    await micCapture({ onFrame: vi.fn(), mediaDevices: { getUserMedia: a.getUserMedia }, audioContext: a.audioContext });
    expect(a.ctx.audioWorklet.addModule).toHaveBeenCalledTimes(1);
  });

  it("gives up after 300 ms when the audio can't be resumed outside a tap", async () => {
    vi.useFakeTimers();
    try {
      const a = fakeAudio();
      a.ctx.state = "suspended";
      a.ctx.resume = vi.fn(() => new Promise<void>(() => {}));
      const started = micCapture({ onFrame: vi.fn(), mediaDevices: { getUserMedia: a.getUserMedia }, audioContext: a.audioContext });
      const caught = started.catch((e) => e);
      await vi.advanceTimersByTimeAsync(310);
      expect(await caught).toMatchObject({ code: "unavailable" });
      expect(a.track.stop).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("turns a refused permission into a VoiceError", async () => {
    const a = fakeAudio();
    a.getUserMedia.mockRejectedValueOnce(Object.assign(new Error("no"), { name: "NotAllowedError" }));
    await expect(micCapture({ onFrame: vi.fn(), mediaDevices: { getUserMedia: a.getUserMedia }, audioContext: a.audioContext })).rejects.toMatchObject({ code: "denied" });
  });

  it("is unsupported without getUserMedia", async () => {
    await expect(micCapture({ onFrame: vi.fn(), mediaDevices: {} as MediaDevices })).rejects.toMatchObject({ code: "unsupported" });
  });
});
