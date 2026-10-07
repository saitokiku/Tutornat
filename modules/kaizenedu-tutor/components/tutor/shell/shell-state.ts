/**
 * Server-side identity for the product layouts and pages. One cached read per
 * request: the principal from the session cookie (lib/tutor/auth), then the
 * account and its learner profiles, filtered by the principal's account id
 * (invariant a). Client components receive the serializable
 * `SessionStateResponse` shape, the same one GET /api/tutor/auth/me answers.
 */
import { cache } from 'react';
import { headers } from 'next/headers';

import type { AgeBand } from '@/kaizen.config';
import { resolvePrincipal } from '@/lib/tutor/auth';
import {
  isPreviewMode,
  previewLearner,
  previewLearners,
  previewPrincipal,
} from '@/lib/tutor/preview';
import type { Learner, LearnerKind, LearnerStatus, Principal } from '@/lib/tutor/contracts';
import { DbNotConfiguredError, getTutorDb } from '@/lib/tutor/db';
import type { SessionStateResponse } from '@/lib/tutor/wire';

export type ShellState =
  | { status: 'not_configured' }
  | { status: 'anonymous' }
  | { status: 'signed_in'; principal: Principal; session: SessionStateResponse };

interface AccountRow extends Record<string, unknown> {
  id: string;
  email: string;
  display_name: string;
  guest: boolean;
}

interface LearnerRow extends Record<string, unknown> {
  id: string;
  account_id: string;
  display_name: string;
  birth_year: number;
  age_band: AgeBand;
  status: LearnerStatus;
  kind: LearnerKind;
  login_name: string | null;
  created_at: string | Date;
}

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function learnerFromRow(row: LearnerRow): Learner {
  return {
    id: row.id,
    accountId: row.account_id,
    displayName: row.display_name,
    birthYear: Number(row.birth_year),
    band: row.age_band,
    status: row.status,
    kind: row.kind,
    loginName: row.login_name,
    createdAt: toIso(row.created_at),
  };
}

export const loadShellState = cache(async (): Promise<ShellState> => {
  // Preview mode: with no database there is nobody to sign in as, so the
  // sample account stands in and every screen renders its fixture instead of
  // bouncing to sign-in. This cannot leak into a configured deployment: the
  // mode is derived from DATABASE_URL being absent (lib/tutor/preview), so the
  // moment one exists this branch is dead and real identity is required.
  if (isPreviewMode()) {
    return {
      status: 'signed_in',
      principal: previewPrincipal,
      session: {
        account: {
          id: previewPrincipal.accountId,
          email: 'sample@preview.invalid',
          displayName: 'Sample parent',
          guest: false,
        },
        principal: {
          learnerId: previewPrincipal.learnerId,
          role: previewPrincipal.role,
          band: previewPrincipal.band,
        },
        learners: previewLearners,
        learner: previewLearner,
      },
    };
  }
  try {
    const principal = await resolvePrincipal(await headers());
    if (!principal) return { status: 'anonymous' };
    const db = await getTutorDb();
    const accounts = await db.query<AccountRow>(
      `SELECT id, email, display_name, guest FROM accounts WHERE id = $1`,
      [principal.accountId],
    );
    const account = accounts.rows[0];
    if (!account) return { status: 'anonymous' };
    const learnerRows = await db.query<LearnerRow>(
      `SELECT id, account_id, display_name, birth_year, age_band, status, kind, login_name, created_at
       FROM learners WHERE account_id = $1 ORDER BY created_at ASC`,
      [principal.accountId],
    );
    const learners = learnerRows.rows.map(learnerFromRow);
    const learner = learners.find((entry) => entry.id === principal.learnerId) ?? null;
    return {
      status: 'signed_in',
      principal,
      session: {
        account: {
          id: account.id,
          email: account.email,
          displayName: account.display_name,
          guest: Boolean(account.guest),
        },
        principal: { learnerId: principal.learnerId, role: principal.role, band: principal.band },
        learners,
        learner,
      },
    };
  } catch (error) {
    if (error instanceof DbNotConfiguredError) return { status: 'not_configured' };
    throw error;
  }
});
