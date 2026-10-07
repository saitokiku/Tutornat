# The Record, Not the Answers — a minimalist plan for the AI-only SaaS

> **Superseded 2026-09-02.** The canonical business model is now
> `docs/STRATEGY.md` (v0.2). Where this file disagrees with it on model, pricing,
> waves or gates, STRATEGY.md wins; this file is kept for its mechanics and its
> history. Update STRATEGY.md first, then propagate.

*2026-08-13. Research-backed answer to: "if I just repackaged Claude/DeepSeek
with a Khan-style UI plus our own mastery, tracking, and school-responsibility
verification — what's the minimal version where the economics actually work?"
Sources at the bottom; every load-bearing number is cited.*

## The thesis in one paragraph

A repackaged LLM with a nice tutoring UI is a $0–4 product, because answers
are free and the reference implementation of "paid answers" is dead: Chegg
fell from a $14.5B company to a ~99% stock decline and 3.2M subscribers
(−31% YoY) within ~30 months of ChatGPT's launch, and Khan Academy — a
subsidized nonprofit — sells its GPT-powered tutor for **$4/month covering up
to 10 children**. You cannot out-price free or out-subsidize a nonprofit. What
parents demonstrably pay 5–10× more for is the layer **around** the model:
structure, verified progress, and a trustworthy record delivered to the person
who pays. Time4Learning charges **$24.95–39.95/month per child** largely
because its reports are exportable for state homeschool compliance; Synthesis
sells an AI-only math tutor at **$29–45/month** on the strength of engagement
plus weekly parent reports. The minimal viable product is therefore not "chat
with a tutor" — it is **the verified record of a student's real school
responsibilities**, with the AI tutor as the (cheap) way work gets done inside
it. Kaizen already owns the two hardest pieces: the magic-box intake of real
schoolwork and a mastery engine whose "unassisted, verified, delayed" claim
just survived an adversarial review. The plan is subtraction, one small new
build (the compliance/transcript exporter), and a wedge where the record is a
*legally motivated* purchase: homeschool families in grades 7–12.

## 1 · What the market evidence actually says

Three layers, three fates:

| Layer | What's sold | Price evidence | Fate |
|---|---|---|---|
| **Answers** | Homework help, solutions | ChatGPT/Gemini free; Chegg $15.95 → collapse | Dead as a paid product. Chegg −99%, subs 8M→3.2M; CEO called Google AI Overviews "as material" as ChatGPT |
| **Practice & content** | Drills, videos, flashcards | Khan free · Khanmigo $4/mo · IXL $9.95–19.95/mo · Photomath Plus $9.99 · Quizlet Plus $7.99 | Commodity band. Crowded, subsidized, low willingness-to-pay |
| **The record** | Structure + verified mastery + reporting/compliance for the payer | Time4Learning $24.95–39.95/mo/child (compliance-exportable reports) · Synthesis $29–45/mo (weekly parent reports) | **The only layer that holds a real price.** The buyer is the parent (or the state), not the student |

Two structural facts make layer 3 durable where layers 1–2 aren't:

1. **The payer is not the user.** A student wants answers (free everywhere).
   A parent pays for *evidence and peace of mind*; a state regulator requires
   *records*. Free chatbots produce neither.
2. **Verification cannot be faked by a better chatbot.** A mastery claim
   backed by unassisted, delayed, server-graded checks is precisely what a
   general-purpose assistant can't issue — and after this week's adversarial
   hardening (0030), ours withstood 40 agents trying.

The wedge market where "school responsibilities verification" is not a
nice-to-have but a *legal obligation*: **3.4M homeschooled students (6.3% of
US K-12), growing ~5.4%/year** — with ~22 states requiring annual testing or
a portfolio, 4 requiring formal review (New York wants an instruction plan
plus four quarterly reports **per year**), and the rest still needing
transcripts for college admission. Adjacent: **~750k microschool students,
38% of microschools receiving state ESA funds** — meaning a listed vendor
gets paid by the state, not the parent's credit card.

## 2 · The minimal product (keep / cut against what already exists)

The uncomfortable, pleasant truth: **this product is ~80% built and live in
`web/`.** Minimalism here is subtraction plus one new module.

**Keep (already built):**
- Magic-box intake — syllabus/photo/PDF → courses, assignments, weights.
  *This is the "your own custom education" part no generic tutor has.*
- Today/Plan dashboard (the Khan-like UI already shipped in the redesign).
- Socratic AI tutor with math rendering, hint ladder, academic-integrity mode.
- **The mastery engine** — unassisted/verified/delayed checks, evidence
  ledger, per-KC confirmation. The moat. Item bank: 8 live concepts + 90
  Algebra I items drafted and solver-verified, awaiting human promotion.
- Gradebook + GPA solver (this becomes the transcript's data source).
- Weekly/monthly parent reports (exist; get upgraded by the exporter below).
- One subscription (`ai_solo` is already wired end-to-end in Stripe).

**Cut / mothball (keep the code, flip nothing on):**
- The entire human layer: marketplace, Halls, Clinics, 1:1, Daily video,
  tutor hiring/vetting/payroll, hall board, memberships & allowance engine.
  It stays fail-closed behind `club_enabled=false` — which it already is.
- Voice (OpenAI Realtime): real cost, real complexity, no evidence it moves
  retention for this buyer. Off until data says otherwise.
- New marketing surfaces and design systems (standing rule stays).

**Build (the one net-new module): the exporter.**
A `docs`-quality PDF/CSV generator over data that already exists:
- **Compliance portfolio** — attendance/time-on-task (from sessions),
  work samples (from the ledger), assessment summary (from confirmed
  mastery), formatted per state category (notify / test-or-portfolio /
  formal-review).
- **Transcript & credit log** for grades 7–12 — courses, grades, GPA,
  credit hours; the thing homeschool parents of teenagers *must* produce
  for college admissions and 22 states' evaluators.
This is days of work, not months — it renders tables from existing rows.

**Model layer ("or whatever good API we need"):** keep the existing router
(fast/tutor/deep) and treat models as swappable COGS. Child-facing chat runs
on a US-hosted model (Haiku-class; caching instrumentation just landed).
DeepSeek's prices are astonishing (V4-Flash ~$0.14/M in, $0.28/M out, cache
hits ~50× cheaper) but the API stores data in the PRC under the National
Intelligence Law, its policy says the service is "not aimed at children," and
it's banned on government devices in Italy, Taiwan, Texas and several
agencies — for a minors' product sold on *trust*, that's disqualifying for
the child-facing path (US-hosted open-weight inference would be the only
acceptable route, and only if the privacy page can say so plainly). Grading
stays deterministic — the engine, not a model, is the verifier, which is both
the trust story and $0 of inference.

## 3 · Unit economics (where it works and where it dies)

**COGS is a rounding error; churn is the boss.**

Token math for a *heavy* student-month (≈500 tutor exchanges, ~3.5k-token
cached system/context, ~250-token replies), using current published prices:

| Path | Cost / heavy student-month |
|---|---|
| Haiku-class w/ prompt caching (child-facing) | ≈ $1.00 |
| Deep-model intake/report calls (2–3/mo) | ≈ $0.40 |
| Engine grading (deterministic) | $0.00 |
| **Total COGS** | **≈ $1.50–3 per family** |

At a **$19/month family plan** (or **$149/year**, ~35% discount to push
annual): gross margin ≈ 85–90%. Positioning: 5× Khanmigo because it tracks
*your* schoolwork and produces *your* records, ~half of Time4Learning because
we're not selling curriculum — Khan and the school already provide content.

**Churn reality (the number that kills consumer edtech):** B2C learning apps
retain ~30–50% of a cohort at 12 months; ~9–10% monthly churn is a normal
edtech figure, with summer as a cliff. Consequences, not hopes:

- **Annual-first pricing.** $149/yr with a "summer bridge" (June–Aug content
  keeps the record alive) beats $19 × leaky months. At 45% annual renewal,
  LTV ≈ $270 gross.
- **CAC budget ≤ $50–60 blended** (3:1+ LTV:CAC). Paid social at edtech's
  rising CAC is marginal at this price — so the channel plan below is
  organic/institutional, not ads.
- **The report *is* the retention feature.** Synthesis' parents stay for the
  weekly report; Time4Learning's stay because leaving means losing the
  record. Every week the exporter makes the record more valuable, churn's
  cost to the family rises.

**Break-even shape** (fixed infra ≈ $200–500/mo on the current stack):

| Families | ARR @ $149 | What it means |
|---|---|---|
| 25 | ~$3.7k | Infra covered |
| 250 | ~$37k | Real signal; fund content authoring |
| 900 | ~$134k | Solo-founder salary territory |
| 2,500 | ~$372k | Hire; expand item bank breadth |

No venture math required; the club/human layer can be re-lit later on top of
a working record business (it shares the same account, ledger, and record —
the original two-sided thesis survives intact, just re-sequenced).

## 4 · Go-to-market where the economics hold

1. **Homeschool grades 7–12 (the wedge).** The record is legally required or
   college-required; the 13+ COPPA scope already matches; parents in this
   segment already pay $25–40/mo/child for less-personalized tools. Channels:
   state-compliance SEO ("NY quarterly report template," "PA portfolio
   checklist" — pages that *generate the artifact free* and upsell the
   automated record), homeschool co-ops and conventions, curriculum-review
   sites (Cathy Duffy et al.), the two-anchor-family playbook from the
   original plan.
2. **ESA / microschool vendor listings (the cheat code).** 38% of
   microschools take state ESA funds; approved-vendor marketplaces
   (ClassWallet-style) make the **state the payer** — near-zero CAC,
   institutional stickiness, and microschools' weak spot is exactly
   record-keeping across 22 mixed-grade students.
3. **Then B2B2C.** Khanmigo's district price and Time4Learning's group plans
   show the path; not before 250+ families prove retention.

**Gate before any paid spend:** D30 activation-retention ≥ 40% and first
cohort annual-renewal intent; if a family that exported one compliance report
doesn't renew, the thesis is wrong and ads would only burn money faster.

## 5 · 90-day sequence (mapped to the repo as it stands today)

1. **Weeks 1–2** — Human sign-off on the 90 drafted Algebra I items
   (checklist already in `docs/reviews/ALGEBRA1_ITEM_BANK.md`); promote;
   `noBank` disappears across the core math chain. Reprice `ai_solo` as the
   family plan in `clubPricing.js` (hard rule 2; matrix row + Terms update
   ride along). Turn off voice behind its env flag.
2. **Weeks 2–5** — Build the exporter (portfolio PDF + transcript). Ship
   three state landing pages (NY, PA, plus one easy state for contrast).
   Apply to two ESA vendor programs.
3. **Weeks 5–12** — 25-family founding cohort at $99/yr founders' price
   (feedback + testimonials in exchange); instrument D7/D30 and
   report-export events; expand item drafts along the same pipeline
   (Geometry next) only as sign-off keeps pace.
4. **Standing rules unchanged:** no new design system, no new surfaces,
   selling stays fail-closed until counsel clears — the AI-only SKU is
   already the one path that doesn't wait on tutors, insurance, or halls.

## 6 · Risks, honestly

- **Free "study modes" from OpenAI/Google** keep commoditizing layers 1–2.
  Mitigation is structural: they cannot hold your school's syllabus, your
  state's reporting format, or a verified longitudinal record — and have no
  incentive to.
- **Khan Academy** could add reporting; it is a nonprofit whose incentive is
  scale, not compliance paperwork; watch, don't panic.
- **Engagement churn** (the Synthesis complaint pattern: kids lose interest).
  The buyer-side report cushions it but doesn't cure it; that's why the
  retention gate precedes spend.
- **Item-bank breadth** stays the honest ceiling on the mastery claim —
  market only what the bank covers (the claims-matrix rule already enforces
  this); breadth grows through the draft→solve→sign-off pipeline now proven.
- **Kill criteria:** D30 < 40% after two cohorts; annual renewal < 35%;
  blended CAC > $60 for two consecutive months; ESA listings rejected in
  both target states. Any two → stop, return to the club-first plan with the
  AI as companion only.

## Sources

- Chegg collapse: [Forbes — Chegg stock down 99%](https://www.forbes.com/sites/petercohan/2025/10/29/chegg-stock-down-99-learn-whether-ai-45-layoffs-make-chgg-a-buy/) · [OnlineEducation — ChatGPT crashes Chegg 48% in one day](https://www.onlineeducation.com/features/chatgpt-crashes-cheggs-stock) · [European Business Magazine — $14B lost, subs 3.2M, Google AI Overviews "as material"](https://europeanbusinessmagazine.com/business/chegg-stock-collapse-chatgpt-ai-disruption-2026/)
- Khanmigo pricing ($4/mo, $44/yr, 10 children, teachers free): [khanmigo.ai/pricing](https://www.khanmigo.ai/pricing)
- Time4Learning pricing & compliance-exportable reporting: [Time4Learning costs](https://www.time4learning.com/blogs/news/time4learning-and-abcmouse-homeschool-costs) · [Brighterly review, $24.95–34.95/mo/child](https://brighterly.com/blog/time4learning-cost/)
- Synthesis Tutor pricing/reviews ($29–45/mo, weekly parent reports): [Brighterly — Synthesis cost](https://brighterly.com/blog/synthesis-tutor-cost/) · [Unite.AI review](https://www.unite.ai/synthesis-tutor-review/)
- Practice-band comparables: [IXL $9.95–19.95/mo](https://brighterly.com/blog/ixl-cost/) · [Photomath Plus $9.99/mo](https://www.myengineeringbuddy.com/blog/photomath-reviews-alternatives-pricing-offerings/) · [Quizlet Plus $7.99/mo](https://www.thepricer.org/how-much-does-quizlet-plus-cost/)
- Homeschool population 3.408M / 6.26% / +5.4%: [NHERI 2024-25](https://nheri.org/how-many-homeschool-students-are-there-in-the-united-states/) · [JHU Homeschool Hub](https://education.jhu.edu/edpolicy/policy-research-initiatives/homeschool-hub/homeschool-growth-2024-2025/)
- State requirements (22 test/portfolio, 4 formal review, NY quarterly reports): [Blue Folder 50-state guide](https://bluefolder.app/guides/homeschool-laws) · [Starpath 2026 guide](https://www.starpathlearning.com/library/homeschooling-laws-by-state)
- Microschools ~750k students, 38% ESA-funded: [National Microschooling Center 2025 sector analysis](https://microschoolingcenter.org/news-blog/2025-american-microschools-sector-analysis) · [K-12 Dive](https://www.k12dive.com/news/what-you-need-to-know--about-microschools/827601/)
- Model prices: [DeepSeek pricing](https://deepseek.ai/pricing) · [Anthropic API pricing guide](https://www.finout.io/blog/anthropic-api-pricing) · [Gemini pricing](https://pricepertoken.com/pricing-page/model/google-gemini-2.5-flash)
- DeepSeek data-residency/minors concerns & bans: [The Hill](https://thehill.com/policy/technology/5126075-chinese-ai-model-raises-national-security-concerns/) · [BankInfoSecurity — Asian government bans](https://www.bankinfosecurity.com/asian-governments-rush-to-ban-deepseek-over-privacy-concerns-a-27476) · [DeepSeek privacy policy](https://cdn.deepseek.com/policies/en-US/deepseek-privacy-policy.html)
- Churn/retention: [Culta edtech benchmarks](https://culta.ai/benchmarks/edtech-benchmarks) · [Koji SaaS churn 2026 (edtech 9.6%/mo)](https://www.koji.so/blog/saas-churn-rate-benchmarks-2026) · [Blustream retention benchmarks](https://blustream.ai/blog/good-subscription-retention-rate-benchmarks-2025-2026)
- CAC context: [Business of Apps UA costs](https://www.businessofapps.com/marketplace/user-acquisition/research/user-acquisition-costs/) · [Userpilot CAC benchmarks](https://userpilot.com/blog/average-customer-acquisition-cost/)
