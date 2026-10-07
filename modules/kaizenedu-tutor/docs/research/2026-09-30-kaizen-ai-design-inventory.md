<!-- Read-only inventory taken 2026-09-30 by a research agent from the two checkouts
(Kaizen-AI at pull request #30, KaizenEdu at cd3dfa8 plus the free-natural-tutor branch).
Line numbers were checked per file at that time and will drift. It is the input to
the design port in docs/HANDOFF-2026-09-30.md section 6.2; nothing here is a decision. -->

# Port-plan inventory: Kaizen-AI design → KaizenEdu (read-only)

Line numbers were checked per file. Where a file was printed together with others, I recomputed the offsets and spot-checked them with grep. Paths are absolute. KA = /home/user/Kaizen-AI/web, KE = /home/user/KaizenEdu.

---

## A. Kaizen-AI design system (exact)

**Stack:** Tailwind `^3.4.14`, `postcss.config.js` (tailwindcss + autoprefixer), JS, `next ^16.2.11`, `motion ^13.1.0` (KA/package.json).

### A1. Color tokens
They are channel triplets in KA/app/globals.css:10-27 and are wrapped as `rgb(var(--c-X) / <alpha-value>)` in KA/tailwind.config.js:9, 18-39.

| token | rgb triplet | hex (spec :59-64) | role |
|---|---|---|---|
| paper | 250 250 249 | #FAFAF9 | page base |
| panel | 255 255 255 | #FFFFFF | raised cards |
| panel2 | 241 241 239 | #F1F1EF | inset surfaces, table heads |
| border | 228 227 223 | #E4E3DF | hairlines |
| ink | 26 25 23 | #1A1917 | primary text; the action color |
| muted | 107 104 98 | #6B6862 | secondary text (AA) |
| accent | 169 59 93 | #A93B5D | rose: marks, links, selection. Not the action color |
| good | 79 122 91 | #4F7A5B | status |
| warn | 138 100 18 | #8A6412 | status |
| bad | 179 69 63 | #B3453F | status |
| coal | 20 19 16 | #141310 | `/ai` only (dark surface) |
| coal2 | 31 29 25 | #1F1D19 | `/ai` only |
| nightline | 51 48 42 | #33302A | `/ai` only |
| ember | 232 133 159 | #E8859F | `/ai` only |
| nightmuted | 152 147 138 | #98938A | `/ai` only |

- Contrast as verified: ink 16.8:1, muted 5.3:1, accent 5.8:1, ember-on-coal 7.3:1, nightmuted-on-coal 6.1:1 (globals.css:8-9).
- Global rules in globals.css:
  - selection is `accent/0.20` (:52)
  - focus is `outline 2px solid accent, offset 2px` (:54)
  - scrollbar is 6px with a border-colored thumb (:48-50)
  - reduced motion sets all durations to 0.01ms (:118-123)

### A2. Type scale
Defined in tailwind.config.js:52-63. Tracking and leading travel with the size.

| class | size | line-height | tracking |
|---|---|---|---|
| d1 | 3.75rem (60) | 1.02 | -0.032em |
| d2 | 2.75rem (44) | 1.05 | -0.03em |
| d3 | 2.125rem (34) | 1.08 | -0.025em |
| t1 | 1.625rem (26) | 1.15 | -0.02em |
| t2 | 1.25rem (20) | 1.25 | -0.015em |
| t3 | 1.0625rem (17) | 1.4 | -0.01em |
| body | 1rem (16) | 1.6 | none |
| sm | 0.875rem (14) | 1.55 | none |
| xs | 0.8125rem (13) | 1.5 | none |
| micro | 0.6875rem (11) | 1.4 | 0.12em (labels) |

**Other theme values**
- **Radii** (:65-69): `sm` 10px for inputs, `md` 14px for cards, `lg` 20px for large panels. Buttons are `rounded-full`, and nothing else is rounded (spec :43-44).
- **Shadows** (:70-75):
  - `soft`: `0 1px 2px rgba(20,19,16,.04), 0 4px 16px -8px rgba(20,19,16,.08)`
  - `lift`: `0 2px 4px rgba(20,19,16,.04), 0 12px 32px -12px rgba(20,19,16,.14)`
  - `glow`: `0 4px 24px -6px rgba(169,59,93,.30)`
- **maxWidth** (:76-82): `prose` 46rem, `narrow` 34rem, `wide` 72rem.
- **Animations** (:83-101):
  - `fadeUp`: 0.45s cubic-bezier(.2,.7,.3,1), translateY 6px → 0
  - `breathe`: 2.4s infinite, scale 1.04, opacity .85
  - `marquee`: 36s linear

### A3. Fonts
Loaded with `next/font/google` in KA/app/layout.js:2, 11-28. The variables go on `<html>` (:45).

| font | variable | weights |
|---|---|---|
| Schibsted Grotesk | `--font-brand` | 400/500/600/700/800 |
| Instrument Sans | `--font-body` | 400/500/600/700, normal + italic |
| IBM Plex Mono | `--font-opmono` | 400/500/600 |

- Tailwind families (config :40-49): `font-brand`, `font-body`, `font-opmono`, plus legacy aliases `sans`→body, `display`→brand, `mono`→opmono.
- Body text is `var(--font-body)` at 16px / 1.6 (globals.css:35-42).
- Mono is used only for times, prices, counts and percentages (spec :26-27; Marquee.js:5-7).
- Headings use `font-brand font-semibold`.

### A4. Spacing conventions
- **Section** (KA/components/ui/Section.js:9-24):
  - space `tight`: `py-12 sm:py-16`
  - space `default`: `py-16 sm:py-24`
  - space `loose`: `py-24 sm:py-32`
  - space `flush`: none
  - `lead`: `pt-14 sm:pt-20 pb-16 sm:pb-24`
  - the rail is `max-w-{width} w-full mx-auto px-5` (:43)
- **Headers:** `h-16 max-w-wide px-5` (AppHeader.js:21; Shell.js:112).
- **Card padding:** none / `p-4` / `p-6` / `p-8` (Card.js:18).
- **Dashboard column:** `max-w-lg lg:max-w-4xl px-4 lg:px-8 pt-4 lg:pt-8` (dashboard/page.js:687).
- **Views:** `space-y-6 pb-28 lg:pb-10` (TodayView.js:244).
- **Eyebrows:** at most one per three sections (spec :53).
- **Em-dashes:** none in marketing or chrome (spec :54).

### A5. Class recipes (quoted, KA/app/globals.css)
- `.k-card { @apply bg-panel rounded-md border border-border shadow-soft; }` (:65)
- `.k-card-sm { @apply bg-panel2 rounded-sm border border-border; }` (:68)
- `.k-btn-primary` (:72-76): `inline-flex items-center justify-center gap-2 rounded-full bg-ink text-paper font-semibold transition-[background-color,transform] duration-150 hover:bg-ink/90 active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none`
- `.k-btn-secondary` (:77-81): `inline-flex items-center justify-center gap-2 rounded-full bg-panel border border-border text-ink font-semibold transition-[border-color,transform] duration-150 hover:border-ink/30 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none`
- `.k-btn-accent` (:84-88): `inline-flex items-center justify-center gap-2 rounded-full bg-accent text-paper font-semibold transition-[background-color,transform] duration-150 hover:bg-accent/90 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none`
- `.k-chip` (:89-93): `inline-flex items-center gap-1.5 rounded-full bg-panel2 border border-border text-xs font-medium text-muted px-3 py-1.5 transition-colors hover:text-ink hover:border-ink/25`
- `.k-input` (:94-98): `w-full bg-panel rounded-sm border border-border px-4 py-3 text-body text-ink placeholder:text-muted/70 transition-colors focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20`
- `.k-label { @apply font-opmono text-micro font-medium uppercase text-muted; }` (:101). `.dn-kicker` is the same without the color (:102).
- `.k-badge` (:108-111): `inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full`
- `.k-badge-accent { @apply bg-accent/10 text-ink; color: color-mix(in srgb, rgb(var(--c-accent)) 60%, rgb(var(--c-ink))); }` (:112). `-good`, `-warn` (60%) and `-muted` (`bg-panel2`, muted 70%) follow the same pattern (:113-115). There is no `-bad`.
- `.k-md` chat prose (:129-152) and `.k-inline-code` (:149).

### A6. Primitives (KA/components/ui, KA/components/dn)

| Primitive | Props, variants, contract |
|---|---|
| **Button** (Button.js:39-74) | `href, variant=primary\|secondary\|accent\|ghost, size=sm\|md\|lg, tone=day\|night, block, className`. Base `inline-flex … rounded-full font-semibold transition-[background-color,border-color,transform] duration-150 active:scale-[0.98]`. Disabled goes to `bg-panel2 text-muted border-border`, not faded (:55-59). Sizes: sm `text-sm px-4 py-2`, md `text-sm px-6 py-3`, lg `text-t3 px-7 py-3.5` (:33-37). Variants day/night (:14-31): primary `bg-ink text-paper` / `bg-ember text-coal`; secondary `bg-panel border` / `border-nightline`; accent `bg-accent text-paper`; ghost `hover:bg-panel2` / `hover:bg-coal2`. `href` renders a Link, or a plain `<a>` for `http:\|mailto:\|tel:\|#` (:68-72). |
| **Card** (Card.js:20-36) | `variant=raised\|inset\|plain, tone, pad=none\|sm\|md\|lg, as`. raised is `bg-panel border shadow-soft` (night `bg-coal2 border-nightline`); inset is `bg-panel2 border`; plain has no chrome and no radius. |
| **Section** (Section.js:26-46) | `width=wide\|prose\|narrow, space=tight\|default\|loose\|flush, lead, as`. |
| **Eyebrow** (Eyebrow.js:6-13) | `tone`. `font-opmono text-micro font-medium uppercase`, `text-accent` (night `text-ember`). |
| **Stat** (Stat.js:4-12) | `value, label, tone`. Value is `font-opmono text-t1 tabular-nums`, with the label `text-xs mt-1 text-muted` underneath. |
| **Notice** (Notice.js:8-26) | `kind=ok\|bad\|warn\|info`. Classes: `bg-good/10 border-good/30`, `bg-bad/10 border-bad/30`, `bg-warn/10 border-warn/30`, `bg-panel2 border-border`, all with `text-ink`. Shape `rounded-sm border px-4 py-3 text-sm`. Role is `alert` only for `bad`, otherwise `status`. Renders nothing without children. |
| **Field** (Field.js:14-44) | `label, hint, error, as='input', controlClassName`. Order: label (`text-sm font-medium`) → hint (`text-xs text-muted`) → `.k-input` → error (`text-xs text-bad`). An error adds `border-bad focus:ring-bad/20`. Uses `useId`. |
| **EmptyState** (EmptyState.js:15-26) | `title, children, action, tone`. `px-5 py-10 text-center`; title `text-sm font-medium`; body `text-sm text-muted max-w-prose`. The action is required by intent. |
| **HeldState** (HeldState.js:15-28) | `kind=accounts\|family\|billing\|demo`. Club copy wrapped in `Notice kind=info`. |
| **AppHeader** (AppHeader.js:17-46) | `links[], back='/dashboard'` (`width` is ignored). Sticky `bg-paper/90 backdrop-blur border-b`. KaizenMark 24 plus the "Kaizen" wordmark in `font-brand font-semibold text-t2`. |
| **AppFooter** (AppFooter.js:25-53) | Border-t, `max-w-wide py-10 sm:py-12`, mark with t3 wordmark, entity line "© … Kaizen Academy LLC. Kaizen serves students ages 13 and up." (:38), four legal links. |
| **MasteryLine** (MasteryLine.js:15-60) | `confirmed, total, moved=[{title}], size=md\|lg, tone`. Figure `font-opmono text-t1` (lg `text-d3`) reads "n of total". Sub-line "concepts confirmed — done unaided, on a later day" (:48, contains an em-dash). With total 0 it shows "Not yet". Only used on `/family` (app/family/page.js:635, 987). |
| **KindBadge, RoomCard, Stars, VenueLine** | Club-only; see the port skill's dropped list. |
| **dn/Shell** (Shell.js:69-238) | `active, tone=day\|night`. The two tone maps (:75-101) are listed below. Header is 64px sticky with `backdrop-blur-xl`; the active nav item carries an `h-px` rule, not a weight change (:129-133); mobile uses a CSS-only `<details>` menu (:141-168); CTA `Button size=sm` (:170). Footer is a 12-col grid with brand in cols 1-6 and link columns starting at 7 and 10 (:190-235). |
| **dn/Reveal** (Reveal.js:77-94) | `delay=0, y=24, once, className`. |
| **RevealGroup** (:102-139) | `step=0.06`. Items animate y 20, duration 0.55. EASE `[0.16,1,0.3,1]`, duration 0.6, `ENTRANCE_VIEWPORT={amount:'some'}` (:47). `useEntrance` (:63-75) swaps a div for Motion only when the element is measured below the fold after mount. Contract (spec :74-76): server HTML never carries `opacity:0`, painted pixels are never re-hidden, and nothing branches on `useReducedMotion` in render. |
| **dn/GlowLine** (:33-50) | 2px accent gradient rail; same entrance rule. |
| **dn/Marquee** (:10-48) | `items, tone`; at most one per page. |
| **dn/Exchange** (:20-50) | Transcript "set as a record, not chat bubbles": `grid sm:grid-cols-[5.5rem_1fr]`, `divide-y`, speaker in `text-xs` accent/muted, turn text `text-t3`. |
| **dn/Thread** (:37-118) | Club schedule rail; not portable. |

**dn/Shell tone maps (Shell.js:75-101)**
- day: page `bg-paper text-ink`; bar `border-border bg-paper/85`; rest `text-muted`; rule `bg-accent`.
- night: page `bg-coal text-paper`; bar `border-nightline bg-coal/85`; rest `text-nightmuted`; rule `bg-ember`; mark colors paper/ember.

**Brand** (KA/components/Brand.js):
- `KaizenMark({size=32, ink, rose, sakura})`: a tree SVG (:6-36).
- `KaizenLogo({size, caption, captionClass, nameClass, href})` (:39-50).
- `SakuraBranch({width})` (:54-76).

**Icons** (KA/components/Icons.js):
- Base `I` (:4-15): 24px viewBox, default size 20, stroke 1.8, round caps and joins, `currentColor`, `aria-hidden`.
- Exports: IconSun :17, IconCalendar :24, IconBook :31, IconSprout :38, IconPlus :46, IconArrowUp :50, IconMic :54, IconCheck :61, IconSpark :65, IconFlame :71, IconChevronRight :78, IconLeaf :82, IconX :88, IconClock :92, IconRefresh :99, IconGrades :106, IconArrowRight :118, IconArrowLeft :122, IconChevronLeft :126, IconUndo :133, IconStar :147, IconStarHalf :151, IconStarEmpty :158.

---

## B. Kaizen-AI dashboard (KA/app/dashboard/page.js)

### B1. Layout skeleton
- **Tabs** (:38-44): `today` "Today" (Sun), `calendar` "Plan" (Calendar), `study` "Learn" (Book), `grades` "Grades" (Grades), `progress` "Growth" (Sprout). The tab lives in `?tab=` through `useTabHistory` (:80).
- **Desktop sidebar** (:606-670):
  - `lg:flex fixed inset-y-0 left-0 w-60 bg-panel2 border-r`.
  - `KaizenLogo` with caption "small steps, every day" (:608).
  - Nav buttons (:610-624): active is `bg-panel shadow-soft` with a 0.5-wide rose rule on the left and an accent icon.
  - "Confirmed n of total" record card (:631-640).
  - Sync dot and name (:645-652).
  - Billing / Settings / Family links using `navigateWithFlush` (:660-664), then Sign out (:665).
- **Main area** (:672-692): `lg:pl-60`, a sync-error banner (:673-686), then the column (:687), then `AppFooter mt-12 pb-20` (:691).
- **Mobile bottom bar** (:696-712): `lg:hidden fixed bottom-0 bg-panel/90 backdrop-blur-xl`, 5 columns, a top rose rule on the active tab, `text-micro` labels.
- **Overlays:**
  - toast is an ink pill at bottom-20 (:737-744)
  - undo pill uses an ember ring (:746-767)
  - LimitModal (:830-857)
  - VerifyEmailGate (:776-828)
  - IntakeBox modal (:717-724)
  - PracticeModal (:726-735)
- **Loading:** `KaizenMark animate-breathe` (:524-533).
- **Gate order:** loading → LoginPage (:535) → email verify (:538-540) → SetupFlow (:542-544) → StudySession takes over the full screen (:546-565).

### B2. TodayView (KA/components/TodayView.js), in render order
1. Greeting in `text-t1` plus the long date (:248-254). There is a streak chip "studied Nd" shown when the count is above 2 (:261-269), an "Add anything" primary sm button that opens intake (:270-279), and a + round button that opens TaskModal (:280-287).
2. WeekStrip (:52-99): 7 day tiles; today is `bg-ink text-paper`; up to 3 course-colored dots per day.
3. "Your next step" Card with `shadow-lift`, a panel2 gradient and a SakuraBranch, an Eyebrow, the title in t2, and a course/due/minutes meta line in mono. Buttons: "Start with the tutor" primary and "Done" secondary (:295-327).
4. "Also due today" `k-label` plus AssignmentRow (inset Card: check circle, title, meta, "Tutor" secondary sm, … menu leading to Delete) (:102-171, :330-343).
5. "This week" rows (:346-359).
6. "All clear" card when the list is empty (:362-370). Per the EmptyState.js:8-11 comment, its copy is false.
7. The record: an inset Card holding Rings (homework done/due, sessions/3, average masteryPercent) with a legend in mono (:373-399).
8. "Feeling curious?" card: an input, a "Dive in" button, and "Surprise me with something wild" (:402-432).
9. Celebration pop overlay (:174-192) and random CHEERS (:22-28).

`ChecksDueCard` is rendered above TodayView by page.js:578.

### B3. ProgressView, the "Growth" tab (KA/components/ProgressView.js)
1. Header "Growth" (:148-151).
2. 2×2 Stat tiles (inset Cards, icon chip plus Stat): Day streak, Practice score %, Sessions, Assignments done (:155-167).
3. "Practice trend" Card: an SVG sparkline of `masteryHistory`, 0-100, with a dashed 75% rule, an accent area gradient and an end dot (:35-79, :170-186). The copy disclaims that this is not mastery (:182-185; rule :13-26).
4. "Consistency · last 8 weeks": 7×8 binary grid, filled cells `bg-good` (:87-131, :189-194).
5. "Worth another pass": the weakest 3 concepts with a status dot and % (:197-216).
6. "Weekly report" generate button, calling `/api/reports/weekly` (:307-324).
7. "Stuck after real effort?", calling `/api/handoff` (:342-380).

### B4. StudyView, the "Learn" tab (KA/components/StudyView.js)
1. Header "Learn" plus a due-count sentence (:143-150).
2. Library: upload button and file rows showing kind tile, size, "readable by tutor", a course select and remove (:49-126).
3. Per course: a color dot, name and teacher, then concept rows with MiniRing, "Not started / Due for review / Next review in Nd · n reps", a `k-badge` "Start"/"Review", and a `k-chip` "Practice" (:155-200).
4. "Your own topics" (orphans from curiosity dives) (:202-222).

### B5. Other tabs (both on the port skill's dropped list)
- **CalendarView** (KA/components/CalendarView.js): month grid Card (:88-154), day list with drag-to-reschedule (:186), "Tutor" button (:213).
- **GradesView** (KA/components/GradesView.js): GpaCard with sparkline (:32-78), CategoryBars (:81), GradebookRow score entry (:104), WhatIf simulator (:167), CourseCard (:219), view (:265-302).

### B6. Mastery visualisations
- **MasteryDial** (KA/components/MasteryDial.js:30-64)
  - Inputs: `working` 0-1, `confirmed` 0-1, `size=40`, `showLabel`.
  - Draws one ring: the track in border color; a working arc in `text-accent/35` (pale, what you can do with help); a confirmed arc on top in solid `text-good`; and the center label as confirmed % in `font-opmono text-micro`.
  - `masteryLabel()` (:68-79) gives honest status text.
  - Nothing imports it (:19-25).
- **Rings** (KA/components/Rings.js:20-57)
  - Inputs: `rings=[{pct 0-1,color,track}]`, `size=148`, `stroke=12`, `GAP=4` (:18), and children rendered in the center.
  - Concentric arcs from outside in. Colors only come from `RING_TONES` accent/good/ink/warn, each with a 0.12 (ink 0.09) track (:10-15).
  - Used only by TodayView (:217-221).
- **MiniRing** (StudyView.js:16-38): single ring colored by `statusOf(pct)` (good ≥75, warn ≥40, else bad) with the % number in the center.
- **MasteryLine**: see A6 ("n of total confirmed" plus named moved skills).

### B7. StudySession, the AI chat (KA/components/StudySession.js), a full screen `flex flex-col h-screen bg-paper` (:243)
- **Header** (:246-293): `bg-panel/80 backdrop-blur-xl sticky`. Contents: Back link (:248-254); centered concept name plus one of assignment / curiosity line / "n% mastery" / "First session" (:255-271); a voice toggle `w-9 h-9 rounded-full` that turns `bg-bad` when on (:273-281); and a "Grade" `k-btn-primary` once there are 2 or more messages (:282-290).
- **Voice status strip** (:296-313): `bg-accent/10`, a ping dot (listening good / speaking accent), and text "Kaizen is speaking… / Transcribing… / Thinking… / Listening. Just talk."
- **Voice error strip** (:316-323) and a "Using your files" chip (:326-334).
- **Message list** (:337-418), `max-w-3xl`:
  - Empty state (:339-376): KaizenMark 44, an intro and starter `k-chip`s.
  - "Start a fresh chat" (:378-388).
  - Bubbles (:390-408): user `bg-accent text-paper rounded-md rounded-br-sm` on the right; assistant `bg-panel border rounded-md rounded-bl-sm` on the left with a KaizenMark 20 avatar; rich MessageBody (KaTeX/markdown) loaded lazily (:19-22).
  - "transcribing" bubble (:410-416).
- **Grade result** (:421-449): `k-card-sm shadow-lift`, a `k-label` "Recall quality", "q/5 · label" in mono, the rationale, and "Keep going" / "Done for now". Grading calls `/api/grade` → SM-2 via `onGraded` (:193-219). QUALITY_LABEL is at :25.
- **Curious mode:** an "Add to my study topics" adopt button (:452-470).
- **Quick-action chips** (:473-483): QUICK_ACTIONS "Explain it simpler / Show an example / Quiz me / Why does this matter?" (:28-33), plus curious variants (:34-38).
- **Teach/Socratic segmented toggle** (:486-508).
- **Composer** (:511-551): `border-t bg-panel/80 backdrop-blur-xl`. A + file button (`w-10 h-10 rounded-full bg-panel2`), an auto-growing textarea (`bg-panel2 rounded-sm … focus:ring-accent/20`, 40-120px), a send `w-10 h-10 rounded-full bg-ink` with IconArrowUp, and the disclaimer "Kaizen is an AI tutor… safety & reporting".
- **Voice** comes from `useVoiceChat`, which uses OpenAI `/api/voice` and `/api/voice/transcribe` (lib/useVoiceChat.js:50, 136).

### B8. Engine Room, DevDash (KA/components/DevDash.js)
- Shown only in development (`DEV` page.js:48). A floating ink round IconSpark button opens it, with a reset button beside it (page.js:859-874).
- Modal (:51-55) with "Engine Room" in `k-label text-accent` (:59).
- Pipeline grid of the 8 `ENGINE_STAGES`: input, intake, context, strategy, llm, grade, sm2, store (lib/devlog.js:56-65). Each tile pulses accent when it fires (:81-111).
- "Model routing" mono table (:114-124) and a live event log in mono (:127-144).
- Events come from `logEvent` into localStorage `kaizen.devlog.v1` (devlog.js:5, 27-38).

### B9. What needs an account versus what is purely local
- **Accounts are required to enter at all.** No Supabase config means LoginPage with no local fallback (page.js:115-119, 535); unverified email is blocked (:538-540). Cloud sync runs through debounced pushes (:102-104, 222-225; lib/cloud.js).
- **Server/account dependent:**
  - `authedFetch`/`limitedFetch` bearer calls (lib/limits.js:6-11)
  - ChecksDueCard `/api/engine/check` (ChecksDueCard.js:36), then CheckFlow and PracticeSession
  - sidebar "Confirmed" from `/api/engine/state` (page.js:305-314)
  - PracticeModal `/api/practice` (:25, 59)
  - chat `/api/chat` and `/api/grade` (StudySession.js:125, 202)
  - voice
  - IntakeBox `/api/intake` (:133)
  - weekly report and handoff (ProgressView.js:259, 282)
  - DropInSessions (club), billing, family, drop-in reconcile (page.js:488-506)
- **Pure localStorage** (these render with no network):
  - `kaizen.app.v1`: setupDone, profile, school, courses, assignments, streak, activity[], masteryHistory[], gradeHistory[] (lib/appState.js:5-19)
  - `kaizen.concepts.v1` SM-2 concepts (lib/store.js:8; lib/mastery.js:6-71)
  - `kaizen.chats.v1` (lib/chatMemory.js:5)
  - `kaizen.files.v1` (lib/files.js:6)
  - `kaizen.devlog.v1`
  - TodayView, CalendarView, GradesView, StudyView (except Practice) and ProgressView top half (tiles, trend, consistency, weakest) read only these.

---

## C. KaizenEdu current UI

### C1. Stack
- Tailwind **v4**: `tailwindcss ^4` and `@tailwindcss/postcss ^4` (KE/package.json:216, 196); `postcss.config.mjs` uses `@tailwindcss/postcss` (:3). There is no root tailwind.config.
- KE/app/globals.css (upstream-owned):
  - `@import 'tailwindcss'` (:1), plus tw-animate-css and shadcn/tailwind.css (:2-3)
  - `@custom-variant dark` (:18)
  - `@theme inline` maps shadcn vars to `--color-*` (:20-61), including `--font-mono: var(--font-geist-mono)` (:24) and `--radius-sm..4xl` derived from `--radius` (:54-60)
  - `:root` has upstream purple `--primary:#722ed1` (:75) and `--radius:.625rem` (:92); `.dark` is at :103-135
  - base `* { @apply border-border outline-ring/50 }` (:137-164)
- Fonts: `GeistSans`/`GeistMono` from `geist/font` (next/font local) on `<body>` (KE/app/layout.tsx:2-3, 52); Inter from `@fontsource-variable/inter` (:31).
- Other deps: `motion ^12.27.5` (package.json:132), `lucide-react ^0.562.0` (:128), `next 16.2.11`, `react 19.2.3`, TS strict.

### C2. Token file: KE/components/tutor/brand/tokens.css
Imported by `app/(learner)/layout.tsx:4` and `app/(parent)/layout.tsx:4`. It re-skins the shadcn vars under `body:has(.nt-app)`, which is also how portals get the colors.

**Light values** (:13-44):

| variable | value |
|---|---|
| `--font-sans` | Geist (:14) |
| `--background` | oklch(.985 .004 85) |
| `--foreground` | oklch(.22 .015 60) |
| `--card` / `--popover` | oklch(1 0 0) |
| `--primary` | oklch(.46 .085 195), teal |
| `--primary-foreground` | oklch(.985 .004 85) |
| `--secondary` | oklch(.955 .006 85) |
| `--muted` | oklch(.955 .006 85) |
| `--muted-foreground` | oklch(.48 .02 60) |
| `--accent` | oklch(.94 .028 195) |
| `--accent-foreground` | oklch(.32 .06 195) |
| `--destructive` | oklch(.55 .19 27) |
| `--border` | oklch(.89 .008 80) |
| `--input` | oklch(.86 .01 80) |
| `--ring` | oklch(.58 .09 195) |

**Every `--nt-*` variable**

| variable | light | dark (:66-73) | uses in code |
|---|---|---|---|
| `--nt-success` (:36) | oklch(.52 .12 150) | oklch(.75 .13 150) | 9 |
| `--nt-success-soft` (:37) | oklch(.95 .04 150) | oklch(.3 .05 150) | 4 |
| `--nt-warning` (:38) | oklch(.62 .13 70) | oklch(.8 .13 75) | 7 |
| `--nt-warning-soft` (:39) | oklch(.965 .05 85) | oklch(.32 .06 80) | 6 |
| `--nt-danger-soft` (:40) | oklch(.96 .03 27) | oklch(.32 .07 27) | 6 |
| `--nt-brand-soft` (:41) | oklch(.94 .028 195) | oklch(.3 .04 195) | 10 |
| `--nt-board` (:42) | oklch(.995 .003 85) | oklch(.25 .012 60) | 4 |
| `--nt-shadow` (:43) | `0 1px 2px oklch(.3 .02 60/6%), 0 8px 24px -12px oklch(.3 .02 60/18%)` | shadow on black | 8 |

**Surface sizing** on `.nt-app` (:82-95) and `data-surface` (kids :97-104, parent :106-113):

| variable | default (teen) | kids | parent | uses |
|---|---|---|---|---|
| `--nt-text-body` | 1rem | 1.125 | .9375 | 37 |
| `--nt-text-lead` | 1.125 | 1.3125 | 1.0625 | 6 |
| `--nt-text-small` | .875 | .9375 | .8125 | 6 |
| `--nt-target` | 2.75rem | 3.5rem | 2.5rem | 14 |
| `--nt-gap` | 1.25 | 1.5 | 1 | 3 |
| `--radius` | .75rem | 1rem | .625rem | n/a |

The dark block is `.dark body:has(.nt-app)` (:46-74).

**Class roles in tokens.css**
- `.nt-display` clamp(2rem→3.25rem)/1.05/600 (:116)
- `.nt-h1` clamp(1.625→2.125rem) (:123)
- `.nt-h2` 1.375rem (:130)
- `.nt-h3` 1.0625rem (:137)
- `.nt-lead` (:142), `.nt-body` (:149), `.nt-small` (:155), `.nt-label` 13px/500 muted (:160)
- `.nt-mono` (:166), `.nt-num` (:170), `.nt-target` (:175)
- `.nt-panel` card/border/radius/nt-shadow (:180)
- `.nt-prose` (:189-243)
- `.nt-bar` estimate bar, confirmed = success (:246-264)
- `.nt-fade-in` (:267), `.nt-skeleton` (:280), reduced motion (:294-305), focus ring (:308-311)

### C3. CSS approach
Mixed. There are plain `nt-*` classes in 72 of 104 tsx files under components/tutor and app/(learner|parent). Most-used: `nt-small` 108, `nt-body` 41, `nt-panel` 40, `nt-h3` 30, `nt-h1` 26, `nt-lead` 22, `nt-h2` 16. On top of that come Tailwind v4 utilities that reach the vars directly: `rounded-(--radius)` ×19, `text-[length:var(--nt-text-body)]` ×30, `bg-(--nt-brand-soft)`. Session and landing styling is plain CSS: session.css 615 lines, front-door.css 49, storyboard.css 530.

### C4. Components (KE/components/tutor, with line counts)
- **analytics:** provider.tsx 41
- **avatar:** avatar-face.tsx 72, config 123, create-driver 116, driver 50, presence-rig 1105, preview 498, rig-motion 371, rive-rig 247, svg-rig 824
- **board:** board-pane.tsx 63, reducer 447, scene 34
- **brand:** logo.tsx 52, tokens.css 311
- **errors:** error-boundary 137
- **learn:** blocked-states 118, coursework 601, entitlement-banner 48, guest-level 104, guest-start 141, planner 387, progress 227, recent-sessions 88, start-session 397, talk-start 126, topic-fields 90, use-remembered 51, workspace 99
- **marketing:** landing 321, front-door.css 49, storyboard.tsx 256 + .css 530, sign-in 196, sign-up 287, forgot/reset 116/114, parent-invite 261, support-form 131, legal/{ai-disclosure 124, credits 187, legal-page 58, privacy 329, terms 149}
- **parent:** add-learner 184, billing 169, consent 325, data 206, learner-picker 99, overview 173, report-view 281, safety 95, settings 159, transcripts 174
- **preview:** banner 26
- **session:** api 67, check-card 155, dock 254, entitlement-banner 68, metrics-overlay 87, report-problem 146, session-screen 273, session.css 615, transcript 79, tutor-tile 122, use-tutor-session 699, wrap-screen 170
- **shell:** analytics-slot 11, app-shell 63, footer 38, forget-button 90, header 132, learner-switcher 79, nav.ts 68, offline-banner 33, public-shell 96, shell-state 128, sign-out-button 39, states 171, theme-toggle 25
- **ui:**
  - async 32, choice-cards 87, math-text 76, use-load 46
  - `button.tsx` 61: `NtButton` with `tone=primary|secondary|ghost|danger|link` mapped to shadcn variants (:10-16); sizes sm `h-9`, md/lg use `nt-target` (:23-27); `rounded-(--radius)` (:49); `busy`; 92 call sites
  - `fields.tsx` 209: `CONTROL` recipe at :54-55, TextField :64, TextAreaField :86, SelectField :116, CheckboxField :154, Fieldset :191
  - `form-error.tsx` 33: focus-on-appear, danger-soft
  - `section.tsx` 129: Section region with h2 `nt-h2` (:20); Pill tones neutral/brand/success/warning/stop (:60-87); EstimateBar (:94); DataList (:112)

### C5. Routes under app/(learner)
- **Pages:** `/welcome` (landing; middleware rewrites `/` to it, KE/middleware.ts:114-115), `/learn` (layout + page + loading), `/session/[id]` (page, error, loading), `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`, `/parent-invite`, `/support`, `/unsubscribed`, `/legal/{terms,privacy,ai,credits}`, `/eval/avatar`, plus group error.tsx and not-found.tsx.
- **API under `api/tutor/`:** asr, attention, auth/{learner,me,parent-invite(+accept),password-reset(+request),sign-in,sign-out,sign-up,teen-invite,teen-sign-in}, check, coursework, cron/weekly-email, email/unsubscribe, error-report, flag, guest(+forget), health, planner, problem-extract, progress, session, support, tts, turn, wrap.
- **Group layout:** `.nt-app data-surface` (app/(learner)/layout.tsx:27). `/learn` redirects anonymous visitors to the landing (learn/layout.tsx:17) and uses `AppShell variant="learner"` (:26).
- **(parent):** /parent with billing, consent, data, learners, reports(/[learnerId]), settings, transcripts. `.nt-app data-surface="parent"` ((parent)/layout.tsx:46).

### C6. Session screen

**Route:** app/(learner)/session/[id]/page.tsx imports session.css (:4) and renders SessionScreen (:83).

**States in KE/components/tutor/session/session-screen.tsx**
- Stopped: WrapScreen (:124-133).
- Not started: "Sol is ready." in `.nt-wrap` with Start / Not now and a mic notice (:135-159).
- Live (:161-271): `.nt-session` > `.nt-session-body` containing TutorTile (:164-174), BoardPane (:176), and `.nt-rail` (:178-262). The rail holds EntitlementBanner, InlineNotices (Reconnecting, voice off, recovery, mic, nothing heard, error, :181-231), CheckCard or CheckResultCard (:233-242), Transcript (:244) and Dock (:246-261). Also MetricsOverlay for `?metrics=1` (:265) and the ReportProblem dialog (:266-270).
- Auto-start from `?go=1` (:112-117).

**Grid** (session.css:41-61)
- Phone: areas `tutor / board / rail`, with `padding-bottom` reserved for the fixed dock.
- 64rem and up: 3 columns `minmax(15rem,19rem) | 1fr | minmax(19rem,23rem)`.
- Tiles are `.nt-tile` (:63-73).

**TutorTile** (tutor-tile.tsx:71-120)
- Stage with a radial brand-soft gradient (session.css:114-130) and AvatarFace (avatar-face.tsx:30-71).
- Cue pill (:217-230).
- Caption at 18px, 20px on desktop, clamped to 3/8 lines (session.css:163-190), plus an sr-only phase.
- Bar: name, `.nt-ai-label` pill (:26-39), and time-left words, urgent in warning (tutor-tile.tsx:38-51; session.css:204-215).
- On a phone it is a sticky strip (session.css:102-112).

**BoardPane** (board/board-pane.tsx:27-61)
- Tile bar "Whiteboard" plus an item count.
- Upstream `WhiteboardCanvas` in `SceneProvider`, on the `--nt-board` sheet.
- Empty and put-away states.

**Transcript** (transcript.tsx:17-77)
- `role="log"`, pinned to the bottom unless the reader scrolls up.
- "A log, not a chat" (:9).
- Tutor text 20px, learner 17px muted, interrupted/failed states (session.css:293-327).

**Dock** (dock.tsx:48-254)
- One row: a voice control that is one of "Use the microphone" / hold-to-talk with pointer capture / hands-free listening-mute (:122-165); a text form with a send button that is hidden on fine pointers (:167-188); End as a danger icon (:190-198); and a More menu with hands-free, mute and report (:200-250).
- Fixed to the bottom on phones (session.css:342-350).
- Pill `.nt-talk` in primary (:367-434).
- Icons from lucide (:11).

**CheckCard** uses `.nt-check`, stem 20px, and option rows (session.css:528-568).

**WrapScreen** (wrap-screen.tsx:48-168)
- STOP_COPY (:18-41).
- `nt-panel` sections "What you did" (recap plus "x of y checks right", :109-117), "Practice before next time" (:119-128), and "Was this session useful?" thumbs (:132-161).
- "Back to Learn" (:163-167).
- "No score, no streak" (:45).

### C7. Landing (KE/components/tutor/marketing/landing.tsx)
- `Landing` (:24-35) is a `flex flex-col gap-24` stack.
- **Hero** (:37-55): a 2-column grid with h1 `nt-display` and `nt-lead` on the left and TalkStart on the right.
- **HowItWorks** `#how-it-works` (:57-103): h2 `nt-h1`, lead, the Storyboard CSS animation, and a 3-item numbered `ol`.
- **Subjects** `#subjects` (:105-150): rounded-full subject chips and a levels `dl`.
- **WillNotDo** (:152-182): `divide-y` rule list.
- **Privacy** `#privacy` (:184-223): bordered card list that reads `GUEST.retentionDays`.
- **FAQ** `#faq` (:225-321).
- **TalkStart** (learn/talk-start.tsx:34-125):
  - `nt-panel nt-talk-start` (:66)
  - "I am in" level radio chips `.nt-level-chip` (:69-84; front-door.css:19-43)
  - "Talk to Sol" `nt-big-button` (:88-97)
  - "Type instead" secondary (:98-108)
  - FormError, the "Free. No account…" line, and a `<details>` holding GuestStart (:116-123)
- **Wrapper:** PublicShell (public-shell.tsx:32-96): 64px header, SECTION_LINKS (:13-18), ThemeToggle (:71), "Start" linking to `#start` (:78), main `max-w-6xl` when wide (:88), Footer.

---

## D. Port mapping

### D1. Surface → replacement

| KaizenEdu surface | Replace with | Notes |
|---|---|---|
| PublicShell header (public-shell.tsx:51-83) | dn/Shell day header (Shell.js:111-175) | Keep SECTION_LINKS and `#start`: both are pinned by tests/tutor/guest-ui-shell.test.ts:42-51. |
| Footer (footer.tsx:14-38) | AppFooter (AppFooter.js:25-53) or the Shell footer grid (Shell.js:190-235) | Drop the entity line and "13 and up" (see D3.6). |
| AppShell/Header, learner (app-shell.tsx:16-40, header.tsx:27-132) | Dashboard sidebar (page.js:606-670), bottom tab bar (:696-712), main column (:672-692) | The sidebar "Confirmed" card maps to the weekly lead (confirmed/tracked). Guest keeps ForgetButton; the ThemeToggle decision is D3.1. |
| Parent header and BareShell | AppHeader (AppHeader.js:17-46) | — |
| Landing sections (landing.tsx) | Section `lead` + RevealGroup hero (KA/app/page.js:173-237) | h1 `font-brand font-semibold text-ink text-d3 sm:text-d2 lg:text-d1`, lead `text-t3 text-muted`. Other sections use `Section width=wide`, one Eyebrow per three sections, Reveal. Subjects become `.k-chip`; WillNotDo becomes an Exchange-style hairline record; Privacy becomes `k-card-sm` rows; FAQ uses `Section width=prose`. Optionally Marquee for the subjects list. Keep the ids and `retentionDays` (pinned by guest-ui-shell.test.ts:42-59). |
| TalkStart panel, level chips, big button | Card raised pad lg; `.k-chip` plus a checked state (`border-accent bg-accent/10 text-ink`); `Button size=lg block` (ink); "Type instead" as `variant=secondary` | Keep the `min-height:4rem` target. |
| Session ready state (session-screen.tsx:135-159) | StudySession empty state (StudySession.js:339-376) | Centered `max-w-narrow`, mark, `text-body text-muted`, Buttons. |
| Session chrome (none today) | StudySession header strip (StudySession.js:246-293) and voice status strip (:296-313) | Map TilePhase idle/listening/thinking/speaking to the ping dot and wording. |
| TutorTile | `Card raised pad=none`; caption `text-t2` (keeps the ≥20px rule, design-system SKILL.md:20); `.nt-ai-label` → `k-badge k-badge-accent`; time-left `font-opmono text-xs tabular-nums`, urgent `text-warn` | The stage gradient becomes panel2 (TodayView.js:297 pattern). |
| BoardPane | `Card raised pad=none`, `k-label` bar, `--nt-board` → panel | Empty state becomes EmptyState.js. |
| Transcript | Exchange record layout (Exchange.js:29-44: `sm:grid-cols-[5.5rem_1fr] divide-y`, speaker `text-xs text-accent`), tutor `text-t2`, learner `text-t3 text-muted` | Do not use StudySession bubbles (:390-408), because KE says "a log, not a chat" (transcript.tsx:9). |
| Dock | Composer (StudySession.js:511-551): `border-t bg-panel/80 backdrop-blur-xl`; round `bg-panel2` icon buttons; ink send circle; textarea recipe (:536) | Talk states: primary → `k-btn-primary`; talking → `bg-good`; live → `bg-accent/10 text-accent`; End → `bg-bad/10 text-bad`. Keep `--nt-target`, since KA's 40px (`w-10`) is below the 44/56px targets. Menu becomes `k-card shadow-lift`. Quick-action chips (:473-483) are an optional add, sent via `onSubmitText`. |
| In-session notices (:181-231) | Notice.js | Kinds: neutral→info, warning→warn, stop→bad, success→ok. Add an `action` slot and an explicit `role` override. |
| CheckCard / CheckResultCard | Option rows as ChecksDueCard rows (ChecksDueCard.js:95-110: `rounded-sm border bg-panel2 hover:border-ink/25`); result as the grade-result card (StudySession.js:421-449) | — |
| ReportProblem dialog, out-of-minutes | LimitModal overlay (page.js:832-834): `fixed inset-0 bg-ink/30 backdrop-blur-sm` with `k-card shadow-lift` | — |
| MetricsOverlay `?metrics=1` | DevDash "Engine Room" styling (DevDash.js:57-144) | — |
| WrapScreen | `Section width=narrow`, t1 title, "What you did" Card, checks as a Stat ("x of y" in mono), practice list, thumbs as secondary sm Buttons, primary "Back to Learn" | — |
| Buttons: NtButton (92 sites; tones secondary 30, ghost 17, danger 3, link 1, primary 2 plus default) | Button.js variant classes | Keep the `tone` prop name for call-site compatibility. KA's `tone` means day/night, so name that axis `surface`. Add a `danger` variant (`bg-bad/10 text-bad`), `accent` and `href`. Shape `rounded-full`; disabled per Button.js:55-59. |
| Inputs: `CONTROL` (fields.tsx:54-55) | `.k-input` + `nt-target` | Field order already matches (label, hint, control, error). ChoiceCards become selectable `k-card-sm`. FormError becomes Notice kind=bad, keeping focus-on-appear. |
| EmptyState / Loading / Skeleton (states.tsx:16-46) | EmptyState.js (centered, `action`); skeleton recolored to panel2; route loading uses the `animate-breathe` mark (page.js:524-533) | — |
| Pill (section.tsx:60-87) | `k-badge-*` | neutral→muted, brand→accent, success→good, warning→warn, stop needs a new `k-badge-bad`. |
| EstimateBar | Recolor: track panel2, working accent, confirmed good | Same encoding as MasteryDial.js:40-55. |
| Logo (logo.tsx:25) | Typographic only: `font-brand font-semibold text-t2` | See D3.5. |
| Legal `.nt-prose` | `.k-md` rules, `max-w-prose` | — |
| Parent report | MasteryLine and Stat | — |

### D2. Dashboard views for a no-account tutor

KaizenEdu's "no account" is a server-side guest: `accounts.guest` (schema.ts:300), stored in Postgres behind a cookie, 120 free min/day and 30-day retention (kaizen.config.ts:344-346). It is not localStorage. Kaizen-AI's localStorage copy is on the dropped list (port SKILL.md:56).

**Today** (TodayView.js)
- **Data:**
  - `planner_items`: title, subject, due_on, status, completed_at (schema.ts:306-318; contracts.ts:427-440)
  - `ProgressResponse.dueChecks` and `nextSkill` (wire.ts:419-433)
  - the last session's `summary.practice` (contracts.ts:111-118)
  - `entitlement.remainingMinutes` (learn/page.tsx:128)
- **Mapping:**
  - WeekStrip comes from due dates.
  - "Your next step" is the nearest planner item, else a due check, else `nextSkill`. Its CTA uses `startOnTopic`/`startSequence` (workspace.tsx:43-66; start-session.tsx:135-143).
  - The checks card starts a session, because the due check "runs at the start of your next session" (progress.tsx:113-116); there is no separate CheckFlow.
  - Also due / This week come from planner rows.
  - Rings:
    - ring 1: planner done today / due today
    - ring 2: sessions started today (new field)
    - ring 3: confirmed/tracked (the weekly lead), never an average estimate
  - "Feeling curious?" becomes a TopicFields start.
- **Drop** the streak chip (TodayView.js:261-269), Celebration/CHEERS (:22-28, 174-192) and "All clear" copy.

**Learn** (StudyView.js)
- **Data:**
  - `coursework` (schema.ts:53-64; CourseworkItem contracts.ts:79)
  - skills (fractions slice plus `subjects` rows, progress.tsx:48)
  - `skill_mastery` estimate/status/next_check_at (schema.ts:117-131; contracts.ts:219-232)
- **Mapping:**
  - Library becomes CourseworkManager.
  - Grouped skill rows use MiniRing, or MasteryDial with `working=estimate` and `confirmed = status==='confirmed'`.
  - Badges: Start / Check due / In progress. The "Practice" chip starts a session on that skill.
  - StartCard sits at the top.

**Growth** (ProgressView.js)
- **Data:** `ProgressResponse` sessions, minutes, mastery, misconceptions (progress/service.ts:48-80), and `weeklyLead()` tracked/confirmed/moved[] (report/lead.ts:35-80).
- **Mapping:**
  - The headline is MasteryLine (map `moved.name` to `title`).
  - Stat tiles: Sessions, Minutes, Confirmed, Checks right. The checks aggregate is new; take it from summaries or `check_result` evidence.
  - The consistency grid needs a new `activityDays` field (`SELECT DISTINCT date(started_at)` on `sessions_learner_idx`, schema.ts:81).
  - A trend, if kept, comes from `evidence_events` `mastery_change` / `check_result` (schema.ts:142-160, append-only) and must be labelled "estimate", never "mastery" (ProgressView.js:13-26; progress.tsx:42-45).
  - "Worth another pass" comes from open misconceptions and the lowest in-progress estimates (progress.tsx:153-166).
  - Recent sessions come from recent-sessions.tsx.
  - Drop the weekly report and "send to Kaizen". Point to `/support` instead (support inbox, "not a tutor handoff", port SKILL.md table).

**Plan and Grades:** drop. There is no gradebook data, and both are on the dropped list.

### D3. Conflicts to resolve

1. **One dark surface versus call-like session and dark mode.**
   - KA rule: KA spec :34-36, tailwind.config.js:33, globals.css:21.
   - KE ships full dark tokens (tokens.css:46-74), a ThemeToggle (header.tsx:79, public-shell.tsx:71), and requires light and dark review (design-system SKILL.md:21, 28).
   - KA's own AI session is light (StudySession.js:243).
   - Options: (a) light session and no dark mode, which needs a skill amendment; (b) the session becomes the single coal surface, using the existing `tone="night"` variants; (c) map `.dark` onto the coal palette, which breaks KA rule 1.
2. **Fonts, next/font in JS versus TS.**
   - The API is the same in TS. The design-system skill already wants next/font (SKILL.md:20).
   - The root layout is upstream-owned (a `// KAIZEN:` patch is needed), so load the fonts in `(learner)`/`(parent)` layouts on the `.nt-app` div.
   - Font variables on that div do not reach portals (Toaster, dialogs), which tokens.css reaches via `body:has(.nt-app)`. That needs a KAIZEN patch on body or a `body:has(.nt-app){--font-…}` bridge.
   - `next/font/google` fetches at build time (a Dockerfile exists).
   - About 15 font files against the "interactive ≤2 s" budget (KE CLAUDE.md).
   - `--font-sans` is currently Geist (tokens.css:14) and `.nt-mono` uses geist mono (:167).
3. **Tailwind 3 tokens versus v4 `@theme`.**
   - `@tailwind` directives and `tailwind.config.js` do not exist in v4. `<alpha-value>` is unsupported: use `--color-ink: rgb(var(--c-ink))`, and opacity modifiers compile to color-mix.
   - `@theme` must live in globals.css's import graph. tokens.css is imported from JS layouts, so it can hold values only. `@apply` in any other CSS file needs `@reference`.
   - Name collisions with existing shadcn theme keys (globals.css:40-56) also used by upstream:
     - `muted`: KA text color versus KE surface. Use `text-muted-foreground`.
     - `accent`: KA rose versus KE hover surface. Add `--color-rose` and re-point `--accent-foreground`.
     - `rounded-sm/md/lg`: KE derives them from `--radius`; add `rounded-input/card/panel` at 10/14/20.
     - `text-sm`, `text-xs`: v4 xs is 12px versus KA 13px.
     - `max-w-prose`: v4 65ch versus 46rem; verify the override.
   - Also check the renames: `bg-gradient-to-*`→`bg-linear-to-*`, `outline-none`→`outline-hidden`, `shadow-sm`→`shadow-xs`, and the default ring width.
   - Scope new values under `body:has(.nt-app)` so upstream OpenMAIC is not re-skinned.
4. **Icons.** KE bans hand-drawn SVG icons and sparkle "AI" icons, and mandates lucide (design-system SKILL.md:16, 20). KA's Icons.js is hand-drawn and uses IconSpark for AI moments (TodayView.js:405; StudyView.js:192; page.js:870). Map the names to lucide with `strokeWidth={1.8}` and swap Spark for a non-AI glyph.
5. **Brand.** KA's KaizenMark and "Kaizen" wordmark conflict with D13: "neither 'MAIC' nor 'Kaizen' in the product name" (kaizen.config.ts:460-462) and the logo rule "No illustration, no mascot" (logo.tsx:22).
6. **Entity and age copy.** AppFooter.js:38 "Kaizen Academy LLC … 13 and up" fails tests/invariants/claims.test.ts:84-85, 136 (no legal entity on any surface). KE serves the early years to adult (landing.tsx:49).
7. **Port skill drops.** It drops the planner UI (TodayView/CalendarView/GradesView) and the localStorage working copy (KE/.claude/skills/kaizen-ai-port/SKILL.md:56). A Today tab needs an owner override. KE already has its own Planner (planner.tsx).
8. **Nav tabs are pinned.** tests/tutor/guest-ui-shell.test.ts:64-72 pins learner nav as `['Learn','Planner','Homework','Progress']` with `#` hrefs (nav.ts:34-39). Today/Learn/Growth tabs need that test changed, and the port skill forbids removing passing tests without a reason (SKILL.md:13).
9. **Em-dashes** (KA rule, spec :54) already appear in KE UI: session.css:320 `' — interrupted'` and progress.tsx:111. KA's MasteryLine.js:48 has one too.
10. **Streak and celebration.** KA TodayView/ProgressView streaks conflict with KE's "No score, no streak" (wrap-screen.tsx:45) and the banned confetti/countdowns (design-system SKILL.md:16).
11. **Audience scaling.** KA sizes are fixed for 13+, with Button md at about 44px; KE requires 56px targets and larger type on the kids surface (tokens.css:97-104; design-system SKILL.md:26). The `k-badge` at 10px uppercase is too small there.
12. **Name clashes.** KA `Section` is page rhythm while KE `Section` is a titled region (section.tsx:20), so name the port `PageSection`. `tone` means different things (see D1 Buttons).
13. **Copy linter** (design-system/scripts/check-copy.mjs:11-14) scans components/tutor and app/(learner|parent). It bans unlock/journey/…, `!`, and emoji including U+2600-27BF (✓ ★), which also covers KA's `✓`-prefix convention (spec :83-84).

---

## E. Files to create or rewrite in KaizenEdu, in dependency order

| # | File | Action | ~Lines |
|---|---|---|---|
| 1 | KE/components/tutor/brand/theme.css | New. `@theme inline`: 15 colors as `rgb(var(--c-*))`, `rose` alias, fonts brand/body/opmono, text d1-micro with line-height and tracking, radius input/card/panel, shadows soft/lift/glow, containers wide/narrow/prose, animate fadeUp/breathe/marquee plus keyframes. Also the `.k-card…k-badge-*` recipes, `k-badge-bad`, `.k-md` | 170 |
| 2 | KE/app/globals.css | Patch: `@import` theme.css with a `// KAIZEN:` note | +3 |
| 3 | KE/components/tutor/brand/tokens.css | Rewrite. `--c-*` triplets under `body:has(.nt-app)`. Re-point shadcn vars: background→paper, foreground→ink, card→panel, muted→panel2, muted-foreground→muted, primary→ink, accent→rose/10, accent-foreground→rose, border/input→border, ring→rose, destructive→bad. Re-point `--nt-*` to good/warn/bad soft, board→panel, shadow→soft. Keep surface vars. Re-base `.nt-h*`/`.nt-display` on brand plus the d/t sizes. Decide the dark block | 300 |
| 4 | KE/components/tutor/brand/fonts.ts | New. `next/font/google` ×3 | 35 |
| 5 | KE/app/(learner)/layout.tsx, KE/app/(parent)/layout.tsx | Edit: font variables on `.nt-app`, plus the portal bridge | +6 each |
| 6 | KE/components/tutor/ui/icons.tsx | New lucide map (1.8 stroke), or a TS port of Icons.js (≈170) if the skill is amended | 60 |
| 7 | KE/components/tutor/ui/button.tsx | Rewrite NtButton on KA variants and sizes, keeping tone, busy, asChild, nt-target | 95 |
| 8 | KE/components/tutor/ui/card.tsx, page-section.tsx, eyebrow.tsx, stat.tsx, notice.tsx | New TS ports | 40 / 55 / 15 / 20 / 40 |
| 9 | KE/components/tutor/ui/mastery-line.tsx, mastery-dial.tsx, rings.tsx | New TS ports: MasteryLine takes name, no em-dash; MasteryDial; Rings with the tones map | 65 / 85 / 60 |
| 10 | KE/components/tutor/ui/section.tsx | Edit: heading style, Pill→k-badge, EstimateBar colors | ~40 changed |
| 11 | KE/components/tutor/ui/fields.tsx, choice-cards.tsx, form-error.tsx | Restyle | ~15 / ~10 / ~10 |
| 12 | KE/components/tutor/motion/reveal.tsx (+ glow-line.tsx optional) | New TS port of Reveal/RevealGroup/useEntrance (`motion ^12` present) | 140 (+50) |
| 13 | KE/components/tutor/shell/states.tsx | Rewrite onto Notice, EmptyState and skeleton | 170 |
| 14 | KE/components/tutor/brand/logo.tsx | Edit: typography and colors only | ~20 |
| 15 | KE/components/tutor/shell/footer.tsx | Rewrite from AppFooter (no entity or age) | 50 |
| 16 | KE/components/tutor/shell/public-shell.tsx | Rewrite from dn/Shell header and footer (keep links and `#start`) | 150 |
| 17 | KE/components/tutor/shell/nav.ts + KE/tests/tutor/guest-ui-shell.test.ts | Tabs with icons, if Today/Learn/Growth is approved | ~40 + ~15 |
| 18 | KE/components/tutor/shell/app-shell.tsx | Rewrite: learner sidebar, bottom bar and column; parent uses AppHeader | 140 |
| 19 | KE/components/tutor/shell/header.tsx | Rewrite to the AppHeader pattern (parent, guest ForgetButton) | 130 |
| 20 | KE/components/tutor/marketing/front-door.css | Rewrite to k-chip checked state and big button, or delete | 40 |
| 21 | KE/components/tutor/learn/talk-start.tsx | Restyle | 130 |
| 22 | KE/components/tutor/marketing/landing.tsx | Rewrite on PageSection/Eyebrow/Reveal (keep ids and config reads) | 340 |
| 23 | KE/components/tutor/marketing/storyboard.css / storyboard.tsx | Recolor tokens | ~60 / ~10 changed |
| 24 | KE/components/tutor/marketing/legal/legal-page.tsx + prose | Restyle | 60 |
| 25 | KE/components/tutor/session/session.css | Rewrite on KA tokens (tiles, dock composer, talk states, check, menu, wrap) | 600 |
| 26 | KE/components/tutor/session/tutor-tile.tsx, board/board-pane.tsx, transcript.tsx | Restyle; transcript uses the Exchange grid | 125 / 65 / 85 |
| 27 | KE/components/tutor/session/dock.tsx, check-card.tsx, entitlement-banner.tsx, report-problem.tsx, metrics-overlay.tsx | Restyle | 260 / 160 / 70 / 150 / 90 |
| 28 | KE/components/tutor/session/session-screen.tsx | Add header strip, voice status strip, ready state | 290 |
| 29 | KE/components/tutor/session/wrap-screen.tsx | Restyle | 180 |
| 30 | KE/lib/tutor/wire.ts, KE/lib/tutor/progress/service.ts, KE/tests/tutor/progress*.test.ts | `ProgressResponse` gains `activityDays`, `sessionsToday`, `lead` (WeeklyLead) and a checks tally; SQL for these; tests | +15 / +60 / +70 |
| 31 | KE/components/tutor/learn/workspace.tsx | Rewrite as a tabbed view host (`?tab=`) | 160 |
| 32 | KE/components/tutor/learn/today-view.tsx, week-strip.tsx | New | 260 / 70 |
| 33 | KE/components/tutor/learn/growth-view.tsx, consistency-grid.tsx | New | 260 / 70 |
| 34 | KE/components/tutor/learn/progress.tsx, recent-sessions.tsx, start-session.tsx, planner.tsx, coursework.tsx | Restyle / refactor | 230 / 90 / 400 / 390 / 600 |
| 35 | KE/components/tutor/learn/topic-fields.tsx, guest-level.tsx, guest-start.tsx, blocked-states.tsx, entitlement-banner.tsx | Restyle | 90 / 105 / 140 / 120 / 50 |
| 36 | KE/app/(learner)/learn/page.tsx, learn/loading.tsx | Restyle greeting header; breathe loader | 140 / 20 |
| 37 | KE/components/tutor/parent/* (10 files, ~1,860 lines) and app/(parent)/parent/* (13 files) | Restyle last; report-view.tsx (281) gets MasteryLine | ~1,900 |

Rough total is about 7,000–8,000 lines touched. Rows 1–13 are the foundation and are what every later row depends on.
