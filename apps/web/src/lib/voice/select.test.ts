import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeIn } from "./fakes";
import { isYoung, mayBeUnder13, voice, voiceDisclosure, voiceStatus, withFallback } from "./select";
import { VoiceError } from "./types";

const reply = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body }) as Response;
const statusFetch = (body: unknown, status = 200) => vi.fn<typeof fetch>(async () => reply(status, body));

class Utt {
  constructor(public text: string) {}
}
class Rec {}

beforeEach(() => {
  vi.stubGlobal("speechSynthesis", { speak: vi.fn(), cancel: vi.fn(), pause: vi.fn(), resume: vi.fn(), getVoices: () => [] });
  vi.stubGlobal("SpeechSynthesisUtterance", Utt);
  vi.stubGlobal("webkitSpeechRecognition", Rec);
  vi.stubGlobal("AudioContext", class {});
  vi.stubGlobal("AudioWorkletNode", class {});
  vi.stubGlobal("WebSocket", class {});
  Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia: vi.fn() }, configurable: true });
});
afterEach(() => vi.unstubAllGlobals());

describe("choosing a voice", () => {
  it("uses the vendors when they are set up and a grown-up allowed the microphone", async () => {
    const f = statusFetch({ tts: true, stt: true });
    const v = await voice({ locale: "en", consent: true, under13: true, names: ["Ada"], fetch: f });
    expect(v.vendor).toEqual({ out: "elevenlabs", in: "deepgram" });
    expect(v.allowed).toBe(true);
    expect(voiceDisclosure(v)).toEqual(["voice.source.deepgram", "voice.source.elevenlabs"]);
    // The status check is a plain GET: nothing about the learner goes with it.
    expect(f).toHaveBeenCalledWith("/api/voice/status", { cache: "no-store" });
  });

  it("under 13 without a grown-up's consent: no microphone, the browser reads aloud, no vendor is asked", async () => {
    const f = statusFetch({ tts: true, stt: true });
    const v = await voice({ locale: "en", consent: false, under13: true, fetch: f });
    expect(v.vendor).toEqual({ out: "browser", in: null });
    expect(v.in).toBeNull();
    expect(v.allowed).toBe(false);
    expect(f).not.toHaveBeenCalled();
    expect(voiceDisclosure(v)).toEqual(["voice.source.readOnly", "voice.source.browserRead"]);
  });

  it("13 and over: the vendor voice may read aloud, but the microphone still needs the grown-up's setting", async () => {
    const off = await voice({ locale: "es", consent: false, under13: false, fetch: statusFetch({ tts: true, stt: true }) });
    expect(off.vendor).toEqual({ out: "elevenlabs", in: null });
    expect(off.in).toBeNull();
    expect(voiceDisclosure(off)).toEqual(["voice.source.readOnly", "voice.source.elevenlabs"]);
    const on = await voice({ locale: "es", consent: true, under13: false, fetch: statusFetch({ tts: true, stt: true }) });
    expect(on.vendor).toEqual({ out: "elevenlabs", in: "deepgram" });
  });

  it("falls back to the browser when nothing is set up or the status check fails", async () => {
    const a = await voice({ locale: "en", consent: true, under13: true, fetch: statusFetch({ tts: false, stt: false }) });
    expect(a.vendor).toEqual({ out: "browser", in: "browser" });
    expect(voiceDisclosure(a)).toEqual(["voice.source.browser", "voice.source.browserRead"]);
    const b = await voice({ locale: "en", consent: true, under13: true, fetch: statusFetch({}, 500) });
    expect(b.vendor).toEqual({ out: "browser", in: "browser" });
    const broken = vi.fn(async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    expect(await voiceStatus(broken)).toEqual({ tts: false, stt: false });
  });

  it("uses browser listening when this browser can't stream the microphone", async () => {
    vi.stubGlobal("AudioWorkletNode", undefined);
    const v = await voice({ locale: "en", consent: true, under13: true, fetch: statusFetch({ tts: true, stt: true }) });
    expect(v.vendor).toEqual({ out: "elevenlabs", in: "browser" });
  });

  it("uses the browser voice where Web Audio is missing (older iPads)", async () => {
    vi.stubGlobal("AudioContext", undefined);
    const v = await voice({ locale: "en", consent: true, under13: true, fetch: statusFetch({ tts: true, stt: false }) });
    expect(v.vendor.out).toBe("browser");
  });

  it("has no voice at all where the browser has none", async () => {
    vi.stubGlobal("speechSynthesis", undefined);
    vi.stubGlobal("webkitSpeechRecognition", undefined);
    const v = await voice({ locale: "en", consent: true, under13: true, fetch: statusFetch({ tts: false, stt: false }) });
    expect(v.out).toBeNull();
    expect(v.in).toBeNull();
    expect(voiceDisclosure(v)).toEqual([]);
  });

  it("knows who may be under 13 and who is young", () => {
    expect(mayBeUnder13("K")).toBe(true);
    expect(mayBeUnder13("8")).toBe(true);
    expect(mayBeUnder13("9")).toBe(false);
    expect(mayBeUnder13("adult")).toBe(false);
    expect(isYoung("2")).toBe(true);
    expect(isYoung("5")).toBe(true);
    expect(isYoung("6")).toBe(false);
  });
});

describe("listening falls back to the browser", () => {
  function pair(failWith: VoiceError | null) {
    const primary = fakeIn({ kind: "deepgram" });
    const backup = fakeIn({ kind: "browser" });
    primary.listening = backup.listening = false;
    primary.start = async () => {
      if (!failWith) return void (primary.listening = true);
      primary.error(failWith);
      throw failWith;
    };
    const make = vi.fn(() => backup);
    const input = withFallback(primary, make);
    const seen = { errors: [] as string[], turns: [] as string[] };
    input.onError((e) => seen.errors.push(e.code));
    input.onEndOfTurn((t) => seen.turns.push(t));
    return { primary, backup, make, input, seen };
  }

  it("uses the vendor while it works", async () => {
    const p = pair(null);
    await p.input.start();
    expect(p.input.kind).toBe("deepgram");
    expect(p.input.listening).toBe(true);
    p.primary.endOfTurn("twelve");
    expect(p.seen.turns).toEqual(["twelve"]);
    expect(p.make).not.toHaveBeenCalled();
  });

  it("when the vendor can't be reached, the browser's recognizer takes over without an error to show", async () => {
    for (const code of ["network", "unavailable"] as const) {
      const p = pair(new VoiceError(code));
      await p.input.start();
      expect(p.input.kind).toBe("browser");
      expect(p.input.listening).toBe(true);
      expect(p.seen.errors).toEqual([]);
      p.backup.endOfTurn("twelve");
      p.primary.endOfTurn("not this one");
      expect(p.seen.turns).toEqual(["twelve"]);
    }
  });

  it("a refused microphone or consent is not the vendor's fault: no switch, the error is shown", async () => {
    for (const code of ["denied", "consent"] as const) {
      const p = pair(new VoiceError(code));
      await expect(p.input.start()).rejects.toMatchObject({ code });
      expect(p.input.kind).toBe("deepgram");
      expect(p.seen.errors).toEqual([code]);
      expect(p.make).not.toHaveBeenCalled();
    }
  });

  it("after the vendor's connection drops mid-turn, the next start uses the browser", async () => {
    const p = pair(null);
    await p.input.start();
    p.primary.error(new VoiceError("network"));
    expect(p.seen.errors).toEqual(["network"]);
    await p.input.start();
    expect(p.input.kind).toBe("browser");
  });

  it("with no browser recognizer, the vendor's error stands", async () => {
    const primary = fakeIn({ kind: "deepgram" });
    primary.start = async () => {
      throw new VoiceError("network");
    };
    const input = withFallback(primary, () => null);
    const errors: string[] = [];
    input.onError((e) => errors.push(e.code));
    await expect(input.start()).rejects.toMatchObject({ code: "network" });
    expect(errors).toEqual(["network"]);
  });
});
