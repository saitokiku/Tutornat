# Operating system — K–8 Family Companion (COO draft v0.1)

**Status:** recommendation from the COO AI operating role (Paperclip agent `58df5105-e5f8-474a-ab79-b1414ae7b189`, assignment KAI-10), written 2026-10-02 during coordinator-delegated recovery. Not approved policy. The coordinator reconciles and activates; the owner decides product direction, taste, spend and external commitments. Product authority stays `DIRECTION.md`; shared context `company/OPERATING_BRIEF.md`; deferred risks `BACKLOG.md`. This document governs *how work is run*, never *what the product is*.

**Write scope of this document and its team:** `company/operations/**` only. Nothing here blocks or redirects the frontend build; operations runs beside it.

## 1. Owner outcomes (five, no more)

| # | Outcome the owner gets | Done means (evidence, not words) | State at this draft |
|---|---|---|---|
| O1 | Owner can open the local demo on this machine and click parent and student journeys | Documented start command; independently executed run with 0 console/page errors, no external requests, desktop + 320px screenshots in a timestamped evidence dir | Partial. Shell replay 30/30 independently executed by coordinator 2026-10-02T03:05:47Z (`company/coordinator-evidence/resume-shell-20261002T030547Z/`). Connected flow not run. Phone stale status toast and prior first-click race open. |
| O2 | Every screen passes the owner's no-AI-slop judgment on actual screens | Owner verdict per page (accept / change / reject) recorded verbatim; EN and ES; K–2, 3–5, 6–8; desktop and phone | Not started. No owner design approval exists. |
| O3 | Status is trustworthy at a glance | One `company/operations/delivery/STATUS.md` where every claim carries an evidence label, artifact path, verifier and date | Not started (Delivery Steward). |
| O4 | Pilot readiness is honest | Deferred gaps (deletion, provider retention, native Spanish, real child/consent, device, assistive tech, participant access, budget/deadline) each have state, owner and closure evidence; none certified by the demo | Not started (Pilot Readiness Analyst). |
| O5 | Owner time is protected | Owner decisions batched, each with concrete screens or alternatives; ≤2 owner-only questions per executive brief; no process work reaches the owner | In force from this draft. |

## 2. Roles and decision rights

AI operating roles, not human credentials. Names are from `company/registry.json`; the coordinator confirms IDs.

| Decision | Decides | Consulted | Informed |
|---|---|---|---|
| Product scope, direction, age bands, language scope | Owner | Coordinator | All |
| Visual / taste acceptance of a screen (gate G2) | Owner only | CTO (spec compliance first), Delivery Steward (packet) | All |
| Spend, outreach, deployment, real-family or child data, participant contact | Owner only | Coordinator | All |
| Trade-offs between slices, hiring, dispatching, closing tasks | Coordinator | CTO / COO / VP Marketing | Owner (batched) |
| Engineering spec / quality acceptance of a slice (gate G3) | CTO's independent reviewer (never the builder) | Coordinator | COO (status) |
| Demo availability is true (gate G1) | Delivery Steward verifies, CTO confirms technical cause of any red | Coordinator closes | Owner |
| Pilot readiness recommendation (gate G4 input) | Pilot Readiness Analyst drafts, COO endorses, coordinator forwards | CTO | Owner decides go/no-go |
| How work is run: briefs, gates, status, interruption recovery | COO | Coordinator | CTO, VP Marketing |
| Marketing drafts (no publishing) | VP Marketing | Owner | Coordinator |
| Pausing or restarting work | Coordinator | COO | Owner only if product-affecting |

Rules that bind every role: independent reviewers do not self-approve or close parent work; the coordinator closes work only after artifact verification; the owner judges product and visual acceptance; a historic pause is not current stop authority.

## 3. One durable board — existing surfaces only

- **Paperclip, company Kaizen Edu (`4c1a27b7-7ee3-40eb-b1b1-9fac6f961820`, prefix KAI), project “K–8 Family Companion” (`7c4420c9-173d-4940-acc7-d426f376bf53`, `http://127.0.0.1:3100/KAI/projects/k-8-family-companion-7c4420c9`, lead agent CTO `a56f0ab0-…`)** is the single durable ownership/approval board (source inspection: `company/registry.json`). Do not create a second project, a second task graph, or any new UI for tracking. The old Onboarding project and its eight issues stay untouched.
- **Hermes desktop project `p_e6f99012`** (existing, per registry) is the execution surface: coordinator-dispatched delegates, terminal, preview pane for live localhost screens. The owner judges screens there or from screenshots saved under evidence dirs; no new dashboard is required.
- **Execution route until validated:** registry shows all three executive agents “not launched in Paperclip”, heartbeats off, and an isolated delegation config with empty model/provider and no fallback providers. Until the coordinator validates that routing, Paperclip holds ownership and approvals only; actual execution is Hermes delegation from the coordinator with Fable/max and the Astra → Opus → Sol fallback. Do not let a Paperclip heartbeat run work on an unverified model route.
- **Local files** are the product, source and evidence. Paperclip issues point at paths; they never duplicate content.
- **Issue minimum fields** (put in the issue body; same text as the worker brief): deliverable path(s) · allowed writes (exclusive) · excluded paths · verification command · evidence label expected · gate served (G1–G4) · checkpoint/budget. Vague titles are not dispatchable.
- **Issue states:** open → in progress → evidence attached (worker done) → verified (coordinator or named gatekeeper ran/inspected artifact) → closed. “Worker says done” never skips to verified.
- **One issue per named deliverable**; one writer per issue; an issue that needs two writers is split by file set.
- **Timers and auto-wakes stay off** while the coordinator delegates by hand. Re-enabling heartbeats is a coordinator decision taken only after `STATUS.md` exists and has proven useful for two update cycles; no recurring heartbeat may hire, re-run tests at scale or write outside its folder.

## 4. Bounded execution — the worker prompt contract

Every dispatched prompt contains all of: objective · context pointers (paths, not summaries of summaries) · allowed writes (one exclusive folder or file set) · excluded paths · dependencies and what to do if they are missing · verification commands · artifact names · checkpoint (save a useful draft within the first three source reads; save again at mid-budget) · budget (operations roles: 10 minutes or 16 tool calls; builders: per CTO contract) · stop conditions · evidence labels to use · maximum owner questions (operations workers: 0; route through COO → coordinator) · model routing (Fable at maximum reasoning; fallback Astra, Opus, Sol; never DeepSeek) · no subdelegation unless the brief grants it.

Repair rule: at most two attempts at the same failed route, then report cause and next alternative. No completion claim from an exit code alone. A useful slice beats more process. Template and two live instances: `company/operations/TEAM_BRIEFS.json`.

## 5. Exclusive source ownership (recommended map; coordinator confirms)

| Path set | Single writer | Everyone else |
|---|---|---|
| `frontend/**`, `redesign/candidate/**` | CTO-allocated builder, one per named slice | read-only |
| `redesign/tests/**`, acceptance checklists | CTO's reviewer | read-only; builders may propose tests in their own slice folder |
| `DIRECTION.md`, `BACKLOG.md`, `PLAN.md`, `company/OPERATING_BRIEF.md`, `company/registry.json`, `company/prompts/**` | Coordinator | read-only |
| `company/operations/*.md`, `company/operations/TEAM_BRIEFS.json` | COO | read-only |
| `company/operations/delivery/**` | Delivery Steward | read-only |
| `company/operations/pilot-readiness/**` | Pilot Readiness Analyst | read-only |
| VP Marketing's registered folder | VP Marketing | read-only |
| `snapshots/**`, `evidence/**`, `company/coordinator-evidence/**`, root ledgers, old handoffs | nobody (preserved) | read-only; new runs create new timestamped dirs |

Conflict rule: two briefs needing the same file are split by file or serialized, never run together. Ownership is declared in the brief and the Paperclip issue; no filesystem locking is needed at this scale.

## 6. Evidence-based status

- Labels, used verbatim on every claim: **owner statement / source inspection / worker report / independently executed / hypothesis / not tested**.
- `company/operations/delivery/STATUS.md` holds one row per outcome (O1–O5) and gate (G1–G4): state · evidence label · evidence path · who verified · when · what remains open. No metric without its source and tested scope.
- Baseline rows at this draft: shell replay 30/30 — independently executed (coordinator, 2026-10-02T03:05:47Z), scope: shell checks only, not spec/quality/owner acceptance · Learning 73/73 — worker report, old-shell private harness · Plan 11 passed / 1 skipped — worker report, includes a retry after a swallowed phone Parent click · 320px stale status message covering another learner's content — source inspection (coordinator screenshot), open · first-click race — worker report of a retry only, not independently verified, open.
- Preserve every red result and unique evidence directory; never overwrite, rename or “tidy” old evidence.

## 7. Interruptions and escalation

**Interruption classes seen or expected:** provider connectivity loss or rate limit (ends the turn; no fallback provider is configured), machine update/restart, tool timeout killing a process owner, worker stopped mid-write, gateway down (cron does not fire).

**Recovery protocol, in order:**
1. Do not restart discovery or re-run everything. Read `STATUS.md` (or, until it exists, `company/OPERATING_BRIEF.md`) and the newest evidence dir.
2. Assume no in-flight worker finished; check for active processes and in-progress Paperclip issues before dispatching anything that writes to the same paths.
3. Resume from the last saved artifact. Workers save a draft within three reads precisely so an interruption loses at most one checkpoint.
4. Re-dispatch only with a narrowed brief that names what already exists and must not be redone.
5. Log it in `company/operations/delivery/INTERRUPTIONS.md`: when, what was running, what survived, what was lost, what was re-dispatched. The first entry is the failed first executive wave.

**Escalation ladder:** worker → lead (CTO / COO / VP Marketing) → coordinator → owner. Reaches the owner only: product direction, taste verdicts, spend, external commitments, real-family data, participant access. Everything else stops at the coordinator. Owner questions are batched, at most two per executive brief, each with concrete alternatives and, where visual, actual screens.

**Stop authority:** the coordinator pauses or stops work. A red gate stops that gate's claim, not the frontend build. A historic pause or an old rejected-frontend gate is not current stop authority.

## 8. Owner-only questions (two, both optional to answer now)

1. **Review cadence.** How much screen-review time can we plan on — e.g. one 20-minute live review per week in the Hermes preview pane (recommended), or screenshots in a folder reviewed whenever convenient? Default if unanswered: screenshot packets, no scheduled sessions.
2. **Participant access** (previously skipped; “unknown” is a fine answer). Is there at least one family or educator you could later ask to look at a local demo, or should pilot readiness keep this as “route to be established”? Default if unanswered: unknown, gate G4 stays not tested.

## 9. Recommended decisions for the coordinator

1. Treat the existing Paperclip project plus the existing Hermes desktop project as the whole tracking system; refuse any new board, dashboard or second task graph.
2. Dispatch both operations briefs in `TEAM_BRIEFS.json` now, in parallel with frontend work; neither touches source, neither waits on the frontend.
3. Keep timers and auto-wakes off until `STATUS.md` has carried two real update cycles; then decide heartbeats, if any, with a bounded cadence and no hiring rights.

Companion documents: `company/operations/RELEASE_GATES.md`, `company/operations/TEAM_BRIEFS.json`.
