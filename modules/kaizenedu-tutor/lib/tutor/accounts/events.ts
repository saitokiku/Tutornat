/**
 * The analytics seam for account events (spec R14: `signup`,
 * `profile_created`, `consent_recorded`). For now it logs ids at debug level;
 * the analytics module replaces the body at integration. Callers pass ids only,
 * never a name, an email, a birth year, or content (CLAUDE.md logging rule).
 */
import { createLogger } from '@/lib/logger';

const log = createLogger('tutor:accounts');

export type AccountEvent = 'signup' | 'profile_created' | 'consent_recorded' | 'password_reset';

export interface AccountEventIds {
  accountId: string;
  learnerId?: string;
}

export function onAccountEvent(event: AccountEvent, ids: AccountEventIds): void {
  log.debug(
    event,
    ids.learnerId
      ? { accountId: ids.accountId, learnerId: ids.learnerId }
      : { accountId: ids.accountId },
  );
}
