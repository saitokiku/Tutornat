# Engine handoff — live-AI lesson loop

Local owner-test prototype. Node stdlib HTTP + one Python bridge to a live Fable call.
No new runtime dependencies, no database, no accounts, no server-side persistence.

## Run it

```bash
node lesson/server.mjs                 # http://127.0.0.1:51202
```

```bash
# Deterministic suite (offline, injected fake subprocess) — 63 tests
node --test lesson/tests/core.test.mjs lesson/tests/server.test.mjs

# Live provider + contract proof — spends 2 real model calls
node lesson/tests/live-e2e.mjs
```

## Verified state

| check | result |
|---|---|
| `tests/core.test.mjs` | 42/42 pass |
| `tests/server.test.mjs` | 21/21 pass |
| `tests/live-e2e.mjs` | 13/13 pass, 2 live calls, 63.8s wall |
| orphan processes after cancellation | none (`pgrep -fl ai_bridge.py` empty) |

Live run recorded in `evidence/live-e2e.json` (full lesson, feedback, provenance).

### Observed live latency — the coordinator's 300s timeout risk

| call | elapsed |
|---|---|
| `POST /api/lesson` | **41.2s** |
| `POST /api/feedback` | ~20s |

The coordinator's teaching-copy request died at a 300s bound on a *large full-plan*
input at max reasoning. The engine's prompts are bounded by construction
(`TEACHING_PROMPTS.md` is sliced to 8000 chars for lesson, 4000 for feedback), which is
why 41s not 300s. `DEFAULT_TIMEOUT_MS` is 180s — over 4x observed, under the bound that
killed the coordinator. **Latency is still the top product risk:** 41s of silence is a
long time for a child, so the UI needs a real progress affordance, not a spinner.

## Files I own

```
lesson/server.mjs              HTTP boundary, static allowlist, subprocess lifecycle
lesson/core.mjs                validateLesson / gradeAnswer / chooseNext  (shared with the browser)
lesson/ai_bridge.py            one live Fable call, tool-less, memory-less
lesson/vendor/math-expr.mjs    VENDORED from snapshots/Kaizen-AI/web/lib/mathExpr.js (attributed in-file)
lesson/tests/core.test.mjs     42 deterministic contract tests
lesson/tests/server.test.mjs   21 HTTP/subprocess safety tests
lesson/tests/live-e2e.mjs      live provider proof
```

Imported by the UI team: `GET /core.mjs` and `GET /vendor/math-expr.mjs` are served, so
the browser runs the *same* validator and grader as the server. `app.mjs`, `index.html`,
`styles.css` are allowlisted and 404 until the UI team lands them.

## Cancellation (what was actually hardened)

`run_budget_seconds` is **not** a proven hard stop, so the parent enforces the timeout:

- `spawn(..., { detached: true })` → own process group.
- Timeout fires → `process.kill(-pid, 'SIGTERM')`, then `SIGKILL` after 2s.
- Group kill is required because the bridge is `run_runtime.py` → python *grandchild*;
  signalling the direct child only would orphan a live, billing provider call after the
  client already saw its 504.
- Regression-proven: removing `detached: true` from a scratch copy turns
  `tests/server.test.mjs` red on "a cancelled generation kills the whole process group".
- Every failure is a typed JSON error with `retryable`, and the 504 message names its
  bound. The server holds no client state, so nothing is lost on failure — the browser
  keeps the lesson and the learner's answers and can retry.

## Honesty constraints wired into the code, not the docs

- **`adultTest: true` is a development acknowledgment — NOT verified age or parental
  consent.** It gates nothing but a boolean.
- **Answer keys are AI-generated, not reviewed curriculum.**
- **Local grading is canonical.** `/api/feedback` grades before it calls the model and
  serves the local verdict; a model saying "correct!" on a wrong answer cannot change it
  (proven live: `local=incorrect served=incorrect`).
- **Writing is always `ungraded`.** Never scored, and never a pass signal for growth.
- **Unparseable input is `ungraded`, never a default partial score.** No 50%.
- **`advance` is a conservative suggestion, never mastery.** It requires an unassisted
  correct verdict on the third (fresh) step. Absence of requested hints does not prove
  the learner had no outside help.
- **Health is not provider proof.** `/api/health` reports this process is up; it makes no
  claim about the provider.
- **No fallback, no synthetic lesson.** A provider failure is an HTTP error.
- **This prototype does not secure assessment against its owner.** Answer keys ship in
  the lesson JSON the browser receives. Anyone with devtools can read them. That is
  acceptable for an owner test and unacceptable for graded work.

## Provenance — what is and is not proved

```json
{"provider":"anthropic","model":"claude-fable-5-1","live":true,
 "model_wire":null,"model_wire_proved":false}
```

A live Anthropic call demonstrably happened (real 41s generation, real content, empty
fallback chain, `failure_reason: null`). **The wire model identity is NOT proved:** the
installed managed runtime does not surface the provider's own `model` field through
`run_conversation`, so `model_wire` is reported as `null` rather than echoing the
requested name back as if it were confirmation. `model` in the response is what we
*asked for*. Do not upgrade this claim without a transport-level capture.

## Known gaps

1. `model_wire_proved: false` — see above. Needs a wire capture to close.
2. `TEACHING_PROMPTS.md` is **absent** (coordinator's first Fable attempt timed out).
   The server reads it when present and runs built-in prompts when not. The live lesson
   in `evidence/live-e2e.json` was generated **without** it, so nothing here claims Fable
   teaching-copy provenance. Dropping the file in changes prompts with no code change —
   but re-run `live-e2e.mjs` to confirm the added input does not push latency toward the
   bound that killed the coordinator.
3. All three visuals in the live lesson came back `fraction`. The contract allows four
   kinds and validates all four; the model just did not vary them. Prompt-side issue.
4. The 12-call-per-start budget is per process, not per day. Restarting resets it.
5. One global in-flight slot, not a queue (`ponytail:` noted in source). Fine for one
   owner; a second user gets a 429.
6. Numeric equality uses a 1e-9 relative tolerance so `1/3` matches `0.333…`. That is a
   display tolerance, not partial credit.
