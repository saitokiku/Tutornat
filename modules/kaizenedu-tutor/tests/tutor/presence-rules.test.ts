/**
 * Presence rules and the recovery ladder (spec §5.10 A–C; D15, D16, R28).
 *
 * Driven under fake timers so every threshold in `kaizen.config.ts` is
 * exercised as a real elapsed duration rather than a hard-coded number: the
 * band's silence window, the backchannel gap, the ladder's threshold and step
 * cadence, and the pause after `ATTENTION.pauseAfterAwayMs`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ATTENTION, BANDS } from '@/kaizen.config';
import {
  aggregateSamples,
  attentionStateFor,
  BACKCHANNEL_MIN_GAP_MS,
  BACKCHANNEL_MIN_UTTERANCE_MS,
  CHECK_IN_NO_RESPONSE_MS,
  INITIAL_BACKCHANNEL,
  INITIAL_LADDER,
  INITIAL_SAMPLER,
  ladderRunsFor,
  MAX_CONSECUTIVE_CHECK_INS,
  SAMPLE_HEARTBEAT_MS,
  shouldCheckIn,
  stepBackchannel,
  stepLadder,
  stepSampler,
  type BackchannelState,
  type LadderState,
  type PresenceInput,
  type RecoveryFired,
  type SamplerState,
} from '@/lib/tutor/presence';

const START = 1_700_000_000_000;

function input(over: Partial<PresenceInput> = {}): PresenceInput {
  return {
    now: Date.now(),
    band: '9-12',
    phase: 'idle',
    busy: false,
    lastLearnerInputAt: START,
    idleSince: START,
    documentHidden: false,
    hiddenSince: null,
    lastPointerAt: START,
    checkIns: { lastAt: null, consecutive: 0 },
    awaitingCheck: false,
    stopped: false,
    ...over,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(START);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the silence check-in', () => {
  it('waits for the band window and then asks once', () => {
    const window = BANDS['9-12'].silenceCheckInMs;
    vi.advanceTimersByTime(window - 1);
    expect(shouldCheckIn(input())).toBe(false);

    vi.advanceTimersByTime(1);
    expect(shouldCheckIn(input())).toBe(true);

    // Having just asked, it does not ask again inside the same window.
    const asked = { lastAt: Date.now(), consecutive: 1 };
    expect(shouldCheckIn(input({ checkIns: asked }))).toBe(false);
    vi.advanceTimersByTime(window);
    expect(shouldCheckIn(input({ checkIns: asked }))).toBe(true);
  });

  it('uses each band’s own window', () => {
    vi.advanceTimersByTime(BANDS['4-8'].silenceCheckInMs);
    expect(shouldCheckIn(input({ band: '4-8' }))).toBe(true);
    expect(shouldCheckIn(input({ band: '13-17' }))).toBe(false);
    vi.advanceTimersByTime(BANDS['13-17'].silenceCheckInMs - BANDS['4-8'].silenceCheckInMs);
    expect(shouldCheckIn(input({ band: '13-17' }))).toBe(true);
  });

  it('stays quiet while the tutor is busy, a check is open, the tab is hidden, or it has asked twice', () => {
    vi.advanceTimersByTime(BANDS['9-12'].silenceCheckInMs * 2);
    expect(shouldCheckIn(input({ busy: true }))).toBe(false);
    expect(shouldCheckIn(input({ phase: 'speaking' }))).toBe(false);
    expect(shouldCheckIn(input({ awaitingCheck: true }))).toBe(false);
    expect(shouldCheckIn(input({ documentHidden: true }))).toBe(false);
    expect(shouldCheckIn(input({ stopped: true }))).toBe(false);
    expect(
      shouldCheckIn(input({ checkIns: { lastAt: null, consecutive: MAX_CONSECUTIVE_CHECK_INS } })),
    ).toBe(false);
  });
});

describe('backchannel cues', () => {
  it('needs a long utterance, cues once, and then holds off for the gap', () => {
    let state: BackchannelState = INITIAL_BACKCHANNEL;
    const listening = () => ({ now: Date.now(), phase: 'listening' as const, stopped: false });

    let result = stepBackchannel(state, listening());
    state = result.state;
    expect(result.cue).toBeNull();

    vi.advanceTimersByTime(BACKCHANNEL_MIN_UTTERANCE_MS - 1);
    result = stepBackchannel(state, listening());
    state = result.state;
    expect(result.cue).toBeNull();

    vi.advanceTimersByTime(1);
    result = stepBackchannel(state, listening());
    state = result.state;
    expect(result.cue).not.toBeNull();

    // Only once per utterance, however long it runs.
    vi.advanceTimersByTime(BACKCHANNEL_MIN_UTTERANCE_MS * 2);
    result = stepBackchannel(state, listening());
    state = result.state;
    expect(result.cue).toBeNull();
  });

  it('will not cue a second utterance inside the 8 second gap', () => {
    let state: BackchannelState = INITIAL_BACKCHANNEL;
    const tick = (phase: 'listening' | 'idle') => {
      const result = stepBackchannel(state, { now: Date.now(), phase, stopped: false });
      state = result.state;
      return result.cue;
    };
    // The gap is longer than the utterance a cue needs, which is what makes
    // two back-to-back utterances produce one cue and not two.
    expect(BACKCHANNEL_MIN_UTTERANCE_MS).toBeLessThan(BACKCHANNEL_MIN_GAP_MS);

    expect(tick('listening')).toBeNull();
    vi.advanceTimersByTime(BACKCHANNEL_MIN_UTTERANCE_MS);
    expect(tick('listening')).not.toBeNull();
    expect(tick('idle')).toBeNull();

    // A second utterance straight away: long enough, but inside the gap.
    expect(tick('listening')).toBeNull();
    vi.advanceTimersByTime(BACKCHANNEL_MIN_UTTERANCE_MS);
    expect(tick('listening')).toBeNull();

    // Past the gap the next long utterance may be acknowledged again.
    expect(tick('idle')).toBeNull();
    vi.advanceTimersByTime(BACKCHANNEL_MIN_GAP_MS);
    expect(tick('listening')).toBeNull();
    vi.advanceTimersByTime(BACKCHANNEL_MIN_UTTERANCE_MS);
    expect(tick('listening')).not.toBeNull();
  });

  it('never cues while the tutor is the one talking', () => {
    const result = stepBackchannel(INITIAL_BACKCHANNEL, {
      now: Date.now(),
      phase: 'speaking',
      stopped: false,
    });
    expect(result.cue).toBeNull();
  });
});

describe('non-camera attention signals', () => {
  it('reads a hidden tab as away and a long quiet as drifting', () => {
    expect(attentionStateFor(input())).toBe('attending');
    expect(attentionStateFor(input({ documentHidden: true }))).toBe('away');

    vi.advanceTimersByTime(BANDS['9-12'].silenceCheckInMs);
    expect(attentionStateFor(input())).toBe('drifting');
  });

  it('reads an unanswered check-in as drifting', () => {
    const askedAt = Date.now();
    vi.advanceTimersByTime(CHECK_IN_NO_RESPONSE_MS);
    expect(
      attentionStateFor(
        input({
          phase: 'speaking',
          busy: true,
          checkIns: { lastAt: askedAt, consecutive: 1 },
          lastLearnerInputAt: askedAt - 1_000,
        }),
      ),
    ).toBe('drifting');
  });

  it('never produces no_face: that is a camera verdict', () => {
    const states = new Set(
      [input(), input({ documentHidden: true }), input({ busy: true })].map(attentionStateFor),
    );
    expect(states.has('no_face')).toBe(false);
  });

  it('samples on a change and then once per heartbeat', () => {
    let state: SamplerState = INITIAL_SAMPLER;
    let result = stepSampler(state, input());
    state = result.state;
    expect(result.sample?.state).toBe('attending');

    vi.advanceTimersByTime(1_000);
    result = stepSampler(state, input());
    state = result.state;
    expect(result.sample).toBeNull();

    vi.advanceTimersByTime(SAMPLE_HEARTBEAT_MS);
    result = stepSampler(state, input({ lastLearnerInputAt: Date.now(), idleSince: Date.now() }));
    state = result.state;
    expect(result.sample?.state).toBe('attending');

    result = stepSampler(state, input({ documentHidden: true }));
    expect(result.sample).toEqual({ state: 'away', ts: Date.now(), source: 'visibility' });
  });

  it('aggregates to counts and a percentage, never to a list of samples', () => {
    const aggregate = aggregateSamples(
      [{ state: 'attending' }, { state: 'attending' }, { state: 'drifting' }, { state: 'away' }],
      { attending: 6 },
    );
    expect(aggregate).toEqual({
      attending: 8,
      drifting: 1,
      away: 1,
      no_face: 0,
      total: 10,
      attendingPct: 80,
    });
  });
});

describe('the recovery ladder', () => {
  const threshold = BANDS['9-12'].attentionThresholdMs ?? 0;

  function run(
    steps: Array<{ advanceMs: number; state: 'attending' | 'drifting' | 'away' }>,
    options: { band?: '9-12' | '13-17' | '4-8'; disabledSteps?: number[] } = {},
  ): { fired: RecoveryFired[]; state: LadderState } {
    let state: LadderState = INITIAL_LADDER;
    const fired: RecoveryFired[] = [];
    for (const step of steps) {
      vi.advanceTimersByTime(step.advanceMs);
      const result = stepLadder(state, {
        now: Date.now(),
        band: options.band ?? '9-12',
        state: step.state,
        ...(options.disabledSteps ? { disabledSteps: options.disabledSteps } : {}),
      });
      state = result.state;
      if (result.fired) fired.push(result.fired);
    }
    return { fired, state };
  }

  it('runs only for bands that have a threshold', () => {
    expect(ladderRunsFor('9-12')).toBe(true);
    expect(ladderRunsFor('4-8')).toBe(true);
    expect(ladderRunsFor('13-17')).toBe(false);
    expect(ladderRunsFor('adult')).toBe(false);

    const teen = run(
      [
        { advanceMs: 0, state: 'drifting' },
        { advanceMs: threshold * 4, state: 'drifting' },
      ],
      { band: '13-17' },
    );
    expect(teen.fired).toEqual([]);
  });

  it('waits for the threshold, then escalates one rung per ladder step', () => {
    const { fired } = run([
      { advanceMs: 0, state: 'drifting' },
      { advanceMs: threshold - 1_000, state: 'drifting' },
      { advanceMs: 1_000, state: 'drifting' },
      { advanceMs: ATTENTION.ladderStepMs - 1_000, state: 'drifting' },
      { advanceMs: 1_000, state: 'drifting' },
      { advanceMs: ATTENTION.ladderStepMs, state: 'drifting' },
      { advanceMs: ATTENTION.ladderStepMs, state: 'drifting' },
    ]);
    expect(fired.map((entry) => entry.spec.step)).toEqual([1, 2, 3, 4]);
    expect(fired.map((entry) => entry.spec.tactic)).toEqual([
      'prosody_name',
      'direct_question',
      'modality_switch',
      'micro_interaction',
    ]);
    expect(fired.every((entry) => entry.pause === false)).toBe(true);
  });

  it('skips the steps the parent switched off', () => {
    const { fired } = run(
      [
        { advanceMs: 0, state: 'drifting' },
        { advanceMs: threshold, state: 'drifting' },
        { advanceMs: ATTENTION.ladderStepMs, state: 'drifting' },
      ],
      { disabledSteps: [1, 3] },
    );
    expect(fired.map((entry) => entry.spec.step)).toEqual([2, 4]);
  });

  it('leaves the movement break out for a band that does not have one', () => {
    const { fired } = run([
      { advanceMs: 0, state: 'drifting' },
      { advanceMs: threshold, state: 'drifting' },
      { advanceMs: ATTENTION.ladderStepMs, state: 'drifting' },
      { advanceMs: ATTENTION.ladderStepMs, state: 'drifting' },
      { advanceMs: ATTENTION.ladderStepMs, state: 'drifting' },
      { advanceMs: ATTENTION.ladderStepMs, state: 'drifting' },
    ]);
    expect(fired.map((entry) => entry.spec.step)).toEqual([1, 2, 3, 4]);
    expect(BANDS['9-12'].movementBreak).toBe(false);
  });

  it('offers the movement break to 4-8, which has one', () => {
    const kidThreshold = BANDS['4-8'].attentionThresholdMs ?? 0;
    const { fired } = run(
      [
        { advanceMs: 0, state: 'drifting' },
        { advanceMs: kidThreshold, state: 'drifting' },
        { advanceMs: ATTENTION.ladderStepMs, state: 'drifting' },
        { advanceMs: ATTENTION.ladderStepMs, state: 'drifting' },
        { advanceMs: ATTENTION.ladderStepMs, state: 'drifting' },
        { advanceMs: ATTENTION.ladderStepMs, state: 'drifting' },
      ],
      { band: '4-8' },
    );
    expect(fired.map((entry) => entry.spec.step)).toEqual([1, 2, 3, 4, 5]);
  });

  it('resets the run when the learner comes back', () => {
    const { fired, state } = run([
      { advanceMs: 0, state: 'drifting' },
      { advanceMs: threshold, state: 'drifting' },
      { advanceMs: 1_000, state: 'attending' },
      { advanceMs: 0, state: 'drifting' },
      { advanceMs: threshold, state: 'drifting' },
    ]);
    // One rung before the recovery, then the clock restarts and rung 1 again.
    expect(fired.map((entry) => entry.spec.step)).toEqual([1, 1]);
    expect(state.recoveries).toBe(2);
  });

  it('pauses and notifies once away passes the pause window, and then goes quiet', () => {
    const { fired, state } = run([
      { advanceMs: 0, state: 'away' },
      { advanceMs: ATTENTION.pauseAfterAwayMs - 1, state: 'away' },
      { advanceMs: 1, state: 'away' },
      { advanceMs: ATTENTION.ladderStepMs, state: 'away' },
    ]);
    const pause = fired.filter((entry) => entry.pause);
    expect(pause).toHaveLength(1);
    expect(pause[0]?.spec.step).toBe(6);
    expect(pause[0]?.spec.tactic).toBe('pause_notify');
    expect(state.paused).toBe(true);
    // Nothing fires after the pause: the session has stopped.
    expect(fired[fired.length - 1]?.pause).toBe(true);
  });

  it('respects a parent who switched off the pause step', () => {
    const { fired, state } = run(
      [
        { advanceMs: 0, state: 'away' },
        { advanceMs: ATTENTION.pauseAfterAwayMs, state: 'away' },
      ],
      { disabledSteps: [6] },
    );
    expect(fired.some((entry) => entry.pause)).toBe(false);
    expect(state.paused).toBe(false);
  });
});
