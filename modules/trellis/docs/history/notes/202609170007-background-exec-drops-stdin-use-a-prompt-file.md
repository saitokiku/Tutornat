<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: vault/10-notes/202609170007-background-exec-drops-stdin-use-a-prompt-file.md -->

---
id: 202609170007
title: A backgrounded runtime exec has no stdin — pass the brief as a file
tags: [handler, lesson, dispatch, codex]
sources:
  - "run/astra-tutor-name-screen.attempt1-failed.log"
  - "run/astra-tutor-name-screen.summary.json (attempt 1): stderr_tail 'No prompt provided via stdin.'"
project: handler
---
# A backgrounded runtime exec has no stdin

2026-09-17 00:00 CDT: an Astra research worker launched through
`runtime_control.py exec --background -- codex-run.py exec …` with the brief piped on stdin died
in **0.4 seconds**, zero events, rc 1. The log said exactly why and I had not read it for five
minutes: `No prompt provided via stdin.` `--background` detaches the child from the caller's
stdin, so the pipe is empty by the time Codex reads it.

`dispatch.sh` never hits this because its backgrounded process is *itself*, which then reads the
brief file and pipes it to a foreground child. `codex-run.py` already has `--prompt-file` for the
direct case. Relaunched that way: 19 events in the first 25 seconds.

Rule: **anything launched with `--background` gets its prompt from a file, never a pipe.** And a
worker with zero events after one minute is dead, not slow — check the `.stderr` file first.

Related: fleet-dispatch *(PM vault: `45-areas/fleet-dispatch`)* · lessons *(PM vault: `20-mocs/lessons`)*
