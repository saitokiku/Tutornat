import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { PRODUCT } from '@/kaizen.config';
import { homeForRole } from '@/lib/tutor/client/navigation';

import { ForgotPasswordForm } from '@/components/tutor/marketing/forgot-password-form';
import { PublicShell } from '@/components/tutor/shell/public-shell';
import { loadShellState } from '@/components/tutor/shell/shell-state';
import { NotConfiguredState } from '@/components/tutor/shell/states';

export const metadata: Metadata = {
  title: `Reset your password: ${PRODUCT.workingName}`,
  description: 'Enter the email on the account. The link we send works once, for one hour.',
};

export default async function ForgotPasswordPage() {
  const state = await loadShellState();
  if (state.status === 'signed_in') redirect(homeForRole(state.principal.role));
  return (
    <PublicShell showCta={false}>
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <h1 className="nt-h1">Reset your password</h1>
          <p className="nt-lead">
            Enter the email on the account. The link in the email works once, for one hour.
          </p>
        </header>
        {state.status === 'not_configured' ? (
          <NotConfiguredState area="database" />
        ) : (
          <ForgotPasswordForm />
        )}
      </div>
    </PublicShell>
  );
}
