import type { Metadata } from 'next';

import { PRODUCT } from '@/kaizen.config';

import { SupportForm } from '@/components/tutor/marketing/support-form';
import { PublicShell } from '@/components/tutor/shell/public-shell';
import { loadShellState } from '@/components/tutor/shell/shell-state';
import { NotConfiguredState } from '@/components/tutor/shell/states';

export const metadata: Metadata = {
  title: `Reach a person: ${PRODUCT.workingName}`,
  description: 'One message to a person, answered by email. Not the AI tutor.',
};

/** The support inbox. Open to anyone, signed in or not; the form says where the message goes. */
export default async function SupportPage() {
  const state = await loadShellState();
  return (
    <PublicShell showCta={false}>
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <h1 className="nt-h1">Reach a person</h1>
          <p className="nt-lead">
            A question about an account, a bill, a child&apos;s data, or something that went wrong:
            write it here and a person answers by email. This form is read by people, not by the{' '}
            {PRODUCT.aiLabel}.
          </p>
          <p className="nt-small text-muted-foreground">
            If a child is in danger right now, do not use this form: in the United States call 911,
            or call or text 988 for the Suicide and Crisis Lifeline.
          </p>
        </header>
        {state.status === 'not_configured' ? (
          <NotConfiguredState area="database" />
        ) : (
          <SupportForm />
        )}
      </div>
    </PublicShell>
  );
}
