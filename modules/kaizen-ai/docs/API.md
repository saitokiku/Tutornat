# API reference (web app routes)

Auth: `Authorization: Bearer <supabase JWT>` on every non-public call in SaaS
mode. Demo mode (no Supabase configured): the AI routes accept unauthenticated
calls and skip metering; money/booking/data routes return an explicit demo or
501 "not configured" state instead of pretending. All errors are plain text or
`{error}` JSON with proper codes: 400 bad request · 401 unauthenticated ·
403 forbidden · 409 conflict · 429 limit · 501 not configured ·
502 upstream failure · 503 disabled.

Auth legend used below:

- **public** — no session required (typically IP rate-limited)
- **authed** — session resolved via `getCaller` (`lib/server/context.js`)
- **tutor** — authed, and the caller must own the relevant `tutors` row
- **admin** — authed + `isAdminCaller`
- **cron** — `Authorization: Bearer ${CRON_SECRET}` (fail-closed without it)
- **stripe-sig** — the Stripe signature on the raw body is the authentication

The club selling surface (schedule, directory, group booking) is fail-closed
behind `app_settings.club_enabled`: booking POSTs return 503 and browse GETs
return an honest empty/`notProvisioned` state until the switch is flipped in
Admin → Settings.

## Core AI / product routes (detailed)

| Route | Method | Purpose | Auth | Metered as |
|---|---|---|---|---|
| /api/chat | POST | streaming Socratic tutor (modes: socratic, curious) | authed | tutor_message |
| /api/grade | POST | 0–5 understanding grade of a transcript; also writes engine evidence | authed | grade |
| /api/intake | POST | universal inline intake: arbitrary text + attached text/PDF/image/Word (base64) → normalized course patch | authed | syllabus_parse |
| /api/intake/ingest | POST | storage-first intake: one uploaded storage object per call (large/many files) | authed | syllabus_parse |
| /api/parse-syllabus | POST | syllabus text → {course, topics, assignments} | authed | syllabus_parse |
| /api/practice | POST/PATCH | POST generates a 5-question set; PATCH records the attempt as a mastery event | authed | (gated by tutor_message entitlement) |
| /api/image | POST | prompt → generated image (data URL); 501 without GEMINI_API_KEY | authed | report |
| /api/voice | POST | text → mp3 (OpenAI TTS proxy); 501 without OPENAI_API_KEY | authed | tts_chars |
| /api/voice/transcribe | POST | multipart `audio` blob → {text} (OpenAI STT); 501 without OPENAI_API_KEY | authed | stt_seconds |
| /api/voice/realtime-token | POST | mint an ephemeral OpenAI Realtime session (client never sees the key) | authed | voice_session |
| /api/reports/weekly | POST | stats snapshot → markdown weekly report | authed | report |
| /api/handoff | POST | human tutor request (+ admin email) | authed | handoff |
| /api/support | POST | contact form (/contact) → support inbox | public (rate-limited) | — |

`/api/chat` body: `{messages, concept, mode?, documents?, studentName?,
learningStyle?, voice?, mastery?}`. Streams `text/plain` tokens; the client
accumulates.

## Full route index (60 routes)

Every `route.js` under `web/app/api`, grouped. One line per route; purposes
come from each route's own header comment.

### Product / AI (13)

The thirteen routes detailed in the table above: `/api/chat`, `/api/grade`,
`/api/intake`, `/api/intake/ingest`, `/api/parse-syllabus`, `/api/practice`,
`/api/image`, `/api/voice`, `/api/voice/transcribe`,
`/api/voice/realtime-token`, `/api/reports/weekly`, `/api/handoff`,
`/api/support`.

### Engine (3)

| Route | Methods | Auth | Purpose |
|---|---|---|---|
| /api/engine/state | GET | authed | the learner's two-tier mastery map (WORKING vs CONFIRMED) + what to do next |
| /api/engine/session | GET/POST | authed | the practice session loop: start/resume, next activity; `answer`/`hint`/`explain`/`end`/`report` actions, graded server-side (answer keys never leave the server) |
| /api/engine/check | GET/POST | authed | mastery checks: what's due; issue a check (`?kcId=`, no answer keys client-side); submit answers — the only path that produces CONFIRMED mastery |

### Billing & account (7)

| Route | Methods | Auth | Purpose |
|---|---|---|---|
| /api/billing/checkout | POST | authed | create a Stripe Checkout session for a paid plan, returns {url}; 501 without Stripe |
| /api/billing/portal | POST | authed | open the Stripe Billing Portal; 400 when no billing account exists yet |
| /api/billing/reconcile | POST | authed | verify billing state against Stripe on post-payment return screens; idempotent, safe with Stripe unconfigured |
| /api/billing/webhook | POST | stripe-sig | Stripe events drive subscriptions + profiles.plan; service-role writes, all audited |
| /api/entitlements/me | GET | authed | caller's plan, subscription status, today's usage vs limits, club monthly allowances |
| /api/account/export | GET | authed | the caller's complete server-side data as one JSON download (access + portability) |
| /api/account/delete | POST | authed | full account + data deletion (best-effort Stripe cancel, storage sweep, FK cascade) |

### Family & safety (8)

| Route | Methods | Auth | Purpose |
|---|---|---|---|
| /api/family | GET/POST/PATCH | authed | parent↔student linking: list my links, invite a student by email, accept/decline/revoke |
| /api/family/children | GET/POST/PATCH | authed (parent) | parent-created managed teen profiles (13+ floor): create, list, update name/grade/password |
| /api/family/summary | GET | authed (linked parent; admin may view any) | read-only window into a linked student: grades, GPA, open work, streak, latest weekly report |
| /api/family/guardian-consent | GET/POST | GET public (email token) · POST authed | guardian consent for a minor's live video: token link records consent; minor (re)sends or sets the guardian email |
| /api/circle | GET/POST/DELETE | authed | Study Circles (family-plan sharing, up to 4 students): my circle, join by invite code, owner creates/removes, member leaves |
| /api/safety/report | POST/GET/PATCH | POST authed · GET/PATCH admin | report a safety concern (alerts admin by email); admin triage queue + status updates |
| /api/safety/under13 | POST | public | log a blocked under-13 signup attempt (anonymous by design, no identifying data) |
| /api/email/unsubscribe | GET/POST | public (per-profile token) | one-click opt-out from non-essential email (GET confirmation page, POST for mail-client one-click) |

### Tutoring & club (18)

| Route | Methods | Auth | Purpose |
|---|---|---|---|
| /api/club/interest | POST | public | "get first pick when booking opens" capture; burst-limited, honeypotted, always {ok:true} on a valid shape |
| /api/club/schedule | GET | public | the public weekly schedule; sanitized fields, retail prices only; sessions carry {isFull, seatsLeft, staffCount} |
| /api/tutoring/directory | GET | public | active tutors + average rating; `?slug=` returns one tutor with reviews and open slots |
| /api/tutoring/tutors | GET/POST | authed | active tutor roster; self-serve tutor onboarding (starts pending; admin activates) |
| /api/tutoring/applications | POST/GET/PATCH | authed · `?all=1` and PATCH admin | tutor hiring pipeline: submit application, view own (or full pipeline), admin decision approve/reject |
| /api/tutoring/availability | GET/POST/DELETE | authed (writes tutor-only) | a tutor's own bookable slots; a student's read of a given tutor's open slots |
| /api/tutoring/sessions | GET/POST/PATCH | authed | 1:1 sessions: list mine (student + tutor views), book an open slot (Checkout hold or plan-metered), cancel/complete with refund + earnings rules |
| /api/tutoring/room | POST | authed (session's student or tutor) | create/reuse the Daily room for a 1:1 session and mint a scoped join token; 501 without Daily |
| /api/tutoring/brief | GET | tutor | AI pre-session brief for the tutor (cached on the session row) |
| /api/tutoring/recap | POST | tutor | rough notes → warm AI recap, stored on the session and emailed to the student + linked parents |
| /api/tutoring/reviews | POST | authed | one review per completed session, written by that session's student (reviews are public reads) |
| /api/tutoring/observe | GET/POST | tutor | per-KC tutor ratings become CONFIRMING engine evidence (`verified_by='human_tutor'`, unassisted); GET returns the agenda + current ratings |
| /api/tutor/earnings | GET | authed (own data) | a tutor's own earnings ledger (accrued/paid) from the authoritative table |
| /api/tutoring/group | GET/POST/DELETE | authed | group rooms (clinics, Homework Hall, Community Hall): browse/mine/tutorView, claim seats, host clinics, occupancy actions, release — full contract below |
| /api/tutoring/group/room | POST | authed (settled seat holder or room's tutor) | create/reuse the Daily room for a group session, sized to capacity, scoped join token; 501 without Daily |
| /api/tutoring/group/roster | GET/PATCH | GET + seat-close tutor-of-room or admin · help-status the seat's student/booker | Homework Hall operating loop: roster ordered red → yellow → green (oldest raise first); students flip help status; tutor records attendance + exit summary (recommendation: rebook, clinic, private) |
| /api/tutoring/group/brief | GET/POST | tutor | roster brief for a group room (what the students SHARE); per-student observations become engine evidence |
| /api/tutoring/hall | GET/POST/PATCH | authed (settled seat or room's tutor) | Community Hall vote board: student asks are compressed and routed into topic "parties"; tutor marks a party covered/reopened |

### Admin (9)

All admin-only (`isAdminCaller`), mutations audited.

| Route | Methods | Purpose |
|---|---|---|
| /api/admin/stats | GET | users, usage, cost, sessions |
| /api/admin/metrics | GET | live business metrics (`?days=`): occupied seats per tutor-hour, occupancy by kind, first→second-session conversion, members/visits, refunds, tutor hours + pay |
| /api/admin/users | GET/PATCH | list/search users (profile + subscription + 30d spend); change a user's role |
| /api/admin/tutors | GET/PATCH | tutor roster + vetting/activation workflow: `vet`, `reject_vetting`, `activate` (hard-blocked unless vetted), `pause`, `set_pay_rate` |
| /api/admin/classes | GET/POST/PATCH/DELETE | weekly class catalog (series): create/update series, cancel one instance (refunds every held seat), delete a series |
| /api/admin/earnings | GET/PATCH | payout support: per-tutor accrued/paid totals + unpaid line items (`?csv=1` for bookkeeping); mark a tutor's accrued earnings paid |
| /api/admin/grant-plan | PATCH | manually set a user's plan (comps, refunds, internal accounts); keeps subscriptions in sync |
| /api/admin/handoffs | PATCH | mark a handoff request handled |
| /api/admin/settings | GET/PATCH | kill switches: tutor_enabled, voice_enabled, expensive_models_enabled, maintenance_mode, signups_enabled, club_enabled |

### Infra & cron (2)

| Route | Methods | Auth | Purpose |
|---|---|---|---|
| /api/health | GET | public | liveness + config flags (ai, voice, db, billing, email) |
| /api/cron/maintenance | GET | cron | hourly sweep (vercel.json): release abandoned payment holds, T-24h reminders, retention purge, plus the group-room sweeps (fill resolution, seat release, standing bookings); refuses to run without CRON_SECRET |

## Group rooms & occupancy — `/api/tutoring/group`

Everything below requires auth; booking POSTs additionally require the club
gate (`club_enabled`) or they 503. When the club is closed, GET returns
`{notProvisioned: true, sessions: []}`.

**GET** — browse upcoming rooms. Optional `?kind=` (`clinic` |
`homework_hall` | `community_free`) and `?grade=` filters. Only rooms whose
tutor is active and vetting-cleared appear. Full rooms are INCLUDED (they
render "Full — join the list"): within each local day, bookable rooms sort
before full ones, and bookable rooms sort fullest-first ("herding",
`lib/server/occupancy.js`). Each session carries `{id, seriesId, subject,
topic, description, kind, kindLabel, gradeBand, start, end, timezone,
seatPriceCents, quote: {mode, amountCents}, capacity, seatsLeft, filled,
isFull, minSeats, willRunAt, confirmed, alreadyBooked, alreadyWaitlisted,
tutor: {name, headline, photo, slug}}`; the response also carries the
caller's `hallRemaining` allowance.

**GET ?mine=1** (`&childId=` for a managed child, verified server-side) —
`seats[]`: `{seatId, status, paid, bookedVia, confirmed, needsConfirm,
sessionId, subject, topic, kind, kindLabel, start, end, sessionStatus,
tutorName, bring}` — `needsConfirm` is true only for an included,
still-booked, unconfirmed seat — plus `standing[]`: `{standingId, seriesId,
studentId, title, subject, weekday, localStartTime, timezone}`.

**GET ?tutorView=1** — the caller-tutor's own rooms (led or co-staffed),
yesterday onward, with held-seat counts.

**POST `{sessionId, guardianConsent: true, childId?, intake?, bring?,
returnPath?}`** — claim a seat (race-free via the `claim_group_seat` RPC;
guardian gate and tutor vetting are re-checked here, never trusted from
browse). Free/included quotes settle instantly with no Stripe object — an
included seat booked inside the confirm window is auto-confirmed — while
member/retail quotes return a Stripe Checkout `{url}` and hold the seat as
`pending_payment`. Booking a full room 409s with `{waitlistable: true}`.

**POST `{action: 'host', subject?, topic?, description?, start, end,
capacity?, minSeats?}`** (tutor, cleared) — open a Subject Clinic at the
house retail seat price (`lib/server/clubPricing.js`).

**Occupancy actions (migration 0029), all POST:**

- `{action: 'waitlist', sessionId, childId?}` — join the list for a FULL
  room only (409 with `code: 'seats_open'` when seats remain). No guardian
  gate at wait time — it runs when the freed seat is actually booked.
- `{action: 'unwaitlist', sessionId}` — leave the list.
- `{action: 'confirm', seatId}` — confirm-or-release: the seat's student, or
  the account that booked it, confirms attendance. Idempotent; 409 unless
  the seat is still `booked`.
- `{action: 'standing', seriesId, childId?, guardianConsent: true}` — a
  standing weekly seat on a Homework Hall series. Requires the guardian gate
  and a plan with `club_hall_included` visits; upserts the standing seat and
  books this month's remaining rooms immediately (`bookedNow` in the
  response). Future months book via the hourly cron, with the same gates
  re-checked each run.
- `{action: 'unstanding', standingId}` — end a standing seat (owner only).
  Already-booked weeks stay booked; cancel them individually if needed.

**DELETE `{seatId}`** — release a seat (the seat's student or the account
that booked it). Inside the refund window: Stripe refund for paid seats,
allowance restore (to the booker) for included seats; outside it, no refund
— a late drop can cancel the room for everyone else. The freed seat notifies
the front of the waitlist, and the response carries `alternatives[]`: up to
three same-kind upcoming rooms with open seats, EMPTIEST first —
`{id, subject, topic, kind, start, seatsLeft}`.
