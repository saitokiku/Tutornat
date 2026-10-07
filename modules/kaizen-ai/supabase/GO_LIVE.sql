-- GO_LIVE.sql — one-paste go-live bundle for the tutoring marketplace.
-- Paste this whole file into the Supabase SQL editor and run it once.
--
-- Contents, in order: migrations 0022 -> 0038 (club plans, house pricing,
-- class catalog, parent-managed accounts, hall operations, AI tiers +
-- interest capture, hall board, occupancy core, mastery-law hardening,
-- audit hardening, ledger close, the standing seat + credentialed tutors,
-- trellis foundations, the diagnostic order), then seed.sql (plan
-- entitlements incl. the seat), then the club_enabled flip.
--
-- SAFE TO RE-RUN: every statement is idempotent (IF NOT EXISTS / ON CONFLICT).
-- PRECONDITION: migrations 0001-0021 already applied (they are, if the AI
-- product is running against this database).
-- REMINDER: the club_enabled flip at the bottom opens real selling. The
-- counsel gates are docs/legal/REVIEW_QUEUE.md items 10-15.


-- ============================================================
-- supabase/migrations/0022_club_plans.sql
-- ============================================================

-- 0022_club_plans.sql — the Academic Club plan lineup + grade-level + managed accounts groundwork.
-- Additive and idempotent. Run after 0021.
--
-- WHAT THIS ENCODES
-- The commercial layer is repositioning around an after-school academic club
-- for students 13+ (younger grades deferred until a dedicated COPPA build):
-- three memberships (Club $45 / Plus $79 / Max $109) that include N Homework
-- Hall visits per month, plus member pricing on Subject Clinics and private
-- tutoring. This migration adds the plan keys, the grade-level field the
-- catalog filters on, the managed_by pointer that lets a parent own a teen's
-- profile, and the plan_entitlements rows the allowance engine reads.
--
-- PLAN KEYS
-- 'club' and 'max' are new. 'plus' is REUSED for the $79 hero tier: there are
-- no live subscribers to grandfather (production Stripe was never configured)
-- and the marketing name is literally "Plus". 'student' and 'family' remain
-- valid values for data continuity — planByPrice still resolves stray Stripe
-- events on old price IDs — but are no longer sold.

-- ── Plan check ────────────────────────────────────────────────────────────────
alter table profiles drop constraint if exists profiles_plan_check;
alter table profiles add constraint profiles_plan_check
  check (plan in ('free','student','plus','family','internal','club','max'));

-- subscriptions.plan has no CHECK (0001) — deliberately left that way; the
-- webhook writes only values planByPrice resolves.

-- ── Grade level ───────────────────────────────────────────────────────────────
-- Catalog/matching metadata ONLY. The learning engine must never sequence on
-- age or grade (enforced by web/test/enginePolicy.test.mjs) — this column is
-- for storefront filtering ("Grade 8 · Algebra I") and parent dashboards.
-- Service-role writable only: 0011 limits client profile updates to
-- (name, app_meta, email_opt_out, analytics_opt_out), which this inherits.
alter table profiles
  add column if not exists grade_level int check (grade_level between 1 and 12);

-- ── Managed teens ─────────────────────────────────────────────────────────────
-- A parent-created (13+) profile keeps its own auth.users row (so every
-- learner-keyed table and RLS policy works unchanged) and points back at the
-- managing parent. NULL = a normal self-owned account.
alter table profiles
  add column if not exists managed_by uuid references auth.users(id) on delete set null;
create index if not exists profiles_managed_by_idx on profiles (managed_by)
  where managed_by is not null;

-- ── Entitlements for the club lineup ─────────────────────────────────────────
-- Mirrored in supabase/seed.sql (web/test/entitlements.test.mjs pins parity
-- with DEFAULT_LIMITS in web/lib/server/context.js).
--
-- New feature keys:
--   club_hall_included  — Homework Hall visits included with membership, per
--                         calendar month (the allowance the storefront sells:
--                         4 / 8 / 12). Up to 4 unused visits roll into the
--                         next month (computed from the ledger, not stored).
--   club_private_credit — DORMANT: no current tier includes a private session;
--                         the mechanism stays seeded at 0 so a future tier can
--                         switch it on without a migration.
--   group_seat          — daily anti-abuse ceiling on ANY group booking
--                         (replaces metering group seats against 'handoff').
insert into plan_entitlements (plan, feature, daily_limit, monthly_limit) values
  -- club ($45): AI limits match the old 'student' tier — AI is included in
  -- every membership.
  ('club', 'grade',          100,  2000),
  ('club', 'tutor_message',  200,  4000),
  ('club', 'tts_chars',      30000, 600000),
  ('club', 'stt_seconds',    3600, 54000),
  ('club', 'syllabus_parse', 60,   300),
  ('club', 'report',         3,    15),
  ('club', 'courses',        8,    8),
  ('club', 'handoff',        2,    8),
  -- max ($109): AI limits match the old 'family' tier.
  ('max',  'grade',          200,  4000),
  ('max',  'tutor_message',  400,  8000),
  ('max',  'tts_chars',      60000, 1200000),
  ('max',  'stt_seconds',    7200, 108000),
  ('max',  'syllabus_parse', 150,  600),
  ('max',  'report',         6,    30),
  ('max',  'courses',        16,   16),
  ('max',  'handoff',        4,    16),
  -- club_hall_included: the membership allowance (4/8/12 Hall visits/month).
  -- Daily equals monthly so a family can front-load a busy week if they want.
  ('free',     'club_hall_included', 0,    0),
  ('student',  'club_hall_included', 0,    0),
  ('plus',     'club_hall_included', 8,    8),
  ('family',   'club_hall_included', 0,    0),
  ('internal', 'club_hall_included', 1000, null),
  ('club',     'club_hall_included', 4,    4),
  ('max',      'club_hall_included', 12,   12),
  -- club_private_credit: dormant (see header).
  ('free',     'club_private_credit', 0,    0),
  ('student',  'club_private_credit', 0,    0),
  ('plus',     'club_private_credit', 0,    0),
  ('family',   'club_private_credit', 0,    0),
  ('internal', 'club_private_credit', 1000, null),
  ('club',     'club_private_credit', 0,    0),
  ('max',      'club_private_credit', 0,    0),
  -- group_seat: how many group bookings of any kind one account can make per
  -- day. Anti-abuse, generous by design — free community sessions are real.
  ('free',     'group_seat',          3,    null),
  ('student',  'group_seat',          3,    null),
  ('plus',     'group_seat',          5,    null),
  ('family',   'group_seat',          5,    null),
  ('internal', 'group_seat',          1000, null),
  ('club',     'group_seat',          5,    null),
  ('max',      'group_seat',          5,    null)
on conflict (plan, feature) do update
  set daily_limit = excluded.daily_limit, monthly_limit = excluded.monthly_limit;

-- ============================================================
-- supabase/migrations/0023_house_pricing.sql
-- ============================================================

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

-- ============================================================
-- supabase/migrations/0024_class_catalog.sql
-- ============================================================

-- 0024_class_catalog.sql — the class catalog: session kinds, grade bands, and
-- recurring weekly series. Additive and idempotent. Run after 0023.
--
-- WHAT THIS ENCODES
-- The club's storefront sells a weekly schedule — "Algebra I Clinic · Tuesday
-- 5:00 PM" — not one-off rooms a tutor happens to host. A series row is the
-- template; an hourly cron materializes concrete group_session rows a couple
-- of weeks ahead. Three kinds of room exist:
--
--   clinic         — Subject Clinic: focused topic, 4–6 students, $18 retail /
--                    member pricing $14/$12/$10. Keeps min-fill economics.
--   homework_hall  — supervised academic work session (students work
--                    independently, tutor rotates through a help queue; NOT
--                    private-tutoring-for-several). $12 retail; membership
--                    visits (4/8/12 per month) settle it; runs for whoever
--                    shows up: min_seats 1, NO min-fill sweep. Capacity 8 per
--                    tutor — do not overload tutors to improve margin.
--   community_free — the weekly FREE Community Homework Hall ($0, up to ~30
--                    students). A permanent community product, not a trial.
--                    Also exempt from min-fill.
--
-- MIN-FILL EXEMPTION, STRUCTURALLY: resolve_group_fill (0020) only sweeps rooms
-- where cutoff_at IS NOT NULL. Hall and free rooms are created with
-- cutoff_at NULL, so they are exempt without touching the RPC.

-- ── The series template ───────────────────────────────────────────────────────
create table if not exists group_session_series (
  id uuid primary key default uuid_generate_v4(),
  -- Nullable: an admin can lay out the weekly grid before staffing it. The
  -- materializer SKIPS series with no tutor — a room nobody teaches must never
  -- become bookable.
  tutor_id uuid references tutors(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,

  title text not null,                          -- "Algebra I Clinic"
  subject text not null,                        -- Math / English / Science / Social Studies / Homework
  topic text,
  description text,
  kind text not null default 'clinic'
    check (kind in ('clinic','homework_hall','community_free')),
  grade_band text check (grade_band in ('7-8','9-12','college','all')),

  -- Weekly recurrence: one weekday, a LOCAL wall-clock time, and an IANA zone.
  -- Each instance resolves its own UTC offset, so "Tuesday 5 PM Eastern" stays
  -- 5 PM across DST transitions.
  weekday int not null check (weekday between 0 and 6),   -- 0 = Sunday
  local_start_time time not null,
  duration_minutes int not null default 60 check (duration_minutes between 30 and 120),
  timezone text not null default 'America/New_York',

  capacity int not null default 6 check (capacity between 1 and 30),
  min_seats int not null default 1 check (min_seats >= 1),
  seat_price_cents int not null default 1800 check (seat_price_cents between 0 and 10000),

  active boolean not null default true,
  starts_on date not null default current_date,
  ends_on date,

  created_at timestamptz not null default now(),
  check (min_seats <= capacity)
);
alter table group_session_series enable row level security;
drop policy if exists "admin series" on group_session_series;
create policy "admin series" on group_session_series for all using (is_admin());
-- Public schedule browsing goes through a service-role route that sanitizes
-- fields; no direct client access. (0019 defaults are closed; restated anyway.)
revoke select, insert, update, delete on group_session_series from anon, authenticated;
create index if not exists group_session_series_active_idx
  on group_session_series (active, weekday) where active;

-- ── Instances learn their kind, grade band, and origin ───────────────────────
alter table group_session
  add column if not exists kind text not null default 'clinic'
    check (kind in ('clinic','homework_hall','community_free')),
  add column if not exists grade_band text
    check (grade_band in ('7-8','9-12','college','all')),
  add column if not exists series_id uuid references group_session_series(id) on delete set null,
  -- Display metadata only; scheduled_start stays the source of truth.
  add column if not exists timezone text;

-- One instance per series per start — the materializer's idempotency backstop.
create unique index if not exists group_session_series_start_uniq
  on group_session (series_id, scheduled_start) where series_id is not null;

-- ── Relax the drop-in-era bounds ─────────────────────────────────────────────
-- 0017 assumed 2–6 paid students. The club needs $0 community seats, a $12
-- Homework Hall, and free-hall rooms up to ~30 students. Constraint names are
-- the Postgres autogenerated ones from 0017's inline checks.
alter table group_session drop constraint if exists group_session_capacity_check;
alter table group_session add constraint group_session_capacity_check
  check (capacity between 1 and 30);
alter table group_session drop constraint if exists group_session_seat_price_cents_check;
alter table group_session add constraint group_session_seat_price_cents_check
  check (seat_price_cents between 0 and 10000);

-- ============================================================
-- supabase/migrations/0025_parent_managed_accounts.sql
-- ============================================================

-- 0025_parent_managed_accounts.sql — provenance for parent-created links.
-- Additive and idempotent. Run after 0024.
--
-- The original family flow is student-first: the student signs up, the parent
-- invites them by email, the student accepts. The club funnel is parent-first:
-- the parent creates a managed child profile (profiles.managed_by, 0022) and
-- the relationship is born 'active' — there is no child to ask, the parent IS
-- the guardian, and consent is recorded at creation (guardian_consent_at).
--
-- created_via records which path made the link, so support and safety reviews
-- can distinguish "child accepted an invite" from "parent created this child".
-- Writes remain service-role only: the client INSERT policy (0011) still
-- requires status='pending', which managed links never are.

alter table parent_student_relationships
  add column if not exists created_via text not null default 'invite'
    check (created_via in ('invite','managed'));

-- ============================================================
-- supabase/migrations/0026_hall_operations.sql
-- ============================================================

-- 0026_hall_operations.sql — the Homework Hall operating model (launch plan v2 §3).
-- Additive and idempotent. Run after 0025.
--
-- A Hall is NOT "get in a room and hope": every seat carries a structured
-- intake (what are you working on, where are you stuck, what does done look
-- like), a live help status the student flips during the session (the tutor
-- works the room Red → Yellow → Green), and an exit summary the tutor writes
-- at the end — what got done, what's left, and a concrete next-step
-- recommendation (rebook / clinic / private). Together these three fields ARE
-- v1 of the evidence ledger: proof of what happened in the session, per
-- student, without a new platform.
--
-- All writes go through service-role routes (0019 hygiene: no client
-- insert/update grants on group_seat), so shapes are validated in
-- app/api/tutoring/group/* — the DB pins only the coarse invariants.

-- What the student is bringing, captured at booking:
--   { subject, topic, stuck, goal } — all short strings. The legacy free-text
-- `bring` column stays for old rows and as the composed fallback.
alter table group_seat add column if not exists intake jsonb;

-- Live queue state during the session. green = working fine · yellow = check
-- on me when you can · red = blocked, can't proceed. Timestamp orders equal
-- colors first-raised-first-served.
alter table group_seat add column if not exists help_status text not null default 'green'
  check (help_status in ('green','yellow','red'));
alter table group_seat add column if not exists help_status_at timestamptz;

-- Tutor-authored exit summary:
--   { accomplished, remaining, understood, recommendation, note }
-- recommendation ∈ rebook | clinic | private (enforced in the route — it also
-- drives the "what next" email/UI). Attendance itself reuses seat status
-- ('attended' / 'no_show', 0017).
alter table group_seat add column if not exists exit jsonb;

-- ============================================================
-- supabase/migrations/0027_ai_tiers_and_interest.sql
-- ============================================================

-- 0027: AI ladder tiers + interest capture (Weekly Rhythm redesign, spec
-- docs/superpowers/specs/2026-08-12-weekly-rhythm-marketing-redesign-design.md)
--
-- 1) profiles.plan must accept the new sellable tiers, or the Stripe webhook's
--    plan flip violates the CHECK the moment the first AI subscription lands.
alter table profiles drop constraint if exists profiles_plan_check;
alter table profiles add constraint profiles_plan_check
  check (plan in ('free','student','plus','family','internal','club','max','ai_solo','ai_hall'));

-- 2) club_interest — backs the "hear first when booking opens" promise on the
--    held storefront. Written only by the service role from
--    POST /api/club/interest; the send is a manual founder action (Resend).
--    NULLS NOT DISTINCT: the general forms submit kind = NULL, and without it
--    Postgres treats every NULL as unique — repeat submissions would insert
--    unbounded duplicate rows and ON CONFLICT would never fire.
create table if not exists club_interest (
  id          uuid primary key default uuid_generate_v4(),
  email       text not null check (char_length(email) between 5 and 320),
  kind        text,           -- session kind or plan key the visitor asked about
  source      text,           -- page that captured it: '/', '/schedule', '/pricing', ...
  created_at  timestamptz not null default now(),
  unique nulls not distinct (email, kind)
);
alter table club_interest enable row level security;
-- No policies on purpose: RLS denies clients everything; only the service
-- role (which bypasses RLS) inserts and reads.

-- 3) AI ladder entitlements (clubPricing.js AI_PLANS: ai_solo $11.99, ai_hall
--    $24.99). Club-level AI limits, no club perks; the tiers differ on the
--    human session, not the AI. Ladder is monotone (free ≤ ai ≤ club on every
--    AI feature — entitlements.test.mjs pins this against DEFAULT_LIMITS).
--    ai_hall's single monthly Homework Hall visit rides the existing
--    club_hall_included allowance; rollover is club-only (hallRolloverAllowed).
insert into plan_entitlements (plan, feature, daily_limit, monthly_limit) values
  ('ai_solo', 'grade',              100,   2000),
  ('ai_solo', 'tutor_message',      200,   4000),
  ('ai_solo', 'tts_chars',          30000, 600000),
  ('ai_solo', 'stt_seconds',        3600,  54000),
  ('ai_solo', 'syllabus_parse',     30,    150),
  ('ai_solo', 'report',             3,     15),
  ('ai_solo', 'courses',            8,     8),
  ('ai_solo', 'handoff',            2,     8),
  ('ai_solo', 'group_seat',         2,     null),
  ('ai_hall', 'grade',              100,   2000),
  ('ai_hall', 'tutor_message',      200,   4000),
  ('ai_hall', 'tts_chars',          30000, 600000),
  ('ai_hall', 'stt_seconds',        3600,  54000),
  ('ai_hall', 'syllabus_parse',     30,    150),
  ('ai_hall', 'report',             3,     15),
  ('ai_hall', 'courses',            8,     8),
  ('ai_hall', 'handoff',            2,     8),
  ('ai_hall', 'group_seat',         2,     null),
  ('ai_solo', 'club_hall_included', null,  0),
  ('ai_solo', 'club_private_credit', null, 0),
  ('ai_hall', 'club_hall_included', null,  1),
  ('ai_hall', 'club_private_credit', null, 0)
on conflict (plan, feature) do update
  set daily_limit = excluded.daily_limit, monthly_limit = excluded.monthly_limit;

-- ============================================================
-- supabase/migrations/0028_hall_board.sql
-- ============================================================

-- 0028_hall_board.sql — the Community Hall vote board (founder spec, 2026-08-12).
-- Additive and idempotent. Run after 0027.
--
-- One shared feed per Hall: every student ask is compressed by a fast-tier
-- router and either joins an existing topic "party" (that's the vote) or
-- founds a new one. The tutor sees parties ranked by DISTINCT student voters
-- ("12 of 19 want quadratics") and works the room democratically, hottest
-- first, marking parties covered as they go.
--
-- All writes go through service-role routes (app/api/tutoring/hall): the API
-- validates seat authorization, rate limits, and the router contract; RLS
-- keeps clients out entirely, matching 0027's club_interest posture.

create table if not exists hall_topics (
  id               uuid primary key default uuid_generate_v4(),
  group_session_id uuid not null references group_session(id) on delete cascade,
  title            text not null check (char_length(title) between 2 and 60),
  status           text not null default 'open' check (status in ('open','covered')),
  created_at       timestamptz not null default now()
);
create index if not exists hall_topics_session_idx on hall_topics (group_session_id);
alter table hall_topics enable row level security;

create table if not exists hall_asks (
  id               uuid primary key default uuid_generate_v4(),
  group_session_id uuid not null references group_session(id) on delete cascade,
  topic_id         uuid not null references hall_topics(id) on delete cascade,
  student_id       uuid not null references auth.users(id) on delete cascade,
  text             text not null check (char_length(text) between 1 and 400),
  created_at       timestamptz not null default now()
);
create index if not exists hall_asks_session_idx on hall_asks (group_session_id);
create index if not exists hall_asks_topic_idx on hall_asks (topic_id);
alter table hall_asks enable row level security;
-- No policies on purpose: service role only, like club_interest (0027).

-- ============================================================
-- supabase/migrations/0029_occupancy_core.sql
-- ============================================================

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

-- ============================================================
-- supabase/migrations/0030_mastery_law_hardening.sql
-- ============================================================

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

-- ============================================================
-- supabase/migrations/0031_audit_hardening.sql
-- ============================================================

-- 0031_audit_hardening.sql — schema fixes from the 2026-08-18 full-repo audit
-- (docs/reviews/FULL_CODE_REVIEW_2026-08-18.md). Additive and idempotent.
-- Run after 0030.
--
-- Four defects, all of them the kind that only shows up under a race, a
-- cancellation, or a deletion — which is to say, in production and not in tests:
--
--   1. CROSS-USER DATA LOSS. tutors.user_id and group_session.tutor_id both
--      cascaded from auth.users, so one tutor deleting their own account erased
--      every room they had taught AND every other student's seat in those rooms
--      — including stripe_payment_intent_id and refund_status. Kaizen is the
--      merchant of record; those rows are the refund and dispute ledger. The FKs
--      below stop the cascade at the database, and the route refuses earlier
--      with a message a human can act on.
--
--   2. REBOOKING WAS PERMANENTLY BLOCKED. unique(group_session_id, student_id)
--      is unconditional and claim_group_seat did ON CONFLICT DO NOTHING, so any
--      cancelled seat — user cancel, abandoned checkout, Stripe error rollback,
--      or the T-4h release 0029 introduced — made that room un-rebookable
--      forever, answering "already_booked". The waitlist and release emails were
--      inviting people into a guaranteed failure. The RPC now RE-ARMS a
--      cancelled row instead of ignoring it.
--
--   3. DOUBLE TUTOR PAYOUTS. Group rooms have had a unique index on
--      tutor_earnings(group_session_id) since 0017; the 1:1 side never got the
--      equivalent, so a double-clicked "Complete" could accrue twice.
--
--   4. CHECK LOCKOUT (regression from 0030). The one-live-attempt index is
--      predicated on submitted_at IS NULL with no expiry clause — partial
--      indexes cannot call now() — but issueCheck only resumes attempts that
--      have not expired. After the 1-hour TTL the resume found nothing, the
--      insert hit the unique violation, and the learner was locked out of that
--      concept permanently. Expiring a stale attempt is now a database
--      function the route can call, so the fix cannot drift from the index.

-- ── 1. Money records survive account deletion ────────────────────────────────
-- RESTRICT rather than SET NULL: both columns are NOT NULL and carry the
-- identity the payout and refund story depends on. Deletion is not blocked
-- forever — it is blocked until a human offboards the tutor (reassign or cancel
-- their rooms), which is exactly the review a real business wants there.
alter table tutors drop constraint if exists tutors_user_id_fkey;
alter table tutors add constraint tutors_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete restrict;

alter table group_session drop constraint if exists group_session_tutor_id_fkey;
alter table group_session add constraint group_session_tutor_id_fkey
  foreign key (tutor_id) references tutors(id) on delete restrict;

-- A student's own seat rows still go with their account (their data, their
-- right) — but only once the API has confirmed none of them carry money.
-- app/api/account/delete/route.js refuses while settled seats or earnings exist.

-- ── 2. A cancelled seat can be rebooked ──────────────────────────────────────
create or replace function claim_group_seat(
  p_session uuid, p_student uuid, p_amount int, p_consent boolean, p_bring text
) returns table (seat_id uuid, seats_taken int, capacity int, outcome text)
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  v_cap int;
  v_status text;
  v_taken int;
  v_seat uuid;
begin
  -- Lock the room row first: everything below reads a consistent picture.
  select gs.capacity, gs.status into v_cap, v_status
  from group_session gs where gs.id = p_session for update;

  if v_cap is null then
    return query select null::uuid, 0, 0, 'not_found'; return;
  end if;
  if v_status not in ('open','confirmed') then
    return query select null::uuid, 0, v_cap, 'closed'; return;
  end if;

  select count(*)::int into v_taken
  from group_seat s
  where s.group_session_id = p_session and s.status in ('pending_payment','booked','attended');

  if v_taken >= v_cap then
    return query select null::uuid, v_taken, v_cap, 'full'; return;
  end if;

  -- The conflict target is a seat this student already holds in this room. If
  -- it is CANCELLED, this is a rebooking and the row is re-armed to a fresh
  -- hold; every field carrying the previous attempt's money, provenance or
  -- session history is reset so nothing leaks across bookings. If the seat is
  -- live, the WHERE fails, no row comes back, and the caller gets
  -- 'already_booked' exactly as before.
  insert into group_seat (group_session_id, student_id, amount_cents, guardian_consent, bring)
  values (p_session, p_student, p_amount, p_consent, p_bring)
  on conflict (group_session_id, student_id) do update
    set status                     = 'pending_payment',
        amount_cents               = excluded.amount_cents,
        guardian_consent           = excluded.guardian_consent,
        bring                      = excluded.bring,
        paid                       = false,
        -- NOT NULL default 'checkout' (0023) — a re-armed row is a fresh
        -- unsettled hold, and the booking route overwrites this the moment it
        -- settles (free/included set it explicitly). Writing null here raised
        -- 23502 and turned every rebooking into a 500.
        booked_via                 = 'checkout',
        booked_by                  = null,
        confirmed_at               = null,
        refund_status              = 'none',
        stripe_checkout_session_id = null,
        stripe_payment_intent_id   = null,
        reminder_sent_at           = null,
        intake                     = null,
        exit                       = null,
        help_status                = 'green',
        help_status_at             = null,
        created_at                 = now()
    where group_seat.status = 'cancelled'
  returning id into v_seat;

  if v_seat is null then
    return query select null::uuid, v_taken, v_cap, 'already_booked'; return;
  end if;

  return query select v_seat, v_taken + 1, v_cap, 'claimed';
end $$;
revoke all on function claim_group_seat(uuid, uuid, int, boolean, text) from public, anon, authenticated;
grant execute on function claim_group_seat(uuid, uuid, int, boolean, text) to service_role;

-- ── 3. One earnings row per 1:1 session ──────────────────────────────────────
-- Mirrors 0017's group_session_id index. Partial because the column is null on
-- every group-room earnings row.
create unique index if not exists tutor_earnings_session_idx
  on tutor_earnings (tutoring_session_id)
  where tutoring_session_id is not null;

-- ── 4. Expiring a stale check attempt ────────────────────────────────────────
-- Stamping submitted_at (with a null score, which is how a graded attempt is
-- told apart from an abandoned one) drops the row out of the partial unique
-- index from 0030 without deleting history. SECURITY DEFINER so the engine can
-- call it with the service role and nothing else can.
create or replace function expire_stale_check_attempts(p_user uuid, p_kc uuid)
  returns int
  language sql
  security definer
  set search_path = public, pg_temp
as $$
  with expired as (
    update check_attempt
       set submitted_at = expires_at
     where user_id = p_user
       and kc_id = p_kc
       and submitted_at is null
       and expires_at <= now()
    returning 1
  )
  select count(*)::int from expired;
$$;
revoke all on function expire_stale_check_attempts(uuid, uuid) from public, anon, authenticated;
grant execute on function expire_stale_check_attempts(uuid, uuid) to service_role;

-- ============================================================
-- supabase/migrations/0032_ledger_close.sql
-- ============================================================

-- 0032_ledger_close.sql — close the last privilege the selling law leaves open.
-- Additive and idempotent. Run after 0031.
--
-- NOTHING HERE IS EXPLOITABLE TODAY, and saying so first is the point: this is
-- the same defence-in-depth argument 0019 made, applied to the one table 0019
-- exempted by mistake.
--
-- 0019 revoked client INSERT/UPDATE/DELETE from every table whose privileges
-- provably disagreed with its policies, and listed the tables it deliberately
-- left alone under a single rationale: "Those ARE client-synced by design and
-- carry `auth.uid() = user_id` policies; revoking would break sync."
--
-- That rationale is true of `courses`, `homework_items`, `practice_sets` and
-- the rest of the localStorage-backed working copy. It is NOT true of
-- `app_settings`, which is in the list anyway. That table:
--
--   * has no user_id column and therefore no `auth.uid() = user_id` policy —
--     its only two policies are `settings readable` (SELECT, to everyone) and
--     `admin settings` (ALL, gated on is_admin()), both from 0001;
--   * is never written by a browser. The one client reference in the entire
--     codebase is components/LoginPage.js reading `signups_enabled` before a
--     session exists (which is why 0011 kept it anon-READABLE). Every write
--     goes through /api/admin/settings with the service role;
--   * holds `club_enabled` — the fail-closed switch that gates the schedule,
--     the tutor directory, booking, and membership checkout. CLAUDE.md rule 4
--     and docs/legal/REVIEW_QUEUE.md items 10-15 are enforced through this one
--     boolean.
--
-- So the grant is inert (RLS denies the write, is_admin() is false for a
-- learner) and it is also the highest-consequence inert grant in the schema:
-- one carelessly-permissive policy on this table — the kind 0011 and 0019 were
-- both written to clean up after — and a browser with the anon key flips
-- selling on. The privilege should not be sitting there waiting for that
-- mistake. Stated twice, the way every other money-bearing table already is.
--
-- SELECT is re-granted explicitly below rather than merely left alone, so the
-- signup kill switch keeps working and the intent is legible without having to
-- reconstruct it from 0011.

-- ── app_settings: read-only to the browser, service-role to write ────────────
revoke insert, update, delete on app_settings from anon, authenticated;
grant select on app_settings to anon, authenticated;

-- The standing audit from 0019 is the check that this held:
--   select * from admin_client_writable_tables where table_name = 'app_settings';
-- Zero rows is the expected result from here on.

-- ============================================================
-- supabase/migrations/0033_standing_seat.sql
-- ============================================================

-- 0033_standing_seat.sql — the standing seat, the seat room kind, in-person
-- venues, and the credentialed-tutor tier. Additive and idempotent. Run after 0032.
--
-- WHAT THIS ENCODES (docs/STRATEGY.md v0.2 §5.1, §7.4)
-- Kaizen Local sells one recurring product: a reserved, recurring, in-person
-- tutoring place — 2 × 75 min a week, ratio 1:4, a named tutor — at one price
-- for every payer. The memberships in 0022 are retired from sale (their rows
-- stay: /terms discloses them and the allowance engine is the rail the seat
-- reuses). Every public payment rail requires credentialed tutors, so the
-- tutor row learns what it never captured: what credential, where, and whether
-- the tutor has been fingerprinted.
--
-- PLAN KEY
-- 'seat'. Metered on a new feature, club_seat_included (9/month, calendar
-- month, no rollover — same no-stored-value posture as club_hall_included).
--
-- ROOM KIND
-- 'standing_seat' on both the series template and the instance. Seat rooms are
-- RESERVED inventory: lib/server/clubPricing.groupSeatQuote answers 'reserved'
-- for anyone but a seat holder with sessions left, the claim route refuses that
-- mode, and lib/server/publicSchedule hides the kind from the public board.
-- Capacity defaults to the seat's ratio (4); the existing 1–30 CHECK holds.

-- ── Plan check ────────────────────────────────────────────────────────────────
alter table profiles drop constraint if exists profiles_plan_check;
alter table profiles add constraint profiles_plan_check
  check (plan in ('free','student','plus','family','internal','club','max','ai_solo','ai_hall','seat'));

-- ── Room kind, template and instance ─────────────────────────────────────────
alter table group_session_series drop constraint if exists group_session_series_kind_check;
alter table group_session_series add constraint group_session_series_kind_check
  check (kind in ('clinic','homework_hall','community_free','standing_seat'));

alter table group_session drop constraint if exists group_session_kind_check;
alter table group_session add constraint group_session_kind_check
  check (kind in ('clinic','homework_hall','community_free','standing_seat'));

-- ── Venue: the in-person concept the schema never had ────────────────────────
-- NULL = online (the Daily room, as before). A seat is in person by definition;
-- Halls and Clinics may be either. Free text on purpose: "Cedar Park library,
-- room B" is the whole record, and a venues table before there are two venues
-- is a table with one row.
alter table group_session_series add column if not exists venue text;
alter table group_session add column if not exists venue text;

-- ── Seat entitlements ─────────────────────────────────────────────────────────
-- Mirrored in supabase/seed.sql and web/lib/server/context.js DEFAULT_LIMITS
-- (web/test/entitlements.test.mjs pins the parity).
insert into plan_entitlements (plan, feature, daily_limit, monthly_limit) values
  ('seat', 'grade',               200,   4000),
  ('seat', 'tutor_message',       400,   8000),
  ('seat', 'tts_chars',           60000, 1200000),
  ('seat', 'stt_seconds',         7200,  108000),
  ('seat', 'syllabus_parse',      150,   600),
  ('seat', 'report',              6,     30),
  ('seat', 'courses',             16,    16),
  ('seat', 'handoff',             4,     16),
  ('seat', 'club_hall_included',  0,     0),
  ('seat', 'club_private_credit', 0,     0),
  ('seat', 'group_seat',          5,     null),
  ('seat', 'club_seat_included',  9,     9)
on conflict (plan, feature) do update
  set daily_limit = excluded.daily_limit, monthly_limit = excluded.monthly_limit;

-- ── The credentialed tutor ───────────────────────────────────────────────────
-- What the rails ask for (STRATEGY §7.4; REVIEW_QUEUE item 19): a teaching
-- licence in any state, postsecondary teaching, current/retired staff of an
-- accredited school, or (529 only) a subject-matter expert — plus fingerprinting
-- on TEFA. None of this is a background check, and the product's copy must keep
-- saying so (web/test/claims.test.mjs). credential_ref is a licence/certificate
-- number or an employer, never a document; documents live in storage under the
-- retention schedule.
alter table tutors add column if not exists credential_kind text not null default 'none'
  check (credential_kind in ('none','teaching_license','postsecondary_teaching','accredited_school_staff','subject_expert'));
alter table tutors add column if not exists credential_state text;   -- issuing state, e.g. 'TX'
alter table tutors add column if not exists credential_ref text;
alter table tutors add column if not exists credential_verified_at timestamptz;
alter table tutors add column if not exists fingerprinted_at timestamptz;

-- Pay band widened for the credentialed tier (0033). Superseded a few blocks
-- below by 0035, which raises the ceiling to 5000 for the Program Director;
-- both statements are idempotent and the later one wins.
alter table tutors drop constraint if exists tutors_pay_rate_cents_check;
alter table tutors add constraint tutors_pay_rate_cents_check
  check (pay_rate_cents is null or pay_rate_cents between 2200 and 4500);

-- ── Verification ─────────────────────────────────────────────────────────────
-- select plan, feature, monthly_limit from plan_entitlements where plan = 'seat' order by feature;
-- select column_name from information_schema.columns where table_name = 'tutors' and column_name like 'credential%';


-- ============================================================
-- supabase/migrations/0034_trellis_foundations.sql
-- ============================================================

-- 0034_trellis_foundations.sql — the mastery record becomes immutable in the
-- database, and the knowledge lattice learns which standards its nodes align
-- to. Additive and idempotent. Run after 0033.
--
-- WHY (docs/STRATEGY.md v0.2 §4.4)
-- "Append-only" was a code convention: 0013 revoked client writes and no code
-- path updates or deletes evidence, but nothing in the database said so. A
-- record that a ministry or a college is asked to trust has to be immutable by
-- construction, not by discipline. And the lattice (kc + kc_edge, 0012) carried
-- a `standards` jsonb column with zero readers and zero values; a typed
-- crosswalk keyed by CASE identifier is what a portable, standards-aligned
-- export (Open Badges 3.0 achievement.alignment) actually needs.
--
-- WHAT THIS DOES NOT DO
-- It does not block DELETE. Account deletion cascades from auth.users (0013)
-- and the retention schedule (docs/compliance/RETENTION.md) both remove rows
-- as a whole; a trigger that raised on DELETE would break a legal duty to make
-- an operational one true. Rows cannot be ALTERED; they can be removed with
-- the person they belong to. Corrections are new rows that point at the row
-- they adjust.

-- ── Evidence: corrections are new rows ───────────────────────────────────────
alter table evidence add column if not exists adjusts_evidence_id uuid
  references evidence(id) on delete set null;
create index if not exists evidence_adjusts_idx on evidence (adjusts_evidence_id)
  where adjusts_evidence_id is not null;

-- ── Evidence: immutable by construction ──────────────────────────────────────
create or replace function evidence_is_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'evidence is append-only: row % may not be updated. Append a correcting row with adjusts_evidence_id = %.',
    old.id, old.id
    using errcode = 'restrict_violation';
end;
$$;

drop trigger if exists evidence_append_only on evidence;
create trigger evidence_append_only
  before update on evidence
  for each row execute function evidence_is_append_only();

-- ── The standards crosswalk ──────────────────────────────────────────────────
-- One row per (knowledge component, framework, code). TEA publishes TEKS in
-- 1EdTech CASE format (teks.texasgateway.org); case_uri is that identifier when
-- known, so an exported credential can point at the standard itself rather than
-- at our label for it. `alignment` is the CASE vocabulary: exact / partial /
-- broad. Readable by any signed-in user (it is reference data, like kc_edge);
-- writable by admins only.
create table if not exists kc_standard (
  id         uuid primary key default uuid_generate_v4(),
  kc_id      uuid not null references kc(id) on delete cascade,
  framework  text not null check (framework in ('TEKS','CCSS')),
  code       text not null,
  case_uri   text,
  alignment  text not null default 'exact' check (alignment in ('exact','partial','broad')),
  created_at timestamptz not null default now(),
  unique (kc_id, framework, code)
);
create index if not exists kc_standard_kc_idx on kc_standard (kc_id);
create index if not exists kc_standard_code_idx on kc_standard (framework, code);

alter table kc_standard enable row level security;
drop policy if exists "kc standard readable" on kc_standard;
create policy "kc standard readable" on kc_standard for select to authenticated using (true);
drop policy if exists "admin kc standard" on kc_standard;
create policy "admin kc standard" on kc_standard for all using (is_admin());
revoke insert, update, delete on kc_standard from anon, authenticated;

-- ── Verification ─────────────────────────────────────────────────────────────
-- select tgname from pg_trigger where tgrelid = 'evidence'::regclass and tgname = 'evidence_append_only';
-- select count(*) from kc_standard;


-- ============================================================
-- supabase/migrations/0035_pay_band_director.sql
-- ============================================================

-- The pay-rate ceiling admits the Program Director ($50/hr): the first hire
-- delivers the seat sessions as the credentialed tutor, and pay_rate_cents is
-- the per-session delivery cost snapshotted at booking. Mirrors
-- clubPricing.TUTOR_PAY (min 2200, max 5000).
alter table tutors drop constraint if exists tutors_pay_rate_cents_check;
alter table tutors add constraint tutors_pay_rate_cents_check
  check (pay_rate_cents is null or pay_rate_cents between 2200 and 5000);


-- ============================================================
-- supabase/seed.sql
-- ============================================================

-- Kaizen AI — seed data
-- Run AFTER creating your first users via Supabase Auth (signup in the app),
-- then promote your own account:
--   update profiles set role = 'admin', plan = 'internal' where email = 'you@kaizenedu.net';

-- Plan entitlements (daily limits; null = unlimited)
insert into plan_entitlements (plan, feature, daily_limit, monthly_limit) values
  -- `grade` is a paid Claude call (0-5 scoring of a session transcript). It had
  -- no entitlement row and no code default, so it was uncapped; these mirror
  -- DEFAULT_LIMITS in web/lib/server/context.js.
  ('free',     'grade',          20,   300),
  ('student',  'grade',          100,  2000),
  ('plus',     'grade',          200,  4000),
  ('family',   'grade',          200,  4000),
  ('internal', 'grade',          100000, null),
  ('free',     'tutor_message',  40,   600),
  ('free',     'tts_chars',      5000, 100000),
  ('free',     'stt_seconds',    600,  6000),
  ('free',     'syllabus_parse', 10,   40),
  ('free',     'report',         1,    5),
  ('free',     'courses',        2,    2),
  ('free',     'handoff',        1,    2),
  ('student',  'tutor_message',  200,  4000),
  ('student',  'tts_chars',      30000, 600000),
  ('student',  'stt_seconds',    3600, 54000),
  ('student',  'syllabus_parse', 60,   300),
  ('student',  'report',         3,    15),
  ('student',  'courses',        8,    8),
  ('student',  'handoff',        2,    8),
  ('plus',     'tutor_message',  400,  8000),
  ('plus',     'tts_chars',      60000, 1200000),
  ('plus',     'stt_seconds',    7200, 108000),
  ('plus',     'syllabus_parse', 150,  600),
  ('plus',     'report',         5,    25),
  ('plus',     'courses',        12,   12),
  ('plus',     'handoff',        4,    16),
  ('family',   'tutor_message',  400,  8000),
  ('family',   'tts_chars',      60000, 1200000),
  ('family',   'stt_seconds',    7200, 108000),
  ('family',   'syllabus_parse', 150,  600),
  ('family',   'report',         6,    30),
  ('family',   'courses',        16,   16),
  ('family',   'handoff',        4,    16),
  ('internal', 'tutor_message',  100000, null),
  ('internal', 'tts_chars',      10000000, null),
  ('internal', 'stt_seconds',    1000000, null),
  ('internal', 'syllabus_parse', 1000, null),
  ('internal', 'report',         1000, null),
  ('internal', 'courses',        1000, null),
  ('internal', 'handoff',        1000, null),
  -- Club lineup (0022): club/max AI limits mirror student/family — AI is
  -- included in every membership. 'plus' is reused as the $69 hero tier.
  ('club', 'grade',          100,  2000),
  ('club', 'tutor_message',  200,  4000),
  ('club', 'tts_chars',      30000, 600000),
  ('club', 'stt_seconds',    3600, 54000),
  ('club', 'syllabus_parse', 60,   300),
  ('club', 'report',         3,    15),
  ('club', 'courses',        8,    8),
  ('club', 'handoff',        2,    8),
  ('max',  'grade',          200,  4000),
  ('max',  'tutor_message',  400,  8000),
  ('max',  'tts_chars',      60000, 1200000),
  ('max',  'stt_seconds',    7200, 108000),
  ('max',  'syllabus_parse', 150,  600),
  ('max',  'report',         6,    30),
  ('max',  'courses',        16,   16),
  ('max',  'handoff',        4,    16),
  -- club_hall_included: Homework Hall visits included per calendar month
  -- (4/8/12; up to 4 unused roll one month, computed from the ledger).
  ('free',     'club_hall_included', 0,    0),
  ('student',  'club_hall_included', 0,    0),
  ('plus',     'club_hall_included', 8,    8),
  ('family',   'club_hall_included', 0,    0),
  ('internal', 'club_hall_included', 1000, null),
  ('club',     'club_hall_included', 4,    4),
  ('max',      'club_hall_included', 12,   12),
  -- club_private_credit: dormant — no current tier includes a private session.
  ('free',     'club_private_credit', 0,    0),
  ('student',  'club_private_credit', 0,    0),
  ('plus',     'club_private_credit', 0,    0),
  ('family',   'club_private_credit', 0,    0),
  ('internal', 'club_private_credit', 1000, null),
  ('club',     'club_private_credit', 0,    0),
  ('max',      'club_private_credit', 0,    0),
  -- group_seat: daily anti-abuse ceiling on any group booking.
  ('free',     'group_seat',          3,    null),
  ('student',  'group_seat',          3,    null),
  ('plus',     'group_seat',          5,    null),
  ('seat',     'grade',               200,  4000),
  ('seat',     'tutor_message',       400,  8000),
  ('seat',     'tts_chars',           60000, 1200000),
  ('seat',     'stt_seconds',         7200, 108000),
  ('seat',     'syllabus_parse',      150,  600),
  ('seat',     'report',              6,    30),
  ('seat',     'courses',             16,   16),
  ('seat',     'handoff',             4,    16),
  ('seat',     'club_hall_included',  0,    0),
  ('seat',     'club_private_credit', 0,    0),
  ('seat',     'group_seat',          5,    null),
  ('seat',     'club_seat_included',  9,    9),
  ('family',   'group_seat',          5,    null),
  ('internal', 'group_seat',          1000, null),
  ('club',     'group_seat',          5,    null),
  ('max',      'group_seat',          5,    null)
on conflict (plan, feature) do update set daily_limit = excluded.daily_limit, monthly_limit = excluded.monthly_limit;

-- Global kill switches / settings
insert into app_settings (key, value) values
  ('tutor_enabled',           'true'::jsonb),
  -- Voice seeds CLOSED, matching production and the storefront. It used to seed
  -- true, so a fresh environment shipped a feature nothing sells and every use
  -- spent at a second vendor (OpenAI is in this repo for voice and nothing
  -- else). Whether voice stays at all is a product decision — see
  -- docs/superpowers/specs/2026-09-03-wave3-frontend.md; until it is taken, the
  -- seed agrees with the price sheet rather than contradicting it.
  ('voice_enabled',           'false'::jsonb),
  ('expensive_models_enabled','true'::jsonb),
  ('maintenance_mode',        'false'::jsonb),
  ('signups_enabled',         'true'::jsonb),
  -- Club selling surfaces (schedule booking, group seats, house-priced 1:1).
  -- Fails closed when absent; flip to true at launch via Admin → Settings.
  ('club_enabled',            'false'::jsonb),
  -- The one-time placement diagnostic, on its own switch.
  --
  -- It is deliberately NOT folded into club_enabled. The diagnostic sells
  -- before the club opens (docs/RELEASE_PLAN.md stage 1 is ten paid
  -- diagnostics, and it gates nothing but itself: no room, no minor in a
  -- building, no recurring charge, no allowance). Overloading the club's
  -- master switch would mean the only thing the release plan asks us to sell
  -- first is the one thing that cannot be sold until last.
  --
  -- Fails closed all the same: absent or false and the route refuses.
  ('diagnostic_enabled',      'false'::jsonb)
on conflict (key) do nothing;

-- Prompt version registry (content mirrors web/lib/prompts.js at v1)
insert into system_prompt_versions (name, version, content, active) values
  ('tutor_system', 1, 'See web/lib/prompts.js buildSocraticPrompt — v1 baseline', true),
  ('curious_system', 1, 'See web/lib/prompts.js buildCuriousPrompt — v1 baseline', true),
  ('grading_system', 1, 'See web/lib/prompts.js GRADING_SYSTEM_PROMPT — v1 baseline', true),
  ('syllabus_extraction', 1, 'See web/lib/prompts.js SYLLABUS_PARSE_PROMPT — v1 baseline', true)
on conflict (name, version) do nothing;

-- ============================================================
-- supabase/migrations/0036_diagnostic_orders.sql
-- ============================================================

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

-- ============================================================
-- supabase/migrations/0037_learner_focus.sql
-- ============================================================

-- idempotent. Run after 0036.
--
-- WHY (docs/STRATEGY.md v0.2 §4.6, the homeschool case)
-- A parent using Kaizen to teach at home needs to be able to say "work on this
-- one today", and the assignment has to survive the child opening the app. The
-- first implementation put it in profiles.app_meta, which is the wrong home:
-- lib/cloud.js pushApp() rewrites app_meta as a whole literal object with a
-- fixed key set on every debounced client sync, so a focus set by a parent was
-- deleted within seconds of the child launching the product — silently, and
-- exactly when it mattered.
--
-- So the focus gets a table the client does not own. Writes are service-role
-- only (every path goes through /api/engine/session, which re-derives the
-- guardian relationship first); the learner and their guardian can read it.
--
-- WHAT THIS IS NOT
-- It is not a mastery record and it never becomes one. Setting a focus writes
-- no evidence, recomputes no estimate, and confirms nothing: a parent assigns
-- anything and certifies nothing (hard rule 5). `set_by` exists so the product
-- can say who chose the concept, not to give a parent's choice any evidentiary
-- weight.

create table if not exists learner_focus (
  user_id    uuid primary key references profiles(id) on delete cascade,
  kc_id      uuid not null references kc(id) on delete cascade,
  set_by     text not null default 'learner' check (set_by in ('learner','parent')),
  set_at     timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists learner_focus_kc_idx on learner_focus (kc_id);

alter table learner_focus enable row level security;

-- The learner reads their own focus.
drop policy if exists "learner reads own focus" on learner_focus;
create policy "learner reads own focus" on learner_focus
  for select to authenticated using (user_id = auth.uid());

-- A guardian reads a managed child's focus, through the same active link the
-- rest of the parent surfaces use (0025).
drop policy if exists "guardian reads child focus" on learner_focus;
create policy "guardian reads child focus" on learner_focus
  for select to authenticated using (
    exists (
      select 1 from parent_student_relationships r
      where r.student_id = learner_focus.user_id
        and r.parent_id = auth.uid()
        and r.status = 'active'
    )
  );

drop policy if exists "admin learner focus" on learner_focus;
create policy "admin learner focus" on learner_focus for all using (is_admin());

-- Nobody writes this from a browser. The service role does, after the route
-- has checked the relationship and that the concept is on the learner's
-- trellis.
revoke insert, update, delete on learner_focus from anon, authenticated;

-- ── Verification ─────────────────────────────────────────────────────────────
-- select count(*) from learner_focus;
-- select polname from pg_policies where tablename = 'learner_focus';


-- ============================================================
-- supabase/migrations/0038_cohorts.sql
-- ============================================================

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


-- ============================================================
-- Flip the switch: open club selling (schedule, seats, 1:1 booking).
-- The app fails closed without this row being exactly true.
-- ============================================================

insert into app_settings (key, value) values ('club_enabled', 'true'::jsonb)
on conflict (key) do update set value = 'true'::jsonb;

-- ============================================================
-- Verify: all three should return rows / true.
-- ============================================================

select plan, feature, monthly_limit from plan_entitlements
  where feature = 'club_hall_included' order by plan;
select value as club_enabled from app_settings where key = 'club_enabled';
select column_name from information_schema.columns
  where table_name = 'group_seat'
    and column_name in ('intake','help_status','exit') order by column_name;
