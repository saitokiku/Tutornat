-- 0008_pricing.sql — the new pricing model. Safe to re-run.
--   · Study Circle: the $50/mo "family" subscription now carries up to 4
--     students (owner + 3 invited via a shareable code — friends or anyone).
--   · Marketplace economics: 11% platform fee recorded per session; a
--     student's first-ever session is free (intro_free).
--   · Tutor rates bounded to $20–$50/hr.

-- ── Study Circles (shared plan seats) ────────────────────────────────────────
create table if not exists plan_groups (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  invite_code text not null unique,
  created_at timestamptz not null default now()
);
alter table plan_groups enable row level security;
drop policy if exists "owner reads own group" on plan_groups;
create policy "owner reads own group" on plan_groups for select using (auth.uid() = owner_id);
drop policy if exists "admin groups" on plan_groups;
create policy "admin groups" on plan_groups for all using (is_admin());
-- writes go through the service-role API (seat limits, code checks)

create table if not exists plan_group_members (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references plan_groups(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,  -- one circle per user
  created_at timestamptz not null default now()
);
alter table plan_group_members enable row level security;
drop policy if exists "member reads own membership" on plan_group_members;
create policy "member reads own membership" on plan_group_members for select
  using (auth.uid() = user_id or exists (select 1 from plan_groups g where g.id = group_id and g.owner_id = auth.uid()));
drop policy if exists "admin group members" on plan_group_members;
create policy "admin group members" on plan_group_members for all using (is_admin());
create index if not exists plan_group_members_group_idx on plan_group_members (group_id);

-- ── Marketplace economics ────────────────────────────────────────────────────
alter table tutoring_sessions
  add column if not exists platform_fee_cents int not null default 0,
  add column if not exists intro_free boolean not null default false;

-- Tutor rates: $20–$50/hr. Clamp any existing out-of-range rows first so the
-- constraint can attach on re-runs against live data.
update tutors set hourly_rate_cents = 2000 where hourly_rate_cents < 2000;
update tutors set hourly_rate_cents = 5000 where hourly_rate_cents > 5000;
alter table tutors drop constraint if exists tutors_rate_bounds_check;
alter table tutors add constraint tutors_rate_bounds_check
  check (hourly_rate_cents between 2000 and 5000);
