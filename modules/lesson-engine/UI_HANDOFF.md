# UI handoff — lesson workspace

Owner: UI lead. Files I own and wrote: `lesson/index.html`, `lesson/app.mjs`,
`lesson/styles.css`, `lesson/tests/ui-logic.mjs`, `lesson/tests/ui-browser.mjs`,
`lesson/tests/ui-fixtures/core-stub.mjs`, this file. I changed nothing else.

## Run it

```
node lesson/server.mjs                 # engine-owned; serves 127.0.0.1:51202
open http://127.0.0.1:51202/index.html
```

## Tests

```
node --test lesson/tests/ui-logic.mjs  # 14/14 pure-logic, runs against the real core.mjs
node lesson/tests/ui-browser.mjs       # 90/90 real Chrome, 32 screenshots
```

Exact logs: `lesson/evidence/ui/green-01-ui-logic.log`,
`lesson/evidence/ui/green-02-ui-browser.log` (first red: `red-01-ui-logic.log`).

**Both suites use a synthetic API.** `ui-browser.mjs` serves `lesson/` from a
throwaway static server and replaces `window.fetch` with handwritten fixtures;
its provenance line reads `fixture-not-anthropic` on purpose. Green there proves
controls, grading wiring, races, persistence, escaping and layout — **not** live
generation. `ui-logic.mjs` imports the real `lesson/core.mjs` when present and
says which core it used on line 1; the stub under `tests/ui-fixtures/` is only a
fallback and is never shipped.

Verified separately against the real server (no provider calls spent): health
`{"ok":true,"mode":"owner-test","model":"claude-fable-5-1"}`; `/`, `/index.html`,
`/app.mjs`, `/styles.css`, `/core.mjs`, `/vendor/math-expr.mjs` all 200;
`/PLAN.md` and `/evidence/...` 404; UI boots with zero page errors and zero
offsite requests (`30-real-server-boot-1440.png`). I started that server only for
this check and killed it; nothing of mine is left running.

## What the flow does

Goal/subject/grade/locale → `POST /api/lesson` → three items (two practice, one
fresh check) → manipulate the visual → answer → help → fresh check → suggested
next goal → launch it. One question and one visual on screen at a time.

**Visuals really drive the answer.** Fraction: click part N to shade N (clicking
the last shaded part gives one back, the only route to zero). Tokens: tap to
count, each shows its ordinal. Number line: native `<input type=range>`, arrow
keys included — dragging patches the DOM in place rather than re-rendering, so
focus is never stolen. Passage: sentences are real buttons, selectable by pointer
or keyboard. A typed field is always available where an answer is deterministic;
writing is a real `<textarea>`.

**Grading.** Local `gradeAnswer` is canonical and free — a correct choice/numeric
answer spends no provider call. Errors, hint requests and all writing go live.
A wrong answer never advances: the answer stays in the field and the button
becomes "Try again". The model's verdict can never override the local one.
Writing is always `ungraded`, labelled "AI feedback, not a graded score".
Repeated mistakes get `alternateExplanation`, which the browser test asserts
actually differs from the previous one.

**Evidence** records `assisted` and `source` per attempt. The side column shows
"with help" / "no help requested" and says in print that it is not a mastery
score and cannot see work done off-screen. No percentages, streaks, points or
mastery language anywhere outside that disclaimer (asserted).

**Persistence** is an unchecked opt-in checkbox → one versioned bounded record
(evidence capped at 60) under `lesson-workspace.v1`. Quota/blocked/corrupt
storage all keep the work in memory and say so; a corrupt record is left on disk,
never silently overwritten. Reload resumes with no extra provider call. Export is
a real Blob download — the test saves it and parses the actual bytes (2.4 KB).
Clear asks first, and invalidates in-flight generations so a late response cannot
resurrect deleted work.

**Races.** One `AbortController` plus a monotonic generation token; every reply
is checked against both the token and the originating lesson id before it lands.
Covered by test: triple-clicking Generate sends one request; cancel drops the
late reply with no stale global notice; a failed generation keeps the previous
lesson *and* the typed answer; a failed check scopes its Retry to that item;
an exhausted budget (429) is stated plainly.

**Safety.** No HTML sink exists in `app.mjs` — model text reaches the page only
via `textContent`, asserted by a source scan for `innerHTML`/`eval`/`http(s)://`/
emoji/media APIs. `core.mjs` already refuses lessons containing markup, so the
browser test covers both halves: a markup-bearing lesson is refused with no
lesson rendered, and hostile *feedback* text (which is not schema-validated)
renders as literal text with nothing executed. CSP is `default-src 'none'` with
`connect-src 'self'`. No remote asset, analytics, camera/mic, or account control.

**Copy** uses Fable's `TEACHING_PROMPTS.md` section 5 EN/ES rows verbatim for the
one-time disclosure and the save label; control labels and failure messages are
mine, plain and literal. Both locales carry every key — a test fails if a Spanish
string is missing or is still English. Changing locale affects only the *next*
generated lesson; authored text is never retranslated or lost (asserted).

**Responsive/a11y.** 1440/390/320 all pass: no horizontal overflow, the question
and visual sit in the first viewport, every interactive target ≥44px, nothing
fixed overlaps the question. Skip link, `<main>` landmark, single `<h1>`, every
control named, `aria-live="polite"` only on the visual state line, visible focus.

## Not verified — do not imply otherwise

- **Live provider generation through this UI.** I never spent a call. Parent must
  run the real flow against `node lesson/server.mjs` and watch a real lesson
  render, a real mistake get real help, and the fresh check behave.
- Spanish *content* quality from the live model (only UI labels and preservation
  are tested).
- Any child-facing, curriculum, efficacy, compliance, real-device, screen-reader
  or non-reader claim. None are made in the interface.
- `prefers-reduced-motion` is honoured in CSS but untested in a real browser.

## Known rough edges

- The restart panel's open state is read off the live DOM each render (the
  `toggle` event fires too late to mirror in a flag). It works, but it is the one
  place the render reads back from the DOM instead of from state.
- Evidence rows are not individually labelled by step; they read chronologically.
- `ui-browser.mjs` is one long script with inline waits rather than a framework.
  Deliberate — no test-runner dependency was added.
