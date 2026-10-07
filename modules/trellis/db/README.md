# PostgreSQL authority seam for A and B

ADR-0066 selects this `e2` schema, its four capability roles and these SQL
functions as the shared seam. A/B call it after rebasing; their provisional
`kz_*`, `e2a` and `e2b` authorities are replaced. Product routes are not wired by
part C. Only synthetic, offline fixtures are used here.

Run `node db/migrate.cjs` after preparing the database with
`sh tests/engine/pg/up.sh`. See [the runner](../tests/engine/pg/README.md) and
[native evidence](../tests/engine/pg/EVIDENCE.md). Migrations are forward-only,
transactional, advisory-lock serialized and SHA-256 recorded. Repeat runs skip
unchanged files; `--reapply` reruns idempotent DDL; changed historical checksums
fail. `--down` refuses history destruction. External harness cleanup is separate
and removes only the fixture schemas/roles recorded as created by that run.
Numbering is the merge order: `0007_dual_key_approval.sql` (issue #17) precedes
`0008_item_presentations_approved.sql` (issue #10), so a database migrated from
`main` after #17 applies this branch's file after the two-key rule.

## Exact SQL API

The core functions return **jsonb**. Argument names, order, types and defaults:

```sql
e2.issue_attempt(p_learner text, p_item text, p_item_version text,
  p_operation text, p_session text, p_scorer text, p_scorer_version text,
  p_rule text DEFAULT 'e2-draft-1') RETURNS jsonb

e2.submit_attempt(p_learner text, p_attempt uuid, p_response jsonb)
  RETURNS jsonb

e2.finalize_attempt(p_learner text, p_attempt uuid, p_response jsonb,
  p_score jsonb) RETURNS jsonb

e2.record_exposure(p_learner text, p_skills text[], p_version text,
  p_operation text, p_session text, p_payload jsonb, p_provenance jsonb,
  p_rule text DEFAULT 'e2-draft-1') RETURNS jsonb

e2.append_practice(p_learner text, p_skill text, p_version text,
  p_operation text, p_session text, p_payload jsonb, p_provenance jsonb,
  p_rule text DEFAULT 'e2-draft-1') RETURNS jsonb
```

| Function | EXECUTE roles | Return and retry contract |
| --- | --- | --- |
| `issue_attempt` | `assessment` | Full `e2.attempts` row as JSON, including server UUID `id`, `state`, frozen item/key/rubric/skill/scorer/rule versions, session, issue time/order and exposure sequence. Same learner/operation returns the stored row; different issue arguments for that operation fail. Requires approved, nonrevoked item and rubric. |
| `submit_attempt` | `learner`, `assessment` | Full attempt row with the first fixed `response`, `submitted_at` and `state='submitted'`. An identical response retry returns the current row (possibly already finalized); a changed response fails. |
| `finalize_attempt` | `assessment` | `{attemptId,evidenceId,qualifying,reasons,certification,ruleVersion}`. Atomically stores that result, one evidence row and its projection. Same attempt/response returns the stored first result even if a retry supplies a different score. A conflicting response fails. `certification` is always `none`. |
| `record_exposure` | `tutor`, `assessment` | Full `e2.exposure_events` row, including `id`, canonical `skill_ids`, `skill_version`, per-skill `causal_sequences`, `received_at`, payload/provenance and rule version. Same learner/operation and exact canonical arguments return the stored event; conflicting arguments fail. |
| `append_practice` | `tutor`, `assessment` | Full `e2.evidence_events` row with `operation_id='practice:' || p_operation`, `class='corrections-practice'` and `qualifying=false`, regardless of payload claims. Same learner/operation and arguments return the stored event; conflicting arguments fail. |

The `report` role has no mutation entry point. No application role may directly
write qualifying evidence, attempts or projections. The internal `e2_writer`
NOLOGIN role owns fixed-search-path SECURITY DEFINER functions and remains
subject to RLS; never grant it to callers. The migration owner and assessment
scorer are trusted boundaries. A score is a JSON object whose `correct` must be
boolean `true` to qualify; this substrate does not validate scorer quality.
Missing resources raise `P0002`, conflicting operations/responses or invalid
states raise `P0001`, and forbidden capabilities raise `42501`.

## Lock order and transaction boundary

Every mutation starts with `e2.lock_skills` internally: deduplicate skill IDs,
sort by PostgreSQL `COLLATE "C"` (UTF-8 byte order), and for each skill acquire
`pg_advisory_xact_lock(hashtextextended(array_to_json(ARRAY[household,learner,skill])::text,0))`,
then create/lock its `e2.skill_guards` row `FOR UPDATE`. Skill version is omitted
from the key, so exposure spans revisions. JavaScript's matching key is
`JSON.stringify([household, learner, skill])`; `barriers.cjs` provides it for tests.

After those locks, submit/finalize lock the attempt row; exposure updates/latches
in-flight attempt rows. Issue locks item then rubric content guards before
inserting an attempt. Finalize locks the existing attempt then item and rubric
content guards. Content guards use shared transaction advisory locks on
`['e2-content',household,kind,id,version]` followed by their guard row; owner-only
revocation takes the matching exclusive advisory lock and updates its guard.
It does not acquire skill/attempt locks. Callers must not take attempt-row locks
before invoking these functions, or introduce a competing lock protocol.

Use one SQL operation per transaction. `transaction`/`withTransaction` retries
SQLSTATE `40001` and `40P01` (default: serializable, three retries). Compute scores
outside its callback; the callback can repeat. Stable operation IDs must survive
request retries, including loss of the commit acknowledgment. SQL results are
committed only when the outer transaction commits.

Eligibility uses issue time, never scoring completion time. Relevant assistance
from issue through finalization latches the attempt. Assistance after a completed
result leaves that history intact and affects future attempts. `append_practice`
does not itself record assistance: callers must also use `record_exposure` when
help was delivered. Delay, approval/revocation, familiarity, response and score
checks happen inside finalization.

## Provision a synthetic household

Run this as the migration owner after migrating. These dedicated login bindings
use the PM cluster's local trust configuration; this is not production auth.
`e2.household_id()` resolves **session_user** through protected `e2.principals`.
A custom GUC or changing `current_user` cannot choose a different household.
Never use the superuser owner connection as a product caller.

```sql
INSERT INTO e2.households(household_id,timezone)
VALUES ('h1','America/Chicago') ON CONFLICT DO NOTHING;
INSERT INTO e2.learners(household_id,id)
VALUES ('h1','demo-learner') ON CONFLICT DO NOTHING;
DO $$ DECLARE capability text; principal text; BEGIN
  FOREACH capability IN ARRAY ARRAY['learner','tutor','report','assessment'] LOOP
    principal := 'e2_h1_' || capability;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname=principal) THEN
      EXECUTE format('CREATE ROLE %I LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS',principal);
    END IF;
    EXECUTE format('GRANT %I TO %I',capability,principal);
    INSERT INTO e2.principals(login,household_id) VALUES(principal,'h1')
      ON CONFLICT(login) DO NOTHING;
  END LOOP;
END; $$;
```

Each connection authenticates as its `e2_h1_<capability>` login and issues
`SET ROLE <capability>`. Existing logins must already have only that capability
and the intended binding; do not reassign an existing principal to another tenant.
The harness's owner-only `provisionPrincipals(admin)` provisions and sanitizes
both `h1` and `h2` test logins after household rows exist. It is fixture setup,
not a runtime provisioning API. A/B can use distinct tenant login names with the
same binding pattern.

Under the two-key rule (migration 0007, below) an `approval='approved'` item row
is not enough for `issue_attempt`, for `finalize_attempt` (reason
`content_not_approved`; restored by migration 0014 after 0010/0011 had dropped
the predicate) or for the `item_presentations` view (0014): all three read the
`approve_item` decision, so an attempt issued before the upgrade is refused at
finalization with zero authored keys. The native proofs (`npm run test:pg`) also
provision two `author` logins per household (`e2_h1_author`, `e2_h1_author2`,
and the `h2` pair), give every issuable fixture item a canonical stem
(`2 + 2`) and an exact numeric key, then key it once per author through
`e2.author_key` and record the decision through `e2.approve_item`. The fixture
asserts the outcome is `approved`. The helper runs on the owner connection with
`SET LOCAL SESSION AUTHORIZATION <author login>` so a clone created inside an
owner transaction (the c6 clock-boundary cases) is keyed and approved in that
same transaction; that is a superuser fixture device, not a runtime path.
The draft item stays unkeyed, so its refusal remains the content-approval one.

The example below assumes `demo-learner`, approved item `demo-item` version `1`
(and its approved rubric/key/skill), and rule `e2-draft-1` have been seeded for
`h1`. Invoke from the repository root. This 20-line caller example issues,
submits and finalizes, then records subsequent help; supplying help before
finalization instead would disqualify the in-flight attempt.

```js
const { connect, transaction } = require('./tests/engine/pg/harness.cjs');
const { randomUUID } = require('node:crypto');
async function example() {
  const assessment = await connect({ household: 'h1', role: 'assessment' });
  const learner = await connect({ household: 'h1', role: 'learner' });
  const tutor = await connect({ household: 'h1', role: 'tutor' });
  const issueId = randomUUID(), exposureId = randomUUID(); // Persist for retries.
  const response = { answer: 4 }, score = { correct: true }; // Offline scorer.
  const call = (c, sql, args) => transaction(c, async tx =>
    (await tx.query(sql, args)).rows[0].value);
  try {
    const attempt = await call(assessment, 'SELECT e2.issue_attempt($1,$2,$3,$4,$5,$6,$7) AS value',
      ['demo-learner', 'demo-item', '1', issueId, 'demo-session', 'offline-scorer', '1']);
    await call(learner, 'SELECT e2.submit_attempt($1,$2,$3) AS value', ['demo-learner', attempt.id, response]);
    const result = await call(assessment, 'SELECT e2.finalize_attempt($1,$2,$3,$4) AS value', ['demo-learner', attempt.id, response, score]);
    await call(tutor, 'SELECT e2.record_exposure($1,$2,$3,$4,$5,$6,$7) AS value', ['demo-learner', [attempt.skill_id], attempt.skill_version, exposureId, 'demo-session', { kind: 'hint' }, { source: 'synthetic' }]);
    console.log(result);
  } finally { await Promise.all([assessment, learner, tutor].map(c => c.end())); }
}
example().catch(error => { console.error(error); process.exitCode = 1; });
```

`e2-draft-1` stores provisional rule parameters. Projections retain contributing
independent-success IDs with `certification='none'`. Full context/day-seven
certification, delivery capture, scheduling, route integration remain A/B/E3 work; the round-4 rebuild seam is documented below. E1 uses separate `e1_fixture_*` schemas;
its legacy practice persistence defects remain explicitly disclosed by the
unchanged suite. Those compatibility tables are not this authority schema.

## Assessment offers — sixth signature (round 3)

```sql
e2.offer_transition(p_learner text, p_skill text, p_kind text,
  p_offer uuid, p_reason jsonb) RETURNS jsonb
```

Owner: `e2_writer`; EXECUTE: `tutor`, `assessment`, `learner`. `report` can read
its household's ledger, but cannot call the function. All callers lack direct
INSERT/UPDATE/DELETE/TRUNCATE privileges. The function returns the full
`e2.assessment_offers` row. `kind` maps `offer/take/restart/escalate` to
`offered/taken/restarted/escalated`. `p_offer` must be NULL for offer/escalate,
and the offered row's UUID for take/restart.

`p_reason` must be an object with a nonempty string `operationId`. Persist it
across retries. Optional `ruleVersion` defaults to `e2-draft-1`; all other fields
are caller context. The original JSON is frozen in `request`; `reason` adds
server-derived facts, overriding any matching caller fields. `provenance`
records the login and function. The operation key is household + learner +
operationId. Exact retries return the current stored row, including `open=false`
if that offer was subsequently closed. Changing kind, skill, target or request
for the same operation raises `P0001`. Distinct operations competing for an open
offer or for a closed offer also raise `P0001`; callers can read the ledger to
recover the existing offer. `P0002` means missing learner, offer or rule in the
bound household; `42501` means forbidden capability/principal.

Every new transition takes the shared skill advisory/guard locks, then locks its
target offer. It increments the guard's causal sequence, making stale
repeatable-read/serializable transactions retry with `40001`. The 48-hour floor
comes from `rule_versions.parameters.delayHours`, at PostgreSQL microsecond
precision. Eligibility uses transaction time (`now()`, matching B); keep
transactions short. A later exposure sequence permanently invalidates that
offer, even after the new quiet window elapses. A refused take raises `P0001`
with `help_after_offer` or `quiet_window_not_elapsed` plus JSON error DETAIL.
It does not persist a restart while throwing: the caller can commit a separate
`restart` operation, which appends its row and closes the offer atomically.
An unchanged sequence cannot restart an offer. A completed take retry remains
valid after later help.

Offer/escalate recheck practice priority from corrections-practice evidence:
boolean `correct=true`, with boolean `assisted=false` or absent. The version's
`quietWindowReps` defaults to 10 and `escalationDays` to 14 when absent in older
rules; escalation cannot be below 14 days. The threshold rep supplies priority
time and causal sequence. At or beyond that duration, with the quiet window
still blocked and no take since priority, escalate stores an explanation and
plan. Native takes/restarts are ordered against priority by causal sequence,
not their transaction timestamps. Escalation is an explanation, never credit.

Ten-line caller, assuming ten clean practice reps and an elapsed quiet window;
`offerOp` and `takeOp` are stable request IDs supplied by the caller:

```js
const { connect, transaction } = require('./tests/engine/pg/harness.cjs');
async function check(learnerId, skillId, offerOp, takeOp) {
  const c = await connect({ household: 'h1', role: 'learner' });
  const sql = 'SELECT e2.offer_transition($1,$2,$3,$4,$5) AS value';
  const run = (kind, id, operationId) => transaction(c, async tx =>
    (await tx.query(sql, [learnerId, skillId, kind, id, { operationId }])).rows[0].value);
  try { const offer = await run('offer', null, offerOp);
    return await run('take', offer.id, takeOp);
  } finally { await c.end(); }
}
```

Migration 0003 retains B's ledger names and three partial unique indexes. It
adds operation/request/provenance and causal-sequence columns, rule and scoped
offer foreign keys, a truncate refusal, and a close trigger that compares every
column except `open` (including household, rule, identity sequence and nullable
fields). B's interim INSERT and UPDATE(open) grants are revoked. Its provisional
rows can be adopted transactionally without changing original columns: they get
`legacy:<id>` operation keys and explicit `B-provisional-fixture` provenance.
Their causal sequence is only the preserved exposure snapshot; only those
legacy rows retain timestamp-based priority accounting. Fresh migrations and
all new function writes have full causal provenance. B must replace its direct
ledger writes with this signature and supply stable operation IDs; this round
does not edit B's scheduler.

## Part A interface additions (round 4)

```sql
e2.rebuild_projection(p_learner text, p_skill text DEFAULT NULL) RETURNS jsonb

e2.expire_attempt(p_learner text, p_attempt uuid) RETURNS jsonb
e2.cancel_attempt(p_learner text, p_attempt uuid) RETURNS jsonb

e2.queue_practice_check(p_learner text, p_skill text, p_version text,
  p_check text, p_session text, p_rule text DEFAULT 'e2-draft-1') RETURNS jsonb

e2.practice_check(p_learner text, p_skill text, p_version text,
  p_operation text, p_session text, p_payload jsonb, p_provenance jsonb,
  p_rule text DEFAULT 'e2-draft-1') RETURNS jsonb
```

All five functions are owned by `e2_writer`, use a fixed `pg_catalog` search path,
apply household RLS, and take skill locks internally. Internal helpers remain
unavailable to application roles.

| Function | EXECUTE roles | Contract and caller |
| --- | --- | --- |
| `rebuild_projection` | `assessment` | A's projection/revocation workflow calls this after a content withdrawal. Returns an array of full projection rows, sorted by skill, skill version, and rule version. NULL skill rebuilds all retained partitions for the learner. Missing learner gives `P0002`; an empty learner returns `[]`. |
| `expire_attempt`, `cancel_attempt` | `assessment` | A's expiry/cancellation workflow supplies learner and attempt UUID. Transitions `issued` or `submitted` to `expired`/`cancelled`, appends its audit event, and returns the full stored attempt. Same terminal transition retry returns that row; a different terminal transition gives `P0001`. No evidence is written. Finalization after either transition fails `P0001`. No automatic TTL policy is introduced. |
| `queue_practice_check` | `tutor`, `assessment` | A's practice issuance path registers its existing check ID and session before presenting the check. Returns an immutable `practice_checks` row. Same session/check ID and scope returns the original row, including after consumption; conflicting scope gives `P0001`. At most one unconsumed check per learner/session/skill may be queued. |
| `practice_check` | `tutor`, `assessment` | A's practice answer path sends its scored payload with a nonempty string `checkId`, stable operation ID, session, and provenance. Returns `{ok:true,evidence:<full row>}` or `{ok:false,code:'NO_PENDING_CHECK'}`. It re-reads the queue after acquiring the skill lock and consumes it by appending one uniquely linked `corrections-practice`, `qualifying=false` evidence row. A second answer or retry after consumption returns `NO_PENDING_CHECK` and appends nothing. |

The explicit rebuild entry point lets A commit the owner-side withdrawal, then
call rebuild as assessment in a new transaction. A revocation trigger that also acquired skill locks
would reverse the established skill-before-content order. Inserting a revocation
and rebuilding in the same transaction has that same inversion; keep these
operations in separate transactions. Rebuild preserves the
immutable qualifying decision made under **each evidence row's own rule version**;
it never rescores evidence or applies the latest rule to old rows. It groups by
that rule and skill version, filters revoked item **or rubric** versions, and
retains empty projection partitions with zero contributors. Contributing IDs
remain ordered by causal sequence and ID. The evidence, original final result,
and historical audit rows remain unchanged. Finalize also uses this rebuild,
so a later result cannot restore withdrawn contributors. Certification remains
`none`. Content guards are acquired in a common sorted order before finalization
or rebuilding; stale serializable/repeatable-read work retries through the harness.

The practice queue is an immutable authority record in `e2.practice_checks`;
consumption is the unique `evidence_events.practice_check_id` link. A must replace
its application-side lock and compatibility-table write with the queue/answer
calls. This round supplies the seam and does not edit A's route. Score before the
transaction; use `harness.transaction` for each function call. Serializable
competitors may first receive `40001`; the transaction helper replays the call,
which then returns `NO_PENDING_CHECK`. A lost acknowledgment is recovered by
reading the linked evidence row, not by issuing a new check. Malformed check or
operation IDs give `22023`; a pending check with the wrong rule or a reused
operation for a different check gives `P0001`. Plain `append_practice` remains
available for non-check practice records and cannot consume queued checks.

```js
const { connect, transaction } = require('./tests/engine/pg/harness.cjs');
const db = await connect({ household: 'h1', role: 'tutor' });
// IDs and scoring come from A; keep them stable across network retries.
const call = (sql, args) => transaction(db, async tx =>
  (await tx.query(sql, args)).rows[0].value);
await call('SELECT e2.queue_practice_check($1,$2,$3,$4,$5) AS value',
  [learnerId, skillId, '1', checkId, sessionId]);
const result = await call('SELECT e2.practice_check($1,$2,$3,$4,$5,$6,$7) AS value',
  [learnerId, skillId, '1', operationId, sessionId,
    {checkId, correct: score.correct}, {source: 'synthetic'}]);
await db.end();
```

Every new attempt state transition now appends exactly one `e2.attempt_events`
row with state, server timestamp, snapshot, login provenance, and monotonic event
order. Issue/submit/finalize gives `[1,1,1]`; retries and assistance-latch updates
append no state event. The table is append-only even for owner UPDATE/DELETE/
TRUNCATE and has forced household RLS. Application roles have SELECT only.
Migration 0004 reconstructs existing issued/submitted/finalized events from
retained timestamps and labels them `migration-0004-reconstructed` with
`snapshotUnavailable=true`; it does not invent historical snapshots.

### Owner-only deterministic fixture clock

```sql
e2.set_fixture_clock(p_clock timestamptz) RETURNS void
```

Owner and EXECUTE: migration owner only. `e2.operation_clock()` is an internal
helper executable by `e2_writer`. Fixture mode defaults to disabled; the clock
value defaults to NULL. On a synthetic fixture database, the migration owner
opts in by updating the protected singleton `e2.fixture_control.enabled` and
must have its usual household principal binding for calls to tenant functions.
Both control tables have forced RLS and no application grants. For example:

```sql
BEGIN;
UPDATE e2.fixture_control SET enabled=true WHERE singleton;
SELECT e2.set_fixture_clock('2026-01-01T00:00:00Z');
-- Call record_exposure, advance the clock, then issue/submit/finalize.
SELECT e2.set_fixture_clock('2026-01-03T00:00:00Z');
ROLLBACK; -- also rolls back the fixture opt-in and all synthetic rows
```

The setter uses `set_config('e2.fixture_clock', value, true)` (`SET LOCAL`) and
records the current transaction ID and backend in protected metadata. The helper
honors the GUC only in that authorized transaction when the session login is the
migration owner and it has not assumed an application role. PostgreSQL custom
GUC reads do not reveal whether a caller used SET or SET LOCAL, so setting the
GUC alone never enables the hook. A session-level value cannot authorize a later
transaction. Passing NULL restores real time. Ordinary application logins and
an owner connection using `SET ROLE assessment` always receive server time,
regardless of forged GUCs. Issue, submit, exposure, evidence, projection and audit
timestamps use the hook; `offer_transition` retains its documented transaction
`now()` semantics from round 3.

## Dual-key content boundary (E3-K, migration 0007)

```sql
e2.author_key(p_item text, p_item_version text, p_key jsonb, p_provenance jsonb)
  RETURNS jsonb
e2.approve_item(p_item text, p_item_version text, p_operation text,
  p_provenance jsonb) RETURNS jsonb
```

Owner: `e2_writer`; EXECUTE: the `author` capability role only. `learner`, `tutor`,
`report` and `assessment` cannot author or approve keys (`42501` by grant), cannot
write `e2.item_keys` or `e2.item_approval_events`, and cannot read stored keys.
`author` cannot issue, submit or finalize attempts and cannot read `e2.items`.
The author identity is **`session_user`**, resolved through `e2.principals` like
every tenant call; it is never a parameter. Provision two author logins per
household with the same binding pattern as the capability logins
(`GRANT author TO e2_h1_author`; the assessment suite provisions
`e2_<h>_author` and `e2_<h>_author2`).

`author_key` stores one key per author per item version, append-only. The same
key retried returns the stored row; a different key from the same login raises
`P0001` (a corrected key is a new item version); a missing or other-household item
raises `P0002`; keys after approval raise `P0001`.

`approve_item` takes the item content lock, then decides and **always appends one
`e2.item_approval_events` row** — `outcome` is `approved` or `refused`, with
`reasons`, both `authors`, the canonical `agreed_key` and the gate's
`content_verdict`. A refusal never raises: the audit row is the refusal. The same
`p_operation` returns the stored decision; an approved item version stays approved
(one approved row, enforced by a partial unique index) and further calls return it.
Reasons, in the order recorded:

| Reason | Meaning |
| --- | --- |
| `key_not_exact_rational:<login>` | that author's key is not an integer, `p/q` or finite decimal (`e2.key_rational`) |
| `fewer_than_two_authors` | fewer than two distinct logins supplied an exact-rational key |
| `keys_disagree` | the exact-rational keys are not one value |
| `stored_key_disagrees` | `items.answer_key` (the grading key) is not the agreed value |
| `content_gate_disagrees` | `e2.evaluate_stem` produced a value different from the agreed key |

Exact-rational semantics are those of `content-check.ts`: `e2.exact_rational` is
arbitrary-precision `numeric` with a gcd loop, so `0.25`, `2/8` and `1/4` agree and
`9007199254740992 + 1` is exact; `1e5`, `1/0`, words and repeating decimals are
not rationals. `e2.evaluate_stem` is the ADR-0067 grammar in SQL — NFKC refused
when it creates a digit, whitespace, one whole-stem LaTeX pair, one lead phrase,
one trailer, one outer parenthesis pair, then exactly `ATOM OP ATOM` — and returns
`{value, why, path}` with the same `path` steps as the TypeScript gate. Where it
evaluates the stem, disagreement refuses; where it abstains (`not_canonical_stem`,
`evaluator_error:division_by_zero`, …) the verdict is recorded as `abstained` and
does not block. The service's own gate still runs at grading, so an approved
abstention still fails closed there.

`issue_attempt` raises `P0001` "content is not approved under the two-key rule"
for any item version without an approved event, after the existing column,
rubric and revocation checks; `finalize_attempt` folds the same test into
`content_not_approved`. Revocation is unchanged (`e2.content_revocations`).
`e2.item_approvals` is the report view: item, both `authors`, `approved_by`,
`approved_at`; readable by every application role; it carries no key, and the
`agreed_key`, `reasons` and `content_verdict` columns are not granted to them.

Ten-line caller, two author connections and one operation ID kept across retries:

```js
const { newClient, transaction } = require('./tests/engine/pg/harness.cjs');
async function approve(itemId, version, key, opId) {
  const authors = [];
  for (const login of ['e2_h1_author', 'e2_h1_author2']) {
    const c = await newClient({ user: login }); await c.query('SET ROLE author'); authors.push(c);
  }
  const call = (c, sql, args) => transaction(c, async tx => (await tx.query(sql, args)).rows[0].value);
  try {
    for (const c of authors) await call(c, 'SELECT e2.author_key($1,$2,$3,$4) AS value', [itemId, version, key, { source: 'synthetic' }]);
    return await call(authors[0], 'SELECT e2.approve_item($1,$2,$3,$4) AS value', [itemId, version, opId, { source: 'synthetic' }]);
  } finally { await Promise.all(authors.map(c => c.end())); }
}
```

`FixtureDb.transaction(fn)` in the E1 PostgreSQL adapter queues whole callbacks
on its single worker connection, commits the result, or rolls back and propagates
the original error. A failed queued transaction does not poison the next one.
The adapter preload can run unchanged E1 sources at another checkout with
`E1_PG_SUITE_ROOT`; `E1_PG_RESULT_PATH` redirects only its emitted result JSON,
keeping that scratch checkout clean. `reproduce.cjs` makes a detached scratch
worktree at A's `b176c81`, runs its full E1 suite with C's current adapter, verifies
an empty git status, then removes only that scratch worktree.

## Constraints recorded from the E2-C review (issue #10)

### Migration owner must be superuser or BYPASSRLS

`e2.principals` and `e2_migrations.applied` are created with `FORCE ROW LEVEL SECURITY`
and carry no policy. Only a superuser or a role with `BYPASSRLS` can read them. If the
migration owner is an ordinary role, `e2.household_id()` cannot resolve the caller's
principal, returns NULL, and every tenant read and write fails closed. The recommended
production shape is a dedicated owner role with `BYPASSRLS` only (no `SUPERUSER`), used
for migrations and principal provisioning and never handed to a product route.

### Learner identity within a household is caller-asserted

`p_learner` on `issue_attempt`, `submit_attempt`, `finalize_attempt`, `record_exposure`
and `append_practice` is trusted within the bound household: the schema proves the
household boundary, not which learner inside it is speaking. Product routes (E4) must
bind the learner from the authenticated session, never from the request body. This is
E4's constraint; it is recorded here because the seam cannot enforce it.

## E13 qualification (issue #18)

ADR-0064 is **PROPOSED** in the product record used for this build. The rule stays
`e2-draft-1`, and the database still enforces `certification='none'`, including
when all E13 conditions are satisfied. `qualifying` on an individual evidence
row continues to mean an eligible independent success; it does not certify the
skill. Existing independent-success counts and old final results are preserved.

Household account provisioning requires an IANA `timezone`. Owner-side INSERT
validates it and records creation in `household_timezone_events`; an UPDATE of
the timezone records old/new values, server time, login and rule version. Invalid
zones are refused with `22023`. That ledger is append-only and tenant-filtered.
Application roles gain no provisioning or timezone-write capability.

`finalize_attempt` now also returns and freezes `qualificationState`,
`qualificationReasons`, and `qualification`. States mean:

- `pending`: no first success, the retention window is closed, or relevant help
  currently blocks another check. Reasons identify each missing condition.
- `eligible`: the retention window is open and the exposure delay has elapsed;
  a qualifying retention check is still needed.
- `qualified`: the retained anchor and a later success satisfy the two-day,
  different-family, different-context and retention-window requirements. This
  is protocol qualification only; draft certification remains `none`.

The first success **recognized by finalization** freezes the anchor. Its time
is the immutable server `submitted_at` (response receipt), never client time,
issue time or grading completion. Attempt evidence records that receipt in
`received_at`; `attempts.finalized_at` still records actual finalization time.
Out-of-order grading does not move an already-established anchor. The household
zone at that first success is frozen for the skill/version/rule cohort, so later
audited timezone changes do not reinterpret old evidence; new cohorts use the
new household zone. Local dates, including DST boundaries, use that frozen zone.

The anchor's local date is day 0. A response received on local days 6–9 inclusive
can provide retention evidence. Day 5 23:59 and day 10 00:00 remain in
`evidence_view`, with `payload.e13.localDayOffset` and `retentionInWindow=false`.
Only an eligible independent success can supply retention. Anchor and retention
items must have nonempty, different `family_id` **and** `context_tag`. Repeated
family or tag contributes one context and records `repeated_family`. Prior item
issuance in any state still disqualifies unfamiliarity across item versions.
The existing exposure ledger supplies the >=48-hour server-time requirement;
help during an attempt still latches it permanently. Relevant exposure now also
refreshes existing qualification partitions in its transaction; other skills
are unaffected. All locks remain inside the SQL seam.

`rebuild_projection` returns the new `qualification_state`,
`qualification_reasons`, and `qualification` fields. Report callers can read
`e2.qualification_projection`; A's `readProjection` does so. The legacy
`report_projection` column contract remains intact for migration reapplication.
`qualification_events` records every changed state/reason/fact snapshot,
including its rule, prior state and server time. Unchanged rebuilds append
nothing. Finalized results stay immutable; rebuild reflects current withdrawals.
A revoked anchor cannot count or move the window. Historical evidence without
E13 protocol facts remains visible but cannot be upgraded by rebuilding.
Time-driven pending/eligible transitions are materialized by assessment calling
`rebuild_projection` (for example when considering a scheduled check).

Reproduce using the existing PM server, isolated synthetic databases, no server
startup and no changes to other workers' schemas:

```sh
sh tests/engine/harness/with-pg17.sh node tests/engine/pg/qualification.cjs --base
sh tests/engine/harness/with-pg17.sh node tests/engine/pg/isolated-run.cjs node tests/engine/pg/qualification.cjs
sh tests/engine/harness/with-pg17.sh node tests/engine/pg/isolated-run.cjs node tests/engine/assessment.cjs
sh tests/engine/harness/with-pg17.sh node tests/engine/pg/isolated-run.cjs node tests/engine/exposure-pg/run-pg.cjs
sh tests/engine/harness/with-pg17.sh node tests/engine/pg/isolated-run.cjs sh tests/engine/pg/e1-run.sh --mode head
npm run -s typecheck
```

`--base` loads literal migration SQL from commit
`ba8302771dd85a6e91525f0673542021b2cf804b` into its own fixture database and is
expected to fail the new E13 assertions. The eight familiarity/48-hour controls
already pass there. Fixture databases are dropped only by the runner that
created them; the server itself is never started, stopped or reconfigured.
