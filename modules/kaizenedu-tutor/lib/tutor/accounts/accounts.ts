/**
 * Account rows (spec §8.5 `accounts`): the adult account holder. Emails are
 * stored lowercase and trimmed; passwords as scrypt hashes. Every read is by
 * id or by the unique email; the row's hash never leaves this module except
 * through `verifyAccountCredentials`.
 */
import { hashPassword } from '@/lib/tutor/auth/password';
import { newId } from '@/lib/tutor/auth/session';
import type { Account } from '@/lib/tutor/contracts';
import type { Queryable } from '@/lib/tutor/db';

import { AccountsError } from './errors';
import { isUniqueViolation, toIso, verifyStoredPassword } from './rows';

export interface AccountRow extends Record<string, unknown> {
  id: string;
  email: string;
  display_name: string;
  password_hash: string;
  created_at: string | Date;
  /** Guest accounts (D35); absent on older rows reads as false. */
  guest?: boolean;
}

export function toAccount(row: AccountRow): Account {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    createdAt: toIso(row.created_at),
    guest: Boolean(row.guest),
  };
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function emailTaken(): AccountsError {
  return new AccountsError(
    'EMAIL_TAKEN',
    409,
    'An account with this email already exists. Sign in instead.',
  );
}

export async function findAccountByEmail(db: Queryable, email: string): Promise<AccountRow | null> {
  const { rows } = await db.query<AccountRow>(`SELECT * FROM accounts WHERE email = $1`, [
    normalizeEmail(email),
  ]);
  return rows[0] ?? null;
}

export async function getAccount(db: Queryable, accountId: string): Promise<Account | null> {
  const { rows } = await db.query<AccountRow>(
    `SELECT id, email, display_name, password_hash, created_at, guest FROM accounts WHERE id = $1`,
    [accountId],
  );
  return rows[0] ? toAccount(rows[0]) : null;
}

export interface CreateAccountInput {
  email: string;
  password: string;
  displayName: string;
}

export async function createAccount(db: Queryable, input: CreateAccountInput): Promise<Account> {
  const email = normalizeEmail(input.email);
  if (await findAccountByEmail(db, email)) throw emailTaken();
  const passwordHash = await hashPassword(input.password);
  const id = newId('acc');
  try {
    const { rows } = await db.query<AccountRow>(
      `INSERT INTO accounts (id, email, display_name, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, display_name, password_hash, created_at`,
      [id, email, input.displayName.trim(), passwordHash],
    );
    return toAccount(rows[0]!);
  } catch (error) {
    if (isUniqueViolation(error)) throw emailTaken();
    throw error;
  }
}

/**
 * Verifies an email and password. The scrypt work runs even when the email is
 * unknown so the response time does not say which emails are registered.
 */
export async function verifyAccountCredentials(
  db: Queryable,
  email: string,
  password: string,
): Promise<AccountRow | null> {
  const row = await findAccountByEmail(db, email);
  const ok = await verifyStoredPassword(password, row?.password_hash);
  return ok && row ? row : null;
}
