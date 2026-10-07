# Connected frontend — repair cycle 1 report

Writer: fresh Fable application writer (repair 1 of at most 2). Scope: `frontend/` application, tests, docs and new evidence only.
`design/`, original repositories, `frontend/BUILD_CONTRACT.md`, the frozen snapshot and all earlier evidence were not touched. No git
operations, network, installs, credentials or real-child data. This report lists what was fixed and what was verified; it does **not**
certify the whole frontend — the coordinator's independent spec verification decides the gate.

## Commands run (project root), actual counts

| Step | Command | Result | Evidence |
|---|---|---|---|
| Syntax | `node --check` app.js, domain.js, demo-service.js, copy.js, tests/repair-cycle1.test.cjs, tests/repair-cycle1.e2e.cjs | all exit 0 | `evidence/repair-cycle1/final-results-20261001T103136.json` |
| Unit | `node --test frontend/tests/*.test.cjs` | **49 pass / 0 fail** (spec reporter: `ℹ tests 49 · pass 49 · fail 0`; original 43 assertions unchanged + 6 new in `tests/repair-cycle1.test.cjs`) | `evidence/repair-cycle1/unit-final-20261001T103136.log` |
| Domain probe | `APP_ROOT=frontend OUT=… node evidence/frontend-spec-initial/adversarial-domain.cjs` | **16 / 16** pass (was 11/16) | `evidence/repair-cycle1/adversarial-domain-final-20261001T103136.json` |
| Browser probe | `APP_ROOT=frontend OUT=… node evidence/frontend-spec-initial/adversarial-ui-v2.cjs` | **20 pass / 0 fail**, 8 screenshots (was 6/14) | `evidence/repair-cycle1/adversarial-ui-v2-final-20261001T103136` |
| Proposal probe | `APP_ROOT=frontend OUT=… node evidence/frontend-spec-initial/proposal-ui.cjs` | **4 pass / 0 fail** (was 3/1) | `evidence/repair-cycle1/proposal-ui-final-20261001T103136` |
| Baseline journey | `OUT=… node frontend/tests/journey.e2e.cjs` (unchanged script) | **97 / 97**, 33 screenshots, exit 0 | `evidence/repair-cycle1/journey-baseline-final-20261001T103136` |
| Repair regression | `APP_ROOT=frontend OUT=… node frontend/tests/repair-cycle1.e2e.cjs` | **73 pass / 0 fail**, 10 screenshots, 79.6 s (deadline 420 s, no timeouts) | `evidence/repair-cycle1/e2e-final-20261001T103136` |

No adapter was needed: the original probe scripts ran unchanged against the repaired source. Earlier runs of this cycle (including the
run with 6 failing harness/first-draft assertions, `e2e-20261001T102637`) are kept under `evidence/repair-cycle1/`; nothing was deleted.

## Source hashes (SHA-256, final)

```
app.js  54a937c7c351012556274d64e353007e4081fe066b477e61217a04e230d940b9
domain.js  29865583e7f4778235c581d610d82155ac06de6cf1bf349d2783e669b6f9ef24
demo-service.js  8977a1e01f2671dc999d2ee436ed621a08b91ded5b82aa3264567c88e1436c86
copy.js  80d366b74d915c4ed0768b9e6bc6a89d2f9fc2a38289e9ab9a68206ce08f55ff
styles.css  79858bcb3bccc407928dbd644082eac2b72964261e9633628a0a56246776a3e9
index.html  3cf5ae3b085a94ed6c58a5f9fc5d72cbf2486a3d4e7125d16170b7889a1a2d45
tests/repair-cycle1.test.cjs  b92d678511e7f30770974584c84683cad5bd5df8b783e0b2c5738f9bd6941aca
tests/repair-cycle1.e2e.cjs  157bc927e7f0321e1b59c5ee6f73269a27bb3c4a6bed46a38b1f51eb4294e400
```

## Per-finding status

Test names refer to `tests/repair-cycle1.test.cjs` (unit) and `tests/repair-cycle1.e2e.cjs` (browser, report `report.json` in the repair
regression directory above); "v2" = coordinator `adversarial-ui-v2.cjs`, "dom" = `adversarial-domain.cjs`.

| ID | Status | Fix | Verified by |
|---|---|---|---|
| R01 originating learner/form | fixed | `run()` captures origin; create/edit/intake callbacks mutate only the owner's drafts/selection/form (`ui.newForm`, `ui.editing`, `ui.formErrors` per learner); focus only if the user is still there | v2 cross-learner ×4; e2e `R01 …` ×5 (edit while Cal form open, intake while Bea form open) |
| R02 per-task drafts | fixed | `drafts[learner].work[taskId]` (step/answer/tally/lastCheck), `obs[taskId]`, `edit[taskId]`; submit closes over the revision and clears only if unchanged | v2 task-drafts ×3; e2e `R02 …` ×4 (restore on A, role/locale survive, newer text after delayed submit) |
| R03 retry lifecycle | fixed | `ui.lastFailed` keeps command+opts; `retryLast()` → `run(..., {retryOf})`: same callbacks, form, feedback; duplicate keys blocked | v2 retry ×2; e2e `R03 …` ×4 (appended once, newer text kept, no "Task created", no stale Retry) |
| R04 explicit Record navigation | fixed | `recordTask[learner]` = undefined (follow selection) / `'all'` / task id; `Open in Record` sets it; observation form bound to the task it was written for | v2 record-routing ×2; e2e `R04 …` ×3 |
| R05 archive read-only | fixed | domain `requireActive` rejects archived (all work commands); Workspace archived state with history + Restore (parent) | dom ×2; v2 archive ×3; unit `R05 …` |
| R06 decide exact draft | fixed | domain `expectedPlanId` → `replaced`; service captures current draft id at dispatch (legacy calls included); UI sends `planId` | dom delayed-accept; v2 draft-identity; unit `R06 …`; e2e `R06 …` ×2 |
| R07 sample capability invalidation | fixed | content edit → `sample:null` + `sampleDetached{key,version,at,changed}`; due-only keeps; assistance/checks/events carry `sampleKey/sampleVersion/index`; prior replies labelled "from sample version N, before the edit" | dom edited-sample; v2 edited-sample ×2; unit `R07 …`; e2e `R07 …` ×2 |
| R08 stale/archived proposals | fixed | domain `stale` on `fromDue` ≠ current due; `proposalState()`; UI shows *Needs a fresh proposal* / *Unavailable (task archived)* with provenance, no Accept, Decline kept; restore does not apply it | dom stale-proposal; proposal-ui ×1; unit `R08 …` ×2 (incl. delayed accept vs parent edit → `superseded`); e2e `R08 …` ×2 |
| R09 Today support truthfulness | fixed | support panel lists scripted tags only for a sample next task; custom → honest limit + *Ask a grown-up* | e2e `R09 …` ×2 |
| R10 reading story | fixed | `SAMPLES['reading-retell'].story` (3 paragraphs EN) + ES; rendered in Workspace, K–2 adult-scaffold note; labelled synthetic demo text | e2e `R10 …` |
| R11 stuck feedback/focus | fixed | `flagStuck` success → "Saved locally … next visit" status + persistent notice; focus stays on the work field | e2e `R11 …` ×2 |
| R12 EN/ES generated content | fixed | `Copy.SAMPLE_ES` keyed by sample key+version; `sampleText()`; renderers (Today/lists/Workspace/Plan/Record/edit form) localize only unedited generated text; stored text stays canonical | unit `R12/R14 …`; e2e `R12 …` ×6 |
| R13 visibility statements | fixed | student/K–2 statements name work, help + scripted replies, checks, stuck/done, proposals/decisions, observations; observation hint says the student can read it | e2e `R13 …` ×3 |
| R14 plural-aware counts | fixed | `Copy.tn` for open tasks, tasks shown, help requests, scripted replies, steps, form errors, plan items | unit `R12/R14 …` (0/1/2); e2e `R14 …` ×2 |
| R15 late completion focus | fixed | success focus only when in origin context and focus unmoved; originating control gone → heading fallback allowed | e2e `R15 …` ×3 (hint pending→type; create pending→switch view) |
| R16 stable non-input focus | fixed | `focusKeyOf/findByKey` keep heading/main/summary/error-summary links/schedule links; body fallback only if the element is gone | e2e `R16 …` ×2 |
| R17 390/320 Tab reachability | fixed | CSS `scroll-padding`/`scroll-margin` from measured `--nav-h`/`--status-h` + `focusin` scroll correction (no key handling) | e2e `R17 …` forward/reverse at 390 and 320 (16/10 real Tab presses, geometry + hit test) |
| R18 status occlusion | fixed | `--status-h` measured after each render; scenario padding; same scroll rules; Retry/Close remain | e2e `R18 …` ×8 (with persistent fail-once error) |
| R19 44×44 segmented buttons | fixed | `.seg button` min 2.75rem both axes | e2e `R19 …` at 320/390/768/1440 |
| R20 tag wrapping | fixed | `.tag` wraps (`white-space: normal; overflow-wrap: anywhere`) | e2e `R20 …` EN/ES at 320 and 390 (right edge, scrollWidth, document width) |
| R21 focus contrast on red toast | fixed | `.status .btn:focus-visible` white outline; tally border `--line-input` | e2e `R21 …`: real Tab onto Retry, `:focus-visible` true, pixel-resolved [255,255,255] vs [176,12,21] = **7.22:1** (initial was 1.38:1); tally 3:1+ |
| R22 selectionDirection | fixed | render restores `[start, end, direction]` | e2e `R22 …` (Shift+ArrowLeft ×3, backward kept after late render) |

## Preserved

Original 43 unit assertions, 97 baseline journey checks and all coordinator probe scripts are unchanged and green. Local/demo
disclosures and EN/ES family text are verbatim; completion is still self-report; voice is scripted text; family-authored tasks have no
instructional capability; K–2 stays adult-scaffolded; proposals stay 6–8; no backend/tutor/storage/audio integration was added.

## Limits and remaining gaps

- Reviewer long-route probe (the one that timed out twice) was **not** re-run; the compact segmented `repair-cycle1.e2e.cjs` covers its
  findings with an explicit deadline. Historical PHONE-STALL remains unresolved and untested here.
- No native device, assistive technology, native-Spanish educator, child usability or learning-effect validation. Spanish is still draft.
- Contrast was measured for the toast focus ring and tally boundaries only; decorative secondary-button outlines were deliberately not redesigned.
- `choose()` in probes uses value+change on real `<select>` controls (inherited harness limit), not native keyboard selection.
- Reviewer finding "R16 details summary" is covered by key preservation (`summary:` key) but only the heading and error-summary-link cases
  are asserted in the browser; schedule links keep focus via `data-fk=sched:<id>` without a dedicated assertion.
- Coordinator should re-freeze and rerun its own probes with fresh OUT paths; this report is a self-report with raw logs, not a gate decision.
