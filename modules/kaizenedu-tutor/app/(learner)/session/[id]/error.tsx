'use client';

import Link from 'next/link';

import { PRODUCT_ROUTES } from '@/lib/tutor/contracts';

import { BareShell } from '@/components/tutor/shell/app-shell';
import { NtButton } from '@/components/tutor/ui/button';

/**
 * The session route's error boundary. It shows the digest — an id — and never
 * the message, which could carry a fragment of the transcript (CLAUDE.md: logs
 * and reports carry ids, never transcripts).
 */
export default function SessionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <BareShell>
      <div className="nt-panel flex flex-col gap-3 p-6" role="alert">
        <h1 className="nt-h2">The session could not be opened</h1>
        <p className="nt-body text-muted-foreground">
          Nothing was lost. Trying again usually works; if it does not, go back to Learn and start a
          new session.
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
