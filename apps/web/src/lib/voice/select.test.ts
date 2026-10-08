import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bandOf } from "./bands";
import { fakeIn } from "./fakes";
import { mayBeUnder13, voice, voiceDisclosure, voiceStatus, withFallback } from "./select";
import { VoiceError } from "./types";

const reply = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body }) as Response;
const statusFetch = (body: unknown, status = 200) => vi.fn<typeof fetch>(async () => reply(status, body));

class Utt {
  constructor(public text: string) {}
}
class Rec {}

const v = (name: string, lang: string, localService = true) => ({ name, lang, localService, voiceURI: name, default: false });
/** A Mac with its plain voices (Tier B), a robot, and Google's online ones. */
const PLAIN = [v("Samantha", "en-US"), v("Paulina", "es-MX"), v("Zarvox", "en-US"), v("Google US English", "en-US", false)];
const NATURAL = [v("Ava (Premium)", "en-US"), v("Paulina (Enhanced)", "es-MX")];

const voices = (list: ReturnType<typeof v>[]) => vi.stubGlobal("speechSynthesis", { speak: vi.fn(), cancel: vi.fn(), pause: vi.fn(), resume: vi.fn(), getVoices: () => list });

const ALL = { tts: true, ttsEs: true, stt: true };

beforeEach(() => {
  voices(PLAIN);
  vi.stubGlobal("SpeechSynthesisUtterance", Utt);
  vi.stubGlobal("webkitSpeechRecognition", Rec);
  vi.stubGlobal("AudioContext", class {});
  vi.stubGlobal("AudioWorkletNode", class {});
  vi.stubGlobal("WebSocket", class {});
  Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia: vi.fn() }, configurable: true });
});
afterEach(() => vi.unstubAllGlobals());

const setup = { band: "35" as const };

describe("choosing a voice", () => {
  it("uses the vendors when they are set up and a grown-up allowed the microphone; conversation mode is allowed", async () => {
    const f = statusFetch(ALL);
    const r = await voice({ ...setup, locale: "en", consent: true, under13: true, names: ["Ada"], fetch: f });
    expect(r.vendor).toEqual({ out: "elevenlabs", in: "deepgram" });
    expect(r).toMatchObject({ allowed: true, tier: "A", autoRead: true, conversation: true, tip: false });
    expect(r.deviceOut).toBeNull(); // no natural browser voice to fall back on for the next reply
    expect(voiceDisclosure(r)).toEqual(["voice.source.deepgram", "voice.source.vendorRead"]);
    // The status check is a plain GET: nothing about the learner goes with it.
    expect(f).toHaveBeenCalledWith("/api/voice/status", { cache: "no-store" });
  });

  it("under 13 without a grown-up's consent: no microphone, no vendor asked, no online voice; a plain voice reads only on a tap", async () => {
    const f = statusFetch(ALL);
    const r = await voice({ ...setup, locale: "en", consent: false, under13: true, fetch: f });
    expect(r.vendor).toEqual({ out: "browser", in: null });
    expect(r).toMatchObject({ allowed: false, tier: "B", autoRead: false, conversation: false, tip: true });
    expect(f).not.toHaveBeenCalled();
    expect(voiceDisclosure(r)).toEqual(["voice.source.readOnly", "voice.source.browserRead"]);
    // With only Google's online voice on offer, there is no voice at all: text only, never online.
    voices([v("Google US English", "en-US", false), v("Zarvox", "en-US")]);
    const none = await voice({ ...setup, locale: "en", consent: false, under13: true, fetch: f });
    expect(none.out).toBeNull();
    expect(none.tier).toBeNull();
  });

  it("13 and over: the vendor voice may read aloud, but the microphone still needs the grown-up's setting", async () => {
    const off = await voice({ ...setup, locale: "es", consent: false, under13: false, fetch: statusFetch(ALL) });
    expect(off.vendor).toEqual({ out: "elevenlabs", in: null });
    expect(off.conversation).toBe(false);
    expect(voiceDisclosure(off)).toEqual(["voice.source.readOnly", "voice.source.vendorRead"]);
    const on = await voice({ ...setup, locale: "es", consent: true, under13: false, fetch: statusFetch(ALL) });
    expect(on.vendor).toEqual({ out: "elevenlabs", in: "deepgram" });
  });

  it("Spanish uses the vendor voice only when a Spanish voice is set up", async () => {
    const r = await voice({ ...setup, locale: "es", consent: true, under13: true, fetch: statusFetch({ tts: true, ttsEs: false, stt: true }) });
    expect(r.vendor.out).toBe("browser");
    expect(r.conversation).toBe(false); // Paulina is a plain voice
  });

  it("a natural browser voice with vendor listening allows conversation; it is also the next reply's voice if the vendor fails", async () => {
    voices(NATURAL);
    const browserOnly = await voice({ ...setup, locale: "en", consent: true, under13: true, fetch: statusFetch({ tts: false, stt: true }) });
    expect(browserOnly).toMatchObject({ tier: "A", autoRead: true, conversation: true, tip: false });
    expect(browserOnly.vendor).toEqual({ out: "browser", in: "deepgram" });
    const vendor = await voice({ ...setup, locale: "en", consent: true, under13: true, fetch: statusFetch(ALL) });
    expect(vendor.deviceOut?.tier).toBe("A");
  });

  it("falls back to the browser when nothing is set up or the status check fails", async () => {
    const a = await voice({ ...setup, locale: "en", consent: true, under13: true, fetch: statusFetch({ tts: false, stt: false }) });
    expect(a.vendor).toEqual({ out: "browser", in: "browser" });
    expect(a.conversation).toBe(false); // the browser's recognizer is half duplex
    expect(voiceDisclosure(a)).toEqual(["voice.source.browser", "voice.source.browserRead"]);
    const b = await voice({ ...setup, locale: "en", consent: true, under13: true, fetch: statusFetch({}, 500) });
    expect(b.vendor).toEqual({ out: "browser", in: "browser" });
    const broken = vi.fn(async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    expect(await voiceStatus(broken)).toEqual({ tts: false, stt: false });
  });

  it("uses browser listening when this browser can't stream the microphone", async () => {
    vi.stubGlobal("AudioWorkletNode", undefined);
    const r = await voice({ ...setup, locale: "en", consent: true, under13: true, fetch: statusFetch(ALL) });
    expect(r.vendor).toEqual({ out: "elevenlabs", in: "browser" });
    expect(r.conversation).toBe(false);
  });

  it("uses the browser voice where Web Audio is missing (older iPads)", async () => {
    vi.stubGlobal("AudioContext", undefined);
    const r = await voice({ ...setup, locale: "en", consent: true, under13: true, fetch: statusFetch({ tts: true, stt: false }) });
    expect(r.vendor.out).toBe("browser");
  });

  it("has no voice at all where the browser has none", async () => {
    vi.stubGlobal("speechSynthesis", undefined);
    vi.stubGlobal("webkitSpeechRecognition", undefined);
    const r = await voice({ ...setup, locale: "en", consent: true, under13: true, fetch: statusFetch({ tts: false, stt: false }) });
    expect(r.out).toBeNull();
    expect(r.in).toBeNull();
    expect(voiceDisclosure(r)).toEqual([]);
  });

  it("knows who may be under 13, and the three bands", () => {
    expect(mayBeUnder13("K")).toBe(true);
    expect(mayBeUnder13("8")).toBe(true);
    expect(mayBeUnder13("9")).toBe(false);
    expect(mayBeUnder13("adult")).toBe(false);
    expect(["K", "1", "2", "3", "5", "6", "9", "adult"].map(bandOf)).toEqual(["k2", "k2", "k2", "35", "35", "69", "69", "69"]);
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
