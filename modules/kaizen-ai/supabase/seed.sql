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
  -- included in every membership. 'plus' is reused as the $79 hero tier.
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
  -- The standing seat (0033; STRATEGY §5.1): Max-level AI limits, no Hall
  -- allowance, 9 seat sessions a month on club_seat_included.
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
  ('max',      'group_seat',          5,    null),
  -- AI ladder (0027 mirror): club-level AI limits, no club perks; ai_hall
  -- carries exactly one Homework Hall visit a month (no rollover).
  ('ai_solo',  'grade',              100,   2000),
  ('ai_solo',  'tutor_message',      200,   4000),
  ('ai_solo',  'tts_chars',          30000, 600000),
  ('ai_solo',  'stt_seconds',        3600,  54000),
  ('ai_solo',  'syllabus_parse',     30,    150),
  ('ai_solo',  'report',             3,     15),
  ('ai_solo',  'courses',            8,     8),
  ('ai_solo',  'handoff',            2,     8),
  ('ai_solo',  'group_seat',         2,     null),
  ('ai_hall',  'grade',              100,   2000),
  ('ai_hall',  'tutor_message',      200,   4000),
  ('ai_hall',  'tts_chars',          30000, 600000),
  ('ai_hall',  'stt_seconds',        3600,  54000),
  ('ai_hall',  'syllabus_parse',     30,    150),
  ('ai_hall',  'report',             3,     15),
  ('ai_hall',  'courses',            8,     8),
  ('ai_hall',  'handoff',            2,     8),
  ('ai_hall',  'group_seat',         2,     null),
  ('ai_solo',  'club_hall_included', null,  0),
  ('ai_solo',  'club_private_credit', null, 0),
  ('ai_hall',  'club_hall_included', null,  1),
  ('ai_hall',  'club_private_credit', null, 0)
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
