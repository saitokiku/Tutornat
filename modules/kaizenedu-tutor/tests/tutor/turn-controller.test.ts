import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LATENCY } from '@/kaizen.config';
import type { TurnRequest } from '@/lib/tutor/contracts';
import {
  createPlaybackQueue,
  type DecodedAudio,
  type PlaybackEvents,
  type PlaybackSink,
  type SentenceRef,
} from '@/lib/tutor/voice/playback-queue';
import type { ParsedTurnEvent } from '@/lib/tutor/voice/sse-client';
import { createTurnController, MARKS } from '@/lib/tutor/voice/turn-controller';
import { VAD_END_OF_SPEECH_LAG_MS, VAD_SAMPLE_RATE } from '@/lib/tutor/voice/vad';

type Step = { at: number; event: ParsedTurnEvent };

/** A scripted turn stream: each event arrives `at` ms after the request. */
function scriptedStream(steps: Step[]) {
  const requests: TurnRequest[] = [];
  const stream = async function* (request: TurnRequest, signal: AbortSignal) {
    requests.push(request);
    const started = Date.now();
    for (const step of steps) {
      const wait = Math.max(0, started + step.at - Date.now());
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, wait);
        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new DOMException('aborted', 'AbortError'));
        });
      });
      if (signal.aborted) return;
      yield step.event;
    }
  };
  return { stream, requests };
}

function fakeSink() {
  const stopped: number[] = [];
  const sink: PlaybackSink<DecodedAudio> = {
    now: () => Date.now(),
    decode: async (bytes) => ({ durationMs: bytes.byteLength }),
    start(clip, offsetMs, onEnded) {
      const timer = setTimeout(onEnded, clip.durationMs - offsetMs);
      return {
        stop(fadeMs, onStopped) {
          clearTimeout(timer);
          setTimeout(() => {
            stopped.push(Date.now());
            onStopped?.();
          }, fadeMs);
        },
      };
    },
    amplitude: () => 0.4,
  };
  return { sink, stopped };
}

function makeController(
  steps: Step[],
  options: { ttsMs?: number; clipMs?: number; transcript?: string } = {},
) {
  const { stream, requests } = scriptedStream(steps);
  const { sink, stopped } = fakeSink();
  const marks: Array<{ name: string; at: number }> = [];
  const fetched: number[] = [];
  const fetchAudio = (sentence: SentenceRef, signal: AbortSignal) =>
    new Promise<ArrayBuffer>((resolve, reject) => {
      fetched.push(sentence.index);
      const timer = setTimeout(
        () => resolve(new ArrayBuffer(options.clipMs ?? 900)),
        options.ttsMs ?? 250,
      );
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new Error('aborted'));
      });
    });
  const wraps: string[] = [];
  const controller = createTurnController({
    sessionId: 'ses_1',
    stream,
    createPlayback: (events: PlaybackEvents) =>
      createPlaybackQueue({ sink, fetchAudio, ...events }),
    transcribe: async () => ({ text: options.transcript ?? '', seconds: 1.2 }),
    now: () => Date.now(),
    mark: (name) => marks.push({ name, at: Date.now() }),
    measure: () => undefined,
    newId: (() => {
      let n = 0;
      return () => `id_${(n += 1)}`;
    })(),
    onWrap: (phase) => wraps.push(phase),
  });
  return { controller, requests, marks, fetched, stopped, wraps };
}

const TUTOR_TURN: Step[] = [
  { at: 50, event: { type: 'phase', phase: 'work', remainingMs: 600_000 } },
  { at: 300, event: { type: 'text_delta', text: 'Two fourths is one half. ' } },
  { at: 310, event: { type: 'sentence', index: 0, text: 'Two fourths is one half.' } },
  {
    at: 320,
    event: {
      type: 'action',
      action: {
        id: 'a1',
        type: 'wb_draw_shape',
        shape: 'rectangle',
        x: 1,
        y: 1,
        width: 5,
        height: 5,
      },
    },
  },
  { at: 600, event: { type: 'text_delta', text: 'Picture a bar cut in four.' } },
  { at: 610, event: { type: 'sentence', index: 1, text: 'Picture a bar cut in four.' } },
  { at: 620, event: { type: 'usage', turnId: 't1', cents: 2, sessionCents: 10 } },
  { at: 630, event: { type: 'done', turnId: 't1', phase: 'work' } },
];

describe('turn controller (voice-16/17/18, tutor-08)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs a text turn: thinking → speaking → idle, with marks and metrics', async () => {
    const { controller, requests, marks, wraps } = makeController(TUTOR_TURN);
    controller.submitText('why is 2/4 a half');
    const state0 = controller.getState();
    expect(state0.phase).toBe('thinking');
    expect(state0.busy).toBe(true);
    expect(state0.transcript.map((e) => [e.role, e.text])).toEqual([
      ['learner', 'why is 2/4 a half'],
    ]);
    expect(requests[0]).toMatchObject({
      sessionId: 'ses_1',
      text: 'why is 2/4 a half',
      inputMode: 'text',
    });
    expect(requests[0].clientTurnId).toBe('id_1');

    await vi.advanceTimersByTimeAsync(320);
    expect(controller.getState().transcript.at(-1)?.text).toBe('Two fourths is one half. ');
    expect(controller.getState().boardActions).toHaveLength(1);
    expect(controller.getState().phase).toBe('thinking'); // audio not yet playing

    await vi.advanceTimersByTimeAsync(250); // TTS for sentence 0 arrives at 560
    const state1 = controller.getState();
    expect(state1.phase).toBe('speaking');
    const metrics = state1.metrics[0];
    expect(metrics.eosAt).toBe(0);
    expect(metrics.firstDeltaAt).toBe(300);
    expect(metrics.firstSentenceAt).toBe(310);
    expect(metrics.firstAudioAt).toBe(560);
    expect(marks.map((m) => m.name)).toEqual([
      MARKS.eos,
      MARKS.firstDelta,
      MARKS.firstSentence,
      MARKS.firstAudio,
    ]);
    expect(metrics.firstAudioAt! - metrics.eosAt).toBeLessThanOrEqual(LATENCY.firstAudioP50Ms);

    await vi.advanceTimersByTimeAsync(100); // done at 630
    expect(controller.getState().usage).toEqual({ turnCents: 2, sessionCents: 10 });
    expect(controller.getState().transcript.at(-1)?.status).toBe('final');
    expect(controller.getState().phase).toBe('speaking'); // second sentence still queued

    await vi.advanceTimersByTimeAsync(2000);
    const done = controller.getState();
    expect(done.phase).toBe('idle');
    expect(done.busy).toBe(false);
    expect(done.idleSince).not.toBeNull();
    expect(wraps).toEqual([]);
    controller.dispose();
  });

  it('barge-in: phase flips to listening before audio stops, audio is silent within 300 ms, late frames are ignored', async () => {
    const { controller, marks, stopped, fetched } = makeController(TUTOR_TURN, { clipMs: 5000 });
    controller.submitText('go');
    await vi.advanceTimersByTimeAsync(560);
    expect(controller.getState().phase).toBe('speaking');

    controller.bargeIn('vad');
    expect(controller.getState().phase).toBe('listening');
    expect(controller.getState().bargeInPending).toBe(true);
    expect(stopped).toEqual([]); // audio is only held so far
    controller.confirmBargeIn();
    expect(controller.getState().bargeInPending).toBe(false);
    expect(controller.getState().transcript.at(-1)?.status).toBe('interrupted');

    await vi.advanceTimersByTimeAsync(20);
    const metrics = controller.getState().metrics[0];
    expect(metrics.bargeInAt).toBe(560);
    expect(metrics.audioStoppedAt).toBe(580);
    expect(metrics.audioStoppedAt! - metrics.bargeInAt!).toBeLessThanOrEqual(LATENCY.bargeInStopMs);
    expect(marks.map((m) => m.name)).toContain(MARKS.bargeIn);
    expect(marks.map((m) => m.name)).toContain(MARKS.audioStopped);

    // The stream's remaining frames (sentence 1, done) never reach the state.
    await vi.advanceTimersByTimeAsync(2000);
    expect(controller.getState().phase).toBe('listening');
    expect(fetched).toEqual([0]);
    expect(controller.getState().usage).toBeNull();
    controller.dispose();
  });

  it('a VAD misfire resumes playback where it was', async () => {
    const { controller, stopped } = makeController(TUTOR_TURN, { clipMs: 3000 });
    controller.submitText('go');
    await vi.advanceTimersByTimeAsync(800);
    expect(controller.getState().phase).toBe('speaking');
    controller.bargeIn('vad');
    expect(controller.getState().phase).toBe('listening');
    await vi.advanceTimersByTimeAsync(150);
    controller.cancelBargeIn();
    expect(controller.getState().phase).toBe('speaking');
    expect(controller.getState().metrics[0].bargeInAt).toBeNull();
    expect(stopped).toEqual([820]); // the hold faded out once; nothing was dropped
    await vi.advanceTimersByTimeAsync(6000);
    expect(controller.getState().phase).toBe('idle');
    expect(controller.getState().transcript.at(-1)?.status).toBe('final');
    controller.dispose();
  });

  it('a voice clip goes through ASR and becomes the learner turn; silence is reported, not sent', async () => {
    const heard = makeController(TUTOR_TURN, { transcript: 'what is a numerator' });
    heard.controller.submitVoiceClip({ blob: new Blob(['x']), durationMs: 1200 });
    expect(heard.controller.getState().phase).toBe('thinking');
    await vi.advanceTimersByTimeAsync(5);
    expect(heard.requests[0]).toMatchObject({ text: 'what is a numerator', inputMode: 'voice' });
    expect(heard.controller.getState().metrics[0].asrAt).not.toBeNull();
    heard.controller.dispose();

    const silent = makeController(TUTOR_TURN, { transcript: '   ' });
    silent.controller.submitVoiceClip({ blob: new Blob(['x']), durationMs: 300 });
    await vi.advanceTimersByTimeAsync(5);
    expect(silent.requests).toHaveLength(0);
    expect(silent.controller.getState().phase).toBe('idle');
    expect(silent.controller.getState().notice).toBe('nothing-heard');
    silent.controller.dispose();
  });

  it('a VAD utterance dates its end of speech before the detector reported it', async () => {
    // Spec §5.3 measures from the end of the learner's speech. A detector only
    // says "finished" once its silence window has run, so taking the clock at
    // that moment would understate every turn by the whole window.
    vi.setSystemTime(10_000);
    const { controller, marks } = makeController(TUTOR_TURN, { transcript: 'why is 2/4 a half' });
    controller.submitVoiceAudio(new Float32Array(VAD_SAMPLE_RATE));
    await vi.advanceTimersByTimeAsync(5);
    const metrics = controller.getState().metrics[0];
    expect(metrics.eosAt).toBe(10_000 - VAD_END_OF_SPEECH_LAG_MS);
    expect(metrics.asrAt).toBe(10_000);
    expect(marks[0]?.name).toBe(MARKS.eos);
    controller.dispose();
  });

  it('a push-to-talk clip may carry its own end of speech', async () => {
    vi.setSystemTime(4_000);
    const { controller } = makeController(TUTOR_TURN, { transcript: 'ok' });
    controller.submitVoiceClip({ blob: new Blob(['x']), durationMs: 900, eosAt: 3_950 });
    await vi.advanceTimersByTimeAsync(5);
    expect(controller.getState().metrics[0].eosAt).toBe(3_950);
    controller.dispose();
  });

  it('a silence check-in sends an empty voice turn and counts consecutive check-ins', async () => {
    const { controller, requests } = makeController([
      { at: 100, event: { type: 'text_delta', text: 'Still there?' } },
      { at: 110, event: { type: 'sentence', index: 0, text: 'Still there?' } },
      { at: 120, event: { type: 'done', turnId: 't2', phase: 'work' } },
    ]);
    controller.checkIn();
    expect(requests[0]).toMatchObject({ text: '', inputMode: 'voice' });
    expect(controller.getState().checkIns.consecutive).toBe(1);
    expect(controller.getState().transcript.filter((e) => e.role === 'learner')).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(3000);
    expect(controller.getState().phase).toBe('idle');
    controller.submitText('yes');
    expect(controller.getState().checkIns.consecutive).toBe(0);
    controller.dispose();
  });

  it('the greeting is an empty voice turn that is not a check-in (D36)', async () => {
    const { controller, requests } = makeController([
      { at: 100, event: { type: 'text_delta', text: 'Hi, what are you working on?' } },
      { at: 110, event: { type: 'sentence', index: 0, text: 'Hi, what are you working on?' } },
      { at: 120, event: { type: 'done', turnId: 't1', phase: 'greet' } },
    ]);
    controller.greet();
    expect(requests[0]).toMatchObject({ text: '', inputMode: 'voice' });
    expect(controller.getState().checkIns).toEqual({ lastAt: null, consecutive: 0 });
    await vi.advanceTimersByTimeAsync(3000);
    expect(controller.getState().phase).toBe('idle');
    // The rules read the controller's clock, and only that clock.
    const idleSince = controller.getState().idleSince;
    expect(idleSince).not.toBeNull();
    expect(idleSince!).toBeLessThanOrEqual(controller.now());
    expect(controller.now() - idleSince!).toBeLessThan(3000);
    controller.dispose();
  });

  it('a reconnect discards the partial text and never speaks a sentence twice', async () => {
    const { controller, fetched } = makeController([
      { at: 100, event: { type: 'text_delta', text: 'Half of ' } },
      { at: 110, event: { type: 'sentence', index: 0, text: 'Half of four is two.' } },
      { at: 200, event: { type: 'reconnect', attempt: 1 } },
      { at: 300, event: { type: 'text_delta', text: 'Half of four is two.' } },
      { at: 310, event: { type: 'sentence', index: 0, text: 'Half of four is two.' } },
      { at: 320, event: { type: 'done', turnId: 't3', phase: 'work' } },
    ]);
    controller.submitText('half of four');
    await vi.advanceTimersByTimeAsync(210);
    expect(controller.getState().connection).toBe('retrying');
    expect(controller.getState().transcript.at(-1)?.text).toBe('');
    await vi.advanceTimersByTimeAsync(3000);
    expect(controller.getState().connection).toBe('online');
    expect(controller.getState().transcript.at(-1)?.text).toBe('Half of four is two.');
    expect(fetched).toEqual([0]);
    expect(controller.getState().phase).toBe('idle');
    controller.dispose();
  });

  it('terminal error codes stop the session; a text-only stream still speaks through the splitter', async () => {
    const capped = makeController([
      { at: 50, event: { type: 'error', code: 'COST_CEILING', message: 'Budget reached.' } },
    ]);
    capped.controller.submitText('more');
    await vi.advanceTimersByTimeAsync(100);
    expect(capped.controller.getState().error).toEqual({
      code: 'COST_CEILING',
      message: 'Budget reached.',
      terminal: true,
    });
    expect(capped.controller.getState().phase).toBe('idle');
    capped.controller.dispose();

    const textOnly = makeController([
      { at: 50, event: { type: 'text_delta', text: 'One half. Two quarters. ' } },
      { at: 60, event: { type: 'done', turnId: 't4', phase: 'wrap' } },
    ]);
    textOnly.controller.submitText('sum up');
    await vi.advanceTimersByTimeAsync(400);
    expect(textOnly.fetched).toEqual([0, 1]);
    expect(textOnly.controller.getState().phase).toBe('speaking');
    await vi.advanceTimersByTimeAsync(3000);
    expect(textOnly.controller.getState().phase).toBe('idle');
    expect(textOnly.wraps).toEqual(['wrap']);
    textOnly.controller.dispose();
  });
});
