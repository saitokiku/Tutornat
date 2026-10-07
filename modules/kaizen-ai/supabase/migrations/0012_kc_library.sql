-- 0012_kc_library.sql — the shared knowledge-component library.
-- Additive and idempotent. Run after 0011.
--
-- WHY THIS EXISTS
-- Concept identity in Kaizen is a mutable display string. The raw LLM-generated
-- topic name is simultaneously the localStorage key, the student_concept_mastery
-- upsert key (user_id, name), the chatMemory key, the tutor_sessions unique key,
-- the mastery_events key, AND the course-membership join. Renaming a concept
-- forks every one of those into an orphan. Worse: web/lib/cloud.js pushConcepts
-- never sends the client's `id`, so Postgres mints its own and pullState adopts
-- it — meaning a sync landing mid-session silently drops the grade, because
-- handleGraded matches on an id captured at session-open.
--
-- The fix is a stable canonical id plus an alias table. The student keeps seeing
-- "Unit 3: Energy"; the engine works on a uuid. Nothing user-visible is renamed.
--
-- Sharing: "cellular respiration" is the same knowledge component for every
-- student who takes AP Biology, so item banks are authored once against the
-- canonical KC and amortize across every learner mapped to it.
--
-- 0001's `concepts` and `concept_prerequisites` tables are superseded here. They
-- were never written to by any code, so there is nothing to migrate; they are
-- left in place rather than dropped so this migration stays non-destructive.

-- ── Canonical knowledge components ───────────────────────────────────────────
-- `type` follows the KLI framework (Koedinger, Corbett & Perfetti 2012): the
-- pedagogical policy branches on it — memory/spacing for facts, practice with
-- feedback for skills, sense-making for principles.
create table if not exists kc (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  subject text not null,
  title text not null,
  type text not null default 'skill' check (type in ('fact','skill','principle')),
  -- Verifiability tier drives how much a piece of evidence about this KC counts
  -- (see 0013.evidence.weight). v1 symbolic/numeric, v2 structural (MC/order),
  -- v3 open response — v3 alone can never confirm mastery.
  verifiability text not null default 'v2' check (verifiability in ('v1','v2','v3')),
  status text not null default 'draft' check (status in ('draft','verified','retired')),
  version int not null default 1,
  created_by uuid,
  created_at timestamptz not null default now()
);
alter table kc enable row level security;
drop policy if exists "kc readable" on kc;
create policy "kc readable" on kc for select to authenticated using (status <> 'retired');
drop policy if exists "admin kc" on kc;
create policy "admin kc" on kc for all using (is_admin());
-- Authoring is service-role only; a student may read the library, never edit it.
revoke insert, update, delete on kc from anon, authenticated;
create index if not exists kc_subject_idx on kc (subject, status);

-- ── Graph edges ──────────────────────────────────────────────────────────────
-- prerequisite: mastery of `from_kc` materially raises learnability of `to_kc`.
-- confusable:   the two are discriminated against each other — this is what
--               drives interleaving. Interleaving works via discriminative
--               contrast, so the graph has to encode confusability, not just
--               ordering (Brunmair & Richter 2019 moderator analysis).
create table if not exists kc_edge (
  id uuid primary key default uuid_generate_v4(),
  from_kc uuid not null references kc(id) on delete cascade,
  to_kc uuid not null references kc(id) on delete cascade,
  kind text not null check (kind in ('prerequisite','confusable')),
  created_at timestamptz not null default now(),
  unique (from_kc, to_kc, kind),
  check (from_kc <> to_kc)
);
alter table kc_edge enable row level security;
drop policy if exists "kc edge readable" on kc_edge;
create policy "kc edge readable" on kc_edge for select to authenticated using (true);
drop policy if exists "admin kc edge" on kc_edge;
create policy "admin kc edge" on kc_edge for all using (is_admin());
revoke insert, update, delete on kc_edge from anon, authenticated;
create index if not exists kc_edge_to_idx on kc_edge (to_kc, kind);
create index if not exists kc_edge_from_idx on kc_edge (from_kc, kind);

-- ── Aliases: the decoupling layer ────────────────────────────────────────────
-- Maps whatever a syllabus called it → the canonical KC. One frontier call per
-- NOVEL topic string, cached here forever, so the Nth student on a known course
-- costs nothing to map.
create table if not exists kc_alias (
  id uuid primary key default uuid_generate_v4(),
  kc_id uuid not null references kc(id) on delete cascade,
  alias_norm text not null,          -- lowercased/collapsed form used for lookup
  alias_text text not null,          -- what the syllabus actually said
  subject text,
  confidence numeric not null default 1 check (confidence >= 0 and confidence <= 1),
  source text not null default 'llm' check (source in ('llm','human','student','seed')),
  created_at timestamptz not null default now(),
  unique (alias_norm, subject)
);
alter table kc_alias enable row level security;
drop policy if exists "kc alias readable" on kc_alias;
create policy "kc alias readable" on kc_alias for select to authenticated using (true);
drop policy if exists "admin kc alias" on kc_alias;
create policy "admin kc alias" on kc_alias for all using (is_admin());
revoke insert, update, delete on kc_alias from anon, authenticated;
create index if not exists kc_alias_norm_idx on kc_alias (alias_norm);

-- ── Misconception library ────────────────────────────────────────────────────
-- Named, diagnosable error patterns. Drives ELABORATED feedback ("you added the
-- denominators") instead of bare "try again" — elaborated feedback is the form
-- with the real effect size (Van der Kleij et al. 2015, g≈0.49), and bare
-- right/wrong is the form that does least.
-- Human tutors populate this over time via /api/tutoring/observe: a tutor who
-- names the real blocker is labelling training data for every other student.
create table if not exists kc_misconception (
  id uuid primary key default uuid_generate_v4(),
  kc_id uuid not null references kc(id) on delete cascade,
  label text not null,
  description text,
  feedback_md text,
  observed_count int not null default 0,
  source text not null default 'authored' check (source in ('authored','tutor','mined')),
  created_at timestamptz not null default now()
);
alter table kc_misconception enable row level security;
drop policy if exists "kc misconception readable" on kc_misconception;
create policy "kc misconception readable" on kc_misconception for select to authenticated using (true);
drop policy if exists "admin kc misconception" on kc_misconception;
create policy "admin kc misconception" on kc_misconception for all using (is_admin());
revoke insert, update, delete on kc_misconception from anon, authenticated;
create index if not exists kc_misconception_kc_idx on kc_misconception (kc_id);

-- Counts how often a misconception is actually observed in teaching. Tutors
-- naming a real blocker is what turns this library from authoring guesswork into
-- evidence, so the counter needs to be race-free across concurrent sessions.
create or replace function increment_misconception_observed(misconception_id uuid)
  returns void
  language sql
  security definer
  set search_path = public, pg_temp
as $$
  update kc_misconception set observed_count = observed_count + 1 where id = misconception_id;
$$;
revoke all on function increment_misconception_observed(uuid) from public, anon, authenticated;
grant execute on function increment_misconception_observed(uuid) to service_role;

-- ── Item bank ────────────────────────────────────────────────────────────────
-- answer_spec is the answer key. It is REVOKED from clients at column level
-- below — this is the direct fix for the current /api/practice defect, where the
-- key ships to the browser, correctness is compared client-side, and the client
-- then PATCHes its own mastery score.
create table if not exists kc_item (
  id uuid primary key default uuid_generate_v4(),
  kc_id uuid not null references kc(id) on delete cascade,
  kind text not null check (kind in ('mc','numeric','symbolic','short','order','cloze')),
  tier text not null default 'v2' check (tier in ('v1','v2','v3')),
  body text not null,                  -- the prompt shown to the learner
  choices jsonb not null default '[]', -- mc/order only; index-aligned with distractor_misconceptions
  answer_spec jsonb not null,          -- SERVER ONLY — see the revoke below
  distractor_misconceptions jsonb not null default '[]',
  context_tag text,                    -- surface context, for the ≥2-contexts mastery rule
  difficulty_elo numeric not null default 1200,
  exposures int not null default 0,
  status text not null default 'draft' check (status in ('draft','verified','retired')),
  verified_by text,
  verified_at timestamptz,
  error_reports int not null default 0,
  created_at timestamptz not null default now()
);
alter table kc_item enable row level security;
drop policy if exists "admin kc item" on kc_item;
create policy "admin kc item" on kc_item for all using (is_admin());
-- No client access at all. Items are served through /api/engine/check, which
-- strips answer_spec. Belt and braces: revoke the table, then the column.
revoke select, insert, update, delete on kc_item from anon, authenticated;
revoke select (answer_spec) on kc_item from anon, authenticated;
create index if not exists kc_item_bank_idx on kc_item (kc_id, status, tier);

-- Atomic exposure counter. Item rotation depends on this being race-free: two
-- concurrent checks incrementing via read-modify-write would undercount and let
-- an over-exposed item keep getting served.
create or replace function increment_item_exposure(item_id uuid)
  returns void
  language sql
  security definer
  set search_path = public, pg_temp
as $$
  update kc_item set exposures = exposures + 1 where id = item_id;
$$;
revoke all on function increment_item_exposure(uuid) from public, anon, authenticated;
grant execute on function increment_item_exposure(uuid) to service_role;

-- ── The learner's link into the library ──────────────────────────────────────
-- `local_title` preserves what the student's own syllabus called it, so the UI
-- never has to show them canonical vocabulary they don't recognise.
create table if not exists learner_kc (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kc_id uuid not null references kc(id) on delete cascade,
  course_id text references courses(id) on delete set null,
  source text not null default 'mapped' check (source in ('mapped','local','placement')),
  local_title text,
  mapping_confirmed boolean not null default false,  -- student corrected/accepted the mapping
  created_at timestamptz not null default now(),
  unique (user_id, kc_id)
);
alter table learner_kc enable row level security;
drop policy if exists "own learner kc" on learner_kc;
create policy "own learner kc" on learner_kc for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "admin learner kc" on learner_kc;
create policy "admin learner kc" on learner_kc for all using (is_admin());
-- Written server-side only (intake mapping + placement).
revoke insert, update, delete on learner_kc from anon, authenticated;
create index if not exists learner_kc_user_idx on learner_kc (user_id);
create index if not exists learner_kc_course_idx on learner_kc (user_id, course_id);
