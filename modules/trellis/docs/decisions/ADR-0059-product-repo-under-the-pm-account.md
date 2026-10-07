<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: vault/30-decisions/ADR-0059-product-repo-under-the-pm-account.md -->

---
title: "ADR-0059 — The product repository is created under gokumann-pm by Astra"
tags: [adr, kaizen, repo, astra]
project: kaizenai-saas
date: 2026-09-13
decided_by: manny
status: accepted — in effect
---
# ADR-0059 — The product repo lives under the PM account

Manny, 2026-09-13 09:42 CDT, at this keyboard, choosing between A and B: **"A"**.

## The question put to him
Step 1 of the build order is a product repository, and none existed under the PM's account. The PM
account `gokumann-pm` is a collaborator on `saitokiku/KaizenEdu` and `saitokiku/Kaizen-AI` with
`push` but **`admin: false`** — verified by API and by an accepted `git push --dry-run`. It therefore
cannot create a repo under `saitokiku`, nor change settings or branch protection there.

- **A) Astra creates it under `gokumann-pm` and works there** — no action needed from Manny.
- B) It lives under `saitokiku`; Manny creates the empty repo or grants admin.

He chose **A**. The PM recommended B on ownership grounds; he overrode that, and A is what happens.

## What follows
- Astra creates `gokumann-pm/kaizenedu`, private, and owns it as admin.
- The `saitokiku` repos stay what Manny called them: *"the previous repos as just things to graft
  from"*. Read access is confirmed; nothing is pushed to them.
- Ownership consequence, stated so it is not discovered later: the product code sits under the PM's
  GitHub account, not Manny's personal one. Moving it later is a transfer, which needs admin on both
  sides. If he wants it under his own account, that is a one-line ask and a repo transfer, not a rebuild.

## Naming
`kaizenedu` follows [ADR-0053-kaizenedu-engine-first-preserve-both](ADR-0053-kaizenedu-engine-first-preserve-both.md). It is the **build home name,
not the brand** — the brand is still open, with KAIZEN blocked by Kaizen Institute (class 41) and
TRELLIS by Learn-It Systems (serial 86708361), see [ADR-0051-name-is-trellis](ADR-0051-name-is-trellis.md). A repo rename is
cheap; do not let the unresolved brand hold up the build.

## Links
[ADR-0053-kaizenedu-engine-first-preserve-both](ADR-0053-kaizenedu-engine-first-preserve-both.md) · ADR-0052-astra-becomes-the-pm *(PM vault: `ADR-0052-astra-becomes-the-pm`)* ·
ADR-0057-pm-turns-get-network *(PM vault: `ADR-0057-pm-turns-get-network`)*

Execution reconciliation (2026-09-13 10:08 CDT): the supplied keyboard record and daily log establish 09:42 CDT; the earlier 09:2x timestamp was imprecise. Repository setup is verified at `b30fa86104bb1a05ef5115a4c5ff63885533c458`; [E1 issue #1](https://github.com/gokumann-pm/kaizenedu/issues/1) exists. This A chooses the repository owner and does not answer K7. Evidence: `shared/artifacts/handler-scheduled-reconciliation-20260913T100441-0500/evidence.json`.
