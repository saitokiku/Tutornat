/**
 * The rig's animation math, with no DOM in it.
 *
 * Everything that makes the face read as alive rather than as a diagram lives
 * here as a pure function or a small deterministic track, so it can be tested
 * under fake timers and reused by whichever renderer is mounted. `svg-rig.ts`
 * owns the geometry; this file owns the timing.
 *
 * The principles it encodes, in the order they matter for appeal:
 *
 * 1. **Asymmetric timing.** A lid snaps shut in about 80 ms and peels open
 *    over about 150 ms. The old rig used `abs(cos(phase * PI))`, which is
 *    perfectly symmetric — a classic uncanny signal, because no real eyelid
 *    closes as slowly as it opens.
 * 2. **No metronomes.** Blink gaps are jittered over a wide range and about a
 *    fifth of them are doubles, so the cadence never resolves into a beat.
 * 3. **Shapes, not levels.** Speech is drawn as four mouth shapes chosen from
 *    amplitude and its rate of change, each held a minimum time so the mouth
 *    cannot strobe. An amplitude-driven opening reads as a flapping hole.
 * 4. **Overshoot, not approach.** Poses arrive on an under-damped spring and
 *    settle back; big reactions are preceded by a small move in the opposite
 *    direction (anticipation). Linear approach is what makes motion read as
 *    mechanical.
 * 5. **Never still, never fidgeting.** Breathing, sway, and tilt run on three
 *    mutually non-harmonic periods so the idle loop never repeats visibly, and
 *    the eyes make small saccades between held fixations.
 *
 * Reduced motion is a parameter to each track rather than a branch around
 * them: the vestibular triggers (sway, breathing, saccades, squash, overshoot)
 * go to zero, and the tracks that carry information (blink, viseme, pose) keep
 * running with the springiness removed. State is information, not decoration.
 */

// ---------------------------------------------------------------------------
// Small numeric helpers
// ---------------------------------------------------------------------------

export function clamp(value: number, low: number, high: number): number {
  if (!Number.isFinite(value)) return low;
  return value < low ? low : value > high ? high : value;
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

export function easeOutCubic(t: number): number {
  const u = 1 - clamp01(t);
  return 1 - u * u * u;
}

export function easeInOutSine(t: number): number {
  return 0.5 - Math.cos(Math.PI * clamp01(t)) / 2;
}

// ---------------------------------------------------------------------------
// Blink
// ---------------------------------------------------------------------------

/** The lid is ballistic on the way down. */
export const BLINK_CLOSE_MS = 80;
/** It rests shut for a frame or two. */
export const BLINK_SHUT_MS = 24;
/** It peels open again at about half that speed. */
export const BLINK_OPEN_MS = 150;
export const BLINK_TOTAL_MS = BLINK_CLOSE_MS + BLINK_SHUT_MS + BLINK_OPEN_MS;

export const BLINK_MIN_GAP_MS = 2_200;
export const BLINK_MAX_GAP_MS = 7_400;
export const BLINK_DOUBLE_CHANCE = 0.22;
export const BLINK_DOUBLE_GAP_MS = 120;
/** Reduced motion keeps blinking — it is not a vestibular trigger — but calmer. */
export const BLINK_REDUCED_SCALE = 1.8;

/**
 * Lid openness during one blink: 1 is wide open, 0 is shut. The close and the
 * open use different durations *and* different curves, so the two halves are
 * not mirror images of each other.
 */
export function blinkOpenness(elapsed: number): number {
  if (elapsed <= 0) return 1;
  if (elapsed < BLINK_CLOSE_MS) return 1 - easeOutCubic(elapsed / BLINK_CLOSE_MS);
  const afterClose = elapsed - BLINK_CLOSE_MS;
  if (afterClose < BLINK_SHUT_MS) return 0;
  const opening = (afterClose - BLINK_SHUT_MS) / BLINK_OPEN_MS;
  if (opening >= 1) return 1;
  return easeInOutSine(opening);
}

export interface BlinkTrack {
  /** Lid openness at `now`, scheduling the next blink as it goes. */
  openness(now: number, reduced: boolean): number;
  /** Blink on purpose — a reaction lands better with a blink under it. */
  trigger(now: number): void;
}

/**
 * A self-scheduling blink. `random` is injected so a test can pin the cadence
 * and so two rigs on one screen never blink in unison.
 */
export function createBlinkTrack(now: number, random: () => number): BlinkTrack {
  let nextAt = now + gap(random(), false);
  let startedAt = 0;
  let doublePending = false;

  function gap(roll: number, reduced: boolean): number {
    const span = BLINK_MAX_GAP_MS - BLINK_MIN_GAP_MS;
    const wait = BLINK_MIN_GAP_MS + clamp01(roll) * span;
    return reduced ? wait * BLINK_REDUCED_SCALE : wait;
  }

  return {
    openness(t, reduced) {
      if (startedAt === 0 && t >= nextAt) {
        startedAt = t;
        doublePending = !reduced && random() < BLINK_DOUBLE_CHANCE;
      }
      if (startedAt === 0) return 1;
      const elapsed = t - startedAt;
      if (elapsed >= BLINK_TOTAL_MS) {
        startedAt = 0;
        nextAt = doublePending ? t + BLINK_DOUBLE_GAP_MS : t + gap(random(), reduced);
        doublePending = false;
        return 1;
      }
      return blinkOpenness(elapsed);
    },
    trigger(t) {
      if (startedAt !== 0) return;
      startedAt = t;
      doublePending = false;
    },
  };
}

// ---------------------------------------------------------------------------
// Visemes
// ---------------------------------------------------------------------------

export type Viseme = 'closed' | 'eh' | 'oh' | 'ah';

export const VISEME_CLOSED_MAX = 0.07;
export const VISEME_SMALL_MAX = 0.26;
export const VISEME_WIDE_MIN = 0.56;
/** Rise per 16.7 ms frame that counts as a jaw drop rather than a swell. */
export const VISEME_ATTACK_DELTA = 0.085;
export const VISEME_MIN_HOLD_MS = 90;
export const VISEME_REDUCED_HOLD_MS = 150;

/**
 * Which of four shapes the mouth takes. Amplitude alone gives one opening
 * hole; amplitude plus its rate of change distinguishes a jaw that drops on a
 * hard onset (`ah`) from a vowel held at the same level (`oh`).
 */
export function selectViseme(level: number, delta: number): Viseme {
  const value = clamp01(level);
  if (value < VISEME_CLOSED_MAX) return 'closed';
  if (value < VISEME_SMALL_MAX) return 'eh';
  if (value >= VISEME_WIDE_MIN) return 'ah';
  return delta >= VISEME_ATTACK_DELTA ? 'ah' : 'oh';
}

export interface VisemeTrack {
  /** The shape to draw at `now`, never changing faster than the minimum hold. */
  step(now: number, level: number, reduced: boolean): Viseme;
  current(): Viseme;
}

export function createVisemeTrack(now = 0): VisemeTrack {
  let shape: Viseme = 'closed';
  let heldSince = now;
  let lastLevel = 0;
  let lastAt = now;

  return {
    step(t, level, reduced) {
      const dt = Math.max(1, Math.min(120, t - lastAt));
      const value = clamp01(level);
      // Normalise the rise to a 60 fps frame so the attack test does not
      // change meaning when frames are late.
      const delta = ((value - lastLevel) * 16.7) / dt;
      lastLevel = value;
      lastAt = t;
      const candidate = selectViseme(value, delta);
      const hold = reduced ? VISEME_REDUCED_HOLD_MS : VISEME_MIN_HOLD_MS;
      if (candidate !== shape && t - heldSince >= hold) {
        shape = candidate;
        heldSince = t;
      }
      return shape;
    },
    current() {
      return shape;
    },
  };
}

/** Mouth geometry per shape, in viewBox units. `oh` is narrow and tall; `ah` is both. */
export interface MouthShape {
  width: number;
  height: number;
}

export const VISEME_SHAPES: Readonly<Record<Viseme, MouthShape>> = {
  closed: { width: 48, height: 0 },
  eh: { width: 54, height: 9 },
  oh: { width: 34, height: 21 },
  ah: { width: 60, height: 27 },
};

// ---------------------------------------------------------------------------
// Springs
// ---------------------------------------------------------------------------

export interface SpringState {
  value: number;
  velocity: number;
}

/** Under-damped: reaches the target and passes it before settling. */
export const SPRING_POP = { stiffness: 190, damping: 14 } as const;
/** Critically damped: arrives without ringing. Gaze and brows use this. */
export const SPRING_SETTLE = { stiffness: 130, damping: 23 } as const;

/**
 * One semi-implicit Euler step. `dtMs` is clamped so a backgrounded tab
 * cannot integrate a single 4-second frame and fling the face off-screen.
 */
export function stepSpring(
  state: SpringState,
  target: number,
  spring: { stiffness: number; damping: number },
  dtMs: number,
  reduced = false,
): SpringState {
  if (reduced) return { value: target, velocity: 0 };
  const dt = Math.min(Math.max(dtMs, 0), 32) / 1000;
  const accel = (target - state.value) * spring.stiffness - state.velocity * spring.damping;
  const velocity = state.velocity + accel * dt;
  return { value: state.value + velocity * dt, velocity };
}

// ---------------------------------------------------------------------------
// Reactions: anticipation, overshoot, settle, release
// ---------------------------------------------------------------------------

export const REACTION_ANTICIPATE_MS = 110;
export const REACTION_ANTICIPATE_DEPTH = -0.3;
export const REACTION_RISE_MS = 260;
export const REACTION_RELEASE_MS = 320;

/**
 * How hard a reaction is driving at `elapsed`, on a 0-1 scale that dips
 * negative first. The dip is anticipation: the face gathers slightly the wrong
 * way before the expression lands, which is what makes the landing read as
 * intent rather than as a value changing. After `holdMs` it releases back to
 * rest instead of snapping.
 */
export function reactionDrive(elapsed: number, holdMs: number, reduced = false): number {
  if (elapsed <= 0 || elapsed >= reactionTotalMs(holdMs, reduced)) return 0;
  if (reduced) return elapsed < holdMs ? 1 : 1 - clamp01((elapsed - holdMs) / REACTION_RELEASE_MS);
  if (elapsed < REACTION_ANTICIPATE_MS) {
    return REACTION_ANTICIPATE_DEPTH * Math.sin((Math.PI * elapsed) / REACTION_ANTICIPATE_MS);
  }
  const since = elapsed - REACTION_ANTICIPATE_MS;
  if (since < holdMs) return settle(since);
  const out = clamp01((since - holdMs) / REACTION_RELEASE_MS);
  return settle(holdMs) * (1 - easeInOutSine(out));
}

/** How long a whole reaction lasts, so the caller knows when to drop the pose. */
export function reactionTotalMs(holdMs: number, reduced = false): number {
  return (reduced ? 0 : REACTION_ANTICIPATE_MS) + holdMs + REACTION_RELEASE_MS;
}

/** A damped oscillation that starts at 0, overshoots 1, and converges on it. */
function settle(since: number): number {
  const u = since / REACTION_RISE_MS;
  return 1 - Math.exp(-4.2 * u) * Math.cos(6.2 * u);
}

// ---------------------------------------------------------------------------
// Micro-saccades
// ---------------------------------------------------------------------------

export const SACCADE_MIN_MS = 280;
export const SACCADE_MAX_MS = 1_150;
export const SACCADE_RANGE = 0.14;

export interface SaccadeOffset {
  x: number;
  y: number;
}

export interface SaccadeTrack {
  /** A held fixation offset that jumps every few hundred milliseconds. */
  sample(now: number, reduced: boolean): SaccadeOffset;
}

export function createSaccadeTrack(now: number, random: () => number): SaccadeTrack {
  let until = now;
  let offset: SaccadeOffset = { x: 0, y: 0 };
  return {
    sample(t, reduced) {
      if (reduced) return { x: 0, y: 0 };
      if (t >= until) {
        until = t + SACCADE_MIN_MS + random() * (SACCADE_MAX_MS - SACCADE_MIN_MS);
        offset = {
          x: (random() * 2 - 1) * SACCADE_RANGE,
          y: (random() * 2 - 1) * SACCADE_RANGE * 0.7,
        };
      }
      return offset;
    },
  };
}

// ---------------------------------------------------------------------------
// Idle life
// ---------------------------------------------------------------------------

export interface IdleSway {
  /** Chest-and-head rise, in viewBox units. */
  bob: number;
  /** Weight shift left and right, in viewBox units. */
  sway: number;
  /** Head tilt, in degrees. */
  tilt: number;
  /** -1 to 1, the breath phase itself, for the shoulders and the squash. */
  breath: number;
}

/** Three mutually non-harmonic periods, so the loop never resolves. */
const BREATH_MS = 3_700;
const SWAY_MS = 7_300;
const TILT_MS = 11_100;
const TILT_MINOR_MS = 5_300;

export function idleSway(t: number, reduced: boolean): IdleSway {
  if (reduced) return { bob: 0, sway: 0, tilt: 0, breath: 0 };
  const breath = Math.sin((2 * Math.PI * t) / BREATH_MS);
  return {
    breath,
    bob: breath * 2.1,
    sway: Math.sin((2 * Math.PI * t) / SWAY_MS) * 1.7,
    tilt:
      Math.sin((2 * Math.PI * t) / TILT_MS) * 1.5 +
      Math.sin((2 * Math.PI * t) / TILT_MINOR_MS) * 0.5,
  };
}

// ---------------------------------------------------------------------------
// Squash and stretch
// ---------------------------------------------------------------------------

export interface Scale {
  sx: number;
  sy: number;
}

/**
 * Volume-preserving squash: a positive drive stretches the head upward and
 * narrows it, a negative one flattens and widens it. Anchored at the chin by
 * the caller, so the head compresses onto the neck rather than about its
 * middle.
 */
export function squashStretch(drive: number, reduced: boolean): Scale {
  if (reduced) return { sx: 1, sy: 1 };
  const d = clamp(drive, -1.4, 1.4);
  return { sx: 1 - d * 0.045, sy: 1 + d * 0.055 };
}
