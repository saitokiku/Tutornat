# Design note — tokens and components

Surface commitment: **Operate** is primary (Today, Schoolwork, Plan, Record are action lists on real records);
the Workspace is a secondary **Learn** surface with a task-centred two-column layout (controls | authored work + assistance).
No hero, no feature grid, no decorative stats; hierarchy comes from type scale, spacing and one accent.

## Tokens (`styles.css` `:root`)

| Token | Value | Use |
|---|---|---|
| `--font` | "Avenir Next", "Avenir", "Source Sans 3", "Segoe UI", system-ui | local humanist stack, no web font |
| `--bg` / `--card` / `--panel` | warm off-white oklch(0.985 0.004 85) / white / oklch(0.97 0.005 85) | page / primary panels / quiet panels |
| `--ink` / `--muted` | oklch(0.22 0.015 60) / oklch(0.42 0.02 60) | body / secondary text (≥ 7:1 and ≥ 4.5:1 on bg) |
| `--brand` / `--brand-ink` / `--brand-soft` | teal oklch(0.46 0.085 195) / 0.32 / 0.94 | primary actions, current nav, selection |
| `--success` / `--warn` / `--danger` (+ `-soft`) | green / amber / red at ~0.45 L | state tags, notices |
| `--work` / `--assist` | warm tint / cool dashed tint | student-authored work vs scripted assistance — never the same treatment |
| `--target` | 2.75rem (3rem grade 3–5 student, 3.75rem K–2 student) | min height/width of every actionable control |
| `--text-body/lead/small/h1/h2` | 1 / 1.125 / 0.875 / 1.625 / 1.1875 rem, scaled up per band | type scale |
| `--radius`, `--gap`, `--pad` | 0.625rem, 1rem, 1.25rem (0.75rem pad at ≤420px) | rhythm |
| `--nav-h` | measured at render | sticky nav height feeds `scroll-margin-top` so headings are never hidden under it |

Age bands scale only `main`; the demo chrome (disclosure, header controls, nav, scenario panel) keeps base sizing.

## Components

- `.disclosure` — persistent one-line boundary statement (demo / synthetic / memory-only / simulated AI + school).
- `.top` + `.seg` — identity line and segmented demo controls (`aria-pressed`), learner `<select>`.
- `.nav` — sticky, `aria-current="page"`, 5 equal columns at ≤420px.
- `.panel` (`.quiet` variant) — the only container; sections are `aria-label`ed.
- `.records` — flex rows: text block first, `.actions` wrap beneath when narrow; `aria-current="true"` marks selection.
- `.steps` / `.assist` — authored work (warm, solid border) vs assistance (cool, dashed; `.unavail` for unavailable requests).
- `.tally` — 10 toggle tiles (`aria-pressed`) for a shared visual count.
- `.sched` / `.plan-items` / `.timeline` — date-first grids; collapse to one column at ≤420/560px.
- `.status` — single live region toast with Retry / Undo / Close; errors mirrored to an assertive `role="alert"`.
- `<dialog>` — archive and reset confirmation; focus moves in and returns to the invoking control.
- `.scenario` — collapsed `<details>` with scenario radios, pending operations + Cancel, and per-learner reset.

## Responsive breakpoints

900px (two-column grids collapse), 768px (header stacks, nav flexes), 420px (nav grid, actions wrap, toast full-width), 350px (nav type).
Verified by document-width probe (scrollWidth and max element right edge ≤ device width) at 1440/768/390/320 in `tests/journey.e2e.cjs`.

## Motion

Only a busy spinner on in-flight buttons; `prefers-reduced-motion` collapses all animation/transition durations.


## Repair cycle 1 — design decisions

- **Origin-bound completion.** `run()` captures `{learnerId, route, role, activeFk}` when a command starts. Callbacks receive the origin;
  they mutate only the originating learner's drafts/selection, and success focus moves only when the user is still in that context and has
  not moved (`focusStillOrigin`). UI-focus rules and origin-state rules are deliberately separate so a late result can update state without
  touching focus.
- **Revision-scoped clearing.** Each submit closes over the submitted text/fields; `onOk` clears the draft only if it still equals that revision.
- **Retry = same path.** `ui.lastFailed` stores the command and its options; `retryLast()` calls `run()` with `retryOf: operationId`.
- **Guards live in the domain.** Archive read-only, draft identity (`expectedPlanId` → `replaced`), stale proposals (`fromDue` ≠ current due →
  `stale`) and sample detachment are domain rules; the service only captures the reviewed draft id at dispatch time; the UI reflects them.
- **Generated vs authored text.** Sample content is identified by `sampleKey` + `sampleVersion` (+ `index` for hints/scaffolds) on tasks,
  assistance entries, checks and events. Renderers localize only content that still matches the canonical record; anything the family edited
  is rendered byte-for-byte. History is never rewritten: detached tasks keep `sampleDetached` and old replies keep their original key.
- **Phone reachability without key handling.** CSS `scroll-padding-top/bottom` + per-control `scroll-margin` use the measured `--nav-h` and
  `--status-h`; a `focusin` listener corrects remaining overlap by scrolling, never by intercepting Tab.
- **Contrast.** Focus on toast controls is white (measured 7.2:1 on the red error toast); tally boundaries use `--line-input`. Decorative
  secondary-button outlines were not redesigned.
