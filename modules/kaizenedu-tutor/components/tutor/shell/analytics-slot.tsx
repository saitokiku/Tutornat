/**
 * Integration point for product analytics (spec R14; Builder E owns
 * lib/tutor/analytics). The shell mounts this once per page tree; the
 * integrator replaces the body with the PostHog and Sentry client
 * initialisers. Rules that still apply there (CLAUDE.md): first-party only,
 * no session recordings, no autocapture, events carry ids and never names,
 * transcripts, or media.
 */
export function AnalyticsSlot() {
  return null;
}
