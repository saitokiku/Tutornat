# QUALITY_FIX_CYCLE2_REPORT.md — second and FINAL bounded quality-repair cycle

Executor: Fable (fresh fix worker; not a reviewer). Scope: `/Users/man/education-product-discovery/design` only.
Written 2026-10-01T00:19:00-0500; ~17.8 min, 25 tool calls. Not a delivery/approval claim — coordinator verifies, then one final fresh read-only review.

## 1. Changed files (and why)

| File | Change | Rationale |
|---|---|---|
| `model.js` | `applyDueChange.restale` rewritten (≈14 lines); `draftConflicts` helper + guard line in `acceptDraftPlan` | QC-11 / QC-02 — see §2. Full diff: `evidence/quality-fix-cycle2/model.js.diff` |
| `tests/quality-cycle2.model.test.cjs` (new) | 11 pure-model regressions (2 cross-task, 3 acceptance boundary, 6 invariants) | vertical RED→GREEN artifacts |
| `tests/quality-cycle2.e2e.cjs` (new) | real-input browser regression, 141 checks, 15 screenshots | DOM/pointer/keyboard evidence for both roles, EN/ES, A/B/C |
| `tests/quality-cycle2.phone-probe.cjs` (new) | short isolated PHONE-STALL diagnostic (5 variants) | §3 |
| `QUALITY_FIX_CYCLE2_REPORT.md` (this) | — | — |
| `evidence/quality-fix-cycle2/**` (new) | logs, JSON, screenshots, hashes, diff | — |

**NOT changed:** `app.js`, `styles.css`, `index.html`, `package.json`, every old test, every old evidence/report/probe/log (hash-verified, §4). No README/package script was needed: the new model test runs with plain `node --test tests/quality-cycle2.model.test.cjs`.

Observed during the run but **not touched by me** (coordinator-owned, modified after my start 00:01:14): `COORDINATOR_QUALITY_CYCLE1.md` (00:05:14), `evidence/coordinator-quality-cycle1/final-rereview-reconciliation.json` (00:04:24), `evidence/coordinator-quality-cycle1/reconcile_reviews.py` (00:03:45). My pre-hash snapshot (`pre-hashes.json`) predates them; `integrity.json` lists them as changed/new so the coordinator can reconcile.

## 2. QC-11 / QC-02 — disposition: FIXED at model level, verified in real DOM

Root cause confirmed by reading `applyDueChange` (original lines 165–172): `restale` only looked for items of the task that just moved and, finding none, stripped `stale/staleFrom/staleTo` from a plan another task had invalidated.

Fix (model.js): validity is recomputed against **all** dependencies — every item with a `taskId` is compared with that task's **current** deadline from the already-updated `tasks` array. Stale ⇒ `staleFrom` = the plan's own date for the still-mismatched dependency (preferring the task that just moved; survives successive moves), `staleTo` = that task's current deadline. Flags are cleared only when every dependency matches. Declined plans untouched. Items are never rewritten. Legacy item shapes (strings / objects without `taskId`) name no dependency and behave as before.

Acceptance boundary (model.js `acceptDraftPlan`): throws `Draft plan is stale: …` when `draftPlan.stale` **or** any item's task now has a different deadline — even with no flag and no UI hidden-button guard. Rejection installs nothing, mutates nothing (deep-equal checked), and keeps the prior accepted plan.

Vertical TDD (commands run from the design dir; logs in `evidence/quality-fix-cycle2/`):

| Step | Command | Result | Log |
|---|---|---|---|
| RED 1 (cross-task, accepted + pending) | `node --test tests/quality-cycle2.model.test.cjs` | fail 2 / pass 0 — `actual: undefined, expected: true` | `01-cross-task-red.log` |
| GREEN 1 | same | pass 2 / fail 0 | `02-cross-task-green.log` |
| legacy model suites after fix 1 | `node --test tests/model.test.cjs tests/model.repair.test.cjs tests/quality.model.test.cjs` | 29/29 | `03-legacy-model-suites-after-fix1.log` |
| RED 2 (acceptance guard ×3) | `node --test tests/quality-cycle2.model.test.cjs` | pass 3 / fail 2 — `Missing expected exception` ×2 (legacy-shape case passes by design) | `04-accept-guard-red.log` |
| GREEN 2 | same | pass 5 / fail 0 | `05-accept-guard-green.log` |
| all model suites | 4 files | 34/34 | `06-all-model-suites-after-fix2.log` |
| invariants ×6 (same-task repeated moves keep staleFrom; restore clears even after unrelated move; unrelated decline/no-op/never-dependent; two dependencies with one restored; separate current vs newer draft; declined stays declined) | `node --test tests/quality-cycle2.model.test.cjs` | 11/11 | `07-invariants-green.log` |
| same 11 tests against the **original** `model.js` (isolated copy) | — | pass 4 / fail 7 (the 4 passing are the legacy-shape case and 3 invariants that hold on the old code; every QC-11/QC-02 case fails) | `08-cycle2-tests-against-original-model.log` |

Real-DOM check (`node tests/quality-cycle2.e2e.cjs`, own Chrome, port 0, fresh `$TMPDIR` profile, 1440×1000, reduced motion): **no debug dispatch** — proposals are made with real keys (type-ahead/arrows in the `<select>`, digits typed into the native date control, `Input.insertText` for the note, Enter to submit), approvals/role/locale by real pointer, re-draft and re-accept by real Tab + Enter. Sequence per configuration: load sample → confirm → draft (→ accept) → essay proposal 2026-10-09 approved → history proposal 2026-10-12 approved → assertions → re-draft → re-accept. Configurations: A/en accepted+pending, C/es accepted+pending, B/en accepted.
Run 3 (final): **141 pass / 0 fail, 0 harness errors, 0 page exceptions, 0 external requests, 15 screenshots** — `11-browser-cycle2-run3.log`, `browser/quality-cycle2-browser.json`. Runs 1–2 (`09-*`, `10-*`) failed on **harness** mistakes only (Tab through the native date segments; ES date text `vie, 2 oct`; student plan panel has no `.b-plan` class) — documented in the probe header; app untouched; 0 exceptions in every run.
Checks covered: both roles warned with both dates (EN “out of date … Oct 2 … Oct 9”, ES “desactualizado … 2 oct … 9 oct”); real Tab sweep never reaches an Accept control while stale, and does reach re-draft; historical items keep 2026-10-02 until replacement; old accepted plan stays stale/historical after re-draft until re-accept; authored proposal note verbatim in state, in the student view, and after a real locale switch (provenance localized); re-accept installs a non-stale 2026-10-09 plan.
Screenshots (absolute): 
- /Users/man/education-product-discovery/design/evidence/quality-fix-cycle2/browser/A-en-accepted-parent-after-redraft-reaccept.png
- /Users/man/education-product-discovery/design/evidence/quality-fix-cycle2/browser/A-en-accepted-parent-stale-after-unrelated-move.png
- /Users/man/education-product-discovery/design/evidence/quality-fix-cycle2/browser/A-en-accepted-student-after-unrelated-move.png
- /Users/man/education-product-discovery/design/evidence/quality-fix-cycle2/browser/A-en-pending-parent-after-redraft-reaccept.png
- /Users/man/education-product-discovery/design/evidence/quality-fix-cycle2/browser/A-en-pending-parent-stale-after-unrelated-move.png
- /Users/man/education-product-discovery/design/evidence/quality-fix-cycle2/browser/A-en-pending-student-after-unrelated-move.png
- /Users/man/education-product-discovery/design/evidence/quality-fix-cycle2/browser/B-en-accepted-parent-after-redraft-reaccept.png
- /Users/man/education-product-discovery/design/evidence/quality-fix-cycle2/browser/B-en-accepted-parent-stale-after-unrelated-move.png
- /Users/man/education-product-discovery/design/evidence/quality-fix-cycle2/browser/B-en-accepted-student-after-unrelated-move.png
- /Users/man/education-product-discovery/design/evidence/quality-fix-cycle2/browser/C-es-accepted-parent-after-redraft-reaccept.png
- /Users/man/education-product-discovery/design/evidence/quality-fix-cycle2/browser/C-es-accepted-parent-stale-after-unrelated-move.png
- /Users/man/education-product-discovery/design/evidence/quality-fix-cycle2/browser/C-es-accepted-student-after-unrelated-move.png
- /Users/man/education-product-discovery/design/evidence/quality-fix-cycle2/browser/C-es-pending-parent-after-redraft-reaccept.png
- /Users/man/education-product-discovery/design/evidence/quality-fix-cycle2/browser/C-es-pending-parent-stale-after-unrelated-move.png
- /Users/man/education-product-discovery/design/evidence/quality-fix-cycle2/browser/C-es-pending-student-after-unrelated-move.png

Historical RED artifacts (immutable, not re-run): `evidence/coordinator-quality-cycle1/cross-task-browser.json` (4/4 fail), `evidence/rereview-code-cycle1/probe.json`.

## 3. PHONE-STALL — disposition: UNRESOLVED, no application root cause established; app/CSS unchanged

Prior evidence read: `evidence/coordinator-phone-diagnosis/{probe.cjs, probe-report.json, cdp-trace.log, probe.stdout.log}`. Trace: Enter on focused `ol.turns` (y394,h224) left focus unchanged; the next real click `lang/en` was acknowledged (mousePressed/Released ok, 10 ms); the **following** `Runtime.evaluate` (band/35 locator) timed out at 10 s, then `Profiler.stop` timed out. No dialog events, no exceptions. Enter on an `ol` is not an application action (no handler; nothing in app.js listens for keydown on it).

Hypotheses ranked and tested (`tests/quality-cycle2.phone-probe.cjs`, 3 s CDP timeout, `Debugger.pause` watchdog to capture a running JS stack on any stall, `elementFromPoint` hit test before each click, fresh Chrome per variant):
- H1 app focus/scroll/layout loop after Enter-on-turns + lang click (phone 390, overflowing history 519/224 focused by 21 real Tabs, Enter, then real clicks lang→band→concept→role→reset): **V1** (profiler on) and **V2** (profiler off) — every operation completed, hit tests landed on the intended buttons, focus/scroll logged, `Profiler.stop` returned (62 nodes). Falsified for this short path.
- H1′ load-bearing prior state: **V3** (focus turns, no Enter), **V4** (no turns focus) — all ok. **V5** reproduces the original ordering more closely: desktop 1440 → two resets → 14× Shift+Tab sweep with an evaluate per step → mid-session emulation switch to 390×844 mobile → phone reset + 12× Shift+Tab sweep → 5 plays + typed turn → 25× Tab search for `.turns` → 40× forward Tab sweep → blur/scrollTo → one Tab (lands on `a.skip`) → Enter (lands on `#main`, scrollY 325) → real clicks lang/band/concept/role/reset → `Profiler.stop` (74 nodes). **17/17 ok, 0 exceptions, 0 dialogs, no stall.**
- H2 browser/CDP pipeline (a stalled renderer would make `Debugger.pause` return no `paused` event or time out): never triggered — no stall to classify.
- H3 harness targeting/state: the original's stalled step is a `Runtime.evaluate` *after* an acknowledged click, consistent with a renderer that stopped servicing the session rather than with a wrong target; the new real-key path with hit tests shows targeting was correct at that point.

Conclusion: the stall did **not** reproduce in 5 isolated variants (~12 s each) including a faithful re-ordering of the original's load-bearing steps; the only untested difference is the original's ~45 s of cumulative prior work in one renderer (audits, contrast sampling, many screenshots). Within the 10-minute cap no deterministic failing regression exists, so no fix was made and none is claimed. Logs: `12-phone-stall-probe-run1.log`, `13-phone-stall-probe-V5.log`, `phone/phone-stall-probe.json`, `phone/phone-stall-probe-V5.json`, `phone/*-final.png`. Ordinary phone path remains as previously verified (independent of this issue).

## 4. Regression integrity

- `pre-hashes.json`: sha256 of all 376 pre-existing files before any edit. `integrity.json`: post-run comparison — changed pre-existing: `model.js` (mine) and `COORDINATOR_QUALITY_CYCLE1.md` (coordinator-owned, external, see §1); old `tests/*` unchanged; all old `evidence/*` unchanged (only coordinator-owned additions under `evidence/coordinator-quality-cycle1/`). No file missing.
- Isolated runtime `/var/folders/74/dpvfsk990bv680j7tfl0ghnr0000gn/T/qc2-runtime` (copy of current source + all tests; legacy harnesses write their evidence there, not into the design tree). Port 9333 was free before `ui.e2e.cjs`; the new probes use port 0.

| Suite (isolated) | Command | Parsed result |
|---|---|---|
| model | `node --test tests/model.test.cjs tests/model.repair.test.cjs tests/quality.model.test.cjs tests/quality-cycle2.model.test.cjs` | tests 40, pass 40, fail 0 (29 legacy + 11 new) |
| syntax | `npm run check` | exit 0 |
| spec.e2e | `node tests/spec.e2e.cjs` | report.json checks 28/28, errors 0, exceptions 0, external 0 |
| repair.e2e | `node tests/repair.e2e.cjs` | repair-report.json checks 50/50, errors 0, exceptions 0, external 0 |
| ui.e2e | `node tests/ui.e2e.cjs` | ui-e2e.json checksPassed 24 / checksFailed 0 (36 render configurations ≠ workflow count), failures [] , consoleErrors [] |
| quality.e2e | `node tests/quality.e2e.cjs` | quality-e2e.json checks 114/114, errors 0, exceptions 0, external 0 |
| quality-cycle2.e2e | `QC2_OUT=… node tests/quality-cycle2.e2e.cjs` | 141/141, errors 0, exceptions 0, external 0, 15 screenshots |

Programmatic reconciliation (`integrity.json → isolated_reconciliation.ok = true`): {model 40, spec 28, repair 50, ui 24, quality 114, cycle2 141} all equal expected. Logs: `14-isolated-*.log`, `isolated-run-results.json`. No prior assertion weakened; old tests byte-identical.

Hashes now: 
- `model.js` 1728b0f1f2c3433a96bc8a6788bf960a4eec80ca1fe70534be903c18f7da5ab4
- `app.js` 93e8e578d4e3e555930277a719502a404cc30f30e0ddcc2a77687998d990797f
- `styles.css` 19b040901f4758c3c71eba29df023fc68cdc5bc8337b3fdecc514fd9d8f8749a
- `index.html` eaf47a0ba76012946f6172164d2c6a04d4f55f237a2eb18959a47f415ea78a4f
- `package.json` 0456bbd9a886c515691b3e4a6db3bbb2c8c6f1609e530764d2c9185f5bf860e4
- `tests/quality-cycle2.model.test.cjs` fb4f18a8c212e01419f12d6997672dd69bbc4c81c7b955aaac77aa9edca3eab1
- `tests/quality-cycle2.e2e.cjs` fd6601192d54a126a620f750fa0844bbfce514bc6aa3a8886c952ae3b271bf47
- `tests/quality-cycle2.phone-probe.cjs` 38042551d8b16ee5f12a3ed3fd2f735560fba506eb2831ff941a850d3338fb97
Original (pre-cycle) `model.js`: efa3f3df7d0bc2f2df749cf8aaa1139791b31d6f99964c2dbf9b6070f9c9f062 (identical to `evidence/coordinator-quality-cycle1/runtime/model.js`).

## 5. Cleanup
Owned Chrome processes: 0 remaining; owned `$TMPDIR/edu-qc2*` profiles: 0 remaining (each probe removes its profile on exit). `/var/folders/74/dpvfsk990bv680j7tfl0ghnr0000gn/T/qc2-runtime` (isolated runtime copy) left in `$TMPDIR` for coordinator inspection; prunes automatically.

## 6. Remaining blockers / untested
- **PHONE-STALL unresolved** (not reproduced in 5 short variants; no app cause established; no change made). Goes to owner — no third repair cycle.
- QC-11 browser checks cover band 6–8 only (the only band with the proposal form); K–2/3–5 are covered by the pure-model path (`applyDueChange` is band-agnostic) but not by a DOM run.
- Review-reported items outside this cycle's scope untouched: over-broad historical-date assertion in the cycle-1 code re-review harness (immutable), non-text contrast 2:1 findings in the coordinator phone probe.
- Not claimed: approval, production readiness, or closure of tracked tasks.
