# Errata — corrections to frozen documents

`docs/TECHNICAL_SOURCE_OF_TRUTH.md` is a point-in-time snapshot and is not edited
after freezing. Where later verification contradicts it, the correction is
recorded here instead. This file is append-only; each entry is dated and cites
the evidence. When these two documents disagree, **this file wins.**

---

## 2026-07-28

**Entity name.** The frozen doc (`:295`) and much of the older copy named the
company "Kaizen Tutors LLC". The registered entity is **Kaizen Academy LLC**
(founder-confirmed, 2026-07-28). LICENSE, Terms, Privacy, About, the landing
page, the marketing shell, and the email footer have been corrected to
"Kaizen Academy LLC".

**Tutors are NOT third-party background-checked.** The frozen doc states, at
`:24` ("background-check-gated tutor activation enforced in code") and `:336`
("Every tutor is identity-verified and background-checked before they can be
booked"), that a criminal background check gates tutor activation. This is
**false and must never be published.** No third-party criminal background check
is run. What the code actually enforces is a *human review and approval* by
Kaizen staff plus an 18+ self-attestation (`admin/tutors` `vet` action;
`tutorSafety.pullTutorFromMarket`); there is no vendor, no criminal record check,
and no FCRA workflow. Every public surface has been corrected to say tutors are
"interviewed and approved by our team", with an explicit statement that
third-party background checks are not currently run. A CI guard
(`web/test/claims.test.mjs`) fails the build if the word "background-checked"
returns to a user-facing surface.

**Migration count.** The frozen-era docs referenced ~9–10 migrations; there are
now 21 applied (`supabase/migrations/`), all applied to production and verified
2026-07-28.
