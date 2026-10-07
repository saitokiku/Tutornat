'use client';

import { CalendarClock, Check, ChevronDown } from 'lucide-react';

import {
  buildProgressRows,
  describeMisconception,
  dueCheckLabel,
  formatEstimate,
  learnerProgressSentence,
  masteryStatusLabel,
  misconceptionTitle,
  nextDueCheck,
  openMisconceptions,
  recentlyLearned,
  sessionsSentence,
  tallyProgress,
  touchedRows,
  untouchedRows,
  type ProgressRow,
} from '@/lib/tutor/client';
import type { MasteryStatus } from '@/lib/tutor/contracts';
import type { ProgressResponse } from '@/lib/tutor/wire';

import { EmptyState, InlineNotice } from '@/components/tutor/shell/states';
import { Async } from '@/components/tutor/ui/async';
import { EstimateBar, Pill, Section } from '@/components/tutor/ui/section';
import type { Loaded } from '@/components/tutor/ui/use-load';

/**
 * Progress for the learner (spec §5.7, R19). It answers "am I getting
 * better?", so it leads with a sentence, the handful of skills that have
 * actually moved, and the one check that is due. The skill graph itself is
 * structure, not a screen: untouched skills are named behind a disclosure and
 * never rendered as a wall of empty rows.
 *
 * Since D35 the list also carries one row per subject the learner has
 * touched in a topic session (`slice: 'subjects'`): a coarse estimate from
 * the checks the tutor wrote in that subject, rendered like any other row
 * and labelled as a subject rather than a named skill.
 *
 * The wording is the product's central claim and is load-bearing: only a
 * `confirmed` skill is called mastery, everything else is named an estimate,
 * and the delayed unaided check that does the confirming is shown when it
 * falls due (D17).
 */

const SUBJECT_SLICE = 'subjects';

const STATUS_TONE: Record<MasteryStatus, 'neutral' | 'brand' | 'success' | 'warning'> = {
  not_started: 'neutral',
  in_progress: 'brand',
  mastered: 'warning',
  confirmed: 'success',
};

export function ProgressPanel({ loaded }: { loaded: Loaded<ProgressResponse> }) {
  return (
    <Section
      id="progress"
      title="How it is going"
      description="What the checks show so far, in any subject. An estimate moves with every check; a skill counts as learned only after a check with no help, a day or more later."
    >
      <Async loaded={loaded} label="Loading your progress" lines={5}>
        {(data) => <ProgressBody data={data} />}
      </Async>
    </Section>
  );
}

function ProgressBody({ data }: { data: ProgressResponse }) {
  const rows = buildProgressRows(data.skills, data.mastery, data.dueChecks);
  const tally = tallyProgress(rows);
  const open = openMisconceptions(data.misconceptions);
  const touched = touchedRows(rows);
  const untouched = untouchedRows(rows);
  const learned = recentlyLearned(rows);
  const due = nextDueCheck(rows);

  if (rows.length === 0) {
    return (
      <EmptyState
        title="Progress is not available"
        body="The skill list could not be loaded from the server. Starting a session still works."
      />
    );
  }

  // A learner who has done nothing gets an invitation, not a table of zeros.
  if (touched.length === 0) {
    return (
      <EmptyState
        title="Nothing checked yet"
        body="After your first session this shows what you have covered, in any subject, what the tutor confirmed without helping, and what is due for another look."
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="nt-body">
        {learnerProgressSentence(tally)} {sessionsSentence(data.sessions, data.minutes)}
      </p>

      {due ? (
        <InlineNotice tone="warning" title="A check is due">
          <span className="flex items-center gap-2">
            <CalendarClock className="size-4 shrink-0" aria-hidden="true" />
            <span>
              {due.skill.name}
              {due.nextCheckAt ? ` — ${dueCheckLabel(due.nextCheckAt)}` : ''}
            </span>
          </span>
          <p className="pt-1">
            The tutor runs it at the start of your next session, with no hints. Passing it means the
            skill is learned for good.
          </p>
        </InlineNotice>
      ) : null}

      {learned.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 className="nt-h3">Where you are strongest</h3>
          <ul className="flex flex-col gap-2">
            {learned.map((row) => (
              <li key={row.skill.id} className="flex items-start gap-2">
                <Check
                  className={
                    row.status === 'confirmed'
                      ? 'mt-1 size-4 shrink-0 text-(--nt-success)'
                      : 'mt-1 size-4 shrink-0 text-muted-foreground'
                  }
                  aria-hidden="true"
                />
                <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="min-w-0 text-[length:var(--nt-text-body)] font-medium break-words">
                    {row.skill.name}
                  </span>
                  {row.skill.slice === SUBJECT_SLICE ? <Pill>Subject</Pill> : null}
                  <Pill tone={STATUS_TONE[row.status]}>{masteryStatusLabel(row.status)}</Pill>
                </span>
              </li>
            ))}
          </ul>
          <p className="nt-small">
            Confirmed means the tutor checked it a day or more later without helping. An estimate is
            what the checks in session imply, and it is not a claim of mastery.
          </p>
        </div>
      ) : null}

      {open.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 className="nt-h3">What trips you up</h3>
          <ul className="flex flex-col gap-2">
            {open.map((entry) => (
              <li key={entry.tag} className="flex flex-col gap-0.5">
                <span className="text-[length:var(--nt-text-body)] font-medium">
                  {misconceptionTitle(entry.tag)}
                </span>
                <span className="nt-small">{describeMisconception(entry.tag, 'learner')}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <AllSkills touched={touched} untouched={untouched} />
    </div>
  );
}

/**
 * Everything checked so far and the fractions sequence behind it, on demand.
 * It is here because a learner sometimes wants to see the road ahead, not
 * because the screen needs to prove the graph exists.
 */
function AllSkills({ touched, untouched }: { touched: ProgressRow[]; untouched: ProgressRow[] }) {
  return (
    <details className="group border-t border-border pt-3">
      <summary className="nt-target flex cursor-pointer list-none items-center gap-1.5 text-[length:var(--nt-text-body)] font-medium text-muted-foreground marker:content-none hover:text-foreground [&::-webkit-details-marker]:hidden">
        Every subject and skill
        <ChevronDown
          className="size-4 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="flex flex-col gap-4 pt-3">
        <ul className="flex flex-col divide-y divide-border">
          {touched.map((row) => (
            <SkillRow key={row.skill.id} row={row} />
          ))}
        </ul>
        {untouched.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            <h4 className="nt-label">In the fractions sequence, not started yet</h4>
            <p className="nt-body text-muted-foreground">
              {untouched.map((row) => row.skill.name).join(' · ')}
            </p>
          </div>
        ) : null}
      </div>
    </details>
  );
}

function SkillRow({ row }: { row: ProgressRow }) {
  const subject = row.skill.slice === SUBJECT_SLICE;
  return (
    <li className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="min-w-0 text-[length:var(--nt-text-body)] font-medium">
          {row.skill.name}
        </span>
        {subject ? <Pill>Subject</Pill> : null}
        <Pill tone={STATUS_TONE[row.status]}>{masteryStatusLabel(row.status)}</Pill>
        <span className="nt-small nt-num ml-auto">{formatEstimate(row.estimate)}</span>
      </div>
      <EstimateBar value={row.estimate} status={row.status} label={row.skill.name} />
      {subject ? (
        <p className="nt-small">
          From the checks the tutor wrote in this subject, not a named skill.
        </p>
      ) : null}
    </li>
  );
}
