# Wiring the app voice (phase B)

Phase A built the voice layer and stopped at the screen boundary: no file under `components/` or
`app/` imports `lib/voice` yet. This page is the exact list of changes that put every screen on it.
Spec: `docs/plans/2026-10-07-live-tutor-spec.md` §2.7 (wiring), §5 (states), §8.1 (acceptance).

## 0. What exists

| Piece | Where | For |
|---|---|---|
| `VoiceRoot` | `root.tsx` | Mount once. Reads the current learner from the store, builds one voice per learner and language, sets the spotlight band and name scrub, unlocks audio on the first tap anywhere. |
| `useAppVoice()` | `root.tsx` | `{ ready, out, in, tier, autoRead, conversation, tip, locked, deviceVoice, disclosure, band, warm }` |
| `useSpeak(kind)` | `root.tsx` | Hear buttons, narration, read-aloud: `{ speak, stop, speaking, word, canSpeak, autoRead }`, following only its own run. |
| `appSay(text, { onEnd })` / `appSilence()` | `root.tsx` | The same from a click handler outside a hook. `false` = no voice: show nothing, never fall back. |
| `useTutorVoice(opts)` | `tutor-voice.ts` | The talking tutor: `state` (spec §5.1), `mic()`, `stopVoice()`, `setMode()`, `confirmSend()`, `confirmAgain()`, `retry()`, `markFirstToken()`, `markAck()`, `setAside`, `level()`, `heardUpTo()`. |
| `heardPrefix(text, heardUpTo)` | `conversation.ts` | A tutor message cut to what was heard, plus `[interrupted]`. |
| `readSpoken` / `voiceAnswerable` | `practice/spoken.ts` | A spoken answer as the pad's response; the server checks it too. |

## 1. Mount the root

`app/layout.tsx`: wrap `{children}` (and nothing else) in `<VoiceRoot>`:

```tsx
import { VoiceRoot } from "@/lib/voice/root";
…
<body className="min-h-dvh">
  <LangSync />
  <BandSync />
  <VoiceRoot>{children}</VoiceRoot>
  <Toaster />
  <Announcer />
</body>
```

`VoiceRoot` reads the browser store through `useStore` (server snapshot safe) and builds nothing until
a learner is signed in. When `SpotlightLayer` is mounted (P3), mount it inside `VoiceRoot`, next to
`{children}`.

## 2. One voice everywhere (§2.7, acceptance 1)

Each of these stops calling `speechSynthesis` itself:

1. `components/stage/hear.tsx` `speakText(text, locale, onEnd)`: the body becomes
   `return appSay(text, { kind: "hear", onEnd });` (`locale` is the learner's already). Delete the
   `claimVoice`, `langFor`, `voiceFor` imports. `Hear` keeps its API; its "speaking" state comes from
   `onEnd`.
2. `components/stage/useSpeech.ts`: keep `useSpeech(locale, resetKey)`'s API, implement it on
   `useAppVoice().out` with `kind: "narration"`: `narrate(segments)` →
   `out.speak(segments, { kind: "narration" })` (each segment is one sentence of the iterable; map
   the word index to segments with running word counts); pause = `out.cancel()` then speak again
   from the current word; keep the "say it with me" turn gaps (`turnMs`). The highlight comes from
   `out.onBoundary((word, run) => …)` for its own run only. Delete `claimVoice`, `voiceFor`, `langFor`.
   Narration never starts by itself.
3. `components/practice/Runner.tsx` (K–2 read-aloud at lines that call `speakText`): unchanged once
   `speakText` bridges, but read the problem aloud by itself only when `useAppVoice().autoRead`
   (a vendor or Tier A voice); otherwise only on the Hear tap.
4. `components/landing/Sheet.tsx`, `components/shell/HearTabs.tsx`, `components/tutor/Board.tsx`,
   `components/calendar/WeekView.tsx`, `components/profiles/ConsentNeeded.tsx`: replace
   `"speechSynthesis" in window` with `useAppVoice().tier != null`, and `speechSynthesis.cancel()`
   with `appSilence()`.
5. Delete `components/tutor/useVoice.ts` and its test once TutorChat is moved (step 3).
6. Check: `grep -rn speechSynthesis apps/web/src --include=*.ts --include=*.tsx` lists only
   `lib/voice/browser.ts` (and test doubles).

## 3. The talking tutor (TutorChat, TutorDrawer)

On the tutor branch's TutorChat (spec §0.4):

```tsx
const voice = useTutorVoice({
  onSend: (text, info) => {
    replyFeed.current = info.reply; // already speaking: write the reply's text into it
    sendMessage({ text }, { body: { context: { ...context, input: "voice" }, hintsSeen, today } });
  },
  onCommit: () => {},
  onAbortRequest: () => {
    stop();
    setMessages((m) => m.slice(0, -2)); // the speculative user turn and its partial reply
  },
  onStopReply: (heardUpTo) => {
    stop();
    interrupted.current = { id: lastTutorId, heardUpTo };
  },
  answer: item ? (t) => readSpoken(t, item, locale) : undefined,
  keyterms: lessonWords, // never names
});
```

1. Stream the reply into the feed: in the effect that already watches the last tutor entry, call
   `voice.markFirstToken()` on its first text, `replyFeed.current?.set(displayText)` as it grows
   (display text = text parts joined in order, `"\n"` after each part in state `"done"`, spec §3.1),
   and `replyFeed.current?.end()` when it stops streaming. A typed turn read aloud uses
   `voice.reply()` the same way.
2. Call `voice.markAck()` when the learner's bubble commits (it must be within 150 ms of the end of
   turn).
3. Truncation: in `prepareSendMessagesRequest`, replace the interrupted tutor message's text with
   `heardPrefix(text, heardUpTo)`; on screen, show the unheard rest in muted ink (`voice.interrupted`).
4. Send `context.input = "voice"` only on turns that came from `onSend`; typed turns send `"text"`.
5. Remove `useListen` / `useSpeakStream` and `speak.feed(...)`. The read-aloud toggle follows
   `useAppVoice().autoRead` as its default (Tier B: off by default, spec §4).
6. Render `voice.state` with the VoiceBar states of §5.1. Strings are in `i18n` under `voice.*` and
   `spoken.*`: `voice.talk`, `voice.listening`, `voice.sayIt`, `voice.stop`, `voice.mode.tap`,
   `voice.mode.conversation`, `voice.tapToHear` (when `useAppVoice().locked`), `voice.still` /
   `voice.longer` + `voice.tryAgain` (`state.notice`), `voice.lost`, `voice.slow`, `voice.offline`,
   `voice.off` (`notice === "voiceOff"`), `voice.deviceVoice` (`useAppVoice().deviceVoice`),
   `voice.micOff.tap` / `micOffKey(state.micOff)`, `voice.didYouSay` + `voice.send` +
   `voice.sayAgain` (`state.confirm.kind === "unsure"`; for an answer `spoken.didYouSay` with
   `confirm.reading`), `voice.sendToTutor` (`kind === "addressee"`), `voiceErrorKey(state.error.code)`
   + `voice.typeInstead` once for 3–9 (K–2: an icon chip). The mic button carries `data-tutor-mic`
   and its ring scales with `voice.level()`.
7. Escape stops the voice only (`voice.stopVoice()`), and calls `preventDefault()`; the drawer's
   own Escape listener must skip events whose `defaultPrevented` is set.
8. Drawer on item change: unmount or remount the `useTutorVoice` owner (it closes the mic and stops
   its reply on unmount).

## 4. Settings

- When `useAppVoice().tip`, show `voice.tip.enhanced` to the grown-up.
- The disclosure lines are `useAppVoice().disclosure` (keys); the consent text naming Deepgram and
  ElevenLabs and what each receives is still the owner's to approve.

## 5. Checks after wiring

- `npm run verify`, `npm run e2e` (spec §7.3 scenarios once P3 lands).
- `npm run evals` runs `evals/voice-latency.eval.ts` (mock gates).
- The dev assertion (`assertSpoken`) stays silent in the console over the e2e run.

## 6. Must be verified with keys (P0, blocked)

- The single-use `tts_websocket` token opens the Text to Dialogue socket with `eleven_v4_turbo`; its
  message shapes (`openingMessage`, `sentenceMessage`, `closingMessage` in `elevenlabs.ts`) match a
  recorded fixture. Until then `ELEVENLABS_TRANSPORT` stays unset (Flash on stream-input).
- Flux `/v2/listen` accepts the `/v1/auth/grant` token as `Sec-WebSocket-Protocol: bearer`; the
  `TurnInfo` event names and fields (`event`, `transcript`, `words[].confidence`,
  `audio_window_start/end`) and the `language_hint` format match `deepgram.ts`.
- Recorded fixtures: Flash and v4 alignment for a 3-sentence and a 60-word reply in EN and ES (the
  player's word drift ≤ 1); Flux event streams for 10 utterances (they replace the eval's assumed
  end-of-turn delays).
- The owner's audition pick in `ELEVENLABS_VOICE_ID` and `ELEVENLABS_VOICE_ID_ES`
  (`evals/voice-listen.ts` renders the 30-line script per candidate).
- Real-vendor latency (`EVAL_REAL=1 npm run evals`), 50 live turns per band, 20 recorded child
  utterances per band per language, and the device soak tests (MacBook, iPad, Windows laptop).
