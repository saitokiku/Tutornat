---
name: parent-comms
description: The rules for everything the product says to a parent or account holder outside a session — the in-app report, the weekly email, the parent invitation, the password reset, safety and pause notices, and the email wrapper that carries them. Load it when you build or change lib/tutor/email, lib/tutor/report, any email template, any token link, the weekly cron, an opt-out, or any sentence a parent reads about what their child can do.
---

# Parent communications

Spec: §5.9 (the report), R11, R18 (the weekly email), §11.2 items 4 and 13, D17 (the mastery law). Code today: `lib/tutor/report/parent-report.ts` (`GENERATED_LABEL`, `REPORT_MASTERY_NOTE`, `skillSentence`), `lib/tutor/accounts/settings.ts` (`parent_settings`), `lib/tutor/analytics/events.ts` (`mastery_change`). Source of the ported rules: Kaizen-AI `web/lib/server/email.js`, `familySummary.js`, `parentSummary.js` (see the `kaizen-ai-port` skill). Copy rules: `design-system` skill and `node .claude/skills/design-system/scripts/check-copy.mjs`, which must include `lib/tutor/email` in its roots. Privacy: `minors-privacy` skill.

## The law, in every sentence

1. **The word mastery means `confirmed`.** An estimate is called an estimate wherever it appears. `confirmed` means an unassisted check at least 24 hours after `mastered`; the tutor never grades its own help as mastery. `REPORT_MASTERY_NOTE` says this beside every confirmed list.
2. **The headline is confirmed-only.** The first line a parent reads counts confirmed skills and names what crossed into confirmed in the last seven days. Estimates, minutes, sessions, streaks are supporting lines, never the lead. "Could do it with help" is never told to a parent as learned.
3. **Every generated sentence carries `GENERATED_LABEL`.** Tutor notes and summaries are the AI tutor's words and say so. Numbers and prose are separate fields on every wire shape, so a page cannot blend a computed count into a generated sentence.
4. **Numbers are computed on the server from the tables the loop writes**, never accepted from a client and never produced by a model. Use the same query for the page and the email so the two never disagree.
5. **A zero is never confident when nothing is tracked.** A learner with no checks yet reads "no checks yet", not "0 of 12 skills". Distinguish "the engine is on and nothing has happened" from "nothing is provisioned"; Kaizen-AI's `notTracked` state is the pattern.
6. **"Moved this week" names skills**, up to five, newest first; "2" is not something a parent repeats at dinner. Today it is computed from `mastery_change` evidence rows inside the seven-day window ending now (the summary is read whenever the parent opens it, not on a calendar week). When the derived record lands (reference §4 layer 3) it is answered by replaying the ledger at both ends of the window, never by comparing a cached value against a decayed replay.

## Emails: the two kinds

| Kind | Examples | Opt-out |
| --- | --- | --- |
| `essential` | password reset, the parent invitation, a safety or pause notice, a receipt, a consent record | Sent regardless; relationship and security mail |
| `promotional` | the weekly report, anything periodic | Suppressed entirely once the account holder opts out |

Rules for the wrapper (`lib/tutor/email/send.ts`):

- `RESEND_API_KEY` and `EMAIL_FROM` unset is a designed state, not a dev branch: return `{ sent: false, reason: 'not_configured' }`, log `kind` and the recipient's domain only, and let the caller render a real state. `/api/tutor/health` reports the email configuration. Nothing pretends to have sent.
- Every message to a known account carries an unsubscribe footer and `List-Unsubscribe` + `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers. The unsubscribe link needs no sign-in and works on the first click; it turns off promotional mail only and says so.
- The opt-out lives on `parent_settings`, read at send time; the weekly cron does not carry its own copy.
- `esc` every value that came from a person before it lands in HTML. Inline styles; the product tokens as hex.
- 15-second timeout on the send; a failed send is logged with status, kind and domain, and returned to the caller, never swallowed.
- One row per (account, kind, period) in `email_log` before a promotional send, so the cron can fire hourly without double-sending. Log rows carry ids, kind and period; never a subject with a name in it.

## The weekly email (R18)

- Sent only when something happened in the window: a session, a check, a mastery change, an open misconception resolved. An empty report teaches a parent to ignore the real ones. A learner with nothing that week gets no mail and no "we missed you".
- Order: the confirmed headline, what moved (named), then sessions and minutes, then one tutor note per session with the learner's thumbs, each note under `GENERATED_LABEL`, then a link to the report. Under 200 words before the notes.
- The subject names the learner and the week, nothing else: `Maya — week of 7 September`. No urgency, no question, no exclamation point.
- Under-13 learners: the parent's email is the account holder's and the content is the same; the notice text that describes this mail is counsel's (`compliance/`), not ours to write.

## Invitation and reset tokens

- 32 random bytes from `crypto.randomBytes`, sent once as a URL on our domain, stored only as a SHA-256 hash with `account_id` or the invited email, `purpose`, `expires_at`, `used_at`.
- Time to live: password reset 60 minutes; parent invitation 7 days. Single use: `used_at` is set in the same statement that accepts the token, so two clicks cannot both succeed.
- The request route answers identically whether or not the address exists ("If that address has an account, the email is on its way") and is rate-limited per address and per IP through `lib/tutor/guards`.
- An expired, used or unknown token renders a page state with one action (request another), never an error code.
- Never log, analytics-tag or error-report a token or the URL that carries it. `error-report` payloads and PostHog events carry ids.
- The invitation names the teen's chosen login name and the age band, asks the parent to finish sign-up, and explains in two sentences what the product is and that the parent owns the account. It does not name the teen's school, birth year or anything the teen typed beyond the login name.
- A teen never receives email. The product collects no email address from a learner under 18; every message goes to the account holder.

## Never

- No engagement nudges to a child, ever: no streak mail, no "come back", no push, no in-session prompts to keep going past the scheduled end, no notification triggered by attention data (§11.2 item 13).
- No nudges to the parent either that are about frequency rather than learning: no "Maya hasn't practised in 4 days". The product reports what happened; it does not campaign for usage.
- No marketing consent bundled with any other consent; no promotional mail to an address that has not created an account.
- No claim in an email that the code does not enforce (`claims-discipline` skill); no price literal — interpolate `PLAN.priceCentsMonthly`.
- No exclamation points, no banned words, no emoji, no adjectives where a number would do. "AI tutor" appears in every email footer.

## Verify before the PR

Render every template with real-shaped data (a long name, a learner with three skills moved, a learner with nothing) at 390 px and 1280 px; run `check-copy.mjs` over `lib/tutor/email`; unit-test the lead with a learner who has estimates but no confirmed skill (headline must not say mastered) and with an empty week (no send, one `email_log` row marked empty); test that a used token is refused and that the request route's response is identical for an unknown address.
