import Link from 'next/link';

import { entitlementMessage, formatMinutes, upgradePathFor } from '@/lib/tutor/client';
import type { Entitlement, Role } from '@/lib/tutor/contracts';

import { PARENT_ROUTES } from '@/components/tutor/shell/nav';
import { InlineNotice } from '@/components/tutor/shell/states';
import { NtButton } from '@/components/tutor/ui/button';

/**
 * Minutes left, the 80 percent warning, and the one way to act on it (spec
 * R7). An account holder gets a link to billing; a teen profile is told who
 * can change the plan instead of being sent to a page it cannot use; a guest
 * (D35) has a free daily allowance and nothing to manage, so no button and
 * nobody to ask.
 */
export function EntitlementBanner({ entitlement, role }: { entitlement: Entitlement; role: Role }) {
  const guest = entitlement.guest === true;
  const message = entitlementMessage(entitlement, role);
  const path = upgradePathFor(role, guest);
  const used = guest
    ? `${formatMinutes(entitlement.usedMinutes)} of ${formatMinutes(entitlement.pooledMinutes)} used today`
    : entitlement.status === 'trial'
      ? `${formatMinutes(entitlement.trialMinutesUsed)} of ${formatMinutes(entitlement.pooledMinutes)} used`
      : `${formatMinutes(entitlement.usedMinutes)} of ${formatMinutes(entitlement.pooledMinutes)} used this period`;
  const detail =
    path === 'manage'
      ? used
      : path === 'ask_parent'
        ? `${used}. The account holder manages the plan.`
        : `${used}. The count starts again tomorrow.`;
  return (
    <InlineNotice
      tone={message.tone === 'stop' ? 'stop' : message.tone === 'warning' ? 'warning' : 'neutral'}
      role={message.tone === 'neutral' ? 'status' : 'alert'}
      title={message.text}
      action={
        path === 'manage' ? (
          <NtButton asChild tone="secondary" size="sm">
            <Link href={PARENT_ROUTES.billing}>Plan and minutes</Link>
          </NtButton>
        ) : null
      }
    >
      {detail}
    </InlineNotice>
  );
}
