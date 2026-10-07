import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';

import '@/components/tutor/brand/tokens.css';

import { isTutorMode } from '@/kaizen.config';
import { surfaceFor } from '@/lib/tutor/client/bands';

import { AnalyticsSlot } from '@/components/tutor/shell/analytics-slot';
import { OfflineBanner } from '@/components/tutor/shell/offline-banner';
import { loadShellState } from '@/components/tutor/shell/shell-state';

/**
 * Root of every learner-facing route: the landing, auth, and legal pages
 * (public) and /learn and /session (signed in). TUTOR_MODE gates it a second
 * time after middleware.ts. Identity is resolved once per request here and
 * reused by nested layouts and pages through the cached loader; a missing
 * database only matters on the signed-in routes, which render the
 * "not configured" state themselves.
 */
export default async function LearnerGroupLayout({ children }: { children: ReactNode }) {
  if (!isTutorMode()) notFound();
  const state = await loadShellState();
  const surface =
    state.status === 'signed_in' ? surfaceFor(state.principal.role, state.principal.band) : 'teen';
  return (
    <div className="nt-app" data-surface={surface}>
      <OfflineBanner />
      {children}
      <AnalyticsSlot />
    </div>
  );
}
