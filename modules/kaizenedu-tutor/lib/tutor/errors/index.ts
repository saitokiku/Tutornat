/**
 * `reportError(error, context)`: the one place product code reports an
 * unexpected failure (spec R14 "Sentry server and client"; data-29). It logs
 * ids and a scrubbed message through the repo logger and, when SENTRY_DSN is
 * set, posts a Sentry envelope. Never throws; a failed report is a warning.
 */
import { randomUUID } from 'node:crypto';

import { createLogger } from '@/lib/logger';

import { scrubErrorText, MAX_STACK_LENGTH } from './scrub';
import { buildSentryEnvelope, sendSentryEnvelope } from './sentry';

const log = createLogger('tutor-errors');

export interface ErrorContext {
  accountId?: string | null;
  learnerId?: string | null;
  sessionId?: string | null;
  turnId?: string | null;
  /** URL path of the route or screen, never a query string with content. */
  route?: string;
  /** Short machine code, e.g. `stripe_webhook_failed`. */
  code?: string;
  level?: 'error' | 'warning';
}

export interface ErrorReport {
  /** 32 hex chars; also the Sentry event id when sent. */
  eventId: string;
  /** The scrubbed message that was logged. */
  message: string;
  sent: boolean;
}

export interface ReportOptions {
  fetchImpl?: typeof fetch;
  env?: NodeJS.ProcessEnv;
  now?: () => Date;
}

function hasCode(error: unknown): error is { code: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { code?: unknown }).code === 'string'
  );
}

function describe(error: unknown): { type: string; message: string; stack: string | null } {
  if (error instanceof Error) {
    return { type: error.name || 'Error', message: error.message, stack: error.stack ?? null };
  }
  if (typeof error === 'string') return { type: 'Error', message: error, stack: null };
  return { type: typeof error, message: 'Non-error value thrown', stack: null };
}

function ids(context: ErrorContext): Record<string, string> {
  const out: Record<string, string> = {};
  if (context.accountId) out.accountId = context.accountId;
  if (context.learnerId) out.learnerId = context.learnerId;
  if (context.sessionId) out.sessionId = context.sessionId;
  if (context.turnId) out.turnId = context.turnId;
  return out;
}

export async function reportError(
  error: unknown,
  context: ErrorContext = {},
  options: ReportOptions = {},
): Promise<ErrorReport> {
  const env = options.env ?? process.env;
  const now = options.now?.() ?? new Date();
  const eventId = randomUUID().replace(/-/g, '');
  const described = describe(error);
  const message = scrubErrorText(described.message);
  const code = context.code ?? (hasCode(error) ? error.code : undefined);
  const level = context.level ?? 'error';
  const idTags = ids(context);
  const line = JSON.stringify({
    eventId,
    level,
    ...(code ? { code } : {}),
    ...(context.route ? { route: context.route } : {}),
    errorType: described.type,
    message,
    ...idTags,
  });
  if (level === 'warning') log.warn(line);
  else log.error(line);

  const dsn = env.SENTRY_DSN?.trim();
  if (!dsn) return { eventId, message, sent: false };

  const tags: Record<string, string> = { ...idTags };
  if (code) tags.code = code;
  if (context.route) tags.route = context.route;
  const envelope = buildSentryEnvelope(dsn, {
    eventId,
    timestamp: now,
    level,
    message,
    errorType: described.type,
    tags,
    contexts: { tutor: idTags },
    ...(context.accountId ? { user: { id: context.accountId } } : {}),
    environment: env.VERCEL_ENV ?? env.NODE_ENV ?? 'development',
    ...(env.VERCEL_GIT_COMMIT_SHA ? { release: env.VERCEL_GIT_COMMIT_SHA } : {}),
    ...(described.stack
      ? { extra: { stack: scrubErrorText(described.stack, MAX_STACK_LENGTH) } }
      : {}),
  });
  let sent = false;
  try {
    sent = await sendSentryEnvelope(dsn, envelope, now, options.fetchImpl);
  } catch (sendError) {
    log.warn(
      `sentry send failed for ${eventId}: ${sendError instanceof Error ? sendError.name : 'error'}`,
    );
  }
  return { eventId, message, sent };
}

export { scrubErrorText, MAX_ERROR_MESSAGE_LENGTH, MAX_STACK_LENGTH } from './scrub';
export {
  buildSentryEnvelope,
  buildSentryEvent,
  parseSentryDsn,
  sentryAuthHeader,
  sentryEnvelopeUrl,
} from './sentry';
export type { SentryDsnParts, SentryEventInput } from './sentry';
