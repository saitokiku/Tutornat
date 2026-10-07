# FRONTEND_SPEC_INTERACTION — Fable spec-interaction review (AC04 / AC05 / AC06 / AC07)

**Verdict: CHANGES_REQUIRED** (scoped to interaction/responsive/accessibility ACs; app read-only, nothing modified).

Artifact: `frontend/index.html` + `app.js`/`styles.css`/`copy.js`/`demo-service.js`/`domain.js` (file://, zero deps).
Evidence (raw, never deleted): `evidence/frontend-spec-interaction/`
- `spec-interaction.e2e.cjs` — long-history probe (own CDP copy of `frontend/tests/journey.e2e.cjs`; real pointer/keys, read-only `window.__demo`, capture-phase keydown logger that records but never suppresses keys).
- `run-2026-10-01T14-34-48-149Z/` — main run: `log.txt` (66 checks), `report.json` (49 checks + async/keyboard/contrast/targets data, flushed per step), `tablogs.json` (83 Tab steps with active-element rect/hit/nav/toast cover per key), `contrast.json`, `targets.json`, 7 PNGs. The run was cut by the tool's 420 s cap during the 320 step, so the 320-step checks exist in `log.txt` only; the 768 + aggregate steps were re-run by `mini-probe.e2e.cjs`.
- `run-2026-10-01T14-26-54-950Z/` — first attempt (same cap, PNGs only; kept as-is).
- `mini-probe.e2e.cjs` → `mini-2026-10-01T14-44-53-540Z/` — retry activation, dialog wrap, 320/390/768 sweep (18 states), 44 px audit (13 states / 268 controls), contrast at 320 K2 + 390 error toast, skip link at 390, 13 PNGs. 24 checks.
- `tag-overflow.e2e.cjs` → `tag-overflow-2026-10-01T14-49-07-070Z/` — numeric confirmation of the clipped tag seen in the 320 screenshot. 4 checks.
- `FINDINGS-PRELIM.md` — static hypotheses written before the runs (6 of 6 confirmed or refined below).

Programmatic counts: **94 raw checks** (66 + 24 + 4), **17 failed**, of which **5 are probe artefacts** (explained in §4) and **12 are app findings** collapsed into the 8 items below. 651 contrast measurements / 134 unique colour pairs across 8 rendered states; 393 target measurements across 18 states; 83 logged Tab/Shift+Tab steps at 390 + two further chains at 320 (log only); 0 Unidentified key events; 0 exceptions, 0 console errors, 0 external requests in all three runs.

## 1. Findings (priority order) — exact reproductions

### F1 — AC04 HIGH — a pending create resolves against the *current* learner, wiping another learner's draft and selecting a foreign task
Repro (1440, parent, scenario **delayed**): Bea → Schoolwork → Add task → title "Bea delayed task", subject other, due 2026-10-09 → Create (pending) → switch learner to Cal → Add task → type "Cal essay", caret moved 2 left → wait for the Bea op to finish.
- Expected: Bea's task is created; Cal's open form, text "Cal essay", caret 7 and focus in `#new-title` are untouched; `ui.selected['lrn-68-cal']` unchanged.
- Actual (`report.json → async.originIdentity`): during race `pending:["create:lrn-35-bea"], learner:"lrn-68-cal", value:"Cal essay", sel:[7,7], active:"new-title"`; after completion `formOpen:false, value:null, active:"view-h", selected:{"lrn-68-cal":"task-7"}` where `task-7` is **Bea's** new task; reopening Add task shows `""` — Cal's draft text is gone.
- Cause: `app.js:359` `onOk` reads `ui.learnerId`/`ui.drafts[ui.learnerId]` at completion time and calls `select()`/`ui.newForm=false`/`focusNext` unconditionally; same shape in `editTask` `onOk` (`:360`, closes whatever edit form is open now).

### F2 — AC04 HIGH — late completions steal focus from a field being typed
Repro (1440, student Bea, custom task started, scenario **delayed**): click Hint (pending) → click `#ws-step`, End, type "typing while hint pending" → wait.
- Expected: focus and caret stay in `#ws-step`.
- Actual (`async.helpSteal`): value kept and caret numerically restored, but `active` became `help:hint` (focus pulled out of the textarea mid-typing). Cause: `app.js:88` applies `opts.focusNext` on every completion regardless of where the user is now.

### F3 — AC04 MEDIUM — heading focus is dropped by any unrelated async re-render
Repro: scenario delayed → Cal create pending → switch to Bea → Nav "Plan" (focus → `#view-h`) → Cal op completes.
- Expected: focus stays on `#view-h`. Actual (`async.headingFocus`): `view-h|Shared plan` → `body`. Cause: `render()` (`app.js:410-419`) only restores elements with `data-fk`; `#view-h`, `#main`, `<summary>`, error-summary links and schedule links have none. A keyboard user loses their place after every service event/status auto-dismiss.

### F4 — AC06/AC07 HIGH (phone keyboard) — Shift+Tab lands focused controls under the sticky nav
Repro (after the full desktop history; 390×844 mobile, parent Schoolwork with the new-task form open, toast closed; chain of real Shift+Tab presses from the scenario panel upward).
- Expected: each focused control fully visible. Actual (`tablogs.json → 390-reverse`, `keyboard.390-reverse.occluded`): `new-title rect[25,0,340,44]` nav `[0,57]` cover 0.99, `elementFromPoint` = nav `<a>`; `task-select/task-edit/task-archive:task-1` cover 1.0. Screenshot `22-390-reverse-occluded.png`: nav visible, the focused Title input is not. At 320 (log.txt): `go-record:task-1`, `load-sample` 99–100 % under nav; `new-cancel/new-submit/task-*:task-5` 22–28 % partially covered.
- Cause: only `main`/`#view-h` have `scroll-margin-top` (`styles.css:84-85`); nav is `position:sticky; z-index:20` (`:78`). Forward chains were clean (0 occluded of 40 stops at 390).

### F5 — AC06/AC07 HIGH (phone keyboard) — fixed status toast covers controls reached by Tab at ≤420 px
Repro (320×844, error toast "Check the highlighted fields." showing; forward Tab chain).
- Actual (log.txt, 320-forward): `task-select/edit/archive:task-3 rect y=800 h=44`, toast `[760,828]` → 64 % covered, hit = `div.status`; `task-new` 89 %, `load-sample` 60 %; reverse: `reset-learner` 100 % under the toast. Screenshot `31-320-forward-occluded.png` shows the red toast over the "Read chapter 4" row buttons. At 390 the error toast (`[707,828]`, 121 px tall because the full-width toast wraps) covered `go-workspace:task-1`, `go-record:task-1` (`keyboard.390-error-toast`).
- Expected: nothing actionable sits under the toast when focused (scroll-padding-bottom / inline placement / non-overlapping toast). Note the toast persists for errors/retry/undo by design, so this is the common case on a phone.

### F6 — AC07/AC05 MEDIUM — role and EN/ES segmented buttons are 36 px tall everywhere
Measured (`targets.json`, `mini → targets.SUMMARY`): role `60×36`/`70×36`, locale `44×36` in all 13 phone states (320/390) and `68×36`/`78×36`/`47×36`/`44×36` at 1440. Cause: `.seg button { min-height: calc(var(--target) - 8px) }` (`styles.css:64`) = 36 px. These are the AC05 language controls. Everything else audited was ≥44×44 (393 measurements) except inline text links (error-summary links, schedule task links, 22 px tall — listed as inline exemption candidates, not counted).

### F7 — AC06 MEDIUM — 320 px workspace: origin tag is clipped and cannot be scrolled into view
Repro: student (K2 Ari or 3–5 Bea) → Today → big Start → workspace at 320. `tag-overflow-…/report.json`: `.tag "REVIEWED SAMPLE (SCRIPTED HELP AVAILABLE)" width 314, right 339 > viewport 320 and > panel right 308; white-space:nowrap`; `body { overflow-x:hidden }` hides it so the text is unreachable (inaccessible overflow). Visible in `mini-…/320-k2-workspace.png` ("…HELP AVAILABL"). Clean at 390. Every other 320/390/768 state measured `scrollWidth == maxRight == configured width` (28 states; `innerWidth` matched the configured width in all of them).

### F8 — AC07 MEDIUM — focus ring invisible on the error toast; secondary button borders < 3:1
Measured (`contrast.json`, canvas-resolved computed colours, alpha-composited): focus ring `--ring #007979` on error toast `#b00c15` = **1.38:1** (Retry/Close inside an error toast are the keyboard-reachable recovery controls); on dark toast 3.31:1 (pass, marginal); on page/card/quiet/brand-soft 4.42–5.24 (pass). Non-text: secondary `.btn`/tally border `#a9a49c` on white 2.48:1, on quiet 2.28, on selected row 2.09; toast Close border 1.83:1 on red. Input/select/textarea borders and placeholders all ≥3:1. **All 100 text pairs pass**: lowest `.tag.warn`/disclosure `strong` 6.05:1, primary buttons 6.78:1. Decorative panel borders and disabled controls were excluded deliberately.

### F9 — LOW — selection direction not restored after async re-render
`async.statusDismiss`: value, caret [22,24], focus all preserved across the 6 s status auto-dismiss re-render, but `selectionDirection` `backward → none` (`setSelectionRange` without direction, `app.js:422`).

## 2. What passed (scoped)
- AC04: unsaved edit survives route round-trip (`Today→Schoolwork`), locale EN→ES→EN keeps typed drafts (new-task title, student step), role round-trip keeps the open form, learner switch never leaks drafts (Cal saw `""`), typed drafts survived the 1440→390 and →320 transitions plus 180+ key events; caret/value/focus preserved across the status auto-dismiss re-render.
- AC05: EN/ES controls are a labelled `role=group` with `aria-pressed`, `lang`, keyboard-toggle by Space with focus retained, `html[lang]` switches, ES disclosure carries the review note. K2 Today at 320: big next action ≥60 px, grown-up note, all main controls ≥44 px; K2 workspace at 320 all controls ≥44 px (except the F6 header segs). Spanish wording **not** validated.
- AC06: no horizontal overflow at 320/390/768 in 28 measured states (configured width = `innerWidth` recorded each time); 768 is a clean single column (`768-*.png` inspected), 390/320 stack cleanly apart from F7.
- AC07: skip link first on fresh load at 390, Enter → `#main`, next Tab lands on a visible control (nav cover 0), Shift+Tab walks back to the nav; Enter submits with field-level errors (`aria-invalid`, `*-err`, `role=alert` summary, focus to first invalid field, summary links operable by Enter); form Cancel by Space returns focus to Add task; Retry, Undo and pending-op Cancel each reachable by Tab and operated by Enter/Space (Cancel by Space cancels without applying the late result; Undo by Enter restores); dialog opens with focus on Cancel, Tab/Shift+Tab cycle only dialog buttons (focus leaves to UA chrome between cycles — native Chrome behaviour, no page control reachable), Escape closes and returns focus to the originating Archive button (3/3 across runs); live regions: pending/ok in `role=status aria-live=polite`, errors mirrored to an assertive `role=alert`; `prefers-reduced-motion: reduce` collapses the busy spinner to 0.01 ms (0.8 s otherwise).
- Phone-stall regression (this app's own long history): 83 logged Tab steps at 390 + two 320 chains, max 142 ms per key, 0 Unidentified keys, no CDP timeout. The historical `design/` PHONE-STALL was not touched and is not evidence about this app.

## 3. AC mapping
| AC | Result | Items |
|---|---|---|
| AC04 drafts/caret/focus/origin identity | CHANGES_REQUIRED | F1, F2, F3, (F9 low); the rest pass |
| AC05 EN/ES controls, K2 targets/adult note | CHANGES_REQUIRED (minor) | F6 (36 px language/role controls); otherwise pass |
| AC06 1440/768/390/320, overflow, sticky occlusion | CHANGES_REQUIRED | F4, F5, F7; layouts otherwise intentional, no overflow |
| AC07 targets/contrast/keyboard/dialog/motion/errors | CHANGES_REQUIRED | F4, F5, F6, F8; keyboard flows, dialog, live regions, errors, motion pass |

## 4. Probe artefacts (failed checks that are NOT app defects)
1. "390 forward Tab: first stop is skip link" — the probe clicked the disclosure to reset the sequential-focus start point, so Tab started after it; the skip link was confirmed first on a fresh load (mini).
2. "reduced motion 0.01ms" — Chrome reports `1e-05s` (== 0.01 ms); effective pass.
3. "field-level error after Enter (1440)" — probe set scenario `unavailable` before the validation submit, so the service returned unavailable instead of validation; the same check passed at 390 under `normal`.
4. "Enter on Retry (big run)" — retry is dispatched via `svc.retry` without a `pendingKeys` entry, so the probe's settle did not wait; the mini run reproduced Enter-on-Retry creating exactly one task. Keyboard retry: PASS; the big-run failure is a wait artefact.
5. "dialog Tab stays inside (big run)" — focus briefly goes to the UA/body between wraps; no page control is reachable (mini confirmed `cancel→confirm→cancel→confirm→body`).

## 5. Limitations / untested
No assistive-technology or screen-reader certification; headless Chrome for Testing 153 only, no native device, no touch/VoiceOver; Spanish copy correctness not validated; dialog Tab-wrap behaviour is UA-specific; 768 target audit not run (768 widths/screenshots only); 1440 contrast measured in 6 states, phone contrast in 2 (K2 workspace, error toast); the main probe exceeded the tool's 420 s cap, so its own aggregate step did not run inside it (aggregation performed from its per-step flushes plus the mini run). Parent tasks were not marked complete.
