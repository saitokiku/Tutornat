'use client';

import { useEffect, useRef } from 'react';

import { publicConfig } from '@/kaizen.config';
import type { TranscriptEntry } from '@/lib/tutor/voice/turn-controller';

/**
 * The running transcript. It is a log, not a chat: the tutor's text is the
 * same words the voice is saying, kept at reading size for a ten-year-old
 * (design-system type rule), and the learner's turns are quieter. The tutor
 * is named (D37); the AI label lives on the tutor tile, once.
 *
 * The list follows the newest entry unless the reader has scrolled up, which
 * is the one thing that makes a transcript unusable during a live session.
 */
export function Transcript({
  entries,
  learnerName,
}: {
  entries: readonly TranscriptEntry[];
  learnerName: string;
}) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const pinned = useRef(true);

  useEffect(() => {
    const list = listRef.current;
    if (!list || !pinned.current) return;
    list.scrollTop = list.scrollHeight;
  }, [entries]);

  const onScroll = () => {
    const list = listRef.current;
    if (!list) return;
    pinned.current = list.scrollHeight - list.scrollTop - list.clientHeight < 48;
  };

  return (
    <section className="nt-tile nt-transcript-tile" aria-label="Transcript">
      <div
        ref={listRef}
        onScroll={onScroll}
        className="nt-transcript"
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        tabIndex={0}
      >
        {entries.length === 0 ? (
          <p className="nt-small">
            What you and {publicConfig.product.tutorName} say shows up here.
          </p>
        ) : (
          entries.map((entry) => (
            <article
              key={entry.id}
              className="nt-turn"
              data-role={entry.role}
              data-status={entry.status}
            >
              <span className="nt-turn-who">
                {entry.role === 'tutor' ? publicConfig.product.tutorName : learnerName}
              </span>
              <p className="nt-turn-text">
                {entry.text ||
                  (entry.status === 'streaming'
                    ? '…'
                    : entry.status === 'failed'
                      ? 'That turn did not come through.'
                      : '')}
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
