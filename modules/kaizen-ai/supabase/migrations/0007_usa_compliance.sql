-- 0007_usa_compliance.sql — USA launch compliance: minors' guardian consent,
-- tutor vetting enforcement, safety-report triage, and email opt-out.
-- Safe to re-run.

-- ── Profiles: minor status, guardian consent, email preferences ───────────────
alter table profiles
  add column if not exists birth_year int,
  add column if not exists is_minor boolean not null default false,
  add column if not exists guardian_email text,
  add column if not exists guardian_consent_at timestamptz,
  add column if not exists guardian_consent_token uuid default uuid_generate_v4(),
  add column if not exists email_opt_out boolean not null default false,
  add column if not exists unsubscribe_token uuid default uuid_generate_v4(),
  add column if not exists analytics_opt_out boolean not null default false;

-- Older rows predate the defaults — backfill their tokens so links work.
update profiles set unsubscribe_token = uuid_generate_v4() where unsubscribe_token is null;
update profiles set guardian_consent_token = uuid_generate_v4() where guardian_consent_token is null;

create index if not exists profiles_unsub_token_idx on profiles (unsubscribe_token);
create index if not exists profiles_guardian_token_idx on profiles (guardian_consent_token);

-- ── Tutors: vetting is a hard gate before students can book ──────────────────
alter table tutors
  add column if not exists vetting_status text not null default 'pending',
  add column if not exists vetting_notes text,
  add column if not exists vetted_at timestamptz,
  add column if not exists vetted_by uuid;
alter table tutors drop constraint if exists tutors_vetting_status_check;
alter table tutors add constraint tutors_vetting_status_check
  check (vetting_status in ('pending','cleared','rejected'));

-- ── Safety events: triage workflow for reports ────────────────────────────────
alter table safety_events
  add column if not exists status text not null default 'open',
  add column if not exists reported_tutor_id uuid,
  add column if not exists tutoring_session_id uuid;
alter table safety_events drop constraint if exists safety_events_status_check;
alter table safety_events add constraint safety_events_status_check
  check (status in ('open','reviewing','resolved'));
-- admins manage the queue (SELECT policy exists from 0001; add update)
drop policy if exists "admin safety manage" on safety_events;
create policy "admin safety manage" on safety_events for all using (is_admin());
create index if not exists safety_events_open_idx on safety_events (status, created_at desc);
