-- 0021_cancellation_provenance.sql
--
-- tutoring_sessions records THAT a session was cancelled and nothing about WHY
-- or WHEN. Status flips to 'cancelled' and the reason is gone.
--
-- That was survivable while cancellation was always a human clicking a button
-- and telling the other party. It stops being survivable now that the platform
-- cancels sessions on its own behalf — pulling a tutor out of the marketplace
-- (lib/server/tutorSafety.js) cancels every future session that tutor had.
-- When a parent asks in three months why their Thursday session vanished, or a
-- tutor disputes a clawback, "status = cancelled" is not an answer, and a
-- support person guessing is worse than one reading a record.
--
-- group_session already carries cancel_reason (0017). This brings the 1:1 table
-- level with it, so the two cancellation paths can be reasoned about together.
--
-- Additive and behaviour-neutral: nothing reads these until the code that
-- writes them ships alongside.

alter table tutoring_sessions
  add column if not exists cancelled_at timestamptz,
  -- Free text rather than an enum: the set of reasons is not knowable yet, and
  -- an unrecognised reason must never be the thing that fails a cancellation.
  -- Known values so far: 'tutor_withdrawn' (platform pulled the tutor),
  -- 'student_cancelled', 'tutor_cancelled', 'below_minimum_fill'.
  add column if not exists cancel_reason text,
  -- Who initiated it. NULL for platform/automated action, which is itself
  -- meaningful — it distinguishes "we cancelled this" from "someone did".
  add column if not exists cancelled_by uuid references profiles(id) on delete set null;

create index if not exists tutoring_sessions_cancelled_idx
  on tutoring_sessions (tutor_id, cancelled_at)
  where cancelled_at is not null;

-- ── Tutor age attestation ────────────────────────────────────────────────────
-- Tutors work unsupervised on video with minors and nothing anywhere recorded
-- that they are adults. Stripe's KYC would eventually surface an underage
-- account during payout onboarding — months later, after they had been teaching.
-- This is a minors-facing-role check, not a money check, so it belongs at
-- application time and gates clearing rather than payouts.
--
-- Nullable on purpose: existing applicants predate the question and must be
-- re-asked rather than silently assumed. /api/admin/tutors refuses to clear a
-- tutor without it.
alter table tutors
  add column if not exists adult_attested_at timestamptz;

-- 0019 flipped default privileges closed, so a new column needs no grant; the
-- revoke is restated because the table predates 0019 and carries older grants.
revoke insert, update, delete on tutoring_sessions from anon, authenticated;
