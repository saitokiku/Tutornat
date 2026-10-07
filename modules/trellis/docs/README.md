# The product record

Everything decided, researched and still open for this product, as of **2026-09-16**.

The bootstrap notes ([requirements](requirements.md), [architecture boundary](architecture.md),
[first build](first-build.md), [engine acceptance](engine-acceptance.md)) are short instructions to
the first builder. This directory is the record behind them: the specification, the decisions with
Manny's own words attached, the research that overturned several of our own claims, and the grill
that produced the product definition in the first place.

Source of truth for changes is the Handler PM vault (`gokumann-pm/pm`, `vault/`). These files are
synced copies — edit the vault, then re-sync. Every file carries its origin in an HTML comment on
line 1.

## Read in this order

1. **[Direction](product/direction.md)** — why, priorities, non-goals, in Manny's quoted words.
2. **[Spec v0.3](product/spec.md)** — what we are building, school-first. A design draft; the accepted ADR clauses inside it govern.
3. **[The whole machine](product/architecture-whole-machine.md)** — the Homework → Repair → Prove loop, assembled, written because Manny asked to be shown the big picture instead of a dozen separate decisions.
4. **[Engine contract](product/engine-contract.md)** and **[engine-first plan](product/engine-first-plan.md)** — the build order: engine verification before frontend, backend and deployment.
5. **[Drift](product/drift.md)** — every deviation from spec and direction, why, who approved it.

## Decisions

Fourteen ADRs govern this product. [ADR-0034](decisions/ADR-0034-kaizen-v1-definition.md) is the
definition; the rest amend it.

| ADR | What it settles |
|---|---|
| [0033](decisions/ADR-0033-kaizen-is-the-active-product.md) | Kaizen becomes the active product program |
| [0034](decisions/ADR-0034-kaizen-v1-definition.md) | AI tutor alone, parents buy direct, national, online |
| [0041](decisions/ADR-0041-efficacy-is-a-north-star-not-a-gate.md) | Human-tutor parity is an ambition, never a gate and never a claim |
| [0042](decisions/ADR-0042-practice-buys-the-exam-seat-never-the-grade.md) | Practice earns access to assessment; only unassisted delayed evidence certifies |
| [0043](decisions/ADR-0043-the-learner-needs-us-less.md) | **Superseded** — a compass whose optimum is a learner who left |
| [0044](decisions/ADR-0044-launch-13-plus-under-13-fast-follow.md) | **Superseded** three minutes later by 0045 |
| [0045](decisions/ADR-0045-coppa-from-day-one.md) | COPPA from day one; the household is the unit, not the learner |
| [0046](decisions/ADR-0046-crisis-statutory-floor-no-invented-promise.md) | Meet the statutes; delete the promise we invented |
| [0047](decisions/ADR-0047-kaizen-price-two-tiers.md) | Price |
| [0049](decisions/ADR-0049-k2-k4-k5-fired-early.md) | K2, K4 and K5 answered |
| [0051](decisions/ADR-0051-name-is-trellis.md) | Trellis chosen — **and then blocked on clearance; see below** |
| [0053](decisions/ADR-0053-kaizenedu-engine-first-preserve-both.md) | Engine first; both inherited histories preserved |
| [0055](decisions/ADR-0055-school-first-engine-build.md) | Primary and elementary lead; adults are a later product |
| [0059](decisions/ADR-0059-product-repo-under-the-pm-account.md) | This repository is the build home; both `saitokiku` repos are read-only graft sources |

## Research, and what it overturned

Research is kept because it corrected us, not because it agreed with us.

| Report | What it established |
|---|---|
| [01 method](research/01-method.md) · [digest](research/README-digest.md) | Sources, fetch log, blocked hosts |
| [01 rails and market](research/01-rails-and-market.md) | Supplemental-education money rails; seven corrections to the inherited strategy |
| [02 efficacy correction](research/02-efficacy-correction.md) | **The 0.44 / 0.08 pair appears in no original table.** We had spliced a preprint figure beside a published one. The comparison is human tutoring online vs in person — never AI |
| [03 minors launch gates](research/03-minors-launch-gates.md) | Provider terms forbid under-18 use of the model the code is wired to; five state companion-chatbot laws already enacted |
| [06 evidence integrity (RO-5)](research/06-evidence-integrity.md) | **Seven reproduced paths by which our own tutor can forge a mastery record.** Open |
| [07 extraction boundary (RO-6)](research/07-extraction-boundary.md) | Exactly which inherited files come across, and which must not |
| [ro6 license inventory](research/ro6-license-inventory.md) | Dependency and upstream licence accounting for the extraction |
| [11 verified content sources](research/11-verified-content-sources.md) | Reviewed sources for the first content band |
| [12 name candidates](research/12-name-candidates.md) · [13 Kaizen clearance](research/13-kaizen-edu-us-clearance.md) · [14 Trellis clearance](research/14-trellis-us-clearance.md) | **Both chosen names are blocked** — see below |
| [Second opinion](research/second-opinion.md) | Nine wrong figures in our own earlier research, not seven; the record is plumbing, not a moat |
| [North-star stress](research/northstar-stress.md) | Eighteen ways to inflate a retention metric, each with a structural defence that binds any future metric |
| [Wedge replan](research/wedge-replan.md) · [grill questions](research/grill-questions.md) | The wedge, and the questions that were put to Manny |
| [Inherited repo index](research/inherited-repo-index.md) · [Kaizen-AI](research/inherited-kaizen-ai.md) · [KaizenEdu](research/inherited-kaizenedu.md) | What is actually in the two source repositories |

Raw primary evidence is **not** vendored here — see [where the evidence lives](research/EVIDENCE.md).

## How the product was defined

- **[The grill, 2026-09-11](history/2026-09-11-grill.md)** — five questions, five answers, one
  contradiction resolved: neither inherited repo is the product; both are attempts.
- **[Manny's own words](history/notes/)** — seventeen dated notes. These are direction, not colour.
- **[Repository bootstrap handoff, 2026-09-13](history/2026-09-13-repo-bootstrap-handoff.md)** — what
  this repository was and was not when it was created.

## What is still open, stated plainly

- **The name.** [ADR-0051](decisions/ADR-0051-name-is-trellis.md) chose Trellis, and clearance then
  blocked it: Learn-It Systems holds a live class-41 registration for children's special education,
  and Trellis Apps already ships a US AI learning coach for children. Kaizen is blocked too — Kaizen
  Institute holds live class-41 education registrations. **Nothing may be registered, printed or
  deployed under either name.** `kaizenedu` is a repository name, not a brand.
- **Seven false-mastery paths (RO-5) are reproduced and unrepaired.** The guarantee in
  [ADR-0042](decisions/ADR-0042-practice-buys-the-exam-seat-never-the-grade.md) is not true of the
  inherited code. This outranks the roadmap.
- **Who reviews the 118 inherited assessment items (K7)** — unanswered.
- **Cost per learner-hour is estimated, never measured.**
- **[Issue #1](https://github.com/gokumann-pm/kaizenedu/issues/1) is open and unstarted.** No builder,
  no reviewer, no runtime, no CI, no deployment.

## The whole vault memory

`docs/vault/` mirrors every Kaizen-related file of the PM's Obsidian vault — decisions, notes, research, blind reviews, daily logs, project docs — with links rewritten. Start at [`docs/vault/INDEX.md`](vault/INDEX.md). Regenerated by the PM; edit in the vault, not here (ADR-0077).
