import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { PLAN, PRODUCT } from '@/kaizen.config';
import { homeForRole } from '@/lib/tutor/client/navigation';

import { SignUpForm } from '@/components/tutor/marketing/sign-up-form';
import { PublicShell } from '@/components/tutor/shell/public-shell';
import { loadShellState } from '@/components/tutor/shell/shell-state';
import { NotConfiguredState } from '@/components/tutor/shell/states';

export const metadata: Metadata = {
  title: `Create an account: ${PRODUCT.workingName}`,
  description: `One form. ${PLAN.trialMinutes13Plus} free minutes, no card.`,
};

export default async function SignUpPage() {
  const state = await loadShellState();
  if (state.status === 'signed_in') redirect(homeForRole(state.principal.role));
  return (
    <PublicShell showCta={false}>
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <h1 className="nt-h1">Create an account</h1>
          <p className="nt-lead">
            {PLAN.trialMinutes13Plus} free minutes, no card. Parents add their kids as profiles
            after this step; adults go straight to a session.
          </p>
        </header>
        {state.status === 'not_configured' ? (
          <NotConfiguredState area="database" />
        ) : (
          <SignUpForm />
        )}
      </div>
    </PublicShell>
  );
}
