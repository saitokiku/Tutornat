# Lesson library (durable archive + exact reuse)

Every lesson the tutor generates and validates is saved before the request is answered,
and an identical later request is served from that archive instead of the model.

## Where the data lives

```
lesson/.local-data/lesson-library/        # dir 0700
  <64-hex-key>.json                       # files 0600, one archived lesson each (lookup)
  <key>.<digest>.rec                      # files 0600, one per retained generation
  <recordId>.fb                           # files 0600, self-reported thumbs per version
  quarantine/<key>.<why>.<ts>.json        # records that failed revalidation
```

Outside the static allowlist and outside the deployment bundle, so nothing here is
web-reachable (`lesson-archive-partition.test.mjs` asserts the HTTP routes cannot reach
it, traversal attempts included). Override with `LESSON_LIBRARY_DIR`.

**PRIVATE, NOT PUBLIC.** The stored `goal` is free text the owner typed and may be
personal ("help me understand my diagnosis"). Treat the directory as private owner data:
do not sync it, publish it, or commit it.

## What is and is not stored

Stored per record: `v`, `id`, `key`, `generated_at`, `digest`, the validated `lesson`,
the parsed `request` (`version`, `goal`, `locale`, and `age` or `subject`+`grade`), and
the `provenance` of the call that generated it, plus `metadata` (below).

NOT stored, ever: learner nickname or name, learner answers, session ids, raw feedback.
Unexpected request fields are stripped at the request boundary, so they never reach the
archive — asserted by "no learner nickname, answer, session id or feedback is stored".
Feedback calls archive nothing.

Current model: a single private adult owner testing on their own machine. This is NOT
multi-tenant. `previous` is private adaptive context and is keyed per-request, never
shared across learners. Sharing this library between people would need per-owner
partitioning and auth that do not exist yet.

## Lesson metadata (`metadata`, schemaVersion 1)

`POST /api/lesson` returns `library: {saved, cached, id, recordId, metadata, feedback}`
on both fresh and cached responses. `recordId` is the full 64-hex record **digest** — the
immutable identity of ONE generated version. It is not `id` (the 16-char request-key
prefix) and not the cache key: feedback is per generated version, so regenerating after a
prompt change gives a new `recordId` with its own counts.

```
metadata.schemaVersion  1
metadata.createdAt      ISO-8601 UTC, when this version was archived
metadata.model          {requested, configured, reported, reportedBasis, provider,
                         endpointHost, reasoningRequested, reasoningObserved,
                         stopReason?, usage?}
metadata.timing         {generationMs}
metadata.instructions   {system, teachingGuidance, lessonPrompt, contract, hashes,
                         implementationVersion, storeVersion, recipeVersion}
metadata.device         {browser, os, type, source:'client-reported'}
```

**`model.reported` vs `model.requested`.** `requested`/`configured` are this build's own
names. `reported` is the wire name the provider itself returned, and `reportedBasis` says
which it is: `provider-reported` (proved on the wire), `derived-from-configuration` (the
outbound request's model, clearly marked — NOT a provider claim), or `unobserved`. There
is no "provider_actual" field, because nothing can prove one. `endpointHost`,
`reasoningRequested`, `reasoningObserved`, `stopReason` and `usage` are carried through
from the transport under an allowlist (`PROVENANCE_FACTS` in server.mjs) and appear only
when the transport actually reported them.

**`instructions` are the real texts.** The system prompt, the TEACHING_PROMPTS.md
sections, the rendered lesson prompt and the JSON contract that were actually sent for
this lesson, verbatim, with a SHA-256 of each plus one of the lesson body. They are the
application's teaching inputs only: never an assistant's prompts, never hidden reasoning,
never a credential or a raw provider error. The learner's free-text `goal` appears inside
`lessonPrompt` because it IS the lesson's subject — that is a reason this directory is
private owner data, not a claim it was anonymised. Generated answer keys stay (lesson
content); learner answers, nickname, profile and session data never arrive.

**`timing.generationMs`** is `performance.now()` (monotonic, immune to a wall-clock
adjustment mid-generation) measured around the actual transport call only.

**`device` is coarse, clamped and client-reported.** Three closed enumerations —
browser `chrome|edge|firefox|safari|other|unknown`, os
`macos|windows|linux|android|ios|other|unknown`, type `desktop|tablet|mobile|unknown`.
Anything unrecognised becomes `unknown` and every other key is dropped, so a raw
user-agent, an IP, a screen size or a hardware id cannot enter through this field. It is
**not authenticated hardware evidence** and it is deliberately **not cache-key
material**: the same lesson on a phone and on a laptop is one archive entry. A later
cache hit from a different device does NOT rewrite the generating request's device,
timing or `createdAt` — the record is immutable and `metadata` is inside its digest, so
an edit to it quarantines the record instead of being served.

## Self-reported helpfulness (thumbs)

`feedback` is `{thumbsUp, thumbsDown, total, reportedHelpful, semantics}` where
`reportedHelpful === thumbsUp` and `semantics` is always
`'self-reported-helpfulness'`.

**This is a self-report, nothing more.** It is NOT validated learning, mastery,
comprehension or teaching efficacy, and must never be relabelled as such anywhere in the
product. Nothing auto-increments: viewing, loading, generating or answering correctly
never moves a count. Only an explicit thumb does.

```
POST /api/lesson-rating  {adultTest:true, recordId, vote:'up'|'down'|null, voterToken}
                      -> {ok:true, recordId, vote, feedback}
GET  /api/lesson-library/<recordId>
                      -> {recordId, metadata, feedback}   (404 otherwise)
```

`voterToken` is a random 128-bit lowercase-hex value the UI mints only when someone
actually votes, scoped to one lesson version in one browser. It is **not** a profile or
account id. Only `sha256(recordId \0 token)` is stored, and only in the separate `.fb`
file — so the same browser token on two lessons yields two unrelated hashes and cannot be
used to follow one person across lessons. The raw token never touches disk and the read
route never returns voter material.

Same vote twice counts once; `up` then `down` MOVES the vote rather than accumulating;
`null` removes it; distinct tokens count separately; counts survive a restart and come
back on later cache hits. **This is local duplicate prevention, NOT authenticated
multi-user abuse resistance** — a caller can mint as many tokens as it likes. It is
adequate only because this is a single-owner loopback prototype, and it must not be
exposed publicly as-is.

Votes are written to `<recordId>.fb` (0600, write-temp-fsync-rename), never into the
lesson record: a vote therefore cannot change a lesson's digest, its `recordId` or its
cache key. `/api/lesson-rating` enforces same-origin, POST-only, the shared body-size
limit, strict `recordId`/`voterToken`/`vote` validation, and rejects an unknown
`recordId` with 404 **before any write**, so a guessed id cannot create a file.
`GET /api/lesson-library/<id>` returns metadata and counts only — no file paths, no
directory listing, no enumeration route, no voter hashes — and answers 404 (not 400) for a
malformed id so it confirms nothing about what the library holds.

## Durability: a 200 means fsynced

`save()` fsyncs the record file and then the directory before returning, and **a failed
fsync now propagates** as `LessonStoreError('LibraryNotDurable')` → HTTP 503. Previously
every fsync error was swallowed, so the route answered 200 ("durably archived") while the
bytes were only in page cache. The single tolerated case is a platform that cannot fsync
a *directory* at all, recognised by a specific errno set (`EINVAL`, `ENOTSUP`,
`EOPNOTSUPP`, `EBADF`, `EACCES`, `EISDIR`, `EPERM`) — the file fsync must still have
succeeded, so the record's own bytes are on disk either way. Error messages carry the
errno token only, never the path.

Still crash durability, not power-loss durability: it does not defeat a lying disk write
cache.

## No cloud persistence adapter

There is still no Vercel/remote store. `libraryDirFromEnv()` returns `''` under `VERCEL`
and the route fails closed with 503 `LibraryUnconfigured` rather than generating a lesson
it would silently drop. Metadata and thumbs are local-only for the same reason.

## The cache key

Exact, never fuzzy. Everything that changes what the model was asked for is key material:

| field | why |
|---|---|
| `recipe` | hash of the static contract strings + section list + store version |
| `prompt` | hash of the **complete rendered prompt** actually sent for this request |
| `system` | hash of the SYSTEM prompt |
| `implementation` | hash of the generator's own source, not just the path it runs from |
| `guidance` | hash of the selected TEACHING_PROMPTS.md sections |
| `provider`, `model`, `generator` | which source really produced the lesson |
| `version` | v1 `{subject,grade}` and v2 `{age}` are never substitutes |
| `goal`, `locale` | verbatim |
| `age` | exact year — **no age bands**, 9 and 10 are different learners |
| `subject`, `grade` | v1 only |
| `previous` | `{goal, reason}`, both load-bearing |

`recipe` alone is not enough: it covers the static contract strings, so a reworded
`lessonPrompt()`, an edited `SYSTEM`, or a rewritten bridge script would keep serving
lessons built by the old rules from an unchanged path and command. `prompt`, `system` and
`implementation` close that. All three are **hashed, never stored** — the rendered prompt
contains the owner's own goal and adaptive context, and the key must not carry a second
copy of it. The rendered prompt is built *before* the key and the same string is sent to
the model, so the thing hashed and the thing asked cannot drift apart.

`implementation` hashes the bridge entrypoint script. *Ceiling:* not its import graph —
fine while the bridge is one file.

`tests/lesson-archive-key.test.mjs` pins the key directly. That suite exists because the
end-to-end tests pass even with a field missing from the key — the cache-hit
revalidation catches the mismatch and regenerates, which is correct defence in depth but
means the HTTP tests alone do not prove the key is right.

## Serving a hit

A record is revalidated before it is served: `validateLesson` runs again, the metadata is
re-checked against the current request, the digest is recomputed, and provenance must
match this build's model and provider with a genuinely proved wire identity (see
"What a cache hit must prove"). Anything that fails is quarantined and treated as a miss,
so a corrupt, tampered or drifted record is regenerated rather than served.

Provenance on a hit is `{live: false, cached: true, generated_at, ...original identity}`.
A hit never claims a live call and never consumes the live-call budget.

## API shape

```jsonc
// miss -> generated and archived
{ "lesson": {...}, "provenance": { "live": true, ... },
  "library": { "saved": true, "cached": false, "id": "<16-hex>" } }

// hit -> served from disk, no model call
{ "lesson": {...}, "provenance": { "live": false, "cached": true, "generated_at": "..." },
  "library": { "saved": false, "cached": true, "id": "<16-hex>" } }
```

Refusals (422) and invalid replies (502) are not lessons and are not archived.

## Errors

| status | error | when |
|---|---|---|
| 503 | `LibraryUnconfigured` | no durable library on this build (refused **before** spending a model call) |
| 503 | `LibraryUnwritable` | directory cannot be opened or written |
| 503 | `LessonKeyInvalid` | a key reaching the store was not a 64-hex digest |
| 507 | `LibraryFull` | out of disk space / over quota |

All are `retryable: false` — each needs the owner to change something, and a retry just
spends another model call on the same failure. Messages carry a fixed errno token only,
never a filesystem path and never request content.

A failed write is never a 200. A lesson that could not be archived is not reported as
saved.

## Deliberately absent

- **No TTL, eviction, size cap or implicit deletion.** Nothing deletes a record.
  Retention is an unmade product decision; a cache that drops a lesson mid-session is
  worse than ~8KB per lesson of growth.
- **No node:sqlite.** It is present on this Node, but the only operations needed are
  put-if-absent, get-by-key and count, and `link()` gives put-if-absent atomically and
  immutably in one syscall — no schema, no migration, no dependence on a build flag.
  Add it when a query this cannot answer (search, list by date, retention sweeps) is
  actually required.
- **No durable library on Vercel.** The filesystem there is ephemeral, so the build
  reports `LibraryUnconfigured` rather than pretending a write survived. A real
  deployment needs a persistent DB, auth and a retention policy first.
  `VERCEL` is checked **before** `LESSON_LIBRARY_DIR`, and an explicit `libraryDir`
  argument is refused there too: every writable path in that runtime is ephemeral, so
  honouring a configured one would turn "configured" into a false durability claim. The
  only thing that counts on Vercel is an injected `lessonStore` adapter — an explicit
  decision, not an env guess.

## Atomicity, immutability and durability

Writes go to a private temp file and are then `link()`ed into place. Readers only ever
see complete files, and `link()` fails `EEXIST` instead of overwriting — so an archived
version is immutable and concurrent identical requests cannot produce two versions or a
torn record, with no check-then-write window.

The record file and the directory entry are both `fsync`ed before `save()` returns, so a
200 ("durably archived") survives a process crash. It is **not** a power-loss guarantee:
it does not defeat a lying disk write cache. Good enough for a local single-owner
library; revisit if this ever backs something that must survive a hard power cut.

### Every generation is retained

`link()` winning EEXIST means the lookup slot keeps the **first** record — that is the
immutability guarantee, and `get(key)` semantics are unchanged. But a cross-process race
where both workers genuinely called the model would otherwise throw the second real
lesson away. So each save also writes a content-addressed copy, `<key>.<digest>.rec`, in
the same directory:

- an identical re-run collapses onto the same name — no duplicate
- a genuinely different lesson for the same request survives as a second version
- `store.versions(key)` returns every retained generation, each digest-verified
- `.rec` is outside every `*.json` enumeration, so `count()` still counts archived
  lessons, not versions, and nothing is ever deleted

## Content integrity

Each record carries a `digest` over its whole meaning (`v`, `id`, `key`, `lesson`,
`request`, `provenance` — `generated_at` excluded, since it is archival bookkeeping, not
content). `get()` recomputes it and **quarantines** any mismatch rather than returning
it: a valid-shaped file whose lesson, request or provenance was edited after archiving
has the right key and the right age and would otherwise be served as authentic.

Keys are validated as 64-hex at the store boundary before being interpolated into a path,
and the rejected value is never echoed back in the error.

## What a cache hit must prove

A key match is not enough. Before a stored lesson is served it must also:

- revalidate through the same validator a fresh generation does
- match this request's dialect, age/grade, subject and locale
- name **this** build's `model` and the real upstream provider — not merely carry a
  non-empty model string, which let a foreign or corrupted model name through
- carry a wire identity that was actually proved; `model_wire_proved: true` with an
  empty or missing `model_wire` is a forged claim and is refused

An honestly **unproved** record stays archived — the owner keeps the history — it is just
never promoted to a served answer claiming an identity nobody established.

## Call accounting

`GET /api/capabilities` reports `liveCalls`: real transport invocations by this process.
A plain count — no prompt, no response, no credential, nothing about any learner. Cache
hits do not move it, which is what makes it evidence that the archive saves provider
calls rather than a claim that it does.

## Tests

```bash
node --test lesson/tests/lesson-archive-key.test.mjs \
            lesson/tests/lesson-archive-store.test.mjs \
            lesson/tests/lesson-archive-partition.test.mjs \
            lesson/tests/lesson-archive-hardening.test.mjs
```

Tests never touch the owner's real library: `libraryDirFromEnv()` returns a throwaway
directory under `NODE_TEST_CONTEXT`, unique per `createServer()` call, and the store
suite asserts the real directory is untouched at the end of the run.
