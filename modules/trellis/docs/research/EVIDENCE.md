# Where the raw evidence lives

Each research report cites the primary evidence it was built from: fetched USPTO TSDR records,
registry and registrar responses, statute texts, meta-analysis captures, dependency licence probes
and the RO-5 reproduction traces.

**That evidence is not vendored into this repository.** It is 237 MB of PDFs, `.dat` files and
captured JSON, which does not belong in a build repository's history. It is held on the Handler
machine under:

```
shared/artifacts/kaizen-research/          # raw/, ro2-*, ro5-*, ro6-*, ro11-evidence/
shared/artifacts/astra-plan-20260912/      # second opinion, north-star stress, wedge replan
shared/artifacts/kaizen-index/             # the index of both inherited repositories
shared/artifacts/kaizenedu-repo-setup-20260913/   # this repository's bootstrap verification
```

Citations inside the reports that pointed at those files now render as plain paths rather than
links, so nothing here claims to resolve to something this repository contains.

Two sets are worth pulling in if they are ever needed outside the machine:

- `raw/kaizen-clearance/` and `raw/trellis-clearance/` (~9 MB) — the trademark records behind the
  finding that both chosen names are blocked. This is what a trademark lawyer would want.
- `raw/name-checks/` (~16 MB) — the domain and USPTO screens behind the alternative-name shortlist.

Line-and-file citations of the form `shared/repos/KaizenEdu/lib/tutor/...:447` refer to the
read-only source checkout pinned at `20a971b46c8c2bb7d19b9ccfdb8162637c1d1ffe`
(`shared/repos/Kaizen-AI` is pinned at `91af9e452c7df5867afa7249a6dc58b00003f531`). Selected files
from both are reproduced under [`reference-implementations/`](../../reference-implementations/README.md).
