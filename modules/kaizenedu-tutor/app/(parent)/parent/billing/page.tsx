import type { Metadata } from 'next';

import { PRODUCT } from '@/kaizen.config';

import { BillingPanel } from '@/components/tutor/parent/billing';

export const metadata: Metadata = {
  title: `Billing: ${PRODUCT.workingName}`,
  description: 'The plan, the minutes on it, and the Stripe portal.',
};

export default function BillingPage() {
  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="nt-h1">Billing</h1>
        <p className="nt-lead">
          One plan, pooled minutes, and a hard stop at the cap. Nothing is charged beyond the plan.
        </p>
      </header>
      <BillingPanel />
    </>
  );
}
