-- 0029_occupancy_core.sql — occupancy-by-default, the mechanisms (gap report
-- 2026-08-13; launch plan v2 load model). Additive and idempotent. Run after 0028.
--
-- The measurement side of the occupancy model shipped in 0022–0026 (SPTH,
-- occupancy, first→second). This adds the four MECHANISMS that act on it:
--
--   1. group_waitlist — a full Hall must say "full, join the list", not vanish
--      from the storefront (demand was being vaporized by a seatsLeft>0 filter).
--   2. standing_seats — a member's recurring weekly place. Memberships were
--      floating credits; the stochastic-demand failure mode the load system
--      was designed to kill. The cron books these into materialized rooms
--      month-by-month using the included allowance (same synchronous ledger
--      discipline as any booking — never an auto-charge).
--   3. group_seat.confirmed_at — T-24h confirm / T-4h release for INCLUDED
--      seats only: an unconfirmed included seat is released back to allowance
--      + waitlist. Paid seats are never auto-released (purchased inventory).
--   4. group_session_staff (+ series co_tutor_id) — the free Community Hall
--      previously ran up to 30 minors : 1 adult. Capacity now derives from
--      staffing (8 per cleared staff member, community default 16 with two
--      staff) until the supervision review clears a different ratio
--      (docs/legal/REVIEW_QUEUE.md).
--
-- All writes go through service-role routes (0019 hygiene). RLS is enabled
-- with NO policies on the new tables — service role only, the club_interest /
-- hall_asks posture (0027/0028).

-- ── 1. Waitlist ──────────────────────────────────────────────────────────────
-- user_id is the account to notify (the booker — for a managed teen that is
-- the parent); student_id is who the seat would be for. One row per account
-- per room. Statuses: waiting → notified (a seat opened, email sent; first
-- come first served — no hold) → converted (they booked) / expired (room
-- started or cancelled) / cancelled (they left the list).
create table if not exists group_waitlist (
  id               uuid primary key default uuid_generate_v4(),
  group_session_id uuid not null references group_session(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  student_id       uuid references auth.users(id) on delete cascade,
  status           text not null default 'waiting'
    check (status in ('waiting','notified','converted','expired','cancelled')),
  notified_at      timestamptz,
  created_at       timestamptz not null default now(),
  unique (group_session_id, user_id)
);
create index if not exists group_waitlist_session_idx
  on group_waitlist (group_session_id, status, created_at);
create index if not exists group_waitlist_user_idx on group_waitlist (user_id);
alter table group_waitlist enable row level security;

-- ── 2. Standing member seats ─────────────────────────────────────────────────
-- "Same Hall, every week" as a first-class object the materializer honors.
-- user_id pays (their allowance is consumed); student_id attends. Deactivated,
-- not deleted, so "why did my Thursday stop" is always answerable.
create table if not exists standing_seats (
  id         uuid primary key default uuid_generate_v4(),
  series_id  uuid not null references group_session_series(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  ended_at   timestamptz,
  unique (series_id, student_id)
);
create index if not exists standing_seats_series_idx
  on standing_seats (series_id) where active;
create index if not exists standing_seats_user_idx on standing_seats (user_id);
alter table standing_seats enable row level security;

-- ── 3. Confirm-or-release ────────────────────────────────────────────────────
-- NULL = not yet confirmed. Set at booking when the start is <24h away (a
-- late booking IS the confirmation), by the student/parent confirm action, or
-- never — in which case the T-4h sweep releases INCLUDED seats only.
alter table group_seat add column if not exists confirmed_at timestamptz;

-- ── 4. Session staffing ──────────────────────────────────────────────────────
-- Co-tutors on a room. The lead stays group_session.tutor_id (every existing
-- read keeps working); staff rows ADD people. Community capacity derives from
-- 1 + co-staff count in code (clubPricing.communityCapacity — policy, while
-- the DB keeps only the coarse 1–30 bound).
create table if not exists group_session_staff (
  group_session_id uuid not null references group_session(id) on delete cascade,
  tutor_id         uuid not null references tutors(id) on delete cascade,
  role             text not null default 'co_tutor' check (role in ('co_tutor')),
  created_at       timestamptz not null default now(),
  primary key (group_session_id, tutor_id)
);
create index if not exists group_session_staff_tutor_idx on group_session_staff (tutor_id);
alter table group_session_staff enable row level security;

alter table group_session_series
  add column if not exists co_tutor_id uuid references tutors(id) on delete set null;

-- ── Stale defaults (truth hygiene, same additive pass) ───────────────────────
-- The series defaults still carried the pre-repricing clinic price ($18 → $20,
-- clubPricing.RETAIL.clinicSeatCents) and an Eastern timezone for an Austin
-- operation. Explicit values on existing rows are untouched.
alter table group_session_series alter column seat_price_cents set default 2000;
alter table group_session_series alter column timezone set default 'America/Chicago';
