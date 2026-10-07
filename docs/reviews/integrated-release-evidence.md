# Integrated release evidence

Implementation began on 2026-10-07 from `0bac96a`, whose application code is `d8d8166`.
The isolated implementation checkout is `codex-learning-release`; Claude's other worktrees were
left intact. This file records verified behavior and environment gates, not launch readiness.

## T01 — Current journeys and answer controls

Complete. The reviewed baseline was 2,372 passing unit tests and
148 passing / 22 failing / 16 skipped browser cases. The first repair run reached
166 passing / 8 failing / 16 skipped, including four new desktop/phone fraction cases.

Observed regressions before repairs:

- Hint → fraction entry → Tab or `/` → Enter recorded no answer. Tab changed DOM focus while
  the pad still wrote to the numerator; typing after a hint left Enter aimed at that hint.
- IME composition Enter prematurely recorded a fraction answer. The clock and number line's
  own handlers had the same problem, reproduced separately before their fixes.
- Remainder entry after Tab produced `21` instead of `2 R 1`; keypad and remainder typing after
  a hint activated the hint again rather than submitting. New regressions cover these paths.
- A family handover remounted its guard in the child's session and redirected to `/home`.
  Recovered the relevant component/test from Claude's `5d6ca5f`; watched its new test fail first.
  Independent review then reproduced a blank cached Family page on child Back navigation. A
  failing Activity/StrictMode regression now passes: the shell owns the handover boundary above
  the learner key and clears it on navigation. The browser handover case also checks Back.
- “Multiplication” linked both facts and equal groups. Recovered only the applicable topic alias
  change from `43d4b71`, with a failing mapping regression; broader grade/date edits remain separate.
- Family did not invoke the existing weekly-email hook. The existing mocked email browser case
  is the regression; it checks a single due send through the real shell.
- Settings loaded the sandboxed inbox-preview document even while its disclosure was closed.
  A failing regression now verifies that it loads only when opened and is discarded on close;
  the frame retains its empty sandbox. This also removes a background-frame console error during
  the first-evening browser journey. The diagnostic matches a [reported Playwright instrumentation
  issue](https://github.com/microsoft/playwright/issues/33343); that attribution is an inference.
- Button opacity and chip colour transitions temporarily crossed unreadable states. Review keys
  had 4.34:1 contrast over their green rows. Axe thresholds remain unchanged; diagnostics now
  include the measured contrast. Control state changes are atomic and key labels use ink.

Browser selectors now identify the intended Grade combobox, language radio, exact knowledge card,
and practice card on the Board. Privacy title expectations follow the current policy's “Privacy”.
Substantive navigation, citation, action and content assertions remain in place.

Verification on the frozen code: `npm run verify` **PASS** (132 files, 2,385 tests; lint, route
type generation, TypeScript and production build). Full production browser suite on dedicated port
3296, four workers: **174 passed / 0 failed / 16 skipped / 0 flaky** (190 cases, 107 seconds).
All 11 original failing scenarios pass at desktop and phone sizes. A native Chrome replay also
passed Hint → `1` → Tab → `4` → Enter without clicking the numerator: one helped answer, no drawer.

Independent review found no Critical issues and one Important issue (cached Family Back), repaired
with the observed failing regression. One Minor is deferred: a browser variant that types immediately
from Hint without clicking the numerator. The unit regression covers that focus recovery; current
desktop/phone browser cases cover hinted keyboard Tab entry and touch entry.

## T02 — Durable assistance and first responses

Complete, including the independent review fix pass and final browser gate.

Practice and lesson checks now open a stable local attempt identity when shown. Help commits before
its content is released, and the first response commits before feedback. Reloads preserve hints,
misses and helped corrections; repeated final submissions produce one answer row. An abandoned
hint restarts the skill's quiet period. Opening the tutor is neutral; released text, cards and
model-provided reply buttons pass the same assistance gate. Failed storage admission keeps their
content, audio and transcript entries withheld. Widgets also honor a failed-save veto before feedback.

The refresh law now replays restoration episodes chronologically: an old restoration cannot mask a
later refresh failure. Numerical `RULES` are unchanged. Legacy rows retain `legacy-local` provenance;
new browser records are `local-recorded`, not verified server checks.

Observed RED→GREEN regressions cover help/miss reload, abandoned help, stale tab document writes,
concurrent first-response reducer candidates, immutable event IDs, cross-question ID collision,
duplicate final submission, presented-difficulty mismatch, save failure/retry, partial quiz result
failure, scene resume, export/deletion and repeated refresh episodes. Final practice IDs retain the
existing server's 100-character compatibility. A real in-process Postgres route test also confirms
server answer corrections survive reload and reach the second device.

Independent review reproduced three Important issues, all repaired in one author fix pass:

- Model reply buttons bypassed admission, including reply-only output. They now belong to the
  originating admitted entry; refused-help tests cover text, reply-only output and speech withholding.
- Synced learner tombstones left the new evidence arrays in the local document. An actual
  `mergeRemote` regression now verifies all collections disappear before saving and remain gone.
- A failed journal reconciliation could undo a saved server correction. Main rows outrank provisional
  journal copies, and successfully reconciled canonical journal copies recover against stale tab
  saves. Failure during journal reconciliation and stale-save regressions both pass. “Canonical” is
  recovery priority, not assessment provenance.

The review reported no security concerns. Its Minor suggestion for a genuinely interleaved two-tab
admission test is deferred to the atomic assessment work in T04; current tests cover stale whole-store
overwrites and pure concurrent-candidate replay. The reviewer did not rerun the final full browser
suite or native-device audio; those are separate gates.

Reviewed-source `npm run verify`: **PASS** (135 files, **2,420 tests**, lint, route type generation,
TypeScript and production build). The exact T02 regression command passed **226 tests in 11 files**.
Final reviewed-source production browser run: **180 passed / 0 failed / 16 skipped / 0 flaky**
(196 cases, 107 seconds; started `2026-10-07T23:40:45.197Z`). All 16 skips remain enumerated below.

Limits carried forward: this journal is browser-local. T04 supplies server grants and trusted
provenance; T12 transports the new collections and completes account lifecycle. Legacy scene checks
use scoped scene IDs until reviewed curriculum mapping in T11. Widget first-response text is empty
because the existing widgets report correctness only; T06 supplies their actual shared values and
resume state. None of these records establishes academic benefit or real-family launch readiness.

## All 16 baseline skips

Each row below runs in **both desktop and phone**, so eight scenarios account for all 16 skips.
No required provider-free, browser-local journey is skipped. A skipped scenario is not a pass.

| Scenario | Why skipped in the baseline | Required environment | Owner / activation check |
|---|---|---|---|
| Parent-first account, consent receipt and revocation | Browser-local account mode | Database-backed app; production remote-capability enforcement is currently disabled | T03/T12: enable account authority, then run `accounts.spec.ts` against server mode and require this case to execute |
| Two devices see one family | Same | Same | T12: run two authenticated browser contexts against one database |
| Offline changes save on reconnect with announcements | Same | Same | T12: server-mode offline/reconnect browser case |
| Offline sign-out preserves unsent work | Same | Same | T12: server-mode interrupted-sync/sign-out case |
| Password reset in development and production | Same | Same; email configuration for actual delivery | T12: run both mode branches; simulated email does not establish real delivery |
| Account screen accessibility and phone fit | Same | Same | T03/T12: execute server-account axe journey with existing thresholds |
| Sign-up/learners/consent at 320px | Same | Same | T03/T12: execute server-account narrow-screen journey |
| One live model reply, then a forced cap | Explicit live-provider opt-in absent | Provider credentials, `KAIZEN_AI_ADDRESS_DAILY_TURNS=1`, `E2E_AI_CAP=1`, isolated budget | T03/T10: run opt-in cap case after authorization; never report the mocked cap case as live-model evidence |

Production server-account skips are a known integration gate, not an unexplained test failure.
They must be activated after T03 closes the consent/authority gap and before T12/T13 acceptance.
Live-provider spending is authorized by the owner, but credentials and measured runs are still outstanding.

## Release progress

- Done: review, product specifications, model evidence shortlist, implementation plan.
- Done: T01 current journeys and reliable input, including independent review and its Important fix.
- Done: T02 durable help/response evidence and independent review fixes.
- Next: T03 account authority; T03–T13 implementation has not landed yet.
- Done: isolated [Tutornat Vercel project](../tutornat-preview.md), protected demo deployment of T01.
- External gates: fresh provider access, hosted persistence configuration, real-device voice audition,
  reviewed EN/ES content, child-data review and observed human pilot. None blocks T03 local work.
