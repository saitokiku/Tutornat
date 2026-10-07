# Kaizen — Data Retention Schedule

> Companion to the privacy policy (`web/app/privacy/page.js`) and audit findings
> DATA-001/DATA-002. Enforcement is in code: the hourly cron
> (`web/app/api/cron/maintenance/route.js` → `purgeExpiredTranscripts` in
> `web/lib/server/maintenance.js`) and account deletion
> (`web/app/api/account/delete/route.js`). As of 2026-07-22.

| Data | Retention | Enforced by |
|---|---|---|
| AI chat transcripts (`tutor_sessions`) | **24 months** from last activity, then deleted automatically; earlier on account deletion | cron purge (`TRANSCRIPT_RETENTION_MONTHS = 24`) |
| Voice session records (seconds + summary; audio itself is never stored) | **24 months**, then deleted; earlier on account deletion | cron purge |
| Profile, courses, assignments, grades, mastery, documents/files, practice, reports, family links, tutoring sessions, reviews written | Life of account; deleted on account deletion (FK cascade + Storage purge) | delete route |
| Uploaded files in Storage (documents, résumés, avatars) | Life of account; removed on account deletion | delete route `purgeStorage` |
| Payment/subscription records | Retained as required for tax and accounting after account deletion (Stripe is the system of record; Kaizen keeps ids/status) | policy — [ATTORNEY REVIEW] for the exact statutory period |
| Free-trial redemption record | **sha256(email) only — no raw PII**; retained after account deletion to prevent trial farming | `trial_redemptions` (migration 0009), disclosed in privacy policy |
| Safety reports (`safety_events`) | Retained after account deletion (child-safety/legal duty) | by design; disclosed in privacy policy |
| Audit log (`audit_logs`) | Retained after account deletion (actor kept as bare uuid) | by design; disclosed in privacy policy |
| Usage ledger | Deleted on account deletion | delete route |
| Server logs (Vercel) | Platform default retention | Vercel — NEEDS VERIFICATION of plan-level log retention |
| Database backups (Supabase) | Deleted rows roll out on the backup window | Supabase — NEEDS VERIFICATION of project backup retention |

Review cadence: revisit this schedule whenever a new data category ships, and
at least annually. `[ATTORNEY REVIEW]` before shortening/lengthening the
transcript window — COPPA's 2025 amendments emphasize retention minimization
for children's data.
