/**
 * Student model v0 (spec §5.7): the PRACTICE estimate. Pure.
 *
 * estimate: exponential moving average of correctness on check items,
 * alpha = STUDENT_MODEL.emaAlpha, from a 0.5 prior ("unknown") for a skill
 * with no evidence. With alpha 0.3 four straight correct items lift the prior
 * to 0.88 and one miss among four leaves it below 0.8, which matches the
 * "≥ 4 items" threshold in the spec.
 *
 * status: not_started (0 items) → in_progress → mastered (estimate ≥ 0.8,
 * ≥ 4 items across ≥ 2 sessions). `mastered` is the ceiling of this model.
 *
 * E1 containment (SPEC v0.3 §3.1, ADR-0042; replaces the inherited D17 tier):
 * practice never earns mastery credit, at any weight, so this model never
 * emits `confirmed` and never schedules a certifying check (`nextCheckAt`
 * stays null). The inherited 24-hour rule is gone; the accepted rule (≥ 48 h
 * since instruction, two contexts, two days, day-seven retention) belongs to
 * a restricted assessment service that this repository does not contain.
 * A persisted legacy `confirmed` row is treated as `mastered` on its next
 * update and read as `legacy_unverified` by every consumer (`containStatus`).
 */
import { STUDENT_MODEL } from '@/lib/tutor/config';
import type { Certification, MasteryStatus, SkillMastery } from '@/lib/tutor/contracts';

export const PRIOR_ESTIMATE = 0.5;
/** Stamped on every evidence row and mastery view this model produces. */
export const CONTAINMENT_RULE_VERSION = 'e1-containment-2026-09-17';
/** The highest status practice can reach. */
export const PRACTICE_CEILING: MasteryStatus = 'mastered';

/**
 * The only place a stored status becomes a displayed one. `confirmed` from
 * the inherited engine is unsupported history, never a certified label.
 */
export function containStatus(stored: MasteryStatus): {
  status: MasteryStatus;
  certification: Certification;
} {
  if (stored === 'confirmed') return { status: PRACTICE_CEILING, certification: 'legacy_unverified' };
  return { status: stored, certification: 'none' };
}

export interface MasteryRow extends Omit<SkillMastery, 'certification'> {
  sessionIds: string[];
  startingEstimate: number | null;
}

export interface CheckObservation {
  correct: boolean;
  sessionId: string;
  assisted: boolean;
  now: Date;
}

export interface MasteryUpdate {
  next: MasteryRow;
  from: MasteryStatus;
  statusChanged: boolean;
  /** Always false under E1: practice checks are never the certifying check. Kept for the wire shape. */
  delayed: false;
}

/** Monday 00:00 UTC of the week containing `now`. */
export function weekStart(now: Date): Date {
  const day = now.getUTCDay();
  const offset = (day + 6) % 7;
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - offset);
  return start;
}

export function ema(previous: number, observation: number, alpha = STUDENT_MODEL.emaAlpha): number {
  return alpha * observation + (1 - alpha) * previous;
}

export function meetsMastered(row: Pick<MasteryRow, 'estimate' | 'nItems' | 'nSessions'>): boolean {
  return (
    row.estimate >= STUDENT_MODEL.masteredEstimate &&
    row.nItems >= STUDENT_MODEL.masteredMinItems &&
    row.nSessions >= STUDENT_MODEL.masteredMinSessions
  );
}

export function emptyMastery(learnerId: string, skillId: string): MasteryRow {
  return {
    learnerId,
    skillId,
    estimate: PRIOR_ESTIMATE,
    nItems: 0,
    nSessions: 0,
    sessionIds: [],
    status: 'not_started',
    startingEstimate: null,
    updatedAt: new Date(0).toISOString(),
    lastSeenAt: null,
    nextCheckAt: null,
  };
}

/**
 * E1: a practice check is never the certifying check, whatever `nextCheckAt`
 * a legacy row carries. The certifying path is the later assessment service.
 */
export function isDelayedCheckDue(_row: MasteryRow, _now: Date): false {
  return false;
}

export function applyCheck(
  previous: MasteryRow | null,
  learnerId: string,
  skillId: string,
  obs: CheckObservation,
): MasteryUpdate {
  const prev = previous ?? emptyMastery(learnerId, skillId);
  // A legacy `confirmed` row is unsupported history: the update starts from the practice ceiling.
  const from = containStatus(prev.status).status;
  const sessionIds = prev.sessionIds.includes(obs.sessionId)
    ? prev.sessionIds
    : [...prev.sessionIds, obs.sessionId];
  const estimate = ema(prev.nItems === 0 ? PRIOR_ESTIMATE : prev.estimate, obs.correct ? 1 : 0);
  const nItems = prev.nItems + 1;
  const nSessions = sessionIds.length;
  const candidate = { estimate, nItems, nSessions };

  // Practice never earns mastery credit (SPEC §3.1): the ceiling is `mastered`,
  // assisted or not, and no certifying check is ever scheduled from here.
  const status: MasteryStatus = meetsMastered(candidate) ? PRACTICE_CEILING : 'in_progress';
  const nextCheckAt: string | null = null;

  const firstThisWeek =
    previous === null || new Date(prev.updatedAt).getTime() < weekStart(obs.now).getTime();
  const startingEstimate = firstThisWeek
    ? prev.nItems === 0
      ? PRIOR_ESTIMATE
      : prev.estimate
    : prev.startingEstimate;

  const next: MasteryRow = {
    learnerId,
    skillId,
    estimate,
    nItems,
    nSessions,
    sessionIds,
    status,
    startingEstimate,
    updatedAt: obs.now.toISOString(),
    lastSeenAt: obs.now.toISOString(),
    nextCheckAt,
  };
  return { next, from, statusChanged: status !== from, delayed: false };
}

// ---------------------------------------------------------------------------
// Misconceptions (spec §5.7: attach on tagged wrong answers, resolve after 3
// consecutive relevant items without the tag)
// ---------------------------------------------------------------------------

export interface MisconceptionRow {
  learnerId: string;
  tag: string;
  status: 'open' | 'resolved';
  firstSeenAt: string;
  resolvedAt: string | null;
  cleanStreak: number;
}

export interface MisconceptionEvidence {
  /** The tag a wrong answer carried, or null. `computation` never opens a misconception. */
  hitTag: string | null;
  /** Tags an item is relevant to (its skill's tags plus every distractor tag it carries). */
  relevantTags: string[];
  now: Date;
}

export interface MisconceptionUpdate {
  rows: MisconceptionRow[];
  opened: string[];
  resolved: string[];
}

export function applyMisconceptionEvidence(
  existing: readonly MisconceptionRow[],
  learnerId: string,
  evidence: MisconceptionEvidence,
): MisconceptionUpdate {
  const now = evidence.now.toISOString();
  const rows = existing.map((row) => ({ ...row }));
  const opened: string[] = [];
  const resolved: string[] = [];
  const hit = evidence.hitTag && evidence.hitTag !== 'computation' ? evidence.hitTag : null;

  for (const row of rows) {
    if (row.status !== 'open' || row.tag === hit) continue;
    if (!evidence.relevantTags.includes(row.tag)) continue;
    row.cleanStreak += 1;
    if (row.cleanStreak >= STUDENT_MODEL.misconceptionResolveStreak) {
      row.status = 'resolved';
      row.resolvedAt = now;
      resolved.push(row.tag);
    }
  }

  if (hit) {
    const row = rows.find((candidate) => candidate.tag === hit);
    if (!row) {
      rows.push({
        learnerId,
        tag: hit,
        status: 'open',
        firstSeenAt: now,
        resolvedAt: null,
        cleanStreak: 0,
      });
      opened.push(hit);
    } else if (row.status === 'resolved') {
      row.status = 'open';
      row.resolvedAt = null;
      row.cleanStreak = 0;
      opened.push(hit);
    } else {
      row.cleanStreak = 0;
    }
  }
  return { rows, opened, resolved };
}
