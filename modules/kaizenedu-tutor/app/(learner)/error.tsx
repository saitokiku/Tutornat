'use client';

import Link from 'next/link';

import { PRODUCT_ROUTES } from '@/lib/tutor/contracts';

import { BareShell } from '@/components/tutor/shell/app-shell';
import { NtButton } from '@/components/tutor/ui/button';

/**
 * Error boundary for the learner routes. Shows the error digest (an id, never
 * the message, which could carry a transcript fragment) and a way back.
 */
export default function LearnerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <BareShell>
      <div className="nt-panel flex flex-col gap-3 p-6" role="alert">
        <h1 className="nt-h2">Something went wrong</h1>
        <p className="nt-body text-muted-foreground">
          The page could not be shown. Trying again usually works; if it keeps happening, sign out
          and back in.
        </p>
        {error.digest ? <p className="nt-small nt-mono">Reference {error.digest}</p> : null}
        <div className="flex flex-wrap gap-3">
          <NtButton onClick={() => reset()}>Try again</NtButton>
          <NtButton asChild tone="secondary">
            <Link href={PRODUCT_ROUTES.learn}>Go to Learn</Link>
          </NtButton>
        </div>
      </div>
    </BareShell>
  );
}
