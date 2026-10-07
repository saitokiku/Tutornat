/**
 * Password hashing with Node's built-in scrypt: no dependency, constant-time
 * comparison. Format: `scrypt$<N>$<salt-b64url>$<hash-b64url>`.
 */
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;
const COST = 16_384;

function scrypt(password: string, salt: Buffer, keyLength: number, cost: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, { N: cost }, (error, derived) => {
      if (error) reject(error);
      else resolve(derived);
    });
  });
}

export const PASSWORD_MIN_LENGTH = 10;

export async function hashPassword(password: string): Promise<string> {
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new RangeError(`password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  }
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, KEY_LENGTH, COST);
  return `scrypt$${COST}$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, cost, saltB64, hashB64] = stored.split('$');
  if (scheme !== 'scrypt' || !cost || !saltB64 || !hashB64) return false;
  const salt = Buffer.from(saltB64, 'base64url');
  const expected = Buffer.from(hashB64, 'base64url');
  const derived = await scrypt(password, salt, expected.length, Number(cost));
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}
