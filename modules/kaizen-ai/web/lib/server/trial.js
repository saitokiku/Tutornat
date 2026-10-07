// Free-trial redemption tracking (audit SEC-005).
// Eligibility is keyed to sha256(lowercased email) in `trial_redemptions`
// (migration 0009) — a table with NO user FK, so delete-account + re-signup
// can't mint unlimited 90-day trials, and no raw PII outlives the account.
// Disclosed in the privacy policy and docs/compliance/RETENTION.md.

import { createHash } from 'crypto';

export function trialEmailHash(email) {
  return createHash('sha256').update(String(email || '').trim().toLowerCase()).digest('hex');
}

// True if this email has never redeemed a trial. Fails open on pre-0009
// schemas (the DB backstop simply doesn't exist yet).
export async function trialAvailable(svc, email) {
  if (!email) return true;
  try {
    const { data } = await svc.from('trial_redemptions')
      .select('email_hash').eq('email_hash', trialEmailHash(email)).maybeSingle();
    return !data;
  } catch {
    return true;
  }
}

export async function recordTrialRedemption(svc, email) {
  if (!email) return;
  try {
    await svc.from('trial_redemptions').upsert({ email_hash: trialEmailHash(email) });
  } catch { /* pre-0009 schema */ }
}

// Free INTRO tutoring session — same anti-farming approach (audit: intro-free
// was deduped by student_id only, so re-signup minted another free live
// session with a real tutor). Keyed to sha256(email) in intro_redemptions
// (migration 0010), no user FK. Fails open on pre-0010 schemas.
export async function introAvailable(svc, email) {
  if (!email) return true;
  try {
    const { data } = await svc.from('intro_redemptions')
      .select('email_hash').eq('email_hash', trialEmailHash(email)).maybeSingle();
    return !data;
  } catch {
    return true;
  }
}

export async function recordIntroRedemption(svc, email) {
  if (!email) return;
  try {
    await svc.from('intro_redemptions').upsert({ email_hash: trialEmailHash(email) });
  } catch { /* pre-0010 schema */ }
}
