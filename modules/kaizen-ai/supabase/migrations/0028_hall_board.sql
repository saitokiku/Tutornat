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
