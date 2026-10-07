# `lib/tutor/presence`

The rules behind the tutor's sense of whether the learner is still with it, and
what it does about it. Spec §5.10 A–C, decisions D15 and D16, requirement R28.

Everything in this directory is pure: a function takes `now`, the band, and the
signals the session screen already has, and returns a decision. There is no
clock, no DOM, no store, and — deliberately — no `fetch`. The screen
(`components/tutor/session/`) reads the browser, calls these functions, performs
the step, and posts the result to `POST /api/tutor/attention`. That split is
what lets `tests/tutor/presence-rules.test.ts` drive the whole ladder under fake
timers, and it is what keeps the camera invariant checkable.

| File | What it decides |
| --- | --- |
| `rules.ts` | The silence check-in (`shouldCheckIn`), display-only backchannel cues (`stepBackchannel`), the coarse attention state from non-camera signals (`attentionStateFor`), sampling (`stepSampler`), and aggregation to counts (`aggregateSamples`). |
| `ladder.ts` | The recovery ladder: which rung is next, when it may fire, which rungs the parent switched off, and when `away` becomes a pause-and-notify. |

## What is here at Gate 1

Non-camera signals only: page visibility, pointer and keyboard idleness, and a
check-in that went unanswered. They produce `AttentionState` values of
`attending`, `drifting`, and `away`. `no_face` is a camera verdict and is never
produced by this code.

The ladder runs only for bands whose `BANDS[band].attentionThresholdMs` is not
null — 9-12 and 4-8. For 13-17 and adult the signals are recorded and nothing
escalates (R28). Steps 1–4 and 6 can fire today; step 5 (the movement break)
additionally needs `BANDS[band].movementBreak`, which is true only for 4-8, so it
waits for Gate 3.

## Camera sensing is Gate 2 work, and it lands here

On-device face landmarking (`@mediapipe/tasks-vision` `FaceLandmarker`,
`runningMode: 'VIDEO'`, one face, ≤ 10 fps, a local scorer at ~2 Hz with
hysteresis) is Gate 2 (spec §5.10 B, D16). When it is built it must live in this
directory or in `components/tutor/presence/`, and nowhere else:

- `tests/invariants/no-camera-egress.test.ts` fails the build if any file
  outside those two roots opens a camera (`getUserMedia` with a `video`
  constraint, `getDisplayMedia`, `ImageCapture`, `FaceLandmarker`,
  `@mediapipe/tasks-vision`, `captureStream`, `MediaStreamTrackProcessor`);
- the same test fails if a file in those roots that opens a camera also makes a
  network call (`fetch`, `WebSocket`, `sendBeacon`, `XMLHttpRequest`,
  `EventSource`, `postMessage`).

So the sensor module owns the `<video>` element and the landmark results and
exports only a coarse `AttentionState`; the reporting is done by the screen,
which never imports the sensor's DOM. No frame, landmark, blendshape,
embedding, or template may be transmitted or stored — not to the database, not
to object storage, not to logs, analytics, error reports, or a screenshot of the
tile. `presence-42` adds the runtime half (a Playwright audit that records every
request during a camera-on session); run both halves with
`bash .claude/skills/presence-layer/scripts/no-egress-audit.sh`.

Two more Gate 2 obligations that belong with that work: a device check at
session start that turns camera sensing off for the session when the model
cannot hold `ATTENTION.sensorMinFps`, and a visible indicator whenever the
camera is active, in language the learner and the parent both understand.
