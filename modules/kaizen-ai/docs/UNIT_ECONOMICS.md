# Unit economics — the seat, the director, and the gate

**2026-09-02.** One page of arithmetic that every seat-count target in
`docs/RELEASE_PLAN.md` derives from. Every input is a constant in
`web/lib/server/clubPricing.js`, so this document can go stale but the code
cannot: `SEAT_PLAN.seat.priceCents`, `STAFFING.directorHourlyCents`,
`STAFFING.directorHoursPerWeek`, `directorMonthlyCents()`.

This is a cost model. **No price on the sheet is derived from it** — we price
for the market (`docs/PRICING_EVIDENCE.md`), and the dial below is how we make
the cost fit the price rather than the other way round.

## The inputs

| | |
|---|---|
| Seat price | $550 a month |
| Program Director | $50 an hour × 15 hours a week ≈ $3,250 a month |
| Other fixed | ≈ $600 a month — insurance, software, hosting, phone. Borrowed space is $0 |
| Per seat, variable | ≈ $26 a month — card fees on $550, plus materials |

The director's hours are the whole labour line. Below the dial's ceiling, adding
a seat adds no delivery cost, because the cohort the seat joins is already being
taught. That is the shape of this business: **labour is fixed and capacity is
lumpy**, in steps of four.

## The curve

| Seats | Revenue | Costs | Owner profit | Margin |
|---|---|---|---|---|
| 4 | $2,200 | $3,954 | −$1,754 | — |
| 8 | $4,400 | $4,058 | $342 | 8% |
| 12 | $6,600 | $4,162 | $2,438 | 37% |
| **14** | **$7,700** | **$4,214** | **$3,486** | **45%** |
| 16 | $8,800 | $4,266 | $4,534 | 52% |

- **Breakeven: 8 seats** — two full cohorts.
- **The cash-cow gate passes at 14 seats.** Owner profit ≥ $3,000 and margin
  ≥ 25% both clear there; at 13 seats profit is about $2,962 and misses by less
  than the price of one seat. Fourteen is the number.
- **16 seats is the director's ceiling** at 15 hours a week
  (`docs/hiring/PROGRAM_DIRECTOR.md` §4). Two decisions land together there:
  raise the dial or hire tutor #2, and — separately — the lease question, which
  STRATEGY §5.1 already gates at 16 committed seats.

## What the early months cost

The first cohort loses money and is supposed to. At 4 seats the burn is about
$1,750 a month; it closes as the second cohort fills and turns positive at 8.
Cumulative burn to breakeven is roughly $5–7k depending on how fast the seats
sell. The founder has accepted that ("don't worry about this initial cash burn
too much", 2026-09-02); it is recorded here so it is a decision rather than a
surprise.

The dial is the release valve. Fifteen hours a week is not a floor: if the first
cohort is slow, fewer hours costs less, and the arithmetic above rescales
linearly with `STAFFING.directorHoursPerWeek`.

## What is deliberately not in here

- **Drop-in revenue.** Hall, Clinic and the diagnostic all contribute, and none
  of it is counted above. They are the funnel; the seat is the business. Any
  plan that needs drop-in revenue to clear the gate is a plan that has stopped
  selling seats.
- **The rails.** TEFA and 529 change who pays, never what is paid. Direct pay
  stays at or above 40% of revenue as a rule (STRATEGY §5.2).
- **A lease.** Zero until 16 committed seats, by rule.
- **Founder pay.** The gate measures owner profit, and the founder teaches zero
  sessions. If the founder ever has to deliver, the model is broken, not the
  spreadsheet.
