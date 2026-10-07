<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: vault/30-decisions/ADR-0041-efficacy-is-a-north-star-not-a-gate.md -->

---
title: "ADR-0041 — Kaizen efficacy: the 0.44 SD is a north star, not a launch gate or a selling point"
tags: [adr, kaizen, spec]
project: kaizenai-saas
date: 2026-09-12
decided_by: manny
status: accepted
---
# ADR-0041 — Efficacy is a north star, not a gate

## Context
SPEC v0.1 §3 staked the product on one number: "the measured effect … is at or above the pooled
effect of in-person tutoring, **0.44 SD** per Kraft, Schueler & Falken (RER 2026) … virtual
tutoring's pooled **0.08 SD** is the floor to beat first."

Astra's independent second opinion (2026-09-12 15:38 CDT, `shared/artifacts/astra-plan-20260912/kaizen-second-opinion.md`
§K1) found that reading is not supported by the source we captured:
- The 0.44 / 0.08 figures come from **six studies**, and the captured paper says the adjusted virtual
  coefficient is **positive and statistically insignificant**, with no direct causal comparison of
  delivery mode and a pandemic-confounding warning (`shared/artifacts/kaizen-research/raw/kraft-dec.txt:33–34`).
- There is a **version mismatch**: the captured paper reports 265 RCTs; the later abstract says 282
  (`shared/artifacts/kaizen-research/01-METHOD.md:173`).
- The "0.05–0.10 SD for AI" forecast stacked non-independent moderators and was judgment presented
  as a consequence of verified figures. Withdrawn.

## Decision
Manny, 2026-09-12 15:38 CDT, iMessage, verbatim:

> "The SD is more a north start less a selling point but we wanna create a real product."

So: **human-tutor parity stays as the ambition. It stops being the launch gate, and it is never a
marketing claim.** The company's near-term gate becomes what Astra proposed in §K2 — repeatable
independent learning plus repeat use: delayed transfer on unfamiliar items, assistance needed,
retention of prior skills, completed dose, willingness to return, parent effort, all-in cost.

## Consequences
- SPEC §3 is rewritten under this ADR (a SPEC change with his instruction behind it).
- Nothing about an effect size is printed in the product or in marketing without a pre-registered
  design, and the parity claim needs a concurrent human comparator with a justified non-inferiority
  margin — a later confirmatory study, not the beta.
- **RO-1** (`shared/artifacts/astra-plan-20260912/kaizen-second-opinion.md` §K4) still runs: reconcile
  the paper versions and supply replacement §3 wording from the primary source. This ADR sets the
  role of the number; RO-1 fixes the number itself.
- K2 (efficacy instrument) shifts from "MAP Growth first" to Astra's **B: independently sourced
  parallel forms**, conditional on RO-3.

Links: [ADR-0034-kaizen-v1-definition](ADR-0034-kaizen-v1-definition.md) · [202609121537-manny-sd-is-north-star](../history/notes/202609121537-manny-sd-is-north-star.md) ·
[SPEC](../product/spec.md) · [ADR-0033-kaizen-is-the-active-product](ADR-0033-kaizen-is-the-active-product.md)
