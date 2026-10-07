import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LATENCY } from '@/kaizen.config';
import {
  createPlaybackQueue,
  type DecodedAudio,
  type PlaybackSink,
  type SentenceRef,
} from '@/lib/tutor/voice/playback-queue';

/**
 * A sink with a virtual clock: a clip "plays" for `durationMs` on the fake
 * timers and `stop(fadeMs)` reports silence `fadeMs` later, the way the Web
 * Audio gain ramp does.
 */
function createFakeSink() {
  const log: string[] = [];
  const sink: PlaybackSink<DecodedAudio> = {
    now: () => Date.now(),
    decode: async (bytes) => ({ durationMs: bytes.byteLength }),
    start(clip, offsetMs, onEnded) {
      log.push(`start:${clip.durationMs}@${offsetMs}`);
      const timer = setTimeout(onEnded, clip.durationMs - offsetMs);
      return {
        stop(fadeMs, onStopped) {
          clearTimeout(timer);
          setTimeout(() => {
            log.push(`silent@${Date.now()}`);
            onStopped?.();
          }, fadeMs);
        },
      };
    },
    amplitude: () => 0.5,
  };
  return { sink, log };
}

/** TTS fetch that takes `latencyMs` and encodes the clip length in the byte length. */
function createFakeTts(latencyMs: number, durations: Record<number, number>) {
  const fetches: Array<{ index: number; at: number }> = [];
  const aborted: number[] = [];
  const fetchAudio = (sentence: SentenceRef, signal: AbortSignal) =>
    new Promise<ArrayBuffer>((resolve, reject) => {
      fetches.push({ index: sentence.index, at: Date.now() });
      const timer = setTimeout(
        () => resolve(new ArrayBuffer(durations[sentence.index] ?? 500)),
        latencyMs,
      );
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        aborted.push(sentence.index);
        reject(new Error('aborted'));
      });
    });
  return { fetchAudio, fetches, aborted };
}

describe('playback queue (voice-16, voice-17)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('plays sentences in index order and prefetches the next one while the current plays', async () => {
    const { sink, log } = createFakeSink();
    const tts = createFakeTts(200, { 0: 1000, 1: 800, 2: 600 });
    const started: number[] = [];
    const ended: number[] = [];
    let firstAudioAt: number | null = null;
    let drained = false;
    const queue = createPlaybackQueue({
      sink,
      fetchAudio: tts.fetchAudio,
      prefetch: 1,
      onFirstAudio: () => {
        firstAudioAt = Date.now();
      },
      onSentenceStart: (s) => started.push(s.index),
      onSentenceEnd: (s) => ended.push(s.index),
      onDrained: () => {
        drained = true;
      },
    });
    const gen = queue.generation;
    // Arrive out of order: index 1 before index 0.
    queue.enqueue({ index: 1, text: 'second', generation: gen });
    queue.enqueue({ index: 0, text: 'first', generation: gen });
    queue.enqueue({ index: 2, text: 'third', generation: gen });
    expect(queue.state).toBe('loading');

    await vi.advanceTimersByTimeAsync(200);
    expect(firstAudioAt).toBe(200);
    expect(started).toEqual([0]);
    // At t=0 only the head and one lookahead were fetched; the third started
    // the moment sentence 0 began playing and freed a slot.
    expect(tts.fetches.map((f) => ({ ...f }))).toEqual([
      { index: 1, at: 0 },
      { index: 0, at: 0 },
      { index: 2, at: 200 },
    ]);
    expect(queue.state).toBe('playing');

    await vi.advanceTimersByTimeAsync(1000);
    expect(ended).toEqual([0]);
    expect(started).toEqual([0, 1]);
    // No gap: sentence 1 was decoded before sentence 0 ended.
    expect(log[1]).toBe('start:800@0');

    await vi.advanceTimersByTimeAsync(800 + 600);
    expect(ended).toEqual([0, 1, 2]);
    expect(drained).toBe(true);
    expect(queue.state).toBe('idle');
    expect(queue.size).toBe(0);
  });

  it(`stops within ${LATENCY.bargeInStopMs} ms on barge-in, aborts prefetches, and ignores late results`, async () => {
    const { sink, log } = createFakeSink();
    const tts = createFakeTts(300, { 0: 2000, 1: 2000, 2: 2000 });
    const started: number[] = [];
    let stopped: { generation: number; elapsedMs: number } | null = null;
    const queue = createPlaybackQueue({
      sink,
      fetchAudio: tts.fetchAudio,
      onSentenceStart: (s) => started.push(s.index),
      onStopped: (info) => {
        stopped = info;
      },
    });
    const gen = queue.generation;
    queue.enqueue({ index: 0, text: 'a', generation: gen });
    queue.enqueue({ index: 1, text: 'b', generation: gen });
    await vi.advanceTimersByTimeAsync(300);
    expect(started).toEqual([0]);
    queue.enqueue({ index: 2, text: 'c', generation: gen });
    await vi.advanceTimersByTimeAsync(100); // sentence 1 decoded, sentence 2 fetching

    const bargeInAt = Date.now();
    queue.stop({ fadeMs: 20 });
    expect(queue.generation).toBe(gen + 1);
    expect(queue.size).toBe(0);
    expect(tts.aborted).toEqual([2]);

    await vi.advanceTimersByTimeAsync(20);
    expect(stopped).not.toBeNull();
    const elapsed = Date.now() - bargeInAt;
    expect(elapsed).toBe(20);
    expect(elapsed).toBeLessThanOrEqual(LATENCY.bargeInStopMs);
    expect(log.at(-1)).toBe(`silent@${bargeInAt + 20}`);

    // A sentence from the interrupted generation never plays.
    queue.enqueue({ index: 3, text: 'late', generation: gen });
    await vi.advanceTimersByTimeAsync(5000);
    expect(started).toEqual([0]);
    expect(queue.state).toBe('idle');
  });

  it('pauses and resumes from the same offset for a tentative barge-in', async () => {
    const { sink, log } = createFakeSink();
    const tts = createFakeTts(100, { 0: 1000 });
    const ended: number[] = [];
    const queue = createPlaybackQueue({
      sink,
      fetchAudio: tts.fetchAudio,
      onSentenceEnd: (s) => ended.push(s.index),
    });
    queue.enqueue({ index: 0, text: 'a', generation: queue.generation });
    await vi.advanceTimersByTimeAsync(100 + 400);
    queue.pause(20);
    expect(queue.state).toBe('paused');
    await vi.advanceTimersByTimeAsync(2000);
    expect(ended).toEqual([]);
    queue.resume();
    expect(log.at(-1)).toBe('start:1000@400');
    await vi.advanceTimersByTimeAsync(600);
    expect(ended).toEqual([0]);
    expect(queue.state).toBe('idle');
  });

  it('skips a sentence whose TTS failed and keeps playing the rest', async () => {
    const { sink } = createFakeSink();
    const errors: number[] = [];
    const started: number[] = [];
    const fetchAudio = (sentence: SentenceRef) =>
      sentence.index === 0
        ? Promise.reject(new Error('tts down'))
        : Promise.resolve(new ArrayBuffer(300));
    const queue = createPlaybackQueue({
      sink,
      fetchAudio,
      onError: (s) => errors.push(s.index),
      onSentenceStart: (s) => started.push(s.index),
    });
    queue.enqueue({ index: 0, text: 'a', generation: queue.generation });
    queue.enqueue({ index: 1, text: 'b', generation: queue.generation });
    await vi.advanceTimersByTimeAsync(10);
    expect(errors).toEqual([0]);
    expect(started).toEqual([1]);
  });
});
