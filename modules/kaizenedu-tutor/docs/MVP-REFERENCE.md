# MVP reference: the AI SaaS, shipped first

**Status:** the contract for the next build run. Written 2026-09-05 from Manny's decisions on the integration plan (`docs/KAIZEN-AI-INTEGRATION-PLAN.md`). Where the two disagree, this file wins; the plan's port list (§3) and gotchas (§5) remain the reference for anything that is ported.
**Naming, once:** **KaizenEdu** (this repository, working name Natural Tutor) is the AI SaaS being sold first. **Kaizen-AI** (`saitokiku/Kaizen-AI`) is the old repository: the Austin club, the seats, the human tutors. It is a source archive. Nothing in it ships; parts of it get carried over.
**The brief, in Manny's words:** isolate the AI MVP, ship the first funnel polished, port the easy things, do not overcomplicate the SaaS. Only reasoned, actually useful things must be in the product now. Anything that can stay in the back while people use the front end can keep being developed after. No real tutors, none of the old repository's extra stuff. Improve on OpenMAIC, do not just wrap it.
**Revision, not replacement:** this document narrows the standing contract (`docs/SPEC.md`, `docs/PLAN.md`, `docs/BUILD-PROMPT.md`, with changes recorded in `docs/DECISIONS.md`) to the funnel; it does not compete with it. Where it is silent the contract applies; where they disagree this document wins and the change is recorded. Everything already built stays and is extended in place: the turn engine and session state machine (`lib/tutor/turn`, `lib/tutor/session`), the voice loop (`lib/tutor/voice`), the presence (`lib/tutor/presence`, `components/tutor/avatar`), accounts with the sign-up age check (`lib/tutor/accounts`, `lib/tutor/auth`), billing behind `billing_enabled` (`lib/tutor/billing`), the student model on `evidence_events` (`lib/tutor/model`, `lib/tutor/db`), local grading (`lib/tutor/checks/grading.ts`), coursework from typed text, an uploaded photo or a picked skill (`lib/tutor/coursework`, `lib/tutor/extract`), the progress view and the parent report (`lib/tutor/progress`, `lib/tutor/report`), the safety pattern screen (`lib/tutor/safety`), the cost guards (`lib/tutor/cost`, `lib/tutor/guards`), the authored item bank awaiting human review (`lib/tutor/content/item-bank.json`, 96 items, none reviewed), the build-time runtime config (`scripts/generate-runtime-config.mjs`), the invariant suite and the skills. A port from Kaizen-AI fills only the difference between what exists and what §5 describes, inside the module that already owns the job; when the existing code is as good or better, the row is dropped and the PR says so. Nothing shipped is deleted to make room.

---

## 1. Decisions recorded

| Question | Manny's answer (2026-09-05) | What it changes |
| --- | --- | --- |
| Focus | Isolate the AI MVP; ship the first funnel polished; port only easy, reasoned things; the rest stays in the back | The five-phase plan becomes one funnel step and a back list (§7) |
| Human tutors | None. No handoff queue, no tutor role, no observation route, nothing from the club | Plan §3.4 is withdrawn except the safety queue, the sitting clock and a support inbox |
| Mastery record | "Rethink this side and how to integrate this holistically" | §4: what is built ships; the engine grows as a derived layer in the back; nothing on the funnel waits for it |
| Failures and the gate | The k-of-n passes must span distinct days | Applies when the derived gate lands (§4) |
| Lesson mode | Interactive scenes for everyone, after review | The review gate for model-authored interactive scenes is part of Lesson mode, not a later extra. Lesson mode comes after the funnel |
| OpenMAIC | Improve it for our product; contributing back is for later | Deeper engine patches are allowed and expected (§6); keep the `upstream` remote and the weekly merge for now so their fixes still arrive |
| Where the build runs | Claude Code with both repositories cloned | The build prompt points at files and skills |
| Audience | Adults first where needed; students from the band where the industry lets them sign themselves up; research the standard | §3: adults self-serve, 13 to 17 start their own sign-up and a parent finishes it, under 13 stays locked behind counsel |
| Face | Ship the abstract presence; commission a Rive character in parallel | No loop change; the seam exists |
| Pricing, plan limits | Unchanged ($29, 3 profiles, 8 pooled hours) | Ask before touching |
| Name (D13) | Still open | The claims scanner keeps one regex for the entity name; the landing page uses the working name until told |

---

## 2. The funnel, and what blocks it today

The MVP is one path a stranger with a phone can walk end to end on production:

```
landing → sign up (adult, or parent; a teen can start it) → learner profile → /learn
→ session: voice, face, board, checks → wrap → parent or learner report
→ trial cap → checkout ($29) → paid → weekly email
```

**Status, 2026-09-06.** Pull request 55 (branch `claude/build-prompt-spec-6qeqcn`) landed most of step 1 in one day, by its commit log: the email wrapper and password reset; the teen-started sign-up with parent completion and per-band model routing; Kaizen-AI's verified fraction items and the answer types local grading lacked; safety paging, the sitting clock and the support inbox; the weekly report; the claims scans in CI, the tenancy hole closed, the metrics board and the three evals; screenshots of every product screen at both widths in both themes; whiteboard stroke and highlight behind an upstream fence; the three skills of §8; and the CI fixes for the storage suite and the E2E job. The table below is the 2026-09-05 read, kept as the record of where the run started. The live operator list is `docs/DO-THIS-NEXT.md` and the evidence is `docs/LOG.md`; read them before trusting a row here.

Everything below is a gap on that path, read from the code on 2026-09-05 and re-read after pull request 53 merged the same day (runtime config compiled in, the landing presence, 96 authored items). "Operator" means only Manny can do it.

| Gap | Where | Who | Status |
| --- | --- | --- | --- |
| Provider keys are not in the Vercel project, so every turn refuses with `NOT_CONFIGURED` | `docs/DO-THIS-NEXT.md` item 2; `GET /api/tutor/health` | Operator | Open. Rotate while pasting |
| Stripe keys and the `billing_enabled` row | `docs/DO-THIS-NEXT.md` item 7 | Operator | Open. Nothing charges until both |
| Email does not exist: no Resend key, no wrapper, no password reset, no parent invite, no weekly email | `README-KAIZEN.md` reserves `RESEND_API_KEY` for R18; `grep -ri "reset password" app lib` finds nothing | Code + operator | The single largest funnel hole: an account with a forgotten password is lost |
| No check item is live: 96 authored items, none reviewed, and an item reaches a learner only once a person sets `reviewed_by` (D29) | `lib/tutor/content/item-bank.json`; `docs/ITEM-BANK-REVIEW.md`; `pnpm item-bank:review` | Operator (review) | Open. The sheet exists; nothing in the repository may sign an item off |
| The live-turn model may be forbidden for minors by its own terms | `kaizen.config.ts` `TUTOR_MODELS.fast = google:gemini-3-flash-preview` through the Gemini API; see §3 | Operator (verify) + code (per-band routing) | Open, week 1 |
| TTS and ASR latency never measured | `docs/SPIKE-latency.md`: only the model hop has numbers | Operator (run from a keyed machine) | Open |
| The persona and red-team evals do not exist | `package.json` `eval:persona`, `eval:red-team` point at missing directories | Code | Open |
| Weekly metrics script does not exist | `scripts/metrics-report.ts` (build prompt, release checklist) | Code | Open |
| Safety events are recorded but nobody is paged | `flags` rows only; no email, no runbook | Code | Open |
| Landing and legal copy carry the working name and draft banners | `components/tutor/marketing/**`, `compliance/` | Operator (name, counsel) | Open, not blocking 13+ and adults |
| One tenancy hole in the upstream document store | `tests/invariants/cross-tenant-isolation.test.ts` `it.fails`; `lib/persistence/owner-bound-document-store.ts:195` | Code | Product tables are scoped; close it anyway before beta |
| Prompt caching unverified on the AI SDK path | `lib/tutor/turn/llm-call.ts` rebuilds a multi-thousand-character system prompt every turn | Code | Cheapest cost lever if missing |
| No dogfood session on a physical iPhone | spec R1 | Operator + code | Open |

Polish, on the same path: every screen's loading, empty, error and offline states exercised; screenshots at 390 px and 1280 px in light and dark; `node .claude/skills/design-system/scripts/check-copy.mjs` clean; one focal point per screen; `prefers-reduced-motion` respected on the session screen.

---

## 3. Audience: what the industry does, and our posture

Researched 2026-09-05 through web search summaries. **The primary pages (OpenAI, Google, Anthropic terms) are egress-blocked from the build sandbox and were not read; every line below is marked "verify" until a person reads the primary text.**

| Product | Sign-up rule (search summary) |
| --- | --- |
| Khanmigo (Khan Academy) | 18+ to sign up; an under-18 learner is enabled by a parent or guardian account (up to 10 children per parent plan) |
| ChatGPT (OpenAI) | 13+; under 18 needs a parent or guardian's permission; a teen experience for 13 to 17 with parental controls; automated age prediction added in 2026 |
| Synthesis Tutor | Parent (18+) signs up; learners aged 5 to 11; verifiable parental consent by card, parent email and click-through |
| Duolingo | 13+ own account; under 13 through a parent's email consent; separate kids' apps |
| Quizlet | Under 13 signs up with a parent's email and the parent confirms; 13+ own account |
| Photomath | 16+ |

The pattern: **consumer study apps let 13-year-olds sign themselves up (the COPPA floor); products that call themselves a tutor for kids put an adult on the account and give the child a profile.** Khanmigo, the closest comparable, is adult-owned with child access enabled by the parent.

**Provider terms, which bind us harder than the industry pattern (all "verify"):**

| Provider | Search summary | Consequence for us |
| --- | --- | --- |
| OpenAI API | Users 13+; under 18 with parental permission; do not build for under-13 without COPPA handling; zero-data-retention posture before any under-13 data (per Kaizen-AI's strategy notes) | Usable for 13 to 17 with the safeguards we already have |
| Anthropic API | Minor-facing products allowed with age verification, content moderation and AI disclosure (Help Center 9307344, per Kaizen-AI's strategy notes) | Usable for 13 to 17 with what is built |
| **Google Gemini API (AI Studio)** | **Developer must be 18+, and the API may not be used in a service directed to, or likely to be accessed by, individuals under 18.** Vertex AI is 18+ for the developer; minors reach Gemini only through Workspace for Education with consent | **Our live turn runs on the Gemini API for every band. If the primary text says what the summary says, teen sessions cannot run on it. Route the 13 to 17 band to an OpenAI or Anthropic fast model (or Vertex AI under Cloud terms) and re-run the latency spike on that model before any teen is invited. Adults may stay** |

**Our posture, from the above:**

1. **Adults** sign up and pay for themselves. Unchanged.
2. **13 to 17:** a teen may *start* sign-up. The neutral age screen takes a birth year; a 13 to 17 answer asks for a parent's email and the teen's chosen login name, sends the parent an invitation, and the parent's completion creates the parent-owned account with the teen profile already attached. The teen then signs in with their own login and uses the product alone, which is what the spec's teen profile already is. This is the Khanmigo model with the Duolingo on-ramp, and it keeps the payer an adult, satisfies the known-minor duties (Texas SCOPE, California SB 243 disclosure and break reminders) and the provider permission requirement.
3. **Under 13:** locked until counsel signs off (`compliance/signoff.md`). Unchanged.
4. **Band-specific model routing** is a small code change (`TUTOR_MODELS` gains a per-band override) and a week-1 verification for Manny: read the Gemini API terms, decide, and set the route.

Sources (search summaries): [Khan Academy: how to sign up for Khanmigo](https://support.khanacademy.org/hc/en-us/articles/13982227159437-How-do-I-sign-up-for-Khanmigo), [OpenAI: is ChatGPT safe for all ages](https://help.openai.com/en/articles/8313401-is-chatgpt-safe-for-all-ages), [OpenAI teen protections](https://openai.com/index/updating-model-spec-with-teen-protections/), [Gemini API additional terms](https://ai.google.dev/gemini-api/terms), [Google Cloud COPPA compliance](https://cloud.google.com/security/compliance/coppa), [Synthesis COPPA page](https://www.synthesis.com/coppa), [Quizlet younger users FAQ](https://help.quizlet.com/hc/en-us/articles/360029923632-FAQs-about-younger-Quizlet-users), [Duolingo safety overview](https://www.expressvpn.com/blog/is-duolingo-safe/).

---

## 4. The record, rethought as one thing

Manny asked for the mastery side to be rethought holistically rather than chosen from a menu. The holistic answer is **one law, three layers, and the funnel waits for none of them.**

**The law**, already true in the code and on the landing page: the tutor never grades its own help as mastery. Every hint writes an `assisted` mark; a check after a hint is assisted; only an unassisted check can confirm; the parent report uses the word mastery only for `confirmed`.

**Layer 1, live (ships now, built).** `lib/tutor/model`: the EMA estimate per skill, `mastered` at 0.8 over 4 items and 2 sessions, `confirmed` by one unassisted check at least 24 h later, misconception tags that resolve after three clean items. The tutor reads it in session; the parent report shows it labelled as an estimate. Nothing here changes for the MVP.

**Layer 2, the ledger (in the back, small, additive).** `evidence_events` gains typed columns beside its JSON payload: `kind` (check, practice, hint, diagnostic, observation, session), `outcome` 0 to 1, `verified_by` (symbolic, structural, model, self), `weight` stored at write time, `context_tag`, `item_id`, `skill_id`. New rows are written with them; old rows keep their payload. The answer types Kaizen-AI's verifier (`verify/symbolic.js`, `mathExpr.js`) handles and `lib/tutor/checks/grading.ts` does not are ported into `gradeLocally`, so `verified_by: symbolic` is true for numeric, fraction and symbolic answers and the model is called for fewer grades. Cost: one schema statement, one pure module with its tests, one change in the check route.

**Layer 3, the derived record (in the back, later, shadow first).** The pure estimator and gate from Kaizen-AI (`pfa`, `hlr`, `scheduler`, `policy.reachableSet`) run as a job over the typed rows into a `record` table: working, confirmed, confidence, next check, the growth tip. It runs in shadow beside layer 1 on real learners. The parent report switches to it only when it agrees with layer 1 on the learners we have, at which point `confirmed` means four of the last five unassisted verified checks across two surface contexts on distinct days, at least 48 h after instruction. The distinct-days rule is Manny's decision 2. "Moved this week" is computed from `mastery_change` rows today and by replay when layer 3 lands.

**What this is not.** It is not the `kc` graph, `kc_alias`, any-subject mapping, the practice loop, the hint ladder, placement or calibration. Those are the back list (§7) and they are only worth building once the funnel has paying learners producing evidence.

---

## 5. The easy ports from Kaizen-AI

Small (S) is a day or less for one seat; medium (M) is two or three. Each row names the source file so nothing is re-derived. Where KaizenEdu already does part of the job, the row says so and the port extends that code rather than standing beside it. Nothing here needs the club, the seats or a human tutor.

| Port | From (Kaizen-AI) | Effort | Why it is worth it now |
| --- | --- | --- | --- |
| Email wrapper: `esc`, essential versus promotional, opt-out suppression, List-Unsubscribe, domain-only logging, honest not-configured state | `web/lib/server/email.js` | S | Password reset, the parent invitation and the weekly email all need it |
| Password reset and the parent invitation flow | pattern from `guardian-consent` token links in `web/lib/server/context.js` | M | The funnel hole in §2 |
| Weekly parent email that leads with what was confirmed and names what moved this week; sent only when something happened | `web/lib/server/familySummary.js` (`masteryLead`), `parentSummary.js` | M | The parent hears from the product without opening it; the generated label rides along |
| The 32 hand-verified items and 6 misconception feedback texts for the five overlapping skills (F3, F4, F8, F9, F12), as a cross-check for the authored bank | `supabase/seed_kc.sql` | S | The bank is no longer empty (96 authored items since pull request 53, none reviewed). The port is a review aid now: compare the human-verified items against the authored ones for the same skills, append any that add coverage in the `item-bank.json` schema, and leave `reviewed_by` unset; a person still reviews. No new loader |
| The answer types local grading lacks: symbolic with implicit multiplication, order, cloze, short answers by keyword, named wrong values with feedback. `lib/tutor/checks/grading.ts` already grades choice, numeric with tolerance and fraction or percent parsing, and short answers by accept list; the port extends `gradeLocally`, it does not replace it | `web/lib/engine/verify/symbolic.js`, `web/lib/mathExpr.js` | S | Fewer model grades, truthful `verified_by`, and the port has tests |
| Claims scanner: banned false forms (background-checked, guaranteed grades, FERPA and HIPAA postures, the wrong entity, the vacated click-to-cancel rule), un-cleared legal markers, one price literal | `web/test/claims.test.mjs`, `legalMarkers.test.mjs`, `priceTruth.test.mjs` | S | Trust on the landing and legal pages; CI catches copy drift |
| Safety event recording and paging on critical, plus the runbook with response times | `web/lib/server/moderation.js` (`screenAndRecord`), `docs/legal/SAFETY_RUNBOOK.md` | S | The pattern screen exists in `lib/tutor/safety`; nobody is told when it fires |
| The three-hour sitting clock for known minors | `web/lib/prompts.js` `sittingClock` | S | California SB 243 duties; three sessions in an evening can cross three hours |
| Support inbox route | `web/app/api/support/route.js` | S | A SaaS needs a way to reach a person; this is not a tutor handoff |
| Weekly metrics script in the funnel-board shape (denominators in words, zero states designed, missing tables reported as not provisioned) | `web/app/api/admin/funnel/route.js` (`buildBoard`) | M | The Monday numbers the build prompt and any buyer ask for |
| Prompt caching check | `web/lib/server/aiCall.js` (the `cache_control` approach) | S | Verify whether `callLLM` caches the system prefix; if not, it is the cheapest cost lever left |

---

## 6. Improving OpenMAIC for our product

Improve means the engine gets better for a one-to-one voice tutor, in place, as patches with a `// KAIZEN:` comment, with the `upstream` remote kept so their fixes still merge weekly. Contributing back is a later question. The list below is what `docs/ARCHITECTURE-MAP.md` already found and the product routes work around; fixing them in the engine removes the workarounds.

| Improvement | Where | Why |
| --- | --- | --- |
| Whiteboard executors that do not sleep and honour `AbortSignal` | `lib/action/engine.ts` (`await delay(WB_*_MS)` in every `wb_*` path) | Five elements cost four seconds of dead air; barge-in cannot cancel a drawing |
| `wb_stroke` and `wb_highlight` primitives | `packages/@openmaic/dsl/src/action.ts`, `validate.ts`, the canvas | A tutor points at things; today it can only place things |
| Sentence-boundary sealing and a voice mode with no reveal pacing | `lib/buffer/stream-buffer.ts` (30 ms per character, seals at turn end) | The product re-implements this in `lib/tutor/turn`; the engine should do it |
| Delete the 50 % grading fallback | `app/api/quiz-grade/route.ts`, `components/scene-renderers/quiz-view.tsx` | A parse failure is `ungraded`, never half credit |
| Close the unscoped document read | `lib/persistence/owner-bound-document-store.ts:195`, `document-access.ts` | The one open tenancy hole; flip `it.fails` to a pass |
| Trim the provider roster and the locales | `lib/ai/providers.ts` ships 19 providers to the browser; 12 locales with `zh-CN` as default gate CI | Smaller bundle, faster builds, no i18n key failures on product strings |
| The strip list, three passes | `.claude/skills/openmaic-internals/references/strip-list.md` | Flag off home, settings, workbench, PBL, roundtable, export; delete the credential-taking routes; drop the PPTX packages and `postinstall` chain. The build is 4.4 minutes today |
| Cost per call in the engine's usage record | `lib/server/usage-storage.ts` (no cost, no session id, no ASR seconds) | The product's ledger does this beside the engine; one accounting is better than two |
| Lesson generation for a tutor, not a lecture | `packages/@openmaic/generation`: scene schema validation, `skill_id` anchoring, a review gate for every scene including interactive ones, sandboxed rendering of reviewed interactive scenes, the `spiral-curriculum` and `understanding-by-design` prompts as our defaults | Lesson mode (decision: interactive for everyone after review) |
| Whiteboard canvas on a mid-range phone | `components/whiteboard/whiteboard-canvas.tsx` | The session screen budget is 2 s to interactive |

---

## 7. Order of work

Evidence-gated, not dated. Each step ends when its exit line is true on production or in CI.

**Step 0, operator, this week.** Keys into Vercel (rotated); Stripe keys; a Resend key and `EMAIL_FROM`; the item bank reviewed with `pnpm item-bank:review`, at least for the skills the funnel exercises; the Gemini API terms read and the teen band's model decided; the latency spike run from a keyed machine; the Rive character commissioned; counsel engaged (does not block 13+ and adults). *Exit:* `GET /api/tutor/health` says `ok: true`; a staff account completes a spoken session on production.

**Step 1, the funnel end to end.** Email wrapper, password reset, the teen-started sign-up with parent completion, per-band model routing, the reviewed item bank live for the skills the funnel exercises (the 32 Kaizen-AI items as a cross-check), deterministic verification in the check route, safety paging, the sitting clock, the support inbox, Stripe checkout and portal exercised with a real card and a real cancellation, the weekly email. *Exit:* the definition of done in `.claude/skills/release-checklist` walked by a stranger with a phone; every invariant green on the production build.

**Step 2, polish and proof.** Every screen's four states; screenshots at both widths in both themes; `check-copy.mjs` and the claims scanner in CI; the persona, coach-mode and red-team evals seeded from Kaizen-AI's rubric and cases; the metrics script producing its first `docs/metrics/YYYY-WW.md`; the iPhone dogfood; the tenancy hole closed. *Exit:* Gate 1 checklist complete; the first twenty invites sent.

**Step 3, the engine improvements that pay on the funnel.** Non-blocking whiteboard executors with abort, stroke and highlight, sentence sealing in the engine, provider and locale trim, strip passes 1 and 2. *Exit:* whiteboard action within 2 s of its sentence measured; build time down and recorded; upstream merge still clean.

**Step 4, the back list, in this order, each only when the one before is live and paying learners are producing evidence:** the typed ledger columns and the verifier's `verified_by` (§4 layer 2); Lesson mode with its review gate (decision 4); a syllabus source for coursework (courses, assignments and due dates, the "keep track" feature from Kaizen-AI's `INTAKE_PROMPT`) added to `lib/tutor/coursework`, which already takes typed text, an uploaded photo and a picked skill; the derived record in shadow (§4 layer 3) with the growth tip; the topic-to-concept mapper for any subject; the practice loop and hint ladder; the portable mastery record in the export. *Exit per item:* its own acceptance criteria in a PR under 400 lines.

**Dropped, permanently, from this product:** human tutor handoff and briefs, the observation route and the `tutor` role, seats, cohorts, rooms, the marketplace, video rooms, tutor payouts, the club consoles, the localStorage sync, the planner UI code (its questions are rebuilt small when intake lands).

---

## 8. Skills

**Load, by area** (project skills in `.claude/skills/`, global skills as named):

| Change | Load |
| --- | --- |
| Anything under `lib/tutor` that is not voice, presence, auth or cost | `tutor-loop` |
| The audio path, TTS and ASR routes, the latency harness | `voice-pipeline` |
| The avatar, the Rive seam, the ladder | `presence-layer` |
| Sign-up, teen invitation, consent, transcripts, retention, any vendor, any notice text | `minors-privacy` |
| Any screen, any product copy, the landing page, the email templates | `design-system` (loads `ui-craft` and `design-taste-frontend`) |
| Any upstream file, the strip list, the action engine, the generator | `openmaic-internals` |
| Items, the skill graph, misconception feedback, the diagnostic | `pedagogy-fractions` |
| Model choice, prompt caching, provider terms questions | `claude-api` |
| Neon, indexes, the pooled connection, schema statements | `neon-postgres` |
| The metrics script and any chart on the report | `dataviz` |
| Before merging anything that writes money, consent, auth or evidence | `security-review`, then `release-checklist` |
| Reviewing a PR; after a port lands | `code-review`; `simplify` |
| Creating the skills below | `skill-creator` |

**Create before step 1** (each under 300 lines, validated with `pnpm skills:validate`; all three exist since pull request 55, so extend them rather than recreate them):

| Skill | Carries |
| --- | --- |
| `kaizen-ai-port` | The file map in §5 and the plan's §3, the JavaScript-to-TypeScript and supabase-js-to-`pg` translation rules, the gotchas from the plan's §5, the dropped list so nobody rediscovers the club, and the already-built list from the header so nobody rebuilds the SaaS |
| `parent-comms` | Confirmed-only headlines, moved-this-week, the generated label on every generated sentence, essential versus promotional mail, suppression, the invitation and reset token rules, no engagement nudges to a child, ever |
| `claims-discipline` | The claims ledger format, the banned forms, the entity name, one price literal, a claim ships only with a row |

**Create when step 4 starts:** `evidence-engine` (the law, the scheduler contract, the shadow rule), `lesson-generator` (the offline job, the scene schema, the review gate including interactive scenes, playback through the turn engine), `content-ops` (two solves and a human stamp, context tags, the item converter).

---

## 9. What this reference did not verify

- The provider terms in §3 are search summaries; the primary pages are egress-blocked from the sandbox. Manny or counsel reads them before a teen is invited.
- No code was run for this document. Test counts and states come from `docs/LOG.md`, `docs/HANDOFF.md` and the code as read.
- Whether the AI SDK path caches the system prompt prefix is unchecked (§2).
- The overlap between Kaizen-AI's verified items and F3, F4, F8, F9 and F12 was judged by concept title, not by solving the items against the skill definitions; the port row in §5 includes that check.
