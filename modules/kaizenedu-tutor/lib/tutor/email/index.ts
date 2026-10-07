export { EMAIL_FROM_ENV, EMAIL_KEY_ENV, emailConfig, emailConfigStatus } from './config';
export type { EmailConfig, EmailConfigStatus, EnvLike } from './config';
export {
  EMAIL_PALETTE,
  emailButton,
  emailLayout,
  emailParagraph,
  escapeHtml,
  tokenLink,
} from './html';
export type { EmailDocument, EmailLayoutInput } from './html';
export { RESEND_ENDPOINT, recipientDomain, SEND_TIMEOUT_MS, sendEmail } from './send';
export type { EmailKind, SendEmailInput, SendOptions, SendOutcome } from './send';
export { PARENT_INVITATION_TTL_DAYS, parentInvitationEmail } from './templates/parent-invitation';
export {
  PASSWORD_RESET_TTL_MINUTES,
  passwordResetEmail,
  passwordResetUrl,
} from './templates/password-reset';
export { safetyNoticeEmail, safetyPageEmail } from './templates/safety';
export type {
  SafetyNoticeInput,
  SafetyPageInput,
  SafetySeverity,
  SafetySource,
} from './templates/safety';
export { supportRequestEmail } from './templates/support-request';
export type { SupportRequestMailInput } from './templates/support-request';
export { weeklyReportEmail } from './templates/weekly-report';
export type { WeeklyNote, WeeklyReportInput } from './templates/weekly-report';
export {
  CRON_SECRET_ENV,
  OPT_OUT_PURPOSE,
  OPT_OUT_TTL_MS,
  optOutByToken,
  sendWeeklyEmails,
  WEEK_MS,
  weekLabel,
  WEEKLY_BATCH_LIMIT,
  WEEKLY_EMAIL_KIND,
  WEEKLY_SEND_WINDOW_MS,
  weeklyEmailStatus,
  weeklyPeriod,
} from './weekly';
export type { WeeklyEmailStatus, WeeklyOutcome, WeeklyRunOptions, WeeklyRunResult } from './weekly';
