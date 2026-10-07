'use client';

import { useCallback, useState } from 'react';

import { publicConfig } from '@/kaizen.config';
import {
  formatDateTime,
  formatMinutes,
  inputModeLabel,
  parentApi,
  type ClientResult,
} from '@/lib/tutor/client';
import type { Learner, TurnRecord, TutorSession } from '@/lib/tutor/contracts';
import type { TranscriptsResponse } from '@/lib/tutor/wire';

import { EmptyState } from '@/components/tutor/shell/states';
import { Async } from '@/components/tutor/ui/async';
import { NtButton } from '@/components/tutor/ui/button';
import { Pill } from '@/components/tutor/ui/section';
import { useLoad } from '@/components/tutor/ui/use-load';

import { LearnerPicker, useLearnerParam } from './learner-picker';

const AI_LABEL = publicConfig.product.aiLabel;

const EMPTY: ClientResult<TranscriptsResponse> = {
  ok: true,
  data: { sessions: [], turns: null },
};

/**
 * Transcript access for the account holder (spec §5.6, R11): every session of
 * the chosen learner, and every turn of the chosen session, exactly as it was
 * recorded. Audio is never stored, so a transcript is all there is to read.
 */
export function TranscriptReader({ learners }: { learners: Learner[] }) {
  const { learnerId, learner, select } = useLearnerParam(learners);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const listSessions = useCallback(() => parentApi.getTranscripts(learnerId), [learnerId]);
  const sessions = useLoad(listSessions);

  const readTurns = useCallback(
    () => (sessionId ? parentApi.getTranscripts(learnerId, sessionId) : Promise.resolve(EMPTY)),
    [learnerId, sessionId],
  );
  const turns = useLoad(readTurns);

  return (
    <div className="flex flex-col gap-6">
      <LearnerPicker
        learners={learners}
        learnerId={learnerId}
        onSelect={(id) => {
          setSessionId(null);
          select(id);
        }}
        hint="Transcripts belong to the profile."
      />
      <div className="grid gap-6 lg:grid-cols-[20rem_1fr] lg:items-start">
        <section aria-labelledby="sessions-title" className="flex flex-col gap-3">
          <h2 id="sessions-title" className="nt-h3">
            Sessions
          </h2>
          <Async loaded={sessions} label="Loading the sessions" lines={4}>
            {(data) =>
              data.sessions.length === 0 ? (
                <EmptyState
                  title="No sessions yet"
                  body={`Nothing has been recorded for ${learner?.displayName ?? 'this profile'}.`}
                />
              ) : (
                <ul className="flex flex-col gap-2">
                  {data.sessions.map((session) => (
                    <li key={session.id}>
                      <SessionButton
                        session={session}
                        selected={session.id === sessionId}
                        onSelect={() => setSessionId(session.id)}
                      />
                    </li>
                  ))}
                </ul>
              )
            }
          </Async>
        </section>

        <section aria-labelledby="turns-title" className="flex min-w-0 flex-col gap-3">
          <h2 id="turns-title" className="nt-h3">
            Transcript
          </h2>
          {sessionId === null ? (
            <EmptyState
              title="Choose a session"
              body="Pick one from the list to read every turn of it."
            />
          ) : (
            <Async loaded={turns} label="Loading the transcript" lines={6}>
              {(data) => <TurnList turns={data.turns ?? []} />}
            </Async>
          )}
        </section>
      </div>
    </div>
  );
}

function SessionButton({
  session,
  selected,
  onSelect,
}: {
  session: TutorSession;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <NtButton
      tone={selected ? 'secondary' : 'ghost'}
      size="sm"
      aria-pressed={selected}
      onClick={onSelect}
      className="h-auto w-full items-start justify-start gap-2 whitespace-normal py-3 text-left"
    >
      <span className="flex min-w-0 flex-col gap-1">
        <span className="font-medium">{formatDateTime(session.startedAt)}</span>
        <span className="nt-small">
          {formatMinutes(session.minutes)} · {inputModeLabel(session.mode)}
          {session.thumbs
            ? session.thumbs === 'up'
              ? ' · rated helpful'
              : ' · rated not helpful'
            : ''}
        </span>
      </span>
    </NtButton>
  );
}

function TurnList({ turns }: { turns: TurnRecord[] }) {
  if (turns.length === 0) {
    return (
      <EmptyState
        title="This session has no turns"
        body="It ended before anything was said or typed."
      />
    );
  }
  return (
    <ol className="flex flex-col gap-3">
      {turns.map((turn) => (
        <li
          key={turn.id}
          className={
            turn.role === 'learner'
              ? 'flex flex-col gap-1 rounded-(--radius) bg-muted px-4 py-3'
              : 'flex flex-col gap-1 rounded-(--radius) border border-border bg-card px-4 py-3'
          }
        >
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={turn.role === 'learner' ? 'neutral' : 'brand'}>
              {turn.role === 'learner' ? 'Learner' : AI_LABEL}
            </Pill>
            <span className="nt-small">{formatDateTime(turn.ts)}</span>
          </div>
          <p className="text-[length:var(--nt-text-body)] break-words whitespace-pre-wrap">
            {turn.text}
          </p>
        </li>
      ))}
    </ol>
  );
}
