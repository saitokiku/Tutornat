// @vitest-environment jsdom
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { act, renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { ItemBody } from "@/practice/types";
import { readSpoken } from "@/practice/spoken";
import { resetAudioForTests } from "@/lib/voice/audio";
import { ANSWER_END_MS, BANDS, FLUX } from "@/lib/voice/bands";
import { deepgramSpeechIn } from "@/lib/voice/deepgram";
import { elevenLabsSpeechOut, type TtsToken } from "@/lib/voice/elevenlabs";
import { alignmentFor, FakeAudio, FakeSocket, pcmBase64 } from "@/lib/voice/fakes";
import { GATES, percentile, SEGMENT_BUDGET_MS, type VoiceMetric } from "@/lib/voice/metrics";
import type { MicCapture } from "@/lib/voice/mic";
import { UNSPOKEN } from "@/lib/voice/numbers";
import { VoiceProvider, type VoiceLearner } from "@/lib/voice/root";
import type { Voice } from "@/lib/voice/select";
import { speakable } from "@/lib/voice/speakable";
import { useTutorVoice, type SendInfo, type TutorVoice } from "@/lib/voice/tutor-voice";
import type { Band } from "@/lib/voice/types";
import { SCRIPT } from "./voice-script";

// This suite needs a DOM (it renders the hook), and under jsdom report.ts's `new URL(…, import.meta.url)`
// is jsdom's URL, which node's fileURLToPath refuses: the same report files, written from here.
const OUT = `${import.meta.dirname}/out/`;
function writeReport(suite: string, data: { summary: Record<string, unknown> } & Record<string, unknown>, markdown: string) {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(`${OUT}${suite}.json`, `${JSON.stringify(data, null, 2)}\n`);
  writeFileSync(`${OUT}${suite}.md`, markdown);
  appendFileSync(`${OUT}history.jsonl`, `${JSON.stringify({ suite, at: new Date().toISOString(), ...data.summary })}\n`);
  return OUT;
}
const ms = (x: number | null) => (x === null ? "–" : `${Math.round(x)} ms`);

// The latency eval (live tutor spec §7.4). Mock mode, the default, runs the code that ships on a
// virtual clock: useTutorVoice (the state machine, converse, the commit-gated speculative reply, the
// latency marks and the metric it posts), the Deepgram adapter (Flux and Nova message parsing, its own
// end-of-turn rules, word timing), the ElevenLabs transport and the player. Around it, the parts that
// need a vendor or a network are scripted from assumed distributions:
//
//   MEASURED (the code under test decides it)    ASSUMED (until P0 / real runs replace them)
//   when the turn ends, given recognizer events  when Flux sends Eager/EndOfTurn after the last word
//   the speculative send, its hold and commit    how long Flux takes to recognize and deliver (lag)
//   the first sentence's release (chunker)       network round trip, server time, model first token
//   prebuffer, output latency, playback start    tool-step time, tokens per second
//   barge-in onset from 20 ms mic blocks, duck,  the vendor's time to first audio after a sentence
//   stop on the first real word                  (vendor time: one segment, never the total)
//
// Each turn's truth comes from the script: the learner's real last word end → the first sound at the
// speaker (the scheduled sample plus output latency). The product's own metric (what the page posts to
// /api/voice/metric) is reported beside it: on Flux its last word end is the end of the audio window
// where the word first showed, later than the real one, so its eot and total read short by up to one
// Update — the report shows by how much. A share of turns starts with a tool step (a second model
// call before any words); they are reported apart and the gates hold for answer turns without one, as
// spec §2.3 budgets them. The acknowledgement (the learner's bubble on screen) needs the screen: it is
// measured in phase B's TutorChat component test, not here.
//
// EVAL_REAL=1 with ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID: the 30-line script through the live
// stream-input socket, timing the vendor's first audio. Flux end-of-turn on recorded child speech needs
// the P0 recordings (blocked on keys).

const REAL = process.env.EVAL_REAL === "1";
const TURNS = Number(process.env.VOICE_TURNS) || 200;
const NOVA_TURNS = Math.max(20, Math.round(TURNS / 4));
const BARGES = 40;

type Range = [number, number];
export type Profile = {
  rtt: number;
  serverMs: number;
  ttft: [number, number];
  /** A leading tool step: the tool call's tokens and the second call's first token. */
  toolStep: [number, number];
  toolShare: number;
  tps: [number, number];
  tts: [number, number];
  ttsNext: number;
  connect: number;
  sttConnect: number;
  outputLatency: number;
  flux: { lag: number; updateMs: number; recognizeMs: number; eager: Range; eagerToEnd: Range; end: Record<Band, Range>; resumedShare: number; startMs: number };
  nova: { lag: number; interimMs: number };
};

export const HOME_WIFI: Profile = {
  rtt: 40,
  serverMs: 60,
  ttft: [600, 150],
  toolStep: [900, 200],
  toolShare: 0.2,
  tps: [90, 15],
  tts: [200, 60],
  ttsNext: 60,
  connect: 120,
  sttConnect: 100,
  outputLatency: 0.02,
  flux: {
    lag: 120, // Flux's processing plus half the round trip, per message
    updateMs: 240,
    recognizeMs: 80, // a word shows in the first Update whose audio runs this far past its end
    eager: [250, 450], // EagerEndOfTurn after the last word (3–9)
    eagerToEnd: [150, 450], // EndOfTurn after the eager end
    end: { k2: [1000, 1600], "35": [700, 1100], "69": [600, 900] }, // EndOfTurn when there is no eager end
    resumedShare: 0.1,
    startMs: 150,
  },
  nova: { lag: 100, interimMs: 200 },
};

/** A seeded random source, so a run is repeatable. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const REPLIES = [
  "Look at the bottom number. It tells how many equal parts there are. Which part is tricky?",
  "Twelve is right. You counted each dot once. Do you want another one?",
  "Not yet. Count the tens first, then the ones. How many tens are there?",
  "The top number is 3. So you shade 3 parts out of 4. Can you shade them?",
];

/** The problem waiting for an answer: 12. */
const ITEM: Pick<ItemBody, "answer" | "choices" | "input"> = { answer: { kind: "number", value: 12 }, input: "keypad" };

type Word = { word: string; start: number; end: number };
type Turn = { band: Band; stt: "flux" | "nova"; tool: boolean; resumed: boolean; trueEot: number | null; trueTotal: number | null; product: VoiceMetric["segments"] | null };
type Barge = { duck: number; stop: number };

const now = () => performance.now();
const at = (t: number, fn: () => void) => setTimeout(fn, Math.max(0, t - now()));

async function measure(band: Band, stt: "flux" | "nova", turns: number, profile: Profile, seed: number): Promise<{ turns: Turn[]; barges: Barge[] }> {
  const r = rng(seed);
  const normal = ([mean, sd]: [number, number]) => Math.max(mean * 0.3, mean + sd * Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r()));
  const uniform = ([lo, hi]: Range) => lo + (hi - lo) * r();

  const audio = new FakeAudio();
  audio.outputLatency = profile.outputLatency;
  const t0 = now();
  Object.defineProperty(audio, "currentTime", { get: () => (now() - t0) / 1000 });
  resetAudioForTests(() => audio as unknown as AudioContext);

  // ---- the vendors' sockets

  class TtsServer extends FakeSocket {
    private answered = 0;
    private lastAt = 0;
    constructor(url: string) {
      super(url);
      setTimeout(() => this.open(), profile.connect);
    }
    send(d: unknown) {
      super.send(d);
      const m = JSON.parse(String(d)) as { text?: string };
      if (m.text === " ") return;
      const t = now();
      const when = Math.max(t + (this.answered++ === 0 ? normal(profile.tts) : profile.ttsNext), this.lastAt + profile.ttsNext);
      this.lastAt = when;
      if (m.text === "") return void at(when, () => this.readyState === 1 && this.receive({ isFinal: true }));
      const text = m.text ?? "";
      at(when, () => this.readyState === 1 && this.receive({ audio: pcmBase64(text.length * 60), alignment: alignmentFor(text, 60) }));
    }
  }

  const sttSocket = { current: null as SttServer | null }; // the socket the recognizer opened last
  class SttServer extends FakeSocket {
    constructor(url: string, protocols?: string | string[]) {
      super(url, protocols);
      sttSocket.current = this;
      setTimeout(() => this.open(), profile.sttConnect);
    }
    send(d: unknown) {
      super.send(d);
      if (typeof d === "string" && (JSON.parse(d) as { type?: string }).type === "CloseStream") setTimeout(() => this.close(1000), profile.flux.lag);
    }
  }

  // ---- the microphone: 20 ms blocks with levels, 80 ms frames; loud while the learner speaks

  let micStart = 0;
  const loud: Range[] = [];
  const capture: MicCapture = async ({ onFrame, onLevel }) => {
    micStart = now();
    let k = 0;
    const timer = setInterval(() => {
      const blockAt = micStart + k * 20;
      onLevel?.(loud.some(([a, b]) => blockAt >= a && blockAt < b) ? 0.75 : 0.05, blockAt);
      if (++k % 4 === 0) onFrame(new Int16Array(1280), 0.1, 0.1);
    }, 20);
    return { level: () => 0.1, startedAt: () => micStart, stop: () => clearInterval(timer) };
  };

  const ttsToken: TtsToken = { token: "t", voiceId: "v", modelId: "eleven_flash_v2_5", languageCode: "en", outputFormat: "pcm_24000", zeroRetention: false };
  const metrics: VoiceMetric[] = [];
  const fetch = (async (url: string, init?: RequestInit) => {
    if (url === "/api/voice/metric") metrics.push(JSON.parse(String(init?.body)) as VoiceMetric);
    if (url === "/api/voice/stt-token") return new Response(JSON.stringify({ token: "jwt", expiresIn: 60, model: stt === "flux" ? "flux-general-en" : "nova-3", language: "en-US" }), { status: 200 });
    return new Response(JSON.stringify(ttsToken), { status: 200 });
  }) as typeof globalThis.fetch;
  vi.stubGlobal("fetch", fetch);

  const out = elevenLabsSpeechOut({ locale: "en", consent: true, under13: false, band, fetch, WebSocket: TtsServer as unknown as typeof WebSocket, audioContext: () => audio as unknown as AudioContext, now });
  const input = deepgramSpeechIn({ locale: "en", consent: true, under13: false, band, fetch, WebSocket: SttServer as unknown as typeof WebSocket, capture, now });
  const audible: number[] = [];
  out.onTiming((t) => t.firstAudibleAt != null && audible.push(t.firstAudibleAt));
  const voice: Voice = { out, in: input, vendor: { out: "elevenlabs", in: "deepgram" }, allowed: true, tier: "A", autoRead: true, conversation: true, deviceOut: null, tip: false };
  const learner: VoiceLearner = { id: "eval", locale: "en", grade: band === "k2" ? "1" : band === "35" ? "4" : "7", consent: true, names: [], siblings: [] };

  // ---- the tutor route and the model, as onSend sees them

  let requests: { cancel: () => void }[] = [];
  let tool = false;
  const hook: { current: TutorVoice | null } = { current: null };
  const onSend = (_text: string, info: SendInfo) => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    requests.push({ cancel: () => timers.forEach(clearTimeout) });
    const reply = REPLIES[Math.floor(r() * REPLIES.length)];
    const tokens = reply.match(/.{1,4}/g)!;
    const first = profile.rtt / 2 + profile.serverMs + normal(profile.ttft) + (tool ? normal(profile.toolStep) : 0) + profile.rtt / 2;
    const gap = 1000 / normal(profile.tps);
    timers.push(setTimeout(() => hook.current?.markFirstToken(), first));
    tokens.forEach((t, i) => timers.push(setTimeout(() => info.reply.write(t), first + i * gap)));
    timers.push(setTimeout(() => info.reply.end(), first + tokens.length * gap));
  };
  const stopAll = () => {
    requests.forEach((q) => q.cancel());
    requests = [];
  };

  // A .ts file: no JSX, so the provider gets its children as a prop.
  // eslint-disable-next-line react/no-children-prop
  const wrapper = ({ children }: { children: ReactNode }) => createElement(VoiceProvider, { learner, build: async () => voice, children });
  const { result, unmount } = renderHook(
    () =>
      useTutorVoice({
        onSend,
        onAbortRequest: stopAll,
        onStopReply: stopAll,
        answer: (t) => readSpoken(t, ITEM, "en"),
        mode: band === "k2" ? "conversation" : "tap",
      }),
    { wrapper },
  );
  const step = async (msIn: number) => {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(msIn);
    });
    hook.current = result.current;
  };
  await step(5);

  // ---- what the recognizer sends for one utterance

  // Each utterance's messages go to the socket that heard it (a later socket never gets an old turn),
  // in that socket's stream time (seconds since the capture's first sample: its first frame sent).
  const fluxTo = (sock: SttServer | null, base: number, s: number) => (event: string, windowEnd: number, said: Word[]) =>
    at(windowEnd + profile.flux.lag, () =>
      sock?.readyState === 1 &&
      sock.receive({ type: "TurnInfo", event, transcript: said.map((w) => w.word).join(" "), words: said.map((w) => ({ word: w.word, confidence: 0.9 })), audio_window_start: (s - base) / 1000, audio_window_end: (windowEnd - base) / 1000 }),
    );

  function fluxSays(ws: Word[], s: number, endAt: number, eagerAt: number | null) {
    const send = fluxTo(sttSocket.current, micStart, s);
    const heard = (t: number) => ws.filter((w) => w.end + profile.flux.recognizeMs <= t);
    send("StartOfTurn", s + profile.flux.startMs, []);
    for (let u = s + profile.flux.updateMs; u < endAt; u += profile.flux.updateMs) send("Update", u, heard(u));
    if (eagerAt != null) send("EagerEndOfTurn", eagerAt, heard(eagerAt));
    send("EndOfTurn", endAt, ws);
  }

  function novaSays(ws: Word[], lastEnd: number) {
    const sock = sttSocket.current;
    const base = micStart;
    const results = (said: Word[], final: boolean) => ({
      type: "Results",
      is_final: final,
      speech_final: final,
      channel: { alternatives: [{ transcript: said.map((w) => w.word).join(" "), words: said.map((w) => ({ word: w.word.replace(/[.,]$/, "").toLowerCase(), punctuated_word: w.word, start: (w.start - base) / 1000, end: (w.end - base) / 1000, confidence: 0.9 })) }] },
    });
    at(ws[0].start + 100 + profile.nova.lag, () => sock?.readyState === 1 && sock.receive({ type: "SpeechStarted" }));
    for (let u = ws[0].start + profile.nova.interimMs; u < lastEnd + 300; u += profile.nova.interimMs) {
      const said = ws.filter((w) => w.end <= u);
      if (said.length) at(u + profile.nova.lag, () => sock?.readyState === 1 && sock.receive(results(said, false)));
    }
    // Endpointing: the final comes this long after the last word (NOVA settings, by band).
    const endpointing = band === "69" ? 300 : 500;
    at(lastEnd + endpointing + profile.nova.lag, () => sock?.readyState === 1 && sock.receive(results(ws, true)));
  }

  /** The learner says "It's twelve." starting at s (and, when resumed, "hundred" after the eager end). */
  function learnerSays(s: number, resumed: boolean): { lastEnd: number } {
    const ws: Word[] = [
      { word: "It's", start: s, end: s + 250 },
      { word: stt === "nova" ? "twelve." : "twelve", start: s + 300, end: s + 700 },
    ];
    loud.push([s, s + 700]);
    let lastEnd = s + 700;
    if (stt === "nova") {
      novaSays(ws, lastEnd);
      return { lastEnd };
    }
    const eagerOn = FLUX[band].eagerThreshold != null;
    if (!eagerOn) {
      fluxSays(ws, s, lastEnd + uniform(profile.flux.end[band]), null);
      return { lastEnd };
    }
    const eagerAt = lastEnd + uniform(profile.flux.eager);
    if (!resumed) {
      fluxSays(ws, s, eagerAt + uniform(profile.flux.eagerToEnd), eagerAt);
      return { lastEnd };
    }
    // An eager end, then the learner goes on: TurnResumed takes the speculative request back.
    const more = { word: "hundred", start: eagerAt + 150, end: eagerAt + 550 };
    loud.push([more.start, more.end]);
    lastEnd = more.end;
    const eager2 = lastEnd + uniform(profile.flux.eager);
    const all = [...ws, more];
    const send = fluxTo(sttSocket.current, micStart, s);
    send("StartOfTurn", s + profile.flux.startMs, []);
    for (let u = s + profile.flux.updateMs; u < eagerAt; u += profile.flux.updateMs) send("Update", u, ws.filter((w) => w.end + profile.flux.recognizeMs <= u));
    send("EagerEndOfTurn", eagerAt, ws);
    send("TurnResumed", more.start + profile.flux.startMs, ws);
    for (let u = more.start + profile.flux.updateMs; u < eager2; u += profile.flux.updateMs) send("Update", u, all.filter((w) => w.end + profile.flux.recognizeMs <= u));
    send("EagerEndOfTurn", eager2, all);
    send("EndOfTurn", eager2 + uniform(profile.flux.eagerToEnd), all);
    return { lastEnd };
  }

  const settled = () => ["idle", "listening", "micOff"].includes(result.current.state.phase);
  const out_: Turn[] = [];
  for (let n = 0; n < turns; n++) {
    for (let k = 0; k < 200 && !settled(); k++) await step(50);
    const phase = result.current.state.phase;
    if (phase === "idle" || phase === "micOff") await act(async () => result.current.mic());
    await step(50);
    tool = r() < profile.toolShare;
    const resumed = stt === "flux" && FLUX[band].eagerThreshold != null && r() < profile.flux.resumedShare;
    const s = now() + 350;
    const heardBefore = audible.length;
    const metricsBefore = metrics.length;
    const { lastEnd } = learnerSays(s, resumed);
    let eotAt: number | null = null;
    for (let k = 0; k < 200; k++) {
      await step(50);
      if (eotAt == null && result.current.state.phase === "thinking" && !result.current.state.turn?.speculative) eotAt = result.current.state.turn?.endedAt ?? null;
      if (audible.length > heardBefore) break;
    }
    await step(50); // the metric posts with the first sound
    const first = audible.length > heardBefore ? audible[heardBefore] : null;
    out_.push({ band, stt, tool, resumed, trueEot: eotAt != null ? eotAt - lastEnd : null, trueTotal: first != null ? first - lastEnd : null, product: metrics.length > metricsBefore ? metrics[metrics.length - 1].segments : null });
    // The first sound is all this measures: stop the reply (as the Stop button would) and go on.
    if (!settled()) await act(async () => result.current.stopVoice());
    await step(300);
  }

  // ---- barge-in: conversation mode, the learner talks over the reply; onset is when they start
  const barges: Barge[] = [];
  if (stt === "flux") {
    await act(async () => result.current.setMode("conversation"));
    for (let n = 0; n < BARGES; n++) {
      for (let k = 0; k < 200 && !settled(); k++) await step(50);
      if (result.current.state.phase !== "listening") await act(async () => result.current.mic());
      await step(50);
      tool = false;
      learnerSays(now() + 350, false);
      for (let k = 0; k < 160 && result.current.state.phase !== "speaking"; k++) await step(50);
      if (result.current.state.phase !== "speaking") continue;
      await step(600);
      let duckAt: number | null = null;
      let stopAt: number | null = null;
      const d = out.duck.bind(out);
      out.duck = (g: number, m: number) => ((duckAt ??= now()), d(g, m));
      const off = out.onEnd(() => (stopAt ??= now()));
      const onset = now();
      loud.push([onset, onset + 900]);
      const ws: Word[] = [{ word: "why", start: onset + 50, end: onset + 350 }];
      const send = fluxTo(sttSocket.current, micStart, onset);
      send("StartOfTurn", onset + profile.flux.startMs, []);
      send("Update", onset + 240, []);
      send("Update", onset + 480, ws);
      send("EndOfTurn", onset + 1100, ws);
      await step(1000);
      out.duck = d;
      off();
      barges.push({ duck: duckAt != null ? duckAt - onset : Infinity, stop: stopAt != null ? stopAt + 120 - onset : Infinity });
      // The learner's "why" goes to the tutor; its reply is not measured here.
      for (let k = 0; k < 100 && result.current.state.phase !== "speaking"; k++) await step(50);
      if (!settled()) await act(async () => result.current.stopVoice());
      await step(300);
    }
  }
  unmount();
  out.dispose();
  input.dispose();
  vi.unstubAllGlobals();
  return { turns: out_, barges };
}

const p = (xs: (number | null | undefined)[], q: number) => percentile(xs.filter((x): x is number => x != null && isFinite(x)), q);
const COLS = ["eot", "request", "firstToken", "firstSentence", "firstChunk", "audible", "total"] as const;

describe("voice latency (live tutor spec §2.3)", () => {
  const results: Record<string, Awaited<ReturnType<typeof measure>>> = {};

  beforeAll(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date", "performance"] });
  });
  afterAll(() => {
    vi.useRealTimers();
    const row = (name: string, ts: Turn[], barges: Barge[]) => {
      const answer = ts.filter((t) => !t.tool);
      const cells = COLS.map((k) => `${ms(p(answer.map((t) => t.product?.[k]), 50))} / ${ms(p(answer.map((t) => t.product?.[k]), 90))}`);
      const truth = `${ms(p(answer.map((t) => t.trueEot), 50))} | ${ms(p(answer.map((t) => t.trueTotal), 50))} / ${ms(p(answer.map((t) => t.trueTotal), 90))}`;
      const tools = ts.filter((t) => t.tool);
      const withTool = `${ms(p(tools.map((t) => t.trueTotal), 50))} / ${ms(p(tools.map((t) => t.trueTotal), 90))} (${tools.length})`;
      return `| ${name} | ${truth} | ${cells.join(" | ")} | ${withTool} | ${barges.length ? `${ms(p(barges.map((x) => x.duck), 90))} / ${ms(p(barges.map((x) => x.stop), 90))}` : "–"} |`;
    };
    const lines = Object.entries(results).map(([name, r]) => row(name, r.turns, r.barges));
    const md = [
      "# Voice latency (mock, home Wi-Fi profile)",
      "",
      `${TURNS} Flux turns and ${NOVA_TURNS} Nova turns per band on a virtual clock, through useTutorVoice, the Deepgram adapter, the ElevenLabs transport and the player. p50 / p90.`,
      "",
      "Truth = from the script: the learner's real last word end → the first sound at the speaker (output latency included). Product = what the page measured and posted (/api/voice/metric). On Flux the product's last word end is the end of the audio window where the word first showed, so its eot and total read short of the truth by up to one Update (240 ms) plus recognition.",
      "",
      "Measured by the code: the end of turn given the recognizer's events (Nova: our own rules), the speculative send and its commit (the reply is heard only after EndOfTurn), the first sentence's release, prebuffer and output latency, barge-in onset from 20 ms mic blocks, the duck and the stop.",
      "Assumed until P0 or real runs: when Flux sends EagerEndOfTurn (250–450 ms after the last word) and EndOfTurn (150–450 ms after that; K–2 1.0–1.6 s with no eager end), Flux's per-message lag (120 ms), network (40 ms round trip), server time (60 ms), the model's first token (600 ± 150 ms; a leading tool step adds 900 ± 200 ms), the vendor's first audio (200 ± 60 ms; vendor time, one segment, never the total). 10% of 3–9 Flux turns resume after the eager end.",
      "The page's 'request' segment is the page side only (the request leaves at once); the network to /api/tutor is inside firstToken. The acknowledgement (bubble on screen) is measured in phase B's component test.",
      "",
      `| run | truth: eot p50 \\| total p50 / p90 | ${COLS.map((c) => `product ${c}`).join(" | ")} | with a tool step: total (n) | barge duck / stop p90 |`,
      `|${"---|".repeat(COLS.length + 4)}`,
      ...lines,
      "",
      `Gates (answer turns, truth): 3–9 total p50 ≤ ${GATES.total["35"].p50} ms, p90 ≤ ${GATES.total["35"].p90} ms; K–2 p50 ≤ ${GATES.total.k2.p50} ms, p90 ≤ ${GATES.total.k2.p90} ms; duck ≤ ${GATES.duck} ms; stop ≤ ${GATES.stop} ms.`,
      "",
    ].join("\n");
    const summary = Object.fromEntries(Object.entries(results).map(([k, r]) => [k, { totalP50: p(r.turns.filter((t) => !t.tool).map((t) => t.trueTotal), 50), totalP90: p(r.turns.filter((t) => !t.tool).map((t) => t.trueTotal), 90) }]));
    const dir = writeReport("voice-latency", { summary, results }, md);
    console.log(`${md}\nReport: ${dir}voice-latency.md`);
  });

  it("the 30-line script reaches the voice as words: no digit or number sign is left for it to guess", () => {
    for (const line of SCRIPT) {
      for (const locale of ["en", "es"] as const) expect(speakable(line[locale], locale).text, `${line.id} ${locale}`).not.toMatch(UNSPOKEN);
    }
    expect(SCRIPT).toHaveLength(30);
  });

  for (const [i, band] of BANDS.entries())
    it(`band ${band}, Flux: last word → first sound within the gates (truth), barge-in within its gates`, async () => {
      const r = await measure(band, "flux", TURNS, HOME_WIFI, 1000 + i);
      results[`${band} flux`] = r;
      const answer = r.turns.filter((t) => !t.tool);
      expect(answer.every((t) => t.trueTotal != null), "every turn reached the speaker").toBe(true);
      expect(p(answer.map((t) => t.trueTotal), 50)!).toBeLessThanOrEqual(GATES.total[band].p50);
      expect(p(answer.map((t) => t.trueTotal), 90)!).toBeLessThanOrEqual(GATES.total[band].p90);
      // Every posted turn is in range for the metric schema (no stuck clocks).
      expect(r.turns.every((t) => t.product == null || Object.values(t.product).every((v) => v == null || v <= 120_000))).toBe(true);
      // A resumed turn is never heard before its commit: its first sound comes after the real last word.
      for (const t of r.turns.filter((x) => x.resumed)) expect(t.trueTotal ?? 0, "resumed").toBeGreaterThan(0);
      expect(p(r.barges.map((x) => x.duck), 90)!).toBeLessThanOrEqual(GATES.duck);
      expect(p(r.barges.map((x) => x.stop), 90)!).toBeLessThanOrEqual(GATES.stop);
      if (band !== "k2") for (const k of ["firstSentence", "audible"] as const) expect(p(answer.map((t) => t.product?.[k]), 50)!, `${band} ${k} p50`).toBeLessThanOrEqual(SEGMENT_BUDGET_MS[k]);
    }, 600_000);

  for (const [i, band] of BANDS.entries())
    it(`band ${band}, Nova fallback: our own end of turn (answer-aware), within the gates less its longer end-of-turn window`, async () => {
      const r = await measure(band, "nova", NOVA_TURNS, HOME_WIFI, 2000 + i);
      results[`${band} nova`] = r;
      const answer = r.turns.filter((t) => !t.tool);
      expect(answer.every((t) => t.trueTotal != null), "every turn reached the speaker").toBe(true);
      // The fallback has no eager end: its answer-aware window (spec §2.4: 600 ms for 3–5, 500 for
      // 6–9) is longer than the 450 ms end-of-turn budget by design, so its gate moves by that much.
      const slack = band === "k2" ? 0 : Math.max(0, ANSWER_END_MS[band] - SEGMENT_BUDGET_MS.eot);
      expect(p(answer.map((t) => t.trueTotal), 50)!).toBeLessThanOrEqual(GATES.total[band].p50 + slack);
      expect(p(answer.map((t) => t.trueTotal), 90)!).toBeLessThanOrEqual(GATES.total[band].p90 + slack);
      // Nova gives word times: the product's clock and the truth agree.
      for (const t of answer) if (t.product?.eot != null && t.trueEot != null) expect(Math.abs(t.product.eot - t.trueEot)).toBeLessThanOrEqual(5);
    }, 600_000);
});

describe.runIf(REAL)("voice latency on the real vendor (EVAL_REAL=1)", () => {
  it("the 30-line script's time to first audio on the live socket (vendor time, not turn latency)", async () => {
    const key = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID;
    if (!key || !voiceId) {
      console.log("voice-latency: blocked on keys — ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID. Flux end-of-turn on child speech also needs the P0 recordings.");
      return;
    }
    const times: number[] = [];
    for (const line of SCRIPT) {
      const tok = (await (await fetch("https://api.elevenlabs.io/v1/single-use-token/tts_websocket", { method: "POST", headers: { "xi-api-key": key } })).json()) as { token: string };
      const q = new URLSearchParams({ model_id: process.env.ELEVENLABS_MODEL || "eleven_flash_v2_5", output_format: "pcm_24000", single_use_token: tok.token, auto_mode: "true", sync_alignment: "true", language_code: "en" });
      const ws = new WebSocket(`wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?${q}`);
      const took = await new Promise<number>((resolve, reject) => {
        let sent = 0;
        ws.onopen = () => {
          ws.send(JSON.stringify({ text: " ", voice_settings: { stability: 0.5, similarity_boost: 0.75 } }));
          sent = performance.now();
          ws.send(JSON.stringify({ text: `${speakable(line.en, "en").text} ` }));
          ws.send(JSON.stringify({ text: "" }));
        };
        ws.onmessage = (e) => {
          if ((JSON.parse(String(e.data)) as { audio?: string }).audio) resolve(performance.now() - sent);
        };
        ws.onerror = () => reject(new Error("socket"));
      });
      ws.close();
      times.push(took);
    }
    console.log(`ElevenLabs first audio over ${times.length} lines: p50 ${Math.round(p(times, 50)!)} ms, p90 ${Math.round(p(times, 90)!)} ms (vendor time; turn latency adds end of turn, the model and playback).`);
  }, 600_000);
});
