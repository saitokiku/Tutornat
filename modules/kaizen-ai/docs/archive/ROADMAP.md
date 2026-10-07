# Kaizen — Roadmap

> **Superseded 2026-09-02.** The canonical business model is now
> `docs/STRATEGY.md` (v0.2). Where this file disagrees with it on model, pricing,
> waves or gates, STRATEGY.md wins; this file is kept for its mechanics and its
> history. Update STRATEGY.md first, then propagate.

Where the product is and what's next. The live product is the **`web/`** Next.js
app (own API routes + Supabase). This roadmap is grounded in the current code —
it names the exact seams new work plugs into rather than proposing a rewrite.

## Shipped — the Academic Club (migrations 0022–0025)

The commercial layer is now the 13+ after-school club (see
`docs/PRODUCT_SPEC.md`): Club/Plus/Max memberships with included Homework Hall
visits (allowance engine on `plan_entitlements` + `usage_ledger`, 4-visit
rollover), house pricing with flat hourly tutor pay (`lib/server/clubPricing.js`
is the single truth), the weekly series engine (`lib/server/series.js` +
`/api/admin/classes`), group video rooms, parent-managed teen accounts +
`/family`, the public `/schedule` storefront, and the monthly parent summary
email. Selling is gated behind `app_settings.club_enabled` (fail closed) until
counsel clears `docs/legal/REVIEW_QUEUE.md` items 10–15.

Club next bets: attendance recording (`attended`/`no_show` statuses exist,
unwritten) · in-Hall help-queue statuses (GREEN/YELLOW/RED, addendum §12) ·
multi-tutor rooms for the free Community Hall · Family membership tier ·
under-13 expansion behind a COPPA verifiable-consent build.

## Shipped (this build-out)
- **Full gradebook + GPA** — weighted grades, credit-weighted GPA, what-if
  ("what do I need on the final?") solver, per-course category breakdown, inline
  score entry, GPA trend. `web/lib/grades.js`, `web/components/GradesView.js`,
  migration `0002_grades.sql`.
- **"Magic" intake** — one box that ingests a syllabus, brain dump, or a
  **PDF / photo / Word doc**, and now also extracts **grade weights, letter
  scale, credits**, and recognizes a **returned graded test**. `web/app/api/intake`,
  `web/lib/intake.js`, `web/lib/prompts.js`.
- **Accounts & management** — admin user/role management + roster, parent↔student
  **family linking** with a read-only grades/report summary, data export.
  `web/app/api/admin/users`, `web/app/api/family/*`.
- **Payments hardening** — in-app prorated plan switching, `invoice.payment_failed`
  handling, monthly-limit enforcement, `signups_enabled` gate.
- **Human tutor marketplace + live video** — tutor roster/availability/booking,
  **Daily.co** 1:1 video, tracked earnings (payouts manual for now), guardian
  consent. `web/app/api/tutoring/*`, `web/lib/server/daily.js`, `web/app/tutor`,
  migration `0003_tutors.sql`.
- **Interactivity** — undo on complete/delete, drag-to-reschedule, interactive charts.

### Wave 2 — the complete tutoring platform + AI system
- **Tutor hiring pipeline + public directory + reviews** — curated job
  applications (`/tutors/apply`, resume upload) → admin review/approve/reject
  with emails → public profiles at `/tutors` and `/tutors/[slug]` (photo,
  headline, subjects, rating, open slots) → student books from the profile →
  post-session reviews fuel the ratings. Migration `0004_tutor_hiring.sql`.
- **Pay-per-session commerce** — booking a live session creates a one-off
  Stripe Checkout charge at the tutor's rate; webhook fulfillment; 30-min
  abandoned-hold release; 24-hour refund policy; booking/cancellation/refund/
  reminder emails. Migration `0005_session_payments.sql`.
- **Magic box at scale** — many + large files: client uploads straight to a
  private `documents` bucket, then a concurrency-2 loop ingests each file
  (25MB PDFs work, no request-body limit), progressive merge, sha256 dedup,
  per-file status + drag-and-drop. Migration `0006_storage_intake.sql`.
- **Rich chat** — the tutor renders LaTeX math (KaTeX), function graphs (safe
  no-eval expression compiler), mermaid diagrams, and highlighted code;
  voice mode speaks math in words. XSS-safe, streaming-safe, lazy-loaded.
- **AI copilot layer** — pre-session prep brief + AI-polished post-session
  recap (emailed to student + parents) for human tutors; interactive AI
  **practice sets** feeding spaced repetition; "Upload graded work" CTA.

---

## LMS integrations (the big external surface)
The schema already carries a `courses.source` enum (`manual | canvas | demo`) and
the **AI intake pipeline is the merge target**: any connector normalizes external
courses/assignments/**grades** into the same shapes `applyIntake` (`web/lib/intake.js`)
already produces, so views, mastery, and the gradebook light up for free. Build a
shared `web/lib/server/lms/` with one adapter per provider behind a common
`syncCourses(userId, token) → patch` interface, plus an OAuth callback route and a
`lms_connections` table (provider, tokens, last_sync).

| Provider | Auth | API | Notes |
|---|---|---|---|
| **Canvas** | OAuth2 (per-institution base URL) | REST `/api/v1/courses`, `/assignments`, `/submissions` | Highest demand; grades + weights map directly onto our gradebook. Start here. |
| **Google Classroom** | Google OAuth | Classroom API `courses`, `courseWork`, `studentSubmissions` | Big K-12 footprint; no weighted categories (points only) → our points-based fallback fits. |
| **Schoology** | OAuth1/2 | REST `sections`, `assignments`, `grades` | Common in US districts. |
| **Clever** | Clever OAuth (SSO + rostering) | Rostering API | Best as an SSO + roster source; pair with a gradebook provider. |
| **LTI 1.3 / AGS** | LTI (JWT/JWKS) | Names&Roles + Assignment-and-Grade Services | Lets Kaizen launch *inside* an LMS and read/write grades; the standards-based long game. |

Sequencing: Canvas → Google Classroom → Schoology → Clever (SSO) → LTI 1.3.

---

## Other gaps & next bets (roughly prioritized)
1. **Parent dashboard** — promote the Settings "family summary" into a full
   `/parent` view (trends, per-assignment detail, notifications). Data seam
   already exists (`/api/family/summary`).
2. **Notifications** — wire the ready `n8n/workflows/*` (spaced-repetition
   reminders, weekly recap audio, tutor-handoff escalation, onboarding) to real
   triggers; add email/push prefs to Settings.
3. **Tutor payouts — Stripe Connect Express** — when tutor supply justifies it,
   turn the tracked `tutor_earnings` into automatic payouts (Express onboarding,
   KYC, transfers, platform fee). The ledger and session model are already in place.
4. **RAG at scale** — swap `document_chunks.embedding jsonb` for pgvector and
   wire the FastAPI `backend/` (real LangGraph/RAG/mastery code, currently
   stateless) as the scale-out path the web routes were designed to map onto.
5. **Surface existing AI** — ✅ *AI practice sets now ship in the UI* (⚡ Practice
   on any concept → `web/app/api/practice`, `web/components/PracticeModal.js`).
   Still open: a dedicated "weak spots" drill and the backend self-improvement loop.
6. **Weighted GPA** — AP/honors bonus toggle in `web/lib/grades.js` (`gpa` already
   takes a points map); per-course weight class on the course.
7. **Mobile** — the Expo `client/` app targets the FastAPI backend; repoint it at
   the web API surface (or the backend once wired) for a real iOS/Android build.
8. **Recurring tutor availability** — weekly repeating slots + timezone handling
   (today's `tutor_availability` is concrete one-off windows).
9. **Accessibility & i18n** — keyboard/focus/ARIA pass; extract copy for translation.
10. **Analytics** — PostHog is scaffolded (`NEXT_PUBLIC_POSTHOG_KEY`); define the
    funnels (intake → first grade → first tutor session → upgrade).
11. **Concept↔course model** — today concepts join courses by **name** (and chat/
    mastery are name-keyed). A careful migration to stable IDs would remove the
    duplicate-name fragility, but must preserve every name-keyed record.

---

## Marketplace hardening (needed before scaling human tutoring with minors)
These are deliberately deferred from Wave 2 — several need policy/legal work,
not just code, so they are flagged rather than faked:
1. **Tutor background checks / verification** — integrate Checkr (or similar)
   into the hiring pipeline; a tutor should not go `active` until cleared. This
   must precede any real scaling with minors.
2. **Student ↔ tutor messaging** — an async channel between booked sessions,
   with moderation/logging (safeguarding); today all contact is in-session.
3. **Session recordings + consent** — optional recording with **two-party
   consent** (laws vary by state) — needs a written policy before code.
4. **Terms of service / refund policy pages** — the app enforces a 24h refund
   rule in code; the customer-facing legal pages need real legal review.
5. **Scheduled notification digests** — move the Wave 2 *lazy* T-24h reminder
   (fired when a user loads sessions) to real cron/n8n so reminders send even
   when nobody opens the app.
6. **Business analytics dashboard** — bookings, revenue, retention, tutor
   utilization for operators (the data is all in `usage_ledger`, `audit_log`,
   `tutoring_sessions`, `tutor_earnings`).
7. **SEO subject landing pages** — `/tutors/subject/[subject]` pages for organic
   acquisition, built from the same directory data.
8. **Group sessions / classes** — one tutor, many students (the session model is
   1:1 today).

---

## Operational notes
- Migrations are additive and numbered — run `0001` → `0002` → … → `0006` in
  order (see `docs/GO_LIVE.md`).
- New third-party keys degrade gracefully to a clear "not configured" state:
  `DAILY_API_KEY` (video), `STRIPE_*` (billing + per-session), `RESEND_API_KEY`
  (transactional email), `OPENAI_API_KEY` (voice), `GEMINI_API_KEY` (image
  generation) — the app never hard-fails on a missing integration.
