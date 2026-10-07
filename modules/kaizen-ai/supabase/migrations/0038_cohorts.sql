-- 0038_cohorts.sql — the standing seat becomes ONE object. Additive and
-- idempotent. Run after 0037.
--
-- WHY (docs/superpowers/specs/2026-09-02-wave2-geometry.md)
-- A seat is two sessions a week (clubPricing SEAT_PLAN.sessionsPerWeek = 2).
-- A series is one weekday, by construction — lib/server/series.js says so in
-- its header and the whole DST argument depends on it. So until now a seat was
-- TWO series and TWO enrolments, and the consequences reached the customer:
--
--   * The Program Director had to create a cohort twice and enrol each family
--     twice, with nothing tying the halves together.
--   * /family rendered one purchase as two unrelated "weekly places", each
--     with its own unconfirmed, one-way "End weekly place" button.
--   * No surface could say "Tuesday and Thursday, 6:00 PM, at the library" —
--     the sentence a parent needs — because no row held both days.
--   * Capacity was per-weekday, so "4 students" could mean six people across
--     two evenings.
--
-- A cohort is what a family actually buys into: a subject, a venue, a lead
-- tutor, a capacity, and the weekly series that make it up.
--
-- WHAT THIS DELIBERATELY DOES NOT DO
-- It does not change how a room is booked or metered. Enrolment still writes
-- standing_seats rows per series and the weekly sweep still books them against
-- club_seat_included; groupSeatQuote is untouched. cohort_id is NULLABLE and
-- every drop-in series keeps it null, so no existing path changes behaviour.
-- The cohort groups series; it does not replace them.

create table if not exists cohort (
  id            uuid primary key default uuid_generate_v4(),
  title         text not null,
  subject       text not null,
  -- Where the room is. The single most-asked question about an in-person
  -- product, and until Wave 2 it existed only on the instance rows.
  venue         text,
  timezone      text not null default 'America/Chicago',
  lead_tutor_id uuid references tutors(id) on delete set null,
  -- The ratio is a property of the GROUP, not of a Tuesday. Bounded like the
  -- series capacity it constrains (0024) so a cohort can never promise a room
  -- the instances cannot hold.
  capacity      int not null default 4 check (capacity between 1 and 30),
  grade_band    text check (grade_band in ('7-8','9-12','college','all')),
  active        boolean not null default true,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists cohort_active_idx on cohort (active) where active;

alter table group_session_series
  add column if not exists cohort_id uuid references cohort(id) on delete set null;
create index if not exists series_cohort_idx on group_session_series (cohort_id)
  where cohort_id is not null;

alter table cohort enable row level security;
-- Reference data for any signed-in user: a family needs to read the cohort
-- their child sits in, and the storefront reads it through the service role.
drop policy if exists "cohort readable" on cohort;
create policy "cohort readable" on cohort for select to authenticated using (true);
drop policy if exists "admin cohort" on cohort;
create policy "admin cohort" on cohort for all using (is_admin());
revoke insert, update, delete on cohort from anon, authenticated;
-- 0019 made new tables start with NO default privileges, so the select policy
-- above is inert without this grant: RLS narrows a privilege, it does not
-- create one. Today both readers (publicCohorts, mySeat) use the service role
-- and so are unaffected, which is exactly why this would have gone unnoticed
-- until the first client-side read. `anon` is deliberately not granted — the
-- storefront reads cohorts through the server, and an unauthenticated visitor
-- has no business enumerating rooms directly.
grant select on cohort to authenticated;

-- ── Verification ─────────────────────────────────────────────────────────────
-- select count(*) from cohort;
-- select c.title, count(s.id) as series
--   from cohort c left join group_session_series s on s.cohort_id = c.id
--   group by c.id, c.title;
