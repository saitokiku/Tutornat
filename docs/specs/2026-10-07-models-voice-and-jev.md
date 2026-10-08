# Models, natural voice and Jev

> **Proposed by Codex 2026-10-07. Not the plan of record. Mapped into STATUS Queue 4** (the model
> and voice evaluation side track, and Live Tutor phase A). Reconciliation edits are marked
> *Reconciled 2026-10-07*. Four rules hold over everything below until the owner answers otherwise:
>
> 1. **Anthropic only in production.** Any production role that leaves native Anthropic, and any new
>    processor of learner data (Jev included), needs the owner's written sign-off plus a
>    child-data/COPPA review of that processor. Until then, hosted comparisons use synthetic data or
>    consenting adults only, and `lib/ai/config.ts` keeps its `anthropic/*` Gateway restriction
>    (OWNER DECISION 2). The evaluation ends in a recommendation to the owner, never a pin.
> 2. **Native speech-to-speech is evaluation-only** (Gemini Live, `gpt-live-1`, `gpt-realtime-2.1`),
>    on synthetic or consenting-adult audio. A child can say their name or a crisis aloud before any
>    text exists to screen. The production default for minors is the cascade: speech recognition →
>    safety screen → name scrub (the tutor path's, `lib/tutor.ts` `withoutNames` fed by
>    `familyNames`) → model → speech output (OWNER DECISION 3, default: cascade).
> 3. **No answer before a try stays a hard deterministic check** (`evals/checks.ts:142`
>    `no-answer-before-try`; `lib/ai/prompts.ts:28`). Only the two-statement "short" rule relaxes, for
>    conceptual "why" and "go deeper" turns (OWNER DECISION 7, default: keep the rule).
> 4. **Latency gates are the [live-tutor spec](../plans/2026-10-07-live-tutor-spec.md) §2.3's**,
>    including the K–2 band. The tighter figures below are stretch targets.

2026-10-07. Recommendation for the [integrated release](../plans/2026-10-07-integrated-learning-release.md).
This is a selection and evaluation plan. No provider has been activated or benchmarked by this review.
API capabilities below were checked against current first-party documentation. Comparative selection
uses [independent benchmark evidence](../reviews/2026-10-07-model-benchmark-evidence.md) and then frozen,
blinded Tutornat tests. Account access, minor-use terms and actual performance remain separate checks.

## Recommendation

Build one teacher with a small number of internal roles. Keep the working adapters as a control,
shortlist by role-specific independent benchmarks, and audition voice architectures on the **same learning
session**. Recommend to the owner the best demonstrated teaching experience *(reconciled: was
"Choose")*, with cost recorded rather than used as an early quality ceiling. The owner said: “Max
quality i will burn cash first need best proof.” *Reconciled:* whether that authorizes live-provider
spending, and up to what daily and monthly ceiling, is OWNER DECISION 9 (claimed by Codex, owner to
confirm). Until answered, today's spend caps stay and no hosted run spends money.
Keep the number of production roles small. Do not run a panel of competing tutors on
every turn, or buy latency by letting a voice model invent the workspace state.

**Existing integration control:** Sonnet 5.5 for interactive teaching and Opus 5.5 for preparation,
with the existing streaming speech adapters. Keep this as a reference while repairing the session
contract. For the quality experiment, also run Opus 5.5 as the primary teacher, not only as an
occasional escalation. Jev handles bounded semantic decisions alongside either configuration.

**Benchmark-led shortlist, no winner yet:** Muse Spark's exact benchmarked version/access must be
resolved; test it alongside Opus 5.5 and Astra for teaching. The published newest-model comparison
does not justify assuming Astra wins. For voice, compare Gemini 3.8 Live, GPT-Live with a recorded
backend, and a cascade using the winning teacher with Eleven v4/Turbo. Sonnet and Sol 6.1 remain
latency/quality controls. *Reconciled:* add `claude-fable-5-1` as a teacher and deep-preparation
candidate, pending the owner's confirmation (same vendor, so no new processor; OWNER DECISION 15, which
also asks whether the `quick` role moves from `claude-haiku-4-5` to Haiku 5.5; default: no change).
Every non-Anthropic candidate is evaluation-only until rule 1 above is met. Match effort and harness deliberately; maximum reasoning on every utterance
may damage conversation. Select only after the same tutoring, interruption, assistance, caption,
source and workspace tests. API novelty and price are not quality evidence.

One authoritative teaching chain owns a logical learner turn. Tool rounds, delegation and a configured
escalation share its ID, cancellation scope, provenance and budget; they do not create competing
learner-facing answers. One delivery stream is active and one confirmed answer can be recorded.
Model selection remains deployment configuration, not a learner-facing picker.

## Current candidates and their jobs

| Job | Candidates | Comparison / constraint |
|---|---|---|
| Live text/visual teaching and bounded tool use | Muse Spark (exact version unresolved), `claude-opus-5-5`, `gpt-6-astra`; *reconciled:* `claude-fable-5-1` pending the owner | Tutoring evidence drives entry; Sonnet 5.5/Sol 6.1 are controls, not automatic downgrades. Non-Anthropic: evaluation-only until owner sign-off and child-data review |
| Difficult explanation, source reconciliation, lesson preparation | `claude-opus-5-5`, `gpt-6-astra`; *reconciled:* `claude-fable-5-1` pending the owner | Separate preparation/depth benchmark; no inherited coding victory |
| Full-duplex speech delivery | `gpt-live-1` plus recorded backend/effort | Candidate, not presumed winner; delegates reasoning/tools. *Reconciled:* evaluation-only, synthetic or consenting-adult audio |
| Integrated speech reasoning | `gemini-3.8-live` | In the first audition based on independent voice evidence; no camera stream. *Reconciled:* evaluation-only, synthetic or consenting-adult audio |
| Additional integrated voice comparison | `gpt-realtime-2.1` | Lower-priority challenger unless local tests establish a specific advantage. *Reconciled:* evaluation-only |
| Cascaded recognition | Deepgram `flux-general-multi` | Compare the existing adapter's supported model; EN/ES, turn detection and child speech require actual testing |
| Cascaded speech output | ElevenLabs `eleven_v4_turbo`, `eleven_v4` | Independent TTS shortlist; Flash v2.5 control; validate EN/ES math and actual timing |
| Typed semantic decisions | TypeSafe `jev-latest` | Record returned model version; Choice/Noul/Score, never answer generation. *Reconciled:* a new processor; synthetic fixtures only until owner sign-off and child-data review |
| Correctness, permissions, mastery, scheduling arithmetic | Existing deterministic code | No model can override the result |

Sources: [Anthropic model catalog](https://platform.claude.com/docs/en/models/overview),
[Sol API model](https://developers.openai.com/api/docs/models/gpt-6.1-sol),
[Astra API model](https://developers.openai.com/api/docs/models/gpt-6-astra),
[GPT-Live 1](https://developers.openai.com/api/docs/models/gpt-live-1),
[Realtime 2.1](https://developers.openai.com/api/docs/models/gpt-realtime-2.1),
[Gemini Live](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-live),
[Deepgram models](https://developers.deepgram.com/docs/models-languages-overview),
[ElevenLabs models](https://elevenlabs.io/docs/overview/models).

The current repo already defaults talk/build to Sonnet/Opus 5.5 in `lib/ai/config.ts`; do not replace
those with obsolete IDs copied from historical specs. Sol 6.1 tool use requires the Responses API;
an OpenAI adapter must exercise that path, not assume Chat Completions has feature parity.
Provider docs position these models by capability; they do not establish which teaches our learners best.
Use the separate benchmark review for comparative results and limitations. Muse's benchmark display
name is not an API slug: resolve current access and exact version before an adapter or any request.

No image/video generation model belongs on the essential answer path. Fractions, graphs, diagrams
and animations should be deterministic objects the learner can manipulate. Prepared illustrations
can use a separately evaluated image model later, with visual accuracy, provenance and accessibility
review. No generated diagram may become the source of a numeric answer key.

## What “natural, low latency” means here

The teaching surface, voice and input share session/object/turn/revision identifiers and cancellation.
Speech describes what the learner can currently see. An animation starts when its explanation is
delivered, can pause/replay, and remains understandable as a static before/after view. Tone, rhythm,
surprise and responsive motion can make a lesson engaging; they never establish an inferred emotional
state of the learner. Website ornamentation is later work.

Build tap-to-talk first, then opt-in hands-free with the same owner. Reliable stop and interruption
are required in the first integrated voice release. Hands-free is the subsequent T08 sub-checkpoint
within this integrated release, after tap-to-talk passes; it is not required for earlier text/demo merges.

*Reconciled 2026-10-07:* the gates are the [live-tutor spec §2.3](../plans/2026-10-07-live-tutor-spec.md)
table, which stays the authority for P1–P5 voice behaviour: grades 3–9 last word → first sound p50
≤ 1.6 s, p90 ≤ 2.5 s; **K–2 p50 ≤ 2.4 s, p90 ≤ 3.2 s, because K–2 waits longer for the end of a turn by
design so children are not cut off**; visible acknowledgement ≤ 150 ms; barge-in duck ≤ 150 ms, full
stop ≤ 800 ms. The 800 ms turn and 250 ms barge-in figures below are **stretch targets**; chasing them
must not shorten K–2 endpointing. Budget: one model call per spoken turn (live-tutor spec §2.5). An
escalation replaces that call for the turn, it is not a second learner-facing reply, and it is
counted inside the same turn's latency. A Jev call is never serial before speech: intake routing
runs on typed or committed text before the session starts, and relevance judgment runs offline or in
shadow on synthetic fixtures, so neither adds to the spoken turn. The measurement boundaries in the
table (and "never report speech-synthesis API time as turn latency") carry into Live Tutor phase A.

**Engineering targets, not observed performance** *(reconciled: stretch targets where they are
tighter than the live-tutor gates)*:

| Measurement | Initial target | Measurement boundary |
|---|---|---|
| Tap/selection acknowledgement | p95 ≤100 ms | Input event → visible local state; no model dependency |
| Stop button | p95 ≤100 ms | Click/key → actual audio output stopped and cues cleared |
| Barge-in reaction | p95 ≤250 ms *(stretch; gate: duck ≤ 150 ms, full stop ≤ 800 ms)* | Detected learner speech → output stopped; report detection delay separately |
| Short explanatory turn | p50 ≤800 ms; p95 ≤1.8 s *(stretch; gate: 3–9 p50 ≤ 1.6 s / p90 ≤ 2.5 s, K–2 p50 ≤ 2.4 s / p90 ≤ 3.2 s)* | Last audible learner phoneme → first **useful** audible tutor content, including endpointing/network/tools |
| Cold connection | Report separately | Permission already granted vs first permission, connection setup, first turn |
| Speech-aligned cue | p95 within 150 ms when provider timing exists | Audible target phrase → visible cue; otherwise use disclosed sentence-level alignment |
| Deep reasoning request | Visible progress by 1 s | Learner can keep manipulating; no repetitive filler to make latency look low |

Measure at least 30 warm short turns per locale per device class, plus cold starts, using the same
script and hardware/network record. Report distributions and failure counts, not just a best sample.
Initial device classes: desktop Chrome, iPhone Safari, Android Chrome. Test headphones and speakers,
background noise, soft voice, long pauses, “no, I meant…”, mixed Spanish/English and spoken fractions.
Synthetic audio proves protocol behavior; real consenting speakers prove recognition and turn timing.
Child-speech tests require the release's child-data gate first.

A voice that hits the latency target but routinely cuts off a child is a failure. Measure false
end-of-turn, premature barge-in, transcription correction, math pronunciation and task completion.
If a target is missed, retain text/tap access and name the shortfall; do not advertise “natural”
based on a mocked speech event. Pause paid live sessions during explicit breaks and close idle
connections under a disclosed, tested policy; an open microphone indicator must reflect actual capture.

For the cascaded path, prepare the first short meaningful clause while subsequent text streams.
Do not wait for the entire answer. Do not synthesize partial numbers/formulas before the speakable
normalizer has an unambiguous unit. Do not prefetch instructional audio that could leak a check answer.
Reuse the uncommitted numbers-speller work only after preserving and reviewing it.

For native/full-duplex paths, test how backend delegation, delivered transcript and interruptions
actually work before selecting the vendor. *Reconciled:* native speech-to-speech receives raw learner
audio before any committed text exists, so it cannot be safety-screened or name-scrubbed first. It
fails "the safety screen runs before any model call" and "learner names never go to a model" by
design, and stays evaluation-only on synthetic or consenting-adult audio. The production path for
minors is the cascade: recognizer → safety screen → name scrub → model → speech output. The [GPT-Live delegation guide](https://developers.openai.com/api/docs/guides/live-delegation)
describes the delivery/backend split; our adapter must still enforce one turn owner, bounded tools,
consent revocation and observed delivery. A provider's transcript is not proof that all its text was heard.

Every live-audio adapter must support the equivalent ordering: authorize processor/session → screen
the committed learner turn → persist applicable help exposure → release instructional output.
Do not treat autonomous audible output as outside those rules. A model that cannot enforce admission
and output gating is evaluation-only. Separate `textDisplayed` from `audioPlayed` delivery events;
each records content range and epoch. On revocation, stop the cooperating client immediately, revoke
server access and terminate provider sessions where supported; report any unrevocable credential
lease duration rather than promising instantaneous provider-side revocation.

## Jev: useful judgment with a limited job

Jev accepts state and typed questions and returns structured decisions. Choice selects among defined
options, Noul supplies a yes/no probability, and Score evaluates ordered levels. Use it where semantic
judgment helps code choose a path. [TypeSafe introduction](https://docs.typesafe.ai/introduction).

This machine has `jev 2026.919.0`. Installation and `--help` were checked; credentials, entitlement,
hosted latency and judgments were **not** tested. The CLI is for developer/evaluation workflows.
The web service should use a small server-side HTTP adapter, never spawn a CLI for each learner turn.
The documented endpoint is `https://api.typesafe.ai/v1/systemone`; verify its current schema before
implementation. [Official quick start](https://docs.typesafe.ai/introduction/quickstart).

### Three initial uses

1. **Goal routing.** For otherwise ambiguous intake, choose `question | practice | course | deadline |
   unknown`. Supply the request and current context, redacted (below). Explicit user controls take precedence.
   “Why does 1/2 equal 2/4?” must route to the current workspace. `unknown`, timeout or insufficient
   evidence keeps the question visible and offers a small choice; it cannot start a course silently.
2. **Response relevance evaluation.** Given a public observation, question and candidate response,
   judge separately whether the reply addresses the request, refers to the current object, and
   obeys the requested depth. Start in offline/shadow evaluation. Do not add a network gate before
   every spoken clause or use a post-delivery judgment as if it prevented a bad answer.
3. **Source/representation ranking.** Rank a small allowlisted, rights-reviewed candidate set for
   the stated objective. Return a candidate ID or no-match. Code still checks permissions, locale,
   valid object kinds and existence. Jev cannot introduce a URL or claim a source says something.

The first release implements uses 1 and 2; use 3 follows when it beats the existing retrieval rule
on held-out cases. Additional developer use: flag lesson drafts where the picture and explanation
appear mismatched, for a reviewer. That flag is not a correctness certificate or teacher approval.

**Never give Jev authority over:** arithmetic/check answers; mastery promotion; identity/consent;
spending authorization; child safety decisions by itself; IQ, attention, emotion or ability labels;
clinical claims; deletion/retention. It can flag an issue for review, not waive a deterministic gate.

### Contract and failure behavior

Create `lib/ai/judgment.ts` for pure schemas and `lib/server/jev.ts` for transport. The server consumes
an allowlisted, redacted `JudgmentRequest` with `purpose`, `policyVersion`, current observation and
defined candidates. *Reconciled:* "redacted" means the tutor path's name scrub plus an allowlist of
fields; nothing outside the allowlist is sent. The tutor path's scrub is `lib/tutor.ts`
`withoutNames(text, names)` fed by `familyNames` (what `TutorChat` imports). It is not the email
scrub: `lib/email/render.ts` has its own `withoutNames(text, names, bare, possessive)` with
`nameWords`. Jev and the voice cascade use the tutor-path scrub. If both scrubs are still needed when
Jev is wired, merge them into one function first, so every model-bound path strips names the same way.
Jev is a new processor: it runs on synthetic fixtures only until the owner signs off in writing and
its child-data review is done. It returns `JudgmentResult<T> = { status: "ok"; value: T; probabilities; model;
requestId } | { status: "unavailable" | "abstain"; reason }`. Capture cost/latency in the existing meter.
Never silently coerce an unavailable result to `false`, `safe` or a passing score.

- Use per-purpose deadlines and a cancellable `AbortSignal`; initial intake budget 300 ms, measured
  as an application target. A late result cannot reroute an already-started session.
- Cache only non-personal reviewed content judgments keyed by input hash, model and policy version.
  Do not cache private learner utterances across accounts. Do not keep full prompts in general logs.
- Start routing in shadow mode with synthetic fixtures *(reconciled: synthetic fixtures only; never
  shadow on real learner traffic)*. Promote after held-out evaluation and the owner's sign-off; no arbitrary
  universal confidence cutoff. Choose thresholds for the cost of a wrong route and record abstention.
- Confidence summarizes the distribution; it is not a guarantee of correctness. Measure calibration
  and mistakes on EN/ES and ambiguous requests. [TypeSafe confidence](https://docs.typesafe.ai/confidence).
- Pin a stable available model version for production when supported; otherwise record returned model
  identity and detect alias changes with canary tests. CLI uses `jev-latest`, so its replay manifest
  must retain the returned version.

Commit reviewable presets under `.jev/presets/` for `intake-route` and `tutor-relevance`; use synthetic
fixtures under `apps/web/evals/fixtures/judgments/`. `jev presets validate` must pass offline. For
authorized hosted runs use `jev map --preset tutor-relevance --in <fixture.jsonl> --concurrency 4`;
retain input indices because completion order can differ. Exit 1/2 is an infrastructure/partial
failure, and exit 3 is a failed assertion, not interchangeable outcomes. Authentication uses a
server secret or user-run `jev login`; never paste a key into a prompt, repo or conversation.

## Context is part of intelligence

Use three existing data responsibilities, with explicit projections:

- **Reusable knowledge:** reviewed content, objective/prerequisite metadata, source excerpt/version
  and rights; shared only when the source permits it.
- **Current work:** goal, visible object and selection, recent meaningful changes, source references,
  current confirmed learner input, relevant help already delivered.
- **Private learning record:** attempts, assistance, delayed evidence and learner preferences. Retrieve
  only the few relevant facts, with timestamps and evidence IDs. Proposed misconceptions stay tentative.

Do not send the whole store or all transcripts to a stronger model. Summaries retain provenance and
uncertainty and can be rebuilt from records. A summary cannot create an attempt or silently become a
fact about a learner. No vector database or additional agent-memory service is required for this
release: explicit IDs and existing skill/source retrieval suffice. Evaluate retrieval misses before
adding one. AI Memory used by coding agents is distinct from product storage for families.

## Selection experiment and deployment gate

Extend `apps/web/evals/`; keep its route-level harness. Use synthetic or explicitly permitted data.

1. Freeze a benchmark manifest: repo SHA, content version, prompts, case IDs, model IDs/effort,
   provider route, SDK, timing instrumentation and prices with retrieval date. Re-check catalogs when
   running it; this document is a dated recommendation.
2. Retain existing 45 tutor conversations and 30 writer goals. Add 60 cases: 10 each for relevant
   conceptual help, manipulated-object follow-up, depth/transfer, EN/ES and non-reading support,
   interruption/staleness, and misleading/injected source text. Both child and adult contexts appear.
3. Run deterministic checks through actual routes first: schema/keys/authorization/assistance,
   stale commands, arithmetic tools, grounded references, no duplicate submissions. Every critical
   integrity case must pass. Do not average these failures away in a quality score.
4. On passing candidates, blindly compare correctness, relevance, useful next action, learner agency,
   explanation clarity and depth. Follow the benchmark review's three repeats and at least 60 blinded
   paired conversations per finalist with two reviewers and conversation-clustered uncertainty.
   Jev and a separate stronger judge can prioritize review; neither is the reference truth.
5. Compare the same voice script on the v4/Turbo cascade, GPT-Live + recorded backend, and Gemini Live.
   Record recognition, interruptions, cue synchronization and heard-prefix fidelity as
   well as latency. Drop a candidate early if its API cannot enforce the session contract.
   *Reconciled:* the native candidates run on synthetic or consenting-adult audio only.
6. Report quality, cost per completed 30-minute session, and p50/p95 latency together. Do not declare
   a winner based on one model's marketing benchmark. Preserve the hold-out across repeats; tune on
   development cases, never repeated inspection of held-out failures. Quality, learner success and conversational
   reliability decide the recommendation; cost becomes an observed operating requirement.
   *Reconciled:* recommend the passing set to the owner; deploy only after the owner's written sign-off
   (plus a child-data review for any new processor). Others stay evaluation adapters. One on-demand
   escalation is the initial maximum per ordinary tutor turn, replacing that turn's call, not adding a reply.

*Reconciled 2026-10-07.* Codex wrote: "Existing eval rules such as a universal two-statement limit and
no explanation before a first try need contextual replacement." That misdescribes the guard. The check
is `no-answer-before-try` (`evals/checks.ts:142`) and the prompt says "Never give the answer to the
learner's current problem before they have tried it" (`lib/ai/prompts.ts:28`); neither forbids
explanation. So:

- `no-answer-before-try` stays a **hard deterministic check**, kept separate from any quality score,
  for every item-bound turn (live problems, practice items, checks).
- Only the `short` rule (at most two statements and one question, `evals/checks.ts:147–149`) relaxes,
  for conceptual "why" and "go deeper" turns. Add reviewed positive and negative fixtures for those
  turns alongside the existing ones; do not weaken a rule to improve the pass rate.
- A check keeps its assistance rules. Any further loosening is an owner decision (OWNER DECISION 7;
  default: keep the rule, conceptual explanation allowed on top).

### Cost accounting

Current documented standard text rates per million input/output tokens: Sonnet 5.5 $2/$10, Opus 5.5
$4/$20 ([Anthropic](https://platform.claude.com/docs/en/models/overview)); Sol 6.1 $2/$10
([Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol)); Astra $10/$50
([Astra](https://developers.openai.com/api/docs/models/gpt-6-astra)). Cache, reasoning, long-context,
service-tier and tool charges must be accounted for by the exact provider configuration.

GPT-Live is documented at $0.05 per connected minute, plus backend work: 30 connected minutes is
$1.50 **before** reasoning/tools. That arithmetic alone would rule it out of a sub-$1 session target
without shorter connection time or different commercial terms. The owner chose quality first, so
that hypothetical cap does not constrain this proof. [GPT-Live pricing](https://developers.openai.com/api/docs/models/gpt-live-1).
*Reconciled:* the actual spending authority and ceiling are OWNER DECISION 9; today's caps in
`lib/server/budget.ts` (per learner per day 50 turns / $1.00, per account per month 3,000 turns /
$30.00, per address per day 300 turns / $6.00, all env-configurable) stay until the owner answers.
No dollar-per-session claim is made for token-billed audio until actual audio usage is measured.

Use explicit per-run budget limits as protection against runaway retries, not an invented cheap-session
target. Before a hosted benchmark, calculate its case-count estimate and configure a sufficient finite
limit. Report the resulting spend and failures; an expensive result can be the right first result.

Track recognition, generation, speech, Jev, retrieval, retries and idle connection cost. Reserve
budget before starting calls and settle reported usage afterward, including cancellations. A budget
cap returns the usable reviewed/demo path with honest status. Do not use a weaker unapproved model
or different data processor as a silent cost fallback.

### Configuration and data boundaries

Extend the existing role config rather than importing a second orchestration framework. Proposed
server roles: `talk`, `build`, `deep`, `judge`; voice and Jev have their own capability adapters. Keep
the existing `quick` role backward-compatible until its call sites have been migrated deliberately.
Record requested and response-reported identity; a configured string is not proof of execution.

The owner's request authorizes planning a multi-model system; it does not activate every provider.
Private learner context only goes to deployment-allowlisted processors under the account's applicable
permissions. No relay is chosen from a request payload. Existing provider restrictions remain active
until the owner signs off in writing on a change to the deployment allowlist (and a child-data review
of any new processor is done); `lib/ai/config.ts` keeps its `anthropic/*` restriction until then.
Direct TypeSafe is the proposed Jev implementation here. Production product credentials are separate
from Hermes/Claude/Codex subscription authentication on the development machine.

*Reconciled:* Codex's line "Keep Fable suspended and do not route private work to DeepSeek.
OpenRouter, if ever configured, is restricted to the permitted finite Jev decision route" came from
the owner's Hermes developer-agent routing (`~/.hermes`). It is **developer-tooling policy, not
product policy**, and does not decide which models the product evaluates. `claude-fable-5-1` is a
product candidate pending the owner (OWNER DECISION 15).

**Ready without credentials:** contracts, fixtures, preset validation, deterministic failure tests,
metering and comparison harness. **Needs external access:** hosted benchmark, provider entitlement,
retention/minor-use terms and real-device voice audition. These are distinct from unstarted coding.
