/**
 * Browser PostHog configuration (spec §11.2 item 8; docs/TOOLING.md gotcha
 * 11). Pure so a test can assert it field by field without a DOM. Recording,
 * surveys, autocapture, heatmaps, dead clicks, exception capture, and the
 * external-script loader are all off; learners under 18 get in-memory
 * persistence (no cookie, no local storage), adults get the default store.
 */
import type { PostHogConfig } from 'posthog-js';

import type { AgeBand } from '@/kaizen.config';

export const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com';

export type ClientPersistence = PostHogConfig['persistence'];

/** Only a known adult band keeps a persistent identifier; unknown means minor. */
export function persistenceForBand(band: AgeBand | null | undefined): ClientPersistence {
  return band === 'adult' ? 'localStorage+cookie' : 'memory';
}

export interface ClientConfigInput {
  host?: string | null;
  band?: AgeBand | null;
}

export function buildClientConfig(input: ClientConfigInput = {}): Partial<PostHogConfig> {
  return {
    api_host: input.host?.trim() || DEFAULT_POSTHOG_HOST,
    persistence: persistenceForBand(input.band),
    disable_session_recording: true,
    disable_surveys: true,
    disable_external_dependency_loading: true,
    disable_web_experiments: true,
    autocapture: false,
    capture_pageview: true,
    capture_pageleave: false,
    capture_heatmaps: false,
    capture_dead_clicks: false,
    capture_exceptions: false,
    capture_performance: false,
    rageclick: false,
    person_profiles: 'identified_only',
    respect_dnt: true,
    ip: false,
    advanced_disable_flags: true,
  };
}
