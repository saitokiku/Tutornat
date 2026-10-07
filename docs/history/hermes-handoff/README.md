# Kaizen education — source handoff

This is a fresh-history, private handoff of the current working source. It is **not a production-ready release**. Start with [HANDOFF.md](HANDOFF.md), not historical status headings.

## What is here

- `classroom/`: complete pinned OpenMAIC application plus the current Kaizen routes, native Anthropic adapter, fixes and tests. Upstream commit: `5312c2b4b4bcb2e7db07cacabcdac8bfddc827fa`.
- `DIRECTION.md`, `PRODUCT.md`, `DESIGN_EXECUTION.md`: product direction and design context; historical implementation claims may be stale.
- `delivery/fullstack/`: integration source, specifications, toolkit inventory and browser-test source. Raw evidence, authenticated browser state and runtime data are intentionally omitted.
- `lesson/`, `frontend/`, `design/`: earlier lesson engine, dashboard/design work and their source/tests, retained for reference rather than silently discarded.
- `EXPORT_MANIFEST.json`: SHA-256 inventory of copied files and export exclusions.

Upstream license and notices remain in `classroom/LICENSE` and their original locations. The upstream license is not a new blanket license grant over the owner's project additions.

## Run on another machine

Prerequisites: Node.js >=22.19.0, pnpm 10.28.0, and PostgreSQL (or Docker for the included development database). No Hermes installation is required for the standard Next.js application.

1. Enter `classroom/` and install the pinned workspace:
   ```sh
   cd classroom
   npm exec --yes --package=pnpm@10.28.0 -- pnpm install --frozen-lockfile
   ```
2. If you need a local development database, start a separate Compose project:
   ```sh
   OPENMAIC_DB_PORT=55432 docker compose -p kaizen-handoff-db -f docker-compose.db.yml up -d --wait postgres
   ```
   This uses the upstream development credentials and a new volume, not the original machine's database. Do not expose this development database publicly.
3. Copy `.env.example` to `.env.local`. Set `DATABASE_URL` for your database. With the development command above, the upstream local-only default is `postgresql://openmaic:openmaic-dev@127.0.0.1:55432/openmaic`.
4. Configure your own server-side provider credential. To retain the candidate's existing native Anthropic model policy, set `OPENMAIC_CONFIG=../delivery/fullstack/native/openmaic.yml` and `ANTHROPIC_AUTH_TOKEN` to your own compatible Anthropic API credential in `.env.local`. The variable name is historical: the adapter distinguishes OAuth tokens from ordinary API keys. No credential is included in this repo. Model availability must be checked against your account.
5. Start the app on loopback:
   ```sh
   npm exec --yes --package=pnpm@10.28.0 -- pnpm dev --hostname 127.0.0.1 --port 3000
   ```
   Open `http://127.0.0.1:3000/kaizen`. The library starts empty because learner data and generated lessons were not exported.

The retained candidate policy pins `claude-opus-5` and locks media/search/document slots off. That is the current implementation, **not full OpenMAIC parity**. For deliberate configuration changes, consult `classroom/openmaic.example.yml` and the upstream `classroom/README.md`; server-assigned settings are locked in the UI. Do not silently add fallback providers.

Do not use `delivery/fullstack/native/launch.mjs` as the portable entrypoint: it is retained for provenance/tests and depends on the original machine's Hermes credential resolver and absolute paths. Use the standard Next.js commands above with your own credentials. OAuth renewal on a different machine is not configured by this export.

## Tests and limitations

From `classroom/`, after installation:

```sh
npm exec --yes --package=pnpm@10.28.0 -- pnpm exec vitest run tests/classroom/kaizen-solo-tutor-selection.test.ts tests/kaizen-ui-*.test.ts tests/server/anthropic-oauth-*.test.ts tests/server/native-opus-*.test.ts
```

These are targeted offline regression tests, not full product acceptance. Historical browser harnesses need a running app, a locally created owner context and a compatible Playwright browser; their old absolute paths and omitted evidence files must be adapted. No browser session, API key, local environment file or database dump is shipped.

See `HANDOFF.md` for what actually works, what remains broken and where to continue.
