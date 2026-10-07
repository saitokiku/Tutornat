-- Kaizen AI — initial schema
-- Every user-owned table has user_id + RLS. Admin tables require admin role.
-- Run via Supabase SQL editor or `supabase db push`.

create extension if not exists "uuid-ossp";

-- ── Roles helper ──────────────────────────────────────────────────────────────
-- profiles.role: student | parent | tutor | admin
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  role text not null default 'student' check (role in ('student','parent','tutor','admin')),
  plan text not null default 'free' check (plan in ('free','student','plus','family','internal')),
  app_meta jsonb not null default '{}'::jsonb,  -- goal, learningStyle, streak, activity, masteryHistory
  created_at timestamptz not null default now()
);
alter table profiles enable row level security;
create policy "own profile read"  on profiles for select using (auth.uid() = id);
create policy "own profile write" on profiles for update using (auth.uid() = id);
create policy "own profile insert" on profiles for insert with check (auth.uid() = id);

create or replace function is_admin() returns boolean language sql stable as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;
create policy "admin read all profiles" on profiles for select using (is_admin());
create policy "admin update profiles"   on profiles for update using (is_admin());

-- ── Accounts (family/org grouping; MVP: one implicit account per user) ───────
create table if not exists accounts (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'personal' check (kind in ('personal','family','org')),
  name text,
  created_at timestamptz not null default now()
);
alter table accounts enable row level security;
create policy "own account" on accounts for all using (auth.uid() = owner_id);
create policy "admin accounts" on accounts for select using (is_admin());

create table if not exists parent_student_relationships (
  id uuid primary key default uuid_generate_v4(),
  parent_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','active','revoked')),
  created_at timestamptz not null default now(),
  unique (parent_id, student_id)
);
alter table parent_student_relationships enable row level security;
create policy "parent sees own links"  on parent_student_relationships for select using (auth.uid() = parent_id or auth.uid() = student_id);
create policy "parent creates link"    on parent_student_relationships for insert with check (auth.uid() = parent_id);
create policy "admin psr" on parent_student_relationships for all using (is_admin());

-- ── Courses / documents / concepts ───────────────────────────────────────────
create table if not exists courses (
  id text primary key,  -- client-generated key (works offline-first)
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  code text,
  teacher text,
  color text default '#0A84FF',
  topics jsonb not null default '[]'::jsonb,
  source text not null default 'manual' check (source in ('manual','canvas','demo')),
  syllabus_status text not null default 'ready',
  next_exam_date date,
  created_at timestamptz not null default now()
);
alter table courses enable row level security;
create policy "own courses" on courses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "admin courses read" on courses for select using (is_admin());
create index if not exists courses_user_idx on courses(user_id);

create table if not exists documents (
  id text primary key,  -- client-generated key
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text references courses(id) on delete set null,
  concept text,
  name text not null,
  size_bytes int not null default 0,
  mime text,
  text_content text,          -- extracted text (<= ~15k chars MVP)
  storage_path text,          -- future: Supabase Storage / R2 object key
  created_at timestamptz not null default now()
);
alter table documents enable row level security;
create policy "own documents" on documents for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists documents_user_idx on documents(user_id);

create table if not exists document_chunks (
  id uuid primary key default uuid_generate_v4(),
  document_id text not null references documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  embedding jsonb,            -- pgvector swap-ready: alter to vector(1536) when extension enabled
  created_at timestamptz not null default now()
);
alter table document_chunks enable row level security;
create policy "own chunks" on document_chunks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists concepts (
  id uuid primary key default uuid_generate_v4(),
  course_id text references courses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
alter table concepts enable row level security;
create policy "own concepts" on concepts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists concept_prerequisites (
  id uuid primary key default uuid_generate_v4(),
  concept_id uuid not null references concepts(id) on delete cascade,
  prerequisite_id uuid not null references concepts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade
);
alter table concept_prerequisites enable row level security;
create policy "own prereqs" on concept_prerequisites for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Mastery (SM-2) ────────────────────────────────────────────────────────────
create table if not exists student_concept_mastery (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,                      -- concept name (client key)
  repetitions int not null default 0,
  ease_factor numeric not null default 2.5,
  interval_days int not null default 0,
  due_date timestamptz not null default now(),
  last_quality int,
  confidence numeric not null default 0,   -- derived 0..1
  history jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);
alter table student_concept_mastery enable row level security;
create policy "own mastery" on student_concept_mastery for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "admin mastery read" on student_concept_mastery for select using (is_admin());
create index if not exists mastery_user_due_idx on student_concept_mastery(user_id, due_date);

create table if not exists mastery_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  concept_name text not null,
  quality int not null,
  source text not null default 'chat_grade',
  created_at timestamptz not null default now()
);
alter table mastery_events enable row level security;
create policy "own mastery events" on mastery_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Tutor sessions / chats ────────────────────────────────────────────────────
create table if not exists tutor_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text references courses(id) on delete set null,
  concept text,                                  -- concept name (stable sync key)
  mode text not null default 'socratic',
  messages jsonb not null default '[]'::jsonb,   -- [{role, content}] capped client-side
  summary text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, concept, mode)
);
alter table tutor_sessions enable row level security;
create policy "own sessions" on tutor_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "admin sessions read" on tutor_sessions for select using (is_admin());

create table if not exists voice_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  seconds int not null default 0,
  provider text not null default 'browser',
  transcript_summary text,
  created_at timestamptz not null default now()
);
alter table voice_sessions enable row level security;
create policy "own voice" on voice_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Homework / practice ───────────────────────────────────────────────────────
create table if not exists homework_items (
  id text primary key,  -- client-generated key
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text references courses(id) on delete set null,
  title text not null,
  type text not null default 'homework',
  concept text,
  minutes int not null default 30,
  due timestamptz not null,
  status text not null default 'todo' check (status in ('todo','done')),
  completed_at timestamptz,
  manual boolean not null default false,
  created_at timestamptz not null default now()
);
alter table homework_items enable row level security;
create policy "own homework" on homework_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists homework_user_due_idx on homework_items(user_id, due);

create table if not exists practice_sets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text references courses(id) on delete set null,
  concepts jsonb not null default '[]'::jsonb,
  questions jsonb not null default '[]'::jsonb,
  results jsonb,
  created_at timestamptz not null default now()
);
alter table practice_sets enable row level security;
create policy "own practice" on practice_sets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Billing / entitlements / usage ───────────────────────────────────────────
create table if not exists subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null default 'free',
  status text not null default 'active' check (status in ('active','trialing','past_due','cancelled')),
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id)
);
alter table subscriptions enable row level security;
create policy "own subscription read" on subscriptions for select using (auth.uid() = user_id);
create policy "admin subscriptions" on subscriptions for all using (is_admin());

create table if not exists plan_entitlements (
  plan text not null,
  feature text not null,
  daily_limit int,
  monthly_limit int,
  primary key (plan, feature)
);
alter table plan_entitlements enable row level security;
create policy "entitlements readable" on plan_entitlements for select using (true);
create policy "admin entitlements" on plan_entitlements for all using (is_admin());

create table if not exists usage_ledger (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  feature text not null,       -- tutor_message | grade | syllabus_parse | tts_chars | report | handoff
  quantity numeric not null default 1,
  unit text not null default 'count',
  est_cost_usd numeric not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table usage_ledger enable row level security;
create policy "own usage read" on usage_ledger for select using (auth.uid() = user_id);
create policy "admin usage" on usage_ledger for select using (is_admin());
-- inserts happen with service role only (server-side)
create index if not exists usage_user_time_idx on usage_ledger(user_id, created_at);
create index if not exists usage_feature_time_idx on usage_ledger(feature, created_at);

-- ── Human handoff / support / safety ─────────────────────────────────────────
create table if not exists human_handoff_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_title text,
  concept text,
  urgency text not null default 'normal' check (urgency in ('low','normal','high')),
  note text,
  transcript_summary text,
  status text not null default 'open' check (status in ('open','scheduled','handled','cancelled')),
  created_at timestamptz not null default now()
);
alter table human_handoff_requests enable row level security;
create policy "own handoffs" on human_handoff_requests for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "admin handoffs" on human_handoff_requests for all using (is_admin());
create policy "tutor handoffs read" on human_handoff_requests for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'tutor')
);

create table if not exists support_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  topic text,
  message text not null,
  status text not null default 'open' check (status in ('open','resolved')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table support_requests enable row level security;
create policy "own support" on support_requests for select using (auth.uid() = user_id);
create policy "insert support" on support_requests for insert with check (auth.uid() = user_id or user_id is null);
create policy "admin support" on support_requests for all using (is_admin());

create table if not exists safety_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid,
  kind text not null,            -- integrity_refusal | concerning_content | rate_abuse
  detail text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table safety_events enable row level security;
create policy "admin safety" on safety_events for select using (is_admin());

-- ── Reports / kaizen / prompts / admin ───────────────────────────────────────
create table if not exists weekly_reports (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_md text not null,
  stats jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table weekly_reports enable row level security;
create policy "own reports" on weekly_reports for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "parent reports read" on weekly_reports for select using (
  exists (select 1 from parent_student_relationships r
          where r.parent_id = auth.uid() and r.student_id = weekly_reports.user_id and r.status = 'active')
);

create table if not exists kaizen_reviews (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid,
  scores jsonb not null default '{}'::jsonb,   -- correctness, clarity, pedagogy, safety, cfu
  findings text,
  proposed_prompt_change text,
  status text not null default 'proposed' check (status in ('proposed','approved','rejected')),
  created_at timestamptz not null default now()
);
alter table kaizen_reviews enable row level security;
create policy "admin kaizen" on kaizen_reviews for all using (is_admin());

create table if not exists system_prompt_versions (
  id uuid primary key default uuid_generate_v4(),
  name text not null,             -- tutor_system | voice_tutor_system | ...
  version int not null default 1,
  content text not null,
  active boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (name, version)
);
alter table system_prompt_versions enable row level security;
create policy "admin prompts" on system_prompt_versions for all using (is_admin());

create table if not exists app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table app_settings enable row level security;
create policy "settings readable" on app_settings for select using (true);
create policy "admin settings" on app_settings for all using (is_admin());

create table if not exists audit_logs (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid,
  action text not null,
  target text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table audit_logs enable row level security;
create policy "admin audit read" on audit_logs for select using (is_admin());
