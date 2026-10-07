# Provisioning — exactly what to set up

Every account, key and step needed to make Kaizen work, in dependency order.
Grounded in what the code actually reads (`grep process.env` across `web/`), not
in what the docs aspire to.

**Legend** — 🔴 blocking (app is broken without it) · 🟡 feature-gating (that
feature is dark, rest works) · ⚪ optional

---

## 0. Fix these two first — they are why things are broken right now

### 🔴 The domain is suspended

```
kaizenedu.net → Domain Status: clientHold   (registrar: Name.com, via Vercel)
Creation 2026-07-09 · Updated 2026-07-24 · no nameservers published
```

`clientHold` means the registrar pulled the domain out of DNS entirely — nothing
resolves, no amount of deploying fixes it. The 15-day gap between creation and
the status change is the signature of **an unverified ICANN registrant email**.

**Do:** find the verification email from Name.com (~July 9, check spam), click
it. Or open a Vercel support ticket referencing the `clientHold`. Nothing in the
code or the Vercel project needs to change — `ssoProtection` is already set to
`all_except_custom_domains`, so the site goes public the moment DNS resolves.

### 🔴 The database is ~10 migrations behind

This is why uploads fail ("Bucket not found"), why the engine is inert, and why
the RLS self-promotion hole is still open in production.

**Do:** Supabase Dashboard → SQL Editor → run **in order**:

```
0001_init.sql   0002_grades.sql   0003_tutors.sql   0004_tutor_hiring.sql
0005_session_payments.sql   0006_storage_intake.sql   0007_usa_compliance.sql
0008_pricing.sql   0009_hardening.sql   0010_product_hardening.sql
0011_rls_hardening.sql   0012_kc_library.sql   0013_evidence_ledger.sql
0014_storage_repair.sql
```

then `seed.sql` and `seed_kc.sql`.

Every file is idempotent (verified: no unguarded `CREATE TABLE`, no unguarded
`ADD COLUMN`, all policies `DROP ... IF EXISTS` first), and all 16 parse cleanly
against PostgreSQL's own grammar. Re-running is safe.

`0014` ends with a `SELECT` that prints the three storage buckets. If a row is
missing, SQL-level bucket creation is restricted on your project — create it in
Dashboard → Storage (names and visibility in §2) and re-run 0014 for the policies.

**Verify afterwards**, as a plain authenticated user in the SQL editor — all of
these must now FAIL:

```sql
update profiles set role = 'admin' where id = auth.uid();
update profiles set plan = 'internal' where id = auth.uid();
update tutors set vetting_status = 'cleared' where user_id = auth.uid();
select guardian_consent_token from profiles where id = auth.uid();
```

---

## 1. Accounts you already have

| Service | Purpose | Status |
|---|---|---|
| **Vercel** (Pro) | hosting, cron, domain | ✅ project `kaizen-ai`, root dir `web` |
| **Supabase** | Postgres, Auth, Storage | ✅ keys set, schema behind |
| **Anthropic** | all tutoring/grading/intake | ✅ `ANTHROPIC_API_KEY` |
| **OpenAI** | voice only (STT/TTS/Realtime) | ✅ `OPENAI_API_KEY` |
| **Resend** | transactional email | ✅ `RESEND_API_KEY` |

---

## 2. Supabase — settings beyond the migrations

**Storage buckets** (0014 creates these; confirm they exist):

| Bucket | Public | Limit | Holds |
|---|---|---|---|
| `documents` | no | 25 MB | student uploads for intake |
| `applications` | no | 10 MB | tutor résumés |
| `avatars` | **yes** | 3 MB | tutor photos (public directory needs it) |

**Auth → URL Configuration.** Site URL `https://kaizenedu.net`; redirect URLs
must include `https://kaizenedu.net/**`. Password reset and email confirmation
links break without this.

**Auth → Email.** Supabase's built-in mailer is rate-limited to a handful per
hour and will silently throttle signups. Point SMTP at Resend before any real
traffic.

**Database → Backups.** Confirm point-in-time recovery is on. The evidence
ledger is append-only and the source of truth for every mastery claim — losing
it loses the product.

---

## 3. 🔴 Set these environment variables now

Vercel → Settings → Environment Variables (Production **and** Preview):

| Var | Value | Why |
|---|---|---|
| `APP_URL` | `https://kaizenedu.net` | **Currently unset.** Every transactional email is sending broken relative links right now (guardian consent, password reset, unsubscribe). It's also a hard requirement for Stripe redirects — `appUrl()` refuses to derive them from request headers in production, because honouring a spoofed `Origin` would send a paying customer to an attacker's page straight after a real charge. |
| `CRON_SECRET` | any long random string | **Currently unset**, so the hourly job in `vercel.json` returns 501 and has never run. It releases abandoned payment holds, sends T-24h reminders, auto-completes sessions so tutors accrue earnings, and enforces the 24-month transcript retention you promise in the privacy policy. Generate with `openssl rand -hex 32`. |

---

## 4. 🟡 Accounts to create, by what they unlock

### Stripe — money (nothing is chargeable today)

1. Create the account, complete business verification.
2. Create the **recurring** Prices — memberships **Club $45 · Plus $79 · Max
   $109** per month, and the AI ladder **AI Solo $11.99 · AI + Hall $24.99**
   per month. **Check every figure against `web/lib/server/clubPricing.js`
   before you click Create** (`CLUB_PLANS.*.priceCents`,
   `AI_PLANS.*.priceCents`). That file is the only price truth; the figures
   above are copied from it and pinned by `web/test/priceTruth.test.mjs`, which
   now scans this document. For months this step named the retired
   pre-repricing lineup (AI Student / Study Circle), and an operator who
   followed it would have charged every member below the price we disclose
   (audit 2026-08-18, H8 — the fix named two runbooks and missed this one).
   Stripe Prices are immutable: a wrong one is replaced, not edited. The legacy
   AI Student / Study Circle Prices matter only if old subscribers still sit on
   them — never create new ones from them.
3. Add a webhook → `https://kaizenedu.net/api/billing/webhook`, events:
   `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.payment_failed`.
4. Set: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, and one Price id per tier —
   `STRIPE_PRICE_CLUB`, `STRIPE_PRICE_PLUS`, `STRIPE_PRICE_MAX`,
   `STRIPE_PRICE_AI_SOLO`, `STRIPE_PRICE_AI_HALL` (`web/.env.example` is
   authoritative). `STRIPE_PRICE_STUDENT` / `STRIPE_PRICE_FAMILY` are the
   legacy tiers: leave them unset unless legacy subscribers exist.
5. Creating those Prices does **not** open the club. Club, Plus, Max and
   AI + Hall stay unsellable until `app_settings.club_enabled` is true —
   `/api/billing/checkout` returns 503 for them — and that flip is gated on
   `docs/legal/REVIEW_QUEUE.md` items 10–16. Only `ai_solo` sells before it.

Without these, `/billing` says "not live yet" and paid tutoring **fails closed** —
a session that can't be charged is never booked, deliberately, so you can't
accrue a payout liability against $0 collected.

> **Note:** there is no Stripe **Connect**. Tutor earnings accrue in
> `tutor_earnings` and you pay them by hand. See §7.

### Daily.co — live video

`DAILY_API_KEY`, `DAILY_DOMAIN`. Free tier is fine to start. Without it the
booking flow says "video isn't configured".

### Upstash Redis — rate limiting that actually holds

`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`. Without it limits are
**per serverless instance**, so the real ceiling multiplies by however many
instances Vercel spins up. On free tier that's your AI spend, uncapped.

### Resend — verify your domain

You have the key, and the DNS records are already in Vercel's zone (DKIM, SPF,
MX from 4 days ago). They do nothing until the domain resolves (§0). Set
`EMAIL_FROM` to something like `Kaizen <hello@kaizenedu.net>`.

---

## 5. ⚪ Optional

| Var | Gives you |
|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | client + server error reporting |
| `NEXT_PUBLIC_POSTHOG_KEY` / `_HOST` | product analytics (note: `identify()` is a stub — user-level funnels won't work until it's finished) |
| `GEMINI_API_KEY` | click-to-generate images in chat |
| `CLAUDE_MODEL_FAST` / `_TUTOR` / `_DEEP` | override model tiers without a deploy |
| `OPENAI_STT_MODEL` / `_TTS_MODEL` / `_REALTIME_MODEL` | override voice models |

---

## 6. Before real students — not optional, and not code

These are the gaps the code cannot close for you.

1. **Background checks.** `vetting_status = 'cleared'` is an admin toggle with no
   vendor behind it. Until Checkr (or similar) is integrated and writing that
   column, **remove "background-checked" from the landing page, the pricing page
   and the guardian-consent email.** Right now the product tells parents
   something it cannot substantiate, about strangers on video with their child.
2. **Insurance**, including abuse & molestation cover. Talk to a broker before
   the first paid session.
3. **Counsel review** of Terms, Privacy and the Safety page, plus your governing
   state.
4. **W-9 collection and 1099-NEC filing** for any tutor over $600/yr.
5. **A safety-report SLA.** `safety_events` has an admin queue and emails you on
   every report. Decide who reads it, how fast, and write it down.
6. **Session recording policy.** Rooms are currently unrecorded with in-room chat
   **enabled and unlogged** — an invisible channel between an adult and a minor.
   Either log it or disable it.

---

## 7. Known-open, so nothing surprises you

- **Tutor payouts are manual.** You collect into your own Stripe balance and pay
  tutors by hand. That is money transmission with a spreadsheet. Stripe Connect
  Express with destination charges is the fix.
- **`identify()` in `analytics.js` never calls PostHog** — it hashes into
  localStorage and stops.
- **`ADMIN_EMAILS`** grants admin on sign-in by email match. Keep it to addresses
  you control; anyone who registers with a listed address becomes an admin.
- **The chat file-upload button is a no-op** — it reads the file, never opens it,
  and tells the model "I uploaded X". Wire it into intake or remove it.
- **Engine adherence is unmeasured.** Track check-completion rate from day one;
  if students don't take checks, confirmed mastery stays empty and the engine's
  central claim goes unrealised.
