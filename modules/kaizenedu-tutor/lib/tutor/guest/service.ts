/**
 * Guest mode (D35): the free tutor with no account.
 *
 * A guest is an ordinary account row plus one learner row, created behind
 * the same HttpOnly session cookie every account uses, so every product route
 * keeps deriving identity server-side (invariant a) and every ceiling keeps
 * binding (invariant d). What makes it a guest is `accounts.guest = true`:
 * nothing about a person is collected — no name, no email, no birth year, no
 * password. The email column is `NOT NULL UNIQUE`, so the row carries an
 * unroutable placeholder under `.invalid` (RFC 2606) that no sender will ever
 * mail (the weekly report and the safety notice both skip guests), and the
 * password hash is a sentinel `verifyPassword` can never match, so a guest row
 * can never be signed into.
 *
 * The grade level the visitor picks is a content setting, not a date of
 * birth: it selects the band whose prompts, session length and safety rules
 * apply. The learners row still needs a birth year, so a representative one is
 * derived from the level and stored as what it is. Guest learners are always
 * `active`; the account model's under-13 lock is about a parent's profile of a
 * named child and does not apply to an anonymous row (docs/GUEST-MODE.md).
 *
 * "Start over" deletes every row now through the same sanctioned purge the
 * deletion job uses, and the weekly cron deletes any guest idle for
 * `GUEST.retentionDays`.
 */
import {
  bandForGuestLevel,
  GUEST,
  guestLevel,
  representativeBirthYear,
  type GuestLevelId,
} from '@/kaizen.config';
import { kindForBand, purgeAccount, toLearner, type LearnerRow } from '@/lib/tutor/accounts';
import { createAuthSession, newId } from '@/lib/tutor/auth/session';
import type { Learner, Principal } from '@/lib/tutor/contracts';
import type { Queryable, TutorDb } from '@/lib/tutor/db';

/** The address a guest row carries; nothing is ever sent to it. */
export const GUEST_EMAIL_DOMAIN = 'guest.invalid';
/** Not a scrypt string, so `verifyPassword` refuses it before hashing anything. */
export const GUEST_PASSWORD_SENTINEL = 'guest';
const DAY_MS = 86_400_000;

const LEARNER_COLUMNS =
  'id, account_id, display_name, birth_year, age_band, status, kind, login_name, created_at';

export function guestEmailFor(accountId: string): string {
  return `${accountId}@${GUEST_EMAIL_DOMAIN}`;
}

export interface CreatedGuest {
  principal: Principal;
  learner: Learner;
  token: string;
  expiresAt: Date;
}

/** Creates the account, the learner and the auth session in one transaction. */
export async function createGuest(
  db: TutorDb,
  level: GuestLevelId,
  now: Date = new Date(),
): Promise<CreatedGuest> {
  const band = bandForGuestLevel(level);
  return db.withTransaction(async (tx) => {
    const accountId = newId('acc');
    await tx.query(
      `INSERT INTO accounts (id, email, display_name, password_hash, guest, created_at)
       VALUES ($1, $2, $3, $4, true, $5)`,
      [accountId, guestEmailFor(accountId), 'Guest', GUEST_PASSWORD_SENTINEL, now.toISOString()],
    );
    const { rows } = await tx.query<LearnerRow>(
      `INSERT INTO learners (id, account_id, display_name, birth_year, age_band, status, kind, level, created_at)
       VALUES ($1, $2, $3, $4, $5, 'active', $6, $7, $8)
       RETURNING ${LEARNER_COLUMNS}`,
      [
        newId('lrn'),
        accountId,
        GUEST.displayName,
        representativeBirthYear(level, now),
        band,
        kindForBand(band),
        level,
        now.toISOString(),
      ],
    );
    const learner = toLearner(rows[0]!);
    const session = await createAuthSession(tx, {
      accountId,
      learnerId: learner.id,
      role: 'learner',
    });
    return {
      principal: {
        accountId,
        learnerId: learner.id,
        role: 'learner',
        band,
        authSessionId: session.sessionId,
        staff: false,
        guest: true,
      },
      learner,
      token: session.token,
      expiresAt: session.expiresAt,
    };
  });
}

/**
 * Moves an existing guest to another level. The band changes with it, so the
 * next session gets the other band's length and prompts; sessions already
 * written keep the band they ran under (it is stored in their state).
 */
export async function relevelGuest(
  db: Queryable,
  principal: Principal,
  level: GuestLevelId,
  now: Date = new Date(),
): Promise<Learner | null> {
  if (!principal.guest || !principal.learnerId) return null;
  const { rows } = await db.query<LearnerRow>(
    `UPDATE learners SET age_band = $3, birth_year = $4, level = $5
     WHERE id = $1 AND account_id = $2
     RETURNING ${LEARNER_COLUMNS}`,
    [
      principal.learnerId,
      principal.accountId,
      bandForGuestLevel(level),
      representativeBirthYear(level, now),
      level,
    ],
  );
  return rows[0] ? toLearner(rows[0]) : null;
}

/** The level a guest learner chose; null for an account learner or an unknown row. */
export async function guestLevelOf(
  db: Queryable,
  accountId: string,
  learnerId: string,
): Promise<GuestLevelId | null> {
  const { rows } = await db.query<{ level: string | null }>(
    `SELECT level FROM learners WHERE id = $1 AND account_id = $2`,
    [learnerId, accountId],
  );
  const level = rows[0]?.level;
  return level && isKnownLevel(level) ? level : null;
}

function isKnownLevel(value: string): value is GuestLevelId {
  try {
    return Boolean(guestLevel(value as GuestLevelId));
  } catch {
    return false;
  }
}

/**
 * "Start over": deletes every row behind a guest account now. Refuses (false)
 * for an account that is not a guest, so the route can never be turned into
 * a way to delete a parent's account without the deletion window.
 */
export async function forgetGuest(db: TutorDb, accountId: string): Promise<boolean> {
  return db.withTransaction(async (tx) => {
    const { rows } = await tx.query<{ guest: boolean }>(
      `SELECT guest FROM accounts WHERE id = $1`,
      [accountId],
    );
    if (!rows[0]?.guest) return false;
    await purgeAccount(tx, accountId);
    return true;
  });
}

export interface GuestPurgeResult {
  /** Guests deleted in this run. */
  deleted: number;
  /** Guests still idle past the cutoff after the batch limit; the next run takes them. */
  remaining: number;
}

/**
 * Deletes guests that have started no session in `GUEST.retentionDays` (and
 * were created before the cutoff, so a fresh guest with no session yet is
 * kept). One transaction per account so a failure leaves each guest either
 * untouched or gone. Called from the weekly cron.
 */
export async function purgeIdleGuests(
  db: TutorDb,
  now: Date = new Date(),
  limit = 200,
): Promise<GuestPurgeResult> {
  const cutoff = new Date(now.getTime() - GUEST.retentionDays * DAY_MS).toISOString();
  const idle = `FROM accounts a
     WHERE a.guest = true AND a.created_at < $1
       AND NOT EXISTS (SELECT 1 FROM sessions s WHERE s.account_id = a.id AND s.started_at >= $1)`;
  const { rows } = await db.query<{ id: string }>(
    `SELECT a.id ${idle} ORDER BY a.created_at LIMIT $2`,
    [cutoff, limit],
  );
  let deleted = 0;
  for (const row of rows) {
    await db.withTransaction(async (tx) => {
      await purgeAccount(tx, row.id);
    });
    deleted += 1;
  }
  const left = await db.query<{ n: number | string }>(`SELECT count(*)::int AS n ${idle}`, [
    cutoff,
  ]);
  return { deleted, remaining: Number(left.rows[0]?.n ?? 0) };
}
