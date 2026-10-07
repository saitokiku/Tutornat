<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: vault/30-decisions/ADR-0045-coppa-from-day-one.md -->

---
title: "ADR-0045 — COPPA from day one; build for the whole household"
tags: [adr, kaizen, spec, legal]
project: kaizenai-saas
date: 2026-09-12
decided_by: manny
status: accepted
---
# ADR-0045 — COPPA from day one

## Context
ADR-0044 chose 13+ first with under-13 as a named fast follow, to reach real data sooner. Manny
reversed it within minutes.

## Decision
Manny, 2026-09-12 16:39 CDT, iMessage, verbatim:

> "Okay let's just launch with copper regulation and just do a right product from the beginning, I'm just trying to not get stalled on this. Build everything right from day 1 so people and siblings can use it and spreads really fast, that's a big advantage gained and referrals help customer cost and us etc. Unlock B changed it"

**Build COPPA-compliant from day one and serve the whole under-18 band at launch.**

## Why this reason is stronger than the first one
His first argument for going young was pedagogical — a system built for the least self-regulating
learner accommodates better learners easily. This one is commercial and specific: **a household is the
unit, not a learner.** A family with an 11-year-old and a 14-year-old can only buy once if the product
covers both; siblings spread it inside the home and outward by referral, and referral is the cheapest
acquisition there is. A 13+ launch structurally excludes the younger sibling and forfeits that.

His stated worry — *"I'm just trying to not get stalled on this"* — is the thing to manage, because
COPPA-first genuinely lengthens the path to the first learner session. The answer is not to promise it
does not, but to keep it off the critical path of everything that does not depend on it.

## What COPPA-first adds to the critical path, honestly
- **Verifiable parental consent before any collection** — a real mechanism, not a checkbox.
- **Counsel review** of the under-13 picture and the state minor-consent laws.
- **The chosen provider's under-13 conditions evidenced in writing** (OpenAI ties a zero-data-retention
  condition to processing personal data below the age of digital consent).
- **Data retention, deletion and no behavioural advertising**, designed in rather than retrofitted.

## What does not depend on it and proceeds in parallel
The tutoring loop; the evidence model (ADR-0042) and its integrity fixes; the Algebra 1 content and
item review; extraction off the Gemini routes (ADR-0044); assessment design; the parent report. Only
the **opening of the beta to a real learner** gates on the consent mechanism and counsel. He is stalled
only if we serialise work that has no reason to be serial.

## Consequences
- SPEC §4: under-13 and verifiable parental consent move into **P0**; §6's counsel gate stands and is
  now a launch gate rather than a follow-on.
- ADR-0034's 13+ clause is superseded for v1.
- The five state companion-chatbot laws apply across the whole band either way.
- Age assurance becomes a P0 design problem: we must know which band a learner is in before collection,
  and asking is not knowing.

Links: [ADR-0044-launch-13-plus-under-13-fast-follow](ADR-0044-launch-13-plus-under-13-fast-follow.md) · [ADR-0034-kaizen-v1-definition](ADR-0034-kaizen-v1-definition.md) ·
[202609121631-ro2-provider-terms-forbid-minors](../history/notes/202609121631-ro2-provider-terms-forbid-minors.md) · [SPEC](../product/spec.md)
