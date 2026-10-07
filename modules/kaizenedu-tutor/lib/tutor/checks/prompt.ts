/**
 * Building a pending check (server-side, with its answer key) from a reviewed
 * bank item or from a tutor-authored `[[check ...]]` tag, and the client view
 * of it (a CheckPrompt without the key).
 */
import { newId } from '@/lib/tutor/auth/session';
import type { CheckItem, CheckPrompt, CheckType } from '@/lib/tutor/contracts';
import { isMisconceptionTag, isSkillId, skillById } from '@/lib/tutor/graph/graph';
import type { AnswerKey, PendingCheckState } from '@/lib/tutor/session/state';

const CHECK_TYPES: readonly CheckType[] = ['single', 'multiple', 'numeric', 'short', 'symbolic'];

function optionId(index: number): string {
  return String.fromCharCode(97 + index);
}

function relevantTagsFor(skillId: string, options: AnswerKey['options']): string[] {
  const tags = new Set<string>(skillById(skillId)?.tags ?? []);
  for (const option of options ?? []) if (option.misconception) tags.add(option.misconception);
  return [...tags];
}

export function pendingFromBankItem(
  item: CheckItem,
  flags: { diagnostic: boolean; issuedTurnId: string | null; now: Date },
): PendingCheckState {
  const options = item.options
    ? item.options.map((option, index) => ({
        id: optionId(index),
        text: option.text,
        correct: option.correct,
        misconception: option.misconception ?? null,
      }))
    : null;
  return {
    checkId: newId('chk'),
    skillId: item.skillId,
    type: item.type,
    stem: item.stem,
    options: options ? options.map(({ id, text }) => ({ id, text })) : null,
    key: { type: item.type, options, answer: item.answer ? { ...item.answer } : null },
    itemId: item.id,
    issuedAt: flags.now.toISOString(),
    issuedTurnId: flags.issuedTurnId,
    diagnostic: flags.diagnostic,
    relevantTags: relevantTagsFor(item.skillId, options),
    representation: item.representation,
  };
}

export type TagCheckResult =
  | { ok: true; pending: PendingCheckState }
  | { ok: true; itemId: string }
  | { ok: false; reason: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Validates a tutor-authored check payload; `{itemId}` defers to the bank. */
export function pendingFromTag(
  payload: unknown,
  defaults: { skillId: string | null; diagnostic: boolean; issuedTurnId: string | null; now: Date },
): TagCheckResult {
  if (!isRecord(payload)) return { ok: false, reason: 'payload is not an object' };
  if (typeof payload.itemId === 'string' && payload.itemId.trim()) {
    return { ok: true, itemId: payload.itemId.trim() };
  }
  const type = payload.type;
  if (!CHECK_TYPES.includes(type as CheckType)) return { ok: false, reason: 'bad type' };
  const stem = typeof payload.stem === 'string' ? payload.stem.trim() : '';
  if (stem.length < 8) return { ok: false, reason: 'stem too short' };
  const skillId = isSkillId(payload.skillId) ? payload.skillId : defaults.skillId;
  if (!skillId) return { ok: false, reason: 'no skill' };

  let options: AnswerKey['options'] = null;
  let answer: AnswerKey['answer'] = null;
  if (type === 'single' || type === 'multiple') {
    if (!Array.isArray(payload.options) || payload.options.length < 2)
      return { ok: false, reason: 'needs at least two options' };
    const mapped: NonNullable<AnswerKey['options']> = [];
    for (const [index, raw] of payload.options.entries()) {
      if (!isRecord(raw) || typeof raw.text !== 'string' || !raw.text.trim())
        return { ok: false, reason: 'malformed option' };
      const correct = raw.correct === true;
      const tag = correct
        ? null
        : isMisconceptionTag(raw.misconception)
          ? raw.misconception
          : 'computation';
      mapped.push({ id: optionId(index), text: raw.text.trim(), correct, misconception: tag });
    }
    const correctCount = mapped.filter((option) => option.correct).length;
    if (type === 'single' && correctCount !== 1)
      return { ok: false, reason: 'single needs one correct' };
    if (type === 'multiple' && correctCount < 1)
      return { ok: false, reason: 'multiple needs a correct' };
    options = mapped;
  } else if (type === 'numeric') {
    const raw = isRecord(payload.answer) ? payload.answer : null;
    const value = typeof raw?.value === 'number' ? raw.value : Number(raw?.value);
    if (!Number.isFinite(value)) return { ok: false, reason: 'numeric answer needs a value' };
    const tolerance =
      typeof raw?.tolerance === 'number' && raw.tolerance >= 0
        ? raw.tolerance
        : Number.isInteger(value)
          ? 0
          : 0.01;
    answer = { value, tolerance, ...(typeof raw?.units === 'string' ? { units: raw.units } : {}) };
  } else {
    const raw = isRecord(payload.answer) ? payload.answer : null;
    const value =
      typeof raw?.value === 'string' || typeof raw?.value === 'number' ? raw.value : null;
    if (value === null || String(value).trim() === '')
      return { ok: false, reason: 'short answer needs a value' };
    const accept = Array.isArray(raw?.accept)
      ? raw.accept.filter((v): v is string => typeof v === 'string')
      : [];
    answer = { value, accept };
  }
  const pending: PendingCheckState = {
    checkId: newId('chk'),
    skillId,
    type: type as CheckType,
    stem,
    options: options ? options.map(({ id, text }) => ({ id, text })) : null,
    key: { type: type as CheckType, options, answer },
    itemId: null,
    issuedAt: defaults.now.toISOString(),
    issuedTurnId: defaults.issuedTurnId,
    diagnostic: defaults.diagnostic,
    relevantTags: relevantTagsFor(skillId, options),
    representation: null,
  };
  return { ok: true, pending };
}

export function toCheckPrompt(pending: PendingCheckState): CheckPrompt {
  return {
    checkId: pending.checkId,
    skillId: pending.skillId,
    type: pending.type,
    stem: pending.stem,
    ...(pending.options ? { options: pending.options } : {}),
    itemId: pending.itemId,
  };
}
