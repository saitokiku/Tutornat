-- 0013_evidence_ledger.sql — the append-only evidence ledger.
-- Additive and idempotent. Run after 0012.
--
-- WHY THIS EXISTS
-- Kaizen has never had an assessment layer; it has an opinion layer. Mastery is
-- produced by Claude grading a transcript that Claude wrote, in a mode ("Teach
-- me") that hands over a full worked example before asking a check question. The
-- grading prompt tries to control for this ("judge only what the student said")
-- but cannot: the task itself was scaffolded, and the scaffolding is neither
-- bounded nor recorded.
--
-- That is the configuration Bastani et al. (2024) measured in the field at +48%
-- assisted performance and -17% unassisted exam performance. Its perverse
-- consequence here is that Kaizen's mastery number rises fastest for the
-- students being helped the most.
--
-- The fix is to record every observation together with the two facts the current
-- system throws away: WAS HELP AVAILABLE (`assisted`, `assistance_dose`) and HOW
-- WAS CORRECTNESS ESTABLISHED (`verified_by`). Mastery then splits in two:
--
--   WORKING    any evidence, including assisted chat.
--   CONFIRMED  unassisted + machine-or-human-verified + delayed + repeated.
--
-- Everything that leaves the product — parent summaries, weekly reports, the
-- tutor brief — reports CONFIRMED only.
--
-- The ledger is the source of truth. kc_estimate is a derived cache carrying the
-- scheduler version that produced it, so replacing the learning algorithm means
-- replaying the ledger, not migrating learner state.

-- ── The ledger ───────────────────────────────────────────────────────────────
create table if not exists evidence (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kc_id uuid not null references kc(id) on delete cascade,
  at timestamptz not null default now(),

  kind text not null check (kind in (
    'check',              -- dose-zero delayed assessment — the confirming class
    'practice',           -- self-directed drilling, help available
    'chat_signal',        -- inferred from a tutoring conversation
    'tutor_observation',  -- a human watched them work
    'assignment_score',   -- real coursework outcome
    'placement'           -- cold-start estimate
  )),

  outcome numeric check (outcome is null or (outcome >= 0 and outcome <= 1)),

  -- The two fields the old system had no place for.
  assisted boolean not null default true,
  assistance_dose numeric not null default 0,

  -- How correctness was established. A self-marked short answer is not the same
  -- evidence as a symbolically-checked one, and neither is the same as a trained
  -- human watching the student work unaided.
  verified_by text not null default 'model'
    check (verified_by in ('symbolic','structural','model','self','human_tutor')),

  weight numeric not null default 1,   -- stored, not recomputed, so the ledger is auditable

  item_id uuid references kc_item(id) on delete set null,
  misconception_id uuid references kc_misconception(id) on delete set null,
  context_tag text,
  latency_ms int,
  predicted_correct boolean,           -- predict-then-check calibration probe
  source_ref text,                     -- session id / tutoring_session id / import batch
  meta jsonb not null default '{}'
);
alter table evidence enable row level security;
drop policy if exists "own evidence read" on evidence;
create policy "own evidence read" on evidence for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "admin evidence" on evidence;
create policy "admin evidence" on evidence for all using (is_admin());

-- CRITICAL: no client INSERT policy and no client write grant. The entire point
-- of this table is that the learner cannot assert their own mastery — which is
-- exactly what PracticeModal does today by PATCHing a self-computed `quality`.
-- Every write goes through the server on the service role.
revoke insert, update, delete on evidence from anon, authenticated;

create index if not exists evidence_user_kc_idx on evidence (user_id, kc_id, at desc);
create index if not exists evidence_user_at_idx on evidence (user_id, at desc);
-- Partial index for the confirming class — the hot path for mastery reads.
create index if not exists evidence_confirming_idx on evidence (user_id, kc_id, at desc)
  where assisted = false and kind in ('check','tutor_observation');

-- ── Derived estimates (a cache, never a source of truth) ─────────────────────
create table if not exists kc_estimate (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kc_id uuid not null references kc(id) on delete cascade,

  working numeric not null default 0 check (working >= 0 and working <= 1),
  confirmed numeric not null default 0 check (confirmed >= 0 and confirmed <= 1),
  confidence numeric not null default 0 check (confidence >= 0 and confidence <= 1),

  -- Assistance-dose slope per KC must trend NEGATIVE. A flat slope means the
  -- learner is not becoming independent of the system, which is the dependency
  -- alarm surfaced on the tutor dashboard.
  dose_slope numeric,
  assistance_dose_total numeric not null default 0,

  learner_elo numeric not null default 1200,
  next_review_at timestamptz,
  next_check_at timestamptz,
  contexts_seen jsonb not null default '[]',
  last_instruction_at timestamptz,      -- gates the >=24h delay rule
  human_recommended boolean not null default false,

  scheduler_version text not null default 'default-1',
  computed_at timestamptz not null default now(),
  unique (user_id, kc_id)
);
alter table kc_estimate enable row level security;
drop policy if exists "own estimate read" on kc_estimate;
create policy "own estimate read" on kc_estimate for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "admin estimate" on kc_estimate;
create policy "admin estimate" on kc_estimate for all using (is_admin());
revoke insert, update, delete on kc_estimate from anon, authenticated;

create index if not exists kc_estimate_due_idx on kc_estimate (user_id, next_check_at);
create index if not exists kc_estimate_review_idx on kc_estimate (user_id, next_review_at);

-- ── In-flight checks ─────────────────────────────────────────────────────────
-- A check is issued server-side and its items recorded here BEFORE the learner
-- sees them, so grading a submission never trusts a client-supplied item list.
create table if not exists check_attempt (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kc_id uuid not null references kc(id) on delete cascade,
  item_ids jsonb not null default '[]',
  issued_at timestamptz not null default now(),
  submitted_at timestamptz,
  score numeric,
  expires_at timestamptz not null default (now() + interval '1 hour'),
  reason text default 'scheduled' check (reason in ('scheduled','post_session','placement','manual'))
);
alter table check_attempt enable row level security;
drop policy if exists "own check read" on check_attempt;
create policy "own check read" on check_attempt for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "admin check" on check_attempt;
create policy "admin check" on check_attempt for all using (is_admin());
revoke insert, update, delete on check_attempt from anon, authenticated;
create index if not exists check_attempt_open_idx on check_attempt (user_id, submitted_at, expires_at);

-- ── The harmony bus: sessions ↔ knowledge components ─────────────────────────
-- tutoring_sessions.concept is free text and, in practice, ALWAYS NULL — no
-- client ever sends it. This replaces it with a real relation, which is what
-- lets a tutor's observation reach the learner model and lets the engine
-- schedule a delayed unassisted check on exactly what the tutor covered.
create table if not exists tutoring_session_kc (
  id uuid primary key default uuid_generate_v4(),
  tutoring_session_id uuid not null references tutoring_sessions(id) on delete cascade,
  kc_id uuid not null references kc(id) on delete cascade,
  role text not null default 'agenda' check (role in ('agenda','covered')),
  tutor_rating text check (tutor_rating in ('got_it','shaky','not_yet')),
  misconception_id uuid references kc_misconception(id) on delete set null,
  tutor_note text,
  observed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tutoring_session_id, kc_id, role)
);
alter table tutoring_session_kc enable row level security;
drop policy if exists "admin session kc" on tutoring_session_kc;
create policy "admin session kc" on tutoring_session_kc for all using (is_admin());
-- Read/write both go through service-role routes that verify the caller is the
-- session's student or its tutor.
revoke select, insert, update, delete on tutoring_session_kc from anon, authenticated;
create index if not exists tutoring_session_kc_session_idx on tutoring_session_kc (tutoring_session_id);
create index if not exists tutoring_session_kc_kc_idx on tutoring_session_kc (kc_id);

-- ── Post-session effect measurement ──────────────────────────────────────────
-- The delayed unassisted check scheduled after a human session is what turns
-- "the tutor said it went well" into "confirmed mastery moved". Aggregated, this
-- is per-tutor effectiveness on real learning — a routing signal, a pricing
-- signal, and a trust artifact that neither an AI-only nor a marketplace-only
-- product can compute.
create table if not exists session_effect (
  id uuid primary key default uuid_generate_v4(),
  tutoring_session_id uuid not null references tutoring_sessions(id) on delete cascade,
  tutor_id uuid references tutors(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  kc_id uuid not null references kc(id) on delete cascade,
  confirmed_before numeric,
  confirmed_after numeric,
  measured_at timestamptz,
  check_attempt_id uuid references check_attempt(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (tutoring_session_id, kc_id)
);
alter table session_effect enable row level security;
drop policy if exists "admin session effect" on session_effect;
create policy "admin session effect" on session_effect for all using (is_admin());
revoke select, insert, update, delete on session_effect from anon, authenticated;
create index if not exists session_effect_tutor_idx on session_effect (tutor_id, measured_at);
