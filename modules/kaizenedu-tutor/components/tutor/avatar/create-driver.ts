/**
 * Chooses which rig the session screen gets, and is the only place that knows
 * there is more than one.
 *
 * `resolvePresence()` in `config.ts` decides *which* — it is the one place the
 * default lives, and it explains why that default is the abstract presence.
 * This file only acts on the answer.
 *
 * The locally drawn rig — the presence or the character — mounts
 * synchronously, because the learner must not watch an empty tile while an
 * asset downloads. If a Rive character is configured it is fetched in the
 * background; when it arrives, the last inputs are replayed into it and the
 * local rig is disposed, so the swap happens on the state the tutor is
 * actually in rather than back at `idle`. If it never arrives — no source, no
 * runtime, a bad file, a slow network — the local rig simply stays, and
 * nothing above this file can tell the difference.
 */
import type { ReactionKind } from '@/lib/tutor/contracts';

import { hasRiveAvatar, localRigFor, resolvePresence, type PresenceKind } from './config';
import type { AvatarDriver, AvatarGaze, AvatarInputs, AvatarState } from './driver';
import { CENTER_GAZE } from './driver';
import { createPresenceAvatarDriver } from './presence-rig';
import { createRiveAvatarDriver, type RiveRigOptions } from './rive-rig';
import { createSvgAvatarDriver, type SvgRigOptions } from './svg-rig';

export interface AvatarDriverOptions extends SvgRigOptions {
  /**
   * Force one, ignoring `NEXT_PUBLIC_TUTOR_PRESENCE`. The contact sheet at
   * `/eval/avatar` uses this to show all three at once; tests use it to say
   * which rig they mean rather than depending on the deployed default.
   */
  presence?: PresenceKind;
  /** Skip the Rive attempt entirely; the preview page and tests use this. */
  svgOnly?: boolean;
  rive?: RiveRigOptions;
}

interface LastInputs {
  state: AvatarState;
  mouth: number;
  gaze: AvatarGaze;
  expression: AvatarInputs['expression'];
}

export function createAvatarDriver(
  host: HTMLElement,
  options: AvatarDriverOptions = {},
): AvatarDriver {
  const kind = options.presence ?? resolvePresence();
  // Both local rigs take the same option shape — label, reduced motion, clock,
  // scheduler, randomness — so the seam is the function, not the arguments.
  let active: AvatarDriver =
    localRigFor(kind) === 'presence'
      ? createPresenceAvatarDriver(host, options)
      : createSvgAvatarDriver(host, options);
  let disposed = false;
  const last: LastInputs = {
    state: 'idle',
    mouth: 0,
    gaze: CENTER_GAZE,
    expression: 'neutral',
  };

  const riveSrc = options.rive?.src ?? '';
  if (!options.svgOnly && (hasRiveAvatar() || riveSrc.length > 0)) {
    void createRiveAvatarDriver(host, { label: options.label, ...options.rive })
      .then((rive) => {
        if (!rive) return;
        if (disposed) {
          rive.dispose();
          return;
        }
        const previous = active;
        active = rive;
        rive.set({ ...last });
        previous.dispose();
      })
      .catch(() => {
        // The local rig is already on screen and already correct. A character
        // that fails to load is not an error the learner should ever see.
      });
  }

  return {
    setState(state: AvatarState) {
      last.state = state;
      active.setState(state);
    },
    setMouth(value: number) {
      last.mouth = value;
      active.setMouth(value);
    },
    setGaze(gaze: AvatarGaze) {
      last.gaze = gaze;
      active.setGaze(gaze);
    },
    react(kind: ReactionKind) {
      if (kind === 'smile') last.expression = 'smile';
      else if (kind === 'not_quite') last.expression = 'not-quite';
      else last.expression = 'neutral';
      active.react(kind);
    },
    set(inputs) {
      if (inputs.state) last.state = inputs.state;
      if (typeof inputs.mouth === 'number') last.mouth = inputs.mouth;
      if (inputs.gaze) last.gaze = inputs.gaze;
      if (inputs.expression) last.expression = inputs.expression;
      active.set(inputs);
    },
    dispose() {
      disposed = true;
      active.dispose();
    },
  };
}
