/**
 * E2 part B — the scoped eligibility clock and the attempt assistance latch,
 * both read from part C's seam (SPEC §3.1 "Scoped eligibility clock",
 * "Qualifying evidence ... ≥ 48 h since the last relevant instruction", "help
 * during a check permanently disqualifies that attempt").
 *
 * The clock is `e2.skill_guards.last_exposure_at`, written only by
 * `e2.record_exposure` under the skill lock; time is the server's `now()`
 * returned in the same statement as text (the driver's Date would round to
 * milliseconds), compared in integer microseconds. The latch
 * is read from `e2.attempts`: `assistance_latched` is set by the exposure
 * writer for in-flight attempts, and `e2.finalize_attempt` seals it by
 * comparing the skill's exposure sequence with the one frozen at issue —
 * sequences, never timestamps. Nothing here writes.
 */
import type { Queryable } from '@/lib/tutor/db';

import type { ExposureScope } from './ledger';
import { EXPOSURE_RULES, microsToIso, toMicros } from './rules';

export interface SkillEligibility {
  skillId: string;
  eligible: boolean;
  /** Server clock at the moment of the read. */
  serverNow: string;
  lastExposureAt: string | null;
  /** The skill's exposure sequence on the seam; null when nothing has ever reset it. */
  lastExposureSeq: number | null;
  /** When the delay elapses; null when nothing has ever reset this skill. */
  eligibleAt: string | null;
  /** Integer microseconds still to wait; 0 when eligible. */
  remainingMicros: number;
  reason: 'no_exposure' | 'delay_elapsed' | 'exposure_within_delay';
  ruleVersion: string;
}

interface ClockRow extends Record<string, unknown> {
  last_at: string | Date | null;
  last_seq: number | string | null;
  server_now: string | Date;
}

/**
 * Same-skill rule: only exposures whose skill set names this skill count
 * (the seam stores one guard per affected skill). Help on any other skill
 * leaves the clock untouched.
 */
export async function skillEligibility(db: Queryable, scope: ExposureScope, skillId: string): Promise<SkillEligibility> {
  const { rows } = await db.query<ClockRow>(
    `SELECT max(g.last_exposure_at)::text AS last_at, max(g.exposure_seq) AS last_seq, now()::text AS server_now
     FROM e2.skill_guards g WHERE g.learner_id = $1 AND g.skill_id = $2`,
    [scope.learnerId, skillId],
  );
  const row = rows[0];
  if (!row) throw new Error('eligibility read returned no row');
  const nowMicros = toMicros(row.server_now);
  const serverNow = microsToIso(nowMicros);
  if (row.last_at === null || row.last_at === undefined) {
    return { skillId, eligible: true, serverNow, lastExposureAt: null, lastExposureSeq: null, eligibleAt: null, remainingMicros: 0, reason: 'no_exposure', ruleVersion: EXPOSURE_RULES.version };
  }
  const lastMicros = toMicros(row.last_at);
  const eligibleMicros = lastMicros + EXPOSURE_RULES.eligibilityDelayMicros;
  const remaining = Math.max(0, eligibleMicros - nowMicros);
  const eligible = nowMicros - lastMicros >= EXPOSURE_RULES.eligibilityDelayMicros;
  return {
    skillId,
    eligible,
    serverNow,
    lastExposureAt: microsToIso(lastMicros),
    lastExposureSeq: row.last_seq === null || row.last_seq === undefined ? null : Number(row.last_seq),
    eligibleAt: microsToIso(eligibleMicros),
    remainingMicros: remaining,
    reason: eligible ? 'delay_elapsed' : 'exposure_within_delay',
    ruleVersion: EXPOSURE_RULES.version,
  };
}

/**
 * Whether this connection can read the seam's guard table: schema USAGE and
 * SELECT on `e2.skill_guards`, answered from the catalog without resolving the
 * name (name resolution itself raises 42501 under a role without USAGE). The
 * retained E1 PostgreSQL fixture runs as `e1_fixture` in its own schema and has
 * no seam access by design (household isolation); its practice route must keep
 * working without one (round-2 review finding 2). Cached per connection.
 */
const seamVisibility = new WeakMap<Queryable, boolean>();

export async function seamVisible(db: Queryable): Promise<boolean> {
  const cached = seamVisibility.get(db);
  if (cached !== undefined) return cached;
  const { rows } = await db.query<{ visible: boolean | number }>(
    `SELECT EXISTS (
       SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'e2' AND c.relname = 'skill_guards'
         AND pg_catalog.has_schema_privilege(n.oid, 'USAGE') AND pg_catalog.has_table_privilege(c.oid, 'SELECT')
     ) AS visible`,
  );
  const visible = Boolean(rows[0]?.visible);
  seamVisibility.set(db, visible);
  return visible;
}

export type PracticeExposure = SkillEligibility & { seam: 'visible' | 'absent' };

/**
 * The practice route's read: the seam's answer when this connection can see
 * it, else "no exposure known" marked `seam: 'absent'` so the evidence says
 * which. The scheduler and ledger never use this; they require the seam.
 */
export async function practiceExposure(db: Queryable, scope: ExposureScope, skillId: string): Promise<PracticeExposure> {
  if (await seamVisible(db)) return { ...(await skillEligibility(db, scope, skillId)), seam: 'visible' };
  const { rows } = await db.query<{ server_now: string | Date }>(`SELECT now()::text AS server_now`);
  const serverNow = microsToIso(toMicros(rows[0]?.server_now ?? new Date()));
  return { skillId, eligible: true, serverNow, lastExposureAt: null, lastExposureSeq: null, eligibleAt: null, remainingMicros: 0, reason: 'no_exposure', ruleVersion: EXPOSURE_RULES.version, seam: 'absent' };
}

export interface AttemptLatch {
  attemptId: string;
  skillId: string;
  state: string;
  /** The skill's exposure sequence frozen at issue. */
  exposureSeqAtIssue: number;
  /** The skill's exposure sequence now (or at the seal, once finalized). */
  exposureSeqNow: number;
  /** True when assistance touching the skill was recorded from issue through finalization. */
  latched: boolean;
  /** The seal's reasons once finalized; empty before. */
  reasons: string[];
  qualifying: boolean | null;
  ruleVersion: string;
}

interface LatchRow extends Record<string, unknown> {
  id: string;
  skill_id: string;
  state: string;
  exposure_seq: number | string;
  assistance_latched: boolean;
  final_result: { reasons?: string[]; qualifying?: boolean } | null;
  rule_version: string;
  guard_seq: number | string | null;
}

/**
 * Read an attempt's latch without writing. Before the seal, the latch is live:
 * `assistance_latched` or a moved exposure sequence. After the seal it is the
 * stored result — later help leaves it intact (the seam's completed history).
 */
export async function attemptAssistanceLatch(db: Queryable, scope: ExposureScope, attemptId: string): Promise<AttemptLatch> {
  const { rows } = await db.query<LatchRow>(
    `SELECT a.id, a.skill_id, a.state, a.exposure_seq, a.assistance_latched, a.final_result, a.rule_version, g.exposure_seq AS guard_seq
     FROM e2.attempts a LEFT JOIN e2.skill_guards g ON g.household_id = a.household_id AND g.learner_id = a.learner_id AND g.skill_id = a.skill_id
     WHERE a.learner_id = $1 AND a.id = $2::uuid`,
    [scope.learnerId, attemptId],
  );
  const row = rows[0];
  if (!row) throw new Error('attempt ' + attemptId + ' is not readable in this scope');
  const issued = Number(row.exposure_seq);
  const now = row.guard_seq === null || row.guard_seq === undefined ? issued : Number(row.guard_seq);
  const result = row.final_result && typeof row.final_result === 'object' ? row.final_result : null;
  const sealed = row.state === 'finalized' && result !== null;
  const reasons = sealed ? [...(result?.reasons ?? [])] : [];
  const sealedReasons = new Set(reasons);
  const sealedSeq = sealed ? Number((result as { exposureSeq?: number } | null)?.exposureSeq ?? now) : now;
  return {
    attemptId: row.id,
    skillId: row.skill_id,
    state: row.state,
    exposureSeqAtIssue: issued,
    exposureSeqNow: sealed ? sealedSeq : now,
    latched: sealed ? sealedReasons.has('assistance_observed') : Boolean(row.assistance_latched) || now !== issued,
    reasons,
    qualifying: sealed ? Boolean(result?.qualifying) : null,
    ruleVersion: row.rule_version,
  };
}
