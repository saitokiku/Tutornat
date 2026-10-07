'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { bandLabel, learnerStatusLabel } from '@/lib/tutor/client';
import type { Learner } from '@/lib/tutor/contracts';

import { PARENT_ROUTES } from '@/components/tutor/shell/nav';
import { EmptyState } from '@/components/tutor/shell/states';
import { NtButton } from '@/components/tutor/ui/button';
import { SelectField } from '@/components/tutor/ui/fields';

/**
 * Choosing which learner a parent page is about. The choice lives in the URL
 * (`?learnerId=`) so a link from the overview lands on the right profile and
 * the browser's back button works.
 */
export function useLearnerParam(learners: Learner[]): {
  learnerId: string;
  learner: Learner | null;
  select: (id: string) => void;
} {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const requested = params.get('learnerId');
  const learnerId =
    requested && learners.some((entry) => entry.id === requested)
      ? requested
      : (learners[0]?.id ?? '');
  const select = useCallback(
    (id: string) => router.replace(`${pathname}?learnerId=${encodeURIComponent(id)}`),
    [pathname, router],
  );
  return {
    learnerId,
    learner: learners.find((entry) => entry.id === learnerId) ?? null,
    select,
  };
}

export function LearnerPicker({
  learners,
  learnerId,
  onSelect,
  label = 'Learner',
  hint,
}: {
  learners: Learner[];
  learnerId: string;
  onSelect: (id: string) => void;
  label?: string;
  hint?: string;
}) {
  const only = learners.length === 1 ? learners[0] : null;
  if (only) {
    return (
      <p className="nt-small">
        {label}: {only.displayName} ({bandLabel(only.band).toLowerCase()},{' '}
        {learnerStatusLabel(only.status).toLowerCase()}).
      </p>
    );
  }
  if (learners.length === 0) return null;
  return (
    <SelectField
      id="parent-learner"
      label={label}
      hint={hint}
      value={learnerId}
      onChange={(event) => onSelect(event.target.value)}
      className="max-w-sm"
    >
      {learners.map((learner) => (
        <option key={learner.id} value={learner.id}>
          {learner.displayName} ({bandLabel(learner.band).toLowerCase()},{' '}
          {learnerStatusLabel(learner.status).toLowerCase()})
        </option>
      ))}
    </SelectField>
  );
}

/** Shown on every per-learner page when the account has no profile yet. */
export function NoLearnersState() {
  return (
    <EmptyState
      title="No learner profiles yet"
      body="Add a profile first. Reports, transcripts, consent, and data are all per learner."
      action={
        <NtButton asChild>
          <Link href={PARENT_ROUTES.overview}>Add a learner</Link>
        </NtButton>
      }
    />
  );
}
