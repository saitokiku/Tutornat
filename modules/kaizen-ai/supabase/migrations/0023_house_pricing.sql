-- 0023_house_pricing.sql — house-set retail pricing with flat hourly tutor pay.
-- Additive and idempotent. Run after 0022.
--
-- THE MODEL CHANGE
-- Until now the 1:1 price was tutor-set ($20–50/hr, tutors_rate_bounds_check)
-- and the platform kept 11% (earningsSplit); groups paid a 75% revenue share.
-- The club sells at company-set retail ($25/30min, $45/60min; member rates by
-- plan) and pays tutors a flat hourly rate set by an admin at hiring. Payout is
-- a COST of delivering the session, decoupled from what the learner paid —
-- which is what makes $0 community sessions and membership-included seats
-- payable at all.
--
-- RECONSTRUCTIBILITY (same principle as group_session.tutor_share, 0017): the
-- payout basis is snapshotted onto every session row at booking time
-- (pay_model + tutor_pay_cents), so a historical payout is always explainable
-- from its own row. Legacy rows default to 'revenue_share' and keep computing
-- exactly as before; only new bookings write 'flat_hourly'.

-- ── What the tutor is paid ────────────────────────────────────────────────────
-- Cost rate, not a public price. NULL = admin hasn't set one yet; booking
-- falls back to 2500 ($25/hr). hourly_rate_cents and its bounds check (0008)
-- are left untouched — historical sessions reconstruct from them.
alter table tutors
  add column if not exists pay_rate_cents int
    check (pay_rate_cents between 2200 and 3000);

-- ── 1:1 sessions ──────────────────────────────────────────────────────────────
alter table tutoring_sessions
  add column if not exists pay_model text not null default 'revenue_share'
    check (pay_model in ('revenue_share','flat_hourly')),
  -- Payout snapshot at booking: pay_rate_cents × duration. Only meaningful when
  -- pay_model = 'flat_hourly'.
  add column if not exists tutor_pay_cents int,
  -- How the learner side settled. 'included' = paid by membership allowance
  -- (Complete's monthly 30-min credit); 'intro' = the free first session;
  -- 'admin' = comped by an operator.
  add column if not exists booked_via text not null default 'checkout'
    check (booked_via in ('checkout','intro','included','admin')),
  -- Who actually made the booking. NULL or = student_id for self-bookings; a
  -- parent's id when booked on behalf of a managed child.
  add column if not exists booked_by uuid references auth.users(id) on delete set null;

-- ── Group rooms ───────────────────────────────────────────────────────────────
alter table group_session
  add column if not exists pay_model text not null default 'revenue_share'
    check (pay_model in ('revenue_share','flat_hourly')),
  add column if not exists tutor_pay_cents int;

alter table group_seat
  add column if not exists booked_via text not null default 'checkout'
    check (booked_via in ('checkout','included','free','admin')),
  add column if not exists booked_by uuid references auth.users(id) on delete set null;

-- 0019 flipped default privileges closed; revokes restated because these tables
-- predate it and carry older grants.
revoke insert, update, delete on tutoring_sessions from anon, authenticated;
revoke insert, update, delete on group_seat from anon, authenticated;
