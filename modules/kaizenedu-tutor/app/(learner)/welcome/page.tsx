import type { Metadata } from 'next';

import '@/components/tutor/marketing/front-door.css';

import { PRODUCT, publicConfig } from '@/kaizen.config';
import { PRODUCT_ROUTES } from '@/lib/tutor/contracts';

import { Landing } from '@/components/tutor/marketing/landing';
import { PublicShell } from '@/components/tutor/shell/public-shell';
import { loadShellState } from '@/components/tutor/shell/shell-state';

export const metadata: Metadata = {
  title: `${PRODUCT.workingName}: a free, voice-first ${publicConfig.product.aiLabel} for any subject`,
  description:
    'A tutor that talks with you, draws it out, and checks that you got it. Any subject, from the early years to adult, with grades 4 to 9 first. Free, with no account.',
};

export default async function WelcomePage() {
  const state = await loadShellState();
  const signedIn =
    state.status === 'signed_in'
      ? state.principal.role === 'parent'
        ? { href: PRODUCT_ROUTES.parent, label: 'Your dashboard' }
        : { href: PRODUCT_ROUTES.learn, label: 'Your dashboard' }
      : null;
  const supportEmail = process.env.SUPPORT_EMAIL?.trim() || null;
  return (
    <PublicShell signedIn={signedIn} wide>
      <Landing supportEmail={supportEmail} />
    </PublicShell>
  );
}
