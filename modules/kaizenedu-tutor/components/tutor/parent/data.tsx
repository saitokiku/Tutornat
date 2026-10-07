'use client';

import { useRef, useState, type FormEvent } from 'react';
import { Download } from 'lucide-react';

import {
  deletionPhraseFor,
  exportFileName,
  formatDate,
  matchesDeletionPhrase,
  parentApi,
  pluralize,
  RETENTION_MONTHS_AFTER_LAST_ACTIVITY,
} from '@/lib/tutor/client';
import { downloadJson } from '@/lib/tutor/client/navigation';
import type { Learner } from '@/lib/tutor/contracts';

import { InlineNotice } from '@/components/tutor/shell/states';
import { NtButton } from '@/components/tutor/ui/button';
import { ChoiceCards } from '@/components/tutor/ui/choice-cards';
import { TextField } from '@/components/tutor/ui/fields';
import { FormError } from '@/components/tutor/ui/form-error';
import { Section } from '@/components/tutor/ui/section';

import { LearnerPicker, useLearnerParam } from './learner-picker';

/**
 * Parental data rights (spec §11.2 items 4 and 5, R16): read and export
 * everything the product holds for a learner, and delete a profile or the
 * whole account. Deletion is confirmed by typing a phrase, once, with no
 * retention offer and no second guessing.
 */
export function DataPanel({ learners }: { learners: Learner[] }) {
  const { learnerId, learner, select } = useLearnerParam(learners);
  return (
    <div className="flex flex-col gap-8">
      <LearnerPicker
        learners={learners}
        learnerId={learnerId}
        onSelect={select}
        hint="The export and the profile deletion below act on this profile."
      />
      {learner ? <ExportSection learner={learner} /> : null}
      <DeleteSection learner={learner} />
    </div>
  );
}

function ExportSection({ learner }: { learner: Learner }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    setError(null);
    const result = await parentApi.exportData(learner.id);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    const data = result.data;
    downloadJson(exportFileName(learner.id, data.exportedAt), data);
    setReceipt(
      `${pluralize(data.sessions.length, 'session')}, ${pluralize(data.turns.length, 'turn')}, ${pluralize(
        data.mastery.length,
        'skill row',
      )}, ${pluralize(data.consents.length, 'consent record')}.`,
    );
  }

  return (
    <Section
      title={`Export everything for ${learner.displayName}`}
      description="A JSON file with the profile, every session and turn, the skill estimates, the misconception tags, the evidence log, and the consent records."
    >
      <div className="flex flex-col gap-3">
        <div>
          <NtButton busy={busy} onClick={() => void download()}>
            <Download aria-hidden="true" />
            {busy ? 'Building the file' : 'Download the file'}
          </NtButton>
        </div>
        {receipt ? (
          <p role="status" className="nt-small">
            Downloaded: {receipt}
          </p>
        ) : null}
        <FormError message={error} />
        <p className="nt-small">
          The file is built in your browser from the account&rsquo;s own rows. Audio is not in it,
          because audio is never stored.
        </p>
      </div>
    </Section>
  );
}

type Target = 'learner' | 'account';

function DeleteSection({ learner }: { learner: Learner | null }) {
  const [target, setTarget] = useState<Target>(learner ? 'learner' : 'account');
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [filed, setFiled] = useState<{ id: string; completesBy: string } | null>(null);
  const phraseRef = useRef<HTMLInputElement>(null);

  const forLearner = target === 'learner' && learner !== null;
  const phrase = deletionPhraseFor(forLearner ? learner : null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!matchesDeletionPhrase(typed, phrase)) {
      setError(`Type ${phrase} exactly to confirm.`);
      phraseRef.current?.focus();
      return;
    }
    setError(null);
    setServerError(null);
    setBusy(true);
    const result = await parentApi.deleteData({
      learnerId: forLearner ? learner.id : null,
    });
    setBusy(false);
    if (!result.ok) {
      setServerError(result.message);
      return;
    }
    setFiled({ id: result.data.deletionRequestId, completesBy: result.data.completesBy });
    setTyped('');
  }

  if (filed) {
    return (
      <Section title="Deletion requested">
        <InlineNotice tone="stop" role="status" title="The request is filed">
          <p>
            {target === 'account'
              ? 'Every profile on the account is frozen now and the other sign-ins have been ended.'
              : 'The profile is frozen now.'}{' '}
            The data is deleted by {formatDate(filed.completesBy)}.
          </p>
          <p className="nt-mono pt-1">Reference {filed.id}</p>
        </InlineNotice>
      </Section>
    );
  }

  return (
    <Section
      title="Delete"
      description={`Deleting freezes the profile at once and removes the data within the window in the retention policy. Anything not deleted sooner is removed ${RETENTION_MONTHS_AFTER_LAST_ACTIVITY} months after the last session.`}
    >
      <form onSubmit={submit} noValidate className="nt-panel flex flex-col gap-5 p-4 sm:p-6">
        <ChoiceCards<Target>
          name="delete-target"
          legend="What to delete"
          value={target}
          onChange={(value) => {
            setTarget(value);
            setTyped('');
            setError(null);
          }}
          choices={[
            {
              value: 'learner',
              label: learner ? `Only ${learner.displayName}` : 'One profile',
              description: learner
                ? 'The profile, its sessions, transcripts, estimates, and consent records.'
                : 'Choose a profile above first.',
              disabled: learner === null,
            },
            {
              value: 'account',
              label: 'The whole account',
              description: 'Every profile, every transcript, the subscription, and the sign-in.',
            },
          ]}
        />
        <TextField
          ref={phraseRef}
          id="delete-confirm"
          label="Type the phrase to confirm"
          value={typed}
          autoComplete="off"
          onChange={(event) => {
            setTyped(event.target.value);
            setError(null);
          }}
          error={error}
          hint={`Type: ${phrase}`}
        />
        <FormError message={serverError} />
        <div>
          <NtButton type="submit" tone="danger" busy={busy}>
            {busy ? 'Filing the request' : 'Delete'}
          </NtButton>
        </div>
      </form>
    </Section>
  );
}
