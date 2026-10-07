/**
 * The two safety messages (docs/SAFETY-RUNBOOK.md). The page to staff carries
 * ids, the category and the source and not a word the learner said: the
 * transcript is one click away for whoever reviews it, and the message has to
 * be safe to sit in an inbox. The notice to the account holder says that the
 * session ended early over something their learner said, where the transcript
 * is, and the crisis lines, calmly and quoting nothing.
 */
import { PRODUCT } from '@/kaizen.config';

import {
  EMAIL_PALETTE,
  emailButton,
  emailLayout,
  emailParagraph,
  escapeHtml,
  type EmailDocument,
} from '../html';

export type SafetySeverity = 'critical' | 'high';
export type SafetySource = 'screen' | 'report';

export interface SafetyPageInput {
  flagId: string;
  accountId: string;
  learnerId: string | null;
  sessionId: string | null;
  /** `self_harm` or `abuse` from the screen; `report` from the button. */
  category: string;
  severity: SafetySeverity;
  source: SafetySource;
  at: Date;
}

const RESPONSE_TIME: Record<SafetySeverity, string> = {
  critical: 'A person acts within one hour during staffed hours.',
  high: 'A person acts the same day.',
};

function categoryLabel(category: string): string {
  switch (category) {
    case 'self_harm':
      return 'self-harm';
    case 'report':
      return 'a report from the button';
    default:
      return category.replace(/_/g, ' ');
  }
}

function idTable(rows: ReadonlyArray<readonly [string, string]>): string {
  const cells = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 16px 4px 0;color:${EMAIL_PALETTE.muted}">${escapeHtml(label)}</td>` +
        `<td style="padding:4px 0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">${escapeHtml(value)}</td></tr>`,
    )
    .join('');
  return `<table role="presentation" style="border-collapse:collapse;margin:0 0 20px">${cells}</table>`;
}

export function safetyPageEmail(input: SafetyPageInput): EmailDocument {
  const what =
    input.source === 'screen'
      ? `The safety screen matched ${categoryLabel(input.category)} in a learner's turn, answered with the crisis referral, and ended the session.`
      : 'Someone pressed the report button in a session and marked it unsafe.';
  const rows = [
    ['Flag', input.flagId],
    ['Account', input.accountId],
    ['Learner', input.learnerId ?? 'none'],
    ['Session', input.sessionId ?? 'none'],
    ['Category', input.category],
    ['Severity', input.severity],
    ['At', input.at.toISOString()],
  ] as const;
  const respond = `${RESPONSE_TIME[input.severity]} The runbook is docs/SAFETY-RUNBOOK.md.`;
  const idsOnly =
    "This message carries ids only. The turn that fired is in the account's transcript.";
  return {
    subject: `[${PRODUCT.workingName}] Safety event, ${input.severity}: ${categoryLabel(input.category)}`,
    html: emailLayout({
      title: `Safety event: ${input.severity}`,
      bodyHtml:
        emailParagraph(what) +
        idTable(rows) +
        emailParagraph(respond) +
        emailParagraph(idsOnly, 'muted'),
    }),
    text: `${what}\n\n${rows.map(([label, value]) => `${label}: ${value}`).join('\n')}\n\n${respond}\n\n${idsOnly}`,
  };
}

export interface SafetyNoticeInput {
  category: string;
  /** The dashboard link; null when the deployment has no public origin to build one from. */
  dashboardUrl: string | null;
  /** True when a person on our side was paged as well; the notice says so only then. */
  staffPaged: boolean;
}

const CRISIS_LINES: Record<string, string> = {
  self_harm:
    'If you are worried about their safety right now: in the United States, call or text 988 any time to reach the Suicide and Crisis Lifeline, or call 911 in an emergency.',
  abuse:
    'If you are worried about their safety right now: in the United States, the Childhelp hotline is 1-800-422-4453, any time. Call 911 in an emergency.',
};

export function safetyNoticeEmail(input: SafetyNoticeInput): EmailDocument {
  const ended = `Today a ${PRODUCT.workingName} session for a learner on your account ended early because of something they said. The ${PRODUCT.aiLabel} stopped the lesson, gave them the crisis lines below, and closed the session. It did not carry on teaching.`;
  const where =
    'The whole session, including what was said, is on your dashboard under their transcripts. Nothing they said is repeated in this email.';
  const lines =
    CRISIS_LINES[input.category] ??
    'If you are worried about their safety right now, call 911 in an emergency.';
  const staff = input.staffPaged
    ? 'A person on our side has been told as well and reviews every event like this one.'
    : null;
  const automatic =
    'This notice is automatic. It goes to the account holder every time the safety screen ends a session.';
  return {
    subject: `A ${PRODUCT.workingName} session ended early today`,
    html: emailLayout({
      title: 'A session ended early today',
      bodyHtml:
        emailParagraph(ended) +
        emailParagraph(where) +
        (input.dashboardUrl
          ? `<p style="margin:0 0 20px">${emailButton(input.dashboardUrl, 'Open the dashboard')}</p>`
          : '') +
        emailParagraph(lines) +
        (staff ? emailParagraph(staff) : '') +
        emailParagraph(automatic, 'muted'),
    }),
    text:
      `${ended}\n\n${where}\n\n${input.dashboardUrl ? `${input.dashboardUrl}\n\n` : ''}${lines}\n\n` +
      `${staff ? `${staff}\n\n` : ''}${automatic}\n\n${PRODUCT.workingName}, an ${PRODUCT.aiLabel}.`,
  };
}
