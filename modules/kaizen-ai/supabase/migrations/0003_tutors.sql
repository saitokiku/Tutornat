-- 0003_tutors.sql — human tutor marketplace: roster, availability, sessions,
-- earnings (payouts deferred — earnings are tracked, admin marks them paid),
-- and Daily.co room fields. Safe to re-run.
--
-- Access model: students browse ACTIVE tutors and their OPEN slots; booking,
-- status transitions, and earnings writes all go through service-role API
-- routes (web/app/api/tutoring/*) so the rules live in one place.

-- ── Tutor profiles ────────────────────────────────────────────────────────────
create table if not exists tutors (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null,
  bio text,
  subjects text[] not null default '{}',
  hourly_rate_cents int not null default 4000,
  timezone text,
  status text not null default 'pending' check (status in ('pending','active','paused')),
  created_at timestamptz not null default now()
);
alter table tutors enable row level security;
drop policy if exists "tutor own row" on tutors;
create policy "tutor own row" on tutors for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "students browse active tutors" on tutors;
create policy "students browse active tutors" on tutors for select
  using (status = 'active');
drop policy if exists "admin tutors" on tutors;
create policy "admin tutors" on tutors for all using (is_admin());

-- ── Bookable slots (concrete windows; recurring rules are a later feature) ───
create table if not exists tutor_availability (
  id uuid primary key default uuid_generate_v4(),
  tutor_id uuid not null references tutors(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'open' check (status in ('open','booked')),
  created_at timestamptz not null default now(),
  check (end_at > start_at)
);
alter table tutor_availability enable row level security;
drop policy if exists "tutor manages own slots" on tutor_availability;
create policy "tutor manages own slots" on tutor_availability for all
  using (exists (select 1 from tutors t where t.id = tutor_id and t.user_id = auth.uid()));
drop policy if exists "students browse open slots" on tutor_availability;
create policy "students browse open slots" on tutor_availability for select
  using (status = 'open' and exists (select 1 from tutors t where t.id = tutor_id and t.status = 'active'));
drop policy if exists "admin availability" on tutor_availability;
create policy "admin availability" on tutor_availability for all using (is_admin());
create index if not exists tutor_availability_open_idx
  on tutor_availability (tutor_id, start_at) where status = 'open';

-- ── Booked sessions ───────────────────────────────────────────────────────────
create table if not exists tutoring_sessions (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references auth.users(id) on delete cascade,
  tutor_id uuid not null references tutors(id) on delete cascade,
  availability_id uuid references tutor_availability(id),
  subject text,
  concept text,
  note text,
  guardian_consent boolean not null default false,
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled','in_progress','completed','cancelled','no_show')),
  daily_room_name text,
  daily_room_url text,
  amount_cents int not null default 0,
  created_at timestamptz not null default now()
);
alter table tutoring_sessions enable row level security;
drop policy if exists "student sees own sessions" on tutoring_sessions;
create policy "student sees own sessions" on tutoring_sessions for select
  using (auth.uid() = student_id);
drop policy if exists "tutor sees assigned sessions" on tutoring_sessions;
create policy "tutor sees assigned sessions" on tutoring_sessions for select
  using (exists (select 1 from tutors t where t.id = tutor_id and t.user_id = auth.uid()));
drop policy if exists "admin sessions" on tutoring_sessions;
create policy "admin sessions" on tutoring_sessions for all using (is_admin());
create index if not exists tutoring_sessions_student_idx on tutoring_sessions (student_id, scheduled_start);
create index if not exists tutoring_sessions_tutor_idx on tutoring_sessions (tutor_id, scheduled_start);

-- Link the AI-handoff queue to a real booked session when one results.
alter table human_handoff_requests
  add column if not exists tutoring_session_id uuid references tutoring_sessions(id);

-- ── Earnings ledger (accrued now, paid manually until Connect ships) ─────────
create table if not exists tutor_earnings (
  id uuid primary key default uuid_generate_v4(),
  tutor_id uuid not null references tutors(id) on delete cascade,
  tutoring_session_id uuid references tutoring_sessions(id),
  amount_cents int not null,
  status text not null default 'accrued' check (status in ('accrued','paid')),
  created_at timestamptz not null default now()
);
alter table tutor_earnings enable row level security;
drop policy if exists "tutor sees own earnings" on tutor_earnings;
create policy "tutor sees own earnings" on tutor_earnings for select
  using (exists (select 1 from tutors t where t.id = tutor_id and t.user_id = auth.uid()));
drop policy if exists "admin earnings" on tutor_earnings;
create policy "admin earnings" on tutor_earnings for all using (is_admin());
