// The evidence ledger — append, read, replay.
// SERVER ONLY. Requires a service-role client; never import from client code.
//
// The ledger is the source of truth for what a learner has demonstrated.
// kc_estimate is a derived cache. That asymmetry is the whole design: when the
// scheduler changes, you REPLAY the ledger rather than migrate learner state.
//
// Nothing here trusts the client. `evidence` has no client INSERT policy and no
// client write grant (migration 0013) — the defect this replaces is
// PracticeModal computing its own `quality` and PATCHing it to a server that
// accepted it with a range clamp.

import { activeScheduler } from '@/lib/engine/scheduler.js';
import { weightOf } from '@/lib/engine/types.js';

const EVIDENCE_COLUMNS =
  'id,kc_id,at,kind,outcome,assisted,assistance_dose,verified_by,weight,item_id,misconception_id,context_tag,latency_ms,predicted_correct,source_ref';

// The engine's tables arrive in migrations 0012/0013. Until those are applied,
// every query here fails with Postgres 42P01 (undefined_table). Callers use this
// to degrade to an explicit "not provisioned yet" state instead of a 500 —
// the same discipline the rest of the app applies to missing API keys, and what
// makes it safe to deploy the code before running the migrations.
export function isMissingSchema(err) {
  const msg = String(err?.message || err || '');
  return err?.code === '42P01'
    || /relation ".*" does not exist/i.test(msg)
    || /could not find the table/i.test(msg)
    || /schema cache/i.test(msg);
}

/**
 * Append evidence. Returns the inserted rows.
 *
 * `weight` is computed here and STORED rather than derived at read time, so the
 * ledger stays auditable: you can always see what a row was worth when it was
 * written, even after the weighting policy changes.
 */
export async function appendEvidence(svc, userId, rows) {
  const list = (Array.isArray(rows) ? rows : [rows]).filter(Boolean);
  if (!list.length) return [];

  const payload = list.map((r) => ({
    user_id: userId,
    kc_id: r.kcId,
    at: r.at || new Date().toISOString(),
    kind: r.kind,
    outcome: r.outcome == null ? null : Math.max(0, Math.min(1, Number(r.outcome))),
    assisted: r.assisted !== false,
    assistance_dose: Number(r.assistanceDose) || 0,
    verified_by: r.verifiedBy || 'model',
    weight: weightOf({ verified_by: r.verifiedBy || 'model', assisted: r.assisted !== false }),
    item_id: r.itemId || null,
    misconception_id: r.misconceptionId || null,
    context_tag: r.contextTag || null,
    latency_ms: Number.isFinite(Number(r.latencyMs)) ? Math.round(Number(r.latencyMs)) : null,
    predicted_correct: typeof r.predictedCorrect === 'boolean' ? r.predictedCorrect : null,
    source_ref: r.sourceRef || null,
    meta: r.meta || {},
  }));

  const { data, error } = await svc.from('evidence').insert(payload).select('id,kc_id');
  if (error) throw new Error(`evidence append failed: ${error.message}`);
  return data || [];
}

/** All evidence for a learner, optionally scoped to specific KCs. */
export async function readEvidence(svc, userId, kcIds = null) {
  let q = svc.from('evidence').select(EVIDENCE_COLUMNS).eq('user_id', userId);
  if (Array.isArray(kcIds) && kcIds.length) q = q.in('kc_id', kcIds);
  const { data, error } = await q.order('at', { ascending: true }).limit(5000);
  if (error) throw new Error(`evidence read failed: ${error.message}`);
  return data || [];
}

function groupByKc(rows) {
  const out = new Map();
  for (const r of rows) {
    if (!out.has(r.kc_id)) out.set(r.kc_id, []);
    out.get(r.kc_id).push(r);
  }
  return out;
}

/**
 * Recompute kc_estimate for a learner from the ledger.
 *
 * This is the ONLY writer of kc_estimate. Call it after any append. It is
 * idempotent and safe to run repeatedly — which is what makes a scheduler
 * version bump a background job rather than a migration.
 */
export async function recomputeEstimates(svc, userId, { kcIds = null, now = Date.now() } = {}) {
  const scheduler = activeScheduler();
  const evidence = await readEvidence(svc, userId, kcIds);
  const byKc = groupByKc(evidence);

  // KCs with an existing estimate but no (remaining) evidence still need a row
  // recomputed, or a deleted-evidence correction would leave a stale number.
  if (Array.isArray(kcIds)) for (const id of kcIds) if (!byKc.has(id)) byKc.set(id, []);

  // Explicit delay floors (0030). A post-tutoring-session check is deliberately
  // scheduled late; recompute used to overwrite that from the ledger, so the
  // next practice attempt erased it. Floors are honoured as a lower bound.
  const floors = new Map();
  {
    const ids = [...byKc.keys()];
    if (ids.length) {
      const { data: existing } = await svc.from('kc_estimate')
        .select('kc_id,check_floor_at')
        .eq('user_id', userId).in('kc_id', ids);
      for (const r of existing || []) {
        const t = r.check_floor_at ? new Date(r.check_floor_at).getTime() : 0;
        if (t) floors.set(r.kc_id, t);
      }
    }
  }

  const rows = [];
  for (const [kcId, rowsForKc] of byKc) {
    // `last_instruction_at` gates the minimum instruction→check delay
    // (mastery.minDelayMs, 48h) before a check may confirm. Instruction
    // means assisted contact, not any contact.
    const lastInstruction = rowsForKc
      .filter((e) => e.assisted && ['chat_signal', 'practice'].includes(e.kind))
      .reduce((acc, e) => Math.max(acc, new Date(e.at).getTime() || 0), 0) || null;

    const est = scheduler.estimate(rowsForKc, { now });
    const sched = scheduler.schedule(rowsForKc, {
      now,
      lastInstructionAt: lastInstruction ? new Date(lastInstruction).toISOString() : null,
    });

    // Dependency alarm: assistance should fall as competence rises. A flat or
    // rising dose slope on a KC with material working mastery means the learner
    // is leaning on the system rather than outgrowing it.
    const humanRecommended =
      (est.doseSlope != null && est.doseSlope >= 0 && est.working > 0.3 && est.confirmed < 0.5)
      || consecutiveUnassistedFailures(rowsForKc) >= 3;

    rows.push({
      user_id: userId,
      kc_id: kcId,
      working: est.working,
      confirmed: est.confirmed,
      confidence: est.confidence,
      dose_slope: est.doseSlope,
      assistance_dose_total: rowsForKc.reduce((a, e) => a + (Number(e.assistance_dose) || 0), 0),
      learner_elo: deriveElo(rowsForKc, scheduler),
      next_review_at: sched.nextReviewAt ? new Date(sched.nextReviewAt).toISOString() : null,
      // An explicit floor can only push the check LATER, never earlier.
      next_check_at: (() => {
        const computed = sched.nextCheckAt ? new Date(sched.nextCheckAt).getTime() : null;
        const floor = floors.get(kcId) || null;
        if (!computed && !floor) return null;
        return new Date(Math.max(computed || 0, floor || 0)).toISOString();
      })(),
      contexts_seen: est.contextsSeen || [],
      last_instruction_at: lastInstruction ? new Date(lastInstruction).toISOString() : null,
      human_recommended: Boolean(humanRecommended),
      scheduler_version: scheduler.version,
      computed_at: new Date(now).toISOString(),
    });
  }

  if (!rows.length) return [];
  const { error } = await svc.from('kc_estimate').upsert(rows, { onConflict: 'user_id,kc_id' });
  if (error) throw new Error(`estimate write failed: ${error.message}`);
  return rows;
}

// Replay Elo from the ledger so the rating is reproducible rather than an
// accumulated side effect. Slower than incremental updating, but it keeps the
// "estimates are a pure function of the ledger" invariant true.
function deriveElo(rows, scheduler) {
  let learnerElo = 1200;
  let n = 0;
  for (const e of rows) {
    if (e.outcome == null || !e.item_id) continue;
    const r = scheduler.rate({
      learnerElo,
      itemElo: 1200,
      outcome: Number(e.outcome),
      learnerExposures: n,
      itemExposures: 0,
    });
    learnerElo = r.learnerElo;
    n++;
  }
  return learnerElo;
}

function consecutiveUnassistedFailures(rows) {
  const sorted = rows
    .filter((e) => !e.assisted && e.outcome != null)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  let n = 0;
  for (const e of sorted) {
    if (Number(e.outcome) < 0.8) n++;
    else break;
  }
  return n;
}

/**
 * Full replay for one learner. Used after a scheduler version bump and as the
 * P0 acceptance gate: every learner's derived state must reproduce from the
 * ledger alone.
 */
export async function replayLearner(svc, userId, { now = Date.now() } = {}) {
  return recomputeEstimates(svc, userId, { now });
}

/** Current estimates joined to KC metadata — the read model for UI and briefs. */
export async function readState(svc, userId) {
  const { data, error } = await svc
    .from('kc_estimate')
    .select('kc_id,working,confirmed,confidence,dose_slope,next_review_at,next_check_at,human_recommended,last_instruction_at,learner_elo,scheduler_version')
    .eq('user_id', userId);
  if (error) throw new Error(`state read failed: ${error.message}`);
  return data || [];
}
