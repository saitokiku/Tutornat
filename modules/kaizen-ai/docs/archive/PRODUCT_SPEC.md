# Product spec (living)

> **Superseded 2026-09-02.** The canonical business model is now
> `docs/STRATEGY.md` (v0.2). Where this file disagrees with it on model, pricing,
> waves or gates, STRATEGY.md wins; this file is kept for its mechanics and its
> history. Update STRATEGY.md first, then propagate.

North star: a student opens Kaizen and always knows — what am I weak on, what's
due, what should I do right now, and what improved. The commercial layer
(`docs/STRATEGY.md` v0.2, ages 13+) is **one recurring product, the standing
seat** ($550/mo: a reserved in-person tutoring place, 2 × 75 min a week at 1:4,
one price for every payer, member rates on everything else), around a la carte
Homework Hall ($14, supervised study, not tutoring), Subject Clinics ($30), a
free Community Hall every week, a $59 diagnostic, and the AI companion — free,
with one upgrade (Max AI $11.99). Club/Plus/Max memberships are retired from
sale; their definitions stay in `clubPricing.js` for the Terms and the metering
rail. Every session writes to one evidence ledger; confirmed mastery is the only
mastery number any surface states. A homeschooling parent uses the same product
as the teacher (Kaizen Home, 13+): the lattice as curriculum map, the growth tip
as today's lesson, the export as the transcript — and confirmation still comes
only from unassisted checks and credentialed tutors, never from the parent.

Shipped: accountability dashboard (rings/streaks/calendar) · syllabus AI
ingestion · Socratic tutor with modes, memory, document context · 0–5
understanding grading → SM-2 scheduling · voice loop + Realtime token
architecture · curiosity engine · weekly reports · human handoff ·
auth/RLS/entitlements/usage/admin · **club catalog** (weekly series engine,
kinds, grade bands, admin scheduling) · **allowance engine** (included visits
via ledger, monthly reset + discretionary grace-visit credits instead of
rollover, member-price overflow) · **house pricing + flat hourly tutor pay**
(reconstructible per-row) · **group video rooms** (per-seat attendance, exit
summaries) · **Hall vote board** (asks router-compressed into topic parties;
the tutor works the room hottest-first) · **AI ladder tiers** (ai_solo /
ai_hall via Stripe; ai_hall includes one Hall visit a month) · **storefront
interest capture** · **parent-managed teen accounts (13+) + /family
dashboard** · **public /schedule storefront** · **monthly parent summary
email**.

Next: flip `club_enabled` after counsel review (docs/legal/REVIEW_QUEUE.md
items 10–15) · under-13 expansion behind a COPPA VPC build · Family
membership tier · real Canvas OAuth.
