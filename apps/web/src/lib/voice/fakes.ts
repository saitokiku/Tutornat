// Test doubles for the voice adapters: a WebSocket the test plays the server for, an AudioContext
// whose clock the test moves, and scripted SpeechOut / SpeechIn. Imported by tests only.
import { sentencesFrom } from "./chunk";
import { emitter, type OutState, type SpeakSource, type SpeechIn, type SpeechOut, type VoiceError } from "./types";

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

export class FakeAudio {
  currentTime = 0;
  state: "running" | "suspended" | "closed" = "running";
  destination = {};
  sources: { at: number; duration: number; stopped: boolean }[] = [];
  createBuffer(_ch: number, length: number, sampleRate: number) {
    const data = new Float32Array(length);
    return { length, sampleRate, duration: length / sampleRate, getChannelData: () => data };
  }
  createBufferSource() {
    const rec = { at: 0, duration: 0, stopped: false };
    const node = {
      buffer: null as { duration: number } | null,
      onended: null as (() => void) | null,
      connect: () => {},
      start: (at = 0) => {
        rec.at = at;
        rec.duration = node.buffer?.duration ?? 0;
        this.sources.push(rec);
      },
      stop: () => {
        rec.stopped = true;
      },
    };
    return node;
  }
  async suspend() {
    this.state = "suspended";
  }
  async resume() {
    this.state = "running";
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
export function fakeOut({ auto = true, kind = "browser" as SpeechOut["kind"] } = {}) {
  const ev = { boundary: emitter<[number]>(), start: emitter<[]>(), end: emitter<[{ cancelled: boolean }]>(), error: emitter<[VoiceError]>() };
  let state: OutState = "idle";
  let resolve: (() => void) | null = null;
  const said: string[][] = [];
  const end = (cancelled: boolean) => {
    if (state === "idle") return;
    state = "idle";
    ev.end.emit({ cancelled });
    resolve?.();
    resolve = null;
  };
  const out = {
    kind,
    get state() {
      return state;
    },
    set state(s: OutState) {
      state = s;
    },
    said,
    cancel: () => end(true),
    pause: () => {
      state = "paused";
    },
    resume: () => {
      state = "speaking";
    },
    warm: () => {},
    speak(source: SpeakSource) {
      out.cancel();
      state = "waiting";
      const mine: string[] = [];
      said.push(mine);
      return new Promise<void>((r) => {
        resolve = r;
        void (async () => {
          for await (const s of sentencesFrom(source)) {
            mine.push(s);
            if (state === "waiting") {
              state = "speaking";
              ev.start.emit();
              ev.boundary.emit(0);
            }
          }
          if (auto) end(false);
        })();
      });
    },
    finish: () => end(false),
    boundary: (i: number) => ev.boundary.emit(i),
    onBoundary: ev.boundary.on,
    onStart: ev.start.on,
    onEnd: ev.end.on,
    onError: ev.error.on,
  };
  return out satisfies SpeechOut;
}

/** A SpeechIn the test speaks into. */
export function fakeIn() {
  const ev = { partial: emitter<[string]>(), final: emitter<[string]>(), turn: emitter<[string]>(), speech: emitter<[]>(), error: emitter<[VoiceError]>() };
  return {
    kind: "browser" as const,
    listening: true,
    start: async () => {},
    stop: () => {},
    abort: () => {},
    level: () => 0,
    onPartial: ev.partial.on,
    onFinal: ev.final.on,
    onEndOfTurn: ev.turn.on,
    onSpeechStart: ev.speech.on,
    onError: ev.error.on,
    // The test speaks:
    speechStart: () => ev.speech.emit(),
    partial: (t: string) => ev.partial.emit(t),
    endOfTurn: (t: string) => ev.turn.emit(t),
  } satisfies SpeechIn & Record<string, unknown>;
}
