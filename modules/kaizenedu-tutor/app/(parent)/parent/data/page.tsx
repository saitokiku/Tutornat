import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { PRODUCT } from '@/kaizen.config';
import { PRODUCT_ROUTES } from '@/lib/tutor/contracts';

import { DataPanel } from '@/components/tutor/parent/data';
import { loadShellState } from '@/components/tutor/shell/shell-state';
import { LoadingState, NotConfiguredState } from '@/components/tutor/shell/states';

export const metadata: Metadata = {
  title: `Data and deletion: ${PRODUCT.workingName}`,
  description: 'Export everything the product holds, or delete a profile or the account.',
};

export default async function DataPage() {
  const state = await loadShellState();
  if (state.status !== 'signed_in') return <NotConfiguredState area="database" />;

  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="nt-h1">Data and deletion</h1>
        <p className="nt-lead">
          Everything the product holds about a learner can be read, downloaded, and deleted from
          this page. What is collected and how long it is kept is set out in the{' '}
          <Link href={PRODUCT_ROUTES.legalPrivacy} className="underline underline-offset-4">
            privacy policy
          </Link>
          .
        </p>
      </header>
      <Suspense fallback={<LoadingState label="Loading" lines={5} />}>
        <DataPanel learners={state.session.learners} />
      </Suspense>
    </>
  );
}
