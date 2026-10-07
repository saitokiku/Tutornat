import type { Locale } from "@/lib/types";
import { asyncQueue, sentencesFrom } from "./chunk";
import { speakable } from "./speakable";
import { requestToken } from "./token";
import { asVoiceError, countWords, emitter, VoiceError, type OutState, type SpeakSource, type SpeechOut, type Unsubscribe } from "./types";

// ElevenLabs streaming text-to-speech over their WebSocket (`/v1/text-to-speech/{voice}/stream-input`).
// The browser connects directly with a single-use token from /api/voice/tts-token, so the API key
// never leaves our server. One connection per reply: each sentence is sent as soon as it's complete
// (auto_mode + flush), raw PCM comes back and is scheduled gap-free on an AudioContext, and the
// character timings that come with it drive word highlighting. If the service fails, whatever wasn't
// heard yet is read by the fallback (the browser's voice) so a child relying on audio isn't left in
// silence. Docs: elevenlabs.io/docs/api-reference/text-to-speech/v-1-text-to-speech-voice-id-stream-input

export const TTS_SAMPLE_RATE = 24000;
const WS_BASE = "wss://api.elevenlabs.io/v1/text-to-speech";
const TOKEN_TTL_MS = 12 * 60_000; // tokens live 15 minutes; refresh before that
const CONNECT_TIMEOUT_MS = 5000;

export type TtsToken = {
  token: string;
  voiceId: string;
  modelId: string;
  /** Set only for models that accept language enforcement. */
  languageCode: string | null;
  outputFormat: string;
  zeroRetention: boolean;
};

type Alignment = { chars?: string[]; charStartTimesMs?: number[] };
type ServerMessage = { audio?: string | null; alignment?: Alignment | null; normalizedAlignment?: Alignment | null; isFinal?: boolean | null; error?: string; message?: string };

/** Base64 16-bit little-endian PCM → float samples. `carry` holds an odd trailing byte between chunks. */
export function pcm16ToFloat32(b64: string, carry: number | null = null): { samples: Float32Array; carry: number | null } {
  const bin = atob(b64);
  const lead = carry == null ? 0 : 1;
  const bytes = new Uint8Array(bin.length + lead);
  if (carry != null) bytes[0] = carry;
  for (let i = 0; i < bin.length; i++) bytes[i + lead] = bin.charCodeAt(i);
  const n = bytes.length >> 1;
  const samples = new Float32Array(n);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < n; i++) samples[i] = view.getInt16(i * 2, true) / 0x8000;
  return { samples, carry: bytes.length % 2 ? bytes[bytes.length - 1] : null };
}

export function ttsSocketUrl(t: TtsToken): string {
  const q = new URLSearchParams({
    model_id: t.modelId,
    output_format: t.outputFormat,
    single_use_token: t.token,
    auto_mode: "true",
    sync_alignment: "true",
    inactivity_timeout: "60",
  });
  if (t.languageCode) q.set("language_code", t.languageCode);
  if (t.zeroRetention) q.set("enable_logging", "false");
  return `${WS_BASE}/${encodeURIComponent(t.voiceId)}/stream-input?${q}`;
}

export type ElevenLabsOptions = {
  locale: Locale;
  /** A grown-up allowed voice for this learner. Sent to our route with under13; it refuses an under-13 learner without consent. */
  consent: boolean;
  /** The learner may be under 13. */
  under13: boolean;
  /** Learner names: removed from the text before it leaves the device. */
  names?: string[];
  /** 0.7–1.2; 0.95 by default. */
  rate?: number;
  /** Reads what the vendor couldn't (usually the browser voice). */
  fallback?: SpeechOut | null;
  fetch?: typeof fetch;
  WebSocket?: typeof WebSocket;
  audioContext?: () => AudioContext;
  tokenUrl?: string;
  now?: () => number;
};

type Sentence = { text: string; base: number; spokenEnd: number };

type Run = {
  done: boolean;
  failed: boolean;
  resolve: () => void;
  ws: WebSocket | null;
  sources: AudioBufferSourceNode[];
  nextStart: number;
  lastEnd: number;
  carry: number | null;
  boundaries: { at: number; index: number }[];
  /** Written-word index for each spoken word, in order. */
  spoken: number[];
  sentences: Sentence[];
  nextBase: number;
  /** Words whose timing has arrived (≈ words that have audio). */
  aligned: number;
  prevSpace: boolean;
  started: boolean;
  streamDone: boolean;
  closeSent: boolean;
  finalReceived: boolean;
  ticker: ReturnType<typeof setInterval> | null;
  fb: ReturnType<typeof asyncQueue<string>> | null;
  /** Word index where the fallback's reading starts. */
  fbBase: number;
  fbUnsubs: Unsubscribe[];
  fbActive: boolean;
};

export function elevenLabsSpeechOut(o: ElevenLabsOptions): SpeechOut {
  const f = o.fetch ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
  const WS = o.WebSocket ?? WebSocket;
  const rate = Math.min(1.2, Math.max(0.7, o.rate ?? 0.95));
  const now = o.now ?? (() => Date.now());
  const ev = { boundary: emitter<[number]>(), start: emitter<[]>(), end: emitter<[{ cancelled: boolean }]>(), error: emitter<[VoiceError]>() };
  let state: OutState = "idle";
  let ctx: AudioContext | null = null;
  let run: Run | null = null;
  let spare: { at: number; token: Promise<TtsToken> } | null = null;
  let disposed = false;

  const audio = () => (ctx ??= (o.audioContext ?? (() => new AudioContext()))());

  async function fetchToken(): Promise<TtsToken> {
    const t = await requestToken<TtsToken>(f, o.tokenUrl ?? "/api/voice/tts-token", { consent: o.consent, under13: o.under13, locale: o.locale });
    if (!t.token || !t.voiceId) throw new VoiceError("unavailable", "token reply");
    return t;
  }
  const prefetch = () => {
    const token = fetchToken();
    token.catch(() => {
      if (spare?.token === token) spare = null;
    });
    spare = { at: now(), token };
  };
  const takeToken = () => {
    const s = spare;
    spare = null;
    return s && now() - s.at < TOKEN_TTL_MS ? s.token : fetchToken();
  };

  function stopTicker(r: Run) {
    if (r.ticker) clearInterval(r.ticker);
    r.ticker = null;
  }

  function finish(r: Run, cancelled: boolean) {
    if (r.done) return;
    r.done = true;
    stopTicker(r);
    r.fbUnsubs.forEach((u) => u());
    r.fb?.end();
    for (const s of r.sources)
      try {
        s.stop();
      } catch {}
    r.sources = [];
    try {
      r.ws?.close(1000);
    } catch {}
    if (run === r) {
      run = null;
      state = "idle";
    }
    ev.end.emit({ cancelled });
    r.resolve();
  }

  function tick(r: Run) {
    if (r.done || !ctx || r.fbActive) return;
    const t = ctx.currentTime;
    while (r.boundaries.length && r.boundaries[0].at <= t) ev.boundary.emit(r.boundaries.shift()!.index);
    const finished = r.failed ? r.streamDone && !r.fb : r.finalReceived;
    if (finished && t >= r.lastEnd) finish(r, false);
  }

  function play(r: Run, b64: string, al: Alignment | null | undefined) {
    const c = audio();
    const { samples, carry } = pcm16ToFloat32(b64, r.carry);
    r.carry = carry;
    if (!samples.length) return;
    const buf = c.createBuffer(1, samples.length, TTS_SAMPLE_RATE);
    buf.getChannelData(0).set(samples);
    const src = c.createBufferSource();
    src.buffer = buf;
    src.connect(c.destination);
    const at = Math.max(c.currentTime + 0.03, r.nextStart);
    src.start(at);
    src.onended = () => {
      r.sources = r.sources.filter((s) => s !== src);
    };
    r.sources.push(src);
    r.nextStart = r.lastEnd = at + samples.length / TTS_SAMPLE_RATE;
    // Character timings are relative to this chunk: a word starts at a non-space after a space.
    const chars = al?.chars ?? [];
    const times = al?.charStartTimesMs ?? [];
    chars.forEach((ch, i) => {
      const space = /\s/.test(ch);
      if (!space && r.prevSpace) {
        const k = r.aligned++;
        const index = r.spoken[Math.min(k, r.spoken.length - 1)];
        if (index !== undefined) r.boundaries.push({ at: at + (times[i] ?? 0) / 1000, index });
      }
      r.prevSpace = space;
    });
    if (!r.started) {
      r.started = true;
      if (state === "waiting") state = "speaking";
      ev.start.emit();
    }
  }

  function startFallback(r: Run) {
    const fb = o.fallback;
    if (r.done || !fb || !r.fb) return;
    r.fbActive = true;
    stopTicker(r);
    const base = r.fbBase;
    r.fbUnsubs.push(
      fb.onStart(() => {
        if (!r.started) {
          r.started = true;
          ev.start.emit();
        }
        if (state === "waiting") state = "speaking";
      }),
      fb.onBoundary((i) => ev.boundary.emit(base + i)),
      fb.onEnd(({ cancelled }) => finish(r, cancelled)),
      fb.onError((e) => ev.error.emit(new VoiceError("speak", `fallback: ${e.message}`))),
    );
    void fb.speak(r.fb);
    if (state === "paused") fb.pause();
  }

  /**
   * The vendor failed: let the audio we already have play out, then the fallback reads the rest. With a
   * fallback this is not an error the family needs to see (the reply is still read aloud); without
   * one it is a read-aloud failure ("speak"), whatever the cause.
   */
  function fail(r: Run, e: unknown) {
    if (r.failed || r.done) return;
    r.failed = true;
    try {
      r.ws?.close(1000);
    } catch {}
    if (!o.fallback) {
      ev.error.emit(new VoiceError("speak", `${asVoiceError(e).code}: ${asVoiceError(e).message}`));
      return; // tick() ends the run once the stream is over and the audio has played
    }
    r.fb = asyncQueue<string>();
    const unheard = r.sentences.filter((s) => s.spokenEnd > r.aligned);
    r.fbBase = unheard[0]?.base ?? r.nextBase;
    for (const s of unheard) r.fb.push(s.text);
    if (r.streamDone) r.fb.end();
    const wait = ctx ? Math.max(0, r.lastEnd - ctx.currentTime) * 1000 : 0;
    setTimeout(() => startFallback(r), wait);
  }

  function onMessage(r: Run, data: unknown) {
    if (r.done || r.failed) return;
    let m: ServerMessage;
    try {
      m = JSON.parse(String(data)) as ServerMessage;
    } catch {
      return;
    }
    if (m.error) return fail(r, new VoiceError("unavailable", m.error));
    if (m.audio) play(r, m.audio, m.alignment ?? m.normalizedAlignment);
    if (m.isFinal && r.closeSent) r.finalReceived = true;
  }

  async function connect(r: Run) {
    const c = audio();
    const locked = () => c.state === "suspended" && out.state !== "paused";
    if (locked()) {
      // Browsers keep audio locked until a tap (see warm()); resume() may then never settle, so don't wait on it.
      await Promise.race([c.resume().catch(() => {}), new Promise((ok) => setTimeout(ok, 300))]);
      if (locked()) throw new VoiceError("speak", "audio is locked until the page is tapped");
    }
    const t = await takeToken();
    if (r.done) return;
    prefetch(); // the next reply starts faster
    const ws = new WS(ttsSocketUrl(t));
    r.ws = ws;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new VoiceError("network", "connect timeout"));
        try {
          ws.close();
        } catch {}
      }, CONNECT_TIMEOUT_MS);
      ws.onopen = () => (clearTimeout(timer), resolve());
      ws.onerror = () => (clearTimeout(timer), reject(new VoiceError("network")));
      ws.onclose = () => (clearTimeout(timer), reject(new VoiceError("network")));
    });
    ws.onmessage = (e) => onMessage(r, e.data);
    ws.onerror = null;
    ws.onclose = (e) => {
      if (r.done || r.failed || r.finalReceived) return;
      // After our close message the server sends what's left, then closes: all audio is in.
      if (r.closeSent && (e.code === 1000 || r.aligned >= r.spoken.length)) r.finalReceived = true;
      else fail(r, new VoiceError("network"));
    };
    ws.send(JSON.stringify({ text: " ", voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: rate } }));
  }

  async function drive(r: Run, source: SpeakSource) {
    const connected = connect(r).then(
      () => true,
      (e) => (fail(r, e), false),
    );
    try {
      let first = true;
      for await (const sentence of sentencesFrom(source)) {
        if (r.done) return;
        if (first) {
          // The socket opens while the first sentence is being written; wait for it only now.
          first = false;
          await connected;
          if (r.done) return;
        }
        if (r.failed) {
          r.fb?.push(sentence);
          r.nextBase += countWords(sentence);
          continue;
        }
        const sp = speakable(sentence, o.locale, o.names);
        const base = r.nextBase;
        r.nextBase += countWords(sentence);
        for (const w of sp.words) r.spoken.push(base + w);
        r.sentences.push({ text: sentence, base, spokenEnd: r.spoken.length });
        if (sp.text) r.ws?.send(JSON.stringify({ text: `${sp.text} `, flush: true }));
      }
    } catch {
      // The caller's stream broke off: finish with what we have.
    }
    if (r.done) return;
    r.streamDone = true;
    if (!r.sentences.length && !r.failed) return finish(r, false); // nothing to say; don't wait for the socket
    await connected;
    if (r.done) return;
    if (r.failed) {
      r.fb?.end();
      return;
    }
    r.closeSent = true;
    r.ws?.send(JSON.stringify({ text: "" }));
  }

  const out: SpeechOut = {
    kind: "elevenlabs",
    get state() {
      return state;
    },
    speak(source) {
      out.cancel();
      if (disposed) return Promise.resolve();
      state = "waiting";
      return new Promise<void>((resolve) => {
        const r: Run = {
          done: false, failed: false, resolve, ws: null, sources: [], nextStart: 0, lastEnd: 0, carry: null, boundaries: [], spoken: [],
          sentences: [], nextBase: 0, aligned: 0, prevSpace: true, started: false, streamDone: false, closeSent: false, finalReceived: false,
          ticker: null, fb: null, fbBase: 0, fbUnsubs: [], fbActive: false,
        };
        run = r;
        r.ticker = setInterval(() => tick(r), 25);
        void drive(r, source);
      });
    },
    pause() {
      if (!run || state === "paused") return;
      if (run.fbActive) o.fallback?.pause();
      else void ctx?.suspend();
      state = "paused";
    },
    resume() {
      if (!run || state !== "paused") return;
      if (run.fbActive) o.fallback?.resume();
      else void ctx?.resume();
      state = run.started ? "speaking" : "waiting";
    },
    cancel() {
      const r = run;
      if (!r) return;
      if (r.fbActive) o.fallback?.cancel();
      if (state === "paused") void ctx?.resume();
      finish(r, true);
    },
    warm() {
      if (disposed) return;
      // Runs inside a tap that also sends a message or starts reading: it must never throw.
      try {
        const c = audio();
        if (c.state === "suspended") void c.resume().catch(() => {});
        // A silent sample started inside the tap unlocks audio on iOS.
        const b = c.createBuffer(1, 1, TTS_SAMPLE_RATE);
        const s = c.createBufferSource();
        s.buffer = b;
        s.connect(c.destination);
        s.start();
      } catch {}
      if (!spare) prefetch();
      o.fallback?.warm();
    },
    dispose() {
      out.cancel();
      disposed = true;
      spare = null;
      o.fallback?.dispose();
      const c = ctx;
      ctx = null;
      if (c && c.state !== "closed") void c.close().catch(() => {});
    },
    onBoundary: ev.boundary.on,
    onStart: ev.start.on,
    onEnd: ev.end.on,
    onError: ev.error.on,
  };
  return out;
}
