-- 0031_audit_hardening.sql — schema fixes from the 2026-08-18 full-repo audit
-- (docs/reviews/FULL_CODE_REVIEW_2026-08-18.md). Additive and idempotent.
-- Run after 0030.
--
-- Four defects, all of them the kind that only shows up under a race, a
-- cancellation, or a deletion — which is to say, in production and not in tests:
--
--   1. CROSS-USER DATA LOSS. tutors.user_id and group_session.tutor_id both
--      cascaded from auth.users, so one tutor deleting their own account erased
--      every room they had taught AND every other student's seat in those rooms
--      — including stripe_payment_intent_id and refund_status. Kaizen is the
--      merchant of record; those rows are the refund and dispute ledger. The FKs
--      below stop the cascade at the database, and the route refuses earlier
--      with a message a human can act on.
--
--   2. REBOOKING WAS PERMANENTLY BLOCKED. unique(group_session_id, student_id)
--      is unconditional and claim_group_seat did ON CONFLICT DO NOTHING, so any
--      cancelled seat — user cancel, abandoned checkout, Stripe error rollback,
--      or the T-4h release 0029 introduced — made that room un-rebookable
--      forever, answering "already_booked". The waitlist and release emails were
--      inviting people into a guaranteed failure. The RPC now RE-ARMS a
--      cancelled row instead of ignoring it.
--
--   3. DOUBLE TUTOR PAYOUTS. Group rooms have had a unique index on
--      tutor_earnings(group_session_id) since 0017; the 1:1 side never got the
--      equivalent, so a double-clicked "Complete" could accrue twice.
--
--   4. CHECK LOCKOUT (regression from 0030). The one-live-attempt index is
--      predicated on submitted_at IS NULL with no expiry clause — partial
--      indexes cannot call now() — but issueCheck only resumes attempts that
--      have not expired. After the 1-hour TTL the resume found nothing, the
--      insert hit the unique violation, and the learner was locked out of that
--      concept permanently. Expiring a stale attempt is now a database
--      function the route can call, so the fix cannot drift from the index.

-- ── 1. Money records survive account deletion ────────────────────────────────
-- RESTRICT rather than SET NULL: both columns are NOT NULL and carry the
-- identity the payout and refund story depends on. Deletion is not blocked
-- forever — it is blocked until a human offboards the tutor (reassign or cancel
-- their rooms), which is exactly the review a real business wants there.
alter table tutors drop constraint if exists tutors_user_id_fkey;
alter table tutors add constraint tutors_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete restrict;

alter table group_session drop constraint if exists group_session_tutor_id_fkey;
alter table group_session add constraint group_session_tutor_id_fkey
  foreign key (tutor_id) references tutors(id) on delete restrict;

-- A student's own seat rows still go with their account (their data, their
-- right) — but only once the API has confirmed none of them carry money.
-- app/api/account/delete/route.js refuses while settled seats or earnings exist.

-- ── 2. A cancelled seat can be rebooked ──────────────────────────────────────
create or replace function claim_group_seat(
  p_session uuid, p_student uuid, p_amount int, p_consent boolean, p_bring text
) returns table (seat_id uuid, seats_taken int, capacity int, outcome text)
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  v_cap int;
  v_status text;
  v_taken int;
  v_seat uuid;
begin
  -- Lock the room row first: everything below reads a consistent picture.
  select gs.capacity, gs.status into v_cap, v_status
  from group_session gs where gs.id = p_session for update;

  if v_cap is null then
    return query select null::uuid, 0, 0, 'not_found'; return;
  end if;
  if v_status not in ('open','confirmed') then
    return query select null::uuid, 0, v_cap, 'closed'; return;
  end if;

  select count(*)::int into v_taken
  from group_seat s
  where s.group_session_id = p_session and s.status in ('pending_payment','booked','attended');

  if v_taken >= v_cap then
    return query select null::uuid, v_taken, v_cap, 'full'; return;
  end if;

  -- The conflict target is a seat this student already holds in this room. If
  -- it is CANCELLED, this is a rebooking and the row is re-armed to a fresh
  -- hold; every field carrying the previous attempt's money, provenance or
  -- session history is reset so nothing leaks across bookings. If the seat is
  -- live, the WHERE fails, no row comes back, and the caller gets
  -- 'already_booked' exactly as before.
  insert into group_seat (group_session_id, student_id, amount_cents, guardian_consent, bring)
  values (p_session, p_student, p_amount, p_consent, p_bring)
  on conflict (group_session_id, student_id) do update
    set status                     = 'pending_payment',
        amount_cents               = excluded.amount_cents,
        guardian_consent           = excluded.guardian_consent,
        bring                      = excluded.bring,
        paid                       = false,
        -- NOT NULL default 'checkout' (0023) — a re-armed row is a fresh
        -- unsettled hold, and the booking route overwrites this the moment it
        -- settles (free/included set it explicitly). Writing null here raised
        -- 23502 and turned every rebooking into a 500.
        booked_via                 = 'checkout',
        booked_by                  = null,
        confirmed_at               = null,
        refund_status              = 'none',
        stripe_checkout_session_id = null,
        stripe_payment_intent_id   = null,
        reminder_sent_at           = null,
        intake                     = null,
        exit                       = null,
        help_status                = 'green',
        help_status_at             = null,
        created_at                 = now()
    where group_seat.status = 'cancelled'
  returning id into v_seat;

  if v_seat is null then
    return query select null::uuid, v_taken, v_cap, 'already_booked'; return;
  end if;

  return query select v_seat, v_taken + 1, v_cap, 'claimed';
end $$;
revoke all on function claim_group_seat(uuid, uuid, int, boolean, text) from public, anon, authenticated;
grant execute on function claim_group_seat(uuid, uuid, int, boolean, text) to service_role;

-- ── 3. One earnings row per 1:1 session ──────────────────────────────────────
-- Mirrors 0017's group_session_id index. Partial because the column is null on
-- every group-room earnings row.
create unique index if not exists tutor_earnings_session_idx
  on tutor_earnings (tutoring_session_id)
  where tutoring_session_id is not null;

-- ── 4. Expiring a stale check attempt ────────────────────────────────────────
-- Stamping submitted_at (with a null score, which is how a graded attempt is
-- told apart from an abandoned one) drops the row out of the partial unique
-- index from 0030 without deleting history. SECURITY DEFINER so the engine can
-- call it with the service role and nothing else can.
create or replace function expire_stale_check_attempts(p_user uuid, p_kc uuid)
  returns int
  language sql
  security definer
  set search_path = public, pg_temp
as $$
  with expired as (
    update check_attempt
       set submitted_at = expires_at
     where user_id = p_user
       and kc_id = p_kc
       and submitted_at is null
       and expires_at <= now()
    returning 1
  )
  select count(*)::int from expired;
$$;
revoke all on function expire_stale_check_attempts(uuid, uuid) from public, anon, authenticated;
grant execute on function expire_stale_check_attempts(uuid, uuid) to service_role;
