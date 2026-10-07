# Launch runbook — tutoring marketplace go-live

The click-by-click path from "code on main" to "a stranger can pay us."
Companion to `docs/LAUNCH_GAPS.md` (what's deliberately NOT in this launch)
and `docs/legal/REVIEW_QUEUE.md` (what counsel must clear first — items 10–15
gate the `club_enabled` flip).

## 0. Preconditions

- [ ] PR merged to `main`; Vercel deploys it (web/vercel.json also registers
      the hourly cron `/api/cron/maintenance`).
- [ ] **Vercel project settings** (Settings → Build & Deployment): Root
      Directory must be **`web`** with no Build/Install Command overrides.
      Symptom when it isn't: the deploy fails in ~15s with
      `Command "npm run build" exited with 1` (the repo root has no
      package.json). Also check Settings → Git: Production Branch = `main`
      (a git-main deploy showing Environment "Preview" means it isn't).
      Note: hourly crons require a paid Vercel plan — on Hobby, change the
      cron schedule to daily or production deploys can be rejected.
- [ ] Counsel sign-off on REVIEW_QUEUE items 10–15 (merchant-of-record
      posture, membership terms, Hall service description, minors' video
      policy, tutor classification, state auto-renewal).

## 1. Environment variables (Vercel → Project → Settings)

Required for the tutoring business (beyond the AI product's existing keys):

| Variable | What breaks without it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE` | everything |
| `STRIPE_SECRET_KEY` | paid seats + memberships (free/included seats still work) |
| `STRIPE_WEBHOOK_SECRET` | payment fulfillment (reconcile covers gaps, don't rely on it) |
| `STRIPE_PRICE_CLUB` / `STRIPE_PRICE_PLUS` / `STRIPE_PRICE_MAX` | membership checkout |
| `STRIPE_PRICE_AI_SOLO` / `STRIPE_PRICE_AI_HALL` | AI ladder checkout (AI Solo sells with the club still held) |
| `DAILY_API_KEY` | video rooms (booking works, joining doesn't) |
| `RESEND_API_KEY` (+ `EMAIL_FROM`) | confirmations, reminders, guardian consent |
| `CRON_SECRET` | series materialization, reminders, session completion/payout accrual |
| `APP_URL` | links in every email |
| `ADMIN_EMAILS` | who the admin console admits |

> Sequencing note: this checklist is the mechanical how. `docs/RELEASE_PLAN.md`
> is the ordered what-and-when, and it gates §5 (the `club_enabled` flip) behind
> counsel and behind hiring. Where the two disagree about ORDER, the release plan
> wins; where they disagree about STEPS, this file wins.

## 2. Database

- [ ] **One paste**: run `supabase/GO_LIVE.sql` in the Supabase SQL editor —
      it applies migrations 0022 → **0032** in order (this line said 0026 until
      2026-08-28; the bundle's own header and its section markers both run to
      0032_ledger_close), re-runs `seed.sql`, flips
      `club_enabled` to true, and ends with three verification selects.
      Idempotent; safe to re-run. (Doing it by hand instead: run the five
      migration files in order, then seed.sql, then flip the switch in
      Admin → kill switches.)
- [ ] Verify: the bundle's final selects show hall allowances for
      club/plus/max, `club_enabled = true`, and the three 0026 columns on
      `group_seat`.

## 3. Stripe

- [ ] **The standing seat's Price — NOT YET CREATED.** Create one recurring
      Price: **$550 USD / month**, product "Kaizen Standing Seat", lookup
      key `kaizen_seat_monthly_live`, tax code `txcd_20060059` (live online
      educational services — the same code the seat checkout paths pin). Read
      the amount from `SEAT_PLAN.seat.priceCents` in `clubPricing.js` before
      you click Create. Paste its id into `STRIPE_PRICE_SEAT`.
- [x] **DONE 2026-08-28** — the five membership/AI Prices exist. Created against
      `web/lib/server/clubPricing.js` and verified cent-for-cent against it
      before use. Paste these into the envs in §1:

      | env | plan | amount | live price id | lookup key |
      |---|---|---|---|---|
      | `STRIPE_PRICE_CLUB`    | club    | $45 | `price_1U9IMxRvIPeLYu6O3UNPCYhw` | `kaizen_club_monthly_live` |
      | `STRIPE_PRICE_PLUS`    | plus    | $79 | `price_1U9IMzRvIPeLYu6OhmJMDN1q` | `kaizen_plus_monthly_live` |
      | `STRIPE_PRICE_MAX`     | max     | $109 | `price_1U9IN0RvIPeLYu6Oix6keDJl` | `kaizen_max_monthly_live` |
      | `STRIPE_PRICE_AI_SOLO` | ai_solo | $11.99 | `price_1U9IN8RvIPeLYu6OGS1Ok1xH` | `kaizen_ai_solo_monthly_live` |
      | `STRIPE_PRICE_AI_HALL` | ai_hall | $24.99 | `price_1U9INIRvIPeLYu6ObTNb6khY` | `kaizen_ai_hall_monthly_live` |

      **Club / Plus / Max are RETIRED FROM SALE (2026-09-02, `SALE_STATUS`).**
      Their Prices may stay; the envs may stay set so events on those ids
      resolve; no surface offers them. `STRIPE_PRICE_AI_HALL` stays UNSET.
      Leave `STRIPE_PRICE_STUDENT` / `STRIPE_PRICE_FAMILY` empty — those tiers
      are retired and their Stripe Products were archived the same day, so the
      withdrawn AI Student / Study Circle pair can no longer be purchased. That
      pair had been the ONLY thing in the live catalog until then: the
      2026-08-12 repricing was never applied in Stripe, so no club or AI tier
      had a buyable price for sixteen days while `/pricing` rendered all five.
      (Their retired figures are deliberately not repeated here — quoting them
      in a living doc is the exact drift `web/test/priceTruth.test.mjs` exists to
      stop. They are recorded in `docs/CLAIMS_MATRIX.md`, marked RETIRED.)

- [ ] After pasting, **redeploy** — `STRIPE_PRICE_*` are read at render time by
      `web/app/pricing/page.js` (`clubBuyable`/`aiBuyable`) and at request time
      by `lib/server/stripe.js`. Until they are set, every plan card renders in
      "Get first pick" capture state and nothing is purchasable.
- [ ] Verify after redeploy: `/pricing` shows buy actions rather than
      "Get first pick" on all five cards.
- [ ] **Check every figure against `web/lib/server/clubPricing.js` before you
      click Create** (`CLUB_PLANS.*.priceCents`, `AI_PLANS.*.priceCents`). That
      file is the only price truth; the figures above are copied from it and
      pinned by `web/test/priceTruth.test.mjs`. A Stripe Price that disagrees
      with it charges a member something we never disclosed — the exact defect
      this checklist shipped with (audit 2026-08-18, H8 — it still listed the
      retired pre-repricing membership figures).
      Stripe Prices are immutable: a wrong one is replaced, not edited.
- [ ] Note the ordering trap this checklist creates: prices exist BEFORE the
      `club_enabled` flip in §5. That is fine — `/api/billing/checkout` refuses
      `club`/`plus`/`max`/`ai_hall` with a 503 while the club is held, and
      `/billing` renders those cards in first-pick state. Only `ai_solo` (pure
      software, no promised tutoring time) sells before the flip.
- [ ] Add the webhook endpoint `https://<app>/api/billing/webhook` (events:
      `checkout.session.completed`, `customer.subscription.*`,
      `invoice.paid`, `invoice.payment_failed`) and set `STRIPE_WEBHOOK_SECRET`.
- [ ] Seat purchases are ad-hoc `price_data` — no per-SKU setup needed. Note
      both checkout paths pin tax code `txcd_20060059` (live instruction) and
      opt out of Managed Payments; confirm the account has that toggle.

## 4. Staff the shop (admin console `/admin`)

- [ ] Tutors: approve applications, record vetting, **activate** the Club
      Director plus **two credentialed tutors** (0033: `credential_kind`,
      `credential_state`, `credential_ref`, `credential_verified_at`,
      `fingerprinted_at`); set each `pay_rate_cents` (2200–4500; certified
      default 4000). Every public payment rail requires the credential.
- [ ] Classes: create the **seat series** first — kind `standing_seat`, 75
      min, capacity 4, `venue` set to the borrowed room, two evenings a week —
      then the a la carte grid: Mon–Thu Homework Halls, 2–3 Subject Clinics a
      week, plus **one free Community Hall** (Fri afternoon). Seat rooms never
      appear on the public board; the cron books seat holders into them. The hourly cron materializes rooms two weeks
      ahead; the first tick after you create series fills the schedule.
- [ ] Check `/schedule` renders the week signed-out.

## 5. Flip the switch

- [ ] Admin → kill switches → **Club selling open** (`club_enabled`). It
      fails closed; nothing sells until this is explicitly true.
- [!] **State check, 2026-08-28: this is ALREADY TRUE in production**, and it
      was flipped out of order — before §3 created any Price and before any
      counsel item was cleared. Verified live, not inferred:
      `GET /api/club/schedule` answers `{"sessions":[],"notYetOpen":false}`,
      which `lib/server/publicSchedule.js:27` only returns when
      `app_settings.club_enabled === true`. `supabase/seed.sql:129` still ships
      `false`, so this was set by hand in Admin.
      Practical exposure was nil — no Price existed, so checkout could not
      complete — but the control CLAUDE.md hard rule 4 and this runbook both
      describe as holding selling closed until counsel clears
      `docs/legal/REVIEW_QUEUE.md` items 10–15 was **not** holding. Once §3's
      envs are pasted the gate stops being theoretical and starts selling.
      Decide deliberately: either clear items 10–15 first, or set
      `club_enabled` back to `false` until they are cleared. `ai_solo` is
      unaffected either way — it is pure software and sells without the flip.

## 6. Test-mode drills (Stripe test keys, before real cards)

1. Free Community Hall seat, brand-new teen account → books instantly,
   confirmation email arrives, video room opens 15 min before start.
2. Membership purchase (Plus) → webhook flips plan; Hall books as
   "included"; allowance decrements; cancel >12h out returns the visit.
3. Paid clinic seat (non-member) → Checkout → seat settles; email arrives;
   `?dropin=paid` reconcile works with the webhook paused.
4. 1:1 from `/tutors/<slug>` signed in → book → cancel ≥24h → full refund.
5. Parent flow: create teen at `/family` → book Hall + 1:1 on their behalf →
   teen joins from their own login.
6. Tutor flow: `/tutor` → Your classes → Brief → Join → students flip
   🔴/🟡/🟢 → roster reorders → after end: attendance + exit summaries →
   cron accrues pay → `/admin` payouts CSV.
7. The §10 readiness test: someone who's never seen the product finds a
   session on `/tutoring`, pays, and attends — zero founder intervention.

## 7. Watch (admin → Business metrics)

Day one onward: occupied seats/tutor-hour (target ≥4), Hall occupancy,
first→second conversion (the retention signal), no-shows, refunds, tutor pay
accrued vs collected revenue. The §6 rule: if conversion is weak, fix the
session experience before spending another acquisition dollar.
