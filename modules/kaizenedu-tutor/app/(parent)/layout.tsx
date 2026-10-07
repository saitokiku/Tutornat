import type { ReactNode } from 'react';
import { notFound, redirect } from 'next/navigation';

import '@/components/tutor/brand/tokens.css';

import { isTutorMode } from '@/kaizen.config';
import { signInUrlFor } from '@/lib/tutor/client/request';
import { PRODUCT_ROUTES } from '@/lib/tutor/contracts';

import { AnalyticsSlot } from '@/components/tutor/shell/analytics-slot';
import { AppShell, BareShell } from '@/components/tutor/shell/app-shell';
import { OfflineBanner } from '@/components/tutor/shell/offline-banner';
import { loadShellState } from '@/components/tutor/shell/shell-state';
import { AskParentState, NotConfiguredState } from '@/components/tutor/shell/states';

/**
 * The parent app (/parent/**): account holders only (role parent or adult).
 * A teen's learner-role session gets a plain "ask your parent" state rather
 * than a crash or a redirect loop.
 */
export default async function ParentGroupLayout({ children }: { children: ReactNode }) {
  if (!isTutorMode()) notFound();
  const state = await loadShellState();
  if (state.status === 'anonymous') redirect(signInUrlFor(PRODUCT_ROUTES.parent));
  let body: ReactNode;
  if (state.status === 'not_configured') {
    body = (
      <BareShell>
        <NotConfiguredState area="database" />
      </BareShell>
    );
  } else if (state.principal.role === 'learner') {
    body = (
      <AppShell variant="learner" session={state.session}>
        <AskParentState />
      </AppShell>
    );
  } else {
    body = (
      <AppShell variant="parent" session={state.session}>
        {children}
      </AppShell>
    );
  }
  return (
    <div className="nt-app" data-surface="parent">
      <OfflineBanner />
      {body}
      <AnalyticsSlot />
    </div>
  );
}
