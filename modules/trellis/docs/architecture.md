# Architecture boundary

Derived from the PM's September 12 [ARCHITECTURE](https://github.com/gokumann-pm/pm/blob/main/vault/40-projects/kaizenai-saas/ARCHITECTURE.md)
and [ENGINE-CONTRACT](https://github.com/gokumann-pm/pm/blob/main/vault/40-projects/kaizenai-saas/ENGINE-CONTRACT.md).
Accepted later ADRs govern. These are intended boundaries; runtime implementation is pending.

| Path | Intended role | Present contents |
|---|---|---|
| `app/` | One Next.js/React mobile-first website and server adapters | Boundary note |
| `lib/tutor/` | TypeScript session, teaching, practice and report logic | Boundary note |
| `db/` | PostgreSQL schema/migrations and restricted assessment authority | Boundary note |
| `tests/engine/` | Offline synthetic engine and adversarial evidence tests | Acceptance pointer |
| `reference-implementations/` | Pinned, non-runtime legacy material by origin | Two selected files per source plus licenses/manifests |

## Authority boundaries

Document intake preserves sources, uncertainty and corrections. Learner estimates
and teaching policy choose helpful practice. Teaching execution records relevant
help/exposure. A separate assessment authority owns qualifying attempts and evidence;
reports derive claims from that evidence. Scheduling and human review remain separate
from tutor-generated answers. Persistence supports the engine before full backend design.

## Stack direction

Reuse TypeScript, Next.js/React and PostgreSQL with `pg` from the reviewed architecture.
Preserve useful voice/session behavior through narrow adapters. Model/provider choice,
assessment hosting and queue library remain qualification/design work. The first
worker pins only the dependency closure it actually needs; no legacy monorepo manifest,
provider registry, install hooks or deployment configuration has been adopted here.

The broader extraction study is available locally at
`/Users/mann/pm/shared/artifacts/kaizen-research/07-extraction-boundary.md`.
Its renderer group has unresolved provenance. Preserve board-action contracts and use
an offline test adapter until a licensed rendering boundary is established. E1 needs
no full UI, paid service, real learner, cloud database or credential.

Reference files are outside the active source folders. Every future compiler, test,
package and deployment configuration must explicitly exclude that directory. The
copied SQL is historical reference and is not an executable migration chain.
