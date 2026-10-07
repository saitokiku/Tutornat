/**
 * The `SessionStateResponse` every auth route answers: the account, the
 * principal summary, the profiles the caller may see, and the selected one.
 * A learner-role session (a teen's own sign-in) sees only its own profile:
 * a learner never sees another learner (docs/STRATEGY-INTEGRATION.md).
 */
import type { Principal } from '@/lib/tutor/contracts';
import type { Queryable } from '@/lib/tutor/db';
import type { PrincipalSummary, SessionStateResponse } from '@/lib/tutor/wire';

import { getAccount } from './accounts';
import { getLearner, listLearners } from './learners';

export function principalSummary(principal: Principal): PrincipalSummary {
  return { learnerId: principal.learnerId, role: principal.role, band: principal.band };
}

/** Null when the account row is gone (a live cookie after deletion): the route answers 401. */
export async function buildSessionState(
  db: Queryable,
  principal: Principal,
): Promise<SessionStateResponse | null> {
  const account = await getAccount(db, principal.accountId);
  if (!account) return null;
  const learner = principal.learnerId
    ? await getLearner(db, principal.accountId, principal.learnerId)
    : null;
  const learners =
    principal.role === 'learner'
      ? learner
        ? [learner]
        : []
      : await listLearners(db, principal.accountId);
  return {
    account: {
      id: account.id,
      email: account.email,
      displayName: account.displayName,
      guest: account.guest,
    },
    principal: principalSummary(principal),
    learners,
    learner,
  };
}
