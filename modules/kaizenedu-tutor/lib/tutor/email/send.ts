/**
 * The one way mail leaves the product. Resend over `fetch` (no SDK), a
 * fifteen-second timeout, and an honest answer in every case: sent,
 * suppressed, not configured, or failed with the status.
 *
 * Two kinds of mail (Kaizen-AI's `email.js`, kept because CAN-SPAM draws the
 * same line): `essential` is relationship and security mail — a password
 * reset, an invitation, a safety notice — and goes out regardless of any
 * opt-out; `promotional` is everything periodic and is dropped entirely once
 * the account holder has opted out. When a message carries an unsubscribe
 * URL it also carries the `List-Unsubscribe` headers, so a mail client can
 * offer the opt-out itself.
 *
 * Logging is by kind and recipient domain only. The address is often a
 * parent's and the body holds a live token, so neither is ever written to a
 * log stream.
 */
import { createLogger } from '@/lib/logger';

import { emailConfig, type EnvLike } from './config';

const log = createLogger('tutor:email');

export const RESEND_ENDPOINT = 'https://api.resend.com/emails';
export const SEND_TIMEOUT_MS = 15_000;

export type EmailKind = 'essential' | 'promotional';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  /** The plain-text alternative; every template provides one. */
  text: string;
  kind: EmailKind;
  /** The one-click opt-out for promotional mail to a known account. */
  unsubscribeUrl?: string | null;
  /** True when the recipient has opted out of promotional mail. Essential mail ignores it. */
  optedOut?: boolean;
  /** Where a reply goes when it is not the sender: the support inbox sets the visitor's address. */
  replyTo?: string;
}

export type SendOutcome =
  | { sent: true; id: string | null }
  | { sent: false; reason: 'not_configured' | 'suppressed' | 'failed'; status?: number };

export interface SendOptions {
  /** Injected by tests; the real one otherwise. */
  fetch?: typeof fetch;
  env?: EnvLike;
}

/** `@example.com` — the most a log line may say about a recipient. */
export function recipientDomain(to: string): string {
  const at = to.lastIndexOf('@');
  return at >= 0 ? `@${to.slice(at + 1)}` : '@?';
}

export async function sendEmail(
  input: SendEmailInput,
  options: SendOptions = {},
): Promise<SendOutcome> {
  const domain = recipientDomain(input.to);
  if (input.kind === 'promotional' && input.optedOut) {
    log.debug(`suppressed kind=${input.kind} to=${domain}`);
    return { sent: false, reason: 'suppressed' };
  }
  const config = emailConfig(options.env ?? process.env);
  if (!config.configured || !config.apiKey || !config.from) {
    // A designed deployment state, so this lands in a real log stream and
    // carries nothing that identifies a person or grants access.
    log.warn(
      `not configured (${config.missing.join(', ')} unset); not sent: kind=${input.kind} to=${domain}`,
    );
    return { sent: false, reason: 'not_configured' };
  }
  const headers: Record<string, string> = {};
  if (input.unsubscribeUrl) {
    headers['List-Unsubscribe'] = `<${input.unsubscribeUrl}>`;
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
  }
  const doFetch = options.fetch ?? fetch;
  try {
    const response = await doFetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      body: JSON.stringify({
        from: config.from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
        ...(Object.keys(headers).length > 0 ? { headers } : {}),
      }),
    });
    if (!response.ok) {
      log.error(`send failed (${response.status}) kind=${input.kind} to=${domain}`);
      return { sent: false, reason: 'failed', status: response.status };
    }
    let id: string | null = null;
    try {
      const body = (await response.json()) as { id?: unknown };
      id = typeof body.id === 'string' ? body.id : null;
    } catch {
      id = null;
    }
    log.info(`sent kind=${input.kind} to=${domain}`);
    return { sent: true, id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error(`send error kind=${input.kind} to=${domain}: ${message}`);
    return { sent: false, reason: 'failed' };
  }
}
