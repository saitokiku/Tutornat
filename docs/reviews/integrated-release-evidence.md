# Integrated release evidence

From Codex's `docs/reviews/integrated-release-evidence.md` on `codex/restore-learning-journeys`
(ec7b776). Only two parts were taken onto `foundation`: the T01 verification and the inventory of the
16 skipped browser cases. The rest of that file (its framing as Codex's T01–T13 release, and its
progress list) was left on the branch. Claims of owner approval or spending authority are marked
**claimed by Codex, owner to confirm** and listed as owner decisions in [STATUS](../STATUS.md).
T01 is Queue 4 step 0a; "T03/T10/T12" in the table below map to Queue 4 as shown in the
[plan's mapping table](../plans/2026-10-07-integrated-learning-release.md).

## T01 verification (Codex, on ec7b776)

Verification on the frozen code: `npm run verify` **PASS** (132 files, 2,385 tests; lint, route
type generation, TypeScript and production build). Full production browser suite on dedicated port
3296, four workers: **174 passed / 0 failed / 16 skipped / 0 flaky** (190 cases, 107 seconds).
All 11 original failing scenarios pass at desktop and phone sizes. A native Chrome replay also
passed Hint → `1` → Tab → `4` → Enter without clicking the numerator: one helped answer, no drawer.

Independent review found no Critical issues and one Important issue (cached Family Back), repaired
with the observed failing regression. One Minor is deferred: a browser variant that types immediately
from Hint without clicking the numerator. The unit regression covers that focus recovery; current
desktop/phone browser cases cover hinted keyboard Tab entry and touch entry.

Our reviews of ec7b776 re-ran this independently: the full unit suite (132 files, 2,385 tests), the
production build, and the nine affected browser specs in CI mode (104 passed, 2 skipped for the
live-AI opt-in, 0 failed, desktop and phone). They also found the half of dogfood #5 that ec7b776 left
open: typing an answer **before** taking a hint, then Enter, took a second hint. The T01 fix list
closes it in a493d06 (step 0a; after a hint, focus returns to the answer field; regression
`typed_then_hint_then_enter_checks_once`, plus the browser variant Hint → type `1/4` → Enter with no
click). Step 0a's counts, on the SHA that lands on `foundation`, go in STATUS, not here.

## All 16 baseline skips

Each row below runs in **both desktop and phone**, so eight scenarios account for all 16 skips.
No required provider-free, browser-local journey is skipped. A skipped scenario is not a pass.

| Scenario | Why skipped in the baseline | Required environment | Owner / activation check |
|---|---|---|---|
| Parent-first account, consent receipt and revocation | Browser-local account mode | Database-backed app; production remote-capability enforcement is currently disabled | T03/T12 (Queue 4 step 4b, M5): enable account authority, then run `accounts.spec.ts` against server mode and require this case to execute |
| Two devices see one family | Same | Same | T12 (4b): run two authenticated browser contexts against one database |
| Offline changes save on reconnect with announcements | Same | Same | T12 (4b): server-mode offline/reconnect browser case |
| Offline sign-out preserves unsent work | Same | Same | T12 (4b): server-mode interrupted-sync/sign-out case |
| Password reset in development and production | Same | Same; email configuration for actual delivery | T12 (4b): run both mode branches; simulated email does not establish real delivery |
| Account screen accessibility and phone fit | Same | Same | T03/T12 (4b): execute server-account axe journey with existing thresholds |
| Sign-up/learners/consent at 320px | Same | Same | T03/T12 (4b): execute server-account narrow-screen journey |
| One live model reply, then a forced cap | Explicit live-provider opt-in absent | Provider credentials, `KAIZEN_AI_ADDRESS_DAILY_TURNS=1`, `E2E_AI_CAP=1`, isolated budget | T03/T10 (4b, then the eval side track): run opt-in cap case after authorization; never report the mocked cap case as live-model evidence |

Production server-account skips are a known integration gate, not an unexplained test failure.
They must be activated after T03 closes the consent/authority gap and before T12/T13 acceptance.
Live-provider spending: "authorized by the owner" is **claimed by Codex, owner to confirm** (STATUS
decision 9, with a daily and monthly ceiling). Credentials and measured runs are still outstanding.
