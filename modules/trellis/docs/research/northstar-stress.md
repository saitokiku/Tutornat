<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: shared/artifacts/astra-plan-20260912/northstar-stress.md -->

## N1

[opinion] **The team controls which skills count, which learners remain, and when the clock starts. That makes the proposed number highly negotiable.**

| How to inflate it without improving learning | Cheapest structural defence |
|---|---|
| Teach easy or already-known skills. | Independent baseline; freeze target curriculum before teaching. |
| Never “teach” difficult skills, or call unsuccessful teaching “exploration.” | Denominator includes assigned curriculum, including untouched and unfinished targets. |
| Split easy skills into many tiny skills; merge difficult ones. | Version and freeze skill definitions and curriculum weights. |
| Require ten successful practice reps before weak skills enter measurement. | Schedule evaluation independently of practice success; retain certification eligibility separately. |
| Admit stronger, motivated, better-supported learners. | Publish eligibility and recruitment funnel; compare randomized learners from the same intake. Limit generalization accordingly. |
| Redefine “active”; remove cancellations, absentees and weak learners who churn. | Freeze enrollment cohorts; pursue follow-up after cancellation; show every missing outcome. |
| Invite likely successes; quietly omit overdue checks. | Automatic invitations on fixed dates; retain offered, missed, assisted and failed checks. |
| Make items easier or grading more generous. | Fixed assessment blueprint, rubric and scorer version; independently reviewed comparable forms. |
| Change numbers or surface wording while reusing the same solution template. | Hold out item families and application contexts; audit exposure across sessions. |
| Retry until correct; report the best attempt; count duplicate submissions. | Prespecified first assessment battery; immutable attempt history and idempotent submissions. |
| Delay difficult checks indefinitely under “30+”; restart clocks to keep failures ineligible. | Bounded follow-up windows fixed in advance; resets never remove cohort members or original deadlines. |
| Reclassify relevant help as another skill. | Versioned item-to-skill mappings, including embedded prerequisite instruction; sampled audits. |
| Let the tutor write the question, answer key or qualifying grade. | Separate assessment authority; mandatory approved item IDs; protected assessment bank. |
| Move assistance into parents, another device, calculators or leading prompts. | Declare permitted tools; log observed assistance; independently observe a sample. Never claim perfect detection. |
| Reduce help by hiding hints, refusing requests or making asking embarrassing. | Track requests, refusals, unresolved difficulty and abandonment alongside assistance received. |
| Increase “demonstrations/month” through more testing or repeated old skills. | Fixed assessment opportunities; unique outcomes per enrolled learner; report learner time. |
| Repeatedly rehearse through “checks,” then call the last result retention. | Record all assessment exposures; equalize schedules across comparison groups; reserve some skills for a first delayed probe. |
| Shift teaching effort to parents or undisclosed human staff. | Record parent effort, outside instruction and all delivery costs. |
| Publish favorable cohorts, dates or model versions; treat hundreds of skill attempts as hundreds of learners. | Prespecify analysis and stopping rules; retain every cohort; calculate uncertainty at the assignment level. |

[opinion] Missing or assisted attempts earn **no demonstrated-success credit**. They are not automatically evidence of zero learning; report that distinction.

## N2

- [opinion] **Thirty days is a convention, not a validated boundary.** “Thirty days since instruction” and “thirty days since all relevant practice” are different claims. Frequent independent use can sustain performance without dependency.
- [verified] Experimental spacing research found that effective review spacing depended on the eventual retention interval; it does not establish a universal thirty-day mastery threshold for algebra. [Cepeda et al.](https://pubmed.ncbi.nlm.nih.gov/19076480/)
- [opinion] **It cannot be visible from week one.** Early practice, eligibility and seven-day checks are preliminary indicators, not thirty-day outcomes.
- [opinion] **A share hides growth.** Moving from 8/10 to 16/20 retained skills leaves retention flat while doubling demonstrated capability. Conversely, stopping difficult teaching can improve the share. Time-to-independence and gains/hour are useful diagnostics, but also reward easy targets or manipulated time accounting.
- [opinion] **It cannot attribute learning.** Prior ability, school teaching, family support and selection can explain the entire result.
- [opinion] **Appropriate help is productive.** A learner advancing into harder material may need more assistance. Less usage can mean independence, avoidance or abandonment.
- [opinion] **The proposed failure condition is invalid.** Flat retention plus growing revenue does not establish a crutch; rising retention does not establish added value.
- [verified] Manny’s recorded commercial wedge is homework and grades. [DIRECTION](/Users/mann/pm/vault/40-projects/kaizenai-saas/DIRECTION.md)
- [opinion] A grades-focused parent needs evidence about school assessments, homework burden and conflict. Independent learning should accompany that promise; the retention percentage cannot substitute for it.

## N3

[opinion] **Choose “additional independent capability caused by Kaizen.”**

**Definition:** The baseline-adjusted advantage of offering Kaizen over a credible usual-study alternative on an independent, curriculum-balanced transfer assessment thirty days after a fixed eight-week learning block, across all randomly assigned eligible learners.

[opinion] Measurement rules:

1. **Freeze the target.** One subject, defined population, curriculum weights, assessment forms, product version and intended study-time budget. Eight weeks and thirty days are initial operational choices, not scientific constants.
2. **Compare concurrently.** Randomize before product use; give both groups comparable study opportunities and assessment contact. Measure actual dose and outside help; do not restrict analysis to compliant users.
3. **Measure capability continuously.** Use a fixed score scale covering the intended domain, including skills the tutor avoided. Separate retention of taught content from transfer to unfamiliar applications.
4. **Fix assessment dates.** Baseline, block end and thirty-day follow-up; later persistence checks on a prespecified sample. Subsequent instruction never postpones assessment or excludes a learner. This measures performance at follow-up, not proof of thirty instruction-free days.
5. **Keep everyone in the analysis population.** Report uncertainty, attrition and prespecified missing-data sensitivity analyses. A conservative “demonstrated benefit” bound can accompany the estimate; missing scores must remain visibly missing.
6. **Keep certification separate.** SPEC §3.1 still governs individual mastery claims. A research outcome does not automatically qualify as mastery evidence.
7. **Keep costs beside learning.** Learner time, parent effort, delivery cost and school outcomes are guardrails. Early beta observations remain feasibility evidence; this benchmark does not become a new launch gate.

[opinion] **Failure condition:** At a commercially feasible dose and cost, a credible evaluation’s **upper 95% confidence bound** for added delayed transfer falls below a **prespecified minimum worthwhile gain**. An upper bound at or below zero is outright failure to add learning. An interval spanning worthwhile benefit is unresolved, not success.

Set that minimum in the chosen assessment’s educationally meaningful units **before enrollment**. Its numerical value is currently unresolved; inventing another attractive number would repeat the original mistake. Revenue cannot rescue failure of the learning mission.

## N4

[verified] **The inspected source does not implement the proposed measurement contract. Source inspection only:**

- Tutor-generated checks can bypass the bank and carry `itemId: null` into grading and mastery updates. Engine (`shared/repos/KaizenEdu/lib/tutor/turn/engine.ts:447`), prompt (`shared/repos/KaizenEdu/lib/tutor/checks/prompt.ts:128`), service (`shared/repos/KaizenEdu/lib/tutor/checks/service.ts:125`).
- The confirmation delay is **24 hours**; assisted results still update the estimate and item count. Student model (`shared/repos/KaizenEdu/lib/tutor/model/student-model.ts:20`).
- Hint detection queries the **current session since its last check**, which cannot establish SPEC’s cross-session instruction history. Evidence query (`shared/repos/KaizenEdu/lib/tutor/model/evidence.ts:41`).

[opinion] **P0 requirements:**

- **Evidence authority:** close and independently reproduce the bypass; restrict qualifying writes; require reviewed item provenance; make reports replayable from immutable evidence and rule versions.
- **Exposure history:** learner-wide timestamps for instruction, hints, answers, practice and assessments across voice, text and whiteboard; skill and item-family mappings; permanent attempt disqualification.
- **Cohort accounting:** baseline eligibility, enrollment, allocation, original assessment deadlines, invitations, refusals, assistance, missingness and churn. Ten clean reps must not determine research inclusion.
- **Assessment validity:** protected forms, comparable difficulty, fixed rubrics, multiple items and contexts, independent scoring checks, declared permitted tools and observation protocol.
- **Evaluation records:** baseline and follow-up scores, product version, planned/actual dose, parent effort, cost, outside help and consented school outcomes. Test cross-session help, repeated families, timing boundaries and duplicate/concurrent submissions end to end.

[opinion] **Unmeasurable today:** trustworthy thirty-day retention, unfamiliar-family transfer, comparable help-per-skill trends and causal added learning from the current mastery fields. Forty-eight-hour/seven-day evidence cannot retrospectively establish thirty-day retention. Browser telemetry will never establish the complete absence of outside assistance; that limitation remains even after implementation.