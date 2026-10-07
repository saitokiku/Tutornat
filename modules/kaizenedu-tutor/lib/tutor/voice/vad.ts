/**
 * Voice activity detection for hands-free mode (voice-17).
 *
 * Two engines behind one interface:
 *
 * - `silero`: `@ricky0123/vad-web` running the Silero v5 model on-device. Its
 *   worklet, model, and ONNX runtime are served from our own origin by
 *   `/vad/<asset>`, copied there by `scripts/copy-vad-assets.mjs` (no third-party
 *   loads in a learner's session).
 *   `onSpeechStart` fires on the first 32 ms frame that looks like speech, so
 *   the barge-in can begin at once; `onSpeechRealStart` confirms it after
 *   `minSpeechMs`, and `onMisfire` rolls it back.
 * - `energy`: an RMS detector with an adaptive noise floor, a short attack,
 *   and a hangover, fed by a ScriptProcessorNode on the same stream. It needs
 *   no assets and is the fallback when the Silero engine cannot load.
 *
 * Both hand `onSpeechEnd` a 16 kHz Float32Array of the utterance (with a short
 * pre-speech pad) for `encodeWav16` → the ASR route. Nothing is stored.
 */
import type { MicVAD, RealTimeVADOptions } from '@ricky0123/vad-web';

import { frameRms, resampleTo } from './wav';

export type VadEngine = 'silero' | 'energy';
/** While the tutor speaks the detector asks for more evidence before a barge-in. */
export type VadProfile = 'listening' | 'speaking';

export interface VadCallbacks {
  /** First frame that looks like speech: begin the barge-in now. */
  onSpeechStart(): void;
  /** Speech confirmed (past `minSpeechMs`): commit the barge-in. */
  onSpeechRealStart?(): void;
  /** Utterance finished; `audio` is 16 kHz mono in -1..1. */
  onSpeechEnd(audio: Float32Array): void;
  /** The start was noise; undo a tentative barge-in. */
  onMisfire?(): void;
  /** 0–1 input level, for a meter. */
  onLevel?(level: number): void;
}

export interface CreateVadOptions extends VadCallbacks {
  stream: MediaStream;
  audioContext?: AudioContext;
  /**
   * Silence after speech before the utterance is over. The band's thinking
   * pause (`BANDS[band].thinkingPauseMs`, on the wire as `thinkingPauseMs`):
   * a nine-year-old pauses mid-thought longer than an adult does. Default
   * `VAD_END_OF_SPEECH_LAG_MS`.
   */
  endOfSpeechMs?: number;
  engine?: VadEngine | 'auto';
  /** Base path of the worklet, model, and ONNX runtime; must end with `/`. */
  assetBasePath?: string;
}

export interface Vad {
  readonly engine: VadEngine;
  start(): Promise<void>;
  pause(): Promise<void>;
  destroy(): Promise<void>;
  setProfile(profile: VadProfile): void;
}

export const VAD_ASSET_PATH = '/vad/';
export const VAD_SAMPLE_RATE = 16_000;

/**
 * Silence a detector waits through before it calls an utterance finished.
 * Both engines use the same number so a turn measures the same either way.
 *
 * This is latency the learner feels but the client cannot see: the last word
 * left their mouth this long before `onSpeechEnd` fires, and spec §5.3 measures
 * from the end of speech, not from the end of the wait. `turn-controller.ts`
 * subtracts it so the reported first-audio figure is the one the learner
 * experienced. Lowering it buys the whole difference back, at the cost of
 * cutting off a learner who pauses mid-thought — a pedagogy call, not a
 * latency one, so it is left where voice-17 set it.
 */
export const VAD_END_OF_SPEECH_LAG_MS = 600;

// ---------------------------------------------------------------------------
// Energy detector (pure, testable)
// ---------------------------------------------------------------------------

export interface EnergyDetectorOptions {
  sampleRate: number;
  /** Absolute RMS floor below which nothing counts as speech. Default 0.015. */
  minThreshold?: number;
  /** Speech must exceed the noise floor by this factor. Default 3. */
  noiseRatio?: number;
  /** Frames shorter than this are misfires. Default 200 ms. */
  minSpeechMs?: number;
  /** Silence after speech before the utterance ends. Default `VAD_END_OF_SPEECH_LAG_MS`. */
  hangoverMs?: number;
  /** Audio kept from before the detected start. Default 300 ms. */
  preSpeechPadMs?: number;
  /** Hard cap on one utterance. Default 30 s. */
  maxUtteranceMs?: number;
}

export type EnergyEvent =
  | { type: 'start' }
  | { type: 'real_start' }
  | { type: 'end'; audio: Float32Array }
  | { type: 'misfire' };

export interface EnergyDetector {
  /** Feed one frame at the input sample rate; returns the events it caused. */
  process(frame: Float32Array, nowMs: number): EnergyEvent[];
  setProfile(profile: VadProfile): void;
  reset(): void;
  readonly speaking: boolean;
  readonly level: number;
}

export function createEnergyDetector(options: EnergyDetectorOptions): EnergyDetector {
  const minThreshold = options.minThreshold ?? 0.015;
  const baseNoiseRatio = options.noiseRatio ?? 3;
  const minSpeechMs = options.minSpeechMs ?? 200;
  const hangoverMs = options.hangoverMs ?? VAD_END_OF_SPEECH_LAG_MS;
  const preSpeechPadMs = options.preSpeechPadMs ?? 300;
  const maxUtteranceMs = options.maxUtteranceMs ?? 30_000;
  const padSamples = Math.round((preSpeechPadMs / 1000) * VAD_SAMPLE_RATE);

  let noiseFloor = minThreshold;
  let noiseRatio = baseNoiseRatio;
  let speaking = false;
  let confirmed = false;
  let speechStartedAt = 0;
  let lastLoudAt = 0;
  let level = 0;
  let pad: Float32Array[] = [];
  let padLength = 0;
  let utterance: Float32Array[] = [];
  let utteranceLength = 0;

  const pushPad = (chunk: Float32Array) => {
    pad.push(chunk);
    padLength += chunk.length;
    while (padLength - (pad[0]?.length ?? 0) >= padSamples && pad.length > 1) {
      padLength -= pad.shift()!.length;
    }
  };

  const concat = (parts: Float32Array[], total: number): Float32Array => {
    const out = new Float32Array(total);
    let offset = 0;
    for (const part of parts) {
      out.set(part, offset);
      offset += part.length;
    }
    return out;
  };

  const finish = (): Float32Array => {
    const audio = concat(utterance, utteranceLength);
    utterance = [];
    utteranceLength = 0;
    speaking = false;
    confirmed = false;
    return audio;
  };

  return {
    get speaking() {
      return speaking;
    },
    get level() {
      return level;
    },
    setProfile(profile) {
      noiseRatio = profile === 'speaking' ? baseNoiseRatio * 1.6 : baseNoiseRatio;
    },
    reset() {
      speaking = false;
      confirmed = false;
      pad = [];
      padLength = 0;
      utterance = [];
      utteranceLength = 0;
    },
    process(frame, nowMs) {
      const events: EnergyEvent[] = [];
      const rms = frameRms(frame);
      level = Math.min(1, rms * 6);
      const threshold = Math.max(minThreshold, noiseFloor * noiseRatio);
      const loud = rms >= threshold;
      const resampled = resampleTo(frame, options.sampleRate, VAD_SAMPLE_RATE);

      if (!speaking) {
        // Track the floor only while quiet so speech does not raise it.
        noiseFloor = noiseFloor * 0.95 + rms * 0.05;
        if (loud) {
          speaking = true;
          confirmed = false;
          speechStartedAt = nowMs;
          lastLoudAt = nowMs;
          utterance = [concat(pad, padLength), resampled];
          utteranceLength = padLength + resampled.length;
          events.push({ type: 'start' });
        } else {
          pushPad(resampled);
        }
        return events;
      }

      utterance.push(resampled);
      utteranceLength += resampled.length;
      if (loud) lastLoudAt = nowMs;
      if (!confirmed && nowMs - speechStartedAt >= minSpeechMs) {
        if (lastLoudAt > speechStartedAt || loud) {
          confirmed = true;
          events.push({ type: 'real_start' });
        }
      }
      const silentFor = nowMs - lastLoudAt;
      if (silentFor >= hangoverMs || nowMs - speechStartedAt >= maxUtteranceMs) {
        const wasConfirmed = confirmed || lastLoudAt - speechStartedAt >= minSpeechMs;
        const audio = finish();
        pad = [];
        padLength = 0;
        events.push(wasConfirmed ? { type: 'end', audio } : { type: 'misfire' });
      }
      return events;
    },
  };
}

// ---------------------------------------------------------------------------
// Energy engine over Web Audio
// ---------------------------------------------------------------------------

const ENERGY_BUFFER = 2048;

export function createEnergyVad(options: CreateVadOptions): Vad {
  const context = options.audioContext ?? new AudioContext();
  const ownsContext = !options.audioContext;
  const detector = createEnergyDetector({
    ...(options.endOfSpeechMs ? { hangoverMs: options.endOfSpeechMs } : {}),
    sampleRate: context.sampleRate,
  });
  let source: MediaStreamAudioSourceNode | null = null;
  let processor: ScriptProcessorNode | null = null;
  let sink: GainNode | null = null;
  let running = false;

  const handle = (event: AudioProcessingEvent) => {
    if (!running) return;
    const frame = event.inputBuffer.getChannelData(0);
    const events = detector.process(new Float32Array(frame), context.currentTime * 1000);
    options.onLevel?.(detector.level);
    for (const item of events) {
      if (item.type === 'start') options.onSpeechStart();
      else if (item.type === 'real_start') options.onSpeechRealStart?.();
      else if (item.type === 'end') options.onSpeechEnd(item.audio);
      else options.onMisfire?.();
    }
  };

  return {
    engine: 'energy',
    async start() {
      if (running) return;
      if (context.state !== 'running') await context.resume().catch(() => undefined);
      source ??= context.createMediaStreamSource(options.stream);
      processor ??= context.createScriptProcessor(ENERGY_BUFFER, 1, 1);
      sink ??= context.createGain();
      sink.gain.value = 0; // the processor needs a destination to run; keep it silent
      processor.onaudioprocess = handle;
      source.connect(processor);
      processor.connect(sink);
      sink.connect(context.destination);
      detector.reset();
      running = true;
    },
    async pause() {
      running = false;
      detector.reset();
      try {
        source?.disconnect();
        processor?.disconnect();
        sink?.disconnect();
      } catch {
        // already disconnected
      }
    },
    async destroy() {
      await this.pause();
      if (processor) processor.onaudioprocess = null;
      source = null;
      processor = null;
      sink = null;
      if (ownsContext) await context.close().catch(() => undefined);
    },
    setProfile(profile) {
      detector.setProfile(profile);
    },
  };
}

// ---------------------------------------------------------------------------
// Silero engine (vad-web)
// ---------------------------------------------------------------------------

export async function createSileroVad(options: CreateVadOptions): Promise<Vad> {
  const { MicVAD } = await import('@ricky0123/vad-web');
  const assetBasePath = options.assetBasePath ?? VAD_ASSET_PATH;
  const listening = { positiveSpeechThreshold: 0.5, negativeSpeechThreshold: 0.35 };
  const speaking = { positiveSpeechThreshold: 0.65, negativeSpeechThreshold: 0.45 };
  const vadOptions: Partial<RealTimeVADOptions> = {
    model: 'v5',
    baseAssetPath: assetBasePath,
    onnxWASMBasePath: assetBasePath,
    startOnLoad: false,
    getStream: async () => options.stream,
    pauseStream: async () => undefined,
    resumeStream: async () => options.stream,
    ...(options.audioContext ? { audioContext: options.audioContext } : {}),
    ...listening,
    minSpeechMs: 250,
    redemptionMs: options.endOfSpeechMs ?? VAD_END_OF_SPEECH_LAG_MS,
    preSpeechPadMs: 300,
    ortConfig: (ort) => {
      ort.env.logLevel = 'error';
      // Without cross-origin isolation SharedArrayBuffer is unavailable; one
      // thread is plenty for a 32 ms frame.
      ort.env.wasm.numThreads = 1;
    },
    onSpeechStart: () => options.onSpeechStart(),
    onSpeechRealStart: () => options.onSpeechRealStart?.(),
    onVADMisfire: () => options.onMisfire?.(),
    onSpeechEnd: (audio: Float32Array) => options.onSpeechEnd(audio),
    onFrameProcessed: (probabilities) => options.onLevel?.(probabilities.isSpeech),
  };
  const vad: MicVAD = await MicVAD.new(vadOptions);
  return {
    engine: 'silero',
    start: () => vad.start(),
    pause: () => vad.pause(),
    destroy: () => vad.destroy(),
    setProfile(profile) {
      vad.setOptions(profile === 'speaking' ? speaking : listening);
    },
  };
}

/**
 * Build the requested engine; `auto` (default) tries Silero and falls back to
 * the energy detector when the assets or the runtime cannot load.
 */
export async function createVad(options: CreateVadOptions): Promise<Vad> {
  const engine = options.engine ?? 'auto';
  if (engine === 'energy') return createEnergyVad(options);
  try {
    return await createSileroVad(options);
  } catch (error) {
    if (engine === 'silero') throw error;
    return createEnergyVad(options);
  }
}
