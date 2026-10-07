# Business direction, September 2026

Written 2026-09-07 from `docs/research/2026-09-market-research.md` (254 sources, August 2024 to September 2026, gathered 2026-09-07) and from the state of this repository after pull request #55. Every number below names its source section in that file; the product facts come from the code. Where a figure came from a search snippet rather than the primary page, the research file says so, and the sandbox that gathered it could not fetch most primary pages, so treat prices as "as advertised on 2026-09-07" and verify any one you act on.

## The decision in one paragraph

Lead with tutoring operators in Austin: tutoring centers, microschools and the Kaizen network, selling Natural Tutor as the tutor a student works with between human sessions, paid per active student by the operator or by the parent through the operator, with Texas Education Freedom Accounts as the money behind a growing share of those families. Keep the $29 direct plan live as the billing rail, the self-serve door for adults and for families who arrive through an operator, and the product ESA-funded homeschoolers buy. Do not sell to districts this year. The recommendation rests on three findings: unsupervised AI tutors get ignored, direct-to-parent subscription economics do not survive paid acquisition, and the operator channel is large, local, unserved and the founder's home ground.

## What the research found

### 1. Engagement, not the model, is the constraint

- The two-year Khanmigo trial in 18 Tennessee middle schools found about 15 percent of students with access used it regularly, and gains of 0.06 to 0.08 standard deviations a year that "resemble those from Khan Academy practice without AI" (research §2.2, NBER w35620, August 2026; Chalkbeat, 2026-08-25). Sal Khan called it "a non-event" for most students.
- The deployments that worked all had structure around the AI: a teacher in the room in Nigeria (0.31 SD in six weeks, research §2.1), a human tutor using Tutor CoPilot (+4 to +9 points of mastery), a mastery workflow in the NUMI trial. Unguarded GPT-4 made Turkish students score 17 percent worse on the unaided exam; a guarded tutor that withheld answers removed the harm (PNAS 2025, research §2.2).
- This product is built like the guarded arm: coach mode, checks, an append-only record that never counts help as mastery. That protects learning. It does not make a teenager open the app. Something outside the product has to supply the session, and in this market that something is a tutor, a parent with a schedule, or an operator.

### 2. Direct-to-parent economics are hard next to free substitutes

- Education apps convert 6.5 percent of trials to paid and keep 14.2 percent of monthly trial converts at one year (RevenueCat 2026, research §3.3). Acquisition runs about $340 per subscriber for micro-learning apps and $4.70 per install (research §4.1); at 6.5 percent conversion an install-led funnel spends about $72 per paying family before landing-page losses, which is two and a half months of this product's revenue.
- ChatGPT for Teens launched free on 2026-08-18 with study mode and parental controls; Gemini Guided Learning is free; Khanmigo is $4 a month (research §1). The 13-to-17 band this product opens with is the band with the most free competition.
- The one voice-first company that reached a $10 million revenue pace, Synthesis, did it for ages 5 to 11, where a child cannot self-serve a chatbot, with $17.5 million raised and 161 staff (research §1.1). This product's under-13 profiles are locked until counsel signs off. That lock sits on the most promising consumer segment and on most of an operator's students, so counsel is now on the critical path for both options.
- Provider cost is not the problem. A 25-minute spoken session costs $0.12 to $0.24 on the stack as built, from list prices (research §6.3). Eight pooled hours cost at most $4.65 a month against $29 of revenue. The free 30 minutes cost $0.14 to $0.29 per trial. Retention and acquisition decide the business, not inference.

### 3. The operator and ESA channel is large, local and unserved

- Texas funded 100,000 students through Education Freedom Accounts by 2026-08-13, at $10,474 per private-school student and $2,000 per homeschooled student, with tutoring and online courses as approved expenses (Texas Comptroller, research §4.3). Six states have universal ESAs.
- About 75,000 microschools serve about 1.5 million students; the median private microschool has 22 students (National Microschooling Center, May 2026). Mathnasium has 1,047 centers and Kumon more than 1,600, and no franchise has shipped a between-session AI tutor (research §4.4). Parents pay those centers $140 to $450 a month.
- District money is shrinking and slow: 78 percent of deals take more than six months, and North Carolina cut Khanmigo's funding from a proposed $10.1 million to $500,000 in July 2026 (research §4.2).
- Alpha School, born in Austin, is expanding to about 50 campuses in 2026 at $45,000 to $75,000 tuition, on a model of AI software plus human guides (research §1.1). Austin families are already paying for AI-centered instruction with people around it.

### 4. Regulation as it binds a product for minors

- The amended COPPA rule is fully enforceable since 2026-04-22; the under-13 lock keeps this product outside it until counsel clears the consent flow (research §5.1).
- Fifteen states had chatbot-specific laws by July 2026. California SB 243 and Utah HB 438 define "companion chatbots" broadly and exclude customer-service bots, game characters and voice assistants, not tutors. A tutor with a persona and memory across sessions may be in scope for 13-to-17 users in those states: disclosure, a reminder every three hours, break reminders, a self-harm protocol, and from July 2027 annual reporting (research §5.2). The product already does the first four (the sitting clock, the break reminder, the crisis path and paging); counsel should confirm whether the definition applies and what the reporting duty needs.
- Texas: the SCOPE Act's enforced parts, TRAIGA (effective 2026-01-01, penalties to $200,000 per violation, NIST AI RMF as an affirmative defence), and the App Store Accountability Act in force since June 2026, which a browser-delivered product avoids (research §5.3).
- 2027 brings platform age signals in California, Utah and Louisiana and possibly COPPA 2.0; the sign-up will need to consume those signals.

## What this repository already is, and what each option still needs

| Capability | State after #55 | Option A needs | Option B needs |
| --- | --- | --- | --- |
| Voice session with a drawn, pointed-at whiteboard, coach mode, checks, the append-only record | Built, merged, screenshot on the real screen | Nothing | Nothing |
| Sign-up: adult, parent, teen-started with parent completion; under-13 locked | Built | Counsel sign-off to open under 13 | The same, and it matters more, because a center's students are 8 to 14 |
| Parent dashboard, transcripts, export and delete, weekly email | Built | Nothing | An operator view of the same data across many students |
| Billing: one plan, Stripe checkout and portal | Built, not yet walked with a real card | The real-card walk | Per-operator or per-seat pricing, invoices |
| Safety: pattern screen, paging, sitting clock, break reminders | Built | Counsel on the companion-chatbot question | The same |
| Coursework: typed problems, a photographed worksheet, a picked skill | Built | Nothing | The human tutor's assignment as the session's starting point |
| Operator console: roster, invite codes, assign work, weekly summary across students, attendance | Not built | Not needed | The whole of it, thin |
| Efficacy evidence | The record exists; no learners yet | Retention numbers from the beta | Engagement and mastery numbers from the pilots |

The thin operator console is close to the parent dashboard that exists: an account that holds more than three profiles, a role that can see every profile's report and transcript, an invitation code a student redeems, an assignment field that seeds the session's coursework, and a weekly summary that is the parent email rolled up. The staff allowlist and the plan limits already parameterise the account, so the work is a new plan shape and a few screens, not a new system.

## The three options, side by side

| | A. Direct to parents, as built | B. Operators, microschools, ESA families | C. Districts |
| --- | --- | --- | --- |
| Who pays | Parent, adult learner, ESA family | Operator, or parent through the operator; ESA money behind both | District, state grant |
| Sales cycle | Minutes | Weeks | 6 to 18 months |
| Price in market | $4 (Khanmigo) to $49 (Math Academy); free from OpenAI and Google | Parents pay centers $140 to $450 a month; institutional references $15 to $20 per student a year | $10 to $20 per student a year, to incumbents, often no-bid |
| Regulatory load | Moderate now, rising in 2027 | The same, plus a data-processing agreement per operator | Highest |
| Needs from the product | Retention machinery, a cheap channel | The operator console, assignment handoff, seat billing | SSO, rostering, standards reports, an efficacy study, a sales motion |
| Founder's position | Ships fast; no cheap channel beyond referral | Ran one of these businesses; has the network; Austin is the test bed | Cannot run year-long procurement against Khan, Amira and Google |

## Recommendation and the plan for the next ninety days

Lead with B, keep A as the rail, defer C. Concretely:

1. **Spend the twenty invites on the people who supply structure.** Ten to Kaizen-network tutors and operators, ten to families with a teen or an adult learner who will use it on a schedule. The invite letter in `docs/BETA-INVITE.md` gets an operator variant.
2. **Put counsel on the critical path with three questions**, in this order: whether a tutor persona with memory is a "companion chatbot" under California SB 243 and Utah HB 438 and what that adds; the verifiable-parental-consent design that opens under-13 profiles, first for students inside an operator; whether and how the product becomes an approved Texas Education Freedom Account vendor (not researched; the Comptroller's program page is the starting point).
3. **Build the thin operator console** before any paid acquisition: roster and invite codes, the assignment field, the cross-student weekly summary, seat billing. Under 400 lines a pull request, each with its screenshots, as before.
4. **Run three pilots in Austin** for six weeks: the Kaizen club and two microschools or centers. Price the seat as a small fraction of what the operator charges parents; the number is Manny's to set and goes in `kaizen.config.ts` when set.
5. **Measure the thing the research says matters.** Per pilot: weekly active learners over enrolled, sessions per learner per week, the share of checks passed unassisted, skills confirmed, the operator's stated intent to renew, and the metrics board's cost per session from the ledger. The threshold to beat is Khanmigo's 15 percent regular engagement; a pilot below 25 percent says the channel is not supplying the structure either.
6. **Decide at day ninety** from those numbers: raise operator sales across Austin if engagement clears 50 percent; rebalance toward the direct plan and ESA homeschoolers if operators will not add a screen between sessions; districts stay off the table until an operator dataset exists and a partner can co-sell.

What does not change: the product's honesty rules, the invariants, the age posture, the price of the direct plan (a change is Manny's call, per `CLAUDE.md`), and the order of `docs/MVP-REFERENCE.md` §7 for engineering work not named above.

## Unit economics, from list prices

| Line | Per 25-minute session | Eight hours a month | Source |
| --- | --- | --- | --- |
| As built, voice-gated ASR (Gemini 2.5 Flash, gpt-4o-mini-tts, gpt-4o-transcribe) | $0.12 | $2.34 | research §6.3 |
| As built, ASR socket open all session | $0.24 | $4.65 | research §6.3 |
| Cheapest plausible stack | $0.04 | $0.71 | research §6.3 |
| Premium voices and streaming ASR | $0.43 | $8.24 | research §6.3 |
| The 30-minute trial, as built | $0.14 to $0.29 per trial | | research §6.3 |

Two consequences. Gating the ASR socket on voice activity is worth more than any model choice, and the product already gates it. Speech-to-speech models would multiply the model line by more than ten (research §6.3), so the cascaded pipeline stays. These are list-price computations, not measurements; the usage ledger reports the real number after the first sessions, and `pnpm metrics` prints it weekly.

## Risks and the facts the recommendation depends on

- **Operators may not want a screen between sessions.** Nobody has shipped this to them, which is either an opening or a reason. The pilots answer it in six weeks.
- **The under-13 lock throttles both options.** Most of a center's students and Synthesis's whole market are under 13. Counsel is not a compliance chore any more; it is the growth path.
- **The teen band's free competition is real.** ChatGPT for Teens and Gemini are free, capable and now have parental controls. The product's answer is structure and the record, not a better model, and structure comes from the channel.
- **A solo founder selling and building at once.** Operator sales, onboarding and support are people-hours. The plan limits selling to three pilots until the numbers say more.
- **The research is search-derived.** Prices and figures were read from search results because the sandbox could not fetch primary pages; each is dated and sourced in the research file, and any that a decision turns on should be checked on the page.
- **Companion-chatbot laws may apply.** If they do, the annual reporting from July 2027 is new work; the reminders and protocols exist.

The three facts to keep checking: the Khanmigo engagement figure and whether a later study shows unsupervised voice tutors retaining teens (that would strengthen A); RevenueCat's conversion and retention medians against this product's own funnel once there are trials; and whether operators pay, which only a pilot shows.
