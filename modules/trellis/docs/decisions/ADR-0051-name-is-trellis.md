<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: vault/30-decisions/ADR-0051-name-is-trellis.md -->

---
title: "ADR-0051 — K6: the product is called Trellis"
tags: [adr, kaizen, brand]
project: kaizenai-saas
date: 2026-09-13
decided_by: manny
status: accepted — clearance in progress
---
# ADR-0051 — Trellis

Manny, 2026-09-12 19:51 CDT, paired channel: **"Let's just call it trellis"**. K6 is answered.

## Why it is the right answer, and it was already in the building
The inherited Kaizen-AI codebase **already calls its skill graph the trellis** — prerequisite edges holding a learner
up while they grow past them (`kc`, `kc_edge`, migration 0034). The metaphor is not decoration applied to the product;
it is the data model. A trellis also says the thing he deliberately kept **out** of the name
([ADR-0043-the-learner-needs-us-less](ADR-0043-the-learner-needs-us-less.md) was withdrawn, and he ruled the thesis out of the naming brief): a trellis
supports a plant until it does not need one. It carries the claim without making it.

It also survives the company he intends to build — tutoring now, reading later, camps and a school after that. A
trellis is not subject-specific and not technology-specific.

## Status: chosen, not cleared
Kaizen was chosen and then found to have two live registered marks in class 41 owned by Kaizen Institute Ltd. **That
is why clearance runs before anything is registered, printed or deployed.** Trellis is a common English word and is
very likely contested in some sector; the question is whether education is occupied. A check is running: USPTO classes
41 and 9, existing US companies trading as Trellis, the sensible domains, and a usable compound form if the bare word
is blocked.

**Nothing depends on the outcome except the name itself.** SPEC v1.0, the architecture and the evidence model are
written without reference to it.

Links: [ADR-0047-kaizen-price-two-tiers](ADR-0047-kaizen-price-two-tiers.md) · [BRAND](../product/brand.md) · kaizen *(PM vault: `20-mocs/kaizen`)*
