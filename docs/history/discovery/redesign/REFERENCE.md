# Kaizen-AI dashboard interior — local reference

Reconstruction of the original shell + Today tab from the read-only snapshot `snapshots/Kaizen-AI` @ 91af9e4 (`web/`).
NOT a screenshot of the original running anywhere; fixtures are fictional (`reference/src/fixtures.js`).

## Run / artifacts
`cd redesign/reference/devtools && node build.cjs && node node_modules/tailwindcss/lib/cli.js -c tailwind.reference.config.cjs -i ../../../snapshots/Kaizen-AI/web/app/globals.css -o ../dist/reference.css && node shoot.cjs`
Open `redesign/reference/index.html`. Captures: `redesign/evidence/reference/{desktop-1440x1000,phone-390x844}[-fullpage].png`, `capture-report.json`.
Pinned local deps (scripts disabled): esbuild 0.24.2, react/react-dom 19.1.0, tailwindcss 3.4.17 under `reference/devtools/node_modules`.

## What the original does well (keep)
- One job per page. Today is "a plan, not a dashboard": greeting → compact 7-day strip → one lifted next-step card → flat rows (Also due today / This week) → quiet record last (`components/TodayView.js:15-16, 243-399`).
- Chrome reads as furniture: 240px rail on panel2 (#f1f1ef), content on paper (#fafaf9), white reading column max 896px (`app/dashboard/page.js:602-606, 687`). Active tab = white tile + soft shadow + 2px rose rule; no filled nav (`page.js:614-619`).
- Ink acts, rose marks: every primary is the same black pill; outlined pill is secondary; accent is reserved for marks/eyebrow/selection and the rose pill is not a default action (`app/globals.css:70-88`, `components/ui/Button.js:12-30`).
- Type carries hierarchy: brand face for h1/h2 (t1 26px / t2 20px, negative tracking), body 14–16px, mono micro uppercase labels (`.k-label`) and tabular numbers for dates/minutes (`tailwind.config.js:52-63`, `globals.css:101`).
- Shape lock: inputs 10px, cards 14px, large panels 20px, buttons pill, nothing else rounded (`globals.css:59-63`, `tailwind.config.js:64-69`).
- Row recipe: 28px circle check · title · dotted meta (subject dot · due · minutes) · one secondary pill · ⋯ overflow; Delete lives behind ⋯ with Cancel (`TodayView.js:102-171`).
- Phone: same five tabs in a fixed bottom bar with a top rose rule; rail is lg-only; same selection language on both (`page.js:694-712`).
- Copy discipline: task-level acknowledgement, no person-praise, streak as neutral history (`TodayView.js:18-28, 256-260`). Empty state is honest, not "you're ahead" (`components/ui/EmptyState.js` header).

## What differs in this reconstruction
- Shell JSX (`page.js:600-712`) and TABS (`page.js:39-43`) are a static extraction into `reference/src/entry.jsx`; auth/sync/intake hooks replaced by fixture state. TodayView, ui/Button, ui/Card, ui/Eyebrow, ui/AppFooter, Rings, TaskModal, Brand, Icons, lib/appState, lib/courses, lib/mastery are the real snapshot files, bundled (`reference/dist/bundled-sources.txt`). `next/link` is stubbed.
- Plan/Learn/Grades/Growth tabs render a "Not reconstructed" card. Tutor / Add anything / Dive in / Sign out show a note in the disclosure strip instead of opening StudySession, IntakeBox or a session.
- Fonts: the original loads Schibsted Grotesk / Instrument Sans / IBM Plex Mono via `next/font/google` (`app/layout.js:2-24`). No network here: captures render the snapshot fallback stacks (system-ui / ui-monospace). Treat glyph shapes as approximate; spacing, scale, color and composition are exact.
- A reference-only disclosure strip (~28px) sits in flow above the content column; footer and account links are inert.
- Fixture due times are 15:00 local because `isToday()` compares UTC day strings (`lib/appState.js:70-93`); the Oct 1 week strip and "Also due today" reflect that.
- Not our product direction, shown only because the real component renders them: "Start with the tutor", rings / mastery %, curiosity dive, streak pill, Grades, "ages 13 and up" footer line. Keep the composition and chrome; do not port these contents.
