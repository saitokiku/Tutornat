/**
 * The avatar seam (spec §5.10 A; R31).
 *
 * The orchestrator drives a face through this interface and nothing else, so
 * the 2D SVG rig in `svg-rig.ts` can be replaced by a Rive rig, a Lottie rig,
 * or a 3D VRM one without touching the session screen. The methods are
 * imperative on purpose: mouth amplitude arrives at frame rate from the
 * playback queue's analyser, and routing that through React state would
 * re-render the screen sixty times a second.
 *
 * `AvatarState`, `AvatarInputs`, and `ReactionKind` come from
 * `lib/tutor/contracts.ts`; this file adds only the driver.
 */
import type { AvatarInputs, AvatarState, ReactionKind } from '@/lib/tutor/contracts';

export type { AvatarInputs, AvatarState };

export interface AvatarGaze {
  /** -1 (hard left) to 1 (hard right); the whiteboard sits at +1. */
  x: number;
  /** -1 (up) to 1 (down). */
  y: number;
}

export interface AvatarDriver {
  /** Which of the six states the face is in. */
  setState(state: AvatarState): void;
  /** 0-1 mouth openness, from the playback queue's amplitude. */
  setMouth(value: number): void;
  setGaze(gaze: AvatarGaze): void;
  /** A proportionate reaction that decays on its own: a smile, or a soft "not quite". */
  react(kind: ReactionKind): void;
  /** Convenience for setting several inputs at once (the `AvatarInputs` shape). */
  set(inputs: Partial<AvatarInputs>): void;
  /** Stop the animation loop and detach from the host element. */
  dispose(): void;
}

/** How long a reaction shows before the face returns to its state's expression. */
export const REACTION_MS = 1_400;

/** Where the face looks when the whiteboard is being drawn on. */
export const BOARD_GAZE: AvatarGaze = { x: 0.85, y: 0.15 };
export const CENTER_GAZE: AvatarGaze = { x: 0, y: 0 };

export function expressionFor(kind: ReactionKind): AvatarInputs['expression'] {
  if (kind === 'smile') return 'smile';
  if (kind === 'not_quite') return 'not-quite';
  return 'neutral';
}
