/**
 * Natural Tutor product configuration.
 *
 * Every number here comes from docs/SPEC.md and is referenced by section so a
 * change to the spec is a change here, not somewhere in lib/tutor. Values are
 * constants, not placeholders: tests in lib/tutor/invariants assert against
 * them, and the orchestrator reads them at runtime.
 *
 * Server-only. Nothing in this file may be imported by a client component
 * except through the explicit `publicConfig` export at the bottom.
 */

export type AgeBand = '4-8' | '9-12' | '13-17' | 'adult';

export interface BandDefaults {
  /** Default session length in minutes (spec §5.2 WRAP, §5.10 D). */
  sessionMinutes: number;
  /** Silence check-in after this many ms of learner silence mid-task (spec §5.10 A). */
  silenceCheckInMs: number;
  /**
   * Silence the microphone waits through before it decides the learner has
   * finished speaking. This is thinking room, and it is latency at the same
   * time: every millisecond here is a millisecond before the tutor can start.
   *
   * Younger learners get more of it because they pause inside a sentence
   * rather than at the end of one, and being cut off mid-thought by a tutor is
   * worse than a tutor that takes a beat. `thinking_pause_ms` in `app_settings`
   * overrides this at runtime so the number can be tuned against real sessions
   * without a deploy.
   */
  thinkingPauseMs: number;
  /** Attention `drifting`/`away` threshold before the recovery ladder starts (spec §5.10 C); null = ladder off. */
  attentionThresholdMs: number | null;
  /** Camera attention sensing default (spec D16): 'default-on' | 'opt-in' | 'off'. */
  camera: 'default-on' | 'opt-in' | 'off';
  /** Whether the movement-break ladder step (step 5) is available (spec §5.10 C). */
  movementBreak: boolean;
  /** Which gate opens this band (spec header, D5, D6). */
  gate: 1 | 2 | 3;
}

export const BANDS: Readonly<Record<AgeBand, BandDefaults>> = {
  '4-8': {
    sessionMinutes: 10,
    silenceCheckInMs: 25_000,
    thinkingPauseMs: 1_500,
    attentionThresholdMs: 8_000,
    camera: 'default-on',
    movementBreak: true,
    gate: 3,
  },
  '9-12': {
    sessionMinutes: 15,
    silenceCheckInMs: 40_000,
    thinkingPauseMs: 1_200,
    attentionThresholdMs: 15_000,
    camera: 'opt-in',
    movementBreak: false,
    gate: 2,
  },
  '13-17': {
    sessionMinutes: 25,
    silenceCheckInMs: 40_000,
    thinkingPauseMs: 900,
    attentionThresholdMs: null,
    camera: 'off',
    movementBreak: false,
    gate: 1,
  },
  adult: {
    sessionMinutes: 25,
    silenceCheckInMs: 40_000,
    thinkingPauseMs: 700,
    attentionThresholdMs: null,
    camera: 'off',
    movementBreak: false,
    gate: 1,
  },
};

/**
 * Birth year → band (spec R5). `null` means the profile is not creatable.
 *
 * We collect a birth year, not a birth date, so a learner's real age on any
 * given day is either `year - birthYear` or one less, depending on whether
 * their birthday has passed. This resolves that ambiguity **downward**, to the
 * youngest age the year allows.
 *
 * That direction is deliberate and asymmetric. Every gate here asks "is this
 * learner old enough", and the two errors do not cost the same: banding a
 * 12-year-old as a teen routes a child around the under-13 consent gate and
 * collects their data without a parent, while banding a fresh 18-year-old as a
 * teen only gives them a gentler tutor until their next birthday. Taking the
 * year difference directly made the first mistake for up to eleven months of
 * every year.
 *
 * Collecting a birth month would remove the ambiguity outright and is the
 * better fix; it is a product decision, recorded in docs/DECISIONS.md.
 */
export function ageBandForBirthYear(birthYear: number, now = new Date()): AgeBand | null {
  const age = now.getUTCFullYear() - birthYear - 1;
  if (age >= 18) return 'adult';
  if (age >= 13) return '13-17';
  if (age >= 9) return '9-12';
  if (age >= 4) return '4-8';
  return null;
}

/** Spec §8.6 budgets, in cents per 30-minute session. */
export const COST = {
  targetCentsPerSession: 120,
  hardCeilingCentsPerSession: 300,
  llmCentsPerSession: 60,
  ttsCentsPerSession: 40,
  asrCentsPerSession: 20,
} as const;

/**
 * Staff accounts: the operator's own logins, raised far above the plan so the
 * product can be exercised end to end without paying a learner's caps.
 *
 * Membership is a server-side allowlist of email addresses in
 * `TUTOR_STAFF_EMAILS` (comma-separated). It is deliberately not a column, a
 * flag in a request, or anything a signed-in user can influence: the only way
 * to become staff is for whoever controls the deployment's environment to say
 * so. Unset means nobody is staff, which is the right answer for a deploy that
 * forgot to configure it.
 *
 * Every number below is large and *finite*. Invariant (d) — every session has
 * a cost ceiling and every learner a daily cap — holds for staff exactly as it
 * does for a nine-year-old. A staff account that hits a runaway loop stops at
 * $50 in one session and $200 in one day instead of billing until someone
 * notices. "Unlimited" here means "you will not meet a limit while testing",
 * not "there is no limit", and those are different products.
 */
export const STAFF = {
  /** Minutes per month. At 15-minute sessions this is ~110 sessions a day, every day. */
  pooledMinutesMonthly: 50_000,
  /** Cents one staff session may spend. ~25x the learner ceiling. */
  sessionCeilingCents: 5_000,
  /** Cents one staff learner may spend in a UTC day. ~17x the learner cap. */
  dailyCapCents: 20_000,
  /** Learner profiles on a staff account, for testing every band at once. */
  learnerProfiles: 25,
  /** Multiplier on every per-minute and per-day request limit. */
  rateLimitMultiplier: 10,
} as const;

/**
 * Whether this email is on the staff allowlist. Case- and space-insensitive,
 * because an operator pasting a list into a dashboard field should not have to
 * be careful about either.
 */
export function isStaffEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = process.env.TUTOR_STAFF_EMAILS;
  if (!list) return false;
  const wanted = email.trim().toLowerCase();
  if (!wanted) return false;
  return list
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .includes(wanted);
}

/** Spec §5.3 latency budget and CLAUDE.md performance budgets, in milliseconds. */
export const LATENCY = {
  firstAudioP50Ms: 1_500,
  firstAudioP90Ms: 3_000,
  bargeInStopMs: 300,
  whiteboardActionAfterSentenceMs: 2_000,
  sessionInteractiveMs: 2_000,
  /** R1 AC: first tutor audio after pressing Start. */
  firstAudioAfterStartMs: 10_000,
} as const;

/** Spec §5.7 student model v0. */
export const STUDENT_MODEL = {
  emaAlpha: 0.3,
  masteredEstimate: 0.8,
  masteredMinItems: 4,
  masteredMinSessions: 2,
  misconceptionResolveStreak: 3,
  checkEveryMs: 10 * 60_000,
} as const;

/** Spec §5.10 B–C attention sensing and recovery. */
export const ATTENTION = {
  /**
   * One rung per this much drifting. Thirty seconds, not ten (D38): with only
   * the non-camera signals a "drifting" learner is one who has been quiet for
   * the band's silence window, and a rung every ten seconds after that was
   * four nudges in forty seconds at a child who was thinking.
   */
  ladderStepMs: 30_000,
  pauseAfterAwayMs: 120_000,
  sensorMaxFps: 10,
  sensorMinFps: 5,
  scorerHz: 2,
  states: ['attending', 'drifting', 'away', 'no_face'] as const,
} as const;

export type AttentionState = (typeof ATTENTION.states)[number];

/** Spec §9 pricing placeholder — validate with 10 parents before Day 12. Ask before changing (CLAUDE.md). */
export const PLAN = {
  priceCentsMonthly: 2_900,
  learnerProfiles: 3,
  pooledMinutesMonthly: 8 * 60,
  trialMinutes13Plus: 30,
  warnAtPercent: 80,
  moneyBackDaysUnder13: 7,
} as const;

/**
 * The model each tutor stage runs on, compiled into the bundle.
 *
 * This exists because a dotfile is not a deployment. `resolveModel` reads
 * `MODEL_ROUTES` and `DEFAULT_MODEL` from `process.env`, and a serverless host
 * populates `process.env` from *its own* project settings — not from a `.env`
 * committed to the repo and not from one traced into the function bundle. The
 * first production deploy proved it: sign-in, sessions and progress all worked
 * (they need only the database, which was set on the host) while every single
 * turn died with "No model could be resolved", because the one thing the turn
 * needed beyond the database lived in a file the runtime never read. The
 * learner saw a tutor that would not start.
 *
 * A constant here cannot go missing: it is compiled into the same bundle as
 * the code that reads it. Operators keep both overrides — a `MODEL_ROUTES`
 * entry still wins per stage, and `DEFAULT_MODEL` still wins globally (see
 * `tutorModelDefault`) — so this changes nothing for a configured host and
 * turns an outage into a working tutor on an unconfigured one.
 *
 * Note what this does NOT fix: a provider API key is a secret, so it can never
 * be compiled in. Without `GOOGLE_API_KEY` in the host environment the turn
 * still fails — but it now fails at the provider, with a message that says so,
 * instead of failing in our own config layer. `lib/tutor/config-status.ts`
 * reports that difference.
 */
export const TUTOR_MODELS = {
  /**
   * The live turn, and every stage on the speech path. Chosen for latency, not
   * for depth: measured at 674 ms p50 first token against 4,803–6,893 ms for
   * `gemini-3.5-flash` on the same prompts (docs/SPIKE-latency.md). The budget
   * is 1,500 ms p50 to first audio for the whole path, so a reasoning model
   * here spends the entire budget before TTS has a syllable to speak.
   */
  fast: 'google:gemini-3-flash-preview',
  /**
   * Grading, diagnosis, the session summary and the student-model update. None
   * of these is on the speech path — the learner is not waiting on them — so
   * they buy accuracy with the seconds the live turn cannot spend.
   */
  reasoning: 'google:gemini-3.5-flash',
} as const;

export type TutorModelRole = keyof typeof TUTOR_MODELS;

/**
 * The model string to hand `resolveModel` as its `modelString` argument.
 *
 * `resolveModel` resolves in the order `MODEL_ROUTES[stage] > modelString >
 * DEFAULT_MODEL`. Passing `DEFAULT_MODEL` through here when it is set keeps the
 * operator's global override ahead of the product default, so the effective
 * order stays: per-stage route, then `DEFAULT_MODEL`, then the constant above.
 */
export function tutorModelDefault(role: TutorModelRole): string {
  const configured = process.env.DEFAULT_MODEL?.trim();
  return configured || TUTOR_MODELS[role];
}

export type BandModelRoutes = Partial<Record<AgeBand, Partial<Record<TutorModelRole, string>>>>;

const BAND_ROUTE_CACHE: { raw: string | undefined; parsed: BandModelRoutes } = {
  raw: undefined,
  parsed: {},
};

/**
 * Per-band overrides of the model a role runs on, from
 * `TUTOR_BAND_MODEL_ROUTES` — JSON such as
 * `{"13-17":{"fast":"openai:gpt-5.4-mini"}}`.
 *
 * Reference §3: the Gemini API's own terms may forbid a service directed to,
 * or likely to be used by, people under 18. If the primary text says so, the
 * 13-to-17 band moves to another provider's fast model with one variable and
 * a redeploy, and adults stay where they are. A band without an entry, a
 * role without one, or a value that does not parse all mean "no override";
 * unknown bands, roles and non-string values are dropped rather than trusted.
 */
export function tutorBandModelRoutes(
  env: Record<string, string | undefined> = process.env,
): BandModelRoutes {
  const raw = env.TUTOR_BAND_MODEL_ROUTES?.trim() || undefined;
  if (raw === BAND_ROUTE_CACHE.raw) return BAND_ROUTE_CACHE.parsed;
  const parsed: BandModelRoutes = {};
  if (raw) {
    try {
      const value: unknown = JSON.parse(raw);
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        for (const [band, roles] of Object.entries(value as Record<string, unknown>)) {
          if (!(band in BANDS) || !roles || typeof roles !== 'object' || Array.isArray(roles)) {
            continue;
          }
          const entry: Partial<Record<TutorModelRole, string>> = {};
          for (const [role, model] of Object.entries(roles as Record<string, unknown>)) {
            if (role in TUTOR_MODELS && typeof model === 'string' && model.trim()) {
              entry[role as TutorModelRole] = model.trim();
            }
          }
          if (Object.keys(entry).length > 0) parsed[band as AgeBand] = entry;
        }
      }
    } catch {
      // An unparseable value is the same as none: the compiled-in model runs.
    }
  }
  BAND_ROUTE_CACHE.raw = raw;
  BAND_ROUTE_CACHE.parsed = parsed;
  return parsed;
}

/** The band's override for a role, or null when the band runs the default. */
export function tutorModelForBand(
  role: TutorModelRole,
  band: AgeBand | null | undefined,
): string | null {
  if (!band) return null;
  return tutorBandModelRoutes()[band]?.[role] ?? null;
}

/**
 * Guest mode (D35): the free, no-account tutor. A visitor picks a grade level
 * and starts; the server creates an anonymous account and learner behind a
 * cookie, collects no name, no birth year and no email, and meters the same
 * ceilings every learner has (invariant d). Every number here is finite on
 * purpose: `dailyMinutes` is the free allowance per guest per UTC day and
 * `retentionDays` is how long an idle guest's rows live before the cron
 * deletes them. Ask before changing either (CLAUDE.md: plan limits, retention).
 */
export const GUEST = {
  /** Free tutoring minutes per guest per UTC day. */
  dailyMinutes: 120,
  /** Days without a session after which a guest's rows are deleted by the weekly cron. */
  retentionDays: 30,
  /** The display name every guest learner carries; never a real name (nothing is asked). */
  displayName: 'You',
} as const;

/**
 * Grade levels a guest can choose from. The level is a content setting, not a
 * date of birth: it picks the band whose prompts, session length and safety
 * rules apply, and the representative age is what the band's rules assume.
 * The two youngest levels share the 4-8 band; grades 4 to 7 the 9-12 band;
 * grades 8 to 12 the 13-17 band; college and adult the adult band.
 */
export type GuestLevelId = 'early' | 'k-3' | '4-5' | '6-7' | '8-9' | '10-12' | 'college' | 'adult';

export interface GuestLevel {
  id: GuestLevelId;
  /** The chip on the front door: two or three words a learner can find in a row. */
  short: string;
  /** What the picker shows. */
  label: string;
  /** One line under the label. */
  hint: string;
  band: AgeBand;
  /** The age the band's rules assume for this level, used only to derive a representative birth year. */
  representativeAge: number;
}

export const GUEST_LEVELS: readonly GuestLevel[] = [
  {
    id: 'early',
    short: 'Pre-K',
    label: 'Before kindergarten',
    hint: 'A grown-up reads along.',
    band: '4-8',
    representativeAge: 4,
  },
  {
    id: 'k-3',
    short: 'K to 3',
    label: 'Kindergarten to 3rd grade',
    hint: 'Short sessions, lots of drawing.',
    band: '4-8',
    representativeAge: 7,
  },
  {
    id: '4-5',
    short: '4 to 5',
    label: '4th to 5th grade',
    hint: 'Fifteen-minute sessions.',
    band: '9-12',
    representativeAge: 10,
  },
  {
    id: '6-7',
    short: '6 to 7',
    label: '6th to 7th grade',
    hint: 'Fifteen-minute sessions.',
    band: '9-12',
    representativeAge: 12,
  },
  {
    id: '8-9',
    short: '8 to 9',
    label: '8th to 9th grade',
    hint: 'Twenty-five-minute sessions.',
    band: '13-17',
    representativeAge: 14,
  },
  {
    id: '10-12',
    short: '10 to 12',
    label: '10th to 12th grade',
    hint: 'Twenty-five-minute sessions.',
    band: '13-17',
    representativeAge: 16,
  },
  {
    id: 'college',
    short: 'College',
    label: 'College',
    hint: 'Any course.',
    band: 'adult',
    representativeAge: 20,
  },
  {
    id: 'adult',
    short: 'Adult',
    label: 'Adult',
    hint: 'Anything you want to learn.',
    band: 'adult',
    representativeAge: 35,
  },
] as const;

const GUEST_LEVEL_BY_ID = new Map(GUEST_LEVELS.map((level) => [level.id, level]));

export function isGuestLevelId(value: unknown): value is GuestLevelId {
  return typeof value === 'string' && GUEST_LEVEL_BY_ID.has(value as GuestLevelId);
}

export function guestLevel(id: GuestLevelId): GuestLevel {
  return GUEST_LEVEL_BY_ID.get(id)!;
}

/** The band a guest level runs under; the level, not a birth year, decides it. */
export function bandForGuestLevel(id: GuestLevelId): AgeBand {
  return guestLevel(id).band;
}

/** The learners row needs a birth year; for a guest it is derived from the level's representative age. */
export function representativeBirthYear(id: GuestLevelId, now = new Date()): number {
  return now.getUTCFullYear() - guestLevel(id).representativeAge;
}

/** Spec D13: neither "MAIC" nor "Kaizen" in the product name until the brand question is settled. */
export const PRODUCT = {
  workingName: 'Natural Tutor',
  /**
   * What the tutor calls itself and what the learner calls it (D37). One
   * constant: the tile, the transcript, the prompt and the greeting all read
   * it. The `aiLabel` stays beside it, once, and the disclosure rule is
   * unchanged: it says it is an AI when asked.
   */
  tutorName: 'Sol',
  aiLabel: 'AI tutor',
  attribution: 'Built on OpenMAIC',
} as const;

/**
 * URL prefixes owned by the product. Route groups `app/(learner)` and
 * `app/(parent)` do not appear in URLs, so the gate in middleware.ts keys on
 * these prefixes. Every product page and API route must live under one.
 */
export const PRODUCT_ROUTE_PREFIXES = [
  '/welcome',
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/reset-password',
  '/parent-invite',
  '/support',
  '/unsubscribed',
  '/session',
  '/learn',
  '/parent',
  '/legal',
  '/api/tutor',
  '/api/parent',
] as const;

function readBoolean(value: string | undefined): boolean {
  return value === 'true' || value === '1';
}

/**
 * Server-only master gate. `TUTOR_MODE=1` turns product paths on. Never read
 * this from a client component; a client component is only reachable through
 * a route that middleware.ts and the route's own layout already gated.
 */
export function isTutorMode(): boolean {
  return readBoolean(process.env.TUTOR_MODE);
}

/**
 * Build-time affordance flag for hiding upstream UI (home page, settings
 * panel) inside the client bundle. Carries no security meaning; the server
 * gate above is the authority.
 */
export function isTutorModePublic(): boolean {
  return readBoolean(process.env.NEXT_PUBLIC_TUTOR_MODE);
}

export function isProductPath(pathname: string): boolean {
  return PRODUCT_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Upstream routes that stay reachable while the product is on: its health
 * check, which uptime probes may hit, and the staging access-code gate, whose
 * modal the root layout still mounts. Everything else upstream serves answers
 * 404 in `middleware.ts` (strip passes 1 and 2, `docs/MVP-REFERENCE.md` §6).
 */
export const UPSTREAM_ROUTES_KEPT = ['/api/health', '/api/access-code'] as const;

/**
 * Whether a path may be served while the product is on: the product's own
 * pages and routes, the root (rewritten to the landing page), the kept
 * upstream routes, Next's internals, and static files. A file-like name only
 * counts outside `/api/`, so upstream's artifact-serving routes cannot slip
 * through on an extension.
 */
export function isServedInTutorMode(pathname: string): boolean {
  if (pathname === '/' || isProductPath(pathname)) return true;
  if (
    UPSTREAM_ROUTES_KEPT.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  ) {
    return true;
  }
  if (pathname.startsWith('/api/')) return false;
  if (pathname.startsWith('/_next/') || pathname.startsWith('/__nextjs')) return true;
  return /\.[a-z0-9]{1,8}$/i.test(pathname);
}

/** The only values a client bundle may import from this file. */
export const publicConfig = {
  product: PRODUCT,
  latency: LATENCY,
  attention: ATTENTION,
  bands: BANDS,
  guest: GUEST,
  guestLevels: GUEST_LEVELS,
} as const;
