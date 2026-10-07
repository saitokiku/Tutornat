# Redesign team and handoff

## Running build wave

Batch `deleg_ff8816dd` was dispatched as four independent background specialists. Live configuration was read after dispatch: default `anthropic/claude-fable-5-1`, reasoning `max`, four concurrent children. Approved fallbacks: `openai-codex/gpt-6-astra`, `anthropic/claude-opus-5`, `openai-codex/gpt-5.6-sol`. This is configured routing, not a guarantee that no worker will use a fallback; completion metadata must be checked. DeepSeek is excluded.

| Role | Worker | Owns | Checkpoint |
|---|---|---|---|
| Design system + parent workflows | `sa-0-8195b1cf` | Shell, Today, Schoolwork, app integration hooks, base CSS/fonts |30 calls or25 minutes |
| Learning experience | `sa-1-0c315297` | Learn + Activity modules, student work and parent feedback |30 calls or25 minutes |
| Schedule and decisions | `sa-2-f6da80a8` | Plan module, weekly schedule and proposals |30 calls or25 minutes |
| Original-dashboard reference | `sa-3-765fec24` | Isolated source-faithful reference + page/button map |12 calls or10 minutes |

Astra coordinator owns the brief, original/core preservation, integration, independent reruns and owner contact. Two fresh reviewers follow in order: behavior/spec first, then visual/accessibility/code quality after the specification gate. These are seven roles over multiple waves, not seven concurrent workers. Owner approves the design; no agent can do that for them.

## What each prompt contains

The dispatch contexts contain the owner's correction, precise role/output, scoped writable paths, actual reference source anchors, shared helper/module signatures, stable routes and record semantics, EN/ES and K–8 requirements, scope exclusions, test tools, checkpoint budget and structured handoff. The full durable reference is `TEAM_BRIEF.md`; dispatched contexts are role-specific, not byte-identical copies of the entire brief. Builders cannot edit sibling files or delegate again. A module harness lets them verify without waiting on the shell.

Prompts were informed by Anthropic's retrieved Fable5.1 guide: explicit scope, finish authorized reversible work, targeted edits, batch independent calls, reason about decisions rather than drafting the entire output twice, and verify actual images. Source: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-1 . This is prompting guidance, not measured evidence that this team is faster or better yet.

## Pending acceptance

Implementation and new screenshots have not been independently accepted. Old frontend remains intact and available for comparison. Existing unresolved defects are not closed by changing the visual design. Backend, deployment, production data, providers and payments remain outside scope. Results will re-enter the conversation automatically; do not poll child artifacts to wait for them.
