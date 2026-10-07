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
- **Skipped:** hidden, `inert`, `aria-hidden`, zero-size, invisible, unnamed elements, a control nested
  in another control, and auto targets inside `[data-spot-ignore]` (marked targets there still count).
- **Names** are the accessible name (aria-labelledby, aria-label, a field's labels, text, title),
  whitespace-collapsed, at most 60 characters. **A field's value is never read** — what a child typed
  stays theirs; entry fields (and contenteditable) are named by their labels only.

| Function | Does |
|---|---|
| `visibleSpots({ cap = 60, scrub })` | `{ id, name }[]` the tutor may point at now: marked targets first, then auto targets; within each, what is on screen first. |
| `resolveSpot(id)` | The element, by exactly the same rules, or `null`. |
| `setSpotScrub(fn)` / `scrubNames(names)` | The scrub every list and lookup uses. Auto ids are built from scrubbed names, so the learner's name never leaves the device, not even inside an id ("Hi, Ada" → `auto.heading.hi-name`, name `Hi, [name]`). |

### The engine (client store, like `lib/store.ts`)

| Function | Does |
|---|---|
| `spot(id, { say?, cue?, focus?, ms?, steps?, dim? })` | Lights one target. `false` (and nothing changes) when the id is invalid, unknown, hidden or guarded. `steps` continue after this one as a walkthrough. |
| `spotSteps([{ id, say }], { cue?, dim?, focus? })` | A walkthrough: one place at a time, Back / Next / Done. Starts at the first step that can be found; skips steps that are gone. |
| `stepSpot(1 \| -1)`, `clearSpot()` | Next / Back / close. Next past the end finishes. |
| `holdSpot(on)` | Pauses the timer (the layer does this while the caption is hovered or focused). |
| `revealSpot()` | Scrolls the lit target back into view and pulses it again (the edge button). |
| `guardSpots(ids) → release` | Makes targets unpointable while an item is up (see Honesty). |
| `currentSpot()`, `subscribeSpot()`; `useSpotlight()` in `components/spotlight/hooks.ts` | Read what is lit. (The hook lives with the components so `lib/spotlight.ts` has no React and is safe to import into the tutor route.) |

`cue: "glow"` (default) rings the element. `cue: "point"` puts a rose arrow beside it instead — for
small things a ring would crowd (a tick, one digit). `say` is the caption (trimmed, at most 160
characters here; the AI tool allows 90). `ms` defaults to `SPOT_MS` (8 s); `0` keeps it until dismissed.
`dim` defaults to on for walkthroughs and off for a single spot.

### The layer — `components/spotlight/SpotlightLayer.tsx`

Mounted once near the root. A fixed overlay; it never moves the page (no layout shift) and only the
caption and the edge button take pointer events.

- **Ring:** a 2px rose (`--color-accent`) rule with a soft rose glow, following the element's corners
  (pill buttons get a pill, an SVG circle a circle), at least 28px so a tick still gets a visible ring,
  kept inside the screen. Two calm pulses on arrival (exponential ease-out), then steady. It sits just
  above the target's own stacking level, so a drawer or sheet that covers the target also covers the
  ring. This is the one sanctioned halo in the KaizenEDU world — nothing else glows.
- **Caption:** panel, ink text, hairline, soft shadow, 14px radius, a pointer toward the target. It goes
  on a side where it fits and covers least of what matters — the question and headings, answer fields,
  whatever has focus; on a tie below, then above, then beside. For a part of a drawing it sits outside
  the whole drawing, pointing in. It never covers the target unless no side can hold it. Short captions
  sit on one line with "Got it"; walkthroughs show `2 of 4`, Back and Next / Done.
- **Phones (< 640px):** the caption docks as a bar above the bottom tab bar (or at the top when the
  target is down there), with an arrow button that turns to show which way the target is and brings it
  back when pressed.
- **Off screen:** the target is scrolled into view (smooth; instant under reduced motion) — unless the
  learner is typing. If they scroll it away while it is lit, an edge button ("Show me", with the
  direction for screen readers) appears on that edge of the screen or of the panel it scrolled out of.
- **Dim** (walkthroughs): the rest of the page under a light ink scrim with a rounded cutout.
- **Reduced motion:** steady ring, no pulse, no nudge (`kz-spot--still` on the layer, plus the media
  query). **Forced colors:** the system `Highlight` outline, no glow, no dim.
- **K–2:** buttons are 56px when the target is inside `[data-band="k2"]`, 44px otherwise.

### Behaviour rules

1. Pointing **never takes focus** unless `focus: true`. Keyboard users reach the caption with
   **Alt+Shift+T** (`aria-keyshortcuts` on its main button) or by tabbing to the end of the page;
   closing it with focus inside hands focus back to where they were.
2. It clears itself on **Escape**, on a **new page**, on a **new spot**, when the target **leaves the
   page** (a re-rendered element with the same id is followed instead), when the learner **uses the
   target** (a click, or focusing a field — it did its job; in a walkthrough this moves to the next
   step), or after **`ms`**. The timer waits while the caption is hovered or focused. Walkthroughs never
   time out.
3. The caption is announced once in a **polite live region** ("Step 2 of 4: …" in walkthroughs; "Look
   at: Hint" when there is no caption). While lit, the target is `aria-describedby` the caption, and
   its own `aria-describedby` is restored afterwards. The ring, arrow and dim are `aria-hidden`.
4. It works at 320px, for SVG parts inside the teaching visuals (including 0-wide tick lines), and
   inside scrolling panels.

## Honesty rule: never point at an answer

The tutor points to direct attention, never to answer. It never points at the correct choice, at the
answer, or at a step the learner has not reached.

- The prompt says so (`SPOT_GUIDE`), but the model does not know the answer key (the prompt never
  contains it), so it could point at the right choice by accident. So the page enforces it:
  **`guardSpots(answerSpots(item))`** while an item is up makes the correct choice
  (`practice.choice.<i>`) and the answer's tick on a number-line pad unpointable — by any id,
  marked or auto, and anything inside them. The request quietly fails.
- Guarded targets **stay in the visible list**. Leaving the right choice out would point at it by
  omission.
- `hintSpot` only names parts of what is given (the prompt, the picture) or the empty slot an answer
  goes in, never a choice. A test runs it over every skill, level and language.

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
  safe to call on every render (once per tool call; `force` re-runs it for "Show me again").
- `components/spotlight/SpotAgain.tsx` — what a point_at part leaves in the transcript: one "Show me
  again" chip; says "That isn't on the screen any more" if the target is gone.

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
| `practice.pad.key.<k>` | keypad keys: `0`–`9`, `minus`, `point`, `back`, `clear` |
| `practice.pad.fraction.top` / `.bottom` | fraction pad fields |
| `practice.pad.remainder.q` / `.r` | remainder pad fields |
| `practice.pad.text`, `practice.pad.symbol.<n>` | text / algebra field, its helper keys |
| `practice.choice.<i>` | choice tiles (the correct one is guarded) |
| `practice.pad.numberline`, `practice.pad.numberline.tick.<k>` | number-line pad, its points (k = steps from `pad.min`; the answer's is guarded) |
| `practice.pad.fractionbar.part.<k>`, `practice.pad.clock.hour` / `.minute` | the other touch pads |
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
`stage.next`, `stage.finish`, `stage.tutor`; quiz: `stage.quiz.prompt`, `stage.choice.<i>` (the answer
guarded), `stage.check`, `stage.hint`, `stage.why`, `stage.next-question`; widgets:
`widget.fractionbar.part.<i>`, `widget.fractionbar.more`, `widget.fractionbar.fewer`,
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
   - send what is on screen with each message:
     `onSend={(text) => sendMessage({ text }, { body: { context: { ...context, spots: visibleSpots() } } })}`
   - point: `useEffect(() => { for (const m of messages) for (const p of m.parts) runSpotFromToolPart(p as { type: string }); }, [messages]);`
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
   - `useEffect(() => (item ? guardSpots(answerSpots(item)) : undefined), [item]);`
   - the ids in the practice table above, via `{...spotAttr("practice.hint")}` etc.
   - `MathText` gets an optional `spot?: string` prop: each part `{...spotAttr(`${spot}.part.${i}`)}`,
     a fraction's two number spans `.top` / `.bottom`, a power's `<sup>` `.exp`, the blank
     `practice.prompt.blank`. The Runner passes `spot="practice.prompt"`; `Worked` passes nothing.
   - `VisualView` gets an optional `spot?: string` prop forwarded to the visual components, which add
     the part ids above; the Runner and the lesson stage pass it, the tutor's cards don't.
   - optional: when the learner taps Hint, `const id = hintSpot(item, hints)` → `spot(id, { cue: "point", ms: 5000 })`
     (no caption: the hint is already on screen; the arrow shows where it applies).
8. **Lesson stage** — the stage and widget ids; in `QuizView`, `guardSpots([`stage.choice.${q.answer}`])`
   while a question is unanswered.
9. **Shell, Today, calendar, courses, family, talk** — the ids above with `spotAttr`; on both the rail
   link and the bottom-bar link for each tab.
10. **Tutor drawer on phones** (`components/tutor/TutorDrawer.tsx`): the sheet covers the page, and the
    ring correctly sits under it. When `useSpotlight()` lights a target outside the panel, lower the
    sheet to a peek (or close it) until the spot clears, so the learner can see where the tutor points.
11. **Age band** — put `data-band={bandOf(grade)}` (`@/catalogue`) on a wrapper (the design-system pass); the layer reads
    it from the target's ancestors for the 56px K–2 buttons.

## Limits

- Auto ids depend on page order; if the page changes between the message and the tool call, an auto id
  can drift to a neighbour or vanish (then nothing lights). Marked ids don't drift — mark what matters.
- A target covered by an opaque layer the tutor did not open (a dialog) is lit under it, not on top.
- `hintSpot` only answers when the words leave no doubt; most hints get no spot, by design.
