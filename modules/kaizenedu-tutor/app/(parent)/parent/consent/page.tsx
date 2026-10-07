import { Suspense } from 'react';
import type { Metadata } from 'next';

import { PRODUCT } from '@/kaizen.config';

import { ConsentPanel } from '@/components/tutor/parent/consent';
import { NoLearnersState } from '@/components/tutor/parent/learner-picker';
import { loadShellState } from '@/components/tutor/shell/shell-state';
import { LoadingState, NotConfiguredState } from '@/components/tutor/shell/states';

export const metadata: Metadata = {
  title: `Consent: ${PRODUCT.workingName}`,
  description: 'The notice, the consent record, and how to revoke it.',
};

export default async function ConsentPage() {
  const state = await loadShellState();
  if (state.status !== 'signed_in') return <NotConfiguredState area="database" />;
  const learners = state.session.learners;

  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="nt-h1">Consent</h1>
        <p className="nt-lead">
          The notice comes first, then the checkbox. The camera is asked for separately and never
          bundled with anything else.
        </p>
      </header>
      {learners.length === 0 ? (
        <NoLearnersState />
      ) : (
        <Suspense fallback={<LoadingState label="Loading consent" lines={5} />}>
          <ConsentPanel learners={learners} />
        </Suspense>
      )}
    </>
  );
}
