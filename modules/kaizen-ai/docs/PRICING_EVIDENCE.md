# Pricing evidence — the Austin market read behind the price sheet

**2026-09-02.** The founder's instruction was "price for the market", not for our
costs. This is the record of what the market said, what we decided, and — most
importantly — how much of it we are actually allowed to repeat out loud.

`web/lib/server/clubPricing.js` remains the only price truth. This file explains
the numbers in it; it never sets them.

---

## Read this before you quote anything here

**Not one competitor figure below was read first-hand.** The research ran behind
a network egress proxy that blocked every provider domain — sylvanlearning.com,
mathnasium.com, kumon.com, huntingtonhelps.com, the marketplaces, the review
aggregators, all of them. Every number reached us through a search tool's
summary of a page nobody could open.

An adversarial verification pass then tried to confirm the twelve figures the
decision leaned on hardest. **It refuted all twelve** — not because they are
wrong, but because they could not be confirmed, and an unconfirmable price
defaults to refuted. It killed the strongest single anchor the research rested
on: Sylvan of Austin South's supposed $456/month two-a-week rate card.

So:

- **Nothing in this file may enter `docs/CLAIMS_MATRIX.md`, the storefront, a
  sales deck, or a sentence the Program Director says to a parent** until it is
  re-read in a browser or confirmed by telephone.
- Treat every figure as *directional*. The bands are probably right. Any
  individual number probably is not.
- Our own prices are unaffected by that caveat — they are ours, they are in
  code, and they are pinned by CI.

**Founder action, before the pricing page ships:** call seven Austin providers
as a parent and write the answers into this file with the date and the person
you spoke to. Mathnasium (the pressure point — no Austin figure exists at all),
Sylvan Austin South, Huntington Bee Cave, Kumon, Best in Class, Tutor Doctor,
Pace Austin. One afternoon of phone calls is worth more than everything below.

---

## What we decided

| | Was | Now | Why |
|---|---|---|---|
| Standing seat | $550/mo | **$550/mo** — hold | Sits in the upper half of the Austin band for taught group instruction, below every 1:1 rate, above every worksheet franchise |
| Placement diagnostic | $59 | **$59** — hold, and credit it in full against the first month | Inside the transacted Austin band for a branded assessment; the credit answers the free-assessment competition without making our front door free |
| Homework Hall | $14 | **$14** — hold | Supervision, priced so it requires no deliberation |
| Subject Clinic | $20 | **$30** — raised | See below. This is the one change, and the reason is internal |
| Max AI upgrade | $11.99 | **$11.99** — hold, unbenchmarked | An upgrade on a free product, not a second buying decision |

### The seat holds at $550

At 2 × 75 minutes a week the seat is 8.67 sessions and 10.83 instructional
hours a month: **$50.77 per instructional hour per student**, $63.44 a session.
That is the number to argue about, not $550.

*Two per-session figures exist and both are honest.* $63.44 divides by the
8.67 sessions a fortnightly-into-monthly calendar actually produces; the
storefront divides by the 9 the seat is **metered** at (`includedSeatMonthly`),
which gives $61.11. The product surfaces use the metered figure because that is
what a family can actually turn up to, and quoting the flattering one on a
pricing page would be quoting a session we do not owe them. The comparisons
below use the calendar figure, because a competitor's rate card is compared
against delivery, not against an allowance.

Austin's reported band for *teacher-led group* instruction runs roughly
$40–55 an hour. Posted 1:1 rates for experienced or credentialed Austin tutors
run roughly $75–125 an hour, which buys $812–1,354 of the same dose. The
college-student floor is about $45 an hour — $487 for the same dose from an
undergraduate with no licence.

So a licensed teacher at 1:4 prices below a licensed teacher at 1:1, above every
worksheet franchise, and about level on the hour with a certified-teacher
franchise while beating it on dose and on reservation. The defensible band is
**$495–595**. Below it, $495 buys nothing strategic: it does not reach the
drill-centre tier and it forfeits about $660 a year per seat. Above $600 a
parent starts comparing against private 1:1, which is a comparison we win on
price but lose on simplicity.

One more reason to hold rather than discount: there is no annual-prepay lever
and no discount ladder, because one price for cash, 529 and TEFA payers is a
rule (STRATEGY §5.1). The sticker carries the whole book. A time-boxed founding
rate is easy to run later; raising a published price is not.

### The Subject Clinic goes to $30

This is the only price that moved, and the argument is internal rather than
competitive. A taught 1:6 clinic at $20 is about $16 per instructional hour
against the seat's $50.77. Two clinics a week came to about $173 a month —
a 1:6 version of the standing seat for a third of its price. The drop-in was
quietly answering the question the seat exists to answer.

At $30 the ladder reads the way the product actually works:

| | Ratio | What it is | Price |
|---|---|---|---|
| Homework Hall | 1:8 | supervised study, not tutoring | $14 |
| Subject Clinic | 1:6 | taught, drop-in | $30 |
| Standing seat | 1:4 | taught, reserved, named lead teacher, twice a week | $61.11 a session as metered |

Roughly a doubling at each step, and the clinic is still well under half of
every reported Austin rate for taught group instruction. If a taster is wanted,
make a family's *first* clinic $20 once, rather than pricing every clinic as a
taster.

### The diagnostic stays charged, and gets credited

Every franchise a parent would shortlist gives the assessment away — Mathnasium,
Kumon, Eye Level, JEI, Varsity Tutors, Tutor Doctor all report $0 and monetise
at enrolment instead. Sylvan and Huntington do the opposite: a high list price
that is essentially never charged, transacting around $49–77 in Austin.

We charge, for three reasons. It is real credentialed-teacher time producing a
written plan, not a sales appointment. A free front door sets the wrong tier for
a $550 product. And it qualifies demand for genuinely scarce inventory — a
four-seat room cannot absorb tyre-kickers.

$59 sits a notch above the loss-leader promotions and far below every real
assessment in the category. There is headroom to $99 later, once there are
results to point at. **Do not raise it before launch**; the top of the funnel is
the wrong place to be brave for an unknown brand.

The credit — full value against the first month for a family that takes a seat
within 30 days — is in code as `DIAGNOSTIC.creditsTowardFirstMonth` and
`creditWindowDays`, because a promise in copy that no code enforces is how a
claim becomes a lie. It is a credit against a purchase, not a discount off the
seat, so one-price holds.

---

## The Austin ladder, as far as we can see it

Four bands, and the seat lands in the gap between two of them — which is a good
place to be, because it means no direct budget twin.

| Band | Monthly | Who is in the room | Reported examples |
|---|---|---|---|
| After-school care with academic support | $0–375 | licensed childcare staff, teaching artists | Boys & Girls Clubs, PARD, Creative Action ~$348 |
| After-school academic enrichment | $150–450 | franchise instructor, worksheets or a centre floor | Kumon, Mathnasium, AoPS Academy, Russian School of Mathematics |
| **The seat** | **$550** | **a credentialed teacher, 1:4, reserved** | **no direct Austin twin found** |
| Part-time microschool / hybrid | $500–1,200 | a full teaching programme, 1–3 days a week | Austin Micro School's $500 / $900 / $1,200 ladder |
| Full-time microschool | $1,160–1,800 | school replacement | Acton, Austin Rising, Alpha at $3,333 |

## What the payer can actually spend

- **529.** A year of seats fits inside the federal K-12 distribution cap with
  room to spare, so the cap does not bind at any price in the band. The
  constraint worth checking is *eligibility*: the 2025 federal change extends
  qualified K-12 expenses to tutoring by a licensed or credentialed teacher,
  delivered outside the home, by someone unrelated to the student. If that holds
  as written, the credentialed-teacher spec is not merely the price
  justification — it is what makes the seat 529-payable, and a strong reason
  never to staff a seat with an uncredentialed lead. It is review-queue item 25,
  and **no public copy may state or imply tax treatment** until counsel clears it.
- **TEFA private-school tier (~$10.5k/yr).** Covers a full year of a seat with
  room left. That family does not feel $550 versus $495 at all. Competitors are
  already in the vendor queue; getting listed will move more seats than any price
  cut on this sheet.
- **TEFA homeschool tier (~$2k/yr).** Funds about 3.6 months of a seat. For
  Kaizen Home families the honest answer is the ladder — Hall, Clinic, the free
  Community Hall, the free AI — not a second seat price. Design for that being a
  good outcome rather than a lost sale.
- **Austin capacity.** Metro median household income is around $100k; the
  high-income attendance zones the seat is aimed at run $120–195k.

## What would make this wrong

1. **The evidence quality above all.** See the warning at the top.
2. **No Austin franchise monthly price is confirmed.** If mystery-shopping
   returns Mathnasium Austin at $350 and Sylvan Austin at $450, then $550 is a
   22–57% premium on the monthly line and the credentialed-teacher argument has
   to carry all of it alone.
3. **Nobody in Austin sells this product**, so there is no observed willingness
   to pay. The band is arithmetic — hourly group rates converted to a
   10.83-hour dose — not a demonstrated monthly price point.
4. **The confirmed group rates are mostly test prep**, which is the ceiling
   category. If the first seats are Algebra I or Biology, the parent's anchor
   drops and $50.77 sits at the top of it rather than the middle. That argues
   against any increase before there is evidence of results.
5. **The 40–60%-of-private convention cuts against us.** Run backwards,
   $50.77/hr implies an $85–127/hr underlying 1:1 rate. Pre-empt that arithmetic
   in the copy rather than leaving it to a parent's calculator.
6. **Do not sell the ratio.** 1:4 is looser than Sylvan's published 1:3 maximum.
   Sell the reservation, the named teacher, the twice-a-week rhythm and the
   record — never "smaller groups than the other guys".

## Method, for the next person who redoes this

Five parallel research lanes (national franchises in Austin; Austin independents
and 1:1; pods, microschools and after-school; assessment pricing and consumer AI
study tools; payer capacity from TEFA, 529 and census data), 151 comparables
collected, the twelve most decisive put through an adversarial verifier
instructed to default to refuted, then one synthesis. The verifier is the reason
this file leads with a warning instead of a table.
