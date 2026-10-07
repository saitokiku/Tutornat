/**
 * Versions of the legal documents (spec §11.2 item 3: a consent record is
 * tied to the notice and policy versions it was given for). Drafts carry the
 * "-draft" suffix until counsel sign-off is recorded in compliance/.
 */
export const LEGAL_VERSIONS = {
  terms: '2026-09-04-draft',
  privacy: '2026-09-04-draft',
  notice: '2026-09-04-draft',
  ai: '2026-09-04-draft',
} as const;

export const DRAFT_BANNER = 'Draft, pending counsel review';

/** Retention proposal from spec §11.2 item 5. */
export const RETENTION_MONTHS_AFTER_LAST_ACTIVITY = 12;
