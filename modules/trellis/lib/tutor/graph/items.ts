/**
 * The check-item bank (spec §5.8, content-15). Items are authored in
 * `lib/tutor/content/item-bank.json` by the pedagogy track (Builder F) in the
 * schema of `.claude/skills/pedagogy-fractions/references/item-schema.json`.
 * The validator below mirrors `validate-item-bank.mjs` so an item that would
 * fail CI never reaches a learner: only reviewed items load into `check_items`.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseNumeric } from '@/lib/tutor/checks/grading';
import { isExpression } from '@/lib/tutor/checks/symbolic';
import type { AnswerSpec, CheckItem, CheckType } from '@/lib/tutor/contracts';
import type { Queryable } from '@/lib/tutor/db';

import { isMisconceptionTag, isSkillId } from './graph';

export const ITEM_BANK_PATH = join('lib', 'tutor', 'content', 'item-bank.json');

const CHECK_TYPES: readonly CheckType[] = ['single', 'multiple', 'numeric', 'short', 'symbolic'];
const REPRESENTATIONS = ['bar', 'number_line', 'set', 'symbolic', 'word'] as const;
const BANDS = ['9-12', '13-17', 'both'] as const;

/** One item as authored (snake_case, `skill` not `skillId`). */
export interface RawItem {
  id: string;
  skill: string;
  type: CheckType;
  stem: string;
  options?: Array<{ text: string; correct: boolean; misconception?: string }>;
  answer?: AnswerSpec;
  rationale?: string;
  representation: CheckItem['representation'];
  band: CheckItem['band'];
  source: string;
  /**
   * The surface the item wears (word problem, bare computation, compare …),
   * kept from Kaizen-AI's `context_tag` for the two-contexts rule the derived
   * record will need (reference §4). Not yet stored in `check_items`.
   */
  context?: string;
  reviewed_by?: string;
  reviewed_at?: string;
}

export interface ItemValidation {
  valid: RawItem[];
  problems: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateOne(item: unknown, ids: Set<string>): { item?: RawItem; problems: string[] } {
  const problems: string[] = [];
  if (!isRecord(item)) return { problems: ['item is not an object'] };
  const id = typeof item.id === 'string' && /^[A-Za-z0-9_-]+$/.test(item.id) ? item.id : null;
  const where = `item ${id ?? '(no id)'}`;
  if (!id) problems.push(`${where}: missing or malformed id`);
  else if (ids.has(id)) problems.push(`${where}: duplicate id`);
  if (!isSkillId(item.skill)) problems.push(`${where}: unknown skill ${String(item.skill)}`);
  if (!CHECK_TYPES.includes(item.type as CheckType)) problems.push(`${where}: bad type`);
  if (typeof item.stem !== 'string' || item.stem.length < 8)
    problems.push(`${where}: stem too short`);
  if (!REPRESENTATIONS.includes(item.representation as (typeof REPRESENTATIONS)[number]))
    problems.push(`${where}: bad representation`);
  if (!BANDS.includes(item.band as (typeof BANDS)[number])) problems.push(`${where}: bad band`);
  if (typeof item.source !== 'string' || !item.source) problems.push(`${where}: missing source`);
  if (typeof item.reviewed_by !== 'string' || typeof item.reviewed_at !== 'string')
    problems.push(`${where}: not reviewed (reviewed_by/reviewed_at)`);
  else if (!/^\d{4}-\d{2}-\d{2}/.test(item.reviewed_at))
    problems.push(`${where}: reviewed_at is not a date`);

  const type = item.type as CheckType;
  if (type === 'single' || type === 'multiple') {
    const options = Array.isArray(item.options) ? item.options : [];
    if (options.length < 3) problems.push(`${where}: fewer than 3 options`);
    let correct = 0;
    for (const option of options) {
      if (
        !isRecord(option) ||
        typeof option.text !== 'string' ||
        typeof option.correct !== 'boolean'
      ) {
        problems.push(`${where}: malformed option`);
        continue;
      }
      if (option.correct) correct += 1;
      else if (!isMisconceptionTag(option.misconception))
        problems.push(
          `${where}: distractor "${option.text.slice(0, 30)}" lacks a known misconception tag`,
        );
    }
    if (type === 'single' && correct !== 1)
      problems.push(`${where}: single-choice needs exactly one correct option`);
    if (type === 'multiple' && correct < 1)
      problems.push(`${where}: multiple-choice needs a correct option`);
  }
  if (type === 'numeric') {
    const answer = isRecord(item.answer) ? item.answer : null;
    // A number, or a string the grader reads as one ("5/6", "1 1/2", "75%").
    const value = answer?.value;
    if (typeof value !== 'number' && (typeof value !== 'string' || parseNumeric(value) === null))
      problems.push(`${where}: numeric answer.value must be a number or a fraction`);
    if (typeof answer?.tolerance !== 'number' || answer.tolerance < 0)
      problems.push(`${where}: numeric answer needs a tolerance`);
  }
  if (type === 'short') {
    const answer = isRecord(item.answer) ? item.answer : null;
    if (typeof answer?.value !== 'string' && typeof answer?.value !== 'number')
      problems.push(`${where}: short answer needs answer.value`);
    if (
      answer?.keywords !== undefined &&
      (!Array.isArray(answer.keywords) ||
        answer.keywords.some((keyword) => typeof keyword !== 'string' || !keyword.trim()))
    )
      problems.push(`${where}: keywords must be non-empty strings`);
  }
  if (type === 'symbolic') {
    const answer = isRecord(item.answer) ? item.answer : null;
    if (typeof answer?.value !== 'string' || !isExpression(answer.value))
      problems.push(`${where}: symbolic answer.value must be an expression in x`);
    for (const form of Array.isArray(answer?.accept) ? answer.accept : []) {
      if (typeof form !== 'string' || !isExpression(form))
        problems.push(
          `${where}: accepted form "${String(form).slice(0, 30)}" is not an expression`,
        );
    }
  }
  if (type === 'numeric' || type === 'short' || type === 'symbolic') {
    const answer = isRecord(item.answer) ? item.answer : null;
    const wrong = answer?.wrong;
    if (wrong !== undefined) {
      if (!Array.isArray(wrong)) problems.push(`${where}: wrong must be a list`);
      else
        for (const entry of wrong) {
          if (
            !isRecord(entry) ||
            (typeof entry.value !== 'string' && typeof entry.value !== 'number') ||
            !isMisconceptionTag(entry.misconception)
          )
            problems.push(
              `${where}: a named wrong value needs a value and a known misconception tag`,
            );
        }
    }
  }
  if (item.context !== undefined && (typeof item.context !== 'string' || !item.context.trim()))
    problems.push(`${where}: context must be a non-empty string`);
  if (problems.length > 0) return { problems };
  return { item: item as unknown as RawItem, problems };
}

/** Validate a bank; invalid items are reported and dropped, valid ones returned. */
export function validateItems(items: unknown): ItemValidation {
  if (!Array.isArray(items)) return { valid: [], problems: ['items file must be a JSON array'] };
  const ids = new Set<string>();
  const valid: RawItem[] = [];
  const problems: string[] = [];
  for (const raw of items) {
    const result = validateOne(raw, ids);
    problems.push(...result.problems);
    if (result.item) {
      ids.add(result.item.id);
      valid.push(result.item);
    }
  }
  return { valid, problems };
}

export function toCheckItem(item: RawItem): CheckItem {
  return {
    id: item.id,
    skillId: item.skill,
    type: item.type,
    stem: item.stem,
    options: item.options ? item.options.map((option) => ({ ...option })) : null,
    answer: item.answer ? { ...item.answer } : null,
    representation: item.representation,
    band: item.band,
    source: item.source,
    reviewedBy: item.reviewed_by ?? null,
    reviewedAt: item.reviewed_at ?? null,
  };
}

/** Read and validate a bank file; a missing file is an empty bank, not an error. */
export function loadItemBank(path = join(process.cwd(), ITEM_BANK_PATH)): ItemValidation {
  if (!existsSync(path)) return { valid: [], problems: [] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    return { valid: [], problems: [`item bank is not valid JSON: ${(error as Error).message}`] };
  }
  return validateItems(parsed);
}

interface CheckItemRow extends Record<string, unknown> {
  id: string;
  skill_id: string;
  type: CheckType;
  stem: string;
  options: CheckItem['options'] | string | null;
  answer: CheckItem['answer'] | string | null;
  representation: CheckItem['representation'];
  band: CheckItem['band'];
  source: string;
  reviewed_by: string | null;
  reviewed_at: string | Date | null;
}

function parseJson<T>(value: T | string | null): T | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return JSON.parse(value) as T;
  return value;
}

export function rowToCheckItem(row: CheckItemRow): CheckItem {
  return {
    id: row.id,
    skillId: row.skill_id,
    type: row.type,
    stem: row.stem,
    options: parseJson(row.options),
    answer: parseJson(row.answer),
    representation: row.representation,
    band: row.band,
    source: row.source,
    reviewedBy: row.reviewed_by,
    reviewedAt:
      row.reviewed_at instanceof Date ? row.reviewed_at.toISOString() : (row.reviewed_at ?? null),
  };
}

/** Idempotent upsert of validated items into `check_items`. */
export async function upsertCheckItems(db: Queryable, items: readonly RawItem[]): Promise<number> {
  for (const item of items) {
    await db.query(
      `INSERT INTO check_items (id, skill_id, type, stem, options, answer, representation, band, source, reviewed_by, reviewed_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO UPDATE SET skill_id = EXCLUDED.skill_id, type = EXCLUDED.type, stem = EXCLUDED.stem,
         options = EXCLUDED.options, answer = EXCLUDED.answer, representation = EXCLUDED.representation,
         band = EXCLUDED.band, source = EXCLUDED.source, reviewed_by = EXCLUDED.reviewed_by, reviewed_at = EXCLUDED.reviewed_at`,
      [
        item.id,
        item.skill,
        item.type,
        item.stem,
        item.options ? JSON.stringify(item.options) : null,
        item.answer ? JSON.stringify(item.answer) : null,
        item.representation,
        item.band,
        item.source,
        item.reviewed_by ?? null,
        item.reviewed_at ?? null,
      ],
    );
  }
  return items.length;
}

export interface PickItemOptions {
  band: '9-12' | '13-17' | 'adult' | '4-8';
  excludeIds?: readonly string[];
  /** Prefer an item that does not use this representation (diagnostic rule: never the same twice). */
  avoidRepresentation?: CheckItem['representation'] | null;
}

/** One reviewed bank item for a skill, band-filtered, deterministic order, or null when the bank has none. */
export async function pickBankItem(
  db: Queryable,
  skillId: string,
  options: PickItemOptions,
): Promise<CheckItem | null> {
  const bandKey = options.band === '9-12' ? '9-12' : '13-17';
  const { rows } = await db.query<CheckItemRow>(
    `SELECT * FROM check_items WHERE skill_id = $1 AND (band = 'both' OR band = $2) AND reviewed_at IS NOT NULL ORDER BY id`,
    [skillId, bandKey],
  );
  const exclude = new Set(options.excludeIds ?? []);
  const candidates = rows.map(rowToCheckItem).filter((item) => !exclude.has(item.id));
  if (candidates.length === 0) return null;
  const varied = options.avoidRepresentation
    ? candidates.find((item) => item.representation !== options.avoidRepresentation)
    : undefined;
  return varied ?? candidates[0] ?? null;
}

export async function getBankItem(db: Queryable, id: string): Promise<CheckItem | null> {
  const { rows } = await db.query<CheckItemRow>(`SELECT * FROM check_items WHERE id = $1`, [id]);
  return rows[0] ? rowToCheckItem(rows[0]) : null;
}
