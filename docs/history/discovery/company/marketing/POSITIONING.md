# Positioning — K–8 Family Companion (parent-first)

Status: DRAFT by VP of Marketing (AI role, not a human credential). Recommendation only; the owner decides product direction and taste. No external use.
Sources read: company/OPERATING_BRIEF.md, company/prompts/marketing-recovery.md, DIRECTION.md (BRIEF.md lines 19–21 as quoted in the operating brief). Candidate copy: redesign/candidate/copy.js and shell-copy.js located, partially inspected — see CLAIMS_REGISTER.md for what was and was not checked.
Evidence labels used: owner statement / source inspection / worker report / independently executed / hypothesis / not tested.

## 1. Who this is for (target parent and job)

**Target parent (hypothesis, owner-selected segment):** a US parent or guardian of a K–8 child who is already the one keeping track of schoolwork at home — by memory, texts, paper, photos, or a school portal — and who wants to (a) know what is due and what is actually done, (b) see the child's real work rather than a "done" checkbox, and (c) respond to it specifically without hovering all evening.

Owner statement (DIRECTION.md): "first customer we target is parents needing homework help and student management now." Evidence that such parents exist in reachable numbers, or would pay: **none yet** (no users beyond the owner; demand, pricing and participant access are unknown).

**The job, stated in the parent's terms (hypothesis, to be tested with adults):**
- "Tell me what my kid has to do this week and what's already done."
- "Show me what they actually did, not just that they said they did it."
- "Let me leave a note on the exact thing, in the language we use at home."
- "Let my kid start on their own and tell me when they're stuck."

**Age bands (owner statement: K–8 with distinct K–2 / 3–5 / 6–8 experiences; design bands, not validated):**
- K–2: parent sets up and reviews nearly everything; child's part is small — mark done, say "I'm stuck," show the work.
- 3–5: child starts tasks and asks for help; parent reviews the recorded work and responds.
- 6–8: child keeps the plan; parent sees status and help flags and steps in on request.
Positioning copy should not promise any of these differences until screens for each band exist and have been judged by the owner.

## 2. The narrow, believable promise (what is true today)

The current, truthful value is **organization plus shared recorded work**:

> One shared place where a child's schoolwork, the work they actually did, and a parent's notes stay together — in English or Spanish, with the family's own words kept exactly as written.

What the demo actually does (source inspection of the candidate's existence + coordinator shell replay 30/30 at company/coordinator-evidence/resume-shell-20261002T030547Z/report.json; **not** a full connected-flow pass):
- A parent can create and review schoolwork; a child can start, work, ask for help and report stuck/done; shared activity shows what happened so parent feedback can be exact.
- DUE (deadline), WORK (accepted work day) and SUGGESTED (unaccepted draft) are different things; chips select, they do not drag-reschedule.
- Text a family writes stays verbatim across language switches; only generated, keyed text localizes.
- Everything is offline, in-memory and synthetic. There is no real AI, audio, account, sync, school or tutor integration.

What we will **not** promise: see CLAIMS_REGISTER.md "Blocked" list.

## 3. Short English copy (draft, owner has not approved)

Headline options (pick at most one; all are organization-and-record claims, none are outcome claims):
1. "Schoolwork, the work itself, and your notes — in one place."
2. "See what your child actually did. Say exactly what you think."
3. "Keep track of school at home, in English or Spanish."

Supporting line: "You organize and review. Your child starts, works, and asks for help. Everyone sees the same record."

Honest qualifier required next to any demo: "Early prototype with made-up example data. No accounts, no AI help, no school connection yet."

## 4. Draft Spanish — EXPLICITLY UNVALIDATED

Not reviewed by a native Spanish-speaking parent or an educational-Spanish editor. Do not show to families as finished. Register and regional choices (tú vs. usted, "tarea" vs. "trabajo escolar") are open. Source inspection (copy.js grep): the candidate already uses "tarea" for schoolwork, "madre/padre" for the parent, "Atascado" for stuck, "Pedir ayuda / Necesito ayuda" for help, and "Hecha (autoinforme)" for self-reported done; the drafts below follow those terms so marketing words and screen words match. Headline 2 says "realmente hizo" — on screen the record is self-reported, so prefer "lo que tu hijo registró" if the Language Editor agrees.

1. "Las tareas, el trabajo hecho y tus notas, en un solo lugar."
2. "Mira lo que tu hijo realmente hizo. Di exactamente lo que piensas." (hijo/hija handling unresolved)
3. "Lleva el control de la escuela en casa, en inglés o en español."

Supporting line: "Tú organizas y revisas. Tu hijo empieza, trabaja y pide ayuda. Todos ven el mismo registro."

Qualifier: "Prototipo inicial con datos de ejemplo inventados. Todavía sin cuentas, sin ayuda de IA y sin conexión con la escuela."

## 5. Alternatives the parent already has (hypotheses from general knowledge, not researched in this task)

| Alternative | Why a parent uses it | What it does not do (to test, not assert) |
|---|---|---|
| Paper planner, fridge list, memory | zero setup | no record of the work itself; no child-side "I'm stuck" |
| Texts / photos between parent and child | already in hand | scattered; feedback is not attached to the task |
| School portal / classroom app (teacher-owned) | authoritative for assignments | parent cannot organize or annotate; child's actual work and home notes live elsewhere |
| General to-do / calendar apps | familiar | no child role, no recorded work, no help request |
| Homework-help / tutoring apps and services | explains content | not an organization and record layer; cost; not parent-first |
| Doing nothing / "ask the kid" | no effort | the problem we assume exists may not, for this parent |

The research kit's first job is to find out which of these the target parent actually uses and whether they experience a problem at all.

## 6. Hypotheses — not benefits, not to be claimed

| Hypothesis | What would support it | Current status |
|---|---|---|
| Parents chase less when work and status are shared | adult sessions: parent says it would replace texts/asking; later diary data | not tested |
| Children do better / grow more independent | would require real use over time with independent checks | not tested; no real users |
| Bilingual EN/ES households are a distinct, reachable first segment | recruitment response; interview answers about language at home | not tested; owner question 1 |
| Parents value "seeing the actual work" over "done" status | interview + demo observation (see kit) | not tested |
| A parent would pay anything for this | never ask in v1 research beyond "what do you pay for now" | not tested; pricing out of scope |
| Draft Spanish reads naturally to native-speaking parents | native review | not tested; blocked claim until then |

## 7. What positioning must never do here
- No "AI tutor," "AI companion," voice, or "learns with your child" language while the demo's assistance is deterministic and scripted.
- No mastery, grades, progress percentages, learning gains, "proven," "research-backed," "trusted by," or any user count.
- No "syncs across devices," "works with your school," "COPPA/FERPA compliant," "safe for kids."
- No invented testimonials, no fake families, no "parents told us" before research exists.
- No campaign, landing page, outreach or spend. Drafts only.

## 8. Owner-only questions (maximum two; both have a default so work does not stall)

**Q1 — First research segment.** Interview any US K–8 parent, or prioritize bilingual EN/ES households?
- A: any US K–8 parent (faster, Spanish stays a later gate) — *default if no answer*
- B: bilingual households first (tests the EN/ES differentiator early, slower to recruit)
- C: both, two small groups of 3–5

**Q2 — Participant route.** Is there any adult route you would approve for research later (known parents, friends, colleagues, a community you belong to), or should the team assume none and keep everything to dry runs? Participant access is currently *unknown*, not "none." No message is sent either way until you say so, and no compensation is offered without a budget decision.
- A: owner supplies a short list of adults to approach with the unsent draft
- B: no route yet; team runs dry-run sessions only — *default if no answer*
- C: owner wants a different route proposed first

## 9. Three decisions taken here (for coordinator reconciliation, not consensus)
1. Positioning anchors on organization + shared recorded work only; "less chasing" and "better outcomes" are demoted to hypotheses and blocked from copy.
2. Research is adult-only, task-based on the synthetic candidate, desktop-first until the 320px stale-status issue is fixed; nothing is sent until Q2 is answered.
3. Spanish is labeled unvalidated draft in every artifact; native validation is a named gate (CLAIMS_REGISTER.md), not assumed.
