-- 0037_learner_focus.sql — where "today's lesson" lives. Additive and
-- idempotent. Run after 0036.
--
-- WHY (docs/STRATEGY.md v0.2 §4.6, the homeschool case)
-- A parent using Kaizen to teach at home needs to be able to say "work on this
-- one today", and the assignment has to survive the child opening the app. The
-- first implementation put it in profiles.app_meta, which is the wrong home:
-- lib/cloud.js pushApp() rewrites app_meta as a whole literal object with a
-- fixed key set on every debounced client sync, so a focus set by a parent was
-- deleted within seconds of the child launching the product — silently, and
-- exactly when it mattered.
--
-- So the focus gets a table the client does not own. Writes are service-role
-- only (every path goes through /api/engine/session, which re-derives the
-- guardian relationship first); the learner and their guardian can read it.
--
-- WHAT THIS IS NOT
-- It is not a mastery record and it never becomes one. Setting a focus writes
-- no evidence, recomputes no estimate, and confirms nothing: a parent assigns
-- anything and certifies nothing (hard rule 5). `set_by` exists so the product
-- can say who chose the concept, not to give a parent's choice any evidentiary
-- weight.

create table if not exists learner_focus (
  user_id    uuid primary key references profiles(id) on delete cascade,
  kc_id      uuid not null references kc(id) on delete cascade,
  set_by     text not null default 'learner' check (set_by in ('learner','parent')),
  set_at     timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists learner_focus_kc_idx on learner_focus (kc_id);

alter table learner_focus enable row level security;

-- The learner reads their own focus.
drop policy if exists "learner reads own focus" on learner_focus;
create policy "learner reads own focus" on learner_focus
  for select to authenticated using (user_id = auth.uid());

-- A guardian reads a managed child's focus, through the same active link the
-- rest of the parent surfaces use (0025).
drop policy if exists "guardian reads child focus" on learner_focus;
create policy "guardian reads child focus" on learner_focus
  for select to authenticated using (
    exists (
      select 1 from parent_student_relationships r
      where r.student_id = learner_focus.user_id
        and r.parent_id = auth.uid()
        and r.status = 'active'
    )
  );

drop policy if exists "admin learner focus" on learner_focus;
create policy "admin learner focus" on learner_focus for all using (is_admin());

-- Nobody writes this from a browser. The service role does, after the route
-- has checked the relationship and that the concept is on the learner's
-- trellis.
revoke insert, update, delete on learner_focus from anon, authenticated;

-- ── Verification ─────────────────────────────────────────────────────────────
-- select count(*) from learner_focus;
-- select polname from pg_policies where tablename = 'learner_focus';
