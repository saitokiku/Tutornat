<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: vault/10-notes/202609170328-codex-refuses-red-team-phrasing-in-review-briefs.md -->

---
id: 202609170328
title: Codex refuses "attack the authority" — review briefs use verification vocabulary
tags: [handler, lesson, dispatch, review, codex]
sources:
  - "run/review-kaizenedu-3.attempt1-refused.summary.json"
project: handler
---
# Codex refuses red-team phrasing

2026-09-17 03:23–03:27 CDT: the blind review of PR #7 (E2-A, rebased) on codex/gpt-6-astra ran
45 events and stopped with **"This content was flagged for possible cybersecurity risk … join the
Trusted Access for Cyber program"**. No report was written. The prompt had said: *"attack it: try
to certify from practice, replay a finalized attempt with a different score, resubmit a conflicting
response, act as the wrong role, race finalization from two connections, forge `qualifying`."*

That is a correctness review of a synthetic test harness for a children's education product, on a
local fixture database. To OpenAI's classifier it read as a red-team brief. The same wording ran
on Fable for PR #9 (C) forty minutes earlier without comment; Fable's brief also carried "attack
the authority" and returned 342 isolation checks and 0 findings.

**The fix is vocabulary, not substance.** The relaunched prompt lists the same seven properties as
things to *verify hold* — "finalizing the same attempt twice returns the first stored result even
when the second call supplies a different score" instead of "replay with a different score";
"each function refuses callers outside its documented role" instead of "act as the wrong role" —
and states up front that this is contract-compliance testing of fixture data on a local
development database. It ran.

Rule for review briefs on Codex: describe the property to be verified and the input that should be
refused; never the verb "attack", "forge", "exploit", "bypass" or "impersonate". Same rigour, no
classifier. First occurrence; on a second, review-pr goes to v9 with this line in the template.

Related: [ADR-0062-fable-and-astra-mixed](../../decisions/ADR-0062-fable-and-astra-mixed.md) · fleet-dispatch *(PM vault: `45-areas/fleet-dispatch`)* · lessons *(PM vault: `20-mocs/lessons`)*
