# QUALITY FINAL REVIEW — after quality repair cycle 2 (bounded, read-only)

Reviewer: fresh independent reviewer (Fable), not either fix worker. Coordinator: Astra.
Scope: final acceptance review of the cycle-2 model-only fix for QC-11 / QC-02 and of whole-prototype readiness.
No application edits, no task closure, no third repair cycle. Only new artifacts: this file and `evidence/final-review/`.

Workspace: `/Users/man/education-product-discovery/design` (local, outside git; synthetic in-memory K–8 EN/ES concept explorer A/B/C).

## 1. Verdicts (short)

| Question | Verdict | Confidence |
|---|---|---|
| Targeted fix QC-11 / QC-02 (model.js only) | **APPROVED** — behaves as specified in the model and through real DOM controls, EN + ES, accepted + pending plans, concepts A/B/C | High |
| Whole prototype | **NOT UNCONDITIONALLY APPROVED** — blocked by the open, uncertified **PHONE-STALL** (long original phone keyboard sequence stalls the renderer; cause unknown; no app/CSS fix made) | High that it is still open; low on cause |

Resolved by this review (as model behaviour, verified independently): QC-11, QC-02.
Remaining blocker for whole-prototype approval: PHONE-STALL (see §6).

## 2. Immutable hash check (fresh, this review)

Computed with my own sha256 over the live files (`evidence/final-review/` run, call 1 and again after the browser run, call 5):

| File | Live sha256 | Matches `evidence/coordinator-quality-cycle2/source-manifest.json` |
|---|---|---|
| model.js | `1728b0f1f2c3433a96bc8a6788bf960a4eec80ca1fe70534be903c18f7da5ab4` | yes |
| app.js | `93e8e578d4e3e555930277a719502a404cc30f30e0ddcc2a77687998d990797f` | yes |
| styles.css | `19b040901f4758c3c71eba29df023fc68cdc5bc8337b3fdecc514fd9d8f8749a` | yes |
| index.html | `eaf47a0ba76012946f6172164d2c6a04d4f55f237a2eb18959a47f415ea78a4f` | yes |
| package.json | `0456bbd9a886c515691b3e4a6db3bbb2c8c6f1609e530764d2c9185f5bf860e4` | yes |

Baseline `evidence/coordinator-quality-cycle1/runtime/model.js` sha256 `efa3f3df7d0bc2f2df749cf8aaa1139791b31d6f99964c2dbf9b6070f9c9f062`.
Independent `diff -u baseline live` = 51 lines, two hunks (lines 162–185 `applyDueChange.restale`; lines 328–350 `draftConflicts` + `acceptDraftPlan` guard), identical in content to the worker diff `evidence/quality-fix-cycle2/model.js.diff`. No other file differs from the manifest. Source hashes were re-checked after my browser run: unchanged.

Worker-integrity reconciliation (`evidence/coordinator-quality-cycle2/worker-integrity-reconciled.json`): the three post-dispatch changes are coordinator-owned metadata (`COORDINATOR_QUALITY_CYCLE1.md`, two new reconciliation files); nothing in app/tests/evidence is excused. Accepted.

## 3. Independent reading of the fix (model.js)

### 3.1 `applyDueChange` → `restale` (lines 165–184)
- Old code only looked at items of the task that just moved and otherwise **stripped** `stale/staleFrom/staleTo` — the QC-11 defect (an unrelated move cleared staleness).
- New code: for every item with a `taskId`, compares `item.due` with that task's **current** `due` from the already-updated `tasks` array. Any mismatch ⇒ `stale: true`, `staleReason: 'due_changed'`, `staleFrom` = the plan's own date for the still-mismatched dependency (preferring the task that just moved, else the first mismatched), `staleTo` = that task's current deadline. Flags are removed only when **no** dependency mismatches. Declined drafts untouched. Items are never rewritten (historical dates retained).
- Correctness consequences I checked by reasoning and by probe: staleness survives unrelated moves (QC-11); successive moves of the same task keep `staleFrom` = original plan date and update `staleTo`; restoring the dependency to the plan's date clears the flags even if unrelated tasks remain moved (correct: only dependencies count); a pending draft and an accepted current plan are judged independently.

### 3.2 `draftConflicts` + `acceptDraftPlan` (lines 335–350)
- Accept throws `Draft plan is stale: …` when `draftPlan.stale` **or** any item's task currently has a different deadline. The thrown path returns before building the new state, so nothing is mutated/installed (state objects are treated immutably; verified by deep-compare in my probe).
- Reachability: through the public API a conflicting-but-unflagged draft is **not reachable** (`createDraftPlan` is only fed `derivePlanItems(state)`, which uses the current task deadline, and every deadline change goes through `applyDueChange`, which restales). The date-conflict branch is therefore defence-in-depth; I verified it with an explicitly **constructed** state (flag stripped) and label that check as artificial.
- UI: `app.js` renders no `draft-accept` control while the draft is stale (`blockDraft`, lines 1161–1167) and both dispatchers wrap model calls in `try { … } catch (err) { recover(err); }` (lines 1282/1357, 1373/1435), so even a thrown accept would not leave the page in a half-rendered state. `app.js` is unchanged (hash-verified).

### 3.3 Newly introduced reachable defects
None found. Non-blocking observations, all outside reachable prototype states or pre-existing:
1. `staleFrom: item.due !== undefined ? item.due : from` — an item carrying a `taskId` but **no** `due` would mismatch forever and would borrow the moved task's old date as `staleFrom`. Not producible by `derivePlanItems`; artificial object only.
2. Pre-existing (not introduced by cycle 2): `acceptDraftPlan` does not check `draftPlan.status`, so a `declined_by_parent` draft could be accepted at model level; the UI never offers Accept for a declined draft, and `draftConflicts` would still refuse a date conflict. Production-hardening concern, not a prototype blocker.
3. Semantics worth stating for the owner: if a parent re-drafts from Oct 9 and the essay is then moved back to Oct 2, the **old** accepted plan becomes valid again and the **new** Oct 9 draft becomes stale (09→02). Consistent with the dependency rule and surfaced in the UI as a stale draft with a re-draft path; verified at model level only (§4.1), not in the DOM.

## 4. Fresh checks actually run by this review (counts enumerated from the JSON records)

### 4.1 Model probe — `evidence/final-review/final-model-probe.cjs` → `model-probe.json`, log `final-model-probe.log`
**50 / 50 passed**, en/es × accepted/pending, band 68, via public API only (`loadExample → correctExtractedTask → createDraftPlan(derivePlanItems) → [acceptDraftPlan] → proposePlanChange/decideProposal`):
- baseline not stale; essay Oct 2→Oct 9 ⇒ stale 02→09; unrelated history Oct 8→Oct 12 ⇒ still stale 02→09, items retain Oct 2, `dueHistory` retained for both tasks (QC-11);
- second essay move (→Oct 10) keeps `staleFrom` Oct 2, `staleTo` Oct 10;
- pending: `acceptDraftPlan` on the stale draft throws (`/stale/`) with **no mutation** and no `currentPlan` installed (QC-02); flag artificially stripped ⇒ still refused by date conflict, no mutation (**[constructed state]**);
- restoring essay to Oct 2 while history stays Oct 12 clears the flags; restored draft is acceptable again;
- accepted: re-draft after the move is fresh (Oct 9) while current stays stale; accepting it replaces current; unrelated move after re-draft leaves the fresh draft fresh and current stale 02→09; essay back to Oct 2 ⇒ current valid again, Oct 9 draft stale 09→02;
- declined draft never restaled;
- **[constructed 2-dependency plan]** restoring one of two dependencies keeps the plan stale for the other (08→12); restoring both clears.
Checks tagged `[constructed …]` (8 of 50) exercise objects the UI cannot produce; the other 42 are reachable prototype states.

### 4.2 Real-control DOM probe — `evidence/final-review/final-dom-probe.cjs` → `browser/final-dom-probe.json`, log `final-dom-probe.log`, 12 screenshots in `browser/`
**117 / 117 passed; 0 page exceptions / console errors; 0 HTTP(S) requests; 0 harness errors; 32 s wall.**
Configurations (band 68): A/en/accepted, A/en/pending, C/es/accepted, B/es/pending. Per configuration, all through real pointer/keyboard CDP input (`Input.dispatchMouseEvent`, `Input.dispatchKeyEvent`, `Input.insertText` on the focused note field); `__companionDebug.state` and the DOM were only **read**:
1. sample → confirm → draft (→ accept for "accepted");
2. student: propose-open (focus lands on `#prop-task`), task chosen by type-ahead keys, Tab to `#prop-date`, date typed as digits, Tab ×2 through the native date segments to `#prop-note`, note inserted, **Enter** submits (pending, verbatim note); parent: click `proposal-approve[data-arg=i]` ⇒ essay Oct 9 ⇒ plan stale 02→09; Draft panel shows the stale warning and **no Accept control anywhere in the document**; `html lang` = en/es as selected;
3. same for history → Oct 12 ⇒ plan **still** stale 02→09 (QC-11), items keep Oct 2, `dueHistory` length 1 for essay and history; parent Draft panel warns with both dates in the locale (EN "out of date … Oct 2 … Oct 9", ES "desactualizado … 2 oct … 9 oct"), re-draft present, no Accept; screenshot `*-parent-stale-after-unrelated-move.png`;
4. student view: accepted ⇒ the same stale warning with both dates in the plan panel; pending ⇒ no current-plan dates; never an Accept control; screenshot `*-student-after-unrelated-move.png`;
5. parent: real **Tab** from the top reaches `draft-ask`; **Enter** ⇒ fresh draft from Oct 9 (midway Oct 8), not stale; accepted mode: old plan still stale/historical; focus moves to the new Accept; **Enter** ⇒ current plan Oct 9, not stale, `acceptedBy: 'parent'`, draft `accepted_by_parent`; panel shows accepted without warning and without Accept; screenshot `*-parent-after-redraft-reaccept.png`.

Harness provenance and adaptations (disclosed): CDP plumbing copied from `tests/quality-cycle2.e2e.cjs` (itself from `evidence/coordinator-quality-cycle1/cross-task-probe.cjs`). Adaptations: `ROOT`/`OUT`/`CHROME`/`TMPDIR` from environment (ROOT = live design dir, read only; OUT = `evidence/final-review/browser`); the 160-press Tab sweep was replaced by a document-wide query for any Accept control plus real Tab-to-redraft/Enter/Enter; `proposal-approve` clicked by explicit `data-arg` index; extra assertions (dueHistory, student view, accept-absence, `html lang`); a DDMMYYYY retry path for the date field (never triggered — all dates typed MMDDYYYY were accepted). Original harnesses were **not** run against their original evidence paths.

Isolation: own headless Chrome for Testing 153.0.8010.52, `--remote-debugging-port=0`, fresh `--user-data-dir` under a scoped `TMPDIR=/Users/man/.hermes/cache/scratch/final-review-chrome` (set explicitly because the inherited terminal TMPDIR pointed at the system temp dir, contrary to host preference). Chrome killed (SIGTERM, SIGKILL fallback), profile removed (`profileRemoved: true` in the JSON), `pgrep edu-final-` empty afterwards, scratch dir empty.

### 4.3 Coordinator/worker evidence — assessed, not rerun by me
Coordinator cycle-2 counts (model 40/40, syntax 0, spec 28/28, repair 50/50, UI 24/24 + 36 desktop/6 mobile render configs, quality 114/114, cycle-2 DOM 141/141, cross-task 8/8, invariants 7596 states / 3798 acceptance attempts / 0 failures) are taken from `evidence/coordinator-quality-cycle2/suites-verification.json` and logs; I did **not** rerun those suites in this bounded review. My own probes (§4.1, §4.2) independently reproduce the QC-11/QC-02 behaviour they claim. As the plan says: render matrices and generated model states are not end-to-end workflow evidence; my §4.2 is the end-to-end evidence for this fix.

## 5. Regression concerns
- The only behavioural change is in `applyDueChange.restale` and `acceptDraftPlan`; both reachable call sites (`decideProposal` approve path, `correctExtractedTask`, UI `draft-accept`) were exercised through the DOM. Legacy item shapes (strings / no `taskId`) are skipped by both new filters, matching old behaviour.
- `acceptDraftPlan` now throws in a state the UI cannot reach; if a future UI change re-exposes Accept on a stale draft, `recover(err)` handles it — acceptable for a prototype, but the message should then be surfaced as copy, not an error.
- No change to CSS/layout/focus logic, so this fix cannot have improved or worsened PHONE-STALL.

## 6. PHONE-STALL — assessment of documentation/evidence (no new investigation)
- Evidence read: `QUALITY_UX_REREVIEW_CYCLE1.md` §8 (original harness timeout deterministic on the live build, 2/2 solo runs; instrumented CDP trace shows the renderer stalling after the Enter/lang/band clicks — 6.3 s then a 10 s `Runtime.evaluate` timeout), `evidence/coordinator-phone-diagnosis/` (`cdp-trace.log`, `probe-report.json` with `beforePhoneSkipEnter`/`afterPhoneSkipEnter` and `ol.turns` focus before/after Enter, `Profiler.stop` timeout), `QUALITY_FIX_CYCLE2_REPORT.md` §3 (worker's 5 short isolated variants: no reproduction; V5 lands on `a.skip` instead of `ol.turns` and does not replay the failing pre-history).
- Assessment: the stall is **real and reproducible on the original long sequence**, **not reproduced by shorter journeys**, **unexplained**, and **unfixed**. A successful shorter phone journey (including the ordinary phone parent E2E in §8 of the UX re-review and the mobile render configs) does not certify the original long path. No page exceptions or dialogs were observed, which rules out the easy explanations but not a layout/focus loop or a long-running style/scroll task in the renderer.
- Status for this review: **OPEN**, ID `PHONE-STALL`, severity **High for whole-prototype certification** (a parent/student on a phone using the keyboard can hit an unresponsive page on a documented path), **not a blocker for the targeted model fix** (different code path, no CSS/DOM change in cycle 2). Confidence that it is open: high. Cause: unknown. It cannot be cleared by this review and the whole prototype cannot be unconditionally approved while it stands.

## 7. Blocking findings

| ID | Severity | Confidence | Repro | Citations |
|---|---|---|---|---|
| PHONE-STALL | High (whole-prototype) | High that it persists; cause unknown | Run the byte-identical original UX probe copy against the live build solo (`evidence/rereview-ux-cycle1/original-probe-copy/probe.cjs`); the renderer stalls after the phone keyboard sequence (`Runtime.evaluate` 10 s timeout). Not reproduced by the worker's 5 shorter variants. | `QUALITY_UX_REREVIEW_CYCLE1.md` §8.1; `evidence/coordinator-phone-diagnosis/cdp-trace.log`, `probe-report.json`; `QUALITY_FIX_CYCLE2_REPORT.md` §3; `evidence/quality-fix-cycle2/12-phone-stall-probe-run1.log`, `13-phone-stall-probe-V5.log` |

No blocking findings against the targeted fix.

## 8. Tested / untested
Tested (this review): model API en/es × accepted/pending (band 68); real DOM A/en, C/es (accepted), A/en, B/es (pending) at 1440×1000 desktop, reduced motion, Chrome for Testing 153 headless; EN and ES copy for the stale warning; keyboard re-draft/re-accept; no network; no exceptions.
Untested (this review): bands K2/35 in the DOM (model invariants cover them per coordinator evidence); mobile viewports; Safari/Firefox; screen readers; native Spanish-speaking education/children/parents; full curriculum and efficacy; production privacy/security; the long original phone sequence (PHONE-STALL); coordinator suites not rerun (§4.3).

## 9. Exact paths
- Report: `/Users/man/education-product-discovery/design/QUALITY_FINAL_REVIEW.md`
- Evidence: `/Users/man/education-product-discovery/design/evidence/final-review/{final-model-probe.cjs, final-model-probe.log, model-probe.json, final-dom-probe.cjs, final-dom-probe.log, browser/final-dom-probe.json, browser/*.png (12)}`
- Inputs (read-only): `model.js`, `app.js`, `tests/quality-cycle2.e2e.cjs`, `evidence/coordinator-quality-cycle1/runtime/model.js`, `evidence/quality-fix-cycle2/model.js.diff`, `evidence/coordinator-quality-cycle2/{source-manifest.json, worker-integrity-reconciled.json, model-invariants.json}`, `evidence/coordinator-phone-diagnosis/*`, `QUALITY_UX_REREVIEW_CYCLE1.md`, `QUALITY_FIX_CYCLE2_REPORT.md`.

## 10. Screenshot inspection (settled DOM, viewed by the reviewer)
### 10.1 `browser/C-es-accepted-parent-stale-after-unrelated-move.png` (Concept C, Spanish, accepted plan, after the unrelated history move)
- "Borrador de plan" panel: pill "Desactualizado: la fecha cambió"; warning "Este plan quedó desactualizado: la fecha cambió de vie, 2 oct a vie, 9 oct. Hace falta un nuevo borrador, que la familia acepta."; the three historical items still read "Esta noche…", "jue, 1 oct…", "vie, 2 oct: entregar el borrador…"; single button "Pedir otro borrador"; **no** "Aceptar" control anywhere on the page.
- Shared-plan panel above shows the same warning and both approved proposals ("Tesis del ensayo: vie, 2 oct → vie, 9 oct" with the verbatim note; "Línea de tiempo: jue, 8 oct → lun, 12 oct"). Extract panel: "Fecha de entrega: vie, 9 oct (fecha cambiada por una propuesta del estudiante aprobada)" and "La nota de muestra decía vie, 2 oct". Page banner, headings, form copy all Spanish; no untranslated English; no overlap/truncation at 1440×1000.
### 10.2 `browser/A-en-pending-parent-stale-after-unrelated-move.png` (Concept A, English, pending draft, after the unrelated history move)
- "Draft plan" panel: pill "Out of date — the deadline moved" + "Draft — waiting for your decision"; warning "This plan is out of date: the deadline moved from Fri, Oct 2 to Fri, Oct 9. It needs a new draft, which a parent accepts."; historical items retained (Oct 1 / Oct 2); controls are "Ask for another draft" and "Decline" with the optional note field; **no Accept button**. Extract panel: "Deadline: Fri, Oct 9 (deadline moved by an approved student proposal)"; "Sample note said Fri, Oct 2". No layout glitches, no Spanish leakage, footer disclaimers intact.
- Observation (non-blocking, UX copy): the warning's "the deadline moved from Oct 2 to Oct 9" is correct for the essay even after the history move (QC-11 kept the original dates). The history move itself is only visible in the proposals list, which is the intended historical record.

## 11. Cleanup
Owned Chrome process terminated and its fresh profile deleted by the probe; no leftover `edu-final-*` processes or profile directories; scratch parent `/Users/man/.hermes/cache/scratch/final-review-chrome` was empty and has been removed. No application, test, or prior evidence file was modified.

## 12. Final machine-readable summary
```json
{
 "targeted_fix_verdict": "APPROVED",
 "whole_prototype_verdict": "NOT_UNCONDITIONALLY_APPROVED_PHONE_STALL_OPEN",
 "report_path": "/Users/man/education-product-discovery/design/QUALITY_FINAL_REVIEW.md",
 "blocking_findings": [
  {
   "id": "PHONE-STALL",
   "severity": "high_whole_prototype",
   "confidence": "high_open_cause_unknown",
   "scope": "not a blocker for the targeted model fix"
  }
 ],
 "resolved_ids": [
  "QC-11",
  "QC-02"
 ],
 "tests_run": {
  "final_model_probe": {
   "passed": 50,
   "failed": 0
  },
  "final_dom_probe": {
   "passed": 117,
   "failed": 0,
   "total": 117,
   "errors": 0,
   "exceptions": 0,
   "externalRequests": 0,
   "screenshots": 12
  },
  "coordinator_suites_rerun": false
 },
 "evidence_paths": [
  "/Users/man/education-product-discovery/design/evidence/final-review/final-model-probe.cjs",
  "/Users/man/education-product-discovery/design/evidence/final-review/final-model-probe.log",
  "/Users/man/education-product-discovery/design/evidence/final-review/model-probe.json",
  "/Users/man/education-product-discovery/design/evidence/final-review/final-dom-probe.cjs",
  "/Users/man/education-product-discovery/design/evidence/final-review/final-dom-probe.log",
  "/Users/man/education-product-discovery/design/evidence/final-review/browser/final-dom-probe.json",
  "/Users/man/education-product-discovery/design/evidence/final-review/browser/ (12 png)"
 ],
 "untested": [
  "bands K2/35 in DOM",
  "mobile viewports",
  "Safari/Firefox",
  "screen readers",
  "native Spanish education review",
  "full curriculum/efficacy",
  "production privacy/security",
  "long original phone sequence (PHONE-STALL)",
  "coordinator suites not rerun"
 ],
 "source_hashes_match_manifest": true,
 "manifest_files_checked": 20
}
```
