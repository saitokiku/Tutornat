# Connected frontend: repair-1 specification adjudication

**Verdict: CHANGES_REQUIRED.** All three Fable reviewers returned. Coordinator independently replayed the decision-changing service, copy and interaction probes against the unchanged 17-file repair-1 snapshot. Seven bounded defect groups remain, mapped below. This concludes cycle-1 review; it is not specification acceptance or quality approval. One final targeted repair cycle remains.

## Verified evidence, not completion claims

All paths below are relative to `/Users/man/education-product-discovery`.

| Evidence | Enumerated outcome | Disposition |
|---|---|---|
| Earlier independent implementation reruns | 49/49 unit; 16/16 domain; 20/20 UI; 4/4 proposal; 97/97 original journey; 73/73 repair compact | Reproduced, but not sufficient for whole specification PASS. `FRONTEND_COORDINATOR_REPAIR1_SPEC.md` |
| Coordinator C1/C2 actual-control probe | 7/11 | Four failed assertions in two confirmed groups: reset/retry resurrection and same-learner active-task displacement. Draft B remains stored. |
| Reviewer service negatives, independently replayed unchanged | 20/23 | S01/S02/S06 fail: retry loses original dependency generations and accepts already-applied operations. Some variants are service-only, not all UI-reachable. |
| Reviewer copy probe, independently replayed unchanged | 44/52 | Seven failed assertions represent G1–G4; one other failed assertion is a regex artifact. |
| Reviewer interaction probe, independently replayed unchanged | 81/81, complete | Scoped R15–R22/AC06–07 PASS, not all-device/AT certification. Final coordinator replay 75.603 seconds. |
| Coordinator supplementary actual-control probe | 11/13 | R14 tally saves `Tally: 1 marks` / `Conteo: 1 marcas`. Other counts, reading ES scaffold/voice-text actions, observation draft isolation, delayed observation attribution/newer draft and explicit All preservation pass. |
| Coordinator archived-observation ruling probe | 2/2 | Parent annotation does not restore/change archived task/session; old events remain byte-identical with one attributed new observation appended. |

Machine-counted originals/replays, declared-total checks, source hashes and budget metadata: `evidence/frontend-repair1-adjudication/reconciliation.json`, produced by `adjudicate.py`. Independent copies/logs/JSON are under `replay-service/`, `replay-copy/` and `replay-interaction/`. Supplement: `coordinator-extra-copy.cjs`, `extra-copy-run/report.json`. Ruling: `archive-observation-ruling.cjs` / `.json`. Original reviewer evidence is unmodified.

Before and after replays, all **17 live and 17 snapshot hashes match** `evidence/frontend-repair1-verification/source-manifest.json`. Original contract/tests, initial snapshot and historical design integrity were separately verified in the preceding coordinator checkpoint. No application source was edited in this adjudication.

## Final-repair items

| ID | Requirement / severity | Verified defect and expected boundary |
|---|---|---|
| F2-01 | R03 / AC04, high | Reset-before-failure surfaces obsolete Retry and restores pre-reset task; service retry after dependency change or success is also unsafe. Retain original lifecycle/dependencies across retries, check invalidation before failures, prohibit replay of applied operations, and discard reset-origin UI completions/retry actions. |
| F2-02 | R01 / AC04, high | A delayed create force-selects A over subsequently active B in the same learner; intake has the same callback pattern. Preserve newer selection/view/draft/focus while still creating A for its owner. |
| F2-03 | R12 / AC09, high (reviewer G1) | Opening a sample edit in ES, switching EN and changing only due commits untouched Spanish rendering as authored content, detaches sample and records false title/instructions edits. Compare against the form's original field provenance/rendering, not current locale. |
| F2-04 | R12, medium (G2) | An instructions-only edit detaches help correctly but an untouched generated title becomes English in ES. Keep per-field generated provenance distinct from sample capability; localize untouched generated fields, never authored ones. |
| F2-05 | R13, low (G3) | Grades 3–5 student Record promises date proposals unavailable to that band. Make disclosure band-aware; keep actual shared classes. |
| F2-06 | R13, low (G4) | Parent Workspace counts use “What your parent can see” / “Lo que puede ver tu madre/padre”. Use a parent-appropriate shared-record label. |
| F2-07 | R14, low (coordinator supplement) | Single-tile tally saves plural “1 marks” / “1 marcas”. Apply singular/plural at creation in EN/ES; never rewrite already-saved history. |

Root-cause source inspected: `demo-service.js` run/finish/history/retry and dependency generation; `app.js` context/run/reset, new-task and intake callbacks, sample renderers, edit prefill/submit, Record disclosure, parent Workspace and tally-save; `domain.js` sample detach and observations; `copy.js` relevant EN/ES keys. Line references in reviewers refer to the frozen file and may shift after repair.

## Rulings and artifacts (not extra product defects)

1. **R05 allows an append-only parent observation on archived work.** The repair text forbids work/help/check/stuck/done/edit mutation and resurrection; Record explicitly allows attributed parent observations. An observation is not student work or Restore. Preserve task/session and historical events; explain this boundary in the backend contract. No new ban is needed. Reviewer S19's prose “events unchanged” is too broad: the observation appends its own event; the earlier event prefix must remain unchanged. The coordinator's two assertions verify that precise rule.
2. **Copy R14 regex artifact:** “Bea · 2 tasks shown” is grammatical; the failed regex omitted the learner prefix. Preserve original failure. Any corrected regression must accept the prefix, not weaken singular/plural behavior.
3. **Partial/harness evidence is not a green run:** state UI U05 missed the required selection before `go-record`; copy part 2 halted before tally setup. Their raw results are 10/11 and 11/12 respectively, not complete coverage. The coordinator supplement covers observation draft scoping and exposes the missed tally defect. First state UI and earlier interaction harness runs remain preserved.
4. **Contrast judgment retained:** secondary decorative outlines are not essential state boundaries. Actual Retry/Close focus, input and tally boundaries and pressed segment fills were measured. Inline prose links are not blanket-exempt standalone actions. Native dialog browser-chrome cycling is not a demonstrated leak to underlying page controls.

## Scoped coverage and retained limits

- R02/R04: original coordinator/compact checks plus new observation/filter transitions pass. R05–R08 domain/service and relevant UI paths pass under the observation ruling; R06 still binds the exact reviewed draft, including legacy service dispatch.
- R09–R11 pass exercised age/Today/story/help-flag cases; reading ES scaffold and voice-text controls are now actually clicked. R12/R13/R14 remain partial for the defects above.
- R15–R22 pass the new independently replayed bounded interaction suite. R01 selection displacement is distinct from the passing focus-restoration assertions; it is not excused by them.
- Interaction coverage excludes phone Today/Plan/Record Tab sweeps, ES reverse sweep, phone dialogs, dark Undo-toast occlusion, pressed tally/radio contrast and real-device/AT/native-select behavior. These are untested scope, not proven defects. Preserve them for final acceptance risk reporting; do not label this full accessibility certification.
- Historical PHONE-STALL origin remains unresolved. The old twice-timed-out sweep was not run a third time. No real-child usability, native educational Spanish, curriculum, learning efficacy, backend, privacy/provider or production verification is implied.

## Visual and execution checks

Coordinator inspected new replay PNGs: `replay-copy/run/S2-es-schoolwork-after-instructions-edit.png` visibly shows English “Sticker arrays: 15 rows of 15” in the Spanish list/detail, with Spanish family instructions and edited-sample disclosure; `replay-interaction/run/05-320-es-retry-focus.png` shows a clear white Reintentar focus ring, five visible nav links and wrapped status text; `replay-interaction/run/01-1440-dialog-open.png` shows separated modal/backdrop and visible Cancel focus. Screenshots alone do not establish temporal causality or keyboard behavior.

Correction: the copy review's primary output contains **four** PNGs, not the report's three. State 8 calls / 780.92 seconds and copy 11 / 549.37 stayed within 12 calls or 900 seconds. Interaction 14 / 1361.49 exceeded both limits (two calls and 461.49 seconds). Useful valid evidence is retained, but the budget was not met. This grants no additional repair cycle.

## Next gate

Execute `FRONTEND_REPAIR_CYCLE2_PLAN.md` with one fresh Fable/max writer. After its handback freeze source, rerun preserved checks independently, and obtain fresh specification review. Only specification PASS permits the separate quality gate. If repair 2 fails acceptance, preserve the result and escalate; no third automatic repair.
