# Frontend spec review — age-aware parent/student journeys and EN/ES copy

Independent, read-only specification review of the connected frontend (`frontend/index.html` + `app.js`, `domain.js`,
`copy.js`, `demo-service.js`). Reviewer: fresh Fable spec reviewer. Scope: AC-01, AC-02, AC-05, AC-08, AC-09 as
delegated (custom-task journeys, age bands, EN/ES honesty). Not in scope (other reviewers/coordinator): keyboard/mobile/
contrast (AC-06/07), service race/negative probes (AC-03/04), rerunning the implementer's `journey.e2e.cjs`.

No application file was edited. The application writer has stopped; findings are for the coordinator's gate, not fixed here.

## Evidence

- Probe (control-driven, zero dependencies, own headless Chrome for Testing profile, CDP port 0):
  `evidence/frontend-spec-journeys/probe.cjs` — run with
  `node /Users/man/education-product-discovery/evidence/frontend-spec-journeys/probe.cjs`
- Final run (counts below are read from its `report.json`): `evidence/frontend-spec-journeys/run-2026-10-01T14-23-14-330Z/`
  (`report.json`, `log.txt`, 12 PNGs). Two earlier runs (`run-…14-19-34-952Z`, `run-…14-21-37-164Z`) are kept as-is;
  they differ only by probe-side fixes (K–2 Today links only the next task; locale reset; record picker), not app changes.
- Static hypotheses written before the browser run: `evidence/frontend-spec-journeys/FINDINGS-preliminary-static.md`.
- Baseline reference used for "absent from baseline": `evidence/frontend-spec-initial/snapshot/` (unchanged).

Final run: **58 checks — 45 passed, 13 failed, 0 harness errors; 0 external requests, 0 uncaught exceptions, 0 console
errors.** The 13 failures map to 8 findings (F1–F8 below); one failure (`S3 ES record …`) is a probe expectation that was
defeated by F7 and is counted under F7, not as a translation defect.

Screenshots inspected by eye (not only generated): `S1-student35-today-custom-only-EN.png`,
`S2-k2-workspace-reading-ES.png`, `S4-student35-record-sees-parent-observation-EN.png` (what they show is stated under each
finding). Also produced: `S2-k2-today-ES.png`, `S2-k2-workspace-math-ES.png`, `S3-parent-today-archived-task-proposal-EN.png`,
`S3-student68-plan-declined-ES.png`, `S7-es-form-errors.png`, `S7-es-pending-delayed.png`,
`S8-k2-workspace-after-necesito-ayuda-ES.png`, `S1-student35-workspace-custom-voice-EN.png`.

All records are fictional (learners Ari/Bea/Cal from `domain.js` LEARNERS; task text typed by the probe).

## Verdict per scoped criterion

| AC | Verdict | Basis |
|---|---|---|
| AC-01 custom task, identity, archive/restore | **PASS (scoped)** | S6: edit keeps id, version 1→2, Record shows `subject: "math" → "reading"` and old→new instructions; archive removes the task from student Today and the Plan schedule; restore returns `open` with the verbatim step and the help-request entry intact; Record shows `archived` then `restored`. |
| AC-02 connected journey | **PASS with one Medium dead end (F6) and one Low dead control (F7)** | S1/S4: parent creates → student starts, authors a step, asks for help (recorded unavailable), flags stuck → parent Today flags both, parent Record shows the exact step and stores the observation verbatim → student Record shows the parent observation and the disclosure says "notes they wrote". S3: 6–8 proposal → parent decline → student sees "Rechazada por madre/padre" + verbatim reason in both roles. |
| AC-05 age and language | **FAIL on example-copy coverage (F4) and sample content (F2); K–2/3–5/6–8 structure otherwise PASS** | K–2: one big "Do this one"/"Haz esta" link ≥ 44 px, adult note present, explicit "does not claim a non-reader can use it alone" (EN and ES), no answer check for K–2. 6–8: proposal form, "word for word"/"palabra por palabra" visibility note, decision visible to both roles. ES: nav ARIA label, `html lang`, field error, form summary, fail-once + Reintentar, pending + Cancelar, Cancelado, unavailable "No se cambió nada", empty list copy all Spanish; authored titles (`Título con tilde ñ`, `Spelling list 7 (custom)`) and reasons unchanged by locale; disclosure marks Spanish as a draft needing native review and never claims review happened. |
| AC-08 honesty of custom tasks / voice | **PASS with one Medium surface (F1)** | Custom task: workspace says "No tutoring available for this custom task…" before any click; voice demo on a custom task records `requested/unavailable`, no scripted text, no audio claim; sample scripted replies are labeled "Scripted sample reply"/"Respuesta guionizada de ejemplo" and their content matches the task (sticker rows / story retell). |
| AC-09 self-report vs mastery, requested vs scripted | **PASS (scoped)** | Done is `complete_self_reported`, `mastery: not_assessed`, no "assisted/independent/with help" wording anywhere on the workspace; parent Record shows "self-reported done", "NOT mastery", and `1 help requests · 0 scripted replies` for a zero-reply custom task. |

No High-severity honesty violation was found: nothing claims real audio, real tutoring, real checking, mastery, or delivery
to school/parents.

## Findings (prioritized)

### F1 — Medium — Student Today advertises Hint / Step-by-step / Voice demo for a learner whose only task is custom (AC-08, AC-05; advisor §1)

- Repro (EN, parent → student): Schoolwork → Add task → title `Spelling list 7 (custom)`, subject Reading, due `2026-10-06` → Create task. Switch View as → Student → Today.
- Expected: support offers derived from the selected task's actual capability; a custom task should not be presented with Hint/Step-by-step/Voice demo as "Support you can ask for" (advisor §1: "A generic … offer is unacceptable unless that action actually exists for the selected task").
- Actual (`S1-student35-today-custom-only-EN.png`, inspected): panel "Support you can ask for" shows tags **HINT · STEP-BY-STEP · VOICE DEMO · ASK A GROWN-UP** plus the voice-is-text note; nothing says these are unavailable for this task. The unavailability is disclosed only after navigating to Workspace (`task_custom_note`, `ws_help_unavailable`).
- Source: `frontend/app.js:209` renders the panel unconditionally for 3–5/6–8 students from `copy.js` `support_*` keys; capability lives in `domain.js:218-230` (`available: !!sample`).
- Checks: `S1 … H1 …`, `S1 … no per-task unavailability wording` (both FAIL). Not in baseline (`journey.e2e.cjs` only checks the panel after `load-sample`).

### F2 — Medium — Reviewed reading sample tells a K–2 child to "Read the short sample story", but no story text exists anywhere (AC-05, AC-08)

- Repro: Demo learner Ari (K–2) → Schoolwork → Load sample tasks → View as Student → Schoolwork → Open "Retell: “The Lost Kite” (sample story)" → Workspace → I started → Hint.
- Expected: a reviewed sample whose instructions and scripted hints refer to a story shows that story (or says the story is on paper / not included).
- Actual (`S2-k2-workspace-reading-ES.png` and EN run text, inspected): instructions "Read the short sample story and retell the beginning, middle and end…"; hint "Scripted hint 1: Who is the story about? Start with a name."; voice demo "Read the first sentence out loud…". No narrative text is rendered on Today, Schoolwork detail, Workspace or Record; `grep -i "kite\|story"` over `app.js`/`domain.js` finds only the title, instructions and hints (`domain.js:153-158`). The child/adult is asked to read a sentence that does not exist in the demo. This is a concrete confusing task behavior, not a request for curriculum expansion.
- Checks: `S2 … H3 …` (FAIL; `storyMentions: 1`).

### F3 — Medium — After "I’m stuck" / "Necesito ayuda", focus is moved onto "Mark done (self-report)" / the big "Lo hice" button (AC-02, AC-09; advisor §3 "do not focus decision buttons merely because a render completed")

- Repro: any student band, started task → click "I’m stuck" (K–2 ES: "Necesito ayuda"). Read `document.activeElement`.
- Expected: focus goes to a meaningful successor (the step field, the help buttons, or the status), not to the self-report-done control.
- Actual: `activeElement = ws-complete|Mark done (self-report)` (3–5, EN) and `ws-complete|Lo hice` (K–2, ES, `S8-k2-workspace-after-necesito-ayuda-ES.png`). For K–2 the big "Lo hice" now holds focus directly after the child said they need help; a second Enter/Space self-reports done.
- Source: `frontend/app.js:273` `focusNext: 'ws-complete'` on `flagStuck`.
- Checks: `S4 … H6 …`, `S8 … K–2 ES …` (both FAIL).

### F4 — Medium — In Spanish, all example copy (sample task titles, instructions, scripted hints/scaffold/voice) stays English (AC-05 "English/Spanish cover … example copy"; README claims copy.js covers "example copy")

- Repro: Ari (K–2) → Load sample tasks → Student → Workspace on either sample → Idioma ES → Pista / Paso a paso / Demo de voz.
- Expected: product-generated example copy is in the selected language (authored family text stays verbatim — that part passes). At minimum, the ES disclosure or sample tag should say the sample content is English-only.
- Actual (`S2-k2-workspace-reading-ES.png`, inspected): Spanish labels ("Asistencia…", "RESPUESTA GUIONIZADA DE EJEMPLO", "Necesito ayuda") wrap English content: "Retell: “The Lost Kite” (sample story)", "Read the short sample story…", "Scripted hint 1: Who is the story about?…", "Scripted voice demo (text only): “Read the first sentence…”"; math scaffold likewise English. A Spanish-speaking K–2 adult/child gets English task text and English scripted "help".
- Source: `frontend/domain.js:145-160` (SAMPLES are single-language and copied into `task.title/instructions` at load; `scriptedTextFor` has no locale); `copy.js` has no ES sample strings.
- Note: because sample text is frozen into task records and events, a later fix must keep already-recorded history immutable (AC-09); this review does not prescribe the mechanism.
- Checks: `S2 … H2 … scripted …`, `S2 … H2 … title/instructions …` (both FAIL).

### F5 — Low — Visibility disclosures do not match the rendered data classes (advisor §3 "Parent-visibility disclosure must match the actual rendered data classes")

- Student side: "What your parent can see: this task, the steps you wrote, the help you asked for, and notes they wrote." Parent Record (`app.js:321-335`) also renders student activity (started / flagged stuck / self-reported done), every typed answer with its verdict (`check_scripted`), plan and proposal events. Stuck flags and self-reports are not listed.
- Parent side: the observation form (`app.js:341-344`, `copy.js` `obs_label`) says "stored exactly as typed, tied to this task" but not that the student will read it; the student Record does show it verbatim (`S4-student35-record-sees-parent-observation-EN.png`, inspected: "PARENT OBSERVATION (VERBATIM) — She mixed up their/there — needs a nudge tomorrow"). The student-side disclosure does say "notes they wrote", so the student is informed; the parent is not.
- Checks: `S4 … parent observation form discloses …`, `S4 … student disclosure mentions …` (both FAIL); `S4 … if student sees parent notes …` (PASS).

### F6 — Medium — Pending proposal on a task the parent later archived stays an actionable "Waiting for your decision" item whose Accept can only fail with a generic message (AC-02 "no core dead ends"; advisor §3 "archive … excludes archived tasks from … proposal targets")

- Repro: Cal (6–8), parent: create `Lab report draft` due 2026-10-08. Student → Plan → propose 2026-10-11, reason "Soccer tournament Fri–Sat" → Send. Parent → Schoolwork → Archive → Confirm. Parent → Today, then Plan → Accept.
- Expected: archiving removes the proposal from the decision queue (or marks it void/blocked with the cause); Accept is either absent or explains "task was archived".
- Actual (`S3-parent-today-archived-task-proposal-EN.png`): Today lists "Date change proposed for “Lab report draft” — Review in Plan"; Plan still offers Accept/Decline; Accept fails with status "Not allowed in the current state." (`copy.js` `e_conflict` via `app.js:76`); the proposal stays `pending` forever unless declined. Domain protection itself holds (date unchanged, `domain.js:419`).
- Source: `domain.js:441-442` (`pendingDecisions` includes every pending proposal regardless of task status); `app.js:302` renders Accept for every pending proposal.
- Checks: `S3 … H5 … NOT offered …`, `S3 … H5 … names the archive cause` (both FAIL); `S3 … domain protected …` (PASS).

### F7 — Low — Record picker option "All tasks for {name}" is dead once a task is selected (AC-02 "no ornamental controls")

- Repro: parent, Bea, Schoolwork → Open a task → Record → choose "All tasks for Bea" in the Task select.
- Expected: learner-wide timeline.
- Actual: the select snaps back to the selected task (`#rec-task.value === 'task-1'`), the per-task timeline and observation form stay. Source: `app.js:317` (`if (!rt && selectedId()) rt = selectedId();` overrides the cleared choice on every render).
- Checks: `S8 … Record picker …` (FAIL). The probe's `S3 ES record …` FAIL is a consequence of this (it tried to read the learner-wide ES record); the per-task ES record it did read was correctly Spanish with the verbatim reason.

### F8 — Low — Count line ignores singular/plural in both languages (advisor §3 "correct singular/plural handling are recommended")

- Observed: EN "1 help requests · 0 scripted replies · 1 steps"; ES "1 pedidos de ayuda · 1 respuestas guionizadas · 0 pasos" (`S8.esCounts`). Source: `copy.js:81`, `:156` (`counts`). Also "1 open tasks" (`student_remaining`) on student Today (`S1-student35-today-custom-only-EN.png`).

## What passed (scoped, control-driven)

- AC-01: stable ids across edit; version bump; old→new field provenance in Record; archive/restore preserves authored step and assistance history; archived task leaves student Today and schedule.
- AC-02: parent-created custom task → student Today → Workspace start → verbatim step → help request recorded as unavailable (no fabricated reply) → stuck → parent Today flags (stuck + "no scripted help exists for this custom task") → parent Record shows exact step → parent observation stored verbatim → student Record shows it with the "notes they wrote" disclosure. 6–8 proposal → decline → both roles see "Rechazada por madre/padre" + verbatim reason; date unchanged; Record keeps `propuso … → …` and `propuesta rechazada`.
- AC-05 K–2: single big next action (≥ 44 px), "A grown-up should sit with you", K–2 adult note with explicit no-non-reader claim, in EN and ES; no typed answer check for K–2; scaffold content matches the sticker-array task. 6–8: proposal form + "word for word" note on Today and Plan. ES coverage of navigation, ARIA nav label, `lang`, field errors, form summary, fail-once/retry, pending/cancel, unavailable, empty filtered list; authored titles with `ñ`/accents preserved and never translated; Spanish marked as generated draft requiring native review (no review claim).
- AC-08: voice demo on custom task → requested/unavailable, no text, no audio claim; scripted replies labeled and task-matching on samples; 0 network requests under CSP.
- AC-09: self-reported done ≠ mastery (`not_assessed`), no assisted/independent classification; requested vs scripted counted separately (`1 help requests · 0 scripted replies`).

## Not tested here (do not read as pass)

- 3–5 "short manageable plan" length/ownership beyond the accepted-plan panel; mock draft staleness and re-accept (baseline suite covers).
- Teacher-note intake flow; reset-learner; learner-switch draft isolation (baseline/coordinator).
- Keyboard traversal, 320/390/768 layouts, contrast, reduced motion (other reviewer).
- Service races, late results, duplicate guard (coordinator).
- Any real child, native-speaker or assistive-technology validation.

## Call/time accounting

Review executed within the delegated budget (static read → probe write → 3 probe runs → 3 screenshot inspections → report);
no subdelegation; no app, test, git, network or install mutation. Earlier probe runs were kept, never deleted.
