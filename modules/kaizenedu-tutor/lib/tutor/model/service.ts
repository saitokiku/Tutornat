/**
 * The only writer of `skill_mastery` and `misconceptions` (tutor-11,
 * strategy §"the hole we do not repeat"). Reads rows, applies the pure rules
 * in student-model.ts, upserts, and writes the evidence the ledger needs.
 */
import type { MisconceptionState, SkillMastery } from '@/lib/tutor/contracts';
import type { Queryable } from '@/lib/tutor/db';

import { writeEvidence } from './evidence';
import { parseJsonb, toIso, toIsoRequired, toNumber } from './rows';
import {
  applyCheck,
  applyMisconceptionEvidence,
  type MasteryRow,
  type MisconceptionRow,
} from './student-model';

interface MasteryDbRow extends Record<string, unknown> {
  account_id: string;
  learner_id: string;
  skill_id: string;
  estimate: number | string;
  n_items: number | string;
  n_sessions: number | string;
  session_ids: string[] | string | null;
  status: SkillMastery['status'];
  starting_estimate: number | string | null;
  updated_at: string | Date;
  last_seen_at: string | Date | null;
  next_check_at: string | Date | null;
}

interface MisconceptionDbRow extends Record<string, unknown> {
  learner_id: string;
  tag: string;
  status: 'open' | 'resolved';
  first_seen_at: string | Date;
  resolved_at: string | Date | null;
  clean_streak: number | string;
}

function rowToMastery(row: MasteryDbRow): MasteryRow {
  return {
    learnerId: row.learner_id,
    skillId: row.skill_id,
    estimate: toNumber(row.estimate),
    nItems: toNumber(row.n_items),
    nSessions: toNumber(row.n_sessions),
    sessionIds: parseJsonb<string[]>(row.session_ids, []),
    status: row.status,
    startingEstimate: row.starting_estimate === null ? null : toNumber(row.starting_estimate),
    updatedAt: toIsoRequired(row.updated_at),
    lastSeenAt: toIso(row.last_seen_at),
    nextCheckAt: toIso(row.next_check_at),
  };
}

function rowToMisconception(row: MisconceptionDbRow): MisconceptionRow {
  return {
    learnerId: row.learner_id,
    tag: row.tag,
    status: row.status,
    firstSeenAt: toIsoRequired(row.first_seen_at),
    resolvedAt: toIso(row.resolved_at),
    cleanStreak: toNumber(row.clean_streak),
  };
}

export function toSkillMastery(row: MasteryRow): SkillMastery {
  return {
    learnerId: row.learnerId,
    skillId: row.skillId,
    estimate: row.estimate,
    nItems: row.nItems,
    nSessions: row.nSessions,
    status: row.status,
    updatedAt: row.updatedAt,
    lastSeenAt: row.lastSeenAt,
    nextCheckAt: row.nextCheckAt,
  };
}

export function toMisconceptionState(row: MisconceptionRow): MisconceptionState {
  return { ...row };
}

export async function listMasteryRows(
  db: Queryable,
  accountId: string,
  learnerId: string,
): Promise<MasteryRow[]> {
  const { rows } = await db.query<MasteryDbRow>(
    `SELECT * FROM skill_mastery WHERE account_id = $1 AND learner_id = $2 ORDER BY skill_id`,
    [accountId, learnerId],
  );
  return rows.map(rowToMastery);
}

export async function getMasteryRow(
  db: Queryable,
  accountId: string,
  learnerId: string,
  skillId: string,
): Promise<MasteryRow | null> {
  const { rows } = await db.query<MasteryDbRow>(
    `SELECT * FROM skill_mastery WHERE account_id = $1 AND learner_id = $2 AND skill_id = $3`,
    [accountId, learnerId, skillId],
  );
  return rows[0] ? rowToMastery(rows[0]) : null;
}

export async function listMisconceptionRows(
  db: Queryable,
  accountId: string,
  learnerId: string,
): Promise<MisconceptionRow[]> {
  const { rows } = await db.query<MisconceptionDbRow>(
    `SELECT * FROM misconceptions WHERE account_id = $1 AND learner_id = $2 ORDER BY first_seen_at`,
    [accountId, learnerId],
  );
  return rows.map(rowToMisconception);
}

async function upsertMastery(db: Queryable, accountId: string, row: MasteryRow): Promise<void> {
  await db.query(
    `INSERT INTO skill_mastery (account_id, learner_id, skill_id, estimate, n_items, n_sessions, session_ids, status, starting_estimate, updated_at, last_seen_at, next_check_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, $12)
     ON CONFLICT (learner_id, skill_id) DO UPDATE SET estimate = EXCLUDED.estimate, n_items = EXCLUDED.n_items,
       n_sessions = EXCLUDED.n_sessions, session_ids = EXCLUDED.session_ids, status = EXCLUDED.status,
       starting_estimate = EXCLUDED.starting_estimate, updated_at = EXCLUDED.updated_at,
       last_seen_at = EXCLUDED.last_seen_at, next_check_at = EXCLUDED.next_check_at`,
    [
      accountId,
      row.learnerId,
      row.skillId,
      row.estimate,
      row.nItems,
      row.nSessions,
      JSON.stringify(row.sessionIds),
      row.status,
      row.startingEstimate,
      row.updatedAt,
      row.lastSeenAt,
      row.nextCheckAt,
    ],
  );
}

async function upsertMisconception(
  db: Queryable,
  accountId: string,
  row: MisconceptionRow,
): Promise<void> {
  await db.query(
    `INSERT INTO misconceptions (account_id, learner_id, tag, status, first_seen_at, resolved_at, clean_streak)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (learner_id, tag) DO UPDATE SET status = EXCLUDED.status, resolved_at = EXCLUDED.resolved_at,
       clean_streak = EXCLUDED.clean_streak`,
    [
      accountId,
      row.learnerId,
      row.tag,
      row.status,
      row.firstSeenAt,
      row.resolvedAt,
      row.cleanStreak,
    ],
  );
}

export interface CheckOutcomeInput {
  accountId: string;
  learnerId: string;
  sessionId: string;
  skillId: string;
  correct: boolean;
  assisted: boolean;
  /** The distractor tag a wrong answer carried, or null. */
  hitTag: string | null;
  /** Tags the item was relevant to (skill tags plus its own distractor tags). */
  relevantTags: string[];
  now?: Date;
}

export interface CheckOutcome {
  mastery: SkillMastery;
  from: SkillMastery['status'];
  statusChanged: boolean;
  delayed: boolean;
  misconceptionsOpened: string[];
  misconceptionsResolved: string[];
}

/** Applies one graded check to the model and writes the mastery-change and misconception evidence. */
export async function recordCheckOutcome(
  db: Queryable,
  input: CheckOutcomeInput,
): Promise<CheckOutcome> {
  const now = input.now ?? new Date();
  const previous = await getMasteryRow(db, input.accountId, input.learnerId, input.skillId);
  const update = applyCheck(previous, input.learnerId, input.skillId, {
    correct: input.correct,
    sessionId: input.sessionId,
    assisted: input.assisted,
    now,
  });
  await upsertMastery(db, input.accountId, update.next);
  if (update.statusChanged) {
    await writeEvidence(db, {
      accountId: input.accountId,
      learnerId: input.learnerId,
      sessionId: input.sessionId,
      type: 'mastery_change',
      assisted: input.assisted,
      payload: {
        skillId: input.skillId,
        from: update.from,
        to: update.next.status,
        estimate: update.next.estimate,
        nItems: update.next.nItems,
        nSessions: update.next.nSessions,
        delayed: update.delayed,
        nextCheckAt: update.next.nextCheckAt,
      },
    });
  }

  const existing = await listMisconceptionRows(db, input.accountId, input.learnerId);
  const misconceptions = applyMisconceptionEvidence(existing, input.learnerId, {
    hitTag: input.correct ? null : input.hitTag,
    relevantTags: input.relevantTags,
    now,
  });
  for (const row of misconceptions.rows) {
    const before = existing.find((candidate) => candidate.tag === row.tag);
    if (
      !before ||
      before.status !== row.status ||
      before.cleanStreak !== row.cleanStreak ||
      before.resolvedAt !== row.resolvedAt
    ) {
      await upsertMisconception(db, input.accountId, row);
    }
  }
  for (const tag of misconceptions.opened) {
    await writeEvidence(db, {
      accountId: input.accountId,
      learnerId: input.learnerId,
      sessionId: input.sessionId,
      type: 'observation',
      assisted: input.assisted,
      payload: { kind: 'misconception_opened', tag, skillId: input.skillId },
    });
  }
  for (const tag of misconceptions.resolved) {
    await writeEvidence(db, {
      accountId: input.accountId,
      learnerId: input.learnerId,
      sessionId: input.sessionId,
      type: 'observation',
      assisted: input.assisted,
      payload: { kind: 'misconception_resolved', tag, skillId: input.skillId },
    });
  }

  return {
    mastery: toSkillMastery(update.next),
    from: update.from,
    statusChanged: update.statusChanged,
    delayed: update.delayed,
    misconceptionsOpened: misconceptions.opened,
    misconceptionsResolved: misconceptions.resolved,
  };
}

/** Opens misconception tags inferred by the diagnose stage (tutor-10); existing open rows are untouched. */
export async function openMisconceptions(
  db: Queryable,
  accountId: string,
  learnerId: string,
  sessionId: string | null,
  tags: readonly string[],
  now: Date = new Date(),
): Promise<string[]> {
  const existing = await listMisconceptionRows(db, accountId, learnerId);
  const opened: string[] = [];
  for (const tag of tags) {
    if (tag === 'computation') continue;
    const row = existing.find((candidate) => candidate.tag === tag);
    if (row?.status === 'open') continue;
    await upsertMisconception(db, accountId, {
      learnerId,
      tag,
      status: 'open',
      firstSeenAt: row?.firstSeenAt ?? now.toISOString(),
      resolvedAt: null,
      cleanStreak: 0,
    });
    await writeEvidence(db, {
      accountId,
      learnerId,
      sessionId,
      type: 'observation',
      assisted: false,
      payload: { kind: 'misconception_opened', tag, source: 'diagnostic' },
    });
    opened.push(tag);
  }
  return opened;
}

/** Records a session touch on a skill without a check (keeps last_seen_at honest; no estimate change). */
export async function touchSkill(
  db: Queryable,
  accountId: string,
  learnerId: string,
  skillId: string,
  now: Date = new Date(),
): Promise<void> {
  await db.query(
    `INSERT INTO skill_mastery (account_id, learner_id, skill_id, estimate, status, last_seen_at, updated_at)
     VALUES ($1, $2, $3, 0.5, 'not_started', $4, $4)
     ON CONFLICT (learner_id, skill_id) DO UPDATE SET last_seen_at = EXCLUDED.last_seen_at`,
    [accountId, learnerId, skillId, now.toISOString()],
  );
}
