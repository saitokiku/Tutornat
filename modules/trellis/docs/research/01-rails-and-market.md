<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: shared/artifacts/kaizen-research/01-rails-and-market.md -->

# Kaizen — money rails and market for supplemental education first
**Researched 2026-09-11 · supersedes the marked figures in `Kaizen-AI/docs/STRATEGY.md` v0.2 (2026-09-02)**
**Scope:** supplemental education (tutoring, after-school, enrichment) for children already enrolled in some school — the stage-1 business. Texas first, then national.

**Mark key, used on every load-bearing figure:**
| Mark | Meaning |
|---|---|
| ✓ | Read in the primary source. URL, clause or table cite, and verbatim quote given for every regulatory claim. |
| ~ | Secondary source only. The source is named. |
| ✗ | The prior doc, or a commonly repeated figure, is wrong. The corrected figure follows. |
| ⧗ | Arithmetic derived from ✓ figures. Not a measured number. |

Every URL, fetch time and blocked host is in `01-METHOD.md` beside this file.

---

## 0. Verdict on the prior doc's marked figures

The prior strategy doc asked for its `~` and `?` marks to be resolved. Here they are, highest-consequence first.

| # | STRATEGY.md v0.2 claim | Verdict | Correction or confirmation |
|---|---|---|---|
| 1 | §529(c)(7)(E) requires tutoring "outside of the home" | **✓ confirmed** | And the doc **omitted two further conditions that bind harder**: the tutor must **not be related to the student**, AND must satisfy one of three credential prongs. See A.1. |
| 2 | TEFA tiers $10,474 / up to $30,000 / $2,000 | **✓ all three** | Formula is Educ. Code §29.361(a)(1), 85% of statewide average state+local per-ADA funding; $10,474 published for 2026-27. |
| 3 | "Public-school students are ineligible" for TEFA | **✗ wrong as written** | A public-school student **may apply and be awarded**. Participation *terminates* on ADA-counted enrollment (§29.355(b)(3)). The distinction matters for funnel design: you can market to public-school families, but they must leave to spend. |
| 4 | TEFA cash "Net-30 via ACH" | **✗ wrong** | Statute requires payment **not later than the 10th business day after the CEAO verifies the request** (§29.360(c)). No ACH or Net-30 language exists in statute or rule. Faster than the doc assumed. |
| 5 | Tranches 2026-07-01 (25% / 100% homeschool), 2026-10-01 (25%), 2027-02-01 (50%) | **✓ published dates** | But the **statutory outer limit is April 1, not February 1** (§29.362(a)(3)), and the rule adds "or as soon thereafter as appropriated funds become available" (§16.407(c)-(e)). Model cash flow to April. |
| 6 | Homeschool-tier norm-referenced test requirement "unread (?)" | **✓ resolved: NO** | The annual norm-referenced test is a condition of **private-school provider approval** (§29.358(b)(2)(B)); the parent's reporting duty covers only grades 3-12 **enrolled in an approved private school** (34 TAC §16.403(b)(4)(D)). No testing clause attaches to a homeschool-tier participant. |
| 7 | Texas tuition guidance bars TEFA-triggered price increases (~, school-level, "assume vendors face the same review") | **✗ understated — it is statute, and it binds you directly** | §29.365(a) and 34 TAC §16.404(a)(4)(B), the latter sworn **under penalty of perjury**, bar charging a participant more than "the established standard amount charged to all others." §29.365(b) separately bars any **rebate, refund, credit or sharing** of program money. The only carve-out (§16.404(b), different standard amounts by student category) is **available to private schools only, not to tutoring vendors**. One price, no TEFA discount, no referral credit. |
| 8 | ~1 in 4 funded TEFA participants has a documented disability | **✓ ~25%** | Plus: **80% of participants are under 200% FPL**, and funding stopped partway through Tier 2. |
| 9 | ~1,000 TEFA participants inside Austin ISD boundaries | **✓ 1,020** | Comptroller's statutory Annual Demographic Report, district-of-residence addendum. |
| 10 | ~6,000 TEFA participants in Central Texas | **~ approximately right** | The 17 Central Texas districts published individually sum to **4,943** ⧗. The ESC Region 13 total is in a table that did not extract from the PDF. Treat 5,000-6,000 as the band. |
| 11 | Comptroller Huffines sworn in 2026-08-01 | **✓** | Don Huffines, appointed to Kelly Hancock's unexpired term. Office on the November 2026 ballot. Odyssey remains the administering organization. |
| 12 | Marketplace take rates: Wyzant 25% ✓, Outschool 30% ✓, Preply 18-33% ✓ | **✗ all three understated** | Wyzant blended is **~31-32%** (25% tutor platform fee **plus** a separate 9% student service fee on a different base). Outschool is **>30%** (30% teacher fee plus an additive parent Marketplace Fee). Preply is **33% sliding to 18%** by cumulative hours **and takes 100% of every trial lesson with a new student**. |
| 13 | Tutoring pooled effect ~0.29 SD (Nickow et al., AERJ 2024) | **✓ 0.288 SD (SE 0.029)** | But the **title is wrong** in the doc's source list: the peer-reviewed paper is "The Promise of Tutoring for PreK-12 Learning," AERJ 61(1), 74-107. "The Impressive Effects of…" is the superseded 2020 working paper that carried 0.37. |
| 14 | 0.14-0.22 SD at scale (Kraft, Schueler & Falken, RER 2026) | **✓ close, tighten it** | Preferred at-scale estimates are **0.21 SD** (400-999 students) and **0.16 SD** (1,000+). Published **RER 2026**, EdWorkingPaper 24-1031. |
| 15 | Chicago Saga +0.18 to +0.40 SD (Guryan et al., AER 2023) | **✗ wrong** | The two RCTs report **+0.16 SD** (n=2,633) and **+0.37 SD** (n=2,710). Cost **$3,500-$4,300 per participant per year**. |
| 16 | Saga Tech 0.23 SD at one-third lower cost (~) | **✗ wrong** | Independently reviewed figure is **0.19 SD** on end-of-year district tests, n=2,065, ~**$2,600** per tutored student. |
| 17 | "Adopt Accelerate's cost method verbatim" for cost per SD | **✗ the method does not exist in that unit** | Accelerate publishes **efficiency** (hours of tutoring per one month of learning) and **cost-effectiveness** (months of learning per $1,000 per pupil). It deliberately converts SD into months. A cost-per-SD metric would be Kaizen's invention, not an adoption, and would not be comparable to any published benchmark. |
| 18 | "<2% get high-quality tutoring" has no source | **✓ confirmed, no source exists** | Closest federal figure: NCES School Pulse Panel, Dec 2022 — **~11% of public-school students** received high-dosage tutoring, **37% of schools offered it** (~, Hechinger's reporting of the NCES tabulation). Use the 37/11 gap, not "<2%". |
| 19 | Mathnasium benchmark: median centre ~$27k/mo, bottom quartile ~$14.7k/mo (AI-extracted FDD, unsourced) | **~ order of magnitude holds; real FDDs now read** | Six 2026 FDDs read from the Wisconsin registry. **Sylvan**: mean $375,780/yr, median ~$290,000, bottom-quartile mean $120,331 (= **$10.0k/mo**, lower than the doc assumed). **Huntington**: mean $609,454, median $533,106, bottom quartile $247,465. Mathnasium's Item 19 tables are vector images; $384,874 mean / $293,590 median remain ~. |
| 20 | Kumon royalty $38/student/subject/month (~) | **✓ confirmed** | 2026 Kumon FDD Item 6, read in full. Against ~$150-200 tuition that is a **20-25% effective royalty** ⧗. Kumon's Item 19 is **absent** — it makes no financial performance representation at all. |
| 21 | Franchisor take 12-20% of centre revenue | **✓ for four of five, Kumon is higher** | Mathnasium 10% + 2% ad; Sylvan 11%; Huntington 9.5% + 2% plus a **$57,000/yr own-spend minimum**; Best in Class 12% + 2%. Kumon's flat per-student royalty lands above the band. |
| 22 | Prenda ~$2,199/student/yr (~, unsourced) | **✓ confirmed** | Prenda's ESA rate is **$2,199/yr**, plus a separate guide fee; direct price $219.90/mo. |
| 23 | Synthesis Tutor ~$35-45/mo individual, ~$70/mo family, ~$119/yr family | **✗ partly wrong** | Company pages: **$35/mo, $25/mo billed annually ($300/yr), $999 lifetime**; Family $29/mo during an active sale. No $70/mo family tier and no $119/yr tier found. |
| 24 | Alpha sells Timeback to states at ~$2,000/student/yr (~ low confidence) | **✗ no basis** | **Timeback publishes no price.** timeback.com/schools has no pricing, no per-student cost, no licensing terms. Houston ISD is piloting it for 2026-27 at **no cost to the district** (~ Houston Public Media, 2026-08-03). Delete the $2,000 figure. |
| 25 | Alpha tuition not stated in the doc | **new ✓** | **$10,000** (subsidized Brownsville) to **$75,000** (San Francisco, Palo Alto); excluding Brownsville the floor is **$40,000**. 48 campus entries live. The widely-cited "$15k-$40k" range is badly stale. |

**Three claims the prior doc did not make that change the plan more than anything above:**

1. **§25F's tutoring rail has no credential test at all, and Texas has opted in.** The federal scholarship tax credit routes "qualified expenses" to **§530(b)(3)(A)** (Coverdell), not to §529(c)(7). The words are "academic tutoring," unqualified — no outside-the-home requirement, no credential requirement, no non-relative requirement. Texas is on the IRS participating-states list. First dollars move in 2027. See A.3.
2. **Virtual tutoring's pooled effect is 0.08 SD.** Kraft, Schueler & Falken, 59 estimates across 6 studies, against 0.44 SD in person ✓. Any AI-mediated or online-delivered seat starts its evidence case from there, not from 0.288.
3. **Florida PEP is the only large ESA a still-enrolled public-school child can spend on tutoring.** Its statute bars only *full-time* public or private enrollment. Cap 140,000 seats for 2026-27, $7,477-$12,217 per student ✓. Every other ESA in the country requires leaving public school, and Ohio ACE — the one true public-school-enrolled tutoring microgrant — **ended, with final claims October 15, 2025** ✓.

---

## A. Money rails for supplemental education

### A.1 IRC §529 after OBBBA — live now, but the tightest credential test of any rail

**Statute:** 26 U.S.C. §529(c)(7), amended generally by P.L. 119-21 §70413(a)(1). Read at `uscode.house.gov` (OLRC prelim) and corroborated word-for-word against the GPO enrolled Act ✓.

**The tutoring clause, §529(c)(7)(E), verbatim ✓:**

> "Tuition for tutoring or educational classes **outside of the home, including at a tutoring facility**, but only if the tutor or instructor is **not related to the student** and— (i) is **licensed as a teacher in any State**, (ii) **has taught at an eligible educational institution**, or (iii) is a **subject matter expert in the relevant subject**."

| Condition | Required? | Notes |
|---|---|---|
| Outside of the home | **Yes** ✓ | Statutory words. Online tutoring delivered *into* a student's home is **ungoverned and unresolved** — no IRS guidance. |
| Tutor not related to the student | **Yes** ✓ | "Related" is **undefined** in (c)(7); §529(e)(2)'s family definition is not cross-referenced. |
| Credential | **Yes — one of three** ✓ | "but only if" makes it mandatory. Prong (iii), "subject matter expert in the relevant subject," is **undefined** and is the practical catch-all. |
| Licensed in the delivering state | **No** ✓ | "licensed as a teacher in **any State**." |
| K-12 enrollment nexus | **Yes** ✓ | Lead-in: expenses must be "in connection with enrollment or attendance at, or for students enrolled at or attending" a K-12 school. §529 **does not define "school"** for (c)(7). Whether a purely home-schooled child with no school enrollment can satisfy the lead-in is **unresolved, with no IRS guidance** — the largest open legal risk on this rail. |

**All eight K-12 categories ✓:** (A) Tuition · (B) Curriculum and curricular materials · (C) Books or other instructional materials · (D) Online educational materials · (E) Tutoring, as quoted · (F) Fees for a nationally standardized norm-referenced achievement test, AP exam, or college-admission exams · (G) Dual-enrollment fees · (H) Educational therapies for students with disabilities by a licensed or accredited practitioner.

**The cap ✓ — and a correction worth carrying:**

| Item | Figure | Unit | Effective | Mark |
|---|---|---|---|---|
| Cap before OBBBA | $10,000 | per **beneficiary**, aggregated across all 529 programs, per taxable year | TY2018-TY2025 | ✓ |
| Cap after OBBBA | **$20,000** | same unit | **taxable years beginning after 2025 → first applies TY2026** | ✓ |
| "per account" | — | — | — | **✗ wrong.** The cap is per beneficiary across *all* programs. |
| "$20,000 from July 2025" | — | — | — | **✗ wrong.** Two effective dates split the change: new categories apply to **distributions after July 4, 2025**; the $20,000 cap only from **TY2026**. |
| Inflation indexing | **None** | — | — | ✓ absence verified in both compiled and enrolled text |

The cap lives in the last sentence of **§529(e)(3)(A)**, not in (c)(7): "shall, in the aggregate, include **not more than $20,000** in expenses described in subsection (c)(7) incurred during the taxable year" ✓.

**Who may be paid, and what Kaizen must carry ✓:**

- **No provider registration, accreditation, approval list or vendor enrollment exists.** Absence verified across the full text of §529.
- **No information-reporting duty on the provider.** The 529 *program* files Form 1099-Q (Instructions, Rev. 04/2025 ✓); the provider files nothing. A tutoring business is not an "eligible educational institution" (that term means Title IV postsecondary institutions), so a direct payment to it is reported **to the account owner**.
- **The provider is the evidentiary bottleneck.** The account owner must be able to prove, with no safe harbor: delivery outside the home, non-relation, which of the three credential prongs the tutor meets, the student's K-12 enrollment, and the amount and date. **Build per-tutor credential capture and a location-of-delivery record or the rail is unusable at audit.**
- **No IRS guidance on §529(c)(7) as amended exists as of 2026-09-11** ✓ — verified by absence: §70413 does not appear anywhere on the IRS OBBBA guidance hub (page reviewed 10-Sep-2026), the 529 Q&A page (30-Jan-2026) contains zero occurrences of "tutor," and Form 1099-Q instructions are unchanged.
- **Do not rely on IRS Topic no. 313.** It omits "Online educational materials" entirely and **silently drops the non-relative and credential conditions** ✓. Pub. 970 (2025) states them in full but still says "$10,000 of **tuition**," a stale pre-OBBBA phrase ✓. The statute governs; the two IRS restatements disagree with each other.

### A.2 Texas TEFA — the operating rail, and the credential question answered

**Sources:** enrolled SB 2 (89R) at capitol.texas.gov ✓; adopted 34 TAC §§16.401-16.410 plus the full adoption preamble, read via the Texas Register archive ✓ (the SOS TAC viewer is dead — site-migration stub); educationfreedom.texas.gov ✓; the statutory Annual Demographic Report, data as of 2026-07-29 ✓.

**Kaizen is a "vendor of educational products or services," not an "education service provider."** 34 TAC §16.404(i) routes private tutors and teaching services to vendor status. This is commercially load-bearing: §29.358(c) requires an education service **provider** to be "located in this state," while a **vendor** needs only to be "registered with the secretary to do business in this state" ✓. That is why out-of-state online vendors can qualify where an out-of-state provider cannot.

**Award tiers, 2026-27:**

| Tier | Amount | Cite | Mark |
|---|---|---|---|
| Accredited private school, or approved private pre-K/K | **$10,474** | 85% of statewide average state+local per-ADA funding, §29.361(a)(1); figure published by the commissioner | ✓ |
| Child with a disability, private school, IEP on file | base + district IEP-based amount, **capped $30,000** | §29.361(a)(2), (b) | ✓ |
| Homeschool, or **not enrolled in an approved private school** | **$2,000** | §29.361(b-1); 34 TAC §16.407(b) | ✓ |

**The rule is broader than the statute on the $2,000 cap, in Kaizen's favour.** §16.407(b) applies the cap by **enrollment status**, not homeschool status: a child "not enrolled in a private school or a private provider of a prekindergarten or kindergarten program that is an approved education service provider" is capped at $2,000 ✓. So **every tutoring-only family sits at $2,000 regardless of how they self-identify** — the Kaizen Home tier is bigger than "homeschoolers."

**Tutoring is an approved expense, with no private-school-enrollment precondition.** §29.359(a)(5): "fees for services provided by a private tutor or teaching service" ✓. 34 TAC §16.406(6): "fees for educational services provided by a private tutor or teaching service to the child" ✓. Nothing restricts it to enrolled private-school students — the prior doc's worry that tutoring might be "excluded for homeschool" is **✗ wrong**.

**The credential requirement — 34 TAC §16.404(i), verbatim ✓, and this is the single most important regulatory paragraph for stage 1:**

> "A private tutor, therapist, or employee of a teaching service shall be approved as a vendor of educational products or services by permitting electronic verification of, if available, or submitting proof that:
> (1) the individual providing the service to the child is not required to be discharged or refused to be hired by a school district under Education Code, §22A.157, and has not engaged in misconduct described by Education Code, §22A.052(b)(1), **by obtaining a complete national criminal history record review in an acceptable format and dated within 30 days of the application**;
> (2) the individual … is not included in the registry under Education Code, §22A.151;
> (3) **if a tutor or employee of a teaching service**: (A) is an educator employed by or a retired educator formerly employed by a school accredited by the agency, an organization recognized by the agency, or an organization recognized by the Texas Private School Accreditation Commission; (B) **holds a relevant license or accreditation issued by a state, regional, or national certification or accreditation organization**; or (C) is employed in or retired from a teaching or tutoring capacity at a higher education provider; and
> (4) **if a therapist**, the individual … possesses a current, relevant license or accreditation…"

| Question | Answer |
|---|---|
| Texas educator certificate required? | **No** ✓ |
| Bachelor's degree required? | **No** ✓ |
| Business accreditation required? | **No** ✓ |
| Criminal history review required? | **Yes — national, "dated within 30 days of the application"** ✓. Order them late; a review run too early invalidates the filing. |
| Per-company or per-tutor? | **Per individual tutor** — §29.358(b)(4)(A) says "each employee of the teaching service who intends to provide educational services to a participating child" ✓ |
| The widest door | **Prong (B)** — "a relevant license or accreditation issued by a state, regional, or national certification or accreditation organization" — is **undefined in the rule**, and the Comptroller **declined to define "teaching service"** ✓. This is the clause to build the tutor-credentialing scheme against. |
| Shortcut | §16.404(c): an approved **PDSES** (supplemental special education services) provider in good standing **"shall be approved as a vendor"** ✓. If Kaizen can qualify as a PDSES provider first, TEFA approval follows by rule. |

**Vendor application:** open now, rolling, at `https://tefa-vendors.withodyssey.com/registration/` ✓. Statutory basis §29.358(a). Approval is by the **Comptroller**; Odyssey runs intake. Requirements: Texas SOS registration, tax good standing, and a nine-part certification **under penalty of perjury** (§16.404(a)(4)) including audit cooperation, 30-day notice of falling out of compliance, and prompt return of improperly received money. **No application fee and no insurance requirement exist in statute or rule** ✓ (verified absence). Processing time ~4-6 weeks is **~ secondary only** — Odyssey's help centre 403-blocks every automated fetch.

**Payment mechanics ✓:**

| Question | Answer | Cite |
|---|---|---|
| Who holds the money | State program fund → Comptroller → Odyssey holds **in trust** per child. Not a parent-controlled wallet. | §29.353, §29.362(a) |
| Parent reimbursement | **Prohibited** | §29.360(f) |
| Cash withdrawal | **Prohibited** | §29.360(f)(1) |
| Who initiates | **The parent**, by purchase request in the marketplace | §29.360(b); §16.407(g) |
| Vendor invoices whom | Neither parent nor platform. Odyssey verifies and pays. | §29.360(c) |
| Payment term | **≤ 10 business days after verification** | §29.360(c) |
| Ceiling | Cannot exceed the child's account balance | §29.360(d) |
| Refunds | **You must refund Odyssey** "any payment received for services that are not provided in full"; refunds return to the child's account | §16.407(h) |
| Clawback | Comptroller may recover from a vendor "that was not approved at the time of the expenditure" | §29.364(d) |
| Price parity | "may not charge a participating child an amount greater than the standard amount charged for that service or product" | §29.365(a); §16.404(a)(4)(B) under penalty of perjury |
| Rebates and discounts | "may not in any manner rebate, refund, or credit to or share with a program participant … any program money" | §29.365(b); §16.404(a)(4)(D) |

**Funding and the market it actually creates, 2026-27 ✓:**

| Metric | Value |
|---|---|
| Biennium spending ceiling | **$1,000,000,000** (§29.3521(c-1), expires 2027-09-01) |
| Enacted appropriations act | **SB 1 (89R)**, not HB 1 — **✗ HB 1 died in committee**, last action 2025-02-25 |
| Applications received | ~274,000 |
| Determined eligible | >248,000 |
| Awards made | >122,000 |
| **Funded accounts** | **85,344** (as of 2026-07-29) |
| Waiting list | **>121,000** |
| Share with a qualifying disability | **~25%** |
| Share under 200% FPL | **80%** |
| Tier 3 (200-500% FPL) funded | **<30 students** |
| Tier 4 (≥500% FPL) funded | **0** |

**Funding stopped partway through Tier 2.** The entire 2026-27 TEFA customer base is low-income and disability-heavy; roughly 126,000 eligible middle- and upper-income applicants received nothing, and the statutory 20% cap on high-income spending was never reached. Central Texas anchors: Austin ISD 1,020 · Leander 574 · Round Rock 544 · Hays 441 · Georgetown 432 · Pflugerville 329 ✓.

**No sunset.** Subchapter J has no expiry ✓; only the $1B cap expires 2027-09-01. From the 2027-29 biennium the program spends **only what is appropriated** (§29.3521(c)). The Comptroller's legislative appropriations request must price in every participant **plus everyone on the waiting list as of January 1** (§29.3521(a)) — roughly a 2.5x ask. **The 90th Legislature convenes 2027-01-12, and the 2027-28 award amount is set by the commissioner by 2027-01-15.** If the appropriation does not rise, the Tier 3+ market stays shut.

### A.3 IRC §25F — 2027, and materially easier than §529

**Statute:** 26 U.S.C. §25F, added by P.L. 119-21 §70411(a)(1) ✓.

| Item | Figure / rule | Cite | Mark |
|---|---|---|---|
| Credit | 100% of qualified cash contributions to a scholarship granting organization | §25F(a) | ✓ |
| Annual cap | **$1,700 per taxpayer per year** | §25F(b)(1) | ✓ |
| Inflation indexing | **None as enacted** | absence verified in compiled and enrolled text | **✗** corrects "indexed after 2027" |
| National volume cap | **None** | absence verified — the House ECCA's cap did not survive | **✗** |
| Refundable | No; carryforward **5 years, FIFO** | §25F(f) | ✓ |
| Recipient income limit | **≤300% of area median gross income** as used in §42, prior calendar year | §25F(c)(2)(A) | ✓ |
| Recipient must be | "eligible to enroll in a public elementary or secondary school" | §25F(c)(2)(B) | ✓ |
| Scholarship taxable to family | **No** | §139K(a) | ✓ |
| First claimable | **taxable years ending after December 31, 2026** → TY2027 | §70411(c)(1) | ✓ — **✗** corrects the widely repeated "beginning after" |

**The tutoring question, and it is the most commercially important finding in this file.** §25F(c)(4) defines a qualified expense by cross-reference to **§530(b)(3)(A)** — Coverdell — **not** to §529(c)(7) ✓. §530(b)(3)(A)(i), verbatim, unamended by OBBBA ✓:

> "expenses for tuition, fees, **academic tutoring**, special needs services …, books, supplies, and other equipment which are incurred in connection with the enrollment or attendance of the designated beneficiary … as an elementary or secondary school student at a public, private, or religious school"

| Condition | §529(c)(7)(E) | §25F via §530(b)(3)(A) |
|---|---|---|
| Outside the home | **Required** | **Not required** |
| Tutor credential | **Required, one of three** | **None** |
| Tutor not related | **Required** | **None** |
| K-12 enrollment nexus | Required | Required |

**Two cautions.** First, IRS's own gloss in **Notice 2025-70** describes §530(b)(3)(A) as expenses "incurred at, required by, or provided by" a school ✓ — narrower than the statute, which for clause (i) requires only "incurred in connection with" enrollment. **The Notice does not mention tutoring at all.** Expect Treasury to be pressed on third-party tutoring the school did not arrange; do not treat "academic tutoring" as settled until proposed regulations issue. Second, **the real gatekeeper is the SGO, not the IRS**: Notice 2025-70 says IRS does "not anticipate that the forthcoming proposed regulations would prohibit an SGO from itself imposing additional governing provisions" ✓. Getting onto SGO approved-provider lists is the 2027 commercial task.

**SGO requirements ✓ (§25F(c)(5), (d)):** 501(c)(3), not a private foundation, separate non-commingled accounts; ≥10 students not all at the same school; **"not less than 90 percent of the income of the organization"** on scholarships (note: *income*, not receipts — a paraphrase, not a quote, in most write-ups); no expenses other than qualified ones; renewal and sibling priority; **no earmarking for a particular student**; household income verification.

**State opt-in — Texas is in ✓.** §25F(c)(1) requires a voluntary state election, made by the Governor or a designated authority (§25F(g)(1)(B)). The IRS Federal Scholarship Tax Credit page lists **30 states** as of 2026-07-24, **including Texas** ✓ (up from 27 in IR-2026-76 on 2026-06-08; the three additions are Kansas, Kentucky, North Carolina ⧗). Guidance stack: Notice 2025-70, Rev. Proc. 2026-6 (the exclusive advance-election procedure), Form 15714; **proposed regulations not yet issued** ✓. **No state has a finalized 2027 SGO list** — lists are due by 2027-01-01 "or as early as practicable," and until a specific SGO appears on a submitted list, contributions to it earn no credit ✓. The IRS list is ~7 weeks stale and IRS warns it may lag.

### A.4 Other state ESA, voucher and microgrant programs where a tutoring vendor can bill

**The decisive filter first.** Only **two** programs in the country let a child who remains enrolled in public school pay a tutor:

| Program | Status |
|---|---|
| **Florida PEP** | **Yes, part-time.** F.S. 1002.395 bars only a student "enrolled **full time** in a public or private school"; authorized uses expressly include part-time enrollment and contracted public-school services ✓. **Cap 140,000 for 2026-27**, $7,477-$12,217 per student. The best ESA vehicle in the country for tutoring a public-school child. |
| **New Hampshire EFA** | **Ambiguous.** RSA 194-F:1 defines an eligible student purely by residency — "a resident of this state who is eligible to enroll in a public elementary or secondary school" — with no enrollment bar in statute ✓. But it operates as a withdrawal program, and education.nh.gov 403-blocks every fetch. **Needs a direct confirmation from Children's Scholarship Fund NH.** |
| **Ohio ACE** | **✗ Dead.** The one large public-school-enrolled tutoring microgrant. "The Afterschool Child Enrichment (ACE) Education Savings Account program has ended"; final reimbursement claims 2025-10-15 ✓. Nothing replaced it. |

**Priority states, one row each:**

| State | Program | Award 2026-27 | Eligibility | Tutoring billable | Tutor credential rule (the actual words) | Vendor approval | Platform | Scale | Mark |
|---|---|---|---|---|---|---|---|---|---|
| **FL** | FES-UA (disability ESA) | **$9,671-$14,381** matrix 1-3; **$21,393-$25,701** matrix 254; **$34,443-$39,091** matrix 255 | IEP or physician/psychologist diagnosis; no income cap | **Y** — F.S. 1002.394(4)(b)8., "part-time tutoring services" | "a valid Florida educator's certificate …, an adjunct teaching certificate …, **a bachelor's degree or a graduate degree in the subject area in which instruction is given**, … demonstrated a mastery of subject area knowledge …, or … certified by a nationally or internationally recognized research-based training program as approved by the department" | Step Up For Students / AAA | ESA wallet + MyScholarShop | uncapped | ✓ |
| **FL** | FES-EO / FTC | **$7,477-$12,217** by district and grade | universal by income, priority ≤185% FPL | **Y** — same clause | identical statutory list | same | same | effectively uncapped | ✓ |
| **FL** | **PEP** | **$7,477-$12,217** | universal; not full-time enrolled | **Y** — "a private tutoring program" | identical statutory list | same | same | **cap 140,000**; 2026-27 applications closed 2026-04-30 ~ | ✓ |
| **AZ** | ESA | **$7,105-$10,540** grades 1-12; KG $4,718-$6,205; disability to **$47,725** | **universal** | **Y** — "Tutoring or teaching services" | **Loosest in the country**: "the tutor or teacher will need at least to provide his or her **high school diploma** or higher degree, which will serve as his or her accreditation…" and ADE "recognizes and accepts **homeschool diplomas** for this purpose." **No background check for tutors.** | ADE, ClassWallet registration optional | **ClassWallet** (2% vendor fee); Pay Vendor 2-10 business days; debit card supports PayPal/Square/Venmo | **99,709 students**, $1.09B; **tutoring = $33.5M, 17.3% of all spend, 107,715 orders** | ✓ |
| **AR** | EFA (LEARNS) | **$7,208** ~ | universal | **Y** | **none published** | ADE approves; must be added to ClassWallet | ClassWallet; Aug 20 / Oct 29 / Feb 4 / Apr 8 | post-June applications "pending available funding" | ✓/~ |
| **OH** | EdChoice + Expansion | $6,166 K-8 / $8,408 9-12 ~ | universal, income-scaled | **N — tuition only** | n/a | n/a | direct to school | ~95k+ ~ | ~ |
| **IN** | Choice Scholarship | ~$6,033-$7,588 | universal from 2026-27 ~ | **N — tuition only** | n/a | n/a | direct to school | ~70k+ ~ | ✓ amounts |
| **IN** | ESA (INESA) | **to $20,000** disability; **to $8,000** siblings | active IEP/SP/CSEP, ages 5-22 | **Y** — "Tutoring services" | **none published** | IDOE + Access Indiana + ClassWallet | ClassWallet | $10M appropriation ~ | ✓ |
| **TN** | Education Freedom Scholarship | **$7,530** (TISA base) | **universal**; must enroll in a registered non-public school | **Y, residual** — tuition first | **Hardest gate in the country**: "An individual must hold an **active TN teacher license**, and an agency must have accreditation through one of the groups listed in SBE Rule 0520-01-24-.07(1)(b)(2.)" | TDOE | EFS portal; **50% Aug 15 / 20% Oct 15 / 20% Jan 15 / 10% Mar 15** | 20,000 first-year cap ~ | ✓ |
| **TN** | IEA (disability) | ~$12,788 avg ~ | disability + prior TN public attendance | **Y, pre-approval required** | teaching certificate OR National Board OR **bachelor's or higher** OR industry certification OR passed Praxis; **plus TBI/FBI fingerprint check**; expired licenses OK, suspended/revoked not; **paraprofessionals barred; immediate family barred** | TDOE per-provider pre-approval | debit card, **direct payment only, no reimbursement ever**; ≥50% must be spent by mid-year | hundreds ~ | ✓ |
| **AL** | CHOOSE Act | **$7,000** school / **$2,000** homeschool (max $4,000/family) ~ | ≤**300% FPL** for 2026-27 ~ | **Y** — category "6. Private Tutoring" | "A private tutor must either be **accredited or have a bachelor's degree or state certification** … **Both private tutors and educational therapists must have a completed background check.** Documentation must be submitted at the time of application." | **ALDOR**, year-round, decision within 14 days ~ | ClassWallet | $100M+ ~ | ✓ |

**Other states where tutoring is clearly billable:**

| State | Program | Award | Tutoring rule words | Credential | Platform | Risk |
|---|---|---|---|---|---|---|
| **WV** | Hope Scholarship | **$5,435.62** | §18-31-7(a): "Tutoring services provided by an individual or a tutoring facility: Provided, That such … are not provided by a member of the … immediate family" | **None** beyond the family bar ✓ | TheoPay | universal from 2026-27 |
| **UT** | Utah Fits All | $8,000 school / $4,000 home 5-11 / $6,000 home 12-18 | "tutoring services;" in the qualifying-expense list | **None stated**; parent may not be paid | Odyssey | **Held unconstitutional April 2025, ruling stayed, Supreme Court pending** ~ |
| **IA** | Students First ESA | **$8,148** | "educational therapies, including tutoring or cognitive skills training" ~ | **Hard gate** — credentials "issued by the **Iowa Board of Educational Examiners** or other entity as approved through the State of Iowa" ~ | Odyssey | must attend an accredited nonpublic school |
| **LA** | LA GATOR | **TBD by legislature** (2025-26: $5,243 / $7,626 / to $15,253) | "Tutoring provided by a tutor or a tutoring service" | **None published** | Odyssey | 2026-27 amount not set |
| **WY** | Steamboat Legacy | **$7,000** | "Tutoring services" | **Not yet set** — "WDE is developing certification processes" | Odyssey | merits pending; provider certification not built |
| **MO** | MOScholars | ~$6-8k ~ | RSMo 166.705(4)(d) "**Tutoring services;**" — **no qualifier**, while (c) therapies require "a licensed or accredited practitioner" | **None for tutoring** ✓ | EAO portals | prior public attendance required |
| **NC** | ESA+ | $9,000 / $17,000 ~ | "Tutoring and supplemental teaching services … could include a live (not recorded) online or in-person class" | **Enrollment, explicitly not licensure**: "Tutors and supplemental teachers must **enroll with SEAA**" while "Educational therapists must enroll with SEAA **and hold a license or credential**" | ClassWallet | disability only |
| **OK** | Parental Choice TC, homeschool track | **$1,000** | Form 591-D: "Academic tutoring services provided by an individual or a private academic tutoring facility" | **None. No vendor approval at all.** Receipt-driven. | none | smallest wallet, lowest friction |
| **NH** | EFA | ~$4,265 base ~ | RSA 194-F:2(II) "Tutoring services provided by an individual or a tutoring facility" | **None in statute**; a catch-all makes CSF-NH policy govern | CSF-NH ~ | cap 12,500 ~ |
| **SC** | Education Scholarship Trust Fund | **$7,634** | tutoring among approved expenses | none specified | ClassWallet; provider decision in 10 business days | **cap 15,000 hit; 2026-27 closed, waitlist only** |
| **MT** | Special Needs ESA | ~$5-8k ~ | "• Tutoring", unqualified, while therapies need "a licensed or certified provider" | **None for tutoring** ✓ | **parent reimbursement, no platform** | **blocked by a district judge Dec 2025** ~ |
| **ID** | Parental Choice TC | **$5,000** / **$7,500** special needs | HB 93: "tuition or fees …, **tutoring**, nationally standardized assessments" | **None** | advance payment or return credit | **$50M cap hit, applications closed** ~ |
| **GA** | Promise Scholarship | $6,500 ~ | Y ~ | not verified | Odyssey ~ | **not verified this run — chase it** |

**Two structural reads.** Platform concentration: **ClassWallet** (AZ, AL, AR, IN, NC, SC) and **Odyssey** (TX, UT, IA, LA, WY, GA) reach most of the market — two integrations cover the country. And credentialing splits three ways: a hard teacher-licence gate (TN EFS, TN IEA, IA), a degree-or-certification-plus-background-check gate (AL, FL), and a near-zero gate (AZ, WV, MO, NH, ID, OK, MT, NC ESA+, TX at prong B). **Texas sits in the middle: no degree, no certificate, but a 30-day national criminal history review per tutor.**

### A.5 Federal and district money — what can actually write a check to a vendor in 2026-27

| Stream | Pays an outside vendor? | Who signs | Hard condition | Mark |
|---|---|---|---|---|
| Title I §1114 schoolwide | **Yes — "for-profit external providers" is in the statute** | LEA / school | needs assessment + schoolwide plan; supplement not supplant | ✓ |
| Title I §1115 targeted assistance | **Yes — same words** | LEA | only identified eligible children | ✓ |
| Title I §1003 school improvement (7% state reservation) | **Yes**; ≥95% flows via LEAs, SEA may arrange directly **only "with the approval of the local educational agency"** | LEA | CSI/TSI-identified school; evidence-based | ✓ |
| **Title I §1003A Direct Student Services (3%, optional)** | **Yes — and a participating state must publish a list of "State-approved high-quality academic tutoring providers"** offering "a range of tutoring models, including online and on campus" | LEA via state subgrant | **ED states on the record that Ohio is the only state using it** | ✓ |
| Title I §1117 equitable services (private-school students) | **Yes, explicitly by contract**: services may be provided "through contract by such public agency with an individual, association, agency, or organization," which "shall be independent of such private school and of any religious organization" | LEA (or SEA) keeps control of funds | — | ✓ |
| NCLB 20% SES set-aside | **Does not exist** | — | — | **✗** 20 U.S.C. 6316 and 6317: "Repealed. Pub. L. 114-95, title I, §1000(1), Dec. 10, 2015" |
| ESSER / ARP ESSER | **No** | — | obligation closed 2024-09-30; liquidation outer limit **2026-03-28**, five months before SY2026-27 began | ✓ |
| 21st CCLC (Title IV-B) | **Yes on the statute** — "another public or private entity"; FY2026 **$1,329,673,000**, flat four years running | SEA competition → subgrantee | **state RFAs may narrow it** — Texas's prescreened list is non-profit only | ✓ |
| IDEA Part B | **Narrowly** — only special education and related services in the IEP, excess costs, by staff meeting state personnel standards | LEA | general academic tutoring is not a Part B cost | ~ |
| Medicaid school-based services | **No** for tutoring | — | Medicaid pays for health services; academic instruction is not medical assistance | ✓/~ |

**Two current ED documents worth knowing ✓.** The **OESE letter to chief state school officers, 2025-03-31** says states "can use this flexibility so that parents can be given a range of options — advanced courses, dual enrollment, **academic tutoring** …" and that "**providers of these services do not become Federal grantees**." The **equitable-services Dear Colleague Letter, 2025-08-21** lists "one-on-one tutoring" and "home tutoring" in its menu and adds the clause a vendor should read twice: "An SEA … **may also conduct its own procurement to identify entities that provide services** … this would permit any interested LEA to use entities the State selected." Note also: ED has **no guidance document dedicated to high-dosage tutoring** ✓ — the "Title I funds high-dosage tutoring" framing traces to IES blog posts and advocacy briefs, not to ED guidance.

**Texas state tutoring money, with the statute people quote wrong ✓ (enrolled HB 1416 88R and HB 2 89R; statutes.capitol.texas.gov now serves no text to any fetcher):**

| Commonly cited | Correct for 2026-27 |
|---|---|
| ratio 1:3 | **1:4** — "in a group of no more than four [three] students, unless the parent or guardian of each student in the group authorizes a larger group" (§28.0211(a-4)(6)) |
| 30 hours | **15 hours**, or **30** if performance was "significantly below satisfactory"; the flat 30 was struck by HB 1416. 30 survives only for a student failing 2+ consecutive years (§28.0211(f)(1)(B)) |
| certified teachers required | **No** — "provided by a person with **training in the applicable instructional materials** … and under the oversight of the school district" (§28.0211(a-4)(7)) |
| must be on a TEA list | **No** — §28.0211(a-12) lets a district use an off-list provider "if the district can demonstrate to the commissioner that use of the service provider results in measurable improvement in student outcomes" |

**Two new Texas openings, both effective for 2026-27, both with unresolved process ✓:**
- **§28.0211(a-15)-(a-16), effective 2025-09-01:** "The agency **shall** approve high-impact tutoring providers," and a district contracting with one "**may use an outcomes-based contract**." A statutory mandate in the largest state, with **no application portal and no published list located**. This is the highest-value unknown in the whole public-funds picture.
- **§28.02111 / §48.317 Third Grade Supplementary Supports, applying beginning 2026-27:** **$400 per grant**, **paid from a state-held parent online account direct to the provider**, no district procurement. Whether a *company* can be an agency-approved provider turns on commissioner rules under §28.02111(i); the enacted approval clause names TIA-designated classroom teachers. **Unresolved and worth a phone call.**

**Accelerate is not a 2026-27 vendor revenue source** ✓ — its 2026-27 Call for Effective Technology (for-profits eligible, $150-250K by ESSA evidence tier) **closed 2026-02-20**; the State Implementation Fund "works exclusively at the state level." But its **Evidence for Impact** listing and NSSA's **Tutoring Program Design Badge** have become payment gates: Michigan's FY2027 School Aid statute accepts the NSSA badge as one of three qualifying standards ~.

---

## B. Market size and shape

### B.1 The measured anchor

**2022 Economic Census, NAICS 611691 "Exam Preparation and Tutoring," read from the Census flat file `EC2261BASIC.dat` ✓:**

| Measure | 2022 |
|---|---|
| Revenue | **$7,286,419 thousand = $7.286B** |
| Firms | 8,565 |
| Establishments | 9,750 |
| Employees | 111,399 |
| Annual payroll | $2,594,704 thousand |
| — subject to federal income tax | revenue $6,343,645k · 8,353 establishments |
| — exempt from federal income tax | revenue $942,774k · 1,397 establishments |
| Revenue per establishment | $747,000 ⧗ |
| **Revenue-to-payroll ratio** | **2.81x** ⧗ |

**12.9% of measured 611691 revenue is nonprofit** ⧗ — the code is not a for-profit census.

**The wider bucket, NAICS 6116 "Other schools and instruction," 2022 ✓:**

| NAICS | Industry | Revenue ($B) | Establishments | Employees |
|---|---|---|---|---|
| 6116 | Other schools and instruction, total | **33.32** | 58,784 | 498,471 |
| 611620 | Sports and recreation instruction | 11.64 | 20,627 | 172,233 |
| **611691** | **Exam prep and tutoring** | **7.29** | 9,750 | 111,399 |
| 611610 | Fine arts schools | 6.88 | 16,398 | 123,298 |
| 611699 | All other misc. schools and instruction | 4.89 | 7,858 | 54,235 |
| 611692 | Automobile driving schools | 1.33 | 2,593 | 17,992 |
| 611630 | Language schools | 1.29 | 1,558 | 19,314 |

**What 611691 excludes:** nonemployer businesses (the largest gap — an independent tutor with no payroll is invisible; Census Nonemployer Statistics would close it but `api.census.gov` now requires an API key for every dataset and the flat files are withdrawn); nonprofit after-school not classified to 6116 (Boys & Girls Clubs, YMCA, 21st CCLC grantees, district-run programs); cash in-home tutors; district-contracted tutoring where the provider is a staffing agency or edtech firm; edtech subscriptions (software publishing); and sports, music and arts instruction, which are deliberately in 611620 and 611610.

**The honest range:**

| Definition | 2022 measured | Est. 2025 ⧗ |
|---|---|---|
| Academic tutoring + test prep, employer firms (611691) | **$7.29B** ✓ | $8.9B (at the observed 6.81% CAGR) |
| + independent / nonemployer tutors | — | **$9.8-11.1B** (assumption, not measurement) |
| Tutoring + enrichment + test prep (6116 less driving schools) | **$31.99B** ✓ | **$38.6B** |

**Defensible: $9-12B for paid academic tutoring and test prep in 2025; $33-39B including enrichment.** Anything higher is counting edtech software, district budgets, or adult learners. Note 6116 includes adult customers; it is not a children-only number.

### B.2 Households

**Census CPS October 2024 School Enrollment Supplement, Table 8 ✓** (thousands of families):

| Family income | Families with a K-12 child ⧗ | Public only | Public + private | Private only | Any private ⧗ |
|---|---|---|---|---|---|
| Under $20,000 | 1,617 | 1,533 | 36 | 48 | 5.2% |
| $20,000-$74,999 | 8,716 | 8,052 | 127 | 537 | 7.6% |
| $75,000 and over | 14,206 | 12,270 | 374 | 1,562 | 13.6% |
| Not reported | 4,804 | 4,335 | 161 | 308 | 9.8% |
| **All** | **29,343** | 26,190 | 698 | 2,455 | **10.7%** |

**~29.3 million US families have a child in K-12; excluding non-reporters, 57.9% are at $75k+ ⧗ — 14.2 million families.** Asian-alone families are the sharpest sub-segment: 2,085 thousand with a K-12 child, **60.7% at $75k+** ⧗.

Student counts for cross-check, NHES Parent and Family Involvement 2023 (NCES 2024-113), SY2022-23 ✓: 52,995 thousand K-12 students — public 46,473k, private 4,828k, instruction-at-home 2,808k, homeschool 1,828k, full-time virtual 1,340k.

**Household spend — the CE education line cannot be used as a tutoring number, and here is why.** BLS Consumer Expenditure Survey 2024 ✓:

| Composition (Table 1502) | Consumer units (000s) | Education, mean annual $ |
|---|---|---|
| All consumer units | 135,760 | 1,569 |
| Married couple with children, **oldest child 6-17** | **14,910** | **3,484** |
| Married couple, oldest child 18 or over | 10,748 | **3,680** |
| One parent, ≥1 child under 18 | 6,161 | 1,343 |

| Quintile (Table 1101) | Education, mean annual $ |
|---|---|
| Lowest 20% | 828 |
| Second 20% | 407 |
| Third 20% | 749 |
| Fourth 20% | 1,353 |
| Highest 20% | **4,492** |

Two tells inside the table itself: the top quintile spends 11x the second, which tracks college enrollment; and "oldest child 18 or over" spends **more** than "oldest child 6-17," which only makes sense if college tuition dominates. For the 6-17 group the remainder is mostly private K-12 tuition. **The detailed CE lines that would isolate "other school expenses" were unreachable (`cu-all-detail-2024.xlsx` 404s). Do not let the $3,484 be presented as a tutoring figure.**

**There is no current federal tutoring-participation rate ✓ — a verified absence, not a retrieval failure.** NHES PFI 2023 contains **zero occurrences of the string "tutor"** across all 72 pages. Its non-school-activities table (A-5) covers community events, sporting events, concerts, bookstores, libraries, museums, zoos — no paid enrichment. The last federal tutoring-participation series is NHES:2007, scoped to NCLB supplemental educational services; the After-School Programs and Activities component was last fielded in 2005. **Any deck claiming a current "share of families who pay for tutoring" is quoting a vendor survey or a market-research estimate.**

The honest derivation instead: $9-12B ⧗ across 29.3 million K-12 families ✓ is **$310-410 per K-12 family per year averaged across all of them** ⧗, which at a realistic $1,500-3,000 annual ticket implies **roughly 11-27% of families buy something in a given year** ⧗. Arithmetic, not measurement.

### B.3 Growth

**Economic Census 2017 → 2022, both flat files read ✓:**

| NAICS | Industry | 2017 rev ($B) | 2022 rev ($B) | 5-yr change ⧗ | CAGR ⧗ |
|---|---|---|---|---|---|
| 6116 | Other schools and instruction | 24.33 | 33.32 | +36.9% | +6.48% |
| **611691** | **Exam prep and tutoring** | **5.24** | **7.29** | **+39.0%** | **+6.81%** |
| 611620 | Sports and recreation instruction | 7.85 | 11.64 | +48.4% | +8.21% |
| 611610 | Fine arts schools | 5.35 | 6.88 | +28.7% | +5.18% |
| 611630 | Language schools | 1.37 | 1.29 | **−5.4%** | **−1.10%** |

**The most actionable fact in this section: 611691 establishments rose only +3.0% (9,467 → 9,750) while revenue rose +39.0%. Revenue per establishment went $554k → $747k, +34.9% ⧗.** The industry grew because existing operators got bigger and charged more, not because more operators entered.

County Business Patterns 2023 ✓ (NAICS 611691): 9,820 establishments, 108,755 employees, **$3,014,523k payroll** — payroll **+16.2% in one year** ⧗ on slightly *lower* employment. Wage inflation, not headcount growth. Legal form: 1,452 C corps, 4,446 S corps, 1,325 sole proprietorships, 1,167 partnerships, **1,428 nonprofit**.

**Growing:** sports instruction fastest, tutoring next, price per site strongly, tutor wages sharply. **Flat:** establishment counts. **Shrinking:** language schools, the one sub-industry in outright decline — the cautionary case for anything a free app replaces.

### B.4 Composition

| Segment | NAICS | 2022 revenue ($B) ✓ | Share of 6116 ⧗ |
|---|---|---|---|
| Enrichment — sports and recreation | 611620 | 11.64 | 34.9% |
| **Academic tutoring + test prep, combined** | **611691** | **7.29** | **21.9%** |
| Enrichment — fine arts | 611610 | 6.88 | 20.6% |
| Other / misc instruction | 611699 | 4.89 | 14.7% |
| Driving schools | 611692 | 1.33 | 4.0% |
| Enrichment — language | 611630 | 1.29 | 3.9% |

Excluding driving schools: **enrichment ~63%, academic tutoring and test prep ~23%, other ~15%** ⧗. **Enrichment is 2.7x the size of tutoring, and sports instruction alone is 1.6x tutoring** ⧗.

**One-to-one versus small-group versus test prep is not measured anywhere in federal data.** 611691 is a single undifferentiated code. There is no primary split; do not accept one. 611699 is a genuine grab-bag (robotics clubs, cooking schools, CPR training) and cannot be cleanly assigned to children's enrichment.

### B.5 Prices and wages

**BLS Occupational Employment and Wage Statistics, SOC 25-3041 "Tutors," national, May 2025, retrieved via the BLS public API ✓:**

| Measure | May 2025 |
|---|---|
| Employment | **175,070** |
| Mean hourly | $23.10 |
| **Median hourly** | **$20.84** |
| 10th percentile | $14.15 |
| 90th percentile | $36.53 |
| Median annual | $43,350 |

A scope note that matters for hiring: **OEWS counts 175,070 people working as tutors across all industries, while 611691 employer establishments employ 111,399 people in all occupations** ✓. Most working tutors are employed somewhere other than a tutoring company. Kaizen hires into a labour pool it does not dominate.

**No federal collection of tutoring retail prices exists** (CPI has no tutoring stratum; CE's detail lines were unreachable). The defensible bound is arithmetic from ✓ figures:

| Derivation | Value ⧗ |
|---|---|
| Revenue-to-payroll ratio, 611691 2022 | **2.81x** |
| Implied retail rate at the median tutor wage | ~$59/hr |
| Implied retail rate at the 90th-percentile wage | ~$103/hr |

**A tutoring company collects about $2.81 for every $1.00 it pays its tutors.** Use it to sanity-check any price or pay claim — including Kaizen's own $27.50/hr and $40/hr tutor-pay assumptions, which at 2.81x imply $77 and $112 per tutor-hour of revenue.

### B.6 Texas

**TEA, Enrollment in Texas Public Schools 2025-26 (Doc. GE26 601 08, June 2026) ✓:**

| School year | Enrollment | Change |
|---|---|---|
| 2022-23 | 5,518,432 | +1.7% |
| 2023-24 | 5,531,236 | +0.2% |
| 2024-25 | 5,544,255 | +0.2% |
| **2025-26** | **5,467,642** | **−1.4%** |

**Texas public enrollment peaked in 2024-25 and fell 76,613 students in 2025-26 — the largest one-year decline in the eleven-year series, including the COVID year.** That is exactly what the choice expansion predicts, and it means the local child count is no longer growing. Also ✓: **59.9% of Texas public students are economically disadvantaged**, down year over year, consistent with lower-income families being over-represented among those who left. Texas is **11.2% of US public K-12** ⧗ and grew +7.4% over ten years while the US fell 1.1% ✓.

**Not obtained:** Texas private-school enrollment (NCES PSS 2023-24 is **not yet released**; most recent complete is 2021-22) ✓; a Texas homeschool count (**Texas requires no homeschool registration, so no state count exists**; the national NHES rate of 3.4% would imply ~190,000-290,000 ⧗, and the only Texas-specific numbers come from an advocacy organization); Texas household income by presence of children (blocked by the Census API key requirement); and the Austin metro slice. **County Business Patterns county files (`cbp23co.zip`) would give Austin-area 611691 establishment and payroll counts with no API key — the cheapest next read on local competitive density.**

---

## C. Incumbents and their playbooks

### C.1 The two public comparables

**✗ Both are NYSE, not NASDAQ, and both are in listing-deficiency territory simultaneously** — Nerdy received an NYSE Section 802.01C notice 2026-03-05, Chegg the same notice 2026-07-24 ✓. The entire public float of paid tutoring in the US is under a sub-$1.00 cure clock.

**Nerdy Inc. (NYSE: NRDY)** — all from SEC EDGAR: FY2025 10-K (filed 2026-02-26), Q2 2026 10-Q (filed 2026-08-06), earnings release, and the 8-K Item 2.05 ✓.

| ($000s) | FY2023 | FY2024 | FY2025 | Q2 2026 |
|---|---|---|---|---|
| Revenue | 193,399 | 190,231 | **178,988** (−6%) | **43,231** (−4.5%) |
| Gross profit | 136,447 | 128,394 | 103,780 | 27,984 |
| **Gross margin** | 70.6% | 67.5% | **58.0% GAAP / 62.3% non-GAAP** | 65% |
| Sales & marketing | 68,448 | 71,623 | **60,123** (33.6% of revenue) | 11,571 |
| Net loss | (67,669) | (67,142) | **(60,948)** | (6,856) |
| Operating cash flow | (7,560) | (15,603) | **(18,846)** | — |
| Cash | — | — | 47,900 | 38,424 |

| | Dec 2024 | Dec 2025 | Jun 2026 |
|---|---|---|---|
| Active Members | 37.3k ⧗ | **33.2k (−11% YoY)** | **29.1k** |
| ARPM (monthly) | $302 | **$364 (+21% YoY)** | $366 |

**Read those two lines together: average revenue per member up 21%, members down 11%.** Nerdy is holding revenue up with price increases against a shrinking base, and **spent $60.1M of sales and marketing in FY2025 to end the year with fewer members than it started**. No CAC, payback period or LTV is disclosed anywhere in the 10-K, the 10-Q or the release ✓.

**The school channel is being shut down.** 8-K Item 2.05, committed 2026-07-31: Nerdy "committed to **winding down its Varsity Tutors for Schools** business line to concentrate on its core Consumer operations," $2-4M exit cost ✓. Varsity Tutors for Schools was **$10.339M for the six months ended 2026-06-30** ✓. The only pure-play public company with a district sales motion just killed it.

**Chegg (NYSE: CHGG)** — the generative-AI casualty, quantified ✓:

| ($000s) | FY2023 | FY2024 | FY2025 | Q2 2026 | Q3 2026 guide |
|---|---|---|---|---|---|
| Net revenues | 716,295 | 617,574 | **376,908 (−39%)** | **51,800 (−51%)** | **43,000-44,000** |
| Gross margin | 68.5% | 70.7% | 60% | 55% | **48-49%** |
| Impairment | 3,600 | **677,239** | 2,000 | — | — |
| Net income (loss) | 18,180 | **(837,068)** | (103,421) | (2,960) | — |
| Restructuring | — | — | **51,500** | $14.4M severance H1 | $18M expected |

**Revenue is down 76.7% from FY2023 to the Q3 2026 guided run-rate, and gross margin is down 20 points.** A content-subscription business losing 20 points of gross margin is losing pricing power, not just volume. **Chegg has stopped publishing subscriber counts altogether** — verified absent from both the Q4 2025 and Q2 2026 releases ✓; the last published series is ~3.8M (Q3 2024) → 2.6M (Q2 2025), −40% YoY. Company's own words: "Changes in search interfaces continue to impact our traffic" ✓.

### C.2 Franchise economics, from six 2026 FDDs read in full

Pulled as PDFs from the Wisconsin DFI franchise registry ✓. Tutor Doctor's Wisconsin registration expired 2023-07-28, so no FDD was reachable.

| | **Kumon** | **Mathnasium** | **Sylvan** | **Huntington** | **Best in Class** | **Eye Level** |
|---|---|---|---|---|---|---|
| FDD | 2026 (3/27/26) | 2026 (5/5/26) | 2026 (4/24/26) | 2026 (4/16/26) | 2026 (4/30/26) | 2025 (4/21/26) |
| Item 7 initial investment | $101,630-$233,780 | $127,316-$165,846 | $117,600-$288,400 | **$191,992-$340,632** | $84,875-$146,000 | $49,968-$133,200 |
| Franchise fee | **$2,000** | $49,000 | $46,900 | $42,000 | $40,000 | n/e |
| Royalty | **flat $38/student/subject/month** | **10%** of gross receipts, min $1,500/mo from mo. 24 | **11%** | **9.5%** | greater of $250/mo or **12%** | n/e |
| Ad fund | $300/mo flat | 2% | local min $10,000/yr | 2% **+ $57,000/yr own-spend minimum** | 2% (cap 3%) | exists |
| **Item 19** | **NONE** — "We do not make any representations" | present, 914 centers, **tables are vector images** | present FY2025 | present FY2025 | present FY2025 | **NONE** |
| Mean centre revenue | — | ~$384,874 | **$375,780** (409 units) | **$609,454** (232 mature) | $223,624 (27) | — |
| Median | — | ~$293,590 | ~$290,000 | **$533,106** (range $47k-$3.09M) | $224,996 | — |
| Top-quartile mean | — | — | $795,074 | **$1,115,433** | $527,012 | — |
| Bottom-quartile mean | — | — | **$120,331** | $247,465 | $47,190 | — |
| US units 12/31/25 | **1,705 + 5 co.** | **1,043 + 4 co.** | **433 (net −43 in 2025)** | ≥253 | 36 + 1 | 121 |

**Three reads.** Kumon's $38 per child per subject per month against ~$150-200 tuition is a **20-25% effective royalty** ⧗, and Kumon makes **no financial performance representation at all**. **Sylvan lost a net 43 US centres in 2025** — the brand with the most name recognition is contracting about 10% a year. And **not one of the six FDDs contains a single mention of NWEA, MAP, randomized, What Works Clearinghouse, state test, or third-party evaluation** ✓. The franchise category sells hours and a brand and makes no verifiable learning claim anywhere in its legal disclosure.

Consumer prices: **Kumon ~$150-200 per subject per month** (~, and the 2026 FDD **does not disclose tuition at all** — it is set in the Operations Manual; kumon.com 403-blocks even a browser user agent ✓). **Mathnasium's price could not be confirmed** — mathnasium.com/faq returns 403 ✓.

### C.3 Marketplaces — take rates from each company's own terms

| Company | Take rate, own source | Consumer price | Mark |
|---|---|---|---|
| **Wyzant** (IXL) | "All tutors will retain 75% … Wyzant will retain a **25% Platform Fee**" **plus** a separate student service fee of "**9% of the total lesson cost**" | $35-60/hr | ✓ — **blended GMV take ~31-32%** ⧗, because the two fees sit on different bases |
| **Outschool** | "Outschool's take rate of **30%** of the Parent's payment" **plus** a parent "Marketplace Fee" explicitly "excluded from the Teacher Fee" | own guidance: $10-12/learner for 30-45 min group, $18-21/learner/hr, **$30/hr minimum for 1:1** | ✓ — effective take **>30%** |
| **Preply** | **33% → 18%** sliding on cumulative platform hours (28% after 20 hours, 18% at 400+). "**The commission for every trial lesson with a new student is 100%.**" | "$15-25 per hour" | ✓ (intermediate tiers render as an image) |
| **Varsity Tutors** | **Not a marketplace** — Experts are a cost line, no split. **No price list published**; `/pricing` is a 404 and the rates page carries zero dollar figures | only signal is **ARPM $366/month** | ✓ |
| **Tutor.com** (IXL) | institutional contracts; GSA schedule with "negotiable pricing"; consumer subscription price not published | sessions "about 20-25 minutes" | ✓ |

**The pattern: take rate scales inversely with evidence obligation.** Preply takes 18-33% and proves nothing. Outschool takes >30% and proves nothing. Wyzant's blended rake is ~31% and it proves nothing. **Tutor.com — the only one selling to institutions and the Department of Defense — is the only marketplace with third-party evidence, and it publishes no price.**

**IXL Learning is the consolidator with no exit clock** ✓ — founder-controlled, no disclosed outside rounds, buying from cash: Rosetta Stone, Vocabulary.com, Teachers Pay Teachers, Wyzant (2021), Tutor.com, MyTutor UK (2025). **Preply raised $150M Series D at $1.2B on 2026-01-21** ✓. Outschool's $3B 2021 mark is stale (~25% layoffs Dec 2022); its current motion is Outschool for Schools plus a full state-ESA apparatus ✓.

### C.4 Alpha School / 2 Hour Learning / Timeback — the closest rival claim, and its evidential basis

**Tuition 2026-27, from alpha.school/locations (48 campus entries) ✓:** $10,000 (subsidized Brownsville) · $40,000 (Austin, The Woodlands, Fort Worth, Southlake, Houston Heights, Scottsdale, OKC, Tulsa) · $45,000 (Raleigh, Charlotte) · $50,000 (Miami, Palm Beach, Plano, Nashville, Atlanta, Denver, Park City, others) · $55,000 (Chicago, Kirkland, Boca Raton) · $60,000 (Highland Park, Malibu, Jamaica Plain) · $65,000 (NYC, Bethesda, Boston, Santa Monica, Miami Beach, others) · **$75,000 (San Francisco, Palo Alto)**. Siblings: Texas Sports Academy $25,000 ✓, GT School ~$25,000 ~.

Not VC-funded ~: Joe Liemandt (Trilogy/ESW Capital) funds it and owns the software; Alpha's own blog calls Timeback "a $100 million project" ✓. **Campus count is a marketing number, not an audited one** — Tampa, Orlando, Phoenix, Folsom and Lake Forest all appear in earlier coverage and are **absent from the current locations page**, with no closure notice and no open-versus-announced status marker anywhere ✓.

**Every outcome claim is self-administered, self-scored, self-published NWEA MAP data with no control group ✓:**

| Claim | Instrument | Sample disclosed | Control | Audited or peer-reviewed |
|---|---|---|---|---|
| "learn twice as fast… top 1% nationwide" (homepage) | not named | not stated | none | **no footnote, no methodology, no third party** |
| "6.5x growth," "top 1-2% nationally" (2hourlearning.com) | NWEA MAP | "data collected from our **flagship campus**" | none | none |
| "top 1-2% across all subjects" (/results/) | NWEA MAP, **administrator not disclosed** | "**MAP Spring '23 and Fall '24 results at Alpha School**" — one campus, two windows, **no n** | none | none (the site's own growth cells render "0 x") |
| 99th percentile "virtually every grade K-12" (blog, 2026-02-17) | NWEA MAP vs NWEA 2025-26 norms | **~407 growth events, n=42-50 per grade, campuses not identified** | named elite privates as reference points, **not a matched control** | self-published (to its credit it flags "softening" in grades 4-6) |
| "2.8x faster learning" (unbound.school) | NWEA MAP | not stated | none | none |

NWEA supplies the norm tables; **NWEA validates nothing**. ✗ Correction worth carrying: Alpha **is** Cognia-accredited at all locations (2026) ✓ — the common "unaccredited" claim is stale — but **Cognia accredits process and governance, not outcome claims**.

**The single external anchor has not landed.** **Unbound Academy** — an Arizona tuition-free online **public charter**, grades 4-8, approved 4-3 — sits Arizona's AASA and AzSCI state assessments and **receives its first Arizona state letter grade in November 2026** ✓/~. That is the first externally administered, externally scored test of the model in existence. **The $40k-$75k private campuses that generate the marketing report no state data by design.**

**Timeback's price to schools or states: none published ✓.** timeback.com/schools has no pricing, no per-student cost, no licensing terms. Houston ISD is piloting Timeback at two elementary schools for 2026-27 within a nine-school, $500k-per-school initiative, and district leaders say Timeback comes **"at no cost to HISD"** (~ Houston Public Media, 2026-08-03). **The commercial model to schools today is free pilots plus per-pupil charter capture. There is no price card to compete with.**

### C.5 Free, nonprofit and AI — and the price floor

**Khan Academy / Khanmigo sets the floor for the whole category ✓:** Khanmigo for learners **$4/month or $44/year**, framed as a donation; Khanmigo for Teachers **free**; core Khan Academy "will always remain 100% free." To districts: **Enterprise Starter $10/student/year** for ≤1,000 licenses; custom above that; ~$15/student/year with student-facing Khanmigo at a 250-student minimum (~). ✗ The "$5/student," "$35/student/year" and "Palm Beach $11.49/student" figures circulating in AI-generated listicles appear on no Khan page. **Adoption SY24-25 ✓: 795 US districts (+38%), ~1.5M licensed learners (+52%), 2.0M global Khanmigo users; revenue $128M against $95M expenses.**

**Anything student-facing priced above $10-15 per student per year needs an argument for why it beats a nonprofit giving it away near cost.**

| | **Zearn** | **Amira Learning** | **Synthesis Tutor** | **MagicSchool** | **Ello** |
|---|---|---|---|---|---|
| Price to family | n/a | n/a | **$35/mo, $25/mo annual ($300/yr), $999 lifetime**; Family $29/mo on sale ✓ | free; Plus $8.33/mo annual ✓ | ~$14.99/mo or $139/yr; equity tier $0.99/mo ✓ |
| Price to district | **free ≤35 students; $2,500/school** (Louisiana DOE price list) ✓ | **$4.99/student/yr screener; $9 HMH bundle; $20 full suite** (California DOE) ✓ | quote-only | enterprise custom | none |
| Funding | ~Gates, Overdeck; FY2024 revenue $54.9M ~ | ~$40.7M; merged with Istation 2024, distributes via HMH | ~$9.6-17.5M (sources disagree) | **$45M Series B 2026-02-11**, Valor lead ✓ | ~$15M Series A 2023 |

**Paper is the cautionary case, and it holds the only independent evaluation that is negative.** Paper **abandoned the product that defined it** — 24/7 on-demand unlimited chat tutoring — and now sells **GROW High-Impact Tutoring**: scheduled small-group cohorts, ~3x weekly, 30 minutes, consistent tutor pairing ✓. Its own 2024-05-16 announcement concedes that on-demand access did not reach the students who needed it ✓. Go-to-market is now state-branded (GROW TX, GROW CA) ✓, selling into state tutoring money now that ESSER is gone. **No price published anywhere** ✓; ~advertised flat fees of $40-80 per *enrolled* student per year, paid whether or not the student logs in — exactly the model that dies when a one-time windfall ends.

The independent evaluation (~ Brown University + UC Irvine, Aspire Public Schools, spring 2021, published Oct 2022; provider identified as Paper by Hechinger): **take-up 19% without nudges, 27% with aggressive nudging; among students with D/F grades — the target population — just 12% ever logged on; effective cost ~$100 per tutoring hour; no causal learning effect, and no significant difference between nudged and non-nudged groups.** Named lost contracts ✓/~: Clark County NV (300,000+ students) and Hillsborough County FL both dropped it; Chalkbeat reports districts ended contracts "because too few students used the platform." Headcount went ~500 → ~180 office staff across at least four layoff rounds, after raising ~US$380M at a US$1.5B valuation ~. ✗ Paper's site asserts "ESSA Level III evidence" — **Level III is the lowest of four tiers, "promising," correlational** — and **names no validator** ✓.

### C.6 Microschools

| | **Prenda** | **Primer** | **KaiPod** | **Acton** |
|---|---|---|---|---|
| Price to family | **$219.90/mo** direct; **ESA rate $2,199/yr** + guide fee ~$4,000/yr ≈ $6,200/yr; $0 out of pocket where an ESA covers it ✓ | ESA/scholarship-funded, near-$0 in FL/AZ | "varies widely by location" — **no published number** ✓ | no network price: $8,000-$20,000 by campus ~ |
| Scale | "Over 1,000 adults have started microschools; nearly 10,000 students" ✓ | ~14 campuses ~ | "150+ founders, 30+ states" ✓ | **300+ schools, 42 states** ✓ |
| Funding | founder-led | $3.7M seed + **$15M Series A** (Founders Fund, Khosla) ✓; **✗ a16z is not an investor** | ~$1.5M seed (YC, GSV) | **not VC-funded** ✓ |

**Prenda's Arizona history is the instructive one ~.** Prenda grew by enrolling students in Sequoia Choice, an Edkey online charter: the charter collected per-pupil funding and **owned the state test results** while Prenda's guides taught. Sequoia Choice enrollment then fell 42% YoY after losing ~3,200 students who had been at Prenda, consistent with Prenda moving them onto direct Universal ESA funding. **The charter partner absorbed the damage and Prenda was not penalized — but note what the shift cost: moving from charter to ESA funding removed Prenda's only external test anchor.**

### C.7 What each verifies about learning, externally

**Four exceptions out of twenty-five:**

| Company | External verification |
|---|---|
| **Khan Academy / Khanmigo** | **Deepest in the set.** Six RCTs including a 2-year cluster-randomized Khanmigo trial (Hamilton County TN, ~6,900 students, 18 middle schools: **0.06-0.08 SD/yr**, 0.14 SD at full-year participation, NBER w35620) ✓; a **peer-reviewed PNAS** 200,000-student fixed-effects study on NWEA MAP (0.09-0.18 SD per 30 min/wk) ✓; a federal REL RCT; and an honest self-classification of its own headline as Tier 3 correlational. |
| **Zearn** | **RAND RCT**, 2022-24, 10,000 students, 64 schools: **+0.11 SD NWEA MAP** (+0.13 not-proficient) — **and it published the null honestly**: +0.07 SD on STAAR, not significant. **ESSA Tier 1 "Strong," badged by Johns Hopkins CRRE, 2025-07-08.** |
| **Amira Learning** | **Partial.** ESSA Level II QED **executed by Instructure** (June 2025), matched sample **79,084 K-5 students, 12 Louisiana districts**, on DIBELS and LEAP — real and large, vendor-commissioned, **no SD effect size published**. Its state screener approvals verify **measurement validity, not that its tutoring causes learning**. |
| **Tutor.com** | **Two ESSA Level II studies (2023, 2024) prepared by LearnPlatform/Instructure** — vendor-commissioned and quasi-experimental, but categorically stronger than every other marketplace. |

**Everything else verifies nothing external**, stated per company because the question was asked: Kumon, Mathnasium, Sylvan, Huntington, Best in Class, Eye Level, Tutor Doctor — nothing, own placement tests only, and nothing in any FDD. Varsity Tutors — "150,000+ clients," "4.9/5.0." Wyzant, Outschool — star ratings and enrollment counts. Preply — only its own "2025 Efficiency Study," self-published, no control, though CEFR is a real external scale so it is the **best-shaped internal claim** in the set. Chegg — nothing found. **Paper — the only one with independent evidence, and it is negative.** Synthesis — "98% of teachers reported improved math skills," self-reported survey, no method, no n: **weakest in the set.** MagicSchool — nothing, correctly, since it is a teacher-productivity product. Ello — `ello.com/research` contains **zero third-party or randomized studies**, read directly ✓. Alpha / 2 Hour Learning / Timeback — nothing yet. Prenda, Primer — nothing. KaiPod — nothing, and structurally cannot: its students are enrolled in someone else's online school, which owns the results. **Acton explicitly declines to measure** — the only one of the twenty-five honest about making no measured learning claim, which is also the only one whose marketing cannot be falsified.

✗ **The most useful correction available on Khan:** the famous "~20% greater-than-expected gains / 0.36 effect size" is a **correlational study Khan itself classifies as ESSA Tier 3 "promising"** ✓. The randomized US estimates are **0.06-0.22 SD**. The 0.36 is 2-5x the causal estimate. Khan labels it honestly; third parties quoting 0.36 as proof are misusing Khan's own taxonomy.

**The governing pattern: external verification tracks who signs the check.** The products that must clear state procurement (Zearn, Amira, Tutor.com) have third-party evidence because an ESSA tier is a condition of sale. The consumer and teacher-facing products verify nothing, because no buyer in their channel asks. And the one company that *was* independently evaluated got a bad answer and retired the evaluated product.

### C.8 Where the old playbook competes head-on, and where a verified record does not

Brand plus location plus curriculum plus hours sold puts Kaizen into the most crowded and worst-performing part of this market, against opponents whose structural advantages cannot be out-built: Kumon's 1,710 US centres collecting $38 per child per subject per month, Huntington's $609k mean mature-centre revenue behind a $192-341k build, Mathnasium's 1,047 units, and online a take-rate war where Preply starts at 33% and keeps 100% of trials, Outschool takes over 30%, and Wyzant's blended rake is ~31% — while the only public pure-play sells the same hours at $366 per member per month, lost 11% of members in FY2025, compressed gross margin from 70.6% to 58.0%, has lost money four years running, faces NYSE delisting, and as of 2026-07-31 is winding down its school channel outright. Chegg is the terminal case: down 76.7% of revenue since FY2023 because the marginal answer became free. Competing on hours means competing on price and convenience against free — Khan at $0 to families and $10-15 per student per year to districts — and against an unpriced, billionaire-subsidised alternative that gives Timeback to Houston ISD at no cost; and it means buying attention in the same auction where Nerdy spent $60.1M to finish the year smaller. **A product whose deliverable is an unassisted, delayed, externally-anchored verified learning record does not compete there, because it is not selling instruction, seat time, or a tutor: it sells the one artifact every incumbent in this study fails to produce.** Twenty-one of twenty-five verify nothing beyond internal assessments; the six FDDs do not contain the words NWEA, randomized, or third-party evaluation anywhere; Alpha's "top 1%" rests on self-administered MAP at one campus with no control; Paper's only independent evaluation found 12% of failing students ever logged in and no causal effect; and Khan's own randomized Khanmigo trial produced 0.06-0.08 SD with "minimal AI tutor engagement observed." **The buyers are different people with different budget lines.** The incumbents sell into a parent's discretionary household budget and a district's intervention line, both purchases of *service delivery* priced in hours. A verified record is bought out of the **assessment, accountability and admissions-evidence** lines: the state or authorizer that needs an instrument it did not administer — precisely the gap Prenda opened when it moved off charter testing onto ESA funding, and the gap Alpha's private campuses have by design; the ESA administrator obligated to show a legislature what $7,000 per child bought, with ~38% of microschools now on choice funds and no outcome instrument between them; the selective high school, scholarship committee or employer that must distinguish a transcript from a claim; and the homeschool or microschool family whose child's work is currently unverifiable to anyone outside the household. A family can buy 200 hours of Mathnasium and still have nothing externally defensible to show — that is the condition that makes the record purchasable. **Two places the non-compete claim breaks down and must be watched rather than asserted away:** Unbound Academy's first Arizona state letter grade in **November 2026** gives the 2 Hour Learning orbit its first externally administered result, and if Alpha starts publishing state-tested outcomes it acquires an anchored claim; and Zearn, Amira, Tutor.com and Khan already hold third-party or ESSA-tiered evidence, so any pitch implying nobody has evidence will be contradicted by four counterexamples. The accurate framing is that their evidence is **program-level and retrospective** — does this product work on average for districts — rather than **learner-level and portable** — what did this specific child demonstrably learn, attested by someone with nothing to gain. Different artifact, different signer.

---

## D. Evidence base

| Claim | Verdict | Correct figure and where it was read |
|---|---|---|
| Nickow, Oreopoulos & Quan pooled effect | **✓ 0.288 SD (SE 0.029, p<.001)** | **"The Promise of Tutoring for PreK-12 Learning," AERJ 61(1), 2024, pp. 74-107**, DOI 10.3102/00028312231208687. The figure **is in the published abstract** (SAGE full text 403-blocked; abstract read via Semantic Scholar and ERIC EJ1406037). |
| The 0.37 SD figure | **✗ superseded** | NBER WP 27476 (2020), titled "The **Impressive Effects** of Tutoring…", 0.37 SD (SE 0.088), 96 studies / 732 estimates ✓. **Do not quote 0.37 with a 2024 citation — that is a compound error: wrong number and wrong title.** |
| Tutor-type moderators (teacher ~0.48, paraprofessional ~0.45, volunteer ~0.32, parent ~0.09) | **✓ directions, ✗ as a basis for pricing** | In the 2020 meta-regression, coefficients relative to teacher tutors are −0.04/−0.06 (para), −0.11/−0.17 (non-professional), −0.13/−0.19 (parent), with standard errors of 0.115-0.301 ✓. **Every one is swamped by its standard error.** A plan that prices "certified tutors cost more and deliver more SD" leans on a difference this literature cannot distinguish from zero. |
| Effects by subject and grade | **✓** | "overall effects similar" reading vs math; reading higher in earlier grades, math higher in later; "effects tend to be strongest among the earlier grades"; in-school beats after-school; largest for programs run "at least 3 days per week" ✓ (both abstracts). |
| Kraft, Schueler & Falken at scale | **✓, tighten it** | **RER 2026** (DOI 10.3102/00346543261446660), EdWorkingPaper 24-1031. Full-sample pooled **0.42 SD** with a prediction interval of **−0.31 to 1.16 SD**. **Preferred at-scale: 0.21 SD (400-999 students), 0.16 SD (1,000+).** By size bin, full sample: <100 **0.55**, 100-399 **0.32**, 400-999 **0.25**, 1,000+ **0.14** — an almost linear decline. |
| **Virtual / remote tutoring** | **✓ new, and decisive for an online product** | **0.08 SD** (59 estimates, 6 studies) against **0.44 SD** in person ✓. |
| Researcher-designed tests | **✓** | Researcher-made tests run **+0.22 SD** higher; removing them costs **0.08 SD** on the aggregate ✓. |
| Outside the school day | **✓** | **−0.19 SD** ✓. |
| Group size | **✓** | Full sample 1:1 **0.43**, 2:1 **0.41**, 3:1 **0.30**, 4:1 **0.34**; in the preferred subsample, groups of 5+ land at **0.24-0.29 SD** ✓. The 1:4 seat is not meaningfully worse than 1:1 in this literature. |
| Peer review | **✓** | Peer-reviewed **0.45** vs non-peer-reviewed **0.22**; at ≥1,000 treated students, **0.33** vs **0.09** ✓. |
| Real-world scaled programs | **✓ sobering** | Two large post-pandemic US initiatives (2021-22): "uniformly smaller than **0.04 SD**," often precise nulls. Districts hiring their own teachers as tutors: reading **0.09 SD**, math **no effect**. UK National Tutoring Programme: KS2 math **0.06**, English **0.03**, KS4 **null** ✓. |
| Guryan et al., Chicago Saga | **✗ corrected** | AER **113(3), 2023, pp. 738-765**: **+0.16 SD** (n=2,633) and **+0.37 SD** (n=2,710), on district/standardized math tests and course grades; **$3,500-$4,300 per participant per year** ✓. Not "0.18 to 0.40." |
| Saga Tech | **✗ corrected** | **0.19 SD**, RCT n=2,065, six high-poverty high schools, **end-of-year district tests**, ~**$2,600 per tutored student** ✓ (Straight Talk on Evidence review). Not 0.23. |
| **Accelerate's cost method** | **✗ the premise is wrong** | Accelerate publishes **efficiency** — "hours of tutoring necessary to improve student learning by one month" — and **cost-effectiveness** — "additional months of student learning produced at a cost of $1,000 per pupil" ✓. Twelve providers, reanalysis of fourteen RCTs. ~Literacy mean 39.6 hours per month of learning (SD 25.3); math mean 13.7 hours (SD 6.9) — the PDF's digit glyphs did not survive extraction, so verify before printing. A **Cost Tool** exists (Excel and Sheets) but the page states **no cost categories, no ingredients-method citation, and no dollar benchmarks** ✓. `accelerate.us/evidence-for-impact/` **404s** — do not assert that a tier structure by that name exists. |
| Kraft (2020) effect-size schema | **✗ NOT VERIFIED — do not print the thresholds** | Venue confirmed: *Educational Researcher* **49(4), May 2020, pp. 241-253**, DOI 10.3102/0013189X20912798 ✓. **Table 2 could not be read** — SAGE blocked, and both the author's and Annenberg's PDFs resisted extraction. The circulating bands (<0.05 small, 0.05-<0.20 medium, ≥0.20 large; cost bands near $500 and $4,000/pupil) are **~ secondary only**. Indirect support: Kraft et al. call 0.16 and 0.21 SD "of medium to large magnitude" citing Kraft (2020) ✓. |
| J-PAL 2013 cost-effectiveness | **✓** | Dhaliwal, Duflo, Glennerster & Tulloch, in *Education Policy in Developing Countries* (Univ. of Chicago Press, ch. 8). Method verbatim: "the marginal change in test scores … divided by the marginal change in costs" ✓; 2010 USD, 10% discount rate. Worked example: "a remedial education program that cost **$15 per child per year** increased test scores by **0.15 standard deviations per child**" ✓. The per-$100 headline figures are **~ secondary** — they live in figures that did not extract. Note the chapter is mostly an argument for **heavy caveating** of comparative cost-effectiveness ratios. |
| "<2% receive high-quality tutoring" | **✓ no source exists** | Closest federal figure: NCES School Pulse Panel, Dec 2022 — **~11% of public-school students** received high-dosage tutoring, **37% of schools offered it** (~, Hechinger's reporting of the NCES survey). Use the 37/11 gap. |

### D.1 What to plan on

**Plan on 0.10-0.20 SD on an externally administered test. If delivery is online or AI-mediated, plan on 0.05-0.10 SD.** The reasoning, entirely from ✓ figures:

| Layer | Figure |
|---|---|
| Peer-reviewed meta-analytic pool | 0.288 SD |
| Broadest pool, including researcher-made tests and tiny pilots | 0.42 SD |
| Strip researcher-designed tests | −0.08 SD |
| Programs serving 400-999 students | **0.21 SD** |
| Programs serving 1,000+ students | **0.16 SD** |
| Delivered virtually | **0.08 SD** |
| Outside the school day | −0.19 SD |
| Large post-2020 public initiatives, as actually delivered | **<0.04 SD** |

Four independently documented mechanisms all push the same way: smaller effects at larger scale, smaller on third-party tests than researcher-made ones, smaller after school than during it, smaller virtually than in person. **A provider that is large, online, after-school and measured on a state test stands at the intersection of all four discounts.** The prior doc's "plan on 0.15-0.20 SD on an external test" is defensible **only for in-person delivery at sub-1,000 scale**; it is not defensible for the AI-mediated path.

**For the metric itself, four changes:**
1. **Put the denominator's provenance in the metric's name.** "Cost per SD (third-party test, program >400 students)" is defensible. Unqualified "cost per SD" silently inherits roughly a 2.5x inflation from small-pilot, researcher-test studies.
2. **Anchor the cost side on verified figures:** $3,500-$4,300 per student per year for in-person high-dosage (Guryan et al.) and ~$2,600 for Saga's tech-enabled model. At 0.16 SD and $2,600 that is **~$16,000 per SD, or ~$1,600 per 0.1 SD** ⧗. Publish the arithmetic, not just the ratio.
3. **Publish months-of-learning alongside SD.** Accelerate's field-standard unit is months per $1,000 per pupil; districts and legislatures buy in that unit. A cost-per-SD-only number will not be comparable to anything a buyer already holds.
4. **Do not build tutor-pay tiers on the tutor-type moderators.** Those differences are not statistically significant in the source meta-regression — which also means the $27.50/hr versus $40/hr certified-tutor distinction in the seat model cannot be justified on evidence grounds. It can be justified on TEFA credential grounds, which is a different and better argument.

---

## E. Gaps in the prior doc for a supplemental-first, AI-in-the-loop product

Listed, not speculated on.

1. **The §25F rail is treated as a pricing footnote, not a channel.** It is the only rail where tutoring qualifies with no credential, no outside-the-home and no non-relative test, Texas has opted in, and the gatekeeper is each SGO's own approved-provider policy. There is no plan for getting onto SGO provider lists before the TY2027 money moves, and no Texas SGO named.
2. **No tutor-credential architecture exists anywhere in the doc.** Three rails impose three different tests: §529 needs one of three prongs plus non-relation plus outside-the-home; TEFA needs a 30-day-fresh national criminal history review plus one of three pathways per individual; Tennessee needs an active state teaching licence. This is a hiring-and-records system, not a compliance footnote, and it is the thing that actually gates revenue.
3. **The 0.08 SD virtual-tutoring estimate is absent,** and it contradicts the Kaizen Online house-tutor line's implicit assumption that remote delivery carries the same evidence as in-person.
4. **"Outside of the home" is unresolved for online delivery and the doc does not flag it.** §529(c)(7)(E) requires the tutoring be outside the home; a student receiving remote tutoring *in* their home is not obviously outside it, and no IRS guidance exists. This is a live risk to the Kaizen Online 529 revenue assumption.
5. **The §529 K-12 enrollment nexus is unaddressed.** Every (c)(7) category requires connection to enrollment or attendance at a K-12 school, and §529 does not define "school." Whether a purely home-schooled child qualifies at all is unresolved — which directly undercuts using 529 money for the Kaizen Home tier.
6. **Price parity is stronger than the doc assumes and kills three common growth tactics.** Sworn under penalty of perjury, it bars any TEFA-family discount, any referral credit, any scholarship funded from program money, and any rebate. The private-school carve-out for differential pricing by student category is not available to vendors.
7. **The refund and clawback exposure is not modelled.** 34 TAC §16.407(h) makes unearned prepayments refundable to Odyssey on demand, and §29.364(d) allows clawback from the vendor for expenditures made while unapproved. A standing seat billed in advance carries a contingent liability the seat model does not show.
8. **No plan for the $400 Third Grade Supplementary Supports grant,** which begins in 2026-27, is paid from a state-held parent account **direct to the provider** with no district procurement, and whose provider-eligibility rules for companies are unresolved. It is the only new Texas parent-directed instrument aimed squarely at the grade band Kaizen's diagnostic serves.
9. **No plan for TEA's §28.0211(a-15) high-impact tutoring provider approval,** which is a statutory mandate since 2025-09-01 with outcomes-based contracting expressly authorised by (a-16) — and which has no discoverable application route. For a company whose whole thesis is verified outcomes, an outcomes-based contract authorised by statute is the most natural fit in the entire public-funds landscape and it is missing.
10. **The PDSES shortcut is missing.** 34 TAC §16.404(c) says an approved supplemental special education services provider in good standing **shall** be approved as a TEFA vendor. Given that ~25% of TEFA participants have a documented disability and the doc already identifies the disability tier as the only one that can carry a seat, PDSES approval is the cheapest path to both.
11. **Florida PEP is absent, and it is the only large ESA a still-enrolled public-school child can spend on tutoring** — 140,000 seats, $7,477-$12,217. For a supplemental-first business whose customers are by definition already enrolled somewhere, this is the single best-fitting program in the country and Texas does not have an equivalent.
12. **Arizona's demonstrated tutoring demand is absent.** $33.5M of ESA spend, 17.3% of the total, across 107,715 orders in one state with a high-school-diploma credential bar. It is the existence proof for ESA-funded tutoring at scale and the cheapest state to enter.
13. **The enrichment market is 2.7x tutoring and the doc plans only academic tutoring.** Sports instruction alone is 1.6x tutoring. If the lattice and the record are subject-general, the larger adjacent market is unexamined.
14. **No reckoning with the $10-15 per student per year district price floor Khan has set,** which bears directly on Kaizen Gov's "bill the verification event" pricing.
15. **Texas enrollment is now shrinking** (−1.4%, −76,613 students in 2025-26) and the doc's market assumptions predate that turn.
16. **ESSER is not a source and the doc does not say so explicitly.** Obligation closed 2024-09-30; liquidation outer limit 2026-03-28. Any district-side revenue assumption resting on recovery money is void.
17. **Title I's actual vendor doors are unnamed** — "for-profit external providers" appears verbatim in §1114, §1115 and §1003, and §1003A obliges a participating state to publish an approved tutoring-provider list with "meaningful choices, including online." Only Ohio uses §1003A. Getting a state to elect the 3% reservation creates a list that does not currently exist.
18. **Nerdy's exit from the school channel and Paper's pivot away from on-demand are the two most recent natural experiments in this market, and neither is in the doc.** Both say the same thing: unscheduled, unsupervised access does not get used, and district channels do not pay for it.
19. **The credential-as-payment-gate trend is missing.** Michigan's FY2027 School Aid statute accepts the NSSA Tutoring Program Design Badge as one of three qualifying standards. A badge and a ProvenTutoring listing are becoming prerequisites in statute, not marketing.
20. **No counterparty concentration analysis.** Odyssey holds the money in Texas and in five other states; ClassWallet holds six. Two platform integrations cover most of the national market, and a single platform failure or contract change is an existential revenue event. The doc notes Idaho dropped Odyssey for non-payment but does not treat the concentration as a risk to register.

---

## F. Questions only the founder can answer, and facts still unreached

### F.1 Ten questions for Manny

1. **Which rail does the first dollar come from?** Cash, 529, or TEFA. They impose three different credential regimes, and the answer determines what you hire for in month one. You cannot optimise for all three at once.
2. **Are you willing to be a single-price business, permanently and under oath?** TEFA's parity certification is sworn under penalty of perjury and bars discounts, referral credits, scholarships from program money and rebates. That forecloses sliding-scale pricing, which is the usual way an education business serves a population that is 80% under 200% FPL.
3. **Given that the 2026-27 TEFA cohort is 80% under 200% FPL and ~25% disability, is the $450-650 standing seat the right product, or is the product the $2,000-tier bundle plus a disability-tier seat?** A $550 seat exhausts a $2,000 award in 3.6 months. Year one's funded population cannot buy the flagship.
4. **Will you pursue PDSES approval first?** It converts TEFA vendor approval from an application into a rule ("shall be approved"), and it points straight at the disability tier — but it is a different regulatory posture, with IEP-adjacent obligations and a different staffing profile.
5. **Is the record's first buyer a parent, a state, or an admissions committee?** The incumbent analysis says the record is bought from the assessment and accountability budget, not the tutoring budget. If that is right, stage 1's job is to generate the evidence corpus, not the revenue — and the seat is a research instrument you are charging for. Is that how you want to run it?
6. **In person or online, for the first hundred students?** The evidence says 0.44 SD in person and 0.08 SD virtual, and §529 requires tutoring be outside the home with online delivery unresolved. The cheap path and the defensible path point in opposite directions.
7. **Do you want Texas-only, or Texas plus Arizona and Florida?** Arizona already spends $33.5M of ESA money on tutoring with a high-school-diploma credential bar; Florida PEP is the only program a still-enrolled public-school child can use. Texas is home and Odyssey-based, but it is not where ESA tutoring demand is proven.
8. **What is the honest answer when a parent asks how much better their child will do?** The defensible number is 0.10-0.20 SD in person, 0.05-0.10 SD online. That is real but modest, and it is smaller than every number on every competitor's homepage. Do you lead with it?
9. **How much unverified-revenue exposure are you willing to carry?** TEFA can claw back from the vendor, requires refunds of unearned prepayments to Odyssey, and can suspend a provider on 30 days' notice. A standing seat billed in advance against a state-held account is a different risk object than a parent's credit card.
10. **What does "the AI is the record" mean when the randomized evidence on AI tutors is 0.06-0.08 SD with "minimal AI tutor engagement observed"?** Khan's own two-year RCT is the best evidence in the field and it found that students barely used the AI. Is the AI the instrument that produces the record, or the thing the record is about?

### F.2 Five facts that still need a primary source, and why they were not reached

| Fact | Why not reached | Cheapest way to close it |
|---|---|---|
| **TEA's §28.0211(a-15) high-impact tutoring provider approval process and list** | The statute mandates it, effective 2025-09-01, but no application portal, form, or published list exists on tea.texas.gov. The old Texas Tutoring Supports page 404s and the Vetted Texas Tutor Corps appears defunct. | Phone TEA's accelerated-instruction team. This is a call, not a search. |
| **Whether a company can be an agency-approved provider for the $400 Third Grade Supplementary Supports grant** | Turns on commissioner rules under Educ. Code §28.02111(i), which were not located. The enacted approval clause names only TIA-designated classroom teachers. | Same call; or watch the Texas Register for the commissioner's rule adoption. |
| **Odyssey's vendor terms: approval timeline, fees, insurance, payment method** | `support.withodyssey.com` returns **403 to every automated fetch**, including curl with a browser user agent. Statute and rule are silent on fees and insurance (verified absence), so the terms are the only source. | Drive it with the ego-browser skill, or create a vendor account and read the terms as a signed-in applicant. |
| **Census NAICS 611691 nonemployer receipts, and Texas/Austin household income by presence of children** | `api.census.gov` now requires an API key for **every** dataset (ecnbasic, cbp, acs all return "Missing Key"), and the nonemployer flat files have been withdrawn. This is the largest single gap in the market sizing — independent tutors are entirely invisible without it. | Free key at `api.census.gov/data/key_signup.html`. Unblocks the nonemployer gap, the Texas income distribution and county-level competitive density in one step. Meanwhile `cbp23co.zip` needs no key and gives Travis and Williamson county 611691 counts. |
| **Kraft (2020) Table 2 effect-size and cost thresholds** | SAGE returns 403 on all full text; the author's PDF redirected to Squarespace and neither it nor the Annenberg copy yielded extractable text (custom font encoding). | Institutional access, an interlibrary copy, or emailing the author. Until then the thresholds stay ~ and must not be printed as ✓. |

**Also unreached and worth naming:** Mathnasium's Item 19 dollar values (vector images in the FDD — about four pages of OCR on the archived PDF would convert them to ✓); Kumon's and Mathnasium's consumer prices (both sites 403-block plain fetchers; the ego-browser skill would get them); Georgia's Promise Scholarship (large, tutoring-billable, Odyssey-administered, not verified this run); New Hampshire's public-school-enrollment rule, which is the highest-value open question in the state table because its statute leaves daylight no other state does (education.nh.gov 403-blocks everything); and the 2026-27 figures for Virginia, Michigan and Arkansas state tutoring money, all three of which block automated fetches and all three of which hold numbers currently marked ~ that would move a go/no-go.
