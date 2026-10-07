<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: vault/40-projects/kaizenai-saas/DRIFT.md -->

---
title: Kaizen — DRIFT
tags: [drift, kaizen]
project: kaizenai-saas
updated: 2026-09-16
---
# Kaizen — drift from SPEC and DIRECTION

| date | what | why | approved? | status |
|---|---|---|---|---|
| 2026-09-11 | STRATEGY v0.2's "private 1:1 tutoring not sold, not built" reversed for the AI product | Manny's A3/A5 | yes — ADR-0034 | recorded |
| 2026-09-11 | Austin-club-first sequence superseded by AI-only v1 | Manny's A3 | yes — ADR-0034 | recorded |

| 2026-09-12 | New-repository destination and old milestones superseded: KaizenEdu, preserve both, engine first, frontend then backend architecture | Manny's email | yes — [ADR-0053-kaizenedu-engine-first-preserve-both](../decisions/ADR-0053-kaizenedu-engine-first-preserve-both.md) | plan written, implementation pending: [ENGINE-FIRST-PLAN](engine-first-plan.md) |
| 2026-09-12 | Handoff said SPEC v1.0; file was v0.1-draft and still excluded under 13 despite ADR-0045 | Actual file and accepted ADRs | documentary correction | v0.2 direction update, design still draft |


## 2026-09-12 22:22 CDT — accepted focus and build start

[ADR-0055-school-first-engine-build](../decisions/ADR-0055-school-first-engine-build.md) closes adult accounts as a later product and prioritizes primary/elementary learning. The engine-first order is accepted; implementation authorized. SPEC advances to v0.3-school-first-build, with detailed design still under review. Corrected SPEC §2's unsupported assertion that Manny had accepted first-item-review ownership: K7 remains unanswered. Baseline tests reproduce the existing failures; matrix and paired E1 packet prepared. GitHub access blocks issue filing/dispatch, so no code repair or deployment is claimed.

## 2026-09-13 10:08 CDT — reconcile approved repository destination

[ADR-0059-product-repo-under-the-pm-account](../decisions/ADR-0059-product-repo-under-the-pm-account.md) supersedes SPEC §4.7, ENGINE-FIRST-PLAN §1 and the old staged E1 destination. Corrected those current instructions; behavioral SPEC remains v0.3-school-first-build. Bootstrap is verified and E1 issue #1 exists; criterion 0 makes the approved extraction auditable before containment. GitHub access is restored. Autonomous dispatch is held by the configured 70%/60% gate, not connectivity; no worker launched. Both source trees remain clean at preserved HEADs. The earlier MOC claim that the source README still fronts OpenMAIC was wrong: direct reading shows Natural Tutor and points to the preserved upstream README. K7 remains open. Evidence: `shared/artifacts/handler-scheduled-reconciliation-20260913T100441-0500/evidence.json`.

## 2026-09-16 23:5x CDT — scope widened to every age; E1 dispatched

| date | what | why | approved? | status |
|---|---|---|---|---|
| 2026-09-16 | SPEC §1/§2 "adults are a later product" withdrawn on scope; one product, youngest to oldest; build order unchanged | Manny's words at the keyboard | yes — [ADR-0063-everyone-youngest-to-oldest](../decisions/ADR-0063-everyone-youngest-to-oldest.md) | SPEC v0.4 draft owed; E1 unaffected |
| 2026-09-16 | Builder runs on Fable, not Astra; blind reviewer on Astra | Manny: "Fable and Astra only", mixed | yes — [ADR-0062-fable-and-astra-mixed](../decisions/ADR-0062-fable-and-astra-mixed.md) | E1 dispatched 23:58 CDT, run `ef463eac` |
| 2026-09-16 | The builder's brief header still read "codex / gpt-6-astra" when received | stale label from the 09-13 packet | documentary correction | header fixed in the file; the running worker's instructions are unaffected by the label |
| 2026-09-17 | SPEC v0.4: §1/§2 every age; §3.2 five E1 decisions accepted; K6 blocked, K8 persona name added | ADR-0063; PR #2 disclosed decisions; RO-15/16 | yes — PM under ADR-0063 and the dispatch rules ("a disclosed choice where the spec was silent is a decision") | recorded; repo copy re-syncs after PR #2 merges |
| 2026-09-17 | E2 content gate verifies one operation between two fractions (`ATOM OP ATOM`) and abstains on everything else; the general evaluator is deleted — SPEC §3.1 is silent on grammar | five blind reviews each found a new evaluator class (phrasing, normalisation, mapping, floating point, ÷→/ regrouping); fixtures are one-step | handler default, DECISION #9 to Manny (reply A redirects) — [ADR-0067-content-gate-grammar-is-one-operation](../decisions/ADR-0067-content-gate-grammar-is-one-operation.md) | disclosed choice; items beyond one operation wait for E3 dual keys |
