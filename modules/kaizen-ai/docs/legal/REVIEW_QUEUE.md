# Legal review queue

Nothing in this file is legal advice, and nothing here has been reviewed by
counsel. It tracks what a qualified attorney must review before the associated
capability is marketed or sold. Two markers are used:

- `[ATTORNEY REVIEW]` — drafted text or a factual disclosure that needs counsel
  sign-off before it is relied on.
- `[FOUNDER INPUT REQUIRED]` — a fact only the founder can supply.

**These marker strings must never render to a user.** A build gate
(`web/test/legalMarkers.test.mjs`) fails CI if either appears in `web/app/**`.
That is why the markers live here, in `docs/`, and not in the rendered pages.
Live pages carry only factual, plain-language disclosure of how the product
actually behaves (matched to code), which is accurate description, not legal
opinion.

---

## Resolved facts (founder-confirmed)

- **Entity:** Kaizen Academy LLC (2026-07-28).

## Open — required before the tutoring marketplace opens (`marketplace_enabled=true`)

The marketplace is currently gated OFF, so nothing below is being sold yet. Each
item must be cleared before the gate is flipped.

1. `[FOUNDER INPUT REQUIRED]` **State of organization, registered agent, notice
   address, and governing-law / venue** for Kaizen Academy LLC. Terms currently
   say "the U.S. state in which Kaizen Academy LLC is organized" as a placeholder;
   counsel needs the actual state named.

2. `[ATTORNEY REVIEW]` **Group drop-in session terms.** The live Terms and Safety
   pages now disclose, matching code exactly:
   - Homework Hall up to 8 students per tutor; Subject Clinics up to 6
     students, minimum 2 seats or the clinic auto-cancels ~2h before start with
     everyone made whole (payment refunded, or the included visit returned);
   - 12-hour student refund window (vs 24h for 1:1), because a late drop can drop
     the group below minimum;
   - under the club model Kaizen sets prices and pays tutors a flat hourly rate
     (items 10–11, 15); the old revenue-share split (25% platform fee on group,
     11% on 1:1) survives in code for pre-club rows only and is no longer
     disclosed on any live page.
   Counsel should confirm the refund/cancellation framing and the minors-together
   -on-video disclosure are adequate.

3. `[ATTORNEY REVIEW]` **Tutor independent-contractor classification** and the
   tutor agreement / code of conduct (in-product, versioned acceptance).

4. `[ATTORNEY REVIEW]` **Cancellation / auto-renewal language.** Ground it in
   ROSCA + FTC Act §5 + applicable state automatic-renewal statutes. Do NOT cite
   the FTC "click-to-cancel" Negative Option Rule — vacated by the 8th Circuit,
   2025-07-08. Easy cancellation remains the practice regardless.

5. `[ATTORNEY REVIEW]` **W-9 / 1099-NEC SOP.** Threshold is **$2,000** for
   payments on/after 2026-01-01 (OBBB, 2025; first filings Jan 2027), not the
   old $600. Applies once tutor payouts run through Stripe Connect.

6. `[ATTORNEY REVIEW]` **Background-check representations.** Every surface now
   states no third-party criminal background check is run and tutors are
   interviewed/approved by staff. Confirm this disclosure is sufficient for a
   minors-facing service in the states of operation, and define what must change
   here if checks are added later (FCRA disclosure/authorization/adverse-action).

7. `[ATTORNEY REVIEW]` **In-session text chat / recording policy.** Sessions are
   not recorded (disclosed). Decide and document whether in-room text chat is
   logged+disclosed or disabled.

8. `[FOUNDER INPUT REQUIRED]` **Subprocessor list + regions** — the actual
   production processors (Supabase, Vercel, Anthropic, OpenAI, Stripe, Daily,
   Resend, Google) and their regions, and each provider's train-on-data posture,
   before a subprocessor page is published.

9. `[FOUNDER INPUT REQUIRED]` **Insurance status** (general + professional
   liability) before live minor-facing tutoring at scale.

---

## Open — added by the Academic Club build (club_enabled gate)

The club model replaced tutor-set rates + revenue share with house pricing +
flat hourly tutor pay. The `club_enabled` app_settings gate stays OFF until
these are cleared with counsel:

10. `[ATTORNEY REVIEW]` **Money-transmission posture under house pricing.**
    Under the club model Kaizen sets retail prices, sells the session as the
    merchant of record, and pays tutors an agreed hourly rate as a cost of
    delivery — it no longer holds and forwards tutor-owned funds at tutor-set
    prices. That analysis is why the old `marketplace_enabled` rationale
    (Stripe Connect prerequisite) may no longer bind — but counsel must confirm
    it before live keys, per state.

11. `[ATTORNEY REVIEW]` **Contractor classification under flat hourly pay.**
    Company-set prices + admin-set hourly rates + a company-scheduled weekly
    grid materially strengthen an employee-classification argument relative to
    the old set-your-own-rate marketplace. Terms still say "independent
    contractors." Needs review (ABC-test states especially) before scaling the
    tutor roster; blocking for scale, not for a small launch — counsel to
    confirm even that.

12. `[ATTORNEY REVIEW]` **Membership allowance terms** (narrowed by founder
    decision, 2026-08-12). Banked rollover is REMOVED from code and Terms.
    What Terms disclose, matching code exactly: memberships Club $45 / Plus
    $79 / Max $109 per month include 4 / 8 / 12 Homework Hall visits; past the
    allowance, member pricing is Hall $9/$8/$7, Clinic $16/$14/$12, and 1:1
    $50/$47/$44 per hour by tier (all interpolated on the Terms page from
    `web/lib/server/clubPricing.js`, the single pricing source — no hand-typed
    dollar figures survive there, enforced by `web/test/priceTruth.test.mjs`);
    included visits are calendar-month use-or-lose, resetting on the 1st, with
    no carry-over, banking, or stored value; month-to-month, no free trial,
    cancel-anytime from the billing page; included-visit cancellations return
    the visit inside the same windows as money refunds.
    A missed week is handled by a DISCRETIONARY grace-visit courtesy,
    implemented as an admin negative-quantity `usage_ledger` row (the existing
    refund mechanism; see `web/lib/server/clubBilling.js`), never an
    entitlement or balance, and disclosed in Terms as a no-cash-value
    courtesy. The remaining counsel question shrinks to: confirm the
    auto-renewal disclosures (ROSCA + applicable state ARL statutes) and that
    the discretionary-courtesy language avoids stored-value characterization.
    Fallback structure pre-agreed if ARL exposure prices high: an annual
    access-fee, member-pricing-only model; migration is trivial (zero out
    `includedHallMonthly`, add an annual SKU).

13. `[ATTORNEY REVIEW]` **Homework Hall service description.** The product is
    shared supervision (1:8), not private tutoring; Terms and the pricing page
    explicitly do not promise per-student minutes. Confirm the disclosure
    suffices under state UDAP for a minors-facing paid service.

14. `[ATTORNEY REVIEW]` **Parent-managed teen accounts.** A parent creates a
    13+ teen's login, consents at creation (recorded with timestamp + audit
    row), and books on the teen's behalf. Under-13 remains blocked everywhere
    (signup AND the parent flow). When the under-13 expansion is built, the
    COPPA verifiable-parental-consent method must be selected with counsel
    (checkbox-at-creation is the right architecture but not per-se VPC;
    card-on-file at subscription may qualify).

15. `[FOUNDER INPUT REQUIRED]` **Tutor pay-rate band confirmation.** Code
    enforces $22–$50/hr (certified tier default $40; 0033, ceiling raised by 0035) (0023 CHECK). Confirm this is the intended offer band
    before hiring copy goes out.

16. `[ATTORNEY REVIEW]` **Email-only guardian consent cannot tell a guardian
    from a teenager with a second inbox.** This is a known, unresolved limit of
    the mechanism, not a bug awaiting a patch, and it is the gate standing
    between a 13–17 year old and live one-to-one video with an adult.

    What the code actually proves: somebody with access to the address on file
    opened our email and clicked a link. Nothing more. It does not establish
    that the person is an adult, that they are a parent, or that they are a
    different human being from the student. A teen who creates a second free
    mailbox satisfies the gate end to end, from their own keyboard, in about a
    minute. No amount of application code closes that — it is the difference
    between confirming an address and verifying a person.

    The mitigations that DO exist, and exactly what each one buys:
    - The guardian address must differ from the account's own login address, so
      the trivial case (naming yourself) is refused. *(Enforced in the browser
      at signup and server-side on every later change — see the open gap in the
      next paragraph.)*
    - Once a consent is actually recorded, the address is **frozen**: it can
      only be moved by our team, because re-pointing approval after the fact is
      the shape of both an account takeover and a teen relocating the gate.
    - Changes before consent are **capped** (3 per 30 days, counted from the
      audit log) and **every** change is audit-logged with old and new values,
      so "try addresses until one sticks" leaves a visible trail and then
      stops.
    Together these give a paper trail and a ceiling. They are detection and
    friction. **They are not verification, and we should not describe them as
    consent verification anywhere a parent will read it.**

    A gap counsel should know about specifically: those rules govern *changing*
    an already-set address. The **first** address — the one supplied as browser
    auth metadata at signup and written straight onto the profile — is governed
    only by the client-side sameness check, which a direct API call skips. The
    address that matters most is the least defended one. It is on the fix list
    (`docs/reviews/FULL_CODE_REVIEW_2026-08-18.md`, A4), but even fixed it
    raises the floor without changing the answer to the question below.

    **The question:** is address-confirmation consent sufficient for a
    minors-facing service before live video with minors opens, or does the
    minor-facing video product require a stronger method — a card-on-file
    micro-charge on the paying parent's instrument, a signed consent form, an
    identity-verification vendor, or a phone/voice callback? Note the two paths
    a minor can reach a tutor by are not equivalent: a **parent-managed** teen
    account (item 14) has an adult behind it by construction and is already
    required to be one, while a **self-signed-up** teen supplying their own
    guardian address has nothing behind it but this email. If a stronger method
    is required, tell us whether it is required for both paths or only the
    second, and whether it must land before `club_enabled` or before the first
    booked 1:1. Related: item 14 (parent-managed teens) and the COPPA VPC
    method selection it defers to the under-13 build — the standard there is
    higher, and if we are going to buy a vendor for that anyway, counsel should
    say whether to buy it once, now.

## Added 2026-09-02 — from the strategy v0.2 research (`docs/STRATEGY.md`)

Nothing below has been reviewed by counsel. Each was surfaced by research whose
environment could not read the primary statute or rule; the citations are to
what was read, and every Texas item is marked for primary re-read.

17. `[ATTORNEY REVIEW]` **Standing-seat terms replace membership terms in item
   12.** The product is now a reserved recurring in-person place — 2 × 75 min/
   week, 1:4, named tutor, monthly verified report — at one price for every
   payer (cash, 529, TEFA). Item 12's allowance/rollover analysis still applies
   to the retail drop-ins; the seat needs its own cancellation, make-up and
   auto-renewal language. STRATEGY §5.1.

18. `[ATTORNEY REVIEW]` **Price parity and anti-rebate on public rails.** Texas
   has published school-level TEFA guidance barring program-triggered price
   increases and requiring return of advance payments when a student leaves
   (educationfreedom.texas.gov tuition-and-fee guidelines — read as an excerpt
   only). Confirm the vendor-side rule in SB 2 / 34 TAC ch. 16, and whether a
   free Community Hall, a $14 retail seat and a $550 seat can coexist under it.
   Draft the one-price policy as a CLAIMS_MATRIX row.

19. `[ATTORNEY REVIEW]` `[FOUNDER INPUT REQUIRED]` **Tutor credentials for the
   rails.** Every public rail except Arizona requires credentialed tutors: TEFA
   (reported: Texas educator certificate, or current/retired staff of a
   TEA-accredited or TEPSAC-recognised school, or higher-ed teaching, plus
   fingerprinting under §29.358(b)(2) — **not read in the statute**); IRC
   §529(c)(7)(E) (read: licence in any state, or postsecondary teaching, or
   subject-matter expert; tutoring "outside of the home, including at a
   tutoring facility"; tutor unrelated). The current "interviewed and approved,
   $22–50/hr (certified tier default $40; 0033, ceiling raised by 0035)" pool cannot bill any of them. Founder: decide the certified-tutor
   tier and pay band. Counsel: whether "each employee of a teaching service"
   reaches 1099 contractors (interacts with items 3 and 11), and who attests
   "subject matter expert" on a 529 invoice.

20. `[ATTORNEY REVIEW]` **"Tutoring" versus "supervision."** Item 13 and the
   live Terms define Homework Hall as shared supervision, not tutoring. Every
   rail pays for *academic tutoring* (§530(b)(3)(A); §529(c)(7)(E)). The seat is
   tutoring at 1:4 by a credentialed tutor; the Hall stays supervision. Confirm
   the two definitions can sit in one Terms document without either
   undermining the other's rail eligibility.

21. `[ATTORNEY REVIEW]` **California SB 243 exposure on the shipped 13+
   tutor.** The chaptered text (Ch. 677, effective 2026-01-01; read via mirror)
   lists exhaustive exclusions with no education carve-out and attaches
   known-minor duties (disclosure, 3-hour break reminder, crisis protocol;
   $1,000/violation private right of action). `web/lib/prompts.js:71` gives
   the tutor a persona and discloses AI only "if asked"; a stated 13–17 birth
   year makes the minor known. Question: are the duties owed today? The four
   prompt edits that make it moot are STRATEGY §6 Wave 1 item 7 and should
   ship regardless. Related: NY GBL Art. 47 (three conjunctive prongs) and
   Washington HB 2225's education exemption, which California lacks.

22. `[FOUNDER INPUT REQUIRED]` **Entity prerequisites for the TEFA vendor
   application.** Reported requirements (not primary-read): Texas SOS
   registration and franchise-tax good standing; W-9; fingerprinting for
   service staff. Confirm Kaizen Academy LLC's SOS status and answer item 1
   (organising state) — the same fact gates both. Also ask Odyssey vendor
   support, in writing: can a monthly seat be listed and auto-charged, or only
   itemised sessions; and is an AI study companion "technology" (reported 10%
   cap) or an uncapped "online learning program".

23. `[ATTORNEY REVIEW]` **Kaizen Certified is a franchise as drafted.** 16 CFR
   436.1(h) (read on two eCFR mirrors): mark + significant control/assistance +
   required payment ≥ $735 in six months. "Curriculum + trellis + ops for
   $1,000–2,000/mo" under the Kaizen mark meets all three. Nothing is being sold; this
   item exists so the Wave 3 structure (STRATEGY §5.4 options A/B/C) is chosen
   with counsel before any centre pays anything.

## Added 2026-09-02 — the first hire

24. `[ATTORNEY REVIEW]` `[FOUNDER INPUT REQUIRED]` **Program Director
   classification, and the payroll that follows.** Hired 2026-09-02: one person,
   $50/hour, 15 hours a week, hours and schedule set by the founder, teaching
   our students from our curriculum in a room we arrange, using our admin
   console, representing Kaizen to parents, paid whether or not a seat sells
   (`docs/hiring/PROGRAM_DIRECTOR.md`). Under the IRS common-law test and the
   Texas Workforce Commission's 20-factor test that reads as an **employee**,
   not an independent contractor. Item 11 asked the same question about a pool
   of hourly tutors; this is the concrete instance, with a real person and a
   real rate. Counsel: W-2 or 1099, and if W-2, what has to exist before the
   first payment — TWC unemployment-tax registration, withholding, an offer
   letter, and whether to elect Texas workers' compensation (elective by
   statute; declining it forfeits the exclusive-remedy defence). Founder: do not
   state a classification to the director in writing until this clears; keep a
   timesheet from day one either way. Related: item 15 (pay band — the code
   ceiling is now $50, migration 0035, and $50 is this role's rate).

25. `[ATTORNEY REVIEW]` **529 eligibility, and the ban on saying so.** The 2025
   federal tax law extends qualified §529 K-12 expenses to tutoring delivered
   outside the home by a licensed or credentialed teacher who is not related to
   the student — which the standing seat satisfies by construction, and which
   the Austin pricing research (`docs/PRICING_EVIDENCE.md`) identifies as a
   material commercial fact and a reason never to staff a seat with an
   uncredentialed lead. Counsel: does it hold as written for a 1:4 in-person
   seat delivered by a Texas-certified teacher at a Kaizen site, and does an
   invoice naming the tutor's credential suffice as substantiation? Related to
   item 19 (credentials) and item 20 (tutoring versus supervision). **Until this
   clears, no public surface may state or imply tax treatment** — not the
   pricing page, not the Terms, not a sentence the Program Director says to a
   parent. Saying "529-eligible" is tax advice; saying "our lead tutors hold a
   Texas teaching certificate" is a fact about us, and is the only half we may
   use. No `docs/CLAIMS_MATRIX.md` row may assert eligibility before sign-off.

26. `[FOUNDER INPUT REQUIRED]` **Competitor price claims are unverified and
   quarantined.** Every competitor figure in `docs/PRICING_EVIDENCE.md` reached
   us through a search summary; the network egress proxy blocked every provider
   domain, and the adversarial verification pass refuted all twelve of the
   decisive claims for want of a readable page. None of it may appear in public
   copy, a deck, or a CLAIMS_MATRIX row until re-read in a browser or confirmed
   by telephone. Founder: mystery-shop seven Austin providers as a parent before
   the pricing page ships and write the answers into that file with dates.
