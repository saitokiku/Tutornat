-- 0005_session_payments.sql — pay-per-session commerce + the AI copilot columns
-- (pre-session brief, post-session recap) folded in here so 0006 stays about
-- storage intake. Safe to re-run.

alter table tutoring_sessions
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists paid boolean not null default false,
  add column if not exists refund_status text not null default 'none',
  add column if not exists reminder_sent_at timestamptz,
  add column if not exists brief_md text,   -- AI pre-session brief for the tutor (W5)
  add column if not exists recap_md text;   -- AI post-session recap for the family (W5)

-- refund_status ∈ none|refunded|partial
alter table tutoring_sessions drop constraint if exists tutoring_sessions_refund_status_check;
alter table tutoring_sessions add constraint tutoring_sessions_refund_status_check
  check (refund_status in ('none','refunded','partial'));

-- Extend the status enum with pending_payment (slot claimed, awaiting Stripe).
-- Drop-then-add keeps this idempotent across re-runs.
alter table tutoring_sessions drop constraint if exists tutoring_sessions_status_check;
alter table tutoring_sessions add constraint tutoring_sessions_status_check
  check (status in ('pending_payment','scheduled','in_progress','completed','cancelled','no_show'));

create index if not exists tutoring_sessions_checkout_idx
  on tutoring_sessions (stripe_checkout_session_id) where stripe_checkout_session_id is not null;
create index if not exists tutoring_sessions_pending_idx
  on tutoring_sessions (status, created_at) where status = 'pending_payment';
