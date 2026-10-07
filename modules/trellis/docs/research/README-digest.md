<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: vault/40-projects/kaizenai-saas/RESEARCH.md -->

---
title: Kaizen — RESEARCH
tags: [kaizen, research]
project: kaizenai-saas
updated: 2026-09-11
---
# Kaizen — research on record

Living digest of research the PM has verified enough to act on. Each entry names the artifact, the date, who ran it, what the PM spot-checked, and what must not be printed as confirmed. Decisions go to ADRs; Manny's words go to [DIRECTION](../product/direction.md).

## 2026-09-11 — Repo index (both repos)
Artifact: `shared/artifacts/kaizen-index/` (INDEX, kaizen-ai, kaizenedu, METHOD). Opus worker, read-only, no secret value read. PM spot-checked three claims. Summary in [202609112347-manny-kaizen-private-education-new-mechanics](../history/notes/202609112347-manny-kaizen-private-education-new-mechanics.md) context and the 2026-09-11 log. Key: KaizenEdu runs a session today; Kaizen-AI sells nothing yet; through-line "the AI is the record"; identity contradiction between repos; keys unrotated (KaizenEdu#56); legal gates both.

## 2026-09-11 — Money rails, market, incumbents, evidence
Artifact: `shared/artifacts/kaizen-research/01-rails-and-market.md` (97 KB, §0 and A–F) and `01-METHOD.md`; raw primary text in `raw/` (152 MB). Opus worker, 19:51–20:35 CDT. PM spot-checked in the raw text: Educ. Code §29.365(a)–(b), 34 TAC §16.404(i), IRS Notice 2025-70 (§25F → §530(b)(3)(A)).
### What the primary sources say that the founder's strategy doc did not

Research worker (Opus, 2026-09-11 19:51–20:35 CDT) resolved 25 marked figures from Kaizen-AI `docs/STRATEGY.md` v0.2 against primary sources; seven were wrong. PM spot-checked three in the saved raw text (§16.404(i), Notice 2025-70 §25F routing, §29.365).

1. **Texas price parity is statute** (Educ. Code §29.365(a); 34 TAC §16.404(a)(4)(B)): a TEFA vendor may not charge program participants a different price; no discount, referral credit, scholarship from program money or rebate. Differential pricing is a private-school carve-out only.
2. Public-school students **may apply and be awarded** TEFA; participation ends on ADA enrollment. The doc's "ineligible" was wrong.
3. TEFA pays within **10 business days** of the administering organization verifying a request, not Net-30.
4. **§529 K-12 tutoring** requires a tutor who is not related to the student and is a licensed teacher in any state, has taught at an eligible institution, or is a subject-matter expert.
5. **§25F** routes qualified expenses to §530(b)(3)(A), not §529(c)(7); "academic tutoring" there carries no credential, location or relative test. Texas is on the IRS participating-states list; first dollars move in tax year 2027.
6. Effect sizes: Guryan 0.16–0.37 SD (not 0.18–0.40); Saga Tech 0.19 (not 0.23); virtual tutoring pools at 0.08 vs 0.44 in person.
7. Accelerate publishes months of learning per $1,000 per pupil, not cost per SD.

**Most useful new fact — 34 TAC §16.404(i):** a TEFA tutor needs no Texas educator certificate and no bachelor's degree: a national criminal history review dated within 30 days of application, registry clearance, and one of three pathways, the widest ("a relevant license or accreditation issued by a state, regional, or national certification or accreditation organization") undefined in the rule. Homeschool-tier participants face no annual norm-referenced test. 2026–27 cohort: 85,344 funded students, 80% under 200% FPL, ~25% with a documented disability; Austin ISD 1,020.

Market signals: Nerdy winding down Varsity Tutors for Schools (2026-07-31); Chegg revenue down 76.7% since FY2023; 21 of 25 incumbents verify nothing externally; none of six 2026 franchise disclosure documents mention NWEA, randomized, or third-party evaluation.

**Added from the worker's completion notice (PM read the cited report lines):**
- Seat math: a $550 standing seat exhausts a $2,000 TEFA award in 3.6 months; the 2026–27 funded cohort cannot buy the flagship seat (report §F q3). Tier 3 funded at fewer than 30 students, Tier 4 at zero.
- The $2,000 cap applies by enrollment status, not homeschool status: every tutoring-only family sits there.
- Florida PEP is the only large ESA a still-enrolled public-school child can spend on tutoring (F.S. 1002.395 bars only full-time enrollment): 140,000 seats for 2026–27, $7,477–$12,217 per student. Ohio ACE, the other public-school tutoring microgrant, ended with final claims October 2025. Arizona spends $33.5M of account money on tutoring (17.3% of spend) behind a high-school-diploma bar.
- Two natural experiments say unsupervised access is not used: Nerdy winding down Varsity Tutors for Schools (2026-07-31); Paper abandoned 24/7 on-demand chat tutoring after an independent evaluation found 12% of failing students ever logged on and no causal effect, and now sells scheduled small-group cohorts (report §C).
- Two Texas openings for 2026–27 with unresolved process (report §A, line 276): Educ. Code §28.0211(a-15)–(a-16) says TEA "shall approve high-impact tutoring providers" and districts "may use an outcomes-based contract", with no portal or list located, the highest-value unknown in the public-funds picture; §28.02111/§48.317 Third Grade Supplementary Supports pay $400 per grant from a state-held parent account direct to the provider, no district procurement, with company eligibility resting on commissioner rules not yet located. Both are phone calls, not searches.
- Payment gates forming: Accelerate's Evidence for Impact listing and NSSA's Tutoring Program Design Badge; Michigan's FY2027 School Aid statute accepts the NSSA badge as one of three qualifying standards (~).

Unreached (must not be printed as confirmed): TEA high-impact tutoring provider approval under §28.0211(a-15); the $400 third-grade grant provider rules; Odyssey vendor terms (403); Census nonemployer receipts (API key); Kraft 2020 thresholds (paywall).

Applies to: [DIRECTION](../product/direction.md) (supplemental first) · [ADR-0033-kaizen-is-the-active-product](../decisions/ADR-0033-kaizen-is-the-active-product.md) · grill [2026-09-11-grill-kaizen](../history/2026-09-11-grill.md).
