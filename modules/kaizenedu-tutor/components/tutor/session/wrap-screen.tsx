'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ThumbsDown, ThumbsUp } from 'lucide-react';

import { PRODUCT_ROUTES } from '@/lib/tutor/contracts';
import type { SessionSummary } from '@/lib/tutor/contracts';

import { InlineNotice, LoadingState } from '@/components/tutor/shell/states';
import { NtButton } from '@/components/tutor/ui/button';

import { requestWrap, setThumbs } from './api';
import type { StopReason } from './use-tutor-session';

type StopCopy = Record<Exclude<StopReason, null>, { title: string; body: string }>;

const STOP_COPY: StopCopy = {
  ended: { title: 'Session finished', body: 'Here is what you worked on.' },
  'out-of-minutes': {
    title: 'Out of minutes',
    body: 'The plan ran out of minutes, so the session stopped here. Everything below was saved.',
  },
  paused: {
    title: 'Session paused',
    body: 'You were away for a while, so the tutor paused and told the account holder. Nothing was lost.',
  },
};

/** A guest (D35) has a free daily allowance, no plan, and no account holder to tell. */
const GUEST_STOP_COPY: StopCopy = {
  ended: STOP_COPY.ended,
  'out-of-minutes': {
    title: 'Out of minutes',
    body: 'Today’s free minutes ran out, so the session stopped here. Everything below was saved.',
  },
  paused: {
    title: 'Session paused',
    body: 'You were away for a while, so the tutor paused. Nothing was lost.',
  },
};

/**
 * The WRAP screen (spec §5.2): a recap, the practice to do next, and one
 * thumbs question. No score, no streak, no "come back tomorrow" — the session
 * ended, and this is the record of it (D15).
 */
export function WrapScreen({
  sessionId,
  reason,
  initialSummary,
  guest = false,
}: {
  sessionId: string;
  reason: Exclude<StopReason, null>;
  initialSummary: SessionSummary | null;
  guest?: boolean;
}) {
  const [summary, setSummary] = useState<SessionSummary | null>(initialSummary);
  const [loading, setLoading] = useState(initialSummary === null);
  const [failure, setFailure] = useState<string | null>(null);
  const [thumbs, setThumbsState] = useState<'up' | 'down' | null>(null);
  const [thumbsBusy, setThumbsBusy] = useState(false);

  useEffect(() => {
    if (summary !== null) return;
    let cancelled = false;
    void requestWrap(sessionId).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result.ok) setSummary(result.data.summary);
      else setFailure(result.message);
    });
    return () => {
      cancelled = true;
    };
  }, [sessionId, summary]);

  const vote = async (value: 'up' | 'down') => {
    setThumbsBusy(true);
    setThumbsState(value);
    const result = await setThumbs(sessionId, value);
    setThumbsBusy(false);
    if (!result.ok) {
      setThumbsState(null);
      setFailure(result.message);
    }
  };

  const copy = (guest ? GUEST_STOP_COPY : STOP_COPY)[reason];

  return (
    <main className="nt-wrap" id="main">
      <header className="flex flex-col gap-2">
        <h1 className="nt-h1">{copy.title}</h1>
        <p className="nt-lead">{copy.body}</p>
      </header>

      {loading ? <LoadingState label="Writing the recap" /> : null}

      {failure && !summary ? (
        <InlineNotice tone="warning" role="alert" title="The recap did not load">
          {failure}
        </InlineNotice>
      ) : null}

      {summary ? (
        <>
          <section className="nt-panel flex flex-col gap-2 p-5">
            <h2 className="nt-h3">What you did</h2>
            <p className="nt-body">{summary.recap}</p>
            {summary.checks > 0 ? (
              <p className="nt-small">
                {summary.checksCorrect} of {summary.checks} checks right.
              </p>
            ) : null}
          </section>

          {summary.practice.length > 0 ? (
            <section className="nt-panel flex flex-col gap-2 p-5">
              <h2 className="nt-h3">Practice before next time</h2>
              <ul className="nt-body flex list-disc flex-col gap-1 ps-6">
                {summary.practice.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}

      <section className="nt-panel flex flex-col gap-3 p-5">
        <h2 className="nt-h3">Was this session useful?</h2>
        <div className="flex gap-3">
          <NtButton
            tone={thumbs === 'up' ? 'primary' : 'secondary'}
            onClick={() => void vote('up')}
            busy={thumbsBusy && thumbs === 'up'}
            aria-pressed={thumbs === 'up'}
          >
            <ThumbsUp className="size-4" aria-hidden="true" />
            Yes
          </NtButton>
          <NtButton
            tone={thumbs === 'down' ? 'primary' : 'secondary'}
            onClick={() => void vote('down')}
            busy={thumbsBusy && thumbs === 'down'}
            aria-pressed={thumbs === 'down'}
          >
            <ThumbsDown className="size-4" aria-hidden="true" />
            No
          </NtButton>
        </div>
        {thumbs ? (
          <p className="nt-small" role="status">
            {guest
              ? 'Recorded with the session notes.'
              : 'Recorded. The account holder sees this with the session notes.'}
          </p>
        ) : null}
      </section>

      <div>
        <NtButton asChild tone="primary" size="lg">
          <Link href={PRODUCT_ROUTES.learn}>Back to Learn</Link>
        </NtButton>
      </div>
    </main>
  );
}
