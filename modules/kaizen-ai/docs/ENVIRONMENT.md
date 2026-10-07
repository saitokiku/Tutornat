# Environment variables

See `web/.env.example` for the authoritative list with comments. Rules:
- `NEXT_PUBLIC_*` are shipped to the browser — only the Supabase URL and anon
  key belong there (both are safe-by-design; RLS is the boundary).
- Everything else is server-only. The service-role key and AI keys are read
  exclusively inside `web/lib/server/*` and API routes.
- No env var is required for the app to boot; missing keys produce explicit
  "not configured" states, never crashes or fake successes.
