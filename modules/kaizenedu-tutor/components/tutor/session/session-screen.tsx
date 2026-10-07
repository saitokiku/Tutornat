'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import type { AgeBand } from '@/kaizen.config';
import { publicConfig } from '@/kaizen.config';
import { PRODUCT_ROUTES } from '@/lib/tutor/contracts';
import { isAudioUnlocked } from '@/lib/tutor/voice/audio-context';
import type { TranscriptEntry } from '@/lib/tutor/voice/turn-controller';
import type { GetSessionResponse } from '@/lib/tutor/wire';

import { BoardPane } from '@/components/tutor/board/board-pane';
import { InlineNotice } from '@/components/tutor/shell/states';
import { NtButton } from '@/components/tutor/ui/button';

import { CheckCard, CheckResultCard } from './check-card';
import { Dock } from './dock';
import { EntitlementBanner } from './entitlement-banner';
import { MetricsOverlay } from './metrics-overlay';
import { ReportProblem } from './report-problem';
import { Transcript } from './transcript';
import { TutorTile, type TileCaption, type TilePhase } from './tutor-tile';
import { useTutorSession } from './use-tutor-session';
import { WrapScreen } from './wrap-screen';

export interface SessionScreenProps {
  data: GetSessionResponse;
  band: AgeBand;
  learnerName: string;
  disabledRecoverySteps: readonly number[];
  /** A guest session (D35): the wrap screen has no plan and no account holder to name. */
  guest?: boolean;
}

/** About the last two sentences of a turn, short enough for the tile. */
const CAPTION_MAX_CHARS = 180;

export function tailSentences(text: string, count = 2): string {
  const parts = text
    .split(/(?<=[.!?…])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  let tail = parts.slice(-count).join(' ');
  if (tail.length > CAPTION_MAX_CHARS) tail = `…${tail.slice(-CAPTION_MAX_CHARS).trimStart()}`;
  return tail;
}

/**
 * What the tile says (D36). While the tutor is thinking about what the
 * learner just said, their own words; otherwise the tutor's latest words, so
 * the question stays in view while the learner answers it.
 */
export function captionFor(
  entries: readonly TranscriptEntry[],
  phase: TilePhase,
): TileCaption | null {
  const last = entries[entries.length - 1];
  if (last && last.role === 'learner' && last.text && phase === 'thinking') {
    return { who: 'learner', text: tailSentences(last.text, 3) };
  }
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index]!;
    if (entry.role === 'tutor' && entry.text) {
      return { who: 'tutor', text: tailSentences(entry.text) };
    }
  }
  return null;
}

/**
 * The live session (spec §5.10 A). Three panes on a desktop — the tutor, the
 * board, the transcript with the dock — stacked on a phone with the tutor
 * pinned at the top and the dock pinned to the bottom.
 *
 * The press that made this session (the landing button, D36) unlocked audio
 * and asked for the microphone, and navigated here with `?go=1`, so the
 * screen starts itself: the tutor speaks first. A reload, a shared link or a
 * browser that lost the unlock lands on the ready state instead, because
 * audio on iOS Safari can only start inside a user gesture
 * (`lib/tutor/voice/audio-context.ts`).
 */
export function SessionScreen({
  data,
  band,
  learnerName,
  disabledRecoverySteps,
  guest = false,
}: SessionScreenProps) {
  const search = useSearchParams();
  const showMetrics = search.get('metrics') === '1';
  const go = search.get('go') === '1';
  const [reporting, setReporting] = useState(false);
  const autoStarted = useRef(false);
  const session = useTutorSession({
    sessionId: data.session.id,
    band,
    initial: data,
    disabledRecoverySteps,
  });
  const { state, stopped } = session;
  const name = publicConfig.product.tutorName;

  // A terminal error (cost ceiling, paused tutor, ended session) stops the
  // session rather than leaving a dead screen with a message on it.
  useEffect(() => {
    if (state.error?.terminal) session.endSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.error?.terminal]);

  useEffect(() => {
    if (!go || autoStarted.current || session.started || session.starting || stopped) return;
    if (!isAudioUnlocked()) return;
    autoStarted.current = true;
    session.start();
  }, [go, session, stopped]);

  const caption = useMemo(
    () => captionFor(state.transcript, state.phase),
    [state.transcript, state.phase],
  );

  if (stopped) {
    return (
      <WrapScreen
        sessionId={data.session.id}
        reason={stopped}
        initialSummary={data.session.summary}
        guest={guest}
      />
    );
  }

  if (!session.started) {
    return (
      <main className="nt-wrap" id="main">
        <h1 className="nt-h1">{name} is ready.</h1>
        <p className="nt-lead">
          Press start and say what you are working on. {name} is an {publicConfig.product.aiLabel}:
          it hears you, answers out loud, and writes on the board. Your camera stays off, and the
          recording of your voice is used to make out the words and is never kept.
        </p>
        <div className="flex flex-wrap gap-3">
          <NtButton size="lg" onClick={session.start} busy={session.starting}>
            Start
          </NtButton>
          <NtButton asChild tone="secondary" size="lg">
            <Link href={PRODUCT_ROUTES.learn}>Not now</Link>
          </NtButton>
        </div>
        {session.micMessage ? (
          <InlineNotice tone="warning" role="status">
            {session.micMessage}
          </InlineNotice>
        ) : null}
      </main>
    );
  }

  return (
    <div className="nt-session">
      <main className="nt-session-body" id="main">
        <TutorTile
          phase={state.phase}
          drawing={session.drawing}
          gaze={session.gaze}
          amplitude={session.amplitude}
          reaction={state.reaction}
          elapsedMs={session.elapsedMs}
          budgetMs={session.budgetMs}
          cue={session.cue}
          caption={caption}
        />

        <BoardPane board={session.board} busy={state.busy} />

        <div className="nt-rail">
          <EntitlementBanner entitlement={session.entitlement} />

          {state.connection === 'retrying' ? (
            <InlineNotice tone="neutral" role="status">
              Reconnecting
            </InlineNotice>
          ) : null}

          {state.audioFailed ? (
            <InlineNotice tone="neutral" role="status">
              Voice is off; {name} is writing instead.
            </InlineNotice>
          ) : null}

          {session.recovery && !session.recovery.pause ? (
            <InlineNotice tone="neutral" role="status">
              {session.recovery.spec.label}
            </InlineNotice>
          ) : null}

          {session.micMessage && session.mic !== 'unknown' && session.mic !== 'requesting' ? (
            <InlineNotice tone="neutral" role="status">
              {session.micMessage}
            </InlineNotice>
          ) : null}

          {state.notice === 'nothing-heard' ? (
            <InlineNotice
              tone="neutral"
              role="status"
              action={
                <NtButton tone="ghost" size="sm" onClick={session.clearNotice}>
                  Dismiss
                </NtButton>
              }
            >
              Nothing came through. Try again, or type it.
            </InlineNotice>
          ) : null}

          {state.error && !state.error.terminal ? (
            <InlineNotice
              tone="warning"
              role="alert"
              action={
                <NtButton tone="ghost" size="sm" onClick={session.clearError}>
                  Dismiss
                </NtButton>
              }
            >
              {state.error.message}
            </InlineNotice>
          ) : null}

          {state.check ? (
            <CheckCard
              key={state.check.checkId}
              sessionId={data.session.id}
              check={state.check}
              onResult={session.applyCheckResult}
            />
          ) : state.lastCheckResult ? (
            <CheckResultCard result={state.lastCheckResult} />
          ) : null}

          <Transcript entries={state.transcript} learnerName={learnerName} />

          <Dock
            preference={session.preference}
            onPreference={session.setPreference}
            mic={session.mic}
            micMessage={session.micMessage}
            onRequestMic={session.requestMic}
            muted={session.muted}
            onMuted={session.setMuted}
            talking={session.talking}
            onPressToTalk={session.pressToTalk}
            onReleaseToTalk={session.releaseToTalk}
            onCancelToTalk={session.cancelToTalk}
            onSubmitText={session.submitText}
            onEnd={session.endSession}
            onReport={() => setReporting(true)}
          />
        </div>
      </main>

      {showMetrics ? <MetricsOverlay metrics={state.metrics} /> : null}
      <ReportProblem
        sessionId={data.session.id}
        open={reporting}
        onClose={() => setReporting(false)}
      />
    </div>
  );
}
