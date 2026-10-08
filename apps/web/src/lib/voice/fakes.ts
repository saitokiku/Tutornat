// Test doubles for the voice adapters: a WebSocket the test plays the server for, an AudioContext
// whose clock the test moves, and scripted SpeechOut / SpeechIn. Imported by tests only.
import { sentencesFrom } from "./chunk";
import { emitter, type HeardWord, type ListenOptions, type OutState, type OutTiming, type SpeakSource, type SpeechIn, type SpeechOut, type SpeechRun, type TurnMeta, type VoiceError } from "./types";

type Handler = ((e: { code?: number; data?: unknown }) => void) | null;

export class FakeSocket {
  static all: FakeSocket[] = [];
  static last = () => FakeSocket.all[FakeSocket.all.length - 1];
  static reset() {
    FakeSocket.all = [];
  }
  readyState = 0;
  binaryType = "blob";
  sent: unknown[] = [];
  onopen: Handler = null;
  onmessage: Handler = null;
  onclose: Handler = null;
  onerror: Handler = null;
  closedWith: number | null = null;
  constructor(
    public url: string,
    public protocols?: string | string[],
  ) {
    FakeSocket.all.push(this);
  }
  send(d: unknown) {
    if (this.readyState === 0) throw new Error("InvalidStateError: still connecting");
    if (this.readyState === 1) this.sent.push(d);
  }
  close(code = 1000) {
    if (this.readyState >= 2) return;
    this.readyState = 3;
    this.closedWith = code;
    queueMicrotask(() => this.onclose?.({ code }));
  }
  // The test plays the server:
  open() {
    this.readyState = 1;
    this.onopen?.({});
  }
  receive(msg: unknown) {
    this.onmessage?.({ data: JSON.stringify(msg) });
  }
  drop(code = 1006) {
    this.readyState = 3;
    this.onclose?.({ code });
  }
  /** JSON messages the client sent. */
  json(): Record<string, unknown>[] {
    return this.sent.filter((s): s is string => typeof s === "string").map((s) => JSON.parse(s));
  }
  binary(): ArrayBuffer[] {
    return this.sent.filter((s): s is ArrayBuffer => s instanceof ArrayBuffer);
  }
}

export const asWebSocket = (C: typeof FakeSocket) => C as unknown as typeof WebSocket;

/** An AudioParam that records what was asked of it; `value` follows the last ramp's target. */
export class FakeParam {
  value: number;
  events: { type: "set" | "ramp" | "cancel"; value?: number; at: number }[] = [];
  constructor(v = 1) {
    this.value = v;
  }
  setValueAtTime(v: number, at: number) {
    this.events.push({ type: "set", value: v, at });
    this.value = v;
  }
  linearRampToValueAtTime(v: number, at: number) {
    this.events.push({ type: "ramp", value: v, at });
    this.value = v;
  }
  cancelScheduledValues(at: number) {
    this.events.push({ type: "cancel", at });
  }
  /** The last ramp: its target and when it ends. */
  lastRamp() {
    return [...this.events].reverse().find((e) => e.type === "ramp");
  }
}

export type FakeSource = { at: number; duration: number; length: number; stopped: boolean; stoppedAt: number | null };

export class FakeAudio {
  currentTime = 0;
  state: "running" | "suspended" | "closed" | "interrupted" = "running";
  sampleRate = 48000;
  outputLatency = 0;
  baseLatency = 0;
  destination = {};
  sources: FakeSource[] = [];
  gains: { gain: FakeParam; connected: boolean }[] = [];
  createBuffer(_ch: number, length: number, sampleRate: number) {
    const data = new Float32Array(length);
    return { length, sampleRate, duration: length / sampleRate, getChannelData: () => data };
  }
  createGain() {
    const rec = { gain: new FakeParam(1), connected: true };
    this.gains.push(rec);
    return { gain: rec.gain, connect: () => {}, disconnect: () => void (rec.connected = false) };
  }
  createBufferSource() {
    const rec: FakeSource = { at: 0, duration: 0, length: 0, stopped: false, stoppedAt: null };
    const node = {
      buffer: null as { duration: number; length: number } | null,
      onended: null as (() => void) | null,
      connect: () => {},
      start: (at = 0) => {
        rec.at = at;
        rec.duration = node.buffer?.duration ?? 0;
        rec.length = node.buffer?.length ?? 0;
        this.sources.push(rec);
      },
      stop: (at?: number) => {
        rec.stopped = true;
        rec.stoppedAt = at ?? this.currentTime;
      },
    };
    return node;
  }
  /** Moves the clock on by `ms` (a context that isn't running stands still). */
  advance(ms: number) {
    if (this.state === "running") this.currentTime += ms / 1000;
  }
  /** When the last scheduled, unstopped sample ends. */
  end() {
    return this.sources.filter((s) => !s.stopped).reduce((m, s) => Math.max(m, s.at + s.duration), 0);
  }
  async suspend() {
    this.state = "suspended";
  }
  async resume() {
    if (this.state !== "closed") this.state = "running";
  }
  async close() {
    this.state = "closed";
  }
}

export const asAudio = (a: FakeAudio) => () => a as unknown as AudioContext;

/** 16-bit PCM silence of `ms` at 24 kHz, base64. */
export function pcmBase64(ms: number, rate = 24000): string {
  const bytes = new Uint8Array(Math.round((ms / 1000) * rate) * 2);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

/** ElevenLabs-style alignment for a text, one character every `msPerChar`. */
export function alignmentFor(text: string, msPerChar = 50) {
  const chars = [...text];
  return { chars, charStartTimesMs: chars.map((_, i) => i * msPerChar), charDurationsMs: chars.map(() => msPerChar) };
}

/** A SpeechOut that records what it was asked to say; start/end are driven by the test (or auto). */
export function fakeOut({ auto = true, kind = "browser" as SpeechOut["kind"], tier = "A" as SpeechOut["tier"] } = {}) {
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
  let resolve: (() => void) | null = null;
  let run = 0;
  const said: string[][] = [];
  const end = (cancelled: boolean) => {
    if (state === "idle") return;
    state = "idle";
    ev.end.emit({ cancelled }, run);
    resolve?.();
    resolve = null;
  };
  const out = {
    kind,
    tier,
    locked: false,
    get state() {
      return state;
    },
    set state(s: OutState) {
      state = s;
    },
    said,
    /** What duck/unduck/cancel were asked, in order. */
    gains: [] as { gain: number; ms: number }[],
    heard: -1,
    get run() {
      return run;
    },
    cancel: (opts?: { fadeMs?: number }) => {
      if (state !== "idle") out.gains.push({ gain: 0, ms: opts?.fadeMs ?? 120 });
      end(true);
    },
    pause: () => {
      state = "paused";
    },
    resume: () => {
      state = "speaking";
    },
    warm: () => {},
    disposed: false,
    dispose: () => {
      out.cancel();
      out.disposed = true;
    },
    heardUpTo: () => out.heard,
    duck: (gain: number, ms: number) => void out.gains.push({ gain, ms }),
    unduck: (ms: number) => void out.gains.push({ gain: 1, ms }),
    speak(source: SpeakSource): SpeechRun {
      out.cancel();
      state = "waiting";
      out.heard = -1;
      const id = ++run;
      const mine: string[] = [];
      said.push(mine);
      const done = new Promise<void>((r) => {
        resolve = r;
        void (async () => {
          for await (const s of sentencesFrom(source)) {
            if (run !== id) return;
            mine.push(s);
            if (state === "waiting") {
              state = "speaking";
              ev.start.emit(id);
              ev.boundary.emit(0, id);
            }
          }
          if (auto && run === id) end(false);
        })();
      });
      return Object.assign(done, { id });
    },
    finish: () => end(false),
    boundary: (i: number) => ev.boundary.emit(i, run),
    /** The test schedules word `i` to be heard at `at`. */
    schedule: (i: number, at: number) => ev.scheduled.emit(i, at, run),
    fail: (e: VoiceError) => ev.error.emit(e, run),
    lock: (l: boolean) => {
      out.locked = l;
      ev.locked.emit(l);
    },
    timing: (t: Omit<OutTiming, "run" | "vendor">) => ev.timing.emit({ ...t, run, vendor: kind }),
    onBoundary: ev.boundary.on,
    onWordScheduled: ev.scheduled.on,
    onStart: ev.start.on,
    onEnd: ev.end.on,
    onError: ev.error.on,
    onLocked: ev.locked.on,
    onTiming: ev.timing.on,
  };
  return out satisfies SpeechOut;
}

/** A SpeechIn the test speaks into. */
export function fakeIn({ kind = "browser", duplex }: { kind?: SpeechIn["kind"]; duplex?: boolean } = {}) {
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
  const input = {
    kind,
    duplex: duplex ?? kind !== "browser",
    listening: true as boolean,
    lastOptions: null as ListenOptions | null,
    meter: null as number | null,
    start: async (o?: ListenOptions) => {
      input.lastOptions = o ?? null;
      input.listening = true;
    },
    stop: () => {
      input.listening = false;
    },
    abort: () => {
      input.listening = false;
    },
    level: (): number | null => input.meter,
    onPartial: ev.partial.on,
    onFinal: ev.final.on,
    onWords: ev.words.on,
    onEndOfTurn: ev.turn.on,
    onEagerEnd: ev.eager.on,
    onTurnResumed: ev.resumed.on,
    onSpeechStart: ev.speech.on,
    onSlow: ev.slow.on,
    onError: ev.error.on,
    // The test speaks:
    speechStart: () => ev.speech.emit(),
    partial: (t: string) => ev.partial.emit(t),
    words: (w: HeardWord[]) => ev.words.emit(w),
    endOfTurn: (t: string, meta: Partial<TurnMeta> = {}) => ev.turn.emit(t, { confidence: null, words: [], lastWordEnd: null, ...meta }),
    eager: (t: string, meta: Partial<TurnMeta> = {}) => ev.eager.emit(t, { confidence: null, words: [], lastWordEnd: null, ...meta }),
    resumed: () => ev.resumed.emit(),
    slow: (s: boolean) => ev.slow.emit(s),
    error: (e: VoiceError) => ev.error.emit(e),
  } satisfies SpeechIn & Record<string, unknown>;
  return input;
}
