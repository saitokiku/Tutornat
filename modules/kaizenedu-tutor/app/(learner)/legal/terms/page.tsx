import type { Metadata } from 'next';

import { PRODUCT } from '@/kaizen.config';

import { TermsOfService } from '@/components/tutor/marketing/legal/terms';
import { PublicShell } from '@/components/tutor/shell/public-shell';

export const metadata: Metadata = {
  title: `Terms of service: ${PRODUCT.workingName}`,
  description: 'The agreement between you and the operator when you use the tutor.',
};

export default function TermsPage() {
  return (
    <PublicShell>
      <TermsOfService />
    </PublicShell>
  );
}
