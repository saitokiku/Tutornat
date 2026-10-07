# Adversarial review — "the mastery law is unbypassable"

**Date:** 2026-08-13 · **Target:** `docs/ENGINE.md`'s central claim — a skill counts
only on **unassisted, verified, delayed, repeated** evidence; answer keys never
reach the browser; client-writable legacy tables are distrusted.

**Why this exists:** the claim had never had independent eyes, and the gap report
flagged it as a marketing claim in waiting. Four attackers worked distinct lenses
(client-state tampering, key exfiltration, assisted-work laundering, floors and
races). Every candidate finding was then handed to two further reviewers whose
instructions were to **refute** it, defaulting to refuted unless proven by code
they had personally read.

**Outcome:** 18 candidate findings → **9 survived** refutation, **9 were refuted**
unanimously. Three attackers independently found the same critical defect, which
is the strongest signal in the whole exercise.

---

## What held (the claim is mostly true, and the parts that hold are the hard parts)

Attacked directly by all four reviewers, unbroken:

- **Answer keys never reach the browser.** `publicItem` is an allowlist returning
  `{id, kind, body, choices, contextTag}` and is the *only* serializer on both
  item paths (`check.js`, `session.js`). Behind it, `kc_item` is revoked at table
  **and** column level (`revoke select (answer_spec) …`), `anchor_item` is revoked
  outright, and no API route selects `kc_item` at all. A near miss that held: the
  verifier's internal `detail` field *does* carry the key (`{got, want}`), and both
  call sites hand-pick fields rather than spreading it. CI pins the wire form.
- **No client-writable path into `evidence`, `kc_estimate`, `check_attempt`,
  `item_attempt`, or any 0015 engine table.** Insert/update/delete are revoked for
  `anon` and `authenticated` throughout; `cloud.js` writes only legacy tables, none
  of which the confirmed-mastery computation reads.
- **The confirming path is 100% deterministic.** No model sits anywhere in it.
  Client-asserted scores cannot confirm on multiple independent grounds:
  `/api/practice` lands as `kind='practice'`, `verified_by='self'`, `assisted=true`
  — rejected by `isConfirming` three times over; `/api/grade`'s model score lands as
  `chat_signal`, likewise rejected. **Prompt injection in a student answer cannot
  produce confirmed mastery**, which is the single most important thing here.
- **Grading never trusts a client-supplied item list.** `gradeCheck` iterates
  `attempt.item_ids` recorded at issue time; items missing from the response grade
  as failures, so an attempt cannot be shrunk to one lucky item.

Nine findings were refuted unanimously, including every attempt to launder the
parent-facing weekly report and the tutor brief into *confirmed* mastery: those
artifacts do read client-writable legacy tables for **prose**, but the structured
mastery numbers come from `kc_estimate`, and the reviewers judged the ENGINE.md
sentence to be about the latter. Worth a wording pass in ENGINE.md rather than a
code change.

---

## Fixed on this branch

### 1. Unlimited check issuance — *critical → high*, found independently by 3 of 4 attackers

Every delay and spacing control was enforced **only at issue time**, and issuance
was unbounded. `issueCheck` read `kc_estimate.next_check_at`, and only *grading*
moved it — so a learner could burst-issue N attempts while the gate was open, then
submit them one at a time and bank a month of spaced checks in a single sitting.
Worse, selection is deterministic, so **every pre-issued attempt held the same
items**, and the grading response echoes per-item `correct`/`outcome` — turning the
burst into a free answer oracle over a fixed key. Measured: ≤3 probe submissions
recover both keys of a 2-item MC bank.

**Fix (`0030` + `check.js`):** one live attempt per learner per KC, enforced by a
partial unique index on `check_attempt (user_id, kc_id) where submitted_at is null`
and by `issueCheck` **resuming** an outstanding attempt instead of minting a second
(a mid-check reload now returns your own check rather than an error). Stockpiling
is impossible; each submission advances `next_check_at` before another can issue;
and because `seenIds` grows from `evidence` after each submission, probed items
rotate out on the next issue.

### 2. `response.independentBlock` was client-supplied — *high → medium*, found by 3 of 4

The server decided at issue time whether the learner was in an independent block
(no hints available), handed that to the client — and then **read it back from the
client** at grade time: `Boolean(attempt.isomorph_of) || response?.independentBlock
=== true`, where `response` is `body.response` straight off the wire with no
allow-listing. One key in one request relabelled assisted work as unassisted:
double evidence weight, and — because `last_instruction_at` is derived only from
*assisted* rows — the 48-hour delay before a check may confirm collapsed to zero.
The honest client never sent the field; only an attacker had a reason to.
`requestHint` had always used server state alone, so the two paths disagreed.

**Fix (`0030` + `session.js`):** `item_attempt.independent_block` persists the
server's own decision at issue time, and grading reads that. Default `false` is the
fail-safe direction — unknown provenance counts as assisted, which under-credits a
learner rather than selling a parent an unearned mastery claim.

### 3. The post-session check delay was erasable — *medium*

`/api/tutoring/observe` writes a hard 36-hour floor after a human tutoring session
— the entire point of the return path is that the check comes *later*, so passing
it means retention rather than recall. That floor lived in `next_check_at`, which
`recomputeEstimates` overwrites from the ledger on the very next evidence append,
so an evening of practice silently pulled the check back in (~9h).

**Fix (`0030` + `ledger.js` + `observe`):** `kc_estimate.check_floor_at` is a
durable floor that recompute honours as a lower bound. Scheduling stays a pure
function of the ledger *plus explicitly recorded floors*; nothing can quietly erase
a deliberate delay.

---

## Filed, not fixed — this one needs the engine owner's decision

### Failures are costless to the mastery gate — *high*

Two properties compose into "retry until confirmed, with feedback":

- `gateMet` reads only the **5 most recent** confirming rows, and freshness counts
  **success mass only** — `counts()` adds `w*o` to successes and `w*(1-o)` to
  failures, so an outcome of `0` contributes *nothing* that could hold the number
  down. The band map then floors `confirmed` at `CONFIRM_THRESHOLD` whenever
  `gateMet`, so the PFA interior cannot veto it.
- Measured against the real estimator: **12 failing check rows followed by 6 passing
  ones returns `confirmed: 0.95, gateMet: true` — confirmed mastery at a 33%
  lifetime hit rate, with *working* mastery at 0.03%.**

Fix 1 above raises the cost sharply — probing is now serialized behind the delay
schedule and probed items rotate out — but it does not change the arithmetic: a
persistent learner who fails repeatedly and then passes five times in a row still
confirms, and their own report will say so.

**This is a product decision, not a bug with one right answer**, which is why it is
filed rather than patched. Options, roughly in order of intrusiveness:

1. Count failure mass in freshness (a failure decays the gate rather than being
   ignored).
2. Require a lifetime success-rate floor on the KC alongside the k-of-n window.
3. Require the k-of-n passes to span **distinct days** (this also re-imposes the
   spacing the law claims, independently of `next_check_at`).

Option 3 is the closest to what `docs/ENGINE.md` already promises a parent, and it
composes well with the floor introduced in fix 3.

### Smaller items, also filed

- **`/api/grade`'s `assistance_dose` derives from client-supplied transcript text**,
  so the dependency alarm that recommends a human tutor is forgeable (*note* — one
  reviewer refuted it as immaterial since the resulting row cannot confirm; the
  other let it stand because a suppressed alarm is a real safety-adjacent signal).
- **ENGINE.md overstates the "confirmed only" rule** for tutor briefs and the
  weekly report: the structured numbers honour it, the generated prose does not.
  Either narrow the sentence or stop feeding legacy tables to the brief.
- **`kc_item.context_tag` is nullable**, and the ≥2-contexts gate falls back to
  `item_id`, so a null-tagged bank manufactures fake context diversity. Not
  reachable today — both `bankInvariants` and the new `draftBank` tests fail on a
  null tag — but the DB permits what the tests forbid. A `NOT NULL` on new rows
  would close it properly.

---

## Method note

40 agents: 4 attackers, then 2 refuters per candidate finding, all instructed to
default to refuted and to treat "this only repaints client-side display state" as a
refutation. Reviewers were required to verify every cited `file:line` themselves —
several findings were downgraded (critical → high, high → medium) on exactly that
basis, and the severities above are the post-refutation ones, not the attackers'.
