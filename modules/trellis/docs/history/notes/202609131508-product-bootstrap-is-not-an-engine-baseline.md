<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: vault/10-notes/202609131508-product-bootstrap-is-not-an-engine-baseline.md -->

---
id: "202609131508-product-bootstrap-is-not-an-engine-baseline"
title: "A product repository bootstrap does not establish an engine baseline"
tags:
  - kaizen
  - lesson
sources:
  - "[ADR-0059-product-repo-under-the-pm-account](../../decisions/ADR-0059-product-repo-under-the-pm-account.md)"
  - "[ENGINE-CONTRACT](../../product/engine-contract.md)"
project: kaizenai-saas
created: 2026-09-13
---

# Separate repository setup from engine evidence

The private product bootstrap is verified at `b30fa861`: 21 local and remote blobs match. That establishes the destination, not runnable engine behavior. E1 issue #1 therefore requires an auditable minimal offline extraction baseline before containment, with independent reproduction afterward. Both old repositories remain read-only graft sources under [ADR-0059-product-repo-under-the-pm-account](../../decisions/ADR-0059-product-repo-under-the-pm-account.md).

Old current-status pointers still said GitHub failed and directed work into the source repository even after the setup handoff. Reconciled SPEC §4.7, the plan, MOCs, STATE and views to the accepted destination. Historical connectivity failures remain dated history. The configured autonomous gate now refuses 70% weekly usage against a 60% cap; that is not evidence of an API quota exhaustion and does not change direct-request policy.

K7 remains a separate unanswered reviewer decision. A repository-ownership answer cannot assign that role. [ENGINE-CONTRACT](../../product/engine-contract.md) retains the behavior and evidence requirements. Verification: `shared/artifacts/handler-scheduled-reconciliation-20260913T100441-0500/evidence.json`.
