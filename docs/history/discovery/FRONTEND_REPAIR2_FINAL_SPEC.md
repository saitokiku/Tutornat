# FRONTEND_REPAIR2_FINAL_SPEC — final read-only specification review (repair cycle 2 of 2)

Reviewer: fresh spec reviewer (Fable/max), after core + parent + student builders and coordinator integration.
Scope: SPEC conformance only (DIRECTION.md, frontend/BUILD_CONTRACT.md AC-01–10, FRONTEND_REPAIR_CYCLE2_PLAN.md F2-01–07, PARALLEL_DELIVERY.md). Not a visual/quality review; no quality, production, Spanish-educator, real-user or device validation is claimed. No application, test, design, snapshot or evidence file was modified. This is the LAST repair cycle; no automatic third cycle is started or recommended.

## 1. Tree under review and what was independently checked

- Frozen integration tree: `evidence/frontend-repair2-integration/run-20261001T171113252686Z/snapshot/` — manifest `…/run-20261001T171113252686Z/manifest.json` (24 files, `unchanged_core_and_protected: 16`, `historical_snapshot_matches: 17`, `student_source_noop: true`).
- Independently recomputed sha256 for all 24 manifest entries against the snapshot: **24/24 match, 0 missing**.
- Snapshot vs live `frontend/` (`cmp` on domain.js, copy.js, app.js, demo-service.js, index.html, styles.css): **byte-identical** at review time (coordinator still owns live tree; no claim beyond this moment).
- `…/run/service/service-negatives.cjs` is **byte-identical** to the original `evidence/frontend-repair1-state-review/service-negatives.cjs` (original not executed).
- Every `*.summary.json` in the run records `APP_ROOT` = the snapshot (see `evidence/frontend-repair2-final-spec/suite-summaries.json`).
- Targeted execution I ran myself (APP_ROOT=snapshot, writes only under `evidence/frontend-repair2-final-spec/`): `adjudication-probe.cjs` → `adjudication-probe.report.json` (5 editTask cases, results in §3A).
- Unit suites: the run's `unit.summary.json` records exit 0 with APP_ROOT=snapshot but no enumerated counts; not re-run here, so per-suite unit counts in worker/core reports remain claims.

### Integrated run results (raw, as recorded by the coordinator harness)

| Suite | Result | Raw failures |
|---|---|---|
| journey.e2e (1440/768/390/320, no external requests, no console errors, no exceptions) | 97/97 | — |
| repair-cycle1.e2e (protected, retained R01–R14) | 71/73 | `R13 student visibility statement names shared classes` (EN, ES) — §3C |
| repair-cycle2.e2e (protected core, F2-01–04) | 60/61 | `F2-03a edit form keeps the opened (ES) rendering as its own draft across locale switch` — §3B |
| parent-pages.e2e (F2-03/F2-04 UI) | 54/54 | — |
| student-pages.e2e (F2-05/06/07) | 21/21 | — |
| adversarial-ui | 20/20 | — |
| adversarial-domain | 16/16 | — |
| proposal-ui | 4/4 | — |
| service-negatives (retained R03/R05/R06/R07/R08/AC-04 invariants) | 22/23 | `S21-due-only-and-noop-keep-key` (`afterNoop: null`) — §3A |
| interaction | 81/81 | — |
| coordinator-state | 11/11 | — |
| coordinator-copy | 13/13 | — |
| copy-review | 51/52 | `R14 EN schoolwork count grammatical` — known regex artifact on `'Bea · 2 tasks shown'`; raw result preserved, not re-scored |
| playwright (connected, real controls) | exit 1; summary enumerates no counts | phone rapid Parent click `aria-pressed=false` — §4 item 1 |
| unit | exit 0; summary enumerates no counts | — |

All summaries: `externalRequests: []`, `consoleErrors: []`, `exceptions: []`.

## 2. Verdict

**SPEC PASS — known-limits acceptance, conditional on the owner recording three assertion re-baselines (§3) as explicit decisions.** The product behaviour required by AC-01–10 and F2-01–07 is evidenced in the integrated run; the four raw failing assertions are, on inspection, assertions superseded by the cycle-2 plan or implementation-specific expectations of a protected suite, not product regressions. They must not be silently edited; the owner must accept or reject each re-baseline in writing. If the owner rejects re-baseline 3A (S21c), that single item becomes CHANGES_REQUIRED and, with no third cycle, a documented known limit of the demo.

Nothing here is a blanket completion claim: §4 lists the exact unresolved items.

## 3. Adjudication of the raw assertion conflicts

### 3A. `S21-due-only-and-noop-keep-key` — `afterNoop` sub-assertion: **intended contract change, not a retained-invariant regression; contract fragility flagged**

What the script does (service/domain boundary, no UI): `loadSample` → `editTask {due}` → `editTask {title: m.title, subject: 'math'}` (bytes identical to stored generated title) → `editTask {subject: 'other'}`. Expected `math-arrays / math-arrays / null`; actual `math-arrays / null / null`.

Source cause (`snapshot/domain.js` L111–118): `authored = submitted keys that still carry task.generated[k]`; `changed = bytes-differ OR authored`; `detach = sample && changed ∩ CONTENT_FIELDS`. So any submitted generated field detaches, even with identical bytes. Non-generated fields keep byte-diff semantics.

My probe (APP_ROOT=snapshot, `adjudication-probe.report.json`):
- P1 due-only → sample kept, provenance `[title, instructions]` (S21a holds).
- P2 `{title: canonical bytes}` → `sample: null`, provenance `[instructions]` (this is the S21 `afterNoop` failure).
- P3 `{subject: 'math'}` (non-generated, identical) → sample kept, provenance intact (S21's subject part is NOT the trigger).
- P4 `{instructions: canonical bytes}` → detached, title provenance kept (per-field, F2-04).
- P5 `{}` → ok, sample kept, `version` bumped 1→2 (pre-existing behaviour of editTask's unconditional version bump/event; not cycle-2).

Authority check: R07 as recorded (REPAIR_CYCLE1_REPORT.md L49; FRONTEND_REPAIR1_STATE_SPEC.md L15) says "content edit detaches; due-only keeps; prior assistance immutable". "Identical-content edit retains" was the cycle-1 state reviewer's extrapolation encoded in S21, not contract text. The later authority, FRONTEND_REPAIR_CYCLE2_PLAN.md §3 F2-04, requires: "A deliberately authored field equal to a canonical EN/ES sample string must not be silently treated as generated." The only way a byte-equal authored field can reach the domain from the shipped UI is the parent's reproduced case (form opened in ES, family types the exact EN canonical string → dirty vs ES baseline → submitted). The UI (`app.js` L470) submits only fields that differ from the open-time baseline, so an untouched generated field is never submitted; an in-locale identical retype is not submitted either (indistinguishable from untouched, acceptable). `FRONTEND_BACKEND_CONTRACT.md` §"Repair cycle 2 — field authorship" documents the new sparse-patch rule.

Ruling: `afterDue` and `afterSubject` still hold; `afterNoop` encodes the superseded byte-diff rule for generated fields. The user-facing R07 behaviours (due-only keeps; content edit detaches; prior assistance/checks immutable — S20 PASS; no regained help/checker — parent F2-04 checks PASS) are retained. Classification: **intended changed assertion**. Required owner action: record S21 as S21a (due-only keep, PASS), S21b (non-generated identical keep, PASS by P3), S21c (generated field explicitly submitted with identical bytes → detach by F2-04 contract). Do not edit the protected script.

Flag (not fixed, per mandate): authorship is now inferred from *submission* of a generated field, so the domain cannot distinguish "family retyped it" from "client sent the whole form". Any client that PUTs full records would detach every sample on a due-date edit, and the `edited` event logs `changed:['title']` with `from.title === to.title` (disambiguated only by `detail.authored`). Preserving both the old tolerance and the new intent needs a separate explicit authorship signal (e.g. an `authored:[fields]` marker alongside `changes`). This is a contract-design item for the owner, outside this cycle.

### 3B. `F2-03a edit form keeps the opened (ES) rendering as its own draft across locale switch` — **obsolete implementation-specific expectation; F2-03 outcomes met**

Protected core test opens the reading sample edit in ES, switches EN, and expects `#edit-title` to still show the ES rendering. Actual: EN canonical. The parent implementation (`app.js` L456) refreshes *untouched* fields' value and baseline together when the current rendering differs (locale change or a newer record), keeping genuinely dirty text.

Authority: plan F2-03 requires an open-time baseline/dirtiness ("original field values/provenance (or explicit field dirtiness)"), no false title/instructions edits on locale switch, dirty text preserved across locale/role/route/delayed retry, form not reset, due-only save keeps canonical fields/capability. AC-05 requires authored text verbatim across locale changes. Neither prescribes that untouched generated fields freeze at the opening locale. The plan's outcome criteria are all green: the remaining four F2-03a checks (canonical bytes + sample attached, only due recorded, provenance intact, ES Schoolwork shows Spanish) PASS; F2-03b/F2-03c PASS (dirty title preserved through locale/role/route; event lists only title); parent-pages F2-03 ×17 PASS, including the directly contradicting assertion `untouched generated fields follow the locale in the open edit form (EN after ES)`.

Ruling: the two protected suites now assert opposite behaviour for one display detail; both cannot pass. The core expectation is an intermediate implementation choice, not a spec requirement; the parent behaviour is consistent with F2-04 (untouched fields localize). Classification: **intended changed assertion**, distinct from 3A. Owner must retire the one core check explicitly. Residual uncertainty: none at spec level; whether showing untouched fields in the new locale is the better UX is a quality question outside this review.

### 3C. repair-cycle1.e2e `R13 … names shared classes` (EN, ES) — **obsolete, superseded by F2-05**

Both checks demand "proposals"/"propuestas" in the Record visibility statement for Bea (grade 3–5). F2-05 deliberately removes that promise for 3–5 (3–5 learners cannot make proposals, so the statement was false) while keeping it for 6–8 and keeping K–2 wording verbatim.

Adequacy of the replacement: `student-pages.e2e.cjs` `F2-05-record-disclosure-by-band` runs EN and ES and checks, per band: K–2 wording verbatim; 3–5 has no proposal/decision promise (`/propos|propuesta|decision|decisión/i`); 3–5 still names every actual sharing item (EN: steps written, scripted replies, answer checks, flag stuck/mark done, observations, "Nothing is sent to school"; ES list likewise), 6–8 includes proposals and decisions; `data-band` driven by the real learner control. `student-pages.test.cjs` adds unit checks of the band keys in both locales. This covers the retained R13 intent (stuck, observations, scripted replies named) with the corrected proposal scope. All 21/21 PASS in the integrated run.

Classification: **intended changed assertion**; the old pair must be retired explicitly by the owner, not silently.

## 4. Unresolved items, ranked by impact (preserved uncertainty; no further repeats)

1. **Phone rapid "Parent" click after "Start working" → `aria-pressed=false`** (connected Playwright smoke 3/4 and one diagnostic repeat; ordinary connected journey passes at both viewports). Root cause app-vs-browser-input-timing unresolved; evidence `devtools/browser/runs/setup-20261001T165652684392Z/{green-live,phone-diagnostic}/results.json` + traces. Not re-run (≤2 failures rule). Touches keyboard/focus/feedback criterion only under rapid-sequence input; cannot be excluded as an app defect.
2. **S21c contract fragility** (§3A flag): submission-implies-authorship for generated fields; needs a separate authorship signal to keep the old boundary tolerance. Owner decision; no code change in this cycle.
3. **Single status toast**: resetting learner B replaces the visible Retry for learner A's retained failure. A's state/draft survive and resubmission works, but the R03 Retry affordance is lost until resubmit. Known limit.
4. **Edit history readability**: an authored-identical edit logs `edited` with `changed:['title']`, identical `from`/`to`, plus `authored`; an empty patch still bumps `version` and appends an `edited` event (`changed: []`, pre-existing). How Record renders these entries was not checked here.
5. **Copy reviewer regex artifact**: copy-review 51/52 in the integrated run, sole failure `R14 EN schoolwork count grammatical` on `'Bea · 2 tasks shown'`; raw result stands, not re-scored here; no 52/52 claim.
6. **design/ PHONE-STALL** remains separate and unresolved (design-stage, not part of this tree).

## 5. Criteria matrix (evidence pointers in the integrated run; no claim beyond the listed suites)

| Criterion | Status | Evidence |
|---|---|---|
| Real custom tasks/IDs across pages | met | journey 97/97; repair-cycle1 R01 ×5 PASS |
| Parent create → student work/help/progress → parent exact work/observation → plan/proposal decision | met | journey; proposal-ui 4/4; repair-cycle1 R04 ×3 |
| Deterministic local service/error scenarios | met (one adjudicated assertion) | service-negatives 22/23 (§3A); repair-cycle1 R03 ×5 |
| Race/draft/learner/reset safety | met, known limit #3 | S22 reset isolation; repair-cycle2 F2-01/F2-02 PASS; adversarial-ui 20/20 |
| Age bands K–2/3–5/6–8 + EN/ES + verbatim family text (AC-05) | met | student-pages 21/21; parent-pages F2-04 coincidence checks; §3C |
| Responsive purposeful UI 1440/768/390/320 | met at spec level | journey overflow + heading-occlusion checks PASS (390/320 lines read; 1440/768 in same suite summary) |
| Keyboard/focus/44px feedback | met, unresolved #1 | repair-cycle2 F2-02d focus checks; journey |
| Honest local simulated scope; no external requests/storage/auth | met | every summary `externalRequests: []`; journey "no external network requests" PASS |
| Old staleness/assistance/checker/idempotency invariants retained | met with re-baseline 3A | S01–S20, S22 PASS; S21a/b hold; S21c superseded by F2-04 |
| Reproducible runnable deliverable, raw evidence, no blanket completion | met | manifest hashes 24/24 verified; raw logs/reports in run dir; this report lists all failures |
| F2-01 op identity/retry/reset, original dependency snapshot, no duplicate create/addStep | met | repair-cycle2 F2-01 PASS; S01–S08 PASS |
| F2-02 delayed create does not displace newer task/draft/focus | met | repair-cycle2 F2-02a–d PASS |
| F2-03 locale-switch due-only edit does not counterfeit authorship/detach | met (§3B) | repair-cycle2 F2-03a(4/5)/b/c; parent-pages F2-03 ×17 |
| F2-04 per-field metadata; untouched fields localize after detach; authored verbatim even when equal canonical; no regained help/checker | met | parent-pages F2-04 PASS; probe P4; S20 PASS |
| F2-05 band disclosure | met (§3C) | student-pages 21/21 |
| F2-06 parent-facing Workspace heading | met per suite | student-pages F2-06 PASS (not re-read individually) |
| F2-07 saved tally singular/plural 0/1/2 EN/ES, history unchanged | met per suite | student-pages F2-07 PASS (not re-read individually) |

## 6. Artifacts written by this review (only new files)

- `FRONTEND_REPAIR2_FINAL_SPEC.md` (this file)
- `evidence/frontend-repair2-final-spec/adjudication-probe.cjs` and `adjudication-probe.report.json` (APP_ROOT=snapshot, 5 cases)
- `evidence/frontend-repair2-final-spec/suite-summaries.json` (counts extracted from the run's summary files)

Quality review: not performed; permitted now only because specification passes, and only as a separate decision by the owner.
