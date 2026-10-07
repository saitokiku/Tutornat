/**
 * Pure helpers behind the two dashboards. Everything here is a function of its
 * arguments so the wording rules that matter most can be tested without a DOM:
 * a skill is called mastery only when its status is `confirmed` (strategy law
 * 2, spec D17), the minutes banner says what is left and who can act on it,
 * and a deletion is only accepted when the parent typed the exact phrase.
 */
import type { AgeBand, GuestLevel } from '@/kaizen.config';
import type {
  Entitlement,
  InputMode,
  Learner,
  MasteryStatus,
  MisconceptionState,
  ParentReportSkill,
  PlannerItem,
  PlannerStatus,
  Role,
  SessionTopic,
  SkillMastery,
  SkillNode,
} from '@/lib/tutor/contracts';
import { isSubjectId } from '@/lib/tutor/graph/subjects';
import type { CreateSessionRequest, ProgressResponse } from '@/lib/tutor/wire';

import { formatDate, formatEstimate, formatMinutes, pluralize } from './format';

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

export interface ProgressRow {
  skill: SkillNode;
  status: MasteryStatus;
  /** 0 to 1. Zero for a skill with no checks yet. */
  estimate: number;
  nItems: number;
  nSessions: number;
  /** When the delayed unaided check falls due; null until the estimate is reached. */
  nextCheckAt: string | null;
  /** That check is due now (the API listed it in `dueChecks`). */
  dueNow: boolean;
}

/**
 * Joins the twelve skills to whatever mastery rows exist, in graph order, so
 * an untouched skill still gets a row rather than disappearing.
 */
export function buildProgressRows(
  skills: readonly SkillNode[],
  mastery: readonly SkillMastery[],
  dueChecks: ProgressResponse['dueChecks'] = [],
): ProgressRow[] {
  const bySkill = new Map(mastery.map((row) => [row.skillId, row]));
  const due = new Set(dueChecks.map((check) => check.skillId));
  return skills.map((skill) => {
    const row = bySkill.get(skill.id);
    return {
      skill,
      status: row?.status ?? 'not_started',
      estimate: row ? clamp01(row.estimate) : 0,
      nItems: row?.nItems ?? 0,
      nSessions: row?.nSessions ?? 0,
      nextCheckAt: row?.nextCheckAt ?? null,
      dueNow: due.has(skill.id),
    };
  });
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export interface ProgressTally {
  total: number;
  confirmed: number;
  /** At the estimate bar but not confirmed by a later unaided check. */
  estimated: number;
  inProgress: number;
  notStarted: number;
}

export function tallyProgress(rows: readonly ProgressRow[]): ProgressTally {
  const tally: ProgressTally = {
    total: rows.length,
    confirmed: 0,
    estimated: 0,
    inProgress: 0,
    notStarted: 0,
  };
  for (const row of rows) {
    if (row.status === 'confirmed') tally.confirmed += 1;
    else if (row.status === 'mastered') tally.estimated += 1;
    else if (row.status === 'in_progress') tally.inProgress += 1;
    else tally.notStarted += 1;
  }
  return tally;
}

/**
 * The one-line summary above the skill list. Only `confirmed` is allowed to
 * be called mastery; an estimate is always named an estimate.
 */
export function progressSentence(tally: ProgressTally): string {
  if (tally.total === 0) return 'The skill list is not loaded.';
  if (tally.confirmed === 0 && tally.estimated === 0 && tally.inProgress === 0) {
    return `No checks recorded yet across ${tally.total} skills.`;
  }
  const parts = [`${tally.confirmed} of ${tally.total} confirmed by an unaided check`];
  if (tally.estimated > 0) {
    parts.push(`${tally.estimated} at an estimate that is not confirmed yet`);
  }
  if (tally.inProgress > 0) parts.push(`${tally.inProgress} in progress`);
  return `${parts.join(', ')}.`;
}

/** True only for the status the product is allowed to call mastery. */
export function isConfirmedMastery(status: MasteryStatus): boolean {
  return status === 'confirmed';
}

/** How a due delayed check reads in a list. */
export function dueCheckLabel(dueAt: string, now: Date = new Date()): string {
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return 'Due now';
  const days = Math.floor((now.getTime() - due.getTime()) / 86_400_000);
  if (days >= 1) return `Due ${days === 1 ? 'since yesterday' : `for ${days} days`}`;
  return 'Due now';
}

export function openMisconceptions(
  misconceptions: readonly MisconceptionState[],
): MisconceptionState[] {
  return misconceptions.filter((entry) => entry.status === 'open');
}

/**
 * The skills that have been touched at all, and the ones that have not. The
 * dashboard leads with the first group: a list of twelve untouched rows is the
 * skill graph, not a progress report, and it tells a learner nothing.
 */
export function touchedRows(rows: readonly ProgressRow[]): ProgressRow[] {
  return rows.filter((row) => row.status !== 'not_started');
}

export function untouchedRows(rows: readonly ProgressRow[]): ProgressRow[] {
  return rows.filter((row) => row.status === 'not_started');
}

/**
 * What to show under "what you have learned": confirmed skills first, then the
 * ones at an estimate, strongest first. The caller renders names only — the
 * status still decides the wording, so `mastered` can never be shown as
 * mastery.
 */
export function recentlyLearned(rows: readonly ProgressRow[], limit = 3): ProgressRow[] {
  return rows
    .filter((row) => row.status === 'confirmed' || row.status === 'mastered')
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'confirmed' ? -1 : 1;
      return b.estimate - a.estimate;
    })
    .slice(0, limit);
}

/** The one delayed check to name on the dashboard, or null when none is due. */
export function nextDueCheck(rows: readonly ProgressRow[]): ProgressRow | null {
  return rows.find((row) => row.dueNow) ?? null;
}

/**
 * The learner's one-line answer to "am I getting better?". It leads with the
 * work done rather than with the size of the graph, and it keeps the wording
 * rule: only `confirmed` is a skill the tutor has checked without helping, and
 * an estimate is never called mastery.
 */
export function learnerProgressSentence(tally: ProgressTally): string {
  if (tally.total === 0) return 'The skill list is not loaded.';
  const touched = tally.confirmed + tally.estimated + tally.inProgress;
  if (touched === 0) return 'Nothing checked yet. Your first session sets the starting point.';
  const parts = [`${pluralize(touched, 'skill')} worked on so far`];
  if (tally.confirmed > 0) {
    parts.push(`${tally.confirmed} confirmed by a check with no help`);
  }
  if (tally.estimated > 0) parts.push(`${tally.estimated} waiting on that check`);
  return `${parts.join(', ')}.`;
}

/** Sessions and minutes in one clause, for either dashboard. */
export function sessionsSentence(sessions: number, minutes: number, when = 'in total'): string {
  if (sessions === 0) return 'No sessions yet.';
  return `${pluralize(sessions, 'session')}, ${formatMinutes(minutes)} ${when}.`;
}

// ---------------------------------------------------------------------------
// Starting a session
// ---------------------------------------------------------------------------

export type StartSource = 'coursework' | 'next_skill' | 'topic';

export interface StartSelection {
  source: StartSource | null;
  courseworkId: string | null;
  skillId: string | null;
  mode: InputMode | null;
  /** The subject and the learner's own words, for a `topic` start (D35). */
  topic?: SessionTopic | null;
}

export type StartCheck =
  | { ok: true; body: CreateSessionRequest }
  | { ok: false; field: 'source' | 'coursework' | 'topic' | 'mode'; error: string };

export const TOPIC_TEXT_MAX_LENGTH = 300;

/** The learner's words for a topic session: 1 to 300 characters after trimming. */
export function validateTopicText(value: string): string | null {
  const text = value.trim();
  if (!text) return 'Say what you want to work on.';
  if (text.length > TOPIC_TEXT_MAX_LENGTH) {
    return `Use at most ${TOPIC_TEXT_MAX_LENGTH} characters.`;
  }
  return null;
}

/** Validates the start form and builds the exact POST /api/tutor/session body. */
export function checkStartSelection(selection: StartSelection): StartCheck {
  if (!selection.source) {
    return { ok: false, field: 'source', error: 'Choose what to work on.' };
  }
  if (selection.source === 'coursework' && !selection.courseworkId) {
    return { ok: false, field: 'coursework', error: 'Choose one of your problems.' };
  }
  let topic: SessionTopic | null = null;
  if (selection.source === 'topic') {
    if (!selection.topic || !isSubjectId(selection.topic.subject)) {
      return { ok: false, field: 'topic', error: 'Choose a subject.' };
    }
    const textError = validateTopicText(selection.topic.text);
    if (textError) return { ok: false, field: 'topic', error: textError };
    topic = { subject: selection.topic.subject, text: selection.topic.text.trim() };
  }
  if (!selection.mode) {
    return { ok: false, field: 'mode', error: 'Choose voice or text.' };
  }
  if (selection.source === 'coursework') {
    return { ok: true, body: { mode: selection.mode, courseworkId: selection.courseworkId } };
  }
  if (topic) return { ok: true, body: { mode: selection.mode, topic } };
  return { ok: true, body: { mode: selection.mode, skillId: selection.skillId } };
}

/** Why the start button is unavailable, or null when a session can start. */
export function startBlockedReason(
  learner: Pick<Learner, 'status'> | null,
  entitlement: Pick<Entitlement, 'remainingMinutes' | 'status' | 'guest'> | null,
): string | null {
  if (!learner) return 'Choose a learner profile first.';
  if (learner.status === 'locked')
    return 'This profile is locked until the consent review is done.';
  if (learner.status === 'frozen')
    return 'This profile is frozen. The account holder can restore it.';
  if (!entitlement) return null;
  if (entitlement.guest) {
    return entitlement.remainingMinutes <= 0
      ? 'Today’s free minutes are used up. Come back tomorrow.'
      : null;
  }
  if (entitlement.status === 'canceled') return 'The subscription is canceled.';
  if (entitlement.remainingMinutes <= 0) return 'There are no minutes left this period.';
  return null;
}

export type UpgradePath = 'manage' | 'ask_parent' | 'none';

/**
 * Account holders manage the plan; a teen profile is told who can; a guest
 * has no plan and nobody to ask, so nothing is offered (D35).
 */
export function upgradePathFor(role: Role, guest = false): UpgradePath {
  if (guest) return 'none';
  return role === 'learner' ? 'ask_parent' : 'manage';
}

// ---------------------------------------------------------------------------
// Guest level
// ---------------------------------------------------------------------------

/**
 * The guest level a learner row was created for. The row stores a band and a
 * representative birth year (`representativeBirthYear` in kaizen.config), not
 * the level id, so the level is read back from the age that year implies in
 * the current year; a row created across a year boundary falls back to the
 * first level of the same band, which is the same prompts and session length.
 */
export function guestLevelFor(
  learner: Pick<Learner, 'band' | 'birthYear'>,
  levels: readonly GuestLevel[],
  now: Date = new Date(),
): GuestLevel | null {
  const age = now.getUTCFullYear() - learner.birthYear;
  const byAge = levels.find(
    (level) => level.band === learner.band && level.representativeAge === age,
  );
  if (byAge) return byAge;
  return levels.find((level) => level.band === learner.band) ?? null;
}

// ---------------------------------------------------------------------------
// The planner
// ---------------------------------------------------------------------------

export type PlannerGroupKey = 'overdue' | 'today' | 'week' | 'later' | 'done';

export interface PlannerGroup {
  key: PlannerGroupKey;
  label: string;
  items: PlannerItem[];
}

const PLANNER_GROUP_LABELS: Record<PlannerGroupKey, string> = {
  overdue: 'Overdue',
  today: 'Today',
  week: 'This week',
  later: 'Later',
  done: 'Done',
};

const DAY_MS = 86_400_000;

/** `YYYY-MM-DD` in the reader's local calendar; a due date is a day, not an instant. */
export function localIsoDate(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseIsoDay(value: string | null | undefined): number | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const time = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isNaN(time) ? null : Math.round(time / DAY_MS);
}

/** Whole days from `today` to `dueOn` (negative when overdue), or null without a valid date. */
export function daysUntil(dueOn: string | null, today: string): number | null {
  const due = parseIsoDay(dueOn);
  const now = parseIsoDay(today);
  if (due === null || now === null) return null;
  return due - now;
}

/**
 * Overdue, today, this week (the next six days), later (further out or
 * undated), and done, in that order. Empty groups are dropped, so the screen
 * never shows a heading with nothing under it. Open items sort by due date
 * with undated ones last; done items keep the server's order (newest first).
 */
export function groupPlannerItems(items: readonly PlannerItem[], today: string): PlannerGroup[] {
  const buckets: Record<PlannerGroupKey, PlannerItem[]> = {
    overdue: [],
    today: [],
    week: [],
    later: [],
    done: [],
  };
  for (const item of items) {
    if (item.status === 'done') {
      buckets.done.push(item);
      continue;
    }
    const days = daysUntil(item.dueOn, today);
    if (days === null) buckets.later.push(item);
    else if (days < 0) buckets.overdue.push(item);
    else if (days === 0) buckets.today.push(item);
    else if (days <= 6) buckets.week.push(item);
    else buckets.later.push(item);
  }
  const byDue = (a: PlannerItem, b: PlannerItem) => {
    if (a.dueOn === b.dueOn) return 0;
    if (a.dueOn === null) return 1;
    if (b.dueOn === null) return -1;
    return a.dueOn < b.dueOn ? -1 : 1;
  };
  const keys: PlannerGroupKey[] = ['overdue', 'today', 'week', 'later', 'done'];
  return keys
    .map((key) => ({
      key,
      label: PLANNER_GROUP_LABELS[key],
      items: key === 'done' ? buckets[key] : [...buckets[key]].sort(byDue),
    }))
    .filter((group) => group.items.length > 0);
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** How a due date reads next to an item, relative to `today`. */
export function plannerDueLabel(dueOn: string | null, today: string): string {
  const days = daysUntil(dueOn, today);
  if (days === null) return 'No due date';
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days === -1) return 'Due yesterday';
  if (days < 0) return `Due ${-days} days ago`;
  if (days <= 6) {
    const weekday = new Date(`${dueOn}T00:00:00.000Z`).getUTCDay();
    return `Due ${WEEKDAYS[weekday]}`;
  }
  return `Due ${formatDate(`${dueOn}T12:00:00.000Z`)}`;
}

/** The other status: an open item becomes done, a done item opens again. */
export function togglePlannerStatus(status: PlannerStatus): PlannerStatus {
  return status === 'done' ? 'todo' : 'done';
}

export const PLANNER_TITLE_MAX_LENGTH = 120;
export const PLANNER_NOTES_MAX_LENGTH = 500;

export function validatePlannerTitle(value: string): string | null {
  const title = value.trim();
  if (!title) return 'Give it a short title.';
  if (title.length > PLANNER_TITLE_MAX_LENGTH) {
    return `Use at most ${PLANNER_TITLE_MAX_LENGTH} characters.`;
  }
  return null;
}

export function validatePlannerNotes(value: string): string | null {
  if (value.trim().length > PLANNER_NOTES_MAX_LENGTH) {
    return `Use at most ${PLANNER_NOTES_MAX_LENGTH} characters.`;
  }
  return null;
}

/** A due date from `<input type="date">`: empty is allowed, anything else must be a real day. */
export function validatePlannerDueOn(value: string): string | null {
  if (!value.trim()) return null;
  return parseIsoDay(value.trim()) === null ? 'Enter a date, or leave it empty.' : null;
}

/** Planned length of a session for this band, in whole minutes. */
export function sessionMinutesFor(
  band: AgeBand | null,
  bands: Readonly<Record<AgeBand, { sessionMinutes: number }>>,
  remainingMinutes: number,
): number {
  const planned = band ? bands[band].sessionMinutes : bands.adult.sessionMinutes;
  return Math.max(0, Math.min(planned, Math.floor(remainingMinutes)));
}

// ---------------------------------------------------------------------------
// Parent report wording
// ---------------------------------------------------------------------------

/**
 * The §5.9 reading: "Fractions — starting 42%, now 78%". A skill with no
 * earlier estimate says so rather than inventing a starting point.
 */
export function reportSkillSentence(skill: ParentReportSkill): string {
  const now = formatEstimate(skill.currentEstimate);
  if (skill.status === 'not_started') return `${skill.name} — no checks yet`;
  if (skill.startingEstimate === null) return `${skill.name} — now ${now}, first week measured`;
  return `${skill.name} — starting ${formatEstimate(skill.startingEstimate)}, now ${now}`;
}

/**
 * The three lines a parent reads first. Plain language, names not ids, and no
 * percentage unless the parent asks for the detail: the question being
 * answered is "is my child learning?", not "what is in the database?".
 */
export interface LearningSummary {
  /** Sessions and minutes this week. */
  activity: string;
  /** What went well, by skill name; null when nothing has been checked yet. */
  progress: string | null;
  /** What the tutor works on next; null when nothing is queued. */
  next: string | null;
}

export function summarizeLearning(report: {
  sessions: number;
  minutes: number;
  skills: readonly ParentReportSkill[];
  nextSkill: { name: string } | null;
}): LearningSummary {
  const activity =
    report.sessions === 0
      ? 'No sessions this week.'
      : `${pluralize(report.sessions, 'session')} this week, ${formatMinutes(report.minutes)} in total.`;
  const confirmed = report.skills.filter((skill) => skill.status === 'confirmed');
  const moving = report.skills.filter(
    (skill) =>
      skill.status !== 'not_started' &&
      skill.startingEstimate !== null &&
      skill.currentEstimate > skill.startingEstimate,
  );
  const touched = report.skills.filter((skill) => skill.status !== 'not_started');
  let progress: string | null = null;
  if (confirmed.length > 0) {
    progress = `Checked without help: ${nameList(confirmed)}.`;
  } else if (moving.length > 0) {
    progress = `Getting better at ${nameList(moving)}.`;
  } else if (touched.length > 0) {
    progress = `Working on ${nameList(touched)}.`;
  }
  return { activity, progress, next: report.nextSkill?.name ?? null };
}

/** Up to three skill names in a readable list; the rest become "and 2 more". */
function nameList(skills: readonly ParentReportSkill[], limit = 3): string {
  const names = skills.slice(0, limit).map((skill) => skill.name);
  const rest = skills.length - names.length;
  const joined =
    names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
  return rest > 0 ? `${joined} and ${rest} more` : (joined ?? '');
}

/** Attention aggregates in a sentence. Never a judgement, just the numbers. */
export function attentionSentence(attention: { attendingPct: number; recoveries: number }): string {
  const pct = Math.round(Math.min(100, Math.max(0, attention.attendingPct)));
  const recoveries =
    attention.recoveries === 1 ? '1 check-in' : `${attention.recoveries} check-ins`;
  return `Looking at the screen ${pct}% of session time, with ${recoveries} from the tutor.`;
}

// ---------------------------------------------------------------------------
// Deletion and export
// ---------------------------------------------------------------------------

/** The phrase a parent types to confirm a deletion. No "are you sure" loop. */
export function deletionPhraseFor(target: { displayName: string } | null): string {
  return target ? `delete ${target.displayName}` : 'delete my account';
}

export function matchesDeletionPhrase(typed: string, expected: string): boolean {
  const normalize = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();
  const cleaned = normalize(typed);
  return cleaned.length > 0 && cleaned === normalize(expected);
}

/** File name for the JSON export, with no name or email in it. */
export function exportFileName(learnerId: string, exportedAt: string): string {
  const day = exportedAt.slice(0, 10);
  const safeDay = /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : 'export';
  return `natural-tutor-${learnerId}-${safeDay}.json`;
}
