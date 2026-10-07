# Kaizen AI — Architecture

## The one-paragraph version
Kaizen is a Next.js app (`web/`) that runs the complete learning loop — syllabus →
concepts → Socratic tutoring → understanding grades → SM-2 spaced repetition →
accountability dashboard — backed by Supabase (auth, Postgres with RLS) and
Claude. It degrades gracefully to a browser-local demo when Supabase isn't
configured, and every AI call is authenticated, entitlement-checked, and metered.

## Layers

```
Browser (Next.js client)
  components/*            UI (Today, Calendar, Study, Progress, StudySession, Admin)
  lib/mastery.js          SM-2 engine (pure, interpretable)
  lib/appState|store|files|chatMemory   localStorage working copy
  lib/cloud.js            sync: localStorage ⇄ Supabase (RLS-scoped)
  lib/supabaseClient.js   browser auth + authedFetch (JWT on API calls)

Next.js API routes (server)
  lib/server/context.js   getCaller (JWT verify) · entitlements · usage ledger ·
                          kill switches · audit log   [service-role key lives here only]
  lib/server/models.js    model router (fast/tutor/deep) + cost estimation
  /api/chat               streaming tutor (Claude)      metered: tutor_message
  /api/grade              0-5 understanding grade       metered: grade
  /api/parse-syllabus     syllabus → structured JSON    metered: syllabus_parse
  /api/voice              TTS proxy (OpenAI)            metered: tts_chars
  /api/voice/realtime-token  ephemeral Realtime session (no long-lived key to client)
  /api/reports/weekly     Claude-written weekly report  metered: report
  /api/handoff            human tutor request + admin email
  /api/support            support inbox
  /api/admin/*            stats · handoffs · kill switches (admin role, audited)
  /api/health             liveness + config visibility

Supabase
  supabase/migrations/0001_init.sql   full schema, RLS on every user table
  supabase/seed.sql                   plan entitlements, app settings, prompt registry
```

## Key decisions
- **Offline-first sync**: localStorage is the fast working copy; the cloud is the
  durable record. Client-generated text IDs let demo data migrate into a new
  account losslessly ("try it → sign up → keep everything").
- **Chats keyed by concept name** (stable across devices), capped at 40 messages.
- **Entitlements are server-side only** — one `checkEntitlement(caller, feature)`
  call per route; plans/limits live in `plan_entitlements` with code defaults.
- **Model router** (`fast`/`tutor`/`deep`) is env-configured; the deep tier is
  admin-killable and auto-downgraded for free plans.
- **`services/api` (FastAPI, `backend/`)** is the scale-out path: LangGraph
  orchestration, RAG with Pinecone, Celery workers. The web app's route surface
  was designed to map 1:1 onto it when traffic justifies the second deployment.

## Data model (active tables)
profiles · courses · homework_items · student_concept_mastery · mastery_events ·
tutor_sessions · documents · usage_ledger · plan_entitlements ·
human_handoff_requests · support_requests · weekly_reports · app_settings ·
audit_logs — plus forward tables (subscriptions, kaizen_reviews,
system_prompt_versions, practice_sets, safety_events, parent links) already
migrated with RLS so features land without schema churn.
