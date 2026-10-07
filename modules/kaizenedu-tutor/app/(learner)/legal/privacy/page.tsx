import type { Metadata } from 'next';

import { PRODUCT } from '@/kaizen.config';

import { PrivacyPolicy } from '@/components/tutor/marketing/legal/privacy';
import { PublicShell } from '@/components/tutor/shell/public-shell';

export const metadata: Metadata = {
  title: `Privacy policy: ${PRODUCT.workingName}`,
  description:
    'What is collected, from whom, why, who receives it, how long it is kept, and how to review, export, delete, or revoke.',
};

export default function PrivacyPage() {
  return (
    <PublicShell>
      <PrivacyPolicy />
    </PublicShell>
  );
}
