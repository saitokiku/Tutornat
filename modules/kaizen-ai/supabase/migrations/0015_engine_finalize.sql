-- 0015_engine_finalize.sql — placement, hint ledger, anchors, sessions.
-- Additive and idempotent. Run after 0014.
--
-- Completes the mastery engine against the pedagogical spec (§4.1, §5.5, §6, §10):
--
--   F-1  placement    — enter by demonstrated level, never by age or grade
--   F-3  hint ladder  — attempts and hints are RECORDED, so mastery credit can
--                       be reduced by help consumed instead of assuming it
--   F-4  independent  — sessions carry a rising hints-unavailable share
--   §5.5 anchors      — independent items that calibrate our own numbers
--   §10  calibration  — the aligned-test-mirage detector, watched weekly
--   §6   cost         — C1-C4 inference metering per learner
--
-- Product context: this deployment is DIRECT-TO-CONSUMER. There is deliberately
-- no roster, class, district or curriculum-code reporting here — that is the
-- B2B2C Organizer, and it is out of scope.

-- ── Placement (§4.1 F-1) ─────────────────────────────────────────────────────
-- A short adaptive run that finds where a learner actually is. Placement is by
-- demonstrated level with zero reference to age or grade; grade exists only as
-- a reporting overlay. The UI never labels material by grade to a teenager.
create table if not exists placement_run (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null default 'math',
  status text not null default 'in_progress' check (status in ('in_progress','complete','abandoned')),
  items_served jsonb not null default '[]',
  responses jsonb not null default '[]',
  learner_elo numeric not null default 1200,
  frontier_kc uuid references kc(id) on delete set null,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);
alter table placement_run enable row level security;
drop policy if exists "own placement read" on placement_run;
create policy "own placement read" on placement_run for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "admin placement" on placement_run;
create policy "admin placement" on placement_run for all using (is_admin());
revoke insert, update, delete on placement_run from anon, authenticated;
create index if not exists placement_run_user_idx on placement_run (user_id, started_at desc);

-- ── Attempts and hints (§4.1 F-3) ────────────────────────────────────────────
-- The hint ladder is only meaningful if help is COUNTED. Without this table the
-- engine has to assume assistance rather than measure it, and the whole
-- fading-to-zero law becomes decorative.
--
-- Ladder: attempt required -> hint 1 (orient) -> hint 2 (teach the step) ->
-- after N failures or give-up, full worked solution, no scolding. The item is
-- marked unlearned and an isomorph is scheduled; mastery credit accrues only
-- from the later UNASSISTED isomorph.
create table if not exists item_attempt (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kc_id uuid not null references kc(id) on delete cascade,
  item_id uuid references kc_item(id) on delete set null,
  session_ref text,
  attempts int not null default 0,
  hints_used int not null default 0,
  bottomed_out boolean not null default false,   -- full solution was shown
  gave_up boolean not null default false,
  solved boolean not null default false,
  credit numeric not null default 1,             -- mastery credit after hint cost
  isomorph_due_at timestamptz,                   -- the retrieval that actually counts
  isomorph_of uuid references item_attempt(id) on delete set null,
  latency_ms int,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
alter table item_attempt enable row level security;
drop policy if exists "own attempt read" on item_attempt;
create policy "own attempt read" on item_attempt for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "admin attempt" on item_attempt;
create policy "admin attempt" on item_attempt for all using (is_admin());
revoke insert, update, delete on item_attempt from anon, authenticated;
create index if not exists item_attempt_user_kc_idx on item_attempt (user_id, kc_id, created_at desc);
create index if not exists item_attempt_isomorph_idx on item_attempt (user_id, isomorph_due_at)
  where isomorph_due_at is not null and resolved_at is null;

-- ── Sessions (§4.1 F-2, F-4; §11.4 no infinite sessions) ────────────────────
create table if not exists learning_session (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  end_reason text check (end_reason in ('mastery_point','soft_cap','hard_cap','fatigue','learner','abandoned')),
  minutes numeric,
  items_seen int not null default 0,
  hints_used int not null default 0,
  -- The share of this session that ran with hints unavailable. Rises with
  -- demonstrated independence; surfaced as evidence the system is receding.
  independent_share numeric,
  policy_version text,
  created_at timestamptz not null default now()
);
alter table learning_session enable row level security;
drop policy if exists "own session read" on learning_session;
create policy "own session read" on learning_session for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "admin learning session" on learning_session;
create policy "admin learning session" on learning_session for all using (is_admin());
revoke insert, update, delete on learning_session from anon, authenticated;
create index if not exists learning_session_user_idx on learning_session (user_id, started_at desc);

-- ── Anchor items (§5.5, §10) ─────────────────────────────────────────────────
-- Independent, externally-sourced items (released TIMSS/NAEP-class) embedded
-- into normal practice. They are how we check our own homework: if internal
-- confirmed mastery rises while anchor performance stays flat, the engine is
-- producing an aligned-test mirage and the number means nothing.
--
-- Deliberately a SEPARATE table from kc_item: anchors must never enter the
-- normal selection pool, never be tuned by Elo, and never be authored by us.
create table if not exists anchor_item (
  id uuid primary key default uuid_generate_v4(),
  kc_id uuid not null references kc(id) on delete cascade,
  source text not null,                 -- e.g. 'NAEP 2019 G8 #14'
  kind text not null check (kind in ('mc','numeric','symbolic','short')),
  body text not null,
  choices jsonb not null default '[]',
  answer_spec jsonb not null,
  license_note text,
  status text not null default 'verified' check (status in ('draft','verified','retired')),
  created_at timestamptz not null default now()
);
alter table anchor_item enable row level security;
drop policy if exists "admin anchor" on anchor_item;
create policy "admin anchor" on anchor_item for all using (is_admin());
-- Never client-readable: the answer key problem, and these must stay unseen to
-- remain a valid external measure.
revoke select, insert, update, delete on anchor_item from anon, authenticated;
create index if not exists anchor_item_kc_idx on anchor_item (kc_id, status);

create table if not exists anchor_result (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  anchor_item_id uuid not null references anchor_item(id) on delete cascade,
  kc_id uuid not null references kc(id) on delete cascade,
  correct boolean not null,
  confirmed_at_time numeric,            -- our confirmed mastery when they answered
  at timestamptz not null default now()
);
alter table anchor_result enable row level security;
drop policy if exists "admin anchor result" on anchor_result;
create policy "admin anchor result" on anchor_result for all using (is_admin());
revoke select, insert, update, delete on anchor_result from anon, authenticated;
create index if not exists anchor_result_user_idx on anchor_result (user_id, at desc);
create index if not exists anchor_result_kc_idx on anchor_result (kc_id, at desc);

-- ── Inference cost metering (§6 C1-C4) ───────────────────────────────────────
-- usage_ledger already records est_cost_usd but nothing reads it to STOP
-- anything. This is the per-learner rollup the budget guard checks before
-- spending, plus the frontier-call counter C1 caps at ~30-60/learner/year.
create table if not exists inference_budget (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  spend_usd numeric not null default 0,
  frontier_calls int not null default 0,
  cached_calls int not null default 0,
  total_calls int not null default 0,
  unique (user_id, period_start)
);
alter table inference_budget enable row level security;
drop policy if exists "own budget read" on inference_budget;
create policy "own budget read" on inference_budget for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "admin budget" on inference_budget;
create policy "admin budget" on inference_budget for all using (is_admin());
revoke insert, update, delete on inference_budget from anon, authenticated;
create index if not exists inference_budget_period_idx on inference_budget (period_start, spend_usd desc);

-- Atomic accumulate. Read-modify-write would undercount under the concurrency
-- a streaming chat route generates, and an undercounted budget is no budget.
create or replace function accrue_inference(
  p_user uuid, p_usd numeric, p_frontier boolean, p_cached boolean
) returns void
  language sql
  security definer
  set search_path = public, pg_temp
as $$
  insert into inference_budget (user_id, period_start, spend_usd, frontier_calls, cached_calls, total_calls)
  values (p_user, date_trunc('month', now())::date, coalesce(p_usd, 0),
          case when p_frontier then 1 else 0 end,
          case when p_cached then 1 else 0 end, 1)
  on conflict (user_id, period_start) do update set
    spend_usd      = inference_budget.spend_usd + coalesce(p_usd, 0),
    frontier_calls = inference_budget.frontier_calls + case when p_frontier then 1 else 0 end,
    cached_calls   = inference_budget.cached_calls + case when p_cached then 1 else 0 end,
    total_calls    = inference_budget.total_calls + 1;
$$;
revoke all on function accrue_inference(uuid, numeric, boolean, boolean) from public, anon, authenticated;
grant execute on function accrue_inference(uuid, numeric, boolean, boolean) to service_role;

-- ── KC additions the spec calls for (§5.1) ───────────────────────────────────
alter table kc
  add column if not exists standards jsonb not null default '[]',   -- curriculum codes
  add column if not exists mastery_params jsonb not null default '{}', -- per-KC criterion overrides
  add column if not exists importance numeric not null default 1;    -- review sampling weight

-- Policy version on the estimate, so an A/B arm's numbers are never compared
-- against control's cached ones.
alter table kc_estimate
  add column if not exists policy_version text;

-- Independence tracking per KC, for the F-4 rising independent share.
alter table kc_estimate
  add column if not exists unassisted_share numeric;

select 'engine finalize complete' as status,
       (select count(*) from kc) as kcs,
       (select count(*) from kc_item where status = 'verified') as verified_items,
       (select count(*) from anchor_item) as anchors;
