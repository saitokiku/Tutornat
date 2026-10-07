/**
 * The 2D rig: one stylized character in SVG, driven imperatively.
 *
 * Design brief (design-system skill): a stylized character with a warm,
 * specific personality — not photoreal, not a mascot, not gendered, no
 * sparkles or robot iconography. Nothing about it claims to be a person; the
 * "AI tutor" label sits on the tile beside it.
 *
 * ## Why it is drawn the way it is
 *
 * The rig this replaced was two rounded rectangles for eyes, a symmetric
 * blink, a head that never moved, and a mouth whose height tracked audio
 * amplitude. Every one of those is a known uncanny signal, and together they
 * read as a mask rather than a face. What is here instead:
 *
 * - **Eyes with anatomy.** Sclera, iris, pupil, a large specular highlight and
 *   a small secondary one. The iris and pupil translate with `setGaze`; the
 *   highlights are siblings, not children, so they stay put on the eye as the
 *   pupil moves under them — which is what makes the eye read as a wet sphere
 *   rather than a printed dot.
 * - **A lid, not a scaling box.** Each eye is clipped by an almond whose two
 *   lid curves share their corners and converge on a line; the same curves are
 *   stroked, so a shut eye is a drawn lid and a happy eye is an arch.
 * - **Asymmetry at rest.** One brow sits higher than the other, the hair falls
 *   to one side, and "not quite" pulls one corner of the mouth. Perfect
 *   bilateral symmetry is the other half of why the old face read as a doll.
 * - **Mouth shapes.** Four crude visemes chosen from amplitude and its rate of
 *   change, each held a minimum time, morphed between on a spring
 *   (`rig-motion.ts`). An amplitude-height mouth is a flapping hole.
 * - **Weight.** The head breathes, sways, and tilts on three non-harmonic
 *   periods; it squashes and stretches about the chin on reactions; a ground
 *   shadow under it widens as it compresses.
 *
 * ## States (spec §5.10 A)
 *
 * - `idle`          breathing, blinking, gaze forward;
 * - `listening`     brows up, eyes wide, head tilted in, a soft ring;
 * - `thinking`      gaze up and away, one brow higher, three dots beside the
 *                   head — this is what covers end-of-speech to first audio,
 *                   so the latency budget reads as a beat rather than a hang;
 * - `speaking`      visemes from `setMouth`, plus a small head bob on the
 *                   open shapes;
 * - `at-whiteboard` head and eyes turn to the board;
 * - `reacting`      a smile, or a soft "not quite" — proportionate, never
 *                   fireworks.
 *
 * `prefers-reduced-motion` drops the sway, the breathing, the saccades, the
 * squash, and the spring overshoot, and lengthens the blink and viseme holds.
 * Every state stays legible, because state is information, not decoration.
 *
 * ## Colour
 *
 * The face keeps a fixed illustration palette instead of reading the theme
 * tokens. A character's identity does not invert when the page goes dark, and
 * the tokens that would have driven it (`--card`, `--foreground`) swap
 * lightness between themes, which turned the eyes into holes on the dark
 * surface. The tile *around* the face still follows the theme; the accent hue
 * stays in the brand family (teal, hue ~205) so the character belongs to the
 * product.
 */
import type { ReactionKind } from '@/lib/tutor/contracts';

import type { AvatarDriver, AvatarGaze, AvatarInputs, AvatarState } from './driver';
import { CENTER_GAZE, expressionFor, REACTION_MS } from './driver';
import {
  clamp,
  clamp01,
  createBlinkTrack,
  createSaccadeTrack,
  createVisemeTrack,
  idleSway,
  reactionDrive,
  reactionTotalMs,
  SPRING_POP,
  SPRING_SETTLE,
  squashStretch,
  stepSpring,
  VISEME_SHAPES,
  type SpringState,
} from './rig-motion';

const SVG_NS = 'http://www.w3.org/2000/svg';

// --- Geometry, in viewBox units --------------------------------------------

const VIEW = 240;
const CX = 120;
const CHIN_Y = 214;
const EYE_Y = 137;
const EYE_DX = 35;
const EYE_RX = 25;
const EYE_RY = 26;
/** A big iris cut by the lids; a small iris in a wide white reads as a stare. */
const IRIS_R = 16;
const PUPIL_R = 7.5;
const BROW_Y = 103;
const BROW_HALF = 12;
const NOSE_Y = 170;
const MOUTH_Y = 185;
/** The upper lid rests slightly over the iris, the way an open eye does. */
const LID_REST = 1.5;
/** A happy squint pushes the lower lid up by this much. */
const SQUINT_RISE = EYE_RY * 0.96;
/** The brows do not rest level; the right one carries a permanent half-lift. */
const BROW_REST_TILT = 1.4;

// --- Palette (fixed; see the header note) ----------------------------------

const INK = 'oklch(0.35 0.045 245)';
const SKIN = 'oklch(0.945 0.032 72)';
const SKIN_SHADE = 'oklch(0.9 0.045 58)';
const HAIR = 'oklch(0.44 0.085 215)';
const HAIR_LIGHT = 'oklch(0.53 0.075 208)';
const IRIS = 'oklch(0.5 0.105 205)';
const PUPIL = 'oklch(0.24 0.035 250)';
const SCLERA = 'oklch(0.985 0.008 85)';
const SPARK = 'oklch(1 0 0)';
const BLUSH = 'oklch(0.78 0.09 32)';
const MOUTH_IN = 'oklch(0.52 0.06 20)';
const GLOW = 'var(--primary)';

/** An egg: a wide cranium over a narrower, rounded chin. */
const HEAD_PATH =
  'M 120 30 C 168 30 204 68 204 120 C 204 174 170 214 120 214 C 70 214 36 174 36 120 C 36 68 72 30 120 30 Z';

/**
 * A soft cap with three points along its lower edge, sitting slightly to one
 * side. It is what turns the silhouette from "an oval" into "somebody", and
 * it is the only asymmetric thing on the head at rest.
 */
const HAIR_PATH =
  'M 38 106 C 38 54 74 26 122 26 C 168 26 202 56 202 104 C 194 90 184 84 174 86 ' +
  'C 182 70 174 56 160 50 C 162 68 152 78 137 79 C 136 58 120 48 103 51 ' +
  'C 111 66 103 79 88 81 C 74 70 52 80 38 106 Z';

let uid = 0;

interface EyeNodes {
  clip: SVGPathElement;
  ball: SVGGElement;
  iris: SVGGElement;
  lid: SVGPathElement;
  lower: SVGPathElement;
  brow: SVGPathElement;
}

interface Nodes {
  svg: SVGSVGElement;
  ring: SVGCircleElement;
  stage: SVGGElement;
  head: SVGGElement;
  shadow: SVGEllipseElement;
  shade: SVGPathElement;
  left: EyeNodes;
  right: EyeNodes;
  blush: SVGGElement;
  mouth: SVGPathElement;
  dots: SVGGElement;
  dot: SVGCircleElement[];
}

function el<K extends keyof SVGElementTagNameMap>(
  name: K,
  attrs: Record<string, string | number>,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
}

function buildEye(side: -1 | 1, prefix: string): { group: SVGGElement; nodes: EyeNodes } {
  const cx = CX + side * EYE_DX;
  const clipId = `${prefix}-lid-${side === -1 ? 'l' : 'r'}`;
  // The lids are a path, not a rect: clipping an eye with a rectangle leaves a
  // flat-topped, flat-bottomed shape, and a squint drawn that way looks cut
  // rather than closed. The two lid curves and the clip are the same geometry.
  const clip = el('path', { d: '', 'data-part': 'lid' });
  const clipPath = el('clipPath', { id: clipId });
  clipPath.appendChild(clip);

  const ball = el('g', { 'clip-path': `url(#${clipId})` });
  const sclera = el('ellipse', { cx, cy: EYE_Y, rx: EYE_RX, ry: EYE_RY, fill: SCLERA });
  const iris = el('g', { 'data-part': 'iris', 'data-side': String(side) });
  iris.append(
    el('circle', { cx, cy: EYE_Y, r: IRIS_R, fill: IRIS }),
    el('circle', { cx, cy: EYE_Y, r: PUPIL_R, fill: PUPIL }),
  );
  // The highlights are siblings of the iris group, so they hold their place on
  // the eye while the pupil travels under them. Two of them, of different
  // sizes and off-centre: one highlight reads as a printed dot, two read as a
  // wet sphere with a light source.
  const sparkA = el('circle', {
    cx: cx - 6,
    cy: EYE_Y - 7.5,
    r: 4.8,
    fill: SPARK,
    opacity: 0.92,
    'data-part': 'spark',
  });
  const sparkB = el('circle', { cx: cx + 6.5, cy: EYE_Y + 7, r: 2.4, fill: SPARK, opacity: 0.5 });
  ball.append(sclera, iris, sparkA, sparkB);

  const lid = el('path', {
    d: '',
    'data-part': 'lid-line',
    fill: 'none',
    stroke: INK,
    'stroke-width': 3.4,
    'stroke-linecap': 'round',
  });
  const lower = el('path', {
    d: '',
    fill: 'none',
    stroke: INK,
    'stroke-width': 2.6,
    'stroke-linecap': 'round',
    opacity: 0.3,
  });
  const brow = el('path', {
    d: '',
    'data-part': 'brow',
    'data-side': String(side),
    fill: 'none',
    stroke: HAIR,
    'stroke-width': 6,
    'stroke-linecap': 'round',
  });

  const group = el('g', {});
  group.append(clipPath, ball, lower, lid, brow);
  return { group, nodes: { clip, ball, iris, lid, lower, brow } };
}

function build(host: HTMLElement, label: string): Nodes {
  uid += 1;
  const prefix = `nt-rig-${uid}`;
  const svg = el('svg', {
    viewBox: `0 0 ${VIEW} ${VIEW}`,
    width: '100%',
    height: '100%',
    role: 'img',
    'aria-label': label,
    focusable: 'false',
  });
  svg.style.display = 'block';
  svg.style.overflow = 'visible';

  // Listening reads as a warm glow behind the head, not as a hard circle: a
  // crisp thin ring at this size looks like a soap bubble sitting on the face.
  const glowId = `${prefix}-glow`;
  const gradient = el('radialGradient', { id: glowId });
  gradient.append(
    el('stop', { offset: '0.55', 'stop-color': GLOW, 'stop-opacity': '0.34' }),
    el('stop', { offset: '1', 'stop-color': GLOW, 'stop-opacity': '0' }),
  );
  const defs = el('defs', {});
  defs.appendChild(gradient);
  const ring = el('circle', {
    cx: CX,
    cy: 128,
    r: 118,
    fill: `url(#${glowId})`,
    opacity: 0,
    'data-part': 'glow',
  });

  const shadow = el('ellipse', {
    cx: CX,
    cy: CHIN_Y + 6,
    rx: 62,
    ry: 9,
    fill: INK,
    opacity: 0.1,
  });

  const stage = el('g', { 'data-part': 'stage' });
  const head = el('g', { 'data-part': 'head' });
  const shell = el('path', { d: HEAD_PATH, fill: SKIN, stroke: INK, 'stroke-width': 3.5 });
  // A soft shade across the jaw gives the silhouette a front and a bottom.
  const shade = el('path', {
    d: 'M 54 168 C 66 202 94 209 120 209 C 146 209 174 202 186 168 C 180 196 154 211 120 211 C 86 211 60 196 54 168 Z',
    fill: SKIN_SHADE,
    opacity: 0.85,
  });
  const earLeft = el('ellipse', {
    cx: 36,
    cy: 142,
    rx: 9,
    ry: 13,
    fill: SKIN,
    stroke: INK,
    'stroke-width': 3.5,
  });
  const earRight = el('ellipse', {
    cx: 204,
    cy: 142,
    rx: 9,
    ry: 13,
    fill: SKIN,
    stroke: INK,
    'stroke-width': 3.5,
  });
  const hair = el('path', { d: HAIR_PATH, fill: HAIR, stroke: INK, 'stroke-width': 3.5 });
  // A thin sheen along the crown, not a wedge across it: a filled triangle
  // here reads as a bald patch rather than as light on hair.
  const hairSheen = el('path', {
    d: 'M 58 82 C 70 50 96 34 126 34',
    fill: 'none',
    stroke: HAIR_LIGHT,
    'stroke-width': 7,
    'stroke-linecap': 'round',
    opacity: 0.55,
  });

  const left = buildEye(-1, prefix);
  const right = buildEye(1, prefix);

  const blush = el('g', { opacity: 0 });
  blush.append(
    el('ellipse', { cx: CX - 64, cy: 172, rx: 14, ry: 8, fill: BLUSH }),
    el('ellipse', { cx: CX + 64, cy: 172, rx: 14, ry: 8, fill: BLUSH }),
  );

  // A small nose. Without one, eyes and mouth float on a blank oval and the
  // face reads as a mask; it is drawn in the skin shade so it holds the middle
  // of the face together without competing with the features that carry state.
  const nose = el('path', {
    d: `M ${CX - 5.5} ${NOSE_Y - 2.5} Q ${CX} ${NOSE_Y + 3.5} ${CX + 5.5} ${NOSE_Y - 2.5}`,
    fill: 'none',
    stroke: INK,
    'stroke-width': 2.8,
    'stroke-linecap': 'round',
    opacity: 0.5,
  });

  const mouth = el('path', {
    d: '',
    'data-part': 'mouth',
    fill: MOUTH_IN,
    stroke: INK,
    'stroke-width': 3.8,
    'stroke-linejoin': 'round',
    'stroke-linecap': 'round',
  });

  const dots = el('g', { opacity: 0, 'data-part': 'dots' });
  const dot = [0, 1, 2].map((index) =>
    el('circle', {
      cx: 207 + index * 13,
      cy: 40 - index * 8,
      r: 4.5 - index * 0.5,
      fill: 'var(--primary)',
      opacity: 0.4,
    }),
  );
  for (const node of dot) dots.appendChild(node);

  head.append(
    earLeft,
    earRight,
    shell,
    shade,
    hair,
    hairSheen,
    left.group,
    right.group,
    blush,
    nose,
    mouth,
  );
  stage.append(shadow, head);
  svg.append(defs, ring, stage, dots);
  host.appendChild(svg);

  return {
    svg,
    ring,
    stage,
    head,
    shadow,
    shade,
    left: left.nodes,
    right: right.nodes,
    blush,
    mouth,
    dots,
    dot,
  };
}

// --- Path generators -------------------------------------------------------

/**
 * `lift` raises the whole brow; `tilt` raises the inner end (concern) or
 * lowers it (a frown). The old rig's tilt raised the *inner* end for
 * "curious", which draws the eyebrows of a villain.
 */
function browPath(side: -1 | 1, lift: number, tilt: number, arch: number): string {
  const cx = CX + side * EYE_DX;
  const base = BROW_Y - lift;
  // side -1 is the left eye, so its inner end is the one at +x.
  const outerX = cx + side * BROW_HALF;
  const innerX = cx - side * BROW_HALF;
  const outerY = base + tilt * 0.35;
  const innerY = base - tilt;
  const mid = (outerX + innerX) / 2;
  const apex = Math.min(outerY, innerY) - arch;
  return `M ${outerX.toFixed(2)} ${outerY.toFixed(2)} Q ${mid.toFixed(2)} ${apex.toFixed(2)} ${innerX.toFixed(2)} ${innerY.toFixed(2)}`;
}

/** A lens between two corners: `height` opens it, `smile` bends it, `skew` tips it. */
function mouthPath(width: number, height: number, smile: number, skew: number): string {
  const cx = CX + skew * 2.5;
  const half = Math.max(9, width) / 2;
  const leftY = MOUTH_Y - smile * 7 + skew * 4.5;
  const rightY = MOUTH_Y - smile * 7 - skew * 4.5;
  const top = MOUTH_Y - height * 0.3 + smile * 4;
  const bottom = MOUTH_Y + height * 0.7 + smile * 11;
  return [
    `M ${(cx - half).toFixed(2)} ${leftY.toFixed(2)}`,
    `Q ${cx.toFixed(2)} ${top.toFixed(2)} ${(cx + half).toFixed(2)} ${rightY.toFixed(2)}`,
    `Q ${cx.toFixed(2)} ${bottom.toFixed(2)} ${(cx - half).toFixed(2)} ${leftY.toFixed(2)}`,
    'Z',
  ].join(' ');
}

/**
 * One lid curve: a quadratic between the eye's two corners whose midpoint sits
 * at `mid`. A quadratic's midpoint is halfway between the ends and the control
 * point, so the control is `2 * mid - corner`.
 *
 * `direction` is -1 for the upper lid and 1 for the lower one; the two share
 * their corners, so the eye is an almond that closes to a line rather than a
 * rectangle that shrinks.
 */
function lidCurve(side: -1 | 1, corner: number, mid: number, direction: -1 | 1): string {
  const cx = CX + side * EYE_DX;
  const x1 = cx - EYE_RX * direction;
  const x2 = cx + EYE_RX * direction;
  const control = 2 * mid - corner;
  return `M ${x1.toFixed(2)} ${corner.toFixed(2)} Q ${cx.toFixed(2)} ${control.toFixed(2)} ${x2.toFixed(2)} ${corner.toFixed(2)}`;
}

/** The two lid curves joined into the shape that clips the eyeball. */
function eyeClipPath(side: -1 | 1, corner: number, top: number, bottom: number): string {
  const upper = lidCurve(side, corner, top, -1);
  const lower = lidCurve(side, corner, bottom, 1);
  return `${upper} ${lower.replace(/^M[^Q]+/, '')} Z`;
}

// --- Poses -----------------------------------------------------------------

interface Pose {
  browLift: number;
  /** Positive raises the inner end (concern); negative lowers it (a frown). */
  browTilt: number;
  browArch: number;
  eyeOpen: number;
  /** 0-1, the lower lid pushing up: the shape of a real smile. */
  squint: number;
  smile: number;
  /** Horizontal pull on the mouth: the "hmm" that a symmetric frown cannot say. */
  skew: number;
  blush: number;
  gaze: AvatarGaze;
  tilt: number;
  ring: number;
  dots: number;
}

const REST: Pose = {
  browLift: 0,
  browTilt: 0,
  browArch: 8,
  eyeOpen: 1,
  squint: 0,
  // The face is never quite flat: a resting mouth with no upturn reads as
  // disapproval, which is the last thing a tutor's neutral should say.
  smile: 0.62,
  skew: 0,
  blush: 0,
  gaze: CENTER_GAZE,
  tilt: 0,
  ring: 0,
  dots: 0,
};

function poseFor(state: AvatarState, expression: AvatarInputs['expression']): Pose {
  const pose: Pose = { ...REST, gaze: { ...REST.gaze } };
  switch (state) {
    case 'listening':
      Object.assign(pose, {
        browLift: 5,
        browArch: 8,
        eyeOpen: 1.12,
        smile: 0.4,
        tilt: -5,
        ring: 0.55,
      });
      break;
    case 'thinking':
      Object.assign(pose, {
        browLift: 3,
        browTilt: 2.5,
        browArch: 4,
        eyeOpen: 0.9,
        smile: 0.05,
        skew: -0.9,
        gaze: { x: -0.5, y: -0.55 },
        tilt: 5,
        dots: 1,
      });
      break;
    case 'speaking':
      Object.assign(pose, { browLift: 1.5, smile: 0.32 });
      break;
    case 'at-whiteboard':
      Object.assign(pose, { browLift: 3, eyeOpen: 1.05, smile: 0.28, tilt: 4 });
      break;
    case 'reacting':
    case 'idle':
    default:
      break;
  }
  if (expression === 'smile') {
    Object.assign(pose, { smile: 1.15, browLift: 6, browArch: 9, squint: 0.68, blush: 1, skew: 0 });
  }
  if (expression === 'not-quite') {
    // A soft "not quite", never a scowl: the mouth pulls to one side and the
    // brows lift at their inner ends, which reads as concern rather than
    // disapproval. A symmetric frown reads as being told off.
    Object.assign(pose, {
      smile: -0.4,
      browLift: 1,
      browTilt: 7,
      browArch: 3,
      eyeOpen: 0.96,
      skew: 1.9,
      tilt: 6,
    });
  }
  if (expression === 'curious') {
    Object.assign(pose, {
      browLift: 8,
      browArch: 9,
      eyeOpen: 1.14,
      smile: 0.45,
      skew: 0.8,
      tilt: -7,
    });
  }
  return pose;
}

// --- Driver ----------------------------------------------------------------

export interface SvgRigOptions {
  /** Accessible name for the tile. */
  label?: string;
  /** Test seam: defaults to `window.matchMedia('(prefers-reduced-motion: reduce)')`. */
  reducedMotion?: () => boolean;
  /** Test and preview seam: the animation clock. Defaults to `performance.now()`. */
  clock?: () => number;
  /** Test and preview seam: frame scheduling. Defaults to `requestAnimationFrame`. */
  schedule?: (callback: (t: number) => void) => number;
  cancel?: (handle: number) => void;
  /** Test seam: blink jitter and saccade targets. Defaults to `Math.random`. */
  random?: () => number;
}

const spring = (value: number): SpringState => ({ value, velocity: 0 });

export function createSvgAvatarDriver(
  host: HTMLElement,
  options: SvgRigOptions = {},
): AvatarDriver {
  const label = options.label ?? 'The tutor’s face';
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
  /**
   * A reaction is a timed expression; `set({expression})` is a held one.
   * `null`, not 0: a clock can legitimately read 0 on the frame a reaction
   * starts, and a sentinel that collides with a real timestamp would pin the
   * face in the reaction pose forever.
   */
  let reactionAt: number | null = null;
  let reactionHeld = false;
  let targetMouth = 0;
  let targetGaze: AvatarGaze = CENTER_GAZE;
  let gazeOverridden = false;

  const start = now();
  const blink = createBlinkTrack(start, random);
  const saccade = createSaccadeTrack(start, random);
  const visemes = createVisemeTrack(start);

  // Every animated value is a spring, so nothing arrives linearly.
  let sGazeX = spring(0);
  let sGazeY = spring(0);
  let sBrowLift = spring(0);
  let sBrowTilt = spring(0);
  let sBrowArch = spring(REST.browArch);
  let sEyeOpen = spring(1);
  let sSquint = spring(0);
  let sSmile = spring(REST.smile);
  let sSkew = spring(0);
  let sBlush = spring(0);
  let sTilt = spring(0);
  let sRing = spring(0);
  let sDots = spring(0);
  let sMouthW = spring(VISEME_SHAPES.closed.width);
  let sMouthH = spring(0);

  let lastFrame = start;
  let frame = 0;
  let disposed = false;

  const render = (t: number) => {
    if (disposed) return;
    const reduced = readReducedMotion();
    const dt = clamp(t - lastFrame, 0, 120);
    lastFrame = t;

    let drive = 0;
    if (reactionAt !== null) {
      const elapsed = t - reactionAt;
      if (reactionHeld) {
        drive = 1;
      } else {
        drive = reactionDrive(elapsed, REACTION_MS, reduced);
        if (elapsed >= reactionTotalMs(REACTION_MS, reduced)) {
          reactionAt = null;
          expression = 'neutral';
          if (state === 'reacting') state = 'idle';
        }
      }
    }

    const pose = poseFor(state, expression);
    // A reaction's drive scales the difference between the resting pose and
    // the reaction pose, so anticipation shows as the face moving slightly the
    // wrong way before it lands.
    const blend = (rest: number, target: number): number =>
      reactionAt === null ? target : rest + (target - rest) * drive;

    const sway = idleSway(t, reduced);
    const eyes = saccade.sample(t, reduced);
    const lids = blink.openness(t, reduced);

    const gaze = gazeOverridden ? targetGaze : pose.gaze;
    sGazeX = stepSpring(sGazeX, gaze.x + eyes.x, SPRING_SETTLE, dt, reduced);
    sGazeY = stepSpring(sGazeY, gaze.y + eyes.y, SPRING_SETTLE, dt, reduced);
    sBrowLift = stepSpring(sBrowLift, blend(REST.browLift, pose.browLift), SPRING_POP, dt, reduced);
    sBrowTilt = stepSpring(
      sBrowTilt,
      blend(REST.browTilt, pose.browTilt),
      SPRING_SETTLE,
      dt,
      reduced,
    );
    sBrowArch = stepSpring(
      sBrowArch,
      blend(REST.browArch, pose.browArch),
      SPRING_SETTLE,
      dt,
      reduced,
    );
    sEyeOpen = stepSpring(sEyeOpen, blend(REST.eyeOpen, pose.eyeOpen), SPRING_SETTLE, dt, reduced);
    sSquint = stepSpring(sSquint, blend(0, pose.squint), SPRING_POP, dt, reduced);
    sSmile = stepSpring(sSmile, blend(REST.smile, pose.smile), SPRING_POP, dt, reduced);
    sSkew = stepSpring(sSkew, blend(0, pose.skew), SPRING_SETTLE, dt, reduced);
    sBlush = stepSpring(sBlush, blend(0, pose.blush), SPRING_SETTLE, dt, reduced);
    sTilt = stepSpring(sTilt, blend(0, pose.tilt), SPRING_SETTLE, dt, reduced);
    sRing = stepSpring(sRing, reduced ? 0 : pose.ring, SPRING_SETTLE, dt, reduced);
    sDots = stepSpring(sDots, pose.dots, SPRING_SETTLE, dt, reduced);

    // Mouth: a held shape, morphed toward on a spring.
    const level = state === 'speaking' ? targetMouth : 0;
    const shape = VISEME_SHAPES[visemes.step(t, level, reduced)];
    sMouthW = stepSpring(sMouthW, shape.width, SPRING_SETTLE, dt, reduced);
    sMouthH = stepSpring(sMouthH, shape.height, SPRING_POP, dt, reduced);

    // --- head transform ---
    const speechBob = reduced ? 0 : -(sMouthH.value / 30) * 1.8;
    const squash = squashStretch(drive * 0.9 + sway.breath * 0.12, reduced);
    const tx = sGazeX.value * 6 + sway.sway;
    const ty = sGazeY.value * 4 + sway.bob + speechBob;
    const tilt = sTilt.value + sway.tilt + sGazeX.value * 2.5;
    nodes.stage.setAttribute(
      'transform',
      `translate(${tx.toFixed(2)} ${ty.toFixed(2)}) rotate(${tilt.toFixed(2)} ${CX} ${CHIN_Y})`,
    );
    nodes.head.setAttribute(
      'transform',
      `translate(${CX} ${CHIN_Y}) scale(${squash.sx.toFixed(4)} ${squash.sy.toFixed(4)}) translate(${-CX} ${-CHIN_Y})`,
    );
    nodes.shadow.setAttribute('rx', String((62 / squash.sx).toFixed(2)));
    nodes.shadow.setAttribute('opacity', String((0.1 * squash.sx).toFixed(3)));

    // --- eyes ---
    const open = clamp(sEyeOpen.value, 0, 1.25) * lids;
    const squint = clamp01(sSquint.value);
    const gy = clamp(sGazeY.value, -1, 1);
    const irisX = clamp(sGazeX.value, -1, 1) * (EYE_RX - IRIS_R - 1);
    const irisY = gy * (EYE_RY - IRIS_R - 3) * 0.75;
    // Lids track the gaze: without this, looking up bares the sclera under the
    // iris and the face reads as eyes rolling back.
    const lidFollow = gy * 5;
    const shut = 1 - clamp01(open);
    const corner = EYE_Y + lidFollow * 0.7;
    const top = corner - (EYE_RY - LID_REST) * (1 - shut);
    const bottom = corner + (EYE_RY - squint * SQUINT_RISE) * (1 - shut);
    for (const [side, eye] of [
      [-1, nodes.left],
      [1, nodes.right],
    ] as const) {
      eye.clip.setAttribute('d', eyeClipPath(side, corner, top, bottom));
      eye.iris.setAttribute('transform', `translate(${irisX.toFixed(2)} ${irisY.toFixed(2)})`);
      eye.lid.setAttribute('d', lidCurve(side, corner, top, -1));
      eye.lower.setAttribute('d', lidCurve(side, corner, bottom, 1));
      // Only a squint draws a lower lid. Drawn at rest it reads as an eye bag.
      eye.lower.setAttribute('opacity', (squint * 0.7).toFixed(3));
      // The right brow rests a little higher than the left one, always.
      const lift = sBrowLift.value + (side === 1 ? BROW_REST_TILT : 0);
      eye.brow.setAttribute('d', browPath(side, lift, sBrowTilt.value, sBrowArch.value));
    }

    nodes.blush.setAttribute('opacity', (clamp01(sBlush.value) * 0.5).toFixed(3));
    nodes.mouth.setAttribute(
      'd',
      mouthPath(sMouthW.value, Math.max(0, sMouthH.value), sSmile.value, sSkew.value),
    );

    const pulse = reduced ? 1 : 0.62 + 0.38 * Math.sin(t / 1_100);
    nodes.ring.setAttribute('opacity', (clamp01(sRing.value) * pulse).toFixed(3));
    nodes.ring.setAttribute('r', (118 + (reduced ? 0 : Math.sin(t / 1_100) * 5)).toFixed(2));
    nodes.dots.setAttribute('opacity', clamp01(sDots.value).toFixed(3));
    if (sDots.value > 0.01) {
      nodes.dot.forEach((node, index) => {
        const wave = reduced ? 0.55 : 0.3 + 0.6 * Math.abs(Math.sin(t / 330 - index * 0.8));
        node.setAttribute('opacity', wave.toFixed(3));
      });
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
      if (next !== 'at-whiteboard' && !gazeOverridden) targetGaze = CENTER_GAZE;
    },
    setMouth(value) {
      targetMouth = clamp01(value);
    },
    setGaze(gaze) {
      gazeOverridden = true;
      targetGaze = { x: clamp(gaze.x, -1, 1), y: clamp(gaze.y, -1, 1) };
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
      blink.trigger(reactionAt);
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
