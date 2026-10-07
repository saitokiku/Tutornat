import type { Metadata } from 'next';

import { PRODUCT } from '@/kaizen.config';

import { AiDisclosure } from '@/components/tutor/marketing/legal/ai-disclosure';
import { PublicShell } from '@/components/tutor/shell/public-shell';

export const metadata: Metadata = {
  title: `AI disclosure: ${PRODUCT.workingName}`,
  description: 'What the tutor is, what it is not, where it can be wrong, and what it will not do.',
};

export default function AiDisclosurePage() {
  return (
    <PublicShell>
      <AiDisclosure />
    </PublicShell>
  );
}
