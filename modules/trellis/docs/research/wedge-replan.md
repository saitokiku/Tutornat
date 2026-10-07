<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: shared/artifacts/astra-plan-20260912/wedge-replan.md -->

## W1 — What changes in the SPEC

- [verified] **Homework-first is settled; algebra readiness remains conditional; human-tutor parity is an ambition.** Sources: [chosen motion](/Users/mann/pm/vault/10-notes/202609121555-manny-homework-is-the-hook-understanding-is-the-mission.md), [conditional subject](/Users/mann/pm/vault/10-notes/202609121548-manny-k1-algebra-readiness-conditional.md), [ADR-0041](/Users/mann/pm/vault/30-decisions/ADR-0041-efficacy-is-a-north-star-not-a-gate.md).
- [verified] The SPEC (`vault/40-projects/kaizenai-saas/SPEC.md:29`) still starts with placement. That entry flow must change.
- [opinion] Everything below is proposed wording or acceptance criteria, not an implemented change.

| SPEC section | Concrete edit |
|---|---|
| **§1 — Product** | Replace with: **“A parent-purchased AI math tutor for learners 13+, helping them work through tonight’s homework while repairing the underlying skills and checking what they can later do independently.”** |
| **§2 — Users** | Parent buys help with a current problem. Learner opens their actual assignment. No compulsory placement test before useful help. State supported homework topics before purchase; algebra readiness does not authorize an all-math promise. |
| **§3 — Bar** | Measure two outcomes separately: **useful help tonight** and **independent learning later**. Preserve the mastery law and ADR-0041. Homework completion and grades cannot substitute for independent learning evidence. |
| **§4 P0.1 — Loop** | Replace placement-first with **homework → observed attempt → targeted help → embedded repair → homework retry → scheduled independent check → report**. |
| **§4 P0.3 — Content** | Distinguish learner-submitted homework from product-authored teaching and assessment items. Screen submissions, confirm mathematical transcription, and check topic coverage. Use reviewed teaching templates and a separate reviewed assessment bank. Incoming homework never becomes a qualifying assessment. |
| **§4 P0.6 — UI** | Home screen: **“What are you working on tonight?”** Session controls: **“Show the next step,” “Explain why,” “Let me try.”** End card: **“Worked through together / Practiced underneath / Next independent check.”** No compulsory trellis tour. |
| **§5 — Reuse** | Reuse the tutor and evidence plumbing only after reproducing integrity checks. Remove any route that lets tutor-generated questions confirm mastery. |
| **§6 — Gates** | Add homework-upload handling, retention, access and deletion to the existing review. Make supported topics, service hours and actual AI capabilities explicit. |
| **§7 — Evidence** | Closed beta must demonstrate the complete homework-to-check journey, including skipped checks and reports with no confirmed skills. Track help quality, repair uptake, repeat use and independent evidence separately. Ten families establish feasibility, not efficacy. |
| **§8 — Decisions** | Record the chosen acquisition motion. Reframe demand research around **parents buying homework relief**, then test whether embedded repair works. Do not require buyers to articulate a foundations problem first. Re-test the earlier fixed-session offer against deadline-driven usage; price remains pending. |
| **§9 — Milestones** | Build one supported homework journey before broad curriculum coverage. Feasibility → paid repeat use and independent-learning evidence → expansion. Keep the preregistered efficacy study separate; remove “launch on measured effect” as shorthand for an SD threshold. |
| **§10 — Risks** | Replace the withdrawn virtual-effect warning with W3’s ranked risks. |

**[opinion] First session: approximately 15 minutes, adjusted to the learner’s deadline.**

1. **Bring the problem.** Paste it or submit one photo; confirm ambiguous symbols. Ask where they are stuck and how much time they have.
2. **Observe without blocking help.** Invite one next step; accept “I don’t know.” A wrong answer creates a *candidate explanation*, not a diagnosed deficit.
3. **Help immediately.** Give the smallest useful hint, then an explained worked step if needed. Do not repeatedly demand an attempt from a stalled learner.
4. **Use homework diagnostically.** For trouble with \(x/3+2=5\), distinguish subtracting from both sides from undoing division. One brief contrasting task tests the suspected cause. Record uncertainty.
5. **Repair within the task.** Spend roughly 60–120 seconds on the relevant idea; have the learner perform the next related step. Immediate success guides teaching but earns no mastery credit.
6. **Return to tonight’s goal.** Continue the assignment and summarize what was worked through with help. Offer the later independent check with a clear purpose.

**[opinion] P0 gains:** single-problem intake, assistance tracking, misconception hypotheses, embedded repair, check scheduling and reports that distinguish service from evidence.

**[opinion] P0 loses:** mandatory placement, reviewing all 118 items regardless of launch coverage, elaborate learner-facing graphs, and any implied whole-worksheet or all-subject coverage. Bulk PDFs and LMS integrations wait.

**[opinion] Customer promise:**

> “Get unstuck on tonight’s math. Work through homework with an AI tutor, practice the parts that caused trouble, and check what you can do independently.”

The deeper mission need not lead the advertising. The practice and follow-up must still be disclosed. Grade improvement is an outcome to investigate, not a guarantee.

**[opinion] Week-1 report example — illustrative values, not observed results:**

> **Help delivered:** Worked through four homework problems together across two sessions.  
> **Practice completed:** Practiced multiplying both sides after fraction steps caused difficulty.  
> **Independent skills confirmed:** None yet. One delayed check was skipped; another is not yet eligible. This does not establish whether learning occurred.  
> **Next step:** A two-minute independent check at the next eligible session, followed by current homework.  
> **School results:** No new grades supplied.

## W2 — The mastery law under this motion

**[opinion] Choose C: homework is the unscored diagnostic—with A’s prohibition on mastery credit.** Unscored for mastery does not mean unmeasured.

| During homework help, record | Never infer or record from that alone |
|---|---|
| Submitted problem, confirmed transcription, topic and item family | A qualifying assessment item |
| Learner attempt before each intervention | “Unaided” merely because the final answer was typed alone |
| Hints, worked steps, answer exposure and relevant skill timestamps | An assistance-free attempt after restarting the session |
| Correctness, retries and assistance level | Mastery points, “80% mastered,” or a confirmed skill |
| Suspected misconception, supporting observation and uncertainty | A permanent deficit diagnosis from one error |
| Repair offered/completed/skipped; check due/completed/skipped | Learning gained from minutes, engagement or homework completion |
| Parent-reported grades and household experience, attributed | Verified learning or an effect caused by Kaizen |

**[verified] The inherited engine document (`shared/repos/Kaizen-AI/docs/ENGINE.md:44`) specifies ≥48 hours since relevant instruction, repeated evidence and multiple contexts.** My earlier opinion used 24 hours; preserve 48 in this proposal. This verifies the documented rule, not runtime enforcement.

**[opinion] Concrete confirmation protocol:**

- Homework observations select what to teach and assess; they never qualify themselves.
- Separate assessment mode uses unfamiliar, reviewed items, protected keys and a predetermined scoring rubric.
- Proposed beta rule: two passing checks on different days, covering at least two contexts; first eligible after 48 hours, second targeted around day seven. Each must satisfy the delay rule.
- Any relevant hint, instruction or answer exposure restarts eligibility across sessions. Help during a check permanently disqualifies that attempt.
- One qualifying pass displays **“First independent check passed; follow-up pending.”**
- “Unassisted” means no assistance observed under the stated protocol. A home browser cannot establish that another person or device was absent.

**[opinion] Prevent the daily-homework trap:** repeated instruction may continually postpone eligibility. Schedule a skill-specific interval without planned reteaching; continue helping with other work. If tonight’s homework needs that skill again, provide help and reschedule. Never shorten the delay to make the report look better.

**[opinion] Prevent drift structurally:**

- Keep assistance events separate from qualifying assessment attempts.
- Only a restricted assessment service can append qualifying evidence; tutoring and report generation cannot.
- Make reports read a server-derived confirmation view. Corrections append provenance; they do not relabel old assisted attempts.
- Gate releases on cross-session help, concurrent help/checks, repeated item families, client-clock manipulation and generated-item bypass cases.
- Audit every displayed mastery claim back to qualifying evidence and its rule version.

**[recalled]** The prior audit reported timer and generated-item bypasses. Those findings require reproduction before reuse; they are not fixed because this design exists.

**[opinion] PM line when Manny answers:** A and C preserve the same mastery boundary. B may mean **practice completed** or **help delivered**, shown separately. If B means mastery credit, identify an explicit conflict with the law; do not resolve it through softer dashboard wording.

## W3 — Risks this motion creates, ranked, with the cheapest test for each

**[opinion] These are ranked hypotheses. Proposed tests are small feasibility probes, not population-level proof.**

| Rank | Risk | Cheapest informative test |
|---|---|---|
| **1** | **A free general chatbot provides enough homework relief.** Our deeper mission may add no willingness to pay. | Have consenting families try both on comparable supported assignments, counterbalancing order. Observe valid next steps, parent involvement and repeat use. Then offer an actual paid continuation with the free alternative explicitly available. Praise without paid selection fails the value hypothesis. |
| **2** | **Repair never happens.** Parents check grades; learners skip practice; daily help keeps delaying assessment. | Instrument ten families for two weeks: repair offered → attempted → completed → check eligible → check taken → independent result. Include every family in the denominator. Healthy homework usage with negligible repair participation demands a mechanic redesign, regardless of renewals. |
| **3** | **The promise becomes misleading.** Families hear “better grades” or “homework finished”; the product delivers uncertain tutoring and extra tasks. | Before use, show the offer and ask parent and learner separately what they expect tonight and after a week. Compare their answers with delivered behavior. Repeated expectations of guaranteed grades, automatic completion or proven mastery require copy and workflow correction. |
| **4** | **Assisted success contaminates mastery.** Commercial pressure rewards a fuller-looking report. | Run scripted journeys containing hints, fresh sessions, immediate correct answers and skipped checks. Generate the actual parent report. Every assistance-only journey must yield zero newly confirmed skills while still describing useful help. |
| **5** | **Grades recover and the reason to subscribe disappears.** Renewal may reflect dependence rather than durable value. | Follow the first improving families through the next billing decision. Offer continuation, pause and graduation plainly; record their reasons and whether a new need exists. Do not assume an upsell to enrichment. Build economics that can tolerate successful graduation. |
| **6** | **Deadline demand exceeds topic coverage or reliable delivery.** Wrong algebra, photo errors, evening support and long sessions erase trust or margin. | Collect consented, representative assignments and replay them through the proposed bounded service. Have an independent reviewer inspect interpretation and worked steps; measure coverage, latency, cost and escalation burden. Narrow the advertised scope where it fails. |

**[opinion] The decisive commercial-learning test:** can the same families obtain useful help, choose to return, and accumulate independent evidence? Three disconnected success stories do not establish this motion.

## W4 — The next three grill questions

**[opinion] Q1 — Homework gets done, but the learner skips every repair. What friction may we add next session?**

- **A)** A brief learner step inside the current homework, about two minutes maximum. **Recommended.**
- **B)** A separately agreed weekly repair session.
- **C)** None; repair remains optional indefinitely.
- **Why it matters:** Establishes where the hidden mission gets actual learner effort.
- **Weak answer:** “The AI will sneak the learning in,” without a behavior or time allowance.
- **Follow-up A:** On a deadline night, may that step be deferred—and when must we offer it again?
- **Follow-up B:** How much parent effort are you willing to make an explicit requirement?
- **Follow-up C:** What would trigger redesign if subscriptions renew while independent evidence stays empty?

**[opinion] Q2 — If we and a free chatbot solve tonight’s problem equally well, which additional benefit must earn the subscription first?**

- **A)** Less parent chasing, checking and reteaching. **Recommended to test first.**
- **B)** Continuity: the tutor remembers recurring difficulties across assignments.
- **C)** Demonstrated independent solving the following week.
- **Why it matters:** Chooses the first paid-value hypothesis beyond answer quality; research must establish whether families value it.
- **Weak answer:** “Better AI” or “all three,” without a first observable reason to pay.
- **Follow-up A:** Which parent task should disappear first?
- **Follow-up B:** What should session three do visibly better because sessions one and two happened?
- **Follow-up C:** What useful week-1 result justifies payment while that evidence is still pending?

**[opinion] Q3 — Grades recover and the learner needs little help. What should a successful customer relationship become?**

- **A)** Lighter exam or next-topic support, with an easy pause. **Recommended.**
- **B)** A continuing enrichment program the learner actively chooses.
- **C)** Graduation and cancellation until another need appears.
- **Why it matters:** Defines retention without manufacturing dependence and sets realistic subscription economics.
- **Weak answer:** “Keep them hooked,” without a new customer-valued job.
- **Follow-up A:** Should lighter usage keep the same plan or receive a different offer?
- **Follow-up B:** Which intellectual capability should the learner want enough to spend voluntary time on?
- **Follow-up C:** What bounded outcome should mark a successful graduation?