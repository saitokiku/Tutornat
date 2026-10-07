import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { PRODUCT } from '@/kaizen.config';
import { getEntitlement } from '@/lib/tutor/billing';
import {
  entitlementMessage,
  greetingFor,
  guestGreeting,
  startBlockedReason,
} from '@/lib/tutor/client';
import type { Entitlement, TutorSession } from '@/lib/tutor/contracts';
import { PRODUCT_ROUTES } from '@/lib/tutor/contracts';
import { DbNotConfiguredError, getTutorDb } from '@/lib/tutor/db';
import { isPreviewMode, previewEntitlement, previewSessions } from '@/lib/tutor/preview';
import { listLearnerSessions } from '@/lib/tutor/report';

import {
  FrozenProfileState,
  LockedProfileState,
  NoLearnerState,
} from '@/components/tutor/learn/blocked-states';
import { EntitlementBanner } from '@/components/tutor/learn/entitlement-banner';
import { GuestLevelLine } from '@/components/tutor/learn/guest-level';
import { LearnerWorkspace } from '@/components/tutor/learn/workspace';
import { PreviewBanner } from '@/components/tutor/preview/banner';
import { loadShellState } from '@/components/tutor/shell/shell-state';
import { NotConfiguredState } from '@/components/tutor/shell/states';

export const metadata: Metadata = {
  title: `Learn: ${PRODUCT.workingName}`,
  description:
    'Say what you want to work on and start. The planner, the problems you brought, recent sessions, and what the checks show.',
};

/** Sessions shown on the dashboard; the parent transcript reader has the rest. */
const RECENT_SESSION_LIMIT = 3;

interface LearnData {
  entitlement: Entitlement;
  sessions: TutorSession[];
}

/**
 * The account-scoped reads this page needs and no route answers: the
 * entitlement (spec R7) and the learner's last few sessions. Both are keyed
 * by the server-derived account id, never by anything from the request body
 * (invariant a).
 */
async function loadLearnData(
  accountId: string,
  learnerId: string | null,
): Promise<LearnData | null> {
  // Preview mode (no DATABASE_URL): the shell already signed us in as the
  // sample learner, so the dashboard renders the fixture rather than a
  // "not configured" panel that hides the whole product. The banner above
  // says the data is sample data; every write still refuses.
  if (isPreviewMode()) {
    return { entitlement: previewEntitlement, sessions: learnerId ? previewSessions : [] };
  }
  try {
    const db = await getTutorDb();
    const [entitlement, sessions] = await Promise.all([
      getEntitlement(db, accountId),
      learnerId
        ? listLearnerSessions(db, accountId, learnerId, RECENT_SESSION_LIMIT)
        : Promise.resolve([]),
    ]);
    return { entitlement, sessions };
  } catch (error) {
    if (error instanceof DbNotConfiguredError) return null;
    throw error;
  }
}

export default async function LearnPage() {
  const state = await loadShellState();
  // No cookie means the landing page, whose start form is the way in (D35).
  if (state.status === 'anonymous') redirect(PRODUCT_ROUTES.landing);
  if (state.status === 'not_configured') return <NotConfiguredState area="database" />;

  const { principal, session } = state;
  const learner = session.learner;
  const data = await loadLearnData(principal.accountId, learner?.id ?? null);
  if (!data) return <NotConfiguredState area="database" />;

  const guest = session.account.guest;
  const band = learner?.band ?? principal.band;
  // A guest's learner row says `You`, which is not a name to greet by; the
  // greeting is by visit instead (D35).
  const greeting = guest
    ? guestGreeting(data.sessions.length > 0)
    : greetingFor(learner?.displayName ?? session.account.displayName, band);
  const blocked = startBlockedReason(learner, data.entitlement);
  const canWork = learner !== null && learner.status === 'active';
  // Minutes running out changes what the learner can do next, so that banner
  // goes above the start card. When there is nothing to act on it sits at the
  // bottom rather than competing with the one primary action.
  const minutes = entitlementMessage(data.entitlement, principal.role);
  const minutesFirst = minutes.tone !== 'neutral';
  const minutesBanner = <EntitlementBanner entitlement={data.entitlement} role={principal.role} />;

  return (
    <>
      <PreviewBanner />
      <header className="flex flex-col gap-2">
        <h1 className="nt-h1">{greeting.title}</h1>
        {guest ? <p className="nt-lead">{greeting.subtitle}</p> : null}
        {guest && learner ? <GuestLevelLine learner={learner} /> : null}
        {principal.role === 'parent' && learner ? (
          <p className="nt-small">
            This is {learner.displayName}&rsquo;s dashboard. Switch profiles in the header.
          </p>
        ) : null}
      </header>

      {learner === null ? <NoLearnerState role={principal.role} /> : null}
      {learner?.status === 'locked' ? (
        <LockedProfileState learner={learner} role={principal.role} />
      ) : null}
      {learner?.status === 'frozen' ? (
        <FrozenProfileState learner={learner} role={principal.role} />
      ) : null}

      {canWork ? (
        <>
          {minutesFirst ? minutesBanner : null}
          <LearnerWorkspace
            band={band}
            remainingMinutes={data.entitlement.remainingMinutes}
            blockedReason={blocked}
            sessions={data.sessions}
          />
          {minutesFirst ? null : minutesBanner}
        </>
      ) : null}
    </>
  );
}
