/**
 * Everything the live turn shows the model, assembled from the database
 * (spec §5.1–§5.6, R2, R12). The band is the principal's band, never the
 * request's (strategy law 3); the learner's own text is a user message, never
 * part of the system prompt.
 *
 * What goes in: the band, persona, coach, safety, and grammar sections; the
 * target skill with its prerequisites and estimate; the learner's open
 * misconceptions and stored profile; the coursework text; a compact summary of
 * the board; the pending check; the phase and the minutes left; and the last
 * `HISTORY_TURNS` turns of this session as chat messages.
 */
import type { ModelMessage } from 'ai';

import { guestLevel, isGuestLevelId, type AgeBand } from '@/kaizen.config';
import type { CheckItem, LearnerProfile, SessionPhase, TurnRecord } from '@/lib/tutor/contracts';
import type { Queryable } from '@/lib/tutor/db';
import { skillById } from '@/lib/tutor/graph/graph';
import { pickBankItem } from '@/lib/tutor/graph/items';
import { listMasteryRows, listMisconceptionRows } from '@/lib/tutor/model/service';
import { emptyMastery } from '@/lib/tutor/model/student-model';
import { buildSystemPrompt, type PromptContext } from '@/lib/tutor/prompts/build';
import { listTurns } from '@/lib/tutor/session/service';
import type { SessionState } from '@/lib/tutor/session/state';
import { nextDiagnosticSkill } from '@/lib/tutor/session/state-machine';

import { describeBoard } from './actions';

/** Turns of history the model sees. Enough for the thread, short enough to stay cheap. */
export const HISTORY_TURNS = 12;

interface ProfileRow extends Record<string, unknown> {
  profile: unknown;
}

const PACES = ['slow', 'steady', 'fast'] as const;

function strings(value: unknown, limit: number): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === 'string' && item.trim() !== '')
        .slice(0, limit)
    : [];
}

/** A stored profile blob repaired into the contract shape; an empty row is null. */
export function toLearnerProfile(raw: unknown, updatedAt: string): LearnerProfile | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  if (Object.keys(record).length === 0) return null;
  const pace =
    typeof record.pace === 'string' && (PACES as readonly string[]).includes(record.pace)
      ? (record.pace as LearnerProfile['pace'])
      : 'steady';
  return {
    subjects: strings(record.subjects, 8),
    recurringMisconceptions: strings(record.recurringMisconceptions, 6),
    pace,
    explanationStylesThatWorked: strings(record.explanationStylesThatWorked, 6),
    notes: typeof record.notes === 'string' ? record.notes.slice(0, 600) : '',
    updatedAt,
  };
}

export async function loadLearnerProfile(
  db: Queryable,
  accountId: string,
  learnerId: string,
): Promise<LearnerProfile | null> {
  const { rows } = await db.query<ProfileRow & { updated_at: string | Date }>(
    `SELECT profile, updated_at FROM learner_profiles WHERE account_id = $1 AND learner_id = $2`,
    [accountId, learnerId],
  );
  const row = rows[0];
  if (!row) return null;
  const parsed = typeof row.profile === 'string' ? safeJson(row.profile) : row.profile;
  const updatedAt =
    row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at);
  return toLearnerProfile(parsed, updatedAt);
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

interface CourseworkRow extends Record<string, unknown> {
  title: string;
  text: string | null;
  status: string;
}

async function loadCoursework(
  db: Queryable,
  accountId: string,
  learnerId: string,
  courseworkId: string | null,
): Promise<{ title: string; text: string | null } | null> {
  if (!courseworkId) return null;
  const { rows } = await db.query<CourseworkRow>(
    `SELECT title, text, status FROM coursework WHERE id = $1 AND account_id = $2 AND learner_id = $3`,
    [courseworkId, accountId, learnerId],
  );
  const row = rows[0];
  if (!row || row.status === 'failed') return null;
  return { title: row.title, text: row.text };
}

export interface TurnContextInput {
  db: Queryable;
  accountId: string;
  learnerId: string;
  band: AgeBand;
  sessionId: string;
  courseworkId: string | null;
  skillId: string | null;
  /** The guest's grade level id (D35), or null for an account learner. */
  level?: string | null;
  phase: SessionPhase;
  state: SessionState;
  remainingMs: number;
  greet: boolean;
  silence: boolean;
  wrapDue: boolean;
  softContinueAvailable: boolean;
  checkDue: boolean;
  /** Set by the engine when the sitting clock owes a break reminder on this turn. */
  breakDue: boolean;
}

export interface TurnContext {
  prompt: PromptContext;
  system: string;
  messages: ModelMessage[];
  /** The skill the turn is about; the tutor-authored check falls back to it. */
  skillId: string | null;
}

/** A reviewed bank item for `skillId`, or null when the bank has none for it. */
async function offerItem(
  db: Queryable,
  band: AgeBand,
  skillId: string | null,
  state: SessionState,
): Promise<CheckItem | null> {
  if (!skillId) return null;
  return pickBankItem(db, skillId, {
    band,
    excludeIds: state.usedItemIds,
    avoidRepresentation:
      (state.diagnostic?.asked.at(-1)?.representation as CheckItem['representation'] | undefined) ??
      null,
  });
}

function toMessages(turns: readonly TurnRecord[], learnerText: string): ModelMessage[] {
  const messages: ModelMessage[] = turns
    .filter((turn) => turn.text.trim() !== '')
    .map((turn) => ({
      role: turn.role === 'tutor' ? ('assistant' as const) : ('user' as const),
      content: turn.text,
    }));
  messages.push({ role: 'user', content: learnerText });
  return messages;
}

/**
 * Builds the system prompt and the message list for one turn. `learnerText`
 * is what the learner just said; for a silence turn it is a short marker so
 * the model has a user message to answer.
 */
export async function buildTurnContext(
  input: TurnContextInput,
  learnerText: string,
): Promise<TurnContext> {
  const { db, accountId, learnerId, band, state } = input;
  const [masteryRows, misconceptionRows, profile, coursework, history] = await Promise.all([
    listMasteryRows(db, accountId, learnerId),
    listMisconceptionRows(db, accountId, learnerId),
    loadLearnerProfile(db, accountId, learnerId),
    loadCoursework(db, accountId, learnerId, input.courseworkId),
    listTurns(db, input.sessionId, HISTORY_TURNS),
  ]);

  const diagnosticSkillId =
    state.diagnostic && !state.diagnostic.done ? nextDiagnosticSkill(state.diagnostic) : null;
  const skillId = diagnosticSkillId ?? input.skillId;
  const node = skillId ? skillById(skillId) : undefined;
  const byId = new Map(masteryRows.map((row) => [row.skillId, row]));
  const row = skillId ? (byId.get(skillId) ?? emptyMastery(learnerId, skillId)) : null;

  const openMisconceptions = misconceptionRows
    .filter((misconception) => misconception.status === 'open')
    .map((misconception) => misconception.tag);

  const delayed = state.delayedCheck;
  const delayedNode = delayed ? skillById(delayed.skillId) : undefined;

  const wantsItem =
    (state.diagnostic && !state.diagnostic.done) || input.checkDue || delayed !== null;
  // Both bank picks are independent reads in front of the model call, so they
  // go out together rather than one after the other (spec §5.3).
  const wantsDelayedItem = Boolean(delayed && delayed.skillId !== skillId);
  const [item, ownDelayedItem] = await Promise.all([
    wantsItem ? offerItem(db, band, skillId, state) : Promise.resolve(null),
    wantsDelayedItem && delayed
      ? offerItem(db, band, delayed.skillId, state)
      : Promise.resolve(null),
  ]);
  const delayedItem = wantsDelayedItem ? ownDelayedItem : item;

  const prompt: PromptContext = {
    band,
    phase: input.phase,
    remainingMs: input.remainingMs,
    target: state.target,
    topic: state.topic,
    level: isGuestLevelId(input.level) ? guestLevel(input.level).label : null,
    skill:
      node && row
        ? {
            id: node.id,
            name: node.name,
            estimate: row.estimate,
            status: row.status,
            nItems: row.nItems,
          }
        : null,
    prereqs: (node?.prereqs ?? []).flatMap((id) => {
      const prereq = skillById(id);
      if (!prereq) return [];
      return [{ id, name: prereq.name, status: byId.get(id)?.status ?? 'not_started' }];
    }),
    openMisconceptions,
    profile,
    coursework,
    boardLines: describeBoard(state.board),
    pendingCheck: state.pendingCheck
      ? { stem: state.pendingCheck.stem, type: state.pendingCheck.type }
      : null,
    lastCheckResult: state.lastCheckResult,
    checkDue: input.checkDue && skillId ? { item, skillId } : null,
    diagnostic:
      state.diagnostic && !state.diagnostic.done && diagnosticSkillId
        ? {
            index: state.diagnostic.asked.length + 1,
            max: state.diagnostic.max,
            offer: { item, skillId: diagnosticSkillId },
          }
        : null,
    delayedCheck:
      delayed && delayedNode
        ? { skillId: delayed.skillId, name: delayedNode.name, item: delayedItem }
        : null,
    coach: state.coach,
    reteachUsed: state.reteachUsed,
    silence: input.silence,
    greet: input.greet,
    breakDue: input.breakDue,
    wrap: {
      due: input.wrapDue,
      softContinueAvailable: input.softContinueAvailable,
      extended: state.timer.extended,
    },
    learnerTurnsSoFar: state.learnerTurns,
  };

  return {
    prompt,
    system: buildSystemPrompt(prompt),
    messages: toMessages(history, learnerText),
    skillId,
  };
}
