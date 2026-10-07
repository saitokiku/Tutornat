-- 0025_parent_managed_accounts.sql — provenance for parent-created links.
-- Additive and idempotent. Run after 0024.
--
-- The original family flow is student-first: the student signs up, the parent
-- invites them by email, the student accepts. The club funnel is parent-first:
-- the parent creates a managed child profile (profiles.managed_by, 0022) and
-- the relationship is born 'active' — there is no child to ask, the parent IS
-- the guardian, and consent is recorded at creation (guardian_consent_at).
--
-- created_via records which path made the link, so support and safety reviews
-- can distinguish "child accepted an invite" from "parent created this child".
-- Writes remain service-role only: the client INSERT policy (0011) still
-- requires status='pending', which managed links never are.

alter table parent_student_relationships
  add column if not exists created_via text not null default 'invite'
    check (created_via in ('invite','managed'));
