<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: vault/30-decisions/ADR-0065-postgres-is-a-pm-owned-service-sandboxes-connect.md -->

---
title: "ADR-0065 — PostgreSQL is a PM-owned machine service; sandboxed workers connect, never initdb"
tags: [adr, handler, kaizenedu, fleet, dispatch]
project: handler
date: 2026-09-17
decided_by: pm
status: accepted — executed 02:09 CDT; amended 02:15 CDT (Claude sandbox opened to the cluster)
---
# ADR-0065 — PostgreSQL is a PM-owned service

## What happened
E2-A (Fable, seatbelt) and E2-C (Astra, seatbelt) both tried `initdb` inside their worker sandbox
and were refused: `shmget(...): Operation not permitted`. PostgreSQL always creates a 56-byte
System V shared-memory segment as its data-directory interlock; the sandbox denies SysV IPC
outright. No bypass was attempted by either worker, which is correct. A's brief said "prove on
PostgreSQL before review"; C's said "create the cluster under `tests/engine/pg/data`" — both
impossible as written. A shipped its PG claims as claims and said so.

Outside the sandbox, `pg_ctl start` failed too — `postmaster became multithreaded during startup`
— the macOS/Homebrew trap the brew caveat warns about: the postmaster needs `LC_ALL` set to a
valid locale. With `LC_ALL=en_US.UTF-8`, the PM's cluster came up and A's own cluster script
worked.

## Decision
1. **The PM owns one running PostgreSQL 17 cluster** on this machine: `PGDATA=run/pg17`, port
   `5433`, `127.0.0.1` only, superuser `kaizen_owner`, trust auth on localhost, started with
   `LC_ALL=en_US.UTF-8`. It is infrastructure like the shared npm cache, not a worker artifact.
2. **Workers never `initdb` or `pg_ctl`.** They source `run/pg17.env` and connect over TCP;
   they create roles, schemas and databases with SQL, namespaced by part (`e2a_*`, `e2b_*`,
   `e2c_*`), and tear their own objects down. Harnesses take host/port/user from the environment
   and refuse to start a server.
3. **Reviewers use the same cluster**, so a PostgreSQL claim can be reproduced blind from inside
   the seatbelt.
4. Every dispatch pack that mentions PostgreSQL carries this paragraph; the E2 packs (#3, #4, #5)
   were amended at 02:10 CDT.

## Amendment 02:15 CDT — how each engine reaches the cluster
E2-B (Fable) reported that the Claude worker sandbox refused even a TCP connect to 127.0.0.1:5433:
its `network.allowedDomains` was github/npm/pypi/crates only. A sandboxed probe (`claude -p` with
`.claude/worker-settings.json`) proved the fix: **`allowedDomains` + `localhost`, `127.0.0.1`;
`allowLocalBinding: true`; `allowUnixSockets: ["/Users/mann/pm/run/pg17/.s.PGSQL.5433"]`** → `psql`
over TCP and over the socket both succeed from inside the seatbelt. `node -e` is refused by the
*permission* gate (not the sandbox); harnesses run node on files, which is allowed. Codex workers
already have `sandbox_workspace_write.network_access=true`. So every worker and reviewer, on either
engine, reaches the one PM-owned cluster; nobody starts a server. The previous settings are kept at
`run/worker-settings.before-localhost.json`.

## What this does not settle
Nothing about production: this cluster proves application behaviour, roles, RLS, grants and
concurrency semantics locally; deployment authority is a later decision. The PM cluster is
started by hand tonight; a launchd job for it is a follow-up (pm#49).

Links: [ADR-0062-fable-and-astra-mixed](ADR-0062-fable-and-astra-mixed.md) · fleet-dispatch *(PM vault: `45-areas/fleet-dispatch`)* · [202609170007-background-exec-drops-stdin-use-a-prompt-file](../history/notes/202609170007-background-exec-drops-stdin-use-a-prompt-file.md)
