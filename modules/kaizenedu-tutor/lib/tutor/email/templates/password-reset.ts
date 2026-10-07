/**
 * The password reset message. One link, one hour, works once. It says what
 * happens if the reader did not ask for it — nothing — because a reset mail
 * arriving unbidden is alarming and the honest answer is calming.
 */
import { PRODUCT } from '@/kaizen.config';

import {
  emailButton,
  emailLayout,
  emailParagraph,
  escapeHtml,
  tokenLink,
  type EmailDocument,
} from '../html';

export const PASSWORD_RESET_TTL_MINUTES = 60;

export function passwordResetEmail(input: { resetUrl: string }): EmailDocument {
  const asked = 'Someone asked to reset the password for this address.';
  const ifYou = `If it was you, choose a new password within ${PASSWORD_RESET_TTL_MINUTES} minutes.`;
  const ifNot = 'If it was not you, nothing changes: the link works once and expires on its own.';
  return {
    subject: `Reset your ${PRODUCT.workingName} password`,
    html: emailLayout({
      title: 'Reset your password',
      bodyHtml:
        emailParagraph(`${asked} ${ifYou}`) +
        `<p style="margin:0 0 20px">${emailButton(input.resetUrl, 'Choose a new password')}</p>` +
        emailParagraph(ifNot) +
        emailParagraph(
          `If the button does not work, copy this address into the browser: ${input.resetUrl}`,
          'muted',
        ),
    }),
    text:
      `${asked} ${ifYou}\n\n${input.resetUrl}\n\n${ifNot}\n\n` +
      `${PRODUCT.workingName}, an ${PRODUCT.aiLabel}. Sent because this address has an account.`,
  };
}

/** The reset link the template expects; the same shape every token email uses. */
export const passwordResetUrl = tokenLink;

// Re-exported so a template test can check the escaping it relies on.
export { escapeHtml };
