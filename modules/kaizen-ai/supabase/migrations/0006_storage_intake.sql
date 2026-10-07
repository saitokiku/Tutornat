-- 0006_storage_intake.sql — magic box at scale. A private per-user documents
-- bucket lets the client upload many/large files straight to Storage; the
-- ingest API downloads + extracts them one at a time (no 4.5MB request-body
-- limit). Safe to re-run.

-- Private documents bucket, folder-per-user (path = <uid>/<docId>/<name>).
insert into storage.buckets (id, name, public, file_size_limit)
values ('documents', 'documents', false, 26214400)  -- 25MB per object
on conflict (id) do nothing;

drop policy if exists "documents_insert_own" on storage.objects;
create policy "documents_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "documents_select_own" on storage.objects;
create policy "documents_select_own" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "documents_delete_own" on storage.objects;
create policy "documents_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

-- documents table: lifecycle + dedup fields.
alter table documents
  add column if not exists status text not null default 'ready',  -- stored|reading|ready|failed
  add column if not exists sha256 text,
  add column if not exists error text;

-- Same file uploaded twice is one library entry (per user).
create unique index if not exists documents_user_sha_idx
  on documents (user_id, sha256) where sha256 is not null;
