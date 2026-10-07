# Kaizen AI — Launch Spec: "Ship to Students Today"

**Owner:** Kaizen Academy LLC · **Status:** for approval · **Target:** invite real students this week, charge next month
**Base:** builds on v0.4 (auth + RLS + entitlements + usage metering + admin, all live in `web/`)

---

## 0 · Objective

Turn v0.4 into a product a student can sign up for, pay for, and use daily — with **one intelligent front door**: paste/type/dump anything about your classes and Kaizen sorts it into your dashboard automatically. Canvas is hidden (kept in code, dark-launched). Stripe billing is wired end-to-end. Launch hygiene (email verification, password reset, rate limiting, error handling, security headers) is closed.

**Definition of done:** A stranger lands on the site → signs up (email verified) → drops a messy brain-dump of their classes into one box → gets a fully laid-out dashboard in <15s → studies with the tutor → hits the free limit → upgrades via Stripe → keeps going. Admin sees usage + revenue. Nothing crashes; every missing key degrades gracefully.

---

## 1 · The big new thing — Universal AI Intake ("the omnibox")

**Replaces** the Canvas-vs-manual choice with a single smart box that appears (a) as the core of first-run onboarding and (b) permanently on the dashboard as "＋ Add anything."

### 1.1 What it accepts
- A full pasted **syllabus** (existing behavior, generalized)
- A **brain dump**: *"I'm taking AP Bio, English 11, and Algebra 2. Bio test on the cell cycle Friday, English essay due Monday, math problem set every night this week."*
- A **single item**: *"calc homework due tomorrow"* (attaches to an existing Calc course if one exists)
- Uploaded **.txt / .md** files (PDF/DOCX text extraction is P2; today we read text files client-side and pasted text)
- Mixed / messy input — the AI is responsible for making sense of it, never the student

### 1.2 What it produces (server contract)
New route **`POST /api/intake`** → returns a **normalized patch**, not a full replace:
```json
{
  "summary": "Added Algebra 2 and 2 assignments; attached calc homework to your existing Calculus course.",
  "courses": [
    { "tempId": "c1", "name": "Algebra 2", "code": null, "teacher": null, "topics": ["Factoring","Quadratic formula","Parabolas"] }
  ],
  "assignments": [
    { "title": "Cell cycle unit test", "type": "test", "courseRef": "existing:<courseId>" | "temp:c1" | null,
      "concept": "The cell cycle", "dueDate": "2026-07-11" | null, "minutes": 60 }
  ],
  "notes": ["I guessed Friday = 2026-07-11; edit if wrong."]
}
```
- Input includes `existingCourses: [{id,name,topics}]` so the AI can **attach to** or **extend** current courses instead of duplicating them (`courseRef: "existing:<id>"`).
- The route is entitlement-checked (`syllabus_parse` feature, reuse the counter) and metered.
- Untrusted-input framing preserved (uploaded/pasted content is data, never instructions).

### 1.3 Client merge behavior
- New courses get real client-generated ids; their `topics` seed the SM-2 concept store (skip concepts that already exist by name).
- Assignments resolve `courseRef` → real courseId (existing or the just-created temp), get dated (AI date, else relative fallback spacing), appended to `app.assignments`.
- Everything persists locally and syncs to Supabase via the existing `lib/cloud.js` push functions.
- Result renders immediately on the dashboard.

### 1.4 Onboarding rewrite (first run)
1. **Name + goal + learning style** (keep existing selects)
2. **The box** — hero headline *"Tell me about your classes."* Subtext *"Paste a syllabus, list what you're taking, or just dump what's due. I'll sort it out."* + example chips that fill the box + optional file attach.
3. **Processing animation** — "Reading → Organizing → Building your dashboard" (reuse the existing staged animation styling).
4. **Review screen** — shows parsed courses (name, topic count) and assignments (title, course, due) in editable rows; student can delete a row, fix a date, rename; **"Looks good → Build my dashboard."**
5. **Dashboard.**

### 1.5 Dashboard omnibox (permanent)
- A prominent "＋ Add anything" entry (Today tab header and/or a floating action) opens the same intake box in a modal.
- Same `/api/intake` call, same merge, closes with a toast: the `summary` string.
- This is the daily-driver: students keep dumping ("added a chem quiz Thursday") and the dashboard stays current — **no forms, one AI.**

### 1.6 Files touched
- **New:** `web/app/api/intake/route.js`, `web/components/IntakeBox.js` (reusable: onboarding + modal), prompt `INTAKE_PROMPT` in `web/lib/prompts.js`, merge helper in `web/lib/intake.js`.
- **Rewrite:** `web/components/SetupFlow.js` (drop `source`/`sync`/`import`/`paste` Canvas steps → name → intake → review → done).
- **Edit:** `web/components/TodayView.js` (add omnibox trigger), `web/app/dashboard/page.js` (wire `onIntake` merge into state + concepts + cloud push).
- **Keep but dark-launch:** `web/lib/mockCanvas.js` stays; demo path loads it as unbranded "sample data" (no "Canvas" text anywhere user-facing).

---

## 2 · Hide Canvas

- `LoginPage.js`: remove the red **"Continue with Canvas"** button and its caption from the primary UI (guard behind `NEXT_PUBLIC_ENABLE_CANVAS !== 'true'`, default off). Keep the demo entry ("Try the demo").
- `SetupFlow.js`: no Canvas branch at all in the new flow.
- Demo account (`onLogin('demo')`): seeds sample data via `mockCanvas` but labeled "Sample student" — zero "Canvas" strings in any rendered copy.
- Landing page + docs: replace Canvas mentions with "paste your syllabus or just tell us your classes." Leave a single future-facing line ("LMS sync coming soon") only on marketing, no product surface.

---

## 3 · Payments — Stripe end-to-end

Schema already present: `subscriptions(user_id unique, plan, status, stripe_customer_id, stripe_subscription_id, current_period_end)` and `plan_entitlements(plan, feature, daily_limit, monthly_limit)`. The entitlement engine already reads `profiles.plan`. We only need to **drive `profiles.plan` + `subscriptions` from Stripe.**

### 3.1 Plans → prices (env-mapped, no hardcoded ids)
| Plan | Monthly | Env price var |
|---|---|---|
| Free | $0 | — |
| AI Student | $19.99 | `STRIPE_PRICE_STUDENT` |
| AI + Human | $99 | `STRIPE_PRICE_PLUS` |
| Family | $29 | `STRIPE_PRICE_FAMILY` |

### 3.2 Routes (all `runtime='nodejs'`)
- **`POST /api/billing/checkout`** — auth required. Body `{plan}`. Creates/reuses a Stripe Customer (store `stripe_customer_id` on `subscriptions`), creates a Checkout Session (mode `subscription`, the mapped price, `success_url=/billing?status=success`, `cancel_url=/billing`), returns `{url}`. 501 if Stripe unconfigured.
- **`POST /api/billing/portal`** — auth required. Creates a Billing Portal session for the customer, returns `{url}`.
- **`POST /api/billing/webhook`** — **no auth; Stripe signature verified** against `STRIPE_WEBHOOK_SECRET` using the **raw body** (`await req.text()`, `stripe.webhooks.constructEvent`). Handle:
  - `checkout.session.completed` → set plan + status=active + ids + period end
  - `customer.subscription.updated` → sync status (active/trialing/past_due/cancelled) + period end + plan (reverse-map price→plan)
  - `customer.subscription.deleted` → plan='free', status='cancelled'
  - Every mutation: upsert `subscriptions` (service role) **and** `profiles.plan`, plus an `audit_logs` row.

### 3.3 `/billing` page
- Shows current plan, status badge (active/trialing/past_due/cancelled), renewal date.
- **Usage vs limits** for the current plan (read a new `GET /api/entitlements/me` that returns today's usage + limits per feature from the ledger).
- Plan cards with **Upgrade** buttons → `/api/billing/checkout` → redirect to Stripe.
- **Manage billing** button → `/api/billing/portal`.
- Graceful states: Stripe unconfigured → "Billing isn't live yet — you're on the free plan"; `past_due` → banner "update your payment method."

### 3.4 Enforcement (already 90% built)
- `checkEntitlement` already blocks at plan limits with 429. Once Stripe sets `profiles.plan`, higher plans automatically unlock higher limits from `plan_entitlements`.
- Add a friendly client interceptor: any 429 from an AI route surfaces a toast/modal *"You've hit today's free limit — upgrade to keep going"* with a link to `/billing`.
- Admin "grant plan" manual override stays (already possible via SQL; add a button in `/admin` P1).

### 3.5 Env additions
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_STUDENT`, `STRIPE_PRICE_PLUS`, `STRIPE_PRICE_FAMILY`.

---

## 4 · Launch hardening

### 4.1 Auth completeness (P0)
- **Email verification enforced**: enable "Confirm email" in Supabase; `LoginPage` already handles the "check your email" state — add a resend link and a clear post-confirm sign-in path.
- **Password reset**: new `/forgot-password` (request) + `/reset-password` (set new). Uses `supabase.auth.resetPasswordForEmail` + `updateUser`.
- **Under-13 gate** (P1, legal): signup asks a birth-year / "are you 13+?" check; under-13 blocked with a parent-consent explainer (no self-serve). Logged to `safety_events`.

### 4.2 Reliability (P0)
- **Global error boundary** (`app/error.js`, `app/global-error.js`) + friendly copy, no stack traces to users.
- **Rate limiting**: burst limiter in `lib/server/ratelimit.js` — per-user + per-IP token bucket (in-memory Map for single-instance today; interface ready for Upstash Redis when multi-instance). Applied to all AI routes (`/api/chat`, `/api/grade`, `/api/parse-syllabus`, `/api/intake`, `/api/voice`). Returns 429 with retry hint. This is **separate** from daily plan caps.
- **Security headers** in `next.config.js`: HSTS, X-Content-Type-Options, X-Frame-Options DENY, Referrer-Policy, a starter CSP.
- **Input hardening** already strong; extend to `/api/intake` (size caps, message shape).

### 4.3 Observability (P1)
- Sentry (`@sentry/nextjs`) client+server, DSN-gated.
- PostHog page/event capture, key-gated: track signup, intake_used, tutor_message, grade, upgrade_clicked, checkout_completed.

### 4.4 Growth surface (P1)
- Landing CTAs point to real signup; add a 20-second "watch it sort my classes" demo GIF/loop or a live sandbox.
- Welcome email on first signup (Resend abstraction already exists).
- `/settings` page: name, current plan (link to /billing), sign out, **delete account & data** (calls a `POST /api/account/delete` that cascades via RLS + service role).

---

## 5 · Priority ladder

**P0 — blocks inviting students (do first, in order):**
1. Universal AI Intake (route + box + onboarding rewrite + dashboard omnibox + merge)
2. Hide Canvas everywhere
3. Stripe: checkout + portal + webhook + `/billing` + 429→upgrade interceptor + `GET /api/entitlements/me`
4. Email verification enforced + `/forgot-password` + `/reset-password`
5. Error boundary + friendly errors + security headers
6. Burst rate limiting on AI routes

**P1 — launch week:**
7. `/settings` incl. delete account · 8. Under-13 gate · 9. Sentry + PostHog · 10. Welcome email · 11. Landing polish + demo loop · 12. Admin "grant plan" button

**P2 — fast follow:**
13. Server-side PDF/DOCX/image (OCR) parsing for intake · 14. Parent dashboard + link flow · 15. Practice generator UI · 16. Nightly Kaizen review job · 17. Upstash rate limiter for multi-instance

---

## 6 · Acceptance criteria (launch gate)

- [ ] New user: signup → email verify → onboarding intake → dashboard populated from a brain-dump, all in one sitting, no dead ends
- [ ] Dashboard omnibox: paste "chem quiz Thursday" → appears on calendar + Today, attached to Chemistry if it exists
- [ ] Canvas: zero user-facing "Canvas" strings; demo loads sample data cleanly
- [ ] Stripe: upgrade Free→Student via Checkout → webhook flips `profiles.plan` → higher limits apply immediately → Billing Portal opens
- [ ] Hitting the free daily limit shows an upgrade prompt, not a raw error
- [ ] Password reset works end-to-end; unverified users can't enter the app
- [ ] All AI routes rate-limited; abusive burst returns 429
- [ ] `npm run build` clean; `/api/health` truthful; no secret in client bundle (`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, AI keys server-only)
- [ ] Every missing key (Stripe, OpenAI, Resend, Sentry) degrades gracefully with a clear state — never a crash or fake success

---

## 7 · Explicitly out of scope for this pass
Real LMS OAuth, native mobile build, human-tutor marketplace payouts, RAG/pgvector backend, multi-region. All already have a documented path (`docs/`), none block launch.

## 8 · Compliance flags (do before scaled/paid rollout, not a code task)
FERPA/COPPA counsel review; finalize Terms/Privacy with a lawyer; confirm Stripe tax settings; confirm under-13 handling. The under-13 gate (4.1) is the code-side mitigation.
