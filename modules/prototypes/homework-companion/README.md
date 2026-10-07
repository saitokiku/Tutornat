# Homework Companion — connected frontend demo

Runnable, zero-install parent/student frontend with a replaceable in-memory demo service. Everything is
synthetic, lives in memory only (reload loses it), and every "AI" or school connection is simulated and labeled.

## Current verification status

The repair cycle is complete, but frontend acceptance is **CHANGES_REQUIRED**. The phone's rapid Student→Parent switch remains unresolved; learner-specific Retry visibility and already-rendered status language also have known limits. See `../FRONTEND_REPAIR2_ACCEPTANCE.md` for the controlling decision and `../FRONTEND_REPAIR2_INTEGRATION.md` for exact raw results. The passing ordinary demo journey is not whole-product approval. No quality review or production readiness is claimed.

## Open it

```sh
open /Users/man/education-product-discovery/frontend/index.html          # macOS; any browser, file:// works
# or in Chrome for Testing:
"/Users/man/.agent-browser/browsers/chrome-153.0.8010.52/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing" \
  --user-data-dir="$TMPDIR/edu-fe-profile" "file:///Users/man/education-product-discovery/frontend/index.html#/today"
```

No server, no build, no dependencies, no network (CSP: `default-src 'none'; connect-src 'none'`, local font stack only).

## Run the tests

```sh
cd /Users/man/education-product-discovery/frontend
node --test 'tests/*.test.cjs'        # domain + plan + service unit regressions (Node built-in test runner)
node tests/journey.e2e.cjs            # real-control Chrome journey: writes evidence/e2e-<stamp>/{report.json,log.txt,*.png}
```

`journey.e2e.cjs` launches an owned headless Chrome for Testing (path overridable with `CHROME=`), drives the UI with real
pointer/keyboard events and `Input.insertText` (never a debug dispatcher), collects console errors, uncaught exceptions and
any external request, measures document width against the emulated device width at 1440/768/390/320, and screenshots
every destination at each width. Exit code 1 = a check failed, 2 = harness error.

## What is in the box

| File | Role |
|---|---|
| `index.html` | Shell, CSP, live regions, dialog; classic script tags |
| `domain.js` | Pure validation and transitions (tasks, sessions, assistance, checks, observations, plans, proposals, Today derivations). CommonJS + `window.Domain` |
| `demo-service.js` | Stateful fake service: single store, async commands with `{ok,data}|{ok:false,error}` shape, scenarios (normal / delayed / fail-once / unavailable), duplicate-submit guard, cancel, retry, late-result and reset guards |
| `copy.js` | Generated EN/ES labels (nav, forms, errors, loading, empty, ARIA, status, example copy). Spanish is draft copy pending native educator review |
| `app.js` | View wiring: five destinations, per-learner drafts, one `run()` command path, focus continuity, dialogs, status/undo |
| `styles.css` | Tokens and components (see `DESIGN_NOTE.md`) |
| `tests/` | `domain.test.cjs`, `plan.test.cjs`, `service.test.cjs`, `journey.e2e.cjs` |
| `evidence/` | Raw red/green unit logs and e2e runs with screenshots |
| `FRONTEND_BACKEND_CONTRACT.md` | What a real backend must provide for each mock operation |

## Destinations

1. **Today** — parent: help flags, pending decisions, open schoolwork derived from records, each linking to the exact
   task. Student: one next task, accepted plan, support choices (K–2: one big action + adult-scaffold note).
2. **Schoolwork** — list/filter/detail; create/edit with field-level validation (title ≤80, instructions ≤280, real
   ISO date, subject from list); archive with confirmation + undo; empty state → Add task / Load sample tasks;
   sample teacher-note intake (rule-based `Title:/Subject:/Due:/Instructions:` reader, explicitly not AI) with review before confirm.
3. **Workspace** — selected task; start, authored steps (verbatim), visual tally board, help requests
   (scripted replies only on the two reviewed samples; custom tasks record the request as unavailable and never fabricate a
   reply), strict whole-number check on the math sample (`1225 ≠ 225`), flag stuck, mark done (self-report).
4. **Plan** — schedule from current due dates; parent requests a deterministic mock draft, accepts/declines explicitly;
   any dependency date change or archive stales draft and accepted plan (per dependency, not last-edited); declined drafts
   cannot be accepted; grade 6–8 students propose a date change with a verbatim reason, parent decides, both see the outcome;
   decision history retained.
5. **Record** — attributed timeline (task change / student activity / student work / help requested / scripted help /
   scripted check / parent observation / plan / proposal); parent adds verbatim observation; student sees an age-appropriate
   account of parent visibility; explicit "not mastery" and planned (not measured) 48–72h / day-7 cadence.

## Demo controls (not authentication)

Role (Parent/Student), demo learner (Ari K–2, Bea 3–5, Cal 6–8) and language (EN/ES) are view switches. Drafts are kept
per learner: switching role/locale/route preserves typed text; switching learner never shows another learner's draft.
"Reset this learner's demo data" is confirmed in a dialog and only affects that learner.

## Simulated / limits (honest list)

- No backend, auth, persistence, school connection, tutoring marketplace, audio or microphone. "Voice demo" is scripted text.
- Scripted help and checking exist only for the two reviewed sample tasks. Family-created tasks get organization and
  work history, not instruction or correctness judgments.
- Completion is a self-report. Nothing here measures mastery or learning; independent checks are shown as planned/unavailable.
- Spanish copy is generated draft text; it needs review by a native-speaking educator.
- Accessibility: semantic landmarks, labels, 44px targets, visible focus, skip link, live regions, dialog focus return,
  reduced-motion are implemented and probed in `journey.e2e.cjs`; this is not an assistive-technology certification.
- K–2 screens are designed for use with an adult; the demo does not claim a non-reader can use it alone.


## Repair cycle 1 (specification repairs, 2026-10-01)

State ownership, archive/decision/sample guards, EN/ES generated sample content, focus and phone reachability were repaired; see
`REPAIR_CYCLE1_REPORT.md` for the per-finding status and evidence paths. Behaviour changes a reader of this README should know:

- Drafts are keyed per learner **and per task** (work step, answer, tally, observation, edit form); new-task, intake and proposal drafts
  stay per learner. A late command result clears only the exact revision it submitted and only touches the learner/form/task it came from.
- Retry re-runs the original command through the same completion path (same callbacks, form context and operation-specific message).
- Record keeps an explicit filter per learner: `Open in Record` selects that task, choosing *All* stays *All*.
- Archived tasks are read-only in the Workspace and at the domain boundary (`requireActive` rejects archived tasks); Restore is the way back.
- Draft decisions carry the reviewed `planId`; a replacement draft makes the old decision fail with `replaced`.
- Editing a sample's title/subject/instructions detaches its scripted help/answer key (`task.sample = null`, `task.sampleDetached` keeps key/version/time);
  a due-date-only edit keeps it. Earlier scripted replies/checks are unchanged and rendered as "from sample version N, before the edit".
- A proposal whose task due date moved is `stale` (domain + UI); a proposal on an archived task is shown *Unavailable* and is never auto-declined.
- Generated sample titles/instructions/hints/scaffolds/voice text/story render in EN and ES (keyed by sample key + version, `copy.js SAMPLE_ES`);
  family-edited text is shown verbatim. Spanish remains a draft needing native educator review.
- The reading sample includes the actual short story ("The Lost Kite", synthetic demo text, three paragraphs) in both languages.
- Counts use `Copy.tn` (singular/plural). Today lists only the support that really exists for the next task.
- Keyboard focus is scrolled clear of the sticky nav and the fixed status bar by CSS `scroll-padding`/`scroll-margin` plus a measured
  `focusin` adjustment (no key-event suppression); segmented buttons are ≥44×44; tags wrap; toast focus ring is white (≥3:1 on red).

Extra tests: `tests/repair-cycle1.test.cjs` (unit, domain/service guards) and `tests/repair-cycle1.e2e.cjs` (bounded browser regression with
measured focus/occlusion/target/contrast; `OUT=<new dir> node frontend/tests/repair-cycle1.e2e.cjs`).
