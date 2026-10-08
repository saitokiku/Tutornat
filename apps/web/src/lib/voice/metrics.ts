import { z } from "zod";
import type { Band } from "./types";

// Per-turn latency, measured the same way in the product, the e2e run and the eval (live tutor spec
// §2.3). Measurement boundaries:
//  - turn latency ("total") runs from the end of the learner's last word (the recognizer's word end
//    timestamp, on the page's clock) to the tutor's first sound reaching the speaker (the scheduled
//    sample time plus the device's output latency). Nothing shorter counts as turn latency;
//  - the vendor's own time to first audio (first sentence sent → first audio chunk back) is a
//    segment of that, reported on its own as `ttsApi`, and is never the turn's latency;
//  - the acknowledgement (the learner's bubble committed, the cursor moving) is timed from the end
//    of turn, not from the last word.
// What leaves the page is numbers only: band, language, which vendors, milliseconds. Never text or names.

/** Moments in one turn, performance.now() ms. */
export type TurnMarks = {
  /** The learner's last word ended (recognizer word timestamp). The clock starts here. */
  lastWordEnd?: number;
  /** The end of turn was decided (eager, answer-aware or the recognizer's). */
  eot?: number;
  /** Something visible answered the learner (their bubble, the cursor moving). */
  ack?: number;
  /** The request left for /api/tutor. */
  requestSent?: number;
  firstToken?: number;
  /** The first sentence was released to the voice. */
  firstSentence?: number;
  /** The first audio chunk arrived from the vendor (vendor voices only). */
  firstChunk?: number;
  /** The first sound reached the speaker. */
  firstAudible?: number;
  /** Barge-in: the learner started, the tutor was ducked, the tutor was stopped. */
  bargeOnset?: number;
  bargeDuck?: number;
  bargeStop?: number;
};

export type Segments = {
  eot: number | null;
  request: number | null;
  firstToken: number | null;
  firstSentence: number | null;
  /** First sentence → first audio chunk at the client: the vendor's own time (ttsApi). */
  firstChunk: number | null;
  /** First chunk (or first sentence, for a browser voice) → audible: prebuffer and output latency. */
  audible: number | null;
  /** The turn's latency: last word → first sound. */
  total: number | null;
  ack: number | null;
  duck: number | null;
  stop: number | null;
};

const gap = (a?: number, b?: number) => (a == null || b == null ? null : Math.max(0, Math.round(b - a)));

export function segments(m: TurnMarks): Segments {
  return {
    eot: gap(m.lastWordEnd, m.eot),
    request: gap(m.eot, m.requestSent),
    firstToken: gap(m.requestSent, m.firstToken),
    firstSentence: gap(m.firstToken, m.firstSentence),
    firstChunk: gap(m.firstSentence, m.firstChunk),
    audible: gap(m.firstChunk ?? m.firstSentence, m.firstAudible),
    total: gap(m.lastWordEnd, m.firstAudible),
    ack: gap(m.eot, m.ack),
    duck: gap(m.bargeOnset, m.bargeDuck),
    stop: gap(m.bargeOnset, m.bargeStop),
  };
}

/** The p50 budget for each segment of an answer turn, grades 3–9 (spec §2.3). */
export const SEGMENT_BUDGET_MS = { eot: 450, request: 120, firstToken: 600, firstSentence: 150, firstChunk: 200, audible: 80 } as const;

/** The gates: last word → first sound, by band; acknowledgement; barge-in. */
export const GATES = {
  total: { k2: { p50: 2400, p90: 3200 }, "35": { p50: 1600, p90: 2500 }, "69": { p50: 1600, p90: 2500 } } satisfies Record<Band, { p50: number; p90: number }>,
  ack: 150,
  duck: 150,
  stop: 800,
} as const;

/** The p-th percentile (0–100) of `xs`, nearest rank; null when empty. */
export function percentile(xs: number[], p: number): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1))];
}

const ms = z.number().int().min(0).max(120_000);

/** What a page sends to /api/voice/metric for one turn: numbers and labels only (strict: anything else is refused). */
export const VoiceMetric = z
  .object({
    band: z.enum(["k2", "35", "69"]),
    locale: z.enum(["en", "es"]),
    in: z.enum(["deepgram", "browser", "none"]),
    out: z.enum(["elevenlabs", "browser", "none"]),
    stt: z.enum(["flux", "nova", "browser", "none"]),
    mode: z.enum(["tap", "conversation", "typed"]),
    segments: z.object({ eot: ms, request: ms, firstToken: ms, firstSentence: ms, firstChunk: ms, audible: ms, total: ms, ack: ms, duck: ms, stop: ms }).partial().strict(),
    /** The vendor's own time to first audio. Not turn latency. */
    ttsApi: ms.optional(),
    underruns: z.number().int().min(0).max(1000).optional(),
    /** The spoken answer was checked in code before the model call. */
    precheck: z.boolean().optional(),
    modelCalls: z.number().int().min(0).max(10).optional(),
    retried: z.boolean().optional(),
  })
  .strict();

export type VoiceMetric = z.infer<typeof VoiceMetric>;

/** One turn's metric, from its marks. Segments that weren't measured are left out. */
export function metricOf(m: TurnMarks, labels: Omit<VoiceMetric, "segments" | "ttsApi">): VoiceMetric {
  const s = segments(m);
  const present = Object.fromEntries(Object.entries(s).filter(([, v]) => v != null)) as VoiceMetric["segments"];
  return { ...labels, segments: present, ...(s.firstChunk != null ? { ttsApi: s.firstChunk } : {}) };
}

/** Sends one turn's numbers (never text) without holding the page up. */
export function postMetric(metric: VoiceMetric, f: typeof fetch = (...a) => fetch(...a)) {
  try {
    void f("/api/voice/metric", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(metric), keepalive: true, cache: "no-store" }).catch(() => {});
  } catch {
    // a metric is never worth an error
  }
}

/** Outside production, an event log e2e and the eval read: window.__kzVoice. */
export type VoiceEvent = { at: number; type: string; [k: string]: unknown };

export function logVoice(type: string, data: Record<string, unknown> = {}, now = () => (typeof performance !== "undefined" ? performance.now() : Date.now())) {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") return;
  const w = window as unknown as { __kzVoice?: VoiceEvent[] };
  (w.__kzVoice ??= []).push({ at: now(), type, ...data });
  if (w.__kzVoice.length > 2000) w.__kzVoice.splice(0, w.__kzVoice.length - 2000);
}
