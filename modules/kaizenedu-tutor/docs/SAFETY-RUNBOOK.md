# Safety runbook

How a flagged safety event is handled, by whom, and how fast. Operational, not legal: it creates no obligation on its own and is not legal advice. Counsel reviews it with the rest of `compliance/` before any under-13 profile is unlocked (`docs/DO-THIS-NEXT.md`, item 6). Adapted from Kaizen-AI's runbook; the human tutor parts do not apply here — there are none.

## What generates an event

1. **The automated screen.** `lib/tutor/safety/patterns.ts` runs a deterministic pattern screen on every learner turn before the model sees it — typed text and transcribed speech alike, since the turn route receives the transcript. A crisis match (`self_harm`, `abuse`) ends the session with the crisis referral (`lib/tutor/safety/responses.ts`), writes a `flags` row (`kind = 'unsafe'`, `note = 'crisis:<category>'`), and pages a person (below). The screen never blocks a message by itself; the tutor answers the learner with resources, and the session closes so the tutor does not carry on teaching fractions past a disclosure.
2. **The report button.** Every session has one. It writes a `flags` row (`kind = 'unsafe' | 'wrong' | 'other'`) with the learner's optional note. An `unsafe` report pages a person; the others accrue for review.

The screen is a **pattern pre-filter**, not a model. It catches explicit language and misses euphemism and implication, and it is English-oriented. A fast-model classifier can sit behind the same `screenLearnerText()` seam later. Do not describe the current screen as comprehensive anywhere a parent reads.

## Who is paged, and how

- `SAFETY_ALERT_EMAILS` (comma-separated) receive an essential email on every critical event and every `unsafe` report: the flag id, the account, learner and session ids, the category and the source. **Never the text.** The transcript is one click away for the account holder and for whoever reviews it; the email must be safe to sit in an inbox.
- `ALERT_WEBHOOK_URL`, when set, receives the same ids as JSON (`text`, `flagId`, `accountId`, `learnerId`, `sessionId`, `category`, `severity`, `source`) — a Slack incoming webhook works.
- **The account holder** is emailed on a critical event: that the session ended early over something their learner said, that the transcript is on their dashboard, and the crisis lines. Calm, factual, no quotation of what was said.
- Without `RESEND_API_KEY`/`EMAIL_FROM`, or with `SAFETY_ALERT_EMAILS` unset, nothing is paged; the flag row is still written and `/api/tutor/health` says `safety.configured: false`. Set both before the first beta invite.

## Response times

| Severity | What | A person acts within |
| --- | --- | --- |
| Critical | `self_harm`, `abuse` from the screen | 1 hour, during staffed hours |
| High | an `unsafe` report from the button | the same day |
| Ordinary | `wrong`, `other` reports | 48 hours |

"Staffed hours" is one person today. Until a monitoring window is real, nothing on the site may say sessions are monitored by a person; the AI disclosure and the privacy policy say what actually happens.

## What the person does

1. Open the account: the parent report and the transcript (`/parent`, transcripts) show the session and the turn that fired.
2. Decide: a real disclosure, a false alarm ("I could die of boredom" is filtered but not everything is), or a misuse.
3. For a credible risk to a child, follow the mandatory-reporting guidance counsel provides for the states of operation. This runbook does not substitute for that guidance.
4. Mark the flag reviewed (`flags.reviewed_at`) with a note that carries no transcript text.
5. If the screen missed or over-fired, change the pattern in `patterns.ts` in its own PR with a test — a safety prompt or pattern change is one to ask about first (`CLAUDE.md`).

## What is stored

The `flags` row: ids, the kind, the category label, the learner's own note when they wrote one, timestamps. The turn text is in `turns` as every turn is, under the transcript retention policy. No snippet is copied into the flag, the email or the webhook.

## Known limitations, stated plainly

- Pattern-only; misses non-explicit disclosure.
- English-oriented.
- One person on call, no rota. The response times above are aims, not guarantees, until there is a rota.
