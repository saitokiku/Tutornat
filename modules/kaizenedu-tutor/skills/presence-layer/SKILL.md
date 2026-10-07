---
name: presence-layer
description: The tutor's face and presence — the call-style session layout, the AvatarDriver and its 2D rig states, backchannels and silence check-ins, on-device attention sensing with MediaPipe, the attention-recovery ladder, and the no-face-data-egress rule. Load it when you build or change anything under components/tutor (avatar, layout, presence), lib/tutor/presence, the attention parts of the orchestrator, the parent-facing attention report, or when a change involves the camera, face landmarks, Rive or Lottie, or the recovery ladder.
---

# Presence layer

Spec §5.10 (A face, B attention sensing, C recovery, D young-kid defaults), D14, D15, D16, R28, R29, R30. Constants: `kaizen.config.ts` `BANDS` (silence check-in, attention threshold, camera default, movement break), `ATTENTION` (ladder step 10 s, pause after 2 min away, sensor 5–10 fps, scorer 2 Hz). Library facts: `docs/TOOLING.md` (Rive, MediaPipe, vad-web).

## The line we do not cross

Attention recovery, not engagement maximization (D15). No streaks, autoplay, rapid cuts, reward loops, guilt about leaving, or asking to come back. Recovery steps return to the lesson, never to a reward. The session ends at its scheduled length regardless of attention. Session length is never a success metric for minors; the only attention KPI is "recovered to task and finished on time". The face never claims to be a person; asked, the tutor says it is an AI tutor with a character.

Vision is on-device only (D16). No frame, landmark, embedding, or template is transmitted or stored, ever: not in the database, object storage, logs, analytics, error reports, screenshots, or debug output. The server sees a coarse state `{attending, drifting, away, no_face}` and per-session aggregates (`attention_stats`, `recovery_events`). `tests/invariants/no-camera-egress.test.ts` enforces the static half (camera code only under `components/tutor/presence/` and `lib/tutor/presence/`, and those files make no network calls); presence-42 adds the Playwright network audit that records every request during a session with the camera on and asserts no body carries image data. Run `.claude/skills/presence-layer/scripts/no-egress-audit.sh`.

## A. The face (Gate 1, every band)

Layout like a video call: tutor tile large, whiteboard tile beside or below, learner self-view small (only when the camera is on), controls (mute, camera, end), a persistent "AI tutor" label (`PRODUCT.aiLabel`), session timer. One focal point at a time: the face when talking, the board when drawing, the learner's input on their turn.

`AvatarDriver` interface in `components/tutor/avatar/driver.ts`:

```ts
export type AvatarState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'at-whiteboard' | 'reacting';
export interface AvatarInputs { state: AvatarState; mouth: number /* 0–1 amplitude or viseme weight */; gaze: { x: number; y: number }; expression: 'neutral' | 'smile' | 'not-quite' | 'curious' }
export interface AvatarDriver { mount(canvas: HTMLCanvasElement): Promise<void>; set(inputs: Partial<AvatarInputs>): void; unmount(): void }
```

The 2D rig (Rive first; Lottie if Rive tests poorly) implements it; a 3D VRM rig can replace it later without touching the orchestrator (R31). State sources: VAD → `listening`; LLM stream start → `thinking` (covers end-of-speech to first audio, which makes the latency budget feel like a natural beat); TTS playback → `speaking` with `mouth` from the playback queue's amplitude (visemes when the provider returns timing); whiteboard action executing → `at-whiteboard`; check result → `reacting` (a smile on correct, a soft "not quite" on wrong, never fireworks).

Backchannels ("mm-hm", "right") only during learner utterances longer than ~6 s, at most once per utterance. Silence check-in: learner quiet mid-task for `BANDS[band].silenceCheckInMs` → a short question, not a restatement. Both rules have scripted tests (presence-39). Respect `prefers-reduced-motion`: fewer idle motions, no blur or scale transitions; the rig still shows state.

## B. Attention sensing (Gate 2 opt-in 9–12; Gate 3 default-on 4–8; off 13+)

Two signal sources, cheapest first. Non-camera signals are always on: no response for N seconds, tab hidden or window unfocused (Page Visibility API), no pointer or touch activity, answer patterns that look like button-mashing. At Gate 1 they are logged, not acted on (R28).

Camera signal (consented, on-device): `@mediapipe/tasks-vision` `FaceLandmarker` in the browser, `runningMode: 'VIDEO'`, `numFaces: 1`, blendshapes on for `eyeBlinkLeft/Right`, the transformation matrix for head yaw and pitch, sampled at ≤ 10 fps. A local scorer turns face-present, yaw, pitch, eyes-open into one state at ~2 Hz with hysteresis. Device check at session start: if the model cannot hold 5 fps, camera sensing is off for the session and the parent is told. A visible indicator runs whenever the camera is active; the learner (in kid language) and the parent both know the tutor can tell if you are looking. Parent toggle in settings; the tutor works without it.

The `<video>` element and the landmark results never leave the presence module. No `canvas.toDataURL`, no `toBlob`, no `ImageCapture`, no screenshot of the tile, no Sentry replay, no PostHog session recording. The reporter module that sends `{state, ts}` and the session aggregates imports nothing from the sensor's DOM.

## C. Recovery ladder (paired with B)

When state is `drifting` or `away` longer than `BANDS[band].attentionThresholdMs`, escalate one step per `ATTENTION.ladderStepMs`, logging each step's outcome to `recovery_events`:

1. Prosody and name: change of pace and "Maya — look at this." (parent-entered display name only).
2. A direct, answerable question that requires a response, with the turn cut short.
3. Modality switch: draw on the whiteboard, animate it, ask them to point or tap.
4. A 20–30 s "your turn" micro-interaction tied to the current skill (drag pieces, count, sort).
5. Movement break (4–8 only): "Stand up, stretch, count to ten with me," then back.
6. `away` past `ATTENTION.pauseAfterAwayMs`: pause, save state, notify the account holder (4–8 immediately; 9–12 in the summary).

The parent can disable any step; the parent report shows attention % and recoveries and which tactics worked. The ladder never raises the whole session's cut rate. Offline, where attention drops during an explanation is a signal to fix that explanation, not to add stimulation.

## D. Young-kid defaults (Gate 3)

Sessions ≤ 10 min with one skill target; voice-only interaction with big tap targets and no text the child cannot read aloud; camera sensing and the full ladder on by default under parental consent; parent notified on pause; a parent may sit in (self-view shows both) and the tutor addresses the child.

## Tests before Gate 2

Five-kid usability test (presence-45): avatar acceptance (creepy or babyish → change the rig), indicator comprehension, the ladder felt as help not nag. Findings filed in `docs/evidence/`.
