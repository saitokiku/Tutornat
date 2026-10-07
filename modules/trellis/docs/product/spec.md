<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: vault/40-projects/kaizenai-saas/SPEC.md -->

---
title: Kaizen — SPEC
tags: [spec, kaizen]
project: kaizenai-saas
spec_version: "0.4-everyone"
updated: 2026-09-17
status: design draft; accepted ADR clauses govern; v0.4 carries ADR-0063 (every age) and the five E1 decisions
---
# Kaizen — SPEC v0.4 "everyone" (2026-09-17; v0.3 school-first build was 2026-09-12)

**v0.4 change log (2026-09-17, PM, on Manny's words at the keyboard):**
- §1, §2 — the product is for **every age, youngest to oldest** ([ADR-0063-everyone-youngest-to-oldest](../decisions/ADR-0063-everyone-youngest-to-oldest.md): "make for everyone youngest to oldest coppa or whatever we can deal with tbh"). ADR-0055's "adults are a later product" is withdrawn on scope; its build order (engine first, primary and elementary *content* first) stands. COPPA and the state minors laws are workstreams; **no age band launches before its own gate clears** (§6).
- §3.2 (new) — the five decisions the E1 builder made where this spec was silent, disclosed in PR #2 and confirmed consistent by the blind reviewer, are **accepted** and now part of the spec.
- §8 — K6 is blocked (both chosen company names fail class 41); the **tutor persona name** is a separate, open item; K7 unchanged.
- §10 — risks updated: names, and the two inherited persistence defects E1 disclosed.
- Everything else, including §3.1, is unchanged from v0.3.

Build order accepted and execution authorized in [ADR-0055-school-first-engine-build](../decisions/ADR-0055-school-first-engine-build.md); detailed engine definitions still require review. Next package: [ENGINE-CONTRACT](engine-contract.md).

Current plan: [ENGINE-FIRST-PLAN](engine-first-plan.md) · [ADR-0053-kaizenedu-engine-first-preserve-both](../decisions/ADR-0053-kaizenedu-engine-first-preserve-both.md). Handoff v1.0 claim corrected against the actual v0.1 file; detailed design is still a draft.

Written by the PM from Manny's five grill answers ([ADR-0034-kaizen-v1-definition](../decisions/ADR-0034-kaizen-v1-definition.md)), the repo index (`shared/artifacts/kaizen-index/`) and the rails research ([RESEARCH](../research/README-digest.md)). Manny edits or accepts; changes after acceptance need an ADR. Workers never edit this file.

## 1. The product, one sentence
An online AI learning system for **every age, youngest to oldest** — one household account, many learners — combining homework organization, source documents, interactive teaching and an evidence-backed learning record. Primary and elementary learning lead the *build* and the *content* because that is where the wedge and Manny's teaching expertise are; they do not bound who the product is for (ADR-0063, amending ADR-0055).

## 2. Who it is for
- **Learner, any age:** own login, voice and text sessions, a whiteboard, checks that count only when unassisted and delayed. Under-13 learners exist from day one behind verifiable parental consent (ADR-0045); teens behind the minor-consent duties; adults as learners in their own right on the same engine. Age changes the *gate* and the *tone*, never the evidence rules.
- **Parent / account owner:** owns billing and consent, invites learners, reads a weekly report that states mastery as evidence, not as a claim. An adult learning alone is their own account owner.
- **The human loop (an organization, not a tutor):** reviews every content item before a learner sees it, is paged on safety events, audits sessions, and runs the efficacy study. Manny is its first member; the first assessment item-review owner remains open under K7.
- **The tutor is a character with a person's name** (Manny, 2026-09-16: "honor someone"). The name is open — see §8 — and until it is chosen and screened, nothing is printed with a name on it.
- **Not in v1:** in-person delivery, human tutoring inside the product, marketplace, schools or districts, public funds. *Removed from this list in v0.4:* independently subscribing adults.
- **Gates, not fences (§6):** the under-13 launch gate, the 13–17 consent duties and the adult path are three workstreams on one product. A band that has not cleared its gate is not launched to; it is never designed out.

## 3. The bar

*Replaced 2026-09-12 16:10 CDT under [ADR-0041-efficacy-is-a-north-star-not-a-gate](../decisions/ADR-0041-efficacy-is-a-north-star-not-a-gate.md), which authorised RO-1 to re-read the primary source and supply this wording. Research record: `shared/artifacts/kaizen-research/02-efficacy-correction.md`. The superseded text — "at or above the pooled effect of in-person tutoring, 0.44 SD … virtual tutoring's pooled 0.08 SD is the floor" — is preserved in this file's git history.*

**What RO-1 established, and why the old number is gone:** the pair **0.44 / 0.08 appears in no original table.** The preprint (265 studies) reports in-person **0.438 (SE 0.036)** and virtual **0.065 (0.028)** → 0.44 / 0.07; the published RER article (263 RCTs, first online 2026-06-05, DOI 10.3102/00346543261446660) reports **0.410 (0.027)** and **0.078 (0.023)** → 0.41 / 0.08. We had been quoting the in-person figure from one version beside the virtual figure from another. The adjusted virtual coefficient is **+0.034 (SE 0.171)**, indistinguishable from zero, and the estimation method changed between versions, so the drift cannot be attributed to the changed study count. The comparison throughout is *human* tutoring online versus in person — never AI.

### 3. Efficacy: independent learning first; human-tutor parity as a north star

**Purpose.** Kaizen aims to help eligible learners across its planned age bands learn skills they can later use independently. Matching effective human tutoring is a long-term research ambition. It is not a beta or launch gate and is never a marketing claim. No historical pooled effect size is a minimum promised effect, a forecast of Kaizen's effect, or a substitute for evaluating this product.

**What the external evidence supports.** Human tutoring delivered online and autonomous AI tutoring are different interventions. The Kraft and Nickow meta-analyses describe human tutoring across heterogeneous students, programs and tests; their subgroup averages do not establish an AI efficacy floor or causal parity. AI studies provide setting-specific evidence, including differences between assisted practice success and later unaided learning. Kaizen will make no numerical efficacy claim by borrowing those studies' estimates. The version reconciliation and limitations are recorded in `shared/artifacts/kaizen-research/02-efficacy-correction.md`.

**What we measure.** The near-term evidence target is repeatable independent learning together with repeat use. Before an evaluation begins, specify:

1. The skill domain, eligible learners, product/model version, primary outcome, comparator if any, intended dose, assessment schedule, analysis and decision rules.
2. An assessment independent of the tutor's answer generation and grading: unfamiliar items or independently sourced parallel forms, with forms checked for comparable content and difficulty. Assessment licensing/availability follows RO-3. The primary assessment permits no tutor hints, worked answers or live help; observed assistance is recorded. “Unassisted” means no assistance observed under the stated protocol, not proof that another person or device was absent. Scoring follows a fixed rubric, with assignment concealed from human scorers where feasible.
3. Separate measures of delayed retention on previously taught skills and transfer to unfamiliar applications. Pre-specify research follow-ups and distinguish these from immediate post-session performance. Product mastery claims must satisfy §3.1, including at least 48 hours since relevant instruction on that skill, evidence across two contexts and separate days, and the later check around day seven. Research timing does not relax those rules. Assisted answers and in-session streaks never contribute to mastery credit.
4. Intended and completed dose, assistance needed, return without repeated prompting, parent effort and all-in delivery cost. Report these alongside learning rather than compressing them into a single efficacy score.
5. Enrollment, allocation, follow-up and missing assessments; raw-score changes and, when justified, a standardized effect using a declared denominator, with uncertainty intervals. Record null and adverse results. Evidence rows remain immutable; preserve provenance and distinguish initial mastery evidence from later retention checks, as required by §3.1.

**What we may claim.** Before a credible comparative study, describe the product's purpose and report clearly labeled feasibility observations. A single-group pre/post increase does not establish that Kaizen caused learning. A small beta estimates usability, assessment feasibility, repeat use and preliminary learning signals; it does not establish human parity or a precise population effect.

A numerical causal efficacy statement requires a pre-registered, adequately designed comparative evaluation and must identify the tested product version, learners, subject, comparator, assessment, follow-up, sample, dose, attrition and uncertainty. Claims stay within that design: assisted completion is not independent learning, practiced-item improvement is not broad transfer, and a school-supported package is not evidence for unsupervised home use. Human-tutor parity remains excluded from marketing even if later research supports a bounded scientific comparison.

**What a later human comparison would require.** A confirmatory study would randomly assign eligible learners concurrently to Kaizen or a credible human-tutoring program, with curriculum, access and intended learning time defined in advance. It would use the same independent, unassisted, delayed primary assessments, sufficient sample size for the comparison, and a non-inferiority margin justified educationally before results are seen. The margin must not be selected from the historical 0.44/0.08 subgroup difference or chosen to fit available results.

For a higher-is-better outcome, non-inferiority would require the pre-specified lower confidence bound for **Kaizen minus human tutoring** to exceed **−margin**, under the planned analysis and missing-data/adherence sensitivity analyses. A non-significant difference or overlapping separate CIs is insufficient. Also establish that the human comparison represents effective tutoring; a usual-study reference arm can help distinguish matching an effective intervention from both arms failing. Non-inferiority supports only the pre-specified bounded conclusion for the studied setting; a stronger equivalence statement requires an equivalence design and both bounds within the agreed margins. This is later research, not a launch condition.

### 3.1 Evidence model (ADR-0042, Manny 2026-09-12 16:04 CDT: "take astras line I understand, but implement what I'm trying to do too in a safe way no trap")
The wedge is homework help, which is assisted work; the law counts only unassisted work. Both hold, as follows.

- **Practice never earns mastery credit.** Homework help and corrections practice are recorded, weighted and shown as progress. They never contribute to the mastery threshold, at any weight.
- **Practice earns access to the assessment.** Ten clean, hint-free practice reps on a skill give it priority for a **quiet window** — a scheduled interval in which that one skill is deliberately not taught, while help continues freely on everything else. The independent check is offered the moment the skill is eligible, not when convenient.
- **Scoped eligibility clock.** Only instruction on *that* skill restarts *that* skill's delay. Help on any other skill never touches it.
- **Qualifying evidence** is an unassisted attempt on an unfamiliar item, **>=48 h** since the last relevant instruction on that skill (inherited engine rule, `shared/repos/Kaizen-AI/docs/ENGINE.md:44`), repeated across at least two contexts and two separate days, with the second check around day seven. Any hint, instruction or answer exposure restarts eligibility across sessions; help during a check permanently disqualifies that attempt.
- **No silent trap.** If homework keeps landing on a skill and no quiet window can be taken within 14 days, the parent is told plainly that we cannot certify it while we are helping with it nightly, and what the plan is. No learner sits permanently ineligible without anyone saying so.
- **Structure that prevents drift.** `evidence_event` carries a class — assisted-help, corrections-practice, unassisted-attempt, delayed-retention — and only a restricted assessment service may append qualifying evidence; tutoring and report generation cannot. Reports read a server-derived view; corrections append provenance and never relabel old assisted attempts. Every displayed mastery claim audits back to its qualifying evidence and the rule version in force.
- **"Unassisted" means no assistance observed under the stated protocol.** A home browser cannot establish that another person or device was absent, and nothing in the product may claim otherwise.
- **Beta blocker:** the tutor-authored-check path (`turn/engine.ts:447-471` -> `checks/prompt.ts:124-139` -> `checks/service.ts`, no item ID) lets the model mint qualifying evidence. Closed and reproduced before any learner session (RO-5).

### 3.2 E1 decisions, accepted 2026-09-17 (spec was silent; builder chose and disclosed; reviewer concurred; PM accepts)
1. **Teaching sequencing treats a practiced (`mastered`) or legacy skill as satisfied** for choosing what to teach next. Sequencing is not a claim to a parent; the report never says "confirmed" for it. Changing this is a one-line change in `graph/next-skill.ts` and would need an ADR.
2. **No due delayed checks are offered until the independent assessment service exists (E2).** The inherited due-check was the certifying path and is removed; the learner's progress view shows no due checks in the meantime.
3. **A legacy `confirmed` row is rewritten to `mastered` only by the learner's own next practice on that skill.** Reads never rewrite rows; evidence rows are never relabelled.
4. **Evidence class defaults from observed assistance:** help in-session → `assisted-help`, otherwise `corrections-practice`. Cross-session exposure detection is the assessment path's job (E2); under E1 it can only move a row between the two practice classes.
5. **The wire shape keeps `status: MasteryStatus` and adds `certification`** (`legacy_unverified` for inherited `confirmed`). A consumer that cannot read `certification` still never sees `confirmed` from a server-derived view.

Disclosed and **not** repaired by E1, carried to E2/persistence: the concurrent-duplicate race (two result rows for one check) and partial-failure retry non-idempotence. Both reproduce at baseline and head; at head neither can certify.

## 4. Scope
### P0 — must exist for the closed beta
1. **Learning loop:** placement diagnostic → skill graph (the trellis: skills, prerequisite edges, evidence rows) → tutoring turns (voice, text, whiteboard) → unassisted delayed checks → evidence → weekly parent report.
2. **Accounts and consent (ADR-0045):** parent-owned, learner invited; **verifiable parental consent before any collection for under-13s**, age assurance sufficient to know which band a learner is in before collecting anything, retention/deletion and no behavioural advertising designed in; the chosen provider's under-13 conditions evidenced in writing; password reset; parent handoff; consent recorded. **Email must work** (today it is unconfigured and blocks reset, handoff, paging and reports).
3. **Content:** every item human-reviewed before exposure (`reviewed_by`, `reviewed_at` set); the current 118 items are unreviewed. One subject at launch (DECISION K1).
4. **Safety and disclosure (ADR-0046, 2026-09-12 16:47 CDT):** the AI is disclosed up front and on request; persona rules written; a **published crisis and referral protocol** with immediate in-product referral to 988 and emergency services; known-minor notice and break reminders (three-hourly in California); reasonable measures against sexual content and manipulation; session and daily limits; logging of every detection, referral shown and acknowledgement, with statutory reporting from 2027. **The earlier wording — "crisis language pages a human within minutes" — is deleted.** No statute required it, one operator could not staff it, and an unmet promise creates a duty we would not otherwise carry. **Staff it or never claim it:** any promise of human response must be matched by contract, SLA, trained responders and a rehearsed drill. This is the statutory floor, not the safe floor, and that is a recorded choice.
5. **Billing (K3 answered 2026-09-12 16:57 CDT, ADR-0047):** Stripe subscription, **a single tier at $49 with maximum usage, run at or below break-even** (amended 2026-09-12 16:58 CDT, ADR-0047; the $119 tier is withdrawn); cancel in one tap; no free-trial mechanics unless decided. Voice metered separately from text, since ASR and TTS dominate per-hour cost. The $49 allowance requires measured delivery cost under amended ADR-0047. The $119 tier was withdrawn; ADR-0053 sets no replacement price.
6. **UI and learner context (ADR-0053):** mobile-first web, working interactive teaching canvas, AI homework management, syllabus/assignment/corrected-work/practice/teacher-document imports, extraction review and source-linked learner history. Full frontend design follows engine verification. Detailed interaction acceptance follows the plan.
7. **Platform hygiene:** provider keys rotated and env files out of the tree (Manny's hand, KaizenEdu#56); the useful product isolated in private `gokumann-pm/kaizenedu`, with dependencies/licences accounted for and sanitized prior attempts in `reference-implementations/` ([ADR-0059-product-repo-under-the-pm-account](../decisions/ADR-0059-product-repo-under-the-pm-account.md) supersedes ADR-0053’s source-repository destination; both `saitokiku` repositories are read-only graft sources); model-provider terms for under-18 use read and satisfied (open question from the index).
8. **Operations:** `/api/tutor/health` style liveness, cost ceilings per learner-hour, p50 first token ≤ 1.0 s, error reporting to the human loop.

### P1 — after the beta holds
**(MOVED TO P0 2026-09-12 16:39 CDT under ADR-0045 — COPPA from day one. This P1 entry is superseded and kept for history.)** Under-13 and COPPA (moved here from P2 on 2026-09-12 16:36 CDT, ADR-0044).** Verifiable parental consent before any collection, counsel review of the state minor-consent picture, and the chosen provider's under-13 conditions evidenced in writing. Its scope is written **before the 13+ beta opens**, so it runs alongside rather than starting afterwards; reaching ten beta families with no under-13 scope recorded is drift.

Parent dashboard depth; second subject; the tutor-branch hook (a real tutor can recommend and see the record); referral from the human-loop org; export of the learning record.

### P2 — later, by decision
Texas and other public-funds rails (RESEARCH.md); the learning record as infrastructure other providers run on; camps; primary-education automation.

## 5. Reuse, from the index
- **From KaizenEdu:** the live tutor: streaming turn engine, voice pipeline (ASR, TTS, on-device VAD with 300 ms barge-in), presence layer, session state machine, parent-owned accounts and consent, cost ceilings, the five invariant tests, the 24-row claims ledger, graded checks.
- **From Kaizen-AI:** the trellis schema (`kc`, `kc_edge`, immutable `evidence` since migration 0034), the mastery law (`docs/ENGINE.md`), hardened migrations with RLS, CI claims and price guards, demo course materials, STRATEGY v0.2's verified research and legal review queue.
- **Must not be carried forward (RO-2, 2026-09-12 16:31 CDT):** the Gemini model routes — extracting them moves a licence problem into the new repository.
- **Dropped for v1:** the club storefront and scheduling, marketplace code, upstream demo assets (82 MB), Kaizen Certified/Gov/Kids tracks.

## 6. Legal and compliance gates before beta

**Added 2026-09-12 16:31 CDT from RO-2 (`shared/artifacts/kaizen-research/03-minors-launch-gates.md`):**
- **Provider permission is a gate, and the current stack fails it.** Google's Gemini Developer API Additional Terms (eff. 2026-03-23, not limited to the free tier) and Google Cloud generative-AI Service Specific Terms §20(d) carry express **under-18 application restrictions**, and the code is wired to Gemini (`kaizen.config.ts:235-249`). "Use Vertex instead" is not supported by the published text. **No learner session on a Google route.** OpenAI permits minors conditionally on parent/guardian consent with our responsibility for safeguards; Anthropic permits powering customer products with required minor safeguards, disclosure, age assurance and moderation. Neither is approval — both are conditions to be evidenced, in writing, before beta.
- **Parent consent, teen-data consent and provider permission are three separate gates.** Satisfying one does not satisfy another.
- **Five enacted state companion-chatbot laws** already bind or will before a beta: California SB 243 (live 2026-01-01), Hawaii Act 248, Washington ESHB 2225, Oregon SB 1546, Connecticut PA 26-15 (the last three 2027-01-01). Their education exclusions turn on facts — instructional setting, solely curriculum-aligned objectives, no open-ended companionship — not on self-description.
- **National eligibility is not established** and the 50-state inventory is explicitly incomplete. Nothing may be inferred from the absence of a search result.


Entity is Kaizen Academy LLC (never "Kaizen AI LLC"); terms, privacy and AI-disclosure pages real; SB 243-class duties implemented; parental consent flow for 13–17 (state minor-consent laws to be listed by counsel; Texas's own minors' digital-services law is unchecked); data retention and deletion; model-provider under-18 terms confirmed in writing; keys rotated; the 26-item legal queue from STRATEGY triaged to "blocks beta / does not".

## 7. Evidence required per release (what "done" means here)
- Beta: email round trip proven; 10 families onboarded; 100% of exposed items reviewed; zero unresolved safety incidents older than 24 h; p50 first token ≤ 1.0 s over a week; weekly report delivered to every parent.
- Pilot: pre-registered design (instrument, n, dose, comparison) filed in the vault before the first session; effect reported with its interval; no effect is printed without the design.
- Launch: pilot effect and interval published in the product; safety log clean for 30 days; unit cost per learner-hour under the ceiling.

## 8. Open decisions (DECISION format; taste items have no default)
- **K1 subject at launch — ANSWERED A, CONDITIONALLY (Manny 2026-09-12 15:49 CDT: "I guess A, I wanna know where it's worth it the problem is solvable and demand is real").** A) Algebra 1 readiness (fractions→ratios→linear equations; extends the existing fractions bank) B) Algebra 1 proper C) a reading/writing subject. Not closed: he attached three conditions — worth it, solvable, demand real. RO-8 (unaided transfer on prerequisite gaps) and RO-7 (what parents of 12–15 year olds pay to fix foundations) must land before this is treated as settled. [202609121548-manny-k1-algebra-readiness-conditional](../history/notes/202609121548-manny-k1-algebra-readiness-conditional.md)
- **K2 efficacy instrument** — A) NWEA MAP Growth (norm-referenced, widely used, costs per test) B) a parallel-form pre/post built from an independent item source with blind scoring C) state test proxies. **ANSWERED B 2026-09-12 17:18 CDT (ADR-0049)** — independent parallel forms, not MAP. Conditional on RO-3 establishing licensing, sensitivity and scoring independence; a preference here authorizes no purchase.
- **K3 price and plan** — one monthly plan; *qualia, no default*; research shows incumbents at $150–$400+/month for human tutoring and AI products under $30/month.
- **K4 web vs native** — **ANSWERED A 2026-09-12 17:18 CDT (ADR-0049)**: mobile-first web/PWA. No native apps in v1.
- **K5 extract the product from the OpenMAIC copy now** — **ANSWERED A 2026-09-12 17:18 CDT (ADR-0049)**: extract before beta, as a runnable vertical slice with its dependency closure rather than a rewrite, and **without the Gemini routes** (ADR-0044).
- **K6 company/product name** — **BLOCKED on both chosen names** (2026-09-13 clearance: Kaizen — Kaizen Institute live class-41; Trellis — Learn-It Systems live class-41 children's special education + Trellis Apps' AI learning coach). Shortlist Lessonford / Lessonwick screened, not cleared. kaizenedu.net and Kaizen Academy LLC stay as domain and entity. *Qualia, no default.*
- **K8 tutor persona name (new, 2026-09-16)** — Manny: "call him nikola … or the woman who found dna". Both conflict-found as personas (RO-15). Screened menu (RO-16): Dilhan, Janaki, Satyen clean; Lonnie warm with neighbours. Texted 2026-09-17 00:37 as A–F. *Qualia, no default.* Nothing printed with a name until chosen and screened; counsel before any "Ask <Name>" marketing.
- **K7 item review owner and deadline** — Manny reviews the first 118 items, or the human-loop org hires a reviewer. *His call.*

Current focus update (ADR-0055): primary and elementary education lead; adults later. The earlier K1 maths direction remains, but its older algebra-readiness cohort is not the current lead segment. Begin with a synthetic elementary-fractions teaching case; this does not certify a launch curriculum or settle the earlier demand/efficacy conditions.

## 9. Milestones (sequence, no dates promised)
Plan and preserve both → engine contract and verification in KaizenEdu → frontend architecture → backend architecture → reviewed vertical slices on one test website → qualify deployment and the ten-family beta → evaluation and subsequent releases. Minimal test/persistence adapters support engine verification. No dates or efficacy are promised (ADR-0053/0041).

## 10. Top risks
No cleared company name and no chosen tutor name; two inherited persistence defects disclosed by E1 (duplicate race, non-idempotent retry) awaiting E2; committed keys unrotated; email blocks the funnel; 93% upstream code and licence; no human-reviewed item; under-18 model terms unread; seven false-mastery classes remain open and age-specific teaching quality requires evaluation. The former borrowed 0.08 SD warning was invalidated by ADR-0041; a software pass does not prove efficacy.
