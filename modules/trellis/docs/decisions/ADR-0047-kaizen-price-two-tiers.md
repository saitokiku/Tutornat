<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: vault/30-decisions/ADR-0047-kaizen-price-two-tiers.md -->

---
title: "ADR-0047 — Kaizen price: two tiers at $49 and $119, generous but bounded"
tags: [adr, kaizen, spec, pricing]
project: kaizenai-saas
date: 2026-09-12
decided_by: manny
status: AMENDED 2026-09-12 16:58 CDT — single tier at $49, run at or below break-even
---
# ADR-0047 — $49 and $119, generous but not unlimited

## Context
K3 was one of four open taste decisions. Astra proposed **$29** for one learner at roughly three
20-minute sessions a week. Manny rejected it as too cheap, then set the structure himself.

## Decision
Manny, 2026-09-12 16:57 CDT, iMessage, verbatim:

> "okwy not unlimited but generous, so they can actually have homework help. We can do a 49 and a 119 subscription which should be on the upper end of limits where people actually land after using, this is still way cheaper than buying tutoring help and people will be interested at this deep a discount, roll the dice, we just have to deliver."

**Two tiers, $49 and $119. Generous limits, explicitly not unlimited.** The positioning is a deep
discount against human tutoring ($150–400/month by his own market read), and the bet is on delivery.

## The correction that shaped it
He had first said the price could break even and 'fund customer acquisition'. Break-even funds nothing:
acquisition is paid out of **contribution** (price minus delivery cost). At Astra's illustrative
$0.71/learner-hour, a $29 price leaves roughly $21–23 after hosting, support and payment fees, and $49
leaves roughly $41–43 — about double the acquisition budget per family. That is what moved the number.

## The sequencing problem, and how it is handled
He wants the $119 tier set 'on the upper end of limits where people actually land after using' — which
cannot be known before people use it. So:
1. Launch **$49 with a cap derived from measured cost**, set deliberately high so almost nobody meets it.
2. Instrument usage from day one: sessions, minutes, **voice minutes separately**, and cost per family.
3. Set the $119 boundary from the observed distribution after the first cohort.
4. Tell early families their cap is provisional and **will only ever move in their favour** — a cap that
   tightens after purchase is a broken promise, and this project has already decided once that an
   unmet promise is the real liability ([ADR-0046-crisis-statutory-floor-no-invented-promise](ADR-0046-crisis-statutory-floor-no-invented-promise.md)).
5. Both numbers stay provisional until **RO-4** measures real token and voice cost. The $0.71 is an
   estimate, not a bill.

## Structure notes carried into the SPEC
- **Meter voice separately from text.** ASR and TTS are most of the per-hour cost, so if a cap ever binds
  it should bind on voice, never on a learner asking questions.
- **Siblings belong on the $119 tier** (put to him; awaiting his answer). ADR-0045 made the household the
  unit and the referral case; charging full price for a second learner would undo it.
- 'Generous' must be a stated number. Generous without one is how margin disappears quietly.

Links: [ADR-0045-coppa-from-day-one](ADR-0045-coppa-from-day-one.md) · [ADR-0046-crisis-statutory-floor-no-invented-promise](ADR-0046-crisis-statutory-floor-no-invented-promise.md) ·
[202609121628-manny-market-read-algebra-first](../history/notes/202609121628-manny-market-read-algebra-first.md) · kaizen *(PM vault: `20-mocs/kaizen`)* · [SPEC](../product/spec.md)

## Amended — 2026-09-12 16:58 CDT: one tier, at cost

Manny, iMessage, verbatim:

> "Lets just launch at 49 for max use 100 percent no profit maybe even small loss and let it funnel customers in"

**Single tier, $49, maximum usage, run at or below break-even.** The $119 tier is withdrawn before it
existed. The price becomes the acquisition channel: instead of paying for customers out of contribution,
the discount itself is expected to pull them in, and referral does the work paid acquisition would. That
depends on the household logic in [ADR-0045-coppa-from-day-one](ADR-0045-coppa-from-day-one.md) — siblings and word of mouth — rather
than on an advertising budget that no longer exists at zero margin.

### What the PM required in return, because 'small loss' is a direction, not a plan
1. **A per-family cap derived from measured cost.** At the illustrative $0.71/learner-hour, $49 buys about
   30 hours a month at cost, so 'max use' near break-even is a cap in the 30–40 hour range. Settable only
   after RO-4 measures real token and voice cost.
2. **A total monthly burn ceiling — put to Manny, awaiting his number.** The same strategy costs $200 at
   ten families and $10,000 at five hundred. Without a ceiling the loss is unbounded and the decision
   cannot actually be made.
3. **The burn must cover fixed costs, not just tokens.** At zero margin nothing funds human item review,
   the counsel work COPPA requires, or incident handling. Those do not scale with users; they simply have
   to be paid.
4. **Grandfather the launch cohort.** Whoever joins at $49 with max use keeps it if the price or cap ever
   moves. Cheap to promise now, and it is the only way to raise the price later without punishing the
   families who took the risk first — consistent with this project's standing rule that an unmet promise
   is the real liability ([ADR-0046-crisis-statutory-floor-no-invented-promise](ADR-0046-crisis-statutory-floor-no-invented-promise.md)).

### The risk that inverts
At $49 with maximum usage and no margin, **growth is the expensive outcome.** Normally scale relieves
unit economics; here it multiplies the loss until the price or the cap changes. That is a survivable bet
with a burn ceiling and a grandfather clause, and an unbounded one without them.

What survives unchanged from the original decision: voice metered separately from text; 'generous' stated
as a number rather than implied; both figures provisional until RO-4.

### Later tiers are built on value, not on rationing — 2026-09-12 16:58 CDT

Manny, iMessage: *"Remove 119 max tier, we can add higher tiers with siblings etc or other benefits community, etc"*

Confirms the withdrawal, and sets the shape of anything above $49: a higher tier must sell **more value** —
additional learners in the household, community, added benefits — and must never be the same product with
the usage cap loosened. Rationing what a single learner may use and charging to undo it is the opposite of
the wedge: it taxes exactly the families who are using the thing most, which under ADR-0045's household
logic are the ones most likely to refer. Usage caps exist to bound cost, never to create an upsell.

### Fixed costs are funded by Manny — 2026-09-12 16:59 CDT

Manny, iMessage: *"I am funding the fixed costs don't worry, we wanna build a good Bussiness here"*

Item review, counsel, incident handling and the other costs that do not scale with users are underwritten
by him personally. Requirement 3 above is answered; it stays on the record because a funding source is a
durable fact and the next person reading this will need to know which costs were covered and by whom.

### The variable loss, decided by the PM rather than re-asked

His funding covers the fixed side. The **variable** side still scales with every family, so it needs a
bound — and that bound is something the PM can set and record rather than put to him a third time
(decision protocol: anything the PM could decide itself never goes out as an open question).

**Decided:** the launch usage cap is set at the point where measured delivery cost equals the $49 price,
plus a **20% overage allowance** before the cap binds. Worst-case variable loss is therefore bounded at
**~20% of revenue — about $10 per family per month** — which is the property that matters: it scales
predictably instead of unboundedly. Five hundred families is a knowable ~$5,000/month worst case, not a
surprise. The absolute numbers are set once RO-4 measures real token and voice cost; the *rule* holds
regardless of what that measurement returns.

This keeps his intent — max use, at cost, maybe a small loss — while making 'small' a number the business
can survive at any size. It is reversible: he can widen it on a word.
