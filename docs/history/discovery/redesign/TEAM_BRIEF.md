# Shared build brief — Kaizen interior

## Why this work exists

Owner: “its trash, make it simialr to the kaizen ai dashboard we had so far the inside product, that was pretty solid to begin with, this is a mishap, mis orgainzied. thinkproperly about each page, each button, sue tasteful design choices and skillfully craft the product. use me as your quali and opinions on things you are cofused about or uncertain”. Owner then authorized a larger specialist team using mainly Astra and Fable, well written prompts and coherent work. This is a real redesign, not recoloring the rejected panels. Owner chooses taste; tests establish behavior, not beauty.

## Product and boundaries

Parent-first schoolwork organization and an independently useful student learning companion. K–8 with K–2 /3–5 /6–8 differences, US EN/ES, math/literacy samples first, human tutors later. Parent actively reviews the student's work and gives feedback. Keep completion, requested assistance, sample replies and parent observations distinct; none proves mastery. Family-authored text stays verbatim in every language.

Frontend-only synthetic data and deterministic local services. No real users, credentials, microphone/audio, LLM or school integration, cloud calls, analytics, storage APIs, purchases, deployment, git changes or original-repository edits. Runtime stays offline and memory-only. A compact persistent demo notice must disclose reset-on-refresh and simulated assistance. Do not fill every screen with warnings; relevant help explains limitations where needed. Developer scenario controls belong in an unobtrusive disclosure. No fake account sync, mastery, gradebook, audio or AI responses. Arbitrary tasks get organization/work history, not pretend tutoring.

Work only under `/Users/man/education-product-discovery/redesign/` and within your owned files. `frontend/`, `design/`, `snapshots/`, originals and all prior evidence are read-only. Candidate data/core JS is copied from current frontend; do not change its domain/service semantics in this design wave. Existing known defects remain unresolved until actually reproduced and fixed with evidence. Local tooling downloads/fonts are permitted only under your assigned scratch/devtools; no new framework or browser installation is required for candidate.

## Exact reference

`/Users/man/education-product-discovery/snapshots/Kaizen-AI/web/`
- `app/dashboard/page.js` lines600–711:240px sidebar, quiet active selection, learner/account context low in rail, main reading/work column, mobile bottom navigation.
- `components/TodayView.js` lines243–359: compact date/greeting, primary action, week strip, one next task, smaller assignment rows.
- `app/globals.css`, `tailwind.config.js`, `app/layout.js`: source tokens/type.
Use these actual source patterns. Do not inherit booking, club billing,13+ eligibility, arbitrary mastery rings, canned cheers or hollow curiosity controls. Current product remains K–8.

## Shared visual rules

Primary surface **Operate**, learning is focused work. Sidebar on desktop; quiet mobile header + safe-area bottom navigation. Main region deliberately sized for its task, not equal-weight cards everywhere. Parent Today should be readable in one glance; supporting details are lower hierarchy. Use human page labels and contextual buttons, not debug IDs.

Use CSS vars exactly: `--paper:#fafaf9; --panel:#fff; --panel2:#f1f1ef; --border:#e4e3df; --ink:#1a1917; --muted:#6b6862; --accent:#a93b5d; --good:#4f7a5b; --warn:#8a6412; --bad:#b3453f; --font-brand; --font-body; --font-mono`. Shell owns definitions. Fonts: Schibsted Grotesk headings, Instrument Sans body, IBM Plex Mono dates if local assets available; intentional local Avenir Next/sans + SFMono fallback. Headings26px desktop/24px phone, section headings20px, body16px, dense metadata14px; avoid tiny illegible microcopy. Inputs10px/cards14px/larger panels20px; primary buttons ink pill, restrained secondary outlines, rose marks selection not every action.44px targets, obvious focus, no gratuitous motion/gradient/glass/rainbow/icon tiles or decorative stats. Use whitespace, alignment and typography before drawing more boxes. Raw IDs belong in optional details, not the primary task heading. Status is readable text, never only color.

Routes stay `today`, `schoolwork`, `plan`, `workspace`, `record`; labels Today / Schoolwork / Plan / Learn / Activity (ES localized). Do not invent Grades without records. Parent and Student are demo views, not authentication. Default parent Bea grade4; seed honest sample records through the service so first opening is useful. No static fabricated statistics. Page subcomponents must have empty/loading/error/recovery states where they perform actions.

## Ownership

- Shell builder: `candidate/app.js`, `candidate/styles.css`, `candidate/index.html`, `candidate/shell-copy.js` (optional), `candidate/assets/` (fonts); `tests/shell.*`, `evidence/shell/`, `handoffs/SHELL.md`.
- Learning builder: `candidate/learning-views.js`, `candidate/learning.css`; `tests/learning.*`, `evidence/learning/`, `handoffs/LEARNING.md`.
- Plan builder: `candidate/plan-view.js`, `candidate/plan.css`; `tests/plan.*`, `evidence/plan/`, `handoffs/PLAN.md`.
- Reference specialist: `reference/`, `REFERENCE.md`, `BUTTON_MAP.md`, `evidence/reference/`, `handoffs/REFERENCE.md`. No candidate writes.
- Coordinator owns core copies, baseline manifest, this brief, integration tests/evidence and root ledgers. No sibling-file writes. No subdelegation. Worker tests must have unique outputs and their own browser/profile/port. Do not stop another process.

## Integration contract — fixed before fan-out

The current app's DOM helpers and service remain the foundation. Learning module publishes `window.KaizenLearning = { workspace(ctx), record(ctx) }`; Plan publishes `window.KaizenPlan = { plan(ctx) }`. Each render function returns an array of DOM Nodes (or one Node). No side effects on module load. A page may hold its own per-learner/per-task view state in a closure but must not create a separate service/store. Use `ctx.run()` for all service commands, never a private dispatcher.

Shell loads scripts in this order: `domain.js`, `demo-service.js`, `copy.js`, optional `shell-copy.js`, `learning-views.js`, `plan-view.js`, `app.js`. CSS: `styles.css`, `learning.css`, `plan.css`. In `VIEWS`, the shell calls module methods with `viewContext()` when present; old view implementations can remain as a temporary fallback. Missing module is not an accepted finished page.

`viewContext()` returns the original helpers by EXACT names:
```
{ D, C, svc, ui, t, tn, learner, isParent, draft, workDraft, obsDraft,
  errorsOf, selectedId, select, sampleOf, titleOf, instructionsOf,
  assistText, taskTitle, h, fk, btn, link, tag, notice, panel,
  fmtDate, fmtTime, subjectMark, stateTag, originTag, errText, errFor,
  countsLine, field, input, textarea, selectEl, formSummary,
  run, render, openDialog, setStatus, sameFields, emptyProp }
```
Use existing signatures from `frontend/app.js`, not guesses. Examples: `h(tag,attrs,...children)` inserts text safely; `btn(label,act,arg,onClick,opts)`; `link(label,route,taskId,cls)`; `run(command,{form,success,onOk,focusNext,...})`; `panel(title,cls,...children)`. `select(taskId,learnerId?)` selects only; use link/router or call render for view changes. `draft()` is learner scoped and retains `.work`, `.obs`, `.prop`, `.edit`. `ui.recordTask[learnerId]` selects the Activity filter. Preserve `data-fk` on interactive controls so focus survives renders. Do not use innerHTML for family text.

Copy: reuse `C` and `t/tn` for existing keys. New page-specific strings belong in your module's local EN/ES dictionary or `tx(en,es)` function based on `ui.locale`; no edits to shared copy.js. Generated strings switch locale; authored words do not. New page CSS uses `.kaizen-workspace` / `.kaizen-record` / `.kaizen-plan` roots and consumes shell tokens; no overriding global chrome. Shared classes `.btn`, `.primary`, `.row`, `.stack`, `.panel`, `.muted`, `.field`, `.notice`, `.tag`, `.sr-only` remain available.

Service query includes `listTasks(learnerId,filter)`, `task(id)`, `session(taskId)`, `observations(taskId)`, `record(taskId)`, `learnerRecord(learnerId)`, `plans(learnerId)`, `planConflicts(plan)`, `proposals(learnerId)`, `proposalState(id)`, `schedule(learnerId)`, `todayForParent(learnerId)`, `todayForStudent(learnerId)`, `today()`; `.store()` is read-only inspection. All command types/signatures are in current `frontend/demo-service.js` lines27–44. Plan decisions must carry the exact reviewed planId.

## How to work and hand off

1. Read only your relevant reference and source slices. Define what each visible control does. Refute a mistaken assumption with source evidence rather than implement it blindly.
2. For changed behavior, write a small test and run it red, then implement and verify green. For visual work, produce working code early; screenshots are essential. Do not equate text-source assertions with browser behavior.
3. Save a usable partial artifact early. Budget builder30 tool calls OR25 minutes, reference12 calls OR10 minutes. Return at the limit with exact gaps, not an extended timer. These are checkpoints, not promises of completion.
4. Use installed `devtools/browser/node_modules/@playwright/test` and Chrome `/Users/man/.agent-browser/browsers/chrome-153.0.8010.52/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`. Build your standalone module harness under your evidence path if shell is not ready; do not wait/poll on another builder. Syntax-check every JS file. Preserve all test outputs in unique run dirs. No test weakening or invented execution output.
5. Handoff: exact files, what works, actual commands/results, screenshot paths, unresolveds, any helper-contract mismatch, and at most two important owner questions if genuinely needed. Stop writes before returning. Coordinator integrates/verifies and a separate reviewer follows. You do not close owner tasks or approve your own product.

## Prompting practice

These briefs follow Anthropic's current prompting guidance: explicit deliverable and success criteria; context/motivation; reference examples; separated source/constraints/ownership; concrete steps and independent verification. Do not ask for generic 'world-class' output or huge hidden reasoning transcripts. Report concise decisions and observed facts. Claims are tied to artifacts, not the model name. Sources: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices and https://hermes-agent.nousresearch.com/docs/user-guide/features/delegation .
