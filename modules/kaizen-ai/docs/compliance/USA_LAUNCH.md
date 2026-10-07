# Kaizen — USA Launch Compliance Checklist

> **This is engineering documentation, not legal advice.** It maps US law to what
> the platform now enforces in code and what remains an operational task. Have a
> lawyer review the flagged items before spending on ads. As of **August 2026**.

Kaizen's launch posture: **US only · users 13+ · tutors are independent
contractors · parents pay · under-13 not supported** (deferred until a COPPA
verifiable-parental-consent flow is built).

---

## 1 · What the platform now enforces in code (shipped)

| Requirement | Legal driver | Where it's enforced |
|---|---|---|
| Under-13 signup blocked; block events logged | COPPA (15 U.S.C. §6501) | `web/components/LoginPage.js`, `web/app/api/safety/under13/route.js` |
| 13–17 signup requires a parent/guardian email; guardian notified immediately | COPPA actual-knowledge care / FTC §5 | signup metadata → `web/lib/server/context.js` (provisioning + `sendGuardianConsentEmail`) |
| **Live 1:1 video with an adult is locked for minors until a guardian approves** — the emailed consent link, or the parent themself booking for a linked teen (parent-managed accounts, 0025) | negligent-supervision risk; state UDAP | `profiles.guardian_consent_at` gate in `web/app/api/tutoring/sessions/route.js`; consent route `web/app/api/family/guardian-consent/route.js` |
| **No tutor can appear in the directory or be booked until an admin records a cleared review** — an identity review + interview/approval by Kaizen staff, with an 18+ attestation required first. This is NOT a third-party criminal background check: none is run, and Terms + Safety disclose that plainly (`docs/archive/ERRATA.md`, 2026-07-28) | negligent-hiring liability | `tutors.vetting_status` hard gates in `sessions` POST, `directory`, `tutors` GET; admin workflow `web/app/api/admin/tutors/route.js` |
| Safety reporting: report button in every video session; admin triage queue; instant admin email | duty of care; CSAM reporting readiness | `web/app/api/safety/report/route.js`, `web/components/VideoCall.js`, admin console |
| AI crisis protocol: self-harm/abuse → stop tutoring, 988 / Crisis Text Line / Childhelp resources; age-appropriate boundaries; no off-platform contact | duty of care; CA SB 243-style chatbot rules | `STUDENT_SAFETY` in `web/lib/prompts.js`, applied to every chat in `web/app/api/chat/route.js` |
| "Kaizen is an AI, not a human" disclosure in every chat | FTC §5; state bot-disclosure laws | `web/components/StudySession.js` footer + prompt rule |
| Full server-side data export (access/portability) | CCPA §1798.100/.110 | `web/app/api/account/export/route.js` |
| Complete deletion incl. Storage files (résumés, documents, avatars) | CCPA §1798.105 | `web/app/api/account/delete/route.js` (`purgeStorage`) |
| Unsubscribe link + one-click List-Unsubscribe headers on all email; suppression of promotional email after opt-out | CAN-SPAM (15 U.S.C. §7704); RFC 8058 | `web/lib/server/email.js`, `web/app/api/email/unsubscribe/route.js` |
| Analytics opt-out toggle; no sale/share of personal data | CCPA opt-out rights | Settings → Privacy preferences; `web/lib/analytics.js` |
| Auto-renewal disclosure + cancel-anytime path (Stripe portal) | ROSCA (15 U.S.C. §8403); FTC §5; state automatic-renewal (ARL) laws — never the vacated FTC rule (8th Cir., 2025; `docs/legal/REVIEW_QUEUE.md` item 4) | `web/app/pricing/page.js`, `/billing` portal |
| **No free trial on any current plan**: memberships and AI plans are no-trial, month-to-month (checkout's `TRIAL_PLANS` is empty; the free tier and the weekly free community session are the try-before-you-buy path), disclosed in Terms; the one-trial-per-customer machinery (hashed-email `trial_redemptions`) stays enforced server-side in case a trial ever returns | ROSCA; state ARL laws | Terms "Memberships, billing & refunds", `web/app/api/billing/checkout/route.js`, `web/lib/server/trial.js` |
| Pay transparency under house pricing: Kaizen sets session prices and pays tutors a flat hourly rate (bounds in `clubPricing.js` `TUTOR_PAY`, mirrored by the 0023 CHECK), disclosed to tutors at application AND in Terms; club-era sessions pay the tutor even when the learner paid nothing (intro, included visit). The legacy 11% revenue share survives in code for pre-club rows only and is no longer disclosed on any live page | FTC §5; state UDAP | `web/app/tutors/apply/page.js`, Terms, `sessions` PATCH economics (`pay_model = flat_hourly`) |
| Refunds enforced automatically (1:1: ≥24h full refund, tutor-cancel always refunds; group seats: ≥12h, platform-cancel always makes everyone whole; included visits are returned inside the same windows) | state UDAP / stated-policy adherence | `web/app/api/tutoring/sessions/route.js` PATCH, `web/app/api/tutoring/group/route.js` DELETE (windows in `lib/server/sessionStates.js`) |
| Reviews only from the verified student of a completed session | FTC Fake Reviews Rule (16 CFR 465) | `web/app/api/tutoring/reviews/route.js` |
| No false claims: pricing no longer advertises unbuilt "human tutor credits"; booking text no longer promises monitoring that doesn't exist | FTC §5 deception | `pricing`, `billing`, `TutorBooking` copy |
| Honest, launch-grade Terms / Privacy / Safety pages (13+, guardian consent, contractor tutors, CCPA rights, refund policy, NCMEC commitment) | multiple | `web/app/terms`, `web/app/privacy`, `web/app/safety` |

**Deploy step:** run `supabase/migrations/0007_usa_compliance.sql` (see
`docs/GO_LIVE.md`). Existing tutors become **unvetted → unbookable** until you
record their review + approval ("vet") in Admin → Tutors. That is intentional.

---

## 2 · Operational must-dos BEFORE taking money (no code can do these)

1. **Tutor screening** — the launch posture is a staff identity review +
   interview/approval with an 18+ attestation, recorded in Admin → Tutors
   ("vet") — activation is blocked until you do. **No third-party criminal
   background check is run**, and every public surface says so plainly
   (`docs/archive/ERRATA.md`, 2026-07-28); counsel must confirm that disclosure
   suffices for a minors-facing service (`docs/legal/REVIEW_QUEUE.md` item 6).
   If checks are added later (Checkr/Sterling: SSN trace, national criminal,
   sex-offender registry, county records), **FCRA duties attach**: get the
   tutor's written authorization first and follow the pre-adverse/adverse-action
   letter process when a check fails.
2. **Counsel review** of Terms, Privacy, and Safety pages (one pass, ~hours of
   lawyer time). Set the real **governing-law state** in the Terms (currently
   generic), confirm the arbitration/small-claims posture, and confirm the LLC
   is in good standing with a registered agent.
3. **Insurance** — general liability + professional (E&O) + cyber, and
   critically **abuse & molestation coverage** (standard for minors-serving
   businesses; many GL policies exclude it).
4. **Tax setup** — collect a **W-9 from every tutor before their first manual
   payout**; file **1099-NEC** for any tutor paid ≥$2,000/year (the 2025 OBBB
   raised the old $600 threshold for payments on/after 2026-01-01; first
   filings Jan 2027 — `docs/legal/REVIEW_QUEUE.md` item 5). When volume
   justifies it, move payouts to Stripe Connect Express (KYC + automatic
   1099-K handling + keeps you out of money-transmitter territory).
   Check sales-tax treatment of tutoring in your nexus states (most exempt
   live tutoring; several tax SaaS subscriptions — TaxJar/Stripe Tax solves this).
5. **Ops accounts** — Resend domain verified (SPF/DKIM) so consent and safety
   emails actually deliver; Stripe live keys + webhook; `ADMIN_EMAILS` set so
   safety reports reach a human; commit to a **24h response SLA on safety
   reports** (the admin email alert is already wired).
6. **NCMEC registration** — register with the CyberTipline as an electronic
   service provider so you can file reports if you ever must (18 U.S.C. §2258A
   requires reporting; registering first makes it possible).

## 3 · Known deferrals (fine for launch, revisit at scale)

- **Under-13 users** — requires full COPPA verifiable parental consent
  (credit-card/ID check, direct-notice flow, data-minimization review). The FTC's
  2025 COPPA amendments raised the bar here. ⚠ counsel before building.
- **Session recording/monitoring** — deliberately NOT built; two-party consent
  states (CA, etc.) make this a consent-flow project. Copy everywhere now says
  sessions are *not* recorded — keep that true until built properly.
- **Student↔tutor messaging** — not built; when built, needs moderation +
  minor-protection review.
- **State privacy law thresholds** — CCPA/CPRA formally applies at $25M revenue
  or 100k consumers; we implement its rights anyway (cheap now, mandatory later).
- **Accessibility** — aim for WCAG 2.1 AA; schedule an audit before school/
  district (FERPA) sales, which are a separate B2B compliance motion.
- **BIPA (Illinois)** — voice is transcribed, not voiceprinted; keep it that way
  or add consent. ⚠ flag to counsel if voice features expand.
- **Canada / Mexico / India** — each needs its own pass (PIPEDA/Law 25 + CASL;
  new LFPDPPP + SAT platform withholding; DPDP Act where *every* under-18 needs
  verifiable parental consent and children can't be tracked — India last).

## 4 · The honest bottom line

With migration 0007 applied and section 2 completed (a lawyer pass, insurance,
W-9s — days, not months), the platform's **launchable scope is: US, ages 13+,
AI plans on subscription + the academic club: memberships with included
Homework Hall visits and à-la-carte group and 1:1 sessions** — with selling
fail-closed behind `app_settings.club_enabled` until counsel clears
`docs/legal/REVIEW_QUEUE.md` items 10–15. The two structurally expensive
frontiers — under-13 COPPA and India's DPDP regime — are deliberately out of
scope and gated off in product, not promised anywhere in copy.
