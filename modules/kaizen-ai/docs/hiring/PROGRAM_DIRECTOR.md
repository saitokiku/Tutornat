# Program Director — the deal, the week, and the dial

**Founder decision, 2026-09-02.** Kaizen Local's first hire is one person doing
three jobs: the credentialed tutor who delivers the seat sessions, the operator
who runs the room, and the person who sells. Hourly, part time, no profit share.

This document supersedes `docs/hiring/CLUB_DIRECTOR_JD.md`,
`../archive/hiring/CLUB_DIRECTOR_COMP.md` and `../archive/hiring/CLUB_DIRECTOR_INTERVIEW_MANUAL.md` on the *deal*
(they describe a profit-share founding-partner package that is not what was
hired). Their interview bank and scoring rubric are still the best material we
have and stay in use.

## 1. The deal

| | |
|---|---|
| Rate | $50/hour |
| Hours | 15 hours a week, set by the founder, reviewed monthly |
| Monthly cost to Kaizen | ~$3,250 (50 × 15 × 52 ÷ 12) |
| Profit share | none |
| Term | at-will, reviewed at 30 days against the scoreboard in §5 |

The rate lives in code as `STAFFING.directorHourlyCents` and the hours as
`STAFFING.directorHoursPerWeek` in `web/lib/server/clubPricing.js`. Every
margin figure in `docs/RELEASE_PLAN.md` derives from those two numbers — change
them there, not in prose.

The same $50/hr is what the director is paid *as a tutor* for the sessions they
deliver: set `pay_rate_cents = 5000` on their `tutors` row (Admin → Tutors).
The band is $22–50 (migration 0035); $50 is the ceiling and is reserved for
this role.

**This is a cost, not a price.** Nothing quoted to a family is derived from what
the director is paid. We price for the market (STRATEGY §5.1); the dial in §4 is
how we make the cost fit.

## 2. Classification — unresolved, and it matters

A worker paid hourly, whose hours and schedule we set, who uses our systems,
teaches our curriculum to our students in a room we arrange, and who represents
Kaizen to parents, is very likely an **employee (W-2)**, not an independent
contractor, under both the IRS common-law test and the Texas Workforce
Commission's 20-factor test. Calling them a contractor because it is easier to
pay is the single most common small-business misclassification, and the penalty
lands on the company.

Open items, both flagged as **review-queue item 24**:
- W-2 or 1099 — counsel decides, not us.
- If W-2: TWC unemployment-tax registration, payroll withholding, Texas
  workers' compensation (elective in Texas, but declining it has consequences),
  and an offer letter.

Until item 24 clears, do not put a classification in writing to the director.
Pay for hours worked, keep the timesheet, and let counsel paper it.

## 3. What the director owns, and what the founder owns

**The director owns delivery and the room.**
- Every seat session: taught by them, notes and per-student exit ratings in the
  console the same evening.
- The roster: the second tutor when we get there, scheduling, coverage.
- Selling: school and co-op conversations, diagnostics, the enrolment call, the
  first-month check-in with each family.
- Safety in the room: sign-in, sign-out, incident reports.

**The founder owns the product, the funnel and the books.**
- The software, the price sheet, the claims, the legal queue.
- The funnel dashboard and its instrumentation — measuring the director's work
  is the founder's job, not the director's homework.
- Every dollar decision.

**Nobody owns "grades".** We do not promise outcomes; the mastery law
(`docs/ENGINE.md`) says what counts as evidence, and a tutor's observation is
not confirmation on its own.

## 4. The dial — what 15 hours a week buys

One seat cohort = 4 students × 2 sessions a week × 75 minutes = **2.5 delivery
hours a week**, plus about half an hour of notes and prep. Call it 3.0 loaded
hours per cohort per week.

| Cohorts | Seats (max) | Delivery + prep | Left for selling and admin |
|---|---|---|---|
| 1 | 4 | 3.0 h | 12.0 h |
| 2 | 8 | 6.0 h | 9.0 h |
| 3 | 12 | 9.0 h | 6.0 h |
| 4 | 16 | 12.0 h | 3.0 h |

**15 hours a week caps out at 16 seats.** At four cohorts the director has three
hours a week left, which is not enough to keep selling — so the decision at
**12 committed seats** is: raise the dial to 20–25 hours, or hire tutor #2 at
the certified default ($40/hr) and keep the director selling. Take that decision
before the fourth cohort fills, not after.

Labour cost per seat falls the whole way down that table: at 4 seats the
director costs about $813 a seat a month, at 8 about $406, at 12 about $271, at
16 about $203. That curve, not the price, is what makes the early months cost
money — which the founder has accepted (2026-09-02: "don't worry about this
initial cash burn too much").

## 5. The scoreboard — reviewed weekly, with the founder

The director is measured on five things. Everything else is noise.

| Metric | Where it comes from |
|---|---|
| Committed seats | Admin → Funnel |
| Seat sessions delivered ÷ scheduled | Admin → Classes |
| Average students per seat room (target 4; below 3 loses money) | Admin → Funnel |
| Diagnostics delivered → seats converted | Admin → Funnel |
| Exit ratings written the same evening ÷ sessions delivered | Admin → Funnel |

The last row is the one that is easy to skip and expensive to lose: it is the
only thing that turns a delivered session into evidence in the ledger, and the
evidence is the product's whole differentiator.

## 6. Onboarding checklist

1. Offer paper, once item 24 clears. Timesheet from day one either way.
2. `tutors` row: `credential_kind`, `credential_state`, `credential_ref`,
   `credential_verified_at`; `fingerprinted_at` once done (a payment rail
   requires it; we never claim a background check — review-queue item 6).
3. `pay_rate_cents = 5000`.
4. Admin access. Walk them through Classes, the seat series, exit ratings and
   the funnel board.
5. Read together: `docs/STRATEGY.md` §5.1 (what the seat is),
   `docs/ENGINE.md` (what counts as mastery), `docs/CLAIMS_MATRIX.md` (what we
   are allowed to say). The third one is not optional — an honest sentence from
   the person selling is the entire compliance posture.
