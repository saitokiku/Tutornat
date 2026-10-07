import type { Metadata } from 'next';
import Link from 'next/link';

import { PLAN, PRODUCT } from '@/kaizen.config';
import { getEntitlement } from '@/lib/tutor/billing';
import { formatMinutes, formatMoney, pluralize, summarizeLearning } from '@/lib/tutor/client';
import type { Entitlement, Learner } from '@/lib/tutor/contracts';
import { PRODUCT_ROUTES } from '@/lib/tutor/contracts';
import { DbNotConfiguredError, getTutorDb } from '@/lib/tutor/db';
import { isPreviewMode, previewEntitlement, previewReport } from '@/lib/tutor/preview';
import { buildParentReport } from '@/lib/tutor/report';

import { ParentOverview, type LearnerSummaries } from '@/components/tutor/parent/overview';
import { SafetyPanel } from '@/components/tutor/parent/safety';
import { PreviewBanner } from '@/components/tutor/preview/banner';
import { PARENT_ROUTES } from '@/components/tutor/shell/nav';
import { loadShellState } from '@/components/tutor/shell/shell-state';
import { NotConfiguredState } from '@/components/tutor/shell/states';
import { NtButton } from '@/components/tutor/ui/button';
import { DataList } from '@/components/tutor/ui/section';

export const metadata: Metadata = {
  title: `Parent dashboard: ${PRODUCT.workingName}`,
  description: 'What your learners did, how their data is handled, and what the plan costs.',
};

interface AccountData {
  entitlement: Entitlement;
  /** One plain-language summary per learner, keyed by learner id. */
  summaries: LearnerSummaries;
}

/**
 * The reads this page needs, all keyed by the server-derived account id and
 * never by anything from the request (invariant a). The per-learner summary
 * is the answer to "is my child learning?", so it is on the first screen
 * rather than one click away.
 */
async function loadAccountData(
  accountId: string,
  learners: readonly Learner[],
): Promise<AccountData | null> {
  if (isPreviewMode()) {
    const summaries: LearnerSummaries = {};
    for (const learner of learners) summaries[learner.id] = summarizeLearning(previewReport);
    return { entitlement: previewEntitlement, summaries };
  }
  try {
    const db = await getTutorDb();
    const [entitlement, reports] = await Promise.all([
      getEntitlement(db, accountId),
      Promise.all(
        learners.map(async (learner) => ({
          id: learner.id,
          report: await buildParentReport(db, accountId, learner.id),
        })),
      ),
    ]);
    const summaries: LearnerSummaries = {};
    for (const { id, report } of reports) summaries[id] = summarizeLearning(report);
    return { entitlement, summaries };
  } catch (error) {
    if (error instanceof DbNotConfiguredError) return null;
    throw error;
  }
}

function planLabel(entitlement: Entitlement): string {
  switch (entitlement.status) {
    case 'trial':
      return 'Free trial, no card';
    case 'active':
      return `Monthly, ${formatMoney(PLAN.priceCentsMonthly)}`;
    case 'past_due':
      return 'Monthly, payment failed';
    case 'canceled':
      return 'Canceled';
  }
}

export default async function ParentPage() {
  const state = await loadShellState();
  if (state.status !== 'signed_in') return <NotConfiguredState area="database" />;
  const { principal, session } = state;
  const data = await loadAccountData(principal.accountId, session.learners);
  if (!data) return <NotConfiguredState area="database" />;
  const { entitlement } = data;

  return (
    <>
      <PreviewBanner />
      <header className="flex flex-col gap-2">
        <h1 className="nt-h1">Your account</h1>
        <p className="nt-lead">
          Signed in as {session.account.displayName} ({session.account.email}). What each learner
          did, how their data is handled, and what the plan costs.
        </p>
      </header>

      <ParentOverview
        initialLearners={session.learners}
        maxProfiles={PLAN.learnerProfiles}
        summaries={data.summaries}
      />

      <SafetyPanel learners={session.learners} />

      <section aria-labelledby="plan-title" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 id="plan-title" className="nt-h2">
              What this costs
            </h2>
            <p className="nt-small max-w-[68ch]">
              One plan for the whole account with pooled minutes. Sessions stop at the cap; nothing
              is charged beyond the plan, and cancelling is one click in the portal.
            </p>
          </div>
          <NtButton asChild tone="secondary" size="sm">
            <Link href={PARENT_ROUTES.billing}>Billing and plan</Link>
          </NtButton>
        </div>
        <div className="nt-panel p-4 sm:p-6">
          <DataList
            items={[
              { label: 'Plan', value: planLabel(entitlement) },
              {
                label: 'Price',
                value: (
                  <span className="nt-num">{formatMoney(PLAN.priceCentsMonthly)} a month</span>
                ),
              },
              {
                label: 'Minutes left',
                value: (
                  <span className="nt-num">{formatMinutes(entitlement.remainingMinutes)}</span>
                ),
              },
              {
                label: 'Minutes used',
                value: (
                  <span className="nt-num">
                    {formatMinutes(
                      entitlement.status === 'trial'
                        ? entitlement.trialMinutesUsed
                        : entitlement.usedMinutes,
                    )}{' '}
                    of {formatMinutes(entitlement.pooledMinutes)}
                  </span>
                ),
              },
              { label: 'Profiles included', value: pluralize(PLAN.learnerProfiles, 'profile') },
              {
                label: 'Learner app',
                value: (
                  <Link href={PRODUCT_ROUTES.learn} className="underline underline-offset-4">
                    Open the learner dashboard
                  </Link>
                ),
              },
            ]}
          />
        </div>
      </section>
    </>
  );
}
