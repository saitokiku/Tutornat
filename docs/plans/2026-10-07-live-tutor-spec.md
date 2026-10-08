# Live Tutor — build spec (voice that isn't uncanny, attention that moves with it)

> Synthesized 2026-10-07 from four critics' audits of the voice layer and the spotlight (uncanny, real-time, attention, child). Owner's bar: "make it not uncanny, should sounds real, and real time with moving attention using the glow / tutor cursor".

# KaizenEDU Live Tutor: build spec for voice, spotlight wiring and the tutor cursor

**Owner's bar (verbatim):** "if youre using voice make it not uncanny, should sounds real, and real time with moving attention using the glow / tutor cursor, and hopefully the stuff you made around it is not trash".

**Also from the owner:**
- "give the ai ability to highlight any element on screen by making it glow to indicate direction and hints"
- "add voice so the tutor talks and listens naturally"
- "dont make anything look or sound or feel like AI slop"

Every decision below serves one of those lines. Section 8 checks each one.

> **Status, phase A (2026-10-07).** Library and server parts of P1 and all of P2 are built in
> `apps/web/src/lib/voice/**`, `practice/spoken.ts`, `lib/ai/{tutor,prompts,context}.ts`,
> `app/api/voice/metric` and `evals/voice-*`, against fakes; no screen is wired yet (phase B,
> steps in `apps/web/src/lib/voice/WIRING.md`). P0 is blocked on keys: the v4 Turbo dialogue
> socket, Flux's message shapes and the token-as-bearer handshake are built from this spec and
> unverified (§9 P0). Folded in from the models spec: turn latency is measured last word → first
> sound (the vendor's own time to first audio is one segment, never the total); the spoken precheck
> is a JudgmentResult whose abstain/unavailable never becomes a verdict; voice tokens are reserved
> against the daily ceiling and handed back when the vendor fails; minors always take the cascade
> (speech-to-text → safety screen → names out → one model call → text-to-speech).

**Where to work:** repo `/Users/man/Documents/GitHub/Tutornat`, app in `apps/web`. Branch from `foundation`.

---

## 0. Ground truth (checked against foundation HEAD e06a7a5 on 2026-10-07)

### 0.1 The audited commit is already merged

The critics audited fbf54bf. It is now on `foundation` as 476af25 and 8897671, plus five fixes: a2d9f1f, 19126c8, 0e26c1c, 1669b2a and e06a7a5.

**Already fixed on HEAD. Do not redo these:**
- **Name scrub:** "Will you try…" and "May I…" are kept. See `COMMON_NAMES` and `addressing()` in `speakable.ts`.
- **"A = l × w"** now reads "times".
- **Mic auto-off:** the mic turns itself off after 30 s with no speech, and when the page is hidden (`converse.ts`).
- **Held answers:** "yes / sí / ok" said during a tutor question is held, then delivered as the answer when the tutor finishes.
- **Echo matching:** echo is compared with the words actually played (boundary marks), with a 1 s tail.
- **Errors:** listening and speaking errors are separate (`inError` / `outError`).
- **Token routes** check Origin, a signed voice-pass cookie, per-IP budgets and a daily ceiling.
- **Copy:** the self-test says "picking up sound", and the browser disclosure names Google, Apple or Microsoft.

### 0.2 Still wrong on HEAD (probed today with the HEAD modules)

**`speakable`:**
- Leaves these as written: `-2`, `5/16`, `7/20`, `3:30`, `$2.50`, `1,250`, `2nd`, `√16`, `50%`, `→`, `e.g.`.
- `3 x 4 = 12` becomes "3 x 4 equals 12".
- Spanish leaves `Son las 3:30`, `0.5`, `5 x 3`, `1.250` and `3,5` as written.
- `2 1/2` becomes "2 one half".

**Turn-taking:**
- `shapeOf("It's.")` and `shapeOf("I think it's.")` both return `"done"`.
- With `TURN_YOUNG`, an UtteranceEnd ends "I think it's." at once.

**Backchannels and echo:**
- "uh huh" and "a ha" are not treated as backchannels, so they interrupt the tutor.
- `echoVerdict("The bottom number.", "Is it the top number or the bottom number?")` returns `"echo"`, so a correct answer is thrown away.

**Chunker:**
- It cuts a long first sentence at a comma, and past 220 characters at any space.
- It keeps "Let me check that.Your answer is close." as one sentence.

**`pickVoice`:**
- It ranks on-device voices first.
- On this Mac, Chrome gives Spanish learners "Eddy (Spanish (Spain))".
- Edge and Chrome on Windows pick the old SAPI David/Zira voices.

**`server.ts`:** `DEFAULT_VOICE = "JBFqnCBsd6RMkjVDRZzb"` is "George", a British narrator. It is also used for Spanish when `ELEVENLABS_VOICE_ID_ES` is unset.

**`elevenlabs.ts`:**
- Sends every sentence with `flush:true`.
- Has no GainNode, no prebuffer and no `outputLatency` correction.
- Counts words by space→non-space changes across chunks.
- On any failure, hands the rest of the reply to the browser voice mid-sentence.
- Falls back to the browser voice when audio is still locked.

**`select.ts`:** treats K–5 as "young" (rate 0.9, `TURN_YOUNG`), and offers hands-free with any browser voice.

**Audio contexts:**
- Each `useVoiceSession` mount builds its own `voice()` and its own AudioContext.
- `mic.ts` builds another one.

**Deepgram:**
- Every start creates a new token, socket, `getUserMedia` call and worklet; every stop sends CloseStream.
- Frames are about 43 ms.
- Confidence and word timestamps are ignored.

**Answer checking:** `practice/answer.ts` `parseNumber` reads digits only, and `practice/spoken.ts` does not exist.

### 0.3 Nothing is wired yet

- No screen imports `lib/voice`.
- `SpotlightLayer` is not mounted.
- No element has `data-spot`.
- `point_at` is not in `tutorTools`.
- `TutorChat` still uses `components/tutor/useVoice.ts`.

These files call `speechSynthesis` or `speakText` directly:
- `stage/useSpeech.ts`, `stage/hear.tsx`, `stage/Stage.tsx`
- `tutor/useVoice.ts`, `tutor/TutorChat.tsx`
- `practice/Runner.tsx`, `landing/Sheet.tsx`, `calendar/WeekView.tsx`, `shell/HearTabs.tsx`

About 84 more Hear/`speakText` call sites go through `hear.tsx`.

### 0.4 Precondition for Phase 3 onward

The open tutor branch must be on `foundation` first: `worktree-wf_a6840288-a70-24`, tip 5cffe4c. It contains `Board.tsx`, `cards.ts`, a rewrite of `TutorChat`, and changes to tools, tutor and prompts.

Phases 0–2 don't touch `TutorChat`. If that branch hasn't landed when you reach Phase 3, stop and report it as blocked. Do not fork `TutorChat`.

### 0.5 Reporting

Keep `docs/STATUS.md` current with four lists: done, in progress, left, and blocked on the owner. In the blocked list, keep "blocked on a key or a decision" separate from "not started".

---

## 1. Keep, change, replace

### 1.1 Keep (sound; extend, don't rewrite)

- **`types.ts` SpeechIn/SpeechOut contracts.** Screens stay vendor-agnostic. Add to them (§3.2); don't replace them.
- **`server.ts` gate and `token.ts`.** The cost and abuse gating is right. Change defaults only (§2.2).
- **The core of `chunk.ts`.** Abbreviations, decimals, list markers, closers. It splits only at whitespace, which keeps word indexes aligned and is the base of the sync contract.
- **The structure of `speakable.ts`.** The spoken-word→written-word map (`words[]`), markdown and LaTeX stripping, and the name scrub stay. Add a number speller (§1.2).
- **What `converse.ts` gets right:** held answers during questions, idle and hidden mic-off, and the `onEcho` "Did you say…?" path. Extend it with timestamps and ducking.
- **`turn.ts`.** The pure `stepTurn` and `turnTracker` design stays. Retune the numbers.
- **`mic.ts`.** Capture, resampler, levels and both self-tests stay.
- **`deepgram.ts`.** Buffering while the socket opens, and one reconnect, stay.
- **Spotlight engine:**
  - Ids, `SPOT_ID`, auto ids and the name scrub
  - `isShown` / `resolveSpot`, `guardSpots`, and clip/bar/seen-view geometry
  - `measure.ts` and `geometry.ts`
  - The edge chip, forced-colors styles and the `aria-describedby` handling
- **`spot-hints.ts`.** `hintSpot` and `answerSpots` stay.
- **Narration:** `useSpeech`'s "say it with me" turn gaps, and `narration.tsx`'s `Spoken` word highlight.

### 1.2 Change

**`elevenlabs.ts`:**
- Split it into a transport and a new `player.ts` (Web Audio scheduling, gain, alignment).
- Stop flushing each sentence.
- Never switch to the browser voice mid-reply.
- Retry once from the first unheard sentence.
- Add a first-audio deadline and a stall watchdog.
- Add a prebuffer, fades, `outputLatency` correction, and character-cursor alignment.

**`browser.ts`:** replace `pickVoice` with the tiered ranking in §4.

**`select.ts`:**
- Use three bands everywhere: `k2`, `35`, `69`.
- Allow conversation mode only with a vendor voice or a Tier A voice plus vendor speech-to-text.
- Build one voice for the whole app.

**`session.ts`:** becomes a `VoiceRoot` provider with one SpeechOut, one SpeechIn and one AudioContext per learner and locale. `useVoiceSession` reads from it.

**`server.ts`:**
- Delete `DEFAULT_VOICE`.
- Require `ELEVENLABS_VOICE_ID` and `ELEVENLABS_VOICE_ID_ES`. Report text-to-speech as unavailable without the first, and Spanish text-to-speech as unavailable without the second.
- Make the speech-to-text model default Flux.
- Set the Deepgram grant TTL to 60 s.

**`turn.ts`:**
- Use three bands.
- For K–5, ignore the full stop the recognizer adds.
- Drop the UtteranceEnd shortcut for K–5.
- Add an answer-aware early end.
- Add holding phrases.

**`deepgram.ts`:**
- Add a Flux v2 path.
- Send 80 ms frames.
- Read word timestamps and confidence.
- Prefetch the token.

**`converse.ts` and `bargein.ts`:**
- Duck first, then decide whether to stop.
- Detect echo from the mic's word timestamps, not from message arrival time.
- Switch the session to half duplex automatically after repeated echo.
- Truncate the tutor's message after a barge-in.

**`backchannel.ts`:** add "uh huh", "a ha", "mm hmm" and "mhm hm", plus the holding phrases.

**`chunk.ts`:**
- Never cut at a bare space.
- Limit the first-sentence cut in voice mode to clause marks.
- Turn the first cut off for whole-text narration.

**`speakable.ts`:** add a new `numbers.ts` speller for EN and ES (rules in §2.8).

**`lib/spotlight.ts`:**
- Add a pointing session (§3.4).
- Accept prefix guards (`a.b.*`).
- Add voice mode: no caption, no dim, one scroll per reply.

**`SpotlightLayer.tsx` and `styles.ts`:**
- Keep one persistent ring that tweens between targets and is never re-keyed per move.
- Add the `TutorCursor` dot.
- Add a rest state and breathing.

**`prompts.ts`:**
- Remove "Keep notation simple; say numbers the way you would say them aloud." from RULES.
- Remove "No symbols in what you say; say numbers as words a child hears." from `BAND.young`.
- Add the voice block and the anchor guide (§2.5, §3.1).

**`tutor.ts`:**
- Check spoken answers in code before the model call.
- Use a custom `stopWhen`.
- Cache the static half of the system prompt.

**`TutorChat.tsx`:**
- Fix how text parts are joined (§3.1).
- Wire voice through `useTutorVoice`.
- Mute the unheard rest of a reply after a barge-in.

**Stage:**
- `hear.tsx` `speakText`, `useSpeech.ts` and Runner read-aloud all go through the app SpeechOut.
- In `scenes.tsx`, remove the ad-hoc `ring-2 ring-accent/60` on `Figure`, and reserve the figcaption's space so nothing shifts.

### 1.3 Replace or delete

**Delete `components/tutor/useVoice.ts`.** It uses the first voice whose language matches, push-to-talk with `continuous=false`, and splits only on ". ".

**Delete `voiceFor`, `langFor` and `claimVoice` in `useSpeech.ts`.** The single SpeechOut owns audio: `speak()` cancels whatever was playing.

**Delete the `point_at` tool and `runSpotFromToolPart`.** Inline anchors replace them (§3.1).
- Every `point_at` ends a model step. On Anthropic, a `tool_use` ends generation, so each point costs another model call mid-reply: 0.6–1.2 s of silence.
- Its timing follows the text stream (1–4 s ahead of the audio), not the voice.
- Anchors cost zero calls and carry the exact word.
- Keep `TutorSpotContext` and `spotsPrompt`, rewritten as the anchor guide. Repurpose `SpotAgain` to replay a message's cues.

**Captions and "Got it" for tutor pointing.** The tutor no longer uses them. `spot()` and `spotSteps()` stay for non-tutor uses.

**The plan's §6 voice bar.** "First audio < 1.5 s after a reply starts" starts the clock after the slow parts. Replace it with the gates in §2.3.

**Documents to update when done:**
- The M6 table in `docs/plans/2026-10-07-kaizenedu-1.0-plan.md`
- `docs/spotlight.md`: anchors instead of `point_at`, the pointing session, and voice mode

---

## 2. The live loop

### 2.1 Pipeline

```
mic ─ micCapture (shared AudioContext, 80 ms frames, level)
    ─ SpeechIn: Flux v2 | Nova-3 | browser (tap only, half duplex)
    ─ converse (echo by time, duck→decide, held answers, addressee check)
    ─ conversation.ts (pure state machine) ─ useTutorVoice (React)
    ─ onTurn(text, {via:"voice", confidence, words})
  ─ POST /api/tutor (context.input="voice")
       server: safety screen → spoken precheck (practice/spoken.ts + check) → next vetted hint
               → ONE streamText (cached static prompt) → stop after board-only step
  ─ useChat parts ─ replyText(): strip [[spot:id]] → display text + cues; sentenceFeed
  ─ SpeechOut: ElevenLabs (v4 Turbo dialogue | Flash v2.5) | clip | browser Tier A
       player.ts: gain, prebuffer, fades, sentence pauses, alignment → word clock
       ├ onWordScheduled(word, audibleAt) → attention scheduler → pointing session → ring + TutorCursor
       └ onBoundary(word) → word highlight in the bubble / narration
```

**New pure modules** (all unit-tested):
- `lib/voice/audio.ts`: the shared AudioContext, unlock, `audioSession`, latency.
- `lib/voice/player.ts`
- `lib/voice/voices.ts`
- `lib/voice/numbers.ts`
- `lib/voice/cues.ts`
- `lib/voice/conversation.ts`
- `lib/attention.ts`
- `practice/spoken.ts`

### 2.2 Vendors and exact settings

#### Text-to-speech, primary: `eleven_v4_turbo` over the Text to Dialogue WebSocket

**Connection:**
`wss://api.elevenlabs.io/v1/text-to-dialogue/stream-input?model_id=eleven_v4_turbo&output_format=pcm_24000&sync_alignment=true&language_code=<en|es>&single_use_token=<tts_websocket token>`
Add `&enable_logging=false` when `ELEVENLABS_ZERO_RETENTION=1`.

**Messages:**
- **First message:** register exactly one voice (Turbo allows one per connection), with `voice_settings: { stability: 0.5 }`. Confirm the exact field names against the fixture recorded in P0.
- **Each complete sentence:** `{"inputs":[{"text":"<speakable> ","voice_id":V}]}`.
- **Only after the first sentence,** and only if it is under 40 characters or under 8 words (the server's buffering threshold): add `"flush": true`.
- **The reply's last sentence:** `{"inputs":[{"text":"…","voice_id":V,"new_turn":true}],"flush":true}`.

**Connection lifetime:**
- Use one socket per conversation, so prosody carries across turns.
- Send `{"keep_alive":true}` every 15 s while the conversation is open: in conversation mode, or less than 60 s since the last turn. Otherwise close it.
- On barge-in or cancel, send `close_socket`, drop any audio still arriving, and open the next socket at once with the spare token.

**Use this transport only if P0 shows all three:**
1. The single-use `tts_websocket` token opens this socket.
2. Median first audio is ≤ 350 ms after the first sentence is sent.
3. It wins the blind listen (§8).

Otherwise ship the fallback transport below. **No server relay:** Vercel functions can't hold a WebSocket.

#### Text-to-speech, fallback (exists today; fix it first): `eleven_flash_v2_5` over `/v1/text-to-speech/{voice}/stream-input`

**Connection:** `auto_mode=true&sync_alignment=true&output_format=pcm_24000&language_code=<locale>&inactivity_timeout=60`.

**First message:** `{text:" ", voice_settings:{stability:0.5, similarity_boost:0.75, style:0, use_speaker_boost:true, speed: k2 ? 0.94 : 1.0}}`.

**Sentences:** `{text:"<speakable> "}` with no flush; finish with `{text:""}`.

**Connection lifetime:** one socket per reply, opened at end of turn (EagerEndOfTurn or EndOfTurn) with the prefetched token, not at the first model token.

#### Voice selection

- Use one adult, warm, mid-pitch voice from the ElevenLabs "conversational" category. Not a narrator or storyteller.
- Prefer one native bilingual US-Latino voice for both locales. If none passes, use two voices matched on gender, age and pitch.
- **Audition:** 5 candidates, read through the 30-line EN/ES script (§7.5). Reject any voice whose accent shifts in Spanish. The owner picks.
- **Config:** `ELEVENLABS_VOICE_ID` and `ELEVENLABS_VOICE_ID_ES` are both required; they may hold the same id. There is no default.

**Pacing:**
- Speed: 1.0 everywhere. The only exception is K–2 on Flash, at 0.94. Never below 0.9.
- Pace comes from pauses, inserted by `player.ts` at sentence ends:

| Band | Pause after a sentence | Pause before a question |
|---|---|---|
| 6–9 | 120 ms | — |
| 3–5 | 250 ms | — |
| K–2 | 400 ms | +300 ms |

- **How the pause is inserted:** split the PCM buffer at the sample where the next sentence's first aligned character starts, and shift what follows. This works for both transports.

#### Pre-rendered clips (P5)

- **v4 setup:** `POST /v1/text-to-dialogue/with-timestamps` with `eleven_v4`.
- **Flash setup:** `POST /v1/text-to-speech/{voice}/with-timestamps` with `eleven_multilingual_v2`.
- Use the same voice id as live speech.

#### Speech-to-text, primary: Deepgram Flux at `wss://api.deepgram.com/v2/listen`

**Model:**
- English learners: `model=flux-general-en`.
- Spanish learners: `model=flux-general-multi` with `language_hint` es then en. Confirm the parameter format in P0.

**Parameters:** `encoding=linear16&sample_rate=16000`, plus the band settings below.

| | K–2 | 3–5 | 6–9 |
|---|---|---|---|
| `eot_threshold` | 0.8 | 0.75 | 0.7 |
| `eot_timeout_ms` | 4000 | 3000 | 2000 |
| `eager_eot_threshold` | off | 0.55 | 0.55 |

**Other settings:**
- Keyterms: lesson vocabulary only, at most 20, never names.
- Frames: 80 ms (1280 samples at 16 kHz). Flux recommends 80 ms.
- Token: `/v1/auth/grant` with `ttl_seconds: 60`. Prefetch it at session start and every 50 s. Pass it as Sec-WebSocket-Protocol `["bearer", token]`; P0 confirms v2 accepts this.
- In conversation mode, keep one socket for the whole window.

#### Speech-to-text, fallback: Nova-3 on `/v1/listen` (current adapter)

| Band | `endpointing` | `utterance_end_ms` |
|---|---|---|
| K–5 | 500 | 1500 |
| 6–9 | 300 | 1000 |

- Keep the current interim, punctuate, smart_format, filler_words, vad_events and mip_opt_out settings.
- Language: `en-US`, or `es-419` for Spanish.
- Turn windows are in §2.4.

#### Speech-to-text, last resort: the browser's recognizer

Tap mode only, half duplex: the mic is closed while the tutor speaks.

#### Language model

- `claude-sonnet-5-5` (`KAIZEN_MODEL_TALK`), unchanged.
- Add Anthropic prompt caching: send the system prompt as a static part marked `providerOptions.anthropic.cacheControl = {type:"ephemeral"}`, followed by a dynamic part.
- Voice turns: `maxOutputTokens: 300`.

### 2.3 Latency budget

The clock runs from the learner's last word to the tutor's first audible sound. Log every segment, every turn.

| Segment (answer turn, grades 3–9) | p50 budget |
|---|---|
| Last word end (speech-to-text word timestamp) → end of turn decided (eager or answer-aware) | 450 ms |
| End of turn → request at `/api/tutor` (warm) | 120 ms |
| Request → first text token (cached prompt, no tool step) | 600 ms |
| First token → first sentence released (≤ 10 words) | 150 ms |
| First sentence → first audio chunk at the client (socket already open) | 200 ms |
| Chunk → audible (prebuffer + `outputLatency`) | 80 ms |
| **Total** | **≈ 1.6 s** |

K–2 waits longer by design (1.0–1.6 s end of turn), so its total p50 is ≤ 2.4 s.

**Gates (they replace plan §6 "Voice"):**

| Measure | Target |
|---|---|
| 3–9, last word → first sound | p50 ≤ 1.6 s, p90 ≤ 2.5 s |
| K–2, last word → first sound | p50 ≤ 2.4 s, p90 ≤ 3.2 s |
| Visible acknowledgement after end of turn (bubble committed, cursor moving) | ≤ 150 ms |
| Barge-in: tutor ducked after the learner starts | ≤ 150 ms |
| Barge-in: tutor fully stopped | ≤ 800 ms |

**Logging:**
- Each turn POSTs to `/api/voice/metric`. Send numbers only: band, locale, vendors in and out, ms per segment, barge-in duck and stop times, underruns. No text, no names.
- The server prints one JSON log line per turn.
- Non-production builds expose `window.__kzVoice`, an event log used by e2e.

### 2.4 Turn-taking, modes, barge-in

**Flux event mapping:**

| Flux event | What we do |
|---|---|
| StartOfTurn | Speech onset |
| Update | Partial transcript with word timings |
| EagerEndOfTurn (3–9) | Send the request speculatively and pre-open the text-to-speech socket |
| TurnResumed | Abort the speculative request (useChat `stop`, then remove the messages) and go back to *hearing* |
| EndOfTurn | Commit the turn |

**Answer-aware early end** (both speech-to-text paths):
- Applies when a practice item is pending and `spoken.ts` parses the transcript as a complete answer with certainty `"sure"`.
- End the turn after this much silence, measured from the last word's end timestamp: 500 ms (6–9), 600 ms (3–5), 700 ms (K–2).

**Holding phrases:**
- English: "wait", "hold on", "let me think", or "um" on its own.
- Spanish: "espera", "a ver", "déjame pensar", "este".
- They extend the window to 8 s and are never sent on their own.

**Nova fallback windows** (done / open / hold):

| Band | Done | Open | Hold | Notes |
|---|---|---|---|---|
| K–2 | 1600 | 2200 | 5000 | Treat the recognizer's final "." as no punctuation |
| 3–5 | 1100 | 1800 | 4000 | Same |
| 6–9 | 700 | 1400 | 3000 | UtteranceEnd shortcut allowed only here |

Measure silence from word end timestamps, not from when a message arrives.

**Low confidence:**
- If the turn's mean word confidence is below 0.6, don't send it.
- Show "Did you say: …?" with Send and Say it again.
- For an answer, show the parsed reading big: "Did you say 7?"

**Talking to someone else:**
- If the first word is mom, mommy, mama, dad, daddy, papa, grandma, grandpa, abuela, abuelo, mamá, mami, papá or papi, hold the turn behind a "Send to the tutor?" chip.
- Do the same for a sibling's nickname from the family profiles. Match on the device; the nickname is never sent.
- Put this in `lib/voice/addressee.ts`.

**Modes:**

*Tap mode* is the default for 3–9, and for K–2 when conversation mode isn't allowed.
- Tap opens the mic.
- The turn ends by itself, or on a second tap.
- Then the mic closes.

*Conversation mode* is the default for K–2 when allowed, and an opt-in toggle for 3–9.
- After a reply that ends with "?", the mic reopens.
- It closes after 12 s with no learner speech (K–2: 15 s).
- After two empty reopenings in a row, it drops back to tap mode.
- Hard stop at 20 minutes.
- It stops on `visibilitychange` (hidden), `pagehide` and route change.
- It is allowed only with all three: grown-up consent (`settings.voiceInput`), vendor speech-to-text, and vendor text-to-speech or a Tier A voice.

**Barge-in** (full duplex, vendor speech-to-text only):

1. **Onset:** Flux StartOfTurn, or mic frame level ≥ 0.5 on `levelOf`'s scale (−30 dBFS) for ≥ 120 ms while the tutor plays (≥ 0.33 when it doesn't). Within 150 ms of onset, duck the tutor's gain to 0.3 over 80 ms.
2. **Cancel:** take gain to 0 over 120 ms, stop the audio sources, and close the socket. Do this on the first word that is neither a backchannel nor echo, or after 700 ms of continuous voiced frames.
3. **Restore:** bring gain back to 1.0 over 250 ms if neither happens within 800 ms.
4. **Answers over the end of a question:** speech that starts in the last 1.5 s of a tutor sentence ending in "?", or after it, is a held turn. That holds even if it is a backchannel or repeats the tutor's words ("the bottom number"). Deliver it when the tutor's audio ends; this widens today's held-backchannel logic.
5. **Echo by time:** a heard word is echo only if the tutor played the same word (folded through `numbers.ts`) within ±400 ms of that word's mic time.
   - Mic time = the shared AudioContext time when the stream started + the speech-to-text word's start.
   - Played time = the alignment time + `outputLatency`.
   - This replaces the arrival-time marks in `converse.ts`.
   - Keep echo screening on for 1500 ms after the last scheduled sample ends.
6. **Half-duplex switch:** two echo set-asides in one session switch that session to half duplex. The mic is gated while the tutor plays, and barge-in is by tapping Stop.
7. **Truncation:** after any barge-in or cancel, take the index from `heardUpTo()`. The next request sends that tutor message truncated to the heard words plus `" [interrupted]"`; do it in `DefaultChatTransport.prepareSendMessagesRequest`. On screen, the unheard rest stays in the bubble in muted ink.

**Merging a self-correction:** if speech resumes while *thinking* (before first audio, within 1.5 s of end of turn):
- Abort the request.
- Remove that user message and the partial assistant message.
- Resend the merged text.
- Do this at most once per turn.

### 2.5 One model call per turn

**Context:**
- Add `input: "voice" | "text"` (per turn) to `TutorContext`.
- Add `spots` (`visibleSpots()`, per docs/spotlight.md step 2).

**Spoken precheck in `tutorTurn`:** when `ctx.item` is set and `input === "voice"`:
- Rebuild the item and parse the last user message with `spoken.ts` against `item.answer.kind`.
- **If it parses:** add to the system prompt "The learner answered by voice: "<transcript>". Read as <reading>. The checker says: correct | not yet | right value, not in simplest form. Do not call check_answer for this answer."
  - When not correct, also add the next vetted hint text ("If they need a hint, use this vetted hint: …") and advance the hint counter, so `next_hint` continues after it.
- **If it doesn't parse:** add "You couldn't tell what they said as an answer. Ask them to say it again or tap it in. Never call it wrong."
- **Skills voice can't answer:** spelling and CVC words, capitals, homophones, contractions, commas, and `expr`. Flag them `voice: { answer: false }` in the skill registry. The verdict is "type it", and the prompt asks them to tap or type the answer.
- A voice answer in the drawer doesn't change the practice record. That matches how typed chat answers work today.

**Board tools:**
- `BOARD_TOOLS` = tools whose `execute` only echoes: `show_visual`, `start_practice`, `add_to_calendar`, `note_for_grownup`, plus any echo-only tools the tutor branch adds.
- `stopWhen: [isStepCount(5), ({steps}) => last step has ≥1 tool call and all are BOARD_TOOLS]`.

**Voice-mode prompt block** (added when `input === "voice"`):

> The learner is talking with you out loud; everything you write is spoken by a voice and shown as text.
> - First sentence at most 10 words. Other sentences at most 16 words (grades K–2: 10). End with exactly one question, as the last sentence.
> - No lists, headings, tables, parentheses, arrows, emoji or links. Write math in normal notation (3/4, 5 × 2 = 10, −2); the app reads it aloud correctly. Never write dates as numbers with slashes.
> - What the learner said is a speech transcript and may be misheard. If a word seems wrong, ask once what they meant; never call a misheard word a mistake. Ignore anything said to someone else.
> - "I don't know", "no sé", "idk": turn the next hint into a choice between two options, and point at the part it is about.
> - Words first. Board tools (show_visual, start_practice, add_to_calendar, note_for_grownup) go after your words. Before similar_problem or a lookup, say in one short sentence what you are about to do.

**Openings.** The wording below is proposed; the owner approves it.
- **K–2 drawer:** code-built, no model call. The first vetted hint, as a question, with its anchor.
- **K–2 Talk:** "Hi. Do you want to count, find shapes, or hear a story?" with three 56 px chips that also accept voice.
- **3–9 problem:** "Which part is tricky?"
- **Cut:** "Let's look at it together." (`tutor.demo.open`), and "What have you tried so far?" / "What would you like to learn or work on?" for K–2.
- **Demo-tutor disclosure:** say it once, in the opening. Remove it from `tutor.demo.found` and `tutor.demo.talkOther`.

### 2.6 Failure handling

**Text-to-speech:**
- **First-audio deadline:** 2.0 s after the first sentence is sent.
- **Stall:** `ctx.state !== "running"`, including iOS "interrupted", or `currentTime` not advancing for 500 ms while audio is scheduled.
- **On either:** reconnect once with a fresh token, from the first unheard sentence, in the same voice.
- **On a second failure:** stop speaking, keep the text, and show a chip: "Voice is off for now. The words are on screen." For K–2, use a speaker-with-slash chip, plus the pre-rendered clip of that line once clips exist.
- **Never switch voice mid-reply.** The *next* reply may use a Tier A browser voice, labelled "Using this device's voice".

**Feed lifetime:**
- `speak(source, { signal })` is bound to useChat `stop`, unmount, and item or scene change.
- 8 s with no new text after the audio drains ends the run.

**Model stream error:** speak what already arrived, then show "Lost the connection" with Try again, which resends the saved turn.

**Offline event:** switch to tap and type at once.

**Speech-to-text:**
- Reset the reconnect counter after 30 s of a healthy connection.
- If `ws.bufferedAmount` exceeds 32 KB, show "The connection is slow." and pause conversation mode.

**iOS and audio sessions:**
- Set `navigator.audioSession.type` to `"playback"` while reading aloud and `"play-and-record"` while the mic is open (feature-detect it). Without it, start a looping near-silent `<audio>` on the first tap.
- Use one shared AudioContext for both mic and playback.
- Time out `resume()` at 300 ms everywhere, including `mic.ts`; on timeout show "Tap to start the microphone".
- If iPad playback drops more than 6 dB while the mic is open (measure it in P2), iPad conversation mode runs half duplex.

**Audio unlock across routes:**
- `VoiceRoot` adds one capture-phase `pointerdown`/`keydown` listener that calls `out.warm()` on the first gesture anywhere. That unlock survives client-side navigation.
- `warm()` works before `voice()` has resolved.
- `say()` queues until ready; it never silently drops.

### 2.7 Wiring the app voice

> Status: `VoiceRoot`, `VoiceProvider`, `useAppVoice`, `useSpeak`, `appSay` (`lib/voice/root.tsx`),
> the app's one SpeechOut (`app-out.ts`) and `useTutorVoice` (`tutor-voice.ts`) are built and tested.
> The per-file wiring for phase B is in `apps/web/src/lib/voice/WIRING.md`.

**`VoiceRoot`** (client component in `app/layout.tsx`, next to `SpotlightLayer`):
- Reads the current learner from the store.
- Builds `voice({ locale, consent, under13, band, names })` once per learner and locale.
- Calls `setSpotBand` and `setSpotScrub`.
- Exposes `useAppVoice()`.

**Rules:**
- `speakText` (`hear.tsx`), `useSpeech` (stage narration, same API kept), Runner read-aloud, `landing/Sheet`, `calendar/WeekView` and `shell/HearTabs` all call the app SpeechOut.
- After this change, `speechSynthesis` appears only in `lib/voice/browser.ts`.
- `speak()` returns a `SpeechRun` (a Promise with an `id`). Events carry the run id, so narration, Hear and the tutor ignore each other's events.
- Any new `speak()` cancels the previous one with a 120 ms fade and cancels its cues.

### 2.8 Number speller (`numbers.ts`, used by `speakable` and echo folding; EN/ES)

Never leave a digit for the voice.

**Integers:**
- Cardinals up to 999,999,999. EN without "and" ("one thousand two hundred fifty"); ES "mil doscientos cincuenta".
- ES "1 / 21 / 31 …" before a noun: "una / veintiuna" when the noun ends in -a, -as, -ión or -dad; otherwise "un / veintiún". Standalone: "uno".

**Signs and separators:**
- Negative: a leading `-` or `−` before a digit (at the start, or after a space or "(", not after a digit or a variable) → "negative" / "menos".
- Thousands: EN `,`. ES `.` or `,` when followed by exactly three digits.
- Decimals: EN "point" plus digits one by one. ES "punto", or "coma" for `,`. Up to 2 decimal digits are read as a number ("tres punto setenta y cinco"); more are read digit by digit.

**Fractions:**

| Case | Rule | EN example | ES example |
|---|---|---|---|
| Denominator ≤ 20, 100 or 1000 | Ordinal | "five sixteenths", "one fourth" (US: fourths) | "cinco dieciseisavos", "un cuarto" |
| Any other denominator | "over" | "five over seventeen" | "cinco sobre diecisiete" |
| Mixed number | "and a half" / "y medio" | `2 1/2` → "two and a half" | "dos y medio" |
| Mixed number | "and" + fraction | `3 3/4` → "three and three fourths" | "tres y tres cuartos" |

ES ordinals: medio, tercio, cuarto, quinto, sexto, séptimo, octavo, noveno, décimo, then "-avos" (onceavos … veinteavos), centésimos, milésimos. Keep the existing date guard.

**Time, money, percent, ordinals:**

| Case | EN | ES |
|---|---|---|
| `3:30` | "three thirty" | "tres y media" |
| `3:05` | "three oh five" | "tres y cinco" |
| `3:00` | "three o'clock" | "tres en punto" |
| `3:15` | — | "tres y cuarto" |
| `3:45` | — | "tres y cuarenta y cinco" |
| `$2.50` | "two dollars and fifty cents" | "dos dólares con cincuenta centavos" |
| `$0.75` | "seventy-five cents" | "setenta y cinco centavos" |
| `50%` | "fifty percent" | "cincuenta por ciento" |
| Ordinals | `1st`–`20th` → words | `1.º 1.ª 1er 1ro` → primero / primera / primer (up to 20, then cardinals) |

In ES, don't add "las"; the text usually has it.

**Operators:**

| Written | EN | ES |
|---|---|---|
| `x` / `X` / `·` between numbers or a number and a variable | "times" | "por" |
| `√16` | "the square root of sixteen" | "la raíz cuadrada de dieciséis" |
| `≠` | "is not equal to" | "es distinto de" |
| `^2` / `^3` | "squared" / "cubed" | "al cuadrado" / "al cubo" |
| `^n` | "to the power of n" | "elevado a n" |
| `3x` | "three x" | "tres equis" |

Single-letter variables next to digits or operators are read as letters. In ES, `x` is "equis".

**Units:** cm, m, km, g, kg, mL, L, in, ft, °F, °C → words, plural unless 1.

**Symbols and abbreviations:**
- Drop `→ | •` and table pipes.
- "e.g." → "for example"; "i.e." → "that is"; "etc." → "and so on" / "etcétera"; "p. ej." → "por ejemplo".

**Safety replies:** hand-written spoken versions. Read phone numbers digit by digit (988, 741741, 1-800-422-4453).

**Dev assertion:** in development, log any `[0-9%$√→|]` that reaches the text-to-speech transport.

---

## 3. Sync contract: reply text, anchors, voice timing, glow and cursor

### 3.1 Anchors in the reply (AI tutor)

**Syntax.** The model writes `[[spot:<id>]]` immediately before the word it refers to:
"Look at the `[[spot:practice.prompt.part.0.bottom]]`bottom number."

**Parser:**

```ts
// lib/voice/cues.ts
export const CUE_MARK = /\[\[spot:([a-z0-9][a-z0-9.-]{0,63})\]\]/;
export type Cue = { id: string; word: number; epoch: string };
/** Streaming: push raw model text, get display deltas; markers are never emitted. */
export function cueParser(epoch: string): { push(raw: string): string; end(): string; cues(): Cue[] };
```

**Rules:**
- **Holdback:** hold from `[[` until `]]`, for at most 80 characters.
- **Removal:** every `[[…]]` up to 80 characters is removed, valid or not.
- **Spacing:** removing a marker never glues two words together and never adds a word.
- **Which word:** `cue.word` is the index of the first written word after the marker, where words = `display.split(/\s+/).filter(Boolean)`. A marker at the very end binds to the last word.
- **Dropped at fire time:** ids not in the `spots` list sent with that turn, and `auto.*` ids that no longer resolve.
- **Joining text parts:** display text is the text parts joined in order. A text part in state `"done"` adds a trailing `"\n"`, so its last sentence is spoken at once and steps never glue ("that.Your").
- **One stripping point:** `replyText(message)` in `components/tutor`. The bubble, the timeline, `saveThread`, grown-up notes, Hear and copy all use it. The model's history keeps the markers.
- **One word space:** the chunker splits only at whitespace and newlines, so sentence words concatenated equal display words. `onBoundary` and `onWordScheduled` index that same space.

**Anchor guide** (replaces `SPOT_GUIDE`; append the on-screen list as `spotsPrompt` does today):

> Pointing: you can make one thing on the learner's screen glow while you say it, the way a tutor points with a finger. Write [[spot:ID]] immediately before the word that names it: "Look at the [[spot:practice.prompt.part.0.bottom]]bottom number."
> - Only ids from the list below; never invent one. The sentence must name the thing in words ("the bottom number"), never "this" or "here".
> - At most one point per sentence and three per reply. Point when words alone would leave them hunting.
> - Never point to give away an answer: not at a choice, the keypad or an answer pad, not at a tick, number or cell that could be the answer, and never count along. Point at the problem's parts instead.
> - Don't point every turn.

### 3.2 The voice is the clock

**SpeechOut additions** (`types.ts`):

```ts
speak(source: SpeakSource, opts?: { signal?: AbortSignal; kind?: "reply" | "narration" | "hear"; band?: Band }): SpeechRun; // Promise<void> & { id: number }
/** As soon as a word's audio is scheduled: its index and when it becomes audible (performance.now() ms, outputLatency included). Vendor and clip voices only. */
onWordScheduled(fn: (word: number, audibleAt: number, run: number) => void): Unsubscribe;
/** Last word index fully audible so far; -1 before the first. */
heardUpTo(): number;
duck(gain: number, ms: number): void;
unduck(ms: number): void;
cancel(opts?: { fadeMs?: number }): void;
```

`onBoundary`, `onStart` and `onEnd` gain a `run` argument.

**`player.ts`:**
- **Alignment:** walk a cursor over the non-space characters of the exact text sent. Each non-space alignment character advances it, skipping whitespace mismatches either way. Look up the word from precomputed word-start offsets. Use `alignment`, never `normalizedAlignment`.
- **Timing:** `audibleAt = at + charStart + (ctx.outputLatency || ctx.baseLatency || 0)`.
- **Prebuffer:** hold the first playback until 150 ms of audio is buffered or 250 ms have passed, whichever comes first.
- **Scheduling:** 50 ms lead.
- **Gain:** route everything through a per-run GainNode. Fade in over 10 ms at start; fade out on cancel.
- **Underrun:** resume at the next word boundary, not mid-word.

**Browser voices:** no look-ahead; `onBoundary` only.

### 3.3 The attention scheduler (`lib/attention.ts`, pure, fake-clock tested)

**Timing:**
- **Lead:** 150 ms. The cursor arrives 150 ms before the anchored word's `audibleAt`, so the gaze leads the speech.
- **Glide start:** `audibleAt − 150 − glide`.
- **Glide length:** `glide = clamp(240 + 0.3 × distance_px, 280, 560)` ms, `cubic-bezier(0.2, 0.8, 0.2, 1)`.

**When the start time has already passed:**

| How late | What happens |
|---|---|
| ≤ 300 ms | Glide in the remaining time (minimum 160 ms) |
| More, but the word's sentence is still playing | 150 ms crossfade at the target |
| The sentence has ended | Drop the cue |

**Dwell:**
- Arrivals are at least 900 ms apart (K–2: 1200 ms).
- A cue that would arrive sooner waits, but only up to 300 ms past its word's onset; after that it is dropped.

**Limits:**
- At most 5 moves per reply.
- **No counting along:** while an item is unanswered, at most 1 move per reply into any indexed family: `*.tick.*`, `*.cell.*`, `*.number.*`, `*.point.*`, `*.group.*`, `*.bar.*`, or fraction-visual `*.part.<i>`.

**Checks at fire time:**
- Epoch matches, `resolveSpot` finds it, `isShown`, and not guarded.
- If the target is missing, retry every 100 ms until the anchored sentence ends, then drop silently.

**Browser voices:**
- Fire on the anchored word's `onBoundary`, with a 200 ms glide.
- Voices with no word boundaries fire at sentence start.

**Typed mode** (voice off): `audibleAt` = the moment the anchored word renders. Same dwell rules, so moves are paced at least 900 ms apart.

**Cancel all pending cues on:**
- Barge-in
- Speech cancel
- The learner using any control (`pointerdown` or `keydown` on an interactive element)
- Item, scene or route change
- Epoch change

Never cancel speech because the learner tapped the lit target.

**Epoch:** `${pathname}|${item.id | scene.id | "talk"}|${messageId}`.

**Final target:**
- The ring stays lit through the learner's turn.
- After 6 s it goes to rest: 60% opacity, no outer glow.
- It clears on the learner's next turn or action, Escape, or item, scene or route change.

### 3.4 Pointing session and the visual spec

**Engine API** (`lib/spotlight.ts`):

```ts
export function beginPointing(o: { epoch: string; voice: boolean }): PointingSession;
type PointingSession = { move(id: string, o: { glideMs: number }): boolean; rest(): void; end(): void; readonly epoch: string };
```

- Same store as today. `session` is set once per pointing.
- `move` changes the target without starting a new session and without remounting the ring.
- `nonce` bumps only on the first arrival, so there is one pulse per reply.

**Voice mode** (`voice: true`):
- No caption, dim, step counter, or `checkSpot` auto-advance.
- At most one scroll per reply, at the first move. Later off-screen targets get the edge chip.
- No polite live-region announcements; the voice already names the target. The target's `aria-describedby` points to a hidden node holding the anchored sentence.

**Typed mode:** the same visuals, plus one polite announcement per move, at least 1.5 s apart.

**`guardSpots`** accepts `prefix.*` patterns.

**The ring:**
- One element per session, never keyed per move.
- On a move, tween from the old box to the live new box with rAF: `pos = lerp(from, liveRect(), ease(t))`, re-reading the destination every frame.
- No CSS transition on plain tracking.
- Arrival: a 220 ms bloom (scale 1.04→1, opacity). The existing two pulses play on the first arrival of a reply only.

**`TutorCursor`** (`components/spotlight/cursor.tsx`):

*Look:*
- A 14 px dot in `var(--color-accent)`, with a 2 px `var(--color-panel)` ring and the shadow `0 1px 4px color-mix(in srgb, var(--color-accent) 35%, transparent)`.
- Never an arrow or anything shaped like the system pointer: two pointers would read as someone remote-controlling the screen.
- `aria-hidden`, `pointer-events: none`, stacked above the ring.

*Position and paths:*
- It travels with the ring and parks 4 px outside it, at the ring-edge point nearest its previous position. Never over the content being explained.
- If the straight path crosses a guarded element's box, or is longer than 60% of the viewport diagonal, it fades out (100 ms) and in at the target instead of travelling.

*Poses by state:*

| State | Where the dot is | What it does |
|---|---|---|
| Listening / hearing | Beside the mic (`[data-tutor-mic]`) | Scale follows mic level, 1.0–1.25 |
| Thinking | One glide to the learner's just-committed bubble, or to `practice.pad.output` if a spoken answer was parsed | Breathes, opacity 0.55↔1 every 1.6 s. No scanning, no wandering |
| Speaking, no anchors | `[data-tutor-home]`: the leading edge of the newest tutor bubble, the narration Play button, or the BigHear button | Rests |
| Speaking, with anchors | Follows the ring | Glides per §3.3 |
| Idle | Hidden (200 ms fade) | Unless a ring is resting |

*Accessibility modes:*
- **Reduced motion:** no dot; the ring crossfades over 150 ms at word time; no pulse; no breathing.
- **Forced colors:** the dashed Highlight ring (existing), no dot.

**Phones (< 640 px) with the tutor sheet open:**
- At the first move of a reply, the sheet animates once to a peek: at most 35dvh, over 200 ms.
- Restore it when the final hold ends or the learner acts.
- Show the direction chip whenever the target is off-view.
- Never scroll while the learner is typing (existing rule).

**Performance:**
- `measure()` re-runs placement only when the target rect or the viewport changed.
- The MutationObserver ignores mutations inside `[data-spot-still]`: the transcript, narrated text and word highlights.

### 3.5 Other sources of cues

**Demo tutor:**
- Replies are built in code as sentences.
- Extend `hintSpot` to `hintSpotAt(item, rung) → { id, word } | null`, where `word` is the matched term's index in the hint ("bottom" in "the bottom number is 6"). `cue.word` = words before the hint + `word`.
- The show-how cue goes on `practice.show-how`, at the answer / no-more-hints sentence.

**Lesson narration:**
- Segments become the sentences of the `speak()` iterable. Map word index to segment with running word counts.
- **Automatic cue:** segment `v{i}` (a picture's alt text) → `stage.block.<i>.visual.<kind>`, at its first word.
- **Authored cues:** scene data `cues?: { seg: string; spot: string; word?: number }[]`, validated by a test against the segment text and the stage id list.
- Quiz choices get the word highlight only; they are guarded.

**K–2 Today:** see §5.4.

**"Show me again" (`SpotAgain`):**
- Replays a message's cues with dwell spacing and no audio.
- Shown only if at least one cue lit.
- Inert once its epoch is gone.

---

## 4. Browser-voice fallback policy (`lib/voice/voices.ts`, one picker for the app)

**Tier A** may be used for conversation and auto read-aloud. **Tier B** is read-on-request only (a Hear tap). **Tier C** is never used.

**Classification:**
- A voice is Tier A only if it matches the A patterns.
- It is Tier C if it matches the C patterns.
- Anything else in the right language is Tier B.
- Never use a voice from another language.

### Tier A

**English, in order:**
1. "Microsoft AvaMultilingual Online (Natural) - English (United States)"
2. "Microsoft Ava / Andrew / Emma / Brian / Jenny / Aria Online (Natural) - English (United States)", then any `/Online \(Natural\) - English \(United States\)/`
3. Apple voices whose name ends "(Premium)" in en-US (e.g. "Ava (Premium)", "Zoe (Premium)", "Evan (Premium)"), then "(Enhanced)" in en-US (e.g. "Samantha (Enhanced)", "Ava (Enhanced)", "Allison (Enhanced)", "Tom (Enhanced)", "Nathan (Enhanced)")
4. Android Chrome voices with `localService: true` and lang en-US, on an Android user agent. Verify on a Pixel and a Samsung.

**Spanish, in order:**
1. "Microsoft Paloma Online (Natural) - Spanish (United States)", "Microsoft Alonso Online (Natural) - Spanish (United States)"
2. "Microsoft Dalia Online (Natural) - Spanish (Mexico)", "Microsoft Jorge Online (Natural) - Spanish (Mexico)"
3. Other Latin-American Online (Natural) voices
4. Apple es-US / es-MX "(Premium)" then "(Enhanced)" (e.g. "Paulina (Enhanced)")
5. Android local es-US / es-MX
6. Spain-Spanish Online / Enhanced voices last

### Tier B

- **English:** "Samantha", "Alex", "Google US English", other en-US voices.
- **Spanish:** "Paulina" (es-MX), "Juan" (es-MX), "Google español de Estados Unidos", "Google español", and "Mónica" (es-ES) last.

### Tier C

- **SAPI desktop voices:** `/^Microsoft (David|Mark|Zira|Sabina|Helena|Hazel|George|Pablo|Laura|Raul)\b/` without "Online".
- **Old robotic and novelty voices** (whole-name match, any language or region suffix): Albert, Bad News, Bahh, Bells, Boing, Bubbles, Cellos, Fred, Good News, Jester, Junior, Kathy, Organ, Ralph, Superstar, Trinoids, Whisper, Wobble, Zarvox.
- **Eloquence voices:** Eddy, Flo, Grandma, Grandpa, Reed, Rocko, Sandy, Shelley, in any language.
- **"Chrome OS …"** voices.

### Region order

- **Spanish:** es-US > es-MX > es-419 > other Latin American > es-ES.
- **English:** en-US > en-CA > others, inside a tier.

### Picker rules

- Wait up to 1000 ms for `voiceschanged`.
- Cache the pick (`voiceURI` + `name`) per learner and locale in localStorage, wrapped in try/catch. Re-rank if the cached voice disappears.
- **Consent:** Online (Natural) and "Google …" voices send text to Microsoft or Google, so they need the same consent as vendor text-to-speech for under-13 learners. Apple Premium/Enhanced and Android local voices are on-device and need no consent.
- **No Tier A voice and no vendor:**
  - Auto read-aloud is off by default.
  - Conversation mode is off.
  - Hear buttons use Tier B.
  - Show the parent tip in Settings: "For a better voice on iPad: Settings → Accessibility → Spoken Content → Voices → download an Enhanced voice."
- **Browser speech-to-text:** tap mode, half duplex, no automatic restart loop.

---

## 5. Screens, and what the learner sees in each state

### 5.1 States common to every voice surface

These states come from `conversation.ts` through `useTutorVoice`. Controls are 44 px; K–2 primary controls are 56 px. No earcons.

| State | Mic control | Captions | Tutor cursor | Sound and text |
|---|---|---|---|---|
| idle | "Talk" mic button, outlined; `tutor.mode` toggle (tap / conversation) where allowed | — | Hidden, or beside a resting ring | — |
| listening | Filled accent mic. A ring scales with `level()`; never red. "Listening" (3–9), ear glyph (K–2). Tap = done. The one-tap stop is always visible | Placeholder "Say it…" | Beside the mic | — |
| hearing | Same, level-driven | The learner's words in the input area: finals in ink, interim muted (all bands) | Beside the mic, pulsing with level | — |
| thinking | Off (tap mode) or small live dot (conversation) | The learner's bubble commits at 0 ms, plus a parsed-reading chip ("7") for spoken answers | One glide to that bubble or the pad output, then breathing | No audio filler. "Still working on it" (muted) at 3 s. "Taking longer than usual." plus Try again at 10 s |
| speaking | Square "Stop voice" button (`tutor.voice-stop`); Escape stops speech only. Conversation mode: small live mic dot | Tutor bubble streams; current word highlighted (narration's `WORD` class) | Glides to anchors, otherwise rests at home | Voice |
| interrupted (ducked) | Mic level ring | Learner caption appears | Fades to the mic | Tutor at 30% |
| interrupted (cancelled) | Listening / hearing | The unheard rest of the tutor bubble stays, muted | At the mic | 120 ms fade-out |
| confirm | "Did you say …?" with Send and Say it again; answers show the number big; "Send to the tutor?" for someone else | — | At the chip | — |
| error (speaking) | — | Chip: "Voice is off for now. The words are on screen." | Hidden | K–2: speaker-slash chip plus clip |
| error (listening) | Mic with a slash, plus a chip from `voiceErrorKey`. 3–9 end once with "You can type instead." No "Typing always works." boilerplate; K–2 gets icon chips, never text-only errors | — | Hidden | — |
| mic off (idle timeout or hidden) | Chip: "Mic off. Tap to talk." | — | Hidden | — |

**Escape and the drawer:** the drawer's window listener must respect `defaultPrevented`, so one Escape never closes both the voice and the drawer.

### 5.2 Talk (`app/(focus)/talk/page.tsx` + `TutorChat`, on the tutor branch's version)

**K–2:**
- The tutor speaks first once audio is unlocked; any earlier tap in the app counts.
- On a cold load, show one 56 px "Tap to hear" speaker under the opening line. Tapping it calls `warm()` and plays the opening.
- Then conversation mode starts if allowed, otherwise tap mode.

**3–9:** tap mode by default; the read-aloud toggle follows §4.

**Board:**
- The latest `show_visual` card carries `board.visual.*` part ids, so K–2 "lead with a picture" turns can point at parts of the picture.
- Older cards carry none.

**The transcript log:**
- Gets `data-spot-ignore` and `data-spot-still`.
- `data-tutor-home` sits on the newest tutor bubble; `data-tutor-mic` on the mic button.

### 5.3 The drawer beside a problem (`TutorDrawer` + `Runner`)

**On item change (Next):**
- The drawer closes.
- Speech and pending cues are cancelled.
- Guards follow the new item.
- Today the desktop drawer stays keyed to the old item, so a later cue would light the new problem's same-position part with talk about the old one.

**Phone sheet:** the peek rule in §3.4.

**Answers:** spoken answers are checked on the server (§2.5); the learner's bubble shows the parsed reading.

**Runner:**
- Guards `answerSpots(item)` plus value parts while the item is up: `visual.clock.number.*`, `visual.numberline.tick.*`, `visual.tenframe.cell.*`, `visual.coord.point.*`, `visual.linegraph.point.*`, `visual.bargraph.bar.*`.
- K–2 read-aloud of the problem goes through the app voice.

### 5.4 Lesson narration (`Stage.tsx`, `useSpeech.ts`, `narration.tsx`, `scenes.tsx`)

- `useSpeech` keeps its API and runs on the app SpeechOut:
  - `narrate(segments)` → `speak(iterable of segments)`.
  - Pause = cancel, then resume from the word.
  - "Say it with me" turn gaps stay the same.
- Uses the vendor voice when allowed, otherwise Tier A, otherwise Tier B on the Play tap.
- The word highlight comes from `onBoundary`, mapped to segment character offsets.
- The cursor's home is the narration bar's Play button.
- Cues follow §3.5.
- Narration never starts by itself.
- Remove `Figure`'s own ring (the spotlight lights the figure) and reserve the figcaption's space.

### 5.5 K–2 Today (`app/(app)/home/page.tsx`, `BigHear`)

Today never speaks on its own.

**Tapping the hello BigHear** plays a code-built script with cues, without the learner's name:

> "{helloSay}. First: `[[today.plan.item.0]]`{title of plan item 0}. Tap `[[today.next]]`Start."

**The Talk BigHear says:** "`[[today.talk]]`Talk with the tutor."

The cursor's home is the BigHear button that was tapped.

---

## 6. data-spot ids to add

Use `spotAttr(id, label?)`.

**`VisualView` and `MathText`** get a `spot` base prop:
- `VisualView` ids are `${spot}.${kind}` and `${spot}.${kind}.<part>`, with the part names from docs/spotlight.md.
- `MathText` ids follow the practice table.

**Cursor rest points are attributes, not spot ids:** `data-tutor-home`, `data-tutor-mic`.

**Shell** (`AppShell`, rail and bottom bar; both copies):
`nav.home`, `nav.practice`, `nav.talk`, `nav.learn`, `nav.calendar`, `nav.growth`, `nav.family`, `nav.me`, `nav.settings`, `nav.new`, `nav.switch`.

**Talk:**
- `talk.back`, `talk.title`, `talk.board`
- `tutor.input`, `tutor.send`, `tutor.mic`, `tutor.voice-stop`, `tutor.mode`, `tutor.read-aloud`, `tutor.quick.<i>`
- `tutor.card.<i>` (latest reply's cards only), `tutor.card.practice.start`, `tutor.card.calendar.add`
- `board.visual` with `spot="board.visual"` (latest card only), e.g. `board.visual.fraction.part.2`

**Drawer and practice** (per the docs/spotlight.md practice table):
- **Problem and controls:** `practice.problem`, `practice.prompt`, `practice.prompt.part.<i>` with `.top`, `.bottom`, `.exp`, `practice.prompt.blank`, `practice.visual`, `practice.feedback`, `practice.hints`, `practice.hints.<i>`, `practice.steps`, `practice.answer`.
- **Answer pads:** `practice.pad.output`, `practice.pad.fraction.top` / `.bottom` with `data-spot-label`, `practice.pad.remainder.q` / `.r`.
- **Guarded:** `practice.pad.keys` and `practice.pad.key.<k>`, `practice.choices` and `practice.choice.<i>` on the `<li>`, `practice.pad.symbols` (expr), `practice.pad.numberline.ticks` and `.tick.<k>`, `practice.pad.fractionbar.parts` and `.part.<k>`, `practice.pad.clock.face`. Not guarded: `practice.pad.clock.hour` / `.minute`.
- **Buttons:** `practice.check`, `practice.hint`, `practice.show-how`, `practice.ask-tutor`, `practice.skip`, `practice.next`.
- **Visual:** `VisualView spot="visual"`, giving ids like `visual.fraction.part.<i>`, `visual.numberline.marker`, `visual.clock.hour`, `visual.column.tens`.
- **Drawer:** the `tutor.*` ids above.

**Lesson stage:**
- **Frame:** `stage.back`, `stage.scenes`, `stage.scene.<i>`, `stage.title`, `stage.board`, `stage.read-aloud`, `stage.prev`, `stage.next`, `stage.finish`, `stage.tutor`.
- **Blocks:** `stage.block.<i>` on each block wrapper; its visual uses `spot="stage.block.<i>.visual"`, e.g. `stage.block.3.visual.fraction.part.2`.
- **Quiz:** `stage.quiz.prompt`; `stage.choices` and `stage.choice.<i>` are guarded until answered; `stage.check`, `stage.hint`, `stage.why`, `stage.next-question`.
- **Widgets:** the docs' `widget.*` ids; `widget.answer` is guarded until checked.

**Today, K–2:** `today.hello`, `today.hear`, `today.talk`, `today.plan`, `today.plan.item.<i>`, `today.next`, `today.courses`, `today.coming-up`.

**Today, 3–9:** `today.help-now`, `today.test-coming`, `today.plan`, `today.plan.item.<i>`, `today.next`, `today.coming-up`, `today.learn-new`.

**Never mark** destructive controls.

---

## 7. Tests

### 7.1 Unit (vitest; pure modules use fake clocks)

- **`cues.test.ts`:**
  - Markers never reach display text when the stream is split at every possible character position.
  - Correct word index; invalid id dropped; marker at the end binds the last word.
  - Adjacent markers; no word gluing.
  - A `[[` with no `]]` within 80 characters is dropped.
  - A `"\n"` at part done; "that.Your" is split.
- **`attention.test.ts`:**
  - Lead of exactly 150 ms; the glide formula; dwell 900 / 1200 ms.
  - Late cues: shorter glide, then crossfade, then drop.
  - Max 5 moves; the one-per-family rule.
  - Epoch drop; barge-in and learner-action cancel.
  - Missing target retried until sentence end; guarded target silent.
  - Browser path with no look-ahead; typed-mode pacing.
- **`chunk.test.ts`:**
  - Never cuts at a bare space.
  - In voice mode the first sentence is cut only past 60 characters, at `;`, `:`, ` — ` or `, and / but / so / because`.
  - Whole-text narration has no first cut.
  - Part-done flush.
- **`numbers.test.ts` + `speakable.golden.test.ts`:** at least 60 EN and 60 ES rows covering every rule in §2.8. Include every probe string from §0.2.
- **`voices.test.ts`:**
  - Fixtures of real `getVoices()` lists: macOS Chrome, macOS Safari, iOS Safari, Windows Edge, Windows Chrome, Android Chrome, ChromeOS.
  - Expected pick and tier per locale.
  - "Eddy" and novelty voices never picked; region order; the consent flag on online voices.
- **`turn.test.ts`:**
  - K–2 "It's." does not end before 2200 ms.
  - "Twelve." after a "how many" question ends at 700 / 600 / 500 ms when it parses.
  - Holding phrases extend the window to 8 s.
  - Flux mapping: Eager → speculative request, TurnResumed → abort, EndOfTurn → commit.
- **`bargein.test.ts`:**
  - Echo by time: the same word within ±400 ms is echo; a repeat 700 ms later is not.
  - The duck / cancel / restore timeline.
  - "The bottom number." after "top or bottom?" is a turn.
  - "uh huh" and "a ha" are backchannels.
  - Two echo set-asides switch the session to half duplex.
- **`conversation.test.ts`:** the full transition table, merging during *thinking*, idle timeouts by band, hidden page, two empty reopenings → tap mode, 20-minute stop.
- **`spoken.test.ts`:** at least 80 EN/ES rows:
  - Number words 0–1000, "a hundred"; negatives ("negative / minus two", "menos dos").
  - Fractions ("three fourths / quarters / over four", "tres cuartos", "un medio"); mixed ("two and a half", "dos y medio").
  - Decimals ("three point five", "tres punto / coma cinco").
  - Times ("half past three", "three thirty", "quarter to four", "las tres y media", "cuarto para las cuatro").
  - Choices ("the second one", "B", "la segunda", the label's words).
  - Lead-ins stripped ("I think it's", "is it", "creo que es", "es", "son"); self-correction ("ten, no, twelve" → 12); units ignored.
  - Returns null rather than guessing.
- **`player.test.ts` / `elevenlabs.test.ts`:**
  - Recorded real fixtures from P0 (Flash and v4, EN and ES, 3-sentence and 60-word replies): word drift ≤ 1 at the end.
  - `outputLatency` added; sentence pause inserted at the right sample.
  - Prebuffer; fades; retry from the first unheard sentence.
  - Never switches voice mid-reply; first-audio deadline; stall watchdog; AbortSignal.
- **`select.test.ts`:** conversation mode only with consent plus vendor speech-to-text plus (vendor or Tier A); under-13 without consent never gets an online voice.
- **`tutor.test.ts` (server, mock model):**
  - The voice precheck puts the verdict in the prompt, with no `check_answer` step.
  - Unparsed answers get the "say it again" line.
  - `stopWhen` ends after a board-only step.
  - The static prompt part carries `cacheControl`.

### 7.2 Component (RTL + jsdom, fake SpeechIn/SpeechOut from `fakes.ts`)

- **`VoiceBar.test.tsx`:**
  - Each state's controls and labels.
  - Space and Enter on the mic; Escape stops only the voice.
  - Focus never moves on a cue.
  - Stop is always visible while the mic is open.
- **`TutorCursor.test.tsx`:**
  - Reduced motion: no dot, ring crossfade.
  - Forced colors; `aria-hidden`.
  - No live announcements while the voice speaks; typed mode announces at least 1.5 s apart.
  - The ring element is mounted once per reply (count mounts).
- **`TutorChat.voice.test.tsx`:**
  - A streamed reply with two anchors produces the right cue word indexes.
  - Markers never appear in the DOM text, `saveThread` or notes.
  - Barge-in: the next request's body has the truncated text plus " [interrupted]"; the unheard rest is muted.
  - Self-correction merge; "Did you say …?" below 0.6 confidence.
- **Narration:**
  - The word highlight follows the fake voice.
  - An alt segment lights `stage.block.<i>.visual.*`.
  - Authored cues validate against the segment text.
- **Today K–2:** the BigHear script fires its cues in order.

### 7.3 End-to-end (`e2e/voice.spec.ts`, Playwright, desktop and phone projects)

**Setup:**
- Chromium flags: `--autoplay-policy=no-user-gesture-required`, `--use-fake-ui-for-media-stream`, `--use-fake-device-for-media-stream`, `--use-file-for-fake-audio-capture=e2e/fixtures/<clip>.wav`.
- Mock `/api/voice/status` (`{tts:true, stt:true}`) and both token routes.
- `page.routeWebSocket("wss://api.elevenlabs.io/**")` replays the recorded PCM and alignment fixture for the scripted reply.
- `page.routeWebSocket("wss://api.deepgram.com/**")` emits Flux events.
- `/api/tutor` returns a fixture UI-message stream:
  > "Look at the [[spot:practice.prompt.part.0.top]]top number. Now the [[spot:practice.prompt.part.0.bottom]]bottom number. Which is bigger?"

**Scenarios:**
1. **Drawer, fraction item: the glow moves across two targets in order.**
   - Mic tap → listening → hearing → thinking → speaking (assert each).
   - The ring's box equals the top-number rect, then the bottom-number rect, in that order.
   - An rAF sampler in `page.evaluate` logs the cursor's transform every frame: assert at least 5 intermediate positions between the targets (a glide, not a jump).
   - Each arrival lands 0–250 ms before that word's `audibleAt` from `window.__kzVoice`.
2. **Reduced motion** (`page.emulateMedia({ reducedMotion: "reduce" })`): no cursor element, crossfade only, same order.
3. **Barge-in** while speaking: inject StartOfTurn, then Update("wait").
   - Gain drops to ≤ 0.3 within 150 ms (player test hook).
   - After the word, playback is cancelled.
   - The bubble's rest is muted, and the next `/api/tutor` body is truncated.
4. **Talk K–2, cold load** (`page.clock`):
   - "Tap to hear" is visible; tapping it plays the opening.
   - The mic reopens after a question and closes after 15 s with "Mic off. Tap to talk."
5. **Guarded:** an anchor to `practice.choice.1` while the item is unanswered lights nothing and throws no error.
6. **Lesson:** Play lights `stage.block.<i>.visual.*` when its alt segment plays.
7. **axe** serious and critical = 0 in each state, on Talk, drawer, stage and Today, at 1440 and 390.

### 7.4 Latency eval (`apps/web/evals/voice-latency.eval.ts`, via `npm run evals -w apps/web`)

**Mock mode (default):**
- Drives `conversation.ts`, converse, the transport and `player.ts` on a virtual clock against fake sockets.
- Delay profiles:
  - Home Wi-Fi: 40 ms RTT.
  - Model time to first token: 600 ± 150 ms.
  - Text-to-speech time to first audio: 200 ± 60 ms.
  - Flux end-of-turn delays taken from P0 fixtures.
- 200 turns per band.
- Prints p50 and p90 per segment and for the total, and fails over the §2.3 budget.

**`EVAL_REAL=1` with keys:**
- The 30-line script through the live text-to-speech socket, measuring time to first audio.
- 20 recorded child utterances per band per language through Flux, measuring end-of-turn latency and cut-offs (expected transcripts in the fixture).

**`tutor.eval.ts` voice cases:**
- ≥ 95% of anchors valid.
- 0 marker leaks.
- First sentence ≤ 10 words in ≥ 90% of replies.
- No lists, parentheses or arrows.
- Question last.
- No `check_answer` on precheck turns.

### 7.5 Listening kit (`evals/voice-listen.ts`)

- Renders the fixed 30-line EN/ES script to WAV in a shuffled folder, with an answer-key file, for blind listening.
- The script covers fractions, negatives, times, money, questions and three K–2 lines.
- Include manual recordings of the best Tier A browser voice for comparison.

---

## 8. Acceptance criteria, tied to the owner's words

### "make it not uncanny, should sounds real"

1. **One voice everywhere:** Talk, drawer, narration, every Hear button, Runner read-aloud and Today all go through the app SpeechOut. `speechSynthesis` appears only in `lib/voice/browser.ts`; check with grep.
2. **Voice ids:** `ELEVENLABS_VOICE_ID` and `ELEVENLABS_VOICE_ID_ES` hold the owner's audition pick. George is gone from the code.
3. **Blind listen:** the owner plus 2–3 children (by band) hear the 30-line script; no line is picked out as robotic. A native bilingual listener rates the Spanish as natural Latin-American speech.
4. **No raw digits or symbols** reach the voice: golden tests pass, and the dev assertion stays silent over the e2e and eval runs.
5. **No voice switching mid-reply, ever.** Tier C never speaks. Tier B never auto-reads and is never used in conversation mode.
6. **K–2 pacing:** sentence-end pauses as specified; speed never below 0.9.

### "real time"

7. **Latency gates in §2.3** pass in the mock eval, and on real vendors over at least 50 live turns per band (metrics log).
8. **Barge-in:** ducked ≤ 150 ms after onset, stopped ≤ 800 ms.
9. **Real children's speech:** 20 utterances per band per language, with zero cut-off turns.
10. **Soak test:** zero self-interrupts in 30 minutes on laptop speakers without headphones, on a MacBook, an iPad and a Windows laptop.
11. **Acknowledgement:** visible within 150 ms of end of turn, in every case.

### "with moving attention using the glow / tutor cursor" and "highlight any element … to indicate direction and hints"

12. **e2e 7.3-1 passes on desktop and phone:** the ordered glide across two targets, each arrival 0–250 ms before the word.
13. **Word timing:** drift ≤ 1 word at the end of a 60-word reply on the recorded real fixture. A manual Bluetooth check shows the glow is not early.
14. **Every source moves attention:** the AI tutor (anchors), the demo tutor (hint cues), lesson narration (alt and authored cues) and K–2 Today. Reduced motion has an equivalent.
15. **Honesty:** a guarded part is never lit; a test runs every item's possible targets against the guards. No counting along.

### "the stuff you made around it is not trash" and "nothing that looks, sounds or feels like AI slop"

16. **In voice mode:** no captions, no "Got it" taps, no dim, one pulse per reply, and the ring never remounts within a reply.
17. **Mic behaviour:** every state is visible, a one-tap stop is always shown while the mic is open, the mic closes itself, and a hidden page stops everything.
18. **Copy:**
    - No spoken filler.
    - The demo disclosure is said once.
    - Errors fit the band (no text-only errors for K–2).
    - The consent text names Deepgram and ElevenLabs and says what each receives; the owner approves the wording.
19. **Quality checks:** `npm run verify` and `npm run e2e` are green; axe is clean in every state at 1440 and 390.

---

## 9. Order of work, and what's blocked on the owner

### P0: vendor checks (half a day; needs keys)

> Status: blocked on keys. Built against fakes: the dialogue transport's messages
> (`elevenlabs.ts` `openingMessage` / `sentenceMessage` / `closingMessage`), Flux's `TurnInfo`
> parsing and URL (`deepgram.ts`), the `language_hint` format. The latency eval's end-of-turn delays
> are assumed until the Flux fixtures exist. See WIRING.md §6 for the list.
- Does the single-use `tts_websocket` token open the Text to Dialogue socket with `eleven_v4_turbo`?
- Does Flux `/v2/listen` accept the `/v1/auth/grant` token as Sec-WebSocket-Protocol bearer?
- Confirm the `language_hint` format.
- Record fixtures:
  - Flash and v4 alignment for 3-sentence and 60-word replies, in EN and ES.
  - Flux event streams for 10 utterances.
- Without keys, build against fakes and mark P0 as blocked on keys.

### P1: sounds real

> Status: done in the library (numbers.ts + golden table, voices.ts tiers, audio.ts, player.ts, the
> transport fixes, server voice-id rules, VoiceRoot and hooks). Left for phase B: routing every
> speaker through it and deleting `useVoice.ts`, `voiceFor`, `claimVoice`.
- `numbers.ts` and `speakable`
- `voices.ts` tiers
- `audio.ts` and `player.ts`
- Transport fixes
- `VoiceRoot`, with every speaker routed through it
- Delete `useVoice.ts`, `voiceFor`, `claimVoice`
- Server voice-id rules

### P2: real time

> Status: done (conversation.ts, Flux with Nova-3 bands, turn.ts, barge-in duck and echo by time,
> addressee.ts, practice/spoken.ts and the server precheck, the voice prompt block, stopWhen, prompt
> caching, per-turn metrics and `/api/voice/metric`, `evals/voice-latency.eval.ts` on mocks). The
> real-vendor runs are blocked on keys.
- `conversation.ts`
- Flux, Nova bands and `turn.ts`
- Barge-in duck and echo by time
- `spoken.ts` and the server precheck
- Prompt voice block, `stopWhen`, prompt caching
- Metrics and the latency eval

### P3: moving attention (needs the tutor branch merged)
- `cues.ts` and `attention.ts`
- Pointing session, the persistent ring and `TutorCursor`
- Prefix guards
- `SpotAgain` replay
- Mount the layer, plus docs/spotlight.md steps 1–3, 5 and 11 adapted to anchors

### P4: screens
- Ids from §6
- Talk, drawer, stage narration and K–2 Today, with every state in §5
- e2e 7.3

### P5: clips and ship gates
- **Clips:** render i18n speech lines (openings, status and error lines, K–2 Today lines without dates, demo-tutor fixed lines) and K–2 catalogue narration segments, with timestamps.
  - Store them under `voice/<sha256(text|voice|model|speed)[:16]>.{mp3,json}` in Vercel Blob, with a committed manifest.
  - SpeechOut plays clips when every sentence of a `speak()` has one.
  - Under-13 learners without consent hear clips (no learner data leaves the device); live text goes to Tier A or to text only.
- Run the blind listen, the device soak tests and the real-vendor latency runs.

### Blocked on the owner

**Keys and accounts:**
- `ELEVENLABS_API_KEY`, `DEEPGRAM_API_KEY` (Member role), and `KAIZEN_VOICE=vendor` on Vercel.
- A Vercel Blob token for clips.

**Decisions:**
- The voice audition pick (1 bilingual voice, or 2 matched voices).
- The final wording of the openings and the consent text.
- Counsel's view on whether vendor read-aloud of the tutor's own words can be consented separately from the microphone. Until then, keep the current rule: under 13 needs the grown-up's consent for both.

**Sessions:**
- Blind-listen sessions with children.

**Known limit, out of scope here:** server-side consent is still the page's word until accounts land in M5. Leave the `voiceAllowed()` seam as it is.