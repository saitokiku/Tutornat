-- 0010_product_hardening.sql — product-readiness hardening (cash-flow wave).
--   · intro_redemptions: cross-account anti-farming for the free intro tutoring
--     session (previously deduped by student_id only → farmable by re-signup),
--     mirroring trial_redemptions from 0009. No user FK, so it survives account
--     deletion and no raw PII outlives the account.
-- Additive + idempotent, consistent with 0001–0009.

create table if not exists intro_redemptions (
  email_hash text primary key,
  redeemed_at timestamptz not null default now()
);
alter table intro_redemptions enable row level security;
drop policy if exists "admin intro redemptions" on intro_redemptions;
create policy "admin intro redemptions" on intro_redemptions for all using (is_admin());
-- reads/writes go through the service-role tutoring/sessions route only
