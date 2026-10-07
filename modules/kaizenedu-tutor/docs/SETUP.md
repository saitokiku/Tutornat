# Setup checklist for Manny

Everything the operator has to do that a seat cannot: accounts, keys, decisions, people. Run `pnpm doctor` (or `pnpm doctor --staging`) at any point; it reports what is still missing per phase without printing secrets. Order is by the day it unblocks.

## Day 2 — spike-05 and staging

**1. Provider keys (unblocks spike-05, #5, and every tutor issue).** The keys already live in the committed `.env.local` on `main`, which is enough for local dev and for the item-bank and eval runs. They are **not** visible to the Vercel runtime (D21: functions read no repo dotfile), so paste the same names once into the Vercel project → Settings → Environment Variables, for Production and Preview: `OPENAI_API_KEY`, `TTS_OPENAI_API_KEY`, `ASR_OPENAI_API_KEY`, `GOOGLE_API_KEY`, `ANTHROPIC_API_KEY`, `TTS_ELEVENLABS_API_KEY`, and `DATABASE_URL` when the Neon project exists. Do it while rotating the keys, since they have been in git history. The alternative, if you would rather not touch the Vercel dashboard at all, is one explicit line: add `'.env.local'` after `'.env'` in `outputFileTracingIncludes` in `next.config.ts`, which ships the file inside every function bundle (the seat drafted it and left it out on purpose).

| Variable | Where to get it | Notes |
| --- | --- | --- |
| `OPENAI_API_KEY`, `TTS_OPENAI_API_KEY`, `ASR_OPENAI_API_KEY` | platform.openai.com | one key can be pasted into all three; row 1 of the spike table |
| `GOOGLE_API_KEY` | aistudio.google.com | fast live-turn candidate |
| `ANTHROPIC_API_KEY` | console.anthropic.com | stronger model for diagnose, grade, summary |
| `TTS_ELEVENLABS_API_KEY` | elevenlabs.io (optional) | the only candidate with word timing for visemes |
| `ASR_AZURE_API_KEY`, `ASR_AZURE_BASE_URL` | Azure Speech resource (optional) | the real-time ASR row |
| `DEFAULT_MODEL`, `MODEL_ROUTES` | you choose | e.g. `DEFAULT_MODEL=google:<fast model>` and `MODEL_ROUTES='{"chat-adapter":"google:<fast>","quiz-grade":"anthropic:<sonnet-class>"}'` |
| `TUTOR_MODE=1`, `NEXT_PUBLIC_TUTOR_MODE=1` | — | product routes are 404 without them |

Before the under-13 gate, each vendor's terms must pass the minors' data review (`.claude/skills/minors-privacy`, item 7). Do the review in week 1: no training on inputs, service-provider role, data-processing terms.

**2. Neon Postgres (infra-02, #2).** Create a project; copy the pooled connection string to `DATABASE_URL`. The `LISTEN` bus upstream uses is stripped, so pooled is fine.

**3. Object storage (infra-02).** Cloudflare R2 bucket (or S3): set `ASSET_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION=auto`, `AWS_ENDPOINT_URL_S3=https://<account-id>.r2.cloudflarestorage.com`.

**4. Vercel (infra-02, ops-31).** Done on your side on 2026-09-04: the project `kaizenedu` (team "saitokiku's projects") is linked to the repo, every push builds a preview (`kaizenedu-git-<branch>-saitokikus-projects.vercel.app`), and `main` is production on `kaizenedu.net` and `www.kaizenedu.net`. Deployment protection is SSO for everything except the custom domains, so a seat cannot open a preview URL; either add a "Protection Bypass for Automation" secret under Settings → Deployment Protection and paste it into the session, or accept that runtime checks happen on production after each merge. Set `ACCESS_CODE=<long random string>` on Preview only when you want the staging gate (the Stripe webhook path is whitelisted from it).

**5. Run the spike.** With the staging URL and the access code:

```bash
LATENCY_BASE_URL=https://<preview-url> LATENCY_ACCESS_CODE=<code> \
LATENCY_TTS_PROVIDER=openai-tts LATENCY_ASR_PROVIDER=openai-whisper \
pnpm latency --turns 6 --out docs/metrics/latency-$(date +%F)-row1.json
```

Paste the rows into `docs/SPIKE-latency.md`, then repeat for the other rows. Record go or no-go in `docs/DECISIONS.md`.

**6. Local spoken session.** `TUTOR_MODE=1 pnpm dev`, open a classroom, use the mic button once on desktop Chrome and once on a physical iPhone in Safari. Note what breaks in #16 to #18.

## Day 1–3 — people and decisions

- **Counsel.** Engage a children's-privacy lawyer by Day 3 (#33, #35, #36 are `needs-manny`). Send them `docs/SPEC.md` §11 and `.claude/skills/minors-privacy/references/coppa-checklist.md`. Sign-off is recorded in `compliance/signoff.md` as `counsel sign-off: YYYY-MM-DD`; nothing under 13 opens without that line.
- **Decisions to answer (defaults in `docs/PLAN.md`):** product name and domain (#28); which existing Kaizen item-bank items map to the graph, and where that bank lives (#15); price point after 10 parent conversations by Day 12 (#23).
- **Employment agreement.** Confirm invention-assignment and outside-work clauses before public launch (spec §11.1).

## GitHub (5 minutes)

- Create milestones `Gate 1 (Sep 17)`, `Gate 2 (Oct 3)`, `Gate 3 (Nov 14)` and assign issues by their `gate:*` label.
- Branch protection on `main`: require the `Invariants` and `CI` checks and one review.
- Add the Vercel GitHub integration so every PR gets a preview URL the reviewer seat can run.

## Claude Code seats

- **Lead seat:** this session. Keeps `docs/PLAN.md`, reviews plans on issues, merges.
- **Builder seats:** open a new session on the repo per `ready` issue and paste Appendix A from `docs/BUILD-PROMPT.md` with the issue number. Start with #2, #3, #4, #6, #21, #26, #29, #31, #37, #38, #19.
- **Reviewer seat:** one session that runs Appendix B on every PR.
- Each seat inherits `CLAUDE.md` and the skills automatically because they are in the repo.

## Day 7–12 (can be created any time)

| Service | Variables | Issue |
| --- | --- | --- |
| Clerk (email magic link + Google) | `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | #21 |
| Stripe (one monthly price, Customer Portal on, webhook endpoint) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY` | #23 |
| PostHog (US cloud; session replay, autocapture, surveys off) | `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | #29 |
| Sentry (Next.js project; replay off) | `SENTRY_DSN`, `SENTRY_AUTH_TOKEN` | #29 |
| Resend (verified sending domain) | `RESEND_API_KEY` | R18, later |
| Support inbox a human reads | — | Gate 1 checklist |
