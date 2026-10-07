import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isYoung, mayBeUnder13, voice, voiceDisclosure, voiceStatus } from "./select";

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
  it("uses the vendors when they are set up and voice is allowed", async () => {
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
    expect(voiceDisclosure(v)).toEqual(["voice.source.readOnly"]);
  });

  it("13 and over need no separate consent", async () => {
    const v = await voice({ locale: "es", consent: false, under13: false, fetch: statusFetch({ tts: true, stt: true }) });
    expect(v.vendor).toEqual({ out: "elevenlabs", in: "deepgram" });
  });

  it("falls back to the browser when nothing is set up or the status check fails", async () => {
    const a = await voice({ locale: "en", consent: true, under13: true, fetch: statusFetch({ tts: false, stt: false }) });
    expect(a.vendor).toEqual({ out: "browser", in: "browser" });
    expect(voiceDisclosure(a)).toEqual(["voice.source.browser"]);
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
