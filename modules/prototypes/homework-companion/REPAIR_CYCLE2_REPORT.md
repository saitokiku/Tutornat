# Repair cycle 2 — core handoff (F2-01 retry/reset lifecycle, F2-02 create/intake selection)

Writer: single Fable/max application writer. Scope was narrowed mid-run by owner course correction to **F2-01 and F2-02 only**;
F2-03…F2-07 work that already existed at that moment is **retained, not reverted**, and enumerated below for dedupe at integration.
Application writes stopped after this report. No git, install, network, storage, framework or curriculum changes. Not a whole-product
self-certification; coordinator owns acceptance.

## Outcome (core)

| ID | Status | Red → green evidence | Final verification |
|---|---|---|---|
| F2-01 retry identity / reset lifecycle (R03/AC04) | Implemented | `evidence/repair-cycle2/red-slice1-service.log` (7 new tests: 0 pass / 7 fail on repair-1 source) → `green-slice1-service.log` (7/7) | `final-core-run/unit-all.log` 60/60; `final-core-run/repair-cycle2-e2e` F2-01a–d all PASS; reviewer `service-negatives.cjs` **byte copy** run from `full-regression-run1/service-negatives-copy/` with repaired `APP_ROOT`: 23/23 (S01/S02/S06 now safe); coordinator C1 `coordinator-extra-v2.cjs` 11/11 (`full-regression-run2-sequential/coordinator-extra-v2`) |
| F2-02 newer same-learner context survives late create/intake (R01/AC04) | Implemented | Browser only (no service change): first run `e2e-cycle2-run1` F2-02a–d PASS on repaired source; repair-1 baseline fails this exact sequence as coordinator C2 (7/11) in `evidence/frontend-repair1-verification/` | coordinator C2 11/11 as above; `final-core-run/repair-cycle2-e2e` F2-02a (C2 sequence), b (intake), c (same-role selection of C), d (unchanged context still selects + focuses) PASS |

Counts, final source: `node --test frontend/tests/*.test.cjs` → **60/60** (49 original + 11 new; original files byte-identical, see hashes).
`repair-cycle2.e2e.cjs` → **61/61** (26 core F2-01/02 checks, 32 out-of-scope checks, 3 harness-wide: no external requests / exceptions / console errors), 59 s, 6 screenshots.

## What changed (core)

`frontend/demo-service.js` (3 hunks)
- `logical` map keyed by `rootId` (first attempt id): `{ deps (original snapshot), status, retryable }`. `run()` reuses the original
  snapshot for every retry; only a first attempt snapshots.
- `invalidation(deps)` is checked **before** `service_failed` is reported and again inside `retry()` → `superseded` (not retryable).
- `retry(id)`: accepts the original attempt id or any retry id of the chain; refuses `applied` chains with **`not_retryable`**
  (new code), in-flight chains with `duplicate`, non-retryable failures with `not_retryable`. Nothing mutates on refusal.
  `finish()` records history/logical status directly (no subscriber side channel); events carry `rootId`.
- Protected contracts kept: cancel→retry applies once; fail-once→retry succeeds; identical later dispatch still allowed.

`frontend/app.js` (core hunks: ui state `resetGen`; `resetGenOf/context()/maySelect()`; `run()` obsolete-completion guard;
reset dialog; create `onOk/focusNext`; intake `onOk/focusNext`; `window.__demo` adds read-only `retryOffered`, `resetGen`)
- Every dispatch origin captures `resetGen` (per learner) and the owner's `selected` task. Reset bumps `resetGen`, drops a
  `lastFailed` whose origin learner was reset, then resets the service. A completion whose learner was reset since dispatch
  returns early: no status/error/draft/focus change and no Retry (`F2-01a/b`); other learners' operations continue (`F2-01c`).
- `maySelect(origin, owner)`: late create/intake selects its task only if the owner's selection is unchanged since dispatch, the
  role is unchanged, and the owner is not currently viewed in a task-bound view (Workspace/Record). Record creation is never
  suppressed; focus moves to the new row only when it was actually selected (`F2-02a–d`).

`frontend/copy.js` — `e_not_retryable` EN/ES (allowed retry error key). `frontend/FRONTEND_BACKEND_CONTRACT.md` — error codes
`not_retryable`, `duplicate` and the retry-chain semantics (rule 5).

New tests: `frontend/tests/repair-cycle2.test.cjs` (lines 1–93 core: 7 F2-01 service tests incl. createTask + addStep chains,
duplicate concurrent retries, old-id retry after descendant success, cancel→retry, reset-while-pending),
`frontend/tests/repair-cycle2.e2e.cjs` (harness helpers byte-copied from `repair-cycle1.e2e.cjs`; lines 92–170 core cases).

## Out-of-scope hunks that ALREADY EXIST (for dedupe; not reverted per owner instruction)

| File | Hunk (diff vs frozen repair-1 snapshot, `evidence/repair-cycle2/core-handoff/*.diff`) | Belongs to |
|---|---|---|
| `domain.js` | `createTask` accepts `opts.generated` → `task.generated`; `editTask` prunes `generated` for changed fields (`null` when none left); `loadSample` passes `{title, instructions}` provenance `{key, version}` | F2-03/F2-04 |
| `copy.js` | `ws_tally_text` → `ws_tally_text_one/_other` EN+ES | F2-07 |
| `copy.js` | `rec_student_p_35` EN+ES; `ws_shared_record_h` EN+ES | F2-05 / F2-06 |
| `app.js` @@ -31 | `genField()`, provenance-based `titleOf/instructionsOf` (sampleOf capability left narrow), `editDraftFor()` baseline snapshot | F2-03/F2-04 |
| `app.js` @@ -293 | edit button / edit panel use `editDraftFor` | F2-03 |
| `app.js` @@ -444 **mixed hunk** | first half = core F2-02 create `onOk`; second half = edit submit compares against `values.baseline` (F2-03) | F2-02 + F2-03 |
| `app.js` @@ -329 | parent Workspace counts label `ws_shared_record_h` | F2-06 |
| `app.js` @@ -338 | tally save uses `tn('ws_tally_text', n)` | F2-07 |
| `app.js` @@ -427 | student Record disclosure `rec_student_p_35` for band 35 | F2-05 |
| `tests/repair-cycle2.test.cjs` lines 95–137 | F2-04 domain provenance, F2-05/06/07 copy tests (red 4 fail → green, `red-slice3-4-domain-copy.log` / `green-slice3-4-domain-copy.log`) | F2-03…07 |
| `tests/repair-cycle2.e2e.cjs` lines 171–270 | F2-03a/b/c, F2-04a/b, F2-05, F2-06, ADAPTER R14 (learner-prefix count), F2-07 cases — all PASS in `final-core-run` | F2-03…07 |

Known consequence of the existing F2-05 copy hunk: `frontend/tests/repair-cycle1.e2e.cjs` R13 "visibility statement names shared
classes" EN+ES now fail for grade 3–5 (expects the word "proposals"): **71/73** in `full-regression-run2-sequential/repair-cycle1-e2e`.
Per plan this needs a separately named adapter from the F2-05 builder/integrator; the old run is preserved, the original file untouched.

## Evidence index (all under `frontend/evidence/repair-cycle2/`, never overwritten)

- `red-slice1-service.log`, `green-slice1-service.log`, `unit-after-slice1-service.log` — F2-01 TDD.
- `red-slice3-4-domain-copy.log`, `green-slice3-4-domain-copy.log`, `unit-after-slice1-4.log` — out-of-scope TDD (retained).
- `e2e-cycle2-run1/` + `.stdout` — first browser run 51/56; 3 failures were test-harness grep defects (fixed in the test only), 1 was
  the F2-01c single-status-bar expectation (see gaps), none required app changes beyond those already made.
- `full-regression-run1/` (parallel, **before** the course correction): unit 60/60, adversarial-domain 16/16, service-negatives copy
  23/23, adversarial-ui-v2 20/20, proposal-ui 4/4, journey 97/97, coordinator-extra-copy 13/13 (tally singular now passes),
  copy-review 51/52 (the adjudicated R14 regex artifact, preserved), repair-cycle2-e2e 61/61. Three harness failures from launching
  8 Chromes at once (`webSocketDebuggerUrl` undefined) and a missing `timeout` binary → rerun sequentially:
- `full-regression-run2-sequential/`: repair-cycle1-e2e 71/73 (R13 copy, above), coordinator-extra-v2 11/11,
  spec-check-r15-r22 **81/81 complete** in 74 s (python watchdog 150 s). No further matrix runs after the owner message.
- `final-core-run/`: `node --check` all changed files OK, `unit-all.log` 60/60, `repair-cycle2-e2e/` 61/61 + `report.json`.
- `core-handoff/`: `app.js.diff`, `demo-service.js.diff`, `domain.js.diff`, `copy.js.diff` vs frozen snapshot; `final-hashes.json`.

Screenshot inspected: `final-core-run/repair-cycle2-e2e/F2-01a-1440-reset-before-failure.png` — status reads "Demo data reset for
Bea." with Close only (no Retry), Schoolwork "0 tasks shown", no new-task form open, pending none, fail-once scenario still armed.
Other PNGs (F2-02a 1440, F2-04a 1440, F2-05 390, F2-06 320, F2-07 768) were captured but not visually inspected by me.

## Remaining gaps / limits (honest)

- **Single status toast**: if learner B is reset while learner A's failed operation is retained, the reset notice replaces the
  visible Retry button; A's `lastFailed` and draft survive (re-submit works; `F2-01c` accepts either path) but Retry is not
  re-shown when switching back to A. Design limit, not resurrection; flag for acceptance.
- `maySelect` is conservative: a create submitted on Schoolwork while the parent then opens the Workspace picker (no selection)
  is created but not auto-selected. Retry reuses the dispatch-time selection snapshot (moving on between failure and retry
  suppresses auto-select).
- Untested here: phone Today/Plan/Record sweeps, ES reverse sweep, real devices/AT, backend, real users — unchanged backlog.
- Final hashes (`core-handoff/final-hashes.json`): app.js `1b4f3241…`, demo-service.js `8316f98f…`, domain.js `75791406…`,
  copy.js `c48c3f45…`, FRONTEND_BACKEND_CONTRACT.md `e503c5e2…`, repair-cycle2.test.cjs `dea5d018…`, repair-cycle2.e2e.cjs `936a5036…`.
  All 17 manifest files other than the four sources (and the contract doc) remain byte-identical to the repair-1 manifest.
