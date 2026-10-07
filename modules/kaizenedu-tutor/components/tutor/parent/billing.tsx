'use client';

import { useState } from 'react';

import { formatDate, formatMinutes, formatMoney, parentApi, pluralize } from '@/lib/tutor/client';
import type { SubscriptionStatus } from '@/lib/tutor/contracts';
import type { BillingStatusResponse } from '@/lib/tutor/wire';

import { InlineNotice, NotConfiguredState } from '@/components/tutor/shell/states';
import { Async } from '@/components/tutor/ui/async';
import { NtButton } from '@/components/tutor/ui/button';
import { FormError } from '@/components/tutor/ui/form-error';
import { DataList, Pill, Section } from '@/components/tutor/ui/section';
import { useLoad } from '@/components/tutor/ui/use-load';

/**
 * Billing (spec R7, D19). Two honest empty states come before any control:
 * Stripe keys missing on the server, and the operator's billing gate shut.
 * Cancellation is one click inside Stripe's portal; there is no retention
 * flow here and there will not be one.
 */

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  trial: 'Free trial',
  active: 'Active',
  past_due: 'Payment failed',
  canceled: 'Canceled',
};

export function BillingPanel() {
  const loaded = useLoad(parentApi.getBilling);
  return (
    <Async loaded={loaded} label="Loading the plan" lines={5}>
      {(data) => <BillingBody data={data} />}
    </Async>
  );
}

function BillingBody({ data }: { data: BillingStatusResponse }) {
  const [busy, setBusy] = useState<'checkout' | 'portal' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { entitlement, plan, subscription } = data;

  async function go(action: 'checkout' | 'portal') {
    setBusy(action);
    setError(null);
    const result = await parentApi.billingAction({ action });
    if (!result.ok) {
      setBusy(null);
      setError(result.message);
      return;
    }
    window.location.assign(result.data.url);
  }

  const subscribed = subscription.status === 'active' || subscription.status === 'past_due';

  return (
    <div className="flex flex-col gap-6">
      {data.configured ? null : <NotConfiguredState area="billing" />}

      {data.configured && !data.billingEnabled ? (
        <InlineNotice title="Billing is not open yet">
          The operator has not switched checkout on for this deployment. The free trial minutes
          below still work and nothing is charged until billing opens.
        </InlineNotice>
      ) : null}

      {subscription.status === 'past_due' ? (
        <InlineNotice tone="warning" role="alert" title="The last payment failed">
          Sessions keep working for now. Update the card in the portal to avoid the plan being
          canceled.
        </InlineNotice>
      ) : null}

      <Section
        title="This period"
        description="Minutes are pooled across every learner profile on the account."
      >
        <div className="nt-panel flex flex-col gap-4 p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <Pill
              tone={
                subscription.status === 'active'
                  ? 'success'
                  : subscription.status === 'trial'
                    ? 'brand'
                    : subscription.status === 'past_due'
                      ? 'warning'
                      : 'stop'
              }
            >
              {STATUS_LABEL[subscription.status]}
            </Pill>
            {subscription.currentPeriodEnd ? (
              <span className="nt-small">
                {subscription.status === 'canceled' ? 'Access ends' : 'Renews'}{' '}
                {formatDate(subscription.currentPeriodEnd)}
              </span>
            ) : null}
          </div>
          <DataList
            items={[
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
              { label: 'Price', value: `${formatMoney(plan.priceCentsMonthly)} a month` },
              { label: 'Profiles included', value: pluralize(plan.learnerProfiles, 'profile') },
              {
                label: 'Monthly minutes on the plan',
                value: formatMinutes(plan.pooledMinutesMonthly),
              },
              { label: 'Free trial', value: `${formatMinutes(plan.trialMinutes)}, no card` },
            ]}
          />
          {entitlement.warnAt80 && entitlement.remainingMinutes > 0 ? (
            <InlineNotice tone="warning" title="Past 80 percent of the minutes">
              Sessions stop at the cap rather than charging anything extra.
            </InlineNotice>
          ) : null}
          {entitlement.remainingMinutes <= 0 ? (
            <InlineNotice tone="stop" role="alert" title="No minutes left">
              {entitlement.status === 'trial'
                ? 'The trial is used up. Subscribing adds the monthly minutes.'
                : 'The minutes reset at the start of the next period.'}
            </InlineNotice>
          ) : null}
        </div>
      </Section>

      <FormError message={error} />

      {data.billingEnabled ? (
        <div className="flex flex-wrap items-center gap-3">
          {subscribed ? (
            <NtButton busy={busy === 'portal'} onClick={() => void go('portal')}>
              {busy === 'portal' ? 'Opening the portal' : 'Manage or cancel the plan'}
            </NtButton>
          ) : (
            <NtButton busy={busy === 'checkout'} onClick={() => void go('checkout')}>
              {busy === 'checkout' ? 'Opening checkout' : 'Subscribe'}
            </NtButton>
          )}
          <p className="nt-small">
            {subscribed
              ? 'The portal is where the card, the invoices, and cancellation live. Cancelling is one click and takes effect at the end of the period.'
              : 'Checkout is handled by Stripe. Card details never reach this product.'}
          </p>
        </div>
      ) : null}
    </div>
  );
}
