-- 0036_diagnostic_orders.sql — the paid placement diagnostic gets a record.
-- Additive and idempotent. Run after 0035.
--
-- WHY (docs/STRATEGY.md v0.2, docs/RELEASE_PLAN.md stage 1, spec W3)
-- The diagnostic is the first thing the Program Director sells and the top of
-- the whole funnel: a family pays once, the student sits the adaptive
-- placement, and a person writes the report. Until now it existed as a price in
-- a doc and a Stripe Payment Link in a runbook — which means the company had no
-- answer to "who bought one, did they sit it, and has anyone written it up".
--
-- ONE ROW PER PURCHASE, and the row is the whole lifecycle:
--   pending    a Checkout session exists, nothing has been paid
--   paid       the webhook saw checkout.session.completed
--   scheduled  the placement has been sat; the report is queued for a person
--   delivered  report_md is written and delivered_at is stamped
--   refunded   terminal, and it stays terminal (see the state machine in
--              web/app/api/diagnostic/route.js — a refunded order may never
--              walk forward into delivered)
--
-- WHY NOT AN ENTITLEMENT
-- Nothing here recurs and nothing is metered, so there is no plan key, no
-- plan_entitlements row and no usage_ledger feature. clubPricing.DIAGNOSTIC is
-- the price; this table is the record. Putting a one-time purchase on the
-- metering rail would make planByPrice resolve it to a subscription plan, which
-- is exactly the confusion lib/server/stripe.js ONE_TIME_PRICES exists to avoid.
--
-- WHY placement_session_id POINTS AT learning_session
-- The placement run IS a learning session (0015): it has a start, an end, an
-- item count and a policy version, and item_attempt already carries the
-- per-item record with session_ref. A parallel "placement_run" table would have
-- duplicated all of that and split the engine's own history in two.

-- ── The order ────────────────────────────────────────────────────────────────
-- amount_cents is snapshotted at purchase rather than read back from
-- clubPricing, because a refund six months from now must settle against what
-- the family actually paid, not against today's price sheet.
create table if not exists diagnostic_order (
  id                   uuid primary key default uuid_generate_v4(),
  payer_id             uuid not null references profiles(id) on delete cascade,
  student_id           uuid not null references profiles(id) on delete cascade,
  status               text not null default 'pending'
                         check (status in ('pending','paid','scheduled','delivered','refunded')),
  amount_cents         int not null default 0 check (amount_cents >= 0),
  -- UNIQUE so a replayed Stripe event can never mint a second order against one
  -- Checkout session. Nullable (an order exists before its session does), and
  -- Postgres allows many NULLs under a UNIQUE constraint, so pending orders do
  -- not collide with each other.
  stripe_session_id    text unique,
  placement_session_id uuid references learning_session(id) on delete set null,
  delivered_at         timestamptz,
  report_md            text,
  created_at           timestamptz not null default now()
);

create index if not exists diagnostic_order_payer_idx on diagnostic_order (payer_id, created_at desc);
create index if not exists diagnostic_order_student_idx on diagnostic_order (student_id, created_at desc);
-- The funnel board (spec W2) counts sold vs delivered over a window.
create index if not exists diagnostic_order_status_idx on diagnostic_order (status, created_at desc);

-- ── RLS: read your own, write nothing ────────────────────────────────────────
-- A family may READ the record of what they bought — the payer, the student
-- themself, and the parent who manages or is linked to that student. Nobody but
-- the service role or an admin may write one: the status is money truth and it
-- moves only from the Stripe webhook and the diagnostic route. Same posture as
-- group_seat and standing_seats.
--
-- managed_by AND the invite link are both honoured because they are different
-- relationships (lib/server/family.js bookingRelationship): a parent-created
-- teen has no parent_student_relationships row worth trusting, and an invited
-- parent has no managed_by. A policy carrying only one of them silently hides a
-- family's own receipt from them.
alter table diagnostic_order enable row level security;

drop policy if exists "family reads own diagnostic order" on diagnostic_order;
create policy "family reads own diagnostic order" on diagnostic_order for select to authenticated
  using (
    auth.uid() = payer_id
    or auth.uid() = student_id
    or exists (select 1 from profiles p
               where p.id = diagnostic_order.student_id and p.managed_by = auth.uid())
    or exists (select 1 from parent_student_relationships r
               where r.parent_id = auth.uid()
                 and r.student_id = diagnostic_order.student_id
                 and r.status = 'active')
  );

drop policy if exists "admin diagnostic order" on diagnostic_order;
create policy "admin diagnostic order" on diagnostic_order for all using (is_admin());

revoke insert, update, delete on diagnostic_order from anon, authenticated;

-- ── Verification ─────────────────────────────────────────────────────────────
-- select column_name, data_type from information_schema.columns
--   where table_name = 'diagnostic_order' order by ordinal_position;
-- select polname from pg_policy where polrelid = 'diagnostic_order'::regclass;
-- select status, count(*) from diagnostic_order group by status order by status;
