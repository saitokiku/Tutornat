import Link from 'next/link';

import { PRODUCT_ROUTES } from '@/lib/tutor/contracts';

import { NtButton } from '@/components/tutor/ui/button';

export default function ParentNotFound() {
  return (
    <div className="nt-panel flex flex-col gap-3 p-6">
      <h1 className="nt-h2">There is no page here</h1>
      <p className="nt-body text-muted-foreground">
        The link may be old, or it points at a learner profile that is not on this account.
      </p>
      <div className="flex flex-wrap gap-3">
        <NtButton asChild>
          <Link href={PRODUCT_ROUTES.parent}>Back to the dashboard</Link>
        </NtButton>
      </div>
    </div>
  );
}
