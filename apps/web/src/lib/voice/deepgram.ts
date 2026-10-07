import type { Locale } from "@/lib/types";
import { MIC_RATE, micCapture, micError, type Capture, type MicCapture } from "./mic";
import { hasName } from "./speakable";
import { requestToken } from "./token";
import { TURN_DEFAULT, TURN_MANUAL, TURN_YOUNG, turnTracker, type TurnTracker } from "./turn";
import { asVoiceError, emitter, VoiceError, type ListenOptions, type SpeechIn } from "./types";

// Deepgram live speech-to-text over their WebSocket (`/v1/listen`). The browser connects directly with
// a short-lived token from /api/voice/stt-token (the key stays on our server); the token only has to
// be valid when the socket opens. Microphone audio goes up as 16 kHz linear PCM; interim and final
// words, speech-start and utterance-end events come back and feed our end-of-turn rules. We opt out
// of Deepgram's model-improvement program on every stream. Docs: developers.deepgram.com/reference/speech-to-text/listen-streaming

const WS_BASE = "wss://api.deepgram.com/v1/listen";
const CONNECT_TIMEOUT_MS = 5000;
const CLOSE_WAIT_MS = 1500;
const MAX_BUFFERED_FRAMES = 60; // ≈ 2.5 s of audio while the socket opens

export type SttToken = { token: string; expiresIn: number; model: string; language: string };

type Word = { word: string; start: number; end: number };
type ServerMessage =
  | { type: "Results"; is_final?: boolean; speech_final?: boolean; from_finalize?: boolean; channel?: { alternatives?: { transcript?: string; words?: Word[] }[] } }
  | { type: "SpeechStarted"; timestamp?: number }
  | { type: "UtteranceEnd"; last_word_end?: number }
  | { type: "Metadata" }
  | { type: string };

export function sttSocketUrl(t: SttToken, keyterms: string[] = []): string {
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
    endpointing: "300",
    utterance_end_ms: "1000",
    vad_events: "true",
    mip_opt_out: "true",
  });
  for (const k of keyterms.slice(0, 20)) if (k.trim()) q.append("keyterm", k.trim().slice(0, 50));
  return `${WS_BASE}?${q}`;
}

export type DeepgramOptions = {
  locale: Locale;
  /** A grown-up allowed the microphone for this learner. Sent to our route, which refuses without it. */
  consent: boolean;
  /** The learner may be under 13. */
  under13: boolean;
  /** Learner names: never sent, so recognizer hints that mention one are dropped. */
  names?: string[];
  /** K–5: longer pauses before a turn ends. */
  young?: boolean;
  fetch?: typeof fetch;
  WebSocket?: typeof WebSocket;
  capture?: MicCapture;
  tokenUrl?: string;
  now?: () => number;
};

export function deepgramSpeechIn(o: DeepgramOptions): SpeechIn {
  const f = o.fetch ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
  const WS = o.WebSocket ?? WebSocket;
  const capture = o.capture ?? micCapture;
  const now = o.now ?? (() => Date.now());
  const ev = {
    partial: emitter<[string]>(),
    final: emitter<[string]>(),
    turn: emitter<[string]>(),
    speech: emitter<[]>(),
    error: emitter<[VoiceError]>(),
  };

  let listening = false;
  let session = 0;
  let mic: Capture | null = null;
  let ws: WebSocket | null = null;
  let tracker: TurnTracker | null = null;
  let buffered: ArrayBuffer[] = [];
  let stopping = false;
  let discard = false;
  let reconnects = 0;
  let keyterms: string[] = [];
  let closeTimer: ReturnType<typeof setTimeout> | undefined;

  async function fetchToken(): Promise<SttToken> {
    const t = await requestToken<SttToken>(f, o.tokenUrl ?? "/api/voice/stt-token", { consent: o.consent, under13: o.under13, locale: o.locale });
    if (!t.token) throw new VoiceError("unavailable", "token reply");
    return t;
  }

  const send = (pcm: Int16Array) => {
    const buf = pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + pcm.byteLength) as ArrayBuffer;
    if (ws?.readyState === 1) ws.send(buf);
    else if (!stopping) {
      buffered.push(buf);
      if (buffered.length > MAX_BUFFERED_FRAMES) buffered.shift();
    }
  };

  function cleanup() {
    clearTimeout(closeTimer);
    mic?.stop();
    mic = null;
    const s = ws;
    ws = null; // its handlers see they're stale and do nothing
    try {
      s?.close(1000);
    } catch {}
    buffered = [];
    listening = false;
  }

  /** The stream is over (stop() or a failure): the words so far become the turn unless discarded. */
  function finishStop() {
    if (!tracker) return;
    const text = discard ? "" : tracker.flush();
    tracker.reset();
    tracker = null;
    cleanup();
    if (text) ev.turn.emit(text);
  }

  function fatal(e: unknown) {
    const err = asVoiceError(e, "network");
    discard = false;
    stopping = true;
    finishStop(); // keep what the learner already said
    ev.error.emit(err);
  }

  function onMessage(data: unknown) {
    if (!tracker) return;
    let m: ServerMessage;
    try {
      m = JSON.parse(String(data)) as ServerMessage;
    } catch {
      return;
    }
    const at = now();
    if (m.type === "Results") {
      const r = m as Extract<ServerMessage, { type: "Results" }>;
      const text = r.channel?.alternatives?.[0]?.transcript?.trim() ?? "";
      if (r.is_final) {
        tracker?.feed({ type: "final", text, at, speechFinal: !!r.speech_final });
        if (text) ev.final.emit(text);
      } else tracker?.feed({ type: "partial", text, at });
      const so = tracker?.text();
      if (so) ev.partial.emit(so);
    } else if (m.type === "SpeechStarted") {
      tracker.feed({ type: "speech-start", at });
      ev.speech.emit();
    } else if (m.type === "UtteranceEnd") {
      tracker.feed({ type: "utterance-end", at });
    }
  }

  async function connect(id: number, t: SttToken) {
    const s = new WS(sttSocketUrl(t, keyterms), ["bearer", t.token]);
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
    s.onclose = () => {
      if (ws !== s || id !== session) return;
      ws = null;
      if (stopping) return finishStop();
      // A dropped connection mid-conversation: one fresh try, keeping the words heard so far.
      if (reconnects++ < 1) {
        fetchToken()
          .then((t2) => (id === session && !stopping ? connect(id, t2) : undefined))
          .catch((e) => id === session && fatal(e));
      } else fatal(new VoiceError("network"));
    };
    for (const b of buffered) s.send(b);
    buffered = [];
  }

  return {
    kind: "deepgram",
    get listening() {
      return listening;
    },
    async start(opts: ListenOptions = {}) {
      if (listening && !stopping) return;
      if (listening) {
        // Still closing the last stream: hand over its words now and start fresh.
        session++;
        finishStop();
      }
      const id = ++session;
      listening = true;
      stopping = false;
      discard = false;
      reconnects = 0;
      buffered = [];
      keyterms = (opts.keyterms ?? []).filter((k) => !hasName(k, o.names ?? []));
      tracker = turnTracker({
        options: opts.turns === "auto" ? (o.young ? TURN_YOUNG : TURN_DEFAULT) : TURN_MANUAL,
        onEnd: (text) => ev.turn.emit(text),
        now,
      });
      const [token, cap] = await Promise.allSettled([fetchToken(), capture({ onFrame: send, targetRate: MIC_RATE })]);
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
    onEndOfTurn: ev.turn.on,
    onSpeechStart: ev.speech.on,
    onError: ev.error.on,
  };
}
