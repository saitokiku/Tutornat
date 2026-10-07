# Weekly Rhythm — marketing surface redesign (design spec)

**Date:** 2026-08-12 · **Status:** approved direction (founder), implementation pending
**Scope:** the whole public marketing surface — `/` (home), `/tutoring`, `/ai`, `/pricing`, `/schedule`, `MarketingShell` chrome — plus the minimal backend needed so no UI element is an empty box.

---

## 1 · Positioning (the twine)

The club is the flagship; the AI is a real standalone product with its own funnel. They are
fused deliberately: one brand, one student record, and the club gives the AI business real
revenue and proof. The organizing idea for the entire surface is **the student's week**:

> The club owns the standing appointments. The AI owns every night in between.

This replaces the current "two doors" fork (which asks visitors to self-sort before they
understand either offer) with one narrative any parent can follow in ten seconds.

Approach B ("one record") survives as a **support band**, not the spine: one recurring
section — *the AI works with the record every night; your tutor reads it before every
session; you see all of it* — scoped strictly to what code does today (session summaries,
mastery counted only unassisted-later). No subject-breadth claims (CLAIMS_MATRIX open item).

## 2 · The three-state law

Every commercial element renders exactly one of three states, decided by data — never by
hand-edited copy:

| State | Condition | Rendering |
|---|---|---|
| **LIVE** | `club_enabled=true` | real rows, real Book buttons, seat counts (current behavior) |
| **HELD** | sessions exist, selling held (today) | real rows with day/time/price; booking replaced by "Opening soon — get first pick" email capture |
| **EMPTY** | no sessions in window | illustrative "a typical week," visibly labeled *illustrative* |

Booking APIs remain fail-closed exactly as built. HELD only *shows*; it never sells.

## 3 · New backend (minimal, functional — founder hardens later)

1. **`club_interest` table** — one additive migration: `id, email, kind (nullable), source
   (page), created_at`, unique on (email, kind), RLS: no client access; insert via service
   role only. Purpose: back the "we'll let you know" promise that today is unbacked.
2. **`POST /api/club/interest`** — no auth (public capture), Zod-style shape check, burst
   rate-limited (existing `lib/server/ratelimit.js`), honeypot field, normalizes email,
   upserts. Returns `{ok:true}` always (no enumeration). Admin can export via SQL; sending
   the announcement is a manual founder action (Resend) — copy says "we'll email you when
   booking opens," which a manual send satisfies.
3. **`publicSchedule` preview mode** — when `club_enabled !== true` but future sessions
   exist, return the same sanitized rows plus `notYetOpen: true` (today it returns an empty
   list). UI shows-but-never-sells. Sanitization unchanged (cleared+active tutors only,
   first-name only, no ids beyond session id).
4. **AI pricing tiers in `lib/server/clubPricing.js`** (single source of truth), consumed by
   `/pricing` (refactor: page imports from the lib instead of hand-duplicating; test pins the
   lib): 
   - `ai_solo` — **$15/mo** — full companion, elevated limits, voice. The decoy: real,
     honest, deliberately plain.
   - `ai_hall` — **$19/mo** — everything in `ai_solo` **+ 1 included Homework Hall visit per
     calendar month** via the existing allowance engine (no rollover on this tier — simpler
     terms than club memberships; disclosed in fine print). The divert target; card is
     highlighted; Solo card carries the inline nudge "For $4 more, get a real tutor session
     every month →".
   - Entitlement rows (`plan_entitlements`): tutor_message 300/day (free: 40), grade 60/day,
     syllabus_parse 10/day, voice on, deep-model access on. Values are founder-tunable in
     one place.
   - Stripe: env-mapped prices `STRIPE_PRICE_AI_SOLO`, `STRIPE_PRICE_AI_HALL`; until env
     exists, checkout for these plans renders the designed HELD state (capture interest),
     never the raw 501.
5. **`WeekStrip` component** — server-renderable Mon→Sun strip: session anchors (rose) from
   `publicSchedule`, AI nights (plum) always on. Props: `state` (live/held/empty),
   `sessions`, `compact`. The signature graphic of the whole surface.

## 4 · Aesthetic direction

Evolve, don't replace. Same tokens (tailwind.config.js values are the brand contract), same
sakura/cream warmth, Fraunces + Plus Jakarta pairing kept. What changes:

- Display type gets bigger and more confident (hero 64–88px, tight leading, italic accents).
- A stricter eyebrow/label system (`k-label` discipline, one accent color per side: rose =
  human/club, plum = AI/nights, sage = free/growth).
- The WeekStrip replaces generic card grids as the recurring graphic.
- Asymmetric section layouts (text-left/strip-right, alternating) instead of
  centered-everything; more whitespace between sections (py-20+ rhythm).
- No new colors, no gradients-on-everything, no template-y three-icon-cards where the
  content doesn't earn it.

## 5 · Page designs

### `/` (home) — rewrite
1. **Hero** — club-first: "A standing weekly place to get schoolwork done." Sub: real
   tutors on a weekly schedule, an AI companion every night in between, ages 13+, from
   free. Real schedule rows render in the hero (HELD today). Primary CTA: *Get first pick
   when booking opens* (email capture modal/inline). Secondary: *Start free with the AI
   companion* (live funnel today).
2. **The week, visualized** — WeekStrip section; one sentence per side. Replaces the
   two-door fork.
3. **The club** — Hall $12 / Clinics $18 / private from $30 / free weekly Community Hall +
   membership-math teaser ("8 Halls à la carte $96 → Plus $69") → `/tutoring`.
4. **The AI, standing alone** — "A tutor, not an answer machine"; free tier is a real
   daily allowance; AI ladder teaser (Free / $15 / $19-with-a-real-session) → `/ai`.
5. **One record** — shared-memory band (B-support).
6. **Primary care band** — keep existing copy, tightened.
7. **Integrity strip** — keep.

### `/tutoring` — align, keep its strong bones
Problem-based rows, honesty block, ladder, membership math all stay (they're good). Changes:
WeekStrip (HELD) placed high; every booking CTA becomes state-aware (LIVE → book, HELD →
first-pick capture); shared-record band added; hero voice tightened to club-flagship.

### `/ai` — reposition as a standalone product page
- Hero eyebrow drops "included with every membership" → "The AI study companion · every
  school night." H1 keeps "A tutor, not an answer machine."
- Teaching contract section stays (strong).
- **New pricing section: the AI ladder** — Free / AI Solo $15 / AI + Hall $19, decoy
  layout ($19 card highlighted, "includes a real tutor session every month"), inline
  divert nudge on the Solo card.
- WeekStrip inverted (nights lit, anchors dim) — the AI's territory.
- Shared-record band + one bridge section to the club ("and it knows when it's time for a
  human").

### `/pricing` — one page, two halves, one story in dollars
- **"Every night"** — AI plans: Free / $15 / $19 (decoy layout).
- **"Every week"** — club memberships: Club $39 / Plus $69 / Max $99 (existing grid), with
  the à-la-carte strip (Hall $12, Clinics $18, private $30/$55) retained above.
- Membership math section stays. Fine print gains the AI-tier lines (no rollover on
  ai_hall's visit; visits reset the 1st).
- Plan data imported from `clubPricing.js`; CTAs state-aware (Stripe unconfigured → HELD
  capture, never raw 501).

### `/schedule` — the storefront
Filters and row rendering stay. HELD state: real rows, price shown, Book replaced by
"Opening soon — get first pick" capture (per-row kind recorded as interest `kind`). LIVE
behavior unchanged for the flip. EMPTY: illustrative typical week, labeled.

### `MarketingShell` chrome
Header nav: Tutoring · Schedule · AI · Pricing (Find a tutor stays; "Become a tutor" moves
to footer only). CTA pill stays "Open Kaizen". Footer unchanged (entity line correct).

## 6 · Copy constraints (hard, CI-enforced)

- Banned: "background-checked" (say "interviewed and approved by our team"), guaranteed
  results/grades, FERPA/HIPAA postures, any entity other than **Kaizen Academy LLC**,
  click-to-cancel/negative-option citations.
- No unconditional booking promises while HELD; no "we'll let you know" without the
  interest capture behind it.
- Every new public claim (AI tier prices/inclusions, first-pick promise, ai_hall session
  inclusion) gets a row in `docs/CLAIMS_MATRIX.md`.
- `web/test/claims.test.mjs` and `web/test/legalMarkers.test.mjs` must stay green.

## 7 · Testing / definition of done

- `npm run build` clean; `npm test` green including updated `clubPricing.test.mjs` (pins
  the lib incl. AI tiers) and a new `interest` route test (shape, rate limit, honeypot).
- Claims/legal marker guards green over the rewritten pages.
- All three states of every commercial element reachable and rendered (unit-level: WeekStrip
  renders live/held/empty; page-level: held is today's default and must look *designed*).
- Playwright smoke (`e2e/smoke.spec.js`) passes; extend with `/pricing` + `/ai` + `/`
  headline assertions.
- No banned phrase, no raw 501 reachable from any marketing CTA.

## 8 · Explicitly out of scope

- Flipping `club_enabled` (blocked on counsel, REVIEW_QUEUE 10–15).
- Stripe price creation / live billing config (founder).
- `/tutors` directory + `/tutors/apply` redesign (flagged separately: apply page carries
  pay-band copy that REVIEW_QUEUE item 15 says needs founder confirmation — founder's call).
- Automated announcement email sender (manual Resend send satisfies the promise).
- Fixing the cloud.js last-write-wins sync trap (known, deliberate).

## 9 · Open items for founder (non-blocking)

- Confirm $15/$19 price points (single edit in `clubPricing.js` + Stripe env when ready).
- Vercel: production branch → `main`, framework preset → Next.js (dashboard, 30s) — or
  approve CLI deploy. Production currently serves the Jul 28 build.
- REVIEW_QUEUE item 15 (tutor pay copy already public on /tutors/apply).

## Addendum (2026-08-12, post-approval)

Changes made after this spec was approved, superseding the figures and details above:

- **Repricing** to Target-style premium-cheap, per founder: Hall $14, Clinic $20,
  1:1 $35/$60, memberships Club $45 / Plus $79 / Max $109, AI tiers $11.99 / $24.99.
  `web/lib/server/clubPricing.js` remains the single source of truth; the $12/$18/$30/$55,
  $39/$69/$99, and $15/$19 figures in sections 3 and 5 are superseded.
- **`ai_hall` purchase gating**: buying the ai_hall tier is additionally gated on the club
  being open (`hallDeliverable`), so the included Hall visit is never sold while it cannot
  be delivered.
- **`publicSchedule` fails closed with no DB**: when the database is unavailable, the
  preview returns nothing rather than erroring or fabricating rows.
- **Capture promise softened**: the first-pick copy now reads "you'll hear first" rather
  than an unconditional "we'll email you when booking opens".
