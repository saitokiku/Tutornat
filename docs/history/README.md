# docs/history/

Historical decision and context records from earlier KaizenEDU attempts, copied on 2026-10-07.
**These are not current authority.** Their status claims, "current state" headings, model
choices, role/agent setups and file paths describe earlier environments and may be stale or
wrong. Current authority is `docs/PRODUCT.md` and `docs/DECISIONS.md`. Code from the same
efforts is parked in `modules/` (see `modules/README.md`).

Links inside these files are relative to their original layout and often no longer resolve. For
example, `classroom/` is now `modules/openmaic-classroom/`, `lesson/` is
`modules/lesson-engine/`, `frontend/` is `modules/prototypes/homework-companion/`, and `design/`
is `modules/prototypes/concept-explorer/`.

## hermes-handoff/

Source: the Hermes agent's export at `Tutornat/kaizen handoff from hermes/` (not git; exported
2026-10-04). It covers the work that turned the pinned OpenMAIC app into a Kaizen classroom.

| File | What it is |
|---|---|
| `HANDOFF.md` | **Start here.** What actually works, what was not delivered, confirmed gaps. Takes precedence over the other files in this folder |
| `KAIZEN_COMPLETE_HANDOFF.md` | Long consolidated work record (marked complete, historical) |
| `README.md` | The export's own README: run steps for the classroom, test command, limitations |
| `PRODUCT.md`, `DIRECTION.md` | Product definition and direction (on-demand lessons, student growth paths) |
| `DESIGN_EXECUTION.md`, `SPEC_HANDOFF.md`, `COORDINATOR_CARRYOVER.md` | First parent–student design build instructions; frozen lesson acceptance spec; concept carryover dispositions |
| `EXPORT_VERIFICATION.md` | How the export was checked |
| `delivery/fullstack/native/` | `UI_CONTRACT.md` / `UI_CONTRACT_VERIFIED.md` (OpenMAIC API/UI contract observed against the running server), `STATUS.md` (native-runtime lane at handback), `openmaic.yml` (pinned single-model candidate config; two classroom tests read it) |
| `delivery/fullstack/spec/` | `ACCEPTANCE_MATRIX.md` (full-stack acceptance rows), `CHAT_FIRST_ADDENDUM.md` (chat-first sequencing and quality) |
| `delivery/fullstack/teaching/TOOLKIT_AND_QUALITY.md` | Source-backed tutor toolkit inventory, teaching/data boundaries, per-lesson quality gates |
| `delivery/preview-native/COORDINATOR_VERIFICATION.md` | Verification of the local launcher (machine-specific) |
| `verification/quality-solo-tutor-20261004T025405Z/REVIEW.md` | Code-quality review of the single-tutor change |

## discovery/

Source: the original Hermes workspace `/Users/man/education-product-discovery` (not git;
2026-09-30 to 2026-10-03). It covers audience/product discovery, the AI "company" setup, the
connected-frontend repair cycles and the Kaizen interior redesign.

| Path | What it is |
|---|---|
| `FINDINGS.md`, `BRIEF.md`, `PLAN.md`, `EXECUTION_PLAN.md` | Verified discovery checkpoint, product brief and discovery history, discovery/design plan, execution instructions |
| `BACKLOG.md`, `DEMO_NOW.md` | Retained work and frontend-first order; how to use the connected frontend demo |
| `reports/` | Discovery role reports: architecture and repo archaeology, product and learning evidence, UX and accessibility, reliability/security/privacy/cost |
| `FRONTEND_*.md` | Specification gates, adjudications, repair-cycle plans and acceptance decisions for the connected frontend (`modules/prototypes/homework-companion`). Final status was CHANGES_REQUIRED |
| `redesign/` | Kaizen interior redesign: `ASTRA_PLAN`, `BUTTON_MAP` (Today/Schoolwork/Plan/Learn/Activity), `REFERENCE` (Kaizen-AI dashboard reference), `TEAM_BRIEF`, `TEAM_ROSTER`, `PAUSED` |
| `delivery/` | Build plan and contracts for the owner-evaluation app: `BUILD_PLAN`, `BACKEND_HANDOFF`, `MEDIA_HANDOFF`, `LESSON_METADATA_CONTRACT`, `OPUS_CACHE_PLAN`, `ON_DEVICE_VOICE_FEASIBILITY`, `kaizen-interior-extract` (Kaizen-AI token/composition extract) |
| `delivery/fullstack/research/oer-20261003/` | Verified catalogue of free/open curriculum sources (`report.md`, `sources.json`, `citation-ledger.json`) |
| `company/` | AI-role "company" drafts: operating brief, activation plan, executive session, pause/open notes, CTO decisions, COO operating system and release gates, marketing positioning, claims register, parent research kit, recovery prompts. `roles/*/ORIGINAL_AGENTS.md` are role instruction files, renamed from `AGENTS.md` so tools do not load them |

Not copied: raw evidence, logs, run state, JSON requests/decisions, snapshots and scripts from
the discovery workspace.
