# PLAN handoff — Kaizen Plan page module

Builder: Fable (plan-view). Status: module complete and tested in a private harness; **not integrated** into `candidate/index.html` / `candidate/app.js` (coordinator owns those). No self-approval claimed.

## Files (owned, written)
- `redesign/candidate/plan-view.js` — publishes `window.KaizenPlan = { plan(ctx) }`; no load-time side effects, no store/dispatcher; module-local EN/ES dictionary (51/51 keys, parity checked).
- `redesign/candidate/plan.css` — all rules under `.kaizen-plan`; Kaizen token names first (`--paper/--panel/--panel2/--border/--ink/--muted/--accent/--good/--warn/--bad/--font-mono`) with current-shell fallbacks, so the page inherits the shell palette the moment the shell ships those variables.
- `redesign/tests/plan.spec.cjs` — 6 behaviour tests × desktop(1440×1000)/phone(390×844, touch); 320 px overflow check runs once (phone project).
- `redesign/tests/plan.config.cjs` — own Playwright config: port **4391**, fresh `RUN_DIR`, Chrome for Testing path, pinned devtools Playwright 1.63.0.
- `redesign/tests/plan.harness.cjs` — builds `redesign/evidence/plan/harness/` from `frontend/` (copy) + candidate module, injects `viewContext()` + `VIEWS.plan` override **into the copy only**.
- `redesign/evidence/plan/runs/01-red … 07-green` — every run preserved (results.json, traces on failure, screenshots).

Not touched: `frontend/**`, `candidate/app.js|index.html|styles.css|domain.js|demo-service.js|copy.js`, snapshots, design, original evidence, git/global config.

## What the page is (Operate surface)
Left (main): week navigation (Previous / range in mono / Next / "This week" only when moved) → 7-column week grid, today marked with the accent rule → legend → **Before {week}** (past-due tagged) and **After {week}** lists so nothing outside the shown week disappears. Phone: the same days render as a vertical agenda (empty non-today days collapse); 320 px verified no sideways scroll.
Chips are the only interaction in the grid and they **select**; nothing reschedules by drag. Three kinds a parent can tell apart: **DUE** (solid ink rule — the real deadline), **WORK** (quiet fill — a day set aside by the accepted plan), **SUGGESTED** (dashed — a draft not yet accepted). Work days never rewrite due dates; only domain accept commands change records.
Right (side), contextual: decisions (one line + one button when nothing waits; a bordered panel only while a suggestion is pending; stale suggestion = warning + exact conflict lines + **no Accept button**), accepted plan (quiet panel with id/time and a Work-days disclosure), selected task (subject mark, state, work/suggested day, links to Workspace / Schoolwork / Record, "due dates change only in Schoolwork (Edit) or by accepting a proposal"), date proposals (record line → verbatim reason → Accept/Decline for parents; form for 6–8 students, prefilled from the selected task via "Propose a new date for this task"), band-honest student note (K–2 / 3–5 / 6–8), **Past decisions** as a `<details>` disclosure (one row per plan id + decided proposals).
The automatic draft is labelled "by the demo rule … Not AI" in the panel and in the resting explanation line.

## TDD trail (red → green)
| run | result |
|---|---|
| `runs/01-red` | 1 failed (module missing: `.kaizen-plan` absent) |
| `runs/02-green` | 2 passed (week test, desktop+phone) |
| `runs/03-red` | draft + proposal tests fail (no `.kp-draft`, no `#prop-taskId`) |
| `runs/04-green` → `05-green` | 8 passed after implementing decisions/proposals (one assertion reworded `stale`→`out of date`, one `editDue` locator fixed to `data-fk="task-edit:<id>"`) |
| `runs/06-green` | new history/declined test RED (button label `Request a suggested plan` when a plan exists) → fixed label logic |
| **`runs/07-green`** | **11 passed, 1 skipped (320 px check is phone-only by design), 0 failed — 19.1 s** |

Command (from project root):
```
RUN_DIR=redesign/evidence/plan/runs/<fresh> node devtools/browser/node_modules/@playwright/test/cli.js test -c redesign/tests/plan.config.cjs
```
Syntax: `node --check redesign/candidate/plan-view.js` OK. Module has no innerHTML/eval/fetch/storage/timers.

## Screenshots (inspected) — `redesign/evidence/plan/runs/07-green/screenshots/`
`week-desktop.png`, `week-phone.png`, `draft-stale-desktop.png`, `draft-stale-phone.png`, `plan-accepted-desktop.png`, `plan-accepted-phone.png`, `student-proposal-desktop.png`, `student-proposal-phone.png`, `proposal-accepted-desktop.png`, `proposal-accepted-phone.png`, `narrow-320.png`.
Caveat: the harness copies **current `frontend/styles.css`**, so chrome/teal brand in the screenshots is the inherited shell, not the Kaizen palette; plan.css will read Kaizen tokens once the shell defines them.

## Helper-contract notes
- Consumed from ctx exactly as listed: `h, svc, ui, t, tn, learner, isParent, draft, selectedId, select, titleOf, taskTitle, btn, link, tag, notice, panel, fmtDate, fmtTime, subjectMark, stateTag, render, run, C, D, field, input, textarea, selectEl, formSummary, errorsOf, errText, errFor, sameFields, emptyProp`. Unused but accepted: `workDraft, obsDraft, sampleOf, instructionsOf, assistText, fk, originTag, countsLine, openDialog, setStatus`.
- Shared state written: `draft().prop.{taskId,due,reason}` (same per-learner prop draft as the old page, so Today's "Review in Plan" and locale/route/learner switches keep typed text — tested), `ui.focusNext` (as the shell's own views do). Stable `data-fk`: `prop-taskId/prop-due/prop-reason/prop-send`, `draft-request/draft-accept/draft-decline`, `prop-accept:<id>/prop-decline:<id>`, `kp-due:<taskId>/kp-work:<taskId>/kp-draft:<taskId>`, `kp-prev/kp-next/kp-this`, `kp-propose:<taskId>`.
- Shared copy keys reused: `plan_h, due, past_due, draft_redraft, draft_accept, draft_decline, plan_drafted/accepted/declined, current_prov, conflict_due/archived, prop_*, props_empty, history_empty, k2_adult_note, open_in_workspace, open_in_record, f_archived, f_limit, items`. If the shell renames nav labels (Learn/Activity) via shell-copy, these keys follow automatically.
- No mismatch found; the injected `viewContext()` in the harness is the brief's list verbatim.

## Gaps / unresolved (honest)
1. **Inherited phone race** (devtools README "rapid role-switch"): a Parent click right after an async completion was swallowed once per phone run. The spec retries once and logs `[plan.spec] role click … inherited shell defect`; not fixed, not hidden.
2. Integration into `candidate/index.html` (`plan.css` link, `plan-view.js` before `app.js`) and `VIEWS.plan → KaizenPlan.plan(viewContext())` is the coordinator's step; harness proves the wiring works.
3. Weeks start Sunday (Kaizen calendar convention) in both locales; Monday-start for ES was not decided.
4. Grid columns for days with nothing due are intentionally empty (rules, no filler); on a quiet week the desktop grid is mostly blank — the empty-week state has its own copy. Owner may prefer a denser two-week view.
5. The shell status toast overlaps page content on phone (shell-owned).
6. ES strings in the module are author-written; a native review pass was not done.

Writes stopped after `runs/07-green`.
