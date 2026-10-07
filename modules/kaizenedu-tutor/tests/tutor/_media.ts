/**
 * Setup shared by the three media-route suites (tts, asr, attention): a signed
 * in adult learner with a session row of their own, plus a second account with
 * its own session so "foreign session" can be tested for real rather than with
 * an invented id. Underscore-prefixed so vitest never collects it.
 */
import { POST as selectLearnerRoute } from '@/app/(learner)/api/tutor/auth/learner/route';
import { AUTH_API } from '@/lib/tutor/contracts';
import type { TutorDb } from '@/lib/tutor/db';
import { setAppSetting } from '@/lib/tutor/settings';
import type { SelectLearnerResponse } from '@/lib/tutor/wire';

import { addLearner, birthYearForAge, call, signUpAdult, signUpParent } from './_api';

export interface Actor {
  cookie: string;
  accountId: string;
  learnerId: string;
  sessionId: string;
}

let counter = 0;

async function insertSession(
  db: TutorDb,
  accountId: string,
  learnerId: string,
  over: { endedAt?: string | null } = {},
): Promise<string> {
  counter += 1;
  const id = `ses_test_${counter}`;
  await db.query(
    `INSERT INTO sessions (id, account_id, learner_id, mode, phase, ended_at)
     VALUES ($1, $2, $3, 'voice', 'work', $4)`,
    [id, accountId, learnerId, over.endedAt ?? null],
  );
  return id;
}

/** An adult account: sign-up leaves its own `self` profile selected. */
export async function adultActor(db: TutorDb, email: string): Promise<Actor> {
  const { cookie, state } = await signUpAdult(email);
  const learnerId = state.principal.learnerId ?? state.learners[0]?.id;
  if (!learnerId) throw new Error('adult sign-up produced no learner profile');
  const accountId = state.account.id;
  return { cookie, accountId, learnerId, sessionId: await insertSession(db, accountId, learnerId) };
}

/** A parent account with one teen profile, selected. Used for cross-account checks. */
export async function parentActor(db: TutorDb, email: string): Promise<Actor> {
  await setAppSetting(db, 'under13_gate', true);
  const { cookie, state } = await signUpParent(email);
  const created = await addLearner(cookie, {
    displayName: 'Robin',
    birthYear: birthYearForAge(15),
    loginName: `robin${counter}`,
    password: 'correct horse battery staple',
  });
  const selected = await call<SelectLearnerResponse>(selectLearnerRoute, AUTH_API.selectLearner, {
    cookie,
    body: { learnerId: created.learner.id },
  });
  if (selected.status !== 200) {
    throw new Error(`select learner failed: ${selected.status} ${selected.body.error}`);
  }
  const accountId = state.account.id;
  return {
    cookie,
    accountId,
    learnerId: created.learner.id,
    sessionId: await insertSession(db, accountId, created.learner.id),
  };
}

export async function endedSession(db: TutorDb, actor: Actor): Promise<string> {
  return insertSession(db, actor.accountId, actor.learnerId, {
    endedAt: new Date().toISOString(),
  });
}

export async function usageRows(
  db: TutorDb,
  sessionId: string,
): Promise<Array<{ kind: string; provider: string | null; quantity: number; unit: string }>> {
  const { rows } = await db.query<{
    kind: string;
    provider: string | null;
    quantity: number | string;
    unit: string;
  }>(`SELECT kind, provider, quantity, unit FROM usage_ledger WHERE session_id = $1 ORDER BY ts`, [
    sessionId,
  ]);
  return rows.map((row) => ({
    kind: row.kind,
    provider: row.provider,
    quantity: Number(row.quantity),
    unit: row.unit,
  }));
}
