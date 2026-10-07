import type { Metadata } from 'next';
import Link from 'next/link';

import { PRODUCT } from '@/kaizen.config';

import { SettingsPanel } from '@/components/tutor/parent/settings';
import { PARENT_ROUTES } from '@/components/tutor/shell/nav';
import { NtButton } from '@/components/tutor/ui/button';

export const metadata: Metadata = {
  title: `Settings: ${PRODUCT.workingName}`,
  description: 'Weekly email, the camera switch, and the attention-recovery steps.',
};

export default function SettingsPage() {
  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="nt-h1">Settings</h1>
        <p className="nt-lead">
          Settings for the account. Consent is per learner and lives on its own page.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <NtButton asChild tone="secondary" size="sm">
            <Link href={PARENT_ROUTES.consent}>Consent</Link>
          </NtButton>
          <NtButton asChild tone="secondary" size="sm">
            <Link href={PARENT_ROUTES.data}>Data and deletion</Link>
          </NtButton>
        </div>
      </header>
      <SettingsPanel />
    </>
  );
}
