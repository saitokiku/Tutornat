/**
 * The sitting clock for known minors (reference §5; California SB 243's
 * duties on a "continuing interaction": a break reminder every three hours).
 * Ported from Kaizen-AI's `sittingClock`.
 *
 * A 25-minute session cannot cross three hours on its own, but three
 * sessions in an evening can, so the sitting is reconstructed from the
 * learner's recent turn times across sessions: a gap longer than
 * SITTING_GAP_MS ends one sitting and the next turn opens another. The
 * reminder is keyed to the CROSSING of a three-hour boundary, not to
 * `elapsed >= 3h`, so it fires once per boundary rather than on every turn
 * for the rest of the evening; a reminder that repeats every ninety seconds
 * is one a learner learns to skip past.
 *
 * Pure: the session service supplies the times, the turn engine asks whether
 * this turn owes a reminder. Nothing here reads a clock or a table.
 */

/** Silence that ends a sitting. SB 243 does not define "continuing"; half an hour is what a parent would take it to mean. */
export const SITTING_GAP_MS = 30 * 60_000;

/** The statutory interval: every three hours, not once at three hours. */
export const BREAK_REMINDER_EVERY_MS = 3 * 60 * 60_000;

export interface Sitting {
  /** When this sitting began (epoch ms): the first of the chain of turns less than a gap apart. */
  startedAt: number;
  /** The most recent turn before now, or null when there was none in the window. */
  previousAt: number | null;
  /** True when nothing happened within the gap: the turn about to happen opens a new sitting. */
  fresh: boolean;
  elapsedMs: number;
  /** True when the turn about to happen is the one that crosses a three-hour boundary. */
  breakDue: boolean;
}

export function sittingClock(
  turnTimesMs: readonly number[],
  options: { now?: number; gapMs?: number; everyMs?: number } = {},
): Sitting {
  const now = options.now ?? Date.now();
  const gapMs = options.gapMs ?? SITTING_GAP_MS;
  const everyMs = options.everyMs ?? BREAK_REMINDER_EVERY_MS;
  const times = turnTimesMs
    .map(Number)
    // A null timestamp reads as 0, which would put the start of the sitting
    // in 1970 and make it six decades long; a future one is dropped for the
    // mirror-image reason.
    .filter((t) => Number.isFinite(t) && t > 0 && t <= now)
    .sort((a, b) => a - b);

  const previousAt = times.length > 0 ? times[times.length - 1]! : null;
  if (previousAt === null || now - previousAt > gapMs) {
    return { startedAt: now, previousAt, fresh: true, elapsedMs: 0, breakDue: false };
  }

  let startedAt = previousAt;
  for (let i = times.length - 1; i > 0; i -= 1) {
    if (times[i]! - times[i - 1]! > gapMs) break;
    startedAt = times[i - 1]!;
  }

  const elapsedMs = now - startedAt;
  const priorElapsedMs = previousAt - startedAt;
  return {
    startedAt,
    previousAt,
    fresh: false,
    elapsedMs,
    breakDue: Math.floor(elapsedMs / everyMs) > Math.floor(priorElapsedMs / everyMs),
  };
}

/** What a session keeps about the sitting it belongs to (`sessions.state.sitting`). */
export interface SittingState {
  /** ISO time the sitting began; earlier than the session when it continues one. */
  startedAt: string;
  /** How many three-hour boundaries have already been announced in this sitting. */
  remindersGiven: number;
}

/** The sitting state a new session starts with, from the clock at creation. */
export function sittingStateFrom(
  sitting: Sitting,
  everyMs = BREAK_REMINDER_EVERY_MS,
): SittingState {
  const priorElapsed = sitting.previousAt === null ? 0 : sitting.previousAt - sitting.startedAt;
  return {
    startedAt: new Date(sitting.startedAt).toISOString(),
    remindersGiven: Math.max(0, Math.floor(priorElapsed / everyMs)),
  };
}

/**
 * Whether the turn happening at `nowMs` owes a break reminder: true exactly
 * once per three-hour boundary. The caller stores `boundary` back as
 * `remindersGiven` when it gives the reminder.
 */
export function breakReminderDue(
  sitting: SittingState,
  nowMs: number,
  everyMs = BREAK_REMINDER_EVERY_MS,
): { due: boolean; boundary: number } {
  const started = new Date(sitting.startedAt).getTime();
  if (!Number.isFinite(started) || nowMs <= started) return { due: false, boundary: 0 };
  const boundary = Math.floor((nowMs - started) / everyMs);
  return { due: boundary > sitting.remindersGiven, boundary };
}
