# Go Live — Kaizen (full SaaS)

A click-by-click guide to get Kaizen live on Vercel + Supabase in ~30 minutes.
No secrets ever go in the repo — every key is pasted into the Vercel/Supabase
dashboards.

The product runs in **full SaaS mode**: real accounts, synced data, and
metered plans. All tutoring / grading / syllabus intelligence runs on
**Claude**; **OpenAI is used only for voice** (speech-to-text with Whisper and
text-to-speech).

---

## What you need before you start

| Thing | Where | Notes |
|---|---|---|
| Anthropic API key | console.anthropic.com → API Keys | Required. Powers all tutoring. |
| OpenAI API key | platform.openai.com → API Keys | Required for voice (STT + TTS). |
| Supabase account | supabase.com | Free tier is fine to launch. |
| Vercel account | vercel.com | Connect your GitHub. |
| A domain (optional) | any registrar | Can add later. |

---

## 1 · Supabase — database & auth (~10 min)

1. Create a new project at **supabase.com** (pick a strong DB password, save it).
2. Open **SQL Editor** → **New query** → run the migrations **in order**, each
   as its own query (they are additive and safe to re-run):
   - [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql) — every table + row-level security.
   - [`supabase/migrations/0002_grades.sql`](../supabase/migrations/0002_grades.sql) — gradebook + GPA fields.
   - [`supabase/migrations/0003_tutors.sql`](../supabase/migrations/0003_tutors.sql) — tutor roster, availability, sessions, earnings (for live video tutoring).
   - [`supabase/migrations/0004_tutor_hiring.sql`](../supabase/migrations/0004_tutor_hiring.sql) — tutor job applications, public profiles (`slug`/`headline`/`photo_url`), reviews, and the `applications` + public `avatars` storage buckets.
   - [`supabase/migrations/0005_session_payments.sql`](../supabase/migrations/0005_session_payments.sql) — pay-per-session fields on `tutoring_sessions` (checkout/payment ids, `paid`, `refund_status`, `pending_payment` status) plus the AI copilot columns (`brief_md`, `recap_md`).
   - [`supabase/migrations/0006_storage_intake.sql`](../supabase/migrations/0006_storage_intake.sql) — private `documents` storage bucket (magic box at scale) + `status`/`sha256`/`error` columns and a per-user dedup index on `documents`.
   - [`supabase/migrations/0007_usa_compliance.sql`](../supabase/migrations/0007_usa_compliance.sql) — **required for US launch**: minors' guardian-consent fields, tutor `vetting_status` (tutors can't be booked until an admin records a cleared background check), safety-report triage, and email opt-out tokens. See [`docs/compliance/USA_LAUNCH.md`](compliance/USA_LAUNCH.md).
   - [`supabase/migrations/0008_pricing.sql`](../supabase/migrations/0008_pricing.sql) — the *pre-club* pricing model: Study Circle seat-sharing tables (`plan_groups`/`plan_group_members`), 11% platform-fee + free-intro fields on sessions, and the original tutor rate bounds. All of it is superseded by the club model in 0022–0023 (house pricing, flat tutor pay of $22–$50/hr (certified tier default $40; 0033, ceiling raised by 0035)); it stays applied so pre-club rows still validate.
   - [`supabase/migrations/0009_hardening.sql`](../supabase/migrations/0009_hardening.sql) — audit-remediation hardening: one-free-intro-per-student unique index (closes a booking race), `trial_redemptions` (hashed-email record so deleting an account can't farm repeat free trials), and indexes for the reminder + retention cron jobs.
   - [`supabase/migrations/0010_product_hardening.sql`](../supabase/migrations/0010_product_hardening.sql) — `intro_redemptions` (hashed-email record so the free intro tutoring session can't be farmed by delete-and-resignup, mirroring `trial_redemptions`).
   - **0011 through 0021** — RLS hardening, the KC library and evidence
     ledger, group sessions, grant hygiene, cancellation provenance. Run them
     in order too; the list above is only the first ten because this guide
     predates them.
   - Then paste [`supabase/GO_LIVE.sql`](../supabase/GO_LIVE.sql) — the
     one-paste bundle that applies **0022 → 0031** (club plans, house pricing,
     class catalog, parent-managed accounts, hall operations, AI tiers, hall
     board, occupancy, mastery-law and audit hardening), re-runs `seed.sql`,
     and ends with verification selects. **Read its last section before you
     run it:** it finishes by flipping `club_enabled` to `true`, which opens
     real selling. That flip is gated on `docs/legal/REVIEW_QUEUE.md`
     items 10–16 — delete that final `insert into app_settings … 'club_enabled'
     … 'true'` statement unless counsel has cleared them. Stopping short of
     0031 is not an option: current code queries
     columns that only exist from 0030 on, and every practice item throws
     without them.
3. New query → paste [`supabase/seed.sql`](../supabase/seed.sql) → **Run**.
   This loads the plan entitlement limits. (Re-running it is safe — it upserts.
   Existing deployments should re-run it to pick up the higher `syllabus_parse`
   caps that the per-file magic-box intake needs.)
4. **Authentication → Providers → Email**: make sure Email is enabled.
   - For a fast demo, you can turn **"Confirm email" OFF** so sign-ups are
     instant. (With it ON, users must click a link before entering — Kaizen
     shows a "verify your email" gate and a resend button.)
5. **Project Settings → API** → copy these three values, you'll paste them into
   Vercel next:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` *(server-only secret —
     never expose this in a `NEXT_PUBLIC_` var)*

---

## 2 · Vercel — deploy the app (~10 min)

1. **vercel.com → Add New → Project → Import** your GitHub repo.
2. **Root Directory**: click **Edit** and set it to **`web`**. *(Critical — the
   Next.js app lives in `web/`, not the repo root.)*
   Framework auto-detects as **Next.js**; leave build settings default.
3. **Environment Variables** — add these (Production + Preview):

   **Required:**
   ```
   ANTHROPIC_API_KEY            sk-ant-...
   OPENAI_API_KEY               sk-...
   NEXT_PUBLIC_SUPABASE_URL     https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY  eyJ...
   SUPABASE_SERVICE_ROLE_KEY    eyJ...           (server-only)
   ADMIN_EMAILS                 you@yourdomain.com
   APP_URL                      https://your-app.vercel.app
   CRON_SECRET                  any long random string (openssl rand -hex 32)
   ```
   `CRON_SECRET` authenticates the hourly maintenance cron in `web/vercel.json`
   (session reminders, abandoned-hold release, transcript retention). Vercel
   sends it automatically once the env var is set; without it the cron endpoint
   refuses to run.

   **Voice model overrides (optional — defaults are good):**
   ```
   OPENAI_STT_MODEL             gpt-4o-mini-transcribe
   OPENAI_TTS_MODEL             gpt-4o-mini-tts
   OPENAI_REALTIME_MODEL        gpt-4o-realtime-preview
   ```

   **Optional add-ons (safe to skip for launch):**
   ```
   RESEND_API_KEY / EMAIL_FROM       transactional email (welcome, reports)
   STRIPE_*                          billing (see §5)
   UPSTASH_REDIS_REST_URL / _TOKEN   distributed rate limiting (recommended
                                     before ads — free tier at upstash.com;
                                     without it limits are per-server-instance)
   NEXT_PUBLIC_SENTRY_DSN            error monitoring
   NEXT_PUBLIC_POSTHOG_KEY / _HOST   product analytics
   TRANSCRIPT_RETENTION_MONTHS       transcript retention window (default 24)
   ```
4. Click **Deploy**. Wait for the build to finish.
5. After deploy, set `APP_URL` to your real Vercel URL (or custom domain) and
   **redeploy** so password-reset / Stripe redirects use the right host.

---

## 3 · Verify it's live (~2 min)

1. Visit **`https://your-app.vercel.app/api/health`**. You want:
   ```json
   { "status": "ok", "ai": true, "voice": true, "db": true }
   ```
   - `ai:false` → `ANTHROPIC_API_KEY` missing.
   - `voice:false` → `OPENAI_API_KEY` missing (text works; mic button disabled).
   - `db:false` → Supabase vars missing/typo'd → accounts won't work.
2. Open the site → **Start free** → create an account with an email that is **in
   your `ADMIN_EMAILS`** list. The first API call auto-promotes it to
   `role=admin, plan=internal` (unlimited).
3. Confirm the admin console loads at **`/admin`**.

---

## 4 · Load a course & demo it (~5 min)

There is no fake sample data — you demo with real materials in
[`demo-materials/`](../demo-materials). See
[`demo-materials/DEMO_SCRIPT.md`](../demo-materials/DEMO_SCRIPT.md) for the full
stage walkthrough. The short version:

1. Sign in → onboarding asks your name, then shows the intake box.
2. Open `demo-materials/algebra-2/syllabus.md`, copy it, paste it into the
   intake box. Claude turns it into a course with topics + dated assignments.
3. Review → **Build my dashboard**.
4. In **Learn**, upload a textbook chapter (e.g. `textbook/ch2-quadratics.md`)
   and a homework set — the tutor reads them in-session.
5. Open an assignment → **Tutor** → talk it through. Tap the **mic** to go
   hands-free (OpenAI Whisper transcribes you; OpenAI TTS speaks back). **Grade**
   the session to see mastery + spaced-repetition scheduling update.

---

## 5 · Stripe billing (optional — not required to launch)

Entitlements already enforce per-plan daily limits from the `plan_entitlements`
table, so you can launch and grant plans by hand:

```sql
update profiles set plan = 'student' where email = 'user@example.com';
```

When you're ready for self-serve billing:
1. Create the recurring **Prices** in Stripe — memberships **Club $45 · Plus
   $79 · Max $109** per month, and the AI ladder **AI Solo $11.99 · AI + Hall
   $24.99** per month. Legacy AI Student / Study Circle prices only matter if
   you have old subscribers; do not create new ones from them.
   **Check every figure against `web/lib/server/clubPricing.js` before you
   click Create** (`CLUB_PLANS.*.priceCents`, `AI_PLANS.*.priceCents`). That
   file is the only price truth; the figures above are copied from it and
   pinned by `web/test/priceTruth.test.mjs`, which now scans this document.
   A Stripe Price that disagrees with it charges a member something we never
   disclosed — this section shipped for months telling operators to create the
   retired pre-repricing membership figures (audit 2026-08-18, H8; the two
   launch runbooks were corrected in that round and this file was missed).
   Stripe Prices are immutable: a wrong one is replaced, not edited.
2. Add `STRIPE_SECRET_KEY`, `STRIPE_PRICE_CLUB`, `STRIPE_PRICE_PLUS`,
   `STRIPE_PRICE_MAX`, `STRIPE_PRICE_AI_SOLO`, `STRIPE_PRICE_AI_HALL` in
   Vercel.
3. Add a webhook endpoint `https://<APP_URL>/api/billing/webhook` for events
   `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`; paste its signing secret as
   `STRIPE_WEBHOOK_SECRET`. Redeploy.
4. Creating the membership Prices does **not** open the club. Club, Plus, Max
   and AI + Hall stay unsellable until `app_settings.club_enabled` is true —
   `/api/billing/checkout` returns 503 for them and `/billing` renders them as
   held. Only `ai_solo` (pure software, no promised tutoring time) sells
   before that flip, and the flip is gated on `docs/legal/REVIEW_QUEUE.md`
   items 10–16. The full launch sequence is `docs/archive/LAUNCH_RUNBOOK.md`.

---

## 6 · Operations

- **Kill switches:** `/admin` toggles tutor / voice / expensive-model access
  live (backed by the `app_settings` table) — flip voice off instantly if
  OpenAI has an outage.
- **Backups:** Supabase → Project Settings → enable PITR / daily backups.
- **Rollback:** Vercel keeps every deployment; roll back in one click.
- **Schema changes:** additive migrations only. Never edit an applied migration
  — add the next number (max + 1; `0031` is the current high-water mark).
- **Dependency changes:** after adding/upgrading npm packages, run
  `npm run notices` in `web/` to regenerate `THIRD_PARTY_NOTICES.md` (the
  public `/licenses` page points at it), and let CI (`npm test` + build) pass
  before deploying.
- **Audit trail:** the full audit → fix history lives in
  [`AUDIT_FINDINGS.md`](archive/AUDIT_FINDINGS.md) and
  [`AUDIT_REMEDIATION.md`](archive/AUDIT_REMEDIATION.md), including the residual
  operator checklist (cron secret, Upstash, Sentry, W-9 before payouts).
- **Staging:** use a second Vercel project + a second Supabase project. Never
  point staging at the production database.

---

## Cost sanity check (voice)

Voice is the only OpenAI spend. Rough per-student-session:
- Whisper STT (`gpt-4o-mini-transcribe`): a few cents per session of talking.
- TTS (`gpt-4o-mini-tts`): ~$12 / 1M characters spoken.

Both are metered per user in the `usage_ledger` table and capped by plan
(`tts_chars`, `stt_seconds`), so a runaway session can't run up the bill.
