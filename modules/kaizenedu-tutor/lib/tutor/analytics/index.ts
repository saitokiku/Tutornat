/**
 * Server entry point. Client components import `./client` (browser tracker)
 * and `components/tutor/analytics/provider.tsx` instead; this module pulls in
 * posthog-node and must stay out of client bundles.
 */
export { ANALYTICS_EVENTS, isAnalyticsEvent } from './events';
export type {
  AnalyticsBaseProps,
  AnalyticsEvent,
  AnalyticsEventProps,
  AnalyticsProps,
  AnalyticsValue,
} from './events';
export {
  COST_PER_TURN_SQL,
  DASHBOARD_QUERIES,
  LATENCY_PERCENTILES_SQL,
  MASTERY_CHANGES_SQL,
  runDashboardQueries,
} from './queries.sql';
export type { CostPerTurn, DashboardResults, LatencyDay, MasteryDay } from './queries.sql';
export { isForbiddenPropName, MAX_PROP_LENGTH, scrubAnalyticsProps } from './scrub';
export {
  analyticsConfig,
  isAnalyticsConfigured,
  resetAnalyticsForTests,
  shutdownAnalytics,
  track,
} from './server';
export type { AnalyticsConfig } from './server';
