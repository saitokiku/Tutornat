-- 0004_tutor_hiring.sql — curated tutor hiring pipeline, public profiles,
-- and post-session reviews. Safe to re-run.

-- ── Job applications ──────────────────────────────────────────────────────────
create table if not exists tutor_applications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  subjects text[] not null default '{}',
  education text,
  experience_years int,
  resume_path text,
  cover_note text,
  availability_note text,
  status text not null default 'submitted'
    check (status in ('submitted','reviewing','interview','approved','rejected')),
  reviewer_notes text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (user_id)  -- one live application per account; re-apply updates it
);
alter table tutor_applications enable row level security;
drop policy if exists "applicant reads own application" on tutor_applications;
create policy "applicant reads own application" on tutor_applications for select
  using (auth.uid() = user_id);
drop policy if exists "admin applications" on tutor_applications;
create policy "admin applications" on tutor_applications for all using (is_admin());
-- writes go through the service-role API (side effects: emails, tutor creation)

-- Resume storage: private bucket, folder-per-user writes, admin/service reads.
insert into storage.buckets (id, name, public, file_size_limit)
values ('applications', 'applications', false, 10485760)  -- 10MB resumes
on conflict (id) do nothing;
drop policy if exists "applications_insert_own" on storage.objects;
create policy "applications_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'applications' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "applications_select_own" on storage.objects;
create policy "applications_select_own" on storage.objects for select to authenticated
  using (bucket_id = 'applications' and ((storage.foldername(name))[1] = auth.uid()::text or is_admin()));

-- ── Public profile fields ─────────────────────────────────────────────────────
alter table tutors
  add column if not exists photo_url text,
  add column if not exists slug text,
  add column if not exists headline text;
create unique index if not exists tutors_slug_idx on tutors (slug) where slug is not null;

-- Public avatars bucket for tutor profile photos. `public=true` makes object
-- URLs world-readable (needed for the anonymous directory) while writes stay
-- scoped to the owner's folder.
insert into storage.buckets (id, name, public, file_size_limit)
values ('avatars', 'avatars', true, 3145728)  -- 3MB
on conflict (id) do nothing;
drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ── Reviews (fuel the public directory) ──────────────────────────────────────
create table if not exists tutor_reviews (
  id uuid primary key default uuid_generate_v4(),
  tutoring_session_id uuid not null unique references tutoring_sessions(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  tutor_id uuid not null references tutors(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);
alter table tutor_reviews enable row level security;
drop policy if exists "reviews are public" on tutor_reviews;
create policy "reviews are public" on tutor_reviews for select using (true);
drop policy if exists "admin reviews" on tutor_reviews;
create policy "admin reviews" on tutor_reviews for all using (is_admin());
-- inserts go through the service-role API (must own a completed session)
create index if not exists tutor_reviews_tutor_idx on tutor_reviews (tutor_id, created_at desc);
