/**
 * The message a parent gets when their 13-to-17-year-old starts sign-up. It
 * says what the product is, that nothing exists until the parent finishes,
 * that the parent owns the account, and what to do if it was unexpected:
 * nothing. It carries the teen's first name and chosen login name and no
 * other data about them.
 */
import { PRODUCT } from '@/kaizen.config';

import { emailButton, emailLayout, emailParagraph, type EmailDocument } from '../html';

export const PARENT_INVITATION_TTL_DAYS = 7;

export function parentInvitationEmail(input: {
  teenName: string;
  loginName: string;
  inviteUrl: string;
  /** The address already has an account: the button attaches the profile after sign-in. */
  existingAccount: boolean;
}): EmailDocument {
  const started = `${input.teenName} started signing up for ${PRODUCT.workingName}, an ${PRODUCT.aiLabel} for maths, and gave this address as their parent's.`;
  const owns = input.existingAccount
    ? `Nothing has been added yet. When you open the link and sign in, their profile joins your account, and you see what they work on and how it is going.`
    : `Nothing exists yet. The account is created when you finish setting it up, and it is yours: you see what they work on and how it is going.`;
  const login = `They sign in on their own with the login name they chose, ${input.loginName}, and never with an email address.`;
  const expiry = `The link works once and expires in ${PARENT_INVITATION_TTL_DAYS} days.`;
  const unexpected =
    'If you did not expect this, do nothing: nothing is created and the link expires on its own.';
  const label = input.existingAccount ? 'Add the profile to my account' : 'Finish setting up';
  return {
    subject: `${input.teenName} asked you to finish setting up their ${PRODUCT.workingName} account`,
    html: emailLayout({
      title: 'Finish setting up the account',
      bodyHtml:
        emailParagraph(started) +
        emailParagraph(owns) +
        emailParagraph(login) +
        `<p style="margin:0 0 20px">${emailButton(input.inviteUrl, label)}</p>` +
        emailParagraph(expiry) +
        emailParagraph(unexpected, 'muted') +
        emailParagraph(
          `If the button does not work, copy this address into the browser: ${input.inviteUrl}`,
          'muted',
        ),
    }),
    text:
      `${started}\n\n${owns}\n\n${login}\n\n${input.inviteUrl}\n\n${expiry}\n\n${unexpected}\n\n` +
      `${PRODUCT.workingName}, an ${PRODUCT.aiLabel}. Sent because this address was given as a parent's.`,
  };
}
