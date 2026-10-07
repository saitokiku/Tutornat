/**
 * Server-side PostHog (spec R14; data-29). A no-op without POSTHOG_API_KEY.
 * The distinct id is the account id, never a name or email; properties go
 * through `scrubAnalyticsProps`; every call flushes before it resolves so a
 * serverless response cannot drop the event (docs/TOOLING.md gotcha 12).
 * Failures are logged with ids and never thrown into a request.
 */
import { PostHog } from 'posthog-node';

import { createLogger } from '@/lib/logger';
import type { AnalyticsEvent } from '@/lib/tutor/contracts';

import { type AnalyticsProps, isAnalyticsEvent } from './events';
import { scrubAnalyticsProps } from './scrub';

const log = createLogger('tutor-analytics');

export const ANALYTICS_REQUEST_TIMEOUT_MS = 3_000;

export interface AnalyticsConfig {
  apiKey: string | null;
  host: string | null;
}

export function analyticsConfig(env: NodeJS.ProcessEnv = process.env): AnalyticsConfig {
  const apiKey = env.POSTHOG_API_KEY?.trim() || null;
  const host = env.POSTHOG_HOST?.trim() || env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || null;
  return { apiKey, host };
}

export function isAnalyticsConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(analyticsConfig(env).apiKey);
}

const STATE_KEY = Symbol.for('natural-tutor.analytics');
interface AnalyticsState {
  client?: PostHog;
  key?: string;
}
const state = ((globalThis as Record<symbol, unknown>)[STATE_KEY] ??= {}) as AnalyticsState;

function client(): PostHog | null {
  const { apiKey, host } = analyticsConfig();
  if (!apiKey) return null;
  if (state.client && state.key === apiKey) return state.client;
  state.key = apiKey;
  state.client = new PostHog(apiKey, {
    ...(host ? { host } : {}),
    flushAt: 1,
    flushInterval: 0,
    requestTimeout: ANALYTICS_REQUEST_TIMEOUT_MS,
    fetchRetryCount: 0,
    disableGeoip: true,
  });
  return state.client;
}

/**
 * Records one product event. Resolves after the flush; callers on a hot path
 * may `void track(...)` and let it finish in the background of the same
 * invocation.
 */
export async function track<E extends AnalyticsEvent>(
  event: E,
  props: AnalyticsProps<E>,
): Promise<void> {
  if (!isAnalyticsEvent(event)) return;
  const posthog = client();
  if (!posthog) return;
  const { accountId, ...rest } = props;
  if (typeof accountId !== 'string' || !accountId) return;
  const properties = scrubAnalyticsProps(rest);
  try {
    posthog.capture({ distinctId: accountId, event, properties, disableGeoip: true });
    await posthog.flush();
  } catch (error) {
    log.warn(`track ${event} failed: ${error instanceof Error ? error.name : 'error'}`);
  }
}

/** Process exit hook; safe to call when analytics is not configured. */
export async function shutdownAnalytics(): Promise<void> {
  const current = state.client;
  state.client = undefined;
  state.key = undefined;
  if (!current) return;
  try {
    await current.shutdown(ANALYTICS_REQUEST_TIMEOUT_MS);
  } catch {
    // Nothing to do: the process is ending.
  }
}

export function resetAnalyticsForTests(): void {
  state.client = undefined;
  state.key = undefined;
}
