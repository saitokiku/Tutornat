<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: shared/artifacts/kaizen-research/01-METHOD.md -->

# 01-METHOD — sources, fetch log, and blocked hosts
**Companion to `01-rails-and-market.md`. Researched 2026-09-11.**

## How this was run

One research worker coordinating seven parallel primary-source agents, one per section of the brief. Each agent was instructed to read statute, rule, filing, dataset or paper — not a secondary write-up — and to mark every load-bearing figure ✓ (primary, with URL, cite and verbatim quote), ~ (secondary, source named) or ✗ (correcting a wrong figure). Each returned its own fetch log; they are consolidated below in the order of the deliverable's sections.

Times are 2026-09-11 local unless noted. Raw artifacts (statute text dumps, PDFs, extracted text, FDDs, Census flat files) are in `/Users/mann/pm/shared/artifacts/kaizen-research/raw/`.

**Two tool failures worth recording because they are silent-corruption modes, not errors.** First, `law.cornell.edu` fetches were *refused* by the reader model on grounds of verbatim reproduction of public statutory text — the summary that came back was usable for orientation but nothing in the deliverable rests on it. Second, a WebFetch of `irs.gov/pub/irs-drop/n-25-70.pdf` returned **fabricated content**: it named "Notice 2024-5 (January 2024)," invented a "$250 per year for tutoring" cap, and invented a quote about vendor registration. That output was discarded entirely and the PDF was re-parsed from raw bytes with a local zlib stream extractor. **Every statutory quote in the deliverable was extracted from raw HTML or PDF bytes, not from a reader summary.**

`pdftotext` is not installed on this Mac and pyobjc/Quartz is unavailable to the system python3. PDFs were parsed with `pypdf` where it worked and with a local zlib/`Tj` stream extractor (`raw/pdftxt.py`) where it did not.

---

## Section A.1 — IRC §529 after OBBBA

| Time | URL | Result |
|---|---|---|
| 19:51 | `law.cornell.edu/uscode/text/26/529` | Partial. Reader refused verbatim reproduction. Confirmed the $20,000 cap sentence and the two effective dates. **Not relied on for any quote.** |
| 19:51 | `uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section529&num=0&edition=prelim` | **200, 232,888 B.** Source of all §529 quotes: (c)(7)(A)-(H), (d)(1), the (e)(3)(A) cap sentence, and every P.L. 119-21 amendment and effective-date note. |
| 19:52 | same, `section530` | **200, 191,779 B.** §530(b)(3)(A)(i)-(iii). Confirmed **zero** P.L. 119-21 amendments to §530. |
| 19:53 | `govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm` | **200, 1,217,741 B.** Enrolled Act. Independently corroborated §70413(a)(1) new (c)(7) text word for word, and §70413(a)(2)/(b)(2) effective dates. |
| 19:54 | `irs.gov/taxtopics/tc313` | 200. Updated 06-Feb-2026. Confirmed $20,000 / $10,000-before-2025-12-31, per beneficiary across all programs. **Failed to confirm** the tutor conditions and "Online educational materials" — both omitted from the IRS list. |
| 19:54 | `irs.gov/newsroom/529-plans-questions-and-answers` | 200. Updated 30-Jan-2026. **Zero** hits for "tutor," "$20,000," "1099-Q." Confirms no OBBBA 529 FAQ. |
| 19:54 | `irs.gov/newsroom/one-big-beautiful-bill-provisions` | 200. **Updated 10-Sep-2026.** Guidance sections present: 70204, 70302, 70402, 70403, 70411, 70421, 70435, 70437, 70512, 70521, 70522, 70525, 70604. **§70413 and §70414 absent** — the verified-absence basis for "no IRS guidance on the tutoring category." |
| 19:55 | `irs.gov/instructions/i1099q` | 200. Rev. 04/2025. Who-must-file and recipient rules; no vendor filing duty, no K-12 box, no OBBBA update. |
| 19:55 | `irs.gov/publications/p970` | **200, 877,915 B.** Pub 970 (2025). Full 8-category list, the "Requirements for tutors" subsection verbatim, and the stale "$10,000 of tuition" cap sentence. |
| 19:57 | `irs.gov/pub/newsroom/7-529-account-funding-529-13602_508.pdf` | 200. IRS TE/GE training deck. Form 1098-T inapplicable to §529. TCJA-era and stale; used only for the structural point. |

## Section A.2 — Texas TEFA

| Time | URL | Result |
|---|---|---|
| 19:51 | `capitol.texas.gov/BillLookup/History.aspx?LegSess=89R&Bill=SB2` | 200. Signed 2025-05-03, effective 2025-09-01. No direct enrolled-text link on the page. |
| 19:52 | `capitol.texas.gov/tlodocs/89R/billtext/html/SB00002F.htm` | **200, 338,647 B. Full enrolled text.** Source of every §29.3xx quote: §29.3521 ($1B and 20% caps), §29.355 eligibility and termination, §29.356 tiers, §29.358 provider and tutor credentials, §29.359 approved expenses, §29.360 payment and the 10-business-day term, §29.361 amounts, §29.362 tranches, §29.365 price parity and the rebate bar. |
| 19:53 | `texreg.sos.state.tx.us/public/readtac$ext.ViewTAC?...ti=34&ch=16` | 200 but **blocked by site migration** — a 2,517 B "This Site Has Moved" stub. **The TAC viewer serves no rule text.** Worked around below. |
| 19:53 | `sos.state.tx.us/texreg/archive/December122025/Adopted Rules/34.PUBLIC FINANCE.html` | **200, 215,763 B.** Adopted 34 TAC §§16.401-16.410 **plus the full comment preamble**. Source of §16.404(i) tutor credentials and the 30-day criminal history review, §16.406 expenses, §16.407 administration/tranches/refunds, §16.403(b)(4)(D) assessment duty, the AGI change, and the Comptroller's refusal to define "teaching service." Filed with SOS 2025-11-25, effective 20 days after filing. |
| 19:54 | `comptroller.texas.gov/programs/education/esa/faq.php` | **301 → educationfreedom.texas.gov.** Old path retired. |
| 19:54 | `educationfreedom.texas.gov/` | 200, 337,368 B. $10,474 / up to $30,000 / $2,000; $1B; Odyssey as CEAO; tranche dates; homeschool 100% on July 1; application window 2026-02-04 to 2026-03-31; priority order. |
| 19:54 | `educationfreedom.texas.gov/providers-vendors/` | 200. **Application URL `tefa-vendors.withodyssey.com/registration/`**; rolling and open; all applications reviewed by the Comptroller. No fee, insurance or processing time stated. |
| 19:54 | `support.withodyssey.com/hc/en-us/...` (2 paths) | **403 Forbidden** to WebFetch and to curl with a browser user agent. Odyssey's help centre blocks all automated fetching — the 4-6 week approval time and the PDSES streamlined-enrollment date are therefore **~ secondary only**. |
| 19:55 | `comptroller.texas.gov/about/media-center/news/` + five dated releases (2026-04-22, 05-04, 06-10, 08-13, 11-25-2025) | 200 each. Award rounds, tier definitions, confirmation deadlines; **Huffines named in all Sept 2026 releases, Hancock as Acting in the June 2026 release.** |
| 19:56 | `comptroller.texas.gov/economy/fiscal-notes/government/2026/esa-ftd/` | 200. 8,000 applications in the first hour, 42,000 day one; >2,000 private schools and >200 education service providers registered. |
| 19:57 | `capitol.texas.gov/tlodocs/89R/billtext/pdf/SB00001F.pdf` | **200, 10,280,828 B.** Enrolled **SB 1 = the 89R General Appropriations Act.** Found an Article III row "Education - CPA … $1,000,000,000" but **column alignment was unverifiable** in the text layer, so the GAA line item is left unconfirmed; the $1B rests on §29.3521(c-1) and the program site. |
| 19:57 | `capitol.texas.gov/BillLookup/History.aspx?LegSess=89R&Bill=HB1` | 200. **HB 1 (89R) died in committee** — last action "Referred to Appropriations: Feb 25 2025." Basis for the ✗ on the HB 1 premise. |
| 19:58 | `educationfreedom.texas.gov/wp-content/uploads/2026/07/TEFA-Annual-Demographic-Report.pdf` | **200, 161,916 B.** Statutory Annual Demographic Report, 2026-08-01, data as of 2026-07-29. ~274,000 applications; >248,000 eligible; >122,000 awards; **85,344 funded**; >121,000 waitlisted; ~25% disability; 80% under 200% FPL; full tier tables; district-of-residence addendum. **The ESC-region table (p.13) and campus table (p.14) did not extract — likely rendered as graphics**, which is why no Region 13 or Travis County total is reported. |

## Section A.3 — IRC §25F

| Time | URL | Result |
|---|---|---|
| 19:51 | `uscode.house.gov/...section25F...` | **200, 154,531 B.** All §25F quotes: (a)-(h) in full plus the effective-date note. |
| 19:52 | `uscode.house.gov/...section25...` | **200, 217,426 B.** The §70411(c)(1)-(2) effective-date note — **"ending after December 31, 2026."** |
| ~19:53 | `uscode.house.gov/...section139K...` | 200. §139K(a)-(b) and its effective date. |
| 19:54 | `irs.gov/government-entities/federal-state-local-governments/federal-scholarship-tax-credit-fstc` | 200. **Primary source for the 30-state list**, stated "as of July 24, 2026," page last reviewed 27-Jul-2026. **Texas present.** Carries IRS's own warning that state websites may not reflect current status. |
| 19:54 | `irs.gov/newsroom/more-than-half-the-us-states-signed-up...` (IR-2026-76) | 200. 2026-06-08, **27 states** named. Enabled the 27→30 diff (Kansas, Kentucky, North Carolina). |
| 19:54 | `irs.gov/newsroom/treasury-irs-allow-states-to-make-an-advance-election...` (IR-2025-121) | 200. 2025-12-12. Rev. Proc. 2026-6, Form 15714, Notice 2025-70, and the "perfecting the Advance Election" / 2027-01-01 SGO list deadline. |
| 19:55 | `irs.gov/pub/irs-drop/n-25-70.pdf` | **200, 192,961 B via curl.** Notice 2025-70: the §25F(d) restatement, the §530(b)(3)(A) gloss, the "SGO may impose additional governing provisions" statement, comment deadline 2025-12-26. **The WebFetch of this same URL fabricated content and was discarded — see the note at the top.** |
| 19:57 | `irs.gov/pub/irs-drop/rp-26-06.pdf` | 200, 88,338 B. Rev. Proc. 2026-6, the "exclusive procedure" for the Advance Election. (`rp-26-6.pdf` → 404; wrong slug.) |
| ~19:56 | WebSearch ×3 | Discovery only. Surfaced `charitylawyerblog.com` (2026-08-17) and `sgoguide.com` as ~secondary corroboration of the 30-state count and Kentucky's veto override. **No figure in the deliverable rests on either.** |

## Section A.4 — Other state ESA, voucher and microgrant programs

Fetched ~19:30-20:05. Confirmations listed; all URLs are the official program page, statute or rule unless marked.

| URL | Confirmed |
|---|---|
| `go.stepupforstudents.org/hubfs/Scholarship Info/FES-UA-Scholarship-Award-Amounts.pdf` | FL FES-UA 2026-27 amounts, all 67 districts × 3 grade bands × 3 matrix tiers |
| `go.stepupforstudents.org/hubfs/Scholarship Info/FTC-FES-EO-PEP-Award-Amounts.pdf` | FL FTC / FES-EO / **PEP** 2026-27 amounts by district |
| `flsenate.gov/Laws/Statutes/2024/1002.394` | FES tutoring credential list verbatim, authorized uses, eligibility, award formula |
| `flsenate.gov/Laws/Statutes/2024/1002.395` | **PEP cap formula** (20k + 40k/yr → 140k for 2026-27), "will not be enrolled full time in a public or private school," PEP authorized uses and credential list |
| `stepupforstudents.org/scholarships/personalized-education-program/` | PEP eligibility, expense categories including tutoring, MyScholarShop |
| `azed.gov/esa/parent-handbook` + `ESA 2025-2026 Handbook.pdf` | **Obtained via the ego-browser skill — azed.gov 403-blocks WebFetch, curl with a browser UA, and r.jina.ai.** Footnote 7 credential rule verbatim (high-school diploma, homeschool diplomas accepted), ClassWallet rails, universal eligibility, public-school bar, Tuition Payer Code 2 carve-out. **No 2026-27 handbook exists; "Current" is the 2025-26 edition dated 2025-07-01, 113 pp.** |
| `azed.gov/.../ESA Funding Chart 2025.2026.pdf` | AZ amounts by disability category |
| `azed.gov/.../ESA FY26 Q4 Executive _ Legislative Report.pdf` | **99,709 students, $1.09B annualized; tutoring $33.5M = 17.3% of spend, 107,715 orders; 71% universal** |
| `dese.ade.arkansas.gov/.../education-freedom-accounts` | Via `curl -k` — **WebFetch fails with "unable to verify the first certificate."** 2026-27 window, tutoring in the expense list, ClassWallet, quarterly dates, post-June-29 funding caveat |
| `dese.ade.arkansas.gov/Files/AR_EFA_Family_Handbook_2025-26_OSCPE.pdf` | Universal wording, ClassWallet vendor-addition process |
| `dese.ade.arkansas.gov/.../family-efa-details` | **STALE — still shows 2023-24 figures ($6,600, restricted eligibility). Do not cite.** |
| `education.ohio.gov/ohioace` | **ACE has ended**; final claims 2025-10-15 |
| `education.ohio.gov/.../EdChoice-Expansion` + FY27 fact sheet | ~ amounts, income scaling, tuition-only |
| `in.gov/tos/inesa/` · `in.gov/doe/eoq/esa/` | INESA to $20,000 / $8,000 siblings, tutoring in the expense list, ClassWallet, Access Indiana vendor approval |
| `secure.in.gov/doe/files/2026-2027-ESA-Funding-Levels-by-Disability.pdf` | Narrative only — **the by-level amount table did not extract in either text or layout mode** |
| `in.gov/doe/files/Estimated-Award-Amounts-2026-2027_4.pdf` | IN Choice per-corporation amounts, ~$6,033-$7,588 across 50 corporations read |
| `tn.gov/content/dam/tn/education/efs/2026-27-EFS-Family-Handbook.pdf` | Obtained via WebFetch's saved binary after curl returned http=000. **"An individual must hold an active TN teacher license"** (p.16), TISA formula, 50/20/20/10 disbursement, tuition-first rule, income priority tables |
| `tn.gov/content/dam/tn/education/iea/2026-27_IEA_Program_Handbook.pdf` | 73 pp. Ch.5 tutoring definition and pre-approval; **Ch.6 five credential paths, TBI/FBI fingerprint rule, paraprofessional and immediate-family bars, direct-payment-only, 50%-by-mid-year rule** |
| `classwallet.com/alchoose/assets/CHOOSE_ACT_education_sevice_provider_guide.pdf` + parent guide | **AL tutor credential and background-check rule verbatim**, ESP categories, "6. Private Tutoring" |
| `hopescholarshipwv.gov` + `code.wvlegislature.gov/18-31-7/` + Hope Parent Handbook | WV $5,435.62, §18-31-7(a) tutoring text with the immediate-family bar, TheoPay, 2026-27 universal expansion |
| `utaheducationfitsall.org/faqs/` | UT $8,000 / $4,000 / $6,000, "tutoring services;", Odyssey. **`le.utah.gov` is JS-only and served no statute; `law.justia.com` 403** |
| `educate.iowa.gov/pk-12/educational-choice/education-savings-accounts` | IA $8,148, accredited-nonpublic requirement, Odyssey, tuition-first |
| `doe.louisiana.gov` LA GATOR | Tutoring text, 2026-27 eligibility, Odyssey. **`lagator.la.gov` is NXDOMAIN** |
| `edu.wyoming.gov/parents/education-savings-accounts/` | WY $7,000, tutoring in the list, **certification process still being developed**, Odyssey |
| `revisor.mo.gov` 166.700 / 166.705 | **"(d) Tutoring services;" with no credential qualifier**, while (c) therapies require a licensed practitioner; public-school bar |
| `k12.ncseaa.edu/media/0ckgxt0f/parent-guide-allowable-expenses.pdf` | NC 2026-27 tutoring categories, **"must enroll with SEAA"** versus the therapist-licence contrast. **`ncseaa.edu/k12/` 403 to curl and WebFetch** |
| `oklahoma.gov/tax/individuals/parental-choice-tax-credit.html` + Form 591-D | OK $1,000 homeschool cap, tutoring item verbatim, receipt mechanic, no vendor approval |
| `gc.nh.gov/rsa/html/XV/194-F/194-F-1.htm` and `-2.htm` | NH residency-only eligible-student definition; tutoring text. **`education.nh.gov` 403 to both WebFetch and curl** |
| `sc-estf-program.com/en` | SC $7,634, 500% FPL, withdrawal requirement, ClassWallet, 10-day provider SLA, **15,000 cap hit** |
| `legislature.idaho.gov` H0093.pdf | ID "tutoring" in the qualified-expenses definition |
| `opi.mt.gov` ESA FAQ | MT "• Tutoring" unqualified, reimbursement-only model, therapies-only licence rule |
| `fldoe.org/.../pep-faqs.stml` | **403 Forbidden** |

## Section A.5 — Title I, ESSER, 21st CCLC, state tutoring money

| URL | Confirmed |
|---|---|
| `law.cornell.edu/uscode/text/20/6320` | §1117(a)(1), (b)(1)(H), (d)(1), (d)(2) verbatim — the third-party contract and independence clauses |
| `law.cornell.edu/uscode/text/20/6303` | §1003 7% reservation, 95%-to-LEAs, and the "nonprofit or for-profit external providers" clause |
| `law.cornell.edu/uscode/text/20/6303b` | §1003A Direct Student Services: 3% reservation, provider selection, **the State-approved tutoring-provider list requirement** |
| `law.cornell.edu/uscode/text/20/6314` and `/6315` | §1114(d) and §1115 "nonprofit or for-profit external providers" |
| `law.cornell.edu/uscode/text/20/6316` | **"Repealed. Pub. L. 114-95, title I, §1000(1), Dec. 10, 2015, 129 Stat. 1814"** — the SES set-aside, with 6317 |
| `law.cornell.edu/uscode/text/20/7171` | 21st CCLC "eligible entity" including "another public or private entity" |
| `ed.gov/.../title-i-part-improving-basic-programs...` | FY2025 $18,406,802,000; FY2026 $18,426,802,000 (listed as estimated) |
| `ed.gov/.../nita-m-lowey-21st-century-community-learning-centers...` | FY2023-26 funding table, flat at $1,329,673,000; eligible-entity list; SEA-run competitions |
| `ed.gov/sites/ed/files/2025-03/OESE Letter to State Chiefs - Title 1 Part A Guidance (March 31, 2025).pdf` | Extracted locally with pypdf. §1003A flexibility, "high-quality tutoring," the State tutoring-list requirement, "providers … do not become Federal grantees," **Ohio the only state using DSS** |
| `ed.gov/media/document/dear-colleague-letter-equitable-services-school-choice-guidance-august-21-2025-110531.pdf` | Extracted locally. The 11-item services menu, third-party provider sections, **the SEA-procurement paragraph**, §1117(b)(6)(C); signed Hayley B. Sanon |
| `ed.gov/.../education-stabilization-fund-liquidation-extensions` | The 2025-03-28 5:00 PM ET rescission; preliminary injunctions 2025-05-06 and 06-03; case 1:25-cv-02990-ER; the 2025-06-26 reversal |
| `ed.gov/media/document/esf-liquidation-extension-faqs-updated-september-30-2025-110426.pdf` | Extracted locally, 11 pp. 2 CFR §200.344(c); ARP liquidation expiry 2025-01-28; 14-month cap; **"may extend to, but not exceed, March 28, 2026"**; obligation by 2024-09-30; Q.20 subrecipients may not request |
| `everycrsreport.com/reports/IF12978.html` | CRS 2025-07-03 corroboration of the obligation deadline and the 14-month period |
| `ed.gov/sites/ed/files/about/offices/list/osers/docs/medicaid-funding-for-school-based-services-03-08-2024.pdf` | Extracted locally. Scope is health services; 16 states cover beyond IDEA |
| `capitol.texas.gov/tlodocs/88R/billtext/html/HB01416F.htm` | Enrolled HB 1416: §28.0211 (a-4)(3) **15/30 hours with the flat 30 struck**, (a-4)(6) **1:4**, (a-4)(7) training-not-certification, (a-8), (a-9), (a-11), (a-12) off-list provider route, (f)(1)(B) |
| `capitol.texas.gov/tlodocs/89R/billtext/html/HB00002F.htm` | Enrolled HB 2 (89R): §7.03 **(a-15)/(a-16) high-impact tutoring provider approval and outcomes-based contracting**; §5.11 §28.02111; §5.28 §48.317 **$400**; §5.31(b) applies 2026-27; effective 2025-09-01 |
| `tea.texas.gov/.../hb-1416-ratio-waiver-list-for-the-2026-27-school-year` | 2026-04-16; 6 products; "No new products were approved for inclusion" |
| `tea.texas.gov/.../accelerated-instruction` | "No less than 15 or 30 hours"; "no more than four students" |
| `tea.texas.gov/.../prescreened-organizations-list-9-16-25.pdf` | 21st CCLC, **non-profit only**; "No funding is directly associated with this profile process" |
| `tn.gov/education/tn-all-corps.html` | **ESSER-only through summer 2024; no FY2027 funding, list, or application** |
| `cde.ca.gov/fg/aa/ca/lrebgpgminfo.asp` · `cde.ca.gov/ls/ex/elopinfo.asp` | CA LREBG $757.3M for FY2026-27, expendable through 2027-28, EC §32526(d)(4)-(5) third-party and CBO clauses; ELO-P third-party off-site reporting |
| `doe.mass.edu/instruction/ela/tutoring/` | MA 5 approved vendors, COMMBUYS, **DESE pays providers directly** |
| `doe.louisiana.gov/.../statewide-tutoring-opportunities` | LA Accelerate HDT plus Steve Carter $1,500; school systems choose providers |
| `education.ohio.gov/Topics/Learning-in-Ohio/Approved-Tutoring-Vendors` | OH 21 vendors; **RFQ expected late October 2026**; districts not required to use the list |
| `accelerate.us/2026-2027-call-for-effective-technology/` | For-profits eligible, $150-250K by ESSA tier, **deadline 2026-02-20, closed** |
| `accelerate.us/state-implementation-fund/` | "works exclusively at the state level" |
| `ednc.org/7-2-2026-general-assembly-passes-budget...` | ~ NC named-vendor budget lines |

## Section B — market size

| Time (UTC) | URL | Result |
|---|---|---|
| 01:18 | `api.census.gov/data/2022/ecnbasic?...` | **302 → "Missing Key."** API key now mandatory for every Census dataset. |
| 01:19 | `bls.gov/oes/current/oes253041.htm` via curl | **Access Denied** — BLS blocks automated retrieval. |
| 01:21 | `api.bls.gov/publicAPI/v2/timeseries/data/` (POST) | **OEWS SOC 25-3041, May 2025: employment 175,070; mean hourly $23.10; mean annual $48,050; p10 $14.15; median $20.84; p90 $36.53; median annual $43,350.** |
| 01:20 | `www2.census.gov/programs-surveys/cbp/datasets/2023/cbp23us.zip` | 750 KB. **CBP 2023 NAICS 611691: 9,820 establishments / 108,755 employees / $3,014,523k payroll**, by legal form including nonprofit. |
| 01:21 | `www2.census.gov/programs-surveys/economic-census/data/2022/sector61/EC2261BASIC.zip` | 1.70 MB. **2022 Economic Census: 611691 revenue $7,286,419k**; full 6116 family; taxable/exempt split. |
| 01:27 | same, `2017/sector61/EC1761BASIC.zip` | 1.31 MB. **2017: 611691 revenue $5,242,835k, 9,467 establishments** — the growth baseline. |
| 01:21 | `nces.ed.gov/pubs2024/2024113.pdf` | 72 pp, parsed locally. NHES PFI 2023: 52,995k K-12 students, Table A-5, school-type and homeschool counts. **Verified zero occurrences of "tutor."** |
| 01:22 | `www2.census.gov/programs-surveys/nonemployer-statistics/datasets/{2021,2022,2023}/nonempNNus.zip` | **404 on all variants** — flat files withdrawn; program moved behind the key-gated API. **This is the nonemployer gap.** |
| 01:23 | `api.census.gov/data/2023/acs/acs1?...` | **"Missing Key"** — ACS also key-gated. Texas household income by presence of children not obtained. |
| 01:25 | `www2.census.gov/.../school-enrollment/2024/2024-cps/enroll08_2024.xlsx` | **CPS October 2024 Table 8: 29,343k families with a K-12 child**, by income band, school control and race. |
| 01:24 | `bls.gov/cex/tables/.../cu-income-quintiles-before-taxes-2024.*` via curl | **403** — BLS bot block. Obtained via WebFetch instead. |
| 01:26 | `bls.gov/cex/tables/.../cu-income-quintiles-before-taxes-2024.xlsx` via WebFetch | Binary saved and parsed locally. **CE Table 1101, 2024.** |
| 01:27 | `bls.gov/cex/tables/.../cu-composition-2024.xlsx` via WebFetch | **CE Table 1502, 2024**: Education $3,484 for married couple with oldest child 6-17. |
| 01:28 | `bls.gov/cex/tables/.../cu-all-detail-2024.xlsx` | **404** — blocks isolating K-12 from college sub-lines. |
| 01:25 | `www2.census.gov/programs-surveys/sas/tables/2023/...` (3 variants) | **404 on all** — the Service Annual Survey does not publish 611691 at any reachable path. |
| 01:26 | `tea.texas.gov/data-reports/school-performance/accountability-research/enroll-2025-26.pdf` | 1.40 MB, 98 pp, parsed locally. **TX 2025-26 = 5,467,642 (−1.4%)**, eleven-year series, 59.9% economically disadvantaged, Table 35 TX vs US. |
| 01:28 | `nces.ed.gov/surveys/pss/participants_2324.asp` | **PSS 2023-24 not yet released** (spring 2026); most recent complete is 2021-22. |
| 01:25 | `tea.texas.gov/reports-and-data/student-data/student-enrollment-reports` | **404** — path moved to `/data-reports/`. |

## Section C — incumbents

**SEC EDGAR, read directly.** NRDY FY2025 10-K accession 0001819404-26-000015 (filed 2026-02-26) — the main document truncated before Item 8, so the income statement was taken from the filing's `R3.htm` and `R4.htm` financial-statement renderings. Q2 2026 10-Q 0001819404-26-000080 (2026-08-06) — revenue, gross margin, net loss, **29.1k Active Members, ARPM $366, Varsity Tutors for Schools $10,339k for H1**, cash $38,424k, **no CAC disclosed anywhere**. Earnings release 0001193125-26-076562 — **33.2k members (−11%), ARPM $364 (+21%)**, segment revenue, FY2026 guidance. **8-K Item 2.05, 0001819404-26-000079 — the Varsity Tutors for Schools wind-down committed 2026-07-31.** 8-K 0001819404-26-000024 — **NYSE Section 802.01C notice 2026-03-05**. CHGG FY2025 10-K 0001364954-26-000021 (2026-03-09), income statement via `R5.htm` including the $677,239k FY2024 impairment; Q4 2025 release 0001364954-26-000009; Q2 2026 release 0001364954-26-000085 (Q3 guidance $43-44M, gross margin 48-49%); **8-K Item 3.01 0001364954-26-000082 — NYSE notice 2026-07-24.** Failed: `data.sec.gov/cgi-bin/browse-edgar` (404), `sec.gov/cgi-bin/viewer` (missing-accession error), `investors.nerdy.com/news-releases/...` (404).

**Wisconsin DFI franchise registry** — `apps.dfi.wi.gov/apps/FranchiseSearch/MainSearch.aspx`. The search is an ASP.NET POST → 302 → encrypted-token GET, and **only rows in `Registered` status expose a Details page with a download**. Six FDDs downloaded as PDFs and archived to `raw/fdd-2026-wi/`: Kumon id=640500 (3.01 MB, 2026 FDD uploaded 2026-03-27), Mathnasium id=641614 (3.02 MB, 5/5/26), Sylvan id=641246 (3.89 MB, 4/24/26), Huntington id=641005 (6.25 MB, 4/16/26), Best in Class id=641462 (12.19 MB, 4/30/26), Eye Level/Daekyo id=641137 (5.58 MB, 4/21/26). Items 5, 6, 7, 19 and 20 read in each. **Zero hits on NWEA, MAP, randomized, What Works Clearinghouse, state test or third-party evaluation across all six.** `txtName=Tutor` → **Tutor Doctor's Wisconsin registration expired 2023-07-28, so no download is available.** `cards.commerce.state.mn.us` (Minnesota registry) returned **403**; California DFPI was not attempted since Wisconsin covered six of seven.

**Company-owned and state pages.** alpha.school/locations (48 campuses with tuition) · alpha.school · 2hourlearning.com and /results/ · alpha.school/blog mid-year report card 2026-02-17 · **timeback.com and /schools — no pricing published** · unbound.school and /program · PR Newswire 2026-08-05 · cognia.org · khanmigo.ai/learners ($4/$44) · khanacademy.org/schools/pricing ($10/student) · annualreport.khanacademy.org ($128M revenue / $95M expenses, 795 districts) · 2023-2024.annualreport.khanacademy.org/efficacy-results (the 0.36 figure, self-classified Tier 3) · blog.khanacademy.org 2026-08-28 (15 studies) · paper.co, /grow, /inside-paper/grow-high-impact-tutoring 2024-05-16 · about.zearn.org/research and /evidence-for-essa · **doe.louisiana.gov Zearn price list ($2,500/school)** · amiralearning.com/research and /ca-dyslexia-screening-approval · explore.amiralearning.com Louisiana study PDF (Instructure, June 2025, n=79,084) · **cde.ca.gov/ci/cl/amirainfooverview.asp ($4.99/$9/$20)** · synthesis.com and /educators · magicschool.ai/pricing and /series-b-fundraise · ello.com, /research, /access · support.wyzant.com (25% + 9%) · support.outschool.com (30% + Marketplace Fee) · teach.outschool.com · help.preply.com/commission-model (33→18%, 100% on trials) · preply.com/en/teach and the Series D post · varsitytutors.com/tutoring-prices-rates-cost (no prices) · tutor.com/faq/pricing, /libraries, /research · military.tutor.com · prenda.com/about, /states/arizona · primer.com · kaipodlearning.com · actonacademy.org.

**Blocked or dead for Section C.** `chegg.com` **403 on every path** — all Chegg consumer prices are ~ and unverified. `kumon.com` **403 including with a browser UA** — Kumon tuition could not be read from a company page. `mathnasium.com/faq` **403** — cannot confirm whether a price is published. `businesswire.com` 403. `tutordoctorfranchise.com/franchise-costs/` 301→404. Verified 404s used as evidence of absence: varsitytutors.com/pricing, khanmigo.ai/districts, ello.com/pricing, zearn.org/pricing, alpha.school/tuition, alpha.school/campuses.

## Section D — evidence base

| Time | URL | Result |
|---|---|---|
| 20:19 | `nber.org/papers/w27476` | Abstract verbatim: **0.37 SD**; moderator directions. No published-version citation listed on the page. |
| 20:20 | `journals.sagepub.com/doi/abs/10.3102/00028312231208687` | **403 — blocked.** All SAGE full text was inaccessible this run. |
| 20:20 | `nber.org/.../w27476.pdf` | Downloaded, text extracted. **96 studies / 732 estimates**; the meta-regression coefficients and standard errors behind the "not statistically significant" finding. |
| 20:21 | `static1.squarespace.com/.../Kraft et al 2024 Tutoring at scale.pdf` | Downloaded. **Custom glyph cipher, decoded locally.** Source of every scale-bin, ratio, virtual-delivery, researcher-test and real-world-program figure. |
| 20:23 | `edworkingpapers.com/ai24-1031` | Abstract verbatim (282 RCTs) and the **RER 2026** published citation. **Note a discrepancy: the abstract says 282 RCTs, the October 2024 PDF body says 265 twice.** Use the RER 2026 version for the authoritative count. |
| 20:26 | `api.semanticscholar.org` DOI 10.3102/00028312231208687 | **Published abstract: 0.288 SD (SE .029); AERJ vol 61, pp. 74-107.** Corroborated on ERIC EJ1406037. The 0.288 figure **is** in the abstract. |
| 20:26 | `aeaweb.org/articles?id=10.1257/aer.20220888` | **404** |
| 20:27 | `nber.org/papers/w28531` | **AER 113(3):738-765; +0.16 and +0.37 SD; $3,500-$4,300 per participant per year.** |
| 20:28 | `accelerate.us/.../Accelerate-Research-Report-Efficiency-and-Cost-Effectiveness-1.pdf` | Downloaded. **+29 offset cipher; title and authors decoded, digit glyphs lost.** The 39.6 and 13.7 hour figures are therefore ~ and must be verified against the report's tables. |
| 20:30 | `povertyactionlab.org/publication/comparative-cost-effectiveness...` | **404** |
| 20:33 | `matthewakraft.com/s/Kraft-2020-Interpreting-Effect-Sizes-ER.pdf` | 302 → Squarespace; downloaded; **text extraction failed. Table 2 unread — the thresholds remain unverified.** |
| 20:34 | `accelerate.us/evidence-for-impact/` | **404 — the tier structure is unconfirmed. Do not assert it.** |
| 20:35 | `accelerate.us/research/cost-tool/` | Tool exists. **No cost categories, no ingredients-method citation, no dollar benchmarks on the page.** |
| 20:35 | `accelerate.us/press-release-efficiency-and-cost-effectiveness/` | Efficiency and cost-effectiveness definitions verbatim; 12 providers, 14 RCTs. |
| 20:38 | `evidencebasedpolicy.org/study-reviews-1/saga-tech-math-tutoring` | **Saga Tech: RCT n=2,065, 0.19 SD on end-of-year district tests, ~$2,600 per student.** Reviewer discloses Arnold Ventures as a former employer. |
| 20:40 | `economics.mit.edu/sites/.../cost-effectiveness-1.pdf` | J-PAL cost-effectiveness formula verbatim; the $15 / 0.15 SD worked example; 2010 USD, 10% discount rate. |
| 20:40 | `edworkingpapers.com/sites/default/files/ai19-10.pdf` | Downloaded; **extraction yielded nothing** for the Kraft 2020 schema table. |
| 20:36 | WebSearch, the "<2%" claim | **No primary source exists.** Surfaced NCES School Pulse Panel ~11% of students / 37% of schools as the closest federal figures (~, via Hechinger's reporting). |

---

## Consolidated list of blocked, dead, or degraded hosts

| Host | Failure | Consequence for the deliverable |
|---|---|---|
| `texreg.sos.state.tx.us` | Site-migration stub, no rule text served | Worked around via the Texas Register archive on `sos.state.tx.us` — 34 TAC ch. 16 is fully ✓ |
| `statutes.capitol.texas.gov` | Angular SPA, 250 KB shell, zero statutory text; five path variants, the legacy host and `/api/` all failed | Texas quotes taken from enrolled bills instead, which are equally primary |
| `support.withodyssey.com` | **403 to WebFetch and to curl with a browser UA, every path** | Odyssey vendor terms, approval timeline, fees and insurance remain unverified |
| `azed.gov` | Cloudflare; defeated only by the ego-browser skill | Arizona is ✓, but only because a real browser was used |
| `api.census.gov` | **API key now mandatory for every dataset** (ecnbasic, cbp, acs) | Nonemployer receipts, Texas income distribution and county detail all unobtained — the largest market-sizing gap |
| `bls.gov` | 403 to curl and bots; WebFetch succeeds | CE and OEWS obtained; the CE detail table 404s independently |
| `journals.sagepub.com` | 403 on all full text | Nickow 2024 and Kraft 2020 read as abstracts only; Kraft's Table 2 unread |
| `congress.gov` | 403 | FY2026 appropriations enactment date and public law number remain ~ |
| `ecfr.gov` | 302 → `unblock.federalregister.gov` on every request | 34 CFR §300.208 verbatim unobtainable; IDEA Part B wording is ~ |
| `chegg.com`, `kumon.com`, `mathnasium.com` | 403, including with a browser UA | All three companies' consumer prices are ~ |
| `fldoe.org`, `education.nh.gov`, `k12.ncseaa.edu`, `law.justia.com`, `cards.commerce.state.mn.us`, `doe.virginia.gov`, `michigan.gov`, `house.mi.gov`, `businesswire.com` | 403 or TLS chain failure | NH's public-school-enrollment rule, and the Virginia, Michigan and Arkansas 2026-27 state tutoring figures, stay ~ |
| `dese.ade.arkansas.gov` | TLS "unable to verify the first certificate" to WebFetch; works via `curl -k` | Arkansas obtained, but the 2026-27 handbook was not yet posted |
| `le.utah.gov` | JS-only, served no statute | Utah rests on the program FAQ |
| `lagator.la.gov` | NXDOMAIN | Louisiana rests on doe.louisiana.gov |
| `accelerate.us/grants/`, `accelerate.us/evidence-for-impact/` | 404 | No open vendor RFP; the tier structure is unconfirmed |
| `aeaweb.org` article page, `povertyactionlab.org` publication page | 404 | Guryan and J-PAL obtained from NBER and MIT copies instead |
