# Year-one scenarios — worst cases, the minimum goal, and the money

> **Superseded 2026-09-02.** This simulation is priced on the retired
> memberships. The seat economics that replace it are in `docs/STRATEGY.md`
> §5.1. Re-run `financial_scenarios_sim.py` against `SEAT_PLAN` before quoting
> any figure here.

Output of `docs/financial_scenarios_sim.py` (run it: `python3 docs/financial_scenarios_sim.py`).
Monthly cohort model priced from `web/lib/server/clubPricing.js` **as of
2026-08-13 — the 2026-08-12 repricing generation; the price file is the truth,
update sim and doc together** (Hall $14 · Clinics $30 · 1:1 $35/$60 ·
memberships $45/$79/$109 with 4/8/12 included visits · member overage Hall
$9/$8/$7 · member Clinics $16/$14/$12 · member 1:1 $50/$47/$44 · tutor pay
flat $22–30/hr, $25 default · Stripe fees · AI token COGS · ~$370/mo fixed
incl. insurance · free community hall at capacity 16 = **two** staff,
~$240/mo). School year Sep→Aug with seasonality (Dec dip, spring bump, summer
cliff). Monte Carlo n=500 jitters conversion, churn, and fill.
**Founder salary: $0 throughout.**

## The four scenarios (medians; p10–p90 where it matters)

| | A. Worst, undisciplined | B. Worst, disciplined | C. Minimum goal | D. Base (plan works) |
|---|---|---|---|---|
| Demand | 6 new families/mo, 25% ever pay | same as A | 14/mo, 45% pay | 20/mo +8%/mo, 50% pay |
| Member churn | 30%/mo | 30%/mo | 12%/mo | 8%/mo |
| Scheduling | full Mon–Thu grid staffed regardless | rooms sized to seats | rooms sized to seats | rooms sized to seats |
| Members @ month 12 | ~0.4 | ~0.4 | **~10–13** | **~40** |
| Peak MRR | $68 | $68 | ~$1,010 | ~$3,230 |
| Year revenue | ~$3.1k | ~$3.1k | **~$15.8k** (14.6–16.9k) | **~$38k** (35–40k) |
| Year net | **−$27.9k** | **−$6.7k** | **+$1.1k** (+0.4 to +1.7k) | **+$13.8k** (12.4–15.3k) |
| Worst single month | −$2.4k | −$0.65k | −$0.35k | ≈ $0 |
| Reaches a profitable month | never | never | 100% of runs (wobbles positive Nov–Feb, solid from March) | 100% of runs (≈October) |

## The five takeaways

1. **The worst case is a choice between −$28k and −$7k, and the difference is
   one discipline.** Same dead demand in A and B; the only change is whether
   the Mon–Thu 4/5/6/7 grid gets staffed regardless of bookings. Staffing
   empty rooms burns ~$2.4k/mo; sizing rooms to seats bounds the entire
   worst year at roughly a used-car loss (~$6.7k, ~$550/mo). The
   seats-per-tutor-hour number on the admin dashboard is worth ~$21k/yr in
   the bad world. (True floor: scenario B still anchors a weekly paid hall
   slot plus the free community hall; frozen at free-hall-only, burn is
   ≈$600/mo — $370 fixed + ~$240 two-staff hall — before any trickle revenue.
   In a genuine death spiral the community room can drop to one staff and
   capacity 8, taking the floor to ~$490/mo.)

2. **The business cannot die suddenly — only slowly, by staffing hope.**
   Almost every cost is variable (tutors are paid per session that runs);
   fixed costs are ~$370/mo plus ~$240 of free-hall staffing — the
   capacity-16 community room takes two staff at 8 students per staff, and
   that second tutor is a deliberate product commitment, now the
   second-largest quasi-fixed line. There is no rent, no salaries, no
   inventory. The only way to lose five figures is to schedule supply that
   demand hasn't asked for.

3. **The minimum goal is embarrassingly small — and that's the point.**
   Cash breakeven needs roughly **a dozen member families** (mix of
   Club/Plus/Max) plus their à-la-carte and 1:1 halo. Concretely: hold
   **~12 members and ~$1.7–2k/mo of total revenue by March** and the year
   ends ~$1k cash-positive. That's ~30 families ever trying us and ~2 in
   5 sticking. If that bar can't be cleared in one school year with the free
   hall running weekly, the market is telling us something — stop or pivot,
   don't scale the burn.

4. **"What kind of money would we generate?" — honestly:** year one is a
   **$3k–$40k revenue business** depending entirely on execution band, with
   net between **−$28k (undisciplined flop) and +$14k (plan works, founder
   unpaid)**. The base case is ~$38k revenue / ~$14k net on ~40 members —
   grocery money, not a salary. Year one buys proof, not income.

5. **The salary line is year two.** Straight arithmetic (not simulated): at
   ~100 members on the same mix, MRR ≈ $7.8k; with the à-la-carte/1:1/clinic
   halo at observed ratios ≈ **$10–11k/mo (~$120–130k/yr) at ~40–45% net
   margin** — a real founder salary — reachable by doubling the base-case
   funnel once (two school feeder communities instead of one), not by a
   miracle. The B2B seat-block motion (month 2+ in WHAT_WE_SELL.md) is the
   accelerant, not the plan.

## What the 2026-08-12 repricing changes (watch items)

- **Effective per-included-visit price:** Club $11.25 ($45/4), Plus **$9.88**
  ($79/8), Max **$9.08** ($109/12). At disciplined fill (~5.5 seats/room) a
  seat costs ~$4.95 to deliver, so every included visit is gross-positive
  even on Max — but Max is the thinnest tier; watch actual utilization, not
  just seat prices.
- **Member 1:1 is the thinnest line in the book.** Max-tier 1:1 is $44/hr
  against tutor pay of up to $30/hr: **$14/hr gross**, ~$12 after video
  (~$0.60) and Stripe (~$1.60). Pairing top-band ($30) tutors with Max-tier
  1:1 demand is the specific margin watch item.
- **Retail Hall breakeven is ~2 seats:** 2 × $14 = $28 against ~$27.20/hr
  room cost (tutor $25 + video). The 3-seat kill rule below keeps one seat
  of margin over breakeven.
- **The free hall doubled in cost:** capacity-16 with two staff (8 students
  per cleared staff, `communityCapacity()`), ~$240/mo vs ~$120 single-staff.
  It is a permanent product, carried in every scenario including the worst
  cases — which is why A and B each end ~$1k worse than under the previous
  price generation despite higher revenue everywhere else.

## Modeled vs assumed

Modeled: membership MRR at a 20/60/20 Club/Plus/Max mix; included-visit
utilization; member overage and à-la-carte halls; clinics; 1:1 (member
sessions priced at the blended 60-min rate); tutor pay per session actually
run; the two-staff free community hall; first-session-free cost; Stripe;
AI token COGS; seasonality; Monte Carlo jitter on conversion, churn, fill.

Assumed, not evidence: the 20/60/20 plan mix, the conversion/churn bands,
and the fill targets. Not modeled at all: AI-ladder subscription revenue
(AI Solo $11.99 / AI + Hall $24.99 launched 2026-08-12 — no volume evidence
yet, so free-tier AI riders appear only as COGS); grace-visit courtesies;
waitlist and standing-booking dynamics; B2B seat blocks; any founder salary.

## Guardrails this implies (wire into the weekly review)

- **Kill rule:** any recurring slot below 3 seats for 2 consecutive weeks is
  merged or cancelled. No sentiment. (This is takeaway 1 as a habit; retail
  breakeven is 2 seats, so 3 is the floor with margin.)
- **Stop-loss:** if by February the club holds <6 members and first→second
  conversion <30%, freeze the schedule at free-hall-only (~$600/mo burn at
  two staff; ~$490 if the community room drops to one staff and capacity 8)
  and re-examine positioning before spending another founder-month.
- **Green light:** ≥12 members + first→second ≥40% by March = the minimum
  goal is met; recruit the second tutor wave and open the PTA conversations.
- Assumption most worth watching: **30%/mo churn is the worst-case killer**
  (at 30%, even great acquisition just refills a leaking bucket). The parent
  summary email + exit-summary loop exists precisely to keep churn nearer
  8–12%.
