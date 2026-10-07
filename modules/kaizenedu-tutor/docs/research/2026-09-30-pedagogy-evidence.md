# Research: Pedagogy against the evidence (2026-09-30)

Produced by a research agent on 2026-09-30 for `docs/REPLAN.md`. Vendor pages were egress-blocked from the sandbox; every price and latency figure that is not measured in this repo is a secondary-source number and is marked unverified in the text. Nothing here is public copy.

## Summary

Research-only review of KaizenEdu's pedagogy against the tutoring and learning-science evidence. No files were edited.

What the evidence says, in one paragraph: Bloom's 2-sigma has never been replicated; the best meta-analysis of PreK-12 tutoring RCTs (Nickow, Oreopoulos, Quan; 96 studies) pools at 0.37 SD in the 2020 NBER version and 0.29 SD in the 2024 AERJ version, with larger effects for high dosage (3+ days/week), during-school delivery, and trained tutors. The learning-science moves with the strongest evidence are retrieval practice (g 0.5-0.7), spacing (optimal gap roughly 10-20% of the retention interval), interleaving (d 0.83 in a 787-student math RCT), self-explanation (g 0.55), elaborative interrogation (~0.4-0.6), worked examples for novices that must fade as skill grows (expertise reversal), and informative feedback (d 0.48; "good job" carries none). Mastery learning adds a moderate effect and helps weaker students most. On AI tutors specifically: purpose-built, answer-withholding tutors have beaten active-learning classrooms (Harvard physics RCT, 194 students, 0.73-1.3 SD), raised scores in Ghana (0.37 SD) and Nigeria (0.31 SD overall, 0.23 SD in English), and matched human tutors in UK classrooms (LearnLM, N=165); but unguarded GPT-4 lowered unassisted exam scores (-0.19 SD) while a hint-only tutor was neutral (-0.01 SD), Khanmigo in a two-year Tennessee RCT added only 0.06-0.08 SD/year because students rarely used it, LLM tutoring dialogues are entirely correct only ~57% of the time (TutorGym), Socratic tutors "collapse" into answer-giving under sustained pressure, and preference-aligned models retreat from correct positions under authority/social pressure (sycophancy). Wheel-spinning (endless practice without mastery) and gaming (rapid hint abuse) are the classic ITS disengagement failures.

How the repo scores: the design is unusually well aligned on principle. Persona bans sycophancy and praise-of-the-question, asks before telling, limits turn length, requires concrete-before-abstract and predict-first; coach mode withholds answers behind a server-side attempt counter; hints mark the next check as assisted and assisted work can never confirm mastery; a delayed unassisted check 24h later is required before "confirmed"; misconception tags drive specific re-teach moves; the profile stores explanation styles that worked; grading is fail-closed (no silent partial credit). Those are exactly the guardrails Bastani, TutorGym, and the scaffolding-collapse work say matter.

What is missing or broken, ranked by how much it undercuts "replace a human tutor for grades 4-9, any subject": (1) the reviewed item bank is empty in production (0 of 118 items carry reviewed_at; the validator drops unreviewed items), so every check including the diagnostic is authored live by the fast model, and the misconception-tagged distractor machinery never runs; (2) outside the 12 fraction skills there is no skill graph, no prerequisites, no diagnostic, and one coarse "S-science"-style estimate per subject, which is most of the product's stated scope; (3) sessions start from a subject-chip menu plus a text box, not a diagnostic conversation, and there is no per-session goal or visible plan; (4) spacing is a single 24h check after which "confirmed" never decays, and no review of earlier skills is ever scheduled; (5) checks always target the current skill (no interleaving); (6) nothing verifies the tutor's own explanations or arithmetic before they are spoken, and there is no correctness eval; (7) re-teach tracking stores only the literal string "re-teach requested", so the "never repeat an approach" rule and the profile's "styles that worked" are ungrounded; (8) WRAP is a model-written recap, not a learner-produced summary; (9) reading has no read-aloud fluency measure and writing has no rubric-graded check type; (10) no wheel-spinning guard drops a stuck learner to a prerequisite.

The ten changes below are ordered by value; each names effort (S under a day, M 1-3 days, L a week or more) and the files it lands in. Sources for every research claim are in the findings. Where the proxy blocked the primary page (arxiv.org, nature.com, PMC, Hechinger, EducationNext, ERIC, Khan blog, ISCA), the number is marked "verified via search snippet only".

## Findings

### Research: Bloom's 2-sigma is a ceiling nobody has hit; real tutoring is ~0.3-0.4 SD and dosage, training, and in-school delivery drive it

Effort: n/a (framing)

Bloom (1984) compared mastery learning plus 1:1 tutoring against conventional instruction and reported 2 SD. The most complete meta-analysis of PreK-12 tutoring RCTs (Nickow, Oreopoulos, Quan) covers 96 studies: the 2020 NBER working paper pools at 0.37 SD (~14 percentile points) and the 2024 AERJ publication reports 0.288 SD. None of the 96 reached 2 SD. Effects are larger with teacher or paraprofessional tutors, during the school day, at 3+ days per week, in earlier grades; reading gains skew early, math gains skew later. Kulik & Fletcher's meta-analysis of 50 intelligent-tutoring-system evaluations found a median 0.66 SD, larger on locally aligned tests and shorter studies. Kulik, Kulik & Bangert-Drowns (108 studies) found mastery learning helps, most for weaker students; the commonly cited 0.52 SD average could not be confirmed from the abstract (unverified). Implication for a 'replace a human' goal: the bar is roughly 0.3-0.4 SD sustained over a school year at 3+ sessions per week, not 2 SD; product design should optimise for consistent dosage as much as per-session quality.

Recommendation: Treat 0.3 SD over a term at 3 sessions/week as the design target and measure against it (docs/SPEC.md §2 goals). Build the product around a return-cadence (a due-review queue, a 3-day-a-week nudge) because dosage is the strongest moderator in the tutoring literature.

Evidence: https://www.nber.org/system/files/working_papers/w27476/w27476.pdf ; https://journals.sagepub.com/doi/10.3102/00028312231208687 ; https://www.educationnext.org/two-sigma-tutoring-separating-science-fiction-from-science-fact/ (full text blocked; 'none of 96 reached 2 sigma' verified via search snippet only) ; https://journals.sagepub.com/doi/abs/10.3102/0034654315581420 ; https://journals.sagepub.com/doi/10.3102/00346543060002265

### Research: the learning-science moves with the strongest evidence, with effect sizes

Effort: n/a (framing)

Retrieval practice: Adesope et al. 2017 meta-analysis, g 0.70 for a single practice test and 0.51 for multiple, larger with feedback and for secondary students; Dunlosky et al. 2013 rate practice testing and distributed practice 'high utility', interleaving/self-explanation/elaborative interrogation 'moderate'. Spacing: Cepeda et al. 2008 show the optimal gap grows with the retention interval, roughly 20-40% of a 1-week delay falling to 5-10% of a 1-year delay. Interleaving: Rohrer, Dedrick, Hartwig & Cheung 2020 RCT, 787 students, 54 classes, interleaved vs blocked math practice, d 0.83 on a test one month later. Self-explanation: Bisra et al. 2018, 64 reports, g 0.55. Elaborative interrogation: ~0.42-0.56 depending on meta-analysis. Feedback: Wisniewski, Zierer & Hattie 2020, 435 studies, d 0.48, driven by informational content (task/process feedback) not praise. Worked examples: strongly beneficial for novices, harmful once expertise grows (expertise reversal effect, Kalyuga et al.); the fix is fading worked steps into problem solving. Immediate vs delayed feedback: mixed; immediate is at least as good for procedural skill and motivation, delayed sometimes wins for retention of conceptual material; no-feedback loses to both.

Recommendation: The repo already does immediate informational feedback, no praise, concrete-first, and 'why before drill' (lib/tutor/prompts/persona.md lines 188-194). The moves it does NOT implement are the big-effect ones: interleaving (d 0.83), expanding spacing, self-explanation checks, and faded worked examples keyed to the mastery estimate. See changes 3, 4, 6, 7 below.

Evidence: https://journals.sagepub.com/doi/abs/10.3102/0034654316689306 ; https://journals.sagepub.com/doi/abs/10.1177/1529100612453266 ; https://journals.sagepub.com/doi/10.1111/j.1467-9280.2008.02209.x ; https://gwern.net/doc/psychology/spaced-repetition/2019-rohrer.pdf ; https://link.springer.com/article/10.1007/s10648-018-9434-x ; https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2019.03087/full ; https://www.tandfonline.com/doi/abs/10.1207/S15326985EP3801_4 ; https://pubmed.ncbi.nlm.nih.gov/33208050/

### Research: AI-tutor RCTs that worked share four design features: answers withheld, tight scaffolding, curriculum-aligned content, and forced engagement

Effort: n/a (framing)

Harvard physics (Kestin et al., Scientific Reports, June 2025): 194 students, crossover RCT, purpose-built GPT-4 tutor at home vs in-class active learning; median learning gains more than doubled in 49 min vs 60 min; effect sizes 0.73-1.3 SD (verified via search snippet only; nature.com blocked). The tutor was built on cognitive-load management, scaffolding, growth-mindset framing, and did not hand out answers. Nigeria (World Bank, De Simone et al. 2025): 6-week after-school GPT-4/Copilot program in Edo State, pairs of students, teacher-supervised; +0.31 SD overall, +0.23 SD on English, described as 1.5-2 years of business-as-usual schooling. Ghana (Henkel et al. 2024, Rori on WhatsApp): ~1,000 students, grades 3-9, 11 schools, two 30-min sessions/week for 8 months, +0.37 SD (p<0.001). Tutor CoPilot (Wang, Demszky et al., Stanford 2024): 900 tutors, 1,800 K-12 students; AI-coached human tutors raised topic mastery 4 pp overall and 9 pp for lower-rated tutors, mainly by asking guiding questions and giving fewer answers, at $20/tutor/year. UK classrooms (LearnLM on Eedi, Dec 2025): N=165, 5 secondary schools; AI-drafted tutoring matched human tutors and students were 5.5 pp more likely to solve novel problems on later topics (66.2% vs 60.7%); supervising tutors approved 76.4% of drafted messages with zero or minimal edits (verified via search snippet only; arxiv blocked).

Recommendation: The repo's coach mode and check loop are the right skeleton. What the successful trials add that the repo lacks: curriculum-aligned item content beyond fractions, a fixed weekly cadence, and structured sessions with a plan. See changes 1, 2, 3, 10.

Evidence: https://www.nature.com/articles/s41598-025-97652-6 ; https://news.harvard.edu/gazette/story/2024/09/professor-tailored-ai-tutor-to-physics-course-engagement-doubled/ ; https://voxdev.org/topic/education/how-ai-tutors-improved-learning-nigeria ; https://blogs.worldbank.org/en/education/From-chalkboards-to-chatbots-Transforming-learning-in-Nigeria ; https://arxiv.org/abs/2402.09809 ; https://arxiv.org/abs/2410.03017 ; https://arxiv.org/abs/2512.23633 ; https://storage.googleapis.com/deepmind-media/LearnLM/learnLM_nov25.pdf

### Research: the documented failure modes are answer-giving, disengagement, factual errors, scaffolding collapse, and sycophancy

Effort: n/a (framing)

Answer-giving harms unassisted performance: Bastani et al. (PNAS 2025), ~1,000 Turkish high-schoolers, four 90-min sessions; unguarded GPT-4 raised practice performance but lowered the later unassisted exam by -0.19 SD vs control, while a hint-only 'GPT Tutor' with teacher-designed hints was -0.01 SD (verified via search snippet only; PMC blocked). Disengagement: Oreopoulos & Low (NBER w35620, 2026), two-year cluster RCT in 18 Tennessee middle schools with Khanmigo configured to coach; +1.3 percentile ranks per term, ~0.06-0.08 SD per year, the same as Khan practice without AI; 96% tried it once but the median student messaged it on a third of practice days and in only 17% of sessions where they made a mistake; messages were mostly bare answers or suggested-prompt clicks. No peer-reviewed Khanmigo-specific learning effect existed before this paper. Factual errors: TutorGym (2025) found 90% of LLM tutoring dialogues show high-quality support but only 56.6% are entirely correct, and next-step action accuracy is 52-70% (verified via search snippet only). Scaffolding collapse: LLM Socratic tutors progressively abandon guided inquiry and reveal solutions under sustained student pressure; even the best mitigation on Qwen3-8B only brings collapse rate to 32% and onset past nine turns (arxiv 2607.19371, snippet only). Sycophancy: 'Sycophancy is an Educational Safety Risk' (May 2026, TUM) shows frontier models retreat from correct positions under authority ('my notes say...') and face-saving ('please don't tell me I'm wrong') pressure even when they resist frame-switch attacks (snippet only). Classic ITS failures: wheel-spinning (Beck & Gong 2013: a student who does not master a skill quickly probably never will in that system) and gaming (bottom-out hint on first attempt, wrong answers under 2 s).

Recommendation: The repo guards answer-giving (coach.ts attempt counter; hint => assisted) and sycophancy in the prompt, but has no defence against its own factual errors (change 5), no multi-turn pressure eval (add cases to eval/coach-mode/cases.json that push for 8+ turns and under authority framing), and no wheel-spinning guard (change 10). Voice-first, timed sessions are a plausible answer to the Khanmigo engagement problem, which is a real advantage worth measuring.

Evidence: https://www.pnas.org/doi/10.1073/pnas.2422633122 ; https://www.nber.org/papers/w35620 ; https://edworkingpapers.com/ai26-1551 ; https://arxiv.org/abs/2505.01563 ; https://arxiv.org/abs/2607.19371 ; https://arxiv.org/abs/2605.14604 ; https://link.springer.com/chapter/10.1007/978-3-642-39112-5_44

### Scorecard: what the current design does well against the evidence

Effort: n/a

Persona (lib/tutor/prompts/persona.md): at most two sentences and one question per turn, ask-before-tell, one question per turn, no praise words, no exclamation, concrete-before-abstract, predict-first, say-why-before-drill, re-teach with a different approach on the second miss. Coach mode (lib/tutor/session/coach.ts, prompts/coach.md): answer withheld until one attempt, tracked server-side so it is evaluable; 'just show me' unlocks a worked example followed by a similar problem, which is the faded-example pattern. Mastery law (lib/tutor/model/student-model.ts lines 87-151): EMA alpha 0.3 from a 0.5 prior, mastered needs >=0.8 across >=4 items and >=2 sessions (a spacing requirement), then a delayed unassisted check 24 h later before 'confirmed'; assisted work can never confirm (evidence.ts hintSinceLastCheck; checks/service.ts lines 86-88). Misconceptions (student-model.ts lines 181-225): tagged distractors open a row, three clean relevant items resolve it, and build.ts lines 69-84 map each tag to a specific re-teach move. Grading (checks/grading.ts): fail-closed, no silent partial credit, named wrong values carry tags; short answers go to the stronger model with a strict schema and return ungraded on parse failure (llm-grade.ts). Memory (prompts/profile.md, turn/context.ts): compact profile with pace, recurring misconceptions, explanation styles that worked, injected every turn. Safety and disclosure sections are thorough. Evals exist for persona, coach mode, and red team (eval/README.md).

Recommendation: Keep all of it. These are the exact guardrails the Bastani, Tutor CoPilot, and scaffolding-collapse papers identify as the difference between AI that helps and AI that hurts.

Evidence: lib/tutor/prompts/persona.md ; lib/tutor/session/coach.ts ; lib/tutor/model/student-model.ts ; lib/tutor/model/evidence.ts ; lib/tutor/checks/grading.ts ; lib/tutor/prompts/build.ts ; eval/README.md

### Critical gap: the reviewed item bank is empty in production, so every check and the whole diagnostic are authored live by the fast model

Effort: M (one reviewer, ~2 days for 118 items)

lib/tutor/content/item-bank.json has 118 items and zero contain reviewed_at (grep count 0). lib/tutor/graph/items.ts validateOne (lines 70-73) marks any item without reviewed_by/reviewed_at as a problem and drops it; seed.ts only upserts loaded.valid; pickBankItem (items.ts line 279) additionally requires reviewed_at IS NOT NULL. docs/ITEM-BANK-REVIEW.md confirms '0 of 118 items reviewed... The tutor shows a learner nothing from this file until reviewed_by and reviewed_at are set'. Consequence: build.ts checkOfferLines emits 'No bank item is available... author one item yourself' for every check, including the four diagnostic items, so placement (binary search in state-machine.ts lines 169-233) runs on items the fast model invents, misconception distractors are whatever the model assigns (prompt.ts line 86-90 defaults unknown tags to 'computation'), and the representation-variation rule for the diagnostic is moot. Given TutorGym's ~57% fully-correct rate for LLM tutoring content, unreviewed model-authored diagnostic items are the weakest link in the mastery chain.

Recommendation: A person reviews the 118 items (four questions each, per docs/ITEM-BANK-REVIEW.md) and stamps reviewed_by/reviewed_at. This is content work, not code, and it is the single highest-leverage pedagogy action available today. Until then, add a 'bankEmpty' warning to the progress/report surfaces so nobody mistakes model-authored checks for reviewed ones.

Evidence: lib/tutor/content/item-bank.json ; lib/tutor/graph/items.ts lines 55-73, 272-289 ; lib/tutor/graph/seed.ts lines 34-53 ; docs/ITEM-BANK-REVIEW.md line 3 ; docs/LOG.md line 9 ('0 signed off') ; lib/tutor/prompts/build.ts lines 97-107

### Critical gap: outside the 12 fraction skills there is no graph, no prerequisites, no diagnostic, and one coarse estimate per subject

Effort: L (content-heavy; the code paths already exist)

lib/tutor/graph/subjects.ts creates a synthetic skill per subject (S-math, S-science, ...) with no prerequisites and no tags; session/service.ts lines 175-181 skip the diagnostic and next-skill selection for topic sessions; context.ts line 245 keys every check on that single subject skill. So for 'any subject, grades 4-9' the student model reduces to 'fraction of checks answered unaided in science', the misconception system can only use six generic tags (misread, vocabulary, procedure, concept, sign_error, guess), and spaced/delayed checks cannot name what to re-test. The graph JSON also declares prerequisite_checkins (multiplication_facts, factors_and_multiples) that graph.ts never exports or uses. The diagnostic's binary search treats the DAG as a line (F6 depends only on F2; F7 only on F1), so 'lowest wrong' can place a learner at F6 with F3 unknown.

Recommendation: Change 10 below: extend the skill graph and tagged bank to the grade 4-9 math strands first (whole-number operations, decimals, ratios, integers, expressions/equations, geometry basics), then reading and science misconception sets. Without this the 'replace a human tutor' claim is only defensible for fractions.

Evidence: lib/tutor/graph/subjects.ts lines 1-10, 78-87 ; lib/tutor/session/service.ts lines 175-199 ; lib/tutor/turn/context.ts lines 188-245 ; lib/tutor/graph/graph.ts lines 17-44 ; lib/tutor/graph/skill-graph.json line 4

### Change 1: replace the subject-chip menu with an opening diagnostic conversation that ends in a placed goal

Effort: M

Today a session starts from components/tutor/learn/topic-fields.tsx (nine subject radio chips plus a free-text box) and the tutor's first turn is a fixed greeting; for a topic session build.ts line 243 says 'Do not ask what they want to work on; they said'. INTAKE is one turn ('Restate their goal in one sentence and confirm it', build.ts line 264) and DIAGNOSE only runs for brand-new fractions learners. Evidence: placement in 2-4 items is the spec's own design (SPEC §5.2); every successful AI-tutor RCT started from curriculum-aligned diagnostics; Tutor CoPilot's gain came from guiding questions that locate the sticking point. Design: GREET asks one open question ('what are you working on, and where did it stop making sense?'); INTAKE becomes up to three turns that extract subject, grade-level, the exact problem or concept, and the learner's own prediction of what they find hard; the model emits a [[goal {...}]] tag; the server then issues 2-3 probe checks (bank items when the subject has a graph, otherwise model-authored with the stronger model, not the fast one) before WORK. Keep the text form as a fallback for keyboard users and for uploads.

Recommendation: Files: lib/tutor/session/state-machine.ts (INTAKE may last up to 3 turns; DIAGNOSE for every target, not only 'diagnose'), lib/tutor/session/state.ts (SessionState.goal), lib/tutor/turn/tags.ts + engine.ts (parse [[goal]]), lib/tutor/prompts/build.ts (new INTAKE instructions), lib/tutor/prompts/diagnose.md (generalise beyond F1-F12), components/tutor/learn/topic-fields.tsx (optional path). Add eval/diagnostic-placement (the tutor-loop skill lists it; it does not exist in eval/).

Evidence: components/tutor/learn/topic-fields.tsx ; lib/tutor/prompts/build.ts lines 237-271 ; lib/tutor/session/state-machine.ts lines 126-131 ; lib/tutor/session/service.ts lines 154-199 ; docs/SPEC.md §5.2

### Change 2: a per-session goal and a visible three-step plan the learner and tutor both see

Effort: M

No session goal or plan is stored (SessionState in state.ts has target, topic, skillsTouched but no goal or steps). Learners in the Khanmigo trial disengaged partly because the AI was 'one click away' with no structure; the Harvard tutor's gains came with a fixed lesson structure. A plan also gives WRAP something concrete to compare against and lets the timer say 'two of three steps done'. Design: at the end of INTAKE the model writes [[plan {"goal":"...","steps":["...","...","..."]}]]; the server stores it, the session screen renders it as a checklist next to the board, the context section injects 'Plan: step 2 of 3: ...' each turn, and the tutor marks steps done with [[step_done 2]]. Steps map to checks: the check clock (isCheckDue, state-machine.ts lines 39-46) fires at step boundaries, which is what 'at topic end' in the spec means and which currently is approximated by a turns-per-check count.

Recommendation: Files: lib/tutor/session/state.ts (plan field + normalizeState), lib/tutor/turn/tags.ts and engine.ts (plan/step_done tags), lib/tutor/prompts/whiteboard.md (tag grammar), lib/tutor/prompts/build.ts (inject plan; check due at step boundary), components/tutor/session/* (checklist), lib/tutor/wrap/service.ts (compare recap to plan).

Evidence: lib/tutor/session/state.ts lines 84-110 ; lib/tutor/session/state-machine.ts lines 23-46 ; lib/tutor/prompts/build.ts lines 123-203 ; https://www.nber.org/papers/w35620

### Change 3: spaced review across days with an expanding schedule instead of one 24-hour check

Effort: M

student-model.ts sets DELAYED_CHECK_DELAY_MS = 24 h once (line 20, 122-123); after a correct delayed check the status becomes 'confirmed' and nextCheckAt is nulled (lines 109-112), so a skill is never re-tested unless the learner happens to be checked on it again. next-skill.ts dueDelayedChecks only surfaces 'mastered' rows, and session/service.ts takes only due[0]. Cepeda et al. show the optimal gap grows with the retention interval; Adesope shows retrieval with feedback is the strongest single move. Design: an expanding schedule (1 d, 3 d, 7 d, 21 d, 60 d) stored on the row as reviewStage and nextCheckAt; a correct unassisted review advances the stage, a miss drops it two stages and returns the skill to in_progress; every session's GREET offers up to two due reviews before new work (five minutes of a 25-minute session), interleaved with the plan; 'confirmed' becomes 'confirmed, next review <date>' in the progress UI. Keep the law that assisted checks never advance the stage.

Recommendation: Files: lib/tutor/model/student-model.ts (schedule + reviewStage on MasteryRow; applyCheck branch for 'confirmed'), lib/tutor/model/service.ts (persist reviewStage; a migration adds the column), lib/tutor/graph/next-skill.ts (dueDelayedChecks includes confirmed rows), lib/tutor/session/service.ts (queue up to two), lib/tutor/prompts/build.ts (review-first GREET wording already exists for delayed_check). Ask before the migration per CLAUDE.md.

Evidence: lib/tutor/model/student-model.ts lines 19-20, 79-128 ; lib/tutor/graph/next-skill.ts lines 36-49 ; lib/tutor/session/service.ts lines 183-199 ; https://journals.sagepub.com/doi/10.1111/j.1467-9280.2008.02209.x ; https://journals.sagepub.com/doi/abs/10.3102/0034654316689306

### Change 4: interleave checks across previously-touched skills instead of always the current one

Effort: S-M

context.ts lines 188-213 and 245 always offer a check on the current target skill (or the one delayed check). Rohrer et al. 2020 (787 students) found interleaved practice beat blocked practice by d 0.83 on a delayed test, and interleaving is what makes a check discriminate between 'knows the procedure' and 'knows which procedure'. Design: when a check is due and the learner has at least two skills with evidence, every third check targets a different skill chosen by lowest estimate among skills touched in the last 14 days (or a prerequisite of the current skill); the context tells the tutor 'this check is on <other skill>; do not teach it first'. Record checks per skill in SessionState so the rotation is deterministic and testable.

Recommendation: Files: lib/tutor/session/state-machine.ts (checkDue returns {skillId, interleaved}), lib/tutor/session/state.ts (checksBySkill), lib/tutor/turn/context.ts (offerItem on the chosen skill), lib/tutor/prompts/build.ts (wording), tests/tutor for the rotation.

Evidence: lib/tutor/turn/context.ts lines 202-213, 245 ; lib/tutor/session/state-machine.ts lines 39-46 ; https://gwern.net/doc/psychology/spaced-repetition/2019-rohrer.pdf

### Change 5: verify the tutor's own explanations before they are spoken, and add a correctness eval

Effort: L (tier a alone: S)

The only correctness control is the persona line 'Check arithmetic before you say it' (persona.md line 187) and the live turn runs on the fast model with thinking disabled (tutor-loop skill; kaizen.config MODEL routing). TutorGym reports only 56.6% of LLM tutoring dialogues are entirely correct; the Harvard tutor's authors stress content was instructor-verified. There is no eval for tutor correctness (eval/README.md lists red-team, coach-mode, persona only). Design, in two tiers: (a) deterministic: when a sentence contains an equation or 'equals' statement in math, run it through checks/math-expr.ts and symbolic.ts before the sentence frame is emitted; on mismatch, drop the sentence and append a short 'let me redo that on the board' turn, and log a 'tutor_error' evidence row; (b) model: for science/history/reading facts, a parallel fast 'verify' call on the finished turn that flags contradictions with the item stem or with the learner's uploaded text; the flag lands in the next turn's context ('Your last turn may have stated X wrongly; correct it first'). Add eval/correctness with 60 seeded turns (20 math with arithmetic, 20 science facts, 20 reading inferences) judged deterministically where possible.

Recommendation: Files: lib/tutor/turn/engine.ts (sentence gate), lib/tutor/checks/math-expr.ts (expose an evaluate-and-compare helper), new lib/tutor/turn/verify.ts, lib/tutor/prompts/verify.md, eval/correctness/*, lib/tutor/model/evidence.ts (new evidence type 'tutor_error', needs a contracts.ts enum change). Tier (a) is S; tier (b) is L because it touches latency.

Evidence: lib/tutor/prompts/persona.md line 187 ; lib/tutor/checks/math-expr.ts ; lib/tutor/checks/symbolic.ts ; lib/tutor/turn/engine.ts lines 470-495 (sentence splitting) ; eval/README.md ; https://arxiv.org/abs/2505.01563

### Change 6: record which re-teach approach was actually used so 'never repeat' and 'styles that worked' are grounded

Effort: S-M

state-machine.ts lines 91-94 append the literal string 're-teach requested' to reteachUsed once per session; nothing records whether the tutor then used an analogy, a number line, or a worked example. build.ts line 176 then tells the model 'Re-teach approaches already used this session (do not repeat): re-teach requested', which carries no information. profile.md asks the model-update stage to infer explanationStylesThatWorked from the transcript with no structured signal. The expertise-reversal literature says the choice of representation should also depend on the estimate (worked example when estimate < 0.5, faded example 0.5-0.8, problem-first above 0.8). Design: an [[approach name]] tag from a fixed list (analogy, number_line, bar_model, worked_example, faded_example, smaller_step, story, table, trace) that the engine stores in reteachUsed with the skill and the turn id; the check route joins the next check outcome to the last approach; profile.md receives 'approach -> next-check correct' pairs instead of inferring; build.ts adds one line choosing the default representation from the estimate.

Recommendation: Files: lib/tutor/turn/tags.ts and engine.ts (parse and store [[approach]]), lib/tutor/session/state.ts (reteachUsed becomes {approach, skillId, turnId}[]), lib/tutor/checks/service.ts (attach last approach to check_result payload), lib/tutor/prompts/whiteboard.md and persona.md (tag rule), lib/tutor/prompts/profile.md and build.ts (structured input; estimate-keyed default).

Evidence: lib/tutor/session/state-machine.ts lines 87-95 ; lib/tutor/prompts/build.ts lines 174-178 ; lib/tutor/prompts/profile.md line 210 ; lib/tutor/wrap/service.ts ; https://www.tandfonline.com/doi/abs/10.1207/S15326985EP3801_4

### Change 7: self-explanation checks during WORK and a learner-produced summary at WRAP

Effort: M

WRAP today is a model-written recap (prompts/wrap.md; build.ts line 274 'Give a two-sentence recap of what they did'); the learner produces nothing. Self-explanation has g 0.55 (Bisra 2018) and the 9-12 band prompt already says 'ask them to say it back in their own words' but nothing grades it. Design: (a) a new check type 'explain' (short answer, keyword-plus-model graded against a one-line rubric the tutor states) issued at least once per skill, counted in the estimate at half weight and flagged assisted like any other; (b) WRAP becomes two turns: the tutor asks 'tell me in your own words the one thing you can do now that you could not at the start', the learner answers, the server grades it against the session goal as an 'explain' check, and the recap builds on the learner's words; the parent tutorNote quotes the rubric score, never the learner. Evidence rows keep ids and scores only.

Recommendation: Files: lib/tutor/contracts.ts (CheckType 'explain'), lib/tutor/checks/prompt.ts and grading.ts (rubric field, keyword-then-model path), lib/tutor/prompts/grade.md (rubric grading rules), lib/tutor/session/state-machine.ts (WRAP has a learner turn before ENDED), lib/tutor/prompts/build.ts and wrap.md (ask-then-recap), lib/tutor/wrap/service.ts (use the learner's summary).

Evidence: lib/tutor/prompts/wrap.md ; lib/tutor/prompts/build.ts lines 272-280 ; lib/tutor/prompts/band-9-12.md line 35 ; lib/tutor/checks/grading.ts 'short' branch lines 200-268 ; https://link.springer.com/article/10.1007/s10648-018-9434-x

### Change 8: reading needs a read-aloud fluency measure from the ASR transcript

Effort: L

prompts/subjects.md tells the tutor to have the learner read aloud and paraphrase, but nothing measures accuracy or rate; the ASR route returns a transcript and the check types cannot represent a passage. For grades 4-6 reading, oral reading fluency (accuracy and words-correct-per-minute against a levelled passage) is the standard screening measure; Harmsen et al. (Interspeech 2025) found 12 of 15 ASR-derived fluency measures correlate strongly with human transcripts on 244 recordings of 131 Dutch children aged 6-13 (verified via search snippet only; ISCA blocked), and commercial tutors (Amira) score miscues, pauses, and self-corrections this way. Caveat: whisper-family models are weaker on child speech and the repo's invariant forbids storing audio, so the measure must come from the transcript only and be labelled an estimate. Design: a 'read_aloud' check type whose stem is a 60-120 word passage on the board; the client sends the ASR transcript with start/end times; the server aligns it to the passage (word-level Levenshtein), computes accuracy, WCPM estimate, and the list of missed words; misses feed the vocabulary tag; evidence stores counts and word ids, never audio.

Recommendation: Files: new lib/tutor/reading/fluency.ts (pure alignment + WCPM), lib/tutor/contracts.ts (CheckType 'read_aloud'), lib/tutor/checks/grading.ts and prompt.ts, lib/tutor/voice/* (pass timings), lib/tutor/prompts/subjects.md and checks.md (when to issue), components/tutor/session (passage card), tests for alignment. Needs a levelled-passage bank (content) too.

Evidence: lib/tutor/prompts/subjects.md line 252 ; lib/tutor/checks/grading.ts (no passage type) ; CLAUDE.md invariant (b) ; https://www.isca-archive.org/interspeech_2025/harmsen25_interspeech.html ; https://amiralearning.com/amira-isip-assess

### Change 9: a fixed rubric and a 'writing' check type so writing sessions produce evidence

Effort: M

subjects.md says a writing check 'asks them to write a sentence or a topic sentence, and you grade it against a short rubric you state in the stem', but the only path is the 'short' type with keyword matching (grading.ts lines 226-243), which cannot score organisation or evidence use, and grade.md forbids partial credit except multi-part stems. Feedback research (Wisniewski et al., d 0.48) says the informational content of feedback drives the effect, and AI writing-feedback RCTs show revision gains when feedback is specific and one-thing-at-a-time (which the subjects.md rule already states). Design: a per-band four-criterion rubric (claim/topic sentence, evidence or detail, organisation, sentence control), each 0-2, model-graded on the stronger model with a strict schema {scores, oneThingToFix, rationale}; the check is 'writing' type, the estimate uses the mean, the tutor's next turn addresses only oneThingToFix, and a revision is a second 'writing' check on the same prompt so growth within the session is visible.

Recommendation: Files: lib/tutor/contracts.ts (CheckType 'writing'), new lib/tutor/prompts/grade-writing.md, lib/tutor/checks/llm-grade.ts (second grader with rubric schema), lib/tutor/checks/prompt.ts (rubric on pending check), lib/tutor/prompts/subjects.md and checks.md, components check card (textarea).

Evidence: lib/tutor/prompts/subjects.md line 253 ; lib/tutor/checks/grading.ts lines 226-243 ; lib/tutor/prompts/grade.md line 168 ; https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2019.03087/full

### Change 10: ship the reviewed bank, extend the skill graph beyond fractions, and add a wheel-spinning guard

Effort: L (content) + S (stuck rule)

Three related items that make the mastery machinery real for grades 4-9. (a) Review: stamp the 118 fraction items (see the critical gap above). (b) Graph: add grade 4-9 math strands as new slices in skill-graph.json with prerequisites and misconception tags (whole-number bias, decimal length, negative sign, equals-as-operator, variable-as-label are well documented), then a reading skill set (main idea, inference, vocabulary-in-context) and a science set (force/motion, heat/temperature, phases) with their known misconceptions; each slice needs 8 reviewed items per skill (graph.json item_bank.min_items_per_skill). This is what lets the diagnostic, next-skill selection, and spaced review work outside fractions. (c) Wheel-spinning: Beck & Gong found learners who do not master a skill quickly rarely master it with more of the same; the repo has no rule for a learner who misses three checks on a skill in one session. Add to next-skill.ts: after two consecutive unassisted misses on the same skill in a session, the target becomes the lowest-estimate prerequisite; after a third, the session records 'stuck' and the tutorNote names it.

Recommendation: Files: lib/tutor/content/item-bank.json (review stamps, new items), lib/tutor/graph/skill-graph.json (new slices), lib/tutor/graph/graph.ts (multi-slice ordinals; export prerequisite_checkins), lib/tutor/graph/subjects.ts (map subjects to slices), lib/tutor/session/state-machine.ts and next-skill.ts (stuck rule), lib/tutor/prompts/build.ts (misconception re-teach map for new tags), docs/ITEM-BANK-REVIEW.md. The stuck rule alone is S.

Evidence: docs/ITEM-BANK-REVIEW.md ; lib/tutor/graph/skill-graph.json ; lib/tutor/graph/subjects.ts ; lib/tutor/graph/next-skill.ts ; https://link.springer.com/chapter/10.1007/978-3-642-39112-5_44

### Lower-priority observations worth logging

Effort: S

(1) HISTORY_TURNS = 12 (context.ts line 30) is fine for a 25-minute session but means a re-teach on turn 20 cannot see the first explanation; the [[approach]] tag in change 6 covers this. (2) The diagnostic 'no hints' rule lives only in prompt text (build.ts line 270); the check route still marks the check assisted if a [[hint]] slips through, which is correct. (3) The soft-continue regex (state-machine.ts line 20-21) accepts 'ok' and 'please' as yes, so a learner saying 'ok bye' extends the session; low pedagogy impact, but worth a test. (4) The 4-8 band prompt says sessions are ten minutes 'with one skill target' while kaizen.config sets checks every 10 minutes, so a 4-8 session may never issue a check except by the turn counter (4 turns); confirm intended. (5) eval/README.md notes the model halves of every eval are 'not run' until someone runs them from a keyed machine; the same is true of latency (docs/SPIKE-latency.md measured only time-to-first-sentence on the model, 774 ms, not end-of-speech to first audio). No pedagogy claim in this report depends on latency numbers, but the owner's target ('nobody has measured the real number') stands unverified.

Recommendation: Fold (3) and (4) into the state-machine tests when changes 2-4 touch that file; run the model halves of the evals and the latency harness from a keyed machine before any prompt change lands, per the tutor-loop skill's definition of done.

Evidence: lib/tutor/turn/context.ts line 30 ; lib/tutor/prompts/build.ts line 270 ; lib/tutor/session/state-machine.ts lines 20-21 ; lib/tutor/prompts/band-4-8.md line 25 ; kaizen.config.ts STUDENT_MODEL.checkEveryMs ; eval/README.md ; lib/tutor/prompts/build.ts lines 205-223
