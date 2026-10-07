# Prototype spec review — PASS after targeted repairs

## Coordinator re-review — 2026-09-30

The bounded synthetic prototype passes the reproduced spec cases after Fable batch `deleg_cfdcdf63`. This is not a production, educational-validity, privacy-certification or final quality approval. **Subsequent quality review requested changes:** the coordinator reproduced additional replay/provenance, date-lifecycle, terminal proposal, hint-intent, keyboard-focus, focus-obscuration, child-disclosure and non-text-contrast defects. See `QUALITY_CODE_REVIEW.md`, `QUALITY_UX_REVIEW.md`, `evidence/coordinator-quality-validation.json` and the reconciled `QUALITY_FIX_PLAN.md`. The earlier spec PASS covers the enumerated cases only; final delivery remains blocked on the quality repair/re-review gate.

The coordinator independently executed:

- `node --test tests/model.test.cjs tests/model.repair.test.cjs`: **20 passed, 0 failed**.
- `npm run check` and explicit syntax checks for `tests/spec.e2e.cjs` and `tests/repair.e2e.cjs`: passed.
- `node tests/spec.e2e.cjs`: **28 passed, 0 failed** using actual controls. The original 27-check run had 16 failures; the now-reachable B proposal approval also runs its downstream shared-plan assertion, explaining 28 rather than 27. Counts match the enumerated JSON records.
- `node tests/repair.e2e.cjs`: **50 passed, 0 failed**; additional invalid math, locale preservation, selected literacy voice, cross-role corrected plans, concept parity and scrolled mobile hit tests.
- `node tests/ui.e2e.cjs`: **24 checks passed, 0 failed; 36 desktop and 6 mobile configurations**. Configuration counts are render coverage, not separate proof of every end-to-end path.

The coordinator inspected settled desktop K–2 and scrolled mobile B screenshots. The board now represents all seven first-color and five added-color units across two frames; the B Start action is visible and hit-testable. No application HTTP(S) requests or runtime/CSP errors appeared in the independent cases. Spanish remains draft educational copy; actual screen-reader, cross-browser, live voice/AI and child-usability validation are not claimed.

Evidence: `evidence/parent-spec/report.json`, `evidence/parent-spec/repair-report.json`, `evidence/ui-e2e.json`, and `evidence/coordinator-rereview-manifest.json` (source/test hashes and a limited static pattern scan). The directory is not a git repository; review the full new artifact rather than inventing a diff or creating a repository. Initial failed evidence remains `evidence/parent-spec/red-before-fixes.json`.

---

## Initial blocking review — historical evidence

Coordinator independently inspected the source, ran the tests, viewed desktop/mobile screenshots, and reproduced failures using actual UI controls. The following original failure report and repair contract are retained, not current unresolved findings.

## Verified baseline

- `node --test tests/model.test.cjs`: 12 passed, 0 failed.
- `npm run check`: JS syntax checks passed.
- `node tests/ui.e2e.cjs`: 36 desktop configuration renders, 6 mobile configuration renders, 24 checks passed. Its flow tests predominantly use the exported debug action dispatcher, not the controls; broad render coverage does not establish the complete workflow in each concept.
- `node tests/spec.e2e.cjs`: coordinator-owned real-control checks, 11 passed / 16 failed / 27 total. Original red evidence: `evidence/parent-spec/red-before-fixes.json`. Latest rerun: `evidence/parent-spec/report.json`.
- No application HTTP(S) requests or runtime/CSP errors were observed during the independent cases. That does not certify production privacy/security.
- The desktop preview also reproduced the wrong-answer bug directly: enter `1225` for `403 − 178`; the UI replies “That matches.”

## Required repairs, in dependency order

1. **Answer checking must not accept a numeric suffix.** `app.js:checkStep` uses `endsWith`. Wrong entries `112`, `1225`, and `16` pass the K–2, 3–5, and 6–8 examples respectively. Implement a small explicit parser for the supported final-answer forms (bare number and allowed equation/assignment forms); reject wrong, negated, multi-answer, ambiguous and suffix-only text. Do not use eval. Keep scoped, truthful messaging: an unparsed step is not automatically wrong, and a final-answer match is not independent mastery. Add tests for valid/invalid examples in both locales.

2. **K–2 visual math must represent all addends.** The ten-frame draws seven first-color units and only three second-color units for `7 + 5`; the remaining two units disappear. Represent seven plus five across frames/overflow (retain machine-readable `data-fill` markers) and supply an accurate accessible description. Inspect the settled screenshot, not an animation frame. Initial scaffold currently gives the whole count-through answer while claiming the companion never gives the answer; make hints/scaffolding and their attribution consistent.

3. **Parent corrections must reach the shared task and plan.** `model.js:correctExtractedTask` updates only `state.extracted`; `state.tasks` retains the old deadline. Confirm/correct the actual task, keep provenance, and ensure both roles see the corrected date. Draft/accepted plans must be derived from the confirmed task, not contradictory hardcoded weekday prose. Do not alter school accounts or submit anything. Preserve explicit acceptance.

4. **Language changes must preserve contributions and localize generated content.** `act('lang')` clears all turns, including student-authored messages; generated draft/accepted plan strings remain in the old locale. Store sufficient stable keys/parameters to render generated content in the selected locale while preserving the user's original text and evidence. Keep task/board/hint/plan context attached to the right task. Do not rewrite user-authored observations or notes as if they had said something else.

5. **Voice demo must follow the selected task.** The current script is keyed only by band, so selecting the literacy task and pressing Play injects unrelated math speech/steps. Use task-specific scripted content, or a clearly labeled unavailable demo for unsupported subjects with a complete typed path. Do not silently contaminate literacy work with math turns/hints. Voice remains text/visual simulation, with no actual recording/synthesis/provider calls. Fix “hear a scripted exchange” wording when there is no sound.

6. **Every concept must provide the complete parent journey.** A/C omit the child's board/work they promise to share. B/C omit help-needed flags. B omits proposal decisions. Reuse shared view functions without turning concepts into recolors; ensure board/turns, flags, proposal decisions and shared tasks are reachable inside each concept. Do not require developer concept switching to finish one proposed product journey.

7. **Phone controls and layout must be usable.** Explorer segment buttons are 40px tall, below the specified 44px mobile baseline. More seriously, B makes the entire tall companion panel sticky; it covers the Start action when scrolled into view (`workspace-mobile-scrolled-to-task.png`). Remove or restrict sticky behavior to a genuinely small caption, account for the persistent banner, and test hit targets using elementFromPoint after scrolling, not only absence of horizontal overflow.

8. **Correct misleading prototype copy.** The literacy reply claims a teacher can see the writing despite no teacher-facing/share integration. Say exactly what the demo exposes to the parent. The teacher-feedback introduction tells the user to paste/type even though only Load sample exists. Keep sample-only intake explicit, with no upload/real student data solicitation.

## Repair and review contract

- Preserve the current working artifact and TDD logs. No rewrite, new dependencies, remote calls, real data, config changes, commits or deployment.
- Scope remains K–8, EN/ES, parent/student only, three concepts. Tutor services remain later.
- Start from the reproduced red checks. Make one focused fix at a time, add model regressions where appropriate, and save actual outputs. Do not weaken/delete the coordinator's checks to pass.
- Use the dependency-free local Chrome route; browser_exec has already failed twice due to the host default-browser configuration. Do not retry that dead end or modify the user's browser defaults.
- Rerun the original tests plus `node tests/spec.e2e.cjs`. Capture settled desktop/mobile screenshots and exact totals. Report remaining gaps honestly.
- Coordinator must rerun and inspect after repairs. Only a spec pass permits the separate quality/accessibility/privacy review. No prototype delivery claim yet.
