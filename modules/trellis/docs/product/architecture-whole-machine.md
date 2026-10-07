<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: vault/40-projects/kaizenai-saas/ARCHITECTURE.md -->

---
title: Kaizen — how the whole machine works
tags: [kaizen, architecture, sync]
project: kaizenai-saas
updated: 2026-09-12
---

> Written by Astra on 2026-09-12 because Manny asked: *"you have explained to me your plan on how you plan to use Al and algorithms and mastery and feedback loops and the tech behind the the libraries for software etc… I'm. Not aware of the whole big picture at the moment. Please sync me u"* — a fair criticism: he had decided a dozen things one at a time without ever being shown the assembled machine.

**Kaizen turns tonight’s homework into help now, stronger foundations underneath, and evidence of independent learning later.** Call it the **Homework → Repair → Prove loop**.

The parent buys relief from a real problem: their child is stuck. The learner brings the assignment. The tutor helps, notices the underlying difficulty, briefly teaches that missing idea, and returns to the homework. Later, a separate assessment checks whether the learner can use the skill without help.

That connects the business you want to the educational mission you care about:

- **Homework creates the reason to come.**
- **Useful teaching creates the reason to return.**
- **Independent checks establish what stuck.**
- **An honest report shows the parent what they bought.**

Here is the assembled journey you have decided, rather than a claim that it already works:

1. **The parent subscribes.** Stripe processes the **decided $49 monthly price**, with a generous, bounded allowance. The parent owns billing and the household account.
2. **The child becomes eligible to use it.** Age, parental authority, consent and provider permissions are checked before child-data collection. You chose coverage across the under-eighteen band from launch. COPPA supplies the under-thirteen privacy requirements; teenagers have additional, distinct requirements.
3. **Homework starts the lesson.** The opening is “What are you working on?” A short attempt helps reveal the difficulty. Useful help comes immediately.
4. **A small repair happens inside the task.** The learner practices the idea behind the mistake, then tries the homework step again.
5. **Practice earns assessment priority.** It can earn a scheduled interval without teaching that particular skill—a **quiet window**. It never earns mastery credit.
6. **Independent evidence earns confirmation.** A separate service checks unfamiliar work after the required delay and follow-up. The tutor cannot award its own teaching a certificate.
7. **The parent sees the distinction.** Help delivered, practice completed, independent evidence, missing checks and the next action appear separately.

The first subject remains a focused mathematics offering around algebra and its prerequisites. Its precise coverage is conditional on the demand and learning-mechanics research. Covering younger siblings does not mean launching every subject or promising a complete elementary curriculum.

**Our position today:** meaningful tutoring software exists in the inherited repositories. The complete, trustworthy product above does not. The PM gave you individual decisions without this connecting picture; that was the missing explanation.

**A session makes the division of labor concrete.** The following is an illustrative walkthrough of the intended experience, using existing components where available.

**The learner brings a problem:** `x/3 + 2 = 5`.

They type it or submit a photo. The intake component checks the submission, extracts the mathematics and asks the learner to confirm ambiguous symbols. Homework intake code exists; the supported-topic checks and complete consent-safe path still need integration and verification.

If they speak, the browser detects speech, sends the utterance for transcription, and puts the resulting text into the same tutoring flow.

**The server checks whether the turn may proceed.** It checks the account, learner, session, consent and remaining allowance. Safety screening examines the input. The inherited engine already has an English-oriented pattern filter that can interrupt a turn and show crisis guidance. That is an existing safeguard, not a completed safety system. Reliable input and output protection across text, images and voice still needs qualification.

Your decided crisis behavior is immediate referral, clear AI disclosure, safeguards and incident records. We must not promise a live human responder within minutes.

**The tutor asks for the next step.** Suppose the learner subtracts incorrectly. The system should treat that as evidence for a possible misconception, not diagnose a permanent weakness from one answer.

The **turn controller**—the code coordinating the conversation—assembles the problem, relevant skills, recent conversation and current board. The language model proposes the explanation. The skill graph supplies the prerequisite relationships: which ideas depend on which others.

**The tutor teaches and draws.** It might ask, “What happens if we subtract two from both sides?” The model supplies words and structured board instructions. A validator checks those instructions; the board component renders them.

The intended board vocabulary is text, equations, shapes, lines and tables. It should draw approved primitives, not execute arbitrary code written by the model.

**The learner interrupts:** “Why both sides?”

Existing playback and turn-control code can cancel speech and support interruption. The model gets the question and board state, then explains the balance relationship. Speech synthesis reads the response aloud; text remains available.

**The repair stays brief.** Your accepted starting assumption is roughly **two minutes** inside the homework. The learner tries a related step and returns to the assignment. If repair is repeatedly skipped or insufficient, the parent gets a concrete request for dedicated learning time.

**The session writes down what happened.** The intended record includes the attempted step, relevant skills, help and answer exposure, practice results, uncertain misconception hypotheses, board actions, model version and usage cost. Some recording machinery exists. Complete assistance tracking across sessions does not.

A correct answer here guides teaching. It does not certify the skill. That comes later through the assessment service. [Walkthrough and homework design](</Users/mann/pm/shared/artifacts/astra-plan-20260912/wedge-replan.md>)

**Mastery is a qualification rule applied to evidence.** It must never be whatever the conversational model feels confident saying.

The decided evidence classes are:

| Evidence class | What it means | Mastery treatment |
|---|---|---|
| **Assisted help** | Homework with hints, explanations or answers | No credit |
| **Corrections practice** | Rehearsing and repairing an idea | No credit; informs teaching and assessment priority |
| **Unassisted attempt** | An independent assessment attempt | Can qualify if every condition holds |
| **Delayed retention** | A later independent demonstration | Supports the follow-up requirement |

These numerical rules are **accepted operating settings, not measured universal thresholds of human learning**:

- **Ten clean, hint-free practice repetitions** give a skill priority for a quiet window. That starting setting is explicitly adjustable from evidence.
- Each qualifying attempt must occur **at least forty-eight hours after relevant instruction on that skill**.
- Evidence must span **at least two contexts and two separate days**, with the second check **around day seven**.
- If a quiet window cannot happen within **fourteen days**, the parent must hear why and what the plan is.

Two contexts means different applications or representations of the skill. Changing the numbers in the same problem template is insufficient.

The clock belongs to the learner and skill, across sessions. Help on an unrelated skill does not restart it. Relevant hints, teaching or answer exposure do. If the learner asks for help during an assessment, provide appropriate help and permanently mark that attempt nonqualifying.

Other reasons an attempt cannot certify include an unreviewed question, missing item identity, a previously exposed problem family, an unreliable answer key, ambiguous scoring or a duplicate submission. The service must decline to certify when it lacks the necessary evidence.

The exact scoring rubric, number of items within each check, meaning of “around day seven,” and context-classification rules remain open. **The assessment-design work, RO-3, and a versioned implementation rule must close those details before release.**

The report should say things such as:

> Worked through the homework together.  
> Practiced the underlying equation skill.  
> First independent check passed; follow-up pending.  
> Another skill remains ineligible because relevant help continued.  
> Next action: take the scheduled independent check.

It must refuse to turn practice into mastery, hide missed checks, present a prediction as certainty, or claim that Kaizen caused a grade improvement. “No confirmed skills yet” is a legitimate report. Missing evidence is not proof that nothing was learned.

“Unassisted” means **no assistance observed under the stated protocol**. A home browser cannot prove that another person or device was absent. Every confirmation must link back to its supporting attempts and the rule used. [Accepted mastery contract](</Users/mann/pm/vault/40-projects/kaizenai-saas/SPEC.md>)

**The learning algorithms help choose what happens next; they do not replace that evidence contract.**

The repositories contain different approaches:

- **KaizenEdu uses a moving average:** a running estimate that gives recent correct and incorrect answers weight.
- **Kaizen-AI contains Performance Factors Analysis:** an estimate based on successes and failures; **Elo-style matching:** choosing difficulty relative to learner performance; and **half-life regression:** estimating when another review may be useful.

These are existing code, not a single integrated or validated algorithm suite for the new product. Kaizen-AI’s own documentation calls its scheduler a placeholder.

The final scheduling and estimation choice remains open. We can reuse the interfaces and test candidates against real outcomes. Whatever predicts the next useful exercise, **only the independent assessment rules may certify**. [Inherited algorithm boundary](</Users/mann/pm/shared/repos/Kaizen-AI/docs/ENGINE.md>)

**The feedback loops change different things, with different authority.**

| Loop | What it changes | Automation and present status |
|---|---|---|
| **Learner → tutor** | Next hint, explanation, pace or representation | Automatic adaptation partly exists. The homework-repair journey needs completion and testing. |
| **Assessment → skill graph** | Evidence attached to each skill, next practice and check eligibility | Intended to run automatically under fixed rules. Existing updates are unreliable; the trusted path must be written. Curriculum relationships remain human-controlled. |
| **Cohort → content** | Confusing questions, ineffective explanations and useful repair patterns | A cohort is a group enrolled together. Human-reviewed improvement is proposed; no demonstrated operating loop yet. Changed items require fresh approval. |
| **Evaluations → model routing** | Which permitted model handles each job | Evaluation scripts exist. A benchmark suite for the new product and human approval of route changes remain to be established. No autonomous production switching is decided. |
| **Incident → safety** | Immediate intervention, then filters, prompts, controls and runbooks | Basic detection/referral code exists. Durable incident handling and human-reviewed improvements remain incomplete. |

This is how the product can improve without silently changing what “mastery” means.

You withdrew **“the learner needs us less”** as the governing metric because optimizing it could reward losing the learner. No replacement north star is settled. We must instrument learning, return, assistance, missed assessments, parent effort and cost before selecting one.

A later comparison study can test whether Kaizen caused additional learning. The independent before-and-after assessment approach is decided; licensing, comparable forms and scoring still need work. Human-tutor parity remains an ambition, not a launch requirement or marketing claim. [Measurement decisions](</Users/mann/pm/vault/30-decisions/ADR-0043-the-learner-needs-us-less.md>)

**The stack is conventional software around a carefully restricted AI tutor.** These are source-verified inherited choices; they are not evidence that the extracted deployment works.

| Layer | Existing choice and remaining work |
|---|---|
| **Website and server** | TypeScript, Next.js and React. Tailwind styles the interface; Radix supplies interface controls; Zustand/Immer manage screen state. Mobile-first web/PWA—an installable website—is decided. |
| **Database** | PostgreSQL through the `pg` library, with Neon as the inherited managed host. New database migrations and restricted assessment permissions must be built. |
| **Hosting** | Vercel is the inherited deployment target. The extracted production build and separately restricted assessment execution remain to be proven. |
| **Login** | Custom account/session code using Node’s cryptography tools, protected cookies and hashed passwords/tokens. Clerk is not the implemented login system. Verified age/parental-consent integration remains open. |
| **Payments** | The `stripe` library, checkout, subscription and payment-notification code exist. The decided plan and measured allowance need integration. |
| **Voice** | Silero speech detection through `@ricky0123/vad-web` and `onnxruntime-web`. OpenAI Whisper transcription and OpenAI speech-generation adapters exist. Final speech suppliers/models remain subject to qualification. |
| **Whiteboard** | Custom tutor actions/reducer, inherited OpenMAIC rendering and KaTeX for equations. Part of the renderer has unresolved licensing provenance; reuse versus a bounded replacement remains open. |
| **Models** | Vercel AI SDK (`ai`) and provider adapters exist. OpenAI/Anthropic are candidates; exact production routes remain open pending terms, safety, quality, latency and cost checks. |
| **Email and jobs** | Resend sending code and a Vercel weekly schedule exist. A durable outbox—a database list of work that survives crashes—and reliable retries are researched requirements, not completed machinery. No queue library is settled. |

**No Google model routes survive extraction.** The inherited tutor defaults are Gemini; the accepted decision removes them. The published Gemini terms restrict applications directed toward or likely accessed by minors. [Google terms](https://ai.google.dev/gemini-api/terms)

The extraction decision is to preserve a runnable tutoring slice and its necessary dependencies. It does not authorize importing the whole classroom/editor system. The separate assessment authority is decided; its exact hosting and implementation follow the extraction design. [Stack and extraction findings](</Users/mann/pm/shared/artifacts/kaizen-research/07-extraction-boundary.md>)

**Content comes from Oak and the commercially reusable edition of Illustrative Mathematics.** That source direction is settled; acquisition and release approval remain work.

Oak’s eligible material uses the Open Government Licence. IM’s **first edition** at Kendall Hunt permits commercial reuse under Creative Commons Attribution; newer editions have different restrictions. Attribution and resource-specific exceptions still matter. [Oak licence](https://www.thenational.academy/legal/terms-and-conditions-api-version), [IM edition terms](https://illustrativemathematics.org/terms-of-use/)

Eligible content has a **researched $0 royalty route**, and Oak documents a **$0 API fee**. Human selection, conversion, final checking and hosting still cost money. Authenticated Oak retrieval and IM teacher-solution access were not completed by the research. [Oak API](https://open-api.thenational.academy/docs/about-oaks-api/api-overview)

A named human must approve the final displayed question and its scoring. Publisher review helps; it does not prove our import preserved the mathematics. Assessment answers stay outside learner and tutor payloads. Publicly available materials also cannot be treated as secret examinations.

**The money currently rests on estimates, not a measured learner-hour.**

The earlier planning scenario assumed workloads and supplier rates that produce:

| Expense per learner-hour | Estimated cost |
|---|---:|
| Tutoring model | $0.168 |
| Safety model | $0.048 |
| Grading model | $0.105 |
| Speech recognition | $0.120 |
| Speech generation | $0.270 |
| **Total model and voice cost** | **$0.711** |
| **With assumed 30% contingency** | **$0.924** |

Those are illustrative calculations, not current vendor quotes or bills. They exclude hosting, payments and human operations. Voice is the largest part of this particular scenario; it must be measured separately from text.

Existing code records usage quantities and computes charges from a configured price table. Its fallback prices explicitly are estimates. **RO-4—the model and voice benchmark—must replace assumptions with observed consumption, qualified prices and actual latency**, including retries, interruptions and failed calls. [Cost scenario](</Users/mann/pm/shared/artifacts/astra-plan-20260912/kaizen-second-opinion.md>)

Your settled business choice is the **$49 single tier**, maximum practical use, at cost or a bounded small loss. You fund fixed costs.

The recorded cap rule allows **20% variable-cost overage**. Calculated from that decided rule, delivery spend may reach **$58.80 per family-month**, implying **$9.80 variable loss** at the limit. The allowance must include all variable delivery costs, not just model calls, and remain effective when requests overlap.

One correction: the earlier note’s “roughly thirty hours at cost” does not follow from its hourly estimate. **Thirty hours at the assumed $0.711 costs $21.33 before other expenses.** We do not yet have a defensible hours allowance.

The final cap requires RO-4 measurement. Household accounts and broad age coverage also do not settle how many learner seats the base subscription includes; that remains a plan-definition detail. Launch-cohort protections remain in the pricing decision. [Current pricing decision](</Users/mann/pm/vault/30-decisions/ADR-0047-kaizen-price-two-tiers.md>)

**The present mastery engine can confirm learning falsely.** RO-5 reproduced seven defect classes:

1. **Invented assessments:** tutor-generated questions and even incorrect answer keys can produce confirmed mastery.
2. **Premature timing:** the code confirms after a **measured twenty-four-hour boundary**, against the **decided forty-eight-hour minimum**.
3. **Forgotten help:** another session, a later check or untagged teaching can make recent assistance disappear.
4. **Practice leakage:** assisted successes can build the score used to reach confirmation.
5. **Double counting:** simultaneous submissions or a crash followed by retry can count one attempt twice.
6. **Repeated material:** the same question or near-identical family can masquerade as independent evidence.
7. **Help during grading:** assistance arriving while a result is being processed can be missed.

These were executions of inherited application code in an isolated test setup. Database tests used SQLite adaptation; production PostgreSQL permissions and concurrency were **not verified**. The failure reached actual parent-report functions, so this is a customer-facing claim defect. [RO-5 evidence](</Users/mann/pm/shared/artifacts/kaizen-research/06-evidence-integrity.md>)

Other substantial gaps remain:

- **Content:** the audit counted **118 inherited items and zero with complete human-review fields**.
- **Consent:** existing code can create child information before genuine verified consent. The verification method and implementation remain open.
- **National launch:** research has not established legal or provider clearance. Payment alone does not establish the required consent process. [Parental-consent rule](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-312/section-312.5)
- **Operations:** email is recorded as unconfigured; reliable delivery and the complete paid-family journey need proof.
- **Extraction:** no verified extracted release exists in the reviewed evidence. Board provenance, production packaging and speech-detection assets need resolution.
- **Security:** exposed credentials require verified rotation.
- **Learning:** no measured Kaizen efficacy or completed improvement loop establishes the product’s educational claim.

These change the timeline. We cannot treat the remaining work as interface polish followed by admitting children. A calendar commitment is unsupported until the evidence, consent, content, provider and deployment gates close. Independent learning also takes real elapsed time to observe.

**The work order is short.** Content, consent and provider qualification start alongside extraction; their external dependencies must not hold up safe work with synthetic learners.

1. **Extract the usable tutor.** Preserve the useful conversation, voice and board behavior; resolve licensing and credentials.
2. **Make the record trustworthy.** Separate assessment authority and independently reproduce closure of every false-mastery class.
3. **Finish household operation.** Approved content, verified consent, permitted providers, billing, reports, safety and durable jobs.
4. **Prove the complete journey.** Mobile testing, real database enforcement, reliable delivery and measured cost determine the allowance.
5. **Run the decided ten-family beta.** Observe useful help, voluntary return, parent effort and independent checks—including failures and missing results.
6. **Improve from evidence, then expand.** Validate assessment and teaching changes, run the planned comparative research, and widen curriculum when the existing loop earns it.

Sequence update 2026-09-12 20:57 CDT: [ADR-0053-kaizenedu-engine-first-preserve-both](../decisions/ADR-0053-kaizenedu-engine-first-preserve-both.md) chooses KaizenEdu, preserves both attempts and puts engine verification before full frontend then backend architecture. [ENGINE-FIRST-PLAN](engine-first-plan.md) governs next work; the preceding assembled design is context, not implemented status.
