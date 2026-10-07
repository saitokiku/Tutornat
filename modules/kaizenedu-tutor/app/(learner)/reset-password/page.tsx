import type { Metadata } from 'next';

import { PRODUCT } from '@/kaizen.config';

import { ResetPasswordForm } from '@/components/tutor/marketing/reset-password-form';
import { PublicShell } from '@/components/tutor/shell/public-shell';
import { loadShellState } from '@/components/tutor/shell/shell-state';
import { NotConfiguredState } from '@/components/tutor/shell/states';

export const metadata: Metadata = {
  title: `Choose a new password: ${PRODUCT.workingName}`,
  description: 'The page the reset email links to.',
  robots: { index: false },
};

/**
 * Reached from the emailed link, which carries the token as `?t=`. A signed-in
 * visitor is not redirected away: a reset can start on another device, and the
 * token, not the cookie, decides whether it succeeds.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.t) ? params.t[0] : params.t;
  const token = raw?.trim() || null;
  const state = await loadShellState();
  return (
    <PublicShell showCta={false}>
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <h1 className="nt-h1">Choose a new password</h1>
          <p className="nt-lead">Then you are signed in and can carry on.</p>
        </header>
        {state.status === 'not_configured' ? (
          <NotConfiguredState area="database" />
        ) : (
          <ResetPasswordForm token={token} />
        )}
      </div>
    </PublicShell>
  );
}
