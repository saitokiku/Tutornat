# Spotlight: the tutor points

The tutor — AI or the demo tutor — can point at anything on the learner's screen the way a person
points with a finger: a button ("tap Hint"), part of a problem (the bottom number of a fraction, a tick
on the number line, the tens column), a place in the app ("your test is here on the calendar"). The
element glows, a short caption says why, and if it is off screen the learner is shown which way it is.

Code: `apps/web/src/lib/spotlight.ts` (ids, targets, engine), `lib/spot-hints.ts` (demo tutor),
`lib/ai/spot-tool.ts` (the `point_at` tool), `components/spotlight/` (the layer). Nothing is wired in
yet — the steps are at the end of this file.

## Contract

### Targets are ids, never selectors

An id is lowercase and dotted: `/^[a-z0-9][a-z0-9.-]{0,63}$/` (`SPOT_ID`, `isSpotId`). Every id is
validated before it touches the DOM; nothing from outside (the model, a URL) ever passes a CSS selector.

- **Marked targets.** `spotAttr(id, label?)` returns `{ "data-spot": id }` (plus `data-spot-label` to
  name a part with no text, like an SVG group). Bad ids, and ids starting with `auto.`, are refused
  with a console error in development and render nothing.
- **Anything else.** Every visible control (`button`, `a[href]`, `input`, `select`, `textarea`,
  `[role=button|tab|link|checkbox|radio|slider]`, `[tabindex]` ≥ 0) and every heading gets an auto id:
  `auto.<role>.<slug of its accessible name>`, `-2`, `-3` for duplicates in page order (e.g.
  `auto.button.check`, `auto.heading.coming-up`, `auto.link.calendar-2`). Auto ids are stable while
  the page is; marked ids are stable across pages, so mark what tutors point at often.
- **Skipped:** hidden, `inert`, `aria-hidden`, zero-size, visually hidden (`sr-only`), invisible,
  unnamed elements, a control nested in another control, and auto targets inside `[data-spot-ignore]`
  (marked targets there still count). A visually hidden field with a shown label (a styled radio, a
  file input inside its label) is lit through that label.
- **Names** are the accessible name (aria-labelledby, aria-label, a field's labels, text, title),
  whitespace-collapsed, at most 60 characters; every element's text is its own run of words, so
  `<span>Ada</span><span>Grade 3</span>` reads "Ada Grade 3". **A field's value is never read** — what a
  child typed stays theirs: inputs, textareas, selects and editable parts are skipped wherever they sit,
  even inside the label that names them. A control whose own label carries a value ("Numerator: 3")
  gets a `data-spot-label` ("Numerator") when it is marked, so its name and id don't change per keystroke.

| Function | Does |
|---|---|
| `visibleSpots({ cap = 60, scrub })` | `{ id, name }[]` the tutor may point at now: marked targets first, then auto targets; within each, what is on screen first. |
| `resolveSpot(id)` | The element, by exactly the same rules, or `null`. |
| `setSpotScrub(fn)` / `scrubNames(names)` | The scrub every list and lookup uses. Auto ids are built from scrubbed names, so the learner's name never leaves the device, not even inside an id ("Hi, Ada" → `auto.heading.hi-name`, name `Hi, [name]`). `scrubNames` scrubs each name whole and word by word ("María López" also scrubs "Maria" and "Lopez"), ignoring case and accents, as a whole word or glued on in camel case or to digits ("AdaGrade", "Ada3"), never inside another word ("Adam"). Backstop: a control whose name still carries a name of 4+ letters once slugged (split by markup, odd punctuation) is left out of the list. |

### The engine (client store, like `lib/store.ts`)

| Function | Does |
|---|---|
| `spot(id, { say?, cue?, focus?, ms?, steps?, dim? })` | Lights one target. `false` (and nothing changes) when the id is invalid, unknown, hidden or guarded. `steps` continue after this one as a walkthrough. |
| `spotSteps([{ id, say }], { cue?, dim?, focus? })` | A walkthrough: one place at a time, Back / Next / Done. Starts at the first step that can be found; skips steps that are gone. |
| `stepSpot(1 \| -1)`, `clearSpot()` | Next / Back / close. Next past the end finishes. |
| `holdSpot(on)` | Pauses the timer (the layer does this while the caption is hovered or focused). |
| `revealSpot()` | Scrolls the lit target back into view and pulses it again (the edge button). |
| `guardSpots(ids) → release` | Makes targets unpointable while an item is up (see Honesty). |
| `spotStatus(id)` | `"ok"`, `"missing"` or `"guarded"`: whether it could be lit now, and why not. Lights nothing. |
| `setSpotBand(band)` | The learner's age band (`bandOf(grade)`), or `null` for a grown-up; carried on each spot. |
| `edgeBars()`, `seenView(el)` | What covers the screen's top and bottom (sticky header, tab bar, a bottom sheet), and where `el` can be seen once its panels and those bars are taken off. Scrolling and drawing both go by this. |
| `currentSpot()`, `subscribeSpot()`; `useSpotlight()` in `components/spotlight/hooks.ts` | Read what is lit. (The hook lives with the components so `lib/spotlight.ts` has no React and is safe to import into the tutor route.) |

`cue: "glow"` (default) rings the element. `cue: "point"` puts a rose arrow beside it instead — for
small things a ring would crowd (a tick, one digit). `say` is the caption (trimmed, at most 160
characters here; the AI tool allows 90). A caption stays until the learner is done with it (Got it,
using the target, Escape, a new spot, a new page or problem): reading time is theirs (WCAG 2.2.1), and a
K–1 reader may need a long while or the speaker. A bare glow or arrow (no caption) clears after
`SPOT_MS` (8 s). `ms` overrides either; `0` keeps it until dismissed. `dim` defaults to on for
walkthroughs and off for a single spot. `setSpotBand(band)` tells the layer the learner's age band
(K–2 gets 56px buttons and a speaker in the caption).

### The layer — `components/spotlight/SpotlightLayer.tsx`

Mounted once near the root. A fixed overlay; it never moves the page (no layout shift) and only the
caption and the edge button take pointer events.

- **Ring:** a 2px rose (`--color-accent`) rule with a soft rose glow, following the element's corners
  (pill buttons get a pill, an SVG circle a circle), at least 28px so a tick still gets a visible ring,
  kept inside the screen. It sits **6px off the target**, clear of the app's 2px focus outline (offset
  2px), so a focused target shows two separate rings, never one thick bar. Two calm pulses on arrival
  (exponential ease-out), then steady. It sits just above the target's own stacking level, and is
  **clipped like its target**: where the target is cut (scrolled under the sticky header or the tab
  bar, or out of the chat log) the ring is cut at the same edge, and its glow never paints over a bar.
  This is the one sanctioned halo in the KaizenEDU world — nothing else glows.
- **Tracking:** animation frames run only while something moves. Scrolling (any scroller), resizing
  (window, visual viewport, target, caption), focus moving, the page changing (a MutationObserver: a
  hint appearing above the target), CSS transitions (the tutor drawer's padding sliding away) start
  them, and a 300ms look at the target's box catches anything else (an image loading above it).
- **Caption:** panel, ink text, hairline, soft shadow, 14px radius, a pointer toward the target. It goes
  on a side where it fits and covers least of what matters — the question and headings, pictures
  (`role="img"`: the problem's visual), answer fields, whatever has focus; on a tie below, then above,
  then beside. For a part of a drawing it sits outside
  the whole drawing, pointing in. It never covers the target unless no side can hold it. Short captions
  sit on one line with "Got it"; walkthroughs show `2 of 4`, Back and Next / Done. For keyboard users
  (last input was a key) a small "`F6` brings you here" line shows until focus is inside.
- **Phones (< 640px):** the caption docks as a bar in the free band of the screen: below a top bar,
  above the tab bar, **above a bottom sheet of any height** (the tutor drawer) and **above the on-screen
  keyboard** (measured from `visualViewport`). It docks at the top instead when the bottom would sit on
  the target or on a field (the talk board's composer, the answer box, whatever has focus), or when the
  band is too short. An arrow button turns to show which way the target is and brings it back.
- **Off screen:** the target is scrolled into view (smooth; instant under reduced motion) — unless the
  learner is typing (a key pressed in a text field in the last 1.5s; the cursor merely sitting in the
  chat box after sending does not count). "In view" means inside its panel and not under a sticky
  header, the tab bar or a sheet. If they scroll it away while it is lit, an edge button ("Show me",
  with the direction for screen readers) appears on that edge of the screen or of the panel it
  scrolled out of.
- **Dim** (walkthroughs): the rest of the page under a light ink scrim with a rounded cutout.
- **Reduced motion:** steady ring, no pulse, no nudge (`kz-spot--still` on the layer, plus the media
  query). **Forced colors:** a **dashed** system `Highlight` outline (keyboard focus is solid), no glow,
  no dim.
- **K–2:** the band comes from the learner (`setSpotBand`), falling back to a `[data-band]` ancestor of
  the target. K–2 gets 56px buttons, larger caption text, and a speaker button (the app's `Hear`) that
  reads the caption aloud, as every hint and choice can be.

### Behaviour rules

1. Pointing **never takes focus** unless `focus: true`. Keyboard users reach the caption with **F6**
   (the browsers' "next pane" key, bound to nothing on a page and typing no character;
   `aria-keyshortcuts` on the main button, the visible hint above, and the first walkthrough step's
   announcement says it). Inside the caption F6 does what the browser does. The main button is
   `aria-describedby` the caption. Closing it hands focus back to where the learner was **only** if
   focus came in by keyboard and was lost with the caption — a tap on Got it never pulls focus back
   into the answer field (and pops the phone keyboard up). A tap away from the caption releases it.
   When the edge button goes away with focus on it, focus moves to the caption's main button (or the
   target).
2. It clears itself on **Escape**, on a **new page**, on a **new spot**, when the target **leaves the
   page** (a re-rendered element with the same id is followed instead), when the learner **uses the
   target** (a click, or focusing a field — it did its job), or after **`ms`**. An Escape that closes a
   spot is consumed (`preventDefault` + `stopPropagation`), so the tutor drawer behind it stays open
   for the next one. Captions stay until dismissed; a bare glow times out after 8s; the timer waits
   while the caption is hovered or focused.
3. **Walkthroughs** never time out. Using a step's target moves to the next step; so does the step's
   target going away (often the step working: "Tap Add" turns the button into a form). Next past the
   end, or no step left to find, finishes.
4. The caption is announced once in a **polite live region** ("Step 2 of 4: …" in walkthroughs; "Your
   tutor is pointing at Hint." when there is no caption; "… at part of {the drawing}." for an unnamed
   part — and marking an unnamed target logs a dev error asking for `data-spot-label`). While lit, the
   target (or, for a field lit through its label, the field) is `aria-describedby` the caption, and its
   own `aria-describedby` is restored afterwards. The ring, arrow, dim and key hint are `aria-hidden`.
5. It works at 320px, for SVG parts inside the teaching visuals (including 0-wide tick lines), and
   inside scrolling panels.

## Honesty rule: never point at an answer

The tutor points to direct attention, never to answer. It never points at the correct choice, at the
answer, or at a step the learner has not reached.

- The prompt says so (`SPOT_GUIDE`), but the model does not know the answer key (the prompt never
  contains it), so it could point at the right choice, or at the 7 on the keypad, by accident. So the
  page enforces it: **`guardSpots(answerSpots(item))`** while an item is up makes **the whole place the
  answer is given** unpointable — by any id, marked or auto, and anything inside it:

  | Input | Guarded |
  |---|---|
  | choices | `practice.choices` and every `practice.choice.<i>` — all of them, not just the right one |
  | keypad, fraction, remainder | `practice.pad.keys` (the keys group) and `practice.pad.key.<0-9 / minus / point>` |
  | expr | `practice.pad.symbols` (the helper keys) |
  | number-line pad | `practice.pad.numberline.ticks` and every `practice.pad.numberline.tick.<k>` |
  | fraction-bar pad | `practice.pad.fractionbar.parts` and every `practice.pad.fractionbar.part.<k>` |
  | clock pad | `practice.pad.clock.face` |

  Guarding all of it, not only the answer, matters: if only the right choice stayed dark, a glow that
  fails to appear (or a "Show me again" that does nothing) would single it out. The slot the answer
  goes in (`practice.pad.output`, `practice.pad.fraction.top` / `.bottom`) and the problem itself stay
  pointable.
- Guarded targets **stay in the visible list**, and a failed point looks the same whatever the reason:
  nothing lights, and the transcript keeps no "Show me again" for it.
- `hintSpot` only names parts of what is given (the prompt, the picture) or the empty slot an answer
  goes in, never a choice or a key. A test runs it over every skill, level and language and checks no
  id falls inside that item's guard.

## The AI tool — `lib/ai/spot-tool.ts`

- `pointAt` — the AI SDK tool `point_at`, input `{ target, say ≤ 90, steps?: ≤ 4 × { target, say } }`
  (`PointAtInput`; `steps` continue after the first target). Its `execute` only echoes
  `{ requested: true }`, like the board tools in `tools.ts`; the browser does the pointing from the tool
  part. Bad ids, selectors and over-long captions fail validation (tested with `MockLanguageModelV4`).
- `TutorSpotContext` — zod for the list the browser sends: `{ id, name }[]`, at most 60.
- `SPOT_GUIDE` / `spotsPrompt(spots)` — when to point (the exact place: a button, the part the hint is
  about, where something lives in the app; one target at a time; ids only from the list; say it in
  words too; never an answer), plus the list, quoted as screen text, not instructions.
- `runSpotFromToolPart(part, { force? })` — performs a `tool-point_at` part once its input is complete;
  safe to call on every render (once per tool call; `force` re-runs it for "Show me again"). The first
  run's outcome is kept per tool call (`pointResult(toolCallId)`, `subscribePoints`): `ok`, `missing`
  or `guarded`. `spotStatus(id)` / `pointStatus(input)` say the same without lighting anything.
- `components/spotlight/SpotAgain.tsx` — what a point_at part leaves in the transcript: one "Show me
  again" chip, only for a pointing that lit (a missing or guarded one leaves nothing). The caption is
  the chip's `aria-description`, not its text, so the chat log's live region doesn't read it a second
  time. Says "That isn't on the screen anymore." if the target has since gone; a target guarded since
  then just stays dark.

## Demo tutor — `lib/spot-hints.ts`

`hintSpot(item, rung)` → the spot id a vetted hint is about, or `null`, read deterministically from the
hint's words and the item's structure (English and Spanish give the same ids):

| Hint says | Item has | Id |
|---|---|---|
| "the short / long hand" | clock | `visual.clock.hour` / `visual.clock.minute` |
| "Tens: …", "now the tens", "start at the ones", the only place named | column sum / base-ten blocks with that place | `visual.column.<place>` / `visual.baseten.<place>` |
| "the dot" | number line with a marker | `visual.numberline.marker` |
| "the bottom number is 6" | fraction answer pad, no given fraction | `practice.pad.fraction.bottom` (`.top`) |
| "the top", "the bottom", both | exactly one given fraction in the prompt | `practice.prompt.part.<i>.top` / `.bottom` / `practice.prompt.part.<i>` |
| "the exponent" | exactly one power in the prompt | `practice.prompt.part.<i>.exp` |
| "the empty boxes" | ten-frame with empty cells | `visual.tenframe.empty` |
| "the top row" | counters | `visual.dots.row.0` |
| "equal parts", "shaded", "jumps" | fraction bar / number line | `visual.fraction` / `visual.numberline` |

Anything ambiguous (two fractions, "both", several places) is `null`; about 7% of all hint rungs get a
spot today. `answerSpots(item)` lists what must never be lit for that item.

## Id conventions

Indexes are 0-based array positions everywhere (`part.0` is `item.prompt[0]`, `choice.0` is
`item.choices[0]`, `tick.0` is the minimum, `row.0` is the top row). Put the same id on both copies of
something that exists twice for layout (rail tab and bottom-bar tab): the first one that is shown wins.

**Shell** (`components/shell/AppShell.tsx`) — `nav.home`, `nav.practice`, `nav.talk`, `nav.learn`,
`nav.calendar`, `nav.growth`, `nav.family`, `nav.me`, `nav.settings`, `nav.new` (New course),
`nav.switch` (profile switcher).

**Today** (`app/(app)/home/page.tsx`, `components/today/*`) — `today.hello` (h1), `today.help-now`,
`today.test-coming`, `today.plan`, `today.next` (the next plan item's start button),
`today.plan.item.<i>`, `today.coming-up`, `today.coming-up.item.<i>`, `today.open-calendar`,
`today.learn-new`, `today.courses`, `today.start`.

**Practice set** (`components/practice/Runner.tsx`, `AnswerPad.tsx`, `MathText.tsx`)

| Id | Element |
|---|---|
| `practice.exit`, `practice.progress` | header close, progress dots |
| `practice.problem` | the problem card |
| `practice.prompt` | the problem heading |
| `practice.prompt.part.<i>` | each `MathPart` |
| `practice.prompt.part.<i>.top` / `.bottom` | a fraction's numerator / denominator span |
| `practice.prompt.part.<i>.exp` | a power's exponent |
| `practice.prompt.blank` | the answer blank in the prompt |
| `practice.visual`, `practice.picture` | the visual's wrapper, the big picture |
| `practice.feedback` | the right / not yet line |
| `practice.hints`, `practice.hints.<i>`, `practice.steps` | hint list, one hint, "Show me how" box |
| `practice.answer` | the AnswerInput wrapper |
| `practice.pad.output` | the keypad's answer display (the slot; pointable) |
| `practice.pad.keys` | the keys group (`Keys`' `role="group"` div) — **guarded** |
| `practice.pad.key.<k>` | keypad keys: `0`–`9`, `minus`, `point`, `back` — inside the guarded group |
| `practice.pad.fraction.top` / `.bottom` | fraction pad boxes, with `data-spot-label` = `t("practice.numerator")` / `t("practice.denominator")` (their aria-label carries the value) |
| `practice.pad.remainder.q` / `.r` | remainder pad boxes, `data-spot-label` = quotient / remainder |
| `practice.pad.text`, `practice.pad.symbols`, `practice.pad.symbol.<n>` | text / algebra field, its helper keys group (**guarded** for expr), one key |
| `practice.choices`, `practice.choice.<i>` | the choice list, and each choice on its **`<li>`** (so its Hear button is inside) — all **guarded** |
| `practice.pad.numberline`, `practice.pad.numberline.ticks`, `practice.pad.numberline.tick.<k>` | number-line pad, the group of its points (**guarded**), one point (k = steps from `pad.min`) |
| `practice.pad.fractionbar.parts`, `practice.pad.fractionbar.part.<k>` | fraction-bar pad: its parts group (**guarded**), one part |
| `practice.pad.clock.hour` / `.minute`, `practice.pad.clock.face` | clock pad: the hand controls, the face with its numbers (**guarded**) |
| `practice.check`, `practice.hint`, `practice.show-how`, `practice.ask-tutor`, `practice.skip`, `practice.next` | the buttons |
| `practice.finish`, `practice.finish.again` | finish heading, practise-again action |

**Teaching visuals** (`components/stage/visuals*.tsx`). Only the main visual on a screen (the problem's,
the scene's) carries ids — pass them a `spot` prefix; copies in the tutor's cards and worked examples
pass none. The whole SVG is `visual.<kind>` with the hyphen dropped: `visual.fraction`,
`visual.numberline`, `visual.dots`, `visual.tenframe`, `visual.baseten`, `visual.clock`,
`visual.array`, `visual.column`, `visual.rect`, `visual.triangle`, `visual.circle`,
`visual.righttriangle`, `visual.prism`, `visual.coord`, `visual.linegraph`, `visual.particles`,
`visual.moon`. Parts are `<g>` (or a transparent `<rect>` covering the part) with `spotAttr(id, label)`:

| Visual | Part ids |
|---|---|
| fraction bar | `visual.fraction.part.<i>` |
| number line | `visual.numberline.tick.<k>` (every drawn tick, k = (value − min) × denominator, or × 1), `visual.numberline.marker` |
| counters | `visual.dots.group.<g>`, `visual.dots.row.<r>`, `visual.dots.crossed` |
| ten-frame | `visual.tenframe.frame.<f>`, `visual.tenframe.cell.<k>`, `visual.tenframe.empty` (a `<g>` around the empty cells) |
| base-ten | `visual.baseten.hundreds` / `.tens` / `.ones` |
| clock | `visual.clock.hour`, `visual.clock.minute`, `visual.clock.number.<n>` |
| array | `visual.array.row.<r>`, `visual.array.col.<c>` |
| column sum | `visual.column.ones` / `.tens` / `.hundreds` / `.thousands` (a transparent rect over that column's digits), `visual.column.top`, `visual.column.bottom`, `visual.column.answer` |
| shapes | `visual.rect.width` / `.height`, `visual.triangle.base` / `.height`, `visual.circle.radius`, `visual.righttriangle.a` / `.b` / `.c`, `visual.prism.l` / `.w` / `.h` |
| coordinate grid, line graph | `visual.coord.point.<i>`, `visual.coord.line`, `visual.coord.axis.x` / `.y`; `visual.linegraph.point.<i>`, `visual.linegraph.axis.x` / `.y`; a bar chart, when one exists: `visual.bargraph.bar.<i>` |

**Lesson stage** (`components/stage/Stage.tsx`, `scenes.tsx`, `widgets/*`) — `stage.back`,
`stage.scenes`, `stage.scene.<i>`, `stage.title`, `stage.board`, `stage.read-aloud`, `stage.prev`,
`stage.next`, `stage.finish`, `stage.tutor`; quiz: `stage.quiz.prompt`, `stage.choices` and
`stage.choice.<i>` on each `<li>` (all guarded while unanswered), `stage.check`, `stage.hint`,
`stage.why`, `stage.next-question`; widgets: `widget.answer` (the part a widget's answer is set in,
guarded until checked), `widget.fractionbar.part.<i>`, `widget.fractionbar.more`, `widget.fractionbar.fewer`,
`widget.fractionbar.check`, `widget.numberline.point.<k>`, `widget.slider`,
`widget.sorter.item.<i>`, `widget.sorter.bin.<b>`, `widget.moon.phase.<i>`, `widget.matter.temp`.

**Talk board** (`app/(focus)/talk/page.tsx`, `components/tutor/TutorChat.tsx`) — `talk.back`,
`talk.break`, `tutor.input`, `tutor.send`, `tutor.mic`, `tutor.quick.<i>`, `tutor.read-aloud`,
`tutor.card.<i>` (cards in the latest reply), `tutor.card.practice.start`, `tutor.card.calendar.add`.

**Calendar** (`app/(app)/calendar/page.tsx`, `components/calendar/*`) — `calendar.add`,
`calendar.import`, `calendar.export`, `calendar.whose`, `calendar.week.prev`, `calendar.week.next`,
`calendar.week.this`, `calendar.day.<yyyy-mm-dd>`, `calendar.event.<event id>` ("your test is here"),
`calendar.form.title`, `calendar.form.date`, `calendar.form.kind`, `calendar.form.save`.

**Item page** — `item.title`, `item.start`, `item.back`, `item.resources`, `item.related` (adapt to
what the item page ships; keep the `item.` prefix).

**Courses** — `courses.new`, `courses.mine`, `courses.catalogue`, `courses.band.<band>`,
`courses.course.<id>`; a course: `course.start` (or continue), `course.lesson.<i>`, `course.related`.
Never mark destructive controls (`course.delete`): the tutor has no reason to point there.

**Family** — `family.child.<profile id>`, `family.notes`, `family.add-note`, `family.assign`; a child:
`child.today`, `child.week`, `child.skills`, `child.records`, `child.settings`.

## Wiring steps (after the merge)

1. **Mount the layer** — `app/layout.tsx`:
   ```tsx
   import { SpotlightLayer } from "@/components/spotlight/SpotlightLayer";
   // inside <body>, after {children}:
   <SpotlightLayer />
   ```
   It renders nothing on the server, portals into `body`, and keeps its route watcher in its own
   `<Suspense>`.
2. **Tutor context** — `lib/ai/context.ts`: `import { TutorSpotContext } from "./spot-tool";` and add
   `spots: TutorSpotContext.optional(),` to `TutorContext`.
3. **Prompt** — `lib/ai/prompts.ts`: `import { spotsPrompt } from "./spot-tool";` and in
   `systemPrompt`, before the return: `const spots = spotsPrompt(ctx.spots); if (spots) parts.push(spots);`
4. **Tool** — `lib/ai/tools.ts`: `import { pointAt } from "./spot-tool";` and add `point_at: pointAt,`
   to the object `tutorTools` returns (a board tool: it only echoes).
5. **TutorChat** (`components/tutor/TutorChat.tsx`):
   - names stay on the device: in `AiChat`,
     `useEffect(() => { setSpotScrub(scrubNames([learner.nickname, read().accounts.find((a) => a.id === read().session.accountId)?.displayName])); return () => setSpotScrub(null); }, [learner.nickname]);`
     (pass whole names: `scrubNames` also scrubs each word, so "Maria Lopez" covers "Maria").
   - send what is on screen with each message:
     `onSend={(text) => sendMessage({ text }, { body: { context: { ...context, spots: visibleSpots() } } })}`
   - point: `useEffect(() => { for (const m of messages) for (const p of m.parts) runSpotFromToolPart(p as { type: string }); }, [messages]);`
     (this first run is what lets `SpotAgain` appear: it only shows for a pointing that lit).
   - transcript: add `| { type: "spot"; part: { type: string; state?: string; toolCallId?: string; input?: unknown } }`
     to `Card`, `case "tool-point_at": out.push({ type: "spot", part: p }); break;` in `cardsOf`, and
     `case "spot": return <SpotAgain part={card.part} />;` in `CardView`.
   - optional: `data-spot-ignore` on the transcript log, so the list is mostly the page, not the chat.
6. **Demo tutor** — add `spot?: { id: string; say: string }` to `DemoTurn` in `lib/tutor-demo.ts` and
   fill it in `demoReply`:
   - `"hint"`: `const rung = Math.min(state.hintsGiven, item.hints.length - 1); const id = hintSpot(item, rung);`
     → `spot: id ? { id, say: hint.length <= 90 ? hint : t(locale, "spot.hintHere") } : undefined`
     (and the same for the opening hint, rung 0, in `demoOpening` / DemoChat's first entry);
   - `"answer"` after a try, and `noMoreHints`: `{ id: "practice.show-how", say: t(locale, "tutor.demo.showHow") }`.
   DemoChat's `send` (an event handler) then calls `if (r.spot) spot(r.spot.id, { say: r.spot.say })`.
7. **Practice Runner** (`components/practice/Runner.tsx`):
   - guard the answer while the item is up, and **clear any pointing when the problem changes** (Next
     reuses the same route and DOM nodes, so a caption about the last problem's "bottom number" would
     otherwise sit on this one's):
     ```tsx
     useEffect(() => {
       if (!item) return;
       const release = guardSpots(answerSpots(item));
       return () => {
         release();
         clearSpot();
       };
     }, [item]);
     ```
   - the ids in the practice table above, via `{...spotAttr("practice.hint")}` etc. In `AnswerPad.tsx`:
     `practice.pad.keys` on `Keys`' `role="group"` div, `practice.pad.key.<k>` on each key,
     `practice.pad.output` on the keypad's `<output>`, `spotAttr("practice.pad.fraction.top", t("practice.numerator"))`
     / `.bottom` on the fraction boxes and `practice.pad.remainder.q` / `.r` likewise (their aria-label
     carries the value; the label keeps the name and id still), `practice.choices` on `ChoiceTiles`'
     `<ul>` and `practice.choice.<i>` on each **`<li>`**, `practice.pad.symbols` on the algebra keys group.
   - `MathText` gets an optional `spot?: string` prop: each part `{...spotAttr(`${spot}.part.${i}`)}`,
     a fraction's two number spans `.top` / `.bottom`, a power's `<sup>` `.exp`, the blank
     `practice.prompt.blank`. The Runner passes `spot="practice.prompt"`; `Worked` passes nothing.
   - `VisualView` gets an optional `spot?: string` prop forwarded to the visual components, which add
     the part ids above; the Runner and the lesson stage pass it, the tutor's cards don't.
   - optional: when the learner taps Hint, `const id = hintSpot(item, hints)` → `spot(id, { cue: "point", ms: 5000 })`
     (no caption: the hint is already on screen; the arrow shows where it applies).
8. **Lesson stage** — the stage and widget ids. While a quiz question is unanswered, guard all of its
   choices: `useEffect(() => guardSpots(["stage.choices", ...q.choices.map((_, i) => `stage.choice.${i}`)]), [q]);`
   in `QuizView` (choices on the `<li>`, the list `stage.choices`). While an interactive widget is
   unchecked, guard the part the learner sets to answer, marked `widget.answer` on each widget (the
   sorter's bins, the number line's points, the fraction bar's parts, the moon phases, the clock face,
   the grid cells): `useEffect(() => (checked ? undefined : guardSpots(["widget.answer"])), [checked]);`.
   Clear the spot when the scene changes, as in step 7.
9. **Shell, Today, calendar, courses, family, talk** — the ids above with `spotAttr`; on both the rail
   link and the bottom-bar link for each tab.
10. **Tutor drawer** (`components/tutor/TutorDrawer.tsx`):
    - Escape: the caption consumes the Escape that closes it; make the drawer's window listener respect
      that, so one Escape never closes both: `const esc = (e: KeyboardEvent) => e.key === "Escape" && !e.defaultPrevented && onClose();`
    - on phones the sheet covers the page and the ring correctly sits under it (the caption docks above
      the sheet). When `useSpotlight()` lights a target outside the panel, lower the sheet to a peek (or
      close it) until the spot clears, so the learner can see where the tutor points.
11. **Age band** — in `AppShell` (and the focus layout that hosts practice and talk), next to where the
    learner is read: `useEffect(() => setSpotBand(learner ? bandOf(learner.grade) : null), [learner?.grade]);`
    (`bandOf` from `@/catalogue`). K–2 then gets 56px buttons and a speaker in the caption wherever the
    target is (the nav, the tutor sheet). A `[data-band]` ancestor of the target still works as a fallback.

## Limits

- Auto ids depend on page order; if the page changes between the message and the tool call, an auto id
  can drift to a neighbour or vanish (then nothing lights). Marked ids don't drift — mark what matters.
- A target covered by an opaque layer the tutor did not open (a dialog) is lit under it, not on top.
- `hintSpot` only answers when the words leave no doubt; most hints get no spot, by design.
- The name backstop leaves out a control whose name contains a learner's name of 4+ letters even
  inside another word ("Theory" for Theo). Safe, at the cost of that control not being pointable.
- The caption is not spoken on its own; K–2 gets the speaker button. Speaking it automatically would
  cut across the Runner's own read-aloud of the problem.
