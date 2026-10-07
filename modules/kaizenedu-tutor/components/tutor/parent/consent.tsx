'use client';

import { useCallback, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';

import { publicConfig } from '@/kaizen.config';
import {
  DRAFT_BANNER,
  formatDate,
  LEGAL_VERSIONS,
  parentApi,
  RETENTION_MONTHS_AFTER_LAST_ACTIVITY,
} from '@/lib/tutor/client';
import type { Learner } from '@/lib/tutor/contracts';
import { PRODUCT_ROUTES } from '@/lib/tutor/contracts';
import type { ListConsentsResponse, SettingsResponse } from '@/lib/tutor/wire';

import { InlineNotice } from '@/components/tutor/shell/states';
import { Async } from '@/components/tutor/ui/async';
import { NtButton } from '@/components/tutor/ui/button';
import { CheckboxField } from '@/components/tutor/ui/fields';
import { FormError } from '@/components/tutor/ui/form-error';
import { DataList, Pill, Section } from '@/components/tutor/ui/section';
import { useLoad } from '@/components/tutor/ui/use-load';

import { LearnerPicker, useLearnerParam } from './learner-picker';

/**
 * Parental consent for one learner (spec §11.2 items 2, 3 and 12, R16). The
 * notice comes before the checkbox, the microphone and the camera are named
 * separately and never bundled, the record stores the versions it was given
 * for, and revoking freezes the profile with no retention flow in the way.
 */
export function ConsentPanel({ learners }: { learners: Learner[] }) {
  const { learnerId, learner, select } = useLearnerParam(learners);
  const load = useCallback(() => parentApi.listConsents(learnerId), [learnerId]);
  const consents = useLoad(load);
  const settings = useLoad(parentApi.getSettings);

  return (
    <div className="flex flex-col gap-6">
      <LearnerPicker
        learners={learners}
        learnerId={learnerId}
        onSelect={select}
        hint="A consent record belongs to one profile."
      />
      <InlineNotice title={DRAFT_BANNER}>
        The notice and policy texts are drafts until counsel signs them off. A record made now
        stores the draft version it was given for, and a material change asks you again.
      </InlineNotice>
      <Async loaded={settings} label="Loading the gates" lines={2}>
        {(gates) => (
          <Async loaded={consents} label="Loading the consent record" lines={4}>
            {(data) =>
              learner ? (
                <ConsentBody
                  learner={learner}
                  data={data}
                  gates={gates}
                  onChanged={() => {
                    consents.reload();
                  }}
                />
              ) : null
            }
          </Async>
        )}
      </Async>
    </div>
  );
}

function ConsentBody({
  learner,
  data,
  gates,
  onChanged,
}: {
  learner: Learner;
  data: ListConsentsResponse;
  gates: SettingsResponse;
  onChanged: () => void;
}) {
  const active = data.consents.find(
    (record) => record.learnerId === learner.id && record.revokedAt === null,
  );
  const history = data.consents.filter((record) => record.learnerId === learner.id);
  const cameraBand = publicConfig.bands[learner.band].camera !== 'off';
  const cameraOffered = cameraBand && gates.gates.cameraSensingEnabled;

  if (learner.band === 'adult') {
    return (
      <Section title={`${learner.displayName} is an adult profile`}>
        <p className="nt-body text-muted-foreground">
          Parental consent applies to profiles for people under 18. This profile is covered by the
          account holder&rsquo;s own agreement to the terms and the privacy policy.
        </p>
      </Section>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <Section
        title={`Consent for ${learner.displayName}`}
        description="What is collected, why, who receives it, how long it is kept, and how to take it back."
      >
        <Notice learnerName={learner.displayName} camera={cameraBand} />
      </Section>

      {active ? (
        <Section title="The record on file">
          <div className="nt-panel flex flex-col gap-4 p-4 sm:p-6">
            <div className="flex flex-wrap items-center gap-3">
              <Pill tone="success">Consent recorded</Pill>
              <span className="nt-small">{formatDate(active.grantedAt)}</span>
            </div>
            <DataList
              items={[
                { label: 'Given by', value: 'The account holder, by checkbox' },
                {
                  label: 'Notice version',
                  value: <span className="nt-mono">{active.noticeVersion}</span>,
                },
                {
                  label: 'Policy version',
                  value: <span className="nt-mono">{active.policyVersion}</span>,
                },
                { label: 'Camera', value: active.camera ? 'Allowed' : 'Not allowed' },
              ]}
            />
            <RevokeButton learnerId={learner.id} onChanged={onChanged} />
          </div>
        </Section>
      ) : (
        <Section title="Record your consent">
          <ConsentForm learner={learner} cameraOffered={cameraOffered} onChanged={onChanged} />
        </Section>
      )}

      {history.length > 0 ? (
        <Section title="History" description="Every consent given and every revocation, in order.">
          <ul className="flex flex-col gap-2">
            {history.map((record) => (
              <li key={record.id} className="nt-small flex flex-wrap items-center gap-2">
                <Pill tone={record.revokedAt ? 'stop' : 'success'}>
                  {record.revokedAt ? 'Revoked' : 'Active'}
                </Pill>
                <span>
                  Given {formatDate(record.grantedAt)}
                  {record.revokedAt ? `, revoked ${formatDate(record.revokedAt)}` : ''}, notice{' '}
                  <span className="nt-mono">{record.noticeVersion}</span>
                </span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}

function Notice({ learnerName, camera }: { learnerName: string; camera: boolean }) {
  return (
    <div className="nt-panel nt-prose p-4 sm:p-6">
      <p>
        <strong>What is collected.</strong> What {learnerName} says or types during a session, as
        text; what the tutor says back; the result of each check; and the timing and cost of each
        turn. Nothing else is asked for, and the tutor is instructed not to ask for personal
        details.
      </p>
      <p>
        <strong>The microphone.</strong> Speech is streamed to the transcription provider, turned
        into text to answer it, and discarded. No audio file is written to disk, to a database, or
        to any log.
      </p>
      {camera ? (
        <p>
          <strong>The camera.</strong> Attention sensing runs entirely in the browser. No camera
          image, face landmark, embedding, or template is ever sent anywhere or stored. The server
          receives only a coarse state, such as attending or away, and per-session totals. It is
          asked for separately below, it is never bundled with the rest, and it can be switched off
          at any time in settings.
        </p>
      ) : null}
      <p>
        <strong>Who receives it.</strong> The model, speech, storage, analytics, and email providers
        named in the privacy policy, each only to run the service. Nothing is sold, and there is no
        advertising or cross-site tracking on any learner surface.
      </p>
      <p>
        <strong>How long.</strong> Transcripts and progress are kept while the profile is active and
        for {RETENTION_MONTHS_AFTER_LAST_ACTIVITY} months after the last session, then deleted.
        Audio is never kept.
      </p>
      <p>
        <strong>Your rights.</strong> Read every transcript, export everything as a file, delete a
        profile or the whole account, and revoke this consent, all from the parent dashboard.
        Revoking freezes the profile immediately.
      </p>
      <p>
        The full text: <Link href={PRODUCT_ROUTES.legalPrivacy}>privacy policy</Link>,{' '}
        <Link href={PRODUCT_ROUTES.legalAi}>AI disclosure</Link>,{' '}
        <Link href={PRODUCT_ROUTES.legalTerms}>terms</Link>.
      </p>
    </div>
  );
}

function ConsentForm({
  learner,
  cameraOffered,
  onChanged,
}: {
  learner: Learner;
  cameraOffered: boolean;
  onChanged: () => void;
}) {
  const [agreed, setAgreed] = useState(false);
  const [camera, setCamera] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!agreed) {
      setError('Tick the box to record your consent.');
      document.getElementById('consent-agree')?.focus();
      return;
    }
    setError(null);
    setServerError(null);
    setBusy(true);
    const result = await parentApi.createConsent({
      learnerId: learner.id,
      camera: cameraOffered ? camera : false,
      noticeVersion: LEGAL_VERSIONS.notice,
      policyVersion: LEGAL_VERSIONS.privacy,
      method: 'checkbox',
    });
    setBusy(false);
    if (!result.ok) {
      setServerError(result.message);
      return;
    }
    toast.success('Consent recorded.');
    onChanged();
  }

  return (
    <form onSubmit={submit} noValidate className="nt-panel flex flex-col gap-5 p-4 sm:p-6">
      <CheckboxField
        id="consent-agree"
        checked={agreed}
        onChange={(event) => {
          setAgreed(event.target.checked);
          setError(null);
        }}
        error={error}
        label={`I am the parent or legal guardian of ${learner.displayName}, I have read the notice above, and I give permission for the tutoring it describes.`}
      />
      {cameraOffered ? (
        <CheckboxField
          id="consent-camera"
          checked={camera}
          onChange={(event) => setCamera(event.target.checked)}
          label="Separately: I allow attention sensing with the camera for this profile."
          hint="Optional. The rest works without it, and you can change this at any time in settings."
        />
      ) : null}
      <InlineNotice title="A checkbox alone is not the whole method for a child under 13">
        For an under-13 profile the law also asks for a card transaction with a notification to you.
        That step, and the gate that opens under-13 sessions, are switched on together once counsel
        has signed the flow off.
      </InlineNotice>
      <FormError message={serverError} />
      <div>
        <NtButton type="submit" busy={busy}>
          {busy ? 'Recording' : 'Record my consent'}
        </NtButton>
      </div>
    </form>
  );
}

function RevokeButton({ learnerId, onChanged }: { learnerId: string; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function revoke() {
    setBusy(true);
    setError(null);
    const result = await parentApi.revokeConsent({ learnerId });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    toast.success('Consent revoked. The profile is frozen.');
    onChanged();
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-4">
      <p className="nt-small">
        Revoking takes effect at once and freezes the profile: no session can start and nothing
        further is collected. The data already recorded stays until you delete it on the data page.
      </p>
      {error ? (
        <p role="alert" className="nt-small font-medium text-destructive">
          {error}
        </p>
      ) : null}
      <div>
        <NtButton tone="danger" size="sm" busy={busy} onClick={() => void revoke()}>
          Revoke consent and freeze the profile
        </NtButton>
      </div>
    </div>
  );
}
