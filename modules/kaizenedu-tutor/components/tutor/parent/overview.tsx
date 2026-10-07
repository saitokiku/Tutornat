'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UserPlus } from 'lucide-react';

import {
  bandLabel,
  formatDate,
  learnerStatusLabel,
  parentApi,
  pluralize,
} from '@/lib/tutor/client';
import type { LearningSummary } from '@/lib/tutor/client';
import type { Learner, LearnerStatus } from '@/lib/tutor/contracts';

import { PARENT_ROUTES } from '@/components/tutor/shell/nav';
import { EmptyState, InlineNotice } from '@/components/tutor/shell/states';
import { Async } from '@/components/tutor/ui/async';
import { NtButton } from '@/components/tutor/ui/button';
import { Pill, Section } from '@/components/tutor/ui/section';
import { useLoad } from '@/components/tutor/ui/use-load';

import { AddLearnerForm } from './add-learner';

/**
 * The first of the three questions a parent opens this app with: is my child
 * learning? Each profile answers it in plain sentences — what happened this
 * week, what got better, what is next — with the full report one click away.
 * The list is also where a profile is added and where its other surfaces are
 * reached.
 */

/** Plain-language summaries from the server, keyed by learner id. */
export type LearnerSummaries = Record<string, LearningSummary>;

const STATUS_TONE: Record<LearnerStatus, 'success' | 'warning' | 'stop'> = {
  active: 'success',
  locked: 'warning',
  frozen: 'stop',
};

const STATUS_NOTE: Record<LearnerStatus, string> = {
  active: 'Sessions can start.',
  locked: 'No session can start and nothing is recorded until the consent gate opens.',
  frozen: 'Sessions are stopped because consent was revoked or a deletion was requested.',
};

export function ParentOverview({
  initialLearners,
  maxProfiles,
  summaries,
}: {
  initialLearners: Learner[];
  maxProfiles: number;
  summaries: LearnerSummaries;
}) {
  const loaded = useLoad(parentApi.listLearners);
  const [adding, setAdding] = useState(false);
  const [lastLocked, setLastLocked] = useState<string | null>(null);

  const learners = loaded.result?.ok ? loaded.result.data.learners : initialLearners;
  const under13Open = loaded.result?.ok ? loaded.result.data.under13Open : false;
  const full = learners.length >= maxProfiles;
  const showForm = adding || (!loaded.loading && learners.length === 0);

  return (
    <Section
      id="learners"
      title="How your learners are doing"
      description={`${pluralize(learners.length, 'profile')} of ${maxProfiles} on the plan. Written by the AI tutor from the session record; nothing here is a human rating.`}
      actions={
        showForm ? null : (
          <NtButton tone="secondary" size="sm" disabled={full} onClick={() => setAdding(true)}>
            <UserPlus aria-hidden="true" />
            Add a learner
          </NtButton>
        )
      }
    >
      {full && !showForm ? (
        <InlineNotice title="Every profile on the plan is in use">
          Delete a profile from the data page to make room, or ask about a larger plan.
        </InlineNotice>
      ) : null}

      {showForm ? (
        <AddLearnerForm
          under13Open={under13Open}
          onCreated={(learner, locked) => {
            setAdding(false);
            setLastLocked(locked ? learner.displayName : null);
            loaded.reload();
          }}
          onCancel={learners.length > 0 ? () => setAdding(false) : undefined}
        />
      ) : null}

      {lastLocked ? (
        <InlineNotice tone="warning" title={`${lastLocked} was created locked`}>
          The profile exists and holds a name and a birth year. It collects nothing else and cannot
          start a session until the consent flow is reviewed and the operator opens the gate.
        </InlineNotice>
      ) : null}

      <Async loaded={loaded} label="Loading the profiles" lines={4}>
        {(data) =>
          data.learners.length === 0 ? (
            <EmptyState
              title="No profiles yet"
              body="Add one profile for each learner. A teen gets their own login under this account; an adult learner is their own profile."
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {data.learners.map((learner) => (
                <LearnerCard
                  key={learner.id}
                  learner={learner}
                  summary={summaries[learner.id] ?? null}
                />
              ))}
            </ul>
          )
        }
      </Async>
    </Section>
  );
}

function LearnerCard({ learner, summary }: { learner: Learner; summary: LearningSummary | null }) {
  const inactive = learner.status !== 'active';
  return (
    <li className="nt-panel flex flex-col gap-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h3 className="nt-h3 min-w-0 break-words">{learner.displayName}</h3>
        <Pill tone="brand">{bandLabel(learner.band)}</Pill>
        {inactive ? (
          <Pill tone={STATUS_TONE[learner.status]}>{learnerStatusLabel(learner.status)}</Pill>
        ) : null}
        <span className="nt-small ml-auto">Added {formatDate(learner.createdAt)}</span>
      </div>

      {summary ? (
        <div className="flex flex-col gap-1">
          <p className="nt-body">{summary.activity}</p>
          {summary.progress ? <p className="nt-body">{summary.progress}</p> : null}
          {summary.next ? <p className="nt-small">Next session: {summary.next}.</p> : null}
        </div>
      ) : (
        <p className="nt-small">No sessions recorded for this profile yet.</p>
      )}

      {inactive || learner.loginName ? (
        <p className="nt-small">
          {inactive ? STATUS_NOTE[learner.status] : ''}
          {learner.loginName ? ` Signs in as ${learner.loginName}.` : ''}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <NtButton asChild size="sm">
          <Link href={PARENT_ROUTES.report(learner.id)}>The full report</Link>
        </NtButton>
        <NtButton asChild tone="ghost" size="sm">
          <Link href={`${PARENT_ROUTES.transcripts}?learnerId=${learner.id}`}>What was said</Link>
        </NtButton>
        <NtButton asChild tone="ghost" size="sm">
          <Link href={`${PARENT_ROUTES.data}?learnerId=${learner.id}`}>Export or delete</Link>
        </NtButton>
      </div>
    </li>
  );
}
