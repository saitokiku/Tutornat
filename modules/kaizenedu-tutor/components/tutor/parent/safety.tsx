import Link from 'next/link';

import { isUnder13 } from '@/lib/tutor/client';
import type { Learner } from '@/lib/tutor/contracts';
import { PRODUCT_ROUTES } from '@/lib/tutor/contracts';

import { PARENT_ROUTES } from '@/components/tutor/shell/nav';
import { NtButton } from '@/components/tutor/ui/button';
import { Section } from '@/components/tutor/ui/section';

/**
 * The second of the three questions a parent opens this app with: is this
 * safe? It used to be answerable only by visiting four separate pages, so the
 * facts are stated here and each one links to the page that acts on it.
 *
 * Every line restates a rule the product already enforces and shows elsewhere
 * (the transcript reader, the report's attention note, the consent flow, the
 * data page). Nothing here is new policy language: the privacy policy remains
 * the source, and it is linked.
 */

interface Fact {
  term: string;
  detail: string;
  href: string;
  action: string;
}

export function SafetyPanel({ learners }: { learners: Learner[] }) {
  const anyUnder13 = learners.some((learner) => isUnder13(learner.band));
  const facts: Fact[] = [
    {
      term: 'Nothing your child says is kept as audio',
      detail:
        'Speech is turned into text to answer it and the recording is discarded. The transcript is the whole record, and you can read every turn of every session.',
      href: PARENT_ROUTES.transcripts,
      action: 'Read the transcripts',
    },
    {
      term: 'The camera stays on the device',
      detail:
        'Attention sensing runs in the browser. No camera image, face landmark, or template ever leaves it, the camera is asked for separately, and you can switch it off.',
      href: PARENT_ROUTES.settings,
      action: 'Camera and check-ins',
    },
    {
      term: 'You can take everything back',
      detail:
        'Everything the product holds about a learner can be read, downloaded, and deleted. Deleting is one confirmation, with no retention flow in the way.',
      href: PARENT_ROUTES.data,
      action: 'Export or delete',
    },
    {
      term: anyUnder13 ? 'Consent gates the under-13 profiles' : 'Consent is recorded per learner',
      detail: anyUnder13
        ? 'A profile for a child under 13 collects nothing and cannot start a session until you have been given the notice and the operator has opened the gate.'
        : 'The notice comes first, then the checkbox, and the record keeps the version you agreed to. Revoking it stops sessions straight away.',
      href: PARENT_ROUTES.consent,
      action: 'Consent record',
    },
  ];

  return (
    <Section
      id="safety"
      title="How this is handled"
      description={
        <>
          The tutor is labelled as AI in every session. What is collected and how long it is kept is
          set out in the{' '}
          <Link href={PRODUCT_ROUTES.legalPrivacy} className="underline underline-offset-4">
            privacy policy
          </Link>
          .
        </>
      }
    >
      <dl className="grid gap-4 sm:grid-cols-2">
        {facts.map((fact) => (
          <div key={fact.term} className="nt-panel flex min-w-0 flex-col gap-2 p-4">
            <dt className="text-[length:var(--nt-text-body)] font-medium">{fact.term}</dt>
            <dd className="flex flex-col items-start gap-3">
              <p className="nt-small">{fact.detail}</p>
              <NtButton asChild tone="link" size="sm">
                <Link href={fact.href} className="underline underline-offset-4">
                  {fact.action}
                </Link>
              </NtButton>
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
