/**
 * Sentence-level playback queue (voice-16, voice-17).
 *
 * Sentences arrive in order from the turn stream; each one is fetched from the
 * TTS route and decoded while the previous one plays (one sentence of
 * prefetch), then played back to back. `stop({ fadeMs: 20 })` is the barge-in
 * primitive: it ramps the gain to zero over 20 ms, stops the source, aborts
 * every in-flight fetch, drops the queue, and bumps a generation token so a
 * late decode cannot start audio for a turn that was interrupted.
 *
 * The audio backend is a small `PlaybackSink` interface: the Web Audio
 * implementation lives in this file (`createWebAudioSink`), and the tests
 * drive the same queue through a fake sink under fake timers. Nothing here
 * writes audio anywhere: bytes live in memory until they are decoded and are
 * dropped afterwards.
 */

export interface DecodedAudio {
  durationMs: number;
}

export interface PlayingHandle {
  /** Ramp to silence over `fadeMs` and stop; `onStopped` fires when silent. */
  stop(fadeMs: number, onStopped?: () => void): void;
}

export interface PlaybackSink<Clip extends DecodedAudio = DecodedAudio> {
  /** Monotonic milliseconds. */
  now(): number;
  decode(bytes: ArrayBuffer): Promise<Clip>;
  /** Start `clip` at `offsetMs` right away; call `onEnded` when it finishes on its own. */
  start(clip: Clip, offsetMs: number, onEnded: () => void): PlayingHandle;
  /** 0–1 output level for the avatar mouth. */
  amplitude(): number;
  setMuted?(muted: boolean): void;
}

export interface SentenceRef {
  index: number;
  text: string;
  /** Turn-level generation; items from an older generation are ignored. */
  generation: number;
  turnId?: string;
}

export type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused';

export interface PlaybackEvents {
  onStateChange?: (state: PlaybackState) => void;
  /** First audible sample of a generation. */
  onFirstAudio?: (sentence: SentenceRef) => void;
  onSentenceStart?: (sentence: SentenceRef) => void;
  onSentenceEnd?: (sentence: SentenceRef) => void;
  /** Every queued sentence has played (or failed). */
  onDrained?: (generation: number) => void;
  /** Audio is silent after `stop()`; `elapsedMs` measures the stop itself. */
  onStopped?: (info: { generation: number; elapsedMs: number }) => void;
  onError?: (sentence: SentenceRef, error: unknown) => void;
}

export interface PlaybackQueueOptions<Clip extends DecodedAudio> extends PlaybackEvents {
  sink: PlaybackSink<Clip>;
  fetchAudio: (sentence: SentenceRef, signal: AbortSignal) => Promise<ArrayBuffer>;
  /** Sentences to fetch ahead of the one playing. Default 1. */
  prefetch?: number;
  /** Fade used by `stop()` when no `fadeMs` is given. Default 20. */
  defaultFadeMs?: number;
}

export interface PlaybackQueue {
  enqueue(sentence: SentenceRef): void;
  /** Barge-in: silence within `fadeMs`, drop everything, bump the generation. */
  stop(options?: { fadeMs?: number }): void;
  /** Hold playback (fade out, keep the queue) for a tentative barge-in. */
  pause(fadeMs?: number): void;
  /** Continue after `pause()` from where the sentence was. */
  resume(): void;
  /** Current generation: items with an older generation are ignored. */
  readonly generation: number;
  readonly state: PlaybackState;
  /** Sentences queued, fetching, or playing. */
  readonly size: number;
  amplitude(): number;
  setMuted(muted: boolean): void;
  dispose(): void;
}

type ItemStatus = 'queued' | 'fetching' | 'ready' | 'playing' | 'done' | 'failed';

interface Item<Clip extends DecodedAudio> {
  ref: SentenceRef;
  status: ItemStatus;
  clip: Clip | null;
  controller: AbortController | null;
  resumeOffsetMs: number;
  startedAt: number;
}

export function createPlaybackQueue<Clip extends DecodedAudio>(
  options: PlaybackQueueOptions<Clip>,
): PlaybackQueue {
  const { sink, fetchAudio } = options;
  const prefetch = Math.max(0, options.prefetch ?? 1);
  const defaultFadeMs = options.defaultFadeMs ?? 20;

  let items: Item<Clip>[] = [];
  let generation = 0;
  let state: PlaybackState = 'idle';
  let paused = false;
  let playing: { item: Item<Clip>; handle: PlayingHandle } | null = null;
  let firstAudioFired = false;
  let fading = false;
  let disposed = false;

  const setState = (next: PlaybackState) => {
    if (state === next) return;
    state = next;
    options.onStateChange?.(next);
  };

  const computeState = () => {
    if (playing) setState('playing');
    else if (paused && items.length > 0) setState('paused');
    else if (items.length > 0) setState('loading');
    else setState('idle');
  };

  const head = (): Item<Clip> | undefined => items[0];

  const finishItem = (item: Item<Clip>, status: 'done' | 'failed') => {
    item.status = status;
    items = items.filter((candidate) => candidate !== item);
  };

  const startHead = () => {
    const item = head();
    if (!item || item.status !== 'ready' || !item.clip || playing || paused) return;
    const clip = item.clip;
    const gen = generation;
    item.status = 'playing';
    item.startedAt = sink.now();
    const onEnded = () => {
      if (gen !== generation || playing?.item !== item) return;
      playing = null;
      finishItem(item, 'done');
      options.onSentenceEnd?.(item.ref);
      pump();
    };
    try {
      const handle = sink.start(clip, item.resumeOffsetMs, onEnded);
      playing = { item, handle };
    } catch (error) {
      playing = null;
      finishItem(item, 'failed');
      options.onError?.(item.ref, error);
      pump();
      return;
    }
    if (!firstAudioFired) {
      firstAudioFired = true;
      options.onFirstAudio?.(item.ref);
    }
    options.onSentenceStart?.(item.ref);
    computeState();
  };

  const startFetch = (item: Item<Clip>) => {
    const gen = generation;
    const controller = new AbortController();
    item.status = 'fetching';
    item.controller = controller;
    void (async () => {
      try {
        const bytes = await fetchAudio(item.ref, controller.signal);
        if (gen !== generation || controller.signal.aborted) return;
        const clip = await sink.decode(bytes);
        if (gen !== generation || controller.signal.aborted) return;
        item.clip = clip;
        item.status = 'ready';
        item.controller = null;
        pump();
      } catch (error) {
        if (gen !== generation || controller.signal.aborted) return;
        item.controller = null;
        finishItem(item, 'failed');
        options.onError?.(item.ref, error);
        pump();
      }
    })();
  };

  const pump = () => {
    if (disposed) return;
    if (!playing && !paused) startHead();
    // Beyond the sentence that is playing, keep the next one plus `prefetch`
    // more in flight so the next clip is decoded before the current one ends.
    let budget = prefetch + 1;
    for (const item of items) {
      if (budget === 0) break;
      if (item.status === 'playing') continue;
      if (item.status === 'queued') startFetch(item);
      if (item.status !== 'done' && item.status !== 'failed') budget -= 1;
    }
    if (!playing && items.length === 0) {
      const gen = generation;
      computeState();
      if (firstAudioFired || state === 'idle') options.onDrained?.(gen);
      return;
    }
    computeState();
  };

  const abortAll = () => {
    for (const item of items) {
      item.controller?.abort();
      item.controller = null;
    }
  };

  return {
    get generation() {
      return generation;
    },
    get state() {
      return state;
    },
    get size() {
      return items.length;
    },
    enqueue(sentence) {
      if (disposed || sentence.generation !== generation) return;
      if (items.some((item) => item.ref.index === sentence.index)) return;
      items.push({
        ref: sentence,
        status: 'queued',
        clip: null,
        controller: null,
        resumeOffsetMs: 0,
        startedAt: 0,
      });
      items.sort((a, b) => a.ref.index - b.ref.index);
      pump();
    },
    stop(opts) {
      const fadeMs = opts?.fadeMs ?? defaultFadeMs;
      const startedAt = sink.now();
      const stoppedGeneration = generation;
      generation += 1;
      abortAll();
      items = [];
      paused = false;
      firstAudioFired = false;
      const current = playing;
      playing = null;
      if (current) {
        fading = true;
        current.handle.stop(fadeMs, () => {
          fading = false;
          options.onStopped?.({
            generation: stoppedGeneration,
            elapsedMs: sink.now() - startedAt,
          });
        });
      } else if (!fading) {
        // Nothing audible; a pause fade still in flight reports the silence itself.
        options.onStopped?.({ generation: stoppedGeneration, elapsedMs: sink.now() - startedAt });
      }
      computeState();
    },
    pause(fadeMs = defaultFadeMs) {
      if (paused) return;
      paused = true;
      const current = playing;
      playing = null;
      if (current) {
        const { item } = current;
        const pausedAt = sink.now();
        const gen = generation;
        item.resumeOffsetMs += Math.max(0, pausedAt - item.startedAt);
        item.status = 'ready';
        // Report the silence: a tentative barge-in measures its stop here.
        fading = true;
        current.handle.stop(fadeMs, () => {
          fading = false;
          options.onStopped?.({ generation: gen, elapsedMs: sink.now() - pausedAt });
        });
      }
      computeState();
    },
    resume() {
      if (!paused) return;
      paused = false;
      pump();
    },
    amplitude: () => (playing ? sink.amplitude() : 0),
    setMuted: (muted) => sink.setMuted?.(muted),
    dispose() {
      disposed = true;
      abortAll();
      items = [];
      playing?.handle.stop(defaultFadeMs);
      playing = null;
    },
  };
}

// ---------------------------------------------------------------------------
// Web Audio sink
// ---------------------------------------------------------------------------

export interface WebAudioClip extends DecodedAudio {
  buffer: AudioBuffer;
}

/** Decode → AudioBufferSourceNode → per-clip gain → master gain → analyser → destination. */
export function createWebAudioSink(context: AudioContext): PlaybackSink<WebAudioClip> {
  const master = context.createGain();
  const analyser = context.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.6;
  master.connect(analyser);
  analyser.connect(context.destination);
  const samples = new Uint8Array(analyser.fftSize);
  let muted = false;

  return {
    now: () => context.currentTime * 1000,
    decode(bytes) {
      return new Promise<WebAudioClip>((resolve, reject) => {
        // The callback form works on every browser that has Web Audio at all
        // (older Safari lacks the promise form). Copy first: decodeAudioData
        // detaches the buffer it is given.
        const copy = bytes.slice(0);
        const done = (buffer: AudioBuffer) =>
          resolve({ buffer, durationMs: buffer.duration * 1000 });
        try {
          const maybe = context.decodeAudioData(copy, done, reject);
          if (maybe && typeof (maybe as Promise<AudioBuffer>).catch === 'function') {
            (maybe as Promise<AudioBuffer>).catch(() => undefined);
          }
        } catch (error) {
          reject(error);
        }
      });
    },
    start(clip, offsetMs, onEnded) {
      const source = context.createBufferSource();
      source.buffer = clip.buffer;
      const gain = context.createGain();
      const t0 = context.currentTime;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(muted ? 0 : 1, t0 + 0.005);
      source.connect(gain);
      gain.connect(master);
      let ended = false;
      source.onended = () => {
        if (ended) return;
        ended = true;
        source.disconnect();
        gain.disconnect();
        onEnded();
      };
      source.start(0, Math.max(0, offsetMs) / 1000);
      return {
        stop(fadeMs, onStopped) {
          if (ended) {
            onStopped?.();
            return;
          }
          ended = true;
          const t = context.currentTime;
          const fade = Math.max(0, fadeMs) / 1000;
          gain.gain.cancelScheduledValues(t);
          gain.gain.setValueAtTime(gain.gain.value, t);
          gain.gain.linearRampToValueAtTime(0, t + fade);
          source.onended = () => {
            source.disconnect();
            gain.disconnect();
            onStopped?.();
          };
          try {
            source.stop(t + fade + 0.002);
          } catch {
            onStopped?.();
          }
        },
      };
    },
    amplitude() {
      analyser.getByteTimeDomainData(samples);
      let sum = 0;
      for (let i = 0; i < samples.length; i += 1) {
        const v = (samples[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / samples.length);
      return Math.min(1, rms * 3.5);
    },
    setMuted(next) {
      muted = next;
      master.gain.setTargetAtTime(next ? 0 : 1, context.currentTime, 0.01);
    },
  };
}
