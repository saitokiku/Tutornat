# Deployment

> **New here? Follow [`GO_LIVE.md`](GO_LIVE.md)** — a click-by-click, 30-minute
> guide to a live full-SaaS deployment. This file is the reference summary.

## Stack
- **Vercel** — the `web/` Next.js app (UI + API routes). This is the whole MVP.
- **Supabase** — Postgres + Auth + RLS (required for accounts / SaaS mode).
- **Anthropic (Claude)** — all text intelligence: tutoring, grading, syllabus
  intake. **OpenAI** — voice only (Whisper STT + TTS); required for the mic.
- `backend/` (FastAPI + Celery) deploys to Railway later when scale demands it.

## 1 · Supabase (10 min)
1. Create a project at supabase.com.
2. SQL Editor → paste `supabase/migrations/0001_init.sql` → Run.
3. Paste `supabase/seed.sql` → Run.
4. Auth → Providers → Email: enable. (Disable "Confirm email" for beta if you
   want instant signups.)
5. Copy: Project URL, anon key, service_role key.

## 2 · Vercel
1. Import repo → Root Directory `web`.
2. Environment variables (see `web/.env.example`):
   - `ANTHROPIC_API_KEY` (required — all tutoring/grading/intake)
   - `OPENAI_API_KEY` (required for voice — Whisper STT + TTS)
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
     `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAILS` (required for accounts)
   - optional: `CALCOM_LINK`, `RESEND_API_KEY`, `STRIPE_*`
3. Deploy. `/api/health` should show `{ai:true, voice:true, db:true}`.

## 3 · Make yourself admin
Sign up in the app with an email listed in `ADMIN_EMAILS` — the first API call
auto-promotes it (role=admin, plan=internal). Verify at `/admin`.

## 4 · Stripe (Phase 2 — not blocking)
Entitlements already enforce plans from the `plan_entitlements` table. When
ready: create Products/Prices, add keys, build checkout + webhook that updates
`subscriptions` and `profiles.plan`. Until then, grant plans manually:
`update profiles set plan='student' where email='...';`

## Staging vs production
Two Vercel projects (or preview branches) + two Supabase projects. Never point
staging at the production database.

## Backups & rollback
- Supabase: enable PITR / daily backups in project settings.
- Vercel: previous deployments are one-click rollbacks.
- Schema: additive migrations only; never edit 0001 after it has been applied.
