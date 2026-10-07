# Button map — Today / Schoolwork / Plan / Learn / Activity

Carried from the reference: one job per page, one ink primary per screen, secondaries are outlined pills placed next to the thing they act on,
destructive actions sit behind ⋯ with Cancel, and every control reads/writes the shared in-memory domain (no dummy buttons).
Role (student / parent) is one shared state set in the shell, never a per-page toggle. Nothing below infers mastery from completion,
a parent check, or an assisted answer. Route codes: Today=`today`, Plan=`calendar`, Learn=`study`; Schoolwork/Activity take the two
remaining original ids per Astra's route table (not decided here).

## Shared foundation (all five routes)
- Store: assignments {todo, done, returned; due, subject, minutes, source}, plan blocks, learn sessions {own, with help, incomplete}, parent notes, activity events.
- Primitives: Button {primary = ink pill, secondary = outlined pill, tertiary = text}; Row (circle check · title · meta · one secondary · ⋯);
  EmptyState (title + one sentence + one action); Disclosure (one mono line, e.g. "Practice is not graded. Nothing leaves this device.").
- Completes are instant with a 5 s Undo pill; deletes confirm inline (Delete / Cancel); every mutation appends an Activity event.

## Today — the one next thing
- Primary. Student: **Start** the next item (opens it in Schoolwork). Parent: **Mark checked** on the next item (records a check; does not complete it).
- Secondary: Done (student) · Reschedule → Plan · Add item (parent; student if allowed).
- Outcomes: Start → item opens with a minute count; Done → row leaves, next promotes, Undo 5 s; Mark checked → "Checked by parent" meta, Activity row.
- Empty: "Nothing due today." Student action → Practice 10 min (Learn). Parent action → Add schoolwork. Never "you're ahead".
- Recovery: overdue → meta reads "Overdue" in bad-red, primary unchanged; wrong tap → Undo.

## Schoolwork — everything assigned, in due order
- Primary. Parent: **Add schoolwork** (title, subject, due, minutes, source: teacher / photo / typed). Student: **Start** on the selected row.
- Secondary per row: Done · Reschedule · Edit · ⋯ (Delete · Mark returned + note). Filters are chips (All · Due · Done · Returned), not tabs.
- Outcomes: Add → inserted in date order, Today recomputes; Returned → "Returned" badge + parent note; Done → Done chip, Activity row.
- Empty: "No schoolwork yet." Parent → Add schoolwork. Student → "Ask a parent to add schoolwork, or add your own."
- Recovery: bad date → inline field error, nothing saved; accidental Done → Undo; accidental Delete → inline Cancel before it happens.

## Plan — when this week's work happens
- Primary. Parent: **Place** a block (drag or tap into a day). Student: **Start now** on today's first block.
- Secondary: Week ‹ › · Auto-fill week (fills open blocks from Schoolwork minutes; reversible) · Clear day.
- Outcomes: Place → block shows subject + minutes; Today's "next" follows the earliest block; Auto-fill → one Undo.
- Empty: "Nothing planned." Parent → Auto-fill week. Student → "Pick one item to do first."
- Recovery: overbooked day → block shows "+N min over" in warn-amber; saving is never blocked.

## Learn — independent practice (math / literacy, bands K–2 · 3–5 · 6–8, EN / ES)
- Primary. Student: **Practice** (picks a set by band + subject; unassisted by default). Parent: **Assign practice** (adds a Learn item to Schoolwork).
- Secondary: Show a hint (marks the session "with help") · EN / ES · End session.
- Outcomes: finished without hints → Activity reads "Done on your own"; with hints → "Done with help". No percentage, no ring, no streak.
- Empty: "No practice sets for this band yet." + Try [adjacent band]. Never a blank grid.
- Recovery: abandon mid-set → saved as incomplete; Today offers Resume as a secondary.

## Activity — what actually happened, in plain words (parent-first)
- Primary. Parent: **Add a note** (free text on a day). Student: read-only; no primary.
- Secondary: Week ‹ › · Filter chips (Schoolwork · Practice · Checks · Notes) · Export week (parent only).
- Outcomes: append-only list; rows read date · what · who · how (own / with help / checked). Nothing here is a score.
- Empty: "No activity this week." + Open Today. No placeholder chart.
- Recovery: wrong note → Edit / Delete behind ⋯; an undone completion shows as "undone", not erased.

## Owner decisions (pick one each)
1. Today, student primary: **Start** (opens the item) vs **Done** (check-off only). Reference keeps Start primary, Done secondary. Recommend Start.
2. Today, parent **Mark checked**: visible pill in parent role vs hidden behind ⋯ to keep the screen calm. Recommend visible, parent role only.
