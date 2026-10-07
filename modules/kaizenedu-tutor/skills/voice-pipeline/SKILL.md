---
name: voice-pipeline
description: The learner-to-tutor audio path — VAD and push-to-talk capture, streaming ASR, sentence-level streaming TTS, the cancellable Web Audio playback queue, barge-in, iOS Safari unlock, the latency budget, and the no-audio-persistence invariant. Load it when you touch anything under lib/tutor/voice, lib/audio, lib/hooks/use-audio-recorder.ts, lib/hooks/use-discussion-tts.ts, app/api/transcription, app/api/generate/tts, when you run or change scripts/latency-harness.ts, or when a change could affect time-to-first-audio or barge-in.
---

# Voice pipeline

Budget (spec §5.3; `kaizen.config.ts` `LATENCY`): end of learner speech → first tutor audio ≤ 1.5 s p50 / 3.0 s p90; barge-in stops playback ≤ 300 ms and cancels queued TTS; a whiteboard action referenced by a sentence appears within 2 s of that sentence starting. Audio is never persisted: it streams to transcription and is discarded; only the transcript is stored; no voice identification or biometrics, ever (spec §5.3, §8.5). `tests/invariants/no-audio-persistence.test.ts` enforces it; `lib/tutor/voice/**` is inside its scan.

## What upstream gives us (verified in code, `docs/ARCHITECTURE-MAP.md` §2.3)

- No voice turn exists. The mic is a text helper (`components/audio/speech-button.tsx`, click to start, click to stop, transcript pasted into a textarea). Nothing on the audio path is timed.
- `generateTTS(config, text) → {audio: Uint8Array, format}` (`lib/audio/tts-providers.ts:111`) and `transcribeAudio(config, Buffer | Blob) → {text}` (`lib/audio/asr-providers.ts:157`) are whole-clip contracts across nine TTS and six ASR providers. No provider returns word timing.
- `/api/generate/tts` returns base64 JSON (`route.ts:155`); `/api/transcription` forwards the `FormData` clip and never writes it.
- `lib/hooks/use-discussion-tts.ts` is a correct turn-level playback queue; its `cleanup()` (`:406-421`) aborts the in-flight fetch, stops the element, and drops the backlog. `lib/audio/tts-utils.ts:21` splits sentences. `lib/audio/audio-duration.ts` reads WAV/MP3 duration.
- The recorder uses `MediaRecorder` with no `timeslice` and `getUserMedia({audio: true})` with no echo cancellation (`lib/hooks/use-audio-recorder.ts:223, 254`). Browser-native ASR is the default and does not exist on iOS Safari.
- The reveal is paced at 30 ms per character (`lib/buffer/stream-buffer.ts:208-209`), TTS is requested only at segment end, and non-lecture sessions add a 1,200 ms dwell (`components/chat/use-chat-sessions.ts:906`).

## Design (voice-16, voice-17, voice-18, voice-19)

Modules under `lib/tutor/voice/`:

| Module | Job |
| --- | --- |
| `audio-context.ts` | One `AudioContext` created inside a user gesture; `unlock()` plays a one-sample silent buffer; `ensureRunning()` awaits `resume()` when state is not `running`. This is the whole iOS story. |
| `capture.ts` | `getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })`, keep the stream open for the session, expose it to VAD; PTT on `pointerdown`/`pointerup` (default on mobile), hands-free VAD on desktop. |
| `vad.ts` | `@ricky0123/vad-web` `MicVAD` over the shared stream; `onSpeechStart` → `interrupt('user_speech')`; `onSpeechEnd(Float32Array @16 kHz)` → encode WAV → ASR. Ship the ONNX and WASM assets from our origin; `docs/TOOLING.md` has the option names. |
| `asr-client.ts` | Streaming when the chosen provider supports partial results (websocket sibling route), else the existing multipart route with the clip chunked at 250 ms. Auto-submits the final transcript to the turn; no human Send. |
| `sentence-splitter.ts` | Incremental splitter over LLM deltas; emits at `[.!?]` followed by space or end, or after ~80 characters so the first chunk goes out fast. Reuse the regexes from `tts-utils.ts:26, 52`. |
| `tts-client.ts` | Requests the streaming TTS route per sentence; reads `response.body`; carries the `AbortController` that `interrupt()` fires. |
| `playback-queue.ts` | Web Audio queue: decode → `AudioBufferSourceNode` → gain → destination, scheduled gaplessly; `stop({fadeMs: 20})` ramps gain to 0 and stops the source: the ≤ 300 ms barge-in primitive at ~20 ms real cost. Exposes amplitude for the avatar mouth. |
| `turn-controller.ts` | `idle → listening → thinking → speaking → (barge-in) → listening`; `performance.mark` on every transition; text fallback when the mic is denied or audio errors (voice-18). |

Server patches (with `// KAIZEN:` comments): `app/api/generate/tts/route.ts` returns `Response(stream)` with `audio/*` instead of base64; `lib/audio/tts-providers.ts` gains `generateTTSStream` (OpenAI: return `response.body` at `:303`; Doubao: chunked reader over the frames at `:1058`; others wrapped as a single chunk); `app/api/transcription/route.ts` records ASR seconds in the usage ledger and drops client credentials; `stream-buffer.ts` seals at sentence boundaries and pacing is off in voice mode.

## Rules

1. Measure before and after. `pnpm latency` on staging (`docs/SPIKE-latency.md`) for any change on the turn path; paste p50/p90 in the PR. `pnpm latency --mock` proves the harness, not the loop.
2. Never buffer a whole utterance before playing. Never decode through `new Audio(dataUrl)`.
3. Never write, log, or upload audio bytes anywhere but the ASR provider request. No audio column, no object storage key, no Sentry breadcrumb with samples.
4. Barge-in sets the phase before stopping audio (`lib/playback/engine.ts:459-467` explains why) and bumps a generation token so late continuations cannot write.
5. Text always works: mic denied, `AudioContext` blocked, audio error, or reconnection all fall back to typing without losing the turn.
6. Test on a physical iPhone in Safari before claiming any voice change works.

## Provider notes for spike-05

OpenAI TTS streams over chunked HTTP; ElevenLabs has `/stream` and `/with-timestamps` (the only candidate that returns word timing, R31); MiniMax streams over SSE but upstream sets `stream: false`; Doubao is already chunked; Azure REST is buffered and its viseme events need the Speech SDK. OpenAI transcription is batch through the AI SDK; Azure real-time needs the Speech SDK websocket (new code); browser-native ASR is unavailable on iOS.
