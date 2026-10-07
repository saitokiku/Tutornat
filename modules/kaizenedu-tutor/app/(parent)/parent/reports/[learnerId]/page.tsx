import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PRODUCT } from '@/kaizen.config';
import { bandLabel } from '@/lib/tutor/client';
import { DbNotConfiguredError, getTutorDb } from '@/lib/tutor/db';
import { skillById } from '@/lib/tutor/graph';
import { listMasteryRows, toSkillMastery } from '@/lib/tutor/model';
import { REPORT_MASTERY_NOTE } from '@/lib/tutor/report';

import { ReportView, type NextCheck } from '@/components/tutor/parent/report-view';
import { PARENT_ROUTES } from '@/components/tutor/shell/nav';
import { loadShellState } from '@/components/tutor/shell/shell-state';
import { NotConfiguredState } from '@/components/tutor/shell/states';
import { NtButton } from '@/components/tutor/ui/button';
import { Pill } from '@/components/tutor/ui/section';

export const metadata: Metadata = {
  title: `Report: ${PRODUCT.workingName}`,
  description: 'Per-skill estimates, confirmations, habits, and session notes for one learner.',
};

/**
 * The soonest delayed unaided check still owed (spec D17). It lives in
 * `skill_mastery.next_check_at`, which the report payload does not carry, so
 * the page reads it here under the account id from the session.
 */
async function loadNextCheck(accountId: string, learnerId: string): Promise<NextCheck | null> {
  try {
    const rows = await listMasteryRows(await getTutorDb(), accountId, learnerId);
    const due = rows
      .map(toSkillMastery)
      .filter((row) => row.nextCheckAt !== null)
      .sort((a, b) => (a.nextCheckAt ?? '').localeCompare(b.nextCheckAt ?? ''));
    const soonest = due[0];
    if (!soonest?.nextCheckAt) return null;
    return {
      skillName: skillById(soonest.skillId)?.name ?? soonest.skillId,
      dueAt: soonest.nextCheckAt,
    };
  } catch (error) {
    if (error instanceof DbNotConfiguredError) return null;
    throw error;
  }
}

export default async function LearnerReportPage({
  params,
}: {
  params: Promise<{ learnerId: string }>;
}) {
  const { learnerId } = await params;
  const state = await loadShellState();
  if (state.status !== 'signed_in') return <NotConfiguredState area="database" />;
  const learner = state.session.learners.find((entry) => entry.id === learnerId);
  if (!learner) notFound();
  const nextCheck = await loadNextCheck(state.principal.accountId, learner.id);

  return (
    <>
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="nt-h1">{learner.displayName}</h1>
          <Pill tone="brand">{bandLabel(learner.band)}</Pill>
        </div>
        <div className="flex flex-wrap gap-2">
          <NtButton asChild tone="secondary" size="sm">
            <Link href={`${PARENT_ROUTES.transcripts}?learnerId=${learner.id}`}>
              Read the transcripts
            </Link>
          </NtButton>
          <NtButton asChild tone="ghost" size="sm">
            <Link href={`${PARENT_ROUTES.data}?learnerId=${learner.id}`}>Export or delete</Link>
          </NtButton>
        </div>
      </header>
      <ReportView learner={learner} nextCheck={nextCheck} masteryNote={REPORT_MASTERY_NOTE} />
    </>
  );
}
