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

-- Pay band widened for the credentialed tier. clubPricing.TUTOR_PAY mirrors
-- this (min 2200, max 4500, default 2500, certified default 4000).
alter table tutors drop constraint if exists tutors_pay_rate_cents_check;
alter table tutors add constraint tutors_pay_rate_cents_check
  check (pay_rate_cents is null or pay_rate_cents between 2200 and 4500);

-- ── Verification ─────────────────────────────────────────────────────────────
-- select plan, feature, monthly_limit from plan_entitlements where plan = 'seat' order by feature;
-- select column_name from information_schema.columns where table_name = 'tutors' and column_name like 'credential%';
