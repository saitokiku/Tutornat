/**
 * Gate reads used by more than one route (strategy §7: absent row = shut).
 * `beta_invites_open` is seeded true so the first twenty invites can go out
 * without an operator step (beta-32); `ai_kill_switch` is seeded false and is
 * flipped by the spend alarm or the operator script.
 */
import type { Queryable } from '@/lib/tutor/db';
import { getAppSetting } from '@/lib/tutor/settings';

export async function isBetaInvitesOpen(db: Queryable): Promise<boolean> {
  return getAppSetting(db, 'beta_invites_open');
}

/** True means every model, TTS, and ASR hop must be refused with a plain message. */
export async function isAiKillSwitchOn(db: Queryable): Promise<boolean> {
  return getAppSetting(db, 'ai_kill_switch');
}
