/**
 * GET /api/tutor/health — can this deploy actually teach?
 *
 * Deliberately unauthenticated, because the moment you need it is the moment
 * nothing works: a deploy missing its provider key can still serve sign-in, so
 * "the tutor won't start" is otherwise indistinguishable from a bug in the
 * turn engine. It answers presence only — which model, which providers,
 * whether each key exists, and the exact variable names still to set. No key,
 * no fragment of a key, and no account data is on this route.
 *
 * It is not gated on the server `TUTOR_MODE` flag: reporting that the flag is
 * missing is one of its jobs, and a route that 404s when the thing it
 * diagnoses is broken diagnoses nothing. The build-time public flag still
 * hides it from a deploy that is not this product at all.
 */
import { isTutorMode, isTutorModePublic } from '@/kaizen.config';
import { apiSuccess } from '@/lib/server/api-response';
import { notFoundResponse } from '@/lib/tutor/auth/principal';
import { tutorConfigStatus } from '@/lib/tutor/config-status';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isTutorMode() && !isTutorModePublic()) return notFoundResponse();
  return apiSuccess(tutorConfigStatus());
}
