import { audibleAtMs, latencyMs } from "./audio";
import { SENTENCE_PAUSE } from "./bands";
import type { Band } from "./types";

// Plays one reply's streamed PCM on the shared AudioContext and keeps the word clock (live tutor spec
// §3.2). Everything goes through one GainNode per run, so the voice fades in, ducks under a learner
// who starts talking, and fades out instead of clicking. Words are found by walking a cursor over the
// non-space characters of the exact text sent, matched to the vendor's character timings; that gives
// each written word the moment it becomes audible (output latency included), which drives the word
// highlight and, later, the glow.
//
// Audio is scheduled only up to the start of the newest word whose timing has arrived (or all of it
// once the text sent so far is covered), so if the network runs dry the gap falls between words,
// never inside one. Sentence pauses are cut in at the sample where the next sentence starts.

export const PREBUFFER_MS = 150;
export const PREBUFFER_WAIT_MS = 250;
export const REBUFFER_MS = 100;
export const LEAD_MS = 50;
export const FADE_IN_MS = 10;
export const STALL_MS = 500;

export type Alignment = { chars?: string[] | null; charStartTimesMs?: number[] | null };

type Sentence = { nsStart: number; nsEnd: number; question: boolean; sampleStart: number | null; paused: boolean };
type WordStart = { ns: number; written: number; sentence: number; sample: number | null };
type Segment = { a: number; b: number; at: number; src: AudioBufferSourceNode };
/** A scheduled word: when it starts and ends on the audio clock, and its first sample. */
type Timed = { at: number; end: number; written: number; sample: number };

export type PlayerOptions = {
  ctx: AudioContext;
  sampleRate: number;
  band: Band;
  now?: () => number;
  /** A word's audio is scheduled: its written index and when it becomes audible (performance.now() ms). */
  onWordScheduled?: (word: number, audibleAt: number) => void;
  /** A word is being heard now (for the highlight). */
  onBoundary?: (word: number) => void;
  /** The first audio is scheduled; `audibleAt` is when it will be heard. */
  onStart?: (audibleAt: number) => void;
  /** The audio clock stopped while audio was waiting to play (iOS "interrupted", a frozen context). */
  onStall?: () => void;
};

export type Player = ReturnType<typeof createPlayer>;

export function createPlayer(o: PlayerOptions) {
  const { ctx, sampleRate: sr } = o;
  const now = o.now ?? (() => performance.now());
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(ctx.destination);

  let samples = new Float32Array(sr * 4);
  let received = 0;
  let scheduled = 0;
  let nextStart = 0;
  let started = false;
  let fadePending = true;
  let ended = false;
  let paused = false;
  let cancelled = false;
  let unaligned = false; // some audio came without timings: nothing can be held back for words
  let firstChunkAt: number | null = null;
  let lastPushAt = 0;
  let dryAt: number | null = null;
  let level = 1;
  let underruns = 0;

  const ns: string[] = []; // the non-space characters of everything sent
  const sentences: Sentence[] = [];
  const words: WordStart[] = [];
  const wordAtNs = new Map<number, WordStart>();
  let cursor = 0; // non-space characters aligned so far
  const segments: Segment[] = [];
  const boundaries: Timed[] = [];
  const timeline: Timed[] = []; // scheduled words, in order
  let lastClock = { t: -1, at: 0 };

  const ms = (n: number) => (n / sr) * 1000;
  const toSample = (msIn: number) => Math.round((msIn / 1000) * sr);

  function append(pcm: Float32Array) {
    if (received + pcm.length > samples.length) {
      const grown = new Float32Array(Math.max(samples.length * 2, received + pcm.length));
      grown.set(samples.subarray(0, received));
      samples = grown;
    }
    samples.set(pcm, received);
    received += pcm.length;
  }

  /** Where audio may be scheduled up to without cutting into a word whose end hasn't arrived. */
  function safePoint(): number {
    // Nothing new for 250 ms: play what is here rather than hold a word back any longer.
    if (ended || unaligned || cursor >= ns.length || now() - lastPushAt >= PREBUFFER_WAIT_MS) return received;
    let safe = scheduled;
    for (const w of words) if (w.sample != null && w.ns <= cursor) safe = Math.max(safe, w.sample);
    return Math.min(safe, received);
  }

  function rampTo(value: number, msIn: number) {
    const t = ctx.currentTime;
    const g = gain.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(value, t + msIn / 1000);
  }

  function scheduleSegment(a: number, b: number) {
    const lead = ctx.currentTime + LEAD_MS / 1000;
    const at = Math.max(nextStart, lead);
    const buf = ctx.createBuffer(1, b - a, sr);
    buf.getChannelData(0).set(samples.subarray(a, b));
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(gain);
    src.start(at);
    segments.push({ a, b, at, src });
    if (fadePending) {
      fadePending = false;
      const g = gain.gain;
      g.cancelScheduledValues(at);
      g.setValueAtTime(0, at);
      g.linearRampToValueAtTime(level, at + FADE_IN_MS / 1000);
    }
    if (!started) {
      started = true;
      o.onStart?.(audibleAtMs(ctx, at, now()));
    }
    const end = at + (b - a) / sr;
    const inside = words.filter((w) => w.sample != null && w.sample >= a && w.sample < b);
    inside.forEach((w, i) => {
      const t = at + (w.sample! - a) / sr;
      const next = inside[i + 1];
      const timed = { at: t, end: next ? at + (next.sample! - a) / sr : end, written: w.written, sample: w.sample! };
      boundaries.push(timed);
      timeline.push(timed);
      o.onWordScheduled?.(w.written, audibleAtMs(ctx, t, now()));
    });
    nextStart = end;
    scheduled = b;
  }

  function pump() {
    if (cancelled || paused) return;
    const safe = safePoint();
    if (safe <= scheduled) {
      if (started && !ended && ctx.currentTime >= nextStart) dryAt ??= now();
      return;
    }
    const waiting = ms(safe - scheduled);
    if (!started) {
      // Prebuffer: 150 ms of audio, or 250 ms since the first chunk, whichever comes first.
      if (!ended && waiting < PREBUFFER_MS && now() - (firstChunkAt ?? now()) < PREBUFFER_WAIT_MS) return;
    } else if (nextStart > 0 && ctx.currentTime >= nextStart && !ended) {
      // Ran dry: wait for a little more before going on, so it doesn't stutter word by word.
      dryAt ??= now();
      if (waiting < REBUFFER_MS && now() - dryAt < PREBUFFER_WAIT_MS) return;
      underruns++;
    }
    dryAt = null;
    while (scheduled < safe) {
      const k = sentences.findIndex((s, i) => i > 0 && s.sampleStart === scheduled && !s.paused);
      if (k > 0) {
        const p = SENTENCE_PAUSE[o.band];
        nextStart = Math.max(nextStart, ctx.currentTime + LEAD_MS / 1000) + (p.after + (sentences[k].question ? p.beforeQuestion : 0)) / 1000;
        sentences[k].paused = true;
      }
      const cut = sentences.map((s) => s.sampleStart).filter((x): x is number => x != null && x > scheduled && x <= safe);
      scheduleSegment(scheduled, cut.length ? Math.min(...cut) : safe);
    }
  }

  return {
    /**
     * The next sentence is being sent: `spoken` is the exact text sent to the vendor, `written[k]` the
     * written word each of its spoken words came from.
     */
    addSentence(spoken: string, written: number[], question: boolean) {
      const nsStart = ns.length;
      const toks = spoken.split(/\s+/).filter(Boolean);
      toks.forEach((tok, k) => {
        const w: WordStart = { ns: ns.length, written: written[k] ?? written[written.length - 1] ?? 0, sentence: sentences.length, sample: null };
        words.push(w);
        wordAtNs.set(w.ns, w);
        for (const ch of tok) ns.push(ch);
      });
      sentences.push({ nsStart, nsEnd: ns.length, question, sampleStart: null, paused: false });
    },
    /** A chunk of audio and the character timings that came with it (relative to the chunk). */
    push(pcm: Float32Array, al?: Alignment | null) {
      if (cancelled) return;
      const base = received;
      firstChunkAt ??= now();
      lastPushAt = now();
      append(pcm);
      const chars = al?.chars ?? [];
      const times = al?.charStartTimesMs ?? [];
      if (!chars.length && pcm.length) unaligned = unaligned || cursor < ns.length;
      chars.forEach((ch, i) => {
        if (/\s/.test(ch) || cursor >= ns.length) return;
        // A character the text doesn't have next: look a few ahead before giving up on it.
        if (ch.toLowerCase() !== ns[cursor]?.toLowerCase()) {
          const ahead = [1, 2, 3].find((d) => ns[cursor + d]?.toLowerCase() === ch.toLowerCase());
          if (ahead) cursor += ahead;
        }
        const w = wordAtNs.get(cursor);
        if (w && w.sample == null) {
          w.sample = Math.min(received, base + toSample(times[i] ?? 0));
          const s = sentences[w.sentence];
          if (s.nsStart === w.ns) s.sampleStart = w.sample;
        }
        cursor++;
      });
      pump();
    },
    /** No more audio is coming for what was sent. */
    end() {
      ended = true;
      pump();
    },
    /** Fires due word boundaries, finishes a prebuffer that waited long enough, watches for a stalled clock. Call every ~25 ms. */
    tick() {
      if (cancelled) return;
      const heardNow = ctx.currentTime - latencyMs(ctx) / 1000;
      while (boundaries.length && boundaries[0].at <= heardNow) o.onBoundary?.(boundaries.shift()!.written);
      pump();
      const pending = started && !paused && nextStart > ctx.currentTime;
      if (ctx.currentTime !== lastClock.t) lastClock = { t: ctx.currentTime, at: now() };
      if (pending && ((ctx.state as string) !== "running" || now() - lastClock.at >= STALL_MS)) o.onStall?.();
    },
    /** Every sample received has played (and nothing more is coming). */
    drained: () => ended && scheduled >= received && ctx.currentTime >= nextStart,
    /** Nothing more is coming and nothing more will be scheduled. */
    get ended() {
      return ended;
    },
    get started() {
      return started;
    },
    get underruns() {
      return underruns;
    },
    /** The last written word fully heard; -1 before the first. */
    heardUpTo(): number {
      const t = ctx.currentTime - latencyMs(ctx) / 1000;
      let heard = -1;
      for (const w of timeline) if (w.end <= t) heard = w.written;
      return heard;
    },
    /** The first sentence whose audio hasn't fully arrived (a retry resends from here). */
    firstIncomplete(): number {
      const k = sentences.findIndex((s) => s.nsEnd > cursor);
      return k < 0 ? sentences.length : k;
    },
    /** Drops sentence `k` and everything after it (audio, timings, text), for a retry from there. */
    truncateFrom(k: number) {
      if (k >= sentences.length) return;
      const s = sentences[k];
      const cut = s.sampleStart ?? received;
      for (const seg of segments.filter((x) => x.a >= cut))
        try {
          seg.src.stop();
        } catch {}
      segments.splice(0, segments.length, ...segments.filter((x) => x.a < cut));
      received = Math.min(received, cut);
      scheduled = Math.min(scheduled, cut);
      const last = segments[segments.length - 1];
      if (last) nextStart = last.at + (last.b - last.a) / sr;
      for (const list of [boundaries, timeline]) list.splice(0, list.length, ...list.filter((b) => b.sample < cut));
      const from = words.findIndex((w) => w.sentence >= k);
      if (from >= 0) for (const w of words.splice(from)) wordAtNs.delete(w.ns);
      ns.length = s.nsStart;
      cursor = Math.min(cursor, s.nsStart);
      sentences.length = k;
      ended = false;
      unaligned = false;
    },
    duck(to: number, msIn: number) {
      level = to;
      if (started && !cancelled) rampTo(to, msIn);
    },
    unduck(msIn: number) {
      level = 1;
      if (started && !cancelled) rampTo(1, msIn);
    },
    /** Fades out over `fadeMs` and stops everything. */
    cancel(fadeMs = 120) {
      if (cancelled) return;
      cancelled = true;
      boundaries.length = 0;
      if (started) rampTo(0, fadeMs);
      const stopAt = ctx.currentTime + fadeMs / 1000;
      for (const seg of segments)
        try {
          seg.src.stop(Math.max(stopAt, seg.at));
        } catch {}
      setTimeout(() => {
        try {
          gain.disconnect();
        } catch {}
      }, fadeMs + 50);
    },
    pause() {
      if (paused || cancelled) return;
      paused = true;
      const t = ctx.currentTime;
      rampTo(0, FADE_IN_MS);
      // Rewind to the sample being heard, so resume() picks up there.
      let at = scheduled;
      for (const seg of segments) {
        if (t < seg.at) {
          at = Math.min(at, seg.a);
        } else if (t < seg.at + (seg.b - seg.a) / sr) at = Math.min(at, seg.a + Math.floor((t - seg.at) * sr));
        try {
          seg.src.stop(t + FADE_IN_MS / 1000);
        } catch {}
      }
      segments.length = 0;
      scheduled = at;
      nextStart = 0;
      boundaries.splice(0, boundaries.length, ...boundaries.filter((b) => b.at <= t));
      timeline.splice(0, timeline.length, ...timeline.filter((b) => b.at <= t));
      for (const s of sentences) if (s.sampleStart != null && s.sampleStart >= at) s.paused = false;
    },
    resume() {
      if (!paused || cancelled) return;
      paused = false;
      fadePending = true;
      pump();
    },
    /** For tests and the eval: the gain node. */
    gain,
  };
}
