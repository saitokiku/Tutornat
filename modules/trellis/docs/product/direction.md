<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: vault/40-projects/kaizenai-saas/DIRECTION.md -->

---
title: Kaizen — DIRECTION
tags: [direction, kaizen]
project: kaizenai-saas
updated: 2026-09-16
---
# Kaizen — why, priorities, non-goals, in Manny's words

Current SPEC is v0.3-school-first-build, a design draft carrying accepted ADR clauses. Current repository and sequence: [ADR-0053-kaizenedu-engine-first-preserve-both](../decisions/ADR-0053-kaizenedu-engine-first-preserve-both.md) · [ENGINE-FIRST-PLAN](engine-first-plan.md). Earlier dated quotations below are historical; ADR-0045 supersedes the 13+ exclusion and ADR-0043 withdraws the needs-us-less compass.

## The program starts — 2026-09-11 18:47 CDT, Act console

> "For kaizen I need you to efficiently index both the repos and intents and designs attempted, do final market research and legal and etc everything a startup needs and then let's create a final product for it. I wanna be the private education guy going forward in UsA and we will do it with an intelligent new genius mechanics not old playbooks that force us to compete. We will make winning sauce our own way efficiently. I'm your resource if you need to experiment with a human and I am also a experienced teacher who understands learning at the core that's why I wanna build this"

Priorities read from it, to be confirmed in the grill: national private education, not an Austin-only club; the edge is the mechanics of learning, not a better copy of a tutoring franchise; efficiency in how we build and spend; Manny as experimental subject and domain expert. [202609112347-manny-kaizen-private-education-new-mechanics](../history/notes/202609112347-manny-kaizen-private-education-new-mechanics.md) · [ADR-0033-kaizen-is-the-active-product](../decisions/ADR-0033-kaizen-is-the-active-product.md)

## Inherited from the repo, not yet confirmed by him here
- `docs/STRATEGY.md` v0.2 (2026-09-02): Kaizen AI sells learning and owns the record of learning; standing seat in Austin; TEFA/529/§25F rails; Kaizen Academy LLC is the entity; franchise and SB 243 flags. Treat as his prior thinking, to be re-asked, not as direction.
- Non-goals stated there: private 1:1 tutoring, tutor marketplace, free trials. Natural Tutor (KaizenEdu) is a 1:1 AI tutor — a contradiction the grill resolves.

## Supplemental first, infrastructure next, school much later — 2026-09-11 19:45 CDT, iMessage

> "It's more b then C but school comes way down the line I have plans for brick and mortar camps etc and joining with the US govt later"

Sequence: supplemental education (tutoring, after-school, enrichment) → the learning system other providers run on → physical camps → a school and a US-government relationship later. Neither repo is the final product; both are attempts, Kaizen-AI the more mature (his words 18:58). Grill record: [2026-09-11-grill-kaizen](../history/2026-09-11-grill.md).

## The first product is the AI itself — 2026-09-11 20:59 CDT, iMessage

> "First product AI / algorithm only but max efficacy of software human loop under an organization beautifying UI . Real tutors will be run  as a separate branch that will suggest to use this product and if you have both human and software you're in full harmony and trellis can help you grow but focus on getting the AI itself as a perfect product on the efficacy of if not better that of human tutors and try to make it for kids as young as possible I'm also trying to automate primary education early on but that's very long term future"

Read: v1 = the AI tutor, measured against human-tutor efficacy; human loop as an organization around it; beautiful UI; real tutors a separate branch that recommends the product; trellis as the growth record; learners as young as the law allows (Q4); primary-education automation far out. Non-goal for v1: in-person delivery.

## 13+ for now — 2026-09-11 23:18 CDT, iMessage

> "Okay let's go 13 plus for now"

v1 age band is 13+; under-13 is a later release gated on counsel, with "as young as possible" as the direction of travel.

## Parents direct, national, online; focus — 2026-09-11 23:23 CDT, iMessage

> "A only focus"

No public-funds workstream alongside v1. Decision record for the whole v1 definition: [ADR-0034-kaizen-v1-definition](../decisions/ADR-0034-kaizen-v1-definition.md).

## The wedge: homework is the hook, understanding is the hidden mission — 2026-09-12 15:55 CDT, iMessage

> "B for sure, it's what the demands today problem is, now we have the customer we can keep them, the homework turn into the demo. People value grades more than actual understanding, we take advantage of that to bring them in and keep them on the hook by actually deliver results but in the meantime we also grow the humans intellect, and actually is the hidden mission to produce well base formed human for the future"

Sell into the demand that exists; deliver it; use the time to build what they did not ask for.
[202609121555-manny-homework-is-the-hook-understanding-is-the-mission](../history/notes/202609121555-manny-homework-is-the-hook-understanding-is-the-mission.md)

## The repair step, the parent, and flow — 2026-09-12 16:10 CDT, iMessage

> "I like A do that, and nudge to B when it gets “out of hand” and suggest parent we need to spend real time on learning and attention is needed, the parent is the only responsible person we have for the lids attention, but try to make it fun or interactive and not boring and simulating for their intellect so flow state is being maintained most of the time, parent for liability and we use them as a resource as well, and yes then we are at the mercy of the kid lol"

A two-minute repair step inside the homework; escalate to a separate repair session through the
parent when skipping gets out of hand; the parent is the accountable party for attention, for
liability and as a resource; the step must be fun, interactive and keep the learner in flow.
[202609121610-manny-repair-friction-and-the-parent](../history/notes/202609121610-manny-repair-friction-and-the-parent.md)

## The north star — 2026-09-12 16:14 CDT, iMessage

> "Okay I like learned needs us less it was another metric I flowed in idea but I guess got too technical in a bad way"

Asked for "a brutally honest benchmark to beat", he took **"the learner needs us less, provably"** over beating a
historical tutoring effect size. [ADR-0043-the-learner-needs-us-less](../decisions/ADR-0043-the-learner-needs-us-less.md)

## Who we launch for - 2026-09-12 16:29 CDT, iMessage

Algebra 1 (grades 8-9) as the single hottest node, grade 3 reading second, an English/reading-comprehension
spine only *"after we have math perfected"*. Three corrections he insists on: revenue share is not business
quality; need and willingness to pay diverge for English in grades 4-7; **parents buy at gates, not grades**.
Full quote and the open age question: [202609121628-manny-market-read-algebra-first](../history/notes/202609121628-manny-market-read-algebra-first.md)



## Current direction — 2026-09-12 20:57 CDT

Manny: “use the Kaizenedu repo”; “we test everything on the same website and we’ll deploy later”; engine “tightened and verified”, then frontend architecture, then backend architecture; “lay out the plans first.” Preserve both attempts. Include document/corrected-work imports, homework management, an excellent teaching canvas and iterative human feedback. All school ages include younger siblings; adult accounts were open then; ADR-0055 below closes them as a later product. [202609122057-manny-engine-first-whole-learner](../history/notes/202609122057-manny-engine-first-whole-learner.md) · [ADR-0053-kaizenedu-engine-first-preserve-both](../decisions/ADR-0053-kaizenedu-engine-first-preserve-both.md) · [ENGINE-FIRST-PLAN](engine-first-plan.md).

Correction: the opening v0.1 status is historical; SPEC is now v0.2-direction-update, a design draft with accepted ADR clauses. The historical 13+ exclusion was superseded by ADR-0045; the needs-us-less compass was withdrawn in ADR-0043. These historical quotes are preserved, not current constraints.


## Primary and elementary first; build now — 2026-09-12 22:14 CDT

> That’s the beauty of it we could easily apply this to adults as well but later product. This is mainly focused on primary and elementary education etc for now. But yes order is right, I’m ready to move into next go ahead build. Any question or anything you need ask me

Primary and elementary education lead the school-age product; adults later. The engine-first order in the plan is accepted and implementation is authorized in KaizenEdu. Deployment stays later. Maths remains first; the older algebra-readiness cohort is no longer the leading age segment. [202609130322-manny-school-first-go-build](../history/notes/202609130322-manny-school-first-go-build.md) · [ADR-0055-school-first-engine-build](../decisions/ADR-0055-school-first-engine-build.md).

## Product repository owner — 2026-09-13 09:42 CDT, keyboard

Manny chose **“A”**: Astra creates the private product repository under `gokumann-pm` and works there. The previous repositories are “just things to graft from.” [ADR-0059-product-repo-under-the-pm-account](../decisions/ADR-0059-product-repo-under-the-pm-account.md) changes the destination to `gokumann-pm/kaizenedu`; both `saitokiku` repositories remain read-only sources. This answer does not assign the first assessment-item reviewer.


## Everyone, youngest to oldest; teams; Fable and Astra — 2026-09-16 23:5x CDT, at the keyboard

> "Fable is back so use fable and codex mixed. Don't worry codex limit I can reset"

> "Fable and Astra only and get actual shit fine and run teams to perfect my teaching product and make for everyone youngest to oldest coppa or whatever we can deal with tbh"

Scope: one product for every age — ADR-0055's "adults are a later product" is withdrawn on scope, build order kept (engine first, primary content first). COPPA and the minors laws are workstreams to clear, never a reason to narrow who it is for; no age band launches before its own gate clears. Teams by default from the rung after E1. Routing: Fable and Astra, mixed, nothing else. [ADR-0063-everyone-youngest-to-oldest](../decisions/ADR-0063-everyone-youngest-to-oldest.md) · [ADR-0062-fable-and-astra-mixed](../decisions/ADR-0062-fable-and-astra-mixed.md) · [202609162359-manny-fable-and-astra-teams-everyone-youngest-to-oldest](../history/notes/202609162359-manny-fable-and-astra-teams-everyone-youngest-to-oldest.md)

## The tutor has a person's name — 2026-09-16 23:5x CDT, at the keyboard

> "Get the tutor built, I wanna call him nikola or something like that honor someone or the woman who found dna or something"

The tutor persona is named to honor a person — Nikola (Tesla) or Rosalind (Franklin). The company brand remains the separate, blocked K6. Screen running before anything is printed. [202609162358-manny-build-the-tutor-name-him-after-a-scientist](../history/notes/202609162358-manny-build-the-tutor-name-him-after-a-scientist.md)
