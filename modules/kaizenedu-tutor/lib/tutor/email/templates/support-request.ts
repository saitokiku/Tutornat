/**
 * The mail to SUPPORT_EMAIL for one support request. This is the inbox, so it
 * carries the message and the reply address in full: it is the one message in
 * the product meant to reach a person verbatim. Every value came from the form
 * and goes through escapeHtml.
 */
import { PRODUCT } from '@/kaizen.config';

import {
  EMAIL_PALETTE,
  emailLayout,
  emailParagraph,
  escapeHtml,
  type EmailDocument,
} from '../html';

export interface SupportRequestMailInput {
  reference: string;
  fromEmail: string;
  message: string;
  page: string | null;
  accountId: string | null;
  learnerId: string | null;
  userAgent: string | null;
  at: Date;
}

export function supportRequestEmail(input: SupportRequestMailInput): EmailDocument {
  const meta = [
    ['Reference', input.reference],
    ['Reply to', input.fromEmail],
    ['Page', input.page ?? 'not given'],
    ['Account', input.accountId ?? 'not signed in'],
    ['Learner', input.learnerId ?? 'none'],
    ['Browser', input.userAgent ?? 'unknown'],
    ['At', input.at.toISOString()],
  ] as const;
  const cells = meta
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 16px 4px 0;color:${EMAIL_PALETTE.muted}">${escapeHtml(label)}</td>` +
        `<td style="padding:4px 0">${escapeHtml(value)}</td></tr>`,
    )
    .join('');
  const reply = 'Reply to the address above. The sender hears nothing until someone does.';
  return {
    subject: `[${PRODUCT.workingName} support] ${input.reference}`,
    html: emailLayout({
      title: 'Support request',
      bodyHtml:
        `<table role="presentation" style="border-collapse:collapse;margin:0 0 20px">${cells}</table>` +
        `<pre style="white-space:pre-wrap;font-family:inherit;font-size:16px;line-height:1.5;margin:0 0 20px;padding:12px 16px;border:1px solid ${EMAIL_PALETTE.border};border-radius:8px">${escapeHtml(input.message)}</pre>` +
        emailParagraph(reply, 'muted'),
    }),
    text: `${meta.map(([label, value]) => `${label}: ${value}`).join('\n')}\n\n${input.message}\n\n${reply}`,
  };
}
