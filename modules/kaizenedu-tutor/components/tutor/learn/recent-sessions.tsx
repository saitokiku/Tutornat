import Link from 'next/link';
import { ThumbsDown, ThumbsUp } from 'lucide-react';

import { formatDateTime, formatMinutes, inputModeLabel } from '@/lib/tutor/client';
import type { TutorSession } from '@/lib/tutor/contracts';
import { PRODUCT_ROUTES } from '@/lib/tutor/contracts';

import { EmptyState } from '@/components/tutor/shell/states';
import { NtButton } from '@/components/tutor/ui/button';
import { Pill, Section } from '@/components/tutor/ui/section';

/**
 * The last few sessions with the recap the tutor wrote at WRAP and the
 * learner's thumbs. A session that never ended offers a way back into it;
 * ended sessions are read-only here.
 */
export function RecentSessions({ sessions }: { sessions: TutorSession[] }) {
  return (
    <Section
      id="sessions"
      title="Recent sessions"
      description="What the tutor wrote at the end of each session, and the rating given."
    >
      {sessions.length === 0 ? (
        <EmptyState
          title="No sessions yet"
          body="After the first session this list holds the recap, what to practice, and the rating."
        />
      ) : (
        <ol className="flex flex-col gap-3">
          {sessions.map((session) => (
            <li key={session.id} className="nt-panel flex flex-col gap-3 p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h3 className="nt-h3">{formatDateTime(session.startedAt)}</h3>
                <Pill>{inputModeLabel(session.mode)}</Pill>
                <Pill>{formatMinutes(session.minutes)}</Pill>
                {session.endedAt ? null : <Pill tone="brand">Still open</Pill>}
                {session.thumbs ? (
                  <span className="nt-small inline-flex items-center gap-1">
                    {session.thumbs === 'up' ? (
                      <ThumbsUp className="size-4" aria-hidden="true" />
                    ) : (
                      <ThumbsDown className="size-4" aria-hidden="true" />
                    )}
                    {session.thumbs === 'up' ? 'Rated helpful' : 'Rated not helpful'}
                  </span>
                ) : null}
              </div>
              {session.summary ? (
                <>
                  <p className="nt-body">{session.summary.recap}</p>
                  {session.summary.checks > 0 ? (
                    <p className="nt-small nt-num">
                      {session.summary.checksCorrect} of {session.summary.checks} checks correct.
                    </p>
                  ) : null}
                  {session.summary.practice.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      <p className="nt-label">To practice</p>
                      <ul className="nt-small flex list-disc flex-col gap-1 pl-5 text-foreground">
                        {session.summary.practice.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="nt-small">
                  {session.endedAt
                    ? 'This session ended before a recap was written.'
                    : 'The recap is written when the session ends.'}
                </p>
              )}
              {session.endedAt ? null : (
                <div>
                  <NtButton asChild tone="secondary">
                    <Link href={PRODUCT_ROUTES.session(session.id)}>Go back to this session</Link>
                  </NtButton>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}
