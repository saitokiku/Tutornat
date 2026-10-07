# Role B — Product and learning evidence

**Checked:** 2026-09-30  
**Scope:** product direction, current alternatives, human+AI tutoring evidence, independent-versus-assisted performance, feedback, delayed retention, and a falsifiable first pilot.  
**Boundary:** this is discovery, not a product design, build plan, pricing decision, efficacy claim, or legal certification.

## Decision-changing conclusion

Keep the broad idea, but narrow the first test to **academic continuity for existing recurring human tutoring**. The most defensible product hypothesis is not “another AI tutor.” It is a coordination and evidence layer that lets a tutor arrive prepared, lets constrained AI do between-session shadow-work, records where help was used, and checks later whether the learner can perform without that help.

That direction is coherent with the owner statement and with meaningful code already present in Kaizen-AI. It is also materially different from the latest trellis direction, which is a household AI-learning product with no human tutoring in v1. The repositories therefore contain both the original product and a later narrowing; neither demand nor learning efficacy has been validated. The brief says no one except the owner has used any version (`BRIEF.md:7-15`).

Do **not** select a general AI study companion, course generator, tutoring marketplace, tutoring CRM, or in-person club as the first software wedge on desk research alone. Current products already cover each of those components. The potentially distinct claim is continuity across human and AI learning episodes with honest assistance provenance and delayed independent evidence. That combination still needs direct user validation.

## Evidence discipline and provenance

All four supplied snapshots were independently checked and were clean at the expected commit:

| Snapshot | Commit checked | Status |
|---|---|---|
| KaizenEdu | `cd3dfa82fe09dd66b1fb7e78af9375aef5fcecc3` | pinned, clean |
| Kaizen-AI | `91af9e452c7df5867afa7249a6dc58b00003f531` | pinned, clean |
| Tutornat | `1c2f4925215e9fb0a27ab76863ca88de931bc5d3` | pinned, clean |
| trellis | `41999b5dd49e5549662da8c5b42c0bb8bbe8804a` | pinned, clean |

Evidence labels used below:

- **Owner statement:** supplied intent, not market evidence.
- **Documented intent:** a repository document says the product should do something.
- **Source-code observation:** a code path exists at the pinned commit; it was not run here.
- **External product claim:** a vendor’s current primary page describes its own product; this is not independent efficacy evidence.
- **Research evidence:** a paper or research record was checked for population, intervention/control, outcome, and limitations.
- **Pilot hypothesis:** proposed for falsification; unapproved and not demonstrated.

No application was launched, no dependency was installed, no migration or live provider call was made, and no user behavior was observed. Existing tests and comments support classification only; they are not evidence that production behavior or learning outcomes work.

## Top findings

### 1. The original idea is a human+AI continuity loop, not a chatbot wrapper

**Status: KEEP · Confidence: high on intent and source presence; zero confidence on demand.**

- The owner describes a “unifying fabric” for organizing learning and academics, with AI doing shadow-work while the student is measured and kept growing (`BRIEF.md:7-15`).
- Kaizen-AI describes an in-person academic club plus free AI study companion, centered on a recurring “standing seat,” not a pure SaaS tutor (`Kaizen-AI/README.md:1-25`).
- Its evidence-engine document explicitly defines a “harmony loop”: evidence ledger → structured tutor brief → three-tap human observation → delayed unassisted check (`Kaizen-AI/docs/ENGINE.md:99-125`).
- Source code implements a tutor-only pre-session brief that separates server-owned evidence from student-written planner context (`Kaizen-AI/web/app/api/tutoring/brief/route.js:1-32,68-156,189-257`). A tutor observation route and UI record per-concept ratings and schedule later checks (`Kaizen-AI/web/app/api/tutoring/observe/route.js:1-42,110-253`; `Kaizen-AI/web/components/TutorObserve.js:31-79,103-175`).

**Consequence:** preserve “continuity across people, sessions, and AI help” as the north star. Do not reduce the product definition to OpenMAIC, a voice/avatar layer, or a generic chat tutor. But code and owner intent are not evidence that tutors or families have this problem strongly enough to adopt or pay.

### 2. Much of the supposed differentiator is already implemented, but the human-observation semantics need repair before any mastery claim

**Status: KEEP the assets; REPAIR the evidence semantics · Confidence: high source-code confidence, behavior not run.**

Already present in Kaizen-AI:

- provenance-separated tutor brief;
- working-versus-confirmed learning state;
- tutor-facing dependency/human-recommended flags;
- structured post-session observations;
- delayed-check scheduling;
- append-only evidence and replayable estimates;
- parent/weekly-report concepts and club/session operations.

The critical issue is not absence of a human loop. It is what the loop is allowed to prove. The observation route hard-codes every tutor rating as `assisted: false` and `verifiedBy: 'human_tutor'` (`Kaizen-AI/web/app/api/tutoring/observe/route.js:163-178`) even though the API payload only captures a rating, optional misconception, and note; it does not enforce that the learner completed a no-help probe. The comments assume the tutor “watch[ed] someone work unaided,” but source does not establish that condition. The route also schedules a later check, which is good, but the human rating can already enter a confirming evidence class.

The later trellis repository has the safer boundary: practice never certifies, tutoring records exposure, and only a restricted assessment service can append qualifying evidence (`trellis/README.md:8-27`; `trellis/lib/tutor/assessment/service.ts:67-105,151-211,214-249`). Its weekly report counts only independently certified skills (`trellis/lib/tutor/report/lead.ts:1-13,40-59`). However, its current spec explicitly excludes human tutoring inside v1 (`trellis/docs/product/spec.md:26-35`).

**Consequence:** do not recommend rebuilding briefs, recaps, evidence ledgers, or delayed-check primitives. Reconcile the existing Kaizen-AI coordination loop with trellis’s stricter assessment boundary. A tutor observation should be contextual evidence and a scheduling signal unless an explicit no-help protocol was actually followed; the delayed independent check should carry the learning claim.

### 3. Component features are already commoditized; the practical competitor is an assembled stack

**Status: RETIRE “general AI tutor” and “all-in-one tutoring CRM” as the differentiating wedge · Confidence: high on current feature availability, medium on buyer substitution.**

Current primary product pages show:

- TutorBird already combines student records, scheduling, attendance, progress notes, homework/file sharing, billing, multi-tutor administration, and a parent/student portal [1].
- TutorCruncher already combines scheduling/matching, payments/payroll, tutor management, lesson tracking, and business analytics [2].
- Google Classroom already coordinates classes, assignments, grades, real-time feedback, guardian summaries, and teacher-created AI study guides/tutors using Gemini Notebook and Gems [3].
- ChatGPT Study Mode is globally available across plans, accepts course materials, asks questions, explains step by step, quizzes, and can use memory for personalization [4].
- Gemini Guided Learning asks probing questions, breaks work into steps, includes quizzes and multimodal material, and can be shared through Google Classroom [5].
- Khanmigo markets a guided, answer-resistant tutor across Khan Academy content, with parent access and school/district delivery [6].

Vendor pages establish availability, not efficacy. They do show that “planner + chat + portal + scheduling” is not a sufficient category claim. The user’s alternative is likely some combination of an LMS/calendar/messaging tool, a tutoring operations product, the tutor’s own notes, and a horizontal AI assistant.

**Consequence:** the pilot must test whether shared context, assistance provenance, and delayed independent evidence create enough incremental value to displace or sit above that stack. It should not test whether people like AI chat.

### 4. Human tutoring has strong causal evidence; borrowing that effect for an AI or coordination product would be invalid

**Status: KEEP human tutoring as the delivery anchor; RETIRE parity marketing · Confidence: high.**

The peer-reviewed 2024 meta-analysis reports a pooled effect of **0.288 SD** across randomized tutoring field experiments, with larger effects for teachers/paraprofessionals, earlier grades, at least three sessions per week, and in-school delivery [16]. The older 2020 working-paper version reported **0.37 SD** [7]. These are different versions and must not be mixed.

The intervention is human one-to-one or small-group tutoring across heterogeneous programs. It does not establish that an AI tutor, a tutoring workflow tool, an after-school club, or this product will produce the same effect. It also does not make a small private tutoring pilot equivalent to the frequent, structured programs with the largest effects.

**Consequence:** human tutoring is an evidence-supported anchor and plausible distribution channel. “Human-tutor parity,” “2-sigma,” or a borrowed pooled effect is not a beta objective or marketing claim. Any eventual causal statement requires a comparative study of the actual product, actual population, dose, assessment, attrition, and uncertainty.

### 5. AI tutoring evidence is design- and setting-dependent; assisted completion can move opposite to independent performance

**Status: KEEP strict assistance separation and delayed assessment · Confidence: high.**

The strongest warning comes from a randomized field experiment with nearly 1,000 Turkish high-school math students over four 90-minute sessions. Standard GPT access increased assisted-practice grades by 48%, but the same arm scored 17% lower than control on a subsequent closed-resource exam; a teacher-grounded, hint-oriented tutor raised practice performance without a positive unassisted-exam effect [8]. The exam followed within the same session and used highly similar problems, so this is not evidence about long-term retention. It is still direct evidence that practice success and unaided performance can diverge.

Other studies show promise but do not erase that distinction:

- Tutor CoPilot randomized more than 700 tutors serving 1,013 grades 3–6 students and reported a 4 percentage-point increase in lesson exit-ticket mastery, with larger gains for lower-rated tutors [9]. The primary published analysis shifted from end-of-year MAP outcomes to available session-level outcomes because exposure was inconsistent (`tutor-copilot.txt:548-608`). Exit tickets are immediate progression measures, not delayed retention. This supports **AI shadow-work for humans**, not autonomous replacement or broad efficacy.
- A two-year cluster-randomized Khanmigo study in 18 Tennessee middle schools reported about 0.06–0.08 SD over a school year, while noting that results resembled Khan Academy practice without AI, median use was thin, and only 17% of mistaken exercise sessions included a Khanmigo message [10]. Access is not engagement, and the study does not isolate an incremental AI effect.
- A Harvard undergraduate physics crossover RCT (`N=194`) found larger immediate post-test gains with a carefully authored AI tutor than with in-class active learning, in less time [11]. It covered two lessons in one course and did not establish delayed retention or K–12 effectiveness.
- A Nigerian randomized program combined Microsoft Copilot, teacher-guided curriculum prompts, computer labs, and twelve after-school sessions. It reported 0.23 SD on English and 0.31 SD on a combined assessment [12]. Of 1,328 assigned students, 759 completed the final assessment (`nigeria-ai-tutor.txt:366-419`); the result is for a bundled, facilitated program and an immediate endline, not unsupervised home AI.

**Consequence:** neither “AI works” nor “AI harms learning” is a responsible category conclusion. Product design, curriculum grounding, facilitator support, actual use, and outcome timing matter. The product must record help exposure, withhold answers during checks, and measure independent performance after delay.

### 6. The first user should be hypothesized as an existing tutor/operator, not assumed to be every household

**Status: PROPOSED HYPOTHESIS · Confidence: medium on strategic fit, low on demand.**

A small tutoring practice already has learners, recurring sessions, a responsible adult, and a natural need for preparation and follow-through. It can test the coordination job without first proving a tutoring marketplace, leasing a club room, selling a household AI subscription, or acquiring minors directly. The tutor/operator is the likely first user and potential buyer; the learner is the beneficiary; the parent may be payer, consent holder, and report recipient. Which party pays remains unknown.

This is narrower than trellis’s “one household account, every age” intent (`trellis/docs/product/spec.md:26-35`) and the Kaizen-AI club offer (`Kaizen-AI/README.md:1-25`). It is chosen for falsifiability, not because desk research established the market.

**Consequence:** interview and pilot with operators who already serve recurring students. If their current prep/follow-up burden is trivial or their existing stack is sufficient, reject the wedge rather than broadening the product to “everyone.”

## What each snapshot actually contributes

| Snapshot | Documented/current contribution | Source-backed maturity | Keep / repair / retire / unknown |
|---|---|---|---|
| **Kaizen-AI** | Human academic club plus AI companion; tutor briefs, session observations, scheduling, parent context, evidence engine, working/confirmed split | Substantial source implementation; claims matrix itself says club operation/sales are gated and some mastery claims are partial (`docs/CLAIMS_MATRIX.md:42-53,69-91,103-117`) | **Keep** coordination assets. **Repair** assisted status and evidence semantics. **Unknown** real usability, demand, deployment and outcomes. |
| **trellis** | Household AI tutor and “honest record”; practice/assessment separation, exposure ledger, delayed qualification, parent report | Stronger source-level assessment boundary and tests; spec says design draft and excludes in-product human tutoring from v1 (`docs/product/spec.md:7-35`) | **Keep** evidence boundary. **Repair/reopen** human loop if owner confirms it remains core. **Unknown** demand and efficacy. |
| **KaizenEdu** | OpenMAIC-derived course-generation and interactive-classroom system; agent workbench, durable course-building sessions, uploads, slides, quizzes, interactives and AI teachers/classmates (`docs/OPENMAIC-README.md:45-55,70-76`) | Large implementation, but its documented center is authoring/delivery of generated learning experiences, not longitudinal tutor coordination or independent mastery | **Keep as candidate capability/component.** **Retire** the inference that multi-agent presentation or an avatar proves tutoring quality. |
| **Tutornat** | README only: repository name and a model label (`README.md:1-3`) | No product evidence in the pinned tree | **Unknown.** Do not infer a tutor product from the name. |

### Existing capabilities not to duplicate

1. Provenance-separated tutor brief and structured engine snapshot in Kaizen-AI.
2. Per-concept post-session rating UI and API in Kaizen-AI.
3. Working-versus-confirmed state, assistance dose, delayed scheduling and append-only evidence in Kaizen-AI.
4. Restricted assessment service, frozen items/keys, exposure latching, nonqualifying practice and independent parent-report projection in trellis.
5. OpenMAIC course/material generation, interactive content, durable authoring sessions, uploads, quizzes and multimodal delivery.
6. Club/session/parent/learner operational surfaces already represented in Kaizen-AI.

Any implementation proposal should begin by reconciling these assets and their incompatible product assumptions, not by producing another chat page, tutor recap, evidence table, or course generator.

## Current alternatives and substitution risk

| Alternative | What it already solves (primary source, checked 2026-09-30) | Maturity signal | Gap relative to the hypothesis | Strategic consequence |
|---|---|---|---|---|
| **TutorBird** | Tutor CRM, calendar/attendance, detailed notes, student progress, homework/files, billing, multi-tutor access and family portal [1] | Established vendor; usage/review claims are vendor-reported | No source-backed delayed independent learning record or cross-AI assistance provenance found on the checked page | Benchmark/operator complement; do not compete on admin checklist alone. |
| **TutorCruncher** | Scheduling/matching, recurring sessions, tutor management, payments/payroll, lesson records and business analytics [2] | Established multi-operator product; customer counts are vendor claims | Optimizes tutoring operations and business metrics, not demonstrated independent learning across human and AI support | A likely incumbent stack for larger practices; pilot must show pedagogical continuity value above it. |
| **Google Classroom + Gemini** | Assignments, grades, feedback, guardian summaries, progress tools, AI study guides/tutors and class materials [3] | Mature institutional platform | School-account/admin context; not a neutral record spanning an outside tutor, home AI use and delayed independent checks | Strong bundled substitute in schools; avoid school-first without a specific unmet job. |
| **ChatGPT Study Mode** | Guided questioning, stepwise explanation, quizzes, uploads, syllabus/notes use and optional memory [4] | Globally available horizontal assistant | No checked claim of a tutor-owned evidence ledger, verified assistance status, or delayed independent measurement | Baseline alternative every pilot participant can already use. |
| **Gemini Guided Learning** | Probing questions, adaptive steps, multimodal responses, quizzes and Classroom sharing [5] | Global platform feature | Vendor learning-design claims, no outcome evidence on the checked product page; no external human-tutor continuity loop | Another low-friction baseline; “Socratic AI” is not differentiation. |
| **Khanmigo** | Guided tutor integrated with Khan Academy exercises/content, parent accounts and district delivery [6] | Deployed and independently studied | Independent trial finds modest school-year gains, low substantive use, and no isolated AI increment [10] | Closest education-specific AI benchmark; reinforces the need to measure actual use and incremental value. |
| **OpenMAIC (internal candidate)** | Generated courses, slides, quizzes, simulations, PBL, AI teachers/classmates and an authoring agent | Implemented component in the snapshot | No source evidence of longitudinal cross-session coordination or delayed independent learning outcomes | Use only if a validated job needs richer materials; do not define the product around it. |

The competitive question is therefore not “Can this generate hints, quizzes, notes, or schedules?” It is: **will an existing tutor and learner use a shared evidence-aware workflow often enough, and does it reduce work without disguising assistance as learning?**

## Learning evidence and what it permits

| Evidence | Population / intervention / control | Outcome | What it supports | What it does **not** support |
|---|---|---|---|---|
| Human tutoring meta-analysis [16] | Randomized preK–12 tutoring field experiments; heterogeneous tutors, grades, doses and settings | Final pooled effect 0.288 SD; larger in some structured/frequent settings | Human tutoring is a credible delivery anchor | This product, AI tutoring, after-school-only delivery, or human parity. |
| Tutor CoPilot [9] | >700 tutors; 1,013 grades 3–6 students in a U.S. district; tutor access randomized | +4 pp on lesson exit-ticket mastery; +9 pp for lower-rated tutors | Real-time AI suggestions may improve novice human tutoring and are a relevant shadow-work model | Delayed retention, autonomous tutoring, experienced tutors, or broad standardized-test gains; initial MAP outcome was not the main reported result after inconsistent exposure. |
| Bastani et al. [8] | Nearly 1,000 Turkish high-school math students; class-randomized control vs standard GPT vs teacher-grounded hint tutor; four sessions | Assisted practice +48% / +127%; standard GPT −17% on subsequent unassisted exam; guarded tutor approximately control on unassisted exam | Assisted performance must be kept separate; guardrails and teacher-grounded content matter | Long-term harm or benefit; exam was same-session and near-transfer. |
| Khanmigo trial [10] | Two-year cluster RCT, 18 Tennessee middle schools, existing remedial math sessions | 1.3 national percentile ranks per term; roughly 0.06–0.08 SD annually | Deployment and engagement are binding constraints; modest field effects are possible | A unique Khanmigo effect versus Khan Academy practice; unsupervised household efficacy. |
| Kestin et al. [11] | 194 Harvard physics students; two-lesson crossover, authored AI tutor vs active-learning class | Larger immediate post-test gains in less median time | Purpose-built AI can outperform a strong classroom comparison on short-horizon outcomes | K–12 generalization, longitudinal use, delayed retention or broad subject coverage. |
| Nigeria program [12] | 1,328 first-year secondary students assigned; 759 final assessments; 12 teacher-guided after-school sessions | 0.23 SD English; 0.31 SD combined English/AI/digital outcome at endline | Facilitated, curriculum-aligned AI programs can produce gains in a low-resource setting | A pure chatbot effect, home self-use, no-human delivery, or durable retention. |
| Learning vs performance review [13] | Integrative review of motor and verbal learning research | Performance during/acquisition can dissociate from durable retention and transfer | Immediate fluent performance is not sufficient as the primary learning metric | A product-specific effect size or exact check interval. |
| Retrieval practice experiment [14] | Experiment 1: 120 U.S. undergraduates learning prose; restudy vs free recall; 5 min, 2 days, or 1 week | Restudy won immediately; prior testing produced better delayed retention | Include delayed independent retrieval and report timing | Direct transfer to procedural math, minors, or an AI product. |
| Feedback meta-analysis [15] | 435 educational studies, ~61,000 participants, 994 effects | Mean `d=0.55`; after extreme-value removal `d=0.48`; 17% negative and very high heterogeneity; high-information feedback larger than simple reinforcement/correction | Feedback should be specific, informational, and evaluated, not assumed beneficial | “Any feedback works,” a universal effect, or permission to use praise/engagement as learning outcomes. |

### Required measurement principles

1. **Primary outcome:** performance on unfamiliar, independently authored or licensed parallel items with no tutor, AI hint, worked answer, or answer-key access.
2. **Timing:** one check at 48–72 hours and a second around day 7. Report immediate assisted work separately; it never earns the same label.
3. **Scoring independence:** the model that teaches should not author and grade its own evidence. Use fixed keys/rubrics and blinded human scoring where needed.
4. **Assistance provenance:** record hints, answer exposure, human help and item familiarity at the skill/attempt level. “Unassisted” means no assistance observed under the protocol, not proof that another device/person was absent.
5. **Transfer:** include at least one unfamiliar application, not only a near-copy of a practiced item.
6. **Missingness:** report who was invited, started, received the intended dose, completed each follow-up, and why data are missing. Check adherence is a product outcome, not an inconvenience to delete.
7. **Human observation:** compare tutor ratings with later independent checks. Estimate calibration/reliability before allowing observations to certify anything.
8. **Feedback quality:** distinguish answer-giving, correctness-only, process feedback, misconception diagnosis and self-regulation support. “Messages sent” and generic praise are not learning metrics.
9. **No borrowed effects:** no estimate from the studies above becomes a target or claim for this product.

## Narrow pilot hypothesis — unapproved

### User, job and claim

> **For small independent secondary-math tutoring practices with recurring students, an evidence-aware human+AI continuity workflow will reduce tutor preparation/follow-up work and improve the reliability of knowing what a learner can do independently, without reducing delayed unassisted performance, compared with the practice’s current tools and normal tutoring workflow.**

This is deliberately about an existing tutoring relationship, not tutor discovery, course generation, school procurement, an in-person club, or replacing the tutor.

- **Primary user:** tutor/operator in a solo or small practice.
- **Learner:** an existing recurring pre-Algebra/Algebra I student, initially 13–17 for a bounded cohort.
- **Payer:** unknown; test operator versus parent willingness later, without making a pricing decision here.
- **Core job:** prepare from trustworthy context, conduct a focused session, hand off useful between-session work, and know later what stuck without confusing help with mastery.
- **Distribution hypothesis:** recruit through existing tutors/practices, who invite current families. This avoids treating the owner’s own use as adoption and avoids building a marketplace before the workflow is validated.

### Proposed first evaluation

This is an evaluation specification, not a feature design.

- **Cohort:** screen roughly 12–15 tutors; proceed only if at least 5 tutors enroll at least 3 current recurring students each. Aim for 18–24 learners in one bounded math skill band.
- **Length:** 2-week business-as-usual baseline plus 6 weeks of the coordinated workflow.
- **Comparison:** if consent and operations permit, randomize students within each tutor to early versus delayed entry for a short concurrent comparison; report spillover risk because tutors may carry new practices to control students. If randomization is not feasible, label all learning results descriptive and do not make causal claims.
- **Workflow being tested:** existing course/assignment context; provenance-labelled pre-session brief; normal human tutoring; structured post-session observation; constrained between-session AI help with exposure logging; 48–72-hour and around-day-7 independent checks. This names the testable loop, not a final interface.
- **Assessment:** pre-specified, independently reviewed parallel items, fixed scoring, a near-transfer and unfamiliar-transfer item, no hints, and no self-certification by the tutor or teaching model.

### Metrics and pre-specified decision rules

| Dimension | Measure | Continue signal | Falsification / stop-or-change signal |
|---|---|---|---|
| Recruitability | Qualified tutors and existing families who complete consent/onboarding | ≥5 tutors and ≥15 learners begin without founder-only exceptions | Fewer than 5 tutors after 12–15 qualified conversations, or family onboarding blocks >50% of eligible students |
| Tutor workflow adoption | Brief opened before session; observation submitted within 24h | Each occurs for ≥70% of eligible sessions, across at least 4 tutors | Either occurs in <50% of sessions after week 2, or use is concentrated in one enthusiastic tutor |
| Tutor time | Logged prep + follow-up minutes/student/week, baseline versus pilot | Median reduction ≥20%, with no tutor adding >10 minutes/student/week | Median work is unchanged/increased, or savings depend on uncounted founder/manual labor |
| Check feasibility | Eligible 48–72h and day-7 checks completed unassisted under protocol | ≥60% and ≥50%, respectively; ≥90% of attempts classifiable for assistance | <50% complete the first check, <40% complete day 7, or >10% of attempts have ambiguous help exposure |
| Learning guardrail | Accuracy on unfamiliar independent items; assistance dose reported separately | No meaningful adverse direction; exploratory positive estimate reported with interval | Stop the affected workflow if the pilot estimate is ≥0.20 SD or ≥10 percentage points worse than concurrent/usual-work comparison, or a consistent decline appears across tutors; investigate before continuing |
| Observation validity | Agreement/calibration between tutor rating and later independent check | Useful calibration with uncertainty; discrepancies lead to better scheduling | Ratings systematically overstate independent performance, or reliability is too low to support learner claims |
| Ongoing pull | Voluntary continuation with real tutor operating commitment after the study | ≥4 of 5 tutors continue for another month and keep using the full loop | Fewer than 3 continue, or they want only generic chat/admin features already available elsewhere |
| Safety/trust | Incorrect items, misleading mastery labels, privacy/safety incidents | All incidents logged; no unresolved high-severity event | Any qualifying-evidence path exposed to answers; repeated wrong items; misleading report; or serious privacy/safety event pauses the pilot |
| Cost | Model/voice, item review, support and human-ops cost per active learner/week; tutor minutes saved | Transparent cost with no dominant hidden manual process | Unit cost cannot be measured, item review is unsustainable, or value exists only with unpaid founder labor |

Thresholds above are proposed go/no-go rules, not research-derived constants. They should be accepted or changed **before** the pilot, not after results are visible. A sample this small can establish feasibility, workflow pull, measurement integrity and obvious harm signals; it cannot establish a precise population effect or human-tutor parity.

### What would falsify the core product direction

Reject or materially change the continuity-layer hypothesis if any of these repeat across participants:

1. Tutors report that pre-session context loss and follow-up are not material jobs, or their existing CRM/LMS already solves them.
2. Tutors use scheduling/billing but ignore learning briefs, structured observations and delayed evidence.
3. Learners accept AI help but do not return for independent checks, leaving the “honest record” structurally empty.
4. Assistance provenance cannot be classified reliably in normal home use.
5. Tutor observations do not predict later independent performance and create false confidence.
6. The workflow reduces tutor time only by shifting substantial work to parents, students, reviewers or the founder.
7. Immediate completion improves while delayed independent performance worsens.
8. Practices want a generic AI chat or CRM feature rather than the integrated evidence loop; established alternatives are then the rational answer.
9. Recruiting an existing-tutor cohort is harder or more expensive than the value signal supports.

## Keep / repair / retire / unknown

### Keep

- The owner’s broad north star: learner + human tutor + AI shadow-work + longitudinal evidence.
- Kaizen-AI’s provenance-separated pre-session brief and tutor-context model.
- Working-versus-confirmed separation, assistance logging, delayed checks and append-only evidence.
- Trellis’s restricted assessment boundary and nonqualifying practice classes.
- OpenMAIC’s authoring and interactive-material capabilities as optional components when a validated workflow needs them.
- Human agency: AI suggestions to a tutor are more directly supported than replacing the tutor [9].

### Repair before claims

- Do not automatically label every tutor rating `assisted=false`; capture or run an actual independent probe.
- Do not let a human observation alone become a learner-facing mastery claim; use it to route/schedule and corroborate with delayed independent evidence.
- Reconcile Kaizen-AI’s human/club model with trellis’s household/no-human-v1 model before choosing a foundation.
- Separate vendor/product analytics, immediate practice, tutor judgment, delayed retention and transfer in every report.
- Resolve version drift in evidence citations; use the final tutoring meta-analysis estimate, not a mixed preprint/final number [7][16].

### Retire as first-pilot assumptions (not necessarily delete code)

- “Everyone, every age” as a launch audience.
- A generic chatbot, avatar, voice layer or multi-agent classroom as the product definition.
- Tutor marketplace/discovery, in-person club operations, and household subscription as prerequisites to testing the continuity job.
- Engagement, messages, streaks, assisted grades, self-report, or AI-authored narrative as mastery.
- Human-tutor-parity and borrowed effect-size marketing.

### Unknown — requires people or real operation, not more desk research

- Whether tutors feel enough coordination pain to change workflow.
- Which party owns the budget and what commitment indicates willingness to pay.
- Whether students complete delayed checks without repeated prompting.
- Whether parents value evidence honesty when it reports “not yet confirmed.”
- Whether the brief is accurate, fast and trusted in a real 90-second preparation window.
- Whether source imports and assistance exposure are reliable across the actual tools students use.
- Item-authoring/review cost, model cost, tutor support cost and all-in cost per active learner.
- Whether the first subject/age band should remain secondary mathematics after interviews.

## Hype and unconfirmed-claim register

1. **“AI tutor” is not a learning result.** ChatGPT, Gemini, Khanmigo and OpenMAIC feature pages describe design intent; efficacy must come from independent outcomes.
2. **Immediate mastery is not delayed learning.** Tutor CoPilot exit tickets, Kestin post-tests and Bastani’s same-session exam answer different questions from week-later retention.
3. **Human observation is not automatically unassisted.** The current Kaizen-AI route assumes the condition it needs to measure.
4. **“Strongest signal” is an internal assertion.** Human tutors can add context, but observation validity and inter-rater calibration have not been shown for this product.
5. **Confirmed mastery is content-bounded.** Kaizen-AI’s own claims matrix says the current confirmed path is limited in subject coverage and some claims are partial (`docs/CLAIMS_MATRIX.md:103-117,165-174`).
6. **A software pass is not efficacy.** Database constraints and tests can prevent known false-credit paths; they cannot prove that students learned.
7. **Demand has not been established yet.** Repository breadth, owner use, code completeness, a club concept, and vendor market size are not adoption evidence.
8. **Do not quote “2-sigma.”** The relevant peer-reviewed human-tutoring synthesis is 0.288 SD overall [16], not a promise for this product.
9. **Do not mix study versions.** The older Nickow working paper reports 0.37 SD [7]; the final journal record reports 0.288 SD [16].
10. **Do not transfer bundled-program effects.** Nigeria’s result included guided prompts, teachers, labs and scheduled sessions [12]; Khanmigo ran inside school remediation [10].

## Owner-only questions

1. Is the first product meant to **strengthen tutors who already have students**, or to **deliver/sell tutoring itself**? The report recommends testing the former first.
2. Is the original human-tutor continuity loop still non-negotiable, even though the latest trellis v1 explicitly removes human tutoring from scope?
3. Will the owner accept that tutor observations do not certify mastery unless an actual no-help probe was observed and later corroborated?
4. Which real operator access exists for discovery: independent tutors, a small practice, or an Austin club cohort? Owner use alone cannot answer demand.
5. Is the owner willing to keep efficacy language out of marketing until an actual comparative evaluation exists, even if the source engine and tests are strong?

## Scope, runs and gaps

### Inspected

- Shared `BRIEF.md`, `PLAN.md`, `EXECUTION_PLAN.md` and `source-manifest.json`.
- Product/context and relevant strategy/research roots in all four pinned snapshots.
- Targeted Kaizen-AI tutor brief, observation, evidence-engine and claims paths.
- Targeted trellis assessment/exposure/report and current product-spec paths.
- OpenMAIC role in KaizenEdu and the complete current Tutornat README.
- Current primary pages for tutor operations, classroom coordination and AI study tools.
- Original/review learning evidence listed above.

### Actually ran

- `git rev-parse HEAD` and `git status --short` for all four snapshots: all matched expected commits and were clean.
- Generic web searches and primary-page extraction; public PDFs were downloaded and converted to text for exact checking.
- Dedicated grounded-citation ledger creation, exact evidence-quote attachment and citation verification in `/Users/man/education-product-discovery/evidence/product-learning/ledger.json`.

### Deliberately not run or not covered

- No source tests, app launch, browser workflow, CI rerun, dependency install, migration, provider/API call, production inspection or real-user test. Existing-test execution belongs to the reliability role under the approved plan.
- No exhaustive branch/history archaeology, UX/accessibility audit, security/privacy/legal certification, pricing research, or unit-economics model.
- No claim of exhaustive competitor coverage; this pass covers representative current substitutes by job.
- No validation of market demand, willingness to pay, learning efficacy, check adherence or tutor-observation reliability.
- Some journal/vendor pages rate-limited direct extraction; accessible publisher, government index, public full text or author/working-paper sources were used and version differences are disclosed.

## Sources

[1] https://www.tutorbird.com — TutorBird — tutor management software
[2] https://tutorcruncher.com/us — TutorCruncher — tutoring management software
[3] https://support.google.com/edu/classroom/answer/6020279?hl=en — Google Classroom — About Classroom
[4] https://help.openai.com/en/articles/11780217-using-study-mode-in-chatgpt — OpenAI — Using study mode in ChatGPT
[5] https://blog.google/products-and-platforms/products/education/guided-learning — Google — Guided Learning in Gemini
[6] https://www.khanmigo.ai/learners — Khan Academy — Khanmigo for learners
[7] https://www.nber.org/papers/w27476 — Nickow, Oreopoulos & Quan — Tutoring meta-analysis
[8] https://pmc.ncbi.nlm.nih.gov/articles/PMC12232635 — Bastani et al. — Generative AI can harm learning
[9] https://edworkingpapers.com/sites/default/files/ai24_1054_v2.pdf — Wang et al. — Tutor CoPilot
[10] https://edworkingpapers.com/sites/default/files/ai26-1551.pdf — Oreopoulos & Low — One Click Away: Khanmigo trial
[11] https://www.nature.com/articles/s41598-025-97652-6 — Kestin et al. — AI tutor compared with active learning
[12] https://documents.worldbank.org/en/publication/documents-reports/documentdetail/099548105192529324 — De Simone et al. — From Chalkboards to Chatbots
[13] https://doi.org/10.1177/1745691615569000 — Soderstrom & Bjork — Learning Versus Performance
[14] https://doi.org/10.1111/j.1467-9280.2006.01693.x — Roediger & Karpicke — Test-Enhanced Learning
[15] https://pmc.ncbi.nlm.nih.gov/articles/PMC6987456 — Wisniewski, Zierer & Hattie — Power of Feedback Revisited
[16] https://eric.ed.gov/?id=EJ1406037 — ERIC record — The Promise of Tutoring for PreK-12 Learning (AERJ 2024)
