import type { Metadata } from 'next';

import { PRODUCT } from '@/kaizen.config';

import { ParentInviteForm } from '@/components/tutor/marketing/parent-invite-form';
import { PublicShell } from '@/components/tutor/shell/public-shell';
import { loadShellState } from '@/components/tutor/shell/shell-state';
import { NotConfiguredState } from '@/components/tutor/shell/states';

export const metadata: Metadata = {
  title: `Finish setting up the account: ${PRODUCT.workingName}`,
  description: 'The page a parent reaches from the invitation their teen sent.',
  robots: { index: false },
};

/**
 * Reached from the emailed invitation, which carries the token as `?t=`. A
 * signed-in parent stays signed in here: attaching the profile to the
 * account that already has their address is one of the two outcomes.
 */
export default async function ParentInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.t) ? params.t[0] : params.t;
  const token = raw?.trim() || null;
  const state = await loadShellState();
  const signedInEmail = state.status === 'signed_in' ? state.session.account.email : null;
  return (
    <PublicShell showCta={false}>
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <h1 className="nt-h1">Finish setting up the account</h1>
          <p className="nt-lead">
            Your teen started it. The account is yours: you see what they work on and pay for it;
            they sign in on their own.
          </p>
        </header>
        {state.status === 'not_configured' ? (
          <NotConfiguredState area="database" />
        ) : (
          <ParentInviteForm token={token} signedInEmail={signedInEmail} />
        )}
      </div>
    </PublicShell>
  );
}
