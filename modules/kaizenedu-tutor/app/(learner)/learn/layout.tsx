import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import { PRODUCT_ROUTES } from '@/lib/tutor/contracts';

import { AppShell, BareShell } from '@/components/tutor/shell/app-shell';
import { loadShellState } from '@/components/tutor/shell/shell-state';
import { NotConfiguredState } from '@/components/tutor/shell/states';

/**
 * /learn needs a cookie, guest or account. A visitor without one goes to the
 * landing page, whose start form is the way in (D35); there is no sign-in on
 * the public surface to send them to.
 */
export default async function LearnLayout({ children }: { children: ReactNode }) {
  const state = await loadShellState();
  if (state.status === 'anonymous') redirect(PRODUCT_ROUTES.landing);
  if (state.status === 'not_configured') {
    return (
      <BareShell>
        <NotConfiguredState area="database" />
      </BareShell>
    );
  }
  return (
    <AppShell variant="learner" session={state.session}>
      {children}
    </AppShell>
  );
}
