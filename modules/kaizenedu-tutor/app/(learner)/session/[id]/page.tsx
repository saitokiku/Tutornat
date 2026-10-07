import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

import '@/components/tutor/session/session.css';

import { isTutorMode } from '@/kaizen.config';
import { resolvePrincipal } from '@/lib/tutor/auth';
import { DbNotConfiguredError, getTutorDb } from '@/lib/tutor/db';
import { listTurns, loadSession } from '@/lib/tutor/session';
import type { GetSessionResponse, ParentSettings } from '@/lib/tutor/wire';

import { SessionScreen } from '@/components/tutor/session/session-screen';
import { BareShell } from '@/components/tutor/shell/app-shell';
import { loadShellState } from '@/components/tutor/shell/shell-state';
import { NotConfiguredState } from '@/components/tutor/shell/states';

export const dynamic = 'force-dynamic';

const SESSION_ID = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * The live session route (spec §5.10 A).
 *
 * Everything the screen starts with is resolved here, on the server. The
 * session row is scoped by account *and* learner from the principal, and a
 * session belonging to another account or to a sibling profile answers 404
 * rather than 403 — the existence of the id is itself information (invariant
 * a). `loadSession` also hands back the session state, whose `board` is the
 * list of whiteboard actions applied so far; the client replays it through the
 * reducer so a reload puts the board back exactly as it was.
 */
async function readDisabledRecoverySteps(accountId: string): Promise<number[]> {
  try {
    const db = await getTutorDb();
    const { rows } = await db.query<{ settings: unknown }>(
      `SELECT settings FROM parent_settings WHERE account_id = $1`,
      [accountId],
    );
    const raw = rows[0]?.settings;
    if (!raw || typeof raw !== 'object') return [];
    const steps = (raw as Partial<ParentSettings>).recoveryStepsDisabled;
    if (!Array.isArray(steps)) return [];
    return steps.filter((step): step is number => Number.isInteger(step));
  } catch {
    // No settings row yet is the default: nothing switched off.
    return [];
  }
}

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  if (!isTutorMode()) notFound();
  const { id } = await params;
  if (!SESSION_ID.test(id)) notFound();

  try {
    const principal = await resolvePrincipal(await headers());
    if (!principal?.learnerId) notFound();

    const db = await getTutorDb();
    const record = await loadSession(db, principal, id);
    if (!record) notFound();

    const [turns, disabledRecoverySteps, shell] = await Promise.all([
      listTurns(db, id),
      readDisabledRecoverySteps(principal.accountId),
      loadShellState(),
    ]);
    const learner =
      shell.status === 'signed_in'
        ? (shell.session.learners.find((entry) => entry.id === principal.learnerId) ?? null)
        : null;
    // A guest learner's display name is the fixed `You` (D35); the wrap
    // screen also needs to know there is no plan and no account holder.
    const guest = shell.status === 'signed_in' && shell.session.account.guest;

    const data: GetSessionResponse = {
      session: record.session,
      turns,
      board: record.state.board,
    };

    return (
      <SessionScreen
        data={data}
        band={record.band}
        learnerName={learner?.displayName ?? 'You'}
        disabledRecoverySteps={disabledRecoverySteps}
        guest={guest}
      />
    );
  } catch (error) {
    if (error instanceof DbNotConfiguredError) {
      return (
        <BareShell>
          <NotConfiguredState area="database" />
        </BareShell>
      );
    }
    throw error;
  }
}
