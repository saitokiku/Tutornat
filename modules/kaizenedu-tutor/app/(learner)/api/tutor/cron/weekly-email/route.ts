/**
 * GET /api/tutor/cron/weekly-email — the weekly report run (spec R18). The
 * platform calls it on the schedule in vercel.json with
 * `Authorization: Bearer $CRON_SECRET`; anything else is 401, and a deploy
 * without the secret answers 503 so the gap is visible rather than silent.
 * Idempotent per (learner, week) through `email_log`, batch-limited, and safe
 * to fire hourly: it sends only inside the first 48 hours after a week ends.
 */
import { timingSafeEqual } from 'node:crypto';

import { isTutorMode } from '@/kaizen.config';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { openDb } from '@/lib/tutor/accounts';
import { resolveAppUrl } from '@/lib/tutor/app-url';
import { notFoundResponse } from '@/lib/tutor/auth/principal';
import { CRON_SECRET_ENV, sendWeeklyEmails } from '@/lib/tutor/email/weekly';
import { purgeIdleGuests } from '@/lib/tutor/guest';

export const dynamic = 'force-dynamic';

function authorized(request: Request, secret: string): boolean {
  const given = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: Request) {
  if (!isTutorMode()) return notFoundResponse();
  const secret = process.env[CRON_SECRET_ENV]?.trim();
  if (!secret) {
    return apiError(
      'NOT_CONFIGURED',
      503,
      `${CRON_SECRET_ENV} is not set, so the weekly report cannot run.`,
    );
  }
  if (!authorized(request, secret)) return apiError('UNAUTHENTICATED', 401, 'Not allowed.');
  const opened = await openDb('send the weekly report');
  if (!opened.ok) return opened.response;
  const result = await sendWeeklyEmails(opened.db, { baseUrl: resolveAppUrl(request) });
  // Guest retention (D35) rides on the same schedule: a guest with no session
  // in GUEST.retentionDays is deleted, a batch at a time.
  const guests = await purgeIdleGuests(opened.db);
  return apiSuccess({ ...result, guests });
}
