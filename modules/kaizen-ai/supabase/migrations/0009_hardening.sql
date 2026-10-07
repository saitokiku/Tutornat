-- 0009_hardening.sql — audit remediation (docs/archive/AUDIT_FINDINGS.md). Safe to re-run.
--   REL-003: one free intro session per student, enforced by the database.
--   SEC-005: trial redemptions survive account deletion (hashed email, no PII).
--   REL-005/DATA-001: index to make the cron reminder/retention sweeps cheap.

-- ── One intro session per student (backstop for the count-then-insert race) ──
create unique index if not exists tutoring_sessions_one_intro_idx
  on tutoring_sessions (student_id) where intro_free;

-- ── Trial redemptions (SEC-005) ──────────────────────────────────────────────
-- Keyed by sha256(lowercased email) so no raw PII persists after account
-- deletion; the row itself intentionally has NO FK to auth.users. Disclosure
-- lives in the privacy policy ("hashed record of free-trial redemption").
create table if not exists trial_redemptions (
  email_hash text primary key,
  redeemed_at timestamptz not null default now()
);
alter table trial_redemptions enable row level security;
drop policy if exists "admin trial redemptions" on trial_redemptions;
create policy "admin trial redemptions" on trial_redemptions for all using (is_admin());
-- reads/writes go through the service-role checkout route only

-- ── Cron sweep support (REL-005, DATA-001) ───────────────────────────────────
create index if not exists tutoring_sessions_reminder_idx
  on tutoring_sessions (status, scheduled_start) where reminder_sent_at is null;
create index if not exists tutor_sessions_retention_idx
  on tutor_sessions (updated_at);
