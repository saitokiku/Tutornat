<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: vault/30-decisions/ADR-0061-the-product-record-lives-in-the-build-repo.md -->

---
title: "ADR-0061 — the product record lives in the build repo, edited in the vault"
tags: [adr, kaizen, kaizenedu, handler, dispatch]
project: kaizenai-saas
date: 2026-09-16
decided_by: pm
status: accepted — executed
---
# ADR-0061 — The product record lives in the build repo

**Manny, 2026-09-16, at this keyboard, on the session that started 23:41 CDT:** *"update the kaizenedu repo with all the work we
did with Astra last time"*. The instruction is his; how much to copy, in what shape, and what to
leave out is a PM decision, recorded here.

## Context

`gokumann-pm/kaizenedu` was created on 2026-09-13 ([ADR-0059-product-repo-under-the-pm-account](ADR-0059-product-repo-under-the-pm-account.md))
with 21 files: a README, licences, boundary notes and reference snapshots. The specification, the
decisions, the research and Manny's own direction stayed in the Handler vault. E1 issue #1 cited
SPEC v0.3 by URL into `gokumann-pm/pm` — a separate private repository.
202609162353-memory-a-builder-cannot-read-is-not-memory *(PM vault: `10-notes/202609162353-memory-a-builder-cannot-read-is-not-memory`)* states the problem.

## Decision

1. **Copy the whole product record into the repo** under `docs/product`, `docs/decisions`,
   `docs/research` and `docs/history` — 59 documents: spec v0.3, direction, drift, engine contract,
   engine-first plan, the assembled architecture, the brand work, ADR-0033 through ADR-0059 (the
   fourteen that govern the product), nineteen research reports, the 2026-09-11 grill, seventeen
   `#manny-said` notes and the bootstrap handoff.
2. **The vault stays the only place these are edited.** Every copied file carries its vault or
   artifact origin in an HTML comment on line 1. Repo copies are synced, never authored.
3. **Obsidian wiki links are rewritten to repo-relative Markdown links.** 254 resolve; 0 broken.
   Targets that live only in the vault render as plain text with the vault path named.
4. **Raw evidence is not vendored.** 237 MB of captured PDFs, `.dat` files and JSON stays in
   `shared/artifacts`; `docs/research/EVIDENCE.md` says where it is and names the ~9 MB of trademark
   evidence worth pulling in if a lawyer ever needs it outside the machine.
5. **Handler-operations ADRs stay out.** ADR-0035–0040, 0048, 0050, 0052, 0054, 0056–0058 and 0060
   govern the PM, not the product.

## What was rejected

- *Only a link from the issue to the vault* — the failure being fixed.
- *Moving the documents out of the vault* — the vault is the PM's memory and its single-writer
  guarantee (ADR-0007-single-writer-mechanism *(PM vault: `ADR-0007-single-writer-mechanism`)*) does not extend to a repo workers can push to.
- *Vendoring the raw evidence* — 237 MB in a build repository's permanent history, to make citations
  clickable.

## Executed and verified

Commit `ce06cc8` on `main`, pushed 2026-09-16 23:53 CDT. Remote tree re-read after the push: **82
blobs, every blob id and path identical to local.** Secret scan over the added tree found no keys.
No code, runtime, test, CI or deployment change; issue #1 remains open and unstarted.

Links: [ADR-0059-product-repo-under-the-pm-account](ADR-0059-product-repo-under-the-pm-account.md) · kaizen *(PM vault: `20-mocs/kaizen`)* · [kaizenedu](../research/inherited-kaizenedu.md)
