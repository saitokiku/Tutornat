/**
 * The planner (D35): what the learner has on their plate — an assignment, a
 * test, a reading — with an optional due date, so the dashboard can say what
 * is due and start a session from it. Every read and write is scoped by
 * `account_id` and `learner_id` from the principal (invariant a); a row id
 * from another account is simply not found.
 */
import { newId } from '@/lib/tutor/auth/session';
import type { PlannerItem, PlannerStatus, SubjectId } from '@/lib/tutor/contracts';
import type { Queryable } from '@/lib/tutor/db';
import { isSubjectId } from '@/lib/tutor/graph/subjects';
import { toIso, toIsoRequired } from '@/lib/tutor/model/rows';

export const PLANNER_TITLE_MAX = 120;
export const PLANNER_NOTES_MAX = 500;
/** Open items first by due date, then done items newest first; more than this scrolls elsewhere. */
export const PLANNER_LIMIT = 100;

export type PlannerErrorCode = 'NOT_FOUND' | 'INVALID_REQUEST';

export class PlannerError extends Error {
  constructor(
    readonly code: PlannerErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'PlannerError';
  }
}

export interface PlannerRow extends Record<string, unknown> {
  id: string;
  learner_id: string;
  title: string;
  subject: string;
  due_on: string | Date | null;
  status: string;
  notes: string;
  created_at: string | Date;
  completed_at: string | Date | null;
}

export interface Scope {
  accountId: string;
  learnerId: string;
}

const COLUMNS = 'id, learner_id, title, subject, due_on, status, notes, created_at, completed_at';
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** `due_on` is a DATE: a driver may hand it back as a Date at UTC midnight or as text. */
function dateOnly(value: string | Date | null): string | null {
  if (value === null) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value).trim();
  return DATE.test(text) ? text : text.slice(0, 10);
}

export function rowToPlannerItem(row: PlannerRow): PlannerItem {
  return {
    id: row.id,
    learnerId: row.learner_id,
    title: row.title,
    subject: isSubjectId(row.subject) ? row.subject : 'other',
    dueOn: dateOnly(row.due_on),
    status: row.status === 'done' ? 'done' : 'todo',
    notes: row.notes ?? '',
    createdAt: toIsoRequired(row.created_at),
    completedAt: toIso(row.completed_at),
  };
}

function validTitle(raw: unknown): string {
  const title = typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim() : '';
  if (!title) throw new PlannerError('INVALID_REQUEST', 'title is required.');
  if (title.length > PLANNER_TITLE_MAX) {
    throw new PlannerError(
      'INVALID_REQUEST',
      `title must be ${PLANNER_TITLE_MAX} characters or fewer.`,
    );
  }
  return title;
}

function validNotes(raw: unknown): string {
  if (raw === undefined || raw === null) return '';
  if (typeof raw !== 'string') throw new PlannerError('INVALID_REQUEST', 'notes must be text.');
  const notes = raw.trim();
  if (notes.length > PLANNER_NOTES_MAX) {
    throw new PlannerError(
      'INVALID_REQUEST',
      `notes must be ${PLANNER_NOTES_MAX} characters or fewer.`,
    );
  }
  return notes;
}

function validSubject(raw: unknown): SubjectId {
  if (!isSubjectId(raw)) throw new PlannerError('INVALID_REQUEST', 'subject is not known.');
  return raw;
}

/** `null` clears the date; a string must be YYYY-MM-DD and a real calendar day. */
function validDueOn(raw: unknown): string | null {
  if (raw === undefined || raw === null || raw === '') return null;
  if (typeof raw !== 'string' || !DATE.test(raw) || Number.isNaN(Date.parse(`${raw}T00:00:00Z`))) {
    throw new PlannerError('INVALID_REQUEST', 'dueOn must be a date written YYYY-MM-DD.');
  }
  return raw;
}

function validStatus(raw: unknown): PlannerStatus {
  if (raw !== 'todo' && raw !== 'done') {
    throw new PlannerError('INVALID_REQUEST', "status must be 'todo' or 'done'.");
  }
  return raw;
}

export async function listPlannerItems(db: Queryable, scope: Scope): Promise<PlannerItem[]> {
  const { rows } = await db.query<PlannerRow>(
    `SELECT ${COLUMNS} FROM planner_items
     WHERE account_id = $1 AND learner_id = $2
     ORDER BY (status = 'done'), due_on ASC NULLS LAST, created_at DESC, id
     LIMIT $3`,
    [scope.accountId, scope.learnerId, PLANNER_LIMIT],
  );
  return rows.map(rowToPlannerItem);
}

export async function createPlannerItem(
  db: Queryable,
  scope: Scope,
  input: { title: unknown; subject: unknown; dueOn?: unknown; notes?: unknown },
  now: Date = new Date(),
): Promise<PlannerItem> {
  const { rows } = await db.query<PlannerRow>(
    `INSERT INTO planner_items (id, account_id, learner_id, title, subject, due_on, status, notes, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'todo', $7, $8)
     RETURNING ${COLUMNS}`,
    [
      newId('pln'),
      scope.accountId,
      scope.learnerId,
      validTitle(input.title),
      validSubject(input.subject),
      validDueOn(input.dueOn),
      validNotes(input.notes),
      now.toISOString(),
    ],
  );
  return rowToPlannerItem(rows[0]!);
}

export async function updatePlannerItem(
  db: Queryable,
  scope: Scope,
  id: string,
  input: { title?: unknown; subject?: unknown; dueOn?: unknown; notes?: unknown; status?: unknown },
  now: Date = new Date(),
): Promise<PlannerItem> {
  const current = await db.query<PlannerRow>(
    `SELECT ${COLUMNS} FROM planner_items WHERE id = $1 AND account_id = $2 AND learner_id = $3`,
    [id, scope.accountId, scope.learnerId],
  );
  const row = current.rows[0];
  if (!row) throw new PlannerError('NOT_FOUND', 'No such planner item.');
  const status = input.status === undefined ? row.status : validStatus(input.status);
  const completedAt =
    status === 'done' ? (row.status === 'done' ? row.completed_at : now.toISOString()) : null;
  const { rows } = await db.query<PlannerRow>(
    `UPDATE planner_items SET title = $4, subject = $5, due_on = $6, notes = $7, status = $8, completed_at = $9
     WHERE id = $1 AND account_id = $2 AND learner_id = $3
     RETURNING ${COLUMNS}`,
    [
      id,
      scope.accountId,
      scope.learnerId,
      input.title === undefined ? row.title : validTitle(input.title),
      input.subject === undefined ? row.subject : validSubject(input.subject),
      input.dueOn === undefined ? dateOnly(row.due_on) : validDueOn(input.dueOn),
      input.notes === undefined ? row.notes : validNotes(input.notes),
      status,
      completedAt,
    ],
  );
  return rowToPlannerItem(rows[0]!);
}

/** True when a row was deleted; false when there was none in this scope. */
export async function deletePlannerItem(db: Queryable, scope: Scope, id: string): Promise<boolean> {
  const { rows } = await db.query<{ id: string }>(
    `DELETE FROM planner_items WHERE id = $1 AND account_id = $2 AND learner_id = $3 RETURNING id`,
    [id, scope.accountId, scope.learnerId],
  );
  return rows.length > 0;
}
