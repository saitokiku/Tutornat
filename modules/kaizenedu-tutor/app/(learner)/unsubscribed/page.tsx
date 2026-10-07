import type { Metadata } from 'next';
import Link from 'next/link';

import { PRODUCT } from '@/kaizen.config';
import { PRODUCT_ROUTES } from '@/lib/tutor/contracts';

import { PublicShell } from '@/components/tutor/shell/public-shell';

export const metadata: Metadata = {
  title: `Weekly report: ${PRODUCT.workingName}`,
  description: 'Where the opt-out link in the weekly report lands.',
};

/** Where the weekly report's opt-out link lands: the switch is already flipped by the time this renders. */
export default async function UnsubscribedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const off = params.state === 'off';
  return (
    <PublicShell showCta={false}>
      <div className="flex flex-col gap-4">
        <h1 className="nt-h1">
          {off ? 'The weekly report is off' : 'This link is not valid any more'}
        </h1>
        <p className="nt-lead">
          {off
            ? 'This account will not get the weekly report. Password resets and safety notices still arrive; those are not optional.'
            : 'It may have expired. Sign in and turn the weekly report off under Settings on your dashboard.'}
        </p>
        {off ? (
          <p className="nt-body">
            To turn it back on, sign in and open Settings on your dashboard.
          </p>
        ) : null}
        <p className="nt-small">
          <Link href={PRODUCT_ROUTES.signIn} className="underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>
    </PublicShell>
  );
}
