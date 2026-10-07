# Media handoff — voice-client.mjs, scenes.mjs, media.css

Owner: media worker. Files below are the only ones written. `app.mjs`, `styles.css`,
`index.html`, `server.mjs`, `core.mjs`, `voice.mjs`, `voice_bridge.py` and every
incumbent test are untouched.

## Blocking integration requirements for other owners

1. **Backend (`server.mjs` STATIC map)** currently serves `/voice-client.mjs` but NOT
   `/scenes.mjs` or `/media.css`. Both 404 until the backend owner adds:
   ```js
   ['/scenes.mjs', ['scenes.mjs', 'text/javascript; charset=utf-8']],
   ['/media.css', ['media.css', 'text/css; charset=utf-8']],
   ```
2. **UI (`index.html`)** needs one line after the existing stylesheet link:
   `<link rel="stylesheet" href="media.css">`
3. **Backend `/api/health`** must report `capabilities.localTranscription` — see
   "capabilities contract" below. It currently returns `{ok, mode, model}` only.
4. **Vercel/cloud `Permissions-Policy`** needs `on-device-speech-recognition=(self)`
   for route 2. Chrome's default for that feature is already `self`, so this is a
   hardening line, not a blocker. `microphone=(self)` is already present.

## Exact usage

```js
import { createVoiceControls } from './voice-client.mjs';
import { createTeachingScene } from './scenes.mjs';

// --- voice, one instance per step; destroy before re-rendering
const voice = createVoiceControls({
  locale: S.locale,                       // 'en' | 'es'
  getText: () => step().explanation,      // read at Listen click, not at mount
  onTranscript: (text) => { S.answers[step().id] = text; render(); },  // DRAFT ONLY
  onEvent: (type) => { /* typed slug, e.g. 'record-start' */ },
  onError: (code) => { /* typed slug, e.g. 'mic-denied' */ },
  disabled: S.busy !== null,
  capabilities: S.health?.capabilities,   // { localTranscription: boolean }
});
container.append(voice.element);
// ... later, ALWAYS:
voice.destroy();

// --- scene, one instance per step; destroy before re-rendering
const scene = createTeachingScene({
  visual: step().visual,                  // the validated core.mjs visual, as-is
  locale: S.locale,
  age: S.profile.age,                     // optional; wording only
  onTurn: (type, detail) => { S.assisted ||= false; /* interaction, NOT correctness */ },
  onEvent: (type) => {},
  checkMode: S.stepIndex === 2,           // fresh check: no keyed value is seeded
});
container.append(scene.element);
scene.destroy();
```

`destroy()` is mandatory on every re-render and on navigation. It stops all tracks,
timers, recognition and speech, and drops late callbacks. Neither module submits
anything; both are pure DOM with no imports.

## capabilities contract

`capabilities.localTranscription === true` means **the backend really runs local
Whisper** (`lesson/voice.mjs` + `voice_bridge.py`, HF_HUB_OFFLINE=1). Anything else —
`false`, `undefined`, no health response — means route 1 is off. It never means
"use the cloud". On Vercel this must be reported `false` unless a local Python path
genuinely exists there.

## The two transcription routes, and the third that does not exist

| route | when | where the audio goes |
|---|---|---|
| 1. local Whisper upload | `localTranscription === true` | same-origin `POST /api/transcribe?locale=en\|es`, blob `Content-Type`, `x-adult-test: true`, 30 s / 1 MB cap, decoded by a local subprocess |
| 2. browser on-device | route 1 absent **and** `SpeechRecognition.available({langs,processLocally:true})` is `available`/`downloadable` | nowhere. Recognition runs in the browser after an explicit "Download the speech pack" click |
| ~~3. cloud speech~~ | **never** | — |

Route 2 detail, because the failure mode here is silent and severe: Chrome's
`SpeechRecognition` **defaults to cloud**. The module therefore (a) calls
`available({processLocally:true})` before offering anything, (b) renders the download
control only when a real pack is installable — never hidden-but-present, (c) sets
`processLocally = true` and **reads it back**, refusing with `ondevice-refused` if the
browser swallowed the flag, and (d) fails closed on any install failure with
`pack-failed`, leaving Record disabled and never attempting cloud recognition.
A test asserts the sneaky case: a recognizer that accepts the property and reports
`false` must never be started. Typing always remains the full answer path.

Playback is `speechSynthesis` restricted to `localService === true` voices, started
only by a Listen click, with Stop and a bounded single `voiceschanged` wait.

## Scenes

Five kinds, driven entirely by the validated visual: `fraction` (shade up to a part),
`numberline` (drag/arrow a marker), `tokens` (count off), `passage` (select a
sentence, rendered verbatim and never translated), `sequence` (staged stages).
Play/Pause/Replay never autoplay; the staged reveal walks the same learner state the
controls write, so Play demonstrates the manipulation rather than running a separate
animation track. `prefers-reduced-motion` lands on the finished state immediately —
no content is ever gated behind motion. `onTurn` fires on real interaction only and
carries no verdict; machine-driven reveals never fire it.

`checkMode: true` seeds nothing from the visual (`filled: 0`, value at `min`), so the
fresh check cannot leak its answer through the picture. No answer field is accepted.

## Evidence

`node lesson/tests/delivery-media-browser.mjs [voice|scenes|all]`

Latest full run: **55 passed, 0 failed** (voice 36, scenes 19).
Screenshots + `run.log`: `delivery/evidence/media-20261003T174641Z/` (27 PNGs — five
kinds × EN/ES × 320/1440, check mode, reduced motion, voice ready/denied/on-device/
unsupported). Incumbent `core.test.mjs` + `voice.test.mjs`: 62/62 still green.

### What this evidence is NOT

The harness runs Chrome 153 with `--use-fake-device-for-media-stream --mute-audio`.
The microphone is a synthetic tone, `speechSynthesis` is a plain JS object,
`SpeechRecognition` is a fake with the Chrome 153 surface, and `/api/transcribe` is a
stubbed `fetch` returning handwritten strings. **No real microphone, speaker or camera
was activated, and no transcript in the harness came from a model.** The camera is
never requested by the product or the harness. Real local-Whisper transcription is
proved separately and independently by the incumbent `voice.test.mjs` REAL-MODEL cases.

## Unresolved — two-way voice on kaizenedu.net

Route 2 is implemented and fully exercised against a synthetic recognizer, which
proves the **control flow and the fail-closed guarantees**, not working transcription.
Still unmet:

1. A real `SpeechRecognition.install()` language-pack download has not been performed
   (coordinator's probe observed `downloadable` for en-US and es-ES; nothing installed).
2. No genuine audio has been transcribed through route 2 — not synthetic, not real.
   API presence plus a passing mock is **not** working transcription.
3. Unverified on the deployed origin: pack availability there, the
   `on-device-speech-recognition` permission policy, and non-Chromium browsers (which
   have no `processLocally` and will correctly show the OFF state).

Feasible privacy-preserving path, in order: (a) bounded isolated-browser test that
calls `install()` for real and feeds a **synthetic** audio track through route 2,
labelled synthetic; (b) if that lands, verify the same on the preview origin; (c) only
then is two-way voice on the domain demonstrated. Contingency if (a) fails twice:
Transformers.js in-browser Whisper with `allowRemoteModels=false` and self-hosted ONNX
assets — a large dependency, not installed, and not to be added before (a) is tried.

Until then: on the domain, voice is honestly OFF or gated behind the explicit download,
and typed answering is complete and unaffected.
