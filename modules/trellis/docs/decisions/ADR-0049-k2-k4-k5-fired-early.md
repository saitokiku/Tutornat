<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: vault/30-decisions/ADR-0049-k2-k4-k5-fired-early.md -->

---
title: "ADR-0049 — K2, K4 and K5 fired early on Manny's word"
tags: [adr, kaizen, spec]
project: kaizenai-saas
date: 2026-09-12
decided_by: manny
status: accepted
---
# ADR-0049 — Fire the three defaults now, not at 23:45

Manny, 2026-09-12 17:18 CDT, iMessage: *"just fire them now, cal Kare so aah far aah Kare so ab…."* — *kal kare so
aaj kar, aaj kare so ab*: what you would do tomorrow, do today; what you would do today, do now.

The three decisions were queued to default at 23:45 CDT. He brought them forward. Recorded as decided,
not as defaulted, because he answered rather than let the clock run.

| id | decision | what it settles |
|---|---|---|
| **K2** | **B — a parallel-form pre/post built from an independent item source with blind scoring.** *Not* NWEA MAP Growth, which was the original recommendation. | Astra's audit moved this: MAP is norm-referenced and costs per test, and the efficacy work now needs an instrument independent of the tutor's own answer generation and grading (SPEC §3, RO-1's replacement wording). Conditional on **RO-3** establishing licensing, sensitivity and scoring independence — a preference here authorises no purchase. |
| **K4** | **A — mobile-first web / PWA.** | No native apps for v1. Consistent with Astra's rejected-for-beta list, which named native apps explicitly. |
| **K5** | **A — extract the product from the OpenMAIC copy before beta.** | With the narrower contract from Astra's §K3: extract a runnable vertical slice with its dependency closure; do not rewrite the tutor to eliminate every upstream line. **And it must not carry the Gemini routes forward** ([ADR-0044-launch-13-plus-under-13-fast-follow](ADR-0044-launch-13-plus-under-13-fast-follow.md)) — extracting them would move a licence problem into the new repository. Acceptance: a working isolated deploy, preserved behaviour, accounted dependencies, no exposed classroom or admin routes. |

Links: [ADR-0041-efficacy-is-a-north-star-not-a-gate](ADR-0041-efficacy-is-a-north-star-not-a-gate.md) · [ADR-0045-coppa-from-day-one](ADR-0045-coppa-from-day-one.md) · kaizen *(PM vault: `20-mocs/kaizen`)*
