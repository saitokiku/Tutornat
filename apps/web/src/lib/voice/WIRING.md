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
| `useTutorVoice(opts)` | `tutor-voice.ts` | The talking tutor: `state` (spec §5.1), `mic()`, `stopVoice()`, `setMode()`, `confirmSend()`, `confirmAgain()`, `retry()`, `streamError()`, `reply()`, `markFirstToken()`, `markAck()`, `setAside`, `level()`, `heardUpTo()`. Option `speakReplies` (the read-aloud toggle; default `useAppVoice().autoRead`). |
| `heardPrefix(text, heardUpTo)` | `conversation.ts` | A tutor message cut to what was heard, plus `[interrupted]`. |
| `readSpoken` / `voiceAnswerable` / `spokenIntent` | `practice/spoken.ts` | A spoken answer as the pad's response (the server checks it too); whether a turn is a try, "I don't know", or talk. |

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
const [readAloud, setReadAloud] = useState(app.autoRead); // the toggle; Tier B starts off (spec §4)
const voice = useTutorVoice({
  speakReplies: readAloud,
  onSend: (text, info) => {
    replyFeed.current = info.reply; // the reply's voice is already open: write its text into it
    sendMessage({ text }, { body: { context: { ...context, input: "voice" }, hintsSeen, today } });
  },
  onCommit: () => {},
  onAbortRequest: () => {
    stop();
    // The request in flight goes, with everything it added: the last user turn and anything after
    // it (a partial reply, or none yet). Not a fixed slice(0, -2): a merged turn may have no reply yet.
    setMessages((m) => {
      const i = m.findLastIndex((x) => x.role === "user");
      return i < 0 ? m : m.slice(0, i);
    });
  },
  onStopReply: (heardUpTo) => {
    stop();
    interrupted.current = { id: lastTutorId, heardUpTo };
  },
  answer: item ? (t) => readSpoken(t, item, locale) : undefined,
  keyterms: lessonWords, // never names
});
```

`onAbortRequest` runs when a speculative request is taken back (TurnResumed, other words at the
end of turn) and when a second turn arrives while the first is still thinking: the hook then sends
the two as one with `onSend`, right after.

1. Stream the reply into the feed: in the effect that already watches the last tutor entry, call
   `voice.markFirstToken()` on its first text, `replyFeed.current?.set(displayText)` as it grows
   (display text = text parts joined in order, `"\n"` after each part in state `"done"`, spec §3.1),
   and `replyFeed.current?.end()` when it stops streaming. On a stream error, `end()` the feed (what
   arrived is spoken) and call `voice.streamError()`: the bar shows `voice.lost` with
   `voice.tryAgain` (`state.notice === "lost"`), which calls `voice.retry()`. A typed turn read
   aloud uses `voice.reply()` the same way (never timed as turn latency).
2. Call `voice.markAck()` when the learner's bubble commits (it must be within 150 ms of the end of
   turn). The latency eval can't see the screen: TutorChat's component test measures this gate.
3. Truncation: in `prepareSendMessagesRequest`, replace the interrupted tutor message's text with
   `heardPrefix(text, heardUpTo)`; on screen, show the unheard rest in muted ink (`voice.interrupted`).
4. Send `context.input = "voice"` only on turns that came from `onSend`; typed turns send `"text"`.
5. Remove `useListen` / `useSpeakStream` and `speak.feed(...)`. The read-aloud toggle is
   `speakReplies` above: with it off (Tier B's default) a spoken turn's reply is shown, not spoken,
   and a Hear the learner tapped keeps playing. The conversation-mode toggle shows only while
   `voice.state.conversationAllowed` (it turns false if listening falls back to the browser).
6. Render `voice.state` with the VoiceBar states of §5.1. Strings are in `i18n` under `voice.*` and
   `spoken.*`: `voice.talk`, `voice.listening`, `voice.sayIt`, `voice.stop`, `voice.mode.tap`,
   `voice.mode.conversation`, `voice.tapToHear` (when `useAppVoice().locked`), `voice.still` /
   `voice.longer` + `voice.tryAgain` (`state.notice`), `voice.lost`, `voice.slow`, `voice.offline`,
   `voice.off` (`notice === "voiceOff"`), `voice.deviceVoice` (`useAppVoice().deviceVoice`),
   `voice.micOff.tap` / `micOffKey(state.micOff)`, `voice.didYouSay` + `voice.send` +
   `voice.sayAgain` (`state.confirm.kind === "unsure"`; for an answer `spoken.didYouSay` with
   `confirm.reading`), `voice.sendToTutor` (`kind === "addressee"`), `voiceErrorKey(state.error.code)`
   (`voice.fail.limit` when our per-minute or daily voice budget is spent: try again later, the
   same recognizer) + `voice.typeInstead` once for 3–9 (K–2: an icon chip). The mic button carries
   `data-tutor-mic` and its ring scales with `voice.level()`.
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
  recorded fixture. Until then `ELEVENLABS_TRANSPORT` stays unset (Flash on stream-input). On the
  dialogue socket the dry-player watchdog only counts audio as owed after the close (unflushed text
  may wait there): confirm that against the fixture too.
- Flux `/v2/listen` accepts the `/v1/auth/grant` token as `Sec-WebSocket-Protocol: bearer`; the
  `TurnInfo` event names and fields (`event`, `transcript`, `words[].confidence`,
  `audio_window_start/end`) and the `language_hint` format match `deepgram.ts`. Whether one grant can
  open more than one socket within its 60 s (then a press could reuse it instead of fetching ahead).
- Flux timing. Flux gives no word times: each word is timed by the audio window it first showed in
  (`HeardWord.coarse`), so the last word's end is an upper bound, later than the real end by Flux's
  recognition lag plus up to one Update (240 ms). Consequences until P0 measures that lag on recorded
  fixtures: on Flux the posted `eot` and `total` read short of the truth by that much (the latency
  eval shows both: truth from its script, and the product's numbers), so the §8.7 real-vendor gate
  must add the measured lag before it is judged; echo on Flux is judged by window and word order,
  not by ±400 ms. Also confirm whether Flux sends Updates during silence (the answer-aware early end
  no longer restarts on unchanged ones).
- Recorded fixtures: Flash and v4 alignment for a 3-sentence and a 60-word reply in EN and ES (the
  player's word drift ≤ 1); Flux event streams for 10 utterances (they replace the eval's assumed
  EagerEndOfTurn / EndOfTurn delays, per-message lag and TurnResumed share).
- The owner's audition pick in `ELEVENLABS_VOICE_ID` and `ELEVENLABS_VOICE_ID_ES`
  (`evals/voice-listen.ts` renders the 30-line script per candidate, sentence by sentence through
  the app's own socket messages and player, band pauses included).
- Real-vendor latency (`EVAL_REAL=1 npm run evals`), 50 live turns per band, 20 recorded child
  utterances per band per language, and the device soak tests (MacBook, iPad, Windows laptop). On
  iOS: that "playback" keeps the tutor audible with the ring/silent switch on, and an interrupted
  context (a call) resumes on a tap ("Tap to hear") with the reply going on from where it stopped.

## 7. Known departures from the spec, on purpose

- The tools are the same every turn, typed or spoken (the provider's cached prefix starts with
  them). A spoken turn the code judged doesn't remove `check_answer` / `next_hint`; its prompt lines
  no longer invite them, a stray `check_answer` reads spoken forms in code (it can't disagree with
  the precheck), and a stray `next_hint` hands back the hint the precheck supplied (never skipping a
  rung). The tutor eval's voice cases should count how often a stray call happens on a real model.
- The 700 ms "continuous voice" cancel plus its 120 ms fade is 820 ms from onset, past the 800 ms
  stop gate; in practice the first real word (Flux, ~600 ms) cancels first. Say if the rule should be
  680 ms.
- The Nova fallback has no eager end, so its answer-aware window (600 ms for 3–5) is past the 450 ms
  end-of-turn budget by design; the latency eval moves its gate by that much and says so.
