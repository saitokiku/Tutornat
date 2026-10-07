'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { auth, learnerStatusLabel } from '@/lib/tutor/client';
import type { Learner } from '@/lib/tutor/contracts';
import { cn } from '@/lib/utils';

/**
 * Picks the active learner profile for this sign-in (POST /api/tutor/auth/learner)
 * and refreshes the server-rendered shell so every page sees the new principal.
 */
export function LearnerSwitcher({
  learners,
  selectedId,
  size = 'sm',
  className,
}: {
  learners: Learner[];
  selectedId: string | null;
  size?: 'sm' | 'lg';
  className?: string;
}) {
  const id = useId();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose(learnerId: string) {
    if (!learnerId || learnerId === selectedId) return;
    setBusy(true);
    setError(null);
    const result = await auth.selectLearner({ learnerId });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      toast.error(result.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={id} className={size === 'lg' ? 'font-medium' : 'sr-only'}>
        Learner
      </label>
      <select
        id={id}
        value={selectedId ?? ''}
        disabled={busy}
        onChange={(event) => void choose(event.target.value)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          'rounded-(--radius) border border-input bg-card text-foreground shadow-xs disabled:opacity-60 dark:bg-input/30',
          size === 'lg' ? 'nt-target px-3 text-[length:var(--nt-text-body)]' : 'h-9 px-2 text-sm',
        )}
      >
        <option value="" disabled>
          Choose a learner
        </option>
        {learners.map((learner) => (
          <option key={learner.id} value={learner.id} disabled={learner.status !== 'active'}>
            {learner.status === 'active'
              ? learner.displayName
              : `${learner.displayName} (${learnerStatusLabel(learner.status).toLowerCase()})`}
          </option>
        ))}
      </select>
      {error ? (
        <p id={`${id}-error`} role="alert" className="nt-small text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
