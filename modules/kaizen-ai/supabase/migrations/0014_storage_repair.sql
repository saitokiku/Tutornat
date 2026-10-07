-- 0014_storage_repair.sql — make Storage actually work.
-- Self-contained and idempotent. Safe to run on its own, and safe to re-run.
--
-- WHY THIS EXISTS
--
-- 1. "Bucket not found" on every upload.
--    web/lib/intakeBatch.js:66 uploads to the `documents` bucket, which is
--    created by migration 0006. If 0006 was never applied, the bucket row
--    simply isn't there and Supabase Storage answers "Bucket not found" for
--    every single upload. Same for `applications` (resumes) and `avatars`
--    (tutor photos) from 0004. This file re-creates all three regardless of
--    which earlier migrations ran, so storage stops depending on migration
--    archaeology.
--
-- 2. A latent RLS gap that would have bitten next.
--    Three client call sites upload with `upsert: true`:
--      web/lib/intakeBatch.js:67          -> documents
--      web/app/tutors/apply/page.js:80    -> applications
--      web/app/tutor/page.js:271          -> avatars
--    An upsert over an EXISTING object needs UPDATE on storage.objects, but
--    only `avatars` was given an update policy (0004). So re-uploading a resume,
--    or retrying a failed document upload under the same doc id, fails with an
--    RLS violation rather than overwriting. Both missing policies are added here.
--
-- If SQL-level bucket creation is blocked on your project, create the three
-- buckets in Dashboard > Storage with the names/visibility below and re-run this
-- file for the policies only — the inserts will no-op.

-- ── Buckets ──────────────────────────────────────────────────────────────────
-- documents: private, 25MB. Path = <uid>/<docId>/<filename>.
insert into storage.buckets (id, name, public, file_size_limit)
values ('documents', 'documents', false, 26214400)
on conflict (id) do nothing;

-- applications: private, 10MB. Tutor resumes — admin-readable via is_admin().
insert into storage.buckets (id, name, public, file_size_limit)
values ('applications', 'applications', false, 10485760)
on conflict (id) do nothing;

-- avatars: PUBLIC, 3MB. Object URLs must be world-readable for the anonymous
-- tutor directory; writes stay scoped to the owner's folder.
insert into storage.buckets (id, name, public, file_size_limit)
values ('avatars', 'avatars', true, 3145728)
on conflict (id) do nothing;

-- Keep size limits correct even if a bucket was hand-created in the dashboard
-- with defaults — a 25MB PDF silently rejected by a 1MB limit is the same
-- class of confusing failure this file exists to end.
update storage.buckets set file_size_limit = 26214400, public = false where id = 'documents';
update storage.buckets set file_size_limit = 10485760, public = false where id = 'applications';
update storage.buckets set file_size_limit = 3145728,  public = true  where id = 'avatars';

-- ── documents: own-folder CRUD ───────────────────────────────────────────────
-- The first path segment is the owner's uid, which is what scopes every policy.
-- The ingest API re-checks this prefix server-side too (intake/ingest), because
-- the service role bypasses RLS entirely.
drop policy if exists "documents_insert_own" on storage.objects;
create policy "documents_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "documents_select_own" on storage.objects;
create policy "documents_select_own" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

-- MISSING BEFORE — required by `upsert: true` in intakeBatch.js.
drop policy if exists "documents_update_own" on storage.objects;
create policy "documents_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "documents_delete_own" on storage.objects;
create policy "documents_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

-- ── applications: own-folder writes, owner-or-admin reads ────────────────────
drop policy if exists "applications_insert_own" on storage.objects;
create policy "applications_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'applications' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "applications_select_own" on storage.objects;
create policy "applications_select_own" on storage.objects for select to authenticated
  using (bucket_id = 'applications' and ((storage.foldername(name))[1] = auth.uid()::text or is_admin()));

-- MISSING BEFORE — required by `upsert: true` in tutors/apply/page.js, so a
-- candidate replacing their resume currently hits an RLS violation.
drop policy if exists "applications_update_own" on storage.objects;
create policy "applications_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'applications' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'applications' and (storage.foldername(name))[1] = auth.uid()::text);

-- ── avatars: own-folder writes; reads are public via bucket.public ───────────
drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Let a user remove their own photo (also in 0011; repeated so this file stands
-- alone).
drop policy if exists "avatar delete own" on storage.objects;
create policy "avatar delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ── Verify ───────────────────────────────────────────────────────────────────
-- Expect exactly three rows. If any is missing, SQL-level bucket creation is
-- restricted on this project — create it in Dashboard > Storage and re-run.
select id, public, file_size_limit
from storage.buckets
where id in ('documents', 'applications', 'avatars')
order by id;
