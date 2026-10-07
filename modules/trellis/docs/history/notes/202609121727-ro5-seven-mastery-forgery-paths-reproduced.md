<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: vault/10-notes/202609121727-ro5-seven-mastery-forgery-paths-reproduced.md -->

---
id: 202609121727
title: RO-5 - seven ways the engine can confirm mastery falsely, reproduced
tags: [kaizen, research, blocker, evidence-model]
sources: [shared/artifacts/kaizen-research/06-evidence-integrity.md]
project: kaizenai-saas
---
# The record can be forged by our own tutor — reproduced, not suspected

Astra RO-5, 2026-09-12 17:28 CDT (3.40 M input / 34.6 k output tokens). Report:
`shared/artifacts/kaizen-research/06-evidence-integrity.md`. Both repositories left unmodified.

## Reproduced in an isolated source harness
1. **Generated / null-ID checks reaching mastery** — the tutor authors its own check, it carries no item
   ID, and the grade reaches the mastery path. This is the one that makes the record forgeable.
2. **24-hour confirmation delay**, against the **48 h** SPEC §3.1 and the inherited engine spec require.
3. **Cross-session help missed** — hint detection sees only the current session, so instruction in one
   session does not disqualify a 'clean' attempt in the next.
4. **Assisted credit** reaching the estimate.
5. **Concurrent and retry double-counting.**
6. **Repeated items and item families** counted as independent demonstrations.
7. **Wrong generated answer keys** accepted.

## Not reproduced — and this is the valuable half
Ordinary sequential duplicates; the client-clock bypass; ungraded mastery credit. Three plausible
hypotheses that did not hold. Recording what **failed** to reproduce is what keeps a risk list from
growing forever, and it is the discipline the brief demanded.

PostgreSQL-level enforcement (RLS, privileges, transaction isolation) remains **unverified** — the harness
establishes code behaviour, not database enforcement.

## What it means
**The beta blocker stands.** ADR-0042's guarantee — that only unassisted, delayed, verified evidence
certifies, and practice merely earns the exam seat — is not currently true of the code. Nothing in it may
be described as holding until these are closed and the closure independently reproduced.

The original extraction-first sequencing is superseded by [ADR-0053-kaizenedu-engine-first-preserve-both](../../decisions/ADR-0053-kaizenedu-engine-first-preserve-both.md): KaizenEdu is the build home. The accepted engine-first contract is [ENGINE-CONTRACT](../../product/engine-contract.md). Original scheduling language is retained in 2026-09-13 *(PM vault: `60-log/2026-09-13`)*.

Related: [ADR-0042-practice-buys-the-exam-seat-never-the-grade](../../decisions/ADR-0042-practice-buys-the-exam-seat-never-the-grade.md) ·
[ADR-0049-k2-k4-k5-fired-early](../../decisions/ADR-0049-k2-k4-k5-fired-early.md) · kaizen *(PM vault: `20-mocs/kaizen`)*
