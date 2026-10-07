/**
 * The weekly report (spec R18; parent-comms skill): the confirmed headline,
 * what moved by name, sessions and minutes, then one tutor note per session
 * under GENERATED_LABEL, then the link. Under 200 words before the notes.
 * The subject names the learner and the week and nothing else. Every value a
 * person or the model wrote goes through escapeHtml.
 */
import { PRODUCT } from '@/kaizen.config';
import { GENERATED_LABEL, REPORT_MASTERY_NOTE } from '@/lib/tutor/report/parent-report';
import type { WeeklyLead } from '@/lib/tutor/report/lead';

import {
  EMAIL_PALETTE,
  emailButton,
  emailLayout,
  emailParagraph,
  escapeHtml,
  type EmailDocument,
} from '../html';

export interface WeeklyNote {
  /** ISO date of the session. */
  date: string;
  note: string;
  thumbs: 'up' | 'down' | null;
}

export interface WeeklyReportInput {
  learnerName: string;
  /** The Monday the week began, as a person says it: "31 August". */
  weekLabel: string;
  lead: WeeklyLead;
  sessions: number;
  minutes: number;
  /** Misconceptions cleared up this week, as titles. */
  resolved: string[];
  notes: WeeklyNote[];
  reportUrl: string;
  unsubscribeUrl: string;
}

function list(names: readonly string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

function sessionsLine(sessions: number, minutes: number): string {
  const s = `${sessions} ${sessions === 1 ? 'session' : 'sessions'}`;
  return `${s}, ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} with the ${PRODUCT.aiLabel}.`;
}

function dayLabel(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: 'UTC',
      });
}

export function weeklyReportEmail(input: WeeklyReportInput): EmailDocument {
  const title = `${input.learnerName}, week of ${input.weekLabel}`;
  const moved = input.lead.moved.map((skill) => skill.name);
  const movedLine =
    moved.length > 0
      ? `Confirmed this week: ${list(moved)}. ${REPORT_MASTERY_NOTE}`
      : input.lead.confirmed > 0
        ? `Nothing new was confirmed this week. ${REPORT_MASTERY_NOTE}`
        : REPORT_MASTERY_NOTE;
  const resolvedLine =
    input.resolved.length > 0 ? `Cleared up this week: ${list(input.resolved)}.` : null;
  const activity = sessionsLine(input.sessions, input.minutes);

  const notesHtml =
    input.notes.length > 0
      ? `<h2 style="margin:24px 0 8px;font-size:16px;font-weight:600">What the tutor noted</h2>` +
        emailParagraph(GENERATED_LABEL, 'muted') +
        input.notes
          .map((note) => {
            const when = dayLabel(note.date);
            const rating =
              note.thumbs === 'up'
                ? ' They rated the session up.'
                : note.thumbs === 'down'
                  ? ' They rated the session down.'
                  : '';
            return (
              `<p style="margin:0 0 16px;padding-left:12px;border-left:3px solid ${EMAIL_PALETTE.border}">` +
              `<span style="color:${EMAIL_PALETTE.muted}">${escapeHtml(when)}</span><br>` +
              `${escapeHtml(note.note)}${escapeHtml(rating)}</p>`
            );
          })
          .join('')
      : '';

  const notesText =
    input.notes.length > 0
      ? `\n\nWhat the tutor noted\n${GENERATED_LABEL}\n` +
        input.notes
          .map((note) => {
            const rating =
              note.thumbs === 'up'
                ? ' They rated the session up.'
                : note.thumbs === 'down'
                  ? ' They rated the session down.'
                  : '';
            return `\n${dayLabel(note.date)}\n${note.note}${rating}`;
          })
          .join('\n')
      : '';

  return {
    subject: `${input.learnerName} — week of ${input.weekLabel}`,
    html: emailLayout({
      title,
      bodyHtml:
        `<p style="margin:0 0 16px;font-size:18px;font-weight:600">${escapeHtml(input.lead.headline)}</p>` +
        emailParagraph(movedLine) +
        emailParagraph(activity) +
        (resolvedLine ? emailParagraph(resolvedLine) : '') +
        notesHtml +
        `<p style="margin:24px 0 20px">${emailButton(input.reportUrl, 'Open the report')}</p>` +
        emailParagraph(
          'You get this once a week, only for a week in which something happened. Stop it any time with the link below; password resets and safety notices still arrive.',
          'muted',
        ),
      unsubscribeUrl: input.unsubscribeUrl,
    }),
    text:
      `${input.lead.headline}\n\n${movedLine}\n\n${activity}` +
      (resolvedLine ? `\n\n${resolvedLine}` : '') +
      notesText +
      `\n\nThe full report: ${input.reportUrl}\n\n` +
      `You get this once a week, only for a week in which something happened. Stop it any time: ${input.unsubscribeUrl}\n` +
      `Password resets and safety notices still arrive.\n\n${PRODUCT.workingName}, an ${PRODUCT.aiLabel}.`,
  };
}
