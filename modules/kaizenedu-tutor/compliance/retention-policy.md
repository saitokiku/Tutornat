# Retention policy — DRAFT, PENDING COUNSEL REVIEW

> **This is an unreviewed draft.** It has not been read by a lawyer and is not in force. Version
> `2026-09-05-draft`.
>
> The COPPA Rule as amended is believed to require a **written, published** retention policy, and to
> forbid keeping a child's personal information longer than reasonably necessary for the specific
> purpose it was collected for (§312.10, unverified). This document is that policy in draft. Read the
> "What the code actually does" section before believing any window below: **most of them are not
> implemented.**

---

## 1. Principles

1. We keep a category only while it serves the purpose it was collected for.
2. Audio is never retained. Uploaded images are never retained.
3. A deletion the account holder asks for is honoured, and freezing happens immediately even though
   the purge is not instant.
4. The windows below are **proposals** carried from spec §11.2 item 5. `CLAUDE.md` requires asking a
   human before changing a retention window, so counsel sets the final numbers and a human records
   them; they are not an agent's to pick.

## 2. Proposed windows, by category

| # | Category | Tables | Proposed retention | Trigger |
| --- | --- | --- | --- | --- |
| 1 | **Audio** — the learner's recorded utterance | none | **Never stored.** In memory for the length of one request | n/a |
| 2 | **Uploaded homework images/PDFs** | none | **Never stored.** In memory for the length of one request | n/a |
| 3 | **Camera frames, landmarks, embeddings, templates** | none | **Never collected.** No camera exists | n/a |
| 4 | Session transcripts | `turns` | Active profile + 12 months after last session activity | Last activity |
| 5 | Session records, summaries, session state | `sessions` | Same as transcripts | Last activity |
| 6 | Extracted homework text | `coursework` | Same as transcripts | Last activity |
| 7 | Student model: mastery, misconceptions, learner profile | `skill_mastery`, `misconceptions`, `learner_profiles` | Same as transcripts | Last activity |
| 8 | Learning-evidence events | `evidence_events` | Same as transcripts | Last activity |
| 9 | Attention aggregates and recovery events | `attention_stats`, `recovery_events` | Same as transcripts | Last activity |
| 10 | Safety and quality flags, including free-text notes | `flags` | **Counsel to set.** Retention here trades a child's deletion right against a safety record. Proposal: same as transcripts, unless an open safety matter | Last activity |
| 11 | Learner profile row: name, birth year, band, teen login | `learners` | Same as transcripts | Last activity |
| 12 | Account: email, name, password hash | `accounts` | While the account exists; deleted on request | Account deletion |
| 13 | Sign-in sessions | `account_sessions` | Until expiry; destroyed on account-wide deletion request | Expiry / request |
| 14 | **Consent records** | `consents` | **Counsel to set.** Proposal: retained after profile deletion as proof consent was obtained. See the conflict in §4 | See §4 |
| 15 | **Deletion request records** | `deletion_requests` | Retained indefinitely, ids and timestamps only, as proof the right was exercised | never |
| 16 | **Usage/billing lines** | `usage_ledger` | Retained after deletion with `learner_id`, `session_id` and `turn_id` set to NULL; amount, provider, model and timestamp kept | never (de-identified) |
| 17 | Subscription record | `subscriptions` | Deleted with the account. **Stripe keeps its own copy** under Stripe's retention | Account deletion |
| 18 | Analytics events | PostHog (external) | **Counsel to set + configure in PostHog.** Not controlled by our code | Project setting |
| 19 | Error events | Sentry (external) | **Counsel to set + configure in Sentry.** Not controlled by our code | Project setting |
| 20 | Application logs | Vercel (external) | **Counsel to set.** Vercel's platform retention. Logs carry ids, byte counts and durations, never content | Platform |

**Deletion on request:** filing a request freezes the profile immediately. The purge itself runs on
the schedule in §3 below.

## 3. What the code actually does — read this before publishing anything above

The whole implementation is `lib/tutor/accounts/deletion.ts`.

### 3.1 There is no inactivity-based deletion at all

`runDeletionJob` selects from `deletion_requests` and nothing else:

```sql
SELECT * FROM deletion_requests
 WHERE completed_at IS NULL AND requested_at <= $1
 ORDER BY requested_at, id
```

There is no query anywhere that looks at last activity, and no job that deletes a dormant profile.
**Rows 4 through 11 of the table above have no implementation.** The constant
`RETENTION_MONTHS_AFTER_LAST_ACTIVITY = 12` in `lib/tutor/client/legal.ts` is used only to render
text in `privacy.tsx`, `consent.tsx` and `data.tsx` — three places that tell a parent a thing the
system does not do.

**Blocks the gate.** A published retention policy that the system does not implement is a worse
position than having none.

### 3.2 The deletion job is never invoked

`runDeletionJob` is re-exported by `lib/tutor/accounts/index.ts` and called by no route, no script
and no scheduler. Its own comment says so: "No scheduler is wired here; the integrator adds the cron
route that calls it." `vercel.json` declares no `crons` key. In production today, a deletion request
freezes the profile and is never completed; `deletion_requests.completed_at` stays NULL forever.

**Blocks the gate.**

### 3.3 The 30-day window is a floor, not a ceiling

`DELETION_WINDOW_DAYS = 30`, and the job's cutoff is `now - 30 days` matched against
`requested_at <= cutoff`. So the purge happens **not before** day 30, and then only at the next run.
The live privacy page says a deletion "completes within 30 days" — the opposite meaning.

Two ways to reconcile, for counsel to choose:

- **Purge promptly** after a short grace period (a few days, to allow an accidental request to be
  withdrawn) and keep "within 30 days" as an outer bound. This is the reading that matches the
  published words.
- **Keep the 30-day hold** as a deliberate recovery window and publish it honestly: "we freeze the
  profile immediately and erase the data after 30 days."

Either is defensible. The current pairing of code and text is not.

### 3.4 What the purge actually removes

`purgeLearner` deletes the `learners` row and relies on `ON DELETE CASCADE` for `sessions` (and
through it `turns`, `attention_stats`, `recovery_events`), `coursework`, `consents`, `skill_mastery`,
`misconceptions` and `learner_profiles`. It explicitly deletes `evidence_events` (disabling the
append-only trigger inside the transaction) and `flags`, and it nulls the learner/session/turn ids on
`usage_ledger` while keeping the money. `purgeAccount` deletes the `accounts` row and lets everything
account-scoped cascade.

That is a genuinely thorough purge. Three notes:

- **`consents` is destroyed by the cascade** — see §4.
- **`account_sessions.learner_id` is `ON DELETE SET NULL`**, so a learner's sign-in session row
  survives the learner with its `learner_id` nulled and its `role` unchanged. Only a token hash and
  an expiry, so the privacy impact is small, but a live learner-role session outliving its learner is
  worth the reviewer's attention.
- **Stripe is not in the purge path.** Deleting the account removes our `subscriptions` row; the
  customer, payment methods and invoices remain at Stripe under Stripe's retention. The policy must
  say this and the operator should decide whether to also delete or anonymise the Stripe customer.

### 3.5 Operational note on the append-only trigger

`deleteEvidence` runs `ALTER TABLE evidence_events DISABLE TRIGGER …` and re-enables it before
commit. This requires table-owner privileges on the connection the job uses, and takes an
`ACCESS EXCLUSIVE` lock on `evidence_events` for the transaction. Worth confirming the production
database role can do it, and that the lock is acceptable — otherwise deletion fails at exactly the
moment it matters.

## 4. The conflict counsel has to resolve: consent proof vs. deletion

`consents.learner_id` cascades on delete, so purging a learner destroys the record that consent was
ever obtained. Meanwhile the live privacy page promises consent records "are kept as long as the law
requires us to show that consent was given."

- Keeping the record after deletion preserves proof of compliance, but the row holds `learner_id`,
  `account_id`, timestamps and a `notice_version` — ids and metadata, no content.
- Deleting it honours the deletion request completely but leaves us unable to show consent was
  obtained for a profile that later becomes the subject of a complaint.

`deletion_requests` rows already survive by design (no foreign key), and their comment says the
record that the right was exercised is deliberately kept. The same reasoning may apply to consents.
**Counsel decides; the schema then has to match the decision** (today it does not match the published
text). See `open-questions.md` Q9.

## 5. What has to change before this policy can be published

| # | Change | File |
| --- | --- | --- |
| 1 | Implement inactivity-based deletion, or delete the promise from every surface | `lib/tutor/accounts/deletion.ts` |
| 1b | **Two parent-dashboard surfaces still promise the unimplemented 12-month rule** and were left untouched by this pass because they are outside the legal pages: `components/tutor/parent/consent.tsx:195` ("for 12 months after the last session, then deleted") and `components/tutor/parent/data.tsx:156` ("Anything not deleted sooner is removed 12 months after the last session"). Both must change with item 1 | `components/tutor/parent/` |
| 2 | Wire a scheduled invocation of `runDeletionJob` and monitor it | `vercel.json` + a cron route |
| 3 | Reconcile `DELETION_WINDOW_DAYS` semantics with the published sentence | `lib/tutor/accounts/deletion.ts`, `privacy.tsx` |
| 4 | Decide and implement consent-record survival | `lib/tutor/db/schema.ts` |
| 5 | Set and configure PostHog, Sentry and Vercel log retention | vendor consoles |
| 6 | Decide the `flags` retention rule | this document |
| 7 | Move the final windows into `kaizen.config.ts` so one constant drives code and copy | `kaizen.config.ts` |
| 8 | Add a test that fails if published retention text and the implemented window diverge | `tests/invariants/` |

Item 7 is what stops this class of bug recurring: today the window lives in a copy constant that no
job reads.
