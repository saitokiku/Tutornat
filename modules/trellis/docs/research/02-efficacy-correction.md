<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: shared/artifacts/kaizen-research/02-efficacy-correction.md -->

# Kaizen RO-1 — efficacy correction and proposed SPEC §3

**Answer:** Neither **0.44 SD** nor **0.08 SD** is a defensible target, floor, forecast, or human-parity test for Kaizen. The named meta-analyses concern **human tutoring**. Online delivery does not make that tutoring autonomous AI. AI trials and broader AI syntheses now exist, but this review establishes no pooled estimate transferable to an autonomous tutoring product for 13–17-year-olds. Human-tutor parity remains an internal research ambition under ADR-0041; it is neither a launch gate nor a selling point. **[H: source identity and ADR; I: applicability judgment; evidence below.]**

Scope: correction of the specified evidence and replacement wording, not a new systematic review or a re-analysis of every underlying trial. Only this working directory was written. The vault, STATE, SPEC and DIRECTION were not changed.

## How to read the evidence

- **[H] High confidence:** directly inspected primary text/table. This means confidence in what the source reports, not necessarily low risk of bias or applicability to Kaizen.
- **[M] Moderate confidence:** primary material reached only in the publisher's indexed extracts, or a version/provenance link remains incomplete.
- **[D] Derived:** explicitly calculated from reported numbers; assumptions stated. Not an author-reported result.
- **[I] Inference:** methodological interpretation of the cited evidence, not a measured Kaizen effect.
- **[U] Unreached/unresolved:** the requested information was not established; no substitute is presented as the missing source.
- **[P] Proposal:** recommended specification text or research design, not an empirical finding.

Page numbers below identify the **printed page** unless explicitly labeled “PDF page,” which counts the cover as page 1. `n` can mean trials, interventions, estimates, students, or repeated observations; these are distinguished below. SE is standard error; CI is a confidence interval for an estimate; PI is a prediction interval for effects across settings. Neither type of interval guarantees a minimum effect for a new product. **[I: statistical interpretation of the table estimands.]**

## 1. Kraft, Schueler & Falken: version reconciliation

### Counts and point estimates

| Version actually inspected | Studies / interventions / estimates | Delivery-mode results and exact location | Confidence |
|---|---|---|---|
| Existing local decoded capture, `raw/kraft-dec.txt` (`raw/kraft-dec.txt`), with retrieval record [`01-METHOD.md:174`](01-METHOD.md#section-d--evidence-base) | Decoded abstract/body says **265**. The previous retrieval log records **282** on the landing page. | “Moving Tutoring Online” contains **0.08 / 0.44**. The log explicitly records a custom glyph cipher and local decoding. This is a historical capture, not an authenticated current publisher table. | **[H]** about what the capture says; **[U]** about the original binary/version and accuracy of every decoded numeral. |
| [EdWorkingPaper 24-1031 landing page][K-L] | Abstract currently says **282 RCTs**. | It links the later published DOI and an October 2024 download. A landing-page abstract is not evidence that the published analysis contains 282 studies. | **[H]** landing-page text. |
| [Canonical `ai24-1031.pdf`][K-C], 93-page file | Cover abstract: **282**. Body abstract: **265**; results: **340 interventions**. | Table 11a, p.64 / PDF p.65: in-person **0.438 (SE 0.036), 2,164 estimates**; virtual **0.065 (0.028), 59 estimates**. Table 8, p.61 / PDF p.62: adjusted virtual coefficient **+0.034 (0.171)**. | **[H]** direct PDF. This file itself contains a cover/body mismatch. |
| [The landing page's actual October 2024 download][K-O], also available from the [author][K-A], 88-page file | Cover and body: **265**; **340 interventions**. | Table 11a, p.60 / PDF p.61: the same **0.438 / 0.065**, SEs and effect counts. Table 8, p.57 / PDF p.58: **+0.034 (0.171)**. “Moving Tutoring Online,” pp.31–32, rounds the pair to **0.44 / 0.07**. | **[H]** direct PDFs; these two downloads were byte-identical. |
| [Published RER article][K-P], DOI **10.3102/00346543261446660**, first online June 5, 2026; [49-page publisher PDF][K-PDF] | Abstract and results: **263 RCTs**, **338 interventions**, **2,218 effect estimates**. | Table 11a, p.33: in-person **0.410 (0.027), 2,159 estimates**; virtual **0.078 (0.023), 59 estimates**. Prose p.30 rounds these to **0.41 / 0.08**. | **[H]** publisher HTML and PDF. |

**Correction:** the directly reached versions support **0.44 / 0.07 in the preprint** and **0.41 / 0.08 in the publication**. I could not authenticate **0.44 / 0.08** as a coherent pair from an original table. The existing decoded text must not resolve that conflict. Nor can the change from 265 to 263 be assigned to particular excluded studies without a version changelog or reconciled extraction data. **[I/U; locations in the table above.]**

The estimation method also changed: the preprint describes robust variance estimation (p.11 / PDF p.12); the publication uses its correlated-and-hierarchical-effects extension (pp.7–8). The changed estimates therefore cannot be attributed solely to a changed study count. **[H: “Meta-Analytic Estimates” in K-O and K-PDF; I: attribution limit.]**

### Uncertainty and the adjusted coefficient

The published estimates can be accompanied by approximate 95% CIs reconstructed as `estimate ± t(.975, reported df) × SE`. The input numbers are rounded, so these are **not exact author-reported CIs**. The virtual subgroup's very low df also warrants caution about inferential reliability; the authors explicitly flag it on p.30. The calculation and two known Student-t quantile checks are preserved in `reconstruct_ci.py` (`raw/ro1/reconstruct_ci.py`) and `reconstructed-ci.json` (`raw/ro1/reconstructed-ci.json`). **[D; H: authors' caution.]**

| Published estimand | Estimate | SE | Reported df | Reconstructed 95% CI | Exact source |
|---|---:|---:|---:|---:|---|
| In-person subgroup, full sample | 0.410 | 0.027 | 227.8 | **[0.357, 0.463]** | [RER Table 11a, panel A, col.1, p.33][K-PDF] **[H inputs; D CI]** |
| Virtual subgroup, full sample | 0.078 | 0.023 | 1.9 | **[−0.026, 0.182]** | Same, col.2 **[H/D]** |
| In-person, independent tests only | 0.336 | 0.020 | 180.9 | **[0.297, 0.375]** | Table 11a, panel B, col.1 **[H/D]** |
| Virtual, independent tests only | 0.061 | 0.010 | 1.6 | **[0.006, 0.116]** | Same, col.2; **51 estimates** **[H/D]** |
| Adjusted online-versus-in-person moderator | **−0.050** | 0.120 | 8.5 | **[−0.324, 0.224]** | [RER Table 8, model 3, p.25][K-PDF] **[H/D]** |

**Internal publication inconsistency:** p.30 calls the adjusted coefficient “**positive but statistically insignificant**,” but Table 8 prints **−0.050**. The preprint's **+0.034** agrees with its own positive prose. Both published HTML and PDF show the negative table cell. I report the discrepancy rather than silently correcting either the prose or table. Table 11's printed star legend also reverses the usual one-/three-star order; the reconstruction above uses the numerical df and SE, not the stars. **[H: K-P/K-PDF, Table 8, Table 11 and p.30; U: intended correction.]**

The preprint tables report SEs but not the denominator df needed to reconstruct their small-sample t intervals. Their exact 95% CIs for **0.438**, **0.065**, and **+0.034** were **not reached**. Using ±1.96 SE for the six-study virtual subgroup would conceal the small-sample problem visible in the publication. **[H: K-O Tables 8/11a; U: exact preprint intervals; I: inference caution.]**

### What is being compared

| Question | What the primary source establishes | Implication for Kaizen |
|---|---|---|
| Human or autonomous AI? | Inclusion criteria require human tutoring and exclude computer programs without direct human-tutor support. K–12, OECD settings, randomized designs, math/reading; groups up to eight. [RER pp.5–6, “Inclusion Criteria”][K-PDF]. **[H]** | Neither subgroup estimates autonomous AI efficacy. **[I]** |
| Whose ages? | Table 1 groups grades; **32 studies** include grades 6–12, with overlapping grade categories. The delivery estimate is not an age-13–17 subgroup. [RER Table 1, pp.10–11][K-PDF]. **[H]** | Do not label 0.078 “the teen online-tutoring effect.” **[I]** |
| What dose/test? | Dose varies across programs; Table 11b bins **intended total hours**. Table 11a panel A mixes independent and intervention assessments; panel B restricts to independent tests. [RER Table 11, p.33][K-PDF]. **[H]** | No common dose, assessment, or delayed-transfer endpoint underlies the headline pair. **[I]** |
| What adjustment? | Table 8 jointly includes sample size, year/quality, subject–grade, test type, country, delivery, location, curriculum, timing, ratio, tutor type and intended dosage. **[H: RER Table 8, pp.25–26.]** | These are between-study moderators. They cannot be stacked as causal penalties to forecast Kaizen. **[I]** |
| Why “six studies”? | Footnote 17 and p.30 identify **59 virtual effects from six studies**; in-person has 2,159 effects. **[H: RER p.30 and Table 11a.]** | “Both estimates come from six studies” is wrong; **six qualifies virtual only**. **[I]** |

The two subgroup means are effects of different programs against their respective controls. Their difference is not a randomized delivery-mode effect. A non-significant adjusted moderator does not prove equivalence either. These conclusions concern the designs, regardless of which sign the authors intended. **[I: Table 8/11 estimands and inclusion criteria.]**

**Update to the earlier audit:** the preprint's statement that no direct causal mode comparison was available is time-bound. The final article cites **Hashim, Pace Miles & Croke (2025)**, which randomized human tutoring mode with tutors crossed across conditions. In a six-week summer literacy program for rising grades 1–3, Table 6 reports in-person minus remote effects of **0.030 (SE 0.050)** on Acadience and **0.017 (0.082)** on Star; neither establishes equivalence. This trial is about young children and human tutors, not adolescent AI. **[H: original [EdWP 25-1176][HASH], study setting/design and Table 6, p.43 / PDF p.44; I: relevance and equivalence.]**

## 2. The original six virtual-tutoring trials

The six-study list is explicit in preprint footnote 8, p.31, and published footnote 17. The table below inspects the originals or identifies the version gap. It is a provenance and applicability check, **not** a reproduction of all 59 extracted effects. The effects shown are selected transparent trial estimands, not a new pool. **[H: K-O footnote 8; I: scope.]**

| Original trial | People, dose, and assessment | Reported result; exact passage/table | Confidence and relevance |
|---|---|---|---|
| [Fesler, Gu & Chojnacki 2023, Air Tutors][FES] | Grades 4–6; live paid tutors, small groups; approximately 3 hours/week, differing 15-/21-week schedules. MAP math. | **Invited-student ITT 0.10 SD (SE 0.06)**; participation-scaled estimate **0.13 (0.09)**. Table 1, p.2 / PDF p.8; program overview, PDF p.4. | **[H]** Human online. The participation estimate must not be relabeled ITT. |
| [Gortazar, Hupkau & Roldán 2023, Menttores][GOR] | Grades 7–8, ages 12–15; teachers, 2:1; three 50-minute sessions/week for eight weeks, **20 planned hours**. | Table 3, p.37 / PDF p.38: test-score effect **0.262 SD (SE 0.148)**. §4.1 explains that the authors created grade-specific curricular tests because an official test was unavailable. | **[H]** Human online; “standardized” here does **not** mean independently sourced. Teacher grades are a separate outcome and scale. |
| [Kraft, List, Livingston & Sadoff 2022][K22] | Grades 6–8; college volunteers, 1:1; nominal two 30-minute sessions/week; mean received dose **3.1 hours**, 18% received none. i-Ready/IAR math and reading. | Table 1, PDF p.4: pooled ITT **0.053 SD (SE 0.043)**; implementation pp.2–3. | **[H]** Human online. A low-dose implementation result is not an efficacy floor for online or AI tutoring. **[I]** |
| [Loeb et al. October 2023, OnYourMark][LOEB23] | K–2; human tutors, 1:1/2:1; four 20-minute sessions/week, September–May. DIBELS; MAP Reading secondary. | Table 3, p.8 / PDF p.10: all-student adjusted DIBELS **0.053 SD (SE 0.029), n=1,867**; restricted sample excluding multilingual learners and students with disabilities **0.075 (0.036), n=1,163**. | **[H]** original 2023 report reached. Its abstract rounds the preferred result to 0.08. Do not call the restricted estimate the all-student effect. |
| [Roschelle et al. 2020, Cignition][ROS] | Grade 5; human 1:1 tutoring plus a fractions game versus access to the game; 20–25 minutes twice/week, mean about 18 sessions. Same study-specific fractions diagnostic before/after. | Executive summary, PDF p.3: corrected **g=0.46, 95% CI [0.23, 0.70]**; it also reports gain-score g=0.66, a different scaling. Methods, PDF pp.5–6. | **[H]** for the executive-summary estimate; body rounds the corrected effect to 0.45. Human tutoring package, not AI or a broad independent exam. |
| [Torgerson et al. 2016, Affordable Online Maths Tuition][TOR] | England Year 6; trained graduate human tutors in India/Sri Lanka, 1:1; 45 minutes/week for 27 weeks. National KS2 maths. | Executive summary, p.5 / PDF p.6: **−0.03 SD, 95% CI [−0.35, 0.28]**. | **[H]** Human online. The interval and negative point estimate alone rule out reading a pooled positive mean as a guaranteed floor. **[I]** |

These programs differ in age, duration, received dose, tutor qualifications, comparator and assessment. Several are elementary-school interventions; the adolescent overlap does not turn the pooled subgroup into a 13–17 estimate. **[I: six original designs above.]**

**Additional trial-version check:** [Robinson et al. 2024][LOEB], the later OnYourMark report, changes those adjusted DIBELS values to **0.054 (SE 0.030)** for all students and **0.077 (0.038)** for the restricted sample (Table 4, p.21 / PDF p.23). Both original reports were reached; the exact rows/versions selected for each of the meta-analysis's 59 effects remain unavailable. **[H: both original tables; U: extraction mapping.]**

## 3. Nickow, Oreopoulos & Quan: the published estimate is not 0.37

| Version / estimand | Exact primary evidence | Confidence |
|---|---|---|
| [NBER Working Paper 27476, July 2020][N-W] | Abstract: **0.37 SD**. Findings/descriptive analysis: **96 studies**. This is the earlier version, not the final AERJ result. | **[H]** original working paper. |
| [Published DOI 10.3102/00028312231208687][N-P], AERJ 61(1), 74–107; first online Nov.27, 2023 | Abstract: **0.288 SD, SE 0.029**. Table 2, panel A, “All”: **89 studies, 553 estimates**; **95% PI [−0.085, 0.662]**. | **[H]** abstract; **[M]** primary publisher-indexed Table 2, p.86. Full published PDF was not downloadable in this run. |
| Older students, still human tutoring | Table 2, “Grades 6–11”: **0.128 SD, SE 0.040**, **10 studies / 36 estimates**, **PI [−0.076, 0.332]**. | **[M]** exact publisher-indexed table. Not an autonomous-AI subgroup and not a common-dose adolescent benchmark. **[I]** |

The printed interval above is a **prediction interval**, not the CI around 0.288. A simple normal approximation to the overall mean CI is **[0.231, 0.345]**, calculated as `0.288 ± 1.96×0.029`; it is **not** an author-reported finite-sample RVE interval. Exact small-sample df/CIs were not reached. **[D/U]**

The final methods distinguish teachers, paraprofessionals, nonprofessionals and parents; restrict outcomes to independently created achievement measures; and pool programs with different frequencies and durations. Outcomes are measured no more than three months after intervention; this is not a uniformly delayed-retention pool. Tables 2–3 describe the subgroups. This paper supplies evidence about human tutoring versus its controls, not AI versus a human tutor. Do not combine the old **96 / 0.37** with the published **89 / 0.288**, or treat the two human-tutoring meta-analyses as independent replications with nonoverlapping trials. **[M: published Methods, “Inclusion Criteria,” and Tables 2–3, [publisher-indexed full-text record][N-T]; I: interpretation and overlapping-literature caution.]**

## 4. Autonomous AI is a separate intervention class

Operationally, distinguish (a) a human tutor communicating online; (b) a human tutor receiving AI assistance or approving messages; and (c) software delivering instructional interaction without a live tutor composing/approving each turn. Teacher supervision, curricular preparation, mandatory school time and access support remain components of the tested package even in (c). **[P: classification used in this review.]**

| Primary study | What was actually tested | Learning evidence and limitation | Confidence |
|---|---|---|---|
| [Bastani et al., PNAS 2025][BAST] | Nearly 1,000 Turkish high-school students, grades 9–11; GPT Base, teacher-informed guarded GPT Tutor, or no generative AI. Four curricular review sessions; assisted practice followed by an unassisted exam. | Table 1: unassisted exam **GPT Base −0.054 (SE 0.022)**; **GPT Tutor −0.004 (0.013)**. Units are **score proportions**, not SD. The guarded tutor's estimate is inconclusive; no human-tutor arm and no long-delay retention endpoint. | **[H]** main text, experiment design and Table 1. **[I]** It separates assisted performance from subsequent unaided learning; it neither proves universal harm nor guarded-AI parity. |
| [Henkel et al. 2024, Rori, arXiv v2][RORI] | Eleven Ghanaian schools randomized by school; grades 3–8; two 30-minute study-hall sessions/week. Students worked independently with the WhatsApp tutor; teachers helped with technical issues. Same 35-item numeracy/algebra test at baseline and endline. | §§3–4, pp.4–6: reported **d=0.36** among test completers. **637** baseline students, **477** completing both tests. The text reports 236 treated completers while Table 1 says 237. | **[H]** original report. Positive autonomous-interaction evidence, with school support. **[U]** no cluster-adjusted effect CI reached; the reported significance test compares individual growth scores despite school allocation. Attrition, the count inconsistency, age mix and reused test limit transfer to Kaizen. **[I]** |
| [De Simone et al., World Bank 2025, Nigeria][NIG] | First-year senior-secondary students; six weeks, twelve 90-minute sessions using Copilot, with teachers guiding prompts and curriculum in school labs. | Table 2, p.30 / PDF p.34: composite ITT **0.310 SD (SE 0.068), n=654**. Table 3: English **0.238 (0.068)**; composite also includes digital/AI knowledge. | **[H]** original working paper, intervention section and Tables 2–3. Positive evidence for a **teacher-supported package**, not the incremental effect of AI alone or parity. **[I]** |
| [LearnLM/Eedi UK study, 2025][UK] | 165 students aged 13–15, five schools, seven weeks. Human-only tutoring versus AI-drafted tutoring within a platform, with an additional static-hint condition. | §2/design and tutor-supervision protocol: qualified human tutors reviewed, approved or edited AI messages before sending. | **[H]** original arXiv v1. This cannot establish autonomous AI versus human parity, even when labeled an “AI tutor” comparison. **[I]** |
| [Oreopoulos & Low, Khanmigo, August 2026][KHAN] | Grades 6–8 in 18 Tennessee schools; randomized grade clusters assigned Khan Academy plus Khanmigo during existing remedial-math periods versus usual remediation. | Table 7, p.27 / PDF p.28, population-SD baseline-adjusted columns: yearly ITT **0.020 (SE 0.035)** in year 1, **0.084 (0.041)** in year 2; stacked **0.062 (0.035)**. MAP outcome. | **[H]** original working paper. This is the **combined platform deployment**, with no randomized Khan-Academy-without-AI arm; it does not isolate Khanmigo's added effect. **[I]** |
| [Oreopoulos, Liut, Sungu & Low, NUMI, August 2026][NUMI] | Grades 6–8; randomized AI versus the same CAL platform without AI and mastery versus non-mastery. One approximately 50-minute class; a short delayed test about one week later. | Table 9, p.42 / PDF p.43, mastery subgroup: practiced Exercise 1 **+0.032 probability points (SE 0.017)**; unpracticed **+0.002 (0.017)**. Practiced-minus-unpracticed total **+0.026 questions (0.034)**. Table 5 gives the full factorial results. | **[H]** original working paper. Direct evidence on the incremental AI component; practiced-item gains are tentative and transfer is not established. Analysis is restricted to logged-in students who took the delayed test; it is not a home-use trial covering ages 13–17. **[I]** |

### Does a pooled AI estimate exist?

**Yes, broad syntheses exist; “no pooled AI estimate exists” would be false.** An August 2026 World Bank background paper by **Burneo, Dinarte-Diaz, Lopez & Molina**, [*Can EdTech Close Learning Gaps?*][BURN], combines adaptive systems, generative AI and different delivery packages. Its abstract describes **191 estimates from 14 studies**; Table 1, p.16, uses **133 learning estimates**, reporting **0.125 SD (SE 0.030; df 11)**. These counts are different outcome sets, not 191 separate trials. **[H: abstract and Table 1.]**

Its tutoring section (§4.3, pp.21–23) uses **17 estimates from six studies**, including software paired with an **in-person human tutor** in Saga. It reports **0.12** as an average and **0.168** as the meta-regression subgroup estimate; Figure 6's note says its displayed-estimate pool is not directly comparable to the main model. Those values must not be silently interchanged. The authors explicitly caution against interpreting their comparison with Nickow as a direct relative-effectiveness estimate. **[H: §4.3, Table 2 col.3, Figure 6 note.]**

**Defensible negative finding:** neither the named human meta-analyses nor this heterogeneous AI/adaptive synthesis supplies a validated pooled estimate for **autonomous conversational AI tutoring, ages 13–17, on independent delayed learning tests, under Kaizen-like use and against a matched comparator**. This is a finding about the sources inspected, not proof that no such synthesis could exist anywhere. The broad AI pooled magnitude is reported to identify the literature, **not adopted or independently re-meta-analyzed as Kaizen evidence**. **[I, moderate confidence in coverage; H in the inspected studies' population/intervention mismatch.]**

## 5. Proposed replacement wording for SPEC §3

**Everything in this section is [P], proposed for PM review, not applied.** Policy authority is [ADR-0041](/Users/mann/pm/vault/30-decisions/ADR-0041-efficacy-is-a-north-star-not-a-gate.md), “Decision” and “Consequences.” The evidence references point to this report's tables so the proposal does not import a new numerical threshold.

**Application boundary:** replace the introductory content of SPEC §3, stopping before the existing **§3.1 Evidence model**. That subsection was added during this research under [ADR-0042](/Users/mann/pm/vault/30-decisions/ADR-0042-practice-buys-the-exam-seat-never-the-grade.md); retain it in full. Its practice/assessment separation, scoped eligibility clock, quiet-window rules, immutable evidence and beta blocker are not superseded by this efficacy correction. **[H: current SPEC §3.1; P: replacement boundary.]**

---

### 3. Efficacy: independent learning first; human-tutor parity as a north star

**Purpose.** Kaizen aims to help 13–17-year-olds learn skills they can later use independently. Matching effective human tutoring is a long-term research ambition. It is not a beta or launch gate and is never a marketing claim. No historical pooled effect size is a minimum promised effect, a forecast of Kaizen's effect, or a substitute for evaluating this product.

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

---

**Proposed measurement implementation, not a new policy gate:** baseline-adjusted randomized comparisons against a defined usual-study or active-practice condition can first estimate Kaizen's contribution. Where feasible, comparing the same practice system with and without AI isolates the AI component; comparing Kaizen with usual study estimates the product package. These answer different questions and should have different labels. Pilot sample sizes should follow the precision needed for pilot decisions; the beta should not be retrofitted into a parity trial. **[P/I: comparator logic; NUMI and Khanmigo designs illustrate the distinction.]**

## 6. Unreached material and remaining uncertainty

| Requested material / question | Access result and exact limitation |
|---|---|
| Published Kraft supplementary DOCX | Publisher lists `sj-docx-1-rer-10.3102_00346543261446660.docx`; [direct supplement link][K-S] returned 403 / browser-fetch error. Figshare DOI/search queries did not find a corresponding downloadable record. **[U]** The preprint's embedded appendices were reached, but are not represented as the published supplement. |
| Published Nickow full text and supplement | Abstract and references reached on SAGE; primary indexed full-text/table passages reached through search. PDF access redirected to restricted abstract; [supplemental PDF][N-S] failed. **[U]** No claim of complete final-text or supplement inspection. |
| Kraft count changes and original extraction rows | No author changelog or reconciled trial/effect dataset was reached. **[U]** Cannot identify why each study entered/exited or independently reproduce the 59-effect virtual pool. |
| Original binary behind `kraft-dec.txt` | The previous method file preserves an abbreviated author-hosted URL; the decoded capture contains character corruption. Fresh original PDFs were used for quantitative correction. **[U]** Cannot prove that every discrepancy is a decoder error rather than a source revision. |
| Loeb et al. 2023 extraction mapping | The October 2023 report and a 2024 revision were both reached. **[U]** The meta-analysis's exact extracted-effect mapping remains unresolved. |
| Exact preprint/Nickow finite-sample CIs | SEs reached; required denominator df or exact intervals not reached. **[U]** Publication-era Kraft intervals are explicitly reconstructed, not attributed verbatim to the authors. |
| All primary trials in every meta-analysis | The six virtual sources and selected AI originals were inspected; the hundreds of other trial reports were not re-extracted. **[U]** Human and broad-AI aggregate numbers above are attributed published summaries, not a new independently reproduced synthesis. |
| Exhaustive coverage of autonomous teenage AI tutoring | This was a bounded primary-source correction, not a registered systematic search. **[U]** The report does not assert universal absence of a matched synthesis. |

Access failures are not evidence that a supplement, dataset or result does not exist. No unreached source was filled in from a blog or a secondary summary. **[I: scope rule.]**

## 7. Consequences for the existing documents

- Replace the historical **0.44 / 0.08** pair and the “floor” interpretation with the version-specific account above. Treat the prior **0.05–0.10 AI forecast from stacked moderators as withdrawn**, consistent with the independent audit's §K1. **[P; local audit authority.]**
- Where the audit or amended SPEC says “six studies,” specify **the virtual subgroup**. **[P; RER p.30/Table 11a.]**
- SPEC §10 still refers to a **0.08 virtual warning**. The PM should align that cross-reference with ADR-0041 and this correction; retaining it as an AI floor would reintroduce the same error. **[H: SPEC §10 inspected; P: proposed follow-through.]**
- Do not replace the withdrawn numbers with **0.288**, **0.128**, **0.125**, **0.168**, or a favorable individual AI trial. Their estimands and contexts differ. **[I/P: sections 1–4.]**

Three findings would materially improve the answer: a well-conducted Kaizen randomized evaluation on independent delayed outcomes; a pre-specified concurrent human-comparator study; and an auditable synthesis restricted to genuinely autonomous tutoring for the intended ages, settings and outcomes. These are evidence conditions, not recommendations to purchase services or contact researchers. **[P]**

## 8. Research record

Research began **2026-09-12 15:41:42 CDT**; final source/link check **16:08:45 CDT**, approximately **27 minutes** within the 40-minute limit. Both times were read by executing `date`. Source PDFs/text and access-failure captures are in `raw/ro1/` (`raw/ro1/`); `capture-index.json` (`raw/ro1/capture-index.json`) records file sizes, SHA-256 hashes and PDF page counts. All PDF files in that index parsed successfully; an HTML filename is explicitly not treated as successful article access. Source-reference definitions and local links were checked, and the reconstructed CI calculation passed known-quantile checks.

Required local inputs were read: SPEC §3 (`vault/40-projects/kaizenai-saas/SPEC.md:23`), [ADR-0041](/Users/mann/pm/vault/30-decisions/ADR-0041-efficacy-is-a-north-star-not-a-gate.md), [independent audit §K1](/Users/mann/pm/shared/artifacts/astra-plan-20260912/kaizen-second-opinion.md), existing decoded capture (`raw/kraft-dec.txt`), and prior retrieval record (`shared/artifacts/kaizen-research/01-METHOD.md:173`). The final re-read identified and preserved the newly added ADR-0042 §3.1.

The research skill was used. Its requested background-agent launch failed at the session infrastructure layer, so the work was completed locally. Ego's sandbox bootstrap also failed; fallback access used primary publisher/repository pages, web-indexed primary text, and direct public PDF downloads. No paywall purchase, external message, or employer material was involved. No universal negative literature claim is made from the access failures.

[K-L]: https://edworkingpapers.com/ai24-1031
[K-C]: https://edworkingpapers.com/sites/default/files/ai24-1031.pdf
[K-O]: https://edworkingpapers.com/sites/default/files/Tutoring%20Meta-Analysis%20Oct%202024_unblinded.pdf
[K-A]: https://www.matthewakraft.com/s/Kraft-Schueler-Falken-2024-Tutoring-Meta-Analysis.pdf
[K-P]: https://journals.sagepub.com/doi/10.3102/00346543261446660
[K-PDF]: https://journals.sagepub.com/doi/pdf/10.3102/00346543261446660?download=true
[K-S]: https://journals.sagepub.com/doi/suppl/10.3102/00346543261446660/suppl_file/sj-docx-1-rer-10.3102_00346543261446660.docx
[N-P]: https://journals.sagepub.com/doi/10.3102/00028312231208687
[N-T]: https://journals.sagepub.com/doi/10.3102/00028312231208687?icid=int.sj-full-text.similar-articles.5
[N-W]: https://www.nber.org/papers/w27476
[N-S]: https://journals.sagepub.com/doi/suppl/10.3102/00028312231208687/suppl_file/sj-pdf-1-aer-10.3102_00028312231208687.pdf
[FES]: https://files.eric.ed.gov/fulltext/ED628638.pdf
[GOR]: https://edworkingpapers.com/sites/default/files/ai23-743.pdf
[K22]: https://www.matthewakraft.com/s/Kraft-et-al-2022-Online-Tutoring-April-2022.pdf
[LOEB]: https://edworkingpapers.com/sites/default/files/ai24-955.pdf
[LOEB23]: https://studentsupportaccelerator.org/sites/default/files/Effects%20of%20Virtual%20Tutoring%20on%20Young%20Readers.pdf
[ROS]: https://files.eric.ed.gov/fulltext/ED604743.pdf
[TOR]: https://files.eric.ed.gov/fulltext/ED581116.pdf
[HASH]: https://edworkingpapers.com/sites/default/files/ai25-1176.pdf
[BAST]: https://pmc.ncbi.nlm.nih.gov/articles/PMC12232635/
[RORI]: https://arxiv.org/pdf/2402.09809v2
[NIG]: https://thedocs.worldbank.org/en/doc/0c08ef70ff0e1d81997f116923c0e2c7-0140022025/related/EDU-WP-18-Evaluating-the-Impact-of-Generative-AI-on-Learning-Outcomes-in-Nigeria.pdf
[UK]: https://arxiv.org/html/2512.23633v1
[KHAN]: https://edworkingpapers.com/sites/default/files/ai26-1551.pdf
[NUMI]: https://edworkingpapers.com/sites/default/files/ai26-1552.pdf
[BURN]: https://thedocs.worldbank.org/en/doc/2fba81cd6cd60d2f54532fc7062395fb-0050062026/original/Can-EdTech-Close-Learning-Gaps.pdf
