import { Suspense } from 'react';
import type { Metadata } from 'next';

import { PRODUCT } from '@/kaizen.config';

import { NoLearnersState } from '@/components/tutor/parent/learner-picker';
import { TranscriptReader } from '@/components/tutor/parent/transcripts';
import { loadShellState } from '@/components/tutor/shell/shell-state';
import { LoadingState, NotConfiguredState } from '@/components/tutor/shell/states';

export const metadata: Metadata = {
  title: `Transcripts: ${PRODUCT.workingName}`,
  description: 'Every turn of every session, readable by the account holder.',
};

export default async function TranscriptsPage() {
  const state = await loadShellState();
  if (state.status !== 'signed_in') return <NotConfiguredState area="database" />;
  const learners = state.session.learners;

  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="nt-h1">Transcripts</h1>
        <p className="nt-lead">
          Every session is transcribed and kept. Audio is not: speech is turned into text to answer
          it and the recording is discarded, so the text below is the whole record.
        </p>
      </header>
      {learners.length === 0 ? (
        <NoLearnersState />
      ) : (
        <Suspense fallback={<LoadingState label="Loading transcripts" lines={5} />}>
          <TranscriptReader learners={learners} />
        </Suspense>
      )}
    </>
  );
}
