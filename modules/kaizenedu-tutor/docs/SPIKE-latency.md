# spike-05 — voice latency

**Status: the model hop is measured; TTS and ASR are not.** `api.openai.com` and ElevenLabs are blocked from this sandbox and `api.anthropic.com` has no credit, so no TTS or ASR round trip has ever run here. Gemini is reachable, and the sections dated 2026-09-05 below are real measurements against it. The harness prints the full table the moment a keyed server is pointed at it. No number in this file is an estimate; every unmeasured cell says so.

Budget (spec §5.3, `kaizen.config.ts` `LATENCY`): end of learner speech → first tutor audio **≤ 1,500 ms p50 / 3,000 ms p90**; barge-in stop ≤ 300 ms; whiteboard action within 2,000 ms of the sentence that references it. Go/no-go (spec §12): if p50 is above 2,500 ms after tuning, cut whiteboard-per-turn and shorten turns before anything else.

## What the harness measures

`scripts/latency-harness.ts` (`pnpm latency`) drives a six-turn scripted fractions conversation over plain HTTP against a running server and reports p50/p90/max per hop:

| Hop | What it times | In the budget? |
| --- | --- | --- |
| `learner_synth` | TTS of the learner's line, to obtain realistic audio for ASR | no |
| `asr` | `POST /api/transcription` round trip | yes |
| `llm_ttft` | `POST /api/chat` to the first `text_delta` | (subsumed) |
| `llm_first_sent` | `POST /api/chat` to the first complete sentence | yes |
| `llm_total` | `POST /api/chat` to `done` | no |
| `tts_first` | TTS of that first sentence | yes |
| `turn_to_audio` | product mode: the turn request going out → the first sentence's audio in hand, with TTS fired at the `sentence` frame while the model kept streaming | yes |
| `first_audio` | `asr + llm_first_sent + tts_first` (a sum, so an upper bound) | the §5.3 figure, serial |
| `first_audio_pipelined` | `asr + turn_to_audio` | **the §5.3 figure for the loop the client actually runs** |
| `wb_first_action` | first whiteboard `action` event after the first text delta | R2 |
| `wb_action_to_sentence` | product mode: the longest wait in a turn from a whiteboard `action` frame to the `sentence` frame it sits in, the words the tag was placed beside; the drawing is on the board the moment its frame arrives and that sentence's audio is requested at its frame, so this is how far ahead of its words a drawing lands | R2, `LATENCY.whiteboardActionAfterSentenceMs` (2,000 ms at p90; `--assert-budget` judges it) |

`first_audio` adds three hops that were measured one after another; `first_audio_pipelined` observes the overlap the playback queue really performs. On a mock they agree, which is the point — a divergence on a real server means the overlap is not paying (connection contention, a cold TTS route), and that is worth knowing. `--assert-budget` judges the pipelined figure whenever the run produced one.

`pnpm latency --product --mock` proves the product harness, including the overlapped TTS, without a server (`docs/metrics/latency-mock-product-proof.json`). The run of 2026-09-06 (`--turns 6 --assert-budget`, exit 0), whose fake closes a drawing after the second word of the first sentence:

```
hop                    n    p50    p90    max   budget
learner_synth           6    303    306    306
asr                     6    253    254    254
llm_ttft                6    402    403    403
llm_first_sent          6    629    634    634
llm_total               6   1310   1320   1320
tts_first               6    302    304    304
turn_to_audio           6    931    938    938
first_audio             6   1183   1192   1192   1500/3000
first_audio_pipelined   6   1184   1192   1192   1500/3000
wb_first_action         6     50     53     53   2000
wb_action_to_sentence   6    177    178    178   2000
```

These are the fake's delays; the real `wb_action_to_sentence` needs the keyed run in `docs/DO-THIS-NEXT.md` item 10 and is the step-3 exit measurement in `docs/MVP-REFERENCE.md` §7.

It is the API floor: a device adds VAD end-of-speech detection (600 ms — `VAD_END_OF_SPEECH_LAG_MS` in `lib/tutor/voice/vad.ts`, the silence both detectors wait through before calling an utterance finished), network from the phone, and audio decode plus play start. The turn controller subtracts that 600 ms back off its `eosAt` so the client-side figure is measured from the end of speech, as spec §5.3 defines it, and not from the moment the detector noticed. The device figure comes from `performance.mark` timings in the turn controller (voice-16) during the manual R1 pass on a physical iPhone; that is the second table.

The harness never imports a model SDK and carries no keys. The server's routed model (`MODEL_ROUTES["chat-adapter"]` or `DEFAULT_MODEL`) and its server-configured TTS and ASR providers do the work.

## Proof that the harness works (mock, not a measurement)

`pnpm latency --mock` runs the same code against a fake that imitates the three routes' wire shapes with fixed delays (`MOCK_ASR_MS=250`, `MOCK_LLM_TTFT_MS=400`, `MOCK_LLM_DELTA_MS=25`, `MOCK_TTS_MS=300`). Output on 2026-09-04, saved as `docs/metrics/latency-mock-proof.json`:

```
hop              n    p50    p90    max   budget
learner_synth     6    304    366    366
asr               6    253    258    258
llm_ttft          6    402    404    404
llm_first_sent    6    606    607    607
llm_total         6   1313   1317   1317
tts_first         6    304    304    304
first_audio       6   1163   1169   1169   1500/3000
wb_first_action   6    152    154    154   2000
```

These numbers are the fake's configured delays plus harness overhead. They say nothing about any provider.

## The table to fill

Run once per combination, six turns each, on the staging deployment (`LATENCY_BASE_URL`, `LATENCY_ACCESS_CODE`), then paste the summary rows here and commit the JSON under `docs/metrics/`.

### API floor (harness)

| TTS | ASR | live-turn model | asr p50/p90 | llm_first_sent p50/p90 | tts_first p50/p90 | first_audio p50/p90 | wb_first_action p50 | JSON |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| openai-tts | openai-whisper (`gpt-4o-mini-transcribe`) | fast model A | unmeasured | unmeasured | unmeasured | unmeasured | unmeasured | — |
| openai-tts | openai-whisper | fast model B | unmeasured | unmeasured | unmeasured | unmeasured | unmeasured | — |
| elevenlabs-tts | openai-whisper | best of the two above | unmeasured | unmeasured | unmeasured | unmeasured | unmeasured | — |
| openai-tts | azure-asr | best of the two above | unmeasured | unmeasured | unmeasured | unmeasured | unmeasured | — |
| minimax-tts or doubao-tts (streaming candidates) | openai-whisper | best of the two above | unmeasured | unmeasured | unmeasured | unmeasured | unmeasured | — |

"Fast model A/B" are the two live-turn candidates from spec §8.4 (a Gemini Flash-class and a Claude Haiku-class model) set through `MODEL_ROUTES='{"chat-adapter":"<provider:model>"}'`. Add rows for anything else spike-05 tries; never delete a measured row.

### Device (manual R1 pass, `performance.mark` in the turn controller)

| Device | Network | end-of-speech → first audio p50/p90 (10 turns) | barge-in stop p90 | notes |
| --- | --- | --- | --- | --- |
| desktop Chrome | wired/wifi | unmeasured | unmeasured | |
| physical iPhone, Safari | wifi | unmeasured | unmeasured | AudioContext unlock, PTT default |
| physical iPhone, Safari | LTE | unmeasured | unmeasured | |
| mid-range Android, Chrome | wifi | unmeasured | unmeasured | |

## How to run it

```bash
# staging with ACCESS_CODE set, server-configured TTS/ASR and a routed model
LATENCY_BASE_URL=https://<staging-host> \
LATENCY_ACCESS_CODE=<code> \
LATENCY_TTS_PROVIDER=openai-tts LATENCY_TTS_VOICE=alloy \
LATENCY_ASR_PROVIDER=openai-whisper \
pnpm latency --turns 6 --out docs/metrics/latency-$(date +%F)-openai-whisper-flashA.json

# local dev with keys in .env.local
TUTOR_MODE=1 pnpm dev &
LATENCY_TTS_PROVIDER=openai-tts LATENCY_ASR_PROVIDER=openai-whisper pnpm latency

# fail the run when the budget is missed (for a PR check once the loop exists)
pnpm latency --assert-budget
```

From inside a sandbox that proxies HTTPS, Node's fetch ignores `HTTPS_PROXY` unless `NODE_USE_ENV_PROXY=1` is set.

## What the code says before any measurement

From `docs/ARCHITECTURE-MAP.md` §3: today's client path cannot meet the budget regardless of provider, because five hops are unbounded or deliberately slow (click-to-stop recording, a human pressing Send, the 30 ms-per-character reveal, TTS requested only at turn end plus a 1,200 ms dwell, and base64 whole-utterance audio). The harness removes those by construction, so the measured floor is the provider floor. The client work that keeps the floor is voice-16 (sentence-level streaming TTS with a Web Audio queue), voice-17 (VAD and barge-in), and tutor-08 (non-blocking whiteboard actions).

Provider facts that shape which combos to try first (from the audio map, verified in code):

- Every upstream TTS provider is buffered today; OpenAI (`lib/audio/tts-providers.ts:303`) and Doubao (`:1058`, frames already chunked) are the cheapest to make streaming; MiniMax has SSE streaming that upstream turns off (`:856`); ElevenLabs has `/stream` and `/with-timestamps` endpoints upstream does not call, and it is the only candidate that can return word timing for visemes (R31).
- No upstream ASR path streams. OpenAI transcription runs through the AI SDK (`asr-providers.ts:385`); Azure uses the batch "fast transcription" REST API (`:523`), so real-time Azure needs the Speech SDK websocket, which is new code. Browser-native ASR does not exist on iOS Safari.
- The default recorder sends whole `webm` clips with no timeslice and no echo cancellation (`lib/hooks/use-audio-recorder.ts:223, 254`); barge-in over a speaker will self-trigger until that changes.

## Recommendation (what to measure first, not a result)

Measure the first row first: `openai-tts` + `openai-whisper` (`gpt-4o-mini-transcribe`) + the fast live-turn model, because all three already exist in the engine and the streaming change to the TTS route is one edit. If `first_audio` p50 lands under 1,500 ms there, ship that and revisit voice quality with ElevenLabs as the alternative preset. If ASR dominates the floor, the next row is Azure real-time (new code, streaming partials). If `llm_first_sent` dominates, shorten the system prompt (the upstream agent prompt carries a 361-line whiteboard reference) before switching models. Record the go/no-go in `docs/DECISIONS.md` with the JSON file name.

## Measured on 2026-09-04 (LLM hops only, from the build sandbox)

The egress policy in the build environment blocks `api.openai.com` and `api.elevenlabs.io`, so the TTS and ASR rows still cannot be run here. The LLM hops were measured through the upstream chat route against `google:gemini-3.5-flash` on a local dev server (`pnpm latency --llm-only`, raw JSON in `docs/metrics/latency-llm-only-2026-09-04.json`).

| Hop | n | p50 | Note |
| --- | --- | --- | --- |
| `llm_ttft` | 1 | 2,714 ms | first `text_delta` through upstream's LangGraph chat route, cold |
| `llm_first_sent` | 1 | 2,876 ms | first complete sentence |
| `llm_total` | 1 | 4,095 ms | stream done |
| `asr`, `tts_first`, `first_audio` | 0 | not measured | provider hosts blocked from this sandbox |

One sample only: five of six turns failed on a `fetch failed` from the shared dev server under load, so treat this as an order-of-magnitude reading, not a percentile. It is measured through the **upstream** route, which carries the LangGraph director and the agent-loading hop the product turn route will not have; the product number will differ. `pnpm latency --product` now exists for exactly that measurement and needs a server with `DATABASE_URL` and the tutor routes, which Manny can run once a Neon project exists.

The headline finding stands: the first-token time alone is already above the 1,500 ms p50 budget for first audio on this path, which is why the product turn route streams sentences and starts TTS on the first sentence boundary rather than at turn end.

## Measured on 2026-09-05 (the model hop, direct to the provider)

The 2026-09-04 reading above went through **upstream's** `/api/chat`, which does not pass a thinking config, so the model reasoned before answering. That is not what the product turn does. These runs go straight to the Gemini API — no Next server, no LangGraph — so they isolate the model hop itself. Eight samples per arm, one connection warmed first, same system prompt and same learner line. Raw JSON: `docs/metrics/latency-ttft-arms-2026-09-05.json`.

Absolute values carry this sandbox's HTTPS proxy and a free-tier key; the **differences between arms** are the finding.

| Arm | prompt tokens | thought tokens | ttft p50 / p90 | first sentence p50 / p90 | first sentence chars p50 / p90 |
| --- | --- | --- | --- | --- | --- |
| A — provider default (reasoning on) | 118 | 286 | **2,099 / 2,415** | 2,099 / 2,415 | 55 / 63 |
| B — `thinkingConfig.thinkingBudget: 0` | 118 | 0 | **672 / 761** | 763 / 874 | 93 / 110 |
| C — `thinkingConfig.thinkingLevel: 'minimal'` | 118 | 0 | 674 / 790 | 774 / 915 | 81 / 118 |
| D — C plus the opening-sentence rule | 171 | 0 | 660 / 1,732 | 781 / 1,856 | **30 / 52** |
| E — C plus a 12,000-character system prompt | 2,453 | 0 | 603 / 674 | 755 / 799 | 46 / 63 |

Three things follow.

**1. Reasoning off is worth 1,425 ms of first-token time (A → C, p50).** More than the entire 1,500 ms budget. The product already asks for it: `thinkingFor` returns `{mode:'disabled'}` for `tutor-live-turn`, and `lib/ai/llm.ts` translates that into `thinkingLevel: 'minimal'` for Gemini 3.x, `thinkingBudget: 0` for 2.x, `thinking:{type:'disabled'}` for Anthropic and `reasoningEffort` for OpenAI — the mapping comes from `applyModelMetadata` in `lib/ai/model-metadata.ts`, not from the model list in `providers.ts`, which carries no `requestAdapter` of its own. A model routed to `tutor-live-turn` whose catalog entry has no thinking capability would silently lose all of this and put a second and a half back on every turn, so `tests/tutor/latency.test.ts` now asserts the translation for every plausible live-turn model. **Do not route `tutor-live-turn` to a model that fails that test.**

**2. The opening-sentence rule halves the first TTS payload for free (C → D).** The first sentence went from 81 to 30 characters at the median and 118 to 52 at p90, with no change in how quickly the model produced it (774 → 781 ms p50, inside the noise). Since TTS is billed and timed per character, that is the cheapest lever on the path — but it is a lever on the **TTS** hop, which still cannot be measured here. D's p90 of 1,732 ms is one slow sample out of eight on a shared free-tier key, not a systematic cost. The rule lives in `buildTurnInstructions` (`lib/tutor/prompts/build.ts`, `OPENING_SENTENCE_RULE`).

**3. Prompt size is not a latency lever on this provider (C → E).** Twenty times the input — 118 to 2,453 tokens — moved time-to-first-token by −71 ms, which is to say not at all. The live turn's real system prompt is about 15,800 characters (≈3,900 tokens), squarely inside the range tested. **Trimming the tutor prompt or caching its static prefix is a cost optimisation, not a latency one**, and should be argued on the cost budget (§8.6) rather than on §5.3.

### Round-trip depth on our own code (measured, no provider involved)

Every hop on the first-audio path reads the database before it can call a provider, and those reads were serial. `tests/tutor/latency.test.ts` and `tests/tutor/latency-turn.test.ts` wrap the product database so each query takes a known, fixed time and count how many round trips deep the work is. Measured on 2026-09-05, before and after making the independent reads concurrent:

| Path | round trips before | after | at a 30 ms database round trip |
| --- | --- | --- | --- |
| `POST /api/tutor/tts`, whole request | 7 | 4 | 236 ms → 137 ms |
| `POST /api/tutor/asr`, whole request | 7 | 4 | 232 ms → 143 ms |
| `startTurn` → the first `sentence` frame | 6 | 3 | (at 25 ms) 150 ms → 75 ms |

One ASR and one TTS call sit on every voice turn, so at a 30 ms round trip that is about **190 ms off first audio**, plus **75 ms** inside the turn, before the provider is even reached. The figure scales with the database's real round-trip time: a Neon instance in another region costs proportionally more, one in the same region proportionally less.

Two of the four remaining round trips on a media route belong to `requirePrincipal`, which reads the auth session and then the learner it names. They are genuinely dependent, but one `JOIN` would collapse them — the next round trip worth removing, in `lib/tutor/auth/`.

### What is still unmeasured, and why

- **`asr`, `tts_first`, `first_audio`, `first_audio_pipelined` against real providers.** `api.openai.com` and `api.elevenlabs.io` are blocked from this sandbox and `api.anthropic.com` has no credit. Nothing in this document claims a number for them.
- **The end-of-speech → first-audio figure on a device.** Needs a physical phone.
- **The value of the connection warm-up** (`TUTOR_WARM_CONNECTION=1`, off by default). A HEAD request to a blocked provider host hung past its own `AbortController` here, so it ships opt-in until someone can time a handshake that completes.

### One command for the full picture

On a server with `TUTOR_MODE=1`, `DATABASE_URL`, a routed live-turn model and server-configured TTS and ASR:

```bash
LATENCY_BASE_URL=https://<staging-host> LATENCY_ACCESS_CODE=<code> \
  pnpm latency --product --turns 10 --assert-budget \
  --out docs/metrics/latency-$(date +%F)-product.json
```

That fills `asr`, `llm_ttft`, `llm_first_sent`, `tts_first`, `turn_to_audio`, `first_audio`, `first_audio_pipelined` and `wb_first_action` in one run, exits non-zero if `first_audio_pipelined` misses 1,500/3,000, and writes every sample to the JSON. Add `NODE_USE_ENV_PROXY=1` when the machine proxies HTTPS.

## Correction, 2026-09-05: the headline number measured the wrong path

The 2,714 ms first-token figure above was taken through **upstream's `/api/chat`**, which carries the LangGraph director and an agent-loading hop, and which sends no thinking configuration. It was then repeated as though it described the product's live turn. It does not.

Measured directly against Gemini, 8 samples per arm (`docs/metrics/latency-ttft-arms-2026-09-05.json`):

| Arm | TTFT p50 | TTFT p90 | First sentence, chars p50 |
| --- | --- | --- | --- |
| Reasoning on (provider default) | 2,099 ms | 2,415 ms | 55 |
| Reasoning off (`thinkingLevel: 'minimal'`) | 674 ms | 790 ms | 81 |
| Reasoning off + short-opening rule | 660 ms | 1,732 ms | **30** |
| Reasoning off + a 12k-char system prompt | 603 ms | 674 ms | 46 |

Three things follow. The product path already disables reasoning, so it was never paying the 1,425 ms that number implied. A larger system prompt did not cost measurable time (−71 ms across a 20× increase), so prompt size is a **cost** lever here, not a latency one. And the opening-sentence rule roughly halves the first sentence the synthesiser has to render, which is the part that sits on the critical path twice.

Absolute values carry this sandbox's proxy and a free-tier key, so treat the differences as the finding rather than the levels. The TTS and ASR hops remain unmeasured: both providers are blocked from here.

