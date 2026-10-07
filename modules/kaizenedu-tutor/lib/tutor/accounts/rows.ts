/**
 * Small helpers shared by the accounts modules: timestamp normalisation (pg
 * and PGlite both hand back Date objects, string is tolerated), the unique
 * violation test, and constant-time password verification that runs the same
 * scrypt work whether or not a stored hash exists.
 */
import { hashPassword, verifyPassword } from '@/lib/tutor/auth/password';

export function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function toIsoOrNull(value: string | Date | null | undefined): string | null {
  return value == null ? null : toIso(value);
}

/** node-postgres carries SQLSTATE in `code`; PGlite carries the message only. */
export function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  return (
    code === '23505' ||
    (typeof message === 'string' && /duplicate key value violates unique constraint/i.test(message))
  );
}

const DUMMY_HASH = hashPassword('natural-tutor-dummy-hash-for-constant-time');

/**
 * True only when `stored` exists and matches. When it does not exist the
 * password is still verified against a dummy hash so the response time does
 * not reveal which emails or login names are registered.
 */
export async function verifyStoredPassword(
  password: string,
  stored: string | null | undefined,
): Promise<boolean> {
  const matches = await verifyPassword(password, stored ?? (await DUMMY_HASH));
  return matches && Boolean(stored);
}
