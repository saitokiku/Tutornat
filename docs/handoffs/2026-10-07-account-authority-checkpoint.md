# Account authority checkpoint — unfinished

The owner requested “stop and push to branch” during T03. Implementation stopped here. This is a work-in-progress checkpoint for continuation, not a merge-ready release. Do not merge it or treat its preview as a real-family launch.

Branch: `codex/account-authority`. Verified base: `02b84e3895bd87df87c76b2df18c1a53944ca8d6` on `codex/durable-learning-evidence` ([PR #4](https://github.com/saitokiku/Tutornat/pull/4)), stacked on [PR #3](https://github.com/saitokiku/Tutornat/pull/3). Both prior sections passed local verification, full production browser journeys, independent review, and GitHub verification. Main and the existing KaizenEdu deployment have not been changed.

Continue from [the approved release plan](../plans/2026-10-07-integrated-learning-release.md), task T03. T01 and T02 are complete. T04–T13 have not started. The author-only scratch ledger and raw logs remain under `.superpowers/sdd/2026-10-07-integrated-learning-release/` in the original isolated worktree; they are ignored by Git.

## Implemented so far

- Cookie-derived server principals resolve raw/opaque learner references only among owned profiles, reject self-asserted account/parent authority, and require a current password-confirmed consent receipt or explicit adult self authority.
- Password-confirmed adult self declarations are bound to an owned adult profile and server session for two hours; learner handover invalidates them. `/api/authority/self` exposes the server operation, but its product UI is not built.
- Tutor, course, practice, extraction, coach and voice token paths gate remote access before model factories or token minting. Sync uses a separate database-only account principal and checks selection ownership after pushing new profiles.
- Database-backed reservations and usage replace in-memory model budgets. Independent service instances competing for a final turn admit exactly one; expired holds cannot begin later work. Each provider call rechecks the captured authority.
- Text input/output gates cover generation and extraction. Tutor output is bounded and buffered before safety admission and release. This intentionally changes legacy streaming latency; committed low-latency delivery still belongs to T08.
- App voice grants are invalidated by revocation and handover. Client cancellation signals stop cooperating voice/chat owners; a server watchdog passes abort signals to active server model work and rechecks before output release.
- Migrations `0002`–`0004` are generated and exercised by fresh in-process Postgres tests. No external database migration has been applied.

## Evidence at the stop

Focused server, model output and authorization run: **5 files / 130 tests passed**. Separate client cancellation run: **3 files / 82 tests passed**, overlapping some of the focused tests. These are not a clean whole-branch result.

Integration run:

```sh
cd apps/web
npx vitest run src/lib/server src/app/api src/lib/ai/client.test.ts src/lib/voice/server.test.ts src/lib/sync.test.ts
```

Result: **4 files failed / 16 passed; 24 tests failed / 280 passed; one unhandled rejection**. Failure files:

- `src/lib/voice/server.test.ts`: legacy synchronous status usage and unauthenticated vendor fixtures conflict with the new async, account-authorized routes.
- `src/lib/server/db/consent.test.ts`: old assertions allow unnamed/parent/adult-grade identities and no-DB remote consent access. New authority deliberately refuses these; update fixtures and assertions without weakening the guards.
- `src/app/api/ai/course/route.test.ts`: cache/budget/privacy fixtures need real authorized accounts, async metering and reservations. Its old `spendDay()` creates the unhandled rejection.
- `src/lib/sync.test.ts`: one assertion expects a client-selected `parent` to grant tutor access.

`npm run verify` was run at the stop. Its exact result is appended below. No full production browser run or independent T03 review has occurred. T02 browser results do not establish T03 behavior.

## Work remaining in T03

1. Repair the integration fixtures and inspect typecheck/lint findings. Preserve actual authority, provider-zero-call, budget concurrency, cancellation and output admission regressions.
2. Finish adult self permission UI, EN/ES copy and client permission status. The existing grade-based browser consent view has not been updated. `CONSENT_ENFORCED` is still **false**; production database activation is not claimed.
3. Finish lifecycle wiring for all request owners and learner changes, including non-chat generation requests. Test voice minting while consent is revoked, actual capability polling and expired/foreign capability IDs. The token routes have app lease metadata, but device/provider behavior is not proven by mock tests.
4. Review provider/output admission: unknown tool/source behavior, uploaded instruction attempts, cached output, stream cancellation, body limits and watchdog cleanup. The current tutor buffer must not become a claim of low-latency native voice.
5. Extend database budget coverage for monthly/shared-address/cost boundaries and retention/deletion of the new records. The old in-memory/anonymous/date-reset tests were replaced, so check preserved product coverage carefully.
6. Run the exact T03 task command, `npm run verify`, appropriate production browsers, an independent security/logic review, and one tested fix pass. Only then mark the section ready and push the functional release commit.

## Voice lease limits

App revocation and vendor credential revocation are separate. [ElevenLabs](https://elevenlabs.io/docs/api-reference/tokens/create) documents a single-use credential valid for 15 minutes. [Deepgram](https://developers.deepgram.com/guides/fundamentals/token-based-authentication) documents a 30-second default token and explicitly says an opened WebSocket can outlive token expiry. The current direct adapters report `providerRevocation: unsupported` and `connectionMaxSeconds: null`; app/client cancellation cannot claim forced server termination. Prove a suitable adapter/proxy in T08/T10B/T13 before a launch requiring that guarantee.

## Deployment and constraints

Tutornat uses the separate protected Vercel project `tutornat-preview`, root `apps/web`, linked to `saitokiku/Tutornat`. Git pushes may create isolated previews. No live KaizenEdu domain switch is authorized by this checkpoint. See [preview operations](../tutornat-preview.md).

Keep Claude's other worktrees untouched, preserve the paper/ink/rose identity and mastery RULES, never import parked `modules/`, and keep all screens usable in demo mode. Live provider credentials, real database configuration, approved child-data methods, teacher/Spanish review and real device/pilot acceptance remain external gates, not completed features.

## Stop-time verification result

`npm run verify`: **failed**. Lint passed. Typecheck failed with seven errors: one `ReadableStream` async-iterator typing error in `src/lib/ai/tutor.ts:139`, plus six synchronous `voiceStatusResponse()` accesses in `src/lib/voice/server.test.ts`. The full test and build stages did not run because typecheck stopped the command. The earlier targeted integration run above remains red.

This checkpoint is pushed at the owner's explicit stop-and-push request, with these failures retained. It has not passed the repository's normal merge-ready commit gate.
