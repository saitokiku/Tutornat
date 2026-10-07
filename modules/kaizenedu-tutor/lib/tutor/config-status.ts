/**
 * What the tutor needs from the host environment, and whether it has it.
 *
 * The first production deploy failed in a way that took hours to see: the
 * learner pressed Start, the session opened, and the turn died. Sign-in,
 * sessions and progress all worked, because those need only the database, and
 * the database was the one thing set on the host. Everything else — the model
 * and every provider key — lived in a `.env` in the repository, which a
 * serverless runtime never reads. From the browser it looked like "the tutor
 * won't start"; from the logs it was one line of config.
 *
 * This module answers that question directly, before a learner has to
 * discover it: which model the turn will run, whether its key is present, and
 * for anything missing, the exact environment variable name to set. It reads
 * only presence — never a key, never a fragment of one — so its output is safe
 * to return from an unauthenticated route and safe to log.
 */
import {
  isTutorMode,
  tutorBandModelRoutes,
  tutorModelDefault,
  type AgeBand,
} from '@/kaizen.config';
import { parseModelString } from '@/lib/ai/providers';
import { getStageRoute } from '@/lib/server/model-routes';
import {
  ASR_ENV_MAP,
  LLM_ENV_MAP,
  TTS_ENV_MAP,
  resolveApiKey,
  resolveASRApiKey,
  resolveTTSApiKey,
} from '@/lib/server/provider-config';
import { TUTOR_LLM_SOURCES } from '@/lib/tutor/cost/sources';
import { isDbConfigured } from '@/lib/tutor/db';
import { emailConfigStatus, type EmailConfigStatus } from '@/lib/tutor/email';
import { weeklyEmailStatus, type WeeklyEmailStatus } from '@/lib/tutor/email/weekly';
import { safetyPagingStatus, type SafetyPagingStatus } from '@/lib/tutor/safety/paging';
import { supportInboxStatus, type SupportInboxStatus } from '@/lib/tutor/support/inbox';

/** Where the live turn's model string came from, most specific first. */
export type ModelSource = 'MODEL_ROUTES' | 'DEFAULT_MODEL' | 'built-in';

export interface CapabilityStatus {
  /** Provider id the tutor will call, e.g. `google`, `openai-tts`. */
  provider: string;
  /** Whether a key for that provider is present in this environment. */
  key: boolean;
  /** The environment variable that would supply it, for an operator to set. */
  keyEnv: string;
}

export type TutorConfigStatus = {
  /** True when a learner can complete a full spoken turn on this deploy. */
  ok: boolean;
  tutorMode: boolean;
  database: boolean;
  llm: CapabilityStatus & {
    model: string;
    source: ModelSource;
    /** Bands whose live turn runs on another model (`TUTOR_BAND_MODEL_ROUTES`); empty when none. */
    bandOverrides: Partial<Record<AgeBand, string>>;
  };
  tts: CapabilityStatus;
  asr: CapabilityStatus;
  /**
   * How many addresses are on the staff allowlist (`TUTOR_STAFF_EMAILS`). A
   * count, never the addresses: this route is unauthenticated, and an
   * operator's email is not something to publish. Zero means the variable is
   * unset or empty, which is the answer when a deploy forgot it.
   */
  staffAllowlist: number;
  /**
   * Whether this deploy can send mail (password reset, the parent invitation,
   * the weekly report). Not part of `ok`: a learner can complete a spoken
   * turn without it, and a forgotten password cannot be reset without it.
   */
  email: EmailConfigStatus;
  /**
   * Whether a safety event reaches a person (`SAFETY_ALERT_EMAILS` on top of
   * email). Not part of `ok` either, but set before the first invite goes out:
   * a flag nobody is told about protects nobody (docs/SAFETY-RUNBOOK.md).
   */
  safety: SafetyPagingStatus;
  /** Whether a support message reaches a person (`SUPPORT_EMAIL` on top of email). */
  support: SupportInboxStatus;
  /** Whether the weekly report can go out (`CRON_SECRET` on top of email; the schedule is in vercel.json). */
  weeklyEmail: WeeklyEmailStatus;
  /** Environment variable names that are missing, in the order to fix them. */
  missing: string[];
};

/** `google` → `GOOGLE_API_KEY`. Falls back to a readable guess for an unmapped id. */
function keyEnvFor(map: Record<string, string>, providerId: string, suffix = '_API_KEY'): string {
  for (const [prefix, id] of Object.entries(map)) {
    if (id === providerId) return `${prefix}${suffix}`;
  }
  return `${providerId.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}${suffix}`;
}

function llmStatus(): TutorConfigStatus['llm'] {
  const stage = TUTOR_LLM_SOURCES.liveTurn;
  const routed = getStageRoute(stage)?.model;
  const configured = process.env.DEFAULT_MODEL?.trim();
  const model = routed || tutorModelDefault('fast');
  const source: ModelSource = routed ? 'MODEL_ROUTES' : configured ? 'DEFAULT_MODEL' : 'built-in';
  const { providerId } = parseModelString(model);
  const bandOverrides: Partial<Record<AgeBand, string>> = {};
  for (const [band, roles] of Object.entries(tutorBandModelRoutes())) {
    if (roles?.fast) bandOverrides[band as AgeBand] = roles.fast;
  }
  return {
    model,
    source,
    bandOverrides,
    provider: providerId,
    key: Boolean(resolveApiKey(providerId, '')),
    keyEnv: keyEnvFor(LLM_ENV_MAP, providerId),
  };
}

export function tutorConfigStatus(): TutorConfigStatus {
  const llm = llmStatus();

  const ttsProvider = process.env.TUTOR_TTS_PROVIDER ?? 'openai-tts';
  const tts: CapabilityStatus = {
    provider: ttsProvider,
    key: Boolean(resolveTTSApiKey(ttsProvider)),
    keyEnv: keyEnvFor(TTS_ENV_MAP, ttsProvider),
  };

  const asrProvider = process.env.TUTOR_ASR_PROVIDER ?? 'openai-whisper';
  const asr: CapabilityStatus = {
    provider: asrProvider,
    key: Boolean(resolveASRApiKey(asrProvider)),
    keyEnv: keyEnvFor(ASR_ENV_MAP, asrProvider),
  };

  const tutorMode = isTutorMode();
  const database = isDbConfigured();

  // Ordered by what blocks a learner first: no product, then no persistence,
  // then no thinking, then no voice in either direction.
  const missing: string[] = [];
  if (!tutorMode) missing.push('TUTOR_MODE');
  if (!database) missing.push('DATABASE_URL');
  if (!llm.key) missing.push(llm.keyEnv);
  if (!tts.key) missing.push(tts.keyEnv);
  if (!asr.key) missing.push(asr.keyEnv);

  const staffAllowlist = (process.env.TUTOR_STAFF_EMAILS ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean).length;

  return {
    ok: missing.length === 0,
    tutorMode,
    database,
    llm,
    tts,
    asr,
    staffAllowlist,
    email: emailConfigStatus(),
    safety: safetyPagingStatus(),
    support: supportInboxStatus(),
    weeklyEmail: weeklyEmailStatus(),
    missing,
  };
}

/**
 * A sentence a learner can read when the turn fails because this deploy is not
 * configured. It names no variable and no provider: the operator's detail is
 * in the status above and in the server log, and a nine-year-old reading
 * `GOOGLE_API_KEY` learns nothing except that something is broken.
 */
export const NOT_CONFIGURED_MESSAGE =
  "The tutor isn't switched on yet. This is something for a grown-up to fix, not you — nothing you did caused it.";
