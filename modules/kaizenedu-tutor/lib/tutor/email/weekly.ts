/**
 * The weekly report run (spec R18; reference §5; ported from Kaizen-AI's
 * `parentSummary.js`). Fires from the cron as often as the platform likes and
 * sends each parent-owned learner's report once per week, in the first 48
 * hours after the week ends, for the week that ended (Monday to Monday, UTC).
 *
 * Deliberate, all of it: the numbers come from the tables the loop writes,
 * never from a client or a model; one `email_log` row per (learner, week) is
 * claimed before the send so two ticks cannot both send; a week in which
 * nothing happened produces no mail, only a row that says `empty`, because an
 * empty report teaches a parent to ignore the real ones; the opt-out is read
 * from `parent_settings` at send time and the mail is promotional, so the
 * wrapper's suppression holds too.
 */
import { randomBytes } from 'node:crypto';

import { createLogger } from '@/lib/logger';
import { getParentSettings, updateParentSettings } from '@/lib/tutor/accounts/settings';
import { hashToken, newId } from '@/lib/tutor/auth/session';
import { misconceptionTitle } from '@/lib/tutor/client/misconceptions';
import { PRODUCT_ROUTES, TUTOR_API } from '@/lib/tutor/contracts';
import type { Queryable } from '@/lib/tutor/db';
import { weeklyLead, type LeadChange, type LeadSkill } from '@/lib/tutor/report/lead';
import { weekStartUtc } from '@/lib/tutor/report/parent-report';
import { masteryStatus, parseSessionSummary } from '@/lib/tutor/report/rows';

import { emailConfigStatus, type EnvLike } from './config';
import { sendEmail, type SendOptions } from './send';
import { weeklyReportEmail, type WeeklyNote } from './templates/weekly-report';

const log = createLogger('tutor-weekly-email');

export const WEEKLY_EMAIL_KIND = 'weekly_report';
/** The report goes out inside this long after the week ends; a later tick sends nothing. */
export const WEEKLY_SEND_WINDOW_MS = 48 * 60 * 60_000;
export const WEEKLY_BATCH_LIMIT = 200;
export const WEEK_MS = 7 * 24 * 60 * 60_000;
/** The opt-out link's token: long-lived and reusable, since flipping the same switch twice is harmless. */
export const OPT_OUT_PURPOSE = 'email_optout';
export const OPT_OUT_TTL_MS = 400 * 24 * 60 * 60_000;

export type WeeklyOutcome = 'sent' | 'empty' | 'suppressed' | 'failed' | 'skipped';

export const CRON_SECRET_ENV = 'CRON_SECRET';

export interface WeeklyEmailStatus {
  /** True when the report can go out: email configured and the cron route has its secret. */
  configured: boolean;
  missing: string[];
}

export function weeklyEmailStatus(env: EnvLike = process.env): WeeklyEmailStatus {
  const email = emailConfigStatus(env);
  const missing = [...email.missing];
  if (!env[CRON_SECRET_ENV]?.trim()) missing.push(CRON_SECRET_ENV);
  return { configured: missing.length === 0, missing };
}

export interface WeeklyRunResult {
  /** The Monday the reported week began, `YYYY-MM-DD`. */
  period: string;
  /** False when `now` is more than 48 hours past the end of the week: nothing is sent. */
  inWindow: boolean;
  /** False when this deployment cannot send email: nothing is sent and nothing is logged. */
  configured: boolean;
  considered: number;
  sent: number;
  empty: number;
  suppressed: number;
  failed: number;
  /** Claimed by another tick between the listing and the claim. */
  skipped: number;
}

export interface WeeklyRunOptions {
  now?: Date;
  /** The public origin for the report and opt-out links. */
  baseUrl: string;
  /** Transport overrides for tests. */
  send?: SendOptions;
  limit?: number;
}

/** The week reported on at `now`: the Monday-to-Monday week that ended most recently. */
export function weeklyPeriod(now: Date): {
  from: Date;
  to: Date;
  period: string;
  inWindow: boolean;
} {
  const to = weekStartUtc(now);
  const from = new Date(to.getTime() - WEEK_MS);
  return {
    from,
    to,
    period: from.toISOString().slice(0, 10),
    inWindow: now.getTime() - to.getTime() <= WEEKLY_SEND_WINDOW_MS,
  };
}

/** "31 August": the Monday the week began, as a person says it. */
export function weekLabel(from: Date): string {
  return from.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' });
}

interface CandidateRow extends Record<string, unknown> {
  learner_id: string;
  account_id: string;
  display_name: string;
  email: string;
}

interface WeekRow extends Record<string, unknown> {
  sessions: number | string;
  minutes: number | string;
}

interface MasteryNameRow extends Record<string, unknown> {
  skill_id: string;
  name: string;
  status: string;
}

interface ChangeRow extends Record<string, unknown> {
  payload: unknown;
  ts: string | Date;
}

interface ResolvedRow extends Record<string, unknown> {
  tag: string;
}

interface NoteRow extends Record<string, unknown> {
  started_at: string | Date;
  summary: unknown;
  thumbs: string | null;
}

function iso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

/** Mints the opt-out link for one account: a fresh token per email, stored as its hash. */
async function optOutUrl(
  db: Queryable,
  accountId: string,
  email: string,
  baseUrl: string,
  now: Date,
): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  await db.query(
    `INSERT INTO auth_tokens (id, account_id, email, purpose, token_hash, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      newId('tok'),
      accountId,
      email,
      OPT_OUT_PURPOSE,
      hashToken(token),
      new Date(now.getTime() + OPT_OUT_TTL_MS),
    ],
  );
  return `${baseUrl}${TUTOR_API.unsubscribe}?t=${encodeURIComponent(token)}`;
}

async function sendOne(
  db: Queryable,
  row: CandidateRow,
  window: { from: Date; to: Date; period: string },
  options: WeeklyRunOptions,
  now: Date,
): Promise<WeeklyOutcome> {
  const logId = newId('eml');
  const claimed = await db.query<{ id: string }>(
    `INSERT INTO email_log (id, account_id, learner_id, kind, period, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')
     ON CONFLICT (account_id, learner_id, kind, period) DO NOTHING
     RETURNING id`,
    [logId, row.account_id, row.learner_id, WEEKLY_EMAIL_KIND, window.period],
  );
  if (!claimed.rows[0]) return 'skipped';
  const settle = (status: WeeklyOutcome, sentAt: Date | null = null) =>
    db.query(`UPDATE email_log SET status = $2, sent_at = $3 WHERE id = $1`, [
      logId,
      status,
      sentAt,
    ]);

  const [week, mastery, changes, resolved, notes] = await Promise.all([
    db.query<WeekRow>(
      `SELECT count(*)::int AS sessions, COALESCE(sum(minutes), 0)::int AS minutes
       FROM sessions WHERE account_id = $1 AND learner_id = $2 AND started_at >= $3 AND started_at < $4`,
      [row.account_id, row.learner_id, window.from, window.to],
    ),
    db.query<MasteryNameRow>(
      `SELECT m.skill_id, COALESCE(s.name, m.skill_id) AS name, m.status
       FROM skill_mastery m LEFT JOIN skills s ON s.id = m.skill_id
       WHERE m.account_id = $1 AND m.learner_id = $2`,
      [row.account_id, row.learner_id],
    ),
    db.query<ChangeRow>(
      `SELECT payload, ts FROM evidence_events
       WHERE account_id = $1 AND learner_id = $2 AND type = 'mastery_change' AND ts >= $3 AND ts < $4`,
      [row.account_id, row.learner_id, window.from, window.to],
    ),
    db.query<ResolvedRow>(
      `SELECT tag FROM misconceptions
       WHERE account_id = $1 AND learner_id = $2 AND status = 'resolved'
         AND resolved_at >= $3 AND resolved_at < $4
       ORDER BY resolved_at, tag`,
      [row.account_id, row.learner_id, window.from, window.to],
    ),
    db.query<NoteRow>(
      `SELECT started_at, summary, thumbs FROM sessions
       WHERE account_id = $1 AND learner_id = $2 AND summary IS NOT NULL
         AND started_at >= $3 AND started_at < $4
       ORDER BY started_at ASC LIMIT 10`,
      [row.account_id, row.learner_id, window.from, window.to],
    ),
  ]);

  const skills: LeadSkill[] = mastery.rows.map((skill) => ({
    skillId: skill.skill_id,
    name: skill.name,
    status: masteryStatus(skill.status),
  }));
  const leadChanges: LeadChange[] = changes.rows.flatMap((change) => {
    const payload = typeof change.payload === 'string' ? safeJson(change.payload) : change.payload;
    if (!payload || typeof payload !== 'object') return [];
    const { skillId, to } = payload as { skillId?: unknown; to?: unknown };
    if (typeof skillId !== 'string' || typeof to !== 'string') return [];
    return [{ skillId, to, at: iso(change.ts) }];
  });
  const lead = weeklyLead({
    skills,
    changes: leadChanges,
    windowStart: window.from,
    windowEnd: window.to,
  });
  const sessions = Number(week.rows[0]?.sessions ?? 0);
  const minutes = Number(week.rows[0]?.minutes ?? 0);

  // Nothing happened: no session, nothing confirmed, nothing cleared up.
  if (sessions === 0 && lead.moved.length === 0 && resolved.rows.length === 0) {
    await settle('empty');
    return 'empty';
  }
  const settings = await getParentSettings(db, row.account_id);
  if (!settings.weeklyEmail) {
    await settle('suppressed');
    return 'suppressed';
  }

  const weeklyNotes: WeeklyNote[] = notes.rows.flatMap((note) => {
    const text = parseSessionSummary(note.summary)?.tutorNote.trim();
    if (!text) return [];
    return [
      {
        date: iso(note.started_at),
        note: text,
        thumbs: note.thumbs === 'up' || note.thumbs === 'down' ? note.thumbs : null,
      },
    ];
  });
  const unsubscribeUrl = await optOutUrl(db, row.account_id, row.email, options.baseUrl, now);
  const document = weeklyReportEmail({
    learnerName: row.display_name,
    weekLabel: weekLabel(window.from),
    lead,
    sessions,
    minutes,
    resolved: resolved.rows.map((tag) => misconceptionTitle(tag.tag)),
    notes: weeklyNotes,
    reportUrl: `${options.baseUrl}${PRODUCT_ROUTES.parent}`,
    unsubscribeUrl,
  });
  const outcome = await sendEmail(
    { ...document, to: row.email, kind: 'promotional', unsubscribeUrl },
    options.send,
  );
  if (outcome.sent) {
    await settle('sent', now);
    return 'sent';
  }
  await settle(outcome.reason === 'suppressed' ? 'suppressed' : 'failed');
  return outcome.reason === 'suppressed' ? 'suppressed' : 'failed';
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function sendWeeklyEmails(
  db: Queryable,
  options: WeeklyRunOptions,
): Promise<WeeklyRunResult> {
  const now = options.now ?? new Date();
  const { from, to, period, inWindow } = weeklyPeriod(now);
  const result: WeeklyRunResult = {
    period,
    inWindow,
    configured: emailConfigStatus(options.send?.env ?? process.env).configured,
    considered: 0,
    sent: 0,
    empty: 0,
    suppressed: 0,
    failed: 0,
    skipped: 0,
  };
  // Not configured: no rows are written, so the week is still owed once mail works.
  if (!inWindow || !result.configured) return result;

  const candidates = await db.query<CandidateRow>(
    `SELECT l.id AS learner_id, l.account_id, l.display_name, a.email
     FROM learners l JOIN accounts a ON a.id = l.account_id
     WHERE l.status = 'active' AND l.kind <> 'self' AND a.guest = false
       AND NOT EXISTS (
         SELECT 1 FROM email_log e
         WHERE e.account_id = l.account_id AND e.learner_id = l.id AND e.kind = $1 AND e.period = $2
       )
     ORDER BY l.created_at, l.id LIMIT $3`,
    [WEEKLY_EMAIL_KIND, period, options.limit ?? WEEKLY_BATCH_LIMIT],
  );
  for (const row of candidates.rows) {
    result.considered += 1;
    try {
      const outcome = await sendOne(db, row, { from, to, period }, options, now);
      result[outcome] += 1;
    } catch (error) {
      result.failed += 1;
      log.error(
        `weekly failed account=${row.account_id} learner=${row.learner_id} period=${period}: ${
          error instanceof Error ? error.name : 'error'
        }`,
      );
    }
  }
  log.info(
    `weekly period=${period} considered=${result.considered} sent=${result.sent} empty=${result.empty} suppressed=${result.suppressed} failed=${result.failed} skipped=${result.skipped}`,
  );
  return result;
}

/**
 * Turns the weekly report off for the account behind an opt-out token. The
 * token is not consumed: a second click on the same link is the same wish.
 * Returns false for an unknown or expired token.
 */
export async function optOutByToken(
  db: Queryable,
  token: string,
  now = new Date(),
): Promise<boolean> {
  if (!token || token.length > 200) return false;
  const { rows } = await db.query<{ account_id: string | null }>(
    `SELECT account_id FROM auth_tokens
     WHERE token_hash = $1 AND purpose = $2 AND expires_at > $3`,
    [hashToken(token), OPT_OUT_PURPOSE, now],
  );
  const accountId = rows[0]?.account_id;
  if (!accountId) return false;
  await updateParentSettings(db, accountId, { weeklyEmail: false });
  log.info(`weekly report off account=${accountId}`);
  return true;
}
