/**
 * E2 part B — the exposure ledger, round 3: a caller of part C's seam
 * (ADR-0066, one write path in SQL). Every instruction, hint, worked example
 * or answer the learner is shown — over text, audio or canvas — is recorded
 * by `e2.record_exposure`, which under the per-skill locks writes the event,
 * bumps every affected skill's causal/exposure sequence and latches every
 * in-flight attempt on those skills in one function. Nothing here writes a
 * table; the roles this runs under (`tutor`, `assessment`) cannot.
 *
 * "Store before delivery" means "the function returned and its transaction
 * committed": `deliverAfterExposure` owns the transaction, commits, and only
 * then invokes `deliver`. A replay of an operation (same op id) returns the
 * stored event and never delivers again — content is only ever delivered
 * under an exposure recorded by the same call, so a resumed delivery cannot
 * reuse an old receipt time. A caller that never delivered (the process died
 * between commit and delivery) uses a new operation id: that records a fresh
 * exposure with the current clock, which is the conservative answer.
 * A retry with different skills, session or payload is a conflict (`P0001`).
 *
 * Uncertain skill mapping is conservative: an exposure with no explicit skill
 * ids resets every skill the session has touched plus its current skill, and
 * one with nothing to fall back on resets every skill the caller knows
 * (`allSkillIds`) — the seam has no wildcard, so the universe is explicit.
 */
import type { Queryable } from '@/lib/tutor/db';

import { EXPOSURE_KINDS, EXPOSURE_RULES, EXPOSURE_SOURCES, type ExposureKind, type ExposureSource, toMicros } from './rules';

export interface ExposureScope {
  learnerId: string;
  /** Telemetry only: the household is bound to the connection's principal by the seam. */
  accountId?: string;
}

export interface ExposureInput extends ExposureScope {
  /** The originating operation (one tutor turn, one canvas stroke batch, one audio segment). Stable across retries. */
  opId: string;
  sessionId: string;
  source: ExposureSource;
  kind: ExposureKind;
  /** Explicit skill ids. Omit or leave empty when the mapping is uncertain. */
  skillIds?: readonly string[];
  /** Skill graph / item bank version the ids refer to. */
  skillVersion: string;
  /** Fallback context for the conservative reset when `skillIds` is empty. */
  sessionSkillsTouched?: readonly string[];
  currentSkillId?: string | null;
  /** Every skill the caller knows: the last-resort reset when nothing else is known. */
  allSkillIds?: readonly string[];
  /** Telemetry only. */
  clientTs?: string | null;
  clientSeq?: number | null;
  payload?: Record<string, unknown>;
  provenance?: Record<string, unknown>;
  ruleVersion?: string;
}

export type SkillScope = 'explicit' | 'session' | 'all';

export interface ExposureRecord {
  id: string;
  opId: string;
  sessionId: string;
  receivedAt: string;
  receivedAtMicros: number;
  skillIds: string[];
  skillVersion: string;
  skillScope: SkillScope;
  /** Per-skill causal sequence the seam assigned; the seal compares these, never timestamps. */
  causalSequences: Record<string, number>;
  /** True when this call recorded the event; false when the operation was already stored (a replay). */
  created: boolean;
  ruleVersion: string;
}

export class ExposureInputError extends Error {
  readonly code = 'EXPOSURE_INPUT' as const;
  constructor(message: string) {
    super(message);
    this.name = 'ExposureInputError';
  }
}

/** One serializable transaction on one connection; the callback may run again on 40001/40P01. */
export type RunInTransaction = <T>(fn: (tx: Queryable) => Promise<T>) => Promise<T>;

/** The conservative mapping: explicit ids, else the session's skills, else every known skill. */
export function resolveAffectedSkills(input: {
  skillIds?: readonly string[];
  sessionSkillsTouched?: readonly string[];
  currentSkillId?: string | null;
  allSkillIds?: readonly string[];
}): { skillIds: string[]; skillScope: SkillScope } {
  const clean = (ids: readonly string[] | undefined) => [...new Set((ids ?? []).filter((s) => typeof s === 'string' && s.length > 0))];
  const explicit = clean(input.skillIds);
  if (explicit.length > 0) return { skillIds: sortC(explicit), skillScope: 'explicit' };
  const session = new Set<string>(clean(input.sessionSkillsTouched));
  if (input.currentSkillId) session.add(input.currentSkillId);
  if (session.size > 0) return { skillIds: sortC([...session]), skillScope: 'session' };
  const all = clean(input.allSkillIds);
  if (all.length > 0) return { skillIds: sortC(all), skillScope: 'all' };
  throw new ExposureInputError('an exposure with no skill mapping needs allSkillIds to reset every skill');
}

/** The seam's canonical order: COLLATE "C", i.e. UTF-8 byte order. */
export function sortC(ids: readonly string[]): string[] {
  return [...ids].sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)));
}

export interface SeamExposureRow extends Record<string, unknown> {
  id: string;
  learner_id: string;
  operation_id: string;
  session_id: string;
  skill_ids: string[];
  skill_version: string;
  causal_sequences: Record<string, number | string>;
  received_at: string | Date;
  payload: Record<string, unknown>;
  provenance: Record<string, unknown>;
  rule_version: string;
}

export function toRecord(row: SeamExposureRow, created: boolean): ExposureRecord {
  const micros = toMicros(row.received_at);
  const sequences: Record<string, number> = {};
  for (const [skill, seq] of Object.entries(row.causal_sequences ?? {})) sequences[skill] = Number(seq);
  const scope = row.provenance?.skillScope;
  return {
    id: row.id,
    opId: row.operation_id,
    sessionId: row.session_id,
    receivedAt: row.received_at instanceof Date ? row.received_at.toISOString() : String(row.received_at),
    receivedAtMicros: micros,
    skillIds: [...row.skill_ids],
    skillVersion: row.skill_version,
    skillScope: scope === 'session' || scope === 'all' ? scope : 'explicit',
    causalSequences: sequences,
    created,
    ruleVersion: row.rule_version,
  };
}

function validate(input: ExposureInput): { skillIds: string[]; skillScope: SkillScope; payload: Record<string, unknown>; provenance: Record<string, unknown> } {
  if (!EXPOSURE_SOURCES.includes(input.source)) throw new ExposureInputError('unknown exposure source: ' + String(input.source));
  if (!EXPOSURE_KINDS.includes(input.kind)) throw new ExposureInputError('unknown exposure kind: ' + String(input.kind));
  if (typeof input.opId !== 'string' || input.opId.length === 0) throw new ExposureInputError('an exposure needs its originating operation id');
  if (typeof input.sessionId !== 'string' || input.sessionId.length === 0) throw new ExposureInputError('an exposure needs its session id');
  if (typeof input.skillVersion !== 'string' || input.skillVersion.length === 0) throw new ExposureInputError('an exposure needs the skill version its ids refer to');
  const { skillIds, skillScope } = resolveAffectedSkills(input);
  // Payload and provenance are part of the operation's identity on the seam: a retry must send the same.
  const payload = { ...(input.payload ?? {}), source: input.source, kind: input.kind, clientTs: input.clientTs ?? null, clientSeq: input.clientSeq ?? null };
  const provenance = { ...(input.provenance ?? {}), source: input.source, kind: input.kind, skillScope, evidenceClass: 'assisted-help' };
  return { skillIds, skillScope, payload, provenance };
}

/**
 * Record one exposure through `e2.record_exposure` inside the caller's
 * transaction (`tx`). Returns the stored event: the one this call recorded, or
 * the first one for this operation. `created` is decided inside the same
 * transaction, before the function runs, so a replay is recognised as such.
 */
export async function recordExposure(tx: Queryable, input: ExposureInput): Promise<ExposureRecord> {
  const { skillIds, payload, provenance } = validate(input);
  const { rows: prior } = await tx.query<{ n: number | string }>(
    `SELECT count(*) AS n FROM e2.exposure_events WHERE learner_id = $1 AND operation_id = $2`,
    [input.learnerId, input.opId],
  );
  const existed = Number(prior[0]?.n ?? 0) > 0;
  const { rows } = await tx.query<{ value: SeamExposureRow }>(
    `SELECT e2.record_exposure($1, $2::text[], $3, $4, $5, $6::jsonb, $7::jsonb, $8) AS value`,
    [input.learnerId, skillIds, input.skillVersion, input.opId, input.sessionId, JSON.stringify(payload), JSON.stringify(provenance), input.ruleVersion ?? EXPOSURE_RULES.version],
  );
  const row = rows[0]?.value;
  if (!row) throw new Error('e2.record_exposure returned no row');
  return toRecord(typeof row === 'string' ? (JSON.parse(row) as SeamExposureRow) : row, !existed);
}

/**
 * Deliver instructional content only after its exposure is committed
 * (ENGINE-CONTRACT session execution: "Deliver instructional text/audio/canvas
 * only after exposure persistence succeeds"). The transaction commits before
 * `deliver` runs; if the record fails, `deliver` never runs and the error
 * propagates. A replay (`created:false`) returns the stored record and does
 * not deliver: `delivered` is `undefined` and `replayed` is true.
 */
export async function deliverAfterExposure<T>(
  run: RunInTransaction,
  input: ExposureInput,
  deliver: (record: ExposureRecord) => Promise<T> | T,
): Promise<{ record: ExposureRecord; delivered: T | undefined; replayed: boolean }> {
  const record = await run((tx) => recordExposure(tx, input));
  if (!record.created) return { record, delivered: undefined, replayed: true };
  const delivered = await deliver(record);
  return { record, delivered, replayed: false };
}

export interface PracticeInput extends ExposureScope {
  opId: string;
  sessionId: string;
  skillId: string;
  skillVersion: string;
  /** The caller's claim; the seam stores it with `qualifying=false` whatever it says. */
  payload: Record<string, unknown>;
  provenance?: Record<string, unknown>;
  ruleVersion?: string;
}

export interface PracticeRecord {
  id: string;
  opId: string;
  skillId: string;
  causalSeq: number;
  receivedAt: string;
  qualifying: boolean;
  evidenceClass: string;
  created: boolean;
}

/**
 * One practice row per originating operation through `e2.append_practice`
 * (`class='corrections-practice'`, never qualifying). Help delivered during
 * practice is recorded separately with `recordExposure`.
 */
export async function appendPractice(tx: Queryable, input: PracticeInput): Promise<PracticeRecord> {
  if (typeof input.opId !== 'string' || input.opId.length === 0) throw new ExposureInputError('a practice row needs its originating operation id');
  const { rows: prior } = await tx.query<{ n: number | string }>(
    `SELECT count(*) AS n FROM e2.evidence_events WHERE learner_id = $1 AND operation_id = $2`,
    [input.learnerId, 'practice:' + input.opId],
  );
  const { rows } = await tx.query<{ value: Record<string, unknown> }>(
    `SELECT e2.append_practice($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8) AS value`,
    [input.learnerId, input.skillId, input.skillVersion, input.opId, input.sessionId, JSON.stringify(input.payload), JSON.stringify(input.provenance ?? { source: 'tutor' }), input.ruleVersion ?? EXPOSURE_RULES.version],
  );
  const raw = rows[0]?.value;
  if (!raw) throw new Error('e2.append_practice returned no row');
  const row = (typeof raw === 'string' ? JSON.parse(raw) : raw) as Record<string, unknown>;
  return {
    id: String(row.id),
    opId: String(row.operation_id),
    skillId: String(row.skill_id),
    causalSeq: Number(row.causal_seq),
    receivedAt: row.received_at instanceof Date ? row.received_at.toISOString() : String(row.received_at),
    qualifying: Boolean(row.qualifying),
    evidenceClass: String(row.class),
    created: Number(prior[0]?.n ?? 0) === 0,
  };
}

/** The ledger's causal order for a learner and skill: the seam's per-skill sequence, never client time. */
export async function listExposures(db: Queryable, scope: ExposureScope, skillId?: string): Promise<ExposureRecord[]> {
  const { rows } = await db.query<SeamExposureRow>(
    `SELECT * FROM e2.exposure_events WHERE learner_id = $1 AND ($2::text IS NULL OR $2 = ANY(skill_ids)) ORDER BY received_at, id`,
    [scope.learnerId, skillId ?? null],
  );
  return rows.map((row) => toRecord(row, false));
}
