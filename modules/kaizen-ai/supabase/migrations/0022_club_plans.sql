-- 0022_club_plans.sql — the Academic Club plan lineup + grade-level + managed accounts groundwork.
-- Additive and idempotent. Run after 0021.
--
-- WHAT THIS ENCODES
-- The commercial layer is repositioning around an after-school academic club
-- for students 13+ (younger grades deferred until a dedicated COPPA build):
-- three memberships (Club $39 / Plus $69 / Max $99) that include N Homework
-- Hall visits per month, plus member pricing on Subject Clinics and private
-- tutoring. This migration adds the plan keys, the grade-level field the
-- catalog filters on, the managed_by pointer that lets a parent own a teen's
-- profile, and the plan_entitlements rows the allowance engine reads.
--
-- PLAN KEYS
-- 'club' and 'max' are new. 'plus' is REUSED for the $69 hero tier: there are
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
  -- club ($39): AI limits match the old 'student' tier — AI is included in
  -- every membership.
  ('club', 'grade',          100,  2000),
  ('club', 'tutor_message',  200,  4000),
  ('club', 'tts_chars',      30000, 600000),
  ('club', 'stt_seconds',    3600, 54000),
  ('club', 'syllabus_parse', 60,   300),
  ('club', 'report',         3,    15),
  ('club', 'courses',        8,    8),
  ('club', 'handoff',        2,    8),
  -- max ($99): AI limits match the old 'family' tier.
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
