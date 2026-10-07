'use client';

import { useCallback } from 'react';
import { ThumbsDown, ThumbsUp } from 'lucide-react';

import {
  attentionSentence,
  describeMisconception,
  formatDate,
  formatEstimate,
  masteryStatusLabel,
  misconceptionTitle,
  parentApi,
  summarizeLearning,
} from '@/lib/tutor/client';
import type { Learner, MasteryStatus, ParentReport } from '@/lib/tutor/contracts';
import type { ReportResponse } from '@/lib/tutor/wire';

import { EmptyState, InlineNotice } from '@/components/tutor/shell/states';
import { Async } from '@/components/tutor/ui/async';
import { EstimateBar, Pill, Section } from '@/components/tutor/ui/section';
import { useLoad } from '@/components/tutor/ui/use-load';

/**
 * The per-learner report (spec §5.9, R11). It opens with the three sentences
 * a parent actually came for and keeps the numbers underneath, because a
 * table of percentages is evidence, not an answer. Skills are named, never
 * shown as graph ids, and a skill with no checks gets no row at all.
 *
 * Two rules shape every line: the word mastery appears only for a `confirmed`
 * skill, and the whole page is labelled as generated so it can never be read
 * as a person's assessment.
 */

const STATUS_TONE: Record<MasteryStatus, 'neutral' | 'brand' | 'success' | 'warning'> = {
  not_started: 'neutral',
  in_progress: 'brand',
  mastered: 'warning',
  confirmed: 'success',
};

export interface NextCheck {
  skillName: string;
  dueAt: string;
}

export function ReportView({
  learner,
  nextCheck,
  masteryNote,
}: {
  learner: Learner;
  nextCheck: NextCheck | null;
  masteryNote: string;
}) {
  const load = useCallback(() => parentApi.getReport(learner.id), [learner.id]);
  const loaded = useLoad(load);
  return (
    <Async loaded={loaded} label="Loading the report" lines={6}>
      {(data) => (
        <ReportBody learner={learner} data={data} nextCheck={nextCheck} masteryNote={masteryNote} />
      )}
    </Async>
  );
}

function ReportBody({
  learner,
  data,
  nextCheck,
  masteryNote,
}: {
  learner: Learner;
  data: ReportResponse;
  nextCheck: NextCheck | null;
  masteryNote: string;
}) {
  const report: ParentReport = data.report;
  const confirmed = report.skills.filter((skill) => skill.status === 'confirmed');
  const touched = report.skills.filter((skill) => skill.status !== 'not_started');
  const summary = summarizeLearning(report);

  return (
    <div className="flex flex-col gap-8">
      <InlineNotice title="This report is generated">{data.generatedLabel}</InlineNotice>

      <section aria-labelledby="week-title" className="flex flex-col gap-3">
        <h2 id="week-title" className="nt-h2">
          Week of {formatDate(report.weekStart)}
        </h2>
        <div className="flex flex-col gap-1.5">
          <p className="nt-lead text-foreground">
            {report.sessions === 0
              ? `No sessions this week for ${learner.displayName}.`
              : summary.activity}
          </p>
          {summary.progress ? <p className="nt-body">{summary.progress}</p> : null}
          {summary.next ? (
            <p className="nt-body">Next session works on {summary.next}.</p>
          ) : (
            <p className="nt-body">
              Nothing is queued. The next session opens with a short placement check.
            </p>
          )}
        </div>
      </section>

      <Section
        title="The numbers behind that"
        description="Where each skill started this week and where it is now. An estimate is what the checks in session imply; it is not a claim of mastery."
      >
        {touched.length === 0 ? (
          <EmptyState
            title="No checks recorded yet"
            body="Estimates appear after the first session with graded checks."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-[length:var(--nt-text-small)]">
              <caption className="sr-only">
                Per-skill starting estimate, current estimate, and status
              </caption>
              <thead>
                <tr className="border-b border-border text-left">
                  <th scope="col" className="py-2 pr-3 font-semibold">
                    Skill
                  </th>
                  <th scope="col" className="py-2 pr-3 font-semibold">
                    Starting
                  </th>
                  <th scope="col" className="py-2 pr-3 font-semibold">
                    Now
                  </th>
                  <th scope="col" className="w-40 py-2 pr-3 font-semibold">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {touched.map((skill) => (
                  <tr key={skill.skillId} className="border-b border-border align-top">
                    <th scope="row" className="py-2 pr-3 text-left font-normal">
                      {skill.name}
                    </th>
                    <td className="nt-num py-2 pr-3">
                      {skill.startingEstimate === null
                        ? 'No earlier data'
                        : formatEstimate(skill.startingEstimate)}
                    </td>
                    <td className="nt-num py-2 pr-3">{formatEstimate(skill.currentEstimate)}</td>
                    <td className="py-2 pr-3">
                      <div className="flex flex-col gap-1.5">
                        <Pill tone={STATUS_TONE[skill.status]}>
                          {masteryStatusLabel(skill.status)}
                        </Pill>
                        <EstimateBar
                          value={skill.currentEstimate}
                          status={skill.status}
                          label={skill.name}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="What is confirmed" description={masteryNote}>
        {confirmed.length === 0 ? (
          <p className="nt-body text-muted-foreground">
            Nothing is confirmed yet. Confirmation needs a check with no help at least a day after
            the estimate was reached, so it lags real progress by design.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {confirmed.map((skill) => (
              <li key={skill.skillId} className="flex flex-wrap items-center gap-2">
                <Pill tone="success">Confirmed</Pill>
                <span className="text-[length:var(--nt-text-body)]">{skill.name}</span>
              </li>
            ))}
          </ul>
        )}
        {nextCheck ? (
          <p className="nt-small">
            The next one is {nextCheck.skillName}, due {formatDate(nextCheck.dueAt)}.
          </p>
        ) : (
          <p className="nt-small">The tutor has not scheduled the next one yet.</p>
        )}
      </Section>

      <Section
        title="Habits the tutor is working on"
        description="A habit is noted when the same mistake appears twice and dropped after three clean answers."
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <h3 className="nt-h3">Open</h3>
            {report.misconceptionsOpen.length === 0 ? (
              <p className="nt-small">None open.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {report.misconceptionsOpen.map((tag) => (
                  <li key={tag} className="flex flex-col gap-0.5">
                    <span className="text-[length:var(--nt-text-body)] font-medium">
                      {misconceptionTitle(tag)}
                    </span>
                    <span className="nt-small">{describeMisconception(tag, 'parent')}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="nt-h3">Resolved</h3>
            {report.misconceptionsResolved.length === 0 ? (
              <p className="nt-small">None resolved yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {report.misconceptionsResolved.map((tag) => (
                  <li key={tag} className="nt-small">
                    {misconceptionTitle(tag)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Section>

      <Section
        title="Session notes"
        description="One line per session, written by the tutor at the end, with the learner's rating."
      >
        {report.sessionNotes.length === 0 ? (
          <EmptyState title="No sessions yet" body="Notes appear here after the first session." />
        ) : (
          <ol className="flex flex-col gap-3">
            {report.sessionNotes.map((note) => (
              <li key={note.sessionId} className="nt-panel flex flex-col gap-2 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="nt-label">{formatDate(note.date)}</span>
                  {note.thumbs ? (
                    <span className="nt-small inline-flex items-center gap-1">
                      {note.thumbs === 'up' ? (
                        <ThumbsUp className="size-4" aria-hidden="true" />
                      ) : (
                        <ThumbsDown className="size-4" aria-hidden="true" />
                      )}
                      {note.thumbs === 'up' ? 'Rated helpful' : 'Rated not helpful'}
                    </span>
                  ) : (
                    <span className="nt-small">No rating given</span>
                  )}
                </div>
                <p className="nt-body">{note.note}</p>
              </li>
            ))}
          </ol>
        )}
      </Section>

      {report.attention ? (
        <Section
          title="Attention"
          description="Aggregates from the on-device sensor. No camera image, face landmark, or template ever leaves the browser."
        >
          <p className="nt-body">{attentionSentence(report.attention)}</p>
          <p className="nt-small">
            This is shown to you, not used to keep anyone on screen. Sessions end at their scheduled
            length either way, and you can switch any recovery step off in settings.
          </p>
        </Section>
      ) : null}
    </div>
  );
}
