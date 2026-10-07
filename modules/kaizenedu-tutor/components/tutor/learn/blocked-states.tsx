import Link from 'next/link';

import { bandLabel } from '@/lib/tutor/client';
import type { Learner, Role } from '@/lib/tutor/contracts';
import { PRODUCT_ROUTES } from '@/lib/tutor/contracts';

import { PARENT_ROUTES } from '@/components/tutor/shell/nav';
import { NtButton } from '@/components/tutor/ui/button';

/**
 * The three states in which /learn shows no way to start a session: an
 * under-13 profile that is locked until the consent stack ships (spec R5,
 * D5), a profile frozen by a revoke or a deletion request (R16), and an
 * account holder who has not picked a profile yet.
 */

function Panel({
  title,
  children,
  actions,
}: {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section className="nt-panel flex flex-col gap-3 p-6" aria-labelledby="blocked-title">
      <h2 id="blocked-title" className="nt-h2">
        {title}
      </h2>
      <div className="nt-body flex flex-col gap-3 text-muted-foreground">{children}</div>
      {actions ? <div className="flex flex-wrap gap-3 pt-1">{actions}</div> : null}
    </section>
  );
}

export function LockedProfileState({ learner, role }: { learner: Learner; role: Role }) {
  const holder = role !== 'learner';
  return (
    <Panel
      title="This profile is not open yet"
      actions={
        holder ? (
          <>
            <NtButton asChild tone="secondary">
              <Link href={PARENT_ROUTES.overview}>Parent dashboard</Link>
            </NtButton>
            <NtButton asChild tone="ghost">
              <Link href={PRODUCT_ROUTES.legalPrivacy}>Read the privacy policy</Link>
            </NtButton>
          </>
        ) : null
      }
    >
      <p>
        {learner.displayName} is in the {bandLabel(learner.band).toLowerCase()} band. Profiles for
        children under 13 are created locked: no session can start, and the product records nothing
        about them.
      </p>
      <p>
        The lock comes off after the parental-consent flow has been reviewed by counsel and the
        operator opens the age gate. Until then the profile holds a display name and a birth year
        and nothing else.
      </p>
      {holder ? (
        <p>You can rename or delete this profile from the parent dashboard at any time.</p>
      ) : (
        <p>Ask the account holder to check the parent dashboard for the current state.</p>
      )}
    </Panel>
  );
}

export function FrozenProfileState({ learner, role }: { learner: Learner; role: Role }) {
  const holder = role !== 'learner';
  return (
    <Panel
      title="This profile is frozen"
      actions={
        holder ? (
          <NtButton asChild tone="secondary">
            <Link href={PARENT_ROUTES.data}>Data and deletion</Link>
          </NtButton>
        ) : null
      }
    >
      <p>
        Sessions are stopped for {learner.displayName}. A profile freezes when consent is revoked or
        a deletion request is filed.
      </p>
      <p>
        {holder
          ? 'The data and deletion page shows the request and the date it completes.'
          : 'Ask the account holder what happens next.'}
      </p>
    </Panel>
  );
}

export function NoLearnerState({ role }: { role: Role }) {
  return (
    <Panel
      title="Choose a learner"
      actions={
        role !== 'learner' ? (
          <NtButton asChild>
            <Link href={PARENT_ROUTES.overview}>Add or choose a profile</Link>
          </NtButton>
        ) : null
      }
    >
      <p>
        Sessions and progress belong to one learner profile. Pick one in the header, or add the
        first profile from the parent dashboard.
      </p>
    </Panel>
  );
}
