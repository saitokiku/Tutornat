-- 0026_hall_operations.sql — the Homework Hall operating model (launch plan v2 §3).
-- Additive and idempotent. Run after 0025.
--
-- A Hall is NOT "get in a room and hope": every seat carries a structured
-- intake (what are you working on, where are you stuck, what does done look
-- like), a live help status the student flips during the session (the tutor
-- works the room Red → Yellow → Green), and an exit summary the tutor writes
-- at the end — what got done, what's left, and a concrete next-step
-- recommendation (rebook / clinic / private). Together these three fields ARE
-- v1 of the evidence ledger: proof of what happened in the session, per
-- student, without a new platform.
--
-- All writes go through service-role routes (0019 hygiene: no client
-- insert/update grants on group_seat), so shapes are validated in
-- app/api/tutoring/group/* — the DB pins only the coarse invariants.

-- What the student is bringing, captured at booking:
--   { subject, topic, stuck, goal } — all short strings. The legacy free-text
-- `bring` column stays for old rows and as the composed fallback.
alter table group_seat add column if not exists intake jsonb;

-- Live queue state during the session. green = working fine · yellow = check
-- on me when you can · red = blocked, can't proceed. Timestamp orders equal
-- colors first-raised-first-served.
alter table group_seat add column if not exists help_status text not null default 'green'
  check (help_status in ('green','yellow','red'));
alter table group_seat add column if not exists help_status_at timestamptz;

-- Tutor-authored exit summary:
--   { accomplished, remaining, understood, recommendation, note }
-- recommendation ∈ rebook | clinic | private (enforced in the route — it also
-- drives the "what next" email/UI). Attendance itself reuses seat status
-- ('attended' / 'no_show', 0017).
alter table group_seat add column if not exists exit jsonb;
