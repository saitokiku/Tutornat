# FRONTEND_REPAIR1_COPY_SPEC — independent SPEC check of R09–R14 + AC05 (age / language / shared visibility)

Stage: SPEC (no quality approval). Application read-only; snapshot unchanged (all 17 manifest hashes re-verified: OK).
Authority: `evidence/frontend-repair1-verification/snapshot/BUILD_CONTRACT.md` (AC-05, AC-07, AC-08, AC-09) and `FRONTEND_REPAIR_CYCLE1_PLAN.md` §3 (R09–R14).
Method: two NEW compact control-driven Chrome-for-Testing runs (real pointer clicks + `Input.insertText`; `window.__demo` used read-only), 1440×1000, isolated TMPDIR profiles, internal deadline + per-check flush. Scripts and raw evidence:
- `evidence/frontend-repair1-copy-review/copy-review.e2e.cjs` → `e2e-20261001T104944/report.json`, `run.log`, 3 PNGs (44 pass / 8 flagged; 0 exceptions, 0 console errors, 0 external requests, 29.8 s)
- `evidence/frontend-repair1-copy-review/copy-review-2.e2e.cjs` → `e2e-20261001T105142-part2/report.json`, `run.log` (11 pass / 1 halted by a script bug, see "not run")
Builder self-report (`snapshot/REPAIR_CYCLE1_REPORT.md`) was not used as evidence.

## Verdict: NOT PASS — 1 high, 1 medium, 2 low gaps. R09, R10, R11, R14 and AC05 hold on the sequences exercised; R12 fails on two edit paths; R13 has two copy truthfulness gaps.

## Gaps (severity · requirement · reproduction · expected / observed · source · proof)

### G1 — HIGH · R12/AC-09 · Mid-edit locale switch commits the Spanish *rendering* of generated text as a family edit, detaches the sample, and records a false parent edit
Repro (parent, Bea, attached reading sample): Schoolwork → locale ES → Editar on “Recuento: «La cometa perdida»” → switch locale to EN (form stays open, prefill still Spanish) → change only the due date → save.
Expected: due-only edit; `sample` stays `reading-retell`; title/instructions bytes unchanged (canonical); Record shows only `due: … → …`.
Observed (`e2e-20261001T104944/report.json` notes “S3 …”): stored task v2 `title: "Recuento: «La cometa perdida» (cuento de ejemplo)"`, `instructions: "Lee el cuento corto…"`, `sample: null`, `sampleDetached: {key: "reading-retell", version: 1, changed: ["title","instructions"]}`; Record event `edited: title: "Retell: “The Lost Kite” (sample story)" → "Recuento: …"; due: …; instructions: "Read the short…" → "Lee el cuento…"`. Consequences: the story, scripted hints/scaffold/voice and K–2 read-together scaffold disappear for that task; history claims the parent authored Spanish text they never typed; the Spanish rendering is now frozen family text (“pretend old generated text was new” — forbidden by R12).
Source: `snapshot/app.js:296` prefill `title: titleOf(task)… instructions: instructionsOf(task)` (localized rendering at open time) vs `app.js:451–452` `shown = { title: titleOf(task), … }` recomputed in the *current* locale at submit; any field whose bytes differ is sent as a change → `domain.js:110–112` detaches the sample on content-field change. Same mechanism also fires if the sample’s own localized rendering changes between versions.
Fix direction (spec, not implementation): the edit form must compare against the rendering captured at open (per-locale snapshot in the draft) **or**, better, treat a field as unchanged when its submitted bytes equal the generated rendering in *either* locale for that key/version; never emit a change for a field the family did not type in.

### G2 — MEDIUM · R12 · After a legitimate family edit of one field, the *untouched* generated title renders in English in the Spanish UI (Schoolwork list + detail, Workspace header, Today, Record picker)
Repro (parent, Bea, ES): Editar math sample → append text to instructions only → save.
Expected: title still localized (“Arreglos de calcomanías: 15 filas de 15”) because its bytes are still the canonical generated text of `math-arrays` v1 and provenance is kept in `sampleDetached`.
Observed: list/detail/Workspace show “Sticker arrays: 15 rows of 15” inside Spanish copy — see `e2e-20261001T104944/S2-es-schoolwork-after-instructions-edit.png` (inspected: English title in list row and in “Detalle de la tarea”, Spanish instructions and Spanish origin badge “EDITADA A PARTIR DE UN EJEMPLO REVISADO…”). Stored bytes are correct (`title` canonical, `instructions` = Spanish prefill + family suffix byte-exact, `sampleDetached.key/version` present).
Source: `app.js:34–35` `sampleOf()`/`titleOf()` only localize when `task.sample` is set; after detachment `task.sample === null` so `titleOf` returns raw bytes although `task.sampleDetached.key/version` still identify the generated text. Same for `instructionsOf`.
Spec: localize any field whose bytes equal the canonical text of `sampleDetached.key@version` (untouched generated field); family-edited fields stay byte-exact.

### G3 — LOW · R13 · Grades 3–5 student visibility statement promises “your date proposals and their decisions” although proposals are 6–8-only
Observed (`e2e-20261001T104944` note “R13 grade-4 (3–5 band) ES visibility statement”): “…tus propuestas de fecha y sus decisiones…”; EN equivalent in `copy.js:79` `rec_student_p`. Proposal form is gated `l.band === '68'` (`app.js:383`); Today proposal link gated `'68'` (`app.js:279`). Contract R13: “names actual shared classes … as applicable”.
Spec: band-aware statement (3–5 omits proposals; 6–8 includes them). K–2 `rec_k2_p` is fine.

### G4 — LOW · R13 copy · Parent Workspace labels its own counts with the student-facing heading
Observed (`e2e-20261001T104944` check “Copy: parent Workspace…”): parent role, ES: “Lo que puede ver tu madre/padre: 1 pedido de ayuda · 0 respuestas guionizadas · 0 pasos”. Source `app.js:335` `notice(t('rec_student_h') + ': ' + countsLine(sess))` inside `else if (isParent())`.
Spec: parent-facing label (e.g. “Shared record for this task” / “Registro compartido de esta tarea”), both locales.

## Holds (raw proof in `e2e-20261001T104944/report.json` / `e2e-20261001T105142-part2/report.json`)
- R09: K–2 ES student Today with a custom-only next task shows no Pista/Paso a paso/Demo de voz, one “Haz esta” action and adult note (`S4-k2-student-today-es-custom-only.png` inspected: no English leakage, disclosure bar + Spanish-draft note visible). Workspace states “No hay tutoría para esta tarea personalizada…”; explicit request recorded as “Solicitada · paso a paso”, no invented scaffold; parent Today shows “Pidió ayuda … no hay ayuda guionizada”.
- R10: ES story rendered for K–2 (3 paragraphs, complete arc, “Léanlo juntos…” scaffold, panel labelled “texto sintético de demo, no es un currículo validado”); EN story 3 paragraphs; prompts reference principio/medio/final. (PNG `S5-k2-reading-story-es.png` captured, not visually inspected.)
- R11: after “Necesito ayuda” focus is on `ws-step`, never `ws-complete`; `role=status` “Guardado localmente: tu aviso de ayuda se mostrará a un adulto en su próxima visita. No se envió nada…”; parent next visit shows the stuck flag.
- R12 (display): ES Schoolwork/Workspace/Record show Spanish generated titles, scripted replies and evidence labels (“pidió pista (respuesta guionizada disponible)”); prior scripted reply stays, localized, tagged as prior sample version; family instructions/observation/proposal reason bytes identical across EN↔ES (observation with double space, em dash, “✓”, “×” stored and shown byte-exact; proposal reason verbatim in both locales). Intake (teacher-note) ES: parsed English note bytes stored verbatim, origin/source labels localized.
- R13: parent observation hint says “El estudiante puede leer esta observación en su Registro.”; student Record shows it with source label; 6–8 Today shows “sees every proposal … word for word”, 6–8 statement names proposals; decision visible to student in both locales.
- R14: “0 tareas abiertas”/“0 open tasks”, “2 open tasks”, “2 tasks shown”, “1 help request · 1 scripted reply · 0 steps”, “1 pedido de ayuda”, form errors “Please fix N field(s)” / “Corrige N campo(s)”. (The flagged check “R14 EN schoolwork count grammatical” is a reviewer regex error — observed “Bea · 2 tasks shown” is correct; not a gap.)
- AC05: K–2 primary action and Lo hice ≥56 px tall; help buttons 60 px; 3–5 short plan/support; 6–8 proposal form + visibility.

## Not run / not certified
- Tally step text plural (`ws_tally_text`) — part-2 script halted before it (script bug: sample not reloaded in fresh session). Mobile widths, PHONE-STALL, real AT, real children, native-Spanish review: not exercised; Spanish remains draft. Reading-sample ES scaffold/voice strings (`copy.js:202–204`) exercised only via math hint + story; ES voice/scaffold replies on the reading task not clicked. Original unit/browser suites not rerun here (coordinator scope).
