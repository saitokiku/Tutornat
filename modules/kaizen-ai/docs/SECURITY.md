# Security

## Auth model
Supabase Auth (email/password). The browser holds the user JWT; every API call
sends it via `Authorization: Bearer` (`authedFetch`). Server routes resolve the
caller with `getCaller()` — no cookie ambiguity, mobile-ready.

## Data isolation
Every user-owned table has `user_id` + RLS (`auth.uid() = user_id`).
Parents read linked students' reports only via `parent_student_relationships`
(status='active'). Tutors read only handoff requests. Admin access goes through
`is_admin()` (profiles.role) and is audited.

## Key handling
- `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` exist only
  in server env and are only read inside `lib/server/*` and API routes.
- Voice: browser never sees the OpenAI key. TTS is proxied; Realtime uses
  ephemeral sessions minted by `/api/voice/realtime-token` after auth +
  entitlement checks.
- Nothing secret is logged; usage metadata stores counts and model names only.

## Abuse & cost controls
- Per-plan daily limits enforced server-side from the usage ledger
  (`checkEntitlement`), returning 429 with a human-readable reason.
- Global kill switches in `app_settings` (tutor, voice, deep models,
  maintenance) — 60s server cache, admin-toggled, audited.
- Input validation on every route: message counts/lengths, transcript caps,
  syllabus size caps, enum checks.

## AI safety boundaries
- Uploaded syllabus/document content is framed as untrusted data in prompts.
- The tutor system prompt forbids completing graded work and instructs a warm
  refusal + guided first step instead.
- `safety_events` table exists for the moderation pipeline (next phase).

## Known TODOs before scale
- Per-IP rate limiting at the edge (Vercel WAF or middleware).
- Email verification enforced in production.
- Formal FERPA/COPPA review before serving schools or under-13 users.
- Move document text to Supabase Storage with signed URLs past 15KB.
