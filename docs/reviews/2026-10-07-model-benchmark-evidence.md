# Model selection: independent evidence and the test still required

Observed 2026-10-07. This is a dated, bounded benchmark review, not a completed Tutornat model test.
The owner requires **maximum quality, with benchmarks rather than vendor reputation deciding roles**.
Execution belongs to [T10](../plans/2026-10-07-integrated-learning-release.md) and the
[model specification](../specs/2026-10-07-models-voice-and-jev.md).

## What the independent results actually support

### Tutoring

Scale's live TutorBench table showed:

| Exact displayed entry | Score and reported interval |
|---|---:|
| Muse Spark | 68.55 ±0.95 |
| gpt-5.4-pro-2026-03-05 | 56.62 ±1.02 |
| gemini-2.5-pro-preview-06-05 | 55.65 ±1.11 |
| claude-opus-4-6-thinking-max | 53.68 ±1.02 |

It measures explanations, feedback and hints across 1,490 STEM prompts, including images; automated
grading uses a Claude-4-Sonnet judge validated against a human-rated sample. The fetched table did
**not** contain Opus 5.5 or Astra. Its older prose still calls Gemini the winner, conflicting with the
updated table; use the dated table, not that prose. These results justify including Muse Spark in the
tutoring shortlist. They do not establish child/Spanish usability, voice quality, or actual learning
gains. Do not transfer a score from “Muse Spark” to a newer variant automatically.
[Benchmark author's results and method](https://labs.scale.com/leaderboard/tutorbench).

[MathTutorBench](https://aclanthology.org/2025.emnlp-main.11/) offers a separate tutoring evaluation
and reports that solving skill does not automatically yield good teaching, especially in longer
dialogues. Use its task/rubric structure as complementary evidence; this review did not obtain a
current Opus 5.5/Astra ranking from it. The
[MRBench V2 measurement study](https://proceedings.mlr.press/v339/sharma26a.html) finds limitations
in some dimensions and cross-model measurement equivalence. A tutoring leaderboard is evidence
to interrogate, not a universal educator score.

### General reasoning and development work

Artificial Analysis's **matched High-effort comparison** showed:

| Metric | Opus 5.5 (High, Default Fallback) | GPT-6 Astra (High) |
|---|---:|---:|
| Intelligence Index v4.3.2 | 54 | 51 |
| Terminal-Bench 4.0 | 57% | 54% |
| AutomationBench-AA | 63% | 67% |

Opus leads the displayed aggregate and terminal task metric; Astra leads the displayed automation
metric. This contradicts choosing Astra merely because it is described as a flagship. The exact
effort/fallback/harness labels matter; do not mix these with Max-effort scores or infer statistical
significance from unreported intervals. These are not tutoring measurements.
[Independent comparison](https://artificialanalysis.ai/models/comparisons/claude-opus-5-5-high-vs-gpt-6-astra-high).

[Scale SWE-Bench Pro](https://labs.scale.com/leaderboard/swe_bench_pro) is another development
benchmark to consult, but the fetched table lacks the newest Opus 5.5/Astra pair. Mark this comparison
unavailable rather than copying vendor numbers into an “independent” column. Coding-agent results
also depend on the harness, tools, task language and attempt budget.

**Development-agent selection:** Opus 5.5 is a justified first coding candidate from this evidence;
it has not won a Tutornat bake-off. Compare it with available Codex candidates on six isolated repo
tasks: evidence regression, authorization route, controlled widget, cancellation race, EN/ES UI and
data migration. Same base, instructions, tools and time allowance; score hidden regression checks,
new regressions, diff scope, reviewer findings and total completion time. Do not use those scores to
choose the learner-facing tutor. Do not reroute the developer's live tools just to record this plan.

### Live conversation

Artificial Analysis's speech-agent arena showed these configured systems:

| Entry | Preference Elo (95% interval shorthand) | Task success |
|---|---:|---:|
| Gemini 3.8 Live | 1083 ±30 | 93.2% |
| GPT-Live-1 (Sol, low) | 1053 ±27 | 90.9% |
| GPT-Live-1 (Astra, medium) | 1048 ±28 | 87.4% |

The preference intervals overlap. These are live service tasks, not tutoring. They support putting
Gemini 3.8 Live in the first audition and show why a more expensive backend cannot be assumed to
improve conversation. Preserve exact backend/effort configurations; “Sol” is the benchmark's label,
not proof of the current Sol 6.1 API version.
[Arena results and system descriptions](https://artificialanalysis.ai/speech-to-speech/arena).

[AudioMultiChallenge](https://labs.scale.com/leaderboard/audiomc) complements preference testing:
human speech with corrections, interruptions and noise tests multi-turn context handling. Its
fixed-context final-response scoring does not measure our live interruption or end-to-end latency.
Replay its permitted task patterns alongside our own real-device tests; do not combine unlike
metrics into one unexplained “voice intelligence” number.

### Speech output

The native-voice TTS arena showed Eleven v4 Turbo at **1334 ±19**, and Eleven v4 at **1322 ±18**.
The overlapping intervals do not prove Turbo's voice is superior. Native voices influence this
comparison. Both deserve the quality audition; Flash v2.5 stays a control, not the presumed best.
[Native-voice arena](https://artificialanalysis.ai/text-to-speech/leaderboard/provider-voice).
Also consult the [controlled-voice arena](https://artificialanalysis.ai/text-to-speech/leaderboard/controlled-voice)
to distinguish model quality from a favored voice. These English US/UK comparisons do not establish
Spanish speech, children's recognition, mathematical pronunciation or teaching outcomes.

### Visual tool use, Jev and longitudinal behavior

[VisualToolBench](https://labs.scale.com/leaderboard/vtb) evaluates reasoning with image-manipulation
tools. It is a useful capability screen, but its tools differ from Tutornat's semantic objects.
Our required test is “the learner changed this exact diagram; the tutor now understands and points
to the right part,” with stale/hidden-target tests alongside visual explanation accuracy.

No independent educational calibration evidence for Jev was established in this review. Its typed
interface is a useful engineering capability, not a demonstrated advantage on our routing/relevance
tasks. T10 must compare it against deterministic routing and structured generation on identical
held-out labels, including abstention, latency and errors by locale.

[EduClaw-Bench](https://arxiv.org/abs/2608.03206) is a useful long-horizon evaluation lead, explicitly
using simulated learners. Its findings concern model-plus-harness behavior. Simulated learning gains
must not become claims of gains in real children. Our eventual evidence includes actual delayed and
transfer performance, with the product's help conditions recorded.

## Resulting shortlist and decision rule

1. **Teacher:** include the tutoring-benchmark leader Muse Spark (exact version/access to resolve),
   Opus 5.5 and Astra. Keep the existing Sonnet control and Sol 6.1 as a latency/quality comparator.
   An inaccessible benchmark leader stays an explicit evidence gap; it is not silently replaced by
   a newer model with an inherited score. Google variants can enter if fresh tutoring evidence or
   our same-task results justify them. Do not restrict the shortlist to the coding-agent vendors.
2. **Voice architecture:** compare Gemini 3.8 Live, GPT-Live with a recorded backend, and a cascade
   using the best passing teacher plus Eleven v4/Turbo. Recognition is evaluated separately; a
   TTS win says nothing about hearing child speech. Native audio must pass the same authority/tools.
3. **Reasoning/preparation and development:** use the matching benchmark/task results for those
   roles. Strong coding, strong explanations and strong lesson construction are separate claims.
4. **Jev:** keep its two initial jobs only if it improves measured routing or review coverage without
   unacceptable false positives/delay; the user asked for integration, not authority over all decisions.

Before selection, freeze model/effort/harness/data versions and test cases. On the 45 existing tutor
conversations plus 60 new integrated cases, run three independent repeats per candidate. Reserve
the new cases as hold-out before prompt tuning. Evaluate critical integrity failures separately
from quality; any such failure blocks adoption until fixed and retested on fresh cases.

For finalists, blind and randomize at least 60 paired conversations across subject, EN/ES, age/support
and difficulty. Have two reviewers score correctness, relevance, usable explanation, agency and
depth, resolving material disagreement against sources/code. Compute paired win rates and confidence
intervals clustered by conversation; don't count every rubric or turn as an independent learner.
Report each stratum and failure category. Where uncertainty overlaps, say the result is inconclusive
and gather the cases needed to resolve it, rather than calling a tiny lead “best.”

Cost is reported, not the quality objective. End-to-end responsiveness and learner control are part
of quality. Public scores shortlist models; passing Tutornat's held-out evaluation selects the initial
deployment; observed human use and delayed learning evidence determine whether that selection helped.

Recheck source dates and methodology before running; archive a compact score manifest with URLs and
access time, not full copyrighted pages. Retain negative results. Re-evaluate changes in model aliases,
prompts, content or harness on untouched regression/hold-out material. Vendor documentation is used
for API compatibility, pricing and data terms only—not as evidence of comparative teaching quality.
