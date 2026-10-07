'use client';

import Link from 'next/link';

import { PLAN } from '@/kaizen.config';
import { PRODUCT_ROUTES } from '@/lib/tutor/contracts';
import type { Entitlement } from '@/lib/tutor/contracts';

import { InlineNotice } from '@/components/tutor/shell/states';
import { NtButton } from '@/components/tutor/ui/button';

/**
 * Minutes left on the plan (spec R9, §9). Quiet until 80% of the pool is
 * used, a warning after that, and a hard stop at zero: the session ends and
 * says so plainly, with the number, and no countdown or pressure. A guest's
 * pool is the free daily allowance (D35): the same rule, no parent app to
 * open, and the count starts again tomorrow.
 */
export function EntitlementBanner({ entitlement }: { entitlement: Entitlement | null }) {
  if (!entitlement) return null;
  const { remainingMinutes, pooledMinutes, usedMinutes, status } = entitlement;
  const guest = entitlement.guest === true;

  if (remainingMinutes <= 0) {
    if (guest) {
      return (
        <InlineNotice tone="stop" role="alert" title="Today’s free minutes are used up">
          This session has stopped. {usedMinutes} of {pooledMinutes} minutes are used today. Come
          back tomorrow.
        </InlineNotice>
      );
    }
    return (
      <InlineNotice
        tone="stop"
        role="alert"
        title="No minutes left this period"
        action={
          <NtButton asChild tone="secondary" size="sm">
            <Link href={PRODUCT_ROUTES.parent}>Open the parent app</Link>
          </NtButton>
        }
      >
        This session has stopped. {usedMinutes} of {pooledMinutes} minutes are used. The account
        holder can add minutes or wait for the next period.
      </InlineNotice>
    );
  }

  const used = pooledMinutes === 0 ? 0 : (usedMinutes / pooledMinutes) * 100;
  if (used < PLAN.warnAtPercent && (guest || status !== 'past_due')) return null;

  return (
    <InlineNotice
      tone="warning"
      role="status"
      title={
        guest ? `${remainingMinutes} free minutes left today` : `${remainingMinutes} minutes left`
      }
    >
      {guest
        ? `${usedMinutes} of ${pooledMinutes} free minutes are used today.`
        : status === 'past_due'
          ? 'The subscription payment did not go through. Sessions keep working until the minutes run out.'
          : `${usedMinutes} of ${pooledMinutes} minutes are used this period.`}
    </InlineNotice>
  );
}
