import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { PRODUCT } from '@/kaizen.config';
import { homeForRole, safeNextPath } from '@/lib/tutor/client/navigation';

import { SignInForm } from '@/components/tutor/marketing/sign-in-form';
import { PublicShell } from '@/components/tutor/shell/public-shell';
import { loadShellState } from '@/components/tutor/shell/shell-state';
import { NotConfiguredState } from '@/components/tutor/shell/states';

export const metadata: Metadata = {
  title: `Sign in: ${PRODUCT.workingName}`,
  description: 'Sign in with your email, or with the login name your parent set for you.',
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawNext = Array.isArray(params.next) ? params.next[0] : params.next;
  const next = safeNextPath(rawNext);
  const state = await loadShellState();
  if (state.status === 'signed_in') redirect(next ?? homeForRole(state.principal.role));
  return (
    <PublicShell showCta={false}>
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <h1 className="nt-h1">Sign in</h1>
          <p className="nt-lead">Parents and adults use their email. Teens use their login name.</p>
        </header>
        {state.status === 'not_configured' ? (
          <NotConfiguredState area="database" />
        ) : (
          <SignInForm next={next} />
        )}
      </div>
    </PublicShell>
  );
}
