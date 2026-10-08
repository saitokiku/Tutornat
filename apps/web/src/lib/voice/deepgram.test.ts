import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deepgramSpeechIn, fluxSocketUrl, HEALTHY_MS, novaSocketUrl, SLOW_BYTES, TOKEN_REFRESH_MS } from "./deepgram";
import { asWebSocket, FakeSocket } from "./fakes";
import type { MicCapture } from "./mic";
import { VoiceError, type Band, type TurnMeta } from "./types";

const reply = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body }) as Response;

function setup({ tokenStatus = 200, tokenBody = null as unknown, micError = null as VoiceError | null, band = "69" as Band, model = "nova-3" } = {}) {
  let n = 0;
  const fetch = vi.fn<typeof globalThis.fetch>(async () => reply(tokenStatus, tokenBody ?? { token: `jwt${++n}`, expiresIn: 60, model, language: "en-US" }));
  const mic = { onFrame: null as ((pcm: Int16Array, level: number, frameLevel: number) => void) | null, stop: vi.fn(), level: 0.42, startedAt: 1000 };
  const capture: MicCapture = async ({ onFrame }) => {
    if (micError) throw micError;
    mic.onFrame = onFrame;
    return { level: () => mic.level, startedAt: () => mic.startedAt, stop: mic.stop };
  };
  const input = deepgramSpeechIn({ locale: "en", consent: true, under13: true, names: ["Ada"], band, fetch, WebSocket: asWebSocket(FakeSocket), capture, now: () => Date.now() });
  const seen = { partial: [] as string[], final: [] as string[], turns: [] as string[], metas: [] as TurnMeta[], eager: [] as string[], resumed: 0, slow: [] as boolean[], speech: 0, errors: [] as string[] };
  input.onPartial((t) => seen.partial.push(t));
  input.onFinal((t) => seen.final.push(t));
  input.onEndOfTurn((t, m) => (seen.turns.push(t), seen.metas.push(m)));
  input.onEagerEnd((t) => seen.eager.push(t));
  input.onTurnResumed(() => seen.resumed++);
  input.onSlow((x) => seen.slow.push(x));
  input.onSpeechStart(() => seen.speech++);
  input.onError((e) => seen.errors.push(e.code));
  return { fetch, mic, input, seen };
}

const flush = () => vi.advanceTimersByTimeAsync(1);
const results = (transcript: string, isFinal: boolean, speechFinal = false) => ({ type: "Results", is_final: isFinal, speech_final: speechFinal, channel: { alternatives: [{ transcript }] } });

async function listening(s: ReturnType<typeof setup>, opts: Parameters<ReturnType<typeof setup>["input"]["start"]>[0] = { turns: "auto" }) {
  const started = s.input.start(opts);
  await flush();
  const ws = FakeSocket.last();
  ws.open();
  await started;
  return ws;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  FakeSocket.reset();
});
afterEach(() => vi.useRealTimers());

describe("Deepgram live listening", () => {
  it("opens the stream with a short-lived token and the turn-taking options, opted out of model training", async () => {
    const s = setup();
    const started = s.input.start({ keyterms: ["numerator", "denominator", "Ada Lovelace", "ADA"] });
    await flush();
    const ws = FakeSocket.last();
    expect(ws.protocols).toEqual(["bearer", "jwt1"]);
    const url = new URL(ws.url);
    expect(url.origin + url.pathname).toBe("wss://api.deepgram.com/v1/listen");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      model: "nova-3", language: "en-US", encoding: "linear16", sample_rate: "16000", channels: "1", interim_results: "true",
      endpointing: "300", utterance_end_ms: "1000", vad_events: "true", filler_words: "true", mip_opt_out: "true",
    });
    // Hints that mention the learner's name never leave the device.
    expect(url.searchParams.getAll("keyterm")).toEqual(["numerator", "denominator"]);
    expect(ws.url).not.toMatch(/ada/i);
    expect(JSON.parse(String(s.fetch.mock.calls[0][1]?.body))).toEqual({ consent: true, under13: true, locale: "en" });
    // Audio from before the socket opened is sent once it does.
    s.mic.onFrame!(new Int16Array([1, 2, 3]), 0.5, 0.5);
    expect(ws.binary()).toHaveLength(0);
    ws.open();
    await started;
    expect(ws.binary()).toHaveLength(1);
    s.mic.onFrame!(new Int16Array([4, 5]), 0.5, 0.5);
    expect(ws.binary().map((b) => Array.from(new Int16Array(b)))).toEqual([[1, 2, 3], [4, 5]]);
    expect(s.input.listening).toBe(true);
    expect(s.input.level()).toBe(0.42);
  });

  it("reports words as they come and ends the turn after a short silence", async () => {
    const s = setup();
    const ws = await listening(s);
    ws.receive({ type: "SpeechStarted", timestamp: 0.1 });
    ws.receive(results("three", false));
    ws.receive(results("Three fourths.", true, true));
    expect(s.seen.speech).toBe(1);
    expect(s.seen.partial).toEqual(["three", "Three fourths."]);
    expect(s.seen.final).toEqual(["Three fourths."]);
    await vi.advanceTimersByTimeAsync(600);
    expect(s.seen.turns).toEqual([]);
    await vi.advanceTimersByTimeAsync(200);
    expect(s.seen.turns).toEqual(["Three fourths."]);
    expect(s.input.listening).toBe(true); // ready for the next turn
  });

  it("an utterance end after finished words ends the turn at once", async () => {
    const s = setup();
    const ws = await listening(s);
    ws.receive(results("Twelve.", true, false));
    ws.receive({ type: "UtteranceEnd", last_word_end: 1.2 });
    expect(s.seen.turns).toEqual(["Twelve."]);
  });

  it("waits through um and and", async () => {
    const s = setup();
    const ws = await listening(s);
    ws.receive(results("I think you add the top and", true, true));
    await vi.advanceTimersByTimeAsync(2500);
    expect(s.seen.turns).toEqual([]);
    ws.receive(results("the bottom stays.", true, true));
    await vi.advanceTimersByTimeAsync(800);
    expect(s.seen.turns).toEqual(["I think you add the top and the bottom stays."]);
  });

  it("gives K–2 longer: the recognizer's full stop is not an ending, and UtteranceEnd doesn't cut in", async () => {
    const s = setup({ band: "k2" });
    const ws = await listening(s);
    expect(new URL(ws.url).searchParams.get("endpointing")).toBe("500");
    expect(new URL(ws.url).searchParams.get("utterance_end_ms")).toBe("1500");
    ws.receive(results("Twelve.", true, true));
    ws.receive({ type: "UtteranceEnd" });
    await vi.advanceTimersByTimeAsync(2100);
    expect(s.seen.turns).toEqual([]);
    await vi.advanceTimersByTimeAsync(200);
    expect(s.seen.turns).toEqual(["Twelve."]);
  });

  it("K–2 'It's.' waits for the rest of the answer", async () => {
    const s = setup({ band: "k2" });
    const ws = await listening(s);
    ws.receive(results("It's.", true, true));
    await vi.advanceTimersByTimeAsync(4000);
    expect(s.seen.turns).toEqual([]);
    ws.receive(results("Seven.", true, true));
    await vi.advanceTimersByTimeAsync(2300);
    expect(s.seen.turns).toEqual(["It's. Seven."]);
  });

  it("a complete spoken answer ends the turn after a short silence, timed from the last word's end", async () => {
    const s = setup({ band: "k2" });
    const ws = await listening(s, { turns: "auto", answer: (t) => /twelve/i.test(t) });
    // The word ended 0.3 s into the stream, which started at 1000 ms: at 1300 ms. The message comes at 1500.
    vi.setSystemTime(1500);
    ws.receive({ ...results("Twelve.", true, true), channel: { alternatives: [{ transcript: "Twelve.", words: [{ word: "twelve", punctuated_word: "Twelve.", start: 0, end: 0.3, confidence: 0.9 }] }] } });
    await vi.advanceTimersByTimeAsync(450);
    expect(s.seen.turns).toEqual([]);
    await vi.advanceTimersByTimeAsync(100);
    expect(s.seen.turns).toEqual(["Twelve."]);
    expect(s.seen.metas[0]).toMatchObject({ confidence: 0.9, lastWordEnd: 1300, words: [{ word: "Twelve.", start: 1000, end: 1300 }] });
  });

  it("push-to-talk: stop() closes the stream and the words so far become the turn", async () => {
    const s = setup();
    const ws = await listening(s, { turns: "manual" });
    ws.receive(results("Twelve.", true, true));
    await vi.advanceTimersByTimeAsync(5000);
    expect(s.seen.turns).toEqual([]);
    s.input.stop();
    expect(s.mic.stop).toHaveBeenCalled();
    expect(ws.json()).toEqual([{ type: "CloseStream" }]);
    ws.receive(results("Is that right?", true, true)); // the last words, flushed by CloseStream
    ws.drop(1000);
    expect(s.seen.turns).toEqual(["Twelve. Is that right?"]);
    expect(s.input.listening).toBe(false);
  });

  it("stop() doesn't wait forever for the service to close", async () => {
    const s = setup();
    const ws = await listening(s, { turns: "manual" });
    ws.receive(results("seven", false));
    s.input.stop();
    await vi.advanceTimersByTimeAsync(1600);
    expect(s.seen.turns).toEqual(["seven"]);
    expect(ws.readyState).toBe(3);
  });

  it("abort() throws away what was heard", async () => {
    const s = setup();
    const ws = await listening(s);
    ws.receive(results("never mind", false));
    s.input.abort();
    await vi.advanceTimersByTimeAsync(5000);
    expect(s.seen.turns).toEqual([]);
    expect(s.input.listening).toBe(false);
    expect(s.mic.stop).toHaveBeenCalled();
  });

  it("is push-to-talk unless asked for hands-free turns", async () => {
    const s = setup();
    const started = s.input.start();
    await flush();
    const ws = FakeSocket.last();
    ws.open();
    await started;
    ws.receive(results("Twelve.", true, true));
    ws.receive({ type: "UtteranceEnd" });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(s.seen.turns).toEqual([]);
    s.input.stop();
    ws.drop(1000);
    expect(s.seen.turns).toEqual(["Twelve."]);
  });

  it("only a refusal that says consent is about consent", async () => {
    const other = setup({ tokenStatus: 403, tokenBody: { error: "origin" } });
    await expect(other.input.start()).rejects.toMatchObject({ code: "unavailable" });
    const busy = setup({ tokenStatus: 429, tokenBody: { error: "rate" } });
    await expect(busy.input.start()).rejects.toMatchObject({ code: "unavailable" });
  });

  it("renews the voice pass once when it has run out", async () => {
    let calls = 0;
    const fetch = vi.fn<typeof globalThis.fetch>(async (url) => {
      if (url === "/api/voice/status") return reply(200, { tts: false, stt: true });
      return ++calls === 1 ? reply(401, { error: "session" }) : reply(200, { token: "jwt", expiresIn: 30, model: "nova-3", language: "en-US" });
    });
    const capture: MicCapture = async () => ({ level: () => 0, startedAt: () => null, stop: vi.fn() });
    const input = deepgramSpeechIn({ locale: "en", consent: true, under13: false, fetch, WebSocket: asWebSocket(FakeSocket), capture });
    const started = input.start();
    await flush();
    FakeSocket.last().open();
    await started;
    expect(fetch.mock.calls.slice(0, 3).map((c) => c[0])).toEqual(["/api/voice/stt-token", "/api/voice/status", "/api/voice/stt-token"]);
    expect(input.listening).toBe(true);
  });

  it("refuses without consent and lets go of the microphone", async () => {
    const s = setup({ tokenStatus: 403, tokenBody: { error: "consent" } });
    await expect(s.input.start()).rejects.toMatchObject({ code: "consent" });
    expect(s.mic.stop).toHaveBeenCalled();
    expect(FakeSocket.all).toHaveLength(0);
    expect(s.seen.errors).toEqual(["consent"]);
    expect(s.input.listening).toBe(false);
  });

  it("says plainly when the microphone was refused", async () => {
    const s = setup({ micError: new VoiceError("denied") });
    await expect(s.input.start()).rejects.toMatchObject({ code: "denied" });
    expect(FakeSocket.all).toHaveLength(0);
  });

  it("reconnects once after a dropped connection, keeping what was said", async () => {
    const s = setup();
    const ws = await listening(s);
    ws.receive(results("I think it's", true, false));
    ws.drop(1006);
    await flush();
    // The token fetched ahead is used: no wait for a new one.
    expect(s.fetch).toHaveBeenCalledTimes(2);
    const ws2 = FakeSocket.last();
    expect(ws2).not.toBe(ws);
    expect(ws2.protocols).toEqual(["bearer", "jwt2"]);
    ws2.open();
    await flush();
    ws2.receive(results("twelve.", true, true));
    await vi.advanceTimersByTimeAsync(800);
    expect(s.seen.turns).toEqual(["I think it's twelve."]);
    // A second drop ends listening, still handing over the words.
    ws2.receive(results("and", false));
    ws2.drop(1006);
    await flush();
    expect(s.seen.errors).toEqual(["network"]);
    expect(s.seen.turns).toEqual(["I think it's twelve.", "and"]);
    expect(s.input.listening).toBe(false);
  });

  it("Spanish uses the language the server chose", () => {
    const url = new URL(novaSocketUrl({ token: "t", expiresIn: 60, model: "nova-3", language: "es-419" }, "35"));
    expect(url.searchParams.get("language")).toBe("es-419");
    expect(url.searchParams.get("endpointing")).toBe("500");
  });

  it("prepare() fetches a token now and every 50 s while the voice surface is open, and stops when it closes", async () => {
    const s = setup();
    const stop = s.input.prepare();
    await flush();
    expect(s.fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(TOKEN_REFRESH_MS * 2 + 10);
    expect(s.fetch).toHaveBeenCalledTimes(3);
    // The token fetched ahead opens the stream without waiting for another (the next one is fetched ahead in turn).
    const started = s.input.start({ turns: "auto" });
    await flush();
    expect(FakeSocket.last().protocols).toEqual(["bearer", "jwt3"]);
    FakeSocket.last().open();
    await started;
    stop();
    const n = s.fetch.mock.calls.length;
    await vi.advanceTimersByTimeAsync(TOKEN_REFRESH_MS * 3);
    expect(s.fetch).toHaveBeenCalledTimes(n);
  });

  it("says when the upload falls behind, and when it catches up", async () => {
    const s = setup();
    const ws = await listening(s);
    (ws as unknown as { bufferedAmount: number }).bufferedAmount = SLOW_BYTES + 1;
    s.mic.onFrame!(new Int16Array(1280), 0.5, 0.5);
    (ws as unknown as { bufferedAmount: number }).bufferedAmount = 0;
    s.mic.onFrame!(new Int16Array(1280), 0.5, 0.5);
    expect(s.seen.slow).toEqual([true, false]);
  });

  it("a connection healthy for 30 s gets its reconnect back", async () => {
    const s = setup();
    const ws = await listening(s);
    ws.drop(1006);
    await flush();
    const ws2 = FakeSocket.last();
    ws2.open();
    await flush();
    await vi.advanceTimersByTimeAsync(HEALTHY_MS + 10);
    ws2.drop(1006);
    await flush();
    expect(s.seen.errors).toEqual([]);
    expect(FakeSocket.all).toHaveLength(3);
  });
});

describe("Deepgram Flux", () => {
  const turn = (event: string, transcript = "") => ({
    type: "TurnInfo",
    event,
    transcript,
    words: transcript ? transcript.split(" ").map((word) => ({ word, confidence: 0.8 })) : [],
    audio_window_start: 0,
    audio_window_end: transcript ? 0.4 * transcript.split(" ").length : 0,
  });

  it("opens /v2/listen with the band's end-of-turn settings", () => {
    for (const [band, eot, timeout, eager] of [
      ["k2", "0.8", "4000", null],
      ["35", "0.75", "3000", "0.55"],
      ["69", "0.7", "2000", "0.55"],
    ] as const) {
      const url = new URL(fluxSocketUrl({ token: "t", expiresIn: 60, model: "flux-general-en", language: "en-US" }, band));
      expect(url.origin + url.pathname).toBe("wss://api.deepgram.com/v2/listen");
      expect(Object.fromEntries(url.searchParams)).toMatchObject({ model: "flux-general-en", encoding: "linear16", sample_rate: "16000", eot_threshold: eot, eot_timeout_ms: timeout, mip_opt_out: "true" });
      expect(url.searchParams.get("eager_eot_threshold")).toBe(eager);
    }
    const multi = new URL(fluxSocketUrl({ token: "t", expiresIn: 60, model: "flux-general-multi", language: "es", languageHint: ["es", "en"] }, "69"));
    expect(multi.searchParams.getAll("language_hint")).toEqual(["es", "en"]);
  });

  it("maps the turn events: start, words, an eager end, a resumed turn, the end with its confidence", async () => {
    const s = setup({ model: "flux-general-en" });
    const ws = await listening(s);
    ws.receive(turn("StartOfTurn"));
    ws.receive(turn("Update", "it is"));
    ws.receive(turn("EagerEndOfTurn", "it is"));
    ws.receive(turn("TurnResumed", "it is"));
    ws.receive(turn("Update", "it is twelve"));
    ws.receive(turn("EndOfTurn", "it is twelve"));
    expect(s.seen.speech).toBe(1);
    expect(s.seen.eager).toEqual(["it is"]);
    expect(s.seen.resumed).toBe(1);
    expect(s.seen.partial.at(-1)).toBe("it is twelve");
    expect(s.seen.turns).toEqual(["it is twelve"]);
    expect(s.seen.metas[0].confidence).toBeCloseTo(0.8, 5);
    expect(s.seen.metas[0].lastWordEnd).toBeCloseTo(1000 + 1200, 5);
  });

  it("'wait' holds the floor: never sent alone, sent with what follows", async () => {
    const s = setup({ model: "flux-general-en" });
    const ws = await listening(s);
    ws.receive(turn("EndOfTurn", "wait"));
    await vi.advanceTimersByTimeAsync(5000);
    expect(s.seen.turns).toEqual([]);
    ws.receive(turn("StartOfTurn"));
    ws.receive(turn("EndOfTurn", "it's seven"));
    expect(s.seen.turns).toEqual(["wait it's seven"]);
    ws.receive(turn("EndOfTurn", "hold on"));
    await vi.advanceTimersByTimeAsync(9000);
    expect(s.seen.turns).toEqual(["wait it's seven"]);
  });

  it("a complete answer ends the turn before Flux would", async () => {
    const s = setup({ model: "flux-general-en", band: "35" });
    const ws = await listening(s, { turns: "auto", answer: (t) => t === "twelve" });
    ws.receive(turn("Update", "twelve"));
    await vi.advanceTimersByTimeAsync(590);
    expect(s.seen.turns).toEqual([]);
    await vi.advanceTimersByTimeAsync(20);
    expect(s.seen.turns).toEqual(["twelve"]);
  });

  it("push-to-talk keeps every piece until stop()", async () => {
    const s = setup({ model: "flux-general-en" });
    const ws = await listening(s, { turns: "manual" });
    ws.receive(turn("EndOfTurn", "three fourths"));
    ws.receive(turn("Update", "no wait"));
    expect(s.seen.turns).toEqual([]);
    s.input.stop();
    ws.drop(1000);
    expect(s.seen.turns).toEqual(["three fourths no wait"]);
  });
});

