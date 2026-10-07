# Safety escalation runbook

How a flagged safety event is handled. This is an operational document; it does
not create legal obligations and is not legal advice. It must be reviewed by
counsel before the tutoring marketplace opens (`[ATTORNEY REVIEW]`, tracked in
`REVIEW_QUEUE.md`).

## What generates an event

1. **Automated screen (v0).** `lib/server/moderation.js` runs a deterministic
   pattern screen on every inbound student chat turn. A match writes a
   `safety_events` row (`kind = auto_screen:<categories>`, `status = open`). A
   `critical` match (self-harm, abuse) also emails `ADMIN_EMAILS` immediately.
   The screen is detection only — it never blocks the message; the tutor prompt
   (`STUDENT_SAFETY`) still responds in-conversation with crisis resources.
2. **Human report.** The in-session "Report a concern" button
   (`/api/safety/report`) writes a `safety_events` row.

The automated screen is a **pattern pre-filter**, not a model. It catches
explicit high-severity language and will miss euphemism and implication. A
fast-model classifier is the planned v1 and slots in behind the same
`screenText()` interface. Do not represent the current screen as comprehensive.

## SLA and who acts

- **Critical (self_harm, abuse):** a human reviews within **1 hour** during
  staffed hours. This requires a staffed monitoring window to be real — until one
  exists, do not market live tutoring to minors as monitored.
- **High (grooming/off-platform, sexual, violence):** reviewed same day.
- **Medium:** reviewed within 48 hours.

## Actions available

- Open the account, read context, decide.
- For a credible risk to a child: follow the mandatory-reporting guidance counsel
  provides for the states of operation (this runbook does **not** substitute for
  that guidance).
- For a tutor: `pullTutorFromMarket` (admin `reject_vetting`) removes them and
  refunds affected students.
- Mark the event `reviewing` then `resolved` with notes.

## What we store

Only a redacted ≤280-char snippet and the account id — enough to triage and open
the account, never a transcript dump. Retention follows the transcript schedule.

## Known limitations (state honestly, never oversell)

- Pattern-only; misses non-explicit disclosure.
- English-oriented.
- Voice sessions are transcribed for the tutor's benefit but are not currently
  run through this screen; wiring the transcribe path into `screenAndRecord` is a
  tracked follow-up.
