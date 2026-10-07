-- 0011_rls_hardening.sql — close the client-side authorization holes.
-- Additive and idempotent; safe to re-run. Run after 0010.
--
-- WHY THIS EXISTS
-- Authorization was enforced only in the Next.js API layer. The anon key is
-- NEXT_PUBLIC_ by design and web/lib/cloud.js talks to PostgREST directly, so
-- every API-layer check had a parallel, unguarded path straight to the tables:
--
--   update profiles set role='admin'          → full platform admin (is_admin()
--                                               in RLS + isAdminCaller in the API)
--   update profiles set plan='internal'       → the 100k/day entitlement row
--   update profiles set is_minor=false        → defeats the minor gate on live
--                                               1:1 video booking
--   update profiles set guardian_consent_at=… → a minor self-approves guardian
--                                               consent
--   select guardian_consent_token from profiles
--                                             → a minor reads the credential in
--                                               their own guardian's approval
--                                               link and clicks it themselves
--   update tutors set vetting_status='cleared', status='active'
--                                             → an unvetted stranger becomes
--                                               bookable by minors
--   insert parent_student_relationships(status:'active')
--                                             → read another student's reports
--
-- RLS restricts ROWS, not COLUMNS, so the fix is column-level GRANTs plus
-- tightened policies. Verified against the client: the browser only ever writes
-- profiles.{name,app_meta,email_opt_out,analytics_opt_out} and full rows of
-- courses / homework_items / student_concept_mastery / tutor_sessions /
-- documents. Every marketplace table is service-role-only in practice, so
-- direct client access to those is revoked outright.
--
-- The own-row policies from 0001 (courses, documents, homework_items, …) are
-- already correct — `for all using (auth.uid()=user_id) with check (…)` — and
-- are deliberately left untouched.

-- ── 1. is_admin(): SECURITY DEFINER ──────────────────────────────────────────
-- Was `language sql stable` and referenced from a policy ON profiles itself —
-- the canonical Postgres RLS recursion trap ("infinite recursion detected in
-- policy for relation profiles"), which cloud.js would have swallowed because
-- it never inspects {error}. SECURITY DEFINER runs the lookup outside RLS,
-- which both removes the recursion and makes the check authoritative.
create or replace function is_admin() returns boolean
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;
revoke all on function is_admin() from public;
grant execute on function is_admin() to anon, authenticated, service_role;

-- ── 2. profiles: column-level lockdown ───────────────────────────────────────
-- Writes: only the four fields the client actually edits (web/lib/cloud.js and
-- web/app/settings/page.js). role, plan, birth_year, is_minor, guardian_* and
-- both bearer tokens become service-role-only.
revoke update on profiles from anon, authenticated;
grant update (name, app_meta, email_opt_out, analytics_opt_out)
  on profiles to authenticated;

-- Reads: everything except the two bearer tokens. guardian_consent_token is the
-- credential in the guardian's approval link; unsubscribe_token is the same
-- shape. Neither belongs in a browser.
-- NOTE: this makes `select('*')` on profiles fail with "permission denied for
-- column". web/lib/cloud.js was changed to an explicit column list in the same
-- commit — any new caller must select explicit columns too.
revoke select on profiles from anon, authenticated;
grant select (
  id, email, name, role, plan, app_meta, created_at,
  birth_year, is_minor, guardian_email, guardian_consent_at,
  email_opt_out, analytics_opt_out
) on profiles to authenticated;

drop policy if exists "own profile write" on profiles;
create policy "own profile write" on profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- INSERT is the same hole wearing a different hat, and column-restricting the
-- UPDATE alone would have left it wide open. The profiles row does not exist
-- until getCaller() creates it on the first authenticated API call — so a user
-- who signs up and, BEFORE making any API call, inserts their own row straight
-- from the browser could set role='admin' at creation time. "own profile
-- insert" (with check auth.uid() = id) happily permits that, and getCaller's
-- later insert would simply fail on the primary key and fall back to the row
-- the attacker wrote. Nothing client-side inserts profiles; the server always
-- does, on the service role.
revoke insert on profiles from anon, authenticated;
drop policy if exists "own profile insert" on profiles;

-- ── 3. parent_student_relationships: a link always starts PENDING ────────────
-- The old policy constrained parent_id but not status, so anyone could insert
-- (parent_id=self, student_id=<victim>, status='active') and immediately read
-- that student's weekly_reports via the "parent reports read" policy.
-- Acceptance stays service-role — /api/family is why no UPDATE policy exists.
drop policy if exists "parent creates link" on parent_student_relationships;
create policy "parent creates link" on parent_student_relationships
  for insert to authenticated
  with check (auth.uid() = parent_id and status = 'pending');

-- ── 4. Marketplace + support tables: service-role only ───────────────────────
-- No client code reads or writes any of these with the anon key — every path
-- goes through web/app/api/tutoring/*, /api/handoff, /api/support and
-- /api/admin/* on the service role. Revoking direct access removes, in one
-- step: tutor self-vetting, the anonymous leak of tutors.vetting_notes
-- (FCRA-sensitive background-check commentary) and tutor_reviews.student_id,
-- the role-scoped handoff read, and anonymous support_requests inserts.
revoke insert, update, delete
  on tutors, tutor_availability, tutoring_sessions, tutor_earnings,
     tutor_applications, tutor_reviews, human_handoff_requests, support_requests
  from anon, authenticated;
revoke select
  on tutors, tutor_reviews, tutor_earnings, tutor_applications,
     human_handoff_requests
  from anon, authenticated;

-- Policies kept as defense in depth, with the dangerous ones corrected.
-- "tutor own row" was `for all` — that is what allowed self-vetting.
drop policy if exists "tutor own row" on tutors;
create policy "tutor own row read" on tutors for select to authenticated
  using (auth.uid() = user_id);

-- The browse policy ignored vetting_status entirely; it matched the API's hard
-- gate (app/api/tutoring/sessions/route.js) only by luck.
drop policy if exists "students browse active tutors" on tutors;
create policy "students browse vetted tutors" on tutors for select to anon, authenticated
  using (status = 'active' and vetting_status = 'cleared');

drop policy if exists "students browse open slots" on tutor_availability;
create policy "students browse open slots" on tutor_availability for select to anon, authenticated
  using (
    status = 'open'
    and exists (
      select 1 from tutors t
      where t.id = tutor_id and t.status = 'active' and t.vetting_status = 'cleared'
    )
  );

-- Granted EVERY user with role='tutor' read access to EVERY student's handoff
-- notes and transcript_summary — scoped to the role, never to an assignment.
-- Admins read the queue through /api/admin/handoffs on the service role.
drop policy if exists "tutor handoffs read" on human_handoff_requests;

-- Exposed student_id and tutoring_session_id to anon; the app only ever selects
-- rating/comment/created_at, and does so server-side.
drop policy if exists "reviews are public" on tutor_reviews;

-- Allowed `user_id is null` inserts straight from the browser. The public
-- contact form posts to /api/support (service role), which is rate-limited.
drop policy if exists "insert support" on support_requests;

-- ── 5. Reference tables: scope the USING(true) reads ─────────────────────────
-- app_settings stays anon-readable: components/LoginPage.js reads
-- signups_enabled before a session exists. plan_entitlements has no anonymous
-- reader, so it does not need to be world-readable.
drop policy if exists "entitlements readable" on plan_entitlements;
create policy "entitlements readable" on plan_entitlements for select to authenticated
  using (true);

-- ── 6. avatars bucket: let a user remove their own photo ─────────────────────
-- 0004 granted INSERT and UPDATE on the caller's own folder but no DELETE, so
-- removal depended entirely on the server-side purge.
drop policy if exists "avatar delete own" on storage.objects;
create policy "avatar delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
