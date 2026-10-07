<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: vault/30-decisions/ADR-0046-crisis-statutory-floor-no-invented-promise.md -->

---
title: "ADR-0046 — Crisis handling: meet the statutes, and delete the promise we invented"
tags: [adr, kaizen, spec, legal, safety]
project: kaizenai-saas
date: 2026-09-12
decided_by: manny
status: accepted
---
# ADR-0046 — The statutory floor, and no promise above it

## Context
Grill Q3 asked what human coverage Manny would commit to before children could use the product. He
asked whether a contracted agency could take the pages, then said: *"Whatever is the legal minimum to
get us off the hook"* (2026-09-12 16:47 CDT, iMessage).

The useful finding is that **the legal minimum is lower than what our own SPEC promised**. From RO-2's
reading of the enacted text (`shared/artifacts/kaizen-research/03-minors-launch-gates.md`), the five
companion-chatbot statutes require: AI disclosure where a reasonable person could mistake it for human;
a publicly described self-harm and suicide prevention **and referral** protocol; known-minor notice and
break reminders (every three hours in California); reasonable measures against specified sexual content
and manipulation; incident logging, with reporting from 2027. **None of them requires a staffed human
responder within minutes.**

SPEC §4 said *"crisis language pages a human within minutes."* Nobody imposed that. It was ours, it was
unstaffable by one person, and an unmet promise is the sentence a plaintiff reads back.

## Decision
1. **Meet the statutory duties exactly**: disclosure; a published crisis-and-referral protocol; immediate
   in-product referral to 988 and emergency services; known-minor notice and break reminders; content
   and manipulation safeguards; logging of every detection, referral shown and acknowledgement.
2. **Delete "pages a human within minutes"** from the SPEC, and never state or imply it in product copy,
   marketing or a parent-facing document.
3. **Staff it or never claim it.** Any future promise of human response re-creates the duty and requires
   the staffing, contract, SLA and rehearsal to match it (the agency option and its conditions are
   preserved below for when that is revisited).

## What the PM said once, and does not repeat
This is the legal floor, not the safe floor. A child in crisis at 2 a.m. gets a referral screen and no
person. That is lawful and it is what most products do. It is recorded here so the choice is visible
later rather than rediscovered.

## The agency option, preserved
Contracted crisis coverage (AI detects → agency paged over an API → trained human responds 24/7) removes
the single-operator bottleneck and is the strongest option if human response is ever promised. It would
require: a named acknowledgement SLA with our own logging of pages and acknowledgements; crisis-trained
staff with mandated-reporter capability; a written escalation path when no one can be reached; a data
agreement covering minors' data; their protocol reviewed for the case where the account holder is the
alleged abuser; and a timed, rehearsed drill before launch, repeated. Liability is never transferred by
contract — the statutory duties sit on the operator. Triage is also not resolution: someone owns the
next morning.

Links: [ADR-0045-coppa-from-day-one](ADR-0045-coppa-from-day-one.md) · [202609121631-ro2-provider-terms-forbid-minors](../history/notes/202609121631-ro2-provider-terms-forbid-minors.md) ·
[SPEC](../product/spec.md)
