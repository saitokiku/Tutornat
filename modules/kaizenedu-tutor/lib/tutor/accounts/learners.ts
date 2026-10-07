/**
 * Learner profiles (spec §8.5 `learners`, R5, D4, D5, D11). A profile belongs
 * to exactly one account and every query here filters on `account_id`
 * (invariant a). Birth year becomes an age band through `ageBandForBirthYear`;
 * the band decides the kind: adults are `self`, 13–17 are `teen` with their own
 * login, younger bands are `child` and start `locked` while the under-13 gate
 * is shut (R5: creatable, locked, no child data beyond name and birth year).
 */
import { ageBandForBirthYear, PLAN, STAFF, type AgeBand } from '@/kaizen.config';
import { hashPassword, PASSWORD_MIN_LENGTH } from '@/lib/tutor/auth/password';
import { newId } from '@/lib/tutor/auth/session';
import type { Learner, LearnerKind, LearnerStatus } from '@/lib/tutor/contracts';
import type { Queryable } from '@/lib/tutor/db';

import { AccountsError, notFound } from './errors';
import { isUniqueViolation, toIso, verifyStoredPassword } from './rows';

export interface LearnerRow extends Record<string, unknown> {
  id: string;
  account_id: string;
  display_name: string;
  birth_year: number;
  age_band: AgeBand;
  status: LearnerStatus;
  kind: LearnerKind;
  login_name: string | null;
  created_at: string | Date;
}

/** The public columns; `login_hash` is read only by `verifyTeenCredentials`. */
const LEARNER_COLUMNS =
  'id, account_id, display_name, birth_year, age_band, status, kind, login_name, created_at';

export function toLearner(row: LearnerRow): Learner {
  return {
    id: row.id,
    accountId: row.account_id,
    displayName: row.display_name,
    birthYear: Number(row.birth_year),
    band: row.age_band,
    status: row.status,
    kind: row.kind,
    loginName: row.login_name,
    createdAt: toIso(row.created_at),
  };
}

export const LOGIN_NAME_PATTERN = /^[a-z0-9_.]{3,24}$/;
export const DISPLAY_NAME_MAX = 60;

export function normalizeLoginName(raw: string): string {
  return raw.trim().toLowerCase();
}

export function kindForBand(band: AgeBand): LearnerKind {
  if (band === 'adult') return 'self';
  if (band === '13-17') return 'teen';
  return 'child';
}

function validDisplayName(raw: string): string {
  const name = raw.trim();
  if (!name || name.length > DISPLAY_NAME_MAX) {
    throw new AccountsError(
      'INVALID_REQUEST',
      400,
      `Display name must be 1 to ${DISPLAY_NAME_MAX} characters.`,
    );
  }
  return name;
}

export function validLoginName(raw: string): string {
  const loginName = normalizeLoginName(raw);
  if (!LOGIN_NAME_PATTERN.test(loginName)) {
    throw new AccountsError(
      'INVALID_REQUEST',
      400,
      'Login names are 3 to 24 characters: lowercase letters, digits, underscore, or dot.',
    );
  }
  return loginName;
}

function validPassword(raw: string): string {
  if (raw.length < PASSWORD_MIN_LENGTH) {
    throw new AccountsError(
      'INVALID_REQUEST',
      400,
      `Passwords must be at least ${PASSWORD_MIN_LENGTH} characters.`,
    );
  }
  return raw;
}

function loginNameTaken(): AccountsError {
  return new AccountsError('LOGIN_NAME_TAKEN', 409, 'That login name is taken. Try another.');
}

export async function listLearners(db: Queryable, accountId: string): Promise<Learner[]> {
  const { rows } = await db.query<LearnerRow>(
    `SELECT ${LEARNER_COLUMNS} FROM learners WHERE account_id = $1 ORDER BY created_at, id`,
    [accountId],
  );
  return rows.map(toLearner);
}

export async function getLearnerRow(
  db: Queryable,
  accountId: string,
  learnerId: string,
): Promise<LearnerRow | null> {
  const { rows } = await db.query<LearnerRow>(
    `SELECT ${LEARNER_COLUMNS} FROM learners WHERE id = $1 AND account_id = $2`,
    [learnerId, accountId],
  );
  return rows[0] ?? null;
}

export async function getLearner(
  db: Queryable,
  accountId: string,
  learnerId: string,
): Promise<Learner | null> {
  const row = await getLearnerRow(db, accountId, learnerId);
  return row ? toLearner(row) : null;
}

/** Throws 404 when the learner is not this account's (never reveals other accounts' rows). */
export async function requireLearner(
  db: Queryable,
  accountId: string,
  learnerId: string,
): Promise<LearnerRow> {
  const row = await getLearnerRow(db, accountId, learnerId);
  if (!row) throw notFound('Learner not found');
  return row;
}

/** Profiles that occupy a plan slot: everything not frozen. */
export async function countProfiles(db: Queryable, accountId: string): Promise<number> {
  const { rows } = await db.query<{ n: number | string }>(
    `SELECT count(*)::int AS n FROM learners WHERE account_id = $1 AND status <> 'frozen'`,
    [accountId],
  );
  return Number(rows[0]?.n ?? 0);
}

export async function isLoginNameTaken(
  db: Queryable,
  loginName: string,
  exceptLearnerId?: string,
): Promise<boolean> {
  const { rows } = await db.query<{ id: string }>(
    `SELECT id FROM learners WHERE login_name = $1 AND ($2::text IS NULL OR id <> $2)`,
    [loginName, exceptLearnerId ?? null],
  );
  return rows.length > 0;
}

export interface CreateLearnerInput {
  displayName: string;
  birthYear: number;
  loginName?: string;
  password?: string;
  /**
   * Server-only: a login password already hashed, from a stored invitation
   * (the teen chose it before the parent's account existed). Never accepted
   * from a request; the parent route's schema has no such field.
   */
  loginHash?: string;
}

export interface CreateLearnerOptions {
  /** `under13_gate` from app_settings; when shut, child profiles are created locked. */
  under13Open: boolean;
  now?: Date;
  /**
   * Staff accounts get more profiles than the plan sells, so every age band
   * can be exercised side by side without buying four subscriptions. Still a
   * number: an account cannot create profiles without end.
   */
  staff?: boolean;
}

export async function createLearner(
  db: Queryable,
  accountId: string,
  input: CreateLearnerInput,
  options: CreateLearnerOptions,
): Promise<Learner> {
  const displayName = validDisplayName(input.displayName);
  const band = ageBandForBirthYear(input.birthYear, options.now);
  if (!band) {
    throw new AccountsError('INVALID_REQUEST', 400, 'Learners must be at least 4 years old.');
  }
  const kind = kindForBand(band);
  const profileLimit = options.staff ? STAFF.learnerProfiles : PLAN.learnerProfiles;
  if ((await countProfiles(db, accountId)) >= profileLimit) {
    throw new AccountsError(
      'PROFILE_LIMIT',
      409,
      `This plan covers up to ${profileLimit} learner profiles.`,
    );
  }
  let loginName: string | null = null;
  let loginHash: string | null = null;
  if (kind === 'teen') {
    if (!input.loginName || (!input.password && !input.loginHash)) {
      throw new AccountsError(
        'MISSING_REQUIRED_FIELD',
        400,
        'Teen profiles need a login name and a password for their own sign-in.',
      );
    }
    loginName = validLoginName(input.loginName);
    if (await isLoginNameTaken(db, loginName)) throw loginNameTaken();
    loginHash = input.loginHash ?? (await hashPassword(validPassword(input.password ?? '')));
  }
  const status: LearnerStatus = kind === 'child' && !options.under13Open ? 'locked' : 'active';
  try {
    const { rows } = await db.query<LearnerRow>(
      `INSERT INTO learners (id, account_id, display_name, birth_year, age_band, status, kind, login_name, login_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING ${LEARNER_COLUMNS}`,
      [
        newId('lrn'),
        accountId,
        displayName,
        input.birthYear,
        band,
        status,
        kind,
        loginName,
        loginHash,
      ],
    );
    return toLearner(rows[0]!);
  } catch (error) {
    if (isUniqueViolation(error)) throw loginNameTaken();
    throw error;
  }
}

export interface UpdateLearnerInput {
  displayName?: string;
  loginName?: string;
  password?: string;
}

export async function updateLearner(
  db: Queryable,
  accountId: string,
  learnerId: string,
  patch: UpdateLearnerInput,
): Promise<Learner> {
  const row = await requireLearner(db, accountId, learnerId);
  const sets: string[] = [];
  const params: unknown[] = [learnerId, accountId];
  const set = (column: string, value: unknown) => {
    params.push(value);
    sets.push(`${column} = $${params.length}`);
  };
  if (patch.displayName !== undefined) set('display_name', validDisplayName(patch.displayName));
  if ((patch.loginName !== undefined || patch.password !== undefined) && row.kind !== 'teen') {
    throw new AccountsError(
      'INVALID_REQUEST',
      400,
      'Only teen profiles have their own login name and password.',
    );
  }
  if (patch.loginName !== undefined) {
    const loginName = validLoginName(patch.loginName);
    if (await isLoginNameTaken(db, loginName, learnerId)) throw loginNameTaken();
    set('login_name', loginName);
  }
  if (patch.password !== undefined)
    set('login_hash', await hashPassword(validPassword(patch.password)));
  if (sets.length === 0) return toLearner(row);
  try {
    const { rows } = await db.query<LearnerRow>(
      `UPDATE learners SET ${sets.join(', ')} WHERE id = $1 AND account_id = $2 RETURNING ${LEARNER_COLUMNS}`,
      params,
    );
    return toLearner(rows[0]!);
  } catch (error) {
    if (isUniqueViolation(error)) throw loginNameTaken();
    throw error;
  }
}

export async function setLearnerStatus(
  db: Queryable,
  accountId: string,
  learnerId: string,
  status: LearnerStatus,
): Promise<Learner | null> {
  const { rows } = await db.query<LearnerRow>(
    `UPDATE learners SET status = $3 WHERE id = $1 AND account_id = $2 RETURNING ${LEARNER_COLUMNS}`,
    [learnerId, accountId, status],
  );
  return rows[0] ? toLearner(rows[0]) : null;
}

/**
 * Freezes a profile (revoke, deletion request, refuse further collection):
 * the status flips, the profile's own sign-ins are destroyed, and any account
 * session that had it selected loses the selection. Data is kept until the
 * deletion job runs.
 */
export async function freezeLearner(
  db: Queryable,
  accountId: string,
  learnerId: string,
): Promise<Learner | null> {
  const learner = await setLearnerStatus(db, accountId, learnerId, 'frozen');
  if (!learner) return null;
  await db.query(
    `DELETE FROM account_sessions WHERE learner_id = $1 AND account_id = $2 AND role = 'learner'`,
    [learnerId, accountId],
  );
  await db.query(
    `UPDATE account_sessions SET learner_id = NULL WHERE learner_id = $1 AND account_id = $2`,
    [learnerId, accountId],
  );
  return learner;
}

export async function freezeAccountLearners(db: Queryable, accountId: string): Promise<string[]> {
  const { rows } = await db.query<{ id: string }>(
    `SELECT id FROM learners WHERE account_id = $1 AND status <> 'frozen'`,
    [accountId],
  );
  for (const row of rows) await freezeLearner(db, accountId, row.id);
  return rows.map((row) => row.id);
}

/**
 * Teen sign-in check by globally unique login name. Runs the scrypt work even
 * when the name is unknown so timing does not reveal registered names.
 */
export async function verifyTeenCredentials(
  db: Queryable,
  loginName: string,
  password: string,
): Promise<LearnerRow | null> {
  const { rows } = await db.query<LearnerRow & { login_hash: string | null }>(
    `SELECT ${LEARNER_COLUMNS}, login_hash FROM learners WHERE login_name = $1 AND kind = 'teen'`,
    [normalizeLoginName(loginName)],
  );
  const row = rows[0];
  const ok = await verifyStoredPassword(password, row?.login_hash);
  if (!ok || !row) return null;
  // Hand back the public columns only; the hash stays in this module.
  return {
    id: row.id,
    account_id: row.account_id,
    display_name: row.display_name,
    birth_year: row.birth_year,
    age_band: row.age_band,
    status: row.status,
    kind: row.kind,
    login_name: row.login_name,
    created_at: row.created_at,
  };
}
