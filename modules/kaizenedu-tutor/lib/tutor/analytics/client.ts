/**
 * Browser tracker. Imported only by client components; server code imports
 * `@/lib/tutor/analytics` instead. Initialised by `AnalyticsProvider` when
 * NEXT_PUBLIC_POSTHOG_PROJECT is set; otherwise every call is a no-op.
 */
import posthog from 'posthog-js';

import type { AgeBand } from '@/kaizen.config';
import type { AnalyticsEvent } from '@/lib/tutor/contracts';

import { buildClientConfig, persistenceForBand } from './client-config';
import { type AnalyticsProps, isAnalyticsEvent } from './events';
import { scrubAnalyticsProps } from './scrub';

let initialised = false;

export interface ClientAnalyticsInit {
  /** The public project token (NEXT_PUBLIC_POSTHOG_PROJECT); undefined disables analytics. */
  token: string | undefined;
  host?: string;
  band?: AgeBand | null;
}

/** Idempotent; a later call only updates the persistence for the band. */
export function initClientAnalytics(input: ClientAnalyticsInit): boolean {
  if (typeof window === 'undefined' || !input.token) return false;
  if (initialised) {
    posthog.set_config({ persistence: persistenceForBand(input.band) });
    return true;
  }
  posthog.init(input.token, buildClientConfig({ host: input.host, band: input.band }));
  initialised = true;
  return true;
}

export function isClientAnalyticsReady(): boolean {
  return initialised;
}

/** Distinct id is the account id; null resets to an anonymous id (sign-out). */
export function identifyClient(accountId: string | null | undefined): void {
  if (!initialised) return;
  if (accountId) posthog.identify(accountId);
  else posthog.reset();
}

export function trackClient<E extends AnalyticsEvent>(
  event: E,
  props: Omit<AnalyticsProps<E>, 'accountId'> & { accountId?: string } = {} as Omit<
    AnalyticsProps<E>,
    'accountId'
  >,
): void {
  if (!initialised || !isAnalyticsEvent(event)) return;
  posthog.capture(event, scrubAnalyticsProps(props as Record<string, unknown>));
}
