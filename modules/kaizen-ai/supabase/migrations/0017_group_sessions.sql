-- 0017_group_sessions.sql — drop-in group tutoring, up to 4 students per tutor.
-- Additive and idempotent. Run after 0016.
--
-- WHY THIS IS A SEPARATE TABLE AND NOT A FLAG
-- tutoring_sessions is 1:1 by construction: student_id is a NOT NULL column on
-- the session itself, and every policy, query and the whole payment path keys
-- off it. Adding a "capacity" flag would leave student_id meaning "the first
-- one who booked", which is the kind of shortcut that quietly corrupts a
-- payment ledger. Group gets its own tables; 1:1 is untouched.
--
-- THE ECONOMICS THIS ENCODES (modelled before designing, see the report):
--   1:1 at $40:        tutor $35.60, Stripe $1.46, platform $2.94  (7.4%)
--   group 4 x $15:     tutor $45.00, Stripe $2.94, platform $12.06 (20.1%)
--
-- Four times the platform margin per tutor-hour, the student pays 62% less,
-- and the tutor earns 26% MORE than a 1:1 booking. That is a genuine
-- three-sided win and it is the strongest unit in the marketplace.
--
-- TWO DESIGN CONSTRAINTS THE MODELLING FORCED:
--
-- 1. REVENUE SHARE, NOT A FIXED FEE. A flat $45 tutor payment loses money at
--    every fill below capacity — at one seat the platform is down $30.73. The
--    tutor takes a percentage of what the room actually earns.
--
-- 2. A MINIMUM FILL, OR THE ROOM DOES NOT RUN. At 75% share a tutor earns
--    $11.25 for a one-seat hour, which is worse than not showing up; they
--    would rationally never accept another. Below min_seats at the cutoff the
--    session cancels itself and every seat is refunded in full: the platform
--    never pays out on an empty room, the tutor never sits through a bad hour,
--    and the student gets their money back rather than a thin session.

-- ── The scheduled room ───────────────────────────────────────────────────────
create table if not exists group_session (
  id uuid primary key default uuid_generate_v4(),
  tutor_id uuid not null references tutors(id) on delete cascade,
  availability_id uuid references tutor_availability(id) on delete set null,

  subject text not null,
  topic text,                                   -- "Quadratics — drop in with anything"
  description text,

  capacity int not null default 4 check (capacity between 2 and 6),
  min_seats int not null default 2 check (min_seats >= 1),
  seat_price_cents int not null check (seat_price_cents between 1000 and 2500),

  -- Tutor's share of what the room actually earns. Stored per session so a
  -- historical payout is always reconstructible from its own row rather than
  -- from whatever the constant happens to be today.
  tutor_share numeric not null default 0.75 check (tutor_share > 0 and tutor_share <= 0.95),

  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  -- Min-fill is evaluated here. Late enough to fill, early enough that a
  -- cancellation is not a wasted evening for anyone.
  cutoff_at timestamptz,

  status text not null default 'open'
    check (status in ('open','confirmed','in_progress','completed','cancelled','expired')),
  cancel_reason text,

  daily_room_name text,
  daily_room_url text,
  brief_md text,                                -- AI brief across the WHOLE roster

  created_at timestamptz not null default now(),
  check (scheduled_end > scheduled_start),
  check (min_seats <= capacity)
);
alter table group_session enable row level security;
drop policy if exists "admin group session" on group_session;
create policy "admin group session" on group_session for all using (is_admin());
-- Browsing and booking go through service-role routes that enforce the vetting
-- gate; no direct client access.
revoke select, insert, update, delete on group_session from anon, authenticated;
create index if not exists group_session_open_idx on group_session (status, scheduled_start)
  where status in ('open','confirmed');
create index if not exists group_session_tutor_idx on group_session (tutor_id, scheduled_start desc);

-- ── One student's seat ───────────────────────────────────────────────────────
create table if not exists group_seat (
  id uuid primary key default uuid_generate_v4(),
  group_session_id uuid not null references group_session(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,

  status text not null default 'pending_payment'
    check (status in ('pending_payment','booked','attended','no_show','cancelled')),
  amount_cents int not null default 0,
  paid boolean not null default false,
  refund_status text not null default 'none' check (refund_status in ('none','refunded','partial')),
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,

  -- Same hard gate as 1:1: a minor cannot join a live video room with an adult
  -- without account-level guardian approval.
  guardian_consent boolean not null default false,
  -- What this student wants out of it, shown to the tutor in the brief.
  bring text,

  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (group_session_id, student_id)          -- one seat per student per room
);
alter table group_seat enable row level security;
drop policy if exists "own seat read" on group_seat;
create policy "own seat read" on group_seat for select to authenticated
  using (auth.uid() = student_id);
drop policy if exists "admin group seat" on group_seat;
create policy "admin group seat" on group_seat for all using (is_admin());
revoke insert, update, delete on group_seat from anon, authenticated;
create index if not exists group_seat_session_idx on group_seat (group_session_id, status);
create index if not exists group_seat_student_idx on group_seat (student_id, created_at desc);

-- ── Per-student observation inside a group ───────────────────────────────────
-- The harmony bus, for four people at once. A tutor watching four students work
-- unaided produces four independent confirming observations, which makes a
-- group session the single highest-yield assessment event in the product.
create table if not exists group_observation (
  id uuid primary key default uuid_generate_v4(),
  group_session_id uuid not null references group_session(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  kc_id uuid not null references kc(id) on delete cascade,
  tutor_rating text check (tutor_rating in ('got_it','shaky','not_yet')),
  misconception_id uuid references kc_misconception(id) on delete set null,
  note text,
  observed_at timestamptz not null default now(),
  unique (group_session_id, student_id, kc_id)
);
alter table group_observation enable row level security;
drop policy if exists "admin group observation" on group_observation;
create policy "admin group observation" on group_observation for all using (is_admin());
revoke select, insert, update, delete on group_observation from anon, authenticated;
create index if not exists group_observation_session_idx on group_observation (group_session_id);

-- ── Tutor availability learns about capacity ─────────────────────────────────
alter table tutor_availability
  add column if not exists session_type text not null default 'private'
    check (session_type in ('private','group')),
  add column if not exists capacity int,
  add column if not exists seat_price_cents int;

-- A group slot is not consumed by one booking, so the binary open/booked status
-- no longer describes it. 'group_open' stays bookable until capacity is reached.
alter table tutor_availability drop constraint if exists tutor_availability_status_check;
alter table tutor_availability add constraint tutor_availability_status_check
  check (status in ('open','booked','group_open','group_full'));

-- ── Seat counting, race-free ─────────────────────────────────────────────────
-- Overbooking a 4-seat room is a refund, an apology and a lost tutor. Two
-- students hitting checkout at the same instant must not both get the last seat,
-- so the count and the claim happen in one statement under a row lock.
create or replace function claim_group_seat(
  p_session uuid, p_student uuid, p_amount int, p_consent boolean, p_bring text
) returns TABLE (seat_id uuid, seats_taken int, capacity int, outcome text)
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

  insert into group_seat (group_session_id, student_id, amount_cents, guardian_consent, bring)
  values (p_session, p_student, p_amount, p_consent, p_bring)
  on conflict (group_session_id, student_id) do nothing
  returning id into v_seat;

  if v_seat is null then
    return query select null::uuid, v_taken, v_cap, 'already_booked'; return;
  end if;

  return query select v_seat, v_taken + 1, v_cap, 'claimed';
end $$;
revoke all on function claim_group_seat(uuid, uuid, int, boolean, text) from public, anon, authenticated;
grant execute on function claim_group_seat(uuid, uuid, int, boolean, text) to service_role;

-- ── Min-fill resolution ──────────────────────────────────────────────────────
-- Run from the maintenance cron. Confirms rooms that made their minimum and
-- cancels the ones that did not, so nobody discovers an empty room at the
-- scheduled time. Returns what it did, for the cron log.
create or replace function resolve_group_fill()
  returns TABLE (session_id uuid, action text, seats int)
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
begin
  return query
  with due as (
    select gs.id, gs.min_seats,
           (select count(*) from group_seat s
             where s.group_session_id = gs.id and s.status in ('pending_payment','booked')) as taken
    from group_session gs
    where gs.status = 'open'
      and gs.cutoff_at is not null
      and gs.cutoff_at <= now()
  ),
  confirmed as (
    update group_session g set status = 'confirmed'
    from due where due.id = g.id and due.taken >= due.min_seats
    returning g.id, 'confirmed'::text as action, due.taken
  ),
  cancelled as (
    update group_session g
      set status = 'cancelled',
          cancel_reason = 'below_minimum_fill'
    from due where due.id = g.id and due.taken < due.min_seats
    returning g.id, 'cancelled'::text as action, due.taken
  )
  select * from confirmed
  union all
  select * from cancelled;
end $$;
revoke all on function resolve_group_fill() from public, anon, authenticated;
grant execute on function resolve_group_fill() to service_role;

-- One earnings ledger for both session shapes. tutoring_session_id is already
-- nullable, so a row carries whichever of the two produced it.
alter table tutor_earnings
  add column if not exists group_session_id uuid references group_session(id) on delete set null;
create unique index if not exists tutor_earnings_group_uniq
  on tutor_earnings (group_session_id) where group_session_id is not null;

select 'group sessions ready' as status,
       (select count(*) from group_session) as rooms,
       (select count(*) from group_seat) as seats;
