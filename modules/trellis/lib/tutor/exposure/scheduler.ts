/**
 * E2 part B — the quiet-window scheduler (ENGINE-CONTRACT "Quiet-window
 * scheduler", SPEC §3.1 "Practice earns access to the assessment", "No silent
 * trap"; acceptance row E12), round 4: a pure caller of part C's
 * `e2.offer_transition` (db/README.md, sixth signature).
 *
 * Clean reps are `e2.evidence_events` rows of class `corrections-practice`
 * (written by `e2.append_practice`) whose payload says correct and unassisted.
 * Reaching the versioned rep count gives the skill priority. When priority
 * holds and the skill's eligibility clock has elapsed, an offer is appended;
 * later same-skill help restarts it; taking it is appended too.
 *
 * Nothing here writes `e2.assessment_offers` directly: every row comes from
 * `e2.offer_transition`, which takes the seam's skill lock, revalidates
 * eligibility and exposure order inside the database, and keys each row on a
 * caller-supplied operation ID (a retry returns the stored row). The scheduler
 * derives its operation IDs deterministically under the same lock, so a retry
 * after a rollback recomputes the same key and a retry after a commit finds the
 * row. "Help after the offer" compares the skill's exposure sequence with the
 * one frozen on the offer, never timestamps.
 *
 * A stale take (help after the offer, or the window no longer elapsed) records
 * its restart in the transaction that refused it and commits; the refusal is
 * raised only after that commit, so the restart it reports exists (round-2
 * review finding 1).
 */
import type { Queryable } from '@/lib/tutor/db';

import { skillEligibility, type SkillEligibility } from './eligibility';
import type { ExposureScope, RunInTransaction } from './ledger';
import { EXPOSURE_RULES, microsToIso, toMicros } from './rules';

export type OfferKind = 'offered' | 'taken' | 'restarted' | 'escalated';
type TransitionKind = 'offer' | 'take' | 'restart' | 'escalate';

export interface CleanReps {
  skillId: string;
  cleanReps: number;
  priority: boolean;
  /** Server receipt time of the rep that reached the threshold; null before priority. */
  priorityAt: string | null;
  required: number;
}

export async function cleanRepsFor(db: Queryable, scope: ExposureScope, skillId: string): Promise<CleanReps> {
  const { rows } = await db.query<{ ts: string | Date }>(
    `SELECT received_at::text AS ts FROM e2.evidence_events
     WHERE learner_id = $1 AND skill_id = $2 AND class = 'corrections-practice'
       AND payload->>'correct' = 'true' AND COALESCE(payload->>'assisted', 'false') <> 'true'
     ORDER BY causal_seq, received_at, id`,
    [scope.learnerId, skillId],
  );
  const required = EXPOSURE_RULES.cleanRepsForPriority;
  const threshold = rows[required - 1];
  return { skillId, cleanReps: rows.length, priority: rows.length >= required, priorityAt: threshold ? microsToIso(toMicros(threshold.ts)) : null, required };
}

interface OfferRow extends Record<string, unknown> {
  id: string;
  seq: number | string;
  kind: OfferKind;
  offer_id: string | null;
  exposure_seq: number | string;
  open: boolean;
  at: string | Date;
  reason: Record<string, unknown> | string;
  operation_id: string;
}

export interface OfferEvent {
  id: string;
  seq: number;
  kind: OfferKind;
  /** For `taken`/`restarted`: the offer this row closes. */
  offerId: string | null;
  /** The skill's exposure sequence when the row was written; restarts compare against it. */
  exposureSeq: number;
  open: boolean;
  at: string;
  /** The seam's reason: the caller's request plus server-derived facts. */
  reason: Record<string, unknown>;
  /** The operation key the row was written under (household + learner + operationId on the seam). */
  operationId: string;
}

function toOffer(row: OfferRow): OfferEvent {
  return {
    id: row.id,
    seq: Number(row.seq),
    kind: row.kind,
    offerId: row.offer_id,
    exposureSeq: Number(row.exposure_seq),
    open: Boolean(row.open),
    at: microsToIso(toMicros(row.at)),
    reason: typeof row.reason === 'string' ? (JSON.parse(row.reason) as Record<string, unknown>) : row.reason,
    operationId: row.operation_id,
  };
}

const OFFER_COLUMNS = 'id, seq, kind, offer_id, exposure_seq, open, at::text AS at, reason, operation_id';

/** Read one ledger row back in the scheduler's shape (the function returns the row as jsonb; this keeps one timestamp format). */
async function readOffer(tx: Queryable, scope: ExposureScope, id: string): Promise<OfferEvent> {
  const { rows } = await tx.query<OfferRow>(`SELECT ${OFFER_COLUMNS} FROM e2.assessment_offers WHERE learner_id = $1 AND id = $2::uuid`, [scope.learnerId, id]);
  const row = rows[0];
  if (!row) throw new Error('offer ' + id + ' is not readable in this scope');
  return toOffer(row);
}

/**
 * One seam transition. `operationId` must be stable across retries of the same
 * intent: the function returns the stored row for an exact retry and raises
 * `P0001` for a changed request under the same key.
 */
async function transition(tx: Queryable, scope: ExposureScope, skillId: string, kind: TransitionKind, offerId: string | null, operationId: string, context: Record<string, unknown>, hooks: SchedulerHooks = {}): Promise<OfferEvent> {
  const { rows } = await tx.query<{ value: { id?: string } | string }>(
    `SELECT e2.offer_transition($1, $2, $3, $4::uuid, $5::jsonb) AS value`,
    [scope.learnerId, skillId, kind, offerId, JSON.stringify({ ...context, operationId, ruleVersion: EXPOSURE_RULES.version })],
  );
  const raw = rows[0]?.value;
  const value = typeof raw === 'string' ? (JSON.parse(raw) as { id?: string }) : raw;
  if (!value || typeof value.id !== 'string') throw new Error('e2.offer_transition returned no row');
  if (hooks.afterSeamWrite) await hooks.afterSeamWrite(tx);
  return readOffer(tx, scope, value.id);
}

export async function listOffers(db: Queryable, scope: ExposureScope, skillId: string): Promise<OfferEvent[]> {
  const { rows } = await db.query<OfferRow>(
    `SELECT ${OFFER_COLUMNS} FROM e2.assessment_offers WHERE learner_id = $1 AND skill_id = $2 ORDER BY seq`,
    [scope.learnerId, skillId],
  );
  return rows.map(toOffer);
}

export interface OfferMetrics {
  offered: number;
  taken: number;
  restarted: number;
  escalated: number;
}

export async function offerMetrics(db: Queryable, scope: ExposureScope, skillId?: string): Promise<OfferMetrics> {
  const { rows } = await db.query<{ kind: OfferKind; n: number | string }>(
    `SELECT kind, count(*) AS n FROM e2.assessment_offers WHERE learner_id = $1 AND ($2::text IS NULL OR skill_id = $2) GROUP BY kind`,
    [scope.learnerId, skillId ?? null],
  );
  const m: OfferMetrics = { offered: 0, taken: 0, restarted: 0, escalated: 0 };
  for (const r of rows) m[r.kind] = Number(r.n);
  return m;
}

export type SkillState = 'practice_estimate' | 'eligible' | 'waiting' | 'escalated';

export interface SkillStatus {
  skillId: string;
  state: SkillState;
  /** Always present: the learner- and parent-visible sentence for this state. */
  message: string;
  reps: CleanReps;
  eligibility: SkillEligibility;
  /** The open offer when `state` is `eligible`. */
  openOffer: OfferEvent | null;
  /** The parent-visible explanation and plan when `state` is `escalated`. */
  escalation: { since: string; heldMicros: number; restarts: number; explanation: string; plan: string } | null;
  ruleVersion: string;
}

function skillName(skillId: string): string {
  return 'skill ' + skillId;
}

/**
 * Optional test hook: runs inside the transaction right after a seam write, while
 * the seam's skill lock (taken by `e2.lock_skills` inside `e2.offer_transition`,
 * ADR-0066) is still held until commit. The scheduler takes no lock of its own.
 */
export interface SchedulerHooks {
  afterSeamWrite?: (tx: Queryable) => Promise<void>;
}

/** Deterministic operation keys, computed from the ledger the transition will extend; the seam dedupes them under its lock. */
const opKey = {
  offer: (skillId: string, history: OfferEvent[]) => `offer:${skillId}:${history.filter((o) => o.kind === 'offered').length}`,
  restart: (offerId: string) => `restart:${offerId}`,
  take: (offerId: string) => `take:${offerId}`,
  escalate: (skillId: string, history: OfferEvent[]) => `escalate:${skillId}:${history.filter((o) => o.kind === 'escalated').length}`,
};

/**
 * Evaluate one skill in one transaction: append the offer the moment
 * eligibility holds, restart an open offer that later same-skill help (a higher
 * exposure sequence) invalidated, escalate at the boundary. The scheduler takes
 * no lock of its own (ADR-0066): every write goes through `e2.offer_transition`,
 * which takes the skill-first lock inside the seam, revalidates, and returns the
 * stored row for a retry under the same operation key. Two concurrent
 * evaluations therefore serialize inside the seam and the second returns the
 * first's row.
 */
export async function evaluateSkill(run: RunInTransaction, scope: ExposureScope, skillId: string, hooks: SchedulerHooks = {}): Promise<SkillStatus> {
  return run(async (tx) => {
    const reps = await cleanRepsFor(tx, scope, skillId);
    const eligibility = await skillEligibility(tx, scope, skillId);
    const exposureSeq = eligibility.lastExposureSeq ?? 0;
    const base = { skillId, reps, eligibility, openOffer: null, escalation: null, ruleVersion: EXPOSURE_RULES.version };
    if (!reps.priority) {
      return { ...base, state: 'practice_estimate' as const, message: `${reps.cleanReps} of ${reps.required} clean practice reps on ${skillName(skillId)}; the independent check is offered after ${reps.required}.` };
    }
    const history = await listOffers(tx, scope, skillId);
    let open = history.find((o) => o.kind === 'offered' && o.open) ?? null;
    const nowMicros = toMicros(eligibility.serverNow);

    // An open offer that later same-skill help invalidated restarts: sequence order, not timestamps.
    if (open && exposureSeq > open.exposureSeq) {
      const restarted = await transition(tx, scope, skillId, 'restart', open.id, opKey.restart(open.id), { offerExposureSeq: open.exposureSeq, exposureAt: eligibility.lastExposureAt }, hooks);
      history.push(restarted);
      open = null;
    }

    if (eligibility.eligible) {
      // The request must be a pure function of the ledger, never of this transaction's clock: the seam
      // returns the stored row for an identical retry under the same key and raises P0001 for a changed one.
      // A concurrent evaluation that raced this one therefore converges on the first offer. When no exposure
      // bounds eligibility, `eligibleSince` is null and the seam's own `at` stamps the offer.
      const offer = open ?? (await transition(tx, scope, skillId, 'offer', null, opKey.offer(skillId, history), { eligibleSince: eligibility.eligibleAt, cleanReps: reps.cleanReps }, hooks));
      return { ...base, state: 'eligible' as const, openOffer: offer, message: `${skillName(skillId)} is ready for its independent check; it is offered now.` };
    }

    const priorityMicros = toMicros(reps.priorityAt!);
    const takenSincePriority = history.some((o) => o.kind === 'taken' && toMicros(o.at) >= priorityMicros);
    const held = nowMicros - priorityMicros;
    if (!takenSincePriority && held >= EXPOSURE_RULES.noWindowEscalationMicros) {
      const restarts = history.filter((o) => o.kind === 'restarted' && toMicros(o.at) >= priorityMicros).length;
      const days = Math.round(EXPOSURE_RULES.noWindowEscalationMicros / 86_400_000_000);
      const explanation = `We cannot certify ${skillName(skillId)} while we are helping with it: it has been ready for an independent check since ${reps.priorityAt} (${days} days), but help on this skill has kept restarting the 48-hour quiet window (${restarts} restarts recorded).`;
      const plan = `Plan: for the next 48 hours the tutor will not teach ${skillName(skillId)} and will help freely with everything else; the independent check is offered the moment the window elapses.`;
      const last = history[history.length - 1];
      if (!(last && last.kind === 'escalated')) await transition(tx, scope, skillId, 'escalate', null, opKey.escalate(skillId, history), { since: reps.priorityAt, restarts }, hooks);
      return { ...base, state: 'escalated' as const, escalation: { since: reps.priorityAt!, heldMicros: held, restarts, explanation, plan }, message: explanation + ' ' + plan };
    }

    return { ...base, state: 'waiting' as const, message: `${skillName(skillId)} is ready for its independent check once ${eligibility.eligibleAt} passes with no more help on it (server time).` };
  });
}

export class OfferStateError extends Error {
  readonly code = 'OFFER_STATE' as const;
  constructor(message: string, readonly restarted: OfferEvent | null = null, readonly reason: 'no_offer' | 'restarted' | 'help_after_offer' | 'quiet_window_not_elapsed' = 'restarted') {
    super(message);
    this.name = 'OfferStateError';
  }
}

type TakeOutcome = { ok: true; taken: OfferEvent } | { ok: false; error: OfferStateError };

/**
 * The learner takes the open offer, in one transaction under the skill lock:
 * revalidated against the current exposure sequence and clock before the take
 * is appended through the seam (which revalidates again). A second take of the
 * same offer returns the first (the database holds one take per offer). A take
 * after same-skill help, or after the window closed again, records the restart
 * in this transaction, commits it, and only then raises `OfferStateError`
 * carrying the committed restart row.
 */
export async function takeOffer(run: RunInTransaction, scope: ExposureScope, skillId: string, offerId: string, hooks: SchedulerHooks = {}, operationId: string = opKey.take(offerId)): Promise<OfferEvent> {
  let outcome: TakeOutcome;
  try {
    outcome = await takeInTransaction(run, scope, skillId, offerId, hooks, operationId);
  } catch (e) {
    if (!isSeamHelpAfterOffer(e)) throw e;
    // E3 #24 round 2: the seam revalidated under its own lock and saw same-skill
    // help that this transaction's earlier eligibility read could not (the help
    // committed between the read and the lock). That transaction is aborted, so
    // the documented committed restart is written in its own transaction; only
    // then is the caller's OfferStateError raised, carrying the committed row.
    const restarted = await run(async (tx) => {
      const history = await listOffers(tx, scope, skillId);
      const prior = history.find((o) => o.kind === 'restarted' && o.offerId === offerId);
      if (prior) return prior;
      const offer = history.find((o) => o.id === offerId && o.kind === 'offered');
      const eligibility = await skillEligibility(tx, scope, skillId);
      return transition(tx, scope, skillId, 'restart', offerId, opKey.restart(offerId), { offerExposureSeq: offer?.exposureSeq ?? null, exposureAt: eligibility.lastExposureAt, atTake: true, seamRefused: 'help_after_offer' }, hooks);
    });
    throw new OfferStateError('offer ' + offerId + ' was restarted by later help on ' + skillId, restarted, 'help_after_offer');
  }
  if (outcome.ok) return outcome.taken;
  throw outcome.error;
}

/** The seam's own refusal of a stale take (`e2.offer_transition` raises P0001 `help_after_offer`). */
function isSeamHelpAfterOffer(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const err = e as { code?: unknown; message?: unknown };
  return err.code === 'P0001' && typeof err.message === 'string' && err.message.includes('help_after_offer');
}

async function takeInTransaction(run: RunInTransaction, scope: ExposureScope, skillId: string, offerId: string, hooks: SchedulerHooks, operationId: string): Promise<TakeOutcome> {
  return run(async (tx) => {
    const history = await listOffers(tx, scope, skillId);
    const offer = history.find((o) => o.id === offerId && o.kind === 'offered');
    if (!offer) return { ok: false, error: new OfferStateError('no offer ' + offerId + ' for ' + skillId, null, 'no_offer') };
    const already = history.find((o) => o.kind === 'taken' && o.offerId === offerId);
    if (already) return { ok: true, taken: already };
    const restartedBefore = history.find((o) => o.kind === 'restarted' && o.offerId === offerId);
    if (restartedBefore || !offer.open) return { ok: false, error: new OfferStateError('offer ' + offerId + ' was restarted by later help on ' + skillId, restartedBefore ?? null, 'restarted') };
    const eligibility = await skillEligibility(tx, scope, skillId);
    const exposureSeq = eligibility.lastExposureSeq ?? 0;
    if (exposureSeq > offer.exposureSeq) {
      // Committed by this transaction; the refusal is raised after the commit (finding 1).
      const restarted = await transition(tx, scope, skillId, 'restart', offer.id, opKey.restart(offer.id), { offerExposureSeq: offer.exposureSeq, exposureAt: eligibility.lastExposureAt, atTake: true }, hooks);
      return { ok: false, error: new OfferStateError('offer ' + offerId + ' was restarted by later help on ' + skillId, restarted, 'help_after_offer') };
    }
    if (!eligibility.eligible) {
      // Same sequence but the window is closed (only a moved clock can do this): the seam refuses; nothing to restart.
      return { ok: false, error: new OfferStateError('offer ' + offerId + ' cannot be taken before ' + eligibility.eligibleAt + ' on ' + skillId, null, 'quiet_window_not_elapsed') };
    }
    return { ok: true, taken: await transition(tx, scope, skillId, 'take', offer.id, operationId, { offerExposureSeq: offer.exposureSeq }, hooks) };
  });
}
