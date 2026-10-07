# What the tutor is on screen

Spec §5.10 A, R31; `presence-layer` and `design-system` skills.

The orchestrator drives the tutor through one interface, `AvatarDriver`
(`driver.ts`), and knows nothing else about it. Three implementations exist:

| File | What it is | When it runs |
| --- | --- | --- |
| `presence-rig.ts` | An abstract luminous form. No face. | **The default.** Whenever `NEXT_PUBLIC_TUTOR_PRESENCE` is unset, empty, or unrecognised |
| `svg-rig.ts` | The built-in character, drawn in SVG | `NEXT_PUBLIC_TUTOR_PRESENCE=character`, and as the stand-in under `rive` |
| `rive-rig.ts` | A commissioned `.riv` character on the Rive runtime | Only when `NEXT_PUBLIC_RIVE_AVATAR_SRC` is set and the file loads |

`create-driver.ts` picks; `config.ts` (`resolvePresence`) decides. `avatar-face.tsx`
mounts whatever is picked. Nothing above `create-driver.ts` can tell which one
is on screen.

```
session-screen → tutor-tile → AvatarFace → createAvatarDriver ┬→ createPresenceAvatarDriver   (default)
                                                              ├→ createSvgAvatarDriver
                                                              └→ createRiveAvatarDriver       (swaps in over either)
```

## Why the default is not a face

The character rig is not broken. It has anatomical eyes with a sclera, iris,
pupil and two specular highlights; pupils that track `setGaze`; a blink that
shuts in 80 ms and opens over 150 ms with roughly a fifth of them doubles; four
viseme mouth shapes chosen from amplitude *and* its rate of change; springs
with overshoot; anticipation on every reaction; breathing on three
non-harmonic periods. Every one of those was a real fix for a real uncanny
signal, and the product owner still read the result as "weird" — twice.

That is not a bug list. It is a signal that the approach is wrong for what we
can produce without an illustrator. A procedurally drawn face invites a
comparison to a real face every time a learner looks at it, and each fix moves
it *further into* the uncanny valley rather than out the other side, because
the far side needs art we do not have.

An abstract presence is never compared to anything, so it cannot be creepy. It
ships. Voice products solve this constantly: a form that listens, considers and
speaks carries presence with no human features at all.

The character rig is **not deleted**. It stays selectable so the two can be put
in front of real children, and so a commissioned Rive character can still
replace either one.

## What the presence does

A soft, seven-lobed luminous form — closer to a river stone lit from inside
than to a circle — in a warm halo. Seven is prime and the lobe radii are
uneven, so the silhouette is organic before a single frame of animation runs; a
perfect circle would read as a button or a spinner.

**Each state is a different structure, not a different animation**, because
under `prefers-reduced-motion` structure is all a learner gets:

| State | What it does | What it looks like frozen |
| --- | --- | --- |
| `idle` | Breathes on three non-harmonic periods | Medium form, faint halo |
| `listening` | Solid rings travel **outward** on a calm 1.6 s cadence; their reach lifts with any level on the channel | The largest footprint of any state, opened wider than tall, two rings outside it |
| `thinking` | The inverse: the form contracts and its edge facets, the halo pulls in, broken rings gather **inward**, and one mote circles outside the form and **rests** between moves | The smallest footprint, gathered taller than wide, one broken ring close in, the mote parked |
| `speaking` | The amplitude envelope pushes each lobe out by its own weight, so the form *deforms* with the voice instead of scaling; a core lights inside it; rings are emitted on **syllable onsets** | The form swollen and asymmetric, a lit core |
| `at-whiteboard` | The whole form leans toward the board and stretches along that axis; the light inside it slides to the leading edge | Off-centre and elongated, lit from the board's side |
| `reacting` | A warm bloom and a lift for a correct check; a settle, a contraction and one gathering ring for "not quite" | Larger and warmer, or smaller and dimmer |

Design decisions worth knowing before you change any of it:

- **Listening pushes out; thinking pulls in.** That inversion is what keeps the
  two states apart at a glance across a room, with the detail thrown away.
- **The thinking mote rests.** A constant-velocity orbit is a loading spinner.
  It moves 74° over 620 ms on an ease-in-out and then holds for 380 ms; 74 does
  not divide 360, so it never retraces its steps. This is the state that covers
  end of speech to first audio, so it has to read as a beat, not as a hang.
- **There is no discrete highlight inside the form.** A single bright dot in a
  rounded shape is a cyclops eye, and two are a face — the whole read this rig
  exists to avoid. It was tried and it looked exactly like a pupil. Attention
  is carried by the *direction of the light*: the fill is a linear ramp whose
  axis rotates with gaze, so the lit side of the form turns toward whatever has
  the tutor's attention. A linear ramp cannot be an eye.
- **`setGaze` composes with the state's own focus** rather than overriding it,
  so the whiteboard lean and the thinking look-away add instead of one
  cancelling the other. (The character rig has a `gazeOverridden` flag that
  makes its `thinking` gaze dead in the real session, because the session calls
  `setGaze` once on mount. The presence has no such flag.)
- **"Not quite" dims the light; it never recolours the form.** A presence that
  goes quiet reads as "hmm"; one that goes grey or red reads as an error state,
  and this is a tutor. There is a test for it.
- **An opaque body sits under the translucent light ramp.** Without it the dark
  surface shows through the lit side and the warm light comes out muddy brown.
- **Rings on onsets, not on a timer, while speaking.** A rise above a decaying
  floor with a 190 ms refractory, so the rings are tied to the voice rather
  than decorating it.
- The motion all comes from `rig-motion.ts` — the same springs, easing,
  reaction envelope, saccades and idle sway the character rig uses. Nothing is
  reimplemented here; this file owns geometry and state, that one owns timing.

### The level channel

`setMouth` carries the playback queue's output amplitude, so today it is
non-zero only while the tutor is speaking (`lib/tutor/voice/playback-queue.ts`,
`amplitude: () => (playing ? sink.amplitude() : 0)`). The listening rings read
the same channel and lift their reach with it; with nothing on it they run on
their own calm cadence, which is what a learner sees now. If a microphone level
is ever fed to the same channel while the learner talks, the rings answer it
with no change in this folder.

### Colour

The presence **follows the theme**, and the character rig deliberately does
not. That is not an inconsistency: a character's identity should not invert
when the page goes dark, but the presence is *light*, and light has to be read
against its ground. The hue family stays put (teal, ≈190–214 in OKLCH, the
brand hue) while lightness and chroma shift between surfaces. The palette is
injected as custom properties scoped to the instance's id, so two rigs on a
page never fight and nothing leaks into the document.

Warm, not clinical: a lit-filament centre in the warm neutrals of the brand
palette, an aqua body, and a rim in the brand hue.

### Reduced motion

`prefers-reduced-motion: reduce` zeroes the vestibular triggers — sway,
breathing, saccades, spring overshoot, ring travel — and keeps everything that
carries information. The rings are drawn at fixed radii from the *pose* rather
than from the emitted pool, so a ring emitted while listening is not still
sitting there after the tutor has moved on. Every state stays distinguishable
by footprint, ring geometry, the lit core, and the lean.

## How to switch

One build-time variable, read in one place (`config.ts`, `resolvePresence`):

```bash
NEXT_PUBLIC_TUTOR_PRESENCE=presence    # default: the abstract presence
NEXT_PUBLIC_TUTOR_PRESENCE=character   # the built-in SVG character
NEXT_PUBLIC_TUTOR_PRESENCE=rive        # a commissioned .riv, character as the stand-in
```

An unrecognised or absent value falls back to `presence` rather than failing: a
typo in an env var must not cost a learner their tutor. Setting
`NEXT_PUBLIC_RIVE_AVATAR_SRC` still brings a commissioned character in over
whichever local rig is mounted, exactly as before — that behaviour is
unchanged.

`AvatarDriverOptions.presence` forces one in code. Only the contact sheet and
the tests use it.

## What would justify switching back

Two things, and both are evidence we do not have yet:

1. **A commissioned Rive character** that clears the bar in the art brief
   below. Then `NEXT_PUBLIC_TUTOR_PRESENCE=rive` plus
   `NEXT_PUBLIC_RIVE_AVATAR_SRC`, and the presence becomes the fallback. This
   is the outcome the whole seam was built for.
2. **The five-kid test at Gate 2 (presence-45) coming back in the character's
   favour** — kids preferring the face, or finding the presence cold or hard to
   read. Then `NEXT_PUBLIC_TUTOR_PRESENCE=character`, and the finding goes in
   `docs/evidence/`.

What would *not* justify it: one more round of fixes to the drawn face. That
has been tried twice. Nothing in this file is a substitute for putting both in
front of five children.

## Looking at it

`/eval/avatar` puts all three side by side against the same six states, then
shows every expression, gaze and level for whichever one is selected
(`preview.tsx`). It is dev-only: the route refuses in a production build, and
it is behind `TUTOR_MODE` like every product path.

```
TUTOR_MODE=1 NEXT_PUBLIC_TUTOR_MODE=1 pnpm dev
open http://localhost:3000/eval/avatar
node scripts/screenshot.mjs http://localhost:3000/eval/avatar shot.png 1280 1200
```

Query flags, so a screenshot run needs no clicking: `?dark=1` for the dark
surface, `?reduced=1` to force `prefers-reduced-motion` into the rigs,
`?still=1` to hold reactions and push blinks to the far end of their jitter so
a still frame is not a lottery over which faces are caught with their eyes
shut, `?rig=presence|character` for the detail rows.

## Files

- `driver.ts` — the interface, `AvatarGaze`, `REACTION_MS`, `BOARD_GAZE`. Unchanged seam.
- `rig-motion.ts` — the animation math, with no DOM in it: blink curve and
  cadence, viseme selection and minimum hold, springs, the reaction envelope,
  saccades, idle sway, squash and stretch. Shared by both local rigs.
- `presence-rig.ts` — the abstract presence: geometry, poses, the ring emitter,
  the onset detector, the mote.
- `svg-rig.ts` — the character's geometry and render loop.
- `rive-rig.ts` — the Rive adapter.
- `config.ts` — the env seam, `resolvePresence`, and the `.riv` input contract.
- `create-driver.ts` — the chooser and the mid-session upgrade.
- `preview.tsx`, `../../../app/(learner)/eval/avatar/page.tsx` — the contact sheet.
- `tests/tutor/avatar-presence.test.ts`, `avatar-rig.test.ts`, `avatar-motion.test.ts`.

## What the character rig does, and why

Kept here because the rig is kept. The rig it replaced was two
`SVGRectElement` eyes with no pupil, a blink shaped
`Math.abs(Math.cos(phase * PI))`, a head that never moved, and a mouth whose
height tracked audio amplitude. Each of those is a documented uncanny signal;
together they read as a mask. In animation terms:

- **Eyes with anatomy.** Sclera, iris, pupil, a large specular highlight and a
  small secondary one. The iris and pupil translate with `setGaze`; the
  highlights are siblings of the pupil group, not children, so they hold their
  place on the eye while the pupil travels under them.
- **Lids that are lids.** Each eye is clipped by an almond built from two
  quadratic curves that share their corners, and the same curves are stroked.
  A blink converges them onto a line; a smile raises only the lower one.
- **Asymmetric blink.** Shut in 80 ms on one curve, open over 150 ms on
  another. Roughly a fifth of blinks are doubles, and the gaps are jittered
  from 2.2 s to 7.4 s, so the cadence never resolves into a beat.
- **Mouth shapes, not amplitude.** Four crude visemes — `closed`, `eh`, `oh`,
  `ah` — chosen from amplitude *and* its rate of change. Each shape is held at
  least 90 ms (150 ms under reduced motion) so the mouth cannot strobe.
- **Overshoot, not approach.** Every animated value is a spring.
- **Anticipation.** A reaction dips about 30% the wrong way over its first
  110 ms before it lands.
- **Weight.** Breathing, sway and tilt on three non-harmonic periods (3.7 s,
  7.3 s, 11.1 s). The head squashes and stretches about the chin.
- **Asymmetry at rest.** The right brow sits 1.4 units higher than the left,
  the hair falls to one side, and "not quite" pulls one corner of the mouth.

Its palette is fixed rather than themed, for the reason in **Colour** above.

## The Rive seam

### Configuration

| Variable | Meaning |
| --- | --- |
| `NEXT_PUBLIC_RIVE_AVATAR_SRC` | URL of the `.riv` (same-origin, e.g. `/avatar/tutor.riv`). **Unset means no commissioned character**, and whichever local rig `NEXT_PUBLIC_TUTOR_PRESENCE` chose stays. Setting it is the switch. |
| `NEXT_PUBLIC_RIVE_STATE_MACHINE` | State machine name. Default `Tutor`. |
| `NEXT_PUBLIC_RIVE_ARTBOARD` | Artboard name, if the file has several. |
| `NEXT_PUBLIC_RIVE_RUNTIME_URL` | Where to load `@rive-app/canvas` from, until it is a dependency. |

`@rive-app/canvas` is deliberately **not** in `package.json`. Shipping a
runtime to every client to support an asset nobody has commissioned is a cost
with nothing behind it. Until then the adapter finds the runtime at
`window.rive` or imports `NEXT_PUBLIC_RIVE_RUNTIME_URL`.

Set `NEXT_PUBLIC_TUTOR_PRESENCE=rive` alongside it, so that the character rig
rather than the presence is what a learner sees for the few hundred
milliseconds before the asset lands, and what they keep if it never does.

**When the character is commissioned**, the migration is two lines: add
`@rive-app/canvas` to `package.json` (justification: the character runtime),
and in `rive-rig.ts` replace `defaultRiveRuntime` with

```ts
const defaultRiveRuntime = () => import('@rive-app/canvas');
```

Nothing else changes, in this folder or above it.

### What the `.riv` must expose

One state machine, named in `NEXT_PUBLIC_RIVE_STATE_MACHINE` (default `Tutor`),
carrying exactly these inputs. Names are the contract; they live in
`config.ts` as `RIVE_INPUTS`.

| Input | Type | Range | Meaning |
| --- | --- | --- | --- |
| `state` | Number | 0–5 | `0` idle, `1` listening, `2` thinking, `3` speaking, `4` at-whiteboard, `5` reacting |
| `mouth` | Number | 0–100 | Mouth openness or viseme weight, set at frame rate while speaking |
| `gazeX` | Number | −100–100 | −100 hard left, `+100` the whiteboard |
| `gazeY` | Number | −100–100 | −100 up, `+100` down |
| `expression` | Number | 0–3 | `0` neutral, `1` smile, `2` not-quite, `3` curious |
| `reactSmile` | Trigger | — | One-shot: a correct check |
| `reactNotQuite` | Trigger | — | One-shot: a wrong check |
| `reducedMotion` | Boolean | — | The file drops idle motion and overshoot while true |

`state`, `mouth`, `gazeX`, `gazeY` and `expression` are **required**: a file
missing any of them is rejected and the SVG rig stays, because a character that
ignores half of what the orchestrator says is worse than no character.
`reactSmile`, `reactNotQuite` and `reducedMotion` are optional; without the
triggers, reactions fall back to setting `expression`.

Also required of the file: a square artboard (the tile is
`aspect-ratio: 1`), a transparent background, and no audio.

## Art brief for an illustrator

This brief still stands, and it is the *only* route back to a face. The
default until it is filled is the abstract presence, not the built-in
character.

**The product.** A voice-first 1:1 AI tutor. The face is on screen for the
whole session in a video-call layout, beside a whiteboard. Learners are 9–12 at
launch, 4–8 and 13–17 later. The face never claims to be a person; a visible
"AI tutor" label sits on the tile.

**The bar.** It has to beat the abstract presence at `/eval/avatar` with five
children, not merely be better drawn than the built-in rig. Two rounds of
mechanical fixes to the built-in face did not clear that bar, which is why
there is a presence to beat.

**What it is.** A stylized character with a warm, specific personality. Not
photoreal, not a corporate mascot, not gendered, no sparkles or robot
iconography to signal "AI". A thirteen-year-old must not feel they have been
handed a toddler's app, and a nine-year-old must want to keep looking at it.
Think the *essence* of a character a child likes — readable silhouette,
oversized eyes, one memorable shape in the hair — not a resemblance to any
existing one. Nothing may be derived from an existing character or franchise.

**Register.** Calm and competent, closer to a good teacher than to a
game-show host. Reactions are proportionate: a smile for a correct answer, a
soft "not quite" for a wrong one. Never fireworks, confetti, streaks, or
anything that reads as a reward loop — this product recovers attention, it does
not maximize engagement (D15).

**Read.** Every state must be identifiable at 128 px on a phone and from across
a room. Silhouette first: someone should tell listening from thinking with the
detail thrown away.

**Deliverables.**

1. One `.riv` with the state machine and inputs in the table above.
2. A square artboard, transparent background, designed to read at 128 px and at
   480 px.
3. Idle life the app does not drive: breathing, blinking with asymmetric timing
   and occasional doubles, micro-saccades, small weight shifts. Never a
   metronome, never fidgeting.
4. Four or more mouth shapes blended from `mouth`, at least `closed`, a narrow
   `eh`, a rounded `oh`, and an open `ah`.
5. Gaze that moves the eyes first and the head second, so `gazeX = +100` reads
   as looking at the whiteboard, not as turning away.
6. A `reducedMotion` branch that holds every pose and drops the idle motion.
7. Source file, plus the palette as tokens.

**Constraints.**

- Light and dark surfaces. Do not invert the character; the tile behind it
  changes, the character does not.
- Accent hue in the brand family (teal, ≈205 in OKLCH). The whiteboard is the
  most colourful thing on the screen, and only while the tutor is drawing.
- No text anywhere in the file, so nothing needs translating.
- No audio.
- Budget: the file plus runtime must not push the session screen past 2 s to
  interactive on a mid-range phone, and the face must hold 60 fps beside a
  whiteboard and an audio graph.

**Open decisions for the owner, not the illustrator.** The built-in character rig picks a
warm neutral skin (`oklch(0.945 0.032 72)`) and a teal hairline that reads as
brand rather than as a specific person. Whether a commissioned character keeps
that neutrality, and how old it reads, is a product decision — the current head
proportion reads about eight to ten years old, which is warm for the 9–12 band
and may be too young for 13–17. `EYE_RY`/`EYE_DX`/`CHIN_Y` in `svg-rig.ts` are
the three constants that move it older.

## Gate 2

Five kids see both before Gate 2 (presence-45), on `/eval/avatar` and in a real
session. What to ask: which one they would rather be taught by; whether either
is creepy or babyish; whether they can tell listening from thinking without
being told. If the character wins, set `NEXT_PUBLIC_TUTOR_PRESENCE=character`
and record why. Findings go in `docs/evidence/`. Nothing in this file is a
substitute for that test.
