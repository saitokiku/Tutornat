# Tutornat preview deployments

Tutornat has its own Vercel project. Keep preview work here while the existing KaizenEdu site
continues to use its own repository and project.

| Setting | Value |
| --- | --- |
| Project | `tutornat-preview` |
| Project ID | `prj_HEJ7wWKkP1GZwnAzePGBfX6ybo61` |
| Scope | `saitokikus-projects` |
| Git repository | `saitokiku/Tutornat` |
| Root directory | `apps/web` |
| Framework / Node | Next.js / 24.x |
| Protected project alias | <https://tutornat-preview.vercel.app> |

The first deployment contains verified commit `ec7b776`. Vercel assigned that first deployment the
production target within this isolated project; it did not move the live `kaizenedu.net` domains.
Later branch previews have their own URLs. A branch preview does not update the project alias.

The Git integration is connected to Tutornat. After pushing a branch, check the deployment associated
with that exact commit in Vercel or the GitHub checks. Do not assume a deployment passed because a
different commit has a working URL.

For a manual preview, run from the **repository root of a clean, verified checkout**:

```sh
npm run verify
npx --yes vercel link --yes --project tutornat-preview --scope saitokikus-projects
npx --yes vercel deploy --yes --target preview --scope saitokikus-projects
```

Inspect the returned deployment and use its URL for review. The root-directory project setting
selects `apps/web`; do not link that subdirectory to the old `kaizenedu` project. Local `.vercel/`
and `.env*` files are ignored. Do not copy the old project's environment into this project.

Preview protection requires Vercel login. Authenticated command-line checks can use:

```sh
npx --yes vercel curl / --deployment DEPLOYMENT_URL
npx --yes vercel curl /api/ai/status --deployment DEPLOYMENT_URL
```

The first deployment returned HTTP 200 for the home page and `{"mode":"demo","budget":null}`
for AI status. This verifies hosting and demo mode, not a hosted browser journey or live model calls.
Production builds and browser journeys also run locally and in GitHub CI. Re-test the hosted journey
when server configuration or deployment behavior changes.

Provider benchmarks, account persistence and real-family acceptance still have their own release
gates in the [integrated learning plan](plans/2026-10-07-integrated-learning-release.md). Domain
cutover is a separate owner decision.
