# Raise notes

> **Superseded 2026-09-02.** The canonical business model is now
> `docs/STRATEGY.md` (v0.2). Where this file disagrees with it on model, pricing,
> waves or gates, STRATEGY.md wins; this file is kept for its mechanics and its
> history. Update STRATEGY.md first, then propagate.

Founder working notes for the raise narrative. Internal only. Nothing here is
public copy; anything that leaves the building still needs a row in
`docs/CLAIMS_MATRIX.md` first. Entity: Kaizen Academy LLC.

## Report it as two segments, one company

Report the AI business as a SaaS segment: subscriptions, roughly 90% gross
margin, always-on engagement (the companion is in a student's pocket every
night, not just on club days). Alongside it, the club: human revenue at
company-set prices (single source of truth: `web/lib/server/clubPricing.js`),
with the free weekly Community Homework Hall as the CAC engine. We do not pay
for the top of the funnel; we teach it. A family walks into a free Hall,
watches the room work, and the membership sells itself. Two P&L shapes,
deliberately: software margin funding patience, human sessions proving the
brand is real.

## The moat is the one record

The AI is defensible for one reason: it shares a ledger with real human
sessions. Every included visit, every clinic seat, every private hour, and
every AI interaction is metered through the same `usage_ledger` against the
same entitlements. The companion knows what happened in the room; the room
knows what happened in the app. A standalone AI tutor cannot copy that without
also building the human side, and a tutoring shop cannot copy it without
building the software. The record is the product.

## Pricing-model risk is non-existential

Counsel item 12 (`docs/legal/REVIEW_QUEUE.md`) is now severable by design. We
removed banked rollover from code and Terms; included visits are calendar-month
use-or-lose, and a missed week is a discretionary grace-visit courtesy (an
admin ledger credit, never an entitlement), so no stored-value balance ever
exists. If auto-renewal exposure ever prices high in a given state, the
fallback is pre-agreed: an annual access-fee, member-pricing-only model. The
migration is trivial (zero out `includedHallMonthly`, add an annual SKU). The
business does not depend on any one pricing structure surviving review.

## The vote board is proprietary demand-signal data

The Community Hall vote board (0028) turns every room into a poll: students
drop questions into one shared feed, a router compresses each ask into a topic
party, and the room votes the agenda by asking. "12 of 19 want quadratics" is
not a vibe, it is a row. Aggregated room by room, that is a live map of what
students actually struggle with, by subject, by week, collected democratically
as a side effect of teaching. Nobody surveys their way to that data; you have
to be the room.
