// Interest capture for the held storefront: pure validation, no I/O, so the
// contract is unit-testable (test/interest.test.mjs). The route
// (app/api/club/interest) wraps this with rate limiting and the insert.
//
// THE KIND IS A CLOSED ENUM, AND IT IS THE POINT OF THE ROW.
// It used to be free text, and four surfaces passed four incompatible things:
// `null` from the landing page and /tutoring, `'pricing'` from the price sheet,
// `'ai_plans'` from /ai, `'ai_solo'`/`'ai_hall'` from the ladder. Two of those
// are page names and two are SKU names, which meant the funnel board's first
// row — the only measurement of top-of-funnel demand — could not tell a $550
// seat intent from a $14 drop-in intent. That is the one segmentation the whole
// Wave 1 plan turns on (docs/superpowers/specs/2026-09-02-wave2-audit.md).
//
// So the vocabulary lives here, once. It names WHAT THE VISITOR WANTS, never
// which page they were standing on when they asked — the page is already
// captured in `source`. An unrecognised kind is rejected rather than stored,
// because a row nobody can classify is worse than a row that failed loudly.
export const INTEREST_KINDS = [
  'seat',        // the standing seat: the $550/mo recurring product
  'diagnostic',  // the $59 placement, which is the seat's on-ramp
  'homework_hall',
  'clinic',
  'community_free',
  'ai',          // the free companion or its one upgrade
];

// READING what is already in the table, which is a different job from deciding
// what may go into it. `club_interest` holds rows written before the enum
// existed, in the four vocabularies named above. They are not accepted any
// more — isInterestKind() still refuses them — but a reader that does not know
// them files every one under "unspecified", which is how a founder loses sight
// of captures already sitting in the funnel board.
//
// Only a faithful re-reading belongs here. `ai_plans`/`ai_solo`/`ai_hall` all
// named the companion, so they read as `ai`. `pricing` named a PAGE, not a
// want: a visitor on the price sheet may have been weighing a $550 seat or a
// $14 Hall, and guessing would put an invented number in the seat-intent
// denominator — the one figure this enum exists to protect. It stays
// unspecified, which is the true answer.
export const LEGACY_INTEREST_KINDS = {
  ai_plans: 'ai',
  ai_solo: 'ai',
  ai_hall: 'ai',
};

/** The kind to COUNT a stored row as. Never use this to validate an input. */
export function readInterestKind(kind) {
  const k = String(kind || '');
  if (INTEREST_KINDS.includes(k)) return k;
  return LEGACY_INTEREST_KINDS[k] || null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SOURCE_MAX = 80;

export function isInterestKind(kind) {
  return INTEREST_KINDS.includes(String(kind || ''));
}

export function validateInterest(body) {
  const email = String(body?.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 320) {
    return { ok: false, error: 'Enter a valid email address.' };
  }
  // Null stays legal: a capture that genuinely has no product in mind (the
  // footer, a general "tell me when you open") is a real thing to record, and
  // pretending it is a seat lead would corrupt the number this enum exists to
  // protect. What is not legal is a kind outside the vocabulary.
  const kind = body?.kind ? String(body.kind) : null;
  if (kind && !isInterestKind(kind)) {
    return { ok: false, error: 'Bad request.' };
  }
  const source = body?.source ? String(body.source).slice(0, SOURCE_MAX) : null;
  const bot = Boolean(String(body?.company || '').trim()); // honeypot field
  return { ok: true, value: { email, kind, source, bot } };
}
