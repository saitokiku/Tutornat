import type { Pad } from "@/practice/types";

// The arithmetic behind the touch pads, kept pure so the pads, the Runner and the tests agree on
// exactly which positions exist and how each one is written as a response for the checker.

export type LinePad = Extract<Pad, { kind: "number-line" }>;
export type BarPad = Extract<Pad, { kind: "fraction-bar" }>;
export type ClockPadSettings = Extract<Pad, { kind: "clock" }>;

export const DEFAULT_PADS = {
  line: { kind: "number-line", min: 0, max: 10, step: 1 } as LinePad,
  bar: { kind: "fraction-bar", maxParts: 12 } as BarPad,
  clock: { kind: "clock", stepMinutes: 5 } as ClockPadSettings,
};

const decimals = (x: number) => (String(x).split(".")[1] ?? "").length;
const minus = (s: string) => s.replace("-", "−");

export type LinePoint = {
  /** The exact value of the point. */
  value: number;
  /** What the pad sends to the checker: "-2", "0.5", or "3/4" on a fraction line. */
  response: string;
  /** How the point is shown: true minus sign, wholes as wholes ("1", "−3/4"). */
  label: string;
  /** Whole numbers on a fraction line; round values on a whole-number line. */
  major: boolean;
};

/**
 * Every point a learner can place on a number-line pad. With a denominator the points sit every
 * 1/denominator (fraction ticks); otherwise every `step`. Arithmetic is on integers so nothing drifts.
 */
export function linePoints(pad: LinePad): LinePoint[] {
  if (pad.denominator) {
    const d = pad.denominator;
    const from = Math.round(pad.min * d), to = Math.round(pad.max * d);
    return Array.from({ length: to - from + 1 }, (_, i) => {
      const n = from + i;
      const whole = n % d === 0;
      return { value: n / d, response: `${n}/${d}`, label: minus(whole ? String(n / d) : `${n}/${d}`), major: whole };
    });
  }
  const k = Math.max(decimals(pad.step), decimals(pad.min));
  const scale = 10 ** k;
  const from = Math.round(pad.min * scale), to = Math.round(pad.max * scale), step = Math.max(1, Math.round(pad.step * scale));
  const count = Math.floor((to - from) / step) + 1;
  const every = labelEvery(count);
  return Array.from({ length: count }, (_, i) => {
    const n = from + i * step;
    // An integer over a power of ten prints as its exact decimal ("0.3", not "0.30000000000000004").
    const text = String(n / scale);
    return { value: n / scale, response: text, label: minus(text), major: (((n / step) % every) + every) % every === 0 };
  });
}

/** Label every k-th point so a phone shows at most about 11 numbers. */
function labelEvery(count: number) {
  return [1, 2, 5, 10, 20, 25, 50, 100].find((k) => Math.ceil(count / k) <= 11) ?? 200;
}

/** The point closest to a tap at `fraction` (0 = left end of the line, 1 = right end). */
export const nearestPoint = (fraction: number, count: number) => Math.min(count - 1, Math.max(0, Math.round(fraction * (count - 1))));

/** Where the keyboard's first press lands: on 0 when the line has it, else at its left end. */
export function startPoint(points: LinePoint[]) {
  const zero = points.findIndex((p) => Math.abs(p.value) < 1e-12);
  return zero >= 0 ? zero : 0;
}

/** The index of a response already on the line (so a pad can show what was placed). */
export const pointOf = (points: LinePoint[], response: string) => points.findIndex((p) => p.response === response);

// ---------- clock ----------

/** "3:05": hour without a leading zero, two-digit minutes — the checker's clock convention. */
export const clockText = (h: number, m: number) => `${h}:${String(m).padStart(2, "0")}`;

const turn = (deg: number) => ((deg % 360) + 360) % 360;

/** Degrees clockwise from 12 o'clock for a point (x, y) around the center (cx, cy). */
export const angleAt = (x: number, y: number, cx: number, cy: number) => turn((Math.atan2(x - cx, cy - y) * 180) / Math.PI);

/** The hour (1–12) a tap at this angle points to. */
export function hourAt(deg: number) {
  const h = Math.round(turn(deg) / 30) % 12;
  return h === 0 ? 12 : h;
}

/** The minute a tap at this angle points to, snapped to the pad's step. */
export const minuteAt = (deg: number, step: number) => (step >= 60 ? 0 : (Math.round(turn(deg) / (6 * step)) * step) % 60);

/** One hour forward (+1) or back (−1), wrapping 12 → 1. */
export const stepHour = (h: number, by: number) => ((((h - 1 + by) % 12) + 12) % 12) + 1;

/** One step of minutes forward or back, wrapping at the hour. */
export const stepMinute = (m: number, by: number, step: number) => (step >= 60 ? 0 : ((((m + by * step) % 60) + 60) % 60));

/** Hand angles: the hour hand moves between hours as the minutes pass, like a real clock. */
export const handAngles = (h: number, m: number) => ({ hour: ((h % 12) + m / 60) * 30, minute: m * 6 });

// ---------- fraction bar ----------

export const barText = (shaded: number, parts: number) => `${shaded}/${parts}`;
