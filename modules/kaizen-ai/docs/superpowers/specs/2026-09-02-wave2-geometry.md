# Wave 2 — the product takes the shape of the business

**2026-09-02. The design spec.** Its evidence is
`2026-09-02-wave2-audit.md`; its authority is `docs/STRATEGY.md` v0.2 and
`CLAUDE.md`. Where this file and the canon disagree, the canon wins.

## The design read

*An in-person academic club in Austin, for the parent who has to decide whether
to hand over $550 a month and drive there on Thursday — with a working console
for the one person who runs the room, and a weekly board for the one person who
owns the funnel. The language stays what it is: warm paper, ink, one rose
accent, a display face for argument and a mono face for facts. What changes is
what the system has words for.*

This is a **redesign-preserve**, not an overhaul. The token layer, the price
discipline and the documented primitives are better than what would replace
them. Nothing about the framework, the palette, the type scale, the engine or
the sync changes. What changes is the furniture, because it is arranged for a
business that no longer exists.

## The spine

One loop, and every surface serves a step of it. A surface that serves none of
these steps does not earn its place.

```
  diagnostic  →  placement      →  enrolment   →  the room    →  exit ratings
   ($59)         (baseline         (a cohort,     (2 x 75 min,   (per concept,
                  evidence)         a seat)        1:4)           by a person)
                                                                      ↓
  renewal     ←  the parent     ←  confirmed    ←  delayed      ←  evidence
                  sees it          mastery         check
```

The audit's headline finding is that this loop is **cut at both ends**: the
write that produces evidence from a room has no user interface, and the mastery
it produces has no path to the parent. Everything else in this spec is
downstream of joining those two ends.

## The three nouns

The product needs three objects it does not have. This is the whole backend of
Wave 2.

### 1. The cohort — new (migration 0038)

A seat is **2 sessions a week**. A series is **one weekday**. So today a seat is
two unrelated series and two unrelated enrolments, and the parent's own page
renders her one purchase as two rows with two one-way delete buttons.

A `cohort` is the thing a family actually buys into: a subject, a venue, a lead
tutor, a capacity, and the two-or-more weekly series that make it up.

```
cohort            id, title, subject, venue, timezone, lead_tutor_id,
                  capacity, grade_band, active, created_at
group_session_series.cohort_id  → cohort(id)   (nullable; drop-ins have none)
```

Additive, nullable, and invisible to every existing drop-in path. It gives every
surface one object to render and the founder one thing to count. `capacity`
lives on the cohort because "4 students" is a property of the group, not of a
Tuesday.

### 2. The room, in its own timezone — fix, not new

`group_session` already carries `venue` (0033) and `timezone`. Two lines of
plumbing make them reachable:

- `publicSchedule` selects `venue` and returns it on the sanitized row.
- One pure helper, `lib/roomTime.js`, formats an instant **in the room's own
  zone** and is the only formatter any surface may use for a room. Pure, so it
  is unit-tested against the DST weeks the way `series.js` already is.

A room's time rendered in the reader's timezone is a wrong answer for a business
whose product is being somewhere.

### 3. The record, with both ends attached — fix, not new

- **Input:** the Director's exit-rating screen, calling the finished
  `POST /api/tutoring/group/brief`.
- **Output:** `familySummary`'s `mastery` block, rendered on `/family` as the
  lead.

No new tables. The evidence spine (0034) is correct and stays untouched.

---

## The information architecture

### Navigation, which is where the old geometry is written down

Four auditors each proposed re-weighting their own page's AI content. That will
not hold while the site map says the AI is one of three things Kaizen does. Fix
the nav and the pages stop drifting back.

| | Now | Wave 2 |
|---|---|---|
| Public nav | Tutoring · AI companion · Pricing · **Open Kaizen** | The club · Schedule · Pricing · **Start with a diagnostic** |
| Signed-in parent | *(nothing)* | **Your seat** → `/family` |
| Footer product col | …Find a tutor · Become a tutor | *(both removed — cut products)* |

`/ai` survives as a real page, linked from `/tutoring` and `/pricing`. It stops
being one of three primary destinations, because it is not one of three things
this business sells.

### Surface by surface

| Surface | Becomes |
|---|---|
| `/` | The club, in Austin. Hero states the seat, the city and the two evenings; the primary action is the diagnostic. AI compresses to one block after the record. |
| `/tutoring` | Unchanged in argument — it is the best thing in the product. Gains: real cohorts with venue and day, correct times, an absence policy, per-kind interest capture. Loses: the tutor-recruiting block. |
| `/pricing` | Loses the unbuyable featured tier and the voice claim. The diagnostic leads the a la carte list. |
| `/diagnostic` | Wears the storefront shell, not the app shell. Gains a child selector, a capture form for the held state, and a report the payer can actually read. |
| `/schedule` | Gains a cohort rail: seats are *reserved*, not *hidden*. Loses the retired-membership footnote and the eight filters over an empty board. |
| `/tutors`, `/tutors/[slug]` | **Unlinked from the storefront** and gated behind `marketplace_enabled`. A directory of bookable 1:1 tutors is a Wave 2 product; today it advertises three cut things. |
| `/dashboard` | Gains a seat block at the top of Today: next session, venue, tutor, and what was confirmed. Growth tab loses the 1:1 ad. `growthTip` and a parent's `focus` finally render. |
| `/family` | **Rebuilt.** The seat, then the record, then the supporting lines. Loses membership vocabulary, 1:1, free trials, and GPA-as-headline. |
| `/tutor` | **Reordered around the room.** Tonight first; the exit-rating flow becomes the surface's reason to exist. |
| `/admin` | Gains a "Tonight" panel and `seat` in the grant picker; panels reorder by how often the Director needs them; kill switches stop lying. |
| `/admin/funnel` | Gains stage-to-stage conversion, which is what makes it a funnel rather than seven counters. |

---

## The visual decisions

Only three, because the system is sound.

**1. Mono means "a fact you could check."** Today `font-opmono` carries prices.
Extend it, deliberately, to every operational fact: times, dates, capacities,
counts, "4 of 11 confirmed", "2 places left". Display face argues; mono states.
This is what gives a club-shaped product its texture, and it costs nothing
because the face is already loaded.

**2. On every surface, the room outranks the price — and once a family is
enrolled, the record outranks both.** The parent's question order is *when and
where* → *what changed* → *what it costs*. Today `/family` leads with a $14
drop-in button and buries the seat in 12px grey. Invert it.

**3. Cards are for objects, not for lists.** A room, a cohort, a child, an order
— those are objects and keep their card. Rows of facts lose the card and take a
hairline, per the system's own doctrine. The audit found four different answers
to "a stat in a box" in one file; there will be one.

### New primitives (`components/ui/`)

`KindBadge` (the kind→label→colour map is currently retyped in **eight** places
with three labels for the same room), `RoomCard`, `VenueLine`, `MasteryLine`,
`EmptyState` and `Skeleton` (each currently defined twice, locally, differently).
`Dialog` is specified but deferred — eleven hand-rolled overlays need a focus
trap and that is its own change, tracked as follow-up rather than smuggled in
here.

---

## What gets deleted

- Every offer of **private 1:1**: `/family`'s "Book 1:1" and "first session is
  on us", `/dashboard`'s Growth-tab video block, `/tutors` card prices,
  `/tutors/[slug]`'s booking action, the exit form's `private` recommendation.
- Every offer of a **retired membership**: `/family`'s Plus block and month
  card, `ScheduleBrowser`'s member-pricing footnote, `/admin`'s tier counts.
- The **voice** claim on `/pricing` and `/ai` (`voice_enabled = false`).
- **AI + Hall as the featured tier.** It stays disclosed — `SALE_STATUS` says
  `active`, unwired, and that is the founder's call — but the page's "Our pick",
  its raised surface and its primary button move to what a family can buy.
- The **tutor-recruiting block** on the parent's seat page.
- The **free-tutor-directory links** in the public footer.
- The landing page's **second AI section and its price ladder** (both belong on
  `/ai`).

## What explicitly does not change

The palette, the type scale, the radius scale, `Reveal`'s entrance rule, the
engine's scheduler and estimator, the last-write-wins sync, the retirement of
the memberships, the cutting of 1:1, the AI staying free with one upgrade, and
seat rooms staying unpurchasable on the public board.

---

## Build order

Backend first where the frontend depends on it. Each stage is independently
shippable and green.

**Stage 1 — the spine.** Migration 0038 (`cohort`, `series.cohort_id`);
`lib/roomTime.js`; `venue` through `publicSchedule`; `lib/server/cohorts.js`
with `publicCohorts()` and `mySeat(userId)`; the `club_interest.kind` enum in
one place.

**Stage 2 — the loop's two ends.** The Director's exit-rating flow on `/tutor`
(drafts that survive an interruption, one student at a time, calling the
finished endpoint); `/family` rebuilt to lead on the seat and the record.

**Stage 3 — truth.** Delete every cut and retired offer listed above; fix the
seat welcome email; one `notConfigured` vocabulary; `seat` in the grant picker;
`toggle()` stops lying.

**Stage 4 — the storefront's geometry.** Nav; the landing page re-weighted with
Austin and the diagnostic; cohorts on `/schedule` and `/tutoring`; the absence
policy; `/diagnostic` in the storefront shell.

**Stage 5 — the consoles.** `/admin` Tonight panel and panel order; funnel
conversion rates.

**Definition of done.** A parent can find the club, see when and where it meets,
buy a diagnostic, and afterwards see what her child has actually demonstrated.
The Director can run tonight's room and write its ratings in under two minutes
on a phone. The founder can see where the funnel leaks. Every check green.
