import type { Metadata } from 'next';

import { PRODUCT } from '@/kaizen.config';

import { Credits } from '@/components/tutor/marketing/legal/credits';
import { PublicShell } from '@/components/tutor/shell/public-shell';

export const metadata: Metadata = {
  title: `Credits: ${PRODUCT.workingName}`,
  description: 'The open-source work this product is built on, and the licence for each piece.',
};

export default function CreditsPage() {
  return (
    <PublicShell>
      <Credits />
    </PublicShell>
  );
}
