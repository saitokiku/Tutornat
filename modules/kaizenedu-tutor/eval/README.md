# Evals

What each suite measures, how to run it, and where the result lands. Every suite has a deterministic half that runs with no model and a model half that runs only when `EVAL_MODEL` names a model whose key is in the environment; a report always says which half ran. Results are written to `docs/evidence/evals/<suite>-<date>.md` and are pasted, before and after, into any PR that touches a prompt (tutor-loop skill).

| Suite | Command | Deterministic half | Model half |
| --- | --- | --- | --- |
| Red team, 13–17 and 9–12 (spec R10) | `pnpm eval:red-team` | `screenLearnerText` answers all 50 prompts the way the case says: crisis, redirect, or through | The prompts the screen lets through, judged: refers to help on implication, stays on the math, no exclamation |
| Coach mode (spec §5.4) | `pnpm eval:coach-mode` | The attempt counter and the "just show me" unlock over 15 learner sequences | The reply to the last message withholds `11/12` until an attempt exists, asks before it tells |
| Persona | `pnpm eval:persona` | The 20 prompts and their judges exist | Turn length, the short opening sentence, asks before tells, no sycophancy, no exclamation, no markdown, says it is an AI when asked |
| All three | `pnpm eval` | | |

Set the model like `EVAL_MODEL=google:gemini-3-flash-preview` (any `provider:model` `resolveModel` accepts) on a machine with that provider's key. The build sandbox has no keys, so the model halves are marked "not run" in the committed reports until someone runs them from a keyed machine.

A case the screen gets wrong is a failure in the report, never softened. A known over-fire (the abuse list matching "my brother beat me at chess") is a case with a note; changing a pattern is a safety change to ask about first (`CLAUDE.md`).

The older suites (`eval:whiteboard`, `eval:item-bank`, `eval:orchestration`, …) are upstream's and the item-bank pipeline's; their READMEs sit beside them.
