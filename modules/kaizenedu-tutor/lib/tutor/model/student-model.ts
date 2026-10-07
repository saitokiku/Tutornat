/**
 * Student model v0 (spec §5.7) plus the confirmed tier (strategy D17). Pure.
 *
 * estimate: exponential moving average of correctness on check items,
 * alpha = STUDENT_MODEL.emaAlpha, from a 0.5 prior ("unknown") for a skill
 * with no evidence. With alpha 0.3 four straight correct items lift the prior
 * to 0.88 and one miss among four leaves it below 0.8, which matches the
 * "≥ 4 items" threshold in the spec.
 *
 * status: not_started (0 items) → in_progress → mastered (estimate ≥ 0.8,
 * ≥ 4 items across ≥ 2 sessions; sets next_check_at = now + 24 h) →
 * confirmed (an unassisted correct check at or after next_check_at). A failed
 * delayed check, or an estimate that drops below the threshold, returns the
 * skill to in_progress. Assisted work can never confirm (law 1).
 */
import { STUDENT_MODEL } from '@/kaizen.config';
import type { MasteryStatus, SkillMastery } from '@/lib/tutor/contracts';

export const PRIOR_ESTIMATE = 0.5;
export const DELAYED_CHECK_DELAY_MS = 24 * 60 * 60 * 1000;

export interface MasteryRow extends SkillMastery {
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
  /** True when this check was the delayed unassisted check the skill was waiting for. */
  delayed: boolean;
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

export function isDelayedCheckDue(row: MasteryRow, now: Date): boolean {
  return (
    row.status === 'mastered' &&
    row.nextCheckAt !== null &&
    new Date(row.nextCheckAt).getTime() <= now.getTime()
  );
}

export function applyCheck(
  previous: MasteryRow | null,
  learnerId: string,
  skillId: string,
  obs: CheckObservation,
): MasteryUpdate {
  const prev = previous ?? emptyMastery(learnerId, skillId);
  const delayed = isDelayedCheckDue(prev, obs.now);
  const sessionIds = prev.sessionIds.includes(obs.sessionId)
    ? prev.sessionIds
    : [...prev.sessionIds, obs.sessionId];
  const estimate = ema(prev.nItems === 0 ? PRIOR_ESTIMATE : prev.estimate, obs.correct ? 1 : 0);
  const nItems = prev.nItems + 1;
  const nSessions = sessionIds.length;
  const candidate = { estimate, nItems, nSessions };

  let status: MasteryStatus;
  let nextCheckAt: string | null = prev.nextCheckAt;
  if (prev.status === 'confirmed') {
    status = estimate >= STUDENT_MODEL.masteredEstimate ? 'confirmed' : 'in_progress';
    if (status === 'in_progress') nextCheckAt = null;
  } else if (delayed) {
    if (obs.correct && !obs.assisted) {
      status = 'confirmed';
      nextCheckAt = null;
    } else if (!obs.correct) {
      status = 'in_progress';
      nextCheckAt = null;
    } else {
      // Assisted and correct: the delayed unassisted check is still owed.
      status = 'mastered';
    }
  } else if (meetsMastered(candidate)) {
    status = 'mastered';
    if (prev.status !== 'mastered' || !prev.nextCheckAt) {
      nextCheckAt = new Date(obs.now.getTime() + DELAYED_CHECK_DELAY_MS).toISOString();
    }
  } else {
    status = 'in_progress';
    nextCheckAt = null;
  }

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
  return { next, from: prev.status, statusChanged: status !== prev.status, delayed };
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
