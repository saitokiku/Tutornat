# Kaizen — Demo Course Materials

Real, self-consistent course content for demoing Kaizen live. Nothing here is
mock data or a seeded fixture: these are complete classroom materials you upload
**through the product's own AI intake** during a demo, exactly as a real student
would. Two full courses are included.

```
demo-materials/
├── algebra-2/
│   ├── syllabus.md                     ← paste this into intake first
│   ├── textbook/
│   │   ├── ch1-functions.md
│   │   └── ch2-quadratics.md
│   ├── homework/
│   │   ├── hw1-functions.md
│   │   ├── hw2-quadratics.md
│   │   └── hw3-exp-log.md
│   └── exams/
│       ├── quiz2-quadratics.md
│       ├── midterm.md                  (Units 1–4)
│       └── final.md                    (Units 1–8, comprehensive)
└── ap-biology/
    ├── syllabus.md
    ├── textbook/
    │   ├── ch1-biomolecules.md
    │   ├── ch2-cell-energetics.md
    │   ├── ch3-genetics.md
    │   └── ch4-gene-expression.md
    ├── homework/
    │   ├── hw1-biomolecules.md
    │   ├── hw2-cellular-energetics.md
    │   ├── hw3-genetics.md
    │   └── hw4-gene-expression.md
    └── exams/
        ├── unit3-test-cellular-energetics.md
        ├── midterm.md                  (Units 1–4)
        └── final.md                    (Units 1–8, comprehensive)

SEMESTER_INTAKE.md   ← one-shot paste blocks: zero → full graded dashboard
```

*(Algebra II homework now also includes `hw4-rational.md` and `hw5-radicals.md`,
covering Units 4 and 5 with full answer keys.)*

## Fastest demo: one-shot semester intake

[`SEMESTER_INTAKE.md`](SEMESTER_INTAKE.md) has **paste-ready blocks** that take a
student from zero to a **full, already-graded** dashboard in one paste. Each block
reads like a student pasting their term into Kaizen's magic box — course, grade
weights, and a semester of assignments with real scores on the completed ones — so
**Grades, GPA, and Mastery populate immediately** (an empty dashboard is a weak
demo). Each course also has a deliberately weak topic baked into the grades so the
"let's drill this" → Teach-mode → mastery-updates loop has something real to fix.

## How the pieces fit together

Everything is internally consistent so the demo never contradicts itself:

- The **syllabus** lists the exact units, week-by-week schedule, and every
  homework/quiz/exam with its due date. When you paste it into Kaizen's intake
  box, Claude reads it and builds the course, its topics, and the assignment
  calendar automatically.
- The **textbook** chapters use the same vocabulary and worked examples the
  tutor will lean on. Upload a chapter in a study session and the tutor teaches
  from *your* text.
- The **homework** sets cover the topics named in the syllabus, in order, with a
  full **answer key** at the bottom of each file (for you, not the student).
- The **exams** (quiz → midterm → final) escalate in scope and each ship with an
  answer key. The midterm covers Units 1–4; the final is comprehensive.

## Every answer key is included

Each homework and exam file ends with an `Answer Key` section. Keep it out of the
student's view during a live demo — it's there so you can verify Kaizen's grading
and tutoring against the intended answers on the spot.

## Two ways to demo

1. **Live upload (recommended).** Paste the syllabus into the onboarding intake
   box, then upload textbook/homework files in study sessions. This shows off the
   AI intake pipeline — the "wow" moment — because Claude organizes raw material
   into a working course in seconds.
2. **Talk it through.** Open a topic, turn on **voice** (mic button), and have a
   spoken Socratic exchange. Voice uses OpenAI Whisper for speech-to-text and
   OpenAI TTS for the reply; the tutoring itself is Claude.

See [`DEMO_SCRIPT.md`](DEMO_SCRIPT.md) for a tight 8-minute walkthrough.

> Content is original, written for this demo, and aligned to standard Algebra II
> and College Board AP Biology topics. Instructors, room numbers, and dates are
> fictional.
