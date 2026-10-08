import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { BANDS } from "@/lib/voice/bands";
import { convStart, convStep, type ConvState } from "@/lib/voice/conversation";
import { converse } from "@/lib/voice/converse";
import { elevenLabsSpeechOut, type TtsToken } from "@/lib/voice/elevenlabs";
import { alignmentFor, FakeAudio, FakeSocket, fakeIn, pcmBase64 } from "@/lib/voice/fakes";
import { GATES, percentile, SEGMENT_BUDGET_MS, segments, type Segments, type TurnMarks } from "@/lib/voice/metrics";
import { sentenceFeed } from "@/lib/voice/chunk";
import { UNSPOKEN } from "@/lib/voice/numbers";
import { speakable } from "@/lib/voice/speakable";
import type { Band } from "@/lib/voice/types";
import { ms, writeReport } from "./report";
import { SCRIPT } from "./voice-script";

// The latency eval (live tutor spec §7.4). Mock mode, the default: the real end-of-turn handling
// (converse), state machine (conversation), ElevenLabs transport and player run on a virtual clock
// against fake sockets, with the delays of a home Wi-Fi connection drawn from distributions:
//   network 40 ms round trip; model time to first token 600 ± 150 ms at 90 ± 15 tokens/s;
//   text-to-speech first audio 200 ± 60 ms after the first sentence; output latency 20 ms;
//   end of turn: 3–9 Flux eager end 300–550 ms, K–2 1.0–1.6 s by design.
// The end-of-turn delays are assumed until the P0 Flux fixtures are recorded (blocked on keys).
// 200 turns per band. It prints p50 and p90 per segment and for the total, and fails over the §2.3
// budget. Turn latency is measured from the end of the learner's last word to the first sound at the
// speaker; the vendor's own time to first audio is one segment of that (firstChunk), never the total.
//
// EVAL_REAL=1 with ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID: the 30-line script through the live
// stream-input socket, timing the vendor's first audio. Flux end-of-turn and cut-offs on recorded
// child speech need the P0 recordings (blocked).

const REAL = process.env.EVAL_REAL === "1";
const TURNS = Number(process.env.VOICE_TURNS) || 200;

type Profile = { rtt: number; serverMs: number; ttft: [number, number]; tps: [number, number]; tts: [number, number]; ttsNext: number; connect: number; outputLatency: number; eot: Record<Band, [number, number]> };

export const HOME_WIFI: Profile = {
  rtt: 40,
  serverMs: 60,
  ttft: [600, 150],
  tps: [90, 15],
  tts: [200, 60],
  ttsNext: 60,
  connect: 120,
  outputLatency: 0.02,
  eot: { k2: [1000, 1600], "35": [300, 550], "69": [300, 550] },
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
  "Seven is right. You counted each dot once. Do you want another one?",
  "Not yet. Count the tens first, then the ones. How many tens are there?",
  "The top number is 3. So you shade 3 parts out of 4. Can you shade them?",
];

type Turn = Segments & { ack: number };

async function measureBand(band: Band, profile: Profile, seed: number): Promise<{ turns: Turn[]; barge: { duck: number; stop: number }[] }> {
  const r = rng(seed);
  const normal = ([mean, sd]: [number, number]) => Math.max(mean * 0.3, mean + sd * Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r()));
  const uniform = ([lo, hi]: [number, number]) => lo + (hi - lo) * r();

  const audio = new FakeAudio();
  audio.outputLatency = profile.outputLatency;
  const t0 = performance.now();
  Object.defineProperty(audio, "currentTime", { get: () => (performance.now() - t0) / 1000 });

  // The text-to-speech service: opens after the connect delay; answers the first sentence after its
  // time to first audio, each later one a little after, always in order (as the real socket does).
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
      const t = performance.now();
      const at = Math.max(t + (this.answered++ === 0 ? normal(profile.tts) : profile.ttsNext), this.lastAt + profile.ttsNext);
      this.lastAt = at;
      if (m.text === "") return void setTimeout(() => this.receive({ isFinal: true }), at - t);
      const text = m.text ?? "";
      setTimeout(() => this.receive({ audio: pcmBase64(text.length * 60), alignment: alignmentFor(text, 60) }), at - t);
    }
  }
  const token: TtsToken = { token: "t", voiceId: "v", modelId: "eleven_flash_v2_5", languageCode: "en", outputFormat: "pcm_24000", zeroRetention: false };
  const fetch = (async () => new Response(JSON.stringify(token), { status: 200 })) as typeof globalThis.fetch;
  const out = elevenLabsSpeechOut({ locale: "en", consent: true, under13: false, band, fetch, WebSocket: TtsServer as unknown as typeof WebSocket, audioContext: () => audio as unknown as AudioContext, now: () => performance.now() });
  out.warm();
  const input = fakeIn({ kind: "deepgram" });

  let s: ConvState = convStart({ band, conversationAllowed: false });
  let marks: TurnMarks = {};
  let done = false;
  let replyRun = -1;
  const turns: Turn[] = [];
  const talk = converse({
    input,
    output: out,
    locale: "en",
    onTurn: (text, meta) => {
      marks = { lastWordEnd: meta.lastWordEnd ?? undefined, eot: performance.now() };
      step({ type: "turn", text, at: performance.now(), confidence: meta.confidence });
    },
    onBargeIn: () => step({ type: "barge", at: performance.now() }),
    now: () => performance.now(),
  });
  let ackAt: number | null = null;
  const step = (e: Parameters<typeof convStep>[1]) => {
    const res = convStep(s, e);
    if (res.state.phase === "thinking" && s.phase !== "thinking") ackAt = performance.now(); // the bubble commits here
    s = res.state;
    for (const fx of res.effects) if (fx.type === "send") send();
  };

  /** The tutor route and the model: the request arrives, the first token comes, the reply streams. */
  function send() {
    // As in the product: the request leaves the page now; the network shows up in firstToken.
    marks.requestSent = performance.now();
    const feed = sentenceFeed({
      mode: "voice",
      release: (sentence, i) => {
        if (i === 0) marks.firstSentence = performance.now();
        return sentence;
      },
    });
    const run = talk.say(feed.sentences, { kind: "reply", band });
    replyRun = run.id;
    void run.then(() => (done = true));
    const reply = REPLIES[Math.floor(r() * REPLIES.length)];
    const tokens = reply.match(/.{1,4}/g)!;
    // There and back: the request reaches the server, the model starts, its tokens reach the page.
    const first = profile.rtt / 2 + profile.serverMs + normal(profile.ttft) + profile.rtt / 2;
    const gap = 1000 / normal(profile.tps);
    setTimeout(() => (marks.firstToken = performance.now()), first);
    tokens.forEach((t, i) => setTimeout(() => feed.write(t), first + i * gap));
    setTimeout(() => feed.end(), first + tokens.length * gap);
  }

  out.onTiming((t) => {
    if (t.run !== replyRun || t.firstAudibleAt == null || marks.firstAudible != null) return;
    marks.firstChunk = t.firstChunkAt ?? undefined;
    marks.firstAudible = t.firstAudibleAt;
  });

  for (let n = 0; n < TURNS; n++) {
    done = false;
    marks = {};
    ackAt = null;
    s = convStart({ band, conversationAllowed: false });
    step({ type: "mic", at: performance.now() });
    // The learner's last word ends now; the end of turn is decided after the band's delay.
    const lastWord = performance.now();
    await vi.advanceTimersByTimeAsync(uniform(profile.eot[band]));
    input.endOfTurn("It's twelve.", { confidence: 0.92, lastWordEnd: lastWord, words: [] });
    for (let k = 0; k < 400 && !done; k++) await vi.advanceTimersByTimeAsync(50);
    const seg = segments(marks);
    turns.push({ ...seg, ack: ackAt != null && marks.eot != null ? Math.round(ackAt - marks.eot) : 0 });
    await vi.advanceTimersByTimeAsync(500);
  }

  // Barge-in: the learner starts while the tutor speaks; their first real word comes 250–600 ms later.
  const barge: { duck: number; stop: number }[] = [];
  for (let n = 0; n < 50; n++) {
    let duckAt: number | null = null;
    let onset = 0;
    const d = out.duck.bind(out);
    out.duck = (g: number, m: number) => ((duckAt ??= performance.now()), d(g, m));
    const feed = sentenceFeed({ mode: "voice" });
    const run = talk.say(feed.sentences, { kind: "reply", band });
    replyRun = run.id;
    feed.write(`${REPLIES[0]} `);
    feed.end();
    let stopAt: number | null = null;
    void run.then(() => (stopAt ??= performance.now()));
    await vi.advanceTimersByTimeAsync(1500);
    onset = performance.now();
    input.speechStart();
    await vi.advanceTimersByTimeAsync(uniform([250, 600]));
    const at = performance.now();
    input.words([{ word: "wait", start: at - 150, end: at, confidence: 0.9 }]);
    await vi.advanceTimersByTimeAsync(200);
    out.duck = d;
    // Fully stopped = the cancel's fade has run out.
    barge.push({ duck: duckAt != null ? duckAt - onset : Infinity, stop: (stopAt ?? Infinity) - onset + 120 });
    await vi.advanceTimersByTimeAsync(500);
  }
  talk.dispose();
  out.dispose();
  return { turns, barge };
}

const p = (xs: (number | null)[], q: number) => percentile(xs.filter((x): x is number => x != null && isFinite(x)), q);
const SEGMENTS = ["eot", "request", "firstToken", "firstSentence", "firstChunk", "audible", "total", "ack"] as const;

describe("voice latency (live tutor spec §2.3)", () => {
  const results: Record<string, Awaited<ReturnType<typeof measureBand>>> = {};

  beforeAll(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date", "performance"] });
  });
  afterAll(() => {
    vi.useRealTimers();
    const rows = BANDS.map((b) => {
      const r = results[b];
      if (!r) return "";
      const cells = SEGMENTS.map((k) => `${ms(p(r.turns.map((t) => t[k]), 50))} / ${ms(p(r.turns.map((t) => t[k]), 90))}`);
      return `| ${b} | ${cells.join(" | ")} | ${ms(p(r.barge.map((x) => x.duck), 90))} | ${ms(p(r.barge.map((x) => x.stop), 90))} |`;
    });
    const md = [
      "# Voice latency (mock, home Wi-Fi profile)",
      "",
      `${TURNS} turns per band on a virtual clock. p50 / p90. Turn latency = last word end → first sound at the speaker.`,
      "The vendor's own time to first audio is the firstChunk column; it is a segment of the total, not the turn's latency.",
      "End-of-turn delays are assumed (3–9: Flux eager end 300–550 ms; K–2: 1.0–1.6 s) until the P0 Flux fixtures exist.",
      "",
      `| band | ${SEGMENTS.join(" | ")} | barge duck p90 | barge stop p90 |`,
      `|${"---|".repeat(SEGMENTS.length + 3)}`,
      ...rows,
      "",
      `Gates: 3–9 total p50 ≤ ${GATES.total["35"].p50} ms, p90 ≤ ${GATES.total["35"].p90} ms; K–2 p50 ≤ ${GATES.total.k2.p50} ms, p90 ≤ ${GATES.total.k2.p90} ms; acknowledgement ≤ ${GATES.ack} ms; duck ≤ ${GATES.duck} ms; stop ≤ ${GATES.stop} ms.`,
      "",
    ].join("\n");
    const summary = Object.fromEntries(BANDS.map((b) => [b, { totalP50: p(results[b]?.turns.map((t) => t.total) ?? [], 50), totalP90: p(results[b]?.turns.map((t) => t.total) ?? [], 90) }]));
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
    it(`band ${band}: last word → first sound within the gates, and every segment within its budget`, async () => {
      const r = await measureBand(band, HOME_WIFI, 1000 + i);
      results[band] = r;
      const total = r.turns.map((t) => t.total);
      expect(total.every((x) => x != null), "every turn reached the speaker").toBe(true);
      expect(p(total, 50)!).toBeLessThanOrEqual(GATES.total[band].p50);
      expect(p(total, 90)!).toBeLessThanOrEqual(GATES.total[band].p90);
      expect(p(r.turns.map((t) => t.ack), 90)!).toBeLessThanOrEqual(GATES.ack);
      expect(p(r.barge.map((x) => x.duck), 90)!).toBeLessThanOrEqual(GATES.duck);
      expect(p(r.barge.map((x) => x.stop), 90)!).toBeLessThanOrEqual(GATES.stop);
      if (band !== "k2") {
        for (const k of ["eot", "firstSentence", "firstChunk", "audible"] as const) expect(p(r.turns.map((t) => t[k]), 50)!, `${band} ${k} p50`).toBeLessThanOrEqual(SEGMENT_BUDGET_MS[k]);
        // Measured on the page, the request leaves at once and the network is inside "first token": the two budgets together.
        expect(p(r.turns.map((t) => (t.request ?? 0) + (t.firstToken ?? 0)), 50)!).toBeLessThanOrEqual(SEGMENT_BUDGET_MS.request + SEGMENT_BUDGET_MS.firstToken);
      }
    }, 300_000);
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
      const ms = await new Promise<number>((resolve, reject) => {
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
      times.push(ms);
    }
    console.log(`ElevenLabs first audio over ${times.length} lines: p50 ${Math.round(p(times, 50)!)} ms, p90 ${Math.round(p(times, 90)!)} ms (vendor time; turn latency adds end of turn, the model and playback).`);
  }, 600_000);
});
