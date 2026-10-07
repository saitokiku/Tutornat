# Wave 3 — strip the frontend, keep the engine

> **SUPERSEDED the same day, before any of it was executed.** The founder widened
> the business hours after this was written: all five revenue lines are live
> (1v1, group, the diagnostic at **$65**, the seat, the AI tutor), under-13
> children get an AI-tutor-only product, and voice stays and expands. The plan
> that replaces this is **`docs/superpowers/plans/2026-09-03-overhaul.md`**.
>
> Three things below are now actively wrong — do not act on them:
>
> 1. **"Delete the marketplace" (stage 5) is void.** 1:1 and the marketplace are
>    being *restored*. The five routes it lists as "genuinely dead" are to be
>    re-mounted, not removed.
> 2. **The voice section is out of date.** It says `seed.sql` and `GO_LIVE.sql`
>    seed `voice_enabled` **true**; commit `330fee9` made all three seeds and the
>    no-service-client fallback `false`. Voice is now a deliberate flip, not a
>    correction — and it is being flipped on.
> 3. **The shared-route table is wrong.** `/api/tutoring/observe`, `/recap` and
>    `/brief` are listed as shared with the club. They are not:
>    `observe` is called only by `components/TutorObserve.js`, and `group/brief`
>    writes `group_observation` itself. `/api/tutoring/room` and `/sessions` *are*
>    genuinely shared.
>
> What survives and was carried into the new plan: the line-count argument, the
> three-generations-of-primitive map, the admin-monolith seam, and the standing
> rule that a smaller storefront selling nothing is worth less than the current
> one selling a seat.

*2026-09-03. Written after the wave-2 geometry landed (PR #30) and the repo
cleanup that archived twenty-five superseded documents. This is a plan, not a
change: nothing in it has been executed. It needs a go.*

---

## The number that makes the argument

```
FRONTEND                             BACKEND
  app/ pages        11,871             app/api/         12,927
  components/       10,595             lib/server/       6,130
  lib/ (client)      2,588             lib/engine/       2,969
  ────────────────────────             ────────────────────────
  subtotal          25,054             subtotal         22,026
```

The presentation layer is larger than everything it presents, for a business
with **one recurring product and three users**. That is the whole case. It is
not that the frontend is bad — most of it is careful, and the wave-2 pass made
it truthful. It is that it is the accumulated surface of three different
businesses, and Kaizen now runs one.

`app/admin/page.js` is 2,431 lines: the single largest file in the repository,
and the place where both the Program Director and the founder do their work.

## What is actually in there

Three products' worth of frontend, and only one of them is sold.

**The club** — sold. `/`, `/tutoring`, `/pricing`, `/schedule`, `/diagnostic`,
`/family`, the `TutorClasses` console inside `/tutor`, the funnel board.

**The 1:1 marketplace** — cut (STRATEGY §11). `/tutors`, `/tutors/[slug]`,
`TutorDirectory`, `TutorProfile`, `TutorBooking`, `BookModal`, and the
earnings/availability half of `/tutor`. `/tutors` already fails closed on
`marketplace_enabled` and de-indexes itself; the code behind it is still
compiled, tested and maintained.

**The AI SaaS ladder** — free, with one upgrade. `/ai`, `AiLadder`, `/billing`
rendering five plan cards of which `forSale()` admits two, `/dashboard`,
`/settings`, `StudySession`, `PracticeSession`, `GradesView`, `StudyView`,
`CheckFlow`, `IntakeBox`, `TodayView`, `CalendarView`, `ProgressView`.

The AI is not a mistake and is not for deletion — it is the free top of the
funnel and it runs on the same trellis. But it is a *different product* wearing
the same chrome, and pretending otherwise is what produced a storefront where
half the h1 sold the free thing.

## Three generations of primitive, all still live

Each rebuild left sediment rather than replacing what came before:

| Generation | Where | What it introduced |
|---|---|---|
| 2026-08-12 weekly rhythm | `components/dn/` | `Shell`, `Thread`, `Exchange`, `Marquee`, `Reveal` — the day/night marketing chrome |
| 2026-08-22 one system | `components/ui/` | `Card`, `Button`, `Section`, `Eyebrow`, `Stat`, `Notice`, `Field`, `AppHeader` |
| 2026-09-02 wave 2 | `components/ui/` | `RoomCard`, `KindBadge`, `VenueLine`, `MasteryLine`, `EmptyState` |

`DropInSessions` is 867 lines and still hand-draws a room card that `RoomCard`
now owns. `Reveal` documents its own failure mode in a comment — it fails toward
visible, which is correct, and is also the sound of a component that has been
argued with. A fourth generation layered on top of these would be the mistake;
the point of a strip is that there is exactly one.

## The client-first architecture now serves only the free product

`lib/appState.js` (114 lines) and `lib/cloud.js` (209) are the localStorage
working copy and its debounced sync — row-level last-write-wins, no conflict
guard, documented in `/CLAUDE.md` as a deliberate trap. Three files import them:

```
app/dashboard/page.js   app/settings/page.js   components/TodayView.js
```

That is the whole blast radius. Every fact the *business* depends on — rooms,
cohorts, seats, evidence, money — is server-owned and always was. So the trap is
real but confined to the AI companion, where a stale device clobbering a course
list is an annoyance rather than a billing incident.

**This changes the recommendation.** The old instinct was "fix the sync". The
correct move is to leave it exactly where it is and never let it spread: the new
frontend reads the club from the server, every time, with no local working copy.

## What Wave 3 builds

Four surfaces, not twenty-four pages. Each one belongs to a person with a
question, and answers it above the fold.

| Surface | Whose | The question | Built from |
|---|---|---|---|
| **The storefront** | a parent who has not bought | *What is this, where is it, when does it meet, what does it cost?* | `publicCohorts`, `publicSchedule`, `clubPricing` |
| **The seat** (`/family`) | a parent who pays | *When and where is the next one, and what changed for my child?* | `mySeat`, `/api/family/summary`, `kc_estimate` |
| **The console** | the Program Director | *What is tonight, who is in it, and where do I write the ratings?* | `/api/tutoring/group?tutorView=1`, `group/brief?snapshot=1` |
| **The board** | the founder | *Is the funnel working, and where does it leak?* | `/api/admin/funnel`, `interestMix` |

The free AI companion keeps `/dashboard` and its own chrome. It is a fifth
surface and a separate product; it does not share a design language with the
club storefront and should stop trying to.

## What is preserved, and must not be touched

- **`lib/engine/`** (2,969 lines) — the trellis. The lattice, the estimator, the
  scheduler, the mastery law. This is the differentiation; it is adversarially
  reviewed (`docs/reviews/ENGINE_ADVERSARIAL_REVIEW.md`) and it is not in scope.
- **`lib/server/`** (6,130 lines) — pricing, entitlements, cohorts, series,
  occupancy, maintenance, waitlist, billing, Stripe, the model router,
  `roomTime`, `roomKinds`. Every line of it was earned twice, once by being
  written and once by the review that found what was wrong with it.
- **The 38 migrations.** Additive by rule. Nothing is stripped from a schema.
- **The CI guards** — `priceTruth`, `claims`, `legalMarkers`. A rebuild is
  exactly when a price gets retyped into a page; these are what stops it.
- **The mastery law** in every surface that renders progress: only unassisted,
  verified, delayed evidence confirms, and a parent's observation confirms
  nothing.

## What can go, and what only looks like it can

An honest delete list distinguishes the two.

**Genuinely dead — one caller, and that caller is a cut product:**

| Route | Called only by | Why it goes |
|---|---|---|
| `/api/tutoring/availability` | `/tutor`, `BookModal` | 1:1 booking |
| `/api/tutoring/directory` | `TutorDirectory`, `TutorProfile` | the marketplace |
| `/api/tutoring/tutors` | `/tutor`, `BookModal` | the marketplace |
| `/api/tutoring/reviews` | `TutorBooking` | reviews of 1:1 tutors |
| `/api/circle` | `/billing` | Study Circle, a retired legacy plan |

**Shared with the club — do not delete, however marketplace they look:**

| Route | Also called by | Note |
|---|---|---|
| `/api/tutoring/observe` | `app/api/tutoring/group/brief` | the club's observation write |
| `/api/tutoring/room` | `app/api/tutoring/group/room`, `lib/server/tutorSafety.js` | video for club rooms too |
| `/api/tutoring/recap` | `app/api/tutoring/brief` | cross-called |
| `/api/tutoring/sessions` | `TutorBooking`, `BookModal`, `/tutor`, `/tutors/[slug]` | 1:1 only *at the surface*, but it owns `introFree` and the private-credit rail that `/terms` still describes |

**A product decision, not a cleanup — put to the founder:**

*Voice.* `/api/voice`, `/api/voice/transcribe`, `/api/voice/realtime-token`,
`lib/useVoiceChat.js`, and the mic in `StudySession`. It is the only thing in
the repository that uses OpenAI. The AI ladder dropped its voice bullet because
`voice_enabled` is false in production — but `seed.sql` and `GO_LIVE.sql` both
seed it **`true`**, and `context.js` defaults it to `true` when there is no
service client. So a fresh environment ships voice on, selling nothing, spending
per call at a second vendor.

Either decision is defensible. What is not defensible is the current state,
where the seed and the storefront disagree. If voice stays, the ladder should
sell it; if it goes, an entire vendor, three routes and a dependency go with it.

## Sequence

Five stages. The rule at every one: **the business never goes dark.** The club
is fail-closed on `club_enabled`, so a half-built storefront must not become a
half-open shop.

1. **Settle the product questions** — voice in or out; the seed's
   `voice_enabled` corrected either way. Nothing else starts until this is
   answered, because it decides whether OpenAI stays a dependency.
2. **One generation of primitive.** Fold `dn/` and `ui/` into a single set;
   delete the hand-drawn cards in `DropInSessions`, `ScheduleBrowser` and
   `TutorClasses` in favour of `RoomCard`. This is subtractive and shippable on
   its own — no new surface, fewer lines, same behaviour, and the e2e smoke
   proves it.
3. **The console and the board.** Split `app/admin/page.js` (2,431 lines) along
   the seam that already exists in it: the Director's night and the founder's
   month are different jobs at different cadences and should not share a page,
   let alone a file.
4. **The storefront.** Clean-room, on `publicCohorts` + `publicSchedule` +
   `clubPricing`. Every claim carries a `CLAIMS_MATRIX` row before it renders,
   not after. This is where a rebuild historically retypes a price; `priceTruth`
   is the guard and it scans `app/` and `components/` including comments.
5. **Delete the marketplace.** Only after 2–4 are green, and only the five
   routes in the "genuinely dead" table plus the pages and components that call
   them. `/tutors/apply` **stays** — it recruits teachers for the club's own
   rooms and makes no offer to a family.

Stage 2 alone is worth doing whether or not the rest happens.

## The one thing that would make this a mistake

Rebuilding the frontend does not make Kaizen money. Eight seats break even
(`docs/UNIT_ECONOMICS.md`) and today there are none, no venue is signed, and
`legal/REVIEW_QUEUE.md` item 17 — seat cancellation and refund terms — still
gates taking a payment at all.

So Wave 3 is correctly sequenced **after** the founder actions in PR #30, not
instead of them. A smaller, cleaner frontend selling nothing is worth less than
the current one selling one seat. If the two compete for a week, the seat wins.

## Repo cleanup done alongside this plan (2026-09-03)

- `docs/` went from 57 files to 32 live plus a 25-file `docs/archive/` with a
  README saying what each was and what replaced it. The frozen
  `TECHNICAL_SOURCE_OF_TRUTH` → `ERRATA` → `HANDOFF` chain went with it: it
  claimed to be verified-against-live and reported 230 passing tests against
  today's 806.
- `docs/README.md` is new — question → document, and the precedence.
- The root `README.md` no longer advertises private 1:1 video or a tutor
  marketplace, and no longer names a price a code file owns.
- **Not done, needs a decision:** `legacy/` is 146 files and 1.2 MB with zero
  references from `web/`, `supabase/` or `docs/`, last touched 2026-07-22 at
  commit `0bec235`. It is the largest single cleanup available and it is
  recoverable from git history forever. `test-results/.last-run.json` is
  Playwright output that is tracked and should be ignored instead. Neither was
  removed here: file deletion was not permitted in the session that wrote this.
