-- 0035_pay_band_director.sql — the pay-rate ceiling admits the Program
-- Director. Additive and idempotent. Run after 0034.
--
-- WHY (founder decision, 2026-09-02)
-- Kaizen Local's first hire is one person doing three jobs: delivering the
-- seat sessions as the credentialed tutor, running the room, and selling.
-- They are paid $50/hr, part time. tutors.pay_rate_cents is the per-session
-- delivery cost snapshotted onto every session row at booking, so the band
-- has to admit the rate the person delivering is actually paid — otherwise the
-- admin form refuses the only tutor on the roster and the earnings ledger
-- undercounts labour on every seat session.
--
-- 0023 set the band at 2200-3000, 0033 widened it to 2200-4500 for the
-- credentialed tier, and this widens the ceiling to 5000. The floor does not
-- move. web/lib/server/clubPricing.js TUTOR_PAY mirrors these bounds and
-- web/test/clubPricing.test.mjs pins them; the API route validates against the
-- code, this CHECK is the backstop.

alter table tutors drop constraint if exists tutors_pay_rate_cents_check;
alter table tutors add constraint tutors_pay_rate_cents_check
  check (pay_rate_cents is null or pay_rate_cents between 2200 and 5000);

-- ── Verification ─────────────────────────────────────────────────────────────
-- select conname, pg_get_constraintdef(oid) from pg_constraint
--   where conrelid = 'tutors'::regclass and conname = 'tutors_pay_rate_cents_check';
