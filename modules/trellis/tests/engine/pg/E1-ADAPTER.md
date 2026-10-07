# E1 suite on PostgreSQL

The adapter runs the existing `tests/engine/run.cjs` through the `Queryable`
surface in `lib/tutor/db/index.ts`. Neither the suite nor its case assertions is
edited. This compatibility fixture is separate from E2's authority schema and
does not establish E09, assessment authority, household isolation, or repaired E2
finalization. In particular, the unchanged E1 case
`c3_concurrent_duplicate_disclosed` expects E1's inherited practice duplicate.
E2's barrier tests exercise the new assessment protocol separately.

Reproduction from the repository root with the pinned offline driver and the
PM-owned PostgreSQL cluster:

```sh
set -a
. /Users/mann/pm/run/pg17.env
set +a
sh tests/engine/pg/up.sh
node tests/engine/pg/e1-test.cjs
sh tests/engine/pg/e1-run.sh --mode head --out-suffix pg
sh tests/engine/pg/down.sh
```

`e1-test.cjs` exercises native JSON extraction, `bool_or`, integer casts, the
fixture clock, raw named bindings, append-only trigger negatives with a later
successful insert, equal-time insertion ordering, and access after closing the
adapter. `e1-run.sh` runs the sixteen original E1 cases, including their practice
positive controls and the suite inside the actual packed archive. These commands
require the real server; an unavailable connection is an error, with no SQLite
fallback. Round 2 executed both commands over TCP on PostgreSQL 17.11:
**native adapter controls passed; E1 head passed 16/16**, including its packed
archive. See [the literal evidence](EVIDENCE.md).

The preload substitutes the CommonJS cache entry for E1's fixture module. It
prints server-observed `version()`, `current_user`, `session_user`, schema,
driver version, and the unchanged suite's SHA-256. The suite's original header
still contains its literal `node:sqlite (not PostgreSQL)` label; the additional
metadata identifies the actual preloaded adapter without rewriting that header
or any assertion. The nested packed suite loads its own packed adapter and
inherits `PGHOST`/`KAIZENEDU_PG_URL` in external mode. In managed mode it receives
the original fixture's absolute Unix socket through `E1_PG_FIXTURE_SOCKET`; that
override accepts only a real directory ending in `/tests/engine/pg/socket`.
External mode ignores the socket override.

The connection starts as the configured synthetic owner (`kaizen_owner` on the
PM cluster, `e2_owner` in managed mode) to create a
fresh `e1_fixture_<pid>_<sequence>_<random>` schema, then uses the dedicated `e1_fixture`
role for E1 setup and statements. This role owns the compatibility schema;
it is intentionally not one of the four E2 authority roles. Each FixtureDb owns
one real `pg` connection in a worker. The worker bridge preserves the old
synchronous `raw.exec`, `raw.prepare`, `rows`, `evidence`, and `mastery` fixture
helpers while `query` retains its Promise and the E1 before/after hooks. A failed namespace creation does not own the pre-existing schema; the collision
fixture attempts that failure and then reads the original rows. Normal
process exit drops fixture schemas and closes their clients. Abnormal process
termination can leave fixture schemas until the isolated cluster is removed.

## Dialect delta

| SQLite fixture behavior | PostgreSQL fixture behavior |
| --- | --- |
| Removes `::jsonb`, `::timestamptz`, `::text`, numeric casts | Executes native PostgreSQL casts unchanged |
| Changes `GREATEST` and `bool_or` to SQLite `max` | Executes the native functions unchanged |
| Stores JSON as TEXT and decodes selected result fields | Stores JSON as JSONB; raw fixture helpers receive JSON text, while Queryable rows decode the same fields |
| Converts booleans to 0/1 integers | Uses PostgreSQL BOOLEAN |
| Stores timestamps as TEXT | Uses TIMESTAMPTZ and returns ISO strings, matching E1's fixture API |
| Replaces `now()` and injects evidence `ts` from `db.time` | Uses a schema-local `fixture_now()` reading the bound `e1.fixture_time` setting; evidence `ts` defaults to it |
| Orders fixture evidence using SQLite `rowid` | Orders by `fixture_order`, an identity column omitted from the public fixture rows |
| Accepts repeated named raw fixture binds such as `$skill` | Maps raw fixture bind names to PostgreSQL positional parameters; Queryable `$1` parameters pass through |
| Uses SQLite `RAISE(ABORT)` evidence triggers | Uses a PostgreSQL BEFORE UPDATE/DELETE trigger raising SQLSTATE `55000` |

The fixture clock exists solely to replay E1's synthetic dates. It is not E2's
trusted clock or a claim about production timing. E2 migrations live under
`db/migrations`; E1's compatibility tables live only in `e1-schema.sql`.
