import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sentenceFeed } from "./chunk";
import { closingMessage, elevenLabsSpeechOut, FEED_IDLE_MS, FIRST_AUDIO_DEADLINE_MS, openingMessage, pcm16ToFloat32, sentenceMessage, ttsSocketUrl, type TtsToken } from "./elevenlabs";
import { alignmentFor, asAudio, asWebSocket, FakeAudio, FakeSocket, pcmBase64 } from "./fakes";
import type { Band } from "./types";

// The ElevenLabs transport against a fake socket and an audio clock the test moves (fake timers move
// Date.now(), which the voice and its player use as performance.now()). Audio is 50 ms per character,
// like alignmentFor's timings, so word times line up with the audio.

const TOKEN: TtsToken = { token: "sutkn_1", voiceId: "voice1", modelId: "eleven_flash_v2_5", languageCode: "en", outputFormat: "pcm_24000", zeroRetention: false };

const reply = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body }) as Response;

function setup({ band = "69" as Band, token = TOKEN } = {}) {
  const audio = new FakeAudio();
  let n = 0;
  const fetch = vi.fn<typeof globalThis.fetch>(async () => reply(200, { ...token, token: `sutkn_${++n}` }));
  const out = elevenLabsSpeechOut({ locale: "en", consent: true, under13: true, names: ["Ada"], band, fetch, WebSocket: asWebSocket(FakeSocket), audioContext: asAudio(audio), now: () => Date.now() });
  const seen = { starts: 0, ends: [] as boolean[], words: [] as number[], scheduled: [] as [number, number][], errors: [] as string[], locked: [] as boolean[], timings: [] as unknown[] };
  out.onStart(() => seen.starts++);
  out.onEnd((e) => seen.ends.push(e.cancelled));
  out.onBoundary((i) => seen.words.push(i));
  out.onWordScheduled((i, at) => seen.scheduled.push([i, at]));
  out.onError((e) => seen.errors.push(e.code));
  out.onLocked((l) => seen.locked.push(l));
  out.onTiming((t) => seen.timings.push(t));
  const advance = async (ms: number) => {
    for (let t = 0; t < ms; t += 5) {
      audio.advance(5);
      await vi.advanceTimersByTimeAsync(5);
    }
  };
  return { audio, fetch, out, seen, advance };
}

/** The server's reply to one sentence: its audio and timings. */
const say = (ws: FakeSocket, text: string) => ws.receive({ audio: pcmBase64(text.length * 50), alignment: alignmentFor(text) });

const flush = () => vi.advanceTimersByTimeAsync(1);

beforeEach(() => {
  vi.useFakeTimers();
  FakeSocket.reset();
});
afterEach(() => vi.useRealTimers());

describe("ElevenLabs streaming read-aloud", () => {
  it("opens with a single-use token and sends each sentence without flushing it, and never the learner's name", async () => {
    const { fetch, out, seen } = setup();
    void out.speak("Your turn, Ada. Count the dots.");
    await flush();
    const ws = FakeSocket.last();
    const url = new URL(ws.url);
    expect(url.origin + url.pathname).toBe("wss://api.elevenlabs.io/v1/text-to-speech/voice1/stream-input");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ single_use_token: "sutkn_1", model_id: "eleven_flash_v2_5", output_format: "pcm_24000", auto_mode: "true", sync_alignment: "true", language_code: "en" });
    ws.open();
    await flush();
    expect(ws.json()).toEqual([
      { text: " ", voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0, use_speaker_boost: true, speed: 1 } },
      { text: "Your turn. " },
      { text: "Count the dots. " },
      { text: "" },
    ]);
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual({ consent: true, under13: true, locale: "en" });
    expect(JSON.stringify(ws.sent)).not.toContain("Ada");
    expect(out.state).toBe("waiting");
    expect(seen.starts).toBe(0);
  });

  it("K–2 on Flash speaks at 0.94, never slower", async () => {
    const { out } = setup({ band: "k2" });
    void out.speak("Count the dots.");
    await flush();
    FakeSocket.last().open();
    await flush();
    expect(FakeSocket.last().json()[0]).toMatchObject({ voice_settings: { speed: 0.94 } });
  });

  it("plays, highlights each written word when it is heard, schedules it with the output latency, and ends after the last sample", async () => {
    const { audio, out, seen, advance } = setup();
    audio.outputLatency = 0.1;
    const done = out.speak("Your turn, Ada. Count the dots.");
    await flush();
    const ws = FakeSocket.last();
    ws.open();
    await flush();
    say(ws, "Your turn. ");
    say(ws, "Count the dots. ");
    ws.receive({ isFinal: true });
    expect(seen.starts).toBe(1);
    expect(out.state).toBe("speaking");
    // Every spoken word is scheduled at once, with when it will be heard; "Ada." is never spoken.
    expect(seen.scheduled.map(([w]) => w)).toEqual([0, 1, 3, 4, 5]);
    const t0 = Date.now();
    expect(seen.scheduled[0][1]).toBe(t0 + 50 + 100);
    await advance(400);
    expect(seen.words).toEqual([0, 1]);
    expect(out.heardUpTo()).toBe(0);
    await advance(2000);
    expect(seen.words).toEqual([0, 1, 3, 4, 5]);
    await done;
    expect(seen.ends).toEqual([false]);
    expect(out.heardUpTo()).toBe(5);
    expect(out.state).toBe("idle");
    expect(seen.timings.at(-1)).toMatchObject({ vendor: "elevenlabs", retried: false });
  });

  it("starts speaking while the reply is still being written", async () => {
    const { out, seen } = setup();
    const feed = sentenceFeed();
    void out.speak(feed.sentences);
    await flush();
    const ws = FakeSocket.last();
    ws.open();
    feed.write("Look at the top number. Now the");
    await flush();
    expect(ws.json().slice(1)).toEqual([{ text: "Look at the top number. " }]);
    say(ws, "Look at the top number. ");
    expect(seen.starts).toBe(1);
    feed.write(" bottom one.");
    feed.end();
    await flush();
    expect(ws.json().slice(2)).toEqual([{ text: "Now the bottom one. " }, { text: "" }]);
  });

  it("when the socket drops, retries once from the first sentence not heard, in the same voice", async () => {
    const { out, seen, advance } = setup();
    const done = out.speak("One two. Three four. Five six.");
    await flush();
    const first = FakeSocket.last();
    first.open();
    await flush();
    say(first, "One two. ");
    say(first, "Three"); // the second sentence's audio is cut off
    first.drop();
    await flush();
    const second = FakeSocket.last();
    expect(second).not.toBe(first);
    expect(new URL(second.url).pathname).toContain("/voice1/");
    expect(new URL(second.url).searchParams.get("single_use_token")).not.toBe(new URL(first.url).searchParams.get("single_use_token"));
    second.open();
    await flush();
    expect(second.json().slice(1)).toEqual([{ text: "Three four. " }, { text: "Five six. " }, { text: "" }]);
    say(second, "Three four. ");
    say(second, "Five six. ");
    second.receive({ isFinal: true });
    await advance(3000);
    await done;
    expect(seen.errors).toEqual([]);
    expect(seen.scheduled.map(([w]) => w)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(seen.ends).toEqual([false]);
  });

  it("a second failure stops speaking and leaves the words on screen: no other voice takes over", async () => {
    const { out, seen } = setup();
    const done = out.speak("One two. Three four.");
    await flush();
    FakeSocket.last().open();
    await flush();
    FakeSocket.last().drop();
    await flush();
    FakeSocket.last().open();
    await flush();
    FakeSocket.last().receive({ error: "quota" });
    await done;
    expect(seen.errors).toEqual(["speak"]);
    expect(seen.ends).toEqual([true]);
    expect(out.state).toBe("idle");
    expect(FakeSocket.all).toHaveLength(2);
  });

  it("retries when no audio arrives within two seconds of the first sentence", async () => {
    const { out } = setup();
    void out.speak("One two.");
    await flush();
    FakeSocket.last().open();
    await flush();
    await vi.advanceTimersByTimeAsync(FIRST_AUDIO_DEADLINE_MS - 50);
    expect(FakeSocket.all).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(100);
    expect(FakeSocket.all).toHaveLength(2);
  });

  it("retries when the audio clock stops (iOS interrupted the audio)", async () => {
    const { audio, out, advance } = setup();
    void out.speak("One two three four five.");
    await flush();
    const ws = FakeSocket.last();
    ws.open();
    await flush();
    say(ws, "One two three four five. ");
    await advance(100);
    audio.state = "interrupted";
    await vi.advanceTimersByTimeAsync(50);
    expect(FakeSocket.all).toHaveLength(2);
  });

  it("an aborted signal stops it with a fade", async () => {
    const { audio, out, seen, advance } = setup();
    const ctl = new AbortController();
    const done = out.speak("One two three four.", { signal: ctl.signal });
    await flush();
    const ws = FakeSocket.last();
    ws.open();
    await flush();
    say(ws, "One two three four. ");
    await advance(100);
    ctl.abort();
    await done;
    expect(seen.ends).toEqual([true]);
    expect(audio.gains[0].gain.lastRamp()).toMatchObject({ value: 0 });
    expect(ws.readyState).toBe(3);
  });

  it("a new speak replaces the one in progress, and its events carry its own run id", async () => {
    const { out } = setup();
    const runs: number[] = [];
    out.onEnd((_, run) => runs.push(run));
    const a = out.speak("One.");
    const b = out.speak("Two.");
    expect(b.id).toBe(a.id + 1);
    await a;
    expect(runs).toEqual([a.id]);
  });

  it("while audio is locked it waits for a tap instead of reading in another voice", async () => {
    const { audio, out, seen } = setup();
    audio.state = "suspended";
    audio.resume = async () => {}; // no tap yet: resume never takes
    void out.speak("Hello there.");
    await vi.advanceTimersByTimeAsync(400);
    expect(out.locked).toBe(true);
    expect(seen.locked).toEqual([true]);
    expect(FakeSocket.all).toHaveLength(0);
    audio.state = "running";
    out.warm();
    await flush();
    expect(seen.locked).toEqual([true, false]);
    expect(FakeSocket.all).toHaveLength(1);
  });

  it("ends a reply whose text stopped coming once what was sent has played", async () => {
    const { out, seen, advance } = setup();
    const feed = sentenceFeed();
    void out.speak(feed.sentences);
    await flush();
    const ws = FakeSocket.last();
    ws.open();
    feed.write("One two. ");
    await flush();
    say(ws, "One two. ");
    await advance(1000);
    expect(seen.ends).toEqual([]);
    await vi.advanceTimersByTimeAsync(FEED_IDLE_MS);
    expect(ws.json().at(-1)).toEqual({ text: "" });
    ws.receive({ isFinal: true });
    await advance(100);
    expect(seen.ends).toEqual([false]);
  });

  it("duck lowers the voice and unduck brings it back", async () => {
    const { audio, out, advance } = setup();
    void out.speak("One two three four five six.");
    await flush();
    const ws = FakeSocket.last();
    ws.open();
    await flush();
    say(ws, "One two three four five six. ");
    await advance(100);
    out.duck(0.3, 80);
    expect(audio.gains[0].gain.lastRamp()).toMatchObject({ value: 0.3 });
    out.unduck(250);
    expect(audio.gains[0].gain.lastRamp()).toMatchObject({ value: 1 });
  });

  it("warm() never throws and gets the next token ready", async () => {
    const { audio, fetch, out } = setup();
    audio.createBuffer = () => {
      throw new Error("no audio");
    };
    expect(() => out.warm()).not.toThrow();
    await flush();
    expect(fetch).toHaveBeenCalledTimes(1);
    void out.speak("Hi.");
    await flush();
    expect(fetch).toHaveBeenCalledTimes(2); // the spare is used, the next one fetched
  });

  it("ends cleanly for text with nothing to say", async () => {
    const { out, seen } = setup();
    await out.speak("**");
    expect(seen.ends).toEqual([false]);
  });
});

describe("ElevenLabs messages", () => {
  it("decodes 16-bit little-endian PCM, carrying an odd byte", () => {
    const b64 = btoa(String.fromCharCode(0x00, 0x40, 0x00));
    const a = pcm16ToFloat32(b64);
    expect(Array.from(a.samples)).toEqual([0.5]);
    expect(a.carry).toBe(0);
    const b = pcm16ToFloat32(btoa(String.fromCharCode(0xc0)), a.carry);
    expect(Array.from(b.samples)).toEqual([-0.5]);
  });

  it("asks for zero retention when configured", () => {
    expect(new URL(ttsSocketUrl({ ...TOKEN, zeroRetention: true })).searchParams.get("enable_logging")).toBe("false");
    expect(new URL(ttsSocketUrl({ ...TOKEN, languageCode: null })).searchParams.has("language_code")).toBe(false);
  });

  it("the v4 Turbo dialogue socket: one voice, a short first sentence flushed, a new turn at the end", () => {
    const t: TtsToken = { ...TOKEN, modelId: "eleven_v4_turbo", transport: "dialogue", zeroRetention: true };
    const url = new URL(ttsSocketUrl(t));
    expect(url.origin + url.pathname).toBe("wss://api.elevenlabs.io/v1/text-to-dialogue/stream-input");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ model_id: "eleven_v4_turbo", sync_alignment: "true", enable_logging: "false" });
    expect(openingMessage(t, "69")).toEqual({ inputs: [{ text: " ", voice_id: "voice1" }], voice_settings: { stability: 0.5 } });
    expect(sentenceMessage(t, "Which part is tricky?", true)).toEqual({ inputs: [{ text: "Which part is tricky? ", voice_id: "voice1" }], flush: true });
    expect(sentenceMessage(t, "Which part is tricky?", false)).toEqual({ inputs: [{ text: "Which part is tricky? ", voice_id: "voice1" }] });
    expect(closingMessage(t)).toEqual({ inputs: [{ text: "", voice_id: "voice1", new_turn: true }], flush: true });
  });
});
