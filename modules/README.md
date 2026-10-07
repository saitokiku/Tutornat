# modules/

This is parked source from earlier attempts at KaizenEDU, collected so future work can happen
from Tutornat alone. **Nothing here is imported or built by `apps/web`**, and none of it is a
pnpm/npm workspace of the root. Each folder keeps its original layout, tests and toolchain, and
says in its own README how to run it standalone. Wire pieces in deliberately, one at a time, per
`docs/ROADMAP.md`. Port and adapt the code; do not import across the `modules/` boundary.
Product authority is `docs/PRODUCT.md` and `docs/DECISIONS.md`. Historical context is in
`docs/history/`.

All folders were copied on 2026-10-07. The copies exclude dependencies, build output, env files
(only `.env.example` kept), keys, logs and `evidence/` output. Source repos were not modified.

| Folder | Source + commit | What it is | Best-reuse pieces | Phase |
|---|---|---|---|---|
| `openmaic-classroom/` | Hermes export `classroom/` (no git), export 2026-10-04; OpenMAIC 1.1.1 @ upstream `5312c2b4b4bcb2e7db07cacabcdac8bfddc827fa` | Complete OpenMAIC Next.js app + small Kaizen delta (`app/kaizen`, `components/kaizen`, `lib/kaizen`, `soloTutor`) | `ClassroomSurface`/stage, `@openmaic/*` packages, generation pipeline; Kaizen solo-tutor selection and generation handoff. **Do not ship the Claude Code OAuth adapter** | OpenMAIC stage |
| `kaizenedu-tutor/` | `saitokiku/KaizenEdu` @ `c73a0e168686525cc6318ff6a575e3fb1ad65c60` (2026-09-30) | Owner-written "Natural Tutor" layer only (built on OpenMAIC 1.0.0); upstream patches kept separately | `lib/tutor/{turn,session,prompts,checks,model,safety,voice}`, `components/tutor/session`, `kaizen.config.ts`, `compliance/`, invariants and evals | Tutor & voice |
| `kaizen-ai/` | `saitokiku/Kaizen-AI` @ `91af9e452c7df5867afa7249a6dc58b00003f531` (2026-09-03) | Next.js 16 JS + Supabase dashboard app with the "magic box" intake (also club/billing/marketplace, out of scope) | Design tokens, `components/ui/*`, dashboard shell, `IntakeBox` + `lib/intake*.js`, `lib/engine/**`, `lib/grades.js`, `lib/mathExpr.js`, `lib/prompts.js` | Backend (intake, schema reference); design baseline |
| `trellis/` | `saitokiku/trellis` @ `41999b5dd49e5549662da8c5b42c0bb8bbe8804a` (2026-09-19) | Postgres-enforced "practice ≠ mastery" tutor engine with schema `e2`, SQL write path, and Next.js 15 demo | `db/migrations` + `migrate.cjs`, SQL function API, role-per-pool pattern in `web/lib/db.ts`, `lib/tutor/{checks,exposure,model}` | Backend |
| `lesson-engine/` | Hermes export `lesson/` (no git), 2026-10-03 | Vanilla Node/browser lesson engine: local grading, lesson archive, animated scenes, local voice | `core.mjs`, `vendor/math-expr.mjs`, `scenes.mjs`, pure first ~740 lines of `app.mjs` | Tutor & voice; OpenMAIC stage (scenes) |
| `prototypes/` | Hermes export `frontend/`, `design/`; `education-product-discovery/redesign/{candidate,handoffs,reference}` (no git), 2026-09-30 – 10-01 | Four zero-build browser prototypes: homework companion, concept explorer, Kaizen redesign candidate, Kaizen-AI shell reference | Redesign candidate's Plan/Learn views, reference shell render, `domain.js` state model | Reference |

## Cautions that apply across folders

- Several folders hardcode paths from the original machine (`/Users/man/...`, `/Users/mann/...`)
  or depend on a Hermes runtime. Each README lists them.
- `kaizenedu-tutor/` and `openmaic-classroom/` target different OpenMAIC versions (1.0.0 and 1.1.1).
- Agent-instruction files were renamed so tools do not auto-load them as instructions:
  `ORIGINAL_CLAUDE.md` in `kaizen-ai/` and `kaizenedu-tutor/upstream-patches/`, and KaizenEdu's
  `.claude/skills/` → `kaizenedu-tutor/skills/`.
- Status claims inside copied docs are historical and may be stale.
