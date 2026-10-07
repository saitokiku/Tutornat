import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sentenceFeed } from "./chunk";
import { elevenLabsSpeechOut, pcm16ToFloat32, ttsSocketUrl, type TtsToken } from "./elevenlabs";
import { alignmentFor, asAudio, asWebSocket, FakeAudio, FakeSocket, fakeOut, pcmBase64 } from "./fakes";

const TOKEN: TtsToken = { token: "sutkn_1", voiceId: "voice1", modelId: "eleven_flash_v2_5", languageCode: "en", outputFormat: "pcm_24000", zeroRetention: false };

const reply = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body }) as Response;

function setup({ fetchStatus = 200, fallback = false } = {}) {
  const audio = new FakeAudio();
  let n = 0;
  const fetch = vi.fn<typeof globalThis.fetch>(async () => reply(fetchStatus, { ...TOKEN, token: `sutkn_${++n}` }));
  const fb = fallback ? fakeOut({ auto: false }) : null;
  const out = elevenLabsSpeechOut({ locale: "en", consent: true, names: ["Ada"], fetch, WebSocket: asWebSocket(FakeSocket), audioContext: asAudio(audio), fallback: fb });
  const seen = { starts: 0, ends: [] as boolean[], words: [] as number[], errors: [] as string[] };
  out.onStart(() => seen.starts++);
  out.onEnd((e) => seen.ends.push(e.cancelled));
  out.onBoundary((i) => seen.words.push(i));
  out.onError((e) => seen.errors.push(e.code));
  return { audio, fetch, fb, out, seen };
}

const flush = () => vi.advanceTimersByTimeAsync(1);

beforeEach(() => {
  vi.useFakeTimers();
  FakeSocket.reset();
});
afterEach(() => vi.useRealTimers());

describe("ElevenLabs streaming read-aloud", () => {
  it("connects with a single-use token and sends each sentence as it completes, without the learner's name", async () => {
    const { fetch, out, seen } = setup();
    void out.speak("Your turn, Ada. Count the dots.");
    await flush();
    const ws = FakeSocket.last();
    const url = new URL(ws.url);
    expect(url.origin + url.pathname).toBe("wss://api.elevenlabs.io/v1/text-to-speech/voice1/stream-input");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ single_use_token: "sutkn_1", model_id: "eleven_flash_v2_5", output_format: "pcm_24000", auto_mode: "true", language_code: "en" });
    ws.open();
    await flush();
    expect(ws.json()).toEqual([
      { text: " ", voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: 0.95 } },
      { text: "Your turn. ", flush: true },
      { text: "Count the dots. ", flush: true },
      { text: "" },
    ]);
    // Our route gets only consent and language; never a name.
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual({ consent: true, locale: "en" });
    expect(JSON.stringify(ws.sent)).not.toContain("Ada");
    expect(out.state).toBe("waiting");
    expect(seen.starts).toBe(0);
  });

  it("plays the audio gap-free, highlights each written word on time, and ends after the last sample", async () => {
    const { audio, out, seen } = setup();
    const done = out.speak("Your turn, Ada. Count the dots.");
    await flush();
    const ws = FakeSocket.last();
    ws.open();
    await flush();
    ws.receive({ audio: pcmBase64(500), alignment: alignmentFor("Your turn. ") });
    ws.receive({ audio: pcmBase64(800), alignment: alignmentFor("Count the dots. ") });
    ws.receive({ isFinal: true });
    expect(seen.starts).toBe(1);
    expect(out.state).toBe("speaking");
    expect(audio.sources.map((s) => +s.at.toFixed(3))).toEqual([0.03, 0.53]);
    audio.currentTime = 0.3;
    await vi.advanceTimersByTimeAsync(30);
    expect(seen.words).toEqual([0, 1]); // "Your", "turn," — "Ada." is never spoken
    audio.currentTime = 1.0;
    await vi.advanceTimersByTimeAsync(30);
    expect(seen.words).toEqual([0, 1, 3, 4]);
    audio.currentTime = 1.05; // "dots." starts 10 characters (0.5 s) into the second chunk
    await vi.advanceTimersByTimeAsync(30);
    expect(seen.words).toEqual([0, 1, 3, 4, 5]);
    expect(seen.ends).toEqual([]);
    audio.currentTime = 1.34;
    await vi.advanceTimersByTimeAsync(30);
    expect(seen.ends).toEqual([false]);
    await done;
    expect(out.state).toBe("idle");
  });

  it("starts speaking while the reply is still being written", async () => {
    const { out } = setup();
    const feed = sentenceFeed();
    void out.speak(feed.sentences);
    feed.write("First, look at the top. The bott");
    await flush();
    const ws = FakeSocket.last();
    ws.open();
    await flush();
    expect(ws.json().slice(1)).toEqual([{ text: "First, look at the top. ", flush: true }]);
    feed.write("om stays the same.");
    feed.end();
    await flush();
    expect(ws.json().slice(1)).toEqual([{ text: "First, look at the top. ", flush: true }, { text: "The bottom stays the same. ", flush: true }, { text: "" }]);
  });

  it("cancel stops the audio and the socket at once", async () => {
    const { audio, out, seen } = setup();
    const done = out.speak("One. Two.");
    await flush();
    const ws = FakeSocket.last();
    ws.open();
    await flush();
    ws.receive({ audio: pcmBase64(500), alignment: alignmentFor("One. ") });
    out.cancel();
    await done;
    expect(audio.sources.every((s) => s.stopped)).toBe(true);
    expect(ws.readyState).toBe(3);
    expect(seen.ends).toEqual([true]);
    expect(out.state).toBe("idle");
  });

  it("a new speak replaces the one in progress", async () => {
    const { out, seen } = setup();
    void out.speak("One.");
    await flush();
    void out.speak("Two.");
    await flush();
    expect(seen.ends).toEqual([true]);
    expect(FakeSocket.all).toHaveLength(2);
  });

  it("pause and resume hold the clock", async () => {
    const { audio, out } = setup();
    void out.speak("One.");
    await flush();
    FakeSocket.last().open();
    await flush();
    FakeSocket.last().receive({ audio: pcmBase64(500), alignment: alignmentFor("One. ") });
    out.pause();
    expect(out.state).toBe("paused");
    expect(audio.state).toBe("suspended");
    out.resume();
    expect(out.state).toBe("speaking");
    expect(audio.state).toBe("running");
  });

  it("without consent the browser voice reads everything", async () => {
    const { out, fb, seen } = setup({ fetchStatus: 403, fallback: true });
    const done = out.speak("Your turn, Ada. Count the dots.");
    await flush();
    await flush();
    expect(seen.errors).toEqual(["consent"]);
    expect(FakeSocket.all).toHaveLength(0);
    expect(fb!.said).toEqual([["Your turn, Ada.", "Count the dots."]]);
    expect(seen.starts).toBe(1);
    fb!.finish();
    await done;
    expect(seen.ends).toEqual([false]);
  });

  it("when the connection drops mid-reply, the fallback reads only what wasn't heard", async () => {
    const { audio, out, fb, seen } = setup({ fallback: true });
    void out.speak("Your turn, Ada. Count the dots.");
    await flush();
    const ws = FakeSocket.last();
    ws.open();
    await flush();
    ws.receive({ audio: pcmBase64(500), alignment: alignmentFor("Your turn. ") });
    ws.drop(1006);
    expect(seen.errors).toEqual(["network"]);
    // The audio we have plays out first.
    await vi.advanceTimersByTimeAsync(100);
    expect(fb!.said).toEqual([]);
    audio.currentTime = 0.6;
    await vi.advanceTimersByTimeAsync(600);
    expect(fb!.said).toEqual([["Count the dots."]]);
    // The fallback's words are numbered after the ones already spoken.
    fb!.boundary(1);
    expect(seen.words.at(-1)).toBe(4);
  });

  it("a service error message hands over to the fallback", async () => {
    const { out, fb, seen } = setup({ fallback: true });
    void out.speak("One. Two.");
    await flush();
    FakeSocket.last().open();
    await flush();
    FakeSocket.last().receive({ error: "quota_exceeded", message: "quota" });
    await flush();
    expect(seen.errors).toEqual(["unavailable"]);
    expect(fb!.said).toEqual([["One.", "Two."]]);
  });

  it("when the browser keeps audio locked (no tap yet), the fallback reads instead of hanging", async () => {
    const { audio, out, fb, seen } = setup({ fallback: true });
    audio.state = "suspended";
    audio.resume = () => new Promise(() => {}); // never settles, as in a browser waiting for a gesture
    void out.speak("One. Two.");
    await vi.advanceTimersByTimeAsync(350);
    expect(seen.errors).toEqual(["speak"]);
    expect(FakeSocket.all).toHaveLength(0);
    expect(fb!.said).toEqual([["One.", "Two."]]);
  });

  it("warm() gets the next token ready so speaking starts sooner", async () => {
    const { fetch, out } = setup();
    out.warm();
    await flush();
    expect(fetch).toHaveBeenCalledTimes(1);
    void out.speak("One.");
    await flush();
    expect(new URL(FakeSocket.last().url).searchParams.get("single_use_token")).toBe("sutkn_1");
  });

  it("ends cleanly for text with nothing to say", async () => {
    const { out, seen } = setup();
    await Promise.all([out.speak("   "), vi.advanceTimersByTimeAsync(10)]);
    expect(seen.ends).toEqual([false]);
  });
});

describe("ElevenLabs helpers", () => {
  it("decodes 16-bit little-endian PCM, carrying an odd byte", () => {
    const b64 = btoa(String.fromCharCode(0x00, 0x80, 0xff, 0x7f, 0x00));
    const a = pcm16ToFloat32(b64);
    expect(Array.from(a.samples)).toEqual([-1, 32767 / 32768]);
    expect(a.carry).toBe(0);
    const b = pcm16ToFloat32(btoa(String.fromCharCode(0x40)), a.carry);
    expect(Array.from(b.samples)).toEqual([0x4000 / 32768]);
    expect(b.carry).toBeNull();
  });

  it("asks for zero retention when configured and leaves out language for other models", () => {
    const url = new URL(ttsSocketUrl({ ...TOKEN, languageCode: null, zeroRetention: true }));
    expect(url.searchParams.get("enable_logging")).toBe("false");
    expect(url.searchParams.has("language_code")).toBe(false);
  });
});
