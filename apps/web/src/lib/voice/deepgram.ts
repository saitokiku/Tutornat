import type { Locale } from "@/lib/types";
import { isHolding } from "./backchannel";
import { FLUX, HOLDING_MS, NOVA } from "./bands";
import { MIC_RATE, micCapture, micError, type Capture, type MicCapture } from "./mic";
import { hasName } from "./speakable";
import { requestToken } from "./token";
import { TURN_MANUAL, turnOptions, turnTracker, type TurnTracker } from "./turn";
import { asVoiceError, emitter, metaOf, VoiceError, type Band, type HeardWord, type ListenOptions, type SpeechIn, type TurnMeta } from "./types";

// Deepgram live speech-to-text, straight from the browser with a short-lived token from
// /api/voice/stt-token (the key stays on our server). Microphone audio goes up as 16 kHz linear PCM
// in 80 ms frames. We opt out of Deepgram's model-improvement program on every stream.
//
// Two models (live tutor spec §2.2):
//  - Flux (wss://api.deepgram.com/v2/listen), the default: Deepgram decides the end of the turn,
//    with thresholds by band. EagerEndOfTurn lets a reply start early (grades 3–9); TurnResumed
//    takes it back. Message shapes follow Deepgram's Flux docs and are to be confirmed against the
//    P0 fixtures.
//  - Nova-3 (wss://api.deepgram.com/v1/listen), the fallback: our own end-of-turn rules (./turn) on
//    its interim and final words, with endpointing by band.
// Both: word times (for echo matching by time) and confidence come with every turn; a complete
// spoken answer to the waiting problem ends the turn after a short silence; "wait", "a ver" hold the
// floor for 8 s and are never sent alone.

const WS_FLUX = "wss://api.deepgram.com/v2/listen";
const WS_NOVA = "wss://api.deepgram.com/v1/listen";
const CONNECT_TIMEOUT_MS = 5000;
const CLOSE_WAIT_MS = 1500;
const MAX_BUFFERED_FRAMES = 40; // 3.2 s of 80 ms frames while the socket opens
/** A connection this healthy for this long gets its one reconnect back. */
export const HEALTHY_MS = 30_000;
/** More than this waiting to upload (about 1 s of audio) and the connection is slow. */
export const SLOW_BYTES = 32 * 1024;
/** Tokens are prefetched this often while a voice surface is open (they live 60 s). */
export const TOKEN_REFRESH_MS = 50_000;

export type SttToken = {
  token: string;
  expiresIn: number;
  model: string;
  language: string;
  /** Flux ("v2") or Nova ("v1"). From the model when left out. */
  api?: "v1" | "v2";
  /** Flux multilingual: the languages to expect, most likely first. */
  languageHint?: string[];
};

const isFlux = (t: SttToken) => (t.api ?? (t.model.startsWith("flux") ? "v2" : "v1")) === "v2";

export function fluxSocketUrl(t: SttToken, band: Band, keyterms: string[] = []): string {
  const f = FLUX[band];
  const q = new URLSearchParams({ model: t.model, encoding: "linear16", sample_rate: String(MIC_RATE), eot_threshold: String(f.eotThreshold), eot_timeout_ms: String(f.eotTimeoutMs), mip_opt_out: "true" });
  if (f.eagerThreshold != null) q.set("eager_eot_threshold", String(f.eagerThreshold));
  for (const l of t.languageHint ?? []) q.append("language_hint", l);
  for (const k of keyterms.slice(0, 20)) if (k.trim()) q.append("keyterm", k.trim().slice(0, 50));
  return `${WS_FLUX}?${q}`;
}

export function novaSocketUrl(t: SttToken, band: Band, keyterms: string[] = []): string {
  const n = NOVA[band];
  const q = new URLSearchParams({
    model: t.model,
    language: t.language,
    encoding: "linear16",
    sample_rate: String(MIC_RATE),
    channels: "1",
    interim_results: "true",
    punctuate: "true",
    smart_format: "true",
    filler_words: "true", // "um" tells us the learner is still thinking
    endpointing: String(n.endpointing),
    utterance_end_ms: String(n.utteranceEndMs),
    vad_events: "true",
    mip_opt_out: "true",
  });
  for (const k of keyterms.slice(0, 20)) if (k.trim()) q.append("keyterm", k.trim().slice(0, 50));
  return `${WS_NOVA}?${q}`;
}

/** @deprecated the Nova URL; kept for callers of the first version. */
export const sttSocketUrl = (t: SttToken, keyterms: string[] = []) => novaSocketUrl(t, "69", keyterms);

type NovaWord = { word: string; punctuated_word?: string; start: number; end: number; confidence?: number };
type NovaResults = { type: "Results"; is_final?: boolean; speech_final?: boolean; channel?: { alternatives?: { transcript?: string; words?: NovaWord[] }[] } };
type FluxTurn = {
  type: "TurnInfo";
  event: "StartOfTurn" | "Update" | "EagerEndOfTurn" | "TurnResumed" | "EndOfTurn";
  transcript?: string;
  words?: { word: string; confidence?: number }[];
  audio_window_start?: number;
  audio_window_end?: number;
};
type ServerMessage = NovaResults | FluxTurn | { type: "SpeechStarted" | "UtteranceEnd" | "Metadata" | "Connected" | "Error" | string; description?: string };

export type DeepgramOptions = {
  locale: Locale;
  /** A grown-up allowed the microphone for this learner. Sent to our route, which refuses without it. */
  consent: boolean;
  /** The learner may be under 13. */
  under13: boolean;
  /** Learner names: never sent, so recognizer hints that mention one are dropped. */
  names?: string[];
  band?: Band;
  fetch?: typeof fetch;
  WebSocket?: typeof WebSocket;
  capture?: MicCapture;
  tokenUrl?: string;
  /** performance.now() */
  now?: () => number;
};

export function deepgramSpeechIn(o: DeepgramOptions): SpeechIn & { prepare(): () => void; dispose(): void; readonly model: "flux" | "nova" | null } {
  const f = o.fetch ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
  const WS = o.WebSocket ?? WebSocket;
  const capture = o.capture ?? micCapture;
  const now = o.now ?? (() => performance.now());
  const ev = {
    partial: emitter<[string]>(),
    final: emitter<[string]>(),
    words: emitter<[HeardWord[]]>(),
    turn: emitter<[string, TurnMeta]>(),
    eager: emitter<[string, TurnMeta]>(),
    resumed: emitter<[]>(),
    speech: emitter<[]>(),
    slow: emitter<[boolean]>(),
    error: emitter<[VoiceError]>(),
  };

  let listening = false;
  let session = 0;
  let mic: Capture | null = null;
  let ws: WebSocket | null = null;
  let flux = false;
  let tracker: TurnTracker | null = null;
  let opts: ListenOptions = {};
  let buffered: ArrayBuffer[] = [];
  let droppedSamples = 0;
  let stopping = false;
  let discard = false;
  let reconnects = 0;
  let healthyTimer: ReturnType<typeof setTimeout> | undefined;
  let keyterms: string[] = [];
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  let slow = false;
  let spare: { at: number; token: Promise<SttToken> } | null = null;
  let refresh: ReturnType<typeof setInterval> | undefined;
  // Flux: the turn so far, a held "wait …", and a pending early end for a complete answer.
  let fluxWords: HeardWord[] = [];
  let fluxText = "";
  let held: { text: string; words: HeardWord[]; timer: ReturnType<typeof setTimeout> } | null = null;
  let answerTimer: ReturnType<typeof setTimeout> | undefined;
  let novaWords: HeardWord[] = [];
  let fluxPast: { text: string; words: HeardWord[] }[] = [];

  const band = () => opts.band ?? o.band ?? "69";

  async function fetchToken(): Promise<SttToken> {
    const t = await requestToken<SttToken>(f, o.tokenUrl ?? "/api/voice/stt-token", { consent: o.consent, under13: o.under13, locale: o.locale });
    if (!t.token) throw new VoiceError("unavailable", "token reply");
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
    return s && now() - s.at < TOKEN_REFRESH_MS ? s.token : fetchToken();
  };

  /** Stream time (seconds since the first sample sent) → performance.now() ms. */
  const streamAt = (sec: number) => (mic?.startedAt() ?? now()) + (droppedSamples / MIC_RATE) * 1000 + sec * 1000;

  const send = (pcm: Int16Array) => {
    const buf = pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + pcm.byteLength) as ArrayBuffer;
    if (ws?.readyState === 1) {
      ws.send(buf);
      const isSlow = (ws.bufferedAmount ?? 0) > SLOW_BYTES;
      if (isSlow !== slow) {
        slow = isSlow;
        ev.slow.emit(slow);
      }
    } else if (!stopping) {
      buffered.push(buf);
      if (buffered.length > MAX_BUFFERED_FRAMES) droppedSamples += buffered.shift()!.byteLength / 2;
    }
  };

  function clearFluxTurn() {
    clearTimeout(answerTimer);
    fluxWords = [];
    fluxText = "";
  }

  function cleanup() {
    clearTimeout(closeTimer);
    clearTimeout(healthyTimer);
    clearTimeout(answerTimer);
    if (held) clearTimeout(held.timer);
    held = null;
    mic?.stop();
    mic = null;
    const s = ws;
    ws = null; // its handlers see they're stale and do nothing
    try {
      s?.close(1000);
    } catch {}
    buffered = [];
    droppedSamples = 0;
    listening = false;
    if (slow) {
      slow = false;
      ev.slow.emit(false);
    }
  }

  const emitTurn = (text: string, words: HeardWord[]) => {
    novaWords = [];
    ev.turn.emit(text, metaOf(words));
  };

  /** The stream is over (stop() or a failure): the words so far become the turn unless discarded. */
  function finishStop() {
    const text = discard ? "" : flux ? [held?.text, ...fluxPast.map((p) => p.text), fluxText].filter(Boolean).join(" ").trim() : (tracker?.flush() ?? "");
    const words = flux ? [...(held?.words ?? []), ...fluxPast.flatMap((p) => p.words), ...fluxWords] : novaWords;
    fluxPast = [];
    tracker?.reset();
    tracker = null;
    clearFluxTurn();
    cleanup();
    if (text && !(flux && isHolding(text))) emitTurn(text, words);
  }

  function fatal(e: unknown) {
    const err = asVoiceError(e, "network");
    discard = false;
    stopping = true;
    finishStop(); // keep what the learner already said
    ev.error.emit(err);
  }

  // ---- Flux

  /** Flux gives no word times: spread the words over the audio window they came in. */
  function fluxTimed(m: FluxTurn): HeardWord[] {
    const ws0 = m.words ?? [];
    const a = m.audio_window_start ?? 0;
    const b = m.audio_window_end ?? a;
    const step = ws0.length ? (b - a) / ws0.length : 0;
    return ws0.map((w, i) => ({ word: w.word, start: streamAt(a + i * step), end: streamAt(a + (i + 1) * step), confidence: typeof w.confidence === "number" ? w.confidence : null }));
  }

  function fluxEnd(text: string, words: HeardWord[]) {
    clearFluxTurn();
    // "Wait" / "a ver": hold the floor; it is sent only with what follows, and never alone.
    if (isHolding(text, true)) {
      const prior = held;
      if (prior) clearTimeout(prior.timer);
      const all = { text: [prior?.text, text].filter(Boolean).join(" "), words: [...(prior?.words ?? []), ...words] };
      held = {
        ...all,
        timer: setTimeout(() => {
          held = null;
          if (!isHolding(all.text)) emitTurn(all.text, all.words);
        }, HOLDING_MS),
      };
      return;
    }
    const prior = held;
    held = null;
    if (prior) clearTimeout(prior.timer);
    emitTurn([prior?.text, text].filter(Boolean).join(" "), [...(prior?.words ?? []), ...words]);
  }

  function onFlux(m: FluxTurn) {
    const text = (m.transcript ?? "").trim();
    const words = fluxTimed(m);
    if (m.event === "StartOfTurn") {
      clearTimeout(answerTimer);
      if (held) clearTimeout(held.timer);
      ev.speech.emit();
      return;
    }
    if (m.event === "TurnResumed") {
      ev.resumed.emit();
      return;
    }
    if (text) {
      fluxText = text;
      fluxWords = words;
      ev.words.emit(words);
      ev.partial.emit([held?.text, text].filter(Boolean).join(" "));
    }
    if (m.event === "EagerEndOfTurn" && text) ev.eager.emit(text, metaOf(words));
    if (m.event === "EndOfTurn") {
      if (text) ev.final.emit(text);
      if (!text) return;
      if (opts.turns === "auto") fluxEnd(text, words);
      else {
        // Push-to-talk: Flux's turns are pieces of the one turn that ends at stop().
        fluxPast.push({ text, words });
        clearFluxTurn();
      }
      return;
    }
    // A complete spoken answer: end the turn after a short silence, before Flux would.
    clearTimeout(answerTimer);
    if (opts.turns === "auto" && text && opts.answer?.(text)) {
      const wait = turnOptions(band()).answerMs ?? 500;
      answerTimer = setTimeout(() => {
        if (fluxText === text) fluxEnd(text, words);
      }, wait);
    }
  }

  // ---- Nova

  function onNova(m: NovaResults) {
    const alt = m.channel?.alternatives?.[0];
    const text = alt?.transcript?.trim() ?? "";
    const words: HeardWord[] = (alt?.words ?? []).map((w) => ({ word: w.punctuated_word ?? w.word, start: streamAt(w.start), end: streamAt(w.end), confidence: typeof w.confidence === "number" ? w.confidence : null }));
    const at = now();
    const wordEnd = words.length ? words[words.length - 1].end : undefined;
    if (words.length) ev.words.emit(words);
    if (m.is_final) {
      novaWords.push(...words);
      tracker?.feed({ type: "final", text, at, speechFinal: !!m.speech_final, wordEnd });
      if (text) ev.final.emit(text);
    } else tracker?.feed({ type: "partial", text, at, wordEnd });
    const so = tracker?.text();
    if (so) ev.partial.emit(so);
  }

  function onMessage(data: unknown) {
    let m: ServerMessage;
    try {
      m = JSON.parse(String(data)) as ServerMessage;
    } catch {
      return;
    }
    if (m.type === "TurnInfo") return onFlux(m as FluxTurn);
    if (m.type === "Error") return fatal(new VoiceError("unavailable", (m as { description?: string }).description));
    if (!tracker) return;
    if (m.type === "Results") onNova(m as NovaResults);
    else if (m.type === "SpeechStarted") {
      tracker.feed({ type: "speech-start", at: now() });
      ev.speech.emit();
    } else if (m.type === "UtteranceEnd") tracker.feed({ type: "utterance-end", at: now() });
  }

  async function connect(id: number, t: SttToken) {
    flux = isFlux(t);
    const url = flux ? fluxSocketUrl(t, band(), keyterms) : novaSocketUrl(t, band(), keyterms);
    const s = new WS(url, ["bearer", t.token]);
    s.binaryType = "arraybuffer";
    ws = s;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new VoiceError("network", "connect timeout"));
        try {
          s.close();
        } catch {}
      }, CONNECT_TIMEOUT_MS);
      s.onopen = () => (clearTimeout(timer), resolve());
      s.onerror = () => (clearTimeout(timer), reject(new VoiceError("network")));
      s.onclose = (e) => (clearTimeout(timer), reject(new VoiceError(e.code === 1008 ? "unavailable" : "network", `close ${e.code}`)));
    });
    if (id !== session || ws !== s) return;
    s.onmessage = (e) => {
      if (ws === s) onMessage(e.data);
    };
    s.onerror = null;
    clearTimeout(healthyTimer);
    healthyTimer = setTimeout(() => (reconnects = 0), HEALTHY_MS);
    s.onclose = () => {
      if (ws !== s || id !== session) return;
      ws = null;
      clearTimeout(healthyTimer);
      if (stopping) return finishStop();
      // A dropped connection mid-conversation: one fresh try, keeping the words heard so far.
      if (reconnects++ < 1) {
        takeToken()
          .then((t2) => (id === session && !stopping ? connect(id, t2) : undefined))
          .catch((e) => id === session && fatal(e));
      } else fatal(new VoiceError("network"));
    };
    for (const b of buffered) s.send(b);
    buffered = [];
  }

  const input = {
    kind: "deepgram" as const,
    duplex: true,
    /** Which Deepgram model the last stream used, for the latency log. */
    get model(): "flux" | "nova" | null {
      return session ? (flux ? "flux" : "nova") : null;
    },
    get listening() {
      return listening;
    },
    /** A voice surface opened: fetch a token now and every 50 s, so the microphone opens without waiting for one. Stop when it closes. */
    prepare() {
      if (!spare) prefetch();
      clearInterval(refresh);
      const mine = setInterval(prefetch, TOKEN_REFRESH_MS);
      refresh = mine;
      return () => {
        clearInterval(mine);
        if (refresh === mine) refresh = undefined;
      };
    },
    dispose() {
      clearInterval(refresh);
      refresh = undefined;
      spare = null;
      input.abort();
    },
    async start(o2: ListenOptions = {}) {
      if (listening && !stopping) return;
      if (listening) {
        // Still closing the last stream: hand over its words now and start fresh.
        session++;
        finishStop();
      }
      const id = ++session;
      opts = o2;
      listening = true;
      stopping = false;
      discard = false;
      reconnects = 0;
      buffered = [];
      droppedSamples = 0;
      novaWords = [];
      fluxPast = [];
      clearFluxTurn();
      keyterms = (o2.keyterms ?? []).filter((k) => !hasName(k, o.names ?? []));
      tracker = turnTracker({
        options: o2.turns === "auto" ? turnOptions(band(), o2.answer) : TURN_MANUAL,
        onEnd: (text) => emitTurn(text, novaWords),
        now,
      });
      const [token, cap] = await Promise.allSettled([takeToken(), capture({ onFrame: send, targetRate: MIC_RATE })]);
      if (id !== session) {
        // stop() or abort() came first
        if (cap.status === "fulfilled") cap.value.stop();
        return;
      }
      if (cap.status === "fulfilled") mic = cap.value;
      // What to tell the family first: no permission from a grown-up, then the microphone, then the service.
      const tokenErr = token.status === "rejected" ? asVoiceError(token.reason) : null;
      const failed = tokenErr?.code === "consent" ? tokenErr : cap.status === "rejected" ? micError(cap.reason) : tokenErr;
      if (failed || token.status !== "fulfilled") {
        tracker = null;
        cleanup();
        const err = failed ?? new VoiceError("unavailable");
        ev.error.emit(err);
        throw err;
      }
      if (!refresh) prefetch(); // the reconnect, and the next press, have a token ready
      try {
        await connect(id, token.value);
      } catch (e) {
        if (id !== session) return;
        tracker = null;
        cleanup();
        const err = asVoiceError(e, "network");
        ev.error.emit(err);
        throw err;
      }
    },
    stop() {
      if (!listening || stopping) return;
      stopping = true;
      mic?.stop();
      mic = null;
      if (ws?.readyState === 1) {
        // Deepgram sends the last words, then closes; don't wait forever.
        ws.send(JSON.stringify({ type: "CloseStream" }));
        closeTimer = setTimeout(finishStop, CLOSE_WAIT_MS);
      } else {
        session++;
        finishStop();
      }
    },
    abort() {
      if (!listening) return;
      session++;
      stopping = true;
      discard = true;
      finishStop();
      if (!tracker) cleanup();
    },
    level: () => (listening && mic ? mic.level() : 0),
    onPartial: ev.partial.on,
    onFinal: ev.final.on,
    onWords: ev.words.on,
    onEndOfTurn: ev.turn.on,
    onEagerEnd: ev.eager.on,
    onTurnResumed: ev.resumed.on,
    onSpeechStart: ev.speech.on,
    onSlow: ev.slow.on,
    onError: ev.error.on,
  };
  return input;
}
