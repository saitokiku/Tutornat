# Coordinator verification — quality repair cycle 1

**Verdict: NOT READY FOR DELIVERY.** Cycle 1 re-review is complete. QC-02 remains blocked by cross-task regression QC-11, and PHONE-STALL is unresolved. The second and final Fable repair is now active under `QUALITY_FIX_CYCLE2_PLAN.md`. The tests and hashes below describe the verified cycle-1 baseline, not the in-progress cycle-2 artifact.

## Independently executed, not inherited from the worker

The coordinator copied current source/tests/probes byte-for-byte into `evidence/coordinator-quality-cycle1/runtime/`, ran them there to preserve all prior evidence, and compared every copied file against live SHA-256 hashes before and after execution. Live hashes remained unchanged. All five original test files match the previous coordinator manifest; all files in the coordinator's archived original-review evidence match their original targets. Evidence: `source-manifest.json`, `suites-verification.json`, `probes-verification.json` in that directory.

| Check | Actual result | Evidence |
|---|---|---|
| Model tests | 29 pass, 0 fail, 0 skipped/cancelled | `model.log`, `model-counts.json` (reporter totals reconciled with enumerated passing records) |
| Syntax | `npm run check` exit 0 | `syntax.log` |
| Coordinator spec | 28/28 | `runtime/evidence/parent-spec/report.json` |
| Earlier repair | 50/50 | `runtime/evidence/parent-spec/repair-report.json` |
| Original UI | 24/24; 36 desktop configurations and 6 mobile render configurations | `runtime/evidence/ui-e2e.json` |
| Quality repair regressions | 114/114; no captured page exceptions or HTTP(S) requests | `runtime/evidence/quality-fix/quality-e2e.json` |
| Original UX diagnostic | 55 pass / 4 fail / 59 reached checks, plus one phone harness timeout | `runtime/evidence/quality-ux/probe-report.json` |
| New cross-task regression on live sources | 4 pass / 4 fail / 8 checks; no page exceptions or HTTP(S) requests | `cross-task-browser.json`, `cross-task-probe.cjs` |

All JSON totals were checked against enumerated records. Render configurations are not end-to-end workflow counts. Original diagnostic probes exit zero even with failures and were interpreted scenario-by-scenario, not as acceptance suites.

## QC-02 remains blocking: unrelated task approval clears an essay plan's stale flag

**Severity: High for the local prototype's shared-date contract.** Reproduced via actual pointer controls, not only direct model calls, in both accepted and pending plans.

1. Grades 6–8, concept A, Parent: Load sample teacher note → Confirm as shown → Ask for a draft plan. For accepted case, Accept plan.
2. Student: propose Essay claim due `2026-10-09`; Parent: approve. The October 2 essay plan is correctly marked stale.
3. Student: propose History timeline due `2026-10-12`; Parent: approve.
4. The essay task and extract still show October 9, but `currentPlan.stale`/`draftPlan.stale` is cleared. The accepted panel now says **“Accepted by parent — now the current plan”**, with October 2 as its “confirmed deadline”, and no re-draft path. In the pending case the old **Accept plan** button reappears.

Cause in current `model.js:165–171`: `restale` searches plan items for a mismatch belonging only to the *most recently changed task*. If that unrelated task has no plan items, it drops a stale flag caused by another task. A fix must preserve or recompute staleness from all actual dependencies, and keep stale acceptance blocked.

Evidence: `evidence/coordinator-quality-cycle1/cross-task-browser.json`; screenshots `cross-task-accepted-stale-warning-lost.png` and `cross-task-pending-stale-warning-lost.png`. Coordinator visually inspected the accepted screenshot: current extract October 9 and old plan October 2 are simultaneously visible, with the latter falsely labeled current.

## Phone diagnostic: unknown cause, not accepted as fixed

The unmodified UX probe independently returned `phone: CDP timeout: Runtime.evaluate`, matching one worker result. It reached 59 checks rather than the historical 67 because the phone parent sequence stopped early. Original evidence is preserved; no assertions were deleted to obtain a green count.

The four reached failed checks are: an over-broad non-text border aggregate (only decorative panel/text-bearing button/segment outlines now fail); a bounded Tab search for the overflowing history; raw geometric overlap of the skip link with the banner; and a skip-link test whose measured main/header are offscreen at scrollY 1232. The worker's explanations for those latter checks remain claims until the fresh UX reviewer diagnoses them. Positive quality checks passed for essential input/counting boundaries, forward/reverse focus, and a correctly targeted skip link, but cannot by themselves explain the parent-flow timeout.

The coordinator inspected repair screenshots: the mobile Play control's focus ring is visible at the bottom of its screenshot (partly viewport-cropped, not banner-covered); the single-task stale date warning is explicit, although its recovery control is below that screenshot's crop; the student B drawer is visibly open and labels scripted turns, while the authored note is inside the scrollable history, not directly visible in that crop. These images alone do not certify the complete flow.

## Final re-review reconciliation and phone diagnosis

Both reports exist and were read: `QUALITY_CODE_REREVIEW_CYCLE1.md`, `QUALITY_UX_REREVIEW_CYCLE1.md`. Their artifacts were parsed programmatically by `evidence/coordinator-quality-cycle1/reconcile_reviews.py`; output is `final-rereview-reconciliation.json`. The code review's 43 checks reconcile to 31 pass and 12 failed records: 10 expose QC-11, one is an over-broad historical-date assertion, and one records the missing model-level stale-acceptance guard. QC-01/03/04/05 are closed within scope; QC-02 is not.

UX raw runs are 35 pass / 2 fail / 37 checks and 29 pass / 1 fail / 30 checks, with first-run harness errors retained. The review's stated 64 passing checks are an explicitly reconciled union of corrected sections across those two runs, not a single clean full run. Its A1 label claims the original phone sequence but used a different focus starting state; the later exact-probe failures supersede that claim. QUX-1…4 have independent positive evidence, including 19 focus, 24 banner/keyboard and 13 disclosure/history checks. The coordinator's earlier measurement also directly covers sound-box borders at 4.2:1, which the UX reviewer itself did not render.

The coordinator ran the suggested additional instrumented probe once: `evidence/coordinator-phone-diagnosis/{probe.cjs,probe-report.json,cdp-trace.log,probe.stdout.log}`. It reaches 59 checks (four obsolete-assertion failures) and again times out during the subsequent explorer controls. Immediately before AND after the disputed Enter, active element is `ol.turns`, with no id/data-act; therefore the prior hypothesis of an unknown action-button activation is not supported. No JavaScript dialog events or page exceptions were received; even `Profiler.stop` timed out. The app-versus-browser/harness cause is still UNKNOWN. Ordinary phone parent intake/correction/draft/accept/observation/student parity has a successful independent real-input path, but this does not certify the failing long sequence. The worker is permitted at most ten minutes of different, narrowed diagnosis in the final cycle; no speculative application changes.

## Gate and scope

Completed read-only re-review: `deleg_da310baa`, code reviewer `sa-0-44bf8a69`, UX reviewer `sa-1-45622bef`. No application source changed during that review. Final repair is now dispatched as `deleg_cef7d4f9` / `sa-0-862b360d`, the sole fresh Fable writer, with the complete instructions from `QUALITY_FIX_CYCLE2_PLAN.md`. Existing evidence and tests are immutable.

Original fixes have positive regression coverage, not blanket final approval. The final permitted quality repair cycle is in progress; its result requires independent verification and a fresh bounded read-only review. Remaining blockers then must be surfaced, with no third repair cycle. Screen readers, Safari/Firefox, native Spanish educational validation, actual child/parent usability, curriculum depth and production privacy/efficacy remain unverified and out of this local prototype gate.
