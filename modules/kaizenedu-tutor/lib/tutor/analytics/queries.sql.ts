/**
 * The R14 "one dashboard" query set: cost per turn (usage_ledger joined to
 * turns), latency percentiles (turns.latency_ms), and mastery changes
 * (evidence_events). Exported as SQL strings so they can be pasted into the
 * Neon SQL editor or a PostHog data warehouse, and run by
 * `runDashboardQueries` (scripts/tutor-dashboard.ts) with `$1` = days back.
 */
import type { Queryable } from '@/lib/tutor/db';

export const COST_PER_TURN_SQL = `
SELECT t.id AS turn_id,
       t.session_id,
       t.account_id,
       t.ts,
       t.latency_ms,
       t.model,
       t.cost_cents AS turn_cost_cents,
       COALESCE(SUM(u.cents), 0)::int AS ledger_cents,
       COALESCE(SUM(u.cents) FILTER (WHERE u.kind = 'llm'), 0)::int AS llm_cents,
       COALESCE(SUM(u.cents) FILTER (WHERE u.kind = 'tts'), 0)::int AS tts_cents,
       COALESCE(SUM(u.cents) FILTER (WHERE u.kind = 'asr'), 0)::int AS asr_cents,
       COALESCE(SUM(u.cents) FILTER (WHERE u.kind = 'vision'), 0)::int AS vision_cents
FROM turns t
LEFT JOIN usage_ledger u ON u.turn_id = t.id
WHERE t.role = 'tutor'
  AND t.ts >= now() - ($1::int * interval '1 day')
GROUP BY t.id
ORDER BY t.ts DESC
LIMIT 1000`;

export const LATENCY_PERCENTILES_SQL = `
SELECT date_trunc('day', t.ts)::date::text AS day,
       COUNT(*)::int AS turns,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY t.latency_ms) AS p50_ms,
       percentile_cont(0.9) WITHIN GROUP (ORDER BY t.latency_ms) AS p90_ms,
       MAX(t.latency_ms)::int AS max_ms
FROM turns t
WHERE t.role = 'tutor'
  AND t.latency_ms IS NOT NULL
  AND t.ts >= now() - ($1::int * interval '1 day')
GROUP BY 1
ORDER BY 1 DESC`;

export const MASTERY_CHANGES_SQL = `
SELECT date_trunc('day', e.ts)::date::text AS day,
       COALESCE(e.payload->>'to', e.payload->>'status', 'unknown') AS to_status,
       COUNT(*)::int AS changes,
       COUNT(DISTINCT e.learner_id)::int AS learners,
       AVG(CASE WHEN e.payload->>'estimate' ~ '^-?[0-9]+(\\.[0-9]+)?$'
                THEN (e.payload->>'estimate')::double precision END) AS avg_estimate
FROM evidence_events e
WHERE e.type = 'mastery_change'
  AND e.ts >= now() - ($1::int * interval '1 day')
GROUP BY 1, 2
ORDER BY 1 DESC, 2`;

export const DASHBOARD_QUERIES = {
  costPerTurn: COST_PER_TURN_SQL,
  latency: LATENCY_PERCENTILES_SQL,
  mastery: MASTERY_CHANGES_SQL,
} as const;

interface CostPerTurnRow extends Record<string, unknown> {
  turn_id: string;
  session_id: string;
  account_id: string;
  ts: string | Date;
  latency_ms: number | null;
  model: string | null;
  turn_cost_cents: number | string;
  ledger_cents: number | string;
  llm_cents: number | string;
  tts_cents: number | string;
  asr_cents: number | string;
  vision_cents: number | string;
}

interface LatencyRow extends Record<string, unknown> {
  day: string;
  turns: number | string;
  p50_ms: number | string | null;
  p90_ms: number | string | null;
  max_ms: number | string | null;
}

interface MasteryRow extends Record<string, unknown> {
  day: string;
  to_status: string;
  changes: number | string;
  learners: number | string;
  avg_estimate: number | string | null;
}

export interface CostPerTurn {
  turnId: string;
  sessionId: string;
  accountId: string;
  ts: string;
  latencyMs: number | null;
  model: string | null;
  turnCostCents: number;
  ledgerCents: number;
  llmCents: number;
  ttsCents: number;
  asrCents: number;
  visionCents: number;
}

export interface LatencyDay {
  day: string;
  turns: number;
  p50Ms: number | null;
  p90Ms: number | null;
  maxMs: number | null;
}

export interface MasteryDay {
  day: string;
  toStatus: string;
  changes: number;
  learners: number;
  avgEstimate: number | null;
}

export interface DashboardResults {
  days: number;
  costPerTurn: CostPerTurn[];
  latency: LatencyDay[];
  mastery: MasteryDay[];
}

function num(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function iso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export async function runDashboardQueries(
  db: Queryable,
  options: { days?: number } = {},
): Promise<DashboardResults> {
  const days = Math.max(1, Math.floor(options.days ?? 7));
  const [cost, latency, mastery] = await Promise.all([
    db.query<CostPerTurnRow>(COST_PER_TURN_SQL, [days]),
    db.query<LatencyRow>(LATENCY_PERCENTILES_SQL, [days]),
    db.query<MasteryRow>(MASTERY_CHANGES_SQL, [days]),
  ]);
  return {
    days,
    costPerTurn: cost.rows.map((row) => ({
      turnId: row.turn_id,
      sessionId: row.session_id,
      accountId: row.account_id,
      ts: iso(row.ts),
      latencyMs: num(row.latency_ms),
      model: row.model,
      turnCostCents: num(row.turn_cost_cents) ?? 0,
      ledgerCents: num(row.ledger_cents) ?? 0,
      llmCents: num(row.llm_cents) ?? 0,
      ttsCents: num(row.tts_cents) ?? 0,
      asrCents: num(row.asr_cents) ?? 0,
      visionCents: num(row.vision_cents) ?? 0,
    })),
    latency: latency.rows.map((row) => ({
      day: row.day,
      turns: num(row.turns) ?? 0,
      p50Ms: num(row.p50_ms),
      p90Ms: num(row.p90_ms),
      maxMs: num(row.max_ms),
    })),
    mastery: mastery.rows.map((row) => ({
      day: row.day,
      toStatus: row.to_status,
      changes: num(row.changes) ?? 0,
      learners: num(row.learners) ?? 0,
      avgEstimate: num(row.avg_estimate),
    })),
  };
}
