# Learning, age-band and EN/ES requirements for the connected frontend

**Status:** FINAL (owner-refocused mid-review). Independent learning/copy review by a Fable specialist subagent. Read-only: no app, test or baseline file was changed; the only writes are this file and `evidence/frontend-learning-review/model-checks.log`.
**Scope:** transferable requirements and acceptance rules for the *connected* frontend (manual task create/edit, student workspace tied to the chosen task, parent feedback/proposals, shared plan, honest ledger). The scripted prototype at `evidence/frontend-baseline/runtime/` is **reference only**; it was not certified, re-tested in a browser, or wordsmithed. Not a whole-app approval, not a curriculum audit, not a child study.

## Recommendation (scoped to learning/age/EN–ES copy)

**CHANGES_REQUIRED — for the connected frontend's requirements, not for the old demo.** Five material requirements below are not yet stated anywhere in the design package and the demo violates three of them in ways that would be misleading if ported (table in §Reference). Each comes with concrete acceptance rules. No finding needs new curriculum or backend scope; two need a human educator/child/native-speaker check that this review explicitly does not provide (§Deferred).

## Evidence base

- Read `DIRECTION.md`; all of `model.js` and `app.js` (copy tables `STR`/`TASKS`/`NOTES`/`PLAN_COPY`/`VOICE`, every generated-reply path, every verbatim path) and `index.html`.
- Tool-verified (node, `evidence/frontend-learning-review/model-checks.log`): sample arithmetic (7+5=12, 403−178=225, 3·6+7=25; 2026-10-02 is a Friday); checker contract — `"7 + 5"` (no `=`), `"13 − 8 = 5"`, `"3x = 18"` → `unparsed`; `"6 or 7"`/`"6 o 7"` → `ambiguous`; `"no, 6"` → `unparsed/negated`; `"1 2"` → `unparsed/split_number`; `"6 = x"` → `match`; draft plan "midway" item = due − 1 day; completing with 0 hints still yields `evidence: assisted_work`, `needs_independent_check`.

## Material findings (5) — requirement, why, acceptance rules

### F1. K–2 is adult-dependent in a text UI; the frontend must say so and record it, not imply independent use
**Why.** Every K–2 surface in the reference is text: scripted "voice" turns, typed board, typed companion input, text status notices. A kindergartner is typically a non-reader; without real read-aloud/speech the product is a parent-operated tool for K–2. The demo only hints at this inside task scaffolds ("with a grown-up…"). The honest ledger depends on it: a K–2 "Marked done" is the adult–child pair's self-report.
**Acceptance rules.**
1. Starting any K–2 session shows an adult gate: "A grown-up is here with me" / "Un adulto está aquí conmigo" (big, icon + label). If not confirmed, the session is labelled `adult_presence: unknown` and the child view stays usable but shows no "done" evidence copy at all.
2. Session records carry `assist.adult_present ∈ {confirmed, unknown}`; the ledger evidence class for K–2 self-reports reads "Self-report with a grown-up" / "Autoinforme con un adulto" (or "…grown-up presence unknown" / "…presencia de un adulto desconocida"). Never "independent".
3. Parent view of a K–2 child shows a standing note: EN "K–2 sessions expect a grown-up to read with the child and press the controls together. Nothing here is an independent check." ES "Las sesiones K–2 esperan que un adulto lea con el niño o la niña y usen los controles juntos. Nada de esto es una comprobación independiente."
4. K–2 child-facing copy budget: control labels ≤ 4 words with an icon; companion turns ≤ 2 short sentences, no evidence vocabulary ("self-report", "assisted session", "mastered", "independent check" and their ES equivalents are parent-register only). The parent view keeps every caveat.
5. Until real audio exists, no copy may claim hearing or speaking ("I heard…", "Te escucho…"); the voice control is labelled simulated in both languages.
6. Any "Ask a grown-up" control states its real delivery: EN "Your parent will see this flag the next time they look" / ES "Tu familia verá este aviso la próxima vez que mire" — never "has been asked / se avisó" unless a notification is actually sent.

### F2. Manual task create/edit must declare instruction class, checkable answer form and edit provenance
**Why.** A family-authored task has no reviewed content behind it. The companion can organize anything, but can only teach/check what the product has reviewed content for (math/literacy, DIRECTION.md §2). Edits after a child has worked on a task must not rewrite history or silently invalidate the shared plan.
**Acceptance rules.**
1. Task form fields: title (verbatim, never translated), subject, due date, band, and an explicit **instruction class** chosen or shown: `organized` (default for any family-authored task) vs `instructed` (only for product-supplied/reviewed content). The task card always shows the class: EN "Organized only — the companion keeps the date and status; it doesn't teach or check this" / ES "Solo organización: el compañero guarda la fecha y el estado; no enseña ni revisa esta tarea".
2. An `instructed` task shows, next to the board input, exactly what the checker accepts, derived from its spec: e.g. "I check one final number, or “7 + 5 = …”" / "Reviso un solo número final, o “7 + 5 = …”"; for a variable task "…or “x = …”". Copy mentioning "x" is never shown on a non-variable task.
3. Checker outcomes map to fixed copy: `match` → "That matches" (+ assisted caveat outside K–2); `mismatch` → "Not yet" + an offer of the next step; `unparsed` → "Kept on the board, not checked"; `ambiguous` → "Which one is your final answer?". An intermediate step is never called wrong (tool-verified contract above). Numbers of wrong attempts are never shown to the child.
4. Editing title/subject/due of a task that already has steps, turns or hints: the old value, new value, editor and time are kept and shown as a one-line history; a plan built on the old date becomes `stale` with the old→new dates shown to both roles; nothing is auto-rewritten.
5. Deleting a worked task is refused in v1 UI (archive instead); its ledger and assistance rows remain.
6. Family-authored text in a task is stored verbatim and shown identically in both locales; only product labels switch language.

### F3. Student workspace is bound to one chosen task; companion offers only what exists for that task; feedback is non-shaming
**Why.** The reference's generic default reply offers "check a final answer, or explain the task" even on writing tasks (no checker) and there is no "explain" command — a child who types "explain" gets the same offer back. Hint/step/turn provenance must stay per task so evidence is attributable.
**Acceptance rules.**
1. Every board step, turn, hint and checker reply carries `taskId`; switching tasks switches the whole workspace; the parent replay is rendered from the same records (one source of truth, never a second copy).
2. The companion's menu of offers is generated from task capabilities: hints only if `hints.length > hintsUsed`; "check a final answer" only if a checker exists; "explain" only if an explanation string exists for that task. Test: for each task kind × locale, the default reply contains no verb the task cannot honour.
3. Hints are counted only when the student asked (control or recognized phrase); scripted/demo assistance and adult help are separate kinds; the child sees a neutral "2 hints used", the parent sees it under help-needed. No streaks, scores, red marks or "incorrect" counters in the child view.
4. "Mark done" is always available after start and never gated on a correct answer; its confirmation says what it is: grades 3–8 "You marked this done. A short check comes later." / "Lo marcaste como hecho. Más adelante habrá una comprobación breve."; K–2 variant per F1.4.
5. Writing/reading tasks: the companion states once per session that it does not grade writing and that the parent can see the board; it never produces a model answer or rewrites the child's sentence.
6. Scaffold labels are per task kind (counting scaffold for ten frames, listening scaffold for phonics), never a shared "a way to count" label; instructions reference only controls that exist ("point to" unless boxes are actually tappable).

### F4. Parent feedback, proposals and the shared plan: verbatim, attributed, decided in the open
**Why.** DIRECTION.md: parents contribute context and corrections that must keep provenance and never auto-become mastery; the student keeps agency; no covert monitoring.
**Acceptance rules.**
1. Parent observations: free text stored verbatim, pill "Parent-reported · not verified" / "Informado por la familia · sin verificar", listed in the ledger's evidence column as their own class, never merged into status or checks. Visible to the student as "Your parent added a note" (content optional by band; decide in design, but the existence is never hidden).
2. Student proposals (3–8; K–2 proposes via the adult): task, new date, reason verbatim; status `waiting / approved / declined` shown identically to both roles; the parent's decision note (if any) is verbatim and visible to the student. The form's close action is "Cancel" / "Cancelar", distinct from "Decline" / "Rechazar".
3. Shared plan: one data object rendered by both roles with the same strings except the header ("you and your parent see the same" / "your child sees exactly this"). Plan items are keyed + dated, re-rendered per locale, never hard-coded weekdays; a deadline move marks the plan stale with old→new dates until a parent accepts a new draft. If the midway item falls on the same day as "tonight" (due = tomorrow), the two items merge or the second is labelled "Tomorrow morning" — the reference shows the same evening twice.
4. Disclosure panel "What your parent sees" is generated from the same visibility configuration that drives the parent view: every data class the parent can see (plan, status, hint counts, board, turns, proposals, help flags, observations' existence) has one line; adding a parent-visible class without a disclosure line fails the test.
5. Teacher feedback intake: anything pasted or typed by a parent is labelled "Parent-entered" and stored verbatim; extracted tasks are "Needs your review" until confirmed; only the confirmed date becomes the shared deadline, with "corrected by parent" / "corregida por la familia" provenance. Synthetic sample notes are labelled "Sample (synthetic)" / "Muestra (sintética)", not "parent-entered".

### F5. Honest ledger vocabulary and an EN/ES equivalence contract
**Why.** The ledger is the product's trust surface. The reference gets the evidence model right (completion → `assisted_work` + `needs_independent_check`, no score); the connected version must keep that and add the classes from F1/F4. Spanish in the reference is a draft with register drift that will multiply once copy is family-authored and dynamic.
**Acceptance rules — ledger.**
1. Fixed evidence classes with fixed copy in both languages: `none` "None yet"/"Todavía ninguna"; `assisted_self_report` "Self-report inside an assisted session"/"Autoinforme dentro de una sesión con ayuda"; `assisted_self_report_k2` per F1.2; `parent_observation` "Parent-reported · not verified"/"Informado por la familia · sin verificar"; `independent_check` "Independently checked (date)"/"Comprobado de forma independiente (fecha)". No percentages, scores, stars or "mastered"/"dominado" anywhere in v1 copy; planned checks read "Planned"/"Planificada" until one exists.
2. Hint column shows requested hints only; scripted/adult help appears as text, not as a number added to hints.
3. Organized-only subjects show status + deadline and the organized-only line; no evidence cell.
**Acceptance rules — EN/ES.**
4. Glossary with one rendering per term, applied by key: parent/guardian → decide "familia" (documented as the deliberate guardian-neutral rendering) *or* "madre/padre o tutor/a" and use it everywhere (the reference mixes "Madre/padre", "familia" and the calque "Tu adulto"); grown-up → "adulto"; hint → "pista"; claim (essay) → "afirmación/tesis" (educator decision); marked done → "marcado como hecho (autoinforme)"; US-Spanish register: "presiona/toca" not "pulsa", "escuela secundaria (high school)" not "preparatoria", "docente" where gender-neutral is wanted.
5. Every string with a count is a function in both locales (hint/hints, pista/pistas, pedida/pedidas); every error, status, ARIA label and live announcement has an ES entry whose meaning was checked against the EN, not only a translation — maintain a three-column table EN | ES | meaning in the copy source with a `native_reviewed: false` flag until a native educator signs it.
6. Family-authored text is never translated, auto-corrected or summarized in either direction; a locale switch changes only product copy and announces exactly that.
7. Culturally ambiguous sample content is avoided in both languages ("the Revolution" reads differently to a Spanish-speaking family; phonics examples must be language-native in each locale, which the reference already does with "ship"/"sol").

## Reference prototype — carry forward / do not port

**Carry forward (verified in code):** verbatim-vs-keyed storage split (`app.js` header comment; `turnText`/`stepText`/`genText`); completion never records mastery (`model.js completeWork`); checker that returns `unparsed` for steps and never evals; stale-plan logic with old/new dates; parent observation pill; per-band visibility disclosure text; scripted assistance recorded once and never counted as a requested hint.

**Do not port as-is (misleading in the demo; line refs in `app.js`):**
| Pattern | Where | Why it misleads |
|---|---|---|
| Generic offer "check a final answer, or explain the task" on every unmatched message | `replyDefault` :120/:301, dispatch :1382–1385 | No checker on writing tasks; no explain command exists → loop |
| "(or “x = …”)" shown to K–2 / grade 3–5 | `replyUnparsed` :117/:298 | Variable form only exists on the 6–8 task |
| "A grown-up has been asked" / "Se avisó a un adulto" | `adultAsked` :84/:265, handler :1312 | Nothing is sent; only a flag the parent sees on their next visit |
| "a way to count, not the answer" on the phonics task; "Tap each box" on inert boxes | `scaffoldLabel` :145/:326; hints :398/:408 | Wrong scaffold label; instruction references a control that does not exist |
| "Decline" as the proposal form's close button | :973 | Reads as rejecting something; nothing was sent |
| Register/meaning drift: "Tu adulto", "Pulsa", "preparatoria", "la Revolución" | :322, :278/:527, :228, :414 | US-Spanish/family-meaning issues; needs native review |

## Deferred validation (not certified here)

- D1. K–2 comprehension of the simplified child copy and of the adult gate — needs a real child/educator session.
- D2. Native US-Spanish educator sign-off of the glossary (F5.4) and of every task/error/ARIA string; "tesis" vs "afirmación" for grades 6–8.
- D3. Whether the regrouping and summary scaffolds are pedagogically sound for the stated grades (the reference's regrouping hint compresses two trades into one line) — educator review when reviewed content is authored.
- D4. Independent-check design (48–72 h / day 7) is a proposal; nothing in v1 produces `independent_check` evidence, and copy must keep saying "planned".

## Limits

- Static code/copy review plus deterministic node checks on the reference model. No children, educators, native speakers, microphone, network, real data, production calls, installs or app edits. Nothing here certifies learning outcomes or educational Spanish.
- The browser/journey matrix and the phone-emulation investigation are owned by other workers and were not repeated.
- This review cannot close parent tasks; the polish/requirements writer should apply the acceptance rules after the parent verifies them.
