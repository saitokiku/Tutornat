/**
 * Fixtures for the turn-engine tests: a scripted model stream, an SSE frame
 * reader, and the account → learner → session setup every case needs.
 * Underscore-prefixed so vitest never collects it (tests/tutor/_db.ts pattern).
 */
import { POST as selectLearnerRoute } from '@/app/(learner)/api/tutor/auth/learner/route';
import { AUTH_API } from '@/lib/tutor/contracts';
import type { Principal, TurnEvent } from '@/lib/tutor/contracts';
import type { TutorDb } from '@/lib/tutor/db';
import type { SelectLearnerResponse, SignUpResponse } from '@/lib/tutor/wire';

import { addLearner, birthYearForAge, call, signUpParent } from './_api';

/** Turns a script of chunks into the shape `streamLLM` returns. */
export function scriptedStream(
  chunks: readonly string[],
  usage: { inputTokens: number; outputTokens: number } = { inputTokens: 300, outputTokens: 120 },
) {
  return {
    textStream: (async function* () {
      for (const chunk of chunks) yield chunk;
    })(),
    totalUsage: Promise.resolve(usage),
  };
}

/** A stream that throws part-way through, for the provider-failure path. */
export function failingStream(before: readonly string[]) {
  return {
    textStream: (async function* () {
      for (const chunk of before) yield chunk;
      throw new Error('provider exploded');
    })(),
    totalUsage: Promise.resolve({ inputTokens: 100, outputTokens: 10 }),
  };
}

/** Reads an SSE body into the TurnEvents it carried, in order. */
export async function readFrames(response: Response): Promise<TurnEvent[]> {
  const body = response.body;
  if (!body) throw new Error('the turn response had no body');
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const events: TurnEvent[] = [];
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    for (;;) {
      const index = buffer.indexOf('\n\n');
      if (index === -1) break;
      const frame = buffer.slice(0, index);
      buffer = buffer.slice(index + 2);
      if (frame.startsWith('data: ')) events.push(JSON.parse(frame.slice(6)) as TurnEvent);
    }
  }
  return events;
}

export async function drain(events: AsyncGenerator<TurnEvent>): Promise<TurnEvent[]> {
  const out: TurnEvent[] = [];
  for await (const event of events) out.push(event);
  return out;
}

export interface Learner {
  cookie: string;
  accountId: string;
  learnerId: string;
  principal: Principal;
}

/**
 * A parent account with one 14-year-old profile selected, plus enough mastery
 * evidence that session creation picks a skill instead of the diagnostic.
 */
export async function setUpLearner(
  db: TutorDb,
  email: string,
  options: { brandNew?: boolean } = {},
): Promise<Learner> {
  const { cookie, state } = await signUpParent(email);
  const created = await addLearner(cookie, {
    displayName: 'Sam',
    birthYear: birthYearForAge(14),
    loginName: email.replace(/[^a-z0-9]/g, '').slice(0, 20),
    password: 'correct horse battery staple',
  });
  const selected = await call<SelectLearnerResponse>(selectLearnerRoute, AUTH_API.selectLearner, {
    cookie,
    body: { learnerId: created.learner.id },
  });
  if (selected.status !== 200) throw new Error(`select learner failed: ${selected.body.error}`);
  const accountId = (state as SignUpResponse).account.id;
  const learnerId = created.learner.id;
  if (!options.brandNew) {
    await db.query(
      `INSERT INTO skill_mastery (account_id, learner_id, skill_id, estimate, n_items, n_sessions, status)
       VALUES ($1, $2, 'F7', 0.6, 3, 1, 'in_progress')`,
      [accountId, learnerId],
    );
  }
  const { rows } = await db.query<{ id: string }>(
    `SELECT id FROM account_sessions WHERE account_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [accountId],
  );
  return {
    cookie,
    accountId,
    learnerId,
    principal: {
      accountId,
      learnerId,
      role: 'parent',
      band: '13-17',
      authSessionId: rows[0]!.id,
      staff: false,
      guest: false,
    },
  };
}
