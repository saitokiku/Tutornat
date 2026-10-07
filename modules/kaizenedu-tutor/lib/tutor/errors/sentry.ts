/**
 * Minimal Sentry transport over fetch (no SDK installed; package.json is
 * frozen). Builds an envelope with one `event` item and posts it to the
 * DSN's envelope endpoint. No breadcrumbs, no request bodies, no replay: the
 * event carries a scrubbed message, ids as tags, and a scrubbed stack.
 */
export const SENTRY_CLIENT = 'natural-tutor-envelope/1.0.0';
export const SENTRY_TIMEOUT_MS = 3_000;

export interface SentryDsnParts {
  protocol: string;
  host: string;
  /** Path prefix before /api, usually empty. */
  path: string;
  projectId: string;
  publicKey: string;
}

export function parseSentryDsn(dsn: string): SentryDsnParts | null {
  let url: URL;
  try {
    url = new URL(dsn.trim());
  } catch {
    return null;
  }
  const publicKey = url.username;
  const segments = url.pathname.split('/').filter(Boolean);
  const projectId = segments.pop();
  if (!publicKey || !projectId || !/^\d+$/.test(projectId)) return null;
  return {
    protocol: url.protocol,
    host: url.host,
    path: segments.length ? `/${segments.join('/')}` : '',
    projectId,
    publicKey,
  };
}

export function sentryEnvelopeUrl(parts: SentryDsnParts): string {
  return `${parts.protocol}//${parts.host}${parts.path}/api/${parts.projectId}/envelope/`;
}

export function sentryAuthHeader(parts: SentryDsnParts, sentAt: Date): string {
  const timestamp = Math.floor(sentAt.getTime() / 1000);
  return `Sentry sentry_version=7, sentry_client=${SENTRY_CLIENT}, sentry_timestamp=${timestamp}, sentry_key=${parts.publicKey}`;
}

export interface SentryEventInput {
  /** 32 lowercase hex characters. */
  eventId: string;
  timestamp: Date;
  level: 'error' | 'warning' | 'info';
  message: string;
  errorType?: string;
  tags?: Record<string, string>;
  contexts?: Record<string, Record<string, string | number | boolean>>;
  user?: { id: string };
  environment?: string;
  release?: string;
  extra?: Record<string, string | number | boolean>;
}

export function buildSentryEvent(input: SentryEventInput): Record<string, unknown> {
  return {
    event_id: input.eventId,
    timestamp: input.timestamp.toISOString(),
    platform: 'node',
    level: input.level,
    logger: 'natural-tutor',
    message: { formatted: input.message },
    ...(input.errorType
      ? { exception: { values: [{ type: input.errorType, value: input.message }] } }
      : {}),
    ...(input.tags && Object.keys(input.tags).length ? { tags: input.tags } : {}),
    ...(input.contexts ? { contexts: input.contexts } : {}),
    ...(input.user ? { user: input.user } : {}),
    ...(input.environment ? { environment: input.environment } : {}),
    ...(input.release ? { release: input.release } : {}),
    ...(input.extra ? { extra: input.extra } : {}),
    sdk: { name: 'natural-tutor.envelope', version: '1.0.0' },
  };
}

/** `header\nitem-header\nitem\n`, the Sentry envelope wire format. */
export function buildSentryEnvelope(dsn: string, input: SentryEventInput): string {
  const item = JSON.stringify(buildSentryEvent(input));
  const header = JSON.stringify({
    event_id: input.eventId,
    sent_at: input.timestamp.toISOString(),
    dsn,
  });
  const itemHeader = JSON.stringify({
    type: 'event',
    content_type: 'application/json',
    length: new TextEncoder().encode(item).byteLength,
  });
  return `${header}\n${itemHeader}\n${item}\n`;
}

export async function sendSentryEnvelope(
  dsn: string,
  envelope: string,
  sentAt: Date,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  const parts = parseSentryDsn(dsn);
  if (!parts) return false;
  const response = await fetchImpl(sentryEnvelopeUrl(parts), {
    method: 'POST',
    headers: {
      'content-type': 'application/x-sentry-envelope',
      'x-sentry-auth': sentryAuthHeader(parts, sentAt),
    },
    body: envelope,
    signal: AbortSignal.timeout(SENTRY_TIMEOUT_MS),
  });
  return response.ok;
}
