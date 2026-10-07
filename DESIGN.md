# Design

The KaizenEDU system. Authoritative for every screen in `apps/web`. Tokens and browser surfaces live in
`apps/web/src/app/globals.css`; primitives in `apps/web/src/components/ui.tsx` (+ `components/kit/`);
icons in `components/icons.tsx`; the mark in `components/brand.tsx`. Inherited from the Kaizen-AI
dashboard the owner chose (`modules/kaizen-ai/web/`, notes in `docs/history/discovery/redesign/REFERENCE.md`).

**Owner direction (2026-10-07, final): same world, max craft.** Owner's rule: "dont make anything look or
sound or feel like AI slop."

## World

Warm paper and white panels, near-black ink, one restrained rose. A well-made notebook and a quiet
classroom — never a game, never a SaaS console. **Ink acts, rose marks**: every primary action is the same
ink pill; rose is selection, the active-tab rule, focus, the caret and small marks — never a default button.
Light only (`color-scheme: light`): children learn at a table in daylight or lamplight, on paper-coloured
screens; a dark theme waits until there is a reason in the use scene.

## Color

| Token | Hex | Role |
|---|---|---|
| paper | #FAFAF9 | page background |
| panel | #FFFFFF | cards, reading column, stage, overlays |
| panel2 | #F1F1EF | rail, wells, inset groups, disabled fills |
| border | #E4E3DF | hairlines (cards, rows, dividers) |
| border-strong | #CFCCC5 | hover hairline, dashed empty states, decoration lines |
| field | #8E8A82 | the edge of every input, select, textarea and custom checkbox: 3.4:1 on panel, 3:1 on panel2 (WCAG 1.4.11) |
| ink | #1A1917 | text, primary buttons (16.8:1 on paper) |
| muted | #6B6862 | secondary text and placeholders (5.3:1) |
| accent | #A93B5D | rose: selection, focus, caret, marks (5.8:1) |
| good / warn / bad | #4F7A5B / #8A6412 / #B3453F | status only, always with an icon or words |
| math / science / english | #3E6E8E / #4F7A5B / #A93B5D | subject marks: a dot, a thin rule, a tinted visual — never a full-bleed fill |

- Tints are `color/8–10` of the status colour on panel2-weight surfaces (Notice, Badge). Text on them stays ink.
- `prefers-contrast: more` darkens muted to #4A4743, borders to #AAA69D/#78746B, field to #6B6862 and
  thickens the ring to 3px.
- Forced colours: every control gets a system border; selected states use Highlight/HighlightText; fills
  (progress, tab rule, thumb) use Highlight. Nothing relies on a background colour alone.

## Type

| Role | Face | Size / line | Use |
|---|---|---|---|
| d1 · d2 · d3 | Schibsted Grotesk 600 | 60 · 44 · 34, tracking −0.032…−0.025em | page heroes, finish screens |
| t1 · t2 · t3 | Schibsted Grotesk 600 | 26 · 20 · 17 | page title, section, card title |
| body · sm · xs | Instrument Sans 400–700 | 16/1.6 · 14 · 13 | reading, UI, meta |
| meta | Instrument Sans, xs, muted, tabular figures | 13 | `k-meta`: counts, minutes, dates, "Gr 3 · 4 lessons" beside a title |
| badge | Instrument Sans 600, xs, sentence case | 13 | `k-badge` / `Badge`: Demo, Draft, In Spanish |
| figures | Instrument Sans or the brand face, tabular + lining | inherit | stats (`Stat`), answers, number-line labels, answer choices |
| mono | IBM Plex Mono 400–600, tabular | inherit | keycaps (`Kbd`), keypad digits, timestamps in tables, codes, printed records — nothing else |

- The brand face is loaded at 600 only — headings never use another weight. Body is one variable file.
  Fonts load with `display: swap` over metric-matched fallbacks; the latin subset covers Spanish and − × ÷.
- Mono is never a costume for "technical": a meta line, a badge, a status word or a heading kicker in mono
  is a bug. Meta is `k-meta`. Children's numerals (answers, choices, number lines) are in the body face,
  whose footless 1 is the one they learn to write. One separator everywhere: " · ".
- Common Core codes are records, not learner UI: parents' records, print and a "Standards" disclosure only.
- Headings `text-wrap: balance`; prose `text-wrap: pretty`; measure 65–75ch (`max-w-prose` = 46rem).
- Prose (`p, li, dd, blockquote, figcaption`) hyphenates long words (≥10 letters) in English and Spanish
  via `<html lang>`. Never in mono, labels, controls or headings, and never in the K–2 band.
- Figures are tabular + lining wherever numbers are data (`table, time, data, output, dd, kbd, .font-opmono, .k-meta`).
- No eyebrow/kicker labels above headings. No gradient text. Emphasis is weight or size.
- An arbitrary `text-[Npx]` in a screen is a bug: use a role.

## Shape and depth

Shape lock: inputs 10px (`rounded-sm`), cards 14px (`rounded-md`), large panels and overlays 20px
(`rounded-lg`), buttons and chips pill. One amendment: keycaps (`Kbd`) are 6px (`rounded-key`), because a
pill keycap reads as a badge. Nothing else is rounded.

Three depths, each with one meaning. Shadows are warm ink, offset downward, layered contact + ambient; never
a coloured halo, never a hard offset.

| Depth | Token | Meaning |
|---|---|---|
| soft | `shadow-soft` | sits on the page: cards, rows panel, the segmented thumb |
| lift | `shadow-lift` | the one thing to do next (the Next card) and overlays (dialog, sheet, toast) |
| well | `inset-shadow-well` | recessed: where a piece goes — answer slots, manipulative trays, tracks, `k-well` |

The primary ink pill carries a 1px contact shadow and a faint top highlight; pressed, it loses both and
scales to 0.98 — it sinks. A disabled primary *empties* (panel2 fill, muted text): ink only appears when the
action can happen. A loading primary stays ink with a spinner: working, not unavailable.

## Spacing

Tailwind's 4px grid is the scale. Named jobs: `target` (2.75rem; 3.5rem in K–2) for primary hit areas,
`gutter` (1rem side gutter on phones), `section` (2.5rem between page sections; 3rem in K–2). Tight inside a
group, generous between groups, more space above a heading than below it.

## Motion

One authored moment per surface; everything else is quiet feedback. Arrivals decelerate exponentially;
exits accelerate and are shorter. Content is visible by default — animations only play from a starting
state toward it, so a failed script or reduced motion never hides anything.

| Token | Value | Use |
|---|---|---|
| `--duration-instant` | 90ms | press feedback (scale) |
| `--duration-quick` | 160ms | hover, colour, small state changes, exits |
| `--duration-base` | 240ms | disclosure, toggles, chevrons |
| `--duration-slow` | 380ms | overlays, enters, sliding marks, page transitions |
| `--duration-focal` | 560ms | the authored moment: the pen mark, a fill arriving, the tree growing |
| `ease-out-expo` | cubic-bezier(.16,1,.3,1) | arrivals |
| `ease-out-quart` | cubic-bezier(.25,1,.5,1) | small UI state |
| `ease-exit` | cubic-bezier(.5,0,.75,0) | leaving |
| `ease-spring` | linear(…), 1.5% overshoot | only things that slide into place: tab rule, segmented thumb |

Helpers: `k-enter` / `animate-enter` (fade + 6px rise), `animate-exit`, `k-stagger` (children enter in
order, 40ms apart, capped at 280ms — only for a list appearing as a list), `k-draw` (strokes with
`pathLength="1"` draw like a pen; `IconCheck`, `IconCheckCircle`, `IconMarkProved` support it), `k-grow` /
`<KaizenMark grow>`. Animate transform, opacity, clip-path and filter; never width/height/margins.

Route transitions are opt-in: wrap a page's content in `<PageTransition>` (in `page.tsx`, not a layout).
The old page steps back in 160ms, the new one rises and settles in 380ms. Give the shell's rail and tab
bar `k-vt-rail` / `k-vt-tabbar` (and a focus header `k-vt-header`) so they never move.

**Reduced motion:** nothing travels and nothing loops (`--rise: 0`, loops stop, view transitions are
instant), but colour, opacity and outline changes still play, and enters become a 160ms fade — a press, a
selection and an arrival stay legible.

Control labels keep contrast throughout a state change. Buttons and chips switch foreground,
background and disabled opacity together; border, shadow and press motion can still animate.
Small answer-key labels use ink over the pale green review row.

## Browser surfaces

All themed from the palette in `globals.css`; screens never restyle them.

- Selection: rose at 20% on panel, ink text. Caret: rose. Placeholder: full muted (5.3:1), enforced outside
  the layers so `placeholder:text-muted/70` in a screen can't fade it.
- Focus: `outline: 2px solid accent`, offset 2px, on every control. Fields carry it on their edge
  (offset −1px) so text never shifts. Headings focused programmatically (`tabIndex={-1}`) show none.
  `outline-none focus-visible:outline-2` draws a solid ring (a system rule sets the outline style on
  focus); plain `outline-none` still hides it, so a container that hides its field's ring must show
  `focus-within` itself.
- Fields: a 3:1 `field` edge (muted on hover, rose on focus). Hairline `border` is for cards only.
- Hit areas: a text-style button or link on its own line takes `k-tap` (32px mouse, 44px touch).
- Phones: the root keeps `scroll-padding-bottom` above the fixed tab bar, so a control Tab brings into view
  is never under it (WCAG 2.4.11). JS `scrollIntoView({ behavior })` passes `"auto"` under reduced motion.
- Scrollbars: thin, ink at 24% on transparent; `scrollbar-gutter: stable` so a modal never shifts the page.
- Links: underline offset 0.22em, thickness 0.07em; `k-link` for prose links (border-strong underline,
  rose on hover).
- Native controls: `accent-color` rose; `select.k-input` has the drawn chevron.
- Touch: no tap highlight (every control has a pressed state), `touch-action: manipulation`, no text
  selection on buttons, tabs, radios and summaries (no accidental selection from repeated taps).
- Overscroll: no horizontal swipe-back from the page; overlays contain their own scroll.
- Safe areas: `viewport-fit=cover`; body pads left/right insets; sheets and the tab bar pad the bottom inset.
- `formatDetection` off: phones never turn practice numbers into phone links.
- Print: no rail, tab bar, buttons or toasts; ink on white; cards and rows don't split across pages;
  headings keep with what follows; external links print their URL. Records print cleanly on Letter/A4.

## K–2 band

**Contract.** `<html data-band>` holds the current learner's band: `k2 | 35 | 68 | 9 | adult`. The root
layout's `<BandSync>` (components/kit/band.tsx) sets it from the selected learner's grade and removes it for
the grown-up view and signed-out pages. Screens never set it; they read it with CSS (`[data-band="k2"]`)
or `useBand()`. Only `k2` changes the look today.

`[data-band="k2"]` raises, through tokens, so every screen follows without code:

- body 18px, sm 16, xs 15; t3/t2/t1 move up one step (20 · 26 · 34), d3 40, d2 48;
- the spacing unit grows 10% (`--spacing: .275rem`), sections 3rem;
- primary targets (`k-btn`, `IconButton` md, `size-target`) are 56px, and so is every small control a
  child taps: `k-chip`, `btn(…, "sm")` and `IconButton` sm (marked `k-btn-sm`) grow to `--spacing-target`;
- icons scale 1.12×; no hyphenation.
- Below 24rem (320px phones) the extra spacing is given back to content; type and targets stay. Targets
  stay because they are sized from `--spacing-target`, never from the spacing scale (`size-10` shrinks).

What screens add for K–2 (content teams): picture first (a drawn picture on every LOOK scene and every
course tile, before any text), read-aloud on every line (one shared "Read the choices" control, not a
speaker inside each answer tile), choices or tap inputs (no typing required), no clock, timer or minutes,
no standard codes, the tutor speaks first.

## Components

Import everything from `@/components/ui`. Strings go through `t()`; components that need words default to
existing keys (`common.close`, `common.cancel`, `common.confirmDelete`, `ds.ofTotal`).

| Component | Use | Rules |
|---|---|---|
| `Button`, `btn()` | every action; `btn()` styles Links | One ink `primary` per screen. `secondary` = outlined pill beside what it acts on. `ghost` = quiet tertiary. `danger` only for a confirmed delete. `sm` is 36px with a 44px touch target. `loading` keeps the label. |
| `IconButton` | icon-only actions | `label` required (accessible name + tooltip). `aria-pressed` turns it rose. |
| `ConfirmButton` | destructive actions | Asks in place ("Yes, delete" / "Cancel"); focus moves to the confirm; Escape or leaving reverts. No modal for a delete. |
| `Field` + `k-input` | every form control | Label above, hint below, error replaces hint with an icon; wired by `aria-describedby`/`aria-invalid`. |
| `k-chip` | suggestions, toggles | `aria-pressed="true"` = ink fill. |
| `Notice` | a sentence to notice | Tone icon + words carry meaning; `bad` is `role="alert"`. No coloured side borders. |
| `EmptyState` | nothing yet | Say what will appear and offer the one action that fills it. |
| `Badge` | Demo, Draft, From a grown-up | A short status word, sentence case, only where it disambiguates. Never a score, never "AI-powered", never a kicker above a heading. |
| `SubjectDot` | subject identity | A dot; never a fill. |
| `Row` / `RowList` | lists | **Rows over cards**: dot · title · meta (`k-meta`) · one action. `href` makes the row open its item; the action stays separate. `done` greys and strikes the title. One link per item: a row never offers two routes to the same place. |
| `Stat` / `StatGroup` | honest counts | Figure (brand face, tabular) over a plain label, labels clamped to two lines, in a hairline ledger; at most four. Same order on every screen. Counts only — no percentages, grades, trends or invented scores. Not a hero metric. |
| `ProgressBar` | how much of a task is done | Says "3 of 10" to people and screen readers; never a percentage. Fills arrive once. |
| `Meter` | a measurement in a range | Minutes of today's budget; past `high` turns warn (a fact, not a scold). |
| `Tabs` | views of one thing | Roving tabindex, arrows/Home/End; a rose rule slides under the selection. |
| `Segmented` | one of 2–5 modes | Radio group; a raised white thumb slides on a well. |
| `Disclosure` | show more in place | Native `<details>`; height animates where supported. |
| `Dialog` | short task needing protected focus | Native `<dialog>`: platform focus trap and inert page, Escape/backdrop/close button, focus to title, focus returned. Prefer inline UI first. |
| `Sheet` | side task beside the work | Bottom sheet on phones, inset right panel ≥640px. Same mechanics as Dialog. |
| `Skeleton` | content on its way | Calm shimmer (static under reduced motion); pass `label` for screen readers. No spinners in the middle of content. |
| `announce()` | changes without focus moving | Polite by default, `assertive` for problems. Regions are mounted by the root layout. |
| `toast()` | brief confirmation | Calls `announce()`; bottom centre above the tab bar; pauses on hover/focus. Never the only place information lives. |
| `Kbd`, `VisuallyHidden` | keys; screen-reader-only text | — |
| `PageTransition` | opt-in route motion | See Motion. |
| `BandSync`, `useBand`, `bandFor` | the band contract | See K–2 band. |

States every control ships with: default, hover (pointer devices only), pressed, focus-visible, disabled,
loading where it does work, error where it takes input.

## Icons

One authored set (`components/icons.tsx`): 24 grid, live area 3–21, 1.8 stroke, round caps and joins,
corner radius 1.5–2, dots as zero-length strokes, `currentColor`. Decorative by default — label the control.
Families: places (Home, Calendar, Settings cog, Map…), subjects (Math, Science, English), learning (Practice,
Lesson, Tutor, Homework, Test, Hint, Note), honest marks (Check, NotYet, and the skill marks New ·
Practicing · CheckReady · PassedOne · Proved · Refresh — no stars), actions (Backspace for a keypad's
delete key — an X next to a sum reads as "times"), media (Photo, Camera, Mic,
Speaker/ReadAloud, Play, Pause, Stop, Keyboard) and status (Info, Alert). Never an emoji or a Unicode glyph
as an icon. A missing icon is drawn to these rules, not borrowed.

## Brand

The Kaizen tree: one patient stroke growing upward, sakura marking its reach, one petal drifting — small
steps, every day. `KaizenMark` has two cuts: full (tapered trunk, five blossoms, the petal) and compact for
≤20px and the favicon (heavier strokes, three blossoms, tighter crop) so a 16px tab still shows a tree.
`grow` draws it once (trunk, branches, blossoms) for loading and empty moments. The wordmark is
"Kaizen" in ink + "EDU" in rose, Schibsted 600, scaled with the mark, never translated (`translate="no"`).

## Composition

- App: 240px rail on panel2 (logo · New course (secondary) · tabs · footer with who's learning and
  settings). Active tab = white tile, soft shadow, 2px rose rule on its left edge. Content on paper in a
  reading column (max 896px). Phone: same tabs in a fixed bottom bar with a rose rule on top of the active
  tab. A child's chrome carries no settings or ops lines: only a problem worth acting on (not saving,
  offline). The grown-up view adds where work is saved, which tutor is answering and the number-key switch.
- Identity is a ring: a learner's mark is their initial in ink on panel2 with a 2px ring in their own hue
  (a hue set apart from rose and the subject colours). Never a rose or subject fill.
- The switcher is a modal bottom sheet on phones (the page behind is inert) and a light panel by the rail
  on wide screens that closes when focus moves past it.
- One job per page, one ink primary per screen — the shell's own actions are secondary so the page owns
  it. Secondary = outlined pill next to what it acts on. Destructive actions confirm in place
  (`ConfirmButton`). On a check-then-continue step, Next is ghost until the check has run.
- Forms sit on solid hairline panels; dashed borders mean "empty" and nothing else.
- Rows over cards for lists. Same-size icon-heading-text cards as page structure are banned; nested cards
  are always wrong.
- The lesson stage is the one place that goes full width.
- Works at 320, 390, 768 and 1440 with no horizontal scroll; 16px side gutter on phones.

## Teaching visuals

Drawn in SVG from the palette: bars, number lines, particles, the Moon, graphs. They explain the concept;
no decorative illustration, no generic dots, no text rendered as an image. Every visual has a text
description; every manipulative works by tap and keyboard (never drag-only) and has a reduced-motion path
that keeps the same information. Places where a piece goes use the `well` depth; the subject tint marks
the visual, never floods it. A course thumbnail is that course's own first teaching visual at thumbnail
scale (seed-to-sprout strip, ice / water / steam, a number line with two or three large labels); grey
skeleton lines mean "loading" and are never art, and a label too small to read at thumbnail size is
dropped, not shrunk.
