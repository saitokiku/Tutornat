/**
 * The rig's animation math (`components/tutor/avatar/rig-motion.ts`).
 *
 * These are the properties that decide whether the face reads as alive or as a
 * diagram, so they are asserted rather than eyeballed: the blink is asymmetric
 * and never a metronome, the mouth picks shapes and holds them, the springs
 * overshoot where they are supposed to and not where they are not, a reaction
 * anticipates before it lands, and reduced motion removes the vestibular
 * triggers without removing any state.
 *
 * Time is a parameter to every track here, so the suite steps it explicitly
 * rather than leaning on the scheduler; `vi.useFakeTimers` pins `Date.now` for
 * the tracks seeded from a clock.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BLINK_CLOSE_MS,
  BLINK_DOUBLE_GAP_MS,
  BLINK_MAX_GAP_MS,
  BLINK_MIN_GAP_MS,
  BLINK_OPEN_MS,
  BLINK_SHUT_MS,
  BLINK_TOTAL_MS,
  blinkOpenness,
  createBlinkTrack,
  createSaccadeTrack,
  createVisemeTrack,
  idleSway,
  reactionDrive,
  SACCADE_RANGE,
  selectViseme,
  SPRING_POP,
  SPRING_SETTLE,
  squashStretch,
  stepSpring,
  VISEME_ATTACK_DELTA,
  VISEME_MIN_HOLD_MS,
  VISEME_REDUCED_HOLD_MS,
  VISEME_SHAPES,
  type SpringState,
  type Viseme,
} from '@/components/tutor/avatar/rig-motion';

const START = 1_700_000_000_000;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(START);
});

afterEach(() => {
  vi.useRealTimers();
});

/** Walk a blink and return the first elapsed time at or under `level`. */
function timeToOpenness(level: number, from: number, to: number): number {
  for (let t = from; t <= to; t += 1) {
    if (blinkOpenness(t) <= level) return t - from;
  }
  return Infinity;
}

describe('the blink is asymmetric', () => {
  it('shuts far faster than it opens', () => {
    // Down to half-shut, then back up to half-open from the fully shut frame.
    const closing = timeToOpenness(0.5, 0, BLINK_CLOSE_MS);
    const shutAt = BLINK_CLOSE_MS + BLINK_SHUT_MS;
    let opening = Infinity;
    for (let t = shutAt; t <= BLINK_TOTAL_MS; t += 1) {
      if (blinkOpenness(t) >= 0.5) {
        opening = t - shutAt;
        break;
      }
    }
    expect(closing).toBeLessThan(BLINK_CLOSE_MS / 2);
    expect(opening).toBeGreaterThan(closing * 3);
    // The old rig used abs(cos(phase * PI)), whose halves are mirror images.
    expect(BLINK_OPEN_MS).toBeGreaterThan(BLINK_CLOSE_MS);
  });

  it('is fully open at the ends and fully shut in the middle', () => {
    expect(blinkOpenness(0)).toBe(1);
    expect(blinkOpenness(BLINK_CLOSE_MS + 1)).toBe(0);
    expect(blinkOpenness(BLINK_TOTAL_MS)).toBe(1);
    expect(blinkOpenness(BLINK_TOTAL_MS + 5_000)).toBe(1);
  });
});

describe('the blink cadence is never a metronome', () => {
  /** Collect the times at which the lid first leaves 1, over `span` ms. */
  function blinkStarts(rolls: number[], span: number, reduced = false): number[] {
    let index = 0;
    const random = () => rolls[index++ % rolls.length];
    const track = createBlinkTrack(0, random);
    const starts: number[] = [];
    let wasOpen = true;
    for (let t = 0; t <= span; t += 8) {
      const open = track.openness(t, reduced);
      if (wasOpen && open < 1) starts.push(t);
      wasOpen = open === 1;
    }
    return starts;
  }

  it('jitters the gap between blinks', () => {
    const starts = blinkStarts([0.05, 0.9, 0.4, 0.9, 0.95, 0.9, 0.2, 0.9], 40_000);
    expect(starts.length).toBeGreaterThan(2);
    const gaps = starts.slice(1).map((t, i) => t - starts[i]);
    const unique = new Set(gaps);
    expect(unique.size).toBeGreaterThan(1);
    for (const gap of gaps) {
      expect(gap).toBeGreaterThanOrEqual(BLINK_MIN_GAP_MS);
      expect(gap).toBeLessThanOrEqual(BLINK_MAX_GAP_MS + BLINK_TOTAL_MS + 16);
    }
  });

  it('sometimes blinks twice in quick succession', () => {
    // Every second roll is the double-blink coin; 0 always takes the branch.
    const starts = blinkStarts([0.5, 0], 30_000);
    const gaps = starts.slice(1).map((t, i) => t - starts[i]);
    expect(gaps.some((gap) => gap <= BLINK_DOUBLE_GAP_MS + BLINK_TOTAL_MS + 16)).toBe(true);
  });

  it('never doubles under reduced motion, and waits longer between blinks', () => {
    const normal = blinkStarts([0.5, 0], 40_000, false);
    const reduced = blinkStarts([0.5, 0], 40_000, true);
    expect(reduced.length).toBeLessThan(normal.length);
    const gaps = reduced.slice(1).map((t, i) => t - reduced[i]);
    for (const gap of gaps) expect(gap).toBeGreaterThan(BLINK_DOUBLE_GAP_MS + BLINK_TOTAL_MS);
  });

  it('blinks on demand when a reaction lands', () => {
    const track = createBlinkTrack(0, () => 0.5);
    expect(track.openness(10, false)).toBe(1);
    track.trigger(10);
    expect(track.openness(10 + BLINK_CLOSE_MS / 2, false)).toBeLessThan(0.5);
  });
});

describe('viseme selection', () => {
  it('maps quiet to closed and loud to a wide shape', () => {
    expect(selectViseme(0, 0)).toBe<Viseme>('closed');
    expect(selectViseme(0.02, 0)).toBe<Viseme>('closed');
    expect(selectViseme(0.18, 0)).toBe<Viseme>('eh');
    expect(selectViseme(0.4, 0)).toBe<Viseme>('oh');
    expect(selectViseme(0.9, 0)).toBe<Viseme>('ah');
  });

  it('uses the rate of change to tell a jaw drop from a held vowel', () => {
    const level = 0.4;
    expect(selectViseme(level, 0)).toBe<Viseme>('oh');
    expect(selectViseme(level, VISEME_ATTACK_DELTA + 0.01)).toBe<Viseme>('ah');
  });

  it('gives the four shapes genuinely different geometry', () => {
    const { closed, eh, oh, ah } = VISEME_SHAPES;
    expect(closed.height).toBe(0);
    expect(eh.height).toBeGreaterThan(closed.height);
    expect(oh.height).toBeGreaterThan(eh.height);
    expect(ah.height).toBeGreaterThan(oh.height);
    // `oh` is the rounded one: narrower than the shape either side of it.
    expect(oh.width).toBeLessThan(eh.width);
    expect(oh.width).toBeLessThan(ah.width);
  });
});

describe('the mouth holds each shape', () => {
  /** Drive a track at 60 fps with a per-frame level and record the shapes. */
  function run(levels: number[], reduced = false): { shape: Viseme; at: number }[] {
    const track = createVisemeTrack(0);
    const seen: { shape: Viseme; at: number }[] = [];
    levels.forEach((level, frame) => {
      const at = frame * 16;
      const shape = track.step(at, level, reduced);
      if (seen.length === 0 || seen[seen.length - 1].shape !== shape) seen.push({ shape, at });
    });
    return seen;
  }

  it('cannot strobe when the amplitude alternates every frame', () => {
    const levels = Array.from({ length: 120 }, (_, i) => (i % 2 === 0 ? 0 : 0.95));
    const changes = run(levels);
    for (let i = 1; i < changes.length; i += 1) {
      expect(changes[i].at - changes[i - 1].at).toBeGreaterThanOrEqual(VISEME_MIN_HOLD_MS);
    }
    // 120 frames is 1.92 s; at a 90 ms floor that is at most ~22 changes, not 120.
    expect(changes.length).toBeLessThan(levels.length / 4);
  });

  it('holds longer under reduced motion', () => {
    const levels = Array.from({ length: 240 }, (_, i) => (i % 2 === 0 ? 0 : 0.95));
    const normal = run(levels, false);
    const reduced = run(levels, true);
    expect(reduced.length).toBeLessThan(normal.length);
    for (let i = 1; i < reduced.length; i += 1) {
      expect(reduced[i].at - reduced[i - 1].at).toBeGreaterThanOrEqual(VISEME_REDUCED_HOLD_MS);
    }
  });

  it('still reaches every shape over a real speech envelope', () => {
    const track = createVisemeTrack(0);
    const shapes = new Set<Viseme>();
    for (let frame = 0; frame < 400; frame += 1) {
      const t = frame * 16;
      // Syllables: a fast attack to a level that varies, then a decay to silence.
      const phase = (t % 220) / 220;
      const peak = [0.9, 0.3, 0.45, 0.75, 0][Math.floor(t / 220) % 5];
      const level = phase < 0.25 ? (peak * phase) / 0.25 : peak * (1 - (phase - 0.25) / 0.75);
      shapes.add(track.step(t, level, false));
    }
    expect(shapes).toEqual(new Set<Viseme>(['closed', 'eh', 'oh', 'ah']));
  });

  it('starts closed and closes again when the tutor stops talking', () => {
    const track = createVisemeTrack(0);
    expect(track.current()).toBe<Viseme>('closed');
    for (let t = 0; t < 600; t += 16) track.step(t, 0.9, false);
    expect(track.current()).toBe<Viseme>('ah');
    for (let t = 600; t < 1_200; t += 16) track.step(t, 0, false);
    expect(track.current()).toBe<Viseme>('closed');
  });
});

describe('springs', () => {
  function settleTo(
    target: number,
    spring: { stiffness: number; damping: number },
    frames = 200,
  ): number[] {
    let state: SpringState = { value: 0, velocity: 0 };
    const trace: number[] = [];
    for (let i = 0; i < frames; i += 1) {
      state = stepSpring(state, target, spring, 16);
      trace.push(state.value);
    }
    return trace;
  }

  it('the pop spring overshoots and comes back', () => {
    const trace = settleTo(1, SPRING_POP);
    expect(Math.max(...trace)).toBeGreaterThan(1.02);
    expect(trace[trace.length - 1]).toBeCloseTo(1, 2);
  });

  it('the settle spring arrives without ringing', () => {
    const trace = settleTo(1, SPRING_SETTLE);
    expect(Math.max(...trace)).toBeLessThanOrEqual(1.001);
    expect(trace[trace.length - 1]).toBeCloseTo(1, 2);
  });

  it('never moves linearly: the first frame travels less than the tenth', () => {
    const trace = settleTo(1, SPRING_SETTLE);
    const first = trace[0];
    const tenth = trace[9] - trace[8];
    expect(first).toBeLessThan(tenth);
  });

  it('snaps to the target under reduced motion', () => {
    const stepped = stepSpring({ value: 0, velocity: 5 }, 1, SPRING_POP, 16, true);
    expect(stepped).toEqual({ value: 1, velocity: 0 });
  });

  it('clamps a long frame so a backgrounded tab cannot fling the face', () => {
    const long = stepSpring({ value: 0, velocity: 0 }, 1, SPRING_POP, 4_000);
    const capped = stepSpring({ value: 0, velocity: 0 }, 1, SPRING_POP, 32);
    expect(long).toEqual(capped);
  });
});

describe('a reaction anticipates, overshoots, and releases', () => {
  const HOLD = 1_400;

  it('moves the wrong way before it lands', () => {
    const early = reactionDrive(55, HOLD);
    expect(early).toBeLessThan(0);
    expect(early).toBeGreaterThan(-0.4);
  });

  it('passes its target and settles on it', () => {
    let peak = -Infinity;
    for (let t = 0; t < HOLD; t += 5) peak = Math.max(peak, reactionDrive(t, HOLD));
    expect(peak).toBeGreaterThan(1.05);
    expect(reactionDrive(HOLD - 5, HOLD)).toBeCloseTo(1, 1);
  });

  it('returns to rest after the hold and stays there', () => {
    expect(reactionDrive(HOLD + 150, HOLD)).toBeGreaterThan(0);
    expect(reactionDrive(HOLD + 150, HOLD)).toBeLessThan(1.06);
    expect(reactionDrive(HOLD + 5_000, HOLD)).toBe(0);
  });

  it('drops the anticipation and the overshoot under reduced motion', () => {
    for (let t = 0; t < HOLD; t += 5) {
      const value = reactionDrive(t, HOLD, true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
    // The expression is still fully expressed; only the way it arrives changed.
    expect(reactionDrive(200, HOLD, true)).toBe(1);
    expect(reactionDrive(HOLD + 5_000, HOLD, true)).toBe(0);
  });
});

describe('idle life', () => {
  it('never repeats inside a session', () => {
    // Three non-harmonic periods: the combined signal must not recur at the
    // shortest of them, or the loop would be visible.
    const first = idleSway(0, false);
    const later = idleSway(3_700, false);
    expect(later.tilt).not.toBeCloseTo(first.tilt, 2);
    expect(later.sway).not.toBeCloseTo(first.sway, 2);
  });

  it('stays small enough to read as breathing rather than fidgeting', () => {
    for (let t = 0; t < 30_000; t += 97) {
      const sway = idleSway(t, false);
      expect(Math.abs(sway.bob)).toBeLessThanOrEqual(2.2);
      expect(Math.abs(sway.sway)).toBeLessThanOrEqual(1.8);
      expect(Math.abs(sway.tilt)).toBeLessThanOrEqual(2.1);
    }
  });

  it('is switched off entirely under reduced motion', () => {
    for (let t = 0; t < 10_000; t += 313) {
      expect(idleSway(t, true)).toEqual({ bob: 0, sway: 0, tilt: 0, breath: 0 });
    }
  });
});

describe('micro-saccades', () => {
  it('hold a fixation, then jump, and stay small', () => {
    let index = 0;
    const rolls = [0.1, 0.8, 0.2, 0.6, 0.3, 0.9, 0.4, 0.1, 0.7];
    const track = createSaccadeTrack(0, () => rolls[index++ % rolls.length]);
    const samples: string[] = [];
    for (let t = 0; t < 6_000; t += 16) {
      const at = track.sample(t, false);
      expect(Math.abs(at.x)).toBeLessThanOrEqual(SACCADE_RANGE);
      expect(Math.abs(at.y)).toBeLessThanOrEqual(SACCADE_RANGE);
      const key = `${at.x.toFixed(4)},${at.y.toFixed(4)}`;
      if (samples[samples.length - 1] !== key) samples.push(key);
    }
    // Several distinct fixations over six seconds, not a new one every frame.
    expect(samples.length).toBeGreaterThan(2);
    expect(samples.length).toBeLessThan(6_000 / 16 / 8);
  });

  it('is switched off under reduced motion', () => {
    const track = createSaccadeTrack(0, () => 0.5);
    for (let t = 0; t < 5_000; t += 101) {
      expect(track.sample(t, true)).toEqual({ x: 0, y: 0 });
    }
  });
});

describe('squash and stretch', () => {
  it('trades width for height rather than scaling the head', () => {
    const stretched = squashStretch(1, false);
    expect(stretched.sy).toBeGreaterThan(1);
    expect(stretched.sx).toBeLessThan(1);
    const squashed = squashStretch(-1, false);
    expect(squashed.sy).toBeLessThan(1);
    expect(squashed.sx).toBeGreaterThan(1);
  });

  it('is switched off under reduced motion', () => {
    expect(squashStretch(1.4, true)).toEqual({ sx: 1, sy: 1 });
  });
});
