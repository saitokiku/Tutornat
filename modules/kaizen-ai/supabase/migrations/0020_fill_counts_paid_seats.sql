-- 0020_fill_counts_paid_seats.sql
--
-- resolve_group_fill() counted 'pending_payment' seats toward min_seats, so a
-- room could CONFIRM on two abandoned checkouts.
--
-- A seat becomes 'pending_payment' the moment a student clicks through to
-- Stripe, and stays there forever if they close the tab. Two such clicks met
-- min_seats = 2, the room flipped to 'confirmed', and a tutor committed an hour
-- to a session that never had a paying student in it. The tutor is then owed for
-- a session that earned nothing, and any student who DID pay gets a room that
-- was sold as a small group and is actually a 1:1 — the opposite of the
-- minimum-fill promise, which exists precisely so nobody's time is wasted.
--
-- A hold is only evidence of intent for as long as a checkout could plausibly
-- still be open. Stripe Checkout Sessions expire after 24h, but a booking made
-- two hours before start needs a far tighter window than that, so this counts:
--
--   * every seat actually paid for ('booked'), plus
--   * holds created within the last 30 minutes — long enough for a real card
--     entry, short enough that an abandoned tab stops propping up a room.
--
-- Rooms are re-evaluated on every cron tick and the predicate has no upper
-- bound on cutoff_at, so a room that fails to confirm now is simply re-checked
-- next tick as holds age out or convert. Nothing gets stuck.

create or replace function resolve_group_fill()
returns table(session_id uuid, action text, seats integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  hold_window constant interval := interval '30 minutes';
begin
  return query
  with due as (
    select gs.id, gs.min_seats,
           (select count(*) from group_seat s
             where s.group_session_id = gs.id
               and (
                 s.status = 'booked'
                 or (s.status = 'pending_payment' and s.created_at > now() - hold_window)
               )) as taken
    from group_session gs
    where gs.status = 'open'
      and gs.cutoff_at is not null
      and gs.cutoff_at <= now()
  ),
  confirmed as (
    update group_session g set status = 'confirmed'
    from due where due.id = g.id and due.taken >= due.min_seats
    returning g.id, 'confirmed'::text as action, due.taken::int as taken
  ),
  cancelled as (
    update group_session g
      set status = 'cancelled',
          cancel_reason = 'below_minimum_fill'
    from due where due.id = g.id and due.taken < due.min_seats
    returning g.id, 'cancelled'::text as action, due.taken::int as taken
  )
  select * from confirmed
  union all
  select * from cancelled;
end $$;

revoke all on function resolve_group_fill() from anon, authenticated;
