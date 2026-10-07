# Production checklist (before charging money)

## Must (beta with real users)
- [ ] Supabase migrations applied; seed run; RLS spot-checked with two accounts
- [ ] `ADMIN_EMAILS` set; your account shows role=admin at /admin
- [ ] Email confirmation ON in Supabase Auth
- [ ] `/api/health` green in production
- [ ] Kill switches tested (flip tutor_enabled off → chat shows friendly 503)
- [ ] Daily limits verified (set free tutor_message=2, hit the 429, restore)
- [ ] Legal pages reviewed by a human (terms, privacy, integrity)
- [ ] CALCOM_LINK set so handoffs land somewhere real

## Should (first paying users)
- [ ] Stripe checkout + webhook → subscriptions table → profiles.plan
- [ ] Sentry DSN set; PostHog key set
- [ ] Resend configured; weekly report email tested
- [ ] Supabase PITR/backups enabled
- [ ] Staging project separated from production

## Later (scale)
- [ ] FastAPI backend deployed for RAG/pgvector + Celery jobs
- [ ] Nightly Kaizen review job writing to kaizen_reviews
- [ ] Per-IP rate limiting, WAF rules
- [ ] FERPA/COPPA legal review for schools/under-13
