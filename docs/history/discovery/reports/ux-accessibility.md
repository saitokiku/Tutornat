# Role C — UX, workflow, and accessibility assessment

**Date:** 2026-09-30  
**Scope:** pinned, local source review of `Kaizen-AI`, `KaizenEdu`, `trellis`, and `Tutornat`  
**Deliverable posture:** discovery report only; no prototype, mockup, product selection, or application change

## Executive conclusion

There is no single, source-backed end-to-end experience today that takes a learner from AI work to a human tutor, through a human session, and back into learner and household follow-up.

`Kaizen-AI` contains the strongest human-tutor machinery, especially for small-group rooms: public schedule discovery, authenticated booking, guardian consent, waitlisting, room entry, tutor prep, a live roster/help queue, attendance, structured exit ratings, and delayed checks. But its currently presented business direction explicitly cuts private 1:1 tutoring. The learner-side `TutorBooking` surface is unmounted, the public tutor directory/profile is gated and deliberately has no booking action, while the tutor workspace still mounts legacy 1:1 session, observation, and recap tooling. This is useful source work, not a coherent current offer.

`KaizenEdu` has the strongest learner session shell and household follow-up: microphone-denial fallbacks, typed input, a running transcript, whiteboard, end-of-session wrap, parent reports, transcripts, and weekly email. It does not implement a mounted learner-facing human-tutor discovery, booking, or intervention path. Its human inbox is explicitly support, not tutor handoff.

`trellis` contributes a narrow but useful learning-record model and unusually disciplined language separating assisted practice from independent proof. Its mounted web experience is a small fixed lesson/chat and a one-learner parent view; it has no human-tutor workflow. A fuller parent-report library exists in the snapshot but is not the parent route that is mounted by this web app.

`Tutornat` has no reviewable product implementation in the pinned snapshot: one tracked, three-line README.

**Highest-payoff reuse:** preserve `Kaizen-AI`’s group-room operating loop and `KaizenEdu`’s learner session/household communication foundation. Do not fuse them until the owner chooses the human service model: group/in-person, private video, or an asynchronous help request. That is a product and operating decision, not a styling decision.

### Decision-changing findings

Confidence here describes the source interpretation, not runtime reliability or usability.

| Rank | Status | Observation and evidence | Consequence | Confidence |
|---:|---|---|---|---|
| 1 | **Unknown / owner decision** | The mounted product exposes a group schedule, an operator message, and tutor-side legacy 1:1 operations, but no single end-to-end learner → human → household path (`web/components/ScheduleBrowser.js:103-148,224-293`; `web/components/ProgressView.js:326-380`; `web/app/tutor/page.js:204-218,415-523`). | Choose the service/operating promise before selecting navigation or a prototype concept. | High |
| 2 | **Keep** | `Kaizen-AI`’s group loop covers discovery, booking/waitlist, intake, shared-needs brief, roster/help queue, attendance, human ratings, interruption-safe save, and delayed check (`web/components/DropInSessions.js:172-220,226-391`; `web/components/TutorClasses.js:115-280,423-575`; `web/components/ExitRatings.js:83-310`; `web/app/api/tutoring/group/brief/route.js:185-227,235-321`). | This is the strongest reusable “AI supports the human tutor” spine. | High |
| 3 | **Repair** | The group tutor’s practical exit summary is stored and visible in the tutor roster, but no mounted learner/household reader was found; `familySummary` does not query it (`web/app/api/tutoring/group/roster/route.js:148-192`; `web/lib/server/familySummary.js:28-71`). | The best current human loop ends without its human-authored next step reaching the household. | High |
| 4 | **Repair** | `/api/handoff` writes/emails an operator message but assigns nobody and exposes no owner, SLA, response, or resolved state (`web/app/api/handoff/route.js:1-70`). | Calling it tutor help would over-promise; it needs an accountable service lifecycle or narrower copy. | High |
| 5 | **Repair or retire** | Public/learner code says private 1:1 is cut and `TutorBooking` is unmounted, while `/tutor` still mounts 1:1 session, observation, video, and recap. The recap sends generated copy before tutor preview (`web/components/ProgressView.js:326-339`; `web/app/tutor/page.js:415-523`; `web/app/api/tutoring/recap/route.js:32-89`). | Latent code can create mismatched promises and uncontrolled household communication if partially reactivated. | High |
| 6 | **Keep / adapt** | `KaizenEdu` has the strongest learner session recovery and household communication foundation: typed microphone fallback, transcript, wrap, generated labeling, report, and weekly email. It has no human-tutor bridge (`components/tutor/session/use-tutor-session.ts:294-320`; `components/tutor/session/dock.tsx:34-46,113-188`; `components/tutor/parent/overview.tsx:26-47,67-170`; `lib/tutor/email/weekly.ts:167-287`). | Reuse its interaction and reporting patterns, not an assumed human-tutor product. | High |
| 7 | **Repair before external use** | Source inspection finds missing dialog/focus semantics in key `Kaizen-AI` overlays, weak explicit call recovery, pointer-only `KaizenEdu` push-to-talk, no reviewed board equivalent, and basic semantic gaps in `trellis` (`web/components/BookModal.js:183-187`; `web/components/VideoCall.js:85-128`; `components/tutor/session/dock.tsx:96-106,134-148`; `components/tutor/board/board-pane.tsx:13-60`; `web/app/learn/chat.tsx:51-69`). | The human-service path is not source-ready for a keyboard/screen-reader/call-failure claim. | Medium (static review only) |
| 8 | **Unknown / no evidence** | `Tutornat` has one tracked, three-line `README.md` and no product surface (`README.md:1-3`). | Exclude it from capability and UX claims unless another artifact is supplied. | High |

## Evidence and claim discipline

### Pinned revisions

| Attempt | Pinned revision | Reviewed product surface |
|---|---|---|
| `KaizenEdu` | `cd3dfa82fe09dd66b1fb7e78af9375aef5fcecc3` | learner/session/parent routes, components, styles, support, email, and saved screenshots |
| `Kaizen-AI` | `91af9e452c7df5867afa7249a6dc58b00003f531` | public, learner, family, tutor, booking, room, recap, and handoff surfaces |
| `Tutornat` | `1c2f4925215e9fb0a27ab76863ca88de931bc5d3` | sole tracked README |
| `trellis` | `41999b5dd49e5549662da8c5b42c0bb8bbe8804a` | mounted web routes plus record/session/report support code |

All four snapshot worktrees were clean when checked. The source manifest and repository-local instructions were reviewed before this report.

### Execution and verification log

- Ran `git rev-parse HEAD` in all four snapshots: every value exactly matched the pinned revision above.
- Ran `git status --porcelain` in all four snapshots: every result was empty; this report changed none of them.
- Ran `git ls-files`: `KaizenEdu` 3,461 tracked paths, `Kaizen-AI` 598, `trellis` 517, and `Tutornat` 1. The review was targeted to Role C rather than a claim of exhaustive reading of every tracked path.
- Used bounded source searches and line-range reads to trace imports/mounts, routes, state branches, persistence, tutor/learner/household APIs, styles/tokens, and saved evidence assets. Existing screenshots were inspected only as static design evidence.
- Ran a final local report check: all required sections were present; 107 explicit file/line references resolved to an existing reviewed snapshot file with sufficient line range; every snapshot still matched its pin and remained clean.
- Product tests, servers, production browsing/accounts, dependency installation, runtime browser QA, and external-user research were not run. This is the assigned static-review boundary, not a passing result. There was no blocker to completing the report; runtime and usability behavior remain deliberately unverified.

### Labels used below

- **Observed implementation:** present in reviewed source and mounted by a route/component path. This is not a claim that a deployment works.
- **Implemented but unmounted:** substantial code exists, but the reviewed mounted-use search found no active consumer.
- **Static design evidence:** a repository screenshot or style artifact; not runtime or usability evidence.
- **Documented intent:** comments, README, or skill guidance; not proof that users can complete the behavior.
- **Inference:** a conclusion from connected source evidence, explicitly marked.
- **Proposal:** a decision or validation step for the owner; not current behavior.

### Limits

This was a static source and artifact assessment. No server was started; no production account or browser journey was used; no keyboard-only, screen-reader, automated accessibility, responsive runtime, network-failure, camera/microphone-permission, or live-call test was run. The six `KaizenEdu` screenshots reviewed are static evidence only:

- `docs/evidence/step-2/welcome-m-light.png`
- `docs/evidence/step-2/learn-m-light.png`
- `docs/evidence/step-3/session-pointing-m-light-viewport.png`
- `docs/evidence/step-2/session-d-dark.png`
- `docs/evidence/step-2/parent-m-light.png`
- `docs/evidence/step-2/parent-report-m-light.png`

They show that mobile learner, mobile session, desktop dark session, mobile parent, and mobile parent-report compositions were intentionally captured. They do not demonstrate keyboard behavior, assistive-technology output, responsive transitions, color contrast, data accuracy, or task success. No external-user or validated-usability findings exist in the supplied evidence.

## 1. `Kaizen-AI`: current routes and workflow evidence

### 1.1 Reachable product shape

| Surface | Role and primary job | Source-backed state |
|---|---|---|
| `/tutoring` | Public explanation and routing to group offerings | Points people to schedule filters such as clinics; current copy frames rooms/standing seats rather than private 1:1 (`web/app/tutoring/page.js:132-140`). |
| `/schedule` | Public weekly schedule; authenticated booking entry | `ScheduleBrowser` separates loading, failed, empty, held/preview, live, full, and waitlist states. Signed-out booking stores a return path and sends the user to `/dashboard`; signed-in booking opens `DropInSessions` for the chosen room (`web/components/ScheduleBrowser.js:1-18,103-120,122-148,177-206,224-293`). |
| `/dashboard` | Signed-in learner work: Today, Plan, Learn, Grades, Growth | Tabs are URL/history-backed; learner state is initially local and can sync to cloud. `ProgressView` mounts on Growth, and `ChecksDueCard` provides a group drop-in entry. No mounted `TutorBooking` import/render was found (`web/app/dashboard/page.js:4-45,74-83,148-159`; `web/components/ChecksDueCard.js:17-23,63-69,119-122`). |
| `/family` | Parent-managed learners, standing seats, records, and group booking | Parent can inspect each child’s seat and learning record and open `DropInSessions` with a child identifier. The page explicitly removed private 1:1 offers (`web/app/family/page.js:3-26,39-40,77-95,111-125,304-340,427-433`). |
| `/tutor` | Tutor/operator workspace | Mounts `TutorClasses` for group rooms first, plus legacy 1:1 session cards, `TutorObserve`, video, recap, availability, profile, and earnings (`web/app/tutor/page.js:3-20,29-50,79-100,204-218,415-523`). |
| `/tutors` and `/tutors/[slug]` | Public people directory/profile behind marketplace gate | Directory distinguishes load failure from an honestly empty bench. The profile deliberately describes the tutor but does not sell or book them; the source says 1:1 rates and “Book a session” were removed as cut products (`web/components/TutorDirectory.js:3-17,46-103,176-226`; `web/components/TutorProfile.js:3-18,39-75`). |

**Surface fit — inference:** `/schedule` is an Explore surface; `/dashboard` is primarily Monitor with embedded Operate tasks; `/family` is Monitor plus Configure; and `/tutor` is an Operate console. Those compositions broadly match their jobs. The dominant UX problem is not a hero/card-style mismatch; it is the missing transition and service contract between those role-specific surfaces. In the comparison attempts, the `KaizenEdu` session is an Operate surface and its parent report is Monitor; `trellis` uses a small Operate learner surface and Monitor parent surface.

### 1.2 Learner → group human tutor → follow-up, as implemented

1. **Discover a room.** The public schedule groups real sessions by the room’s timezone and preserves full rooms rather than hiding them. Filters expose room kind and grade band. Failure is not rendered as “nothing this week” (`ScheduleBrowser.js:33-48,177-220,248-293`).
2. **Authenticate without losing intent.** A signed-out person is sent through `/dashboard`; `kaizen.returnTo` brings them back to the original local route after authentication (`ScheduleBrowser.js:144-148`; `web/app/dashboard/page.js:148-159`).
3. **Book or waitlist.** `DropInSessions` loads the authenticated room quote, asks for guardian consent, accepts a general note or structured Hall intake, posts the seat, redirects to checkout when needed, handles a room filling mid-checkout, and supports waitlist join/leave (`web/components/DropInSessions.js:172-220,226-283,285-339`). A parent can book for a linked child by passing `childId` from `/family` (`web/app/family/page.js:338-340,427-429`).
4. **Manage the seat.** “My sessions” loads separately. Included seats can require confirmation; cancellation explains the concrete refund/allowance consequence, posts a deletion, and can offer alternative rooms (`DropInSessions.js:211-224,342-391`). No learner-facing reschedule state was found; the user cancels and books an alternative.
5. **Bring context into the room.** Hall booking gathers subject, topic, where the learner is stuck, and a goal. The tutor’s group brief endpoint combines the roster’s intake and per-concept learner records, finds a shared weak area, and can produce a short pre-session brief (`DropInSessions.js:180-183,235-263`; `web/app/api/tutoring/group/brief/route.js:1-29,42-58,74-135,168-227`).
6. **Run the human room.** `TutorClasses` orders work by operational urgency, exposes Brief, Ratings, Roster, and Join, and opens group `VideoCall`. The roster can poll the live help queue and records attendance/no-show and an exit form. `VideoCall` obtains a scoped Daily room/token, exposes Leave and “Report a concern,” and can show a Hall board as a desktop side rail or mobile bottom sheet (`web/components/TutorClasses.js:3-8,115-129,148-188,200-280`; `web/components/VideoCall.js:19-35,48-83,85-149`).
7. **Turn human observation into learner state.** `ExitRatings` is mounted from `TutorClasses`. It restores interrupted work from local storage, reconciles against server-recorded ratings, posts only pending observations in bounded batches, and keeps failed writes locally. The group brief route records human-tutor evidence and schedules a delayed independent check (`web/components/ExitRatings.js:3-45,83-136,151-223,232-310`; `web/app/api/tutoring/group/brief/route.js:235-279`).
8. **Record a practical next step.** The tutor exit form stores what was done, what remains, what clicked, and a recommendation of “rebook” or “clinic” (`web/components/TutorClasses.js:501-575`).
9. **Household view.** `/family` and `/api/family/summary` show the standing seat, next room/venue, confirmed learning record, latest weekly report, and a count of completed group sessions. They deliberately distinguish “no seat” from “seat read failed” (`web/app/api/family/summary/route.js:1-27,35-68,71-117,120-169`; `web/lib/server/familySummary.js:1-17,28-71`).

**Broken final edge — observed:** the group exit object is written to the group seat and shown back inside the tutor roster, but no mounted learner or family consumer was found. `familySummary` reads profile, courses, homework, weekly report, and mastery; it does not read `group_seat.exit` (`web/lib/server/familySummary.js:28-71`). The family therefore sees record movement and attendance, not the tutor’s “what got done / what remains / next step” narrative. This is the clearest current follow-up gap.

### 1.3 AI/session → asynchronous person, as implemented

The Growth tab contains a “Stuck after real effort?” message flow. It posts the learner’s note plus course and weakest concept to `/api/handoff`; the route writes `human_handoff_requests` and emails an admin address when configured. The UI correctly distinguishes a real delivery from a demo no-op (`web/components/ProgressView.js:223-301,326-380`; `web/app/api/handoff/route.js:1-4,11-40,41-70`).

This is **a message to club operators, not tutor assignment or booking**. The API has no assignment, owner, service-level clock, in-progress state, learner-visible reply, resolved state, or link to a room. Its source explicitly says it “assigns nobody” (`web/app/api/handoff/route.js:1-4`).

### 1.4 Private 1:1 flow: substantial code, incoherent current reachability

`BookModal`, `TutorBooking`, `TutorObserve`, the 1:1 `VideoCall` path, and the recap endpoint form a technically substantial 1:1 chain:

- `BookModal` loads tutor availability, quotes caller-specific pricing, applies guardian gates, posts `/api/tutoring/sessions`, and can redirect to checkout (`web/components/BookModal.js:42-87,134-180,183-260,328-330`).
- `TutorBooking` handles upcoming sessions, cancellation, joining, and post-session ratings (`web/components/TutorBooking.js:24-92,94-170`).
- `TutorObserve` converts concept ratings into human-tutor evidence and schedules a delayed check (`web/components/TutorObserve.js:37-98`; `web/app/api/tutoring/observe/route.js:110-178,203-253`).
- The recap endpoint stores a tutor-written/AI-polished recap and emails the learner and linked parents (`web/app/api/tutoring/recap/route.js:1-4,32-89`).

However, exact mounted-use searches found **no import or render of `TutorBooking`**. `ProgressView` explicitly says the private 1:1 booking block was removed because it is a cut product (`web/components/ProgressView.js:326-339`). The public profile deliberately has no booking action. `/family` mounts group `DropInSessions`, not `BookModal`. Meanwhile `/tutor` still mounts the legacy 1:1 session/observation/recap side. 

**Inference:** this is latent implementation debt and reusable interaction work, not a currently coherent user journey. It should not be presented as an active capability until the owner explicitly reopens that service model and both sides of the route are reconciled.

### 1.5 Persistence and state ownership

- Learner app state is initially stored under `kaizen.app.v1` in local storage; logout clears local courses, chats, files, concepts, and owner markers to prevent shared-device bleed (`web/lib/appState.js:1-5,21-55`). The dashboard also has cloud pull/push logic and surfaces failed background writes (`web/app/dashboard/page.js:96-101,111-119,161-183`).
- Dashboard tabs are reflected in `?tab=` and remembered; Back/Forward restores tabs. `useHistoryLayer` makes browser Back close registered overlays instead of leaving the page (`web/lib/historyNav.js:3-11,15-62,65-98`). This is useful navigation continuity, but it is not keyboard focus management.
- Group exit-rating and exit-summary drafts persist locally until the server accepts them (`ExitRatings.js:20-25,98-117,179-223`; `TutorClasses.js:501-540`).
- Booking, seats, rosters, human observations, and family summaries are server-backed through authenticated APIs.

## 2. Cross-attempt handoff comparison

| Handoff stage | `Kaizen-AI` | `KaizenEdu` | `trellis` | `Tutornat` |
|---|---|---|---|---|
| Learner AI/session | Mounted dashboard study and learning record; detailed review focused on human edges | Strong mounted voice/text tutor session with board, transcript, checks, and wrap | Mounted fixed lesson/chat against one learner/skill | No implementation |
| Human help discovery | Group offering and public schedule; operator message on Growth | No mounted human-tutor discovery/booking found | None | None |
| Booking/scheduling | Strong group booking, child booking, waitlist, checkout return, confirmation, cancellation | None for human tutor | None | None |
| Context into human session | Structured Hall intake; group brief from roster and learner models | Session transcript/record exists, but no human recipient path | Record seam only; no human recipient | None |
| Human session | Group and legacy 1:1 Daily-call components; tutor room workspace | No human session; the named tutor is AI | None | None |
| Human observation | Group exit ratings and legacy 1:1 concept observation write learning evidence | No human rating; parent surfaces explicitly label outputs as AI-generated | No human rating | None |
| Learner follow-up | Group delayed check; 1:1 email recap exists only on legacy path | Strong wrap recap, next practice, recent sessions | Record updates after practice | None |
| Household follow-up | Seat, attendance, mastery, weekly report; group tutor narrative not surfaced | Parent overview/report/transcripts plus weekly email | Mounted one-learner honest-record view; fuller report library unmounted by this route | None |
| Human support/escalation | Operator request row + admin email, no case lifecycle | General support request row/email, explicitly not tutor handoff | Parent “trap risk” copy; no dispatch | None |

### `KaizenEdu` evidence

**Observed implementation:** the session is a responsive three-pane desktop layout and stacked mobile layout. A direct navigation/reload lands on a ready state; an intentional start gesture unlocks audio. The mounted session distinguishes retrying connection, audio failure, microphone states, recoveries, ordinary errors, terminal stop, and wrap (`components/tutor/session/session-screen.tsx:72-82,105-158,161-260`; `components/tutor/session/session.css:1-14,41-60,99-111,274-349`).

Microphone failure never blocks learning: unsupported, denied, busy, and missing-device states each explain the typed fallback (`components/tutor/session/use-tutor-session.ts:294-320`; `components/tutor/session/dock.tsx:34-46,113-188`). The wrap preserves the distinction among ended, out-of-minutes, and paused and displays a recap, next practice, and feedback (`components/tutor/session/wrap-screen.tsx:18-46,59-88,92-168`).

The parent overview states plainly that summaries are written by the AI tutor and are not human ratings. It links to the full report and transcript. The report carries generated labeling, plain-language weekly context, evidence tables, confirmed-work caveats, next checks, misconception history, and per-session notes (`components/tutor/parent/overview.tsx:26-47,67-125,130-170`; `components/tutor/parent/report-view.tsx:24-32,83-120,171-193,235-277`). Weekly email is deduplicated per learner/week, suppresses empty weeks, observes opt-out, and links to the report (`lib/tutor/email/weekly.ts:1-13,33-72,167-188,190-287`; `lib/tutor/email/templates/weekly-report.ts:1-6,64-138`).

**Not a tutor handoff:** the support inbox’s own contract says it is “not a tutor handoff and not a chat.” It stores one message and attempts email delivery, with honest undelivered copy when not configured (`lib/tutor/support/inbox.ts:1-7,37-41,62-72,100-155`). Session “Report a problem” is a safety/quality report to service operators, implemented with a native dialog; it does not dispatch a human tutor (`components/tutor/session/report-problem.tsx:18-25,39-57,61-142`).

**Static design evidence:** the saved mobile/desktop and light/dark screenshots support the intent encoded in `session.css` and `tokens.css`, but are not runtime proof. The strongest reusable artifact is the source system itself: role/surface tokens, responsive session composition, state copy, and parent communication patterns.

### `trellis` evidence

The mounted learner route keeps the current chat and displayed record in component state for the page visit and posts each turn to `/api/turn`; the turn API can write learning evidence through the configured record seam, but there is no mounted chat/session resume. Errors are appended as tutor-like chat bubbles (`web/app/learn/chat.tsx:9-48`; `web/app/api/turn/route.ts:1-96`). Its record panel reads a server-derived seam when configured and explicitly distinguishes “practised with help” from “proven” (`web/app/learn/record-panel.tsx:9-44`; `web/lib/record.ts:1-25,51-80`). The mounted parent route is one learner/one skill and explicitly warns when repeated help risks preventing an independent check (`web/app/parent/page.tsx:1-46`).

A broader parent-report generator exists under `lib/tutor/report/parent-report.ts` and contains useful generated-label and evidence-language discipline, but `web/app/parent/page.tsx` does not mount it. Treat it as reusable support code, not the current parent experience.

### `Tutornat` evidence

The pinned snapshot contains one tracked file, `README.md`, with only a title and model-version line. There are no routes, components, assets, tokens, state handlers, tutor handoffs, or accessibility surfaces to assess. Any product claim beyond that would be invented.

### AI shadow-work and progress-signal assessment

**Keep:** `Kaizen-AI`’s group brief is the clearest source-backed use of AI to remove human preparation work rather than replace the tutor. It finds shared needs across a room, while the structured roster and rating path remain available without a model call or AI budget. Human ratings—not generated prose—write the evidence, and a delayed independent check tests whether the help transferred (`web/app/api/tutoring/group/brief/route.js:1-24,185-227,235-241,293-321`).

**Keep:** several attempts guard against misleading progress language. `Kaizen-AI`’s Growth tab calls its hinted-session score “practice,” says it is not what the learner can do unaided, and keeps it separate from the evidence ledger (`web/components/ProgressView.js:13-31,172-185,243-257`). Its family summary distinguishes an unprovisioned/read-failed record from a true zero and replays evidence rather than trusting a stale cache (`web/lib/server/familySummary.js:158-177,179-237,240-252`). `KaizenEdu` labels parent content as AI-generated rather than human-rated, and `trellis` distinguishes helped practice from proof.

**Repair:** the async operator handoff transfers only the note, course, concept, and a fixed normal urgency. It does not turn those into an accountable case, send status back, or reconcile a person’s outcome into the learner record (`web/components/ProgressView.js:273-301`; `web/app/api/handoff/route.js:1-70`). This is unclosed shadow work: AI finds a weak concept, but the human still receives an unowned inbox item and the learner cannot see what happened.

**Repair before any 1:1 revival:** “Polish and send recap” generates, stores, and emails model-written copy in one request; the tutor sees the result only after it has been sent. There is no draft-preview-edit-approve step (`web/app/tutor/page.js:437-447,495-517`; `web/app/api/tutoring/recap/route.js:32-89`). That is the wrong control boundary for external household communication, even though the model starts from tutor notes.

**Missing:** `KaizenEdu` automates AI-session recap, parent report, and weekly delivery, but has no recipient or workflow for transferring selected context to a human tutor. `trellis` has a record seam but no human operator at either end.

## 3. Accessibility and inclusive interaction findings

These are static code/design findings, not WCAG conformance claims.

### 3.1 Reusable foundations

**`Kaizen-AI`**

- Global `:focus-visible` styling and reduced-motion handling exist (`web/app/globals.css:54-55,118-123`).
- Shared `Notice` maps failures to `role="alert"` and other statuses to `role="status"` (`web/components/ui/Notice.js:1-25`).
- Shared `Button` keeps disabled labels at a documented contrast target rather than lowering the entire control’s opacity (`web/components/ui/Button.js:39-73`).
- Selection filters and rating controls use native buttons with `aria-pressed`; tutor help-status dots include screen-reader text; several decorative images/icons are hidden or empty-alt.
- Room and family states generally distinguish failure from empty/absent data instead of presenting a confident false zero.

**`KaizenEdu`**

- The tutor system defines role-specific text/target scales: base target `2.75rem` (44 px), kids `3.5rem`, parent `2.5rem`, plus one global visible focus ring and reduced-motion rules (`components/tutor/brand/tokens.css:82-112,174-177,294-310`).
- The transcript is a named `role="log"` with polite live updates and is keyboard-focusable (`components/tutor/session/transcript.tsx:8-16,39-73`).
- Voice failure always has typed input. Mic offer/busy/pressed states, End, More, and menu items have accessible names/states (`components/tutor/session/dock.tsx:113-188,190-249`).
- “Report a problem” uses native `<dialog>` semantics with `aria-labelledby`; native modal behavior provides focus entry, Escape close, and inert background (`components/tutor/session/report-problem.tsx:18-57`).
- Parent reports use sections, lists, a real data table with a caption, generated labeling, and text equivalents beside icons (`components/tutor/parent/report-view.tsx:83-120,171-193,235-277`).

**`trellis`**

- Uses semantic main/section/form/button elements and a status role for unconfigured data notices (`web/app/learn/record-panel.tsx:11-19`; `web/app/parent/page.tsx:13-20`).
- The stylesheet uses 17 px base text and a narrow, mobile-first reading measure (`web/app/globals.css:16-26`).

### 3.2 Priority accessibility gaps

#### A. `Kaizen-AI` overlays do not expose a consistent dialog/focus model — high

`BookModal` and several other overlays are full-screen `<div>` layers without `role="dialog"`, `aria-modal`, programmatic labeling, initial focus, focus containment, return focus, or an Escape handler. Browser Back is supported through `useHistoryLayer`, but that does not replace keyboard modal behavior (`web/components/BookModal.js:183-187`; `web/lib/historyNav.js:65-98`). `VideoCall` is also a full-screen layer without an outer dialog/landmark model (`web/components/VideoCall.js:85-101`).

**Consequence:** a keyboard or screen-reader user can remain in or return to controls behind an apparent modal, lose context when it closes, or have no predictable Escape route.

#### B. Human-call recovery and accommodations are under-specified — high

The app shows “Opening the room,” a generic error, and Close. It does not present its own camera/microphone permission explanation, device selection, retry, reconnect/disconnect, caption/transcript status, or no-show/wait state. The embedded Daily UI may provide some of these, but that was not verified and cannot be claimed from wrapper source (`web/components/VideoCall.js:48-83,114-128`).

**Consequence:** the most consequential human interaction has weaker explicit recovery than the surrounding schedule and booking flows.

#### C. `KaizenEdu` push-to-talk is pointer-only — high for keyboard voice use

The hold-to-talk button starts/stops recording only through `onPointerDown`, `onPointerUp`, and `onPointerCancel`; it has no keyboard handlers or click fallback (`components/tutor/session/dock.tsx:96-106,134-148`). Typed input remains available, so the session is not blocked, but the voice control itself is not source-backed as keyboard-operable.

#### D. `KaizenEdu` whiteboard content lacks a reviewed programmatic equivalent — high for nonvisual learning

`BoardPane` labels the region and announces only item count. The underlying whiteboard is pointer/pan/zoom-oriented; the reviewed source did not expose a text description of its educational content (`components/tutor/board/board-pane.tsx:13-25,27-60`; `components/whiteboard/whiteboard-canvas.tsx:184-270,318-342`). The transcript may repeat some spoken explanation, but equivalence was not established.

#### E. `KaizenEdu` custom menu keyboard behavior is partial — medium

The More menu has appropriate roles, checked state, and Escape close, but no source-backed focus move on open, arrow-key navigation, Home/End behavior, or focus restoration (`components/tutor/session/dock.tsx:72-86,200-249`). Validate against the chosen menu pattern before external use.

#### F. Dynamic announcements need assistive-technology validation — medium

The `KaizenEdu` transcript uses `aria-live="polite"` with `aria-relevant="additions text"` while entries can stream. This may announce useful completed turns or may repeat partial text, depending on browser/screen reader behavior (`components/tutor/session/transcript.tsx:39-73`). `Kaizen-AI` has a reusable live Notice, but many plain loading/status paragraphs are not live regions. Both need real screen-reader observation; source alone is insufficient.

#### G. `trellis` needs a basic semantic interaction pass — high if retained

The learner input has no associated `<label>` and relies on placeholder text. The message stream has no log/live-region semantics, busy/error state is not announced, and the stylesheet defines no visible focus treatment or reduced-motion rule (`web/app/learn/chat.tsx:51-69`; `web/app/globals.css:16-50`). Errors are styled as ordinary Trellis chat messages, which obscures system failure from tutor content.

#### H. Target-size rules are not uniform across roles — medium

`KaizenEdu` sets a 44 px base and 56 px kids target, but the parent surface token is 40 px (`components/tutor/brand/tokens.css:82-112`). This is not proof that every parent control is 40 px, but it is a design-system exception that should be checked against the project’s touch-target baseline.

## 4. Workflow state coverage

| Workflow | Source-backed covered states | Missing or weak states |
|---|---|---|
| Public group schedule | loading, failed + retry, empty, held/preview, live, full, waitlist, signed-out return | no browser validation; no explicit offline cache |
| Group booking | quote, guardian consent, intake, checkout, paid/cancelled return, full mid-checkout, waitlist, confirm, cancellation, alternatives | no direct reschedule; learner no-show aftermath is not a learner flow |
| Tutor room operations | loading, no assigned rooms, upcoming, live, joinable, roster, help queue, attendance/no-show, unsaved drafts, save failure, not provisioned | no consolidated connectivity indicator; no verified keyboard/mobile execution |
| Live human call | opening, generic failure, leave, concern report, responsive side panel | no explicit prejoin device state, permission-denied copy, retry/reconnect, captions/transcript claim, waiting/no-show state |
| Async operator handoff | idle, form, busy, sent, error, demo-not-delivered | no owner, SLA, case status, response channel, linked booking, learner-visible history |
| Group post-session | tutor exit summary, structured ratings, server record, delayed check | narrative not surfaced to learner/household; no delivery acknowledgement |
| Legacy 1:1 post-session | tutor observation, recap generation, email to learner/parents, rating | learner booking entry unmounted; public booking deliberately removed |
| `KaizenEdu` AI session | ready, auto-start, mic unknown/requesting/granted/denied/busy/unsupported, retrying connection, voice-off, typed fallback, ordinary/terminal errors, wrap loading/error | no human-tutor transition; board equivalence and keyboard PTT unresolved |
| `trellis` lesson | busy, ordinary API error in chat, unconfigured record notice | no resume, no explicit loading/status announcement, no human path |

## 5. Reusable design and interaction work

### Keep or adapt with high confidence

1. **`Kaizen-AI` group schedule and booking state model.** The separation of failed, honestly empty, held, live, full, waitlist, paid, cancelled, and not-provisioned states is more valuable than its styling. Keep the state vocabulary and server-truth posture (`ScheduleBrowser`, `DropInSessions`).
2. **`Kaizen-AI` group tutor operating loop.** Task ordering, 90-second room brief, live roster/help queue, attendance/no-show, interruption-safe exit drafts, structured exit ratings, and delayed checks are the closest implementation to the owner’s reopened “AI supports the human” direction (`TutorClasses`, `ExitRatings`, group brief/roster APIs).
3. **`KaizenEdu` learner session shell.** Responsive tutor/board/transcript/dock composition, typed fallback, honest permission copy, transcript behavior, native problem dialog, and wrap state are strong reusable interaction patterns (`session-screen.tsx`, `use-tutor-session.ts`, `dock.tsx`, `transcript.tsx`, `wrap-screen.tsx`).
4. **`KaizenEdu` household communication system.** Generated labeling, plain-language lead, evidence beneath the lead, session notes, transcript access, weekly-email dedupe, empty-week suppression, and opt-out are cohesive follow-up work (`parent/overview.tsx`, `parent/report-view.tsx`, weekly email modules).
5. **Shared design primitives, not page copies.** `Kaizen-AI`’s `Button`, `Notice`, `Card`, `EmptyState`, `RoomCard`, `Section`, and status tokens encode consistent interaction meaning. `KaizenEdu`’s `tokens.css` encodes role-specific sizing, focus, motion, and light/dark surfaces. Reuse concepts after a target product is chosen; do not merge two visual systems mechanically.
6. **`trellis` record language.** “Practised with help” versus “proven alone,” delayed independent checks, and explicit no-certification wording are concise, household-readable guardrails (`web/lib/record.ts`, mounted parent view).

### Repair before reuse

- `Kaizen-AI` overlay/dialog semantics and live-call recovery.
- The group exit narrative’s missing learner/household consumer.
- Tutor-facing legacy 1:1 screens versus the public/learner-side product cut.
- `KaizenEdu` pointer-only push-to-talk, board alternatives, and custom-menu keyboard model.
- `trellis` labels, live announcements, focus treatment, and durable session continuity.

### Retire or quarantine unless deliberately reselected

- `TutorBooking` as a presumed current feature. It is unmounted.
- Public tutor profile booking assumptions. The reviewed profile explicitly removed them.
- Any copy promising that an async operator message dispatches a tutor. The handoff route explicitly does not assign one.
- `Tutornat` as UX evidence. It contains no product surface.

## 6. Prioritized product/workflow gaps

### P0 — choose and state the human service model

The source currently contains three different promises:

1. book a group/in-person room;
2. book private 1:1 video (implemented substantially but learner entry removed);
3. send an asynchronous message to club operators.

They imply different navigation, availability, staffing, consent, pricing, failure, and follow-up states. No prototype or navigation redesign should precede this choice.

**Owner decision required:** group/in-person, private video, asynchronous operator follow-up, or an explicit sequence among them.

### P0 — close the group follow-up edge

The strongest current human loop writes both structured evidence and a practical exit summary, but only the structured evidence reaches the family record. A parent cannot see “what got done / what remains / what clicked / next step” from the group room in the reviewed mounted surfaces.

**Required outcome, not a proposed screen:** define which tutor-authored fields the learner and household may see, where consent/privacy boundaries sit, how edits work, and how delivery is acknowledged.

### P0 — make human help operationally accountable

`/api/handoff` stores and emails but does not assign or expose lifecycle. Before describing it as help, define owner, service-level expectation, accepted/rejected state, response channel, and fallback when email is unconfigured. The UI must not imply a tutor is coming unless the service guarantees it.

### P0 — accessibility gate for the human interaction

Before external use of booking/live-room workflows, resolve modal focus/keyboard semantics, explicit call permission/recovery states, caption/transcript availability, and nonvisual access to learning content. These affect minors, payments, and live instruction; they are not cosmetic polish.

### P1 — create one discoverable service journey after the model is chosen

Current navigation fragments discovery (`/tutoring`, `/schedule`), learner work (`/dashboard`), household management (`/family`), and tutor operations (`/tutor`). The selected service needs one source-of-truth journey covering discovery, intent preservation, booking/request, join/attendance, follow-up, and history. This is an information-architecture requirement, not a recommendation for a particular screen layout.

### P1 — reconcile or retire legacy 1:1 state

The tutor side still operates private sessions while learner/public paths say the product is cut. Either reconnect the entire chain deliberately or quarantine the old components/APIs from active product copy and operations. Partial reactivation would create the most damaging state: tutors see sessions that learners cannot reliably discover/manage, or public profiles imply availability without a bookable service.

### P1 — complete exception states

Define source-of-truth behavior for reschedule, tutor cancellation, learner no-show, tutor no-show, room reassignment, late arrival, call disconnect, permission denial, payment pending, refund failure, and a booked session with no recap. Several pieces exist, but there is no cross-role state contract.

### P1 — establish context-sharing and privacy boundaries

The group brief reads learner-model estimates and first names; booking captures intake; human ratings write to the learning record; household reports expose learning claims. Decide which data a tutor receives, what the learner can preview or correct, what parents can see, retention duration, and whether raw transcript/AI summary ever crosses to a human.

### P2 — unify design systems only after product scope

Both mature attempts contain reusable systems, but combining their palettes/components now would hide unresolved service decisions. After the journey and roles are locked, select one token authority, define role/surface sizing, and run contrast/target validation against actual components.

### P2 — validate with people rather than extrapolating from screenshots

No supplied artifact establishes that a learner can find human help, that a parent understands what happens next, or that a tutor can close a room under time pressure. The first research pass should observe those tasks across learner, household, and tutor roles, including permission denial, mobile interruption, and assistive technology. This report does not claim results from users who were never studied.

### Later design-phase validation requirements

Do not begin until the owner has selected the service model, initiating role, consent/payment authority, and response promise. Then test concepts—not visual preference—against these source-derived hypotheses:

- A learner can distinguish “message sent,” “waitlisted,” “booked,” and “human on the way” without inferring a stronger promise than operations made.
- Intent and context survive sign-in, checkout, interruption, no availability, and call-permission failure.
- A tutor can understand the learner/room in under the available prep window, identify the AI source versus learner-authored intake, run the room, and recover an interrupted rating/exit save.
- A learner and household can distinguish helped practice, human observation, AI-generated summary, and independently confirmed learning, then identify the agreed next step.
- A keyboard or screen-reader user, a microphone-refusing learner, and a small-screen user can complete the same service path without losing essential instructional content.

Required task evidence should include observed completion, wrong-turn/recovery behavior, and comprehension of service status, evidence source, and next step across learner, household, and tutor roles. Do not use screenshot preference or a polished happy-path click-through as a substitute.

## 7. Owner questions

1. What is the reopened product: recurring group/in-person rooms, private video sessions, async operator help, or a staged ladder among them?
2. Who initiates human help—the learner, parent, AI, or operator—and who has authority to book/pay/consent?
3. What age range and account relationship are actually in scope? The historical free/no-account grades 4–9 brief is not treated as locked.
4. What response promise can operations meet for “send to Kaizen”: minutes, hours, next business day, or no guaranteed response?
5. Does a human tutor receive structured intake, learner-model estimates, selected transcript excerpts, an AI summary, or only learner-approved context?
6. Is live video still a candidate, or should all human interaction be in person? If video remains, who provides captions, device checks, waiting-room behavior, and call support?
7. After a group room, which fields are visible to the learner and household: attendance, what was done, what remains, what clicked, recommendation, concept ratings, or only confirmed record changes?
8. Can learners challenge or correct tutor notes/ratings, and who resolves a disagreement?
9. What are the cancellation, reschedule, no-show, refund, and tutor-substitution policies for the chosen service?
10. Should the old 1:1 components/APIs remain available for a possible return, or be quarantined to prevent accidental product claims?
11. Which record is authoritative when local learner state, server mastery, tutor notes, and parent reports disagree?
12. What accessibility baseline is required for launch: keyboard, VoiceOver/NVDA, captions, reduced motion, nonvisual board equivalent, target size, and supported devices/browsers?

## 8. Decision brief

**Problem:** four attempts contain strong but incompatible pieces, and none supplies a complete learner → human tutor → household follow-up journey.

**Options:**

1. **Group/in-person core:** reuse `Kaizen-AI` schedule, room, roster, brief, ratings, and delayed-check loop; add the missing learner/household exit narrative.
2. **Private video core:** deliberately restore and reconcile the unmounted 1:1 learner booking path with the still-mounted tutor session/recap path, then harden call accessibility and operations.
3. **AI-first with async human follow-up:** reuse `KaizenEdu`’s learner/parent system and turn operator contact into an accountable case lifecycle rather than implying synchronous tutoring.

**Recommendation for discovery:** do not select among these from code volume. Ask the owner to choose the service promise and operating model first; then evaluate which existing path minimizes service and accessibility risk. OpenMAIC, if considered later, is a capability candidate, not a preselected product.

## Source index

### `Kaizen-AI`

- `web/app/dashboard/page.js`
- `web/app/tutor/page.js`
- `web/app/tutoring/page.js`
- `web/app/schedule/page.js`
- `web/app/family/page.js`
- `web/app/tutors/page.js`
- `web/app/tutors/[slug]/page.js`
- `web/components/ScheduleBrowser.js`
- `web/components/DropInSessions.js`
- `web/components/TutorClasses.js`
- `web/components/ExitRatings.js`
- `web/components/HallBoard.js`
- `web/components/VideoCall.js`
- `web/components/TutorObserve.js`
- `web/components/TutorBooking.js`
- `web/components/BookModal.js`
- `web/components/TutorDirectory.js`
- `web/components/TutorProfile.js`
- `web/components/ProgressView.js`
- `web/components/ChecksDueCard.js`
- `web/components/ui/Button.js`
- `web/components/ui/Notice.js`
- `web/lib/appState.js`
- `web/lib/historyNav.js`
- `web/lib/server/familySummary.js`
- `web/app/api/handoff/route.js`
- `web/app/api/family/summary/route.js`
- `web/app/api/tutoring/group/brief/route.js`
- `web/app/api/tutoring/group/roster/route.js`
- `web/app/api/tutoring/observe/route.js`
- `web/app/api/tutoring/recap/route.js`

### `KaizenEdu`

- `app/(learner)/welcome/page.tsx`
- `app/(learner)/learn/page.tsx`
- `app/(learner)/session/[id]/page.tsx`
- `app/(parent)/parent/page.tsx`
- `app/(parent)/parent/reports/[learnerId]/page.tsx`
- `components/tutor/shell/nav.ts`
- `components/tutor/shell/app-shell.tsx`
- `components/tutor/learn/workspace.tsx`
- `components/tutor/learn/recent-sessions.tsx`
- `components/tutor/session/session-screen.tsx`
- `components/tutor/session/use-tutor-session.ts`
- `components/tutor/session/dock.tsx`
- `components/tutor/session/transcript.tsx`
- `components/tutor/session/wrap-screen.tsx`
- `components/tutor/session/report-problem.tsx`
- `components/tutor/session/session.css`
- `components/tutor/board/board-pane.tsx`
- `components/tutor/brand/tokens.css`
- `components/tutor/parent/overview.tsx`
- `components/tutor/parent/report-view.tsx`
- `lib/tutor/support/inbox.ts`
- `lib/tutor/email/weekly.ts`
- `lib/tutor/email/templates/weekly-report.ts`
- six static screenshots listed under “Limits”

### `trellis`

- `web/app/learn/page.tsx`
- `web/app/learn/chat.tsx`
- `web/app/learn/record-panel.tsx`
- `web/app/parent/page.tsx`
- `web/app/globals.css`
- `web/lib/record.ts`
- `web/app/api/turn/route.ts`
- `lib/tutor/report/parent-report.ts`

### `Tutornat`

- `README.md` (only tracked file)
