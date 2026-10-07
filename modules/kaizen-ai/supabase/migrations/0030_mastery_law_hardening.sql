-- 0030_mastery_law_hardening.sql — close the client-trust holes an adversarial
-- review of the mastery law found (docs/reviews/ENGINE_ADVERSARIAL_REVIEW.md,
-- 2026-08-13). Additive and idempotent. Run after 0029.
--
-- THE ENGINE'S CENTRAL CLAIM is that a skill counts only on unassisted,
-- verified, DELAYED, repeated evidence. Two of those four clauses turned out to
-- rest on values the browser could choose:
--
--   1. `independent_block` — whether help was available while the learner
--      worked — was decided by the server at issue time, handed to the client,
--      and then read back FROM THE CLIENT at grade time
--      (`response?.independentBlock === true`). A one-key payload relabelled
--      assisted work as unassisted: double evidence weight, and — because
--      `last_instruction_at` is derived only from assisted rows — the 48-hour
--      instruction delay collapsed to zero. This column makes the server's own
--      decision durable, so grading reads back what the server decided rather
--      than what the client claims.
--
--   2. `check_attempt` rows could be minted without limit. The delay gate is a
--      read of `kc_estimate.next_check_at` at ISSUE time, and only grading
--      moves it — so a learner could burst-issue N attempts, then grade them
--      one at a time and collect a month of spaced checks in a single sitting.
--      The partial unique index below makes "one live attempt per KC" a
--      database invariant rather than an application convention, so two
--      concurrent requests cannot both create one.
--
-- Neither column changes any existing read path: defaults match the behaviour
-- that was already in force for rows written before this migration.

-- ── 1. The server's independence decision, made durable ──────────────────────
-- Default false is the FAIL-SAFE direction: an attempt whose provenance we do
-- not know is treated as assisted, which discounts its evidence weight and
-- keeps the instruction clock running. Under-crediting a learner costs them a
-- slower path to confirmation; over-crediting sells a parent a mastery claim
-- that was never earned.
alter table item_attempt
  add column if not exists independent_block boolean not null default false;

-- ── 2. One live check attempt per learner per concept ────────────────────────
-- "Live" = issued, not yet submitted, not yet expired. Expired and submitted
-- rows fall out of the index automatically, so history is untouched and a
-- learner is never blocked by an abandoned attempt beyond its TTL.
--
-- Partial unique indexes cannot reference now(), so the predicate covers
-- unsubmitted rows only and the application supplies the expiry half
-- (lib/engine/check.js resumes a live attempt instead of minting a second).
-- That still makes stockpiling impossible: an unsubmitted attempt blocks new
-- issuance for its whole TTL, and submitting one advances next_check_at.
create unique index if not exists check_attempt_one_live_idx
  on check_attempt (user_id, kc_id)
  where submitted_at is null;

-- ── 3. A durable floor under next_check_at ───────────────────────────────────
-- /api/tutoring/observe writes a hard 36-hour delay after a human tutoring
-- session: the whole point of the return path is that the check comes LATER,
-- so passing it means retention rather than recall of what just happened. That
-- floor lived in `next_check_at`, which `recomputeEstimates` overwrites from
-- the ledger on the very next evidence append — so a few practice attempts the
-- same evening silently pulled the check back in.
--
-- The floor now has its own column that recompute respects (it takes the max),
-- so scheduling stays a pure function of the ledger PLUS explicitly recorded
-- floors, and nothing can quietly erase a deliberate delay.
alter table kc_estimate
  add column if not exists check_floor_at timestamptz;
