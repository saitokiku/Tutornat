# SPEC_HANDOFF.md — frozen lesson acceptance spec

Authored by the independent spec pass. The spec was written from the owner
requirement **before** any lesson implementation file was read. Everything here
is ready to run; **nothing in the acceptance register has been executed against
the product yet** except the PURE tier noted in §4.

## 1. Frozen artifacts and hashes

```
fb9136910372820928ba4ceb05542a015654011a7fd912d6f31fe03106fd6016  lesson/SPEC.md   <- THE SPEC
8bd6b1f81ce8565b3d2d4d76a454faf0c50b8cd36b1d33fd2922a35d4c5a6a7f  verify/harness.cjs
bff4910972e4133cc46add58560a220dd2048c13eae87bb497c33d1911425c9b  verify/core.test.mjs
6d8e5b610e71973973a70d1f503eef167028f68e50721293cb38517ab33fd164  verify/engine.test.mjs
01b906367f6f9977cc19bca97b0b8966f1611aa77d5dae4315c902b7663f4ab5  verify/ui.mechanics.spec.cjs
1d5f910303cff16c10d5620d60f4a1ff8b1745f4b8a3f9947e188eea62ad5c14  verify/ui.live.spec.cjs
2eb92ff3310120deaff456af07cd96a460dd8911cb454d2ce139f968ba7d277d  verify/playwright.lesson.cjs
515b669fbe7eb1e0ba6ce95833e3d79711b2bd6e578a5537a0e15265b61b5af4  verify/report.mjs
```

Re-verify: `shasum -a 256 lesson/SPEC.md verify/*.cjs verify/*.mjs`

Owned by this pass: `lesson/SPEC.md`, `verify/`, `SPEC_HANDOFF.md`. Nothing else
was created or modified. No app file, no builder test, no provider call.

## 2. Independence statement

At first inspection `lesson/` contained only `PLAN.md` and `evidence/`. `lesson/PLAN.md`
was deliberately **not read**. The spec's 76 checks derive from the owner requirement
and the FIXED CONTRACT only.

Implementation files (`core.mjs`, `server.mjs`, `app.mjs`, `index.html`, `ai_bridge.py`)
appeared **while the spec was being written** and after `lesson/SPEC.md` was already on
disk. The only implementation contact since: executing the PURE suite against
`core.mjs`'s three exported functions as black-box callables (§4). No implementation
source was read, and no assertion was authored or altered with knowledge of it.

## 3. Commands

All **UNEXECUTED** unless §4 says otherwise.

```sh
cd /Users/man/education-product-discovery

# PURE — no server, no provider, no browser.  (EXECUTED, see §4)
node --test verify/core.test.mjs

# ENGINE — operator must have the server up at 127.0.0.1:51202 first.   UNEXECUTED
RUN_DIR=verify/runs/$(date -u +%Y%m%dT%H%M%SZ) node --test verify/engine.test.mjs
#   E16/E17 additionally need ALLOW_LIVE=1 and spend 2 provider requests.

# FIXTURE — client mechanics, every /api/* intercepted.                 UNEXECUTED
cd devtools/browser
RUN_DIR=../../verify/runs/$(date -u +%Y%m%dT%H%M%SZ) \
  npx playwright test -c ../../verify/playwright.lesson.cjs ui.mechanics

# LIVE — real provider, 7 requests. Refuses to run without ALLOW_LIVE=1. UNEXECUTED
RUN_DIR=../../verify/runs/$(date -u +%Y%m%dT%H%M%SZ) ALLOW_LIVE=1 \
  npx playwright test -c ../../verify/playwright.lesson.cjs ui.live

# Verdict
cd /Users/man/education-product-discovery && node verify/report.mjs verify/runs/<dir>
```

`report.mjs` exits 0 ACCEPT / 1 REJECT / 2 PARTIAL. The harness never starts the
server (it is provider-capable — operator's call) and installs nothing.

Live budget: 7 (LIVE) + 2 (E16) = 9 of the 12-per-start cap, leaving 3 for one retry.
`retries: 0` so a flake cannot silently burn the cap. Optional E18 (cap exhaustion)
needs its own fresh server start.

## 4. Executed so far — PURE tier only, 13 of 14 PASS

Run against `lesson/core.mjs` as a black box, mid-flight, so results are **provisional**;
the coordinator must re-run against the final frozen source.

| Result | Checks |
| --- | --- |
| PASS (13) | S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12, S13, N1 |
| FAIL (1) | **S14** — needs adjudication, see §5 |

Everything else — all 17 ENGINE, 34 FIXTURE, 10 LIVE — is **UNEXECUTED**. Against no
server the ENGINE suite correctly recorded 17 `UNEXECUTED` and **zero PASS**: the
empty-vs-empty vacuous pass that sank the last organizer spec cannot occur here.

Harness self-verification (all executed):
* All 8 files pass `node --check`.
* N1 canary: the 49-case malformed table produces 49 failures against a no-op validator.
* A forged run of all-PASS-with-empty-`observed` → 76 `VACUOUS`, verdict REJECT, exit 1.
* A forged run with LIVE ids passed at `tier: FIXTURE` → REJECT, "a fixture may not stand in".

## 5. S14 — one real finding, needs your adjudication

`chooseNext(lesson, [{...verdict:'correct', assisted:false, source:'ai-feedback'}])`
returns **advance**. SPEC.md requires **reinforce**.

The FIXED CONTRACT's reinforce rule says "reinforce unless fresh check correct without
requested help" — it never mentions `source`. SPEC.md took the stricter reading because
"local numeric/choice grader canonical" implies a model's own `correct` must not by itself
unlock advancement; otherwise a model asserting `verdict: "correct"` promotes the learner
with no local check ever having passed.

Two defensible resolutions — a judgement call, not a defect I should decide:
1. **Spec is right** → `chooseNext` should also require `source === 'local-check'` (small change).
2. **Contract is right** → `source` is informational; relax S14 and document that an
   `ai-feedback` verdict can advance.

The assertion was **not** weakened to match the code. It is isolated as its own ID so the
other 13 checks report cleanly either way.

One contract ambiguity also surfaced: `grade K|1..8` mixes a string literal with numbers,
so `3` and `'3'` are both legal readings. The harness probes which form `validateLesson`
accepts and records it (`S1.observed.grade_form`) rather than asserting one. Worth pinning
in the contract.

## 6. What a full pass would and would not establish

Not certified by any run of this spec, and must not be claimed (SPEC.md §0 verbatim):
K–8 curriculum alignment, learning efficacy or mastery, non-reader/early-K usability,
device breadth, assistive-technology conformance, native-Spanish quality, child safety or
child readiness, provider reliability, production readiness. `locale=es` (L9) is recorded
**plumbing only**.

Seven gaps are not black-box verifiable and are handed to the code-quality review that
follows this pass (SPEC.md §7): **G1** real subprocess timeout/kill, **G2** no-fallback,
**G3** server-side local-grade primacy (M13/M14 prove only the client), **G4** provider
non-consumption on rejected requests, **G5** bounded provider output, **G6** no child
tool / memory context / content logging, **G7** credential handling beyond "not served
and not credential-shaped" — verified without ever reading a credential value.

## 7. Notes for the next pass

* **Locators**: `verify/harness.cjs`'s `L` map is the single adapter seam and is *expected*
  to need edits to match the build (role-first, `data-testid` fallback). Editing `L` is
  allowed; editing or weakening an assertion to make it pass is a spec violation — report
  the failure instead (SPEC.md §4).
* Every check records `{id, tier, layer, status, observed}` to `results.jsonl`. `layer`
  makes the client/server/core attribution explicit, so a FIXTURE pass is never mistaken
  for server evidence.
* FIXTURE checks intercept `/api/*` and constrain the **client only**.
* M6 (timeout) waits 35 s by design; the config allows 120 s per test.
* Traces and screenshots contain page content — keep local, do not upload. Invented data only.
