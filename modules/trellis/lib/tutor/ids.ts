/** Opaque ids, as in KaizenEdu `lib/tutor/auth/session.ts` `newId`; the cookie-session code is excluded. */
import { randomBytes } from 'node:crypto';

export function newId(prefix: string): string {
  return `${prefix}_${randomBytes(12).toString('base64url')}`;
}
