import Link from 'next/link';

import { PRODUCT_ROUTES } from '@/lib/tutor/contracts';

import { BareShell } from '@/components/tutor/shell/app-shell';
import { NtButton } from '@/components/tutor/ui/button';

export default function LearnerNotFound() {
  return (
    <BareShell>
      <div className="nt-panel flex flex-col gap-3 p-6">
        <h1 className="nt-h2">There is no page here</h1>
        <p className="nt-body text-muted-foreground">
          The link may be old, or the session it pointed to has ended.
        </p>
        <div className="flex flex-wrap gap-3">
          <NtButton asChild>
            <Link href={PRODUCT_ROUTES.learn}>Go to Learn</Link>
          </NtButton>
          <NtButton asChild tone="secondary">
            <Link href={PRODUCT_ROUTES.landing}>Home</Link>
          </NtButton>
        </div>
      </div>
    </BareShell>
  );
}
