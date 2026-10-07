# Do this next — the operator's list

Everything that needs a human, in the order that unblocks the most. Nothing here can be done from a build seat: each item needs an account, a person, or a judgement call that is yours. Run `pnpm doctor` at any point; it prints what is still missing without printing a secret.

## Where things stand, 2026-09-30

Once this change merges, the free tutor is live. A stranger opens kaizenedu.net, picks a level and a subject, says what they are working on, and is in a spoken session with the whiteboard; no name, email, birth year or password is asked for. Afterwards `/learn` holds their planner, the problems they brought, recent sessions and what the checks show, all behind one cookie, with **Start over** deleting everything on the spot and the weekly cron deleting anyone idle for thirty days. Each guest gets a finite daily allowance of tutoring minutes and the same cost ceilings as every account. Decision D35 in `docs/DECISIONS.md` and `docs/GUEST-MODE.md` say exactly what was and was not changed; `docs/CONSOLIDATION.md` says what was taken from the other three repositories and what comes next.

Sign-in, sign-up and pricing are no longer linked from the public surface. The routes still answer for you, and nothing about accounts, billing or the under-13 gate was changed.

**Check this first, before reading anything else:**

```
https://www.kaizenedu.net/api/tutor/health
```

That route answers, in one request and without printing a secret, whether this deploy can teach: which model the live turn will use, where that model string came from, and which environment variables are still unset. `"ok": true` means a learner can complete a spoken turn. Anything in `"missing"` is a variable to paste into Vercel. It is the fastest way to tell "the tutor is broken" apart from "the tutor was never given a key", which is what actually happened on 2026-09-05.

---

## 0a. Read `docs/REPLAN.md` first — 10 minutes

The 2026-09-30 re-plan says what the live product looked like, why, and the order of work: wave 1 (the one-press front door, the tutor's name, a tutor that waits, the on-device voice detector actually loading) is in the same change as this note; wave 2 is the latency work and needs items 0 and 0b below; wave 3 is the pedagogy depth. Five owner decisions sit in its §8: billing on the Google key, the Gemini under-18 terms, the free-minutes cap, reviewing the 118 fraction items, and confirming the tutor's name (`Sol` in `kaizen.config.ts`, one constant).

## 0b. The ledger has no price table in production, so every session is charged a six-times estimate — 15 minutes

`TUTOR_PRICING_JSON` is not set in Vercel (checked 2026-09-30: no `TUTOR_*` variable exists there). With the table empty, `lib/tutor/cost/pricing.ts` charges the deliberately high `UNPRICED_ESTIMATE` (1 cent per 1,000 tokens, 3 cents per 1,000 spoken characters, 1 cent per minute heard): roughly 164 cents for a 15-minute session against about 27 cents at list prices. The per-session ceiling is 300 cents and the daily cap four times that, so a 25-minute teen session can be cut off by the ceiling and a guest is stopped after about seven sessions a day for no real cost. Set the variable from the vendors' price pages (the shape is `PricingTable` in that file: `llm` keyed by the model string, `ttsPerThousandChars` and `asrPerMinute` keyed by provider id, all in cents) and redeploy; `docs/research/2026-09-30-scale-and-cost.md` has the secondary-source figures to check against the primary pages.

## 0c. The Gemini API terms and an audience under 18 — read the primary page

Several secondary sources quote ai.google.dev/gemini-api/terms as barring use "as part of a website, application, or other service that is directed towards or is likely to be accessed by individuals under the age of 18". The live turn runs on `google:gemini-3-flash-preview` for every band, and the product is free, no-account, grades 4 to 9 first. Nobody has read the primary text. Read it; then either obtain written clearance, move to Vertex AI under Google Cloud terms, or route the 4–8, 9–12 and 13–17 bands to another provider with `TUTOR_BAND_MODEL_ROUTES` (the OpenAI key is in Vercel; the Anthropic key reads as unset at runtime and should be checked). Record the answer in `docs/DECISIONS.md`. This decides whether the Gemini Live API is even an option for wave 2.

## 0. The Gemini key is on the free tier: 5 requests a minute and 20 requests a day per model — production tutoring stopped on 2026-09-30 until it was routed around

Found on 2026-09-30 while running the tutor evals with the production `GOOGLE_API_KEY`: the Gemini API answered `429` with quota id `GenerateRequestsPerMinutePerProjectPerModel-FreeTier`, value `5`, for `gemini-3-flash`. Every live turn is one request on that model and every grading, diagnosis and summary hop is one request on `gemini-3.5-flash`, so one learner alone fits and two or three at once do not: the tutor answers "could not answer, try again" until the minute passes. The evals could not run for the same reason, so the before and after model halves for the prompt changes in #58 are not measured.

Two ways out, either is a few minutes: enable billing on the Google Cloud project behind the key (the paid tier is hundreds of requests a minute) and keep everything else as it is; or point the live turn at a provider whose key is already in Vercel by setting `MODEL_ROUTES` there, for example `{"tutor-live-turn":"anthropic:claude-haiku-4-5-20251001"}`, and re-check the first-audio number with `pnpm latency` because D25 chose Gemini for its 674 ms first token. Then re-run `EVAL_MODEL=<model> pnpm eval` from a keyed machine and paste the reports into `docs/evidence/evals/`.

**Update, 2026-09-30 08:30 UTC.** The daily cap is the one that bites: `generate_content_free_tier_requests, limit: 20`, per model, per day. The day's twenty were spent by 08:20 UTC (your session at 07:14, then this seat's screenshot runs), and from then on every turn on kaizenedu.net answered "The tutor could not answer that one". Twenty requests is less than one session. As an interim the five tutor stages are routed in Vercel (`MODEL_ROUTES`) to `openai:gpt-5.4-mini`, the one paid key that is already there; D40 records what that measured against production (a greeting and a work turn with no errors, first byte 0.28 s on a warm function). The Anthropic key in Vercel reads as unset at runtime and this seat cannot copy one in, so if you would rather run the tutor on Claude (the local production build ran it on `anthropic:claude-haiku-4-5-20251001`, first model delta about 1.9 s through the sandbox), paste your key into `ANTHROPIC_API_KEY`, set `ANTHROPIC_BASE_URL` to `https://api.anthropic.com/v1` (the SDK reads it, and a base without `/v1` answers 404), and change the routes. To go back to Gemini: enable billing on the key's project, delete the `MODEL_ROUTES` variable (the build's own routes take over) and redeploy. Read 0c before choosing Gemini for anyone under 18.

## 1. Check `/api/tutor/health` after the deploy — 1 minute

Load the route above on production once the merge has deployed. Read four things: `"ok": true`; `"asr": {"key": true}` (the tutor can hear); `"weeklyEmail": {"configured": true}` (the Monday cron, which now also deletes idle guests, has its secret); and an empty `"missing"`. Then walk the guest path yourself on a phone: pick a level, a subject, say something, hear the tutor answer, watch the board draw, open `/learn`, add one planner item, press **Start over**. If any step fails, the health output and `docs/GUEST-MODE.md` say which module owns it.

## 2. Counsel reads the guest posture for the younger levels — start now, longest lead time

The younger levels (early, k-3, 4-5, 6-7 and the first half of 8-9) run the 4-8 and 9-12 prompts: no personal questions, the crisis rules, shorter sessions. A guest session collects no personal information and asks for none; the level is a content setting, not a date of birth; everything behind the cookie is deleted on request or after thirty days; audio is never stored and the camera is off. That is the posture. Counsel has not reviewed it, `compliance/` is untouched, and it is the one open compliance question this change adds. Hand counsel `docs/GUEST-MODE.md` and D35 in `docs/DECISIONS.md` before the next marketing push, together with the two questions that were already open: whether a tutor persona with memory across sessions is a "companion chatbot" under California SB 243 and Utah HB 438, and the verifiable-parental-consent design that would open under-13 profiles in the account model.

The account model's under-13 gate is separate and unchanged: a parent-created child profile stays locked until `compliance/signoff.md` exists, which is the correct and intended behaviour.

## 3. `CRON_SECRET` and `ASR_OPENAI_API_KEY` in Vercel — being set on 2026-09-30

The lead is setting both today. Confirm rather than assume: `pnpm doctor` prints a line for ASR (it wants `ASR_OPENAI_API_KEY` first) and a line for the weekly report (`CRON_SECRET`, on top of email), and `/api/tutor/health` reports `asr.key` and `weeklyEmail.configured`. If both say yes, this item is done.

If either is missing, add it in Vercel → project `kaizenedu` → Settings → Environment Variables, for **Production** and **Preview**, then redeploy:

| Variable             | Value                                                                                                                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ASR_OPENAI_API_KEY` | the OpenAI key the transcription route uses; without it the tutor cannot hear and every voice turn falls back to the text box                                                        |
| `CRON_SECRET`        | any long random string (`openssl rand -base64 32`); Vercel sends it with the Monday cron (`vercel.json`) that mails the weekly report and deletes guests idle past `GUEST.retentionDays` |

Without `CRON_SECRET` the cron route refuses every call, so no guest is ever deleted by the schedule; **Start over** still works for the learner.

## 4. Turn on email — 15 minutes, so a safety event pages a person

The provider keys are in Vercel and `/api/tutor/health` says `ok: true` (rotate them when you have a minute: they were in git history). What is still missing is a way to send mail. Without it nobody is paged on a safety event, a support message reaches nobody, the operator's own password cannot be reset, and no parent-owned learner hears the weekly report. Guests are never emailed either way.

1. Create a Resend account at <https://resend.com>, add your sending domain, and put the DNS records it shows where the domain is hosted. Until they verify, Resend delivers only to your own address.
2. Create an API key, then add these variables in Vercel → project `kaizenedu` → Settings → Environment Variables, for **Production** and **Preview**:

| Variable               | Value                                                                                                                                                                                                                       |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RESEND_API_KEY`       | the key from the Resend dashboard                                                                                                                                                                                           |
| `EMAIL_FROM`           | the verified sender, e.g. `Natural Tutor <hello@kaizenedu.net>`                                                                                                                                                             |
| `SAFETY_ALERT_EMAILS`  | the address (or comma-separated addresses) paged on a crisis match or an unsafe report: ids only, never what was said (`docs/SAFETY-RUNBOOK.md`). Yours, until there is a rota                                               |
| `SUPPORT_EMAIL`        | where `/support` messages go; the visitor's address is the reply-to                                                                                                                                                         |
| `ALERT_WEBHOOK_URL`    | optional: a Slack incoming webhook that gets the same ids on every safety event                                                                                                                                             |

3. Redeploy, then load `/api/tutor/health` and check `"email": {"configured": true}`, `"safety": {"configured": true}`, `"support": {"configured": true}` and `"weeklyEmail": {"configured": true}`.

Until then every form that would send mail says so instead of pretending: `/forgot-password` answers that this deployment cannot send email yet and names the two variables; `/support` saves the message and says nobody was told; a safety event writes its flag row and pages nobody. `pnpm doctor` reports all three lines.

## 5. Read the Gemini API terms and decide the model for the younger levels — 20 minutes

The live turn runs on `google:gemini-3-flash-preview` through the Gemini API for every band, and with guest mode the 4-8, 9-12 and 13-17 bands are reachable by anyone who picks those levels. A search summary of <https://ai.google.dev/gemini-api/terms> says the API may not be used in a service directed to, or likely to be accessed by, people under 18; the primary page is blocked from the build sandbox, so nobody here has read it. If the text says that, those bands cannot run on it, and the switch is one variable:

1. Read the terms. If they permit an under-18 audience with the safeguards we have, do nothing and say so in `docs/DECISIONS.md`.
2. If they do not, set this in Vercel (Production and Preview) and redeploy:

| Variable                  | Value                                                                                                                                                                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TUTOR_BAND_MODEL_ROUTES` | `{"4-8":{"fast":"openai:gpt-5.4-mini"},"9-12":{"fast":"openai:gpt-5.4-mini"},"13-17":{"fast":"openai:gpt-5.4-mini"}}` — the OpenAI key is already live; `anthropic:claude-haiku-4-5` is the alternative once the Anthropic key has credit |

3. Then run `pnpm latency --product` from a keyed machine with a learner in each routed band and paste the rows into `docs/SPIKE-latency.md`; the budget is 1.5 s to first audio at p50.

`/api/tutor/health` shows the override under `llm.bandOverrides`. Adults stay on Gemini either way.

## 6. The item bank — written, waiting for your review (item 12)

The bank exists: 96 authored items, eight per skill, in `lib/tutor/content/item-bank.json` (D29), plus 22 carried over from Kaizen-AI's hand-verified seed (`F*-ka-*`). None reaches a learner until a person stamps it; that review is item 12. Until then every check a learner meets is one the tutor writes itself, for fractions and for every other subject alike. The generation pipeline below is still available for more candidates, and is still blocked on a funded model:

This was the state of the pipeline when it last ran. It produced **zero items** because every model it could reach was refusing:

- `anthropic:claude-sonnet-5` — fails instantly, every attempt: _"Your credit balance is too low to access the Anthropic API"_.
- `google:gemini-3.6-flash` — the free-tier **daily** quota is spent: _"Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20"_. Roughly 45 attempts that night, zero successes. The retry hint never trended toward zero, which is how a per-day cap behaves rather than a rolling window.

Fix either one: add credit at <https://console.anthropic.com/settings/billing>, or put a paid Google key in `GOOGLE_API_KEY`. Then run:

```bash
node --env-file=.env.local --import tsx eval/item-bank/runner.ts --stage all \
  --gen-model anthropic:claude-sonnet-5 --gen-fallback-model google:gemini-3.6-flash \
  --solve-model google:gemini-3.5-flash --solve-fallback-model google:gemini-3-flash-preview \
  --concurrency 1
```

It chains generate → solve → validate → package → report in one process and resumes from `eval/item-bank/.cache/`, so nothing already paid for is repeated. It writes `lib/tutor/content/item-bank.json`, its README, `docs/ITEM-BANK-REVIEW.md`, and a metrics file.

The same unblock also finishes two measurements the turn engine could not complete: the 80% whiteboard drawing rate (`npx tsx scripts/tutor-turn-smoke.ts --rate 10`, which exits non-zero below 80%) and a real latency reading.

Note this affects tutor quality too, not just content: the stronger model is what grades answers, runs the diagnostic, and writes session summaries.

## 7. Decide the product name — a judgement call only you can make

Decision D13 says the product name contains neither "MAIC" nor "Kaizen" until the brand question is settled, but the domain you freed up is `kaizenedu.net`, which puts "Kaizen" in every URL. Three ways out, pick one:

- **Keep `kaizenedu.net`** and retire D13. Simplest, costs nothing, and the name is already yours.
- **Pick a new name** and point `kaizenedu.net` at it as a redirect. Candidates checked as available on 2026-09-04: `wrentutor.com`, `kitetutor.com`, `besidetutor.com`.
- **Ship under the working name "Natural Tutor"** on `kaizenedu.net`, which is what the free tutor does today, and decide before the public launch.

Whatever you pick, tell the next session and it will update `kaizen.config.ts`, the landing copy, and the legal pages in one pass. Note from the trellis record: neither "Kaizen" nor "Trellis" cleared a class-41 search there, so a new name needs its own search by counsel.

## 8. Engage counsel on the account model's under-13 gate — the same engagement as item 2

Nothing under `compliance/` may be written by an agent, and the under-13 gate for parent-created child profiles cannot open without it. Counsel needs to produce and sign off: the privacy policy, the direct notice to parents, the written retention policy, and the vendor data-flow document. The checklist they should work from is spec §11.2 and `.claude/skills/minors-privacy/references/coppa-checklist.md`. Each vendor's terms must pass a minors' data review (no training on inputs, service-provider role, data-processing terms) before any under-13 profile is unlocked. This matters when accounts return (`docs/CONSOLIDATION.md`, wave 3); item 2 is the question that matters now.

## 9. Object storage — 10 minutes, only when you want uploads to persist

A Cloudflare R2 bucket (or S3). Set `ASSET_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION=auto`, `AWS_ENDPOINT_URL_S3=https://<account-id>.r2.cloudflarestorage.com`. Photo and PDF homework uploads work without it in a single session; they do not survive a redeploy.

## 10. Stripe — only if and when you decide to charge

Billing is off the public surface and stays shut in code until both the keys exist **and** you flip the `billing_enabled` row, so nothing can charge anyone by accident. When that day comes: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY` (a recurring monthly price at the figure in `PLAN.priceCentsMonthly`), the webhook at `https://<your-domain>/api/parent/billing/webhook`, and one walk with a real card: `/parent` → subscribe → pay → the dashboard shows the plan → open the portal → cancel → the webhook flips the subscription back. Changing the price is a decision the build rules require you to make, not the seat.

## 11. Analytics and errors — optional, whenever

PostHog (`NEXT_PUBLIC_POSTHOG_PROJECT`, `POSTHOG_API_KEY`) and Sentry (`SENTRY_DSN`). Both are no-ops without keys, so the product runs fine without them. Session recording and media capture are off by design and must stay off.

## 12. Review the item bank — a teacher's afternoon, before any bank item reaches a learner

`pnpm item-bank:review` produces `docs/ITEM-BANK-REVIEW.md` for the 118 items in `lib/tutor/content/item-bank.json`. A human who teaches this material works that sheet and stamps `reviewedBy` and `reviewedAt` on each item. Nothing counts as reviewed until both fields are set, and the validator enforces it with `--require-coverage`. Once the pipeline in item 6 runs, its candidates join the same sheet.

## 13. Run the real latency spike — 15 minutes, once the keys are confirmed

The build sandbox blocks OpenAI and ElevenLabs, so only the model hop could be measured here (first token 2,714 ms through the upstream route on Gemini; the TTS and ASR rows are empty). From your machine, with keys and a database:

```bash
pnpm dev
pnpm latency --product --turns 6 --out docs/metrics/latency-$(date +%F).json
```

That exercises the real path: a session, the streamed turn, TTS, ASR. The table also carries `wb_action_to_sentence`, the wait from a drawing to the sentence it belongs with (budget 2 s at p90), which is the exit measurement no sandbox can take. Paste the table into `docs/SPIKE-latency.md` and record go or no-go in `docs/DECISIONS.md`. The spec's budget is 1.5 s to first audio at p50.

## 14. Two safety-pattern changes to approve — 5 minutes

`pnpm eval:red-team` found two misses in the pattern screen (`docs/evidence/evals/red-team-*.md`). Both fixes are one line in `lib/tutor/safety/patterns.ts`, and a pattern change is one the build rules say to ask about first:

- **Over-fire:** the abuse list matches "beat me" in "my brother beat me at chess", which ends a session with the crisis referral. Proposed: require "beats me"/"beat me" to be followed by "up", "at home", "when", "every", "a lot", "badly" or "really", the way the "hurts me" pattern already does.
- **Miss:** the 9-to-12 profanity list matches "shit" only at a word boundary, so "this is bullshit" passes to the model. Proposed: `\w*shit\w*`.

Say yes or no to each and the next session makes the change with the eval as its test.

## 15. Two small housekeeping calls

- **Preview access.** Deployment protection is SSO for everything except your custom domains, so a build seat cannot open a preview URL to check its own work. Add a "Protection Bypass for Automation" secret under Settings → Deployment Protection and hand it to the next session, or accept that runtime checks happen on production after each merge.
- **Cloudflare tracing.** The instructions you pasted configure Workers, and this deploys to Vercel, so it was not applicable (decision D20). If you want it, the decision is to move hosting to Workers via OpenNext, which is a real change and needs an explicit yes.

---

## What is built, so you know what you are turning on

Merged in #55 (`20a971b`) and #57, type-clean, lint-clean, and green on every CI gate: the streaming turn engine and every tutor route, the session screen with the presence and the whiteboard (the tutor can point, with a highlight over the thing it is talking about or a hand-drawn underline, tick or ring), the student model with the confirmed-mastery rule that is the product's central claim, the session state machine and its adaptive diagnostic for fractions, local and model grading with the symbolic and keyword types, 118 check items awaiting review, the tutor prompt files, the full client voice loop, safety paging and the sitting clock, the support inbox, the claims scanner and the copy checks in CI, the metrics board, and the three tutor evals. Behind the free path and unchanged: accounts and sign-in (parent, adult, teen-started with parent completion, password reset), the learner and parent dashboards, the eight parent routes, Stripe billing behind a fail-closed gate, the weekly report.

This change adds guest mode, topic sessions for nine subjects with the prompts written for every subject, the planner, and the landing page and `/learn` rebuilt around the start form.

Not built, on purpose or by order: school-system imports, spaced retrieval across days, the quiet window and exposure ledger, parent accounts for guests, the early-numeracy item bank for the 4-8 band, camera attention for guests, the Rive character (a commission), the under-13 unlock for the account model (counsel), and Lesson mode. The sequence is `docs/CONSOLIDATION.md` §6. What no build seat can do is on this list above.
