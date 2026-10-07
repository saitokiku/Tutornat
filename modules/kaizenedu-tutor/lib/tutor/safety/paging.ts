/**
 * Paging on a safety event (reference §5; ported from Kaizen-AI's
 * `moderation.js` `screenAndRecord`, whose recording half this product already
 * had as the `flags` table). The row is the record; this is the part that tells
 * a person, because a flag nobody reads protects nobody.
 *
 * Three channels, each optional, each carrying ids and a category and never a
 * word the learner said (docs/SAFETY-RUNBOOK.md): the addresses in
 * SAFETY_ALERT_EMAILS get an essential email; ALERT_WEBHOOK_URL gets the same
 * as JSON (a Slack incoming webhook works); and on a critical event the account
 * holder gets a calm notice that the session ended early and where the
 * transcript is. Never throws: the flag row is already written when this runs,
 * and a paging failure is logged with ids and returned, not raised into the
 * turn that is answering the learner.
 */
import { createLogger } from '@/lib/logger';
import { PRODUCT_ROUTES } from '@/lib/tutor/contracts';
import type { Queryable } from '@/lib/tutor/db';
import {
  emailConfigStatus,
  safetyNoticeEmail,
  safetyPageEmail,
  sendEmail,
  type EnvLike,
  type SafetyPageInput,
  type SendOptions,
} from '@/lib/tutor/email';

const log = createLogger('tutor-safety-paging');

export const SAFETY_ALERT_EMAILS_ENV = 'SAFETY_ALERT_EMAILS';
export const ALERT_WEBHOOK_URL_ENV = 'ALERT_WEBHOOK_URL';
export const WEBHOOK_TIMEOUT_MS = 10_000;

export type SafetyEvent = SafetyPageInput;

export interface SafetyPagingStatus {
  /** True when at least one person is paged: staff addresses set and email configured. */
  configured: boolean;
  staffAddresses: number;
  webhook: boolean;
  /** Environment variable names still unset, in the order to fix them. */
  missing: string[];
}

export interface PagingOutcome {
  staff: { addresses: number; sent: number };
  webhook: 'sent' | 'failed' | 'unset';
  accountHolder: 'sent' | 'failed' | 'not_configured' | 'skipped';
}

export interface PagingOptions {
  env?: EnvLike;
  /** Injected by tests; the real one otherwise. */
  fetch?: typeof fetch;
  /** The public origin for the link in the account holder's notice; APP_URL when absent. */
  baseUrl?: string | null;
}

/** The comma-separated staff addresses, whitespace trimmed, anything without an @ dropped. */
export function staffAddresses(env: EnvLike = process.env): string[] {
  return (env[SAFETY_ALERT_EMAILS_ENV] ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.includes('@'));
}

export function safetyPagingStatus(env: EnvLike = process.env): SafetyPagingStatus {
  const email = emailConfigStatus(env);
  const addresses = staffAddresses(env);
  const missing = [...email.missing];
  if (addresses.length === 0) missing.push(SAFETY_ALERT_EMAILS_ENV);
  return {
    configured: missing.length === 0,
    staffAddresses: addresses.length,
    webhook: Boolean(env[ALERT_WEBHOOK_URL_ENV]?.trim()),
    missing,
  };
}

/** What the webhook receives. `text` is for a chat integration; the rest is for a machine. */
export function webhookPayload(event: SafetyEvent): Record<string, string | null> {
  return {
    text:
      `Safety event (${event.severity}): ${event.category} via ${event.source}. ` +
      `flag=${event.flagId} account=${event.accountId} learner=${event.learnerId ?? '-'} session=${event.sessionId ?? '-'}`,
    flagId: event.flagId,
    accountId: event.accountId,
    learnerId: event.learnerId,
    sessionId: event.sessionId,
    category: event.category,
    severity: event.severity,
    source: event.source,
    at: event.at.toISOString(),
  };
}

async function postWebhook(
  url: string,
  event: SafetyEvent,
  doFetch: typeof fetch,
): Promise<'sent' | 'failed'> {
  try {
    const response = await doFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
      body: JSON.stringify(webhookPayload(event)),
    });
    if (response.ok) return 'sent';
    log.error(`webhook failed (${response.status}) flag=${event.flagId}`);
    return 'failed';
  } catch (error) {
    log.error(
      `webhook error flag=${event.flagId}: ${error instanceof Error ? error.name : 'error'}`,
    );
    return 'failed';
  }
}

async function noticeAccountHolder(
  db: Queryable,
  event: SafetyEvent,
  staffPaged: boolean,
  baseUrl: string | null,
  send: SendOptions,
): Promise<PagingOutcome['accountHolder']> {
  try {
    const { rows } = await db.query<{ email: string; guest: boolean }>(
      `SELECT email, guest FROM accounts WHERE id = $1`,
      [event.accountId],
    );
    const to = rows[0]?.email;
    if (!to) return 'failed';
    // A guest account (D35) has a placeholder address with nobody behind it;
    // the crisis text the learner already heard is the notice.
    if (rows[0]?.guest) return 'skipped';
    const outcome = await sendEmail(
      {
        ...safetyNoticeEmail({
          category: event.category,
          dashboardUrl: baseUrl ? `${baseUrl}${PRODUCT_ROUTES.parent}` : null,
          staffPaged,
        }),
        to,
        kind: 'essential',
      },
      send,
    );
    if (outcome.sent) return 'sent';
    return outcome.reason === 'not_configured' ? 'not_configured' : 'failed';
  } catch (error) {
    log.error(
      `account holder notice failed flag=${event.flagId}: ${error instanceof Error ? error.name : 'error'}`,
    );
    return 'failed';
  }
}

/**
 * Pages everyone configured for `event`. Runs after the flag row is written
 * and never throws; the outcome says who was actually reached.
 */
export async function pageSafetyEvent(
  db: Queryable,
  event: SafetyEvent,
  options: PagingOptions = {},
): Promise<PagingOutcome> {
  const env = options.env ?? process.env;
  const doFetch = options.fetch ?? fetch;
  const send: SendOptions = { env, ...(options.fetch ? { fetch: options.fetch } : {}) };
  const baseUrl = (options.baseUrl ?? env.APP_URL ?? '').trim().replace(/\/+$/, '') || null;

  const addresses = staffAddresses(env);
  const page = safetyPageEmail(event);
  const webhookUrl = env[ALERT_WEBHOOK_URL_ENV]?.trim();
  const [staffOutcomes, webhook] = await Promise.all([
    Promise.all(addresses.map((to) => sendEmail({ ...page, to, kind: 'essential' }, send))),
    webhookUrl ? postWebhook(webhookUrl, event, doFetch) : Promise.resolve('unset' as const),
  ]);
  const sent = staffOutcomes.filter((outcome) => outcome.sent).length;

  const accountHolder =
    event.severity === 'critical'
      ? await noticeAccountHolder(db, event, sent > 0, baseUrl, send)
      : 'skipped';

  const outcome: PagingOutcome = {
    staff: { addresses: addresses.length, sent },
    webhook,
    accountHolder,
  };
  const line = `flag=${event.flagId} severity=${event.severity} staff=${sent}/${addresses.length} webhook=${webhook} holder=${accountHolder}`;
  if (addresses.length === 0 || sent < addresses.length) log.warn(`paged incompletely ${line}`);
  else log.info(`paged ${line}`);
  return outcome;
}
