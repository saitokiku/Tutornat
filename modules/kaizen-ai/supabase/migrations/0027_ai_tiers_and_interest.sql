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
