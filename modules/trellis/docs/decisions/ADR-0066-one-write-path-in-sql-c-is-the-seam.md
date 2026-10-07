<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: vault/30-decisions/ADR-0066-one-write-path-in-sql-c-is-the-seam.md -->

---
title: "ADR-0066 — One write path, in SQL: C's schema, roles and locking are the E2 seam; A and B are its callers"
tags: [adr, kaizen, kaizenedu, engine, e2]
project: kaizenedu
date: 2026-09-17
decided_by: pm
status: accepted — binds the E2 rebase
---
# ADR-0066 — One write path, in SQL

## Context
By 02:30 CDT the three E2 parts had each landed a first round with their own conventions:
- **A** (assessment service, PR #7): roles `kz_*`, its own `schema.ts`, JS-side `SELECT … FOR UPDATE`
  on the attempt row then `pg_advisory_xact_lock(learner:skill)` — attempt → skill.
- **B** (exposure ledger, PR #8): JS-side session-level `pg_advisory_lock(account:learner:skill)`,
  attempt → skills sorted; session-level because its query closure has no transaction surface.
- **C** (PostgreSQL authority, draft PR #9): schema `e2`; literal roles `learner | tutor | report |
  assessment` plus a NOLOGIN `e2_writer` that owns fixed SQL functions
  (`e2.issue_attempt / submit_attempt / finalize_attempt / record_exposure / append_practice`);
  `e2.principals(login, household_id)` binds `session_user` to a household; business roles cannot
  touch tables directly; skill-first `pg_advisory_xact_lock(hashtextextended([household, learner,
  skill]))` via `lockSkills(client, household, learner, skills)` (sorted), serializable with retries.
C's own note: "those protocols must not be mixed." It is right — two lock orders in one database
is a deadlock waiting for load, and two role vocabularies is a grant that gets missed.

The pack said it in advance: C owns final DDL and roles; C merges first; A and B rebase. And C's
design is the contract made literal — "only a restricted assessment service may append qualifying
evidence" is enforced by the database, not by discipline in JavaScript. The PM executed C's
reproducer outside the sandbox at 02:28: `pgProven: true`, criteria 0–5 at expected exits.

## Decision
1. **C's `e2` schema, migrations, roles and SQL functions are the seam.** They are the only write
   path into attempts, exposure, evidence and projections. `kz_*` roles are dropped; `e2a`/`e2b`
   schemas are dropped on rebase.
2. **Lock order is C's, by construction:** callers do not take locks; the SQL functions do
   (`lockSkills` sorted, attempt inside). A's `FOR UPDATE` path and B's session-level lock are
   replaced by calls into `e2.*`. B's disclosed reason for a session-level lock disappears with it.
3. **A and B rebase as callers.** A's service calls `issue_attempt / submit_attempt /
   finalize_attempt`; B's writer calls `record_exposure` (store-before-deliver semantics match) and
   the seal reads the latch through `finalize_attempt`. Their harnesses and cases stay as
   *behavioural* proofs of the contract on top of C's functions; their PostgreSQL results transfer
   once re-run on the seam.
4. **E1's suite count is 16** (r2/r3 added cases); the issue text said 15 — documentary drift, C is
   right, issue #5 amended.
5. Rule version stays `e2-draft-1` until ADR-0064 is accepted.

## Order
C r2 (harness on the shared cluster, prove criteria itself, un-draft) → blind review on Fable →
merge C → A r4 and B r3 as rebases onto the seam → blind reviews → merge.

Links: [ADR-0065-postgres-is-a-pm-owned-service-sandboxes-connect](ADR-0065-postgres-is-a-pm-owned-service-sandboxes-connect.md) · [ADR-0064-e13-definitions-day-seven-contexts-clock](ADR-0064-e13-definitions-day-seven-contexts-clock.md) · [ENGINE-CONTRACT](../product/engine-contract.md) · kaizen *(PM vault: `20-mocs/kaizen`)*
