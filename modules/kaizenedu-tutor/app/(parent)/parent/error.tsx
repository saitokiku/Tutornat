'use client';

import Link from 'next/link';

import { PRODUCT_ROUTES } from '@/lib/tutor/contracts';

import { NtButton } from '@/components/tutor/ui/button';

/**
 * Error boundary for the parent app. It renders inside the shell, so it is a
 * panel rather than a page, and it shows the digest only: an error message
 * could carry a fragment of a transcript.
 */
export default function ParentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="nt-panel flex flex-col gap-3 p-6" role="alert">
      <h1 className="nt-h2">This page could not be shown</h1>
      <p className="nt-body text-muted-foreground">
        Trying again usually works. If it keeps happening, sign out and back in, and quote the
        reference below.
      </p>
      {error.digest ? <p className="nt-small nt-mono">Reference {error.digest}</p> : null}
      <div className="flex flex-wrap gap-3">
        <NtButton onClick={() => reset()}>Try again</NtButton>
        <NtButton asChild tone="secondary">
          <Link href={PRODUCT_ROUTES.parent}>Back to the dashboard</Link>
        </NtButton>
      </div>
    </div>
  );
}
