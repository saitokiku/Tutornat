# Free/Open Curriculum & Reusable Learning Artifacts — Verified Source Catalogue
Research pass: 2026-10-03 (retrieval date; see per-row `retrieval_date`). Side research agent, no app changes made.
Machine-counted: **26 catalogue rows**, 25 verified, 1 blocked, 16 rejected/link-only, 91 evidence files, 89 URLs fetched HTTP 200.

**This is not legal advice.** Every license string below is a verbatim quote from a page fetched on the retrieval date, stored in `evidence/`. `unknown` means *not verified* — never *permitted*. AI summarisation or adaptation does not remove the underlying license conditions.

## The ceiling (read first)

No single agent can enumerate all free educational repositories, and this pass did not try. What it can establish — and did — is that **the rights layer, not the content layer, is the binding constraint on this product.** Of 26 collections examined, only **8 are verified as commercially reusable**, 9 are verified as NOT, and 9 remain unknown. The famous names cluster in the "not commercially reusable" column.

Three assumptions that would have shipped a legal problem, now corrected by primary evidence:

1. **PhET sims are CC BY-NC 4.0, not CC BY.** The published simulation's own HTML header states: *"COMMERCIAL USE REQUIRES A COMMERCIAL LICENSE AGREEMENT FROM THE UNIVERSITY OF COLORADO BOULDER."*[77] The website's licensing page is JS-rendered and yielded no license text — the fact is only recoverable from the sim file itself or `phetsims` GitHub[60] (code is GPL-3.0, a *separate* license from the content).[60]
2. **OpenStax is not uniformly CC BY.** Enumerating all 129 books via the OpenStax CMS API gives **80 CC BY-NC-SA vs 38 CC BY** (11 unresolved).[23] Worse, it splits *within a title lineage*: `College Physics` is CC BY, `College Physics 2e` is CC BY-NC-SA. Newer editions trend non-commercial.
3. **Illustrative Mathematics splits by edition.** 1st ed. (©2019–2021) is CC BY 4.0 and explicitly permits commercial use[3]; 2nd ed. "IM TK-12 Math v.360" (©2024/2025) is **CC BY-NC**. Pointing at "IM" without pinning the edition picks the wrong license half the time.

The unsolved problem: **there is no reliable machine-readable rights signal across OER.** Only LibreTexts (per-page `license:ccbyncsa` tags)[31], Wikimedia (per-file API metadata)[35] and Kolibri (per-node channel metadata)[18] expose license data you can filter on programmatically. Everywhere else, rights live in prose on a terms page that may 404, 403, or render client-side. Any ingestion pipeline needs a human rights gate; it cannot be fully automated today.

## Top 5 starter choices

| # | Source | License (verified) | Why it wins | Trade-off |
|---|---|---|---|---|
| 1 | **Illustrative Mathematics K-12, 1st ed.** | CC BY 4.0 | Only verified-commercial source with *complete lesson structure* — lessons, task statements, practice problems, cool-downs, answer keys. Maps near-1:1 onto scene sequences. | Must pin 1st edition; 2nd ed is NC. Maths only. No API — HTML per lesson. |
| 2 | **OpenStax — the 38 CC BY titles only** | CC BY 4.0 (per-book) | Deepest verified-commercial prose corpus, HS→undergrad, peer-reviewed, REST API with per-book license field. Includes ES (*Física universitaria*). | Requires a per-title allowlist; 80 of 129 books are NC and must be excluded or tier-gated. |
| 3 | **Wikimedia Commons** | Per-file; CC0/PD/CC BY/CC BY-SA only (NC & ND barred by policy) | Solves the visual/diagram need with a *policy-level* commercial guarantee and queryable per-file license metadata. | Per-file attribution/ShareAlike still applies; mis-tagged uploads happen; trademark/personality rights persist. |
| 4 | **Standard Ebooks (then Project Gutenberg)** | CC0 1.0[10] / US public domain | Cleanest rights position in the whole catalogue — CC0 means zero attribution burden. Semantic XHTML parses straight into chapter/paragraph scene units. | Classic literature only; no pedagogy — you author the questions. PG needs header-stripping and non-US copyright care. |
| 5 | **Numbas (engine, Apache-2.0)** | Apache-2.0 *software*[15] | The lawful answer to the exam/problem-bank need: embed a permissively-licensed assessment engine and author your own items, instead of ingesting NC question banks. Exports standalone HTML + SCORM, works offline. | You supply the items. The public Numbas *question database* is per-item CC — not verified, not assumed reusable. |

Runner-up worth a procurement decision: **PhET**. Best interactive fit by a distance, and CU Boulder *sells* a commercial licence — a purchase decision, not a dead end.

## Coverage matrix

| Need | Verified commercial-OK | Non-commercial only (free tier / reference) | Gap |
|---|---|---|---|
| K-12 maths curriculum | IM 1st ed. (CC BY) | Open Up (IM-derived), Oak (proprietary) | — |
| K-12 science | Siyavula unbranded (CC BY 3.0) | OpenSciEd (mixed), PhET (NC) | ES-language science is thin |
| HS/undergrad textbooks | OpenStax ×38 (CC BY) | OpenStax ×80, LibreTexts (NC-SA), MIT OCW (NC-SA) | — |
| Expert / graduate | — | **MIT OCW (NC-SA)** — exams *with* solutions | **No verified-commercial expert tier.** Biggest gap. |
| Professional / vocational | freeCodeCamp (BSD-3) | BCcampus trades (per-book), SkillsCommons (unverified) | Non-coding trades unverified |
| Adult literacy / basic ed | — | BCcampus ABE (per-book) | **GCFGlobal & ReadWorks unresolved/likely proprietary. Real gap.** |
| EN/ES bilingual | OpenStax ES, Gutenberg ES, fCC ES | OER Project (ES, NC), CommonLit (proprietary) | ES *curriculum* (not translation) is weak |
| Reading passages | Standard Ebooks (CC0), Gutenberg (PD) | CommonLit (proprietary — do not ingest) | Modern leveled non-fiction: no open source found |
| Problem / exam banks | Numbas engine (Apache-2.0) | WeBWorK OPL (NC-SA, ~40k items), MIT OCW exams | **No verified-commercial item bank.** Author your own. |
| Flashcards | Anki CSV/APKG *format* | AnkiWeb shared decks = no license, do not ingest | Content must be generated |
| Interactives / sims | — | PhET (NC, licence purchasable), GeoGebra (NC) | **No verified-commercial sim library.** |
| Visual assets | Commons, NASA (conditional) | LoC (per-item[36]), Smithsonian (403, likely CC0) | — |
| Offline / low-resource | — | Kolibri (per-channel, offline-first) | — |

## Ingestion & curation recipe

Fits the existing catalogue/materials/scene/quiz paths — no new platform, no new RAG or vector store.

1. **Allowlist at title level, never collection level.** The unit of licensing is the book/lesson/file, not the brand. OpenStax needs 38 explicit slugs; LibreTexts needs the per-page tag read.
2. **Rights gate before the materials-ingestion path.** Each item records: SPDX id (or `NONSTANDARD`), license URL, verbatim permission quote, evidence file path, and `commercial`/`adapt`/`redistribute` as explicit true/false/unknown. **`unknown` blocks ingestion** — it is not a soft yes.
3. **Separate content partitions by obligation.** (a) CC0/PD — unrestricted; (b) CC BY — attribution carried to point of use; (c) CC BY-SA — **viral**, derivatives must be SA, keep out of proprietary generated lessons; (d) NC — free/non-commercial tier only; (e) ND/proprietary — **never ingested**.
4. **Attribution is a render-time field, not a footnote.** PhET requires attribution "near point of use"; IM mandates an exact string. Store attribution with the artifact so every scene can emit it.
5. **Third-party assets inside an openly-licensed work are the top hidden risk.** Images in OpenStax/LibreTexts/OpenSciEd units are routinely licensed separately. Text-first ingestion; images only from Commons/CC0 sources.
6. **The NASA AI clause is a product requirement, not trivia:** *"attribution of the information directly to NASA is not permitted"* once content enters an LLM. AI-adapted NASA material must not be attributed to NASA; exclude insignia entirely.
7. **Export, don't import, for flashcards.** Implementing Anki CSV/APKG *export* needs no licence from anyone and dodges AGPL-3.0; ingesting shared decks imports unlicensed third-party media.
8. **Prefer iframe/link over copy for interactives.** Embedding by URL isn't redistribution — but verify embed terms; it does not cure PhET's NC clause for a paid product.

## Skip list

**Blocked by rights (content fits, licence doesn't):** WeBWorK OPL (CC BY-NC-SA 3.0[21] — ideal content, commercially unusable; copy the *parameterized-problem pattern*, not the items) · MIT OCW (CC BY-NC-SA 4.0)[6] · GeoGebra (explicitly NC — *"depends on the use, not the user"*[19]) · OER Project (CC BY-NC)[81] · PhET (CC BY-NC unless licensed).

**Not open despite free access — the mislabelling trap:** **CommonLit** (revocable personal-noncommercial ToS[17]; passages are third-party copyright it cannot sublicense) · **Oak National Academy** (revocable, non-transferable, UK-scoped, non-commercial; MIT *code* only)[16] · **GCFGlobal/ReadWorks** (unresolved, likely proprietary).

**Blocked by engineering cost:** Moodle STACK (GPL-3.0 copyleft + Maxima CAS runtime — brief forbids new platforms; keep as reference design for symbolic grading).

**Use as index, not source:** **FMHY /edupiracyguide** — 2459 unique external links across 1896 hosts were parsed from the coordinator's saved HTML. It is explicitly a piracy guide, dominated by github.com (222 links), Discord (81), Reddit (48), X (42), YouTube (38), and mixes lawful OER with paywall-bypass and pirated-textbook routes while asserting no licensing. **Nothing entered this catalogue on FMHY's word alone.** Also index-only: OER Commons (site is NC-SA[50]; filter by its CC BY facet then verify at the item host), Open Textbook Library (a *directory* — its CC BY covers UMN's catalogue pages, not the books[12]; best used as a peer-review quality gate), MERLOT, DOAB.

**No leaked exams, answer keys, paywall bypass, or pirated material was collected or recommended.**

## Gaps & unresolved

- **No verified-commercial expert/graduate tier.** MIT OCW is the best expert artifact set (exams with solutions) and it is NC-SA. Needs a tiering decision or a different source.
- **No verified-commercial problem bank or simulation library.** Both categories must be authored (Numbas engine) or licensed (PhET/CU Boulder).
- **Adult literacy is the weakest verified area** — the obvious brands are proprietary or unresolved.
- **Unresolved by access failure, not by licence:** Khan Academy, CK-12 (4 ToS URLs 404 — uses a non-standard "CK-12 Curriculum Materials License"), Mathigon, Saylor (JS-rendered), OpenLearn (403), Smithsonian Open Access (403, likely CC0 — worth retrying)[unverified], DOAB (403), Pressbooks Directory (403), MERLOT, SkillsCommons, CORE Econ. A browser fetch would likely resolve most; `browser.use_real_profile` blocked the headless route in this session (non-Chromium default browser) and I did not change app or Hermes config.
- **OpenStax's 11 books with no `license_name`** need individual checks.
- **"Creative Commons NonCommercial Plus 4.0"** (OpenSciEd) is not a recognised CC licence ID[80] — no SPDX identifier, terms must be read directly.
- **`web_search`/`web_extract` were unavailable** (Firecrawl 403 on both, as the coordinator noted). All evidence here came from direct `urllib` fetches to publisher/GitHub endpoints — which is *stronger* provenance, but it means discovery breadth is narrower than a search-assisted pass.
- **HTTP 200 is not a freshness claim.** Retrieval date is 2026-10-03; actual content update dates were not established except where a GitHub API `pushed_at` is recorded (e.g. phetsims sim repo 2026-09-13).
- Efficacy is **not established** for any source here — no source was assessed for learning outcomes, and none should be described as best-in-class.

## Mandatory questions

**(1) Solid provenance + reusable curriculum?** Strongest: MIT OCW (actual MIT faculty course materials) · OpenStax (peer-reviewed, named author teams, Rice) · Illustrative Mathematics (named authors, district-adopted) · OpenSciEd (university partner teams, field-tested) · Oak National Academy (UK DfE-funded subject specialists) · Siyavula (CAPS-approved, nationally print-distributed). Of these only **OpenStax (38 titles)**, **IM 1st ed.** and **Siyavula unbranded** are *both* well-provenanced and commercially reusable. Weakest provenance: Wikibooks/Wikiversity (volunteer, no editorial board) and AnkiWeb decks (none at all). Best *quality signal* is Open Textbook Library's named faculty peer reviews[12] — use it to rank, not to source.

**(2) Lawfully copyable/adaptable/embeddable in a potentially commercial app?** Verified yes, with conditions: Standard Ebooks (CC0 — no conditions) · Project Gutenberg (PD text; strip PG header/trademark) · Wikimedia Commons (per-file, policy bars NC/ND) · OpenStax ×38 (CC BY, attribution) · IM 1st ed. (CC BY, exact attribution string) · Siyavula unbranded (CC BY 3.0 — **branded = ND, no adaptation**)[27] · freeCodeCamp (BSD-3[20], no-endorsement clause; *news site is separately licensed*) · Wikibooks (CC BY-SA[8] — **ShareAlike is viral into derivatives**) · NASA (mostly PD; **no-insignia, no-NASA-attribution-after-LLM**[37]). Verified no: OpenStax ×80, LibreTexts default, MIT OCW, WeBWorK OPL, PhET, GeoGebra, OER Project, CommonLit, Oak.

**(3) What lands in OpenMAIC now, and what gates are needed?** Lands without new platforms: OpenStax CC BY sections → slide scenes; their end-of-section exercises → quiz scenes. IM 1st-ed. lessons → scene sequences (lesson→activity→task is already the shape). Standard Ebooks semantic XHTML → reading/comprehension scenes. Commons CC0/PD/CC BY files → diagram and slide visuals via existing diagram widgets. Numbas (Apache-2.0) → the assessment path, authoring your own items. Anki CSV/APKG **export** → learner takeaway (Anki software is AGPL-3.0[84], which export avoids). BCcampus[13] Pressbooks XHTML/EPUB exports → the existing materials-ingestion path. Gates required before any ingestion: per-item license record with verbatim evidence; `unknown` blocks; license partition by obligation (CC0 / BY / BY-SA / NC / never); render-time attribution field; third-party-asset check on every item; human sign-off on the first batch per collection. Code licence is tracked separately from content licence throughout.

## Artifacts

- `report.md` — this file
- `sources.json` — 26 catalogue rows + 16 rejected/link-only, with machine-counted `counts`
- `evidence/` — 91 files; each begins with source URL, final URL, retrieval date, HTTP status
- `citation-ledger.json` — 89 registered fetched URLs
- `fmhy-links-parsed.json` — 2459 unique external links parsed from the coordinator's FMHY snapshot
- `evidence/openstax_license_distribution.json` — all 129 OpenStax books with per-book license
- `evidence/phet_sim_license_header.txt` — verbatim PhET CC BY-NC header

Nothing was ingested. No app, config or Hermes settings were modified. Load-bearing rights claims should be re-verified by the parent before any ingestion decision.

## Sources

[3] https://illustrativemathematics.org/terms-of-use — im_license
    > "The first edition of IM K–12 Math curriculum (© 2019 – 2021) is freely accessible by teachers, students, and families as an Open Education Resource at http://im.kendallhunt.com and is licensed for use under the Creative Commons Attribution 4.0 International License (CC BY 4.0)."
[6] https://ocw.mit.edu/pages/privacy-and-terms-of-use — mitocw_terms
    > "Noncommercial — You may not use the material for commercial purposes."
[8] https://en.wikibooks.org/wiki/Wikibooks:Copyrights — wikibooks_copy
    > "Most of Wikibooks' text is dual licensed under the Creative Commons Attribution-ShareAlike 4.0 International License ("CC BY-SA 4.0") and the GNU Free Documentation License (GFDL) (unversioned, with no invariant sections, front-cover texts, or back-cover texts)."
[10] https://standardebooks.org/about — standardebooks_license
    > "Content produced by or for Standard Ebooks L 3 C is dedicated to the public domain via the CC0 1.0 Universal Public Domain Dedication ."
[12] https://open.umn.edu/opentextbooks — otl_umn
    > "Except where otherwise noted, content on this site is licensed under a Creative Commons Attribution 4.0 License"
[13] https://open.bccampus.ca/browse-our-collection — bccampus
    > "Except where otherwise noted, content on this site is licensed under a Creative Commons Attribution 4.0 International Licence ."
[15] https://www.numbas.org.uk — numbas_about
    > "All of the Numbas software is open source, available under the Apache 2.0 licence."
[16] https://www.thenational.academy/legal/terms-and-conditions — oak_national
    > "This is made available to teachers on a revocable, non-exclusive, non-transferable, limited licence to use for non-commercial educational purposes."
[17] https://www.commonlit.org/terms — commonlit_terms
    > "Some CommonLit content may be offered under open source licenses, including the Creative Commons Attribution/Non-Commercial/Share Alike 4.0 International license (CC BY-NC-SA4.0), that we will make available to you upon your request."
[18] https://learningequality.org/kolibri/about-kolibri — kolibri
    > "licensed under a Creative Commons Attribution 4.0 International license."
[19] https://www.geogebra.org/license — geogebra_terms
    > "Whether a particular use of the GeoGebra Materials is "non-commercial" depends on the use, not the user."
[20] https://raw.githubusercontent.com/freeCodeCamp/freeCodeCamp/main/LICENSE.md — fcc_license
    > "BSD 3-Clause License"
[21] https://raw.githubusercontent.com/openwebwork/webwork-open-problem-library/main/README.md — webwork_opl
[23] https://openstax.org/apps/cms/api/v2/pages/?type=books.Book&fields=title,license_name,license_text&limit=60 — openstax_api_books
    > ""license_name": "Creative Commons Attribution-NonCommercial-ShareAlike License""
[27] https://www.siyavula.com/read — siyavula_books
    > "CC-BY (unbranded versions)"
[31] https://chem.libretexts.org/Courses — libretexts_license_page
    > "Campus Bookshelves is shared under a CC BY-NC-SA 4.0 license and was authored, remixed, and/or curated by LibreTexts."
[35] https://commons.wikimedia.org/wiki/Commons:Licensing — commons_licensing
    > "that are in the public domain in at least the United States and in the source country of the work."
[36] https://www.loc.gov/legal — loc_rights
    > "You should determine for yourself whether or not an item is protected by copyright or in the public domain, and then satisfy any copyright or use restrictions when publishing or distributing materials from our collections."
[37] https://www.nasa.gov/nasa-brand-center/images-and-media — nasa_media
    > "The NASA Insignia, Logotype, identifiers, and imagery are not in the public domain."
[50] https://oercommons.org/search?f.general_subject=mathematics — oercommons_search_cc
    > "Except where otherwise noted, content on this site is licensed under a Creative Commons Attribution-NonCommercial-ShareAlike 4.0 License."
[60] https://api.github.com/repos/phetsims/forces-and-motion-basics — phet_sim_repo
    > ""name": "GNU General Public License v3.0""
[77] https://phet.colorado.edu/sims/html/forces-and-motion-basics/latest/forces-and-motion-basics_en.html — phet_sim_published
    > "COMMERCIAL USE REQUIRES A COMMERCIAL LICENSE AGREEMENT FROM THE UNIVERSITY OF COLORADO BOULDER."
[80] https://openscied.org/openscied-terms-of-use-and-privacy-policies — openscied_home_lic0
    > "OpenSciEd website content, including the classroom curriculum and professional learning resources created by OpenSciEd and its partners, are licensed under a Creative Commons Attribution 4.0 International License (CC BY 4.0) or Creative Commons NonCommercial Plus 4.0 International License ."
[81] https://www.oerproject.com/Terms-of-use — oerproject_home_lic0
    > "Generally, Course Materials available on or through the Site and Services are made available pursuant to the terms of the Creative Commons Attribution Non-Commercial License (CC-BY-NC)."
[84] https://raw.githubusercontent.com/ankitects/anki/main/LICENSE — anki_license_gh
    > "Anki is licensed under the GNU Affero General Public License, version 3 or"
