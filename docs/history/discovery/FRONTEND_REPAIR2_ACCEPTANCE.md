# Frontend repair 2 — coordinator acceptance decision

**CHANGES_REQUIRED.** The authorized final repair cycle and its verification are complete; frontend acceptance has not passed. The local known-limits demo remains available. No quality-stage review, third repair, backend implementation or deployment has been started.

This is the coordinator's controlling acceptance decision. `FRONTEND_REPAIR2_FINAL_SPEC.md` is preserved unchanged as the reviewer's evidence and recommendation. Its conditional “SPEC PASS” is not an unconditional gate pass: owner decisions were still outstanding and an actual required phone interaction remained unresolved. Calling a criterion “met, unresolved” does not resolve it.

## Verified delivery

Both page slices are integrated into the same live frontend. Coordinator independently ran the combined source: 72/72 unit, 54/54 parent-page, 21/21 student-page, 97/97 original journey and 81/81 bounded interaction checks. All other raw results, seven F2 dispositions, exact commands and inspected screenshots are in `FRONTEND_REPAIR2_INTEGRATION.md`.

The coordinator rechecked all 24 frozen/live manifest entries after the fresh review and independently replayed all five reviewer service probes in `evidence/frontend-repair2-integration/run-20261001T171113252686Z/reviewer-probe-replay/`. No application code or tests changed after that verification. README status documentation is updated after the frozen run; the earlier README bytes remain in the snapshot.

## Assertion adjudication

- **S21 unchanged generated content:** the reproduced behavior is real, but it is not a reproduced due-only UI failure. Current UI sends only fields changed from the displayed baseline, and due-only UI saves retain support. The new service rule treats a submitted generated field as an explicit authored replacement, even when its bytes equal canonical storage; this is necessary for the tested ES-opened/EN-authored coincidence case under the current payload. R07 did not explicitly require identical-byte service submissions to preserve provenance. Correction to the earlier characterization: this is a changed sparse-edit contract with a fragile authorship signal, not established current-UI data loss. No owner acceptance of this contract change is assumed. Recommendation for any authorized follow-up: express authored intent separately so ordinary unchanged-field updates cannot revoke support. Raw service22/23 and both old/new tests stay intact.
- **Opening-locale core assertion:** the parent implementation updates untouched generated form fields and their baseline together when language changes, while retaining dirty authored text. Canonical storage, due-only edit events and capability still pass. A requirement to freeze untouched text in the opening language was an intermediate implementation assumption, not F2-03/AC-05. Coordinator accepts the newer outcome-based parent checks as the reconciliation; no new owner product decision or protected-test edit is needed. Raw core60/61 remains.
- **Grades3–5 proposal disclosure:** F2-05 already requires removing the unavailable proposal promise. The separately named student tests exercise the corrected EN/ES band behavior and preserve actual shared-work disclosure. Coordinator accepts this reconciliation under existing authority. Raw old repair71/73 remains; no owner vote is needed to restore a misleading promise.
- **Schoolwork count regex:** `Bea · 2 tasks shown` is truthful; the retained regex incorrectly excludes the learner prefix. Preserve raw copy51/52, not a fabricated52/52.

## Remaining issues

1. **Phone rapid role switch — acceptance blocker, AC-02/AC-07.** After Start working, a rapid Parent click leaves Parent `aria-pressed=false` in the real-control Playwright path. Current integrated smoke is3/4; the ordinary connected feedback journey passes desktop and phone. Root cause is still unresolved between application behavior and browser/input timing. No further identical replay was run for this adjudication. A shorter passing journey does not clear it.
2. **Status/recovery behavior — known functional limits, AC-04/AC-05.** Resetting learner B can replace learner A's visible Retry even though A's state/draft survives; resubmission works. A generated Spanish “sample loaded” toast also remains after the rest of the form switches to EN, visibly confirmed by the coordinator in `parent-pages/f2-03-before-save.png`. This is stale generated feedback, not translation of authored family text or storage corruption.
3. **Authorship API decision.** A complete-record client would currently turn untouched generated fields into authored replacements and detach sample help. Such a client is not the current UI, but this contract must not be carried into a backend by accident. Recommendation is an explicit intent signal rather than silently discarding S21's old protection.

Lower-priority retained uncertainty: authored-identical edit history has identical before/after bytes plus an authored marker; empty patches already bump versions. The fresh probe's `editEvent` fields are all null because its optional `query.events` branch is unavailable; it did not verify Record rendering. Historical design/ PHONE-STALL and all backend/provider/privacy/native-Spanish/real-child/device/assistive-technology/curriculum/efficacy work remain in BACKLOG.md and are not closed by these results.

## Corrections to the fresh review

- `unit.summary.json` does contain enumerated counts:72 tests,72 passes,0 failures/skips. The reviewer's “no counts” statement is incorrect; the raw source was available and the coordinator checked it.
- Playwright counts are3 expected,1 unexpected,0 flaky/skipped, recorded in results.json and playwright-enumerated.json; the failure is connected.spec.cjs:46.
- Absence of external requests/errors is supported by the legacy browser reports, not by every arbitrary summary file.
- The runtime records nine API calls while the reviewer self-reports eight tool calls. These are different counters; this does not establish a tool-call budget overrun. Post-report deltas are retained here without starting another review loop.

## Decision needed before more implementation

Recommend one explicitly authorized, bounded follow-up: phone-switch diagnosis/repair, learner-scoped and locale-safe status feedback, and explicit field-authorship intent. Cap at20 minutes for an executable checkpoint, not a promise of resolution; retain any unresolved result instead of restarting the timer. No redesign, new audit fleet, backend work, new dependencies, spending, deployment or real family data. Independent tests must verify fixes before any spec or quality approval.

Until the owner decides, application writes are stopped and quality review remains gated. The demo is available at http://127.0.0.1:59347/; reloading it clears its in-memory records.
