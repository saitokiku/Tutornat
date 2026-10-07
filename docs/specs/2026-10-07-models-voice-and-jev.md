# Models, natural voice and Jev

2026-10-07. Recommendation for the [integrated release](../plans/2026-10-07-integrated-learning-release.md).
This is a selection and evaluation plan. No provider has been activated or benchmarked by this review.
API capabilities below were checked against current first-party documentation. Comparative selection
uses [independent benchmark evidence](../reviews/2026-10-07-model-benchmark-evidence.md) and then frozen,
blinded Tutornat tests. Account access, minor-use terms and actual performance remain separate checks.

## Recommendation

Build one teacher with a small number of internal roles. Keep the working adapters as a control,
shortlist by role-specific independent benchmarks, and audition voice architectures on the **same learning
session**. Choose the best demonstrated teaching experience, with cost recorded rather than used as
an early quality ceiling. The owner explicitly chose: “Max quality i will burn cash first need best proof.”
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
latency/quality controls. Match effort and harness deliberately; maximum reasoning on every utterance
may damage conversation. Select only after the same tutoring, interruption, assistance, caption,
source and workspace tests. API novelty and price are not quality evidence.

One authoritative teaching chain owns a logical learner turn. Tool rounds, delegation and a configured
escalation share its ID, cancellation scope, provenance and budget; they do not create competing
learner-facing answers. One delivery stream is active and one confirmed answer can be recorded.
Model selection remains deployment configuration, not a learner-facing picker.

## Current candidates and their jobs

| Job | Candidates | Comparison / constraint |
|---|---|---|
| Live text/visual teaching and bounded tool use | Muse Spark (exact version unresolved), `claude-opus-5-5`, `gpt-6-astra` | Tutoring evidence drives entry; Sonnet 5.5/Sol 6.1 are controls, not automatic downgrades |
| Difficult explanation, source reconciliation, lesson preparation | `claude-opus-5-5`, `gpt-6-astra` | Separate preparation/depth benchmark; no inherited coding victory |
| Full-duplex speech delivery | `gpt-live-1` plus recorded backend/effort | Candidate, not presumed winner; delegates reasoning/tools |
| Integrated speech reasoning | `gemini-3.8-live` | In the first audition based on independent voice evidence; no camera stream |
| Additional integrated voice comparison | `gpt-realtime-2.1` | Lower-priority challenger unless local tests establish a specific advantage |
| Cascaded recognition | Deepgram `flux-general-multi` | Compare the existing adapter's supported model; EN/ES, turn detection and child speech require actual testing |
| Cascaded speech output | ElevenLabs `eleven_v4_turbo`, `eleven_v4` | Independent TTS shortlist; Flash v2.5 control; validate EN/ES math and actual timing |
| Typed semantic decisions | TypeSafe `jev-latest` | Record returned model version; Choice/Noul/Score, never answer generation |
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

**Engineering targets, not observed performance:**

| Measurement | Initial target | Measurement boundary |
|---|---|---|
| Tap/selection acknowledgement | p95 ≤100 ms | Input event → visible local state; no model dependency |
| Stop button | p95 ≤100 ms | Click/key → actual audio output stopped and cues cleared |
| Barge-in reaction | p95 ≤250 ms | Detected learner speech → output stopped; report detection delay separately |
| Short explanatory turn | p50 ≤800 ms; p95 ≤1.8 s | Last audible learner phoneme → first **useful** audible tutor content, including endpointing/network/tools |
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
actually work before selecting the vendor. The [GPT-Live delegation guide](https://developers.openai.com/api/docs/guides/live-delegation)
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
   unknown`. Supply the exact request and current context. Explicit user controls take precedence.
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
defined candidates. It returns `JudgmentResult<T> = { status: "ok"; value: T; probabilities; model;
requestId } | { status: "unavailable" | "abstain"; reason }`. Capture cost/latency in the existing meter.
Never silently coerce an unavailable result to `false`, `safe` or a passing score.

- Use per-purpose deadlines and a cancellable `AbortSignal`; initial intake budget 300 ms, measured
  as an application target. A late result cannot reroute an already-started session.
- Cache only non-personal reviewed content judgments keyed by input hash, model and policy version.
  Do not cache private learner utterances across accounts. Do not keep full prompts in general logs.
- Start routing in shadow mode with synthetic fixtures. Promote after held-out evaluation; no arbitrary
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
6. Report quality, cost per completed 30-minute session, and p50/p95 latency together. Do not declare
   a winner based on one model's marketing benchmark. Preserve the hold-out across repeats; tune on
   development cases, never repeated inspection of held-out failures. Quality, learner success and conversational
   reliability decide the first selection; cost becomes an observed operating requirement. Deploy only the passing set; others stay
   evaluation adapters. One on-demand escalation is the initial maximum per ordinary tutor turn.

Existing eval rules such as a universal two-statement limit and no explanation before a first try
need contextual replacement: a conceptual “why” deserves an explanation, adult “go deeper” deserves
depth, and a check must retain its assistance rules. Replace blunt rules with reviewed negative and
positive fixtures; do not merely weaken them to improve the pass rate.

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
until the explicit deployment allowlist changes. Keep Fable suspended and do not route private work
to DeepSeek. OpenRouter, if ever configured, is restricted to the permitted finite Jev decision route;
direct TypeSafe is the proposed implementation here. Production product credentials are separate from
Hermes/Claude/Codex subscription authentication on the development machine.

**Ready without credentials:** contracts, fixtures, preset validation, deterministic failure tests,
metering and comparison harness. **Needs external access:** hosted benchmark, provider entitlement,
retention/minor-use terms and real-device voice audition. These are distinct from unstarted coding.
