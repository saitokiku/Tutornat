# Kaizen interior redesign — Astra execution plan

## Authority

The owner rejected the current frontend and explicitly requested a new design modeled on the inside of Kaizen-AI. The owner wants to judge concrete screens and answer consequential uncertainties. This replaces the previous pending 20-minute repair decision; it does not approve backend integrations, deployment, spending, real family data, or changes to original repositories.

Planner: the current Astra coordinator, from direct source inspection. The earlier external planner process was interrupted and produced no plan; this document is not attributed to that process.

## Product direction

An **Operate** surface. Preserve Kaizen's familiar sidebar, warm paper, readable assignment rows, compact week strip and dark primary buttons. Do not preserve its old tutor-business scope, arbitrary mastery rings or canned praise. Owner visual approval remains outstanding.

Route codes stay `today`, `schoolwork`, `plan`, `workspace`, `record`. Display labels may be Today / Schoolwork / Plan / Learn / Activity, localized EN/ES. Do not add Grades without grade records. Each page has a distinct job, not another equal-card dashboard:

| Page | Job | Main action | Secondary information |
|---|---|---|---|
| Today (parent) | Know what needs attention for the selected child | Review the most relevant actual work/decision; Add schoolwork when empty | Compact week and ordered unfinished tasks |
| Today (student) | Know what to do next | Start or continue one actual task | Small remaining list; K–2 adult guidance |
| Schoolwork | Organize assignments | Add schoolwork; select a row to inspect/edit | Subject/status filtering, optional teacher-note intake |
| Plan | See upcoming work and review date changes | Parent reviews a generated local schedule; older student proposes change | Week/date grouping, current plan, relevant decision/history disclosure |
| Learn | Do one task with focused help | Write/save work or begin selected task | Task instructions, real saved steps, sample help; parent sees work rather than student controls |
| Activity | Understand what happened and add feedback | Read the work; parent adds a task-linked note | Attributed chronological activity and assistance, never invented mastery |

## Execution

1. **Coordinator prepares a separate candidate.** Copy current core `domain.js`, `demo-service.js`, `copy.js`, `app.js`, `styles.css`, `index.html` into `redesign/candidate/`. Save source SHA256s in `redesign/baseline-manifest.json`. Do not touch the rejected `frontend/`, earlier evidence or original repositories. Success: candidate opens with the old behavior before reconstruction, originals hash unchanged.
2. **Publish one module contract and design brief.** `redesign/TEAM_BRIEF.md` is the durable shared brief; every worker receives its full role-specific task and the same applicable integration contract directly in its dispatch context. It defines file ownership, helpers, routes, tokens, interaction states, copy and tests. Private module strings can be bilingual dictionaries; workers must not race on copy.js. Success: all workers can implement without waiting on another worker's edits.
3. **Dispatch four independent Fable/max workers.** Shell/Today/Schoolwork; Learn/Activity; Plan; original-reference renderer and button inventory. Builders write working code early and targeted red→green evidence for changed behavior. Budget each builder30 tool calls or25 minutes; reference worker12 calls or10 minutes. Those are checkpoints, not completion promises. No subdelegation or global configuration changes.
4. **Integrate the candidate once.** Shell calls the module renderers through the defined context object; loading order and styles are explicit. Core/domain/service remain copied unchanged in this design wave. Run syntax and the existing domain/service unit suite against candidate modules; independently drive custom-task→student work→parent feedback and plan decisions with actual controls. Preserve raw failures, including inherited defects, without silently weakening historical tests.
5. **Inspect real desktop and phone screens.** Use installed Chrome and pinned Playwright. Check1440×1000 and390×844, with a320px overflow spot check. Read every visible button, verify its destination/effect, inspect selected screenshots, keyboard reachability and focused work. Do not turn this into an unbounded audit fleet.
6. **Separate reviewers after integration.** Fresh behavior/spec reviewer first, then fresh visual/accessibility/code-quality reviewer if the implementation satisfies the revised behavior brief. Their reports are advice/evidence, not owner taste approval. Coordinator reruns load-bearing claims. Maximum two bounded corrective passes for this redesigned candidate; record unresolveds honestly.
7. **Owner judges the artifact.** Open the candidate in preview. Ask at most two concrete questions attached to the visible screen, such as whether Today should prioritize a child's work or a family overview, only if genuine uncertainty remains. Do not ask the owner to settle API semantics or test assertions. Do not replace the original demo as accepted until the owner has seen the new direction.

## Routing and evidence

Current delegation configuration was read directly: `anthropic/claude-fable-5-1`, reasoning=max; approved fallbacks `openai-codex/gpt-6-astra` → `anthropic/claude-opus-5` → `openai-codex/gpt-5.6-sol`. DeepSeek is excluded. Four concurrent worker slots; larger team runs in waves. Astra coordinator owns product decisions, briefs, integration and owner contact. Three implementation workers + reference specialist + two later independent reviewers + Astra coordinator = seven roles, not seven simultaneous workers.

The original source is `snapshots/Kaizen-AI/web/`, pinned91af9e452c7df5867afa7249a6dc58b00003f531. The strategy branch differs only trivially in the inspected dashboard styling, not the dashboard/page or TodayView composition. Refer to actual components and tokens rather than importing an unrelated SaaS template.
