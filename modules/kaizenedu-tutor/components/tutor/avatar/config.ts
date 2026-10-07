/**
 * The configuration seam between the built-in SVG rig and a commissioned Rive
 * character (`rive-rig.ts`).
 *
 * Nothing here is a secret; these are public build-time values, inlined into
 * the client bundle by Next. With none of them set the product ships the
 * abstract presence (`resolvePresence`, at the foot of this file), which is
 * the default and is complete on its own.
 *
 * - `NEXT_PUBLIC_TUTOR_PRESENCE`     `presence` (default) | `character` |
 *                                    `rive`. See `resolvePresence` below for
 *                                    why the default is what it is.
 * - `NEXT_PUBLIC_RIVE_AVATAR_SRC`    URL of the `.riv` file (same-origin, e.g.
 *                                    `/avatar/tutor.riv`). Unset means "no
 *                                    commissioned character"; setting it is
 *                                    still the switch that brings one in.
 * - `NEXT_PUBLIC_RIVE_STATE_MACHINE` name of the state machine inside it.
 * - `NEXT_PUBLIC_RIVE_ARTBOARD`      artboard name, when the file has several.
 * - `NEXT_PUBLIC_RIVE_RUNTIME_URL`   URL of a `@rive-app/canvas` build, for
 *                                    trying the rig before the package is a
 *                                    dependency. Once it is one, delete this
 *                                    and replace `defaultRiveRuntime` in
 *                                    `rive-rig.ts` with a static import.
 *
 * `components/tutor/avatar/README.md` documents what the `.riv` must expose.
 */

export const RIVE_AVATAR_SRC = process.env.NEXT_PUBLIC_RIVE_AVATAR_SRC ?? '';
export const RIVE_STATE_MACHINE = process.env.NEXT_PUBLIC_RIVE_STATE_MACHINE ?? 'Tutor';
export const RIVE_ARTBOARD = process.env.NEXT_PUBLIC_RIVE_ARTBOARD ?? '';
export const RIVE_RUNTIME_URL = process.env.NEXT_PUBLIC_RIVE_RUNTIME_URL ?? '';
/** Read at module scope, like the Rive values, so Next inlines it literally. */
export const TUTOR_PRESENCE = process.env.NEXT_PUBLIC_TUTOR_PRESENCE ?? '';

/** True when a character file is configured. Nothing else may branch on the env. */
export function hasRiveAvatar(): boolean {
  return RIVE_AVATAR_SRC.length > 0;
}

/**
 * The names the `.riv` state machine must expose. They are the whole contract
 * between the illustrator's file and `AvatarDriver`; an artist can rename
 * nothing here without changing this list.
 */
export const RIVE_INPUTS = {
  /** Number, 0-5, in the order of `AvatarState`. */
  state: 'state',
  /** Number, 0-100: mouth openness, or a viseme weight. */
  mouth: 'mouth',
  /** Numbers, -100 to 100. +100 x is the whiteboard, +100 y is down. */
  gazeX: 'gazeX',
  gazeY: 'gazeY',
  /** Number, 0-3: neutral, smile, not-quite, curious. */
  expression: 'expression',
  /** Triggers, for the one-shot reaction with its own anticipation and settle. */
  reactSmile: 'reactSmile',
  reactNotQuite: 'reactNotQuite',
  /** Boolean: the file drops idle motion and overshoot when this is true. */
  reducedMotion: 'reducedMotion',
} as const;

/** `state` input values, in `AvatarState` order. */
export const RIVE_STATE_VALUES = [
  'idle',
  'listening',
  'thinking',
  'speaking',
  'at-whiteboard',
  'reacting',
] as const;

/** `expression` input values. */
export const RIVE_EXPRESSION_VALUES = ['neutral', 'smile', 'not-quite', 'curious'] as const;

// ---------------------------------------------------------------------------
// Which presence the session screen shows
// ---------------------------------------------------------------------------

/**
 * The three things the tutor can be on screen.
 *
 * - `presence`  the abstract luminous form (`presence-rig.ts`).
 * - `character` the built-in SVG character (`svg-rig.ts`).
 * - `rive`      a commissioned `.riv` character, with the SVG character as the
 *               stand-in while it loads and as the fallback if it never does.
 */
export type PresenceKind = 'presence' | 'character' | 'rive';

export const PRESENCE_KINDS: readonly PresenceKind[] = ['presence', 'character', 'rive'];

/**
 * **The default is `presence`, and this is the one place that decides it.**
 *
 * The character rig is mechanically sound — pupils that track, asymmetric
 * blinks, viseme mouth shapes, spring easing — and it was still rejected as
 * "weird" twice. A procedurally drawn face cannot reliably clear the uncanny
 * valley, because every learner who looks at it compares it to a real face and
 * we have no illustrator to win that comparison with. An abstract presence is
 * never compared to anything, so it cannot be creepy; it ships.
 *
 * The character rig is kept, not deleted, because two things could justify
 * switching back and both are evidence we do not have yet: a commissioned
 * character (then `rive`), or the five-kid test at Gate 2 (presence-45) coming
 * back in the character's favour (then `character`). `README.md` in this
 * folder records what that would take.
 *
 * `NEXT_PUBLIC_TUTOR_PRESENCE` is a public build-time value like the Rive
 * ones; an unrecognised or absent value falls back to the default rather than
 * failing, because a typo in an env var must not cost a learner their tutor.
 */
export function resolvePresence(raw: string | undefined = TUTOR_PRESENCE): PresenceKind {
  const value = (raw ?? '').trim().toLowerCase();
  return PRESENCE_KINDS.find((kind) => kind === value) ?? 'presence';
}

/**
 * Which locally drawn rig backs a presence. `rive` resolves to the character
 * because a commissioned character is a character: it is what should be on
 * screen while the asset downloads, and what should stay if it never arrives.
 */
export function localRigFor(kind: PresenceKind): 'presence' | 'character' {
  return kind === 'presence' ? 'presence' : 'character';
}
