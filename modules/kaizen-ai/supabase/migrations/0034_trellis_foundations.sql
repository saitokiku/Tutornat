-- 0034_trellis_foundations.sql — the mastery record becomes immutable in the
-- database, and the knowledge lattice learns which standards its nodes align
-- to. Additive and idempotent. Run after 0033.
--
-- WHY (docs/STRATEGY.md v0.2 §4.4)
-- "Append-only" was a code convention: 0013 revoked client writes and no code
-- path updates or deletes evidence, but nothing in the database said so. A
-- record that a ministry or a college is asked to trust has to be immutable by
-- construction, not by discipline. And the lattice (kc + kc_edge, 0012) carried
-- a `standards` jsonb column with zero readers and zero values; a typed
-- crosswalk keyed by CASE identifier is what a portable, standards-aligned
-- export (Open Badges 3.0 achievement.alignment) actually needs.
--
-- WHAT THIS DOES NOT DO
-- It does not block DELETE. Account deletion cascades from auth.users (0013)
-- and the retention schedule (docs/compliance/RETENTION.md) both remove rows
-- as a whole; a trigger that raised on DELETE would break a legal duty to make
-- an operational one true. Rows cannot be ALTERED; they can be removed with
-- the person they belong to. Corrections are new rows that point at the row
-- they adjust.

-- ── Evidence: corrections are new rows ───────────────────────────────────────
alter table evidence add column if not exists adjusts_evidence_id uuid
  references evidence(id) on delete set null;
create index if not exists evidence_adjusts_idx on evidence (adjusts_evidence_id)
  where adjusts_evidence_id is not null;

-- ── Evidence: immutable by construction ──────────────────────────────────────
create or replace function evidence_is_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'evidence is append-only: row % may not be updated. Append a correcting row with adjusts_evidence_id = %.',
    old.id, old.id
    using errcode = 'restrict_violation';
end;
$$;

drop trigger if exists evidence_append_only on evidence;
create trigger evidence_append_only
  before update on evidence
  for each row execute function evidence_is_append_only();

-- ── The standards crosswalk ──────────────────────────────────────────────────
-- One row per (knowledge component, framework, code). TEA publishes TEKS in
-- 1EdTech CASE format (teks.texasgateway.org); case_uri is that identifier when
-- known, so an exported credential can point at the standard itself rather than
-- at our label for it. `alignment` is the CASE vocabulary: exact / partial /
-- broad. Readable by any signed-in user (it is reference data, like kc_edge);
-- writable by admins only.
create table if not exists kc_standard (
  id         uuid primary key default uuid_generate_v4(),
  kc_id      uuid not null references kc(id) on delete cascade,
  framework  text not null check (framework in ('TEKS','CCSS')),
  code       text not null,
  case_uri   text,
  alignment  text not null default 'exact' check (alignment in ('exact','partial','broad')),
  created_at timestamptz not null default now(),
  unique (kc_id, framework, code)
);
create index if not exists kc_standard_kc_idx on kc_standard (kc_id);
create index if not exists kc_standard_code_idx on kc_standard (framework, code);

alter table kc_standard enable row level security;
drop policy if exists "kc standard readable" on kc_standard;
create policy "kc standard readable" on kc_standard for select to authenticated using (true);
drop policy if exists "admin kc standard" on kc_standard;
create policy "admin kc standard" on kc_standard for all using (is_admin());
revoke insert, update, delete on kc_standard from anon, authenticated;

-- ── Verification ─────────────────────────────────────────────────────────────
-- select tgname from pg_trigger where tgrelid = 'evidence'::regclass and tgname = 'evidence_append_only';
-- select count(*) from kc_standard;
