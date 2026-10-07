# Latency checklist for a voice-path PR

1. `pnpm latency --base-url <staging> --turns 6 --out docs/metrics/latency-<date>-<combo>.json` before and after. Paste the `first_audio` and `wb_first_action` rows.
2. `performance.mark` names in the turn controller: `speech_end`, `asr_result`, `llm_first_delta`, `llm_first_sentence`, `tts_first_chunk`, `audio_start`, `barge_in`, `audio_stopped`. Report `audio_start - speech_end` p50/p90 over 10 turns on desktop Chrome and a physical iPhone.
3. Barge-in: scripted test that speaks during playback and asserts `audio_stopped - barge_in ≤ 300 ms` and that no queued sentence plays afterwards.
4. `pnpm test:invariants` green (no-audio-persistence).
5. Mic denied → text path works; `AudioContext` suspended → unlock on first tap works; audio error mid-turn → transcript still shown and turn continues in text.
