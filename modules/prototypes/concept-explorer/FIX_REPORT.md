# Fix report — spec repair (worker: claude-fable-5-1)

Scope: the eight repairs in `SPEC_REVIEW.md`, implemented one TDD slice at a time inside `design/` only. No packages, no network, no config/browser changes, no commits. Logs 01–31 and `evidence/parent-spec/red-before-fixes.json` are untouched (still `{"passed":11,"failed":16,"total":27}`). `SPEC_REVIEW.md` and `tests/spec.e2e.cjs` were not edited.

## Code changes

### model.js (pure, tested)
- `checkFinalAnswer(text, spec)` — explicit parser, no eval. Accepts only: a bare number; `expr = number` where `expr` is the task's own left side (ASCII or typographic minus, whitespace-insensitive); `variable = number` / `number = variable` for the task's own variable. Returns `match | mismatch | ambiguous | unparsed`. Suffix text (`112`, `1225`, `16`), negatives and wrong values are `mismatch`; lists like `225 or 235` / `6, 7` are `ambiguous`; negations, intermediate steps (`13 − 8 = 5`, `3x = 18`), other variables and arbitrary expressions are `unparsed` (kept on the board, not marked wrong).
- `correctExtractedTask` — only `due` is correctable (anything else throws), ISO dates are validated, and the confirmed/corrected date is written to the actual shared task with `dueSource: 'parent_corrected' | 'parent_confirmed'`. `extracted.corrections` provenance is unchanged.
- `derivePlanItems(state)` — three plan items `{key, taskId, due, date, source:'ai_draft'}` derived from the confirmed task and its deadline (`midway` = day before the deadline, UTC calendar arithmetic). Throws until a parent confirms. Draft/accept/decline semantics unchanged: `createDraftPlan` → `acceptDraftPlan` only.

### app.js
- Answer checking uses `M.checkFinalAnswer` with each task's `check` spec; four truthful replies (`match` still says assisted practice / not mastered; `unparsed` says what can't be checked).
- K–2 ten frames: `tenFrames(a, b)` renders ceil((a+b)/10) frames with `data-fill="a"/"b"` for every unit (7 + 5 → 7 + 5 across two frames) and an accurate `aria-label` (“…first ten frame is full; 2 more in the second frame”). The K–2 scaffold is labelled “Grown-up scaffold — a way to count, not the answer” and no longer counts through to twelve; the second hint no longer states the answer either.
- Evidence model: per-task sessions (`ui.sessions[taskId]`). Person-typed turns/steps are stored verbatim. Scripted turns, hints, checker replies and plan items are stored as keys/indices and rendered in the current locale, so `lang` no longer clears anything. Observations are never translated.
- Voice scripts are keyed by task (`VOICE[locale][taskId]`): new literacy scripts for `35-read-summary`, `68-essay-claim`, `k2-read-sounds` with task-specific hints/steps. Organized-only tasks disable Play with a visible notice and keep the typed path (`replyOrganized`). Switching tasks switches sessions/boards; nothing replays across tasks.
- Draft plan is `M.derivePlanItems(state)`; `PLAN_COPY[locale][taskId][key]` renders text from the confirmed date (no hardcoded weekdays). Student task rows and due labels show “deadline corrected/confirmed by parent”.
- Parent parity: `blockReplay()` (child's boards + turns per worked task) is in A, B and C; `flagList()` is in A (overview), B (inside the work panel) and C (inside the plan); `proposalList(true)` decisions are in A (overview), B (work panel) and C (plan). Each concept keeps a different composition; all forms (observe, sample intake, extract confirm/correct, draft ask/accept/decline) remain in every concept.
- Copy: caption/voice labels say scripted *text*, no sound; literacy reply names only the parent-visible board/turns; teacher-feedback intake is described as sample-only with no pasted notes or real student data (EN + ES).

### styles.css
- Segment buttons 2.75rem (44px) min-height/width. Removed the phone sticky companion panel for concept B (the boundary banner stays sticky). Added `.tenframes` wrapper (wraps on phones) and `.replay-task` separators; concept A parent grid gains a `replay` area.

## Tests added (all observed red before the fixes, green after)
- `tests/model.repair.test.cjs` — 8 tests: checker valid/invalid forms, no-eval, shared-deadline propagation + provenance, narrow validation, derived plan + explicit acceptance/decline, month-edge date. Red: `evidence/32-model-repair-red.log` (0/8). Green: `evidence/33-model-repair-green.log` (8/8).
- `tests/repair.e2e.cjs` — 50 real-control checks (pointer events on actual buttons/forms, isolated headless Chrome on `--remote-debugging-port=0`, TMPDIR profile removed on exit): wrong/ambiguous/negated/intermediate math in EN and ES, K–2 frames + description + scaffold/hints, full literacy script in B then locale switch (MY_OWN_UNIQUE_NOTE survives, scripted turns re-render in Spanish), parent replay, task-switch isolation, organized-only demo, corrected deadline → derived plan → accept → student → Spanish, confirm-as-shown + decline, parent parity A/B/C, honest copy EN/ES, phone 44px + `elementFromPoint` hit-testing across 5 band/concept/locale combos. Red: `evidence/34-repair-e2e-red.log` (11/50). Green: `evidence/36-repair-e2e-green.log` (50/50). One of my own assertions was tightened after a false negative in the regex (it matched the word “accept pasted notes”); no coordinator assertion was touched.

## Verified results (exact commands, final run)
- `node --test tests/model.test.cjs` → 12 pass / 0 fail (`evidence/38-model-final.log`)
- `node --test tests/model.repair.test.cjs` → 8 pass / 0 fail
- `npm run check` → pass
- `node tests/ui.e2e.cjs` (port 9333 confirmed free before start) → 36 desktop + 6 mobile configurations, 24 checks passed / 0 failed (`evidence/37-ui-e2e-after.log`)
- `node tests/spec.e2e.cjs` → 28 passed / 0 failed / 28 total (`evidence/35-spec-e2e-after.log`, `evidence/parent-spec/report.json`). The 28th check is “B approval reaches shared plan”, which now runs because B exposes proposal decisions.
- `node tests/repair.e2e.cjs` → 50 passed / 0 failed
- No owned Chrome processes or `edu-*` profiles left behind.

## Screenshots (settled, reduced motion)
- `evidence/parent-spec/k2-visual-desktop.png` (coordinator harness, after fixes) and `evidence/parent-spec/repair-k2-visual-desktop.png`: two ten frames, 7 teal + 5 amber, labelled scaffold, two hints without the answer.
- `evidence/parent-spec/workspace-mobile-scrolled-to-task.png` (coordinator harness) and `evidence/parent-spec/repair-workspace-mobile-scrolled-to-task.png`: concept B phone, Start fully visible, no sticky panel.
- `evidence/parent-spec/repair-k2-mobile.png`: K–2 phone, both frames visible within 390px.

## Gaps / not claimed
- `window.__companionDebug.ui.turns` now returns the rendered (localized) view of the focused task's session; existing debug-dispatcher tests still pass, but any external script relying on mutating `ui.turns` would not.
- Spanish copy remains draft copy for native review; no screen-reader, cross-browser or production/privacy validation was performed. Completion/match replies remain assisted practice; 48–72h/day-7 checks remain planned, not validated.
- Coordinator must rerun and inspect before any further review; nothing here is self-approved.
