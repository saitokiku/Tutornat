/**
 * BillingStatusResponse assembly (spec R7; wire.ts). `configured` means the
 * Stripe keys exist; `billingEnabled` additionally needs the operator's
 * `billing_enabled` gate (fail-closed, strategy §7). Both false states are
 * shown to the parent as they are (D19).
 */
import { PLAN } from '@/kaizen.config';
import type { Queryable } from '@/lib/tutor/db';
import { getAppSetting } from '@/lib/tutor/settings';
import type { BillingStatusResponse } from '@/lib/tutor/wire';

import { computeEntitlement, getSubscription } from './entitlement';
import { isStripeConfigured } from './stripe';

export interface BillingGate {
  configured: boolean;
  enabled: boolean;
  /** Plain sentence for the 409 body; null when enabled. */
  reason: string | null;
}

export async function billingGate(db: Queryable): Promise<BillingGate> {
  const configured = isStripeConfigured();
  if (!configured) {
    return {
      configured,
      enabled: false,
      reason:
        'Billing is not configured on this server: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, and STRIPE_PRICE_MONTHLY are required.',
    };
  }
  const open = await getAppSetting(db, 'billing_enabled');
  if (!open) {
    return {
      configured,
      enabled: false,
      reason: 'Billing is switched off by the operator (app_settings.billing_enabled is false).',
    };
  }
  return { configured, enabled: true, reason: null };
}

function isoDate(value: string | Date | null): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export async function getBillingStatus(
  db: Queryable,
  accountId: string,
): Promise<BillingStatusResponse> {
  const [gate, subscription] = await Promise.all([billingGate(db), getSubscription(db, accountId)]);
  return {
    billingEnabled: gate.enabled,
    configured: gate.configured,
    entitlement: computeEntitlement(subscription),
    plan: {
      priceCentsMonthly: PLAN.priceCentsMonthly,
      learnerProfiles: PLAN.learnerProfiles,
      pooledMinutesMonthly: PLAN.pooledMinutesMonthly,
      trialMinutes: PLAN.trialMinutes13Plus,
    },
    subscription: {
      status: subscription.status,
      currentPeriodEnd: isoDate(subscription.current_period_end),
    },
  };
}
