# `compliance/` — working drafts for counsel

**Nothing in this folder has been reviewed by a lawyer. Nothing in it is in force.**

Every document here is a draft written by reading the code and the spec. It exists to make a
children's-privacy lawyer's review cheap and fast: the facts are already assembled, the claims are
traced to the file that implements them, and the judgement calls are collected in
`open-questions.md` instead of being guessed at.

Do not treat any statement here as legal advice, as a legal conclusion, or as evidence that a
requirement has been met. Section numbers cited for the COPPA Rule are **unverified** — see
`.claude/skills/minors-privacy/references/coppa-checklist.md`, which lists what has to be checked
against eCFR and the Federal Register by a person with access to the primary text, and then
confirmed by counsel.

## What is in here

| File | What it is | Status |
| --- | --- | --- |
| `README.md` | This file: scope, process, status. | Draft, unreviewed |
| `privacy-policy.md` | The online notice. What is collected, why, legal basis, retention, recipients, rights. | Draft, unreviewed |
| `parent-direct-notice.md` | The COPPA direct notice given to a parent **before** any under-13 collection. A separate document from the policy. | Draft, unreviewed |
| `retention-policy.md` | Per-category retention windows, and where the code does not implement them. | Draft, unreviewed |
| `vendor-data-flow.md` | Every third party that receives data, what it receives, what its terms must say. Every line unverified. | Draft, unreviewed |
| `terms-of-service.md` | The service agreement. | Draft, unreviewed |
| `ai-disclosure.md` | How the AI nature is disclosed and what it must never be relied on for. | Draft, unreviewed |
| `open-questions.md` | Numbered questions for counsel, prioritised by what they block. | Draft, unreviewed |
| `launch-gate-checklist.md` | What must be true before under-13 profiles unlock, cross-referenced to code. | Draft, unreviewed |
| `signoff.md` | **Does not exist yet.** Created by a human when counsel signs off. | Missing (by design) |

## The gate this folder controls

`.claude/skills/minors-privacy/scripts/check-compliance-gate.mjs` refuses to let `UNDER13_GATE=1`
(or `compliance/under13-gate.txt` saying `open`) pass unless `compliance/signoff.md` exists **and**
contains a line matching `counsel sign-off: YYYY-MM-DD`. That file is deliberately absent. An agent
must not create it. Creating it is a human act that records a real review by a real lawyer.

The database has its own fail-closed switch: `app_settings.under13_gate` is seeded `'false'::jsonb`
(`lib/tutor/db/schema.ts`) and `lib/tutor/settings.ts` reads a missing or malformed row as shut.
Both switches must be flipped, and the script gate is the one that requires the sign-off record.

## Review process

1. A seat drafts or amends a document here and opens a PR. **A human must be in that PR** — this is
   a repo rule in `CLAUDE.md`, not a convention.
2. Counsel reviews. Their corrections come back as edits to these files.
3. When counsel is satisfied, a human creates `compliance/signoff.md` with the
   `counsel sign-off: YYYY-MM-DD` line, names who reviewed what, and lists the document versions
   signed off.
4. The version strings in `lib/tutor/client/legal.ts` lose their `-draft` suffix and the draft
   banner on `/legal/*` comes down. A consent record stores the version string it was given for
   (`consents.notice_version`, `consents.policy_version`), so a version bump after a material change
   is what forces a parent to be asked again.
5. Only then may an operator open the gate.

## Records that belong here but do not exist yet

Item 11 of the under-13 checklist (spec §11.2) says this folder holds the records. Missing:

- `signoff.md` — counsel sign-off. Blocks the gate.
- `security-program.md` — the written security program (checklist item 9, believed §312.8). Nobody
  has written it; the privacy draft's security section is a summary of intent, not the program.
- `red-team/` — the 9–12 red-team results (checklist item 10, spec R10).
- `vendor-reviews/` — the executed DPAs and terms extracts backing `vendor-data-flow.md`.
- `policy-versions/` — the archived text of each published version, so a consent record's
  `notice_version` can be resolved to the words the parent actually read.

## How to read a claim in these drafts

Where a document states a fact about the system it cites the file that makes it true, e.g. "audio is
never written to a database (`lib/tutor/db/schema.ts` — no table has an audio column;
`app/(learner)/api/tutor/asr/route.ts` holds the clip in memory only)". Where the code and the
intended policy disagree, the document says so in a **Mismatch** callout rather than papering over
it. Those callouts are the most important content here, and they are summarised in
`open-questions.md`.
