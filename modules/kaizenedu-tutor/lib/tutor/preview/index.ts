/**
 * Preview mode: the product renders from a sample fixture when no database is
 * configured, so every screen can be walked through before any infrastructure
 * exists. See fixture.ts for what is shown and why this is safe.
 *
 * The mode is derived, never set by a request: it is on only when the product
 * is on and DATABASE_URL is absent. The moment an operator sets DATABASE_URL
 * every helper here goes cold and the real database paths take over, with no
 * flag to remember to turn off.
 *
 * Writes are refused rather than faked. A preview that accepted a sign-up and
 * dropped it would be worse than one that says plainly it cannot save.
 */
import { NextResponse } from 'next/server';

import { isTutorMode } from '@/kaizen.config';

import { isDbConfigured } from '../db';

export const PREVIEW_READ_ONLY = 'PREVIEW_READ_ONLY' as const;

/** True when the product is on but has no database to read or write. */
export function isPreviewMode(): boolean {
  return isTutorMode() && !isDbConfigured();
}

/**
 * The refusal every write path returns in preview mode. 503 rather than 4xx:
 * the request is well formed, the service simply cannot persist it yet.
 */
export function previewReadOnlyResponse(action = 'save this'): NextResponse {
  return NextResponse.json(
    {
      success: false,
      errorCode: PREVIEW_READ_ONLY,
      error: `This is a preview with sample data, so it cannot ${action}. Set DATABASE_URL to run for real.`,
    },
    { status: 503 },
  );
}

export {
  PREVIEW_ACCOUNT_ID,
  PREVIEW_LEARNER_ID,
  previewCoursework,
  previewEntitlement,
  previewLearner,
  previewLearnerPrincipal,
  previewLearners,
  previewMastery,
  previewMisconceptions,
  previewPrincipal,
  previewProgress,
  previewReport,
  previewSessions,
  previewTurns,
} from './fixture';
