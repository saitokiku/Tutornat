# Kaizen — the student's academic trellis

A study partner that keeps you on track and makes it stick. Homework tracking,
Socratic AI tutoring with real mastery measurement, voice conversations,
and a curiosity engine — in one lovable app.

**Live product.** Works on phone and desktop from one codebase. Runs in full
SaaS mode (real accounts + synced data via Supabase). All intelligence is
**Claude**; **voice is OpenAI** (Whisper speech-to-text + TTS) and nothing else.

## What a student gets

| | |
|---|---|
| ☀️ **Today** | Activity rings (homework · study · mastery), week strip, due-now queue with satisfying completion, streaks |
| 📅 **Calendar** | Real month calendar of everything due; add tasks, drag to reschedule |
| 🎓 **Study** | Concepts grouped by class with SM-2 spaced-repetition scheduling; file library the tutor reads |
| 📊 **Grades** | Full gradebook + GPA: weighted grades, "what do I need on the final?" simulation, inline score entry |
| 📈 **Progress** | Mastery trend, 8-week consistency grid, weakest-concepts triage |
| 🎙 **Voice tutor** | Hands-free conversation: you talk, Kaizen talks back |
| 🎥 **Live tutors** | The weekly club schedule — Homework Hall, Subject Clinics, a free Community Hall — plus private 1:1 bookings, all over video (Daily.co) |
| ✨ **Curiosity dives** | "Surprise me" learning outside school — no grades, pure wonder |

Parents can link to a student's account for a read-only view of
grades and weekly reports. Admins get a full ops console; tutors get their own
workspace. See [`../docs/archive/ROADMAP.md`](../docs/archive/ROADMAP.md) for what's next (LMS
integrations, payouts, and more).

Under the hood: every tutoring session can be **graded** — Claude scores the
student's demonstrated understanding 0–5 (SuperMemo scale) and the SM-2 engine
schedules the next review. Chat memory persists per concept. Uploaded files are
pulled into sessions automatically when relevant.

## Run it

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY, OPENAI_API_KEY, Supabase keys
npm run dev                  # http://localhost:3000
```

### Environment

| Var | Required | What it does |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | Tutor, grading, syllabus intake — all text intelligence, via the fast/tutor/deep model router (`lib/server/models.js`). |
| `OPENAI_API_KEY` | ✅ for voice | The **only** OpenAI use: speech-to-text (Whisper, `gpt-4o-mini-transcribe`) + TTS (`gpt-4o-mini-tts`). Without it the mic is disabled; text tutoring still works. |
| `NEXT_PUBLIC_SUPABASE_URL` · `_ANON_KEY` · `SUPABASE_SERVICE_ROLE_KEY` | ✅ for accounts | Auth + Postgres + RLS (SaaS mode). |
| `ADMIN_EMAILS` | ✅ | Emails auto-promoted to admin / internal plan on first sign-in. |

See [`.env.example`](.env.example) for the full list (Stripe, email, analytics).

## Deploy (Vercel)

Follow **[`../docs/GO_LIVE.md`](../docs/GO_LIVE.md)** — a click-by-click go-live
guide. Short version: import the repo → Root Directory `web` → add the env vars
above → Deploy → check `/api/health` shows `{ai:true, voice:true, db:true}`.

## Architecture notes

- **Universal AI intake** is the front door: `/api/intake` has Claude organize
  any student input (syllabus, brain dump, single task) into courses, topics,
  and assignments; `lib/intake.js` merges the patch into app state. This is how
  a real syllabus becomes a tracked course — paste it or upload the file.
- **Voice is OpenAI-only, everywhere:** `/api/voice/transcribe` (Whisper STT),
  `/api/voice` (TTS), `/api/voice/realtime-token` (low-latency Realtime). The
  in-session voice loop records the mic with `MediaRecorder`, detects
  end-of-speech via the Web Audio API, and transcribes with Whisper — there is
  no browser speech-recognition/synthesis fallback by design.
- **Real course materials** live in [`../demo-materials`](../demo-materials)
  (Algebra II + AP Biology: syllabi, textbook chapters, homework, exams with
  answer keys). Upload them through the normal intake/file flow — no seeded
  sample data exists.
- **State** is localStorage mirrored to Supabase per user. The load/save
  modules (`lib/appState.js`, `lib/store.js`, `lib/files.js`,
  `lib/chatMemory.js`, `lib/cloud.js`) manage the sync.
- **⚙ Engine room** (floating button) is the developer inspector: live pipeline
  stages, event log, model routing. `↺` clears this device's local cache.
- The earlier FastAPI/LangGraph/n8n stacks are **archived** in
  [`../legacy`](../legacy) — nothing in the product depends on them (see
  [`../legacy/README.md`](../legacy/README.md)).
