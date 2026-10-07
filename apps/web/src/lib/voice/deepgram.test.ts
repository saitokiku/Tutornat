import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deepgramSpeechIn, sttSocketUrl } from "./deepgram";
import { asWebSocket, FakeSocket } from "./fakes";
import type { MicCapture } from "./mic";
import { VoiceError } from "./types";

const reply = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body }) as Response;

function setup({ tokenStatus = 200, micError = null as VoiceError | null, young = false } = {}) {
  let n = 0;
  const fetch = vi.fn<typeof globalThis.fetch>(async () => reply(tokenStatus, { token: `jwt${++n}`, expiresIn: 30, model: "nova-3", language: "en-US" }));
  const mic = { onFrame: null as ((pcm: Int16Array, level: number) => void) | null, stop: vi.fn(), level: 0.42 };
  const capture: MicCapture = async ({ onFrame }) => {
    if (micError) throw micError;
    mic.onFrame = onFrame;
    return { level: () => mic.level, stop: mic.stop };
  };
  const input = deepgramSpeechIn({ locale: "en", consent: true, young, fetch, WebSocket: asWebSocket(FakeSocket), capture });
  const seen = { partial: [] as string[], final: [] as string[], turns: [] as string[], speech: 0, errors: [] as string[] };
  input.onPartial((t) => seen.partial.push(t));
  input.onFinal((t) => seen.final.push(t));
  input.onEndOfTurn((t) => seen.turns.push(t));
  input.onSpeechStart(() => seen.speech++);
  input.onError((e) => seen.errors.push(e.code));
  return { fetch, mic, input, seen };
}

const flush = () => vi.advanceTimersByTimeAsync(1);
const results = (transcript: string, isFinal: boolean, speechFinal = false) => ({ type: "Results", is_final: isFinal, speech_final: speechFinal, channel: { alternatives: [{ transcript }] } });

async function listening(s: ReturnType<typeof setup>, opts?: Parameters<ReturnType<typeof setup>["input"]["start"]>[0]) {
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
    const started = s.input.start({ keyterms: ["numerator", "denominator"] });
    await flush();
    const ws = FakeSocket.last();
    expect(ws.protocols).toEqual(["bearer", "jwt1"]);
    const url = new URL(ws.url);
    expect(url.origin + url.pathname).toBe("wss://api.deepgram.com/v1/listen");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      model: "nova-3", language: "en-US", encoding: "linear16", sample_rate: "16000", channels: "1", interim_results: "true",
      endpointing: "300", utterance_end_ms: "1000", vad_events: "true", filler_words: "true", mip_opt_out: "true",
    });
    expect(url.searchParams.getAll("keyterm")).toEqual(["numerator", "denominator"]);
    expect(JSON.parse(String(s.fetch.mock.calls[0][1]?.body))).toEqual({ consent: true, locale: "en" });
    // Audio from before the socket opened is sent once it does.
    s.mic.onFrame!(new Int16Array([1, 2, 3]), 0.5);
    expect(ws.binary()).toHaveLength(0);
    ws.open();
    await started;
    expect(ws.binary()).toHaveLength(1);
    s.mic.onFrame!(new Int16Array([4, 5]), 0.5);
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

  it("gives young learners longer", async () => {
    const s = setup({ young: true });
    const ws = await listening(s);
    ws.receive(results("Twelve.", true, true));
    await vi.advanceTimersByTimeAsync(800);
    expect(s.seen.turns).toEqual([]);
    await vi.advanceTimersByTimeAsync(400);
    expect(s.seen.turns).toEqual(["Twelve."]);
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

  it("refuses without consent and lets go of the microphone", async () => {
    const s = setup({ tokenStatus: 403 });
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
    const url = new URL(sttSocketUrl({ token: "t", expiresIn: 30, model: "nova-3", language: "es-419" }));
    expect(url.searchParams.get("language")).toBe("es-419");
  });
});
