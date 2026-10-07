# Lesson-first slice — frozen acceptance spec

Authored independently from the owner requirement **before** any lesson implementation,
`lesson/PLAN.md`, builder handoff or diff was read. Normative for acceptance of the
on-demand AI lesson slice. Advisory inputs (incl. `lesson/evidence/jev-scope-*.json`,
TypeSafe `jev-1.13`) informed scope only and are **not** acceptance.

Status of every check listed here at freeze time: **UNEXECUTED**. Nothing below has run.

---

## 0. Scope and non-claims

In scope: one local, adult-owner-only, invented-data test at `http://127.0.0.1:51202`
of real provider-generated K–8 math and English lessons with interactive teaching,
local canonical grading, assistance-aware evidence and a suggested next lesson.

**Explicitly NOT certified by this spec, and must not be claimed anywhere:**

| Not certified | Why |
| --- | --- |
| K–8 curriculum alignment / pedagogical correctness | two live generations are anecdotes, not curriculum review |
| Learning efficacy or mastery measurement | no learner cohort, no retention window |
| Non-reader, pre-literate or early-K usability | no such participant |
| Device breadth, assistive-technology conformance | two viewports + keyboard only; no screen-reader run |
| Native-Spanish quality / translation fidelity | `locale=es` exercises plumbing, not language review |
| Child safety / child readiness / COPPA-type posture | adult-only test, no child data, no child participant |
| Provider reliability, cost, or timeout hardening | single bounded session; see §7 gaps |
| Production readiness, deployment, data durability | nothing is deployed; no production claims permitted |

A passing run means: *the described behaviours were observed once, locally, on invented
data, by one adult operator.* Nothing more.

## 1. Tiers — what a check can and cannot establish

| Tier | Meaning | Can establish | Cannot establish |
| --- | --- | --- | --- |
| **PURE** | `node:test` against `core.mjs`, no server | grading/validation/next-goal semantics | that the UI or server uses them |
| **ENGINE** | HTTP against the running server, rejected before provider use | boundary, headers, allowlist, bounds | teaching quality |
| **FIXTURE** | Playwright with `page.route` interception | client mechanics: errors, ordering, storage, escaping, layout | provider behaviour, teaching quality, server-side guarantees |
| **LIVE** | real request, real provider, `provenance.live === true` | that actual AI teaching is produced and consumed | semantic teaching quality, curriculum fit |

Hard rules:

1. **No success fixture.** A FIXTURE check may never be the evidence that a lesson,
   feedback, hint or next-goal was produced. Success of the teaching loop is LIVE-only.
2. **Layer attribution is mandatory.** Every check records which layer it constrains
   (client / server / core). A FIXTURE check that intercepts `/api/*` constrains the
   **client only** and must say so; it is not evidence about the server.
3. **No vacuous PASS.** See §6. A check that could pass against an empty page, an
   empty list or an absent element is invalid and must be rewritten.
4. **Never record a future check as past.** Unrun checks are `UNEXECUTED`; checks that
   cannot be induced are `UNVERIFIED` with the reason. Neither is `PASS`.
5. **Max two repair passes.** After the second, remaining failures ship as recorded
   failures, not as weakened assertions.

## 2. Fixed contract (restated as the acceptance target)

### `POST /api/lesson`

Request `{ goal: 1..300 chars, subject: "math"|"english", grade: "K"|1..8,
locale: "en"|"es", adultTest: true, previous?: { goal, reason } }`

Response `{ lesson, provenance: { provider, model, live: true } }`

```
Lesson = { version: 1, id, title, goal, subject, grade, locale, intro,
           steps: [Step, Step, Step],
           path: { reinforce: {goal, reason}, advance: {goal, reason} } }
Step   = { id, prompt, explanation, hint, kind: "choice"|"numeric"|"writing",
           choices?: string[], answer?: string, visual }
Visual = { kind: "fraction",   parts: 2..12, filled: 0..parts, caption }
       | { kind: "numberline", min, max, value, caption }
       | { kind: "passage",    text, caption }
       | { kind: "tokens",     count: 1..30, caption }
```

* `steps` length is exactly 3: `steps[0..1]` are practice, `steps[2]` is the **fresh check**.
* `choice`: `answer` is the exact text of one element of `choices`.
* `numeric`: `answer` is a numeric or fraction literal; no `choices`.
* `writing`: no `answer` key (or `undefined`); never graded.
* `visual.kind` is the discriminator; unknown kinds are rejected, not ignored.
* Every string bounded, every number finite, step `id`s distinct, step `prompt`s distinct.
* `lesson.goal/subject/grade/locale` are **identical** to the request values.
* No string anywhere may contain markup, a scheme-bearing URL, or script payload
  (`<`, `>`, `javascript:`, `data:`, `http://`, `https://`, `on<event>=`).

### `POST /api/feedback`

Request `{ adultTest: true, lesson, stepId, answer: 0..1500 chars,
mode: "hint"|"answer", priorHints: 0..5 }`

Response `{ feedback: { text, verdict: "correct"|"incorrect"|"ungraded",
nextAction: "retry"|"continue", alternateExplanation }, provenance }`

* `writing` steps are **always** `ungraded`, whatever the model returns.
* The local grade is canonical: a model verdict may never overrule `gradeAnswer`.
* Unparseable model output ⇒ `ungraded`, surfaced as an error state, never a guess.
* `mode: "hint"` output is help, never evidence of an unassisted check.

### `lesson/core.mjs` exports

```
validateLesson(value) -> value | throws
gradeAnswer(step, answer) -> { verdict, reason }
chooseNext(lesson, evidence) -> { goal, reason, kind: "reinforce"|"advance" }
Evidence = { lessonId, stepId, answer, verdict, assisted: boolean,
             source: "local-check"|"ai-feedback", at: string }
```

`chooseNext` returns `reinforce` **unless** the fresh check (`steps[2]`) was answered
correctly with `assisted === false`. Writing always reinforces. Absence of recorded
hints is *not* verified external independence and must not be presented as such.

## 3. Check register

IDs are stable. `#` = live provider requests consumed.

### PURE — `verify/core.test.mjs`

| ID | Check | # |
| --- | --- | --- |
| S1 | `validateLesson` accepts a fully conforming lesson and returns it | 0 |
| S2 | rejects each of the malformed cases in the §6 table (≥24 distinct rejections) | 0 |
| S3 | rejects `steps.length !== 3`; rejects duplicate step `id` or duplicate `prompt` | 0 |
| S4 | rejects each visual variant out of range (`parts` 1/13, `filled > parts`, `tokens` 0/31, non-finite numberline, unknown `visual.kind`) | 0 |
| S5 | rejects markup / `javascript:` / `http(s)://` / `on*=` in any string field | 0 |
| S6 | rejects `choice.answer` not present verbatim in `choices`; rejects `writing` carrying an `answer` | 0 |
| S7 | `gradeAnswer` numeric: canonical equality across `0.5`/`1/2`/`.5`/` 1 / 2 `; `3/4 ≠ 0.74`; rejects `NaN`, `Infinity`, `1e400`, `"2+2"`, empty | 0 |
| S8 | `gradeAnswer` choice: exact option text correct; near-miss/whitespace-only/case-differing handled deterministically and documented in `reason` | 0 |
| S9 | `gradeAnswer` writing: always `ungraded`, for correct-looking and wrong-looking input alike | 0 |
| S10 | `chooseNext` ⇒ `advance` only for `steps[2]` correct **and** `assisted === false` **and** `source === "local-check"` | 0 |
| S11 | `chooseNext` ⇒ `reinforce` for: incorrect; correct-but-assisted; writing; evidence about `steps[0..1]` only; empty evidence; evidence for a different `lessonId` | 0 |
| S12 | `chooseNext` never returns a goal absent from `lesson.path`; `reason` non-empty and ≠ the goal string | 0 |
| S13 | `chooseNext` ignores completion count, elapsed time and hint count as mastery signals (evidence lacking a correct unassisted fresh check never yields `advance`) | 0 |
| N1 | **vacuity canary**: the S2/S4/S5 malformed table scored against a no-op validator produces ≥24 failures | 0 |

### ENGINE — `verify/engine.test.mjs` (server running, owner-test mode)

| ID | Check | # |
| --- | --- | --- |
| E1 | `GET /api/health` returns mode `owner-test`; recorded as *mode only*, explicitly **not** live proof | 0 |
| E2 | Static allowlist: each denied probe returns 403/404 with no body leak — `/.env`, `/.env.local`, `/server.mjs`, `/SPEC.md`, `/PLAN.md`, `/evidence/jev-scope-20261003T030852Z.json`, `/finalize_discovery.py`, `/package.json`, `/node_modules/playwright/package.json`, `/../PLAN.md`, `/%2e%2e/PLAN.md`, `/%2e%2e%2fPLAN.md`, `/.git/config`, `/credentials.json` | 0 |
| E3 | No directory listing for `/`-adjacent dirs; `/` serves the app document | 0 |
| E4 | Response bodies for E2 contain no credential-shaped material. Asserted by regex `(sk-|api[_-]?key|BEGIN [A-Z ]*PRIVATE KEY|ANTHROPIC)` over the body; **the body is never printed, logged or stored** | 0 |
| E5 | `Host: evil.example` on `POST /api/lesson` ⇒ rejected (4xx), no lesson body | 0 |
| E6 | `Origin: http://evil.example` ⇒ rejected (4xx) | 0 |
| E7 | `Content-Type: text/plain` / absent / `multipart/form-data` on POST ⇒ 415 or 400 | 0 |
| E8 | Body bounds: 256 KB body ⇒ 413/400; `goal` 301 chars ⇒ 400; `answer` 1501 chars ⇒ 400; `priorHints: 6` and `-1` ⇒ 400 | 0 |
| E9 | `adultTest` absent / `false` / `"true"` ⇒ 400, and no provider request | 0 |
| E10 | Unknown subject/grade/locale (`"science"`, `9`, `"fr"`, `"K "`) ⇒ 400 | 0 |
| E11 | `GET /api/lesson` and other wrong methods ⇒ 405; unknown `/api/*` ⇒ 404 | 0 |
| E12 | Document response headers: `Content-Security-Policy` present with `default-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, and **no** `unsafe-eval`, no `*` in `connect-src`/`script-src` | 0 |
| E13 | No `Access-Control-Allow-Origin: *` on any route (absent, or exact same origin) | 0 |
| E14 | `Permissions-Policy` disables `camera` and `microphone` (`camera=()`, `microphone=()`) | 0 |
| E15 | `X-Content-Type-Options: nosniff`; served client files carry correct `Content-Type` | 0 |
| E16 | One in-flight provider request: two concurrent valid `POST /api/lesson` ⇒ exactly one `200`, the other `429`/`409` with a stated reason; the rejected one did **not** produce a lesson | 2 |
| E17 | Every `200` `provenance` has `live === true`, non-empty `provider` and `model`, and `provider`/`model` match none of `/(fixture\|mock\|stub\|fallback\|offline\|sample\|canned)/i` | 0¹ |

¹ asserted over provenance already captured by E16/L-tier; consumes no extra request.

### FIXTURE — `verify/ui.mechanics.spec.cjs` (client-layer only)

All `/api/*` responses are intercepted. These constrain the **client**; they say nothing
about server behaviour and are labelled accordingly in evidence.

| ID | Check |
| --- | --- |
| M1 | Fresh load: goal/subject/grade/locale controls exist, are reachable by keyboard, and are labelled; localStorage opt-in checkbox is **unchecked** |
| M2 | Disclosure gate: before acknowledgement, zero `/api/lesson` requests fire. Disclosure text contains all four points — work goes to Anthropic, no child data, AI can err, local opt-in save |
| M3 | After acknowledgement the captured request body has `adultTest: true` and echoes the chosen goal/subject/grade/locale verbatim |
| M4 | Provider error (`500`) ⇒ error shown, previously rendered lesson still present, typed answer still in the field |
| M5 | Network failure (`route.abort`) ⇒ same preservation as M4 |
| M6 | Timeout (delayed beyond the client deadline) ⇒ timeout error shown, prior lesson and typed answer preserved |
| M7 | Malformed output (truncated JSON, valid JSON failing `validateLesson`, `steps.length === 2`, unknown `visual.kind`) ⇒ error shown; **no partial lesson rendered**; prior lesson intact |
| M8 | Cancel mid-request ⇒ request cancelled, prior lesson intact, no error-looking success |
| M9 | Explicit **Retry** control exists, and the retried request body carries the **same** `lesson.id` and `stepId` as the failed one |
| M10 | Duplicate response: fulfilling the same request twice does not duplicate or overwrite rendered work |
| M11 | Out-of-order: request A delayed, request B completes, A lands late ⇒ B's lesson remains displayed; A is discarded |
| M12 | Confirmed **Clear** invalidates late callbacks: an in-flight response landing after a confirmed clear restores nothing |
| M13 | Local grade canonical in the client: a fixture `/api/feedback` returning `verdict: "correct"` for a numerically wrong `numeric` answer still displays **incorrect** (client-layer only; server-side override is §7 G3) |
| M14 | Fixture `verdict: "correct"` on a `writing` step still displays **ungraded** |
| M15 | Requested hint marks that step `assisted`, and the resulting next-goal is `reinforce` even when the fresh check is then answered correctly |
| M16 | XSS: goal / typed answer containing `<img src=x onerror=alert(1)>`, `<script>alert(1)</script>`, `"><svg onload=alert(1)>` render as literal text; zero matching `img`/`svg`/`script` elements created; no dialog; no `innerHTML` sink hit |
| M17 | A lesson payload carrying markup in `title`/`prompt`/`visual.caption`/`passage.text` is **rejected** (M7 path), not escaped-and-shown |
| M18 | Locale switch after a lesson exists: authored lesson text is byte-identical afterwards and the lesson is **not** cleared; locale affects only the next generation |
| M19 | Keyboard fallback: every visual's interaction is operable with Tab/Shift-Tab/Arrow/Enter/Space alone; focus is visible; no control is keyboard-unreachable |
| M20 | No camera/mic: `getUserMedia`, `enumerateDevices` and `Permissions.query` are instrumented at init and never called |
| M21 | Same-origin only: every observed request URL has host `127.0.0.1:51202`; zero remote assets, fonts, analytics or beacons (`navigator.sendBeacon` instrumented and uncalled) |
| M22 | Responsive: desktop 1440×1000, 390×844, **320×568** screenshots; at each width `scrollWidth <= clientWidth + 1`; every primary action is in-viewport, hit-testable at its own centre, and ≥24 px in its smaller dimension |

### FIXTURE — persistence, same file

| ID | Check |
| --- | --- |
| P1 | With opt-in **off**, nothing is written to `localStorage` (snapshot before/after a full lesson interaction is unchanged) |
| P2 | With opt-in **on**, a full browser reload restores the lesson, the typed answers and the evidence list |
| P3 | Stored evidence entries match the `Evidence` shape and carry truthful `assisted` and `source` values |
| P4 | `localStorage` unavailable (getter throws) ⇒ app works in memory and discloses that work is **not saved** |
| P5 | Quota exceeded (`setItem` throws `QuotaExceededError`) ⇒ same: memory kept, unsaved disclosed, no data loss |
| P6 | Corrupt stored value (truncated JSON, wrong shape, hostile payload) ⇒ discarded safely, app starts usable, disclosure shown, no crash |
| P7 | Export: a real `download` event fires; the **file bytes** are read from disk, parse as JSON, and contain the current `lesson.id` and the evidence entries. Checking the button's `href`/`download` attribute alone is **not** acceptable |
| P8 | Clear: after confirmation **and a full reload**, the lesson and evidence are gone from both UI and `localStorage` |

### LIVE — `verify/ui.live.spec.cjs` (real provider)

| ID | Check | # |
| --- | --- |
| L1 | Math lesson, chosen K–8 grade and locale `en`: request succeeds, `provenance.live === true`, `validateLesson` accepts the payload, request/response goal-subject-grade-locale identity holds | 1 |
| L2 | Rendered math lesson shows 3 distinct steps (2 practice + fresh check), each with a visual that is actually interactive, plus the keyboard path of M19 against the real payload | 0 |
| L3 | Wrong answer on a practice step ⇒ real feedback whose `alternateExplanation` is non-empty and **differs** from `step.explanation` (normalised string inequality), and references the submitted answer | 1 |
| L4 | Requested hint ⇒ real hint text, step recorded `assisted: true`, `source` recorded truthfully | 1 |
| L5 | English **reading/writing** lesson (`subject: "english"`, at least one `writing` or `passage`-backed step) generates and renders a real path | 1 |
| L6 | Writing answer ⇒ real AI feedback displayed, `verdict: "ungraded"`, no score, no mastery language | 1 |
| L7 | Fresh check answered correctly and unassisted ⇒ suggested next goal is `advance`; answered incorrectly or after a hint ⇒ `reinforce`. Both branches observed (one live generation + one evidence-replay via PURE S10/S11) | 0 |
| L8 | The suggested-next **button actually starts the next lesson**: a new `/api/lesson` fires carrying `previous: { goal, reason }`, and a new, different `lesson.id` renders | 1 |
| L9 | Locale `es` generation returns `locale: "es"` and renders without layout break. Recorded as **plumbing only** — no Spanish quality claim | 1 |
| L10 | Desktop + 390 px + 320 px screenshots of the **live** lesson, saved as evidence | 0 |
| | **live budget used** | **7** |

Server cap is 12 provider requests per start. Budget: 7 live + 2 for E16 = **9**, leaving
3 for one retry. Exceeding the budget means restarting the server, which must be recorded.

### OPTIONAL — `verify/cap12.test.mjs`

| ID | Check | # |
| --- | --- |
| E18 | On a **dedicated fresh server start**, requests 1–12 are served and the 13th is refused with a stated reason | 13 |

Run only if time remains after the register above. Not run ⇒ record `UNEXECUTED`,
never `PASS`.

## 4. Locator policy

Assertions are behavioural. The **only** place a selector may be edited to match the
build is `verify/harness.cjs`'s `L` map, which resolves role-first
(`getByRole`/`getByLabel`/`getByText`) with a `data-testid` fallback.

Changing `L` to match the implementation is expected and allowed. Changing or weakening
an assertion to make it pass is a spec violation and must be reported as a failure instead.

## 5. Evidence output

Every check appends one record to `verify/runs/<ISO>/results.jsonl`:

```json
{"id":"L3","tier":"LIVE","layer":"client+server+provider","status":"PASS",
 "observed":{"alternateExplanation":"…","stepExplanation":"…"},
 "live_requests":1,"at":"2026-…"}
```

`status` ∈ `PASS` | `FAIL` | `UNEXECUTED` | `UNVERIFIED`. A `PASS` without a non-empty
`observed` is rejected by the aggregator (§6 N2).

## 6. Non-vacuity rules

The previous organizer spec produced empty-vs-empty passes. Prohibited here by construction:

1. **Guard before assert.** Any assertion over a collection is preceded by an explicit
   cardinality assertion (`steps === 3`, `choices >= 2`, `actions >= 1`). Asserting a
   property of an empty set is a FAIL, not a PASS.
2. **Compare to a captured baseline, not to a literal.** Preservation checks (M4–M6,
   M10–M12, M18) first capture non-empty text and assert it is non-empty, then assert
   equality after the event.
3. **Difference checks must be real.** L3's inequality is over normalised, non-empty
   strings both ≥ 40 characters. Two empty strings are not "different".
4. **Negative checks must be shown to have teeth.** N1 scores the malformed table
   against a no-op validator and requires ≥24 failures.
5. **N2 aggregator rule.** `verify/harness.cjs` refuses to record `PASS` when `observed`
   is absent, empty, or all-empty-string.
6. **Absence ≠ proof.** "No hints recorded" never implies independence; "no remote
   request seen" is scoped to the observed session, not to the code.

## 7. Known gaps — `UNVERIFIED`, for the subsequent code-quality review

These cannot be established by black-box behaviour in this slice. They are not failures
and not passes; they are handed to the code review that follows this spec pass.

| ID | Gap |
| --- | --- |
| G1 | **Subprocess timeout** is not externally inducible — a real provider hang cannot be forced. Requires source reading: an actual kill/deadline on the child process, not just a client-side abort |
| G2 | **No fallback** — that the server never substitutes canned content when the provider fails cannot be induced. E17's provenance denylist is a weak proxy; requires source reading |
| G3 | **Server-side local-grade primacy** — M13/M14 prove the *client* ignores a lying model verdict. Proving the *server* cannot be overruled needs a mendacious provider; requires source reading |
| G4 | **Provider non-consumption on rejected requests** (E5–E11) is inferred from status and from the later live budget still being available, not directly counted. If `/api/health` exposes a request counter, assert it; otherwise this stays `UNVERIFIED` |
| G5 | **Bounded output** — that provider output is length-capped before parsing is not inducible without provider control |
| G6 | **No child tool / memory context / content logging** — requires source and log inspection, not black-box behaviour |
| G7 | **Credential handling** — verified only as "not served and not credential-shaped in denied responses" (E2/E4), without ever reading a credential value |

## 8. Operator preconditions

1. Server running at `127.0.0.1:51202` in owner-test mode, started by the operator
   (the harness does **not** manage its lifecycle and never starts a provider-capable
   server implicitly).
2. Invented data only. No real child, account or personal data in any field.
3. Playwright 1.63.0 at `devtools/browser/node_modules/playwright`; Chrome for Testing at
   `/Users/man/.agent-browser/browsers/chrome-153.0.8010.52/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`.
4. No new dependency may be installed to run this harness.
5. Traces and screenshots contain page content: keep local, do not upload.

## 9. Acceptance decision rule

**Accept** when: all PURE and ENGINE checks PASS; all FIXTURE checks PASS; L1–L8 PASS
with `provenance.live === true`; L9 PASS as plumbing-only; §0 non-claims are stated
verbatim in whatever is shown to the owner; §7 gaps are listed as open.

**Reject** when: any live check is satisfied by a fixture; any assertion was weakened to
pass; a `PASS` lacks `observed`; or a §0 non-claim is contradicted by the product copy.

**Partial** otherwise: enumerate PASS / FAIL / UNEXECUTED / UNVERIFIED per ID. A partial
result is reported as partial — never rounded up to green.
