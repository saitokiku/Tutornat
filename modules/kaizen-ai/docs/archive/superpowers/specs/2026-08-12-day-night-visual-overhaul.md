# The Gap & The Schedule — visual overhaul of the marketing surface

**Date:** 2026-08-12 · **Mode:** Redesign–Overhaul (founder: "you don't have to keep any
design elements unless you like it", "make it impressive and modern and anyone who lands
on it wants to stay") · **Dials:** VARIANCE 8 · MOTION 6 · DENSITY 3
**Keeps:** all copy claims discipline, the three-state law, all routes, all data plumbing
(clubPricing, publicSchedule, InterestForm capture), the KaizenMark. Everything else is new.

## 1 · The concept

The AI and the club are **two whole businesses with a bridge in the middle** (founder).
The split is by ROLE, never by time of day (founder: students should use the AI during
school too; it fills any gap, while the human does their job):

- **The Schedule** is the human business: real tutors, real appointments, operational
  precision. Visual world: paper-white surfaces, warm ink, times and prices set in mono.
- **The Gap** is the AI business: the companion that is simply always there, in class, in
  study hall, at the kitchen table, at 11pm. Visual world: warm-black (`coal`) surfaces
  with glowing accents; the universal visual language of a serious AI product.
- **The bridge** is the record and the parent: both businesses write to one record;
  parents see all of it. Each page gets exactly ONE deliberate theme transition (the
  taste-skill "color block story" exception); otherwise theme is locked per section run.

**The mission band (new, claims-safe):** most parents can't sit next to their student for
every assignment, and most students now have an AI that will just do the work for them.
Kaizen is the third option: help that is always there, never does the work for them, and
shows parents everything. (Backed by: Socratic prompt + hint gating, mastery law, weekly
reports, /family view, academic-integrity policy. Never phrase as "school-safe" or any
certification-shaped claim.)

## 2 · Tokens (ADDITIVE: app tokens untouched, app screens unaffected)

`paper #FCFBF9 · linen #F4F1EB · dayline #E8E3DA` (the human world) and
`coal #171412 · coal2 #211D1A · nightline #332D28 · ember #D96B8F · haze #C0A8D6` (the AI
world). Day accent stays `accent` #B4536F. No shadows in the coal world (light does the
work); day keeps warm `shadow-soft` only where elevation is real.

**Shape lock:** buttons = full pill · cards/panels = `rounded-[14px]` · inputs =
`rounded-[10px]`. Nothing else is rounded. No `rounded-3xl`, no `k-card`/`k-btn-*` on the
new surface (app keeps them).

## 3 · Type

- **Display:** Bricolage Grotesque (`--font-brand`, `font-brand`), hero 56–96px,
  `tracking-[-0.03em] leading-[0.98]`. Emphasis = same-family italic/weight only.
- **Body/UI:** Instrument Sans (`--font-body`, `font-body`), 15–17px.
- **Operational mono:** Spline Sans Mono (`--font-opmono`, `font-opmono`) for times,
  prices, stamps, schedule rows: the "precision" texture of the human business, and the
  "terminal" texture of the AI one.
- Fraunces/Plus Jakarta remain app-only. Marketing never uses `font-display`.

## 4 · Motion (`motion` package, installed)

Client leaves only; `useReducedMotion` collapses everything. Primitives live in
`components/dn/Reveal.js` (`Reveal`, `RevealGroup`) — pages use nothing else:
- Hero entrance stagger (60ms, y 24→0, `[0.16,1,0.3,1]`).
- `whileInView` reveals (once, 0.3) on section headers and grids.
- Hover: rows/cards lift `y:-3`; CTAs `active:scale-[0.98]`.
- Bridge bands are static gradients; no scroll hijack, no pinning anywhere.

## 5 · Chrome (`components/dn/Shell.js`, built)

Header `tone='day'|'night'`: KaizenMark + Bricolage wordmark, nav exactly
**Tutoring · AI companion · Pricing** + pill `Open Kaizen` (ink pill on day, ember on
night). **Schedule is out of the nav** (route stays; footer long-tail links it). Footer is
coal on every page: the AI world signs the site; mono link columns, kanji line, entity line.

## 6 · The bridge graphic (`components/dn/Thread.js`)

One horizontal composition: **scheduled anchors on a continuous thread.** A glowing
ember-to-haze line runs the full width (the companion, always on); the week's real
sessions sit on it as paper mono chips (the tutors, scheduled). Labels: left
`Always: the companion` on the line itself, right `Scheduled: real tutors` over the
chips. Below it, the operational week list (mono rows: `Tue 4:00 PM · topic · $14`,
one dot max per row) in live/held/empty states per the three-state law. Props:
`{ sessions, state, tone }`.

## 7 · Pages

### `/` home — the statement
1. **Split hero, the two businesses (full-bleed grid, stacks on mobile):**
   left `paper` panel: mono stamp `THE SCHEDULE`, display `Real tutors, on the
   schedule.`, sub ≤ 12 words, CTA `Explore tutoring`. Right `coal` panel: mono stamp
   `THE GAP`, display `An AI companion, in every gap.` (paper text, `ember` italic on
   "every gap"), sub ≤ 12 words (in class, at home, before the test), CTA `Start free`
   (ember pill). The two stamps are the page's entire eyebrow budget.
2. **Proof strip (day):** Thread with real/held/empty week + InterestForm inline when held.
3. **The mission band (the theme transition, paper→coal gradient):** display headline
   `Help that never does the work for them.` + the three-sentence mission (parents' gap,
   the cheating default, the third option) + one line: `Parents see all of it.` This is
   the bridge and the only inversion.
4. **The club, day-block leftovers move ABOVE the bridge:** section order is club (day) →
   bridge → AI (night) so the page literally travels from the human business through the
   record into the AI business. Club block: editorial split, oversized mono `$14` numeral
   as the visual, three tight lines (Hall/Clinic/1:1), membership math as 2-row mono
   table, CTA → /tutoring.
5. **The companion, night block (coal):** three contract lines with ember keywords (one
   question at a time · hints before answers · mastery only when they do it alone), the
   ladder teaser as three mono price lines (Free / $11.99 / $24.99 + the $13 nudge), CTA
   → /ai.
6. **Close (coal):** integrity one-liner + `Start free` + `Get first pick` pair. Footer.

### `/tutoring` — the human business (day page)
Hero: mono stamp `THE SCHEDULE` + display `Homework that gets done.` + sub ≤ 18 words +
held-state capture. **This week module** (absorbs the schedule tab): Thread + operational
rows + capture. Problem cards → borderless hairline-separated editorial rows (bold problem
sentence, one-line fix, mono price, state-aware link). Ladder + membership math: one
composition, oversized mono numerals. Parents/tutors: two text columns, no cards. Honesty
block: pull-quote treatment (display italic ≤ 3 lines). Single closing line bridges to
/ai. Footer (coal) ends it.

### `/ai` — the AI business (coal page, no mid-page inversions)
Hero: mono stamp `THE GAP`, display `A tutor, not an answer machine.` in paper, sub ≤ 16
words, `Start free` (ember) + `See plans` anchor. **Where it fits band:** three mono
moments (`In class`, `Homework at home`, `The night before the test`) each one line, no
times implied as limits. Teaching contract: four hairline rows, ember keywords. Ladder:
panels on `coal2`, ai_hall ringed ember `Most value` (AiLadder gains `tone="night"`).
One-record: three lines, haze accents, `Parents see all of it.` Bottom bridge: thin paper
band `When it's time for a human, you're already home. → Tutoring`.

### `/pricing` — the two businesses, priced
Day half first (`Every week: the club`): à-la-carte mono table, club tiers as three
columns with 72px mono numerals, Plus ringed `Our pick`, membership math kept. Bridge
strip (thin gradient): `And for every gap in between:`. Night half (`Every gap: the
companion`): AI ladder night-styled. Fine print on coal. All state-aware CTA logic
verbatim from main.

### `/schedule` — demoted, not deleted
Works exactly as on main (held storefront + live flip), restyled with day tokens + Shell.
No nav entry.

## 8 · What carries over untouched
Copy claims (all CI guards), three-state derivations, InterestForm/AiLadder logic and
endpoints, clubPricing + formatPrice, billing/app screens (zero visual change).

## 9 · Definition of done
Main plan's Task-14 gate PLUS: contrast audit both worlds (paper-on-coal ≥ 7:1 body,
ember-on-coal ≥ 4.5:1 at body size, ink-on-paper trivially fine); ONE theme transition
per page (footer excepted); motion honors reduced-motion; zero Fraunces / `k-card` /
`k-btn-*` / `rounded-3xl` on the five marketing pages; e2e updated to the new headlines;
screenshots desktop+mobile reviewed; no time-of-day framing anywhere in copy ("all
night" allowed only as one usage example among daytime ones, never as the AI's identity).
