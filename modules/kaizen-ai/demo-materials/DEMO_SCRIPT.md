# Kaizen — Live Demo Script (~8 minutes)

A tight, rehearsable walkthrough that shows the whole loop: **raw materials in →
organized course → Socratic tutoring → voice → real mastery grading**. All
tutoring/grading is Claude; voice is OpenAI (Whisper STT + TTS).

**Before you start:** open the deployed site, have `demo-materials/` open in a
second window, and create (or sign into) a fresh account so onboarding runs.

---

## 0 · Setup (30 sec, before the audience)
- Sign in with a real account (full SaaS mode).
- Have `algebra-2/syllabus.md` copied to your clipboard.
- Have `algebra-2/textbook/ch2-quadratics.md` and
  `algebra-2/homework/hw2-quadratics.md` ready to upload.

## 1 · "Watch it build my semester from a syllabus" (90 sec)
1. On the onboarding **intake box**, paste the entire **Algebra II syllabus**.
2. Hit go. Claude reads it and returns courses, topics, and dated assignments.
3. Point out: *"I pasted a raw syllabus — no forms, no tagging. It found the
   units, the quiz and exam dates, and built my calendar."*
4. Confirm and land on **Today**. Show the due-now queue and the calendar.

> Optional: paste the **AP Biology syllabus** too, to show two courses side by
> side. It'll add BIO topics and its own exam dates.

## 2 · "It teaches — it doesn't hand over answers" (2 min)
1. Open the **Quadratics** topic (or the *Quiz: Quadratic formula* assignment) →
   tap **Tutor**.
2. Type: *"I don't get the quadratic formula."*
3. Show that Kaizen responds with a **question**, not a solution — it pulls the
   next step out of you. Ask for a hint; show it gives the *smallest* one.
4. Upload **hw2-quadratics.md** into the session. Point out the "Using your
   files" chip: *"Now it's teaching from my actual homework."*

## 3 · "Talk to it" — voice (90 sec)
1. Tap the **mic** button to start a hands-free voice conversation.
2. Say: *"Walk me through completing the square for x squared plus six x minus
   seven."*
3. Let it reply out loud, then respond by voice. Narrate: *"Speech-to-text is
   OpenAI Whisper, the voice is OpenAI TTS — but the teaching is Claude."*
4. Tap the mic again to end voice.

## 4 · "It measures what I actually learned" (90 sec)
1. Back in text, after a real exchange, tap **Grade**.
2. Show the **0–5 recall score** and the one-line rationale.
3. Explain: *"That score feeds a spaced-repetition engine (SM-2) — it schedules
   the review right before I'd forget. Parents and students get a mastery number
   they can trust."*
4. Flip to **Growth** to show the mastery trend and weakest-concepts triage.

## 5 · "Curiosity, beyond the syllabus" (30 sec)
1. From Today, hit a **curiosity dive** ("Surprise me").
2. One exchange. Narrate: *"No grades here — this is learning for its own sake,
   the opposite of a homework mill."*

## 6 · Close (20 sec)
- One calm place: homework tracked, a tutor that teaches, voice when you want it,
  and mastery you can see. *"Small steps, every day — that's kaizen."*

---

## Verifying answers on the fly
Every homework and exam in `demo-materials/` has an **answer key** at the bottom
of the file. If someone asks "is it right?", you can pull up the key and check
the tutor's or grader's output against the intended answer in real time.

## If something misbehaves
- **Voice button does nothing / errors** → `OPENAI_API_KEY` isn't set on the
  server (voice is OpenAI-only by design; text tutoring still works). See
  `docs/GO_LIVE.md`.
- **Intake says "couldn't sort that"** → paste a bit more text, or the whole
  syllabus rather than a fragment.
- **"Sign in first"** on an action → your session expired; re-authenticate.
- **Hit a daily limit** → you're on a capped plan; an admin/internal account is
  uncapped (set `ADMIN_EMAILS`).

## Suggested demo order of materials
| Moment | File |
|---|---|
| Build the course | `algebra-2/syllabus.md` |
| Teach from the book | `algebra-2/textbook/ch2-quadratics.md` |
| Teach from homework | `algebra-2/homework/hw2-quadratics.md` |
| Second course (optional) | `ap-biology/syllabus.md` |
| Show an exam + key | `algebra-2/exams/midterm.md` |
