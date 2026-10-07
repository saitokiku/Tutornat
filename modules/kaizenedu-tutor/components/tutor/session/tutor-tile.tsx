'use client';

import { publicConfig } from '@/kaizen.config';
import type { AvatarState, ReactionKind } from '@/lib/tutor/contracts';

import { AvatarFace } from '@/components/tutor/avatar/avatar-face';
import type { AvatarGaze } from '@/components/tutor/avatar/driver';

import type { BackchannelCue } from '@/lib/tutor/presence';

export type TilePhase = 'idle' | 'listening' | 'thinking' | 'speaking';

/** What the learner reads under the presence when nothing is being said. */
const PHASE_WORD: Record<TilePhase, string> = {
  idle: 'Ready',
  listening: 'Listening',
  thinking: 'Thinking',
  speaking: 'Speaking',
};

/**
 * The words on the tile (D36): the tutor's current sentence while it speaks,
 * or the learner's own words, quieter, while the tutor is thinking about
 * them. A wrong hearing is visible straight away instead of being discovered
 * when the tutor answers the wrong thing.
 */
export interface TileCaption {
  who: 'tutor' | 'learner';
  text: string;
}

export function avatarStateFor(phase: TilePhase, drawing: boolean): AvatarState {
  if (drawing) return 'at-whiteboard';
  return phase;
}

/** The last two minutes are digits; before that, whole minutes; after, plain words. */
export function timeLeftLabel(
  elapsedMs: number,
  budgetMs: number,
): { text: string; urgent: boolean } {
  const remaining = budgetMs - elapsedMs;
  if (remaining <= 0) return { text: 'Time is up', urgent: true };
  if (remaining < 2 * 60_000) {
    const total = Math.ceil(remaining / 1000);
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return { text: `${minutes}:${String(seconds).padStart(2, '0')} left`, urgent: true };
  }
  return { text: `${Math.ceil(remaining / 60_000)} min left`, urgent: false };
}

export interface TutorTileProps {
  phase: TilePhase;
  drawing: boolean;
  gaze: AvatarGaze;
  amplitude: () => number;
  reaction: { kind: ReactionKind; at: number } | null;
  elapsedMs: number;
  budgetMs: number;
  cue: BackchannelCue | null;
  caption: TileCaption | null;
}

/**
 * The tutor: its name beside the one always-visible AI label, the presence,
 * the caption, and how much time is left in words. No clock counting down in
 * a child's face, no camera row (the camera is off; the privacy page says
 * so), no second or third AI label (spec §5.10 A; D36, D37).
 */
export function TutorTile({
  phase,
  drawing,
  gaze,
  amplitude,
  reaction,
  elapsedMs,
  budgetMs,
  cue,
  caption,
}: TutorTileProps) {
  const name = publicConfig.product.tutorName;
  const time = timeLeftLabel(elapsedMs, budgetMs);
  return (
    <section
      className="nt-tile nt-tutor"
      aria-label={`${name}, ${publicConfig.product.aiLabel}`}
      data-phase={phase}
    >
      <div className="nt-tutor-stage">
        <AvatarFace
          state={avatarStateFor(phase, drawing)}
          gaze={gaze}
          amplitude={amplitude}
          reaction={reaction}
          label={`${name}, ${PHASE_WORD[phase].toLowerCase()}`}
        />
        {cue ? (
          <span className="nt-cue" aria-hidden="true">
            {cue}
          </span>
        ) : null}
      </div>
      <div className="nt-tutor-words">
        <p className="nt-caption" data-who={caption?.who ?? 'none'} aria-hidden="true">
          {caption ? caption.text : PHASE_WORD[phase]}
        </p>
        <span className="sr-only" role="status" aria-live="polite">
          {PHASE_WORD[phase]}
        </span>
      </div>
      <div className="nt-tile-bar nt-tutor-bar">
        <span className="nt-tutor-name">{name}</span>
        <span className="nt-ai-label">{publicConfig.product.aiLabel}</span>
        <span className="nt-timeleft nt-num" data-urgent={time.urgent ? 'true' : 'false'}>
          <span className="sr-only">Time in this session: </span>
          {time.text}
        </span>
      </div>
    </section>
  );
}
