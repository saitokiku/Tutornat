# Kaizen-AI interior — token + composition extract

Sources read in full (all present, none missing):
`snapshots/Kaizen-AI/web/app/dashboard/page.js` (874 L) · `components/TodayView.js` (444 L) ·
`app/globals.css` (152 L) · `app/layout.js` (49 L) · `web/tailwind.config.js` (105 L, required —
globals.css only declares raw channel triplets; every px/rem value lives here) ·
`lesson/styles.css` (290 L) · `redesign/TEAM_BRIEF.md` (70 L).

Supporting source read because TodayView/page.js compose from them:
`components/ui/{Card,Button,Eyebrow,Notice,AppFooter}.js`, `components/Icons.js`,
`components/Brand.js`, `components/Rings.js`.

**Tailwind arithmetic note.** Kaizen is Tailwind + React. Tailwind's spacing unit is
`0.25rem`, so `py-2.5` = `0.625rem`, `gap-3.5` = `0.875rem`, `w-60` = `15rem`. Every utility
below is given with its resolved CSS value. Two config overrides matter: **`text-xs` is 13px
here, not Tailwind's default 12px**, and **`rounded-sm/md/lg` are 10/14/20px, not Tailwind's
defaults**. Copying a utility name without the config reproduces the wrong size.

---

## 1. Design tokens

### 1a. Colors — `globals.css :root`, declared as space-separated channel triplets

Declared as triplets so `tailwind.config.js` can wrap them `rgb(var(--c-x) / <alpha-value>)`
and keep every opacity utility working. Hex column computed, not quoted from source.

| Token | Value (verbatim) | Hex | Role (from source comments) |
|---|---|---|---|
| `--c-paper` | `250 250 249` | `#fafaf9` | base everything sits on |
| `--c-panel` | `255 255 255` | `#ffffff` | raised cards |
| `--c-panel2` | `241 241 239` | `#f1f1ef` | inset surfaces, table headers |
| `--c-border` | `228 227 223` | `#e4e3df` | hairlines |
| `--c-ink` | `26 25 23` | `#1a1917` | primary text **and the action color** |
| `--c-muted` | `107 104 98` | `#6b6862` | secondary text (AA on every surface above) |
| `--c-accent` | `169 59 93` | `#a93b5d` | marks, links, selection. **NOT the action color** |
| `--c-good` | `79 122 91` | `#4f7a5b` | status |
| `--c-warn` | `138 100 18` | `#8a6412` | status |
| `--c-bad` | `179 69 63` | `#b3453f` | status |
| `--c-coal` | `20 19 16` | `#141310` | the one dark surface (`/ai`), full page only |
| `--c-coal2` | `31 29 25` | `#1f1d19` | dark raised |
| `--c-nightline` | `51 48 42` | `#33302a` | dark hairline |
| `--c-ember` | `232 133 159` | `#e8859f` | rose tuned for dark ground |
| `--c-nightmuted` | `152 147 138` | `#98938a` | dark secondary text |

Verbatim contrast claims from the globals.css header comment:
`ink 16.8:1, muted 5.3:1, accent 5.8:1, ember-on-coal 7.3:1, nightmuted-on-coal 6.1:1`.

The five `coal*`/`ember`/`nightmuted` tokens serve `/ai` only — the interior never inverts
mid-page. **Not needed for the lesson surface.**

Alpha usages that appear in the interior (plain-CSS equivalents):
`bg-accent/10` → `rgb(169 59 93 / 0.1)` · `bg-good/10` · `bg-bad/10` · `bg-bad/25` (border) ·
`bg-panel/70` (rail hover) · `bg-panel/90` (mobile nav) · `bg-ink/30` (modal scrim) ·
`text-muted/60` (inactive mobile icon) · `hover:border-ink/30`.

### 1b. Radii — `tailwind.config.js borderRadius` (shape lock)

```
sm: 10px     /* inputs */
md: 14px     /* cards */
lg: 20px     /* large panels */
```
Buttons are `rounded-full`. Verbatim rule, globals.css L60: *"Shape lock: inputs 10px, cards
14px, large panels 20px, buttons pill. Nothing else is rounded."*

### 1c. Shadows — `tailwind.config.js boxShadow`

```
soft: 0 1px 2px rgba(20, 19, 16, 0.04), 0 4px 16px -8px rgba(20, 19, 16, 0.08)
lift: 0 2px 4px rgba(20, 19, 16, 0.04), 0 12px 32px -12px rgba(20, 19, 16, 0.14)
glow: 0 4px 24px -6px rgba(169, 59, 93, 0.30)
```
Tinted to ink (`20 19 16` = coal), not brown. `glow` is unused in the interior.

### 1d. Max-widths — `tailwind.config.js maxWidth`

```
prose:  46rem   /* a reading column */
narrow: 34rem   /* forms and focused product panels */
wide:   72rem   /* the grid */
```
Interior main column does **not** use these — it uses Tailwind defaults `max-w-lg` (`32rem`)
→ `lg:max-w-4xl` (`56rem`). `AppFooter` uses `max-w-wide` (`72rem`), so the footer column is
deliberately wider than the content column.

### 1e. Motion — `tailwind.config.js keyframes`/`animation`

```
fadeUp:  0% {opacity:0; transform:translateY(6px)} 100% {opacity:1; transform:translateY(0)}
         → fadeUp 0.45s cubic-bezier(0.2, 0.7, 0.3, 1) both
breathe: 0%,100% {transform:scale(1); opacity:1}  50% {transform:scale(1.04); opacity:0.85}
         → breathe 2.4s ease-in-out infinite
marquee: 0% {translateX(0)} 100% {translateX(-100%)} → 36s linear infinite  (marketing only)
```
Plus a component-local `@keyframes pop` inlined in TodayView (`<style>` tag, L182-189):
`0% scale(0.3)/opacity 0 · 35% scale(1.12)/opacity 1 · 80% scale(1) · 100% scale(1)/opacity 0`,
run as `animate-[pop_0.9s_ease-out_forwards]`.

Global reduced-motion guard, globals.css L118-123:
`transition-duration: 0.01ms !important; animation-duration: 0.01ms !important`.

### 1f. Element-level globals worth copying (globals.css L29-56)

```css
html, body { height: 100%; margin: 0; padding: 0; }
body { background-color: rgb(var(--c-paper)); color: rgb(var(--c-ink));
       -webkit-font-smoothing: antialiased;
       font-family: var(--font-body), ui-sans-serif, system-ui, sans-serif;
       font-size: 1rem; line-height: 1.6; }
*, *::before, *::after { box-sizing: border-box; }
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-thumb { background: rgb(var(--c-border)); border-radius: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::selection { background: rgb(var(--c-accent) / 0.20); color: rgb(var(--c-ink)); }
:focus-visible { outline: 2px solid rgb(var(--c-accent)); outline-offset: 2px; }
button { -webkit-tap-highlight-color: transparent; }
```
`viewport.themeColor` (layout.js L40) = `#FAFAF9`. No `maximumScale` — pinch-zoom left on,
deliberately (L35-36).

---

## 2. Sidebar / rail

Hierarchy (page.js L606-670). Class strings verbatim; resolved values in brackets.

```
aside.hidden.lg:flex.fixed.inset-y-0.left-0.w-60.flex-col.bg-panel2.border-r.border-border.z-20
├─ div.px-5.pt-6.pb-5                      [20px / 24px / 20px]
│  └─ <KaizenLogo size={32} href="/" caption="small steps, every day" />
├─ nav.flex-1.px-3.space-y-0.5             [12px side pad; 2px between items]
│  └─ button × 5  (one per TABS entry)
│     ├─ span[aria-hidden]  ← active rule
│     └─ <t.Icon size={18} /> + bare text label
└─ div.px-3.pt-3.pb-4.border-t.border-border.space-y-3   [12px / 12px / 16px; 12px stack]
   ├─ div.rounded-sm.bg-panel.border.border-border.px-3.py-2.5   ← "Confirmed" card (conditional)
   │  ├─ p.k-label                  "Confirmed"
   │  ├─ p.mt-1.font-opmono.text-t3.font-semibold.tabular-nums.text-ink   "{n}" + span.font-normal.text-muted " of {total}"
   │  └─ p.mt-0.5.text-xs.text-muted "on your own, unaided"
   └─ div.px-1.space-y-2.5          [4px pad; 10px stack]
      ├─ div.flex.items-center.gap-2.text-xs      ← sync line
      │  ├─ span.h-1.5.w-1.5.shrink-0.rounded-full  (bg-good | bg-bad)   [6×6px dot]
      │  ├─ span.truncate.font-medium.text-ink     {profile.name}
      │  └─ span.shrink-0.text-muted "synced" | span.shrink-0.text-bad "not saved"
      ├─ div.flex.items-center.gap-3.text-xs      ← a.text-muted.hover:text-accent ×3
      │                                             (Billing · Settings · Family)
      └─ button.text-xs.text-muted.hover:text-bad  "Sign out"
```

**Width.** `w-60` = `15rem` = **240px**. Main offset `lg:pl-60` = `padding-left: 15rem`.
Both are hard-wired; there is no `--sidebar-w` variable. (TEAM_BRIEF's "240px sidebar" matches.)

**Nav item anatomy** (L614-621) — icon **and** label, both present:
```
base    group relative w-full flex items-center gap-3 rounded-sm pl-4 pr-3 py-2.5
        text-sm font-medium transition-colors
        → gap 12px · radius 10px · padding 10px 12px 10px 16px · 14px/1.55 · weight 500
active  bg-panel text-ink shadow-soft          + aria-current="page"
idle    text-muted hover:bg-panel/70 hover:text-ink
rule    absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full
        active: bg-accent · idle: bg-transparent
        → 20px tall × 2px wide, flush to left edge, vertically centred, pill ends
icon    size={18}; active text-accent · idle text-muted group-hover:text-ink
label   plain text node, inherits the button's 14px/500
```
Active state = **lifted ruled tile**: panel fill + `shadow-soft` + 2px rose left rule + rose
icon. Rose marks selection; ink stays the action color (comment L602-605).

Tab registry (page.js L38-44) — ids drive `?tab=` in the URL:
```
today → "Today"  IconSun      calendar → "Plan"   IconCalendar
study → "Learn"  IconBook     grades   → "Grades" IconGrades
progress → "Growth" IconSprout
```

**Icons.** No icon font, no sprite — inline SVG, `viewBox="0 0 24 24"`, `fill="none"`,
`stroke="currentColor"`, `strokeWidth` default `1.8`, `strokeLinecap/Linejoin="round"`,
`aria-hidden="true"`. Colour comes from `currentColor`, so plain CSS themes them for free.
Full path data for all five rail icons is in `components/Icons.js` L18-45.

### Mobile behavior

Rail is `hidden lg:flex` → invisible below the `lg` breakpoint (**1024px**, Tailwind default).
Replaced by a fixed bottom bar (page.js L696-712):

```
nav.lg:hidden.fixed.bottom-0.inset-x-0.bg-panel/90.backdrop-blur-xl.border-t.border-border.z-20
└─ div.max-w-lg.mx-auto.grid.grid-cols-5          [32rem max, 5 equal columns]
   └─ button.relative.py-2.5.pb-[max(0.625rem,env(safe-area-inset-bottom))]
            .flex.flex-col.items-center.gap-1
      ├─ span.absolute.top-0.inset-x-6.h-0.5.rounded-full   active bg-accent | bg-transparent
      │                                   [2px rule on TOP edge, inset 24px each side]
      ├─ <t.Icon size={21} strokeWidth={on ? 2.1 : 1.8} />
      │                                   active text-accent | text-muted/60
      └─ span.text-micro.font-medium       active text-accent | text-muted
```
Same selection language as the rail (one rose rule per tab), rotated to the top edge.
`backdrop-blur-xl` = `backdrop-filter: blur(24px)`; fill `rgb(255 255 255 / 0.9)`.

Body clearance for the bar: `AppFooter className="mt-12 pb-20 lg:pb-0"` (`pb-20` = 5rem) and
TodayView root `pb-28 lg:pb-10` (7rem → 2.5rem).

### Main region

```
main.lg:pl-60
├─ (conditional) sync-error strip: div.bg-bad/10.border-b.border-bad/25
│   └─ div.max-w-lg.lg:max-w-4xl.mx-auto.flex.items-center.gap-3.px-4.lg:px-8.py-2.5.text-xs.text-ink
│       + button.k-btn-secondary.shrink-0.px-3.py-1.5.text-xs  (IconRefresh size 13 + "Retry")
├─ div.max-w-lg.lg:max-w-4xl.mx-auto.px-4.lg:px-8.pt-4.lg:pt-8   ← the view
└─ <AppFooter className="mt-12 pb-20 lg:pb-0" />
```
Content column: **32rem → 56rem at 1024px**; gutters **16px → 32px**; top pad **16px → 32px**.

---

## 3. TodayView composition

Root: `div.space-y-6.pb-28.lg:pb-10.animate-fadeUp` — **24px vertical rhythm between every
section**, entrance fade-up.

Section order, top to bottom (`TodayView.js` L243-442):

| # | Section | Element / classes | Heading |
|---|---|---|---|
| 0 | Celebration | `fixed inset-0 pointer-events-none z-50 flex flex-col items-center justify-center gap-3` | — (overlay, conditional) |
| 1 | Greeting row | `div.flex.flex-wrap.items-start.justify-between.gap-3.pt-1` | **h1** `font-brand text-t1 font-semibold text-ink` |
| 2 | Week strip | `div.grid.grid-cols-7.gap-1.5` | none |
| 3 | Next step | `Card as="section" pad="none" className="relative overflow-hidden shadow-lift"` | Eyebrow + **h2** `font-brand text-t2 font-semibold` |
| 4 | Also due today | `section.space-y-2` | **h2** `.k-label.px-1` → "Also due today" |
| 5 | This week | `section.space-y-2` | **h2** `.k-label.px-1` → "This week" |
| 6 | All clear | `Card pad="none" className="relative overflow-hidden px-6 py-12 text-center"` | *div*, not a heading: `font-brand text-t2 font-semibold` |
| 7 | Where today stands | `Card variant="inset" pad="none" className="p-5 flex flex-col sm:flex-row items-center gap-6"` | none (deliberately quiet, kept last) |
| 8 | Curiosity dive | `Card as="section" className="space-y-4"` (pad md = `p-6`) | **h2** `font-brand text-t3 font-semibold` |
| 9 | TaskModal | conditional overlay | — |

Sections 3-6 are mutually exclusive-ish: 4/5 render only when non-empty, 6 only when
`todo.length === 0`. **Heading levels skip nothing but `h2.k-label` is an 11px uppercase
eyebrow carrying `h2` semantics** — a real heading set at label size.

**§1 greeting row, right cluster** (L255-288):
- streak chip, only when `streak.count > 2`:
  `div.flex.items-center.gap-2.bg-panel.border.border-border.rounded-full.px-3.py-1.5`
  with `span.font-opmono.text-micro.uppercase.text-muted` "studied" +
  `span.font-opmono.text-sm.font-semibold.tabular-nums.text-ink` "{n}d".
  `title="Days you've studied. Pauses are free."`
- `<Button variant="primary" size="sm">` → `IconPlus size 15 strokeWidth 2.2` + "Add anything"
- icon button: `w-9 h-9 rounded-full bg-panel border border-border text-ink shadow-soft
  flex items-center justify-center hover:border-ink/30 active:scale-95
  transition-[border-color,transform]` + `IconPlus size 16`  [36×36px]
- date line: `p.text-xs.text-muted.mt-1`, `toLocaleDateString('en-US', {weekday:'long',
  month:'long', day:'numeric'})`

**§2 WeekStrip day tile** (L71-98) — 7 columns, `gap-1.5` (6px):
```
div  rounded-sm px-1 py-2.5 text-center transition-colors
     today:  bg-ink text-paper        other: bg-panel border border-border
├─ div.font-opmono.text-micro          today text-paper/70 | text-muted   ("Mon")
├─ div.font-opmono.text-t3.font-semibold.tabular-nums.mt-0.5   today text-paper | text-ink
└─ div.flex.justify-center.gap-0.5.mt-2.h-1.5    ← up to 3 dots, .slice(0,3)
   └─ span.w-1.5.h-1.5.rounded-full  style={{background: course.color || 'rgb(var(--c-muted))'}}
```
Fixed 6px dot row height reserved whether or not dots exist, so tiles never jitter.
Course colours are **user data**; the no-course fallback is a token reference, not a hex
(L43: `const NO_COURSE = 'rgb(var(--c-muted))'`).

**§3 next-step card** (L295-327): `Card` + absolutely-positioned
`div.absolute.inset-0.bg-gradient-to-br.from-panel2.via-transparent.to-transparent` and
`<SakuraBranch width={220} className="absolute -top-9 -right-10 opacity-25 ... hidden sm:block" />`;
content in `div.relative.p-5.sm:p-6` [20px → 24px].
`<Eyebrow className="mb-2.5">Your next step</Eyebrow>` → h2 → meta row
(`flex flex-wrap items-center gap-2 mt-2 text-xs text-muted`) → actions row
(`flex flex-wrap items-center gap-2 mt-5`: primary "Start with the tutor", secondary
"Done" with `IconCheck size 14 strokeWidth 2.2 text-good`, then `span.text-xs.text-muted.ml-auto.hidden.sm:block`
"then N more due today").

**§4/5 AssignmentRow anatomy** (L102-171) — the list primitive:
```
Card variant="inset" pad="none" className="px-4 py-3.5 flex items-center gap-3.5
     transition-all duration-500"      [resolved: bg-panel2 + 1px border + radius 14px,
                                        padding 14px 16px, 14px gaps]
  leaving: opacity-0 scale-95 -translate-y-1   (set, then onComplete fires after 450ms)
├─ button[aria-label="Mark complete"]
│    w-7 h-7 rounded-full border border-border bg-panel hover:border-good hover:bg-good/10
│    flex items-center justify-center transition-colors shrink-0 group     [28×28px]
│    └─ IconCheck size 13 strokeWidth 2.2 text-good opacity-0 group-hover:opacity-100
├─ div.flex-1.min-w-0
│  ├─ div.text-sm.font-semibold.text-ink.truncate          ← task title
│  └─ div.flex.items-center.gap-2.mt-0.5                   ← metadata, 8px gaps, 2px above
│     ├─ span.inline-flex.items-center.gap-1.5.text-xs.text-muted
│     │    └─ span.w-2.h-2.rounded-full  (course colour) + course name | "Personal"
│     ├─ span.w-1.h-1.rounded-full.bg-border.shrink-0      ← 4px separator dot
│     ├─ span.font-opmono.text-xs.tabular-nums  → text-bad (overdue) | text-warn (today) | text-muted
│     ├─ span.w-1.h-1.rounded-full.bg-border.shrink-0
│     └─ span.font-opmono.text-xs.tabular-nums.text-muted  "{minutes} min"
└─ div.flex.items-center.gap-1.5.shrink-0
   default: <Button variant="secondary" size="sm">Tutor</Button>
            + button[aria-label="More options"] w-7 h-7 rounded-full text-muted
              hover:text-ink hover:bg-panel ... leading-none  → "&#8943;" (⋯)
   menu on: button.rounded-full.bg-bad/10.px-3.py-1.5.text-xs.font-semibold.text-bad
              .hover:bg-bad/15 "Delete"
            + button.px-2.py-1.5.text-xs.text-muted.hover:text-ink "Cancel"
```
Destructive action is **two-step inline** (⋯ → Delete/Cancel), not a modal and not a
`confirm()`.

**§7 record card** (L373-399): `Rings` (default `size=148 stroke=12`, `GAP = 4`px) with a
centred label (`font-opmono text-t1 font-semibold tabular-nums leading-none` + `/{total}` in
`text-muted text-t3`, then `font-opmono text-micro uppercase text-muted mt-1.5`), beside
`div.flex-1.w-full.space-y-3` of three rows, each
`flex items-center gap-2.5` = `span.w-2.5.h-2.5.rounded-full` (10px, `bg-accent`/`bg-good`/`bg-ink`)
+ `span.text-sm.text-ink.flex-1` + `span.font-opmono.text-sm.tabular-nums.text-muted`.
`RING_TONES` (Rings.js) are palette references only, never hex:
`accent {color: rgb(var(--c-accent)), track: rgb(var(--c-accent) / 0.12)}`, `good` same at
`/0.12`, `ink` track `/0.09`, `warn` `/0.12`.

**§8 curiosity card** (L402-432): header row `flex items-center gap-3` with icon tile
`w-9 h-9 shrink-0 rounded-sm bg-accent/10 text-accent flex items-center justify-center`
(`IconSpark size 18`), then `input.k-input.text-sm.flex-1` + primary "Dive in" in
`flex flex-col sm:flex-row gap-2`, then `<Button variant="secondary" size="sm" block>`.

**Spacing rhythm summary (resolved):**
`24px` between sections · `8px` between rows inside a list section (`space-y-2`) ·
`12px` inside the rail footer stack · card pads `20px` (§7, `p-5`) / `24px` (§8, `pad="md"`) /
`20px→24px` (§3) · row pad `14px 16px` · meta gaps `8px`, chip gaps `6px`.

### Primitives TodayView depends on (resolved to plain CSS)

`ui/Card.js` — `rounded-md` (14px) unless `variant="plain"`, then:
```
raised (default): bg-panel border border-border shadow-soft
inset           : bg-panel2 border border-border          ← no shadow, quieter
plain           : no chrome, grouping by spacing alone
pad: none '' | sm p-4 (16px) | md p-6 (24px, default) | lg p-8 (32px)
```
Verbatim rule: *"Cards are for real elevation only: if the content just needs grouping, use a
hairline or space instead and pass variant="plain"."*

`ui/Button.js` — one pill, no local recipes:
```
base      inline-flex items-center justify-center gap-2 rounded-full font-semibold text-center
          transition-[background-color,border-color,transform] duration-150 active:scale-[0.98]
sizes     sm: text-sm px-4 py-2      → 14px type, 8px/16px pad
          md: text-sm px-6 py-3      → 14px type, 12px/24px pad   (default)
          lg: text-t3 px-7 py-3.5    → 17px type, 14px/28px pad
primary   bg-ink text-paper hover:bg-ink/90
secondary bg-panel text-ink border border-border hover:border-ink/30
accent    bg-accent text-paper hover:bg-accent/90
ghost     bg-transparent text-ink hover:bg-panel2
disabled  disabled:pointer-events-none disabled:bg-panel2 disabled:text-muted
          disabled:border disabled:border-border disabled:shadow-none
```
**Disabled is a real state, not opacity.** Verbatim: *"Fading the ink pill to 40% opacity put
its label at 2.54:1 against its own fill… Instead it drops to the quiet surface with muted
text (4.9:1) and keeps its shape."* The lesson stylesheet currently does
`.lw-btn[disabled] { opacity: .42 }` — the exact pattern this comment rejects.

`ui/Eyebrow.js` — `p.font-opmono.text-micro.font-medium.uppercase` + `text-accent` (day).
Rationed: *"at most one per three sections, hero counting as one."*

`ui/Notice.js` — `rounded-sm border px-4 py-3 text-sm`, `role="alert"` when `kind==='bad'`
else `role="status"`:
`ok bg-good/10 border-good/30 text-ink` · `bad bg-bad/10 border-bad/30 text-ink` ·
`warn bg-warn/10 border-warn/30 text-ink` · `info bg-panel2 border-border text-ink`.
Text stays `text-ink` in all four — colour never carries the meaning alone.

### `@layer components` recipes from globals.css (resolved)

| Class | Resolved CSS |
|---|---|
| `.k-card` | `background:#fff; border-radius:14px; border:1px solid #e4e3df; box-shadow:<soft>` |
| `.k-card-sm` | `background:#f1f1ef; border-radius:10px; border:1px solid #e4e3df` (no shadow) |
| `.k-btn-primary` | pill, `background:#1a1917; color:#fafaf9; font-weight:600; transition background-color,transform 150ms; hover bg ink/90; active scale(.98); disabled opacity .30 + pointer-events:none` |
| `.k-btn-secondary` | pill, `background:#fff; border:1px solid #e4e3df; color:#1a1917; font-weight:600; hover border ink/30; active scale(.98); disabled opacity .40` |
| `.k-btn-accent` | pill, `background:#a93b5d; color:#fafaf9` — *"reserved for the one destructive-adjacent confirm and for brand moments. It is not the default action."* |
| `.k-chip` | pill, `background:#f1f1ef; border:1px solid #e4e3df; font-size:11px; weight 500; color:#6b6862; padding:6px 12px; gap 6px; hover text ink / border ink/25` |
| `.k-input` | `width:100%; background:#fff; border-radius:10px; border:1px solid #e4e3df; padding:12px 16px; font-size:16px/1.6; color:#1a1917; placeholder muted/70; focus border #a93b5d + ring 2px accent/20` |
| `.k-label` | `font-family:var(--font-opmono); font-size:11px; line-height:1.4; letter-spacing:0.12em; font-weight:500; text-transform:uppercase; color:#6b6862` |
| `.dn-kicker` | same as `.k-label` minus the colour |
| `.k-badge` | `inline-flex; font-size:10px; font-weight:700; uppercase; letter-spacing:0.05em (tracking-wider); padding:2px 6px; border-radius:999px` |
| `.k-badge-*` | `bg-<tone>/10` + `color: color-mix(in srgb, rgb(var(--c-<tone>)) 60%, rgb(var(--c-ink)))` — `muted` uses 70%. `@apply text-ink` is the pre-`color-mix` fallback: *"darker than intended, never less readable."* |

Note `.k-badge` is the only place a `10px` size appears, and `.k-label`'s `0.12em` tracking
comes from the `micro` entry in the type scale, not from a `tracking-*` utility.

---

## 4. Typography

### Loading — **Google Fonts via `next/font/google`, NOT self-hosted** (layout.js L2-28)

```js
Schibsted_Grotesk({ subsets:['latin'], variable:'--font-brand',
                    weight:['400','500','600','700','800'] })
Instrument_Sans  ({ subsets:['latin'], variable:'--font-body',
                    weight:['400','500','600','700'], style:['normal','italic'] })
IBM_Plex_Mono    ({ subsets:['latin'], variable:'--font-opmono',
                    weight:['400','500','600'] })
```
Applied as `<html className={`${brand.variable} ${body.variable} ${opmono.variable}`}>`.
`next/font` self-hosts at *build* time — there is no runtime CDN request, but there is also
no checked-in font file to copy. **Nothing to reuse for a vanilla build.**
`lesson/index.html` sets `font-src 'none'` in its CSP, so any webfont is impossible there;
local-name + system fallback is the only route, which is what `lesson/styles.css` already does.

Roles (layout.js L4-7, verbatim): *"Schibsted Grotesk carries every display moment, Instrument
Sans carries every sentence, IBM Plex Mono carries every time, price, and percentage — the
things the record actually asserts, set in the one face that lines its digits up."*

Stacks (`tailwind.config.js fontFamily`):
```
brand : var(--font-brand),  ui-sans-serif, system-ui, sans-serif
body  : var(--font-body),   ui-sans-serif, system-ui, sans-serif
opmono: var(--font-opmono), ui-monospace, SFMono-Regular, Menlo, monospace
legacy aliases kept mapped: sans→body, display→brand, mono→opmono
```

### Type scale — `tailwind.config.js fontSize`. Tracking and leading travel **with** the size.

| Token | size | px | line-height | letter-spacing | Seen in the interior |
|---|---|---|---|---|---|
| `d1` | `3.75rem` | 60 | 1.02 | `-0.032em` | marketing only |
| `d2` | `2.75rem` | 44 | 1.05 | `-0.03em` | marketing only |
| `d3` | `2.125rem` | 34 | 1.08 | `-0.025em` | marketing only |
| `t1` | `1.625rem` | **26** | 1.15 | `-0.02em` | greeting h1; rings centre figure |
| `t2` | `1.25rem` | **20** | 1.25 | `-0.015em` | next-step h2; "All clear"; modal h1/h2 |
| `t3` | `1.0625rem` | **17** | 1.4 | `-0.01em` | "Feeling curious?" h2; rail "Confirmed" figure; week-strip date; footer wordmark; Button `lg` |
| `body` | `1rem` | 16 | 1.6 | — | body default; `.k-input` |
| `sm` | `0.875rem` | **14** | 1.55 | — | rail nav labels, row titles, metric rows, all Buttons |
| `xs` | `0.8125rem` | **13** | 1.5 | — | metadata, rail chrome, date line, legal line |
| `micro` | `0.6875rem` | **11** | 1.4 | `0.12em` | `.k-label`, Eyebrow, mobile nav labels, strip weekday |

`xs` = **13px**, overriding Tailwind's 12px default. Per the AppFooter comment, 13px is
deliberately the floor for fine print: *"Legal fine print at the same 13px… never dimmed."*

Weights in use: `400` body · `500` (`font-medium`) rail nav labels, chips, eyebrows ·
`600` (`font-semibold`) all headings, buttons, row titles, figures · `700` (`font-bold`) only
`.k-badge`. `800` is loaded but unused in the interior.

Digits: `tabular-nums` on **every** number — week-strip dates, durations, due labels, streak,
"Confirmed", metric values, rings centre. Pair it with `font-opmono`, always.

Config header rule, verbatim: *"An arbitrary `text-[Npx]` or `rounded-[Npx]` in a page is a
bug, not a style choice."*

---

## 5. Token mapping — Kaizen → `lesson/styles.css`

`lesson/styles.css` defines **22** custom properties, all in one `:root` (L8-20). It already
reuses Kaizen's naming scheme minus the `--c-` prefix, and already states the inheritance in
its own header comment (L1-7): *"Tokens carried over from the project's existing interior
(warm paper, ink actions, rose marks selection, shape lock: inputs 10px / cards 14px / panels
20px / pill buttons, 44px targets)."*

Already defined **and** used in `lesson/styles.css`:
`--paper --panel --panel2 --border --ink --muted --accent --good --bad --warn --good-soft
--bad-soft --warn-soft --accent-soft --font-brand --font-body --font-mono --r-input --r-card
--r-panel --shadow-soft --shadow-lift --target` — every one is referenced at least once; no
dead tokens.

| Kaizen token | Kaizen value | lesson/styles.css | Status |
|---|---|---|---|
| `--c-paper` | `#fafaf9` | `--paper: #faf9f7` | **drift** — lesson is warmer (`f7` vs `f9` blue) |
| `--c-panel` | `#ffffff` | `--panel: #fff` | match |
| `--c-panel2` | `#f1f1ef` | `--panel2: #f1f1ef` | match |
| `--c-border` | `#e4e3df` | `--border: #e4e3df` | match |
| `--c-ink` | `#1a1917` | `--ink: #1a1917` | match |
| `--c-muted` | `#6b6862` | `--muted: #5f5c56` | **drift** — lesson darker (more contrast, not less) |
| `--c-accent` | `#a93b5d` | `--accent: #a93b5d` | match |
| `--c-good` | `#4f7a5b` | `--good: #3f6a4b` | **drift** — lesson darker |
| `--c-warn` | `#8a6412` | `--warn: #7a5810` | **drift** — lesson darker |
| `--c-bad` | `#b3453f` | `--bad: #a33b35` | **drift** — lesson darker |
| `--c-coal/coal2/nightline/ember/nightmuted` | see §1a | — | **absent; do not add.** `/ai` dark-surface only; lesson has no dark surface and `<meta name="color-scheme" content="light">` |
| `borderRadius.sm` 10px | — | `--r-input: 10px` | match (renamed by role) |
| `borderRadius.md` 14px | — | `--r-card: 14px` | match |
| `borderRadius.lg` 20px | — | `--r-panel: 20px` | match |
| pill (`rounded-full`) | — | literal `999px`, 8 sites | **absent; add as `--r-pill: 999px`** |
| `boxShadow.soft` | `…0 4px 16px -8px rgba(20,19,16,0.08)` | `--shadow-soft: …-8px rgba(20,19,16,.09)` | **drift** — second-layer alpha `.09` vs `.08` |
| `boxShadow.lift` | `0 2px 4px /.04, 0 12px 32px -12px /.14` | `--shadow-lift: 0 2px 4px /.05, 0 14px 34px -14px /.16` | **drift** — all four numbers differ |
| `boxShadow.glow` | `0 4px 24px -6px rgba(169,59,93,0.30)` | — | **absent; do not add** — unused in Kaizen's interior too |
| `fontFamily.brand` | `var(--font-brand), ui-sans-serif, system-ui, sans-serif` | `--font-brand: "Schibsted Grotesk","Avenir Next","Helvetica Neue",system-ui,sans-serif` | **intentional divergence** — lesson names the face directly (no webfont possible under its CSP) |
| `fontFamily.body` | `var(--font-body), …` | `--font-body: "Instrument Sans","Avenir Next","Helvetica Neue",system-ui,sans-serif` | same |
| `fontFamily.opmono` | `var(--font-opmono), ui-monospace, SFMono-Regular, Menlo, monospace` | `--font-mono: "IBM Plex Mono",ui-monospace,"SF Mono",Menlo,monospace` | same; **note the name is `--font-mono`, not `--font-opmono`** — TEAM_BRIEF L27 mandates `--font-mono`, so lesson is correct and Kaizen's `opmono` name does not carry over |
| `fontSize.t1` 26px/1.15/−0.02em | — | hardcoded `1.5rem` on `.lw-title` | **absent; add as `--t1: 1.625rem`** (and note 24px, not 26px, is TEAM_BRIEF's phone value) |
| `fontSize.t2` 20px/1.25/−0.015em | — | hardcoded `1.3125rem` `.lw-prompt`, `1.1875rem` `.lw-profile h2`/`.lw-setup h2`, `1.125rem` `.lw-confirm h2`/`.lw-next-goal`, `1.0625rem` `.lw-next h2`, `1rem` `.lw-side h2` | **absent; add as `--t2: 1.25rem`** — seven different "section heading" sizes exist today where Kaizen has one |
| `fontSize.t3` 17px/1.4/−0.01em | — | `1.0625rem` on `.lw-sentence`/`.lw-choice` (as body copy, not a heading) | **absent; add as `--t3: 1.0625rem`** |
| `fontSize.body` 16px/1.6 | — | `body { font-size: 1rem; line-height: 1.55 }` | **near-match; leading drift** 1.55 vs 1.6 |
| `fontSize.sm` 14px/1.55 | — | `.875rem` ×7 sites | **absent; add as `--sm: 0.875rem`** |
| `fontSize.xs` 13px/1.5 | — | `.8125rem` ×5 sites | **absent; add as `--xs: 0.8125rem`** |
| `fontSize.micro` 11px/1.4/**0.12em** | — | `.75rem` + `letter-spacing: .07em` (`.lw-step-meta`, `.lw-next-kind`), `.6875rem` (`.lw-act-at`), `.06em` (`.lw-ev-head`) | **absent; add as `--micro: 0.6875rem` + `--micro-track: 0.12em`** — lesson's eyebrows are 12px at `.07em`/`.06em`; Kaizen's single recipe is 11px at `.12em` |
| `maxWidth.prose` `46rem` | — | `46ch` on `.lw-prompt`; `68ch`/`64ch`/`56ch`/`52ch`/`60ch` elsewhere | **absent; ch-based measures are fine, keep them** — Kaizen's rem measures don't map onto a lesson column |
| `maxWidth.wide` `72rem` | — | `.lw-app { max-width: 76rem }` | **drift** — 76rem vs 72rem |
| `maxWidth.narrow` `34rem` | — | `.lw-profile { max-width: 34rem }` | match by value, unnamed |
| 44px target | — | `--target: 2.75rem` | **lesson is stricter than Kaizen** — see below |
| `animation.fadeUp` `0.45s cubic-bezier(0.2,0.7,0.3,1)` | — | — | **absent; add as `--ease: cubic-bezier(0.2,0.7,0.3,1)`** if any entrance motion is wanted |
| `--good-soft #eaf1ec` `--bad-soft #f8eae9` `--warn-soft #f6f0e2` `--accent-soft #f7e9ee` | — | lesson-only | **no Kaizen equivalent** — Kaizen composes these live as `bg-good/10` etc. Opaque tints are the correct plain-CSS substitute for Tailwind's alpha utilities; keep them. |

**Where lesson already beats Kaizen — do not regress these:**
- `--target: 2.75rem` (44px) is enforced on buttons, inputs, choices, tokens, sentences and
  check rows. Kaizen's own rail item computes to ~**41.7px** (`py-2.5` + 14px/1.55) and its
  AssignmentRow complete/⋯ buttons are **28×28px** (`w-7 h-7`). TEAM_BRIEF L27 requires 44px.
  **Copy Kaizen's look, keep lesson's hit area.**
- `lesson` status colours all sit darker than Kaizen's, i.e. higher contrast. Keep.

**Tailwind/React dependencies with no plain-CSS carry-over:**
| Kaizen mechanism | Plain-CSS equivalent |
|---|---|
| `rgb(var(--c-x) / <alpha-value>)` + `bg-x/10` utilities | pre-mixed `*-soft` tokens (lesson already does this) or `rgb(169 59 93 / .1)` written out |
| `@apply` in `@layer components` | ordinary rule bodies |
| `space-y-N` (owl selector) | `display: grid; gap: Nrem` (lesson already uses grid+gap throughout) |
| `group` / `group-hover:` | `.parent:hover .child { … }` |
| `hidden lg:flex` / `lg:hidden` | `@media (min-width: 64rem)` — `lg` = **1024px** |
| `backdrop-blur-xl` | `backdrop-filter: blur(24px)` — but TEAM_BRIEF bans glass, so drop it |
| `<Card variant pad>` / `<Button variant size>` React props | `.card`/`.card--inset`, `.btn`/`.btn--primary` modifier classes (lesson's `.lw-btn`/`.lw-primary` is already this shape) |
| `next/font/google` CSS variables | local font-family name stacks (lesson already does this) |
| `tabular-nums` utility | `font-variant-numeric: tabular-nums` (lesson already does this) |
| `animate-fadeUp`, `animate-breathe`, `animate-[pop…]` | hand-written `@keyframes`; all three are optional under the brief's anti-motion rule |

---

## 6. Visual rules from `redesign/TEAM_BRIEF.md`

Per instruction, only the visual rules. The brief's `K-8`-only and no-network scope statements
are treated as obsolete and excluded. (For the record, the two places they appear are L11
and L13; L21's "Current product remains K–8" is also scope, not visual.)

**§"Shared visual rules" (L25-27), verbatim:**

> Primary surface **Operate**, learning is focused work. Sidebar on desktop; quiet mobile
> header + safe-area bottom navigation. Main region deliberately sized for its task, not
> equal-weight cards everywhere. Parent Today should be readable in one glance; supporting
> details are lower hierarchy. Use human page labels and contextual buttons, not debug IDs.

> Use CSS vars exactly: `--paper:#fafaf9; --panel:#fff; --panel2:#f1f1ef; --border:#e4e3df;
> --ink:#1a1917; --muted:#6b6862; --accent:#a93b5d; --good:#4f7a5b; --warn:#8a6412;
> --bad:#b3453f; --font-brand; --font-body; --font-mono`. Shell owns definitions. Fonts:
> Schibsted Grotesk headings, Instrument Sans body, IBM Plex Mono dates if local assets
> available; intentional local Avenir Next/sans + SFMono fallback. Headings 26px desktop/24px
> phone, section headings 20px, body 16px, dense metadata 14px; avoid tiny illegible
> microcopy. Inputs 10px/cards 14px/larger panels 20px; primary buttons ink pill, restrained
> secondary outlines, rose marks selection not every action. 44px targets, obvious focus, no
> gratuitous motion/gradient/glass/rainbow/icon tiles or decorative stats. Use whitespace,
> alignment and typography before drawing more boxes. Raw IDs belong in optional details, not
> the primary task heading. Status is readable text, never only color.

**§"Exact reference" (L17-21), the visual anchors it names:**

> `app/dashboard/page.js` lines 600–711: 240px sidebar, quiet active selection, learner/account
> context low in rail, main reading/work column, mobile bottom navigation.
> `components/TodayView.js` lines 243–359: compact date/greeting, primary action, week strip,
> one next task, smaller assignment rows.
> `app/globals.css`, `tailwind.config.js`, `app/layout.js`: source tokens/type.
> Use these actual source patterns. Do not inherit booking, club billing, 13+ eligibility,
> arbitrary mastery rings, canned cheers or hollow curiosity controls.

**§"Integration contract" (L56), the CSS-scoping rule:**

> New page CSS uses `.kaizen-workspace` / `.kaizen-record` / `.kaizen-plan` roots and consumes
> shell tokens; no overriding global chrome. Shared classes `.btn`, `.primary`, `.row`,
> `.stack`, `.panel`, `.muted`, `.field`, `.notice`, `.tag`, `.sr-only` remain available.

Also visual, from L29: *"Page subcomponents must have empty/loading/error/recovery states
where they perform actions."* and *"No static fabricated statistics."*

### Where the brief overrides the Kaizen source

Both are authoritative-but-conflicting; the brief wins on these five.

| Kaizen source does | Brief says | Resolution |
|---|---|---|
| `--c-paper: 250 250 249` → `#fafaf9` | `--paper:#fafaf9` | **brief = source.** `lesson/styles.css` `#faf9f7` is the odd one out. |
| `--c-muted #6b6862`, `--c-good #4f7a5b`, `--c-warn #8a6412`, `--c-bad #b3453f` | identical hexes | **brief = source.** lesson's darker variants are a third value set. Pick one; the brief says "exactly", so use the Kaizen hexes unless a measured contrast failure justifies lesson's. |
| `--font-opmono` | `--font-mono` | use **`--font-mono`** (lesson already correct) |
| next-step card has `bg-gradient-to-br` + `SakuraBranch opacity-25`; curiosity header has a `rounded-sm bg-accent/10` **icon tile**; mobile nav has `backdrop-blur-xl` | *"no gratuitous motion/gradient/glass/rainbow/icon tiles or decorative stats"* | **drop all four.** Keep the card's structure (eyebrow → title → meta → actions), lose the gradient, the branch, the icon tile and the blur. |
| rail item ≈41.7px; row buttons 28×28px; `text-micro` 11px eyebrows; `.k-badge` 10px | *"44px targets"*, *"avoid tiny illegible microcopy"*, *"dense metadata 14px"* | **keep Kaizen's visual weight, raise the box.** 44px min on anything clickable; don't go below 13px for metadata; reserve 11px for the few true eyebrows and nothing else. `.k-badge`'s 10px is out. |
| Rings, `CHEERS[]` array, "Surprise me with something wild", streak chip | *"Do not inherit … arbitrary mastery rings, canned cheers or hollow curiosity controls"* | **do not port §0, §7's rings, §8, or the streak chip.** §7's three labelled metric rows are fine on their own — they're readable text with numbers, not a decorative stat — provided the numbers are real. |

### Net build list for a vanilla implementation

Carry over, essentially as-is: the 10 light colour tokens · the 10/14/20/pill radius lock ·
`shadow-soft`/`shadow-lift` · the three font roles and the `t1/t2/t3/body/sm/xs/micro` scale ·
240px rail with the lifted-ruled-tile active state (2px rose rule, panel fill, `shadow-soft`,
rose icon) · account/learner context low in the rail · 32rem→56rem content column at 1024px ·
safe-area bottom nav with the rose rule rotated to the top edge · 24px section rhythm ·
`Card` raised/inset/plain · the one `Button` with its real-state disabled · `Notice`'s
four kinds with ink text · inline SVG icons on `currentColor` at `stroke-width: 1.8` ·
`font-variant-numeric: tabular-nums` on every number · the inline two-step destructive confirm.

Leave behind: gradients, the sakura decoration, the glass blur, icon tiles, rings, cheers,
the streak chip, the 10px badge, 28px hit areas, and the `--c-`/`opmono` naming.
