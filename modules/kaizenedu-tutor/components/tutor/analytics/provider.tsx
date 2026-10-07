'use client';

/**
 * Mounts browser analytics for a product surface. Initialises posthog-js only
 * when the public project token is set (a real "not configured" state
 * otherwise: nothing loads, nothing is sent), with recording, surveys,
 * autocapture, and external scripts off. Learners under 18 get in-memory
 * persistence; the distinct id is the account id and never a name or email.
 */
import { useEffect, type ReactNode } from 'react';

import type { AgeBand } from '@/kaizen.config';
import { identifyClient, initClientAnalytics } from '@/lib/tutor/analytics/client';

export interface AnalyticsProviderProps {
  /** Account id of the signed-in holder; null on public pages and after sign-out. */
  accountId?: string | null;
  /** Band of the active learner; null or unknown is treated as a minor. */
  band?: AgeBand | null;
  children?: ReactNode;
}

export function AnalyticsProvider({
  accountId = null,
  band = null,
  children,
}: AnalyticsProviderProps) {
  useEffect(() => {
    initClientAnalytics({
      token: process.env.NEXT_PUBLIC_POSTHOG_PROJECT,
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      band,
    });
  }, [band]);

  useEffect(() => {
    identifyClient(accountId);
  }, [accountId]);

  return <>{children}</>;
}
