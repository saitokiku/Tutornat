import type { Locale } from "@/lib/types";
import { playbackSession, resumeWithin, sharedAudio, unlockAudio } from "./audio";
import { voiceSpeed } from "./bands";
import { isClauseCut, sentencesFrom } from "./chunk";
import { assertSpoken } from "./numbers";
import { createPlayer, type Alignment, type Player } from "./player";
import { speakable } from "./speakable";
import { requestToken } from "./token";
import { asVoiceError, countWords, emitter, finishedRun, VoiceError, type Band, type OutState, type OutTiming, type SpeakSource, type SpeechOut, type SpeechRun } from "./types";

// ElevenLabs streaming text-to-speech, straight from the browser with a single-use token from
// /api/voice/tts-token (the key stays on our server). Sentences go out as soon as they are complete;
// PCM and character timings come back and play through ./player on the app's one AudioContext.
//
// Two transports (live tutor spec §2.2):
//  - "stream-input" (ships today): eleven_flash_v2_5 on /v1/text-to-speech/{voice}/stream-input, one
//    socket per reply, auto_mode, no flush per sentence, {text:""} at the end.
//  - "dialogue": eleven_v4_turbo on the Text to Dialogue socket. Used only when the server says so,
//    after P0 shows the single-use token opens it, first audio ≤ 350 ms and it wins the blind listen.
//    Its message shapes follow the spec and are unverified until the P0 fixtures exist.
//
// Never a second voice in one reply: if the socket fails or stalls, one retry from the first sentence
// not yet heard, same voice, fresh token. A second failure stops speaking and leaves the words on
// screen (onError "speak"); the next reply may use another voice, never this one.

export const TTS_SAMPLE_RATE = 24000;
const WS_TTS = "wss://api.elevenlabs.io/v1/text-to-speech";
const WS_DIALOGUE = "wss://api.elevenlabs.io/v1/text-to-dialogue/stream-input";
const TOKEN_TTL_MS = 12 * 60_000; // tokens live 15 minutes; refresh before that
const CONNECT_TIMEOUT_MS = 5000;
/** No first audio this long after the first sentence went out: retry. */
export const FIRST_AUDIO_DEADLINE_MS = 2000;
/** The reply's text stopped coming (and everything sent has played): the run ends after this long. */
export const FEED_IDLE_MS = 8000;
/**
 * The vendor went quiet mid-reply: text was sent that has no audio yet, the player has played
 * everything it got, and nothing has arrived for this long. Retry from the first unheard sentence.
 */
export const DRY_MS = 1800;
const TICK_MS = 25;

export type TtsToken = {
  token: string;
  voiceId: string;
  modelId: string;
  /** Set only for models that accept language enforcement. */
  languageCode: string | null;
  outputFormat: string;
  zeroRetention: boolean;
  /** "dialogue" only when the server has been switched to the v4 Turbo socket. */
  transport?: "stream-input" | "dialogue";
};

type ServerMessage = { audio?: string | null; alignment?: Alignment | null; isFinal?: boolean | null; error?: string; message?: string };

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
  const q = new URLSearchParams({ model_id: t.modelId, output_format: t.outputFormat, single_use_token: t.token, sync_alignment: "true" });
  if (t.transport === "dialogue") {
    if (t.languageCode) q.set("language_code", t.languageCode);
    if (t.zeroRetention) q.set("enable_logging", "false");
    return `${WS_DIALOGUE}?${q}`;
  }
  q.set("auto_mode", "true");
  q.set("inactivity_timeout", "60");
  if (t.languageCode) q.set("language_code", t.languageCode);
  if (t.zeroRetention) q.set("enable_logging", "false");
  return `${WS_TTS}/${encodeURIComponent(t.voiceId)}/stream-input?${q}`;
}

/** The first message on a socket: the voice and its settings. */
export function openingMessage(t: TtsToken, band: Band) {
  if (t.transport === "dialogue") return { inputs: [{ text: " ", voice_id: t.voiceId }], voice_settings: { stability: 0.5 } };
  return { text: " ", voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0, use_speaker_boost: true, speed: voiceSpeed(band, t.modelId) } };
}

/** One sentence. On the dialogue socket a short first sentence is flushed so it starts at once. */
export function sentenceMessage(t: TtsToken, text: string, first: boolean) {
  if (t.transport !== "dialogue") return { text: `${text} ` };
  const short = text.length < 40 || countWords(text) < 8;
  return { inputs: [{ text: `${text} `, voice_id: t.voiceId }], ...(first && short ? { flush: true } : {}) };
}

/** The reply is over. */
export const closingMessage = (t: TtsToken) => (t.transport === "dialogue" ? { inputs: [{ text: "", voice_id: t.voiceId, new_turn: true }], flush: true } : { text: "" });

export type ElevenLabsOptions = {
  locale: Locale;
  /** A grown-up allowed voice for this learner. Sent to our route with under13; it refuses an under-13 learner without consent. */
  consent: boolean;
  /** The learner may be under 13. */
  under13: boolean;
  /** Learner names: removed from the text before it leaves the device. */
  names?: string[];
  /** The learner's band: sentence pauses, and the K–2 speed on Flash. */
  band?: Band;
  fetch?: typeof fetch;
  WebSocket?: typeof WebSocket;
  /** The app's AudioContext (./audio sharedAudio by default). */
  audioContext?: () => AudioContext;
  tokenUrl?: string;
  /** performance.now() */
  now?: () => number;
};

type Sent = { written: string; spoken: string; base: number; words: number[]; question: boolean; clause: boolean; on: WebSocket | null };

type Run = {
  id: number;
  band: Band;
  done: boolean;
  resolve: () => void;
  player: Player | null;
  ctx: AudioContext | null;
  ws: WebSocket | null;
  token: TtsToken | null;
  sent: Sent[];
  nextBase: number;
  streamDone: boolean;
  closeSent: boolean;
  retried: boolean;
  /** The one retry is connecting: a stall or a dry player now is the same failure, not a second one. */
  retrying: boolean;
  /** Nothing plays until the turn is committed (SpeakOptions.after). */
  held: boolean;
  /** The context stopped running (iOS interrupted it): waiting for it to resume or for a tap. */
  suspended: boolean;
  /** This socket has sent audio. */
  socketAudio: boolean;
  connecting: Promise<boolean> | null;
  firstSentAt: number | null;
  firstChunkAt: number | null;
  firstAudibleAt: number | null;
  lastTextAt: number;
  ticker: ReturnType<typeof setInterval> | null;
  carry: number | null;
  started: boolean;
  unsubAbort: (() => void) | null;
};

export function elevenLabsSpeechOut(o: ElevenLabsOptions): SpeechOut {
  const f = o.fetch ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
  const WS = o.WebSocket ?? WebSocket;
  const now = o.now ?? (() => performance.now());
  const ctxOf = o.audioContext ?? (() => sharedAudio());
  const ev = {
    boundary: emitter<[number, number]>(),
    scheduled: emitter<[number, number, number]>(),
    start: emitter<[number]>(),
    end: emitter<[{ cancelled: boolean }, number]>(),
    error: emitter<[VoiceError, number]>(),
    locked: emitter<[boolean]>(),
    timing: emitter<[OutTiming]>(),
  };
  let state: OutState = "idle";
  let run: Run | null = null;
  let last: Run | null = null;
  let ids = 0;
  let spare: { at: number; token: Promise<TtsToken> } | null = null;
  let disposed = false;
  let locked = false;
  let unlockWaiters: (() => void)[] = [];

  const setLocked = (v: boolean) => {
    if (locked === v) return;
    locked = v;
    ev.locked.emit(v);
  };

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
  const takeToken = (fresh: boolean) => {
    const s = spare;
    spare = null;
    return !fresh && s && now() - s.at < TOKEN_TTL_MS ? s.token : fetchToken();
  };

  function timing(r: Run) {
    ev.timing.emit({ run: r.id, vendor: "elevenlabs", firstSentenceAt: r.firstSentAt, firstChunkAt: r.firstChunkAt, firstAudibleAt: r.firstAudibleAt, underruns: r.player?.underruns ?? 0, retried: r.retried });
  }

  function finish(r: Run, cancelled: boolean, fadeMs = 120) {
    if (r.done) return;
    r.done = true;
    if (r.ticker) clearInterval(r.ticker);
    r.ticker = null;
    r.unsubAbort?.();
    // Cancelled: fade out. Finished: everything has played; let go of the run's gain node.
    r.player?.cancel(cancelled ? fadeMs : 0);
    closeSocket(r);
    if (run === r) {
      run = null;
      state = "idle";
    }
    timing(r);
    ev.end.emit({ cancelled }, r.id);
    r.resolve();
  }

  function closeSocket(r: Run) {
    const ws = r.ws;
    r.ws = null;
    if (!ws) return;
    try {
      if (r.token?.transport === "dialogue" && ws.readyState === 1) ws.send(JSON.stringify({ close_socket: true }));
      ws.close(1000);
    } catch {}
  }

  function newPlayer(r: Run, ctx: AudioContext) {
    r.ctx = ctx;
    r.player = createPlayer({
      ctx,
      sampleRate: TTS_SAMPLE_RATE,
      band: r.band,
      now,
      onWordScheduled: (w, at) => ev.scheduled.emit(w, at, r.id),
      onBoundary: (w) => ev.boundary.emit(w, r.id),
      onStart: (at) => {
        r.firstAudibleAt ??= at;
        if (r.started) return;
        r.started = true;
        if (state === "waiting") state = "speaking";
        ev.start.emit(r.id);
        timing(r);
      },
      // The clock froze while the context says it runs: one retry, and a second freeze is the end.
      onStall: () => {
        if (!r.retrying) fail(r, new VoiceError("speak", "stalled"));
      },
      // Suspended or interrupted (a call, another app): a new socket can't fix that. Wait for it to
      // resume, or for a tap ("Tap to hear"); the audio already here plays on from where it stopped.
      onSuspended: () => {
        if (!r.suspended) void ctx.resume().catch(() => {});
        r.suspended = true;
        setLocked(true);
      },
    });
    if (r.held) r.player.hold();
  }

  function tick(r: Run) {
    if (r.done || !r.player) return;
    r.player.tick();
    if (r.done) return;
    const t = now();
    if (r.suspended && (r.ctx?.state as string) === "running") {
      r.suspended = false;
      setLocked(false);
      r.player.resetStall();
    }
    if (state === "paused" || r.retrying || r.suspended) return;
    if (!r.socketAudio && r.firstSentAt != null && t - r.firstSentAt > FIRST_AUDIO_DEADLINE_MS) return fail(r, new VoiceError("speak", "no first audio"));
    if (r.player.drained()) return finish(r, false);
    if (r.player.started && r.ws && r.player.starvedMs() >= DRY_MS) {
      // The vendor went quiet mid-reply. On stream-input (auto_mode) every sentence sent is owed
      // audio at once; the dialogue socket may hold unflushed text until the close.
      const owing = r.token?.transport === "dialogue" ? r.closeSent : true;
      if (owing && r.player.owed()) return fail(r, new VoiceError("speak", "audio stopped coming"));
      // Everything sent has its audio but the end mark never came: don't wait for it forever.
      if (r.closeSent && !r.player.ended) r.player.end();
    }
    // The caller never ended the feed: once everything sent has played, stop after a while.
    if (!r.streamDone && r.player.started && r.player.heardUpTo() >= r.nextBase - 1 && t - r.lastTextAt > FEED_IDLE_MS) {
      r.streamDone = true;
      sendClose(r);
      r.player.end();
    }
  }

  function sendClose(r: Run) {
    if (!r.ws || r.closeSent || r.ws.readyState !== 1 || !r.token) return;
    r.closeSent = true;
    r.ws.send(JSON.stringify(closingMessage(r.token)));
  }

  function sendSentence(r: Run, s: Sent, first: boolean) {
    if (!r.ws || r.ws.readyState !== 1 || !r.token || !r.player || s.on === r.ws) return;
    s.on = r.ws;
    r.player.addSentence(s.spoken, s.words, s.question, s.clause);
    assertSpoken(s.spoken, "ElevenLabs");
    r.ws.send(JSON.stringify(sentenceMessage(r.token, s.spoken, first)));
    r.firstSentAt ??= now();
  }

  /** The socket failed or stalled: one retry from the first sentence not fully heard, then give up. */
  function fail(r: Run, e: unknown) {
    if (r.done) return;
    closeSocket(r);
    if (r.retried || !r.player) {
      const err = asVoiceError(e, "speak");
      ev.error.emit(new VoiceError("speak", `${err.code}: ${err.message}`), r.id);
      return finish(r, true);
    }
    r.retried = true;
    r.retrying = true;
    const k = r.player.firstIncomplete();
    r.player.truncateFrom(k);
    r.player.resetStall();
    r.closeSent = false;
    r.firstSentAt = null; // the deadline runs again for the retry
    r.connecting = connect(r, true).then(
      (ok) => {
        r.retrying = false;
        if (!ok || r.done) return false;
        r.player?.resetStall(); // the stall and dry clocks start again with the new socket
        r.sent.slice(k).forEach((s, i) => sendSentence(r, s, i === 0 && k === 0));
        if (r.streamDone) sendClose(r);
        return true;
      },
      (err) => {
        r.retrying = false;
        fail(r, err);
        return false;
      },
    );
  }

  function onMessage(r: Run, ws: WebSocket, data: unknown) {
    if (r.done || r.ws !== ws || !r.player) return;
    let m: ServerMessage;
    try {
      m = JSON.parse(String(data)) as ServerMessage;
    } catch {
      return;
    }
    if (m.error) return fail(r, new VoiceError("unavailable", m.error));
    if (m.audio) {
      r.firstChunkAt ??= now();
      r.socketAudio = true;
      const { samples, carry } = pcm16ToFloat32(m.audio, r.carry);
      r.carry = carry;
      r.player.push(samples, m.alignment ?? null);
    }
    if (m.isFinal && r.closeSent) r.player.end();
  }

  /** Audio must be unlocked before anything plays: wait for the tap (warm) rather than speak in another voice. */
  async function unlocked(r: Run, ctx: AudioContext): Promise<boolean> {
    if (await resumeWithin(ctx, 300)) return true;
    setLocked(true);
    await new Promise<void>((ok) => unlockWaiters.push(ok));
    return !r.done;
  }

  async function connect(r: Run, fresh: boolean): Promise<boolean> {
    const ctx = ctxOf();
    playbackSession(); // the mic may be closed: don't let the silent switch mute the reply
    if (!(await unlocked(r, ctx))) return false;
    if (!r.player) newPlayer(r, ctx);
    const t = await takeToken(fresh);
    if (r.done) return false;
    prefetch(); // the next reply starts faster
    r.token = t;
    const ws = new WS(ttsSocketUrl(t));
    r.ws = ws;
    r.socketAudio = false;
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
    if (r.done || r.ws !== ws) return false;
    ws.onmessage = (e) => onMessage(r, ws, e.data);
    ws.onerror = null;
    ws.onclose = (e) => {
      if (r.done || r.ws !== ws) return;
      // After our close message the server sends what's left, then closes: all audio is in.
      if (r.closeSent && (e.code === 1000 || r.player?.firstIncomplete() === r.sent.length)) r.player?.end();
      else fail(r, new VoiceError("network"));
    };
    ws.send(JSON.stringify(openingMessage(t, r.band)));
    return true;
  }

  async function drive(r: Run, source: SpeakSource) {
    r.connecting = connect(r, false).then(
      (ok) => ok,
      (e) => (fail(r, e), false),
    );
    let first = true;
    try {
      for await (const sentence of sentencesFrom(source)) {
        if (r.done) return;
        const sp = speakable(sentence, o.locale, o.names);
        const s: Sent = { written: sentence, spoken: sp.text, base: r.nextBase, words: sp.words.map((w) => r.nextBase + w), question: /[?¿]/.test(sentence), clause: isClauseCut(sentence), on: null };
        r.nextBase += countWords(sentence);
        r.lastTextAt = now();
        if (!sp.text) continue;
        r.sent.push(s);
        // The socket opens while the first sentence is being written; wait for it only now.
        if (await r.connecting) sendSentence(r, s, first);
        first = false;
      }
    } catch {
      // The caller's stream broke off: finish with what we have.
    }
    if (r.done) return;
    r.streamDone = true;
    if (!r.sent.length) return finish(r, false); // nothing to say; don't wait for the socket
    if (!(await r.connecting) || r.done) return;
    sendClose(r);
  }

  const out: SpeechOut = {
    kind: "elevenlabs",
    tier: "A",
    get state() {
      return state;
    },
    get locked() {
      return locked;
    },
    speak(source, opts = {}): SpeechRun {
      out.cancel();
      const id = ++ids;
      if (disposed || opts.signal?.aborted) return finishedRun(id);
      state = "waiting";
      let resolve!: () => void;
      const done = new Promise<void>((ok) => (resolve = ok));
      const r: Run = {
        id, band: opts.band ?? o.band ?? "69", done: false, resolve, player: null, ctx: null, ws: null, token: null, sent: [], nextBase: 0, streamDone: false,
        closeSent: false, retried: false, retrying: false, held: !!opts.after, suspended: false, socketAudio: false, connecting: null, firstSentAt: null,
        firstChunkAt: null, firstAudibleAt: null, lastTextAt: now(), ticker: null, carry: null, started: false, unsubAbort: null,
      };
      run = last = r;
      r.ticker = setInterval(() => tick(r), TICK_MS);
      if (opts.signal) {
        const onAbort = () => finish(r, true);
        opts.signal.addEventListener("abort", onAbort, { once: true });
        r.unsubAbort = () => opts.signal?.removeEventListener("abort", onAbort);
      }
      // A speculative reply: its socket opens and its audio comes in now, and it plays on commit.
      opts.after?.then(
        () => {
          r.held = false;
          r.player?.release();
        },
        () => finish(r, true, 0),
      );
      void drive(r, source);
      return Object.assign(done, { id });
    },
    pause() {
      if (!run || state === "paused") return;
      run.player?.pause();
      state = "paused";
    },
    resume() {
      if (!run || state !== "paused") return;
      run.player?.resume();
      state = run.started ? "speaking" : "waiting";
    },
    cancel(opts) {
      const r = run;
      if (r) finish(r, true, opts?.fadeMs ?? 120);
    },
    warm() {
      if (disposed) return;
      // Runs inside a tap that also sends a message or starts reading: it must never throw.
      try {
        unlockAudio(ctxOf());
      } catch {}
      const waiters = unlockWaiters;
      unlockWaiters = [];
      setLocked(false);
      waiters.forEach((w) => w());
      if (!spare) prefetch();
    },
    dispose() {
      out.cancel();
      disposed = true;
      spare = null;
      unlockWaiters.forEach((w) => w());
      unlockWaiters = [];
    },
    heardUpTo: () => last?.player?.heardUpTo() ?? -1,
    duck: (gain, ms) => run?.player?.duck(gain, ms),
    unduck: (ms) => run?.player?.unduck(ms),
    onBoundary: ev.boundary.on,
    onWordScheduled: ev.scheduled.on,
    onStart: ev.start.on,
    onEnd: ev.end.on,
    onError: ev.error.on,
    onLocked: ev.locked.on,
    onTiming: ev.timing.on,
  };
  return out;
}
