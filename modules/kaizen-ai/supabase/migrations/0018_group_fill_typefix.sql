-- 0018_group_fill_typefix.sql
--
-- resolve_group_fill() failed on EVERY call, including calls with nothing to do.
--
-- The function declares `returns table(session_id uuid, action text, seats integer)`
-- but the third column is `count(*)`, which is bigint. PL/pgSQL validates the
-- tuple descriptor when RETURN QUERY sets up its plan — not per row — so the
-- error fires even against an empty group_session table:
--
--   ERROR:  42804: structure of query does not match function result type
--   DETAIL:  Returned type bigint does not match expected type integer in column 3.
--
-- Verified against the live database with a throwaway probe of identical shape
-- before writing this fix.
--
-- WHAT IT COST
-- lib/server/maintenance.js calls this from the hourly cron. Every run raised,
-- so nothing downstream of it ran: a group session at its cutoff was never
-- confirmed and never cancelled for under-fill, which also means a student who
-- paid for a seat in a session that never filled was never auto-refunded. The
-- failure is invisible until the feature is actually used, which is the worst
-- shape a bug can have.
--
-- The cast is to int rather than widening the signature: a seat count is bounded
-- by group_session.capacity (2..6), so integer is the honest type and the
-- callers in JS already treat it as a small number.

create or replace function resolve_group_fill()
returns table(session_id uuid, action text, seats integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  with due as (
    select gs.id, gs.min_seats,
           (select count(*) from group_seat s
             where s.group_session_id = gs.id and s.status in ('pending_payment','booked')) as taken
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
