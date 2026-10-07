/**
 * Typed event map for the R14 vocabulary (`ANALYTICS_EVENTS` in contracts.ts).
 * Every property is an id, a number, a boolean, or a short enum; nothing here
 * can carry a transcript, a name, or an email, and `scrub.ts` drops any such
 * property at runtime anyway.
 */
import type { AgeBand } from '@/kaizen.config';
import { ANALYTICS_EVENTS, type AnalyticsEvent } from '@/lib/tutor/contracts';

export type AnalyticsValue = string | number | boolean | undefined;

/** Ids only. `accountId` is the distinct id; the rest are properties. */
export interface AnalyticsBaseProps {
  accountId: string;
  learnerId?: string;
  sessionId?: string;
  turnId?: string;
}

export interface AnalyticsEventProps {
  signup: { kind?: 'parent' | 'adult' };
  profile_created: { band?: AgeBand; kind?: 'self' | 'child' | 'teen'; locked?: boolean };
  consent_recorded: { method?: string; camera?: boolean };
  session_start: { mode?: 'voice' | 'text'; band?: AgeBand; skillId?: string };
  session_end: {
    minutes?: number;
    costCents?: number;
    phase?: string;
    checks?: number;
    checksCorrect?: number;
  };
  turn: {
    latencyMs?: number;
    costCents?: number;
    model?: string;
    stage?: string;
    inputMode?: 'voice' | 'text';
    audioMs?: number;
  };
  check_result: {
    skillId?: string;
    correct?: boolean;
    assisted?: boolean;
    score?: number;
    misconception?: string;
  };
  mastery_change: { skillId?: string; from?: string; to?: string; estimate?: number };
  report_viewed: { weekStart?: string };
  thumbs: { value: 'up' | 'down' };
  upgrade: {
    /** checkout | portal from the route; the mirrored status from the webhook. */
    action: string;
    source?: 'route' | 'webhook';
  };
  cap_hit: {
    kind: 'trial' | 'pool' | 'daily_cap' | 'session_ceiling' | 'rate_limit' | 'spend_stop';
    remainingMinutes?: number;
  };
  error: { code?: string; route?: string; status?: number; source?: 'server' | 'client' };
}

export type AnalyticsProps<E extends AnalyticsEvent> = AnalyticsBaseProps &
  AnalyticsEventProps[E] &
  Record<string, AnalyticsValue>;

export function isAnalyticsEvent(value: string): value is AnalyticsEvent {
  return (ANALYTICS_EVENTS as readonly string[]).includes(value);
}

export { ANALYTICS_EVENTS };
export type { AnalyticsEvent };
