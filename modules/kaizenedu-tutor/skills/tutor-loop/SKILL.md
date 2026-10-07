---
name: tutor-loop
description: The tutor's session state machine, persona and prompt rules, checks and grading, diagnostic placement, student model v0, coach mode, WRAP summary, and the evals that guard them. Load it when you build or change anything in lib/tutor other than voice, presence, auth, or cost; when you write or edit a tutor prompt or safety rule; when you add a check item flow, the diagnostic, the parent report data, or an eval under eval/.
---

# Tutor loop

Spec sections: §5.1 persona, §5.2 loop, §5.4 coach mode, §5.5 memory, §5.6 safety, §5.7 student model, §5.9 parent report, §8.4 routing. Constants: `kaizen.config.ts` (`BANDS`, `STUDENT_MODEL`, `COST`). Engine facts: `openmaic-internals` skill and `docs/ARCHITECTURE-MAP.md` §2.1.

## Build on the pi runtime, not the LangGraph graph

Base the turn runner on `lib/chat/pi/director-loop.ts` and `lib/agent/runtime/*`: one HTTP request per learner utterance, provider-native tool calls, `cue_user` ends the turn and opens the mic, `close_session` ends the session. Delete the `call_agent` indirection: the tutor speaks directly. Keep `createDirectorCompactionRuntime` for long sessions and `sanitizeVisibleSpeech` for TTS-safe text. Set the per-tool timeout to about 10 s (`lib/agent/runtime/tool-timeout.ts` defaults to 10 minutes).

Every model call goes through `callLLM` / `streamLLM` with a `source` from `@/lib/tutor/cost/sources` and a stage from `LLM_STAGES` (add `tutor-live-turn`, `tutor-diagnose`, `tutor-grade`, `tutor-summary`, `tutor-model-update`, `tutor-problem-extract` to `lib/server/model-routes.ts:131`). The live turn runs on the fast model with thinking disabled; diagnose, grade, summary, and model update run on the stronger model with arithmetic self-check (spec §8.4).

## State machine (spec §5.2)

`GREET → INTAKE → DIAGNOSE → WORK ⇄ CHECK → WRAP`, in `lib/tutor/session/state-machine.ts`, pure and unit-tested. Phases carry: band, session timer (`BANDS[band].sessionMinutes`), the open skill and misconception context, the check clock (`STUDENT_MODEL.checkEveryMs`), and the coach-mode attempt counter. Transitions emit events for the presence layer (`listening`, `thinking`, `speaking`, `at-whiteboard`, `reacting`) and analytics (`session_start`, `turn`, `check_result`, `mastery_change`, `session_end`).

- **GREET** ≤ 5 s: mic live, text box visible; offer the open skill when one exists (`next-skill.ts`: lowest unmastered skill whose prerequisites are mastered).
- **INTAKE**: text, voice, or upload (R3); restate the goal in one sentence and confirm.
- **DIAGNOSE**: 2–4 items from the item bank against the skill graph; tag likely misconceptions; place the learner in ≤ 4 items.
- **WORK**: explain in ≤ 3 sentences → learner attempts → feedback; whiteboard when content is symbolic, spatial, or step-based; on "I don't get it" re-teach with a different approach (analogy, visual model, worked example, smaller step), never the same explanation twice; track which approach worked in the learner profile.
- **CHECK**: every ~10 min or at topic end, 1–2 graded items; results update the student model.
- **WRAP**: 30-second recap, what to practice, summary saved, model updated, parent report refreshed; default length per band with a soft "keep going?"; the session ends at its scheduled length regardless of attention (spec D15).

## Persona and prompt rules (spec §5.1)

Prompts live in `lib/tutor/prompts/*.md` and are loaded with `lib/prompts/loader.ts`. One tutor. Warm, direct, unhurried. ≤ 3 sentences per turn unless asked for a full explanation. Ask before telling. Never read slides aloud. Check arithmetic before stating it. No sycophancy: "great question" is banned, along with filler and exclamation points. Band register: shorter sentences, concrete examples, more frequent checks for 9–12. Always identifies as an AI tutor. Keep upstream's `speech-guidelines.md` (spoken text, no markdown) and the "Responding to the User's Turn" block verbatim. Run `node .claude/skills/tutor-loop/scripts/check-prompts.mjs` before committing a prompt; it rejects banned phrases and markdown in spoken sections.

Safety (spec §5.6): band-specific system prompt sections plus provider safety settings; no sexual or violent content, no romantic roleplay, no elicitation of personal information, off-topic redirected; self-harm or abuse disclosure → respond with care, provide crisis resources, stop tutoring, flag the session for the account holder and review. Changing any safety prompt requires asking Manny first (CLAUDE.md).

## Coach mode (spec §5.4)

For an uploaded or pasted graded-looking problem, withhold the final answer until the learner attempts at least one step. "Just show me" is allowed after one attempt: show a worked solution, then ask for a similar one. Encode this in the state machine (`attemptCount`), not only in the prompt, so the eval can assert it.

## Student model v0 (spec §5.7)

`lib/tutor/model/student-model.ts`, pure: per learner per skill, `estimate` = EMA of correctness with α = 0.3; status `not started` → `in progress` → `mastered` when estimate ≥ 0.8 with ≥ 4 items across ≥ 2 sessions; label it "estimate" in every UI string. Misconception tags attach to wrong answers through item distractors and to tutor observations; a tag resolves after 3 consecutive relevant items without it. Emit an `evidence_events` row per check, turn, and mastery change (append-only, insert-only grant; spec §8.5).

## Checks and grading (spec R4, tutor-09)

Items come from the reviewed bank (`pedagogy-fractions` skill). Choice and numeric items grade locally (tolerance, unit normalization); short answers grade on the stronger model with a strict schema (`{correct, score, rationale, misconception, arithmeticCheck}`) and return `ungraded` on parse failure, never partial credit by default (upstream's 50 % fallback is a bug for us). Every check result carries the item id, skill, distractor tag, and latency.

## Memory (spec §5.5)

Within a session: full context with compaction. Across sessions: the student model plus a compact learner profile (subjects, recurring misconceptions, pace, explanation styles that worked), regenerated at WRAP on the stronger model and injected at GREET. Logs and analytics carry ids only.

## Evals (build prompt "Tutor quality is code")

Under `eval/` in the upstream shape (`docs/TESTING.md`): `eval/persona` (20 prompts: turn length, asks-before-tells, no sycophancy), `eval/coach-mode` (15 cases), `eval/red-team` (30 prompts for 13+, a separate 9–12 set), `eval/whiteboard-usage` (20 fraction and algebra prompts, ≥ 80 % with actions matching the sentence), `eval/diagnostic-placement` (placement in ≤ 4 items). Deterministic judges first; sample with `EVAL_SAMPLES`. A PR that touches any prompt pastes before/after eval results.

## Definition of done for a loop change

State machine unit tests green; the relevant eval run pasted; `pnpm test:invariants` green; latency harness run if the turn path changed; no content in logs.
