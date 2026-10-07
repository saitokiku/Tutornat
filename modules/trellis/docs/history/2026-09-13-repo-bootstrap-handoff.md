<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: shared/artifacts/kaizenedu-repo-setup-20260913/handoff.md -->

# Product repository ready — PM memory handoff

Observed: 2026-09-13T14:54:01.055886+00:00.
Authority: Manny's keyboard A, ADR-0059; current task is repository setup only.

## Delivered

- Private repository: https://github.com/gokumann-pm/kaizenedu; admin access verified by GitHub API.
- Main commit: `b30fa86104bb1a05ef5115a4c5ff63885533c458`. All 21 remote Git blob IDs match local HEAD;
  local working tree clean. No CI workflows and no deployment records observed.
- README, proprietary LICENSE adapted from Kaizen-AI's existing Kaizen Academy LLC
  notice, third-party notices, .gitignore, private dependency-free package metadata,
  architecture/requirements/acceptance notes and empty app/engine/database/test boundaries.
- Six exact source snapshots (two useful files and one license per old repository),
  with source commits and SHA-256 manifest; active runtime still empty.
- E1 issue: https://github.com/gokumann-pm/kaizenedu/issues/1. Issue body and local first-build plan agree.
- Source repositories unchanged locally and remotely: KaizenEdu
  `20a971b46c8c2bb7d19b9ccfdb8162637c1d1ffe`; Kaizen-AI
  `91af9e452c7df5867afa7249a6dc58b00003f531`. Nothing pushed to them.

## Ready for the PM's next dispatch

Clone: `/Users/mann/pm/shared/repos/gokumann-pm-kaizenedu`.
Distinct basename avoids collision with the legacy `KaizenEdu` cache on macOS and
matches the dispatcher's context-pack naming. Reuse this clone; workers get worktrees.

Command prepared, NOT run:
`scripts/dispatch.sh /Users/mann/pm/shared/repos/gokumann-pm-kaizenedu 1 --target codex --model gpt-6-astra`

- Pack: `/Users/mann/pm/shared/context/gokumann-pm-kaizenedu-1.md` (1,108 words).
- Builder: `/Users/mann/pm/shared/context/gokumann-pm-kaizenedu-1.brief.md`,
  implement-feature v9; codex/gpt-6-astra; 60 minutes from actual startup.
- Reviewer: `/Users/mann/pm/shared/context/gokumann-pm-kaizenedu-1.review.md`,
  review-pr v8; independent codex/gpt-6-astra after a reviewable PR exists.
- No builder or reviewer launched; no active deadline, product fix, test pass or build claimed.
  The bootstrap has no CI. Independent execution must carry verification of the first build.

## Drift and stale directions for the memory owner

1. ADR-0059 supersedes SPEC §4.7 / ENGINE-FIRST-PLAN §1 and the old staged E1 packet's
   destination (`saitokiku/KaizenEdu` worktree). Product writes now target the new private repo.
   The old staging files are preserved; use the issue-numbered replacement pack/briefs above.
2. New repo has no runnable engine. Criterion 0 now requires an auditable, minimal offline
   baseline extraction commit before E1 behavior changes. This concretizes the authorized
   grafting work; it does not add UI/backend build scope or relax E1's five existing criteria.
3. The KaizenEdu MOC's upstream-README description is stale: the actual pinned README
   opens with Natural Tutor. Both actual source READMEs were read. Public brand remains open.
4. ADR-0059 currently quotes the keyboard time as 09:2x CDT; this task specifies
   2026-09-13 09:42 CDT. Capture the supplied precise time without treating A as an
   answer to the unrelated reviewer question.
5. K7 remains unanswered in the local PM intake and vault replies checked this turn.
   All eight captured email introductions were inspected; no reviewer was assigned.
   Mail itself was not accessed. The queued card asks A) Me / B) Recruit and says offline
   engineering proceeds. Do not treat synthetic fixtures as approved assessment content.

## Communication and evidence

Exactly one email queued with say.sh, subject "Astra PM — product repo ready for first dispatch".
Queue path: `/Users/mann/pm/run/pm-runs/replies/say-20260913T145309Z-7439.md`.
The cron sender owns delivery; queue creation alone is not proof of Sent.

Evidence directory: `/Users/mann/pm/shared/artifacts/kaizenedu-repo-setup-20260913` — local/remote verification, reference checks, dispatch
metadata, reply check, exact issue/email bodies and say.sh output. Setup checks: 6 byte-exact
references, 16 initial local Markdown links, 10 ignore cases and credential-pattern scanning
of all 21 files; no matching credential pattern. No claim of full historical secret or license clearance.
STATE.md, CLAUDE.md and relevant source vault documents were not edited; selected
protected-file hashes unchanged. The PM session owns all memory and view updates.
