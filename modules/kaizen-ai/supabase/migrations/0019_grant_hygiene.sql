-- 0019_grant_hygiene.sql
--
-- Defense in depth on table privileges, plus the fix that stops this recurring.
--
-- NOTHING HERE WAS EXPLOITABLE. Verified against the live database before
-- writing: RLS is enabled on every application table, `anon`/`authenticated`
-- cannot bypass RLS, hold no CREATE on the schema, and PostgREST exposes no
-- TRUNCATE verb. The privileges below were unreachable in practice.
--
-- They are still wrong, for two reasons.
--
-- 1. THE GRANTS CONTRADICT THE POLICIES.
--    `subscriptions` grants INSERT/UPDATE/DELETE to anon and authenticated while
--    its only non-admin policy is `own subscription read` (SELECT). RLS denies
--    the writes, so the grants are inert — but they mean the table is one
--    carelessly-permissive policy away from a learner setting their own
--    plan='family', status='active' and paying nothing. Privileges should not
--    quietly disagree with intent; the deny should be stated twice.
--
-- 2. TRUNCATE IS NOT SUBJECT TO RLS.
--    All 57 public tables granted TRUNCATE (plus TRIGGER and REFERENCES) to both
--    client roles — Supabase's default `grant all`, which migrations 0011-0017
--    only partially revoked because they revoked SELECT/INSERT/UPDATE/DELETE by
--    name. RLS is the control everywhere else in this schema, and TRUNCATE is the
--    one DML-ish verb it does not cover. Not reachable through PostgREST today;
--    reachable the moment anything else can execute SQL as those roles.
--
-- THE ROOT CAUSE, AND THE ACTUAL FIX
-- `alter default privileges` in this project grants `arwdDxtm` (everything) to
-- anon and authenticated on every FUTURE table. So every new table starts fully
-- client-writable and is only safe if its migration remembers to revoke. That is
-- backwards for an architecture whose rule is "the server is the only writer"
-- (see 0013: the evidence ledger has no client INSERT policy by design).
--
-- After this migration a new table starts CLOSED and must explicitly grant. The
-- failure mode flips from "silently writable" to "permission denied" — loud,
-- immediate, and fixed in the migration that introduced it.
--
-- NOTE FOR WHOEVER ADDS A TABLE NEXT: if a new table needs to be read directly by
-- the browser through PostgREST, you must now say so:
--     grant select on <table> to authenticated;
-- Most tables here should NOT need it — reads go through /api/* with the service
-- role. That is the intended shape, not an inconvenience.

-- ── 1. Strip privileges RLS cannot govern, from every application table ───────
do $$
declare t record;
begin
  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
  loop
    execute format(
      'revoke truncate, trigger, references on public.%I from anon, authenticated',
      t.relname);
  end loop;
end $$;

-- ── 2. Make privileges agree with policies where they provably disagree ──────
-- Every table below was checked against pg_policy on the live database: none has
-- a non-admin INSERT/UPDATE/DELETE policy, so RLS already denies these writes and
-- the grant is inert. Revoking states the intent twice.
--
-- Deliberately NOT included: courses, documents, homework_items, practice_sets,
-- tutor_sessions, plan_groups, plan_group_members, concepts, document_chunks,
-- kaizen_reviews, parent_student_relationships, voice_sessions, weekly_reports,
-- accounts, app_settings, concept_prerequisites. Those ARE client-synced by
-- design and carry `auth.uid() = user_id` policies; revoking would break sync.
revoke insert, update, delete on subscriptions          from anon, authenticated;
revoke insert, update, delete on plan_entitlements      from anon, authenticated;
revoke insert, update, delete on trial_redemptions      from anon, authenticated;
revoke insert, update, delete on intro_redemptions      from anon, authenticated;
revoke insert, update, delete on system_prompt_versions from anon, authenticated;
revoke insert, update, delete on safety_events          from anon, authenticated;
revoke insert, update, delete on audit_logs             from anon, authenticated;
revoke insert, update, delete on usage_ledger           from anon, authenticated;

-- KNOWN AND LEFT ALONE: mastery_events and student_concept_mastery carry
-- `auth.uid() = user_id` policies for ALL commands, so a learner really can write
-- their own rows. That is the legacy SM-2 sync path (web/lib/cloud.js) and
-- changing it here would break client sync. It is also exactly why the engine
-- does not trust them: confirmed mastery is computed from `evidence`, which has
-- no client INSERT policy at all (0013). The self-assertable number is the
-- legacy WORKING one; the CONFIRMED one is server-authoritative.

-- ── 3. Future tables start closed ────────────────────────────────────────────
-- Applies to objects created by `postgres`, which is what runs migrations.
-- Supabase's own `supabase_admin` default ACL is owned by a role we cannot alter
-- here; tables created by internal Supabase tooling may still arrive open, which
-- is why the audit query at the bottom of this file exists.
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

-- ── 4. Standing audit ────────────────────────────────────────────────────────
-- Run this after any migration. Any row it returns is a table the browser can
-- write to directly, which for this architecture is almost always a mistake.
create or replace view admin_client_writable_tables as
select g.table_name,
       g.grantee,
       string_agg(g.privilege_type, ', ' order by g.privilege_type) as privileges
from information_schema.role_table_grants g
where g.table_schema = 'public'
  and g.grantee in ('anon', 'authenticated')
  and g.privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
group by g.table_name, g.grantee;

revoke all on admin_client_writable_tables from anon, authenticated;
