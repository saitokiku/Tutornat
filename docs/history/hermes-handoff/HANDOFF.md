# Start here: actual handoff state

## Delivery status

The owner requested a clean repository to continue with another workflow. This export preserves the working source without claiming it is shippable. Original files and running previews were not edited by the export. Git history starts fresh; upstream provenance and license notices are retained.

This file takes precedence over stale implementation-status statements in other documents. In particular, `lesson/STATUS.md` still has an old “CONTROLLING CURRENT STATE” heading that incorrectly says the candidate is not integrated and its tree is clean. It is preserved as historical evidence, not current authority.

## Latest product requirement

“our tutor stage is not as extenisve as openmaic, make it atleast that and then better”

The entire OpenMAIC teaching stage is the baseline, not a reduced reimplementation. Restore reachable functionality first, then demonstrate improvements in relevant visual teaching, usable interaction and learning continuity. Source presence does not establish runtime availability or educational quality.

Retain the Kaizen dashboard/library around the stage, all-age/open-topic teaching, EN/ES, one learner-facing tutor and the intended quiet stage-artist/learning-coach roles. Camera remains off; audio/microphone require explicit action. Keep nicknames local and private learner turns out of reusable lessons. Do not represent completed activities, helpfulness votes or game scores as proven mastery.

## Work that actually exists

- The complete pinned OpenMAIC source is in `classroom/`; dependencies were installed and its native Anthropic path ran on the original machine.
- Kaizen profile/topic entry, catalogue and course routes are under `app/kaizen`, `components/kaizen`, and `lib/kaizen`.
- The Kaizen course page mounts upstream `ClassroomSurface` and `components/stage.tsx`, not a separate toy renderer. The `soloTutor` addition narrows the speaking roster by the registered `teacher` role. Targeted unit tests and historical real streamed-chat/owner-reload checks passed. Scope: speaking selection, not a new multi-role orchestration system.
- Native provider integration and bounded OAuth refresh are in `lib/ai/anthropic-oauth.ts`, `lib/server/anthropic-oauth-refresh.ts`, `lib/ai/providers.ts` and `instrumentation.ts`. The original launcher refreshes credentials periodically; a five-minute stale-token window and retaining an old token on resolver failure remain known limitations.
- A historical four-scene lesson persisted and reopened under its generating owner. Its database, browser cookie and generated content are not in this export. Recreate test data on the next machine rather than expecting that lesson ID to exist.

## What was not delivered

The stage-parity implementation worker failed before writing any application code. Its work must not be presented as an implemented feature. The practice-history worker likewise wrote no files. The separate parity-inventory worker was interrupted; no complete independently accepted parity matrix was delivered.

No full-stage parity, production build/release, real-child readiness, learning efficacy, complete accessibility, full Spanish stage behavior or working tutor → quiet artist/coach coordination is established.

## Confirmed gaps and useful starting points

1. **Hidden/disabled capability boundaries.** `delivery/fullstack/native/launch.mjs` disables the durable agent runtime; the candidate YAML locks TTS/ASR/image/video/search/document capabilities off. `lib/config/feature-flags.ts` separately gates courseware reference, editing/workbench and experimental features. Do not turn every flag on blindly: inspect dependencies and test each capability. Existing whiteboard, scene navigation, speed, chat and export controls were visible in the real candidate.
2. **Mobile layout.** An actual 390px-wide screenshot showed a small instructional slide within a much larger empty stage, a play overlay obscuring the fraction diagram, crowded controls and a tutor bubble narrow enough to wrap “everyone” across multiple lines. The body had no horizontal overflow; that did not make it usable. Fix shared layout, not the screenshot or one lesson alone.
3. **Dropped learner-turn cue.** Trace `lib/chat/pi/tools/cue-user.ts` through the stream buffer and `components/chat/use-chat-sessions.ts` to `PlaybackChromeRoot.tsx`: prompt text is carried by the transport but discarded at the UI callback. Persisting a real next-practice cue is unfinished; do not manufacture one from arbitrary chat text.
4. **Unimplemented roles.** A comment in `lib/orchestration/registry/agent-selection.ts` says artist/coach remain tools of the tutor. That is intent, not implemented coordination. Preserve the single visible tutor while wiring actual lesson/turn-scoped actions, cancellation and stale-result rejection.
5. **Private practice history.** Reuse `getRuntimeStore`, `loadChatSessions(stageId)` and existing learner ownership checks. Cross-course history needs bounded per-stage reads. `loadChatSessions` already respects deletion markers; do not read raw old records and resurrect deleted turns. Assistance is not understanding.

The source-backed inventory in `delivery/fullstack/teaching/TOOLKIT_AND_QUALITY.md` and API contract in `delivery/fullstack/native/UI_CONTRACT.md` provide useful code paths, but contain historical runtime observations. Validate current behavior rather than repeating their old status labels.

## Working discipline for the next workflow

Work directly from this repository with one owner per shared file. Finish a concrete visible defect or capability and exercise it before expanding scope. Preserve existing tests; distinguish offline fixtures, live provider calls, browser interaction and human educational validation. Do not restart audience discovery or replace the upstream engine. Do not invoke unavailable providers or silently weaken the owner's privacy/model policy.

Historical model-role and machine-specific instructions in project documents describe the previous environment; they do not configure the next coding tool. The next operator must supply credentials and choose their execution environment. The application itself runs through its standard Next.js/pnpm/PostgreSQL setup without Hermes.

## Export exclusions

No original Git history, local `.env` values, access tokens, browser storage state, cookies, database/runtime stores, private learner conversations, generated lesson library, raw logs/traces, dependency directories, build output or old frozen source snapshots are included. Earlier frontend/lesson source is retained. SHA-256 copy coverage is recorded in `EXPORT_MANIFEST.json`.

Do not deploy the original machine's OAuth resolver or credentials. There is no new production deployment in this handoff.
