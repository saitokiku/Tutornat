# Attention scorer (on-device, `lib/tutor/presence/scorer.ts`)

Inputs per sampled frame (≤ 10 fps): `facePresent: boolean`, `yawDeg`, `pitchDeg` (from the facial transformation matrix), `eyesOpen: number` (1 − mean of `eyeBlinkLeft`, `eyeBlinkRight` blendshape scores).

Per-frame classification:

| Condition | Frame class |
| --- | --- |
| no face for the frame | `no_face` |
| `|yaw| > 35°` or `|pitch| > 25°` or `eyesOpen < 0.3` | `away` |
| `|yaw| > 20°` or `|pitch| > 15°` | `drifting` |
| otherwise | `attending` |

State at 2 Hz with hysteresis: enter `drifting` after 3 consecutive drifting-or-worse frames at 5 fps (about 600 ms); enter `away` after 5 consecutive away-or-no_face frames (1 s); return to `attending` only after 4 consecutive attending frames (800 ms). Blinks (eyesOpen < 0.3 for ≤ 2 frames) never change state. Non-camera signals override toward `away`: tab hidden or window unfocused → `away` immediately; no pointer, touch, or speech for the band threshold → `drifting`.

Aggregates written at WRAP: `attending_pct`, `drift_count`, `away_count`, `recoveries` (ladder steps that returned the learner to `attending` within one step), `camera_enabled`. Nothing per-frame is stored.
