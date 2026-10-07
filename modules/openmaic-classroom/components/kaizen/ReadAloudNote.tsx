'use client';

/**
 * Text accessibility fallback — NOT speech.
 *
 * Voice/narration is deliberately out of scope right now (owner: prove lesson
 * quality and contextual conversation first; voice and podcasts come later).
 * This component therefore does no `speechSynthesis`, no microphone and no
 * audio of any kind.
 *
 * What it does keep is the accessibility job that mattered: making the page's
 * own instruction text explicitly available and programmatically associated,
 * so a screen reader or a helper reading over someone's shoulder has one place
 * to find "what this screen is asking". When voice lands, this is the hook it
 * attaches to.
 */

import { Info } from 'lucide-react';

import { cn } from '@/lib/utils';

export function ReadAloudNote({
  text,
  className,
}: {
  readonly text: string;
  readonly className?: string;
}) {
  if (!text.trim()) return null;
  return (
    <p
      // `note` role + polite region: announced on arrival without stealing focus.
      role="note"
      className={cn(
        'flex items-start gap-2 text-sm leading-relaxed text-muted-foreground',
        className,
      )}
    >
      <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{text}</span>
    </p>
  );
}
