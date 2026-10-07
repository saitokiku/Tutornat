<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: vault/30-decisions/ADR-0044-launch-13-plus-under-13-fast-follow.md -->

---
title: "ADR-0044 — Launch 13+ on a permitted provider; under-13 and COPPA as a named fast follow"
tags: [adr, kaizen, spec, legal]
project: kaizenai-saas
date: 2026-09-12
decided_by: manny
status: SUPERSEDED 2026-09-12 16:39 CDT by ADR-0045 — he reversed to COPPA-first
---
# ADR-0044 — 13+ first, under-13 fast, on whichever provider permits it

## Context
RO-2 established that **Google's Gemini Developer API and Google Cloud generative-AI terms carry express
under-18 application restrictions**, and the inherited code is wired to Gemini
(`kaizen.config.ts:235-249`). OpenAI and Anthropic permit minors conditionally. Separately, the PM
mapped the age bands for him: the requirements are **uniform across all minors** — provider permission,
the five enacted state companion-chatbot laws, disclosure and crisis duties all trigger at under-18 —
and **diverge at exactly one line, 13**, where COPPA requires verifiable parental consent before any
collection. His own reasoning for going young: *"system can accommodate for a better learner any day if
its build for the immature ones"*, and *"that's where its automatable above high is more self learning"*.

## Decision
Manny, 2026-09-12 16:36 CDT, iMessage, verbatim:

> "Okay just use whatever provider we can it's fine If one doesnt get used. Not detrimental. I guess go 13 plus first so we can launch, with copper and under 13 coming really fast. So parents can get their needs now and we can also have proper legal verification and stuff. I'm leaning A but lets do B so we can get real world data back fast too, but the real business is the raw human kids need learning the ones who haven't gone through development yet."

1. **Provider: whichever one permits the product.** Gemini is dropped — not as a preference but because
   its terms forbid the audience. An unused provider integration is acceptable waste.
2. **Launch band: 13-17**, consistent with ADR-0034. This is not a retreat from the young-learner
   thesis; it is the fastest route to real data with parents served now.
3. **Under-13 and COPPA are a named fast follow**, not a someday. He chose B over the A he was leaning
   toward *specifically* to get data back faster, which only pays off if the follow actually follows.
4. **The strategic destination is unchanged and stated:** *"the real business is the raw human kids need
   learning the ones who haven't gone through development yet."* Build decisions that would make
   under-13 harder later are drift and belong in DRIFT.md.

## Making "really fast" checkable
"Coming really fast" is the shape of commitment that slips silently, so it gets a definition rather than
an adjective. The under-13 track is **P1 with a named trigger**: its counsel review, verifiable-consent
mechanism and provider under-13 conditions are specified **before the 13+ beta opens**, so the work is
scoped while the beta runs rather than started after it. If the 13+ beta reaches its first ten families
with no under-13 scope written, that is drift and is recorded as such.

## Consequences
- SPEC §4: under-13 moves from **P2 "later, by decision"** to **P1 fast follow**, with the counsel gate
  and the verifiable-consent requirement retained in full. Nothing about the legal gate is relaxed by
  moving it earlier.
- SPEC §6 keeps provider permission as an M0 gate; the permitted provider must be chosen and its minor
  conditions evidenced in writing before any learner session.
- The extraction (K5) must not carry the Gemini routes forward.
- The five state companion-chatbot laws bind at 13-17 exactly as they would under 13. Launching at 13+
  avoids COPPA, not those.

Links: [ADR-0034-kaizen-v1-definition](ADR-0034-kaizen-v1-definition.md) · [202609121631-ro2-provider-terms-forbid-minors](../history/notes/202609121631-ro2-provider-terms-forbid-minors.md) ·
[202609121628-manny-market-read-algebra-first](../history/notes/202609121628-manny-market-read-algebra-first.md) · [SPEC](../product/spec.md)

## Superseded — 2026-09-12 16:39 CDT

Reversed by Manny about three minutes after acceptance, on a reason that was not on the table when he
chose B: **household coverage and referral economics.** See [ADR-0045-coppa-from-day-one](ADR-0045-coppa-from-day-one.md). The provider
decision in this ADR (use whichever provider permits the product; Gemini dropped) stands unchanged.
