/**
 * Coursework rows: what the learner is working on (spec R3, §8.5). Every read
 * and write is scoped by `account_id` *and* `learner_id` from the principal
 * (invariant a), so a row id from another account is simply not found.
 *
 * Three sources: `text` (typed in), `upload` (a photo or PDF the extractor
 * read), and `skill` (picked from the graph). A failed extraction keeps its
 * row with `status: 'failed'` so the learner can retry or type it instead.
 */
import { newId } from '@/lib/tutor/auth/session';
import type { CourseworkItem, CourseworkSource, CourseworkStatus } from '@/lib/tutor/contracts';
import type { Queryable } from '@/lib/tutor/db';
import { isSkillId } from '@/lib/tutor/graph/graph';
import { parseJsonb, toIsoRequired } from '@/lib/tutor/model/rows';

export const TITLE_MAX = 120;
export const TEXT_MAX = 20_000;
/** Newest first; a learner with more than this scrolls their history elsewhere. */
export const COURSEWORK_LIMIT = 50;

export type CourseworkErrorCode = 'NOT_FOUND' | 'INVALID_REQUEST';

export interface CourseworkRow extends Record<string, unknown> {
  id: string;
  learner_id: string;
  title: string;
  source: CourseworkSource;
  status: CourseworkStatus;
  text: string | null;
  skill_ids: string[] | string | null;
  created_at: string | Date;
}

export function rowToCoursework(row: CourseworkRow): CourseworkItem {
  return {
    id: row.id,
    learnerId: row.learner_id,
    title: row.title,
    source: row.source,
    status: row.status,
    text: row.text,
    skillIds: parseJsonb<string[]>(row.skill_ids, []).filter(isSkillId),
    createdAt: toIsoRequired(row.created_at),
  };
}

export interface Scope {
  accountId: string;
  learnerId: string;
}

export async function listCoursework(db: Queryable, scope: Scope): Promise<CourseworkItem[]> {
  const { rows } = await db.query<CourseworkRow>(
    `SELECT id, learner_id, title, source, status, text, skill_ids, created_at
     FROM coursework WHERE account_id = $1 AND learner_id = $2
     ORDER BY created_at DESC, id DESC LIMIT $3`,
    [scope.accountId, scope.learnerId, COURSEWORK_LIMIT],
  );
  return rows.map(rowToCoursework);
}

export async function getCoursework(
  db: Queryable,
  scope: Scope,
  id: string,
): Promise<CourseworkItem | null> {
  const { rows } = await db.query<CourseworkRow>(
    `SELECT id, learner_id, title, source, status, text, skill_ids, created_at
     FROM coursework WHERE id = $1 AND account_id = $2 AND learner_id = $3`,
    [id, scope.accountId, scope.learnerId],
  );
  return rows[0] ? rowToCoursework(rows[0]) : null;
}

export interface CreateCourseworkInput {
  title: string;
  text: string | null;
  source: CourseworkSource;
  status?: CourseworkStatus;
  skillIds?: readonly string[];
  extractError?: string | null;
}

export function cleanTitle(value: unknown, fallback: string): string {
  const text = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  return (text || fallback).slice(0, TITLE_MAX);
}

export async function createCoursework(
  db: Queryable,
  scope: Scope,
  input: CreateCourseworkInput,
): Promise<CourseworkItem> {
  const id = newId('cw');
  await db.query(
    `INSERT INTO coursework (id, account_id, learner_id, title, source, status, text, skill_ids, extract_error)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)`,
    [
      id,
      scope.accountId,
      scope.learnerId,
      cleanTitle(input.title, 'Untitled problem'),
      input.source,
      input.status ?? 'ready',
      input.text === null ? null : input.text.slice(0, TEXT_MAX),
      JSON.stringify((input.skillIds ?? []).filter(isSkillId)),
      input.extractError ?? null,
    ],
  );
  const created = await getCoursework(db, scope, id);
  if (!created) throw new Error('coursework vanished after insert');
  return created;
}

export interface UpdateCourseworkInput {
  id: string;
  title?: string;
  text?: string;
  status?: CourseworkStatus;
  skillIds?: readonly string[];
}

/** Confirming or correcting an extraction; null when the row is not the caller's. */
export async function updateCoursework(
  db: Queryable,
  scope: Scope,
  input: UpdateCourseworkInput,
): Promise<CourseworkItem | null> {
  const existing = await getCoursework(db, scope, input.id);
  if (!existing) return null;
  const title =
    input.title === undefined ? existing.title : cleanTitle(input.title, existing.title);
  const text = input.text === undefined ? existing.text : input.text.slice(0, TEXT_MAX);
  // Correcting the text of a failed extraction is what makes it usable again.
  const status: CourseworkStatus =
    input.status ??
    (existing.status === 'failed' && input.text !== undefined ? 'ready' : existing.status);
  const skillIds =
    input.skillIds === undefined ? existing.skillIds : input.skillIds.filter(isSkillId);
  await db.query(
    `UPDATE coursework SET title = $4, text = $5, status = $6, skill_ids = $7::jsonb,
       extract_error = CASE WHEN $6 = 'failed' THEN extract_error ELSE NULL END
     WHERE id = $1 AND account_id = $2 AND learner_id = $3`,
    [input.id, scope.accountId, scope.learnerId, title, text, status, JSON.stringify(skillIds)],
  );
  return getCoursework(db, scope, input.id);
}

/** True when a row was removed; false when the id is not the caller's. */
export async function deleteCoursework(db: Queryable, scope: Scope, id: string): Promise<boolean> {
  const existing = await getCoursework(db, scope, id);
  if (!existing) return false;
  await db.query(`DELETE FROM coursework WHERE id = $1 AND account_id = $2 AND learner_id = $3`, [
    id,
    scope.accountId,
    scope.learnerId,
  ]);
  return true;
}
