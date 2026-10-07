import type { Key } from "@/i18n/en";
import { asVoiceError, VoiceError, type SpeechIn, type VoiceErrorCode } from "./types";

// The microphone, for the vendor recognizer and the self-test: echo cancellation on (so the tutor's
// voice from the speakers isn't heard as the learner), 16 kHz 16-bit mono frames out, and a level.

/** Mono 16-bit PCM frames at 16 kHz, about 43 ms each. */
export const MIC_RATE = 16000;

export type Capture = {
  /** Current input level 0..1. */
  level(): number;
  stop(): void;
};

export type CaptureOptions = {
  /** Each frame: the audio, the smoothed level for a meter, and this frame's own level (for judging). */
  onFrame: (pcm: Int16Array, level: number, frameLevel: number) => void;
  targetRate?: number;
  mediaDevices?: Pick<MediaDevices, "getUserMedia">;
  AudioContext?: typeof AudioContext;
};

export type MicCapture = (o: CaptureOptions) => Promise<Capture>;

// Collects 128-sample render quanta into ~2048-sample frames before posting them to the page.
const TAP = `class KaizenMicTap extends AudioWorkletProcessor{constructor(){super();this.b=new Float32Array(2048);this.n=0}process(i){const c=i[0]&&i[0][0];if(c){for(let k=0;k<c.length;k++){this.b[this.n++]=c[k];if(this.n===this.b.length){this.port.postMessage(this.b.slice(0));this.n=0}}}return true}}registerProcessor("kaizen-mic-tap",KaizenMicTap);`;

export const micSupported = () =>
  typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof AudioContext !== "undefined" && typeof AudioWorkletNode !== "undefined";

/** What a getUserMedia failure means for the learner. */
export function micError(e: unknown): VoiceError {
  if (e instanceof VoiceError) return e;
  const name = (e as { name?: string } | null)?.name ?? "";
  const code: VoiceErrorCode =
    name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError"
      ? "denied"
      : name === "NotFoundError" || name === "DevicesNotFoundError" || name === "OverconstrainedError"
        ? "no-device"
        : name === "NotReadableError" || name === "TrackStartError" || name === "AbortError"
          ? "busy"
          : name === "TypeError"
            ? "unsupported"
            : "unavailable";
  return new VoiceError(code, name || undefined);
}

/** Root mean square of a frame (0..1 for full-scale audio). */
export function rms(f: Float32Array): number {
  if (!f.length) return 0;
  let sum = 0;
  for (let i = 0; i < f.length; i++) sum += f[i] * f[i];
  return Math.sqrt(sum / f.length);
}

/** Loudness on a 0..1 scale: −60 dBFS (room hush) → 0, 0 dBFS → 1. */
export const levelOf = (r: number) => (r <= 0 ? 0 : Math.min(1, Math.max(0, (20 * Math.log10(r) + 60) / 60)));

/** Rises at once, falls gently, so a meter doesn't flicker. */
export const smoothLevel = (prev: number, next: number) => (next >= prev ? next : prev * 0.8 + next * 0.2);

/** Float samples −1..1 → 16-bit integers. */
export function toInt16(f: Float32Array): Int16Array {
  const out = new Int16Array(f.length);
  for (let i = 0; i < f.length; i++) {
    const v = Math.max(-1, Math.min(1, f[i]));
    out[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
  }
  return out;
}

/** Downsampler that keeps its place across frames (averages each output sample's span of input). */
export function createResampler(from: number, to: number) {
  const ratio = from / to;
  let pos = 0; // position of the next output sample, in input samples, relative to the current frame
  let carry = new Float32Array(0);
  return (frame: Float32Array): Float32Array => {
    if (ratio <= 1) return frame;
    const input = new Float32Array(carry.length + frame.length);
    input.set(carry);
    input.set(frame, carry.length);
    const out: number[] = [];
    while (pos + ratio <= input.length) {
      const a = Math.floor(pos);
      const b = Math.max(a + 1, Math.floor(pos + ratio));
      let sum = 0;
      for (let i = a; i < b; i++) sum += input[i];
      out.push(sum / (b - a));
      pos += ratio;
    }
    const keep = Math.floor(pos);
    carry = input.slice(keep);
    pos -= keep;
    return Float32Array.from(out);
  };
}

/** Opens the microphone and streams frames until stop(). Rejects with a VoiceError. */
export const micCapture: MicCapture = async ({ onFrame, targetRate = MIC_RATE, mediaDevices, AudioContext: Ctx }) => {
  const md = mediaDevices ?? (typeof navigator !== "undefined" ? navigator.mediaDevices : undefined);
  const AC = Ctx ?? (typeof AudioContext !== "undefined" ? AudioContext : undefined);
  if (!md?.getUserMedia || !AC || typeof AudioWorkletNode === "undefined") throw new VoiceError("unsupported");
  let stream: MediaStream;
  try {
    stream = await md.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
  } catch (e) {
    throw micError(e);
  }
  const ctx = new AC();
  const release = () => {
    stream.getTracks().forEach((t) => t.stop());
    void ctx.close().catch(() => {});
  };
  try {
    if (ctx.state === "suspended") await ctx.resume().catch(() => {});
    const url = URL.createObjectURL(new Blob([TAP], { type: "application/javascript" }));
    try {
      await ctx.audioWorklet.addModule(url);
    } finally {
      URL.revokeObjectURL(url);
    }
    const source = ctx.createMediaStreamSource(stream);
    const node = new AudioWorkletNode(ctx, "kaizen-mic-tap");
    const resample = createResampler(ctx.sampleRate, targetRate);
    let level = 0;
    let stopped = false;
    node.port.onmessage = (e: MessageEvent<Float32Array>) => {
      if (stopped) return;
      const frameLevel = levelOf(rms(e.data));
      level = smoothLevel(level, frameLevel);
      onFrame(toInt16(resample(e.data)), level, frameLevel);
    };
    source.connect(node);
    node.connect(ctx.destination); // the tap writes silence; connecting keeps it running everywhere
    return {
      level: () => (stopped ? 0 : level),
      stop() {
        if (stopped) return;
        stopped = true;
        node.port.onmessage = null;
        source.disconnect();
        node.disconnect();
        release();
      },
    };
  } catch (e) {
    release();
    throw e instanceof VoiceError ? e : new VoiceError("unsupported", (e as Error)?.message);
  }
};

// Self-test, in two parts a settings screen can run one after the other:
//  - micSelfTest: "say a few words" for three seconds; does the microphone pick up sound, and how loud?
//    It measures loudness only, so its best answer is "picking up sound", never "we heard you".
//  - listenSelfTest: the same few words through the recognizer the learner will use; shows the words
//    it heard, so a family can see that listening works (and in which language).

export type SelfTestStatus = "ok" | "quiet" | "silent" | VoiceErrorCode;
export type SelfTest = { status: SelfTestStatus; peak: number; speechMs: number };

/** Level at which a frame is clearly a voice (about −30 dBFS), and the faintest we'd call "something". */
export const SPEECH_LEVEL = 0.5;
export const QUIET_LEVEL = 0.25;

/** Judges each frame's own level (not the meter's smoothed one) over the test. Pure. */
export function judgeLevels(levels: number[], frameMs: number): SelfTest {
  const peak = levels.reduce((m, l) => Math.max(m, l), 0);
  const speechMs = Math.round(levels.filter((l) => l >= SPEECH_LEVEL).length * frameMs);
  return { status: speechMs >= 250 ? "ok" : peak >= QUIET_LEVEL ? "quiet" : "silent", peak, speechMs };
}

const waitFor = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    if (signal?.aborted) return resolve();
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => (clearTimeout(t), resolve()), { once: true });
  });

export async function micSelfTest({
  durationMs = 3000,
  capture = micCapture,
  onLevel,
  signal,
}: { durationMs?: number; capture?: MicCapture; onLevel?: (level: number) => void; signal?: AbortSignal } = {}): Promise<SelfTest> {
  const levels: number[] = [];
  let frameMs = 0;
  let cap: Capture;
  try {
    cap = await capture({
      targetRate: MIC_RATE,
      onFrame: (pcm, level, frameLevel) => {
        frameMs = (pcm.length / MIC_RATE) * 1000;
        levels.push(frameLevel);
        onLevel?.(level);
      },
    });
  } catch (e) {
    return { status: micError(e).code, peak: 0, speechMs: 0 };
  }
  await waitFor(durationMs, signal);
  cap.stop();
  return judgeLevels(levels, frameMs || 43);
}

export type ListenTest = { status: "words"; text: string } | { status: "nothing" } | { status: VoiceErrorCode };

/**
 * Listens for `durationMs` with push-to-talk and returns the words heard. Use an input no conversation
 * is subscribed to (a voice() built for the settings screen), or the words would go to the tutor.
 */
export async function listenSelfTest(input: SpeechIn, { durationMs = 5000, signal }: { durationMs?: number; signal?: AbortSignal } = {}): Promise<ListenTest> {
  let text = "";
  const subs = [input.onPartial((t) => (text = t)), input.onEndOfTurn((t) => (text = t))];
  const done = () => subs.forEach((u) => u());
  try {
    await input.start({ turns: "manual" });
  } catch (e) {
    done();
    return { status: asVoiceError(e).code };
  }
  await waitFor(durationMs, signal);
  // stop() hands over the last words as the turn; give the recognizer a moment to send them.
  const last = new Promise<void>((resolve) => {
    const u = input.onEndOfTurn(() => (u(), resolve()));
    setTimeout(() => (u(), resolve()), 2000);
  });
  input.stop();
  await last;
  done();
  const heard = text.trim();
  return heard ? { status: "words", text: heard } : { status: "nothing" };
}

/** The sentence to show for a microphone self-test result. */
export function selfTestKey(status: SelfTestStatus): Key {
  if (status === "ok") return "voice.selfTest.ok";
  if (status === "quiet") return "voice.selfTest.quiet";
  if (status === "silent") return "voice.selfTest.silent";
  return voiceErrorKey(status);
}

/** The sentence to show for a listening self-test result; "voice.selfTest.words" takes {text}. */
export function listenTestKey(r: ListenTest): Key {
  if (r.status === "words") return "voice.selfTest.words";
  if (r.status === "nothing") return "voice.selfTest.noWords";
  return voiceErrorKey(r.status);
}

/** The sentence to show when the microphone turned itself off. */
export const micOffKey = (why: "idle" | "hidden"): Key => (why === "idle" ? "voice.micOff.idle" : "voice.micOff.hidden");

/** The sentence to show for a voice error. Every one ends with what still works. */
export function voiceErrorKey(code: VoiceErrorCode): Key {
  const keys: Record<VoiceErrorCode, Key> = {
    unsupported: "voice.error.unsupported",
    denied: "voice.error.denied",
    "no-device": "voice.error.noDevice",
    busy: "voice.error.busy",
    network: "voice.error.network",
    consent: "voice.error.consent",
    unavailable: "voice.error.unavailable",
    speak: "voice.error.speak",
  };
  return keys[code];
}

/** Meter level 0..1 as a whole number out of 10, for the meter's text equivalent ("voice.level"). */
export const levelOutOfTen = (level: number) => Math.round(Math.max(0, Math.min(1, level)) * 10);
