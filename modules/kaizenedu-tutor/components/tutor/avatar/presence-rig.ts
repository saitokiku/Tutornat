/**
 * The abstract presence: the tutor as a luminous form, not a face.
 *
 * ## Why this exists
 *
 * `svg-rig.ts` is a good character rig — anatomical eyes, asymmetric blinks,
 * viseme mouth shapes, spring easing — and it was still read as "weird" twice.
 * That is not a bug list. A procedurally drawn face invites a comparison to a
 * real one every time a learner looks at it, and without an illustrator we
 * cannot win that comparison. The way out is to stop inviting it.
 *
 * An abstract presence cannot be creepy, because there is nothing to compare
 * it to. Voice products solve this constantly: a form that listens, considers
 * and speaks carries presence without a single human feature. This is that
 * form, and it is the default (`config.ts`, `resolvePresence`). The character
 * rig is not deleted — it stays selectable so the two can be tested with real
 * children, and a commissioned Rive character can still replace either one.
 *
 * ## What it is
 *
 * A soft, slightly irregular luminous form — closer to a river stone lit from
 * inside than to a circle — sitting in a warm aura. A perfect circle reads as
 * a button or a spinner; the seven-lobed spline here never quite resolves into
 * a shape you can name, which is what makes it read as alive.
 *
 * Each state is a different *structure*, not a different animation, so it
 * survives `prefers-reduced-motion` and still reads across a room:
 *
 * - `idle`          medium form, faint aura, breathing on three non-harmonic
 *                   periods so the loop never visibly repeats.
 * - `listening`     the form opens — the largest footprint of any state — and
 *                   solid rings travel *outward* from it. Outward is
 *                   receptive: the room is being let in. Their reach is lifted
 *                   by whatever level arrives on `setMouth`.
 * - `thinking`      the exact inverse, so the two can never be confused: the
 *                   form contracts and its edge facets, the aura pulls in, and
 *                   broken rings gather *inward*. One mote circles outside the
 *                   form and **rests** between moves. A constant-velocity
 *                   rotation is a loading spinner; a mote that hesitates reads
 *                   as considering. This is the state that covers end of
 *                   speech to first audio, so it has to read as a beat.
 * - `speaking`      the real amplitude envelope pushes the lobes out by
 *                   different weights, so the form *deforms* with the voice
 *                   instead of scaling uniformly, and a core lights up inside
 *                   it. Rings are emitted on syllable onsets — a rise in
 *                   level, not a timer — so they are tied to the voice rather
 *                   than decorating it.
 * - `at-whiteboard` the whole form leans toward the board and stretches along
 *                   that axis, and the light inside it slides to the leading
 *                   edge. `setGaze` drives this at any time, so the presence
 *                   stays connected to what is happening.
 * - `reacting`      a warm bloom and a lift for a correct check; a settle, a
 *                   contraction and one gathering ring for "not quite". Both
 *                   land through `reactionDrive`, so they anticipate before
 *                   they arrive. Proportionate: no confetti, no sparkles.
 *
 * ## What it deliberately does not have
 *
 * No discrete highlight inside the form. A single bright dot in a blob reads
 * as a cyclops eye, and two read as a face — the whole problem we are walking
 * away from. Attention is carried by the *focal point of the gradient*, which
 * slides with gaze and micro-saccades: a lighting cue, never a feature.
 *
 * ## Reduced motion
 *
 * Motion cannot carry state when there is no motion, so every state is
 * distinguishable from its static pose alone: footprint (listening largest,
 * thinking smallest), ring geometry (two solid rings outside for listening,
 * one broken ring gathered close for thinking), the lit core for speaking, the
 * off-centre lean for the whiteboard. Springs snap to their target, the
 * breathing, sway and saccades go to zero, and the rings are drawn at fixed
 * radii instead of travelling.
 *
 * ## Colour
 *
 * Warm, not clinical: a lit-filament centre in the warm neutrals of the brand
 * palette, an aqua body, and a rim in the brand hue (teal, ≈195–205 OKLCH).
 * Unlike the character rig, this one *does* follow the theme — it is light, and
 * light has to be read against its ground, so lightness and chroma shift
 * between light and dark surfaces while the hue family stays put. The palette
 * is injected as custom properties scoped to this instance's id, so two rigs
 * on a page never fight and nothing leaks into the rest of the document.
 */
import type { ReactionKind } from '@/lib/tutor/contracts';

import type { AvatarDriver, AvatarGaze, AvatarInputs, AvatarState } from './driver';
import { CENTER_GAZE, expressionFor, REACTION_MS } from './driver';
import {
  clamp,
  clamp01,
  createSaccadeTrack,
  easeInOutSine,
  easeOutCubic,
  idleSway,
  reactionDrive,
  reactionTotalMs,
  SPRING_POP,
  SPRING_SETTLE,
  stepSpring,
  type SpringState,
} from './rig-motion';

const SVG_NS = 'http://www.w3.org/2000/svg';

// --- Geometry, in viewBox units --------------------------------------------

const VIEW = 240;
const CX = 120;
const CY = 120;

/**
 * The form's outline is a closed spline through seven lobes at deliberately
 * uneven radii. Seven is prime, so no pair of lobes sits opposite another and
 * the silhouette never reads as symmetric; the uneven radii mean it is already
 * an organic shape before a single frame of animation runs.
 */
const LOBE_RADIUS = [1.015, 0.918, 1.072, 0.945, 1.045, 0.9, 1.004] as const;
/** Non-harmonic wobble periods, so the edge never breathes in unison. */
const LOBE_PERIOD = [5_300, 6_100, 4_700, 7_300, 5_900, 6_700, 4_300] as const;
const LOBE_PHASE = [0, 1.9, 3.4, 5.1, 0.7, 2.6, 4.3] as const;
/** How hard each lobe is pushed by the voice. Even weights would be a scale. */
const LOBE_VOICE = [1, 0.52, 0.86, 0.34, 0.95, 0.61, 0.74] as const;
const LOBE_COUNT = LOBE_RADIUS.length;

/** The lobes start a little off the vertical, so the form is not upright. */
const FORM_ROTATION = -0.34;
/** Edge wobble at rest, as a fraction of the radius. */
const WOBBLE_BASE = 0.055;
/** How far the voice pushes the most-weighted lobe out, as a fraction. */
const VOICE_REACH = 0.26;
/** How far the form travels toward the whiteboard at full gaze. */
const LEAN_PX = 26;
/**
 * Aura radius, as a multiple of the form radius. Deliberately tight: a wide
 * pale wash reads as a soft-focus smudge and disappears on a light surface,
 * where a halo that hugs the form reads as light coming off something solid.
 */
const AURA_SPAN = 1.62;
/**
 * The rim light runs across the two lobes nearest the light, so it travels
 * around the form as attention moves. It is what gives the form a surface — a
 * flat fill reads as a printed shape — and it is a specular cue, never a
 * feature.
 */
const HIGHLIGHT_INSET = 0.93;
/** Where the light comes from when nothing is asking for it: upper left. */
const LIGHT_REST = { x: -0.24, y: -0.3 } as const;

/**
 * Which lobe the light falls on. Used to place the rim light, and exported so
 * a test can check that it follows the gaze rather than sitting still.
 */
export function litLobe(dx: number, dy: number): number {
  const target = Math.atan2(dy, dx);
  let best = 0;
  let bestGap = Infinity;
  for (let i = 0; i < LOBE_COUNT; i += 1) {
    const angle = FORM_ROTATION + (i / LOBE_COUNT) * Math.PI * 2;
    const gap = Math.abs(Math.atan2(Math.sin(target - angle), Math.cos(target - angle)));
    if (gap < bestGap) {
      bestGap = gap;
      best = i;
    }
  }
  return best;
}

// --- Rings -----------------------------------------------------------------

const RING_POOL = 4;
const RING_OUT_MS = 1_500;
const RING_IN_MS = 1_250;
/** A ring is emitted when the level rises this much above the recent floor. */
export const ONSET_RISE = 0.13;
/** …and no sooner than this after the last one, so a loud vowel is one ring. */
export const ONSET_REFRACTORY_MS = 190;
/** How long the floor takes to leak back to nothing after a peak. */
export const ONSET_FLOOR_MS = 500;
/** The listening cadence: unhurried, and slower than a resting heart rate. */
export const LISTEN_RING_MS = 1_600;
export const THINK_RING_MS = 1_150;

// --- The thinking mote -----------------------------------------------------

/** How long one move around the form takes… */
export const MOTE_TRAVEL_MS = 620;
/** …and how long it rests before the next one. The rest is the whole point. */
export const MOTE_REST_MS = 380;
/** Degrees per move. Not a divisor of 360, so it never retraces its steps. */
export const MOTE_STEP_DEG = 74;
const MOTE_ORBIT = 1.38;

/**
 * Where the mote sits at `t`. It accelerates into a move, decelerates out of
 * it, and then holds — which is what separates "considering" from "loading".
 */
export function motePosition(t: number, reduced: boolean): number {
  if (reduced) return 214;
  const cycle = MOTE_TRAVEL_MS + MOTE_REST_MS;
  const step = Math.floor(t / cycle);
  const phase = t - step * cycle;
  const eased = phase < MOTE_TRAVEL_MS ? easeInOutSine(phase / MOTE_TRAVEL_MS) : 1;
  return 214 + (step + eased) * MOTE_STEP_DEG;
}

// --- Onset detection -------------------------------------------------------

export interface OnsetTrack {
  /** True on the frame a syllable starts. Falls silent during a held vowel. */
  step(now: number, level: number): boolean;
}

/**
 * A syllable onset is a rise, not a threshold: the level has to climb
 * `ONSET_RISE` above a floor that leaks away over `ONSET_FLOOR_MS`, and the
 * last onset has to be `ONSET_REFRACTORY_MS` old. Without the decaying floor a
 * loud sentence emits one ring and then nothing; without the refractory a
 * single word emits five.
 *
 * The floor decays *before* the comparison, not after it. Testing against the
 * previous peak means a word that follows a pause never clears the bar, and
 * the tutor speaks a whole sentence with one ring at the front of it.
 */
export function createOnsetTrack(now = 0): OnsetTrack {
  let floor = 0;
  let lastAt = -Infinity;
  let lastClock = now;
  return {
    step(t, level) {
      const dt = clamp(t - lastClock, 0, 200);
      lastClock = t;
      const value = clamp01(level);
      floor = Math.max(0, floor - (dt / ONSET_FLOOR_MS) * floor);
      const fired = value - floor >= ONSET_RISE && t - lastAt >= ONSET_REFRACTORY_MS;
      if (fired) lastAt = t;
      if (value > floor) floor = value;
      return fired;
    },
  };
}

// --- Palette ---------------------------------------------------------------

/**
 * Injected once per instance and scoped to its id. `.dark` is how the app
 * switches themes (`lib/hooks/use-theme.tsx`), and the media query covers a
 * host that never mounts the shell — the eval sheet, a screenshot run.
 */
function paletteCss(selector: string): string {
  return `
${selector} {
  --ntp-hot: oklch(0.975 0.045 88);
  --ntp-warm: oklch(0.895 0.068 92);
  --ntp-body: oklch(0.665 0.145 194);
  --ntp-rim: oklch(0.44 0.105 214);
  --ntp-aura: oklch(0.56 0.12 200);
  --ntp-halo: oklch(0.82 0.075 82);
}
.dark ${selector} {
  --ntp-hot: oklch(0.985 0.05 88);
  --ntp-warm: oklch(0.9 0.075 90);
  --ntp-body: oklch(0.7 0.15 192);
  --ntp-rim: oklch(0.56 0.14 206);
  --ntp-aura: oklch(0.68 0.14 197);
  --ntp-halo: oklch(0.82 0.08 80);
}
@media (prefers-color-scheme: dark) {
  :root:not(.light) ${selector} {
    --ntp-hot: oklch(0.985 0.05 88);
    --ntp-warm: oklch(0.9 0.075 90);
    --ntp-body: oklch(0.7 0.15 192);
    --ntp-rim: oklch(0.56 0.14 206);
    --ntp-aura: oklch(0.68 0.14 197);
    --ntp-halo: oklch(0.82 0.08 80);
  }
}`;
}

let uid = 0;

// --- DOM -------------------------------------------------------------------

function el<K extends keyof SVGElementTagNameMap>(
  name: K,
  attrs: Record<string, string | number>,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
}

interface Nodes {
  svg: SVGSVGElement;
  stage: SVGGElement;
  aura: SVGCircleElement;
  auraStops: [SVGStopElement, SVGStopElement, SVGStopElement];
  rings: SVGCircleElement[];
  /** Opaque body under the light, so the ground never shows through it. */
  base: SVGPathElement;
  form: SVGPathElement;
  formGradient: SVGLinearGradientElement;
  /** Stops 0 and 1 are the inner light; a quiet reaction dims them. */
  formStops: [SVGStopElement, SVGStopElement];
  bloom: SVGPathElement;
  bloomGradient: SVGRadialGradientElement;
  rim: SVGPathElement;
  highlight: SVGPathElement;
  core: SVGCircleElement;
  coreGradient: SVGRadialGradientElement;
  mote: SVGCircleElement;
  moteGlow: SVGCircleElement;
}

function build(host: HTMLElement, label: string): Nodes {
  uid += 1;
  const id = `nt-presence-${uid}`;
  const svg = el('svg', {
    viewBox: `0 0 ${VIEW} ${VIEW}`,
    width: '100%',
    height: '100%',
    role: 'img',
    'aria-label': label,
    focusable: 'false',
    'data-nt-presence': String(uid),
  });
  svg.style.display = 'block';
  svg.style.overflow = 'visible';

  const style = el('style', {});
  style.textContent = paletteCss(`[data-nt-presence="${uid}"]`);

  // The aura is a gradient rather than a blurred shape: a Gaussian blur on a
  // element this large costs a filter pass every frame for a softness three
  // gradient stops already give.
  const auraGradient = el('radialGradient', { id: `${id}-aura`, gradientUnits: 'userSpaceOnUse' });
  const auraStops: [SVGStopElement, SVGStopElement, SVGStopElement] = [
    el('stop', { offset: '0.5', 'stop-color': 'var(--ntp-halo)', 'stop-opacity': '0.4' }),
    el('stop', { offset: '0.74', 'stop-color': 'var(--ntp-aura)', 'stop-opacity': '0.3' }),
    el('stop', { offset: '1', 'stop-color': 'var(--ntp-aura)', 'stop-opacity': '0' }),
  ];
  for (const stop of auraStops) auraGradient.appendChild(stop);

  // Lit *from a direction*, not from a point. A radial hotspot inside a
  // rounded form is a pupil however carefully it is drawn — the one read this
  // whole rig exists to avoid. A linear ramp cannot be an eye, and rotating
  // its axis is a better cue anyway: the lit side of the form turns toward
  // whatever has the tutor's attention.
  const formGradient = el('linearGradient', { id: `${id}-form`, gradientUnits: 'userSpaceOnUse' });
  const formStops: [SVGStopElement, SVGStopElement] = [
    el('stop', { offset: '0', 'stop-color': 'var(--ntp-hot)', 'stop-opacity': '0.86' }),
    el('stop', { offset: '0.3', 'stop-color': 'var(--ntp-warm)', 'stop-opacity': '0.4' }),
  ];
  formGradient.append(
    formStops[0],
    formStops[1],
    el('stop', { offset: '0.7', 'stop-color': 'var(--ntp-body)', 'stop-opacity': '1' }),
    el('stop', { offset: '1', 'stop-color': 'var(--ntp-rim)', 'stop-opacity': '1' }),
  );

  // The warm bloom of a correct check, laid over the form and faded in.
  const bloomGradient = el('radialGradient', {
    id: `${id}-bloom`,
    gradientUnits: 'userSpaceOnUse',
  });
  bloomGradient.append(
    el('stop', { offset: '0', 'stop-color': 'var(--ntp-hot)', 'stop-opacity': '0.95' }),
    el('stop', { offset: '0.55', 'stop-color': 'var(--ntp-warm)', 'stop-opacity': '0.7' }),
    el('stop', { offset: '1', 'stop-color': 'var(--ntp-warm)', 'stop-opacity': '0' }),
  );

  const coreGradient = el('radialGradient', { id: `${id}-core`, gradientUnits: 'userSpaceOnUse' });
  coreGradient.append(
    el('stop', { offset: '0', 'stop-color': 'var(--ntp-hot)', 'stop-opacity': '0.95' }),
    el('stop', { offset: '0.5', 'stop-color': 'var(--ntp-warm)', 'stop-opacity': '0.5' }),
    el('stop', { offset: '1', 'stop-color': 'var(--ntp-warm)', 'stop-opacity': '0' }),
  );

  // Bounding-box units, unlike every other gradient here, so it follows the
  // mote around the form without being repositioned each frame.
  const sparkGradient = el('radialGradient', { id: `${id}-spark` });
  sparkGradient.append(
    el('stop', { offset: '0.2', 'stop-color': 'var(--ntp-warm)', 'stop-opacity': '0.55' }),
    el('stop', { offset: '1', 'stop-color': 'var(--ntp-aura)', 'stop-opacity': '0' }),
  );

  const defs = el('defs', {});
  defs.append(auraGradient, formGradient, bloomGradient, coreGradient, sparkGradient);

  const aura = el('circle', {
    cx: CX,
    cy: CY,
    r: 108,
    fill: `url(#${id}-aura)`,
    opacity: 0,
    'data-part': 'aura',
  });

  const ringGroup = el('g', { 'data-part': 'rings', fill: 'none' });
  const rings = Array.from({ length: RING_POOL }, () =>
    el('circle', {
      cx: CX,
      cy: CY,
      r: 0,
      stroke: 'var(--ntp-aura)',
      'stroke-width': 2.4,
      opacity: 0,
      'data-part': 'ring',
    }),
  );
  for (const ring of rings) ringGroup.appendChild(ring);

  // The light is a translucent ramp, so it needs something solid to fall on.
  // Without this the dark surface shows through the lit side and the warm
  // light comes out muddy brown instead of warm.
  const base = el('path', { d: '', fill: 'var(--ntp-body)', 'data-part': 'base' });
  const form = el('path', { d: '', fill: `url(#${id}-form)`, 'data-part': 'form' });
  const bloom = el('path', { d: '', fill: `url(#${id}-bloom)`, opacity: 0, 'data-part': 'bloom' });
  // A rim, drawn as the same outline stroked, is what stops the form
  // dissolving into the ground on a light surface. It is the silhouette, and
  // the silhouette is what carries across a room.
  const rim = el('path', {
    d: '',
    fill: 'none',
    stroke: 'var(--ntp-rim)',
    'stroke-width': 2.6,
    'stroke-linejoin': 'round',
    opacity: 0.55,
    'data-part': 'rim',
  });
  const highlight = el('path', {
    d: '',
    fill: 'none',
    stroke: 'var(--ntp-hot)',
    'stroke-width': 2.6,
    'stroke-linecap': 'round',
    opacity: 0,
    'data-part': 'highlight',
  });
  const core = el('circle', {
    cx: CX,
    cy: CY,
    r: 0,
    fill: `url(#${id}-core)`,
    opacity: 0,
    'data-part': 'core',
  });
  // Two circles, so the mote has a glow of its own: a bare dot at this size
  // reads as a speck of dust rather than as a piece of the presence.
  const moteGlow = el('circle', { cx: CX, cy: CY, r: 13, fill: `url(#${id}-spark)`, opacity: 0 });
  const mote = el('circle', {
    cx: CX,
    cy: CY,
    r: 6,
    fill: 'var(--ntp-aura)',
    opacity: 0,
    'data-part': 'mote',
  });

  const stage = el('g', { 'data-part': 'stage' });
  stage.append(aura, ringGroup, base, form, bloom, rim, highlight, core, moteGlow, mote);
  svg.append(defs, style, stage);
  host.appendChild(svg);

  return {
    svg,
    stage,
    aura,
    auraStops,
    rings,
    base,
    form,
    formGradient,
    formStops,
    bloom,
    bloomGradient,
    rim,
    highlight,
    core,
    coreGradient,
    mote,
    moteGlow,
  };
}

// --- The outline -----------------------------------------------------------

interface Point {
  x: number;
  y: number;
}

const f2 = (value: number): string => value.toFixed(2);

/**
 * A closed Catmull-Rom spline through the lobes, emitted as cubic Béziers.
 * A polygon through seven points reads as a gem; the spline is what makes it a
 * form. Every control point is derived from its neighbours, so the curve stays
 * smooth however far the voice pushes a single lobe out.
 */
export function closedSpline(points: readonly Point[]): string {
  const n = points.length;
  if (n < 3) return '';
  const first = points[0];
  const parts = [`M ${f2(first.x)} ${f2(first.y)}`];
  for (let i = 0; i < n; i += 1) {
    const before = points[(i - 1 + n) % n];
    const from = points[i];
    const to = points[(i + 1) % n];
    const after = points[(i + 2) % n];
    const c1x = from.x + (to.x - before.x) / 6;
    const c1y = from.y + (to.y - before.y) / 6;
    const c2x = to.x - (after.x - from.x) / 6;
    const c2y = to.y - (after.y - from.y) / 6;
    parts.push(`C ${f2(c1x)} ${f2(c1y)} ${f2(c2x)} ${f2(c2y)} ${f2(to.x)} ${f2(to.y)}`);
  }
  parts.push('Z');
  return parts.join(' ');
}

/**
 * An open Catmull-Rom run through a slice of the same lobes, used for the rim
 * light. It shares the outline's control-point maths, so the crescent always
 * lies exactly on the form however far the voice has pushed it about.
 */
export function openSpline(points: readonly Point[], from: number, to: number): string {
  const n = points.length;
  if (n < 4 || to <= from) return '';
  const at = (i: number): Point => points[((i % n) + n) % n];
  const head = at(from);
  const parts = [`M ${f2(head.x)} ${f2(head.y)}`];
  for (let i = from; i < to; i += 1) {
    const before = at(i - 1);
    const start = at(i);
    const end = at(i + 1);
    const after = at(i + 2);
    const c1x = start.x + (end.x - before.x) / 6;
    const c1y = start.y + (end.y - before.y) / 6;
    const c2x = end.x - (after.x - start.x) / 6;
    const c2y = end.y - (after.y - start.y) / 6;
    parts.push(`C ${f2(c1x)} ${f2(c1y)} ${f2(c2x)} ${f2(c2y)} ${f2(end.x)} ${f2(end.y)}`);
  }
  return parts.join(' ');
}

export interface FormShape {
  radius: number;
  /** Edge wobble, as a fraction of the radius. */
  wobble: number;
  /** Second-harmonic detail: the edge turning something over (thinking). */
  facet: number;
  /** 0-1 voice level, pushing each lobe out by its own weight. */
  voice: number;
  /** Stretch along the lean axis, so a leaning form elongates. */
  stretchX: number;
  stretchY: number;
  /** How far in to pull the points, for the rim-light crescent. */
  inset?: number;
}

/** The seven lobe positions at `t`. Exported so the tests can measure the edge. */
export function formPoints(t: number, shape: FormShape, reduced: boolean): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < LOBE_COUNT; i += 1) {
    const angle = FORM_ROTATION + (i / LOBE_COUNT) * Math.PI * 2;
    const drift = reduced
      ? 0
      : Math.sin((2 * Math.PI * t) / LOBE_PERIOD[i] + LOBE_PHASE[i]) * shape.wobble;
    const detail = shape.facet * Math.cos(angle * 2 + FORM_ROTATION) * 0.055;
    const push = shape.voice * LOBE_VOICE[i] * VOICE_REACH;
    const r = shape.radius * (LOBE_RADIUS[i] + drift + detail + push) * (shape.inset ?? 1);
    points.push({
      x: CX + Math.cos(angle) * r * shape.stretchX,
      y: CY + Math.sin(angle) * r * shape.stretchY,
    });
  }
  return points;
}

// --- Poses -----------------------------------------------------------------

interface Pose {
  radius: number;
  aura: number;
  auraSpan: number;
  /** 0-1 inner core, lit by the voice. */
  core: number;
  wobble: number;
  facet: number;
  rim: number;
  /** How far the form leans per unit of gaze. */
  lean: number;
  /** Vertical offset: a reaction lifts, a "not quite" settles. */
  lift: number;
  tilt: number;
  /**
   * Aspect: listening opens wider than tall, thinking gathers taller than
   * wide. A shape change survives reduced motion where an animation cannot.
   */
  wide: number;
  tall: number;
  /**
   * Positive blooms warm over the form (a correct check); negative dims the
   * light inside it (a "not quite"). Never a colour that reads as an error —
   * the presence goes quiet, it does not go grey.
   */
  glow: number;
  rings: 'none' | 'out' | 'in' | 'voice';
  mote: number;
  /** Where the light inside the form sits before `setGaze` is applied. */
  focus: AvatarGaze;
}

const REST: Pose = {
  radius: 56,
  aura: 0.6,
  auraSpan: 1,
  core: 0,
  wobble: 1,
  facet: 0,
  rim: 0.58,
  lean: 0.6,
  lift: 0,
  tilt: 0,
  wide: 1,
  tall: 1,
  glow: 0,
  rings: 'none',
  mote: 0,
  // Not centred: light with a direction is what stops the warm centre reading
  // as a yolk in the middle of a ring, and it puts the glow on the same side
  // as the rim-light crescent.
  focus: { x: -0.24, y: -0.3 },
};

function poseFor(state: AvatarState, expression: AvatarInputs['expression'], level: number): Pose {
  const pose: Pose = { ...REST, focus: { ...REST.focus } };
  switch (state) {
    case 'listening':
      // The largest footprint of any state, opened wider than tall, and the
      // only one with solid rings going outward. Read from across a room,
      // this is "the door is open".
      Object.assign(pose, {
        radius: 66,
        aura: 0.9,
        auraSpan: 1.14,
        wobble: 1.25,
        rim: 0.72,
        wide: 1.07,
        tall: 0.97,
        rings: 'out',
      });
      break;
    case 'thinking':
      // The inverse of listening in every axis that carries meaning, so the
      // two can never be mistaken for each other at a glance.
      Object.assign(pose, {
        radius: 46,
        aura: 0.36,
        auraSpan: 0.86,
        wobble: 0.7,
        facet: 1,
        rim: 0.95,
        tilt: -6,
        wide: 0.9,
        tall: 1.1,
        rings: 'in',
        mote: 1,
        focus: { x: -0.62, y: -0.66 },
      });
      break;
    case 'speaking':
      Object.assign(pose, {
        radius: 58,
        aura: 0.66 + level * 0.24,
        wobble: 1 + level * 1.6,
        // A floor under the core, so "speaking" is legible in the gap between
        // two words and under reduced motion at level zero.
        core: 0.3 + clamp01(level) * 0.7,
        rim: 0.58,
        rings: 'voice',
      });
      break;
    case 'at-whiteboard':
      Object.assign(pose, { radius: 54, aura: 0.6, lean: 1, rim: 0.66 });
      break;
    case 'reacting':
    case 'idle':
    default:
      break;
  }
  if (expression === 'smile') {
    Object.assign(pose, {
      radius: pose.radius + 9,
      aura: 0.98,
      rim: 0.78,
      lift: -7,
      wide: 1.04,
      glow: 1,
    });
  }
  if (expression === 'not-quite') {
    // A settle, not a scold: the form sinks a little, draws in, and goes
    // momentarily quiet. Nothing red, nothing sharp.
    Object.assign(pose, {
      radius: pose.radius - 7,
      aura: 0.36,
      rim: 0.7,
      lift: 6,
      tilt: 6,
      wide: 1.03,
      tall: 0.93,
      glow: -1,
    });
  }
  if (expression === 'curious') {
    Object.assign(pose, {
      radius: pose.radius + 4,
      aura: 0.8,
      rim: 0.72,
      tilt: -8,
      tall: 1.04,
      focus: { x: 0.36, y: -0.4 },
    });
  }
  return pose;
}

// --- Driver ----------------------------------------------------------------

export interface PresenceRigOptions {
  /** Accessible name for the tile. */
  label?: string;
  /** Test seam: defaults to `window.matchMedia('(prefers-reduced-motion: reduce)')`. */
  reducedMotion?: () => boolean;
  /** Test and preview seam: the animation clock. Defaults to `performance.now()`. */
  clock?: () => number;
  /** Test and preview seam: frame scheduling. Defaults to `requestAnimationFrame`. */
  schedule?: (callback: (t: number) => void) => number;
  cancel?: (handle: number) => void;
  /** Test seam: saccade targets. Defaults to `Math.random`. */
  random?: () => number;
}

interface Ring {
  bornAt: number;
  strength: number;
  /** 0-1 level at the moment it was emitted; an outward ring travels further. */
  reach: number;
  inward: boolean;
}

const spring = (value: number): SpringState => ({ value, velocity: 0 });

export function createPresenceAvatarDriver(
  host: HTMLElement,
  options: PresenceRigOptions = {},
): AvatarDriver {
  const label = options.label ?? 'The tutor’s presence';
  const nodes = build(host, label);
  const random = options.random ?? Math.random;

  const readReducedMotion =
    options.reducedMotion ??
    (() =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const now = (): number =>
    options.clock
      ? options.clock()
      : typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();

  const schedule =
    options.schedule ??
    ((callback: (t: number) => void) =>
      typeof requestAnimationFrame === 'function' ? requestAnimationFrame(callback) : 0);
  const cancel =
    options.cancel ??
    ((handle: number) => {
      if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(handle);
    });

  let state: AvatarState = 'idle';
  let expression: AvatarInputs['expression'] = 'neutral';
  /** `null`, not 0: a clock can legitimately read 0 on the frame one starts. */
  let reactionAt: number | null = null;
  let reactionHeld = false;
  let level = 0;
  let gaze: AvatarGaze = CENTER_GAZE;

  const start = now();
  const saccade = createSaccadeTrack(start, random);
  const onsets = createOnsetTrack(start);
  const ringPool: (Ring | null)[] = Array.from({ length: RING_POOL }, () => null);
  let nextRingSlot = 0;
  let nextCadenceRing = start + LISTEN_RING_MS;

  let sRadius = spring(REST.radius);
  let sAura = spring(REST.aura);
  let sAuraSpan = spring(1);
  let sCore = spring(0);
  let sWobble = spring(1);
  let sFacet = spring(0);
  let sRim = spring(REST.rim);
  let sLift = spring(0);
  let sTilt = spring(0);
  let sWide = spring(1);
  let sTall = spring(1);
  let sGlow = spring(0);
  let sMote = spring(0);
  let sFocusX = spring(0);
  let sFocusY = spring(0);
  let sLeanX = spring(0);
  let sLeanY = spring(0);

  let lastFrame = start;
  let frame = 0;
  let disposed = false;

  const emit = (t: number, strength: number, inward: boolean, reach = 0) => {
    ringPool[nextRingSlot] = { bornAt: t, strength, reach: clamp01(reach), inward };
    nextRingSlot = (nextRingSlot + 1) % RING_POOL;
  };

  const render = (t: number) => {
    if (disposed) return;
    const reduced = readReducedMotion();
    const dt = clamp(t - lastFrame, 0, 120);
    lastFrame = t;

    let drive = 0;
    if (reactionAt !== null) {
      if (reactionHeld) {
        drive = 1;
      } else {
        const elapsed = t - reactionAt;
        drive = reactionDrive(elapsed, REACTION_MS, reduced);
        if (elapsed >= reactionTotalMs(REACTION_MS, reduced)) {
          reactionAt = null;
          expression = 'neutral';
          if (state === 'reacting') state = 'idle';
        }
      }
    }

    const pose = poseFor(state, expression, level);
    // A reaction's drive scales the distance from rest to the reaction pose,
    // so the anticipation dip shows as the form gathering the wrong way first.
    const blend = (rest: number, target: number): number =>
      reactionAt === null ? target : rest + (target - rest) * drive;

    const sway = idleSway(t, reduced);
    const eyes = saccade.sample(t, reduced);

    sRadius = stepSpring(sRadius, blend(REST.radius, pose.radius), SPRING_POP, dt, reduced);
    sAura = stepSpring(sAura, blend(REST.aura, pose.aura), SPRING_SETTLE, dt, reduced);
    sAuraSpan = stepSpring(sAuraSpan, blend(1, pose.auraSpan), SPRING_SETTLE, dt, reduced);
    sCore = stepSpring(sCore, pose.core, SPRING_SETTLE, dt, reduced);
    sWobble = stepSpring(sWobble, blend(REST.wobble, pose.wobble), SPRING_SETTLE, dt, reduced);
    sFacet = stepSpring(sFacet, blend(0, pose.facet), SPRING_SETTLE, dt, reduced);
    sRim = stepSpring(sRim, blend(REST.rim, pose.rim), SPRING_SETTLE, dt, reduced);
    sLift = stepSpring(sLift, blend(0, pose.lift), SPRING_POP, dt, reduced);
    sTilt = stepSpring(sTilt, blend(0, pose.tilt), SPRING_SETTLE, dt, reduced);
    sWide = stepSpring(sWide, blend(1, pose.wide), SPRING_POP, dt, reduced);
    sTall = stepSpring(sTall, blend(1, pose.tall), SPRING_POP, dt, reduced);
    sGlow = stepSpring(sGlow, blend(0, pose.glow), SPRING_SETTLE, dt, reduced);
    sMote = stepSpring(sMote, pose.mote, SPRING_SETTLE, dt, reduced);

    // Gaze *adds* to the pose's own focus rather than replacing it, so the
    // whiteboard lean and the thinking look-away compose instead of one
    // silently cancelling the other.
    const focusX = pose.focus.x + gaze.x * 0.5 + eyes.x * 0.5;
    const focusY = pose.focus.y + gaze.y * 0.5 + eyes.y * 0.5;
    sFocusX = stepSpring(sFocusX, clamp(focusX, -1, 1), SPRING_SETTLE, dt, reduced);
    sFocusY = stepSpring(sFocusY, clamp(focusY, -1, 1), SPRING_SETTLE, dt, reduced);
    sLeanX = stepSpring(sLeanX, gaze.x * pose.lean, SPRING_SETTLE, dt, reduced);
    sLeanY = stepSpring(sLeanY, gaze.y * pose.lean, SPRING_SETTLE, dt, reduced);

    // --- rings ---
    if (pose.rings === 'out' && t >= nextCadenceRing) {
      // Listening runs on its own calm cadence so the presence is never inert,
      // and whatever level is on the channel lifts how far each ring carries.
      emit(t, 0.75 + level * 0.25, false, level);
      nextCadenceRing = t + LISTEN_RING_MS;
    } else if (pose.rings === 'in' && t >= nextCadenceRing) {
      emit(t, 1, true);
      nextCadenceRing = t + THINK_RING_MS;
    } else if (pose.rings === 'voice') {
      if (onsets.step(t, level)) emit(t, 0.55 + clamp01(level) * 0.45, false, level);
      nextCadenceRing = t + LISTEN_RING_MS;
    } else if (pose.rings === 'none') {
      nextCadenceRing = t + LISTEN_RING_MS;
    }

    const radius = Math.max(8, sRadius.value);
    // A lean stretches the form along its travel: a body turning, not a
    // sticker sliding. The volume is roughly preserved.
    const leanMag = Math.hypot(sLeanX.value, sLeanY.value);
    const stretch = 1 + leanMag * 0.2;
    const squeeze = 1 - leanMag * 0.11;
    const horizontal = Math.abs(sLeanX.value) >= Math.abs(sLeanY.value);

    const shape: FormShape = {
      radius,
      wobble: sWobble.value * WOBBLE_BASE,
      facet: sFacet.value,
      voice: state === 'speaking' ? clamp01(level) : 0,
      stretchX: (horizontal ? stretch : squeeze) * sWide.value,
      stretchY: (horizontal ? squeeze : stretch) * sTall.value,
    };
    const edge = formPoints(t, shape, reduced);
    const outline = closedSpline(edge);

    nodes.base.setAttribute('d', outline);
    nodes.form.setAttribute('d', outline);
    nodes.bloom.setAttribute('d', outline);
    nodes.rim.setAttribute('d', outline);
    nodes.rim.setAttribute('opacity', clamp01(sRim.value).toFixed(3));
    const innerEdge = formPoints(t, { ...shape, inset: HIGHLIGHT_INSET }, reduced);

    // --- transform ---
    const tx = sLeanX.value * LEAN_PX + sway.sway;
    const ty = sLeanY.value * LEAN_PX + sLift.value + sway.bob;
    const tilt = sTilt.value + sway.tilt * 0.6;
    nodes.stage.setAttribute(
      'transform',
      `translate(${f2(tx)} ${f2(ty)}) rotate(${f2(tilt)} ${CX} ${CY})`,
    );

    // --- the light, and where it comes from ---
    const glow = clamp(sGlow.value, -1, 1);
    const span = Math.hypot(sFocusX.value, sFocusY.value);
    // With no gaze and no pose offset the light still has to come from
    // somewhere, or the form goes flat.
    const ux = span > 0.01 ? sFocusX.value / span : LIGHT_REST.x / 0.384;
    const uy = span > 0.01 ? sFocusY.value / span : LIGHT_REST.y / 0.384;
    nodes.formGradient.setAttribute('x1', f2(CX + ux * radius));
    nodes.formGradient.setAttribute('y1', f2(CY + uy * radius));
    nodes.formGradient.setAttribute('x2', f2(CX - ux * radius * 1.05));
    nodes.formGradient.setAttribute('y2', f2(CY - uy * radius * 1.05));

    // The bloom and the voice core are centred on the form, not on the light:
    // a bright disc offset inside a rounded shape is the pupil again.
    for (const gradient of [nodes.bloomGradient, nodes.coreGradient]) {
      gradient.setAttribute('cx', f2(CX + ux * radius * 0.12));
      gradient.setAttribute('cy', f2(CY + uy * radius * 0.12));
      gradient.setAttribute('r', f2(Math.max(1, radius * 1.05)));
    }

    const core = clamp01(sCore.value);
    nodes.core.setAttribute('cx', f2(CX + ux * radius * 0.12));
    nodes.core.setAttribute('cy', f2(CY + uy * radius * 0.12));
    nodes.core.setAttribute('r', f2(radius * 1.05));
    nodes.core.setAttribute('opacity', (core * 0.6).toFixed(3));

    // A bounce light on the *shaded* edge, opposite the light. It is what
    // gives a rounded form its volume, and it travels round the form as
    // attention moves, so the surface always has a front and a back.
    const lit = litLobe(ux, uy);
    nodes.highlight.setAttribute('d', openSpline(innerEdge, lit + 3, lit + 5));
    nodes.highlight.setAttribute(
      'opacity',
      (0.2 + core * 0.14 + Math.max(0, glow) * 0.14).toFixed(3),
    );
    nodes.highlight.setAttribute('stroke-width', f2(radius * 0.035 + 1));

    // --- a warm bloom, or the light going quiet ---
    nodes.bloom.setAttribute('opacity', Math.max(0, glow * 0.62).toFixed(3));
    // A "not quite" pulls the inner light in and dims it rather than tinting
    // the form: a presence that goes quiet, never one that goes grey.
    const dim = Math.max(0, -glow);
    nodes.formStops[0].setAttribute('stop-opacity', (0.86 - dim * 0.56).toFixed(3));
    nodes.formStops[1].setAttribute('stop-opacity', (0.4 - dim * 0.28).toFixed(3));

    // --- aura ---
    const auraR = radius * AURA_SPAN * clamp(sAuraSpan.value, 0.6, 1.4);
    nodes.aura.setAttribute('r', f2(auraR));
    nodes.aura.setAttribute('cx', f2(CX + sFocusX.value * radius * 0.12));
    nodes.aura.setAttribute('cy', f2(CY + sFocusY.value * radius * 0.12));
    // A slow, shallow breath in the aura: the one motion that never stops, and
    // the reason the presence reads as attending rather than as paused.
    const auraBreath = reduced ? 1 : 0.9 + 0.1 * sway.breath;
    nodes.aura.setAttribute('opacity', (clamp01(sAura.value) * auraBreath).toFixed(3));
    nodes.auraStops[0].setAttribute('offset', f2(0.46 + core * 0.08));

    // --- rings, drawn ---
    // No travel under reduced motion: the rings stand still at fixed radii, so
    // listening (two solid rings outside the form) and thinking (one broken
    // ring gathered close) still read apart. They are drawn from the pose
    // rather than from the pool, or a ring emitted in a previous state would
    // still be sitting there after the tutor moved on.
    if (reduced) {
      const inward = pose.rings === 'in';
      const shown = pose.rings === 'none' ? 0 : inward ? 1 : 2;
      nodes.rings.forEach((node, index) => {
        if (index >= shown) {
          node.setAttribute('opacity', '0');
          return;
        }
        node.setAttribute('r', f2(radius * (inward ? 1.42 : 1.34 + index * 0.38)));
        node.setAttribute('opacity', inward ? '0.6' : (0.58 - index * 0.18).toFixed(3));
        node.setAttribute('stroke-dasharray', inward ? '7 9' : 'none');
      });
    }

    nodes.rings.forEach((node, index) => {
      if (reduced) return;
      const ring = ringPool[index];
      if (!ring) {
        node.setAttribute('opacity', '0');
        return;
      }
      const life = ring.inward ? RING_IN_MS : RING_OUT_MS;
      const u = (t - ring.bornAt) / life;
      if (u >= 1 || u < 0) {
        node.setAttribute('opacity', '0');
        ringPool[index] = null;
        return;
      }
      if (ring.inward) {
        // Gathering: it appears wide, closes on the form, and fades as it
        // arrives. Broken, so it never reads as the listening ring reversed.
        const r = radius * (1.95 - easeInOutSine(u) * 1.02);
        node.setAttribute('r', f2(r));
        node.setAttribute('opacity', (Math.sin(Math.PI * u) * 0.62 * ring.strength).toFixed(3));
        node.setAttribute('stroke-dasharray', '7 9');
      } else {
        const r = radius * (1.02 + easeOutCubic(u) * (0.92 + ring.reach * 0.42));
        node.setAttribute('r', f2(r));
        node.setAttribute('opacity', ((1 - u) ** 1.4 * 0.66 * ring.strength).toFixed(3));
        node.setAttribute('stroke-dasharray', 'none');
      }
    });

    // --- the thinking mote ---
    const mote = clamp01(sMote.value);
    nodes.mote.setAttribute('opacity', (mote * 0.95).toFixed(3));
    nodes.moteGlow.setAttribute('opacity', (mote * 0.7).toFixed(3));
    if (mote > 0.01) {
      const angle = (motePosition(t, reduced) * Math.PI) / 180;
      const mx = CX + Math.cos(angle) * radius * MOTE_ORBIT;
      const my = CY + Math.sin(angle) * radius * MOTE_ORBIT;
      for (const node of [nodes.mote, nodes.moteGlow]) {
        node.setAttribute('cx', f2(mx));
        node.setAttribute('cy', f2(my));
      }
    }

    frame = schedule(render);
  };

  // `render` schedules its own successor, so one call starts the loop. In a
  // host with no `requestAnimationFrame` it paints once and stops.
  render(start);

  const driver: AvatarDriver = {
    setState(next) {
      if (state === next) return;
      state = next;
      // A state change starts its ring cadence now rather than wherever the
      // previous state's timer happened to be.
      nextCadenceRing = now();
    },
    setMouth(value) {
      level = clamp01(value);
    },
    setGaze(next) {
      gaze = { x: clamp(next.x, -1, 1), y: clamp(next.y, -1, 1) };
    },
    react(kind: ReactionKind) {
      const next = expressionFor(kind);
      if (next === 'neutral') {
        reactionAt = null;
        reactionHeld = false;
        expression = 'neutral';
        return;
      }
      expression = next;
      state = 'reacting';
      reactionHeld = false;
      reactionAt = now();
      emit(reactionAt, 1, next === 'not-quite', 0.5);
    },
    set(inputs) {
      if (inputs.state) driver.setState(inputs.state);
      if (typeof inputs.mouth === 'number') driver.setMouth(inputs.mouth);
      if (inputs.gaze) driver.setGaze(inputs.gaze);
      if (inputs.expression && inputs.expression !== expression) {
        expression = inputs.expression;
        reactionHeld = inputs.expression !== 'neutral';
        reactionAt = reactionHeld ? now() : null;
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancel(frame);
      nodes.svg.remove();
    },
  };
  return driver;
}
