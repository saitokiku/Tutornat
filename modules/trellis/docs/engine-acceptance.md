# Engine acceptance matrix — reference snapshot

Copied from the PM ENGINE-CONTRACT revision 1, September 12, 2026. Baseline results below are historical reported observations, not runs in this repository.

| ID | Property to establish | Required evidence / current baseline |
|---|---|---|
| E01 | Generated/null-ID checks cannot qualify | `generated_chain`, `generated_wrong_key`; baseline vulnerability; retain successful practice as positive control |
| E02 | Same-skill 48-hour server eligibility | 48h−1ms, exactly 48h, 48h+1ms with other criteria met; `delay_boundary` currently demonstrates 24h |
| E03 | Help persists across sessions and checks | `cross_session_help`, `same_session_help_reset`, `untagged_instruction`; baseline vulnerabilities; unrelated skill positive control |
| E04 | Practice contributes zero certification credit | `assisted_practice`, arbitrarily long assisted and clean-practice streaks; practice estimates and scheduling still work |
| E05 | One base result despite retries/concurrency | `duplicate_concurrent`, `partial_failure_retry`; preserve `duplicate_sequential` rejection; PostgreSQL barrier tests, conflicting answers and different attempts |
| E06 | Familiar items/families cannot fake independent contexts | `repeated_item`, `repeated_family`; approved unfamiliar/context-diverse positive controls |
| E07 | Trusted content and scorer provenance | Wrong/unreviewed key, altered version, missing approval, empty approved bank all abstain; independently reviewed fixture grades correctly; never treat review metadata as proof the key is mathematically correct |
| E08 | Assistance cannot race finalization | `help_during_grading`; PostgreSQL barriers before issue, submit and finalize; equal timestamps and provider latency |
| E09 | Restricted identities and household isolation | Actual PostgreSQL: learner/tutor/report denied qualifying writes and finalization; assessment role accepts authorized attempt; cross-household reads/writes denied, including views/inherited grants |
| E10 | Client clocks and ungradable responses cannot qualify | Preserve `client_clock`, `client_clock_route`, `ungraded_control`; actual route boundary plus valid independent positive case |
| E11 | Replay and corrections preserve honest claims | Rebuild test projection from retained evidence and exact rule version; identical contributing IDs; authorized key invalidation withdraws unsupported claim without editing evidence |
| E12 | Practice creates assessment access | Versioned 10-rep priority; offer at eligibility; restarts and offers/taken measured; 14-day escalation tested at boundary and beyond |
| E13 | Retention and context requirements are explicit | Two contexts and separate days; missing/early retention remains pending. Day-seven anchor/window, day timezone and context rubric need recorded definitions before full certification implementation |
| E14 | Import and homework errors stay recoverable | Synthetic ambiguous OCR/marks, corrections, duplicate import, missed due date; source and uncertainty visible; no mastery contribution |
| E15 | Teaching survives provider/UI failure | Synthetic timeout, interrupted audio/canvas, resume, duplicate/out-of-order events; correct exposure order and one learner action, no false qualification |
| E16 | Teaching quality is evaluated separately | Replay an elementary fractions example with concrete/number-line/symbolic variants, plus younger and older school-age cases; reviewed math and pedagogy, held-out learner actions, latency and measured cost when live providers are later qualified |

Full certification remains blocked until E01–E13 have independent evidence. E14–E16 qualify the wider engine experience. Simulated clocks do not demonstrate human retention. No current product test pass, independent sign-off, deployment or real-learner acceptance is claimed.


Build order: E1 practice/certification containment; E2 trusted assessment and exposure with PostgreSQL proof; E3 scheduling/replay; E4 one synthetic elementary teaching website. ADR-0059 changes the destination to this private repository. E1 therefore establishes an isolated source baseline before applying containment.
